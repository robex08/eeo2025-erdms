import { useState, useEffect } from 'react';
import authService from '../services/authService';
import './HomePage.css';

/**
 * Hlavní stránka po přihlášení
 */
function HomePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await authService.getCurrentUser();
      
      if (!userData) {
        // Nepřihlášen - redirect na login
        window.location.href = '/login';
        return;
      }

      setUser(userData);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Nepodařilo se načíst údaje uživatele');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading">Načítám uživatelská data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={loadUserData}>Zkusit znovu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>ERDMS</h1>
          <button className="btn-logout" onClick={handleLogout}>
            Odhlásit se
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="welcome-section">
          <h2>Vítejte, {user?.jmeno} {user?.prijmeni}!</h2>
          <p className="welcome-subtitle">Jste úspěšně přihlášeni do systému ERDMS</p>
        </div>

        <div className="user-info-card">
          <h3>Informace o uživateli</h3>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Celé jméno:</span>
              <span className="info-value">
                {user?.titul_pred && `${user.titul_pred} `}
                {user?.jmeno} {user?.prijmeni}
                {user?.titul_za && `, ${user.titul_za}`}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email || 'N/A'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Uživatelské jméno:</span>
              <span className="info-value">{user?.username || 'N/A'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Role:</span>
              <span className="info-value">{user?.role === 'admin' ? 'Administrátor' : 'Uživatel'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Zdroj autentizace:</span>
              <span className="info-value">{user?.auth_source === 'entra' ? 'Microsoft EntraID' : 'Databáze'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">UPN:</span>
              <span className="info-value">{user?.upn || 'Není zadáno'}</span>
            </div>
          </div>
        </div>

        <div className="debug-section">
          <details>
            <summary>Technické informace (debug)</summary>
            <pre>{JSON.stringify(user, null, 2)}</pre>
          </details>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
