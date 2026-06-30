const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

// In-memory session storage (pro produkci použít Redis)
const sessions = new Map();
const SESSION_TTL_HOURS = parseInt(process.env.AUTH_SESSION_TTL_HOURS || '24', 10);
const SESSION_TTL_MS = SESSION_TTL_HOURS * 60 * 60 * 1000;

class AuthService {
  /**
   * Najde uživatele podle EntraID
   * Používá pool.query() - automatické connection management
   */
  async findUserByEntraId(entraId) {
    try {
      const [rows] = await db.query(
        `SELECT id, username, entra_id, upn, auth_source, email, 
                jmeno, prijmeni, titul_pred, titul_za, telefon,
                pozice_id, lokalita_id, organizace_id, usek_id, role,
                aktivni, dt_vytvoreni
         FROM erdms_users 
         WHERE entra_id = ? AND aktivni = 1`,
        [entraId]
      );
      return rows[0] || null;
    } catch (err) {
      console.error('🔴 findUserByEntraId ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Najde uživatele podle ID
   */
  async findUserById(userId) {
    try {
      const [rows] = await db.query(
        `SELECT id, username, entra_id, upn, auth_source, email, 
                jmeno, prijmeni, titul_pred, titul_za, telefon,
                pozice_id, lokalita_id, organizace_id, usek_id, role,
                aktivni, dt_vytvoreni
         FROM erdms_users 
         WHERE id = ? AND aktivni = 1`,
        [userId]
      );
      return rows[0] || null;
    } catch (err) {
      console.error('🔴 findUserById ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Najde uživatele podle emailu
   * Používá pool.query() - automatické connection management
   */
  async findUserByEmail(email) {
    try {
      const [rows] = await db.query(
        `SELECT id, username, entra_id, upn, auth_source, email, 
                jmeno, prijmeni, titul_pred, titul_za, telefon,
                pozice_id, lokalita_id, organizace_id, usek_id, role,
                aktivni, dt_vytvoreni
         FROM erdms_users 
         WHERE email = ? AND aktivni = 1`,
        [email]
      );
      return rows[0] || null;
    } catch (err) {
      console.error('🔴 findUserByEmail ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Najde uživatele podle username (bez domény z emailu)
   * Pokud email je ve formátu u03924@zachranka.cz, hledá username=u03924
   */
  async findUserByUsername(usernameOrEmail) {
    console.log('🔵 authService.findUserByUsername() START');
    console.log('🔵 Input:', usernameOrEmail);
    
    // Pokud obsahuje @, extrahuj část před @
    const username = usernameOrEmail.includes('@') 
      ? usernameOrEmail.split('@')[0] 
      : usernameOrEmail;
    
    console.log('🔵 Extracted username:', username);
    
    try {
      console.log('🔵 Executing query with pool.query() - auto connection management');
      const startTime = Date.now();
      
      // BEST PRACTICE: Použij pool.query() přímo - automaticky spravuje connection
      const [rows] = await db.query(
        `SELECT id, username, entra_id, upn, auth_source, email, 
                jmeno, prijmeni, titul_pred, titul_za, telefon,
                pozice_id, lokalita_id, organizace_id, usek_id, role,
                aktivni, dt_vytvoreni
         FROM erdms_users 
         WHERE username = ? AND aktivni = 1`,
        [username]
      );
      
      const duration = Date.now() - startTime;
      console.log('🔵 ✅ Query completed in', duration, 'ms');
      console.log('🔵 Rows count:', rows ? rows.length : 0);
      
      if (rows && rows.length > 0) {
        console.log('🔵 Found user:', rows[0].username, 'ID:', rows[0].id);
      } else {
        console.log('🔵 No user found');
      }
      
      return rows[0] || null;
    } catch (err) {
      console.error('🔴 Query ERROR:', err.message);
      console.error('🔴 Error code:', err.code);
      throw err;
    }
  }

  /**
   * Synchronizuje uživatele s EntraID daty
   */
  async syncUserWithEntra(userId, entraData) {
    const { id: entraId, userPrincipalName: upn } = entraData;
    
    await db.query(
      `UPDATE erdms_users 
       SET entra_id = ?, 
           upn = ?, 
           auth_source = 'entra',
           entra_sync_at = NOW(),
           dt_aktualizace = NOW()
       WHERE id = ?`,
      [entraId, upn, userId]
    );
  }

  /**
   * Vytvoří session (IN-MEMORY - bez DB)
   */
  async createSession(user, tokens, ipAddress, userAgent) {
    const sessionId = uuidv4();
    const now = Date.now();
    const expiresAt = new Date(now + SESSION_TTL_MS);
    const entraTokenExpiresAt = new Date(now + ((tokens.expiresIn || 0) * 1000));

    // Ulož session do paměti s kompletními user daty
    sessions.set(sessionId, {
      id: sessionId,
      userId: user.id,
      // User data z Entra
      username: user.username,
      email: user.email,
      upn: user.upn,
      name: user.name,
      entra_id: user.entra_id,
      auth_source: user.auth_source,
      tenantId: user.tenantId,
      // Tokens
      entra_access_token: tokens.accessToken,
      entra_id_token: tokens.idToken,
      entra_refresh_token: tokens.refreshToken || null,
      entra_token_expires_at: entraTokenExpiresAt,
      expiresAt: expiresAt,
      // Metadata
      ipAddress: ipAddress,
      userAgent: userAgent,
      createdAt: new Date(),
      lastActivity: new Date()
    });

    console.log('🟢 Session stored in memory:', sessionId);
    console.log('🟢 Active sessions count:', sessions.size);

    return sessionId;
  }

  /**
   * Najde session podle ID (IN-MEMORY)
   */
  async findSession(sessionId) {
    const session = sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Zkontroluj jestli session nevypršela
    if (session.expiresAt < new Date()) {
      sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Aktualizuje session aktivitu (IN-MEMORY)
   */
  async updateSessionActivity(sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    }
  }

  /**
   * Smaže session (IN-MEMORY)
   */
  async deleteSession(sessionId) {
    sessions.delete(sessionId);
    console.log('🟢 Session deleted:', sessionId);
    console.log('🟢 Remaining sessions:', sessions.size);
  }

  /**
   * Loguje autentizační událost (DO KONZOLE - bez DB)
   */
  async logAuthEvent(userId, username, eventType, authMethod, ipAddress, userAgent, errorMessage = null) {
    // Log do konzole místo DB
    console.log('🔐 AUTH EVENT:', {
      userId,
      username,
      eventType,
      authMethod,
      ipAddress,
      userAgent: userAgent?.substring(0, 50),
      errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new AuthService();
