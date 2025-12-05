import { useEffect, useRef, useCallback } from 'react';
import { updateUserActivity } from '../services/api2auth';

/**
 * Hook pro sledování aktivity uživatele
 *
 * Automaticky:
 * - Pingá server každé 3 minuty (background task)
 * - Volá update aktivity při save operacích (přes triggerActivity)
 * - Update při mount (simulace loginu/page refresh)
 * 
 * ✅ TOKEN AUTO-REFRESH (17.11.2025):
 * - Pokud backend vrátí new_token, automaticky se uloží přes onTokenRefresh callback
 * - Uživatel pokračuje bez přerušení (transparentní refresh)
 *
 * @param {string} token - Auth token
 * @param {string} username - Username uživatele
 * @param {Function} onTokenRefresh - Callback pro update tokenu (volitelný)
 * @returns {Object} - { triggerActivity } pro manuální trigger
 */
export const useUserActivity = (token, username, onTokenRefresh = null) => {
  const intervalRef = useRef(null);
  const lastActivityRef = useRef(null);

  // Funkce pro update aktivity
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
      // Tiché selhání
    }
  }, [token, username, onTokenRefresh]);

  // Funkce kterou můžou komponenty volat při save operacích
  const triggerActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    if (!token || !username) return;

    // Okamžitý update při mount (simulace login/refresh)
    updateActivity();

    // Background task - každé 3 minuty (180000 ms)
    intervalRef.current = setInterval(() => {
      updateActivity();
    }, 180000); // 3 minuty

    // Cleanup při unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token, username, updateActivity]);

  return { triggerActivity };
};
