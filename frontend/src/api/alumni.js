import api from "./axios";

/**
 * Alumni API Functions
 */

const ALUMNI_BASE_URL = "/students";

/**
 * Move student to Alumni status
 * @param {string} studentId - Student ID
 * @param {Object} data - Alumni data (graduationYear)
 * @returns {Promise}
 */
export const moveToAlumni = async (studentId, data = {}) => {
  const response = await api.post(
    `${ALUMNI_BASE_URL}/${studentId}/to-alumni`,
    data
  );
  return response.data;
};

/**
 * Get all alumni
 * @param {Object} filters - Optional filters (graduationYear, course_id)
 * @returns {Promise}
 */
export const getAlumni = async (filters = {}) => {
  const queryParams = new URLSearchParams();

  if (filters.graduationYear) {
    queryParams.append("graduationYear", filters.graduationYear);
  }

  if (filters.course_id) {
    queryParams.append("course_id", filters.course_id);
  }

  const response = await api.get(
    `${ALUMNI_BASE_URL}/alumni${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
  return response.data;
};
