const mongoose = require("mongoose");
const Student = require("../models/student.model");
const Document = require("../models/document.model");
const College = require("../models/college.model");
const DocumentConfig = require("../models/documentConfig.model");
const DocumentService = require("../services/document.service");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const securityAuditService = require("../services/securityAudit.service");

/**
 * GET /api/public/documents/reupload/:token
 * Public endpoint: Retrieve details of rejected document for re-upload
 */
exports.getReuploadDocumentInfo = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      throw new AppError("Invalid re-upload token", 400, "INVALID_TOKEN");
    }

    const document = await Document.findOne({
      reuploadToken: token,
      status: "ACTIVE",
    });

    if (!document) {
      throw new AppError(
        "Invalid or expired re-upload link. Please contact the college admission office.",
        404,
        "LINK_INVALID"
      );
    }

    if (document.reuploadTokenExpires && document.reuploadTokenExpires < new Date()) {
      throw new AppError(
        "This re-upload link has expired (valid for 72 hours). Please contact the college admission office for assistance.",
        400,
        "LINK_EXPIRED"
      );
    }

    if (document.verificationStatus !== "REJECTED") {
      throw new AppError(
        "This document has already been re-uploaded or verified.",
        400,
        "DOCUMENT_ALREADY_PROCESSED"
      );
    }

    const student = await Student.findById(document.ownerId).select(
      "fullName email college_id"
    );

    if (!student) {
      throw new AppError("Student application record not found", 404, "STUDENT_NOT_FOUND");
    }

    const college = await College.findById(student.college_id).select("name code");

    const docConfig = await DocumentConfig.findOne({
      college_id: student.college_id,
      isActive: true,
    }).lean();

    const configDoc = docConfig?.documents?.find((d) => d.type === document.documentType);
    const documentLabel = configDoc?.label || document.documentType.replace(/_/g, " ");
    const allowedFormats = configDoc?.allowedFormats || ["pdf", "jpg", "jpeg", "png", "doc", "docx"];
    const maxSizeBytes = (configDoc?.maxSizeMB || 5) * 1024 * 1024;
    const attemptsRemaining =
      typeof req.rateLimit?.remaining === "number" ? req.rateLimit.remaining : undefined;

    return ApiResponse.success(
      res,
      {
        studentName: student.fullName,
        collegeName: college?.name || "College Administration",
        collegeCode: college?.code || "",
        documentType: document.documentType,
        documentLabel,
        rejectionReason: document.rejectionReason,
        reuploadTokenExpires: document.reuploadTokenExpires,
        allowedFormats,
        maxSizeBytes,
        attemptsRemaining,
      },
      "Document re-upload information fetched successfully"
    );
  } catch (error) {
    if (req.rateLimit && typeof req.rateLimit.remaining === "number") {
      error.attemptsRemaining = req.rateLimit.remaining;
    }
    next(error);
  }
};

/**
 * POST /api/public/documents/reupload/:token
 * Public endpoint: Submit replacement file for rejected document
 */
exports.submitReuploadDocument = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      throw new AppError("Invalid re-upload token", 400, "INVALID_TOKEN");
    }

    if (!req.file) {
      throw new AppError("Please select a file to upload", 400, "FILE_REQUIRED");
    }

    const oldDoc = await Document.findOne({
      reuploadToken: token,
      status: "ACTIVE",
    });

    if (!oldDoc) {
      throw new AppError(
        "Invalid or expired re-upload link. Please contact the college admission office.",
        404,
        "LINK_INVALID"
      );
    }

    if (oldDoc.reuploadTokenExpires && oldDoc.reuploadTokenExpires < new Date()) {
      throw new AppError(
        "This re-upload link has expired. Please contact the college admission office for assistance.",
        400,
        "LINK_EXPIRED"
      );
    }

    if (oldDoc.verificationStatus !== "REJECTED") {
      throw new AppError(
        "This document has already been re-uploaded or verified.",
        400,
        "DOCUMENT_ALREADY_PROCESSED"
      );
    }

    const student = await Student.findById(oldDoc.ownerId);
    if (!student) {
      throw new AppError("Student application record not found", 404, "STUDENT_NOT_FOUND");
    }

    // Strict validation against college document config
    const docConfig = await DocumentConfig.findOne({
      college_id: student.college_id,
      isActive: true,
    }).lean();

    const configDoc = docConfig?.documents?.find((d) => d.type === oldDoc.documentType);
    if (configDoc) {
      if (configDoc.allowedFormats && configDoc.allowedFormats.length > 0) {
        const fileExt = req.file.originalname.split(".").pop().toLowerCase();
        const allowedExts = configDoc.allowedFormats.map((f) =>
          f.toLowerCase().replace(".", "")
        );
        if (!allowedExts.includes(fileExt)) {
          throw new AppError(
            `File format .${fileExt} is not allowed for ${configDoc.label || oldDoc.documentType}. Allowed: ${allowedExts.join(", ").toUpperCase()}`,
            400,
            "INVALID_FILE_FORMAT"
          );
        }
      }

      const maxBytes = (configDoc.maxSizeMB || 5) * 1024 * 1024;
      if (req.file.size > maxBytes) {
        throw new AppError(
          `File size exceeds maximum allowed size of ${configDoc.maxSizeMB || 5}MB`,
          400,
          "FILE_TOO_LARGE"
        );
      }
    }

    // 1. Archive old rejected document and invalidate single-use token
    oldDoc.status = "ARCHIVED";
    oldDoc.archivedAt = new Date();
    oldDoc.reuploadToken = undefined;
    oldDoc.reuploadTokenExpires = undefined;
    await oldDoc.save();

    // 2. Create replacement document in PENDING verification status
    const newDocument = await DocumentService.createDocument({
      ownerType: "Student",
      ownerId: student._id,
      documentType: oldDoc.documentType,
      fileBuffer: req.file.buffer,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: student.user_id || student._id,
      category: "student",
      metadata: {
        reuploadedByStudent: true,
        replacesDocumentId: oldDoc.documentId,
        reuploadedAt: new Date(),
      },
    });

    newDocument.verificationStatus = "PENDING";
    await newDocument.save();

    // 3. Update student's documentRefs
    const updatedRefs = (student.documentRefs || []).filter(
      (ref) => ref.documentType !== oldDoc.documentType
    );
    updatedRefs.push({
      documentId: newDocument.documentId,
      documentType: oldDoc.documentType,
      createdAt: new Date(),
    });
    student.documentRefs = updatedRefs;
    await student.save();

    // 4. Security Audit Log
    securityAuditService
      .logEvent({
        eventType: "STUDENT_ACTION",
        category: "DATA_MODIFICATION",
        severity: "LOW",
        userId: student._id,
        userRole: "STUDENT",
        collegeId: student.college_id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: `/api/public/documents/reupload/${token}`,
        method: "POST",
        statusCode: 200,
        metadata: {
          action: "PUBLIC_REUPLOAD_DOCUMENT",
          studentId: student._id,
          documentType: oldDoc.documentType,
          originalFileName: req.file.originalname,
          newDocumentId: newDocument.documentId,
          replacedDocumentId: oldDoc.documentId,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    return ApiResponse.success(
      res,
      {
        documentId: newDocument.documentId,
        documentType: newDocument.documentType,
        originalFileName: newDocument.originalFileName,
        verificationStatus: newDocument.verificationStatus,
        attemptsRemaining:
          typeof req.rateLimit?.remaining === "number" ? req.rateLimit.remaining : undefined,
      },
      "Document re-uploaded successfully and submitted for admission verification"
    );
  } catch (error) {
    if (req.rateLimit && typeof req.rateLimit.remaining === "number") {
      error.attemptsRemaining = req.rateLimit.remaining;
    }
    next(error);
  }
};
