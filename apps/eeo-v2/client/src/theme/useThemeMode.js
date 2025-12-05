import { useState, useEffect, useCallback } from 'react';

export const useThemeMode = () => {
  const [mode,setMode] = useState(()=>{
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'dark') return 'dark';
      try { const stored = localStorage.getItem('app_theme_mode'); if (stored) return stored; } catch {}
    }
    return 'light';
  });
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem('app_theme_mode', mode); } catch {}
  },[mode]);
  const toggle = useCallback(()=> setMode(m => m === 'light' ? 'dark' : 'light'), []);
  return { mode, toggle };
};

export default useThemeMode;