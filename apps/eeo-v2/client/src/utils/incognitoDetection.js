/**
 * Detekce inkognito/anonymního režimu prohlížeče
 *
 * ÚČEL:
 * - Detekovat, zda uživatel používá anonymní režim (Incognito/Private)
 * - Zabránit persistentnímu přihlášení v anonymním režimu
 * - Automaticky odhlásit při zavření anonymního okna
 */

/**
 * Detekce inkognito módu v různých prohlížečích
 * @returns {Promise<boolean>} true pokud je inkognito mód detekován
 */
export const detectIncognitoMode = async () => {
  try {
    // === METODA 1: Detekce přes localStorage quota (nejspolehlivější) ===
    // V inkognito má localStorage často omezený prostor nebo je sdílený
    try {
      // Test zápisu velkého množství dat
      const testKey = '__incognito_test_' + Date.now();
      const testData = new Array(10000).join('x'); // ~10KB dat

      localStorage.setItem(testKey, testData);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      // Pokud selže, pravděpodobně jde o inkognito
      if (!retrieved || retrieved !== testData) {
        if (process.env.NODE_ENV === 'development') {
        }
        return true;
      }
    } catch (e) {
      // localStorage nedostupný nebo omezený = inkognito
      if (process.env.NODE_ENV === 'development') {
      }
      return true;
    }

    // === METODA 2: FileSystem API test (Chrome/Edge) ===
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        // V normálním režimu je quota velká (řádově GB)
        // V inkognito je často omezená (řádově MB)
        const quotaMB = (estimate.quota || 0) / (1024 * 1024);

        if (process.env.NODE_ENV === 'development') {
        }

        // Pokud je quota menší než 120MB, pravděpodobně jde o inkognito
        if (quotaMB < 120) {
          if (process.env.NODE_ENV === 'development') {
          }
          return true;
        }
      } catch (e) {
        // Chyba při odhadu = možné inkognito
        if (process.env.NODE_ENV === 'development') {
        }
      }
    }

    // === METODA 3: IndexedDB test (Firefox) ===
    if ('indexedDB' in window) {
      try {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('__incognito_test');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error('blocked'));
        });

        if (db) {
          db.close();
          indexedDB.deleteDatabase('__incognito_test');
        }
      } catch (e) {
        // Firefox v inkognito blokuje indexedDB
        if (process.env.NODE_ENV === 'development') {
        }
        return true;
      }
    }

    // === METODA 4: sessionStorage persistence test ===
    // V inkognito je sessionStorage izolovaný per window, ne per session
    try {
      const testKey = '__session_test_' + Date.now();
      const testValue = Math.random().toString();

      sessionStorage.setItem(testKey, testValue);

      // Otevři popup a zkontroluj, jestli vidí stejná data
      // (to ale vyžaduje user interaction, takže jen jako fallback)

      sessionStorage.removeItem(testKey);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
      }
    }

    // === METODA 5: Heuristika - kontrola session seed stáří ===
    // Pokud není session seed nebo je velmi čerstvý (< 5 sekund od page load)
    // a nemáme žádná historická data, může jít o nové inkognito okno
    const sessionSeed = localStorage.getItem('_session_seed');
    if (!sessionSeed) {
      // Žádný seed = možná čerstvé inkognito okno
      // Ale nemůžeme si být jistí, může jít i o první návštěvu normálního okna
      if (process.env.NODE_ENV === 'development') {
      }
    }

    // Pokud jsme nedokázali detekovat inkognito, předpokládáme normální režim
    if (process.env.NODE_ENV === 'development') {
    }
    return false;

  } catch (error) {
    // V případě chyby předpokládáme normální režim (safer default)
    return false;
  }
};

/**
 * Rychlá synchronní kontrola (bez async testů)
 * Méně spolehlivá, ale okamžitá
 */
export const isLikelyIncognito = () => {
  // Kontrola přes storage quota (Chrome/Edge)
  if ('storage' in navigator && navigator.storage && 'estimate' in navigator.storage) {
    // Tato metoda je async, takže nemůžeme ji použít synchronně
    // Vrátíme false a spoléháme na async detectIncognitoMode()
    return false;
  }

  // Rychlá kontrola - pokud nemáme žádný session seed a localStorage je prázdný,
  // může jít o inkognito
  try {
    const hasSessionSeed = !!localStorage.getItem('_session_seed');
    const localStorageSize = localStorage.length;

    // Pokud je localStorage úplně prázdný nebo má jen seed, může jít o nové inkognito okno
    if (!hasSessionSeed || localStorageSize <= 1) {
      return false; // Nemůžeme si být jisti, spoléháme na async test
    }
  } catch (e) {
    // localStorage nedostupný = pravděpodobně inkognito
    return true;
  }

  return false;
};

/**
 * Cache výsledku detekce (aby se nespouštěla opakovaně)
 */
let incognitoDetectionResult = null;
let incognitoDetectionPromise = null;

/**
 * Cached verze detekce - volá se jen jednou per session
 */
export const isIncognitoMode = async () => {
  if (incognitoDetectionResult !== null) {
    return incognitoDetectionResult;
  }

  if (incognitoDetectionPromise) {
    return incognitoDetectionPromise;
  }

  incognitoDetectionPromise = detectIncognitoMode().then(result => {
    incognitoDetectionResult = result;

    if (result && process.env.NODE_ENV === 'development') {
    }

    return result;
  });

  return incognitoDetectionPromise;
};

/**
 * Reset cache (pro testování)
 */
export const resetIncognitoDetection = () => {
  incognitoDetectionResult = null;
  incognitoDetectionPromise = null;
};
