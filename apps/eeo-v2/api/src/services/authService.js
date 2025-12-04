const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

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
   * Vytvoří session v databázi
   */
  async createSession(userId, tokens, ipAddress, userAgent) {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    await db.query(
      `INSERT INTO erdms_sessions 
       (id, user_id, entra_access_token, entra_refresh_token, entra_id_token, 
        token_expires_at, ip_address, user_agent, created_at, last_activity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        sessionId,
        userId,
        tokens.accessToken,
        tokens.refreshToken || null,
        tokens.idToken || null,
        expiresAt,
        ipAddress,
        userAgent
      ]
    );

    return sessionId;
  }

  /**
   * Najde session podle ID
   */
  async findSession(sessionId) {
    const [rows] = await db.query(
      `SELECT s.*, u.* 
       FROM erdms_sessions s
       JOIN erdms_users u ON s.user_id = u.id
       WHERE s.id = ? AND u.aktivni = 1`,
      [sessionId]
    );
    return rows[0] || null;
  }

  /**
   * Aktualizuje session aktivitu
   */
  async updateSessionActivity(sessionId) {
    await db.query(
      'UPDATE erdms_sessions SET last_activity = NOW() WHERE id = ?',
      [sessionId]
    );
  }

  /**
   * Smaže session
   */
  async deleteSession(sessionId) {
    await db.query('DELETE FROM erdms_sessions WHERE id = ?', [sessionId]);
  }

  /**
   * Loguje autentizační událost
   */
  async logAuthEvent(userId, username, eventType, authMethod, ipAddress, userAgent, errorMessage = null) {
    await db.query(
      `INSERT INTO erdms_auth_log 
       (user_id, username, event_type, auth_method, ip_address, user_agent, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, username, eventType, authMethod, ipAddress, userAgent, errorMessage]
    );
  }
}

module.exports = new AuthService();
