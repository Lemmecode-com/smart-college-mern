const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const { updatePromotionPolicy } = require("../../src/controllers/promotionPolicy.controller");
const { createCourse } = require("../helpers/factories");
const { DEFAULT_MAX_ALLOWED_KTS } = require("../../src/utils/promotionPolicy.util");

/**
 * Regression coverage for the "Overall Max Allowed KTs (fallback)" write path.
 * The update controller previously never read maxAllowedKTs from the request
 * body, so the value sent by Promotion Settings was silently discarded and the
 * stored policy always fell back to the default.
 */
describe("Promotion policy - maxAllowedKTs persistence", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const newId = () => new mongoose.Types.ObjectId();

  const invokeUpdate = async (body, collegeId) => {
    const req = { body, query: {}, college_id: collegeId };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await updatePromotionPolicy(req, res, next);

    return { res, next };
  };

  const seedCourse = async (collegeId) =>
    createCourse({
      college_id: collegeId,
      department_id: newId(),
      name: "KT Course",
      code: `KTC${Date.now()}`,
      durationSemesters: 6,
    });

  it("persists the supplied maxAllowedKTs on an existing course policy", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);
    await PromotionPolicy.create({
      collegeId,
      course_id: course._id,
      minAttendancePercentage: 75,
      maxAllowedKTs: DEFAULT_MAX_ALLOWED_KTS,
      isActive: true,
    });

    const { next } = await invokeUpdate(
      { course_id: String(course._id), maxAllowedKTs: 5 },
      collegeId,
    );
    expect(next).not.toHaveBeenCalled();

    const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
    expect(stored.maxAllowedKTs).toBe(5);
  });

  it("keeps the stored maxAllowedKTs when the field is omitted from the body", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);
    await PromotionPolicy.create({
      collegeId,
      course_id: course._id,
      minAttendancePercentage: 75,
      maxAllowedKTs: 6,
      isActive: true,
    });

    const { next } = await invokeUpdate(
      { course_id: String(course._id), minAttendancePercentage: 80 },
      collegeId,
    );
    expect(next).not.toHaveBeenCalled();

    const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
    expect(stored.maxAllowedKTs).toBe(6);
    expect(stored.minAttendancePercentage).toBe(80);
  });

  it("uses the supplied maxAllowedKTs when creating a new policy", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    const { next } = await invokeUpdate(
      { course_id: String(course._id), maxAllowedKTs: 4 },
      collegeId,
    );
    expect(next).not.toHaveBeenCalled();

    const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
    expect(stored.maxAllowedKTs).toBe(4);
  });

  it("falls back to the default when creating without maxAllowedKTs", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    const { next } = await invokeUpdate(
      { course_id: String(course._id) },
      collegeId,
    );
    expect(next).not.toHaveBeenCalled();

    const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
    expect(stored.maxAllowedKTs).toBe(DEFAULT_MAX_ALLOWED_KTS);
  });

  it("does not alter unrelated policy fields", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);
    const ktRules = [
      {
        fromSemester: 1,
        toSemester: 2,
        maxAllowedKTs: 2,
        requirePreviousYearClearance: true,
        subjectTypeLimits: { THEORY: 5, PRACTICAL: 4, COMPOSITE: 6 },
      },
    ];
    await PromotionPolicy.create({
      collegeId,
      course_id: course._id,
      minAttendancePercentage: 82,
      maxAllowedKTs: 3,
      scopedSemesters: [1, 2],
      isActive: true,
      ktRules,
    });

    const { next } = await invokeUpdate(
      { course_id: String(course._id), maxAllowedKTs: 7 },
      collegeId,
    );
    expect(next).not.toHaveBeenCalled();

    const stored = await PromotionPolicy.getActivePolicy(collegeId, course._id);
    expect(stored.minAttendancePercentage).toBe(82);
    expect(stored.scopedSemesters).toEqual([1, 2]);
    expect(stored.ktRules).toHaveLength(1);
    expect(stored.ktRules[0].maxAllowedKTs).toBe(2);
    expect(stored.ktRules[0].requirePreviousYearClearance).toBe(true);
    expect(stored.ktRules[0].subjectTypeLimits.THEORY).toBe(5);
    expect(stored.ktRules[0].subjectTypeLimits.PRACTICAL).toBe(4);
    expect(stored.ktRules[0].subjectTypeLimits.COMPOSITE).toBe(6);
  });

  it.each([
    ["a negative value", -1],
    ["a fractional value", 2.5],
    ["a non-numeric value", "many"],
  ])("rejects %s with 400 INVALID_MAX_ALLOWED_KTS", async (_label, value) => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    const { next } = await invokeUpdate(
      { course_id: String(course._id), maxAllowedKTs: value },
      collegeId,
    );

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("INVALID_MAX_ALLOWED_KTS");

    expect(
      await PromotionPolicy.countDocuments({ collegeId, course_id: course._id }),
    ).toBe(0);
  });
});
