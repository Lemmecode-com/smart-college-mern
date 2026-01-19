const Department = require("../models/department.model");

/**
 * CREATE Department
 */
exports.createDepartment = async (req, res) => {
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

  res.status(201).json(department);
};

/* get department by ID */
exports.getDepartmentById = async (req, res) => {
  const department = await Department.findOne({
    _id: req.params.id,
    college_id: req.college_id
  });

  if (!department) {
    return res.status(404).json({ message: "Department not found" });
  }

  res.json(department);
};

/**
 * READ Departments
 */
exports.getDepartments = async (req, res) => {
  const departments = await Department.find({
    college_id: req.college_id
  });

  res.json(departments);
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
    return res.status(404).json({ message: "Department not found" });
  }

  res.json(department);
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
    return res.status(404).json({ message: "Department not found" });
  }

  res.json({ message: "Department deleted successfully" });
};
