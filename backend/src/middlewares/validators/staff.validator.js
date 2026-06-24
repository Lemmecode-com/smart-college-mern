const { body, validationResult } = require("express-validator");
const { validateEmail, validatePassword, passwordValidationMessage } = require("../../utils/validators");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation Errors:", errors.array());
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

exports.validateStaffCreation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),

  body("role")
    .notEmpty().withMessage("Role is required")
    .isIn([
      "ACCOUNTANT",
      "ADMISSION_OFFICER",
      "PRINCIPAL",
      "HOD",
      "EXAM_COORDINATOR",
      "PLATFORM_SUPPORT",
    ]).withMessage("Invalid role"),

  body("departmentId")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("Invalid department ID"),

  body("mobileNumber")
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/).withMessage("Invalid 10-digit mobile number"),

  handleValidationErrors,
];

exports.validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

exports.validatePasswordReset = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),

  handleValidationErrors,
];

exports.validateVerifyOTP = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),

  body("otp")
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),

  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .custom(validatePassword).withMessage(passwordValidationMessage),

  handleValidationErrors,
];

exports.validateChangePassword = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .custom(validatePassword).withMessage(passwordValidationMessage),

  handleValidationErrors,
];
