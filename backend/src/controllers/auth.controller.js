const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const User = require("../models/user.model");
const AppError = require("../utils/AppError");

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
      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) {
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
//=====================================================================