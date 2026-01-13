const mongoose = require("mongoose");

const ParentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    occupation: String,
    phone: String,

    // 🔗 LINK TO STUDENT
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Parent", ParentSchema);
