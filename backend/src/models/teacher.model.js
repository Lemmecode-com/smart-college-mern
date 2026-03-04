const mongoose = require("mongoose");
const {
  validateEmail,
  emailValidatorMessage,
  validateIndianMobile,
  mobileValidatorMessage
} = require("../utils/validators");

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

    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: validateEmail,
        message: emailValidatorMessage
      }
    },

    mobileNumber: {
      type: String,
      // required: true,  // Made optional - not all teachers have mobile numbers
      validate: {
        validator: function(v) {
          // Only validate if mobileNumber is provided
          if (!v) return true;
          return validateIndianMobile(v);
        },
        message: mobileValidatorMessage
      }
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
      min: [0, "Experience years cannot be negative"],
      max: [50, "Experience years cannot exceed 50"]
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
  },
  { timestamps: true },
);

// Prevent duplicate employeeId per college
teacherSchema.index({ college_id: 1, employeeId: 1 }, { unique: true });

// ⚡ PERFORMANCE: Indexes for common queries
teacherSchema.index({ college_id: 1, status: 1 }); // Filter by college and status
teacherSchema.index({ college_id: 1, department_id: 1 }); // Department-wise teachers
teacherSchema.index({ user_id: 1 }); // Teacher lookup by user_id
teacherSchema.index({ email: 1 }); // Email lookup
teacherSchema.index({ mobileNumber: 1 }); // Mobile number lookup

module.exports = mongoose.model("Teacher", teacherSchema);