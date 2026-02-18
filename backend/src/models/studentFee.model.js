const mongoose = require("mongoose");

const studentFeeSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },

  totalFee: {
    type: Number,
    required: true,
  },

  paidAmount: {
    type: Number,
    default: 0,
  },

  installments: [
  {
    name: String,
    amount: Number,

    dueDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    transactionId: {
      type: String,
      trim: true,
    },

    paymentGateway: {
      type: String,
      default: "STRIPE",
    },

    stripeSessionId: {
      type: String,
      trim: true,
    },

    paidAt: Date,

    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
],

});

module.exports = mongoose.model("StudentFee", studentFeeSchema);
