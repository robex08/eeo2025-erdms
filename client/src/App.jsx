import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './config/authConfig';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import './App.css';
import { useEffect } from 'react';

// Vytvoření MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Inicializace MSAL - pokus o SSO při načtení
msalInstance.initialize().then(() => {
  // Pokus o tiché přihlášení (SSO)
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    // Zkus získat účet přes SSO
    msalInstance.ssoSilent(loginRequest).catch(error => {
      // SSO selhalo - uživatel se musí přihlásit manuálně
      console.log('SSO not available:', error);
    });
  }
});

// Event callback pro logování MSAL událostí
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS) {
    console.log('Login successful via SSO');
  }
});

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <div className="App">
        <AuthenticatedTemplate>
          <HomePage />
        </AuthenticatedTemplate>
        
        <UnauthenticatedTemplate>
          <LoginPage />
        </UnauthenticatedTemplate>
      </div>
    </MsalProvider>
  );
}

export default App;
