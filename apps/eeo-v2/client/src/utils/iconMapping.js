/**
 * 🎯 CENTRALIZED ICON MAPPING
 *
 * Tento modul poskytuje jednotnou logiku pro mapování stavů objednávek,
 * notifikací a dalších entit na FontAwesome ikony.
 *
 * Všechny komponenty by měly používat tyto funkce místo vlastních implementací,
 * aby byla zachována konzistence napříč celou aplikací.
 */

import {
  faPlay, faHourglassHalf, faCheckCircle, faBan, faClock,
  faTruck, faShield, faFileContract, faStop, faPause,
  faTimesCircle, faArchive, faInfoCircle, faExclamationCircle,
  faBell, faExclamationTriangle, faBolt, faBullseye
} from '@fortawesome/free-solid-svg-icons';

/**
 * Mapování stavů objednávek na FontAwesome ikony
 *
 * @param {string} status - Stav objednávky (např. 'nova', 'schvalena', 'odeslana')
 * @returns {object} FontAwesome ikona
 */
export const getStatusIcon = (status) => {
  // Normalizace: odstranění diakritiky a převod na lowercase
  const normalizedStatus = status?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Odstranění diakritiky

  switch (normalizedStatus) {
    // Základní stavy
    case 'nova':
      return faPlay;
    case 'ke_schvaleni':
    case 'keSchvaleni':
      return faHourglassHalf;
    case 'schvalena':
      return faCheckCircle;
    case 'zamitnuta':
      return faTimesCircle;
    case 'rozpracovana':
      return faClock;

    // Pracovní stavy
    case 'odeslana':
      return faTruck;
    case 'potvrzena':
      return faShield;
    case 'uverejnena':
    case 'registr_zverejnena':
    case 'registrzverejnena':
      return faFileContract;
    case 'dokoncena':
      return faBullseye; // Používá se v tabulce, kompaktní režim má přímo emoji
    case 'ceka_potvrzeni':
    case 'cekaPotvrzeni':
    case 'ceka_se':
    case 'cekaSe':
      return faPause;
    case 'zrusena':
      return faTimesCircle;
    case 'archivovano':
    case 'archivovana':
      return faArchive;

    // Kontrolní stavy
    case 'kontrola_ceka':
    case 'cekaKontrola':
      return faClock;
    case 'kontrola_potvrzena':
    case 'vecnaSpravnost':
    case 'vecna_spravnost':
      return faCheckCircle;

    // Výchozí ikona pro neznámé stavy
    default:
      return faInfoCircle;
  }
};

/**
 * Mapování typů notifikací na FontAwesome ikony
 *
 * Pro notifikace související s objednávkami se použije ikona podle stavu.
 * Pro ostatní notifikace jsou definovány specifické ikony.
 *
 * @param {string} notificationType - Typ notifikace (např. 'ORDER_CREATED', 'todo_alarm')
 * @param {string} priority - Priorita notifikace ('low', 'normal', 'high', 'urgent')
 * @returns {object} FontAwesome ikona
 */
export const getNotificationIcon = (notificationType, priority = 'normal') => {
  // Pokud je to notifikace o změně stavu objednávky, použij ikonu podle stavu
  if (notificationType?.startsWith('ORDER_')) {
    const status = notificationType.replace('ORDER_', '');
    return getStatusIcon(status);
  }

  // Specifické typy notifikací
  switch (notificationType) {
    // TODO alarmy
    case 'todo_alarm':
      return faBell;
    case 'todo_alarm_high':
      return faExclamationTriangle;
    case 'todo_alarm_expired':
      return faExclamationCircle;

    // Force unlock
    case 'order_unlock_forced':
      return faBolt;

    // Výchozí podle priority
    default:
      return getPriorityIcon(priority);
  }
};

/**
 * Získání ikony podle priority notifikace
 *
 * @param {string} priority - Priorita ('low', 'normal', 'high', 'urgent')
 * @returns {object} FontAwesome ikona
 */
export const getPriorityIcon = (priority) => {
  switch (priority) {
    case 'urgent':
    case 'high':
      return faExclamationCircle;
    case 'normal':
      return faBell;
    case 'low':
    default:
      return faInfoCircle;
  }
};

/**
 * Helper funkce: Extrahuje stav objednávky z typu notifikace
 *
 * @param {string} notificationType - Typ notifikace (např. 'ORDER_APPROVED')
 * @returns {string|null} Stav objednávky nebo null
 */
export const extractOrderStatusFromNotificationType = (notificationType) => {
  if (!notificationType?.startsWith('ORDER_')) {
    return null;
  }
  return notificationType.replace('ORDER_', '');
};

/**
 * 🎨 Mapování typů notifikací na EMOJI ikony
 * 
 * ⚠️ DEPRECATED od 17.12.2025 - Místo emoji se nyní používají FontAwesome ikony podle priority
 * @see NotificationsPage.js -> getPriorityIconComponent()
 * 
 * Nové ikony:
 * - INFO: faInfoCircle (modrý kruh)
 * - APPROVAL/HIGH: faExclamation (oranžový vykřičník)
 * - EXCEPTIONAL/URGENT: faBolt (červený blesk)
 *
 * Pro notifikace související s objednávkami se použije emoji podle stavu.
 * Pro ostatní notifikace jsou definovány specifické emoji.
 *
 * @deprecated Používá se pouze pro zpětnou kompatibilitu
 * @param {string} notificationType - Typ notifikace (např. 'ORDER_CREATED', 'todo_alarm')
 * @param {string} priority - Priorita notifikace ('low', 'normal', 'high', 'urgent')
 * @returns {string} Emoji ikona
 */
export const getNotificationEmoji = (notificationType, priority = 'normal') => {
  // Pokud je to notifikace o změně stavu objednávky, použij emoji podle stavu
  if (notificationType?.startsWith('ORDER_')) {
    const status = notificationType.replace('ORDER_', '');
    return getStatusEmoji(status);
  }

  // Specifické typy notifikací
  switch (notificationType) {
    // TODO alarmy
    case 'todo_alarm':
      return '🔔';
    case 'todo_alarm_high':
      return '⚠️';
    case 'todo_alarm_expired':
      return '🚨';

    // Force unlock
    case 'order_unlock_forced':
      return '⚡';

    // Výchozí podle priority
    default:
      return getPriorityEmoji(priority);
  }
};

/**
 * 🎨 Získání emoji podle priority notifikace
 *
 * @param {string} priority - Priorita ('low', 'normal', 'high', 'urgent')
 * @returns {string} Emoji ikona
 */
export const getPriorityEmoji = (priority) => {
  switch (priority) {
    case 'urgent':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'normal':
      return '🔔';
    case 'low':
    default:
      return 'ℹ️';
  }
};

/**
 * 🎨 Helper funkce pro emoji ikony stavů (pro použití v notifikacích)
 *
 * @param {string} status - Stav objednávky
 * @returns {string} Emoji ikona
 */
export const getStatusEmoji = (status) => {
  const normalizedStatus = status?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Odstranění diakritiky

  switch (normalizedStatus) {
    case 'nova':
    case 'koncept':
      return '📝';
    case 'ke_schvaleni':
    case 'keschvaleni':
      return '📋';
    case 'schvalena':
      return '👍';
    case 'zamitnuta':
      return '❌';
    case 'rozpracovana':
      return '🕐';
    case 'odeslana':
      return '📤';
    case 'potvrzena':
      return '✔️';
    case 'uverejnena':
    case 'registr_zverejnena':
    case 'registrzverejnena':
      return '📢';
    case 'dokoncena':
      return '🎯';
    case 'ceka_potvrzeni':
    case 'cekapotvrzeni':
      return '⏸️';
    case 'ceka_se':
    case 'cekase':
      return '⏸️';
    case 'zrusena':
      return '🚫';
    case 'smazana':
      return '🗑️';
    case 'archivovano':
    case 'archivovana':
      return '📦';
    case 'ceka_kontrola':
    case 'cekakontrola':
      return '🔍';
    case 'vecna_spravnost':
    case 'vecnaspravnost':
      return '✅';
    default:
      return '📊';
  }
};

