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
 * Configuration: internalPassMarks, externalPassMarks.
 * Both internal and external marks are required to determine a result.
 */
const calculateTheory = (config, marks) => {
  const internal = normalizeMark(marks.internalMarks);
  const external = normalizeMark(marks.externalMarks);

  const configIncomplete =
    isMissing(config.internalPassMarks) || isMissing(config.externalPassMarks);

  if (configIncomplete || isMissing(internal) || isMissing(external)) {
    return {
      subjectType: "THEORY",
      internalMarks: internal,
      externalMarks: external,
      totalMarks: null,
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

  if (isMissing(config.passMarks) || isMissing(internal)) {
    return {
      subjectType: "PRACTICAL",
      internalMarks: internal,
      externalMarks: null,
      totalMarks: null,
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
    passed,
    status: passed ? "PASS" : "FAIL",
  };
};

/**
 * COMPOSITE calculation.
 *
 * Configuration: passMarks (overall).
 * Total = internal + external; passed = total >= passMarks.
 */
const calculateComposite = (config, marks) => {
  const internal = normalizeMark(marks.internalMarks);
  const external = normalizeMark(marks.externalMarks);

  if (isMissing(config.passMarks) || isMissing(internal) || isMissing(external)) {
    return {
      subjectType: "COMPOSITE",
      internalMarks: internal,
      externalMarks: external,
      totalMarks: null,
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

  if (!SUBJECT_TYPES.includes(type)) {
    return {
      subjectType: type || null,
      internalMarks: normalizeMark(marks.internalMarks),
      externalMarks: normalizeMark(marks.externalMarks),
      totalMarks: null,
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
        passed: false,
        status: "INCOMPLETE",
      };
  }
};

exports.SUBJECT_TYPES = SUBJECT_TYPES;
