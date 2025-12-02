const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  /**
   * Najde uživatele podle EntraID
   */
  async findUserByEntraId(entraId) {
    const [rows] = await db.query(
      'SELECT * FROM erdms_users WHERE entra_id = ? AND aktivni = 1',
      [entraId]
    );
    return rows[0] || null;
  }

  /**
   * Najde uživatele podle emailu
   */
  async findUserByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM erdms_users WHERE email = ? AND aktivni = 1',
      [email]
    );
    return rows[0] || null;
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
           auth_source = 'entra_id',
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
