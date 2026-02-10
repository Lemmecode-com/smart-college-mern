// module.exports = (...allowedRoles) => {
//   return (req, res, next) => {
//     // req.user must come from auth.middleware
//     if (!req.user || !req.user.role) {
//       return res.status(401).json({
//         message: "Unauthorized: user not found in request"
//       });
//     }

//     // Check role
//     if (!allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({
//         message: "Access denied: insufficient permissions"
//       });
//     }

//     next();
//   };
// };


// module.exports = (...allowedRoles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({
//         message: "Unauthorized: user not authenticated",
//       });
//     }

//     if (!req.user.role) {
//       return res.status(401).json({
//         message: "Unauthorized: user role missing",
//       });
//     }

//     // 🔍 TEMP DEBUG (remove after testing)
//     console.log("ROLE FROM TOKEN:", req.user.role);
//     console.log("ALLOWED ROLES:", allowedRoles);

//     if (!allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({
//         message: `Access denied: role ${req.user.role} not allowed`,
//       });
//     }
//     next();
//   };
// };


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
