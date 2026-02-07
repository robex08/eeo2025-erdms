/**
 * ============================================================================
 * UNIFIED NOTIFICATIONS API
 * ============================================================================
 *
 * Sloučení STARÉHO a NOVÉHO notifikačního systému:
 *
 * ✅ ZACHOVÁNO ze STARÉHO API (FUNGUJE!):
 *    - CRUD operace (getList, markRead, dismiss, delete)
 *    - LocalStorage operace (deprecated, ale funkční)
 *    - NOTIFICATION_CONFIG (ikony, barvy pro UI)
 *    - NOTIFICATION_PRIORITY, NOTIFICATION_CATEGORY
 *
 * 🆕 PŘIDÁNO z NOVÉHO API:
 *    - Nový backend /notifications/* (30 templates, automatické placeholdery)
 *    - NotificationService class s helper funkcemi
 *    - NOTIFICATION_TYPES (30 typů místo 12)
 *    - Preview, bulk send, templates admin
 *
 * Backend endpointy:
 * - POST /notifications/list - Seznam notifikací (STARÝ)
 * - POST /notifications/unread-count - Počet nepřečtených (STARÝ)
 * - POST /notifications/mark-read - Označit jako přečtené (STARÝ)
 * - POST /notifications/mark-all-read - Označit vše (STARÝ)
 * - POST /notifications/dismiss - Skrýt notifikaci (STARÝ)
 * - POST /notifications/restore - Obnovit notifikaci (STARÝ)
 * - POST /notifications/delete - Smazat notifikaci (STARÝ)
 * - POST /notifications/create - Vytvořit notifikaci (NOVÝ - s automatickými placeholdery)
 * - POST /notifications/preview - Náhled před odesláním (NOVÝ)
 * - POST /notifications/templates - Seznam templates (NOVÝ - admin)
 * - POST /notifications/send-bulk - Hromadné odeslání (NOVÝ)
 *
 * Migrace: 29. října 2025
 */

import axios from 'axios';
import { loadAuthData } from '../utils/authStorage';

// =============================================================================
// IMPORT NOVÝCH KONSTANT (30 typů notifikací)
// =============================================================================

export {
  NOTIFICATION_TYPES,
  getNotificationTypeName,
  getNotificationIcon,
  getNotificationPriority,
  getPriorityIcon
} from '../constants/notificationTypes';

// =============================================================================
// KONSTANTY ZE STARÉHO API (zachováno pro UI komponenty)
// =============================================================================

/**
 * Konfigurace pro jednotlivé typy notifikací (ikony, barvy, kategorie)
 * ✅ ZACHOVÁNO ze starého API - používá NotificationBell, NotificationDropdown, NotificationsPage
 */
export const NOTIFICATION_CONFIG = {
  // STAVY OBJEDNÁVEK (NOVÉ)
  ORDER_CREATED: {
    icon: '📝',
    color: '#64748b',
    category: 'orders',
    label: 'Objednávka vytvořena',
    priority: 'low'
  },
  ORDER_DRAFT: {
    icon: '✏️',
    color: '#f59e0b',
    category: 'orders',
    label: 'Objednávka rozpracována',
    priority: 'low'
  },
  ORDER_PENDING_APPROVAL: {
    icon: '📋',
    color: '#3b82f6',
    category: 'orders',
    label: 'Objednávka ke schválení',
    priority: 'high'
  },
  ORDER_APPROVED: {
    icon: '👍',
    color: '#16a34a',
    category: 'orders',
    label: 'Objednávka schválena',
    priority: 'normal'
  },
  ORDER_REJECTED: {
    icon: '❌',
    color: '#dc2626',
    category: 'orders',
    label: 'Objednávka zamítnuta',
    priority: 'high'
  },
  ORDER_AWAITING_CHANGES: {
    icon: '⏸️',
    color: '#f59e0b',
    category: 'orders',
    label: 'Objednávka čeká',
    priority: 'normal'
  },
  ORDER_SENT_TO_SUPPLIER: {
    icon: '📤',
    color: '#3b82f6',
    category: 'orders',
    label: 'Objednávka odeslána',
    priority: 'normal'
  },
  ORDER_AWAITING_CONFIRMATION: {
    icon: '⏳',
    color: '#f59e0b',
    category: 'orders',
    label: 'Čeká na potvrzení dodavatele',
    priority: 'normal'
  },
  ORDER_CONFIRMED_BY_SUPPLIER: {
    icon: '✔️',
    color: '#8b5cf6',
    category: 'orders',
    label: 'Objednávka potvrzena',
    priority: 'normal'
  },
  ORDER_COMPLETED: {
    icon: '🎯',
    color: '#059669',
    category: 'orders',
    label: 'Objednávka dokončena',
    priority: 'normal'
  },
  ORDER_CANCELLED: {
    icon: '🚫',
    color: '#6b7280',
    category: 'orders',
    label: 'Objednávka zrušena',
    priority: 'normal'
  },
  ORDER_DELETED: {
    icon: '🗑️',
    color: '#6b7280',
    category: 'orders',
    label: 'Objednávka smazána',
    priority: 'low'
  },

  // NOVÉ FÁZE - REGISTR SMLUV
  ORDER_REGISTRY_PENDING: {
    icon: '📋',
    color: '#f59e0b',
    category: 'orders',
    label: 'Čeká na registr smluv',
    priority: 'normal'
  },
  ORDER_REGISTRY_PUBLISHED: {
    icon: '📢',
    color: '#10b981',
    category: 'orders',
    label: 'Zveřejněna v registru',
    priority: 'normal'
  },

  // NOVÉ FÁZE - FAKTURACE
  ORDER_INVOICE_PENDING: {
    icon: '💰',
    color: '#f59e0b',
    category: 'orders',
    label: 'Čeká na fakturu',
    priority: 'normal'
  },
  ORDER_INVOICE_ADDED: {
    icon: '📄',
    color: '#3b82f6',
    category: 'orders',
    label: 'Faktura přidána',
    priority: 'normal'
  },
  ORDER_INVOICE_APPROVED: {
    icon: '✅',
    color: '#10b981',
    category: 'orders',
    label: 'Faktura schválena',
    priority: 'normal'
  },
  ORDER_INVOICE_PAID: {
    icon: '💳',
    color: '#10b981',
    category: 'orders',
    label: 'Faktura uhrazena',
    priority: 'normal'
  },

  // NOVÉ FÁZE - VĚCNÁ SPRÁVNOST FAKTURY
  INVOICE_MATERIAL_CHECK_REQUESTED: {
    icon: '📝',
    color: '#f59e0b',
    category: 'invoices',
    label: 'Čeká na kontrolu věcné správnosti',
    priority: 'high'
  },
  INVOICE_MATERIAL_CHECK_APPROVED: {
    icon: '✅',
    color: '#10b981',
    category: 'invoices',
    label: 'Věcná správnost faktury OK',
    priority: 'normal'
  },
  INVOICE_MATERIAL_CHECK_REJECTED: {
    icon: '⚠️',
    color: '#ef4444',
    category: 'invoices',
    label: 'Reklamace - věcná správnost',
    priority: 'high'
  },

  // TODO ALARMY
  alarm_todo_normal: {
    icon: '📌',
    color: '#3b82f6',
    category: 'todos',
    label: 'TODO - Běžná připomínka',
    priority: 'normal'
  },
  alarm_todo_high: {
    icon: '🔥',
    color: '#ef4444',
    category: 'todos',
    label: 'TODO - URGENTNÍ',
    priority: 'urgent'
  },
  alarm_todo_expired: {
    icon: '⏰',
    color: '#dc2626',
    category: 'todos',
    label: 'TODO - Prošlý termín',
    priority: 'high'
  },
  todo_completed: {
    icon: '✅',
    color: '#10b981',
    category: 'todos',
    label: 'TODO - Dokončeno',
    priority: 'low'
  },
  todo_assigned: {
    icon: '👤',
    color: '#3b82f6',
    category: 'todos',
    label: 'TODO - Přiřazeno',
    priority: 'normal'
  },

  // SYSTÉMOVÉ
  system_maintenance: {
    icon: '🔧',
    color: '#f59e0b',
    category: 'system',
    label: 'Systémová údržba',
    priority: 'high'
  },

  // OSTATNÍ
  user_mention: {
    icon: '@',
    color: '#3b82f6',
    category: 'mentions',
    label: 'Zmínka v komentáři',
    priority: 'normal'
  },
  deadline_reminder: {
    icon: '⏰',
    color: '#f59e0b',
    category: 'reminders',
    label: 'Upozornění na termín',
    priority: 'normal'
  },
  order_unlock_forced: {
    icon: '🔓',
    color: '#ef4444',
    category: 'orders',
    label: 'Objednávka násilně odebrána',
    priority: 'high'
  }
};

/**
 * Priority notifikací
 * ✅ ZACHOVÁNO ze starého API
 */
export const NOTIFICATION_PRIORITY = {
  URGENT: 'urgent',  // 🔴 Kritické - okamžitá akce
  HIGH: 'high',      // 🟠 Vysoká - vyžaduje pozornost
  NORMAL: 'normal',  // 🟢 Běžná - standardní
  LOW: 'low'         // ⚪ Nízká - informativní
};

/**
 * Kategorie notifikací
 * ✅ ZACHOVÁNO ze starého API
 */
export const NOTIFICATION_CATEGORY = {
  ORDERS: 'orders',      // Objednávky
  TODOS: 'todos',        // TODO alarmy
  SYSTEM: 'system',      // Systémové
  MENTIONS: 'mentions',  // Zmínky
  REMINDERS: 'reminders' // Připomínky
};

// =============================================================================
// AXIOS INSTANCE A HELPER FUNKCE (zachováno ze starého API)
// =============================================================================

const notificationsApi = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo',
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Získání auth dat z šifrovaného storage
 * ✅ ZACHOVÁNO ze starého API
 */
const getAuthData = async () => {
  try {
    const token = await loadAuthData.token();
    const user = await loadAuthData.user();

    if (!token || !user?.username) {
      throw new Error('Missing authentication data');
    }

    return {
      token,
      username: user.username,
      from_user_id: user.id,
      from_user_name: user.fullName || `${user.jmeno || ''} ${user.prijmeni || ''}`.trim() || user.username
    };
  } catch (error) {
    throw new Error('Missing authentication data');
  }
};

/**
 * Error handler pro API response
 * ✅ ZACHOVÁNO ze starého API
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

// =============================================================================
// CRUD OPERACE (✅ ZACHOVÁNO ZE STARÉHO API - FUNGUJE!)
// =============================================================================

/**
 * Seznam notifikací
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
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
 * Počet nepřečtených notifikací
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
 */
export const getUnreadCount = async () => {
  try {
    const auth = await getAuthData();

    const response = await notificationsApi.post('/notifications/unread-count', auth);
    const result = handleApiResponse(response);

    return result.unread_count;

  } catch (error) {

    if (error.response?.status === 404) {
      return 0;
    }

    return 0;
  }
};

/**
 * Označení notifikace jako přečtené
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
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
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
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
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
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
 * Skrýt všechny notifikace (dismiss all)
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
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
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
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
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
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
 * ✅ STARÝ API - FUNGUJE - ZACHOVÁNO!
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
// DEPRECATED LOCALSTORAGE FUNKCE (zachováno pro kompatibilitu)
// =============================================================================

/**
 * @deprecated Použij dismissNotification() - backend API
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
 */
export const clearHiddenNotificationsInDropdown = (userId) => {
  try {
    const key = `hidden_notifications_${userId}`;
    localStorage.removeItem(key);
  } catch (error) {
  }
};

// =============================================================================
// NOVÝ BACKEND API - Vytváření notifikací s automatickými placeholdery
// =============================================================================

/**
 * NotificationService Class
 * 🆕 NOVÝ - Backend automaticky naplní 50+ placeholderů z order_id
 */
class NotificationService {

  /**
   * Hlavní metoda pro vytvoření notifikace
   * Backend automaticky naplní placeholdery z order_id
   *
   * @param {Object} params
   * @param {string} params.token - JWT token
   * @param {string} params.username - Username
   * @param {string} params.type - Typ notifikace (z NOTIFICATION_TYPES)
   * @param {number} params.order_id - ID objednávky (backend z toho načte všechna data)
   * @param {number} params.action_user_id - ID uživatele, který akci provedl
   * @param {number} [params.to_user_id] - ID příjemce (nebo použij recipients)
   * @param {number[]} [params.recipients] - Array ID příjemců pro hromadné odeslání
   * @param {Object} [params.custom_placeholders] - Vlastní placeholdery (volitelné)
   */
  async create({
    token,
    username,
    type,
    order_id,
    action_user_id,
    to_user_id = null,
    recipients = null,
    custom_placeholders = {}
  }) {
    try {

      const payload = {
        token,
        username,
        typ: type, // Backend očekává 'typ', ne 'type'
        order_id,
        action_user_id,
        ...custom_placeholders
      };

      // ✅ Backend API /notifications/create podporuje přímo pole příjemců v parametru to_users
      // Není potřeba zvláštní endpoint /send-bulk
      if (recipients && Array.isArray(recipients) && recipients.length > 0) {
        payload.to_users = recipients; // Backend očekává "to_users", ne "recipients"
      } else if (to_user_id) {
        payload.pro_uzivatele_id = to_user_id; // Backend očekává "pro_uzivatele_id", ne "to_user_id"
      }

      const response = await notificationsApi.post('/notifications/create', payload);
      const result = handleApiResponse(response);

      if (recipients && recipients.length > 0) {
      } else {
      }

      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Náhled notifikace před odesláním
   * Zobrazí, jak bude vypadat s naplněnými placeholdery
   */
  async preview({ token, username, type, order_id, action_user_id, custom_placeholders = {} }) {
    try {
      const payload = {
        token,
        username,
        typ: type, // Backend očekává 'typ', ne 'type'
        order_id,
        action_user_id,
        ...custom_placeholders
      };

      const response = await notificationsApi.post('/notifications/preview', payload);
      const result = handleApiResponse(response);

      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Seznam všech templates (admin)
   */
  async getTemplates({ token, username, active_only = true }) {
    try {
      const payload = { token, username, active_only };

      const response = await notificationsApi.post('/notifications/templates', payload);
      const result = handleApiResponse(response);

      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Hromadné odeslání notifikace více příjemcům
   */
  async sendBulk({ token, username, type, order_id, action_user_id, recipients, custom_placeholders = {} }) {
    try {
      const payload = {
        token,
        username,
        type,
        order_id,
        action_user_id,
        recipients,
        ...custom_placeholders
      };

      const response = await notificationsApi.post('/notifications/send-bulk', payload);
      const result = handleApiResponse(response);

      return result;

    } catch (error) {
      throw error;
    }
  }

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
  async trigger(eventType, objectId, triggerUserId, placeholderData = {}) {
    try {
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();

      const payload = {
        token,
        username: user?.username,
        event_type: eventType,
        object_id: objectId,
        trigger_user_id: triggerUserId,
        placeholder_data: placeholderData
      };

      const response = await notificationsApi.post('/notifications/trigger', payload);
      const result = handleApiResponse(response);

      return result;

    } catch (error) {
      console.error('❌ [NotificationService] Trigger CHYBA:', error);
      console.error('   Error message:', error.message);
      console.error('   HTTP Status:', error.response?.status);
      console.error('   Response data:', error.response?.data);
      throw error;
    }
  }

  // ===========================================================================
  // TODO ALARM FUNKCE
  // ===========================================================================

  /**
   * Poslat TODO alarm notifikaci (normální priorita)
   * @param {number} userId - ID uživatele
   * @param {Object} todoData - Data úkolu
   */
  async notifyTodoAlarmNormal(userId, todoData) {
    const token = await loadAuthData.token();
    const user = await loadAuthData.user();
    return this.create({
      token,
      username: user?.username,
      type: 'alarm_todo_normal',
      order_id: null,
      action_user_id: userId,
      to_user_id: userId,
      custom_placeholders: {
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
  }

  /**
   * Poslat TODO alarm notifikaci (VYSOKÁ priorita)
   * @param {number} userId - ID uživatele
   * @param {Object} todoData - Data úkolu
   */
  async notifyTodoAlarmHigh(userId, todoData) {
    const token = await loadAuthData.token();
    const user = await loadAuthData.user();
    return this.create({
      token,
      username: user?.username,
      type: 'alarm_todo_high',
      order_id: null,
      action_user_id: userId,
      to_user_id: userId,
      custom_placeholders: {
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
  }

  /**
   * Poslat TODO alarm notifikaci (PROŠLÝ TERMÍN)
   * @param {number} userId - ID uživatele
   * @param {Object} todoData - Data úkolu
   */
  async notifyTodoAlarmExpired(userId, todoData) {
    const token = await loadAuthData.token();
    const user = await loadAuthData.user();
    return this.create({
      token,
      username: user?.username,
      type: 'alarm_todo_expired',
      order_id: null,
      action_user_id: userId,
      to_user_id: userId,
      custom_placeholders: {
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
  }

  /**
   * Univerzální funkce pro odeslání TODO alarm notifikace
   * Automaticky vybere správný typ podle priority a stavu
   * @param {number} userId - ID uživatele
   * @param {Object} todoData - Data úkolu
   * @param {boolean} isExpired - Je termín prošlý?
   * @param {boolean} isHighPriority - Je vysoká priorita?
   */
  async notifyTodoAlarm(userId, todoData, isExpired = false, isHighPriority = false) {
    if (isExpired) {
      return this.notifyTodoAlarmExpired(userId, todoData);
    } else if (isHighPriority) {
      return this.notifyTodoAlarmHigh(userId, todoData);
    } else {
      return this.notifyTodoAlarmNormal(userId, todoData);
    }
  }

  // ===========================================================================
  // HELPER FUNKCE - Ready-to-use metody pro běžné workflow akce
  // ===========================================================================

  /**
   * Schválení objednávky
   */
  async notifyOrderApproved({ token, username, order_id, action_user_id, creator_id }) {
    return this.create({
      token,
      username,
      type: 'ORDER_APPROVED',
      order_id,
      action_user_id,
      to_user_id: creator_id
    });
  }

  /**
   * Zamítnutí objednávky
   */
  async notifyOrderRejected({ token, username, order_id, action_user_id, creator_id, rejection_reason = '' }) {
    return this.create({
      token,
      username,
      type: 'ORDER_REJECTED',
      order_id,
      action_user_id,
      to_user_id: creator_id,
      custom_placeholders: { rejection_reason }
    });
  }

  /**
   * Odeslání ke schválení
   */
  async notifyPendingApproval({ token, username, order_id, action_user_id, garant_id }) {
    return this.create({
      token,
      username,
      type: 'ORDER_PENDING_APPROVAL',
      order_id,
      action_user_id,
      to_user_id: garant_id
    });
  }

  /**
   * Vráceno k přepracování
   */
  async notifyWaitingForChanges({ token, username, order_id, action_user_id, creator_id, reason = '' }) {
    return this.create({
      token,
      username,
      type: 'ORDER_AWAITING_CHANGES',
      order_id,
      action_user_id,
      to_user_id: creator_id,
      custom_placeholders: { reason }
    });
  }

  /**
   * Odesláno dodavateli
   */
  async notifySentToSupplier({ token, username, order_id, action_user_id, recipients }) {
    return this.create({
      token,
      username,
      type: 'ORDER_SENT_TO_SUPPLIER',
      order_id,
      action_user_id,
      recipients
    });
  }

  /**
   * Potvrzeno dodavatelem
   */
  async notifyConfirmedBySupplier({ token, username, order_id, action_user_id, recipients }) {
    return this.create({
      token,
      username,
      type: 'ORDER_CONFIRMED_BY_SUPPLIER',
      order_id,
      action_user_id,
      recipients
    });
  }

  /**
   * 🆕 NOVÁ FÁZE: Registr smluv - zveřejněno
   */
  async notifyRegistryPublished({ token, username, order_id, action_user_id, recipients }) {
    return this.create({
      token,
      username,
      type: 'ORDER_REGISTRY_PUBLISHED',
      order_id,
      action_user_id,
      recipients
    });
  }

  /**
   * 🆕 NOVÁ FÁZE: Faktura přidána
   */
  async notifyInvoiceAdded({ token, username, order_id, action_user_id, recipients }) {
    return this.create({
      token,
      username,
      type: 'ORDER_INVOICE_ADDED',
      order_id,
      action_user_id,
      recipients
    });
  }

  /**
   * 🆕 NOVÁ FÁZE: Faktura schválena
   */
  async notifyInvoiceApproved({ token, username, order_id, action_user_id, creator_id }) {
    return this.create({
      token,
      username,
      type: 'ORDER_INVOICE_APPROVED',
      order_id,
      action_user_id,
      to_user_id: creator_id
    });
  }

  /**
   * 🆕 NOVÁ FÁZE: Faktura uhrazena
   */
  async notifyInvoicePaid({ token, username, order_id, action_user_id, creator_id }) {
    return this.create({
      token,
      username,
      type: 'ORDER_INVOICE_PAID',
      order_id,
      action_user_id,
      to_user_id: creator_id
    });
  }

  /**
   * 🆕 NOVÁ FÁZE: Věcná správnost potvrzena
   */
  async notifyVecnaSpravnostConfirmed({ token, username, order_id, action_user_id, recipients }) {
    return this.create({
      token,
      username,
      type: 'INVOICE_MATERIAL_CHECK_APPROVED',
      order_id,
      action_user_id,
      recipients
    });
  }

  /**
   * 🆕 NOVÁ FÁZE: Věcná správnost zamítnuta (reklamace)
   */
  async notifyVecnaSpravnostRejected({ token, username, order_id, action_user_id, recipients, reason = '' }) {
    return this.create({
      token,
      username,
      type: 'INVOICE_MATERIAL_CHECK_REJECTED', // TODO: implementovat nebo odstranit
      order_id,
      action_user_id,
      recipients,
      custom_placeholders: { reason }
    });
  }
}

// Singleton instance
const notificationService = new NotificationService();

// Export instance + class (pro testy)
export { notificationService, NotificationService };

// Export TODO alarm helper funkce (pro backward compatibility)
export const notifyTodoAlarm = (userId, todoData, isExpired, isHighPriority) => {
  return notificationService.notifyTodoAlarm(userId, todoData, isExpired, isHighPriority);
};

// Export jako default
export default notificationService;
