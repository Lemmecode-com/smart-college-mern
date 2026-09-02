/**
 * Enterprise File Format Validation Utility
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

const path = require("path");

/**
 * MIME type to extension mapping.
 * Note: "image/jpeg" maps to both "jpg" and "jpeg" — they are the same format.
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

/**
 * Reverse map: extension -> MIME type
 */
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

/**
 * Normalize an extension: lowercase, strip leading dot.
 * @param {string} ext - Extension (e.g., ".JPG", "jpg", "JPEG")
 * @returns {string} Normalized extension (e.g., "jpg")
 */
const normalizeExtension = (ext) => {
  if (!ext) return "";
  let normalized = ext.replace(/^\./, "").toLowerCase().trim();
  return normalized;
};

/**
 * Expand allowed formats to include both "jpg" and "jpeg" when either is present.
 * This implements the JPG/JPEG equivalence rule.
 *
 * @param {string[]} allowedFormats - Array of format strings (e.g., ["pdf", "jpg"])
 * @returns {string[]} Expanded array (e.g., ["pdf", "jpg", "jpeg"])
 */
const expandAllowedFormats = (allowedFormats) => {
  if (!Array.isArray(allowedFormats) || allowedFormats.length === 0) {
    return [];
  }

  const normalized = allowedFormats.map(normalizeExtension).filter(Boolean);

  const hasJpg = normalized.includes("jpg");
  const hasJpeg = normalized.includes("jpeg");

  // If either jpg or jpeg is present, include both
  if (hasJpg || hasJpeg) {
    const result = normalized.filter((f) => f !== "jpg" && f !== "jpeg");
    result.push("jpg", "jpeg");
    return result;
  }

  return normalized;
};

/**
 * Get allowed MIME types for a set of allowed formats.
 * @param {string[]} allowedFormats
 * @returns {string[]} Array of MIME types
 */
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

/**
 * Validate a file's extension against allowed formats.
 * @param {string} filename - The original filename (e.g., "report.pdf")
 * @param {string[]} allowedFormats - Allowed formats from Document Config
 * @returns {{ valid: boolean, error?: string }}
 */
const validateFileExtension = (filename, allowedFormats) => {
  const ext = normalizeExtension(path.extname(filename));
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

/**
 * Validate a file's MIME type against allowed formats.
 * @param {string} mimeType - The MIME type (e.g., "application/pdf")
 * @param {string[]} allowedFormats - Allowed formats from Document Config
 * @returns {{ valid: boolean, error?: string }}
 */
const validateMimeType = (mimeType, allowedFormats) => {
  if (!mimeType) {
    return { valid: false, error: "MIME type is missing" };
  }

  const allowedMimes = getAllowedMimeTypes(allowedFormats);
  if (!allowedMimes.includes(mimeType)) {
    return {
      valid: false,
      error: `MIME type ${mimeType} is not allowed. Allowed: ${allowedMimes.join(
        ", ",
      )}`,
    };
  }

  return { valid: true };
};

/**
 * Validate a file's extension AND MIME type against allowed formats.
 * Also cross-validates that the extension and MIME type are consistent
 * (e.g., a .pdf file should not have image/jpeg MIME type).
 * @param {string} filename - The original filename
 * @param {string} mimeType - The MIME type
 * @param {string[]} allowedFormats - Allowed formats from Document Config
 * @returns {{ valid: boolean, error?: string }}
 */
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
  const ext = normalizeExtension(path.extname(filename));
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
 * Validate an array of uploaded files against a document config.
 * Each file should have: { originalname, mimetype, fieldname }
 *
 * @param {object[]} files - Array of file objects from multer
 * @param {object[]} docConfigs - Array of document config entries (each with type, allowedFormats)
 * @param {object} fieldMap - Map of document type to field name (e.g., { "10th_marksheet": "sscMarksheet" })
 * @returns {{ valid: boolean, errors: object[] }}
 */
const validateFilesAgainstConfig = (files, docConfigs, fieldMap = {}) => {
  const errors = [];

  if (!Array.isArray(files) || files.length === 0) {
    return { valid: true, errors: [] };
  }

  // Build a reverse map: fieldName -> docConfig
  const reverseFieldMap = {};
  for (const [docType, fieldName] of Object.entries(fieldMap)) {
    reverseFieldMap[fieldName] = docType;
  }

  for (const file of files) {
    const fieldName = file.fieldname;
    let docConfig = null;

    // Try to find the doc config by field name
    for (const dc of docConfigs) {
      const mappedFieldName = fieldMap[dc.type] || dc.type;
      if (mappedFieldName === fieldName) {
        docConfig = dc;
        break;
      }
    }

    // If no specific config found for this field, try matching by type directly
    if (!docConfig) {
      docConfig = docConfigs.find((dc) => dc.type === fieldName);
    }

    if (!docConfig) {
      // No config for this field — allow it (backward compatibility for unconfigured fields)
      continue;
    }

    if (!docConfig.enabled) {
      errors.push({
        field: fieldName,
        message: `${docConfig.label || fieldName} is not enabled for upload`,
      });
      continue;
    }

    const allowedFormats = docConfig.allowedFormats || [];
    const result = validateFile(file.originalname, file.mimetype, allowedFormats);

    if (!result.valid) {
      errors.push({
        field: fieldName,
        message: result.error,
      });
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Get the broad set of MIME types that the multer fileFilter should accept
 * as a first-pass guard. This is the superset of all possible document formats.
 */
const BROAD_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

module.exports = {
  MIME_TYPE_MAP,
  EXTENSION_TO_MIME,
  BROAD_ALLOWED_MIME_TYPES,
  normalizeExtension,
  expandAllowedFormats,
  getAllowedMimeTypes,
  validateFileExtension,
  validateMimeType,
  validateFile,
  validateFilesAgainstConfig,
};
