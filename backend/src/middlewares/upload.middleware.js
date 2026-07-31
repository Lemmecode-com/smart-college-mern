const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { getStorageProvider } = require("../services/storage");
const {
  BROAD_ALLOWED_MIME_TYPES,
  validateFilesAgainstConfig,
} = require("../utils/fileValidation");

const storage = multer.memoryStorage();

/**
 * Broad MIME type guard used as a first-pass filter in multer.
 * This accepts the superset of all possible document formats.
 * Strict per-document format validation against the college's
 * Document Configuration is performed by the controller using
 * validateFilesAgainstConfig() from the shared fileValidation utility.
 */
const studentFileFilter = (req, file, cb) => {
  if (!BROAD_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Only PDF, JPG, JPEG, PNG, DOC and DOCX are allowed."),
      false,
    );
  }

  cb(null, true);
};

const uploadStudent = multer({
  storage,
  fileFilter: studentFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/**
 * Teacher upload filter — also uses the broad MIME guard.
 * Format-specific validation is handled by controllers.
 */
const teacherFileFilter = (req, file, cb) => {
  if (!BROAD_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Only PDF, JPG, JPEG, PNG, DOC and DOCX are allowed."),
      false,
    );
  }

  cb(null, true);
};

const uploadTeacher = multer({
  storage,
  fileFilter: teacherFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

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

const TEACHER_DOCUMENT_LIMITS = {
  aadhaarCard: 2 * 1024 * 1024,
  panCard: 2 * 1024 * 1024,
  degreeCertificate: 5 * 1024 * 1024,
  passportPhoto: 2 * 1024 * 1024,
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
      const messages = oversized
        .map((o) => `${o.fieldname} exceeds maximum size of ${o.maxSize} (uploaded: ${o.actualSize})`)
        .join("; ");
      return next(new Error(messages));
    }

    next();
  });
};

const uploadDocument = (req, res, next) => {
  const fileFilter = (req, file, cb) => {
    if (!BROAD_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new Error("Invalid file type. Only PDF, JPG, JPEG, PNG, DOC and DOCX are allowed."),
        false,
      );
    }
    cb(null, true);
  };

  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  upload.single("file")(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

async function processUploadsWithStorage(files, category = "student") {
  const storageService = getStorageProvider().getAdapter();
  const results = {};

  for (const [fieldName, fileList] of Object.entries(files)) {
    const filesArray = Array.isArray(fileList) ? fileList : [fileList];
    results[fieldName] = [];

    for (const file of filesArray) {
      if (!file.buffer) continue;

      const uploadResult = await storageService.uploadFile(
        file.buffer,
        file.originalname,
        category,
        {
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          fieldname: fieldName,
        },
      );

      results[fieldName].push({
        ...file,
        storagePath: uploadResult.storagePath,
        filename: uploadResult.filename,
        url: uploadResult.url,
      });
    }
  }

  return results;
}

module.exports = {
  upload: {
    student: uploadStudent,
    teacher: uploadTeacher,
    document: uploadDocument,
  },
  uploadStudentDocuments,
  uploadTeacherDocuments,
  uploadDocument,
  processUploadsWithStorage,
  validateFilesAgainstConfig,
};
