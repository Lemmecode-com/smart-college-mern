const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    employeeId: {
      type: String,
      required: true,
    },

    designation: {
      type: String,
      required: true,
    },

    qualification: {
      type: String,
      required: true,
    },

    experienceYears: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate employeeId per college
teacherSchema.index({ college_id: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model("Teacher", teacherSchema);
