/**
 * Bezpečné storage rozšíření pro floating panels
 * Šifruje citlivý obsah TODO, poznámek a chatu
 */

import { fastEncrypt, fastDecrypt } from './performanceEncryption.js';
import { shouldEncrypt, ENCRYPTION_CONFIG } from './encryptionConfig.js';

// Wrapper pro localStorage s smart šifrováním
export const secureStorage = {
  async setItem(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (shouldEncrypt(key)) {
        const encrypted = await fastEncrypt(stringValue, key);
        localStorage.setItem(key, encrypted);
      } else {
        localStorage.setItem(key, stringValue);
      }
    } catch (error) {
      // Fallback na normální localStorage
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    }
  },

  async getItem(key) {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      if (shouldEncrypt(key)) {
        return await fastDecrypt(value, key);
      } else {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
    } catch (error) {
      // Fallback na normální localStorage
      const value = localStorage.getItem(key);
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
  },

  removeItem(key) {
    localStorage.removeItem(key);
  },

  // Batch operace pro rychlejší ukládání více klíčů
  async setBatch(keyValuePairs) {
    const promises = Object.entries(keyValuePairs).map(([key, value]) =>
      this.setItem(key, value)
    );
    await Promise.all(promises);
  },

  async getBatch(keys) {
    const promises = keys.map(async key => [key, await this.getItem(key)]);
    const results = await Promise.all(promises);
    return Object.fromEntries(results);
  }
};

// Migrace funkce pro existující data
export const migrateFloatingPanelsToSecure = async (userId) => {
  if (!userId) return;

  const keysToMigrate = [
    `layout_tasks_${userId}`,
    `layout_notes_text_${userId}`,
    `layout_chat_messages_${userId}`,
    `layout_notes_font_${userId}`,
    `layout_tasks_font_${userId}`,
    `layout_chat_font_${userId}`
  ];

  // Migrace floating panels

  // if (process.env.NODE_ENV === 'development') {
  //
  // }

  for (const key of keysToMigrate) {
    try {
      const existingValue = localStorage.getItem(key);
      if (existingValue && shouldEncrypt(key)) {
        // V DEBUG módu přeskoč kontrolu šifrování
        if (ENCRYPTION_CONFIG.DEBUG_MODE) {
          if (process.env.NODE_ENV === 'development') {

          }
          continue;
        }

        // Zkontroluj jestli už není šifrované
        try {
          // Lepší detekce base64 formátu
          const base64Regex = /^[A-Za-z0-9+/]+=*$/;
          if (base64Regex.test(existingValue) && existingValue.length > 16) {
            const decrypted = await fastDecrypt(existingValue, key);
            if (decrypted !== null && decrypted !== existingValue) {
              // Už je šifrované a lze dešifrovat, přeskoč
              continue;
            }
          }
        } catch (decryptError) {
          // Dešifrování selhalo, pravděpodobně nejsou data šifrovaná
          if (process.env.NODE_ENV === 'development') {
            //
          }
        }

        // Není šifrované nebo je poškozené, zkus migrovat
        try {
          await secureStorage.setItem(key, existingValue);
          // if (process.env.NODE_ENV === 'development') {
          //
          // }
        } catch (migrateError) {
          // if (process.env.NODE_ENV === 'development') {
          //
          // }
        }
      }
    } catch (error) {
    }
  }

  // if (process.env.NODE_ENV === 'development') {
  //
  // }
};

// Debug funkce pro zobrazení šifrovaných vs nešifrovaných klíčů
export const debugSecureStorage = () => {
  const allKeys = Object.keys(localStorage);
  const encrypted = [];
  const plaintext = [];

  allKeys.forEach(key => {
    if (shouldEncrypt(key)) {
      encrypted.push(key);
    } else {
      plaintext.push(key);
    }
  });

};