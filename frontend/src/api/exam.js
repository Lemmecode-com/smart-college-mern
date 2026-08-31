import api from "./axios";

const EXAM_BASE_URL = "/exam";

/**
 * Get all exams for the authenticated user's college
 * @returns {Promise}
 */
export const getExams = async () => {
  const response = await api.get(EXAM_BASE_URL);
  return response.data;
};

/**
 * Get a single exam by ID
 * @param {string} examId - Exam ID
 * @returns {Promise}
 */
export const getExamById = async (examId) => {
  const response = await api.get(`${EXAM_BASE_URL}/${examId}`);
  return response.data;
};

/**
 * Create a new exam
 * @param {Object} data - Exam data
 * @param {string} data.name - Exam name
 * @param {string} data.course_id - Course ID
 * @param {number} data.semester - Semester number
 * @param {string} data.academicYear - Academic year
 * @param {string[]} data.subjects - Array of subject IDs
 * @returns {Promise}
 */
export const createExam = async (data) => {
  const response = await api.post(EXAM_BASE_URL, data);
  return response.data;
};

/**
 * Update an existing exam
 * @param {string} examId - Exam ID
 * @param {Object} data - Updated exam data
 * @returns {Promise}
 */
export const updateExam = async (examId, data) => {
  const response = await api.put(`${EXAM_BASE_URL}/${examId}`, data);
  return response.data;
};
