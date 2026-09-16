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

promotionPolicySchema.index(
  { collegeId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

promotionPolicySchema.pre("save", async function () {
  if (this.isActive) {
    await this.constructor
      .updateMany(
        {
          collegeId: this.collegeId,
          isActive: true,
          _id: { $ne: this._id },
        },
        { isActive: false },
      )
      .exec();
  }
});

promotionPolicySchema.statics.getActivePolicy = async function (collegeId) {
  const policy = await this.findOne({
    collegeId,
    isActive: true,
  });

  if (policy && policy.maxAllowedKTs === undefined) {
    policy.maxAllowedKTs = DEFAULT_MAX_ALLOWED_KTS;
  }

  return policy;
};

module.exports = mongoose.model("PromotionPolicy", promotionPolicySchema);
