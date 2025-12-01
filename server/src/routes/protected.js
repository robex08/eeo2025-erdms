/**
 * Protected Routes - Příklad chráněných endpointů
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

/**
 * GET /api/protected/data
 * Chráněný endpoint - vyžaduje přihlášení
 */
router.get('/data', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'This is protected data',
    user: req.user,
    data: {
      example: 'Some sensitive information',
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/protected/admin
 * Chráněný endpoint - vyžaduje admin roli
 */
router.get('/admin', authenticateToken, requireRole(['Admin']), (req, res) => {
  res.json({
    success: true,
    message: 'Admin only data',
    user: req.user,
    adminData: {
      example: 'Admin information',
    },
  });
});

module.exports = router;
