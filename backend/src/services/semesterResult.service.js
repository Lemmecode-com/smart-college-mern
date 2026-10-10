const mongoose = require("mongoose");
const SemesterResult = require("../models/semesterResult.model");
const Exam = require("../models/exam.model");
const Student = require("../models/student.model");
const Subject = require("../models/subject.model");
const StudentMarks = require("../models/studentMarks.model");
const Notification = require("../models/notification.model");
const Backlog = require("../models/backlog.model");
const BacklogAttempt = require("../models/backlogAttempt.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");
const { RESULT_STATUS } = require("../utils/constants");
const { validateUnlockReason } = require("../utils/resultLifecycle.util");
const {
  calculateSubjectResult,
  calculateSemesterTotals,
} = require("./examCalculation.service");
const { evaluateAttempt } = require("./backlogAttempt.service");
const logger = require("../utils/logger");

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
exports.generateSemesterResult = async ({
  collegeId,
  studentId,
  examId,
  userId,
}) => {
  // 1. Load Exam (college-scoped) — cross-college Exams are invisible.
  const exam = await Exam.findOne({ _id: examId, college_id: collegeId });
  if (!exam) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }

  // 2. Validate the student belongs to the exam's college + academic context.
  const student = await Student.findOne({
    _id: studentId,
    college_id: collegeId,
  });
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
  // Backlog papers in unified exams must not pollute regular SemesterResult.
  const examSubjects = (exam.subjects || []).filter(
    (s) => s.category !== "BACKLOG",
  );
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
      ? {
          internalMarks: marksRecord.internalMarks,
          externalMarks: marksRecord.externalMarks,
        }
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
      internalMaxMarks: calculation.internalMaxMarks,
      externalMaxMarks: calculation.externalMaxMarks,
      maxMarks: calculation.maxMarks,
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

  const overallResult = calculateOverallResult(subjects.map((s) => s.status));
  const { totalMarks, totalMaxMarks, percentage } = calculateSemesterTotals(
    subjects,
    overallResult,
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
    totalMarks,
    totalMaxMarks,
    percentage,
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
    existing.totalMarks = persistedResult.totalMarks;
    existing.totalMaxMarks = persistedResult.totalMaxMarks;
    existing.percentage = persistedResult.percentage;
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

  if (existing.status !== RESULT_STATUS.LOCKED) {
    throw new AppError(
      `Cannot publish result: current status is ${existing.status}`,
      409,
      "RESULT_INVALID_TRANSITION",
      { resultId: existing._id, currentStatus: existing.status },
    );
  }

  const incompleteSubjects = (existing.subjects || []).filter(
    (s) => s.status === "INCOMPLETE",
  );

  if (incompleteSubjects.length > 0) {
    const issues = incompleteSubjects.map((s) => ({
      studentId: existing.student_id,
      studentName: existing.student_id?.fullName || undefined,
      enrollmentNumber: existing.student_id?.enrollmentNumber || undefined,
      subjectId: s.subject,
      subjectName: s.subjectName || s.subject || undefined,
      issue: s.marksRecorded === false ? "MARKS_NOT_ENTERED" : "MARKS_INCOMPLETE",
    }));

    throw new AppError(
      "Result cannot be published because some required marks are incomplete.",
      409,
      "INCOMPLETE_MARKS",
      {
        totalAffectedStudents: 1,
        totalIncompleteSubjects: incompleteSubjects.length,
        issues,
      },
    );
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

  // Fire-and-forget student notification
  (async () => {
    try {
      const student = await Student.findById(existing.student_id).select("user_id").lean();
      if (student?.user_id) {
        const exam = await Exam.findById(existing.exam_id).select("name").lean();
        await Notification.create({
          college_id: collegeId,
          createdBy: userId,
          createdByRole: "EXAM_COORDINATOR",
          target: "INDIVIDUAL",
          target_users: [student.user_id],
          title: "📊 Exam Result Published",
          message: `Your result for ${exam?.name || "the exam"} has been published.`,
          type: "EXAM",
          priority: "HIGH",
          actionUrl: "/student/results",
        });
        logger.logInfo("Exam result notification sent", {
          collegeId,
          resultId: existing._id,
          studentId: existing.student_id,
        });
      }
    } catch (notifErr) {
      logger.logError("Failed to send exam result notification", {
        error: notifErr.message,
        resultId: existing._id,
      });
    }
  })();

  // Fire-and-forget backlog attempt auto-evaluation for this student if taking a backlog paper
  (async () => {
    try {
      const studentAttempt = await BacklogAttempt.findOne({
        college_id: collegeId,
        exam_id: existing.exam_id,
        student_id: existing.student_id,
        result_status: "INCOMPLETE",
      });
      if (studentAttempt) {
        await evaluateAttempt({
          attemptId: studentAttempt._id,
          collegeId,
          actorId: userId,
          actorRole: "COLLEGE_ADMIN",
        });
        logger.logInfo("Backlog attempt auto-evaluated on publishResult", {
          attemptId: studentAttempt._id,
          studentId: existing.student_id,
        });
      }
    } catch (evalErr) {
      logger.logError("Failed to auto-evaluate backlog attempt on publishResult", {
        error: evalErr.message,
        resultId: existing._id,
      });
    }
  })();

  return updated;
};

/**
 * Load a single SemesterResult for review (college-scoped).
 * Populates student, exam, course, and actor metadata for the review screen.
 */
exports.getResultById = async ({ resultId, collegeId }) =>
  SemesterResult.findOne({ _id: resultId, college_id: collegeId })
    .populate("student_id", "fullName enrollmentNumber rollNumber email")
    .populate("exam_id", "name semester academicYear")
    .populate("course_id", "name code")
    .populate("lockedBy", "name email")
    .populate("publishedBy", "name email")
    .lean();

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

  const regularResults = await SemesterResult.find({
    college_id: collegeId,
    student_id: student._id,
    status: RESULT_STATUS.PUBLISHED,
  })
    .populate("exam_id", "name semester academicYear status subjects")
    .populate("course_id", "name code")
    .sort({ createdAt: -1 })
    .lean();

  // P0 Security Fix:
  // Identify all exams in this college where results are officially PUBLISHED.
  // Backlog attempts must only be exposed if their associated exam results are published.
  const publishedExamIds = await SemesterResult.distinct("exam_id", {
    college_id: collegeId,
    status: RESULT_STATUS.PUBLISHED,
  });
  const publishedExamIdSet = new Set(publishedExamIds.map(String));

  // Query backlog attempts scoped to this student & college,
  // restricted to evaluated outcomes (PASS/FAIL) in published exams.
  const rawBacklogAttempts = await BacklogAttempt.find({
    college_id: collegeId,
    student_id: student._id,
    result_status: { $in: ["PASS", "FAIL"] },
    exam_id: { $in: publishedExamIds },
  })
    .populate("exam_id", "name semester academicYear status")
    .populate("backlog_id", "semester academicYear")
    .populate("subject_id", "name code subjectType")
    .populate("result_id", "status")
    .sort({ attempt_number: 1, created_at: 1 })
    .lean();

  // Strict publication & evaluation filter:
  // - Exam must be PUBLISHED
  // - Exam results must be officially PUBLISHED in the college
  // - Linked direct result (if any, e.g. supplementary) must be PUBLISHED
  // - Attempt result_status must be PASS or FAIL (never INCOMPLETE)
  const visibleAttempts = rawBacklogAttempts.filter((attempt) => {
    if (!attempt.exam_id || attempt.exam_id.status !== "PUBLISHED") {
      return false;
    }
    const examIdStr = String(attempt.exam_id?._id || attempt.exam_id);
    if (!publishedExamIdSet.has(examIdStr)) {
      return false;
    }
    if (attempt.result_id && attempt.result_id.status !== RESULT_STATUS.PUBLISHED) {
      return false;
    }
    if (attempt.result_status !== "PASS" && attempt.result_status !== "FAIL") {
      return false;
    }
    return true;
  });

  // Group attempts by backlog_id to assemble complete historical attempt chains
  const attemptsByBacklog = new Map();
  for (const attempt of visibleAttempts) {
    const bId = String(attempt.backlog_id?._id || attempt.backlog_id);
    if (!attemptsByBacklog.has(bId)) {
      attemptsByBacklog.set(bId, []);
    }
    attemptsByBacklog.get(bId).push({
      attemptId: attempt._id,
      attemptNumber: attempt.attempt_number,
      examId: attempt.exam_id?._id || attempt.exam_id,
      examName: attempt.exam_name || attempt.exam_id?.name || "Exam",
      semester: attempt.backlog_id?.semester,
      academicYear: attempt.backlog_id?.academicYear,
      internalMarks: attempt.internal_marks,
      externalMarks: attempt.external_marks,
      totalMarks: attempt.total_marks,
      marks: {
        internalMarks: attempt.internal_marks,
        externalMarks: attempt.external_marks,
        totalMarks: attempt.total_marks,
      },
      resultStatus: attempt.result_status,
      status: attempt.result_status,
      passed: attempt.passed,
      cleared: attempt.cleared,
      evaluatedAt: attempt.evaluated_at,
    });
  }

  // Format visible attempts for response
  const formattedAttempts = visibleAttempts.map((attempt) => {
    const bId = String(attempt.backlog_id?._id || attempt.backlog_id);
    const history = attemptsByBacklog.get(bId) || [];
    return {
      backlogId: attempt.backlog_id?._id || attempt.backlog_id,
      attemptId: attempt._id,
      subjectId: attempt.subject_id?._id || attempt.subject_id,
      subjectName: attempt.subject_name || attempt.subject_id?.name || "Subject",
      subjectCode: attempt.subject_code || attempt.subject_id?.code || "",
      subjectType: attempt.subject_type || attempt.subject_id?.subjectType || "THEORY",
      semester: attempt.backlog_id?.semester,
      academicYear: attempt.backlog_id?.academicYear,
      examId: attempt.exam_id?._id || attempt.exam_id,
      examName: attempt.exam_name || attempt.exam_id?.name || "Exam",
      attemptNumber: attempt.attempt_number,
      resultStatus: attempt.result_status,
      status: attempt.result_status,
      internalMarks: attempt.internal_marks,
      externalMarks: attempt.external_marks,
      totalMarks: attempt.total_marks,
      marks: {
        internalMarks: attempt.internal_marks,
        externalMarks: attempt.external_marks,
        totalMarks: attempt.total_marks,
      },
      passed: attempt.passed,
      cleared: attempt.cleared,
      evaluatedAt: attempt.evaluated_at,
      attempts: history,
    };
  });

  // Track backlogs that already have at least one visible published attempt
  const attemptedBacklogIds = new Set(
    formattedAttempts.map((a) => String(a.backlogId)),
  );

  // Objective 2 — Open Backlog Completeness:
  // Query active backlogs (OPEN or ATTEMPTED) for this student in this college.
  // Backlogs that have 0 published attempts returned (unattempted or attempts in draft exams)
  // are represented so students see their active backlog status.
  const activeBacklogs = await Backlog.find({
    college_id: collegeId,
    student_id: student._id,
    status: { $in: ["OPEN", "ATTEMPTED"] },
  })
    .populate("subject_id", "name code subjectType")
    .sort({ semester: 1, created_at: 1 })
    .lean();

  const zeroAttemptBacklogs = [];
  for (const backlog of activeBacklogs) {
    const backlogIdStr = String(backlog._id);
    if (!attemptedBacklogIds.has(backlogIdStr)) {
      zeroAttemptBacklogs.push({
        backlogId: backlog._id,
        attemptId: null,
        subjectId: backlog.subject_id?._id || backlog.subject_id,
        subjectName: backlog.subject_name || backlog.subject_id?.name || "Subject",
        subjectCode: backlog.subject_code || backlog.subject_id?.code || "",
        subjectType: backlog.subject_type || backlog.subject_id?.subjectType || "THEORY",
        semester: backlog.semester,
        academicYear: backlog.academicYear,
        examId: null,
        examName: null,
        attemptNumber: 0,
        resultStatus: "OPEN",
        status: backlog.status || "OPEN",
        internalMarks: null,
        externalMarks: null,
        totalMarks: null,
        marks: {
          internalMarks: null,
          externalMarks: null,
          totalMarks: null,
        },
        passed: false,
        cleared: false,
        evaluatedAt: null,
        attempts: [],
      });
    }
  }

  const formattedBacklogs = [
    ...formattedAttempts,
    ...zeroAttemptBacklogs,
  ];

  // Attach matching backlog results to each regular SemesterResult by exam_id
  for (const result of regularResults) {
    const examIdStr = String(result.exam_id?._id || result.exam_id);
    result.backlogResults = formattedBacklogs.filter(
      (b) => b.examId && String(b.examId) === examIdStr,
    );

    // Defense-in-depth: resolve missing maxMarks or percentage for historical records
    if (
      result.totalMaxMarks === null ||
      result.totalMaxMarks === undefined ||
      result.percentage === null ||
      result.percentage === undefined
    ) {
      const examSubjectsMap = new Map(
        (result.exam_id?.subjects || []).map((s) => [String(s.subject), s]),
      );
      for (const sub of result.subjects || []) {
        if (sub.maxMarks === null || sub.maxMarks === undefined) {
          const cfg = examSubjectsMap.get(String(sub.subject));
          if (cfg) {
            const subCalc = calculateSubjectResult(cfg, {
              internalMarks: sub.internalMarks,
              externalMarks: sub.externalMarks,
            });
            sub.internalMaxMarks = subCalc.internalMaxMarks;
            sub.externalMaxMarks = subCalc.externalMaxMarks;
            sub.maxMarks = subCalc.maxMarks;
          }
        }
      }
      const totals = calculateSemesterTotals(result.subjects, result.overallResult);
      result.totalMarks = totals.totalMarks;
      result.totalMaxMarks = totals.totalMaxMarks;
      result.percentage = totals.percentage;
    }

    result.examName = result.exam_id?.name || "Semester Exam";
    result.resultStatus = result.overallResult;

    // Count active or non-cleared backlogs originating from this semester
    const semBacklogs = formattedBacklogs.filter(
      (b) =>
        Number(b.semester) === Number(result.semester) &&
        !b.cleared &&
        b.resultStatus !== "CLEARED",
    );
    result.backlogCount = semBacklogs.length;
  }

  return {
    results: regularResults,
    backlogResults: formattedBacklogs,
  };
};

/**
 * Authoritative Consolidated Academic Result Service
 *
 * Scoped strictly to authenticated student (derived from userId) and college tenant.
 *
 * Rules:
 * 1. Resolves Student by { user_id: userId, college_id: collegeId } and populates course_id.
 * 2. Throws AppError 404 if student or course is missing.
 * 3. Authoritative course duration: durationSemesters (1..8) or durationYears * 2.
 * 4. Admission path verification:
 *    - Finds all published semester results for the student in this college.
 *    - Checks lowest observed semester. If minObservedSem > 1 and entry path cannot be verified authoritatively:
 *      returns isEligible: false, status: "UNKNOWN_ADMISSION_PATH", reasons: ["..."], missingSemesters: [1..minObservedSem-1].
 * 5. Semester-by-semester authoritative resolution (1..N):
 *    - Evaluates candidates for each semester:
 *      - 0 candidates: missingSemesters (or unpublishedSemesters if draft/locked exists)
 *      - >1 candidates: ambiguousSemesters (status: "AMBIGUOUS_RESULT")
 *      - 1 candidate:
 *        - overallResult === "PASS" -> completedSemesters, resolved
 *        - overallResult === "FAIL" -> failedSemesters
 *        - overallResult === "INCOMPLETE" -> incompleteSemesters
 * 6. Backlog verification:
 *    - Queries active backlogs: Backlog.find({ college_id: collegeId, student_id: student._id, status: { $in: ["OPEN", "ATTEMPTED"] } })
 *    - If active backlogs count > 0: status: "ACTIVE_BACKLOGS", isEligible: false.
 * 7. Cleared backlogs:
 *    - Queries published BacklogAttempts where cleared: true or result_status: "PASS".
 *    - Maps them to clearedBacklogs array.
 *    - Strictly isolated: supplementary/backlog marks are NEVER added to grandTotalMarks or regular totals.
 * 8. Grand Totals:
 *    - Sums totalMarks and totalMaxMarks from regular semester results only.
 *    - Calculates aggregatePercentage = ((grandTotalMarks / grandTotalMaxMarks) * 100).toFixed(2).
 *    - If missing marks or grandTotalMaxMarks <= 0, aggregatePercentage = null (no NaN/Infinity).
 * 9. Alumni status:
 *    - student.status === "ALUMNI" does NOT bypass any academic requirements.
 *
 * @param {Object} params
 * @param {ObjectId/string} params.collegeId
 * @param {ObjectId/string} params.userId
 * @returns {Promise<Object>} Consolidated result evaluation and view model
 */
exports.getMyConsolidatedResult = async ({ collegeId, userId }) => {
  const student = await Student.findOne({
    user_id: userId,
    college_id: collegeId,
  }).populate("course_id", "name code durationSemesters durationYears programLevel");

  if (!student) {
    throw new AppError("Student profile not found", 404, "STUDENT_NOT_FOUND");
  }

  if (!student.course_id) {
    throw new AppError("Student has no assigned course", 404, "COURSE_NOT_FOUND");
  }

  const course = student.course_id;
  let totalSemesters = null;
  if (typeof course.durationSemesters === "number" && course.durationSemesters >= 1) {
    totalSemesters = Math.min(course.durationSemesters, 8);
  } else if (typeof course.durationYears === "number" && course.durationYears >= 1) {
    totalSemesters = Math.min(course.durationYears * 2, 8);
  }

  if (!totalSemesters || totalSemesters < 1) {
    throw new AppError("Authoritative course duration is invalid or not configured", 400, "COURSE_DURATION_INVALID");
  }

  const requiredSemesters = Array.from({ length: totalSemesters }, (_, i) => i + 1);

  // Load all semester results for this student and college
  const allResults = await SemesterResult.find({
    college_id: collegeId,
    student_id: student._id,
  })
    .populate("exam_id", "name semester academicYear status subjects")
    .sort({ semester: 1, createdAt: 1 })
    .lean();

  const publishedResults = allResults.filter(
    (r) => r.status === RESULT_STATUS.PUBLISHED
  );

  // Admission-Path Verification
  const observedSemesters = publishedResults
    .map((r) => Number(r.semester))
    .filter((s) => !Number.isNaN(s) && s >= 1);
  const minObservedSem = observedSemesters.length > 0 ? Math.min(...observedSemesters) : null;

  let admissionPathStatus = "STANDARD";
  const reasons = [];

  if (minObservedSem !== null && minObservedSem > 1) {
    admissionPathStatus = "UNKNOWN_ADMISSION_PATH";
    reasons.push(
      `UNKNOWN_ADMISSION_PATH: Results begin at Semester ${minObservedSem}, but student admission semester cannot be verified authoritatively.`
    );
  }

  // Semester-by-Semester Resolution
  const resolvedSemesterMap = new Map();
  const completedSemesters = [];
  const missingSemesters = [];
  const unpublishedSemesters = [];
  const failedSemesters = [];
  const incompleteSemesters = [];
  const ambiguousSemesters = [];

  for (const s of requiredSemesters) {
    const sCandidates = allResults.filter((r) => Number(r.semester) === s);
    const publishedSCandidates = sCandidates.filter(
      (r) => r.status === RESULT_STATUS.PUBLISHED
    );

    if (publishedSCandidates.length === 0) {
      if (sCandidates.length > 0) {
        unpublishedSemesters.push(s);
        reasons.push(`Semester ${s} result is not yet published (status: ${sCandidates[0].status}).`);
      } else {
        missingSemesters.push(s);
        reasons.push(`Semester ${s} has no published result.`);
      }
    } else if (publishedSCandidates.length > 1) {
      ambiguousSemesters.push(s);
      reasons.push(`Semester ${s} has multiple published result candidates (${publishedSCandidates.length}); cannot select arbitrarily.`);
    } else {
      const candidate = publishedSCandidates[0];
      const outcome = String(candidate.overallResult || "").toUpperCase();

      if (outcome === "PASS") {
        completedSemesters.push(s);
        resolvedSemesterMap.set(s, candidate);
      } else if (outcome === "FAIL") {
        failedSemesters.push(s);
        reasons.push(`Semester ${s} result outcome is FAIL.`);
      } else {
        incompleteSemesters.push(s);
        reasons.push(`Semester ${s} result outcome is ${outcome || "INCOMPLETE"}.`);
      }
    }
  }

  // Backlog Verification: Active backlogs
  const activeBacklogs = await Backlog.find({
    college_id: collegeId,
    student_id: student._id,
    status: { $in: ["OPEN", "ATTEMPTED"] },
  }).lean();

  const activeBacklogsCount = activeBacklogs.length;
  if (activeBacklogsCount > 0) {
    reasons.push(`Student has ${activeBacklogsCount} active/uncleared backlog(s). All backlogs must be cleared.`);
  }

  // Backlog Verification: Cleared backlogs from published exams
  const publishedExamIds = await SemesterResult.distinct("exam_id", {
    college_id: collegeId,
    status: RESULT_STATUS.PUBLISHED,
  });

  const rawBacklogAttempts = await BacklogAttempt.find({
    college_id: collegeId,
    student_id: student._id,
    result_status: { $in: ["PASS", "FAIL"] },
    exam_id: { $in: publishedExamIds },
  })
    .populate("exam_id", "name semester academicYear status")
    .populate("backlog_id", "semester academicYear")
    .populate("subject_id", "name code subjectType")
    .sort({ attempt_number: 1, created_at: 1 })
    .lean();

  const clearedBacklogs = rawBacklogAttempts
    .filter((a) => a.cleared === true || a.result_status === "PASS")
    .map((a) => ({
      backlogId: a.backlog_id?._id || a.backlog_id || null,
      attemptId: a._id,
      subjectCode: a.subject_code || a.subject_id?.code || "—",
      subjectName: a.subject_name || a.subject_id?.name || "Subject",
      subjectType: a.subject_type || a.subject_id?.subjectType || "THEORY",
      originalSemester: a.backlog_id?.semester != null ? Number(a.backlog_id.semester) : null,
      originalAcademicYear: a.backlog_id?.academicYear || null,
      attemptNumber: a.attempt_number != null ? Number(a.attempt_number) : 1,
      examName: a.exam_name || a.exam_id?.name || null,
      totalMarks: a.total_marks != null ? Number(a.total_marks) : null,
      resultStatus: "PASS",
      status: "CLEARED",
      cleared: true,
      evaluatedAt: a.evaluated_at || null,
    }));

  // Map Resolved Semesters Non-Mutatively
  const mappedSemesters = requiredSemesters
    .map((s) => resolvedSemesterMap.get(s))
    .filter(Boolean)
    .map((semRes) => {
      const semNum = Number(semRes.semester);
      const rawSubjects = Array.isArray(semRes.subjects) ? semRes.subjects : [];

      const subjects = rawSubjects.map((sub) => ({
        subjectCode: sub.subjectCode || "—",
        subjectName: sub.subjectName || "Unnamed Subject",
        subjectType: sub.subjectType || "THEORY",
        internalMarks: sub.internalMarks != null ? Number(sub.internalMarks) : null,
        internalMaxMarks: sub.internalMaxMarks != null ? Number(sub.internalMaxMarks) : null,
        externalMarks: sub.externalMarks != null ? Number(sub.externalMarks) : null,
        externalMaxMarks: sub.externalMaxMarks != null ? Number(sub.externalMaxMarks) : null,
        totalMarks: sub.totalMarks != null ? Number(sub.totalMarks) : null,
        maxMarks: sub.maxMarks != null ? Number(sub.maxMarks) : null,
        passed: Boolean(sub.passed),
        status: sub.status || "—",
      }));

      return {
        semesterNumber: semNum,
        academicYear: semRes.academicYear || "—",
        examName: semRes.examName || semRes.exam_id?.name || `Semester ${semNum} Examination`,
        resultDate: semRes.publishedAt || semRes.createdAt || null,
        subjects,
        totalMarks: semRes.totalMarks != null ? Number(semRes.totalMarks) : null,
        totalMaxMarks: semRes.totalMaxMarks != null ? Number(semRes.totalMaxMarks) : null,
        percentage: semRes.percentage != null ? Number(semRes.percentage) : null,
        overallResult: semRes.overallResult || "—",
        totalSubjects: semRes.totalSubjects ?? subjects.length,
        passedSubjects: semRes.passedSubjects ?? 0,
        failedSubjects: semRes.failedSubjects ?? 0,
      };
    });

  // Calculate Grand Totals Strictly from Regular Semester Results
  let grandTotalMarks = 0;
  let grandTotalMaxMarks = 0;
  let hasIncompleteMarks = false;

  if (mappedSemesters.length === 0) {
    hasIncompleteMarks = true;
  }

  for (const sem of mappedSemesters) {
    if (sem.totalMarks !== null && !Number.isNaN(sem.totalMarks)) {
      grandTotalMarks += Number(sem.totalMarks);
    } else {
      hasIncompleteMarks = true;
    }

    if (sem.totalMaxMarks !== null && !Number.isNaN(sem.totalMaxMarks)) {
      grandTotalMaxMarks += Number(sem.totalMaxMarks);
    } else {
      hasIncompleteMarks = true;
    }
  }

  let aggregatePercentage = null;
  if (!hasIncompleteMarks && grandTotalMaxMarks > 0) {
    const rawPct = (grandTotalMarks / grandTotalMaxMarks) * 100;
    if (Number.isFinite(rawPct)) {
      aggregatePercentage = Number(rawPct.toFixed(2));
    }
  }

  // Eligibility Evaluation
  const isEligible =
    admissionPathStatus === "STANDARD" &&
    missingSemesters.length === 0 &&
    unpublishedSemesters.length === 0 &&
    ambiguousSemesters.length === 0 &&
    failedSemesters.length === 0 &&
    incompleteSemesters.length === 0 &&
    activeBacklogsCount === 0 &&
    completedSemesters.length === requiredSemesters.length;

  let status = "ELIGIBLE";
  if (!isEligible) {
    if (admissionPathStatus === "UNKNOWN_ADMISSION_PATH") {
      status = "UNKNOWN_ADMISSION_PATH";
    } else if (ambiguousSemesters.length > 0) {
      status = "AMBIGUOUS_RESULT";
    } else if (activeBacklogsCount > 0) {
      status = "ACTIVE_BACKLOGS";
    } else if (failedSemesters.length > 0) {
      status = "FAILED_SEMESTERS";
    } else if (incompleteSemesters.length > 0) {
      status = "INCOMPLETE_SEMESTERS";
    } else if (unpublishedSemesters.length > 0) {
      status = "UNPUBLISHED_SEMESTERS";
    } else if (missingSemesters.length > 0) {
      status = "MISSING_SEMESTERS";
    } else {
      status = "INELIGIBLE";
    }
  }

  return {
    isEligible,
    status,
    reasons,
    requiredSemesters,
    completedSemesters,
    missingSemesters,
    unpublishedSemesters,
    failedSemesters,
    incompleteSemesters,
    ambiguousSemesters,
    activeBacklogsCount,
    student: {
      id: student._id,
      fullName: student.fullName,
      enrollmentNumber: student.enrollmentNumber || "—",
      motherName: student.motherName || "—",
      fatherName: student.fatherName || "—",
      status: student.status,
    },
    course: {
      id: course._id,
      name: course.name,
      code: course.code,
      durationYears: course.durationYears ?? null,
      durationSemesters: course.durationSemesters ?? null,
      programLevel: course.programLevel || "UG",
    },
    semesters: mappedSemesters,
    clearedBacklogs,
    grandTotalMarks: hasIncompleteMarks ? null : grandTotalMarks,
    grandTotalMaxMarks: hasIncompleteMarks ? null : grandTotalMaxMarks,
    aggregatePercentage,
    summary: {
      totalSemesters: requiredSemesters.length,
      completedSemesters: completedSemesters.length,
      grandTotalMarks: hasIncompleteMarks ? null : grandTotalMarks,
      grandTotalMaxMarks: hasIncompleteMarks ? null : grandTotalMaxMarks,
      aggregatePercentage,
      overallResult: isEligible ? "PASS" : "INCOMPLETE",
    },
  };
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
  const exam = await Exam.findOne({ _id: examId, college_id: collegeId })
    .populate("course_id", "name code")
    .lean();
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
    if (
      r.calculatedAt &&
      (!lastUpdated || new Date(r.calculatedAt) > new Date(lastUpdated))
    ) {
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
          $sum: {
            $cond: [{ $eq: ["$status", RESULT_STATUS.PUBLISHED] }, 1, 0],
          },
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

  const examSubjects = (exam.subjects || []).filter(
    (s) => s.category !== "BACKLOG",
  );
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

  const lockedResults = await SemesterResult.find({
    college_id: collegeId,
    exam_id: examId,
    status: RESULT_STATUS.LOCKED,
  }).populate("student_id", "fullName enrollmentNumber rollNumber").lean();

  const allIssues = [];
  let totalIncompleteSubjects = 0;

  for (const result of lockedResults) {
    const incompleteSubjects = (result.subjects || []).filter(
      (s) => s.status === "INCOMPLETE",
    );

    if (incompleteSubjects.length > 0) {
      totalIncompleteSubjects += incompleteSubjects.length;
      for (const s of incompleteSubjects) {
        allIssues.push({
          studentId: result.student_id,
          studentName: result.student_id?.fullName || undefined,
          enrollmentNumber: result.student_id?.enrollmentNumber || undefined,
          subjectId: s.subject,
          subjectName: s.subjectName || s.subject || undefined,
          issue: s.marksRecorded === false ? "MARKS_NOT_ENTERED" : "MARKS_INCOMPLETE",
        });
      }
    }
  }

  if (allIssues.length > 0) {
    throw new AppError(
      "Result cannot be published because some required marks are incomplete.",
      409,
      "INCOMPLETE_MARKS",
      {
        totalAffectedStudents: new Set(allIssues.map((i) => String(i.studentId))).size,
        totalIncompleteSubjects,
        issues: allIssues,
      },
    );
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

  // Fire-and-forget student notifications for newly published results
  (async () => {
    try {
      // Find only the results that were just published by this operation
      const newlyPublishedResults = await SemesterResult.find({
        college_id: collegeId,
        exam_id: examId,
        status: RESULT_STATUS.PUBLISHED,
        publishedAt: { $gte: now },
      }).populate("student_id", "user_id").lean();

      const userIds = newlyPublishedResults
        .map((r) => r.student_id?.user_id)
        .filter(Boolean);

      if (userIds.length > 0) {
        // Deduplicate user IDs
        const uniqueUserIds = [...new Set(userIds.map(String))];

        await Notification.create({
          college_id: collegeId,
          createdBy: userId,
          createdByRole: "EXAM_COORDINATOR",
          target: "INDIVIDUAL",
          target_users: uniqueUserIds,
          title: "📊 Exam Results Published",
          message: `Results for ${exam.name} have been published.`,
          type: "EXAM",
          priority: "HIGH",
          actionUrl: "/student/results",
        });
        logger.logInfo("Bulk exam results notification sent", {
          collegeId,
          examId,
          recipientCount: uniqueUserIds.length,
        });
      }
    } catch (notifErr) {
      logger.logError("Failed to send bulk exam results notification", {
        error: notifErr.message,
        examId,
      });
    }
  })();

  // Fire-and-forget backlog attempts auto-evaluation for this exam
  (async () => {
    try {
      const pendingAttempts = await BacklogAttempt.find({
        college_id: collegeId,
        exam_id: examId,
        result_status: "INCOMPLETE",
      });
      for (const attempt of pendingAttempts) {
        try {
          await evaluateAttempt({
            attemptId: attempt._id,
            collegeId,
            actorId: userId,
            actorRole: "COLLEGE_ADMIN",
          });
        } catch (attemptErr) {
          logger.logError("Failed to auto-evaluate backlog attempt in publishResultsForExam", {
            attemptId: attempt._id,
            error: attemptErr.message,
          });
        }
      }
    } catch (batchErr) {
      logger.logError("Failed to query backlog attempts for exam publish", {
        examId,
        error: batchErr.message,
      });
    }
  })();

  return {
    examId,
    matched: updateResult.matchedCount || 0,
    modified: updateResult.modifiedCount || 0,
  };
};

/**
 * Idempotently backfill missing maxMarks, totalMarks, totalMaxMarks, and percentage
 * on existing SemesterResult records using their authoritative linked Exam.subjects[].
 *
 * @param {Object} [options]
 * @param {ObjectId|string} [options.collegeId]
 * @returns {Promise<{ totalProcessed: number, updatedCount: number, skippedCount: number }>}
 */
exports.backfillSemesterResultPercentages = async ({ collegeId } = {}) => {
  const query = {};
  if (collegeId) query.college_id = collegeId;

  const results = await SemesterResult.find(query);
  let updatedCount = 0;
  let skippedCount = 0;

  for (const res of results) {
    const exam = await Exam.findById(res.exam_id).lean();
    if (!exam || !Array.isArray(exam.subjects) || exam.subjects.length === 0) {
      skippedCount++;
      continue;
    }

    const examSubMap = new Map(exam.subjects.map((s) => [String(s.subject), s]));
    let modified = false;

    for (const sub of res.subjects || []) {
      if (sub.maxMarks === null || sub.maxMarks === undefined) {
        const cfg = examSubMap.get(String(sub.subject));
        if (cfg) {
          const calc = calculateSubjectResult(cfg, {
            internalMarks: sub.internalMarks,
            externalMarks: sub.externalMarks,
          });
          sub.internalMaxMarks = calc.internalMaxMarks;
          sub.externalMaxMarks = calc.externalMaxMarks;
          sub.maxMarks = calc.maxMarks;
          modified = true;
        }
      }
    }

    if (
      res.totalMaxMarks === null ||
      res.totalMaxMarks === undefined ||
      res.totalMarks === null ||
      res.totalMarks === undefined ||
      res.percentage === null ||
      res.percentage === undefined ||
      modified
    ) {
      const totals = calculateSemesterTotals(res.subjects, res.overallResult);
      res.totalMarks = totals.totalMarks;
      res.totalMaxMarks = totals.totalMaxMarks;
      res.percentage = totals.percentage;
      await res.save();
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  return {
    totalProcessed: results.length,
    updatedCount,
    skippedCount,
  };
};
