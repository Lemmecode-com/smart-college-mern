const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const Backlog = require("../../src/models/backlog.model");
const BacklogAttempt = require("../../src/models/backlogAttempt.model");
const Exam = require("../../src/models/exam.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const Subject = require("../../src/models/subject.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const Notification = require("../../src/models/notification.model");
const AuditLog = require("../../src/models/auditLog.model");
const { createStudent } = require("../helpers/factories");
const {
  createAttempt,
  evaluateAttempt,
  getAttempts,
  EXAM_TYPE,
  BACKLOG_STATUS,
} = require("../../src/services/backlogAttempt.service");

describe("Step 7 — Backlog Clearance + Supplementary/Re-exam Attempt Lifecycle", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const createCase = async (subjectStatus = "FAIL") => {
    const collegeId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const departmentId = new mongoose.Types.ObjectId();
    const student = await createStudent({
      college_id: collegeId,
      course_id: courseId,
      department_id: departmentId,
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      email: `backlog-attempt-${Date.now()}-${Math.random()}@example.com`,
    });
    const subjectId = new mongoose.Types.ObjectId();
    await Subject.create({
      _id: subjectId,
      college_id: collegeId,
      course_id: courseId,
      department_id: departmentId,
      name: "Backlog Subject",
      code: "BL-101",
      semester: 3,
      credits: 3,
      status: "ACTIVE",
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const result = await SemesterResult.create({
      college_id: collegeId,
      student_id: student._id,
      exam_id: new mongoose.Types.ObjectId(),
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        {
          subject: subjectId,
          subjectName: "Backlog Subject",
          subjectCode: "BL-101",
          subjectType: "THEORY",
          internalMarks: subjectStatus === "FAIL" ? 10 : 30,
          externalMarks: subjectStatus === "FAIL" ? 20 : 60,
          totalMarks: subjectStatus === "FAIL" ? 30 : 90,
          passed: subjectStatus === "PASS",
          status: subjectStatus,
          marksRecorded: true,
        },
      ],
      totalSubjects: 1,
      passedSubjects: subjectStatus === "PASS" ? 1 : 0,
      failedSubjects: subjectStatus === "FAIL" ? 1 : 0,
      incompleteSubjects: 0,
      overallResult: subjectStatus === "PASS" ? "PASS" : "FAIL",
      status: "PUBLISHED",
      createdBy: new mongoose.Types.ObjectId(),
    });
    const decision = await PromotionDecision.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      source_result_id: result._id,
      source_exam_id: result.exam_id,
      result_status: "PUBLISHED",
      failed_subject_ids: subjectStatus === "FAIL" ? [subjectId] : [],
      failed_subject_count: subjectStatus === "FAIL" ? 1 : 0,
      kt_count: subjectStatus === "FAIL" ? 1 : 0,
      promotion_outcome: subjectStatus === "FAIL" ? "ATKT" : "PASS",
      decision_reason: "ELIGIBLE",
      workflow_status: "APPROVED",
      attendance_snapshot: {
        percentage: 80,
        requiredPercentage: 75,
        totalSessions: 10,
        status: "ELIGIBLE",
        passed: true,
      },
      fee_clearance_snapshot: {
        status: "FULLY_PAID",
        totalFee: 100,
        paidAmount: 100,
        pendingAmount: 0,
        requiredClearance: true,
        cleared: true,
        passed: true,
      },
      policy_snapshot: {
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        scopedSemesters: [],
      },
      policy_version: "test",
      createdBy: new mongoose.Types.ObjectId(),
    });
    const backlogs = await Backlog.create([
      {
        student_id: student._id,
        college_id: collegeId,
        course_id: courseId,
        semester: 3,
        academicYear: "2026-27",
        original_exam_id: result.exam_id,
        original_result_id: result._id,
        subject_id: subjectId,
        subject_code: "BL-101",
        subject_name: "Backlog Subject",
        subject_type: "THEORY",
        original_marks_snapshot: { status: subjectStatus, totalMarks: 30 },
        status: "OPEN",
        promotion_decision_id: decision._id,
      },
    ]);
    return {
      collegeId,
      courseId,
      student,
      result,
      decision,
      subjectId,
      backlog: backlogs[0],
    };
  };

const enterSupplementaryMarks = async (examId, studentId, collegeId, subjectId, internalMarks, externalMarks) => {
  return await StudentMarks.findOneAndUpdate(
    {
      college_id: collegeId,
      exam_id: examId,
      subject_id: subjectId,
      student_id: studentId,
    },
    {
      internalMarks,
      externalMarks,
    },
    { upsert: true, new: true },
  );
};

  // ===== LIFECYCLE TESTS =====

  describe("Lifecycle — OPEN backlog can receive attempt", () => {
    it("1. OPEN backlog can receive attempt", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(attempt).toBeDefined();
      expect(attempt.attempt_number).toBe(1);
      expect(exam.exam_type).toBe(EXAM_TYPE.SUPPLEMENTARY);
      expect(attempt.result_status).toBe("INCOMPLETE");
      expect(attempt.cleared).toBe(false);

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("ATTEMPTED");
      expect(updatedBacklog.attempt_count).toBe(1);
      expect(String(updatedBacklog.latest_attempt_id)).toBe(String(attempt._id));
    });

    it("2. CLEARED backlog cannot receive another attempt", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      await Backlog.findByIdAndUpdate(backlog._id, { status: "CLEARED" });

      await expect(
        createAttempt({
          backlogId: backlog._id,
          collegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "COLLEGE_ADMIN",
          request: {},
        }),
      ).rejects.toMatchObject({ code: "BACKLOG_NOT_OPEN" });
    });

    it("3. ATTEMPTED state behaves correctly", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("ATTEMPTED");

      // A second attempt against the same backlog in ATTEMPTED state should be rejected
      await expect(
        createAttempt({
          backlogId: backlog._id,
          collegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "COLLEGE_ADMIN",
          request: {},
        }),
      ).rejects.toMatchObject({ code: "BACKLOG_NOT_OPEN" });
    });

    it("4. Failed attempt returns backlog to OPEN", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const supplementaryExam = exam;
      await enterSupplementaryMarks(
        supplementaryExam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        10,
        20,
      );

      const { backlogCleared, resultStatus } = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(resultStatus).toBe("FAIL");
      expect(backlogCleared).toBe(false);

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("OPEN");
    });

    it("5. Successful attempt changes backlog to CLEARED", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const supplementaryExam = exam;
      await enterSupplementaryMarks(
        supplementaryExam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      const { backlogCleared, resultStatus } = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(resultStatus).toBe("PASS");
      expect(backlogCleared).toBe(true);

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("CLEARED");
      expect(updatedBacklog.attempt_count).toBe(1);
      expect(updatedBacklog.cleared_at).not.toBeNull();
    });

    it("6. INCOMPLETE attempt does not clear backlog", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // No marks entered for supplementary exam
      const { backlogCleared, resultStatus } = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(resultStatus).toBe("INCOMPLETE");
      expect(backlogCleared).toBe(false);

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("ATTEMPTED");
    });
  });

  // ===== MULTIPLE ATTEMPTS =====

  describe("Multiple attempts", () => {
    it("7. First attempt FAIL → OPEN", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        10,
        20,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("OPEN");
      expect(updatedBacklog.attempt_count).toBe(1);
    });

    it("8. Second attempt PASS → CLEARED", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt: firstAttempt, exam: firstExam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        firstExam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        10,
        20,
      );

      await evaluateAttempt({
        attemptId: firstAttempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const { attempt: secondAttempt, exam: secondExam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(secondAttempt.attempt_number).toBe(2);

      await enterSupplementaryMarks(
        secondExam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      const { backlogCleared } = await evaluateAttempt({
        attemptId: secondAttempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(backlogCleared).toBe(true);
      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("CLEARED");
      expect(updatedBacklog.attempt_count).toBe(2);
    });

    it("9. Attempt history contains both attempts", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt: firstAttempt, exam: firstExam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        firstExam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        10,
        20,
      );

      await evaluateAttempt({
        attemptId: firstAttempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const { attempt: secondAttempt, exam: secondExam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        secondExam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: secondAttempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const { attempts } = await getAttempts(backlog._id, collegeId);
      expect(attempts).toHaveLength(2);
      expect(attempts[0].attempt_number).toBe(1);
      expect(attempts[1].attempt_number).toBe(2);
      expect(attempts[0].result_status).toBe("FAIL");
      expect(attempts[1].result_status).toBe("PASS");
      expect(attempts[1].cleared).toBe(true);
    });

    it("10. Attempt count is correct", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      for (let i = 0; i < 3; i++) {
        const { attempt, exam } = await createAttempt({
          backlogId: backlog._id,
          collegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "COLLEGE_ADMIN",
          request: {},
        });

        await enterSupplementaryMarks(
          exam._id,
          backlog.student_id,
          collegeId,
          subjectId,
          10,
          20,
        );

        await evaluateAttempt({
          attemptId: attempt._id,
          collegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "COLLEGE_ADMIN",
          request: {},
        });
      }

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.attempt_count).toBe(3);
    });
  });

  // ===== RESULT CORRECTNESS =====

  describe("Result correctness", () => {
    it("11. Supplementary result uses existing calculation logic", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      const { resultStatus } = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // 25 >= 12 (internal pass), 60 >= 28 (external pass) → PASS
      expect(resultStatus).toBe("PASS");
    });

    it("12. PASS is recognized correctly", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        30,
        70,
      );

      const { passed, resultStatus } = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(resultStatus).toBe("PASS");
      expect(passed).toBe(true);
    });

    it("13. FAIL is recognized correctly", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        5,
        10,
      );

      const { passed, resultStatus } = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(resultStatus).toBe("FAIL");
      expect(passed).toBe(false);
    });

    it("14. INCOMPLETE is recognized correctly", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // No marks entered
      const { passed, resultStatus } = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(resultStatus).toBe("INCOMPLETE");
      expect(passed).toBe(false);
    });
  });

  // ===== ORIGINAL RESULT SAFETY =====

  describe("Original result safety", () => {
    it("15. Original published result remains unchanged", async () => {
      const { result, backlog, collegeId, subjectId } = await createCase("FAIL");
      const originalResult = (await SemesterResult.findById(result._id)).toObject();

      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const afterResult = (await SemesterResult.findById(result._id)).toObject();
      expect(afterResult).toEqual(originalResult);
    });

    it("16. Original backlog source remains immutable", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(String(updatedBacklog.original_result_id)).toBe(
        String(backlog.original_result_id),
      );
      expect(String(updatedBacklog.original_exam_id)).toBe(
        String(backlog.original_exam_id),
      );
      expect(updatedBacklog.original_marks_snapshot).toEqual(
        backlog.original_marks_snapshot,
      );
    });

    it("17. Supplementary result does not become the regular authoritative result", async () => {
      const { result, backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // Original result should still be FAIL/PUBLISHED
      const originalResult = await SemesterResult.findById(result._id);
      expect(originalResult.status).toBe("PUBLISHED");
      expect(originalResult.overallResult).toBe("FAIL");

      // Supplementary result should be a separate document
      const supplementaryResults = await SemesterResult.find({
        exam_id: exam._id,
      });
      expect(supplementaryResults.length).toBeGreaterThanOrEqual(1);
      const supplementaryResult = supplementaryResults[0];
      expect(supplementaryResult.exam_id.toString()).toBe(exam._id.toString());
      expect(supplementaryResult.overallResult).toBe("PASS");
    });
  });

  // ===== PROMOTION SAFETY =====

  describe("Promotion safety", () => {
    it("18. Clearing backlog does not increment Student.currentSemester", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const studentBefore = await Student.findById(backlog.student_id);
      const originalSemester = studentBefore.currentSemester;

      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const studentAfter = await Student.findById(backlog.student_id);
      expect(studentAfter.currentSemester).toBe(originalSemester);
    });

    it("19. Clearing backlog does not create a second PromotionDecision", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      const decisionCountBefore = await PromotionDecision.countDocuments({
        student_id: backlog.student_id,
      });

      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        backlog.subject_id,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const decisionCountAfter = await PromotionDecision.countDocuments({
        student_id: backlog.student_id,
      });
      expect(decisionCountAfter).toBe(decisionCountBefore);
    });

    it("20. Clearing backlog does not execute promotion automatically", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const historyCount = await PromotionHistory.countDocuments({
        student_id: backlog.student_id,
      });
      expect(historyCount).toBe(0);
    });
  });

  // ===== IDEMPOTENCY =====

  describe("Idempotency", () => {
    it("21. Duplicate attempt request is prevented", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      const actorId = new mongoose.Types.ObjectId();

      const { attempt: first } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId,
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const { attempt: second, isIdempotent } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId,
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      expect(isIdempotent).toBe(true);
      expect(String(first._id)).toBe(String(second._id));

      const attempts = await BacklogAttempt.find({ backlog_id: backlog._id });
      expect(attempts).toHaveLength(1);
    });

    it("22. Duplicate clearance request is safe", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      const { backlogCleared: firstClear } = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const { isIdempotent, backlogCleared: secondClear } =
        await evaluateAttempt({
          attemptId: attempt._id,
          collegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "COLLEGE_ADMIN",
          request: {},
        });

      expect(firstClear).toBe(true);
      expect(secondClear).toBe(true);
      expect(isIdempotent).toBe(true);
    });

    it("23. Duplicate notification is prevented", async () => {
      const { backlog, collegeId, subjectId, student } = await createCase("FAIL");
      if (!student.user_id) {
        student.user_id = new mongoose.Types.ObjectId();
        await student.save();
      }

      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      const notifCount = await Notification.countDocuments({
        target_users: student.user_id,
      });
      expect(notifCount).toBeGreaterThanOrEqual(1);
    });

    it("24. Duplicate audit is prevented", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      const attemptId = attempt._id;
      await evaluateAttempt({
        attemptId,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // After idempotent re-evaluation, no new audit should be created
      const auditCount = await AuditLog.countDocuments({
        action: "BACKLOG_CLEARED",
      });
      expect(auditCount).toBe(1);
    });
  });

  // ===== SECURITY =====

  describe("Security", () => {
    it("25. Cross-college access is rejected", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      const otherCollegeId = new mongoose.Types.ObjectId();

      await expect(
        createAttempt({
          backlogId: backlog._id,
          collegeId: otherCollegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "COLLEGE_ADMIN",
          request: {},
        }),
      ).rejects.toMatchObject({ code: "BACKLOG_NOT_FOUND" });
    });

    it("26. Unauthorized access is rejected", async () => {
      const { backlog, collegeId } = await createCase("FAIL");

      await expect(
        createAttempt({
          backlogId: backlog._id,
          collegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "TEACHER",
          request: {},
        }),
      ).rejects.toMatchObject({ code: "PROMOTION_WORKFLOW_FORBIDDEN" });
    });

    it("27. Student mismatch is rejected", async () => {
      const { backlog, collegeId } = await createCase("FAIL");
      const otherStudentId = new mongoose.Types.ObjectId();

      // Create attempt for original student
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // Verify backlog is tied to the original student, not the actor
      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(String(updatedBacklog.student_id)).not.toBe(String(otherStudentId));
      expect(String(updatedBacklog.student_id)).toBe(String(backlog.student_id));
    });

    it("28. CLEARED backlog modification is rejected", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");

      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // Verify backlog is CLEARED and cannot be modified
      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("CLEARED");

      // Attempting another attempt should fail
      await expect(
        createAttempt({
          backlogId: backlog._id,
          collegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "COLLEGE_ADMIN",
          request: {},
        }),
      ).rejects.toMatchObject({ code: "BACKLOG_NOT_OPEN" });
    });

    it("29. Cross-college Subject cannot create supplementary exam", async () => {
      const { backlog, collegeId, student } = await createCase("FAIL");
      const otherCollegeId = new mongoose.Types.ObjectId();
      const otherCourseId = new mongoose.Types.ObjectId();
      const otherDepartmentId = new mongoose.Types.ObjectId();

      // Create a Subject in a different college with the same _id as the original subject
      // This simulates a Subject that exists but belongs to another college
      const otherSubjectId = new mongoose.Types.ObjectId();
      await Subject.create({
        _id: otherSubjectId,
        college_id: otherCollegeId,
        course_id: otherCourseId,
        department_id: otherDepartmentId,
        name: "Other College Subject",
        code: "OCS-101",
        semester: 3,
        credits: 3,
        status: "ACTIVE",
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
        passMarks: 40,
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Manually create a backlog that references the other college's subject
      // This simulates an attempt to use a cross-college subject
      const maliciousBacklog = await Backlog.create({
        student_id: student._id,
        college_id: collegeId,
        course_id: backlog.course_id,
        semester: 3,
        academicYear: "2026-27",
        original_exam_id: backlog.original_exam_id,
        original_result_id: backlog.original_result_id,
        subject_id: otherSubjectId, // Subject from another college
        subject_code: "OCS-101",
        subject_name: "Other College Subject",
        subject_type: "THEORY",
        original_marks_snapshot: { status: "FAIL", totalMarks: 30 },
        status: "OPEN",
        promotion_decision_id: backlog.promotion_decision_id,
      });

      // Attempting to create a supplementary exam should fail because the Subject
      // does not belong to the same college as the backlog
      await expect(
        createAttempt({
          backlogId: maliciousBacklog._id,
          collegeId,
          actorId: new mongoose.Types.ObjectId(),
          actorRole: "COLLEGE_ADMIN",
          request: {},
        }),
      ).rejects.toMatchObject({ code: "SUBJECT_NOT_FOUND" });
    });
  });

  // ===== TRANSACTION =====

  describe("Transaction", () => {
    it("29. Successful clearance commits all required state", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        25,
        60,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // All state should be committed
      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("CLEARED");
      expect(updatedBacklog.cleared_at).not.toBeNull();
      expect(updatedBacklog.attempt_count).toBe(1);

      // Attempt should be marked as cleared
      const attemptDoc = await BacklogAttempt.findById(attempt._id);
      expect(attemptDoc.cleared).toBe(true);
      expect(attemptDoc.result_status).toBe("PASS");
      expect(attemptDoc.evaluated_at).not.toBeNull();

      // Audit should be recorded
      const auditCount = await AuditLog.countDocuments({
        action: "BACKLOG_CLEARED",
      });
      expect(auditCount).toBeGreaterThanOrEqual(1);
    });

    it("30. Failure rolls back critical state", async () => {
      const { backlog, collegeId, subjectId } = await createCase("FAIL");

      // Create an attempt and verify the backlog is ATTEMPTED
      const { attempt, exam } = await createAttempt({
        backlogId: backlog._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      let updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("ATTEMPTED");
      expect(updatedBacklog.attempt_count).toBe(1);

      // Enter failing marks and evaluate
      await enterSupplementaryMarks(
        exam._id,
        backlog.student_id,
        collegeId,
        subjectId,
        5,
        10,
      );

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId,
        actorId: new mongoose.Types.ObjectId(),
        actorRole: "COLLEGE_ADMIN",
        request: {},
      });

      // Backlog should be back to OPEN (not stuck in ATTEMPTED)
      updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("OPEN");
      expect(updatedBacklog.latest_result_status).toBe("FAIL");

      // Attempt should still exist with FAIL result
      const attemptDoc = await BacklogAttempt.findById(attempt._id);
      expect(attemptDoc.result_status).toBe("FAIL");
      expect(attemptDoc.cleared).toBe(false);
    });
  });
});
