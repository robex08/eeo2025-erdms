/**
 * Microsoft Entra ID (MSAL) Configuration
 */

require('dotenv').config();

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: process.env.AZURE_AUTHORITY || `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (process.env.NODE_ENV === 'development') {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? 'Info' : 'Error',
    },
  },
};

// Validace konfigurace
const validateConfig = () => {
  const required = ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = {
  msalConfig,
  validateConfig,
  // Scope pro API
  apiScope: process.env.AZURE_API_SCOPE || `api://${process.env.AZURE_CLIENT_ID}/access_as_user`,
};
