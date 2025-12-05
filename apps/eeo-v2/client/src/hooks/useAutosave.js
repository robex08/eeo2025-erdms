import { useRef, useCallback, useEffect } from 'react';

/**
 * Centralizovaný hook pro autosave s debounce logikou
 *
 * @param {Function} saveFunction - Funkce která se zavolá pro uložení
 * @param {Object} options - Konfigurace
 * @param {number} options.delay - Zpoždění v ms před uložením (default: 3000)
 * @param {boolean} options.enabled - Zda je autosave povoleno (default: true)
 * @param {Array} options.dependencies - Závislosti pro useCallback
 *
 * @returns {Object} - { triggerAutosave, cancelAutosave, isScheduled }
 */
export const useAutosave = (saveFunction, options = {}) => {
  const {
    delay = 3000,
    enabled = true,
    dependencies = []
  } = options;

  const timeoutRef = useRef(null);
  const isScheduledRef = useRef(false);
  const lastSaveTimeRef = useRef(0);
  const MIN_INTERVAL = 1000; // Minimální interval mezi uloženími (1s)

  /**
   * Zruší naplánované autosave
   */
  const cancelAutosave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      isScheduledRef.current = false;
    }
  }, []);

  /**
   * Spustí autosave s debounce
   * @param {boolean} immediate - Pokud true, uloží okamžitě (pro selecty)
   */
  const triggerAutosave = useCallback((immediate = false) => {
    if (!enabled) {
      return;
    }

    // Zruš předchozí timeout
    cancelAutosave();

    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;

    // Pokud je immediate a od posledního uložení uplynula minimální doba
    if (immediate && timeSinceLastSave >= MIN_INTERVAL) {
      lastSaveTimeRef.current = now;
      saveFunction(true); // true = isAutoSave
      return;
    }

    // Jinak nastav debounce timeout
    isScheduledRef.current = true;
    timeoutRef.current = setTimeout(() => {
      const currentTime = Date.now();
      const elapsed = currentTime - lastSaveTimeRef.current;

      // Pouze pokud uplynula minimální doba
      if (elapsed >= MIN_INTERVAL) {
        lastSaveTimeRef.current = currentTime;
        saveFunction(true); // true = isAutoSave
      }

      isScheduledRef.current = false;
      timeoutRef.current = null;
    }, immediate ? 0 : delay);
  }, [enabled, delay, saveFunction, cancelAutosave, ...dependencies]);

  /**
   * Vyčistí timeout při unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    triggerAutosave,
    cancelAutosave,
    isScheduled: () => isScheduledRef.current
  };
};

/**
 * Hook pro input pole s automatickým debouncem
 * Vrací handleChange a handleBlur funkce
 *
 * @param {Function} onChange - Původní onChange handler
 * @param {Function} triggerAutosave - Funkce pro spuštění autosave
 * @param {Object} options - Konfigurace
 * @param {boolean} options.saveOnBlur - Ukládat při opuštění pole (default: true)
 * @param {boolean} options.isSelectField - Je to select/checkbox? (default: false)
 *
 * @returns {Object} - { handleChange, handleBlur }
 */
export const useAutosaveField = (onChange, triggerAutosave, options = {}) => {
  const {
    saveOnBlur = true,
    isSelectField = false
  } = options;

  const handleChange = useCallback((fieldOrEvent, value) => {
    // Zavolej původní onChange
    if (typeof fieldOrEvent === 'string') {
      // handleInputChange(field, value)
      onChange(fieldOrEvent, value);
    } else {
      // handleChange(event)
      onChange(fieldOrEvent);
    }

    // Pro select/checkbox ulož okamžitě (s debouncem), pro text čekej na blur
    if (isSelectField) {
      triggerAutosave(true); // immediate = true
    } else {
      // Pro textová pole zatím nic - čekáme na blur
    }
  }, [onChange, triggerAutosave, isSelectField]);

  const handleBlur = useCallback((fieldName, value) => {
    // Spusť autosave při opuštění pole (pouze pro textová pole)
    if (saveOnBlur && !isSelectField) {
      triggerAutosave(false); // s debouncem
    }
  }, [triggerAutosave, saveOnBlur, isSelectField]);

  return {
    handleChange,
    handleBlur
  };
};

export default useAutosave;
