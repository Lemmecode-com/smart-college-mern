const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const Student = require("../../src/models/student.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const { createStudent } = require("../helpers/factories");
const {
  DEFAULT_MAX_ALLOWED_KTS,
  resolveMaxAllowedKTs,
} = require("../../src/utils/promotionPolicy.util");
const {
  calculateKTCount,
  isWithinKTLimit,
} = require("../../src/services/atkt.service");

describe("Step 2 - promotion policy and maximum allowed KT", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const subjectId = () => new mongoose.Types.ObjectId();

  const semesterResult = (statuses) => ({
    subjects: statuses.map((status) => ({
      subject: subjectId(),
      status,
    })),
  });

  describe("KT count", () => {
    it.each([
      [0, [], 0],
      [1, ["FAIL"], 1],
      [2, ["FAIL", "FAIL"], 2],
      [3, ["FAIL", "FAIL", "FAIL"], 3],
      [4, ["FAIL", "FAIL", "FAIL", "FAIL"], 4],
    ])("returns the expected KT count", (_label, statuses, expected) => {
      expect(calculateKTCount(semesterResult(statuses)).ktCount).toBe(expected);
    });

    it("does not count PASS subjects", () => {
      const result = calculateKTCount(semesterResult(["PASS", "PASS"]));

      expect(result).toEqual({ ktCount: 0, failedSubjectIds: [] });
    });

    it("counts FAIL and excludes INCOMPLETE subjects", () => {
      const result = calculateKTCount(
        semesterResult(["PASS", "FAIL", "INCOMPLETE"]),
      );

      expect(result.ktCount).toBe(1);
      expect(result.failedSubjectIds).toHaveLength(1);
    });

    it("handles a missing subject result safely", () => {
      const result = calculateKTCount({
        subjects: [null, undefined, { status: "PASS" }],
      });

      expect(result).toEqual({ ktCount: 0, failedSubjectIds: [] });
    });
  });

  describe("policy", () => {
    it("defaults new policies to maxAllowedKTs = 3", async () => {
      const policy = await PromotionPolicy.create({
        collegeId: new mongoose.Types.ObjectId(),
      });

      expect(policy.maxAllowedKTs).toBe(DEFAULT_MAX_ALLOWED_KTS);
    });

    it("resolves an existing policy without the field to 3", async () => {
      const collegeId = new mongoose.Types.ObjectId();
      const policy = await PromotionPolicy.collection.insertOne({
        collegeId,
        minAttendancePercentage: 75,
        scopedSemesters: [],
        effectiveFrom: new Date(),
        isActive: true,
      });

      const resolved = await PromotionPolicy.getActivePolicy(collegeId);

      expect(String(resolved._id)).toBe(String(policy.insertedId));
      expect(resolveMaxAllowedKTs(resolved)).toBe(3);
    });

    it("respects an explicit policy value", async () => {
      const policy = await PromotionPolicy.create({
        collegeId: new mongoose.Types.ObjectId(),
        maxAllowedKTs: 1,
      });

      expect(resolveMaxAllowedKTs(policy)).toBe(1);
    });

    it.each([
      [0, true],
      [1, true],
      [2, true],
      [3, true],
      [4, false],
    ])("evaluates %i KT against the default limit", (ktCount, expected) => {
      expect(isWithinKTLimit(ktCount, {})).toBe(expected);
    });
  });

  describe("data integrity", () => {
    it("does not mutate a student or create promotion history", async () => {
      const collegeId = new mongoose.Types.ObjectId();
      const student = await createStudent({
        fullName: "Step 2 Student",
        email: `step2-${Date.now()}@example.com`,
        college_id: collegeId,
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
        currentSemester: 3,
        status: "APPROVED",
      });

      const before = student.currentSemester;
      const ktResult = calculateKTCount(semesterResult(["FAIL", "PASS"]));
      expect(isWithinKTLimit(ktResult.ktCount, {})).toBe(true);

      const unchanged = await Student.findById(student._id).select(
        "currentSemester",
      );
      expect(unchanged.currentSemester).toBe(before);
      expect(
        await PromotionHistory.countDocuments({ student_id: student._id }),
      ).toBe(0);
    });
  });
});
