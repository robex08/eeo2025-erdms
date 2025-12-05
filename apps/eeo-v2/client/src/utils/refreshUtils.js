/**
 * Debug utilita pro testování F5 refresh problému
 * Spustí se v prohlížeči v console
 */

// Pouze v development módu a pokud debug není explictně vypnutý
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_ENABLE_DEBUG !== 'false') {
  window.debugF5Issue = {
  // Test 1: Zkontroluj sessionStorage obsah
  checkSessionStorage() {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
    }
  },

  // Test 2: Zkontroluj encryption key stability
  async testEncryptionStability() {

    try {
      const { encryptData, decryptData } = await import('./encryption.js');

      const testMessage = 'F5 refresh test ' + Date.now();

      const encrypted = await encryptData(testMessage);

      const decrypted = await decryptData(encrypted);

      // Ulož zašifrovanou zprávu pro test po F5
      sessionStorage.setItem('_debug_encrypted_test', encrypted);
      sessionStorage.setItem('_debug_original_test', testMessage);


    } catch (error) {
    }
  },

  // Test 3: Test po F5 refresh
  async testAfterF5() {

    try {
      const storedEncrypted = sessionStorage.getItem('_debug_encrypted_test');
      const storedOriginal = sessionStorage.getItem('_debug_original_test');

      if (!storedEncrypted || !storedOriginal) {
        return;
      }

      const { decryptData } = await import('./encryption.js');


      const decrypted = await decryptData(storedEncrypted);

      // Vyčisti test data
      sessionStorage.removeItem('_debug_encrypted_test');
      sessionStorage.removeItem('_debug_original_test');

    } catch (error) {
    }
  },

  // Test 4: Zkontroluj auth data
  async checkAuthData() {

    try {
      const { loadAuthData } = await import('./authStorage.js');

      const user = await loadAuthData.user();
      const token = await loadAuthData.token();
      const userDetail = await loadAuthData.userDetail();
      const permissions = await loadAuthData.userPermissions();


      const hasCompleteAuth = user && token && userDetail;

    } catch (error) {
    }
  },

  // Test 5: Simuluj AuthContext init proces
  async simulateAuthInit() {

    try {
      const { loadAuthData } = await import('./authStorage.js');
      const { getUserDetailApi2 } = await import('../services/api2auth.js');

      // Krok 1: Načti základní data
      const storedUser = await loadAuthData.user();
      const storedToken = await loadAuthData.token();


      if (!storedUser || !storedToken) {
        return;
      }

      // Krok 2: Načti userDetail z cache
      const storedDetail = await loadAuthData.userDetail();

      if (storedDetail) {
      } else {

        // Krok 3: Fallback na API
        try {
          const apiDetail = await getUserDetailApi2(storedUser.username, storedToken, storedUser.id);
        } catch (apiError) {
        }
      }

    } catch (error) {
    }
  },

  // Celkový debug test
  async runAllTests() {

    this.checkSessionStorage();

    await this.testEncryptionStability();

    await this.checkAuthData();

    await this.simulateAuthInit();

  }
  };
} else if (process.env.NODE_ENV === 'development') {
}