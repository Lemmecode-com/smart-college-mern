const User = require("../models/user.model");
const Parent = require("../models/parent.model");
const Student = require("../models/student.model");
const bcrypt = require("bcryptjs");

exports.createParent = async (req, res) => {
  try {
    // 1️⃣ Find logged-in student
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const { name, email, password, occupation, phone } = req.body;

    // 2️⃣ Check if parent already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Parent already exists" });
    }

    // 3️⃣ Create parent user
    const hashedPassword = await bcrypt.hash(password, 10);

    const parentUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "parent",
    });

    // 4️⃣ Create parent profile & link student
    await Parent.create({
      userId: parentUser._id,
      occupation,
      phone,
      studentId: student._id,
    });

    res.status(201).json({ message: "Parent added successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyChild = async (req, res) => {
  const parent = await Parent.findOne({ userId: req.user.id })
    .populate({
      path: "studentId",
      populate: [
        { path: "departmentId", select: "name code" },
        { path: "courseId", select: "name code" },
      ],
    });

  if (!parent) {
    return res.status(404).json({ message: "Parent profile not found" });
  }

  res.json({
    success: true,
    data: parent.studentId,
  });
};

exports.getChildAttendance = async (req, res) => {
  const parent = await Parent.findOne({ userId: req.user.id });

  const records = await Attendance.find({
    studentId: parent.studentId,
  }).populate("courseId", "name");

  res.json(records);
};
