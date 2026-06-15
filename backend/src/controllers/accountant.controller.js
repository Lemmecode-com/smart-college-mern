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

    const overdueCount = await StudentFee.countDocuments({
      college_id: collegeId,
      "installments.status": "PENDING",
      "installments.dueDate": { $lt: new Date() },
    });

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

    const defaultersList = await StudentFee.aggregate([
      { $match: { college_id: collegeId, "installments.status": "PENDING", "installments.dueDate": { $lt: new Date() } } },
      { $unwind: "$installments" },
      { $match: { "installments.status": "PENDING", "installments.dueDate": { $lt: new Date() } } },
      {
        $group: {
          _id: null,
          totalDefaulters: { $addToSet: "$student_id" },
          totalPendingFromDefaulters: { $sum: "$installments.amount" },
        },
      },
    ]);

    const totalDefaultersCount = defaultersList[0]?.totalDefaulters?.length || 0;
    const pendingFromDefaulters = defaultersList[0]?.totalPendingFromDefaulters || 0;

    const totalStudents = await StudentFee.countDocuments({ college_id: collegeId });

    const criticalOverdueCount = await StudentFee.countDocuments({
      college_id: collegeId,
      "installments.status": "PENDING",
      "installments.dueDate": { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      "installments.escalationLevel": { $in: ["SEVERELY_OVERDUE", "CRITICALLY_OVERDUE"] },
    });

    const recentOfflinePayments = await StudentFee.aggregate([
      { $match: { college_id: collegeId } },
      { $unwind: "$installments" },
      {
        $match: {
          "installments.status": "PAID",
          "installments.paymentGateway": "OFFLINE",
          "installments.paidAt": { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      },
      { $sort: { "installments.paidAt": -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "students",
          localField: "student_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $project: {
          _id: 0,
          studentName: "$student.fullName",
          amount: "$installments.amount",
          paymentMode: "$installments.paymentMode",
          paidAt: "$installments.paidAt",
        },
      },
    ]);

    const report = await StudentFee.find({ college_id: collegeId })
      .populate("student_id", "fullName email")
      .populate("course_id", "name")
      .lean();

    const reportFormatted = report.map((fee) => ({
      student: {
        _id: fee.student_id?._id,
        fullName: fee.student_id?.fullName,
        email: fee.student_id?.email,
      },
      course: {
        _id: fee.course_id?._id,
        name: fee.course_id?.name,
      },
      totalFee: fee.totalFee,
      paidAmount: fee.paidAmount,
      pendingAmount: fee.totalFee - fee.paidAmount,
      installments: fee.installments,
    }));

    res.json({
      success: true,
      totalCollected,
      totalStudents: report.length,
      report: reportFormatted,
      pendingAmount,
      overdueInstallments: overdueCount,
      recentWeekPayments: recentCount,
      totalDefaulters: totalDefaultersCount,
      criticalOverdueCount,
      pendingAmountFromDefaulters: pendingFromDefaulters,
      recentOfflinePayments,
    });
  } catch (error) {
    next(error);
  }
};
