const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { createCollege, createUser } = require("../helpers/factories");
const app = require("../../app");

const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");

describe("CRS-TC-001 — Admin Create Course", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("creates course with durationYears auto-calculated as 4 when durationSemesters is 8", async () => {
    const college = await createCollege({ code: "CRS001", name: "Course Test College" });

    const admin = await createUser({
      email: "admin.course@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

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

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .post("/api/courses")
      .send({
        department_id: department._id,
        name: "B.Tech CSE",
        code: "CSE001",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 160,
        maxStudents: 120,
      })
      .expect(201);

    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.course).toBeDefined();

    const course = res.body.data.course;
    expect(course.name).toBe("B.Tech CSE");
    expect(course.code).toBe("CSE001");
    expect(course.durationSemesters).toBe(8);
    expect(course.durationYears).toBe(4);
    expect(course.department_id).toBeDefined();

    const savedCourse = await mongoose
      .connection.db.collection("courses")
      .findOne({ _id: new mongoose.Types.ObjectId(course._id) });

    expect(savedCourse).toBeDefined();
    expect(savedCourse.durationYears).toBe(4);
    expect(savedCourse.durationSemesters).toBe(8);
    expect(savedCourse.department_id.toString()).toBe(department._id.toString());
  });
});
