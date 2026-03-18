const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const SALT_LENGTH = 32; // 32 bytes for salt
const KEY_LENGTH = 32; // 256 bits for AES-256
const ITERATIONS = 100000;
const DIGEST = "sha256";

/**
 * Validates the master encryption key
 * @param {string} masterKey - The master encryption key
 * @throws {Error} If key is invalid
 */
function validateMasterKey(masterKey) {
  if (!masterKey) {
    throw new Error(
      "Encryption master key is not configured. Please set ENCRYPTION_MASTER_KEY in your .env file.",
    );
  }

  if (typeof masterKey !== "string") {
    throw new Error("Encryption master key must be a string");
  }

  if (masterKey.length < 16) {
    throw new Error(
      `Encryption master key is too short (${masterKey.length} chars). ` +
        `Minimum 16 characters required. Recommended: 32+ characters.`,
    );
  }

  // Warn if key is weak (for development only)
  if (masterKey.length < 32 && process.env.NODE_ENV === "development") {
    console.warn(
      "⚠️  [Security Warning] Encryption master key is shorter than 32 characters. " +
        "For production, use a strong random key generated with:\n" +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
}

/**
 * Derives a 32-byte key from the master encryption key
 * Uses PBKDF2 with a fixed salt for deterministic key derivation
 * @param {string} masterKey - The master encryption key from environment
 * @returns {Buffer} - 32-byte derived key
 */
function deriveKey(masterKey) {
  validateMasterKey(masterKey);
  const fixedSalt = Buffer.from(
    "novaa-saas-payment-encryption-salt-2026",
    "utf8",
  ).slice(0, SALT_LENGTH);
  return crypto.pbkdf2Sync(
    masterKey,
    fixedSalt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST,
  );
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param {string} plainText - The plaintext to encrypt
 * @param {string} masterKey - The master encryption key from environment
 * @returns {string} - Base64 encoded encrypted data (IV + authTag + ciphertext)
 * @throws {Error} If encryption fails
 */
function encrypt(plainText, masterKey) {
  // Validate inputs
  if (!plainText) {
    throw new Error(
      "Cannot encrypt empty or null text. Ensure the value to encrypt is provided.",
    );
  }

  if (typeof plainText !== "string") {
    throw new Error("Cannot encrypt non-string data. Value must be a string.");
  }

  validateMasterKey(masterKey);

  try {
    const key = deriveKey(masterKey);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plainText, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + ciphertext
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, "base64"),
    ]);

    const result = combined.toString("base64");
    console.log("✅ Encryption successful");
    return result;
  } catch (error) {
    console.error("❌ Encryption error:", error.message);
    console.error("   - Algorithm:", ALGORITHM);
    console.error("   - Key length:", masterKey?.length || 0, "characters");
    console.error(
      "   - Plain text length:",
      plainText?.length || 0,
      "characters",
    );
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} masterKey - The master encryption key from environment
 * @returns {string} - Decrypted plaintext
 * @throws {Error} If decryption fails or data is tampered
 */
function decrypt(encryptedData, masterKey) {
  // Validate inputs
  if (!encryptedData) {
    throw new Error("Cannot decrypt empty or null data");
  }

  if (typeof encryptedData !== "string") {
    throw new Error("Cannot decrypt non-string data. Value must be a string.");
  }

  validateMasterKey(masterKey);

  try {
    const combined = Buffer.from(encryptedData, "base64");

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error(
        "Encrypted data is too short. Data may be corrupted or invalid.",
      );
    }

    // Extract IV, authTag, and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(masterKey);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const result = decrypted.toString("utf8");
    console.log("✅ Decryption successful");
    return result;
  } catch (error) {
    console.error("❌ Decryption error:", error.message);
    if (error.message.includes("authTag") || error.message.includes("state")) {
      throw new Error(
        "Decryption failed: Data may be corrupted, tampered, or encrypted with a different key.",
      );
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Gets the master encryption key from environment
 * @returns {string} Master encryption key
 * @throws {Error} If key is not configured
 */
function getMasterKey() {
  const masterKey =
    process.env.ENCRYPTION_MASTER_KEY || process.env.STRIPE_SECRET_KEY;

  if (!masterKey) {
    throw new Error(
      "No encryption key configured. Please set ENCRYPTION_MASTER_KEY in your .env file.\n" +
        "For development, you can use STRIPE_SECRET_KEY as fallback, but ENCRYPTION_MASTER_KEY is recommended.",
    );
  }

  return masterKey;
}

/**
 * Encrypts Stripe secret key
 * @param {string} stripeSecretKey - The Stripe secret key to encrypt
 * @returns {string} - Encrypted key
 */
function encryptStripeKey(stripeSecretKey) {
  const masterKey = getMasterKey();
  return encrypt(stripeSecretKey, masterKey);
}

/**
 * Decrypts Stripe secret key
 * @param {string} encryptedKey - The encrypted Stripe key
 * @returns {string} - Decrypted Stripe secret key
 */
function decryptStripeKey(encryptedKey) {
  const masterKey = getMasterKey();
  return decrypt(encryptedKey, masterKey);
}

/**
 * Encrypts webhook secret
 * @param {string} webhookSecret - The webhook secret to encrypt (should start with whsec_)
 * @returns {string} - Encrypted webhook secret
 */
function encryptWebhookSecret(webhookSecret) {
  if (!webhookSecret) {
    throw new Error("Webhook secret is required");
  }

  if (!webhookSecret.startsWith("whsec_")) {
    console.warn(
      "⚠️  Webhook secret doesn't start with 'whsec_'. Ensure this is a valid Stripe webhook secret.",
    );
  }

  const masterKey = getMasterKey();
  return encrypt(webhookSecret, masterKey);
}

/**
 * Decrypts webhook secret
 * @param {string} encryptedKey - The encrypted webhook secret
 * @returns {string} - Decrypted webhook secret
 */
function decryptWebhookSecret(encryptedKey) {
  const masterKey = getMasterKey();
  return decrypt(encryptedKey, masterKey);
}

/**
 * Encrypts Razorpay secret key
 * @param {string} razorpayKeySecret - The Razorpay key secret to encrypt
 * @returns {string} - Encrypted key
 */
function encryptRazorpayKey(razorpayKeySecret) {
  const masterKey = getMasterKey();
  return encrypt(razorpayKeySecret, masterKey);
}

/**
 * Decrypts Razorpay secret key
 * @param {string} encryptedKey - The encrypted Razorpay key
 * @returns {string} - Decrypted Razorpay key secret
 */
function decryptRazorpayKey(encryptedKey) {
  const masterKey = getMasterKey();
  return decrypt(encryptedKey, masterKey);
}

/**
 * Test encryption/decryption round-trip
 * @param {string} testValue - Value to test
 * @returns {boolean} True if test passes
 */
function testEncryptionRoundTrip(testValue = "test-encryption-value") {
  try {
    const masterKey = getMasterKey();
    const encrypted = encrypt(testValue, masterKey);
    const decrypted = decrypt(encrypted, masterKey);

    if (decrypted === testValue) {
      console.log("✅ Encryption round-trip test PASSED");
      return true;
    } else {
      console.error(
        "❌ Encryption round-trip test FAILED: Decrypted value doesn't match",
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Encryption round-trip test FAILED:", error.message);
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  encryptStripeKey,
  decryptStripeKey,
  encryptWebhookSecret,
  decryptWebhookSecret,
  encryptRazorpayKey,
  decryptRazorpayKey,
  getMasterKey,
  testEncryptionRoundTrip,
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
};
