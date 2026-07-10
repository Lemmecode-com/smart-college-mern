const request = require("supertest");
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
const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");
const app = require("../../app");

const COUNT = 23; // greater than default page size of 20

describe("APPR-01 - Approved Students stats", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("paginates approved students at 20 so page-1 stats undercount", async () => {
    const college = await createCollege({ code: "APPR1" });

    const admin = await createUser({
      email: "admin.appr1@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const departments = [];
    const courses = [];
    for (let i = 0; i < 3; i++) {
      departments.push(
        await Department.create({
          college_id: college._id,
          name: "Dept " + (i + 1),
          code: "D" + (i + 1),
          type: "ACADEMIC",
          status: "ACTIVE",
          hod_id: null,
          programsOffered: ["UG"],
          startYear: 2024,
          sanctionedFacultyCount: 5,
          sanctionedStudentIntake: 60,
          createdBy: admin._id,
        }),
      );
      courses.push(
        await Course.create({
          college_id: college._id,
          department_id: departments[i]._id,
          name: "Course " + (i + 1),
          code: "C" + (i + 1),
          type: "THEORY",
          status: "ACTIVE",
          programLevel: "UG",
          durationSemesters: 8,
          durationYears: 4,
          credits: 160,
          maxStudents: 120,
          yearLabels: ["Year 1", "Year 2", "Year 3", "Year 4"],
          createdBy: admin._id,
        }),
      );
    }

    for (let i = 0; i < COUNT; i++) {
      const idx = i % 3;
      await createStudent({
        college_id: college._id,
        department_id: departments[idx]._id,
        course_id: courses[idx]._id,
        fullName: "Approved Student " + (i + 1),
        email: "approved" + (i + 1) + "@appr1.test.com",
        status: "APPROVED",
        admissionYear: 2025,
        currentSemester: 1,
      });
    }

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .get("/api/students/approved-students")
      .expect(200);

    expect(res.body.pagination.total).toBe(COUNT);
    expect(res.body.data.length).toBeLessThan(COUNT);

    const frontendVisibleCount = res.body.data.length;
    expect(frontendVisibleCount).not.toBe(COUNT);
  });
});
