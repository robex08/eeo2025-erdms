import { useState, useEffect } from 'react';
import authService from '../services/authService';
import './Dashboard.css';

/**
 * Dashboard - hlavní stránka po přihlášení
 */
function Dashboard() {
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
      setError('Nepodařilo se načíst údaje uživatele');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Načítám data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={loadUserData}>Zkusit znovu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <img src="/logo-ZZS.png" alt="ZZS Logo" className="header-logo" />
            <div className="system-title">
              <h1>ERDMS</h1>
              <p>Elektronický Rozcestník pro Document Management</p>
            </div>
          </div>
          <div className="user-section">
            <div className="user-info">
              <span className="user-name">
                {user.titul_pred && `${user.titul_pred} `}
                {user.jmeno} {user.prijmeni}
                {user.titul_za && `, ${user.titul_za}`}
              </span>
              <span className="user-email">{user.email}</span>
              <span className="user-role">{user.role === 'admin' ? 'Administrátor' : 'Uživatel'}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              Odhlásit se
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Vítejte v systému ERDMS</h2>
          <p>
            Jste přihlášen jako: <strong>{user.username}</strong>
          </p>
        </div>

        <div className="user-details-card">
          <h3>Údaje z EntraID</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{user.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Uživatelské jméno:</span>
              <span className="detail-value">{user.username}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Jméno:</span>
              <span className="detail-value">
                {user.titul_pred && `${user.titul_pred} `}
                {user.jmeno} {user.prijmeni}
                {user.titul_za && `, ${user.titul_za}`}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Role:</span>
              <span className="detail-value badge-role">
                {user.role === 'admin' ? 'Administrátor' : 'Uživatel'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Zdroj autentizace:</span>
              <span className="detail-value badge-auth">
                {user.auth_source === 'entra_id' ? 'Microsoft EntraID' : 'Databáze'}
              </span>
            </div>
          </div>
        </div>

        <div className="applications-section">
          <h3>Dostupné aplikace</h3>
          <div className="apps-grid">
            <div className="app-card">
              <h4>EEO</h4>
              <p>Elektronická evidence osobního automobilu</p>
              <button className="btn-app">Otevřít</button>
            </div>
            <div className="app-card">
              <h4>Intranet</h4>
              <p>Interní informační systém</p>
              <button className="btn-app">Otevřít</button>
            </div>
            <div className="app-card">
              <h4>Vozidla</h4>
              <p>Správa vozového parku</p>
              <button className="btn-app">Otevřít</button>
            </div>
            <div className="app-card">
              <h4>SZM</h4>
              <p>Systém zdravotnického materiálu</p>
              <button className="btn-app">Otevřít</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
