import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * Background Tasks Context
 *
 * Poskytuje centralizované callbacky pro background úlohy,
 * které mohou být volány z různých komponent.
 *
 * Použití:
 * - App.js registruje background tasky
 * - Orders25List si zaregistruje callback pro refresh
 * - Po uložení objednávky ve OrderForm25 se zavolá trigger
 */

const BackgroundTasksContext = createContext(null);

export const useBackgroundTasks = () => {
  const context = useContext(BackgroundTasksContext);
  if (!context) {
    return null;
  }
  return context;
};

export const BackgroundTasksProvider = ({ children }) => {
  // Počet nepřečtených notifikací
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  // Barva badge u zvonečku podle priority notifikací
  const [notificationsBadgeColor, setNotificationsBadgeColor] = useState('gray');

  // Reference na callbacky pro jednotlivé úlohy
  const ordersRefreshCallbackRef = useRef(null);
  const notificationsCallbackRef = useRef(null);
  const newNotificationsCallbackRef = useRef(null);
  const getCurrentFiltersCallbackRef = useRef(null);  // ← Nový ref pro getCurrentFilters

  /**
   * Registrace callback pro refresh objednávek
   * Volá Orders25List při mount
   */
  const registerOrdersRefreshCallback = useCallback((callback) => {
    ordersRefreshCallbackRef.current = callback;
  }, []);

  /**
   * Registrace callback pro získání aktuálních filtrů (ROK, OBDOBÍ, ARCHIV)
   * Volá Orders25List při mount
   */
  const registerGetCurrentFiltersCallback = useCallback((callback) => {
    getCurrentFiltersCallbackRef.current = callback;
  }, []);

  /**
   * Odregistrace callback
   */
  const unregisterOrdersRefreshCallback = useCallback(() => {
    ordersRefreshCallbackRef.current = null;
  }, []);

  /**
   * Registrace callback pro notifikace
   */
  const registerNotificationsCallback = useCallback((callback) => {
    notificationsCallbackRef.current = callback;
  }, []);

  /**
   * Registrace callback pro nové notifikace (pro toast)
   */
  const registerNewNotificationsCallback = useCallback((callback) => {
    newNotificationsCallbackRef.current = callback;
  }, []);

  /**
   * Volání orders refresh callbacku
   * Používá se z background task nebo po uložení objednávky
   */
  const triggerOrdersRefresh = useCallback((ordersData) => {
    if (ordersRefreshCallbackRef.current) {
      try {
        ordersRefreshCallbackRef.current(ordersData);
      } catch (error) {
      }
    }
  }, []);

  /**
   * Získání aktuálních filtrů (ROK, OBDOBÍ, ARCHIV) z Orders25List
   * Používá se v background task před voláním API
   */
  const getCurrentFilters = useCallback(() => {
    if (getCurrentFiltersCallbackRef.current) {
      try {
        return getCurrentFiltersCallbackRef.current();
      } catch (error) {
        return {};  // Fallback při chybě
      }
    }
    return {};  // Fallback když callback není registrován
  }, []);

  /**
   * Callback pro změnu počtu nepřečtených notifikací s informací o barvě badge
   */
  const handleUnreadCountChange = useCallback((count, badgeColor = 'gray') => {
    console.log('🎯 [BackgroundTasksContext] handleUnreadCountChange called:', { count, badgeColor });
    setUnreadNotificationsCount(count);
    setNotificationsBadgeColor(badgeColor);
    console.log('🎯 [BackgroundTasksContext] State updated:', { 
      unreadNotificationsCount: count, 
      notificationsBadgeColor: badgeColor 
    });

    if (notificationsCallbackRef.current) {
      try {
        notificationsCallbackRef.current(count, badgeColor);
      } catch (error) {
        console.error('❌ [BackgroundTasksContext] Error in callback:', error);
      }
    }
  }, []);

  /**
   * Callback pro nové notifikace (zobrazení toast)
   */
  const handleNewNotifications = useCallback((notifications, unreadCount) => {
    if (newNotificationsCallbackRef.current) {
      try {
        newNotificationsCallbackRef.current(notifications, unreadCount);
      } catch (error) {
      }
    }
  }, []);

  /**
   * Manuální refresh notifikací
   * Volá se např. po kliknutí na tlačítko "Obnovit" v seznamu objednávek
   */
  const triggerNotificationsRefresh = useCallback(() => {
    if (notificationsCallbackRef.current) {
      try {
        notificationsCallbackRef.current();
      } catch (error) {
      }
    }
  }, []);

  const value = {
    // State
    unreadNotificationsCount,
    notificationsBadgeColor,

    // Registrace callbacků
    registerOrdersRefreshCallback,
    unregisterOrdersRefreshCallback,
    registerGetCurrentFiltersCallback,  // ← Nová registrace pro getCurrentFilters
    registerNotificationsCallback,
    registerNewNotificationsCallback,

    // Gettery
    getCurrentFilters,  // ← Funkce pro získání aktuálních filtrů

    // Triggery
    triggerOrdersRefresh,
    handleUnreadCountChange,
    handleNewNotifications,
    triggerNotificationsRefresh  // NOVÁ funkce pro manuální refresh
  };

  return (
    <BackgroundTasksContext.Provider value={value}>
      {children}
    </BackgroundTasksContext.Provider>
  );
};

export default BackgroundTasksContext;
