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
const Backlog = require("../../src/models/backlog.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const app = require("../../app");

describe("PHASE 4 — TEACHER BACKLOG MARKS ENTRY", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const setupTeacher = async (collegeId, departmentId) => {
    const teacherUser = await createUser({
      email: `teacher.${Date.now()}.${Math.floor(Math.random() * 100000)}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: collegeId,
      isActive: true,
    });

    const teacher = await createTeacher({
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

  const createBacklogRecord = async ({
    student,
    college,
    course,
    subject,
    semester = 2,
    status = "OPEN",
  }) => {
    return Backlog.create({
      student_id: student._id,
      college_id: college._id,
      course_id: course._id,
      semester,
      academicYear: "2025-26",
      original_exam_id: new mongoose.Types.ObjectId(),
      original_result_id: new mongoose.Types.ObjectId(),
      subject_id: subject._id,
      subject_code: subject.code,
      subject_name: subject.name,
      subject_type: subject.subjectType || "THEORY",
      original_marks_snapshot: { totalMarks: 18 },
      status,
    });
  };

  const baseBacklogSetup = async () => {
    const college = await createCollege({
      code: `BLG${Date.now()}`,
      email: `backlog.${Date.now()}@test.com`,
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
      code: "BTECH-CSE",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });

    // Teachers
    const { agent: teacherAAgent, teacher: teacherA } = await setupTeacher(college._id, department._id);
    const { agent: teacherBAgent, teacher: teacherB } = await setupTeacher(college._id, department._id);

    // Regular Subject (Sem 3) assigned to Teacher B
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
      teacher_id: teacherB._id,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
    });

    // Backlog Subject 1: DBMS (Sem 2) assigned to Teacher A
    const backlogSubjectDBMS = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Database Management Systems",
      code: `DBMS-${Date.now()}`,
      semester: 2,
      credits: 4,
      subjectType: "THEORY",
      teacher_id: teacherA._id,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
    });

    // Backlog Subject 2: Mathematics II (Sem 2) assigned to Teacher B
    const backlogSubjectMath = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Mathematics II",
      code: `M2-${Date.now()}`,
      semester: 2,
      credits: 4,
      subjectType: "THEORY",
      teacher_id: teacherB._id,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
    });

    // Unified Exam: Semester 3 exam containing regular + backlog subjects
    const exam = await Exam.create({
      college_id: college._id,
      name: "End-Term Examination Winter 2026",
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        {
          subject: regularSubject._id,
          category: "REGULAR",
          originalSemester: null,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
        {
          subject: backlogSubjectDBMS._id,
          category: "BACKLOG",
          originalSemester: 2,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
        {
          subject: backlogSubjectMath._id,
          category: "BACKLOG",
          originalSemester: 2,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
        },
      ],
      createdBy: new mongoose.Types.ObjectId(),
      status: "PUBLISHED",
    });

    // Students
    // Student A: Has OPEN DBMS backlog
    const studentA = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      fullName: "Student A (DBMS OPEN)",
    });
    await createBacklogRecord({
      student: studentA,
      college: college,
      course: course,
      subject: backlogSubjectDBMS,
      semester: 2,
      status: "OPEN",
    });

    // Student B: Has ATTEMPTED DBMS backlog
    const studentB = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      fullName: "Student B (DBMS ATTEMPTED)",
    });
    await createBacklogRecord({
      student: studentB,
      college: college,
      course: course,
      subject: backlogSubjectDBMS,
      semester: 2,
      status: "ATTEMPTED",
    });

    // Student C: Has CLEARED DBMS backlog
    const studentC = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      fullName: "Student C (DBMS CLEARED)",
    });
    await createBacklogRecord({
      student: studentC,
      college: college,
      course: course,
      subject: backlogSubjectDBMS,
      semester: 2,
      status: "CLEARED",
    });

    // Student D: Regular student in sem 3 with NO backlog
    const studentD = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      fullName: "Student D (No Backlog)",
    });

    // Student E: Has CANCELLED DBMS backlog
    const studentE = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      fullName: "Student E (DBMS CANCELLED)",
    });
    await createBacklogRecord({
      student: studentE,
      college: college,
      course: course,
      subject: backlogSubjectDBMS,
      semester: 2,
      status: "CANCELLED",
    });

    // Student F: Has OPEN Math backlog (not DBMS)
    const studentF = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      fullName: "Student F (Math OPEN)",
    });
    await createBacklogRecord({
      student: studentF,
      college: college,
      course: course,
      subject: backlogSubjectMath,
      semester: 2,
      status: "OPEN",
    });

    return {
      college,
      department,
      course,
      exam,
      regularSubject,
      backlogSubjectDBMS,
      backlogSubjectMath,
      teacherA,
      teacherAAgent,
      teacherB,
      teacherBAgent,
      studentA,
      studentB,
      studentC,
      studentD,
      studentE,
      studentF,
    };
  };

  describe("Teacher Authorization for Backlog and Regular Papers", () => {
    it("1. assigned teacher can access Regular subject roster", async () => {
      const { teacherBAgent, exam, regularSubject } = await baseBacklogSetup();

      const res = await teacherBAgent
        .get("/api/marks/roster")
        .query({ examId: exam._id.toString(), subjectId: regularSubject._id.toString() })
        .expect(200);

      expect(res.body.success).toBe(true);
      // All sem 3 enrolled students appear for regular subject
      expect(res.body.data.roster.length).toBeGreaterThanOrEqual(4);
    });

    it("2. assigned teacher can access Backlog subject roster", async () => {
      const { teacherAAgent, exam, backlogSubjectDBMS } = await baseBacklogSetup();

      const res = await teacherAAgent
        .get("/api/marks/roster")
        .query({ examId: exam._id.toString(), subjectId: backlogSubjectDBMS._id.toString() })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe("BACKLOG");
      expect(res.body.data.originalSemester).toBe(2);
    });

    it("3. wrong teacher cannot access Backlog subject roster", async () => {
      const { teacherBAgent, exam, backlogSubjectDBMS } = await baseBacklogSetup();

      // Teacher B is NOT assigned to DBMS (Teacher A is)
      const res = await teacherBAgent
        .get("/api/marks/roster")
        .query({ examId: exam._id.toString(), subjectId: backlogSubjectDBMS._id.toString() })
        .expect(403);

      expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
    });

    it("4. wrong teacher cannot save Backlog marks", async () => {
      const { teacherBAgent, exam, backlogSubjectDBMS, studentA } = await baseBacklogSetup();

      const res = await teacherBAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [{ studentId: studentA._id.toString(), internalMarks: 20, externalMarks: 50 }],
        })
        .expect(403);

      expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
    });

    it("5. assigned teacher can update existing Backlog marks", async () => {
      const { teacherAAgent, exam, backlogSubjectDBMS, studentA } = await baseBacklogSetup();

      // Initial save
      await teacherAAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [{ studentId: studentA._id.toString(), internalMarks: 20, externalMarks: 50 }],
        })
        .expect(200);

      // Update
      const updateRes = await teacherAAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [{ studentId: studentA._id.toString(), internalMarks: 25, externalMarks: 55 }],
        })
        .expect(200);

      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data[0].internalMarks).toBe(25);
      expect(updateRes.body.data[0].externalMarks).toBe(55);

      const savedMarks = await StudentMarks.findOne({
        exam_id: exam._id,
        subject_id: backlogSubjectDBMS._id,
        student_id: studentA._id,
      });
      expect(savedMarks.internalMarks).toBe(25);
      expect(savedMarks.externalMarks).toBe(55);
    });

    it("6. cross-tenant teacher cannot access another college's backlog", async () => {
      const { exam, backlogSubjectDBMS } = await baseBacklogSetup();

      const otherCollege = await createCollege({
        code: `OTH${Date.now()}`,
        email: `other.${Date.now()}@test.com`,
      });
      const otherDept = await createDepartment({
        college_id: otherCollege._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "IT",
        code: "IT",
        type: "ACADEMIC",
        status: "ACTIVE",
        programsOffered: ["UG"],
        startYear: 2020,
        sanctionedFacultyCount: 10,
        sanctionedStudentIntake: 60,
      });
      const { agent: otherTeacherAgent } = await setupTeacher(otherCollege._id, otherDept._id);

      const res = await otherTeacherAgent
        .get("/api/marks/roster")
        .query({ examId: exam._id.toString(), subjectId: backlogSubjectDBMS._id.toString() })
        .expect(404);

      expect(res.body.error?.code || res.body.error?.message).toBeDefined();
    });
  });

  describe("Backlog Student Roster Filtering", () => {
    it("7 & 8 & 9 & 10 & 11 & 12. roster includes ONLY OPEN and ATTEMPTED students; excludes CLEARED, CANCELLED, and no-backlog students", async () => {
      const {
        teacherAAgent,
        exam,
        backlogSubjectDBMS,
        studentA,
        studentB,
        studentC,
        studentD,
        studentE,
      } = await baseBacklogSetup();

      const res = await teacherAAgent
        .get("/api/marks/roster")
        .query({ examId: exam._id.toString(), subjectId: backlogSubjectDBMS._id.toString() })
        .expect(200);

      expect(res.body.success).toBe(true);
      const returnedStudentIds = res.body.data.roster.map((r) => String(r.studentId));

      // Student A (OPEN) must appear
      expect(returnedStudentIds).toContain(String(studentA._id));

      // Student B (ATTEMPTED) must appear
      expect(returnedStudentIds).toContain(String(studentB._id));

      // Student C (CLEARED) must NOT appear
      expect(returnedStudentIds).not.toContain(String(studentC._id));

      // Student D (No backlog) must NOT appear
      expect(returnedStudentIds).not.toContain(String(studentD._id));

      // Student E (CANCELLED) must NOT appear
      expect(returnedStudentIds).not.toContain(String(studentE._id));

      // Exactly 2 eligible students
      expect(res.body.data.totalStudents).toBe(2);
      expect(res.body.data.roster).toHaveLength(2);
    });

    it("13. multiple backlog subjects work independently", async () => {
      const {
        teacherAAgent,
        teacherBAgent,
        exam,
        backlogSubjectDBMS,
        backlogSubjectMath,
        studentA,
        studentB,
        studentF,
      } = await baseBacklogSetup();

      // DBMS roster (Teacher A) -> Student A, Student B
      const dbmsRes = await teacherAAgent
        .get("/api/marks/roster")
        .query({ examId: exam._id.toString(), subjectId: backlogSubjectDBMS._id.toString() })
        .expect(200);

      const dbmsStudentIds = dbmsRes.body.data.roster.map((r) => String(r.studentId));
      expect(dbmsStudentIds).toContain(String(studentA._id));
      expect(dbmsStudentIds).toContain(String(studentB._id));
      expect(dbmsStudentIds).not.toContain(String(studentF._id));
      expect(dbmsStudentIds).toHaveLength(2);

      // Math roster (Teacher B) -> Student F only
      const mathRes = await teacherBAgent
        .get("/api/marks/roster")
        .query({ examId: exam._id.toString(), subjectId: backlogSubjectMath._id.toString() })
        .expect(200);

      const mathStudentIds = mathRes.body.data.roster.map((r) => String(r.studentId));
      expect(mathStudentIds).toContain(String(studentF._id));
      expect(mathStudentIds).not.toContain(String(studentA._id));
      expect(mathStudentIds).not.toContain(String(studentB._id));
      expect(mathStudentIds).toHaveLength(1);
    });

    it("14. student from another college does not appear in backlog roster", async () => {
      const { college, course, teacherAAgent, exam, backlogSubjectDBMS } = await baseBacklogSetup();

      const otherCollege = await createCollege({
        code: `EXT${Date.now()}`,
        email: `ext.${Date.now()}@test.com`,
      });
      const otherDept = await createDepartment({
        college_id: otherCollege._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "External CS",
        code: "EXTCS",
        type: "ACADEMIC",
        status: "ACTIVE",
        programsOffered: ["UG"],
        startYear: 2020,
        sanctionedFacultyCount: 10,
        sanctionedStudentIntake: 60,
      });
      const otherCourse = await createCourse({
        college_id: otherCollege._id,
        department_id: otherDept._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "External B.Tech",
        code: "EXT-BTECH",
        type: "THEORY",
        programLevel: "UG",
        durationSemesters: 8,
        credits: 120,
        maxStudents: 60,
      });
      const otherStudent = await createStudent({
        college_id: otherCollege._id,
        department_id: otherDept._id,
        course_id: otherCourse._id,
        fullName: "Cross Tenant Student",
      });
      // Backlog created with otherCollege._id
      await Backlog.create({
        student_id: otherStudent._id,
        college_id: otherCollege._id,
        course_id: otherCourse._id,
        semester: 2,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: backlogSubjectDBMS._id,
        subject_code: backlogSubjectDBMS.code,
        subject_name: backlogSubjectDBMS.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 12 },
        status: "OPEN",
      });

      const res = await teacherAAgent
        .get("/api/marks/roster")
        .query({ examId: exam._id.toString(), subjectId: backlogSubjectDBMS._id.toString() })
        .expect(200);

      const returnedStudentIds = res.body.data.roster.map((r) => String(r.studentId));
      expect(returnedStudentIds).not.toContain(String(otherStudent._id));
    });
  });

  describe("Semester Mismatch Handling", () => {
    it("15. assigned teacher can enter marks for subject.semester = 2, exam.semester = 3 when category = BACKLOG", async () => {
      const { teacherAAgent, exam, backlogSubjectDBMS, studentA } = await baseBacklogSetup();

      // Subject has semester = 2, Exam has semester = 3
      expect(backlogSubjectDBMS.semester).toBe(2);
      expect(exam.semester).toBe(3);

      const res = await teacherAAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [{ studentId: studentA._id.toString(), internalMarks: 22, externalMarks: 58 }],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].internalMarks).toBe(22);
      expect(res.body.data[0].externalMarks).toBe(58);
    });

    it("16. Regular subject semester validation remains unchanged (mismatch rejected)", async () => {
      const { college, department, course, teacherBAgent, teacherB } = await baseBacklogSetup();

      // Create a Sem 4 subject assigned to Teacher B
      const sem4Subject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "Software Engineering",
        code: `SE-${Date.now()}`,
        semester: 4,
        credits: 4,
        subjectType: "THEORY",
        teacher_id: teacherB._id,
        internalMaxMarks: 30,
        externalMaxMarks: 70,
      });

      // Exam is Semester 3, containing regular Sem 4 subject
      const examMismatch = await Exam.create({
        college_id: college._id,
        name: "Sem 3 Exam with Regular Sem 4 Subject Mismatch",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [
          {
            subject: sem4Subject._id,
            category: "REGULAR",
            originalSemester: null,
            subjectType: "THEORY",
            internalMaxMarks: 30,
            externalMaxMarks: 70,
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await teacherBAgent
        .get("/api/marks/roster")
        .query({ examId: examMismatch._id.toString(), subjectId: sem4Subject._id.toString() })
        .expect(403);

      expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
    });
  });

  describe("Marks Save Security & Integrity", () => {
    it("17. eligible backlog student marks can be saved", async () => {
      const { teacherAAgent, exam, backlogSubjectDBMS, studentA, studentB } = await baseBacklogSetup();

      const res = await teacherAAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [
            { studentId: studentA._id.toString(), internalMarks: 20, externalMarks: 60 },
            { studentId: studentB._id.toString(), internalMarks: 22, externalMarks: 58 },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it("18. ineligible student marks are rejected (student with CLEARED or no backlog)", async () => {
      const { teacherAAgent, exam, backlogSubjectDBMS, studentA, studentC, studentD } = await baseBacklogSetup();

      // Try submitting marks for Student C (CLEARED)
      const resC = await teacherAAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [
            { studentId: studentC._id.toString(), internalMarks: 20, externalMarks: 50 },
          ],
        })
        .expect(400);

      expect(resC.body.error.code).toBe("STUDENT_NOT_ELIGIBLE");

      // Try submitting marks for Student D (no backlog)
      const resD = await teacherAAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [
            { studentId: studentD._id.toString(), internalMarks: 20, externalMarks: 50 },
          ],
        })
        .expect(400);

      expect(resD.body.error.code).toBe("STUDENT_NOT_ELIGIBLE");
    });

    it("19. wrong teacher marks submission is rejected", async () => {
      const { teacherBAgent, exam, backlogSubjectDBMS, studentA } = await baseBacklogSetup();

      const res = await teacherBAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [{ studentId: studentA._id.toString(), internalMarks: 20, externalMarks: 50 }],
        })
        .expect(403);

      expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
    });

    it("20. cross-tenant marks submission is rejected", async () => {
      const { exam, backlogSubjectDBMS, studentA } = await baseBacklogSetup();

      const otherCollege = await createCollege({
        code: `CTM${Date.now()}`,
        email: `ctm.${Date.now()}@test.com`,
      });
      const otherDept = await createDepartment({
        college_id: otherCollege._id,
        createdBy: new mongoose.Types.ObjectId(),
        name: "CS",
        code: "CS",
        type: "ACADEMIC",
        status: "ACTIVE",
        programsOffered: ["UG"],
        startYear: 2020,
        sanctionedFacultyCount: 10,
        sanctionedStudentIntake: 60,
      });
      const { agent: otherTeacherAgent } = await setupTeacher(otherCollege._id, otherDept._id);

      const res = await otherTeacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [{ studentId: studentA._id.toString(), internalMarks: 20, externalMarks: 50 }],
        })
        .expect(404);

      expect(res.body.error?.code || res.body.error?.message).toBeDefined();
    });

    it("21. duplicate StudentMarks behavior remains correct (upsert updates existing without duplicate keys)", async () => {
      const { teacherAAgent, exam, backlogSubjectDBMS, studentA } = await baseBacklogSetup();

      // First entry
      await teacherAAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [{ studentId: studentA._id.toString(), internalMarks: 15, externalMarks: 45 }],
        })
        .expect(200);

      // Second entry with updated values
      await teacherAAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id.toString(),
          subjectId: backlogSubjectDBMS._id.toString(),
          marks: [{ studentId: studentA._id.toString(), internalMarks: 25, externalMarks: 65 }],
        })
        .expect(200);

      const records = await StudentMarks.find({
        exam_id: exam._id,
        subject_id: backlogSubjectDBMS._id,
        student_id: studentA._id,
      });

      expect(records).toHaveLength(1);
      expect(records[0].internalMarks).toBe(25);
      expect(records[0].externalMarks).toBe(65);
    });
  });
});
