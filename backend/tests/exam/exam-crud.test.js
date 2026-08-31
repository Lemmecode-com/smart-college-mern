const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { createCollege, createUser, createDepartment, createCourse, createSubject } = require("../helpers/factories");
const app = require("../../app");

describe("EXM-TC-002 — Exam CRUD operations", () => {
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

  const baseSetup = async () => {
    const college = await createCollege({
      code: `EXM${Date.now()}`,
      email: `exam.${Date.now()}@test.com`,
    });
    const { agent } = await setupCoordinator(college._id);
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
    const subject1 = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Data Structures",
      code: `DS-${Date.now()}`,
      semester: 3,
      credits: 4,
    });
    const subject2 = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Database Systems",
      code: `DB-${Date.now()}`,
      semester: 3,
      credits: 3,
    });
    const subject3 = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Operating Systems",
      code: `OS-${Date.now()}`,
      semester: 5,
      credits: 4,
    });

    return { college, agent, department, course, subject1, subject2, subject3 };
  };

  it("1. EXAM_COORDINATOR can create a valid Exam", async () => {
    const { agent, course, subject1, subject2 } = await baseSetup();

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Mid-Term Examination",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id, subject2._id],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.exam.name).toBe("Mid-Term Examination");
    expect(res.body.exam.status).toBe("DRAFT");
    expect(res.body.exam.subjects).toHaveLength(2);
    expect(res.body.exam.college_id).toBeDefined();
  });

  it("2. unauthenticated user cannot create Exam", async () => {
    const res = await request(app).post("/api/exam").send({
      name: "Test Exam",
      course_id: new mongoose.Types.ObjectId(),
      semester: 1,
      academicYear: "2026-27",
      subjects: [],
    });
    expect(res.status).toBe(401);
  });

  it("3. unauthorized role (TEACHER) cannot create Exam", async () => {
    const college = await createCollege({
      code: `EXM${Date.now()}`,
      email: `exam.${Date.now()}@test.com`,
    });
    const teacher = await createUser({
      email: `teacher.${Date.now()}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: teacher.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: new mongoose.Types.ObjectId(),
        semester: 1,
        academicYear: "2026-27",
        subjects: [],
      })
      .expect(403);

    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("4. Exam without name is rejected", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/exam")
      .send({
        name: "",
        course_id: course._id,
        semester: 1,
        academicYear: "2026-27",
        subjects: [],
      })
      .expect(400);

    expect(res.body.error.code).toBe("INVALID_EXAM_NAME");
  });

  it("5. Exam without course is rejected", async () => {
    const { agent } = await baseSetup();

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: "",
        semester: 1,
        academicYear: "2026-27",
        subjects: [],
      })
      .expect(400);

    expect(res.body.error.code).toBe("COURSE_REQUIRED");
  });

  it("6. Exam without semester is rejected", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: course._id,
        semester: "",
        academicYear: "2026-27",
        subjects: [],
      })
      .expect(400);

    expect(res.body.error.code).toBe("SEMESTER_REQUIRED");
  });

  it("7. Exam without subjects is rejected", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: course._id,
        semester: 1,
        academicYear: "2026-27",
        subjects: [],
      })
      .expect(400);

    expect(res.body.error.code).toBe("NO_SUBJECTS_SELECTED");
  });

  it("8. duplicate subjects are rejected", async () => {
    const { agent, course, subject1 } = await baseSetup();

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id, subject1._id],
      })
      .expect(400);

    expect(res.body.error.code).toBe("DUPLICATE_SUBJECT");
  });

  it("9. Subject from another course is rejected", async () => {
    const { agent, course, subject1 } = await baseSetup();
    const college = await createCollege({
      code: `EXM${Date.now()}`,
      email: `exam.${Date.now()}@test.com`,
    });
    const { agent: agentB } = await setupCoordinator(college._id);
    const deptB = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Mechanical",
      code: "ME",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
    });
    const courseB = await createCourse({
      college_id: college._id,
      department_id: deptB._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech ME",
      code: "BTECH-ME",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });
    const otherCourseSubject = await createSubject({
      college_id: college._id,
      course_id: courseB._id,
      department_id: deptB._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Thermodynamics",
      code: `TH-${Date.now()}`,
      semester: 3,
      credits: 4,
    });

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id, otherCourseSubject._id],
      })
      .expect(404);

    expect(res.body.error.code).toBe("SUBJECT_NOT_FOUND");
  });

  it("10. Subject from another semester is rejected", async () => {
    const { agent, course, subject1, subject3 } = await baseSetup();

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id, subject3._id],
      })
      .expect(400);

    expect(res.body.error.code).toBe("INVALID_SUBJECT_SEMESTER");
  });

  it("11. Subject from another college is rejected", async () => {
    const { agent, course, subject1 } = await baseSetup();
    const collegeB = await createCollege({
      code: `EXM${Date.now()}`,
      email: `exam.${Date.now()}@test.com`,
    });
    const { agent: agentB } = await setupCoordinator(collegeB._id);
    const deptB = await createDepartment({
      college_id: collegeB._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Mechanical",
      code: "ME",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
    });
    const courseB = await createCourse({
      college_id: collegeB._id,
      department_id: deptB._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech ME",
      code: "BTECH-ME",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });
    const otherCollegeSubject = await createSubject({
      college_id: collegeB._id,
      course_id: courseB._id,
      department_id: deptB._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Other College Subject",
      code: `OCS-${Date.now()}`,
      semester: 3,
      credits: 4,
    });

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id, otherCollegeSubject._id],
      })
      .expect(404);

    expect(res.body.error.code).toBe("SUBJECT_NOT_FOUND");
  });

  it("12. Course from another college is rejected", async () => {
    const { agent } = await baseSetup();
    const collegeB = await createCollege({
      code: `EXM${Date.now()}`,
      email: `exam.${Date.now()}@test.com`,
    });
    const deptB = await createDepartment({
      college_id: collegeB._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Mechanical",
      code: "ME",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
    });
    const courseB = await createCourse({
      college_id: collegeB._id,
      department_id: deptB._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech ME",
      code: "BTECH-ME",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });

    const res = await agent
      .post("/api/exam")
      .send({
        name: "Test Exam",
        course_id: courseB._id,
        semester: 1,
        academicYear: "2026-27",
        subjects: [],
      })
      .expect(404);

    expect(res.body.error.code).toBe("COURSE_NOT_FOUND");
  });

  it("13. valid Exam can be retrieved", async () => {
    const { agent, course, subject1, subject2 } = await baseSetup();

    const created = await agent
      .post("/api/exam")
      .send({
        name: "Mid-Term Examination",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id, subject2._id],
      })
      .expect(201);

    const examId = created.body.exam._id;

    const res = await agent.get(`/api/exam/${examId}`).expect(200);
    expect(res.body.name).toBe("Mid-Term Examination");
    expect(res.body.subjects).toHaveLength(2);
  });

  it("14. cross-college Exam retrieval is blocked", async () => {
    const { agent, course, subject1 } = await baseSetup();

    const created = await agent
      .post("/api/exam")
      .send({
        name: "Mid-Term Examination",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id],
      })
      .expect(201);

    const examId = created.body.exam._id;

    const collegeB = await createCollege({
      code: `EXM${Date.now()}`,
      email: `exam.${Date.now()}@test.com`,
    });
    const { agent: agentB } = await setupCoordinator(collegeB._id);

    const res = await agentB.get(`/api/exam/${examId}`).expect(404);
    expect(res.body.message).toBeDefined();
  });

  it("15. EXAM_COORDINATOR can update a valid Exam", async () => {
    const { agent, course, subject1, subject2 } = await baseSetup();

    const created = await agent
      .post("/api/exam")
      .send({
        name: "Mid-Term Examination",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id],
      })
      .expect(201);

    const examId = created.body.exam._id;

    const updated = await agent
      .put(`/api/exam/${examId}`)
      .send({
        name: "Final Term Examination",
        subjects: [subject1._id, subject2._id],
      })
      .expect(200);

    expect(updated.body.name).toBe("Final Term Examination");
    expect(updated.body.subjects).toHaveLength(2);
  });

  it("16. invalid subject relationship on update is rejected", async () => {
    const { agent, course, subject1, subject3 } = await baseSetup();

    const created = await agent
      .post("/api/exam")
      .send({
        name: "Mid-Term Examination",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id],
      })
      .expect(201);

    const examId = created.body.exam._id;

    const res = await agent
      .put(`/api/exam/${examId}`)
      .send({
        subjects: [subject1._id, subject3._id],
      })
      .expect(400);

    expect(res.body.error.code).toBe("INVALID_SUBJECT_SEMESTER");
  });

  it("17. EXAM_CREATED AuditLog is created on successful Exam creation", async () => {
    const { agent, course, subject1 } = await baseSetup();

    const created = await agent
      .post("/api/exam")
      .send({
        name: "Audit Test Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id],
      })
      .expect(201);

    const examId = created.body.exam._id;

    const AuditLog = require("../../src/models/auditLog.model");
    const log = await AuditLog.findOne({
      resourceType: "Exam",
      resourceId: examId,
      action: "EXAM_CREATED",
    });

    expect(log).toBeDefined();
    expect(log.metadata).toBeDefined();
    const metadataValue = log.metadata?.name || log.metadata?.get?.('name');
    expect(metadataValue).toBe("Audit Test Exam");
    expect(log.metadata.subjectCount || log.metadata?.get?.('subjectCount')).toBe(1);
  });

  it("18. existing Subject configuration remains unchanged after Exam creation", async () => {
    const { agent, course, subject1 } = await baseSetup();

    const originalType = subject1.subjectType;
    const originalInternalMax = subject1.internalMaxMarks;

    await agent
      .post("/api/exam")
      .send({
        name: "Config Test Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject1._id],
      })
      .expect(201);

    const Subject = require("../../src/models/subject.model");
    const refreshed = await Subject.findById(subject1._id);
    expect(refreshed.subjectType).toBe(originalType);
    expect(refreshed.internalMaxMarks).toBe(originalInternalMax);
  });
});
