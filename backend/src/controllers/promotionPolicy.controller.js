const PromotionPolicy = require("../models/promotionPolicy.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const { DEFAULT_MAX_ALLOWED_KTS } = require("../utils/promotionPolicy.util");

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
      scopedSemesters,
      effectiveFrom,
      isActive,
      ktRules,
      course_id,
    } = req.body;

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

    if (policy) {
      policy.minAttendancePercentage =
        minAttendancePercentage ?? policy.minAttendancePercentage;
      if (policy.maxAllowedKTs === undefined) {
        policy.maxAllowedKTs = DEFAULT_MAX_ALLOWED_KTS;
      }
      if (scopedSemesters !== undefined)
        policy.scopedSemesters = scopedSemesters;
      if (ktRules !== undefined)
        policy.ktRules = ktRules;
      if (effectiveFrom) policy.effectiveFrom = effectiveFrom;
      if (isActive !== undefined) policy.isActive = isActive;
      await policy.save();
    } else {
      const createData = {
        collegeId: req.college_id,
        minAttendancePercentage: minAttendancePercentage ?? 75,
        maxAllowedKTs: DEFAULT_MAX_ALLOWED_KTS,
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
