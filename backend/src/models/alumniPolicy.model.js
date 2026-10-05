const mongoose = require("mongoose");

const alumniPolicySchema = new mongoose.Schema(
  {
    college_id: {
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
    enabled: {
      type: Boolean,
      default: true,
    },
    requireFinalSemester: {
      type: Boolean,
      default: true,
    },
    resultRule: {
      requirePublished: {
        type: Boolean,
        default: true,
      },
      requiredOutcome: {
        type: String,
        enum: ["PASS"],
        default: "PASS",
      },
    },
    attendanceRule: {
      enabled: {
        type: Boolean,
        default: true,
      },
      minimumPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 75,
      },
    },
    feeRule: {
      enabled: {
        type: Boolean,
        default: true,
      },
      minimumPaidPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
    },
    backlogRule: {
      requirePreviousYearClearance: {
        type: Boolean,
        default: true,
      },
      allowCurrentBacklog: {
        type: Boolean,
        default: false,
      },
    },
    effectiveFromAcademicYear: {
      type: String,
      trim: true,
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Ensure only one active policy per college and course (or college-wide when course_id is null)
alumniPolicySchema.index(
  { college_id: 1, course_id: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

// When an active policy is saved, deactivate previous active policies for the same scope
alumniPolicySchema.pre("save", async function () {
  if (this.isActive) {
    await this.constructor
      .updateMany(
        {
          college_id: this.college_id,
          course_id: this.course_id,
          isActive: true,
          _id: { $ne: this._id },
        },
        { isActive: false },
      )
      .exec();
  }
});

/**
 * Resolves the active AlumniPolicy for a given college and optional course.
 * Precedence:
 * 1. Course-specific active policy
 * 2. College-level active policy (course_id: null)
 * 3. null (meaning configuration is required)
 */
alumniPolicySchema.statics.getActivePolicy = async function (collegeId, courseId) {
  if (courseId) {
    const coursePolicy = await this.findOne({
      college_id: collegeId,
      course_id: courseId,
      isActive: true,
    });
    if (coursePolicy) {
      return coursePolicy;
    }
  }

  // Fallback to college-level policy (course_id: null)
  return await this.findOne({
    college_id: collegeId,
    course_id: null,
    isActive: true,
  });
};

module.exports = mongoose.model("AlumniPolicy", alumniPolicySchema);
