const generalSettingsService = require("../services/generalSettings.service");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const logger = require("../utils/logger");

/**
 * GET /api/general-settings
 * Get general settings for the current college.
 * Auto-creates defaults if none exist.
 */
exports.getGeneralSettings = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const userId = req.user?.id;

    if (!collegeId) {
      throw new AppError(
        "College ID not available. Please login again.",
        403,
        "COLLEGE_ID_MISSING",
      );
    }

    const settings = await generalSettingsService.getGeneralSettings(collegeId, userId);

    ApiResponse.success(
      res,
      {
        allowMultipleLogins: settings.allowMultipleLogins,
        autoDisableInactiveDays: settings.autoDisableInactiveDays,
        passwordExpiryDays: settings.passwordExpiryDays,
        minPasswordLength: settings.minPasswordLength,
        maxLoginAttempts: settings.maxLoginAttempts,
        allowDataExport: settings.allowDataExport,
        backupFrequency: settings.backupFrequency,
        defaultTheme: settings.defaultTheme,
        dateFormat: settings.dateFormat,
        currency: settings.currency,
        itemsPerPage: settings.itemsPerPage,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy,
      },
      "General settings fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/general-settings
 * Update general settings for the current college.
 */
exports.updateGeneralSettings = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const userId = req.user?.id;

    if (!collegeId) {
      throw new AppError(
        "College ID not available. Please login again.",
        403,
        "COLLEGE_ID_MISSING",
      );
    }

    const updated = await generalSettingsService.updateGeneralSettings(
      collegeId,
      req.body,
      userId,
    );

    logger.logInfo("General settings updated", {
      collegeId,
      userId,
      updatedBy: userId,
    });

    ApiResponse.success(
      res,
      {
        allowMultipleLogins: updated.allowMultipleLogins,
        autoDisableInactiveDays: updated.autoDisableInactiveDays,
        passwordExpiryDays: updated.passwordExpiryDays,
        minPasswordLength: updated.minPasswordLength,
        maxLoginAttempts: updated.maxLoginAttempts,
        allowDataExport: updated.allowDataExport,
        backupFrequency: updated.backupFrequency,
        defaultTheme: updated.defaultTheme,
        dateFormat: updated.dateFormat,
        currency: updated.currency,
        itemsPerPage: updated.itemsPerPage,
        updatedAt: updated.updatedAt,
        updatedBy: updated.updatedBy,
      },
      "General settings updated successfully",
    );
  } catch (error) {
    next(error);
  }
};
