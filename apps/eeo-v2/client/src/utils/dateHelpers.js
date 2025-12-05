/**
 * Pomocné funkce pro práci s daty a roky
 */

/**
 * Vrátí číslo roku na základě nastavení uživatele
 * @param {string} yearSetting - 'current', 'all' nebo konkrétní rok jako string (např. '2025')
 * @returns {number|null} - Číslo roku nebo null pro 'all' (všechny roky)
 */
export const getYearFromSetting = (yearSetting) => {
  if (yearSetting === 'current' || !yearSetting) {
    return new Date().getFullYear();
  }
  
  if (yearSetting === 'all') {
    return null; // Null znamená "všechny roky"
  }
  
  const parsed = parseInt(yearSetting, 10);
  return isNaN(parsed) ? new Date().getFullYear() : parsed;
};

/**
 * Vrátí název měsíce v češtině
 * @param {string|number} monthNumber - Číslo měsíce (1-12)
 * @returns {string} - Název měsíce
 */
export const getMonthName = (monthNumber) => {
  const months = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];
  
  const num = parseInt(monthNumber, 10);
  if (isNaN(num) || num < 1 || num > 12) {
    return 'Všechny měsíce';
  }
  
  return months[num - 1];
};

/**
 * Vrátí rozsah dat pro daný rok a měsíc
 * @param {string} yearSetting - 'current', 'all' nebo konkrétní rok
 * @param {string} periodSetting - 'all' nebo číslo měsíce ('1'-'12')
 * @returns {Object} - { from: Date, to: Date, year: number|null, month: number|null }
 */
export const getDateRangeFromSettings = (yearSetting, periodSetting) => {
  const year = getYearFromSetting(yearSetting);
  
  // Pokud je vybrán "Všechny roky"
  if (year === null) {
    return {
      from: new Date(2016, 0, 1), // 1. ledna 2016 (nejstarší rok)
      to: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59), // Konec aktuálního roku
      year: null,
      month: null
    };
  }
  
  if (periodSetting === 'all' || !periodSetting) {
    // Celý rok
    return {
      from: new Date(year, 0, 1), // 1. ledna
      to: new Date(year, 11, 31, 23, 59, 59), // 31. prosince
      year,
      month: null
    };
  }
  
  const month = parseInt(periodSetting, 10);
  if (isNaN(month) || month < 1 || month > 12) {
    // Fallback na celý rok
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31, 23, 59, 59),
      year,
      month: null
    };
  }
  
  // Konkrétní měsíc
  const lastDay = new Date(year, month, 0).getDate(); // Poslední den v měsíci
  return {
    from: new Date(year, month - 1, 1), // První den měsíce
    to: new Date(year, month - 1, lastDay, 23, 59, 59), // Poslední den měsíce
    year,
    month
  };
};

/**
 * Formátuje datum pro české prostředí
 * @param {Date|string} date - Datum
 * @returns {string} - Formátované datum (např. "19. 11. 2025")
 */
export const formatDateCZ = (date) => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};

/**
 * Formátuje datum a čas pro české prostředí
 * @param {Date|string} date - Datum
 * @returns {string} - Formátované datum a čas (např. "19. 11. 2025 14:30")
 */
export const formatDateTimeCZ = (date) => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};
