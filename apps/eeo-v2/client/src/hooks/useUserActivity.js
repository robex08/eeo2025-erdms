import { useEffect, useRef, useCallback } from 'react';
import { updateUserActivity, api2NoInterceptor } from '../services/api2auth';

/**
 * Hook pro sledování aktivity uživatele
 *
 * Automaticky:
 * - 💓 KEEPALIVE: Ping každých 5 minut (BEZ validace, jen "user is alive")
 * - ⏰ ACTIVITY UPDATE: Ping každou 1 hodinu (S možností token refresh)
 * - Volá update aktivity při save operacích (přes triggerActivity)
 * - Update při mount (simulace loginu/page refresh)
 * 
 * ✅ TOKEN AUTO-REFRESH (17.11.2025):
 * - Pokud backend vrátí new_token, automaticky se uloží přes onTokenRefresh callback
 * - Uživatel pokračuje bez přerušení (transparentní refresh)
 *
 * 💓 KEEPALIVE (27.1.2026):
 * - Každých 5 minut jednoduchý ping na backend
 * - BEZ token validace nebo refresh (rychlý, lightweight)
 * - Ukazuje že user je aktivní/online v reálném čase
 * - Tiché selhání (není kritický)
 *
 * @param {string} token - Auth token
 * @param {string} username - Username uživatele
 * @param {Function} onTokenRefresh - Callback pro update tokenu (volitelný)
 * @returns {Object} - { triggerActivity } pro manuální trigger
 */
export const useUserActivity = (token, username, onTokenRefresh = null) => {
  const intervalRef = useRef(null);
  const keepaliveIntervalRef = useRef(null);
  const lastActivityRef = useRef(null);
  const lastKeepaliveRef = useRef(null);

  // Funkce pro update aktivity (s token refresh)
  const updateActivity = useCallback(async () => {
    if (!token || !username) return;

    const now = Date.now();
    // Prevence příliš častých volání (min 10 sekund mezi voláními)
    if (lastActivityRef.current && (now - lastActivityRef.current) < 10000) {
      return;
    }

    lastActivityRef.current = now;

    try {
      const result = await updateUserActivity({ token, username });
      
      // ✅ TOKEN AUTO-REFRESH: Pokud backend vrátil new_token, aktualizuj ho
      if (result && result.new_token && onTokenRefresh) {
        onTokenRefresh(result.new_token);
      }
    } catch (error) {
      console.error('❌ Activity update failed:', error);
      // Tiché selhání
    }
  }, [token, username, onTokenRefresh]);

  // 🔔 KEEPALIVE: Jednoduchý ping každých 5 minut - BEZ validace, jen signál že user je online
  const sendKeepalive = useCallback(async () => {
    if (!token || !username) return;

    const now = Date.now();
    // Prevence duplikátních pingů (min 30 sekund mezi pingy)
    if (lastKeepaliveRef.current && (now - lastKeepaliveRef.current) < 30000) {
      return;
    }

    lastKeepaliveRef.current = now;

    try {
      // Jednoduchý ping endpoint - ŽÁDNÁ validace, jen záznam "user is alive"
      await api2NoInterceptor.post('user/keepalive', {
        token,
        username,
        timestamp: new Date().toISOString()
      }, { 
        timeout: 5000, // Krátký timeout pro keepalive
        // Suppress všechny errory - keepalive není kritický
        validateStatus: () => true
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('💓 Keepalive ping sent');
      }
    } catch (error) {
      // Úplně tichá chyba - keepalive není kritický
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Keepalive ping failed (non-critical):', error.message);
      }
    }
  }, [token, username]);

  // Funkce kterou můžou komponenty volat při save operacích
  const triggerActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    if (!token || !username) return;

    // Okamžitý update při mount (simulace login/refresh)
    updateActivity();
    
    // Okamžitý keepalive při mount
    sendKeepalive();

    // ✅ Background ping každou hodinu (s token refresh možností)
    // Interval 1h zajišťuje:
    // - Aktuální aktivitu uživatelů (ping každou hodinu)
    // - Minimální zátěž serveru (24 requestů/den místo 480)
    // - Token refresh max 2x v posledních 2h před vypršením (místo 40x při 3min intervalu)
    intervalRef.current = setInterval(() => {
      console.log('⏰ Background ping triggered (1h interval) - with token refresh');
      updateActivity();
    }, 3600000); // 1 hodina = 3 600 000 ms

    // 💓 KEEPALIVE: Jednoduchý ping každých 5 minut
    // - Ukazuje že user je aktivní/online
    // - BEZ token validace nebo refresh (rychlý)
    // - BEZ kritických error handlerů
    // - Minimální zátěž serveru (288 requestů/den)
    keepaliveIntervalRef.current = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('💓 Keepalive ping (5min interval) - no validation');
      }
      sendKeepalive();
    }, 300000); // 5 minut = 300 000 ms

    // Cleanup při unmount
    return () => {
      console.log('🛑 useUserActivity unmounting - stopping activity tracking & keepalive');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (keepaliveIntervalRef.current) {
        clearInterval(keepaliveIntervalRef.current);
      }
    };
  }, [token, username, updateActivity, sendKeepalive]);

  return { triggerActivity };
};
