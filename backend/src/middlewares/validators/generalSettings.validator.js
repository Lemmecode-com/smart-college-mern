const { body, validationResult } = require("express-validator");

const validateGeneralSettingsUpdate = [
  body("allowMultipleLogins")
    .optional()
    .isIn(["allowed", "restricted"])
    .withMessage("allowMultipleLogins must be either 'allowed' or 'restricted'"),
  body("autoDisableInactiveDays")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("autoDisableInactiveDays must be between 1 and 365"),
  body("passwordExpiryDays")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("passwordExpiryDays must be between 1 and 365"),
  body("minPasswordLength")
    .optional()
    .isInt({ min: 6, max: 128 })
    .withMessage("minPasswordLength must be between 6 and 128"),
  body("maxLoginAttempts")
    .optional()
    .isInt({ min: 3, max: 10 })
    .withMessage("maxLoginAttempts must be between 3 and 10"),
  body("allowDataExport")
    .optional()
    .isIn(["allowed", "restricted", "disabled"])
    .withMessage("allowDataExport must be 'allowed', 'restricted', or 'disabled'"),
  body("backupFrequency")
    .optional()
    .isIn(["hourly", "daily", "weekly", "monthly"])
    .withMessage("backupFrequency must be 'hourly', 'daily', 'weekly', or 'monthly'"),
  body("defaultTheme")
    .optional()
    .isIn(["light", "dark", "system"])
    .withMessage("defaultTheme must be 'light', 'dark', or 'system'"),
  body("dateFormat")
    .optional()
    .isIn(["DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD"])
    .withMessage("dateFormat must be 'DD-MM-YYYY', 'MM-DD-YYYY', or 'YYYY-MM-DD'"),
  body("currency")
    .optional()
    .isIn(["INR", "USD", "EUR", "GBP"])
    .withMessage("currency must be 'INR', 'USD', 'EUR', or 'GBP'"),
  body("itemsPerPage")
    .optional()
    .isIn([10, 25, 50, 100])
    .withMessage("itemsPerPage must be 10, 25, 50, or 100"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

module.exports = {
  validateGeneralSettingsUpdate,
};
