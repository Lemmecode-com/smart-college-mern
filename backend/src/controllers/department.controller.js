const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const ApiResponse = require("../utils/ApiResponse");

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

  ApiResponse.success(res, { department }, "Department updated successfully");
};

/**
 * DELETE Department
 */
exports.deleteDepartment = async (req, res) => {
  const department = await Department.findOneAndDelete({
    _id: req.params.id,
    college_id: req.college_id
  });

  if (!department) {
    return ApiResponse.error(res, "Department not found", "DEPARTMENT_NOT_FOUND", 404);
  }

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

    department.hod_id = teacher._id;
    await department.save();

    ApiResponse.success(res, { department }, "HOD assigned successfully");
  } catch (error) {
    throw error;
  }
};
