const mongoose = require("mongoose");
const crypto = require("crypto");
const Student = require("../models/student.model");
const Document = require("../models/document.model");
const College = require("../models/college.model");
const DocumentConfig = require("../models/documentConfig.model");
const DocumentService = require("../services/document.service");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const securityAuditService = require("../services/securityAudit.service");
const { buildFrontendUrl } = require("../utils/urlBuilder");
const { sendDocumentRejectionEmail } = require("../services/email.service");

/**
 * Authorization helper for student document actions.
 *
 * Enforces:
 * - The target Student exists and belongs to req.college_id.
 * - The Student is in PENDING status (document verification runs before approval).
 * - The Document belongs to that Student (ownerType=Student, ownerId=student).
 * - The Document is active (not archived/deleted).
 *
 * Returns { student, document } so callers don't re-query.
 * Throws AppError with safe codes on any failure.
 */
const resolveStudentAndDocument = async (req, res, next) => {
  const { studentId, documentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new AppError("Invalid student id", 400, "INVALID_STUDENT_ID");
  }

  const student = await Student.findOne({
    _id: studentId,
    college_id: req.college_id,
    status: "PENDING",
  }).select("_id college_id status fullName email");

  if (!student) {
    throw new AppError(
      "Student not found or not available for document verification",
      404,
      "STUDENT_NOT_FOUND"
    );
  }

  const documentRecord = await Document.findOne({
    documentId,
    ownerType: "Student",
    ownerId: student._id,
    status: "ACTIVE",
  }).select(
    "documentId documentType originalFileName verificationStatus verifiedAt verifiedBy rejectedAt rejectedBy rejectionReason"
  );

  if (!documentRecord) {
    throw new AppError(
      "Document not found for this student",
      404,
      "DOCUMENT_NOT_FOUND"
    );
  }

  return { student, document: documentRecord };
};

/**
 * POST (verify) a Student document.
 *
 * College Admin / Admission Officer / Principal only.
 * College-scoped: the Student must belong to req.college_id.
 * Document ownership is verified server-side (documentId from the URL is
 * matched against the Student's documentRefs via ownerId).
 *
 * The acting user is always taken from req.user.id — the client may NOT
 * supply a different actor or college.
 */
exports.verifyStudentDocument = async (req, res, next) => {
  try {
    const { document } = await resolveStudentAndDocument(req, res, next);

    if (document.verificationStatus === "VERIFIED") {
      return ApiResponse.success(
        res,
        {
          documentId: document.documentId,
          documentType: document.documentType,
          verificationStatus: document.verificationStatus,
        },
        "Document is already verified"
      );
    }

    const updated = await DocumentService.verifyDocument(document.documentId, {
      verifiedBy: req.user.id,
    });

    securityAuditService
      .logEvent({
        eventType: "ADMIN_ACTION",
        category: "DATA_MODIFICATION",
        severity: "MEDIUM",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: req.college_id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: `/api/students/${req.params.studentId}/documents/${req.params.documentId}/verify`,
        method: "PUT",
        statusCode: 200,
        metadata: {
          action: "VERIFY_DOCUMENT",
          documentId: document.documentId,
          documentType: document.documentType,
          studentId: req.params.studentId,
          documentName: document.originalFileName,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    ApiResponse.success(
      res,
      {
        documentId: updated.documentId,
        documentType: updated.documentType,
        verificationStatus: updated.verificationStatus,
        verifiedAt: updated.verifiedAt,
      },
      "Document verified successfully"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST (reject) a Student document with a reason.
 *
 * Same authorization rules as verifyStudentDocument.
 * Requires a non-empty `reason` (≤ 500 chars) in the request body.
 */
exports.rejectStudentDocument = async (req, res, next) => {
  try {
    const { reason } = req.body || {};

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (!trimmedReason) {
      throw new AppError("Rejection reason is required", 400, "VALIDATION_ERROR");
    }
    if (trimmedReason.length > 500) {
      throw new AppError(
        "Rejection reason must not exceed 500 characters",
        400,
        "VALIDATION_ERROR"
      );
    }

    const { document } = await resolveStudentAndDocument(req, res, next);

    if (document.verificationStatus === "REJECTED") {
      return ApiResponse.success(
        res,
        {
          documentId: document.documentId,
          documentType: document.documentType,
          verificationStatus: document.verificationStatus,
          rejectionReason: document.rejectionReason,
        },
        "Document is already rejected"
      );
    }

    const updated = await DocumentService.rejectDocument(document.documentId, {
      rejectedBy: req.user.id,
      reason: trimmedReason,
    });

    // Generate secure one-time re-upload token (72-hour validity)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
    updated.reuploadToken = rawToken;
    updated.reuploadTokenExpires = expiry;
    await updated.save();

    // Fetch college & document config details to personalize rejection email
    const college = await College.findById(req.college_id).select("name code");
    const collegeName = college?.name || "College Administration";

    const docConfig = await DocumentConfig.findOne({
      college_id: req.college_id,
      isActive: true,
    }).lean();
    const configDoc = docConfig?.documents?.find((d) => d.type === updated.documentType);
    const documentTypeLabel = configDoc?.label || updated.documentType.replace(/_/g, " ");

    const reuploadUrl = buildFrontendUrl(`/reupload-document/${rawToken}`);

    // Send automated email to student with secure re-upload link
    if (student.email) {
      sendDocumentRejectionEmail({
        to: student.email,
        studentName: student.fullName,
        collegeName,
        collegeId: req.college_id,
        documentTypeLabel,
        reason: trimmedReason,
        reuploadUrl,
        expiresAt: expiry,
      }).catch((err) =>
        console.error("Failed to send document rejection email:", err.message)
      );
    }

    securityAuditService
      .logEvent({
        eventType: "ADMIN_ACTION",
        category: "DATA_MODIFICATION",
        severity: "MEDIUM",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: req.college_id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: `/api/students/${req.params.studentId}/documents/${req.params.documentId}/reject`,
        method: "PUT",
        statusCode: 200,
        metadata: {
          action: "REJECT_DOCUMENT",
          documentId: document.documentId,
          documentType: document.documentType,
          studentId: req.params.studentId,
          documentName: document.originalFileName,
          reason: trimmedReason,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    ApiResponse.success(
      res,
      {
        documentId: updated.documentId,
        documentType: updated.documentType,
        verificationStatus: updated.verificationStatus,
        rejectedAt: updated.rejectedAt,
        rejectionReason: updated.rejectionReason,
        reuploadUrl,
      },
      "Document rejected successfully and re-upload notification sent to student"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/students/bulk-verify-documents
 * College Admin / Admission Officer / Principal only.
 * College-scoped: all students must belong to req.college_id and be PENDING.
 * Body: { studentIds: [id1, id2, ...] }
 */
exports.bulkVerifyStudentDocuments = async (req, res, next) => {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError("Provide studentIds array in request body", 400, "INVALID_INPUT");
    }

    if (studentIds.length > 200) {
      throw new AppError("Cannot process more than 200 students at a time", 400, "BATCH_LIMIT_EXCEEDED");
    }

    const validStudentIds = studentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validStudentIds.length === 0) {
      throw new AppError("No valid student IDs provided", 400, "INVALID_INPUT");
    }

    // 1. Fetch valid pending students belonging to this college
    const students = await Student.find({
      _id: { $in: validStudentIds },
      college_id: req.college_id,
      status: "PENDING",
    }).select("_id fullName email");

    if (students.length === 0) {
      return ApiResponse.success(
        res,
        {
          totalStudentsProcessed: 0,
          totalDocumentsVerified: 0,
          verifiedStudentIds: [],
        },
        "No matching pending students found for verification"
      );
    }

    const targetStudentIds = students.map((s) => s._id);

    // 2. Find and update all active documents for these students
    const now = new Date();
    const updateResult = await Document.updateMany(
      {
        ownerType: "Student",
        ownerId: { $in: targetStudentIds },
        status: "ACTIVE",
        verificationStatus: { $ne: "VERIFIED" },
      },
      {
        $set: {
          verificationStatus: "VERIFIED",
          verifiedAt: now,
          verifiedBy: req.user.id,
        },
        $unset: {
          rejectedAt: "",
          rejectionReason: "",
          rejectedBy: "",
        },
      }
    );

    // 3. Security Audit Logging
    securityAuditService
      .logEvent({
        eventType: "ADMIN_ACTION",
        category: "DATA_MODIFICATION",
        severity: "MEDIUM",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: req.college_id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/students/bulk-verify-documents",
        method: "POST",
        statusCode: 200,
        metadata: {
          action: "BULK_VERIFY_DOCUMENTS",
          studentCount: students.length,
          documentsVerifiedCount: updateResult.modifiedCount,
          studentIds: targetStudentIds,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    return ApiResponse.success(
      res,
      {
        totalStudentsProcessed: students.length,
        totalDocumentsVerified: updateResult.modifiedCount,
        verifiedStudentIds: targetStudentIds,
      },
      `Successfully verified ${updateResult.modifiedCount} document(s) for ${students.length} student(s)`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/students/:studentId/documents/:documentType/admin-upload
 *
 * College Admin / Admission Officer uploads or replaces a student's document directly.
 * Resolves re-upload deadlock for PENDING students who cannot log in to student portal.
 * Marks document as VERIFIED by default (uploaded and verified by staff) with audit trail.
 */
exports.adminUploadStudentDocument = async (req, res, next) => {
  try {
    const { studentId, documentType } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new AppError("Invalid student id", 400, "INVALID_STUDENT_ID");
    }

    if (!req.file) {
      throw new AppError("File is required", 400, "FILE_REQUIRED");
    }

    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: "PENDING",
    });

    if (!student) {
      throw new AppError("Pending student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Check if an active document already exists for this type
    const existingDoc = await Document.findOne({
      ownerType: "Student",
      ownerId: student._id,
      documentType,
      status: "ACTIVE",
    });

    if (existingDoc) {
      existingDoc.status = "ARCHIVED";
      existingDoc.archivedAt = new Date();
      await existingDoc.save();
    }

    // Create the document via DocumentService
    const newDocument = await DocumentService.createDocument({
      ownerType: "Student",
      ownerId: student._id,
      documentType,
      fileBuffer: req.file.buffer,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.id,
      category: "student",
      metadata: {
        uploadedByAdmin: true,
        adminRole: req.user.role,
        adminId: req.user.id,
        replacesDocumentId: existingDoc ? existingDoc.documentId : null,
      },
    });

    // Staff upload is pre-verified upon upload
    newDocument.verificationStatus = "VERIFIED";
    newDocument.verifiedAt = new Date();
    newDocument.verifiedBy = req.user.id;
    await newDocument.save();

    // Update student's documentRefs
    const updatedRefs = (student.documentRefs || []).filter(
      (ref) => ref.documentType !== documentType
    );
    updatedRefs.push({
      documentId: newDocument.documentId,
      documentType,
      createdAt: new Date(),
    });
    student.documentRefs = updatedRefs;
    await student.save();

    // Security audit log
    securityAuditService
      .logEvent({
        eventType: "ADMIN_ACTION",
        category: "DATA_MODIFICATION",
        severity: "MEDIUM",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: req.college_id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: `/api/students/${studentId}/documents/${documentType}/admin-upload`,
        method: "POST",
        statusCode: 200,
        metadata: {
          action: "ADMIN_UPLOAD_STUDENT_DOCUMENT",
          studentId: student._id,
          documentType,
          originalFileName: req.file.originalname,
          documentId: newDocument.documentId,
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
        downloadUrl: `/api/documents/${newDocument.documentId}/download`,
      },
      "Document uploaded and verified successfully"
    );
  } catch (error) {
    next(error);
  }
};
