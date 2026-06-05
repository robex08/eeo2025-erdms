import { Configuration, LogLevel } from '@azure/msal-browser';

/**
 * EntraID (Microsoft Azure AD) Konfigurace
 * Pro více informací: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications
 */

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_ENTRA_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: import.meta.env.VITE_ENTRA_REDIRECT_URI || window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

/**
 * Scopes pro získání přístupových tokenů
 */
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

/**
 * Přidejte API scopes pro přístup k vašemu PHP backend API
 */
export const apiRequest = {
  scopes: ['User.Read'],
};
