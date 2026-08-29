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

describe("TCH-14 — Delete Teacher Row (Admin hard delete)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("removes a teacher from the DB and from the list after confirmation", async () => {
    const college = await createCollege({ code: "TCH14", name: "TCH14 College" });

    const admin = await createUser({
      email: "admin.tch14@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const teacherUser = await createUser({
      email: "teacher.tch14@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    const departmentId = new mongoose.Types.ObjectId();
    const teacher = await createTeacher({
      college_id: college._id,
      user_id: teacherUser._id,
      department_id: departmentId,
      email: "teacher.tch14@test.com",
      employeeId: "EMP-TCH14",
      designation: "Professor",
      name: "Delete Me Teacher",
      status: "ACTIVE",
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    // List before deletion should include the teacher
    const listBefore = await agent.get("/api/teachers").expect(200);
    const idsBefore = listBefore.body.data.map((t) => String(t._id));
    expect(idsBefore).toContain(String(teacher._id));

    // Delete the teacher (simulates confirming the confirm dialog)
    const delRes = await agent
      .delete(`/api/teachers/${teacher._id}`)
      .expect(200);
    expect(delRes.body.success).toBe(true);

    // List after deletion should NOT include the teacher
    const listAfter = await agent.get("/api/teachers").expect(200);
    const idsAfter = listAfter.body.data.map((t) => String(t._id));
    expect(idsAfter).not.toContain(String(teacher._id));

    // Teacher document should be removed from DB
    const dbTeacher = await mongoose
      .connection.db.collection("teachers")
      .findOne({ _id: teacher._id });
    expect(dbTeacher).toBeNull();

    // Associated user should also be removed
    const dbUser = await mongoose
      .connection.db.collection("users")
      .findOne({ _id: teacherUser._id });
    expect(dbUser).toBeNull();
  });

  it("BLOCKS deletion when teacher has assigned active subjects (correct safeguard)", async () => {
    const college = await createCollege({ code: "TCH14B" });

    const admin = await createUser({
      email: "admin.tch14b@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const teacherUser = await createUser({
      email: "teacher.tch14b@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    const departmentId = new mongoose.Types.ObjectId();
    const teacher = await createTeacher({
      college_id: college._id,
      user_id: teacherUser._id,
      department_id: departmentId,
      email: "teacher.tch14b@test.com",
      employeeId: "EMP-TCH14B",
      name: "Busy Teacher",
      status: "ACTIVE",
      createdBy: admin._id,
    });

    // Create an active subject assigned to this teacher
    await mongoose.connection.db.collection("subjects").insertOne({
      college_id: college._id,
      teacher_id: teacher._id,
      name: "Math",
      code: "MATH",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const delRes = await agent
      .delete(`/api/teachers/${teacher._id}`)
      .expect(400);
    expect(delRes.body.success).toBe(false);
    expect(delRes.body.error.code).toBe("SUBJECTS_STILL_ASSIGNED");

    // Teacher must still be present
    const dbTeacher = await mongoose
      .connection.db.collection("teachers")
      .findOne({ _id: teacher._id });
    expect(dbTeacher).not.toBeNull();
  });
});
