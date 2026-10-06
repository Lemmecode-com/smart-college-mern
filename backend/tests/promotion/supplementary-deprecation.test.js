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
  createDepartment,
  createCourse,
  createSubject,
  createStudent,
} = require("../helpers/factories");
const app = require("../../app");
const Backlog = require("../../src/models/backlog.model");
const SemesterResult = require("../../src/models/semesterResult.model");

describe("Legacy Supplementary Workflow Deprecation & Removal", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const createUserSession = async (role, collegeId) => {
    const user = await createUser({
      email: `${role.toLowerCase()}.${Date.now()}.${Math.random()}@test.com`,
      password: "Test@123",
      role,
      college_id: collegeId,
      isActive: true,
    });
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: user.email, password: "Test@123" })
      .expect(200);
    return { agent, user };
  };

  const createBacklogCase = async (currentSemester = 3) => {
    const college = await createCollege({
      code: `SUPP_DEP_${Date.now()}_${Math.random()}`,
      email: `supp_dep.${Date.now()}_${Math.random()}@test.com`,
    });
    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      semesterCount: 8,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      semester: 1,
      name: "Computer Science I",
      code: `CS101_${Date.now()}`,
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      currentSemester,
      currentAcademicYear: "2026-27",
      email: `student.${Date.now()}_${Math.random()}@test.com`,
    });
    const originalExamId = new mongoose.Types.ObjectId();
    const result = await SemesterResult.create({
      college_id: college._id,
      student_id: student._id,
      exam_id: originalExamId,
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        {
          subject: subject._id,
          subjectName: subject.name,
          subjectCode: subject.code,
          subjectType: "THEORY",
          internalMarks: 10,
          externalMarks: 20,
          totalMarks: 30,
          passed: false,
          status: "FAIL",
          marksRecorded: true,
        },
      ],
      totalSubjects: 1,
      passedSubjects: 0,
      failedSubjects: 1,
      incompleteSubjects: 0,
      overallResult: "FAIL",
      status: "PUBLISHED",
      createdBy: new mongoose.Types.ObjectId(),
    });

    const backlog = await Backlog.create({
      college_id: college._id,
      student_id: student._id,
      course_id: course._id,
      department_id: department._id,
      subject_id: subject._id,
      subject_code: subject.code,
      subject_name: subject.name,
      subject_type: "THEORY",
      semester: 3,
      academicYear: "2026-27",
      original_exam_id: originalExamId,
      original_result_id: result._id,
      original_marks_snapshot: {
        internalMarks: 10,
        externalMarks: 20,
        totalMarks: 30,
        status: "FAIL",
      },
      status: "OPEN",
    });

    return {
      college,
      department,
      course,
      subject,
      student,
      backlog,
    };
  };

  describe("Obsolete Supplementary Endpoints are Fully Unmounted (404)", () => {
    it("returns 404 for GET /api/promotion/supplementary-exams", async () => {
      const { college } = await createBacklogCase();
      const { agent } = await createUserSession("COLLEGE_ADMIN", college._id);

      const res = await agent.get("/api/promotion/supplementary-exams");
      expect(res.status).toBe(404);
    });

    it("returns 404 for GET /api/promotion/supplementary-exams/:examId", async () => {
      const { college } = await createBacklogCase();
      const { agent } = await createUserSession("COLLEGE_ADMIN", college._id);
      const fakeExamId = new mongoose.Types.ObjectId();

      const res = await agent.get(`/api/promotion/supplementary-exams/${fakeExamId}`);
      expect(res.status).toBe(404);
    });

    it("returns 404 for GET /api/promotion/supplementary-roster", async () => {
      const { college } = await createBacklogCase();
      const { agent } = await createUserSession("COLLEGE_ADMIN", college._id);

      const res = await agent.get("/api/promotion/supplementary-roster");
      expect(res.status).toBe(404);
    });

    it("returns 404 for GET /api/promotion/supplementary-marks", async () => {
      const { college } = await createBacklogCase();
      const { agent } = await createUserSession("COLLEGE_ADMIN", college._id);

      const res = await agent.get("/api/promotion/supplementary-marks");
      expect(res.status).toBe(404);
    });

    it("returns 404 for POST /api/promotion/supplementary-marks", async () => {
      const { college } = await createBacklogCase();
      const { agent } = await createUserSession("COLLEGE_ADMIN", college._id);

      const res = await agent
        .post("/api/promotion/supplementary-marks")
        .send({ marks: [] });
      expect(res.status).toBe(404);
    });
  });

  describe("Active Backlog and Promotion Endpoints Remain Fully Operational", () => {
    it("can fetch student backlogs via active /api/promotion/backlogs/:studentId", async () => {
      const { college, student, backlog } = await createBacklogCase();
      const { agent } = await createUserSession("COLLEGE_ADMIN", college._id);

      const res = await agent
        .get(`/api/promotion/backlogs/${student._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(String(res.body.data[0]._id)).toBe(String(backlog._id));
    });

    it("can create and retrieve backlog attempts via active /attempts endpoints", async () => {
      const { college, backlog } = await createBacklogCase();
      const { agent } = await createUserSession("COLLEGE_ADMIN", college._id);

      const createRes = await agent
        .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
        .send({})
        .expect(201);

      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.attempt).toBeDefined();

      const getRes = await agent
        .get(`/api/promotion/backlogs/${backlog._id}/attempts`)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.attempts.length).toBe(1);
    });
  });
});
