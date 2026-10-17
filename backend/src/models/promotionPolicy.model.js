const mongoose = require("mongoose");
const {
  DEFAULT_MAX_ALLOWED_KTS,
  DEFAULT_MIN_FEE_PAID_PERCENTAGE,
} = require("../utils/promotionPolicy.util");

const promotionPolicySchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    minAttendancePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    /**
     * Minimum percentage of the student's total applicable fee that must be paid
     * before the fee eligibility check passes. The default of 100 preserves the
     * previous behaviour, which required the fee to be fully cleared.
     */
    minimumFeePaidPercentage: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
      default: DEFAULT_MIN_FEE_PAID_PERCENTAGE,
    },
    maxAllowedKTs: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "maxAllowedKTs must be a non-negative integer",
      },
      default: DEFAULT_MAX_ALLOWED_KTS,
    },
    scopedSemesters: [
      {
        type: Number,
      },
    ],
    ktRules: [
      {
        fromSemester: {
          type: Number,
          required: true,
          min: 1,
          max: 7,
        },
        toSemester: {
          type: Number,
          required: true,
          min: 2,
          max: 8,
        },
        maxAllowedKTs: {
          type: Number,
          required: true,
          min: 0,
        },
        requirePreviousYearClearance: {
          type: Boolean,
          default: false,
        },
        subjectTypeLimits: {
          THEORY: { type: Number, min: 0 },
          PRACTICAL: { type: Number, min: 0 },
          COMPOSITE: { type: Number, min: 0 },
        },
      },
    ],
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

promotionPolicySchema.path("ktRules").validate(function (rules) {
  if (!Array.isArray(rules)) return true;
  const seen = new Set();
  for (const rule of rules) {
    if (rule.toSemester !== rule.fromSemester + 1) {
      throw new Error(
        `Invalid transition: toSemester (${rule.toSemester}) must equal fromSemester + 1 (${rule.fromSemester + 1}).`,
      );
    }
    if (seen.has(rule.fromSemester)) {
      throw new Error(`Duplicate rule for fromSemester ${rule.fromSemester}.`);
    }
    seen.add(rule.fromSemester);
  }
  return true;
});

promotionPolicySchema.index(
  { collegeId: 1, course_id: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

promotionPolicySchema.pre("save", async function () {
  if (this.isActive) {
    await this.constructor
      .updateMany(
        {
          collegeId: this.collegeId,
          course_id: this.course_id,
          isActive: true,
          _id: { $ne: this._id },
        },
        { isActive: false },
      )
      .exec();
  }
});

promotionPolicySchema.statics.getActivePolicy = async function (collegeId, courseId) {
  let policy = null;

  if (courseId) {
    // 1. Try course-specific policy
    policy = await this.findOne({
      collegeId,
      course_id: courseId,
      isActive: true,
    });

    // 2. Fallback to college-level policy (course_id: null) ONLY
    if (!policy) {
      policy = await this.findOne({
        collegeId,
        course_id: null,
        isActive: true,
      });
    }
  } else {
    // When no courseId is provided (e.g. college-wide lookup / settings update):
    // 1. College-level policy (course_id: null)
    policy = await this.findOne({
      collegeId,
      course_id: null,
      isActive: true,
    });

    // 2. Fallback: Any active policy for this college (handles legacy records with missing/undefined course_id)
    if (!policy) {
      policy = await this.findOne({
        collegeId,
        isActive: true,
      });
    }
  }

  if (policy) {
    if (policy.maxAllowedKTs === undefined) {
      policy.maxAllowedKTs = DEFAULT_MAX_ALLOWED_KTS;
    }
    if (policy.minimumFeePaidPercentage === undefined) {
      policy.minimumFeePaidPercentage = DEFAULT_MIN_FEE_PAID_PERCENTAGE;
    }
  }

  return policy;
};

module.exports = mongoose.model("PromotionPolicy", promotionPolicySchema);
