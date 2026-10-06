const PromotionPolicy = require("../models/promotionPolicy.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const { DEFAULT_MAX_ALLOWED_KTS, DEFAULT_MIN_FEE_PAID_PERCENTAGE } = require("../utils/promotionPolicy.util");

const validateCourseOwnership = async (courseId, collegeId) => {
  const course = await Course.findOne({ _id: courseId, college_id: collegeId }).select("_id");
  if (!course) {
    throw new AppError("Course not found or does not belong to your college", 404, "COURSE_NOT_FOUND");
  }
  return course;
};

exports.getPromotionPolicy = async (req, res, next) => {
  try {
    const { course_id } = req.query;

    if (course_id) {
      await validateCourseOwnership(course_id, req.college_id);
    }

    const policy = await PromotionPolicy.getActivePolicy(req.college_id, course_id);
    if (!policy) {
      return ApiResponse.success(
        res,
        {
          minAttendancePercentage: 75,
          maxAllowedKTs: DEFAULT_MAX_ALLOWED_KTS,
          minimumFeePaidPercentage: DEFAULT_MIN_FEE_PAID_PERCENTAGE,
          scopedSemesters: [],
          effectiveFrom: new Date(),
          isActive: true,
        },
        "Default promotion policy",
      );
    }
    ApiResponse.success(res, policy, "Promotion policy fetched successfully");
  } catch (error) {
    next(error);
  }
};

exports.updatePromotionPolicy = async (req, res, next) => {
  try {
    const {
      minAttendancePercentage,
      maxAllowedKTs,
      minimumFeePaidPercentage,
      scopedSemesters,
      effectiveFrom,
      isActive,
      ktRules,
      course_id,
    } = req.body;

    // Same contract as the schema: non-negative integer.
    if (maxAllowedKTs !== undefined) {
      if (!Number.isInteger(maxAllowedKTs) || maxAllowedKTs < 0) {
        throw new AppError(
          "maxAllowedKTs must be a non-negative integer",
          400,
          "INVALID_MAX_ALLOWED_KTS",
        );
      }
    }

    // Same contract as the schema: a finite number between 0 and 100.
    let resolvedMinimumFeePaidPercentage;
    if (minimumFeePaidPercentage !== undefined && minimumFeePaidPercentage !== null) {
      const numericValue = Number(minimumFeePaidPercentage);
      if (
        minimumFeePaidPercentage === "" ||
        !Number.isFinite(numericValue) ||
        numericValue < 0 ||
        numericValue > 100
      ) {
        throw new AppError(
          "minimumFeePaidPercentage must be a number between 0 and 100",
          400,
          "INVALID_MINIMUM_FEE_PAID_PERCENTAGE",
        );
      }
      resolvedMinimumFeePaidPercentage = numericValue;
    }

    const isCourseSpecific = Boolean(course_id);

    if (isCourseSpecific) {
      await validateCourseOwnership(course_id, req.college_id);
    }

    let policy;
    if (isCourseSpecific) {
      policy = await PromotionPolicy.findOne({
        collegeId: req.college_id,
        course_id,
        isActive: true,
      });
    } else {
      policy = await PromotionPolicy.getActivePolicy(req.college_id);
    }

    if (!policy) {
      policy = await PromotionPolicy.findOne({
        collegeId: req.college_id,
        isActive: true,
      });
    }

    if (policy) {
      policy.minAttendancePercentage =
        minAttendancePercentage ?? policy.minAttendancePercentage;
      if (maxAllowedKTs !== undefined) {
        policy.maxAllowedKTs = maxAllowedKTs;
      } else if (policy.maxAllowedKTs === undefined) {
        policy.maxAllowedKTs = DEFAULT_MAX_ALLOWED_KTS;
      }
      if (resolvedMinimumFeePaidPercentage !== undefined) {
        policy.minimumFeePaidPercentage = resolvedMinimumFeePaidPercentage;
      } else if (policy.minimumFeePaidPercentage === undefined) {
        policy.minimumFeePaidPercentage = DEFAULT_MIN_FEE_PAID_PERCENTAGE;
      }
      if (scopedSemesters !== undefined)
        policy.scopedSemesters = scopedSemesters;
      if (ktRules !== undefined)
        policy.ktRules = ktRules;
      if (effectiveFrom) policy.effectiveFrom = effectiveFrom;
      if (isActive !== undefined) policy.isActive = isActive;
      if (isCourseSpecific && course_id) {
        policy.course_id = course_id;
      }
      await policy.save();
    } else {
      const createData = {
        collegeId: req.college_id,
        minAttendancePercentage: minAttendancePercentage ?? 75,
        maxAllowedKTs: maxAllowedKTs ?? DEFAULT_MAX_ALLOWED_KTS,
        minimumFeePaidPercentage:
          resolvedMinimumFeePaidPercentage ?? DEFAULT_MIN_FEE_PAID_PERCENTAGE,
        scopedSemesters: scopedSemesters || [],
        effectiveFrom: effectiveFrom || new Date(),
        isActive: isActive ?? true,
        ktRules: ktRules || [],
      };
      if (isCourseSpecific) {
        createData.course_id = course_id;
      }
      policy = await PromotionPolicy.create(createData);
    }

    ApiResponse.success(res, policy, "Promotion policy updated successfully");
  } catch (error) {
    next(error);
  }
};
