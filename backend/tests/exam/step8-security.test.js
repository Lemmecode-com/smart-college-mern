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
  createTeacher,
} = require("../helpers/factories");
const Exam = require("../../src/models/exam.model");
const Subject = require("../../src/models/subject.model");
const Student = require("../../src/models/student.model");
const Teacher = require("../../src/models/teacher.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const AuditLog = require("../../src/models/auditLog.model");
const { ROLE, RESULT_STATUS } = require("../../src/utils/constants");
const app = require("../../app");

describe("STEP 8 — Security + Regression", () => {
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

  const setupTeacher = async (collegeId, departmentId) => {
    const teacherUser = await createUser({
      email: `teacher.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: collegeId,
      isActive: true,
    });

    const teacher = await createTeacher({
      email: `teacher.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      employeeId: `EMP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      college_id: collegeId,
      department_id: departmentId,
      user_id: teacherUser._id,
      createdBy: teacherUser._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    return { agent, teacherUser, teacher };
  };

  const setupStudent = async (collegeId) => {
    const studentUser = await createUser({
      email: `student.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
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
      code: `SEC${Date.now()}`,
      email: `sec.${Date.now()}@test.com`,
    });

    const { agent, coordinator } = await setupCoordinator(college._id);

    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Computer Science",
      code: "CS",
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
      code: "BTECH-CSE",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });

    const theorySubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Theory Subject",
      code: `TH-${Date.now()}`,
      semester: 3,
      credits: 4,
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
    });

    const practicalSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Practical Subject",
      code: `PR-${Date.now()}`,
      semester: 3,
      credits: 2,
      subjectType: "PRACTICAL",
      internalMaxMarks: 100,
      passMarks: 40,
    });

    const createdExam = await agent
      .post("/api/exam")
      .send({
        name: "Semester 3 Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [theorySubject._id, practicalSubject._id],
      })
      .expect(201);

    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      fullName: "Student One",
      email: `sone.${Date.now()}@test.com`,
      currentSemester: 3,
      status: "APPROVED",
    });

    return {
      college,
      agent,
      coordinator,
      department,
      course,
      theorySubject,
      practicalSubject,
      exam: createdExam.body.exam,
      student,
    };
  };

  const generateResult = async (agent, examId, studentId) => {
    const res = await agent
      .post("/api/results/generate")
      .send({ examId, studentId })
      .expect(200);
    return res.body.data._id;
  };

  const enterMarks = async (agent, examId, subjectId, entries) =>
    agent
      .post("/api/marks/bulk")
      .send({ examId, subjectId, marks: entries })
      .expect(200);

  // ===================================================================
  // 1. AUTHENTICATION — all exam/result/marks routes reject unauthenticated
  // ===================================================================

  describe("AUTH — unauthenticated access", () => {
    it("rejects GET /api/exam/dashboard with 401", async () => {
      const res = await request(app).get("/api/exam/dashboard");
      expect(res.status).toBe(401);
    });

    it("rejects POST /api/exam with 401", async () => {
      const res = await request(app).post("/api/exam").send({});
      expect(res.status).toBe(401);
    });

    it("rejects GET /api/marks/roster with 401", async () => {
      const res = await request(app).get("/api/marks/roster");
      expect(res.status).toBe(401);
    });

    it("rejects POST /api/marks/bulk with 401", async () => {
      const res = await request(app).post("/api/marks/bulk").send({});
      expect(res.status).toBe(401);
    });

    it("rejects POST /api/results/generate with 401", async () => {
      const res = await request(app).post("/api/results/generate").send({});
      expect(res.status).toBe(401);
    });

    it("rejects POST /api/results/:id/lock with 401", async () => {
      const res = await request(app).post("/api/results/fakeid/lock");
      expect(res.status).toBe(401);
    });

    it("rejects POST /api/results/:id/unlock with 401", async () => {
      const res = await request(app)
        .post("/api/results/fakeid/unlock")
        .send({ reason: "fix" });
      expect(res.status).toBe(401);
    });

    it("rejects POST /api/results/:id/publish with 401", async () => {
      const res = await request(app).post("/api/results/fakeid/publish");
      expect(res.status).toBe(401);
    });

    it("rejects GET /api/results/:id with 401", async () => {
      const res = await request(app).get("/api/results/fakeid");
      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 2. AUTHORIZATION — role-based access control
  // ===================================================================

  describe("AUTH — role-based access control", () => {
    it("STUDENT cannot access marks roster (403)", async () => {
      const { agent, college } = await baseSetup();
      const studentAgent = (await setupStudent(college._id)).agent;

      const res = await studentAgent.get("/api/marks/roster");
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("STUDENT cannot save marks (403)", async () => {
      const { agent, exam, college } = await baseSetup();
      const studentAgent = (await setupStudent(college._id)).agent;

      const res = await studentAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: exam.subjects[0].subject,
          marks: [],
        });
      expect(res.status).toBe(403);
    });

    it("STUDENT cannot generate results (403)", async () => {
      const { agent, exam, college } = await baseSetup();
      const studentAgent = (await setupStudent(college._id)).agent;

      const res = await studentAgent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: new mongoose.Types.ObjectId() });
      expect(res.status).toBe(403);
    });

    it("STUDENT cannot lock results (403)", async () => {
      const { agent, exam, student } = await baseSetup();
      const studentAgent = (await setupStudent(student.college_id || exam.college_id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await studentAgent.post(`/api/results/${resultId}/lock`);
      expect(res.status).toBe(403);
    });

    it("STUDENT cannot unlock results (403)", async () => {
      const { agent, exam, student } = await baseSetup();
      const studentAgent = (await setupStudent(student.college_id || exam.college_id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await studentAgent
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "fix" });
      expect(res.status).toBe(403);
    });

    it("STUDENT cannot publish results (403)", async () => {
      const { agent, exam, student } = await baseSetup();
      const studentAgent = (await setupStudent(student.college_id || exam.college_id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await studentAgent.post(`/api/results/${resultId}/publish`);
      expect(res.status).toBe(403);
    });

    it("STUDENT cannot view results (403)", async () => {
      const { agent, exam, student } = await baseSetup();
      const studentAgent = (await setupStudent(student.college_id || exam.college_id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await studentAgent.get(`/api/results/${resultId}`);
      expect(res.status).toBe(403);
    });

    it("TEACHER cannot generate results (403)", async () => {
      const { college, department, exam } = await baseSetup();
      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;

      const res = await teacherAgent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: new mongoose.Types.ObjectId() });
      expect(res.status).toBe(403);
    });

    it("TEACHER cannot lock results (403)", async () => {
      const { college, department, agent, exam, student } = await baseSetup();
      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await teacherAgent.post(`/api/results/${resultId}/lock`);
      expect(res.status).toBe(403);
    });

    it("TEACHER cannot unlock results (403)", async () => {
      const { college, department, agent, exam, student } = await baseSetup();
      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await teacherAgent
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "fix" });
      expect(res.status).toBe(403);
    });

    it("TEACHER cannot publish results (403)", async () => {
      const { college, department, agent, exam, student } = await baseSetup();
      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await teacherAgent.post(`/api/results/${resultId}/publish`);
      expect(res.status).toBe(403);
    });
  });

  // ===================================================================
  // 3. TENANT ISOLATION — cross-college access blocked
  // ===================================================================

  describe("TENANT — cross-college isolation", () => {
    it("cross-college GET /api/exam/:id returns 404", async () => {
      const { agent, exam } = await baseSetup();

      const collegeB = await createCollege({
        code: `SECB${Date.now()}`,
        email: `secb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB.get(`/api/exam/${exam._id}`);
      expect(res.status).toBe(404);
    });

    it("cross-college marks roster returns 404", async () => {
      const { exam } = await baseSetup();

      const collegeB = await createCollege({
        code: `SECB${Date.now()}`,
        email: `secb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB
        .get("/api/marks/roster")
        .query({ examId: exam._id, subjectId: exam.subjects[0].subject });
      expect(res.status).toBe(404);
    });

    it("cross-college marks bulk save returns 404", async () => {
      const { exam } = await baseSetup();

      const collegeB = await createCollege({
        code: `SECB${Date.now()}`,
        email: `secb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: exam.subjects[0].subject,
          marks: [],
        });
      expect(res.status).toBe(404);
    });

    it("cross-college result generate returns 404", async () => {
      const { agent, exam, student } = await baseSetup();

      const collegeB = await createCollege({
        code: `SECB${Date.now()}`,
        email: `secb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student._id });
      expect(res.status).toBe(404);
    });

    it("cross-college result review returns 404", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const collegeB = await createCollege({
        code: `SECB${Date.now()}`,
        email: `secb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB.get(`/api/results/${resultId}`);
      expect(res.status).toBe(404);
    });

    it("cross-college result lock returns 404", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const collegeB = await createCollege({
        code: `SECB${Date.now()}`,
        email: `secb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB.post(`/api/results/${resultId}/lock`);
      expect(res.status).toBe(404);
    });

    it("cross-college result unlock returns 404", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const collegeB = await createCollege({
        code: `SECB${Date.now()}`,
        email: `secb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "fix" });
      expect(res.status).toBe(404);
    });

    it("cross-college result publish returns 404", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const collegeB = await createCollege({
        code: `SECB${Date.now()}`,
        email: `secb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB.post(`/api/results/${resultId}/publish`);
      expect(res.status).toBe(404);
    });
  });

  // ===================================================================
  // 4. TEACHER AUTHORIZATION — subject ownership
  // ===================================================================

  describe("AUTH — teacher subject ownership", () => {
    it("teacher can access roster for own subject", async () => {
      const { college, department, exam, theorySubject } = await baseSetup();
      const { agent: teacherAgent, teacher } = await setupTeacher(college._id, department._id);

      await Subject.findByIdAndUpdate(theorySubject._id, {
        teacher_id: teacher._id,
      });

      const res = await teacherAgent
        .get("/api/marks/roster")
        .query({ examId: String(exam._id), subjectId: String(theorySubject._id) });
      
      if (res.status !== 200) {
        console.log("Teacher own subject response:", res.status, res.body);
      }
      expect(res.status).toBe(200);
    });

    it("teacher cannot access roster for another teacher's subject (403)", async () => {
      const { college, department, exam, theorySubject } = await baseSetup();
      const otherTeacher = await createTeacher({
        email: `otherteacher.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
        employeeId: `EMP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        college_id: college._id,
        department_id: department._id,
        user_id: new mongoose.Types.ObjectId(),
        createdBy: new mongoose.Types.ObjectId(),
      });

      await Subject.findByIdAndUpdate(theorySubject._id, {
        teacher_id: otherTeacher._id,
      });

      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;

      const res = await teacherAgent
        .get("/api/marks/roster")
        .query({ examId: String(exam._id), subjectId: String(theorySubject._id) });
      
      if (res.status !== 403) {
        console.log("Teacher other subject response:", res.status, res.body);
      }
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
    });
  });

  // ===================================================================
  // 5. MARKS VALIDATION — server-side enforcement
  // ===================================================================

  describe("MARKS — server-side validation", () => {
    it("rejects negative internal marks (400)", async () => {
      const { agent, exam, college, department, course, theorySubject } = await baseSetup();
      const testStudent = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
      });

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [
            { studentId: testStudent._id, internalMarks: -1 },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("NEGATIVE_INTERNAL_MARKS");
    });

    it("rejects negative external marks (400)", async () => {
      const { agent, exam, college, department, course, theorySubject } = await baseSetup();
      const testStudent = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
      });

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [
            { studentId: testStudent._id, externalMarks: -1 },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("NEGATIVE_EXTERNAL_MARKS");
    });

    it("rejects internal marks exceeding max for THEORY (400)", async () => {
      const { agent, exam, college, department, course, theorySubject } = await baseSetup();
      const testStudent = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
      });

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [
            { studentId: testStudent._id, internalMarks: 31 },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INTERNAL_MARKS_EXCEED_MAX");
    });

    it("rejects external marks exceeding max for THEORY (400)", async () => {
      const { agent, exam, college, department, course, theorySubject } = await baseSetup();
      const testStudent = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
      });

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [
            { studentId: testStudent._id, externalMarks: 71 },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("EXTERNAL_MARKS_EXCEED_MAX");
    });

    it("rejects external marks for PRACTICAL subject (400)", async () => {
      const { agent, exam, college, department, course, practicalSubject } = await baseSetup();
      const testStudent = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
      });

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: practicalSubject._id,
          marks: [
            { studentId: testStudent._id, externalMarks: 10 },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("EXTERNAL_MARKS_NOT_APPLICABLE");
    });

    it("rejects ineligible student (400)", async () => {
      const { agent, exam, college, department, course } = await baseSetup();

      const otherStudent = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 5,
      });

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: exam.subjects[0].subject,
          marks: [
            { studentId: otherStudent._id, internalMarks: 25, externalMarks: 60 },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("STUDENT_NOT_ELIGIBLE");
    });
  });

  // ===================================================================
  // 6. MASS ASSIGNMENT — client cannot inject calculated fields
  // ===================================================================

  describe("MASS ASSIGNMENT — calculated fields cannot be set by client", () => {
    it("client-supplied overallResult on generate is ignored", async () => {
      const { agent, exam, student } = await baseSetup();

      const res = await agent
        .post("/api/results/generate")
        .send({
          examId: exam._id,
          studentId: student._id,
          overallResult: "PASS",
          totalSubjects: 999,
          passedSubjects: 999,
          failedSubjects: 999,
          incompleteSubjects: 999,
        });

      expect(res.status).toBe(200);
      const persisted = await SemesterResult.findOne({
        college_id: exam.college_id,
        exam_id: exam._id,
        student_id: student._id,
      }).lean();

      expect(persisted).not.toBeNull();
      expect(persisted.totalSubjects).not.toBe(999);
      expect(persisted.passedSubjects).not.toBe(999);
      expect(persisted.overallResult).not.toBe("PASS");
    });
  });

  // ===================================================================
  // 7. EXAM SNAPSHOT — marks/result use exam snapshot, not live Subject
  // ===================================================================

  describe("EXAM SNAPSHOT — decoupled from live Subject config", () => {
    it("result generation uses exam snapshot after Subject config change", async () => {
      const { agent, exam, student, theorySubject } = await baseSetup();

      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student._id, internalMarks: 15, externalMarks: 40 },
      ]);

      const firstResultId = await generateResult(agent, exam._id, student._id);
      const first = await SemesterResult.findById(firstResultId).lean();
      expect(first.subjects[0].status).toBe("PASS");

      await Subject.findByIdAndUpdate(theorySubject._id, {
        internalPassMarks: 20,
        externalPassMarks: 50,
      });

      const secondResultId = await generateResult(agent, exam._id, student._id);
      const second = await SemesterResult.findById(secondResultId).lean();
      const theory = second.subjects.find((s) => s.subjectType === "THEORY");
      expect(theory.status).toBe("PASS");
      expect(theory.internalPassed).toBe(true);
      expect(theory.externalPassed).toBe(true);
    });
  });

  // ===================================================================
  // 8. RESULT LIFECYCLE — state machine enforcement
  // ===================================================================

  describe("LIFECYCLE — state machine enforcement", () => {
    it("DRAFT result cannot be published directly (409)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await agent.post(`/api/results/${resultId}/publish`).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
    });

    it("LOCKED result cannot be locked again (409)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);

      const res = await agent.post(`/api/results/${resultId}/lock`).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
    });

    it("PUBLISHED result cannot be unlocked (409)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent.post(`/api/results/${resultId}/publish`).expect(200);

      const res = await agent
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "should not work" })
        .expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
    });

    it("PUBLISHED result cannot be re-locked (409)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent.post(`/api/results/${resultId}/publish`).expect(200);

      const res = await agent.post(`/api/results/${resultId}/lock`).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
    });

    it("PUBLISHED result cannot be re-published (409)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent.post(`/api/results/${resultId}/publish`).expect(200);

      const res = await agent.post(`/api/results/${resultId}/publish`).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
    });
  });

  // ===================================================================
  // 9. LOCKED/PUBLISHED MARKS PROTECTION
  // ===================================================================

  describe("MARKS — locked/published protection", () => {
    it("marks cannot be modified after LOCK", async () => {
      const { agent, exam, student, theorySubject } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [
            { studentId: student._id, internalMarks: 25, externalMarks: 60 },
          ],
        })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_LOCKED_FOR_EDIT");
    });

    it("marks cannot be modified after PUBLISH", async () => {
      const { agent, exam, student, theorySubject } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent.post(`/api/results/${resultId}/publish`).expect(200);

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [
            { studentId: student._id, internalMarks: 25, externalMarks: 60 },
          ],
        })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_LOCKED_FOR_EDIT");
    });

    it("marks can be modified after unlock", async () => {
      const { agent, exam, student, theorySubject } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "fix marks" })
        .expect(200);

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [
            { studentId: student._id, internalMarks: 25, externalMarks: 60 },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ===================================================================
  // 10. AUDITLOG — exam module events are recorded
  // ===================================================================

  describe("AUDITLOG — exam module events", () => {
    it("EXAM_CREATED is recorded", async () => {
      const { agent, exam } = await baseSetup();

      const logs = await AuditLog.find({
        action: "EXAM_CREATED",
        resourceType: "Exam",
        resourceId: exam._id,
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it("MARKS_ENTERED is recorded on first save", async () => {
      const { agent, exam, student, theorySubject } = await baseSetup();

      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);

      const logs = await AuditLog.find({
        action: "MARKS_ENTERED",
        resourceType: "StudentMarks",
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it("MARKS_UPDATED is recorded on update", async () => {
      const { agent, exam, student, theorySubject } = await baseSetup();

      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);

      await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [
            { studentId: student._id, internalMarks: 28, externalMarks: 65 },
          ],
        });

      const logs = await AuditLog.find({
        action: "MARKS_UPDATED",
        resourceType: "StudentMarks",
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it("RESULT_LOCKED is recorded", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);

      const logs = await AuditLog.find({
        action: "RESULT_LOCKED",
        resourceType: "SemesterResult",
        resourceId: resultId,
      });
      expect(logs.length).toBe(1);
    });

    it("RESULT_UNLOCKED is recorded with reason", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "Correction required" })
        .expect(200);

      const logs = await AuditLog.find({
        action: "RESULT_UNLOCKED",
        resourceType: "SemesterResult",
        resourceId: resultId,
      });
      expect(logs.length).toBe(1);
    });

    it("RESULT_PUBLISHED is recorded", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent.post(`/api/results/${resultId}/publish`).expect(200);

      const logs = await AuditLog.find({
        action: "RESULT_PUBLISHED",
        resourceType: "SemesterResult",
        resourceId: resultId,
      });
      expect(logs.length).toBe(1);
    });
  });

  // ===================================================================
  // 11. RESULT GENERATION PROTECTION
  // ===================================================================

  describe("RESULT — generation protection", () => {
    it("LOCKED result cannot regenerate (409)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student._id })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_NOT_MUTABLE");
    });

    it("PUBLISHED result cannot regenerate (409)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent.post(`/api/results/${resultId}/publish`).expect(200);

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student._id })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_NOT_MUTABLE");
    });
  });

  // ===================================================================
  // 12. REGRESSION — prior steps unaffected
  // ===================================================================

  describe("REGRESSION — prior steps unaffected", () => {
    it("marks can be entered while DRAFT (no false lock)", async () => {
      const { agent, exam, student, theorySubject } = await baseSetup();

      const res = await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);
      expect(res.body.success).toBe(true);
    });

    it("result can be unlocked and marks edited afterwards", async () => {
      const { agent, exam, student, theorySubject } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await agent.post(`/api/results/${resultId}/lock`).expect(200);
      await agent
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "fix" })
        .expect(200);

      const res = await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);
      expect(res.body.success).toBe(true);
    });

    it("exam CRUD works correctly", async () => {
      const { agent, course, theorySubject } = await baseSetup();

      const created = await agent
        .post("/api/exam")
        .send({
          name: "Test Exam",
          course_id: course._id,
          semester: 3,
          academicYear: "2026-27",
          subjects: [theorySubject._id],
        })
        .expect(201);

      expect(created.body.success).toBe(true);
      expect(created.body.exam.name).toBe("Test Exam");

      const retrieved = await agent.get(`/api/exam/${created.body.exam._id}`);
      expect(retrieved.status).toBe(200);
    });
  });
});
