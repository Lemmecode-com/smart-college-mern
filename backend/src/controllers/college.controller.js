const College = require("../models/college.model");
const AppError = require("../utils/AppError");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const FeeStructure = require("../models/feeStructure.model");
const User = require("../models/user.model");
const CollegeEmailConfig = require("../models/collegeEmailConfig.model");

/**
 * GET ALL COLLEGES (SUPER ADMIN ONLY)
 * For Security Audit filter dropdown
 */
exports.getAllColleges = async (req, res, next) => {
  try {
    const colleges = await College.find({})
      .select('name code email _id')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: colleges
    });
  } catch (error) {
    next(error);
  }
};

// COLLEGE ADMIN: View own college only
exports.getMyCollege = async (req, res, next) => {
  try {
    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }
    
    const college = await College.findById(req.college_id);
    
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }
    
    res.json(college);
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE COLLEGE PROFILE (ONLY COLLEGE ADMIN)
 */
exports.updateMyCollegeProfile = async (req, res) => {
  try {
    const collegeId = req.college_id;

    // Allowed fields (whitelist)
    const allowedUpdates = [
      "name",
      "code",
      "email",
      "contactNumber",
      "address",
      "establishedYear",
      "logo"
    ];

    const updates = {};

    // Pick only allowed fields from body (skip logo — it comes from multer upload)
    allowedUpdates.forEach((field) => {
      if (field === 'logo') return;
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.file) {
      updates.logo = '/uploads/college-logos/' + req.file.filename;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update"
      });
    }

    const college = await College.findByIdAndUpdate(
      collegeId,
      { $set: updates },
      { new: true }
    ).select("-__v");

    if (!college) {
      return res.status(404).json({
        message: "College not found"
      });
    }

    res.json({
      message: "College profile updated successfully",
      college
    });

  } catch (error) {
    console.error("Update college profile error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
};

/**
 * GET /api/college/setup-status
 * Returns which onboarding steps are actually complete
 */
exports.getSetupStatus = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    const [deptCount, courseCount, feeCount, staffCount, emailConfig] = await Promise.all([
      Department.countDocuments({ college_id: collegeId }),
      Course.countDocuments({ college_id: collegeId }),
      FeeStructure.countDocuments({ college_id: collegeId }),
      User.countDocuments({ college_id: collegeId, role: { $nin: ["SUPER_ADMIN", "STUDENT"] } }),
      CollegeEmailConfig.getActiveConfig(collegeId),
    ]);

    const college = await College.findById(collegeId).select("setupCompleted");

    res.json({
      success: true,
      data: {
        setupCompleted: college.setupCompleted || false,
        emailConfigured: !!emailConfig,
        departmentsCreated: deptCount,
        coursesCreated: courseCount,
        feeStructuresCreated: feeCount,
        staffAdded: staffCount,
        steps: {
          email: !!emailConfig,
          departments: deptCount > 0,
          courses: courseCount > 0,
          fees: feeCount > 0,
          staff: staffCount > 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};