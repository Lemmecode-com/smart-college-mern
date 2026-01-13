const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },
    subjectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject"
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);
