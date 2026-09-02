const multer = require("multer");
const { BROAD_ALLOWED_MIME_TYPES } = require("../utils/fileValidation");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (BROAD_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, JPEG, PNG, DOC and DOCX allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
});
