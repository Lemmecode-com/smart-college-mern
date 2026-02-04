const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

/**
 * CREATE Teacher
 */
exports.createTeacher = async (req, res) => {
  try {
    const {
      name,
      email,
      employeeId,
      designation,
      qualification,
      experienceYears,
      department_id,
      password,
    } = req.body;

    // 1️⃣ Validate department belongs to college
    const department = await Department.findOne({
      _id: department_id,
      college_id: req.college_id,
    });

    if (!department) {
      return res.status(404).json({ message: "Invalid department" });
    }

    // 2️⃣ Check duplicate email
    const emailExists = await Teacher.findOne({
      email,
      college_id: req.college_id,
    });

    if (emailExists) {
      return res.status(400).json({
        message: "Teacher email already exists in this college",
      });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create teacher's user

    const user = await User.create({
      email,
      password,
      role: "TEACHER",
      college_id: req.college_id,
    });

    // 4️⃣ Create teacher
    const teacher = await Teacher.create({
      college_id: req.college_id,
      user_id: user._id,
      department_id,
      name,
      email,
      employeeId,
      designation,
      qualification,
      experienceYears,
      password: hashedPassword,
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "Teacher created successfully",
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        designation: teacher.designation,
        password: teacher.password,
        status: teacher.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      _id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    }).select("-password");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * READ Teachers (college-wise)
 */
exports.getTeachers = async (req, res) => {
  const teachers = await Teacher.find({
    college_id: req.college_id,
  }).populate("department_id", "name code");

  res.json(teachers);
};

/**
 * READ Teacher by ID
 */
exports.getTeacherById = async (req, res) => {
  const teacher = await Teacher.findOne({
    _id: req.params.id,
    college_id: req.college_id,
  });

  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  res.json(teacher);
};

/**
 * UPDATE Teacher
 */
exports.updateTeacher = async (req, res) => {
  const teacher = await Teacher.findOneAndUpdate(
    {
      _id: req.params.id,
      college_id: req.college_id,
    },
    req.body,
    { new: true },
  );

  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  res.json(teacher);
};

/**
 * DELETE Teacher
 */
exports.deleteTeacher = async (req, res) => {
  const teacher = await Teacher.findOneAndDelete({
    _id: req.params.id,
    college_id: req.college_id,
  });

  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  res.json({ message: "Teacher deleted successfully" });
};
