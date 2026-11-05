const path = require("path");
const sharp = require("sharp");
const AppError = require("./AppError");

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/**
 * Validates and resizes a college logo image.
 * - Resizes to max 256x256 (fit: inside, no upscaling)
 * - Converts to WebP while preserving transparency
 * - Target output size: <= 50 KB
 *
 * @param {Buffer} buffer - Raw file buffer from multer
 * @param {string} originalName - Original uploaded filename
 * @param {string} mimeType - Uploaded mime type
 * @returns {Promise<{ buffer: Buffer, originalName: string, mimeType: string, size: number }>}
 */
async function processCollegeLogo(buffer, originalName = "logo.png", mimeType = "image/png") {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError("No image data provided for logo processing", 400, "EMPTY_LOGO_BUFFER");
  }

  const ext = path.extname(originalName).toLowerCase();
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType.toLowerCase()) && !ALLOWED_EXTENSIONS.has(ext)) {
    throw new AppError(
      "Invalid logo format. Only PNG, JPG, JPEG, and WEBP formats are allowed.",
      400,
      "INVALID_LOGO_FORMAT"
    );
  }

  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err) {
    throw new AppError(
      "Failed to read image data. The file appears to be corrupted or is not a valid image.",
      422,
      "CORRUPT_LOGO_IMAGE"
    );
  }

  const validFormats = ["png", "jpeg", "jpg", "webp"];
  if (!metadata || !metadata.format || !validFormats.includes(metadata.format)) {
    throw new AppError(
      "Unsupported image format. Only PNG, JPG, JPEG, and WEBP images are supported.",
      422,
      "UNSUPPORTED_LOGO_FORMAT"
    );
  }

  try {
    const resizedBuffer = await sharp(buffer)
      .resize({
        width: 256,
        height: 256,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 85,
        alphaQuality: 90,
      })
      .toBuffer();

    const baseName = path.basename(originalName, path.extname(originalName)) || "logo";
    const newFileName = `${baseName}.webp`;

    return {
      buffer: resizedBuffer,
      originalName: newFileName,
      mimeType: "image/webp",
      size: resizedBuffer.length,
    };
  } catch (err) {
    throw new AppError(
      `Logo optimization failed: ${err.message}`,
      422,
      "LOGO_OPTIMIZATION_FAILED"
    );
  }
}

module.exports = {
  processCollegeLogo,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
};
