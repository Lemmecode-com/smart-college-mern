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
  createStudent,
} = require("../helpers/factories");
const app = require("../../app");

const Notification = require("../../src/models/notification.model");
const Department = require("../../src/models/department.model");

describe("NOT-TC-001 — Admin Create Notification (target STUDENTS)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("Admin creates a notification with target STUDENTS and it is persisted and visible to students", async () => {
    const college = await createCollege({ code: "NOT", name: "Notification College" });

    const admin = await createUser({
      email: "admin@not.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const department = await Department.create({
      college_id: college._id,
      name: "Computer Science",
      code: "CSE",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const course = new mongoose.Types.ObjectId();

    const studentUser = await createUser({
      email: "student@not.test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student@not.test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: course,
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    const res = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Exam Schedule",
        message: "Final exams begin next week. Prepare well.",
        type: "EXAM",
        target: "STUDENTS",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notification).toBeDefined();
    expect(res.body.data.notification.title).toBe("Exam Schedule");
    expect(res.body.data.notification.target).toBe("STUDENTS");

    // Persisted in DB
    const saved = await Notification.findById(res.body.data.notification._id);
    expect(saved).not.toBeNull();
    expect(saved.target).toBe("STUDENTS");
    expect(saved.isActive).toBe(true);

    const studentRes = await studentAgent
      .get("/api/notifications/student/read")
      .expect(200);

    const allTitles = [
      ...(studentRes.body.data.adminNotifications || []),
      ...(studentRes.body.data.teacherNotifications || []),
    ].map((n) => n.title);

    expect(allTitles).toContain("Exam Schedule");
  });
});
