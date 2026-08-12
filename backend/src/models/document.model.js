const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const documentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    unique: true,
    default: uuidv4,
    index: true,
  },
  ownerType: {
    type: String,
    enum: ["Student", "Teacher", "Staff", "Parent", "College", "StudentFee"],
    required: true,
    index: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  documentType: {
    type: String,
    required: true,
    index: true,
  },
  storageKey: {
    type: String,
    required: true,
    unique: true,
  },
  provider: {
    type: String,
    default: null,
    index: true,
  },
  originalFileName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  checksum: {
    type: String,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  status: {
    type: String,
    enum: ["ACTIVE", "ARCHIVED", "DELETED"],
    default: "ACTIVE",
    index: true,
  },
  archivedAt: {
    type: Date,
  },
  replacedBy: {
    type: String,
  },

  // 📋 Document Verification (admissions workflow)
  // Tracks College Admin verification of a document separate from lifecycle status.
  verificationStatus: {
    type: String,
    enum: ["PENDING", "VERIFIED", "REJECTED"],
    default: "PENDING",
    index: true,
  },
  verifiedAt: {
    type: Date,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  rejectedAt: {
    type: Date,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  rejectionReason: {
    type: String,
  },

  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

documentSchema.index({ ownerType: 1, ownerId: 1, documentType: 1, status: 1 });
documentSchema.index({ ownerType: 1, ownerId: 1, status: 1 });
documentSchema.index({ ownerType: 1, ownerId: 1, verificationStatus: 1 });
documentSchema.index({ provider: 1, status: 1 });

module.exports = mongoose.model("Document", documentSchema);
