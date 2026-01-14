// src/controllers/student.controller.js
const Student = require("../models/student.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

exports.createStudent = async (req, res) => {
  const {
    name,
    email,
    password,
    rollNo,
    departmentId,
    courseId
  } = req.body;

  // 1️⃣ Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // 2️⃣ Create user with role student
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "student"
  });

  // 3️⃣ Create student profile
  const student = await Student.create({
    userId: user._id,
    rollNo,
    departmentId,
    courseId
  });

  res.status(201).json({
    message: "Student created successfully",
    student
  });
};


exports.getAllStudents = async (req, res) => {
  const students = await Student.find()
    .populate("userId", "name email")
    .populate("departmentId", "name")
    .populate("courseId", "name code");

  res.json({
    count: students.length,
    students
  });
};

exports.getStudentsByCourse = async (req, res) => {
  const { courseId } = req.params;

  const students = await Student.find({ courseId })
    .populate("userId", "name email")
    .populate("departmentId", "name")
    .populate("courseId", "name code");

  res.json({
    count: students.length,
    students
  });
};

exports.assignParentToStudent = async (req, res) => {
  const { studentId } = req.params;
  const { parentId } = req.body;

  const parent = await User.findById(parentId);
  if (!parent || parent.role !== "parent") {
    return res.status(400).json({ message: "Invalid parent user" });
  }

  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  student.parentId = parentId;
  await student.save();

  res.json({
    message: "Parent assigned to student successfully"
  });
};