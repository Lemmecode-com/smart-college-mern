const DocumentConfig = require("../models/documentConfig.model");
const College = require("../models/college.model");
const { validateFile, expandAllowedFormats } = require("../utils/fileValidation");

/**
 * Normalize document configurations: expand JPG/JPEG equivalence
 * so both extensions appear when either is configured.
 * Handles both Mongoose subdocuments and plain objects.
 */
const normalizeDocuments = (documents) => {
  if (!Array.isArray(documents)) return documents;
  return documents.map((doc) => {
    // Convert Mongoose subdocuments to plain objects before spreading.
    // Spreading a Mongoose subdocument directly ({ ...doc }) only copies
    // internal Mongoose properties (__parentArray, $__, _doc, etc.) and
    // omits actual schema fields like type, enabled, label.
    const docObj = doc.toObject ? doc.toObject() : doc;
    return {
      ...docObj,
      allowedFormats: docObj.allowedFormats
        ? expandAllowedFormats(docObj.allowedFormats)
        : docObj.allowedFormats,
    };
  });
};

/**
 * Get document configuration for a college (public - used during student registration)
 * GET /api/document-config/:collegeCode
 */
exports.getDocumentConfig = async (req, res) => {
  try {
    const { collegeCode } = req.params;

    const config = await DocumentConfig.findOne({
      collegeCode,
      isActive: true
    }).select("documents collegeCode");

    if (!config) {
      // If no config exists, return empty array - admin must configure documents first
      return res.json({
        collegeCode,
        documents: [],
        isDefault: false,
        message: "No document configuration found. Please contact college admin."
      });
    }

    // Return only enabled documents from config, with JPG/JPEG normalized
    const enabledDocuments = normalizeDocuments(
      config.documents.filter(doc => doc.enabled)
    );

    res.json({
      collegeCode,
      documents: enabledDocuments,
      isDefault: false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get document configuration for logged-in college admin
 * GET /api/document-config/admin/college
 */
exports.getDocumentConfigForAdmin = async (req, res) => {
  try {
    const college_id = req.college_id;

    const config = await DocumentConfig.findOne({ 
      college_id, 
      isActive: true 
    }).populate("updatedBy", "name email");

    if (!config) {
      // Create EMPTY config if not exists - NO defaults
      const college = await College.findById(college_id);
      const newConfig = await DocumentConfig.createEmptyConfig(
        college_id,
        college.code
      );

      return res.json({
        config: newConfig,
        message: "Empty document configuration created. Admin must configure documents manually."
      });
    }

    const configObj = config.toObject();
    configObj.documents = normalizeDocuments(configObj.documents);
    res.json({ config: configObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create or update document configuration (College Admin only)
 * PUT /api/document-config/admin/college
 */
exports.upsertDocumentConfig = async (req, res) => {
  try {
    const college_id = req.college_id;
    const collegeCode = req.collegeCode;
    const { documents } = req.body;
    const userId = req.user.id;

    // Validate documents array
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        message: "Documents array is required"
      });
    }

    // Validate each document configuration
    const allowedDocumentTypes = [
      "10th_marksheet",
      "12th_marksheet",
      "passport_photo",
      "category_certificate",
      "income_certificate",
      "character_certificate",
      "transfer_certificate",
      "aadhar_card",
      "entrance_exam_score",
      "migration_certificate",
      "domicile_certificate",
      "caste_certificate",
      "non_creamy_layer_certificate",
      "physically_challenged_certificate",
      "sports_quota_certificate",
      "nri_sponsor_certificate",
      "gap_certificate",
      "affidavit"
    ];

    for (const doc of documents) {
      if (!doc.type || !doc.label) {
        return res.status(400).json({
          message: "Each document must have a type and label"
        });
      }

      // Allow any type starting with "custom_" (covers both "custom_document"
      // and dynamically generated types like "custom_1776491446976")
      if (!doc.type.startsWith("custom_") && !allowedDocumentTypes.includes(doc.type)) {
        return res.status(400).json({
          message: `Invalid document type: ${doc.type}`
        });
      }

      if (doc.maxFileSize && (doc.maxFileSize < 1 || doc.maxFileSize > 20)) {
        return res.status(400).json({
          message: "Max file size must be between 1MB and 20MB"
        });
      }

      if (doc.allowedFormats && !Array.isArray(doc.allowedFormats)) {
        return res.status(400).json({
          message: "Allowed formats must be an array"
        });
      }
    }

    // Normalize allowedFormats: expand JPG/JPEG equivalence so both
    // extensions are stored when either is configured.
    const { expandAllowedFormats } = require("../utils/fileValidation");
    for (const doc of documents) {
      if (doc.allowedFormats && Array.isArray(doc.allowedFormats)) {
        doc.allowedFormats = expandAllowedFormats(doc.allowedFormats);
      }
    }

    // Check if config exists
    let config = await DocumentConfig.findOne({ college_id, isActive: true });

    if (config) {
      // Update existing config
      config.documents = documents;
      config.updatedBy = userId;
      config.updatedAt = new Date();
      await config.save();
    } else {
      // Check if there's an inactive config
      const inactiveConfig = await DocumentConfig.findOne({ college_id, isActive: false });
      
      if (inactiveConfig) {
        // Reactivate and update the inactive config
        inactiveConfig.documents = documents;
        inactiveConfig.updatedBy = userId;
        inactiveConfig.isActive = true;
        inactiveConfig.updatedAt = new Date();
        await inactiveConfig.save();
        config = inactiveConfig;
      } else {
        // Create new config
        config = await DocumentConfig.create({
          college_id,
          collegeCode,
          documents,
          isActive: true,
          updatedBy: userId
        });
      }
    }

    res.json({
      message: "Document configuration saved successfully",
      config
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Reset to empty configuration (remove all documents)
 * POST /api/document-config/admin/college/reset
 */
exports.resetToEmpty = async (req, res) => {
  try {
    const college_id = req.college_id;
    const collegeCode = req.collegeCode;
    const userId = req.user.id;

    // Soft-delete existing active config
    await DocumentConfig.findOneAndUpdate(
      { college_id, isActive: true },
      { isActive: false, updatedAt: new Date() }
    );

    // Create a brand new EMPTY config (no documents)
    const config = await DocumentConfig.create({
      college_id,
      collegeCode,
      documents: [],
      isActive: true
    });

    res.json({
      message: "Configuration reset to empty successfully. No documents are required.",
      config
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Validate uploaded documents against config
 * This will be used during student registration
 * Validates both mandatory documents AND file formats (extension + MIME type)
 */
exports.validateDocuments = async (req, res) => {
  try {
    const { collegeCode, uploadedFiles } = req.body;

    const config = await DocumentConfig.findOne({ 
      collegeCode, 
      isActive: true 
    });

    if (!config) {
      return res.json({ valid: true, message: "Using default configuration" });
    }

    const errors = [];
    const enabledDocs = config.documents.filter(doc => doc.enabled);

    // Check mandatory documents
    for (const docConfig of enabledDocs) {
      if (docConfig.mandatory && !uploadedFiles[docConfig.type]) {
        errors.push({
          type: docConfig.type,
          label: docConfig.label,
          message: `${docConfig.label} is mandatory`
        });
      }
    }

    // Validate file formats (extension + MIME type) for uploaded files
    for (const docConfig of enabledDocs) {
      const file = uploadedFiles[docConfig.type];
      if (!file) continue;

      const originalName = file.originalname || file.name || file.fileName;
      const mimeType = file.mimetype || file.mimeType || file.type;

      if (originalName && mimeType) {
        const result = validateFile(
          originalName,
          mimeType,
          docConfig.allowedFormats || []
        );
        if (!result.valid) {
          errors.push({
            type: docConfig.type,
            label: docConfig.label,
            message: result.error
          });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        valid: false,
        errors
      });
    }

    res.json({
      valid: true,
      message: "All required documents uploaded and validated"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};