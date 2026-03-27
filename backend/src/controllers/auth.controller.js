const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const User = require("../models/user.model");
const RefreshToken = require("../models/refreshToken.model");
const TokenBlacklist = require("../models/tokenBlacklist.model");
const PasswordReset = require("../models/passwordReset.model");
const AppError = require("../utils/AppError");
const {
  createAndSendOTP,
  verifyOTP,
  markOTPAsUsed,
  checkRateLimit,
} = require("../services/otp.service");
const securityAuditService = require("../services/securityAudit.service");

/**
 * COMMON LOGIN
 * Now generates both access token (short-lived) and refresh token (long-lived)
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ SUPER / COLLEGE ADMIN
    let user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // 🔒 SECURITY AUDIT: Log failed login
        securityAuditService
          .logLoginFailed(email, req, "INVALID_CREDENTIALS")
          .catch((err) => console.error("Audit log failed:", err));
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
      }
      // 🔒 SECURITY AUDIT: Log successful login
      securityAuditService
        .logLoginSuccess(user, req)
        .catch((err) => console.error("Audit log failed:", err));
      return sendTokens(res, user._id, user.role, user.college_id, req);
    }

    // 2️⃣ TEACHER
    let teacher = await Teacher.findOne({ email, status: "ACTIVE" });
    if (teacher) {
      const isMatch = await bcrypt.compare(password, teacher.password);
      if (!isMatch) {
        // 🔒 SECURITY AUDIT: Log failed login
        securityAuditService
          .logLoginFailed(email, req, "INVALID_CREDENTIALS")
          .catch((err) => console.error("Audit log failed:", err));
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
      }
      // 🔒 SECURITY AUDIT: Log successful login
      securityAuditService
        .logLoginSuccess(teacher, req)
        .catch((err) => console.error("Audit log failed:", err));
      return sendTokens(res, teacher._id, "TEACHER", teacher.college_id, req);
    }

    // 3️⃣ STUDENT - Check status first
    let student = await Student.findOne({ email });

    // 🔒 NEW: Check if account is pending or rejected
    if (student && student.status === "PENDING") {
      throw new AppError(
        "Your account is awaiting admin approval. Please check your email for approval confirmation.",
        403,
        "ACCOUNT_PENDING_APPROVAL",
      );
    }

    if (student && student.status === "REJECTED") {
      throw new AppError(
        `Your account has been rejected. Reason: ${student.rejectionReason || "Contact admin for details"}`,
        403,
        "ACCOUNT_REJECTED",
      );
    }

    // Only APPROVED students can login
    student = await Student.findOne({ email, status: "APPROVED" });
    if (student) {
      // ✅ Find the User record for password verification
      const user = await User.findOne({ email, role: "STUDENT" });

      if (user) {
        // Use User.password (hashed) for verification
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          // 🔒 SECURITY AUDIT: Log failed login
          securityAuditService
            .logLoginFailed(email, req, "INVALID_CREDENTIALS")
            .catch((err) => console.error("Audit log failed:", err));
          throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
        }
        // ✅ Ensure student has a linked User account
        if (!student.user_id) {
          throw new AppError(
            "Student account not linked. Please contact admin.",
            403,
            "USER_NOT_LINKED",
          );
        }
        // 🔒 SECURITY AUDIT: Log successful login
        securityAuditService
          .logLoginSuccess(student, req)
          .catch((err) => console.error("Audit log failed:", err));
        // Send student.user_id in token (consistent User._id for all students)
        return sendTokens(
          res,
          student.user_id,
          "STUDENT",
          student.college_id,
          req,
        );
      } else {
        // 🔒 SECURITY AUDIT: Log failed login
        securityAuditService
          .logLoginFailed(email, req, "INVALID_CREDENTIALS")
          .catch((err) => console.error("Audit log failed:", err));
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
      }
    }

    throw new AppError("User not found or not approved", 404, "USER_NOT_FOUND");
  } catch (error) {
    next(error);
  }
};

/**
 * LOGOUT - Clear tokens and revoke refresh token
 */
exports.logout = async (req, res, next) => {
  try {
    const accessToken = req.cookies.token;
    const refreshToken = req.cookies.refreshToken;

    // Get user email for audit logging (req.user doesn't have email)
    let userEmail = req.user.email || "unknown@user";
    if (!userEmail || userEmail === "unknown@user") {
      // Try to get email from User collection
      const User = require("../models/user.model");
      const user = await User.findById(req.user.id).select("email").lean();
      if (user) {
        userEmail = user.email;
      }
    }

    // 🔒 SECURITY: Blacklist access token (immediate invalidation)
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.exp) {
          await TokenBlacklist.create({
            token: accessToken,
            tokenType: "access",
            user_id: req.user.id,
            expiresAt: new Date(decoded.exp * 1000),
            reason: "LOGOUT",
          });
        }
      } catch (error) {
        console.error("Error blacklisting access token:", error.message);
      }
    }

    // Calculate session duration (approximate)
    const sessionDuration = "Session ended";

    // 🔒 SECURITY AUDIT: Log logout with user email
    const logoutUserData = {
      id: req.user.id,
      email: userEmail,
      role: req.user.role,
      college_id: req.user.college_id,
    };
    await securityAuditService.logLogout(logoutUserData, req, sessionDuration);

    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Revoke refresh token if exists
    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isRevoked: true },
      );
    }

    res.json({
      success: true,
      message: "Logout successful. All tokens invalidated.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * REFRESH ACCESS TOKEN
 * Generate new access token using valid refresh token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError("Refresh token missing", 401, "REFRESH_TOKEN_MISSING");
    }

    // Find and verify refresh token
    const tokenRecord = await RefreshToken.findOne({
      token: refreshToken,
      isRevoked: false,
    });

    if (!tokenRecord) {
      throw new AppError(
        "Invalid or revoked refresh token",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }

    // Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      await RefreshToken.deleteOne({ _id: tokenRecord._id });
      throw new AppError("Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: tokenRecord.user_id,
        role: req.user.role,
        college_id: req.user.college_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: getAccessTokenExpiry() },
    );

    // Set new access token cookie
    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: getAccessTokenExpiryMs(),
      sameSite: "strict",
    });

    res.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * REQUEST PASSWORD RESET OTP
 */
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "MISSING_EMAIL");
    }

    // ✅ FIND USER FIRST (Email must exist)
    let user = await User.findOne({ email });
    let userType = "User";

    if (!user) {
      user = await Student.findOne({ email });
      userType = "Student";
    }

    if (!user) {
      user = await Teacher.findOne({ email });
      userType = "Teacher";
    }

    // ❌ Email doesn't exist in database
    if (!user) {
      throw new AppError("Email not found in database", 404, "EMAIL_NOT_FOUND");
    }

    // ✅ CHECK RATE LIMIT (Prevent duplicate requests)
    const rateLimit = await checkRateLimit(email);
    if (!rateLimit.allowed) {
      throw new AppError(rateLimit.message, 429, "RATE_LIMIT_EXCEEDED");
    }

    // ✅ Check if there's already an active OTP for this email
    const existingOTP = await PasswordReset.findOne({
      email,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingOTP) {
      const minutesLeft = Math.floor(
        (existingOTP.expiresAt - new Date()) / 60000,
      );
      return res.json({
        success: true,
        message: `OTP already sent! Please check your email. Valid for ${minutesLeft} more minutes.`,
        otpAlreadySent: true,
      });
    }

    // ✅ Create and send OTP
    await createAndSendOTP(email, userType);

    res.json({
      success: true,
      message: "OTP sent successfully to your email.",
    });
  } catch (error) {
    console.error("❌ Password Reset Error:", error.message);
    next(error);
  }
};

/**
 * VERIFY OTP AND RESET PASSWORD
 */
exports.verifyOTPAndResetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new AppError(
        "Email, OTP, and new password are required",
        400,
        "MISSING_FIELDS",
      );
    }

    // Verify OTP
    const result = await verifyOTP(email, otp);

    if (!result.valid) {
      throw new AppError(result.message, 400, "INVALID_OTP");
    }

    // Find user and update password
    let user = await User.findOne({ email });

    if (!user) {
      user = await Student.findOne({ email });
    }

    if (!user) {
      user = await Teacher.findOne({ email });
    }

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    // 🔒 SECURITY: Blacklist ALL tokens for this user (force re-login)
    await TokenBlacklist.create({
      token: "*", // Wildcard - invalidates all tokens
      tokenType: "access",
      user_id: user._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      reason: "PASSWORD_CHANGE",
    });

    // Also revoke all refresh tokens
    await RefreshToken.updateMany({ user_id: user._id }, { isRevoked: true });

    // Mark OTP as used
    await markOTPAsUsed(result.record._id);

    res.json({
      success: true,
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * JWT GENERATOR - Access Token Only (Short-lived: 15 minutes)
 */
const sendTokens = async (res, id, role, college_id, req) => {
  // 🔒 SECURITY: Short-lived access token (15 minutes)
  const accessExpiry = process.env.JWT_ACCESS_EXPIRY;

  // 🔒 SECURITY: Long-lived refresh token (7 days)
  const refreshExpiry = process.env.JWT_REFRESH_EXPIRY;

  // Generate access token
  const accessToken = jwt.sign(
    { id, role, college_id },
    process.env.JWT_SECRET,
    { expiresIn: accessExpiry },
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    { id, role, college_id },
    process.env.JWT_SECRET + "_REFRESH", // Different secret for refresh tokens
    { expiresIn: refreshExpiry },
  );

  // Hash refresh token before storing
  const hashedRefreshToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  // Store refresh token in database
  await RefreshToken.create({
    user_id: id,
    token: hashedRefreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    userAgent: req?.headers?.["user-agent"],
    ipAddress: req?.ip,
  });

  // Set httpOnly cookies
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: parseExpiryToMilliseconds(accessExpiry),
    sameSite: "strict",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: parseExpiryToMilliseconds(refreshExpiry),
    sameSite: "strict",
  });

  // Send user info in the response (not the tokens)
  // Using standardized format with data wrapper
  res.json({
    success: true,
    message: "Login successful",
    data: {
      accessToken,
      user: { id, role, college_id },
    },
  });
};

/**
 * Parse JWT expiry string to milliseconds
 * @param {string} expiry - Expiry string (e.g., "1d", "2h", "30m")
 * @returns {number} Milliseconds
 */
const parseExpiryToMilliseconds = (expiry) => {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 24 * 60 * 60 * 1000; // Default 1 day

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
};

/**
 * Get access token expiry string
 */
const getAccessTokenExpiry = () => process.env.JWT_ACCESS_EXPIRY || "15m";

/**
 * Get access token expiry in milliseconds
 */
const getAccessTokenExpiryMs = () =>
  parseExpiryToMilliseconds(getAccessTokenExpiry());
