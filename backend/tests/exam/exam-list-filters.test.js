const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createSubject,
} = require("../helpers/factories");
const app = require("../../app");
const Exam = require("../../src/models/exam.model");

describe("GET /api/exam cascading and composite filters", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const setupData = async () => {
    const college = await createCollege({
      code: `EXAM_FLT_${Date.now()}`,
      email: `exam.flt.${Date.now()}@test.com`,
    });

    const coordinatorUser = await createUser({
      email: `coord.${Date.now()}@test.com`,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: coordinatorUser.email, password: "Test@123" })
      .expect(200);

    const deptCS = await createDepartment({
      college_id: college._id,
      name: "Computer Science",
      code: `CS_${Date.now()}`,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const deptME = await createDepartment({
      college_id: college._id,
      name: "Mechanical Engineering",
      code: `ME_${Date.now()}`,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const courseCS1 = await createCourse({
      college_id: college._id,
      department_id: deptCS._id,
      name: "B.Tech CSE",
      code: `CSE1_${Date.now()}`,
      durationSemesters: 8,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const courseCS2 = await createCourse({
      college_id: college._id,
      department_id: deptCS._id,
      name: "M.Tech CSE",
      code: `CSE2_${Date.now()}`,
      durationSemesters: 4,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const courseME1 = await createCourse({
      college_id: college._id,
      department_id: deptME._id,
      name: "B.Tech ME",
      code: `ME1_${Date.now()}`,
      durationSemesters: 8,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const subCS1 = await createSubject({
      college_id: college._id,
      department_id: deptCS._id,
      course_id: courseCS1._id,
      name: "Algorithms",
      code: `ALGO_${Date.now()}`,
      semester: 1,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const exam1 = await Exam.create({
      college_id: college._id,
      name: "CS1 Sem 1 Midterm",
      course_id: courseCS1._id,
      semester: 1,
      academicYear: "2026-2027",
      status: "DRAFT",
      subjects: [{ subject: subCS1._id, category: "REGULAR" }],
      createdBy: coordinatorUser._id,
    });

    const exam2 = await Exam.create({
      college_id: college._id,
      name: "CS1 Sem 2 Final",
      course_id: courseCS1._id,
      semester: 2,
      academicYear: "2026-2027",
      status: "PUBLISHED",
      subjects: [{ subject: subCS1._id, category: "REGULAR" }],
      createdBy: coordinatorUser._id,
    });

    const exam3 = await Exam.create({
      college_id: college._id,
      name: "CS2 Sem 1 Midterm",
      course_id: courseCS2._id,
      semester: 1,
      academicYear: "2026-2027",
      status: "PUBLISHED",
      subjects: [{ subject: subCS1._id, category: "REGULAR" }],
      createdBy: coordinatorUser._id,
    });

    const exam4 = await Exam.create({
      college_id: college._id,
      name: "ME Sem 1 Midterm",
      course_id: courseME1._id,
      semester: 1,
      academicYear: "2026-2027",
      status: "DRAFT",
      subjects: [{ subject: subCS1._id, category: "REGULAR" }],
      createdBy: coordinatorUser._id,
    });

    return {
      agent,
      college,
      deptCS,
      deptME,
      courseCS1,
      courseCS2,
      courseME1,
      exam1,
      exam2,
      exam3,
      exam4,
    };
  };

  it("filters exams by departmentId (including all courses under department)", async () => {
    const { agent, deptCS, exam1, exam2, exam3, exam4 } = await setupData();

    const res = await agent.get(`/api/exam?departmentId=${deptCS._id}`).expect(200);
    const ids = res.body.map((e) => String(e._id));

    expect(ids).toContain(String(exam1._id));
    expect(ids).toContain(String(exam2._id));
    expect(ids).toContain(String(exam3._id));
    expect(ids).not.toContain(String(exam4._id));
  });

  it("filters exams by courseId", async () => {
    const { agent, courseCS1, exam1, exam2, exam3 } = await setupData();

    const res = await agent.get(`/api/exam?courseId=${courseCS1._id}`).expect(200);
    const ids = res.body.map((e) => String(e._id));

    expect(ids).toContain(String(exam1._id));
    expect(ids).toContain(String(exam2._id));
    expect(ids).not.toContain(String(exam3._id));
  });

  it("filters exams by semester", async () => {
    const { agent, exam1, exam2, exam3, exam4 } = await setupData();

    const res = await agent.get("/api/exam?semester=2").expect(200);
    const ids = res.body.map((e) => String(e._id));

    expect(ids).toEqual([String(exam2._id)]);
  });

  it("combines Department, Course, Semester, and Status with AND logic", async () => {
    const { agent, deptCS, courseCS1, exam1, exam2, exam3 } = await setupData();

    // CS department + Course 1 + Sem 1 + status DRAFT -> only Exam 1
    const res = await agent
      .get(`/api/exam?departmentId=${deptCS._id}&courseId=${courseCS1._id}&semester=1&status=DRAFT`)
      .expect(200);

    const ids = res.body.map((e) => String(e._id));
    expect(ids).toEqual([String(exam1._id)]);
  });

  it("filters exams by search query matching exam name", async () => {
    const { agent, exam2 } = await setupData();

    const res = await agent.get("/api/exam?search=Final").expect(200);
    const ids = res.body.map((e) => String(e._id));

    expect(ids).toEqual([String(exam2._id)]);
  });

  it("populates course_id with nested department_id name and code", async () => {
    const { agent, exam1, deptCS } = await setupData();

    const res = await agent.get(`/api/exam?search=${encodeURIComponent(exam1.name)}`).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    const exam = res.body.find((e) => String(e._id) === String(exam1._id));
    expect(exam).toBeDefined();
    expect(exam.course_id).toBeDefined();
    expect(exam.course_id.department_id).toBeDefined();
    expect(exam.course_id.department_id.name).toBe(deptCS.name);
  });
});
