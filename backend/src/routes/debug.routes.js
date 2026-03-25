const express = require('express');
const router = express.Router();

// Simple test route to verify middleware chain
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Debug route works!',
    req: {
      user: req.user ? { id: req.user.id, role: req.user.role } : null,
      college_id: req.college_id,
      body: req.body,
      cookies: req.cookies.token ? 'Token present' : 'No token'
    }
  });
});

// Test POST route
router.post('/debug', express.json(), (req, res) => {
  console.log('🔵 Debug POST route called');
  console.log('   - Body:', req.body);
  res.json({
    success: true,
    message: 'Debug POST works!',
    body: req.body
  });
});

module.exports = router;
