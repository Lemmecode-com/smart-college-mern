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
const ExamSchedule = require("../../src/models/examSchedule.model");
const Backlog = require("../../src/models/backlog.model");
const BacklogAttempt = require("../../src/models/backlogAttempt.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const app = require("../../app");
const {
  createAttempt,
  evaluateAttempt,
  getAttempts,
  BACKLOG_STATUS,
} = require("../../src/services/backlogAttempt.service");
const {
  generateSemesterResult,
} = require("../../src/services/semesterResult.service");
const {
  filterPublishedExamAndScheduleForStudent,
} = require("../../src/utils/examVisibility.util");

describe("PHASE 5 — BACKLOG EVALUATION & AUTOMATIC CLEARANCE", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const setupEnv = async () => {
    const creatorId = new mongoose.Types.ObjectId();
    const college = await createCollege({
      code: `COL_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: "Engineering College",
    });

    const department = await createDepartment({
      college_id: college._id,
      name: "Computer Science",
      code: "CSE",
      createdBy: creatorId,
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: "B.Tech CSE",
      code: "BTECH-CSE",
      durationSemesters: 8,
      createdBy: creatorId,
    });

    // Teacher assigned to backlog paper
    const teacherUser = await createUser({
      email: `teacher.${Date.now()}.${Math.floor(Math.random() * 10000)}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
    });
    const teacher = await createTeacher({
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      createdBy: teacherUser._id,
    });

    // Regular Sem 4 Subject
    const sem4Subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: "Operating Systems",
      code: "CS401",
      semester: 4,
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
      teacher_id: teacher._id,
      createdBy: creatorId,
    });

    // Backlog Sem 2 Subject
    const sem2Subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: "Database Systems",
      code: "CS201",
      semester: 2,
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
      teacher_id: teacher._id,
      createdBy: creatorId,
    });

    // Student currently in Sem 4 with Sem 2 Backlog
    const student = await createStudent({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      currentSemester: 4,
      status: "APPROVED",
      fullName: "Alex Rivera",
      enrollmentNumber: `ENR-${Date.now()}`,
    });

    // Regular Student in Sem 4 without backlog
    const regularStudent = await createStudent({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      currentSemester: 4,
      status: "APPROVED",
      fullName: "Bob Regular",
      enrollmentNumber: `ENR-REG-${Date.now()}`,
    });

    // Admin user
    const adminUser = await createUser({
      email: `admin.${Date.now()}.${Math.floor(Math.random() * 10000)}@test.com`,
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
    });

    // Teacher Agent
    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    // Admin Agent
    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: adminUser.email, password: "Test@123" })
      .expect(200);

    // Create Backlog Record for Student in Sem 2 Subject
    const backlog = await Backlog.create({
      student_id: student._id,
      college_id: college._id,
      course_id: course._id,
      semester: 2,
      academicYear: "2024-25",
      original_exam_id: new mongoose.Types.ObjectId(),
      original_result_id: new mongoose.Types.ObjectId(),
      subject_id: sem2Subject._id,
      subject_code: sem2Subject.code,
      subject_name: sem2Subject.name,
      subject_type: "THEORY",
      original_marks_snapshot: { totalMarks: 18 },
      status: "OPEN",
    });

    // Create Unified Sem 4 Exam containing Regular CS401 + Backlog CS201
    const exam = await Exam.create({
      college_id: college._id,
      name: "Sem 4 End Semester Unified Exam",
      course_id: course._id,
      semester: 4,
      academicYear: "2026-27",
      exam_type: "REGULAR",
      status: "PUBLISHED",
      subjects: [
        {
          subject: sem4Subject._id,
          category: "REGULAR",
          originalSemester: 4,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
          internalPassMarks: 12,
          externalPassMarks: 28,
          passMarks: 40,
        },
        {
          subject: sem2Subject._id,
          category: "BACKLOG",
          originalSemester: 2,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
          internalPassMarks: 12,
          externalPassMarks: 28,
          passMarks: 40,
          assignedFaculty: teacher.user_id,
        },
      ],
      createdBy: adminUser._id,
    });

    return {
      college,
      department,
      course,
      sem4Subject,
      sem2Subject,
      student,
      regularStudent,
      teacherUser,
      teacher,
      adminUser,
      teacherAgent,
      adminAgent,
      backlog,
      exam,
    };
  };

  // ==========================================
  // BASIC CLEARANCE (1 - 5)
  // ==========================================
  describe("Basic Clearance", () => {
    it("1. Active backlog exists", async () => {
      const { backlog } = await setupEnv();
      expect(backlog.status).toBe("OPEN");
      expect(backlog.attempt_count).toBe(0);
    });

    it("2. Valid backlog attempt is created", async () => {
      const { backlog, exam, adminUser, college } = await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      expect(attempt).toBeDefined();
      expect(String(attempt.backlog_id)).toBe(String(backlog._id));
      expect(String(attempt.exam_id)).toBe(String(exam._id));
      expect(attempt.attempt_number).toBe(1);
      expect(attempt.result_status).toBe("INCOMPLETE");

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("ATTEMPTED");
      expect(updatedBacklog.attempt_count).toBe(1);
    });

    it("3. Passing marks produce PASS outcome", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college, teacherAgent } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      // Teacher enters passing marks (25 internal + 55 external = 80 total, passes)
      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: sem2Subject._id,
          marks: [
            {
              studentId: student._id,
              internalMarks: 25,
              externalMarks: 55,
            },
          ],
        })
        .expect(200);

      const evaluation = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      expect(evaluation.resultStatus).toBe("PASS");
      expect(evaluation.passed).toBe(true);
      expect(evaluation.backlogCleared).toBe(true);
      expect(evaluation.attempt.result_status).toBe("PASS");
    });

    it("4. PASS changes backlog to CLEARED", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college, teacherAgent } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: sem2Subject._id,
          marks: [
            {
              studentId: student._id,
              internalMarks: 25,
              externalMarks: 55,
            },
          ],
        })
        .expect(200);

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("CLEARED");
      expect(updatedBacklog.latest_result_status).toBe("PASS");
      expect(updatedBacklog.cleared_at).toBeDefined();
      expect(String(updatedBacklog.cleared_by)).toBe(String(adminUser._id));
    });

    it("5. Cleared backlog is no longer active", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college, teacherAgent } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: sem2Subject._id,
          marks: [{ studentId: student._id, internalMarks: 25, externalMarks: 55 }],
        })
        .expect(200);

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const activeBacklogs = await Backlog.find({
        college_id: college._id,
        student_id: student._id,
        status: { $in: ["OPEN", "ATTEMPTED"] },
      });
      expect(activeBacklogs.length).toBe(0);
    });
  });

  // ==========================================
  // FAILURE (6 - 8)
  // ==========================================
  describe("Failure Flow", () => {
    it("6. Failing marks produce FAIL", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college, teacherAgent } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      // Teacher enters failing marks (5 internal + 15 external = 20 total < 40 passMarks)
      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: sem2Subject._id,
          marks: [{ studentId: student._id, internalMarks: 5, externalMarks: 15 }],
        })
        .expect(200);

      const evaluation = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      expect(evaluation.resultStatus).toBe("FAIL");
      expect(evaluation.passed).toBe(false);
      expect(evaluation.backlogCleared).toBe(false);
    });

    it("7. FAIL keeps backlog OPEN/active", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college, teacherAgent } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: sem2Subject._id,
          marks: [{ studentId: student._id, internalMarks: 5, externalMarks: 15 }],
        })
        .expect(200);

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("OPEN");
      expect(updatedBacklog.latest_result_status).toBe("FAIL");
      expect(updatedBacklog.attempt_count).toBe(1);
    });

    it("8. Student remains eligible for another attempt after FAIL", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college, teacherAgent } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: sem2Subject._id,
          marks: [{ studentId: student._id, internalMarks: 5, externalMarks: 15 }],
        })
        .expect(200);

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const updatedBacklog = await Backlog.findById(backlog._id);
      expect(updatedBacklog.status).toBe("OPEN");

      // Can create attempt #2 for future exam
      const futureExam = await Exam.create({
        college_id: college._id,
        name: "Sem 5 Unified Exam",
        course_id: exam.course_id,
        semester: 5,
        academicYear: "2027-28",
        exam_type: "REGULAR",
        status: "PUBLISHED",
        subjects: [
          {
            subject: sem2Subject._id,
            category: "BACKLOG",
            originalSemester: 2,
            subjectType: "THEORY",
            internalMaxMarks: 30,
            externalMaxMarks: 70,
            passMarks: 40,
          },
        ],
        createdBy: adminUser._id,
      });

      const attempt2Result = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: futureExam._id,
      });

      expect(attempt2Result.attempt.attempt_number).toBe(2);
      expect(attempt2Result.backlog.status).toBe("ATTEMPTED");
    });
  });

  // ==========================================
  // ATTEMPT HISTORY (9 - 11)
  // ==========================================
  describe("Attempt History & Repeated Attempts", () => {
    it("9. Previous attempt remains stored in history", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college, teacherAgent } =
        await setupEnv();

      const { attempt: attempt1 } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: sem2Subject._id,
          marks: [{ studentId: student._id, internalMarks: 5, externalMarks: 15 }],
        })
        .expect(200);

      await evaluateAttempt({
        attemptId: attempt1._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const storedAttempt1 = await BacklogAttempt.findById(attempt1._id);
      expect(storedAttempt1).toBeDefined();
      expect(storedAttempt1.attempt_number).toBe(1);
      expect(storedAttempt1.result_status).toBe("FAIL");
      expect(storedAttempt1.cleared).toBe(false);
    });

    it("10. Multiple attempts are preserved separately without overwriting", async () => {
      const { backlog, exam, sem2Subject, student, teacher, adminUser, college, teacherAgent } =
        await setupEnv();

      // Attempt 1: FAIL
      const { attempt: attempt1 } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: sem2Subject._id,
          marks: [{ studentId: student._id, internalMarks: 5, externalMarks: 15 }],
        })
        .expect(200);

      await evaluateAttempt({
        attemptId: attempt1._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      // Exam 2
      const exam2 = await Exam.create({
        college_id: college._id,
        name: "Next Unified Exam",
        course_id: exam.course_id,
        semester: 4,
        academicYear: "2026-27",
        exam_type: "REGULAR",
        status: "PUBLISHED",
        subjects: [
          {
            subject: sem2Subject._id,
            category: "BACKLOG",
            originalSemester: 2,
            subjectType: "THEORY",
            internalMaxMarks: 30,
            externalMaxMarks: 70,
            internalPassMarks: 12,
            externalPassMarks: 28,
            passMarks: 40,
            assignedFaculty: teacher.user_id,
          },
        ],
        createdBy: adminUser._id,
      });

      // Attempt 2: FAIL
      const { attempt: attempt2 } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam2._id,
      });

      await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam2._id,
          subjectId: sem2Subject._id,
          marks: [{ studentId: student._id, internalMarks: 8, externalMarks: 20 }],
        })
        .expect(200);

      await evaluateAttempt({
        attemptId: attempt2._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const { attempts } = await getAttempts(backlog._id, college._id);
      expect(attempts.length).toBe(2);
      expect(attempts[0].attempt_number).toBe(1);
      expect(attempts[0].result_status).toBe("FAIL");
      expect(attempts[1].attempt_number).toBe(2);
      expect(attempts[1].result_status).toBe("FAIL");
      expect(String(attempts[0]._id)).not.toBe(String(attempts[1]._id));
    });

    it("11. Third attempt can clear backlog after previous failures", async () => {
      const { backlog, exam, sem2Subject, student, teacher, adminUser, college } =
        await setupEnv();

      // Attempt 1 -> FAIL
      const { attempt: a1 } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });
      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 5,
        externalMarks: 10,
        createdBy: adminUser._id,
      });
      await evaluateAttempt({
        attemptId: a1._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      // Attempt 2 -> FAIL
      const exam2 = await Exam.create({
        college_id: college._id,
        name: "Exam Attempt 2",
        course_id: exam.course_id,
        semester: 4,
        academicYear: "2026-27",
        status: "PUBLISHED",
        subjects: [
          {
            subject: sem2Subject._id,
            category: "BACKLOG",
            originalSemester: 2,
            subjectType: "THEORY",
            passMarks: 40,
            internalMaxMarks: 30,
            externalMaxMarks: 70,
            internalPassMarks: 12,
            externalPassMarks: 28,
          },
        ],
        createdBy: adminUser._id,
      });
      const { attempt: a2 } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam2._id,
      });
      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam2._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 8,
        externalMarks: 20,
        createdBy: adminUser._id,
      });
      await evaluateAttempt({
        attemptId: a2._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      // Attempt 3 -> PASS
      const exam3 = await Exam.create({
        college_id: college._id,
        name: "Exam Attempt 3",
        course_id: exam.course_id,
        semester: 4,
        academicYear: "2026-27",
        status: "PUBLISHED",
        subjects: [
          {
            subject: sem2Subject._id,
            category: "BACKLOG",
            originalSemester: 2,
            subjectType: "THEORY",
            passMarks: 40,
            internalMaxMarks: 30,
            externalMaxMarks: 70,
            internalPassMarks: 12,
            externalPassMarks: 28,
          },
        ],
        createdBy: adminUser._id,
      });
      const { attempt: a3 } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam3._id,
      });
      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam3._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 28,
        externalMarks: 65,
        createdBy: adminUser._id,
      });
      const eval3 = await evaluateAttempt({
        attemptId: a3._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      expect(eval3.resultStatus).toBe("PASS");
      expect(eval3.backlogCleared).toBe(true);

      const finalBacklog = await Backlog.findById(backlog._id);
      expect(finalBacklog.status).toBe("CLEARED");
      expect(finalBacklog.attempt_count).toBe(3);

      const { attempts } = await getAttempts(backlog._id, college._id);
      expect(attempts.length).toBe(3);
      expect(attempts[0].result_status).toBe("FAIL");
      expect(attempts[1].result_status).toBe("FAIL");
      expect(attempts[2].result_status).toBe("PASS");
    });
  });

  // ==========================================
  // STUDENT SEMESTER PROTECTION (12 - 13)
  // ==========================================
  describe("Student Semester Protection", () => {
    it("12. PASS does not modify Student.currentSemester", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college } =
        await setupEnv();

      expect(student.currentSemester).toBe(4);

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 25,
        externalMarks: 50,
        createdBy: adminUser._id,
      });

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const studentAfter = await Student.findById(student._id);
      expect(studentAfter.currentSemester).toBe(4);
    });

    it("13. FAIL does not modify Student.currentSemester", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 5,
        externalMarks: 10,
        createdBy: adminUser._id,
      });

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const studentAfter = await Student.findById(student._id);
      expect(studentAfter.currentSemester).toBe(4);
    });
  });

  // ==========================================
  // RESULT ISOLATION (14 - 16)
  // ==========================================
  describe("Result Isolation", () => {
    it("14. Backlog clearance does not modify regular SemesterResult", async () => {
      const { backlog, exam, sem4Subject, sem2Subject, student, adminUser, college } =
        await setupEnv();

      // Create existing regular Semester 4 result for student
      const regularResult = await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: exam._id,
        course_id: exam.course_id,
        semester: 4,
        academicYear: "2026-27",
        subjects: [
          {
            subject: sem4Subject._id,
            subjectName: sem4Subject.name,
            subjectCode: sem4Subject.code,
            subjectType: "THEORY",
            internalMarks: 20,
            externalMarks: 50,
            totalMarks: 70,
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
        status: "PUBLISHED",
        createdBy: adminUser._id,
      });

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 25,
        externalMarks: 50,
        createdBy: adminUser._id,
      });

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      // Verify regular result was not mutated
      const resultAfter = await SemesterResult.findById(regularResult._id);
      expect(resultAfter.subjects.length).toBe(1);
      expect(String(resultAfter.subjects[0].subject)).toBe(String(sem4Subject._id));
      expect(resultAfter.overallResult).toBe("PASS");
    });

    it("15. Backlog marks do not become regular subject marks", async () => {
      const { backlog, exam, sem4Subject, sem2Subject, student, adminUser, college } =
        await setupEnv();

      // Save marks for backlog subject CS201
      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 28,
        externalMarks: 60,
        createdBy: adminUser._id,
      });

      // Check StudentMarks for regular subject CS401
      const regularMarks = await StudentMarks.findOne({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem4Subject._id,
        student_id: student._id,
      });
      expect(regularMarks).toBeNull();
    });

    it("16. Regular result generation remains unchanged and ignores backlog subjects", async () => {
      const { exam, sem4Subject, regularStudent, adminUser, college } =
        await setupEnv();

      // Enter marks for regular student in regular subject only
      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem4Subject._id,
        student_id: regularStudent._id,
        internalMarks: 25,
        externalMarks: 60,
        createdBy: adminUser._id,
      });

      // Generate regular semester result for the regular student
      const result = await generateSemesterResult({
        collegeId: college._id,
        studentId: regularStudent._id,
        examId: exam._id,
        userId: adminUser._id,
      });

      // Regular result should ONLY contain regular Sem 4 subject
      expect(result.subjects.length).toBe(1);
      expect(String(result.subjects[0].subject)).toBe(String(sem4Subject._id));
      expect(result.overallResult).toBe("PASS");
      expect(result.incompleteSubjects).toBe(0);
    });
  });

  // ==========================================
  // SECURITY & VALIDATION (17 - 20)
  // ==========================================
  describe("Security & Tenant Isolation", () => {
    it("17. Cross-tenant backlog cannot be evaluated", async () => {
      const { backlog, exam, adminUser, college } = await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      const otherCollegeId = new mongoose.Types.ObjectId();

      await expect(
        evaluateAttempt({
          attemptId: attempt._id,
          collegeId: otherCollegeId,
          actorId: adminUser._id,
          actorRole: "COLLEGE_ADMIN",
        }),
      ).rejects.toMatchObject({ code: "BACKLOG_ATTEMPT_NOT_FOUND" });
    });

    it("18. Wrong student cannot clear another student's backlog", async () => {
      const { backlog, exam, sem2Subject, regularStudent, adminUser, college } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      // Enter marks for wrong student (regularStudent instead of backlog student)
      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: regularStudent._id,
        internalMarks: 30,
        externalMarks: 70,
        createdBy: adminUser._id,
      });

      // Evaluation for attempt (which is tied to backlog student) will find no marks for backlog student
      const evaluation = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      expect(evaluation.resultStatus).toBe("INCOMPLETE");
      expect(evaluation.backlogCleared).toBe(false);

      const unchangedBacklog = await Backlog.findById(backlog._id);
      expect(unchangedBacklog.status).toBe("ATTEMPTED");
    });

    it("19. Wrong subject cannot clear the backlog", async () => {
      const { backlog, exam, sem4Subject, student, adminUser, college } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      // Enter marks for the regular subject (CS401) instead of the backlog subject (CS201)
      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem4Subject._id,
        student_id: student._id,
        internalMarks: 30,
        externalMarks: 70,
        createdBy: adminUser._id,
      });

      const evaluation = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      expect(evaluation.resultStatus).toBe("INCOMPLETE");
      expect(evaluation.backlogCleared).toBe(false);
    });

    it("20. Invalid exam/backlog combination is rejected", async () => {
      const { backlog, adminUser, college } = await setupEnv();

      // Create an exam that does NOT contain the backlog's subject
      const irrelevantSubject = await createSubject({
        college_id: college._id,
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
        name: "Art History",
        code: "ART101",
        semester: 1,
        createdBy: adminUser._id,
      });

      const unrelatedExam = await Exam.create({
        college_id: college._id,
        name: "Unrelated Exam",
        course_id: new mongoose.Types.ObjectId(),
        semester: 1,
        academicYear: "2026-27",
        subjects: [{ subject: irrelevantSubject._id, category: "REGULAR", passMarks: 40, internalMaxMarks: 30, externalMaxMarks: 70 }],
        createdBy: adminUser._id,
      });

      await expect(
        createAttempt({
          backlogId: backlog._id,
          collegeId: college._id,
          actorId: adminUser._id,
          actorRole: "COLLEGE_ADMIN",
          examId: unrelatedExam._id,
        }),
      ).rejects.toMatchObject({ code: "SUBJECT_NOT_IN_EXAM" });
    });
  });

  // ==========================================
  // STATUS PROTECTION & IDEMPOTENCY (21 - 23)
  // ==========================================
  describe("Status Protection & Idempotency", () => {
    it("21. CLEARED backlog cannot be incorrectly re-cleared or re-attempted", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 25,
        externalMarks: 50,
        createdBy: adminUser._id,
      });

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      // Attempting to create a new attempt on CLEARED backlog must fail
      await expect(
        createAttempt({
          backlogId: backlog._id,
          collegeId: college._id,
          actorId: adminUser._id,
          actorRole: "COLLEGE_ADMIN",
          examId: exam._id,
        }),
      ).rejects.toMatchObject({ code: "BACKLOG_NOT_OPEN" });
    });

    it("22. CANCELLED backlog cannot be cleared through attempt flow", async () => {
      const { backlog, exam, adminUser, college } = await setupEnv();

      await Backlog.findByIdAndUpdate(backlog._id, { status: "CANCELLED" });

      await expect(
        createAttempt({
          backlogId: backlog._id,
          collegeId: college._id,
          actorId: adminUser._id,
          actorRole: "COLLEGE_ADMIN",
          examId: exam._id,
        }),
      ).rejects.toMatchObject({ code: "BACKLOG_NOT_OPEN" });
    });

    it("23. Duplicate evaluation does not create duplicate history/clearance", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college } =
        await setupEnv();

      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 25,
        externalMarks: 50,
        createdBy: adminUser._id,
      });

      const firstEval = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      const secondEval = await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      expect(firstEval.isIdempotent).toBe(false);
      expect(secondEval.isIdempotent).toBe(true);
      expect(secondEval.backlogCleared).toBe(true);

      const attemptsCount = await BacklogAttempt.countDocuments({
        backlog_id: backlog._id,
      });
      expect(attemptsCount).toBe(1);
    });
  });

  // ==========================================
  // FUTURE ELIGIBILITY (24 - 26)
  // ==========================================
  describe("Future Eligibility & Timetable Visibility", () => {
    it("24. CLEARED backlog does not appear in backlog marks roster", async () => {
      const { backlog, exam, sem2Subject, student, teacher, adminUser, college, teacherAgent } =
        await setupEnv();

      // Clear the backlog
      const { attempt } = await createAttempt({
        backlogId: backlog._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        examId: exam._id,
      });

      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: sem2Subject._id,
        student_id: student._id,
        internalMarks: 25,
        externalMarks: 50,
        createdBy: adminUser._id,
      });

      await evaluateAttempt({
        attemptId: attempt._id,
        collegeId: college._id,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
      });

      // In a subsequent exam for the same backlog subject
      const nextExam = await Exam.create({
        college_id: college._id,
        name: "Future Sem 5 Exam",
        course_id: exam.course_id,
        semester: 5,
        academicYear: "2027-28",
        subjects: [
          {
            subject: sem2Subject._id,
            category: "BACKLOG",
            originalSemester: 2,
            assignedFaculty: teacher.user_id,
          },
        ],
        createdBy: adminUser._id,
      });

      // Check roster via marks API
      const res = await teacherAgent
        .get(`/api/marks/roster?examId=${nextExam._id}&subjectId=${sem2Subject._id}`)
        .expect(200);

      const rosterStudentIds = res.body.data.roster.map((r) => String(r.studentId));
      expect(rosterStudentIds).not.toContain(String(student._id));
    });

    it("25. CLEARED backlog does not appear in future unified timetable visibility", async () => {
      const { backlog, exam, sem2Subject, student, adminUser, college } =
        await setupEnv();

      // Clear the backlog
      await Backlog.findByIdAndUpdate(backlog._id, { status: "CLEARED" });

      const schedule = {
        slots: [
          {
            subject: sem2Subject._id,
            examDate: new Date(),
            startTime: "09:00",
            endTime: "12:00",
          },
        ],
      };

      const filtered = await filterPublishedExamAndScheduleForStudent({
        exam,
        schedule,
        student,
        collegeId: college._id,
      });

      // Because backlog is CLEARED, the BACKLOG paper is excluded from timetable
      const visibleSubjectIds = (filtered.exam.subjects || []).map((s) =>
        String(s.subject?._id || s.subject),
      );
      expect(visibleSubjectIds).not.toContain(String(sem2Subject._id));
    });

    it("26. OPEN backlog remains eligible for future attempt and visible in timetable", async () => {
      const { backlog, exam, sem2Subject, student, college } = await setupEnv();

      expect(backlog.status).toBe("OPEN");

      const schedule = {
        slots: [
          {
            subject: sem2Subject._id,
            examDate: new Date(),
            startTime: "09:00",
            endTime: "12:00",
          },
        ],
      };

      const filtered = await filterPublishedExamAndScheduleForStudent({
        exam,
        schedule,
        student,
        collegeId: college._id,
      });

      const visibleSubjectIds = (filtered.exam.subjects || []).map((s) =>
        String(s.subject?._id || s.subject),
      );
      expect(visibleSubjectIds).toContain(String(sem2Subject._id));
    });
  });
});
