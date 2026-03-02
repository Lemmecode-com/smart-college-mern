/**
 * Custom Validators for Smart College MERN
 * 
 * Purpose:
 * - Centralized validation logic for all models
 * - Consistent error messages
 * - Easy to maintain and update
 */

/**
 * 1. Email Validator
 * Validates standard email format
 */
exports.validateEmail = (email) => {
  if (!email) return true; // Let required handle empty values
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

exports.emailValidatorMessage = 'Please provide a valid email address';

/**
 * 2. Indian Mobile Number Validator
 * Validates 10-digit Indian mobile numbers (must start with 6-9)
 */
exports.validateIndianMobile = (mobile) => {
  if (!mobile) return true; // Let required handle empty values
  const regex = /^[6-9]\d{9}$/;
  return regex.test(mobile);
};

exports.mobileValidatorMessage = 'Please provide a valid 10-digit Indian mobile number (must start with 6-9)';

/**
 * 3. Indian Pincode Validator
 * Validates 6-digit Indian pincode
 */
exports.validateIndianPincode = (pincode) => {
  if (!pincode) return true; // Let required handle empty values
  const regex = /^\d{6}$/;
  return regex.test(pincode);
};

exports.pincodeValidatorMessage = 'Please provide a valid 6-digit Indian pincode';

/**
 * 4. Percentage Validator
 * Validates percentage is between 0 and 100
 */
exports.validatePercentage = (percentage) => {
  if (percentage === null || percentage === undefined) return true; // Let required handle empty values
  return percentage >= 0 && percentage <= 100;
};

exports.percentageValidatorMessage = 'Percentage must be between 0 and 100';

/**
 * 5. Age/Date of Birth Validator
 * Validates age is within acceptable range (default: 14-100 years)
 */
exports.validateAge = (dateOfBirth, minAge = 14, maxAge = 100) => {
  if (!dateOfBirth) return true; // Let required handle empty values
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  // Check if date is valid
  if (isNaN(birthDate.getTime())) {
    return false;
  }
  
  // Check if date is in future
  if (birthDate > today) {
    return false;
  }
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= minAge && age <= maxAge;
};

exports.ageValidatorMessage = (minAge = 14, maxAge = 100) => 
  `Age must be between ${minAge} and ${maxAge} years`;

/**
 * 6. Admission Year Validator
 * Validates admission year is within reasonable range
 * (current year - 5 to current year + 1)
 */
exports.validateAdmissionYear = (year) => {
  if (!year) return true; // Let required handle empty values
  const currentYear = new Date().getFullYear();
  return year >= currentYear - 5 && year <= currentYear + 1;
};

exports.admissionYearValidatorMessage = () => {
  const currentYear = new Date().getFullYear();
  return `Admission year must be between ${currentYear - 5} and ${currentYear + 1}`;
};

/**
 * 7. Year Validator (generic)
 * Validates a year is reasonable (1900 to current year + 5)
 */
exports.validateYear = (year, minYear = 1900, maxYearOffset = 5) => {
  if (!year) return true;
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + maxYearOffset;
  return year >= minYear && year <= maxYear;
};

exports.yearValidatorMessage = (minYear = 1900, maxYearOffset = 5) => {
  const currentYear = new Date().getFullYear();
  return `Year must be between ${minYear} and ${currentYear + maxYearOffset}`;
};
