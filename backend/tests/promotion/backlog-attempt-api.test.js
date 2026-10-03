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
const Backlog = require("../../src/models/backlog.model");
const BacklogAttempt = require("../../src/models/backlogAttempt.model");
const Exam = require("../../src/models/exam.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const StudentMarks = require("../../src/models/studentMarks.model");

describe("Step 7 — Backlog attempt API integration", () => {
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

  const createBacklogCase = async (currentSemester = 3) => {
    const college = await createCollege({
      code: `ATKT${Date.now()}_${Math.random()}`,
      email: `atkt.${Date.now()}_${Math.random()}@test.com`,
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
      code: `BTECH-${Date.now()}`,
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
      name: "Backlog Subject",
      code: `BL-${Date.now()}`,
      semester: 3,
      credits: 3,
      status: "ACTIVE",
      subjectType: "THEORY",
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
      currentSemester,
      currentAcademicYear: "2026-27",
      email: `student.${Date.now()}_${Math.random()}@test.com`,
    });
    const originalExamId = new mongoose.Types.ObjectId();
    const result = await SemesterResult.create({
      college_id: college._id,
      student_id: student._id,
      exam_id: originalExamId,
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        {
          subject: subject._id,
          subjectName: subject.name,
          subjectCode: subject.code,
          subjectType: "THEORY",
          internalMarks: 10,
          externalMarks: 20,
          totalMarks: 30,
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
      semester: 3,
      academicYear: "2026-27",
      original_exam_id: originalExamId,
      original_result_id: result._id,
      subject_id: subject._id,
      subject_code: subject.code,
      subject_name: subject.name,
      subject_type: "THEORY",
      original_marks_snapshot: {
        internalMarks: 10,
        externalMarks: 20,
        totalMarks: 30,
        status: "FAIL",
      },
      status: "OPEN",
    });

    return {
      college,
      department,
      course,
      subject,
      student,
      backlog,
    };
  };

  it("creates once, returns a clean 201, and reuses the same attempt and exam on repeat", async () => {
    const { college, subject, student, backlog } = await createBacklogCase();
    const { agent } = await createUserSession("COLLEGE_ADMIN", college._id);

    const created = await agent
      .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .send({})
      .expect(201);

    expect(created.body.success).toBe(true);
    expect(created.body.data.attempt._id).toBeDefined();
    expect(created.body.data.exam._id).toBeDefined();
    expect(created.body.data.exam.exam_type).toBe("SUPPLEMENTARY");
    expect(created.body.data.attempt.result_status).toBe("INCOMPLETE");
    expect(created.body.data.idempotent).toBe(false);

    const attemptId = created.body.data.attempt._id;
    const examId = created.body.data.exam._id;

    const history = await agent
      .get(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .expect(200);

    expect(history.body.success).toBe(true);
    expect(history.body.data.backlog._id).toBe(String(backlog._id));
    expect(history.body.data.attempts).toHaveLength(1);
    expect(history.body.data.attempts[0]._id).toBe(attemptId);

    const repeated = await agent
      .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .send({})
      .expect(200);

    expect(repeated.body.data.idempotent).toBe(true);
    expect(repeated.body.data.attempt._id).toBe(attemptId);
    expect(repeated.body.data.exam._id).toBe(examId);
    expect(await BacklogAttempt.countDocuments({ backlog_id: backlog._id })).toBe(
      1,
    );
    expect(await Exam.countDocuments({ _id: examId })).toBe(1);

    const updatedBacklog = await Backlog.findById(backlog._id);
    expect(updatedBacklog.status).toBe("ATTEMPTED");
    expect(updatedBacklog.attempt_count).toBe(1);
    expect(String(updatedBacklog.latest_attempt_id)).toBe(attemptId);
  });

  it("forwards attemptId, evaluates PASS, clears the backlog, and is idempotent", async () => {
    const { college, subject, student, backlog } = await createBacklogCase();
    const { agent: adminAgent } = await createUserSession(
      "COLLEGE_ADMIN",
      college._id,
    );
    const { agent: coordinatorAgent } = await createUserSession(
      "EXAM_COORDINATOR",
      college._id,
    );
    const created = await adminAgent
      .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .send({})
      .expect(201);
    const attemptId = created.body.data.attempt._id;
    const examId = created.body.data.exam._id;

    await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId,
        subjectId: subject._id,
        marks: [
          {
            studentId: student._id,
            internalMarks: 25,
            externalMarks: 60,
          },
        ],
      })
      .expect(200);

    const evaluated = await adminAgent
      .post(
        `/api/promotion/backlogs/${backlog._id}/attempts/${attemptId}/evaluate`,
      )
      .send({})
      .expect(200);

    expect(evaluated.body.data.resultStatus).toBe("PASS");
    expect(evaluated.body.data.passed).toBe(true);
    expect(evaluated.body.data.backlogCleared).toBe(true);
    expect(evaluated.body.data.attempt.result_status).toBe("PASS");

    const updatedBacklog = await Backlog.findById(backlog._id);
    expect(updatedBacklog.status).toBe("CLEARED");
    expect(updatedBacklog.latest_result_status).toBe("PASS");
    expect(await Student.findById(student._id)).toMatchObject({
      currentSemester: 3,
    });

    const repeated = await adminAgent
      .post(
        `/api/promotion/backlogs/${backlog._id}/attempts/${attemptId}/evaluate`,
      )
      .send({})
      .expect(200);

    expect(repeated.body.data.idempotent).toBe(true);
    expect(repeated.body.data.resultStatus).toBe("PASS");
    expect(await BacklogAttempt.countDocuments({ _id: attemptId })).toBe(1);
  });

  it("evaluates FAIL, leaves the backlog OPEN, and is idempotent", async () => {
    const { college, subject, student, backlog } = await createBacklogCase();
    const { agent: adminAgent } = await createUserSession(
      "COLLEGE_ADMIN",
      college._id,
    );
    const { agent: coordinatorAgent } = await createUserSession(
      "EXAM_COORDINATOR",
      college._id,
    );
    const created = await adminAgent
      .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .send({})
      .expect(201);
    const attemptId = created.body.data.attempt._id;

    await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId: created.body.data.exam._id,
        subjectId: subject._id,
        marks: [
          {
            studentId: student._id,
            internalMarks: 5,
            externalMarks: 10,
          },
        ],
      })
      .expect(200);

    const evaluated = await adminAgent
      .post(
        `/api/promotion/backlogs/${backlog._id}/attempts/${attemptId}/evaluate`,
      )
      .send({})
      .expect(200);

    expect(evaluated.body.data.resultStatus).toBe("FAIL");
    expect(evaluated.body.data.passed).toBe(false);
    expect(evaluated.body.data.backlogCleared).toBe(false);

    const updatedBacklog = await Backlog.findById(backlog._id);
    expect(updatedBacklog.status).toBe("OPEN");
    expect(updatedBacklog.latest_result_status).toBe("FAIL");

    const repeated = await adminAgent
      .post(
        `/api/promotion/backlogs/${backlog._id}/attempts/${attemptId}/evaluate`,
      )
      .send({})
      .expect(200);

    expect(repeated.body.data.idempotent).toBe(true);
    expect(repeated.body.data.resultStatus).toBe("FAIL");
  });

  it("shows and accepts marks for a promoted student's supplementary backlog exam", async () => {
    const { college, subject, student, backlog } = await createBacklogCase();
    const { agent: adminAgent } = await createUserSession(
      "COLLEGE_ADMIN",
      college._id,
    );
    const { agent: coordinatorAgent } = await createUserSession(
      "EXAM_COORDINATOR",
      college._id,
    );
    const created = await adminAgent
      .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .send({})
      .expect(201);
    const attemptId = created.body.data.attempt._id;
    const examId = created.body.data.exam._id;

    await Student.findByIdAndUpdate(student._id, {
      currentSemester: 4,
    });

    const roster = await coordinatorAgent
      .get("/api/marks/roster")
      .query({ examId: String(examId), subjectId: String(subject._id) })
      .expect(200);

    expect(roster.body.data.roster.map((entry) => entry.studentId)).toContain(
      String(student._id),
    );

    await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId,
        subjectId: subject._id,
        marks: [
          {
            studentId: student._id,
            internalMarks: 25,
            externalMarks: 60,
          },
        ],
      })
      .expect(200);

    const evaluated = await adminAgent
      .post(
        `/api/promotion/backlogs/${backlog._id}/attempts/${attemptId}/evaluate`,
      )
      .send({})
      .expect(200);

    expect(evaluated.body.data.backlogCleared).toBe(true);
    expect(await Backlog.findById(backlog._id)).toMatchObject({
      status: "CLEARED",
    });
    expect(await Student.findById(student._id)).toMatchObject({
      currentSemester: 4,
    });
  });

  it("rejects unrelated students and subjects for supplementary marks", async () => {
    const { college, course, department, subject, student, backlog } =
      await createBacklogCase();
    const { agent: adminAgent } = await createUserSession(
      "COLLEGE_ADMIN",
      college._id,
    );
    const { agent: coordinatorAgent } = await createUserSession(
      "EXAM_COORDINATOR",
      college._id,
    );
    const created = await adminAgent
      .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .send({})
      .expect(201);
    const examId = created.body.data.exam._id;
    const otherStudent = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      currentSemester: 4,
      email: `other-student.${Date.now()}_${Math.random()}@test.com`,
    });
    const otherSubject = await createSubject({
      college_id: college._id,
      course_id: course._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Unrelated Subject",
      code: `UNRELATED-${Date.now()}`,
      semester: 3,
      credits: 3,
      status: "ACTIVE",
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
    });

    await Student.findByIdAndUpdate(student._id, {
      currentSemester: 4,
    });

    const wrongStudent = await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId,
        subjectId: subject._id,
        marks: [
          {
            studentId: otherStudent._id,
            internalMarks: 25,
            externalMarks: 60,
          },
        ],
      })
      .expect(400);

    expect(wrongStudent.body.error.code).toBe("STUDENT_NOT_ELIGIBLE");

    const wrongSubject = await coordinatorAgent
      .post("/api/marks/bulk")
      .send({
        examId,
        subjectId: otherSubject._id,
        marks: [
          {
            studentId: student._id,
            internalMarks: 25,
            externalMarks: 60,
          },
        ],
      })
      .expect(404);

    expect(wrongSubject.body.error.code).toBe("SUBJECT_NOT_IN_EXAM");
    expect(await StudentMarks.countDocuments({ exam_id: examId })).toBe(0);
  });

  it("keeps regular exam semester validation unchanged", async () => {
    const { college, course, subject, student } = await createBacklogCase(4);
    const { agent } = await createUserSession("EXAM_COORDINATOR", college._id);
    const regularExam = await Exam.create({
      college_id: college._id,
      name: "Regular Semester 3 Examination",
      course_id: course._id,
      semester: 3,
      academicYear: "2026-27",
      exam_type: "REGULAR",
      status: "PUBLISHED",
      subjects: [
        {
          subject: subject._id,
          subjectType: "THEORY",
          internalMaxMarks: 30,
          externalMaxMarks: 70,
          internalPassMarks: 12,
          externalPassMarks: 28,
          passMarks: 40,
        },
      ],
      createdBy: new mongoose.Types.ObjectId(),
    });

    const response = await agent
      .post("/api/marks/bulk")
      .send({
        examId: regularExam._id,
        subjectId: subject._id,
        marks: [
          {
            studentId: student._id,
            internalMarks: 25,
            externalMarks: 60,
          },
        ],
      })
      .expect(400);

    expect(response.body.error.code).toBe("STUDENT_NOT_ELIGIBLE");
  });

  it("rejects an unauthorized role before backlog workflow work starts", async () => {
    const { college, backlog } = await createBacklogCase();
    const { agent } = await createUserSession("TEACHER", college._id);

    const response = await agent
      .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .send({})
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
    expect(await BacklogAttempt.countDocuments({ backlog_id: backlog._id })).toBe(
      0,
    );
  });

  it("rejects cross-college backlog, attempt, and supplementary exam access", async () => {
    const { college: collegeA, backlog } = await createBacklogCase();
    const collegeB = await createCollege({
      code: `COLB${Date.now()}_${Math.random()}`,
      email: `college-b.${Date.now()}_${Math.random()}@test.com`,
    });
    const { agent } = await createUserSession("COLLEGE_ADMIN", collegeB._id);

    const createResponse = await agent
      .post(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .send({})
      .expect(404);

    expect(createResponse.body.error.code).toBe("BACKLOG_NOT_FOUND");

    const getResponse = await agent
      .get(`/api/promotion/backlogs/${backlog._id}/attempts`)
      .expect(404);

    expect(getResponse.body.error.code).toBe("BACKLOG_NOT_FOUND");
    expect(await Exam.countDocuments()).toBe(0);
    expect(collegeA._id.toString()).not.toBe(collegeB._id.toString());
  });
});
