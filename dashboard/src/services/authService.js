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

      if (response.ok) {
        const data = await response.json();
        
        // Microsoft Entra vyžaduje POST request pro logout
        // Vytvoříme hidden form a submitneme ho
        if (data.logoutUrl) {
          // Extrahuj endpoint a parametry
          const url = new URL(data.logoutUrl);
          const postLogoutRedirect = url.searchParams.get('post_logout_redirect_uri');
          
          // Vytvoř hidden form
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.logoutUrl.split('?')[0]; // URL bez parametrů
          form.style.display = 'none';
          
          // Přidej parametr jako hidden input
          if (postLogoutRedirect) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'post_logout_redirect_uri';
            input.value = postLogoutRedirect;
            form.appendChild(input);
          }
          
          // Přidej do DOM a submitni
          document.body.appendChild(form);
          form.submit();
        } else {
          window.location.href = '/';
        }
      } else {
        // Fallback - redirect na homepage
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
