const mongoose = require("mongoose");

const College = require("../models/college.model");
const User = require("../models/user.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const Timetable = require("../models/timetable.model");
const AttendanceSession = require("../models/attendanceSession.model");
const { generateCollegeQR } = require("../utils/qrGenerator");
const { buildFrontendUrl } = require("../utils/urlBuilder");
const AppError = require("../utils/AppError");
const FeeStructure = require("../models/feeStructure.model");
const CollegeEmailConfig = require("../models/collegeEmailConfig.model");
const { sendEmailToCollegeAdmin } = require("../services/email.service");
const securityAuditService = require("../services/securityAudit.service");
const AuditService = require("../services/auditLog.service");
const { getStorageProvider } = require("../services/storage");
const DocumentService = require("../services/document.service");

exports.createCollege = async (req, res, next) => {
  try {
    const {
      collegeName,
      collegeCode,
      collegeEmail,
      contactNumber,
      address,
      establishedYear,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    // 1️⃣ Check college code uniqueness
    const exists = await College.findOne({ code: collegeCode });
    if (exists) {
      throw new AppError("College code already exists", 409, "DUPLICATE_CODE");
    }

    // 1.5️⃣ Validate college name - no special characters or emoji
    const collegeNamePattern = /^[a-zA-Z0-9\s\-.,&()'\/]+$/;
    if (!collegeNamePattern.test(collegeName)) {
      throw new AppError("College name contains invalid characters. Only letters, numbers, spaces, and basic punctuation (-.,&'/) are allowed.", 400, "INVALID_COLLEGE_NAME");
    }

    // 1.6️⃣ Check college email uniqueness (prevents raw E11000 leak + orphaned college)
    const existingCollegeEmail = await College.findOne({ email: collegeEmail });
    if (existingCollegeEmail) {
      throw new AppError("A college with this email already exists.", 409, "DUPLICATE_COLLEGE_EMAIL");
    }

    // 1.7️⃣ Check admin email uniqueness (prevents raw E11000 leak + orphaned college)
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      throw new AppError(
        "A user with this admin email already exists. Use a different email or reuse the existing account.",
        409,
        "DUPLICATE_ADMIN_EMAIL",
      );
    }

    // 2️⃣ Generate Registration URL + QR FIRST
    const { registrationUrl, registrationQr } =
      await generateCollegeQR(collegeCode);

    // 3️⃣ Upload logo to storage if provided
    let logoPath = null;
    let logoDocumentId = null;
    if (req.file) {
      const storageService = getStorageProvider().getAdapter();
      const uploadResult = await storageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        "college-logo",
        {
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      );
      logoPath = uploadResult.storagePath;
    }

    // 4️⃣ Create College first so we have collegeId for Document references
    const college = await College.create({
      name: collegeName,
      code: collegeCode,
      email: collegeEmail,
      contactNumber,
      address,
      establishedYear,
      logo: logoPath,
      logoDocumentId,
      registrationUrl,
      registrationQr,
    });

    // 5️⃣ Create Document records NOW that college exists
    if (logoPath) {
      const logoDocument = await DocumentService.createDocument({
        ownerType: "College",
        ownerId: college._id,
        documentType: "logo",
        fileBuffer: req.file.buffer,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user.id,
        category: "college-logo",
        storageKey: logoPath,
      });
      logoDocumentId = logoDocument.documentId;
    }

    const qrDocument = await DocumentService.createDocument({
      ownerType: "College",
      ownerId: college._id,
      documentType: "registration_qr",
      fileBuffer: Buffer.from(registrationQr),
      originalFileName: `${collegeCode}-qr.png`,
      mimeType: "image/png",
      size: Buffer.byteLength(registrationQr),
      uploadedBy: req.user.id,
category: "college-qr",
      });

    const documentRefs = [];
    if (logoDocumentId) {
      documentRefs.push({ documentId: logoDocumentId, documentType: "logo" });
    }
    documentRefs.push({ documentId: qrDocument.documentId, documentType: "registration_qr" });

    await College.findByIdAndUpdate(college._id, {
      logoDocumentId,
      registrationQrDocumentId: qrDocument.documentId,
      documentRefs,
    });

    const collegeAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      mustChangePassword: true,
    });

    await College.findByIdAndUpdate(college._id, {
      admin_id: collegeAdmin._id,
      adminEmail: adminEmail,
      adminName: adminName,
    });

    let emailSent = false;
    let emailError = null;
    try {
      await sendEmailToCollegeAdmin({
        to: adminEmail,
        collegeName: college.name,
        subject: `Welcome to NOVAA`,
        message: `Welcome ${adminName},

Your account has been created successfully.

Login Credentials:

Email: ${adminEmail}
Password: ${adminPassword}

Login URL:
${buildFrontendUrl("/login")}

IMPORTANT: You must change this password on you first login

Best Regards,
NOVAA (SUPERADMIN)`,
        collegeId: college._id,
      });
      emailSent = true;
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error("Failed to send welcome email to college admin:", emailErr.message);
      console.error("Email error stack:", emailErr.stack);
    }

    res.status(201).json({
      message: "College and College Admin created successfully",
      emailSent,
      emailError,
      college: {
        id: college._id,
        name: college.name,
        code: college.code,
        registrationUrl,
        registrationQr,
      },
      collegeAdmin: {
        id: collegeAdmin._id,
        name: collegeAdmin.name,
        email: collegeAdmin.email,
      },
    });

    securityAuditService
      .logEvent({
        eventType: "ADMIN_ACTION",
        category: "DATA_ACCESS",
        severity: "MEDIUM",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: college._id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/master/create/college",
        method: "POST",
        statusCode: 201,
        metadata: {
          action: "CREATE_COLLEGE",
          collegeId: college._id,
          collegeCode: college.code,
          collegeName: college.name,
          adminEmail: collegeAdmin.email,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));
  } catch (error) {
    next(error);
  }
};

// SUPER ADMIN: View all colleges (optionally filter inactive)
exports.getAllColleges = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;

    // By default, only show active colleges
    const query = includeInactive === "true" ? {} : { isActive: true };

    const colleges = await College.find(query).sort({ createdAt: -1 });

    res.json({
      count: colleges.length,
      colleges,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SUPER ADMIN: Soft Delete College (Deactivate with Cascade)
========================================================= */
exports.deleteCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Find college
    const college = await College.findById(collegeId);
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Check if already inactive
    if (!college.isActive) {
      throw new AppError(
        "College is already deactivated",
        400,
        "ALREADY_INACTIVE",
      );
    }

    // 4️⃣ Soft delete (this triggers the pre('findOneAndUpdate') hook for cascade)
    await College.findOneAndUpdate(
      { _id: collegeId },
      { $set: { isActive: false } },
    );

    AuditService.logCollegeDeactivated(req.user, college, req)
      .catch((err) => console.error("Audit log failed:", err.message));

    securityAuditService
      .logEvent({
        eventType: "ADMIN_ACTION",
        category: "DATA_MODIFICATION",
        severity: "HIGH",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: college._id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/master/:collegeId",
        method: "DELETE",
        statusCode: 200,
        metadata: {
          action: "DELETE_COLLEGE",
          collegeId: college._id,
          collegeCode: college.code,
          collegeName: college.name,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    res.json({
      message:
        "College deactivated successfully. All related departments, courses, students, and staff have been deactivated.",
      college: {
        id: college._id,
        name: college.name,
        code: college.code,
        isActive: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SUPER ADMIN: Restore College (Reactivate with Cascade)
========================================================= */
exports.restoreCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Find college
    const college = await College.findById(collegeId);
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Check if already active
    if (college.isActive) {
      throw new AppError("College is already active", 400, "ALREADY_ACTIVE");
    }

    // 4️⃣ Restore (this triggers the pre('findOneAndUpdate') hook for cascade restore)
    await College.findOneAndUpdate(
      { _id: collegeId },
      { $set: { isActive: true } },
    );

    AuditService.logCollegeRestored(req.user, college, req)
      .catch((err) => console.error("Audit log failed:", err.message));

    securityAuditService
      .logEvent({
        eventType: "ADMIN_ACTION",
        category: "DATA_MODIFICATION",
        severity: "MEDIUM",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: college._id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/master/:collegeId/restore",
        method: "PATCH",
        statusCode: 200,
        metadata: {
          action: "RESTORE_COLLEGE",
          collegeId: college._id,
          collegeCode: college.code,
          collegeName: college.name,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    res.json({
      message:
        "College restored successfully. All related departments, courses, students, and staff have been reactivated.",
      college: {
        id: college._id,
        name: college.name,
        code: college.code,
        isActive: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SUPER ADMIN: Hard Delete College (PERMANENT - Use with Caution)
========================================================= */
exports.hardDeleteCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const { confirmPermanentDelete } = req.body;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Find college
    const college = await College.findById(collegeId);
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Require explicit confirmation for permanent delete
    if (confirmPermanentDelete !== true) {
      throw new AppError(
        "Permanent deletion requires explicit confirmation. Set 'confirmPermanentDelete: true' in request body.",
        400,
        "CONFIRMATION_REQUIRED",
      );
    }

    // 4️⃣ Hard delete (this triggers the pre('findOneAndDelete') hook for cascade hard delete)
    await College.findOneAndDelete({ _id: collegeId });

    securityAuditService
      .logEvent({
        eventType: "DATA_DELETION",
        category: "DATA_ACCESS",
        severity: "CRITICAL",
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        collegeId: college._id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        endpoint: "/api/master/:collegeId/hard-delete",
        method: "POST",
        statusCode: 200,
        metadata: {
          action: "HARD_DELETE_COLLEGE",
          collegeId: college._id,
          collegeCode: college.code,
          collegeName: college.name,
        },
      })
      .catch((err) => console.error("Security audit log failed:", err.message));

    res.json({
      message:
        "College and ALL related data PERMANENTLY deleted. This action cannot be undone.",
      deletedCollege: {
        id: college._id,
        name: college.name,
        code: college.code,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SUPER ADMIN: Get Single College with Full Stats
========================================================= */
exports.getCollegeById = async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Get College
    const college = await College.findById(collegeId);

    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Collect Stats (Parallel for performance)
    const [
      totalDepartments,
      totalCourses,
      totalTeachers,
      totalStudents,
      approvedStudents,
      totalTimetables,
      totalAttendanceSessions,
    ] = await Promise.all([
      Department.countDocuments({ college_id: collegeId }),
      Course.countDocuments({ college_id: collegeId }),
      Teacher.countDocuments({ college_id: collegeId }),
      Student.countDocuments({ college_id: collegeId }),
      Student.countDocuments({
        college_id: collegeId,
        status: "APPROVED",
      }),
      Timetable.countDocuments({ college_id: collegeId }),
      AttendanceSession.countDocuments({ college_id: collegeId }),
    ]);

    // 3️⃣ Also fetch college admin email
    const adminUser = await User.findOne({
      college_id: collegeId,
      role: "COLLEGE_ADMIN",
    }).select("email");

    // 4️⃣ Response
    res.json({
      message: "College details fetched successfully",
      college: {
        id: college._id,
        name: college.name,
        code: college.code,
        email: college.email,
        contactNumber: college.contactNumber,
        address: college.address,
        establishedYear: college.establishedYear,
        logo: college.logo,
        logoDocumentId: college.logoDocumentId,
        registrationUrl: college.registrationUrl,
        registrationQr: college.registrationQr,
        registrationQrDocumentId: college.registrationQrDocumentId,
        adminEmail: adminUser?.email || "",
        createdAt: college.createdAt,
      },
      stats: {
        totalDepartments,
        totalCourses,
        totalTeachers,
        totalStudents,
        approvedStudents,
        totalTimetables,
        totalAttendanceSessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * SUPER ADMIN: Send Email to College Admin
 */
exports.sendEmailToCollegeAdmin = async (req, res, next) => {
  try {
    const { collegeId, subject, message } = req.body;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Get college details
    const college = await College.findById(collegeId);
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Get college admin email
    const adminUser = await User.findOne({
      college_id: collegeId,
      role: "COLLEGE_ADMIN",
    });

    if (!adminUser || !adminUser.email) {
      throw new AppError(
        "College admin email not found",
        404,
        "ADMIN_EMAIL_NOT_FOUND",
      );
    }

    // 4️⃣ Send email
    await sendEmailToCollegeAdmin({
      to: adminUser.email,
      collegeName: college.name,
      subject:
        subject || `Welcome to ${college.name} - Smart College Management`,
      message: message || "No message provided",
      collegeId,
    });

    res.json({
      success: true,
      message: `Email sent successfully to college admin at ${adminUser.email}`,
      data: {
        collegeName: college.name,
        adminEmail: adminUser.email,
        subject:
          subject || `Regarding ${college.name} - Smart College Management`,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.markSetupComplete = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    if (!collegeId) {
      throw new AppError("College ID not found in request", 400, "MISSING_COLLEGE_ID");
    }

    // Validate minimum onboarding prerequisites
    const [deptCount, courseCount, feeCount, emailConfig] = await Promise.all([
      Department.countDocuments({ college_id: collegeId }),
      Course.countDocuments({ college_id: collegeId }),
      FeeStructure.countDocuments({ college_id: collegeId }),
      CollegeEmailConfig.getActiveConfig(collegeId),
    ]);

    const missing = [];
    if (deptCount === 0) missing.push("at least one department");
    if (courseCount === 0) missing.push("at least one course");
    if (feeCount === 0) missing.push("at least one fee structure");
    if (!emailConfig) missing.push("email configuration");

    if (missing.length > 0) {
      throw new AppError(
        "Cannot finish setup. Please complete: " + missing.join(", "),
        400,
        "SETUP_INCOMPLETE"
      );
    }

    await College.findByIdAndUpdate(collegeId, { setupCompleted: true });

    res.json({
      success: true,
      message: "College setup marked as complete. All required steps verified.",
    });
  } catch (error) {
    next(error);
  }
};
