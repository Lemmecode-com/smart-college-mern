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
const StudentMarks = require("../../src/models/studentMarks.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Backlog = require("../../src/models/backlog.model");
const BacklogAttempt = require("../../src/models/backlogAttempt.model");
const {
  calculateSubjectResult,
  calculateSemesterTotals,
} = require("../../src/services/examCalculation.service");
const {
  generateSemesterResult,
  backfillSemesterResultPercentages,
} = require("../../src/services/semesterResult.service");
const app = require("../../app");

describe("STEP 6: Overall Semester Percentage & Authoritative Maximum Marks", () => {
  // =========================================================================
  // 1. UNIT TESTS: Calculation Engine
  // =========================================================================

  describe("Unit Tests: calculateSemesterTotals & Subject Calculations", () => {
    it("1. calculates semester total obtained marks, max marks, and percentage correctly", () => {
      const subjects = [
        { totalMarks: 45, maxMarks: 50, status: "PASS" },
        { totalMarks: 85, maxMarks: 100, status: "PASS" },
      ];
      const res = calculateSemesterTotals(subjects, "PASS");
      expect(res.totalMarks).toBe(130);
      expect(res.totalMaxMarks).toBe(150);
      // (130 / 150) * 100 = 86.6666... -> 86.67
      expect(res.percentage).toBe(86.67);
    });

    it("2. includes failed subjects in semester total and percentage", () => {
      const subjects = [
        { totalMarks: 90, maxMarks: 100, status: "PASS" },
        { totalMarks: 35, maxMarks: 50, status: "PASS" },
        { totalMarks: 20, maxMarks: 50, status: "FAIL" },
      ];
      const res = calculateSemesterTotals(subjects, "FAIL");
      expect(res.totalMarks).toBe(145);
      expect(res.totalMaxMarks).toBe(200);
      expect(res.percentage).toBe(72.5);
    });

    it("3. rounds percentage to 2 decimal places (145 / 150 -> 96.67%)", () => {
      const subjects = [
        { totalMarks: 75, maxMarks: 75, status: "PASS" },
        { totalMarks: 70, maxMarks: 75, status: "PASS" },
      ];
      const res = calculateSemesterTotals(subjects, "PASS");
      expect(res.totalMarks).toBe(145);
      expect(res.totalMaxMarks).toBe(150);
      expect(res.percentage).toBe(96.67);
    });

    it("4. returns null percentage when overallResult is INCOMPLETE or subject has null marks", () => {
      const subjects = [
        { totalMarks: 80, maxMarks: 100, status: "PASS" },
        { totalMarks: null, maxMarks: 50, status: "INCOMPLETE" },
      ];
      const res = calculateSemesterTotals(subjects, "INCOMPLETE");
      expect(res.percentage).toBeNull();
      expect(res.totalMarks).toBe(80);
      expect(res.totalMaxMarks).toBe(150);
    });

    it("5. handles zero maximum marks safely without division by zero or NaN", () => {
      const subjects = [
        { totalMarks: 0, maxMarks: 0, status: "FAIL" },
      ];
      const res = calculateSemesterTotals(subjects, "FAIL");
      expect(res.percentage).toBeNull();
    });

    it("6. THEORY calculation snapshots internalMaxMarks, externalMaxMarks, maxMarks", () => {
      const config = {
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
      };
      const res = calculateSubjectResult(config, { internalMarks: 25, externalMarks: 65 });
      expect(res.internalMarks).toBe(25);
      expect(res.internalMaxMarks).toBe(30);
      expect(res.externalMarks).toBe(65);
      expect(res.externalMaxMarks).toBe(70);
      expect(res.totalMarks).toBe(90);
      expect(res.maxMarks).toBe(100);
      expect(res.status).toBe("PASS");
    });

    it("7. PRACTICAL calculation snapshots internalMaxMarks, null externalMaxMarks, maxMarks", () => {
      const config = {
        subjectType: "PRACTICAL",
        internalMaxMarks: 50,
        passMarks: 25,
      };
      const res = calculateSubjectResult(config, { internalMarks: 45, externalMarks: null });
      expect(res.internalMarks).toBe(45);
      expect(res.internalMaxMarks).toBe(50);
      expect(res.externalMarks).toBeNull();
      expect(res.externalMaxMarks).toBeNull();
      expect(res.totalMarks).toBe(45);
      expect(res.maxMarks).toBe(50);
      expect(res.status).toBe("PASS");
    });

    it("8. COMPOSITE calculation snapshots internalMaxMarks, externalMaxMarks, maxMarks", () => {
      const config = {
        subjectType: "COMPOSITE",
        internalMaxMarks: 40,
        externalMaxMarks: 60,
        passMarks: 50,
      };
      const res = calculateSubjectResult(config, { internalMarks: 30, externalMarks: 45 });
      expect(res.internalMarks).toBe(30);
      expect(res.internalMaxMarks).toBe(40);
      expect(res.externalMarks).toBe(45);
      expect(res.externalMaxMarks).toBe(60);
      expect(res.totalMarks).toBe(75);
      expect(res.maxMarks).toBe(100);
      expect(res.status).toBe("PASS");
    });
  });

  // =========================================================================
  // 2. INTEGRATION TESTS: Result Generation, API & Security
  // =========================================================================

  describe("Integration Tests: Generation, API, Historical Safety & Security", () => {
    beforeAll(async () => {
      await connectTestDb();
    });

    afterAll(async () => {
      await closeTestDb();
    });

    beforeEach(async () => {
      await clearTestDb();
    });

    const setupCollegeAndDept = async (suffix = "1") => {
      const rand = `${Date.now()}_${Math.floor(Math.random() * 1000000)}_${suffix}`;
      const college = await createCollege({
        code: `C_${rand}`.slice(0, 20),
        email: `college.${rand}@test.com`,
      });
      const department = await createDepartment({
        college_id: college._id,
        createdBy: new mongoose.Types.ObjectId(),
        code: `D_${rand}`.slice(0, 20),
      });
      const course = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: new mongoose.Types.ObjectId(),
        code: `CR_${rand}`.slice(0, 20),
      });
      return { college, department, course };
    };

    const setupStudentUser = async (collegeId, departmentId, courseId, sem = 3) => {
      const rand = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const email = `student.${rand}@test.com`;
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
        fullName: "Test Student",
        email,
        currentSemester: sem,
        status: "APPROVED",
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email, password: "Test@123" })
        .expect(200);

      return { agent, studentUser, student };
    };

    it("9. generateSemesterResult persists totalMarks, totalMaxMarks, and percentage", async () => {
      const { college, department, course } = await setupCollegeAndDept("9");
      const { student } = await setupStudentUser(college._id, department._id, course._id);

      const subTheory = await createSubject({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        name: "Theory Sub",
        code: `TH_${Date.now()}`.slice(0, 20),
        subjectType: "THEORY",
        semester: 3,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const subPractical = await createSubject({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        name: "Practical Sub",
        code: `PR_${Date.now()}`.slice(0, 20),
        subjectType: "PRACTICAL",
        semester: 3,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const exam = await Exam.create({
        college_id: college._id,
        name: "Sem 3 Regular Exam",
        academicYear: "2025-2026",
        semester: 3,
        examType: "REGULAR",
        status: "PUBLISHED",
        course_id: course._id,
        courses: [course._id],
        subjects: [
          {
            subject: subTheory._id,
            subjectType: "THEORY",
            internalMaxMarks: 30,
            externalMaxMarks: 70,
            internalPassMarks: 12,
            externalPassMarks: 28,
          },
          {
            subject: subPractical._id,
            subjectType: "PRACTICAL",
            internalMaxMarks: 50,
            passMarks: 25,
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      });

      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: subTheory._id,
        student_id: student._id,
        internalMarks: 25,
        externalMarks: 65,
        createdBy: new mongoose.Types.ObjectId(),
      });

      await StudentMarks.create({
        college_id: college._id,
        exam_id: exam._id,
        subject_id: subPractical._id,
        student_id: student._id,
        internalMarks: 45,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const resRecord = await generateSemesterResult({
        examId: exam._id,
        studentId: student._id,
        collegeId: college._id,
        userId: new mongoose.Types.ObjectId(),
      });

      expect(resRecord.totalMarks).toBe(135); // 90 + 45
      expect(resRecord.totalMaxMarks).toBe(150); // 100 + 50
      expect(resRecord.percentage).toBe(90.0);
      expect(resRecord.overallResult).toBe("PASS");

      // Verify subject snapshots
      const thSubject = resRecord.subjects.find((s) => String(s.subject) === String(subTheory._id));
      expect(thSubject.maxMarks).toBe(100);
      expect(thSubject.internalMaxMarks).toBe(30);
      expect(thSubject.externalMaxMarks).toBe(70);

      const prSubject = resRecord.subjects.find((s) => String(s.subject) === String(subPractical._id));
      expect(prSubject.maxMarks).toBe(50);
      expect(prSubject.internalMaxMarks).toBe(50);
      expect(prSubject.externalMaxMarks).toBeNull();
    });

    it("10. API GET /api/results/my-results returns authoritative percentage and no subject percentage", async () => {
      const { college, department, course } = await setupCollegeAndDept("10");
      const { agent, student } = await setupStudentUser(college._id, department._id, course._id);

      const sub1 = await createSubject({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        name: "Algorithms",
        code: `AL_${Date.now()}`.slice(0, 20),
        subjectType: "THEORY",
        semester: 3,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const exam = await Exam.create({
        college_id: college._id,
        name: "Semester 3 Regular Exams",
        academicYear: "2025-2026",
        semester: 3,
        examType: "REGULAR",
        status: "PUBLISHED",
        course_id: course._id,
        courses: [course._id],
        subjects: [
          {
            subject: sub1._id,
            subjectType: "THEORY",
            internalMaxMarks: 30,
            externalMaxMarks: 70,
            internalPassMarks: 12,
            externalPassMarks: 28,
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      });

      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: exam._id,
        course_id: course._id,
        createdBy: new mongoose.Types.ObjectId(),
        semester: 3,
        academicYear: "2025-2026",
        status: "PUBLISHED",
        overallResult: "PASS",
        totalMarks: 85,
        totalMaxMarks: 100,
        percentage: 85.0,
        passedSubjects: 1,
        failedSubjects: 0,
        incompleteSubjects: 0,
        totalSubjects: 1,
        subjects: [
          {
            subject: sub1._id,
            subjectName: "Algorithms",
            subjectCode: "CS301",
            subjectType: "THEORY",
            internalMarks: 25,
            internalMaxMarks: 30,
            externalMarks: 60,
            externalMaxMarks: 70,
            totalMarks: 85,
            maxMarks: 100,
            passed: true,
            status: "PASS",
          },
        ],
      });

      const res = await agent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);

      const semResult = res.body.data[0];
      // Semester level fields
      expect(semResult.semester).toBe(3);
      expect(semResult.examName).toBe("Semester 3 Regular Exams");
      expect(semResult.totalMarks).toBe(85);
      expect(semResult.totalMaxMarks).toBe(100);
      expect(semResult.percentage).toBe(85.0);
      expect(semResult.resultStatus).toBe("PASS");

      // Subject level fields
      const subj = semResult.subjects[0];
      expect(subj.totalMarks).toBe(85);
      expect(subj.maxMarks).toBe(100);
      expect(subj.status).toBe("PASS");
      // Assert subject percentage does NOT exist in backend response
      expect(subj.percentage).toBeUndefined();
    });

    it("11. clearing a backlog does NOT alter original published SemesterResult percentage", async () => {
      const { college, department, course } = await setupCollegeAndDept("11");
      const { agent, student } = await setupStudentUser(college._id, department._id, course._id);

      const sub1 = await createSubject({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        name: "Maths I",
        code: `M1_${Date.now()}`.slice(0, 20),
        subjectType: "THEORY",
        semester: 1,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const examSem1 = await Exam.create({
        college_id: college._id,
        name: "Semester 1 Regular Exams",
        academicYear: "2024-2025",
        semester: 1,
        examType: "REGULAR",
        status: "PUBLISHED",
        course_id: course._id,
        courses: [course._id],
        subjects: [
          {
            subject: sub1._id,
            subjectType: "THEORY",
            internalMaxMarks: 50,
            externalMaxMarks: 50,
            internalPassMarks: 20,
            externalPassMarks: 20,
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      });

      const originalResult = await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: examSem1._id,
        course_id: course._id,
        createdBy: new mongoose.Types.ObjectId(),
        semester: 1,
        academicYear: "2024-2025",
        status: "PUBLISHED",
        overallResult: "FAIL",
        totalMarks: 30,
        totalMaxMarks: 100,
        percentage: 30.0,
        passedSubjects: 0,
        failedSubjects: 1,
        totalSubjects: 1,
        subjects: [
          {
            subject: sub1._id,
            subjectName: "Maths I",
            subjectCode: "MTH101",
            subjectType: "THEORY",
            internalMarks: 15,
            externalMarks: 15,
            totalMarks: 30,
            maxMarks: 100,
            passed: false,
            status: "FAIL",
          },
        ],
      });

      // Student has a backlog and clears it in supplementary
      const backlog = await Backlog.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        semester: 1,
        academicYear: "2024-2025",
        original_exam_id: examSem1._id,
        original_result_id: originalResult._id,
        subject_id: sub1._id,
        subject_code: sub1.code,
        subject_name: sub1.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 30, status: "FAIL" },
        status: "CLEARED",
        attempt_count: 1,
      });

      const suppExam = await Exam.create({
        college_id: college._id,
        name: "Summer 2025 Re-exam",
        academicYear: "2024-2025",
        semester: 1,
        examType: "SUPPLEMENTARY",
        status: "PUBLISHED",
        course_id: course._id,
        courses: [course._id],
        subjects: [
          {
            subject: sub1._id,
            subjectType: "THEORY",
            internalMaxMarks: 50,
            externalMaxMarks: 50,
            internalPassMarks: 20,
            externalPassMarks: 20,
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Supplementary exam has a published result record in this college
      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: suppExam._id,
        course_id: course._id,
        createdBy: new mongoose.Types.ObjectId(),
        semester: 1,
        academicYear: "2024-2025",
        status: "PUBLISHED",
        overallResult: "PASS",
        totalMarks: 75,
        totalMaxMarks: 100,
        percentage: 75.0,
        passedSubjects: 1,
        failedSubjects: 0,
        totalSubjects: 1,
        subjects: [],
      });

      await BacklogAttempt.create({
        college_id: college._id,
        course_id: course._id,
        backlog_id: backlog._id,
        student_id: student._id,
        subject_id: sub1._id,
        exam_id: suppExam._id,
        attempt_number: 1,
        internal_marks: 35,
        external_marks: 40,
        total_marks: 75,
        result_status: "PASS",
        passed: true,
        cleared: true,
      });

      const res = await agent.get("/api/results/my-results").expect(200);
      const originalRes = res.body.data.find(
        (r) => String(r.exam_id?._id || r.exam_id) === String(examSem1._id),
      );

      // Verify original semester result percentage is completely UNTOUCHED
      expect(originalRes.totalMarks).toBe(30);
      expect(originalRes.totalMaxMarks).toBe(100);
      expect(originalRes.percentage).toBe(30.0);
      expect(originalRes.overallResult).toBe("FAIL");

      // Verify the backlog attempt is recorded separately
      expect(res.body.backlogResults).toHaveLength(1);
      expect(res.body.backlogResults[0].cleared).toBe(true);
      expect(res.body.backlogResults[0].totalMarks).toBe(75);
    });

    it("12. idempotent backfill safely reconstructs missing maxMarks and percentage", async () => {
      const { college, department, course } = await setupCollegeAndDept("12");
      const { student } = await setupStudentUser(college._id, department._id, course._id);

      const sub1 = await createSubject({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        name: "Test Subject",
        code: `TS_${Date.now()}`.slice(0, 20),
        subjectType: "THEORY",
        semester: 2,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const exam = await Exam.create({
        college_id: college._id,
        name: "Semester 2 Exams",
        academicYear: "2025-2026",
        semester: 2,
        examType: "REGULAR",
        status: "PUBLISHED",
        course_id: course._id,
        courses: [course._id],
        subjects: [
          {
            subject: sub1._id,
            subjectType: "THEORY",
            internalMaxMarks: 30,
            externalMaxMarks: 70,
            internalPassMarks: 12,
            externalPassMarks: 28,
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      });

      // Legacy result missing totalMaxMarks and percentage
      const legacyResult = await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: exam._id,
        course_id: course._id,
        createdBy: new mongoose.Types.ObjectId(),
        semester: 2,
        academicYear: "2025-2026",
        status: "PUBLISHED",
        overallResult: "PASS",
        totalMarks: 80,
        totalMaxMarks: null,
        percentage: null,
        passedSubjects: 1,
        failedSubjects: 0,
        totalSubjects: 1,
        subjects: [
          {
            subject: sub1._id,
            subjectName: "Test Subject",
            subjectCode: "TS101",
            subjectType: "THEORY",
            internalMarks: 25,
            externalMarks: 55,
            totalMarks: 80,
            maxMarks: null,
            passed: true,
            status: "PASS",
          },
        ],
      });

      // Run backfill
      const report = await backfillSemesterResultPercentages({ collegeId: college._id });
      expect(report.totalProcessed).toBe(1);
      expect(report.updatedCount).toBe(1);

      // Verify updated record
      const updated = await SemesterResult.findById(legacyResult._id);
      expect(updated.totalMarks).toBe(80);
      expect(updated.totalMaxMarks).toBe(100);
      expect(updated.percentage).toBe(80.0);
      expect(updated.subjects[0].maxMarks).toBe(100);

      // Run backfill again to verify IDEMPOTENCY
      const secondReport = await backfillSemesterResultPercentages({ collegeId: college._id });
      expect(secondReport.totalProcessed).toBe(1);
      expect(secondReport.updatedCount).toBe(0); // Already up-to-date, skipped
      expect(secondReport.skippedCount).toBe(1);
    });

    it("13. student cannot see results belonging to another student or college (isolation)", async () => {
      const { college: collegeA, department: deptA, course: courseA } = await setupCollegeAndDept("13A");
      const { college: collegeB, department: deptB, course: courseB } = await setupCollegeAndDept("13B");

      const { agent: agentA, student: studentA } = await setupStudentUser(collegeA._id, deptA._id, courseA._id, 1);
      const { student: studentB } = await setupStudentUser(collegeB._id, deptB._id, courseB._id, 2);

      const examB = await Exam.create({
        college_id: collegeB._id,
        name: "College B Exam",
        academicYear: "2025-2026",
        semester: 1,
        examType: "REGULAR",
        status: "PUBLISHED",
        course_id: courseB._id,
        courses: [courseB._id],
        subjects: [],
        createdBy: new mongoose.Types.ObjectId(),
      });

      await SemesterResult.create({
        college_id: collegeB._id,
        student_id: studentB._id,
        exam_id: examB._id,
        course_id: courseB._id,
        createdBy: new mongoose.Types.ObjectId(),
        semester: 1,
        academicYear: "2025-2026",
        status: "PUBLISHED",
        overallResult: "PASS",
        totalMarks: 95,
        totalMaxMarks: 100,
        percentage: 95.0,
        passedSubjects: 1,
        failedSubjects: 0,
        totalSubjects: 1,
        subjects: [],
      });

      // Student A queries my-results
      const resA = await agentA.get("/api/results/my-results").expect(200);
      expect(resA.body.success).toBe(true);
      // Student A must NOT see Student B's results
      expect(resA.body.data).toHaveLength(0);
    });

    it("14. student cannot see DRAFT or LOCKED results (only PUBLISHED)", async () => {
      const { college, department, course } = await setupCollegeAndDept("14");
      const { agent, student } = await setupStudentUser(college._id, department._id, course._id);

      const exam = await Exam.create({
        college_id: college._id,
        name: "Semester 3 Draft Exam",
        academicYear: "2025-2026",
        semester: 3,
        examType: "REGULAR",
        status: "DRAFT",
        course_id: course._id,
        courses: [course._id],
        subjects: [],
        createdBy: new mongoose.Types.ObjectId(),
      });

      await SemesterResult.create({
        college_id: college._id,
        student_id: student._id,
        exam_id: exam._id,
        course_id: course._id,
        createdBy: new mongoose.Types.ObjectId(),
        semester: 3,
        academicYear: "2025-2026",
        status: "DRAFT", // NOT published
        overallResult: "PASS",
        totalMarks: 90,
        totalMaxMarks: 100,
        percentage: 90.0,
        passedSubjects: 1,
        failedSubjects: 0,
        totalSubjects: 1,
        subjects: [],
      });

      const res = await agent.get("/api/results/my-results").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
