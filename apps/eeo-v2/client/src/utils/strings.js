export const escapeHtml = (str = '') => String(str)
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;');

/**
 * Normalizuje text pro vyhledávání - odstraní diakritiku a převede na malá písmena
 * @param {string} text - Text k normalizaci
 * @returns {string} - Normalizovaný text bez diakritiky v malých písmenech
 */
export const normalizeForSearch = (text = '') => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Odstraní diakritiku
};

/**
 * Porovnává dva texty bez ohledu na diakritiku a velikost písmen
 * @param {string} text - Text k prohledání
 * @param {string} searchTerm - Hledaný výraz
 * @returns {boolean} - True pokud text obsahuje hledaný výraz
 */
export const matchesSearch = (text, searchTerm) => {
  if (!searchTerm) return true;
  if (!text) return false;
  return normalizeForSearch(text).includes(normalizeForSearch(searchTerm));
};
