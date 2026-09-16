const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const Backlog = require("../../src/models/backlog.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const { createStudent } = require("../helpers/factories");
const {
  createBacklogsForPromotionDecision,
} = require("../../src/services/backlog.service");

describe("Step 4 - ATKT backlog creation", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const createCase = async (statuses, outcome = "ATKT") => {
    const collegeId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const student = await createStudent({
      college_id: collegeId,
      course_id: courseId,
      department_id: new mongoose.Types.ObjectId(),
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      email: `backlog-${Date.now()}-${Math.random()}@example.com`,
    });
    const subjectSnapshots = statuses.map((status) => ({
      subject: new mongoose.Types.ObjectId(),
      subjectCode: `SUB-${Math.random()}`,
      subjectName: `Subject ${Math.random()}`,
      subjectType: "THEORY",
      internalMarks: status === "FAIL" ? 10 : 30,
      externalMarks: status === "FAIL" ? 20 : 60,
      totalMarks: status === "FAIL" ? 30 : 90,
      passed: status === "PASS",
      status,
      marksRecorded: true,
    }));
    const result = await SemesterResult.create({
      college_id: collegeId,
      student_id: student._id,
      exam_id: new mongoose.Types.ObjectId(),
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      subjects: subjectSnapshots,
      totalSubjects: statuses.length,
      passedSubjects: statuses.filter((status) => status === "PASS").length,
      failedSubjects: statuses.filter((status) => status === "FAIL").length,
      incompleteSubjects: statuses.filter((status) => status === "INCOMPLETE")
        .length,
      overallResult: statuses.includes("FAIL") ? "FAIL" : "PASS",
      status: "PUBLISHED",
      createdBy: new mongoose.Types.ObjectId(),
    });
    const failedSubjectIds = subjectSnapshots
      .filter((subject) => subject.status === "FAIL")
      .map((subject) => subject.subject);
    const decision = await PromotionDecision.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      source_result_id: result._id,
      source_exam_id: result.exam_id,
      result_status: "PUBLISHED",
      failed_subject_ids: failedSubjectIds,
      failed_subject_count: failedSubjectIds.length,
      kt_count: failedSubjectIds.length,
      promotion_outcome: outcome,
      decision_reason: outcome === "ATKT" ? "ELIGIBLE" : outcome,
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
      policy_version: "test",
      policy_snapshot: {
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        scopedSemesters: [],
      },
      createdBy: new mongoose.Types.ObjectId(),
    });
    return { student, result, decision, subjectSnapshots };
  };

  it.each([1, 2, 3])(
    "creates %i OPEN backlog(s) for %i KT",
    async (ktCount) => {
      const { decision } = await createCase(Array(ktCount).fill("FAIL"));

      const created = await createBacklogsForPromotionDecision(decision);

      expect(created).toHaveLength(ktCount);
      expect(created.every((backlog) => backlog.status === "OPEN")).toBe(true);
      expect(
        await Backlog.countDocuments({ student_id: decision.student_id }),
      ).toBe(ktCount);
    },
  );

  it("does not create backlogs for an over-limit decision", async () => {
    const { decision } = await createCase(Array(4).fill("FAIL"), "BLOCKED");

    expect(await createBacklogsForPromotionDecision(decision)).toEqual([]);
    expect(
      await Backlog.countDocuments({ student_id: decision.student_id }),
    ).toBe(0);
  });

  it.each(["PASS", "INCOMPLETE", "NO_RESULT", "AMBIGUOUS_RESULT", "BLOCKED"])(
    "does not create backlogs for %s",
    async (outcome) => {
      const { decision } = await createCase(["FAIL"], outcome);

      expect(await createBacklogsForPromotionDecision(decision)).toEqual([]);
      expect(
        await Backlog.countDocuments({ student_id: decision.student_id }),
      ).toBe(0);
    },
  );

  it("preserves the published result and is idempotent", async () => {
    const { student, result, decision, subjectSnapshots } = await createCase([
      "FAIL",
      "FAIL",
    ]);
    const marks = await StudentMarks.create({
      college_id: student.college_id,
      exam_id: result.exam_id,
      subject_id: subjectSnapshots[0].subject,
      student_id: student._id,
      internalMarks: 10,
      externalMarks: 20,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const beforeResult = (await SemesterResult.findById(result._id)).toObject();
    const beforeMarks = marks.toObject();
    const beforeSemester = student.currentSemester;

    await createBacklogsForPromotionDecision(decision);
    const secondRun = await createBacklogsForPromotionDecision(decision);

    expect(secondRun).toHaveLength(2);
    expect(
      await Backlog.countDocuments({ student_id: student._id, status: "OPEN" }),
    ).toBe(2);
    expect((await SemesterResult.findById(result._id)).toObject()).toEqual(
      beforeResult,
    );
    expect((await StudentMarks.findById(marks._id)).toObject()).toEqual(
      beforeMarks,
    );
    expect((await Student.findById(student._id)).currentSemester).toBe(
      beforeSemester,
    );
    expect(
      await PromotionHistory.countDocuments({ student_id: student._id }),
    ).toBe(0);

    const backlog = await Backlog.findOne({ student_id: student._id });
    expect(String(backlog.original_result_id)).toBe(String(result._id));
    expect(String(backlog.original_exam_id)).toBe(String(result.exam_id));
    expect(backlog.original_marks_snapshot).toMatchObject({
      subjectCode: subjectSnapshots[0].subjectCode,
      subjectName: subjectSnapshots[0].subjectName,
      status: "FAIL",
    });
  });
});
