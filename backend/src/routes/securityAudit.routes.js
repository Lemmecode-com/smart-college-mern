const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const { 
  getAuditLogs, 
  getAuditLogById, 
  getDashboardStats, 
  markAsReviewed,
  exportAuditLogs 
} = require('../controllers/securityAudit.controller');

// All routes require authentication
router.use(authMiddleware);

// Dashboard stats - must come before /:id to avoid route conflict
router.get('/dashboard', getDashboardStats);

// Get all audit logs with filters
router.get('/', getAuditLogs);

// Get single audit log by ID
router.get('/:id', getAuditLogById);

// Mark as reviewed
router.put('/:id/review', markAsReviewed);

// Export logs
router.get('/export/download', exportAuditLogs);

module.exports = router;
