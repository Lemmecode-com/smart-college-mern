const mongoose = require("mongoose");

const notificationReadSchema = new mongoose.Schema(
  {
    notification_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role: {
      type: String,
      enum: ["COLLEGE_ADMIN", "TEACHER", "STUDENT"],
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent duplicate read entry
notificationReadSchema.index(
  { notification_id: 1, user_id: 1 },
  { unique: true }
);

module.exports = mongoose.model("NotificationRead", notificationReadSchema);