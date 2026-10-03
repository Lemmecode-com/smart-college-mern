import api from "./axios";

const BACKLOG_BASE_URL = "/promotion";

/**
 * Get all supplementary exams for the authenticated user's college.
 * @returns {Promise}
 */
export const getSupplementaryExams = async () => {
  const response = await api.get(`${BACKLOG_BASE_URL}/supplementary-exams`);
  return response.data;
};

/**
 * Get a single supplementary exam by ID.
 * @param {string} examId - Exam ID
 * @returns {Promise}
 */
export const getSupplementaryExamById = async (examId) => {
  const response = await api.get(`${BACKLOG_BASE_URL}/supplementary-exams/${examId}`);
  return response.data;
};

/**
 * Get eligible backlog students for a supplementary exam + subject.
 * @param {Object} params - Query parameters
 * @param {string} params.examId - Exam ID
 * @param {string} params.subjectId - Subject ID
 * @returns {Promise}
 */
export const getSupplementaryRoster = async ({ examId, subjectId }) => {
  const response = await api.get(`${BACKLOG_BASE_URL}/supplementary-roster`, {
    params: { examId, subjectId },
  });
  return response.data;
};

/**
 * Get existing marks for a supplementary exam + subject.
 * @param {Object} params - Query parameters
 * @param {string} params.examId - Exam ID
 * @param {string} params.subjectId - Subject ID
 * @returns {Promise}
 */
export const getSupplementaryMarks = async ({ examId, subjectId }) => {
  const response = await api.get(`${BACKLOG_BASE_URL}/supplementary-marks`, {
    params: { examId, subjectId },
  });
  return response.data;
};

/**
 * Save/update marks for a supplementary exam + subject.
 * @param {Object} data - Marks data
 * @param {string} data.examId - Exam ID
 * @param {string} data.subjectId - Subject ID
 * @param {Array} data.marks - Array of mark entries
 * @returns {Promise}
 */
export const saveSupplementaryMarks = async (data) => {
  const response = await api.post(`${BACKLOG_BASE_URL}/supplementary-marks`, data);
  return response.data;
};

/**
 * Evaluate a backlog attempt.
 * @param {string} backlogId - Backlog ID
 * @param {string} attemptId - Attempt ID
 * @param {Object} payload - Evaluation payload
 * @returns {Promise}
 */
export const evaluateBacklogAttempt = async (backlogId, attemptId, payload) => {
  const response = await api.post(
    `${BACKLOG_BASE_URL}/backlogs/${backlogId}/attempts/${attemptId}/evaluate`,
    payload
  );
  return response.data;
};