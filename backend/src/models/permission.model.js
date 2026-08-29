const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT', 'ADMISSION_OFFICER', 'EXAM_COORDINATOR', 'PARENT_GUARDIAN', 'PLATFORM_SUPPORT', 'TEACHER', 'STUDENT'],
    index: true
  },

  resource: {
    type: String,
    required: true,
    index: true
  },

  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE']
  },

  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null  // null for system-wide permissions
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
permissionSchema.index({ role: 1, resource: 1, action: 1, college_id: 1 });

module.exports = mongoose.model('Permission', permissionSchema);