const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const Student = require("../../src/models/student.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const { createStudent } = require("../helpers/factories");
const {
  calculatePromotionDecision,
  calculateFeeClearanceData,
  evaluateAttendanceData,
  createPromotionDecision,
} = require("../../src/services/promotionDecision.service");

describe("Step 3 - promotion decision eligibility engine", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const policy = {
    snapshot: {
      minAttendancePercentage: 75,
      maxAllowedKTs: 3,
      scopedSemesters: [],
    },
  };

  const attendance = (passed = true) => ({
    percentage: passed ? 80 : 74,
    requiredPercentage: 75,
    totalSessions: 10,
    status: passed ? "ELIGIBLE" : "NOT_ELIGIBLE",
    passed,
    overridden: false,
    overrideReason: null,
  });

  const fee = (passed = true) => ({
    status: passed ? "FULLY_PAID" : "PENDING",
    totalFee: 1000,
    paidAmount: passed ? 1000 : 0,
    pendingAmount: passed ? 0 : 1000,
    requiredClearance: true,
    cleared: passed,
    passed,
    overridden: false,
  });

  const result = (overallResult, statuses = []) => ({
    _id: new mongoose.Types.ObjectId(),
    exam_id: new mongoose.Types.ObjectId(),
    status: "PUBLISHED",
    overallResult,
    subjects: statuses.map((status) => ({
      subject: new mongoose.Types.ObjectId(),
      status,
    })),
  });

  const found = (semesterResult) => ({
    status: "FOUND",
    result: semesterResult,
  });

  const decide = (
    overallResult,
    statuses,
    attendanceData = attendance(),
    feeData = fee(),
  ) =>
    calculatePromotionDecision({
      authoritativeResult: found(result(overallResult, statuses)),
      policy,
      attendance: attendanceData,
      feeClearance: feeData,
    });

  describe("result and KT outcomes", () => {
    it("returns PASS when the published result, attendance, and fee are clear", () => {
      const decision = decide("PASS", ["PASS"]);

      expect(decision.promotionOutcome).toBe("PASS");
      expect(decision.decisionReason).toBe("ELIGIBLE");
      expect(decision.ktCount).toBe(0);
    });

    it.each([
      [1, "ATKT"],
      [2, "ATKT"],
      [3, "ATKT"],
    ])("returns ATKT for FAIL with %i KT", (ktCount, expectedOutcome) => {
      const decision = decide("FAIL", Array(ktCount).fill("FAIL"));

      expect(decision.promotionOutcome).toBe(expectedOutcome);
      expect(decision.ktCount).toBe(ktCount);
      expect(decision.failedSubjectCount).toBe(ktCount);
      expect(decision.failedSubjectIds).toHaveLength(ktCount);
    });

    it("blocks FAIL with 4 KT", () => {
      const decision = decide("FAIL", ["FAIL", "FAIL", "FAIL", "FAIL"]);

      expect(decision.promotionOutcome).toBe("BLOCKED");
      expect(decision.decisionReason).toBe("KT_LIMIT_EXCEEDED");
      expect(decision.ktCount).toBe(4);
    });

    it("returns INCOMPLETE and does not count INCOMPLETE as KT", () => {
      const decision = decide("INCOMPLETE", ["FAIL", "INCOMPLETE"]);

      expect(decision.promotionOutcome).toBe("INCOMPLETE");
      expect(decision.decisionReason).toBe("RESULT_INCOMPLETE");
      expect(decision.ktCount).toBe(1);
    });

    it.each([
      ["NO_RESULT", "NO_RESULT"],
      ["AMBIGUOUS_RESULT", "AMBIGUOUS_RESULT"],
    ])(
      "returns %s without making an academic decision",
      (authorityStatus, outcome) => {
        const decision = calculatePromotionDecision({
          authoritativeResult: { status: authorityStatus },
          policy,
          attendance: attendance(),
          feeClearance: fee(),
        });

        expect(decision.promotionOutcome).toBe(outcome);
        expect(decision.sourceResultId).toBeNull();
        expect(decision.ktCount).toBe(0);
      },
    );
  });

  describe("attendance and fee evaluation", () => {
    it.each([
      [76, true],
      [75, true],
      [74, false],
    ])(
      "evaluates %i%% attendance as passed=%s",
      (percentage, expectedPassed) => {
        const evaluated = evaluateAttendanceData({
          attendanceData: { percentage, totalSessions: 100 },
          requiredPercentage: 75,
        });

        expect(evaluated.passed).toBe(expectedPassed);
      },
    );

    it("evaluates cleared fees", () => {
      expect(
        calculateFeeClearanceData({ totalFee: 100, paidAmount: 100 }),
      ).toMatchObject({
        status: "FULLY_PAID",
        cleared: true,
        passed: true,
      });
    });

    it("evaluates uncleared fees", () => {
      expect(
        calculateFeeClearanceData({ totalFee: 100, paidAmount: 0 }),
      ).toMatchObject({
        status: "PENDING",
        cleared: false,
        passed: false,
      });
    });

    it("blocks ATKT when attendance fails", () => {
      const decision = decide("FAIL", ["FAIL"], attendance(false), fee());

      expect(decision.promotionOutcome).toBe("BLOCKED");
      expect(decision.decisionReason).toBe("ATTENDANCE_INSUFFICIENT");
    });

    it("blocks ATKT when fees are not cleared", () => {
      const decision = decide("FAIL", ["FAIL"], attendance(), fee(false));

      expect(decision.promotionOutcome).toBe("BLOCKED");
      expect(decision.decisionReason).toBe("FEE_NOT_CLEARED");
    });
  });

  describe("persistence and safety", () => {
    it("persists a policy/result snapshot idempotently without promotion side effects", async () => {
      const collegeId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();
      const departmentId = new mongoose.Types.ObjectId();
      const student = await createStudent({
        college_id: collegeId,
        course_id: courseId,
        department_id: departmentId,
        currentSemester: 3,
        currentAcademicYear: "2026-27",
        email: `step3-${Date.now()}@example.com`,
      });
      const subjectId = new mongoose.Types.ObjectId();
      const resultDocument = await SemesterResult.create({
        college_id: collegeId,
        student_id: student._id,
        exam_id: new mongoose.Types.ObjectId(),
        course_id: courseId,
        semester: 3,
        academicYear: "2026-27",
        subjects: [
          {
            subject: subjectId,
            passed: false,
            status: "FAIL",
            marksRecorded: true,
          },
        ],
        totalSubjects: 1,
        passedSubjects: 0,
        failedSubjects: 1,
        incompleteSubjects: 0,
        overallResult: "FAIL",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });
      const policyDocument = await PromotionPolicy.create({ collegeId });
      const userId = new mongoose.Types.ObjectId();

      const first = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId,
      });
      const second = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId,
      });

      expect(String(first._id)).toBe(String(second._id));
      expect(String(first.source_result_id)).toBe(String(resultDocument._id));
      expect(first.promotion_outcome).toBe("BLOCKED");
      expect(first.failed_subject_ids.map(String)).toEqual([String(subjectId)]);
      expect(first.policy_snapshot.maxAllowedKTs).toBe(3);
      expect(String(first.policy_id)).toBe(String(policyDocument._id));
      expect((await Student.findById(student._id)).currentSemester).toBe(3);
      expect(
        await PromotionDecision.countDocuments({ student_id: student._id }),
      ).toBe(1);
      expect(
        await PromotionHistory.countDocuments({ student_id: student._id }),
      ).toBe(0);
    });
  });
});
