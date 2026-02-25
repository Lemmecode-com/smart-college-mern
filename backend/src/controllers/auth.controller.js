const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const User = require("../models/user.model");
const PasswordReset = require("../models/passwordReset.model");
const AppError = require("../utils/AppError");
const { createAndSendOTP, verifyOTP, markOTPAsUsed, checkRateLimit } = require("../services/otp.service");

/**
 * COMMON LOGIN
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ SUPER / COLLEGE ADMIN
    let user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
      }
      return sendToken(res, user._id, user.role, user.college_id);
    }

    // 2️⃣ TEACHER
    let teacher = await Teacher.findOne({ email, status: "ACTIVE" });
    if (teacher) {
      const isMatch = await bcrypt.compare(password, teacher.password);
      if (!isMatch) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
      }
      return sendToken(res, teacher._id, "TEACHER", teacher.college_id);
    }

    // 3️⃣ STUDENT (APPROVED ONLY)
    let student = await Student.findOne({ email, status: "APPROVED" });
    if (student) {
      // ✅ Find the User record for password verification
      const user = await User.findOne({ email, role: "STUDENT" });
      
      if (user) {
        // Use User.password (hashed) for verification
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
        }
        // Send student.user_id in token
        return sendToken(res, student.user_id || student._id, "STUDENT", student.college_id);
      } else {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
      }
    }

    throw new AppError("User not found or not approved", 404, "USER_NOT_FOUND");
  } catch (error) {
    next(error);
  }
};

/**
 * LOGOUT
 */
exports.logout = async (req, res) => {
  // Clear the token cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.json({ message: "Logout successful" });
};

/**
 * REQUEST PASSWORD RESET OTP
 */
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "MISSING_EMAIL");
    }

    // ✅ FIND USER FIRST (Email must exist)
    let user = await User.findOne({ email });
    let userType = "User";

    if (!user) {
      user = await Student.findOne({ email });
      userType = "Student";
    }

    if (!user) {
      user = await Teacher.findOne({ email });
      userType = "Teacher";
    }

    // ❌ Email doesn't exist in database
    if (!user) {
      throw new AppError("Email not found in database", 404, "EMAIL_NOT_FOUND");
    }

    // ✅ CHECK RATE LIMIT (Prevent duplicate requests)
    const rateLimit = await checkRateLimit(email);
    if (!rateLimit.allowed) {
      throw new AppError(rateLimit.message, 429, "RATE_LIMIT_EXCEEDED");
    }

    // ✅ Check if there's already an active OTP for this email
    const existingOTP = await PasswordReset.findOne({
      email,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingOTP) {
      const minutesLeft = Math.floor((existingOTP.expiresAt - new Date()) / 60000);
      return res.json({
        success: true,
        message: `OTP already sent! Please check your email. Valid for ${minutesLeft} more minutes.`,
        otpAlreadySent: true,
      });
    }

    // ✅ Create and send OTP
    await createAndSendOTP(email, userType);

    res.json({
      success: true,
      message: "OTP sent successfully to your email.",
    });
  } catch (error) {
    console.error("❌ Password Reset Error:", error.message);
    next(error);
  }
};

/**
 * VERIFY OTP AND RESET PASSWORD
 */
exports.verifyOTPAndResetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new AppError("Email, OTP, and new password are required", 400, "MISSING_FIELDS");
    }

    // Verify OTP
    const result = await verifyOTP(email, otp);
    
    if (!result.valid) {
      throw new AppError(result.message, 400, "INVALID_OTP");
    }

    // Find user and update password
    let user = await User.findOne({ email });
    
    if (!user) {
      user = await Student.findOne({ email });
    }

    if (!user) {
      user = await Teacher.findOne({ email });
    }

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    // Mark OTP as used
    await markOTPAsUsed(result.record._id);

    res.json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * JWT GENERATOR
 */
const sendToken = (res, id, role, college_id) => {
  const token = jwt.sign(
    { id, role, college_id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // Set httpOnly cookie with the token
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'strict' // Prevent CSRF
  });

  // Send user info in the response (not the token)
  res.json({ 
    token,
    user: { id, role, college_id },
    success: true 
  });
};
