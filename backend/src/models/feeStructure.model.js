const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema({
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  category: {
    type: String,
    enum: ["GENERAL", "OBC", "SC", "ST"],
    required: true
  },
  totalFee: {
    type: Number,
    required: true
  },
  installments: [
    {
      name: String,
      amount: Number
    }
  ]
});

module.exports = mongoose.model("FeeStructure", feeStructureSchema);
