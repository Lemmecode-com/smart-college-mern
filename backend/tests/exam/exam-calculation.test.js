const { calculateSubjectResult } = require("../../src/services/examCalculation.service");

/**
 * Unit tests for the centralized exam pass/fail calculation service.
 *
 * Source of truth for configuration: the Exam subject snapshot.
 * These tests verify the calculation logic in isolation.
 */
describe("EXAM CALCULATION — centralized pass/fail service", () => {
  // ---- Helpers ---------------------------------------------------------

  const theoryConfig = (overrides = {}) => ({
    subjectType: "THEORY",
    internalMaxMarks: 30,
    externalMaxMarks: 70,
    internalPassMarks: 12,
    externalPassMarks: 28,
    ...overrides,
  });

  const practicalConfig = (overrides = {}) => ({
    subjectType: "PRACTICAL",
    internalMaxMarks: 50,
    passMarks: 25,
    ...overrides,
  });

  const compositeConfig = (overrides = () => ({})) => ({
    subjectType: "COMPOSITE",
    internalMaxMarks: 40,
    externalMaxMarks: 60,
    passMarks: 50,
    ...overrides(),
  });

  // ---- THEORY ----------------------------------------------------------

  describe("THEORY", () => {
    it("1. internal pass + external pass → PASS", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 25,
        externalMarks: 60,
      });
      expect(result.status).toBe("PASS");
      expect(result.passed).toBe(true);
      expect(result.internalPassed).toBe(true);
      expect(result.externalPassed).toBe(true);
      expect(result.totalMarks).toBe(85);
    });

    it("2. internal fail + external pass → FAIL", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 10,
        externalMarks: 60,
      });
      expect(result.status).toBe("FAIL");
      expect(result.passed).toBe(false);
      expect(result.internalPassed).toBe(false);
      expect(result.externalPassed).toBe(true);
    });

    it("3. internal pass + external fail → FAIL", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 25,
        externalMarks: 20,
      });
      expect(result.status).toBe("FAIL");
      expect(result.passed).toBe(false);
      expect(result.internalPassed).toBe(true);
      expect(result.externalPassed).toBe(false);
    });

    it("4. both fail → FAIL", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 5,
        externalMarks: 10,
      });
      expect(result.status).toBe("FAIL");
      expect(result.passed).toBe(false);
      expect(result.internalPassed).toBe(false);
      expect(result.externalPassed).toBe(false);
    });

    it("5. exact internal pass mark → PASS (internal component)", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 12,
        externalMarks: 60,
      });
      expect(result.internalPassed).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.status).toBe("PASS");
    });

    it("6. exact external pass mark → PASS (external component)", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 25,
        externalMarks: 28,
      });
      expect(result.externalPassed).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.status).toBe("PASS");
    });

    it("9. missing internal marks → INCOMPLETE", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: null,
        externalMarks: 50,
      });
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
      expect(result.internalMarks).toBeNull();
      expect(result.externalMarks).toBe(50);
    });

    it("10. missing external marks → INCOMPLETE", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 25,
        externalMarks: null,
      });
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
    });

    it("both marks missing → INCOMPLETE", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: null,
        externalMarks: null,
      });
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
      expect(result.totalMarks).toBeNull();
    });
  });

  // ---- PRACTICAL -------------------------------------------------------

  describe("PRACTICAL", () => {
    it("11. marks equal pass mark → PASS", () => {
      const result = calculateSubjectResult(practicalConfig(), {
        internalMarks: 25,
      });
      expect(result.status).toBe("PASS");
      expect(result.passed).toBe(true);
      expect(result.totalMarks).toBe(25);
    });

    it("12. marks below pass mark → FAIL", () => {
      const result = calculateSubjectResult(practicalConfig(), {
        internalMarks: 24,
      });
      expect(result.status).toBe("FAIL");
      expect(result.passed).toBe(false);
    });

    it("14. missing marks → INCOMPLETE", () => {
      const result = calculateSubjectResult(practicalConfig(), {
        internalMarks: null,
      });
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
      expect(result.totalMarks).toBeNull();
    });

    it("marks above pass → PASS", () => {
      const result = calculateSubjectResult(practicalConfig(), {
        internalMarks: 45,
      });
      expect(result.status).toBe("PASS");
      expect(result.passed).toBe(true);
    });
  });

  // ---- COMPOSITE -------------------------------------------------------

  describe("COMPOSITE", () => {
    it("15. total equal pass mark → PASS", () => {
      const result = calculateSubjectResult(compositeConfig(), {
        internalMarks: 25,
        externalMarks: 25,
      });
      expect(result.totalMarks).toBe(50);
      expect(result.status).toBe("PASS");
      expect(result.passed).toBe(true);
    });

    it("16. total below pass mark → FAIL", () => {
      const result = calculateSubjectResult(compositeConfig(), {
        internalMarks: 20,
        externalMarks: 25,
      });
      expect(result.totalMarks).toBe(45);
      expect(result.status).toBe("FAIL");
      expect(result.passed).toBe(false);
    });

    it("19. missing required marks → INCOMPLETE", () => {
      const result = calculateSubjectResult(compositeConfig(), {
        internalMarks: null,
        externalMarks: 40,
      });
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
      expect(result.totalMarks).toBeNull();
    });

    it("both marks missing → INCOMPLETE", () => {
      const result = calculateSubjectResult(compositeConfig(), {
        internalMarks: null,
        externalMarks: null,
      });
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
    });
  });

  // ---- ZERO vs missing -------------------------------------------------

  describe("ZERO vs missing", () => {
    it("20. zero marks are treated as entered, not missing (THEORY)", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 0,
        externalMarks: 60,
      });
      expect(result.status).not.toBe("INCOMPLETE");
      expect(result.internalMarks).toBe(0);
      expect(result.internalPassed).toBe(false);
      expect(result.passed).toBe(false);
      expect(result.status).toBe("FAIL");
    });

    it("zero marks are treated as entered, not missing (PRACTICAL)", () => {
      const result = calculateSubjectResult(practicalConfig(), {
        internalMarks: 0,
      });
      expect(result.status).not.toBe("INCOMPLETE");
      expect(result.internalMarks).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.status).toBe("FAIL");
    });

    it("zero marks are treated as entered, not missing (COMPOSITE)", () => {
      const result = calculateSubjectResult(compositeConfig(), {
        internalMarks: 0,
        externalMarks: 60,
      });
      expect(result.status).not.toBe("INCOMPLETE");
      expect(result.totalMarks).toBe(60);
      expect(result.passed).toBe(true);
      expect(result.status).toBe("PASS");
    });
  });

  // ---- Exam snapshot usage ---------------------------------------------

  describe("Exam snapshot usage", () => {
    it("21. uses Exam Subject snapshot configuration", () => {
      const snapshotConfig = {
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        internalPassMarks: 12,
        externalPassMarks: 28,
      };
      const result = calculateSubjectResult(snapshotConfig, {
        internalMarks: 25,
        externalMarks: 60,
      });
      expect(result.status).toBe("PASS");
      expect(result.totalMarks).toBe(85);
    });

    it("22. does not depend on mutable Subject configuration after Exam creation", () => {
      // Exam created with this snapshot
      const examSnapshot = theoryConfig({
        internalPassMarks: 12,
        externalPassMarks: 28,
      });

      // Later, the Subject configuration changes (simulated by a different object)
      const mutatedSubject = theoryConfig({
        internalPassMarks: 20,
        externalPassMarks: 50,
      });

      const result = calculateSubjectResult(examSnapshot, {
        internalMarks: 15,
        externalMarks: 40,
      });

      // Exam calculation uses the snapshot, not the mutated subject
      expect(result.internalPassed).toBe(true); // 15 >= 12
      expect(result.externalPassed).toBe(true); // 40 >= 28
      expect(result.status).toBe("PASS");

      // Verify the mutated config would give a different result
      const mutatedResult = calculateSubjectResult(mutatedSubject, {
        internalMarks: 15,
        externalMarks: 40,
      });
      expect(mutatedResult.internalPassed).toBe(false); // 15 < 20
      expect(mutatedResult.externalPassed).toBe(false); // 40 < 50
      expect(mutatedResult.status).toBe("FAIL");
    });
  });

  // ---- Invalid data / edge cases ---------------------------------------

  describe("Invalid data handling", () => {
    it("invalid subject type → INCOMPLETE", () => {
      const result = calculateSubjectResult(
        { subjectType: "INVALID" },
        { internalMarks: 25, externalMarks: 60 },
      );
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
    });

    it("missing subject type → INCOMPLETE", () => {
      const result = calculateSubjectResult(
        {},
        { internalMarks: 25, externalMarks: 60 },
      );
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
    });

    it("missing config → INCOMPLETE", () => {
      const result = calculateSubjectResult(undefined, {
        internalMarks: 25,
        externalMarks: 60,
      });
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
    });

    it("THEORY with missing pass marks config → INCOMPLETE", () => {
      const result = calculateSubjectResult(
        { subjectType: "THEORY" },
        { internalMarks: 25, externalMarks: 60 },
      );
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
    });

    it("PRACTICAL with missing pass marks config → INCOMPLETE", () => {
      const result = calculateSubjectResult(
        { subjectType: "PRACTICAL" },
        { internalMarks: 25 },
      );
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
    });

    it("COMPOSITE with missing pass marks config → INCOMPLETE", () => {
      const result = calculateSubjectResult(
        { subjectType: "COMPOSITE" },
        { internalMarks: 25, externalMarks: 25 },
      );
      expect(result.status).toBe("INCOMPLETE");
      expect(result.passed).toBe(false);
    });

    it("negative marks do not produce PASS (THEORY)", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: -5,
        externalMarks: 60,
      });
      expect(result.passed).toBe(false);
      expect(result.status).toBe("FAIL");
    });

    it("undefined marks treated as missing → INCOMPLETE", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: undefined,
        externalMarks: 60,
      });
      expect(result.status).toBe("INCOMPLETE");
      expect(result.internalMarks).toBeNull();
    });
  });

  // ---- Result structure ------------------------------------------------

  describe("Result structure", () => {
    it("PASS result has all expected fields", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: 25,
        externalMarks: 60,
      });
      expect(result).toEqual({
        subjectType: "THEORY",
        internalMarks: 25,
        externalMarks: 60,
        totalMarks: 85,
        internalPassed: true,
        externalPassed: true,
        passed: true,
        status: "PASS",
      });
    });

    it("INCOMPLETE result has expected fields", () => {
      const result = calculateSubjectResult(theoryConfig(), {
        internalMarks: null,
        externalMarks: null,
      });
      expect(result).toEqual({
        subjectType: "THEORY",
        internalMarks: null,
        externalMarks: null,
        totalMarks: null,
        internalPassed: null,
        externalPassed: null,
        passed: false,
        status: "INCOMPLETE",
      });
    });

    it("PRACTICAL PASS result has expected fields", () => {
      const result = calculateSubjectResult(practicalConfig(), {
        internalMarks: 30,
      });
      expect(result).toEqual({
        subjectType: "PRACTICAL",
        internalMarks: 30,
        externalMarks: null,
        totalMarks: 30,
        passed: true,
        status: "PASS",
      });
    });

    it("COMPOSITE FAIL result has expected fields", () => {
      const result = calculateSubjectResult(compositeConfig(), {
        internalMarks: 10,
        externalMarks: 20,
      });
      expect(result).toEqual({
        subjectType: "COMPOSITE",
        internalMarks: 10,
        externalMarks: 20,
        totalMarks: 30,
        passed: false,
        status: "FAIL",
      });
    });
  });
});
