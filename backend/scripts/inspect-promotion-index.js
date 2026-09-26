/**
 * READ-ONLY inspection script — does NOT modify any data or indexes.
 * Lists indexes on `promotionhistories` and reports the promotion_decision_id index definition.
 */
const env = process.argv[2] || 'prod';
const envFile = process.argv[3] || '.env';
require('dotenv').config({ path: envFile });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI;

function dbNameFromUri(uri) {
  const m = uri.match(/\/([^\/\?]+)(\?|$)/);
  return m ? m[1] : '(default)';
}

async function inspect(uri, label) {
  const dbName = dbNameFromUri(uri);
  console.log(`\n========== ${label} ==========`);
  console.log(`Database: ${dbName}`);

  let client;
  try {
    client = new MongoClient(uri, { ssl: true, maxPoolSize: 5, serverSelectionTimeoutMS: 15000 });
    await client.connect();
    console.log('Connected successfully (read-only inspection).');

    const db = client.db(dbName);
    const collection = db.collection('promotionhistories');

    const indexes = await collection.indexes();
    console.log(`\nAll indexes on "promotionhistories":`);
    for (const idx of indexes) {
      console.log(JSON.stringify({
        name: idx.name,
        key: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false,
        partialFilterExpression: idx.partialFilterExpression || null,
        v: idx.v,
      }, null, 2));
    }

    const target = indexes.find(
      (i) => JSON.stringify(i.key) === JSON.stringify({ promotion_decision_id: 1 })
    );

    console.log('\n--- INDEX VERDICT for promotion_decision_id ---');
    if (!target) {
      console.log('NO INDEX found on { promotion_decision_id: 1 }');
    } else {
      const hasPartial = target.partialFilterExpression !== undefined;
      const isSparse = Boolean(target.sparse);
      const isUnique = Boolean(target.unique);
      console.log(`unique: ${isUnique}`);
      console.log(`sparse: ${isSparse}`);
      console.log(`partialFilterExpression: ${hasPartial ? JSON.stringify(target.partialFilterExpression) : '(none)'}`);

      if (hasPartial && !isSparse && isUnique) {
        console.log('VERDICT: FIXED — partial unique index (null values excluded).');
      } else if (isSparse && isUnique && !hasPartial) {
        console.log('VERDICT: OLD/PROBLEMATIC — sparse unique index (still indexes null).');
      } else {
        console.log('VERDICT: UNEXPECTED index configuration.');
      }
    }

    const count = await collection.countDocuments();
    const nullCount = await collection.countDocuments({ promotion_decision_id: null });
    const nonNullCount = await collection.countDocuments({
      promotion_decision_id: { $exists: true, $ne: null },
    });
    console.log(`\nTotal documents: ${count}`);
    console.log(`Documents with promotion_decision_id = null: ${nullCount}`);
    console.log(`Documents with promotion_decision_id set (non-null): ${nonNullCount}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (client) await client.close();
    console.log('Disconnected.');
  }
}

inspect(uri, env === 'test' ? 'TEST DATABASE' : 'PRODUCTION DATABASE').catch((e) => {
  console.error(e);
  process.exit(1);
});
