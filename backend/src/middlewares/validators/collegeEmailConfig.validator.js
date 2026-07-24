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

const validateSmtpHost = body("smtp.host")
  .trim()
  .notEmpty().withMessage("SMTP host is required")
  .isLength({ min: 3, max: 255 }).withMessage("SMTP host must be between 3 and 255 characters");

const validateSmtpPort = body("smtp.port")
  .notEmpty().withMessage("SMTP port is required")
  .isInt({ min: 1, max: 65535 }).withMessage("SMTP port must be a number between 1 and 65535");

const validateSmtpSecure = body("smtp.secure")
  .optional()
  .isBoolean().withMessage("Secure must be a boolean value");

const validateCredentialsUser = body("credentials.user")
  .trim()
  .notEmpty().withMessage("SMTP username/email is required")
  .isEmail().withMessage("SMTP username must be a valid email address");

const validateCredentialsPassSave = body("credentials.pass")
  .optional()
  .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long");

const validateCredentialsPassVerify = body("credentials.pass")
  .notEmpty().withMessage("SMTP password/app password is required")
  .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long");

const validateFromName = body("fromName")
  .trim()
  .notEmpty().withMessage("From name is required")
  .isLength({ min: 2, max: 100 }).withMessage("From name must be between 2 and 100 characters");

const validateFromEmail = body("fromEmail")
  .trim()
  .notEmpty().withMessage("From email is required")
  .isEmail({ allow_display_name: false, require_tld: true, allow_utf8_local_part: false }).withMessage("Please provide a valid from email address");

exports.validateSaveEmailConfig = [
  validateSmtpHost,
  validateSmtpPort,
  validateSmtpSecure,
  validateCredentialsUser,
  validateCredentialsPassSave,
  validateFromName,
  validateFromEmail,

  handleValidationErrors,
];

exports.validateVerifyEmailConfig = [
  validateSmtpHost,
  validateSmtpPort,
  validateSmtpSecure,
  validateCredentialsUser,
  validateCredentialsPassVerify,
  validateFromName,
  validateFromEmail,

  body("testEmail")
    .trim()
    .notEmpty().withMessage("Test email address is required")
    .isEmail({ allow_display_name: false, require_tld: true, allow_utf8_local_part: false }).withMessage("Please provide a valid test email address"),

  handleValidationErrors,
];
