const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["DRAFT", "OPEN", "PAID", "VOID", "UNCOLLECTIBLE"],
    default: "DRAFT",
  },
  currency: {
    type: String,
    default: "INR",
  },
  amountDue: {
    type: Number,
    required: true,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  paidAt: {
    type: Date,
  },
  periodStart: {
    type: Date,
  },
  periodEnd: {
    type: Date,
  },
  metadata: {
    type: Map,
    of: String,
    default: {},
  },
}, { timestamps: true });

invoiceSchema.index({ college_id: 1, createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
