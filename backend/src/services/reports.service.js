const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const AttendanceRecord = require("../models/attendanceRecord.model");

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
    status: "APPROVED"
  });
  const pending = await Student.countDocuments({
    college_id,
    status: "PENDING"
  });
  const rejected = await Student.countDocuments({
    college_id,
    status: "REJECTED"
  });

  return {
    total,
    approved,
    pending,
    rejected,
    approvedPercentage: total > 0 ? Math.round((approved / total) * 100) : 0,
    pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0
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
        status: "APPROVED"
      }
    },
    {
      $group: {
        _id: "$course_id",
        totalStudents: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "_id",
        as: "course"
      }
    },
    { $unwind: "$course" },
    {
      $project: {
        _id: 0,
        courseName: "$course.name",
        totalStudents: 1
      }
    }
  ]);
};

/**
 * PAYMENT SUMMARY (COLLEGE)
 */
exports.paymentSummary = async (college_id) => {
  const result = await StudentFee.aggregate([
    { $match: { college_id } },
    {
      $group: {
        _id: null,
        totalExpected: { $sum: "$totalFee" },
        totalPaid: { $sum: "$paidAmount" }
      }
    }
  ]);

  const data = result[0] || { totalExpected: 0, totalPaid: 0 };
  const total = data.totalExpected;
  const collected = data.totalPaid;
  const pending = total - collected;
  const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;

  return {
    total,
    collected,
    pending,
    collectionRate
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
  return fees.map(fee => ({
    name: fee.student_id?.fullName || 'N/A',
    email: fee.student_id?.email || '',
    course: fee.course_id?.name || 'N/A',
    totalFee: fee.totalFee || 0,
    paid: fee.paidAmount || 0,
    pending: (fee.totalFee || 0) - (fee.paidAmount || 0),
    status: fee.paymentStatus || 'DUE'
  }));
};

/**
 * ATTENDANCE SUMMARY (COLLEGE)
 */
exports.attendanceSummary = async (college_id) => {
  const result = await AttendanceRecord.aggregate([
    { $match: { college_id } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0]
          }
        }
      }
    }
  ]);

  const data = result[0] || { total: 0, present: 0 };
  const percentage = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;

  return {
    percentage,
    totalSessions: data.total,
    averageAttendance: data.present
  };
};

/**
 * LOW ATTENDANCE STUDENTS (COLLEGE)
 */
exports.studentAttendanceReport = async (college_id, minPercentage) => {
  const records = await AttendanceRecord.aggregate([
    { $match: { college_id } },
    {
      $group: {
        _id: "$student_id",
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        student_id: "$_id",
        total: 1,
        present: 1,
        percentage: {
          $multiply: [{ $divide: ["$present", "$total"] }, 100]
        }
      }
    },
    { $match: { percentage: { $lt: minPercentage } } }
  ]);

  // Enrich with student details
  const Student = require("../models/student.model");
  const enriched = await Promise.all(
    records.map(async (record) => {
      const student = await Student.findById(record.student_id)
        .populate("course_id", "name")
        .select("fullName");
      
      return {
        name: student?.fullName || 'Unknown',
        course: student?.course_id?.name || 'N/A',
        attendance: Math.round(record.percentage),
        status: record.percentage < 50 ? 'CRITICAL' : 'WARNING'
      };
    })
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

  return {
    totalStudents: total,
    approved,
    pending
  };
};




/**
 * PAYMENT SUMMARY (ALL COLLEGES)
 */

exports.paymentSummary = async (college_id) => {
  const result = await StudentFee.aggregate([
    {
      $match: {
        college_id: new mongoose.Types.ObjectId(college_id)
      }
    },
    {
      $group: {
        _id: null,
        totalExpected: { $sum: "$totalFee" },
        totalPaid: { $sum: "$paidAmount" }
      }
    }
  ]);

  const data = result[0] || { totalExpected: 0, totalPaid: 0 };

  return {
    totalExpectedFee: data.totalExpected,
    totalCollected: data.totalPaid,
    totalPending: data.totalExpected - data.totalPaid
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
const mongoose = require("mongoose");

exports.attendanceSummary = async (college_id) => {
  return AttendanceRecord.aggregate([
    {
      $match: {
        college_id: new mongoose.Types.ObjectId(college_id)
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [
              { $in: ["$status", ["PRESENT", "Present", "present"]] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalRecords: "$total",
        averageAttendance: {
          $cond: [
            { $eq: ["$total", 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 0] }
          ]
        }
      }
    }
  ]);
};

