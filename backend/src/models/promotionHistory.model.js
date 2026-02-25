const mongoose = require("mongoose");

const promotionHistorySchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },

  // Promotion details
  fromSemester: {
    type: Number,
    required: true,
  },
  toSemester: {
    type: Number,
    required: true,
  },
  fromAcademicYear: {
    type: String,
    required: true,
  },
  toAcademicYear: {
    type: String,
    required: true,
  },

  // Fee status at the time of promotion
  feeStatus: {
    type: String,
    enum: ["FULLY_PAID", "PARTIALLY_PAID", "PENDING"],
    required: true,
  },
  totalFee: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    required: true,
  },
  pendingAmount: {
    type: Number,
    default: 0,
  },

  // Promotion decision
  promotedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  promotedByName: {
    type: String,
    required: true,
  },
  promotionDate: {
    type: Date,
    default: Date.now,
  },
  remarks: {
    type: String,
    trim: true,
  },

  // Status of this promotion record
  status: {
    type: String,
    enum: ["ACTIVE", "REVERSED"],
    default: "ACTIVE",
  },
}, { timestamps: true });

// Index for quick lookup of student promotion history
promotionHistorySchema.index({ student_id: 1, promotionDate: -1 });
promotionHistorySchema.index({ college_id: 1, promotionDate: -1 });

module.exports = mongoose.model("PromotionHistory", promotionHistorySchema);
