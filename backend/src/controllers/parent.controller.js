const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AppError = require("../utils/AppError");

/**
 * GET /api/parent/children
 * List all students linked to the parent
 */
exports.getChildren = async (req, res, next) => {
  try {
    const studentIds = req.linkedStudentIds;
    if (!studentIds || studentIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No students linked to this parent",
      });
    }

    const students = await Student.find({ _id: { $in: studentIds } })
      .select("firstName lastName email phone enrollmentNo status department_id course_id")
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .sort({ firstName: 1 });

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parent/student/:studentId/profile
 * Get a specific student's profile (must be linked)
 */
exports.getChildProfile = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const linkedIds = req.linkedStudentIds;

    // Verify student is linked
    if (!linkedIds.includes(studentId)) {
      return next(new AppError("Access denied: Student not linked to your account", 403, "NOT_AUTHORIZED"));
    }

    const student = await Student.findById(studentId)
      .populate("department_id", "name code")
      .populate("course_id", "name");

    if (!student) {
      return next(new AppError("Student not found", 404, "STUDENT_NOT_FOUND"));
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parent/student/:studentId/attendance
 * Get attendance records for a linked student
 */
exports.getChildAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const linkedIds = req.linkedStudentIds;

    if (!linkedIds.includes(studentId)) {
      return next(new AppError("Access denied: Student not linked to your account", 403, "NOT_AUTHORIZED"));
    }

    // Find attendance records for the student
    const records = await AttendanceRecord.find({ student_id: studentId })
      .populate("session_id", "date slotNumber topic")
      .populate("course_id", "name")
      .sort({ "session.date": -1 })
      .limit(100);

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/parent/student/:studentId/fees
 * Get fee details and payment history for a linked student
 */
exports.getChildFees = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const linkedIds = req.linkedStudentIds;

    if (!linkedIds.includes(studentId)) {
      return next(new AppError("Access denied: Student not linked to your account", 403, "NOT_AUTHORIZED"));
    }

    const feeRecord = await StudentFee.findOne({ student_id: studentId })
      .populate("course_id", "name");

    if (!feeRecord) {
      return res.json({
        success: true,
        data: null,
        message: "No fee record found for this student",
      });
    }

    res.json({
      success: true,
      data: feeRecord,
    });
  } catch (error) {
    next(error);
  }
};
