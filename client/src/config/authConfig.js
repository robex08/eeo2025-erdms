/**
 * Microsoft Entra ID (MSAL) Configuration pro React
 */

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: import.meta.env.VITE_AZURE_AUTHORITY || `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    // Automatická detekce - použije aktuální origin (localhost, dev, nebo produkci)
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage', // 'localStorage' nebo 'sessionStorage'
    storeAuthStateInCookie: false, // Nastavit na true pro IE11/Edge
  },
  system: {
    // Povolit Windows Integrated Authentication pro Seamless SSO
    allowNativeBroker: false, // Pro web aplikace false
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
  },
};

// Scopes pro přihlášení a získání základních informací
export const loginRequest = {
  scopes: [
    'User.Read',
    'profile',
    'email',
    'openid',
  ],
  // Povolit seamless SSO - pokusí se o tiché přihlášení nejdřív
  prompt: 'select_account', // nebo 'none' pro úplně bezešvé SSO
};

// Scope pro volání vlastního API
export const apiRequest = {
  scopes: [import.meta.env.VITE_AZURE_API_SCOPE],
};

// Graph API endpoint pro získání detailů uživatele
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphMePhotoEndpoint: 'https://graph.microsoft.com/v1.0/me/photo/$value',
};
