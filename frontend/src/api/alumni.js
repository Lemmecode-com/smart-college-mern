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

const ALUMNI_SETTINGS_BASE_URL = "/alumni";

/**
 * Get active Alumni Settings (course-specific or college fallback)
 * @param {string} [courseId] - Optional course ID
 * @returns {Promise}
 */
export const getAlumniSettings = async (courseId) => {
  const queryParams = new URLSearchParams();
  if (courseId) {
    queryParams.append("course_id", courseId);
  }
  const response = await api.get(
    `${ALUMNI_SETTINGS_BASE_URL}/settings${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
  return response.data;
};

/**
 * Create or update Alumni Settings
 * @param {Object} data - Alumni policy configuration payload
 * @returns {Promise}
 */
export const updateAlumniSettings = async (data) => {
  const response = await api.put(`${ALUMNI_SETTINGS_BASE_URL}/settings`, data);
  return response.data;
};

/**
 * Get Alumni Eligibility for a student
 * @param {string} studentId - Student ID
 * @returns {Promise}
 */
export const getAlumniEligibility = async (studentId) => {
  const response = await api.get(
    `${ALUMNI_SETTINGS_BASE_URL}/eligibility/${studentId}`
  );
  return response.data;
};
