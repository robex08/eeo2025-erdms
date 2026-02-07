const msalConfig = {
  auth: {
    clientId: process.env.ENTRA_CLIENT_ID,
    authority: process.env.ENTRA_AUTHORITY,
    clientSecret: process.env.ENTRA_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (process.env.NODE_ENV === 'development') {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? 3 : 1, // 3=Verbose, 1=Error
    }
  }
};

const REDIRECT_URI = process.env.ENTRA_REDIRECT_URI;
const POST_LOGOUT_REDIRECT_URI = process.env.CLIENT_URL;

// Scopes pro přístup k uživatelským údajům a kalendáři
const SCOPES = [
  'User.Read',
  'email',
  'openid',
  'profile',
  'Calendars.Read',
  'Calendars.Read.Shared'
];

module.exports = {
  msalConfig,
  REDIRECT_URI,
  POST_LOGOUT_REDIRECT_URI,
  SCOPES
};
