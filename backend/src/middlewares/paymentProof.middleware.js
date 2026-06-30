const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Create payment-proofs uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads/payment-proofs");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file extensions mapping
const allowedExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/jpg": ".jpg",
  "application/pdf": ".pdf"
};

// Storage configuration for payment proof documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const randomString = crypto.randomBytes(16).toString('hex');
    const ext = allowedExtensions[file.mimetype] || '.bin';
    const fieldName = file.fieldname.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    cb(null, `${fieldName}-${Date.now()}-${randomString}${ext}`);
  }
});

// File filter - only allow images and PDFs with double validation
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf"
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

// Single-file upload middleware for payment proof
const uploadPaymentProof = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

module.exports = {
  uploadPaymentProof
};
