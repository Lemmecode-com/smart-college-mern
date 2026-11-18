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
const Backlog = require("../../src/models/backlog.model");
const Exam = require("../../src/models/exam.model");
const app = require("../../app");

describe("EXM-TC-003 — Backlog Subjects Support in Exam Schema & Coordinator Flow", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const setupCoordinator = async (collegeId) => {
    const coordinator = await createUser({
      email: `coordinator.${Date.now()}.${Math.floor(Math.random() * 1000)}@test.com`,
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

  const setupBaseData = async () => {
    const college = await createCollege({
      code: `EXM${Date.now()}`,
      email: `exam.${Date.now()}@test.com`,
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

    // Semester 2 subject (Backlog candidate for Sem 3 exam)
    const sem2Subject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "DBMS",
      code: `DBMS-${Date.now()}`,
      semester: 2,
      credits: 4,
    });

    // Semester 3 subjects (Regular candidate for Sem 3 exam)
    const sem3Subject1 = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Data Structures",
      code: `DS-${Date.now()}`,
      semester: 3,
      credits: 4,
    });
    const sem3Subject2 = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Operating Systems",
      code: `OS-${Date.now()}`,
      semester: 3,
      credits: 4,
    });

    // Semester 4 subject
    const sem4Subject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Computer Networks",
      code: `CN-${Date.now()}`,
      semester: 4,
      credits: 4,
    });

    // Helper to seed student with valid factory
    const buildStudent = async (rollNo) => {
      return createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
        admissionYear: 2025,
        email: `student.${rollNo}.${Date.now()}@test.com`,
      });
    };

    // Helper to seed active backlog
    const seedBacklog = async (student, subject, sem = 2, status = "OPEN") => {
      return Backlog.create({
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        semester: sem,
        academicYear: "2025-26",
        original_exam_id: new mongoose.Types.ObjectId(),
        original_result_id: new mongoose.Types.ObjectId(),
        subject_id: subject._id,
        subject_code: subject.code,
        subject_name: subject.name,
        subject_type: "THEORY",
        original_marks_snapshot: { totalMarks: 25, status: "FAIL" },
        status,
        attempt_count: 0,
      });
    };

    return {
      college,
      agent,
      coordinator,
      department,
      course,
      sem2Subject,
      sem3Subject1,
      sem3Subject2,
      sem4Subject,
      buildStudent,
      seedBacklog,
    };
  };

  test("1. EXAM_COORDINATOR can create Exam with both REGULAR and BACKLOG subjects", async () => {
    const { agent, course, sem2Subject, sem3Subject1, buildStudent, seedBacklog } =
      await setupBaseData();

    const student = await buildStudent("101");
    await seedBacklog(student, sem2Subject, 2, "OPEN");

    const payload = {
      name: "Semester 3 Regular & Backlog Exam",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        {
          subject: sem3Subject1._id.toString(),
          category: "REGULAR",
          originalSemester: 3,
        },
        {
          subject: sem2Subject._id.toString(),
          category: "BACKLOG",
          originalSemester: 2,
        },
      ],
    };

    const res = await agent.post("/api/exam").send(payload).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.exam).toBeDefined();
    expect(res.body.exam.subjects).toHaveLength(2);

    const regularSub = res.body.exam.subjects.find(
      (s) => String(s.subject) === String(sem3Subject1._id),
    );
    expect(regularSub).toBeDefined();
    expect(regularSub.category).toBe("REGULAR");
    expect(regularSub.originalSemester).toBe(3);

    const backlogSub = res.body.exam.subjects.find(
      (s) => String(s.subject) === String(sem2Subject._id),
    );
    expect(backlogSub).toBeDefined();
    expect(backlogSub.category).toBe("BACKLOG");
    expect(backlogSub.originalSemester).toBe(2);
  });

  test("2. Legacy exam creation with raw IDs defaults category to REGULAR and originalSemester", async () => {
    const { agent, course, sem3Subject1, sem3Subject2 } = await setupBaseData();

    const payload = {
      name: "Semester 3 Regular Only Legacy Format",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [sem3Subject1._id.toString(), sem3Subject2._id.toString()],
    };

    const res = await agent.post("/api/exam").send(payload).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.exam.subjects).toHaveLength(2);
    res.body.exam.subjects.forEach((sub) => {
      expect(sub.category).toBe("REGULAR");
      expect(sub.originalSemester).toBe(3);
    });
  });

  test("3. Backlog subject must belong to an earlier semester (rejects sem >= exam.semester with INVALID_BACKLOG_SEMESTER)", async () => {
    const { agent, course, sem3Subject1, sem4Subject, buildStudent, seedBacklog } =
      await setupBaseData();

    const student = await buildStudent("102");
    await seedBacklog(student, sem3Subject1, 3, "OPEN");

    // Attempting to mark a same-semester (3) subject as BACKLOG for a semester 3 exam
    const sameSemPayload = {
      name: "Invalid Backlog Same Semester",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        {
          subject: sem3Subject1._id.toString(),
          category: "BACKLOG",
        },
      ],
    };

    const res1 = await agent.post("/api/exam").send(sameSemPayload).expect(400);
    expect(res1.body.error.code).toBe("INVALID_BACKLOG_SEMESTER");

    // Attempting to mark a future-semester (4) subject as BACKLOG for a semester 3 exam
    const futureSemPayload = {
      name: "Invalid Backlog Future Semester",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        {
          subject: sem4Subject._id.toString(),
          category: "BACKLOG",
        },
      ],
    };

    const res2 = await agent.post("/api/exam").send(futureSemPayload).expect(400);
    expect(res2.body.error.code).toBe("INVALID_BACKLOG_SEMESTER");
  });

  test("4. Backlog subject without active OPEN/ATTEMPTED backlog record is rejected (NO_ACTIVE_BACKLOG_FOR_SUBJECT)", async () => {
    const { agent, course, sem2Subject, sem3Subject1 } = await setupBaseData();

    // sem2Subject has no backlog documents in Backlog collection
    const payload = {
      name: "Arbitrary Previous Subject Backlog",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { subject: sem3Subject1._id.toString(), category: "REGULAR" },
        { subject: sem2Subject._id.toString(), category: "BACKLOG" },
      ],
    };

    const res = await agent.post("/api/exam").send(payload).expect(400);
    expect(res.body.error.code).toBe("NO_ACTIVE_BACKLOG_FOR_SUBJECT");
  });

  test("5. Backlog subject with only CLEARED status is rejected (NO_ACTIVE_BACKLOG_FOR_SUBJECT)", async () => {
    const { agent, course, sem2Subject, sem3Subject1, buildStudent, seedBacklog } =
      await setupBaseData();

    const student = await buildStudent("103");
    // Seed backlog with status CLEARED
    await seedBacklog(student, sem2Subject, 2, "CLEARED");

    const payload = {
      name: "Cleared Backlog Subject",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { subject: sem3Subject1._id.toString(), category: "REGULAR" },
        { subject: sem2Subject._id.toString(), category: "BACKLOG" },
      ],
    };

    const res = await agent.post("/api/exam").send(payload).expect(400);
    expect(res.body.error.code).toBe("NO_ACTIVE_BACKLOG_FOR_SUBJECT");
  });

  test("6. Invalid category values are rejected with INVALID_SUBJECT_CATEGORY", async () => {
    const { agent, course, sem3Subject1 } = await setupBaseData();

    const payload = {
      name: "Invalid Category Exam",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { subject: sem3Subject1._id.toString(), category: "SPECIAL_BACKLOG" },
      ],
    };

    const res = await agent.post("/api/exam").send(payload).expect(400);
    expect(res.body.error.code).toBe("INVALID_SUBJECT_CATEGORY");
  });

  test("7. Duplicate subject references are rejected with DUPLICATE_SUBJECT", async () => {
    const { agent, course, sem3Subject1 } = await setupBaseData();

    const payload = {
      name: "Duplicate Subject Exam",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { subject: sem3Subject1._id.toString(), category: "REGULAR" },
        { subject: sem3Subject1._id.toString(), category: "REGULAR" },
      ],
    };

    const res = await agent.post("/api/exam").send(payload).expect(400);
    expect(res.body.error.code).toBe("DUPLICATE_SUBJECT");
  });

  test("8. Cross-tenant subject access is blocked with SUBJECT_NOT_FOUND (404)", async () => {
    const { agent, course, sem3Subject1 } = await setupBaseData();

    // Create another college with a subject
    const otherCollege = await createCollege({
      code: `OTH${Date.now()}`,
      email: `other.${Date.now()}@test.com`,
    });
    const otherDept = await createDepartment({
      college_id: otherCollege._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Other Dept",
      code: "OD",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2020,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 30,
    });
    const otherCourse = await createCourse({
      college_id: otherCollege._id,
      department_id: otherDept._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Other Course",
      code: "OC",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });
    const otherCollegeSubject = await createSubject({
      college_id: otherCollege._id,
      course_id: otherCourse._id,
      department_id: otherDept._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Cross Tenant Subject",
      code: `CT-${Date.now()}`,
      semester: 2,
      credits: 3,
    });

    const payload = {
      name: "Cross Tenant Exam",
      course_id: course._id.toString(),
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        { subject: sem3Subject1._id.toString(), category: "REGULAR" },
        { subject: otherCollegeSubject._id.toString(), category: "BACKLOG" },
      ],
    };

    const res = await agent.post("/api/exam").send(payload).expect(404);
    expect(res.body.error.code).toBe("SUBJECT_NOT_FOUND");
  });

  test("9. GET /api/exam/eligible-backlog-subjects returns active open backlogs with student counts", async () => {
    const {
      agent,
      course,
      sem2Subject,
      buildStudent,
      seedBacklog,
    } = await setupBaseData();

    // 2 students with backlog in sem2Subject
    const student1 = await buildStudent("201");
    const student2 = await buildStudent("202");
    await seedBacklog(student1, sem2Subject, 2, "OPEN");
    await seedBacklog(student2, sem2Subject, 2, "ATTEMPTED");

    const res = await agent
      .get(
        `/api/exam/eligible-backlog-subjects?course_id=${course._id}&semester=3`,
      )
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const item = res.body.data[0];
    expect(String(item._id)).toBe(String(sem2Subject._id));
    expect(item.name).toBe(sem2Subject.name);
    expect(item.code).toBe(sem2Subject.code);
    expect(item.category).toBe("BACKLOG");
    expect(item.originalSemester).toBe(2);
    expect(item.studentCount).toBe(2);
  });

  test("10. GET /api/exam/eligible-backlog-subjects returns empty array for semester 1", async () => {
    const { agent, course } = await setupBaseData();

    const res = await agent
      .get(
        `/api/exam/eligible-backlog-subjects?course_id=${course._id}&semester=1`,
      )
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  test("11. GET /api/exam/eligible-backlog-subjects enforces EXAM_COORDINATOR role", async () => {
    const { college, course } = await setupBaseData();

    // Create a TEACHER user
    const teacher = await createUser({
      email: `teacher.${Date.now()}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacher.email, password: "Test@123" })
      .expect(200);

    const res = await teacherAgent
      .get(
        `/api/exam/eligible-backlog-subjects?course_id=${course._id}&semester=3`,
      )
      .expect(403);

    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  test("12. GET /api/exam/eligible-backlog-subjects isolates by college tenant", async () => {
    const { course, sem2Subject, buildStudent, seedBacklog } =
      await setupBaseData();

    const student = await buildStudent("301");
    await seedBacklog(student, sem2Subject, 2, "OPEN");

    // Other college coordinator
    const otherCollege = await createCollege({
      code: `TEN${Date.now()}`,
      email: `tenant.${Date.now()}@test.com`,
    });
    const { agent: otherAgent } = await setupCoordinator(otherCollege._id);

    // Requesting with other agent should not find the course (404)
    const res = await otherAgent
      .get(
        `/api/exam/eligible-backlog-subjects?course_id=${course._id}&semester=3`,
      )
      .expect(404);

    expect(res.body.error.code).toBe("COURSE_NOT_FOUND");
  });

  test("13. EXAM_COORDINATOR can update Exam with backlog subjects and relationships are validated", async () => {
    const {
      agent,
      course,
      sem2Subject,
      sem3Subject1,
      sem3Subject2,
      buildStudent,
      seedBacklog,
    } = await setupBaseData();

    const student = await buildStudent("401");
    await seedBacklog(student, sem2Subject, 2, "OPEN");

    // Create initially with regular subjects only
    const createRes = await agent
      .post("/api/exam")
      .send({
        name: "Initial Exam",
        course_id: course._id.toString(),
        semester: 3,
        academicYear: "2026-27",
        subjects: [sem3Subject1._id.toString()],
      })
      .expect(201);

    const examId = createRes.body.exam._id;

    // Update to add sem2Subject as BACKLOG and sem3Subject2 as REGULAR
    const updateRes = await agent
      .put(`/api/exam/${examId}`)
      .send({
        name: "Updated Exam with Backlog",
        subjects: [
          { subject: sem3Subject1._id.toString(), category: "REGULAR" },
          { subject: sem3Subject2._id.toString(), category: "REGULAR" },
          { subject: sem2Subject._id.toString(), category: "BACKLOG" },
        ],
      })
      .expect(200);

    expect(updateRes.body.name).toBe("Updated Exam with Backlog");
    expect(updateRes.body.subjects).toHaveLength(3);

    const backlogEntry = updateRes.body.subjects.find(
      (s) => String(s.subject._id || s.subject) === String(sem2Subject._id),
    );
    expect(backlogEntry).toBeDefined();
    expect(backlogEntry.category).toBe("BACKLOG");
    expect(backlogEntry.originalSemester).toBe(2);
  });
});
