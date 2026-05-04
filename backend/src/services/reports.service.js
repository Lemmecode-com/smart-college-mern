const mongoose = require("mongoose");
const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const College = require("../models/college.model");

/* =====================================================
   COLLEGE LEVEL REPORTS
   ===================================================== */

/**
 * ADMISSION SUMMARY (COLLEGE)
 */
exports.admissionSummary = async (college_id) => {
  const total = await Student.countDocuments({ college_id });
  const approved = await Student.countDocuments({
    college_id,
    status: "APPROVED",
  });
  const pending = await Student.countDocuments({
    college_id,
    status: "PENDING",
  });
  const rejected = await Student.countDocuments({
    college_id,
    status: "REJECTED",
  });

  return {
    total,
    approved,
    pending,
    rejected,
    approvedPercentage: total > 0 ? Math.round((approved / total) * 100) : 0,
    pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
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
    .populate("student_id", "fullName email")
    .populate("course_id", "name")
    .select("totalFee paidAmount paymentStatus installments");

  // Transform to expected format
  return fees.map((fee) => ({
    name: fee.student_id?.fullName || "N/A",
    email: fee.student_id?.email || "",
    course: fee.course_id?.name || "N/A",
    totalFee: fee.totalFee || 0,
    paid: fee.paidAmount || 0,
    pending: (fee.totalFee || 0) - (fee.paidAmount || 0),
    status: fee.paymentStatus || "DUE",
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

  return {
    totalRecords: data.total,
    averageAttendance: data.present,
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
exports.admissionSummaryAll = async () => {
  const total = await Student.countDocuments();
  const approved = await Student.countDocuments({ status: "APPROVED" });
  const pending = await Student.countDocuments({ status: "PENDING" });
  const rejected = await Student.countDocuments({ status: "REJECTED" });

  const totalColleges = await College.countDocuments();
  const activeColleges = await College.countDocuments({ isActive: true });

  // Calculate monthly admissions (current month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyAdmissions = await Student.countDocuments({
    createdAt: { $gte: startOfMonth },
  });

  // Calculate previous month admissions for growth calculation
  const prevMonthStart = new Date(startOfMonth);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

  const prevMonthAdmissions = await Student.countDocuments({
    createdAt: { $gte: prevMonthStart, $lt: startOfMonth },
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

  return StudentFee.find(query)
    .populate("student_id", "fullName email")
    .select("totalFee paidAmount paymentStatus installments");
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
  let matchConditions = { college_id: new mongoose.Types.ObjectId(college_id) };

  if (startDate || endDate) {
    matchConditions.installments = {};

    if (startDate) {
      matchConditions.installments.$elemMatch = {
        ...matchConditions.installments.$elemMatch,
        paidAt: { $gte: new Date(startDate) }
      };
    }

    if (endDate) {
      matchConditions.installments.$elemMatch = {
        ...matchConditions.installments.$elemMatch,
        paidAt: { $lte: new Date(endDate) }
      };
    }
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
  let matchConditions = {
    college_id: new mongoose.Types.ObjectId(college_id),
    student_id: new mongoose.Types.ObjectId(studentId)
  };

  if (startDate || endDate) {
    matchConditions.installments = {};

    if (startDate) {
      matchConditions.installments.$elemMatch = {
        ...matchConditions.installments.$elemMatch,
        paidAt: { $gte: new Date(startDate) }
      };
    }

    if (endDate) {
      matchConditions.installments.$elemMatch = {
        ...matchConditions.installments.$elemMatch,
        paidAt: { $lte: new Date(endDate) }
      };
    }
  }

  const fees = await StudentFee.find(matchConditions)
    .populate("student_id", "fullName email")
    .populate("course_id", "name")
    .select("totalFee paidAmount paymentStatus installments");

  return fees.map((fee) => ({
    student: fee.student_id,
    course: fee.course_id,
    totalFee: fee.totalFee || 0,
    paidAmount: fee.paidAmount || 0,
    pendingAmount: (fee.totalFee || 0) - (fee.paidAmount || 0),
    status: fee.paymentStatus || "DUE",
    installments: fee.installments.filter(inst => {
      if (!startDate && !endDate) return true;
      if (!inst.paidAt) return false;

      const paidDate = new Date(inst.paidAt);
      if (startDate && paidDate < new Date(startDate)) return false;
      if (endDate && paidDate > new Date(endDate)) return false;
      return true;
    })
  }));
};

/**
 * PAYMENT TRENDS BY MONTH
 */
exports.paymentTrendsByMonth = async (college_id, year = new Date().getFullYear()) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const monthlyTrends = await StudentFee.aggregate([
    {
      $match: {
        college_id: new mongoose.Types.ObjectId(college_id),
        "installments.paidAt": {
          $gte: startOfYear,
          $lte: endOfYear
        }
      }
    },
    {
      $unwind: "$installments"
    },
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
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    }
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

  return {
    year,
    trends,
    totalYearCollection: trends.reduce((sum, t) => sum + t.totalCollected, 0),
    totalYearTransactions: trends.reduce((sum, t) => sum + t.transactionCount, 0)
  };
};
