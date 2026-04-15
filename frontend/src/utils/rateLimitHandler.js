import api from "./axios";

/**
 * API Rate Limit Handler Utility
 * Provides defensive handling for 429 errors with exponential backoff
 */

// Store backoff state per endpoint category
const backoffState = {
  global: { active: false, until: 0 },
  notifications: { active: false, until: 0 },
  data: { active: false, until: 0 },
};

/**
 * Check if an endpoint category is in backoff period
 * @param {string} category - Endpoint category ('global', 'notifications', 'data')
 * @returns {boolean} - True if in backoff
 */
export const isInBackoff = (category = 'global') => {
  const state = backoffState[category] || backoffState.global;
  return state.active && Date.now() < state.until;
};

/**
 * Get remaining backoff time in seconds
 * @param {string} category - Endpoint category
 * @returns {number} - Remaining seconds
 */
export const getBackoffRemaining = (category = 'global') => {
  const state = backoffState[category] || backoffState.global;
  if (!state.active || Date.now() >= state.until) return 0;
  return Math.ceil((state.until - Date.now()) / 1000);
};

/**
 * Set backoff for an endpoint category
 * @param {string} category - Endpoint category
 * @param {number} durationMs - Backoff duration in milliseconds
 */
export const setBackoff = (category = 'global', durationMs = 60000) => {
  backoffState[category] = {
    active: true,
    until: Date.now() + durationMs,
  };
  console.warn(`Rate limit backoff set for ${category} - ${durationMs/1000}s`);
};

/**
 * Clear backoff for an endpoint category
 * @param {string} category - Endpoint category
 */
export const clearBackoff = (category = 'global') => {
  if (backoffState[category]) {
    backoffState[category] = { active: false, until: 0 };
  }
};

/**
 * Handle API error with rate limit detection
 * @param {Error} error - Axios error
 * @param {string} category - Endpoint category
 * @param {Function} onError - Optional error callback
 * @returns {boolean} - True if error was handled (rate limit)
 */
export const handleApiError = (error, category = 'global', onError = null) => {
  if (error.response?.status === 429) {
    // Exponential backoff: start with 30s, max 5 minutes
    const backoffMs = Math.min(30000 * Math.pow(2, getRetryCount(category)), 300000);
    setBackoff(category, backoffMs);
    
    if (onError) {
      onError({
        type: 'RATE_LIMIT',
        message: 'Too many requests. Please wait before trying again.',
        backoffSeconds: Math.ceil(backoffMs / 1000),
      });
    }
    return true;
  }
  
  // Handle other errors
  if (onError && error.response) {
    onError({
      type: 'HTTP_ERROR',
      status: error.response.status,
      message: error.response.data?.message || error.message,
    });
  }
  
  return false;
};

// Track retry counts for exponential backoff
const retryCounts = {};

const getRetryCount = (category) => {
  return retryCounts[category] || 0;
};

const incrementRetryCount = (category) => {
  retryCounts[category] = (retryCounts[category] || 0) + 1;
};

const resetRetryCount = (category) => {
  retryCounts[category] = 0;
};

/**
 * Safe API call wrapper with automatic rate limit handling
 * @param {Function} apiCall - Async function that makes the API call
 * @param {string} category - Endpoint category
 * @param {Object} options - Options object
 * @param {boolean} options.silent - Don't log errors
 * @param {Function} options.onError - Error callback
 * @param {Function} options.onSuccess - Success callback
 * @returns {Promise<any>} - API response
 */
export const safeApiCall = async (apiCall, category = 'global', options = {}) => {
  const { silent = false, onError, onSuccess } = options;
  
  // Check if in backoff
  if (isInBackoff(category)) {
    const remaining = getBackoffRemaining(category);
    if (!silent) {
      console.log(`API call skipped - backoff active for ${category} (${remaining}s remaining)`);
    }
    return null;
  }
  
  try {
    const result = await apiCall();
    
    // Clear backoff on success
    clearBackoff(category);
    resetRetryCount(category);
    
    if (onSuccess) onSuccess(result);
    return result;
  } catch (error) {
    const handled = handleApiError(error, category, silent ? null : onError);
    if (handled) {
      return null;
    }
    throw error;
  }
};

/**
 * Create a rate-limit-aware API client
 */
export const rateLimitedApi = {
  /**
   * GET request with rate limit handling
   */
  get: async (url, category = 'global', options = {}) => {
    return safeApiCall(() => api.get(url), category, options);
  },
  
  /**
   * POST request with rate limit handling
   */
  post: async (url, data, category = 'global', options = {}) => {
    return safeApiCall(() => api.post(url, data), category, options);
  },
  
  /**
   * PUT request with rate limit handling
   */
  put: async (url, data, category = 'global', options = {}) => {
    return safeApiCall(() => api.put(url, data), category, options);
  },
  
  /**
   * DELETE request with rate limit handling
   */
  delete: async (url, category = 'global', options = {}) => {
    return safeApiCall(() => api.delete(url), category, options);
  },
};

export default {
  isInBackoff,
  getBackoffRemaining,
  setBackoff,
  clearBackoff,
  handleApiError,
  safeApiCall,
  rateLimitedApi,
};
