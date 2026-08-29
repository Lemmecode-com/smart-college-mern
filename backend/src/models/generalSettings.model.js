const mongoose = require("mongoose");

const generalSettingsSchema = new mongoose.Schema({
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
    unique: true,
    index: true,
  },
  allowMultipleLogins: {
    type: String,
    enum: ["allowed", "restricted"],
    default: "allowed",
  },
  autoDisableInactiveDays: {
    type: Number,
    default: 180,
    min: [1, "Must be at least 1 day"],
    max: [365, "Cannot exceed 365 days"],
  },
  passwordExpiryDays: {
    type: Number,
    default: 90,
    min: [1, "Must be at least 1 day"],
    max: [365, "Cannot exceed 365 days"],
  },
  minPasswordLength: {
    type: Number,
    default: 8,
    min: [6, "Minimum length is 6 characters"],
    max: [128, "Maximum length is 128 characters"],
  },
  maxLoginAttempts: {
    type: Number,
    default: 5,
    min: [3, "Minimum is 3 attempts"],
    max: [10, "Maximum is 10 attempts"],
  },
  allowDataExport: {
    type: String,
    enum: ["allowed", "restricted", "disabled"],
    default: "restricted",
  },
  backupFrequency: {
    type: String,
    enum: ["hourly", "daily", "weekly", "monthly"],
    default: "daily",
  },
  defaultTheme: {
    type: String,
    enum: ["light", "dark", "system"],
    default: "light",
  },
  dateFormat: {
    type: String,
    enum: ["DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD"],
    default: "DD-MM-YYYY",
  },
  currency: {
    type: String,
    enum: ["INR", "USD", "EUR", "GBP"],
    default: "INR",
  },
  itemsPerPage: {
    type: Number,
    enum: [10, 25, 50, 100],
    default: 25,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

generalSettingsSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

generalSettingsSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model("GeneralSettings", generalSettingsSchema);
