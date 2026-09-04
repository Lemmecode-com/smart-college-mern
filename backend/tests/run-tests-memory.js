/**
 * Temporary test runner that uses mongodb-memory-server.
 * Starts the memory server, sets MONGO_URI, runs jest, then cleans up.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const mongoose = require('mongoose');

(async () => {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  console.log('In-memory MongoDB URI:', uri);

  const testPattern = process.argv[2] || 'tests/exam';
  
  const path = require('path');
  const jestBin = path.join(__dirname, '..', 'node_modules', 'jest', 'bin', 'jest.js');
  const child = spawn('node', [jestBin, '--config', 'jest.config.js', '--runInBand', testPattern], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, MONGO_URI: uri },
  });

  child.on('close', async (code) => {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('In-memory MongoDB stopped. Exit code:', code);
    process.exit(code);
  });
})();
