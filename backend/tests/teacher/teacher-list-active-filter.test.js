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
  createTeacher,
} = require("../helpers/factories");
const app = require("../../app");

describe("GET /teachers — INACTIVE teacher filtering", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("should NOT return INACTIVE teachers in the default list", async () => {
    const college = await createCollege({ code: "TCH-INACTIVE-01" });
    const admin = await createUser({
      email: "admin.tch-inactive-01@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const activeTeacher = await createTeacher({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      email: "active.tch-inactive-01@test.com",
      employeeId: "EMP-ACTIVE-01",
      name: "Active Teacher",
      status: "ACTIVE",
      createdBy: admin._id,
    });

    const inactiveTeacher = await createTeacher({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      email: "inactive.tch-inactive-01@test.com",
      employeeId: "EMP-INACTIVE-01",
      name: "Inactive Teacher",
      status: "INACTIVE",
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent.get("/api/teachers").expect(200);

    const returnedIds = res.body.data.map((t) => String(t._id));
    expect(returnedIds).toContain(String(activeTeacher._id));
    expect(returnedIds).not.toContain(String(inactiveTeacher._id));

    // Every returned teacher must be ACTIVE
    for (const t of res.body.data) {
      expect(t.status).toBe("ACTIVE");
    }
  });

  it("should return INACTIVE teachers only when status=INACTIVE is explicitly requested", async () => {
    const college = await createCollege({ code: "TCH-INACTIVE-02" });
    const admin = await createUser({
      email: "admin.tch-inactive-02@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const activeTeacher = await createTeacher({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      email: "active.tch-inactive-02@test.com",
      employeeId: "EMP-ACTIVE-02",
      name: "Active Teacher",
      status: "ACTIVE",
      createdBy: admin._id,
    });

    const inactiveTeacher = await createTeacher({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      email: "inactive.tch-inactive-02@test.com",
      employeeId: "EMP-INACTIVE-02",
      name: "Inactive Teacher",
      status: "INACTIVE",
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .get("/api/teachers")
      .query({ status: "INACTIVE" })
      .expect(200);

    const returnedIds = res.body.data.map((t) => String(t._id));
    expect(returnedIds).toContain(String(inactiveTeacher._id));
    expect(returnedIds).not.toContain(String(activeTeacher._id));
  });
});