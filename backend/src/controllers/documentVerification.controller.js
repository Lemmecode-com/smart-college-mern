const mongoose = require("mongoose");
const Student = require("../models/student.model");
const Document = require("../models/document.model");
const DocumentService = require("../services/document.service");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const securityAuditService = require("../services/securityAudit.service");

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
      },
      "Document rejected successfully"
    );
  } catch (error) {
    next(error);
  }
};
