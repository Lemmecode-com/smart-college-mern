const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const Subject = require("../models/subject.model");
const Student = require("../models/student.model");
const AppError = require("../utils/AppError");

exports.getStudentAttendanceSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;     // ✅ User._id from token
    const collegeId = req.college_id;

    // ✅ Use user_id instead of _id
    const student = await Student.findOne({
      user_id: userId,
      college_id: collegeId
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
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
      studentId: student.user_id || student._id,
      attendance: finalSummary
    });

  } catch (error) {
    next(error);
  }
};