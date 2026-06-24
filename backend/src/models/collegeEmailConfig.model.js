const mongoose = require("mongoose");

const collegeEmailConfigSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true,
    },
    smtp: {
      host: {
        type: String,
        required: true,
        trim: true,
      },
      port: {
        type: Number,
        required: true,
        min: 1,
        max: 65535,
      },
      secure: {
        type: Boolean,
        default: false, // true for 465 (SSL), false for 587 (TLS)
      },
    },
    credentials: {
      user: {
        type: String,
        required: true,
      },
      pass: {
        type: String,
        required: true, // encrypted
      },
    },
    fromName: {
      type: String,
      required: true,
      trim: true,
    },
    fromEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastVerifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index: one active config per college
collegeEmailConfigSchema.index({ collegeId: 1, isActive: 1 });

// Pre-save middleware to ensure only one active config per college
collegeEmailConfigSchema.pre("save", async function () {
  if (this.isActive) {
    await this.constructor.updateMany(
      {
        collegeId: this.collegeId,
        isActive: true,
        _id: { $ne: this._id },
      },
      { isActive: false },
    ).exec();
    
    console.log(
      `[CollegeEmailConfig] Deactivated other configs for college ${this.collegeId}`,
    );
  }
});

// Instance method to check if config is valid
collegeEmailConfigSchema.methods.isValid = function () {
  return this.isActive && 
         this.smtp?.host && 
         this.smtp?.port && 
         this.credentials?.user && 
         this.credentials?.pass &&
         this.fromName &&
         this.fromEmail;
};

// Static method to get active config for a college
collegeEmailConfigSchema.statics.getActiveConfig = async function (collegeId) {
  return await this.findOne({
    collegeId,
    isActive: true,
  }).lean();
};

module.exports = mongoose.model(
  "CollegeEmailConfig",
  collegeEmailConfigSchema,
);
