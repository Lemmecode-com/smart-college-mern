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
 * Get promotion eligibility for a student (creates/reuses PromotionDecision)
 * @param {string} studentId - Student ID
 * @returns {Promise}
 */
export const getPromotionEligibility = async (studentId) => {
  const response = await api.get(`${PROMOTION_BASE_URL}/eligibility/${studentId}`);
  return response.data;
};

/**
 * Get student backlogs with optional status filter
 * @param {string} studentId - Student ID
 * @param {string} status - Optional status filter
 * @returns {Promise}
 */
export const getStudentBacklogs = async (studentId, status) => {
  const queryParams = new URLSearchParams();
  if (status) {
    queryParams.append("status", status);
  }
  const response = await api.get(
    `${PROMOTION_BASE_URL}/backlogs/${studentId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
  return response.data;
};

/**
 * Recommend a promotion decision
 * @param {string} decisionId - Decision ID
 * @param {string} comment - Optional comment
 * @returns {Promise}
 */
export const recommendPromotionDecision = async (decisionId, comment) => {
  const response = await api.post(
    `${PROMOTION_BASE_URL}/decisions/${decisionId}/recommend`,
    { comment }
  );
  return response.data;
};

/**
 * Approve a promotion decision
 * @param {string} decisionId - Decision ID
 * @param {string} comment - Optional comment
 * @returns {Promise}
 */
export const approvePromotionDecision = async (decisionId, comment) => {
  const response = await api.post(
    `${PROMOTION_BASE_URL}/decisions/${decisionId}/approve`,
    { comment }
  );
  return response.data;
};

/**
 * Reject a promotion decision
 * @param {string} decisionId - Decision ID
 * @param {string} reason - Required non-empty reason
 * @returns {Promise}
 */
export const rejectPromotionDecision = async (decisionId, reason) => {
  const response = await api.post(
    `${PROMOTION_BASE_URL}/decisions/${decisionId}/reject`,
    { reason }
  );
  return response.data;
};

/**
 * Execute a promotion decision
 * @param {string} decisionId - Decision ID
 * @returns {Promise}
 */
export const executePromotionDecision = async (decisionId) => {
  const response = await api.post(
    `${PROMOTION_BASE_URL}/decisions/${decisionId}/execute`
  );
  return response.data;
};

/**
 * Get backlog attempts for a backlog
 * @param {string} backlogId - Backlog ID
 * @returns {Promise}
 */
export const getBacklogAttempts = async (backlogId) => {
  const response = await api.get(`${PROMOTION_BASE_URL}/backlogs/${backlogId}/attempts`);
  return response.data;
};

/**
 * Create a backlog attempt (creates supplementary exam)
 * @param {string} backlogId - Backlog ID
 * @param {Object} payload - Attempt payload
 * @returns {Promise}
 */
export const createBacklogAttempt = async (backlogId, payload) => {
  const response = await api.post(
    `${PROMOTION_BASE_URL}/backlogs/${backlogId}/attempts`,
    payload
  );
  return response.data;
};

/**
 * Evaluate a backlog attempt
 * @param {string} backlogId - Backlog ID
 * @param {string} attemptId - Attempt ID
 * @param {Object} payload - Evaluation payload
 * @returns {Promise}
 */
export const evaluateBacklogAttempt = async (backlogId, attemptId, payload) => {
  const response = await api.post(
    `${PROMOTION_BASE_URL}/backlogs/${backlogId}/attempts/${attemptId}/evaluate`,
    payload
  );
  return response.data;
};

/**
 * Promote a single student to next semester (LEGACY)
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
 * Bulk promote multiple students (LEGACY)
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
