/**
 * Auth Routes - Endpointy pro autentizaci a uživatelské info
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * GET /api/auth/me
 * Získání informací o přihlášeném uživateli
 * Vyžaduje validní Bearer token
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/**
 * POST /api/auth/validate
 * Validace tokenu (test endpointu)
 */
router.post('/validate', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user,
  });
});

/**
 * GET /api/auth/logout
 * Logout endpoint (pro logování na serveru)
 */
router.get('/logout', authenticateToken, (req, res) => {
  // Server-side logout logika (např. blacklist tokenu)
  // Pro Microsoft Entra se logout dělá primárně na frontendu
  
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

module.exports = router;
