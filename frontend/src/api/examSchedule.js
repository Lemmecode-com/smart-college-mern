import api from "./axios";

const SCHEDULE_BASE_URL = "/exam-schedule";

/**
 * Create a new exam schedule (DRAFT) for the given exam.
 * @param {string} examId - Exam ID
 * @param {Object} [payload] - Optional initial schedule body
 * @param {Array}  [payload.subjects] - Initial subjects array (may be empty for DRAFT)
 * @returns {Promise}
 */
export const createExamSchedule = async (examId, payload = {}) => {
  const response = await api.post(SCHEDULE_BASE_URL, {
    exam_id: examId,
    ...payload,
  });
  return response.data;
};

/**
 * Fetch the exam schedule for the given exam.
 * @param {string} examId - Exam ID
 * @returns {Promise}
 */
export const getExamSchedule = async (examId) => {
  const response = await api.get(`${SCHEDULE_BASE_URL}/${examId}`);
  return response.data;
};

/**
 * Update an exam schedule (DRAFT only). Sends the full subjects array.
 * @param {string} examId - Exam ID
 * @param {Object} payload - Updated schedule body
 * @param {Array}  payload.subjects - Array of scheduled subject entries
 * @returns {Promise}
 */
export const updateExamSchedule = async (examId, payload) => {
  const response = await api.put(`${SCHEDULE_BASE_URL}/${examId}`, payload);
  return response.data;
};

/**
 * Publish the exam schedule (DRAFT -> PUBLISHED).
 * @param {string} examId - Exam ID
 * @returns {Promise}
 */
export const publishExamSchedule = async (examId) => {
  const response = await api.post(`${SCHEDULE_BASE_URL}/${examId}/publish`);
  return response.data;
};