const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const User = require("../models/user.model");

/**
 * CREATE TEACHER (College Admin)
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

    /* 1️⃣ Validate department */
    const department = await Department.findOne({
      _id: department_id,
      college_id: req.college_id,
    });

    if (!department) {
      return res.status(404).json({ message: "Invalid department" });
    }

    /* 2️⃣ Check duplicate user */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    /* 3️⃣ Create User (password hashed by pre-save hook) */
    const user = await User.create({
      name,
      email,
      password,
      role: "TEACHER",
      college_id: req.college_id,
    });

    /* 4️⃣ Create Teacher (NO password here) */
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
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "Teacher created successfully",
      teacher,
    });
  } catch (error) {
    console.error("Create Teacher Error:", error);
    res.status(500).json({ message: "Failed to create teacher" });
  }
};

/**
 * GET MY PROFILE (Teacher)
 */
exports.getMyProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      user_id: req.user._id,
      college_id: req.college_id,
      status: "ACTIVE",
    })
      .populate("department_id", "name")
      .select("-__v");

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher profile not found",
      });
    }

    res.json(teacher);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
};

/**
 * GET ALL TEACHERS (College Admin)
 */
exports.getTeachers = async (req, res) => {
  const teachers = await Teacher.find({
    college_id: req.college_id,
  })
    .populate("department_id", "name code")
    .select("-__v");

  res.json(teachers);
};

/**
 * GET TEACHER BY ID
 */
exports.getTeacherById = async (req, res) => {
  const teacher = await Teacher.findOne({
    _id: req.params.id,
    college_id: req.college_id,
  })
    .populate("department_id", "name")
    .select("-__v");

  if (!teacher) {
    return res.status(404).json({
      message: "Teacher not found",
    });
  }

  res.json(teacher);
};

/**
 * UPDATE TEACHER
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
    return res.status(404).json({
      message: "Teacher not found",
    });
  }

  res.json({
    message: "Teacher updated successfully",
    teacher,
  });
};

/**
 * DELETE TEACHER
 */
exports.deleteTeacher = async (req, res) => {
  const teacher = await Teacher.findOne({
    _id: req.params.id,
    college_id: req.college_id,
  });

  if (!teacher) {
    return res.status(404).json({
      message: "Teacher not found",
    });
  }

  // delete linked user
  await User.findByIdAndDelete(teacher.user_id);
  await teacher.deleteOne();

  res.json({
    message: "Teacher deleted successfully",
  });
};
