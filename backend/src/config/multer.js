const multer = require("multer");

// 2 MB limit for logo uploads
const LOGO_MAX_FILE_SIZE = 2 * 1024 * 1024;

const LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (LOGO_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG, JPG, JPEG, and WEBP formats are allowed for college logo."), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: LOGO_MAX_FILE_SIZE,
  },
});

