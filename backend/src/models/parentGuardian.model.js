const mongoose = require("mongoose");

const parentGuardianSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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

module.exports = mongoose.model("ParentGuardian", parentGuardianSchema);
