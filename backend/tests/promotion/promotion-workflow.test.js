const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const AuditLog = require("../../src/models/auditLog.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const { createStudent } = require("../helpers/factories");
const {
  submitPromotionRecommendation,
  approvePromotionDecision,
  rejectPromotionDecision,
} = require("../../src/services/promotionWorkflow.service");

describe("Step 5 - promotion recommendation and approval workflow", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const createCase = async (outcome = "PASS") => {
    const collegeId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const student = await createStudent({
      college_id: collegeId,
      course_id: courseId,
      department_id: new mongoose.Types.ObjectId(),
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      email: `workflow-${Date.now()}-${Math.random()}@example.com`,
    });
    const subjectId = new mongoose.Types.ObjectId();
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
          subjectName: "Workflow Subject",
          subjectCode: "WF-101",
          passed: outcome !== "ATKT",
          status: outcome === "ATKT" ? "FAIL" : "PASS",
          marksRecorded: true,
        },
      ],
      totalSubjects: 1,
      passedSubjects: outcome === "ATKT" ? 0 : 1,
      failedSubjects: outcome === "ATKT" ? 1 : 0,
      incompleteSubjects: 0,
      overallResult: outcome === "ATKT" ? "FAIL" : "PASS",
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
      failed_subject_ids: outcome === "ATKT" ? [subjectId] : [],
      failed_subject_count: outcome === "ATKT" ? 1 : 0,
      kt_count: outcome === "ATKT" ? 1 : 0,
      promotion_outcome: outcome,
      decision_reason: "ELIGIBLE",
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
    return { collegeId, student, result, decision, subjectId };
  };

  const actor = () => new mongoose.Types.ObjectId();
  const role = "COLLEGE_ADMIN";

  it("recommends a valid decision and records actor, history, and audit", async () => {
    const { decision, collegeId } = await createCase();
    const actorId = actor();

    const updated = await submitPromotionRecommendation({
      decisionId: decision._id,
      collegeId,
      actorId,
      actorRole: role,
      comment: "Reviewed academic eligibility",
    });

    expect(updated.workflow_status).toBe("RECOMMENDED");
    expect(String(updated.recommendation.user_id)).toBe(String(actorId));
    expect(updated.recommendation.comment).toBe(
      "Reviewed academic eligibility",
    );
    expect(updated.workflow_history).toHaveLength(1);
    expect(
      await AuditLog.countDocuments({
        resourceId: decision._id,
        action: "PROMOTION_RECOMMENDED",
      }),
    ).toBe(1);
  });

  it("rejects duplicate recommendations and unauthorized roles", async () => {
    const { decision, collegeId } = await createCase();
    const input = {
      decisionId: decision._id,
      collegeId,
      actorId: actor(),
      actorRole: role,
    };
    await submitPromotionRecommendation(input);

    await expect(submitPromotionRecommendation(input)).rejects.toMatchObject({
      code: "INVALID_PROMOTION_WORKFLOW_TRANSITION",
    });

    const other = await createCase();
    await expect(
      submitPromotionRecommendation({
        decisionId: other.decision._id,
        collegeId: other.collegeId,
        actorId: actor(),
        actorRole: "TEACHER",
      }),
    ).rejects.toMatchObject({ code: "PROMOTION_WORKFLOW_FORBIDDEN" });
  });

  it("approves a recommended decision without promotion side effects", async () => {
    const { decision, collegeId, student, result } = await createCase();
    const marks = await StudentMarks.create({
      college_id: collegeId,
      exam_id: result.exam_id,
      subject_id: result.subjects[0].subject,
      student_id: student._id,
      internalMarks: 30,
      externalMarks: 60,
      createdBy: actor(),
    });
    await submitPromotionRecommendation({
      decisionId: decision._id,
      collegeId,
      actorId: actor(),
      actorRole: role,
    });
    const beforeResult = (await SemesterResult.findById(result._id)).toObject();
    const beforeMarks = (await StudentMarks.findById(marks._id)).toObject();

    const approved = await approvePromotionDecision({
      decisionId: decision._id,
      collegeId,
      actorId: actor(),
      actorRole: role,
      comment: "Approved for academic progression",
    });

    expect(approved.workflow_status).toBe("APPROVED");
    expect(approved.approval.comment).toBe("Approved for academic progression");
    expect(approved.workflow_history.map((entry) => entry.action)).toEqual([
      "RECOMMEND",
      "APPROVE",
    ]);
    expect((await Student.findById(student._id)).currentSemester).toBe(3);
    expect((await SemesterResult.findById(result._id)).toObject()).toEqual(
      beforeResult,
    );
    expect((await StudentMarks.findById(marks._id)).toObject()).toEqual(
      beforeMarks,
    );
    expect(
      await PromotionHistory.countDocuments({ student_id: student._id }),
    ).toBe(0);
    expect(
      await AuditLog.countDocuments({
        resourceId: decision._id,
        action: "PROMOTION_APPROVED",
      }),
    ).toBe(1);
  });

  it("rejects duplicate approval, invalid outcomes, and stale results", async () => {
    const valid = await createCase();
    await submitPromotionRecommendation({
      decisionId: valid.decision._id,
      collegeId: valid.collegeId,
      actorId: actor(),
      actorRole: role,
    });
    await approvePromotionDecision({
      decisionId: valid.decision._id,
      collegeId: valid.collegeId,
      actorId: actor(),
      actorRole: role,
    });
    await expect(
      approvePromotionDecision({
        decisionId: valid.decision._id,
        collegeId: valid.collegeId,
        actorId: actor(),
        actorRole: role,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PROMOTION_WORKFLOW_TRANSITION" });

    const blocked = await createCase("BLOCKED");
    await expect(
      submitPromotionRecommendation({
        decisionId: blocked.decision._id,
        collegeId: blocked.collegeId,
        actorId: actor(),
        actorRole: role,
      }),
    ).rejects.toMatchObject({ code: "PROMOTION_OUTCOME_NOT_APPROVABLE" });

    const stale = await createCase();
    await submitPromotionRecommendation({
      decisionId: stale.decision._id,
      collegeId: stale.collegeId,
      actorId: actor(),
      actorRole: role,
    });
    await SemesterResult.updateOne(
      { _id: stale.result._id },
      { $set: { status: "LOCKED" } },
    );
    await expect(
      approvePromotionDecision({
        decisionId: stale.decision._id,
        collegeId: stale.collegeId,
        actorId: actor(),
        actorRole: role,
      }),
    ).rejects.toMatchObject({ code: "STALE_PROMOTION_DECISION" });
  });

  it("rejects with a required reason and preserves existing records", async () => {
    const { decision, collegeId, student, result } = await createCase("ATKT");
    await submitPromotionRecommendation({
      decisionId: decision._id,
      collegeId,
      actorId: actor(),
      actorRole: role,
    });
    const beforeResult = (await SemesterResult.findById(result._id)).toObject();

    await expect(
      rejectPromotionDecision({
        decisionId: decision._id,
        collegeId,
        actorId: actor(),
        actorRole: role,
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "REJECTION_REASON_REQUIRED" });

    const rejected = await rejectPromotionDecision({
      decisionId: decision._id,
      collegeId,
      actorId: actor(),
      actorRole: role,
      reason: "Attendance evidence requires further review",
    });
    expect(rejected.workflow_status).toBe("REJECTED");
    expect(rejected.rejection.comment).toBe(
      "Attendance evidence requires further review",
    );
    expect((await Student.findById(student._id)).currentSemester).toBe(3);
    expect((await SemesterResult.findById(result._id)).toObject()).toEqual(
      beforeResult,
    );
    expect(
      await AuditLog.countDocuments({
        resourceId: decision._id,
        action: "PROMOTION_REJECTED",
      }),
    ).toBe(1);
    await expect(
      approvePromotionDecision({
        decisionId: decision._id,
        collegeId,
        actorId: actor(),
        actorRole: role,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PROMOTION_WORKFLOW_TRANSITION" });
  });
});
