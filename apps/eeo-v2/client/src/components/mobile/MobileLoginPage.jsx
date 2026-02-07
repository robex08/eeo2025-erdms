import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import useThemeMode from '../../theme/useThemeMode';
import { User, Lock } from 'lucide-react';
import './MobileLoginPage.css';

const logoZZS = '/eeo-v2/logo-ZZS.png';

/**
 * 📱 Zjednodušená mobilní přihlašovací stránka
 * 🎨 Podporuje light/dark mode dle system preference
 */
function MobileLoginPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  // ✅ Inicializace theme mode - zapne detekci system preference
  useThemeMode();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!username || !password) {
      setError('Zadejte uživatelské jméno a heslo.');
      return;
    }

    try {
      setLoading(true);
      // ✅ Posílat plaintext heslo - loginApi2 si udělá MD5 hash sám
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Přihlášení se nezdařilo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-login-container">
      <div className="mobile-login-content">
        {/* Logo a název */}
        <div className="mobile-login-header">
          <div className="mobile-login-logo">
            <img src={logoZZS} alt="ZZS Logo" />
          </div>
          <h1 className="mobile-login-org">ZZS Středočeský kraj</h1>
          <p className="mobile-login-org-type">příspěvková organizace</p>
        </div>

        {/* Název aplikace */}
        <div className="mobile-login-app">
          <h2>EEO</h2>
          <p>Elektronická evidence objednávek</p>
        </div>

        {/* Chybová zpráva */}
        {error && (
          <div className="mobile-login-error">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Přihlašovací formulář */}
        <form onSubmit={handleSubmit} className="mobile-login-form">
          <div className="mobile-login-input-group">
            <User size={18} className="mobile-login-icon" />
            <input
              type="text"
              placeholder="Uživatelské jméno"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="mobile-login-input-group">
            <Lock size={18} className="mobile-login-icon" />
            <input
              type="password"
              placeholder="Heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit"
            className="mobile-login-btn"
            disabled={loading}
          >
            {loading ? (
              <span>Přihlašování...</span>
            ) : (
              <span>Přihlásit se</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mobile-login-footer">
        <p>&copy; 2025 ZZS Středočeského kraje, p.o.</p>
      </div>
    </div>
  );
}

export default MobileLoginPage;
