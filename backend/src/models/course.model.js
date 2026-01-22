const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    code: {
      type: String,
      required: true,
      uppercase: true
    },

    type: {
      type: String,
      enum: ["THEORY", "PRACTICAL", "BOTH"],
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    },

    programLevel: {
      type: String,
      enum: ["UG", "PG", "DIPLOMA", "PHD"],
      required: true
    },

    semester: {
      type: Number,
      required: true
    },

    credits: {
      type: Number,
      required: true
    },

    maxStudents: {
      type: Number,
      required: true
    },

    coordinator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

courseSchema.index(
  { college_id: 1, department_id: 1, code: 1 },
  { unique: true }
);

module.exports = mongoose.model("Course", courseSchema);
