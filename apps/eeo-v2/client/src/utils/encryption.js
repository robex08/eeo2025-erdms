/**
 * Bezpečné šifrování pro sessionStorage/localStorage
 * Používá browser-native Web Crypto API
 *
 * BEZPEČNOST:
 * - Session seed je v MEMORY (ne sessionStorage) - ochrana před DevTools leak
 * - Key rotation při logout
 * - AES-GCM 256-bit encryption
 */

// 🔐 GLOBÁLNÍ SECURITY CONTEXT - v memory, ne v sessionStorage!
if (!window._securityContext) {
  window._securityContext = {
    sessionSeed: null,
    sessionStart: Date.now(),
    keyRotations: 0
  };
}

// Generování klíče z user session data (browser fingerprint + session seed)
const generateSessionKey = async (seedOrUserId = null) => {
  let sessionSeed;

  // 🔧 FIX: Pokud je předán persistentní seed přímo, použij ho
  if (seedOrUserId && typeof seedOrUserId === 'string' && seedOrUserId.startsWith('draft_')) {
    // Persistentní seed pro drafty - použij přímo
    sessionSeed = seedOrUserId;
  } else {
    // Původní logika pro session-based encryption
    // ✅ BEZPEČNOST: Session seed v MEMORY, ne sessionStorage
    if (!window._securityContext.sessionSeed) {
      // Vytvoř deterministický seed na základě user_id pro draft consistency
      if (seedOrUserId) {
        // Pro přihlášené uživatele - deterministický na základě user_id
        const userBase = `user_${seedOrUserId}_${window.location.origin}`;
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(userBase));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        window._securityContext.sessionSeed = `stable_${hashHex.substring(0, 32)}`;
      } else {
        // Pro anonymní session - random (původní chování)
        const timestamp = Date.now().toString();
        const random1 = Math.random().toString(36);
        const random2 = crypto.getRandomValues(new Uint8Array(16)).join('');
        window._securityContext.sessionSeed = `temp_${timestamp}-${random1}-${random2}`;
      }

      window._securityContext.sessionStart = Date.now();

      // if (process.env.NODE_ENV === 'development') {
      //   console.log('🔑 New encryption key generated', seedOrUserId ? `(stable for user ${seedOrUserId})` : '(temp session)');
      // }
    }

    sessionSeed = window._securityContext.sessionSeed;
  }
  const screenData = window.screen || { width: 1920, height: 1080 }; // fallback pro ESLint
  const data = [
    navigator.userAgent,
    navigator.language,
    screenData.width,
    screenData.height,
    sessionSeed, // Stabilní pro uživatele nebo session
    window.location.origin
  ].join('|');

  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(data));

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

// Šifrování dat
export const encryptData = async (plaintext, seedOrUserId = null) => {
  try {
    if (!plaintext) return null;

    const key = await generateSessionKey(seedOrUserId);
    const encoder = new TextEncoder();
    const data = encoder.encode(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext));

    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Kombinuj IV + encrypted data a konvertuj na base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    return null;
  }
};

// Dešifrování dat
export const decryptData = async (encryptedData, seedOrUserId = null) => {
  try {
    if (!encryptedData) return null;

    // Validace base64 formátu
    if (typeof encryptedData !== 'string') {
      if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      }
      return null;
    }

    // Zkontroluj jestli vypadá jako base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(encryptedData)) {
      // Tiše ignoruj (pravděpodobně starý/poškozený draft)
      return null;
    }

    const key = await generateSessionKey(seedOrUserId);
    let combined;

    try {
      combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    } catch (base64Error) {
      // Tiše ignoruj poškozené base64 (pravděpodobně starý draft)
      return null;
    }

    if (combined.length < 13) { // Minimálně 12 bytů IV + 1 byte dat
      // Tiše ignoruj příliš krátká data
      return null;
    }

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decrypted);

    // Pokus se parsovat jako JSON, jinak vrať string
    try {
      return JSON.parse(plaintext);
    } catch {
      return plaintext;
    }
  } catch (error) {
    // console.warn('Dešifrování selhalo:', error);
    return null;
  }
};

// Test funkce
export const testEncryption = async () => {
  const testData = { token: 'test-token-123', user: { id: 1, username: 'admin' } };

  const encrypted = await encryptData(testData);

  const decrypted = await decryptData(encrypted);

  return JSON.stringify(testData) === JSON.stringify(decrypted);
};

/**
 * 🔄 KEY ROTATION
 * Vynutí nový encryption key - použít při logout nebo každých 24h
 */
export const rotateEncryptionKey = () => {
  if (window._securityContext) {
    const oldSeed = window._securityContext.sessionSeed;

    window._securityContext.sessionSeed = null; // Vynutí nový seed
    window._securityContext.sessionStart = Date.now();
    window._securityContext.keyRotations++;
  }
};

/**
 * 🕐 AUTO KEY ROTATION
 * Automatická rotace klíče každých 24 hodin
 * ZAKOMENTOVÁNO - způsobuje problémy s draft persistence
 */
/*
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (!window._securityContext) return;

    const now = Date.now();
    const elapsed = now - (window._securityContext.sessionStart || now);
    const MAX_KEY_AGE = 24 * 60 * 60 * 1000; // 24 hodin

    if (elapsed > MAX_KEY_AGE) {
      rotateEncryptionKey();
    }
  }, 60 * 60 * 1000); // Check každou hodinu
}
*/

/**
 * 📊 GET ENCRYPTION STATS
 * Pro debugging - info o aktuálním stavu encryption
 */
export const getEncryptionStats = () => {
  if (!window._securityContext) return null;

  const age = Date.now() - window._securityContext.sessionStart;
  const ageHours = Math.floor(age / (60 * 60 * 1000));
  const ageMinutes = Math.floor((age % (60 * 60 * 1000)) / (60 * 1000));

  return {
    seedInMemory: !!window._securityContext.sessionSeed,
    keyAge: `${ageHours}h ${ageMinutes}m`,
    rotations: window._securityContext.keyRotations,
    sessionStart: new Date(window._securityContext.sessionStart).toLocaleString()
  };
};