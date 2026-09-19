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

  // -------------------------------------------------------------------------
  // RCA-1 — academic-year format normalization
  // "2026-2027" (full) and "2026-27" (short) must be treated as equivalent.
  // -------------------------------------------------------------------------

  describe("RCA-1 - academic-year format normalization", () => {
    // Test 1 — Full Student AY vs Short Result AY
    it("Test 1: resolves result when student AY is full (2026-2027) and result AY is short (2026-27)", async () => {
      const identity = { ...context(), academicYear: "2026-2027" };
      const result = await createResult(identity, {
        academicYear: "2026-27",
        status: "PUBLISHED",
        overallResult: "PASS",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.FOUND);
      expect(String(resolved.result._id)).toBe(String(result._id));
    });

    // Test 2 — Short Student AY vs Full Result AY
    it("Test 2: resolves result when student AY is short (2026-27) and result AY is full (2026-2027)", async () => {
      const identity = { ...context(), academicYear: "2026-27" };
      const result = await createResult(identity, {
        academicYear: "2026-2027",
        status: "PUBLISHED",
        overallResult: "PASS",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.FOUND);
      expect(String(resolved.result._id)).toBe(String(result._id));
    });

    // Test 3 — Exact matching format (short vs short)
    it("Test 3: resolves result when both student and result use short format (2026-27)", async () => {
      const identity = { ...context(), academicYear: "2026-27" };
      const result = await createResult(identity, {
        academicYear: "2026-27",
        status: "PUBLISHED",
        overallResult: "PASS",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.FOUND);
      expect(String(resolved.result._id)).toBe(String(result._id));
    });

    // Test 3b — Exact matching format (full vs full)
    it("Test 3b: resolves result when both student and result use full format (2026-2027)", async () => {
      const identity = { ...context(), academicYear: "2026-2027" };
      const result = await createResult(identity, {
        academicYear: "2026-2027",
        status: "PUBLISHED",
        overallResult: "PASS",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.FOUND);
      expect(String(resolved.result._id)).toBe(String(result._id));
    });

    // Test 4 — Different academic year
    it("Test 4: returns NO_RESULT when academic years differ (2026-2027 vs 2025-26)", async () => {
      const identity = { ...context(), academicYear: "2026-2027" };
      await createResult(identity, {
        academicYear: "2025-26",
        status: "PUBLISHED",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.NO_RESULT);
    });

    // Test 5 — Same academic year but different student
    it("Test 5: returns NO_RESULT when student differs", async () => {
      const identity = { ...context(), academicYear: "2026-2027" };
      const otherStudent = new mongoose.Types.ObjectId();
      const differentIdentity = { ...identity, studentId: otherStudent };
      await createResult(differentIdentity, {
        academicYear: "2026-27",
        status: "PUBLISHED",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.NO_RESULT);
    });

    // Test 6 — Same academic year but different course
    it("Test 6: returns NO_RESULT when course differs", async () => {
      const identity = { ...context(), academicYear: "2026-2027" };
      const otherCourse = new mongoose.Types.ObjectId();
      const differentIdentity = { ...identity, courseId: otherCourse };
      await createResult(differentIdentity, {
        academicYear: "2026-27",
        status: "PUBLISHED",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.NO_RESULT);
    });

    // Test 7 — Same academic year but different semester
    it("Test 7: returns NO_RESULT when semester differs", async () => {
      const identity = { ...context(), academicYear: "2026-2027" };
      const differentIdentity = { ...identity, semester: 1 };
      await createResult(differentIdentity, {
        academicYear: "2026-27",
        semester: 1,
        status: "PUBLISHED",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.NO_RESULT);
    });

    // Test 8 — Non-PUBLISHED result (DRAFT) with matching formats
    it("Test 8a: returns NO_RESULT for DRAFT result even with cross-format AY match", async () => {
      const identity = { ...context(), academicYear: "2026-2027" };
      await createResult(identity, {
        academicYear: "2026-27",
        status: "DRAFT",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.NO_RESULT);
    });

    // Test 8 — Non-PUBLISHED result (LOCKED) with matching formats
    it("Test 8b: returns NO_RESULT for LOCKED result even with cross-format AY match", async () => {
      const identity = { ...context(), academicYear: "2026-2027" };
      await createResult(identity, {
        academicYear: "2026-27",
        status: "LOCKED",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.NO_RESULT);
    });

    // Test 9 — Ambiguous: two PUBLISHED results in different formats for same context
    it("Test 9: returns AMBIGUOUS_RESULT when multiple PUBLISHED results match across formats", async () => {
      const identity = { ...context(), academicYear: "2026-27" };
      await createResult(identity, {
        academicYear: "2026-27",
        status: "PUBLISHED",
        overallResult: "PASS",
      });
      await createResult(identity, {
        academicYear: "2026-2027",
        status: "PUBLISHED",
        overallResult: "FAIL",
      });

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.AMBIGUOUS_RESULT);
    });

    // Test 10 — Invalid/missing academic year
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["empty string", ""],
      ["malformed", "not-a-year"],
      ["no hyphen", "20262027"],
      ["three-digit end", "2026-202"],
    ])("Test 10: returns NO_RESULT for invalid academic year (%s)", async (_label, ay) => {
      const identity = { ...context(), academicYear: ay };

      const resolved = await resolve(identity);

      expect(resolved.status).toBe(RESULT_AUTHORITY_STATUS.NO_RESULT);
    });
  });
});
