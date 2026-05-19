const nodemailer = require("nodemailer");
const CollegeEmailConfig = require("../models/collegeEmailConfig.model");
const { encrypt, decrypt, getMasterKey } = require("../utils/encryption.util");
const logger = require("../utils/logger");

// Cache for transporters (using Map)
const transporterCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_PREFIX = "email_transporter_";

function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of transporterCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      transporterCache.delete(key);
    }
  }
}
setInterval(clearExpiredCache, 10 * 60 * 1000);

function encryptEmailPassword(password) {
  const masterKey = getMasterKey();
  return encrypt(password, masterKey);
}

function decryptEmailPassword(encryptedPassword) {
  const masterKey = getMasterKey();
  return decrypt(encryptedPassword, masterKey);
}

function createCollegeTransporter(config) {
  const decryptedPass = decryptEmailPassword(config.credentials.pass);
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.credentials.user, pass: decryptedPass },
    tls: { rejectUnauthorized: false },
  });
}

async function getCollegeTransporter(collegeId) {
  const cacheKey = CACHE_PREFIX + collegeId.toString();
  const cached = transporterCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.logInfo("Using cached college transporter", { collegeId });
    return cached;
  }
  const config = await CollegeEmailConfig.getActiveConfig(collegeId);
  let transporter, fromName, fromEmail, isCollegeConfig = false;
  if (config && config.isActive) {
    try {
      transporter = createCollegeTransporter(config);
      fromName = config.fromName;
      fromEmail = config.fromEmail;
      isCollegeConfig = true;
      logger.logInfo("Created college-specific transporter", { collegeId, fromEmail });
    } catch (error) {
      logger.logError("Failed to create college transporter", { collegeId, error: error.message });
    }
  }
  if (!transporter) {
    logger.logError("No email configuration found for college", { collegeId, error: "No config or config inactive" });
    throw new Error("No email configuration found for this college. Please configure SMTP settings in System Settings.");
  }
  
  const cacheData = { transporter, fromName, fromEmail, isCollegeConfig, collegeId: collegeId.toString(), timestamp: Date.now() };
  transporterCache.set(cacheKey, cacheData);
  return cacheData;
}

function clearTransporterCache(collegeId) {
  const cacheKey = CACHE_PREFIX + collegeId.toString();
  transporterCache.delete(cacheKey);
  logger.logInfo("Cleared email transporter cache", { collegeId });
}

function clearAllTransporterCaches() {
  transporterCache.clear();
  logger.logInfo("Cleared all email transporter caches");
}

async function verifyCollegeEmailConfig(configData) {
  const { smtp, credentials, fromName, fromEmail, testEmail } = configData;
  if (!smtp?.host || !smtp?.port || !credentials?.user || !credentials?.pass) {
    return { success: false, message: "Missing required SMTP configuration fields" };
  }
  if (!fromName || !fromEmail) {
    return { success: false, message: "Missing from name or email" };
  }
  try {
    const testTransporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: credentials.user, pass: credentials.pass },
      tls: { rejectUnauthorized: false },
    });
    await new Promise((resolve, reject) => {
      testTransporter.verify((error, success) => {
        if (error) reject(error);
        else resolve(success);
      });
    });
    if (testEmail) {
      const testResult = await testTransporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: testEmail,
        subject: "Test Email - Smart College Email Configuration",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:#28a745;">Test Email</h2><p>If you received this email, your configuration is working correctly.</p></div>`,
      });
      logger.logInfo("Test email sent successfully", { messageId: testResult.messageId, testEmail });
    }
    return { success: true, message: testEmail ? "Configuration verified and test email sent successfully" : "SMTP connection verified successfully" };
  } catch (error) {
    logger.logError("Email configuration verification failed", { error: error.message, smtpHost: smtp.host });
    return { success: false, message: `Verification failed: ${error.message}`, error: error.message };
  }
}

async function getCollegeEmailConfig(collegeId) {
  const config = await CollegeEmailConfig.getActiveConfig(collegeId);
  if (!config) return null;
  return {
    _id: config._id,
    collegeId: config.collegeId,
    smtp: config.smtp,
    fromName: config.fromName,
    fromEmail: config.fromEmail,
    isActive: config.isActive,
    lastVerifiedAt: config.lastVerifiedAt,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    hasPassword: !!config.credentials?.pass,
  };
}

async function saveCollegeEmailConfig(collegeId, configData) {
  const { smtp, credentials, fromName, fromEmail } = configData;
  const encryptedPass = encryptEmailPassword(credentials.pass);
  const existingConfig = await CollegeEmailConfig.findOne({ collegeId, isActive: true });
  let savedConfig;
  if (existingConfig) {
    existingConfig.smtp = smtp;
    existingConfig.credentials = { user: credentials.user, pass: encryptedPass };
    existingConfig.fromName = fromName;
    existingConfig.fromEmail = fromEmail;
    existingConfig.lastVerifiedAt = null;
    await existingConfig.save();
    savedConfig = existingConfig;
  } else {
    savedConfig = await CollegeEmailConfig.create({
      collegeId,
      smtp,
      credentials: { user: credentials.user, pass: encryptedPass },
      fromName,
      fromEmail,
      isActive: true,
    });
  }
  clearTransporterCache(collegeId);
  logger.logInfo("College email configuration saved", { collegeId, fromEmail });
  return {
    _id: savedConfig._id,
    collegeId: savedConfig.collegeId,
    smtp: savedConfig.smtp,
    fromName: savedConfig.fromName,
    fromEmail: savedConfig.fromEmail,
    isActive: savedConfig.isActive,
    hasPassword: true,
  };
}

async function deleteCollegeEmailConfig(collegeId) {
  const config = await CollegeEmailConfig.findOneAndDelete({ collegeId, isActive: true });
  if (config) {
    clearTransporterCache(collegeId);
    logger.logInfo("College email configuration deleted", { collegeId });
  }
  return config;
}

async function markConfigVerified(collegeId, userId) {
  await CollegeEmailConfig.findOneAndUpdate(
    { collegeId, isActive: true },
    { lastVerifiedAt: new Date(), verifiedBy: userId }
  );
  logger.logInfo("College email config marked as verified", { collegeId });
}

module.exports = {
  getCollegeTransporter,
  clearTransporterCache,
  clearAllTransporterCaches,
  verifyCollegeEmailConfig,
  getCollegeEmailConfig,
  saveCollegeEmailConfig,
  deleteCollegeEmailConfig,
  markConfigVerified,
};
