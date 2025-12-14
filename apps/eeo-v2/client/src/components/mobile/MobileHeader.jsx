import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './MobileHeader.css';

const logoZZS = '/eeo-v2/logo-ZZS.png';

/**
 * Mobilní hlavička s logem a zkratkou EEO
 * Obsahuje hamburger menu pro otevření navigace
 */
function MobileHeader({ onMenuClick, notificationCount = 0 }) {
  const { hierarchyStatus } = useContext(AuthContext);
  
  // Získat verzi z ENV proměnné a extrahovat číslo verze
  const fullVersion = process.env.REACT_APP_VERSION || '1.88';
  const versionNumber = fullVersion.match(/(\d+\.\d+[a-z]?)/)?.[1] || fullVersion;
  
  // Získat profil ID z hierarchie
  const profileId = hierarchyStatus?.profileId;
  
  return (
    <header className="mobile-header">
      <div className="mobile-header-container">
        {/* Logo */}
        <div className="mobile-logo">
          <img src={logoZZS} alt="ZZS Logo" className="mobile-logo-img" />
        </div>

        {/* Název aplikace s verzí a profilem */}
        <div className="mobile-app-title">
          <h1>
            EEO
            <sup style={{ 
              fontSize: '0.45em', 
              marginLeft: '4px', 
              fontWeight: '600', 
              color: '#fbbf24',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              {versionNumber}
              {profileId && (
                <span style={{ color: '#10b981', fontWeight: '700' }}>.H{profileId}</span>
              )}
            </sup>
          </h1>
          <span className="mobile-app-subtitle">Elektronická evidence objednávek</span>
        </div>

        {/* Notifikace a menu */}
        <div className="mobile-header-actions">
          {/* Zvoneček s notifikacemi */}
          {notificationCount > 0 && (
            <button className="mobile-notification-btn" aria-label="Notifikace">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
              </svg>
              {notificationCount > 0 && (
                <span className="mobile-notification-badge">{notificationCount > 99 ? '99+' : notificationCount}</span>
              )}
            </button>
          )}

          {/* Hamburger menu */}
          <button 
            className="mobile-menu-btn" 
            onClick={onMenuClick}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default MobileHeader;
