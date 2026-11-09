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
 * Selection Rule (Deterministic Tiebreak):
 * 1. If only 1 document exists, return it.
 * 2. If multiple exist (legacy duplicates), log a warning.
 * 3. Prefer the document with highest payments recorded (paidAmount desc).
 * 4. Tiebreak: Prefer earliest created document (createdAt asc).
 * 5. Tiebreak: Prefer oldest ObjectId (_id asc).
 */
function selectAuthoritativeFee(fees) {
  if (!fees || fees.length === 0) return null;
  if (fees.length === 1) return fees[0];

  const studentRef = fees[0]?.student_id?._id || fees[0]?.student_id || "Unknown";
  logger.warn(
    `[StudentFee] Multiple (${fees.length}) StudentFee documents found for student ${studentRef}. Selecting authoritative fee.`,
  );

  return [...fees].sort((a, b) => {
    // 1. Prefer document with highest paidAmount recorded
    const paidA = Number(a.paidAmount) || 0;
    const paidB = Number(b.paidAmount) || 0;
    if (paidB !== paidA) {
      return paidB - paidA; // Descending: larger paid amount comes first
    }

    // 2. Earliest createdAt first
    if (a.createdAt && b.createdAt) {
      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
    }

    // 3. Deterministic tiebreak: oldest _id first
    return String(a._id).localeCompare(String(b._id));
  })[0];
}

/**
 * Groups an array of StudentFee records by student_id and selects the authoritative fee for each student.
 * Returns a Map of studentId (string) -> authoritative StudentFee document.
 *
 * @param {Array} fees
 * @returns {Map<string, Object>}
 */
function mapAuthoritativeFeesByStudent(fees) {
  const feesByStudent = new Map();
  for (const f of fees || []) {
    if (!f.student_id) continue;
    const sId = f.student_id._id ? String(f.student_id._id) : String(f.student_id);
    if (!feesByStudent.has(sId)) feesByStudent.set(sId, []);
    feesByStudent.get(sId).push(f);
  }

  const feeMap = new Map();
  for (const [sId, sFees] of feesByStudent.entries()) {
    feeMap.set(sId, selectAuthoritativeFee(sFees));
  }
  return feeMap;
}

/**
 * In-memory version of getAuthoritativeFeeIds. Kept for verification & benchmarking.
 * Loads fees into memory, groups by student, and runs selectAuthoritativeFee.
 *
 * @param {ObjectId|string} collegeId
 * @param {Object} [options]
 * @returns {Promise<Array<mongoose.Types.ObjectId>>}
 */
async function getAuthoritativeFeeIdsMemory(collegeId, options = {}) {
  const query = { college_id: collegeId, ...(options.filter || {}) };
  const fees = await StudentFee.find(query)
    .select("_id student_id paidAmount totalFee createdAt")
    .lean()
    .exec();

  const feeMap = mapAuthoritativeFeesByStudent(fees);
  const ids = [];
  for (const fee of feeMap.values()) {
    if (fee?._id) ids.push(fee._id);
  }
  return ids;
}

/**
 * Performant aggregation-based getAuthoritativeFeeIds.
 * Performs deterministic selection directly inside MongoDB using $sort + $group $first.
 * Memory complexity: O(1) in Node heap, avoids loading all StudentFee documents.
 *
 * Selection Rules (strictly identical to selectAuthoritativeFee):
 * 1. Prefer document with highest paidAmount recorded (paidAmount desc)
 * 2. Earliest createdAt first (createdAt asc)
 * 3. Oldest _id first (_id asc)
 *
 * @param {ObjectId|string} collegeId
 * @param {Object} [options]
 * @returns {Promise<Array<mongoose.Types.ObjectId>>}
 */
async function getAuthoritativeFeeIds(collegeId, options = {}) {
  const collegeObjId = new mongoose.Types.ObjectId(collegeId);
  const match = { college_id: collegeObjId, ...(options.filter || {}) };

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        numericPaidAmount: { $ifNull: ["$paidAmount", 0] },
      },
    },
    {
      $sort: {
        student_id: 1,
        numericPaidAmount: -1,
        createdAt: 1,
        _id: 1,
      },
    },
    {
      $group: {
        _id: "$student_id",
        authoritativeId: { $first: "$_id" },
      },
    },
  ];

  const results = await StudentFee.aggregate(pipeline);
  return results.map((r) => r.authoritativeId);
}

/**
 * Recalculates paidAmount on a StudentFee document by summing all PAID installments.
 * Updates paymentStatus accordingly ("PENDING", "PARTIAL", "PAID").
 * Used across webhooks and admin manual offline payments to prevent paidAmount drift.
 *
 * @param {Document} studentFee
 * @returns {number} The newly calculated paidAmount
 */
function recalculateStudentFeePaidAmount(studentFee) {
  if (!studentFee || !Array.isArray(studentFee.installments)) return 0;
  const paid = studentFee.installments
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  studentFee.paidAmount = paid;
  const total = Number(studentFee.totalFee) || 0;
  if (total > 0 && paid >= total) {
    studentFee.paymentStatus = "PAID";
  } else if (paid > 0) {
    studentFee.paymentStatus = "PARTIAL";
  } else {
    studentFee.paymentStatus = "PENDING";
  }
  return paid;
}

/**
 * Detects students who have recorded payments across multiple StudentFee documents (split payments).
 * Read-only audit helper used to surface data-integrity warnings on dashboard/reports without modifying data.
 *
 * @param {ObjectId|string} collegeId
 * @returns {Promise<{ count: number, studentIds: Array<string>, details: Array<Object> }>}
 */
async function getSplitPaymentStudentSummary(collegeId) {
  const collegeObjId = new mongoose.Types.ObjectId(collegeId);

  const results = await StudentFee.aggregate([
    {
      $match: {
        college_id: collegeObjId,
        $or: [
          { paidAmount: { $gt: 0 } },
          { "installments.status": "PAID" },
        ],
      },
    },
    {
      $group: {
        _id: "$student_id",
        feeCountWithPayments: { $sum: 1 },
        totalSplitPaid: { $sum: "$paidAmount" },
        feeIds: { $push: "$_id" },
      },
    },
    {
      $match: {
        feeCountWithPayments: { $gt: 1 },
      },
    },
  ]);

  return {
    count: results.length,
    studentIds: results.map((r) => String(r._id)),
    details: results.map((r) => ({
      studentId: String(r._id),
      feeCount: r.feeCountWithPayments,
      totalSplitPaid: r.totalSplitPaid,
      feeIds: r.feeIds,
    })),
  };
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
  mapAuthoritativeFeesByStudent,
  getAuthoritativeFeeIds,
  getAuthoritativeFeeIdsMemory,
  recalculateStudentFeePaidAmount,
  getSplitPaymentStudentSummary,
};

