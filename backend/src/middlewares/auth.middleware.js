const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // Get token from cookie instead of header
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Authorization token missing"
      });
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
    error.statusCode = 401;
    next(error);
  }
};

