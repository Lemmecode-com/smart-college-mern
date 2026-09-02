const GeneralSettings = require("../models/generalSettings.model");
const AppError = require("../utils/AppError");

const DEFAULT_SETTINGS = {
  allowMultipleLogins: "allowed",
  autoDisableInactiveDays: 180,
  passwordExpiryDays: 90,
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  allowDataExport: "restricted",
  backupFrequency: "daily",
  defaultTheme: "light",
  dateFormat: "DD-MM-YYYY",
  currency: "INR",
  itemsPerPage: 25,
};

const ALLOWED_UPDATE_FIELDS = [
  "allowMultipleLogins",
  "autoDisableInactiveDays",
  "passwordExpiryDays",
  "minPasswordLength",
  "maxLoginAttempts",
  "allowDataExport",
  "backupFrequency",
  "defaultTheme",
  "dateFormat",
  "currency",
  "itemsPerPage",
];

/**
 * Get general settings for a college.
 * Auto-creates default settings if none exist.
 */
exports.getGeneralSettings = async (collegeId, userId) => {
  let settings = await GeneralSettings.findOne({ college_id: collegeId });

  if (!settings) {
    settings = await GeneralSettings.create({
      college_id: collegeId,
      createdBy: userId,
      updatedBy: userId,
      ...DEFAULT_SETTINGS,
    });
  }

  return settings;
};

/**
 * Update general settings for a college.
 * Only allows whitelisted fields to be updated.
 */
exports.updateGeneralSettings = async (collegeId, data, userId) => {
  const updates = {};

  ALLOWED_UPDATE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid settings provided for update", 400, "NO_UPDATES");
  }

  const settings = await GeneralSettings.findOneAndUpdate(
    { college_id: collegeId },
    { $set: { ...updates, updatedBy: userId } },
    { new: true, runValidators: true }
  );

  if (!settings) {
    throw new AppError("General settings not found", 404, "SETTINGS_NOT_FOUND");
  }

  return settings;
};
