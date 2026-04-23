// Úvodní stránka
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBoxOpen, FaBarcode, FaClipboardList, FaList, FaCog, FaSignOutAlt } from 'react-icons/fa';
import '../App.css';

function HomePage() {
  const [userName, setUserName] = useState('');
  const [inputName, setInputName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Načtení jména z localStorage při načtení stránky
  useEffect(() => {
    const savedName = localStorage.getItem('inventik_user_name');
    if (savedName) {
      setUserName(savedName);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputName.trim()) {
      localStorage.setItem('inventik_user_name', inputName.trim());
      setUserName(inputName.trim());
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('inventik_user_name');
    setUserName('');
    setInputName('');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    // Přihlašovací formulář s ikonami
    return (
      <div className="App">
        <header className="App-header">
          <div className="welcome-container">
            <div className="icon-group">
              <FaBoxOpen className="welcome-icon" />
              <FaBarcode className="welcome-icon" />
              <FaClipboardList className="welcome-icon" />
            </div>
            <h1>Inventík</h1>
            <p className="subtitle">Systém pro inventuru majetku</p>
            <div className="info-box" style={{ marginTop: '2rem' }}>
              <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Zadejte své jméno"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      border: '2px solid #0891b2',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'all 0.3s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0284c7'}
                    onBlur={(e) => e.target.style.borderColor = '#0891b2'}
                  />
                </div>
                <button type="submit" className="home-button" style={{ width: '100%' }}>
                  Přihlásit se
                </button>
              </form>
            </div>
            <p className="version" style={{ marginTop: '2rem', color: '#94a3b8' }}>
              Verze: {process.env.REACT_APP_VERSION || '1.0.0'}
            </p>
          </div>
        </header>
      </div>
    );
  }

  // Přihlášený uživatel - dlaždice akcí
  return (
    <div className="App">
      <header className="App-header">
        <div className="welcome-container" style={{ maxWidth: '800px' }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Vítej, {userName}!</h1>
          <p className="subtitle" style={{ marginBottom: '2.5rem' }}>Vyberte akci, kterou chcete provést</p>
          
          {/* Grid dlaždic */}
          <div className="tiles-grid">
            <Link to="/sken" className="tile">
              <div className="tile-icon">
                <FaBarcode />
              </div>
              <h3>Skenování</h3>
              <p>Naskenovat čárový kód majetku</p>
            </Link>

            <Link to="/inventura" className="tile">
              <div className="tile-icon">
                <FaClipboardList />
              </div>
              <h3>Inventura</h3>
              <p>Přehled naskenovaného majetku</p>
            </Link>

            <Link to="/prehled" className="tile">
              <div className="tile-icon">
                <FaList />
              </div>
              <h3>Přehled</h3>
              <p>Můj inventarizovaný majetek</p>
            </Link>

            <Link to="/ciselniky" className="tile">
              <div className="tile-icon">
                <FaCog />
              </div>
              <h3>Číselníky</h3>
              <p>Budovy, místnosti, úseky</p>
            </Link>
          </div>

          {/* Tlačítko odhlášení */}
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={handleLogout} 
              className="home-button" 
              style={{ 
                backgroundColor: '#dc2626', 
                borderColor: '#dc2626',
                maxWidth: '300px',
                margin: '0 auto'
              }}
            >
              <FaSignOutAlt /> Odhlásit se
            </button>
          </div>

          <p className="version" style={{ marginTop: '1.5rem', color: '#94a3b8' }}>
            Verze: {process.env.REACT_APP_VERSION || '1.0.0'}
          </p>
        </div>
      </header>
    </div>
  );
}

export default HomePage;
