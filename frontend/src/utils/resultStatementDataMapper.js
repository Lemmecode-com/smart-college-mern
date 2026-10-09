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
 *
 * @param {number} yearNumber
 * @returns {string} E.g. "First Year", "Second Year"
 */
export const getAcademicYearLabel = (yearNumber) => {
  switch (Number(yearNumber)) {
    case 1:
      return "First Year";
    case 2:
      return "Second Year";
    case 3:
      return "Third Year";
    case 4:
      return "Final Year";
    default:
      return `Year ${yearNumber}`;
  }
};

/**
 * Groups an array of SemesterResult records by Academic Year.
 * Semesters 1 & 2 -> First Year
 * Semesters 3 & 4 -> Second Year
 * Semesters 5 & 6 -> Third Year
 * Semesters 7 & 8 -> Final Year
 *
 * @param {Array<Object>} regularResults
 * @returns {Array<Object>} Array of year group objects
 */
export const groupSemestersByYear = (regularResults = []) => {
  if (!Array.isArray(regularResults) || regularResults.length === 0) {
    return [];
  }

  const yearMap = new Map();

  for (const result of regularResults) {
    if (!result || result.semester == null) continue;
    const semNum = Number(result.semester);
    const yrNum = getAcademicYearNumber(semNum);

    if (!yearMap.has(yrNum)) {
      yearMap.set(yrNum, {
        yearNumber: yrNum,
        yearLabel: getAcademicYearLabel(yrNum),
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

  // 6. Resolve Semester Summary Aggregates
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
