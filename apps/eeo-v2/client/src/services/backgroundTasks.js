/**
 * Předpřipravené background úlohy pro aplikaci
 *
 * Tento modul obsahuje definice konkrétních background úloh:
 * - Kontrola notifikací
 * - Automatické obnovení seznamu ob      // ✅ SECURITY FIX: Backend automaticky filtruje podle rolí (viz BACKEND-ORDER-      if (!token || !user?.username) {
        throw new Error('Missing authentication data for orders refresh');
      }

      const ordersData = await listOrdersV2({}, token, user.username, false, true);OLES-FILTER.md)
      // - Admin/ORDER_MANAGE: vidí všechny objednávky
      // - Omezený uživatel: vidí JEN objednávky kde má nějakou roli (autor, objednatel, garant, atd.)
      // DŮLEŽITÉ: Backend automaticky aplikuje WHERE klauzuli s 12 user_id poli!

      // ✅ Volání STEJNÉHO API jako při normálním F5 reloadu (Orders25List.js loadData funkce)
      // Použití listOrdersV2 s enriched=true pro kompletní data + automatické backend filtrování
      const apiResult = await listOrdersV2(
        {}, // Prázdné filtry - backend si vše vyřeší sám podle tokenu
        token,
        user.username,
        true, // returnFullResponse=true pro získání meta dat
        true  // enriched=true pro kompletní data (stejně jako při F5)
      );

      const response = apiResult?.data || [];

      // 🚀 CACHE FIX: Místo invalidace celé cache, jen signalizuj že jsou k dispozici fresh datavent-driven refresh (po přidání objednávky atd.)
 */

// Import API služeb
// ✅ SECURITY FIX: Použít Order V2 API pro správné backend filtrování podle uživatelských práv
import { listOrdersV2 } from './apiOrderV2';
import { getUnreadCount, getNotificationsList } from './notificationsUnified';
import { loadAuthData, getStoredUserId } from '../utils/authStorage';
import ordersCacheService from './ordersCacheService';

// ==========================================================================
// MODULE SETTINGS HELPERS
// ==========================================================================

/**
 * Načte globální viditelnost modulů z localStorage.
 * Používá se v background taskech, protože App.js tasky registruje jen jednou
 * a potřebujeme reagovat i na změnu nastavení bez restartu.
 */
const getModuleSettingsSafe = () => {
  try {
    const raw = localStorage.getItem('app_moduleSettings');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
};

/**
 * Task handler pro kontrolu notifikací
 * Spouští se každých 60 sekund
 */
export const createNotificationCheckTask = (onNewNotifications, onUnreadCountChange) => ({
  name: 'checkNotifications',
  interval: 60 * 1000, // 60 sekund
  immediate: true, // Spustit hned při registraci
  enabled: true,

  // Podmínka - spouštět pouze když je uživatel přihlášen
  condition: () => {
    try {
      // Kontrola šifrovaného tokenu v localStorage
      const token = loadAuthData.token();
      const isAuthenticated = !!token;

      return isAuthenticated;
    } catch (error) {
      return false;
    }
  },

  callback: async () => {
    try {
      // Získání počtu nepřečtených notifikací s informacemi o barvě badge
      const unreadData = await getUnreadCount();
      const unreadCount = unreadData.unread_count || unreadData || 0; // Backward compatibility
      const badgeColor = unreadData.badge_color || 'gray';

      // Callback s aktuálním počtem nepřečtených a informací o barvě
      if (onUnreadCountChange) {
        // Rozšíříme callback o badge color informaci
        if (typeof unreadData === 'object' && unreadData.badge_color) {
          onUnreadCountChange(unreadCount, badgeColor);
        } else {
          // Backward compatibility
          onUnreadCountChange(unreadCount);
        }
      }

      // Pokud jsou nové notifikace, načti jejich detaily
      if (unreadCount > 0 && onNewNotifications) {
        const notificationsData = await getNotificationsList({
          limit: 20, // Zvýšeno z 5 na 20 pro všechny notifikace
          unread_only: false, // Načíst i přečtené pro kompletní sync
          include_dismissed: false // ✅ Neskrývat dismissed notifikace v dropdownu
        });        // 🆕 BEST PRACTICE: Synchronizuj HIGH alarmy do localStorage
        const { saveTodoAlarmToLocalStorage } = require('../hooks/useTodoAlarms');
        const userId = getStoredUserId(); // Získej userId z auth

        if (userId && notificationsData.data) {
          notificationsData.data.forEach(notification => {
            // Filtruj HIGH priority notifikace (TODO alarmy)
            const isHighAlarm = notification.priorita === 'HIGH' ||
                               notification.typ === 'alarm_todo_high' ||
                               notification.typ === 'alarm_todo_expired';

            if (isHighAlarm && (!notification.precteno || notification.precteno === 0)) {
              // Uložit do localStorage pro FloatingAlarmPopup
              try {
                saveTodoAlarmToLocalStorage(notification, userId);
              } catch (error) {
              }
            }
          });
        }

        onNewNotifications(notificationsData.data, unreadCount);
      }

      return { unreadCount };

    } catch (error) {
      throw error;
    }
  },

  onError: (error) => {
    // Tiše selhat - nezobrazovat error uživateli při background kontrole
  }
});

/**
 * Task handler pro kontrolu nových chat zpráv
 * Spouští se každých 90 sekund
 * POZNÁMKA: Chat není zatím implementován, připraveno pro budoucí použití
 */
export const createChatCheckTask = (onNewMessages) => ({
  name: 'checkChatMessages',
  interval: 90 * 1000, // 90 sekund
  immediate: false,
  enabled: false, // Vypnuto, dokud nebude chat implementován

  condition: () => {
    try {
      const token = loadAuthData.token();
      return !!token;
    } catch (error) {
      return false;
    }
  },

  callback: async () => {
    try {
      // TODO: Implementace volání API pro chat
      // const response = await chatApi.getUnreadMessages();

      // Placeholder
      const mockMessages = {
        unread: 0,
        conversations: []
      };

      if (onNewMessages && mockMessages.unread > 0) {
        onNewMessages(mockMessages);
      }

      return mockMessages;

    } catch (error) {
      throw error;
    }
  },

  onError: (error) => {
  }
});

/**
 * Task handler pro automatické obnovení seznamu objednávek
 * Spouští se každých 10 minut
 * DŮLEŽITÉ: Aktualizuje pouze data, NEprovádí reload stránky!
 *
 * @param {Function} onOrdersRefreshed - Callback pro aktualizaci dat v komponentě
 * @param {Function} getCurrentFilters - Callback pro získání aktuálních filtrů (rok, měsíc, archiv)
 */
export const createOrdersRefreshTask = (onOrdersRefreshed, getCurrentFilters) => ({
  name: 'autoRefreshOrders',
  interval: 10 * 60 * 1000, // 10 minut
  immediate: false, // Nespouštět hned, počkat první interval
  enabled: true,

  condition: () => {
    try {
      const token = loadAuthData.token();

      // Kontroluj, zda je uživatel na stránce se seznamem objednávek
      const currentPath = window.location.pathname;

      // ✅ Vypnout ÚPLNĚ pokud je modul Orders25List globálně vypnutý
      // (i kdyby se na route dostal admin/BETA tester)
      const moduleSettings = getModuleSettingsSafe();
      if (moduleSettings && moduleSettings.module_orders_visible === false) {
        return false;
      }

      // ✅ Spouštět POUZE na Order25List (V2) a Order25ListV3.
      // DŮLEŽITÉ: nepoužívat `/orders`, protože to je stará stránka (Orders.js) a BG refresh by tam dělal zbytečné dotazy.
      // Zároveň to zamezí načítání i v případě, že je modul v globálním nastavení vypnutý.
      // 🔒 V2 task spouštět jen na V2 stránce.
      const isOnOrdersListPage = /\/orders25-list(?:\/|$)/.test(currentPath);

      return !!token && isOnOrdersListPage;
    } catch (error) {
      return false;
    }
  },

  callback: async () => {
    try {
      // Načti autentizační data
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();
      const userDetail = await loadAuthData.userDetail();
      const userId = getStoredUserId();

      if (!token || !user?.username) {
        throw new Error('Missing authentication data for background refresh');
      }

      // 🔧 FIX: Získej aktuální filtry z komponenty (rok, měsíc, archiv)
      let filters = {};
      if (getCurrentFilters && typeof getCurrentFilters === 'function') {
        try {
          filters = getCurrentFilters();
        } catch (e) {
          console.error('❌ [BG] Chyba při získávání filtrů:', e);
          // Chyba při získávání filtrů - použij prázdné filtry
        }
      }

      //  BACKEND FILTROVÁNÍ: Posíláme primární filtry (ROK, OBDOBÍ, ARCHIV)
      const response = await listOrdersV2(filters, token, user.username, false, true);

      // 🚀 CACHE FIX: Místo invalidace celé cache, jen signalizuj že jsou k dispozici fresh data
      // ✅ SPRÁVNĚ: Žádná akce - cache si sama hlídá TTL

      if (onOrdersRefreshed && response) {
        // Callback s novými daty - komponenta si je sama aktualizuje
        onOrdersRefreshed(response);
      }

      return {
        ordersCount: response?.length || 0,
        timestamp: new Date().toISOString(),
        filters: filters,
        note: 'Backend applies role-based + primary filters (year, month, archive)'
      };

    } catch (error) {
      throw error;
    }
  },

  onError: (error) => {
    // Tiše selhat - background refresh by neměl rušit uživatele
  }
});

/**
 * Task handler pro automatické obnovení Orders V3 (Order25ListV3)
 * Spouští se každých 5 minut
 * DŮLEŽITÉ:
 * - Pouze pokud je modul Orders V3 globálně zapnutý
 * - Pouze pokud je uživatel na route /orders25-list-v3
 * - Tichý refresh řeší samotná stránka přes callback (loadOrders({silent:true}))
 */
export const createOrdersV3RefreshTask = (onOrdersV3AutoRefresh) => ({
  name: 'autoRefreshOrdersV3',
  interval: 5 * 60 * 1000, // 5 minut
  immediate: false,
  enabled: true,

  condition: () => {
    try {
      const token = loadAuthData.token();
      const currentPath = window.location.pathname;

      const moduleSettings = getModuleSettingsSafe();
      if (moduleSettings && moduleSettings.module_orders_v3_visible === false) {
        return false;
      }

      // Spouštět jen na V3 route
      const isOnOrdersV3Page = /\/orders25-list-v3(?:\/|$)/.test(currentPath);
      return !!token && isOnOrdersV3Page;
    } catch (_) {
      return false;
    }
  },

  callback: async () => {
    try {
      // 🔒 Hard guard (i kdyby condition nebyla respektována v budoucnu)
      const currentPath = window.location.pathname;
      if (!/\/orders25-list-v3(?:\/|$)/.test(currentPath)) {
        return { skipped: true, reason: 'not_on_orders_v3_route', timestamp: new Date().toISOString() };
      }

      const moduleSettings = getModuleSettingsSafe();
      if (moduleSettings && moduleSettings.module_orders_v3_visible === false) {
        return { skipped: true, reason: 'module_orders_v3_visible=false', timestamp: new Date().toISOString() };
      }

      // Načti autentizační data (jen pro validaci přihlášení)
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();

      if (!token || !user?.username) {
        throw new Error('Missing authentication data for Orders V3 background refresh');
      }

      // V3 refresh probíhá přes callback z komponenty (kvůli správným filtrům/paginaci/statistikám)
      if (typeof onOrdersV3AutoRefresh === 'function') {
        await onOrdersV3AutoRefresh();
      }

      return {
        timestamp: new Date().toISOString(),
        note: 'Orders V3 auto-refresh executed (silent)'
      };
    } catch (error) {
      throw error;
    }
  },

  onError: (_error) => {
    // Tiché selhání
  }
});

/**
 * Task handler pro automatické obnovení faktur (Invoices25List)
 * Spouští se každých 10 minut
 * DŮLEŽITÉ:
 * - Pouze pokud je modul faktur globálně zapnutý
 * - Pouze pokud je uživatel na route /invoices25-list
 * - Tichý refresh řeší samotná stránka přes callback
 */
export const createInvoicesRefreshTask = (onInvoicesAutoRefresh) => ({
  name: 'autoRefreshInvoices',
  interval: 10 * 60 * 1000, // 10 minut
  immediate: false,
  enabled: true,

  condition: () => {
    try {
      const token = loadAuthData.token();
      const currentPath = window.location.pathname;

      const moduleSettings = getModuleSettingsSafe();
      if (moduleSettings && moduleSettings.module_invoices_visible === false) {
        return false;
      }

      // Spouštět jen na route seznamu faktur
      const isOnInvoicesPage = /\/invoices25-list(?:\/|$)/.test(currentPath);
      return !!token && isOnInvoicesPage;
    } catch (_) {
      return false;
    }
  },

  callback: async () => {
    try {
      // Hard guard (i kdyby condition nebyla respektována v budoucnu)
      const currentPath = window.location.pathname;
      if (!/\/invoices25-list(?:\/|$)/.test(currentPath)) {
        return { skipped: true, reason: 'not_on_invoices_route', timestamp: new Date().toISOString() };
      }

      const moduleSettings = getModuleSettingsSafe();
      if (moduleSettings && moduleSettings.module_invoices_visible === false) {
        return { skipped: true, reason: 'module_invoices_visible=false', timestamp: new Date().toISOString() };
      }

      // Načti autentizační data (jen pro validaci přihlášení)
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();

      if (!token || !user?.username) {
        throw new Error('Missing authentication data for invoices background refresh');
      }

      if (typeof onInvoicesAutoRefresh === 'function') {
        await onInvoicesAutoRefresh();
      }

      return {
        timestamp: new Date().toISOString(),
        note: 'Invoices auto-refresh executed (silent)'
      };
    } catch (error) {
      throw error;
    }
  },

  onError: (_error) => {
    // Tiché selhání
  }
});

/**
 * Kombinovaný task handler - po přidání/úpravě objednávky
 * Provede okamžitý refresh objednávek + kontrolu notifikací
 * Tato úloha se spouští MANUÁLNĚ po uložení objednávky
 */
export const createPostOrderActionTask = (callbacks = {}) => ({
  name: 'postOrderAction',
  interval: 999999999, // Velmi dlouhý interval - tato úloha se spouští jen manuálně
  immediate: false,
  enabled: true,

  callback: async () => {
    const results = {
      ordersRefreshed: false,
      notificationsChecked: false,
      errors: []
    };

    try {
      // 1. Okamžitý refresh orders (ne za 10 minut, ale HNED)
      // Načti autentizační data pro API volání
      const token = await loadAuthData.token();
      const user = await loadAuthData.user();

      if (!token || !user?.username) {
        throw new Error('Missing authentication data for post-order refresh');
      }

      const ordersData = await listOrdersV2({}, token, user.username, false, true);

      // 🚀 CACHE: Po uložení objednávky MUSÍME invalidovat cache (data se změnila)
      ordersCacheService.invalidate();

      if (callbacks.onOrdersRefreshed && ordersData) {
        callbacks.onOrdersRefreshed(ordersData);
      }

      results.ordersRefreshed = true;

    } catch (error) {
      results.errors.push({ task: 'orders', error });
    }

    try {
      // 2. Okamžitá kontrola notifikací s informací o barvě badge
      const unreadData = await getUnreadCount();
      const unreadCount = unreadData.unread_count || unreadData || 0; // Backward compatibility
      const badgeColor = unreadData.badge_color || 'gray';

      if (callbacks.onNotificationsChecked) {
        // Rozšíříme callback o badge color informaci
        if (typeof unreadData === 'object' && unreadData.badge_color) {
          callbacks.onNotificationsChecked(unreadCount, badgeColor);
        } else {
          // Backward compatibility
          callbacks.onNotificationsChecked(unreadCount);
        }
      }

      // Načti i detail nových notifikací
      if (unreadCount > 0 && callbacks.onNewNotifications) {
        const notificationsData = await getNotificationsList({
          limit: 5,
          unread_only: true
        });
        callbacks.onNewNotifications(notificationsData.data, unreadCount);
      }

      results.notificationsChecked = true;

    } catch (error) {
      results.errors.push({ task: 'notifications', error });
    }

    return results;
  },

  onError: (error) => {
  }
});

/**
 * Helper funkce pro rychlou konfiguraci všech standardních tasků
 * @param {Object} callbacks - Callbacky pro jednotlivé úlohy
 * @param {Function} callbacks.getCurrentFilters - Callback pro získání aktuálních filtrů
 * @param {Function} callbacks.onInvoicesAutoRefresh - Callback pro tichý refresh faktur
 * @returns {Array} - Pole task konfigurací
 */
export const createStandardTasks = (callbacks = {}) => {
  return [
    createNotificationCheckTask(
      callbacks.onNewNotifications,
      callbacks.onUnreadCountChange
    ),
    createChatCheckTask(callbacks.onNewMessages),
    createOrdersRefreshTask(
      callbacks.onOrdersRefreshed,
      callbacks.getCurrentFilters  // ← Přidán callback pro získání filtrů
    ),
    createOrdersV3RefreshTask(
      callbacks.onOrdersV3AutoRefresh
    ),
    createInvoicesRefreshTask(
      callbacks.onInvoicesAutoRefresh
    ),
    createExchangeRatesTask(callbacks.onExchangeRatesUpdated), // ← Nový task pro směnné kurzy
    createPostOrderActionTask({
      onOrdersRefreshed: callbacks.onOrdersRefreshed,
      onNotificationsChecked: callbacks.onUnreadCountChange,
      onNewNotifications: callbacks.onNewNotifications
    })
  ];
};

/**
 * Task handler pro načítání směnných kurzů
 * Spouští se:
 * - Po přihlášení uživatele (manuálně přes runNow() z App.js)
 * - Každých 30 minut automaticky (plánovaný interval)
 * - NIKDY při refresh stránky (F5)
 */
export const createExchangeRatesTask = (onRatesUpdated) => ({
  name: 'exchangeRatesRefresh',
  interval: 30 * 60 * 1000, // 30 minut
  immediate: false, // ✅ SPRÁVNĚ: NE při inicializaci! Pouze v intervalu nebo manuálně přes runNow()
  enabled: true,

  condition: () => {
    // Spouštět vždy když je uživatel přihlášen
    try {
      const token = loadAuthData.token();
      return !!token;
    } catch (error) {
      return false;
    }
  },

  callback: async () => {
    const timestamp = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      const baseCurrency = 'CZK';
      const fiatApiUrl = `https://open.er-api.com/v6/latest/${baseCurrency}`;

      // Načtení kurzů fiat měn
      const fiatResponse = await fetch(fiatApiUrl, {
        timeout: 10000, // 10 sekund timeout
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!fiatResponse.ok) {
        const errorText = await fiatResponse.text().catch(() => 'Unknown error');
        throw new Error(`Fiat API error ${fiatResponse.status}: ${errorText}`);
      }

      const fiatData = await fiatResponse.json();

      if (fiatData.result !== 'success') {
        throw new Error(`API chyba při načítání kurzů: ${fiatData.error || 'Unknown error'}`);
      }

      const finalRates = {};

      // Přepočítáme kurzy měn (kolik CZK stojí 1 jednotka cizí měny)
      for (const currency in fiatData.rates) {
        if (fiatData.rates[currency] !== 0) {
          finalRates[currency] = 1 / fiatData.rates[currency];
        }
      }

      // Callback s novými kurzy (pouze fiat měny)
      if (onRatesUpdated) {
        onRatesUpdated(finalRates);
      }

      return {
        currenciesCount: Object.keys(finalRates).length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      // ✅ KRITICKÉ: Zachytit a zalogovat, ale NIKDY nepropagovat výš
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Exchange rates task failed:', {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      }
      throw error; // Propagovat do onError handleru (ne výš)
    }
  },

  onError: (error) => {
    // ✅ KRITICKÉ: Tiše selhat - background refresh kurzů NESMÍ rušit uživatele ani blokovat přihlášení
    // Log pouze v development pro debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Exchange rates background task error (silently handled):', error.message);
    }
  }
});

/**
 * Doporučené intervaly v milisekundách
 */
export const TASK_INTERVALS = {
  NOTIFICATIONS: 60 * 1000,         // 1 minuta
  CHAT: 90 * 1000,                  // 1.5 minuty
  ORDERS_REFRESH: 10 * 60 * 1000,   // 10 minut
  INVOICES_REFRESH: 10 * 60 * 1000, // 10 minut
  EXCHANGE_RATES: 30 * 60 * 1000,   // 30 minut
  HEALTH_CHECK: 5 * 60 * 1000,      // 5 minut (pro budoucí použití)
  SESSION_CHECK: 15 * 60 * 1000     // 15 minut (pro budoucí použití)
};

export default {
  createNotificationCheckTask,
  createChatCheckTask,
  createOrdersRefreshTask,
  createOrdersV3RefreshTask,
  createInvoicesRefreshTask,
  createExchangeRatesTask,
  createPostOrderActionTask,
  createStandardTasks,
  TASK_INTERVALS
};
