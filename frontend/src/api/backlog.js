import api from "./axios";

const BACKLOG_BASE_URL = "/promotion";


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