/**
 * Build a frontend URL dynamically based on environment configuration
 * @param {string} path - The path to append (e.g., '/login', '/dashboard')
 * @returns {string} Complete URL
 */
function buildFrontendUrl(path = "") {
  const baseUrl = getFrontendBaseUrl();

  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  // Add path if provided (ensure it starts with /)
  const cleanPath = path && !path.startsWith("/") ? `/${path}` : path || "";

  return `${cleanBaseUrl}${cleanPath}`;
}

/**
 * Get the base frontend URL without any path
 * @returns {string} Base URL
 */
function getFrontendBaseUrl() {
  const url = process.env.FRONTEND_URL || process.env.CLIENT_URL;
  if (!url) {
    throw new Error(
      "FRONTEND_URL or CLIENT_URL environment variable is required. " +
        "Set it to your production domain (e.g., https://yourdomain.com)",
    );
  }
  return url;
}

/**
 * Check if we're in production mode
 * @returns {boolean} True if production
 */
function isProduction() {
  return process.env.NODE_ENV === "production";
}

module.exports = {
  buildFrontendUrl,
  getFrontendBaseUrl,
  isProduction,
};
