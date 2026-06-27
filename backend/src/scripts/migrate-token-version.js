/**
 * One-time migration: set tokenVersion=0 on all existing users
 * Run with: node backend/src/scripts/migrate-token-version.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const result = await User.updateMany(
    { tokenVersion: { $exists: false } },
    { $set: { tokenVersion: 0 } }
  );
  console.log(`Set tokenVersion=0 for ${result.modifiedCount} users`);

  await mongoose.disconnect();
  console.log('\nMigration complete');
}

migrate().catch(console.error);
