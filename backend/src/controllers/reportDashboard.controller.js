const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");
const { selectAuthoritativeFee } = require("../services/studentFee.service");

/**
 * REPORT DASHBOARD CONTROLLER
 * Single endpoint for all College Admin Dashboard reports
 */

/**
 * GET /api/reports/dashboard/all
 * Get ALL reports in one API call
 * Query params: course, status, search (for filtering)
 */
exports.getAllReports = async (req, res, next) => {
  try {
    const college_id = req.college_id;
    const { course, status, search } = req.query || {};

    console.log("📊 Fetching all reports for college:", college_id);

    // ==========================================
    // 1. ADMISSION SUMMARY
    // ==========================================
    const approvalCount = await Student.countDocuments({
      college_id,
      status: { $in: ["APPROVED", "ENROLLED", "OFFER_MADE", "SEAT_CONFIRMED"] },
    });
    const pending = await Student.countDocuments({
      college_id,
      status: "PENDING",
    });
    const rejected = await Student.countDocuments({
      college_id,
      status: "REJECTED",
    });
    const total = await Student.countDocuments({ college_id });

    const approvedPercentage = total > 0 ? Math.round((approvalCount / total) * 100) : 0;
    const approvalPercentage = approvedPercentage;
    const pendingPercentage = total > 0 ? Math.round((pending / total) * 100) : 0;
    const rejectedPercentage = total > 0 ? Math.round((rejected / total) * 100) : 0;

    const admissionSummary = {
      totalApplications: total,
      approved: approvalCount,
      pending,
      rejected,
      approvedPercentage,
      pendingPercentage,
      rejectedPercentage,
      pieChartData: [
        { name: "Approved", value: approvalCount, percentage: approvalPercentage, color: "#28a745" },
        { name: "Pending", value: pending, percentage: pendingPercentage, color: "#ffc107" },
        { name: "Rejected", value: rejected, percentage: rejectedPercentage, color: "#dc3545" }
      ]
    };

    // ==========================================
    // 2. PAYMENT SUMMARY & STUDENT FEES (AUTHORITATIVE)
    // ==========================================
    const allCollegeFees = await StudentFee.find({ college_id })
      .populate("student_id", "fullName email")
      .populate("course_id", "name")
      .select("totalFee paidAmount student_id course_id installments")
      .lean();

    const feesByStudent = new Map();
    for (const f of allCollegeFees) {
      if (!f.student_id) continue;
      const sId = f.student_id._id ? String(f.student_id._id) : String(f.student_id);
      if (!feesByStudent.has(sId)) feesByStudent.set(sId, []);
      feesByStudent.get(sId).push(f);
    }

    const authoritativeFees = [];
    let totalExpected = 0;
    let totalPaid = 0;

    for (const sFees of feesByStudent.values()) {
      const authFee = selectAuthoritativeFee(sFees);
      if (authFee) {
        authoritativeFees.push(authFee);
        totalExpected += (Number(authFee.totalFee) || 0);
        totalPaid += (Number(authFee.paidAmount) || 0);
      }
    }

    const totalPending = Math.max(0, totalExpected - totalPaid);
    const collectionRate = totalExpected > 0
      ? Math.round((totalPaid / totalExpected) * 100)
      : 0;

    const paymentSummary = {
      totalExpectedFee: totalExpected,
      totalCollected: totalPaid,
      totalPending,
      collectionRate,
      totalStudents: authoritativeFees.length,
      barChartData: [
        { name: "Collected", amount: totalPaid, color: "#28a745" },
        { name: "Pending", amount: totalPending, color: "#dc3545" }
      ]
    };

    // ==========================================
    // 3. STUDENT PAYMENT STATUS
    // ==========================================
    let studentFees = authoritativeFees;
    if (status && status !== "ALL") {
      if (status === "PAID") {
        studentFees = studentFees.filter(
          (f) =>
            (Number(f.paidAmount) || 0) >= (Number(f.totalFee) || 0) &&
            (Number(f.totalFee) || 0) > 0,
        );
      } else if (status === "DUE") {
        studentFees = studentFees.filter(
          (f) => (Number(f.paidAmount) || 0) === 0,
        );
      } else if (status === "PARTIAL") {
        studentFees = studentFees.filter(
          (f) =>
            (Number(f.paidAmount) || 0) > 0 &&
            (Number(f.paidAmount) || 0) < (Number(f.totalFee) || 0),
        );
      }
    }

    studentFees = studentFees.slice(0, 100);

    // Filter by course
    if (course && course !== "ALL") {
      studentFees = studentFees.filter(sf => 
        sf.course_id?.name?.toLowerCase().includes(course.toLowerCase())
      );
    }

    // Search by student name
    if (search) {
      studentFees = studentFees.filter(sf => 
        sf.student_id?.fullName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    const studentPaymentStatus = studentFees.map(sf => {
      const pending = sf.totalFee - sf.paidAmount;
      let paymentStatus = "DUE";
      if (sf.paidAmount >= sf.totalFee) paymentStatus = "PAID";
      else if (sf.paidAmount > 0 && sf.paidAmount < sf.totalFee) paymentStatus = "PARTIAL";

      return {
        _id: sf._id,
        studentId: sf.student_id?._id,
        name: sf.student_id?.fullName || "Unknown",
        email: sf.student_id?.email || "",
        course: sf.course_id?.name || "Unknown",
        totalFee: sf.totalFee || 0,
        paid: sf.paidAmount || 0,
        pending: pending > 0 ? pending : 0,
        status: paymentStatus
      };
    });

    // ==========================================
    // 4. ATTENDANCE SUMMARY
    // ==========================================
    const attendanceResult = await AttendanceRecord.aggregate([
      { $match: { college_id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0]
            }
          }
        }
      }
    ]);

    const attendanceData = attendanceResult[0] || { total: 0, present: 0, absent: 0 };
    const averageAttendance = attendanceData.total > 0 
      ? Math.round((attendanceData.present / attendanceData.total) * 100) 
      : 0;

    const totalSessions = await AttendanceRecord.distinct("session_id", { college_id });

    // Line chart data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendData = await AttendanceRecord.aggregate([
      {
        $match: {
          college_id,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    const lineChartData = trendData.map(d => ({
      date: d._id,
      attendance: Math.round((d.present / d.total) * 100),
      total: d.total,
      present: d.present
    }));

    const attendanceSummary = {
      totalSessions: totalSessions.length,
      totalRecords: attendanceData.total,
      present: attendanceData.present,
      absent: attendanceData.absent,
      averageAttendance,
      lineChartData
    };

    // ==========================================
    // 5. LOW ATTENDANCE STUDENTS (OPTIMIZED WITH AGGREGATION)
    // ==========================================
    
    // 🔥 OPTIMIZED: Single aggregation pipeline instead of N+1 queries
    const lowAttendanceStudents = await AttendanceRecord.aggregate([
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
      { $match: { percentage: { $lt: 75 } } },
      { $sort: { percentage: 1 } },
      { $limit: 50 },
      // 🔥 OPTIMIZED: Lookup student details in the same pipeline
      {
        $lookup: {
          from: "students",
          localField: "student_id",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },
      {
        $lookup: {
          from: "courses",
          localField: "student.course_id",
          foreignField: "_id",
          as: "course"
        }
      },
      {
        $project: {
          _id: "$student._id",
          name: "$student.fullName",
          email: "$student.email",
          course: { $arrayElemAt: ["$course.name", 0] },
          semester: "$student.semester",
          attendancePercentage: { $round: ["$percentage", 0] },
          totalSessions: "$total",
          attendedSessions: "$present",
          status: {
            $cond: [
              { $lt: ["$percentage", 50] },
              "CRITICAL",
              "LOW"
            ]
          }
        }
      }
    ]);

    // 🔥 OPTIMIZED: Filter in memory after aggregation (no more DB queries)
    const filteredLowAttendance = lowAttendanceStudents.filter(item => {
      if (course && course !== "ALL") {
        return item.course?.toLowerCase().includes(course.toLowerCase());
      }
      return true;
    });

    // ==========================================
    // RETURN ALL DATA
    // ==========================================
    console.log("✅ All reports fetched successfully");

    res.json({
      success: true,
      message: "All reports fetched successfully",
      data: {
        admissionSummary,
        paymentSummary,
        studentPaymentStatus,
        attendanceSummary,
        lowAttendanceStudents: filteredLowAttendance,
        metadata: {
          college_id,
          fetchedAt: new Date().toISOString(),
          filters: { course, status, search }
        }
      }
    });

  } catch (error) {
    console.error("❌ Error fetching reports:", error);
    next(error);
  }
};