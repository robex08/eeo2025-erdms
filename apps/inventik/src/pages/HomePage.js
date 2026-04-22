// Úvodní stránka
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaBarcode, FaClipboardList, FaUser, FaSignOutAlt } from 'react-icons/fa';
import '../App.css';

function HomePage() {
  const [userName, setUserName] = useState('');
  const [inputName, setInputName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

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
    // Přihlašovací formulář
    return (
      <div className="App">
        <header className="App-header">
          <div className="welcome-container">
            <div className="icon-group">
              <FaUser className="welcome-icon" style={{ fontSize: '4rem' }} />
            </div>
            <h1>Přihlášení do Inventiku</h1>
            <p className="subtitle">Zadejte své jméno pro vstup do aplikace</p>
            <div className="info-box" style={{ marginTop: '2rem' }}>
              <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Vaše jméno *"
                    required
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
                  <FaUser /> Vstoupit do aplikace
                </button>
              </form>
            </div>
          </div>
        </header>
      </div>
    );
  }

  // Přihlášený uživatel - úvodní menu
  return (
    <div className="App">
      <header className="App-header">
        <div className="welcome-container">
          <div className="icon-group">
            <FaBoxOpen className="welcome-icon" />
            <FaBarcode className="welcome-icon" />
            <FaClipboardList className="welcome-icon" />
          </div>
          <h1>Vítej, {userName}!</h1>
          <p className="subtitle">Systém pro inventuru majetku</p>
          <div className="info-box">
            <p>Aplikace je připravena k použití</p>
            <p className="version">Verze: {process.env.REACT_APP_VERSION || '1.0.0'}</p>
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link to="/sken" className="home-button">
                <FaBarcode /> Začít skenování
              </Link>
              <button 
                onClick={handleLogout} 
                className="home-button" 
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              >
                <FaSignOutAlt /> Odhlásit se
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default HomePage;
