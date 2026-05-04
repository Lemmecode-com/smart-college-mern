const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  description: {
    type: String,
    default: ''
  },

  enabled: {
    type: Boolean,
    default: false,
    index: true
  },

  enabledForColleges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College'
  }],

  enabledForUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  rolloutPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  conditions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
featureFlagSchema.index({ enabled: 1, name: 1 });

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);