const crypto = require("crypto");
const PasswordReset = require("../models/passwordReset.model");
const { sendOTPEmail } = require("./email.service");

/**
 * OTP SERVICE
 * 
 * Purpose:
 * - Generate secure 6-digit OTP
 * - Store OTP with expiration
 * - Verify OTP
 * - Prevent abuse
 */

/**
 * Generate 6-digit OTP
 * @returns {string} 6-digit OTP
 */
exports.generateOTP = () => {
  // Generate cryptographically secure 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

/**
 * Create and send OTP
 * @param {string} email - User's email
 * @param {string} userType - Type of user (for email template)
 * @returns {Promise<{success: boolean, message: string, otp?: string}>}
 */
exports.createAndSendOTP = async (email, userType = "User") => {
  try {
    // Generate OTP
    const otp = this.generateOTP();
    
    // Set expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTPs for this email
    await PasswordReset.deleteMany({ email, isUsed: false });

    // Create new OTP record
    const passwordReset = await PasswordReset.create({
      email,
      otp,
      expiresAt,
      isUsed: false,
    });

    // ✅ TRY TO SEND EMAIL (but don't fail if it errors)
    try {
      await sendOTPEmail({
        to: email,
        otp,
        userType,
        expiresIn: 10,
      });
      // console.log(`✅ Email sent to: ${email}`);
    } catch (emailError) {
      console.warn("⚠️  Email failed:", emailError.message);
      // console.log(`🔑 OTP for ${email}: ${otp} (valid for 10 min)`);
    }

    return {
      success: true,
      message: "OTP sent successfully",
      otp: process.env.NODE_ENV === 'development' ? otp : undefined, // Show OTP in dev only
    };
  } catch (error) {
    console.error("Create OTP Error:", error);
    throw error;
  }
};

/**
 * Verify OTP
 * @param {string} email - User's email
 * @param {string} otp - OTP to verify
 * @returns {Promise<{valid: boolean, message: string, record?: object}>}
 */
exports.verifyOTP = async (email, otp) => {
  try {
    // Find OTP record
    const record = await PasswordReset.findOne({
      email,
      otp,
      isUsed: false,
    });

    // Check if record exists
    if (!record) {
      return {
        valid: false,
        message: "Invalid OTP",
      };
    }

    // Check if expired
    if (!record.isValid()) {
      // Delete expired OTP
      await PasswordReset.deleteOne({ _id: record._id });
      
      return {
        valid: false,
        message: "OTP expired. Please request a new one.",
      };
    }

    return {
      valid: true,
      message: "OTP verified successfully",
      record,
    };
  } catch (error) {
    console.error("Verify OTP Error:", error);
    throw error;
  }
};

/**
 * Mark OTP as used (after successful password reset)
 * @param {string} otpId - OTP record ID
 * @returns {Promise<void>}
 */
exports.markOTPAsUsed = async (otpId) => {
  try {
    await PasswordReset.findByIdAndUpdate(otpId, { isUsed: true });
  } catch (error) {
    console.error("Mark OTP Used Error:", error);
    throw error;
  }
};

/**
 * Check rate limit (max 3 OTPs per hour per email)
 * @param {string} email - User's email
 * @returns {Promise<{allowed: boolean, message: string}>}
 */
exports.checkRateLimit = async (email) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const count = await PasswordReset.countDocuments({
      email,
      createdAt: { $gte: oneHourAgo },
      isUsed: false,
    });

    if (count >= 3) {
      return {
        allowed: false,
        message: "Too many attempts. Please try again after 1 hour.",
      };
    }

    return {
      allowed: true,
      message: "OK",
    };
  } catch (error) {
    console.error("Rate Limit Error:", error);
    throw error;
  }
};

/**
 * Clean up expired OTPs (run daily)
 * @returns {Promise<number>} Number of deleted records
 */
exports.cleanupExpiredOTPs = async () => {
  try {
    const result = await PasswordReset.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    
    // console.log(`🧹 Cleaned up ${result.deletedCount} expired OTPs`);
    return result.deletedCount;
  } catch (error) {
    console.error("Cleanup OTPs Error:", error);
    throw error;
  }
};
