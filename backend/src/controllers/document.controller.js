const Document = require("../models/document.model");
const DocumentService = require("../services/document.service");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const logger = require("../utils/logger");

exports.getDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const document = await Document.findOne({ documentId, status: { $ne: "DELETED" } });
    if (!document) {
      return next(new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND"));
    }

    const isOwner = await DocumentService._isOwner(document, user);
    const hasAccess = await DocumentService._hasAccess(document, user);

    if (!isOwner && !hasAccess) {
      return next(new AppError("Not authorized to access this document", 403, "UNAUTHORIZED"));
    }

    const fileData = await DocumentService.downloadDocument(documentId);

    const ext = require("path").extname(fileData.originalName).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${fileData.originalName}"`
    );
    if (fileData.size) {
      res.setHeader("Content-Length", fileData.size);
    }

    const { pipeline } = require("stream");
    const stream = fileData.buffer;

    if (stream && typeof stream.pipe === "function") {
      pipeline(stream, res, (err) => {
        if (err) return next(err);
      });
    } else {
      res.send(stream);
    }
  } catch (error) {
    next(error);
  }
};

exports.getDocumentDownload = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const document = await Document.findOne({ documentId, status: "ACTIVE" });
    if (!document) {
      return next(new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND"));
    }

    const isOwner = await DocumentService._isOwner(document, user);
    const hasAccess = await DocumentService._hasAccess(document, user);

    if (!isOwner && !hasAccess) {
      return next(new AppError("Not authorized to access this document", 403, "UNAUTHORIZED"));
    }

    const fileData = await DocumentService.downloadDocument(documentId);

    const ext = require("path").extname(fileData.originalName).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileData.originalName}"`
    );
    if (fileData.size) {
      res.setHeader("Content-Length", fileData.size);
    }

    const { pipeline } = require("stream");
    const stream = fileData.buffer;

    if (stream && typeof stream.pipe === "function") {
      pipeline(stream, res, (err) => {
        if (err) return next(err);
      });
    } else {
      res.send(stream);
    }
  } catch (error) {
    next(error);
  }
};

exports.uploadDocumentCtrl = async (req, res, next) => {
  try {
    const { ownerType, ownerId, documentType } = req.body;
    const user = req.user;

    if (!req.file) {
      return next(new AppError("File is required", 400, "FILE_REQUIRED"));
    }

    if (!ownerType || !ownerId || !documentType) {
      return next(new AppError("ownerType, ownerId, and documentType are required", 400, "VALIDATION_ERROR"));
    }

    const categoryMap = {
      "Student": "student",
      "Teacher": "teacher",
      "Staff": "staff",
      "Parent": "parent",
      "College": "college-logo",
      "StudentFee": "payment-proof",
    };

    const category = categoryMap[ownerType] || "student";

    const document = await DocumentService.createDocument({
      ownerType,
      ownerId,
      documentType,
      fileBuffer: req.file.buffer,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: user.id,
      category,
      metadata: {},
    });

    ApiResponse.created(
      res,
      {
        documentId: document.documentId,
        documentType: document.documentType,
        originalFileName: document.originalFileName,
        mimeType: document.mimeType,
        size: document.size,
        uploadedAt: document.uploadedAt,
      },
      "Document uploaded successfully"
    );
  } catch (error) {
    next(error);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { documentType } = req.body;
    const user = req.user;

    if (!req.file) {
      return next(new AppError("File is required", 400, "FILE_REQUIRED"));
    }

    const oldDocument = await Document.findOne({ documentId, status: "ACTIVE" });
    if (!oldDocument) {
      return next(new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND"));
    }

    const categoryMap = {
      "Student": "student",
      "Teacher": "teacher",
      "Staff": "staff",
      "Parent": "parent",
      "College": "college-logo",
      "StudentFee": "payment-proof",
    };

    const category = categoryMap[oldDocument.ownerType] || "student";

    const newDocument = await DocumentService.replaceDocument(documentId, {
      fileBuffer: req.file.buffer,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: user.id,
      category,
      metadata: {},
    });

    ApiResponse.success(
      res,
      {
        documentId: newDocument.documentId,
        documentType: newDocument.documentType,
        originalFileName: newDocument.originalFileName,
        mimeType: newDocument.mimeType,
        size: newDocument.size,
        uploadedAt: newDocument.uploadedAt,
      },
      "Document updated successfully"
    );
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const document = await Document.findOne({ documentId, status: "ACTIVE" });
    if (!document) {
      return next(new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND"));
    }

    const isOwner = await DocumentService._isOwner(document, user);
    const hasAccess = await DocumentService._hasAccess(document, user);

    if (!isOwner && !hasAccess) {
      return next(new AppError("Not authorized to delete this document", 403, "UNAUTHORIZED"));
    }

    await DocumentService.softDeleteDocument(documentId);

    ApiResponse.success(res, null, "Document deleted successfully");
  } catch (error) {
    next(error);
  }
};

exports.listDocuments = async (req, res, next) => {
  try {
    const { ownerType, ownerId, documentType } = req.query;
    const user = req.user;

    if (!ownerType || !ownerId) {
      return next(new AppError("ownerType and ownerId are required", 400, "VALIDATION_ERROR"));
    }

    let query = { ownerType, ownerId, status: { $ne: "DELETED" } };
    if (documentType) {
      query.documentType = documentType;
    }

    const documents = await Document.find(query).sort({ createdAt: -1 });

    const filteredDocuments = documents.filter(doc => {
      if (doc.ownerId.toString() === user.id.toString()) return true;
      return DocumentService._hasAccess(doc, user);
    });

    const result = filteredDocuments.map(doc => ({
      documentId: doc.documentId,
      documentType: doc.documentType,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
    }));

    ApiResponse.success(
      res,
      result,
      "Documents fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};
