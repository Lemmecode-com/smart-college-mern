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

// Get user info (for checking authentication status) - DYNAMIC
router.get("/me", auth, async (req, res) => {
  try {
    const { id, role, college_id } = req.user;
    
    let userData = {
      id,
      role,
      college_id,
      email: null,
      name: null
    };
    
    // Fetch role-specific user data from database
    if (role === "COLLEGE_ADMIN") {
      const College = require("../models/college.model");
      const college = await College.findOne({ admin_id: id })
        .select('adminEmail adminName name')
        .lean();
      
      if (college) {
        userData.email = college.adminEmail || college.email;
        userData.name = college.adminName || college.name;
      }
    } 
    else if (role === "TEACHER") {
      const Teacher = require("../models/teacher.model");
      const teacher = await Teacher.findOne({ user_id: id })
        .select('email name')
        .lean();
      
      if (teacher) {
        userData.email = teacher.email;
        userData.name = teacher.name;
      }
    } 
    else if (role === "STUDENT") {
      const Student = require("../models/student.model");
      const student = await Student.findOne({ user_id: id })
        .select('email fullName')
        .lean();
      
      if (student) {
        userData.email = student.email;
        userData.name = student.fullName;
      }
    }
    
    // If profile not found, try to get from User collection
    if (!userData.email || !userData.name) {
      const User = require("../models/user.model");
      const user = await User.findById(id).select('email').lean();
      
      if (user) {
        userData.email = userData.email || user.email;
        userData.name = userData.name || user.email?.split('@')[0];
      }
    }
    
    res.json(userData);
  } catch (error) {
    console.error("/auth/me error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message
    });
  }
});

// 🔐 Password Reset (Public) - very strict to prevent email spam
router.post("/forgot-password", passwordResetLimiter, requestPasswordReset);
router.post("/verify-otp-reset", authLimiter, verifyOTPAndResetPassword);

module.exports = router;