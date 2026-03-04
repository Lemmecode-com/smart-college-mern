const mongoose = require("mongoose");
const {
  validateEmail,
  emailValidatorMessage,
  validateIndianMobile,
  mobileValidatorMessage,
  validateIndianPincode,
  pincodeValidatorMessage,
  validatePercentage,
  percentageValidatorMessage,
  validateAge,
  ageValidatorMessage,
  validateAdmissionYear,
  admissionYearValidatorMessage,
  validateYear,
  yearValidatorMessage
} = require("../utils/validators");

const { STUDENT_STATUS, CATEGORY, GENDER } = require("../utils/constants");

const studentSchema = new mongoose.Schema(
  {
    // 🔗 User Reference (Links to User collection)
    // FIX: Issue #1 - Make user_id required to ensure consistent authentication
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student must have a linked User account"],
      unique: true,
      index: true // Removed sparse - all students must have user_id
    },

    // 🔗 College Mapping
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // 👤 Personal Details
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      validate: {
        validator: validateEmail,
        message: emailValidatorMessage
      }
    },

    mobileNumber: {
      type: String,
      required: true,
      validate: {
        validator: validateIndianMobile,
        message: mobileValidatorMessage
      }
    },

    gender: {
      type: String,
      enum: Object.values(GENDER),
      required: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: (value) => validateAge(value, 14, 100),
        message: ageValidatorMessage(14, 100)
      }
    },

    // 📍 Address
    addressLine: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    pincode: {
      type: String,
      required: true,
      validate: {
        validator: validateIndianPincode,
        message: pincodeValidatorMessage
      }
    },

    // 🎓 Academic Info
    admissionYear: {
      type: Number,
      required: true,
      validate: {
        validator: validateAdmissionYear,
        message: admissionYearValidatorMessage
      }
    },

    currentSemester: {
      type: Number,
      required: true,
    },

    previousQualification: String,
    previousInstitute: String,

    // 🧾 Additional
    category: {
      type: String,
      enum: Object.values(CATEGORY),
      required: true,
    },

    nationality: {
      type: String,
      default: "Indian",
    },

    bloodGroup: String,

    alternateMobile: String,

    // 👨‍👩‍👧 Parent/Guardian Details
    fatherName: String,
    fatherMobile: String,
    motherName: String,
    motherMobile: String,

    // 📚 10th (SSC) Academic Details
    sscSchoolName: String,
    sscBoard: String,
    sscPassingYear: {
      type: Number,
      validate: {
        validator: (value) => validateYear(value, 1950, 5),
        message: yearValidatorMessage(1950, 5)
      }
    },
    sscPercentage: {
      type: Number,
      validate: {
        validator: validatePercentage,
        message: percentageValidatorMessage
      }
    },
    sscRollNumber: String,

    // 📚 12th (HSC) Academic Details
    hscSchoolName: String,
    hscBoard: String,
    hscStream: {
      type: String,
      enum: ["Science", "Commerce", "Arts", "Vocational", "Other"],
    },
    hscPassingYear: {
      type: Number,
      validate: {
        validator: (value) => validateYear(value, 1950, 5),
        message: yearValidatorMessage(1950, 5)
      }
    },
    hscPercentage: {
      type: Number,
      validate: {
        validator: validatePercentage,
        message: percentageValidatorMessage
      }
    },
    hscRollNumber: String,

    // 📎 Document Uploads (File Paths) - Backward compatibility
    sscMarksheetPath: String,
    hscMarksheetPath: String,
    passportPhotoPath: String,
    categoryCertificatePath: String,

    // 📎 Dynamic Documents - All possible document types (based on DocumentConfig)
    // These fields store file paths for documents uploaded during registration
    incomeCertificatePath: String,
    characterCertificatePath: String,
    transferCertificatePath: String,
    aadharCardPath: String,
    entranceExamScorePath: String,
    migrationCertificatePath: String,
    domicileCertificatePath: String,
    casteCertificatePath: String,
    nonCreamyLayerCertificatePath: String,
    physicallyChallengedCertificatePath: String,
    sportsQuotaCertificatePath: String,
    nriSponsorCertificatePath: String,
    gapCertificatePath: String,
    affidavitPath: String,
    
    // 📎 Generic documents storage (flexible Map for any document type)
    documents: {
      type: Map,
      of: String
    },

    // 📝 Additional Profile Fields (for profile completion)
    addressLine2: String,
    country: {
      type: String,
      default: "India"
    },
    religion: String,
    alternateMobileNumber: String,
    emergencyContactName: String,
    emergencyContactNumber: String,
    parentGuardianOccupation: String,
    parentGuardianIncome: String,
    minorityType: String, // For minority category students
    pwdDisability: String, // Percentage of disability if applicable
    hostelRequired: {
      type: Boolean,
      default: false
    },
    libraryRequired: {
      type: Boolean,
      default: true
    },

    // 🔐 System
    status: {
      type: String,
      enum: Object.values(STUDENT_STATUS),
      default: STUDENT_STATUS.PENDING,
    },

    // 🎓 Alumni Information
    alumniStatus: {
      type: Boolean,
      default: false,
    },
    alumniDate: {
      type: Date,
    },
    graduationYear: {
      type: Number,
    },

    registeredVia: {
      type: String,
      enum: ["SELF"],
      default: "SELF",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectedAt: {
      type: Date,
    },

    canReapply: {
      type: Boolean,
      default: true,
    },

    // 🎓 Promotion Management
    currentAcademicYear: {
      type: String,
      required: true,
      default: function() {
        // Format: "2024-2025"
        const year = new Date().getFullYear();
        return `${year}-${year + 1}`;
      }
    },

    isPromotionEligible: {
      type: Boolean,
      default: true,
    },

    promotionHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionHistory",
    }],

    lastPromotionDate: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Prevent duplicate registration per college
studentSchema.index({ college_id: 1, email: 1 }, { unique: true });

// ⚡ PERFORMANCE: Indexes for common queries
studentSchema.index({ college_id: 1, status: 1 }); // Filter by college and status
studentSchema.index({ college_id: 1, department_id: 1 }); // Department-wise students
studentSchema.index({ college_id: 1, course_id: 1 }); // Course-wise students
studentSchema.index({ user_id: 1 }); // Student lookup by user_id
studentSchema.index({ college_id: 1, currentSemester: 1 }); // Semester-wise students
studentSchema.index({ status: 1, admissionYear: 1 }); // Admission year filtering

module.exports = mongoose.model("Student", studentSchema);