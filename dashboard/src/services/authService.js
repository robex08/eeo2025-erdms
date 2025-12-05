/**
 * Auth Service - komunikace s auth-api
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
      });

      const data = await response.json();
      
      // Přesměruj na Microsoft logout
      if (data.logoutUrl) {
        window.location.href = data.logoutUrl;
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
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
