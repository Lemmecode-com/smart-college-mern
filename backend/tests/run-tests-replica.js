/**
 * Replica-set test runner using mongodb-memory-server.
 * Starts a replica-set in-memory MongoDB, sets MONGO_URI, runs jest.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { spawn } = require('child_process');
const path = require('path');

async function initAndWaitForReplicaSet(uri, rsName = 'rs0', timeoutMs = 60000) {
  const port = parseInt(uri.match(/:(\d+)\//)[1]);
  // Use directConnection to bypass replica-set topology discovery
  // before replSetInitiate has been run
  const directUri = uri.replace(/\/$/, '') + '?directConnection=true';
  let client;
  const start = Date.now();
  let initiated = false;
  while (Date.now() - start < timeoutMs) {
    client = new MongoClient(directUri);
    try {
      await client.connect();
      const admin = client.db('admin');
      if (!initiated) {
        await admin.command({
          replSetInitiate: {
            _id: rsName,
            members: [{ _id: 0, host: '127.0.0.1:' + port }],
          },
        });
        initiated = true;
        console.log('✅ Replica set initiated');
      }
      const status = await admin.command({ hello: 1 });
      if (status.ok === 1 && (status.ismaster === true || status.isWritablePrimary === true)) {
        console.log('✅ Replica set is in PRIMARY state');
        await client.close();
        return;
      }
    } catch (e) {
      // not ready yet, will retry
    } finally {
      try { await client.close(); } catch (_) {}
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Replica set did not reach PRIMARY within timeout');
}

(async () => {
  console.log('Starting in-memory MongoDB (replica set mode)...');
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      replSet: 'rs0',
    },
  });
  const uri = mongoServer.getUri();
  console.log('In-memory MongoDB URI:', uri);

  await initAndWaitForReplicaSet(uri);

  const testPattern = process.argv[2] || 'tests/';

  const jestBin = path.join(__dirname, '..', 'node_modules', 'jest', 'bin', 'jest.js');
  const child = spawn('node', [
    jestBin,
    '--config', 'jest.config.js',
    '--runInBand',
    '--testTimeout=60000',
    testPattern,
  ], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, MONGO_URI: uri },
  });

  child.on('close', async (code) => {
    await mongoServer.stop();
    console.log('In-memory MongoDB stopped. Jest exit code:', code);
    process.exit(code);
  });
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
