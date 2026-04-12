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
  ORDER_STATUS_NOVA: 'ORDER_CREATED',
  ORDER_STATUS_ROZPRACOVANA: 'ORDER_DRAFT',
  ORDER_STATUS_KE_SCHVALENI: 'ORDER_PENDING_APPROVAL', // ⚡ HIGH
  ORDER_STATUS_SCHVALENA: 'ORDER_APPROVED',
  ORDER_STATUS_ZAMITNUTA: 'ORDER_REJECTED', // ⚡ HIGH
  ORDER_STATUS_CEKA_SE: 'ORDER_AWAITING_CHANGES',

  // ====================================================================
  // FÁZE 3-4: Odeslání dodavateli a potvrzení
  // ====================================================================
  ORDER_STATUS_ODESLANA: 'ORDER_SENT_TO_SUPPLIER',
  ORDER_STATUS_CEKA_POTVRZENI: 'ORDER_AWAITING_CONFIRMATION',
  ORDER_STATUS_POTVRZENA: 'ORDER_CONFIRMED_BY_SUPPLIER',

  // ====================================================================
  // FÁZE 5: Registr smluv (NOVÉ)
  // ====================================================================
  ORDER_STATUS_REGISTR_CEKA: 'ORDER_REGISTRY_PENDING',
  ORDER_STATUS_REGISTR_ZVEREJNENA: 'ORDER_REGISTRY_PUBLISHED',

  // ====================================================================
  // FÁZE 6: Fakturace (NOVÉ)
  // ====================================================================
  ORDER_STATUS_FAKTURA_CEKA: 'ORDER_INVOICE_PENDING',
  ORDER_STATUS_FAKTURA_PRIDANA: 'ORDER_INVOICE_ADDED',
  ORDER_STATUS_FAKTURA_SCHVALENA: 'ORDER_INVOICE_APPROVED',
  ORDER_STATUS_FAKTURA_UHRAZENA: 'ORDER_INVOICE_PAID',

  // ====================================================================
  // FÁZE 7: Věcná správnost (NOVÉ)
  // ====================================================================
  ORDER_STATUS_KONTROLA_CEKA: 'INVOICE_MATERIAL_CHECK_REQUESTED', // ⚡ HIGH (faktury)
  ORDER_STATUS_KONTROLA_POTVRZENA: 'INVOICE_MATERIAL_CHECK_APPROVED', // (faktury)
  ORDER_STATUS_KONTROLA_ZAMITNUTA: 'INVOICE_MATERIAL_CHECK_REJECTED', // ⚡ HIGH (reklamace - zatím nepoužito)

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
  // ZASTUPOVÁNÍ
  // ====================================================================
  SUBSTITUTION_SET: 'SUBSTITUTION_SET',       // Zástupci: byl nastaven jako zástupce
  SUBSTITUTION_CREATED: 'SUBSTITUTION_CREATED', // Zastupovanému: byl mu nastaven zástupce
  SUBSTITUTION_ENDED: 'SUBSTITUTION_ENDED',   // Zástupci: zastupování ukončeno

  // ====================================================================
  // OSTATNÍ NOTIFIKACE
  // ====================================================================
  USER_MENTION: 'user_mention',
  DEADLINE_REMINDER: 'deadline_reminder', // ⚡ HIGH
  ORDER_UNLOCK_FORCED: 'order_unlock_forced', // ⚡ HIGH
  ADMIN_MESSAGE: 'ADMIN_MESSAGE' // Rychlá zpráva od administrátora
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
    'ORDER_CREATED': 'Nová objednávka',
    'ORDER_DRAFT': 'Rozpracovaná objednávka',
    'ORDER_PENDING_APPROVAL': 'Objednávka ke schválení',
    'ORDER_APPROVED': 'Objednávka schválena',
    'ORDER_REJECTED': 'Objednávka zamítnuta',
    'ORDER_AWAITING_CHANGES': 'Vrácena k doplnění',

    // FÁZE 3-4
    'ORDER_SENT_TO_SUPPLIER': 'Odeslána dodavateli',
    'ORDER_AWAITING_CONFIRMATION': 'Čeká na potvrzení',
    'ORDER_CONFIRMED_BY_SUPPLIER': 'Potvrzena dodavatelem',

    // FÁZE 5
    'ORDER_REGISTRY_PENDING': 'Čeká na registr smluv',
    'ORDER_REGISTRY_PUBLISHED': 'Zveřejněna v registru',

    // FÁZE 6
    'ORDER_INVOICE_PENDING': 'Čeká na fakturu',
    'ORDER_INVOICE_ADDED': 'Faktura přidána',
    'ORDER_INVOICE_APPROVED': 'Faktura schválena',
    'ORDER_INVOICE_PAID': 'Faktura uhrazena',

    // FÁZE 7
    'INVOICE_MATERIAL_CHECK_REQUESTED': 'Čeká na kontrolu věcné správnosti faktury',
    'INVOICE_MATERIAL_CHECK_APPROVED': 'Věcná správnost faktury potvrzena',
    'INVOICE_MATERIAL_CHECK_REJECTED': 'Věcná správnost zamítnuta (reklamace)',

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

    // ZASTUPOVÁNÍ
    'SUBSTITUTION_SET': 'Nastaven jako zástupce',
    'SUBSTITUTION_CREATED': 'Zástupce nastaven',
    'SUBSTITUTION_ENDED': 'Zastupování ukončeno',

    // OSTATNÍ
    'user_mention': 'Zmínka v komentáři',
    'deadline_reminder': 'Připomínka termínu',
    'order_unlock_forced': 'Objednávka násilně odemknuta',
    'ADMIN_MESSAGE': 'Zpráva od administrátora',

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
    'ORDER_CREATED': '📝',
    'ORDER_DRAFT': '✏️',
    'ORDER_PENDING_APPROVAL': '⏫',
    'ORDER_APPROVED': '✅',
    'ORDER_REJECTED': '❌',
    'ORDER_AWAITING_CHANGES': '⏸️',

    // FÁZE 3-4
    'ORDER_SENT_TO_SUPPLIER': '📤',
    'ORDER_AWAITING_CONFIRMATION': '⏳',
    'ORDER_CONFIRMED_BY_SUPPLIER': '✔️',

    // FÁZE 5
    'ORDER_REGISTRY_PENDING': '📋',
    'ORDER_REGISTRY_PUBLISHED': '📢',

    // FÁZE 6
    'ORDER_INVOICE_PENDING': '💰',
    'ORDER_INVOICE_ADDED': '📄',
    'ORDER_INVOICE_APPROVED': '✅',
    'ORDER_INVOICE_PAID': '💵',

    // FÁZE 7
    'INVOICE_MATERIAL_CHECK_REQUESTED': '🔍',
    'INVOICE_MATERIAL_CHECK_APPROVED': '✔️',
    'INVOICE_MATERIAL_CHECK_REJECTED': '⚠️',

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

    // ZASTUPOVÁNÍ
    'SUBSTITUTION_SET': '👥',
    'SUBSTITUTION_CREATED': '👥',
    'SUBSTITUTION_ENDED': '👤',

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
    'ORDER_PENDING_APPROVAL': 'high',
    'ORDER_REJECTED': 'high',
    'INVOICE_MATERIAL_CHECK_REQUESTED': 'high',
    'INVOICE_MATERIAL_CHECK_REJECTED': 'high',
    'alarm_todo_expired': 'high',
    'system_maintenance_scheduled': 'high',
    'system_user_login_alert': 'high',
    'system_storage_warning': 'high',
    'deadline_reminder': 'high',
    'order_unlock_forced': 'high',

    // NORMAL (normální priorita)
    'ORDER_APPROVED': 'normal',
    'ORDER_SENT_TO_SUPPLIER': 'normal',
    'ORDER_CONFIRMED_BY_SUPPLIER': 'normal',
    'ORDER_REGISTRY_PENDING': 'normal',
    'ORDER_REGISTRY_PUBLISHED': 'normal',
    'ORDER_INVOICE_PENDING': 'normal',
    'ORDER_INVOICE_ADDED': 'normal',
    'ORDER_INVOICE_APPROVED': 'normal',
    'ORDER_INVOICE_PAID': 'normal',
    'INVOICE_MATERIAL_CHECK_APPROVED': 'normal',
    'alarm_todo_normal': 'normal',
    'todo_assigned': 'normal',
    'system_maintenance_finished': 'normal',
    'system_update_available': 'normal',
    'system_update_installed': 'normal',
    'system_session_expired': 'normal',

    // ZASTUPOVÁNÍ
    'SUBSTITUTION_SET': 'normal',
    'SUBSTITUTION_CREATED': 'normal',
    'SUBSTITUTION_ENDED': 'normal',

    // LOW (nízká priorita)
    'ORDER_CREATED': 'low',
    'ORDER_DRAFT': 'low',
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
