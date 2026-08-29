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

const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");
const FeeStructure = require("../../src/models/feeStructure.model");

describe("STU-TC-011 — Admin Move to Alumni", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("APPROVED student → ALUMNI with alumniDate set", async () => {
    const college = await createCollege({ code: "ALU", name: "Alumni College" });

    const admin = await createUser({
      email: "admin.alumni@test.com",
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

    const course = await Course.create({
      college_id: college._id,
      department_id: department._id,
      name: "B.Tech CSE",
      code: "CSE",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 120,
      yearLabels: ["Year 1", "Year 2", "Year 3", "Year 4"],
      createdBy: admin._id,
    });

    await FeeStructure.create({
      college_id: college._id,
      course_id: course._id,
      category: "GEN",
      academicYear: "2025-2026",
      totalFee: 100000,
      installments: [
        {
          name: "Admission",
          amount: 50000,
          dueDate: new Date("2025-07-15"),
          order: 1,
        },
        {
          name: "Mid-term",
          amount: 30000,
          dueDate: new Date("2025-12-15"),
          order: 2,
        },
        {
          name: "Final",
          amount: 20000,
          dueDate: new Date("2026-04-15"),
          order: 3,
        },
      ],
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Alumni Test Student",
      email: "student.alumni@test.com",
      status: "APPROVED",
      admissionYear: 2025,
      currentSemester: 8,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .post(`/api/students/${student._id}/to-alumni`)
      .send({ graduationYear: 2025 })
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.data).toBeDefined();
    expect(res.body.data.student).toBeDefined();
    expect(res.body.data.student.status).toBe("ALUMNI");
    expect(res.body.data.student.alumniStatus).toBe(true);
    expect(res.body.data.student.alumniDate).toBeDefined();
    expect(new Date(res.body.data.student.alumniDate).getTime()).not.toBeNaN();

    const updatedStudent = await mongoose
      .connection.db.collection("students")
      .findOne({ _id: student._id });

    expect(updatedStudent.status).toBe("ALUMNI");
    expect(updatedStudent.alumniStatus).toBe(true);
    expect(updatedStudent.alumniDate).toBeInstanceOf(Date);
  });
});
