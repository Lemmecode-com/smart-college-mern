const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const FeeStructure = require("../models/feeStructure.model");
const PromotionHistory = require("../models/promotionHistory.model");
const Notification = require("../models/notification.model");
const Course = require("../models/course.model");
const { getAttendanceDataForStudents } = require("../services/attendance.service");
const PromotionPolicy = require("../models/promotionPolicy.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");

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
 * Helper: attempt to assign a new fee structure to student after promotion
 * Returns: { newFeeAssigned, newFeeStructureId, newStudentFeeId, feeAssignmentWarning }
 */
async function assignFeeAfterPromotion(student, toSemester, newAcademicYear, college_id) {
  try {
    // Look for fee structure matching course + category (+ optional academicYear)
    const feeStructureQuery = {
      college_id,
      course_id: student.course_id._id || student.course_id,
      category: student.category,
    };

    // Prefer year-specific fee structure if available
    const yearSpecific = await FeeStructure.findOne({
      ...feeStructureQuery,
      academicYear: newAcademicYear,
    });

    const feeStructure = yearSpecific || await FeeStructure.findOne(feeStructureQuery);

    if (!feeStructure) {
      return {
        newFeeAssigned: false,
        newFeeStructureId: null,
        newStudentFeeId: null,
        feeAssignmentWarning: `No fee structure found for course "${student.course_id?.name || student.course_id}" and category "${student.category}" for academic year ${newAcademicYear}. Please set up fee structure manually.`,
      };
    }

    // Create new StudentFee record for the new academic year
    const newStudentFee = await StudentFee.create({
      student_id: student._id,
      college_id,
      course_id: student.course_id._id || student.course_id,
      totalFee: feeStructure.totalFee,
      paidAmount: 0,
      installments: feeStructure.installments.map((inst) => ({
        name: inst.name,
        amount: inst.amount,
        order: inst.order,
        dueDate: inst.dueDate,
        status: "PENDING",
      })),
    });

    return {
      newFeeAssigned: true,
      newFeeStructureId: feeStructure._id,
      newStudentFeeId: newStudentFee._id,
      feeAssignmentWarning: null,
    };
  } catch (err) {
    return {
      newFeeAssigned: false,
      newFeeStructureId: null,
      newStudentFeeId: null,
      feeAssignmentWarning: `Fee assignment failed: ${err.message}`,
    };
  }
}

/**
 * Helper: send promotion notification to a student (fire-and-forget)
 */
async function sendPromotionNotification(student, toSemester, toYearLabel, newAcademicYear, adminId, adminName, college_id) {
  try {
    if (!student.user_id) return; // student has no linked user account yet
    await Notification.create({
      college_id,
      createdBy: adminId,
      createdByRole: "COLLEGE_ADMIN",
      target: "INDIVIDUAL",
      target_users: [student.user_id],
      title: "🎓 Promotion Confirmed",
      message: `Congratulations ${student.fullName}! You have been promoted to ${toYearLabel} (Semester ${toSemester}, ${newAcademicYear}) by ${adminName}.`,
      type: "ACADEMIC",
      priority: "HIGH",
      actionUrl: "/student/dashboard",
    });
  } catch (err) {
    // Notification failure must never break promotion — log only
    console.error(`[PROMOTION] Notification failed for student ${student._id}:`, err.message);
  }
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
  const totalSessions = Number(attendanceData?.totalSessions || 0);
  const percentage = Number(attendanceData?.percentage || 0);

  if (totalSessions === 0) {
    return ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE;
  }

  return percentage >= threshold
    ? ATTENDANCE_STATUS.ELIGIBLE
    : ATTENDANCE_STATUS.NOT_ELIGIBLE;
}

function getAttendanceSnapshot(attendanceData, attendanceOverridden, attendanceOverrideReason, threshold = ATTENDANCE_THRESHOLD) {
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

function validateAttendanceOverride(overrideAttendanceCheck, overrideAttendanceReason, attendanceStatus) {
  const wantsOverride = Boolean(overrideAttendanceCheck);

  if (wantsOverride && attendanceStatus === ATTENDANCE_STATUS.NOT_ELIGIBLE) {
    throw new AppError(
      "Attendance override is not allowed when attendance is below the required threshold.",
      400,
      "ATTENDANCE_OVERRIDE_NOT_ALLOWED",
    );
  }

  if (wantsOverride && attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE) {
    const reason = typeof overrideAttendanceReason === "string"
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

    console.log('============ [PROMOTION] DEBUG INFO ============');
    console.log('[PROMOTION] Request received:', {
      college_id: req.college_id?.toString(),
      user: req.user?.email,
      role: req.user?.role,
      query: req.query
    });

    // Build filter - show ALL APPROVED students (for display purposes)
    // Promotion eligibility is shown in UI via fee status
    const filter = {
      college_id: req.college_id,
      status: "APPROVED"
    };

    if (course_id) {
      filter.course_id = course_id;
    }

    if (currentSemester) {
      filter.currentSemester = parseInt(currentSemester);
    }

    console.log('[PROMOTION] Filter:', JSON.stringify(filter));

    // Debug: Check total students in college regardless of status
    const totalStudentsInCollege = await Student.countDocuments({
      college_id: req.college_id
    });
    const studentsByStatus = await Student.aggregate([
      { $match: { college_id: req.college_id } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    console.log('[PROMOTION] Total students in college:', totalStudentsInCollege);
    console.log('[PROMOTION] Students by status:', studentsByStatus);

    // Get all eligible students
    const students = await Student.find(filter)
      .populate("course_id", "name code durationSemesters durationYears")
      .populate("department_id", "name code")
      .sort({ currentSemester: 1, fullName: 1 });

    console.log('[PROMOTION] Found students with APPROVED status:', students.length);
    console.log('============ [PROMOTION] END DEBUG ============');

    const threshold = await getPromotionThreshold(req.college_id);
    const attendanceData = await getAttendanceDataForStudents(students, req.college_id);
    const attendanceMap = new Map(
      attendanceData.map((attendance) => [attendance.student_id.toString(), attendance]),
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
            allInstallmentsPaid = true;
          } else if (fee.paidAmount > 0) {
            feeStatus = "PARTIALLY_PAID";
          }

          // Check if all installments are paid
          if (fee.installments && fee.installments.length > 0) {
            allInstallmentsPaid = fee.installments.every(
              (inst) => inst.status === "PAID"
            );
          }
        }

        // Get max semester from course duration
        const maxSemester = student.course_id?.durationSemesters || 8;
        const academicYearLabel = getAcademicYearLabel(student.currentSemester);
        const isFinalYear = student.currentSemester >= maxSemester - 1;
        const attendance = attendanceMap.get(student._id.toString()) || {
          percentage: 0,
          totalSessions: 0,
        };

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
          maxSemester,
          attendancePercentage: attendance.percentage,
          attendanceStatus: getAttendanceStatus(attendance, threshold),
          attendanceTotalSessions: attendance.totalSessions,
        };
      })
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

    ApiResponse.success(res, {
      count: studentsWithFee.length,
      students: studentsWithFee,
      groupedBySemester,
      promotionThreshold: threshold,
    }, "Students fetched successfully for promotion");
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
      status: "APPROVED",
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
    const attendanceData = (await getAttendanceDataForStudents([student], req.college_id))[0];
    const attendanceStatus = getAttendanceStatus(attendanceData, threshold);

    // Calculate fee status
    let feeStatus = "PENDING";
    let pendingAmount = 0;
    let allInstallmentsPaid = false;

    if (fee) {
      pendingAmount = fee.totalFee - fee.paidAmount;

      if (fee.paidAmount >= fee.totalFee) {
        feeStatus = "FULLY_PAID";
        allInstallmentsPaid = true;
      } else if (fee.paidAmount > 0) {
        feeStatus = "PARTIALLY_PAID";
      }

      if (fee.installments && fee.installments.length > 0) {
        allInstallmentsPaid = fee.installments.every(
          (inst) => inst.status === "PAID"
        );
      }
    }

    // Calculate next semester
    const nextSemester = student.currentSemester + 1;
    const maxSemester = 8; // Assuming 4-year program with 2 semesters per year
    const canPromote = nextSemester <= maxSemester && allInstallmentsPaid && attendanceStatus === ATTENDANCE_STATUS.ELIGIBLE;

    ApiResponse.success(res, {
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
    }, "Student promotion details fetched successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * PROMOTE STUDENT to next semester
 * Only accessible by COLLEGE_ADMIN
 *
 * Logic:
 * 1. Check if student exists and is approved
 * 2. Get max semester from course
 * 3. Check if student is in final semester - if yes, move to Alumni
 * 4. Check fee payment status
 * 5. If all installments are paid OR admin overrides, allow promotion
 * 6. Update student's semester and academic year
 * 7. Create promotion history record
 */
exports.promoteStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { remarks, overrideFeeCheck, overrideAttendanceCheck, overrideAttendanceReason } = req.body;

    // 1. Find student
    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: "APPROVED",
    })
      .populate("course_id", "name code semester")
      .populate("department_id", "name code");

    if (!student) {
      throw new AppError("Student not found or not approved", 404, "STUDENT_NOT_FOUND");
    }

    // 2. Get max semester from course duration (dynamic based on course)
    const maxSemester = student.course_id?.durationSemesters || 8;

    // 3. Check if already at max semester - move to Alumni
    if (student.currentSemester >= maxSemester) {
      throw new AppError(
        "Student has completed the course. Moving to alumni status requires separate process.",
        400,
        "ALREADY_FINAL_SEMESTER"
      );
    }

    // 3b. Check if this is the last semester promotion (moving to final sem)
    const isMovingToFinalSemester = (student.currentSemester + 1) === maxSemester;

    // 4. Get fee details
    const fee = await StudentFee.findOne({
      student_id: studentId,
      college_id: req.college_id,
    });

    let feeStatus = "PENDING";
    let allInstallmentsPaid = false;
    let pendingAmount = 0;

    if (fee) {
      pendingAmount = fee.totalFee - fee.paidAmount;

      if (fee.paidAmount >= fee.totalFee) {
        feeStatus = "FULLY_PAID";
        allInstallmentsPaid = true;
      } else if (fee.paidAmount > 0) {
        feeStatus = "PARTIALLY_PAID";
      }

      if (fee.installments && fee.installments.length > 0) {
        allInstallmentsPaid = fee.installments.every(
          (inst) => inst.status === "PAID"
        );
      }
    }

    const threshold = await getPromotionThreshold(req.college_id);
    const attendanceData = (await getAttendanceDataForStudents([student], req.college_id))[0];
    const attendanceStatus = getAttendanceStatus(attendanceData, threshold);
    const attendanceOverrideReason = validateAttendanceOverride(
      overrideAttendanceCheck,
      overrideAttendanceReason,
      attendanceStatus
    );

    // 5. Check fee payment (can be overridden by admin)
    if (!allInstallmentsPaid && !overrideFeeCheck) {
      throw new AppError(
        `Student has pending fees of ₹${pendingAmount}. Please clear all dues or use override option.`,
        400,
        "FEE_PENDING"
      );
    }

    if (attendanceStatus === ATTENDANCE_STATUS.NOT_ELIGIBLE) {
      throw new AppError(
        `Student attendance is below the required threshold of ${threshold}%.`,
        400,
        "ATTENDANCE_INSUFFICIENT"
      );
    }

    if (attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE && !overrideAttendanceCheck) {
      throw new AppError(
        "Attendance records are not available for this student.",
        400,
        "ATTENDANCE_NOT_AVAILABLE"
      );
    }

    // 6. Calculate new semester and academic year
    const fromSemester = student.currentSemester;
    const fromAcademicYear = student.currentAcademicYear;
    const toSemester = fromSemester + 1;

    // Parse current academic year
    const [currentAcademicYearStart] = fromAcademicYear.split('-').map(Number);

    // Calculate new academic year (increment if moving to odd semester after even)
    let newAcademicYearStart = currentAcademicYearStart;
    if (fromSemester % 2 === 0) {
      // Moving from even to odd semester (e.g., 2 -> 3, 4 -> 5)
      newAcademicYearStart = currentAcademicYearStart + 1;
    }
    const newAcademicYear = `${newAcademicYearStart}-${newAcademicYearStart + 1}`;

    // 7. Update student record
    student.currentSemester = toSemester;
    student.currentAcademicYear = newAcademicYear;
    student.lastPromotionDate = new Date();

    await student.save();

    // 8. Calculate year labels
    const fromYearLabel = getAcademicYearLabel(fromSemester);
    const toYearLabel = getAcademicYearLabel(toSemester);

    // 9. Assign fee structure for new semester
    const feeAssignment = await assignFeeAfterPromotion(
      student, toSemester, newAcademicYear, req.college_id
    );

    const attendanceSnapshot = getAttendanceSnapshot(
      attendanceData,
      attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE,
      attendanceOverrideReason,
      threshold
    );

    // 10. Create promotion history record
    const promotionRecord = await PromotionHistory.create({
      student_id: student._id,
      college_id: req.college_id,
      course_id: student.course_id,
      fromSemester,
      toSemester,
      fromAcademicYear,
      toAcademicYear: newAcademicYear,
      feeStatus,
      totalFee: fee ? fee.totalFee : 0,
      paidAmount: fee ? fee.paidAmount : 0,
      pendingAmount,
      ...attendanceSnapshot,
      promotedBy: req.user.id,
      promotedByName: req.user.name || req.user.email || 'Admin',
      promotionDate: new Date(),
      remarks: remarks || null,
      status: "ACTIVE",
      isFinalSemesterPromotion: isMovingToFinalSemester,
      newFeeAssigned: feeAssignment.newFeeAssigned,
      newFeeStructureId: feeAssignment.newFeeStructureId,
      newStudentFeeId: feeAssignment.newStudentFeeId,
      feeAssignmentWarning: feeAssignment.feeAssignmentWarning,
    });

    // 11. Add to student's promotion history array
    student.promotionHistory.push(promotionRecord._id);
    await student.save();

    // 12. Send notification to student (non-blocking)
    const adminName = req.user.name || req.user.email || 'Admin';
    sendPromotionNotification(
      student, toSemester, toYearLabel, newAcademicYear,
      req.user.id, adminName, req.college_id
    );

    ApiResponse.success(res, {
      promotion: {
        fromSemester,
        toSemester,
        fromYearLabel,
        toYearLabel,
        fromAcademicYear,
        toAcademicYear: newAcademicYear,
        feeStatus,
        pendingAmount,
        ...attendanceSnapshot,
        promotedBy: req.user.name,
        promotionDate: promotionRecord.promotionDate,
        remarks,
        isFinalSemesterPromotion: isMovingToFinalSemester,
        maxSemester,
        newFeeAssigned: feeAssignment.newFeeAssigned,
        feeAssignmentWarning: feeAssignment.feeAssignmentWarning,
      },
    }, isMovingToFinalSemester
      ? `Student promoted to Final Year (${fromYearLabel} → ${toYearLabel})`
      : `Student promoted successfully from ${fromYearLabel} (Sem ${fromSemester}) to ${toYearLabel} (Sem ${toSemester})`);
  } catch (error) {
    next(error);
  }
};

/**
 * BULK PROMOTE multiple students at once
 * Only accessible by COLLEGE_ADMIN
 */
exports.bulkPromoteStudents = async (req, res, next) => {
  try {
    const { studentIds, remarks, overrideFeeCheck, overrideAttendanceCheck, overrideAttendanceReason } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError("Please provide valid student IDs", 400, "INVALID_STUDENT_IDS");
    }

    const results = {
      success: [],
      failed: [],
    };

    const threshold = await getPromotionThreshold(req.college_id);

    // Process each student
    for (const studentId of studentIds) {
      try {
        const student = await Student.findOne({
          _id: studentId,
          college_id: req.college_id,
          status: "APPROVED",
        }).populate("course_id", "name code durationSemesters durationYears");

        if (!student) {
          results.failed.push({
            studentId,
            studentName: "Unknown",
            reason: "Student not found or not approved",
          });
          continue;
        }

        // Get max semester from course duration
        const maxSemester = student.course_id?.durationSemesters || 8;

        if (student.currentSemester >= maxSemester) {
          results.failed.push({
            studentId,
            studentName: student.fullName,
            reason: "Already in final semester - ready for Alumni",
          });
          continue;
        }

        // Check if this is the last semester promotion
        const isMovingToFinalSemester = (student.currentSemester + 1) === maxSemester;

        // Check fee
        const fee = await StudentFee.findOne({ student_id: studentId, college_id: req.college_id });
        let allInstallmentsPaid = false;
        let feeStatus = "PENDING";
        let pendingAmount = 0;

        if (fee) {
          pendingAmount = fee.totalFee - fee.paidAmount;

          if (fee.paidAmount >= fee.totalFee) {
            feeStatus = "FULLY_PAID";
            allInstallmentsPaid = true;
          } else if (fee.paidAmount > 0) {
            feeStatus = "PARTIALLY_PAID";
          }

          if (fee.installments && fee.installments.length > 0) {
            allInstallmentsPaid = fee.installments.every(
              (inst) => inst.status === "PAID"
            );
          }
        }

        if (!allInstallmentsPaid && !overrideFeeCheck) {
          results.failed.push({
            studentId,
            studentName: student.fullName,
            reason: `Pending fees: ₹${pendingAmount}`,
          });
          continue;
        }

        const attendanceData = (await getAttendanceDataForStudents([student], req.college_id))[0];
        const attendanceStatus = getAttendanceStatus(attendanceData, threshold);
        let attendanceOverrideReason = null;

        try {
          attendanceOverrideReason = validateAttendanceOverride(
            overrideAttendanceCheck,
            overrideAttendanceReason,
            attendanceStatus
          );
        } catch (error) {
          results.failed.push({
            studentId,
            studentName: student.fullName,
            reason: error.message,
            code: error.code,
          });
          continue;
        }

        if (attendanceStatus === ATTENDANCE_STATUS.NOT_ELIGIBLE) {
          results.failed.push({
            studentId,
            studentName: student.fullName,
            reason: `Attendance insufficient: ${attendanceData.percentage}% (minimum ${threshold}% required)`,
            code: "ATTENDANCE_INSUFFICIENT",
          });
          continue;
        }

        if (attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE && !overrideAttendanceCheck) {
          results.failed.push({
            studentId,
            studentName: student.fullName,
            reason: "Attendance records are not available",
            code: "ATTENDANCE_NOT_AVAILABLE",
          });
          continue;
        }

        // Promote
        const fromSemester = student.currentSemester;
        const fromAcademicYear = student.currentAcademicYear;
        const toSemester = fromSemester + 1;

        const [currentAcademicYearStart] = fromAcademicYear.split('-').map(Number);
        let newAcademicYearStart = currentAcademicYearStart;
        if (fromSemester % 2 === 0) {
          newAcademicYearStart = currentAcademicYearStart + 1;
        }
        const newAcademicYear = `${newAcademicYearStart}-${newAcademicYearStart + 1}`;

        student.currentSemester = toSemester;
        student.currentAcademicYear = newAcademicYear;
        student.lastPromotionDate = new Date();
        await student.save();

        const fromYearLabel = getAcademicYearLabel(fromSemester);
        const toYearLabel = getAcademicYearLabel(toSemester);

        // Assign fee structure for new semester
        const feeAssignment = await assignFeeAfterPromotion(
          student, toSemester, newAcademicYear, req.college_id
        );

        const attendanceSnapshot = getAttendanceSnapshot(
          attendanceData,
          attendanceStatus === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE,
          attendanceOverrideReason,
          threshold
        );

        const promotionRecord = await PromotionHistory.create({
          student_id: student._id,
          college_id: req.college_id,
          course_id: student.course_id,
          fromSemester,
          toSemester,
          fromAcademicYear,
          toAcademicYear: newAcademicYear,
          feeStatus,
          totalFee: fee ? fee.totalFee : 0,
          paidAmount: fee ? fee.paidAmount : 0,
          pendingAmount,
          ...attendanceSnapshot,
          promotedBy: req.user.id,
          promotedByName: req.user.name || req.user.email || 'Admin',
          promotionDate: new Date(),
          remarks: remarks || `Bulk promotion - ${new Date().toLocaleDateString()}`,
          status: "ACTIVE",
          isFinalSemesterPromotion: isMovingToFinalSemester,
          newFeeAssigned: feeAssignment.newFeeAssigned,
          newFeeStructureId: feeAssignment.newFeeStructureId,
          newStudentFeeId: feeAssignment.newStudentFeeId,
          feeAssignmentWarning: feeAssignment.feeAssignmentWarning,
        });

        student.promotionHistory.push(promotionRecord._id);
        await student.save();

        // Send notification (non-blocking)
        const adminName = req.user.name || req.user.email || 'Admin';
        sendPromotionNotification(
          student, toSemester, toYearLabel, newAcademicYear,
          req.user.id, adminName, req.college_id
        );

        results.success.push({
          studentId,
          studentName: student.fullName,
          fromSemester,
          toSemester,
          fromYearLabel,
          toYearLabel,
          isFinalSemesterPromotion: isMovingToFinalSemester,
          newFeeAssigned: feeAssignment.newFeeAssigned,
          feeAssignmentWarning: feeAssignment.feeAssignmentWarning,
        });
      } catch (error) {
        results.failed.push({
          studentId,
          reason: error.message,
        });
      }
    }

    ApiResponse.success(res, {
      results,
    }, `Bulk promotion completed: ${results.success.length} promoted, ${results.failed.length} failed`);
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

    ApiResponse.success(res, {
      count: promotions.length,
      promotions,
    }, "Promotion history fetched successfully");
  } catch (error) {
    next(error);
  }
};
