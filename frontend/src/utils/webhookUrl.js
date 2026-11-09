/**
 * Webhook URL utility
 * Handles URL building and localhost/insecure environment detection
 * for payment gateway webhooks (e.g., Razorpay, Stripe).
 */

export const WEBHOOK_LOCALHOST_WARNING_MESSAGE =
  "Razorpay cannot reach localhost. Use a public HTTPS URL, for example an ngrok URL for testing";

/**
 * Builds a clean, fully-qualified public webhook URL from configuration.
 * Result: `<public base URL>/api/<gateway>/webhook`
 * Rules:
 * - Strips trailing slashes from base URL
 * - Avoids duplicate '/api' segments
 * - Removes duplicate slashes (preserving protocol '://')
 *
 * @param {string} [baseUrl] - Base URL (falls back to import.meta.env.VITE_API_BASE_URL)
 * @param {string} [gateway='razorpay'] - Payment gateway identifier
 * @returns {string} The normalized webhook URL
 */
export function buildWebhookUrl(baseUrl, gateway = "razorpay") {
  let raw = (baseUrl || "").trim();

  // If no base URL passed, fall back to frontend env variable
  if (!raw) {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
      raw = import.meta.env.VITE_API_BASE_URL.trim();
    }
  }

  // If relative path starting with '/', resolve with browser window.location.origin
  if (raw.startsWith("/") && typeof window !== "undefined" && window.location?.origin) {
    raw = `${window.location.origin}${raw}`;
  }

  // If still empty, fall back to window.location.origin or relative path
  if (!raw) {
    if (typeof window !== "undefined" && window.location?.origin) {
      raw = window.location.origin;
    } else {
      return `/api/${gateway}/webhook`;
    }
  }

  // Strip trailing slashes
  raw = raw.replace(/\/+$/, "");

  // If the provided URL is already a full webhook URL for this gateway, normalize slashes and return
  if (raw.endsWith(`/api/${gateway}/webhook`)) {
    return raw.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/, "");
  }

  // Normalize duplicate slashes before checking suffix
  raw = raw.replace(/([^:]\/)\/+/g, "$1");

  // If base ends with /api, remove it so we don't end up with /api/api/...
  if (raw.endsWith("/api")) {
    raw = raw.slice(0, -4);
  }
  raw = raw.replace(/\/+$/, "");

  const combined = `${raw}/api/${gateway}/webhook`;
  return combined.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/, "");
}

/**
 * Checks whether a given webhook URL points to localhost/loopback or is not HTTPS.
 * Razorpay webhooks cannot reach localhost or insecure HTTP endpoints in live/remote setups.
 *
 * @param {string} url - The webhook URL to inspect
 * @returns {boolean} True if URL is localhost, loopback, or not HTTPS
 */
export function isInsecureOrLocalWebhookUrl(url) {
  if (!url || typeof url !== "string" || !url.trim()) {
    return true;
  }

  try {
    // If URL is relative, use http://localhost as base
    const base = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";
    const parsed = new URL(url.trim(), base);

    // Protocol check: must be HTTPS
    if (parsed.protocol.toLowerCase() !== "https:") {
      return true;
    }

    // Hostname check: cannot be localhost or loopback
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host.startsWith("127.") ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "0:0:0:0:0:0:0:1" ||
      host.endsWith(".local")
    ) {
      return true;
    }

    // IPv4-mapped IPv6 loopback (::ffff:127.x.x.x)
    const ipv4Mapped = host.replace(/^(0:)+ffff:/, "::ffff:");
    if (
      ipv4Mapped.startsWith("::ffff:127.") ||
      ipv4Mapped.startsWith("ffff:127.") ||
      ipv4Mapped === "::ffff:0.0.0.0"
    ) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}
