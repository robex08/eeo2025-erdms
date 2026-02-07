const express = require('express');
const router = express.Router();
const entraService = require('../services/entraService');
const { authenticateSession } = require('../middleware/sessionMiddleware');
const { readLimiter } = require('../middleware/rateLimitMiddleware');

// SECURITY: Aplikuj rate limiting na všechny Entra API endpointy
router.use(readLimiter);

/**
 * GET /api/entra/user/:userId
 * Získat základní informace o uživateli z Entra ID
 * 
 * SECURITY: Uživatel může načíst jen své vlastní data (pokud není admin)
 */
router.get('/user/:userId', authenticateSession, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // SECURITY: Validace GUID formátu
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid userId format'
      });
    }
    
    // SECURITY: Profily kolegů jsou veřejné v rámci organizace
    // Každý přihlášený uživatel může vidět ostatní
    
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
router.get('/user/:userId/groups', authenticateSession, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // SECURITY: Skupiny kolegů jsou veřejné v rámci organizace
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
router.get('/user/:userId/manager', authenticateSession, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // SECURITY: Informace o nadřízených jsou veřejné v rámci organizace
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
router.get('/user/:userId/direct-reports', authenticateSession, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // SECURITY: Informace o podřízených jsou veřejné v rámci organizace
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
router.get('/user/:userId/profile', authenticateSession, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // SECURITY: Kompletní profily kolegů jsou veřejné v rámci organizace
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
router.get('/group/:groupId', authenticateSession, async (req, res) => {
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
router.get('/group/:groupId/members', authenticateSession, async (req, res) => {
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
router.get('/groups', authenticateSession, async (req, res) => {
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
 * 
 * SECURITY: Toto je OK - seznam zaměstnanců je veřejný v rámci organizace
 * (každý přihlášený uživatel může vidět kolegy, není to citlivá data)
 */
router.get('/users', authenticateSession, async (req, res) => {
  try {
    // SECURITY: Validace a omezení limitu
    let limit = parseInt(req.query.limit) || 50;
    if (isNaN(limit) || limit < 1) {
      limit = 50;
    }
    // SECURITY: Max 2000 uživatelů aby se nepřetížil server
    if (limit > 2000) {
      limit = 2000;
    }
    
    const result = await entraService.getUsers(limit);
    const responseData = { 
      success: true, 
      data: result.users, 
      count: result.users.length,
      totalCount: result.totalCount 
    };
    console.log(`📤 Odesílám odpověď: ${result.users.length} users, totalCount: ${result.totalCount}`);
    res.json(responseData);
  } catch (err) {
    console.error('🔴 GET /api/entra/users ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/users/search
 * Fulltextové vyhledávání uživatelů
 * Query params:
 *   - q: vyhledávací dotaz (min 3 znaky)
 *   - limit: max výsledků (default 50)
 * 
 * Vyhledává v: displayName, givenName, surname, mail, userPrincipalName, jobTitle, department, officeLocation
 */
router.get('/users/search', authenticateSession, async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    
    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Vyhledávací dotaz musí mít alespoň 3 znaky'
      });
    }
    
    const users = await entraService.searchUsers(q, parseInt(limit));
    
    res.json({
      success: true,
      data: users,
      count: users.length,
      query: q
    });
  } catch (err) {
    console.error('🔴 GET /api/entra/users/search ERROR:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/users/paginated
 * Získat seznam uživatelů s paginací
 * Query params: ?pageSize=25&skipToken=xxx
 * 
 * Response: { success, data: { users, nextLink, skipToken, hasMore, count } }
 */
router.get('/users/paginated', authenticateSession, async (req, res) => {
  try {
    // SECURITY: Validace a omezení page size
    let pageSize = parseInt(req.query.pageSize) || 25;
    if (isNaN(pageSize) || pageSize < 1) {
      pageSize = 25;
    }
    // SECURITY: Max 100 uživatelů na stránku
    if (pageSize > 100) {
      pageSize = 100;
    }

    const skipToken = req.query.skipToken || null;

    const result = await entraService.getUsersPaginated(pageSize, skipToken);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('🔴 GET /api/entra/users/paginated ERROR:', err.message);
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
router.get('/search/user', authenticateSession, async (req, res) => {
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

/**
 * GET /api/entra/me/calendar/events
 * Získat nadcházející události z kalendáře přihlášeného uživatele
 * Query params: ?days=7
 */
router.get('/me/calendar/events', authenticateSession, async (req, res) => {
  try {
    console.log('📅 Calendar endpoint called');
    console.log('📅 User:', req.user ? 'exists' : 'missing');
    console.log('📅 Access token:', req.user?.entra_access_token ? 'exists' : 'missing');
    
    // Validace: uživatel musí mít access token
    if (!req.user || !req.user.entra_access_token) {
      console.log('🔴 Calendar: No access token, returning 401');
      return res.status(401).json({
        success: false,
        error: 'User access token not found. Please re-login to get calendar permissions.'
      });
    }

    const days = parseInt(req.query.days) || 7;
    console.log('📅 Calling entraService.getMyCalendarEvents with days:', days);
    
    // 🔬 DEBUG: Na pozadí zavolat všechny varianty Graph API a vypsat do konzole
    console.log('\n🔬 ========== GRAPH API DEBUG TEST START ==========');
    entraService.debugCalendarAPIs(req.user.entra_access_token).then(results => {
      console.log('\n🔬 DEBUG RESULTS:');
      console.log(JSON.stringify(results, null, 2));
      console.log('\n🔬 SUMMARY:');
      results.tests.forEach(test => {
        const hasCategories = test.firstEvent?.categories !== undefined;
        const timezone = test.firstEvent?.start?.timeZone || 'N/A';
        console.log(`  ${test.test}: categories=${hasCategories}, timezone=${timezone}`);
      });
      console.log('🔬 ========== GRAPH API DEBUG TEST END ==========\n');
    }).catch(err => {
      console.error('🔴 DEBUG TEST ERROR:', err.message);
    });
    
    const events = await entraService.getMyCalendarEvents(req.user.entra_access_token, days);
    console.log('📅 Got events:', events.length);
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('🔴 GET /api/entra/me/calendar/events ERROR:', err.message);
    console.error('🔴 Stack:', err.stack);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/entra/me/calendar/debug
 * DEBUG: Zkusit všechny možné Graph API endpointy pro kalendář
 */
router.get('/me/calendar/debug', authenticateSession, async (req, res) => {
  try {
    console.log('🔬 DEBUG: Calendar API testing started');
    
    if (!req.user || !req.user.entra_access_token) {
      return res.status(401).json({
        success: false,
        error: 'User access token not found'
      });
    }

    const results = await entraService.debugCalendarAPIs(req.user.entra_access_token, 3);
    
    console.log('🔬 DEBUG: All tests completed');
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('🔴 DEBUG ERROR:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
