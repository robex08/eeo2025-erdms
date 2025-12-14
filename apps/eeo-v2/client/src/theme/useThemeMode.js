import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pro řízení light/dark režimu
 * - auto: detekuje systémové nastavení
 * - light: vynucený světlý režim
 * - dark: vynucený tmavý režim
 */
export const useThemeMode = () => {
  // Preference: 'auto', 'light', 'dark'
  const [preference, setPreference] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('app_theme_preference');
        if (stored) return stored;
      } catch {}
    }
    return 'auto';
  });

  // Aktuální režim (vypočítaný z preference)
  const [mode, setMode] = useState('light');

  // Detekce systémového režimu
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateMode = () => {
      if (preference === 'auto') {
        setMode(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setMode(preference);
      }
    };

    updateMode();
    mediaQuery.addEventListener('change', updateMode);
    
    return () => mediaQuery.removeEventListener('change', updateMode);
  }, [preference]);

  // Aplikuj režim na document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  // Uložení preference
  useEffect(() => {
    try {
      localStorage.setItem('app_theme_preference', preference);
    } catch {}
  }, [preference]);

  const setThemePreference = useCallback((pref) => {
    setPreference(pref);
  }, []);

  const toggle = useCallback(() => {
    setMode(m => m === 'light' ? 'dark' : 'light');
  }, []);

  return { mode, preference, setThemePreference, toggle };
};

export default useThemeMode;