const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createStudent,
} = require("../helpers/factories");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const app = require("../../app");

describe("Step 4 — Student Promotion Status Read-Only API", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ---- Test Helpers --------------------------------------------------------

  const setupCollegeAndStudent = async (options = {}) => {
    const college = await createCollege({
      code: `COL_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      email: `col_${Date.now()}_${Math.floor(Math.random() * 100000)}@test.com`,
      name: options.collegeName || "Engineering College",
    });

    const department = await createDepartment({
      college_id: college._id,
      name: "Computer Science",
      createdBy: new mongoose.Types.ObjectId(),
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: "B.Tech Computer Science",
      code: `CS_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    });

    const studentUser = await createUser({
      email: `student.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      user_id: studentUser._id,
      currentSemester: options.currentSemester || 3,
      status: "APPROVED",
    });

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    return {
      college,
      department,
      course,
      studentUser,
      student,
      studentAgent,
    };
  };

  const createDecisionFixture = async (student, overrides = {}) => {
    const semester = overrides.semester !== undefined ? overrides.semester : student.currentSemester;
    const academicYear = overrides.academicYear || "2026-27";
    const sourceResultId = overrides.source_result_id || new mongoose.Types.ObjectId();

    return PromotionDecision.create({
      student_id: student._id,
      college_id: student.college_id,
      course_id: student.course_id,
      semester,
      academicYear,
      source_result_id: sourceResultId,
      source_exam_id: new mongoose.Types.ObjectId(),
      result_status: "PUBLISHED",
      failed_subject_ids: overrides.failed_subject_ids || [],
      failed_subject_count: overrides.failed_subject_count ?? (overrides.kt_count ?? 0),
      kt_count: overrides.kt_count ?? 0,
      promotion_outcome: overrides.promotion_outcome || "PASS",
      decision_reason: overrides.decision_reason || "ELIGIBLE",
      workflow_status: overrides.workflow_status || "APPROVED",
      attendance_snapshot: {
        percentage: 85,
        requiredPercentage: 75,
        totalSessions: 20,
        status: "ELIGIBLE",
        passed: true,
        overridden: false,
        overrideReason: "Internal override reason should be hidden",
      },
      fee_clearance_snapshot: {
        status: "FULLY_PAID",
        totalFee: 50000,
        paidAmount: 50000,
        pendingAmount: 0,
        paidPercentage: 100,
        requiredPaidPercentage: 100,
        requiredClearance: true,
        cleared: true,
        meetsPaidPercentage: true,
        passed: true,
        overridden: false,
      },
      policy_id: new mongoose.Types.ObjectId(),
      policy_version: "v1.0",
      policy_snapshot: {
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        scopedSemesters: [],
        resolvedMaxAllowedKTs: 3,
      },
      recommendation: {
        user_id: new mongoose.Types.ObjectId(),
        at: new Date(),
        comment: "Internal recommendation note",
      },
      approval: {
        user_id: new mongoose.Types.ObjectId(),
        at: new Date(),
        comment: "Internal approval note",
      },
      workflow_history: [
        {
          action: "RECOMMEND",
          performedBy: new mongoose.Types.ObjectId(),
          performedAt: new Date(),
          previousStatus: "DRAFT",
          newStatus: "RECOMMENDED",
          comment: "Internal audit note",
        },
      ],
      createdBy: new mongoose.Types.ObjectId(),
      promotedAt: overrides.promotedAt || null,
      promotedBy: overrides.promotedBy || null,
      createdAt: overrides.createdAt || new Date(),
    });
  };

  // ---- Tests ---------------------------------------------------------------

  it("Test 1 — Student can read own promotion status", async () => {
    const { student, studentAgent } = await setupCollegeAndStudent({ currentSemester: 3 });
    await createDecisionFixture(student, {
      workflow_status: "APPROVED",
      promotion_outcome: "PASS",
      decision_reason: "ELIGIBLE",
      kt_count: 0,
    });

    const res = await studentAgent.get("/api/results/my-promotion-status").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe("APPROVED");
    expect(res.body.data.outcome).toBe("PASS");
    expect(res.body.data.decisionReason).toBe("ELIGIBLE");
    expect(res.body.data.semester).toBe(3);
    expect(res.body.data.academicYear).toBe("2026-27");
    expect(res.body.data.ktCount).toBe(0);
    expect(res.body.data.failedSubjectCount).toBe(0);
    expect(res.body.data.attendance).toEqual({
      percentage: 85,
      requiredPercentage: 75,
      status: "ELIGIBLE",
      passed: true,
    });
    expect(res.body.data.feeClearance).toEqual({
      status: "FULLY_PAID",
      cleared: true,
      passed: true,
    });
    expect(res.body.data.evaluatedAt).toBeDefined();
  });

  it("Test 2 — Student Isolation: Student cannot access another student's decision", async () => {
    const ctxA = await setupCollegeAndStudent({ currentSemester: 3 });
    const ctxB = await setupCollegeAndStudent({ currentSemester: 3 });

    // Student A has PASS
    await createDecisionFixture(ctxA.student, {
      workflow_status: "APPROVED",
      promotion_outcome: "PASS",
      decision_reason: "ELIGIBLE",
    });

    // Student B has ATKT with kt_count 2
    await createDecisionFixture(ctxB.student, {
      workflow_status: "APPROVED",
      promotion_outcome: "ATKT",
      decision_reason: "ELIGIBLE",
      kt_count: 2,
    });

    // Student A requests own status
    const resA = await ctxA.studentAgent.get("/api/results/my-promotion-status").expect(200);
    expect(resA.body.data.outcome).toBe("PASS");
    expect(resA.body.data.ktCount).toBe(0);

    // Student A attempts to pass Student B's studentId in query
    const resHackedQuery = await ctxA.studentAgent
      .get(`/api/results/my-promotion-status?studentId=${ctxB.student._id}`)
      .expect(200);
    // Must STILL return Student A's data, ignoring studentId param
    expect(resHackedQuery.body.data.outcome).toBe("PASS");
    expect(resHackedQuery.body.data.ktCount).toBe(0);

    // Student B requests own status
    const resB = await ctxB.studentAgent.get("/api/results/my-promotion-status").expect(200);
    expect(resB.body.data.outcome).toBe("ATKT");
    expect(resB.body.data.ktCount).toBe(2);
  });

  it("Test 3 — Tenant Isolation: Student cannot access decision from another college", async () => {
    const ctxCollegeA = await setupCollegeAndStudent({ collegeName: "College A", currentSemester: 3 });
    const ctxCollegeB = await setupCollegeAndStudent({ collegeName: "College B", currentSemester: 3 });

    // Create decision in College B only
    await createDecisionFixture(ctxCollegeB.student, {
      workflow_status: "APPROVED",
      promotion_outcome: "PASS",
    });

    // Student from College A queries status: should receive data: null
    const resA = await ctxCollegeA.studentAgent.get("/api/results/my-promotion-status").expect(200);
    expect(resA.body.success).toBe(true);
    expect(resA.body.data).toBeNull();
    expect(resA.body.message).toBe("No promotion decision found for this semester");
  });

  it("Test 4 — No Decision returns 200 with data: null", async () => {
    const { studentAgent } = await setupCollegeAndStudent({ currentSemester: 3 });

    const res = await studentAgent.get("/api/results/my-promotion-status").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toBe("No promotion decision found for this semester");
  });

  it("Test 5 — Semester Filtering: queries requested semester", async () => {
    const { student, studentAgent } = await setupCollegeAndStudent({ currentSemester: 3 });

    // Decision for Semester 2
    await createDecisionFixture(student, {
      semester: 2,
      workflow_status: "PROMOTED",
      promotion_outcome: "PASS",
      academicYear: "2025-26",
    });

    // Decision for Semester 3
    await createDecisionFixture(student, {
      semester: 3,
      workflow_status: "APPROVED",
      promotion_outcome: "ATKT",
      academicYear: "2026-27",
    });

    // Query for Semester 2
    const resSem2 = await studentAgent.get("/api/results/my-promotion-status?semester=2").expect(200);
    expect(resSem2.body.data.semester).toBe(2);
    expect(resSem2.body.data.status).toBe("PROMOTED");
    expect(resSem2.body.data.academicYear).toBe("2025-26");

    // Query for Semester 3
    const resSem3 = await studentAgent.get("/api/results/my-promotion-status?semester=3").expect(200);
    expect(resSem3.body.data.semester).toBe(3);
    expect(resSem3.body.data.status).toBe("APPROVED");
    expect(resSem3.body.data.outcome).toBe("ATKT");
  });

  it("Test 6 — Default Semester: uses student's current semester when omitted", async () => {
    const { student, studentAgent } = await setupCollegeAndStudent({ currentSemester: 4 });

    // Decision for Sem 4
    await createDecisionFixture(student, {
      semester: 4,
      workflow_status: "APPROVED",
      promotion_outcome: "PASS",
    });

    // Decision for Sem 3
    await createDecisionFixture(student, {
      semester: 3,
      workflow_status: "PROMOTED",
      promotion_outcome: "PASS",
    });

    // Omit ?semester
    const res = await studentAgent.get("/api/results/my-promotion-status").expect(200);
    expect(res.body.data.semester).toBe(4);
  });

  it("Test 7 — Latest Decision: returns most recently evaluated decision by createdAt", async () => {
    const { student, studentAgent } = await setupCollegeAndStudent({ currentSemester: 3 });

    const olderDate = new Date(Date.now() - 100000);
    const newerDate = new Date();

    // Older decision
    await createDecisionFixture(student, {
      semester: 3,
      source_result_id: new mongoose.Types.ObjectId(),
      workflow_status: "DRAFT",
      promotion_outcome: "ATKT",
      kt_count: 2,
      createdAt: olderDate,
    });

    // Newer authoritative decision
    await createDecisionFixture(student, {
      semester: 3,
      source_result_id: new mongoose.Types.ObjectId(),
      workflow_status: "APPROVED",
      promotion_outcome: "PASS",
      kt_count: 0,
      createdAt: newerDate,
    });

    const res = await studentAgent.get("/api/results/my-promotion-status?semester=3").expect(200);
    expect(res.body.data.status).toBe("APPROVED");
    expect(res.body.data.outcome).toBe("PASS");
    expect(res.body.data.ktCount).toBe(0);
  });

  it("Test 8 — Response Sanitization: internal administrative/actor fields are completely hidden", async () => {
    const { student, studentAgent } = await setupCollegeAndStudent({ currentSemester: 3 });
    await createDecisionFixture(student, {
      workflow_status: "APPROVED",
      promotion_outcome: "PASS",
    });

    const res = await studentAgent.get("/api/results/my-promotion-status").expect(200);
    const data = res.body.data;

    // Internal workflow/actor fields MUST NOT be present
    expect(data.recommendation).toBeUndefined();
    expect(data.approval).toBeUndefined();
    expect(data.rejection).toBeUndefined();
    expect(data.workflow_history).toBeUndefined();
    expect(data.createdBy).toBeUndefined();
    expect(data.promotedBy).toBeUndefined();
    expect(data.executionBy).toBeUndefined();
    expect(data.policy_id).toBeUndefined();
    expect(data.source_result_id).toBeUndefined();
    expect(data.source_exam_id).toBeUndefined();
    expect(data.policy_snapshot).toBeUndefined();

    // Internal snapshot details MUST NOT be present
    expect(data.attendance.overrideReason).toBeUndefined();
    expect(data.attendance.overridden).toBeUndefined();
    expect(data.feeClearance.totalFee).toBeUndefined();
    expect(data.feeClearance.paidAmount).toBeUndefined();
    expect(data.feeClearance.pendingAmount).toBeUndefined();
    expect(data.feeClearance.overridden).toBeUndefined();
  });

  it("Test 9 — Approved Decision is correctly represented", async () => {
    const { student, studentAgent } = await setupCollegeAndStudent({ currentSemester: 3 });
    await createDecisionFixture(student, {
      workflow_status: "APPROVED",
      promotion_outcome: "ATKT",
      decision_reason: "ELIGIBLE",
      kt_count: 1,
    });

    const res = await studentAgent.get("/api/results/my-promotion-status").expect(200);
    expect(res.body.data.status).toBe("APPROVED");
    expect(res.body.data.outcome).toBe("ATKT");
    expect(res.body.data.decisionReason).toBe("ELIGIBLE");
    expect(res.body.data.promotedAt).toBeNull();
  });

  it("Test 10 — Promoted Decision reflects PROMOTED status and promotedAt date", async () => {
    const { student, studentAgent } = await setupCollegeAndStudent({ currentSemester: 3 });
    const promotionDate = new Date();
    await createDecisionFixture(student, {
      workflow_status: "PROMOTED",
      promotion_outcome: "PASS",
      decision_reason: "ELIGIBLE",
      promotedAt: promotionDate,
      promotedBy: new mongoose.Types.ObjectId(),
    });

    const res = await studentAgent.get("/api/results/my-promotion-status").expect(200);
    expect(res.body.data.status).toBe("PROMOTED");
    expect(res.body.data.outcome).toBe("PASS");
    expect(res.body.data.promotedAt).toBeDefined();
    expect(new Date(res.body.data.promotedAt).toISOString()).toBe(promotionDate.toISOString());
    // promotedBy admin ID must be stripped
    expect(res.body.data.promotedBy).toBeUndefined();
  });

  it("Test 11 — Blocked Decision exposes only safe reasons and no internal comments", async () => {
    const { student, studentAgent } = await setupCollegeAndStudent({ currentSemester: 3 });
    await createDecisionFixture(student, {
      workflow_status: "BLOCKED",
      promotion_outcome: "BLOCKED",
      decision_reason: "KT_LIMIT_EXCEEDED",
      kt_count: 4,
    });

    const res = await studentAgent.get("/api/results/my-promotion-status").expect(200);
    expect(res.body.data.status).toBe("BLOCKED");
    expect(res.body.data.outcome).toBe("BLOCKED");
    expect(res.body.data.decisionReason).toBe("KT_LIMIT_EXCEEDED");
    expect(res.body.data.ktCount).toBe(4);
    expect(res.body.data.recommendation).toBeUndefined();
  });

  it("Test 12 — Role Authorization: unauthenticated and unauthorized roles are rejected", async () => {
    const { college } = await setupCollegeAndStudent();

    // 1. Unauthenticated request -> 401
    await request(app).get("/api/results/my-promotion-status").expect(401);

    // 2. Teacher role (not a student) -> 403 FORBIDDEN_ROLE
    const teacherUser = await createUser({
      email: `teacher.${Date.now()}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    const resTeacher = await teacherAgent.get("/api/results/my-promotion-status").expect(403);
    expect(resTeacher.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("Test 13 — Invalid semester parameter returns 400 INVALID_SEMESTER", async () => {
    const { studentAgent } = await setupCollegeAndStudent();

    // Out of bounds semester: 9
    const res9 = await studentAgent.get("/api/results/my-promotion-status?semester=9").expect(400);
    expect(res9.body.error.code).toBe("INVALID_SEMESTER");

    // Negative semester: 0
    const res0 = await studentAgent.get("/api/results/my-promotion-status?semester=0").expect(400);
    expect(res0.body.error.code).toBe("INVALID_SEMESTER");

    // Non-integer string
    const resInvalid = await studentAgent.get("/api/results/my-promotion-status?semester=abc").expect(400);
    expect(resInvalid.body.error.code).toBe("INVALID_SEMESTER");
  });
});
