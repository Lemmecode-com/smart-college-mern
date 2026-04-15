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

    // ✅ CHANGED: From 'semester' to 'durationSemesters' - represents total semesters in program
    durationSemesters: {
      type: Number,
      required: true,
      min: [1, "Duration must be at least 1 semester"],
      max: [8, "Duration cannot exceed 8 semesters"]
    },

    // ✅ NEW: Total years in program (auto-calculated from semesters if not provided)
    durationYears: {
      type: Number,
      min: [1, "Duration must be at least 1 year"],
      max: [4, "Duration cannot exceed 4 years"]
    },

    credits: {
      type: Number,
      required: true,
      min: [0, "Credits cannot be negative"]
    },

    maxStudents: {
      type: Number,
      required: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// ✅ NEW: Auto-calculate durationYears from durationSemesters before saving
courseSchema.pre('save', async function(next) {
  try {
    // Always calculate durationYears if durationSemesters is set
    if (this.durationSemesters) {
      // Calculate years: Sem 1-2 = Year 1, Sem 3-4 = Year 2, etc.
      this.durationYears = Math.ceil(this.durationSemesters / 2);
    }
  } catch (error) {
    // Pass error to Mongoose
    throw error;
  }
});

// Indexes for performance
courseSchema.index(
  { college_id: 1, department_id: 1, code: 1 },
  { unique: true }
);

// ✅ NEW: Index for duration-based queries
courseSchema.index({ college_id: 1, durationSemesters: 1 });
courseSchema.index({ college_id: 1, durationYears: 1 });

module.exports = mongoose.model("Course", courseSchema);