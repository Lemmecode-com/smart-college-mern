const PromotionPolicy = require("../models/promotionPolicy.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const { DEFAULT_MAX_ALLOWED_KTS } = require("../utils/promotionPolicy.util");

exports.getPromotionPolicy = async (req, res, next) => {
  try {
    const policy = await PromotionPolicy.getActivePolicy(req.college_id);
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
    } = req.body;

    let policy = await PromotionPolicy.getActivePolicy(req.college_id);

    if (policy) {
      policy.minAttendancePercentage =
        minAttendancePercentage ?? policy.minAttendancePercentage;
      if (policy.maxAllowedKTs === undefined) {
        policy.maxAllowedKTs = DEFAULT_MAX_ALLOWED_KTS;
      }
      if (scopedSemesters !== undefined)
        policy.scopedSemesters = scopedSemesters;
      if (effectiveFrom) policy.effectiveFrom = effectiveFrom;
      if (isActive !== undefined) policy.isActive = isActive;
      await policy.save();
    } else {
      policy = await PromotionPolicy.create({
        collegeId: req.college_id,
        minAttendancePercentage: minAttendancePercentage ?? 75,
        maxAllowedKTs: DEFAULT_MAX_ALLOWED_KTS,
        scopedSemesters: scopedSemesters || [],
        effectiveFrom: effectiveFrom || new Date(),
        isActive: isActive ?? true,
      });
    }

    ApiResponse.success(res, policy, "Promotion policy updated successfully");
  } catch (error) {
    next(error);
  }
};
