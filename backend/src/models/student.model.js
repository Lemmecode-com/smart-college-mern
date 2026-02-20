const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // 🔗 User Reference (Links to User collection)
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional for backward compatibility during migration
      unique: true,
      index: true,
      sparse: true // Allows documents without user_id during migration
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
    },

    mobileNumber: {
      type: String,
      required: true,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
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
    },

    // 🎓 Academic Info
    admissionYear: {
      type: Number, 
      required: true,
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
      enum: ["GEN", "OBC", "SC", "ST", "OTHER"],
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
    sscPassingYear: Number,
    sscPercentage: Number,
    sscRollNumber: String,

    // 📚 12th (HSC) Academic Details
    hscSchoolName: String,
    hscBoard: String,
    hscStream: {
      type: String,
      enum: ["Science", "Commerce", "Arts", "Vocational", "Other"],
    },
    hscPassingYear: Number,
    hscPercentage: Number,
    hscRollNumber: String,

    // 📎 Document Uploads (File Paths) - Backward compatibility
    sscMarksheetPath: String,
    hscMarksheetPath: String,
    passportPhotoPath: String,
    categoryCertificatePath: String,

    // 📎 Dynamic Documents (flexible storage for all document types)
    documents: {
      type: Map,
      of: String
    },

    // 🔐 System
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
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
  },
  { timestamps: true },
);

// Prevent duplicate registration per college
studentSchema.index({ college_id: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("Student", studentSchema);
