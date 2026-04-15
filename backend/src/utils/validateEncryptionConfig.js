/**
 * Validate Encryption Configuration on Startup
 * 
 * Ensures ENCRYPTION_MASTER_KEY is properly configured
 * Run this before starting the server
 */

require("dotenv").config();
const { getMasterKey, testEncryptionRoundTrip } = require("./encryption.util");

function validateEncryptionConfig() {
  console.log("🔐 Validating encryption configuration...");

  try {
    // Check if master key exists
    const masterKey = getMasterKey();
    
    console.log("   ✅ ENCRYPTION_MASTER_KEY is configured");
    console.log(`   - Key length: ${masterKey.length} characters`);
    
    if (masterKey.length < 16) {
      console.error("   ❌ ERROR: Encryption key is too short (minimum 16 characters)");
      console.error("   💡 Recommended: Use 32+ characters");
      console.error("   💡 Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
      process.exit(1);
    }

    if (masterKey.length < 32) {
      console.warn("   ⚠️  WARNING: Key is shorter than recommended 32 characters");
    }

    // Test encryption/decryption round-trip
    const testPassed = testEncryptionRoundTrip();
    
    if (!testPassed) {
      console.error("   ❌ ERROR: Encryption round-trip test failed");
      process.exit(1);
    }

    console.log("   ✅ Encryption round-trip test passed");
    console.log("   ✅ Encryption configuration is valid\n");
    
    return true;
  } catch (error) {
    console.error("   ❌ ERROR:", error.message);
    console.error("\n💡 SOLUTION:");
    console.error("   Add ENCRYPTION_MASTER_KEY to your .env file:");
    console.error("   ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars");
    console.error("\n   Generate a strong key with:");
    console.error("   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    console.error("");
    process.exit(1);
  }
}

module.exports = validateEncryptionConfig;
