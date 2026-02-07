/**
 * Synchronizace stavu aplikace mezi záložkami pomocí Broadcast Channel API
 * Zajišťuje, že všechny záložky sdílejí stejný stav a reagují na změny
 */

// 🔧 Detekce DEV prostředí
const IS_DEV_ENV = window.location.pathname.startsWith('/dev/');
const ENV_PREFIX = IS_DEV_ENV ? 'dev_' : '';

const CHANNEL_NAME = `${ENV_PREFIX}app_sync_channel`;
const TAB_SYNC_KEY = `${ENV_PREFIX}tab_sync_message`;

// Singleton instance broadcast channel
let broadcastChannel = null;

// Unikátní ID této záložky (pro ignorování vlastních zpráv)
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Inicializace broadcast channel
 */
export const initTabSync = () => {
  // 🐛 VYPNUTO během developmentu kvůli message handler violations
  if (process.env.NODE_ENV === 'development') {
    // console.log('🔇 TabSync vypnuto během developmentu'); // 🔧 Removed log to reduce console spam
    return null;
  }

  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }

  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch (error) {
      return null;
    }
  }

  return broadcastChannel;
};

/**
 * Uzavření broadcast channel (při unmount)
 */
export const closeTabSync = () => {
  if (broadcastChannel) {
    try {
      broadcastChannel.close();
      broadcastChannel = null;
    } catch (error) {
    }
  }
};

/**
 * Odeslání zprávy do všech ostatních záložek
 */
export const broadcastMessage = (type, payload = {}) => {

  const channel = broadcastChannel || initTabSync();

  if (!channel) {
    // Fallback: použij localStorage event (starší prohlížeče)
    try {
      const message = { type, payload, timestamp: Date.now() };
      localStorage.setItem(TAB_SYNC_KEY, JSON.stringify(message));
      // Okamžitě smaž, aby se spustil event
      localStorage.removeItem(TAB_SYNC_KEY);
    } catch (error) {
    }
    return;
  }

  try {
    const message = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: TAB_ID // Identifikace odesílatele
    };

    channel.postMessage(message);
  } catch (error) {
  }
};

/**
 * Registrace listeneru pro příjem zpráv z ostatních záložek
 */
export const onTabSyncMessage = (callback) => {
  const channel = broadcastChannel || initTabSync();

  if (!channel) {
    // Fallback: použij localStorage event
    const storageHandler = (event) => {
      if (event.key === 'tab_sync_message' && event.newValue) {
        try {
          const message = JSON.parse(event.newValue);
          callback(message);
        } catch (error) {
        }
      }
    };

    window.addEventListener('storage', storageHandler);

    // Vrátí cleanup funkci
    return () => {
      window.removeEventListener('storage', storageHandler);
    };
  }

  // ⚡ THROTTLE: Omez zpracování zpráv na max 1x za 500ms (zvýšeno kvůli performance)
  let lastProcessed = 0;
  let pendingCallback = null;

  const messageHandler = (event) => {
    const now = Date.now();
    
    // ✅ KRITICKÉ: Ignoruj zprávy od sebe sama
    if (event.data?.tabId === TAB_ID) {
      return;
    }

    // Pokud je to moc brzy od poslední zprávy, odlož to (zvýšeno na 500ms)
    if (now - lastProcessed < 500) {
      if (pendingCallback) {
        clearTimeout(pendingCallback);
      }
      pendingCallback = setTimeout(() => {
        lastProcessed = Date.now();
        callback(event.data);
      }, 500);
      return;
    }

    // Zpracuj okamžitě ale bez zbytečného setTimeout
    lastProcessed = now;
    callback(event.data);
  };

  channel.addEventListener('message', messageHandler);

  // Vrátí cleanup funkci
  return () => {
    channel.removeEventListener('message', messageHandler);
  };
};

/**
 * Typy zpráv pro broadcast
 */
export const BROADCAST_TYPES = {
  // Autentifikace
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  USER_CHANGED: 'USER_CHANGED',

  // Objednávky
  DRAFT_UPDATED: 'DRAFT_UPDATED',
  DRAFT_DELETED: 'DRAFT_DELETED',
  ORDER_SAVED: 'ORDER_SAVED',
  ORDER_LOCKED: 'ORDER_LOCKED',
  ORDER_UNLOCKED: 'ORDER_UNLOCKED',

  // UI Sync
  SECTION_STATE_CHANGED: 'SECTION_STATE_CHANGED',

  // Refresh požadavky
  REFRESH_ORDERS_LIST: 'REFRESH_ORDERS_LIST',
  REFRESH_USER_DATA: 'REFRESH_USER_DATA',

  // Floating Panels (TODO, NOTES)
  TODO_UPDATED: 'TODO_UPDATED',
  NOTES_UPDATED: 'NOTES_UPDATED'
};

/**
 * Helper funkce pro konkrétní broadcast akce
 */
export const broadcastLogin = (userId, username) => {
  broadcastMessage(BROADCAST_TYPES.LOGIN, { userId, username });
};

export const broadcastLogout = () => {
  broadcastMessage(BROADCAST_TYPES.LOGOUT);
};

export const broadcastUserChanged = (oldUserId, newUserId) => {
  broadcastMessage(BROADCAST_TYPES.USER_CHANGED, { oldUserId, newUserId });
};

export const broadcastDraftUpdated = (userId, draftData) => {
  broadcastMessage(BROADCAST_TYPES.DRAFT_UPDATED, { userId, draftData });
};

export const broadcastDraftDeleted = (userId) => {
  broadcastMessage(BROADCAST_TYPES.DRAFT_DELETED, { userId });
};

export const broadcastOrderSaved = (orderId, orderNumber) => {
  broadcastMessage(BROADCAST_TYPES.ORDER_SAVED, { orderId, orderNumber });
};

export const broadcastRefreshOrdersList = () => {
  broadcastMessage(BROADCAST_TYPES.REFRESH_ORDERS_LIST);
};

// Floating Panels broadcasts
export const broadcastTodoUpdated = (userId, tasks) => {
  broadcastMessage(BROADCAST_TYPES.TODO_UPDATED, { userId, tasks, timestamp: Date.now() });
};

export const broadcastNotesUpdated = (userId, notes, transcription) => {
  broadcastMessage(BROADCAST_TYPES.NOTES_UPDATED, { userId, notes, transcription, timestamp: Date.now() });
};

/**
 * Monitor localStorage změn (fallback pro starší prohlížeče)
 * Automaticky detekuje změny v localStorage a aktualizuje stav
 */
export const monitorLocalStorageChanges = (keys, callback) => {
  const handler = (event) => {
    if (keys.includes(event.key) && event.newValue !== event.oldValue) {
      callback({
        key: event.key,
        oldValue: event.oldValue,
        newValue: event.newValue
      });
    }
  };

  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('storage', handler);
  };
};
