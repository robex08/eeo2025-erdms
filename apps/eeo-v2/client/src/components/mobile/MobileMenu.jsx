import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useThemeMode from '../../theme/useThemeMode';
import './MobileMenu.css';

/**
 * Mobilní menu (slide-in) s možností odhlášení a přepínačem režimu
 */
function MobileMenu({ isOpen, onClose, user }) {
  const { logout } = useContext(AuthContext);
  const { mode, preference, setThemePreference } = useThemeMode();

  const handleLogout = async () => {
    try {
      await logout();
      // AuthContext už se postará o redirect
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`mobile-menu-overlay ${isOpen ? 'open' : ''}`}
        onClick={handleOverlayClick}
      />

      {/* Menu panel */}
      <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <button 
            className="mobile-menu-close" 
            onClick={onClose}
            aria-label="Zavřít menu"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          <h3>Menu</h3>
        </div>

        <div className="mobile-menu-content">
          {/* Info o uživateli */}
          {user && (
            <div className="mobile-menu-user">
              <div className="mobile-menu-user-avatar">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="mobile-menu-user-info">
                <div className="mobile-menu-user-name">{user.displayName || 'Uživatel'}</div>
                <div className="mobile-menu-user-email">{user.mail || user.upn || ''}</div>
              </div>
            </div>
          )}

          {/* Navigace */}
          <nav className="mobile-menu-nav">
            <a href="#" className="mobile-menu-item" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              <span>Domů</span>
            </a>
          </nav>

          {/* Režim zobrazení */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-section-title">Režim zobrazení</div>
            <div className="mobile-menu-theme-options">
              <button 
                className={`mobile-menu-theme-btn ${preference === 'auto' ? 'active' : ''}`}
                onClick={() => setThemePreference('auto')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Automaticky</span>
                {preference === 'auto' && (
                  <span className="mobile-menu-theme-current">({mode === 'dark' ? 'Tmavý' : 'Světlý'})</span>
                )}
              </button>
              <button 
                className={`mobile-menu-theme-btn ${preference === 'light' ? 'active' : ''}`}
                onClick={() => setThemePreference('light')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
                </svg>
                <span>Světlý</span>
              </button>
              <button 
                className={`mobile-menu-theme-btn ${preference === 'dark' ? 'active' : ''}`}
                onClick={() => setThemePreference('dark')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54 0 4.48-2.94 8.27-7 9.54.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z"/>
                </svg>
                <span>Tmavý</span>
              </button>
            </div>
          </div>

          {/* Odhlášení */}
          <div className="mobile-menu-footer">
            <button 
              className="mobile-menu-logout" 
              onClick={handleLogout}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <span>Odhlásit se</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileMenu;
