const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads/students");
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

// Storage configuration for student documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // 🔒 SECURITY: Generate completely random filename
    // Don't use original filename to prevent path traversal attacks
    const randomString = crypto.randomBytes(16).toString('hex');
    const ext = allowedExtensions[file.mimetype] || '.bin';
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

  // 🔒 SECURITY: Validate file extension matches MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const expectedExt = allowedExtensions[file.mimetype];
  
  if (ext && ext !== expectedExt) {
    return cb(new Error(`File extension ${ext} does not match content type ${file.mimetype}`), false);
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

// Middleware for handling student registration document uploads
const uploadStudentDocuments = upload.fields([
  { name: "sscMarksheet", maxCount: 1 },           // 10th Marksheet
  { name: "hscMarksheet", maxCount: 1 },           // 12th Marksheet
  { name: "passportPhoto", maxCount: 1 },          // Passport Photo
  { name: "categoryCertificate", maxCount: 1 },    // Category Certificate (OBC/SC/ST/EWS) - COMMONLY USED
  { name: "casteCertificate", maxCount: 1 },       // Caste Certificate (alternative name, same as category) - RARELY USED
  { name: "incomeCertificate", maxCount: 1 },      // Income Certificate
  { name: "characterCertificate", maxCount: 1 },   // Character Certificate
  { name: "transferCertificate", maxCount: 1 },    // Transfer Certificate (TC)
  { name: "aadharCard", maxCount: 1 },             // Aadhar Card
  { name: "entranceExamScore", maxCount: 1 },      // Entrance Exam Score
  { name: "migrationCertificate", maxCount: 1 },   // Migration Certificate
  { name: "domicileCertificate", maxCount: 1 },    // Domicile Certificate
  { name: "nonCreamyLayerCertificate", maxCount: 1 }, // Non-Creamy Layer (for OBC)
  { name: "physicallyChallengedCertificate", maxCount: 1 }, // PC Certificate
  { name: "sportsQuotaCertificate", maxCount: 1 }, // Sports Quota
  { name: "nriSponsorCertificate", maxCount: 1 },  // NRI Sponsor
  { name: "gapCertificate", maxCount: 1 },         // Gap Certificate
  { name: "affidavit", maxCount: 1 }               // Affidavit
]);

module.exports = {
  upload,
  uploadStudentDocuments
};