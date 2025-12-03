const express = require('express');
const router = express.Router();
const entraService = require('../services/entraService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * GET /api/entra/user/:userId
 * Získat základní informace o uživateli z Entra ID
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await entraService.getUserById(userId);
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('🔴 GET /api/entra/user/:userId ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/user/:userId/groups
 * Získat všechny skupiny uživatele (včetně GUID)
 */
router.get('/user/:userId/groups', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const groups = await entraService.getUserGroups(userId);
    res.json({ success: true, data: groups, count: groups.length });
  } catch (err) {
    console.error('🔴 GET /api/entra/user/:userId/groups ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/user/:userId/manager
 * Získat nadřízeného uživatele
 */
router.get('/user/:userId/manager', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const manager = await entraService.getUserManager(userId);
    res.json({ success: true, data: manager });
  } catch (err) {
    console.error('🔴 GET /api/entra/user/:userId/manager ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/user/:userId/direct-reports
 * Získat podřízené uživatele
 */
router.get('/user/:userId/direct-reports', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const directReports = await entraService.getUserDirectReports(userId);
    res.json({ success: true, data: directReports, count: directReports.length });
  } catch (err) {
    console.error('🔴 GET /api/entra/user/:userId/direct-reports ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/user/:userId/profile
 * Získat kompletní profil uživatele (user + groups + manager + direct reports)
 */
router.get('/user/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await entraService.getUserFullProfile(userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('🔴 GET /api/entra/user/:userId/profile ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/group/:groupId
 * Získat detaily skupiny podle GUID
 */
router.get('/group/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await entraService.getGroupById(groupId);
    res.json({ success: true, data: group });
  } catch (err) {
    console.error('🔴 GET /api/entra/group/:groupId ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/group/:groupId/members
 * Získat členy skupiny
 */
router.get('/group/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const members = await entraService.getGroupMembers(groupId);
    res.json({ success: true, data: members, count: members.length });
  } catch (err) {
    console.error('🔴 GET /api/entra/group/:groupId/members ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/groups
 * Získat všechny skupiny v tenantovi
 */
router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const groups = await entraService.getAllGroups();
    res.json({ success: true, data: groups, count: groups.length });
  } catch (err) {
    console.error('🔴 GET /api/entra/groups ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/users
 * Získat seznam uživatelů (max 50)
 * Query params: ?limit=50
 */
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const users = await entraService.getUsers(limit);
    res.json({ success: true, data: users, count: users.length });
  } catch (err) {
    console.error('🔴 GET /api/entra/users ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/search/user
 * Vyhledat uživatele podle emailu
 * Query params: ?email=user@example.com
 */
router.get('/search/user', authenticateToken, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter is required'
      });
    }
    const user = await entraService.searchUserByEmail(email);
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('🔴 GET /api/entra/search/user ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
