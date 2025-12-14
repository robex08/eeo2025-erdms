import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './MobileMenu.css';

/**
 * Mobilní menu (slide-in) s možností odhlášení
 */
function MobileMenu({ isOpen, onClose, user }) {
  const { logout } = useContext(AuthContext);

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
