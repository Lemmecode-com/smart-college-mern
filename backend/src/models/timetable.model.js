const mongoose = require("mongoose");
const TimetableSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    semester: {
      type: Number,
      required: true,
    },

    academicYear: {
      type: String, // "2025-2026"
      required: true,
      validate: {
        validator: function (value) {
          // Validate format: YYYY-YYYY (e.g., "2025-2026")
          return /^\d{4}-\d{4}$/.test(value);
        },
        message: "academicYear must be in YYYY-YYYY format (e.g., '2025-2026')",
      },
    },

    name: {
      type: String,
      required: true, // human readable
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher", // HOD
    },

    // ================= DATE-WISE SCHEDULING FIELDS =================

    startDate: {
      type: Date,
      // NOTE: During migration, existing timetables will get default values
      // New timetables MUST have startDate and endDate
      validate: {
        validator: function (value) {
          // If endDate is also set, ensure startDate < endDate
          if (this.endDate && value) {
            return value < this.endDate;
          }
          return true;
        },
        message: "startDate must be before endDate",
      },
    },

    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          // If startDate is also set, ensure endDate > startDate
          if (this.startDate && value) {
            return value > this.startDate;
          }
          return true;
        },
        message: "endDate must be after startDate",
      },
    },

    workingDays: {
      type: [String],
      enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      default: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "workingDays must be a non-empty array",
      },
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata", // IST for Indian colleges
      trim: true,
    },

    // ================= METADATA =================

    metadata: {
      type: Object,
      default: {},
      // Can store: { isExamSchedule: false, specialNotes: "", academicCalendarId: ObjectId }
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ================= INDEXES =================

// Unique constraint: One timetable per department/course/semester/year
TimetableSchema.index(
  {
    college_id: 1,
    department_id: 1,
    course_id: 1,
    semester: 1,
    academicYear: 1,
  },
  { unique: true },
);

// Index for date-range queries (finding active timetables)
TimetableSchema.index({ college_id: 1, startDate: 1, endDate: 1, status: 1 });

// Index for finding timetables active on a specific date
TimetableSchema.index({ startDate: 1, endDate: 1, status: 1 });

// Index for department-based queries
TimetableSchema.index({ department_id: 1, status: 1, createdAt: -1 });

// Index for course-based queries (student timetable lookups)
TimetableSchema.index({ course_id: 1, status: 1 });

// ================= PRE-SAVE VALIDATION =================

TimetableSchema.pre("save", function (next) {
  // Validate date range length (max 2 years)
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffYears = (end - start) / (1000 * 60 * 60 * 24 * 365);

    if (diffYears > 2) {
      return next(new Error("Timetable date range cannot exceed 2 years"));
    }
  }

  // Trim metadata
  if (this.metadata && typeof this.metadata === "object") {
    Object.keys(this.metadata).forEach((key) => {
      if (typeof this.metadata[key] === "string") {
        this.metadata[key] = this.metadata[key].trim();
      }
    });
  }

  next();
});

module.exports = mongoose.model("Timetable", TimetableSchema);
