require("dotenv").config();
const mongoose = require("mongoose");

const College = require("../models/college.model");
const DocumentConfig = require("../models/documentConfig.model");

async function normalizeCollegeCodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/smart-college");

    console.log("✅ Connected to MongoDB");

    // Normalize College codes using updateOne (bypasses full document validation)
    const colleges = await College.find({}).select("_id code").lean();
    let collegeUpdateCount = 0;

    for (const college of colleges) {
      if (!college.code) continue;
      const normalized = college.code.trim().toLowerCase();

      if (college.code !== normalized) {
        await College.updateOne({ _id: college._id }, { $set: { code: normalized } });
        collegeUpdateCount++;
        console.log(`  📝 College: "${college.code}" → "${normalized}"`);
      }
    }

    console.log(`✅ College normalization complete: ${collegeUpdateCount} updated`);

    // Normalize DocumentConfig collegeCodes using updateOne
    const configs = await DocumentConfig.find({}).select("_id collegeCode").lean();
    let configUpdateCount = 0;

    for (const config of configs) {
      if (!config.collegeCode) continue;
      const normalized = config.collegeCode.trim().toLowerCase();

      if (config.collegeCode !== normalized) {
        await DocumentConfig.updateOne({ _id: config._id }, { $set: { collegeCode: normalized } });
        configUpdateCount++;
        console.log(`  📝 DocumentConfig: "${config.collegeCode}" → "${normalized}"`);
      }
    }

    console.log(`✅ DocumentConfig normalization complete: ${configUpdateCount} updated`);
    console.log("🎉 Migration completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

normalizeCollegeCodes();