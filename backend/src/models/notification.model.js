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

    // 🎯 Target audience
    target: {
      type: String,
      enum: ["ALL", "STUDENTS"],
      required: true,
    },

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

module.exports = mongoose.model("Notification", notificationSchema);