/**
 * Teacher Service
 * 
 * Purpose:
 * - Centralize all teacher-related operations
 * - Remove duplicate teacher resolution logic
 * - Consistent error handling
 */

const Teacher = require('../models/teacher.model');
const Department = require('../models/department.model');
const AppError = require('../utils/AppError');

/**
 * Find teacher by user ID
 * @param {string} userId - User ID from JWT token
 * @param {string} collegeId - College ID
 * @returns {Promise<Object>} Teacher document
 * @throws {AppError} If teacher not found
 */
exports.findTeacherByUserId = async (userId, collegeId) => {
  const teacher = await Teacher.findOne({ 
    user_id: userId,
    college_id: collegeId 
  });
  
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404, 'TEACHER_NOT_FOUND');
  }
  
  return teacher;
};

/**
 * Find teacher by email
 * @param {string} email - Teacher email
 * @param {string} collegeId - College ID
 * @returns {Promise<Object>} Teacher document
 * @throws {AppError} If teacher not found
 */
exports.findTeacherByEmail = async (email, collegeId) => {
  const teacher = await Teacher.findOne({ 
    email,
    college_id: collegeId 
  });
  
  if (!teacher) {
    throw new AppError('Teacher not found', 404, 'TEACHER_NOT_FOUND');
  }
  
  return teacher;
};

/**
 * Find teacher by ID
 * @param {string} teacherId - Teacher ID
 * @param {string} collegeId - College ID
 * @returns {Promise<Object>} Teacher document
 * @throws {AppError} If teacher not found
 */
exports.findTeacherById = async (teacherId, collegeId) => {
  const teacher = await Teacher.findOne({ 
    _id: teacherId,
    college_id: collegeId 
  });
  
  if (!teacher) {
    throw new AppError('Teacher not found', 404, 'TEACHER_NOT_FOUND');
  }
  
  return teacher;
};

/**
 * Check if teacher is active
 * @param {Object} teacher - Teacher document
 * @returns {boolean} True if active
 */
exports.isTeacherActive = (teacher) => {
  return teacher && teacher.status === 'ACTIVE';
};

/**
 * Check if teacher is HOD of their department
 * @param {Object} teacher - Teacher document
 * @param {string} collegeId - College ID for tenant isolation
 * @returns {Promise<boolean>} True if HOD
 */
exports.isTeacherHOD = async (teacher, collegeId = null) => {
  if (!teacher || !teacher.department_id) {
    return false;
  }
  
  const query = collegeId 
    ? { _id: teacher.department_id, college_id: collegeId }
    : { _id: teacher.department_id };
  const department = await Department.findOne(query);
  return department && department.hod_id && department.hod_id.toString() === teacher._id.toString();
};

/**
 * Get teacher with validation
 * @param {string} userId - User ID from JWT token
 * @param {string} collegeId - College ID
 * @param {boolean} checkActive - Whether to check if teacher is active
 * @returns {Promise<Object>} Teacher document
 */
exports.getTeacherWithValidation = async (userId, collegeId, checkActive = true) => {
  const teacher = await this.findTeacherByUserId(userId, collegeId);
  
  if (checkActive && !this.isTeacherActive(teacher)) {
    throw new AppError('Teacher account is inactive', 403, 'TEACHER_INACTIVE');
  }
  
  return teacher;
};

/**
 * Get HOD status for teacher
 * @param {Object} teacher - Teacher document
 * @param {string} collegeId - College ID for tenant isolation
 * @returns {Promise<Object>} { isHOD: boolean, department: Object|null }
 */
exports.getHODStatus = async (teacher, collegeId = null) => {
  const isHOD = await this.isTeacherHOD(teacher, collegeId);
  
  let department = null;
  if (isHOD && teacher.department_id && collegeId) {
    department = await Department.findOne({ _id: teacher.department_id, college_id: collegeId });
  }
  
  return {
    isHOD,
    department
  };
};

/**
 * Find teachers by department
 * @param {string} departmentId - Department ID
 * @param {string} collegeId - College ID
 * @param {string} status - Filter by status (optional)
 * @returns {Promise<Array>} Array of teacher documents
 */
exports.findTeachersByDepartment = async (departmentId, collegeId, status = null) => {
  const query = {
    department_id: departmentId,
    college_id: collegeId
  };
  
  if (status) {
    query.status = status;
  }
  
  return await Teacher.find(query).populate('department_id', 'name code');
};

/**
 * Find teachers by course
 * @param {string} courseId - Course ID
 * @param {string} collegeId - College ID
 * @returns {Promise<Array>} Array of teacher documents
 */
exports.findTeachersByCourse = async (courseId, collegeId) => {
  return await Teacher.find({
    college_id: collegeId,
    courses: courseId
  }).populate('department_id', 'name code');
};
