const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");

jest.mock("../../src/services/attendance.service", () => ({
  getAttendanceDataForStudents: jest.fn(),
}));

const {
  getAttendanceDataForStudents,
} = require("../../src/services/attendance.service");

const Backlog = require("../../src/models/backlog.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const {
  createCourse,
  createDepartment,
  createStudent,
  createSubject,
} = require("../helpers/factories");
const {
  createPromotionDecision,
  resolvePromotionPolicy,
} = require("../../src/services/promotionDecision.service");
const { executePromotion } = require("../../src/services/promotionExecution.service");
const {
  getPromotionPolicy,
  updatePromotionPolicy,
} = require("../../src/controllers/promotionPolicy.controller");

/**
 * Phase 6 verification matrix for the course-level promotion / ATKT policy.
 *
 * These tests only exercise existing production behaviour. No business rule is
 * asserted here that is not already implemented in promotionPolicy.model.js,
 * promotionPolicy.util.js, promotionDecision.service.js or
 * promotionExecution.service.js.
 */
describe("Phase 6 - course-level promotion policy matrix", () => {
  beforeAll(connectTestDb);
  afterAll(closeTestDb);

  beforeEach(async () => {
    await clearTestDb();
    getAttendanceDataForStudents.mockResolvedValue([
      { percentage: 80, totalSessions: 10 },
    ]);
  });

  // ---------------------------------------------------------------------------
  // Fixtures
  // ---------------------------------------------------------------------------

  const seedCollege = async () => {
    const collegeId = new mongoose.Types.ObjectId();
    const stamp = Date.now().toString().slice(-6);
    const department = await createDepartment({
      name: `Dept-${stamp}`,
      code: `D${stamp}`,
      college_id: collegeId,
      createdBy: new mongoose.Types.ObjectId(),
    });
    return { collegeId, departmentId: department._id };
  };

  const seedCourse = ({ collegeId, departmentId, name, code, durationSemesters }) =>
    createCourse({
      college_id: collegeId,
      department_id: departmentId,
      name,
      code,
      durationSemesters,
      programLevel: "UG",
      type: "THEORY",
    });

  const seedSubjects = async ({ collegeId, departmentId, courseId, specs }) => {
    const subjects = [];
    for (const spec of specs) {
      subjects.push(
        await createSubject({
          college_id: collegeId,
          department_id: departmentId,
          course_id: courseId,
          name: spec.name,
          code: spec.code,
          semester: 3,
        }),
      );
    }
    return subjects;
  };

  const seedStudent = ({ collegeId, departmentId, courseId }) =>
    createStudent({
      fullName: "Matrix Student",
      email: `matrix-${Date.now()}-${Math.random()}@example.com`,
      college_id: collegeId,
      department_id: departmentId,
      course_id: courseId,
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      status: "APPROVED",
    });

  const seedPaidFee = async ({ collegeId, courseId, studentId }) =>
    StudentFee.create({
      student_id: studentId,
      college_id: collegeId,
      course_id: courseId,
      totalFee: 1000,
      paidAmount: 1000,
      installments: [],
    });

  const seedResult = async ({
    collegeId,
    courseId,
    studentId,
    subjects,
    subjectTypes = [],
    overallResult = "PASS",
  }) =>
    SemesterResult.create({
      college_id: collegeId,
      student_id: studentId,
      exam_id: new mongoose.Types.ObjectId(),
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      subjects: subjects.map((subject, index) => ({
        subject: subject._id,
        passed: overallResult === "PASS",
        status: overallResult === "PASS" ? "PASS" : "FAIL",
        subjectType: subjectTypes[index],
        marksRecorded: true,
      })),
      totalSubjects: subjects.length,
      passedSubjects: overallResult === "PASS" ? subjects.length : 0,
      failedSubjects: overallResult === "PASS" ? 0 : subjects.length,
      incompleteSubjects: 0,
      overallResult,
      status: "PUBLISHED",
      createdBy: new mongoose.Types.ObjectId(),
    });

  /**
   * Builds an APPROVED decision whose policy_snapshot is produced by the same
   * resolver the production code uses, so the execution-time stale-policy
   * comparison is exercised rather than accidentally mismatched.
   */
  const buildApprovedDecision = async ({
    collegeId,
    course,
    student,
    result,
    subjects,
    outcome,
    ktCount,
    resolvedMaxAllowedKTs,
    previousYearClearanceRequired = false,
    previousYearClearancePassed = true,
  }) => {
    const resolved = await resolvePromotionPolicy(collegeId, course._id);
    return PromotionDecision.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      source_result_id: result._id,
      source_exam_id: result.exam_id,
      result_status: "PUBLISHED",
      failed_subject_ids: subjects.map((s) => s._id),
      failed_subject_count: ktCount,
      kt_count: ktCount,
      promotion_outcome: outcome,
      decision_reason: "ELIGIBLE",
      workflow_status: "APPROVED",
      attendance_snapshot: {
        percentage: 80,
        requiredPercentage: 75,
        totalSessions: 10,
        status: "ELIGIBLE",
        passed: true,
        overridden: false,
      },
      fee_clearance_snapshot: {
        status: "FULLY_PAID",
        totalFee: 1000,
        paidAmount: 1000,
        pendingAmount: 0,
        requiredClearance: true,
        cleared: true,
        passed: true,
        overridden: false,
      },
      policy_id: resolved.policyId,
      policy_version: resolved.policyVersion,
      policy_snapshot: {
        ...resolved.snapshot,
        resolvedMaxAllowedKTs,
        previousYearClearanceRequired,
        previousYearClearancePassed,
      },
      createdBy: new mongoose.Types.ObjectId(),
    });
  };

  const approve = (decisionId) =>
    PromotionDecision.updateOne(
      { _id: decisionId },
      { $set: { workflow_status: "APPROVED" } },
    );

  const runExecution = (decisionId, collegeId) =>
    executePromotion({
      decisionId,
      collegeId,
      actorId: new mongoose.Types.ObjectId(),
      actorRole: "COLLEGE_ADMIN",
      actorName: "Matrix Admin",
    });

  const makeRes = () => {
    const res = { statusCode: 200, body: null };
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (payload) => {
      res.body = payload;
      return res;
    };
    return res;
  };

  /** Builds the transition set the UI generates for a course duration. */
  const transitionsFor = (durationSemesters) => {
    const rules = [];
    for (let semester = 1; semester < durationSemesters; semester++) {
      rules.push({
        fromSemester: semester,
        toSemester: semester + 1,
        maxAllowedKTs: 3,
        requirePreviousYearClearance: false,
      });
    }
    return rules;
  };

  // ---------------------------------------------------------------------------
  // SCENARIO 1 - 6 semester course
  // ---------------------------------------------------------------------------

  describe("Scenario 1 - 6 semester course (B.Com)", () => {
    it("stores exactly the five valid transitions and resolves them for a decision", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const bcom = await seedCourse({
        collegeId,
        departmentId,
        name: "B.Com",
        code: "BCOM",
        durationSemesters: 6,
      });

      const rules = transitionsFor(6).map((rule, index) => ({
        ...rule,
        maxAllowedKTs: index === 2 ? 4 : 3,
      }));
      const policy = await PromotionPolicy.create({
        collegeId,
        course_id: bcom._id,
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        ktRules: rules,
      });

      // Exactly 1->2 .. 5->6; no 6->7 is generated or stored.
      expect(policy.ktRules).toHaveLength(5);
      expect(policy.ktRules.map((r) => r.fromSemester)).toEqual([1, 2, 3, 4, 5]);
      expect(policy.ktRules.map((r) => r.toSemester)).toEqual([2, 3, 4, 5, 6]);

      const student = await seedStudent({
        collegeId,
        departmentId,
        courseId: bcom._id,
      });
      await seedPaidFee({ collegeId, courseId: bcom._id, studentId: student._id });
      const subjects = await seedSubjects({
        collegeId,
        departmentId,
        courseId: bcom._id,
        specs: [
          { name: "BC Sem3 T1", code: "BCT1" },
          { name: "BC Sem3 T2", code: "BCT2" },
          { name: "BC Sem3 T3", code: "BCT3" },
          { name: "BC Sem3 T4", code: "BCT4" },
        ],
      });
      await seedResult({
        collegeId,
        courseId: bcom._id,
        studentId: student._id,
        subjects,
        overallResult: "FAIL",
      });

      const decision = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });

      expect(String(decision.policy_snapshot.course_id)).toBe(String(bcom._id));
      expect(decision.policy_snapshot.ktRules).toHaveLength(5);
      // Sem 3 -> 4 is the rule that governs this decision.
      expect(decision.policy_snapshot.resolvedMaxAllowedKTs).toBe(4);
      expect(decision.promotion_outcome).toBe("ATKT");
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2 - 8 semester course
  // ---------------------------------------------------------------------------

  describe("Scenario 2 - 8 semester course (B.Tech)", () => {
    it("stores all seven transitions and resolves them for a decision and execution", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const btech = await seedCourse({
        collegeId,
        departmentId,
        name: "B.Tech",
        code: "BTECH",
        durationSemesters: 8,
      });

      const rules = transitionsFor(8);
      const policy = await PromotionPolicy.create({
        collegeId,
        course_id: btech._id,
        minAttendancePercentage: 80,
        maxAllowedKTs: 3,
        ktRules: rules,
      });

      expect(policy.ktRules).toHaveLength(7);
      expect(policy.ktRules.map((r) => r.fromSemester)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ]);
      expect(policy.ktRules[6].toSemester).toBe(8);

      const student = await seedStudent({
        collegeId,
        departmentId,
        courseId: btech._id,
      });
      await seedPaidFee({ collegeId, courseId: btech._id, studentId: student._id });
      const subjects = await seedSubjects({
        collegeId,
        departmentId,
        courseId: btech._id,
        specs: [{ name: "BT Sem3 T1", code: "BTT1" }],
      });
      const result = await seedResult({
        collegeId,
        courseId: btech._id,
        studentId: student._id,
        subjects,
        overallResult: "PASS",
      });

      const decision = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });

      expect(decision.policy_snapshot.minAttendancePercentage).toBe(80);
      expect(decision.policy_snapshot.course_id).toBeDefined();
      expect(String(decision.policy_snapshot.course_id)).toBe(String(btech._id));

      await approve(decision._id);
      const executed = await runExecution(decision._id, collegeId);
      expect(executed.executionStatus).toBe("PROMOTED");
      expect(
        (await Student.findById(student._id)).currentSemester,
      ).toBe(4);
      expect(String(decision.source_result_id)).toBe(String(result._id));
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3 - two courses, different KT limits
  // ---------------------------------------------------------------------------

  describe("Scenario 3 - two courses with different Sem 3 -> 4 limits", () => {
    it("allows 3 KT for the lenient course and blocks them for the strict course", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const bcom = await seedCourse({
        collegeId,
        departmentId,
        name: "B.Com",
        code: "BCOM3",
        durationSemesters: 6,
      });
      const btech = await seedCourse({
        collegeId,
        departmentId,
        name: "B.Tech",
        code: "BTECH3",
        durationSemesters: 8,
      });

      const baseRule = (maxAllowedKTs) => [
        {
          fromSemester: 3,
          toSemester: 4,
          maxAllowedKTs,
          requirePreviousYearClearance: false,
        },
      ];

      await PromotionPolicy.create({
        collegeId,
        course_id: bcom._id,
        ktRules: baseRule(4),
      });
      await PromotionPolicy.create({
        collegeId,
        course_id: btech._id,
        ktRules: baseRule(2),
      });

      const buildCase = async (course) => {
        const student = await seedStudent({
          collegeId,
          departmentId,
          courseId: course._id,
        });
        await seedPaidFee({
          collegeId,
          courseId: course._id,
          studentId: student._id,
        });
        const subjects = await seedSubjects({
          collegeId,
          departmentId,
          courseId: course._id,
          specs: [1, 2, 3].map((n) => ({
            name: `${course.code} S3 ${n}`,
            code: `${course.code}${n}`,
          })),
        });
        await seedResult({
          collegeId,
          courseId: course._id,
          studentId: student._id,
          subjects,
          overallResult: "FAIL",
        });
        return student;
      };

      const lenientStudent = await buildCase(bcom);
      const strictStudent = await buildCase(btech);

      const lenient = await createPromotionDecision({
        studentId: lenientStudent._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });
      const strict = await createPromotionDecision({
        studentId: strictStudent._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });

      expect(lenient.promotion_outcome).toBe("ATKT");
      expect(lenient.policy_snapshot.resolvedMaxAllowedKTs).toBe(4);
      expect(strict.promotion_outcome).toBe("BLOCKED");
      expect(strict.decision_reason).toBe("KT_LIMIT_EXCEEDED");
      expect(strict.policy_snapshot.resolvedMaxAllowedKTs).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4 - course policy isolation
  // ---------------------------------------------------------------------------

  describe("Scenario 4 - course policy isolation", () => {
    it("keeps each course's policy independent when either is updated", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const courseA = await seedCourse({
        collegeId,
        departmentId,
        name: "Course A",
        code: "CA",
        durationSemesters: 6,
      });
      const courseB = await seedCourse({
        collegeId,
        departmentId,
        name: "Course B",
        code: "CB",
        durationSemesters: 8,
      });

      const rule = (maxAllowedKTs) => [
        { fromSemester: 3, toSemester: 4, maxAllowedKTs },
      ];

      await PromotionPolicy.create({
        collegeId,
        course_id: courseA._id,
        ktRules: rule(4),
      });
      await PromotionPolicy.create({
        collegeId,
        course_id: courseB._id,
        ktRules: rule(2),
      });

      await PromotionPolicy.updateOne(
        { collegeId, course_id: courseA._id },
        { $set: { ktRules: rule(1) } },
      );

      const afterA = await PromotionPolicy.getActivePolicy(
        collegeId,
        courseB._id,
      );
      expect(afterA.ktRules[0].maxAllowedKTs).toBe(2);
      const aAfterA = await PromotionPolicy.getActivePolicy(collegeId, courseA._id);
      expect(aAfterA.ktRules[0].maxAllowedKTs).toBe(1);

      await PromotionPolicy.updateOne(
        { collegeId, course_id: courseB._id },
        { $set: { ktRules: rule(5) } },
      );

      const aAfterB = await PromotionPolicy.getActivePolicy(collegeId, courseA._id);
      expect(aAfterB.ktRules[0].maxAllowedKTs).toBe(1);
      const bAfterB = await PromotionPolicy.getActivePolicy(collegeId, courseB._id);
      expect(bAfterB.ktRules[0].maxAllowedKTs).toBe(5);

      // Both remain active and distinct - no deactivation side effect.
      expect(
        await PromotionPolicy.countDocuments({
          collegeId,
          isActive: true,
        }),
      ).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5 - college level fallback
  // ---------------------------------------------------------------------------

  describe("Scenario 5 - college-level fallback", () => {
    it("uses the college policy, then switches to a course policy when created", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const courseA = await seedCourse({
        collegeId,
        departmentId,
        name: "Course A",
        code: "FA",
        durationSemesters: 6,
      });
      const courseB = await seedCourse({
        collegeId,
        departmentId,
        name: "Course B",
        code: "FB",
        durationSemesters: 8,
      });

      await PromotionPolicy.create({
        collegeId,
        course_id: null,
        maxAllowedKTs: 3,
      });

      // Course A has no specific policy -> college fallback.
      const fallbackA = await PromotionPolicy.getActivePolicy(
        collegeId,
        courseA._id,
      );
      expect(fallbackA.course_id).toBeNull();
      expect(fallbackA.maxAllowedKTs).toBe(3);

      const fallbackB = await PromotionPolicy.getActivePolicy(
        collegeId,
        courseB._id,
      );
      expect(fallbackB.maxAllowedKTs).toBe(3);

      // The decision snapshot must still record the student's course.
      const studentA = await seedStudent({
        collegeId,
        departmentId,
        courseId: courseA._id,
      });
      await seedPaidFee({
        collegeId,
        courseId: courseA._id,
        studentId: studentA._id,
      });
      const subjectsA = await seedSubjects({
        collegeId,
        departmentId,
        courseId: courseA._id,
        specs: [{ name: "FA S3", code: "FAS3" }],
      });
      await seedResult({
        collegeId,
        courseId: courseA._id,
        studentId: studentA._id,
        subjects: subjectsA,
        overallResult: "PASS",
      });

      const beforeOverride = await createPromotionDecision({
        studentId: studentA._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });
      expect(beforeOverride.policy_snapshot.maxAllowedKTs).toBe(3);
      expect(String(beforeOverride.policy_snapshot.course_id)).toBe(
        String(courseA._id),
      );
      expect(beforeOverride.policy_snapshot.course_id).not.toBeNull();

      // Now create a course-specific policy with a different global limit.
      await PromotionPolicy.create({
        collegeId,
        course_id: courseA._id,
        maxAllowedKTs: 5,
      });

      const specificA = await PromotionPolicy.getActivePolicy(
        collegeId,
        courseA._id,
      );
      expect(String(specificA.course_id)).toBe(String(courseA._id));
      expect(specificA.maxAllowedKTs).toBe(5);

      // Course B still falls back to the college policy.
      const stillB = await PromotionPolicy.getActivePolicy(
        collegeId,
        courseB._id,
      );
      expect(stillB.maxAllowedKTs).toBe(3);

      const studentB = await seedStudent({
        collegeId,
        departmentId,
        courseId: courseB._id,
      });
      await seedPaidFee({
        collegeId,
        courseId: courseB._id,
        studentId: studentB._id,
      });
      const subjectsB = await seedSubjects({
        collegeId,
        departmentId,
        courseId: courseB._id,
        specs: [{ name: "FB S3", code: "FBS3" }],
      });
      await seedResult({
        collegeId,
        courseId: courseB._id,
        studentId: studentB._id,
        subjects: subjectsB,
        overallResult: "PASS",
      });

      const afterOverrideA = await createPromotionDecision({
        studentId: studentA._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });
      expect(afterOverrideA.policy_snapshot.maxAllowedKTs).toBe(5);

      const decisionB = await createPromotionDecision({
        studentId: studentB._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });
      expect(decisionB.policy_snapshot.maxAllowedKTs).toBe(3);
      expect(String(decisionB.policy_snapshot.course_id)).toBe(
        String(courseB._id),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6 - subject type limits
  // ---------------------------------------------------------------------------

  describe("Scenario 6 - subject-type KT limits", () => {
    const subjectTypePolicy = () => [
      {
        fromSemester: 3,
        toSemester: 4,
        maxAllowedKTs: 4,
        requirePreviousYearClearance: false,
        subjectTypeLimits: { THEORY: 2, PRACTICAL: 1, COMPOSITE: 1 },
      },
    ];

    const buildStudent = async ({ collegeId, departmentId, course, subjects }) => {
      const student = await seedStudent({
        collegeId,
        departmentId,
        courseId: course._id,
      });
      await seedPaidFee({
        collegeId,
        courseId: course._id,
        studentId: student._id,
      });
      const created = await seedSubjects({
        collegeId,
        departmentId,
        courseId: course._id,
        specs: subjects,
      });
      await seedResult({
        collegeId,
        courseId: course._id,
        studentId: student._id,
        subjects: created,
        subjectTypes: subjects.map((s) => s.subjectType),
        overallResult: "FAIL",
      });
      return student;
    };

    it("enforces THEORY, PRACTICAL and COMPOSITE limits at decision time", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const course = await seedCourse({
        collegeId,
        departmentId,
        name: "Typed Course",
        code: "TYP",
        durationSemesters: 6,
      });
      await PromotionPolicy.create({
        collegeId,
        course_id: course._id,
        ktRules: subjectTypePolicy(),
      });

      const withinLimits = await buildStudent({
        collegeId,
        departmentId,
        course,
        subjects: [
          { name: "T1", code: "TT1", subjectType: "THEORY" },
          { name: "T2", code: "TT2", subjectType: "THEORY" },
          { name: "P1", code: "TP1", subjectType: "PRACTICAL" },
        ],
      });
      const decisionWithin = await createPromotionDecision({
        studentId: withinLimits._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });
      expect(decisionWithin.promotion_outcome).toBe("ATKT");

      const theoryOverrun = await buildStudent({
        collegeId,
        departmentId,
        course,
        subjects: [
          { name: "O1", code: "TO1", subjectType: "THEORY" },
          { name: "O2", code: "TO2", subjectType: "THEORY" },
          { name: "O3", code: "TO3", subjectType: "THEORY" },
        ],
      });
      const decisionTheory = await createPromotionDecision({
        studentId: theoryOverrun._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });
      expect(decisionTheory.promotion_outcome).toBe("BLOCKED");

      const practicalOverrun = await buildStudent({
        collegeId,
        departmentId,
        course,
        subjects: [
          { name: "OP1", code: "TOP1", subjectType: "PRACTICAL" },
          { name: "OP2", code: "TOP2", subjectType: "PRACTICAL" },
        ],
      });
      const decisionPractical = await createPromotionDecision({
        studentId: practicalOverrun._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });
      expect(decisionPractical.promotion_outcome).toBe("BLOCKED");
    });

    it("re-applies subject-type limits during execution", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const course = await seedCourse({
        collegeId,
        departmentId,
        name: "Typed Exec",
        code: "TYPX",
        durationSemesters: 6,
      });
      await PromotionPolicy.create({
        collegeId,
        course_id: course._id,
        ktRules: subjectTypePolicy(),
      });

      const student = await seedStudent({
        collegeId,
        departmentId,
        courseId: course._id,
      });
      await seedPaidFee({
        collegeId,
        courseId: course._id,
        studentId: student._id,
      });
      const subjects = await seedSubjects({
        collegeId,
        departmentId,
        courseId: course._id,
        specs: [1, 2, 3].map((n) => ({
          name: `Exec Theory ${n}`,
          code: `EX${n}`,
        })),
      });
      const result = await seedResult({
        collegeId,
        courseId: course._id,
        studentId: student._id,
        subjects,
        subjectTypes: ["THEORY", "THEORY", "THEORY"],
        overallResult: "FAIL",
      });

      // Craft an approved decision that claims eligibility despite 3 THEORY KTs.
      const decision = await buildApprovedDecision({
        collegeId,
        course,
        student,
        result,
        subjects,
        outcome: "ATKT",
        ktCount: 3,
        resolvedMaxAllowedKTs: 4,
      });

      await expect(runExecution(decision._id, collegeId)).rejects.toMatchObject({
        code: "SUBJECT_TYPE_KT_LIMIT_EXCEEDED",
      });

      expect((await Student.findById(student._id)).currentSemester).toBe(3);
      expect(
        await PromotionHistory.countDocuments({
          promotion_decision_id: decision._id,
        }),
      ).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7 - previous year clearance
  // ---------------------------------------------------------------------------

  describe("Scenario 7 - previous-year clearance", () => {
    const clearanceRule = (required) => [
      {
        fromSemester: 3,
        toSemester: 4,
        maxAllowedKTs: 3,
        requirePreviousYearClearance: required,
      },
    ];

    const prepare = async ({ required, backlogStatus }) => {
      const { collegeId, departmentId } = await seedCollege();
      const course = await seedCourse({
        collegeId,
        departmentId,
        name: "Clearance Course",
        code: `CLR${Date.now().toString().slice(-4)}`,
        durationSemesters: 6,
      });
      await PromotionPolicy.create({
        collegeId,
        course_id: course._id,
        ktRules: clearanceRule(required),
      });

      const student = await seedStudent({
        collegeId,
        departmentId,
        courseId: course._id,
      });
      await seedPaidFee({
        collegeId,
        courseId: course._id,
        studentId: student._id,
      });
      const subjects = await seedSubjects({
        collegeId,
        departmentId,
        courseId: course._id,
        specs: [{ name: "Clearance S3", code: "CLS3" }],
      });
      const result = await seedResult({
        collegeId,
        courseId: course._id,
        studentId: student._id,
        subjects,
        overallResult: "FAIL",
      });

      if (backlogStatus) {
        await Backlog.create({
          student_id: student._id,
          college_id: collegeId,
          course_id: course._id,
          semester: 2,
          academicYear: "2025-26",
          original_exam_id: result.exam_id,
          original_result_id: result._id,
          subject_id: subjects[0]._id,
          subject_code: "CLS3",
          subject_name: "Clearance S3",
          subject_type: "THEORY",
          original_marks_snapshot: { status: "FAIL", totalMarks: 30 },
          status: backlogStatus,
        });
      }

      return { collegeId, course, student, result, subjects };
    };

    it("blocks the decision when the previous-year backlog is not cleared", async () => {
      const { collegeId, student } = await prepare({
        required: true,
        backlogStatus: "OPEN",
      });

      const decision = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });

      expect(decision.policy_snapshot.previousYearClearanceRequired).toBe(true);
      expect(decision.policy_snapshot.previousYearClearancePassed).toBe(false);
      expect(decision.promotion_outcome).toBe("BLOCKED");
      expect(decision.decision_reason).toBe(
        "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED",
      );
    });

    it("passes the decision when the previous-year backlog is cleared", async () => {
      const { collegeId, student } = await prepare({
        required: true,
        backlogStatus: "CLEARED",
      });

      const decision = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });

      expect(decision.policy_snapshot.previousYearClearanceRequired).toBe(true);
      expect(decision.policy_snapshot.previousYearClearancePassed).toBe(true);
      expect(decision.promotion_outcome).toBe("ATKT");
    });

    it("re-applies clearance during execution", async () => {
      const { collegeId, course, student, result, subjects } = await prepare({
        required: true,
        backlogStatus: "CLEARED",
      });

      const decision = await buildApprovedDecision({
        collegeId,
        course,
        student,
        result,
        subjects,
        outcome: "ATKT",
        ktCount: 1,
        resolvedMaxAllowedKTs: 3,
        previousYearClearanceRequired: true,
        previousYearClearancePassed: true,
      });

      // Clear the backlog at decision time, then open it before execution.
      await Backlog.updateOne(
        { student_id: student._id },
        { $set: { status: "OPEN" } },
      );

      await expect(runExecution(decision._id, collegeId)).rejects.toMatchObject({
        code: "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED",
      });

      expect((await Student.findById(student._id)).currentSemester).toBe(3);
      expect(
        await PromotionHistory.countDocuments({
          promotion_decision_id: decision._id,
        }),
      ).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8 - stale policy
  // ---------------------------------------------------------------------------

  describe("Scenario 8 - stale policy detection", () => {
    it("rejects execution when the course policy changed after the decision", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const course = await seedCourse({
        collegeId,
        departmentId,
        name: "Stale Course",
        code: "STL",
        durationSemesters: 6,
      });
      const policy = await PromotionPolicy.create({
        collegeId,
        course_id: course._id,
        ktRules: [
          {
            fromSemester: 3,
            toSemester: 4,
            maxAllowedKTs: 4,
            requirePreviousYearClearance: false,
          },
        ],
      });

      const student = await seedStudent({
        collegeId,
        departmentId,
        courseId: course._id,
      });
      await seedPaidFee({
        collegeId,
        courseId: course._id,
        studentId: student._id,
      });
      const subjects = await seedSubjects({
        collegeId,
        departmentId,
        courseId: course._id,
        specs: [{ name: "Stale S3", code: "STS3" }],
      });
      const result = await seedResult({
        collegeId,
        courseId: course._id,
        studentId: student._id,
        subjects,
        overallResult: "PASS",
      });

      const decision = await buildApprovedDecision({
        collegeId,
        course,
        student,
        result,
        subjects,
        outcome: "PASS",
        ktCount: 0,
        resolvedMaxAllowedKTs: 4,
      });

      // Admin lowers the Sem 3 -> 4 limit after approval.
      await PromotionPolicy.updateOne(
        { _id: policy._id },
        {
          $set: {
            ktRules: [
              {
                fromSemester: 3,
                toSemester: 4,
                maxAllowedKTs: 2,
                requirePreviousYearClearance: false,
              },
            ],
          },
        },
      );

      await expect(runExecution(decision._id, collegeId)).rejects.toMatchObject({
        code: "STALE_DECISION",
      });

      expect((await Student.findById(student._id)).currentSemester).toBe(3);
      expect(
        await PromotionHistory.countDocuments({
          promotion_decision_id: decision._id,
        }),
      ).toBe(0);
      expect(
        (await PromotionDecision.findById(decision._id)).workflow_status,
      ).toBe("APPROVED");
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 9 - course switch after decision creation
  // ---------------------------------------------------------------------------

  describe("Scenario 9 - student course switch", () => {
    it("refuses to execute a decision after the student changed course", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const courseA = await seedCourse({
        collegeId,
        departmentId,
        name: "Switch A",
        code: "SWA",
        durationSemesters: 6,
      });
      const courseB = await seedCourse({
        collegeId,
        departmentId,
        name: "Switch B",
        code: "SWB",
        durationSemesters: 8,
      });
      await PromotionPolicy.create({
        collegeId,
        course_id: courseA._id,
        maxAllowedKTs: 4,
      });

      const student = await seedStudent({
        collegeId,
        departmentId,
        courseId: courseA._id,
      });
      await seedPaidFee({
        collegeId,
        courseId: courseA._id,
        studentId: student._id,
      });
      const subjects = await seedSubjects({
        collegeId,
        departmentId,
        courseId: courseA._id,
        specs: [{ name: "Switch S3", code: "SWS3" }],
      });
      const result = await seedResult({
        collegeId,
        courseId: courseA._id,
        studentId: student._id,
        subjects,
        overallResult: "PASS",
      });

      const decision = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId: new mongoose.Types.ObjectId(),
      });
      expect(String(decision.course_id)).toBe(String(courseA._id));
      expect(String(decision.policy_snapshot.course_id)).toBe(
        String(courseA._id),
      );

      await approve(decision._id);
      await Student.updateOne(
        { _id: student._id },
        { $set: { course_id: courseB._id } },
      );

      await expect(runExecution(decision._id, collegeId)).rejects.toMatchObject({
        code: "STUDENT_STATE_CHANGED",
      });

      expect((await Student.findById(student._id)).currentSemester).toBe(3);
      expect(
        await PromotionHistory.countDocuments({
          promotion_decision_id: decision._id,
        }),
      ).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 10 - cross-college course access
  // ---------------------------------------------------------------------------

  describe("Scenario 10 - tenant isolation", () => {
    it("rejects read and write for a course owned by another college", async () => {
      const collegeA = await seedCollege();
      const collegeB = await seedCollege();
      const courseInB = await seedCourse({
        collegeId: collegeB.collegeId,
        departmentId: collegeB.departmentId,
        name: "College B Course",
        code: "CBC",
        durationSemesters: 6,
      });
      await PromotionPolicy.create({
        collegeId: collegeB.collegeId,
        course_id: courseInB._id,
        maxAllowedKTs: 1,
      });

      const resGet = makeRes();
      const nextGet = jest.fn();
      await getPromotionPolicy(
        { query: { course_id: String(courseInB._id) }, college_id: collegeA.collegeId },
        resGet,
        nextGet,
      );
      expect(nextGet).toHaveBeenCalled();
      expect(nextGet.mock.calls[0][0].code).toBe("COURSE_NOT_FOUND");

      const resPut = makeRes();
      const nextPut = jest.fn();
      await updatePromotionPolicy(
        {
          body: { course_id: String(courseInB._id), minAttendancePercentage: 10 },
          college_id: collegeA.collegeId,
        },
        resPut,
        nextPut,
      );
      expect(nextPut).toHaveBeenCalled();
      expect(nextPut.mock.calls[0][0].code).toBe("COURSE_NOT_FOUND");

      // The other college's policy is untouched.
      const untouched = await PromotionPolicy.getActivePolicy(
        collegeB.collegeId,
        courseInB._id,
      );
      expect(untouched.maxAllowedKTs).toBe(1);
    });

    it("ignores a client-supplied college_id in the request body", async () => {
      const collegeA = await seedCollege();
      const collegeB = await seedCollege();
      const courseInB = await seedCourse({
        collegeId: collegeB.collegeId,
        departmentId: collegeB.departmentId,
        name: "Guarded Course",
        code: "GDC",
        durationSemesters: 6,
      });

      const res = makeRes();
      const next = jest.fn();
      await updatePromotionPolicy(
        {
          body: {
            // Attacker claims the target college but authenticates as college A.
            college_id: String(collegeB.collegeId),
            course_id: String(courseInB._id),
            minAttendancePercentage: 10,
          },
          college_id: collegeA.collegeId,
        },
        res,
        next,
      );

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].code).toBe("COURSE_NOT_FOUND");
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 11 - legacy college policy coexistence
  // ---------------------------------------------------------------------------

  describe("Scenario 11 - legacy college-level policy", () => {
    it("keeps a course_id-less policy usable and coexisting with course policies", async () => {
      const { collegeId, departmentId } = await seedCollege();
      const course = await seedCourse({
        collegeId,
        departmentId,
        name: "Legacy Course",
        code: "LEG",
        durationSemesters: 6,
      });

      // Simulate a pre-migration document with no course_id field at all.
      await PromotionPolicy.collection.insertOne({
        collegeId,
        minAttendancePercentage: 70,
        maxAllowedKTs: 3,
        scopedSemesters: [],
        effectiveFrom: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const collegeLevel = await PromotionPolicy.getActivePolicy(collegeId);
      expect(collegeLevel.minAttendancePercentage).toBe(70);
      expect(collegeLevel.maxAllowedKTs).toBe(3);

      // getActivePolicy without a course still resolves the legacy document.
      const withoutCourse = await PromotionPolicy.getActivePolicy(collegeId);
      expect(String(withoutCourse._id)).toBe(String(collegeLevel._id));

      // A course without a specific policy falls back to the legacy document.
      const fallback = await PromotionPolicy.getActivePolicy(collegeId, course._id);
      expect(String(fallback._id)).toBe(String(collegeLevel._id));

      // A course-specific policy coexists and takes precedence.
      await PromotionPolicy.create({
        collegeId,
        course_id: course._id,
        maxAllowedKTs: 1,
      });
      const specific = await PromotionPolicy.getActivePolicy(collegeId, course._id);
      expect(String(specific.course_id)).toBe(String(course._id));
      expect(specific.maxAllowedKTs).toBe(1);

      // Creating a course policy must not deactivate the college policy.
      expect(
        await PromotionPolicy.countDocuments({
          collegeId,
          course_id: null,
          isActive: true,
        }),
      ).toBe(1);
    });
  });
});
