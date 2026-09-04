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
} = require("../helpers/factories");
const app = require("../../app");

describe("SUB-TC-001 — Subject Exam / Marks Configuration", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const setupAdmin = async (collegeId) => {
    const admin = await createUser({
      email: `admin.${Date.now()}.${Math.floor(Math.random() * 1000)}@test.com`,
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: collegeId,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    return { agent, admin };
  };

  const baseSetup = async () => {
    const college = await createCollege({
      code: `SUB${Date.now()}`,
      email: `sub.${Date.now()}@test.com`,
    });
    const { agent } = await setupAdmin(college._id);
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
    return { college, agent, department, course };
  };

  it("1. creates a THEORY subject with valid configuration", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Data Structures",
        code: `DS-${Date.now()}`,
        semester: 3,
        credits: 4,
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
      })
      .expect(201);

    expect(res.body.subject.subjectType).toBe("THEORY");
    expect(res.body.subject.internalMaxMarks).toBe(30);
    expect(res.body.subject.externalMaxMarks).toBe(70);
    expect(res.body.subject.internalPassMarks).toBe(12);
    expect(res.body.subject.externalPassMarks).toBe(28);
  });

  it("2. creates a PRACTICAL subject with valid configuration", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Lab Programming",
        code: `LP-${Date.now()}`,
        semester: 2,
        credits: 2,
        subjectType: "PRACTICAL",
        internalMaxMarks: 100,
        passMarks: 40,
      })
      .expect(201);

    expect(res.body.subject.subjectType).toBe("PRACTICAL");
    expect(res.body.subject.internalMaxMarks).toBe(100);
    expect(res.body.subject.passMarks).toBe(40);
  });

  it("3. creates a COMPOSITE subject with valid configuration", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Composite Subject",
        code: `CMP-${Date.now()}`,
        semester: 4,
        credits: 4,
        subjectType: "COMPOSITE",
        internalMaxMarks: 40,
        externalMaxMarks: 60,
        passMarks: 50,
      })
      .expect(201);

    expect(res.body.subject.subjectType).toBe("COMPOSITE");
    expect(res.body.subject.internalMaxMarks).toBe(40);
    expect(res.body.subject.externalMaxMarks).toBe(60);
    expect(res.body.subject.passMarks).toBe(50);
  });

  it("4. rejects negative marks", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Negative Marks",
        code: `NM-${Date.now()}`,
        semester: 1,
        credits: 2,
        subjectType: "THEORY",
        internalMaxMarks: -30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
      })
      .expect(400);

    expect(res.body.error.code).toBe("NEGATIVE_MARKS");
  });

  it("5. rejects pass marks greater than maximum (THEORY)", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Pass Exceeds Max",
        code: `PEM-${Date.now()}`,
        semester: 1,
        credits: 2,
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 40,
        externalPassMarks: 28,
      })
      .expect(400);

    expect(res.body.error.code).toBe("PASS_EXCEEDS_MAX");
  });

  it("6. rejects internal pass marks greater than internal maximum", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Internal Pass Exceeds",
        code: `IPE-${Date.now()}`,
        semester: 1,
        credits: 2,
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 35,
        externalPassMarks: 28,
      })
      .expect(400);

    expect(res.body.error.code).toBe("PASS_EXCEEDS_MAX");
  });

  it("7. rejects external pass marks greater than external maximum", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "External Pass Exceeds",
        code: `EPE-${Date.now()}`,
        semester: 1,
        credits: 2,
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 80,
      })
      .expect(400);

    expect(res.body.error.code).toBe("PASS_EXCEEDS_MAX");
  });

  it("8. rejects invalid subjectType", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Bad Type",
        code: `BT-${Date.now()}`,
        semester: 1,
        credits: 2,
        subjectType: "LABORATORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
      })
      .expect(400);

    expect(res.body.error.code).toBe("INVALID_SUBJECT_TYPE");
  });

  it("9. updates an existing Subject configuration", async () => {
    const { agent, course } = await baseSetup();

    const created = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Update Me",
        code: `UM-${Date.now()}`,
        semester: 3,
        credits: 4,
        subjectType: "PRACTICAL",
        internalMaxMarks: 100,
        passMarks: 40,
      })
      .expect(201);

    const subjectId = created.body.subject._id;

    const updated = await agent
      .put(`/api/subjects/${subjectId}`)
      .send({
        subjectType: "COMPOSITE",
        internalMaxMarks: 40,
        externalMaxMarks: 60,
        passMarks: 50,
      })
      .expect(200);

    expect(updated.body.subjectType).toBe("COMPOSITE");
    expect(updated.body.internalMaxMarks).toBe(40);
    expect(updated.body.externalMaxMarks).toBe(60);
    expect(updated.body.passMarks).toBe(50);
  });

  it("10. reads a Subject and returns the configuration", async () => {
    const { agent, course } = await baseSetup();

    const created = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Read Me",
        code: `RM-${Date.now()}`,
        semester: 3,
        credits: 4,
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
      })
      .expect(201);

    const subjectId = created.body.subject._id;

    const byId = await agent.get(`/api/subjects/${subjectId}`).expect(200);
    expect(byId.body.subjectType).toBe("THEORY");
    expect(byId.body.internalPassMarks).toBe(12);

    const byCourse = await agent
      .get(`/api/subjects/course/${course._id}`)
      .expect(200);
    const found = byCourse.body.find((s) => s._id === subjectId);
    expect(found.subjectType).toBe("THEORY");
    expect(found.externalMaxMarks).toBe(70);
  });

  it("11. creates a Subject without exam configuration (backward compatibility)", async () => {
    const { agent, course } = await baseSetup();

    const res = await agent
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Legacy Subject",
        code: `LS-${Date.now()}`,
        semester: 3,
        credits: 4,
      })
      .expect(201);

    expect(res.body.subject.subjectType).toBeUndefined();
    expect(res.body.subject.internalMaxMarks).toBeUndefined();
  });

  it("12. blocks cross-college update and read", async () => {
    const { agent: agentA, course: courseA, college: collegeA } =
      await baseSetup();

    const collegeB = await createCollege({
      code: `SUBB${Date.now()}`,
      email: `subb.${Date.now()}@test.com`,
    });
    const { agent: agentB } = await setupAdmin(collegeB._id);
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

    const created = await agentB
      .post("/api/subjects")
      .send({
        course_id: courseB._id,
        name: "Other College Subject",
        code: `OCS-${Date.now()}`,
        semester: 3,
        credits: 4,
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
      })
      .expect(201);

    const subjectId = created.body.subject._id;

    // College A cannot update College B's subject
    const updateRes = await agentA
      .put(`/api/subjects/${subjectId}`)
      .send({ subjectType: "PRACTICAL", internalMaxMarks: 100, passMarks: 40 })
      .expect(404);
    expect(updateRes.body.error.code).toBe("SUBJECT_NOT_FOUND");

    // College A cannot read College B's subject
    const readRes = await agentA.get(`/api/subjects/${subjectId}`).expect(404);
    expect(readRes.body.error || readRes.body.message).toBeDefined();
  });

  it("13. enforces existing Subject RBAC (TEACHER cannot create)", async () => {
    const { college, course } = await baseSetup();

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
      .post("/api/subjects")
      .send({
        course_id: course._id,
        name: "Teacher Create Attempt",
        code: `TCA-${Date.now()}`,
        semester: 3,
        credits: 4,
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
      })
      .expect(403);

    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });
});
