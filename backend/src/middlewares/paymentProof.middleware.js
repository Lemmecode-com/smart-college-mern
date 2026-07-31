const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { getStorageProvider } = require("../services/storage");
const {
  BROAD_ALLOWED_MIME_TYPES,
  normalizeExtension,
} = require("../utils/fileValidation");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!BROAD_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Only PDF, JPG, JPEG, PNG, DOC and DOCX are allowed."),
      false,
    );
  }

  cb(null, true);
};

const uploadPaymentProof = multer({
  storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadPaymentProof,
};
