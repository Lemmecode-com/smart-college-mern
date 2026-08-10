const mongoose = require("mongoose");
const {
  validateJoiningDate,
  joiningDateValidatorMessage,
  validateAge,
  ageValidatorMessage,
} = require("../utils/validators");

const staffProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
  },
  // Common fields for all staff
  designation: { type: String, default: "" },
  mobileNumber: { type: String, default: "" },
  employmentType: {
    type: String,
    enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"],
    default: "FULL_TIME",
  },
  joiningDate: {
    type: Date,
    validate: {
      validator: validateJoiningDate,
      message: joiningDateValidatorMessage,
    },
  },
  // Personal details (optional)
  gender: { type: String, enum: ["", "Male", "Female", "Other"], default: "" },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return validateAge(v, 14, 100);
      },
      message: ageValidatorMessage(14, 100),
    },
  },
  bloodGroup: {
    type: String,
    enum: ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    default: "",
  },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  pincode: { type: String, default: "" },
  // Emergency contact
  emergencyContactName: { type: String, default: "" },
  emergencyContactPhone: { type: String, default: "" },
  emergencyRelation: { type: String, default: "" },
  // Qualification & experience (useful for HOD, Principal, Exam Coordinator)
  qualification: { type: String, default: "" },
  experienceYears: { type: Number, default: 0 },
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for quick college-based queries
staffProfileSchema.index({ college_id: 1 });
staffProfileSchema.index({ user_id: 1 });

module.exports = mongoose.model("StaffProfile", staffProfileSchema);
