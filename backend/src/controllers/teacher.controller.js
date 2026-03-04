const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const User = require("../models/user.model");
const Subject = require("../models/subject.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");

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

    ApiResponse.created(res, {
      teacher
    }, "Teacher created successfully");
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

    ApiResponse.success(res, {
      teacher: teacherObj
    }, "Profile fetched successfully");
  } catch (error) {
    console.error("PROFILE ERROR:", error);
    next(error);
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

    ApiResponse.success(res, {
      teacher: updatedTeacher
    }, "Profile updated successfully");
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
    // 📄 Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 🔍 Filter options
    const { department_id, status, search } = req.query;

    // Build filter
    const filter = { college_id: req.college_id };

    if (department_id) filter.department_id = department_id;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search } }
      ];
    }

    // Get total count
    const total = await Teacher.countDocuments(filter);

    // Get paginated teachers
    const teachers = await Teacher.find(filter)
      .populate("department_id", "name code")
      .populate("courses", "name code")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .select("-__v");

    ApiResponse.paginate(res, teachers, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }, "Teachers fetched successfully");
  } catch (error) {
    next(error);
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
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    ApiResponse.success(res, {
      teacher
    }, "Teacher fetched successfully");
  } catch (error) {
    next(error);
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

    ApiResponse.success(res, {
      teachers
    }, "Department teachers fetched successfully");
  } catch (error) {
    next(error);
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
      throw new AppError("Course ID is required", 400, "INVALID_REQUEST");
    }

    const teachers = await Teacher.find({
      courses: courseId,
      college_id: req.college_id,
      status: "ACTIVE",
    })
      .populate("department_id", "name")
      .select("name email employeeId designation");

    ApiResponse.success(res, {
      teachers
    }, "Course teachers fetched successfully");
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPDATE TEACHER (Admin / HOD)
   PUT /teachers/:id
   
   FIX: Edge Case 5 - Teacher Deactivation
   - Block deactivation if teacher has assigned subjects
   - Require subject reassignment before deactivation
========================================================= */
exports.updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove sensitive fields
    delete updateData.password;
    delete updateData.user_id;
    delete updateData.college_id;

    // ✅ FIX: Edge Case 5 - Check if trying to deactivate teacher
    if (updateData.status === "INACTIVE") {
      const teacher = await Teacher.findOne({
        _id: id,
        college_id: req.college_id,
      }).populate("department_id");

      if (!teacher) {
        throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
      }

      // Check if teacher has assigned subjects
      const Subject = require("../models/subject.model");
      const assignedSubjects = await Subject.countDocuments({
        teacher_id: teacher._id,
        status: "ACTIVE",
      });

      if (assignedSubjects > 0) {
        throw new AppError(
          `Cannot deactivate teacher: ${assignedSubjects} subject(s) still assigned. Please reassign subjects to another teacher before deactivation.`,
          400,
          "SUBJECTS_STILL_ASSIGNED"
        );
      }

      // Check if teacher is HOD of department
      const Department = require("../models/department.model");
      const isHod = await Department.findOne({
        hod_id: teacher._id,
      });

      if (isHod) {
        throw new AppError(
          "Cannot deactivate teacher: Teacher is currently HOD of department. Please assign a new HOD first.",
          400,
          "TEACHER_IS_HOD"
        );
      }
    }

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

    ApiResponse.success(res, {
      teacher
    }, "Teacher updated successfully");
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

    ApiResponse.success(res, null, "Teacher deleted successfully");
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

    ApiResponse.success(res, {
      teacher
    }, "HOD assigned successfully");
  } catch (error) {
    next(error);
  }
};