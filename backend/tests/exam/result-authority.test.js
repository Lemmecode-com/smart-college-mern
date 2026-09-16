const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const SemesterResult = require("../../src/models/semesterResult.model");
const {
  resolveAuthoritativeResult,
  RESULT_AUTHORITY_STATUS,
} = require("../../src/services/resultAuthority.service");

describe("Step 1 - authoritative SemesterResult resolution", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const context = () => ({
    collegeId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    semester: 3,
    academicYear: "2026-27",
  });

  const createResult = async (identity, overrides = {}) =>
    SemesterResult.create({
      college_id: identity.collegeId,
      student_id: identity.studentId,
      exam_id: new mongoose.Types.ObjectId(),
      course_id: identity.courseId,
      semester: identity.semester,
      academicYear: identity.academicYear,
      subjects: [],
      totalSubjects: 1,
      passedSubjects: 0,
      failedSubjects: 0,
      incompleteSubjects: 0,
      overallResult: "INCOMPLETE",
      calculatedAt: new Date(),
      status: "DRAFT",
      createdBy: new mongoose.Types.ObjectId(),
      ...overrides,
    });

  const resolve = (identity) => resolveAuthoritativeResult(identity);

  it("returns one published PASS result", async () => {
    const identity = context();
    const result = await createResult(identity, {
      status: "PUBLISHED",
      overallResult: "PASS",
    });

    const resolved = await resolve(identity);

    expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.FOUND);
    expect(String(resolved.result._id)).toBe(String(result._id));
    expect(resolved.result.overallResult).toBe("PASS");
  });

  it("returns one published FAIL result", async () => {
    const identity = context();
    const result = await createResult(identity, {
      status: "PUBLISHED",
      overallResult: "FAIL",
    });

    const resolved = await resolve(identity);

    expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.FOUND);
    expect(String(resolved.result._id)).toBe(String(result._id));
    expect(resolved.result.overallResult).toBe("FAIL");
  });

  it("does not consume only a DRAFT result", async () => {
    const identity = context();
    await createResult(identity, { status: "DRAFT" });

    await expect(resolve(identity)).resolves.toEqual({
      status: RESULT_AUTHORITY_STATUS.NO_RESULT,
    });
  });

  it("does not consume only a LOCKED result", async () => {
    const identity = context();
    await createResult(identity, { status: "LOCKED" });

    await expect(resolve(identity)).resolves.toEqual({
      status: RESULT_AUTHORITY_STATUS.NO_RESULT,
    });
  });

  it("returns NO_RESULT when no result exists", async () => {
    await expect(resolve(context())).resolves.toEqual({
      status: RESULT_AUTHORITY_STATUS.NO_RESULT,
    });
  });

  it("returns AMBIGUOUS_RESULT for multiple published results", async () => {
    const identity = context();
    await createResult(identity, {
      status: "PUBLISHED",
      overallResult: "PASS",
    });
    await createResult(identity, {
      status: "PUBLISHED",
      overallResult: "FAIL",
    });

    await expect(resolve(identity)).resolves.toEqual({
      status: RESULT_AUTHORITY_STATUS.AMBIGUOUS_RESULT,
    });
  });

  it("selects the published result over historical DRAFT data", async () => {
    const identity = context();
    const published = await createResult(identity, {
      status: "PUBLISHED",
      overallResult: "PASS",
    });
    await createResult(identity, { status: "DRAFT", overallResult: "FAIL" });

    const resolved = await resolve(identity);

    expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.FOUND);
    expect(String(resolved.result._id)).toBe(String(published._id));
  });

  it("selects the only published result across multiple exams", async () => {
    const identity = context();
    await createResult(identity, { status: "DRAFT", overallResult: "PASS" });
    const published = await createResult(identity, {
      status: "PUBLISHED",
      overallResult: "FAIL",
    });
    await createResult(identity, { status: "LOCKED", overallResult: "PASS" });

    const resolved = await resolve(identity);

    expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.FOUND);
    expect(String(resolved.result._id)).toBe(String(published._id));
    expect(resolved.result.overallResult).toBe("FAIL");
  });
});
