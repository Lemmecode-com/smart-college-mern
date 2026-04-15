const mongoose = require("mongoose");

const documentFieldSchema = new mongoose.Schema({
  // Document type identifier (e.g., "10th_marksheet", "category_certificate")
  type: {
    type: String,
    required: true,
    trim: true
  },
  
  // Display label for the document (e.g., "10th Marksheet", "Entrance Exam Score")
  label: {
    type: String,
    required: true,
    trim: true
  },
  
  // Whether this document is enabled for this college
  enabled: {
    type: Boolean,
    default: true
  },
  
  // Whether this document is mandatory for registration
  mandatory: {
    type: Boolean,
    default: false
  },
  
  // Allowed file formats (e.g., ["pdf", "jpg", "png"])
  allowedFormats: {
    type: [String],
    default: ["pdf", "jpg", "jpeg", "png"]
  },
  
  // Maximum file size in MB
  maxFileSize: {
    type: Number,
    default: 5, // 5MB default
    min: 1,
    max: 20
  },
  
  // Description/help text for students
  description: {
    type: String,
    default: ""
  },
  
  // Display order in the form
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const documentConfigSchema = new mongoose.Schema({
  // College reference
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
    unique: true
  },
  
  // College code for easy reference
  collegeCode: {
    type: String,
    required: true
  },
  
  // List of document configurations
  documents: [documentFieldSchema],
  
  // Whether config is active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Last updated by (admin user)
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  // Last updated at
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
documentConfigSchema.index({ college_id: 1, isActive: 1 });

// Static method to get AVAILABLE document templates (NOT enabled by default)
// These are just templates/suggestions - admin must explicitly enable them
documentConfigSchema.statics.getAvailableDocumentTemplates = function() {
  return [
    {
      type: "10th_marksheet",
      label: "10th Marksheet",
      enabled: false,        // ✅ NOT enabled by default
      mandatory: false,      // ✅ NOT mandatory by default
      allowedFormats: ["pdf", "jpg", "png"],
      maxFileSize: 5,
      description: "Upload your 10th standard marksheet/certificate",
      order: 1
    },
    {
      type: "12th_marksheet",
      label: "12th Marksheet",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf", "jpg", "png"],
      maxFileSize: 5,
      description: "Upload your 12th standard marksheet/certificate",
      order: 2
    },
    {
      type: "passport_photo",
      label: "Passport Size Photo",
      enabled: false,
      mandatory: false,
      allowedFormats: ["jpg", "jpeg", "png"],
      maxFileSize: 2,
      description: "Recent passport size photograph (max 2MB)",
      order: 3
    },
    {
      type: "category_certificate",
      label: "Category Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf", "jpg", "png"],
      maxFileSize: 3,
      description: "SC/ST/OBC/EWS certificate (if applicable)",
      order: 4
    },
    {
      type: "income_certificate",
      label: "Income Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Family income certificate",
      order: 5
    },
    {
      type: "character_certificate",
      label: "Character Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Character certificate from previous institution",
      order: 6
    },
    {
      type: "transfer_certificate",
      label: "Transfer Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "TC from previous school/college",
      order: 7
    },
    {
      type: "aadhar_card",
      label: "Aadhar Card",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf", "jpg", "png"],
      maxFileSize: 3,
      description: "Aadhar card for identity verification",
      order: 8
    },
    {
      type: "entrance_exam_score",
      label: "Entrance Exam Score Card",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "JEE/NEET/CUET or other entrance exam score card",
      order: 9
    },
    {
      type: "migration_certificate",
      label: "Migration Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Migration certificate from previous board/university",
      order: 10
    },
    {
      type: "domicile_certificate",
      label: "Domicile Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Domicile/residence certificate",
      order: 11
    },
    {
      type: "caste_certificate",
      label: "Caste Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Caste certificate (if applicable)",
      order: 12
    },
    {
      type: "non_creamy_layer_certificate",
      label: "Non-Creamy Layer Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Non-creamy layer certificate (for OBC)",
      order: 13
    },
    {
      type: "physically_challenged_certificate",
      label: "Physically Challenged Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Disability certificate (if applicable)",
      order: 14
    },
    {
      type: "sports_quota_certificate",
      label: "Sports Quota Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Sports quota certificate (if applicable)",
      order: 15
    },
    {
      type: "nri_sponsor_certificate",
      label: "NRI Sponsor Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "NRI sponsorship certificate",
      order: 16
    },
    {
      type: "gap_certificate",
      label: "Gap Certificate",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Gap year affidavit/certificate",
      order: 17
    },
    {
      type: "affidavit",
      label: "Affidavit",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf"],
      maxFileSize: 3,
      description: "Any required affidavit",
      order: 18
    },
    {
      type: "custom_document",
      label: "Custom Document",
      enabled: false,
      mandatory: false,
      allowedFormats: ["pdf", "jpg", "png"],
      maxFileSize: 5,
      description: "Upload any other document",
      order: 19
    }
  ];
};

// Static method to create EMPTY config for a college (NO defaults)
// Admin must manually configure documents based on their needs
documentConfigSchema.statics.createEmptyConfig = async function(college_id, collegeCode) {
  const existingConfig = await this.findOne({ college_id });

  if (existingConfig) {
    return existingConfig;
  }

  // Create EMPTY config - admin must configure documents manually
  const config = await this.create({
    college_id,
    collegeCode,
    documents: [],  // ✅ Empty array - NO default documents
    isActive: true
  });

  return config;
};

module.exports = mongoose.model("DocumentConfig", documentConfigSchema);