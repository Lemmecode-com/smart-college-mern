const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const Subject = require("../models/subject.model");

/**
 * STUDENT ATTENDANCE SUMMARY
 */
exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const studentId = req.user.id;
    const collegeId = req.college_id;

    // Aggregate attendance data
    const summary = await AttendanceRecord.aggregate([
      {
        $match: {
          student_id: studentId,
          college_id: collegeId
        }
      },
      {
        $lookup: {
          from: "attendancesessions",
          localField: "session_id",
          foreignField: "_id",
          as: "session"
        }
      },
      { $unwind: "$session" },
      {
        $match: {
          "session.status": "CLOSED"
        }
      },
      {
        $group: {
          _id: "$session.subject_id",
          totalLectures: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          subject_id: "$_id",
          totalLectures: 1,
          present: 1,
          absent: { $subtract: ["$totalLectures", "$present"] },
          percentage: {
            $multiply: [
              { $divide: ["$present", "$totalLectures"] },
              100
            ]
          }
        }
      }
    ]);

    // Attach subject names + risk status
    const finalSummary = await Promise.all(
      summary.map(async (item) => {
        const subject = await Subject.findById(item.subject_id)
          .select("name code");

        const percentage = Math.round(item.percentage);

        return {
          subject: subject?.name || "Unknown",
          subjectCode: subject?.code || "-",
          totalLectures: item.totalLectures,
          present: item.present,
          absent: item.absent,
          percentage,
          status: percentage < 75 ? "AT_RISK" : "SAFE"
        };
      })
    );

    res.json({
      studentId,
      attendance: finalSummary
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
