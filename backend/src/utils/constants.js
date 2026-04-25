/**
 * STATUS CONSTANTS
 *
 * Purpose:
 * - Standardize status values across all models
 * - Make filtering and querying consistent
 * - Easy to maintain and update
 */

// ==================== ENTITY STATUS ====================

/**
 * General entity status (for Department, Course, Subject, etc.)
 */
exports.ENTITY_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

/**
 * Student admission status
 */
exports.STUDENT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  DELETED: "DELETED",
  ALUMNI: "ALUMNI",
  DEACTIVATED: "DEACTIVATED",
};

/**
 * Teacher employment status
 */
exports.TEACHER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

/**
 * Timetable publication status
 */
exports.TIMETABLE_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
};

/**
 * Attendance session status
 */
exports.ATTENDANCE_SESSION_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
};

/**
 * Payment installment status
 */
exports.PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
};

// ==================== CATEGORY ====================

/**
 * Student category
 */
exports.CATEGORY = {
  GEN: "GEN",
  OBC: "OBC",
  SC: "SC",
  ST: "ST",
  OTHER: "OTHER",
};

/**
 * Gender options
 */
exports.GENDER = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

// ==================== ACADEMIC ====================

/**
 * Program levels
 */
exports.PROGRAM_LEVEL = {
  UG: "UG", // Undergraduate
  PG: "PG", // Postgraduate
  DIPLOMA: "DIPLOMA",
  PHD: "PHD",
};

/**
 * Course types
 */
exports.COURSE_TYPE = {
  THEORY: "THEORY",
  PRACTICAL: "PRACTICAL",
  BOTH: "BOTH",
};

/**
 * Department types
 */
exports.DEPARTMENT_TYPE = {
  ACADEMIC: "ACADEMIC",
  ADMINISTRATIVE: "ADMINISTRATIVE",
};

// ==================== NOTIFICATION ====================

/**
 * Notification target audience
 */
exports.NOTIFICATION_TARGET = {
  ALL: "ALL",
  STUDENTS: "STUDENTS",
  TEACHERS: "TEACHERS",
  CUSTOM: "CUSTOM",
};

/**
 * Notification types
 */
exports.NOTIFICATION_TYPE = {
  GENERAL: "GENERAL",
  ACADEMIC: "ACADEMIC",
  EXAM: "EXAM",
  FEE: "FEE",
  ATTENDANCE: "ATTENDANCE",
  EVENT: "EVENT",
  ASSIGNMENT: "ASSIGNMENT",
  URGENT: "URGENT",
};

// ==================== ROLE ====================

/**
 * User roles
 */
exports.ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  COLLEGE_ADMIN: "COLLEGE_ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  HOD: "HOD",
  PRINCIPAL: "PRINCIPAL",
  ACCOUNTANT: "ACCOUNTANT",
  ADMISSION_OFFICER: "ADMISSION_OFFICER",
  EXAM_COORDINATOR: "EXAM_COORDINATOR",
  PARENT_GUARDIAN: "PARENT_GUARDIAN",
  PLATFORM_SUPPORT: "PLATFORM_SUPPORT",
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get all status values for a category
 * @param {string} category - Status category (e.g., 'STUDENT_STATUS')
 * @returns {string[]} Array of status values
 */
exports.getStatusValues = (category) => {
  return Object.values(exports[category]) || [];
};

/**
 * Check if a status is valid for a category
 * @param {string} category - Status category
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
exports.isValidStatus = (category, status) => {
  const statuses = exports.getStatusValues(category);
  return statuses.includes(status);
};
