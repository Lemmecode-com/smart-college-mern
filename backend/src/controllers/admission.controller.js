const Student = require("../models/student.model");
const AppError = require("../utils/AppError");

/**
 * GET /api/admission/dashboard
 * Dashboard summary for Admission Officer
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const collegeId = req.user.college_id;

    if (!collegeId) {
      return next(new AppError("College ID not found in user profile", 403, "COLLEGE_ID_MISSING"));
    }

    // Count pending applications
    const pendingCount = await Student.countDocuments({
      college_id: collegeId,
      status: "PENDING",
    });

    // Get recent pending applications (last 5)
    const recentApplications = await Student.find({
      college_id: collegeId,
      status: "PENDING",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName email status createdAt applicationNo"); // adjust fields based on Student schema

    res.json({
      success: true,
      data: {
        pendingCount,
        recentApplications,
      },
    });
  } catch (error) {
    next(error);
  }
};
