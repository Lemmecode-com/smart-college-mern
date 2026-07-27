const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const TokenBlacklist = require("../models/tokenBlacklist.model");
const User = require("../models/user.model");
const AuthSession = require("../models/authSession.model");
const { toOpaqueId } = require("../utils/opaqueId");
const logger = require("../utils/logger");

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
module.exports = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies.token;

    if (!token) {
      return next(
        new AppError("Authorization token missing", 401, "TOKEN_MISSING"),
      );
    }

    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({
      token: token,
      tokenType: "access",
      expiresAt: { $gt: new Date() },
    });

    if (isBlacklisted) {
      return next(
        new AppError(
          "Token has been blacklisted. Please login again.",
          401,
          "TOKEN_BLACKLISTED",
        ),
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check tokenVersion — invalidate if password was changed
    if (decoded.tokenVersion !== undefined) {
      const userRecord = await User.findById(decoded.id).select('tokenVersion');
      if (userRecord && decoded.tokenVersion < userRecord.tokenVersion) {
        return next(
          new AppError("Token invalidated by password change. Please login again.", 401, "TOKEN_INVALIDATED")
        );
      }
    }

    // Fetch user from database to check isActive status
    const user = await User.findById(decoded.id).select(
      "isActive role college_id",
    );

    if (!user) {
      return next(
        new AppError(
          "User not found. Please login again.",
          401,
          "USER_NOT_FOUND",
        ),
      );
    }

    // Check if user account is deactivated
    if (!user.isActive) {
      return next(
        new AppError(
          "Account deactivated. Please contact administrator.",
          401,
          "ACCOUNT_DEACTIVATED",
        ),
      );
    }

    const sessionId = decoded.sessionId || null;

    if (sessionId) {
      const session = await AuthSession.findOne({ sessionId, user_id: decoded.id }).lean();
      if (!session || !session.isActive) {
        const reason =
          session?.invalidationReason === "NEW_LOGIN_RESTRICTED"
            ? "Your session was terminated because you logged in from another location. If this wasn't you, please contact your administrator."
            : "Your session has expired. Please sign in again.";
        const code =
          session?.invalidationReason === "NEW_LOGIN_RESTRICTED"
            ? "SESSION_TERMINATED"
            : "SESSION_INVALIDATED";

        return next(
          new AppError(reason, 401, code),
        );
      }
      req.authSession = session;
    } else {
      logger.logWarning("JWT missing sessionId", {
        userId: decoded.id,
        role: decoded.role,
        college_id: decoded.college_id,
      });
    }

    req.sessionId = sessionId;

    // Attach user info to request
    req.user = {
      id: decoded.id,
      opaqueId: toOpaqueId(decoded.id),
      role: decoded.role,
      college_id: decoded.college_id || null,
      sessionId,
    };

    next();
  } catch (error) {
    // JWT verification failed
    return next(new AppError("Invalid or expired token", 401, "INVALID_TOKEN"));
  }
};
