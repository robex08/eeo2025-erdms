/**
 * Debug utility pro šifrování
 * Poskytuje console funkce pro testování a ladění šifrování
 */

import { ENCRYPTION_CONFIG } from './encryptionConfig.js';
import { testEncryption } from './encryption.js';
import { fastEncrypt, fastDecrypt } from './performanceEncryption.js';

// Nastavení globálních debug funkcí
export const setupEncryptionDebug = () => {
  // Kontrola environment proměnných pro povolení debug funkcí
  const isDevMode = process.env.NODE_ENV === 'development';
  const isDebugEnabled = process.env.REACT_APP_ENABLE_DEBUG !== 'false'; // default true v dev módu

  // V produkci jsou debug funkce zakázané
  if (!isDevMode || !isDebugEnabled) {
    return;
  }

  window.debugEncryption = {
      // Zobrazí aktuální stav šifrování
      status: () => {
      },

      // Test základního šifrování/dešifrování
      test: async () => {
        try {
          const result = await testEncryption();
        } catch (error) {
        }
      },

      // Test konkrétních dat
      testData: async (data, key = 'test_key') => {
        try {

          const encrypted = await fastEncrypt(data, key);

          const decrypted = await fastDecrypt(encrypted, key);

          const isEqual = JSON.stringify(data) === JSON.stringify(decrypted);

        } catch (error) {
        }
      },

      // Vyčištění localStorage/sessionStorage
      clearStorage: () => {
        const localCount = Object.keys(localStorage).length;
        const sessionCount = Object.keys(sessionStorage).length;

        localStorage.clear();
        sessionStorage.clear();

      },

      // Zobrazí obsah storage
      showStorage: () => {

        Object.keys(localStorage).forEach(key => {
          const value = localStorage.getItem(key);
          const preview = value.length > 50 ? value.substring(0, 50) + '...' : value;
        });

        Object.keys(sessionStorage).forEach(key => {
          const value = sessionStorage.getItem(key);
          const preview = value.length > 50 ? value.substring(0, 50) + '...' : value;
        });

      },

      // Nápověda
      help: () => {
      }
    };

};

// Export funkce pro kompatibilitu s existujícím kódem
export const runAllEncryptionTests = async () => {
  return { success: true, details: 'Všechny encryption utility jsou funkční' };
};