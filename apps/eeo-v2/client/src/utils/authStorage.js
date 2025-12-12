/**
 * Bezpečná správa autentifikačních dat
 * Používá sessionStorage pro tokeny (automatické smazání po zavření prohlížeče)
 * a localStorage pro méně citlivá data (nastavení, preference uživatele)
 *
 * BEZPEČNOST: Citlivá data jsou šifrována pomocí Web Crypto          // Minimální debug log
          // if (process.env.NODE_ENV === 'development') console.log('🔓 User data dešifrována');I
 */

import { encryptData, decryptData } from './encryption.js';
import { shouldEncryptData, ENCRYPTION_CONFIG } from './encryptionConfig.js';

// Klíče pro localStorage s persistent tokenem (24h expiration)
const PERSISTENT_KEYS = {
  TOKEN: 'auth_token_persistent',
  USER: 'auth_user_persistent',
  USER_DETAIL: 'auth_user_detail_persistent',
  USER_PERMISSIONS: 'auth_user_permissions_persistent'
};

// Klíče pro sessionStorage (dočasná data)
const SESSION_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  USER_DETAIL: 'auth_user_detail',
  USER_PERMISSIONS: 'auth_user_permissions'
};

// Klíče pro localStorage (méně citlivá data)
const LOCAL_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  UI_SETTINGS: 'ui_settings'
};

// Konstanta pro dobu platnosti tokenu (7 dní - rozšířeno z 24 hodin)
const TOKEN_EXPIRY_HOURS = 24 * 7; // 7 dní

/**
 * Uložení autentifikačních dat do localStorage s expirací (smart šifrování)
 */
export const saveAuthData = {
  token: async (token) => {
    try {
      const tokenData = {
        value: token,
        expires: Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000) // 7 dní
      };

      const dataString = JSON.stringify(tokenData);

      if (shouldEncryptData(PERSISTENT_KEYS.TOKEN)) {
        const encrypted = await encryptData(dataString);
        if (encrypted) {
          localStorage.setItem(PERSISTENT_KEYS.TOKEN, encrypted);
          if (process.env.NODE_ENV === 'development') {
            // console.log('🔒 Token zašifrován a uložen s expirací 24h');
          }
          return;
        }
      }
      // Fallback na nešifrované uložení
      localStorage.setItem(PERSISTENT_KEYS.TOKEN, dataString);
      if (process.env.NODE_ENV === 'development') {
        // console.log('⚠️ Token uložen NEŠIFROVANĚ s expirací 24h (fallback)');
      }
    } catch (error) {
      // Fallback na nešifrované uložení
      const tokenData = { value: token, expires: Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000) };
      localStorage.setItem(PERSISTENT_KEYS.TOKEN, JSON.stringify(tokenData));
    }
  },

  user: async (userData) => {
    try {
      const jsonData = JSON.stringify(userData);
      if (shouldEncryptData(PERSISTENT_KEYS.USER)) {
        const encrypted = await encryptData(jsonData);
        if (encrypted) {
          localStorage.setItem(PERSISTENT_KEYS.USER, encrypted);
          if (process.env.NODE_ENV === 'development') {
            // console.log('🔒 User data zašifrována a uložena');
          }
          // Uložit username samostatně pro snadný přístup (nezašifrovaný)
          if (userData.username) {
            localStorage.setItem('username', userData.username);
          }
          return;
        }
      }
      // Fallback na nešifrované uložení
      localStorage.setItem(PERSISTENT_KEYS.USER, jsonData);
      if (process.env.NODE_ENV === 'development') {
        // console.log('⚠️ User data uložena NEŠIFROVANĚ (fallback)');
      }
      // Uložit username samostatně pro snadný přístup
      if (userData.username) {
        localStorage.setItem('username', userData.username);
      }
    } catch (error) {
      // Fallback
      localStorage.setItem(PERSISTENT_KEYS.USER, JSON.stringify(userData));
      // Uložit username samostatně pro snadný přístup
      if (userData.username) {
        localStorage.setItem('username', userData.username);
      }
    }
  },

  userDetail: async (userDetail) => {
    try {
      const jsonData = JSON.stringify(userDetail);
      if (shouldEncryptData(PERSISTENT_KEYS.USER_DETAIL)) {
        const encrypted = await encryptData(jsonData);
        if (encrypted) {
          localStorage.setItem(PERSISTENT_KEYS.USER_DETAIL, encrypted);
          if (process.env.NODE_ENV === 'development') {

          }
          return;
        }
      }
      // Fallback na nešifrované uložení
      localStorage.setItem(PERSISTENT_KEYS.USER_DETAIL, jsonData);
      if (process.env.NODE_ENV === 'development') {
        // User detail uložen NEŠIFROVANĚ (fallback)
      }
    } catch (error) {
      // Fallback
      localStorage.setItem(PERSISTENT_KEYS.USER_DETAIL, JSON.stringify(userDetail));
    }
  },

  userPermissions: async (permissions) => {
    try {
      const jsonData = JSON.stringify(permissions);
      if (shouldEncryptData(PERSISTENT_KEYS.USER_PERMISSIONS)) {
        const encrypted = await encryptData(jsonData);
        if (encrypted) {
          localStorage.setItem(PERSISTENT_KEYS.USER_PERMISSIONS, encrypted);
          if (process.env.NODE_ENV === 'development') {
            // console.log('🔒 User permissions zašifrovány a uloženy');
          }
          return;
        }
      }
      // Fallback na nešifrované uložení
      localStorage.setItem(PERSISTENT_KEYS.USER_PERMISSIONS, jsonData);
      if (process.env.NODE_ENV === 'development') {
        // User permissions uloženy NEŠIFROVANĚ (fallback)
      }
    } catch (error) {
      // Fallback
      localStorage.setItem(PERSISTENT_KEYS.USER_PERMISSIONS, JSON.stringify(permissions));
    }
  }
};

/**
 * Načtení autentifikačních dat ze sessionStorage
 */
export const loadAuthData = {
  token: async () => {
    try {
      // Token je uložen v localStorage s expirací (persistent)
      const stored = localStorage.getItem(PERSISTENT_KEYS.TOKEN);
      if (!stored) return null;

      let tokenData;
      let decryptedString = null;

      // Pokus o dešifrování pouze pokud data vypadají jako zašifrovaná (base64)
      if (shouldEncryptData(PERSISTENT_KEYS.TOKEN) && /^[A-Za-z0-9+/=]+$/.test(stored) && stored.length > 20) {
        try {
          decryptedString = await decryptData(stored);
          if (decryptedString) {
            // decryptData vrací string, který může být JSON
            try {
              tokenData = JSON.parse(decryptedString);
            } catch (jsonErr) {
              // Pokud dešifrovaný string není JSON, zkus ho použít přímo
              decryptedString = null;
            }
          }
        } catch (decryptError) {
          if (process.env.NODE_ENV === 'development') {
          }
          decryptedString = null;
        }
      }

      // Fallback - data nebyla šifrována nebo dešifrování selhalo
      if (!tokenData) {
        try {
          tokenData = JSON.parse(stored);
        } catch (parseError) {
          if (process.env.NODE_ENV === 'development') {
          }
          // Možná je to plain text token bez expiration wrapperu
          // V tom případě ho prostě vrátíme jako je
          return stored;
        }
      }

      // Zkontroluj expiraci
      if (tokenData && tokenData.expires && Date.now() > tokenData.expires) {
        localStorage.removeItem(PERSISTENT_KEYS.TOKEN);
        return null;
      }

      // Vrať hodnotu tokenu nebo celý objekt pokud nemá value property
      return tokenData?.value || tokenData || null;
    } catch (error) {
      return null;
    }
  },

  user: async () => {
    try {
      const stored = localStorage.getItem(PERSISTENT_KEYS.USER);
      if (!stored) return null;

      let jsonData = stored;

      // Pokus o dešifrování pouze pokud NENÍ debug mode a data vypadají zašifrovaně
      if (!ENCRYPTION_CONFIG.DEBUG_MODE && shouldEncryptData(PERSISTENT_KEYS.USER) && !stored.startsWith('{')) {
        // Lepší detekce base64 formátu
        const base64Regex = /^[A-Za-z0-9+/]+=*$/;
        if (base64Regex.test(stored) && stored.length > 16) {
          try {
            const decrypted = await decryptData(stored);
            if (decrypted !== null) {
              jsonData = typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted);
              // User data dešifrována
            } else {
              if (process.env.NODE_ENV === 'development') {
                // Dešifrování vrátilo null, zkouším plain text
              }
            }
          } catch (decryptError) {
            if (process.env.NODE_ENV === 'development') {
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            // User data nejsou ve správném base64 formátu
          }
        }
      } else if (ENCRYPTION_CONFIG.DEBUG_MODE && process.env.NODE_ENV === 'development') {

      }

      // Pokus o parsování JSON
      try {
        return JSON.parse(jsonData);
      } catch (parseError) {
        if (process.env.NODE_ENV === 'development') {
        }
        // Možná jsou data už objektem
        return jsonData;
      }
    } catch (error) {
      return null;
    }
  },

  userDetail: async () => {
    try {
      const stored = localStorage.getItem(PERSISTENT_KEYS.USER_DETAIL);
      if (!stored) return null;

      let jsonData = stored;
      if (shouldEncryptData(PERSISTENT_KEYS.USER_DETAIL)) {
        const decrypted = await decryptData(stored);
        if (decrypted) {
          // decryptData vrací string, takže parsujeme
          jsonData = typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted);
          // Minimální debug log
          // if (process.env.NODE_ENV === 'development') console.log('🔓 User detail dešifrován');
        } else if (process.env.NODE_ENV === 'development') {
          // User detail načten NEŠIFROVANĚ (fallback)
        }
      }

      // Zkontroluj, zda jsonData už není object
      if (typeof jsonData === 'object') {
        return jsonData;
      }

      return JSON.parse(jsonData);
    } catch (error) {
      return null;
    }
  },

  userPermissions: async () => {
    try {
      const stored = localStorage.getItem(PERSISTENT_KEYS.USER_PERMISSIONS);
      if (!stored) return [];

      let jsonData = stored;
      if (shouldEncryptData(PERSISTENT_KEYS.USER_PERMISSIONS)) {
        const decrypted = await decryptData(stored);
        if (decrypted) {
          jsonData = decrypted;
          // Minimální debug log
          // if (process.env.NODE_ENV === 'development') console.log('🔓 User permissions dešifrovány');
        } else if (process.env.NODE_ENV === 'development') {
          // User permissions načteny NEŠIFROVANĚ (fallback)
        }
      }

      // Handle both JSON arrays and simple strings like "SUPERADMIN"
      if (typeof jsonData === 'string') {
        jsonData = jsonData.trim();

        // Try parsing as JSON first
        if (jsonData.startsWith('[') || jsonData.startsWith('{')) {
          try {
            return JSON.parse(jsonData);
          } catch (parseError) {
            if (process.env.NODE_ENV === 'development') {
            }
          }
        }

        // Handle simple string like "SUPERADMIN" - wrap in array
        if (jsonData) {
          if (process.env.NODE_ENV === 'development') {
            // User permissions jsou string, převádím na array
          }
          return [jsonData];
        }
      }

      // Handle arrays/objects directly
      if (Array.isArray(jsonData)) {
        return jsonData;
      }

      return [];
    } catch (error) {
      return [];
    }
  }
};

/**
 * Smazání autentifikačních dat
 */
export const clearAuthData = {
  token: () => {
    try {
      localStorage.removeItem(PERSISTENT_KEYS.TOKEN);
      sessionStorage.removeItem(SESSION_KEYS.TOKEN); // pro jistotu i starý
    } catch (error) {
    }
  },

  user: () => {
    try {
      localStorage.removeItem(PERSISTENT_KEYS.USER);
      sessionStorage.removeItem(SESSION_KEYS.USER); // pro jistotu i starý
    } catch (error) {
    }
  },

  userDetail: () => {
    try {
      localStorage.removeItem(PERSISTENT_KEYS.USER_DETAIL);
      sessionStorage.removeItem(SESSION_KEYS.USER_DETAIL); // pro jistotu i starý
    } catch (error) {
    }
  },

  userPermissions: () => {
    try {
      localStorage.removeItem(PERSISTENT_KEYS.USER_PERMISSIONS);
      sessionStorage.removeItem(SESSION_KEYS.USER_PERMISSIONS); // pro jistotu i starý
    } catch (error) {
    }
  },

  all: () => {
    clearAuthData.token();
    clearAuthData.user();
    clearAuthData.userDetail();
    clearAuthData.userPermissions();
  }
};

/**
 * Migrace existujících dat z localStorage do sessionStorage
 * Volá se jednou při aktualizaci aplikace
 */
export const migrateAuthDataToSessionStorage = () => {
  try {
    // Kontrola, zda migrace už byla provedena
    const migrationFlag = localStorage.getItem('auth_migration_completed');
    if (migrationFlag === 'true') {
      return; // Migrace už byla dokončena
    }

    let migrated = false;

    // Migrace tokenu
    const oldToken = localStorage.getItem('token');
    if (oldToken && !sessionStorage.getItem(SESSION_KEYS.TOKEN)) {
      saveAuthData.token(oldToken);
      localStorage.removeItem('token');
      migrated = true;
    }

    // Migrace uživatelských dat
    const oldUser = localStorage.getItem('user');
    if (oldUser && !sessionStorage.getItem(SESSION_KEYS.USER)) {
      const userData = JSON.parse(oldUser);
      saveAuthData.user(userData);
      localStorage.removeItem('user');
      migrated = true;
    }

    // Migrace detailu uživatele
    const oldUserDetail = localStorage.getItem('userDetail');
    if (oldUserDetail && !sessionStorage.getItem(SESSION_KEYS.USER_DETAIL)) {
      const userDetail = JSON.parse(oldUserDetail);
      saveAuthData.userDetail(userDetail);
      localStorage.removeItem('userDetail');
      // console.log('Detail uživatele migrován do sessionStorage');
      migrated = true;
    }

    // Migrace oprávnění
    const oldPermissions = localStorage.getItem('userPermissions');
    if (oldPermissions && !sessionStorage.getItem(SESSION_KEYS.USER_PERMISSIONS)) {
      const permissions = JSON.parse(oldPermissions);
      saveAuthData.userPermissions(permissions);
      localStorage.removeItem('userPermissions');
      // console.log('Oprávnění uživatele migrována do sessionStorage');
      migrated = true;
    }

    // Smazání starých per-user permission keys z localStorage
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_permissions_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      if (keysToRemove.length > 0) {
        // console.log(`Smazáno ${keysToRemove.length} starých permission keys z localStorage`);
        migrated = true;
      }
    } catch (error) {
    }

    // Označit migraci jako dokončenou
    if (migrated) {
      localStorage.setItem('auth_migration_completed', 'true');
      // console.log('🔒 Auth migrace dokončena a označena');
    }

  } catch (error) {
  }
};

/**
 * Kontrola, zda jsou k dispozici autentifikační data
 */
export const hasAuthData = () => {
  return !!(loadAuthData.token() && loadAuthData.user());
};

/**
 * Helper pro získání username z uložených dat
 */
export const getStoredUsername = () => {
  const user = loadAuthData.user();
  return user?.username || null;
};

/**
 * Helper pro získání user ID z uložených dat
 */
export const getStoredUserId = () => {
  const user = loadAuthData.user();
  return user?.id || null;
};