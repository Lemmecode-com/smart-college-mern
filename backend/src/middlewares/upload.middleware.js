const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads/students");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file extensions mapping (arrays to accept variant extensions like .jpg/.jpeg)
const allowedExtensions = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/jpg": [".jpg", ".jpeg"],
  "application/pdf": [".pdf"],
};

// Storage configuration for student documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // 🔒 SECURITY: Generate completely random filename
    // Don't use original filename to prevent path traversal attacks
    const randomString = crypto.randomBytes(16).toString('hex');
    const ext = (allowedExtensions[file.mimetype] || [".bin"])[0];
    const fieldName = file.fieldname.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    
    // Format: fieldname-timestamp-randomstring.ext
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

  // 🔒 SECURITY: Validate MIME type
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only JPEG, PNG and PDF are allowed."), false);
  }

  // 🔒 SECURITY: Validate file extension is among the allowed variants for its MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = allowedExtensions[file.mimetype];

  if (ext && allowedExts && !allowedExts.includes(ext)) {
    return cb(
      new Error(
        `File type not allowed for ${file.fieldname}. Allowed: ${allowedExts.join(", ")}`,
      ),
      false,
    );
  }

  cb(null, true);
};

// Upload middleware configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Middleware for handling student registration document uploads.
// Uses upload.any() so documents configured by the college admin (which may
// use custom `type` values not present in a fixed field allowlist) are
// accepted. `any()` returns req.files as an ARRAY; we normalize it back into
// the object-keyed shape ({ fieldname: [file, ...] }) that the student
// controller already expects, so no controller changes are required.
const uploadStudentDocuments = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return next(err);

    if (Array.isArray(req.files)) {
      const normalized = {};
      for (const file of req.files) {
        if (!normalized[file.fieldname]) normalized[file.fieldname] = [];
        normalized[file.fieldname].push(file);
      }
      req.files = normalized;
    }

    next();
  });
};

module.exports = {
  upload,
  uploadStudentDocuments
};