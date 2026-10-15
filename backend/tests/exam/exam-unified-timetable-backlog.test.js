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
const app = require("../../app");
const Exam = require("../../src/models/exam.model");
const ExamSchedule = require("../../src/models/examSchedule.model");
const Backlog = require("../../src/models/backlog.model");
const Student = require("../../src/models/student.model");

describe("Unified Exam Timetable — Backlog Papers & Student Visibility Filtering", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // Helper to create published exam + schedule
  const createPublishedExamWithSchedule = async ({
    college,
    course,
    semester,
    academicYear,
    subjects,
    createdBy,
  }) => {
    const exam = await Exam.create({
      college_id: college._id,
      name: `Semester ${semester} Exam ${Date.now()}`,
      course_id: course._id,
      semester,
      academicYear,
      subjects: subjects.map((s) => ({
        subject: s._id || s.subject,
        subjectType: s.subjectType || "THEORY",
        category: s.category || "REGULAR",
        originalSemester: s.originalSemester,
        internalMaxMarks: 20,
        externalMaxMarks: 80,
        internalPassMarks: 10,
        externalPassMarks: 28,
        passMarks: 40,
      })),
      status: "PUBLISHED",
      createdBy: createdBy._id,
    });

    const schedule = await ExamSchedule.create({
      exam_id: exam._id,
      college_id: college._id,
      status: "PUBLISHED",
      subjects: subjects.map((s, idx) => ({
        subject: s._id || s.subject,
        category: s.category || "REGULAR",
        originalSemester: s.originalSemester,
        examDate: new Date(`2026-05-0${(idx % 8) + 1}`),
        startTime: "09:00",
        endTime: "12:00",
        session: "FORENOON",
        room: `Room ${101 + idx}`,
      })),
      createdBy: createdBy._id,
      updatedBy: createdBy._id,
      publishedBy: createdBy._id,
      publishedAt: new Date(),
    });

    return { exam, schedule };
  };

  // Helper to setup student with authenticated session
  const setupStudent = async (college, course, semester, prefix = "student") => {
    const email = `${prefix.toLowerCase()}.${Date.now()}.${Math.floor(Math.random() * 100000)}@test.com`;
    const studentUser = await createUser({
      email,
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: course.department_id,
      course_id: course._id,
      currentSemester: semester,
      status: "APPROVED",
      email,
      user_id: studentUser._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email, password: "Test@123" })
      .expect(200);

    return { student, studentUser, agent };
  };

  // Helper to seed a Backlog record
  const seedBacklog = async ({
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

  // Common setup fixture
  const setupFixture = async () => {
    const college = await createCollege({
      code: `CLG${Date.now()}`,
      email: `college.${Date.now()}@test.com`,
    });

    const coordinator = await createUser({
      email: `coord.${Date.now()}.${Math.floor(Math.random() * 1000)}@test.com`,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: college._id,
      isActive: true,
    });

    const department = await createDepartment({
      college_id: college._id,
      createdBy: coordinator._id,
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: coordinator._id,
      durationSemesters: 8,
    });

    // Regular Semester 3 subjects
    const osSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      name: "Operating Systems",
      code: "OS-301",
      semester: 3,
      createdBy: coordinator._id,
    });
    const cnSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      name: "Computer Networks",
      code: "CN-302",
      semester: 3,
      createdBy: coordinator._id,
    });
    const seSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      name: "Software Engineering",
      code: "SE-303",
      semester: 3,
      createdBy: coordinator._id,
    });

    // Backlog candidate subjects from Semester 2
    const dbmsSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      name: "Database Management Systems",
      code: "DBMS-201",
      semester: 2,
      createdBy: coordinator._id,
    });

    const mathSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      name: "Discrete Mathematics",
      code: "MATH-202",
      semester: 2,
      createdBy: coordinator._id,
    });

    return {
      college,
      coordinator,
      department,
      course,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      mathSubject,
    };
  };

  test("1. Regular timetable remains unchanged when no backlog subjects exist", async () => {
    const { college, course, osSubject, cnSubject, seSubject, coordinator } =
      await setupFixture();

    const { exam, schedule } = await createPublishedExamWithSchedule({
      college,
      course,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
      ],
      createdBy: coordinator,
    });

    const { agent } = await setupStudent(college, course, 3, "regular");

    // Fetch published schedule
    const res = await agent
      .get(`/api/exam-schedule/published/${exam._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.schedule.subjects).toHaveLength(3);

    const subjectCodes = res.body.data.schedule.subjects.map(
      (s) => s.subject.code,
    );
    expect(subjectCodes).toEqual(
      expect.arrayContaining(["OS-301", "CN-302", "SE-303"]),
    );
    res.body.data.schedule.subjects.forEach((s) => {
      expect(s.category).toBe("REGULAR");
    });
  });

  test("2. Student with OPEN backlog sees matching BACKLOG paper alongside regular papers", async () => {
    const {
      college,
      course,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      coordinator,
    } = await setupFixture();

    const { exam } = await createPublishedExamWithSchedule({
      college,
      course,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
        { ...dbmsSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
      ],
      createdBy: coordinator,
    });

    // Student A has OPEN backlog for DBMS
    const { student: studentA, agent: agentA } = await setupStudent(
      college,
      course,
      3,
      "studentA",
    );
    await seedBacklog({
      student: studentA,
      college,
      course,
      subject: dbmsSubject,
      semester: 2,
      status: "OPEN",
    });

    const res = await agentA
      .get(`/api/exam-schedule/published/${exam._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.schedule.subjects).toHaveLength(4);

    const dbmsEntry = res.body.data.schedule.subjects.find(
      (s) => s.subject.code === "DBMS-201",
    );
    expect(dbmsEntry).toBeDefined();
    expect(dbmsEntry.category).toBe("BACKLOG");
    expect(dbmsEntry.originalSemester).toBe(2);

    // Also verify GET /api/exam/published/:id returns the same filtered schedule
    const examDetailRes = await agentA
      .get(`/api/exam/published/${exam._id}`)
      .expect(200);
    expect(examDetailRes.body.success).toBe(true);
    expect(examDetailRes.body.data.schedule.subjects).toHaveLength(4);

    // Also verify GET /api/exam/published list view includes DBMS for Student A
    const listRes = await agentA.get("/api/exam/published").expect(200);
    expect(listRes.body.success).toBe(true);
    const listedExam = listRes.body.data.find(
      (e) => String(e._id) === String(exam._id),
    );
    expect(listedExam.subjects).toHaveLength(4);
  });

  test("3. Student with ATTEMPTED backlog sees matching BACKLOG paper", async () => {
    const {
      college,
      course,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      coordinator,
    } = await setupFixture();

    const { exam } = await createPublishedExamWithSchedule({
      college,
      course,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
        { ...dbmsSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
      ],
      createdBy: coordinator,
    });

    // Student has ATTEMPTED backlog for DBMS
    const { student, agent } = await setupStudent(
      college,
      course,
      3,
      "studentAttempted",
    );
    await seedBacklog({
      student,
      college,
      course,
      subject: dbmsSubject,
      semester: 2,
      status: "ATTEMPTED",
    });

    const res = await agent
      .get(`/api/exam-schedule/published/${exam._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.schedule.subjects).toHaveLength(4);

    const dbmsEntry = res.body.data.schedule.subjects.find(
      (s) => s.subject.code === "DBMS-201",
    );
    expect(dbmsEntry).toBeDefined();
    expect(dbmsEntry.category).toBe("BACKLOG");
  });

  test("4. Student without backlog does NOT see the BACKLOG paper", async () => {
    const {
      college,
      course,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      coordinator,
    } = await setupFixture();

    const { exam } = await createPublishedExamWithSchedule({
      college,
      course,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
        { ...dbmsSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
      ],
      createdBy: coordinator,
    });

    // Student B has NO backlog for DBMS
    const { agent: agentB } = await setupStudent(
      college,
      course,
      3,
      "studentB",
    );

    const res = await agentB
      .get(`/api/exam-schedule/published/${exam._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Student B must only see the 3 regular subjects
    expect(res.body.data.schedule.subjects).toHaveLength(3);

    const dbmsEntry = res.body.data.schedule.subjects.find(
      (s) => s.subject.code === "DBMS-201",
    );
    expect(dbmsEntry).toBeUndefined();

    // Verify exam subjects in schedule response also omit DBMS
    const examDbms = (res.body.data.exam.subjects || []).find(
      (s) => String(s.subject?._id || s.subject) === String(dbmsSubject._id),
    );
    expect(examDbms).toBeUndefined();

    // Verify GET /api/exam/published list view also omits DBMS for Student B
    const listRes = await agentB.get("/api/exam/published").expect(200);
    expect(listRes.body.success).toBe(true);
    const listedExam = listRes.body.data.find(
      (e) => String(e._id) === String(exam._id),
    );
    expect(listedExam.subjects).toHaveLength(3);
  });

  test("5. CLEARED backlog does NOT appear in student timetable", async () => {
    const {
      college,
      course,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      coordinator,
    } = await setupFixture();

    const { exam } = await createPublishedExamWithSchedule({
      college,
      course,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
        { ...dbmsSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
      ],
      createdBy: coordinator,
    });

    const { student, agent } = await setupStudent(
      college,
      course,
      3,
      "studentCleared",
    );
    await seedBacklog({
      student,
      college,
      course,
      subject: dbmsSubject,
      semester: 2,
      status: "CLEARED",
    });

    const res = await agent
      .get(`/api/exam-schedule/published/${exam._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.schedule.subjects).toHaveLength(3);
    const dbmsEntry = res.body.data.schedule.subjects.find(
      (s) => s.subject.code === "DBMS-201",
    );
    expect(dbmsEntry).toBeUndefined();
  });

  test("6. CANCELLED backlog does NOT appear in student timetable", async () => {
    const {
      college,
      course,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      coordinator,
    } = await setupFixture();

    const { exam } = await createPublishedExamWithSchedule({
      college,
      course,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
        { ...dbmsSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
      ],
      createdBy: coordinator,
    });

    const { student, agent } = await setupStudent(
      college,
      course,
      3,
      "studentCancelled",
    );
    await seedBacklog({
      student,
      college,
      course,
      subject: dbmsSubject,
      semester: 2,
      status: "CANCELLED",
    });

    const res = await agent
      .get(`/api/exam-schedule/published/${exam._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.schedule.subjects).toHaveLength(3);
    const dbmsEntry = res.body.data.schedule.subjects.find(
      (s) => s.subject.code === "DBMS-201",
    );
    expect(dbmsEntry).toBeUndefined();
  });

  test("7. Multiple backlog subjects work (DBMS -> OPEN, MATH -> ATTEMPTED)", async () => {
    const {
      college,
      course,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      mathSubject,
      coordinator,
    } = await setupFixture();

    const { exam } = await createPublishedExamWithSchedule({
      college,
      course,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
        { ...dbmsSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
        { ...mathSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
      ],
      createdBy: coordinator,
    });

    const { student, agent } = await setupStudent(
      college,
      course,
      3,
      "multiBacklog",
    );
    await seedBacklog({
      student,
      college,
      course,
      subject: dbmsSubject,
      semester: 2,
      status: "OPEN",
    });
    await seedBacklog({
      student,
      college,
      course,
      subject: mathSubject,
      semester: 2,
      status: "ATTEMPTED",
    });

    const res = await agent
      .get(`/api/exam-schedule/published/${exam._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // 3 Regular + 2 Backlog = 5 subjects
    expect(res.body.data.schedule.subjects).toHaveLength(5);

    const codes = res.body.data.schedule.subjects.map(
      (s) => s.subject.code,
    );
    expect(codes).toContain("DBMS-201");
    expect(codes).toContain("MATH-202");
  });

  test("8. Multiple students receive independently filtered results from ONE unified timetable", async () => {
    const {
      college,
      course,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      mathSubject,
      coordinator,
    } = await setupFixture();

    const { exam } = await createPublishedExamWithSchedule({
      college,
      course,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
        { ...dbmsSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
        { ...mathSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
      ],
      createdBy: coordinator,
    });

    // Student 1 has backlog in DBMS only
    const { student: s1, agent: a1 } = await setupStudent(college, course, 3, "s1");
    await seedBacklog({ student: s1, college, course, subject: dbmsSubject, status: "OPEN" });

    // Student 2 has backlog in MATH only
    const { student: s2, agent: a2 } = await setupStudent(college, course, 3, "s2");
    await seedBacklog({ student: s2, college, course, subject: mathSubject, status: "ATTEMPTED" });

    // Student 3 has no backlogs
    const { agent: a3 } = await setupStudent(college, course, 3, "s3");

    // Check S1
    const res1 = await a1.get(`/api/exam-schedule/published/${exam._id}`).expect(200);
    const codes1 = res1.body.data.schedule.subjects.map((s) => s.subject.code);
    expect(codes1).toHaveLength(4);
    expect(codes1).toContain("DBMS-201");
    expect(codes1).not.toContain("MATH-202");

    // Check S2
    const res2 = await a2.get(`/api/exam-schedule/published/${exam._id}`).expect(200);
    const codes2 = res2.body.data.schedule.subjects.map((s) => s.subject.code);
    expect(codes2).toHaveLength(4);
    expect(codes2).toContain("MATH-202");
    expect(codes2).not.toContain("DBMS-201");

    // Check S3
    const res3 = await a3.get(`/api/exam-schedule/published/${exam._id}`).expect(200);
    const codes3 = res3.body.data.schedule.subjects.map((s) => s.subject.code);
    expect(codes3).toHaveLength(3);
    expect(codes3).not.toContain("DBMS-201");
    expect(codes3).not.toContain("MATH-202");
  });

  test("9. Cross-college backlog cannot make a paper visible (Strict Tenant Isolation)", async () => {
    const {
      college: collegeA,
      course: courseA,
      osSubject,
      cnSubject,
      seSubject,
      dbmsSubject,
      coordinator,
    } = await setupFixture();

    // Create another college B
    const collegeB = await createCollege({
      code: `CLGB${Date.now()}`,
      email: `collegeB.${Date.now()}@test.com`,
    });

    const { exam } = await createPublishedExamWithSchedule({
      college: collegeA,
      course: courseA,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { ...osSubject.toObject(), category: "REGULAR" },
        { ...cnSubject.toObject(), category: "REGULAR" },
        { ...seSubject.toObject(), category: "REGULAR" },
        { ...dbmsSubject.toObject(), category: "BACKLOG", originalSemester: 2 },
      ],
      createdBy: coordinator,
    });

    // Student enrolled in College A
    const { student: studentInA, agent: agentInA } = await setupStudent(
      collegeA,
      courseA,
      3,
      "studentInA",
    );

    // Seed backlog for studentInA, but under collegeB's ID!
    await seedBacklog({
      student: studentInA,
      college: collegeB, // Different college
      course: courseA,
      subject: dbmsSubject,
      semester: 2,
      status: "OPEN",
    });

    const res = await agentInA
      .get(`/api/exam-schedule/published/${exam._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Student must NOT see DBMS because the backlog belongs to College B!
    expect(res.body.data.schedule.subjects).toHaveLength(3);
    const dbmsEntry = res.body.data.schedule.subjects.find(
      (s) => s.subject.code === "DBMS-201",
    );
    expect(dbmsEntry).toBeUndefined();
  });

  test("10. Published timetable rules remain enforced (Draft rejection & Auth checks)", async () => {
    const { college, course, osSubject, dbmsSubject, coordinator } =
      await setupFixture();

    // Create DRAFT Exam and Schedule
    const draftExam = await Exam.create({
      college_id: college._id,
      name: `Draft Exam ${Date.now()}`,
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { subject: osSubject._id, category: "REGULAR" },
        { subject: dbmsSubject._id, category: "BACKLOG", originalSemester: 2 },
      ],
      status: "DRAFT",
      createdBy: coordinator._id,
    });

    const { agent } = await setupStudent(college, course, 3, "authStudent");

    // Student requesting DRAFT schedule returns 200 with null (not found)
    const resDraft = await agent
      .get(`/api/exam-schedule/published/${draftExam._id}`)
      .expect(200);
    expect(resDraft.body.data).toBeNull();

    // Unauthenticated request gets 401
    await request(app)
      .get(`/api/exam-schedule/published/${draftExam._id}`)
      .expect(401);
  });
});
