const DocumentConfig = require("../models/documentConfig.model");
const College = require("../models/college.model");

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
      // If no config exists, return default configuration
      const defaultDocuments = DocumentConfig.getDefaultConfig();
      return res.json({
        collegeCode,
        documents: defaultDocuments,
        isDefault: true
      });
    }

    // Return only enabled documents
    const enabledDocuments = config.documents.filter(doc => doc.enabled);

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
      // Create default config if not exists
      const college = await College.findById(college_id);
      const newConfig = await DocumentConfig.createDefaultConfig(
        college_id, 
        college.code
      );
      
      return res.json({
        config: newConfig,
        message: "Default configuration created"
      });
    }

    res.json({ config });
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
      "custom_document"
    ];

    for (const doc of documents) {
      if (!doc.type || !doc.label) {
        return res.status(400).json({ 
          message: "Each document must have a type and label" 
        });
      }
      
      if (doc.type !== "custom_document" && !allowedDocumentTypes.includes(doc.type)) {
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

    // Check if config exists
    let config = await DocumentConfig.findOne({ college_id, isActive: true });

    if (config) {
      // Update existing config
      config.documents = documents;
      config.updatedBy = userId;
      config.updatedAt = new Date();
      await config.save();
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

    res.json({
      message: "Document configuration saved successfully",
      config
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Reset to default configuration
 * POST /api/document-config/admin/college/reset
 */
exports.resetToDefault = async (req, res) => {
  try {
    const college_id = req.college_id;
    const collegeCode = req.collegeCode;
    const userId = req.user.id;

    // Delete existing config
    await DocumentConfig.findOneAndUpdate(
      { college_id },
      { isActive: false, updatedAt: new Date() }
    );

    // Create new default config
    const defaultDocuments = DocumentConfig.getDefaultConfig();
    const config = await DocumentConfig.create({
      college_id,
      collegeCode,
      documents: defaultDocuments,
      isActive: true,
      updatedBy: userId
    });

    res.json({
      message: "Configuration reset to default successfully",
      config
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Validate uploaded documents against config
 * This will be used during student registration
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

    if (errors.length > 0) {
      return res.status(400).json({
        valid: false,
        errors
      });
    }

    res.json({
      valid: true,
      message: "All required documents uploaded"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
