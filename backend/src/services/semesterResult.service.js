const mongoose = require("mongoose");
const SemesterResult = require("../models/semesterResult.model");
const Exam = require("../models/exam.model");
const Student = require("../models/student.model");
const Subject = require("../models/subject.model");
const StudentMarks = require("../models/studentMarks.model");
const AppError = require("../utils/AppError");
const { RESULT_STATUS } = require("../utils/constants");
const { validateUnlockReason } = require("../utils/resultLifecycle.util");
const { calculateSubjectResult } = require("./examCalculation.service");

/**
 * Centralized SemesterResult generation service.
 *
 * Flow:
 *   1. Load the Exam (college-scoped) — validates ownership/tenant isolation.
 *   2. Validate the student belongs to the exam's college + course + semester.
 *   3. For every applicant Exam subject:
 *        - locate the student's StudentMarks (if any)
 *        - feed the Exam SUBJECT SNAPSHOT + marks into ExamCalculationService
 *   4. Aggregate subject statuses into totals + an overall result.
 *   5. Upsert the SemesterResult (no duplicates on re-generation).
 *
 * The ExamCalculationService is the single source of truth for per-subject
 * pass/fail. This layer only aggregates already-calculated outcomes.
 */

/**
 * Compute the overall semester result from a list of subject statuses.
 *
 * Rule (per task spec — no ATKT / grace behaviour):
 *   - INCOMPLETE wins if any applicable subject is INCOMPLETE
 *   - else FAIL if any applicable subject is FAIL
 *   - else PASS only when every applicable subject is PASS
 *
 * Pure function — exported for unit testing without a database.
 */
const calculateOverallResult = (statuses = []) => {
  if (statuses.length === 0) return "INCOMPLETE";

  if (statuses.some((s) => s === "INCOMPLETE")) return "INCOMPLETE";
  if (statuses.some((s) => s === "FAIL")) return "FAIL";
  if (statuses.every((s) => s === "PASS")) return "PASS";

  return "INCOMPLETE";
};

/**
 * Generate (or regenerate) the SemesterResult for one student + one Exam.
 *
 * @param {Object} params
 * @param {ObjectId/String} params.collegeId
 * @param {ObjectId/String} params.studentId
 * @param {ObjectId/String} params.examId
 * @param {ObjectId/String} params.userId  actor generating the result
 * @returns {Promise<SemesterResult>} the persisted result document
 */
exports.generateSemesterResult = async ({ collegeId, studentId, examId, userId }) => {
  // 1. Load Exam (college-scoped) — cross-college Exams are invisible.
  const exam = await Exam.findOne({ _id: examId, college_id: collegeId });
  if (!exam) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }

  // 2. Validate the student belongs to the exam's college + academic context.
  const student = await Student.findOne({ _id: studentId, college_id: collegeId });
  if (!student) {
    throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
  }

  if (String(student.course_id) !== String(exam.course_id)) {
    throw new AppError(
      "Student does not belong to the exam's course",
      400,
      "STUDENT_COURSE_MISMATCH",
    );
  }

  if (Number(student.currentSemester) !== Number(exam.semester)) {
    throw new AppError(
      "Student's current semester does not match the exam's semester",
      400,
      "STUDENT_SEMESTER_MISMATCH",
    );
  }

  // 3. Exam subjects (snapshot) drive calculation.
  const examSubjects = exam.subjects || [];
  if (examSubjects.length === 0) {
    throw new AppError("Exam has no subjects", 400, "EXAM_NO_SUBJECTS");
  }

  // Snapshot subject name/code so the result is readable even if the Subject
  // is later renamed. Subjects that can't be found are still recorded with just
  // the reference + calculation.
  const subjectIds = examSubjects.map((s) => s.subject);
  const subjectDocs = await Subject.find({
    _id: { $in: subjectIds },
    college_id: collegeId,
  });
  const subjectMap = new Map(subjectDocs.map((s) => [String(s._id), s]));

  // Load all the student's marks for this exam in a single query.
  const studentMarks = await StudentMarks.find({
    college_id: collegeId,
    exam_id: examId,
    student_id: studentId,
  });
  const marksMap = new Map(studentMarks.map((m) => [String(m.subject_id), m]));

  // 4. Per-subject calculation reusing the centralized service.
  const subjects = [];
  let passedSubjects = 0;
  let failedSubjects = 0;
  let incompleteSubjects = 0;

  for (const examSubject of examSubjects) {
    const subjectId = String(examSubject.subject);
    const marksRecord = marksMap.get(subjectId);
    const marksRecorded = !!marksRecord;

    // Missing StudentMarks => treat as INCOMPLETE, never coerce null -> 0.
    const marks = marksRecorded
      ? { internalMarks: marksRecord.internalMarks, externalMarks: marksRecord.externalMarks }
      : { internalMarks: null, externalMarks: null };

    const calculation = calculateSubjectResult(examSubject, marks);
    const subjectDoc = subjectMap.get(subjectId);

    subjects.push({
      subject: examSubject.subject,
      subjectName: subjectDoc ? subjectDoc.name : undefined,
      subjectCode: subjectDoc ? subjectDoc.code : undefined,
      subjectType: calculation.subjectType,
      internalMarks: calculation.internalMarks,
      externalMarks: calculation.externalMarks,
      totalMarks: calculation.totalMarks,
      internalPassed: calculation.internalPassed,
      externalPassed: calculation.externalPassed,
      passed: calculation.passed,
      status: calculation.status,
      marksRecorded,
    });

    if (calculation.status === "PASS") passedSubjects++;
    else if (calculation.status === "FAIL") failedSubjects++;
    else incompleteSubjects++;
  }

  const overallResult = calculateOverallResult(
    subjects.map((s) => s.status),
  );

const persistedResult = {
    college_id: collegeId,
    student_id: studentId,
    exam_id: examId,
    course_id: exam.course_id,
    semester: exam.semester,
    academicYear: exam.academicYear,
    subjects,
    totalSubjects: subjects.length,
    passedSubjects,
    failedSubjects,
    incompleteSubjects,
    overallResult,
    calculatedAt: new Date(),
    status: RESULT_STATUS.DRAFT,
    updatedBy: userId,
  };

  // 5. Upsert: create-or-update on (college, student, exam). No duplicates.
  const existing = await SemesterResult.findOne({
    college_id: collegeId,
    student_id: studentId,
    exam_id: examId,
  });

  if (existing) {
    // Step 7 — lifecycle protection: regeneration is only allowed on DRAFT
    // results. LOCKED / PUBLISHED results must not be silently overwritten.
    if (existing.status !== RESULT_STATUS.DRAFT) {
      throw new AppError(
        `Cannot regenerate result: current status is ${existing.status}`,
        409,
        "RESULT_NOT_MUTABLE",
        { resultId: existing._id, status: existing.status },
      );
    }

    existing.subjects = persistedResult.subjects;
    existing.totalSubjects = persistedResult.totalSubjects;
    existing.passedSubjects = persistedResult.passedSubjects;
    existing.failedSubjects = persistedResult.failedSubjects;
    existing.incompleteSubjects = persistedResult.incompleteSubjects;
    existing.overallResult = persistedResult.overallResult;
    existing.calculatedAt = persistedResult.calculatedAt;
    existing.updatedBy = userId;
    await existing.save();
    return existing;
  }

  return SemesterResult.create({ ...persistedResult, createdBy: userId });
};

exports.calculateOverallResult = calculateOverallResult;

// ---------------------------------------------------------------------------
// STEP 7 — Result lifecycle: LOCK / UNLOCK / PUBLISH
//
// Allowed transitions (enforced atomically via conditional findOneAndUpdate):
//   DRAFT    -> LOCKED
//   LOCKED   -> DRAFT   (authorized unlock, reason required)
//   LOCKED   -> PUBLISHED
//
// DRAFT -> PUBLISHED is NOT allowed (must lock first).
// PUBLISHED is terminal (no DRAFT/LOCKED transition).
// ---------------------------------------------------------------------------

/**
 * Load a SemesterResult scoped to the authenticated college (tenant isolation).
 * Returns null for both non-existent and cross-college documents (no leakage).
 */
const findResultInCollege = async (resultId, collegeId) =>
  SemesterResult.findOne({ _id: resultId, college_id: collegeId });

/**
 * Lock a DRAFT SemesterResult (DRAFT -> LOCKED).
 *
 * Uses a conditional update (status = DRAFT) so concurrent lock attempts resolve
 * to a single winner; the second caller receives a 409 conflict.
 */
exports.lockResult = async ({ resultId, collegeId, userId }) => {
  const existing = await findResultInCollege(resultId, collegeId);
  if (!existing) {
    throw new AppError("SemesterResult not found", 404, "RESULT_NOT_FOUND");
  }

  const updated = await SemesterResult.findOneAndUpdate(
    { _id: resultId, college_id: collegeId, status: RESULT_STATUS.DRAFT },
    {
      $set: {
        status: RESULT_STATUS.LOCKED,
        lockedBy: userId,
        lockedAt: new Date(),
        updatedBy: userId,
      },
    },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new AppError(
      `Cannot lock result: current status is ${existing.status}`,
      409,
      "RESULT_INVALID_TRANSITION",
      { resultId: existing._id, currentStatus: existing.status },
    );
  }

  return updated;
};

/**
 * Unlock a LOCKED SemesterResult (LOCKED -> DRAFT).
 *
 * A non-empty unlock reason (max 500 chars, trimmed) is mandatory.
 * Lock metadata (lockedBy/lockedAt) is retained as history; the reason is
 * recorded on the document and in the audit log.
 */
exports.unlockResult = async ({ resultId, collegeId, userId, reason }) => {
  const trimmedReason = validateUnlockReason(reason);

  const existing = await findResultInCollege(resultId, collegeId);
  if (!existing) {
    throw new AppError("SemesterResult not found", 404, "RESULT_NOT_FOUND");
  }

  const updated = await SemesterResult.findOneAndUpdate(
    { _id: resultId, college_id: collegeId, status: RESULT_STATUS.LOCKED },
    {
      $set: {
        status: RESULT_STATUS.DRAFT,
        unlockReason: trimmedReason,
        updatedBy: userId,
      },
    },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new AppError(
      `Cannot unlock result: current status is ${existing.status}`,
      409,
      "RESULT_INVALID_TRANSITION",
      { resultId: existing._id, currentStatus: existing.status },
    );
  }

  return updated;
};

/**
 * Publish a LOCKED SemesterResult (LOCKED -> PUBLISHED).
 *
 * DRAFT results cannot be published directly; PUBLISHED results are terminal.
 */
exports.publishResult = async ({ resultId, collegeId, userId }) => {
  const existing = await findResultInCollege(resultId, collegeId);
  if (!existing) {
    throw new AppError("SemesterResult not found", 404, "RESULT_NOT_FOUND");
  }

  const updated = await SemesterResult.findOneAndUpdate(
    { _id: resultId, college_id: collegeId, status: RESULT_STATUS.LOCKED },
    {
      $set: {
        status: RESULT_STATUS.PUBLISHED,
        publishedBy: userId,
        publishedAt: new Date(),
        updatedBy: userId,
      },
    },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new AppError(
      `Cannot publish result: current status is ${existing.status}`,
      409,
      "RESULT_INVALID_TRANSITION",
      { resultId: existing._id, currentStatus: existing.status },
    );
  }

  return updated;
};

/**
 * Load a single SemesterResult for review (college-scoped).
 */
exports.getResultById = async ({ resultId, collegeId }) =>
  findResultInCollege(resultId, collegeId);

/**
 * GET /api/results/my-results
 *
 * Return all PUBLISHED SemesterResults for the authenticated student.
 * Identity is derived from the authenticated user — never from request params.
 * College isolation is enforced via college_id from the request context.
 *
 * @param {Object} params
 * @param {ObjectId|string} params.collegeId  from collegeMiddleware
 * @param {ObjectId|string} params.userId     from auth middleware (User._id)
 * @returns {Promise<SemesterResult[]>}
 */
exports.getMyResults = async ({ collegeId, userId }) => {
  const student = await Student.findOne({
    user_id: userId,
    college_id: collegeId,
  }).select("_id");

  if (!student) {
    throw new AppError("Student profile not found", 404, "STUDENT_NOT_FOUND");
  }

  return SemesterResult.find({
    college_id: collegeId,
    student_id: student._id,
    status: RESULT_STATUS.PUBLISHED,
  })
    .populate("exam_id", "name semester academicYear")
    .populate("course_id", "name code")
    .sort({ createdAt: -1 })
    .lean();
};

// ---------------------------------------------------------------------------
// STEP 7b — Exam-level result operations (Coordinator workflow)
//
// These operate on every SemesterResult that belongs to a given Exam, always
// scoped to the authenticated college. They power the Coordinator's
// exam-centric dashboard / review / lock / publish screens.
// ---------------------------------------------------------------------------

/**
 * List every SemesterResult for an Exam (college-scoped) plus a summary.
 *
 * Summary counts:
 *   totalStudents      — total result rows for this exam
 *   generated          — students with a result (any status)
 *   passed / failed    — by overallResult
 *   byStatus           — { DRAFT, LOCKED, PUBLISHED } counts
 *   lastUpdated        — newest calculatedAt across the set
 */
exports.getResultsByExam = async ({ collegeId, examId }) => {
  const exam = await Exam.findOne({ _id: examId, college_id: collegeId });
  if (!exam) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }

  const results = await SemesterResult.find({
    college_id: collegeId,
    exam_id: examId,
  })
    .populate("student_id", "fullName enrollmentNumber rollNumber")
    .sort({ "student_id.fullName": 1 })
    .lean();

  const byStatus = { DRAFT: 0, LOCKED: 0, PUBLISHED: 0 };
  let passed = 0;
  let failed = 0;
  let lastUpdated = null;

  for (const r of results) {
    if (r.status && byStatus[r.status] !== undefined) byStatus[r.status]++;
    if (r.overallResult === "PASS") passed++;
    else if (r.overallResult === "FAIL") failed++;
    if (r.calculatedAt && (!lastUpdated || new Date(r.calculatedAt) > new Date(lastUpdated))) {
      lastUpdated = r.calculatedAt;
    }
  }

  return {
    exam: {
      _id: exam._id,
      name: exam.name,
      course_id: exam.course_id,
      semester: exam.semester,
      academicYear: exam.academicYear,
      subjectCount: (exam.subjects || []).length,
      status: exam.status,
    },
    summary: {
      totalStudents: results.length,
      passed,
      failed,
      incomplete: results.length - passed - failed,
      byStatus,
      lastUpdated,
    },
    results,
  };
};

/**
 * GET /api/results/exam-summaries
 *
 * Return exam-level result summaries for EVERY exam that has at least one
 * SemesterResult in the authenticated college — in a single aggregation.
 *
 * This replaces the N+1 pattern where the coordinator dashboard called
 * getResultsByExam once per exam. The aggregation groups by exam_id and
 * computes the same summary shape used by getResultsByExam, without
 * transferring full result documents or student populates.
 *
 * Summary per exam:
 *   totalStudents      — total result rows for this exam
 *   passed / failed    — by overallResult
 *   incomplete         — remainder (INCOMPLETE)
 *   byStatus           — { DRAFT, LOCKED, PUBLISHED } counts
 *   lastUpdated        — newest calculatedAt across the set
 *
 * @param {Object} params
 * @param {ObjectId|string} params.collegeId  from collegeMiddleware
 * @returns {Promise<Array<{examId, summary}>>}
 */
exports.getExamResultSummaries = async ({ collegeId }) => {
  const pipeline = [
    { $match: { college_id: new mongoose.Types.ObjectId(collegeId) } },
    {
      $group: {
        _id: "$exam_id",
        totalStudents: { $sum: 1 },
        passed: {
          $sum: { $cond: [{ $eq: ["$overallResult", "PASS"] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$overallResult", "FAIL"] }, 1, 0] },
        },
        incomplete: {
          $sum: { $cond: [{ $eq: ["$overallResult", "INCOMPLETE"] }, 1, 0] },
        },
        draftCount: {
          $sum: { $cond: [{ $eq: ["$status", RESULT_STATUS.DRAFT] }, 1, 0] },
        },
        lockedCount: {
          $sum: { $cond: [{ $eq: ["$status", RESULT_STATUS.LOCKED] }, 1, 0] },
        },
        publishedCount: {
          $sum: { $cond: [{ $eq: ["$status", RESULT_STATUS.PUBLISHED] }, 1, 0] },
        },
        lastUpdated: { $max: "$calculatedAt" },
      },
    },
  ];

  const aggregated = await SemesterResult.aggregate(pipeline);

  return aggregated.map((item) => ({
    examId: item._id,
    summary: {
      totalStudents: item.totalStudents,
      passed: item.passed,
      failed: item.failed,
      incomplete: item.incomplete,
      byStatus: {
        [RESULT_STATUS.DRAFT]: item.draftCount,
        [RESULT_STATUS.LOCKED]: item.lockedCount,
        [RESULT_STATUS.PUBLISHED]: item.publishedCount,
      },
      lastUpdated: item.lastUpdated,
    },
  }));
};

/**
 * Generate (or regenerate) SemesterResults for EVERY eligible student in an
 * Exam. Reuses the per-student generateSemesterResult so all calculation,
 * validation and lifecycle rules stay in one place.
 *
 * Students already having a LOCKED or PUBLISHED result are skipped (they are
 * immutable); DRAFT results are regenerated in place.
 *
 * Returns a summary of what was done.
 */
exports.generateResultsForExam = async ({ collegeId, examId, userId }) => {
  const exam = await Exam.findOne({ _id: examId, college_id: collegeId });
  if (!exam) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }

  const examSubjects = exam.subjects || [];
  if (examSubjects.length === 0) {
    throw new AppError("Exam has no subjects", 400, "EXAM_NO_SUBJECTS");
  }

  const students = await Student.find({
    college_id: collegeId,
    course_id: exam.course_id,
    currentSemester: exam.semester,
    status: { $in: ["APPROVED", "ENROLLED", "OFFER_MADE"] },
  }).select("_id");

  if (students.length === 0) {
    throw new AppError(
      "No approved students found for this exam's course and semester",
      400,
      "NO_ELIGIBLE_STUDENTS",
    );
  }

  let generated = 0;
  let skipped = 0;
  const errors = [];

  for (const student of students) {
    try {
      const existing = await SemesterResult.findOne({
        college_id: collegeId,
        student_id: student._id,
        exam_id: examId,
      });

      if (existing && existing.status !== RESULT_STATUS.DRAFT) {
        skipped++;
        continue;
      }

      await exports.generateSemesterResult({
        collegeId,
        studentId: student._id,
        examId,
        userId,
      });
      generated++;
    } catch (err) {
      errors.push({ studentId: student._id, message: err.message });
    }
  }

  return {
    examId,
    totalStudents: students.length,
    generated,
    skipped,
    errors,
  };
};

/**
 * Lock every DRAFT SemesterResult for an Exam (college-scoped).
 * LOCKED / PUBLISHED results are left untouched.
 */
exports.lockResultsForExam = async ({ collegeId, examId, userId }) => {
  const exam = await Exam.findOne({ _id: examId, college_id: collegeId });
  if (!exam) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }

  const now = new Date();
  const updateResult = await SemesterResult.updateMany(
    { college_id: collegeId, exam_id: examId, status: RESULT_STATUS.DRAFT },
    {
      $set: {
        status: RESULT_STATUS.LOCKED,
        lockedBy: userId,
        lockedAt: now,
        updatedBy: userId,
      },
    },
  );

  return {
    examId,
    matched: updateResult.matchedCount || 0,
    modified: updateResult.modifiedCount || 0,
  };
};

/**
 * Publish every LOCKED SemesterResult for an Exam (college-scoped).
 * DRAFT / PUBLISHED results are left untouched.
 */
exports.publishResultsForExam = async ({ collegeId, examId, userId }) => {
  const exam = await Exam.findOne({ _id: examId, college_id: collegeId });
  if (!exam) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }

  const now = new Date();
  const updateResult = await SemesterResult.updateMany(
    { college_id: collegeId, exam_id: examId, status: RESULT_STATUS.LOCKED },
    {
      $set: {
        status: RESULT_STATUS.PUBLISHED,
        publishedBy: userId,
        publishedAt: now,
        updatedBy: userId,
      },
    },
  );

  return {
    examId,
    matched: updateResult.matchedCount || 0,
    modified: updateResult.modifiedCount || 0,
  };
};
