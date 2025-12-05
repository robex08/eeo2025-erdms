/**
 * Session Middleware pro ověření session
 */

/**
 * Middleware pro ověření, že uživatel má platnou session (IN-MEMORY)
 */
const authenticateSession = async (req, res, next) => {
  try {
    // Získej session ID z cookie
    const sessionId = req.cookies.erdms_session;
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No valid session'
      });
    }

    // Najdi session v paměti (NE v DB!)
    const authService = require('../services/authService');
    const session = await authService.findSession(sessionId);
    
    if (!session || !session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Session not found or expired'
      });
    }

    // User data jsou přímo v session (z Entra ID)
    const user = {
      id: session.userId,
      username: session.username,
      email: session.email,
      name: session.name,
      upn: session.upn,
      entra_id: session.entra_id,
      auth_source: session.auth_source,
      entra_access_token: session.entra_access_token
    };

    // Přidej uživatele a session do request
    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    console.error('🔴 Session middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  authenticateSession
};
