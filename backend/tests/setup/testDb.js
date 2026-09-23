const mongoose = require('mongoose');

const connectTestDb = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not set. Please configure it in .env.test');
  }
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to test MongoDB: ' + MONGO_URI);
};

const clearTestDb = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('🛑 clearTestDb BLOCKED: NODE_ENV is "' + process.env.NODE_ENV + '" (expected "test") — refusing to clear database');
  }
  if (!mongoose.connection || mongoose.connection.readyState === 0) {
    throw new Error('🛑 clearTestDb BLOCKED: not connected to MongoDB');
  }
  const dbName = mongoose.connection.db.databaseName;
  if (dbName !== 'novaa-test') {
    throw new Error('🛑 clearTestDb BLOCKED: active database is "' + dbName + '" — must be "novaa-test"');
  }
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

const closeTestDb = async () => {
  await mongoose.disconnect();
  console.log('✅ Disconnected from test MongoDB');
};

module.exports = { connectTestDb, clearTestDb, closeTestDb };
