const AlumniPolicy = require("../models/alumniPolicy.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const auditLogService = require("../services/auditLog.service");
const {
  checkAlumniEligibility,
} = require("../services/alumniEligibility.service");

const validateCourseOwnership = async (courseId, collegeId) => {
  const course = await Course.findOne({
    _id: courseId,
    college_id: collegeId,
  }).select("_id name");
  if (!course) {
    throw new AppError(
      "Course not found or does not belong to your college",
      404,
      "COURSE_NOT_FOUND",
    );
  }
  return course;
};

/**
 * Get active Alumni Settings for a college and optional course
 * GET /api/alumni/settings
 */
exports.getAlumniPolicy = async (req, res, next) => {
  try {
    const { course_id } = req.query;

    if (course_id) {
      await validateCourseOwnership(course_id, req.college_id);
    }

    const policy = await AlumniPolicy.getActivePolicy(req.college_id, course_id);

    if (!policy) {
      return ApiResponse.success(
        res,
        {
          college_id: req.college_id,
          course_id: course_id || null,
          enabled: true,
          requireFinalSemester: true,
          resultRule: {
            requirePublished: true,
            requiredOutcome: "PASS",
          },
          attendanceRule: {
            enabled: true,
            minimumPercentage: 75,
          },
          feeRule: {
            enabled: true,
            minimumPaidPercentage: 100,
          },
          backlogRule: {
            requirePreviousYearClearance: true,
            allowCurrentBacklog: false,
          },
          effectiveFromAcademicYear: null,
          version: 1,
          isActive: true,
          isDefault: true,
        },
        "Default alumni settings (not yet saved)",
      );
    }

    ApiResponse.success(res, policy, "Alumni settings fetched successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update Alumni Settings
 * PUT /api/alumni/settings or POST /api/alumni/settings
 */
exports.updateAlumniPolicy = async (req, res, next) => {
  try {
    const {
      course_id,
      enabled,
      requireFinalSemester,
      resultRule,
      attendanceRule,
      feeRule,
      backlogRule,
      effectiveFromAcademicYear,
      isActive,
    } = req.body;

    const isCourseSpecific = Boolean(course_id);
    if (isCourseSpecific) {
      await validateCourseOwnership(course_id, req.college_id);
    }

    // Validate attendance rule
    if (attendanceRule?.minimumPercentage !== undefined) {
      const attendance = Number(attendanceRule.minimumPercentage);
      if (!Number.isFinite(attendance) || attendance < 0 || attendance > 100) {
        throw new AppError(
          "Minimum attendance percentage must be a number between 0 and 100",
          400,
          "INVALID_ATTENDANCE_PERCENTAGE",
        );
      }
    }

    // Validate fee rule
    if (feeRule?.minimumPaidPercentage !== undefined) {
      const fee = Number(feeRule.minimumPaidPercentage);
      if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
        throw new AppError(
          "Minimum fee paid percentage must be a number between 0 and 100",
          400,
          "INVALID_FEE_PERCENTAGE",
        );
      }
    }

    let policy;
    if (isCourseSpecific) {
      policy = await AlumniPolicy.findOne({
        college_id: req.college_id,
        course_id,
        isActive: true,
      });
    } else {
      policy = await AlumniPolicy.findOne({
        college_id: req.college_id,
        course_id: null,
        isActive: true,
      });
    }

    if (policy) {
      if (enabled !== undefined) policy.enabled = enabled;
      if (requireFinalSemester !== undefined)
        policy.requireFinalSemester = requireFinalSemester;

      if (resultRule) {
        policy.resultRule = {
          ...policy.resultRule?.toObject?.(),
          ...resultRule,
        };
      }

      if (attendanceRule) {
        policy.attendanceRule = {
          ...policy.attendanceRule?.toObject?.(),
          ...attendanceRule,
        };
      }

      if (feeRule) {
        policy.feeRule = {
          ...policy.feeRule?.toObject?.(),
          ...feeRule,
        };
      }

      if (backlogRule) {
        policy.backlogRule = {
          ...policy.backlogRule?.toObject?.(),
          ...backlogRule,
        };
      }

      if (effectiveFromAcademicYear !== undefined) {
        policy.effectiveFromAcademicYear = effectiveFromAcademicYear;
      }
      if (isActive !== undefined) policy.isActive = isActive;
      policy.updatedBy = req.user.id;
      policy.version = (policy.version || 1) + 1;

      await policy.save();
    } else {
      policy = await AlumniPolicy.create({
        college_id: req.college_id,
        course_id: isCourseSpecific ? course_id : null,
        enabled: enabled ?? true,
        requireFinalSemester: requireFinalSemester ?? true,
        resultRule: resultRule || {
          requirePublished: true,
          requiredOutcome: "PASS",
        },
        attendanceRule: attendanceRule || {
          enabled: true,
          minimumPercentage: 75,
        },
        feeRule: feeRule || {
          enabled: true,
          minimumPaidPercentage: 100,
        },
        backlogRule: backlogRule || {
          requirePreviousYearClearance: true,
          allowCurrentBacklog: false,
        },
        effectiveFromAcademicYear: effectiveFromAcademicYear || null,
        version: 1,
        isActive: isActive ?? true,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });
    }

    // Fire-and-forget audit logging
    auditLogService.logAudit({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "UPDATE",
      resourceType: "AlumniPolicy",
      resourceId: policy._id,
      details: {
        course_id: policy.course_id,
        version: policy.version,
        enabled: policy.enabled,
      },
    });

    ApiResponse.success(res, policy, "Alumni settings saved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluate Alumni Eligibility for a student
 * GET /api/alumni/eligibility/:studentId
 */
exports.getAlumniEligibility = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const result = await checkAlumniEligibility(studentId, req.college_id);

    ApiResponse.success(res, result, "Alumni eligibility evaluated successfully");
  } catch (error) {
    next(error);
  }
};
