const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const Subject = require("../models/subject.model");
const Student = require("../models/student.model");

exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const studentId = req.user.id;     // ✅ Student._id
    const collegeId = req.college_id;

    // ✅ Ensure student exists
    const student = await Student.findOne({
      _id: studentId,
      college_id: collegeId
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    const summary = await AttendanceRecord.aggregate([
      {
        $match: {
          student_id: student._id,
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
            $round: [
              {
                $multiply: [
                  { $divide: ["$present", "$totalLectures"] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    const finalSummary = await Promise.all(
      summary.map(async (item) => {
        const subject = await Subject.findById(item.subject_id).select("name code");

        return {
          subject: subject?.name || "Unknown",
          subjectCode: subject?.code || "-",
          totalLectures: item.totalLectures,
          present: item.present,
          absent: item.absent,
          percentage: item.percentage,
          status: item.percentage < 75 ? "AT_RISK" : "SAFE"
        };
      })
    );

    res.json({
      studentId: student._id,
      attendance: finalSummary
    });

  } catch (error) {
    console.error("Attendance summary error:", error);
    res.status(500).json({
      message: error.message
    });
  }
};
