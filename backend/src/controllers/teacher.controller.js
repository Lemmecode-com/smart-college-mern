const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model"); // ✅ NEW
const User = require("../models/user.model");

/* =========================================================
   CREATE TEACHER (College Admin)
   POST /teachers
   ➕ supports course assignment
========================================================= */
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
      course_id,
      courses = [],
      password,
    } = req.body;

    /* ================= Normalize courses ================= */
    const finalCourses =
      courses.length > 0
        ? courses
        : course_id
          ? [course_id]
          : [];

    /* ================= Validate Department ================= */
    const department = await Department.findOne({
      _id: department_id,
      college_id: req.college_id,
    });

    if (!department) {
      return res.status(404).json({ message: "Invalid department" });
    }

    /* ================= Validate Courses ================= */
    if (finalCourses.length > 0) {
      const validCourses = await Course.countDocuments({
        _id: { $in: finalCourses },
        department_id,
        college_id: req.college_id,
      });

      if (validCourses !== finalCourses.length) {
        return res.status(400).json({
          message: "One or more courses do not belong to this department",
        });
      }
    }

    /* ================= Duplicate User ================= */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    /* ================= Create User ================= */
    const user = await User.create({
      name,
      email,
      password,
      role: "TEACHER",
      college_id: req.college_id,
    });

    /* ================= Create Teacher ================= */
    const teacher = await Teacher.create({
      college_id: req.college_id,
      user_id: user._id,
      department_id,
      courses: finalCourses, // ✅ ALWAYS SAVED
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


/* =========================================================
   GET MY PROFILE (Logged-in Teacher)
   GET /teachers/my-profile
========================================================= */
exports.getMyProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    })
      .populate("department_id", "name")
      .populate("courses", "name code") // ✅ NEW
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

/* =========================================================
   GET ALL TEACHERS (Admin / HOD)
   GET /teachers
========================================================= */
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({
      college_id: req.college_id,
    })
      .populate("department_id", "name code")
      .populate("courses", "name code")
      .select("-__v");

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
};

/* =========================================================
   GET TEACHER BY ID
   GET /teachers/:id
========================================================= */
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    })
      .populate("department_id", "name")
      .populate("courses", "name code")
      .select("-__v");

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teacher" });
  }
};

/* =========================================================
   GET TEACHERS BY DEPARTMENT
   GET /teachers/department/:departmentId
========================================================= */
exports.getTeachersByDepartment = async (req, res) => {
  try {
    const teachers = await Teacher.find({
      department_id: req.params.departmentId,
      college_id: req.college_id,
      status: "ACTIVE",
    }).select("_id name designation");

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
};

/* =========================================================
   ✅ NEW: GET TEACHERS BY COURSE
   GET /teachers/course/:courseId
========================================================= */
/**
 * GET TEACHERS BY COURSE
 * GET /teachers/course/:courseId
 */
exports.getTeachersByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        message: "Course ID is required",
      });
    }

    const teachers = await Teacher.find({
      college_id: req.college_id,
      status: "ACTIVE",
      courses: courseId, // ✅ KEY LINE
    })
      .select("_id name designation");

    res.json(teachers);
  } catch (error) {
    console.error("Get Teachers By Course Error:", error);
    res.status(500).json({
      message: "Failed to fetch teachers by course",
    });
  }
};


/* =========================================================
   UPDATE TEACHER
   PUT /teachers/:id
========================================================= */
exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOneAndUpdate(
      {
        _id: req.params.id,
        college_id: req.college_id,
      },
      req.body,
      { new: true }
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
  } catch (error) {
    res.status(500).json({ message: "Failed to update teacher" });
  }
};

/* =========================================================
   DEACTIVATE TEACHER
   PUT /teachers/:id/deactivate
========================================================= */
exports.deactivateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOneAndUpdate(
      {
        _id: req.params.id,
        college_id: req.college_id,
      },
      { status: "INACTIVE" },
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    res.json({
      message: "Teacher deactivated successfully",
      teacher,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to deactivate teacher" });
  }
};

/* =========================================================
   DELETE TEACHER (Hard Delete)
   DELETE /teachers/:id
========================================================= */
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    await User.findByIdAndDelete(teacher.user_id);
    await teacher.deleteOne();

    res.json({
      message: "Teacher deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete teacher" });
  }
};
