/**
 * In-memory cache for Student Dashboard data.
 * Structure: { key, data, time }
 * Key: user.id (the logged-in user)
 * TTL: 45 seconds
 *
 * Never uses sessionStorage or localStorage to prevent storing sensitive student data on disk.
 */

const TTL_MS = 45 * 1000; // 45 seconds

let cache = {
  key: null,
  data: null,
  time: null,
};

/**
 * Get cached dashboard data for a specific user.
 * Returns data if cache is valid and not expired; otherwise returns null.
 *
 * @param {string} userId - The user ID of the logged-in student
 * @returns {object|null}
 */
export const getStudentDashboardCache = (userId) => {
  if (!userId) return null;
  if (cache.key === userId && cache.data && cache.time) {
    const isExpired = Date.now() - cache.time > TTL_MS;
    if (!isExpired) {
      return cache.data;
    }
    // Expired - clear stale entry
    clearStudentDashboardCache();
  }
  return null;
};

/**
 * Store dashboard data in cache for a specific user.
 *
 * @param {string} userId - The user ID of the logged-in student
 * @param {object} data - The dashboard response data
 */
export const setStudentDashboardCache = (userId, data) => {
  // Only cache complete data: student must exist and feeSummary must not be null/undefined
  if (
    !userId ||
    !data ||
    !data.student ||
    data.feeSummary === null ||
    data.feeSummary === undefined
  ) {
    return;
  }
  cache = {
    key: userId,
    data,
    time: Date.now(),
  };
};

/**
 * Clear the in-memory cache.
 */
export const clearStudentDashboardCache = () => {
  cache = {
    key: null,
    data: null,
    time: null,
  };
};

export const get = getStudentDashboardCache;
export const set = setStudentDashboardCache;
export const clear = clearStudentDashboardCache;

const studentDashboardCache = {
  get: getStudentDashboardCache,
  set: setStudentDashboardCache,
  clear: clearStudentDashboardCache,
};

export default studentDashboardCache;
