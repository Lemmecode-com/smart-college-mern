/**
 * Centralized formatting and transformation utilities for Student Results UX.
 *
 * All business rules and calculations here operate strictly on the existing
 * GET /api/results/my-results payload.
 *
 * IMPORTANT:
 * - Does NOT calculate percentage or invent maximum marks.
 * - Does NOT calculate promotion eligibility.
 * - Groups flat BacklogAttempt records by backlogId to prevent double-counting.
 */

/**
 * Maps raw backend status enums to student-friendly display labels.
 *
 * @param {string} status - Raw backend status enum (PASS, FAIL, INCOMPLETE, etc.)
 * @returns {string} Student-friendly label
 */
export const getResultStatusLabel = (status) => {
  if (!status) return "Pending";
  const normalized = String(status).toUpperCase();

  switch (normalized) {
    case "PASS":
      return "Passed";
    case "FAIL":
      return "Failed";
    case "INCOMPLETE":
      return "Result Pending";
    case "OPEN":
      return "Re-appear Required";
    case "ATTEMPTED":
      return "Evaluation Pending";
    case "CLEARED":
      return "Backlog Cleared";
    case "CANCELLED":
      return "Cancelled";
    case "PUBLISHED":
      return "Published";
    case "DRAFT":
      return "Draft";
    case "LOCKED":
      return "Finalized";
    default:
      return status;
  }
};

/**
 * Returns color tone configurations for status presentation.
 * Tone types: "success" | "danger" | "warning" | "info" | "neutral"
 *
 * @param {string} status
 * @returns {{ tone: string, bg: string, text: string, border: string }}
 */
export const getResultStatusTone = (status) => {
  if (!status) {
    return {
      tone: "neutral",
      bg: "#f1f5f9",
      text: "#475569",
      border: "#cbd5e1",
    };
  }

  const normalized = String(status).toUpperCase();

  switch (normalized) {
    case "PASS":
    case "CLEARED":
      return {
        tone: "success",
        bg: "#dcfce7",
        text: "#15803d",
        border: "#86efac",
      };
    case "FAIL":
    case "OPEN":
      return {
        tone: "danger",
        bg: "#fee2e2",
        text: "#b91c1c",
        border: "#fca5a5",
      };
    case "INCOMPLETE":
      return {
        tone: "warning",
        bg: "#fef3c7",
        text: "#b45309",
        border: "#fcd34d",
      };
    case "ATTEMPTED":
      return {
        tone: "info",
        bg: "#e0f2fe",
        text: "#0369a1",
        border: "#bae6fd",
      };
    default:
      return {
        tone: "neutral",
        bg: "#f1f5f9",
        text: "#475569",
        border: "#cbd5e1",
      };
  }
};

/**
 * Formats subject marks cleanly:
 * - 0 is displayed as "0"
 * - null or undefined is displayed as "—"
 *
 * @param {number|null|undefined} mark
 * @returns {string|number}
 */
export const formatMark = (mark) => {
  if (mark === null || mark === undefined) return "—";
  return mark;
};

/**
 * Formats subject type display.
 *
 * @param {string} type - "THEORY" | "PRACTICAL" | "COMPOSITE"
 * @returns {string}
 */
export const formatSubjectType = (type) => {
  if (!type) return "Theory";
  const normalized = String(type).toUpperCase();
  switch (normalized) {
    case "THEORY":
      return "Theory";
    case "PRACTICAL":
      return "Practical";
    case "COMPOSITE":
      return "Theory & Practical";
    default:
      return type;
  }
};

/**
 * Extracts and sorts the unique semesters available in regular results.
 *
 * @param {Array<Object>} regularResults
 * @returns {Array<number>} Semesters sorted descending (e.g. [3, 2, 1])
 */
export const getAvailableSemesters = (regularResults = []) => {
  if (!Array.isArray(regularResults)) return [];
  const semSet = new Set();
  for (const r of regularResults) {
    if (r?.semester !== null && r?.semester !== undefined) {
      const num = Number(r.semester);
      if (!Number.isNaN(num) && num > 0) {
        semSet.add(num);
      }
    }
  }
  return Array.from(semSet).sort((a, b) => b - a);
};

/**
 * Safely determines the highest/current semester from regular results.
 *
 * @param {Array<Object>} regularResults
 * @returns {number|null}
 */
export const getCurrentSemesterNumber = (regularResults = []) => {
  const semesters = getAvailableSemesters(regularResults);
  return semesters.length > 0 ? semesters[0] : null;
};

/**
 * Filters regular results by semester.
 * "ALL" returns the full unmodified array.
 *
 * @param {Array<Object>} regularResults
 * @param {string|number} selectedSemester - "ALL" or semester number
 * @returns {Array<Object>}
 */
export const filterResultsBySemester = (regularResults = [], selectedSemester) => {
  if (!Array.isArray(regularResults)) return [];
  if (selectedSemester === "ALL" || !selectedSemester) {
    return regularResults;
  }
  const semNum = Number(selectedSemester);
  return regularResults.filter((r) => Number(r.semester) === semNum);
};

/**
 * Formats a percentage value to 2 decimal places with % suffix.
 * Returns "Pending" if the percentage is null, undefined, or uncomputable.
 *
 * @param {number|null|undefined} percentage
 * @returns {string} e.g. "96.67%" or "Pending"
 */
export const formatPercentage = (percentage) => {
  if (
    percentage === null ||
    percentage === undefined ||
    Number.isNaN(Number(percentage))
  ) {
    return "Pending";
  }
  return `${Number(percentage).toFixed(2)}%`;
};

/**
 * Formats obtained marks out of maximum marks.
 * e.g. "145 / 150" or "145" if max marks is missing.
 *
 * @param {number|null|undefined} obtained
 * @param {number|null|undefined} max
 * @returns {string}
 */
export const formatMarksRatio = (obtained, max) => {
  const obtDisplay = obtained !== null && obtained !== undefined ? obtained : "—";
  if (max !== null && max !== undefined && Number(max) > 0) {
    return `${obtDisplay} / ${max}`;
  }
  return String(obtDisplay);
};

/**
 * Safely calculates total obtained marks for a list of subjects.
 *
 * @param {Array<Object>} subjects
 * @returns {{ obtainedMarks: number, enteredCount: number, totalCount: number }}
 */
export const calculateObtainedMarks = (subjects = []) => {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return { obtainedMarks: 0, enteredCount: 0, totalCount: 0 };
  }

  let obtainedMarks = 0;
  let enteredCount = 0;

  for (const s of subjects) {
    if (s.totalMarks !== null && s.totalMarks !== undefined && !Number.isNaN(Number(s.totalMarks))) {
      obtainedMarks += Number(s.totalMarks);
      enteredCount++;
    }
  }

  return {
    obtainedMarks,
    enteredCount,
    totalCount: subjects.length,
  };
};

/**
 * Calculates academic performance overview across all published semesters.
 * Only calculates cumulative percentage if authoritative maximum marks exist for every term.
 *
 * @param {Array<Object>} regularResults
 * @returns {Object} Cumulative performance metrics and semester summaries
 */
export const calculateCumulativeSummary = (regularResults = []) => {
  if (!Array.isArray(regularResults) || regularResults.length === 0) {
    return {
      totalPassed: 0,
      totalFailed: 0,
      totalPending: 0,
      totalSubjects: 0,
      totalObtained: 0,
      totalMax: 0,
      cumulativePercentage: null,
      semesters: [],
    };
  }

  let totalPassed = 0;
  let totalFailed = 0;
  let totalPending = 0;
  let totalSubjects = 0;
  let totalObtained = 0;
  let totalMax = 0;
  let hasIncompleteOrMissingMax = false;

  const semesters = regularResults.map((r) => {
    totalPassed += r.passedSubjects || 0;
    totalFailed += r.failedSubjects || 0;
    totalPending += r.incompleteSubjects || 0;
    totalSubjects += r.totalSubjects || 0;

    const rObt = r.totalMarks != null ? Number(r.totalMarks) : null;
    const rMax = r.totalMaxMarks != null ? Number(r.totalMaxMarks) : null;

    if (rObt !== null && !Number.isNaN(rObt)) {
      totalObtained += rObt;
    }
    if (rMax !== null && !Number.isNaN(rMax) && rMax > 0) {
      totalMax += rMax;
    } else {
      hasIncompleteOrMissingMax = true;
    }

    if (r.overallResult === "INCOMPLETE" || r.percentage === null || r.percentage === undefined) {
      hasIncompleteOrMissingMax = true;
    }

    return {
      id: r._id,
      semester: r.semester,
      examName: r.examName || r.exam_id?.name || `Semester ${r.semester} Examination`,
      academicYear: r.academicYear,
      totalMarks: rObt,
      totalMaxMarks: rMax,
      percentage: r.percentage,
      passedSubjects: r.passedSubjects || 0,
      failedSubjects: r.failedSubjects || 0,
      incompleteSubjects: r.incompleteSubjects || 0,
      totalSubjects: r.totalSubjects || 0,
      backlogCount: r.backlogCount || 0,
      overallResult: r.overallResult || "PENDING",
      status: r.overallResult || "PENDING",
      publishedAt: r.publishedAt,
    };
  });

  const cumulativePercentage =
    !hasIncompleteOrMissingMax && totalMax > 0
      ? Number(((totalObtained / totalMax) * 100).toFixed(2))
      : null;

  return {
    totalPassed,
    totalFailed,
    totalPending,
    totalSubjects,
    totalObtained,
    totalMax,
    cumulativePercentage,
    semesters,
  };
};

/**
 * Groups flat backlog attempts by unique backlog subject (preferring backlogId).
 *
 * Resolves the multiple-attempt issue:
 * If Attempt #1 was FAIL and Attempt #2 was PASS, this outputs 1 backlog item
 * marked as "Backlog Cleared" with an attempt history containing both attempts.
 *
 * @param {Array<Object>} rawBacklogs - Flat backlog attempts from API
 * @returns {Array<Object>} Unique backlog subjects with grouped attempt history
 */
export const groupBacklogsBySubject = (rawBacklogs = []) => {
  if (!Array.isArray(rawBacklogs) || rawBacklogs.length === 0) {
    return [];
  }

  const groupMap = new Map();

  for (const attempt of rawBacklogs) {
    if (!attempt) continue;

    // Preferred unique key: backlogId. Fallback: subjectId or subjectCode.
    const key = String(attempt.backlogId || attempt.subjectId || attempt.subjectCode || Math.random());

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        backlogId: attempt.backlogId,
        subjectId: attempt.subjectId,
        subjectName: attempt.subjectName || "Subject",
        subjectCode: attempt.subjectCode || "",
        subjectType: attempt.subjectType || "THEORY",
        originalSemester: attempt.semester,
        originalAcademicYear: attempt.academicYear,
        attempts: [],
      });
    }

    const item = groupMap.get(key);
    item.attempts.push({
      attemptId: attempt.attemptId || attempt._id,
      attemptNumber: Number(attempt.attemptNumber || item.attempts.length + 1),
      examId: attempt.examId,
      examName: attempt.examName || "Exam",
      semester: attempt.semester,
      academicYear: attempt.academicYear,
      internalMarks: attempt.internalMarks ?? attempt.marks?.internalMarks ?? null,
      externalMarks: attempt.externalMarks ?? attempt.marks?.externalMarks ?? null,
      totalMarks: attempt.totalMarks ?? attempt.marks?.totalMarks ?? null,
      resultStatus: attempt.resultStatus || "INCOMPLETE",
      passed: Boolean(attempt.passed),
      cleared: Boolean(attempt.cleared),
      evaluatedAt: attempt.evaluatedAt,
    });
  }

  // Derive final status per unique backlog subject
  const grouped = [];
  for (const item of groupMap.values()) {
    // Sort attempts by attemptNumber ascending
    item.attempts.sort((a, b) => a.attemptNumber - b.attemptNumber);

    const latestAttempt = item.attempts[item.attempts.length - 1];

    // Check if any attempt cleared this backlog
    const hasClearedAttempt = item.attempts.some(
      (a) => a.cleared === true || a.resultStatus === "PASS"
    );

    let finalStatus = "OPEN";
    let isCleared = false;

    if (hasClearedAttempt) {
      finalStatus = "CLEARED";
      isCleared = true;
    } else if (latestAttempt?.resultStatus === "INCOMPLETE") {
      finalStatus = "ATTEMPTED";
      isCleared = false;
    } else {
      finalStatus = "OPEN";
      isCleared = false;
    }

    grouped.push({
      ...item,
      attemptCount: item.attempts.length,
      latestAttempt,
      isCleared,
      finalStatus,
      finalStatusLabel: getResultStatusLabel(finalStatus),
      finalStatusTone: getResultStatusTone(finalStatus),
    });
  }

  // Sort: open/pending first, cleared last, then by subject code/name
  return grouped.sort((a, b) => {
    if (a.isCleared !== b.isCleared) {
      return a.isCleared ? 1 : -1;
    }
    return (a.subjectName || "").localeCompare(b.subjectName || "");
  });
};

/**
 * Calculates summary metrics for UNIQUE backlog subjects (NOT raw attempts).
 *
 * @param {Array<Object>} groupedBacklogs - Result of groupBacklogsBySubject
 * @returns {{ total: number, cleared: number, pending: number, reappear: number }}
 */
export const calculateBacklogSummary = (groupedBacklogs = []) => {
  if (!Array.isArray(groupedBacklogs)) {
    return { total: 0, cleared: 0, pending: 0, reappear: 0 };
  }

  let cleared = 0;
  let pending = 0;
  let reappear = 0;

  for (const b of groupedBacklogs) {
    if (b.isCleared || b.finalStatus === "CLEARED") {
      cleared++;
    } else if (b.finalStatus === "ATTEMPTED") {
      pending++;
    } else {
      reappear++;
    }
  }

  return {
    total: groupedBacklogs.length,
    cleared,
    pending,
    reappear,
  };
};
