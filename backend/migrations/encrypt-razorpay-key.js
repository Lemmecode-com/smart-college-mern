require("dotenv").config();
const mongoose = require("mongoose");
const CollegePaymentConfig = require("../src/models/collegePaymentConfig.model");
const { encryptRazorpayKey } = require("../src/utils/encryption.util");

const TARGET_COLLEGE_ID = "6a3bc09e7184f97db872f6ca";

async function migrate() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGO_URI or MONGODB_URI is not set in environment.");
    process.exit(1);
  }
  await mongoose.connect(mongoUri);

  const config = await CollegePaymentConfig.findOne({
    collegeId: TARGET_COLLEGE_ID,
    gatewayCode: "razorpay",
    isActive: true,
  });

  if (!config) {
    console.log("No active Razorpay config found for college", TARGET_COLLEGE_ID);
    await mongoose.disconnect();
    return;
  }

  const currentSecret = config.credentials.keySecret;

  if (!currentSecret) {
    console.log("keySecret is empty — nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  const encrypted = encryptRazorpayKey(currentSecret);
  config.credentials.keySecret = encrypted;
  await config.save();

  console.log("✅ keySecret re-encrypted for college", TARGET_COLLEGE_ID);
  console.log("Original length:", currentSecret.length, "Encrypted length:", encrypted.length);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
