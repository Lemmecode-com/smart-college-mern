const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createTeacher,
  createDepartment,
  createCourse,
  createSubject,
  createStudent,
} = require("../helpers/factories");
const app = require("../../app");
const Backlog = require("../../src/models/backlog.model");
const BacklogAttempt = require("../../src/models/backlogAttempt.model");
const Exam = require("../../src/models/exam.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const Teacher = require("../../src/models/teacher.model");
const { evaluateAttempt } = require("../../src/services/backlogAttempt.service");

describe("Automatic BacklogAttempt Creation & Linking in Unified Exam Flow", () => {
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

  const setupEnvironment = async () => {
    const college = await createCollege({
      code: `UNIFIED_${Date.now()}_${Math.random()}`,
      email: `unified.${Date.now()}_${Math.random()}@test.com`,
    });

    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Computer Science",
      code: "CS",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech CSE",
      code: `CSE-${Date.now()}`,
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 160,
      maxStudents: 60,
    });

    const { agent: teacherAgent, user: teacherUser } = await createUserSession(
      "TEACHER",
      college._id,
    );

    const teacherProfile = await createTeacher({
      user_id: teacherUser._id,
      college_id: college._id,
      department_id: department._id,
      designation: "Assistant Professor",
      status: "ACTIVE",
      createdBy: new mongoose.Types.ObjectId(),
    });

    const backlogSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Data Structures",
      code: `DS-${Date.now()}`,
      semester: 2,
      credits: 4,
      subjectType: "THEORY",
      teacher_id: teacherProfile._id,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      email: `student.${Date.now()}_${Math.random()}@test.com`,
    });

    const originalExamId = new mongoose.Types.ObjectId();
    const originalResult = await SemesterResult.create({
      college_id: college._id,
      student_id: student._id,
      exam_id: originalExamId,
      course_id: course._id,
      semester: 2,
      academicYear: "2025-26",
      subjects: [
        {
          subject: backlogSubject._id,
          subjectName: backlogSubject.name,
          subjectCode: backlogSubject.code,
          subjectType: "THEORY",
          internalMarks: 8,
          externalMarks: 18,
          totalMarks: 26,
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
      student_id: student._id,
      college_id: college._id,
      course_id: course._id,
      semester: 2,
      academicYear: "2025-26",
      original_exam_id: originalExamId,
      original_result_id: originalResult._id,
      subject_id: backlogSubject._id,
      subject_code: backlogSubject.code,
      subject_name: backlogSubject.name,
      subject_type: "THEORY",
      original_marks_snapshot: {
        internalMarks: 8,
        externalMarks: 18,
        totalMarks: 26,
        status: "FAIL",
      },
      status: "OPEN",
      attempt_count: 0,
    });

    const unifiedExam = await Exam.create({
      college_id: college._id,
      name: "Semester 3 Unified Regular & Backlog Exam",
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      exam_type: "REGULAR",
      subjects: [
        {
          subject: backlogSubject._id,
          category: "BACKLOG",
          originalSemester: 2,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
          internalPassMarks: 12,
          externalPassMarks: 28,
          passMarks: 40,
        },
      ],
      status: "PUBLISHED",
      createdBy: new mongoose.Types.ObjectId(),
    });

    const { agent: adminAgent, user: adminUser } = await createUserSession(
      "COLLEGE_ADMIN",
      college._id,
    );

    return {
      college,
      department,
      course,
      student,
      backlogSubject,
      backlog,
      unifiedExam,
      teacherAgent,
      teacherUser,
      adminAgent,
      adminUser,
    };
  };

  it("automatically creates a BacklogAttempt linked to Unified Exam when teacher enters marks", async () => {
    const env = await setupEnvironment();

    // Verify initial backlog state
    expect(env.backlog.status).toBe("OPEN");
    expect(env.backlog.attempt_count).toBe(0);

    // Initial attempt count in DB should be 0
    const initialAttempts = await BacklogAttempt.find({ backlog_id: env.backlog._id });
    expect(initialAttempts).toHaveLength(0);

    // Teacher enters passing marks for the backlog student in the Unified Exam
    const marksRes = await env.teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: env.unifiedExam._id.toString(),
        subjectId: env.backlogSubject._id.toString(),
        marks: [
          {
            studentId: env.student._id.toString(),
            internalMarks: 25,
            externalMarks: 55,
          },
        ],
      })
      .expect(200);

    expect(marksRes.body.success).toBe(true);

    // 1. Verify StudentMarks stored against Unified Exam ID
    const studentMarks = await StudentMarks.findOne({
      college_id: env.college._id,
      exam_id: env.unifiedExam._id,
      subject_id: env.backlogSubject._id,
      student_id: env.student._id,
    });
    expect(studentMarks).toBeDefined();
    expect(studentMarks.internalMarks).toBe(25);
    expect(studentMarks.externalMarks).toBe(55);

    // 2. Verify BacklogAttempt was automatically created
    const attempts = await BacklogAttempt.find({ backlog_id: env.backlog._id });
    expect(attempts).toHaveLength(1);

    const attempt = attempts[0];
    expect(attempt.attempt_number).toBe(1);
    expect(String(attempt.exam_id)).toBe(String(env.unifiedExam._id));
    expect(attempt.exam_name).toBe(env.unifiedExam.name);
    expect(attempt.exam_type).toBe("REGULAR");
    expect(String(attempt.student_id)).toBe(String(env.student._id));
    expect(String(attempt.subject_id)).toBe(String(env.backlogSubject._id));
    expect(attempt.internal_marks).toBe(25);
    expect(attempt.external_marks).toBe(55);
    expect(attempt.total_marks).toBe(80);
    expect(attempt.result_status).toBe("INCOMPLETE");

    // 3. Verify Backlog document was updated to ATTEMPTED
    const updatedBacklog = await Backlog.findById(env.backlog._id);
    expect(updatedBacklog.status).toBe("ATTEMPTED");
    expect(updatedBacklog.attempt_count).toBe(1);
    expect(String(updatedBacklog.latest_attempt_id)).toBe(String(attempt._id));
    expect(updatedBacklog.latest_result_status).toBe("INCOMPLETE");
  });

  it("is idempotent and updates marks on existing attempt without creating duplicates", async () => {
    const env = await setupEnvironment();

    // First marks save
    await env.teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: env.unifiedExam._id.toString(),
        subjectId: env.backlogSubject._id.toString(),
        marks: [
          {
            studentId: env.student._id.toString(),
            internalMarks: 20,
            externalMarks: 50,
          },
        ],
      })
      .expect(200);

    const firstAttempts = await BacklogAttempt.find({ backlog_id: env.backlog._id });
    expect(firstAttempts).toHaveLength(1);
    expect(firstAttempts[0].total_marks).toBe(70);

    // Second marks save (updating marks)
    await env.teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: env.unifiedExam._id.toString(),
        subjectId: env.backlogSubject._id.toString(),
        marks: [
          {
            studentId: env.student._id.toString(),
            internalMarks: 24,
            externalMarks: 56,
          },
        ],
      })
      .expect(200);

    // Still exactly 1 attempt document (no duplicates)
    const secondAttempts = await BacklogAttempt.find({ backlog_id: env.backlog._id });
    expect(secondAttempts).toHaveLength(1);
    expect(secondAttempts[0].attempt_number).toBe(1);
    expect(secondAttempts[0].internal_marks).toBe(24);
    expect(secondAttempts[0].external_marks).toBe(56);
    expect(secondAttempts[0].total_marks).toBe(80);

    const updatedBacklog = await Backlog.findById(env.backlog._id);
    expect(updatedBacklog.attempt_count).toBe(1);
  });

  it("allows evaluation of the automatically created attempt to clear backlog", async () => {
    const env = await setupEnvironment();

    // Teacher enters passing marks
    await env.teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: env.unifiedExam._id.toString(),
        subjectId: env.backlogSubject._id.toString(),
        marks: [
          {
            studentId: env.student._id.toString(),
            internalMarks: 25,
            externalMarks: 55,
          },
        ],
      })
      .expect(200);

    const attempts = await BacklogAttempt.find({ backlog_id: env.backlog._id });
    const attempt = attempts[0];

    // Admin evaluates the attempt via API
    const evalRes = await env.adminAgent
      .post(`/api/promotion/backlogs/${env.backlog._id}/attempts/${attempt._id}/evaluate`)
      .send({})
      .expect(200);

    expect(evalRes.body.success).toBe(true);
    expect(evalRes.body.data.resultStatus).toBe("PASS");
    expect(evalRes.body.data.backlogCleared).toBe(true);

    // Verify DB state
    const clearedBacklog = await Backlog.findById(env.backlog._id);
    expect(clearedBacklog.status).toBe("CLEARED");
    expect(clearedBacklog.latest_result_status).toBe("PASS");
    expect(clearedBacklog.cleared_at).toBeDefined();
    expect(String(clearedBacklog.cleared_by)).toBe(String(env.adminUser._id));

    const evaluatedAttempt = await BacklogAttempt.findById(attempt._id);
    expect(evaluatedAttempt.result_status).toBe("PASS");
    expect(evaluatedAttempt.passed).toBe(true);
    expect(evaluatedAttempt.cleared).toBe(true);
  });

  it("increments attempt number sequentially if previous attempt failed", async () => {
    const env = await setupEnvironment();

    // 1. Teacher enters FAILING marks for Attempt 1
    await env.teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: env.unifiedExam._id.toString(),
        subjectId: env.backlogSubject._id.toString(),
        marks: [
          {
            studentId: env.student._id.toString(),
            internalMarks: 5,
            externalMarks: 10,
          },
        ],
      })
      .expect(200);

    const attemptsAfterExam1 = await BacklogAttempt.find({ backlog_id: env.backlog._id });
    expect(attemptsAfterExam1).toHaveLength(1);
    expect(attemptsAfterExam1[0].attempt_number).toBe(1);

    // Evaluate Attempt 1 -> FAIL
    await env.adminAgent
      .post(`/api/promotion/backlogs/${env.backlog._id}/attempts/${attemptsAfterExam1[0]._id}/evaluate`)
      .send({})
      .expect(200);

    // Backlog reverts to OPEN
    const backlogAfterFail = await Backlog.findById(env.backlog._id);
    expect(backlogAfterFail.status).toBe("OPEN");
    expect(backlogAfterFail.attempt_count).toBe(1);

    // 2. Student sits for a subsequent exam (Semester 4 exam)
    const subsequentExam = await Exam.create({
      college_id: env.college._id,
      name: "Semester 4 Unified Regular & Backlog Exam",
      course_id: env.course._id,
      semester: 4,
      academicYear: "2027-28",
      exam_type: "REGULAR",
      subjects: [
        {
          subject: env.backlogSubject._id,
          category: "BACKLOG",
          originalSemester: 2,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
          internalPassMarks: 12,
          externalPassMarks: 28,
          passMarks: 40,
        },
      ],
      status: "PUBLISHED",
      createdBy: new mongoose.Types.ObjectId(),
    });

    // Teacher enters passing marks in subsequent exam
    await env.teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: subsequentExam._id.toString(),
        subjectId: env.backlogSubject._id.toString(),
        marks: [
          {
            studentId: env.student._id.toString(),
            internalMarks: 25,
            externalMarks: 55,
          },
        ],
      })
      .expect(200);

    // 3. Verify that Attempt 2 was created sequentially!
    const allAttempts = await BacklogAttempt.find({ backlog_id: env.backlog._id }).sort({ attempt_number: 1 });
    expect(allAttempts).toHaveLength(2);
    expect(allAttempts[0].attempt_number).toBe(1);
    expect(String(allAttempts[0].exam_id)).toBe(String(env.unifiedExam._id));
    expect(allAttempts[0].result_status).toBe("FAIL");

    expect(allAttempts[1].attempt_number).toBe(2);
    expect(String(allAttempts[1].exam_id)).toBe(String(subsequentExam._id));
    expect(allAttempts[1].result_status).toBe("INCOMPLETE");

    const backlogAfterExam2 = await Backlog.findById(env.backlog._id);
    expect(backlogAfterExam2.status).toBe("ATTEMPTED");
    expect(backlogAfterExam2.attempt_count).toBe(2);
  });
});
