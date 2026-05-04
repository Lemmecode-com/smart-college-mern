const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null  // null for system-wide backups
  },

  type: {
    type: String,
    enum: ['FULL', 'INCREMENTAL', 'COLLEGE_SPECIFIC'],
    required: true
  },

  filename: {
    type: String,
    required: true
  },

  path: {
    type: String,
    required: true
  },

  size: {
    type: Number, // in bytes
    required: true
  },

  success: {
    type: Boolean,
    default: true
  },

  error: {
    type: String,
    default: null
  },

  duration: {
    type: Number, // in milliseconds
    default: null
  },

  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
backupSchema.index({ college_id: 1, createdAt: -1 });
backupSchema.index({ success: 1, createdAt: -1 });
backupSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Backup', backupSchema);