/**
 * Session Middleware pro ověření session
 */

/**
 * Middleware pro ověření, že uživatel má platnou session
 */
const authenticateSession = (req, res, next) => {
  // Pro development mode - zatím vracíme mock uživatele
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      id: 'dev-user-123',
      email: 'dev@zachranka.cz',
      name: 'Development User'
    };
    return next();
  }

  // TODO: Implementovat skutečné ověření session
  // Pro production bude třeba zkontrolovat JWT token nebo session cookie
  
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No valid session'
    });
  }

  req.user = req.session.user;
  next();
};

module.exports = {
  authenticateSession
};
