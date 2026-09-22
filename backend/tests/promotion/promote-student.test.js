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

// --- Tests ---

describe("PromotionHistory partial-unique index + promoteStudent regression", () => {
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

  describe("promoteStudent controller", () => {
    it("TEST 2 — single promoteStudent succeeds and creates history", async () => {
      const { college, adminUser, department, course } =
        await setupPromotionEnvironment();
      const student = await createTestStudent(
        college._id,
        department._id,
        course._id,
        "single@test.com",
      );
      await createFullyPaidFee(student._id, college._id, course._id);

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
      expect(histories[0].promotion_decision_id).toBeNull();
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

      // Promote Student 1
      const req1 = makeReq(college._id, adminUser, {
        params: { studentId: student1._id.toString() },
      });
      const res1 = makeRes();
      const next1 = jest.fn();
      await promoteStudent(req1, res1, next1);

      expect(next1).not.toHaveBeenCalled();
      expect(res1.status).toHaveBeenCalledWith(200);

      // Promote Student 2 — this was failing with E11000 before the fix
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
  });

  describe("bulkPromoteStudents controller", () => {
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
  });
});
