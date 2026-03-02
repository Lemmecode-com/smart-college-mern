const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const { login, logout, refreshToken, requestPasswordReset, verifyOTPAndResetPassword } = require("../controllers/auth.controller");
const { authLimiter, passwordResetLimiter } = require("../middlewares/rateLimit.middleware");

// Login - strict rate limit to prevent brute force
router.post("/login", authLimiter, login);

// 🔐 Protected routes (no rate limit - already authenticated)
router.post("/logout", auth, logout);

// 🔐 Refresh access token (requires valid refresh token cookie)
router.post("/refresh", refreshToken);

// Get user info (for checking authentication status)
router.get("/me", auth, (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
    college_id: req.user.college_id
  });
});

// 🔐 Password Reset (Public) - very strict to prevent email spam
router.post("/forgot-password", passwordResetLimiter, requestPasswordReset);
router.post("/verify-otp-reset", authLimiter, verifyOTPAndResetPassword);

module.exports = router;