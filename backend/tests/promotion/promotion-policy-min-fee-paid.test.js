const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const StudentFee = require("../../src/models/studentFee.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const { updatePromotionPolicy } = require("../../src/controllers/promotionPolicy.controller");
const { createCourse, createStudent } = require("../helpers/factories");
const {
  DEFAULT_MIN_FEE_PAID_PERCENTAGE,
} = require("../../src/utils/promotionPolicy.util");
const {
  calculateFeeClearanceData,
  evaluateFeeClearance,
  createPromotionDecision,
} = require("../../src/services/promotionDecision.service");

/**
 * Coverage for the configurable minimum fee paid percentage used by the
 * promotion fee eligibility check.
 */
describe("Promotion policy - minimumFeePaidPercentage", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const newId = () => new mongoose.Types.ObjectId();

  const invokeUpdate = async (body, collegeId) => {
    const req = { body, query: {}, college_id: collegeId };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await updatePromotionPolicy(req, res, next);

    return { res, next };
  };

  const seedCourse = async (collegeId) =>
    createCourse({
      college_id: collegeId,
      department_id: newId(),
      name: "Fee Course",
      code: `FEC${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      durationSemesters: 6,
    });

  // ---------------------------------------------------------------------------
  // Model
  // ---------------------------------------------------------------------------

  describe("model defaults", () => {
    it("defaults to 100 so existing policies keep requiring full payment", async () => {
      const collegeId = newId();
      const policy = await PromotionPolicy.create({ collegeId });

      expect(policy.minimumFeePaidPercentage).toBe(100);
      expect(DEFAULT_MIN_FEE_PAID_PERCENTAGE).toBe(100);
    });

    it("resolves 100 for a pre-migration document without the field", async () => {
      const collegeId = newId();
      await PromotionPolicy.collection.insertOne({
        collegeId,
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        scopedSemesters: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const policy = await PromotionPolicy.getActivePolicy(collegeId);
      expect(policy.minimumFeePaidPercentage).toBe(
        DEFAULT_MIN_FEE_PAID_PERCENTAGE,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Controller
  // ---------------------------------------------------------------------------

  describe("controller persistence", () => {
    it("persists the supplied value on an existing course policy", async () => {
      const collegeId = newId();
      const course = await seedCourse(collegeId);
      await PromotionPolicy.create({
        collegeId,
        course_id: course._id,
        minAttendancePercentage: 75,
        isActive: true,
      });

      const { next } = await invokeUpdate(
        { course_id: String(course._id), minimumFeePaidPercentage: 80 },
        collegeId,
      );
      expect(next).not.toHaveBeenCalled();

      const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
      expect(stored.minimumFeePaidPercentage).toBe(80);
    });

    it("keeps the stored value when the field is omitted from the body", async () => {
      const collegeId = newId();
      const course = await seedCourse(collegeId);
      await PromotionPolicy.create({
        collegeId,
        course_id: course._id,
        minAttendancePercentage: 75,
        minimumFeePaidPercentage: 60,
        isActive: true,
      });

      const { next } = await invokeUpdate(
        { course_id: String(course._id), minAttendancePercentage: 80 },
        collegeId,
      );
      expect(next).not.toHaveBeenCalled();

      const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
      expect(stored.minimumFeePaidPercentage).toBe(60);
      expect(stored.minAttendancePercentage).toBe(80);
    });

    it("uses the supplied value when creating a new policy", async () => {
      const collegeId = newId();
      const course = await seedCourse(collegeId);

      const { next } = await invokeUpdate(
        { course_id: String(course._id), minimumFeePaidPercentage: 0 },
        collegeId,
      );
      expect(next).not.toHaveBeenCalled();

      const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
      expect(stored.minimumFeePaidPercentage).toBe(0);
    });

    it("falls back to the default when creating without the field", async () => {
      const collegeId = newId();
      const course = await seedCourse(collegeId);

      const { next } = await invokeUpdate(
        { course_id: String(course._id) },
        collegeId,
      );
      expect(next).not.toHaveBeenCalled();

      const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
      expect(stored.minimumFeePaidPercentage).toBe(
        DEFAULT_MIN_FEE_PAID_PERCENTAGE,
      );
    });

    it("backfills the default on an existing document that predates the field", async () => {
      const collegeId = newId();
      const course = await seedCourse(collegeId);
      await PromotionPolicy.collection.insertOne({
        collegeId,
        course_id: course._id,
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { next } = await invokeUpdate(
        { course_id: String(course._id), minAttendancePercentage: 78 },
        collegeId,
      );
      expect(next).not.toHaveBeenCalled();

      const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
      expect(stored.minimumFeePaidPercentage).toBe(
        DEFAULT_MIN_FEE_PAID_PERCENTAGE,
      );
    });

    it("does not reset the fee value when other policy fields change", async () => {
      const collegeId = newId();
      const course = await seedCourse(collegeId);
      await PromotionPolicy.create({
        collegeId,
        course_id: course._id,
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        minimumFeePaidPercentage: 85,
        scopedSemesters: [1],
        isActive: true,
        ktRules: [
          {
            fromSemester: 1,
            toSemester: 2,
            maxAllowedKTs: 2,
            requirePreviousYearClearance: true,
            subjectTypeLimits: { THEORY: 4, PRACTICAL: 3, COMPOSITE: 5 },
          },
        ],
      });

      const { next } = await invokeUpdate(
        {
          course_id: String(course._id),
          minAttendancePercentage: 82,
          maxAllowedKTs: 6,
          ktRules: [
            {
              fromSemester: 1,
              toSemester: 2,
              maxAllowedKTs: 4,
              requirePreviousYearClearance: false,
              subjectTypeLimits: { THEORY: 6, PRACTICAL: 5, COMPOSITE: 7 },
            },
          ],
        },
        collegeId,
      );
      expect(next).not.toHaveBeenCalled();

      const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
      expect(stored.minimumFeePaidPercentage).toBe(85);
      expect(stored.minAttendancePercentage).toBe(82);
      expect(stored.maxAllowedKTs).toBe(6);
      expect(stored.ktRules[0].maxAllowedKTs).toBe(4);
      expect(stored.ktRules[0].subjectTypeLimits.THEORY).toBe(6);
    });

    it.each([
      ["a negative value", -1],
      ["a value above 100", 101],
      ["a non-numeric value", "abc"],
      ["an empty string", ""],
    ])(
      "rejects %s with 400 INVALID_MINIMUM_FEE_PAID_PERCENTAGE",
      async (_label, value) => {
        const collegeId = newId();
        const course = await seedCourse(collegeId);

        const { next } = await invokeUpdate(
          { course_id: String(course._id), minimumFeePaidPercentage: value },
          collegeId,
        );

        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe("INVALID_MINIMUM_FEE_PAID_PERCENTAGE");
        expect(
          await PromotionPolicy.countDocuments({ collegeId }),
        ).toBe(0);
      },
    );
  });

  // ---------------------------------------------------------------------------
  // Fee eligibility calculation
  // ---------------------------------------------------------------------------

  describe("fee eligibility by paid percentage", () => {
    it.each([
      ["75 % threshold, exactly 75 % paid", 75, 40000, 30000, true],
      ["75 % threshold, just below 75 % paid", 75, 40000, 29999, false],
      ["80 % threshold, exactly 80 % paid", 80, 50000, 40000, true],
      ["80 % threshold, just below 80 % paid", 80, 50000, 39999, false],
      ["100 % threshold, fully paid", 100, 55000, 55000, true],
      ["100 % threshold, one rupee short", 100, 55000, 54999, false],
      ["0 % threshold with nothing paid", 0, 50000, 0, true],
      ["50 % threshold with nothing paid", 50, 50000, 0, false],
    ])("%s", (_label, threshold, totalFee, paidAmount, expectedPassed) => {
      const evaluated = calculateFeeClearanceData(
        { totalFee, paidAmount },
        false,
        threshold,
      );

      expect(evaluated.passed).toBe(expectedPassed);
      expect(evaluated.requiredPaidPercentage).toBe(threshold);
      expect(evaluated.meetsPaidPercentage).toBe(expectedPassed);
    });

    it("defaults to requiring full payment when no policy value is supplied", () => {
      expect(
        calculateFeeClearanceData({ totalFee: 100, paidAmount: 99 }).passed,
      ).toBe(false);
      expect(
        calculateFeeClearanceData({ totalFee: 100, paidAmount: 100 }).passed,
      ).toBe(true);
    });

    it("reports the calculated percentage and pending amount", () => {
      expect(
        calculateFeeClearanceData(
          { totalFee: 40000, paidAmount: 30000 },
          false,
          75,
        ),
      ).toMatchObject({
        totalFee: 40000,
        paidAmount: 30000,
        pendingAmount: 10000,
        paidPercentage: 75,
        requiredPaidPercentage: 75,
      });
    });

    it("caps the percentage at 100 when paidAmount exceeds totalFee", () => {
      const evaluated = calculateFeeClearanceData(
        { totalFee: 1000, paidAmount: 1500 },
        false,
        100,
      );

      expect(evaluated.paidPercentage).toBe(100);
      expect(evaluated.passed).toBe(true);
      // The stored paid amount is not modified.
      expect(evaluated.paidAmount).toBe(1500);
    });

    it("treats a zero total fee as fully satisfied", () => {
      const evaluated = calculateFeeClearanceData(
        { totalFee: 0, paidAmount: 0 },
        false,
        100,
      );

      expect(evaluated.paidPercentage).toBe(100);
      expect(evaluated.passed).toBe(true);
    });

    it("keeps missing fee data failing instead of treating it as 0 %", () => {
      const evaluated = calculateFeeClearanceData(null, false, 0);

      expect(evaluated.passed).toBe(false);
      expect(evaluated.cleared).toBe(false);
      expect(evaluated.paidPercentage).toBe(0);
    });

    it("preserves the installment-derived clearance", () => {
      const evaluated = calculateFeeClearanceData(
        {
          totalFee: 40000,
          paidAmount: 40000,
          installments: [
            { status: "PAID" },
            { status: "PAID" },
          ],
        },
        false,
        100,
      );

      expect(evaluated.cleared).toBe(true);
      expect(evaluated.passed).toBe(true);
    });

    it("keeps a partially paid installment plan blocked below the threshold", () => {
      const evaluated = calculateFeeClearanceData(
        {
          totalFee: 40000,
          paidAmount: 20000,
          installments: [
            { status: "PAID" },
            { status: "PENDING" },
          ],
        },
        false,
        75,
      );

      expect(evaluated.cleared).toBe(false);
      expect(evaluated.passed).toBe(false);
    });

    it("preserves the existing fee override behaviour", () => {
      const evaluated = calculateFeeClearanceData(
        { totalFee: 40000, paidAmount: 10000 },
        true,
        75,
      );

      expect(evaluated.passed).toBe(true);
      expect(evaluated.overridden).toBe(true);
      expect(evaluated.cleared).toBe(false);
      expect(evaluated.meetsPaidPercentage).toBe(false);
    });

    it("reads the authoritative StudentFee record for the configured threshold", async () => {
      const collegeId = newId();
      const courseId = newId();
      const studentId = newId();
      await StudentFee.create({
        student_id: studentId,
        college_id: collegeId,
        course_id: courseId,
        totalFee: 50000,
        paidAmount: 40000,
        installments: [],
      });

      await expect(
        evaluateFeeClearance({
          studentId,
          collegeId,
          minimumFeePaidPercentage: 80,
        }),
      ).resolves.toMatchObject({ passed: true, paidPercentage: 80 });

      await expect(
        evaluateFeeClearance({
          studentId,
          collegeId,
          minimumFeePaidPercentage: 90,
        }),
      ).resolves.toMatchObject({ passed: false, paidPercentage: 80 });
    });
  });

  // ---------------------------------------------------------------------------
  // Decision snapshot
  // ---------------------------------------------------------------------------

  describe("decision policy snapshot", () => {
    const buildDecisionContext = async ({ minimumFeePaidPercentage, paidAmount }) => {
      const collegeId = newId();
      const courseId = newId();
      const departmentId = newId();
      const userId = newId();

      const student = await createStudent({
        college_id: collegeId,
        course_id: courseId,
        department_id: departmentId,
        currentSemester: 1,
        currentAcademicYear: "2026-27",
        email: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
      });

      await SemesterResult.create({
        college_id: collegeId,
        student_id: student._id,
        exam_id: newId(),
        course_id: courseId,
        semester: 1,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        status: "PUBLISHED",
        createdBy: userId,
      });

      await PromotionPolicy.create({
        collegeId,
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        minimumFeePaidPercentage,
        isActive: true,
      });

      await StudentFee.create({
        student_id: student._id,
        college_id: collegeId,
        course_id: courseId,
        totalFee: 50000,
        paidAmount,
        installments: [],
      });

      return { collegeId, student, userId };
    };

    it("stores the configured threshold and the calculated fee snapshot", async () => {
      const ctx = await buildDecisionContext({
        minimumFeePaidPercentage: 80,
        paidAmount: 40000,
      });

      const decision = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(decision.policy_snapshot.minimumFeePaidPercentage).toBe(80);
      expect(decision.fee_clearance_snapshot).toMatchObject({
        totalFee: 50000,
        paidAmount: 40000,
        paidPercentage: 80,
        requiredPaidPercentage: 80,
        meetsPaidPercentage: true,
        passed: true,
      });
    });

    it("stores 100 in the snapshot for a policy created without the field", async () => {
      const ctx = await buildDecisionContext({
        minimumFeePaidPercentage: undefined,
        paidAmount: 0,
      });

      const decision = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(decision.policy_snapshot.minimumFeePaidPercentage).toBe(100);
      expect(decision.fee_clearance_snapshot.passed).toBe(false);
    });

    it("records the policy threshold used for a blocked decision", async () => {
      const ctx = await buildDecisionContext({
        minimumFeePaidPercentage: 80,
        paidAmount: 39999,
      });

      const decision = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(decision.policy_snapshot.minimumFeePaidPercentage).toBe(80);
      expect(decision.fee_clearance_snapshot.paidPercentage).toBeCloseTo(79.998, 5);
      expect(decision.fee_clearance_snapshot.passed).toBe(false);
    });

    it("refreshes the stored fee snapshot when a threshold changes", async () => {
      const ctx = await buildDecisionContext({
        minimumFeePaidPercentage: 80,
        paidAmount: 40000,
      });

      await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      await PromotionPolicy.updateOne(
        { college_id: undefined, isActive: true },
        { $set: { minimumFeePaidPercentage: 90 } },
      );

      const refreshed = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(
        await PromotionDecision.countDocuments({
          student_id: ctx.student._id,
        }),
      ).toBe(1);
      expect(refreshed.policy_snapshot.minimumFeePaidPercentage).toBe(90);
      expect(refreshed.fee_clearance_snapshot.passed).toBe(false);
    });
  });
});
