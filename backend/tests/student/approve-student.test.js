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

describe("STU-TC-008 — Admin Approve Student", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("PENDING student → APPROVED with enrollment number assigned", async () => {
    const college = await createCollege({ code: "APR", name: "Approve College" });

    const admin = await createUser({
      email: "admin@approve.test.com",
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
      fullName: "Approve Test Student",
      email: "student.approve@test.com",
      status: "PENDING",
      admissionYear: 2025,
      currentSemester: 1,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .put(`/api/students/${student._id}/approve`)
      .expect(200);

    expect(res.body.student).toBeDefined();
    expect(res.body.student.status).toBe("APPROVED");
    expect(res.body.student.enrollmentNumber).toBeDefined();
    expect(res.body.student.enrollmentNumber).not.toBe("");

    const enrollmentNumber = res.body.student.enrollmentNumber;
    expect(enrollmentNumber).toMatch(
      new RegExp(`^${college.code}-${course.code}${student.admissionYear}-\\d{4}$`)
    );

    const updatedStudent = await mongoose
      .connection.db.collection("students")
      .findOne({ _id: student._id });

    expect(updatedStudent.status).toBe("APPROVED");
    expect(updatedStudent.enrollmentNumber).toBe(enrollmentNumber);
  });
});
