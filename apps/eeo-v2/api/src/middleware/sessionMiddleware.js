/**
 * Session Middleware pro validaci cookie-based autentizace
 */

const authService = require('../services/authService');

/**
 * Middleware pro ověření session cookie
 */
const authenticateSession = async (req, res, next) => {
  try {
    console.log('🔵 Session middleware: cookies =', req.cookies);
    const sessionId = req.cookies.erdms_session;
    
    if (!sessionId) {
      console.log('🔴 Session middleware: No session cookie found');
      return res.status(401).json({ 
        error: 'Not authenticated. Session cookie missing.' 
      });
    }
    console.log('🔵 Session middleware: sessionId =', sessionId);

    // Najdi session v databázi
    const session = await authService.findSession(sessionId);
    
    if (!session) {
      res.clearCookie('erdms_session');
      return res.status(401).json({ 
        error: 'Session not found or expired.' 
      });
    }

    // Zkontroluj, zda token není expirovaný
    if (session.token_expires_at && new Date(session.token_expires_at) < new Date()) {
      await authService.deleteSession(sessionId);
      res.clearCookie('erdms_session');
      return res.status(401).json({ 
        error: 'Session expired.' 
      });
    }

    // Aktualizuj aktivitu
    await authService.updateSessionActivity(sessionId);

    // Přidat uživatelské info do request objektu (kompatibilní s authenticateToken)
    req.user = {
      id: session.entra_id || session.id, // Použij entra_id pokud existuje
      dbId: session.id, // Databázové ID pro dotazy do DB
      email: session.email,
      username: session.username,
      name: `${session.titul_pred || ''} ${session.jmeno} ${session.prijmeni} ${session.titul_za || ''}`.trim(),
      roles: session.role ? [session.role] : [],
      tenantId: session.upn ? session.upn.split('@')[1] : null,
      accessToken: session.entra_access_token, // Pro Graph API volání
    };

    next();

  } catch (error) {
    console.error('🔴 Session authentication error:', error);
    res.status(500).json({ 
      error: 'Internal server error during authentication.' 
    });
  }
};

/**
 * Middleware pro kontrolu rolí (stejné jako v authMiddleware)
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

module.exports = {
  authenticateSession,
  requireRole,
};
