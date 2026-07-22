const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

/* =========================================================
   STUDENT UPLOADS
========================================================= */
const studentUploadsDir = path.join(__dirname, "../../uploads/students");
if (!fs.existsSync(studentUploadsDir)) {
  fs.mkdirSync(studentUploadsDir, { recursive: true });
}

const studentAllowedExtensions = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/jpg": [".jpg", ".jpeg"],
  "application/pdf": [".pdf"],
};

const studentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, studentUploadsDir);
  },
  filename: function (req, file, cb) {
    const randomString = crypto.randomBytes(16).toString('hex');
    const ext = (studentAllowedExtensions[file.mimetype] || [".bin"])[0];
    const fieldName = file.fieldname.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    cb(null, `${fieldName}-${Date.now()}-${randomString}${ext}`);
  }
});

const studentFileFilter = (req, file, cb) => {
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
  const allowedExts = studentAllowedExtensions[file.mimetype];

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

const uploadStudent = multer({
  storage: studentStorage,
  fileFilter: studentFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

/* =========================================================
   TEACHER UPLOADS
========================================================= */
const teacherUploadsDir = path.join(__dirname, "../../uploads/teachers");
if (!fs.existsSync(teacherUploadsDir)) {
  fs.mkdirSync(teacherUploadsDir, { recursive: true });
}

const teacherAllowedExtensions = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/jpg": [".jpg", ".jpeg"],
  "application/pdf": [".pdf"],
};

const teacherStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, teacherUploadsDir);
  },
  filename: function (req, file, cb) {
    const randomString = crypto.randomBytes(16).toString('hex');
    const ext = (teacherAllowedExtensions[file.mimetype] || [".bin"])[0];
    const fieldName = file.fieldname.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    cb(null, `${fieldName}-${Date.now()}-${randomString}${ext}`);
  }
});

const teacherFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf"
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only PDF, JPG, JPEG and PNG are allowed."), false);
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = teacherAllowedExtensions[file.mimetype];

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

const uploadTeacher = multer({
  storage: teacherStorage,
  fileFilter: teacherFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB global max (per-file checked after upload)
  }
});

/* =========================================================
   NORMALIZED MIDDLEWARE: STUDENT
========================================================= */
const uploadStudentDocuments = (req, res, next) => {
  uploadStudent.any()(req, res, (err) => {
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

/* =========================================================
   NORMALIZED MIDDLEWARE: TEACHER
========================================================= */
const TEACHER_DOCUMENT_LIMITS = {
  aadhaarCard: 2 * 1024 * 1024,       // 2MB
  panCard: 2 * 1024 * 1024,           // 2MB
  degreeCertificate: 5 * 1024 * 1024, // 5MB
  passportPhoto: 2 * 1024 * 1024,     // 2MB
};

const uploadTeacherDocuments = (req, res, next) => {
  uploadTeacher.any()(req, res, (err) => {
    if (err) return next(err);

    if (Array.isArray(req.files)) {
      const normalized = {};
      for (const file of req.files) {
        if (!normalized[file.fieldname]) normalized[file.fieldname] = [];
        normalized[file.fieldname].push(file);
      }
      req.files = normalized;
    }

    // Per-document size validation
    const files = req.files || {};
    const oversized = [];
    for (const [fieldname, fileList] of Object.entries(files)) {
      const file = Array.isArray(fileList) ? fileList[0] : fileList;
      if (!file) continue;

      const limit = TEACHER_DOCUMENT_LIMITS[fieldname];
      if (limit && file.size > limit) {
        oversized.push({
          fieldname,
          maxSize: `${Math.round(limit / (1024 * 1024))}MB`,
          actualSize: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        });
      }
    }

    if (oversized.length > 0) {
      // Delete uploaded files on validation failure
      for (const [fieldname, fileList] of Object.entries(files)) {
        const file = Array.isArray(fileList) ? fileList[0] : fileList;
        if (file && file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      const messages = oversized
        .map((o) => `${o.fieldname} exceeds maximum size of ${o.maxSize} (uploaded: ${o.actualSize})`)
        .join("; ");
      return next(new Error(messages));
    }

    next();
  });
};

module.exports = {
  upload: {
    student: uploadStudent,
    teacher: uploadTeacher,
  },
  uploadStudentDocuments,
  uploadTeacherDocuments,
};
