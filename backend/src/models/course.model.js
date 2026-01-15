const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },
    duration: {
      type: String // e.g. "3 Years", "6 Sem"
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  { timestamps: true }
);

// Prevent duplicate course names inside same department
courseSchema.index(
  { name: 1, departmentId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Course", courseSchema);
