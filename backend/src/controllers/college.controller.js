const College = require("../models/college.model");
const AppError = require("../utils/AppError");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const FeeStructure = require("../models/feeStructure.model");
const User = require("../models/user.model");
const CollegeEmailConfig = require("../models/collegeEmailConfig.model");
const ApiResponse = require("../utils/ApiResponse");
const { getStorageProvider } = require("../services/storage");
const DocumentService = require("../services/document.service");

/**
 * GET ALL COLLEGES (SUPER ADMIN ONLY)
 * For Security Audit filter dropdown
 */
exports.getAllColleges = async (req, res, next) => {
  try {
    const colleges = await College.find({})
      .select('name code email _id')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: colleges
    });
  } catch (error) {
    next(error);
  }
};

// COLLEGE ADMIN: View own college only
exports.getMyCollege = async (req, res, next) => {
  try {
    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }
    
    const college = await College.findById(req.college_id);
    
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    const responseData = college.toObject();
    responseData.documentRefs = {
      logo: college.logoDocumentId ? {
        documentId: college.logoDocumentId,
        documentType: "logo",
        downloadUrl: `/api/documents/${college.logoDocumentId}/download`,
      } : null,
      registrationQr: college.registrationQrDocumentId ? {
        documentId: college.registrationQrDocumentId,
        documentType: "registration_qr",
        downloadUrl: `/api/documents/${college.registrationQrDocumentId}/download`,
      } : null,
    };

    // Also include persistent documentRefs array
    if (!responseData.documentRefsArray) {
      responseData.documentRefsArray = college.documentRefs || [];
    }
    
    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE COLLEGE PROFILE (ONLY COLLEGE ADMIN)
 */
exports.updateMyCollegeProfile = async (req, res) => {
  try {
    const collegeId = req.college_id;

    // Allowed fields (whitelist)
    const allowedUpdates = [
      "name",
      "code",
      "email",
      "contactNumber",
      "address",
      "establishedYear",
      "logo"
    ];

    const updates = {};

    // Pick only allowed fields from body (skip logo — it comes from multer upload)
    allowedUpdates.forEach((field) => {
      if (field === 'logo') return;
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

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

      const Document = require("../models/document.model");
      const existingDoc = await Document.findOne({
        ownerType: "College",
        ownerId: collegeId,
        documentType: "logo",
        status: "ACTIVE",
      });

      if (existingDoc) {
        await Document.findOneAndUpdate(
          { documentId: existingDoc.documentId },
          { status: "ARCHIVED", archivedAt: new Date() }
        ).catch(() => {});
      }

      const document = await DocumentService.createDocument({
        ownerType: "College",
        ownerId: collegeId,
        documentType: "logo",
        fileBuffer: req.file.buffer,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user.id,
        category: "college-logo",
        storageKey: uploadResult.storagePath,
      });

       updates.logo = uploadResult.storagePath;
       updates.logoDocumentId = document.documentId;
       
       // Update documentRefs array
       const existingRefs = await College.findById(collegeId).select("documentRefs").lean();
       const refs = existingRefs.documentRefs || [];
       const logoRefIdx = refs.findIndex(r => r.documentType === "logo");
       const newRef = { documentId: document.documentId, documentType: "logo" };
       if (logoRefIdx >= 0) {
         refs[logoRefIdx] = newRef;
       } else {
         refs.push(newRef);
       }
       updates.documentRefs = refs;
     }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update"
      });
    }

    const college = await College.findByIdAndUpdate(
      collegeId,
      { $set: updates },
      { new: true }
    ).select("-__v");

    if (!college) {
      return res.status(404).json({
        message: "College not found"
      });
    }

    ApiResponse.success(
      res,
      { college },
      "College profile updated successfully",
    );

  } catch (error) {
    console.error("Update college profile error:", error);
    ApiResponse.error(
      res,
      error.message || "Internal server error",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
};

/**
 * GET /api/college/setup-status
 * Returns which onboarding steps are actually complete
 */
exports.getSetupStatus = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    const [deptCount, courseCount, feeCount, staffCount, emailConfig] = await Promise.all([
      Department.countDocuments({ college_id: collegeId }),
      Course.countDocuments({ college_id: collegeId }),
      FeeStructure.countDocuments({ college_id: collegeId }),
      User.countDocuments({ college_id: collegeId, role: { $nin: ["SUPER_ADMIN", "STUDENT"] } }),
      CollegeEmailConfig.getActiveConfig(collegeId),
    ]);

    const college = await College.findById(collegeId).select("setupCompleted");

    res.json({
      success: true,
      data: {
        setupCompleted: college.setupCompleted || false,
        emailConfigured: !!emailConfig,
        departmentsCreated: deptCount,
        coursesCreated: courseCount,
        feeStructuresCreated: feeCount,
        staffAdded: staffCount,
        steps: {
          email: !!emailConfig,
          departments: deptCount > 0,
          courses: courseCount > 0,
          fees: feeCount > 0,
          staff: staffCount > 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};