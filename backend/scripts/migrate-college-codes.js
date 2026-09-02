require("dotenv").config();
const mongoose = require("mongoose");
const College = require("../src/models/college.model");
const DocumentConfig = require("../src/models/documentConfig.model");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected\n");
  } catch (error) {
    console.error("DB error", error);
    process.exit(1);
  }
};

const migrateCollegeCodes = async () => {
  console.log("Starting migration: Uppercase College Codes\n");

  const colleges = await College.find({}).lean();
  console.log(`Found ${colleges.length} colleges`);

  let updatedColleges = 0;
  let skippedColleges = 0;

  for (const college of colleges) {
    if (college.code !== college.code.toUpperCase()) {
      await College.findByIdAndUpdate(college._id, { code: college.code.toUpperCase() });
      console.log(`  [College] ${college.code} -> ${college.code.toUpperCase()}`);
      updatedColleges++;
    } else {
      skippedColleges++;
    }
  }

  console.log(`\nCollege migration: Updated ${updatedColleges}, Skipped ${skippedColleges}`);

  const configs = await DocumentConfig.find({}).lean();
  console.log(`Found ${configs.length} document configs`);

  let updatedConfigs = 0;
  let skippedConfigs = 0;

  for (const config of configs) {
    if (config.collegeCode !== config.collegeCode.toUpperCase()) {
      await DocumentConfig.findByIdAndUpdate(config._id, { collegeCode: config.collegeCode.toUpperCase() });
      console.log(`  [DocConfig] ${config.collegeCode} -> ${config.collegeCode.toUpperCase()}`);
      updatedConfigs++;
    } else {
      skippedConfigs++;
    }
  }

  console.log(`\nDocumentConfig migration: Updated ${updatedConfigs}, Skipped ${skippedConfigs}`);
  console.log(`\nMigration complete.`);
  await mongoose.disconnect();
};

connectDB()
  .then(() => migrateCollegeCodes())
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });