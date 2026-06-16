const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: [true, "college_id is required"],
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
      index: true,
    },

    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "teacher_id is required"],
      index: true,
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "department_id is required"],
      index: true,
    },

    leaveType: {
      type: String,
      required: [true, "leaveType is required"],
      enum: {
        values: ["SICK", "CASUAL", "EMERGENCY", "OFFICIAL"],
        message: "{VALUE} is not a valid leave type",
      },
      index: true,
    },

    academicYear: {
      type: String,
      required: [true, "academicYear은 필수입니다"],
      validate: {
        validator: function (value) {
          return /^\d{4}-\d{4}$/.test(value);
        },
        message: "academicYear must be in YYYY-YYYY format (e.g., '2025-2026')",
      },
      index: true,
    },

    startDate: {
      type: Date,
      required: [true, "startDate는 필수입니다"],
      index: true,
    },

    endDate: {
      type: Date,
      required: [true, "endDate는 필수입니다"],
      index: true,
    },

    durationType: {
      type: String,
      enum: {
        values: ["FULL_DAY", "HALF_DAY_MORNING", "HALF_DAY_AFTERNOON"],
        message: "{VALUE} is not a valid duration type",
      },
      default: "FULL_DAY",
    },

    daysCount: {
      type: Number,
      required: [true, "daysCount is required"],
      min: [0.5, "daysCount cannot be less than 0.5"],
      max: [365, "daysCount cannot exceed 365"],
    },

    reason: {
      type: String,
      required: [true, "reason is required"],
      trim: true,
      maxlength: [500, "reason cannot exceed 500 characters"],
    },

    attachments: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length <= 5,
        message: "Maximum 5 attachments allowed",
      },
    },

    status: {
      type: String,
      required: true,
      enum: {
        values: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
        message: "{VALUE} is not a valid leave status",
      },
      default: "PENDING",
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "rejectionReason cannot exceed 500 characters"],
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, "cancellationReason cannot exceed 500 characters"],
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "notes cannot exceed 1000 characters"],
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "leaves",
  },
);

// ═══════════════════════════════════════════════════════════════════
//  INDEXES
// ═══════════════════════════════════════════════════════════════════

// Teacher history
LeaveSchema.index(
  { college_id: 1, teacher_id: 1, startDate: -1 },
  { name: "idx_teacher_history" },
);

// HOD pending approvals
LeaveSchema.index(
  { college_id: 1, department_id: 1, status: 1, startDate: 1 },
  { name: "idx_hod_pending" },
);

// Department reporting
LeaveSchema.index(
  { college_id: 1, department_id: 1, leaveType: 1, startDate: -1 },
  { name: "idx_dept_reporting" },
);

// Overlap detection (active leaves for same teacher)
LeaveSchema.index(
  { college_id: 1, teacher_id: 1, status: 1, startDate: 1, endDate: 1 },
  { name: "idx_overlap_check" },
);

// College-wide filter
LeaveSchema.index(
  { college_id: 1, status: 1, startDate: -1 },
  { name: "idx_college_wide_filter" },
);

// Status timeline
LeaveSchema.index(
  { status: 1, createdAt: -1 },
  { name: "idx_status_timeline" },
);

// ═══════════════════════════════════════════════════════════════════
//  PRE-SAVE VALIDATORS
// ═══════════════════════════════════════════════════════════════════

LeaveSchema.pre("save", function (next) {
  if (this.startDate > this.endDate) {
    return next(new Error("startDate must be on or before endDate"));
  }

  if (this.isModified("reason") && !this.reason?.trim()) {
    return next(new Error("reason is required"));
  }

  if (this.status === "REJECTED" && !this.rejectionReason?.trim()) {
    return next(new Error("REJECTED leave must have rejectionReason"));
  }

  if (this.status === "CANCELLED") {
    if (!this.cancelledBy) {
      return next(new Error("CANCELLED leave must have cancelledBy"));
    }
    if (!this.cancelledAt) {
      return next(new Error("CANCELLED leave must have cancelledAt"));
    }
  }

  if (this.status === "APPROVED") {
    if (!this.approvedBy) {
      return next(new Error("APPROVED leave must have approvedBy"));
    }
    if (!this.approvedAt) {
      return next(new Error("APPROVED leave must have approvedAt"));
    }
  }

  next();
});

LeaveSchema.pre("save", async function (next) {
  if (this.isNew || !this.isModified("status")) {
    return next();
  }

  const previous = await this.constructor
    .findById(this._id)
    .select("status")
    .lean();

  const terminalStates = ["APPROVED", "REJECTED", "CANCELLED"];

  if (terminalStates.includes(previous?.status)) {
    return next(
      new Error(
        `Cannot change status of a ${previous.status} leave request`,
      ),
    );
  }

  next();
});

// ═══════════════════════════════════════════════════════════════════
//  INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════

LeaveSchema.methods.approve = function (userId) {
  this.status = "APPROVED";
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

LeaveSchema.methods.reject = function (userId, reason) {
  this.status = "REJECTED";
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

LeaveSchema.methods.cancel = function (userId, reason) {
  this.status = "CANCELLED";
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason || null;
  return this.save();
};

LeaveSchema.methods.softDelete = function (adminUserId) {
  this.isActive = false;
  this.deletedBy = adminUserId;
  this.deletedAt = new Date();
  return this.save();
};

// ═══════════════════════════════════════════════════════════════════
//  STATIC METHODS
// ═══════════════════════════════════════════════════════════════════

LeaveSchema.statics.findTeacherHistory = function (
  collegeId,
  teacherId,
  { status, page = 1, limit = 50 },
) {
  const query = {
    college_id: collegeId,
    teacher_id: teacherId,
    isActive: true,
  };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  return Promise.all([
    this.find(query)
      .sort({ startDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("cancelledBy", "name email"),
    this.countDocuments(query),
  ]).then(([leaves, total]) => ({
    leaves,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }));
};

LeaveSchema.statics.findPendingForDepartment = function (collegeId, departmentId) {
  return this.find({
    college_id: collegeId,
    department_id: departmentId,
    status: "PENDING",
    isActive: true,
  })
    .sort({ startDate: 1, createdAt: -1 })
    .populate("teacher_id", "name email employeeId designation");
};

LeaveSchema.statics.findApprovedInRange = function (
  collegeId,
  teacherId,
  startDate,
  endDate,
) {
  return this.find({
    college_id: collegeId,
    teacher_id: teacherId,
    status: "APPROVED",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
    isActive: true,
  });
};

module.exports = mongoose.model("Leave", LeaveSchema);
