const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const { login, logout, requestPasswordReset, verifyOTPAndResetPassword } = require("../controllers/auth.controller");

router.post("/login", login);

// 🔐 Protected routes
router.post("/logout", auth, logout);

// Get user info (for checking authentication status)
router.get("/me", auth, (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
    college_id: req.user.college_id
  });
});

// 🔐 Password Reset (Public)
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-otp-reset", verifyOTPAndResetPassword);

module.exports = router;