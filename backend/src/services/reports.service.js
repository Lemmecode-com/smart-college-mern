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

  return {
    totalStudents: total,
    approved,
    pending
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

  return {
    totalExpectedFee: data.totalExpected,
    totalCollected: data.totalPaid,
    totalPending: data.totalExpected - data.totalPaid
  };
};

/**
 * STUDENT PAYMENT STATUS (COLLEGE)
 */
exports.studentPaymentStatus = async (college_id, status) => {
  const query = { college_id };
  if (status) query.paymentStatus = status;

  return StudentFee.find(query)
    .populate("student_id", "fullName email")
    .select("totalFee paidAmount paymentStatus installments");
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

  return {
    totalRecords: data.total,
    averageAttendance: data.total
      ? Math.round((data.present / data.total) * 100)
      : 0
  };
};

/**
 * LOW ATTENDANCE STUDENTS (COLLEGE)
 */
exports.studentAttendanceReport = async (college_id, minPercentage) => {
  return AttendanceRecord.aggregate([
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
        percentage: {
          $multiply: [{ $divide: ["$present", "$total"] }, 100]
        }
      }
    },
    { $match: { percentage: { $lt: minPercentage } } }
  ]);
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

