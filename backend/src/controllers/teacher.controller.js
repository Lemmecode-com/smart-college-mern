const Teacher = require("../models/teacher.model");
const User = require("../models/user.model");

/* ================= CREATE TEACHER PROFILE ================= */
exports.createTeacher = async (req, res) => {
  const { userId, departmentId } = req.body;

  const user = await User.findById(userId);
  if (!user || user.role !== "teacher") {
    return res.status(400).json({ message: "Invalid teacher user" });
  }

  const exists = await Teacher.findOne({ userId });
  if (exists) {
    return res.status(400).json({ message: "Teacher profile already exists" });
  }

  const teacher = await Teacher.create({
    userId,
    name: user.name,
    departmentId,
    collegeId: req.user.collegeId
  });

  res.status(201).json(teacher);
};

/* ================= ASSIGN SUBJECTS ================= */
exports.assignSubjects = async (req, res) => {
  const { teacherId } = req.params;
  const { subjectIds } = req.body;

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  teacher.subjectIds = subjectIds;
  await teacher.save();

  res.json({
    message: "Subjects assigned successfully",
    teacher
  });
};

/* ================= GET TEACHER ================= */
exports.getTeacher = async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate("departmentId", "name")
    .populate("subjectIds", "name");

  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  res.json(teacher);
};
