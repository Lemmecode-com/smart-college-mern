const mongoose = require("mongoose");

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
  joiningDate: Date,
  // Personal details (optional)
  gender: { type: String, enum: ["Male", "Female", "Other"], default: "" },
  dateOfBirth: Date,
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
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
