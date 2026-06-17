import api from "./axios";

const PROMOTION_BASE_URL = "/promotion";
const PROMOTION_POLICY_BASE_URL = "/promotion-policy";

export const getPromotionEligibleStudents = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.course_id) {
    queryParams.append("course_id", filters.course_id);
  }
  
  if (filters.currentSemester) {
    queryParams.append("currentSemester", filters.currentSemester);
  }
  
  const response = await api.get(
    `${PROMOTION_BASE_URL}/eligible-students${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
  return response.data;
};

/**
 * Get individual student's promotion details
 * @param {string} studentId - Student ID
 * @returns {Promise}
 */
export const getStudentPromotionDetails = async (studentId) => {
  const response = await api.get(`${PROMOTION_BASE_URL}/student/${studentId}`);
  return response.data;
};

/**
 * Promote a single student to next semester
 * @param {string} studentId - Student ID
 * @param {Object} data - Promotion data (remarks, overrideFeeCheck)
 * @returns {Promise}
 */
export const promoteStudent = async (studentId, data = {}) => {
  const response = await api.post(
    `${PROMOTION_BASE_URL}/promote/${studentId}`,
    data
  );
  return response.data;
};

/**
 * Bulk promote multiple students
 * @param {Object} data - Bulk promotion data (studentIds, remarks, overrideFeeCheck)
 * @returns {Promise}
 */
export const bulkPromoteStudents = async (data) => {
  const response = await api.post(
    `${PROMOTION_BASE_URL}/bulk-promote`,
    data
  );
  return response.data;
};

/**
 * Get college promotion history
 * @param {Object} filters - Optional filters (semester, course_id, limit)
 * @returns {Promise}
 */
export const getCollegePromotionHistory = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.semester) {
    queryParams.append("semester", filters.semester);
  }
  
  if (filters.course_id) {
    queryParams.append("course_id", filters.course_id);
  }
  
  if (filters.limit) {
    queryParams.append("limit", filters.limit);
  }
  
  const response = await api.get(
    `${PROMOTION_BASE_URL}/history${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
  return response.data;
};

export const getPromotionPolicy = async () => {
  const response = await api.get(`${PROMOTION_POLICY_BASE_URL}/`);
  return response.data;
};

export const updatePromotionPolicy = async (data) => {
  const response = await api.put(`${PROMOTION_POLICY_BASE_URL}/`, data);
  return response.data;
};
