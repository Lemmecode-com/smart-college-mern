const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { createCollege, createUser, createDepartment, createCourse, createSubject, createStudent, createTeacher } = require("../helpers/factories");
const app = require("../../app");

describe("MARKS — StudentMarks operations", () => {
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

  const setupTeacher = async (collegeId, departmentId) => {
    const teacherUser = await createUser({
      email: `teacher.${Date.now()}.${Math.floor(Math.random() * 1000)}@test.com`,
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

  const baseSetup = async () => {
    const college = await createCollege({
      code: `MRK${Date.now()}`,
      email: `marks.${Date.now()}@test.com`,
    });
    const { agent: coordinatorAgent, coordinator } = await setupCoordinator(college._id);

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

    const subject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Data Structures",
      code: `DS-${Date.now()}`,
      semester: 3,
      credits: 4,
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
    });

    const exam = await coordinatorAgent
      .post("/api/exam")
      .send({
        name: "Mid-Term Examination",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject._id],
      })
      .expect(201);

    const student1 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      currentSemester: 3,
    });

    const student2 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      currentSemester: 3,
    });

    const { agent: teacherAgent, teacher } = await setupTeacher(college._id, department._id);

    return {
      college,
      coordinatorAgent,
      coordinator,
      department,
      course,
      subject,
      exam: exam.body.exam,
      student1,
      student2,
      teacherAgent,
      teacher,
    };
  };

  it("1. coordinator can get student roster for exam subject", async () => {
    const { coordinatorAgent, exam, subject } = await baseSetup();

    const res = await coordinatorAgent
      .get("/api/marks/roster")
      .query({ examId: exam._id, subjectId: subject._id })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalStudents).toBe(2);
    expect(res.body.data.roster).toHaveLength(2);
  });

  it("2. teacher can get student roster for their own subject", async () => {
    const { teacherAgent, exam, subject } = await baseSetup();

    await Subject.findByIdAndUpdate(subject._id, { teacher_id: subject.teacher_id });

    const res = await teacherAgent
      .get("/api/marks/roster")
      .query({ examId: exam._id, subjectId: subject._id })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalStudents).toBe(2);
  });

  it("3. teacher cannot get roster for another teacher's subject", async () => {
    const { teacherAgent, exam, subject, college, department } = await baseSetup();

    const otherTeacher = await createTeacher({
      college_id: college._id,
      department_id: department._id,
      user_id: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
    });

    await Subject.findByIdAndUpdate(subject._id, { teacher_id: otherTeacher._id });

    const res = await teacherAgent
      .get("/api/marks/roster")
      .query({ examId: exam._id, subjectId: subject._id })
      .expect(403);

    expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
  });

  it("4. unauthenticated user cannot access marks", async () => {
    const res = await request(app).get("/api/marks/roster");
    expect(res.status).toBe(401);
  });

  it("5. unauthorized role (STUDENT) cannot access marks", async () => {
    const college = await createCollege({
      code: `MRK${Date.now()}`,
      email: `marks.${Date.now()}@test.com`,
    });
    const studentUser = await createUser({
      email: `student.${Date.now()}@test.com`,
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    const res = await agent.get("/api/marks/roster");
    expect(res.status).toBe(403);
  });

  it("6. coordinator can save marks (MARKS_ENTERED AuditLog)", async () => {
    const { coordinatorAgent, exam, subject, student1, student2 } = await baseSetup();

    const res = await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId: exam._id,
        subjectId: subject._id,
        marks: [
          { studentId: student1._id, internalMarks: 25, externalMarks: 60 },
          { studentId: student2._id, internalMarks: 20, externalMarks: 55 },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const AuditLog = require("../../src/models/auditLog.model");
    const logs = await AuditLog.find({
      action: "MARKS_ENTERED",
      resourceType: "StudentMarks",
    });
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it("7. coordinator can update existing marks (MARKS_UPDATED AuditLog)", async () => {
    const { coordinatorAgent, exam, subject, student1 } = await baseSetup();

    await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId: exam._id,
        subjectId: subject._id,
        marks: [
          { studentId: student1._id, internalMarks: 25, externalMarks: 60 },
        ],
      })
      .expect(200);

    const res = await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId: exam._id,
        subjectId: subject._id,
        marks: [
          { studentId: student1._id, internalMarks: 28, externalMarks: 65 },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0].internalMarks).toBe(28);
    expect(res.body.data[0].externalMarks).toBe(65);

    const AuditLog = require("../../src/models/auditLog.model");
    const updateLogs = await AuditLog.find({
      action: "MARKS_UPDATED",
      resourceType: "StudentMarks",
    });
    expect(updateLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("8. negative marks are rejected", async () => {
    const { coordinatorAgent, exam, subject, student1 } = await baseSetup();

    const res = await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId: exam._id,
        subjectId: subject._id,
        marks: [
          { studentId: student1._id, internalMarks: -5, externalMarks: 60 },
        ],
      })
      .expect(400);

    expect(res.body.error.code).toBe("NEGATIVE_INTERNAL_MARKS");
  });

  it("9. marks exceeding max are rejected for THEORY", async () => {
    const { coordinatorAgent, exam, subject, student1 } = await baseSetup();

    const res = await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId: exam._id,
        subjectId: subject._id,
        marks: [
          { studentId: student1._id, internalMarks: 35, externalMarks: 80 },
        ],
      })
      .expect(400);

    expect(res.body.error.code).toBe("INTERNAL_MARKS_EXCEED_MAX");
  });

  it("10. external marks not applicable for PRACTICAL", async () => {
    const { coordinatorAgent, exam, subject, college, department, course } = await baseSetup();

    const practicalSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Lab Work",
      code: `LW-${Date.now()}`,
      semester: 3,
      credits: 2,
      subjectType: "PRACTICAL",
      internalMaxMarks: 50,
      passMarks: 25,
    });

    const practicalExam = await coordinatorAgent
      .post("/api/exam")
      .send({
        name: "Practical Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [practicalSubject._id],
      })
      .expect(201);

    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      currentSemester: 3,
    });

    const res = await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId: practicalExam.body.exam._id,
        subjectId: practicalSubject._id,
        marks: [
          { studentId: student._id, internalMarks: 40, externalMarks: 10 },
        ],
      })
      .expect(400);

    expect(res.body.error.code).toBe("EXTERNAL_MARKS_NOT_APPLICABLE");
  });

  it("11. ineligible student is rejected", async () => {
    const { coordinatorAgent, exam, subject, college, department, course } = await baseSetup();

    const otherCourse = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech ME",
      code: "BTECH-ME",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
    });

    const otherStudent = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: otherCourse._id,
      createdBy: new mongoose.Types.ObjectId(),
      currentSemester: 3,
    });

    const res = await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId: exam._id,
        subjectId: subject._id,
        marks: [
          { studentId: otherStudent._id, internalMarks: 25, externalMarks: 60 },
        ],
      })
      .expect(400);

    expect(res.body.error.code).toBe("STUDENT_NOT_ELIGIBLE");
  });

  it("12. cross-college marks access is blocked", async () => {
    const { exam, subject } = await baseSetup();

    const collegeB = await createCollege({
      code: `MRK${Date.now()}`,
      email: `marksb.${Date.now()}@test.com`,
    });
    const { agent: agentB } = await setupCoordinator(collegeB._id);

    const res = await agentB
      .get("/api/marks/roster")
      .query({ examId: exam._id, subjectId: subject._id })
      .expect(404);

    expect(res.body.message).toBeDefined();
  });
});
