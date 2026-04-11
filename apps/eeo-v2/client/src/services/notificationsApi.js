/**
 * Notifications API Service
 *
 * Backend endpoint: /api.eeo/notifications/*
 * Autentifikace: JWT token + username
 *
 * Endpointy:
 * - POST /notifications/list - Seznam notifikací
 * - POST /notifications/unread-count - Počet nepřečtených
 * - POST /notifications/mark-read - Označit jako přečtené
 * - POST /notifications/mark-all-read - Označit vše jako přečtené
 * - POST /notifications/dismiss - Skrýt notifikaci
 * - POST /notifications/create - Vytvořit notifikaci
 *
 * Typy notifikací (z DB - tabulka 25_notification_templates):
 * STAVY OBJEDNÁVEK:
 * - order_status_nova - Objednávka vytvořena
 * - order_status_ke_schvaleni - Objednávka odeslána ke schválení
 * - order_status_schvalena - Objednávka schválena
 * - order_status_zamitnuta - Objednávka zamítnuta
 * - order_status_ceka_se - Objednávka čeká
 * - order_status_odeslana - Objednávka odeslána dodavateli
 * - order_status_potvrzena - Objednávka potvrzena dodavatelem
 * - order_status_dokoncena - Objednávka dokončena
 * - order_status_zrusena - Objednávka zrušena
 * - order_status_ceka_potvrzeni - Čeká na potvrzení dodavatele
 * - order_status_smazana - Objednávka smazána
 * - order_status_rozpracovana - Objednávka rozpracována
 * - order_status_uverejnit - Má být zveřejněna (NOVÉ 2025-11-04)
 * - order_status_uverejnena - Byla zveřejněna (NOVÉ 2025-11-04)
 * - order_status_neuverejnit - Nebude zveřejňovat (NOVÉ 2025-11-04)
 * - order_status_fakturace - Fáze fakturace (NOVÉ 2025-11-04)
 * - order_status_vecna_spravnost - Kontrola věcné správnosti (NOVÉ 2025-11-04)
 * - order_status_zkontrolovana - Zkontrolována (NOVÉ 2025-11-04)
 *
 * OBECNÉ:
 * - system_maintenance - Systémová údržba
 * - user_mention - Zmínka v komentáři
 * - deadline_reminder - Upozornění na termín
 */

import axios from 'axios';
import { loadAuthData } from '../utils/authStorage';

// =============================================================================
// KONSTANTY - Typy notifikací z DB (tabulka 25_notification_templates)
// =============================================================================

export const NOTIFICATION_TYPES = {
  // STAVY OBJEDNÁVEK (NOVÉ - podle DB)
  ORDER_STATUS_NOVA: 'ORDER_CREATED',
  ORDER_STATUS_KE_SCHVALENI: 'ORDER_PENDING_APPROVAL',
  ORDER_STATUS_SCHVALENA: 'ORDER_APPROVED',
  ORDER_STATUS_ZAMITNUTA: 'ORDER_REJECTED',
  ORDER_STATUS_CEKA_SE: 'ORDER_AWAITING_CHANGES',
  ORDER_STATUS_ODESLANA: 'ORDER_SENT_TO_SUPPLIER',
  ORDER_STATUS_POTVRZENA: 'ORDER_CONFIRMED_BY_SUPPLIER',
  ORDER_STATUS_DOKONCENA: 'ORDER_COMPLETED',
  ORDER_STATUS_ZRUSENA: 'ORDER_CANCELLED',
  ORDER_STATUS_CEKA_POTVRZENI: 'ORDER_AWAITING_CONFIRMATION',
  ORDER_STATUS_SMAZANA: 'ORDER_DELETED',
  ORDER_STATUS_ROZPRACOVANA: 'ORDER_DRAFT',

  // REGISTR SMLUV + FINALIZACE (NOVÉ - 2025-11-04)
  // Používáme existující názvy z DB (25_notification_templates)
  ORDER_STATUS_UVEREJNIT: 'ORDER_REGISTRY_PENDING',        // Má být zveřejněna (DB: id 13)
  ORDER_STATUS_UVEREJNENA: 'ORDER_REGISTRY_PUBLISHED', // Byla zveřejněna (DB: id 14)
  ORDER_STATUS_NEUVEREJNIT: 'order_status_neuverejnit',       // Nebude zveřejňovat (TODO: přidat do DB)
  ORDER_STATUS_FAKTURACE: 'order_status_faktura_prirazena',   // Fáze fakturace (DB: id 60)
  ORDER_STATUS_VECNA_SPRAVNOST: 'order_status_zkontrolovana', // Kontrola věcné správnosti (TODO: ověřit)
  ORDER_STATUS_ZKONTROLOVANA: 'INVOICE_MATERIAL_CHECK_REQUESTED',   // Faktura - čeká na kontrolu věcné správnosti (DB: id 17)

  // OBECNÉ
  SYSTEM_MAINTENANCE: 'system_maintenance',
  USER_MENTION: 'user_mention',
  DEADLINE_REMINDER: 'deadline_reminder',

  // TODO ALARMY (NOVÉ - podle BE API dokumentace)
  TODO_ALARM: 'alarm_todo_normal',        // Běžná připomínka TODO
  TODO_ALARM_HIGH: 'alarm_todo_high',     // URGENTNÍ - vyžaduje pozornost
  TODO_ALARM_EXPIRED: 'alarm_todo_expired', // Prošlý termín úkolu

  // FORCE UNLOCK (Násilné převzetí objednávky)
  ORDER_UNLOCK_FORCED: 'order_unlock_forced', // Notifikace pro uživatele, kterému byla objednávka násilně odebrána

  // FAKTURY - VĚCNÁ SPRÁVNOST (NOVÉ 2026-01-11)
  INVOICE_MATERIAL_CHECK_REQUESTED: 'INVOICE_MATERIAL_CHECK_REQUESTED', // Faktura vyžaduje kontrolu věcné správnosti (DB: id 17)
  INVOICE_MATERIAL_CHECK_APPROVED: 'INVOICE_MATERIAL_CHECK_APPROVED',   // Věcná správnost faktury potvrzena (DB: id 19)

  // SYSTÉMOVÉ NOTIFIKACE (NOVÉ z DB)
  SYSTEM_MAINTENANCE_SCHEDULED: 'system_maintenance_scheduled',
  SYSTEM_MAINTENANCE_STARTING: 'system_maintenance_starting',
  SYSTEM_MAINTENANCE_FINISHED: 'system_maintenance_finished',
  SYSTEM_BACKUP_STARTED: 'system_backup_started',
  SYSTEM_BACKUP_COMPLETED: 'system_backup_completed',
  SYSTEM_DATABASE_BACKUP: 'system_database_backup',
  SYSTEM_UPDATE_AVAILABLE: 'system_update_available',
  SYSTEM_UPDATE_INSTALLED: 'system_update_installed',
  SYSTEM_SECURITY_ALERT: 'system_security_alert',
  SYSTEM_USER_LOGIN_ALERT: 'system_user_login_alert',
  SYSTEM_SESSION_EXPIRED: 'system_session_expired',
  SYSTEM_STORAGE_WARNING: 'system_storage_warning'
};

// Konfigurace pro jednotlivé typy notifikací (ikony, barvy, kategorie)
export const NOTIFICATION_CONFIG = {
  // STAVY OBJEDNÁVEK (NOVÉ) - ikony nastaveny na null pro použití FontAwesome ikon z iconMapping.js
  [NOTIFICATION_TYPES.ORDER_STATUS_NOVA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#64748b',
    category: 'orders',
    label: 'Objednávka vytvořena',
    priority: 'low'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_KE_SCHVALENI]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#3b82f6',
    category: 'orders',
    label: 'Objednávka ke schválení',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_SCHVALENA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#16a34a',
    category: 'orders',
    label: 'Objednávka schválena',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_ZAMITNUTA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#dc2626',
    category: 'orders',
    label: 'Objednávka zamítnuta',
    priority: 'high'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_CEKA_SE]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#f59e0b',
    category: 'orders',
    label: 'Objednávka čeká',
    priority: 'low'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_ODESLANA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#3b82f6',
    category: 'orders',
    label: 'Objednávka odeslána',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_POTVRZENA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#16a34a',
    category: 'orders',
    label: 'Objednávka potvrzena',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_DOKONCENA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#059669',
    category: 'orders',
    label: 'Objednávka dokončena',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_ZRUSENA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#dc2626',
    category: 'orders',
    label: 'Objednávka zrušena',
    priority: 'high'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_CEKA_POTVRZENI]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#f59e0b',
    category: 'orders',
    label: 'Čeká na potvrzení',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_SMAZANA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#991b1b',
    category: 'orders',
    label: 'Objednávka smazána',
    priority: 'high'
  },
  [NOTIFICATION_TYPES.ORDER_STATUS_ROZPRACOVANA]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#6366f1',
    category: 'orders',
    label: 'Objednávka rozpracována',
    priority: 'low'
  },

  // OBECNÉ SYSTÉMOVÉ
  [NOTIFICATION_TYPES.SYSTEM_MAINTENANCE]: {
    icon: '🔧',
    color: '#f59e0b',
    category: 'system',
    label: 'Systémová údržba'
  },
  [NOTIFICATION_TYPES.USER_MENTION]: {
    icon: '👤',
    color: '#8b5cf6',
    category: 'mentions',
    label: 'Zmínka v komentáři'
  },
  [NOTIFICATION_TYPES.DEADLINE_REMINDER]: {
    icon: '⏰',
    color: '#ea580c',
    category: 'reminders',
    label: 'Upozornění na termín'
  },

  // TODO ALARMY (NOVÉ - podle BE API dokumentace)
  [NOTIFICATION_TYPES.TODO_ALARM]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#f97316', // Oranžová barva pro TODO alarmy
    category: 'todo',
    label: 'Připomínka úkolu', // Normální připomínka
    priority: 'normal',
    gradient: 'linear-gradient(135deg, #fb923c, #f97316, #ea580c)', // Oranžový gradient
    borderColor: '#fb923c',
    shadowColor: 'rgba(249, 115, 22, 0.3)'
  },
  [NOTIFICATION_TYPES.TODO_ALARM_HIGH]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#dc2626', // Červená barva pro vysokou prioritu
    category: 'todo',
    label: '⚠️ URGENTNÍ úkol', // Vysoká priorita - vyžaduje akci
    priority: 'high',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626, #b91c1c)', // Červený gradient
    borderColor: '#ef4444',
    shadowColor: 'rgba(220, 38, 38, 0.4)',
    pulseAnimation: true // Přidat pulzující animaci
  },
  [NOTIFICATION_TYPES.TODO_ALARM_EXPIRED]: {
    icon: null, // 🎯 Použije se FontAwesome ikona z getNotificationIcon()
    color: '#991b1b', // Tmavě červená pro prošlý termín
    category: 'todo',
    label: '⏱️ Prošlý termín', // Prošlý termín úkolu
    priority: 'high',
    gradient: 'linear-gradient(135deg, #dc2626, #991b1b, #7f1d1d)', // Tmavě červený gradient
    borderColor: '#dc2626',
    shadowColor: 'rgba(153, 27, 27, 0.5)',
    pulseAnimation: true // Důležité upozornění
  },

  // FORCE UNLOCK (Násilné převzetí objednávky)
  [NOTIFICATION_TYPES.ORDER_UNLOCK_FORCED]: {
    icon: '⚠️',
    color: '#dc2626', // Červená barva - varování!
    category: 'order',
    label: 'NÁSILNÉ PŘEVZETÍ', // Důrazné označení
    priority: 'urgent',
    gradient: 'linear-gradient(135deg, #fca5a5, #ef4444, #dc2626)', // Červený gradient
    borderColor: '#ef4444',
    shadowColor: 'rgba(239, 68, 68, 0.4)',
    pulseAnimation: true // Přidat pulzující animaci - důležité varování
  },

  // SYSTÉMOVÉ NOTIFIKACE (NOVÉ)
  [NOTIFICATION_TYPES.SYSTEM_MAINTENANCE_SCHEDULED]: {
    icon: '📅',
    color: '#f59e0b',
    category: 'system',
    label: 'Plánovaná údržba systému',
    priority: 'high'
  },
  [NOTIFICATION_TYPES.SYSTEM_MAINTENANCE_STARTING]: {
    icon: '🔧',
    color: '#dc2626',
    category: 'system',
    label: 'Údržba systému začíná',
    priority: 'urgent'
  },
  [NOTIFICATION_TYPES.SYSTEM_MAINTENANCE_FINISHED]: {
    icon: '✅',
    color: '#16a34a',
    category: 'system',
    label: 'Údržba systému dokončena',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.SYSTEM_BACKUP_STARTED]: {
    icon: '💾',
    color: '#3b82f6',
    category: 'system',
    label: 'Zálohování systému',
    priority: 'low'
  },
  [NOTIFICATION_TYPES.SYSTEM_BACKUP_COMPLETED]: {
    icon: '✔️',
    color: '#16a34a',
    category: 'system',
    label: 'Zálohování dokončeno',
    priority: 'low'
  },
  [NOTIFICATION_TYPES.SYSTEM_DATABASE_BACKUP]: {
    icon: '🗄️',
    color: '#3b82f6',
    category: 'system',
    label: 'Záloha databáze',
    priority: 'low'
  },
  [NOTIFICATION_TYPES.SYSTEM_UPDATE_AVAILABLE]: {
    icon: '🆕',
    color: '#8b5cf6',
    category: 'system',
    label: 'Dostupná aktualizace systému',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.SYSTEM_UPDATE_INSTALLED]: {
    icon: '🎉',
    color: '#16a34a',
    category: 'system',
    label: 'Systém byl aktualizován',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.SYSTEM_SECURITY_ALERT]: {
    icon: '🚨',
    color: '#dc2626',
    category: 'system',
    label: 'Bezpečnostní upozornění',
    priority: 'urgent'
  },
  [NOTIFICATION_TYPES.SYSTEM_USER_LOGIN_ALERT]: {
    icon: '🔐',
    color: '#ea580c',
    category: 'system',
    label: 'Neobvyklé přihlášení',
    priority: 'high'
  },
  [NOTIFICATION_TYPES.SYSTEM_SESSION_EXPIRED]: {
    icon: '⏱️',
    color: '#64748b',
    category: 'system',
    label: 'Relace vypršela',
    priority: 'normal'
  },
  [NOTIFICATION_TYPES.SYSTEM_STORAGE_WARNING]: {
    icon: '💿',
    color: '#ea580c',
    category: 'system',
    label: 'Upozornění na místo na disku',
    priority: 'high'
  },

  // ADMIN ZPRÁVY
  [NOTIFICATION_TYPES.ADMIN_MESSAGE]: {
    icon: '📨',
    color: '#3b82f6',
    category: 'system',
    label: 'Zpráva od administrátora',
    priority: 'normal',
    gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)',
    borderColor: '#60a5fa',
    shadowColor: 'rgba(59, 130, 246, 0.3)'
  }
};

// Priority (z DB)
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Kategorie (odvozené z typů)
export const NOTIFICATION_CATEGORY = {
  ORDERS: 'orders',
  SYSTEM: 'system',
  MENTIONS: 'mentions',
  REMINDERS: 'reminders'
};

// =============================================================================
// API CLIENT
// =============================================================================

const notificationsApi = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo',
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Získání auth dat z šifrovaného storage
 */
const getAuthData = async () => {
  try {
    const token = await loadAuthData.token();
    const user = await loadAuthData.user();

    if (!token || !user?.username) {
      console.error('❌ [getAuthData] CHYBA: Chybí token nebo username!');
      console.error('   token exists:', !!token);
      console.error('   user exists:', !!user);
      console.error('   user.username:', user?.username);
      throw new Error('Missing authentication data');
    }

    const authData = {
      token,
      username: user.username,
      from_user_id: user.id,
      from_user_name: user.fullName || `${user.jmeno || ''} ${user.prijmeni || ''}`.trim() || user.username
    };

    return authData;
  } catch (error) {
    console.error('❌ [getAuthData] EXCEPTION:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    throw new Error('Missing authentication data');
  }
};

/**
 * Error handler pro API response
 */
const handleApiResponse = (response) => {
  if (response.data.err) {
    throw new Error(response.data.err);
  }

  if (response.data.status !== 'ok') {
    throw new Error('API returned non-ok status');
  }

  return response.data;
};

/**
 * Seznam notifikací
 * @param {Object} options - Parametry filtru
 * @param {number} options.limit - Limit počtu (default: 20)
 * @param {number} options.offset - Offset pro stránkování (default: 0)
 * @param {boolean} options.unread_only - Pouze nepřečtené (default: false)
 * @param {string} options.category - Kategorie (orders, system, atd.)
 * @returns {Promise<Object>} - { data: [], total, limit, offset }
 */
export const getNotificationsList = async (options = {}) => {
  try {
    const auth = await getAuthData();

    const payload = {
      ...auth,
      limit: options.limit || 20,
      offset: options.offset || 0,
      unread_only: options.unread_only || false,
      include_dismissed: options.include_dismissed || false,
      category: options.category || null
    };

    const response = await notificationsApi.post('/notifications/list', payload);
    const result = handleApiResponse(response);

    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * Počet nepřečtených notifikací s informací o barvě badge
 * @returns {Promise<Object>} - {unread_count: number, badge_color: string, priority_info?: array}
 */
export const getUnreadCount = async () => {
  try {
    const auth = await getAuthData();

    const response = await notificationsApi.post('/notifications/unread-count', auth);
    const result = handleApiResponse(response);

    // Vrátíme celý objekt s informacemi o barvě badge
    return {
      unread_count: result.unread_count || 0,
      badge_color: result.badge_color || 'gray',
      priority_info: result.priority_info || []
    };

  } catch (error) {

    // Pokud endpoint neexistuje (404) nebo má jinou chybu, vrať default hodnoty
    if (error.response?.status === 404) {
      return { unread_count: 0, badge_color: 'gray', priority_info: [] };
    }

    // Pro ostatní chyby také vrať 0 místo throwování
    return 0;
  }
};

/**
 * Označení notifikace jako přečtené
 * @param {number} notificationId - ID notifikace
 * @returns {Promise<Object>} - Response message
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const auth = await getAuthData();

    const payload = {
      ...auth,
      notifikace_id: notificationId
    };
    const response = await notificationsApi.post('/notifications/mark-read', payload);
    const result = handleApiResponse(response);
    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * Označení všech notifikací jako přečtené
 * @returns {Promise<Object>} - { message, marked_count }
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const auth = await getAuthData();
    const response = await notificationsApi.post('/notifications/mark-all-read', auth);
    const result = handleApiResponse(response);
    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * Skrytí notifikace (dismiss)
 * @param {number} notificationId - ID notifikace
 * @returns {Promise<Object>} - Response message
 */
export const dismissNotification = async (notificationId) => {
  try {
    const auth = await getAuthData();

    const payload = {
      ...auth,
      notifikace_id: notificationId
    };
    const response = await notificationsApi.post('/notifications/dismiss', payload);
    const result = handleApiResponse(response);
    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * Skrýt všechny notifikace v dropdownu (dismiss all)
 * @returns {Promise<Object>} - Response message with hidden_count
 */
export const dismissAllNotifications = async () => {
  try {
    const auth = await getAuthData();

    const response = await notificationsApi.post('/notifications/dismiss-all', auth);
    const result = handleApiResponse(response);

    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * Obnovit skrytou notifikaci (un-dismiss / restore)
 * @param {number} notificationId - ID notifikace
 * @returns {Promise<Object>} - Response message
 */
export const restoreNotification = async (notificationId) => {
  try {
    const auth = await getAuthData();

    const payload = {
      ...auth,
      notifikace_id: notificationId
    };
    const response = await notificationsApi.post('/notifications/restore', payload);
    const result = handleApiResponse(response);
    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * Smazat notifikaci z databáze (delete)
 * @param {number} notificationId - ID notifikace
 * @returns {Promise<Object>} - Response message
 */
export const deleteNotification = async (notificationId) => {
  try {
    const auth = await getAuthData();

    const payload = {
      ...auth,
      notifikace_id: notificationId
    };
    const response = await notificationsApi.post('/notifications/delete', payload);
    const result = handleApiResponse(response);
    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * Smazat všechny notifikace z databáze (delete all)
 * @returns {Promise<Object>} - Response message with deleted_count
 */
export const deleteAllNotifications = async () => {
  try {
    const auth = await getAuthData();

    const payload = {
      ...auth,
      confirm: true
    };

    const response = await notificationsApi.post('/notifications/delete-all', payload);
    const result = handleApiResponse(response);

    return result;

  } catch (error) {
    throw error;
  }
};

// =============================================================================
// DEPRECATED - localStorage funkce (ponecháno pro kompatibilitu během migrace)
// TODO: Odstranit po úplné migraci na backend API
// =============================================================================

/**
 * @deprecated Použij dismissNotification() - backend API
 * Skrytí notifikace v dropdownu (pouze lokálně v localStorage)
 * Notifikace zůstane v DB a na stránce /notifications
 * @param {number} notificationId - ID uživatele
 * @param {number} userId - ID uživatele
 */
export const hideNotificationInDropdown = (notificationId, userId) => {
  try {
    const key = `hidden_notifications_${userId}`;
    const hidden = JSON.parse(localStorage.getItem(key) || '[]');

    if (!hidden.includes(notificationId)) {
      hidden.push(notificationId);
      localStorage.setItem(key, JSON.stringify(hidden));
    }
  } catch (error) {
  }
};

/**
 * @deprecated Použij dismissAllNotifications() - backend API
 * Skrytí všech notifikací v dropdownu (pouze lokálně)
 * @param {Array} notificationIds - Pole ID notifikací
 * @param {number} userId - ID uživatele
 */
export const hideAllNotificationsInDropdown = (notificationIds, userId) => {
  try {
    const key = `hidden_notifications_${userId}`;
    const hidden = JSON.parse(localStorage.getItem(key) || '[]');

    const merged = [...new Set([...hidden, ...notificationIds])];
    localStorage.setItem(key, JSON.stringify(merged));
  } catch (error) {
  }
};

/**
 * @deprecated Backend API nyní filtruje pomocí include_dismissed parametru
 * Získání seznamu skrytých notifikací v dropdownu
 * @param {number} userId - ID uživatele
 * @returns {Array} - Pole ID skrytých notifikací
 */
export const getHiddenNotificationsInDropdown = (userId) => {
  try {
    const key = `hidden_notifications_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (error) {
    return [];
  }
};

/**
 * @deprecated Již není potřeba - backend spravuje dismissed stav
 * Vyčištění seznamu skrytých notifikací (např. při logout)
 * @param {number} userId - ID uživatele
 */
export const clearHiddenNotificationsInDropdown = (userId) => {
  try {
    const key = `hidden_notifications_${userId}`;
    localStorage.removeItem(key);
  } catch (error) {
  }
};

/**
 * Vytvoření nové notifikace
 *
 * @param {Object} notificationData - Data notifikace
 * @param {string} notificationData.type - Typ notifikace (order_approved, atd.)
 * @param {string} notificationData.title - Nadpis notifikace
 * @param {string} notificationData.message - Text zprávy
 * @param {string} notificationData.priority - Priorita (low, normal, high, urgent)
 * @param {string} notificationData.category - Kategorie (orders, system, atd.)
 * @param {string} notificationData.data_json - JSON data (volitelné)
 * @param {boolean} notificationData.send_email - Poslat také email (volitelné)
 *
 * PŘÍJEMCI (použij POUZE JEDEN parametr):
 * @param {number} [notificationData.to_user_id] - ID konkrétního uživatele
 * @param {number[]} [notificationData.to_users] - Array ID uživatelů [1,2,3,5]
 * @param {boolean} [notificationData.to_all_users] - true = pro všechny uživatele
 *
 * VOLITELNÉ:
 * @param {string} [notificationData.related_object_type] - Typ objektu (order, task, atd.)
 * @param {number} [notificationData.related_object_id] - ID objektu
 * @param {Object} [notificationData.data] - Dodatečná data jako object (ne string)
 *
 * @returns {Promise<Object>} - Response s notification_id vytvořené notifikace
 *
 * @example
 * // Notifikace pro konkrétního uživatele
 * await createNotification({
 *   type: 'ORDER_APPROVED',
 *   title: 'Objednávka schválena',
 *   message: 'Objednávka č. 2025-001 byla schválena',
 *   to_user_id: 5,
 *   priority: 'normal',
 *   category: 'orders',
 *   send_email: true
 * });
 *
 * @example
 * // Notifikace pro skupinu uživatelů (GARANT + PŘÍKAZCE)
 * await createNotification({
 *   type: 'ORDER_PENDING_APPROVAL',
 *   title: 'Nová objednávka k schválení',
 *   message: 'Objednávka č. 2025-002 čeká na schválení',
 *   to_users: [3, 5, 8],
 *   priority: 'high',
 *   category: 'orders'
 * });
 *
 * @example
 * // Notifikace pro všechny uživatele (systémová údržba)
 * await createNotification({
 *   type: 'system_maintenance',
 *   title: 'Plánovaná údržba',
 *   message: 'Systém bude nedostupný od 22:00 do 02:00',
 *   to_all_users: true,
 *   priority: 'urgent',
 *   category: 'system'
 * });
 */
export const createNotification = async (notificationData) => {
  try {
    const auth = await getAuthData();

    // ⚠️ MAPPING: Frontend FE používá `type` ale backend BE očekává `typ`
    const mappedData = {
      ...notificationData,
      typ: notificationData.type,  // Mapuj type → typ pro backend
      nadpis: notificationData.title,  // Mapuj title → nadpis
      zprava: notificationData.message,  // Mapuj message → zprava
      pro_uzivatele_id: notificationData.to_user_id,  // Mapuj to_user_id → pro_uzivatele_id
      pro_vsechny: notificationData.to_all_users,  // Mapuj to_all_users → pro_vsechny
      priorita: notificationData.priority,  // 🚨 Mapuj priority → priorita
      kategorie: notificationData.category,  // Mapuj category → kategorie
      odeslat_email: notificationData.send_email,  // Mapuj send_email → odeslat_email
      objekt_typ: notificationData.related_object_type,  // Mapuj related_object_type → objekt_typ
      objekt_id: notificationData.related_object_id  // Mapuj related_object_id → objekt_id
    };

    // Odstraň původní FE názvy, které už byly namapovány
    delete mappedData.type;
    delete mappedData.title;
    delete mappedData.message;
    delete mappedData.to_user_id;
    delete mappedData.to_all_users;
    delete mappedData.priority;  // 🚨 Odstraň FE název
    delete mappedData.category;
    delete mappedData.send_email;
    delete mappedData.related_object_type;
    delete mappedData.related_object_id;

    const payload = {
      ...auth,
      ...mappedData
    };

    const response = await notificationsApi.post('/notifications/create', payload);
    const result = handleApiResponse(response);

    return result;

  } catch (error) {
    console.error('❌ [NotificationsAPI] Chyba při odesílání notifikace:', error);
    throw error;
  }
};

/**
 * 🆕 NOVÝ: Trigger notifikace podle organizational hierarchy
 * Backend automaticky najde příjemce v hierarchii podle event typu
 * 
 * @param {string} eventType - Event type code (order_status_ke_schvaleni, order_status_schvalena, INVOICE_CREATED, ...)
 * @param {number} objectId - ID objektu (objednávka, faktura, ...)
 * @param {number} triggerUserId - ID uživatele, který akci provedl
 * @param {Object} placeholderData - Volitelná placeholder data (backend je načte automaticky z object_id)
 * @returns {Promise<Object>} - Výsledek {status: 'ok', sent: number, errors: array}
 */
export const triggerNotification = async (eventType, objectId, triggerUserId, placeholderData = {}) => {
  try {
    const auth = await getAuthData();

    const payload = {
      ...auth,
      event_type: eventType,
      object_id: objectId,
      trigger_user_id: triggerUserId,
      placeholder_data: placeholderData
    };
    
    const response = await notificationsApi.post('/notifications/trigger', payload);
    const result = handleApiResponse(response);

    return result;

  } catch (error) {
    console.error('Error triggering notification:', error);
    throw error;
  }
};

// =============================================================================
// HELPER FUNKCE PRO BĚŽNÉ USE-CASES
// =============================================================================

/**
 * Poslat notifikaci konkrétnímu uživateli
 * @param {number} userId - ID uživatele
 * @param {string} type - Typ notifikace
 * @param {string} title - Nadpis
 * @param {string} message - Zpráva
 * @param {Object} options - Další parametry (priority, category, send_email, atd.)
 */
export const notifyUser = async (userId, type, title, message, options = {}) => {
  return createNotification({
    type,
    title,
    message,
    to_user_id: userId,
    ...options
  });
};

/**
 * Poslat notifikaci skupině uživatelů
 * @param {number[]} userIds - Array ID uživatelů
 * @param {string} type - Typ notifikace
 * @param {string} title - Nadpis
 * @param {string} message - Zpráva
 * @param {Object} options - Další parametry
 */
export const notifyUsers = async (userIds, type, title, message, options = {}) => {
  return createNotification({
    type,
    title,
    message,
    to_users: userIds,
    ...options
  });
};

/**
 * Poslat notifikaci všem uživatelům (broadcast)
 * @param {string} type - Typ notifikace
 * @param {string} title - Nadpis
 * @param {string} message - Zpráva
 * @param {Object} options - Další parametry
 */
export const notifyAll = async (type, title, message, options = {}) => {
  return createNotification({
    type,
    title,
    message,
    to_all_users: true,
    ...options
  });
};

// =============================================================================
// HELPER FUNKCE PRO STAVY OBJEDNÁVEK
// =============================================================================

/**
 * Notifikace při změně stavu objednávky
 * @param {Object} order - Objednávka
 * @param {string} status - Nový status objednávky
 * @param {Object} extraData - Dodatečná data (approver_name, rejection_reason, atd.)
 */
const notifyOrderStatusChange = async (order, status, extraData = {}) => {
  // Získej jméno přihlášeného uživatele pro creator_name
  const auth = await getAuthData();
  const creatorName = auth.from_user_name || 'Neznámý objednatel';

  const statusConfig = {
    // Ke schválení → GARANT + PŘÍKAZCE
    'ke_schvaleni': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_KE_SCHVALENI,
      recipients: [order.garant_id, order.prikazce_id],
      recipientType: 'approvers'
    },
    // Schválena → VLASTNÍK (tvůrce)
    'schvalena': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_SCHVALENA,
      recipients: [order.creator_id || order.created_by_user_id],
      recipientType: 'owner'
    },
    // Zamítnuta → VLASTNÍK (tvůrce)
    'zamitnuta': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_ZAMITNUTA,
      recipients: [order.creator_id || order.created_by_user_id],
      recipientType: 'owner'
    },
    // Čeká se → VLASTNÍK (tvůrce)
    'ceka_se': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_CEKA_SE,
      recipients: [order.creator_id || order.created_by_user_id],
      recipientType: 'owner'
    },
    // Odeslána → GARANT + PŘÍKAZCE
    'odeslana': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_ODESLANA,
      recipients: [order.garant_id, order.prikazce_id],
      recipientType: 'approvers'
    },
    // Potvrzena → GARANT + PŘÍKAZCE
    'potvrzena': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_POTVRZENA,
      recipients: [order.garant_id, order.prikazce_id],
      recipientType: 'approvers'
    },
    // Rozpracována → GARANT + PŘÍKAZCE
    'rozpracovana': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_ROZPRACOVANA,
      recipients: [order.garant_id, order.prikazce_id],
      recipientType: 'approvers'
    },
    // Dokončena → VLASTNÍK + GARANT + PŘÍKAZCE
    'dokoncena': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_DOKONCENA,
      recipients: [order.creator_id || order.created_by_user_id, order.garant_id, order.prikazce_id],
      recipientType: 'all'
    },
    // Zrušena → VLASTNÍK
    'zrusena': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_ZRUSENA,
      recipients: [order.creator_id || order.created_by_user_id],
      recipientType: 'owner'
    },
    // Čeká na potvrzení → GARANT + PŘÍKAZCE
    'ceka_potvrzeni': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_CEKA_POTVRZENI,
      recipients: [order.garant_id, order.prikazce_id],
      recipientType: 'approvers'
    },
    // Smazána → VLASTNÍK
    'smazana': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_SMAZANA,
      recipients: [order.creator_id || order.created_by_user_id],
      recipientType: 'owner'
    },
    // Má být zveřejněna → OSOBA ODPOVĚDNÁ ZA REGISTR (nebo garant)
    'uverejnit': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_UVEREJNIT,
      recipients: [order.registr_odpovorna_osoba_id || order.garant_id],
      recipientType: 'registry_manager'
    },
    // Byla zveřejněna → GARANT + PŘÍKAZCE
    'uverejnena': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_UVEREJNENA,
      recipients: [order.garant_id, order.prikazce_id],
      recipientType: 'approvers'
    },
    // Nebude zveřejňovat → GARANT
    'neuverejnit': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_NEUVEREJNIT,
      recipients: [order.garant_id],
      recipientType: 'guarantor'
    },
    // Fakturace → EKONOM (nebo garant)
    'fakturace': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_FAKTURACE,
      recipients: [order.ekonom_id || order.garant_id],
      recipientType: 'accountant'
    },
    // Věcná správnost → GARANT (jako kontrolor)
    'vecna_spravnost': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_VECNA_SPRAVNOST,
      recipients: [order.garant_id],
      recipientType: 'guarantor'
    },
    // Zkontrolována → VLASTNÍK + GARANT
    'zkontrolovana': {
      type: NOTIFICATION_TYPES.ORDER_STATUS_ZKONTROLOVANA,
      recipients: [order.creator_id || order.created_by_user_id, order.garant_id],
      recipientType: 'owner_and_guarantor'
    }
  };

  const config = statusConfig[status];
  if (!config) {
    return;
  }

  // Filtruj prázdné IDs
  const recipientIds = config.recipients.filter(Boolean);

  if (recipientIds.length === 0) {
    return;
  }


  // ✅ Získej order_number z různých polí (cislo_objednavky, number, nebo vygeneruj z ID)
  const orderNumber = order.cislo_objednavky || order.number || `O-${order.id}`;

  // ✅ Získej lidsky čitelný stav objednávky
  const orderStatusDisplay = order.stav_objednavky || order.nazev_stavu || order.status_name || status || 'N/A';

  // Použij template z DB (backend doplní placeholders)
  return createNotification({
    type: config.type,
    to_users: recipientIds,
    send_email: true,
    priority: NOTIFICATION_CONFIG[config.type]?.priority || 'normal',
    category: 'orders',
    related_object_type: 'order',
    related_object_id: order.id,
    data: {
      order_number: orderNumber, // ✅ ZAJIŠTĚNO, ŽE ORDER_NUMBER NENÍ PRÁZDNÉ
      order_id: order.id,
      order_subject: order.predmet || order.subject || 'N/A',
      order_status: orderStatusDisplay, // ✅ STAV OBJEDNÁVKY (lidsky čitelný)
      max_price: order.max_cena || order.max_price,
      action_performed_by: creatorName, // ✅ KDO PROVEDL AKCI (schválil, zamítl atd.)
      creator_name: order.creator_name || creatorName, // ✅ JMÉNO TVŮRCE OBJEDNÁVKY
      ...extraData
    }
  });
};

/**
 * 1. Objednávka odeslána ke schválení
 * Příjemci: GARANT + PŘÍKAZCE
 */
export const notifyOrderSubmittedForApproval = async (order) => {
  return notifyOrderStatusChange(order, 'ke_schvaleni');
};

/**
 * 2. Objednávka schválena
 * Příjemce: VLASTNÍK (tvůrce objednávky)
 */
export const notifyOrderApproved = async (order, approverName) => {
  return notifyOrderStatusChange(order, 'schvalena', { approver_name: approverName });
};

/**
 * 3. Objednávka zamítnuta
 * Příjemce: VLASTNÍK (tvůrce objednávky)
 */
export const notifyOrderRejected = async (order, rejectionReason) => {
  return notifyOrderStatusChange(order, 'zamitnuta', { rejection_reason: rejectionReason });
};

/**
 * 4. Objednávka čeká (pozastavena)
 * Příjemce: VLASTNÍK
 */
export const notifyOrderWaiting = async (order, reason = '') => {
  return notifyOrderStatusChange(order, 'ceka_se', { waiting_reason: reason });
};

/**
 * 5. Objednávka odeslána dodavateli
 * Příjemci: GARANT + PŘÍKAZCE
 */
export const notifyOrderSentToSupplier = async (order, supplierName) => {
  return notifyOrderStatusChange(order, 'odeslana', { supplier_name: supplierName });
};

/**
 * 6. Objednávka potvrzena dodavatelem
 * Příjemci: GARANT + PŘÍKAZCE
 */
export const notifyOrderConfirmedBySupplier = async (order, supplierName) => {
  return notifyOrderStatusChange(order, 'potvrzena', { supplier_name: supplierName });
};

/**
 * 7. Objednávka rozpracována
 * Příjemci: GARANT + PŘÍKAZCE
 */
export const notifyOrderInProgress = async (order) => {
  return notifyOrderStatusChange(order, 'rozpracovana');
};

/**
 * 8. Objednávka dokončena
 * Příjemci: VLASTNÍK + GARANT + PŘÍKAZCE (všichni)
 */
export const notifyOrderCompleted = async (order) => {
  return notifyOrderStatusChange(order, 'dokoncena');
};

/**
 * 9. Objednávka zrušena
 * Příjemce: VLASTNÍK
 */
export const notifyOrderCancelled = async (order, cancellationReason) => {
  return notifyOrderStatusChange(order, 'zrusena', { cancellation_reason: cancellationReason });
};

/**
 * 10. Objednávka čeká na potvrzení dodavatele
 * Příjemci: GARANT + PŘÍKAZCE
 */
export const notifyOrderAwaitingConfirmation = async (order, supplierName) => {
  return notifyOrderStatusChange(order, 'ceka_potvrzeni', { supplier_name: supplierName });
};

/**
 * 11. Objednávka smazána
 * Příjemce: VLASTNÍK
 */
export const notifyOrderDeleted = async (order) => {
  return notifyOrderStatusChange(order, 'smazana');
};

/**
 * 12. Objednávka má být zveřejněna
 * Příjemce: OSOBA ODPOVĚDNÁ ZA REGISTR
 */
export const notifyOrderToBePublished = async (order) => {
  return notifyOrderStatusChange(order, 'uverejnit');
};

/**
 * 13. Objednávka byla zveřejněna
 * Příjemci: GARANT + PŘÍKAZCE
 */
export const notifyOrderPublished = async (order, registrIddt = '') => {
  return notifyOrderStatusChange(order, 'uverejnena', { registr_iddt: registrIddt });
};

/**
 * 14. Objednávka nebude zveřejňovat
 * Příjemce: GARANT
 */
export const notifyOrderWillNotBePublished = async (order, reason = '') => {
  return notifyOrderStatusChange(order, 'neuverejnit', { reason });
};

/**
 * 15. Objednávka ve fázi fakturace
 * Příjemce: EKONOM
 */
export const notifyOrderInvoicing = async (order) => {
  return notifyOrderStatusChange(order, 'fakturace');
};

/**
 * 16. Objednávka - kontrola věcné správnosti
 * Příjemce: GARANT
 */
export const notifyOrderMaterialCorrectness = async (order) => {
  return notifyOrderStatusChange(order, 'vecna_spravnost');
};

/**
 * 17. Objednávka zkontrolována
 * Příjemci: VLASTNÍK + GARANT
 */
export const notifyOrderChecked = async (order) => {
  return notifyOrderStatusChange(order, 'zkontrolovana');
};

// =============================================================================
// DEPRECATED FUNKCE (PONECHÁNO PRO KOMPATIBILITU)
// =============================================================================

/**
 * @deprecated Použij notifyOrderSubmittedForApproval
 */
export const notifyOrderApprovers = async (order) => {
  return notifyOrderSubmittedForApproval(order);
};

// =============================================================================
// TODO ALARM NOTIFIKACE - podle BE API dokumentace
// =============================================================================

/**
 * Poslat TODO alarm notifikaci (běžná priorita)
 * @param {number} userId - ID uživatele
 * @param {Object} todoData - Data úkolu
 * @param {string} todoData.todo_title - Název úkolu
 * @param {string} todoData.todo_note - Poznámka
 * @param {string} todoData.alarm_datetime - Datum a čas alarmu (25. 10. 2025 14:30)
 * @param {string} todoData.alarm_date - Datum alarmu (25. 10. 2025)
 * @param {string} todoData.alarm_time - Čas alarmu (14:30)
 * @param {string} todoData.user_name - Jméno uživatele
 * @param {string} todoData.time_remaining - Zbývající čas (5 minut)
 * @param {string} todoData.todo_id - ID úkolu
 */
export const notifyTodoAlarmNormal = async (userId, todoData) => {

  return createNotification({
    type: NOTIFICATION_TYPES.TODO_ALARM,
    to_user_id: userId,
    priority: 'normal',
    category: 'todo',
    send_email: false, // Email je volitelný (podle BE defaultu)
    related_object_type: 'todo',
    related_object_id: todoData.todo_id,
    data: {
      todo_title: todoData.todo_title,
      todo_note: todoData.todo_note || '',
      alarm_datetime: todoData.alarm_datetime,
      alarm_date: todoData.alarm_date,
      alarm_time: todoData.alarm_time,
      user_name: todoData.user_name,
      time_remaining: todoData.time_remaining || '',
      todo_id: String(todoData.todo_id)
    }
  });
};

/**
 * Poslat TODO alarm notifikaci (VYSOKÁ priorita - urgentní)
 * @param {number} userId - ID uživatele
 * @param {Object} todoData - Data úkolu (stejné jako notifyTodoAlarmNormal)
 */
export const notifyTodoAlarmHigh = async (userId, todoData) => {

  return createNotification({
    type: NOTIFICATION_TYPES.TODO_ALARM_HIGH,
    to_user_id: userId,
    priority: 'high',
    category: 'todo',
    send_email: true, // VYSOKÁ priorita → poslat i email
    related_object_type: 'todo',
    related_object_id: todoData.todo_id,
    data: {
      todo_title: todoData.todo_title,
      todo_note: todoData.todo_note || '',
      alarm_datetime: todoData.alarm_datetime,
      alarm_date: todoData.alarm_date,
      alarm_time: todoData.alarm_time,
      user_name: todoData.user_name,
      time_remaining: todoData.time_remaining || '',
      todo_id: String(todoData.todo_id)
    }
  });
};

/**
 * Poslat TODO alarm notifikaci (PROŠLÝ TERMÍN)
 * @param {number} userId - ID uživatele
 * @param {Object} todoData - Data úkolu (stejné jako notifyTodoAlarmNormal)
 */
export const notifyTodoAlarmExpired = async (userId, todoData) => {

  return createNotification({
    type: NOTIFICATION_TYPES.TODO_ALARM_EXPIRED,
    to_user_id: userId,
    priority: 'high',
    category: 'todo',
    send_email: true, // PROŠLÝ termín → poslat i email
    related_object_type: 'todo',
    related_object_id: todoData.todo_id,
    data: {
      todo_title: todoData.todo_title,
      todo_note: todoData.todo_note || '',
      alarm_datetime: todoData.alarm_datetime,
      alarm_date: todoData.alarm_date,
      alarm_time: todoData.alarm_time,
      user_name: todoData.user_name,
      time_remaining: todoData.time_remaining || '',
      todo_id: String(todoData.todo_id)
    }
  });
};

/**
 * Univerzální funkce pro odeslání TODO alarm notifikace
 * Automaticky vybere správný typ podle priority a stavu
 *
 * @param {number} userId - ID uživatele
 * @param {Object} todoData - Data úkolu
 * @param {boolean} isExpired - Je termín prošlý?
 * @param {boolean} isHighPriority - Je vysoká priorita?
 */
export const notifyTodoAlarm = async (userId, todoData, isExpired = false, isHighPriority = false) => {
  if (isExpired) {
    return notifyTodoAlarmExpired(userId, todoData);
  } else if (isHighPriority) {
    return notifyTodoAlarmHigh(userId, todoData);
  } else {
    return notifyTodoAlarmNormal(userId, todoData);
  }
};

// =============================================================================
// ADMIN MESSAGES HELPERS
// =============================================================================

/**
 * 🆕 Získat počet nepřečtených ADMIN_MESSAGE zpráv pro konkrétního uživatele
 * Filtruje pouze zprávy ne starší než 7 dní
 * @param {number} userId - ID uživatele
 * @returns {Promise<number>} - Počet nepřečtených zpráv
 */
export const getAdminMessagesUnreadCount = async (userId) => {
  try {
    const auth = await getAuthData();
    
    const payload = {
      ...auth,
      user_id: userId
    };

    const response = await notificationsApi.post('/notifications/admin-messages-unread-count', payload);
    const result = response.data;
    
    // Backend vrací {status:'success', data:{unread_count:N}}
    if (result?.status === 'success') {
      return result?.data?.unread_count || 0;
    }
    return 0;

  } catch (error) {
    console.error('❌ [NotificationsAPI] Chyba při získávání počtu nepřečtených zpráv:', error);
    return 0;
  }
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  getNotificationsList,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  dismissAllNotifications,
  restoreNotification,
  deleteNotification,
  deleteAllNotifications,
  createNotification,
  trigger: triggerNotification,  // 🆕 NOVÝ: Org-hierarchy-aware notifications
  // Dropdown hide helpers (DEPRECATED - use dismiss/delete APIs)
  hideNotificationInDropdown,
  hideAllNotificationsInDropdown,
  getHiddenNotificationsInDropdown,
  clearHiddenNotificationsInDropdown,
  // Generic helpers
  notifyUser,
  notifyUsers,
  notifyAll,
  // Admin messages
  getAdminMessagesUnreadCount,
  // Order status helpers
  notifyOrderSubmittedForApproval,
  notifyOrderApproved,
  notifyOrderRejected,
  notifyOrderWaiting,
  notifyOrderSentToSupplier,
  notifyOrderConfirmedBySupplier,
  notifyOrderInProgress,
  notifyOrderCompleted,
  notifyOrderCancelled,
  notifyOrderAwaitingConfirmation,
  notifyOrderDeleted,
  notifyOrderToBePublished,        // ✅ NOVÉ - má být zveřejněna
  notifyOrderPublished,            // ✅ NOVÉ - byla zveřejněna
  notifyOrderWillNotBePublished,   // ✅ NOVÉ - nebude zveřejňovat
  notifyOrderInvoicing,            // ✅ NOVÉ - fakturace
  notifyOrderMaterialCorrectness,  // ✅ NOVÉ - věcná správnost
  notifyOrderChecked,              // ✅ NOVÉ - zkontrolována
  // TODO Alarm helpers
  notifyTodoAlarm,
  notifyTodoAlarmNormal,
  notifyTodoAlarmHigh,
  notifyTodoAlarmExpired,
  // Deprecated
  notifyOrderApprovers,
  // Admin messages
  getAdminMessagesUnreadCount,
  // Konstanty
  NOTIFICATION_TYPES,
  NOTIFICATION_CONFIG,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CATEGORY
};
