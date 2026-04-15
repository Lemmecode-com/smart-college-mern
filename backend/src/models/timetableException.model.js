const mongoose = require("mongoose");

const TimetableExceptionSchema = new mongoose.Schema(
  {
    // ================= REFERENCES =================

    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true,
    },

    timetable_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: true,
      index: true,
    },

    slot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimetableSlot",
      // Optional: If null, applies to all slots on that date (for bulk holidays)
      index: true,
    },

    // ================= EXCEPTION DETAILS =================

    exceptionDate: {
      type: Date,
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "HOLIDAY", // College-wide or department holiday
        "CANCELLED", // Class cancelled (teacher absent, etc.)
        "EXTRA", // Makeup/additional class
        "RESCHEDULED", // Moved to different date/time
        "ROOM_CHANGE", // Room changed for specific date
        "TEACHER_CHANGE", // Substitute teacher for specific date
        "SPECIAL_EVENT", // Guest lecture, workshop, etc.
        "EXAM", // Exam schedule (replaces regular class)
      ],
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
      default: "PENDING",
      index: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // ================= RESCHEDULING FIELDS =================

    // If class is moved to another date
    rescheduledTo: {
      type: Date,
    },

    // If class is moved to different slot (same date, different time)
    rescheduledSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimetableSlot",
    },

    // For EXTRA classes on non-working days or additional sessions
    extraSlot: {
      startTime: String,
      endTime: String,
      subject_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
      teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
      room: String,
    },

    // For ROOM_CHANGE exceptions
    newRoom: String,

    // For TEACHER_CHANGE exceptions
    substituteTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },

    // ================= APPROVAL WORKFLOW =================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: Date,

    rejectionReason: String,

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectedAt: Date,

    // ================= NOTIFICATION =================

    notifyAffected: {
      type: Boolean,
      default: true,
    },

    notificationsSent: {
      type: Boolean,
      default: false,
    },

    // ================= METADATA =================

    notes: String,

    attachments: [String], // File paths (e.g., doctor's certificate for leave)

    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurringPattern: {
      frequency: {
        type: String,
        enum: ["WEEKLY", "MONTHLY", "CUSTOM"],
      },
      interval: {
        type: Number,
        default: 1,
      },
      days: [String], // e.g., ["MON", "WED", "FRI"]
      endDate: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ================= INDEXES =================

// Compound index for fast exception lookups by timetable and date
TimetableExceptionSchema.index({
  timetable_id: 1,
  exceptionDate: 1,
  type: 1,
});

// Index for finding all exceptions on a specific date (college-wide view)
TimetableExceptionSchema.index({
  college_id: 1,
  exceptionDate: 1,
});

// Index for status-based queries (pending approvals)
TimetableExceptionSchema.index({
  college_id: 1,
  status: 1,
  exceptionDate: 1,
});

// Index for teacher-specific exceptions
TimetableExceptionSchema.index({
  "extraSlot.teacher_id": 1,
  exceptionDate: 1,
});

TimetableExceptionSchema.index({
  substituteTeacher: 1,
  exceptionDate: 1,
});

// Index for slot-specific exceptions
TimetableExceptionSchema.index({
  slot_id: 1,
  exceptionDate: 1,
});

// Index for status-based queries (standalone)
TimetableExceptionSchema.index({ status: 1 });

// ================= PRE-SAVE VALIDATION =================

TimetableExceptionSchema.pre("save", async function () {
  // Validate RESCHEDULED type has rescheduledTo
  if (this.type === "RESCHEDULED" && !this.rescheduledTo) {
    throw new Error("RESCHEDULED exception must have rescheduledTo date");
  }

  // Validate EXTRA type has extraSlot
  if (this.type === "EXTRA" && !this.extraSlot) {
    throw new Error("EXTRA exception must have extraSlot details");
  }

  // Validate EXTRA has required fields
  if (this.type === "EXTRA" && this.extraSlot) {
    if (!this.extraSlot.startTime || !this.extraSlot.endTime) {
      throw new Error("EXTRA exception must have startTime and endTime");
    }
    if (!this.extraSlot.subject_id) {
      throw new Error("EXTRA exception must have subject_id");
    }
    if (!this.extraSlot.teacher_id) {
      throw new Error("EXTRA exception must have teacher_id");
    }
  }

  // Validate APPROVED status has approver info
  if (this.status === "APPROVED" && !this.approvedBy) {
    throw new Error("APPROVED exception must have approvedBy");
  }

  // Validate REJECTED status has rejection reason and rejectedBy
  if (this.status === "REJECTED") {
    if (!this.rejectionReason) {
      throw new Error("REJECTED exception must have rejectionReason");
    }
    if (!this.rejectedBy) {
      throw new Error("REJECTED exception must have rejectedBy");
    }
  }

  // Validate type-specific required fields
  if (this.type === "TEACHER_CHANGE" && !this.substituteTeacher) {
    throw new Error("TEACHER_CHANGE exception must have substituteTeacher");
  }

  if (this.type === "ROOM_CHANGE" && !this.newRoom) {
    throw new Error("ROOM_CHANGE exception must have newRoom");
  }

  // Validate dates: rescheduledTo should be in the future
  if (this.rescheduledTo && this.rescheduledTo < new Date()) {
    // Allow past dates for historical records, skip validation
  }

  // Validate exceptionDate is not too far in the future (> 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (this.exceptionDate > oneYearFromNow) {
    throw new Error("Exception date cannot be more than 1 year in the future");
  }

  // Validate exceptionDate is not in the distant past (> 1 year ago)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (this.exceptionDate < oneYearAgo && !this.isNew) {
    // Only warn for updates, allow historical records
    // Silently skip validation for existing records
  }

  // No next() call needed for async pre-save hooks - just return
});

// ================= INSTANCE METHODS =================

TimetableExceptionSchema.methods.approve = function (userId) {
  this.status = "APPROVED";
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

TimetableExceptionSchema.methods.reject = function (userId, reason) {
  this.status = "REJECTED";
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

TimetableExceptionSchema.methods.markCompleted = function () {
  this.status = "COMPLETED";
  return this.save();
};

// ================= STATIC METHODS =================

TimetableExceptionSchema.statics.findByDateRange = function (
  collegeId,
  timetableId,
  startDate,
  endDate,
) {
  return this.find({
    college_id: collegeId,
    timetable_id: timetableId,
    exceptionDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    status: { $in: ["APPROVED", "COMPLETED"] },
    isActive: true,
  }).sort({ exceptionDate: 1, type: 1 });
};

TimetableExceptionSchema.statics.findPendingApprovals = function (collegeId) {
  return this.find({
    college_id: collegeId,
    status: "PENDING",
    isActive: true,
  }).sort({ exceptionDate: 1, createdAt: -1 });
};

// ================= EXPORT =================

module.exports = mongoose.model("TimetableException", TimetableExceptionSchema);
