const StudentFee = require("../models/studentFee.model");
const User = require("../models/user.model");
const AppError = require("../utils/AppError");
const { selectAuthoritativeFee } = require("../services/studentFee.service");

/**
 * GET /api/accountant/dashboard
 * Dashboard summary for Accountant
 */
exports.getDashboard = async (req, res, next) => {
  try {
    let collegeId = req.user?.college_id || req.college_id;

    if (!collegeId && req.user?.id) {
      const user = await User.findById(req.user.id).select("college_id");
      if (!user || !user.college_id) {
        return next(new AppError("College not assigned to accountant. Please contact admin.", 403, "COLLEGE_ID_MISSING"));
      }
      collegeId = user.college_id;
    }

    if (!collegeId) {
      return next(new AppError("College ID not found in user profile", 403, "COLLEGE_ID_MISSING"));
    }

    // 1. Fetch all StudentFees for the college and group by student to select authoritative fee
    const allFees = await StudentFee.find({ college_id: collegeId })
      .populate("student_id", "fullName email")
      .populate("course_id", "name")
      .lean();

    const feesByStudent = new Map();
    for (const fee of allFees) {
      if (!fee.student_id) continue;
      const sId = fee.student_id._id ? String(fee.student_id._id) : String(fee.student_id);
      if (!feesByStudent.has(sId)) {
        feesByStudent.set(sId, []);
      }
      feesByStudent.get(sId).push(fee);
    }

    const authoritativeFees = [];
    for (const studentFees of feesByStudent.values()) {
      const authFee = selectAuthoritativeFee(studentFees);
      if (authFee) authoritativeFees.push(authFee);
    }

    // 2. Compute financial stats strictly per student from authoritative fees
    let totalFees = 0;
    let totalCollected = 0;
    let overdueCount = 0;
    let criticalOverdueCount = 0;
    const defaulterStudentIds = new Set();
    let pendingFromDefaulters = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const fee of authoritativeFees) {
      const tFee = Number(fee.totalFee) || 0;
      const pFee = Number(fee.paidAmount) || 0;
      totalFees += tFee;
      totalCollected += pFee;

      let studentIsDefaulter = false;
      for (const inst of fee.installments || []) {
        if (inst.status === "PENDING" && inst.dueDate && new Date(inst.dueDate) < now) {
          overdueCount++;
          studentIsDefaulter = true;
          pendingFromDefaulters += (Number(inst.amount) || 0);
          if (
            new Date(inst.dueDate) < thirtyDaysAgo ||
            ["SEVERELY_OVERDUE", "CRITICALLY_OVERDUE"].includes(inst.escalationLevel)
          ) {
            criticalOverdueCount++;
          }
        }
      }
      if (studentIsDefaulter && fee.student_id) {
        defaulterStudentIds.add(String(fee.student_id._id || fee.student_id));
      }
    }

    const totalStudents = feesByStudent.size;
    const pendingAmount = Math.max(0, totalFees - totalCollected);
    const totalDefaultersCount = defaulterStudentIds.size;

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

    const reportFormatted = authoritativeFees.map((fee) => ({
      student: {
        _id: fee.student_id?._id,
        fullName: fee.student_id?.fullName,
        email: fee.student_id?.email,
      },
      course: {
        _id: fee.course_id?._id,
        name: fee.course_id?.name,
      },
      totalFee: Number(fee.totalFee) || 0,
      paidAmount: Number(fee.paidAmount) || 0,
      pendingAmount: Math.max(0, (Number(fee.totalFee) || 0) - (Number(fee.paidAmount) || 0)),
      installments: fee.installments || [],
    }));

    res.json({
      success: true,
      totalFees,
      totalCollected,
      totalStudents: reportFormatted.length,
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
