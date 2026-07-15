/**
 * Auth Service - komunikace s auth-api
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DASHBOARD_LOGIN_PATH = '/dashboard/login';

const isValidUserPayload = (data) => {
  if (!data || typeof data !== 'object') return false;

  // Minimální identifikátory uživatele, které musí backend vrátit.
  return Boolean(data.id || data.username || data.upn || data.email);
};

class AuthService {
  /**
   * Přesměruje na backend login endpoint (zahájí OAuth flow)
   */
  async login() {
    try {
      const loginUrl = `${API_URL}/auth/login`;
      console.log('Fetching:', loginUrl);
      
      const response = await fetch(loginUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      
      const data = await response.json();
      
      // Redirect na Microsoft
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('🔴 Login error:', error);
      alert('Chyba při přihlašování: ' + error.message);
    }
  }

  /**
   * Odhlásí uživatele
   */
  async logout() {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin: window.location.origin
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Microsoft logout endpoint očekává redirect na URL.
        if (data.logoutUrl) {
          window.location.assign(data.logoutUrl);
        } else {
          window.location.assign(DASHBOARD_LOGIN_PATH);
        }
      } else {
        // Fallback - redirect na login i při chybové odpovědi API.
        window.location.assign(DASHBOARD_LOGIN_PATH);
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.assign(DASHBOARD_LOGIN_PATH);
    }
  }

  /**
   * Získá informace o přihlášeném uživateli
   */
  async getCurrentUser() {
    try {
      const url = `${API_URL}/auth/me`;
      console.log('Fetching:', url);
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();

      // Ochrana proti nekonzistentní odpovědi backendu (např. prázdný objekt).
      if (!isValidUserPayload(data)) {
        console.warn('Received invalid /auth/me payload:', data);
        return null;
      }

      return data;
    } catch (error) {
      console.error('🔴 Get user error:', error);
      return null;
    }
  }

  /**
   * Zkontroluje jestli je uživatel přihlášen
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return user !== null;
  }
}

export default new AuthService();
