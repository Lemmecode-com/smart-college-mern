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

    // Capture previous HOD state before mutation
    const previousHodId = department.hod_id;
    const previousUser = await User.findById(teacher.user_id);
    const previousUserRole = previousUser ? previousUser.role : null;

    // Assign HOD to department
    department.hod_id = teacher._id;
    await department.save();

    // Also update the teacher's user role to HOD
    if (previousUser) {
      previousUser.role = "HOD";
      await previousUser.save();
    }

    AuditService.logHODAssigned(
      req.user,
      department._id,
      department.name,
      teacher._id,
      teacher.name,
      previousHodId || null,
      previousUserRole,
      teacher._id,
      req
    ).catch((err) => console.error("Audit log failed:", err.message));

    ApiResponse.success(res, { department }, "HOD assigned successfully");
  } catch (error) {
    throw error;
  }
};
