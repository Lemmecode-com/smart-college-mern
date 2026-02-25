const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const User = require("../models/user.model");
const Subject = require("../models/subject.model");
const AppError = require("../utils/AppError");

/* =========================================================
   CREATE TEACHER (College Admin)
   POST /teachers
   ➕ supports course assignment
========================================================= */
exports.createTeacher = async (req, res, next) => {
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
      throw new AppError("Invalid department", 404, "DEPARTMENT_NOT_FOUND");
    }

    /* ================= Validate Courses ================= */
    if (finalCourses.length > 0) {
      const validCourses = await Course.countDocuments({
        _id: { $in: finalCourses },
        department_id,
        college_id: req.college_id,
      });

      if (validCourses !== finalCourses.length) {
        throw new AppError("One or more courses do not belong to this department", 404, "COURSE_NOT_FOUND");
      }
    }

    /* ================= Duplicate User ================= */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already exists", 409, "DUPLICATE_EMAIL");
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
      courses: finalCourses,
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
    next(error);
  }
};

/* =========================================================
   GET MY PROFILE (Logged-in Teacher)
   GET /teachers/my-profile
   ✅ FIXED: Properly populate department_id with hod_id
========================================================= */
exports.getMyProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    })
      .populate({
        path: "department_id",
        select: "name code hod_id",  // ✅ Include hod_id
        populate: {
          path: "hod_id",  // ✅ Populate HOD details
          select: "name _id"
        }
      })
      .populate("courses", "name code")
      .populate("college_id", "name code")
      .select("-__v");

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher profile not found",
      });
    }

    // ✅ Fetch subjects assigned to this teacher
    const subjects = await Subject.find({
      teacher_id: teacher._id,
      college_id: req.college_id,
      status: "ACTIVE",
    }).populate("course_id", "name code");

    // ✅ Convert to plain object and add subjects
    const teacherObj = teacher.toObject();
    teacherObj.subjects = subjects;

    res.json(teacherObj);
  } catch (error) {
    console.error("PROFILE ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
};

/* =========================================================
   UPDATE MY PROFILE (Logged-in Teacher)
   PUT /teachers/my-profile
   ⚠️ Teachers can ONLY edit: name, email, experienceYears
   ❌ Cannot edit: employeeId, designation, qualification, department_id, courses (admin only)
========================================================= */
exports.updateMyProfile = async (req, res, next) => {
  try {
    const {
      name,
      email,
      experienceYears,
    } = req.body;

    // Find teacher by user_id (logged-in user)
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (!teacher) {
      throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
    }

    // Update teacher fields (ONLY editable fields)
    const updateFields = {
      ...(name && { name }),
      ...(email && { email }),
      ...(experienceYears !== undefined && { experienceYears }),
    };

    const updatedTeacher = await Teacher.findOneAndUpdate(
      {
        _id: teacher._id,
        college_id: req.college_id,
      },
      updateFields,
      { new: true }
    )
      .populate("department_id", "name")
      .populate("courses", "name code");

    // Update user name/email if provided
    if (name || email) {
      await User.findByIdAndUpdate(req.user.id, {
        ...(name && { name }),
        ...(email && { email }),
      });
    }

    res.json({
      message: "Profile updated successfully",
      teacher: updatedTeacher,
    });
  } catch (error) {
    next(error);
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
   GET TEACHERS BY COURSE
   GET /teachers/course/:courseId
========================================================= */
exports.getTeachersByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({
        message: "Course ID is required",
      });
    }

    const teachers = await Teacher.find({
      courses: courseId,
      college_id: req.college_id,
      status: "ACTIVE",
    })
      .populate("department_id", "name")
      .select("name email employeeId designation");

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teachers by course" });
  }
};

/* =========================================================
   UPDATE TEACHER (Admin / HOD)
   PUT /teachers/:id
========================================================= */
exports.updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove sensitive fields
    delete updateData.password;
    delete updateData.user_id;
    delete updateData.college_id;

    const teacher = await Teacher.findOneAndUpdate(
      { _id: id, college_id: req.college_id },
      updateData,
      { new: true, runValidators: true }
    )
      .populate("department_id", "name")
      .populate("courses", "name code");

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    res.json({
      message: "Teacher updated successfully",
      teacher,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE TEACHER (Admin only)
   DELETE /teachers/:id
========================================================= */
exports.deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findOneAndDelete({
      _id: id,
      college_id: req.college_id,
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    // Optionally delete the associated user
    await User.deleteOne({ _id: teacher.user_id });

    res.json({
      message: "Teacher deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   ASSIGN HOD TO DEPARTMENT
   PUT /teachers/:id/assign-hod
========================================================= */
exports.assignHOD = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { department_id } = req.body;

    if (!department_id) {
      throw new AppError("Department ID is required", 400, "DEPARTMENT_ID_REQUIRED");
    }

    const teacher = await Teacher.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    // Update department's hod_id
    await Department.findOneAndUpdate(
      { _id: department_id, college_id: req.college_id },
      { hod_id: teacher._id }
    );

    res.json({
      message: "HOD assigned successfully",
      teacher,
    });
  } catch (error) {
    next(error);
  }
};