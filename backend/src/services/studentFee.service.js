const mongoose = require("mongoose");
const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const logger = require("../utils/logger");

/**
 * Normalizes academic year strings to canonical "YYYY-YYYY" format.
 * Kept for informational and backward compatibility purposes.
 */
function normalizeAcademicYear(ay) {
  if (!ay) return null;
  const str = String(ay).trim();
  const parts = str.split("-");
  if (parts.length === 2) {
    const start = parseInt(parts[0], 10);
    let end = parseInt(parts[1], 10);
    if (!isNaN(start)) {
      return `${start}-${start + 1}`;
    }
  } else if (parts.length === 1) {
    const start = parseInt(parts[0], 10);
    if (!isNaN(start) && start > 1900 && start < 2100) {
      return `${start}-${start + 1}`;
    }
  }
  return str;
}

/**
 * Derives the active academic year string for a student.
 * Kept for informational and backward compatibility purposes.
 */
function getStudentActiveAcademicYear(student) {
  if (!student) return null;
  if (student.currentAcademicYear) {
    return normalizeAcademicYear(student.currentAcademicYear);
  }
  if (student.admissionYear) {
    const yearOffset = student.currentSemester
      ? Math.floor((student.currentSemester - 1) / 2)
      : 0;
    const startYear = Number(student.admissionYear) + yearOffset;
    return `${startYear}-${startYear + 1}`;
  }
  const currentCalYear = new Date().getFullYear();
  return `${currentCalYear}-${currentCalYear + 1}`;
}

/**
 * Selects the single authoritative StudentFee document for a student in their course.
 * Authoritative Business Rule: A StudentFee applies for the ENTIRE duration of the course.
 * Academic year is NOT used for selection.
 *
 * Selection Rule:
 * 1. If only 1 document exists, return it.
 * 2. If multiple exist (legacy duplicates), log a warning.
 * 3. Prefer the document with actual payments recorded (paidAmount > 0).
 * 4. Otherwise, prefer the earliest created document (earliest createdAt / oldest _id).
 */
function selectAuthoritativeFee(fees) {
  if (!fees || fees.length === 0) return null;
  if (fees.length === 1) return fees[0];

  const studentRef = fees[0]?.student_id?._id || fees[0]?.student_id || "Unknown";
  logger.warn(
    `[StudentFee] Multiple (${fees.length}) StudentFee documents found for student ${studentRef}. Selecting authoritative fee.`,
  );

  // Prefer document with actual payments recorded
  const withPaid = fees.find((f) => (Number(f.paidAmount) || 0) > 0);
  if (withPaid) return withPaid;

  // Fallback to earliest document (by createdAt if present, else by _id)
  return [...fees].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return String(a._id).localeCompare(String(b._id));
  })[0];
}

/**
 * Returns the single authoritative StudentFee for { college_id, student_id, course_id }.
 * Applies for the ENTIRE duration of the course. Does NOT use academic year.
 *
 * @param {ObjectId|string} studentId
 * @param {ObjectId|string} collegeId
 * @param {Object} [options]
 * @param {Object} [options.student] Pre-loaded student document
 * @param {ObjectId|string} [options.courseId] Course ID override if known
 * @param {mongoose.ClientSession} [options.session]
 * @param {boolean} [options.lean=false]
 * @param {string|string[]|Object} [options.populate]
 * @param {string} [options.select]
 * @returns {Promise<StudentFee|null>}
 */
async function getActiveStudentFee(studentId, collegeId, options = {}) {
  const {
    student: preloadedStudent,
    courseId: preloadedCourseId,
    session,
    lean = false,
    populate,
    select,
  } = options;

  let courseId = preloadedCourseId;
  if (!courseId) {
    let student = preloadedStudent;
    if (!student) {
      let studentQuery = Student.findOne({ _id: studentId, college_id: collegeId });
      if (session) studentQuery = studentQuery.session(session);
      student = await studentQuery.lean().exec();
    }
    courseId = student?.course_id;
  }

  const queryConditions = {
    college_id: collegeId,
    student_id: studentId,
  };
  if (courseId) {
    queryConditions.course_id = courseId;
  }

  let feeQuery = StudentFee.find(queryConditions);
  if (session) feeQuery = feeQuery.session(session);
  if (select) feeQuery = feeQuery.select(select);
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((p) => feeQuery.populate(p));
    } else {
      feeQuery.populate(populate);
    }
  }
  if (lean) feeQuery = feeQuery.lean();

  const fees = await feeQuery.exec();
  if (!fees || fees.length === 0) return null;

  return selectAuthoritativeFee(fees);
}

module.exports = {
  getActiveStudentFee,
  normalizeAcademicYear,
  getStudentActiveAcademicYear,
  selectAuthoritativeFee,
};

