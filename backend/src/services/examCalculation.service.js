/**
 * Centralized Exam Pass/Fail Calculation Service.
 *
 * Single source of truth for subject-level pass/fail calculation.
 * All consumers (marks API, future SemesterResult) must use this service.
 *
 * Source of truth for configuration: the Exam's subject snapshot
 * (exam.subjects[]), NOT the mutable Subject document.
 *
 * Missing marks (null/undefined) are never coerced to 0.
 * Zero (0) is a valid entered mark.
 */

const SUBJECT_TYPES = ["THEORY", "PRACTICAL", "COMPOSITE"];

const isMissing = (value) => value === null || value === undefined;

const normalizeMark = (value) => (isMissing(value) ? null : value);

/**
 * THEORY calculation.
 *
 * Configuration: internalPassMarks, externalPassMarks, internalMaxMarks, externalMaxMarks.
 * Both internal and external marks are required to determine a result.
 */
const calculateTheory = (config, marks) => {
  const internal = normalizeMark(marks.internalMarks);
  const external = normalizeMark(marks.externalMarks);

  const internalMax = !isMissing(config.internalMaxMarks) ? Number(config.internalMaxMarks) : null;
  const externalMax = !isMissing(config.externalMaxMarks) ? Number(config.externalMaxMarks) : null;
  const maxMarks = internalMax !== null && externalMax !== null ? internalMax + externalMax : null;

  const configIncomplete =
    isMissing(config.internalPassMarks) || isMissing(config.externalPassMarks);

  if (configIncomplete || isMissing(internal) || isMissing(external)) {
    return {
      subjectType: "THEORY",
      internalMarks: internal,
      externalMarks: external,
      totalMarks: null,
      internalMaxMarks: internalMax,
      externalMaxMarks: externalMax,
      maxMarks,
      internalPassed: null,
      externalPassed: null,
      passed: false,
      status: "INCOMPLETE",
    };
  }

  const internalPassed = internal >= config.internalPassMarks;
  const externalPassed = external >= config.externalPassMarks;
  const passed = internalPassed && externalPassed;

  return {
    subjectType: "THEORY",
    internalMarks: internal,
    externalMarks: external,
    totalMarks: internal + external,
    internalMaxMarks: internalMax,
    externalMaxMarks: externalMax,
    maxMarks,
    internalPassed,
    externalPassed,
    passed,
    status: passed ? "PASS" : "FAIL",
  };
};

/**
 * PRACTICAL calculation.
 *
 * Configuration: passMarks (applicable maximum is internalMaxMarks).
 * Only internal marks are applicable.
 */
const calculatePractical = (config, marks) => {
  const internal = normalizeMark(marks.internalMarks);
  const internalMax = !isMissing(config.internalMaxMarks) ? Number(config.internalMaxMarks) : null;
  const maxMarks = internalMax;

  if (isMissing(config.passMarks) || isMissing(internal)) {
    return {
      subjectType: "PRACTICAL",
      internalMarks: internal,
      externalMarks: null,
      totalMarks: null,
      internalMaxMarks: internalMax,
      externalMaxMarks: null,
      maxMarks,
      passed: false,
      status: "INCOMPLETE",
    };
  }

  const passed = internal >= config.passMarks;

  return {
    subjectType: "PRACTICAL",
    internalMarks: internal,
    externalMarks: null,
    totalMarks: internal,
    internalMaxMarks: internalMax,
    externalMaxMarks: null,
    maxMarks,
    passed,
    status: passed ? "PASS" : "FAIL",
  };
};

/**
 * COMPOSITE calculation.
 *
 * Configuration: passMarks (overall), internalMaxMarks, externalMaxMarks.
 * Total = internal + external; passed = total >= passMarks.
 */
const calculateComposite = (config, marks) => {
  const internal = normalizeMark(marks.internalMarks);
  const external = normalizeMark(marks.externalMarks);

  const internalMax = !isMissing(config.internalMaxMarks) ? Number(config.internalMaxMarks) : null;
  const externalMax = !isMissing(config.externalMaxMarks) ? Number(config.externalMaxMarks) : null;
  const maxMarks = internalMax !== null && externalMax !== null ? internalMax + externalMax : null;

  if (isMissing(config.passMarks) || isMissing(internal) || isMissing(external)) {
    return {
      subjectType: "COMPOSITE",
      internalMarks: internal,
      externalMarks: external,
      totalMarks: null,
      internalMaxMarks: internalMax,
      externalMaxMarks: externalMax,
      maxMarks,
      passed: false,
      status: "INCOMPLETE",
    };
  }

  const total = internal + external;
  const passed = total >= config.passMarks;

  return {
    subjectType: "COMPOSITE",
    internalMarks: internal,
    externalMarks: external,
    totalMarks: total,
    internalMaxMarks: internalMax,
    externalMaxMarks: externalMax,
    maxMarks,
    passed,
    status: passed ? "PASS" : "FAIL",
  };
};

/**
 * Calculate pass/fail for a single student's marks on one exam subject.
 *
 * @param {Object} config  Exam subject snapshot (from exam.subjects[]).
 * @param {string} config.subjectType   THEORY | PRACTICAL | COMPOSITE
 * @param {number} [config.internalPassMarks]
 * @param {number} [config.externalPassMarks]
 * @param {number} [config.passMarks]
 * @param {Object} marks   Raw student marks.
 * @param {number|null} [marks.internalMarks]
 * @param {number|null} [marks.externalMarks]
 * @returns {Object} deterministic calculation result
 */
exports.calculateSubjectResult = (config = {}, marks = {}) => {
  const type = config.subjectType;
  const internalMax = !isMissing(config.internalMaxMarks) ? Number(config.internalMaxMarks) : null;
  const externalMax = !isMissing(config.externalMaxMarks) ? Number(config.externalMaxMarks) : null;

  if (!SUBJECT_TYPES.includes(type)) {
    return {
      subjectType: type || null,
      internalMarks: normalizeMark(marks.internalMarks),
      externalMarks: normalizeMark(marks.externalMarks),
      totalMarks: null,
      internalMaxMarks: internalMax,
      externalMaxMarks: externalMax,
      maxMarks: null,
      passed: false,
      status: "INCOMPLETE",
    };
  }

  switch (type) {
    case "THEORY":
      return calculateTheory(config, marks);
    case "PRACTICAL":
      return calculatePractical(config, marks);
    case "COMPOSITE":
      return calculateComposite(config, marks);
    default:
      return {
        subjectType: type,
        internalMarks: normalizeMark(marks.internalMarks),
        externalMarks: normalizeMark(marks.externalMarks),
        totalMarks: null,
        internalMaxMarks: internalMax,
        externalMaxMarks: externalMax,
        maxMarks: null,
        passed: false,
        status: "INCOMPLETE",
      };
  }
};

/**
 * Calculate totals and official percentage for a list of subjects.
 *
 * Rules:
 * - All subjects (PASS and FAIL) are included in totalMarks and totalMaxMarks.
 * - If overallResult is INCOMPLETE or any subject is INCOMPLETE or has null marks:
 *   percentage is null.
 * - If totalMaxMarks is 0 or null: percentage is null.
 * - Otherwise: percentage is rounded to 2 decimal places.
 *
 * @param {Array<Object>} subjects
 * @param {string} overallResult  "PASS" | "FAIL" | "INCOMPLETE"
 * @returns {{ totalMarks: number, totalMaxMarks: number, percentage: number|null }}
 */
const calculateSemesterTotals = (subjects = [], overallResult = "INCOMPLETE") => {
  let totalMarks = 0;
  let totalMaxMarks = 0;
  let hasIncomplete = overallResult === "INCOMPLETE" || subjects.length === 0;

  for (const s of subjects) {
    if (
      s.status === "INCOMPLETE" ||
      s.totalMarks === null ||
      s.totalMarks === undefined ||
      s.maxMarks === null ||
      s.maxMarks === undefined
    ) {
      hasIncomplete = true;
    }

    if (s.totalMarks !== null && s.totalMarks !== undefined) {
      totalMarks += Number(s.totalMarks);
    }
    if (s.maxMarks !== null && s.maxMarks !== undefined) {
      totalMaxMarks += Number(s.maxMarks);
    }
  }

  const percentage =
    hasIncomplete || totalMaxMarks <= 0
      ? null
      : Number(((totalMarks / totalMaxMarks) * 100).toFixed(2));

  return {
    totalMarks,
    totalMaxMarks,
    percentage,
  };
};

exports.calculateSemesterTotals = calculateSemesterTotals;
exports.SUBJECT_TYPES = SUBJECT_TYPES;
