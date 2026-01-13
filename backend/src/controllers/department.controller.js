const Department = require("../models/department.model");
const College = require("../models/college.model");

/**
 * CREATE Department
 * Only Admin / CollegeAdmin
 * Department must belong to existing college
 */
exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        message: "Department name and code are required"
      });
    }

    // There should be one active college
    const college = await College.findOne({ status: "Active" });
    if (!college) {
      return res.status(400).json({
        message: "College must be created before departments"
      });
    }

    const department = await Department.create({
      name,
      code,
      collegeId: college._id
    });

    res.status(201).json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET All Departments (of current college)
 */
exports.getDepartments = async (req, res, next) => {
  try {
    const college = await College.findOne({ status: "Active" });
    if (!college) {
      return res.status(400).json({
        message: "College not configured"
      });
    }

    const departments = await Department.find({
      collegeId: college._id,
      status: "Active"
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: departments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET Department By ID
 */
exports.getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("collegeId", "name");

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE Department
 */
exports.updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * SOFT DELETE Department
 */
exports.deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { status: "Inactive" },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({
      success: true,
      message: "Department deactivated successfully"
    });
  } catch (err) {
    next(err);
  }
};
