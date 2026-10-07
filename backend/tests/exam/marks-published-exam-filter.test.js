const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createTeacher,
  createDepartment,
  createCourse,
  createSubject,
} = require("../helpers/factories");
const app = require("../../app");
const Exam = require("../../src/models/exam.model");

describe("GET /api/exam?status=PUBLISHED filter for Marks Entry", () => {
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
      code: `PUB_FILTER_${Date.now()}`,
      email: `pub.filter.${Date.now()}@test.com`,
    });

    const department = await createDepartment({
      college_id: college._id,
      name: "Computer Science",
      code: "CS",
      createdBy: new mongoose.Types.ObjectId(),
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: "B.Tech CSE",
      code: `CSE-${Date.now()}`,
      createdBy: new mongoose.Types.ObjectId(),
    });

    // Create Teacher
    const teacherUser = await createUser({
      email: `teacher.${Date.now()}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    const teacher = await createTeacher({
      user_id: teacherUser._id,
      college_id: college._id,
      department_id: department._id,
      status: "ACTIVE",
      createdBy: new mongoose.Types.ObjectId(),
    });

    // Subject assigned to this teacher
    const subject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      teacher_id: teacher._id,
      name: "Algorithms",
      code: `ALGO-${Date.now()}`,
      semester: 3,
    });

    // Create DRAFT exam
    const draftExam = await Exam.create({
      college_id: college._id,
      name: "Draft Mid-Term Exam",
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      status: "DRAFT",
      subjects: [
        {
          subject: subject._id,
          category: "REGULAR",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
      ],
      createdBy: teacherUser._id,
    });

    // Create PUBLISHED exam
    const publishedExam = await Exam.create({
      college_id: college._id,
      name: "Published Final Exam",
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      status: "PUBLISHED",
      subjects: [
        {
          subject: subject._id,
          category: "REGULAR",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
      ],
      createdBy: teacherUser._id,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    return {
      college,
      teacherAgent,
      draftExam,
      publishedExam,
    };
  };

  it("returns only PUBLISHED exams when ?status=PUBLISHED is passed by Teacher", async () => {
    const { teacherAgent, draftExam, publishedExam } = await setupData();

    const response = await teacherAgent
      .get("/api/exam?status=PUBLISHED")
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]._id).toBe(String(publishedExam._id));
    expect(response.body[0].status).toBe("PUBLISHED");
    expect(response.body[0].name).toBe("Published Final Exam");

    // Ensure draft exam is not returned
    const returnedIds = response.body.map((e) => e._id);
    expect(returnedIds).not.toContain(String(draftExam._id));
  });

  it("returns all eligible exams when status param is omitted for backward compatibility", async () => {
    const { teacherAgent, draftExam, publishedExam } = await setupData();

    const response = await teacherAgent.get("/api/exam").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
    const returnedIds = response.body.map((e) => e._id);
    expect(returnedIds).toContain(String(publishedExam._id));
    expect(returnedIds).toContain(String(draftExam._id));
  });
});
