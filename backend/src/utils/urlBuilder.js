const { validateFrontendUrlString } = require("./validateUrlConfig");

/**
 * Check if we're in production mode
 * @returns {boolean} True if production
 */
function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Get the base frontend URL without any path, validated for production
 * @returns {string} Base URL
 */
function getFrontendBaseUrl() {
  const url = process.env.FRONTEND_URL || process.env.CLIENT_URL;
  if (!url || typeof url !== "string" || !url.trim()) {
    throw new Error(
      "FRONTEND_URL or CLIENT_URL environment variable is required. " +
        "Set it to your production domain (e.g., https://yourdomain.com)",
    );
  }

  // Remove trailing slashes and trim whitespace
  const cleanBaseUrl = url.trim().replace(/\/+$/, "");

  // Enforce HTTPS and reject localhost/loopback in production
  validateFrontendUrlString(cleanBaseUrl, isProduction());

  return cleanBaseUrl;
}

/**
 * Build a frontend URL dynamically based on environment configuration
 * @param {string} path - The path to append (e.g., '/login', '/dashboard')
 * @returns {string} Complete URL
 */
function buildFrontendUrl(path = "") {
  const baseUrl = getFrontendBaseUrl();

  if (!path) {
    return baseUrl;
  }

  // Add path if provided (ensure it starts with /)
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
}

module.exports = {
  buildFrontendUrl,
  getFrontendBaseUrl,
  isProduction,
};
