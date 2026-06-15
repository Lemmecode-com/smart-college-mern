const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const { login, logout, refreshToken, requestPasswordReset, verifyOTPAndResetPassword, changePassword } = require("../controllers/auth.controller");
const { authLimiter, passwordResetLimiter, sessionLimiter } = require("../middlewares/rateLimit.middleware");
const { validateLogin, validatePasswordReset, validateVerifyOTP, validateChangePassword } = require("../middlewares/validators/auth.validator");

// Login - strict rate limit to prevent brute force
router.post("/login", authLimiter, validateLogin, login);

// 🔐 Protected routes (no rate limit - already authenticated)
router.post("/logout", auth, logout);

// 🔐 Refresh access token (requires valid refresh token cookie)
router.post("/refresh", sessionLimiter, refreshToken);

// Get user info (for checking authentication status) - DYNAMIC
router.get("/me", auth, async (req, res) => {
  try {
    const { id, opaqueId, role, college_id } = req.user;

    let userData = {
      id: opaqueId,
      realId: id,
      role,
      college_id,
      email: null,
      name: null,
    };

    const User = require("../models/user.model");
    const Student = require("../models/student.model");
    const Teacher = require("../models/teacher.model");

    const pickEmailName = async (Model, filter) => {
      const doc = await Model.findOne(filter).select("email name fullName").lean();
      if (!doc) return null;
      return {
        email: doc.email || (doc.fullName ? doc.email : null),
        name: doc.name || doc.fullName || null,
      };
    };

    let profile = null;
    if (["COLLEGE_ADMIN", "SUPER_ADMIN", "PRINCIPAL", "ACCOUNTANT"].includes(role)) {
      profile = await pickEmailName(User, { _id: id });
    } else if (role === "TEACHER") {
      profile = await pickEmailName(Teacher, { user_id: id });
      if (!profile) profile = await pickEmailName(User, { _id: id });
    } else if (role === "STUDENT") {
      profile = await pickEmailName(Student, { user_id: id });
    }

    if (profile) {
      userData.email = userData.email || profile.email;
      userData.name = userData.name || profile.name;
    }

    if (!userData.email || !userData.name) {
      const user = await User.findById(id).select("email").lean();
      if (user) {
        userData.email = userData.email || user.email;
        userData.name = userData.name || user.email?.split("@")[0];
      }
    }

    res.json(userData);
  } catch (error) {
    console.error("/auth/me error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message,
    });
  }
});

// 🔐 Password Reset (Public) - very strict to prevent email spam
router.post("/forgot-password", passwordResetLimiter, validatePasswordReset, requestPasswordReset);
router.post("/verify-otp-reset", authLimiter, validateVerifyOTP, verifyOTPAndResetPassword);

// 🔐 Change Password (Works for both authenticated and first-login users)
router.post("/change-password", sessionLimiter, validateChangePassword, changePassword);

module.exports = router;