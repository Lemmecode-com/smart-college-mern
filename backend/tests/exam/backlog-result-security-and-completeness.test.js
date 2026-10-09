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
const Backlog = require("../../src/models/backlog.model");
const BacklogAttempt = require("../../src/models/backlogAttempt.model");
const app = require("../../app");

describe("Step 3: Backend P0 Security & Backlog Data Completeness", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ---- Setup Helpers -----------------------------------------------------

  const setupStudentUser = async (collegeId, departmentId, courseId, nameSuffix = "1") => {
    const cleanSuffix = String(nameSuffix).toLowerCase();
    const email = `student.${cleanSuffix}.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`;
    const studentUser = await createUser({
      email,
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
      fullName: `Student ${nameSuffix}`,
      email,
      currentSemester: 3,
      status: "APPROVED",
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email, password: "Test@123" })
      .expect(200);

    return { agent, studentUser, student };
  };

  const setupBaseCollege = async (collegeCode = `VIS${Date.now()}`) => {
    const college = await createCollege({
      code: collegeCode,
      email: `college.${Date.now()}.${Math.floor(Math.random() * 1000)}@test.com`,
    });

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
      name: "Data Structures",
      code: `DS-${Date.now()}`,
      semester: 2,
      credits: 4,
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
    });

    return { college, department, course, subject };
  };

  // =========================================================================
  // PART 11: P0 Visibility Tests
  // =========================================================================

  describe("P0 Security Fix: Unpublished, Ongoing, Draft, or Incomplete Attempts", () => {
    it("Scenario A: Draft exam + INCOMPLETE backlog attempt is NOT returned to student", async () => {
      const { college, department, course, subject } = await setupBaseCollege();
      const { agent: studentAgent, student } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
      );

      const draftExam = await Exam.create({
        college_id: college._id,
        name: "Midterm Draft Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "DRAFT",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 2,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 25, status: "FAIL" },
        status: "ATTEMPTED",
        attempt_count: 1,
      });

      await BacklogAttempt.create({
        backlog_id: backlog._id,
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        attempt_number: 1,
        exam_id: draftExam._id,
        exam_name: draftExam.name,
        result_status: "INCOMPLETE",
        passed: false,
        cleared: false,
        internal_marks: 18,
        external_marks: null,
      });

      const res = await studentAgent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);

      // The incomplete draft attempt must NOT appear in backlogResults
      const attempts = res.body.backlogResults || [];
      const leakedAttempt = attempts.find((a) => a.attemptNumber === 1);
      expect(leakedAttempt).toBeUndefined();

      // But the backlog itself is active and represented as OPEN with 0 published attempts
      const openBacklog = attempts.find(
        (a) => String(a.backlogId) === String(backlog._id) && a.attemptNumber === 0,
      );
      expect(openBacklog).toBeDefined();
      expect(openBacklog.status).toBe("ATTEMPTED");
      expect(openBacklog.internalMarks).toBeNull();
    });

    it("Scenario B: Ongoing/unpublished exam + INCOMPLETE attempt is NOT returned", async () => {
      const { college, department, course, subject } = await setupBaseCollege();
      const { agent: studentAgent, student } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
      );

      // Exam configuration is published (timetable announced), but results are not generated or published
      const ongoingExam = await Exam.create({
        college_id: college._id,
        name: "Ongoing Regular Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 2,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 20, status: "FAIL" },
        status: "ATTEMPTED",
        attempt_count: 1,
      });

      await BacklogAttempt.create({
        backlog_id: backlog._id,
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        attempt_number: 1,
        exam_id: ongoingExam._id,
        exam_name: ongoingExam.name,
        result_status: "INCOMPLETE",
        passed: false,
        cleared: false,
      });

      const res = await studentAgent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);

      const attempts = res.body.backlogResults || [];
      const incompleteAttempt = attempts.find((a) => a.attemptNumber === 1);
      expect(incompleteAttempt).toBeUndefined();
    });

    it("Scenario C: Locked results (not published) + evaluated attempt is NOT returned", async () => {
      const { college, department, course, subject } = await setupBaseCollege();
      const { agent: studentAgent, student } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
      );

      const lockedExam = await Exam.create({
        college_id: college._id,
        name: "Locked Evaluation Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Regular results for this exam are LOCKED, not PUBLISHED
      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: lockedExam._id,
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        status: "LOCKED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 2,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 20, status: "FAIL" },
        status: "ATTEMPTED",
        attempt_count: 1,
      });

      // Even if evaluated internally, because results are LOCKED, student must not see this attempt
      await BacklogAttempt.create({
        backlog_id: backlog._id,
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        attempt_number: 1,
        exam_id: lockedExam._id,
        exam_name: lockedExam.name,
        result_status: "PASS",
        passed: true,
        cleared: true,
        internal_marks: 25,
        external_marks: 55,
        total_marks: 80,
      });

      const res = await studentAgent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);

      const attempts = res.body.backlogResults || [];
      const evaluatedAttempt = attempts.find((a) => a.attemptNumber === 1);
      expect(evaluatedAttempt).toBeUndefined();
    });

    it("Scenario D: Published exam + evaluated PASS attempt is returned", async () => {
      const { college, department, course, subject } = await setupBaseCollege();
      const { agent: studentAgent, student } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
      );

      const publishedExam = await Exam.create({
        college_id: college._id,
        name: "Published Final Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Exam results officially published
      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: publishedExam._id,
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 2,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 20, status: "FAIL" },
        status: "CLEARED",
        attempt_count: 1,
      });

      const attempt = await BacklogAttempt.create({
        backlog_id: backlog._id,
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        attempt_number: 1,
        exam_id: publishedExam._id,
        exam_name: publishedExam.name,
        result_status: "PASS",
        passed: true,
        cleared: true,
        internal_marks: 25,
        external_marks: 55,
        total_marks: 80,
        evaluated_at: new Date(),
      });

      const res = await studentAgent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);

      const attempts = res.body.backlogResults || [];
      expect(attempts).toHaveLength(1);
      expect(String(attempts[0].attemptId)).toBe(String(attempt._id));
      expect(attempts[0].attemptNumber).toBe(1);
      expect(attempts[0].resultStatus).toBe("PASS");
      expect(attempts[0].passed).toBe(true);
      expect(attempts[0].cleared).toBe(true);
      expect(attempts[0].totalMarks).toBe(80);
    });

    it("Scenario E: Published exam + evaluated FAIL attempt is returned", async () => {
      const { college, department, course, subject } = await setupBaseCollege();
      const { agent: studentAgent, student } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
      );

      const publishedExam = await Exam.create({
        college_id: college._id,
        name: "Published Final Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: publishedExam._id,
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "FAIL",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 2,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 20, status: "FAIL" },
        status: "OPEN",
        attempt_count: 1,
      });

      const attempt = await BacklogAttempt.create({
        backlog_id: backlog._id,
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        attempt_number: 1,
        exam_id: publishedExam._id,
        exam_name: publishedExam.name,
        result_status: "FAIL",
        passed: false,
        cleared: false,
        internal_marks: 10,
        external_marks: 20,
        total_marks: 30,
        evaluated_at: new Date(),
      });

      const res = await studentAgent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);

      const attempts = res.body.backlogResults || [];
      expect(attempts).toHaveLength(1);
      expect(String(attempts[0].attemptId)).toBe(String(attempt._id));
      expect(attempts[0].attemptNumber).toBe(1);
      expect(attempts[0].resultStatus).toBe("FAIL");
      expect(attempts[0].passed).toBe(false);
      expect(attempts[0].cleared).toBe(false);
      expect(attempts[0].totalMarks).toBe(30);
    });

    it("Scenario F: Published exam but INCOMPLETE attempt is NOT returned", async () => {
      const { college, department, course, subject } = await setupBaseCollege();
      const { agent: studentAgent, student } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
      );

      const publishedExam = await Exam.create({
        college_id: college._id,
        name: "Published Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Regular exam result is published for other subjects, but backlog evaluation did not finish
      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: publishedExam._id,
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 2,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 20, status: "FAIL" },
        status: "ATTEMPTED",
        attempt_count: 1,
      });

      await BacklogAttempt.create({
        backlog_id: backlog._id,
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        attempt_number: 1,
        exam_id: publishedExam._id,
        exam_name: publishedExam.name,
        result_status: "INCOMPLETE",
        passed: false,
        cleared: false,
      });

      const res = await studentAgent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);

      const attempts = res.body.backlogResults || [];
      const incompleteAttempt = attempts.find((a) => a.attemptNumber === 1);
      expect(incompleteAttempt).toBeUndefined();
    });
  });

  // =========================================================================
  // PART 12: Zero-Attempt Backlog Tests
  // =========================================================================

  describe("Open Backlog Completeness: Zero-Attempt Active Backlogs", () => {
    it("returns active OPEN backlog with zero attempts and empty attempt history", async () => {
      const { college, department, course, subject } = await setupBaseCollege();
      const { agent: studentAgent, student } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
      );

      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 1,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 15, status: "FAIL" },
        status: "OPEN",
        attempt_count: 0,
      });

      const res = await studentAgent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);

      const backlogs = res.body.backlogResults || [];
      expect(backlogs).toHaveLength(1);

      const entry = backlogs[0];
      expect(String(entry.backlogId)).toBe(String(backlog._id));
      expect(String(entry.subjectId)).toBe(String(subject._id));
      expect(entry.subjectName).toBe(subject.name);
      expect(entry.subjectCode).toBe(subject.code);
      expect(entry.semester).toBe(1);
      expect(entry.academicYear).toBe("2025-26");
      expect(entry.status).toBe("OPEN");
      expect(entry.attemptNumber).toBe(0);
      expect(entry.attemptId).toBeNull();
      expect(entry.attempts).toEqual([]);
      expect(entry.cleared).toBe(false);
      expect(entry.passed).toBe(false);
    });
  });

  // =========================================================================
  // PART 13: Multiple Attempt Regression Tests
  // =========================================================================

  describe("Multiple Attempt History Preservation & Deduplication", () => {
    it("preserves full history: Attempt #1 FAIL and Attempt #2 PASS on CLEARED backlog without discarding history", async () => {
      const { college, department, course, subject } = await setupBaseCollege();
      const { agent: studentAgent, student } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
      );

      // Exam 1
      const exam1 = await Exam.create({
        college_id: college._id,
        name: "Supplementary Exam Term 1",
        course_id: course._id,
        semester: 2,
        academicYear: "2025-26",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });
      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: exam1._id,
        course_id: course._id,
        semester: 2,
        academicYear: "2025-26",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "FAIL",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Exam 2
      const exam2 = await Exam.create({
        college_id: college._id,
        name: "Supplementary Exam Term 2",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });
      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: exam2._id,
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 1,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 15, status: "FAIL" },
        status: "CLEARED",
        attempt_count: 2,
      });

      // Attempt 1: FAIL
      const attempt1 = await BacklogAttempt.create({
        backlog_id: backlog._id,
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        attempt_number: 1,
        exam_id: exam1._id,
        exam_name: exam1.name,
        result_status: "FAIL",
        passed: false,
        cleared: false,
        internal_marks: 10,
        external_marks: 20,
        total_marks: 30,
        evaluated_at: new Date(Date.now() - 100000),
      });

      // Attempt 2: PASS
      const attempt2 = await BacklogAttempt.create({
        backlog_id: backlog._id,
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        attempt_number: 2,
        exam_id: exam2._id,
        exam_name: exam2.name,
        result_status: "PASS",
        passed: true,
        cleared: true,
        internal_marks: 25,
        external_marks: 55,
        total_marks: 80,
        evaluated_at: new Date(),
      });

      const res = await studentAgent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);

      const backlogs = res.body.backlogResults || [];
      // 2 attempt entries returned in flat list, corresponding to Attempt #1 and Attempt #2
      expect(backlogs).toHaveLength(2);

      const a1 = backlogs.find((a) => a.attemptNumber === 1);
      const a2 = backlogs.find((a) => a.attemptNumber === 2);

      expect(a1).toBeDefined();
      expect(String(a1.attemptId)).toBe(String(attempt1._id));
      expect(a1.resultStatus).toBe("FAIL");
      expect(a1.cleared).toBe(false);

      expect(a2).toBeDefined();
      expect(String(a2.attemptId)).toBe(String(attempt2._id));
      expect(a2.resultStatus).toBe("PASS");
      expect(a2.cleared).toBe(true);

      // Verify attempts history is preserved on both entries
      expect(a1.attempts).toHaveLength(2);
      expect(a2.attempts).toHaveLength(2);
      expect(a2.attempts[0].attemptNumber).toBe(1);
      expect(a2.attempts[1].attemptNumber).toBe(2);
    });
  });

  // =========================================================================
  // PART 14: Security Regression Tests (Student & Tenant Isolation)
  // =========================================================================

  describe("Security: Student & Tenant Isolation", () => {
    it("Cross-Student Isolation: Student A sees only Student A data and never Student B data", async () => {
      const { college, department, course, subject } = await setupBaseCollege();

      const { agent: studentAAgent, student: studentA } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
        "A",
      );

      const { agent: studentBAgent, student: studentB } = await setupStudentUser(
        college._id,
        department._id,
        course._id,
        "B",
      );

      const publishedExam = await Exam.create({
        college_id: college._id,
        name: "Term Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      await SemesterResult.create({
        college_id: college._id,
        student_id: studentA._id,
        exam_id: publishedExam._id,
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Backlog for Student A
      const backlogA = await Backlog.create({
        college_id: college._id,
        student_id: studentA._id,
        course_id: course._id,
        semester: 1,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: "Subject For A",
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 10, status: "FAIL" },
        status: "OPEN",
        attempt_count: 0,
      });

      // Backlog for Student B
      const backlogB = await Backlog.create({
        college_id: college._id,
        student_id: studentB._id,
        course_id: course._id,
        semester: 1,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: "Subject For B",
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 10, status: "FAIL" },
        status: "OPEN",
        attempt_count: 0,
      });

      // Student A request
      const resA = await studentAAgent.get("/api/results/my-results").expect(200);
      expect(resA.body.success).toBe(true);
      const backlogsA = resA.body.backlogResults || [];
      expect(backlogsA).toHaveLength(1);
      expect(String(backlogsA[0].backlogId)).toBe(String(backlogA._id));
      expect(backlogsA[0].subjectName).toBe("Subject For A");

      // Student B request
      const resB = await studentBAgent.get("/api/results/my-results").expect(200);
      expect(resB.body.success).toBe(true);
      const backlogsB = resB.body.backlogResults || [];
      expect(backlogsB).toHaveLength(1);
      expect(String(backlogsB[0].backlogId)).toBe(String(backlogB._id));
      expect(backlogsB[0].subjectName).toBe("Subject For B");
    });

    it("Cross-College Isolation: Student in College A sees no backlogs or attempts from College B", async () => {
      const baseA = await setupBaseCollege(`COLA${Date.now()}`);
      const baseB = await setupBaseCollege(`COLB${Date.now()}`);

      const { agent: studentAgentA, student: studentA } = await setupStudentUser(
        baseA.college._id,
        baseA.department._id,
        baseA.course._id,
        "ColA",
      );

      const { student: studentB } = await setupStudentUser(
        baseB.college._id,
        baseB.department._id,
        baseB.course._id,
        "ColB",
      );

      const examB = await Exam.create({
        college_id: baseB.college._id,
        name: "College B Exam",
        course_id: baseB.course._id,
        semester: 3,
        academicYear: "2026-27",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      await SemesterResult.create({
        college_id: baseB.college._id,
        student_id: studentB._id,
        exam_id: examB._id,
        course_id: baseB.course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });

      const backlogB = await Backlog.create({
        college_id: baseB.college._id,
        student_id: studentB._id,
        course_id: baseB.course._id,
        semester: 2,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: baseB.subject._id,
        subject_code: baseB.subject.code,
        subject_name: baseB.subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 10, status: "FAIL" },
        status: "CLEARED",
        attempt_count: 1,
      });

      await BacklogAttempt.create({
        backlog_id: backlogB._id,
        student_id: studentB._id,
        college_id: baseB.college._id,
        course_id: baseB.course._id,
        subject_id: baseB.subject._id,
        subject_code: baseB.subject.code,
        subject_name: baseB.subject.name,
        subject_type: "THEORY",
        attempt_number: 1,
        exam_id: examB._id,
        exam_name: examB.name,
        result_status: "PASS",
        passed: true,
        cleared: true,
        total_marks: 85,
      });

      // Student A queries /my-results in College A
      const resA = await studentAgentA.get("/api/results/my-results").expect(200);
      expect(resA.body.success).toBe(true);
      expect(resA.body.data).toHaveLength(0);
      expect(resA.body.backlogResults).toHaveLength(0);
    });
  });
});
