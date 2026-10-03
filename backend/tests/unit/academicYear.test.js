const {
  normalizeAcademicYear,
  academicYearRepresentations,
} = require("../../src/utils/academicYear.util");

describe("academicYear.util - normalization", () => {
  describe("normalizeAcademicYear", () => {
    it("normalizes full format (2026-2027 -> 2026-27)", () => {
      expect(normalizeAcademicYear("2026-2027")).toBe("2026-27");
    });

    it("normalizes short format (2026-27 -> 2026-27)", () => {
      expect(normalizeAcademicYear("2026-27")).toBe("2026-27");
    });

    it("both formats normalize to the same canonical value", () => {
      expect(normalizeAcademicYear("2026-2027")).toBe(
        normalizeAcademicYear("2026-27"),
      );
    });

    it("normalizes century-crossing academic years (1999-2000)", () => {
      expect(normalizeAcademicYear("1999-2000")).toBe("1999-00");
      expect(normalizeAcademicYear("1999-00")).toBe("1999-00");
    });

    it("returns null for null", () => {
      expect(normalizeAcademicYear(null)).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(normalizeAcademicYear(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(normalizeAcademicYear("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(normalizeAcademicYear("   ")).toBeNull();
    });

    it("returns null for non-string input", () => {
      expect(normalizeAcademicYear(2026)).toBeNull();
      expect(normalizeAcademicYear({})).toBeNull();
    });

    it("returns null for malformed values", () => {
      expect(normalizeAcademicYear("not-a-year")).toBeNull();
      expect(normalizeAcademicYear("20262027")).toBeNull();
      expect(normalizeAcademicYear("2026-202")).toBeNull();
      expect(normalizeAcademicYear("26-27")).toBeNull();
      expect(normalizeAcademicYear("abc-def")).toBeNull();
    });

    it("handles leading/trailing whitespace", () => {
      expect(normalizeAcademicYear("  2026-27  ")).toBe("2026-27");
      expect(normalizeAcademicYear("  2026-2027  ")).toBe("2026-27");
    });
  });

  describe("academicYearRepresentations", () => {
    it("returns both short and full representations for short input", () => {
      expect(academicYearRepresentations("2026-27")).toEqual([
        "2026-27",
        "2026-2027",
      ]);
    });

    it("returns both short and full representations for full input", () => {
      expect(academicYearRepresentations("2026-2027")).toEqual([
        "2026-27",
        "2026-2027",
      ]);
    });

    it("returns both representations regardless of input format (equivalent sets)", () => {
      expect(
        academicYearRepresentations("2026-27"),
      ).toEqual(academicYearRepresentations("2026-2027"));
    });

    it("handles century-crossing academic years", () => {
      const reps = academicYearRepresentations("1999-00");
      expect(reps).toContain("1999-00");
      expect(reps).toContain("1999-2000");
    });

    it("returns both representations when start and end are in the same century", () => {
      const reps = academicYearRepresentations("2026-27");
      expect(reps).toHaveLength(2);
      expect(reps).toContain("2026-27");
      expect(reps).toContain("2026-2027");
    });

    it("returns null for invalid input", () => {
      expect(academicYearRepresentations(null)).toBeNull();
      expect(academicYearRepresentations(undefined)).toBeNull();
      expect(academicYearRepresentations("")).toBeNull();
      expect(academicYearRepresentations("malformed")).toBeNull();
    });
  });
});
