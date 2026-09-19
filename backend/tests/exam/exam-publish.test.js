const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { createCollege, createUser, createDepartment, createCourse, createSubject } = require("../helpers/factories");
const app = require("../../app");
const Exam = require("../../src/models/exam.model");

describe("EXM-TC-003 — Exam publish workflow", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const baseSetup = async () => {
    const college = await createCollege({
      code: `PUB${Date.now()}`,
      email: `publish.${Date.now()}@test.com`,
    });
    const coordinator = await createUser({
      email: `coordinator.publish.${Date.now()}@test.com`,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: coordinator.email, password: "Test@123" })
      .expect(200);

    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Computer Science",
      code: "CS",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
    });
    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech CSE",
      code: "BTECH-CSE",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });
    const subject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Data Structures",
      code: `DS-${Date.now()}`,
      semester: 3,
      credits: 4,
    });

    const created = await agent
      .post("/api/exam")
      .send({
        name: "Mid-Term Examination",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject._id],
      })
      .expect(201);

    return { college, agent, exam: created.body.exam };
  };

  it("P1 — EXAM_COORDINATOR can publish a DRAFT exam", async () => {
    const { agent, exam } = await baseSetup();

    expect(exam.status).toBe("DRAFT");

    const res = await agent
      .put(`/api/exam/${exam._id}/publish`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.exam.status).toBe("PUBLISHED");

    const updated = await Exam.findById(exam._id);
    expect(updated.status).toBe("PUBLISHED");

    const AuditLog = require("../../src/models/auditLog.model");
    const log = await AuditLog.findOne({
      resourceType: "Exam",
      resourceId: exam._id,
      action: "EXAM_PUBLISHED",
    });
    expect(log).toBeDefined();
    expect(log.oldValues.status).toBe("DRAFT");
    expect(log.newValues.status).toBe("PUBLISHED");
  });

  it("P2 — publishing an already PUBLISHED exam is idempotent", async () => {
    const { agent, exam } = await baseSetup();

    await agent.put(`/api/exam/${exam._id}/publish`).expect(200);

    const res = await agent
      .put(`/api/exam/${exam._id}/publish`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.exam.status).toBe("PUBLISHED");

    const AuditLog = require("../../src/models/auditLog.model");
    const logs = await AuditLog.find({
      resourceType: "Exam",
      resourceId: exam._id,
      action: "EXAM_PUBLISHED",
    });
    expect(logs).toHaveLength(1);
  });

  it("P3 — non-existent exam returns 404", async () => {
    const { agent } = await baseSetup();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await agent.put(`/api/exam/${fakeId}/publish`).expect(404);
    expect(res.body.message).toBeDefined();
  });

  it("P4 — cross-college publish is blocked", async () => {
    const { agent, exam } = await baseSetup();

    const collegeB = await createCollege({
      code: `PUB${Date.now()}`,
      email: `publish.b.${Date.now()}@test.com`,
    });
    const coordinatorB = await createUser({
      email: `coordinator.publish.b.${Date.now()}@test.com`,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: collegeB._id,
      isActive: true,
    });

    const agentB = request.agent(app);
    await agentB
      .post("/api/auth/login")
      .send({ email: coordinatorB.email, password: "Test@123" })
      .expect(200);

    const res = await agentB.put(`/api/exam/${exam._id}/publish`).expect(404);
    expect(res.body.message).toBeDefined();

    const refreshed = await Exam.findById(exam._id);
    expect(refreshed.status).toBe("DRAFT");
  });

  it("P5 — non-EXAM_COORDINATOR role cannot publish", async () => {
    const { exam } = await baseSetup();

    const college = await createCollege({
      code: `PUB${Date.now()}`,
      email: `publish.teacher.${Date.now()}@test.com`,
    });
    const teacher = await createUser({
      email: `teacher.publish.${Date.now()}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: teacher.email, password: "Test@123" })
      .expect(200);

    const res = await agent.put(`/api/exam/${exam._id}/publish`).expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");

    const refreshed = await Exam.findById(exam._id);
    expect(refreshed.status).toBe("DRAFT");
  });

  it("P6 — unauthenticated request is rejected", async () => {
    const { exam } = await baseSetup();

    const res = await request(app).put(`/api/exam/${exam._id}/publish`).expect(401);
    expect(res.body.success).toBe(false);

    const refreshed = await Exam.findById(exam._id);
    expect(refreshed.status).toBe("DRAFT");
  });

  it("P7 — invalid exam ID returns 400", async () => {
    const { agent } = await baseSetup();

    const res = await agent.put("/api/exam/invalid-id/publish").expect(400);
    expect(res.body.error.code).toBe("INVALID_ID");
    expect(res.body.error.message).toBeDefined();
  });
});
