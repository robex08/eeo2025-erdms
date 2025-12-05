/**
 * Utility pro logout notifikace a důvody odhlášení
 */

import { safeToast, emergencyToast } from './globalToast';

// Důvody odhlášení s user-friendly zprávami
export const LOGOUT_REASONS = {
  USER_MANUAL: {
    code: 'USER_MANUAL',
    title: 'Odhlášení',
    message: 'Byli jste úspěšně odhlášeni.',
    type: 'success',
    duration: 3000
  },

  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    title: 'Platnost přihlášení vypršela',
    message: 'Vaše přihlášení vypršelo. Prosím přihlaste se znovu.',
    type: 'warning',
    duration: 5000
  },

  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    title: 'Neplatné přihlášení',
    message: 'Vaše přihlášení je neplatné. Prosím přihlaste se znovu.',
    type: 'warning',
    duration: 5000
  },

  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    title: 'Chyba serveru',
    message: 'Došlo k chybě při komunikaci se serverem. Byli jste odhlášeni.',
    type: 'error',
    duration: 6000
  },

  ACCOUNT_DEACTIVATED: {
    code: 'ACCOUNT_DEACTIVATED',
    title: 'Účet deaktivován',
    message: 'Váš účet byl deaktivován. Kontaktujte administrátora.',
    type: 'error',
    duration: 8000
  },

  DATA_CORRUPTION: {
    code: 'DATA_CORRUPTION',
    title: 'Poškozená data',
    message: 'Byla detekována poškozená přihlašovací data. Prosím přihlaste se znovu.',
    type: 'warning',
    duration: 6000
  },

  SECURITY_CLEANUP: {
    code: 'SECURITY_CLEANUP',
    title: 'Bezpečnostní vyčištění',
    message: 'Z bezpečnostních důvodů byla provedena obnova přihlášení.',
    type: 'info',
    duration: 5000
  },

  ENCRYPTION_ERROR: {
    code: 'ENCRYPTION_ERROR',
    title: 'Chyba šifrování',
    message: 'Došlo k chybě při zabezpečení dat. Prosím přihlaste se znovu.',
    type: 'warning',
    duration: 6000
  },

  DEVELOPMENT_RESET: {
    code: 'DEVELOPMENT_RESET',
    title: 'Vývojový reset',
    message: 'Přihlašovací data byla resetována (vývojový režim).',
    type: 'info',
    duration: 4000
  }
};

// Funkce pro zobrazení logout toast notifikace
export const showLogoutToast = (showToast, reason = LOGOUT_REASONS.USER_MANUAL, additionalInfo = null) => {
  const logoutReason = typeof reason === 'string'
    ? LOGOUT_REASONS[reason] || LOGOUT_REASONS.USER_MANUAL
    : reason;

  let message = logoutReason.message;

  // Přidej dodatečné informace pokud jsou k dispozici
  if (additionalInfo) {
    if (typeof additionalInfo === 'string') {
      message += ` ${additionalInfo}`;
    } else if (additionalInfo.details) {
      message += ` Detaily: ${additionalInfo.details}`;
    }
  }

  const toastOptions = {
    type: logoutReason.type,
    title: logoutReason.title,
    duration: logoutReason.duration,
    position: 'top-right'
  };

  // Použij safe toast s fallbackem na global toast
  const success = safeToast(showToast, message, toastOptions);

  // Pro kritické chyby použij emergency toast pokud normální selhal
  if (!success && logoutReason.type === 'error' &&
      (logoutReason.code === 'ACCOUNT_DEACTIVATED' || logoutReason.code === 'SERVER_ERROR')) {
    emergencyToast(`${logoutReason.title}: ${message}`, 'error');
  }

  // Log pro debugging
};

// Detekce důvodu odhlášení na základě chyby/kontextu
export const detectLogoutReason = (error, context = {}) => {
  if (!error) return LOGOUT_REASONS.USER_MANUAL;

  const errorMessage = error.message || error.toString().toLowerCase();
  const errorCode = error.code || error.status;

  // Server errors
  if (errorCode === 401 || errorMessage.includes('unauthorized')) {
    return LOGOUT_REASONS.TOKEN_EXPIRED;
  }

  if (errorCode === 403 || errorMessage.includes('forbidden')) {
    return LOGOUT_REASONS.TOKEN_INVALID;
  }

  if (errorCode >= 500 || errorMessage.includes('server') || errorMessage.includes('network')) {
    return LOGOUT_REASONS.SERVER_ERROR;
  }

  // Encryption errors
  if (errorMessage.includes('decrypt') || errorMessage.includes('encrypt') ||
      errorMessage.includes('operationerror') || errorMessage.includes('crypto')) {
    return LOGOUT_REASONS.ENCRYPTION_ERROR;
  }

  // JSON/Data parsing errors
  if (errorMessage.includes('json') || errorMessage.includes('parse') ||
      errorMessage.includes('syntax')) {
    return LOGOUT_REASONS.DATA_CORRUPTION;
  }

  // Account status
  if (errorMessage.includes('deactivat') || errorMessage.includes('disabled') ||
      errorMessage.includes('suspended')) {
    return LOGOUT_REASONS.ACCOUNT_DEACTIVATED;
  }

  // Context-based detection
  if (context.isDataCorrupted) {
    return LOGOUT_REASONS.DATA_CORRUPTION;
  }

  if (context.isSecurityCleanup) {
    return LOGOUT_REASONS.SECURITY_CLEANUP;
  }

  if (context.isDevelopmentReset) {
    return LOGOUT_REASONS.DEVELOPMENT_RESET;
  }

  // Default fallback
  return LOGOUT_REASONS.TOKEN_INVALID;
};

// Utility pro logování logout events
export const logLogoutEvent = (reason, additionalData = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    reason: typeof reason === 'string' ? reason : reason.code,
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...additionalData
  };

  if (process.env.NODE_ENV === 'development') {
  }

  // V produkci zde můžeš přidat analytics tracking
  // analytics.track('user_logout', logData);

  return logData;
};