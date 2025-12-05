/**
 * Typy notifikací odpovídající backend templates (25_notification_templates)
 * Backend commit: 3a28a99 - FEATURE: Rozsireni notifikacniho systemu
 *
 * ⚡ = Vysoká priorita / Email automaticky odesílán
 */
export const NOTIFICATION_TYPES = {
  // ====================================================================
  // FÁZE 1-2: Základní stavy objednávky
  // ====================================================================
  ORDER_STATUS_NOVA: 'order_status_nova',
  ORDER_STATUS_ROZPRACOVANA: 'order_status_rozpracovana',
  ORDER_STATUS_KE_SCHVALENI: 'order_status_ke_schvaleni', // ⚡ HIGH
  ORDER_STATUS_SCHVALENA: 'order_status_schvalena',
  ORDER_STATUS_ZAMITNUTA: 'order_status_zamitnuta', // ⚡ HIGH
  ORDER_STATUS_CEKA_SE: 'order_status_ceka_se',

  // ====================================================================
  // FÁZE 3-4: Odeslání dodavateli a potvrzení
  // ====================================================================
  ORDER_STATUS_ODESLANA: 'order_status_odeslana',
  ORDER_STATUS_CEKA_POTVRZENI: 'order_status_ceka_potvrzeni',
  ORDER_STATUS_POTVRZENA: 'order_status_potvrzena',

  // ====================================================================
  // FÁZE 5: Registr smluv (NOVÉ)
  // ====================================================================
  ORDER_STATUS_REGISTR_CEKA: 'order_status_registr_ceka',
  ORDER_STATUS_REGISTR_ZVEREJNENA: 'order_status_registr_zverejnena',

  // ====================================================================
  // FÁZE 6: Fakturace (NOVÉ)
  // ====================================================================
  ORDER_STATUS_FAKTURA_CEKA: 'order_status_faktura_ceka',
  ORDER_STATUS_FAKTURA_PRIDANA: 'order_status_faktura_pridana',
  ORDER_STATUS_FAKTURA_SCHVALENA: 'order_status_faktura_schvalena',
  ORDER_STATUS_FAKTURA_UHRAZENA: 'order_status_faktura_uhrazena',

  // ====================================================================
  // FÁZE 7: Věcná správnost (NOVÉ)
  // ====================================================================
  ORDER_STATUS_KONTROLA_CEKA: 'order_status_kontrola_ceka', // ⚡ HIGH
  ORDER_STATUS_KONTROLA_POTVRZENA: 'order_status_kontrola_potvrzena',
  ORDER_STATUS_KONTROLA_ZAMITNUTA: 'order_status_kontrola_zamitnuta', // ⚡ HIGH (reklamace)

  // ====================================================================
  // TODO ALARMY (připraveno pro budoucnost)
  // ====================================================================
  ALARM_TODO_NORMAL: 'alarm_todo_normal',
  ALARM_TODO_HIGH: 'alarm_todo_high', // ⚡ URGENT
  ALARM_TODO_EXPIRED: 'alarm_todo_expired', // ⚡ HIGH
  TODO_COMPLETED: 'todo_completed',
  TODO_ASSIGNED: 'todo_assigned',

  // ====================================================================
  // SYSTÉMOVÉ NOTIFIKACE (připraveno pro budoucnost)
  // ====================================================================
  SYSTEM_MAINTENANCE_SCHEDULED: 'system_maintenance_scheduled', // ⚡ HIGH
  SYSTEM_MAINTENANCE_STARTING: 'system_maintenance_starting', // ⚡ URGENT
  SYSTEM_MAINTENANCE_FINISHED: 'system_maintenance_finished',
  SYSTEM_BACKUP_COMPLETED: 'system_backup_completed',
  SYSTEM_UPDATE_AVAILABLE: 'system_update_available',
  SYSTEM_UPDATE_INSTALLED: 'system_update_installed',
  SYSTEM_SECURITY_ALERT: 'system_security_alert', // ⚡ URGENT
  SYSTEM_USER_LOGIN_ALERT: 'system_user_login_alert', // ⚡ HIGH
  SYSTEM_SESSION_EXPIRED: 'system_session_expired',
  SYSTEM_STORAGE_WARNING: 'system_storage_warning', // ⚡ HIGH

  // ====================================================================
  // OSTATNÍ NOTIFIKACE
  // ====================================================================
  USER_MENTION: 'user_mention',
  DEADLINE_REMINDER: 'deadline_reminder', // ⚡ HIGH
  ORDER_UNLOCK_FORCED: 'order_unlock_forced', // ⚡ HIGH

  // ====================================================================
  // DEPRECATED (pro zpětnou kompatibilitu)
  // ====================================================================
  ORDER_APPROVED: 'order_approved', // ❌ DEPRECATED → použij ORDER_STATUS_SCHVALENA
  ORDER_REJECTED: 'order_rejected', // ❌ DEPRECATED → použij ORDER_STATUS_ZAMITNUTA
  ORDER_CREATED: 'order_created'    // ❌ DEPRECATED → použij ORDER_STATUS_KE_SCHVALENI
};

/**
 * Helper pro získání lidsky čitelného názvu typu notifikace
 *
 * @param {string} type - Typ notifikace (z NOTIFICATION_TYPES)
 * @returns {string} Lidsky čitelný název
 */
export const getNotificationTypeName = (type) => {
  const names = {
    // FÁZE 1-2
    'order_status_nova': 'Nová objednávka',
    'order_status_rozpracovana': 'Rozpracovaná objednávka',
    'order_status_ke_schvaleni': 'Objednávka ke schválení',
    'order_status_schvalena': 'Objednávka schválena',
    'order_status_zamitnuta': 'Objednávka zamítnuta',
    'order_status_ceka_se': 'Vrácena k doplnění',

    // FÁZE 3-4
    'order_status_odeslana': 'Odeslána dodavateli',
    'order_status_ceka_potvrzeni': 'Čeká na potvrzení',
    'order_status_potvrzena': 'Potvrzena dodavatelem',

    // FÁZE 5
    'order_status_registr_ceka': 'Čeká na registr smluv',
    'order_status_registr_zverejnena': 'Zveřejněna v registru',

    // FÁZE 6
    'order_status_faktura_ceka': 'Čeká na fakturu',
    'order_status_faktura_pridana': 'Faktura přidána',
    'order_status_faktura_schvalena': 'Faktura schválena',
    'order_status_faktura_uhrazena': 'Faktura uhrazena',

    // FÁZE 7
    'order_status_kontrola_ceka': 'Čeká na kontrolu věcné správnosti',
    'order_status_kontrola_potvrzena': 'Věcná správnost potvrzena',
    'order_status_kontrola_zamitnuta': 'Věcná správnost zamítnuta (reklamace)',

    // TODO
    'alarm_todo_normal': 'TODO - Připomínka',
    'alarm_todo_high': 'TODO - URGENTNÍ',
    'alarm_todo_expired': 'TODO - Prošlý termín',
    'todo_completed': 'TODO dokončeno',
    'todo_assigned': 'TODO přiřazeno',

    // SYSTÉMOVÉ
    'system_maintenance_scheduled': 'Plánovaná údržba',
    'system_maintenance_starting': 'Údržba začíná',
    'system_maintenance_finished': 'Údržba dokončena',
    'system_backup_completed': 'Záloha dokončena',
    'system_update_available': 'Dostupná aktualizace',
    'system_update_installed': 'Systém aktualizován',
    'system_security_alert': 'Bezpečnostní upozornění',
    'system_user_login_alert': 'Neobvyklé přihlášení',
    'system_session_expired': 'Relace vypršela',
    'system_storage_warning': 'Málo místa na disku',

    // OSTATNÍ
    'user_mention': 'Zmínka v komentáři',
    'deadline_reminder': 'Připomínka termínu',
    'order_unlock_forced': 'Objednávka násilně odemknuta',

    // DEPRECATED
    'order_approved': 'Objednávka schválena (deprecated)',
    'order_rejected': 'Objednávka zamítnuta (deprecated)',
    'order_created': 'Nová objednávka (deprecated)'
  };

  return names[type] || type;
};

/**
 * Helper pro získání ikony podle typu notifikace
 *
 * @param {string} type - Typ notifikace
 * @returns {string} Emoji ikona
 */
export const getNotificationIcon = (type) => {
  const icons = {
    // FÁZE 1-2
    'order_status_nova': '📝',
    'order_status_rozpracovana': '✏️',
    'order_status_ke_schvaleni': '⏫',
    'order_status_schvalena': '✅',
    'order_status_zamitnuta': '❌',
    'order_status_ceka_se': '⏸️',

    // FÁZE 3-4
    'order_status_odeslana': '📤',
    'order_status_ceka_potvrzeni': '⏳',
    'order_status_potvrzena': '✔️',

    // FÁZE 5
    'order_status_registr_ceka': '📋',
    'order_status_registr_zverejnena': '📢',

    // FÁZE 6
    'order_status_faktura_ceka': '💰',
    'order_status_faktura_pridana': '📄',
    'order_status_faktura_schvalena': '✅',
    'order_status_faktura_uhrazena': '💵',

    // FÁZE 7
    'order_status_kontrola_ceka': '🔍',
    'order_status_kontrola_potvrzena': '✔️',
    'order_status_kontrola_zamitnuta': '⚠️',

    // TODO
    'alarm_todo_normal': '🔔',
    'alarm_todo_high': '⚡',
    'alarm_todo_expired': '🚨',
    'todo_completed': '✅',
    'todo_assigned': '📌',

    // SYSTÉMOVÉ
    'system_maintenance_scheduled': '🛠️',
    'system_maintenance_starting': '⚠️',
    'system_maintenance_finished': '✅',
    'system_backup_completed': '💾',
    'system_update_available': '🔄',
    'system_update_installed': '✅',
    'system_security_alert': '🔐',
    'system_user_login_alert': '🔓',
    'system_session_expired': '⏰',
    'system_storage_warning': '💿',

    // OSTATNÍ
    'user_mention': '💬',
    'deadline_reminder': '⏰',
    'order_unlock_forced': '🔓'
  };

  return icons[type] || '🔔';
};

/**
 * Helper pro získání priority podle typu notifikace
 *
 * @param {string} type - Typ notifikace
 * @returns {string} Priorita (urgent/high/normal/low)
 */
export const getNotificationPriority = (type) => {
  const priorities = {
    // URGENT (nejvyšší priorita)
    'alarm_todo_high': 'urgent',
    'system_maintenance_starting': 'urgent',
    'system_security_alert': 'urgent',

    // HIGH (vysoká priorita)
    'order_status_ke_schvaleni': 'high',
    'order_status_zamitnuta': 'high',
    'order_status_kontrola_ceka': 'high',
    'order_status_kontrola_zamitnuta': 'high',
    'alarm_todo_expired': 'high',
    'system_maintenance_scheduled': 'high',
    'system_user_login_alert': 'high',
    'system_storage_warning': 'high',
    'deadline_reminder': 'high',
    'order_unlock_forced': 'high',

    // NORMAL (normální priorita)
    'order_status_schvalena': 'normal',
    'order_status_odeslana': 'normal',
    'order_status_potvrzena': 'normal',
    'order_status_registr_ceka': 'normal',
    'order_status_registr_zverejnena': 'normal',
    'order_status_faktura_ceka': 'normal',
    'order_status_faktura_pridana': 'normal',
    'order_status_faktura_schvalena': 'normal',
    'order_status_faktura_uhrazena': 'normal',
    'order_status_kontrola_potvrzena': 'normal',
    'alarm_todo_normal': 'normal',
    'todo_assigned': 'normal',
    'system_maintenance_finished': 'normal',
    'system_update_available': 'normal',
    'system_update_installed': 'normal',
    'system_session_expired': 'normal',

    // LOW (nízká priorita)
    'order_status_nova': 'low',
    'order_status_rozpracovana': 'low',
    'todo_completed': 'low',
    'system_backup_completed': 'low',
    'user_mention': 'low'
  };

  return priorities[type] || 'normal';
};

/**
 * Ikona priority
 *
 * @param {string} priority - Priorita (urgent/high/normal/low)
 * @returns {string} Emoji ikona
 */
export const getPriorityIcon = (priority) => {
  const icons = {
    'urgent': '🔴',
    'high': '🟠',
    'normal': '🟢',
    'low': '⚪'
  };

  return icons[priority] || '🟢';
};

export default NOTIFICATION_TYPES;
