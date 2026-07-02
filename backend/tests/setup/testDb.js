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
