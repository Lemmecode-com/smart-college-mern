const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const User = require("../models/user.model");
const ApiResponse = require("../utils/ApiResponse");
const AuditService = require("../services/auditLog.service");

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
    _id: req.params.id,
    college_id: req.college_id
  });

  if (!department) {
    return ApiResponse.error(res, "Department not found", "DEPARTMENT_NOT_FOUND", 404);
  }

  ApiResponse.success(res, { department }, "Department fetched successfully");
};

/**
 * READ Departments
 */
exports.getDepartments = async (req, res) => {
  const departments = await Department.find({
    college_id: req.college_id
  });

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
