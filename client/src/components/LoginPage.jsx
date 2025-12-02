import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import authService from '../services/authService';
import './LoginPage.css';

/**
 * Přihlašovací stránka s Microsoft Entra ID - ZZS Středočeský kraj
 */
function LoginPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    // Zkontroluj jestli není error parametr z callbacku
    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'user_not_found':
          setError('Uživatel nebyl nalezen v databázi. Kontaktujte administrátora.');
          break;
        case 'auth_failed':
          setError('Přihlášení se nezdařilo. Zkuste to prosím znovu.');
          break;
        default:
          setError('Došlo k chybě při přihlašování.');
      }
    }
  }, [searchParams]);

  const handleLogin = async () => {
    console.log('🔵 LoginPage: handleLogin() zavolán');
    console.log('🔵 API_URL:', import.meta.env.VITE_API_URL);
    console.log('🔵 Volám authService.login()...');
    await authService.login();
    console.log('🔵 authService.login() dokončen (tenhle log by se neměl zobrazit, protože redirect by měl přejít na MS)');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <img src="/logo-ZZS.png" alt="ZZS Logo" className="zzs-logo" />
          </div>
          <div className="header-text">
            <h1 className="organization-name">
              Zdravotnická záchranná služba<br />
              Středočeského kraje
            </h1>
            <p className="organization-type">příspěvková organizace</p>
          </div>
        </div>

        <div className="login-content">
          <div className="system-info">
            <h2 className="system-title">ERDMS</h2>
            <p className="system-description">Elektronický Rozcestník pro Dokument Management System</p>
          </div>

          <div className="login-section">
            <p className="login-instruction">
              Pro přístup do systému se přihlaste pomocí<br />
              Microsoft účtu vaší organizace
            </p>

            {error && (
              <div className="error-message">
                <svg className="error-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Použijeme button s onClick handlerem */}
            <button 
              onClick={handleLogin}
              className="btn-login-microsoft"
            >
              <svg className="microsoft-icon" viewBox="0 0 23 23" fill="none">
                <rect width="11" height="11" fill="#f25022"/>
                <rect x="12" width="11" height="11" fill="#7fba00"/>
                <rect y="12" width="11" height="11" fill="#00a4ef"/>
                <rect x="12" y="12" width="11" height="11" fill="#ffb900"/>
              </svg>
              <span>Přihlásit se přes Microsoft</span>
            </button>

            <div className="security-note">
              <svg className="shield-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span>Zabezpečené přihlášení Microsoft Entra ID</span>
            </div>

            <a 
              href="/MICROSOFT_ENTRA_SETUP.md" 
              download 
              className="download-doc-link"
            >
              <svg className="download-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              <span>Stáhnout dokumentaci - Microsoft Entra ID Setup</span>
            </a>
          </div>
        </div>

        <div className="login-footer">
          <p>&copy; 2025 Zdravotnická záchranná služba Středočeského kraje, p.o.</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
