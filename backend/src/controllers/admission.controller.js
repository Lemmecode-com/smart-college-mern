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

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Count pending applications
    const pendingCount = await Student.countDocuments({
      college_id: collegeId,
      status: "PENDING",
    });

    // Count approvals this week
    const approvalsThisWeek = await Student.countDocuments({
      college_id: collegeId,
      status: "APPROVED",
      approvedAt: { $gte: sevenDaysAgo }
    });

    // Count rejections this week
    const rejectionsThisWeek = await Student.countDocuments({
      college_id: collegeId,
      status: "REJECTED",
      rejectedAt: { $gte: sevenDaysAgo }
    });

    // Get recent pending applications (last 5)
    const recentApplications = await Student.find({
      college_id: collegeId,
      status: "PENDING",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("fullName email createdAt");

    res.json({
      success: true,
      data: {
        pendingCount,
        approvalsThisWeek,
        rejectionsThisWeek,
        recentApplications,
      },
    });
  } catch (error) {
    next(error);
  }
};