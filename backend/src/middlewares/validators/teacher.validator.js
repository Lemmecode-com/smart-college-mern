const { body, validationResult } = require("express-validator");
const {
  validateEmail,
  emailValidatorMessage,
  validateIndianMobile,
  mobileValidatorMessage,
  validateIndianPincode,
  pincodeValidatorMessage,
  validateJoiningDate,
  joiningDateValidatorMessage,
  validateAge,
  ageValidatorMessage,
} = require("../../utils/validators");

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

const validateMobile = (field) => {
  return body(field)
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
    });
};

const validatePincode = (field) => {
  return body(field)
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
    });
};

exports.validateTeacherCreation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),

  body("designation")
    .notEmpty().withMessage("Designation is required")
    .isLength({ min: 2, max: 100 }).withMessage("Designation must be 2-100 characters"),

  body("qualification")
    .notEmpty().withMessage("Qualification is required")
    .isLength({ min: 2, max: 100 }).withMessage("Qualification must be 2-100 characters"),

  body("department_id")
    .notEmpty().withMessage("Department is required")
    .isMongoId().withMessage("Invalid department ID"),

  validateMobile("mobile"),

  validatePincode("pincode"),

  body("dateOfBirth")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (!validateAge(value, 14, 100)) {
        throw new Error(ageValidatorMessage(14, 100));
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

  handleValidationErrors,
];

exports.validateTeacherProfileUpdate = [
  body("name")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters"),

  validateMobile("mobile"),

  validatePincode("pincode"),

  body("joiningDate")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!validateJoiningDate(value)) {
        throw new Error(joiningDateValidatorMessage);
      }
      return true;
    }),

  handleValidationErrors,
];
