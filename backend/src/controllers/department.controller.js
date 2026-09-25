const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const User = require("../models/user.model");
const Course = require("../models/course.model");
const Subject = require("../models/subject.model");
const ApiResponse = require("../utils/ApiResponse");
const AppError = require("../utils/AppError");
const AuditService = require("../services/auditLog.service");
const { reassignTeacherResources } = require("../services/teacherReassignment.service");

/**
 * CREATE Department
 */
exports.createDepartment = async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      status,
      programsOffered,
      startYear,
      sanctionedFacultyCount,
      sanctionedStudentIntake
    } = req.body;

    const department = await Department.create({
      college_id: req.college_id,
      name,
      code,
      type,
      status,
      programsOffered,
      startYear,
      sanctionedFacultyCount,
      sanctionedStudentIntake,
      createdBy: req.user.id
    });

    AuditService.logDepartmentCreated(req.user, department, req).catch((err) =>
      console.error("Audit log failed:", err.message)
    );

    ApiResponse.created(res, { department }, "Department created successfully");
  } catch (error) {
    throw error;
  }
};

/* get department by ID */
exports.getDepartmentById = async (req, res) => {
  const department = await Department.findOne({
    _id: req.params.id
  }).populate('hod_id', 'name email');

  if (!department) {
    return ApiResponse.error(res, "Department not found", "DEPARTMENT_NOT_FOUND", 404);
  }

  if (department.college_id.toString() !== req.college_id.toString()) {
    return ApiResponse.error(res, "Access denied. You do not have permission to view this department.", "ACCESS_DENIED", 403);
  }

  ApiResponse.success(res, { department }, "Department fetched successfully");
};

/**
 * READ Departments
 */
exports.getDepartments = async (req, res) => {
  const departments = await Department.find({
    college_id: req.college_id
  }).populate('hod_id', 'name email');

  ApiResponse.success(res, { departments }, "Departments fetched successfully");
};

/**
 * UPDATE Department
 */
exports.updateDepartment = async (req, res) => {
  const existingDepartment = await Department.findOne({
    _id: req.params.id,
    college_id: req.college_id
  });

  if (!existingDepartment) {
    return ApiResponse.error(res, "Department not found", "DEPARTMENT_NOT_FOUND", 404);
  }

  const oldValues = {
    name: existingDepartment.name,
    code: existingDepartment.code,
    type: existingDepartment.type,
    status: existingDepartment.status,
    programsOffered: existingDepartment.programsOffered,
    sanctionedFacultyCount: existingDepartment.sanctionedFacultyCount,
    sanctionedStudentIntake: existingDepartment.sanctionedStudentIntake,
    hodId: existingDepartment.hod_id || null,
  };

  const department = await Department.findOneAndUpdate(
    {
      _id: req.params.id,
      college_id: req.college_id
    },
    req.body,
    { new: true }
  );

  if (!department) {
    return ApiResponse.error(res, "Department not found", "DEPARTMENT_NOT_FOUND", 404);
  }

  const newValues = {
    name: department.name,
    code: department.code,
    type: department.type,
    status: department.status,
    programsOffered: department.programsOffered,
    sanctionedFacultyCount: department.sanctionedFacultyCount,
    sanctionedStudentIntake: department.sanctionedStudentIntake,
    hodId: department.hod_id || null,
  };

  AuditService.logDepartmentUpdated(req.user, department._id, department.name, oldValues, newValues, req).catch((err) =>
    console.error("Audit log failed:", err.message)
  );

  ApiResponse.success(res, { department }, "Department updated successfully");
};

/**
 * DELETE Department
 */
exports.deleteDepartment = async (req, res) => {
  const department = await Department.findOne({
    _id: req.params.id,
    college_id: req.college_id
  });

  if (!department) {
    return ApiResponse.error(res, "Department not found", "DEPARTMENT_NOT_FOUND", 404);
  }

  const departmentDataForAudit = {
    _id: department._id,
    name: department.name,
    code: department.code,
    type: department.type,
    hod_id: department.hod_id || null,
    createdAt: department.createdAt,
  };

  await Department.findOneAndDelete({
    _id: req.params.id,
    college_id: req.college_id
  });

  AuditService.logDepartmentDeleted(req.user, departmentDataForAudit, req).catch((err) =>
    console.error("Audit log failed:", err.message)
  );

  ApiResponse.success(res, null, "Department deleted successfully");
};

/**
 * ASSIGN HOD TO DEPARTMENT
 */
exports.assignHOD = async (req, res) => {
  try {
    const { teacher_id } = req.body;

    // Check department
    const department = await Department.findOne({
      _id: req.params.id,
      college_id: req.college_id
    });

    if (!department) {
      return ApiResponse.error(res, "Department not found", "DEPARTMENT_NOT_FOUND", 404);
    }

    // Check teacher
    const teacher = await Teacher.findOne({
      _id: teacher_id,
      college_id: req.college_id,
      department_id: department._id
    });

    if (!teacher) {
      return ApiResponse.error(res, "Teacher must belong to the same department", "INVALID_TEACHER_DEPARTMENT", 400);
    }

    // Step 0: Check if teacher is already HOD of another department (uniqueness validation)
    const existingHodAssignment = await Department.findOne({
      college_id: req.college_id,
      hod_id: teacher_id,
      _id: { $ne: department._id } // Exclude current department
    });

    if (existingHodAssignment) {
      return ApiResponse.error(
        res,
        "This teacher is already assigned as HOD of another department",
        "TEACHER_ALREADY_HOD",
        400
      );
    }

    // Step 1: If department already has an HOD, rollback their role to TEACHER
    let previousHodId = null;
    let previousUserRole = null;
    let previousHodTeacherForNormalization = null;

    if (department.hod_id) {
      const previousHodTeacher = await Teacher.findOne({
        _id: department.hod_id,
        college_id: req.college_id
      });

      if (previousHodTeacher) {
        const previousHodUser = await User.findById(previousHodTeacher.user_id);
        if (previousHodUser && previousHodUser.role === "HOD") {
          previousHodUser.role = "TEACHER";
          await previousHodUser.save();
        }
        previousHodId = previousHodTeacher._id;
        previousUserRole = "TEACHER";
        previousHodTeacherForNormalization = previousHodTeacher;
      }
    }

    // Normalize Teacher profile for demoted HOD (assignHOD scenario)
    if (previousHodTeacherForNormalization) {
      let prevTeacherNeedsUpdate = false;
      const prevUpdateFields = {};

      if (!previousHodTeacherForNormalization.status || previousHodTeacherForNormalization.status !== "ACTIVE") {
        prevUpdateFields.status = "ACTIVE";
        prevTeacherNeedsUpdate = true;
      }

      if (!previousHodTeacherForNormalization.department_id) {
        prevUpdateFields.department_id = department._id;
        prevTeacherNeedsUpdate = true;
      }

      if (!Array.isArray(previousHodTeacherForNormalization.courses) || previousHodTeacherForNormalization.courses.length === 0) {
        const departmentCourses = await Course.find({
          department_id: department._id,
          college_id: req.college_id,
          status: "ACTIVE",
        }).select("_id");

        prevUpdateFields.courses = departmentCourses.map((c) => c._id);
        prevTeacherNeedsUpdate = true;
      }

      if (previousHodTeacherForNormalization.designation !== "") {
        prevUpdateFields.designation = "";
        prevTeacherNeedsUpdate = true;
      }

      if (prevTeacherNeedsUpdate) {
        await Teacher.findByIdAndUpdate(previousHodTeacherForNormalization._id, prevUpdateFields);
      }
    }

    // Step 2: Assign new HOD to department
    department.hod_id = teacher._id;
    await department.save();

    // Step 3: Update new teacher's user role to HOD
    const newUser = await User.findById(teacher.user_id);
    if (newUser) {
      newUser.role = "HOD";
      await newUser.save();
    }

    AuditService.logHODAssigned(
      req.user,
      department._id,
      department.name,
      teacher._id,
      teacher.name,
      previousHodId,
      previousUserRole,
      teacher._id,
      req
    ).catch((err) => console.error("Audit log failed:", err.message));

    ApiResponse.success(res, { department }, "HOD assigned successfully");
  } catch (error) {
    throw error;
  }
};

/**
 * REMOVE HOD FROM DEPARTMENT
 */
exports.removeHOD = async (req, res) => {
  try {
    // Check department exists
    const department = await Department.findOne({
      _id: req.params.id,
      college_id: req.college_id
    });

    if (!department) {
      return ApiResponse.error(res, "Department not found", "DEPARTMENT_NOT_FOUND", 404);
    }

    // Check if department has an HOD assigned
    if (!department.hod_id) {
      return ApiResponse.error(res, "This department has no HOD assigned", "NO_HOD_ASSIGNED", 400);
    }

    // Save old HOD info for audit
    const oldHodId = department.hod_id;
    const oldHodTeacher = await Teacher.findOne({
      _id: oldHodId,
      college_id: req.college_id
    }).select("user_id name");

    let oldHodUserId = null;
    let oldHodName = null;

    if (oldHodTeacher) {
      oldHodUserId = oldHodTeacher.user_id;
      oldHodName = oldHodTeacher.name;
    }

    // 🛑 SAFETY GUARD: Block HOD removal while the HOD still has ACTIVE subjects.
    // Subjects must be explicitly reassigned by the admin using the existing
    // teacher reassignment workflow BEFORE the HOD can be removed.
    if (oldHodTeacher) {
      const activeSubjectCount = await Subject.countDocuments({
        teacher_id: oldHodTeacher._id,
        college_id: req.college_id,
        status: "ACTIVE",
      });

      if (activeSubjectCount > 0) {
        return ApiResponse.error(
          res,
          "This HOD cannot be removed because active subjects are still assigned. Reassign the subjects first.",
          "SUBJECTS_STILL_ASSIGNED",
          400,
          { subjectCount: activeSubjectCount }
        );
      }
    }

    // Remove HOD from department
    department.hod_id = null;
    await department.save();

    // Update User.role from HOD to TEACHER
    if (oldHodUserId) {
      const oldHodUser = await User.findById(oldHodUserId);
      if (oldHodUser && oldHodUser.role === "HOD") {
        oldHodUser.role = "TEACHER";
        await oldHodUser.save();
      }
    }

    // Normalize Teacher profile for converted HOD
    if (oldHodTeacher) {
      let teacherNeedsUpdate = false;
      const updateFields = {};

      if (!oldHodTeacher.status || oldHodTeacher.status !== "ACTIVE") {
        updateFields.status = "ACTIVE";
        teacherNeedsUpdate = true;
      }

      if (oldHodTeacher.designation !== "") {
        updateFields.designation = "";
        teacherNeedsUpdate = true;
      }

      if (!oldHodTeacher.department_id) {
        updateFields.department_id = department._id;
        teacherNeedsUpdate = true;
      }

      if (!Array.isArray(oldHodTeacher.courses) || oldHodTeacher.courses.length === 0) {
        const departmentCourses = await Course.find({
          department_id: department._id,
          college_id: req.college_id,
          status: "ACTIVE",
        }).select("_id");

        updateFields.courses = departmentCourses.map((c) => c._id);
        teacherNeedsUpdate = true;
      }

      if (teacherNeedsUpdate) {
        await Teacher.findByIdAndUpdate(oldHodTeacher._id, updateFields);
      }
    }

    // Log audit
    AuditService.logHODRemoved(
      req.user,
      department._id,
      department.name,
      oldHodId,
      oldHodName,
      req
    ).catch((err) => console.error("Audit log failed:", err.message));

    ApiResponse.success(res, {
      success: true,
      department: {
        _id: department._id,
        hod_id: null
      }
    }, "HOD removed successfully");
  } catch (error) {
    throw error;
  }
};

/**
 * REASSIGN HOD SUBJECTS (without removing HOD or deactivating teacher)
 *
 * PUT /departments/:id/hod/reassign-subjects
 *
 * Body: { defaultTeacherId, subjectToTeacherMap: { subjectId: teacherId } }
 *
 * This endpoint:
 * - Reassigns all ACTIVE subjects from the current HOD to other teachers
 * - Does NOT remove the HOD from the department
 * - Does NOT deactivate the teacher or user account
 * - Does NOT change Department.hod_id
 * - Does NOT change User.role
 */
exports.reassignHODSubjects = async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const { defaultTeacherId, subjectToTeacherMap = {} } = req.body;

    if (!defaultTeacherId) {
      return ApiResponse.error(
        res,
        "defaultTeacherId is required for reassignment",
        "DEFAULT_TEACHER_REQUIRED",
        400
      );
    }

    // Resolve department (tenant isolated)
    const department = await Department.findOne({
      _id: departmentId,
      college_id: req.college_id,
    });

    if (!department) {
      return ApiResponse.error(
        res,
        "Department not found",
        "DEPARTMENT_NOT_FOUND",
        404
      );
    }

    // Verify department has an HOD
    if (!department.hod_id) {
      return ApiResponse.error(
        res,
        "This department has no HOD assigned",
        "NO_HOD_ASSIGNED",
        400
      );
    }

    const sourceTeacherId = department.hod_id;

    // Verify source teacher exists and belongs to this department/college
    const sourceTeacher = await Teacher.findOne({
      _id: sourceTeacherId,
      college_id: req.college_id,
      department_id: department._id,
    });

    if (!sourceTeacher) {
      return ApiResponse.error(
        res,
        "Source teacher (current HOD) not found or does not belong to this department",
        "SOURCE_TEACHER_INVALID",
        404
      );
    }

    // Verify default target teacher exists and is ACTIVE
    const defaultTeacher = await Teacher.findOne({
      _id: defaultTeacherId,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (!defaultTeacher) {
      return ApiResponse.error(
        res,
        "Default target teacher not found or is inactive",
        "DEFAULT_TEACHER_INVALID",
        404
      );
    }

    // Target teacher must belong to the same department
    if (String(defaultTeacher.department_id) !== String(department._id)) {
      return ApiResponse.error(
        res,
        "Target teacher must belong to the same department",
        "TARGET_TEACHER_DEPARTMENT_MISMATCH",
        400
      );
    }

    // Source teacher cannot be the target
    if (String(defaultTeacherId) === String(sourceTeacherId)) {
      return ApiResponse.error(
        res,
        "Cannot reassign resources to the same teacher",
        "CANNOT_REASSIGN_TO_SAME_TEACHER",
        400
      );
    }

    // Validate subject mappings
    const subjectMap = new Map(Object.entries(subjectToTeacherMap));

    // Get all ACTIVE subjects currently assigned to the HOD
    const activeSubjects = await Subject.find({
      teacher_id: sourceTeacherId,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (activeSubjects.length === 0) {
      return ApiResponse.error(
        res,
        "Current HOD has no ACTIVE subjects to reassign",
        "NO_SUBJECTS_TO_REASSIGN",
        400
      );
    }

    // Validate each subject in the map belongs to the HOD
    for (const [subjectId, targetTeacherId] of subjectMap.entries()) {
      const subject = await Subject.findOne({
        _id: subjectId,
        college_id: req.college_id,
        teacher_id: sourceTeacherId,
        status: "ACTIVE",
      });

      if (!subject) {
        return ApiResponse.error(
          res,
          `Subject ${subjectId} is not assigned to the current HOD or is not ACTIVE`,
          "INVALID_SUBJECT_ID",
          400
        );
      }

      // Validate target teacher for this subject
      const targetTeacher = await Teacher.findOne({
        _id: targetTeacherId,
        college_id: req.college_id,
        status: "ACTIVE",
      });

      if (!targetTeacher) {
        return ApiResponse.error(
          res,
          `Target teacher for subject "${subject.name}" not found or inactive`,
          "TARGET_TEACHER_INVALID",
          404
        );
      }

      // Target must be in the same department
      if (String(targetTeacher.department_id) !== String(department._id)) {
        return ApiResponse.error(
          res,
          `Target teacher for subject "${subject.name}" must belong to the same department`,
          "TARGET_TEACHER_DEPARTMENT_MISMATCH",
          400
        );
      }

      // Target cannot be the source teacher
      if (String(targetTeacherId) === String(sourceTeacherId)) {
        return ApiResponse.error(
          res,
          `Cannot reassign subject "${subject.name}" to the same teacher`,
          "CANNOT_REASSIGN_TO_SAME_TEACHER",
          400
        );
      }
    }

    // Perform the reassignment using existing service
    const reassignmentResult = await reassignTeacherResources(
      sourceTeacherId,
      req.college_id,
      subjectMap,
      defaultTeacherId
    );

    // Audit log
    AuditService.logAudit({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "REASSIGN_HOD_SUBJECTS",
      resourceType: "HODSubjectReassignment",
      resourceId: department._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        departmentId: department._id,
        departmentName: department.name,
        sourceTeacherId,
        sourceTeacherName: sourceTeacher.name,
        defaultTeacherId,
        defaultTeacherName: defaultTeacher.name,
        reassignedSubjects: reassignmentResult.reassignedSubjects,
        reassignedSlots: reassignmentResult.reassignedSlots,
        reassignedSessions: reassignmentResult.reassignedSessions,
      },
    }).catch((err) => console.error("Audit log failed:", err.message));

    ApiResponse.success(res, {
      department: {
        _id: department._id,
        hod_id: department.hod_id, // unchanged
      },
      sourceTeacher: {
        _id: sourceTeacher._id,
        name: sourceTeacher.name,
        status: sourceTeacher.status, // still ACTIVE
      },
      reassignment: reassignmentResult,
    }, "HOD subjects reassigned successfully");
  } catch (error) {
    if (error instanceof AppError) {
      return ApiResponse.error(
        res,
        error.message,
        error.code,
        error.statusCode,
        error.data
      );
    }
    throw error;
  }
};