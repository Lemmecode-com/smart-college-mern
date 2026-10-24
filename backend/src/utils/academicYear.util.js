/**
 * Academic-year normalization utilities.
 *
 * Academic years can be represented in two equivalent formats across the
 * codebase:
 *   "2026-2027"  (full — YYYY-YYYY, e.g. Student.currentAcademicYear default)
 *   "2026-27"    (short — YYYY-YY,  e.g. some Exam / SemesterResult values)
 *
 * These utilities normalize either representation to a canonical short form
 * and derive the set of database-equivalent representations so that lookups
 * are format-agnostic without resorting to substring or regex matching on
 * stored data.
 */

const ACADEMIC_YEAR_REGEX = /^(\d{4})-(\d{2}|\d{4})$/;

/**
 * Normalize an academic-year string to canonical short form "YYYY-YY".
 *
 * - "2026-2027" -> "2026-27"
 * - "2026-27"   -> "2026-27"
 *
 * Returns null for null / undefined / empty / malformed values so callers can
 * safely short-circuit before issuing a database query.
 *
 * @param {string} academicYear
 * @returns {string|null} canonical "YYYY-YY" or null
 */
const normalizeAcademicYear = (academicYear) => {
  if (typeof academicYear !== "string") return null;

  const trimmed = academicYear.trim();
  if (!trimmed) return null;

  const match = trimmed.match(ACADEMIC_YEAR_REGEX);
  if (!match) return null;

  const startYear = parseInt(match[1], 10);
  const endPart = match[2];

  const endTwoDigit =
    endPart.length === 4 ? parseInt(endPart, 10) % 100 : parseInt(endPart, 10);

  return `${String(startYear).padStart(4, "0")}-${String(endTwoDigit).padStart(2, "0")}`;
};

/**
 * Derive every database-equivalent representation of an academic year.
 *
 * Given canonical "2026-27" returns ["2026-27", "2026-2027"] so a query can
 * match either stored format using an exact `$in` match.
 *
 * Returns null when the input cannot be normalized, allowing callers to
 * short-circuit with a safe NO_RESULT.
 *
 * @param {string} academicYear
 * @returns {string[]|null} array of equivalent representations or null
 */
const academicYearRepresentations = (academicYear) => {
  const normalized = normalizeAcademicYear(academicYear);
  if (!normalized) return null;

  const [startStr, endTwoDigitStr] = normalized.split("-");
  const startYear = parseInt(startStr, 10);
  const endTwoDigit = parseInt(endTwoDigitStr, 10);

  const startTwoDigit = startYear % 100;
  let fullEndYear;
  if (endTwoDigit > startTwoDigit) {
    fullEndYear = startYear - startTwoDigit + endTwoDigit;
  } else {
    fullEndYear = startYear - startTwoDigit + 100 + endTwoDigit;
  }

  const fullRepr = `${startYear}-${fullEndYear}`;

  if (fullRepr === normalized) {
    return [normalized];
  }
  return [normalized, fullRepr];
};

module.exports = {
  normalizeAcademicYear,
  academicYearRepresentations,
};
