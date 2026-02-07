/**
 * Bezpečná práce s koncepty (drafts) v localStorage
 *
 * Zajišťuje:
 * 1. Všechny koncepty jsou vázány na user_id vlastníka
 * 2. Uživatel vidí POUZE svoje vlastní koncepty
 * 3. Při změně uživatele se automaticky vyčistí koncepty předchozího uživatele
 * 4. Koncepty nelze načíst bez platného user_id
 *
 * POUŽITÍ:
 * - saveDraft(userId, draftData) - uložit koncept
 * - loadDraft(userId) - načíst koncept (POUZE pokud patří userId)
 * - hasDraft(userId) - zkontrolovat existenci konceptu
 * - clearDraft(userId) - vymazat koncept
 * - getAllUserDrafts(userId) - získat všechny koncepty uživatele
 */

import { getCurrentUserId, getUserSpecificData, setUserSpecificData } from './userStorage';

/**
 * Získá klíč pro draft konkrétního uživatele
 * @param {string|number} userId - ID uživatele
 * @returns {string} - Klíč ve formátu order25-draft-{userId}
 */
export const getDraftKey = (userId) => {
  if (!userId) {
    return null;
  }
  return `order25-draft-${userId}`;
};

/**
 * BEZPEČNÉ uložení konceptu s validací vlastnictví
 *
 * @param {string|number} userId - ID uživatele (vlastníka konceptu)
 * @param {object} draftData - Data konceptu k uložení
 * @param {object} options - Volitelné nastavení
 * @param {boolean} options.isAutoSave - Zda jde o automatické uložení
 * @returns {boolean} - true pokud se uložení podařilo
 */
export const saveDraft = (userId, draftData, options = {}) => {
  try {
    // Validace user_id
    if (!userId) {
      return false;
    }

    // Zkontroluj, zda je to aktuálně přihlášený uživatel
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      return false;
    }

    if (String(userId) !== String(currentUserId)) {
      return false;
    }

    // Získej draft klíč
    const draftKey = getDraftKey(userId);
    if (!draftKey) return false;

    // Obohať data o metadata
    const enrichedDraft = {
      ...draftData,
      __draftOwner: userId,
      __timestamp: Date.now(),
      __version: '2.0', // Verze s user_id validací
      __isAutoSave: options.isAutoSave || false
    };

    // Ulož pomocí STRICT funkce z userStorage
    const success = setUserSpecificData(draftKey, enrichedDraft, userId);

    if (success && process.env.NODE_ENV === 'development') {
      const saveType = options.isAutoSave ? 'Auto-save' : 'Manual save';
    }

    return success;
  } catch (error) {
    return false;
  }
};

/**
 * BEZPEČNÉ načtení konceptu s validací vlastnictví
 * Vrátí koncept POUZE pokud patří zadanému userId
 *
 * @param {string|number} userId - ID uživatele (musí odpovídat vlastníkovi)
 * @returns {object|null} - Data konceptu nebo null
 */
export const loadDraft = (userId) => {
  try {
    // Validace user_id
    if (!userId) {
      return null;
    }

    // Zkontroluj, zda je to aktuálně přihlášený uživatel
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      return null;
    }

    if (String(userId) !== String(currentUserId)) {
      return null;
    }

    // Získej draft klíč
    const draftKey = getDraftKey(userId);
    if (!draftKey) return null;

    // Načti pomocí STRICT funkce z userStorage (automaticky validuje vlastnictví)
    const draftData = getUserSpecificData(draftKey, userId);

    if (draftData) {
      // Extra kontrola __draftOwner
      if (draftData.__draftOwner && String(draftData.__draftOwner) !== String(userId)) {
        return null;
      }

      // ⭐ IGNORUJ invalidované drafty (uložené do DB)
      if (draftData.invalidated === true) {
        return null;
      }

      return draftData;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Zkontroluje, zda existuje koncept pro daného uživatele
 *
 * @param {string|number} userId - ID uživatele
 * @returns {boolean} - true pokud koncept existuje
 */
export const hasDraft = (userId) => {
  try {
    if (!userId) return false;

    const draftKey = getDraftKey(userId);
    if (!draftKey) return false;

    // Zkus načíst data (validuje vlastnictví)
    const draftData = getUserSpecificData(draftKey, userId);
    if (!draftData) return false;

    // ⭐ IGNORUJ invalidované drafty (uložené do DB)
    if (draftData.invalidated === true) return false;

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Vymaže koncept uživatele
 *
 * @param {string|number} userId - ID uživatele
 * @returns {boolean} - true pokud se smazání podařilo
 */
export const clearDraft = (userId) => {
  try {
    if (!userId) {
      return false;
    }

    // Zkontroluj, zda je to aktuálně přihlášený uživatel
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      return false;
    }

    if (String(userId) !== String(currentUserId)) {
      return false;
    }

    const draftKey = getDraftKey(userId);
    if (!draftKey) return false;

    localStorage.removeItem(draftKey);

    if (process.env.NODE_ENV === 'development') {
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Získá všechny koncepty aktuálního uživatele (pro debug/monitoring)
 *
 * @param {string|number} userId - ID uživatele
 * @returns {Array} - Pole objektů {key, data, timestamp}
 */
export const getAllUserDrafts = (userId) => {
  try {
    if (!userId) return [];

    const drafts = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Hledej koncepty tohoto uživatele
      if (key.includes(`draft`) && key.includes(String(userId))) {
        try {
          const data = getUserSpecificData(key, userId);
          if (data) {
            drafts.push({
              key,
              data,
              timestamp: data.__timestamp || null,
              owner: data.__draftOwner || null,
              version: data.__version || '1.0'
            });
          }
        } catch {
          // Ignoruj chyby parsování
        }
      }
    }

    return drafts;
  } catch (error) {
    return [];
  }
};

/**
 * MIGRACE: Převede starý koncept bez user_id na nový formát
 * Volá se automaticky při přihlášení
 *
 * @param {string|number} userId - ID uživatele
 * @returns {boolean} - true pokud byla provedena migrace
 */
export const migrateOldDraft = (userId) => {
  try {
    if (!userId) return false;

    // Hledej starý klíč bez user_id
    const oldKeys = ['order_draft', 'order25-draft', 'draft'];
    let migrated = false;

    oldKeys.forEach(oldKey => {
      const oldData = localStorage.getItem(oldKey);
      if (oldData) {
        try {
          const parsed = JSON.parse(oldData);

          // Ulož jako nový koncept s user_id
          const success = saveDraft(userId, parsed, { isAutoSave: false });

          if (success) {
            // Smaž starý klíč
            localStorage.removeItem(oldKey);
            migrated = true;

            if (process.env.NODE_ENV === 'development') {
            }
          }
        } catch {
          // Ignoruj chyby parsování
        }
      }
    });

    return migrated;
  } catch (error) {
    return false;
  }
};

/**
 * Pomocná funkce pro získání informací o konceptu (pro debug)
 *
 * @param {string|number} userId - ID uživatele
 * @returns {object|null} - Metadata konceptu
 */
export const getDraftInfo = (userId) => {
  try {
    const draft = loadDraft(userId);
    if (!draft) return null;

    return {
      exists: true,
      owner: draft.__draftOwner || userId,
      timestamp: draft.__timestamp || null,
      timestampFormatted: draft.__timestamp ? new Date(draft.__timestamp).toLocaleString('cs-CZ') : null,
      version: draft.__version || '1.0',
      isAutoSave: draft.__isAutoSave || false,
      dataKeys: Object.keys(draft).filter(k => !k.startsWith('__'))
    };
  } catch (error) {
    return null;
  }
};

/**
 * Export všech funkcí
 */
export default {
  getDraftKey,
  saveDraft,
  loadDraft,
  hasDraft,
  clearDraft,
  getAllUserDrafts,
  migrateOldDraft,
  getDraftInfo
};
