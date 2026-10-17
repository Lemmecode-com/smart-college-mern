const mongoose = require("mongoose");
const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const College = require("../models/college.model");
const PromotionHistory = require("../models/promotionHistory.model");
const logger = require("../utils/logger");
const AppError = require("../utils/AppError");

/* =====================================================
   REPORTING CONSOLIDATION HELPERS
   ===================================================== */

/**
 * Derive a consolidated payment status from total fee and paid amount.
 * PAID = fully paid, DUE = nothing paid, PARTIAL = some paid.
 */
function deriveStatus(totalFee, paidAmount) {
  if (totalFee === 0) return "N/A";
  if (paidAmount >= totalFee) return "PAID";
  if (paidAmount === 0) return "DUE";
  return "PARTIAL";
}

/**
 * Build a map from StudentFee._id (string) to PromotionHistory info.
 * A StudentFee linked through PromotionHistory uses its toSemester/toAcademicYear
 * to identify the semester it belongs to.
 * A StudentFee with no PromotionHistory link is the initial/enrollment fee.
 */
async function getSemesterMap(collegeId, feeIds) {
  const validIds = feeIds.filter(
    (id) => id && mongoose.Types.ObjectId.isValid(id.toString()),
  );
  if (validIds.length === 0) return new Map();

  const query = { newStudentFeeId: { $in: validIds } };
  if (collegeId) {
    query.college_id = collegeId;
  }

  const promotions = await PromotionHistory.find(query).select(
    "newStudentFeeId fromSemester toSemester fromAcademicYear toAcademicYear",
  );

  const map = new Map();
  for (const promo of promotions) {
    if (promo.newStudentFeeId) {
      map.set(promo.newStudentFeeId.toString(), promo);
    }
  }
  return map;
}

/**
 * Build a fee record object from a StudentFee document.
 * Preserves all installment _id values and semester info from PromotionHistory.
 */
function buildFeeRecord(fee, semesterMap) {
  const feeId = fee._id ? fee._id.toString() : null;
  const promo = feeId ? semesterMap.get(feeId) : null;

  const totalFee = Number(fee.totalFee) || 0;
  const paidAmount = Number(fee.paidAmount) || 0;
  const pendingAmount = totalFee - paidAmount;

  let semester = null;
  let academicYear = null;
  let feeType = "enrollment";

  if (promo) {
    semester = promo.toSemester;
    academicYear = promo.toAcademicYear;
    feeType = "semester";
  }

  return {
    _id: fee._id,
    totalFee,
    paidAmount,
    pendingAmount,
    status: deriveStatus(totalFee, paidAmount),
    semester,
    academicYear,
    feeType,
    installments: Array.isArray(fee.installments) ? fee.installments : [],
  };
}

/**
 * Filter installments by date range. Returns installments whose paidAt
 * falls within [startDate, endDate] (inclusive of full end day).
 */
function filterInstallmentsByDate(installments, startDate, endDate, endDateTime) {
  if (!startDate && !endDate) return installments || [];
  return (installments || []).filter((inst) => {
    if (!inst.paidAt) return false;
    const paidDate = new Date(inst.paidAt);
    if (startDate && paidDate < new Date(startDate)) return false;
    if (endDate && endDateTime && paidDate > endDateTime) return false;
    return true;
  });
}

/**
 * Group StudentFee documents by student_id and build consolidated student records.
 * Used by studentPaymentStatus and studentPaymentStatusAll.
 *
 * The primary report row uses ONLY the CURRENT applicable StudentFee
 * (identified via PromotionHistory for promoted students, or the initial
 * enrollment fee for unpromoted students). Historical semester fees are
 * preserved in feeRecords for detail expansion.
 */
async function consolidateStudentFees(fees, collegeId, options) {
  const { startDate, endDate, endDateTime } = options || {};
  const hasDateFilter = startDate || endDate;

  const semesterMap = await getSemesterMap(collegeId, fees.map((f) => f._id));

  // ── Build a map of fee _id → promotion info for current-semester detection ──
  // Also collect all fee _ids linked to promotions (historical semester fees).
  const feeIdToPromo = new Map();
  const promotedFeeIds = new Set();
  for (const [feeId, promo] of semesterMap) {
    feeIdToPromo.set(feeId, promo);
    promotedFeeIds.add(feeId);
  }

  const grouped = new Map();
  for (const fee of fees) {
    if (!fee.student_id || !fee.course_id) continue;
    const key = fee.student_id._id
      ? fee.student_id._id.toString()
      : String(fee.student_id);
    if (!grouped.has(key)) {
      grouped.set(key, {
        student: fee.student_id,
        course: fee.course_id,
        fees: [],
      });
    }
    grouped.get(key).fees.push(fee);
  }

  const results = [];
  for (const group of grouped.values()) {
    // ── Identify the CURRENT applicable StudentFee ──────────────────────────
    const student = group.student;
    const studentIdStr = student._id
      ? student._id.toString()
      : String(student._id);

    let currentFee = null;

    // Case A: Student has been promoted — find the fee linked to the current semester.
    if (student.currentSemester !== undefined && student.currentSemester !== null) {
      for (const fee of group.fees) {
        const feeIdStr = fee._id ? fee._id.toString() : null;
        const promo = feeIdStr ? feeIdToPromo.get(feeIdStr) : null;
        if (
          promo &&
          promo.toSemester === student.currentSemester &&
          promo.toAcademicYear === student.currentYear
        ) {
          currentFee = fee;
          break;
        }
      }
    }

    // Case B: Student has NOT been promoted — use the initial enrollment fee
    // (the StudentFee that is NOT linked to any PromotionHistory).
    if (!currentFee) {
      for (const fee of group.fees) {
        const feeIdStr = fee._id ? fee._id.toString() : null;
        if (feeIdStr && promotedFeeIds.has(feeIdStr)) {
          // This fee is linked to a promotion → historical semester fee, skip.
          continue;
        }
        // First non-promoted fee is the initial enrollment fee.
        currentFee = fee;
        break;
      }
    }

    // Fallback: if no current fee identified, use the first fee in the group.
    if (!currentFee && group.fees.length > 0) {
      currentFee = group.fees[0];
    }

    // ── Primary row uses ONLY the current applicable StudentFee ─────────────
    const totalFee = currentFee
      ? Number(currentFee.totalFee) || 0
      : 0;
    const paidAmount = currentFee
      ? Number(currentFee.paidAmount) || 0
      : 0;
    const pendingAmount = totalFee - paidAmount;

    const feeRecords = group.fees.map((f) => {
      const record = buildFeeRecord(f, semesterMap);
      if (hasDateFilter) {
        record.installments = filterInstallmentsByDate(
          f.installments,
          startDate,
          endDate,
          endDateTime,
        );
      }
      return record;
    });

    const allInstallments = group.fees.reduce((acc, f) => {
      const insts = hasDateFilter
        ? filterInstallmentsByDate(
            f.installments,
            startDate,
            endDate,
            endDateTime,
          )
        : f.installments || [];
      return acc.concat(insts);
    }, []);

    results.push({
      _id: group.student._id,
      studentId: group.student._id,
      student: group.student,
      course: group.course,
      totalFee,
      paidAmount,
      pendingAmount,
      status: deriveStatus(totalFee, paidAmount),
      feeRecords,
      installments: allInstallments,
    });
  }

  return results;
}

// Export helpers for reuse in controllers (e.g. admin.payment.controller.js)
exports.deriveStatus = deriveStatus;
exports.getSemesterMap = getSemesterMap;
exports.buildFeeRecord = buildFeeRecord;
exports.filterInstallmentsByDate = filterInstallmentsByDate;
exports.consolidateStudentFees = consolidateStudentFees;

/* =====================================================
   COLLEGE LEVEL REPORTS
   ===================================================== */

/**
 * ADMISSION SUMMARY (COLLEGE)
 */
exports.admissionSummary = async (college_id) => {
  const activeStatuses = ["APPROVED", "ENROLLED", "OFFER_MADE", "SEAT_CONFIRMED"];
  const total = await Student.countDocuments({ college_id });
  const approved = await Student.countDocuments({
    college_id,
    status: { $in: activeStatuses },
  });
  const pending = await Student.countDocuments({
    college_id,
    status: "PENDING",
  });
  const rejected = await Student.countDocuments({
    college_id,
    status: "REJECTED",
  });

  const totalApplications = approved + pending + rejected;

  return {
    total,
    totalApplications,
    approved,
    pending,
    rejected,
    approvedPercentage: totalApplications > 0 ? Math.round((approved / totalApplications) * 100) : 0,
    pendingPercentage: totalApplications > 0 ? Math.round((pending / totalApplications) * 100) : 0,
    rejectedPercentage: totalApplications > 0 ? Math.round((rejected / totalApplications) * 100) : 0,
  };
};

/**
 * COURSE-WISE ADMISSIONS (COLLEGE)
 */
exports.courseWiseAdmissions = async (college_id) => {
  return Student.aggregate([
    {
      $match: {
        college_id,
        status: "APPROVED",
      },
    },
    {
      $group: {
        _id: "$course_id",
        totalStudents: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "_id",
        as: "course",
      },
    },
    { $unwind: "$course" },
    {
      $project: {
        _id: 0,
        courseName: "$course.name",
        totalStudents: 1,
      },
    },
  ]);
};

/**
 * PAYMENT SUMMARY (COLLEGE)
 */
exports.paymentSummary = async (college_id) => {
  const result = await StudentFee.aggregate([
    {
      $match: {
        college_id: new mongoose.Types.ObjectId(college_id),
      },
    },
    {
      $group: {
        _id: null,
        totalExpected: { $sum: { $ifNull: ["$totalFee", 0] } },
        totalPaid: { $sum: { $ifNull: ["$paidAmount", 0] } },
      },
    },
  ]);

  const data = result[0] || { totalExpected: 0, totalPaid: 0 };
  const total = data.totalExpected;
  const collected = data.totalPaid;
  const pending = total - collected;
  const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;

  return {
    totalExpectedFee: total,
    totalCollected: collected,
    totalPending: pending,
    collectionRate,
  };
};

/**
 * STUDENT PAYMENT STATUS (COLLEGE)
 */
exports.studentPaymentStatus = async (college_id, status) => {
  const query = { college_id };
  if (status) query.paymentStatus = status;

  const fees = await StudentFee.find(query)
    .populate("student_id", "fullName email currentSemester currentYear")
    .populate("course_id", "name")
    .select("totalFee paidAmount paymentStatus installments");

  const consolidated = await consolidateStudentFees(fees, college_id);

  return consolidated.map((item) => ({
    _id: item.studentId,
    name: item.student?.fullName || "N/A",
    email: item.student?.email || "",
    course: item.course?.name || "N/A",
    totalFee: item.totalFee,
    paid: item.paidAmount,
    pending: item.pendingAmount,
    status: item.status,
    feeRecords: item.feeRecords,
  }));
};

/**
 * ATTENDANCE SUMMARY (COLLEGE)
 */
exports.attendanceSummary = async (college_id) => {
  const result = await AttendanceRecord.aggregate([
    {
      $match: {
        college_id: new mongoose.Types.ObjectId(college_id),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const data = result[0] || { total: 0, present: 0 };

  // Real number of sessions conducted (distinct session ids for the college).
  // Do NOT divide totalRecords by a guessed class size, as that undercounts
  // and shows 0 for small colleges.
  const sessionIds = await AttendanceRecord.distinct("session_id", {
    college_id: new mongoose.Types.ObjectId(college_id),
  });

  return {
    totalRecords: data.total,
    averageAttendance: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    totalSessions: sessionIds.length,
  };
};

/**
 * LOW ATTENDANCE STUDENTS (COLLEGE)
 */
exports.studentAttendanceReport = async (college_id, minPercentage) => {
  const records = await AttendanceRecord.aggregate([
    {
      $match: {
        college_id: new mongoose.Types.ObjectId(college_id),
      },
    },
    {
      $group: {
        _id: "$student_id",
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        student_id: "$_id",
        total: 1,
        present: 1,
        percentage: {
          $multiply: [{ $divide: ["$present", "$total"] }, 100],
        },
      },
    },
    { $match: { percentage: { $lt: minPercentage } } },
  ]);

  // Enrich with student details
  const Student = require("../models/student.model");
  const enriched = await Promise.all(
    records.map(async (record) => {
      const student = await Student.findById(record.student_id)
        .populate("course_id", "name")
        .select("fullName");

      return {
        name: student?.fullName || "Unknown",
        course: student?.course_id?.name || "N/A",
        attendance: Math.round(record.percentage),
        status: record.percentage < 50 ? "CRITICAL" : "WARNING",
      };
    }),
  );

  return enriched;
};

/* =====================================================
   SYSTEM LEVEL REPORTS (SUPER ADMIN)
   ===================================================== */

/**
 * ADMISSION SUMMARY (ALL COLLEGES)
 */
exports.admissionSummaryAll = async ({ month, year } = {}) => {
   const activeStatuses = ["APPROVED", "ENROLLED", "OFFER_MADE", "SEAT_CONFIRMED"];
   const total = await Student.countDocuments();
   const approved = await Student.countDocuments({
     status: { $in: activeStatuses },
   });
   const pending = await Student.countDocuments({ status: "PENDING" });
   const rejected = await Student.countDocuments({ status: "REJECTED" });

  const totalColleges = await College.countDocuments();
  const activeColleges = await College.countDocuments({ isActive: true });

  // Calculate monthly admissions (selected or current month)
  const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
  const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();

  const startOfMonth = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(targetYear, targetMonth + 1, 1, 0, 0, 0, 0);

  const monthlyAdmissions = await Student.countDocuments({
    createdAt: { $gte: startOfMonth, $lt: endOfMonth },
  });

  // Calculate previous month admissions for growth calculation
  const prevMonthStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
  const prevMonthEnd = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);

  const prevMonthAdmissions = await Student.countDocuments({
    createdAt: { $gte: prevMonthStart, $lt: prevMonthEnd },
  });

  const monthlyGrowth =
    prevMonthAdmissions > 0
      ? Math.round(
          ((monthlyAdmissions - prevMonthAdmissions) / prevMonthAdmissions) *
            100,
        )
      : monthlyAdmissions > 0
        ? 100
        : 0;

  return {
    totalStudents: total,
    approved,
    pending,
    rejected,
    approvedPercentage: total > 0 ? Math.round((approved / total) * 100) : 0,
    pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
    rejectedPercentage: total > 0 ? Math.round((rejected / total) * 100) : 0,
    totalColleges,
    activeColleges,
    monthlyAdmissions,
    monthlyGrowth,
  };
};

/**
 * PAYMENT SUMMARY (ALL COLLEGES)
 */
exports.paymentSummaryAll = async () => {
  const result = await StudentFee.aggregate([
    {
      $group: {
        _id: null,
        totalExpected: { $sum: "$totalFee" },
        totalPaid: { $sum: "$paidAmount" },
      },
    },
  ]);

  const data = result[0] || { totalExpected: 0, totalPaid: 0 };

  return {
    totalExpectedFee: data.totalExpected,
    totalCollected: data.totalPaid,
    totalPending: data.totalExpected - data.totalPaid,
  };
};

/**
 * STUDENT PAYMENT STATUS (ALL COLLEGES)
 */
exports.studentPaymentStatusAll = async (status) => {
  const query = {};
  if (status) query.paymentStatus = status;

  const fees = await StudentFee.find(query)
    .populate("student_id", "fullName email currentSemester currentYear")
    .populate("course_id", "name")
    .select("totalFee paidAmount paymentStatus installments");

  const consolidated = await consolidateStudentFees(fees, null);

  return consolidated.map((item) => ({
    _id: item.studentId,
    name: item.student?.fullName || "N/A",
    email: item.student?.email || "",
    course: item.course?.name || "N/A",
    totalFee: item.totalFee,
    paid: item.paidAmount,
    pending: item.pendingAmount,
    status: item.status,
    feeRecords: item.feeRecords,
  }));
};

/**
 * ATTENDANCE SUMMARY (ALL COLLEGES)
 */
exports.attendanceSummaryAll = async () => {
  const result = await AttendanceRecord.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [
              { $in: ["$status", ["PRESENT", "Present", "present"]] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalRecords: "$total",
        averageAttendance: {
          $cond: [
            { $eq: ["$total", 0] },
            0,
            {
              $round: [
                { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
                0,
              ],
            },
          ],
        },
      },
    },
  ]);

  // Return first object or default values
  return result[0] || { totalRecords: 0, averageAttendance: 0 };
};

/* =====================================================
   ADVANCED PAYMENT REPORTING (ACCOUNTANT FEATURES)
   ===================================================== */

/**
 * PAYMENT SUMMARY WITH DATE RANGE FILTERING
 */
exports.paymentSummaryWithDateRange = async (college_id, startDate, endDate) => {
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new AppError("Start date must be before end date", 400, "INVALID_DATE_RANGE");
  }

  const matchConditions = { college_id: new mongoose.Types.ObjectId(college_id) };

  if (startDate || endDate) {
    const paidAt = {};

    if (startDate) {
      paidAt.$gte = new Date(startDate);
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setUTCHours(23, 59, 59, 999);
      paidAt.$lte = endDateTime;
    }

    matchConditions.installments = { $elemMatch: { paidAt } };

    const result = await StudentFee.aggregate([
      { $match: matchConditions },
      { $unwind: "$installments" },
      { $match: { "installments.paidAt": paidAt } },
      {
        $group: {
          _id: null,
          totalExpected: { $sum: "$installments.amount" },
          totalPaid: {
            $sum: {
              $cond: [
                { $eq: ["$installments.status", "PAID"] },
                "$installments.amount",
                0
              ]
            }
          }
        }
      }
    ]);

    const data = result[0] || { totalExpected: 0, totalPaid: 0 };
    const total = data.totalExpected;
    const collected = data.totalPaid;
    const pending = total - collected;
    const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;

    return {
      totalExpectedFee: total,
      totalCollected: collected,
      totalPending: pending,
      collectionRate,
      dateRange: { startDate, endDate }
    };
  }

  const result = await StudentFee.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalExpected: { $sum: { $ifNull: ["$totalFee", 0] } },
        totalPaid: { $sum: { $ifNull: ["$paidAmount", 0] } },
      },
    },
  ]);

  const data = result[0] || { totalExpected: 0, totalPaid: 0 };
  const total = data.totalExpected;
  const collected = data.totalPaid;
  const pending = total - collected;
  const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;

  return {
    totalExpectedFee: total,
    totalCollected: collected,
    totalPending: pending,
    collectionRate,
    dateRange: { startDate, endDate }
  };
};

/**
 * STUDENT SPECIFIC PAYMENT HISTORY WITH DATE FILTERING
 */
exports.studentSpecificPaymentHistory = async (college_id, studentId, startDate, endDate) => {
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new AppError("Start date must be before end date", 400, "INVALID_DATE_RANGE");
  }

  const matchConditions = {
    college_id: new mongoose.Types.ObjectId(college_id),
    student_id: new mongoose.Types.ObjectId(studentId)
  };

  let endDateTime = null;
  const hasDateFilter = startDate || endDate;

  if (hasDateFilter) {
    const paidAt = {};

    if (startDate) {
      paidAt.$gte = new Date(startDate);
    }

    if (endDate) {
      endDateTime = new Date(endDate);
      endDateTime.setUTCHours(23, 59, 59, 999);
      paidAt.$lte = endDateTime;
    }

    matchConditions.installments = { $elemMatch: { paidAt } };
  }

  const fees = await StudentFee.find(matchConditions)
    .populate("student_id", "fullName email currentSemester currentYear")
    .populate("course_id", "name")
    .select("totalFee paidAmount paymentStatus installments");

  if (fees.length === 0) return [];

  const semesterMap = await getSemesterMap(college_id, fees.map((f) => f._id));

  const totalFee = fees.reduce(
    (sum, f) => sum + (Number(f.totalFee) || 0),
    0,
  );
  const paidAmount = fees.reduce(
    (sum, f) => sum + (Number(f.paidAmount) || 0),
    0,
  );
  const pendingAmount = totalFee - paidAmount;

  const feeRecords = fees.map((fee) => {
    const record = buildFeeRecord(fee, semesterMap);
    if (hasDateFilter) {
      record.installments = filterInstallmentsByDate(
        fee.installments,
        startDate,
        endDate,
        endDateTime,
      );
    }
    return record;
  });

  const allInstallments = fees.reduce((acc, fee) => {
    const insts = hasDateFilter
      ? filterInstallmentsByDate(
          fee.installments,
          startDate,
          endDate,
          endDateTime,
        )
      : fee.installments || [];
    return acc.concat(insts);
  }, []);

  return [
    {
      student: fees[0].student_id,
      course: fees[0].course_id,
      totalFee,
      paidAmount,
      pendingAmount,
      status: fees[0].paymentStatus || deriveStatus(totalFee, paidAmount),
      installments: allInstallments,
      feeRecords,
    },
  ];
};

/**
 * PAYMENT TRENDS BY MONTH
 */
exports.paymentTrendsByMonth = async (college_id, year = new Date().getFullYear()) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const [monthlyTrends, prevYearTrends] = await Promise.all([
    // Current year monthly data
    StudentFee.aggregate([
      {
        $match: {
          college_id: new mongoose.Types.ObjectId(college_id),
          "installments.paidAt": {
            $gte: startOfYear,
            $lte: endOfYear
          }
        }
      },
      { $unwind: "$installments" },
      {
        $match: {
          "installments.paidAt": {
            $gte: startOfYear,
            $lte: endOfYear
          },
          "installments.status": "PAID"
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$installments.paidAt" },
            month: { $month: "$installments.paidAt" }
          },
          totalCollected: { $sum: "$installments.amount" },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    // Previous year monthly data for YoY comparison
    StudentFee.aggregate([
      {
        $match: {
          college_id: new mongoose.Types.ObjectId(college_id),
          "installments.paidAt": {
            $gte: new Date(year - 1, 0, 1),
            $lte: new Date(year - 1, 11, 31, 23, 59, 59)
          }
        }
      },
      { $unwind: "$installments" },
      {
        $match: {
          "installments.paidAt": {
            $gte: new Date(year - 1, 0, 1),
            $lte: new Date(year - 1, 11, 31, 23, 59, 59)
          },
          "installments.status": "PAID"
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$installments.paidAt" },
            month: { $month: "$installments.paidAt" }
          },
          totalCollected: { $sum: "$installments.amount" },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])
  ]);

  // Create array for all 12 months
  const trends = [];
  for (let month = 1; month <= 12; month++) {
    const monthData = monthlyTrends.find(t => t._id.month === month);
    trends.push({
      month: month,
      monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }),
      totalCollected: monthData?.totalCollected || 0,
      transactionCount: monthData?.transactionCount || 0
    });
  }

  const currentYearTotal = trends.reduce((sum, t) => sum + t.totalCollected, 0);
  const prevYearTotal = prevYearTrends.reduce((sum, t) => sum + t.totalCollected, 0);

  // Find best month (actual computed value)
  let bestMonth = null;
  let maxCollection = 0;
  for (const t of trends) {
    if (t.totalCollected > maxCollection) {
      maxCollection = t.totalCollected;
      bestMonth = {
        month: t.month,
        monthName: t.monthName,
        totalCollected: t.totalCollected
      };
    }
  }

  // Calculate YoY growth
  let yoyGrowth = 0;
  if (prevYearTotal > 0) {
    yoyGrowth = Math.round(((currentYearTotal - prevYearTotal) / prevYearTotal) * 100);
  }

  return {
    year,
    trends,
    totalYearCollection: currentYearTotal,
    totalYearTransactions: trends.reduce((sum, t) => sum + t.transactionCount, 0),
    bestMonth,
    previousYearTotal: prevYearTotal,
    yoyGrowth
  };
};
