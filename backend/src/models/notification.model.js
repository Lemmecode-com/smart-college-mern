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

module.exports = mongoose.model("Notification", notificationSchema);