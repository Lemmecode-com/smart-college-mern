/**
 * Result Statement Data Mapper Utility
 *
 * Transforms:
 * 1. Persisted semester result from GET /api/results/my-results
 * 2. Student, college, and course metadata from GET /api/students/my-profile
 *
 * into a clean, marksheet-specific view model.
 *
 * IMPORTANT:
 * - Does NOT calculate or alter academic results.
 * - Uses persisted snapshot values from SemesterResult.
 * - Sourced strictly from fields that actually exist in the NOVAA data model.
 * - Does NOT invent Grade, Grade Point, Credit Point, SGPA, or CGPA.
 */

import { formatSubjectType } from "./resultFormatters.util";

/**
 * Derives the academic year number from a semester number.
 * Follows the NOVAA standard rule: Year = Math.ceil(semester / 2)
 *
 * @param {number|string} semester
 * @returns {number} 1 to 4+
 */
export const getAcademicYearNumber = (semester) => {
  const semNum = Number(semester);
  if (!semNum || Number.isNaN(semNum) || semNum < 1) return 1;
  return Math.ceil(semNum / 2);
};

/**
 * Returns human-readable label for an academic year number.
 * Supports custom labels configured on the course or falls back to standard labels.
 *
 * @param {number} yearNumber - 1-indexed year number
 * @param {Array<string>|null} [customLabels=null] - Optional course.yearLabels override array
 * @returns {string} E.g. "First Year", "Second Year"
 */
export const getAcademicYearLabel = (yearNumber, customLabels = null) => {
  const yNum = Number(yearNumber);

  // If customLabels array is provided and has a non-empty string for this year
  if (Array.isArray(customLabels) && customLabels[yNum - 1]) {
    const custom = String(customLabels[yNum - 1]).trim();
    if (custom) return custom;
  }

  switch (yNum) {
    case 1:
      return "First Year";
    case 2:
      return "Second Year";
    case 3:
      return "Third Year";
    case 4:
      return "Final Year";
    default:
      return `Year ${yNum}`;
  }
};

/**
 * Derives dynamic academic year filter items for a course based on its authoritative configuration.
 *
 * Precedence:
 * 1. course.durationYears (e.g. 2, 3, 4)
 * 2. course.durationSemesters -> Math.ceil(durationSemesters / 2)
 * 3. Fallback: inspect publishedResults to determine max observed semester -> Math.ceil(maxSem / 2)
 * 4. Safe floor: at least 1 year (never blindly assumes 4 years)
 *
 * Respects course.yearLabels overrides if configured.
 *
 * @param {Object} [course=null] - Course metadata object
 * @param {Array<Object>} [publishedResults=[]] - Array of published semester results
 * @returns {Array<{ yearNumber: number, label: string }>}
 */
export const deriveAcademicYearsForCourse = (course = null, publishedResults = []) => {
  let totalYears = 0;

  // 1. Authoritative durationYears
  if (course && typeof course.durationYears === "number" && course.durationYears >= 1) {
    totalYears = Math.min(course.durationYears, 8);
  }
  // 2. Authoritative durationSemesters -> Math.ceil(durationSemesters / 2)
  else if (course && typeof course.durationSemesters === "number" && course.durationSemesters >= 1) {
    totalYears = Math.min(Math.ceil(course.durationSemesters / 2), 8);
  }

  // 3. Fallback: if course duration metadata is absent or invalid, inspect publishedResults
  if (!totalYears || totalYears < 1) {
    if (Array.isArray(publishedResults) && publishedResults.length > 0) {
      const maxSem = Math.max(
        ...publishedResults
          .map((r) => Number(r.semester))
          .filter((s) => !Number.isNaN(s) && s >= 1),
        0
      );
      totalYears = maxSem > 0 ? Math.ceil(maxSem / 2) : 1;
    } else {
      // Safe minimum floor: 1 year (do NOT assume 4 years)
      totalYears = 1;
    }
  }

  // Generate the year objects respecting customLabels when configured
  const years = [];
  const customLabels = Array.isArray(course?.yearLabels) ? course.yearLabels : null;

  for (let y = 1; y <= totalYears; y++) {
    let label;
    if (customLabels && customLabels[y - 1] && String(customLabels[y - 1]).trim()) {
      label = String(customLabels[y - 1]).trim();
    } else {
      switch (y) {
        case 1:
          label = "First Year";
          break;
        case 2:
          label = "Second Year";
          break;
        case 3:
          label = "Third Year";
          break;
        case 4:
          label = "Fourth Year";
          break;
        default:
          label = `Year ${y}`;
      }
    }

    years.push({
      yearNumber: y,
      label,
    });
  }

  return years;
};

/**
 * Groups an array of SemesterResult records by Academic Year.
 * Semesters 1 & 2 -> Year 1
 * Semesters 3 & 4 -> Year 2
 * Semesters 5 & 6 -> Year 3
 * Semesters 7 & 8 -> Year 4
 *
 * @param {Array<Object>} regularResults
 * @param {Object} [course=null] - Optional course object for custom yearLabels
 * @returns {Array<Object>} Array of year group objects
 */
export const groupSemestersByYear = (regularResults = [], course = null) => {
  if (!Array.isArray(regularResults) || regularResults.length === 0) {
    return [];
  }

  const customLabels = Array.isArray(course?.yearLabels) ? course.yearLabels : null;
  const yearMap = new Map();

  for (const result of regularResults) {
    if (!result || result.semester == null) continue;
    const semNum = Number(result.semester);
    const yrNum = getAcademicYearNumber(semNum);

    if (!yearMap.has(yrNum)) {
      let yrLabel;
      if (customLabels && customLabels[yrNum - 1] && String(customLabels[yrNum - 1]).trim()) {
        yrLabel = String(customLabels[yrNum - 1]).trim();
      } else if (yrNum === 4) {
        yrLabel = "Fourth Year";
      } else {
        yrLabel = getAcademicYearLabel(yrNum);
      }

      yearMap.set(yrNum, {
        yearNumber: yrNum,
        yearLabel: yrLabel,
        semesters: [],
      });
    }

    yearMap.get(yrNum).semesters.push(result);
  }

  // Sort years ascending (Year 1, Year 2, ...)
  const groupedYears = Array.from(yearMap.values()).sort(
    (a, b) => a.yearNumber - b.yearNumber
  );

  // Sort semesters within each year ascending (Sem 1, Sem 2...)
  for (const group of groupedYears) {
    group.semesters.sort((a, b) => Number(a.semester) - Number(b.semester));
  }

  return groupedYears;
};

/**
 * Maps a single SemesterResult and associated profile info into a clean
 * marksheet-ready data structure.
 *
 * @param {Object} semesterResult - Persisted SemesterResult record
 * @param {Object} studentProfile - Response from /api/students/my-profile
 * @param {Object} fallbackUser - AuthContext user object for fallback
 * @returns {Object|null}
 */
export const mapResultToStatement = (
  semesterResult,
  studentProfile = null,
  fallbackUser = null
) => {
  if (!semesterResult) return null;

  // 1. Resolve Student Details
  const studentData = studentProfile?.student || studentProfile || {};
  const student = {
    name:
      studentData.fullName ||
      studentData.name ||
      fallbackUser?.name ||
      "Student",
    enrollmentNumber:
      studentData.enrollmentNumber ||
      fallbackUser?.enrollmentNumber ||
      "—",
    motherName: studentData.motherName || "—",
    fatherName: studentData.fatherName || "—",
  };

  // 2. Resolve College Details
  const collegeData =
    studentProfile?.college || semesterResult.college_id || {};
  const college = {
    name: collegeData.name || "College / Institution",
    code: collegeData.code || "",
    logo: collegeData.logo || null,
    address: collegeData.address || "",
  };

  // 3. Resolve Course Details
  const courseData =
    semesterResult.course_id || studentProfile?.course || {};
  const course = {
    name: courseData.name || studentProfile?.courseName || "Course",
    code: courseData.code || "",
  };

  // 4. Resolve Examination Metadata
  const examData = semesterResult.exam_id || {};
  const examination = {
    name:
      semesterResult.examName ||
      examData.name ||
      `Semester ${semesterResult.semester} Examination`,
    academicYear:
      semesterResult.academicYear ||
      examData.academicYear ||
      "—",
    semester: Number(semesterResult.semester),
    resultDate:
      semesterResult.publishedAt ||
      semesterResult.createdAt ||
      null,
  };

  // 5. Resolve Subjects Snapshot (Immutably preserved from generation time)
  const rawSubjects = Array.isArray(semesterResult.subjects)
    ? semesterResult.subjects
    : [];

  const subjects = rawSubjects.map((sub) => {
    const isPractical = String(sub.subjectType).toUpperCase() === "PRACTICAL";

    return {
      subjectCode: sub.subjectCode || "—",
      subjectName: sub.subjectName || "Unnamed Subject",
      subjectType: sub.subjectType || "THEORY",
      formattedType: formatSubjectType(sub.subjectType),
      internalMarks:
        sub.internalMarks !== null && sub.internalMarks !== undefined
          ? Number(sub.internalMarks)
          : null,
      internalMaxMarks:
        sub.internalMaxMarks !== null && sub.internalMaxMarks !== undefined
          ? Number(sub.internalMaxMarks)
          : null,
      externalMarks: isPractical
        ? null
        : sub.externalMarks !== null && sub.externalMarks !== undefined
          ? Number(sub.externalMarks)
          : null,
      externalMaxMarks: isPractical
        ? null
        : sub.externalMaxMarks !== null && sub.externalMaxMarks !== undefined
          ? Number(sub.externalMaxMarks)
          : null,
      totalMarks:
        sub.totalMarks !== null && sub.totalMarks !== undefined
          ? Number(sub.totalMarks)
          : null,
      maxMarks:
        sub.maxMarks !== null && sub.maxMarks !== undefined
          ? Number(sub.maxMarks)
          : null,
      status: sub.status || "—",
      passed: Boolean(sub.passed),
      marksRecorded: Boolean(sub.marksRecorded ?? true),
      isPractical,
    };
  });

  // 6. Resolve Cleared Backlog Attempts (Authoritative clearance associated with this examination/semester)
  const rawBacklogs = Array.isArray(semesterResult.backlogResults)
    ? semesterResult.backlogResults
    : [];

  const clearedBacklogs = rawBacklogs
    .filter((b) => {
      if (!b) return false;
      const isCleared =
        (b.cleared === true || b.resultStatus === "PASS" || b.status === "PASS") &&
        b.resultStatus !== "FAIL" &&
        b.resultStatus !== "INCOMPLETE";
      return isCleared;
    })
    .map((b) => {
      const internalMarks =
        b.internalMarks !== null && b.internalMarks !== undefined
          ? Number(b.internalMarks)
          : b.marks?.internalMarks !== null && b.marks?.internalMarks !== undefined
          ? Number(b.marks.internalMarks)
          : null;

      const externalMarks =
        b.externalMarks !== null && b.externalMarks !== undefined
          ? Number(b.externalMarks)
          : b.marks?.externalMarks !== null && b.marks?.externalMarks !== undefined
          ? Number(b.marks.externalMarks)
          : null;

      const totalMarks =
        b.totalMarks !== null && b.totalMarks !== undefined
          ? Number(b.totalMarks)
          : b.marks?.totalMarks !== null && b.marks?.totalMarks !== undefined
          ? Number(b.marks.totalMarks)
          : null;

      return {
        backlogId: b.backlogId || null,
        attemptId: b.attemptId || null,
        subjectId: b.subjectId || null,
        subjectCode: b.subjectCode || "—",
        subjectName: b.subjectName || "Unnamed Subject",
        subjectType: b.subjectType || "THEORY",
        formattedType: formatSubjectType(b.subjectType),
        originalSemester: b.semester != null ? Number(b.semester) : null,
        originalAcademicYear: b.academicYear || null,
        clearanceSemester: Number(semesterResult.semester),
        attemptNumber: b.attemptNumber != null ? Number(b.attemptNumber) : 1,
        examName: b.examName || null,
        internalMarks,
        externalMarks,
        totalMarks,
        resultStatus: "PASS",
        status: "CLEARED",
        cleared: true,
        passed: true,
        evaluatedAt: b.evaluatedAt || null,
      };
    });

  // 7. Resolve Semester Summary Aggregates (Strictly regular semester totals; backlog marks are never added)
  const summary = {
    totalMarks:
      semesterResult.totalMarks !== null &&
      semesterResult.totalMarks !== undefined
        ? Number(semesterResult.totalMarks)
        : null,
    totalMaxMarks:
      semesterResult.totalMaxMarks !== null &&
      semesterResult.totalMaxMarks !== undefined
        ? Number(semesterResult.totalMaxMarks)
        : null,
    percentage:
      semesterResult.percentage !== null &&
      semesterResult.percentage !== undefined
        ? Number(semesterResult.percentage)
        : null,
    overallResult: semesterResult.overallResult || "—",
    totalSubjects:
      semesterResult.totalSubjects ?? subjects.length,
    passedSubjects: semesterResult.passedSubjects ?? 0,
    failedSubjects: semesterResult.failedSubjects ?? 0,
    incompleteSubjects: semesterResult.incompleteSubjects ?? 0,
  };

  return {
    student,
    college,
    course,
    examination,
    subjects,
    clearedBacklogs,
    summary,
  };
};

/**
 * Generates an authoritative, standard filename for PDF download.
 * Format: Result_Statement_Sem{sem}_{enrollmentNumber}.pdf
 *
 * @param {Object} statementData
 * @returns {string} E.g. "Result_Statement_Sem1_EN202401892.pdf"
 */
export const generateResultStatementFilename = (statementData) => {
  const sem = statementData?.examination?.semester ?? "1";
  const rawEnrollment = statementData?.student?.enrollmentNumber;
  const sanitizedEnrollment =
    rawEnrollment && rawEnrollment !== "—"
      ? String(rawEnrollment).trim().replace(/[^a-zA-Z0-9_-]/g, "_")
      : "Student";

  return `Result_Statement_Sem${sem}_${sanitizedEnrollment}.pdf`;
};

/**
 * Preliminary client-side Consolidated Result eligibility evaluator.
 *
 * Rules:
 * 1. Derives required semester sequence from authoritative course duration (1..N).
 * 2. Requires an authoritative PUBLISHED result for every required semester.
 * 3. Requires overallResult === "PASS" for every required semester.
 * 4. Excludes eligibility when any active backlog has status "OPEN" or "ATTEMPTED".
 * 5. Flags UNKNOWN_ADMISSION_PATH if results begin after Semester 1 and entry path cannot be verified.
 * 6. Flags AMBIGUOUS_RESULT if multiple published candidates exist for a single semester.
 * 7. ALUMNI status alone does NOT bypass missing, failed, or ambiguous results.
 *
 * @param {Array<Object>} [results=[]] - Array of SemesterResult documents
 * @param {Object} [course=null] - Course metadata object
 * @param {Array<Object>} [rawBacklogs=[]] - Backlog attempts / active backlogs
 * @param {Object} [studentProfile=null] - Student profile object
 * @returns {Object} Structured eligibility evaluation
 */
export const deriveConsolidatedEligibility = (
  results = [],
  course = null,
  rawBacklogs = [],
  studentProfile = null
) => {
  // 1. Authoritative course duration (durationSemesters or durationYears * 2)
  let totalSemesters = null;
  if (course && typeof course.durationSemesters === "number" && course.durationSemesters >= 1) {
    totalSemesters = Math.min(course.durationSemesters, 8);
  } else if (course && typeof course.durationYears === "number" && course.durationYears >= 1) {
    totalSemesters = Math.min(course.durationYears * 2, 8);
  }

  if (!totalSemesters || totalSemesters < 1) {
    return {
      isEligible: false,
      status: "COURSE_DURATION_UNKNOWN",
      reasons: ["Authoritative course duration could not be determined."],
      requiredSemesters: [],
      completedSemesters: [],
      missingSemesters: [],
      unpublishedSemesters: [],
      failedSemesters: [],
      incompleteSemesters: [],
      ambiguousSemesters: [],
      activeBacklogsCount: 0,
      admissionPathStatus: "UNKNOWN",
      resolvedSemesterResults: [],
    };
  }

  const requiredSemesters = Array.from({ length: totalSemesters }, (_, i) => i + 1);
  const allResults = Array.isArray(results) ? results : [];

  // Filter candidates that are either marked PUBLISHED or default (in tests/mocks)
  const publishedCandidates = allResults.filter(
    (r) => r && (r.status === "PUBLISHED" || !r.status)
  );

  // 2. Admission-Path Verification
  const observedSemesters = publishedCandidates
    .map((r) => Number(r.semester))
    .filter((s) => !Number.isNaN(s) && s >= 1);
  const minObservedSem = observedSemesters.length > 0 ? Math.min(...observedSemesters) : null;

  let admissionPathStatus = "STANDARD";
  const reasons = [];

  if (minObservedSem !== null && minObservedSem > 1) {
    admissionPathStatus = "UNKNOWN_ADMISSION_PATH";
    reasons.push(
      `UNKNOWN_ADMISSION_PATH: Results begin at Semester ${minObservedSem}, but student admission semester cannot be verified authoritatively.`
    );
  }

  // 3. Semester-by-Semester Resolution
  const resolvedSemesterMap = new Map();
  const completedSemesters = [];
  const missingSemesters = [];
  const unpublishedSemesters = [];
  const failedSemesters = [];
  const incompleteSemesters = [];
  const ambiguousSemesters = [];

  for (const s of requiredSemesters) {
    const sCandidates = allResults.filter((r) => Number(r.semester) === s);
    const publishedSCandidates = sCandidates.filter(
      (r) => r.status === "PUBLISHED" || !r.status
    );

    if (publishedSCandidates.length === 0) {
      if (sCandidates.length > 0) {
        unpublishedSemesters.push(s);
        reasons.push(`Semester ${s} result is not yet published (status: ${sCandidates[0].status || "UNPUBLISHED"}).`);
      } else {
        missingSemesters.push(s);
        reasons.push(`Semester ${s} has no published result.`);
      }
    } else if (publishedSCandidates.length > 1) {
      ambiguousSemesters.push(s);
      reasons.push(`Semester ${s} has multiple published result candidates (${publishedSCandidates.length}); cannot select arbitrarily.`);
    } else {
      const candidate = publishedSCandidates[0];
      const outcome = String(candidate.overallResult || "").toUpperCase();

      if (outcome === "PASS") {
        completedSemesters.push(s);
        resolvedSemesterMap.set(s, candidate);
      } else if (outcome === "FAIL") {
        failedSemesters.push(s);
        reasons.push(`Semester ${s} result outcome is FAIL.`);
      } else {
        incompleteSemesters.push(s);
        reasons.push(`Semester ${s} result outcome is ${outcome || "INCOMPLETE"}.`);
      }
    }
  }

  // 4. Backlog / ATKT Verification
  let activeBacklogsCount = 0;
  if (Array.isArray(rawBacklogs)) {
    for (const b of rawBacklogs) {
      if (!b) continue;
      const isExplicitActive =
        b.status === "OPEN" ||
        b.status === "ATTEMPTED" ||
        b.finalStatus === "OPEN" ||
        b.finalStatus === "ATTEMPTED";
      const isCleared =
        b.cleared === true ||
        b.isCleared === true ||
        b.resultStatus === "PASS" ||
        b.resultStatus === "CLEARED" ||
        b.status === "CLEARED" ||
        b.finalStatus === "CLEARED";

      if (isExplicitActive || !isCleared) {
        activeBacklogsCount++;
      }
    }
  }

  if (activeBacklogsCount > 0) {
    reasons.push(`Student has ${activeBacklogsCount} active/uncleared backlog(s). All backlogs must be cleared.`);
  }

  // 5. Final Evaluation Determination
  const isEligible =
    admissionPathStatus === "STANDARD" &&
    missingSemesters.length === 0 &&
    unpublishedSemesters.length === 0 &&
    ambiguousSemesters.length === 0 &&
    failedSemesters.length === 0 &&
    incompleteSemesters.length === 0 &&
    activeBacklogsCount === 0 &&
    completedSemesters.length === requiredSemesters.length;

  let status = "ELIGIBLE";
  if (!isEligible) {
    if (admissionPathStatus === "UNKNOWN_ADMISSION_PATH") {
      status = "UNKNOWN_ADMISSION_PATH";
    } else if (ambiguousSemesters.length > 0) {
      status = "AMBIGUOUS_RESULT";
    } else if (activeBacklogsCount > 0) {
      status = "ACTIVE_BACKLOGS";
    } else if (failedSemesters.length > 0) {
      status = "FAILED_SEMESTERS";
    } else if (incompleteSemesters.length > 0) {
      status = "INCOMPLETE_SEMESTERS";
    } else if (unpublishedSemesters.length > 0) {
      status = "UNPUBLISHED_SEMESTERS";
    } else if (missingSemesters.length > 0) {
      status = "MISSING_SEMESTERS";
    } else {
      status = "INELIGIBLE";
    }
  }

  return {
    isEligible,
    status,
    reasons,
    requiredSemesters,
    completedSemesters,
    missingSemesters,
    unpublishedSemesters,
    failedSemesters,
    incompleteSemesters,
    ambiguousSemesters,
    activeBacklogsCount,
    admissionPathStatus,
    resolvedSemesterResults: Array.from(resolvedSemesterMap.values()).sort(
      (a, b) => Number(a.semester) - Number(b.semester)
    ),
  };
};

/**
 * Maps all authoritative published semester records into a comprehensive
 * Consolidated Marksheet view model.
 *
 * Rules:
 * 1. Computes grand total marks and maximum marks from regular semester totals only.
 * 2. Backlog/supplementary marks are strictly isolated in clearedBacklogs and NEVER
 *    added to regular totals or aggregate percentage.
 * 3. Does not mutate source result objects.
 * 4. Safe against NaN/Infinity and missing numeric values.
 * 5. Does not invent CGPA, GPA, letter grades, or class/division classifications.
 *
 * @param {Array<Object>} [results=[]]
 * @param {Object} [studentProfile=null]
 * @param {Object} [course=null]
 * @param {Array<Object>} [rawBacklogs=[]]
 * @param {Object} [fallbackUser=null]
 * @returns {Object} Consolidated marksheet view model
 */
export const mapConsolidatedStatement = (
  results = [],
  studentProfile = null,
  course = null,
  rawBacklogs = [],
  fallbackUser = null
) => {
  const effectiveCourse =
    course ||
    studentProfile?.course ||
    studentProfile?.student?.course_id ||
    results[0]?.course_id ||
    null;

  const eligibility = deriveConsolidatedEligibility(
    results,
    effectiveCourse,
    rawBacklogs,
    studentProfile
  );

  // 1. Resolve Student Details
  const studentData = studentProfile?.student || studentProfile || {};
  const student = {
    name:
      studentData.fullName ||
      studentData.name ||
      fallbackUser?.name ||
      "Student",
    enrollmentNumber:
      studentData.enrollmentNumber ||
      fallbackUser?.enrollmentNumber ||
      "—",
    motherName: studentData.motherName || "—",
    fatherName: studentData.fatherName || "—",
    status: studentData.status || null,
  };

  // 2. Resolve College Details
  const collegeData =
    studentProfile?.college || results[0]?.college_id || {};
  const college = {
    name: collegeData.name || "College / Institution",
    code: collegeData.code || "",
    logo: collegeData.logo || null,
    address: collegeData.address || "",
  };

  // 3. Resolve Course Details
  const resolvedCourse = {
    name: effectiveCourse?.name || studentProfile?.courseName || "Course",
    code: effectiveCourse?.code || "",
    durationYears: effectiveCourse?.durationYears ?? null,
    durationSemesters: effectiveCourse?.durationSemesters ?? null,
    programLevel: effectiveCourse?.programLevel || "UG",
  };

  // 4. Map Resolved Semester Records Non-Mutatively
  const semesters = (eligibility.resolvedSemesterResults || []).map((semRes) => {
    const semNum = Number(semRes.semester);
    const rawSubjects = Array.isArray(semRes.subjects) ? semRes.subjects : [];

    const subjects = rawSubjects.map((sub) => {
      const isPractical = String(sub.subjectType).toUpperCase() === "PRACTICAL";
      return {
        subjectCode: sub.subjectCode || "—",
        subjectName: sub.subjectName || "Unnamed Subject",
        subjectType: sub.subjectType || "THEORY",
        formattedType: formatSubjectType(sub.subjectType),
        internalMarks:
          sub.internalMarks !== null && sub.internalMarks !== undefined
            ? Number(sub.internalMarks)
            : null,
        internalMaxMarks:
          sub.internalMaxMarks !== null && sub.internalMaxMarks !== undefined
            ? Number(sub.internalMaxMarks)
            : null,
        externalMarks: isPractical
          ? null
          : sub.externalMarks !== null && sub.externalMarks !== undefined
          ? Number(sub.externalMarks)
          : null,
        externalMaxMarks: isPractical
          ? null
          : sub.externalMaxMarks !== null && sub.externalMaxMarks !== undefined
          ? Number(sub.externalMaxMarks)
          : null,
        totalMarks:
          sub.totalMarks !== null && sub.totalMarks !== undefined
            ? Number(sub.totalMarks)
            : null,
        maxMarks:
          sub.maxMarks !== null && sub.maxMarks !== undefined
            ? Number(sub.maxMarks)
            : null,
        status: sub.status || "—",
        passed: Boolean(sub.passed),
        isPractical,
      };
    });

    return {
      semesterNumber: semNum,
      academicYear: semRes.academicYear || "—",
      examName: semRes.examName || semRes.exam_id?.name || `Semester ${semNum} Examination`,
      resultDate: semRes.publishedAt || semRes.createdAt || null,
      subjects,
      totalMarks:
        semRes.totalMarks !== null && semRes.totalMarks !== undefined
          ? Number(semRes.totalMarks)
          : null,
      totalMaxMarks:
        semRes.totalMaxMarks !== null && semRes.totalMaxMarks !== undefined
          ? Number(semRes.totalMaxMarks)
          : null,
      percentage:
        semRes.percentage !== null && semRes.percentage !== undefined
          ? Number(semRes.percentage)
          : null,
      overallResult: semRes.overallResult || "—",
      totalSubjects: semRes.totalSubjects ?? subjects.length,
      passedSubjects: semRes.passedSubjects ?? 0,
      failedSubjects: semRes.failedSubjects ?? 0,
    };
  });

  // 5. Aggregate Regular Totals (Strictly excluding backlog marks)
  let grandTotalMarks = 0;
  let grandTotalMaxMarks = 0;
  let hasIncompleteMarks = false;

  if (semesters.length === 0) {
    hasIncompleteMarks = true;
  }

  for (const sem of semesters) {
    if (sem.totalMarks !== null && !Number.isNaN(sem.totalMarks)) {
      grandTotalMarks += Number(sem.totalMarks);
    } else {
      hasIncompleteMarks = true;
    }

    if (sem.totalMaxMarks !== null && !Number.isNaN(sem.totalMaxMarks)) {
      grandTotalMaxMarks += Number(sem.totalMaxMarks);
    } else {
      hasIncompleteMarks = true;
    }
  }

  let aggregatePercentage = null;
  if (!hasIncompleteMarks && grandTotalMaxMarks > 0) {
    const rawPct = (grandTotalMarks / grandTotalMaxMarks) * 100;
    if (Number.isFinite(rawPct)) {
      aggregatePercentage = Number(rawPct.toFixed(2));
    }
  }

  // 6. Map Cleared Backlogs (Maintained in strict separation from regular totals)
  const clearedBacklogs = (Array.isArray(rawBacklogs) ? rawBacklogs : [])
    .filter((b) => {
      if (!b) return false;
      return (
        (b.cleared === true || b.isCleared === true || b.resultStatus === "PASS" || b.status === "PASS") &&
        b.resultStatus !== "FAIL" &&
        b.resultStatus !== "INCOMPLETE"
      );
    })
    .map((b) => ({
      backlogId: b.backlogId || null,
      attemptId: b.attemptId || null,
      subjectCode: b.subjectCode || "—",
      subjectName: b.subjectName || "Subject",
      subjectType: b.subjectType || "THEORY",
      formattedType: formatSubjectType(b.subjectType),
      originalSemester: b.semester != null ? Number(b.semester) : (b.originalSemester != null ? Number(b.originalSemester) : null),
      originalAcademicYear: b.academicYear || b.originalAcademicYear || null,
      attemptNumber: b.attemptNumber != null ? Number(b.attemptNumber) : 1,
      examName: b.examName || null,
      totalMarks: b.totalMarks != null ? Number(b.totalMarks) : (b.marks?.totalMarks != null ? Number(b.marks.totalMarks) : null),
      resultStatus: "PASS",
      status: "CLEARED",
      cleared: true,
      evaluatedAt: b.evaluatedAt || null,
    }));

  return {
    student,
    college,
    course: resolvedCourse,
    eligibility,
    semesters,
    clearedBacklogs,
    summary: {
      totalSemesters: eligibility.requiredSemesters.length,
      completedSemesters: eligibility.completedSemesters.length,
      grandTotalMarks: hasIncompleteMarks ? null : grandTotalMarks,
      grandTotalMaxMarks: hasIncompleteMarks ? null : grandTotalMaxMarks,
      aggregatePercentage,
      overallResult: eligibility.isEligible ? "PASS" : "INCOMPLETE",
    },
  };
};

/**
 * Generates an authoritative, standard filename for Consolidated Marksheet PDF download.
 * Format: Consolidated_Marksheet_{enrollmentNumber}.pdf
 *
 * @param {Object} statementData
 * @returns {string} E.g. "Consolidated_Marksheet_EN202401892.pdf"
 */
export const generateConsolidatedStatementFilename = (statementData) => {
  const rawEnrollment = statementData?.student?.enrollmentNumber;
  const sanitizedEnrollment =
    rawEnrollment && rawEnrollment !== "—"
      ? String(rawEnrollment).trim().replace(/[^a-zA-Z0-9_-]/g, "_")
      : "Student";

  return `Consolidated_Marksheet_${sanitizedEnrollment}.pdf`;
};
