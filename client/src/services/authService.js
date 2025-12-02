/**
 * Auth Service - komunikace s backend API
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class AuthService {
  /**
   * Přesměruje na backend login endpoint (zahájí OAuth flow)
   */
  login() {
    window.location.href = `${API_URL}/auth/login`;
  }

  /**
   * Odhlásí uživatele
   */
  async logout() {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Důležité pro cookies
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
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include', // Důležité pro cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null; // Nepřihlášen
        }
        throw new Error('Failed to fetch user');
      }

      return await response.json();
    } catch (error) {
      console.error('Get user error:', error);
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
