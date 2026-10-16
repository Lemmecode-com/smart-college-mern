/**
 * Validate Production Frontend URL and CORS Configuration on Startup
 * 
 * Ensures FRONTEND_URL (or CLIENT_URL) and CORS_ORIGINS are properly
 * configured with secure HTTPS domains and prevents localhost / loopback
 * fallback URLs from becoming active in production environments.
 */

/**
 * Check if a given hostname represents localhost or loopback address
 * @param {string} hostname 
 * @returns {boolean}
 */
function isLoopbackOrLocalhost(hostname) {
  if (!hostname || typeof hostname !== "string") return false;
  const host = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost")) {
    return true;
  }
  if (host === "127.0.0.1" || host.startsWith("127.")) {
    return true;
  }
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") {
    return true;
  }
  if (host === "0.0.0.0" || host === "::" || host === "0:0:0:0:0:0:0:0") {
    return true;
  }

  // IPv4-mapped IPv6 loopback (127.0.0.0/8) and unspecified (0.0.0.0)
  // Handles dotted-decimal (::ffff:127.x.x.x) and hex-canonical (::ffff:7fxx:xxxx)
  const ipv4Mapped = host.replace(/^(0:)+ffff:/, "::ffff:");
  if (
    ipv4Mapped.startsWith("::ffff:127.") ||
    ipv4Mapped.startsWith("ffff:127.") ||
    /^::ffff:7f[0-9a-f]{2}:/i.test(ipv4Mapped) ||
    /^ffff:7f[0-9a-f]{2}:/i.test(ipv4Mapped) ||
    ipv4Mapped === "::ffff:0.0.0.0" ||
    ipv4Mapped === "::ffff:0:0" ||
    ipv4Mapped === "ffff:0:0"
  ) {
    return true;
  }

  return false;
}

/**
 * Validate a frontend URL string
 * @param {string} urlString 
 * @param {boolean} isProduction 
 * @returns {URL}
 */
function validateFrontendUrlString(urlString, isProduction = false) {
  if (!urlString || typeof urlString !== "string" || !urlString.trim()) {
    throw new Error(
      "FRONTEND_URL or CLIENT_URL environment variable is required. " +
      "Set it to your production domain (e.g., https://yourdomain.com)"
    );
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch (err) {
    throw new Error(`Invalid URL format for FRONTEND_URL: "${urlString}"`);
  }

  if (isProduction) {
    if (parsed.protocol !== "https:") {
      throw new Error(
        `Production FRONTEND_URL must use HTTPS protocol. Received: "${parsed.protocol}"`
      );
    }
    if (isLoopbackOrLocalhost(parsed.hostname)) {
      throw new Error(
        `Production FRONTEND_URL cannot point to localhost or loopback address: "${parsed.hostname}"`
      );
    }
  }

  return parsed;
}

/**
 * Validate CORS origins configuration string
 * @param {string} originsString 
 * @param {boolean} isProduction 
 * @returns {string[]}
 */
function validateCorsOriginsString(originsString, isProduction = false) {
  if (!originsString || typeof originsString !== "string" || !originsString.trim()) {
    if (isProduction) {
      throw new Error("CORS_ORIGINS environment variable is required in production.");
    }
    return [];
  }

  const origins = originsString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (origins.length === 0 && isProduction) {
    throw new Error("CORS_ORIGINS must contain at least one valid origin in production.");
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch (err) {
      throw new Error(`Invalid CORS origin format: "${origin}"`);
    }

    if (isProduction) {
      if (parsed.protocol !== "https:") {
        throw new Error(
          `Production CORS origins must use HTTPS protocol. Insecure origin: "${origin}"`
        );
      }
      if (isLoopbackOrLocalhost(parsed.hostname)) {
        throw new Error(
          `Production CORS origins cannot contain localhost or loopback addresses: "${origin}"`
        );
      }
    }
  }

  return origins;
}

/**
 * Startup validation function called during server boot
 * @param {object} env - Environment object (defaults to process.env)
 * @param {boolean} exitOnError - Whether to call process.exit(1) on validation failure
 * @returns {object}
 */
function validateUrlConfig(env = process.env, exitOnError = true) {
  const isProd = env.NODE_ENV === "production";

  if (!isProd) {
    // In development or test, localhost is permitted
    return { isValid: true, isProduction: false };
  }

  console.log("🌐 Validating frontend URL and CORS configuration for production...");

  try {
    const rawFrontendUrl = env.FRONTEND_URL || env.CLIENT_URL;
    validateFrontendUrlString(rawFrontendUrl, true);
    console.log("   ✅ Production FRONTEND_URL is valid HTTPS");

    const rawCors = env.CORS_ORIGINS;
    validateCorsOriginsString(rawCors, true);
    console.log("   ✅ Production CORS_ORIGINS validated (no localhost/HTTP origins)");
    console.log("   ✅ URL and CORS configuration is valid\n");

    return { isValid: true, isProduction: true };
  } catch (error) {
    console.error("   ❌ ERROR in URL/CORS configuration:", error.message);
    console.error("\n💡 SOLUTION for Production:");
    console.error("   Ensure your production .env defines valid HTTPS domains:");
    console.error("   FRONTEND_URL=https://your-production-domain.edu");
    console.error("   CORS_ORIGINS=https://your-production-domain.edu,https://admin.your-production-domain.edu\n");

    if (exitOnError) {
      process.exit(1);
    }
    throw error;
  }
}

module.exports = validateUrlConfig;
module.exports.validateUrlConfig = validateUrlConfig;
module.exports.validateFrontendUrlString = validateFrontendUrlString;
module.exports.validateCorsOriginsString = validateCorsOriginsString;
module.exports.isLoopbackOrLocalhost = isLoopbackOrLocalhost;
