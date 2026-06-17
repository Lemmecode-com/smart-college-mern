const mongoose = require("mongoose");

const parentGuardianSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
    index: true,
  },
  student_ids: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
  relation: {
    type: String,
    enum: ["father", "mother", "guardian"],
    default: "guardian",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

parentGuardianSchema.index({ college_id: 1 }, { sparse: true });

// 🔒 COLLEGE ISOLATION: Prevent cross-college ParentGuardian lookups/updates
parentGuardianSchema.pre("find", function () {
  if (this.getQuery().college_id) {
    this.where({ college_id: this.getQuery().college_id });
  }
});

parentGuardianSchema.pre("findOne", function () {
  if (this.getQuery().college_id) {
    this.where({ college_id: this.getQuery().college_id });
  }
});

parentGuardianSchema.pre("findOneAndUpdate", function () {
  if (this.getQuery().college_id) {
    this.where({ college_id: this.getQuery().college_id });
  }
});

module.exports = mongoose.model("ParentGuardian", parentGuardianSchema);
