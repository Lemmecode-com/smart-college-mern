/**
 * PasswordReset Collection Migration
 * 
 * Purpose: Reset PasswordReset collection for fresh deployment
 * Strategy: Purge all existing records (OTPs expire in 10 min, no data to preserve)
 * Run: node scripts/migrate-password-reset.js
 */

const mongoose = require("mongoose");
const PasswordReset = require("../src/models/passwordReset.model");

async function migrate() {
  try {
    console.log("🗄️  PasswordReset Migration Started\n");

    // Connect to DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const collectionName = PasswordReset.collection.name;
    console.log(`📂 Collection: ${collectionName}`);

    // Count existing records
    const existingCount = await PasswordReset.countDocuments({});
    console.log(`📊 Existing records: ${existingCount}`);

    // Purge all records (conscious decision documented)
    if (existingCount > 0) {
      const result = await PasswordReset.deleteMany({});
      console.log(`🗑️  Purged ${result.deletedCount} records`);
    } else {
      console.log("✨ No records to purge");
    }

    // Verify indexes
    const indexes = await PasswordReset.collection.getIndexes();
    console.log(`📋 Indexes present: ${Object.keys(indexes).length}`);

    console.log("\n✅ Migration completed successfully");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

migrate();
