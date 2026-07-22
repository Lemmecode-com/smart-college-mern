const crypto = require("crypto"); 
const fs = require("fs");
const path = require("path");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const User = require("../models/user.model");
const Subject = require("../models/subject.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const auditLogService = require("../services/auditLog.service");
const { sendStaffCredentialsEmail } = require("../services/email.service");
const logger = require("../utils/logger");
const {
  reassignTeacherResources,
  getAvailableTeachersForReassignment: fetchAvailableTeachers,
  getTeacherReassignmentData: fetchReassignmentData,
} = require("../services/teacherReassignment.service");

const generateTempPassword = (length = 10) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

const DOCUMENT_TYPE_LABELS = {
  aadhaarCard: "Aadhaar Card",
  panCard: "PAN Card",
  degreeCertificate: "Degree Certificate",
  passportPhoto: "Passport Photo",
};

const processTeacherDocuments = (files = {}) => {
  const documents = [];
  const allowedTypes = Object.keys(DOCUMENT_TYPE_LABELS);

  for (const type of allowedTypes) {
    const fileList = files[type];
    if (fileList && fileList.length > 0 && fileList[0]) {
      const file = fileList[0];
      documents.push({
        documentType: type,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
    }
  }

  return documents;
};

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
      designation,
      qualification,
      experienceYears,
      department_id,
      course_id,
      courses = [],
      // New fields for complete profile
      gender,
      bloodGroup,
      dateOfBirth,
      address,
      city,
      state,
      pincode,
      employmentType,
      mobileNumber,
      joiningDate,
    } = req.body;

    /* ================= Normalize courses ================= */
    const finalCourses =
      courses.length > 0 ? courses : course_id ? [course_id] : [];

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
        throw new AppError(
          "One or more courses do not belong to this department",
          404,
          "COURSE_NOT_FOUND",
        );
      }
    }

    /* ================= Joining Date Validation ================= */
    if (joiningDate && new Date(joiningDate) > new Date()) {
      throw new AppError("Joining Date cannot be a future date", 400, "VALIDATION_ERROR");
    }

    /* ================= Generate Employee ID ================= */
    const departmentTeacherCount = await Teacher.countDocuments({
      college_id: req.college_id,
      department_id,
    });
    const sequenceNumber = String(departmentTeacherCount + 1).padStart(3, "0");
    const generatedEmployeeId = `${department.code}-T-${sequenceNumber}`;

    /* ================= Generate Temp Password ================= */
    const tempPassword = generateTempPassword(12);

    /* ================= Handle Document Uploads ================= */
    const uploadedDocuments = processTeacherDocuments(req.files || {});

    /* ================= Duplicate User ================= */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already exists", 409, "DUPLICATE_EMAIL");
    }

    /* ================= Create User ================= */
    const user = await User.create({
      name,
      email,
      password: tempPassword,
      role: "TEACHER",
      college_id: req.college_id,
      isActive: true,
      mustChangePassword: true,
    });

    /* ================= Create Teacher ================= */
    const teacher = await Teacher.create({
      college_id: req.college_id,
      user_id: user._id,
      department_id,
      courses: finalCourses,
      name,
      email,
      employeeId: generatedEmployeeId,
      designation,
      qualification,
      experienceYears: Number(experienceYears),
      createdBy: req.user.id,
      // New fields
      gender,
      bloodGroup,
      dateOfBirth,
      address,
      city,
      state,
      pincode,
      employmentType: employmentType || "FULL_TIME",
      mobileNumber,
      joiningDate,
      documents: uploadedDocuments,
    });

    ApiResponse.created(
      res,
      {
        teacher,
        temporaryPassword: tempPassword,
      },
      "Teacher created successfully",
    );

    sendStaffCredentialsEmail({
      to: email,
      name,
      temporaryPassword: tempPassword,
      collegeId: req.college_id,
    }).catch((err) => logger.logError("Failed to send teacher credentials email", { error: err.message }));
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
        select: "name code hod_id", // ✅ Include hod_id
        populate: {
          path: "hod_id", // ✅ Populate HOD details
          select: "name _id",
        },
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

    ApiResponse.success(
      res,
      {
        teacher: teacherObj,
      },
      "Profile fetched successfully",
    );
  } catch (error) {
    console.error("PROFILE ERROR:", error);
    next(error);
  }
};

/* =========================================================
   UPDATE MY PROFILE (Logged-in Teacher)
   PUT /teachers/my-profile
   ⚠️ Teachers can ONLY edit: name, email, experienceYears
   ❌ Cannot edit:       generatedEmployeeId,
      designation, qualification, department_id, courses (admin only)
========================================================= */
exports.updateMyProfile = async (req, res, next) => {
  try {
    const { name, email, experienceYears, mobileNumber, joiningDate } =
      req.body;

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
      ...(mobileNumber !== undefined && { mobileNumber }),
      ...(joiningDate !== undefined && { joiningDate }),
    };

    // ─── Joining date validation ───
    if (updateFields.joiningDate && new Date(updateFields.joiningDate) > new Date()) {
      throw new AppError("Joining Date cannot be a future date", 400, "VALIDATION_ERROR");
    }

    const updatedTeacher = await Teacher.findOneAndUpdate(
      {
        _id: teacher._id,
        college_id: req.college_id,
      },
      updateFields,
      { new: true, runValidators: true },
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

    ApiResponse.success(
      res,
      {
        teacher: updatedTeacher,
      },
      "Profile updated successfully",
    );
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
        { employeeId: { $regex: search } },
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

    ApiResponse.paginate(
      res,
      teachers,
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      "Teachers fetched successfully",
    );
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
    logger.logInfo("[Teacher] Fetch by ID", { teacherId: req.params.id });
    logger.logInfo("[Teacher] College ID", { collegeId: req.college_id });

    const teacher = await Teacher.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    })
      .populate("department_id", "name code")
      .populate("courses", "name code")
      .populate("subjects", "name code semester")
      .select("-__v");

    logger.logInfo(
      "[Teacher] Found",
      { teacherId: req.params.id, name: teacher?.name }
    );
    console.log("[getTeacherById] Teacher data:", teacher);

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    ApiResponse.success(
      res,
      {
        teacher,
      },
      "Teacher fetched successfully",
    );
  } catch (error) {
    logger.logError("[Teacher] Fetch by ID failed", { error: error.message });
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

    ApiResponse.success(
      res,
      {
        teachers,
      },
      "Department teachers fetched successfully",
    );
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

    ApiResponse.success(
      res,
      {
        teachers,
      },
      "Course teachers fetched successfully",
    );
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
    let updateData = { ...req.body };

    // Remove sensitive fields
    delete updateData.password;
    delete updateData.user_id;
    delete updateData.college_id;

    // Parse JSON-encoded arrays from FormData
    if (typeof updateData.courses === 'string') {
      try {
        updateData.courses = JSON.parse(updateData.courses);
      } catch (e) {
        updateData.courses = [];
      }
    }

    /* ================= Handle Document Updates ================= */
    const removedDocs = [];
    try {
      removedDocs.push(...JSON.parse(req.body.removedDocuments || "[]"));
    } catch (e) {
      // ignore invalid JSON
    }

    const existingTeacher = await Teacher.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!existingTeacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    const newDocuments = processTeacherDocuments(req.files || {});
    let finalDocs = [...(existingTeacher.documents || [])];

    // Remove deleted documents and clean up files
    for (const docType of removedDocs) {
      const doc = finalDocs.find(d => d.documentType === docType);
      if (doc) {
        const filePath = path.join(__dirname, "../../uploads/teachers", doc.filename);
        fs.promises.unlink(filePath).catch(() => {});
        finalDocs = finalDocs.filter(d => d.documentType !== docType);
      }
    }

    // Add or replace uploaded documents
    for (const doc of newDocuments) {
      const existingIdx = finalDocs.findIndex(d => d.documentType === doc.documentType);
      if (existingIdx >= 0) {
        const oldDoc = finalDocs[existingIdx];
        const oldPath = path.join(__dirname, "../../uploads/teachers", oldDoc.filename);
        fs.promises.unlink(oldPath).catch(() => {});
        finalDocs[existingIdx] = doc;
      } else {
        finalDocs.push(doc);
      }
    }

    updateData.documents = finalDocs;

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
          "SUBJECTS_STILL_ASSIGNED",
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
          "TEACHER_IS_HOD",
        );
      }
    }

    const teacher = await Teacher.findOneAndUpdate(
      { _id: id, college_id: req.college_id },
      updateData,
      { new: true, runValidators: true },
    )
      .populate("department_id", "name")
      .populate("courses", "name code");

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    ApiResponse.success(
      res,
      {
        teacher,
      },
      "Teacher updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
    DELETE TEACHER (Admin only)
    DELETE /teachers/:id
    ✅ FIX: Check for references before deletion to prevent orphaned data
========================================================= */
exports.deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch teacher first (before deletion) for validation
    const teacher = await Teacher.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    // ✅ Check 1: Subject assignments
    const Subject = require("../models/subject.model");
    const assignedSubjects = await Subject.countDocuments({
      teacher_id: teacher._id,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (assignedSubjects > 0) {
      throw new AppError(
        `Cannot delete teacher: ${assignedSubjects} active subject(s) still assigned. Please reassign subjects to another teacher before deletion.`,
        400,
        "SUBJECTS_STILL_ASSIGNED"
      );
    }

    // ✅ Check 2: TimetableSlot assignments
    const TimetableSlot = require("../models/timetableSlot.model");
    const assignedSlots = await TimetableSlot.countDocuments({
      teacher_id: teacher._id,
      college_id: req.college_id,
    });

    if (assignedSlots > 0) {
      throw new AppError(
        `Cannot delete teacher: ${assignedSlots} timetable slot(s) still assigned. Please remove slots from timetable before deletion.`,
        400,
        "TIMETABLE_SLOTS_ASSIGNED"
      );
    }

    // ✅ Check 3: Attendance sessions
    const AttendanceSession = require("../models/attendanceSession.model");
    const activeSessions = await AttendanceSession.countDocuments({
      teacher_id: teacher._id,
      college_id: req.college_id,
      status: "OPEN",
    });
    const closedSessions = await AttendanceSession.countDocuments({
      teacher_id: teacher._id,
      college_id: req.college_id,
    });

    if (closedSessions > 0) {
      throw new AppError(
        `Cannot delete teacher: ${closedSessions} attendance session(s) exist. Teacher records are needed for attendance history.`,
        400,
        "ATTENDANCE_SESSIONS_EXIST"
      );
    }

    // ✅ All checks passed - proceed with deletion
    await Teacher.findOneAndDelete({
      _id: id,
      college_id: req.college_id,
    });

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
      throw new AppError(
        "Department ID is required",
        400,
        "DEPARTMENT_ID_REQUIRED",
      );
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
      { hod_id: teacher._id },
    );

    ApiResponse.success(
      res,
      {
        teacher,
      },
      "HOD assigned successfully",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET TEACHER REASSIGNMENT DATA
   GET /teachers/:id/reassignment-data
   Returns all subjects, slots, and sessions that need reassignment
========================================================= */
exports.getTeacherReassignmentData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    const data = await fetchReassignmentData(id, req.college_id);

    ApiResponse.success(res, data, "Reassignment data fetched successfully");
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET AVAILABLE TEACHERS FOR REASSIGNMENT
   GET /teachers/available-for-reassignment
========================================================= */
exports.getAvailableTeachersForReassignment = async (req, res, next) => {
  try {
    const { excludeTeacherId } = req.query;

    if (!excludeTeacherId) {
      throw new AppError(
        "excludeTeacherId query parameter is required",
        400,
        "INVALID_REQUEST",
      );
    }

    const teachers = await fetchAvailableTeachers(
      req.college_id,
      excludeTeacherId,
    );

    // DEBUG: Log teacher department info
    logger.logInfo("[Teacher] Available teachers count", { count: teachers.length });
    logger.logInfo(
      "[Teacher] Available teachers list",
      teachers.map((t) => ({
        name: t.name,
        deptId: t.department_id,
        deptName: t.department_id?.name,
        status: t.status,
      })),
    );

    ApiResponse.success(
      res,
      { teachers },
      "Available teachers fetched successfully",
    );
  } catch (error) {
    logger.logError("[Teacher] Available teachers fetch failed", { error: error.message });
    next(error);
  }
};

/* =========================================================
   DEACTIVATE TEACHER WITH RESOURCE REASSIGNMENT
   PUT /teachers/:id/deactivate-with-reassignment
   Body: { defaultTeacherId, subjectToTeacherMap: { subjectId: teacherId } }
========================================================= */
exports.deactivateTeacherWithReassignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { defaultTeacherId, subjectToTeacherMap = {} } = req.body;

    if (!defaultTeacherId) {
      throw new AppError(
        "defaultTeacherId is required for reassignment",
        400,
        "INVALID_REQUEST",
      );
    }

    // Validate teacher exists
    const teacher = await Teacher.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    // Check if teacher is HOD
    const isHod = await Department.findOne({ hod_id: teacher._id });
    if (isHod) {
      throw new AppError(
        "Cannot deactivate teacher: Teacher is currently HOD of department. Please assign a new HOD first.",
        400,
        "TEACHER_IS_HOD",
      );
    }

    // Convert subjectToTeacherMap from object to Map
    const subjectMap = new Map(Object.entries(subjectToTeacherMap));

    // Perform the reassignment
    const reassignmentResult = await reassignTeacherResources(
      id,
      req.college_id,
      subjectMap,
      defaultTeacherId,
    );

    // Deactivate the teacher
    teacher.status = "INACTIVE";
    await teacher.save();

    // Also deactivate the user
    await User.findByIdAndUpdate(teacher.user_id, { isActive: false });

    // 📝 Audit log - Teacher deactivation with reassignment
    auditLogService
      .logTeacherDeactivate(
        req.college_id,
        req.user,
        req,
        teacher,
        reassignmentResult,
      )
      .catch((err) => console.error("Audit log failed:", err));

    ApiResponse.success(
      res,
      {
        teacher,
        reassignment: reassignmentResult,
      },
      "Teacher deactivated and resources reassigned successfully",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET TEACHER DOCUMENT (Secure file serving)
   GET /teachers/:id/documents/:filename
========================================================= */
exports.getTeacherDocument = async (req, res, next) => {
  try {
    const { filename, id } = req.params;
    const user = req.user;

    if (!user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    if (cleanFilename.startsWith(".")) {
      return next(new AppError("Invalid filename", 400, "INVALID_FILENAME"));
    }

    const ownerTeacher = await Teacher.findOne({
      _id: id,
      documents: { $elemMatch: { filename: cleanFilename } },
    }).select("_id user_id college_id");

    if (!ownerTeacher) {
      return next(new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND"));
    }

    const isOwner =
      ownerTeacher.user_id &&
      ownerTeacher.user_id.toString() === user.id.toString();
    const isCollegeStaff =
      ["COLLEGE_ADMIN", "ADMISSION_OFFICER", "PRINCIPAL", "HOD", "EXAM_COORDINATOR"].includes(user.role) &&
      user.college_id &&
      ownerTeacher.college_id &&
      user.college_id.toString() === ownerTeacher.college_id.toString();

    if (!isOwner && !isCollegeStaff) {
      return next(
        new AppError("Not authorized to access this document", 403, "UNAUTHORIZED"),
      );
    }

    const filePath = path.join(__dirname, "../../uploads/teachers", cleanFilename);

    res.setHeader(
      "Content-Disposition",
      req.query.download === "true" ? "attachment" : "inline",
    );
    res.sendFile(filePath, (err) => {
      if (err) {
        next(new AppError("Document file not found on server", 404, "FILE_NOT_FOUND"));
      }
    });
  } catch (error) {
    next(error);
  }
};
