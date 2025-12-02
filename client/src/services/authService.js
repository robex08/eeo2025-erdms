/**
 * Auth Service - komunikace s backend API
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class AuthService {
  /**
   * Přesměruje na backend login endpoint (zahájí OAuth flow)
   */
  async login() {
    console.log('🟢 AuthService.login() START');
    console.log('🟢 API_URL:', API_URL);
    
    try {
      const loginUrl = `${API_URL}/auth/login`;
      console.log('🟢 Fetching auth URL from:', loginUrl);
      
      const response = await fetch(loginUrl);
      console.log('🟢 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      
      const data = await response.json();
      console.log('🟢 Received authUrl:', data.authUrl);
      console.log('🟢 Provádím window.location.href redirect na Microsoft...');
      
      // Redirect na Microsoft
      window.location.href = data.authUrl;
      
      console.log('🟢 Redirect proveden');
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
    console.log('🟡 AuthService.getCurrentUser() START');
    try {
      const url = `${API_URL}/auth/me`;
      console.log('🟡 Fetching:', url);
      const response = await fetch(url, {
        credentials: 'include', // Důležité pro cookies
      });
      console.log('🟡 Response status:', response.status);
      console.log('🟡 Response ok:', response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🟡 Status 401 - nepřihlášen');
          return null; // Nepřihlášen
        }
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      console.log('🟡 User data:', data);
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
