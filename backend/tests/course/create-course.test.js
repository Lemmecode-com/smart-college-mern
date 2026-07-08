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

    expect(savedCourse.durationYears).toBe(4);
    expect(savedCourse.durationSemesters).toBe(8);
    expect(savedCourse.department_id.toString()).toBe(department._id.toString());
  });
});

describe("CRS-TC-002 — Duplicate Course Code", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("rejects creating a duplicate course code in the same department", async () => {
    const college = await createCollege({ code: "CRS002", name: "Duplicate Test College" });

    const admin = await createUser({
      email: "admin.dup@test.com",
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

    await agent
      .post("/api/courses")
      .send({
        department_id: department._id,
        name: "B.Tech CSE",
        code: "CSE101",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 160,
        maxStudents: 120,
      })
      .expect(201);

    const res = await agent
      .post("/api/courses")
      .send({
        department_id: department._id,
        name: "B.Tech CSE Duplicate",
        code: "CSE101",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 160,
        maxStudents: 120,
      })
      .expect(409);

    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe("duplicate course code");
    expect(res.body.error.code).toBe("DUPLICATE_COURSE_CODE");
  });

  it("allows the same course code in a different department", async () => {
    const college = await createCollege({ code: "CRS002B", name: "Duplicate Test College B" });

    const admin = await createUser({
      email: "admin.dup2@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const deptA = await Department.create({
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

    const deptB = await Department.create({
      college_id: college._id,
      name: "Mechanical Engineering",
      code: "MECH",
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

    await agent
      .post("/api/courses")
      .send({
        department_id: deptA._id,
        name: "B.Tech CSE",
        code: "CSE101",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 160,
        maxStudents: 120,
      })
      .expect(201);

    await agent
      .post("/api/courses")
      .send({
        department_id: deptB._id,
        name: "B.Tech Mechanical",
        code: "CSE101",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 160,
        maxStudents: 120,
      })
      .expect(201);
  });
});

describe("CRS-01 — Add Course without Selecting Department", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("rejects creating a course without a department_id", async () => {
    const college = await createCollege({ code: "CRS01", name: "No Dept Test College" });

    const admin = await createUser({
      email: "admin.nodept@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .post("/api/courses")
      .send({
        department_id: "",
        name: "B.Tech CSE",
        code: "CSE001",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 160,
        maxStudents: 120,
      });

    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("rejects creating a course with an invalid department_id", async () => {
    const college = await createCollege({ code: "CRS01B", name: "Invalid Dept Test College" });

    const admin = await createUser({
      email: "admin.invaliddept@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .post("/api/courses")
      .send({
        department_id: new mongoose.Types.ObjectId().toString(),
        name: "B.Tech CSE",
        code: "CSE002",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 160,
        maxStudents: 120,
      });

    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

describe("CRS-TC-003 — Update Course Duplicate Code", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("rejects updating a course to a duplicate code in the same department", async () => {
    const college = await createCollege({ code: "CRS003", name: "Update Dup Test College" });

    const admin = await createUser({
      email: "admin.upd@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const dept = await Department.create({
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

    const courseA = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: "B.Tech CSE A",
      code: "CSE101",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 160,
      maxStudents: 120,
      createdBy: admin._id,
    });

    const courseB = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: "B.Tech CSE B",
      code: "CSE102",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 160,
      maxStudents: 120,
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .put(`/api/courses/${courseB._id}`)
      .send({ code: "CSE101" })
      .expect(409);

    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe("duplicate course code");
    expect(res.body.error.code).toBe("DUPLICATE_COURSE_CODE");
  });

  it("allows updating a course code to the same value in a different department", async () => {
    const college = await createCollege({ code: "CRS003B", name: "Update Dup Test College B" });

    const admin = await createUser({
      email: "admin.upd2@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const deptA = await Department.create({
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

    const deptB = await Department.create({
      college_id: college._id,
      name: "Mechanical Engineering",
      code: "MECH",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const courseA = await Course.create({
      college_id: college._id,
      department_id: deptA._id,
      name: "B.Tech CSE",
      code: "CSE101",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 160,
      maxStudents: 120,
      createdBy: admin._id,
    });

    const courseB = await Course.create({
      college_id: college._id,
      department_id: deptB._id,
      name: "B.Tech Mechanical",
      code: "MECH101",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 160,
      maxStudents: 120,
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .put(`/api/courses/${courseB._id}`)
      .send({ code: "CSE101" })
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data.course.code).toBe("CSE101");
    expect(res.body.data.course.department_id.toString()).toBe(deptB._id.toString());
  });
});
