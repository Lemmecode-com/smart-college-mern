const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { getStorageProvider } = require("../services/storage");

const storage = multer.memoryStorage();

const allowedExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/jpg": ".jpg",
  "application/pdf": ".pdf",
};

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only JPEG, PNG and PDF are allowed."), false);
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const expectedExt = allowedExtensions[file.mimetype];

  if (ext && ext !== expectedExt) {
    return cb(new Error(`File extension ${ext} does not match content type ${file.mimetype}`), false);
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