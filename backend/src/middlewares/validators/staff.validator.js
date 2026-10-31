const { body, validationResult } = require("express-validator");
const {
  validateEmail,
  validatePassword,
  passwordValidationMessage,
  validateJoiningDate,
  joiningDateValidatorMessage,
  validateIndianMobile,
  mobileValidatorMessage,
  validateIndianPincode,
  pincodeValidatorMessage,
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

// ─── Teacher-only required fields (mirrors teacher.validator.js business rules) ───
const TEACHER_REQUIRED_FIELDS = [
  "designation",
  "qualification",
  "departmentId",
  "courseId",
  "gender",
  "bloodGroup",
  "dateOfBirth",
  "address",
  "city",
  "state",
  "pincode",
];

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
      "TEACHER",
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

  // ─── Conditional TEACHER-specific validation ───
  // Only enforced when role === "TEACHER". Other staff roles are unaffected.
  body("role").custom((value, { req }) => {
    if (value !== "TEACHER") return true;

    for (const field of TEACHER_REQUIRED_FIELDS) {
      const v = req.body[field];
      if (v === undefined || v === null || String(v).trim() === "") {
        throw new Error(
          `${field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} is required for TEACHER role`,
        );
      }
    }

    // experienceYears: must be a non-negative integer ≤ 50
    const exp = req.body.experienceYears;
    if (exp === undefined || exp === null || String(exp).trim() === "") {
      throw new Error("Experience Years is required for TEACHER role");
    }
    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || expNum < 0 || expNum > 50) {
      throw new Error("Experience Years must be between 0 and 50");
    }

    // departmentId must be a valid Mongo ID when required
    if (req.body["departmentId"] && !/^[a-fA-F0-9]{24}$/.test(String(req.body["departmentId"]))) {
      throw new Error("Invalid department ID");
    }
    // courseId must be a valid Mongo ID when required
    if (req.body["courseId"] && !/^[a-fA-F0-9]{24}$/.test(String(req.body["courseId"]))) {
      throw new Error("Invalid course ID");
    }

     // dateOfBirth age range
    if (req.body["dateOfBirth"] && !validateAge(req.body["dateOfBirth"], 14, 100)) {
      throw new Error(ageValidatorMessage(14, 100));
    }

    // subjectIds: optional array of valid MongoDB ObjectIds for TEACHER role
    const subjectIds = req.body["subjectIds"];
    if (subjectIds !== undefined) {
      const list = Array.isArray(subjectIds) ? subjectIds : [subjectIds];
      for (const sid of list) {
        if (sid === undefined || sid === null || String(sid).trim() === "") {
          throw new Error("subjectIds must not contain empty values");
        }
        if (!/^[a-fA-F0-9]{24}$/.test(String(sid))) {
          throw new Error("One or more subjectIds are invalid");
        }
      }
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
