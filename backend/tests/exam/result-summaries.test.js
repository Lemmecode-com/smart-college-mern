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
const SemesterResult = require("../../src/models/semesterResult.model");
const app = require("../../app");

describe("STEP 7c — Result Exam Summaries (N+1 fix)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ---- Helpers -----------------------------------------------------------

  const setupCoordinator = async (collegeId) => {
    const coordinator = await createUser({
      email: `coord.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: collegeId,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: coordinator.email, password: "Test@123" })
      .expect(200);

    return { agent, coordinator };
  };

  const setupTeacher = async (collegeId) => {
    const teacherUser = await createUser({
      email: `teacher.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: collegeId,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    return { agent, teacherUser };
  };

  const setupStudentUser = async (collegeId) => {
    const studentUser = await createUser({
      email: `stu.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      password: "Test@123",
      role: "STUDENT",
      college_id: collegeId,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    return { agent, studentUser };
  };

  const baseSetup = async () => {
    const college = await createCollege({
      code: `SUM${Date.now()}`,
      email: `sum.${Date.now()}@test.com`,
    });

    const { agent, coordinator } = await setupCoordinator(college._id);

    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Computer Science",
      code: `CS-${Date.now()}`,
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2021,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech CSE",
      code: `BTECH-CSE-${Date.now()}`,
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });

    const student1 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      fullName: "Student One",
      email: `sone.${Date.now()}@test.com`,
      currentSemester: 3,
      status: "APPROVED",
    });

    const student2 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      fullName: "Student Two",
      email: `stwo.${Date.now()}@test.com`,
      currentSemester: 3,
      status: "APPROVED",
    });

    return { college, agent, coordinator, department, course, student1, student2 };
  };

  const makeStudent = async (collegeId, courseId, departmentId) =>
    createStudent({
      college_id: collegeId,
      department_id: departmentId,
      course_id: courseId,
      createdBy: new mongoose.Types.ObjectId(),
      fullName: `Student ${Date.now()}.${Math.floor(Math.random() * 1000000)}`,
      email: `st.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      currentSemester: 3,
      status: "APPROVED",
    });

  const createResult = async (collegeId, examId, courseId, studentId, status, overallResult) =>
    SemesterResult.create({
      college_id: collegeId,
      student_id: studentId,
      exam_id: examId,
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      subjects: [],
      totalSubjects: 1,
      passedSubjects: overallResult === "PASS" ? 1 : 0,
      failedSubjects: overallResult === "FAIL" ? 1 : 0,
      incompleteSubjects: overallResult === "INCOMPLETE" ? 1 : 0,
      overallResult,
      calculatedAt: new Date(),
      status,
      createdBy: new mongoose.Types.ObjectId(),
    });

  const summariesToMap = (summaries) => {
    const map = {};
    for (const s of summaries) {
      map[String(s.examId)] = s;
    }
    return map;
  };

  // ---- Successful summary retrieval --------------------------------------

  describe("SUM1 — successful summary retrieval", () => {
    it("returns per-exam summaries with correct counts for mixed statuses", async () => {
      const { agent, college, course, department, student1, student2 } = await baseSetup();

      const examId1 = new mongoose.Types.ObjectId();
      const examId2 = new mongoose.Types.ObjectId();

      await createResult(college._id, examId1, course._id, student1._id, "DRAFT", "PASS");
      await createResult(college._id, examId1, course._id, student2._id, "PUBLISHED", "FAIL");

      const student3 = await makeStudent(college._id, course._id, department._id);
      const student4 = await makeStudent(college._id, course._id, department._id);
      await createResult(college._id, examId2, course._id, student3._id, "LOCKED", "PASS");
      await createResult(college._id, examId2, course._id, student4._id, "PUBLISHED", "PASS");

      const res = await agent.get("/api/results/exam-summaries").expect(200);
      expect(res.body.success).toBe(true);

      const summaries = res.body.data.summaries;
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries.length).toBe(2);

      const map = summariesToMap(summaries);

      const s1 = map[String(examId1)];
      expect(s1).toBeDefined();
      expect(s1.summary.totalStudents).toBe(2);
      expect(s1.summary.passed).toBe(1);
      expect(s1.summary.failed).toBe(1);
      expect(s1.summary.incomplete).toBe(0);
      expect(s1.summary.byStatus.DRAFT).toBe(1);
      expect(s1.summary.byStatus.LOCKED).toBe(0);
      expect(s1.summary.byStatus.PUBLISHED).toBe(1);

      const s2 = map[String(examId2)];
      expect(s2).toBeDefined();
      expect(s2.summary.totalStudents).toBe(2);
      expect(s2.summary.passed).toBe(2);
      expect(s2.summary.failed).toBe(0);
      expect(s2.summary.incomplete).toBe(0);
      expect(s2.summary.byStatus.DRAFT).toBe(0);
      expect(s2.summary.byStatus.LOCKED).toBe(1);
      expect(s2.summary.byStatus.PUBLISHED).toBe(1);
    });

    it("includes lastUpdated timestamp", async () => {
      const { agent, college, course, student1 } = await baseSetup();
      const examId = new mongoose.Types.ObjectId();
      await createResult(college._id, examId, course._id, student1._id, "DRAFT", "PASS");

      const res = await agent.get("/api/results/exam-summaries").expect(200);
      const summary = res.body.data.summaries[0];
      expect(summary.summary.lastUpdated).toBeDefined();
    });
  });

  // ---- Empty result set ---------------------------------------------------

  describe("SUM2 — empty result set", () => {
    it("returns empty array when no results exist for the college", async () => {
      const { agent } = await baseSetup();

      const res = await agent.get("/api/results/exam-summaries").expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.summaries)).toBe(true);
      expect(res.body.data.summaries.length).toBe(0);
    });
  });

  // ---- Authorization ------------------------------------------------------

  describe("SUM3 — authorization", () => {
    it("rejects unauthenticated requests with 401", async () => {
      await baseSetup();
      const res = await request(app)
        .get("/api/results/exam-summaries")
        .expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("TOKEN_MISSING");
    });

    it("rejects TEACHER role with 403", async () => {
      const { college } = await baseSetup();
      const teacherAgent = (await setupTeacher(college._id)).agent;
      const res = await teacherAgent
        .get("/api/results/exam-summaries")
        .expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("rejects STUDENT role with 403", async () => {
      const { college } = await baseSetup();
      const studentAgent = (await setupStudentUser(college._id)).agent;
      const res = await studentAgent
        .get("/api/results/exam-summaries")
        .expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });
  });

  // ---- Cross-college isolation -------------------------------------------

  describe("SUM4 — cross-college isolation", () => {
    it("does not return results from other colleges", async () => {
      const { agent, college, course, student1 } = await baseSetup();

      const examIdA = new mongoose.Types.ObjectId();
      await createResult(college._id, examIdA, course._id, student1._id, "DRAFT", "PASS");

      const collegeB = await createCollege({
        code: `SUMB${Date.now()}`,
        email: `sumb.${Date.now()}@test.com`,
      });
      const { agent: agentB } = await setupCoordinator(collegeB._id);

      const departmentB = await createDepartment({
        college_id: collegeB._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "Mechanical",
        code: `ME-${Date.now()}`,
        type: "ACADEMIC",
        status: "ACTIVE",
        programsOffered: ["UG"],
        startYear: 2021,
        sanctionedFacultyCount: 10,
        sanctionedStudentIntake: 60,
      });

      const courseB = await createCourse({
        college_id: collegeB._id,
        department_id: departmentB._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "B.Tech ME",
        code: `BTECH-ME-${Date.now()}`,
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 120,
        maxStudents: 60,
      });

      const studentB = await makeStudent(collegeB._id, courseB._id, departmentB._id);
      const examIdB = new mongoose.Types.ObjectId();
      await createResult(collegeB._id, examIdB, courseB._id, studentB._id, "PUBLISHED", "PASS");

      const resB = await agentB.get("/api/results/exam-summaries").expect(200);
      const summariesB = resB.body.data.summaries;
      expect(summariesB.length).toBe(1);
      expect(String(summariesB[0].examId)).toBe(String(examIdB));
      expect(summariesB[0].summary.totalStudents).toBe(1);
      expect(summariesB[0].summary.byStatus.PUBLISHED).toBe(1);
    });
  });

  // ---- Correct counts -----------------------------------------------------

  describe("SUM5 — correct counts", () => {
    it("aggregates single exam with all status + result combinations", async () => {
      const { agent, college, course, department } = await baseSetup();
      const examId = new mongoose.Types.ObjectId();

      const s1 = await makeStudent(college._id, course._id, department._id);
      const s2 = await makeStudent(college._id, course._id, department._id);
      const s3 = await makeStudent(college._id, course._id, department._id);
      const s4 = await makeStudent(college._id, course._id, department._id);

      await createResult(college._id, examId, course._id, s1._id, "DRAFT", "PASS");
      await createResult(college._id, examId, course._id, s2._id, "DRAFT", "FAIL");
      await createResult(college._id, examId, course._id, s3._id, "DRAFT", "INCOMPLETE");
      await createResult(college._id, examId, course._id, s4._id, "PUBLISHED", "PASS");

      const res = await agent.get("/api/results/exam-summaries").expect(200);
      expect(res.body.success).toBe(true);

      const summaries = res.body.data.summaries;
      expect(summaries.length).toBe(1);

      const summary = summaries[0].summary;
      expect(summary.totalStudents).toBe(4);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.incomplete).toBe(1);
      expect(summary.byStatus.DRAFT).toBe(3);
      expect(summary.byStatus.LOCKED).toBe(0);
      expect(summary.byStatus.PUBLISHED).toBe(1);
    });

    it("does not return individual result documents (summaries only)", async () => {
      const { agent, college, course, student1 } = await baseSetup();
      const examId = new mongoose.Types.ObjectId();
      await createResult(college._id, examId, course._id, student1._id, "DRAFT", "PASS");

      const res = await agent.get("/api/results/exam-summaries").expect(200);
      const entry = res.body.data.summaries[0];
      expect(entry).not.toHaveProperty("results");
      expect(entry).not.toHaveProperty("exam");
      expect(Object.keys(entry).sort()).toEqual(["examId", "summary"]);
    });
  });
});
