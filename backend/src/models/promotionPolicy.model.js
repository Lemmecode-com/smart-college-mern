const mongoose = require("mongoose");
const { DEFAULT_MAX_ALLOWED_KTS } = require("../utils/promotionPolicy.util");

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
  if (courseId) {
    // First try to find course-specific policy
    const coursePolicy = await this.findOne({
      collegeId,
      course_id: courseId,
      isActive: true,
    });
    if (coursePolicy) {
      if (coursePolicy.maxAllowedKTs === undefined) {
        coursePolicy.maxAllowedKTs = DEFAULT_MAX_ALLOWED_KTS;
      }
      return coursePolicy;
    }
  }
  // Fallback to college-level policy (course_id: null)
  const collegePolicy = await this.findOne({
    collegeId,
    course_id: null,
    isActive: true,
  });
  if (collegePolicy && collegePolicy.maxAllowedKTs === undefined) {
    collegePolicy.maxAllowedKTs = DEFAULT_MAX_ALLOWED_KTS;
  }
  return collegePolicy;
};

module.exports = mongoose.model("PromotionPolicy", promotionPolicySchema);
