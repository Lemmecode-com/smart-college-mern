/**
 * Test Script: Verify Encryption Configuration
 * 
 * Run: node backend/test-encryption-config.js
 */

require('dotenv').config();

console.log('='.repeat(60));
console.log('🔐 ENCRYPTION CONFIGURATION CHECK');
console.log('='.repeat(60));

// Check if ENCRYPTION_MASTER_KEY is set
const masterKey = process.env.ENCRYPTION_MASTER_KEY || process.env.STRIPE_SECRET_KEY;

console.log('\n📝 Checking environment variables...');
console.log('   - ENCRYPTION_MASTER_KEY set:', !!process.env.ENCRYPTION_MASTER_KEY);
console.log('   - STRIPE_SECRET_KEY set:', !!process.env.STRIPE_SECRET_KEY);
console.log('   - Fallback key available:', !!masterKey);

if (!masterKey) {
  console.log('\n❌ ERROR: No encryption key configured!');
  console.log('\n💡 SOLUTION:');
  console.log('   Add this to your backend/.env file:');
  console.log('   ENCRYPTION_MASTER_KEY=your-super-secret-encryption-key-min-16-chars');
  console.log('\n   Or generate a strong key with:');
  console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

console.log('   - Key length:', masterKey.length, 'characters');
console.log('   - Key preview:', masterKey.substring(0, 8) + '...' + masterKey.substring(masterKey.length - 4));

if (masterKey.length < 16) {
  console.log('\n❌ ERROR: Encryption key is too short!');
  console.log('   Minimum 16 characters required, recommended 32+ characters.');
  process.exit(1);
}

if (masterKey.length < 32) {
  console.log('\n⚠️  WARNING: Key is shorter than recommended 32 characters.');
}

// Test encryption
console.log('\n📝 Testing encryption...');
try {
  const crypto = require('crypto');
  
  const ALGORITHM = "aes-256-gcm";
  const IV_LENGTH = 16;
  const AUTH_TAG_LENGTH = 16;
  const ITERATIONS = 100000;
  const KEY_LENGTH = 32;
  const DIGEST = "sha256";
  
  // Derive key
  const fixedSalt = Buffer.from("novaa-saas-payment-encryption-salt-2026", "utf8").slice(0, 32);
  const key = crypto.pbkdf2Sync(masterKey, fixedSalt, ITERATIONS, KEY_LENGTH, DIGEST);
  
  console.log('   - Key derivation: ✅ Success');
  
  // Test encryption
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  const testText = "sk_test_123456";
  let encrypted = cipher.update(testText, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  
  console.log('   - Encryption: ✅ Success');
  
  // Test decryption
  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, "base64")]);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(Buffer.from(encrypted, "base64"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  if (decrypted.toString("utf8") === testText) {
    console.log('   - Decryption: ✅ Success');
    console.log('\n✅ ALL ENCRYPTION TESTS PASSED!');
  } else {
    console.log('   - Decryption: ❌ Failed - values don\'t match');
    console.log('\n❌ ENCRYPTION TEST FAILED!');
    process.exit(1);
  }
  
} catch (error) {
  console.log('   - Encryption test: ❌ Failed');
  console.error('   Error:', error.message);
  console.log('\n❌ ENCRYPTION TEST FAILED!');
  process.exit(1);
}

console.log('='.repeat(60));
