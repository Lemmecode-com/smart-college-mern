/**
 * Enterprise File Format Validation Utility (Frontend)
 *
 * Purpose:
 * - Centralized file format validation for all upload flows.
 * - Reads allowed formats from the college's Document Configuration.
 * - Treats "jpg" and "jpeg" as equivalent image formats (same MIME type: image/jpeg).
 * - Validates both file extension AND MIME type.
 *
 * Enterprise Standard:
 *   JPG and JPEG are two extensions for the same image format.
 *   If either "jpg" or "jpeg" is in the allowedFormats configuration,
 *   both ".jpg" and ".jpeg" uploads must be accepted.
 */

const MIME_TYPE_MAP = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/jpg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
};

const EXTENSION_TO_MIME = {};
for (const [mime, exts] of Object.entries(MIME_TYPE_MAP)) {
  for (const ext of exts) {
    if (!EXTENSION_TO_MIME[ext]) {
      EXTENSION_TO_MIME[ext] = [];
    }
    if (!EXTENSION_TO_MIME[ext].includes(mime)) {
      EXTENSION_TO_MIME[ext].push(mime);
    }
  }
}

const normalizeExtension = (ext) => {
  if (!ext) return "";
  return ext.replace(/^\./, "").toLowerCase().trim();
};

const expandAllowedFormats = (allowedFormats) => {
  if (!Array.isArray(allowedFormats) || allowedFormats.length === 0) {
    return [];
  }

  const normalized = allowedFormats.map(normalizeExtension).filter(Boolean);

  const hasJpg = normalized.includes("jpg");
  const hasJpeg = normalized.includes("jpeg");

  if (hasJpg || hasJpeg) {
    const result = normalized.filter((f) => f !== "jpg" && f !== "jpeg");
    result.push("jpg", "jpeg");
    return result;
  }

  return normalized;
};

const getAllowedMimeTypes = (allowedFormats) => {
  const expanded = expandAllowedFormats(allowedFormats);
  const mimeTypes = new Set();

  for (const format of expanded) {
    const mimes = EXTENSION_TO_MIME[format];
    if (mimes) {
      mimes.forEach((m) => mimeTypes.add(m));
    }
  }

  return Array.from(mimeTypes);
};

const getFileExtension = (filename) => {
  if (!filename) return "";
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return normalizeExtension(parts.pop());
};

const validateFileExtension = (filename, allowedFormats) => {
  const ext = getFileExtension(filename);
  if (!ext) {
    return { valid: false, error: "File has no extension" };
  }

  const expanded = expandAllowedFormats(allowedFormats);
  if (!expanded.includes(ext)) {
    return {
      valid: false,
      error: `File extension .${ext} is not allowed. Allowed: ${expanded
        .map((e) => `.${e}`)
        .join(", ")}`,
    };
  }

  return { valid: true };
};

const validateMimeType = (mimeType, allowedFormats) => {
  if (!mimeType) {
    return { valid: false, error: "MIME type is missing" };
  }

  const allowedMimes = getAllowedMimeTypes(allowedFormats);
  if (!allowedMimes.includes(mimeType)) {
    return {
      valid: false,
      error: `MIME type ${mimeType} is not allowed. Allowed: ${allowedMimes.join(", ")}`,
    };
  }

  return { valid: true };
};

const validateFile = (filename, mimeType, allowedFormats) => {
  const extResult = validateFileExtension(filename, allowedFormats);
  if (!extResult.valid) {
    return extResult;
  }

  const mimeResult = validateMimeType(mimeType, allowedFormats);
  if (!mimeResult.valid) {
    return mimeResult;
  }

  // Cross-validate: ensure the extension and MIME type are consistent
  const ext = getFileExtension(filename);
  const validMimesForExt = EXTENSION_TO_MIME[ext] || [];
  if (validMimesForExt.length > 0 && !validMimesForExt.includes(mimeType)) {
    return {
      valid: false,
      error: `File extension .${ext} does not match MIME type ${mimeType}. Expected: ${validMimesForExt.join(", ")}`,
    };
  }

  return { valid: true };
};

/**
 * Generate the accept attribute string for a file input element.
 * Expands JPG/JPEG equivalence: if either is configured, both are included.
 * @param {string[]} allowedFormats - Allowed formats from Document Config
 * @returns {string} Accept attribute value (e.g., ".pdf,.jpg,.jpeg,.png")
 */
const getAcceptAttribute = (allowedFormats) => {
  const expanded = expandAllowedFormats(allowedFormats);
  return expanded.map((f) => `.${f}`).join(",");
};

/**
 * Validate a file object (with name and type properties) against allowed formats.
 * @param {File} file - File object from input element
 * @param {string[]} allowedFormats - Allowed formats from Document Config
 * @returns {{ valid: boolean, error?: string }}
 */
const validateFileObject = (file, allowedFormats) => {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }
  return validateFile(file.name, file.type, allowedFormats);
};

export {
  MIME_TYPE_MAP,
  EXTENSION_TO_MIME,
  normalizeExtension,
  expandAllowedFormats,
  getAllowedMimeTypes,
  getFileExtension,
  validateFileExtension,
  validateMimeType,
  validateFile,
  validateFileObject,
  getAcceptAttribute,
};
