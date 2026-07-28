const config = require("../services/storage/config");

function validateStorageConfig() {
  console.log("📦 Validating storage configuration...");

  const errors = [];
  const warnings = [];

  validateNodeEnv(warnings);

  const provider = config.STORAGE_PROVIDER;

  console.log(`   Provider: ${provider}`);

  if (provider !== "gridfs") {
    errors.push(`Unsupported storage provider: ${provider}. Only gridfs is supported.`);
  }

  validateGridFSStorage(errors, warnings);

  if (errors.length > 0) {
    console.error(
      `\n   ❌ Storage configuration validation failed with ${errors.length} error(s):`
    );
    errors.forEach((err, i) => {
      console.error(`      ${i + 1}. ${err}`);
    });
    console.error("\n💡 SOLUTION:");
    console.error(
      "   Fix the above configuration errors and restart the application."
    );
    console.error(
      "   See .env.example for required environment variables.\n"
    );
    process.exit(1);
  }

  if (warnings.length > 0) {
    warnings.forEach((warn) => {
      console.warn(`   ⚠️  WARNING: ${warn}`);
    });
  }

  console.log("   ✅ Storage configuration is valid");
  console.log(`   ✅ Active storage provider: ${provider}\n`);

  return true;
}

function validateNodeEnv(warnings) {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    warnings.push(
      "NODE_ENV is not set; defaulting to development"
    );
    return;
  }

  const validEnvs = ["development", "production", "test"];
  if (!validEnvs.includes(nodeEnv)) {
    warnings.push(
      `NODE_ENV="${nodeEnv}" is not a recognized environment. Expected: development, production, or test.`
    );
  }
}

function validateGridFSStorage(errors, warnings) {
  console.log("   Storage: MongoDB GridFS");
  console.log("   Bucket: fs");
  console.log("   GridFS collections: fs.files, fs.chunks");

  if (!process.env.MONGO_URI) {
    errors.push("MONGO_URI is required for GridFS storage");
  }
}

module.exports = validateStorageConfig;
