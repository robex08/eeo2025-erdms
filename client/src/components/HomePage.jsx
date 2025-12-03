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
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <h1>ERDMS</h1>
          <span className="user-email-header">{user?.email || 'robert.holovsky@eschevela.cz'}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Odhlásit se
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="home-main">
        {/* Levý sloupec */}
        <div className="left-column">
          {/* 1. ZÁKLADNÍ ÚDAJE */}
          <div className="section-basic-info">
            <h3 className="section-title">ZÁKLADNÍ ÚDAJE</h3>
            <div className="basic-info-content">
              <p className="info-line"><strong>JMÉNO</strong></p>
              <p className="info-line">{user?.jmeno} {user?.prijmeni}{user?.titul_za && `, ${user.titul_za}`}</p>
              
              <p className="info-line"><strong>EMAIL</strong></p>
              <p className="info-line">{user?.email || 'robert.holovsky@eschevela.cz'}</p>
              
              <p className="info-line"><strong>POZICE</strong></p>
              <p className="info-line">{user?.pozice || 'Programátor I'}</p>
              
              <p className="info-line"><strong>UŽIVATEL</strong></p>
              <p className="info-line">u{user?.id_osoba || '039324'}</p>
              
              <p className="info-line"><strong>ROLE</strong></p>
              <button className="btn-logout-box" onClick={handleLogout}>
                Odhlásit
              </button>
            </div>
          </div>

          {/* 2. APLIKACE - POD základními údaji */}
          <div className="section-apps">
            <h3 className="section-title">APLIKACE</h3>
            <div className="apps-grid">
              <div className="app-tile">
                <div className="app-icon">📦</div>
                <div className="app-info">
                  <h3>EEO</h3>
                  <p>Elektronická evidence objednávek</p>
                </div>
              </div>
              <div className="app-tile">
                <div className="app-icon">🌐</div>
                <div className="app-info">
                  <h3>Intranet</h3>
                  <p>Interní systém</p>
                </div>
              </div>
              <div className="app-tile">
                <div className="app-icon">🚗</div>
                <div className="app-info">
                  <h3>Vozidla</h3>
                  <p>Správa vozového parku</p>
                </div>
              </div>
              <div className="app-tile">
                <div className="app-icon">📊</div>
                <div className="app-info">
                  <h3>SZM</h3>
                  <p>Záruční řízení</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. DATA Z ENTRY - Pravý sloupec (celá výška) */}
        <div className="section-entra">
          <h2>ZÁKLADNÍ ÚDAJE</h2>
          
          <div className="data-row">
            <span className="data-label">Entra ID</span>
            <span className="data-value">{user?.entra_id || 'LFOM2X-341-4FT3-95c8-d809f74e74cb'}</span>
          </div>

          <div className="data-row">
            <span className="data-label">UPN</span>
            <span className="data-value">{user?.upn || user?.email || 'uzivatel@eschevela.cz'}</span>
          </div>

          <div className="data-row">
            <span className="data-label">Celé jméno:</span>
            <span className="data-value">
              {user?.titul_pred && `${user.titul_pred} `}
              {user?.jmeno} {user?.prijmeni}
              {user?.titul_za && `, ${user.titul_za}`}
            </span>
          </div>

          <div className="data-row">
            <span className="data-label">Křestní jméno</span>
            <span className="data-value">{user?.krestni_jmeno || user?.jmeno || 'Robert'}</span>
          </div>

          <div className="data-row">
            <span className="data-label">Příjmení</span>
            <span className="data-value">{user?.prijmeni || 'Holovský'}</span>
          </div>

          <h2 className="section-divider">PRACOVNÍ ÚDAJE</h2>

          <div className="data-row">
            <span className="data-label">Pozice:</span>
            <span className="data-value">{user?.pozice || 'Programátor I'}</span>
          </div>

          <h2 className="section-divider">KONTAKTNÍ ÚDAJE</h2>

          <div className="data-row">
            <span className="data-label">Email:</span>
            <span className="data-value">{user?.email || 'robert.holovsky@eschevela.cz'}</span>
          </div>

          <h2 className="section-divider">MANAŽER</h2>

          <div className="data-row">
            <span className="data-label">Jméno:</span>
            <span className="data-value">{user?.manazer_jmeno || 'Čeněkovský Jan | ZZ55K'}</span>
          </div>

          <div className="data-row">
            <span className="data-label">Email:</span>
            <span className="data-value">{user?.manazer_email || 'jan.cenekovsky@eschevela.cz'}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
