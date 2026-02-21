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

/**
 * Calculate attendance percentage for a student
 */
const calculateAttendancePercentage = async (studentId) => {
  // Get all attendance sessions for the student's course
  const student = await Student.findById(studentId);
  if (!student) return null;

  const totalSessions = await AttendanceSession.countDocuments({
    course_id: student.course_id,
    status: "CLOSED"
  });

  if (totalSessions === 0) return 100; // No sessions yet, consider as 100%

  // Get student's attendance records
  const records = await AttendanceRecord.find({
    student_id: studentId
  });

  const presentCount = records.filter(r => r.status === "PRESENT").length;
  
  const percentage = (presentCount / totalSessions) * 100;
  return parseFloat(percentage.toFixed(2));
};

/**
 * Send low attendance alerts to students and parents
 */
exports.sendLowAttendanceAlerts = async () => {
  try {
    console.log("🔍 Checking for students with low attendance...");
    
    const MINIMUM_ATTENDANCE = 75; // Configurable threshold
    const students = await Student.find({ 
      status: "APPROVED" 
    }).populate("college_id", "name email")
      .populate("course_id", "name");

    let alertCount = 0;

    for (const student of students) {
      const attendancePercentage = await calculateAttendancePercentage(student._id);
      
      if (attendancePercentage !== null && attendancePercentage < MINIMUM_ATTENDANCE) {
        const collegeName = student.college_id?.name || "Our College";
        const courseName = student.course_id?.name || "N/A";

        // Send email to student
        try {
          await sendLowAttendanceAlertEmail({
            to: student.email,
            studentName: student.fullName,
            attendancePercentage,
            courseName,
            collegeName,
            minimumRequired: MINIMUM_ATTENDANCE
          });
          alertCount++;
        } catch (error) {
          console.error(`Failed to send alert to student ${student.email}:`, error.message);
        }

        // Optionally send email to parents (if parent email is available)
        // You can add parentEmail field to Student model if needed
        // For now, we'll skip parent emails unless parent email is stored
      }
    }

    console.log(`✅ Low attendance alerts sent to ${alertCount} student(s)`);
    return alertCount;
  } catch (error) {
    console.error("❌ Error in low attendance alert job:", error.message);
    throw error;
  }
};

/**
 * Get students with low attendance for a specific college (for admin dashboard)
 */
exports.getLowAttendanceStudents = async (collegeId, threshold = 75) => {
  try {
    const students = await Student.find({
      college_id: collegeId,
      status: "APPROVED"
    }).populate("course_id", "name");

    const lowAttendanceList = [];

    for (const student of students) {
      const attendancePercentage = await calculateAttendancePercentage(student._id);
      
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

    return lowAttendanceList;
  } catch (error) {
    console.error("Error fetching low attendance students:", error.message);
    throw error;
  }
};
