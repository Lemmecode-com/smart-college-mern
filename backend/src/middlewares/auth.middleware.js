const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const TokenBlacklist = require("../models/tokenBlacklist.model");
const User = require("../models/user.model");

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

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      college_id: decoded.college_id || null,
    };

    next();
  } catch (error) {
    // JWT verification failed
    return next(new AppError("Invalid or expired token", 401, "INVALID_TOKEN"));
  }
};
