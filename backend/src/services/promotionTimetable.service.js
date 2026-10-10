const Timetable = require("../models/timetable.model");
const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const notificationService = require("./notification.service");
const logger = require("../utils/logger");

/**
 * PROMOTION → TIMETABLE AVAILABILITY SERVICE (Issue #533)
 *
 * After a student is promoted, checks whether a PUBLISHED timetable exists
 * for the student's NEW academic context.  When no published timetable is
 * found, notifies the relevant HOD so they can create/publish one.
 *
 * IMPORTANT:
 * - Fire-and-forget: failures must NEVER cause a successful promotion to fail.
 * - Only PUBLISHED timetables count (DRAFT and ARCHIVED are ignored).
 * - The previous-semester timetable is never modified.
 */

/**
 * Check timetable availability for a single promoted student and, when no
 * PUBLISHED timetable exists, notify the department's HOD.
 *
 * @param {Object} params
 * @param {Object} params.student       — Student document (post-promotion, with updated fields)
 * @param {string} params.actorId       — User who executed the promotion
 * @param {string} params.actorRole     — Role of the actor (e.g. COLLEGE_ADMIN)
 * @param {string} params.collegeId     — College ObjectId (tenant scope)
 * @param {number} params.toSemester    — The NEW semester after promotion
 * @param {string} params.newAcademicYear — The NEW academic year after promotion
 * @returns {Promise<{ timetableAvailable: boolean, notificationSent: boolean, reason?: string }>}
 */
const checkTimetableAvailabilityAfterPromotion = async ({
  student,
  actorId,
  actorRole,
  collegeId,
  toSemester,
  newAcademicYear,
}) => {
  try {
    const semester = toSemester ?? student.currentSemester;
    const academicYear = newAcademicYear ?? student.currentAcademicYear;
    const departmentId = student.department_id?._id || student.department_id;
    const courseId = student.course_id?._id || student.course_id;
    const division = student.division || null;

    // ── 1. Query for a PUBLISHED timetable in the target context ──
    const timetableQuery = {
      college_id: collegeId,
      department_id: departmentId,
      course_id: courseId,
      semester,
      academicYear,
      status: "PUBLISHED",
    };
    if (division) {
      timetableQuery.$or = [{ division }, { division: null }];
    }

    const publishedTimetable = await Timetable.findOne(timetableQuery)
      .select("_id")
      .lean();

    if (publishedTimetable) {
      return { timetableAvailable: true, notificationSent: false };
    }

    // ── 2. No published timetable → resolve HOD ──
    const hodUserId = await resolveHodUserIdForDepartment(
      departmentId,
      collegeId,
    );

    if (!hodUserId) {
      logger.logWarning(
        "[PROMOTION_TIMETABLE] HOD could not be resolved — skipping timetable notification",
        {
          collegeId,
          departmentId: String(departmentId),
          semester,
          academicYear,
        },
      );
      return {
        timetableAvailable: false,
        notificationSent: false,
        reason: "HOD_NOT_RESOLVED",
      };
    }

    // ── 3. Send deduplicated HOD notification ──
    const sent = await notificationService.notifyHodTimetableRequiredAfterPromotion({
      collegeId,
      actorId,
      actorRole,
      hodUserId,
      departmentId,
      courseId,
      semester,
      academicYear,
    });

    return {
      timetableAvailable: false,
      notificationSent: !!sent,
    };
  } catch (error) {
    // Non-fatal: log and return a safe result so promotion is unaffected.
    logger.logError(
      "[PROMOTION_TIMETABLE] Timetable availability check failed",
      {
        error: error.message,
        stack: error.stack,
        studentId: String(student?._id),
        collegeId: String(collegeId),
      },
    );
    return {
      timetableAvailable: false,
      notificationSent: false,
      reason: "CHECK_FAILED",
    };
  }
};

/**
 * Batch-check timetable availability for multiple promoted students at once.
 * De-duplicates by unique academic context so the HOD receives at most one
 * notification per (college, department, course, semester, academicYear, division).
 *
 * @param {Array<Object>} promotedStudents — array of { student, toSemester, newAcademicYear }
 * @param {string} actorId
 * @param {string} actorRole
 * @param {string} collegeId
 * @returns {Promise<void>}
 */
const checkTimetableAvailabilityForBulkPromotion = async ({
  promotedStudents,
  actorId,
  actorRole,
  collegeId,
}) => {
  try {
    if (!promotedStudents || promotedStudents.length === 0) return;

    // Build unique context keys
    const seen = new Set();
    const uniqueContexts = [];

    for (const item of promotedStudents) {
      const student = item.student || item;
      const toSemester = item.toSemester ?? student.currentSemester;
      const newAcademicYear = item.newAcademicYear ?? student.currentAcademicYear;
      const departmentId = String(
        student.department_id?._id || student.department_id || "",
      );
      const courseId = String(student.course_id?._id || student.course_id || "");
      const division = student.division || "";
      const key = `${departmentId}|${courseId}|${toSemester}|${newAcademicYear}|${division}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueContexts.push({ student, toSemester, newAcademicYear });
      }
    }

    // Check each unique context (serially to avoid notification storms)
    for (const ctx of uniqueContexts) {
      await checkTimetableAvailabilityAfterPromotion({
        student: ctx.student,
        actorId,
        actorRole,
        collegeId,
        toSemester: ctx.toSemester,
        newAcademicYear: ctx.newAcademicYear,
      });
    }
  } catch (error) {
    // Non-fatal
    logger.logError(
      "[PROMOTION_TIMETABLE] Bulk timetable availability check failed",
      { error: error.message },
    );
  }
};

/* =========================================================
   INTERNAL HELPERS
========================================================= */

/**
 * Resolve the user_id of the HOD for a given department + college.
 *
 * Primary: Department.hod_id → Teacher._id → Teacher.user_id
 * Fallback: Teacher in department populated with user role HOD
 *
 * @param {ObjectId|string} departmentId
 * @param {ObjectId|string} collegeId
 * @returns {Promise<ObjectId|null>}  HOD's user_id, or null when unresolvable.
 */
const resolveHodUserIdForDepartment = async (departmentId, collegeId) => {
  try {
    const department = await Department.findOne({
      _id: departmentId,
      college_id: collegeId,
    })
      .select("hod_id")
      .lean();

    if (department?.hod_id) {
      const teacher = await Teacher.findOne({
        _id: department.hod_id,
        college_id: collegeId,
      })
        .select("user_id")
        .lean();

      if (teacher?.user_id) {
        return teacher.user_id;
      }
    }

    // Fallback: Check for a teacher in this department whose user account has role HOD
    const fallbackTeacher = await Teacher.findOne({
      department_id: departmentId,
      college_id: collegeId,
    })
      .populate({
        path: "user_id",
        match: { role: "HOD", isActive: true },
        select: "_id role isActive",
      })
      .lean();

    if (fallbackTeacher?.user_id?._id) {
      return fallbackTeacher.user_id._id;
    }

    return null;
  } catch (error) {
    logger.logError("[PROMOTION_TIMETABLE] Error resolving HOD for department", {
      departmentId: String(departmentId),
      collegeId: String(collegeId),
      error: error.message,
    });
    return null;
  }
};

module.exports = {
  checkTimetableAvailabilityAfterPromotion,
  checkTimetableAvailabilityForBulkPromotion,
  resolveHodUserIdForDepartment,
};
