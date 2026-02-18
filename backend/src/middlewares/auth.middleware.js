const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

module.exports = (req, res, next) => {
  try {
    // Get token from cookie instead of header
    const token = req.cookies.token;

    if (!token) {
      throw new AppError("Authorization token missing", 401, "TOKEN_MISSING");
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
      // JWT verification failed
      throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
    }
  }
};
