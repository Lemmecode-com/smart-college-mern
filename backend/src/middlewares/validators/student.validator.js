/**
 * Express Validator Middleware for Student Routes
 * 
 * Purpose:
 * - Validate incoming request data before it reaches controllers
 * - Provide clear error messages to users
 * - First line of defense (before Mongoose validators)
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 * Returns formatted error response
 */
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation Errors:', errors.array());
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Student Registration Validation
 * Used in: POST /api/students/register/:collegeCode
 */
exports.validateStudentRegistration = [
  // Personal Details
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Full name must be between 3 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('mobileNumber')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit Indian mobile number (must start with 6-9)'),

  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),

  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 14 || age > 100) {
        throw new Error('Age must be between 14 and 100 years');
      }
      if (birthDate > today) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),

  // Address Details
  body('addressLine')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 10, max: 500 }).withMessage('Address must be between 10 and 500 characters'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ min: 2, max: 100 }).withMessage('City name must be between 2 and 100 characters'),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required')
    .isLength({ min: 2, max: 100 }).withMessage('State name must be between 2 and 100 characters'),

  body('pincode')
    .trim()
    .notEmpty().withMessage('Pincode is required')
    .matches(/^\d{6}$/).withMessage('Please provide a valid 6-digit Indian pincode'),

  // Academic Details
  body('department_id')
    .notEmpty().withMessage('Department is required')
    .isMongoId().withMessage('Invalid department ID'),

  body('course_id')
    .notEmpty().withMessage('Course is required')
    .isMongoId().withMessage('Invalid course ID'),

  body('admissionYear')
    .notEmpty().withMessage('Admission year is required')
    .isInt({ min: new Date().getFullYear() - 5, max: new Date().getFullYear() + 1 })
    .withMessage(`Admission year must be between ${new Date().getFullYear() - 5} and ${new Date().getFullYear() + 1}`),

  body('currentSemester')
    .notEmpty().withMessage('Current semester is required')
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['GEN', 'OBC', 'SC', 'ST', 'OTHER']).withMessage('Category must be GEN, OBC, SC, ST, or OTHER'),

  // Optional fields with validation
  body('alternateMobile')
    .optional()
    .matches(/^[6-9]\d{9}$/).withMessage('Alternate mobile must be a valid 10-digit Indian number'),

  body('sscPercentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('SSC percentage must be between 0 and 100'),

  body('sscPassingYear')
    .optional({ checkFalsy: true })
    .isInt({ min: 1950, max: new Date().getFullYear() + 5 })
    .withMessage(`SSC passing year must be between 1950 and ${new Date().getFullYear() + 5}`),

  body('hscPercentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('HSC percentage must be between 0 and 100'),

  body('hscPassingYear')
    .optional({ checkFalsy: true })
    .isInt({ min: 1950, max: new Date().getFullYear() + 5 })
    .withMessage(`HSC passing year must be between 1950 and ${new Date().getFullYear() + 5}`),

  // Parent/Guardian Details
  body('fatherName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Father\'s name must be between 3 and 100 characters'),

  body('fatherMobile')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/).withMessage('Father\'s mobile must be a valid 10-digit Indian number'),

  body('motherName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Mother\'s name must be between 3 and 100 characters'),

  body('motherMobile')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/).withMessage('Mother\'s mobile must be a valid 10-digit Indian number'),

  // Handle validation errors
  exports.handleValidationErrors
];

/**
 * Student Update by Admin Validation
 * Used in: PUT /api/students/:id
 */
exports.validateStudentUpdateByAdmin = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Full name must be between 3 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('mobileNumber')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit Indian mobile number'),

  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),

  body('dateOfBirth')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 14 || age > 100) {
        throw new Error('Age must be between 14 and 100 years');
      }
      return true;
    }),

  body('addressLine')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('Address must be between 10 and 500 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('City name must be between 2 and 100 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('State name must be between 2 and 100 characters'),

  body('pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/).withMessage('Please provide a valid 6-digit Indian pincode'),

  body('admissionYear')
    .optional()
    .isInt({ min: new Date().getFullYear() - 5, max: new Date().getFullYear() + 1 })
    .withMessage(`Admission year must be between ${new Date().getFullYear() - 5} and ${new Date().getFullYear() + 1}`),

  body('currentSemester')
    .optional()
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),

  body('category')
    .optional()
    .isIn(['GEN', 'OBC', 'SC', 'ST', 'OTHER']).withMessage('Category must be GEN, OBC, SC, ST, or OTHER'),

  body('sscPercentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('SSC percentage must be between 0 and 100'),

  body('hscPercentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('HSC percentage must be between 0 and 100'),

  // Explicitly block password update
  body('password')
    .custom((value) => {
      throw new Error('Password cannot be updated here. Use the password reset feature.');
    }),

  // Handle validation errors
  exports.handleValidationErrors
];

/**
 * Student Profile Update Validation
 * Used in: PUT /api/students/update-my-profile
 */
exports.validateStudentProfileUpdate = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Full name must be between 3 and 100 characters'),

  body('mobileNumber')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit Indian mobile number'),

  body('alternateMobile')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/).withMessage('Alternate mobile must be a valid 10-digit Indian number'),

  body('addressLine')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('Address must be between 10 and 500 characters'),

  body('addressLine2')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Address line 2 must be under 200 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('City name must be between 2 and 100 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('State name must be between 2 and 100 characters'),

  body('pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/).withMessage('Please provide a valid 6-digit Indian pincode'),

  body('bloodGroup')
    .optional()
    .trim()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Blood group must be valid (e.g., A+, B-, O+, etc.)'),

  body('fatherName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Father\'s name must be between 3 and 100 characters'),

  body('fatherMobile')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage('Father\'s mobile must be a valid 10-digit Indian number'),

  body('motherName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Mother\'s name must be between 3 and 100 characters'),

  body('motherMobile')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage('Mother\'s mobile must be a valid 10-digit Indian number'),

  body('emergencyContactName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Emergency contact name must be between 3 and 100 characters'),

  body('emergencyContactNumber')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage('Emergency contact must be a valid 10-digit Indian number'),

  // Handle validation errors
  exports.handleValidationErrors
];

/**
 * Student ID Parameter Validation
 * Used in: GET/PUT/DELETE /api/students/:id
 */
exports.validateStudentId = [
  param('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID format'),

  exports.handleValidationErrors
];

/**
 * College Code Parameter Validation
 * Used in: POST /api/students/register/:collegeCode
 */
exports.validateCollegeCode = [
  param('collegeCode')
    .trim()
    .notEmpty().withMessage('College code is required')
    .isLength({ min: 3, max: 20 }).withMessage('College code must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9-]+$/).withMessage('College code can only contain letters, numbers, and hyphens'),

  exports.handleValidationErrors
];
