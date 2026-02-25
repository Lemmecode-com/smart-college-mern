const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");

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

    const approvedPercentage = total > 0 ? Math.round((approved / total) * 100) : 0;
    const pendingPercentage = total > 0 ? Math.round((pending / total) * 100) : 0;
    const rejectedPercentage = total > 0 ? Math.round((rejected / total) * 100) : 0;

    const admissionSummary = {
      totalApplications: total,
      approved,
      pending,
      rejected,
      approvedPercentage,
      pendingPercentage,
      rejectedPercentage,
      pieChartData: [
        { name: "Approved", value: approved, percentage: approvedPercentage, color: "#28a745" },
        { name: "Pending", value: pending, percentage: pendingPercentage, color: "#ffc107" },
        { name: "Rejected", value: rejected, percentage: rejectedPercentage, color: "#dc3545" }
      ]
    };

    // ==========================================
    // 2. PAYMENT SUMMARY
    // ==========================================
    const paymentResult = await StudentFee.aggregate([
      { $match: { college_id } },
      {
        $group: {
          _id: null,
          totalExpected: { $sum: "$totalFee" },
          totalPaid: { $sum: "$paidAmount" },
          count: { $sum: 1 }
        }
      }
    ]);

    let paymentData;
    if (paymentResult.length > 0) {
      paymentData = paymentResult[0];
    } else {
      // No fee records found - calculate from students
      const allStudents = await Student.find({ college_id, status: "APPROVED" });
      const totalExpected = allStudents.reduce((sum, student) => {
        // You can set a default fee per student or fetch from course
        return sum + 50000; // Default 50,000 per student (adjust as needed)
      }, 0);
      
      paymentData = {
        totalExpected: totalExpected,
        totalPaid: 0,
        count: allStudents.length
      };
    }

    const totalPending = paymentData.totalExpected - paymentData.totalPaid;
    const collectionRate = paymentData.totalExpected > 0 
      ? Math.round((paymentData.totalPaid / paymentData.totalExpected) * 100) 
      : 0;

    const paymentSummary = {
      totalExpectedFee: paymentData.totalExpected,
      totalCollected: paymentData.totalPaid,
      totalPending,
      collectionRate,
      totalStudents: paymentData.count || 0,
      barChartData: [
        { name: "Collected", amount: paymentData.totalPaid, color: "#28a745" },
        { name: "Pending", amount: totalPending, color: "#dc3545" }
      ]
    };

    // ==========================================
    // 3. STUDENT PAYMENT STATUS
    // ==========================================
    const paymentQuery = { college_id };
    
    if (status && status !== "ALL") {
      if (status === "PAID") {
        // Students who have paid in full
        paymentQuery.$expr = { $gte: ["$paidAmount", "$totalFee"] };
      } else if (status === "DUE") {
        // Students who haven't paid anything
        paymentQuery.paidAmount = 0;
      } else if (status === "PARTIAL") {
        // Students who have paid partially
        paymentQuery.$expr = {
          $and: [
            { $gt: ["$paidAmount", 0] },
            { $lt: ["$paidAmount", "$totalFee"] }
          ]
        };
      }
    }

    let studentFees = await StudentFee.find(paymentQuery)
      .populate("student_id", "fullName email")
      .populate("course_id", "name")
      .select("totalFee paidAmount student_id course_id installments")
      .limit(100); // Limit to 100 for performance

    // If no fee records, create from approved students
    if (studentFees.length === 0) {
      const approvedStudents = await Student.find({ college_id, status: "APPROVED" })
        .populate("course_id", "name")
        .select("fullName email course_id")
        .limit(100);
      
      studentFees = approvedStudents.map(student => ({
        _id: student._id,
        student_id: student,
        course_id: student.course_id,
        totalFee: 50000, // Default fee
        paidAmount: 0,
        installments: []
      }));
    }

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
    // 5. LOW ATTENDANCE STUDENTS
    // ==========================================
    const lowAttendanceResult = await AttendanceRecord.aggregate([
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
      { $limit: 50 }
    ]);

    // Enrich with student details
    const lowAttendanceStudents = await Promise.all(
      lowAttendanceResult.map(async (item) => {
        const student = await Student.findById(item.student_id)
          .populate("course_id", "name")
          .select("fullName email course_id semester");
        
        let matchesCourse = true;
        if (course && course !== "ALL") {
          matchesCourse = student.course_id?.name?.toLowerCase().includes(course.toLowerCase());
        }

        if (!matchesCourse) return null;

        return {
          _id: item.student_id,
          name: student?.fullName || "Unknown",
          email: student?.email || "",
          course: student?.course_id?.name || "Unknown",
          semester: student?.semester || 0,
          attendancePercentage: Math.round(item.percentage),
          totalSessions: item.total,
          attendedSessions: item.present,
          status: item.percentage < 50 ? "CRITICAL" : "LOW"
        };
      })
    );

    const filteredLowAttendance = lowAttendanceStudents.filter(item => item !== null);

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