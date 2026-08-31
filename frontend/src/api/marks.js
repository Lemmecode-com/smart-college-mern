import api from "./axios";

const MARKS_BASE_URL = "/marks";

/**
 * Get student roster for marks entry
 * @param {Object} params - Query parameters
 * @param {string} params.examId - Exam ID
 * @param {string} params.subjectId - Subject ID
 * @returns {Promise}
 */
export const getStudentRoster = async ({ examId, subjectId }) => {
  const response = await api.get(MARKS_BASE_URL, {
    params: { examId, subjectId },
  });
  return response.data;
};

/**
 * Get existing marks for an exam subject
 * @param {Object} params - Query parameters
 * @param {string} params.examId - Exam ID
 * @param {string} params.subjectId - Subject ID
 * @returns {Promise}
 */
export const getMarks = async ({ examId, subjectId }) => {
  const response = await api.get(MARKS_BASE_URL, {
    params: { examId, subjectId },
  });
  return response.data;
};

/**
 * Bulk save/update marks
 * @param {Object} data - Marks data
 * @param {string} data.examId - Exam ID
 * @param {string} data.subjectId - Subject ID
 * @param {Array} data.marks - Array of mark entries
 * @returns {Promise}
 */
export const saveMarks = async (data) => {
  const response = await api.post(`${MARKS_BASE_URL}/bulk`, data);
  return response.data;
};
