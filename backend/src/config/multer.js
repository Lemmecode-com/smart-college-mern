const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/college-logos");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `college-${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, JPEG, PNG allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter
});
