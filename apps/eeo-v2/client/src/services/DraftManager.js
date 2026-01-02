/**
 * 🎯 CENTRALIZED DRAFT MANAGER
 *
 * Jednotné místo pro všechny draft operace napříč celou aplikací
 * Řeší problémy s fragmentovanými cleanup funkcemi a encryption key rotation
 */

import order25DraftStorageService from './order25DraftStorageService';
import { getDraftEncryptionSeed } from './DraftEncryption';

class DraftManager {
  constructor() {
    this.currentUserId = null;
    this.draftChangeListeners = new Set();

    // 🎯 Centrální řízení autosave a progress
    this.autosaveEnabled = true; // Výchozí stav - autosave je povolen
    this.progressActive = false; // Progress bar aktivní
    this.progressCallbacks = {
      onStart: null,
      onProgress: null,
      onComplete: null
    };

    // Zajisti persistentní encryption seed pro drafty
    this.encryptionSeed = getDraftEncryptionSeed();
    if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
    }

    // Bind methods
    this.hasDraft = this.hasDraft.bind(this);
    this.loadDraft = this.loadDraft.bind(this);
    this.saveDraft = this.saveDraft.bind(this);
    this.deleteDraft = this.deleteDraft.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.setAutosaveEnabled = this.setAutosaveEnabled.bind(this);
    this.isAutosaveEnabled = this.isAutosaveEnabled.bind(this);
  }

  /**
   * Nastaví aktuálního uživatele
   */
  setCurrentUser(userId) {
    if (this.currentUserId !== userId) {
      if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      }
      this.currentUserId = userId;
      this._notifyDraftChange();
    }
  }

  /**
   * Zkontroluje zda existuje draft pro aktuálního uživatele
   */
  async hasDraft() {
    if (!this.currentUserId) {
      return false;
    }

    try {
      // ✅ UNIFIED: Bez parametrů type/orderId
      const result = await order25DraftStorageService.hasDraft(this.currentUserId);
      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Načte draft pro aktuálního uživatele
   */
  async loadDraft() {
    if (!this.currentUserId) {
      if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      }
      return null;
    }

    try {
      // ✅ UNIFIED: Bez parametrů type/orderId
      const result = await order25DraftStorageService.loadDraft(this.currentUserId);
      if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      }
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Uloží draft pro aktuálního uživatele
   * @param {Object} data - Data nebo options objekt
   * @param {Object} options - Options (pokud data je formData)
   */
  async saveDraft(data, options = {}) {
    if (!this.currentUserId) {
      //
      return false;
    }

    try {
      // 🔧 DETEKCE: Pokud je druhý parametr objekt s klíči jako metadata, options atd.
      let formData = data;
      let saveOptions = options;

      // ✅ UNIFIED: Zjednodušené API - jen formData + options
      // options obsahuje: orderId, step, attachments, metadata
      const result = await order25DraftStorageService.saveDraft(
        this.currentUserId,
        formData,
        saveOptions
      );

      if (result) {
        this._notifyDraftChange();
      }

      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Smaže draft pro aktuálního uživatele
   */
  async deleteDraft() {
    if (!this.currentUserId) {
      //
      return false;
    }

    try {
      // ✅ UNIFIED: Bez parametrů type/orderId
      const result = await order25DraftStorageService.deleteDraft(this.currentUserId);

      if (result) {
        this._notifyDraftChange();
      }

      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Přihlásí listener na změny draftů
   */
  subscribe(callback) {
    this.draftChangeListeners.add(callback);

    return () => {
      this.draftChangeListeners.delete(callback);
    };
  }

  /**
   * Odhlásí listener
   */
  unsubscribe(callback) {
    const removed = this.draftChangeListeners.delete(callback);
    return removed;
  }

  /**
   * Notifikuje všechny listenery o změně
   */
  async _notifyDraftChange() {
    try {
      const hasDraft = await this.hasDraft();
      const changeEvent = { hasDraft };

      if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
      }

      this.draftChangeListeners.forEach(callback => {
        try {
          callback(changeEvent);
        } catch (error) {
        }
      });
    } catch (error) {
    }
  }

  /**
   * Vyčistí všechny drafty aktuálního uživatele (při logout)
   */
  async clearUserDrafts() {
    if (!this.currentUserId) {
      return false;
    }

    try {

      // ✅ UNIFIED: Stačí smazat jeden klíč
      const deleted = await this.deleteDraft();

      if (deleted) {
        this._notifyDraftChange();
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * 🧹 KOMPLETNÍ ČIŠTĚNÍ všech dat formuláře
   * Použít při zavření formuláře (unmount) pro vymazání všech dat
   * Vymaže draft, faktury, přílohy, cache, UI state
   * @returns {boolean} True pokud úspěšně vyčištěno
   */
  async deleteAllFormData() {
    if (!this.currentUserId) {
      console.warn('⚠️ deleteAllFormData: Není nastaven currentUserId');
      return false;
    }

    try {
      // Zavolej komplexní cleanup ve storage service
      const result = await order25DraftStorageService.deleteAllFormData(this.currentUserId);

      if (result) {
        this._notifyDraftChange();
        console.log('✅ DraftManager: Kompletní čištění dokončeno');
      }

      return result;
    } catch (error) {
      console.error('❌ DraftManager: Chyba při kompletním čištění:', error);
      return false;
    }
  }

  /**
   * Reset při logout - vyčistí stav ale NEmaže persisted drafty
   */
  logout() {
    //
    this.currentUserId = null;
    this._notifyDraftChange();
  }

  /**
   * Debug info
   */
  getDebugInfo() {
    return {
      currentUserId: this.currentUserId,
      listenerCount: this.draftChangeListeners.size,
      timestamp: new Date().toISOString()
    };
  }

  // ========================================================================
  // 🎯 NOVÉ CENTRALIZOVANÉ METODY PRO LOCALSTORAGE MANAGEMENT
  // ========================================================================

  /**
   * 🗑️ Smaže VŠECHNY localStorage klíče souvisící s draftem (nové i legacy)
   * SYNCHRONNÍ operace - zaručuje okamžité smazání
   */
  async deleteAllDraftKeys() {
    if (!this.currentUserId) {
      return false;
    }

    try {
      const userId = this.currentUserId;
      const keysToDelete = [];

      // UI State klíče
      const uiKeys = [
        `order_form_isEditMode_${userId}`,
        `openOrderInConcept-${userId}`,
        `order_form_savedOrderId_${userId}`,
        `savedOrderId-${userId}`,
        `highlightOrderId-${userId}`,
        `order25_scroll_${userId}`,
        `order25-scroll-${userId}`,
        `order_form_sectionState_${userId}`,
        `order25-phase2-unlocked-${userId}`,
        `phase2-unlocked-${userId}`,
        `activeOrderEditId` // 🆕 Globální klíč pro editované objednávky (bez userId)
      ];

      // Draft data klíče (všechny formáty)
      const draftBaseKeys = [
        `order25_draft_new_${userId}`,      // ⭐ HLAVNÍ KLÍČ (používaný nyní)
        `order25_draft_edit_${userId}`,     // ⭐ HLAVNÍ KLÍČ pro editaci
        `order25-draft-${userId}`,          // Legacy formát 1 (safeDraftStorage.js)
        `order_draft_${userId}`,            // Legacy formát 2 (velmi starý)
        `order25_draft_${userId}`           // Legacy formát 3 (starý)
      ];

      // Pro každý draft klíč smaž i _metadata a _attachments
      draftBaseKeys.forEach(baseKey => {
        keysToDelete.push(baseKey);
        keysToDelete.push(`${baseKey}_metadata`);
        keysToDelete.push(`${baseKey}_attachments`);
      });

      // Smaž všechny UI klíče
      keysToDelete.push(...uiKeys);

      // 🔍 KRITICKÉ: Najdi VŠECHNY klíče obsahující "draft"/"order25"/"order_form" a userId
      // ⚠️ VYJMI ŠABLONY (order_templates) - ty jsou perzistentní data, ne drafty!
      const allUserKeys = [];
      const userIdStr = String(userId);

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(userIdStr)) {
          // ⚠️ VYNECHAT šablony - ty nejsou draft!
          if (key.includes('template')) {
            continue;
          }

          // Kontroluj jestli klíč obsahuje draft-relevantní klíčové slovo
          if (
            key.includes('draft') ||
            key.includes('order25') ||
            key.includes('order_form') ||
            key.includes('openOrder') ||
            key.includes('savedOrder') ||
            key.includes('phase2')
          ) {
            allUserKeys.push(key);
            // Přidej do keysToDelete pokud tam ještě není
            if (!keysToDelete.includes(key)) {
              keysToDelete.push(key);
            }
          }
        }
      }
      // SYNCHRONNÍ mazání
      let deletedCount = 0;
      let existedCount = 0;
      keysToDelete.forEach(key => {
        const existed = localStorage.getItem(key) !== null;
        if (existed) {
          existedCount++;
          localStorage.removeItem(key);
          deletedCount++;
        }
      });
      // 🔍 VERIFIKACE: Zkontroluj že draft opravdu neexistuje
      const stillExists = await order25DraftStorageService.hasDraft(userId);
      if (stillExists) {

        // 🚨 KRITICKÉ: Zkus najít který klíč způsobuje problém
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(userIdStr) && key.includes('draft')) {
          }
        }
      } else {
      }

      // Broadcast změny
      try {
        window.dispatchEvent(new CustomEvent('orderDraftChange', {
          detail: { hasDraft: false, isEditMode: false, orderId: null, orderNumber: '', userId }
        }));
      } catch (e) {
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * 💾 Uloží metadata (isEditMode, savedOrderId, atd.)
   * Použití: rychlá aktualizace metadata bez načítání celého draftu
   */
  saveMetadata(metadata = {}) {
    if (!this.currentUserId) {
      return false;
    }

    try {
      const userId = this.currentUserId;

      // Ulož jednotlivé metadata klíče
      if (metadata.isEditMode !== undefined) {
        localStorage.setItem(`order_form_isEditMode_${userId}`, String(metadata.isEditMode));
      }

      if (metadata.savedOrderId !== undefined) {
        if (metadata.savedOrderId === null) {
          localStorage.removeItem(`order_form_savedOrderId_${userId}`);
        } else {
          localStorage.setItem(`order_form_savedOrderId_${userId}`, String(metadata.savedOrderId));
        }
      }

      if (metadata.openConceptNumber !== undefined) {
        if (metadata.openConceptNumber === null) {
          localStorage.removeItem(`openOrderInConcept-${userId}`);
        } else {
          localStorage.setItem(`openOrderInConcept-${userId}`, metadata.openConceptNumber);
        }
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * 📖 Načte metadata bez dešifrování celého draftu
   */
  getMetadata() {
    if (!this.currentUserId) {
      return null;
    }

    try {
      const userId = this.currentUserId;

      const isEditModeRaw = localStorage.getItem(`order_form_isEditMode_${userId}`);
      const savedOrderIdRaw = localStorage.getItem(`order_form_savedOrderId_${userId}`);
      const openConceptRaw = localStorage.getItem(`openOrderInConcept-${userId}`);

      return {
        isEditMode: isEditModeRaw === 'true',
        savedOrderId: savedOrderIdRaw ? parseInt(savedOrderIdRaw, 10) : null,
        openConceptNumber: openConceptRaw || null
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * 🧹 Vyčistí všechna metadata
   */
  clearMetadata() {
    if (!this.currentUserId) {
      return false;
    }

    try {
      const userId = this.currentUserId;

      localStorage.removeItem(`order_form_isEditMode_${userId}`);
      localStorage.removeItem(`order_form_savedOrderId_${userId}`);
      localStorage.removeItem(`openOrderInConcept-${userId}`);

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * 💾 Uloží UI state (scroll, phase2, sectionState, atd.)
   */
  saveUIState(uiState = {}) {
    if (!this.currentUserId) {
      return false;
    }

    try {
      const userId = this.currentUserId;

      if (uiState.scrollPosition !== undefined) {
        localStorage.setItem(`order25_scroll_${userId}`, String(uiState.scrollPosition));
      }

      if (uiState.phase2Unlocked !== undefined) {
        const unlockKey = `order25-phase2-unlocked-${userId}`;

        if (uiState.phase2Unlocked) {
          // Uložit jako objekt s orderId a timestamp
          const unlockData = {
            orderId: uiState.phase2OrderId || null,
            unlocked: true,
            timestamp: uiState.phase2Timestamp || new Date().toISOString()
          };
          localStorage.setItem(unlockKey, JSON.stringify(unlockData));
        } else {
          localStorage.removeItem(unlockKey);
        }
      }

      if (uiState.sectionState !== undefined) {
        localStorage.setItem(`order_form_sectionState_${userId}`, JSON.stringify(uiState.sectionState));
      }

      if (uiState.highlightOrderId !== undefined) {
        if (uiState.highlightOrderId === null) {
          localStorage.removeItem(`highlightOrderId-${userId}`);
        } else {
          localStorage.setItem(`highlightOrderId-${userId}`, uiState.highlightOrderId);
        }
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * 📖 Načte UI state
   */
  getUIState() {
    if (!this.currentUserId) {
      return null;
    }

    try {
      const userId = this.currentUserId;

      const scrollRaw = localStorage.getItem(`order25_scroll_${userId}`);
      const phase2Raw = localStorage.getItem(`order25-phase2-unlocked-${userId}`);
      const sectionStateRaw = localStorage.getItem(`order_form_sectionState_${userId}`);
      const highlightRaw = localStorage.getItem(`highlightOrderId-${userId}`);

      // Parsuj phase2 unlock data
      let phase2UnlockData = { unlocked: false, orderId: null, timestamp: null };
      if (phase2Raw) {
        try {
          phase2UnlockData = JSON.parse(phase2Raw);
          // Fallback pro starý formát (jen string 'true')
          if (typeof phase2UnlockData === 'string' || typeof phase2UnlockData === 'boolean') {
            phase2UnlockData = { unlocked: true, orderId: null, timestamp: null };
          }
        } catch (e) {
          // Fallback pro chybný formát
          phase2UnlockData = { unlocked: true, orderId: null, timestamp: null };
        }
      }

      return {
        scrollPosition: scrollRaw ? parseInt(scrollRaw, 10) : 0,
        phase2Unlocked: phase2UnlockData.unlocked || false,
        phase2OrderId: phase2UnlockData.orderId || null,
        phase2Timestamp: phase2UnlockData.timestamp || null,
        sectionState: sectionStateRaw ? JSON.parse(sectionStateRaw) : {},
        highlightOrderId: highlightRaw || null
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * 🎯 Nastaví, zda je autosave povoleno
   * @param {boolean} enabled - true = autosave povolen, false = zakázán
   * @param {string} reason - důvod změny (pro debugging)
   */
  setAutosaveEnabled(enabled, reason = '') {
    const changed = this.autosaveEnabled !== enabled;
    this.autosaveEnabled = enabled;

    if (changed) {
    }
  }

  /**
   * 🎯 Zkontroluje, zda je autosave povolen
   * @returns {boolean} - true pokud je autosave povolen
   */
  isAutosaveEnabled() {
    return this.autosaveEnabled;
  }

  /**
   * 🎯 Spustí progress bar s automatickým timeout
   * @param {Object} options - konfigurace progress
   * @param {number} options.duration - délka animace v ms (default: 3000)
   * @param {Function} options.onComplete - callback po dokončení
   * @param {Function} options.onProgress - callback pro progress update
   * @returns {Object} - objekt s metodou cancel()
   */
  startProgress(options = {}) {
    const {
      duration = 3000,
      onComplete = null,
      onProgress = null
    } = options;

    // Okamžitě zakázat autosave
    this.setAutosaveEnabled(false, 'Progress started');
    this.progressActive = true;
    
    // ✅ OPRAVENO: Plynulý dojezd progress baru místo okamžitého skoku na 100%
    // Progress se bude postupně navyšovat od 0 do 100 během celé duration
    let currentProgress = 0;
    const steps = 50; // Počet kroků animace (50 kroků = plynulá animace)
    const stepDuration = duration / steps; // Čas na jeden krok
    const progressIncrement = 100 / steps; // Přírůstek progress na krok
    
    const intervalId = setInterval(() => {
      currentProgress += progressIncrement;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(intervalId);
      }
      
      // Callback pro aktualizaci UI
      if (onProgress) {
        onProgress(Math.min(currentProgress, 100));
      }
    }, stepDuration);

    // Timer pro dokončení (po duration)
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId); // Zastavit interval pokud ještě běží
      this.progressActive = false;

      // Poslední update na 100% (pro jistotu)
      if (onProgress) {
        onProgress(100);
      }

      if (onComplete) {
        onComplete();
      }
    }, duration);

    // Vrátit objekt s cancel metodou
    return {
      cancel: () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        this.progressActive = false;
        this.setAutosaveEnabled(true, 'Progress cancelled');
      }
    };
  }

  /**
   * 🎯 Zkontroluje, zda běží progress
   * @returns {boolean}
   */
  isProgressActive() {
    return this.progressActive;
  }

  /**
   * 🔄 Synchronizuje localStorage s novými daty z DB po uložení
   * Zajišťuje, že workflow stav v localStorage odpovídá DB
   * @param {object} updatedFormData - Aktualizovaná data z DB
   * @param {number} orderId - ID objednávky
   * @returns {Promise<boolean>}
   */
  async syncWithDatabase(updatedFormData, orderId) {
    if (!this.currentUserId) {
      return false;
    }

    try {
      // ✅ UNIFIED: Jednodušší API - orderId určuje režim
      const result = await order25DraftStorageService.saveDraft(
        this.currentUserId,
        updatedFormData,
        {
          orderId: orderId,       // ✅ Určuje že jde o editaci existující
          metadata: {
            isChanged: false,     // Draft = DB snapshot (žádné pending změny)
            isOrderSavedToDB: true,
            savedOrderId: orderId,
            editOrderId: orderId,
            isEditMode: true
          }
        }
      );

      if (result) {
        this._notifyDraftChange();
      }

      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🔄 Zkontroluje synchronizaci draftu s databází
   * Porovná lastDBUpdate v draftu s dt_aktualizace v DB
   * Pokud je DB novější, vrátí true a doporučí reload z DB
   *
   * OPTIMALIZOVÁNO: Používá lightweight /dt-aktualizace endpoint místo načítání celé objednávky
   *
   * @param {Function} fetchTimestampFromDB - Funkce pro získání dt_aktualizace z DB: (orderId) => Promise<{id, dt_aktualizace}>
   * @param {Function} fetchFullOrderFromDB - Funkce pro načtení celé objednávky pokud je potřeba: (orderId) => Promise<orderData>
   * @returns {Promise<{needsSync: boolean, dbData: object|null, reason: string}>}
   */
  async checkDBSync(fetchTimestampFromDB, fetchFullOrderFromDB = null) {
    if (!this.currentUserId) {
      return {
        needsSync: false,
        dbData: null,
        reason: 'No current user'
      };
    }

    try {
      // Načti draft
      const draft = await this.loadDraft();

      // Pokud není draft, není co synchronizovat
      if (!draft) {
        return {
          needsSync: false,
          dbData: null,
          reason: 'No draft exists'
        };
      }

      // Pokud draft je pro NOVOU objednávku (savedOrderId === null), není co synchronizovat
      if (!draft.savedOrderId) {
        return {
          needsSync: false,
          dbData: null,
          reason: 'Draft is for new order (no DB record yet)'
        };
      }

      // Pokud draft nemá lastDBUpdate, nemůžeme porovnat
      if (!draft.lastDBUpdate) {
        return {
          needsSync: false,
          dbData: null,
          reason: 'Draft missing lastDBUpdate timestamp'
        };
      }

      // ✅ OPTIMALIZACE: Načti pouze timestamp z DB (lightweight endpoint)
      const timestampData = await fetchTimestampFromDB(draft.savedOrderId);

      if (!timestampData || !timestampData.dt_aktualizace) {
        return {
          needsSync: false,
          dbData: null,
          reason: 'Order not found in database'
        };
      }

      // Porovnej timestampy
      const draftTimestamp = new Date(draft.lastDBUpdate).getTime();
      const dbTimestamp = new Date(timestampData.dt_aktualizace).getTime();

      // Pokud je DB novější, načti celou objednávku
      if (dbTimestamp > draftTimestamp) {
        // Načti celou objednávku pokud je poskytnut callback
        let fullOrderData = null;
        if (fetchFullOrderFromDB) {
          fullOrderData = await fetchFullOrderFromDB(draft.savedOrderId);
        }

        return {
          needsSync: true,
          dbData: fullOrderData,  // Může být null pokud nebyl poskytnut fetchFullOrderFromDB
          dbTimestamp: timestampData.dt_aktualizace,
          reason: 'Database has newer version'
        };
      }

      // Draft je aktuální
      return {
        needsSync: false,
        dbData: null,
        reason: 'Draft is current'
      };

    } catch (error) {
      return {
        needsSync: false,
        dbData: null,
        reason: `Error: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const draftManager = new DraftManager();
export default draftManager;