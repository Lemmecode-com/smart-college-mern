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
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const StudentFee = require("../../src/models/studentFee.model");
const {
  generateSemesterResult,
  publishResultsForExam,
  lockResultsForExam,
} = require("../../src/services/semesterResult.service");

describe("Backlog Attempt Result in Student Result and Promotion Synchronization", () => {
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
      code: `SYNC_${Date.now()}_${Math.random()}`,
      email: `sync.${Date.now()}_${Math.random()}@test.com`,
    });

    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Computer Science",
      code: "CS",
      type: "ACADEMIC",
      status: "ACTIVE",
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech CSE",
      code: `CSE-${Date.now()}`,
      durationSemesters: 8,
    });

    // Promotion policy with previous year clearance required
    await PromotionPolicy.create({
      collegeId: college._id,
      course_id: course._id,
      isActive: true,
      status: "ACTIVE",
      minAttendancePercentage: 0,
      maxAllowedKTs: 2,
      minimumFeePaidPercentage: 0,
      requirePreviousYearClearance: true,
      previousYearClearanceRequired: true,
      ktRules: [
        {
          fromSemester: 3,
          toSemester: 4,
          maxAllowedKTs: 2,
          requirePreviousYearClearance: true,
        },
      ],
      createdBy: new mongoose.Types.ObjectId(),
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

    // Semester 2 Backlog Subject
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

    // Semester 3 Regular Subject
    const regularSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Operating Systems",
      code: `OS-${Date.now()}`,
      semester: 3,
      credits: 4,
      subjectType: "THEORY",
      teacher_id: teacherProfile._id,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
    });

    const { agent: studentAgent, user: studentUser } = await createUserSession(
      "STUDENT",
      college._id,
    );

    const student = await createStudent({
      college_id: college._id,
      user_id: studentUser._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      email: studentUser.email,
    });

    await StudentFee.create({
      student_id: student._id,
      college_id: college._id,
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      totalFee: 1000,
      paidAmount: 1000,
      pendingAmount: 0,
      status: "FULLY_PAID",
      dueDate: new Date(Date.now() + 86400000),
      installments: [],
    });

    // Existing open backlog from semester 2 (previous academic year)
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

    // Unified Exam: includes Regular Subject and Backlog Subject
    const unifiedExam = await Exam.create({
      college_id: college._id,
      name: "Semester 3 Unified Regular & Backlog Exam",
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      exam_type: "REGULAR",
      subjects: [
        {
          subject: regularSubject._id,
          category: "REGULAR",
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
          internalPassMarks: 12,
          externalPassMarks: 28,
          passMarks: 40,
        },
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

    const { agent: coordinatorAgent, user: coordinatorUser } = await createUserSession(
      "EXAM_COORDINATOR",
      college._id,
    );

    return {
      college,
      department,
      course,
      student,
      studentUser,
      studentAgent,
      regularSubject,
      backlogSubject,
      backlog,
      unifiedExam,
      teacherAgent,
      adminAgent,
      adminUser,
      coordinatorAgent,
      coordinatorUser,
    };
  };

  it("evaluates backlog attempt upon exam publish and reflects CLEARED backlog in student results and promotion", async () => {
    const env = await setupEnvironment();

    // 1. Teacher enters passing marks for regular subject
    await env.teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: env.unifiedExam._id.toString(),
        subjectId: env.regularSubject._id.toString(),
        marks: [
          {
            studentId: env.student._id.toString(),
            internalMarks: 25,
            externalMarks: 60,
          },
        ],
      })
      .expect(200);

    // 2. Teacher enters passing marks for backlog subject
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

    // Verify BacklogAttempt created with INCOMPLETE status initially
    const attempts = await BacklogAttempt.find({ backlog_id: env.backlog._id });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].result_status).toBe("INCOMPLETE");

    // 3. Coordinator generates result for regular subject
    await generateSemesterResult({
      examId: env.unifiedExam._id,
      studentId: env.student._id,
      collegeId: env.college._id,
      userId: env.coordinatorUser._id,
    });

    // Lock then publish the exam results
    await lockResultsForExam({
      examId: env.unifiedExam._id,
      collegeId: env.college._id,
      userId: env.coordinatorUser._id,
    });

    await publishResultsForExam({
      examId: env.unifiedExam._id,
      collegeId: env.college._id,
      userId: env.coordinatorUser._id,
    });

    // Wait a brief moment for async auto-evaluation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. BacklogAttempt must now be evaluated to PASS and Backlog must be CLEARED
    const evaluatedAttempt = await BacklogAttempt.findById(attempts[0]._id);
    expect(evaluatedAttempt.result_status).toBe("PASS");
    expect(evaluatedAttempt.passed).toBe(true);
    expect(evaluatedAttempt.cleared).toBe(true);

    const updatedBacklog = await Backlog.findById(env.backlog._id);
    expect(updatedBacklog.status).toBe("CLEARED");
    expect(updatedBacklog.latest_result_status).toBe("PASS");

    // 5. Student fetches my-results
    const studentRes = await env.studentAgent
      .get("/api/results/my-results")
      .expect(200);

    expect(studentRes.body.success).toBe(true);
    // Data is an array for backwards compatibility
    expect(Array.isArray(studentRes.body.data)).toBe(true);
    expect(studentRes.body.data.length).toBeGreaterThanOrEqual(1);

    const sem3Result = studentRes.body.data.find((r) => r.semester === 3);
    expect(sem3Result).toBeDefined();
    // Regular result subjects are uncontaminated
    expect(sem3Result.subjects).toHaveLength(1);
    expect(String(sem3Result.subjects[0].subject)).toBe(String(env.regularSubject._id));
    expect(sem3Result.overallResult).toBe("PASS");

    // Backlog results are separately exposed on the result object
    expect(sem3Result.backlogResults).toBeDefined();
    expect(sem3Result.backlogResults).toHaveLength(1);

    const backlogEntry = sem3Result.backlogResults[0];
    expect(String(backlogEntry.backlogId)).toBe(String(env.backlog._id));
    expect(String(backlogEntry.attemptId)).toBe(String(evaluatedAttempt._id));
    expect(String(backlogEntry.subjectId)).toBe(String(env.backlogSubject._id));
    expect(backlogEntry.subjectName).toBe(env.backlogSubject.name);
    expect(backlogEntry.semester).toBe(2);
    expect(backlogEntry.attemptNumber).toBe(1);
    expect(backlogEntry.resultStatus).toBe("PASS");
    expect(backlogEntry.passed).toBe(true);
    expect(backlogEntry.cleared).toBe(true);
    expect(backlogEntry.totalMarks).toBe(80);

    // Top-level backlogResults field is also exposed
    expect(studentRes.body.backlogResults).toBeDefined();
    expect(studentRes.body.backlogResults).toHaveLength(1);

    // 6. Admin checks promotion eligibility
    const promoRes = await env.adminAgent
      .get(`/api/promotion/eligibility/${env.student._id}`)
      .expect(200);

    expect(promoRes.body.success).toBe(true);
    const decision = promoRes.body.data;
    // Because the backlog is CLEARED, previousYearClearancePassed is TRUE
    expect(decision.policy_snapshot.previousYearClearancePassed).toBe(true);
    expect(decision.promotion_outcome).toBe("PASS");
    expect(decision.decision_reason).not.toBe("PREVIOUS_YEAR_BACKLOG_NOT_CLEARED");
  });

  it("correctly blocks promotion and reflects FAIL status when backlog attempt fails", async () => {
    const env = await setupEnvironment();

    // Teacher enters failing marks for backlog subject (5 internal + 10 external = 15 total, fails)
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

    // Regular subject passes
    await env.teacherAgent
      .post("/api/marks/bulk")
      .send({
        examId: env.unifiedExam._id.toString(),
        subjectId: env.regularSubject._id.toString(),
        marks: [
          {
            studentId: env.student._id.toString(),
            internalMarks: 25,
            externalMarks: 60,
          },
        ],
      })
      .expect(200);

    // Generate, lock and publish exam
    await generateSemesterResult({
      examId: env.unifiedExam._id,
      studentId: env.student._id,
      collegeId: env.college._id,
      userId: env.coordinatorUser._id,
    });

    await lockResultsForExam({
      examId: env.unifiedExam._id,
      collegeId: env.college._id,
      userId: env.coordinatorUser._id,
    });

    await publishResultsForExam({
      examId: env.unifiedExam._id,
      collegeId: env.college._id,
      userId: env.coordinatorUser._id,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify evaluated attempt is FAIL and Backlog is OPEN
    const attempts = await BacklogAttempt.find({ backlog_id: env.backlog._id });
    expect(attempts[0].result_status).toBe("FAIL");
    expect(attempts[0].passed).toBe(false);

    const backlogAfterFail = await Backlog.findById(env.backlog._id);
    expect(backlogAfterFail.status).toBe("OPEN");
    expect(backlogAfterFail.latest_result_status).toBe("FAIL");

    // Student results show FAIL for backlog attempt
    const studentRes = await env.studentAgent
      .get("/api/results/my-results")
      .expect(200);

    const sem3Result = studentRes.body.data[0];
    expect(sem3Result.backlogResults[0].resultStatus).toBe("FAIL");
    expect(sem3Result.backlogResults[0].passed).toBe(false);

    // Admin checks promotion eligibility: promotion must be BLOCKED because backlog is not cleared
    const promoRes = await env.adminAgent
      .get(`/api/promotion/eligibility/${env.student._id}`)
      .expect(200);

    const decision = promoRes.body.data;
    expect(decision.policy_snapshot.previousYearClearancePassed).toBe(false);
    expect(decision.promotion_outcome).toBe("BLOCKED");
    expect(decision.decision_reason).toBe("PREVIOUS_YEAR_BACKLOG_NOT_CLEARED");
  });
});
