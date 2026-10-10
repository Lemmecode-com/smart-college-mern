const Student = require("../models/student.model");
const Course = require("../models/course.model");
const StudentFee = require("../models/studentFee.model");
const Backlog = require("../models/backlog.model");
const AlumniPolicy = require("../models/alumniPolicy.model");
const AppError = require("../utils/AppError");
const {
  resolveAuthoritativeResult,
  RESULT_AUTHORITY_STATUS,
} = require("./resultAuthority.service");
const { getAttendanceDataForStudents } = require("./attendance.service");
const { calculatePreviousAcademicYear } = require("./promotionDecision.service");

/**
 * Evaluates a student's eligibility to transition to Alumni status based on
 * the applicable AlumniPolicy (course-specific or college-level default).
 *
 * @param {string|ObjectId} studentId - Student ID
 * @param {string|ObjectId} collegeId - College/tenant ID
 * @param {Object} options - Optional flags
 * @returns {Promise<Object>} Structured eligibility result
 */
exports.checkAlumniEligibility = async (studentId, collegeId, options = {}) => {
  const student = await Student.findOne({
    _id: studentId,
    college_id: collegeId,
  });

  if (!student) {
    throw new AppError(
      "Student not found or does not belong to your college",
      404,
      "STUDENT_NOT_FOUND",
    );
  }

  if (!student.course_id) {
    throw new AppError(
      "Student does not have an assigned course",
      400,
      "COURSE_NOT_FOUND",
    );
  }

  const course = await Course.findOne({
    _id: student.course_id,
    college_id: collegeId,
  });

  if (!course) {
    throw new AppError(
      "Course not found or does not belong to your college",
      404,
      "COURSE_NOT_FOUND",
    );
  }

  // 1. Resolve applicable AlumniPolicy (course-specific or fallback)
  const policy = await AlumniPolicy.getActivePolicy(collegeId, course._id);

  if (!policy) {
    return {
      eligible: false,
      status: "CONFIGURATION_REQUIRED",
      message: "Alumni eligibility settings are not configured for this course.",
      policy: null,
      checks: {},
      blockers: [
        {
          code: "CONFIGURATION_REQUIRED",
          message: "Alumni eligibility settings are not configured for this course.",
        },
      ],
    };
  }

  if (policy.enabled === false) {
    return {
      eligible: false,
      status: "ALUMNI_DISABLED",
      message: "Alumni transition is currently disabled by policy.",
      policy: {
        id: policy._id,
        version: policy.version,
        course_id: policy.course_id,
      },
      checks: {},
      blockers: [
        {
          code: "ALUMNI_DISABLED",
          message: "Alumni transition is disabled by policy.",
        },
      ],
    };
  }

  const blockers = [];
  const checks = {};

  // 2. Final Semester Check
  const durationSemesters = course.durationSemesters || 8;
  const isFinalSemester = student.currentSemester >= durationSemesters;
  checks.finalSemester = {
    passed: isFinalSemester,
    currentSemester: student.currentSemester,
    requiredSemester: durationSemesters,
  };

  if (policy.requireFinalSemester && !isFinalSemester) {
    blockers.push({
      code: "NOT_FINAL_SEMESTER",
      message: `Student is in semester ${student.currentSemester} of ${durationSemesters}. Only final-semester students can move to Alumni.`,
    });
  }

  // 3. Result Check via authoritative result service
  const authoritativeResult = await resolveAuthoritativeResult({
    collegeId,
    studentId: student._id,
    courseId: course._id,
    semester: student.currentSemester,
    academicYear: student.currentAcademicYear,
  });

  const authorityStatus = authoritativeResult?.status;
  const result = authoritativeResult?.result;

  if (authorityStatus === RESULT_AUTHORITY_STATUS.NO_RESULT) {
    blockers.push({
      code: "NO_RESULT",
      message: "Final semester exam result has not been published.",
    });
    checks.result = {
      passed: false,
      status: "NO_RESULT",
      outcome: "NO_RESULT",
    };
  } else if (authorityStatus === RESULT_AUTHORITY_STATUS.AMBIGUOUS_RESULT) {
    blockers.push({
      code: "AMBIGUOUS_RESULT",
      message: "Multiple published results found; resolution required.",
    });
    checks.result = {
      passed: false,
      status: "AMBIGUOUS_RESULT",
      outcome: "AMBIGUOUS_RESULT",
    };
  } else if (authorityStatus === RESULT_AUTHORITY_STATUS.FOUND && result) {
    const overallResult = result.overallResult;
    const failedSubjects = Number(result.failedSubjects || 0);

    let resultPassed = true;

    if (overallResult === "INCOMPLETE") {
      resultPassed = false;
      blockers.push({
        code: "INCOMPLETE_RESULT",
        message: "Final semester result contains incomplete marks.",
      });
    } else if (overallResult === "FAIL") {
      resultPassed = false;
      blockers.push({
        code: "RESULT_FAIL",
        message: "Final semester exam result is FAIL. All subjects must be cleared to graduate.",
      });
    } else if (
      policy.resultRule?.requiredOutcome === "PASS" &&
      overallResult !== "PASS"
    ) {
      resultPassed = false;
      blockers.push({
        code: "RESULT_FAIL",
        message: `Final semester result is ${overallResult}, but PASS is required.`,
      });
    }

    if (failedSubjects > 0) {
      resultPassed = false;
      blockers.push({
        code: "RESULT_ATKT",
        message: `Student has ${failedSubjects} uncleared subject(s). All subjects must be cleared to graduate.`,
      });
    }

    checks.result = {
      passed: resultPassed,
      status: "PUBLISHED",
      outcome: overallResult,
      overallResult,
      failedSubjects,
      sourceResultId: result._id,
    };
  } else {
    blockers.push({
      code: "RESULT_NOT_PUBLISHED",
      message: "Final semester exam result has not been published.",
    });
    checks.result = {
      passed: false,
      status: "NO_RESULT",
      outcome: "NO_RESULT",
    };
  }

  // 4. Attendance Check
  if (policy.attendanceRule?.enabled) {
    const attendanceData = (
      await getAttendanceDataForStudents([student], collegeId)
    )[0];

    const actualPercentage = attendanceData
      ? Math.round(attendanceData.percentage || 0)
      : 0;
    const requiredPercentage = policy.attendanceRule.minimumPercentage ?? 75;
    const isAvailable = attendanceData?.status !== "ATTENDANCE_NOT_AVAILABLE";
    const attendancePassed = isAvailable && actualPercentage >= requiredPercentage;

    checks.attendance = {
      passed: attendancePassed,
      actualPercentage,
      requiredPercentage,
      totalSessions: attendanceData?.totalSessions || 0,
      status: attendanceData?.status || "ATTENDANCE_NOT_AVAILABLE",
    };

    if (!attendancePassed) {
      if (!isAvailable) {
        blockers.push({
          code: "ATTENDANCE_REQUIREMENT",
          message: "Attendance data is not available for this semester.",
        });
      } else {
        blockers.push({
          code: "ATTENDANCE_REQUIREMENT",
          message: `Attendance requirement not met (${actualPercentage}% / Required: ${requiredPercentage}%).`,
        });
      }
    }
  } else {
    checks.attendance = {
      passed: true,
      skipped: true,
    };
  }

  // 5. Fee Clearance Check
  if (policy.feeRule?.enabled) {
    const fee = await StudentFee.findOne({
      student_id: student._id,
      college_id: collegeId,
    }).select("totalFee paidAmount installments");

    const totalFee = Number(fee?.totalFee || 0);
    const paidAmount = Number(fee?.paidAmount || 0);
    const pendingAmount = Math.max(0, totalFee - paidAmount);
    const paidPercentage =
      totalFee > 0
        ? Math.min(100, Math.max(0, (paidAmount / totalFee) * 100))
        : 100;
    const requiredPaidPercentage =
      policy.feeRule.minimumPaidPercentage ?? 100;
    const feePassed = paidPercentage + 1e-9 >= requiredPaidPercentage;

    checks.fee = {
      passed: feePassed,
      actualPercentage: Math.round(paidPercentage),
      requiredPercentage: requiredPaidPercentage,
      totalFee,
      paidAmount,
      pendingAmount,
    };

    if (!feePassed) {
      blockers.push({
        code: "FEE_REQUIREMENT",
        message:
          pendingAmount > 0
            ? `Pending fee of ₹${pendingAmount.toLocaleString()} must be cleared (${Math.round(paidPercentage)}% paid / ${requiredPaidPercentage}% required).`
            : `Fee payment requirement not met (${Math.round(paidPercentage)}% paid / Required: ${requiredPaidPercentage}%).`,
      });
    }
  } else {
    checks.fee = {
      passed: true,
      skipped: true,
    };
  }

  // 6. Backlog / KT Check
  let backlogPassed = true;
  let previousBacklogsCount = 0;
  let totalBacklogsCount = 0;

  if (policy.backlogRule?.requirePreviousYearClearance) {
    const previousAcademicYear = calculatePreviousAcademicYear(
      student.currentAcademicYear,
    );
    if (previousAcademicYear) {
      const unclearedPrevious = await Backlog.find({
        student_id: student._id,
        college_id: collegeId,
        academicYear: previousAcademicYear,
        status: { $ne: "CLEARED" },
      }).lean();

      previousBacklogsCount = unclearedPrevious.length;
      if (previousBacklogsCount > 0) {
        backlogPassed = false;
        blockers.push({
          code: "PREVIOUS_BACKLOG_NOT_CLEARED",
          message: `Previous-year backlogs must be cleared before graduation (${previousBacklogsCount} uncleared).`,
        });
      }
    }
  }

  if (!policy.backlogRule?.allowCurrentBacklog) {
    const allUncleared = await Backlog.find({
      student_id: student._id,
      college_id: collegeId,
      status: { $ne: "CLEARED" },
    }).lean();

    totalBacklogsCount = allUncleared.length;
    if (totalBacklogsCount > 0 && !blockers.some((b) => b.code === "PREVIOUS_BACKLOG_NOT_CLEARED")) {
      backlogPassed = false;
      blockers.push({
        code: "CURRENT_BACKLOG_NOT_ALLOWED",
        message: `Student has ${totalBacklogsCount} uncleared backlog(s). All backlogs must be cleared to graduate.`,
      });
    }
  }

  checks.backlog = {
    passed: backlogPassed,
    previousBacklogsCount,
    totalBacklogsCount,
  };

  const isEligible = blockers.length === 0;

  return {
    eligible: isEligible,
    status: isEligible ? "ELIGIBLE" : "BLOCKED",
    policy: {
      id: policy._id,
      version: policy.version,
      course_id: policy.course_id,
      effectiveFromAcademicYear: policy.effectiveFromAcademicYear,
    },
    checks,
    blockers,
  };
};
