/**
 * Authentication Middleware pro validaci Microsoft Entra ID tokenů
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS klient pro získání veřejných klíčů od Microsoft
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hodin
});

/**
 * Získá podpisový klíč z Microsoft JWKS
 */
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

/**
 * Middleware pro ověření Bearer tokenu
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Získat token z Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    // Ověřit token pomocí Microsoft veřejného klíče
    jwt.verify(token, getKey, {
      audience: process.env.AZURE_CLIENT_ID,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        console.error('Token verification error:', err.message);
        return res.status(403).json({ 
          error: 'Invalid or expired token.',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      // Přidat uživatelské info do request objektu
      req.user = {
        id: decoded.oid, // Object ID uživatele
        email: decoded.preferred_username || decoded.email,
        name: decoded.name,
        roles: decoded.roles || [],
        tenantId: decoded.tid,
      };

      next();
    });

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error during authentication.' 
    });
  }
};

/**
 * Middleware pro kontrolu rolí (volitelné)
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
  authenticateToken,
  requireRole,
};
