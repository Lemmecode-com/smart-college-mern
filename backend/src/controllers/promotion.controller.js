const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const PromotionHistory = require("../models/promotionHistory.model");
const {
  getAttendanceDataForStudents,
} = require("../services/attendance.service");
const PromotionPolicy = require("../models/promotionPolicy.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const {
  calculateFeeClearanceData,
  evaluateAttendanceData,
  createPromotionDecision,
} = require("../services/promotionDecision.service");
const {
  submitPromotionRecommendation,
  approvePromotionDecision,
} = require("../services/promotionWorkflow.service");
const {
  executePromotion,
} = require("../services/promotionExecution.service");
const { ROLE } = require("../utils/constants");
const logger = require("../utils/logger");

const ATTENDANCE_THRESHOLD = 75;
const ATTENDANCE_STATUS = {
  ELIGIBLE: "ELIGIBLE",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  ATTENDANCE_NOT_AVAILABLE: "ATTENDANCE_NOT_AVAILABLE",
};

async function getPromotionThreshold(collegeId) {
  try {
    const policy = await PromotionPolicy.getActivePolicy(collegeId);
    return policy?.minAttendancePercentage ?? ATTENDANCE_THRESHOLD;
  } catch {
    return ATTENDANCE_THRESHOLD;
  }
}

/**
 * Helper function to get academic year label based on semester
 * Returns: 1st Year, 2nd Year, 3rd Year, 4th Year, etc.
 */
function getAcademicYearLabel(semester) {
  const year = Math.ceil(semester / 2);
  const suffix = getOrdinalSuffix(year);
  return `${year}${suffix} Year`;
}



/**
 * Helper function to get ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

function getAttendanceStatus(attendanceData, threshold = ATTENDANCE_THRESHOLD) {
  return evaluateAttendanceData({
    attendanceData,
    requiredPercentage: threshold,
  }).status;
}

function getAttendanceSnapshot(
  attendanceData,
  attendanceOverridden,
  attendanceOverrideReason,
  threshold = ATTENDANCE_THRESHOLD,
) {
  return {
    attendancePercentage: Number(attendanceData?.percentage || 0),
    attendanceStatus: getAttendanceStatus(attendanceData, threshold),
    attendanceCheckedAt: new Date(),
    attendanceOverridden: Boolean(attendanceOverridden),
    attendanceOverrideReason: attendanceOverridden
      ? attendanceOverrideReason?.trim() || null
      : null,
  };
}

function validateAttendanceOverride(
  overrideAttendanceCheck,
  overrideAttendanceReason,
  attendanceStatus,
) {
  const wantsOverride = Boolean(overrideAttendanceCheck);

  if (wantsOverride && attendanceStatus === ATTENDANCE_STATUS.NOT_ELIGIBLE) {
    throw new AppError(
      "Attendance override is not allowed when attendance is below the required threshold.",
      400,
      "ATTENDANCE_OVERRIDE_NOT_ALLOWED",
    );
  }

  if (
    wantsOverride &&
    attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE
  ) {
    const reason =
      typeof overrideAttendanceReason === "string"
        ? overrideAttendanceReason.trim()
        : "";

    if (reason.length < 10) {
      throw new AppError(
        "Attendance override reason is required and must be at least 10 characters.",
        400,
        "ATTENDANCE_OVERRIDE_REASON_REQUIRED",
      );
    }

    return reason;
  }

  return null;
}

/**
 * GET all students with their fee status and promotion eligibility
 * Only accessible by COLLEGE_ADMIN
 */
exports.getPromotionEligibleStudents = async (req, res, next) => {
  try {
    const { course_id, currentSemester } = req.query;

    // Build filter - show all eligible students (for display purposes)
    // Promotion eligibility is shown in UI via fee status
    const filter = {
      college_id: req.college_id,
      status: { $in: ["APPROVED", "ENROLLED"] },
    };

    if (course_id) {
      filter.course_id = course_id;
    }

    if (currentSemester) {
      filter.currentSemester = parseInt(currentSemester);
    }

    // Get all eligible students
    const students = await Student.find(filter)
      .populate("course_id", "name code durationSemesters durationYears")
      .populate("department_id", "name code")
      .sort({ currentSemester: 1, fullName: 1 });

    const threshold = await getPromotionThreshold(req.college_id);
    const attendanceData = await getAttendanceDataForStudents(
      students,
      req.college_id,
    );
    const attendanceMap = new Map(
      attendanceData.map((attendance) => [
        attendance.student_id.toString(),
        attendance,
      ]),
    );

    // Attach fee information for each student
    const studentsWithFee = await Promise.all(
      students.map(async (student) => {
        const fee = await StudentFee.findOne({
          student_id: student._id,
          college_id: req.college_id,
        }).select("totalFee paidAmount installments");

        // Calculate fee status
        let feeStatus = "PENDING";
        let pendingAmount = 0;
        let allInstallmentsPaid = false;

        if (fee) {
          pendingAmount = fee.totalFee - fee.paidAmount;

          if (fee.paidAmount >= fee.totalFee) {
            feeStatus = "FULLY_PAID";
          } else if (fee.paidAmount > 0) {
            feeStatus = "PARTIALLY_PAID";
          }

          // Check if all installments are paid
          if (fee.installments && fee.installments.length > 0) {
            allInstallmentsPaid = fee.installments.every(
              (inst) => inst.status === "PAID",
            );
          } else if (fee.paidAmount >= fee.totalFee) {
            allInstallmentsPaid = true;
          }
        }

        // Get max semester from course duration
        const maxSemester = student.course_id?.durationSemesters || 8;
        const academicYearLabel = getAcademicYearLabel(student.currentSemester);
        const isFinalYear = student.currentSemester >= maxSemester;
        const attendance = attendanceMap.get(student._id.toString()) || {
          percentage: 0,
          totalSessions: 0,
        };

        // Compute alumni eligibility for final-semester students
        let isAlumniEligible = false;
        if (isFinalYear) {
          try {
            const promotionDecision = await createPromotionDecision({
              studentId: student._id,
              collegeId: req.college_id,
              userId: req.user.id,
            });
            // Eligible only if: result found, outcome PASS, all conditions satisfied
            isAlumniEligible =
              promotionDecision.result_status === "FOUND" &&
              promotionDecision.promotion_outcome === "PASS";
          } catch (err) {
            // If eligibility check fails, student is not eligible
            isAlumniEligible = false;
          }
        }

        return {
          ...student.toObject(),
          fee: fee || {
            totalFee: 0,
            paidAmount: 0,
            pendingAmount: 0,
            installments: [],
          },
          feeStatus,
          pendingAmount,
          allInstallmentsPaid,
          academicYearLabel,
          isFinalYear,
          isAlumniEligible,
          maxSemester,
          attendancePercentage: attendance.percentage,
          attendanceStatus: getAttendanceStatus(attendance, threshold),
          attendanceTotalSessions: attendance.totalSessions,
        };
      }),
    );

    // Group by semester for better UI presentation
    const groupedBySemester = studentsWithFee.reduce((acc, student) => {
      const sem = student.currentSemester;
      if (!acc[sem]) {
        acc[sem] = [];
      }
      acc[sem].push(student);
      return acc;
    }, {});

    ApiResponse.success(
      res,
      {
        count: studentsWithFee.length,
        students: studentsWithFee,
        groupedBySemester,
        promotionThreshold: threshold,
      },
      "Students fetched successfully for promotion",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET individual student's promotion details
 */
exports.getStudentPromotionDetails = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: { $in: ["APPROVED", "ENROLLED"] },
    })
      .populate("course_id", "name code")
      .populate("department_id", "name code");

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Get fee details
    const fee = await StudentFee.findOne({
      student_id: studentId,
      college_id: req.college_id,
    }).select("totalFee paidAmount installments");

    // Get promotion history
    const promotionHistory = await PromotionHistory.find({
      student_id: studentId,
      status: "ACTIVE",
    }).sort({ promotionDate: -1 });

    const threshold = await getPromotionThreshold(req.college_id);
    const attendanceData = (
      await getAttendanceDataForStudents([student], req.college_id)
    )[0];
    const attendanceStatus = getAttendanceStatus(attendanceData, threshold);

    // Calculate fee status
    let feeStatus = "PENDING";
    let pendingAmount = 0;
    let allInstallmentsPaid = false;

    if (fee) {
      pendingAmount = fee.totalFee - fee.paidAmount;

      if (fee.paidAmount >= fee.totalFee) {
        feeStatus = "FULLY_PAID";
      } else if (fee.paidAmount > 0) {
        feeStatus = "PARTIALLY_PAID";
      }

      if (fee.installments && fee.installments.length > 0) {
        allInstallmentsPaid = fee.installments.every(
          (inst) => inst.status === "PAID",
        );
      } else if (fee.paidAmount >= fee.totalFee) {
        allInstallmentsPaid = true;
      }
    }

    // Calculate next semester
    const nextSemester = student.currentSemester + 1;
    const maxSemester = 8; // Assuming 4-year program with 2 semesters per year
    const canPromote =
      nextSemester <= maxSemester &&
      allInstallmentsPaid &&
      attendanceStatus === ATTENDANCE_STATUS.ELIGIBLE;

    ApiResponse.success(
      res,
      {
        student: {
          ...student.toObject(),
          fee: fee || {
            totalFee: 0,
            paidAmount: 0,
            installments: [],
          },
          feeStatus,
          pendingAmount,
          allInstallmentsPaid,
          nextSemester,
          canPromote,
          maxSemester,
          attendancePercentage: attendanceData.percentage,
          attendanceStatus,
          attendanceTotalSessions: attendanceData.totalSessions,
        },
        promotionHistory,
      },
      "Student promotion details fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PROMOTE STUDENT to next semester (authoritatively delegates to decision engine)
 * Only accessible by COLLEGE_ADMIN and ADMISSION_OFFICER
 */
exports.promoteStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const {
      remarks,
      overrideFeeCheck,
      overrideAttendanceCheck,
      overrideAttendanceReason,
    } = req.body;

    // 1. Find and validate student under current college tenant
    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: { $in: ["APPROVED", "ENROLLED"] },
    })
      .populate("course_id", "name code semester durationSemesters")
      .populate("department_id", "name code");

    if (!student) {
      throw new AppError(
        "Student not found or not approved",
        404,
        "STUDENT_NOT_FOUND",
      );
    }

    // 2. Check if already at max semester - move to Alumni
    const maxSemester = student.course_id?.durationSemesters || 8;
    if (student.currentSemester >= maxSemester) {
      throw new AppError(
        "Student has completed the course. Moving to alumni status requires separate process.",
        400,
        "ALREADY_FINAL_SEMESTER",
      );
    }

    const actorId = req.user?.id || req.user?._id;
    const actorRole = req.user?.role || ROLE.COLLEGE_ADMIN;
    const actorName = req.user?.name || req.user?.email || "Admin";

    // 3. Create or refresh authoritative PromotionDecision
    const decision = await createPromotionDecision({
      studentId: student._id,
      collegeId: req.college_id,
      userId: actorId,
      overrideFeeCheck: Boolean(overrideFeeCheck),
      overrideAttendanceCheck: Boolean(overrideAttendanceCheck),
      overrideAttendanceReason,
    });

    // 4. Inspect calculated outcome. Only PASS and ATKT are executable.
    if (!["PASS", "ATKT"].includes(decision.promotion_outcome)) {
      if (
        decision.result_status === "NO_RESULT" ||
        decision.promotion_outcome === "NO_RESULT"
      ) {
        throw new AppError(
          "No published semester result found for this student.",
          400,
          "NO_RESULT",
        );
      }
      if (
        decision.result_status === "INCOMPLETE" ||
        decision.promotion_outcome === "INCOMPLETE"
      ) {
        throw new AppError(
          "Semester result is incomplete.",
          400,
          "RESULT_INCOMPLETE",
        );
      }
      if (
        decision.result_status === "AMBIGUOUS_RESULT" ||
        decision.promotion_outcome === "AMBIGUOUS_RESULT"
      ) {
        throw new AppError(
          "Multiple published semester results found for this student.",
          400,
          "AMBIGUOUS_RESULT",
        );
      }
      if (decision.decision_reason === "KT_LIMIT_EXCEEDED") {
        const limit =
          decision.policy_snapshot?.resolvedMaxAllowedKTs ??
          decision.policy_snapshot?.maxAllowedKTs ??
          0;
        throw new AppError(
          `Student has exceeded the maximum allowed KT limit of ${limit} KTs.`,
          400,
          "KT_LIMIT_EXCEEDED",
        );
      }
      if (decision.decision_reason === "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED") {
        throw new AppError(
          "Previous-year backlogs are not fully cleared.",
          400,
          "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED",
        );
      }
      if (decision.decision_reason === "ATTENDANCE_INSUFFICIENT") {
        const threshold =
          decision.attendance_snapshot?.requiredPercentage ?? 75;
        throw new AppError(
          `Student attendance is below the required threshold of ${threshold}%.`,
          400,
          "ATTENDANCE_INSUFFICIENT",
        );
      }
      if (decision.decision_reason === "ATTENDANCE_NOT_AVAILABLE") {
        throw new AppError(
          "Attendance records are not available for this student.",
          400,
          "ATTENDANCE_NOT_AVAILABLE",
        );
      }
      if (decision.decision_reason === "FEE_NOT_CLEARED") {
        const pending = decision.fee_clearance_snapshot?.pendingAmount || 0;
        throw new AppError(
          `Student has pending fees of ₹${pending}. Please clear all dues or use override option.`,
          400,
          "FEE_PENDING",
        );
      }

      throw new AppError(
        `Student is not eligible for promotion: ${decision.decision_reason || decision.promotion_outcome}`,
        400,
        decision.decision_reason || "PROMOTION_NOT_ELIGIBLE",
      );
    }

    // 5. Auto-approve decision if in reviewable status
    if (
      decision.workflow_status === "DRAFT" ||
      decision.workflow_status === "RECOMMENDED" ||
      decision.workflow_status === "UNDER_REVIEW"
    ) {
      if (decision.workflow_status === "DRAFT") {
        await submitPromotionRecommendation({
          decisionId: decision._id,
          collegeId: req.college_id,
          actorId,
          actorRole,
          comment: remarks || "Auto-recommended via legacy promotion endpoint.",
          request: req,
        });
      }
      await approvePromotionDecision({
        decisionId: decision._id,
        collegeId: req.college_id,
        actorId,
        actorRole,
        comment: remarks || "Auto-approved via legacy promotion endpoint.",
        request: req,
      });
    }

    // 6. Execute promotion authoritatively
    const executionResult = await executePromotion({
      decisionId: decision._id,
      collegeId: req.college_id,
      actorId,
      actorRole,
      actorName,
      request: req,
    });

    const history = executionResult.promotionHistory || {};
    const fromSemester =
      executionResult.previousSemester || history.fromSemester;
    const toSemester = executionResult.newSemester || history.toSemester;
    const fromAcademicYear = history.fromAcademicYear;
    const toAcademicYear = history.toAcademicYear;
    const fromYearLabel = getAcademicYearLabel(fromSemester);
    const toYearLabel = getAcademicYearLabel(toSemester);
    const isMovingToFinalSemester = toSemester === maxSemester;

    ApiResponse.success(
      res,
      {
        promotion: {
          fromSemester,
          toSemester,
          fromYearLabel,
          toYearLabel,
          fromAcademicYear,
          toAcademicYear,
          feeStatus: history.feeStatus,
          pendingAmount: history.pendingAmount,
          attendancePercentage: history.attendancePercentage,
          attendanceStatus: history.attendanceStatus,
          attendanceCheckedAt: history.attendanceCheckedAt,
          attendanceOverridden: history.attendanceOverridden,
          attendanceOverrideReason: history.attendanceOverrideReason,
          promotedBy: history.promotedByName || actorName,
          promotionDate: history.promotionDate,
          remarks: history.remarks || remarks,
          isFinalSemesterPromotion: isMovingToFinalSemester,
          maxSemester,
          newFeeAssigned:
            executionResult.newFeeAssigned ?? history.newFeeAssigned,
          feeAssignmentWarning:
            executionResult.feeAssignmentWarning ?? history.feeAssignmentWarning,
          promotionDecisionId: decision._id,
        },
      },
      isMovingToFinalSemester
        ? `Student promoted to Final Year (${fromYearLabel} → ${toYearLabel})`
        : `Student promoted successfully from ${fromYearLabel} (Sem ${fromSemester}) to ${toYearLabel} (Sem ${toSemester})`,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * BULK PROMOTE multiple students at once (authoritative batch adapter)
 * Only accessible by COLLEGE_ADMIN and ADMISSION_OFFICER
 */
exports.bulkPromoteStudents = async (req, res, next) => {
  try {
    const {
      studentIds,
      remarks,
      overrideFeeCheck,
      overrideAttendanceCheck,
      overrideAttendanceReason,
    } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError(
        "Please provide valid student IDs",
        400,
        "INVALID_STUDENT_IDS",
      );
    }

    const results = {
      success: [],
      failed: [],
    };

    const actorId = req.user?.id || req.user?._id;
    const actorRole = req.user?.role || ROLE.COLLEGE_ADMIN;
    const actorName = req.user?.name || req.user?.email || "Admin";

    // Process students sequentially; each student has independent execution
    for (const studentId of studentIds) {
      let student = null;
      try {
        student = await Student.findOne({
          _id: studentId,
          college_id: req.college_id,
          status: { $in: ["APPROVED", "ENROLLED"] },
        }).populate("course_id", "name code durationSemesters durationYears");

        if (!student) {
          results.failed.push({
            studentId,
            studentName: "Unknown",
            reason: "Student not found or not approved",
            reasons: ["Student not found or not approved"],
            code: "STUDENT_NOT_FOUND",
          });
          continue;
        }

        const maxSemester = student.course_id?.durationSemesters || 8;
        if (student.currentSemester >= maxSemester) {
          results.failed.push({
            studentId,
            studentName: student.fullName,
            reason: "Already in final semester - ready for Alumni",
            reasons: ["Already in final semester - ready for Alumni"],
            code: "ALREADY_FINAL_SEMESTER",
          });
          continue;
        }

        // Create or refresh decision
        const decision = await createPromotionDecision({
          studentId: student._id,
          collegeId: req.college_id,
          userId: actorId,
          overrideFeeCheck: Boolean(overrideFeeCheck),
          overrideAttendanceCheck: Boolean(overrideAttendanceCheck),
          overrideAttendanceReason,
        });

        // Inspect outcome: only PASS and ATKT are executable
        if (!["PASS", "ATKT"].includes(decision.promotion_outcome)) {
          const rejectionReasons = [];

          if (
            decision.result_status === "NO_RESULT" ||
            decision.promotion_outcome === "NO_RESULT"
          ) {
            rejectionReasons.push(
              "No published semester result found for this student",
            );
          } else if (
            decision.result_status === "INCOMPLETE" ||
            decision.promotion_outcome === "INCOMPLETE"
          ) {
            rejectionReasons.push("Semester result is incomplete");
          } else if (
            decision.result_status === "AMBIGUOUS_RESULT" ||
            decision.promotion_outcome === "AMBIGUOUS_RESULT"
          ) {
            rejectionReasons.push("Multiple published semester results found");
          }

          if (decision.decision_reason === "KT_LIMIT_EXCEEDED") {
            const limit =
              decision.policy_snapshot?.resolvedMaxAllowedKTs ??
              decision.policy_snapshot?.maxAllowedKTs ??
              0;
            rejectionReasons.push(
              `KT limit exceeded: ${decision.kt_count} KT(s) (maximum allowed: ${limit})`,
            );
          }

          if (
            decision.decision_reason === "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED"
          ) {
            rejectionReasons.push(
              "Previous-year backlogs are not fully cleared",
            );
          }

          if (
            decision.attendance_snapshot &&
            !decision.attendance_snapshot.passed
          ) {
            if (decision.attendance_snapshot.status === "NOT_ELIGIBLE") {
              rejectionReasons.push(
                `Attendance insufficient: ${decision.attendance_snapshot.percentage}% (minimum ${decision.attendance_snapshot.requiredPercentage}% required)`,
              );
            } else {
              rejectionReasons.push("Attendance records are not available");
            }
          }

          if (
            decision.fee_clearance_snapshot &&
            !decision.fee_clearance_snapshot.passed
          ) {
            rejectionReasons.push(
              `Pending fees: ₹${decision.fee_clearance_snapshot.pendingAmount}`,
            );
          }

          if (rejectionReasons.length === 0) {
            rejectionReasons.push(
              decision.decision_reason ||
                decision.promotion_outcome ||
                "Student is not eligible for promotion",
            );
          }

          results.failed.push({
            studentId,
            studentName: student.fullName,
            reason: rejectionReasons[0],
            reasons: rejectionReasons,
            code: decision.decision_reason || decision.promotion_outcome,
          });
          continue;
        }

        // PASS / ATKT: Auto-approve if in reviewable status
        if (
          decision.workflow_status === "DRAFT" ||
          decision.workflow_status === "RECOMMENDED" ||
          decision.workflow_status === "UNDER_REVIEW"
        ) {
          if (decision.workflow_status === "DRAFT") {
            await submitPromotionRecommendation({
              decisionId: decision._id,
              collegeId: req.college_id,
              actorId,
              actorRole,
              comment:
                remarks ||
                `Auto-recommended as part of bulk promotion - ${new Date().toLocaleDateString()}`,
              request: req,
            });
          }
          await approvePromotionDecision({
            decisionId: decision._id,
            collegeId: req.college_id,
            actorId,
            actorRole,
            comment:
              remarks ||
              `Auto-approved as part of bulk promotion - ${new Date().toLocaleDateString()}`,
            request: req,
          });
        }

        // Authoritatively execute promotion (individual transaction per student)
        const executionResult = await executePromotion({
          decisionId: decision._id,
          collegeId: req.college_id,
          actorId,
          actorRole,
          actorName,
          request: req,
        });

        const history = executionResult.promotionHistory || {};
        const fromSemester =
          executionResult.previousSemester || history.fromSemester;
        const toSemester = executionResult.newSemester || history.toSemester;
        const fromYearLabel = getAcademicYearLabel(fromSemester);
        const toYearLabel = getAcademicYearLabel(toSemester);
        const isMovingToFinalSemester = toSemester === maxSemester;

        results.success.push({
          studentId,
          studentName: student.fullName,
          fromSemester,
          toSemester,
          fromYearLabel,
          toYearLabel,
          isFinalSemesterPromotion: isMovingToFinalSemester,
          newFeeAssigned:
            executionResult.newFeeAssigned ?? history.newFeeAssigned,
          feeAssignmentWarning:
            executionResult.feeAssignmentWarning ?? history.feeAssignmentWarning,
          promotionDecisionId: decision._id,
        });
      } catch (studentError) {
        results.failed.push({
          studentId,
          studentName: student ? student.fullName : "Unknown",
          reason: studentError.message,
          reasons: [studentError.message],
          code: studentError.code || "PROMOTION_ERROR",
        });
      }
    }

    ApiResponse.success(
      res,
      {
        results,
      },
      `Bulk promotion completed: ${results.success.length} promoted, ${results.failed.length} failed`,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET promotion history for all students in the college
 */
exports.getCollegePromotionHistory = async (req, res, next) => {
  try {
    const { semester, course_id, limit = 50 } = req.query;

    const filter = {
      college_id: req.college_id,
      status: "ACTIVE",
    };

    const promotions = await PromotionHistory.find(filter)
      .populate("student_id", "fullName email currentSemester")
      .populate("course_id", "name code")
      .populate("promotedBy", "name email")
      .sort({ promotionDate: -1 })
      .limit(parseInt(limit));

    ApiResponse.success(
      res,
      {
        count: promotions.length,
        promotions,
      },
      "Promotion history fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};
