const Document = require("../models/document.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const DocumentConfig = require("../models/documentConfig.model");
const { getStorageProvider } = require("./storage");
const AppError = require("../utils/AppError");
const crypto = require("crypto");

class DocumentService {
  static async createDocument({
    ownerType,
    ownerId,
    documentType,
    fileBuffer,
    originalFileName,
    mimeType,
    size,
    uploadedBy,
    category,
    metadata = {},
    provider = null,
    storageKey = null,
  }) {
    const storageService = getStorageProvider().getAdapter();
    const actualProvider = provider || getStorageProvider().getProviderName();

    let result;
    if (storageKey) {
      result = { storagePath: storageKey };
    } else {
      result = await storageService.uploadFile(
        fileBuffer,
        originalFileName,
        category || documentType,
        {
          originalName: originalFileName,
          mimetype: mimeType,
          size,
          documentType,
          ownerType,
          ownerId,
        }
      );
    }

    const checksum = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const document = await Document.create({
      ownerType,
      ownerId,
      documentType,
      storageKey: result.storagePath,
      provider: actualProvider,
      originalFileName,
      mimeType,
      size,
      checksum,
      uploadedBy,
      metadata: {
        ...metadata,
        category,
        uploadedVia: "DocumentService",
      },
    });

    return document;
  }

  static async getDocument(documentId) {
    const document = await Document.findOne({ documentId, status: { $ne: "DELETED" } });
    if (!document) {
      throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }
    return document;
  }

  static async downloadDocument(documentId) {
    const document = await Document.findOne({ documentId, status: "ACTIVE" });
    if (!document) {
      throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const storageService = getStorageProvider().getAdapter();
    const fileData = await storageService.downloadFile(document.storageKey);

    return {
      buffer: fileData.buffer,
      originalName: document.originalFileName,
      size: document.size,
      contentType: document.mimeType,
      documentId: document.documentId,
    };
  }

  static async replaceDocument(documentId, {
    fileBuffer,
    originalFileName,
    mimeType,
    size,
    uploadedBy,
    category,
    metadata = {},
  }) {
    const oldDocument = await Document.findOne({ documentId, status: "ACTIVE" });
    if (!oldDocument) {
      throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const storageService = getStorageProvider().getAdapter();

    let result;
    if (category) {
      result = await storageService.uploadFile(
        fileBuffer,
        originalFileName,
        category,
        {
          originalName: originalFileName,
          mimetype: mimeType,
          size,
          documentType: oldDocument.documentType,
          ownerType: oldDocument.ownerType,
          ownerId: oldDocument.ownerId,
        }
      );
    }

    const oldMetadata = oldDocument.metadata instanceof Map
      ? Object.fromEntries(oldDocument.metadata)
      : oldDocument.metadata;

    const newDocument = await Document.create({
      ownerType: oldDocument.ownerType,
      ownerId: oldDocument.ownerId,
      documentType: oldDocument.documentType,
      storageKey: result ? result.storagePath : oldDocument.storageKey,
      provider: oldDocument.provider,
      originalFileName,
      mimeType,
      size,
      uploadedBy,
      replacedBy: oldDocument.documentId,
      metadata: {
        ...oldMetadata,
        ...metadata,
        replacedDocumentId: oldDocument.documentId,
      },
    });

    oldDocument.status = "ARCHIVED";
    oldDocument.archivedAt = new Date();
    await oldDocument.save();

    return newDocument;
  }

  static async softDeleteDocument(documentId) {
    const document = await Document.findOne({ documentId, status: "ACTIVE" });
    if (!document) {
      throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    document.status = "ARCHIVED";
    document.archivedAt = new Date();
    await document.save();

    return document;
  }

  static async permanentlyDeleteDocument(documentId) {
    const document = await Document.findOne({ documentId, status: { $in: ["ACTIVE", "ARCHIVED"] } });
    if (!document) {
      throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const storageService = getStorageProvider().getAdapter();
    try {
      await storageService.deleteFile(document.storageKey);
    } catch (error) {
      console.error(`Failed to delete file ${document.storageKey}:`, error.message);
    }

    document.status = "DELETED";
    await document.save();

    return document;
  }

  static async findDocumentsByOwner(ownerType, ownerId, documentType = null) {
    const query = { ownerType, ownerId, status: { $ne: "DELETED" } };
    if (documentType) {
      query.documentType = documentType;
    }
    return Document.find(query).sort({ createdAt: -1 });
  }

  static async getActiveDocument(ownerType, ownerId, documentType) {
    return Document.findOne({
      ownerType,
      ownerId,
      documentType,
      status: "ACTIVE",
    }).sort({ createdAt: -1 });
  }

  static async countActiveDocuments(ownerType, ownerId) {
    return Document.countDocuments({
      ownerType,
      ownerId,
      status: "ACTIVE",
    });
  }

  static async _isOwner(document, user) {
    if (!user || !document) return false;

    if (document.ownerType === "Teacher") {
      const teacher = await Teacher.findById(document.ownerId);
      if (!teacher) return false;
      return teacher.user_id.toString() === user.id.toString();
    }

    if (document.ownerType === "Student") {
      const student = await Student.findById(document.ownerId);
      if (!student) return false;
      return student.user_id.toString() === user.id.toString();
    }

    return document.ownerId.toString() === user.id.toString();
  }

  static async _hasAccess(document, user) {
    if (!user || !document) return false;
    
    if (document.ownerType === "Student") {
      return ["STUDENT", "COLLEGE_ADMIN", "ADMISSION_OFFICER", "PRINCIPAL", "HOD", "EXAM_COORDINATOR", "ACCOUNTANT"].includes(user.role);
    }
    if (document.ownerType === "Teacher") {
      return ["TEACHER", "COLLEGE_ADMIN", "ADMISSION_OFFICER", "PRINCIPAL", "HOD", "EXAM_COORDINATOR"].includes(user.role);
    }
    if (document.ownerType === "College") {
      return ["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role);
    }
    if (document.ownerType === "StudentFee") {
      return ["COLLEGE_ADMIN", "ADMISSION_OFFICER", "PRINCIPAL", "ACCOUNTANT"].includes(user.role);
    }
    if (document.ownerType === "Staff" || document.ownerType === "Parent") {
      return ["COLLEGE_ADMIN", "ADMISSION_OFFICER", "PRINCIPAL"].includes(user.role);
    }
    
     return false;
  }

  /**
   * Document Verification (admissions workflow).
   * Records that a College Admin has verified a Student document.
   * Only transitions PENDING -> VERIFIED (or REJECTED -> VERIFIED).
   */
  static async verifyDocument(documentId, { verifiedBy }) {
    const document = await Document.findOne({
      documentId,
      ownerType: "Student",
      status: "ACTIVE",
    });

    if (!document) {
      throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    document.verificationStatus = "VERIFIED";
    document.verifiedAt = new Date();
    document.verifiedBy = verifiedBy;
    document.rejectedAt = undefined;
    document.rejectionReason = undefined;

    await document.save();
    return document;
  }

  /**
   * Document Rejection (admissions workflow).
   * Records that a College Admin rejected a Student document, with a reason.
   */
  static async rejectDocument(documentId, { rejectedBy, reason }) {
    const document = await Document.findOne({
      documentId,
      ownerType: "Student",
      status: "ACTIVE",
    });

    if (!document) {
      throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    document.verificationStatus = "REJECTED";
    document.rejectedAt = new Date();
    document.rejectedBy = rejectedBy;
    document.rejectionReason = reason;
    document.verifiedAt = undefined;
    document.verifiedBy = undefined;

    await document.save();
    return document;
  }

  /**
   * Returns the list of mandatory + enabled document types for a college,
   * using the existing DocumentConfig (no hard-coded document types).
   */
  static async getRequiredDocumentTypes(collegeId) {
    const config = await DocumentConfig.findOne({
      college_id: collegeId,
      isActive: true,
    }).lean();

    if (!config || !Array.isArray(config.documents)) return [];

    return config.documents
      .filter((doc) => doc.enabled && doc.mandatory)
      .map((doc) => doc.type);
  }

  /**
   * Approval-gating helper.
   * Returns the mandatory document types for a college that are NOT verified
   * for the given student (missing upload or verificationStatus !== VERIFIED).
   * An empty array means the student is clear to approve.
   */
  static async getUnverifiedRequiredDocumentTypes(collegeId, studentId) {
    const requiredTypes = await this.getRequiredDocumentTypes(collegeId);

    if (requiredTypes.length === 0) return [];

    const verifiedDocs = await Document.find({
      ownerType: "Student",
      ownerId: studentId,
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    }).select("documentType").lean();

    const verifiedTypes = new Set(verifiedDocs.map((d) => d.documentType));

    return requiredTypes.filter((type) => !verifiedTypes.has(type));
  }
}

module.exports = DocumentService;
