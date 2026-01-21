// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/user.model");

// exports.login = async (req, res) => {
//   const { email, password } = req.body;

//   const user = await User.findOne({ email });
//   if (!user) return res.status(401).json({ message: "Invalid credentials" });

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch)
//     return res.status(401).json({ message: "Invalid credentials" });

//   const token = jwt.sign(
//     {
//       id: user._id,
//       role: user.role,
//       college_id: user.college_id || null
//     },
//     process.env.JWT_SECRET,
//     { expiresIn: "1d" }
//   );

//   res.json({
//     token,
//     role: user.role,
//     user
//   });
// };




const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const User = require("../models/user.model");

/**
 * COMMON LOGIN
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // 1️⃣ Try SUPER / COLLEGE ADMIN
  let user = await User.findOne({ email });
  if (user) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    return sendToken(res, user._id, user.role, user.college_id);
  }

  // 2️⃣ Try TEACHER
  let teacher = await Teacher.findOne({ email, status: "ACTIVE" });
  if (teacher) {
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    return sendToken(res, teacher._id, "TEACHER", teacher.college_id);
  }

  // 3️⃣ Try STUDENT (APPROVED ONLY)
  let student = await Student.findOne({
    email,
    status: "APPROVED"
  });

  if (student) {
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    return sendToken(res, student._id, "STUDENT", student.college_id);
  }

  return res.status(404).json({ message: "User not found or not approved" });
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

  res.json({
    token,
    role,
    user
  });
};



/**
 * LOGOUT USER
 * Client-side token invalidation
 */
exports.logout = async (req, res) => {
  res.json({
    message: "Logout successful"
  });
};

