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

    // Auto-calculated from durationSemesters — never set directly by clients
    durationYears: {
      type: Number,
      required: [true, "Duration in years is required"],
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
      required: [true, "Maximum Students is required"],
      min: [1, "Maximum Students must be greater than 0"],
      validate: {
        validator: Number.isInteger,
        message: "Maximum Students must be a whole number"
      }
    },

    yearLabels: {
      type: [String],
      default: undefined,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// Shared calculation — single source of truth for the formula
function calcDurationYears(semesters) {
  return Math.ceil(semesters / 2);
}

// Fires on Course.create() and course.save()
courseSchema.pre('save', function() {
  if (this.durationSemesters) {
    this.durationYears = calcDurationYears(this.durationSemesters);
  }
});

// Fires on Course.findOneAndUpdate() / Course.updateOne() etc.
courseSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();

  // Strip any client-supplied durationYears — backend owns this field
  if (update.durationYears !== undefined) delete update.durationYears;
  if (update.$set && update.$set.durationYears !== undefined) delete update.$set.durationYears;

  // Recalculate whenever durationSemesters is being changed
  const incomingSemesters = update.durationSemesters ?? update.$set?.durationSemesters;
  if (incomingSemesters !== undefined) {
    const years = calcDurationYears(Number(incomingSemesters));
    update.$set = update.$set || {};
    update.$set.durationYears = years;
    // Remove top-level key if it was set there to avoid Mongoose conflict
    delete update.durationSemesters;
    update.$set.durationSemesters = Number(incomingSemesters);
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