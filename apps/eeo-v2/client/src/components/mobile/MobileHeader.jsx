import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import './MobileHeader.css';

const logoZZS = '/eeo-v2/logo-ZZS.png';

/**
 * Mobilní hlavička s logem a zkratkou EEO
 * Obsahuje hamburger menu pro otevření navigace
 * @param {string} title - Vlastní nadpis (přepíše výchozí "EEO")
 * @param {boolean} showBackButton - Zobrazit tlačítko zpět
 * @param {function} onBackClick - Handler pro tlačítko zpět
 * @param {function} onActivityClick - Handler pro otevření historie aktivit
 * @param {number} activityCount - Počet aktivit v historii
 */
function MobileHeader({ title, onMenuClick, notificationCount = 0, showBackButton = false, onBackClick, onActivityClick, activityCount = 0 }) {
  const { hierarchyStatus } = useContext(AuthContext);
  
  // Získat verzi z ENV proměnné a extrahovat číslo verze
  const fullVersion = process.env.REACT_APP_VERSION || '1.88';
  const versionNumber = fullVersion.match(/(\d+\.\d+[a-z]?)/)?.[1] || fullVersion;
  
  // Získat profil ID z hierarchie
  const profileId = hierarchyStatus?.profileId;
  
  return (
    <header className="mobile-header">
      <div className="mobile-header-container">
        {/* Tlačítko zpět (pokud je showBackButton) */}
        {showBackButton ? (
          <button className="mobile-back-btn" onClick={onBackClick} aria-label="Zpět">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
        ) : (
          <>
            {/* Logo */}
            <div className="mobile-logo">
              <img src={logoZZS} alt="ZZS Logo" className="mobile-logo-img" />
            </div>
          </>
        )}

        {/* Název aplikace s verzí a profilem */}
        <div className="mobile-app-title">
          <h1>
            {title || 'EEO'}
            {!title && (
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
            )}
          </h1>
          {!title && <span className="mobile-app-subtitle">Elektronická evidence objednávek</span>}
        </div>

        {/* Historie aktivit a menu */}
        <div className="mobile-header-actions">
          {/* Historie aktivit (vlevo od hamburgeru) */}
          {!showBackButton && onActivityClick && (
            <button 
              className="mobile-activity-btn" 
              onClick={onActivityClick}
              aria-label="Historie aktivit"
            >
              <FontAwesomeIcon icon={faClockRotateLeft} />
              {activityCount > 0 && (
                <span className="mobile-activity-badge">{activityCount > 9 ? '9+' : activityCount}</span>
              )}
            </button>
          )}

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
