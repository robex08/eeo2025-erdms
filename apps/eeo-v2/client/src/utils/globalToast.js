/**
 * Global Toast fallback pro případy kdy Toast context není dostupný
 * Umožňuje zobrazit Toast notifikace i mimo React component tree
 */

let globalToastFunction = null;

// Registrace global toast funkce (volá se z App.js nebo ToastProvider)
export const registerGlobalToast = (showToastFn) => {
  globalToastFunction = showToastFn;

  // Export do window pro debug a emergency případy
  if (typeof window !== 'undefined') {
    window.showGlobalToast = showToastFn;
  }

  // console.log('🌐 Global toast fallback zaregistrován');
};

// Unregister při unmount
export const unregisterGlobalToast = () => {
  globalToastFunction = null;

  if (typeof window !== 'undefined') {
    delete window.showGlobalToast;
  }
};

// Safe toast - použije global fallback pokud showToast není dostupný
export const safeToast = (showToast, message, options = {}) => {
  if (showToast) {
    // Používej poskytnutý showToast
    showToast(message, options);
    return true;
  } else if (globalToastFunction) {
    // Fallback na global toast
    globalToastFunction(message, options);
    return true;
  } else {
    // Poslední fallback - console log
    const type = options.type || options || 'info';
    const prefix = {
      error: '❌',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    }[type] || 'ℹ️';

    return false;
  }
};

// Emergency toast pro kritické chyby - vždy se pokusí zobrazit něco
export const emergencyToast = (message, type = 'error') => {
  if (globalToastFunction) {
    globalToastFunction(message, { type, duration: 10000 });
  } else if (typeof window !== 'undefined' && window.showGlobalToast) {
    window.showGlobalToast(message, type);
  } else {
    // Pouze jako úplně poslední možnost pro kritické chyby
    if (type === 'error' && message.includes('KRITICKÁ')) {
      // V tomto případě můžeme výjimečně použít alert, ale jen pro kritické systémové chyby
      // window.alert(`KRITICKÁ CHYBA:\n\n${message}`);
    } else {
    }
  }
};