const { body, validationResult } = require("express-validator");
const { validateEmail, validatePassword, passwordValidationMessage, validateJoiningDate, joiningDateValidatorMessage, validateIndianMobile, mobileValidatorMessage, validateIndianPincode, pincodeValidatorMessage } = require("../../utils/validators");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation Errors:", errors.array());
    const errorMessages = errors.array().map((err) => err.msg);
    return res.status(400).json({
      success: false,
      message: errorMessages[0] || "Validation failed",
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
    .custom((value) => {
      if (!value) return true;
      if (!/^\d+$/.test(value)) {
        throw new Error("Mobile number must contain only digits");
      }
      if (value.length !== 10) {
        throw new Error("Mobile number must be exactly 10 digits");
      }
      if (!/^[6-9]/.test(value)) {
        throw new Error("Mobile number must start with 6, 7, 8, or 9");
      }
      return true;
    }),

  body("joiningDate")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!validateJoiningDate(value)) {
        throw new Error(joiningDateValidatorMessage);
      }
      return true;
    }),

  body("pincode")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (!/^\d+$/.test(value)) {
        throw new Error("Pincode must contain only digits");
      }
      if (value.length !== 6) {
        throw new Error("Pincode must be exactly 6 digits");
      }
      return true;
    }),

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
