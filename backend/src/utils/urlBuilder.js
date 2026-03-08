/**
 * Build a frontend URL dynamically based on environment configuration
 * @param {string} path - The path to append (e.g., '/login', '/dashboard')
 * @returns {string} Complete URL
 */
function buildFrontendUrl(path = '') {
  // Get base URL from environment variable
  const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  
  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Add path if provided (ensure it starts with /)
  const cleanPath = path && !path.startsWith('/') ? `/${path}` : path || '';
  
  return `${cleanBaseUrl}${cleanPath}`;
}

/**
 * Get the base frontend URL without any path
 * @returns {string} Base URL
 */
function getFrontendBaseUrl() {
  return process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
}

/**
 * Check if we're in production mode
 * @returns {boolean} True if production
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

module.exports = {
  buildFrontendUrl,
  getFrontendBaseUrl,
  isProduction
};
