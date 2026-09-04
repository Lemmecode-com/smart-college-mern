const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { createCollege, createUser } = require("../helpers/factories");
const User = require("../../src/models/user.model");
const app = require("../../app");

// Bypass the User schema's `college_id` requirement so we can verify that the
// college/tenant middleware still rejects a coordinator who is not linked to a
// college. The normal createUser factory enforces college_id, which is itself
// correct behavior, so we opt out of validation only for this negative test.
const createUserWithoutCollege = async (overrides = {}) => {
  const user = new User({
    name: "No College Coordinator",
    email: overrides.email || `nocollege-${Date.now()}@test.com`,
    password: overrides.password || "Test@123",
    role: overrides.role || "EXAM_COORDINATOR",
    isActive: true,
    tokenVersion: 0,
  });
  await user.save({ validateBeforeSave: false });
  return user;
};

describe("EXM-TC-001 — Exam route authorization foundation", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("rejects an unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/exam/dashboard");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects an unauthorized role (TEACHER) with 403", async () => {
    const college = await createCollege({
      code: "EXM001",
      name: "Exam Auth College",
    });

    const teacher = await createUser({
      email: "teacher.exam@test.com",
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

    const res = await agent.get("/api/exam/dashboard");
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("allows EXAM_COORDINATOR with 200", async () => {
    const college = await createCollege({
      code: "EXM002",
      name: "Exam Coordinator College",
    });

    const coordinator = await createUser({
      email: "coordinator.exam@test.com",
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

    const res = await agent.get("/api/exam/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("enforces college/tenant isolation: coordinator without a college is rejected with 403", async () => {
    const coordinator = await createUserWithoutCollege({
      email: "coordinator.nocollege@test.com",
      password: "Test@123",
      role: "EXAM_COORDINATOR",
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: coordinator.email, password: "Test@123" })
      .expect(200);

    const res = await agent.get("/api/exam/dashboard");
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("COLLEGE_NOT_ASSIGNED");
  });

  it("applies authentication + college isolation together: a coordinator linked to a college passes its own tenant check", async () => {
    const collegeA = await createCollege({
      code: `EXM${Date.now()}`,
      name: "Exam College A",
    });

    const uniqueEmail = `coordinator.${Date.now()}.${Math.floor(
      Math.random() * 1000,
    )}@test.com`;

    const coordinator = await createUser({
      email: uniqueEmail,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: collegeA._id,
      isActive: true,
    });

    // Defensive: confirm the user actually exists before attempting login.
    const persisted = await User.findById(coordinator._id).lean();
    expect(persisted).not.toBeNull();

    const agent = request.agent(app);
    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: coordinator.email, password: "Test@123" });

    expect(loginRes.status).toBe(200);

    const res = await agent.get("/api/exam/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
