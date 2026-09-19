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

describe("EXAM LIST — HOD Marks Entry eligibility", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const login = async (email) => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email, password: "Test@123" })
      .expect(200);
    return agent;
  };

  const setup = async () => {
    const college = await createCollege({
      code: `HME${Date.now()}`,
      email: `hod-exams.${Date.now()}@test.com`,
    });
    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const hodUser = await createUser({
      email: `hod.${Date.now()}@test.com`,
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });
    const hodTeacher = await createTeacher({
      college_id: college._id,
      department_id: department._id,
      user_id: hodUser._id,
      email: `hod-teacher.${Date.now()}@test.com`,
      employeeId: `HOD-${Date.now()}-1`,
      createdBy: hodUser._id,
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
      employeeId: `TEACHER-${Date.now()}-2`,
      createdBy: teacherUser._id,
    });
    const otherHodUser = await createUser({
      email: `other-hod.${Date.now()}@test.com`,
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });
    const otherHod = await createTeacher({
      college_id: college._id,
      department_id: department._id,
      user_id: otherHodUser._id,
      email: `other-hod-profile.${Date.now()}@test.com`,
      employeeId: `HOD-${Date.now()}-3`,
      createdBy: otherHodUser._id,
    });

    const assignedSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      teacher_id: hodTeacher._id,
      code: `HOD-SUB-${Date.now()}`,
      createdBy: hodUser._id,
    });
    const teacherSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      teacher_id: teacher._id,
      code: `TEACHER-SUB-${Date.now()}`,
      createdBy: teacherUser._id,
    });
    const otherHodSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      teacher_id: otherHod._id,
      code: `OTHER-HOD-SUB-${Date.now()}`,
      createdBy: otherHodUser._id,
    });

    const exam = await Exam.create({
      college_id: college._id,
      name: "HOD Marks Exam",
      course_id: course._id,
      semester: 1,
      academicYear: "2026-27",
      subjects: [
        { subject: assignedSubject._id, subjectType: "THEORY" },
        { subject: teacherSubject._id, subjectType: "THEORY" },
        { subject: otherHodSubject._id, subjectType: "THEORY" },
      ],
      createdBy: hodUser._id,
    });

    return {
      college,
      hodUser,
      teacherUser,
      exam,
      assignedSubject,
    };
  };

  it("allows HOD access and returns only their assigned subject", async () => {
    const { hodUser, exam, assignedSubject } = await setup();
    const agent = await login(hodUser.email);

    const response = await agent.get("/api/exam").expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]._id).toBe(String(exam._id));
    expect(response.body[0].subjects).toHaveLength(1);
    expect(response.body[0].subjects[0].subject._id).toBe(
      String(assignedSubject._id),
    );
  });

  it("does not return an exam with no subject assigned to the HOD", async () => {
    const { college, hodUser, exam } = await setup();
    await Exam.findByIdAndUpdate(exam._id, { subjects: [] });
    const agent = await login(hodUser.email);

    const response = await agent.get("/api/exam").expect(200);

    expect(response.body).toHaveLength(0);
  });

  it("preserves Teacher access to the existing exam list", async () => {
    const { teacherUser, exam } = await setup();
    const agent = await login(teacherUser.email);

    const response = await agent.get("/api/exam").expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]._id).toBe(String(exam._id));
    expect(response.body[0].subjects).toHaveLength(3);
  });

  it("preserves college isolation for HOD exam loading", async () => {
    const { hodUser, exam } = await setup();
    const otherCollege = await createCollege({
      code: `HMF${Date.now()}`,
      email: `other-hod-exams.${Date.now()}@test.com`,
    });
    await Exam.create({
      college_id: otherCollege._id,
      name: "Other College Exam",
      course_id: exam.course_id,
      semester: 1,
      academicYear: "2026-27",
      subjects: exam.subjects,
      createdBy: hodUser._id,
    });
    const agent = await login(hodUser.email);

    const response = await agent.get("/api/exam").expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]._id).toBe(String(exam._id));
  });
});
