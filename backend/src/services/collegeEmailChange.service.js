const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const College = require("../models/college.model");
const User = require("../models/user.model");
const PasswordReset = require("../models/passwordReset.model");
const SecurityAudit = require("../models/securityAudit.model");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const { generateOTP, verifyOTP, checkRateLimit } = require("./otp.service");
const {
  sendCollegeEmailOTP,
  sendCollegeEmailChangedNotification,
  sendCollegeEmailChangeConfirmation,
} = require("./email.service");
const securityAuditService = require("./securityAudit.service");
const { validateEmail } = require("../utils/validators");

/**
 * COLLEGE OFFICIAL EMAIL CHANGE SERVICE
 *
 * Handles the secure flow for changing a College's official institutional
 * email (College.email).  Deliberately separate from the centralized
 * User.email change flow (emailChange.service.js) because:
 *
 *   - College.email  = institution's official communication address
 *   - User.email      = College Admin login identity — MUST NOT change
 *
 * Security guarantees:
 *   - Current password verification (server-side)
 *   - OTP sent to the NEW email, verified before any write
 *   - OTP brute-force protection (maxAttempts / failedAttempts)
 *   - Atomic OTP claim via MongoDB transaction (Step 5B pattern)
 *   - Transaction wrapping College.email update + audit log
 *   - Notifications to old + new email ONLY after successful commit
 */

const OTP_EXPIRY_MINUTES = 10;

/**
 * POST /api/college/change-email/request
 * Step 1 — Verify current password, check uniqueness, send OTP to new email.
 *
 * The target college is ALWAYS derived from req.college_id (set by
 * collegeMiddleware).  Client-supplied collegeId is never trusted.
 */
exports.requestCollegeEmailChange = async (req, res, next) => {
  try {
    const { email: newEmail, currentPassword } = req.body;
    const authUser = req.user; // from JWT — never trust client
    const collegeId = req.college_id;

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    // --- Validate email format ---
    if (!normalizedNewEmail || !validateEmail(normalizedNewEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Invalid email format",
      });
    }

    // --- Fetch the college (target is server-derived, NOT from client) ---
    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({
        success: false,
        code: "COLLEGE_NOT_FOUND",
        message: "College not found",
      });
    }

    const currentCollegeEmail = college.email.toLowerCase().trim();

    // --- Reject same email ---
    if (normalizedNewEmail === currentCollegeEmail) {
      return res.status(400).json({
        success: false,
        code: "COLLEGE_SAME_EMAIL",
        message: "This is already your current official email address",
      });
    }

    // --- Verify current password via the admin's User record ---
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        code: "MISSING_CURRENT_PASSWORD",
        message: "Current password is required",
      });
    }

    const adminUser = await User.findById(authUser.id);
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isPasswordValid) {
      await securityAuditService.logEvent({
        eventType: "COLLEGE_EMAIL_CHANGE_FAILED",
        category: "AUTHENTICATION",
        severity: "HIGH",
        userId: authUser.id,
        userEmail: adminUser.email,
        userRole: authUser.role,
        collegeId: collegeId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/college/change-email/request",
        method: "POST",
        statusCode: 401,
        metadata: { reason: "INVALID_CURRENT_PASSWORD" },
      });

      return res.status(401).json({
        success: false,
        code: "INVALID_CURRENT_PASSWORD",
        message: "Current password is incorrect",
      });
    }

    // --- Check email uniqueness across College collection ---
    const existingCollege = await College.findOne({
      email: normalizedNewEmail,
      _id: { $ne: collegeId },
    });
    if (existingCollege) {
      return res.status(400).json({
        success: false,
        code: "EMAIL_ALREADY_IN_USE",
        message: "This email is already in use by another institution",
      });
    }

    // --- Rate limit check (max 3 OTPs/hour/new-email) ---
    const rateLimit = await checkRateLimit(normalizedNewEmail);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: rateLimit.message,
      });
    }

    // --- Generate and persist OTP (bcrypt-hashed via PasswordReset pre-save) ---
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Delete any existing unused OTPs for this new email address
    await PasswordReset.deleteMany({ email: normalizedNewEmail, isUsed: false });

    await PasswordReset.create({
      email: normalizedNewEmail,
      otpHash: otp,
      expiresAt,
      isUsed: false,
    });

    // --- Send OTP to the NEW college email ---
    // Email delivery failure is non-fatal: OTP is persisted in DB so tests
    // and support can retrieve it. Mirrors existing createAndSendOTP pattern.
    try {
      await sendCollegeEmailOTP({
        to: normalizedNewEmail,
        otp,
        collegeName: college.name,
        expiresIn: OTP_EXPIRY_MINUTES,
        collegeId: collegeId.toString(),
      });
    } catch (emailError) {
      logger.logWarning("College email OTP delivery failed", {
        newEmail: normalizedNewEmail,
        collegeId: collegeId.toString(),
        error: emailError.message,
      });
    }

    // --- Security audit: request logged ---
    await securityAuditService.logEvent({
      eventType: "COLLEGE_EMAIL_CHANGE_REQUESTED",
      category: "AUTHENTICATION",
      severity: "MEDIUM",
      userId: authUser.id,
      userEmail: adminUser.email,
      userRole: authUser.role,
      collegeId: collegeId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      endpoint: "/api/college/change-email/request",
      method: "POST",
      statusCode: 200,
      metadata: {
        newEmail: normalizedNewEmail,
        currentEmail: adminUser.email,
        currentCollegeEmail: currentCollegeEmail,
      },
    });

    return res.json({
      success: true,
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    logger.logError("Request college email change error", { error: error.message });
    next(error);
  }
};

/**
 * POST /api/college/change-email/verify
 * Step 2 — Verify OTP, atomically claim it, transactionally update
 * College.email, create audit, and send notifications (after commit).
 *
 * The target college is ALWAYS derived from req.college_id.
 * The email field in the body is used ONLY to locate the OTP record.
 */
exports.verifyCollegeEmailChange = async (req, res, next) => {
  let session;

  try {
    const { email: newEmail, otp } = req.body;
    const authUser = req.user;
    const collegeId = req.college_id;

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    // --- Verify OTP (handles expiry, failedAttempts, maxAttempts) ---
    const otpResult = await verifyOTP(normalizedNewEmail, otp);
    if (!otpResult.valid) {
      const isBlocked = otpResult.code === "OTP_MAX_ATTEMPTS";

      try {
        const adminUser = await User.findById(authUser.id).select("email").lean();
        await securityAuditService.logEvent({
          eventType: "COLLEGE_EMAIL_CHANGE_FAILED",
          category: "AUTHENTICATION",
          severity: "HIGH",
          userId: authUser.id,
          userEmail: adminUser?.email || null,
          userRole: authUser.role,
          collegeId: collegeId,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          endpoint: "/api/college/change-email/verify",
          method: "POST",
          statusCode: 400,
          metadata: { reason: otpResult.code },
        });
      } catch (auditErr) {
        logger.logWarning("Failed to log college email change failure audit", {
          error: auditErr.message,
        });
      }

      return res.status(400).json({
        success: false,
        code: isBlocked ? "OTP_MAX_ATTEMPTS" : "INVALID_OTP",
        message: isBlocked
          ? "OTP blocked due to too many failed attempts. Please request a new OTP."
          : "Invalid or expired OTP. Please request a new one.",
      });
    }

    // --- Fetch college + admin user BEFORE transaction (non-critical reads) ---
    const [college, adminUser] = await Promise.all([
      College.findById(collegeId),
      User.findById(authUser.id).select("email name").lean(),
    ]);

    if (!college) {
      return res.status(404).json({
        success: false,
        code: "COLLEGE_NOT_FOUND",
        message: "College not found",
      });
    }

    const oldEmail = college.email.toLowerCase().trim();

    // --- Start MongoDB transaction ---
    session = await College.startSession();
    session.startTransaction();

    try {
      // --- Atomically claim OTP (Step 5B pattern) ---
      // findOneAndUpdate with isUsed:false filter is atomic: only the first
      // request that hits the DB will get a non-null result. Concurrent
      // requests get null → OTP_ALREADY_USED.
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

      // --- Re-check College existence / tenant ownership (server-derived) ---
      const freshCollege = await College.findById(collegeId).session(session);
      if (!freshCollege) {
        throw new Error("COLLEGE_NOT_FOUND_IN_TXN");
      }

      // --- Re-check email uniqueness (race-condition guard within transaction) ---
      const existingCollege = await College.findOne({
        email: normalizedNewEmail,
        _id: { $ne: collegeId },
      }).session(session);

      if (existingCollege) {
        throw new AppError(
          "Email already in use by another institution",
          400,
          "EMAIL_ALREADY_IN_USE"
        );
      }

      // --- Update College.email ---
      freshCollege.email = normalizedNewEmail;
      await freshCollege.save({ session });

      // --- Create security audit (inside transaction) ---
      const auditRecord = new SecurityAudit({
        eventType: "COLLEGE_EMAIL_CHANGED",
        category: "DATA_MODIFICATION",
        severity: "HIGH",
        userId: authUser.id,
        userEmail: adminUser ? adminUser.email : null,
        userRole: authUser.role,
        collegeId: collegeId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/college/change-email/verify",
        method: "POST",
        statusCode: 200,
        metadata: {
          previousEmail: oldEmail,
          newEmail: normalizedNewEmail,
          changeMethod: "SELF_SERVICE",
          changedAt: new Date(),
        },
      });
      await auditRecord.save({ session });

      // --- Commit transaction ---
      await session.commitTransaction();
      session.endSession();
      session = null;

      // --- Send notifications (ONLY after successful commit) ---

      // 1. Security notification to OLD college email
      try {
        await sendCollegeEmailChangedNotification({
          to: oldEmail,
          oldEmail: oldEmail,
          newEmail: normalizedNewEmail,
          collegeName: college.name,
          collegeId: collegeId.toString(),
          changedAt: new Date().toISOString(),
        });
      } catch (notifErr) {
        logger.logWarning("Failed to send old-email security notification", {
          error: notifErr.message,
          oldEmail,
        });
      }

      // 2. Confirmation to NEW college email
      try {
        await sendCollegeEmailChangeConfirmation({
          to: normalizedNewEmail,
          newEmail: normalizedNewEmail,
          collegeName: college.name,
          collegeId: collegeId.toString(),
          changedAt: new Date().toISOString(),
        });
      } catch (notifErr) {
        logger.logWarning("Failed to send new-email confirmation", {
          error: notifErr.message,
          newEmail: normalizedNewEmail,
        });
      }

      return res.json({
        success: true,
        message: "College email updated successfully.",
        data: { email: normalizedNewEmail },
      });
    } catch (txnError) {
      await session.abortTransaction();
      session.endSession();
      session = null;

      // Handle transaction conflict / concurrent OTP consumption (Step 5B)
      const isTransactionConflict =
        txnError.code === 112 ||
        txnError.code === 251 ||
        txnError.code === 11000 ||
        /WriteConflict|transaction.*aborted|abort.*transaction|OTP_ALREADY_USED|COLLEGE_NOT_FOUND_IN_TXN/i.test(
          txnError.message || ""
        );

      if (isTransactionConflict) {
        return res.status(400).json({
          success: false,
          code: "OTP_ALREADY_USED",
          message: "This OTP has already been used. Please request a new OTP.",
        });
      }

      if (txnError instanceof AppError) {
        return res.status(txnError.statusCode).json({
          success: false,
          code: txnError.code,
          message: txnError.message,
        });
      }

      throw txnError;
    }
  } catch (error) {
    // Ensure session is cleaned up on unexpected errors
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (cleanupErr) {
        logger.logWarning("Session cleanup failed", { error: cleanupErr.message });
      }
    }
    logger.logError("Verify college email change error", { error: error.message });
    next(error);
  }
};
