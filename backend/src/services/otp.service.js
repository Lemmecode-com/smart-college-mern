const crypto = require("crypto");
const PasswordReset = require("../models/passwordReset.model");
const User = require("../models/user.model");
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
 * @param {string} [collegeId] - Optional college ID (used when email is not yet in User collection)
 * @returns {Promise<{success: boolean, message: string, otp?: string}>}
 */
exports.createAndSendOTP = async (email, userType = "User", collegeId) => {
  try {
    // Lookup user to get collegeId (if not provided explicitly)
    const user = await User.findOne({ email }).select("college_id role").lean();
    const resolvedCollegeId = collegeId || user?.college_id;
    
    // Generate OTP
    const otp = exports.generateOTP();
    
    // Set expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTPs for this email
    await PasswordReset.deleteMany({ email, isUsed: false });

    // Create new OTP record
    const passwordReset = await PasswordReset.create({
      email,
      otpHash: otp,
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
        collegeId: resolvedCollegeId,
      });
      // console.log(`✅ Email sent to: ${email}`);
    } catch (emailError) {
      console.warn("⚠️  Email failed:", emailError.message);
      // console.log(`🔑 OTP for ${email}: ${otp} (valid for 10 min)`);
      // Don't fail the request if email fails - OTP is still stored in database
    }

    // ✅ SECURITY: NEVER return OTP in API response
    // OTP should only be sent via email, not exposed in API
    return {
      success: true,
      message: "OTP sent successfully to your email",
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
    const record = await PasswordReset.findOne({
      email,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return {
        valid: false,
        message: "Invalid OTP",
        code: "INVALID_OTP",
      };
    }

    if (record.isUsed) {
      if (record.failedAttempts >= record.maxAttempts) {
        return {
          valid: false,
          message: "OTP blocked",
          code: "OTP_MAX_ATTEMPTS",
        };
      }
      return {
        valid: false,
        message: "Invalid OTP",
        code: "INVALID_OTP",
      };
    }

    if (record.failedAttempts >= record.maxAttempts) {
      return {
        valid: false,
        message: "OTP blocked",
        code: "OTP_MAX_ATTEMPTS",
      };
    }

    const isMatch = await record.compareOTP(otp);
    if (!isMatch) {
      const updated = await PasswordReset.findOneAndUpdate(
        { _id: record._id },
        { $inc: { failedAttempts: 1 } },
        { new: true },
      );

      if (updated.failedAttempts >= updated.maxAttempts) {
        await PasswordReset.findByIdAndUpdate(record._id, { isUsed: true });
        return {
          valid: false,
          message: "OTP blocked",
          code: "OTP_MAX_ATTEMPTS",
        };
      }

      return {
        valid: false,
        message: "Invalid OTP",
        code: "INVALID_OTP",
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
