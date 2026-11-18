const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createSubject,
  createStudent,
  createTeacher,
} = require("../helpers/factories");
const Exam = require("../../src/models/exam.model");
const app = require("../../app");

describe("MARKS — HOD roster and save authorization", () => {
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
      code: `HMO${Date.now()}`,
      email: `hod-operations.${Date.now()}@test.com`,
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
      email: `hod-profile.${Date.now()}@test.com`,
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

    const subjectOptions = (teacherId, collegeId = college._id) => ({
      college_id: collegeId,
      course_id: course._id,
      department_id: department._id,
      teacher_id: teacherId,
      semester: 1,
      credits: 3,
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
      createdBy: hodUser._id,
    });
    const hodSubject = await createSubject({
      ...subjectOptions(hodTeacher._id),
      code: `HOD-SUB-${Date.now()}`,
    });
    const teacherSubject = await createSubject({
      ...subjectOptions(teacher._id),
      code: `TEACHER-SUB-${Date.now()}`,
    });
    const otherHodSubject = await createSubject({
      ...subjectOptions(otherHod._id),
      code: `OTHER-HOD-SUB-${Date.now()}`,
    });
    const otherCollege = await createCollege({
      code: `HMP${Date.now()}`,
      email: `other-college.${Date.now()}@test.com`,
    });
    const crossCollegeSubject = await createSubject({
      ...subjectOptions(hodTeacher._id, otherCollege._id),
      code: `CROSS-COLLEGE-SUB-${Date.now()}`,
    });

    const exam = await Exam.create({
      college_id: college._id,
      name: "HOD Marks Examination",
      course_id: course._id,
      semester: 1,
      academicYear: "2026-27",
      subjects: [
        {
          subject: hodSubject._id,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
        {
          subject: teacherSubject._id,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
        {
          subject: otherHodSubject._id,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
        {
          subject: crossCollegeSubject._id,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
      ],
      createdBy: hodUser._id,
    });
    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 1,
      email: `student.${Date.now()}@test.com`,
      createdBy: hodUser._id,
    });

    return {
      college,
      exam,
      student,
      hodSubject,
      teacherSubject,
      otherHodSubject,
      crossCollegeSubject,
      hodAgent: await login(hodUser.email),
      teacherAgent: await login(teacherUser.email),
    };
  };

  const expectForbidden = async (agent, examId, subjectId) => {
    const response = await agent
      .get("/api/marks/roster")
      .query({ examId: String(examId), subjectId: String(subjectId) })
      .expect(403);
    expect(response.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
  };

  it("allows HOD roster loading and saving for an assigned subject", async () => {
    const { hodAgent, exam, hodSubject, student } = await setup();

    const roster = await hodAgent
      .get("/api/marks/roster")
      .query({ examId: String(exam._id), subjectId: String(hodSubject._id) })
      .expect(200);

    expect(roster.body.data.roster).toHaveLength(1);
    expect(roster.body.data.roster[0].studentId).toBe(String(student._id));

    const saved = await hodAgent
      .post("/api/marks/bulk")
      .send({
        examId: exam._id,
        subjectId: hodSubject._id,
        marks: [
          { studentId: student._id, internalMarks: 25, externalMarks: 60 },
        ],
      })
      .expect(200);

    expect(saved.body.success).toBe(true);
    expect(saved.body.data[0].internalMarks).toBe(25);
  });

  it("rejects an HOD accessing another Teacher's subject", async () => {
    const { hodAgent, exam, teacherSubject } = await setup();
    await expectForbidden(hodAgent, exam._id, teacherSubject._id);
  });

  it("rejects an HOD accessing another HOD's subject", async () => {
    const { hodAgent, exam, otherHodSubject } = await setup();
    await expectForbidden(hodAgent, exam._id, otherHodSubject._id);
  });

  it("rejects an HOD accessing a cross-college subject", async () => {
    const { hodAgent, exam, crossCollegeSubject } = await setup();
    await expectForbidden(hodAgent, exam._id, crossCollegeSubject._id);
  });

  it("preserves Teacher roster and save behavior", async () => {
    const { teacherAgent, exam, teacherSubject, student } = await setup();

    await teacherAgent
      .get("/api/marks/roster")
      .query({
        examId: String(exam._id),
        subjectId: String(teacherSubject._id),
      })
      .expect(200);

    const saved = await teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: exam._id,
        subjectId: teacherSubject._id,
        marks: [
          { studentId: student._id, internalMarks: 22, externalMarks: 55 },
        ],
      })
      .expect(200);

    expect(saved.body.success).toBe(true);
  });
});
