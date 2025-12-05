/**
 * User-specific localStorage management
 * Zajišťuje, že každý uživatel má izolovaná data v localStorage
 * a při změně uživatele se vyčistí data předchozího uživatele
 *
 * STRICT MODE: Všechna user-specific data MUSÍ obsahovat user_id validaci
 */

const CURRENT_USER_KEY = 'app_current_user_id';
const USER_DATA_PREFIX = 'order25-';

/**
 * Získá ID aktuálně přihlášeného uživatele z localStorage
 */
export const getCurrentUserId = () => {
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch (error) {
    // Error reading current user ID
    return null;
  }
};

/**
 * Nastaví ID aktuálně přihlášeného uživatele
 */
export const setCurrentUserId = (userId) => {
  try {
    if (userId) {
      localStorage.setItem(CURRENT_USER_KEY, String(userId));
      // Current user_id set
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      // Current user_id removed
    }
  } catch (error) {
    // Error saving current user ID
  }
};

/**
 * STRICT: Získá user-specific data s validací vlastnictví
 * Vrací data POUZE pokud patří aktuálně přihlášenému uživateli
 *
 * @param {string} key - Klíč localStorage (měl by obsahovat user_id)
 * @param {string|number} expectedUserId - Volitelné: explicitní user_id pro validaci
 * @returns {any|null} - Data nebo null pokud nepatří aktuálnímu uživateli
 */
export const getUserSpecificData = (key, expectedUserId = null) => {
  try {
    const currentUserId = expectedUserId || getCurrentUserId();
    if (!currentUserId) {
      // No logged in user
      return null;
    }

    const data = localStorage.getItem(key);
    if (!data) return null;

    // Validace 1: Klíč musí obsahovat user_id
    if (!key.includes(String(currentUserId))) {
      // Key doesn't contain user_id - rejected
      return null;
    }

    try {
      const parsed = JSON.parse(data);

      // Validace 2: Data mohou obsahovat __draftOwner metadata (extra kontrola)
      if (parsed && typeof parsed === 'object') {
        const dataOwnerId = parsed.__draftOwner || parsed.user_id || parsed.userId || parsed.uzivatel_id;
        if (dataOwnerId && String(dataOwnerId) !== String(currentUserId)) {
          // Data belongs to different user - rejected
          return null;
        }
      }

      return parsed;
    } catch {
      // Raw string data - musí projít validací klíče
      return data;
    }
  } catch (e) {
    // Error loading user-specific data
    return null;
  }
};

/**
 * STRICT: Ukládá user-specific data s automatickým přidáním user_id
 * Zajišťuje, že všechna data jsou správně označena vlastníkem
 *
 * @param {string} baseKey - Základní klíč (automaticky se přidá user_id pokud chybí)
 * @param {any} data - Data k uložení
 * @param {string|number} userId - Volitelné: explicitní user_id (jinak se použije current)
 * @returns {boolean} - true pokud se uložení podařilo
 */
export const setUserSpecificData = (baseKey, data, userId = null) => {
  try {
    const currentUserId = userId || getCurrentUserId();
    if (!currentUserId) {
      // Cannot save data without user_id
      return false;
    }

    // Zajisti že klíč obsahuje user_id (pokud již neobsahuje)
    let finalKey = baseKey;
    if (!baseKey.includes(String(currentUserId))) {
      // Inteligentní přidání user_id (zachová formát order25-draft-{userId})
      if (baseKey.includes('-')) {
        finalKey = `${baseKey}-${currentUserId}`;
      } else {
        finalKey = `${baseKey}_${currentUserId}`;
      }
      // Key extended with user_id
    }

    // Přidej metadata pro dodatečnou validaci (pokud jsou data objektem)
    let enrichedData = data;
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      enrichedData = {
        ...data,
        __draftOwner: currentUserId,
        __timestamp: Date.now()
      };
    }

    localStorage.setItem(finalKey, JSON.stringify(enrichedData));

    // Data saved for user_id

    return true;
  } catch (e) {
    // Error saving user-specific data
    return false;
  }
};

/**
 * Vyčistí všechna data konkrétního uživatele z localStorage
 * @param {string|number} userId - ID uživatele, jehož data se mají smazat
 */
export const clearUserData = (userId) => {
  if (!userId) return;

  try {
    const keysToRemove = [];

    // Cleaning user data

    // Projdi všechny klíče v localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 🛡️ OCHRANA: Nikdy nesmazat ORDER25 drafty!
      if (key.startsWith('order25_draft_') || key.startsWith('order25-draft-')) {
        continue; // Přeskoč draft klíče
      }

      // Smaž ostatní klíče obsahující userId (kromě draftů)
      if (
        (key.includes(`-${userId}`) && !key.includes('draft')) || // order25-sections-123 (ale ne order25-draft-123)
        (key.includes(`_${userId}`) && !key.includes('draft')) || // user_data_123 (ale ne order25_draft_123)
        key === `order25-scroll-${userId}` ||
        key === `order25-sections-${userId}` ||
        key === `order25-phase2-unlocked-${userId}`
        // ❌ ZAKÁZÁNO: key === `order25-draft-${userId}` - DRAFTY ZŮSTÁVAJÍ!
      ) {
        keysToRemove.push(key);
        continue;
      }

      // Extra kontrola: zkontroluj __draftOwner v datech
      try {
        // 🛡️ OCHRANA: Nikdy nesmazat ORDER25 drafty ani podle metadat!
        if (key.startsWith('order25_draft_') || key.startsWith('order25-draft-')) {
          continue; // Přeskoč draft klíče
        }

        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed && typeof parsed === 'object') {
            const ownerId = parsed.__draftOwner || parsed.user_id || parsed.userId;
            if (ownerId && String(ownerId) === String(userId)) {
              keysToRemove.push(key);
            }
          }
        }
      } catch {
        // Ignoruj chyby parsování
      }
    }

    // Smaž všechny nalezené klíče
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        // Removed key
      } catch (error) {
        // Error removing key
      }
    });

    // Keys removed
  } catch (error) {
    // Error cleaning user data
  }
};

/**
 * Zkontroluje, jestli se přihlásil jiný uživatel
 * Pokud ano, vyčistí data starého uživatele
 * @param {string|number} newUserId - ID nově přihlášeného uživatele
 * @returns {boolean} true pokud došlo ke změně uživatele
 */
export const checkAndCleanUserChange = (newUserId) => {
  if (!newUserId) return false;

  const currentUserId = getCurrentUserId();

  // Pokud je to stejný uživatel, nic nedělej
  if (currentUserId === String(newUserId)) {
    return false;
  }

  // Pokud je to jiný uživatel, vyčisti data starého uživatele
  if (currentUserId && currentUserId !== String(newUserId)) {
    // User changed - cleaning previous user data
    clearUserData(currentUserId);
  }

  // Nastav nového uživatele
  setCurrentUserId(newUserId);

  return true;
};

/**
 * Vyčistí všechna user-specific data (při odhlášení)
 * Používá se při logout - vyčistí data aktuálního uživatele
 */
export const clearAllUserData = () => {
  const currentUserId = getCurrentUserId();

  if (process.env.NODE_ENV === 'development') {
  }

  if (currentUserId) {
    clearUserData(currentUserId);
    setCurrentUserId(null);
  }

  // Vyčisti i obecné klíče, které nejsou vázané na konkrétního uživatele
  // (ale mohou obsahovat citlivá data)
  try {
    const generalKeys = [
      'highlightOrderId', // starý klíč bez user_id
      'order_open_for_edit',
      'order_draft', // starý klíč bez user_id
      'lastVisitedSection',
      'activeSection'
    ];

    // Navíc vyčisti všechny klíče s user_id (pro případ, že se user_id změnilo)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('highlightOrderId-') ||
        key.startsWith('order25-') ||
        key.startsWith('order_draft_') ||
        generalKeys.includes(key)
      )) {
        try {
          localStorage.removeItem(key);
          if (process.env.NODE_ENV === 'development') {
          }
        } catch (error) {
          // Ignoruj chyby
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
  }
};

/**
 * Získá všechna data aktuálního uživatele (pro debug/monitoring)
 */
export const getUserDataKeys = (userId) => {
  if (!userId) return [];

  const userKeys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`-${userId}`)) {
        userKeys.push(key);
      }
    }
  } catch (error) {
  }

  return userKeys;
};

/**
 * Migrace starých klíčů bez user_id na nové s user_id
 * Volá se při přihlášení pro zpětnou kompatibilitu
 */
export const migrateOldUserData = (userId) => {
  if (!userId) return;

  try {
    // Migrace starých klíčů
    const migrations = [
      { old: 'order_draft', new: `order25-draft-${userId}` },
      { old: 'order_sections', new: `order25-sections-${userId}` },
      { old: 'order_scroll', new: `order25-scroll-${userId}` }
    ];

    migrations.forEach(({ old, new: newKey }) => {
      try {
        const oldData = localStorage.getItem(old);
        if (oldData) {
          // Přesuň data na nový klíč
          localStorage.setItem(newKey, oldData);
          localStorage.removeItem(old);

          if (process.env.NODE_ENV === 'development') {
          }
        }
      } catch (error) {
      }
    });
  } catch (error) {
  }
};
