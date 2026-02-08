/**
 * useOrdersV3State.js
 * 
 * 🚀 OPTIMALIZACE: Centralizovaný state management s useMemo a debounced localStorage
 * Eliminuje 7x useEffect a synchronizuje veškerý state v jednom místě
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ORDERS_V3_CONFIG from '../../constants/ordersV3Config';

const { DEBOUNCE_DELAY, STORAGE_PREFIX } = ORDERS_V3_CONFIG;

/**
 * Consolidated state hook s optimalizovaným localStorage handling
 * 
 * @param {number} userId - User ID pro localStorage keys
 * @returns {Object} State a setter funkce
 */
export function useOrdersV3State(userId) {
  // ⚠️ MIGRACE: Vyčistit staré kombinované filtry při prvním načtení
  useEffect(() => {
    if (!userId) return;
    
    const storageKey = `${STORAGE_PREFIX}_columnFilters_${userId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        let needsCleanup = false;
        
        // Odstranit staré kombinované filtry
        if (filters.objednatel_jmeno !== undefined || filters.garant_jmeno !== undefined) {
          delete filters.objednatel_jmeno;
          delete filters.garant_jmeno;
          needsCleanup = true;
        }
        if (filters.prikazce_jmeno !== undefined || filters.schvalovatel_jmeno !== undefined) {
          delete filters.prikazce_jmeno;
          delete filters.schvalovatel_jmeno;
          needsCleanup = true;
        }
        
        if (needsCleanup) {
          localStorage.setItem(storageKey, JSON.stringify(filters));
          console.log('✅ Migrace: Vyčištěny staré kombinované filtry z localStorage');
        }
      } catch (err) {
        console.warn('Chyba při migraci filtrů:', err);
      }
    }
  }, [userId]); // Spustí se pouze jednou při mountu
  
  // Jediný state objekt místo 7 separátních
  const [preferences, setPreferences] = useState(() => {
    if (!userId) return getDefaultPreferences();
    
    try {
      // Načti všechny preference najednou
      const keys = [
        'showDashboard', 'showFilters', 'dashboardMode', 'showRowColoring',
        'itemsPerPage', 'selectedPeriod', 'columnFilters', 'dashboardFilters',
        'expandedRows', 'columnVisibility', 'columnOrder'
      ];
      
      const saved = {};
      keys.forEach(key => {
        const value = localStorage.getItem(`${STORAGE_PREFIX}_${key}_${userId}`);
        if (value !== null) {
          const parsedValue = key.includes('Filters') || key.includes('expanded') || key.includes('column') 
            ? JSON.parse(value) 
            : (key === 'itemsPerPage' ? parseInt(value, 10) : value);
          saved[key] = parsedValue;
        }
      });
      
      return { ...getDefaultPreferences(), ...saved };
    } catch {
      return getDefaultPreferences();
    }
  });
  
  // Debounced localStorage save
  const saveTimeoutRef = useRef(null);
  
  // Centralizovaný save do localStorage s debounce
  const debouncedSave = useCallback((newPreferences) => {
    if (!userId) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      try {
        Object.entries(newPreferences).forEach(([key, value]) => {
          const storageKey = `${STORAGE_PREFIX}_${key}_${userId}`;
          const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          
          localStorage.setItem(storageKey, stringValue);
        });
      } catch (err) {
        console.warn('Failed to save preferences to localStorage:', err);
      }
    }, DEBOUNCE_DELAY);
  }, [userId]);
  
  // Optimalizovaný setter s batch updates
  const updatePreferences = useCallback((updates) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, ...updates };
      debouncedSave(newPreferences);
      return newPreferences;
    });
  }, [debouncedSave]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    preferences,
    updatePreferences,
    
    // Convenience getters (memoized)
    showDashboard: preferences.showDashboard,
    showFilters: preferences.showFilters,
    dashboardMode: preferences.dashboardMode,
    showRowColoring: preferences.showRowColoring,
    itemsPerPage: preferences.itemsPerPage,
    selectedPeriod: preferences.selectedPeriod,
    columnFilters: preferences.columnFilters,
    dashboardFilters: preferences.dashboardFilters,
    expandedRows: preferences.expandedRows,
    columnVisibility: preferences.columnVisibility,
    columnOrder: preferences.columnOrder,
    
    // Convenience setters (optimized through updatePreferences)
    setDashboardFilters: useCallback((filters) => updatePreferences({ dashboardFilters: filters }), [updatePreferences]),
    setColumnVisibility: useCallback((visibility) => updatePreferences({ columnVisibility: visibility }), [updatePreferences]),
    setColumnOrder: useCallback((order) => updatePreferences({ columnOrder: order }), [updatePreferences]),
    setExpandedRows: useCallback((rows) => updatePreferences({ expandedRows: rows }), [updatePreferences]),
  };
}

function getDefaultPreferences() {
  return ORDERS_V3_CONFIG.DEFAULT_PREFERENCES;
}

export default useOrdersV3State;