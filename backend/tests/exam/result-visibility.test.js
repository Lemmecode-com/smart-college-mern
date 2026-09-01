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
const Exam = require("../../src/models/exam.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const AppError = require("../../src/utils/AppError");
const app = require("../../app");

describe("STEP 7b — Result Visibility (Student My Results)", () => {
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

  const setupStudentUser = async (collegeId, departmentId, courseId) => {
    const studentUser = await createUser({
      email: `student.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      password: "Test@123",
      role: "STUDENT",
      college_id: collegeId,
      isActive: true,
    });

    const student = await createStudent({
      college_id: collegeId,
      department_id: departmentId,
      course_id: courseId,
      user_id: studentUser._id,
      createdBy: new mongoose.Types.ObjectId(),
      fullName: "Student One",
      email: `sone.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      currentSemester: 3,
      status: "APPROVED",
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    return { agent, studentUser, student };
  };

  const setupTeacher = async (collegeId, departmentId) => {
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

  const fullBaseSetup = async () => {
    const college = await createCollege({
      code: `VIS${Date.now()}`,
      email: `vis.${Date.now()}@test.com`,
    });

    const { agent: coordAgent, coordinator } = await setupCoordinator(college._id);

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

    const subject = await createSubject({
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

    const createdExam = await coordAgent
      .post("/api/exam")
      .send({
        name: "Semester 3 Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject._id],
      })
      .expect(201);

    const { agent: studentAgent, studentUser, student } = await setupStudentUser(
      college._id,
      department._id,
      course._id,
    );

    return {
      college,
      coordAgent,
      coordinator,
      department,
      course,
      subject,
      exam: createdExam.body.exam,
      studentAgent,
      studentUser,
      student,
    };
  };

  /** Enter marks for a student in a subject via the bulk marks API. */
  const enterMarks = async (agent, examId, subjectId, entries) =>
    agent
      .post("/api/marks/bulk")
      .send({ examId, subjectId, marks: entries })
      .expect(200);

  /** Generate a result (DRAFT) for one student. */
  const generateResult = async (agent, examId, studentId) => {
    const res = await agent
      .post("/api/results/generate")
      .send({ examId, studentId })
      .expect(200);
    return res.body.data._id;
  };

  /** Lock a DRAFT result. */
  const lockResult = (agent, resultId) =>
    agent.post(`/api/results/${resultId}/lock`).expect(200);

  /** Publish a LOCKED result. */
  const publishResult = (agent, resultId) =>
    agent.post(`/api/results/${resultId}/publish`).expect(200);

  /** Fetch the student's own results via /my-results. */
  const getMyResults = (agent) =>
    agent.get("/api/results/my-results").expect(200);

  // ---- Core visibility ---------------------------------------------------

  describe("R1 — only PUBLISHED results are returned to the student", () => {
    it("returns only PUBLISHED results; DRAFT and LOCKED are hidden", async () => {
      const {
        exam,
        student,
        subject,
        studentAgent,
      } = await fullBaseSetup();

      const examIdDraft = new mongoose.Types.ObjectId();
      const examIdLocked = new mongoose.Types.ObjectId();

      // DRAFT result (via the API flow: generate leaves it as DRAFT)
      await SemesterResult.create({
        college_id: exam.college_id,
        student_id: student._id,
        exam_id: examIdDraft,
        course_id: exam.course_id,
        semester: exam.semester,
        academicYear: exam.academicYear,
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        calculatedAt: new Date(),
        status: "DRAFT",
        createdBy: new mongoose.Types.ObjectId(),
      });

      // LOCKED result
      await SemesterResult.create({
        college_id: exam.college_id,
        student_id: student._id,
        exam_id: examIdLocked,
        course_id: exam.course_id,
        semester: exam.semester,
        academicYear: exam.academicYear,
        subjects: [
          {
            subject: subject._id,
            subjectName: "Theory Subject",
            subjectCode: subject.code,
            subjectType: "THEORY",
            internalMarks: 25,
            externalMarks: 60,
            totalMarks: 85,
            internalPassed: true,
            externalPassed: true,
            passed: true,
            status: "PASS",
            marksRecorded: true,
          },
        ],
        totalSubjects: 1,
        passedSubjects: 1,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        calculatedAt: new Date(),
        status: "LOCKED",
        lockedBy: new mongoose.Types.ObjectId(),
        lockedAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(),
      });

      // PUBLISHED result (the only one the student should see)
      const publishedResult = await SemesterResult.create({
        college_id: exam.college_id,
        student_id: student._id,
        exam_id: exam._id,
        course_id: exam.course_id,
        semester: exam.semester,
        academicYear: exam.academicYear,
        subjects: [
          {
            subject: subject._id,
            subjectName: "Theory Subject",
            subjectCode: subject.code,
            subjectType: "THEORY",
            internalMarks: 25,
            externalMarks: 60,
            totalMarks: 85,
            internalPassed: true,
            externalPassed: true,
            passed: true,
            status: "PASS",
            marksRecorded: true,
          },
        ],
        totalSubjects: 1,
        passedSubjects: 1,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        calculatedAt: new Date(),
        status: "PUBLISHED",
        publishedBy: new mongoose.Types.ObjectId(),
        publishedAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Published result for a different student — must not leak to this student
      const otherStudent = await createStudent({
        college_id: exam.college_id,
        department_id: exam.course_id,
        course_id: exam.course_id,
        createdBy: new mongoose.Types.ObjectId(),
        fullName: "Other Student",
        email: `other.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
        currentSemester: 3,
        status: "APPROVED",
      });

      await SemesterResult.create({
        college_id: exam.college_id,
        student_id: otherStudent._id,
        exam_id: new mongoose.Types.ObjectId(),
        course_id: exam.course_id,
        semester: exam.semester,
        academicYear: exam.academicYear,
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        calculatedAt: new Date(),
        status: "PUBLISHED",
        publishedBy: new mongoose.Types.ObjectId(),
        publishedAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await getMyResults(studentAgent);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Only 1 PUBLISHED result for this student (DRAFT, LOCKED, and other-student's are hidden)
      expect(res.body.data.length).toBe(1);
      expect(String(res.body.data[0]._id)).toBe(String(publishedResult._id));
      expect(res.body.data[0].status).toBe("PUBLISHED");
    });

    it("returns 200 with empty array when no published results exist", async () => {
      const {
        exam,
        student,
        subject,
        studentAgent,
      } = await fullBaseSetup();

      // Only a DRAFT result exists — should not be visible
      await SemesterResult.create({
        college_id: exam.college_id,
        student_id: student._id,
        exam_id: exam._id,
        course_id: exam.course_id,
        semester: exam.semester,
        academicYear: exam.academicYear,
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        calculatedAt: new Date(),
        status: "DRAFT",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await getMyResults(studentAgent);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ---- Cross-student isolation -------------------------------------------

  describe("R2 — student identity is derived from JWT, not params or other students' data", () => {
    it("student A only sees their own published results, not student B's", async () => {
      const {
        coordAgent,
        exam,
        student,
        subject,
        studentAgent,
      } = await fullBaseSetup();

      await enterMarks(coordAgent, exam._id, subject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);

      // Create a second student in the same college
      const {
        agent: studentBAgent,
        studentUser: studentBUser,
        student: studentB,
      } = await setupStudentUser(exam.college_id, exam.course_id, exam.course_id);

      // Publish a result for student B only
      await SemesterResult.create({
        college_id: exam.college_id,
        student_id: studentB._id,
        exam_id: exam._id,
        course_id: exam.course_id,
        semester: exam.semester,
        academicYear: exam.academicYear,
        subjects: [
          {
            subject: subject._id,
            subjectName: "Theory Subject",
            subjectCode: subject.code,
            subjectType: "THEORY",
            internalMarks: 25,
            externalMarks: 60,
            totalMarks: 85,
            internalPassed: true,
            externalPassed: true,
            passed: true,
            status: "PASS",
            marksRecorded: true,
          },
        ],
        totalSubjects: 1,
        passedSubjects: 1,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        calculatedAt: new Date(),
        status: "PUBLISHED",
        publishedBy: new mongoose.Types.ObjectId(),
        publishedAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Student A (no published results for themselves) should see empty
      const resA = await getMyResults(studentAgent);
      expect(resA.body.success).toBe(true);
      expect(resA.body.data.length).toBe(0);

      // Student B should see only their own result
      const resB = await getMyResults(studentBAgent);
      expect(resB.body.success).toBe(true);
      expect(resB.body.data.length).toBe(1);
      expect(String(resB.body.data[0].student_id)).toBe(String(studentB._id));
    });

    it("query param student_id is ignored — identity comes from JWT", async () => {
      const {
        coordAgent,
        exam,
        student,
        subject,
        studentAgent,
      } = await fullBaseSetup();

      // Publish a result for the student
      await SemesterResult.create({
        college_id: exam.college_id,
        student_id: student._id,
        exam_id: exam._id,
        course_id: exam.course_id,
        semester: exam.semester,
        academicYear: exam.academicYear,
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        calculatedAt: new Date(),
        status: "PUBLISHED",
        publishedBy: new mongoose.Types.ObjectId(),
        publishedAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Even if student tries to pass a different studentId in query params,
      // the endpoint ignores it and uses the JWT-derived identity.
      const res = await studentAgent
        .get("/api/results/my-results?studentId=someFakeId123")
        .expect(200);

      expect(res.body.success).toBe(true);
      // Should return 1 result (the student's own), not "no results because of fake id"
      expect(res.body.data.length).toBe(1);
      expect(String(res.body.data[0].student_id)).toBe(String(student._id));
    });
  });

  // ---- Role authorization --------------------------------------------------

  describe("R3 — non-STUDENT roles are rejected with 403", () => {
    it("TEACHER role cannot access /my-results (403)", async () => {
      const {
        college,
        department,
        studentAgent,
      } = await fullBaseSetup();

      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;

      const res = await teacherAgent.get("/api/results/my-results").expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("EXAM_COORDINATOR role cannot access /my-results (403)", async () => {
      const { coordAgent } = await fullBaseSetup();

      const res = await coordAgent.get("/api/results/my-results").expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });
  });

  // ---- Tenant isolation --------------------------------------------------

  describe("R4 — cross-college student sees no results (tenant isolation)", () => {
    it("student from college B sees no results even if college A has published results", async () => {
      const {
        coordAgent,
        college: collegeA,
        exam,
        student,
        subject,
      } = await fullBaseSetup();

      // Publish a result for the student in college A
      await SemesterResult.create({
        college_id: exam.college_id,
        student_id: student._id,
        exam_id: exam._id,
        course_id: exam.course_id,
        semester: exam.semester,
        academicYear: exam.academicYear,
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        calculatedAt: new Date(),
        status: "PUBLISHED",
        publishedBy: new mongoose.Types.ObjectId(),
        publishedAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Create college B + student B in college B
      const collegeB = await createCollege({
        code: `VISB${Date.now()}`,
        email: `visb.${Date.now()}@test.com`,
      });

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

      const {
        agent: studentBAgent,
      } = await setupStudentUser(collegeB._id, departmentB._id, courseB._id);

      // Student B should see no results (no published results in college B)
      const res = await getMyResults(studentBAgent);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ---- Authentication ----------------------------------------------------

  describe("R5 — unauthenticated request is rejected with 401", () => {
    it("no auth token/session -> 401", async () => {
      const { studentAgent } = await fullBaseSetup();

      const res = await request(app).get("/api/results/my-results").expect(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ---- Student profile existence -----------------------------------------

  describe("R6 — student without a Student profile gets 404", () => {
    it("user with STUDENT role but no Student document -> 404 STUDENT_NOT_FOUND", async () => {
      const college = await createCollege({
        code: `NOSTU${Date.now()}`,
        email: `nostu.${Date.now()}@test.com`,
      });

      // Create a STUDENT user WITHOUT a linked Student profile
      const studentUser = await createUser({
        email: `nostu.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
        password: "Test@123",
        role: "STUDENT",
        college_id: college._id,
        isActive: true,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: studentUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/results/my-results").expect(404);
      expect(res.body.error.code).toBe("STUDENT_NOT_FOUND");
    });
  });
});
