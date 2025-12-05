/**
 * Utility funkce pro práci s textem
 */

/**
 * Odstraní diakritiku z textu (české háčky a čárky)
 * Užitečné pro vyhledávání bez ohledu na diakritiku
 *
 * @param {string} text - Text k normalizaci
 * @returns {string} Text bez diakritiky v lowercase
 *
 * @example
 * removeDiacritics('Příliš žluťoučký kůň')
 * // returns 'prilis zlutoucky kun'
 */
export const removeDiacritics = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Odstraní diakritické znaky
};

/**
 * Formátuje jméno uživatele včetně titulů
 *
 * @param {object} user - Objekt uživatele s fields: titul_pred, jmeno, prijmeni, titul_za
 * @returns {string} Formátované celé jméno s tituly
 *
 * @example
 * formatUserDisplayName({ titul_pred: 'Ing.', jmeno: 'Jan', prijmeni: 'Novák', titul_za: 'Ph.D.' })
 * // returns 'Ing. Jan Novák, Ph.D.'
 */
export const formatUserDisplayName = (user) => {
  if (!user) return '';

  const { titul_pred, jmeno, prijmeni, titul_za } = user;

  // Správné pořadí: Titul před + Jméno + Příjmení + Titul za
  const titul_pred_str = titul_pred ? titul_pred + ' ' : '';
  const jmeno_str = jmeno || '';
  const prijmeni_str = prijmeni || '';
  const titul_za_str = titul_za ? ', ' + titul_za : '';

  return `${titul_pred_str}${jmeno_str} ${prijmeni_str}${titul_za_str}`
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Získá zobrazitelné jméno uživatele z ID nebo enriched objektu
 *
 * @param {number|string} userId - ID uživatele
 * @param {object} enrichedUser - Enriched objekt uživatele (s tituly)
 * @param {object} usersMap - Mapa uživatelů (userId -> user data)
 * @returns {string} Zobrazitelné jméno nebo 'Neznámý'
 */
export const getUserDisplayName = (userId, enrichedUser = null, usersMap = {}) => {
  if (enrichedUser) {
    return formatUserDisplayName(enrichedUser);
  }

  if (userId && usersMap[userId]) {
    // Pokud máme objekt s displayName, použij ho
    if (typeof usersMap[userId] === 'object' && usersMap[userId].displayName) {
      return usersMap[userId].displayName;
    }
    // Pokud je to starý formát (pouze string), použij ho
    if (typeof usersMap[userId] === 'string') {
      return usersMap[userId];
    }
  }

  return 'Neznámý';
};
