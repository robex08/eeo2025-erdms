/**
 * Inkognito-aware wrapper pro authStorage
 *
 * ÚČEL:
 * - Detekuje anonymní režim prohlížeče
 * - V inkognito módu používá sessionStorage (automaticky zmizí po zavření okna)
 * - V normálním režimu používá localStorage (persistent)
 * - Transparentně nahrazuje původní authStorage
 */

import * as originalAuthStorage from './authStorage.js';
import { isIncognitoMode } from './incognitoDetection.js';

/**
 * Přepínač storage na základě inkognito detekce
 */
const getAppropriateStorage = async () => {
  const isIncognito = await isIncognitoMode();

  if (process.env.NODE_ENV === 'development') {
  }

  return isIncognito ? sessionStorage : localStorage;
};

/**
 * Inkognito-aware verze saveAuthData
 */
export const saveAuthData = {
  token: async (token) => {
    const storage = await getAppropriateStorage();

    // Pokud je to sessionStorage (inkognito), ulož jednodušeji
    if (storage === sessionStorage) {
      if (process.env.NODE_ENV === 'development') {
      }

      const tokenData = {
        value: token,
        expires: Date.now() + (12 * 60 * 60 * 1000) // 12h (zkráceno pro bezpečnost)
      };

      sessionStorage.setItem('auth_token_persistent', JSON.stringify(tokenData));
      return;
    }

    // Normální režim - použij původní funkci
    return originalAuthStorage.saveAuthData.token(token);
  },

  user: async (userData) => {
    const storage = await getAppropriateStorage();

    if (storage === sessionStorage) {
      if (process.env.NODE_ENV === 'development') {
      }
      sessionStorage.setItem('auth_user_persistent', JSON.stringify(userData));
      return;
    }

    return originalAuthStorage.saveAuthData.user(userData);
  },

  userDetail: async (userDetail) => {
    const storage = await getAppropriateStorage();

    if (storage === sessionStorage) {
      if (process.env.NODE_ENV === 'development') {
      }
      sessionStorage.setItem('auth_user_detail_persistent', JSON.stringify(userDetail));
      return;
    }

    return originalAuthStorage.saveAuthData.userDetail(userDetail);
  },

  userPermissions: async (permissions) => {
    const storage = await getAppropriateStorage();

    if (storage === sessionStorage) {
      if (process.env.NODE_ENV === 'development') {
      }
      sessionStorage.setItem('auth_user_permissions_persistent', JSON.stringify(permissions));
      return;
    }

    return originalAuthStorage.saveAuthData.userPermissions(permissions);
  }
};

/**
 * Inkognito-aware verze loadAuthData
 * Kontroluje NEJDŘÍV sessionStorage (inkognito), pak localStorage (normální)
 */
export const loadAuthData = {
  token: async () => {
    // Zkus nejdřív sessionStorage (pro inkognito režim)
    const sessionToken = sessionStorage.getItem('auth_token_persistent');
    if (sessionToken) {
      try {
        const tokenData = JSON.parse(sessionToken);

        // Zkontroluj expiraci
        if (tokenData.expires && Date.now() > tokenData.expires) {
          sessionStorage.removeItem('auth_token_persistent');
          return null;
        }

        if (process.env.NODE_ENV === 'development') {
        }

        return tokenData.value;
      } catch (e) {
      }
    }

    // Fallback na původní funkci (localStorage)
    return originalAuthStorage.loadAuthData.token();
  },

  user: async () => {
    // Zkus sessionStorage
    const sessionUser = sessionStorage.getItem('auth_user_persistent');
    if (sessionUser) {
      try {
        if (process.env.NODE_ENV === 'development') {
        }
        return JSON.parse(sessionUser);
      } catch (e) {
      }
    }

    // Fallback na localStorage
    return originalAuthStorage.loadAuthData.user();
  },

  userDetail: async () => {
    // Zkus sessionStorage
    const sessionDetail = sessionStorage.getItem('auth_user_detail_persistent');
    if (sessionDetail) {
      try {
        if (process.env.NODE_ENV === 'development') {
        }
        return JSON.parse(sessionDetail);
      } catch (e) {
      }
    }

    // Fallback na localStorage
    return originalAuthStorage.loadAuthData.userDetail();
  },

  userPermissions: async () => {
    // Zkus sessionStorage
    const sessionPerms = sessionStorage.getItem('auth_user_permissions_persistent');
    if (sessionPerms) {
      try {
        if (process.env.NODE_ENV === 'development') {
        }
        return JSON.parse(sessionPerms);
      } catch (e) {
      }
    }

    // Fallback na localStorage
    return originalAuthStorage.loadAuthData.userPermissions();
  }
};

/**
 * Clear funkce - vymaže z obou storage
 */
export const clearAuthData = {
  token: () => {
    sessionStorage.removeItem('auth_token_persistent');
    originalAuthStorage.clearAuthData.token();
  },

  user: () => {
    sessionStorage.removeItem('auth_user_persistent');
    originalAuthStorage.clearAuthData.user();
  },

  userDetail: () => {
    sessionStorage.removeItem('auth_user_detail_persistent');
    originalAuthStorage.clearAuthData.userDetail();
  },

  userPermissions: () => {
    sessionStorage.removeItem('auth_user_permissions_persistent');
    originalAuthStorage.clearAuthData.userPermissions();
  },

  all: () => {
    clearAuthData.token();
    clearAuthData.user();
    clearAuthData.userDetail();
    clearAuthData.userPermissions();
  }
};

/**
 * Re-export ostatních funkcí
 */
export const migrateAuthDataToSessionStorage = originalAuthStorage.migrateAuthDataToSessionStorage;
export const hasAuthData = originalAuthStorage.hasAuthData;
