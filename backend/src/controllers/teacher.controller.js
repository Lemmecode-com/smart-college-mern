const crypto = require("crypto");
const path = require("path");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const User = require("../models/user.model");
const Subject = require("../models/subject.model");
const Document = require("../models/document.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const auditLogService = require("../services/auditLog.service");
const { sendStaffCredentialsEmail } = require("../services/email.service");
const logger = require("../utils/logger");
const { getStorageProvider } = require("../services/storage");
const DocumentService = require("../services/document.service");
const { processUploadsWithStorage } = require("../middlewares/upload.middleware");
const {
  reassignTeacherResources,
  getAvailableTeachersForReassignment: fetchAvailableTeachers,
  getTeacherReassignmentData: fetchReassignmentData,
} = require("../services/teacherReassignment.service");
const { validateAge, ageValidatorMessage } = require("../utils/validators");

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

const processTeacherDocuments = async (files = {}, teacherId = null, uploadedBy = null) => {
  const storageService = getStorageProvider().getAdapter();
  const documents = [];
  const allowedTypes = Object.keys(DOCUMENT_TYPE_LABELS);

  for (const type of allowedTypes) {
    const fileList = files[type];
    if (fileList && fileList.length > 0 && fileList[0]) {
      const file = fileList[0];
      if (!file.buffer) continue;

      const uploadResult = await storageService.uploadFile(
        file.buffer,
        file.originalname,
        "teacher",
        {
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          documentType: type,
        }
      );

      let documentId = null;

      if (teacherId && uploadedBy) {
        try {
          const Document = require("../models/document.model");
          const DocumentService = require("../services/document.service");
          const doc = await DocumentService.createDocument({
            ownerType: "Teacher",
            ownerId: teacherId,
            documentType: type,
            fileBuffer: file.buffer,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: uploadedBy,
            category: "teacher",
            storageKey: uploadResult.storagePath,
          });
          documentId = doc.documentId;
        } catch (error) {
          console.error(`Failed to create Document record for ${type}:`, error.message);
        }
      }

      documents.push({
        documentType: type,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        documentId,
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

    /* ================= Date of Birth Validation ================= */
    if (dateOfBirth && !validateAge(dateOfBirth, 14, 100)) {
      throw new AppError(ageValidatorMessage(14, 100), 400, "VALIDATION_ERROR");
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

    /* ================= Duplicate User ================= */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already exists", 409, "DUPLICATE_EMAIL");
    }

    /* ================= Handle Document Uploads ================= */
    // Uploads are processed after teacher creation so we can pass teacherId
    // to the Document collection (Document collection is the single source of truth)

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
      // Documents array is no longer the primary storage — documentRefs is
    });

    /* ================= Create Document Records ================= */
    // Now that teacher exists, we can create Document records with teacherId
    const uploadedDocuments = await processTeacherDocuments(
      req.files || {},
      teacher._id,
      req.user.id,
    );

    const documentRefs = uploadedDocuments
      .filter((doc) => doc.documentId)
      .map((doc) => ({
        documentId: doc.documentId,
        documentType: doc.documentType,
      }));

    if (documentRefs.length > 0) {
      await Teacher.findByIdAndUpdate(teacher._id, { documentRefs });
    }

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
exports.getMyProfile = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    })
      .populate({
        path: "department_id",
        select: "name code hod_id",
        populate: {
          path: "hod_id",
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

    const subjects = await Subject.find({
      teacher_id: teacher._id,
      college_id: req.college_id,
      status: "ACTIVE",
    }).populate("course_id", "name code");

    let teacherObj = teacher.toObject();
    teacherObj.subjects = subjects;

    if (!teacherObj.mobileNumber) {
      const user = await User.findById(req.user.id).select("mobileNumber");
      if (user?.mobileNumber) {
        teacherObj.mobileNumber = user.mobileNumber;
      }
    }

    if (!teacherObj.department_id && subjects.length > 0 && subjects[0].department_id) {
      const dept = await Department.findById(subjects[0].department_id).select("name code hod_id");
      if (dept) {
        teacherObj.department_id = {
          _id: dept._id,
          name: dept.name,
          code: dept.code,
        };
      }
    }

    // Always enrich documents from Document collection to ensure documentId is present
    if (teacherObj.documentRefs && teacherObj.documentRefs.length > 0) {
      try {
        const docIds = teacherObj.documentRefs
          .map((dr) => dr.documentId)
          .filter(Boolean);
        const docs = await Document.find({
          documentId: { $in: docIds },
          status: "ACTIVE",
        }).select(
          "documentId originalFileName mimeType size storageKey documentType",
        );

        const docMap = {};
        docs.forEach((d) => {
          docMap[d.documentId] = d;
        });

        teacherObj.documents = teacherObj.documentRefs
          .filter((dr) => docMap[dr.documentId])
          .map((dr) => ({
            documentType: dr.documentType,
            filename: dr.documentId,
            originalName: docMap[dr.documentId].originalFileName,
            mimetype: docMap[dr.documentId].mimeType,
            size: docMap[dr.documentId].size,
            storagePath: docMap[dr.documentId].storageKey,
            documentId: dr.documentId,
          }));
      } catch (err) {
        console.error("Failed to resolve teacher documents:", err.message);
      }
    } else if (teacherObj.documents && teacherObj.documents.length > 0) {
      try {
        const docs = await Document.find({
          ownerType: "Teacher",
          ownerId: teacher._id,
          status: "ACTIVE",
        }).select(
          "documentId originalFileName mimeType size storageKey documentType",
        );

        const docMap = {};
        docs.forEach((d) => {
          docMap[d.documentType] = docMap[d.documentType] || [];
          docMap[d.documentType].push(d);
        });

        teacherObj.documents = teacherObj.documents.map((doc) => {
          const candidates = docMap[doc.documentType];
          if (candidates && candidates.length > 0) {
            const matched = candidates.find((c) => c.originalFileName === doc.originalName) || candidates[0];
            return {
              ...doc,
              documentId: matched.documentId,
              storagePath: matched.storageKey,
            };
          }
          return doc;
        });
      } catch (err) {
        console.error("Failed to resolve legacy teacher documents:", err.message);
      }
    }

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
    const { name, experienceYears, mobileNumber, joiningDate } =
      req.body;

    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (!teacher) {
      throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
    }

    const updateFields = {
      ...(name && { name }),
      ...(experienceYears !== undefined && { experienceYears }),
      ...(mobileNumber !== undefined && { mobileNumber }),
      ...(joiningDate !== undefined && { joiningDate }),
    };

    if (updateFields.email) {
      delete updateFields.email;
    }

    if (joiningDate && new Date(joiningDate) > new Date()) {
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

    if (name) {
      await User.findByIdAndUpdate(req.user.id, {
        name,
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

    // Always enrich documents from Document collection to ensure documentId is present
    if (teacher.documentRefs && teacher.documentRefs.length > 0) {
      try {
        const docIds = teacher.documentRefs
          .map((dr) => dr.documentId)
          .filter(Boolean);
        const docs = await Document.find({
          documentId: { $in: docIds },
          status: "ACTIVE",
        }).select(
          "documentId originalFileName mimeType size storageKey documentType",
        );

        const docMap = {};
        docs.forEach((d) => {
          docMap[d.documentId] = d;
        });

        teacher.documents = teacher.documentRefs
          .filter((dr) => docMap[dr.documentId])
          .map((dr) => ({
            documentType: dr.documentType,
            filename: dr.documentId,
            originalName: docMap[dr.documentId].originalFileName,
            mimetype: docMap[dr.documentId].mimeType,
            size: docMap[dr.documentId].size,
            storagePath: docMap[dr.documentId].storageKey,
            documentId: dr.documentId,
          }));
      } catch (err) {
        console.error("Failed to resolve teacher documents:", err.message);
      }
    } else if (teacher.documents && teacher.documents.length > 0) {
      try {
        const docs = await Document.find({
          ownerType: "Teacher",
          ownerId: teacher._id,
          status: "ACTIVE",
        }).select(
          "documentId originalFileName mimeType size storageKey documentType",
        );

        const docMap = {};
        docs.forEach((d) => {
          docMap[d.documentType] = docMap[d.documentType] || [];
          docMap[d.documentType].push(d);
        });

        teacher.documents = teacher.documents.map((doc) => {
          const candidates = docMap[doc.documentType];
          if (candidates && candidates.length > 0) {
            const matched = candidates.find((c) => c.originalFileName === doc.originalName) || candidates[0];
            return {
              ...doc,
              documentId: matched.documentId,
              storagePath: matched.storageKey,
            };
          }
          return doc;
        });
      } catch (err) {
        console.error("Failed to resolve legacy teacher documents:", err.message);
      }
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

    // 🔐 Email cannot be updated via this endpoint
    // Email changes must go through the centralized secure email-change flow
    if (updateData.email) {
      return res.status(400).json({
        message:
          "Email cannot be updated here. Use the secure email-change flow.",
        code: "EMAIL_CHANGE_NOT_ALLOWED",
      });
    }

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

    const storageService = getStorageProvider().getAdapter();
    const newDocuments = await processTeacherDocuments(req.files || {});
    let finalDocs = [...(existingTeacher.documents || [])];
    const documentRefs = [...(existingTeacher.documentRefs || [])];

    // Remove deleted documents and archive Document records
    for (const docType of removedDocs) {
      const doc = finalDocs.find(d => d.documentType === docType);
      if (doc) {
        // Delete file
        if (doc.storagePath) {
          await storageService.deleteFile(doc.storagePath).catch(() => {});
        }
        
        // Archive Document record
        if (doc.documentId) {
          await Document.findOneAndUpdate(
            { documentId: doc.documentId },
            { status: "ARCHIVED", archivedAt: new Date() }
          ).catch(() => {});
        }
        
        finalDocs = finalDocs.filter(d => d.documentType !== docType);
        documentRefs = documentRefs.filter(dr => dr.documentType !== docType);
      }
    }

    // Add or replace uploaded documents
    for (const doc of newDocuments) {
      const existingIdx = finalDocs.findIndex(d => d.documentType === doc.documentType);
      if (existingIdx >= 0) {
        const oldDoc = finalDocs[existingIdx];
        
        // Archive old Document record
        if (oldDoc.documentId) {
          await Document.findOneAndUpdate(
            { documentId: oldDoc.documentId },
            { status: "ARCHIVED", archivedAt: new Date() }
          ).catch(() => {});
        }
        
        // Delete old file
        if (oldDoc.storagePath) {
          await storageService.deleteFile(oldDoc.storagePath).catch(() => {});
        }
        
        finalDocs[existingIdx] = doc;
        
        // Update documentRefs
        if (doc.documentId) {
          const refIdx = documentRefs.findIndex(dr => dr.documentType === doc.documentType);
          if (refIdx >= 0) {
            documentRefs[refIdx] = { documentId: doc.documentId, documentType: doc.documentType };
          } else {
            documentRefs.push({ documentId: doc.documentId, documentType: doc.documentType });
          }
        }
      } else {
        finalDocs.push(doc);
        if (doc.documentId) {
          documentRefs.push({ documentId: doc.documentId, documentType: doc.documentType });
        }
      }
    }

    updateData.documents = finalDocs;
    updateData.documentRefs = documentRefs;

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
    const { filename } = req.params;
    const user = req.user;

    if (!user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    if (cleanFilename.startsWith(".")) {
      return next(new AppError("Invalid filename", 400, "INVALID_FILENAME"));
    }

    const docRecord = await Document.findOne({
      originalFileName: cleanFilename,
      ownerType: "Teacher",
      status: "ACTIVE",
    }).select("documentId ownerId storageKey originalFileName mimeType size");

    if (!docRecord) {
      return next(
        new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND"),
      );
    }

    const ownerTeacher = await Teacher.findById(docRecord.ownerId).select(
      "_id user_id college_id",
    );

    if (!ownerTeacher) {
      return next(
        new AppError("Document owner not found", 404, "DOCUMENT_NOT_FOUND"),
      );
    }

    const storagePath = docRecord.storageKey;
    const originalFileName = docRecord.originalFileName || cleanFilename;

    // Authorization check
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

    const hasAccess = await DocumentService._hasAccess(docRecord, user);
    if (!hasAccess) {
      return next(
        new AppError("Not authorized to access this document", 403, "UNAUTHORIZED"),
      );
    }

    const storageService = getStorageProvider().getAdapter();
    const fileData = await storageService.downloadFile(storagePath);

    const ext = path.extname(originalFileName).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      req.query.download === "true" ? "attachment" : "inline",
    );
    if (fileData.size) {
      res.setHeader("Content-Length", fileData.size);
    }

    const { pipeline } = require("stream");
    const stream = fileData.buffer;

    if (stream && typeof stream.pipe === "function") {
      pipeline(stream, res, (err) => {
        if (err) return next(err);
      });
    } else {
      res.send(stream);
    }
  } catch (error) {
    next(error);
  }
};
