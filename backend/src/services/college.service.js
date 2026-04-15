/**
 * College Service
 * 
 * Purpose:
 * - Centralize all college-related operations
 * - Remove duplicate college resolution logic
 * - Consistent error handling
 */

const College = require('../models/college.model');
const AppError = require('../utils/AppError');

/**
 * Find college by code
 * @param {string} collegeCode - College code
 * @returns {Promise<Object>} College document
 * @throws {AppError} If college not found
 */
exports.findCollegeByCode = async (collegeCode) => {
  const college = await College.findOne({ code: collegeCode });
  
  if (!college) {
    throw new AppError('College not found', 404, 'COLLEGE_NOT_FOUND');
  }
  
  return college;
};

/**
 * Find college by ID
 * @param {string} collegeId - College ID
 * @returns {Promise<Object>} College document
 * @throws {AppError} If college not found
 */
exports.findCollegeById = async (collegeId) => {
  const college = await College.findById(collegeId);
  
  if (!college) {
    throw new AppError('College not found', 404, 'COLLEGE_NOT_FOUND');
  }
  
  return college;
};

/**
 * Find college by email
 * @param {string} email - College email
 * @returns {Promise<Object>} College document
 * @throws {AppError} If college not found
 */
exports.findCollegeByEmail = async (email) => {
  const college = await College.findOne({ email });
  
  if (!college) {
    throw new AppError('College not found', 404, 'COLLEGE_NOT_FOUND');
  }
  
  return college;
};

/**
 * Check if college is active
 * @param {Object} college - College document
 * @returns {boolean} True if active
 */
exports.isCollegeActive = (college) => {
  return college && college.isActive === true;
};

/**
 * Get college with validation
 * @param {string} collegeCode - College code
 * @param {boolean} checkActive - Whether to check if college is active
 * @returns {Promise<Object>} College document
 */
exports.getCollegeWithValidation = async (collegeCode, checkActive = true) => {
  const college = await this.findCollegeByCode(collegeCode);
  
  if (checkActive && !this.isCollegeActive(college)) {
    throw new AppError('College is currently inactive', 403, 'COLLEGE_INACTIVE');
  }
  
  return college;
};
