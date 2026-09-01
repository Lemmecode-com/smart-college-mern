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
const Subject = require("../../src/models/subject.model");
const Student = require("../../src/models/student.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const {
  calculateOverallResult,
} = require("../../src/services/semesterResult.service");
const app = require("../../app");

describe("STEP 6 — SemesterResult generation", () => {
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
      email: `coordinator.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
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

  const setupUnauthorizedTeacher = async (collegeId) => {
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

  const baseSetup = async () => {
    const college = await createCollege({
      code: `RES${Date.now()}`,
      email: `res.${Date.now()}@test.com`,
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

    const compositeSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Composite Subject",
      code: `CP-${Date.now()}`,
      semester: 3,
      credits: 4,
      subjectType: "COMPOSITE",
      internalMaxMarks: 40,
      externalMaxMarks: 60,
      passMarks: 50,
    });

    const createdExam = await agent
      .post("/api/exam")
      .send({
        name: "Semester 3 Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [theorySubject._id, practicalSubject._id, compositeSubject._id],
      })
      .expect(201);

    const student1 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      fullName: "Student One",
      email: `student1.${Date.now()}@test.com`,
      currentSemester: 3,
      status: "APPROVED",
    });

    const student2 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      fullName: "Student Two",
      email: `student2.${Date.now()}@test.com`,
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
      compositeSubject,
      exam: createdExam.body.exam,
      student1,
      student2,
    };
  };

  /**
   * Enter marks for one subject via the existing bulk marks API.
   * `externalMarks` is optional and omitted for PRACTICAL subjects.
   */
  const enterMarks = async (agent, examId, subjectId, entries) => {
    return agent
      .post("/api/marks/bulk")
      .send({ examId, subjectId, marks: entries })
      .expect(200);
  };

  const generateResult = (agent, examId, studentId) =>
    agent
      .post("/api/results/generate")
      .send({ examId, studentId })
      .expect(200);

  // ---- Pure unit tests (no database) ------------------------------------

  describe("Unit — overall result aggregation", () => {
    it("U1. all PASS -> PASS", () => {
      expect(calculateOverallResult(["PASS", "PASS"])).toBe("PASS");
    });

    it("U2. one FAIL among PASS -> FAIL", () => {
      expect(calculateOverallResult(["PASS", "FAIL", "PASS"])).toBe("FAIL");
    });

    it("U3. multiple FAIL -> FAIL", () => {
      expect(calculateOverallResult(["FAIL", "FAIL", "PASS"])).toBe("FAIL");
    });

    it("U4. one INCOMPLETE -> INCOMPLETE (wins over FAIL)", () => {
      expect(calculateOverallResult(["FAIL", "INCOMPLETE", "PASS"])).toBe(
        "INCOMPLETE",
      );
    });

    it("U5. INCOMPLETE alone -> INCOMPLETE", () => {
      expect(calculateOverallResult(["INCOMPLETE"])).toBe("INCOMPLETE");
    });

    it("U6. empty list -> INCOMPLETE", () => {
      expect(calculateOverallResult([])).toBe("INCOMPLETE");
    });
  });

  // ---- API + security behavior ------------------------------------------

  describe("API — authentication & authorization", () => {
    it("E1. unauthenticated request is rejected with 401", async () => {
      const { exam, student1 } = await baseSetup();
      const res = await request(app)
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student1._id });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("E2. unauthorized role (TEACHER) is rejected with 403", async () => {
      const { college, exam, student1 } = await baseSetup();
      const teacherAgent = (await setupUnauthorizedTeacher(college._id)).agent;
      const res = await teacherAgent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student1._id });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("E3. missing examId is rejected with 400", async () => {
      const { agent, student1 } = await baseSetup();
      const res = await agent
        .post("/api/results/generate")
        .send({ studentId: student1._id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_EXAM_ID");
    });

    it("E4. missing studentId is rejected with 400", async () => {
      const { agent, exam } = await baseSetup();
      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_STUDENT_ID");
    });

    it("E5. client-supplied aggregate fields are ignored", async () => {
      const { agent, exam, student1 } = await baseSetup();

      const res = await agent
        .post("/api/results/generate")
        .send({
          examId: exam._id,
          studentId: student1._id,
          overallResult: "PASS",
          totalSubjects: 999,
          passedSubjects: 999,
          failedSubjects: 999,
          incompleteSubjects: 999,
          passed: true,
        })
        .expect(200);

      const persisted = await SemesterResult.findOne({
        college_id: exam.college_id,
        exam_id: exam._id,
        student_id: student1._id,
      }).lean();

      expect(persisted).not.toBeNull();
      expect(persisted.totalSubjects).toBe(3);
      // No bogus 999 values leaked into the stored document.
      expect(persisted.passedSubjects).not.toBe(999);
      expect(persisted.overallResult).not.toBe("PASS");
    });
  });

  describe("API — tenant & academic-context isolation", () => {
    it("E6. invalid Exam -> 404", async () => {
      const { agent, student1 } = await baseSetup();
      const fakeExamId = new mongoose.Types.ObjectId();
      const res = await agent
        .post("/api/results/generate")
        .send({ examId: fakeExamId, studentId: student1._id });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("EXAM_NOT_FOUND");
    });

    it("E7. cross-college Exam -> 404", async () => {
      const { agent, exam, student1 } = await baseSetup();

      // Second college + coordinator that does NOT own the exam.
      const collegeB = await createCollege({
        code: `RESB${Date.now()}`,
        email: `resb.${Date.now()}@test.com`,
      });
      const { agent: agentB } = await setupCoordinator(collegeB._id);

      const res = await agentB
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student1._id });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("EXAM_NOT_FOUND");
    });

    it("E8. invalid Student -> 404", async () => {
      const { agent, exam } = await baseSetup();
      const fakeStudentId = new mongoose.Types.ObjectId();
      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: fakeStudentId });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("STUDENT_NOT_FOUND");
    });

    it("E9. cross-college Student -> 404", async () => {
      const { agent, exam } = await baseSetup();

      const collegeB = await createCollege({
        code: `RESC${Date.now()}`,
        email: `resc.${Date.now()}@test.com`,
      });
      const departmentB = await createDepartment({
        college_id: collegeB._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "Mechanical",
        code: "ME",
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
        code: "BTECH-ME",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 120,
        maxStudents: 60,
      });
      const otherCollegeStudent = await createStudent({
        college_id: collegeB._id,
        department_id: departmentB._id,
        course_id: courseB._id,
        createdBy: new mongoose.Types.ObjectId(),
        fullName: "Other College Student",
        email: `other.${Date.now()}@test.com`,
        currentSemester: 3,
        status: "APPROVED",
      });

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: otherCollegeStudent._id });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("STUDENT_NOT_FOUND");
    });

    it("E10. student in wrong course is blocked (400)", async () => {
      const { agent, exam, college, department } = await baseSetup();

      const otherCourse = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "B.Tech ME",
        code: `BTECH-ME-${Date.now()}`,
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 120,
        maxStudents: 60,
      });
      const wrongCourseStudent = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: otherCourse._id,
        createdBy: new mongoose.Types.ObjectId(),
        fullName: "Wrong Course Student",
        email: `wrongcourse.${Date.now()}@test.com`,
        currentSemester: 3,
        status: "APPROVED",
      });

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: wrongCourseStudent._id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("STUDENT_COURSE_MISMATCH");
    });

    it("E11. student in wrong semester is blocked (400)", async () => {
      const { agent, exam, student1 } = await baseSetup();
      // Move the student to a different semester than the exam's.
      await Student.updateOne({ _id: student1._id }, { currentSemester: 5 });

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student1._id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("STUDENT_SEMESTER_MISMATCH");
    });

    it("E12. exam with no subjects -> 400", async () => {
      const { agent, exam, student1 } = await baseSetup();

      // Mutate the exam to have zero subjects (controller creation forbids this,
      // but the model allows it, so the generation service must still guard).
      await Exam.findByIdAndUpdate(exam._id, { subjects: [] });

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student1._id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("EXAM_NO_SUBJECTS");
    });
  });

  describe("API — result calculation & persistence", () => {
    it("S1. all subjects PASS -> overallResult PASS", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
        practicalSubject,
        compositeSubject,
      } = await baseSetup();

      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 25, externalMarks: 60 },
      ]);
      await enterMarks(agent, exam._id, practicalSubject._id, [
        { studentId: student1._id, internalMarks: 50 },
      ]);
      await enterMarks(agent, exam._id, compositeSubject._id, [
        { studentId: student1._id, internalMarks: 25, externalMarks: 40 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overallResult).toBe("PASS");
      expect(res.body.data.passedSubjects).toBe(3);
      expect(res.body.data.failedSubjects).toBe(0);
      expect(res.body.data.incompleteSubjects).toBe(0);
      expect(res.body.data.totalSubjects).toBe(3);

      expect(
        res.body.data.subjects.some((s) => s.subjectType === "THEORY"),
      ).toBe(true);
    });

    it("S2. one FAIL -> overallResult FAIL", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
        practicalSubject,
        compositeSubject,
      } = await baseSetup();

      // THEORY: internal below pass (10 < 12) => FAIL
      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 10, externalMarks: 60 },
      ]);
      await enterMarks(agent, exam._id, practicalSubject._id, [
        { studentId: student1._id, internalMarks: 50 },
      ]);
      await enterMarks(agent, exam._id, compositeSubject._id, [
        { studentId: student1._id, internalMarks: 25, externalMarks: 40 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      expect(res.body.data.overallResult).toBe("FAIL");
      expect(res.body.data.failedSubjects).toBe(1);
      expect(res.body.data.passedSubjects).toBe(2);
    });

    it("S3. multiple FAIL subjects -> overallResult FAIL", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
        practicalSubject,
        compositeSubject,
      } = await baseSetup();

      // THEORY fail, PRACTICAL fail, COMPOSITE fail
      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 5, externalMarks: 10 },
      ]);
      await enterMarks(agent, exam._id, practicalSubject._id, [
        { studentId: student1._id, internalMarks: 20 },
      ]);
      await enterMarks(agent, exam._id, compositeSubject._id, [
        { studentId: student1._id, internalMarks: 10, externalMarks: 10 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      expect(res.body.data.overallResult).toBe("FAIL");
      expect(res.body.data.failedSubjects).toBe(3);
      expect(res.body.data.passedSubjects).toBe(0);
    });

    it("S4. one INCOMPLETE subject -> overallResult INCOMPLETE", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
        practicalSubject,
        compositeSubject,
      } = await baseSetup();

      // THEORY only has external marks entered => INCOMPLETE (missing internal)
      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, externalMarks: 60 },
      ]);
      await enterMarks(agent, exam._id, practicalSubject._id, [
        { studentId: student1._id, internalMarks: 50 },
      ]);
      await enterMarks(agent, exam._id, compositeSubject._id, [
        { studentId: student1._id, internalMarks: 25, externalMarks: 40 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      expect(res.body.data.overallResult).toBe("INCOMPLETE");
      expect(res.body.data.incompleteSubjects).toBe(1);

      const incompleteSubject = res.body.data.subjects.find(
        (s) => s.status === "INCOMPLETE",
      );
      expect(incompleteSubject).toBeDefined();
      expect(incompleteSubject.marksRecorded).toBe(true);
    });

    it("S5. missing StudentMarks record -> INCOMPLETE, marksRecorded false", async () => {
      const { agent, exam, student1 } = await baseSetup();

      // Enter no marks at all. Every subject has no StudentMarks document.
      const res = await generateResult(agent, exam._id, student1._id);
      expect(res.body.data.overallResult).toBe("INCOMPLETE");
      expect(res.body.data.incompleteSubjects).toBe(3);
      expect(res.body.data.totalSubjects).toBe(3);

      const theory = res.body.data.subjects[0];
      expect(theory.status).toBe("INCOMPLETE");
      expect(theory.marksRecorded).toBe(false);
      expect(theory.internalMarks).toBeNull();
      expect(theory.externalMarks).toBeNull();
    });

    it("S6. zero marks are calculated (not coerced to null / not ignored)", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
        practicalSubject,
        compositeSubject,
      } = await baseSetup();

      // THEORY with internal 0 => internalPassed false => FAIL (zero is a real mark)
      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 0, externalMarks: 60 },
      ]);
      // PRACTICAL with internal 0 => FAIL (0 < 40 pass mark)
      await enterMarks(agent, exam._id, practicalSubject._id, [
        { studentId: student1._id, internalMarks: 0 },
      ]);
      // COMPOSITE with internal 0 + external 60 = 60 >= 50 => PASS (zero is real)
      await enterMarks(agent, exam._id, compositeSubject._id, [
        { studentId: student1._id, internalMarks: 0, externalMarks: 60 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);

      const theory = res.body.data.subjects[0];
      expect(theory.internalMarks).toBe(0);
      expect(theory.status).toBe("FAIL");

      const practical = res.body.data.subjects[1];
      expect(practical.internalMarks).toBe(0);
      expect(practical.status).toBe("FAIL");

      const composite = res.body.data.subjects[2];
      expect(composite.internalMarks).toBe(0);
      expect(composite.totalMarks).toBe(60);
      expect(composite.status).toBe("PASS");
    });

    it("S7. THEORY subject calculation is reused from ExamCalculationService", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
      } = await baseSetup();

      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 25, externalMarks: 60 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      const t = res.body.data.subjects.find((s) => s.subjectType === "THEORY");
      expect(t.totalMarks).toBe(85);
      expect(t.internalPassed).toBe(true);
      expect(t.externalPassed).toBe(true);
      expect(t.passed).toBe(true);
      expect(t.status).toBe("PASS");
    });

    it("S8. PRACTICAL subject calculation is reused from ExamCalculationService", async () => {
      const {
        agent,
        exam,
        student1,
        practicalSubject,
      } = await baseSetup();

      await enterMarks(agent, exam._id, practicalSubject._id, [
        { studentId: student1._id, internalMarks: 50 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      const p = res.body.data.subjects.find((s) => s.subjectType === "PRACTICAL");
      expect(p.externalMarks).toBeNull();
      expect(p.totalMarks).toBe(50);
      expect(p.passed).toBe(true);
      expect(p.status).toBe("PASS");
    });

    it("S9. COMPOSITE subject calculation is reused from ExamCalculationService", async () => {
      const {
        agent,
        exam,
        student1,
        compositeSubject,
      } = await baseSetup();

      await enterMarks(agent, exam._id, compositeSubject._id, [
        { studentId: student1._id, internalMarks: 20, externalMarks: 25 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      const c = res.body.data.subjects.find((s) => s.subjectType === "COMPOSITE");
      expect(c.totalMarks).toBe(45);
      expect(c.passed).toBe(false);
      expect(c.status).toBe("FAIL");
    });

    it("S10. missing/invalid Exam snapshot config -> INCOMPLETE subject", async () => {
      const {
        agent,
        exam,
        student1,
        college,
        department,
        course,
      } = await baseSetup();

      // Create a legacy subject WITHOUT exam configuration (no subjectType/passMarks).
      const legacySubject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "Legacy Subject",
        code: `LEG-${Date.now()}`,
        semester: 3,
        credits: 4,
      });

      // Add the legacy subject to the exam's snapshot with NO configuration
      // fields, then enter marks for it via the existing API.
      await Exam.findByIdAndUpdate(exam._id, {
        $push: {
          subjects: {
            subject: legacySubject._id,
            subjectType: undefined,
            internalMaxMarks: undefined,
            externalMaxMarks: undefined,
            internalPassMarks: undefined,
            externalPassMarks: undefined,
            passMarks: undefined,
          },
        },
      });

      await enterMarks(agent, exam._id, legacySubject._id, [
        { studentId: student1._id, internalMarks: 50, externalMarks: 50 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      const legacy = res.body.data.subjects.find(
        (s) => String(s.subject) === String(legacySubject._id),
      );
      expect(legacy).toBeDefined();
      expect(legacy.status).toBe("INCOMPLETE");
      expect(legacy.passed).toBe(false);
      // Despite marks being entered, the missing snapshot config yields INCOMPLETE.
      expect(legacy.marksRecorded).toBe(true);
    });

    it("S11. repeated generation does not create duplicates (upsert)", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
      } = await baseSetup();

      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 25, externalMarks: 60 },
      ]);

      await generateResult(agent, exam._id, student1._id);
      await generateResult(agent, exam._id, student1._id);
      await generateResult(agent, exam._id, student1._id);

      const count = await SemesterResult.countDocuments({
        college_id: exam.college_id,
        exam_id: exam._id,
        student_id: student1._id,
      });
      expect(count).toBe(1);
    });

    it("S12. existing result is updated when marks change (re-generation)", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
        practicalSubject,
        compositeSubject,
      } = await baseSetup();

      // First state: THEORY fails, PRACTICAL + COMPOSITE pass => overall FAIL
      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 5, externalMarks: 10 },
      ]);
      await enterMarks(agent, exam._id, practicalSubject._id, [
        { studentId: student1._id, internalMarks: 50 },
      ]);
      await enterMarks(agent, exam._id, compositeSubject._id, [
        { studentId: student1._id, internalMarks: 25, externalMarks: 40 },
      ]);

      const first = await generateResult(agent, exam._id, student1._id);
      expect(first.body.data.overallResult).toBe("FAIL");

      // Update THEORY marks to pass and regenerate.
      await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: theorySubject._id,
          marks: [{ studentId: student1._id, internalMarks: 25, externalMarks: 60 }],
        })
        .expect(200);

      const second = await generateResult(agent, exam._id, student1._id);
      expect(second.body.data.overallResult).toBe("PASS");
      const theory = second.body.data.subjects.find(
        (s) => s.subjectType === "THEORY",
      );
      expect(theory.internalMarks).toBe(25);
      expect(theory.status).toBe("PASS");

      // Still a single record (updated, not duplicated).
      const count = await SemesterResult.countDocuments({
        college_id: exam.college_id,
        exam_id: exam._id,
        student_id: student1._id,
      });
      expect(count).toBe(1);
    });

    it("S13. historical Exam snapshot survives later Subject configuration changes", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
      } = await baseSetup();

      // Enter marks that PASS under the snapshot's thresholds
      // (internalPassMarks 12, externalPassMarks 28): 15 >= 12, 40 >= 28 => PASS
      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 15, externalMarks: 40 },
      ]);

      const first = await generateResult(agent, exam._id, student1._id);
      const firstTheory = first.body.data.subjects[0];
      expect(firstTheory.status).toBe("PASS");

      // Later, mutate the live Subject configuration to stricter thresholds
      // (internalPassMarks 20, externalPassMarks 50): 15 < 20, 40 < 50 => would FAIL
      await Subject.findByIdAndUpdate(theorySubject._id, {
        internalPassMarks: 20,
        externalPassMarks: 50,
      });

      // Regenerate — result must remain PASS because the Exam snapshot is the
      // source of truth, NOT the mutated Subject.
      const second = await generateResult(agent, exam._id, student1._id);
      const secondTheory = second.body.data.subjects[0];
      expect(secondTheory.status).toBe("PASS");
      expect(secondTheory.internalPassed).toBe(true);
      expect(secondTheory.externalPassed).toBe(true);
    });

    it("S14. generated result persists subject name/code snapshots", async () => {
      const {
        agent,
        exam,
        student1,
        theorySubject,
      } = await baseSetup();

      await enterMarks(agent, exam._id, theorySubject._id, [
        { studentId: student1._id, internalMarks: 25, externalMarks: 60 },
      ]);

      const res = await generateResult(agent, exam._id, student1._id);
      const t = res.body.data.subjects.find((s) => s.subjectType === "THEORY");
      expect(t.subjectName).toBe("Theory Subject");
      expect(t.subjectCode).toBe(theorySubject.code);
    });

    it("S15. result metadata mirrors the Exam (college/course/semester/academicYear)", async () => {
      const {
        agent,
        exam,
        student1,
        college,
        course,
      } = await baseSetup();

      const res = await generateResult(agent, exam._id, student1._id);
      expect(String(res.body.data.college_id)).toBe(String(college._id));
      expect(String(res.body.data.course_id)).toBe(String(course._id));
      expect(res.body.data.semester).toBe(3);
      expect(res.body.data.academicYear).toBe("2026-27");
      expect(res.body.data.exam_id).toBeDefined();
      expect(res.body.data.student_id).toBeDefined();
    });
  });
});
