const { body, validationResult } = require("express-validator");
const logger = require("../../utils/logger");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.logError("Email configuration validation errors", { errors: errors.array() });
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

exports.validateSaveEmailConfig = [
  body("fromEmail")
    .trim()
    .notEmpty().withMessage("From email is required")
    .isEmail().withMessage("Please provide a valid from email address"),

  handleValidationErrors,
];

exports.validateVerifyEmailConfig = [
  body("fromEmail")
    .trim()
    .notEmpty().withMessage("From email is required")
    .isEmail().withMessage("Please provide a valid from email address"),

  body("testEmail")
    .trim()
    .notEmpty().withMessage("Test email address is required")
    .isEmail().withMessage("Please provide a valid test email address"),

  handleValidationErrors,
];
