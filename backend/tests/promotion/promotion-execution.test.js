const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");

jest.mock("../../src/services/attendance.service", () => ({
  getAttendanceDataForStudents: jest.fn(),
}));

const {
  getAttendanceDataForStudents,
} = require("../../src/services/attendance.service");
const AuditLog = require("../../src/models/auditLog.model");
const Backlog = require("../../src/models/backlog.model");
const Notification = require("../../src/models/notification.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const {
  executePromotion,
} = require("../../src/services/promotionExecution.service");

describe("Step 6 - transactional promotion execution", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    getAttendanceDataForStudents.mockResolvedValue([
      { percentage: 80, totalSessions: 10 },
    ]);
  });

  const createCase = async ({
    outcome = "PASS",
    workflowStatus = "APPROVED",
  } = {}) => {
    const collegeId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const student = await Student.create({
      college_id: collegeId,
      department_id: new mongoose.Types.ObjectId(),
      course_id: courseId,
      fullName: "Execution Student",
      email: `execution-${Date.now()}-${Math.random()}@example.com`,
      mobileNumber: "9876543210",
      gender: "Other",
      dateOfBirth: new Date("2000-01-01"),
      addressLine: "Campus",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      admissionYear: 2024,
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      category: "GEN",
      status: "APPROVED",
    });
    const subjectId = new mongoose.Types.ObjectId();
    const noResultOutcome = ["NO_RESULT", "AMBIGUOUS_RESULT"].includes(outcome);
    const overallResult =
      outcome === "PASS"
        ? "PASS"
        : outcome === "ATKT"
          ? "FAIL"
          : outcome === "INCOMPLETE"
            ? "INCOMPLETE"
            : outcome === "BLOCKED"
              ? "FAIL"
              : "INCOMPLETE";
    let result = null;
    if (!noResultOutcome) {
      result = await SemesterResult.create({
        college_id: collegeId,
        student_id: student._id,
        exam_id: new mongoose.Types.ObjectId(),
        course_id: courseId,
        semester: 3,
        academicYear: "2026-27",
        subjects: [
          {
            subject: subjectId,
            subjectName: "Execution Subject",
            subjectCode: "EX-101",
            passed: outcome === "PASS",
            status:
              outcome === "ATKT" || outcome === "BLOCKED"
                ? "FAIL"
                : outcome === "INCOMPLETE"
                  ? "INCOMPLETE"
                  : "PASS",
            marksRecorded: true,
          },
        ],
        totalSubjects: 1,
        passedSubjects: outcome === "PASS" ? 1 : 0,
        failedSubjects: outcome === "ATKT" || outcome === "BLOCKED" ? 1 : 0,
        incompleteSubjects: outcome === "INCOMPLETE" ? 1 : 0,
        overallResult,
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });
    }
    const decision = await PromotionDecision.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      source_result_id: result ? result._id : null,
      source_exam_id: result ? result.exam_id : null,
      result_status: noResultOutcome ? outcome : "PUBLISHED",
      failed_subject_ids:
        outcome === "ATKT" || outcome === "BLOCKED" ? [subjectId] : [],
      failed_subject_count:
        outcome === "ATKT" || outcome === "BLOCKED" ? 1 : 0,
      kt_count: outcome === "ATKT" || outcome === "BLOCKED" ? 1 : 0,
      promotion_outcome: outcome,
      decision_reason: "ELIGIBLE",
      workflow_status: workflowStatus,
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
      policy_version: "DEFAULT-v1",
      policy_snapshot: {
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        scopedSemesters: [],
      },
      createdBy: new mongoose.Types.ObjectId(),
    });
    await StudentFee.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      totalFee: 100,
      paidAmount: 100,
      installments: [],
    });
    return { collegeId, courseId, student, result, decision, subjectId };
  };

  const executionInput = (testCase, overrides = {}) => ({
    decisionId: testCase.decision._id,
    collegeId: testCase.collegeId,
    actorId: new mongoose.Types.ObjectId(),
    actorRole: "COLLEGE_ADMIN",
    actorName: "Execution Admin",
    ...overrides,
  });

  it("executes approved PASS exactly once with history and audit", async () => {
    const testCase = await createCase();
    const marks = await StudentMarks.create({
      college_id: testCase.collegeId,
      exam_id: testCase.result.exam_id,
      subject_id: testCase.subjectId,
      student_id: testCase.student._id,
      internalMarks: 30,
      externalMarks: 60,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const resultBefore = (
      await SemesterResult.findById(testCase.result._id)
    ).toObject();
    const marksBefore = marks.toObject();

    const first = await executePromotion(executionInput(testCase));
    const second = await executePromotion(executionInput(testCase));

    expect(first.executionStatus).toBe("PROMOTED");
    expect(second.executionStatus).toBe("ALREADY_PROMOTED");
    expect(second.idempotent).toBe(true);
    expect((await Student.findById(testCase.student._id)).currentSemester).toBe(
      4,
    );
    expect((await Student.findById(testCase.student._id)).currentYear).toBe(2);
    expect(
      await PromotionHistory.countDocuments({
        promotion_decision_id: testCase.decision._id,
      }),
    ).toBe(1);
    expect(
      await AuditLog.countDocuments({
        resourceId: testCase.decision._id,
        action: "PROMOTION_EXECUTED",
      }),
    ).toBe(1);
    expect(
      (await SemesterResult.findById(testCase.result._id)).toObject(),
    ).toEqual(resultBefore);
    expect((await StudentMarks.findById(marks._id)).toObject()).toEqual(
      marksBefore,
    );
    expect(
      (await PromotionDecision.findById(testCase.decision._id)).workflow_status,
    ).toBe("PROMOTED");
  });

  it.each(["DRAFT", "RECOMMENDED", "UNDER_REVIEW", "REJECTED"])(
    "does not execute a %s decision",
    async (workflowStatus) => {
      const testCase = await createCase({ workflowStatus });

      await expect(
        executePromotion(executionInput(testCase)),
      ).rejects.toMatchObject({
        code: "PROMOTION_NOT_APPROVED",
      });
      expect(
        (await Student.findById(testCase.student._id)).currentSemester,
      ).toBe(3);
    },
  );

  it.each(["INCOMPLETE", "NO_RESULT", "AMBIGUOUS_RESULT", "BLOCKED"])(
    "does not execute a %s outcome",
    async (outcome) => {
      const testCase = await createCase({ outcome });

      await expect(
        executePromotion(executionInput(testCase)),
      ).rejects.toMatchObject({
        code: "PROMOTION_NOT_ELIGIBLE",
      });
      expect(
        (await Student.findById(testCase.student._id)).currentSemester,
      ).toBe(3);
    },
  );

  it("executes ATKT, reuses OPEN backlogs, and links them", async () => {
    const testCase = await createCase({ outcome: "ATKT" });
    const backlog = await Backlog.create({
      student_id: testCase.student._id,
      college_id: testCase.collegeId,
      course_id: testCase.courseId,
      semester: 3,
      academicYear: "2026-27",
      original_exam_id: testCase.result.exam_id,
      original_result_id: testCase.result._id,
      subject_id: testCase.subjectId,
      subject_code: "EX-101",
      subject_name: "Execution Subject",
      subject_type: "THEORY",
      original_marks_snapshot: { status: "FAIL", totalMarks: 30 },
      status: "OPEN",
    });

    const executed = await executePromotion(executionInput(testCase));

    expect(executed.promotionOutcome).toBe("ATKT");
    expect(executed.ktCount).toBe(1);
    expect(
      await Backlog.countDocuments({ student_id: testCase.student._id }),
    ).toBe(1);
    expect(String(executed.promotionHistory.backlog_ids[0])).toBe(
      String(backlog._id),
    );
    expect(
      (await PromotionDecision.findById(testCase.decision._id)).backlog_ids,
    ).toHaveLength(1);
    expect((await Student.findById(testCase.student._id)).currentSemester).toBe(
      4,
    );
  });

  it("blocks stale result and student state changes", async () => {
    const staleResult = await createCase();
    await SemesterResult.updateOne(
      { _id: staleResult.result._id },
      { $set: { status: "LOCKED" } },
    );
    await expect(
      executePromotion(executionInput(staleResult)),
    ).rejects.toMatchObject({
      code: "STALE_DECISION",
    });

    const changedStudent = await createCase();
    await Student.updateOne(
      { _id: changedStudent.student._id },
      { $set: { currentSemester: 4 } },
    );
    await expect(
      executePromotion(executionInput(changedStudent)),
    ).rejects.toMatchObject({
      code: "STUDENT_STATE_CHANGED",
    });
  });

  it("rolls back the semester when history persistence fails", async () => {
    const testCase = await createCase();
    const createSpy = jest
      .spyOn(PromotionHistory, "create")
      .mockRejectedValueOnce(new Error("history write failed"));

    await expect(executePromotion(executionInput(testCase))).rejects.toThrow(
      "history write failed",
    );
    createSpy.mockRestore();

    expect((await Student.findById(testCase.student._id)).currentSemester).toBe(
      3,
    );
    expect(
      await PromotionHistory.countDocuments({
        student_id: testCase.student._id,
      }),
    ).toBe(0);
    expect(
      (await PromotionDecision.findById(testCase.decision._id)).workflow_status,
    ).toBe("APPROVED");
    expect(
      await AuditLog.countDocuments({
        resourceId: testCase.decision._id,
        action: "PROMOTION_EXECUTED",
      }),
    ).toBe(0);
  });

  it("rejects cross-college, unauthorized, final-semester, and concurrent execution", async () => {
    const crossCollege = await createCase();
    await expect(
      executePromotion(
        executionInput(crossCollege, {
          collegeId: new mongoose.Types.ObjectId(),
        }),
      ),
    ).rejects.toMatchObject({ code: "NO_DECISION" });
    await expect(
      executePromotion(executionInput(crossCollege, { actorRole: "TEACHER" })),
    ).rejects.toMatchObject({ code: "PROMOTION_EXECUTION_FORBIDDEN" });

    const finalCase = await createCase();
    await Student.updateOne(
      { _id: finalCase.student._id },
      { $set: { currentSemester: 8, currentAcademicYear: "2028-29" } },
    );
    await expect(
      executePromotion(executionInput(finalCase)),
    ).rejects.toMatchObject({
      code: "STUDENT_STATE_CHANGED",
    });

    const concurrent = await createCase();
    const results = await Promise.allSettled([
      executePromotion(executionInput(concurrent)),
      executePromotion(executionInput(concurrent)),
    ]);
    // Both should succeed (idempotent): one promotes, the other sees already promoted
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(
      2,
    );
    const promotedCount = results.filter(
      (item) =>
        item.status === "fulfilled" &&
        item.value.executionStatus === "PROMOTED",
    ).length;
    expect(promotedCount).toBe(1);
    expect(
      (await Student.findById(concurrent.student._id)).currentSemester,
    ).toBe(4);
    expect(
      await PromotionHistory.countDocuments({
        promotion_decision_id: concurrent.decision._id,
      }),
    ).toBe(1);
    expect(
      await AuditLog.countDocuments({
        resourceId: concurrent.decision._id,
        action: "PROMOTION_EXECUTED",
      }),
    ).toBe(1);
  });

  it("deduplicates the promotion notification", async () => {
    const testCase = await createCase();
    await Student.updateOne(
      { _id: testCase.student._id },
      { $set: { user_id: new mongoose.Types.ObjectId() } },
    );
    await executePromotion(executionInput(testCase));
    await executePromotion(executionInput(testCase));

    expect(
      await Notification.countDocuments({
        promotionDecisionId: testCase.decision._id,
      }),
    ).toBe(1);
  });
});
