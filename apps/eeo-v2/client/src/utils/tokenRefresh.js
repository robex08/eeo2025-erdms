/**
 * Token Refresh Service
 * 
 * Automaticky obnovuje token před expirací
 * Refresh se spustí 10 minut před expirací tokenu
 */

import { saveAuthData, loadAuthData } from './authStorageIncognito.js';

// Konstanta pro dobu platnosti tokenu (musí být stejná jako v authStorage.js)
const TOKEN_EXPIRY_HOURS = 12;
const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';

// Refresh 10 minut před expirací
const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000; // 10 minut

class TokenRefreshService {
  constructor() {
    this.refreshTimer = null;
    this.isRefreshing = false;
  }

  /**
   * Spustí refresh timer po úspěšném login
   * @param {string|Date} tokenExpiresAt - Čas expirace tokenu
   */
  startRefreshTimer(tokenExpiresAt) {
    this.stopRefreshTimer(); // Clear existing timer
    
    try {
      const now = Date.now();
      let expiresAt;
      
      // Parse různé formáty času
      if (typeof tokenExpiresAt === 'string') {
        expiresAt = new Date(tokenExpiresAt).getTime();
      } else if (tokenExpiresAt instanceof Date) {
        expiresAt = tokenExpiresAt.getTime();
      } else if (typeof tokenExpiresAt === 'number') {
        expiresAt = tokenExpiresAt;
      } else {
        // Fallback: token byl právě vytvořen, vypočítej expiraci
        expiresAt = now + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      }
      
      // Vypočítej čas do refreshe
      const timeUntilRefresh = expiresAt - now - REFRESH_BEFORE_EXPIRY_MS;
      
      if (timeUntilRefresh > 0) {
        const minutesUntilRefresh = Math.round(timeUntilRefresh / 1000 / 60);
        
        
        this.refreshTimer = setTimeout(async () => {
          await this.refreshToken();
        }, timeUntilRefresh);
      } else {
        // Token již brzy vyprší nebo už vypršel - refresh okamžitě
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Token brzy vyprší - spouštím okamžitý refresh');
        }
        setTimeout(() => this.refreshToken(), 1000); // 1s delay pro inicializaci
      }
    } catch (error) {
      console.error('❌ Chyba při nastavování refresh timeru:', error);
    }
  }

  /**
   * Refresh token logic
   */
  async refreshToken() {
    // Prevent concurrent refreshes
    if (this.isRefreshing) {
      if (process.env.NODE_ENV === 'development') {

      }
      return;
    }

    this.isRefreshing = true;

    try {
      if (process.env.NODE_ENV === 'development') {

      }

      // Načti současné auth data
      const currentUser = await loadAuthData.user();
      const currentToken = await loadAuthData.token();

      if (!currentUser || !currentToken) {
        throw new Error('Missing auth data for refresh');
      }

      const tokenRefreshUrl = `${API_BASE_URL.replace(/\/+$/, '')}/token-refresh`;

      // Zavolej backend pro nový token
      const response = await fetch(tokenRefreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          old_token: currentToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.err || `Token refresh failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.token) {
        throw new Error('New token not received from server');
      }

      // Ulož nový token (automaticky s expirací 12h)
      await saveAuthData.token(data.token);

      if (process.env.NODE_ENV === 'development') {

        console.log(`📅 Nový token vyprší: ${data.expires_at || 'za 12h'}`);
      }

      // Naplánuj další refresh
      const newExpiresAt = data.expires_at 
        ? new Date(data.expires_at).getTime()
        : Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      
      this.startRefreshTimer(newExpiresAt);

      // Dispatch event pro ostatní části aplikace
      window.dispatchEvent(new CustomEvent('tokenRefreshed', {
        detail: { 
          token: data.token,
          expiresAt: newExpiresAt
        }
      }));

    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);

      // Dispatch error event
      window.dispatchEvent(new CustomEvent('authError', {
        detail: { 
          message: 'Token refresh failed. Please log in again.',
          error: error.message
        }
      }));

      // Vyčisti auth data (uživatel bude přesměrován na login)
      this.stopRefreshTimer();

    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Zastaví refresh timer
   */
  stopRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
      
      if (process.env.NODE_ENV === 'development') {

      }
    }
  }

  /**
   * Manuální trigger refreshe (pro testing nebo emergency situations)
   */
  async manualRefresh() {
    if (process.env.NODE_ENV === 'development') {

    }
    await this.refreshToken();
  }

  /**
   * Zjistí, jestli token brzy vyprší (< 15 minut)
   */
  async isTokenExpiringSoon() {
    try {
      const currentToken = await loadAuthData.token();
      if (!currentToken) return true;

      // TODO: Implementovat parsing tokenu a kontrolu expirace
      // Pro teď vrátíme false
      return false;
    } catch (error) {
      return true;
    }
  }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshService();

// Export pro testing
export { TokenRefreshService };
