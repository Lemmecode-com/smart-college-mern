const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const AuthSession = require("../models/authSession.model");
const RefreshToken = require("../models/refreshToken.model");
const PasswordReset = require("../models/passwordReset.model");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const { createAndSendOTP, verifyOTP, checkRateLimit } = require("./otp.service");
const { sendEmailChangedNotification } = require("./email.service");
const securityAuditService = require("./securityAudit.service");

const ROLES_WITH_TEACHER_MODEL = ["TEACHER", "HOD"];

/**
 * Resolve the authenticated user's User doc and optional role-specific doc.
 * Uses server-side userId from req.user — never trusts client-supplied userId.
 */
const resolveUserContext = async (userId, role, collegeId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  if (role === "STUDENT") {
    const student = await Student.findOne({ user_id: userId, college_id: collegeId });
    return { user, roleSpecific: student, model: Student };
  }

  if (ROLES_WITH_TEACHER_MODEL.includes(role)) {
    const teacher = await Teacher.findOne({ user_id: userId, college_id: collegeId });
    return { user, roleSpecific: teacher, model: Teacher };
  }

  return { user, roleSpecific: null, model: null };
};

const invalidateUserSessions = async (userId) => {
  try {
    await RefreshToken.updateMany(
      { user_id: userId, isRevoked: false },
      { isRevoked: true }
    );
    await AuthSession.updateMany(
      { user_id: userId, isActive: true },
      { $set: { isActive: false, invalidationReason: "EMAIL_CHANGED" } }
    );
    logger.logInfo("Sessions invalidated on email change", { userId, reason: "EMAIL_CHANGED" });
  } catch (error) {
    logger.logError("Failed to invalidate sessions on email change", {
      error: error.message,
      userId,
    });
  }
};

/**
 * POST /api/auth/change-email/request
 * Step 1: Verify identity, check uniqueness, send OTP to new email.
 */
exports.requestEmailChange = async (req, res, next) => {
  try {
    const { email: newEmail, currentPassword } = req.body;
    const authUser = req.user; // from JWT — never trust client userId

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    const userContext = await resolveUserContext(authUser.id, authUser.role, authUser.college_id);
    if (!userContext || !userContext.user) {
      return res.status(404).json({ message: "User not found", code: "USER_NOT_FOUND" });
    }

    const currentEmail = userContext.user.email.toLowerCase().trim();

    if (normalizedNewEmail === currentEmail) {
      return res.status(400).json({
        message: "This is already your current email address",
        code: "SAME_EMAIL",
      });
    }

    // Identity verification — compare against User.password (source of truth)
    const isPasswordValid = await bcrypt.compare(currentPassword, userContext.user.password);
    if (!isPasswordValid) {
      await securityAuditService.logEvent({
        eventType: "EMAIL_CHANGE_FAILED",
        category: "AUTHENTICATION",
        severity: "HIGH",
        userId: authUser.id,
        userEmail: currentEmail,
        userRole: authUser.role,
        collegeId: authUser.college_id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/auth/change-email/request",
        method: "POST",
        statusCode: 401,
        metadata: { reason: "INVALID_CURRENT_PASSWORD" },
      });
      return res.status(401).json({
        message: "Current password is incorrect",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }

    // Email uniqueness check in User collection
    const existingUser = await User.findOne({
      email: normalizedNewEmail,
      _id: { $ne: userContext.user._id },
    });
    if (existingUser) {
      return res.status(409).json({
        message: "This email is already associated with another account",
        code: "EMAIL_EXISTS",
      });
    }

    // Email uniqueness check in role-specific collection (Student/Teacher)
    if (userContext.model) {
      const existingRoleDoc = await userContext.model.findOne({
        email: normalizedNewEmail,
        user_id: { $ne: userContext.user._id },
      });
      if (existingRoleDoc) {
        return res.status(409).json({
          message: "This email is already associated with another account",
          code: "EMAIL_EXISTS",
        });
      }
    }

    // Rate limit check (uses current email as the key)
    const rateLimit = await checkRateLimit(currentEmail);
    if (!rateLimit.allowed) {
      return res.status(429).json({ message: rateLimit.message, code: "RATE_LIMIT_EXCEEDED" });
    }

    // createAndSendOTP handles: delete old OTPs, create new hashed OTP, send email
    // We pass normalizedNewEmail so the OTP is tied to the new email address
    await createAndSendOTP(normalizedNewEmail, authUser.role, authUser.college_id?.toString());

    // Audit: email change requested
    await securityAuditService.logEvent({
      eventType: "EMAIL_CHANGE_REQUESTED",
      category: "AUTHENTICATION",
      severity: "MEDIUM",
      userId: authUser.id,
      userEmail: currentEmail,
      userRole: authUser.role,
      collegeId: authUser.college_id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      endpoint: "/api/auth/change-email/request",
      method: "POST",
      statusCode: 200,
      metadata: { newEmail: normalizedNewEmail },
    });

    return res.json({
      success: true,
      message: "Verification OTP has been sent to your new email address.",
      data: { newEmail: normalizedNewEmail, currentEmail },
    });
  } catch (error) {
    logger.logError("Request email change error", { error: error.message });
    next(error);
  }
};

/**
 * POST /api/auth/change-email/verify
 * Step 2: Verify OTP, atomically update email, invalidate sessions.
 */
exports.verifyEmailChange = async (req, res, next) => {
  try {
    const { email: newEmail, otp } = req.body;
    const authUser = req.user; // from JWT — never trust client userId

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    const userContext = await resolveUserContext(authUser.id, authUser.role, authUser.college_id);
    if (!userContext || !userContext.user) {
      return res.status(404).json({ message: "User not found", code: "USER_NOT_FOUND" });
    }

    const currentEmail = userContext.user.email;

    // Verify OTP using the centralized otp.service (handles expiry + attempt logic)
    const otpResult = await verifyOTP(normalizedNewEmail, otp);
    if (!otpResult.valid) {
      const isBlocked = otpResult.code === "OTP_MAX_ATTEMPTS";
      return res.status(400).json({
        message: isBlocked
          ? "OTP blocked due to too many failed attempts. Please request a new OTP."
          : "Invalid or expired OTP. Please request a new one.",
        code: isBlocked ? "OTP_MAX_ATTEMPTS" : "INVALID_OTP",
      });
    }

    // Re-check uniqueness before committing (race condition guard)
    const existingUser = await User.findOne({
      email: normalizedNewEmail,
      _id: { $ne: userContext.user._id },
    });
    if (existingUser) {
      return res.status(409).json({
        message: "This email is already associated with another account",
        code: "EMAIL_EXISTS",
      });
    }

    // Atomic update: User.email + role-specific email
    const session = await User.startSession();
    session.startTransaction();
    try {
      const claimed = await PasswordReset.findOneAndUpdate(
        { _id: otpResult.record._id, isUsed: false },
        { $set: { isUsed: true, usedAt: new Date() } },
        { session, new: true }
      );

      if (!claimed) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          code: "OTP_ALREADY_USED",
          message: "This OTP has already been used. Please request a new OTP.",
        });
      }

      userContext.user.email = normalizedNewEmail;
      await userContext.user.save({ session });

      if (userContext.roleSpecific && userContext.model) {
        userContext.roleSpecific.email = normalizedNewEmail;
        await userContext.roleSpecific.save({ session });
      }

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      const isTransactionConflict =
        err.code === 112 ||
        err.code === 251 ||
        /WriteConflict|transaction.*aborted|abort.*transaction/i.test(err.message || "");
      if (isTransactionConflict) {
        return res.status(400).json({
          success: false,
          code: "OTP_ALREADY_USED",
          message: "This OTP has already been used. Please request a new OTP.",
        });
      }
      throw err;
    }

    // Invalidate all existing sessions/tokens
    await invalidateUserSessions(userContext.user._id);

    // Security notification to OLD email
    sendEmailChangedNotification({
      to: currentEmail,
      userName: userContext.user.name,
      oldEmail: currentEmail,
      newEmail: normalizedNewEmail,
      collegeId: authUser.college_id,
    }).catch((err) =>
      logger.logError("Failed to send email changed notification", { error: err.message })
    );

    // Security audit
    await securityAuditService.logEvent({
      eventType: "EMAIL_CHANGED",
      category: "DATA_MODIFICATION",
      severity: "HIGH",
      userId: userContext.user._id,
      userEmail: normalizedNewEmail,
      userRole: authUser.role,
      collegeId: authUser.college_id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      endpoint: "/api/auth/change-email/verify",
      method: "POST",
      statusCode: 200,
      metadata: {
        previousEmail: currentEmail,
        newEmail: normalizedNewEmail,
        changeMethod: "SELF_SERVICE",
      },
    });

    logger.logInfo("Email changed successfully", {
      userId: userContext.user._id,
      role: authUser.role,
    });

    return res.json({
      success: true,
      message: "Email changed successfully. Please log in again with your new email.",
      data: { email: normalizedNewEmail },
    });
  } catch (error) {
    logger.logError("Verify email change error", { error: error.message });
    next(error);
  }
};
