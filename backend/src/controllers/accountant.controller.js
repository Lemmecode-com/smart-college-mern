const StudentFee = require("../models/studentFee.model");
const User = require("../models/user.model");
const AppError = require("../utils/AppError");

/**
 * GET /api/accountant/dashboard
 * Dashboard summary for Accountant
 */
exports.getDashboard = async (req, res, next) => {
  try {
    let collegeId = req.user.college_id;

    // Fallback: if college_id missing in JWT, fetch from User collection
    if (!collegeId) {
      const user = await User.findById(req.user.id).select("college_id");
      if (!user || !user.college_id) {
        return next(new AppError("College not assigned to accountant. Please contact admin.", 403, "COLLEGE_ID_MISSING"));
      }
      collegeId = user.college_id;
    }

    if (!collegeId) {
      return next(new AppError("College ID not found in user profile", 403, "COLLEGE_ID_MISSING"));
    }

    // Total fees (sum of totalFee for all student fees in college)
    const totalFeesAggregate = await StudentFee.aggregate([
      { $match: { college_id: collegeId } },
      {
        $group: {
          _id: null,
          totalFees: { $sum: "$totalFee" },
          totalPaid: { $sum: "$paidAmount" },
        },
      },
    ]);

    const totalFees = totalFeesAggregate[0]?.totalFees || 0;
    const totalCollected = totalFeesAggregate[0]?.totalPaid || 0;
    const pendingAmount = totalFees - totalCollected;

    // Overdue installments count
    const overdueCount = await StudentFee.countDocuments({
      college_id: collegeId,
      "installments.status": "PENDING",
      "installments.dueDate": { $lt: new Date() },
    });

    // Recently collected payments (last 7 days)
    const recentPayments = await StudentFee.aggregate([
      { $match: { college_id: collegeId } },
      { $unwind: "$installments" },
      {
        $match: {
          "installments.status": "PAID",
          "installments.paidAt": { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: "$installments.amount" },
        },
      },
    ]);

    const recentCount = recentPayments[0]?.count || 0;
    const recentTotal = recentPayments[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalFees,
        totalCollected,
        pendingAmount,
        overdueInstallments: overdueCount,
        recentWeekPayments: recentCount,
        recentWeekAmount: recentTotal,
      },
    });
  } catch (error) {
    next(error);
  }
};
