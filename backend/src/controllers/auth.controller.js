const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const User = require("../models/user.model");

/**
 * COMMON LOGIN
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ SUPER / COLLEGE ADMIN
    let user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      return sendToken(res, user._id, user.role, user.college_id);
    }

    // 2️⃣ TEACHER
    let teacher = await Teacher.findOne({ email, status: "ACTIVE" });
    if (teacher) {
      const isMatch = await bcrypt.compare(password, teacher.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      return sendToken(res, teacher._id, "TEACHER", teacher.college_id);
    }

    // 3️⃣ STUDENT (APPROVED ONLY)
    let student = await Student.findOne({ email, status: "APPROVED" });
    if (student) {
      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      return sendToken(res, student._id, "STUDENT", student.college_id);
    }

    return res.status(404).json({ message: "User not found or not approved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
};

/**
 * LOGOUT
 */
exports.logout = async (req, res) => {
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

  res.json({ token, role });
};
