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
    const timestamp = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`🔔 [BTask checkNotifications] START - ${timestamp}`);
    
    try {
      // Získání počtu nepřečtených notifikací
      console.log('   → Volám getUnreadCount()...');
      const unreadCount = await getUnreadCount();
      console.log(`   ✅ Unread count: ${unreadCount}`);

      // Callback s aktuálním počtem nepřečtených
      if (onUnreadCountChange) {
        console.log(`   → Volám onUnreadCountChange(${unreadCount})`);
        onUnreadCountChange(unreadCount);
      }

      // Pokud jsou nové notifikace, načti jejich detaily
      if (unreadCount > 0 && onNewNotifications) {
        console.log(`   → Načítám ${unreadCount} notifikací přes getNotificationsList()...`);
        const notificationsData = await getNotificationsList({
          limit: 20, // Zvýšeno z 5 na 20 pro všechny notifikace
          unread_only: false, // Načíst i přečtené pro kompletní sync
          include_dismissed: false // ✅ Neskrývat dismissed notifikace v dropdownu
        });
        console.log(`   ✅ Načteno ${notificationsData?.data?.length || 0} notifikací`);        // 🆕 BEST PRACTICE: Synchronizuj HIGH alarmy do localStorage
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

        console.log(`   → Volám onNewNotifications() s ${notificationsData.data?.length || 0} notifikacemi`);
        onNewNotifications(notificationsData.data, unreadCount);
      } else if (unreadCount === 0) {
        console.log('   ℹ️ Žádné nepřečtené notifikace');
      }

      console.log('✅ [BTask checkNotifications] DONE');
      console.log('════════════════════════════════════════════════════════════════');
      return { unreadCount };

    } catch (error) {
      console.error('❌ [BTask checkNotifications] ERROR:', error);
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
      console.log('════════════════════════════════════════════════════════════════');
      throw error;
    }
  },

  onError: (error) => {
    console.error('❌ [BTask checkNotifications] onError callback:', error);
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

  condition: async () => {
    try {
      const token = await loadAuthData.token();

      // Kontroluj, zda je uživatel na stránce se seznamem objednávek
      const currentPath = window.location.pathname;

      const isOnOrdersPage = currentPath.includes('/orders25-list') ||
                             currentPath.includes('/orders') ||
                             currentPath === '/';

      return !!token && isOnOrdersPage;
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
      // 2. Okamžitá kontrola notifikací
      const unreadCount = await getUnreadCount();

      if (callbacks.onNotificationsChecked) {
        callbacks.onNotificationsChecked(unreadCount);
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

      // Načtení jen fiat měn (crypto API vypnuto kvůli CORS problémům)
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

      // 🪙 Crypto API - načtení krypto kurzů přes backend proxy (řeší CORS problém)
      try {
        // ✅ OPRAVENO: Použít API2_BASE_URL který už obsahuje /api.eeo/
        const API2_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';
        const cryptoApiUrl = `${API2_BASE_URL}crypto-rates-proxy.php`;

        // Získat token pro autentizaci (pokud je vyžadován)
        const token = await loadAuthData.token();

        const cryptoResponse = await fetch(cryptoApiUrl, {
          method: 'GET',
          timeout: 15000, // 15 sekund timeout pro crypto API
          headers: {
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (cryptoResponse.ok) {
          const data = await cryptoResponse.json();

          // Backend proxy vrací normalizovanou strukturu { success, rates: { BTC: 1234, ETH: 890, ... } }
          if (data.success && data.rates) {
            // Přímo přidat crypto kurzy z proxy response
            for (const [symbol, rateInCzk] of Object.entries(data.rates)) {
              finalRates[symbol] = rateInCzk;
            }
          }
        }
      } catch (cryptoError) {
        // Tiše ignoruj chyby z crypto API - fiat měny budou stále dostupné
      }

      // Callback s novými kurzy (fiat + crypto)
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
  EXCHANGE_RATES: 30 * 60 * 1000,   // 30 minut
  HEALTH_CHECK: 5 * 60 * 1000,      // 5 minut (pro budoucí použití)
  SESSION_CHECK: 15 * 60 * 1000     // 15 minut (pro budoucí použití)
};

export default {
  createNotificationCheckTask,
  createChatCheckTask,
  createOrdersRefreshTask,
  createExchangeRatesTask,
  createPostOrderActionTask,
  createStandardTasks,
  TASK_INTERVALS
};
