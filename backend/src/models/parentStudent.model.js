const mongoose = require("mongoose");

const parentStudentSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    occupation: String,
    phone: String,

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    }
  },
  { timestamps: true }
);

// One student → one parent
parentStudentSchema.index(
  { studentId: 1 },
  { unique: true }
);

module.exports = mongoose.model("ParentStudent", parentStudentSchema);
