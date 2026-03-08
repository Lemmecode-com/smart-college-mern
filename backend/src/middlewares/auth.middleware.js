const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const TokenBlacklist = require("../models/tokenBlacklist.model");
const securityAuditService = require("../services/securityAudit.service");

module.exports = async (req, res, next) => {
  try {
    // Get token from cookie instead of header
    const token = req.cookies.token;

    if (!token) {
      // 🔒 SECURITY AUDIT: Log missing token attempt
      await securityAuditService.logUnauthorizedAccess(req, 'MISSING_TOKEN', 401);
      throw new AppError("Authorization token missing", 401, "TOKEN_MISSING");
    }

    // 🔒 SECURITY: Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({
      token: token,
      tokenType: "access",
      expiresAt: { $gt: new Date() } // Only check non-expired blacklisted tokens
    });

    if (isBlacklisted) {
      // 🔒 SECURITY AUDIT: Log blacklisted token attempt
      await securityAuditService.logBlacklistedTokenAttempt(req.user, req);
      throw new AppError(
        "Token has been blacklisted. Please login again.",
        401,
        "TOKEN_BLACKLISTED"
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      college_id: decoded.college_id || null
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      // 🔒 SECURITY AUDIT: Log invalid token attempt
      await securityAuditService.logUnauthorizedAccess(req, 'INVALID_TOKEN', 401);
      // JWT verification failed
      throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
    }
  }
};