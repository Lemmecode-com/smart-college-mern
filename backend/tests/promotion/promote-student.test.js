const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");

jest.mock("../../src/services/attendance.service", () => ({
  getAttendanceDataForStudents: jest.fn(),
}));

const {
  getAttendanceDataForStudents,
} = require("../../src/services/attendance.service");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Backlog = require("../../src/models/backlog.model");
const AuditLog = require("../../src/models/auditLog.model");
const {
  createCollege,
  createDepartment,
  createCourse,
  createStudent,
} = require("../helpers/factories");
const {
  promoteStudent,
  bulkPromoteStudents,
} = require("../../src/controllers/promotion.controller");

// --- Helpers ---

function buildHistoryPayload(overrides = {}) {
  return {
    student_id: new mongoose.Types.ObjectId(),
    college_id: new mongoose.Types.ObjectId(),
    course_id: new mongoose.Types.ObjectId(),
    fromSemester: 1,
    toSemester: 2,
    fromAcademicYear: "2026-27",
    toAcademicYear: "2027-2028",
    feeStatus: "FULLY_PAID",
    totalFee: 100,
    paidAmount: 100,
    promotedBy: new mongoose.Types.ObjectId(),
    promotedByName: "Test Admin",
    ...overrides,
  };
}

function makeReq(collegeId, userId, overrides = {}) {
  return {
    params: {},
    body: {},
    college_id: collegeId,
    user: {
      id: userId,
      name: "Test Admin",
      email: "admin@test.com",
      role: "COLLEGE_ADMIN",
    },
    ...overrides,
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

async function setupPromotionEnvironment() {
  const college = await createCollege({
    code: `PROMO-${Date.now()}`,
    name: "Promotion Test College",
  });
  const adminUser = new mongoose.Types.ObjectId();
  const department = await createDepartment({
    college_id: college._id,
    createdBy: adminUser,
    name: "Computer Science",
    code: "CSE",
    type: "ACADEMIC",
    programsOffered: ["UG"],
    startYear: 2024,
    sanctionedFacultyCount: 5,
    sanctionedStudentIntake: 60,
  });
  const course = await createCourse({
    college_id: college._id,
    department_id: department._id,
    name: "B.Tech CSE",
    code: "BTECH",
    type: "THEORY",
    programLevel: "UG",
    durationSemesters: 8,
  });
  return { college, adminUser, department, course };
}

async function createTestStudent(collegeId, departmentId, courseId, email) {
  return createStudent({
    college_id: collegeId,
    department_id: departmentId,
    course_id: courseId,
    email,
    currentSemester: 1,
    currentAcademicYear: "2026-27",
    fullName: `Student ${email}`,
    status: "APPROVED",
  });
}

async function createFullyPaidFee(studentId, collegeId, courseId) {
  return StudentFee.create({
    student_id: studentId,
    college_id: collegeId,
    course_id: courseId,
    totalFee: 100,
    paidAmount: 100,
    installments: [],
  });
}

async function createPublishedResult(
  student,
  adminUser,
  { overallResult = "PASS", failedCount = 0, totalCount = 1 } = {},
) {
  const subjects = [];
  for (let i = 0; i < totalCount; i++) {
    const isFailed = i < failedCount;
    subjects.push({
      subject: new mongoose.Types.ObjectId(),
      subjectName: `Subject ${i + 1}`,
      subjectCode: `SUB-${100 + i}`,
      subjectType: "THEORY",
      passed: !isFailed,
      status: isFailed ? "FAIL" : "PASS",
      marksRecorded: true,
    });
  }

  return SemesterResult.create({
    college_id: student.college_id,
    student_id: student._id,
    course_id: student.course_id?._id || student.course_id,
    exam_id: new mongoose.Types.ObjectId(),
    semester: student.currentSemester,
    academicYear: student.currentAcademicYear,
    subjects,
    totalSubjects: totalCount,
    passedSubjects: totalCount - failedCount,
    failedSubjects: failedCount,
    incompleteSubjects: 0,
    overallResult,
    status: "PUBLISHED",
    createdBy: adminUser,
  });
}

// --- Tests ---

describe("PromotionHistory partial-unique index + promoteStudent authoritative delegation", () => {
  beforeAll(async () => {
    await connectTestDb();

    const collection = mongoose.connection.db.collection("promotionhistories");
    try {
      await collection.dropIndex("promotion_decision_id_1");
    } catch (err) {
      // Index may not exist yet — safe to ignore
    }

    await PromotionHistory.init();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    getAttendanceDataForStudents.mockReset();
    getAttendanceDataForStudents.mockResolvedValue([
      { percentage: 80, totalSessions: 10 },
    ]);
  });

  // ============================================================
  // Model-level index tests
  // ============================================================

  describe("PromotionHistory index behavior", () => {
    it("TEST 3 — allows multiple PromotionHistory records with null promotion_decision_id", async () => {
      const hist1 = await PromotionHistory.create(buildHistoryPayload());
      const hist2 = await PromotionHistory.create(
        buildHistoryPayload({
          student_id: new mongoose.Types.ObjectId(),
        }),
      );

      expect(hist1._id).toBeDefined();
      expect(hist2._id).toBeDefined();
      expect(hist1.promotion_decision_id).toBeNull();
      expect(hist2.promotion_decision_id).toBeNull();
    });

    it("TEST 4 — rejects a second PromotionHistory with the SAME real promotion_decision_id", async () => {
      const decisionId = new mongoose.Types.ObjectId();

      await PromotionHistory.create(
        buildHistoryPayload({
          promotion_decision_id: decisionId,
        }),
      );

      await expect(
        PromotionHistory.create(
          buildHistoryPayload({
            promotion_decision_id: decisionId,
            student_id: new mongoose.Types.ObjectId(),
          }),
        ),
      ).rejects.toThrow(/11000|duplicate.*key/i);
    });

    it("TEST 5 — allows PromotionHistory records with different real promotion_decision_id values", async () => {
      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();

      const hist1 = await PromotionHistory.create(
        buildHistoryPayload({ promotion_decision_id: id1 }),
      );
      const hist2 = await PromotionHistory.create(
        buildHistoryPayload({
          promotion_decision_id: id2,
          student_id: new mongoose.Types.ObjectId(),
        }),
      );

      expect(hist1._id).toBeDefined();
      expect(hist2._id).toBeDefined();
      expect(String(hist1.promotion_decision_id)).toBe(String(id1));
      expect(String(hist2.promotion_decision_id)).toBe(String(id2));
    });
  });

  // ============================================================
  // Controller-level tests (promoteStudent / bulkPromoteStudents)
  // ============================================================

  describe("promoteStudent controller (authoritative delegation)", () => {
    it("TEST 2 — single promoteStudent succeeds and creates authoritative history with decision ID", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "single@test.com",
      );
      await createFullyPaidFee(student._id, college._id, course._id);
      await createPublishedResult(student, adminUser, { overallResult: "PASS" });

      const req = makeReq(college._id, adminUser, {
        params: { studentId: student._id.toString() },
      });
      const res = makeRes();
      const next = jest.fn();

      await promoteStudent(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const updated = await Student.findById(student._id);
      expect(updated.currentSemester).toBe(2);

      const histories = await PromotionHistory.find({
        student_id: student._id,
      });
      expect(histories).toHaveLength(1);
      expect(histories[0].promotion_decision_id).not.toBeNull();
    });

    it("TEST 1 — two different students can be promoted without duplicate key error", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student1 = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "two-a@test.com",
      );
      const student2 = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "two-b@test.com",
      );
      await createFullyPaidFee(student1._id, college._id, course._id);
      await createFullyPaidFee(student2._id, college._id, course._id);
      await createPublishedResult(student1, adminUser, { overallResult: "PASS" });
      await createPublishedResult(student2, adminUser, { overallResult: "PASS" });

      // Promote Student 1
      const req1 = makeReq(college._id, adminUser, {
        params: { studentId: student1._id.toString() },
      });
      const res1 = makeRes();
      const next1 = jest.fn();
      await promoteStudent(req1, res1, next1);

      expect(next1).not.toHaveBeenCalled();
      expect(res1.status).toHaveBeenCalledWith(200);

      // Promote Student 2
      const req2 = makeReq(college._id, adminUser, {
        params: { studentId: student2._id.toString() },
      });
      const res2 = makeRes();
      const next2 = jest.fn();
      await promoteStudent(req2, res2, next2);

      expect(next2).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(200);

      // Both students promoted
      const s1 = await Student.findById(student1._id);
      const s2 = await Student.findById(student2._id);
      expect(s1.currentSemester).toBe(2);
      expect(s2.currentSemester).toBe(2);

      const histories = await PromotionHistory.find({});
      expect(histories).toHaveLength(2);
    });

    it("TEST A — Legacy single promotion with NO published result must NOT promote", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "no-result@test.com",
      );
      await createFullyPaidFee(student._id, college._id, course._id);
      // Notice: NO SemesterResult created!

      const req = makeReq(college._id, adminUser, {
        params: { studentId: student._id.toString() },
      });
      const res = makeRes();
      const next = jest.fn();

      await promoteStudent(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.statusCode || error.status).toBe(400);
      expect(error.code).toBe("NO_RESULT");

      const untouched = await Student.findById(student._id);
      expect(untouched.currentSemester).toBe(1);

      const histories = await PromotionHistory.find({ student_id: student._id });
      expect(histories).toHaveLength(0);
    });

    it("TEST B — Legacy single promotion with excessive KT count must NOT promote", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "excessive-kt@test.com",
      );
      await createFullyPaidFee(student._id, college._id, course._id);
      // 4 failed subjects exceeds default limit of 3
      await createPublishedResult(student, adminUser, {
        overallResult: "FAIL",
        failedCount: 4,
        totalCount: 4,
      });

      const req = makeReq(college._id, adminUser, {
        params: { studentId: student._id.toString() },
      });
      const res = makeRes();
      const next = jest.fn();

      await promoteStudent(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.statusCode || error.status).toBe(400);
      expect(error.code).toBe("KT_LIMIT_EXCEEDED");

      const untouched = await Student.findById(student._id);
      expect(untouched.currentSemester).toBe(1);

      const histories = await PromotionHistory.find({ student_id: student._id });
      expect(histories).toHaveLength(0);
    });

    it("TEST C — Legacy single promotion with valid PASS result promotes successfully", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "pass@test.com",
      );
      await createFullyPaidFee(student._id, college._id, course._id);
      await createPublishedResult(student, adminUser, { overallResult: "PASS" });

      const req = makeReq(college._id, adminUser, {
        params: { studentId: student._id.toString() },
      });
      const res = makeRes();
      const next = jest.fn();

      await promoteStudent(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      const updated = await Student.findById(student._id);
      expect(updated.currentSemester).toBe(2);

      const decision = await PromotionDecision.findOne({ student_id: student._id });
      expect(decision).toBeDefined();
      expect(decision.promotion_outcome).toBe("PASS");
      expect(decision.workflow_status).toBe("PROMOTED");
    });

    it("TEST D — Legacy single promotion with valid ATKT result promotes successfully and creates OPEN Backlog records", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "atkt@test.com",
      );
      await createFullyPaidFee(student._id, college._id, course._id);
      // 1 failed subject is <= default limit 3, so ATKT
      await createPublishedResult(student, adminUser, {
        overallResult: "FAIL",
        failedCount: 1,
        totalCount: 3,
      });

      const req = makeReq(college._id, adminUser, {
        params: { studentId: student._id.toString() },
      });
      const res = makeRes();
      const next = jest.fn();

      await promoteStudent(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      const updated = await Student.findById(student._id);
      expect(updated.currentSemester).toBe(2);

      const backlogs = await Backlog.find({ student_id: student._id });
      expect(backlogs).toHaveLength(1);
      expect(backlogs[0].status).toBe("OPEN");
      expect(backlogs[0].semester).toBe(1);
    });

    it("TEST E — Legacy single promotion called twice does NOT advance the student again", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "twice@test.com",
      );
      await createFullyPaidFee(student._id, college._id, course._id);
      await createPublishedResult(student, adminUser, { overallResult: "PASS" });

      // First call
      const req1 = makeReq(college._id, adminUser, {
        params: { studentId: student._id.toString() },
      });
      const res1 = makeRes();
      const next1 = jest.fn();
      await promoteStudent(req1, res1, next1);

      expect(next1).not.toHaveBeenCalled();
      const afterFirst = await Student.findById(student._id);
      expect(afterFirst.currentSemester).toBe(2);

      // Second call immediately on the same student
      const req2 = makeReq(college._id, adminUser, {
        params: { studentId: student._id.toString() },
      });
      const res2 = makeRes();
      const next2 = jest.fn();
      await promoteStudent(req2, res2, next2);

      // The second call must NOT advance to semester 3
      const afterSecond = await Student.findById(student._id);
      expect(afterSecond.currentSemester).toBe(2);
    });

    it("TEST H — Verify successful legacy promotion creates PromotionDecision, PromotionHistory, and AuditLog", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "audit-verify@test.com",
      );
      await createFullyPaidFee(student._id, college._id, course._id);
      await createPublishedResult(student, adminUser, { overallResult: "PASS" });

      const req = makeReq(college._id, adminUser, {
        params: { studentId: student._id.toString() },
      });
      const res = makeRes();
      const next = jest.fn();

      await promoteStudent(req, res, next);

      expect(next).not.toHaveBeenCalled();

      // 1. PromotionDecision
      const decision = await PromotionDecision.findOne({ student_id: student._id });
      expect(decision).toBeDefined();
      expect(decision.workflow_status).toBe("PROMOTED");
      expect(decision.promotion_outcome).toBe("PASS");

      // 2. PromotionHistory
      const history = await PromotionHistory.findOne({ student_id: student._id });
      expect(history).toBeDefined();
      expect(String(history.promotion_decision_id)).toBe(String(decision._id));
      expect(history.fromSemester).toBe(1);
      expect(history.toSemester).toBe(2);

      // 3. AuditLog
      const audit = await AuditLog.findOne({
        resourceType: "PromotionDecision",
        resourceId: decision._id,
        action: "PROMOTION_EXECUTED",
      });
      expect(audit).toBeDefined();
      expect(String(audit.userId)).toBe(String(adminUser));
    });
  });

  describe("bulkPromoteStudents controller (authoritative delegation)", () => {
    it("TEST 6 — bulkPromoteStudents promotes two students without duplicate key error", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student1 = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "bulk-a@test.com",
      );
      const student2 = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "bulk-b@test.com",
      );
      await createFullyPaidFee(student1._id, college._id, course._id);
      await createFullyPaidFee(student2._id, college._id, course._id);
      await createPublishedResult(student1, adminUser, { overallResult: "PASS" });
      await createPublishedResult(student2, adminUser, { overallResult: "PASS" });

      const req = makeReq(college._id, adminUser, {
        body: { studentIds: [student1._id, student2._id] },
      });
      const res = makeRes();
      const next = jest.fn();

      await bulkPromoteStudents(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.results.success).toHaveLength(2);
      expect(responseData.data.results.failed).toHaveLength(0);

      const s1 = await Student.findById(student1._id);
      const s2 = await Student.findById(student2._id);
      expect(s1.currentSemester).toBe(2);
      expect(s2.currentSemester).toBe(2);

      expect(await PromotionHistory.countDocuments()).toBe(2);
    });

    it("TEST F — Bulk promotion with 1 PASS, 1 blocked/no-result, and 1 ATKT handles partial success independently", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();

      // Student 1: Valid PASS
      const studentPass = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "bulk-pass@test.com",
      );
      await createFullyPaidFee(studentPass._id, college._id, course._id);
      await createPublishedResult(studentPass, adminUser, { overallResult: "PASS" });

      // Student 2: Blocked (No Result)
      const studentNoResult = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "bulk-noresult@test.com",
      );
      await createFullyPaidFee(studentNoResult._id, college._id, course._id);
      // No result created for studentNoResult

      // Student 3: Valid ATKT (1 failed subject <= limit 3)
      const studentAtkt = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "bulk-atkt@test.com",
      );
      await createFullyPaidFee(studentAtkt._id, college._id, course._id);
      await createPublishedResult(studentAtkt, adminUser, {
        overallResult: "FAIL",
        failedCount: 1,
        totalCount: 3,
      });

      const req = makeReq(college._id, adminUser, {
        body: {
          studentIds: [
            studentPass._id,
            studentNoResult._id,
            studentAtkt._id,
          ],
        },
      });
      const res = makeRes();
      const next = jest.fn();

      await bulkPromoteStudents(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      const responseData = res.json.mock.calls[0][0];
      const { success, failed } = responseData.data.results;

      // PASS student -> success
      // ATKT student -> success
      expect(success).toHaveLength(2);
      const successIds = success.map((s) => s.studentId.toString());
      expect(successIds).toContain(studentPass._id.toString());
      expect(successIds).toContain(studentAtkt._id.toString());

      // blocked/no-result student -> failed
      expect(failed).toHaveLength(1);
      expect(failed[0].studentId.toString()).toBe(studentNoResult._id.toString());
      expect(failed[0].reason).toMatch(/result/i);

      // Verify DB state: valid students promoted, failed student unchanged
      const sPass = await Student.findById(studentPass._id);
      const sNoResult = await Student.findById(studentNoResult._id);
      const sAtkt = await Student.findById(studentAtkt._id);

      expect(sPass.currentSemester).toBe(2);
      expect(sNoResult.currentSemester).toBe(1);
      expect(sAtkt.currentSemester).toBe(2);

      // Verify ATKT student received OPEN backlog
      const backlogs = await Backlog.find({ student_id: studentAtkt._id });
      expect(backlogs).toHaveLength(1);
      expect(backlogs[0].status).toBe("OPEN");
    });

    it("TEST G — Bulk promotion with KT-limit failure appears in failed[] with meaningful reason", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();

      const studentExcessiveKt = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "bulk-excessive-kt@test.com",
      );
      await createFullyPaidFee(studentExcessiveKt._id, college._id, course._id);
      // 4 failed subjects exceeds limit 3
      await createPublishedResult(studentExcessiveKt, adminUser, {
        overallResult: "FAIL",
        failedCount: 4,
        totalCount: 4,
      });

      const req = makeReq(college._id, adminUser, {
        body: {
          studentIds: [studentExcessiveKt._id],
        },
      });
      const res = makeRes();
      const next = jest.fn();

      await bulkPromoteStudents(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      const responseData = res.json.mock.calls[0][0];
      const { success, failed } = responseData.data.results;

      expect(success).toHaveLength(0);
      expect(failed).toHaveLength(1);
      expect(failed[0].studentId.toString()).toBe(studentExcessiveKt._id.toString());
      expect(failed[0].reason).toMatch(/KT/i);
      expect(failed[0].code).toBe("KT_LIMIT_EXCEEDED");

      const untouched = await Student.findById(studentExcessiveKt._id);
      expect(untouched.currentSemester).toBe(1);
    });
  });
});
