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
    console.log('🟣 Dashboard: loadUserData() START');
    try {
      setLoading(true);
      console.log('🟣 Dashboard: Volám authService.getCurrentUser()...');
      const userData = await authService.getCurrentUser();
      console.log('🟣 Dashboard: getCurrentUser() response:', userData);
      
      if (!userData) {
        // Nepřihlášen - redirect na login
        console.log('🟣 Dashboard: Žádná data - redirect na /login');
        window.location.href = '/login';
        return;
      }

      console.log('🟣 Dashboard: Setting user data:', userData);
      setUser(userData);
    } catch (err) {
      console.error('🔴 Dashboard ERROR:', err);
      setError('Nepodařilo se načíst údaje uživatele');
      console.error(err);
    } finally {
      setLoading(false);
      console.log('🟣 Dashboard: loadUserData() KONEC');
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
            <h1>ERDMS</h1>
            <p className="subtitle">Elektronický Rozcestník</p>
          </div>
          <div className="user-section">
            <div className="user-info">
              <span className="user-name">
                {user.entraData?.displayName || `${user.jmeno} ${user.prijmeni}`}
              </span>
              <span className="user-email">{user.entraData?.mail || user.email}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              Odhlásit
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="content-wrapper">
          {/* Profil uživatele */}
          <section className="profile-card">
            <h3>Můj profil</h3>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="label">Jméno</span>
                <span className="value">{user.entraData?.displayName || `${user.jmeno} ${user.prijmeni}`}</span>
              </div>
              <div className="profile-item">
                <span className="label">Email</span>
                <span className="value">{user.entraData?.mail || user.email}</span>
              </div>
              {user.entraData?.jobTitle && (
                <div className="profile-item">
                  <span className="label">Pozice</span>
                  <span className="value">{user.entraData.jobTitle}</span>
                </div>
              )}
              {user.entraData?.department && (
                <div className="profile-item">
                  <span className="label">Oddělení</span>
                  <span className="value">{user.entraData.department}</span>
                </div>
              )}
              {user.entraData?.officeLocation && (
                <div className="profile-item">
                  <span className="label">Pracoviště</span>
                  <span className="value">{user.entraData.officeLocation}</span>
                </div>
              )}
              {(user.entraData?.mobilePhone || user.entraData?.businessPhones?.[0]) && (
                <div className="profile-item">
                  <span className="label">Telefon</span>
                  <span className="value">
                    {user.entraData.mobilePhone || user.entraData.businessPhones[0]}
                  </span>
                </div>
              )}
              <div className="profile-item">
                <span className="label">Uživatel</span>
                <span className="value">{user.username}</span>
              </div>
              <div className="profile-item">
                <span className="label">Role</span>
                <span className="value badge-role">
                  {user.role === 'admin' ? 'Admin' : 'Uživatel'}
                </span>
              </div>
            </div>
          </section>

          {/* Aplikace */}
          <section className="apps-section">
            <h3>Aplikace</h3>
            <div className="apps-grid">
              <a href="/eeo" className="app-card">
                <div className="app-icon">🚗</div>
                <h4>EEO</h4>
                <p>Evidence osobního automobilu</p>
              </a>
              <a href="/intranet" className="app-card">
                <div className="app-icon">📋</div>
                <h4>Intranet</h4>
                <p>Interní systém</p>
              </a>
              <a href="/vozidla" className="app-card">
                <div className="app-icon">🚑</div>
                <h4>Vozidla</h4>
                <p>Správa vozového parku</p>
              </a>
              <a href="/szm" className="app-card">
                <div className="app-icon">🏥</div>
                <h4>SZM</h4>
                <p>Zdravotnický materiál</p>
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
