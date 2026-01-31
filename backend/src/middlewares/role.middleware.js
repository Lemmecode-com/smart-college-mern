module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user must come from auth.middleware
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        message: "Unauthorized: user not found in request"
      });
    }

    // Check role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied: insufficient permissions"
      });
    }
    next();
  };
};
