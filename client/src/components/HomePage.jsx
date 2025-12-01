import { useMsal } from '@azure/msal-react';
import { useState, useEffect } from 'react';
import './HomePage.css';

/**
 * Hlavní stránka po přihlášení
 */
function HomePage() {
  const { instance, accounts } = useMsal();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchUserDetails();
    }
  }, [accounts]);

  const fetchUserDetails = async () => {
    try {
      const account = accounts[0];
      
      // Získání access tokenu pro Graph API
      const response = await instance.acquireTokenSilent({
        scopes: ['User.Read'],
        account: account,
      });

      // Volání Graph API pro detaily uživatele
      const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });

      const userData = await graphResponse.json();
      setUserDetails(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    instance.logoutPopup({
      postLogoutRedirectUri: '/',
    });
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading">Načítám uživatelská data...</div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>ERDMS</h1>
          <button className="btn-logout" onClick={handleLogout}>
            Odhlásit se
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="welcome-section">
          <h2>Vítejte, {userDetails?.givenName || accounts[0]?.name}!</h2>
          <p className="welcome-subtitle">Jste úspěšně přihlášeni do systému ERDMS</p>
        </div>

        <div className="user-info-card">
          <h3>Informace o uživateli</h3>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Celé jméno:</span>
              <span className="info-value">{userDetails?.displayName || 'N/A'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{userDetails?.mail || userDetails?.userPrincipalName || 'N/A'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Pracovní pozice:</span>
              <span className="info-value">{userDetails?.jobTitle || 'Není zadáno'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Oddělení:</span>
              <span className="info-value">{userDetails?.department || 'Není zadáno'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Telefon:</span>
              <span className="info-value">{userDetails?.mobilePhone || userDetails?.businessPhones?.[0] || 'Není zadáno'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Kancelář:</span>
              <span className="info-value">{userDetails?.officeLocation || 'Není zadáno'}</span>
            </div>
          </div>
        </div>

        <div className="debug-section">
          <details>
            <summary>Technické informace (debug)</summary>
            <pre>{JSON.stringify(userDetails, null, 2)}</pre>
          </details>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
