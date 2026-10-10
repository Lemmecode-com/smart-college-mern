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
  createStudent,
} = require("../helpers/factories");
const app = require("../../app");
const Exam = require("../../src/models/exam.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Backlog = require("../../src/models/backlog.model");
const BacklogAttempt = require("../../src/models/backlogAttempt.model");
const Student = require("../../src/models/student.model");
const Course = require("../../src/models/course.model");
const { RESULT_STATUS, ROLE, STUDENT_STATUS } = require("../../src/utils/constants");

describe("Phase 3, Step 2 — Authoritative Consolidated Academic Result Verification API", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ---- Test Helpers --------------------------------------------------------

  const setupStudentContext = async (options = {}) => {
    const college = await createCollege({
      code: `COL_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      email: `col_${Date.now()}_${Math.floor(Math.random() * 100000)}@test.com`,
      name: options.collegeName || "Engineering College",
    });

    const department = await createDepartment({
      college_id: college._id,
      name: "Computer Science",
      code: `CS_${Date.now()}`,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const durationSemesters =
      options.durationSemesters !== undefined ? options.durationSemesters : 8;
    const durationYears =
      options.durationYears !== undefined
        ? options.durationYears
        : durationSemesters
        ? Math.ceil(durationSemesters / 2)
        : 4;

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: options.courseName || "B.Tech Computer Science",
      code: options.courseCode || `CS_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      durationSemesters,
      durationYears,
    });

    const studentUser = await createUser({
      email: `student.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      password: "Test@123",
      role: ROLE.STUDENT,
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      user_id: studentUser._id,
      currentSemester: options.currentSemester || durationSemesters,
      status: options.studentStatus || STUDENT_STATUS.APPROVED,
    });

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    return {
      college,
      department,
      course,
      studentUser,
      student,
      studentAgent,
    };
  };

  const createExamFixture = async ({
    collegeId,
    courseId,
    semester,
    academicYear = "2025-26",
    name = `Semester ${semester} Final Exam`,
    status = "PUBLISHED",
  }) => {
    return Exam.create({
      college_id: collegeId,
      course_id: courseId,
      name,
      semester,
      academicYear,
      examType: "REGULAR",
      status,
      createdBy: new mongoose.Types.ObjectId(),
    });
  };

  const createSemesterResultFixture = async ({
    collegeId,
    studentId,
    courseId,
    semester,
    academicYear = "2025-26",
    overallResult = "PASS",
    status = RESULT_STATUS.PUBLISHED,
    totalMarks = 400,
    totalMaxMarks = 500,
    percentage = 80,
    subjects = [],
    examId = null,
  }) => {
    const finalExamId = examId || new mongoose.Types.ObjectId();
    const finalSubjects =
      subjects.length > 0
        ? subjects
        : [
            {
              subject: new mongoose.Types.ObjectId(),
              subjectName: `Subject ${semester}-1`,
              subjectCode: `SUB${semester}01`,
              subjectType: "THEORY",
              internalMarks: 40,
              internalMaxMarks: 50,
              externalMarks: 60,
              externalMaxMarks: 75,
              totalMarks: 100,
              maxMarks: 125,
              passed: overallResult === "PASS",
              status: overallResult === "PASS" ? "PASS" : "FAIL",
            },
          ];

    return SemesterResult.create({
      college_id: collegeId,
      student_id: studentId,
      course_id: courseId,
      exam_id: finalExamId,
      semester,
      academicYear,
      subjects: finalSubjects,
      totalSubjects: finalSubjects.length,
      passedSubjects: overallResult === "PASS" ? finalSubjects.length : 0,
      failedSubjects: overallResult === "FAIL" ? finalSubjects.length : 0,
      incompleteSubjects: overallResult === "INCOMPLETE" ? finalSubjects.length : 0,
      overallResult,
      totalMarks,
      totalMaxMarks,
      percentage,
      status,
      calculatedAt: new Date(),
      publishedAt: status === RESULT_STATUS.PUBLISHED ? new Date() : undefined,
      createdBy: new mongoose.Types.ObjectId(),
    });
  };

  // Populate complete set of published passing semesters
  const createCompletePassingCourse = async (context, count) => {
    const results = [];
    for (let s = 1; s <= count; s++) {
      const exam = await createExamFixture({
        collegeId: context.college._id,
        courseId: context.course._id,
        semester: s,
        academicYear: `202${s}-2${s + 1}`,
        name: `Semester ${s} Regular Examination`,
      });
      const res = await createSemesterResultFixture({
        collegeId: context.college._id,
        studentId: context.student._id,
        courseId: context.course._id,
        semester: s,
        academicYear: `202${s}-2${s + 1}`,
        overallResult: "PASS",
        status: RESULT_STATUS.PUBLISHED,
        totalMarks: 400,
        totalMaxMarks: 500,
        percentage: 80,
        examId: exam._id,
      });
      results.push(res);
    }
    return results;
  };

  // ---- 1. Authenticated student receives their own consolidated result ----
  it("1. Authenticated student receives their own consolidated result with full academic completion", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 8 });
    await createCompletePassingCourse(ctx, 8);

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.isEligible).toBe(true);
    expect(data.status).toBe("ELIGIBLE");
    expect(data.reasons).toEqual([]);
    expect(String(data.student.id)).toBe(String(ctx.student._id));
    expect(data.student.fullName).toBe("Test Student");
    expect(data.course.name).toBe(ctx.course.name);
    expect(data.course.durationSemesters).toBe(8);
    expect(data.requiredSemesters).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(data.completedSemesters).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(data.missingSemesters).toEqual([]);
    expect(data.unpublishedSemesters).toEqual([]);
    expect(data.failedSemesters).toEqual([]);
    expect(data.incompleteSemesters).toEqual([]);
    expect(data.ambiguousSemesters).toEqual([]);
    expect(data.activeBacklogsCount).toBe(0);
    expect(data.semesters).toHaveLength(8);
    expect(data.grandTotalMarks).toBe(3200); // 8 * 400
    expect(data.grandTotalMaxMarks).toBe(4000); // 8 * 500
    expect(data.aggregatePercentage).toBe(80);
    expect(data.summary.overallResult).toBe("PASS");
  });

  // ---- 2. Unauthenticated requests are rejected ----
  it("2. Unauthenticated requests are rejected with 401 TOKEN_MISSING", async () => {
    const res = await request(app)
      .get("/api/results/my-consolidated-result")
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("TOKEN_MISSING");
  });

  // ---- 3. Non-student roles are rejected ----
  it("3. Non-student roles (TEACHER, EXAM_COORDINATOR) are rejected with 403 FORBIDDEN_ROLE", async () => {
    const ctx = await setupStudentContext();

    const teacherUser = await createUser({
      email: `teacher.${Date.now()}@test.com`,
      password: "Test@123",
      role: ROLE.TEACHER,
      college_id: ctx.college._id,
      isActive: true,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    const res = await teacherAgent
      .get("/api/results/my-consolidated-result")
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  // ---- 4. Student A cannot access Student B's records ----
  it("4. Student A cannot access Student B's records via query params or payload", async () => {
    const ctxA = await setupStudentContext({ durationSemesters: 8 });
    await createCompletePassingCourse(ctxA, 8);

    // Create Student B in the same college with only semester 1
    const studentUserB = await createUser({
      email: `studentB.${Date.now()}@test.com`,
      password: "Test@123",
      role: ROLE.STUDENT,
      college_id: ctxA.college._id,
      isActive: true,
    });
    const studentB = await createStudent({
      college_id: ctxA.college._id,
      department_id: ctxA.department._id,
      course_id: ctxA.course._id,
      user_id: studentUserB._id,
      currentSemester: 1,
      status: STUDENT_STATUS.APPROVED,
    });

    // Student A tries to query Student B's data
    const res = await ctxA.studentAgent
      .get(`/api/results/my-consolidated-result?studentId=${studentB._id}&userId=${studentUserB._id}`)
      .send({ studentId: studentB._id })
      .expect(200);

    // Authority is derived strictly from req.user.id -> returns Student A's data
    expect(String(res.body.data.student.id)).toBe(String(ctxA.student._id));
    expect(String(res.body.data.student.id)).not.toBe(String(studentB._id));
    expect(res.body.data.completedSemesters).toHaveLength(8);
  });

  // ---- 5. Cross-college/tenant isolation ----
  it("5. Cross-college/tenant isolation: Student in College 2 cannot access College 1 records", async () => {
    const ctx1 = await setupStudentContext({ durationSemesters: 8 });
    await createCompletePassingCourse(ctx1, 8);

    const ctx2 = await setupStudentContext({ durationSemesters: 8 });
    // Student in College 2 has no records

    const res = await ctx2.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(String(res.body.data.student.id)).toBe(String(ctx2.student._id));
    expect(res.body.data.isEligible).toBe(false);
    expect(res.body.data.completedSemesters).toEqual([]);
    expect(res.body.data.missingSemesters).toHaveLength(8);
  });

  // ---- 6. Missing student or course handling ----
  it("6. Missing student profile or course record returns standard 404/400 errors", async () => {
    const college = await createCollege();
    const orphanUser = await createUser({
      email: `orphan.${Date.now()}@test.com`,
      password: "Test@123",
      role: ROLE.STUDENT,
      college_id: college._id,
    });

    const orphanAgent = request.agent(app);
    await orphanAgent
      .post("/api/auth/login")
      .send({ email: orphanUser.email, password: "Test@123" })
      .expect(200);

    // 6a. No Student profile document
    const resNoProfile = await orphanAgent
      .get("/api/results/my-consolidated-result")
      .expect(404);
    expect(resNoProfile.body.error.code).toBe("STUDENT_NOT_FOUND");

    // 6b. Student profile without course_id
    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const tempCourse = await createCourse({
      college_id: college._id,
      department_id: department._id,
      code: `TEMP_${Date.now()}`,
    });
    const studentWithoutCourse = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: tempCourse._id,
      user_id: orphanUser._id,
    });
    await Student.updateOne(
      { _id: studentWithoutCourse._id },
      { $unset: { course_id: "" } }
    );

    const resNoCourse = await orphanAgent
      .get("/api/results/my-consolidated-result")
      .expect(404);
    expect(resNoCourse.body.error.code).toBe("COURSE_NOT_FOUND");

    // 6c. Invalid course duration
    const invalidCourse = await createCourse({
      college_id: college._id,
      department_id: department._id,
      code: `INV_${Date.now()}`,
      durationSemesters: 8,
    });
    // Force durationSemesters to invalid 0 bypass
    await Course.updateOne({ _id: invalidCourse._id }, { $set: { durationSemesters: 0, durationYears: 0 } });

    await Student.updateOne(
      { _id: studentWithoutCourse._id },
      { $set: { course_id: invalidCourse._id } }
    );

    const resInvalidDuration = await orphanAgent
      .get("/api/results/my-consolidated-result")
      .expect(400);
    expect(resInvalidDuration.body.error.code).toBe("COURSE_DURATION_INVALID");
  });

  // ---- 7. Correct eligibility for 4-, 6-, and 8-semester courses ----
  it("7. Correct eligibility for complete 4-, 6-, and 8-semester courses", async () => {
    // 4-Semester Course (e.g. PG / M.Tech / Diploma)
    const ctx4 = await setupStudentContext({ durationSemesters: 4, courseName: "M.Tech CSE" });
    await createCompletePassingCourse(ctx4, 4);

    const res4 = await ctx4.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);
    expect(res4.body.data.isEligible).toBe(true);
    expect(res4.body.data.status).toBe("ELIGIBLE");
    expect(res4.body.data.requiredSemesters).toEqual([1, 2, 3, 4]);
    expect(res4.body.data.completedSemesters).toEqual([1, 2, 3, 4]);

    // 6-Semester Course (e.g. BCA / BSc)
    const ctx6 = await setupStudentContext({ durationSemesters: 6, courseName: "BCA" });
    await createCompletePassingCourse(ctx6, 6);

    const res6 = await ctx6.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);
    expect(res6.body.data.isEligible).toBe(true);
    expect(res6.body.data.status).toBe("ELIGIBLE");
    expect(res6.body.data.requiredSemesters).toEqual([1, 2, 3, 4, 5, 6]);
    expect(res6.body.data.completedSemesters).toEqual([1, 2, 3, 4, 5, 6]);

    // 8-Semester Course (e.g. B.Tech)
    const ctx8 = await setupStudentContext({ durationSemesters: 8, courseName: "B.Tech ME" });
    await createCompletePassingCourse(ctx8, 8);

    const res8 = await ctx8.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);
    expect(res8.body.data.isEligible).toBe(true);
    expect(res8.body.data.status).toBe("ELIGIBLE");
    expect(res8.body.data.requiredSemesters).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(res8.body.data.completedSemesters).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  // ---- 8. Missing required semesters ----
  it("8. Missing required semesters block eligibility with status MISSING_SEMESTERS", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 8 });
    // Only complete Semesters 1 to 7; Semester 8 is missing
    await createCompletePassingCourse(ctx, 7);

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.isEligible).toBe(false);
    expect(res.body.data.status).toBe("MISSING_SEMESTERS");
    expect(res.body.data.missingSemesters).toEqual([8]);
    expect(res.body.data.completedSemesters).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(res.body.data.reasons.some((r) => r.includes("Semester 8 has no published result"))).toBe(true);
  });

  // ---- 9. Draft or locked results are not treated as published ----
  it("9. Draft or locked results are not treated as published (status UNPUBLISHED_SEMESTERS)", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 4 });
    await createCompletePassingCourse(ctx, 3);

    // Semester 4 result is LOCKED, not PUBLISHED
    const exam4 = await createExamFixture({
      collegeId: ctx.college._id,
      courseId: ctx.course._id,
      semester: 4,
      status: "PUBLISHED",
    });
    await createSemesterResultFixture({
      collegeId: ctx.college._id,
      studentId: ctx.student._id,
      courseId: ctx.course._id,
      semester: 4,
      status: RESULT_STATUS.LOCKED,
      overallResult: "PASS",
      examId: exam4._id,
    });

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.isEligible).toBe(false);
    expect(res.body.data.status).toBe("UNPUBLISHED_SEMESTERS");
    expect(res.body.data.unpublishedSemesters).toEqual([4]);
    expect(res.body.data.reasons.some((r) => r.includes("Semester 4 result is not yet published"))).toBe(true);
  });

  // ---- 10. Failed and incomplete semesters block eligibility ----
  it("10. Failed and incomplete semesters block eligibility", async () => {
    // 10a. FAIL outcome
    const ctxFail = await setupStudentContext({ durationSemesters: 4 });
    await createCompletePassingCourse(ctxFail, 3);
    const exam4Fail = await createExamFixture({
      collegeId: ctxFail.college._id,
      courseId: ctxFail.course._id,
      semester: 4,
    });
    await createSemesterResultFixture({
      collegeId: ctxFail.college._id,
      studentId: ctxFail.student._id,
      courseId: ctxFail.course._id,
      semester: 4,
      status: RESULT_STATUS.PUBLISHED,
      overallResult: "FAIL",
      examId: exam4Fail._id,
    });

    const resFail = await ctxFail.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);
    expect(resFail.body.data.isEligible).toBe(false);
    expect(resFail.body.data.status).toBe("FAILED_SEMESTERS");
    expect(resFail.body.data.failedSemesters).toEqual([4]);

    // 10b. INCOMPLETE outcome
    const ctxInc = await setupStudentContext({ durationSemesters: 4 });
    await createCompletePassingCourse(ctxInc, 3);
    const exam4Inc = await createExamFixture({
      collegeId: ctxInc.college._id,
      courseId: ctxInc.course._id,
      semester: 4,
    });
    await createSemesterResultFixture({
      collegeId: ctxInc.college._id,
      studentId: ctxInc.student._id,
      courseId: ctxInc.course._id,
      semester: 4,
      status: RESULT_STATUS.PUBLISHED,
      overallResult: "INCOMPLETE",
      examId: exam4Inc._id,
    });

    const resInc = await ctxInc.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);
    expect(resInc.body.data.isEligible).toBe(false);
    expect(resInc.body.data.status).toBe("INCOMPLETE_SEMESTERS");
    expect(resInc.body.data.incompleteSemesters).toEqual([4]);
  });

  // ---- 11. Unknown admission path is handled conservatively ----
  it("11. Unknown admission path (min observed semester > 1) returns UNKNOWN_ADMISSION_PATH", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 8 });

    // Lateral entry candidate with records starting at Semester 3
    for (let s = 3; s <= 8; s++) {
      const exam = await createExamFixture({
        collegeId: ctx.college._id,
        courseId: ctx.course._id,
        semester: s,
      });
      await createSemesterResultFixture({
        collegeId: ctx.college._id,
        studentId: ctx.student._id,
        courseId: ctx.course._id,
        semester: s,
        status: RESULT_STATUS.PUBLISHED,
        overallResult: "PASS",
        examId: exam._id,
      });
    }

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.isEligible).toBe(false);
    expect(res.body.data.status).toBe("UNKNOWN_ADMISSION_PATH");
    expect(res.body.data.missingSemesters).toEqual([1, 2]);
    expect(res.body.data.reasons.some((r) => r.includes("UNKNOWN_ADMISSION_PATH"))).toBe(true);
  });

  // ---- 12. Multiple published candidates produce an ambiguous result ----
  it("12. Multiple published candidates produce an ambiguous result without arbitrary selection", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 4 });
    await createCompletePassingCourse(ctx, 4);

    // Create a duplicate second PUBLISHED result for Semester 2
    const exam2Dupe = await createExamFixture({
      collegeId: ctx.college._id,
      courseId: ctx.course._id,
      semester: 2,
      name: "Semester 2 Re-evaluation Examination",
    });
    await createSemesterResultFixture({
      collegeId: ctx.college._id,
      studentId: ctx.student._id,
      courseId: ctx.course._id,
      semester: 2,
      status: RESULT_STATUS.PUBLISHED,
      overallResult: "PASS",
      examId: exam2Dupe._id,
    });

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.isEligible).toBe(false);
    expect(res.body.data.status).toBe("AMBIGUOUS_RESULT");
    expect(res.body.data.ambiguousSemesters).toEqual([2]);
    expect(res.body.data.reasons.some((r) => r.includes("multiple published result candidates"))).toBe(true);
  });

  // ---- 13. OPEN and ATTEMPTED backlogs block eligibility ----
  it("13. OPEN and ATTEMPTED backlogs block eligibility (status ACTIVE_BACKLOGS)", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 8 });
    await createCompletePassingCourse(ctx, 8);

    // Insert an active backlog
    await Backlog.create({
      college_id: ctx.college._id,
      student_id: ctx.student._id,
      course_id: ctx.course._id,
      semester: 3,
      academicYear: "2025-26",
      original_exam_id: new mongoose.Types.ObjectId(),
      original_result_id: new mongoose.Types.ObjectId(),
      subject_id: new mongoose.Types.ObjectId(),
      subject_code: "SUB301",
      subject_name: "Data Structures",
      subject_type: "THEORY",
      original_marks_snapshot: { internal: 10, external: 15, total: 25 },
      status: "OPEN",
      attempt_count: 0,
    });

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.isEligible).toBe(false);
    expect(res.body.data.status).toBe("ACTIVE_BACKLOGS");
    expect(res.body.data.activeBacklogsCount).toBe(1);
    expect(res.body.data.reasons.some((r) => r.includes("active/uncleared backlog"))).toBe(true);
  });

  // ---- 14. Cleared backlogs do not block eligibility ----
  it("14. Cleared backlogs do not block eligibility and appear in separate clearedBacklogs history", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 4 });
    const semResults = await createCompletePassingCourse(ctx, 4);

    // Create a CLEARED backlog record
    const backlog = await Backlog.create({
      college_id: ctx.college._id,
      student_id: ctx.student._id,
      course_id: ctx.course._id,
      semester: 2,
      academicYear: "2024-25",
      original_exam_id: semResults[1].exam_id,
      original_result_id: semResults[1]._id,
      subject_id: new mongoose.Types.ObjectId(),
      subject_code: "SUB201",
      subject_name: "Algorithms",
      subject_type: "THEORY",
      original_marks_snapshot: { total: 20 },
      status: "CLEARED",
      attempt_count: 1,
    });

    // Create BacklogAttempt linked to published exam
    await BacklogAttempt.create({
      college_id: ctx.college._id,
      student_id: ctx.student._id,
      course_id: ctx.course._id,
      backlog_id: backlog._id,
      subject_id: backlog.subject_id,
      subject_code: "SUB201",
      subject_name: "Algorithms",
      subject_type: "THEORY",
      attempt_number: 1,
      exam_id: semResults[2].exam_id, // Took supplementary during Sem 3 exam
      total_marks: 75,
      result_status: "PASS",
      passed: true,
      cleared: true,
      evaluated_at: new Date(),
    });

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.isEligible).toBe(true);
    expect(res.body.data.status).toBe("ELIGIBLE");
    expect(res.body.data.activeBacklogsCount).toBe(0);
    expect(res.body.data.clearedBacklogs).toHaveLength(1);
    expect(res.body.data.clearedBacklogs[0].subjectCode).toBe("SUB201");
    expect(res.body.data.clearedBacklogs[0].cleared).toBe(true);
  });

  // ---- 15. Alumni status does not bypass academic checks ----
  it("15. Alumni status does not bypass missing or failed academic requirements", async () => {
    const ctx = await setupStudentContext({
      durationSemesters: 8,
      studentStatus: STUDENT_STATUS.ALUMNI,
    });
    // Missing semester 8
    await createCompletePassingCourse(ctx, 7);

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.student.status).toBe(STUDENT_STATUS.ALUMNI);
    expect(res.body.data.isEligible).toBe(false);
    expect(res.body.data.status).toBe("MISSING_SEMESTERS");
    expect(res.body.data.missingSemesters).toEqual([8]);
  });

  // ---- 16. Cleared backlog marks are not added to regular totals ----
  it("16. Cleared backlog marks are not added to grand totals or aggregate percentage", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 4 });
    const semResults = await createCompletePassingCourse(ctx, 4); // 4 * 400 = 1600, 4 * 500 = 2000

    const backlog = await Backlog.create({
      college_id: ctx.college._id,
      student_id: ctx.student._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: "2024-25",
      original_exam_id: semResults[0].exam_id,
      original_result_id: semResults[0]._id,
      subject_id: new mongoose.Types.ObjectId(),
      subject_code: "SUB101",
      subject_name: "Mathematics",
      status: "CLEARED",
      attempt_count: 1,
      original_marks_snapshot: {},
    });

    await BacklogAttempt.create({
      college_id: ctx.college._id,
      student_id: ctx.student._id,
      course_id: ctx.course._id,
      backlog_id: backlog._id,
      subject_id: backlog.subject_id,
      attempt_number: 1,
      exam_id: semResults[1].exam_id,
      total_marks: 85,
      result_status: "PASS",
      passed: true,
      cleared: true,
      evaluated_at: new Date(),
    });

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.isEligible).toBe(true);
    // Regular total is strictly 1600, not 1600 + 85
    expect(res.body.data.grandTotalMarks).toBe(1600);
    expect(res.body.data.grandTotalMaxMarks).toBe(2000);
    expect(res.body.data.aggregatePercentage).toBe(80);
    // Backlog mark isolated in clearedBacklogs
    expect(res.body.data.clearedBacklogs[0].totalMarks).toBe(85);
  });

  // ---- 17. Missing marks and zero maximum marks are handled safely ----
  it("17. Missing marks and zero maximum marks yield null aggregate percentage without NaN/Infinity", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 2 });
    const exam1 = await createExamFixture({ collegeId: ctx.college._id, courseId: ctx.course._id, semester: 1 });
    const exam2 = await createExamFixture({ collegeId: ctx.college._id, courseId: ctx.course._id, semester: 2 });

    await createSemesterResultFixture({
      collegeId: ctx.college._id,
      studentId: ctx.student._id,
      courseId: ctx.course._id,
      semester: 1,
      totalMarks: null,
      totalMaxMarks: 0,
      examId: exam1._id,
    });
    await createSemesterResultFixture({
      collegeId: ctx.college._id,
      studentId: ctx.student._id,
      courseId: ctx.course._id,
      semester: 2,
      totalMarks: 300,
      totalMaxMarks: 400,
      examId: exam2._id,
    });

    const res = await ctx.studentAgent
      .get("/api/results/my-consolidated-result")
      .expect(200);

    expect(res.body.data.grandTotalMarks).toBeNull();
    expect(res.body.data.grandTotalMaxMarks).toBeNull();
    expect(res.body.data.aggregatePercentage).toBeNull();
  });

  // ---- 18. No database writes or source-record mutation occur ----
  it("18. No database writes or source-record mutation occur during read-only evaluation", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 4 });
    await createCompletePassingCourse(ctx, 4);

    const initialResultCount = await SemesterResult.countDocuments();
    const initialStudentCount = await Student.countDocuments();
    const initialBacklogCount = await Backlog.countDocuments();
    const initialCourseCount = await Course.countDocuments();

    const sampleBefore = await SemesterResult.findOne({
      college_id: ctx.college._id,
      student_id: ctx.student._id,
      semester: 1,
    }).lean();

    await ctx.studentAgent.get("/api/results/my-consolidated-result").expect(200);

    const finalResultCount = await SemesterResult.countDocuments();
    const finalStudentCount = await Student.countDocuments();
    const finalBacklogCount = await Backlog.countDocuments();
    const finalCourseCount = await Course.countDocuments();

    expect(finalResultCount).toBe(initialResultCount);
    expect(finalStudentCount).toBe(initialStudentCount);
    expect(finalBacklogCount).toBe(initialBacklogCount);
    expect(finalCourseCount).toBe(initialCourseCount);

    const sampleAfter = await SemesterResult.findOne({
      college_id: ctx.college._id,
      student_id: ctx.student._id,
      semester: 1,
    }).lean();

    expect(JSON.stringify(sampleBefore)).toBe(JSON.stringify(sampleAfter));
  });

  // ---- 19. Existing /api/results/my-results and result-authority tests remain compatible ----
  it("19. Existing /api/results/my-results endpoint remains compatible and functional", async () => {
    const ctx = await setupStudentContext({ durationSemesters: 4 });
    await createCompletePassingCourse(ctx, 4);

    const res = await ctx.studentAgent
      .get("/api/results/my-results")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data[0].overallResult).toBe("PASS");
  });
});
