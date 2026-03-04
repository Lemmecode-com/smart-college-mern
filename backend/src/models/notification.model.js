const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    createdByRole: {
      type: String,
      enum: ["COLLEGE_ADMIN", "TEACHER"],
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // 📢 Notification Content
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "GENERAL",
        "ACADEMIC",
        "EXAM",
        "FEE",
        "ATTENDANCE",
        "EVENT",
        "ASSIGNMENT",
        "URGENT",
      ],
      default: "GENERAL",
    },

    // 🎯 Target audience (enhanced for granular targeting - FIX: Issue #7)
    target: {
      type: String,
      enum: ["ALL", "STUDENTS", "TEACHERS", "DEPARTMENT", "COURSE", "SEMESTER", "INDIVIDUAL"],
      required: true,
      default: "ALL",
    },

    // Granular targeting fields (FIX: Issue #7 - Notification Target Audience Limitation)
    target_department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    target_course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    target_semester: {
      type: Number,
      min: 1,
      max: 8,
      default: null,
    },

    // For individual targeting (multiple users)
    target_users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // Optional metadata
    actionUrl: String, // frontend redirect
    expiresAt: Date,

    isActive: {
      type: Boolean,
      default: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// ⚡ PERFORMANCE: Indexes for common queries
notificationSchema.index({ college_id: 1, target: 1 }); // College and target filtering
notificationSchema.index({ college_id: 1, createdAt: -1 }); // Latest notifications
notificationSchema.index({ college_id: 1, isActive: 1 }); // Active notifications
notificationSchema.index({ target: 1, type: 1 }); // Target and type filtering
// New indexes for granular targeting
notificationSchema.index({ college_id: 1, target_department: 1 }); // Department targeting
notificationSchema.index({ college_id: 1, target_course: 1 }); // Course targeting
notificationSchema.index({ college_id: 1, target_semester: 1 }); // Semester targeting

module.exports = mongoose.model("Notification", notificationSchema);