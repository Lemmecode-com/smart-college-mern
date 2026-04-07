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
        enum: ["PENDING", "PAID", "FAILED", "CANCELLED"],
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

      // 🏦 OFFLINE PAYMENT: Payment mode tracking
      paymentMode: {
        type: String,
        enum: ["ONLINE", "CASH", "CHEQUE", "DD"],
        default: "ONLINE",
      },

      // 🏦 OFFLINE PAYMENT: Reference number for Cheque/DD
      referenceNumber: {
        type: String,
        trim: true,
      },

      // 🏦 OFFLINE PAYMENT: Admin remarks/notes
      remarks: {
        type: String,
        trim: true,
      },

      // 🏦 OFFLINE PAYMENT: Audit trail - which admin marked as paid
      markedByAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      stripeSessionId: {
        type: String,
        trim: true,
      },

      paidAt: Date,

      // 🔒 RECOVERY: Payment attempt tracking
      paymentAttemptAt: {
        type: Date,
      },

      paymentFailureReason: {
        type: String,
      },

      // 🔒 RAZORPAY: Payment tracking
      razorpayOrderId: {
        type: String,
        trim: true,
      },

      // Reminder tracking (original field)
      reminderSent: {
        type: Boolean,
        default: false,
      },

      // Enhanced reminder tracking (FIX: Issue #10 - Payment Reminder Logic Flaw)
      lastReminderDate: {
        type: Date,
      },

      escalationLevel: {
        type: String,
        enum: [
          "NONE",
          "DUE_TODAY",
          "SLIGHTLY_OVERDUE",
          "MODERATELY_OVERDUE",
          "SEVERELY_OVERDUE",
          "CRITICALLY_OVERDUE",
        ],
        default: "NONE",
      },

      reminderCount: {
        type: Number,
        default: 0,
      },

      finalNoticeSent: {
        type: Boolean,
        default: false,
      },

      // Payment Reconciliation (FIX: Edge Case 4 - Payment During Maintenance)
      reconciliationStatus: {
        type: String,
        enum: ["FLAGGED", "REQUIRES_ACTION", "RECONCILED"],
        default: null,
      },

      reconciliationFlag: {
        type: String,
      },

      reconciliationCheckedAt: {
        type: Date,
      },

      reconciliationNotes: {
        type: String,
      },
    },
  ],
});

// ⚡ PERFORMANCE: Indexes for common queries
studentFeeSchema.index({ student_id: 1, college_id: 1 }); // Student-wise fee
studentFeeSchema.index({ college_id: 1, course_id: 1 }); // Course-wise fee
studentFeeSchema.index({ college_id: 1 }); // College-wise fees
studentFeeSchema.index({ "installments.dueDate": 1 }); // Due date filtering
studentFeeSchema.index({ "installments.status": 1 }); // Payment status filtering
studentFeeSchema.index({ "installments.escalationLevel": 1 }); // Escalation filtering
studentFeeSchema.index({ "installments.finalNoticeSent": 1 }); // Final notice filtering
studentFeeSchema.index({ "installments.razorpayOrderId": 1 }); // Razorpay order lookup

module.exports = mongoose.model("StudentFee", studentFeeSchema);
