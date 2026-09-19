const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createSubject,
  createTeacher,
} = require("../helpers/factories");
const Exam = require("../../src/models/exam.model");
const app = require("../../app");

describe("GET /api/exam/:id teacher population", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("returns the assigned teacher name and employee ID for each subject", async () => {
    const college = await createCollege({
      code: `VET${Date.now()}`,
      email: `view-exam.${Date.now()}@test.com`,
    });
    const coordinator = await createUser({
      email: `coordinator.${Date.now()}@test.com`,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: college._id,
      isActive: true,
    });
    const department = await createDepartment({
      college_id: college._id,
      createdBy: coordinator._id,
    });
    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: coordinator._id,
    });
    const teacherUser = await createUser({
      email: `teacher.${Date.now()}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });
    const teacher = await createTeacher({
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      email: `teacher-profile.${Date.now()}@test.com`,
      employeeId: `VIEW-${Date.now()}`,
      createdBy: coordinator._id,
    });
    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      teacher_id: teacher._id,
      code: `VIEW-SUB-${Date.now()}`,
      createdBy: coordinator._id,
    });
    const exam = await Exam.create({
      college_id: college._id,
      name: "View Exam Population",
      course_id: course._id,
      semester: subject.semester,
      academicYear: "2026-27",
      subjects: [{ subject: subject._id, subjectType: "THEORY" }],
      createdBy: coordinator._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: coordinator.email, password: "Test@123" })
      .expect(200);

    const response = await agent.get(`/api/exam/${exam._id}`).expect(200);
    const returnedTeacher = response.body.subjects[0].subject.teacher_id;

    expect(returnedTeacher).toMatchObject({
      _id: String(teacher._id),
      name: teacher.name,
      employeeId: teacher.employeeId,
    });
  });
});
