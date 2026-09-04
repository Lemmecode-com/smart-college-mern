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
const Subject = require("../../src/models/subject.model");
const Student = require("../../src/models/student.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const StudentMarks = require("../../src/models/studentMarks.model");
const AuditLog = require("../../src/models/auditLog.model");
const { calculateOverallResult } = require("../../src/services/semesterResult.service");
const app = require("../../app");

describe("STEP 7 — Result Review + Lock / Unlock / Publish", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ---- Helpers -----------------------------------------------------------

  const setupCoordinator = async (collegeId) => {
    const coordinator = await createUser({
      email: `coord.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
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
      email: `teacher.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
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

  const setupStudent = async (collegeId) => {
    const studentUser = await createUser({
      email: `student.${Date.now()}.${Math.floor(Math.random() * 1000000)}@test.com`,
      password: "Test@123",
      role: "STUDENT",
      college_id: collegeId,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    return { agent, studentUser };
  };

  const baseSetup = async () => {
    const college = await createCollege({
      code: `LCK${Date.now()}`,
      email: `lck.${Date.now()}@test.com`,
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
      startYear: 2021,
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
      name: "Theory Subject",
      code: `TH-${Date.now()}`,
      semester: 3,
      credits: 4,
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
      passMarks: 40,
    });

    const createdExam = await agent
      .post("/api/exam")
      .send({
        name: "Semester 3 Exam",
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject._id],
      })
      .expect(201);

    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      createdBy: new mongoose.Types.ObjectId(),
      fullName: "Student One",
      email: `sone.${Date.now()}@test.com`,
      currentSemester: 3,
      status: "APPROVED",
    });

    return {
      college,
      agent,
      coordinator,
      department,
      course,
      subject,
      exam: createdExam.body.exam,
      student,
    };
  };

  /** Generate a DRAFT result for a student and return its id. */
  const generateResult = async (agent, examId, studentId) => {
    const res = await agent
      .post("/api/results/generate")
      .send({ examId, studentId })
      .expect(200);
    return res.body.data._id;
  };

  const enterMarks = async (agent, examId, subjectId, entries) =>
    agent
      .post("/api/marks/bulk")
      .send({ examId, subjectId, marks: entries })
      .expect(200);

  const lockResult = (agent, resultId) =>
    agent.post(`/api/results/${resultId}/lock`);

  const unlockResult = (agent, resultId, body = {}) =>
    agent.post(`/api/results/${resultId}/unlock`).send(body);

  const publishResult = (agent, resultId) =>
    agent.post(`/api/results/${resultId}/publish`);

  const getReview = (agent, resultId) =>
    agent.get(`/api/results/${resultId}`);

  const findResult = async (filter) =>
    SemesterResult.findOne(filter).lean();

  const countAudit = (query) => AuditLog.countDocuments(query);

  // ---- Lifecycle: transitions -------------------------------------------

  describe("LIFECYCLE — result status transitions", () => {
    it("L1. new SemesterResult starts as DRAFT", async () => {
      const { agent, exam, student } = await baseSetup();
      await generateResult(agent, exam._id, student._id);

      const result = await findResult({
        college_id: exam.college_id,
        exam_id: exam._id,
        student_id: student._id,
      });

      expect(result).not.toBeNull();
      expect(result.status).toBe("DRAFT");
      expect(result.lockedBy).toBeUndefined();
      expect(result.publishedBy).toBeUndefined();
    });

    it("L2. DRAFT -> LOCKED", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await lockResult(agent, resultId).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("LOCKED");
      expect(res.body.data.lockedBy).toBeDefined();
      expect(res.body.data.lockedAt).toBeDefined();

      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("LOCKED");
    });

    it("L3. LOCKED -> DRAFT via unlock", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await unlockResult(agent, resultId, {
        reason: "Correction required in subject marks",
      }).expect(200);

      expect(res.body.data.status).toBe("DRAFT");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("DRAFT");
      expect(result.unlockReason).toBe("Correction required in subject marks");
    });

    it("L4. LOCKED -> PUBLISHED", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await publishResult(agent, resultId).expect(200);
      expect(res.body.data.status).toBe("PUBLISHED");
      expect(res.body.data.publishedBy).toBeDefined();
      expect(res.body.data.publishedAt).toBeDefined();

      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("PUBLISHED");
    });

    it("L5. DRAFT -> PUBLISHED rejected", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await publishResult(agent, resultId).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("DRAFT");
    });

    it("L6. PUBLISHED -> DRAFT rejected (unlock)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);

      const res = await unlockResult(agent, resultId, {
        reason: "should not work",
      }).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("PUBLISHED");
    });

    it("L7. PUBLISHED -> LOCKED rejected", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);

      const res = await lockResult(agent, resultId).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("PUBLISHED");
    });

    it("L8. LOCKED -> LOCKED rejected (double lock)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await lockResult(agent, resultId).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("LOCKED");
    });

    it("L9. PUBLISHED -> PUBLISHED rejected (double publish)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);

      const res = await publishResult(agent, resultId).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("PUBLISHED");
    });
  });

  // ---- Status cannot be set through a generic update (no update endpoint) ---

  describe("LIFECYCLE — direct status tampering is impossible", () => {
    it("L10. there is no PUT/PATCH route to mutate a SemesterResult", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      // PUT and PATCH are not wired for /api/results/:resultId
      const putRes = await agent.put(`/api/results/${resultId}`).expect(404);
      const patchRes = await agent
        .patch(`/api/results/${resultId}`)
        .send({ status: "PUBLISHED" })
        .expect(404);

      expect(putRes.body.success).toBe(false);
      expect(patchRes.body.success).toBe(false);

      // Result is unchanged.
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("DRAFT");
    });
  });

  // ---- Authorization -----------------------------------------------------

  describe("AUTHORIZATION — who may lock/unlock/publish", () => {
    it("A1. unauthenticated lock rejected (401)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await request(app)
        .post(`/api/results/${resultId}/lock`)
        .expect(401);
      expect(res.body.error.code).toBe("TOKEN_MISSING");
    });

    it("A2. TEACHER cannot lock (403)", async () => {
      const { college, department, agent, exam, student } = await baseSetup();
      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await teacherAgent.post(`/api/results/${resultId}/lock`).expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("A3. STUDENT cannot lock (403)", async () => {
      const { college, agent, exam, student } = await baseSetup();
      const studentAgent = (await setupStudent(college._id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await studentAgent.post(`/api/results/${resultId}/lock`).expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("A4. TEACHER cannot unlock (403)", async () => {
      const { college, department, agent, exam, student } = await baseSetup();
      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await teacherAgent
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "fix" })
        .expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("A5. STUDENT cannot publish (403)", async () => {
      const { college, agent, exam, student } = await baseSetup();
      const studentAgent = (await setupStudent(college._id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await studentAgent.post(`/api/results/${resultId}/publish`).expect(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("A6. EXAM_COORDINATOR can lock", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("LOCKED");
    });

    it("A7. EXAM_COORDINATOR can unlock", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await unlockResult(agent, resultId, { reason: "typo in marks" }).expect(200);
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("DRAFT");
    });

    it("A8. EXAM_COORDINATOR can publish", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("PUBLISHED");
    });
  });

  // ---- Tenant isolation --------------------------------------------------

  describe("TENANT ISOLATION — cross-college access fails", () => {
    it("T1. cross-college lock rejected (404)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const collegeB = await createCollege({
        code: `LCKB${Date.now()}`,
        email: `lckb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB.post(`/api/results/${resultId}/lock`).expect(404);
      expect(res.body.error.code).toBe("RESULT_NOT_FOUND");
    });

    it("T2. cross-college unlock rejected (404)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const collegeB = await createCollege({
        code: `LCKB${Date.now()}`,
        email: `lckb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB
        .post(`/api/results/${resultId}/unlock`)
        .send({ reason: "cross" })
        .expect(404);
      expect(res.body.error.code).toBe("RESULT_NOT_FOUND");
    });

    it("T3. cross-college publish rejected (404)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const collegeB = await createCollege({
        code: `LCKB${Date.now()}`,
        email: `lckb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB.post(`/api/results/${resultId}/publish`).expect(404);
      expect(res.body.error.code).toBe("RESULT_NOT_FOUND");
    });

    it("T4. cross-college GET review rejected (404)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const collegeB = await createCollege({
        code: `LCKB${Date.now()}`,
        email: `lckb.${Date.now()}@test.com`,
      });
      const agentB = (await setupCoordinator(collegeB._id)).agent;

      const res = await agentB.get(`/api/results/${resultId}`).expect(404);
      expect(res.body.error.code).toBe("RESULT_NOT_FOUND");
    });
  });

  // ---- Unlock reason validation ------------------------------------------

  describe("UNLOCK REASON — validation", () => {
    it("R1. missing reason rejected (400)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await unlockResult(agent, resultId).expect(400);
      expect(res.body.error.code).toBe("MISSING_UNLOCK_REASON");
    });

    it("R2. empty reason rejected (400)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await unlockResult(agent, resultId, { reason: "" }).expect(400);
      expect(res.body.error.code).toBe("MISSING_UNLOCK_REASON");
    });

    it("R3. whitespace-only reason rejected (400)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await unlockResult(agent, resultId, {
        reason: "   ",
      }).expect(400);
      expect(res.body.error.code).toBe("MISSING_UNLOCK_REASON");
    });

    it("R4. reason exceeding 500 chars rejected (400)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await unlockResult(agent, resultId, {
        reason: "x".repeat(501),
      }).expect(400);
      expect(res.body.error.code).toBe("REASON_TOO_LONG");
    });

    it("R5. valid reason accepted", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await unlockResult(agent, resultId, {
        reason: "Correction required in subject marks",
      }).expect(200);

      expect(res.body.success).toBe(true);
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("DRAFT");
      expect(result.unlockReason).toBe("Correction required in subject marks");
    });

    it("R6. reason is trimmed before storage", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      await unlockResult(agent, resultId, {
        reason: "   fix marks typo   ",
      }).expect(200);

      const result = await findResult({ _id: resultId });
      expect(result.unlockReason).toBe("fix marks typo");
    });

    it("R7. reason is audited on RESULT_UNLOCKED", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await unlockResult(agent, resultId, {
        reason: "Correction required in subject marks",
      }).expect(200);

      const log = await AuditLog.findOne({
        action: "RESULT_UNLOCKED",
        resourceType: "SemesterResult",
        resourceId: new mongoose.Types.ObjectId(String(resultId)),
      }).lean();

      expect(log).not.toBeNull();
      const meta = log.metadata;
      const storedReason =
        meta && typeof meta.get === "function" ? meta.get("unlockReason") : meta.unlockReason;
      expect(storedReason).toBe("Correction required in subject marks");
    });
  });

  // ---- Locked marks protection -------------------------------------------

  describe("MARKS PROTECTION — locked/published results block mark edits", () => {
    it("M1. teacher cannot modify marks after LOCKED", async () => {
      const { college, department, agent, exam, student, subject } = await baseSetup();
      const teacherAgent = (await setupTeacher(college._id, department._id)).agent;
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await teacherAgent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: subject._id,
          marks: [
            { studentId: student._id, internalMarks: 25, externalMarks: 60 },
          ],
        })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_LOCKED_FOR_EDIT");
      // No marks persisted.
      const marks = await StudentMarks.find({
        college_id: college._id,
        exam_id: exam._id,
        student_id: student._id,
      });
      expect(marks.length).toBe(0);
    });

    it("M2. coordinator cannot bypass lock through bulk endpoint", async () => {
      const { agent, exam, student, subject } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: subject._id,
          marks: [
            { studentId: student._id, internalMarks: 25, externalMarks: 60 },
          ],
        })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_LOCKED_FOR_EDIT");
    });

    it("M3. individual marks update cannot bypass lock", async () => {
      const { agent, exam, student, subject } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      // Enter marks while DRAFT.
      await enterMarks(agent, exam._id, subject._id, [
        { studentId: student._id, internalMarks: 10, externalMarks: 30 },
      ]);

      await lockResult(agent, resultId).expect(200);

      // Single-entry bulk call == individual update path; must be blocked.
      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: subject._id,
          marks: [
            { studentId: student._id, internalMarks: 25, externalMarks: 60 },
          ],
        })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_LOCKED_FOR_EDIT");

      // Original marks are untouched.
      const mark = await StudentMarks.findOne({
        college_id: exam.college_id,
        exam_id: exam._id,
        subject_id: subject._id,
        student_id: student._id,
      }).lean();
      expect(mark.internalMarks).toBe(10);
      expect(mark.externalMarks).toBe(30);
    });

    it("M4. marks modification after PUBLISHED rejected", async () => {
      const { agent, exam, student, subject } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);

      const res = await agent
        .post("/api/marks/bulk")
        .send({
          examId: exam._id,
          subjectId: subject._id,
          marks: [
            { studentId: student._id, internalMarks: 25, externalMarks: 60 },
          ],
        })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_LOCKED_FOR_EDIT");
    });

    it("M5. marks can be entered while DRAFT (no false block)", async () => {
      const { agent, exam, student, subject } = await baseSetup();
      await generateResult(agent, exam._id, student._id);

      const res = await enterMarks(agent, exam._id, subject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);
      expect(res.body.success).toBe(true);
    });

    it("M6. result can be unlocked and marks edited afterwards", async () => {
      const { agent, exam, student, subject } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await unlockResult(agent, resultId, {
        reason: "fix marks",
      }).expect(200);

      const res = await enterMarks(agent, exam._id, subject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);
      expect(res.body.success).toBe(true);
    });
  });

  // ---- Result generation protection --------------------------------------

  describe("RESULT GENERATION — blocked for locked/published", () => {
    it("G1. DRAFT result can regenerate", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      // Second generation on DRAFT is allowed (upsert).
      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(resultId);

      const count = await SemesterResult.countDocuments({
        college_id: exam.college_id,
        exam_id: exam._id,
        student_id: student._id,
      });
      expect(count).toBe(1);
    });

    it("G2. LOCKED result cannot regenerate", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student._id })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_NOT_MUTABLE");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("LOCKED");
    });

    it("G3. PUBLISHED result cannot regenerate", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student._id })
        .expect(409);

      expect(res.body.error.code).toBe("RESULT_NOT_MUTABLE");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("PUBLISHED");
    });
  });

  // ---- AuditLog ----------------------------------------------------------

  describe("AUDITLOG — lifecycle events are recorded", () => {
    it("AL1. RESULT_LOCKED created on lock", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const count = await countAudit({
        action: "RESULT_LOCKED",
        resourceType: "SemesterResult",
        resourceId: new mongoose.Types.ObjectId(String(resultId)),
      });
      expect(count).toBe(1);
    });

    it("AL2. RESULT_UNLOCKED created with reason on unlock", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await unlockResult(agent, resultId, {
        reason: "Correction required in subject marks",
      }).expect(200);

      const count = await countAudit({
        action: "RESULT_UNLOCKED",
        resourceType: "SemesterResult",
        resourceId: new mongoose.Types.ObjectId(String(resultId)),
      });
      expect(count).toBe(1);
    });

    it("AL3. RESULT_PUBLISHED created on publish", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);

      const count = await countAudit({
        action: "RESULT_PUBLISHED",
        resourceType: "SemesterResult",
        resourceId: new mongoose.Types.ObjectId(String(resultId)),
      });
      expect(count).toBe(1);
    });
  });

  // ---- Concurrency / state protection ------------------------------------

  describe("CONCURRENCY — atomic state protection", () => {
    it("C1. double lock prevented", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await lockResult(agent, resultId).expect(409);
    });

    it("C2. double publish prevented", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(409);
    });

    it("C3. unlock only from LOCKED state", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      // Attempting to unlock a DRAFT result (must first lock) is rejected.
      const res = await unlockResult(agent, resultId, {
        reason: "cannot unlock draft",
      }).expect(409);
      expect(res.body.error.code).toBe("RESULT_INVALID_TRANSITION");
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("DRAFT");
    });

    it("C4. lock only from DRAFT state (after publish)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);
      await publishResult(agent, resultId).expect(200);
      // Cannot re-lock a published result.
      await lockResult(agent, resultId).expect(409);
      const result = await findResult({ _id: resultId });
      expect(result.status).toBe("PUBLISHED");
    });
  });

  // ---- Review endpoint ---------------------------------------------------

  describe("REVIEW — GET result read capability", () => {
    it("RV1. GET /api/results/:resultId returns the result", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);

      const res = await getReview(agent, resultId).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(resultId);
      expect(res.body.data.status).toBe("DRAFT");
      expect(res.body.data.overallResult).toBeDefined();
    });

    it("RV2. GET on locked result still returns data (read-only)", async () => {
      const { agent, exam, student } = await baseSetup();
      const resultId = await generateResult(agent, exam._id, student._id);
      await lockResult(agent, resultId).expect(200);

      const res = await getReview(agent, resultId).expect(200);
      expect(res.body.data.status).toBe("LOCKED");
    });

    it("RV3. GET non-existent result -> 404", async () => {
      const { agent } = await baseSetup();
      const fakeId = new mongoose.Types.ObjectId();
      const res = await getReview(agent, fakeId).expect(404);
      expect(res.body.error.code).toBe("RESULT_NOT_FOUND");
    });
  });

  // ---- Existing behavior regression --------------------------------------

  describe("REGRESSION — prior steps unaffected in DRAFT state", () => {
    it("X1. Step 5 overall-result calculation remains unchanged (pure)", () => {
      expect(calculateOverallResult(["PASS", "PASS"])).toBe("PASS");
      expect(calculateOverallResult(["PASS", "FAIL"])).toBe("FAIL");
      expect(calculateOverallResult(["FAIL", "INCOMPLETE"])).toBe("INCOMPLETE");
      expect(calculateOverallResult([])).toBe("INCOMPLETE");
    });

    it("X2. Step 6 generation remains correct in DRAFT state", async () => {
      const {
        agent,
        exam,
        student,
        subject,
      } = await baseSetup();

      await enterMarks(agent, exam._id, subject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);

      const res = await agent
        .post("/api/results/generate")
        .send({ examId: exam._id, studentId: student._id })
        .expect(200);

      expect(res.body.data.overallResult).toBe("PASS");
      expect(res.body.data.passedSubjects).toBe(1);
      expect(res.body.data.failedSubjects).toBe(0);
      expect(res.body.data.totalSubjects).toBe(1);
      expect(res.body.data.status).toBe("DRAFT");
    });

    it("X3. marks saved while DRAFT do not error via assertMarksMutable", async () => {
      const { agent, exam, student, subject } = await baseSetup();
      // No result generated yet -> mutation allowed.
      const res = await enterMarks(agent, exam._id, subject._id, [
        { studentId: student._id, internalMarks: 25, externalMarks: 60 },
      ]);
      expect(res.body.success).toBe(true);
    });
  });
});
