const mongoose = require("mongoose");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const Course = require("../models/course.model");
const { 
  sendLowAttendanceAlertEmail, 
  sendLowAttendanceAlertToParents 
} = require("../services/email.service");

const BATCH_SIZE = 50;

/**
 * Get attendance percentages for multiple students in one query
 * Uses MongoDB aggregation instead of N+1 queries
 */
const getAttendancePercentages = async (studentIds, courseId) => {
  // Get total closed sessions for the course
  const totalSessions = await AttendanceSession.countDocuments({
    course_id: courseId,
    status: "CLOSED"
  });

  if (totalSessions === 0) {
    return studentIds.map(id => ({ student_id: id, percentage: 100 }));
  }

  const presentCounts = await AttendanceRecord.aggregate([
    {
      $match: {
        student_id: { $in: studentIds },
        status: "PRESENT"
      }
    },
    {
      $group: {
        _id: "$student_id",
        presentCount: { $sum: 1 }
      }
    }
  ]);

  const presentMap = new Map();
  presentCounts.forEach(pc => {
    presentMap.set(pc._id.toString(), pc.presentCount);
  });

  return studentIds.map(id => {
    const present = presentMap.get(id.toString()) || 0;
    const percentage = (present / totalSessions) * 100;
    return {
      student_id: id,
      percentage: parseFloat(percentage.toFixed(2))
    };
  });
};

/**
 * Send low attendance alerts to students and parents
 */
exports.sendLowAttendanceAlerts = async () => {
  try {
    console.log("🔍 Checking for students with low attendance...");
    
    const MINIMUM_ATTENDANCE = 75;
    let alertCount = 0;
    let skip = 0;
    let batch;

    do {
      batch = await Student.find({ status: "APPROVED" })
        .populate("college_id", "name email")
        .populate("course_id", "name")
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (batch.length === 0) break;

      const courseMap = new Map();
      batch.forEach(student => {
        const courseId = student.course_id?._id || student.course_id;
        if (!courseMap.has(courseId.toString())) {
          courseMap.set(courseId.toString(), []);
        }
        courseMap.get(courseId.toString()).push(student);
      });

      for (const [courseId, students] of courseMap) {
        const percentages = await getAttendancePercentages(
          students.map(s => s._id),
          courseId
        );
        
        const percentageMap = new Map();
        percentages.forEach(p => {
          percentageMap.set(p.student_id.toString(), p.percentage);
        });

        for (const student of students) {
          const attendancePercentage = percentageMap.get(student._id.toString());
          
          if (attendancePercentage !== null && attendancePercentage < MINIMUM_ATTENDANCE) {
            const collegeName = student.college_id?.name || "Our College";
            const courseName = student.course_id?.name || "N/A";

            try {
              await sendLowAttendanceAlertEmail({
                to: student.email,
                studentName: student.fullName,
                attendancePercentage,
                courseName,
                collegeName,
                minimumRequired: MINIMUM_ATTENDANCE,
                collegeId: student.college_id?._id || student.college_id,
              });
              alertCount++;
            } catch (error) {
              console.error(`Failed to send alert to ${student.email}:`, error.message);
            }
          }
        }
      }

      skip += BATCH_SIZE;
    } while (batch.length === BATCH_SIZE);

    console.log(`✅ Low attendance alerts sent to ${alertCount} student(s)`);
    return alertCount;
  } catch (error) {
    console.error("❌ Error in low attendance alert job:", error.message);
    throw error;
  }
};

/**
 * Get students with low attendance for a specific college
 */
exports.getLowAttendanceStudents = async (collegeId, threshold = 75) => {
  try {
    const students = await Student.find({
      college_id: collegeId,
      status: "APPROVED"
    })
      .populate("course_id", "name")
      .lean();

    if (students.length === 0) return [];

    const courseMap = new Map();
    students.forEach(student => {
      const courseId = student.course_id?._id || student.course_id;
      if (!courseMap.has(courseId.toString())) {
        courseMap.set(courseId.toString(), []);
      }
      courseMap.get(courseId.toString()).push(student);
    });

    const lowAttendanceList = [];

    for (const [courseId, courseStudents] of courseMap) {
      const percentages = await getAttendancePercentages(
        courseStudents.map(s => s._id),
        courseId
      );

      const percentageMap = new Map();
      percentages.forEach(p => {
        percentageMap.set(p.student_id.toString(), p.percentage);
      });

      for (const student of courseStudents) {
        const attendancePercentage = percentageMap.get(student._id.toString());
        
        if (attendancePercentage !== null && attendancePercentage < threshold) {
          lowAttendanceList.push({
            studentId: student._id,
            fullName: student.fullName,
            email: student.email,
            course: student.course_id?.name || "N/A",
            attendancePercentage
          });
        }
      }
    }

    return lowAttendanceList;
  } catch (error) {
    console.error("Error fetching low attendance students:", error.message);
    throw error;
  }
};