const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema({
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
    category: {
      type: String,
      enum: ["GEN", "OBC", "SC", "ST", "EWS"],
      required: true,
    },
    // Optional: target academic year (e.g. "2025-2026") for year-specific fee structures
    academicYear: {
      type: String,
      default: null,
    },
    totalFee: {
      type: Number,
      required: true,
    },
installments: [
        {
          name: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
          dueDate: {
            type: Date,
            required: true,
          },
          // Installment order for sequential payment enforcement
          order: {
            type: Number,
            required: true,
          },
        },
      ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeeStructure", feeStructureSchema);