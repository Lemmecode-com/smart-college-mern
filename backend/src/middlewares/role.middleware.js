module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized: user not authenticated",
      });
    }

    if (!req.user.role) {
      return res.status(401).json({
        message: "Unauthorized: user role missing",
      });
    }

    // Normalize role comparison
    const userRole = req.user.role.toUpperCase();

    if (!allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
     const err = new Error(
  `Access denied: role ${req.user.role} not allowed`
);
err.statusCode = 403;
return next(err);
    }

    next();
  };
};
