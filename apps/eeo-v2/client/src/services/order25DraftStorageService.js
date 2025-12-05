/**
 * Order25 Draft Storage Service - REFACTORED v2.0
 *
 * 🎯 CENTRALIZOVANÁ správa draft state s JEDNÍM klíčem
 * - Jeden klíč obsahuje: formData + metadata + uiState + attachments
 * - Šifrované ukládání
 * - Automatická migrace starých formátů
 * - Synchronní operace pro prevenci race conditions
 *
 * @author GitHub Copilot
 * @date 2025-10-24
 * @version 2.0
 */

import { encryptData, decryptData } from '../utils/encryption';
import { getDraftEncryptionSeed } from './DraftEncryption';

class Order25DraftStorageService {
  constructor() {
    this.config = {
      maxDraftAge: 30 * 24 * 60 * 60 * 1000, // 30 dní
      autoSaveDelay: 2000, // 2 sekundy debounce
      debug: process.env.NODE_ENV === 'development',
      draftVersion: 2 // ⭐ Verze pro migraci
    };
    this._cleanupProcessed = new Set();
    this.autoSaveTimers = new Map();
  }

  /**
   * 🎯 Generuje klíč pro draft - UNIFIED FORMÁT (jeden klíč pro všechny stavy)
   * @private
   */
  _getDraftKey(userId, type = null, orderId = null) {
    if (!userId) throw new Error('userId is required');

    // 🔧 OPRAVA: Konverze userId na string (pokud je objekt nebo jiný typ)
    const userIdStr = typeof userId === 'object' ? String(userId?.id || userId) : String(userId);
    if (userIdStr === '[object Object]') {
      throw new Error(`Invalid userId: received object instead of string/number`);
    }

    // ✅ UNIFIED KEY: Jeden klíč pro všechny stavy (new, edit, fáze 1-8)
    // Draft sám určuje režim podle metadata (savedOrderId, isEditMode)
    return `order25_draft_${userIdStr}`;
  }

  /**
   * 🔄 Legacy klíče k migraci
   * @private
   */
  _getLegacyKeys(userId) {
    // 🔧 OPRAVA: Konverze userId na string
    const userIdStr = typeof userId === 'object' ? String(userId?.id || userId) : String(userId);

    return {
      // Draft data klíče (priorita od nejnovějšího)
      draftKeys: [
        `order25_draft_${userIdStr}`,       // ✅ UNIFIED KEY (current)
        `order25_draft_new_${userIdStr}`,   // Legacy: separate new/edit
        `order25_draft_edit_${userIdStr}`,  // Legacy: separate new/edit
        `order25-draft-${userIdStr}`,       // Legacy format 1
        `order_draft_${userIdStr}`          // Legacy format 2
      ],
      // UI state klíče
      uiKeys: {
        isEditMode: `order_form_isEditMode_${userIdStr}`,
        openConcept: `openOrderInConcept-${userIdStr}`,
        savedOrderId: [`order_form_savedOrderId_${userIdStr}`, `savedOrderId-${userIdStr}`],
        highlightOrderId: `highlightOrderId-${userIdStr}`,
        scroll: [`order25_scroll_${userIdStr}`, `order25-scroll-${userIdStr}`],
        sectionState: `order_form_sectionState_${userIdStr}`,
        phase2Unlocked: [`order25-phase2-unlocked-${userId}`, `phase2-unlocked-${userId}`]
      }
    };
  }

  /**
   * Uloží draft (šifrovaně)
   * @param {string|number} userId - ID uživatele
   * @param {Object} formData - Data formuláře
   * @param {Object} options - Volby (orderId, step, attachments, metadata)
   * @returns {Promise<boolean>} True pokud úspěšně uloženo
   */
  async saveDraft(userId, formData, options = {}) {
    const {
      orderId = null,        // ✅ savedOrderId - pokud je vyplněno = editace existující
      step = 0,
      attachments = [],
      metadata = {}          // isChanged, isEditMode, atd.
    } = options;

    try {
      // ✅ UNIFIED KEY: Bez parametrů type/orderId
      const key = this._getDraftKey(userId);

      // 🔒 KRITICKÉ: Načti existující draft pro zjištění invalidated flagu
      let existingInvalidated = false;
      try {
        const existing = await this.loadDraft(userId);
        if (existing && existing.invalidated === true) {
          existingInvalidated = true;
        }
      } catch (e) {
        // Ignoruj chyby načítání - není to kritické
      }

      // ✅ UNIFIED DRAFT: Obsahuje všechno (formData + metadata)
      const draftData = {
        formData,
        timestamp: Date.now(),
        step,
        version: 2,                // ✅ Verze 2 = unified draft
        savedOrderId: orderId,     // ✅ null = nová, number = editace
        lastDBUpdate: formData.datum_posledni_zmeny || null,  // ✅ DB timestamp pro sync check
        ...metadata,               // isChanged, isEditMode, isOrderSavedToDB, atd.
        // 🚫 KRITICKÉ: ZACHOVEJ existující invalidated flag!
        invalidated: metadata.invalidated !== undefined ? metadata.invalidated : existingInvalidated
      };

      //  PERSISTENCE FIX: Použij persistentní encryption seed místo userId
      // Zajistí že drafty zůstanou čitelné i po logout/login
      const persistentSeed = getDraftEncryptionSeed();

      // 🔧 BEZPEČNÉ STRINGIFY - zachytí cirkulární reference
      let draftDataString;
      try {
        draftDataString = JSON.stringify(draftData);
      } catch (stringifyError) {

        // Zkus odstranit problematická pole
        const safeDraftData = {
          ...draftData,
          formData: {
            ...draftData.formData,
            // Odstraň potenciálně problematická pole
            ...(draftData.formData.faktury && {
              faktury: draftData.formData.faktury.map(f => {
                const { file, ...rest } = f; // Odstraň File objekty
                return rest;
              })
            })
          }
        };

        // 🔧 KRITICKÉ: Zkontroluj i attachments pole (může být v options.attachments)
        if (attachments && Array.isArray(attachments)) {
          safeDraftData.attachments = attachments.map(att => {
            if (att.file) {
              const { file, ...rest } = att;
              return { ...rest, _hadFile: true };
            }
            return att;
          });
        }

        try {
          draftDataString = JSON.stringify(safeDraftData);
        } catch (fallbackError) {
          return false; // Nelze uložit
        }
      }

      const encrypted = await encryptData(draftDataString, persistentSeed);

      if (!encrypted) {
        localStorage.setItem(key, draftDataString);
      } else {
        localStorage.setItem(key, encrypted);
      }

      // Metadata (nešifrované - pro rychlý přehled)
      const metaKey = `${key}_metadata`;
      try {
        localStorage.setItem(metaKey, JSON.stringify({
          timestamp: Date.now(),
          step,
          hasAttachments: attachments.length > 0,
          savedOrderId: orderId,     // ✅ null = nová, number = editace
          isEditMode: !!orderId,     // ✅ Auto-detect z savedOrderId
          lastDBUpdate: formData.datum_posledni_zmeny || null,  // ✅ Pro sync check
          // 🚨 KRITICKÉ: invalidated flag MUSÍ být v nešifrovaných metadatech!
          invalidated: draftData.invalidated || false,
          invalidatedAt: draftData.invalidatedAt || null,
          invalidatedReason: draftData.invalidatedReason || null
        }));
      } catch (metaError) {
        // Pokračuj bez metadat - nejsou kritická
      }

      // Přílohy (šifrované, samostatně)
      if (attachments.length > 0) {
        const attachKey = `${key}_attachments`;
        try {
          const attachmentsString = JSON.stringify(attachments);
          const encryptedAttach = await encryptData(attachmentsString, persistentSeed);
          if (encryptedAttach) {
            localStorage.setItem(attachKey, encryptedAttach);
          }
        } catch (attachError) {
          // Pokračuj bez příloh
        }
      }

      // DEBUG: Optional persistence diagnostics (disabled for production performance)

      // === Event orderDraftChange je nyní spravován v OrderForm25 ===
      // (posílá kompletní informace včetně isEditMode, orderId, orderNumber)

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Načte draft (dešifruje)
   * @param {string|number} userId - ID uživatele
   * @returns {Promise<Object|null>} Draft data nebo null
   */
  async loadDraft(userId) {
    try {
      // ✅ UNIFIED KEY: Jeden klíč pro všechny stavy
      const key = this._getDraftKey(userId);
      let encrypted = localStorage.getItem(key);

      // 🔄 FALLBACK: Pokud unified klíč neexistuje, zkus legacy formáty
      if (!encrypted) {
        const legacyKeys = this._getLegacyKeys(userId);

        for (const legacyKey of legacyKeys.draftKeys) {
          encrypted = localStorage.getItem(legacyKey);
          if (encrypted) {
            break;
          }
        }

        if (!encrypted) {
          return null;
        }
      }

      if (!encrypted) return null;

      // 🔧 PERSISTENCE FIX: Připrav persistentní encryption seed pro použití
      const persistentSeed = getDraftEncryptionSeed();
      let decrypted = null;

      // 🔒 DETEKCE TYPU ENCODINGU
      if (encrypted.startsWith('BASE64:')) {
        // 📦 Emergency save s Base64 encoding (synchronní fallback)
        try {
          const base64Data = encrypted.substring(7); // Odstraň prefix "BASE64:"
          const jsonString = decodeURIComponent(escape(atob(base64Data))); // Unicode-safe decode
          decrypted = JSON.parse(jsonString);
        } catch (error) {
          // Pokračuj na standardní dešifrování
        }
      }

      // Pokud Base64 selhalo nebo nebylo použito, zkus standardní šifrování
      if (!decrypted) {
        decrypted = await decryptData(encrypted, persistentSeed);

        if (!decrypted) {
          // Fallback - možná to je nešifrované (stará verze)
          try {
            decrypted = JSON.parse(encrypted);
          } catch {
            // 🧹 CLEANUP: Vymaž poškozený/starý draft
            localStorage.removeItem(key);
            return null;
          }
        }
      }

      const draftData = typeof decrypted === 'string'
        ? (() => {
            try {
              // 🔧 BEZPEČNÉ PARSOVÁNÍ - pokud je to "[object Object]", ignoruj
              if (decrypted === '[object Object]' || decrypted.startsWith('[object')) {
                localStorage.removeItem(key);
                return null;
              }
              return JSON.parse(decrypted);
            } catch (parseError) {
              localStorage.removeItem(key);
              return null;
            }
          })()
        : decrypted;

      // 🔧 Pokud parsování vrátilo null, návrat
      if (!draftData) {
        return null;
      }

      // 🚫 KRITICKÉ: Ignoruj invalidované drafty (po uložení do DB)
      if (draftData.invalidated === true) {
        return null; // Vrať null jako by draft neexistoval
      }

      // Načti přílohy pokud existují
      const attachKey = `${key}_attachments`;
      const attachEncrypted = localStorage.getItem(attachKey);

      if (attachEncrypted) {
        const attachDecrypted = await decryptData(attachEncrypted, persistentSeed);
        // ✅ FIX: decryptData už vrací parsovaný objekt, NE string!
        draftData.attachments = attachDecrypted || [];
      }

      // DEBUG: Optional persistence diagnostics (disabled for production performance)

      return draftData;
    } catch (error) {

      // 🚨 CRITICAL DEBUG: Proč se draft načítá špatně?
      const key = this._getDraftKey(userId);
      const rawData = localStorage.getItem(key);

      // ❌ TEMPORARILY DISABLED: Auto-deletion too aggressive!
      // Pokud je draft nečitelný (starý encryption klíč), smaž ho pouze jednou
      // if ((error.message?.includes('OperationError') ||
      //      error.message?.includes('Unexpected token') ||
      //      error.message?.includes('not valid JSON')) &&
      //     !this._cleanupProcessed.has(key)) {
      //   console.warn('🧹 Cleaning up unreadable legacy draft:', key);
      //   this._cleanupProcessed.add(key);
      //   this.deleteDraft(userId, type, orderId);
      // }

      return null;
    }
  }

  /**
   * Auto-save s debounce
   * @param {string|number} userId - ID uživatele
   * @param {Object} formData - Data formuláře
   * @param {Object} options - Volby (type, orderId, step, attachments)
   */
  autoSave(userId, formData, options = {}) {
    const key = this._getDraftKey(userId, options.type, options.orderId);

    // Zruš předchozí timer
    if (this.autoSaveTimers.has(key)) {
      clearTimeout(this.autoSaveTimers.get(key));
    }

    // Nastav nový timer
    const timer = setTimeout(() => {
      this.saveDraft(userId, formData, options);
      this.autoSaveTimers.delete(key);
    }, this.config.autoSaveDelay);

    this.autoSaveTimers.set(key, timer);
  }

  /**
   * Smaže draft
   * @param {string|number} userId - ID uživatele
   * @param {string} type - 'new' nebo 'edit'
   * @param {string|number|null} orderId - ID objednávky (pouze pro edit)
   */
  deleteDraft(userId, type = 'new', orderId = null) {
    const key = this._getDraftKey(userId, type, orderId);

    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_metadata`);
    localStorage.removeItem(`${key}_attachments`);

    // Zruš případný pending auto-save
    if (this.autoSaveTimers.has(key)) {
      clearTimeout(this.autoSaveTimers.get(key));
      this.autoSaveTimers.delete(key);
    }

    // Upozorni menu bar, že draft byl smazán
    window.dispatchEvent(new CustomEvent('orderDraftChange', {
      detail: { hasDraft: false }
    }));
  }

  /**
   * Seznam všech draftů uživatele
   * @param {string|number} userId - ID uživatele
   * @returns {Array} Pole s metadata draftů
   */
  listDrafts(userId) {
    const drafts = [];
    const prefix = `order25_draft_`;  // ORDER25 STANDARD PREFIX

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.startsWith(prefix) &&
          key.includes(`_${userId}`) &&
          key.endsWith('_metadata')) {

        try {
          const meta = JSON.parse(localStorage.getItem(key));
          drafts.push({
            key: key.replace('_metadata', ''),
            ...meta
          });
        } catch (error) {
        }
      }
    }

    return drafts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Vyčistí staré drafty (30+ dní)
   * @param {string|number|null} userId - ID uživatele (null = všichni)
   * @returns {number} Počet vyčištěných draftů
   */
  cleanupOldDrafts(userId = null) {
    const now = Date.now();
    let cleaned = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);

      if (key?.startsWith('order25_draft_') && key.endsWith('_metadata')) {  // ORDER25 STANDARD
        // Zkontroluj userId filter
        if (userId && !key.includes(`_${userId}`)) continue;

        try {
          const meta = JSON.parse(localStorage.getItem(key));
          const age = now - meta.timestamp;

          if (age > this.config.maxDraftAge) {
            // Extrahuj userId z klíče pro správné smazání
            const parts = key.replace('_metadata', '').split('_');
            const extractedUserId = parts[3]; // order_draft_new_USER_ID
            const extractedType = meta.type;
            const extractedOrderId = meta.orderId;

            this.deleteDraft(
              extractedUserId,
              extractedType,
              extractedOrderId
            );
            cleaned++;
          }
        } catch (error) {
        }
      }
    }

    if (cleaned > 0 && this.config.debug) {
    }

    return cleaned;
  }

  /**
   * Kontrola existence draftu
   * @param {string|number} userId - ID uživatele
   * @param {string} type - 'new' nebo 'edit' nebo null (hledá jakýkoli)
   * @param {string|number|null} orderId - ID objednávky (pouze pro edit)
   * @returns {boolean} True pokud draft existuje
   */
  hasDraft(userId, type = null, orderId = null) {
    try {
      // Pokud type není specifikován, hledej všechny možné kombinace
      if (type === null) {
        // Zkus všechny možné typy
        const typesToCheck = ['new', 'edit'];

        for (const checkType of typesToCheck) {
          const key = this._getDraftKey(userId, checkType, orderId);

          // Kontroluj metadata klíč
          const metaKey = `${key}_metadata`;
          const metaExists = localStorage.getItem(metaKey) !== null;
          if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
          }
          if (metaExists) {
            // � OPTIMALIZACE: Kontroluj invalidated flag v NEŠIFROVANÝCH metadatech!
            try {
              const metaRaw = localStorage.getItem(metaKey);
              const metadata = JSON.parse(metaRaw);
              if (metadata && metadata.invalidated === true) {
                continue; // Pokračuj hledáním dalších draftů
              }
            } catch (e) {
            }

            // Metadata existují a nejsou invalidovaná → draft existuje
            return true;
          }

          // Fallback: kontroluj přímý klíč
          const directData = localStorage.getItem(key);
          if (directData !== null) {
            // � FALLBACK: Zkus přečíst invalidated flag přímo z dat (může být nešifrovaný starý draft)
            try {
              const parsed = JSON.parse(directData);
              if (parsed && parsed.invalidated === true) {
                continue;
              }
              // Draft existuje a není invalidovaný
              return true;
            } catch (e) {
              // Data jsou šifrovaná - nemůžeme je přečíst sync
              // Musíme předpokládat že existují (async loadDraft() je ověří)
              return true;
            }
          }
        }

        // Dodatečný fallback: hledej i starší formáty klíčů
        const legacyKeys = [
          `order25-draft-${userId}`,
          `order_draft_${userId}`,
          `order25_draft_${userId}`
        ];

        for (const legacyKey of legacyKeys) {
          if (localStorage.getItem(legacyKey) !== null) {
            if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
            }
            return true;
          }
        }

        if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
        }
        return false;
      }

      // Konkrétní type specifikován
      const key = this._getDraftKey(userId, type, orderId);

      // Kontroluj metadata klíč (rychlejší než dekryptování)
      const metaKey = `${key}_metadata`;
      if (localStorage.getItem(metaKey) !== null) {
        if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
        }
        return true;
      }

      // Fallback: kontroluj přímý klíč (pro starší verze draftu bez metadat)
      const directData = localStorage.getItem(key);
      if (directData !== null) {
        if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
        }
        return true;
      }

      if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      }
      return false;
    } catch (error) {
      if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      }
      return false;
    }
  }

  /**
   * Získá věk draftu v milisekundách
   * @param {string|number} userId - ID uživatele
   * @param {string} type - 'new' nebo 'edit'
   * @param {string|number|null} orderId - ID objednávky (pouze pro edit)
   * @returns {number|null} Věk v ms nebo null
   */
  getDraftAge(userId, type = 'new', orderId = null) {
    try {
      const key = this._getDraftKey(userId, type, orderId);
      const metaKey = `${key}_metadata`;
      const meta = localStorage.getItem(metaKey);

      if (!meta) return null;

      const { timestamp } = JSON.parse(meta);
      return Date.now() - timestamp;
    } catch {
      return null;
    }
  }

  /**
   * Synchronní načtení draftu (bez async/await)
   * Používá se pro rychlou kontrolu invalidated flagu
   * @param {string|number} userId - ID uživatele
   * @param {string} type - 'new' nebo 'edit'
   * @param {string|number|null} orderId - ID objednávky
   * @returns {Object|null} Draft data nebo null
   */
  loadDraftSync(userId, type = 'new', orderId = null) {
    try {
      const key = this._getDraftKey(userId, type, orderId);
      const data = localStorage.getItem(key);

      if (!data) return null;

      // Zkus parsovat (může být šifrované nebo plain JSON)
      try {
        const parsed = JSON.parse(data);

        // ⭐ IGNORUJ invalidované drafty (uložené do DB)
        if (parsed && parsed.invalidated === true) {
          return null;
        }

        return parsed;
      } catch {
        // Šifrované - nemůžeme synchronně dešifrovat, vrať null
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Synchronní uložení draftu (bez šifrování)
   * Používá se pro rychlé nastavení invalidated flagu
   * @param {string|number} userId - ID uživatele
   * @param {Object} draftData - Data draftu
   * @param {string} type - 'new' nebo 'edit'
   * @param {string|number|null} orderId - ID objednávky
   * @returns {boolean} True pokud úspěšně uloženo
   */
  saveDraftSync(userId, draftData, type = 'new', orderId = null) {
    try {
      const key = this._getDraftKey(userId, type, orderId);
      localStorage.setItem(key, JSON.stringify(draftData));

      // Aktualizuj metadata
      const metaKey = `${key}_metadata`;
      localStorage.setItem(metaKey, JSON.stringify({
        timestamp: Date.now(),
        invalidated: draftData.invalidated || false
      }));

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🧹 Vyčistit VŠECHNY poškozené drafty (obsahující "[object Object]")
   * @returns {number} Počet smazaných draftů
   */
  cleanupCorruptedDrafts() {
    try {
      let cleaned = 0;
      const keysToRemove = [];

      // Projdi všechny localStorage klíče
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('order25_draft_')) continue;

        const value = localStorage.getItem(key);
        if (!value) continue;

        // Detekuj "[object Object]" nebo jiné známky poškození
        if (value === '[object Object]' ||
            value.startsWith('[object') ||
            (value.length < 100 && value.includes('[object'))) {
          keysToRemove.push(key);
          cleaned++;
        }
      }

      // Smaž poškozené klíče
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_metadata`);
        localStorage.removeItem(`${key}_attachments`);
      });

      if (cleaned > 0) {
      }

      return cleaned;
    } catch (error) {
      return 0;
    }
  }
}

// Singleton instance - ORDER25 STANDARD
const order25DraftStorageService = new Order25DraftStorageService();

// Export ORDER25 service
export default order25DraftStorageService;

// 🧹 CLEANUP poškozených draftů při startu
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Vyčistit poškozené drafty
      order25DraftStorageService.cleanupCorruptedDrafts();
      // Pak normální cleanup starých
      order25DraftStorageService.cleanupOldDrafts();
    }, 2000); // 2 sekundy po startu
  });
}

// Auto-cleanup při startu (1x denně)
setInterval(() => {
  order25DraftStorageService.cleanupOldDrafts();
}, 24 * 60 * 60 * 1000);
