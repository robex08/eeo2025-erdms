/**
 * Session Middleware pro ověření session
 */

/**
 * Middleware pro ověření, že uživatel má platnou session
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

    // Najdi session v databázi
    const authService = require('../services/authService');
    const session = await authService.findSession(sessionId);
    
    if (!session || !session.user_id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Session not found or expired'
      });
    }

    // Najdi uživatele
    const user = await authService.findUserById(session.user_id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - User not found'
      });
    }

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
