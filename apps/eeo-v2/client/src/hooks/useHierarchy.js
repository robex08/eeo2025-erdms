/**
 * 🪝 useHierarchy - React Hook pro práci s hierarchií
 * 
 * Jednoduchý hook pro použití v komponentách:
 * 
 * const { config, loading, isActive, message } = useHierarchy(HierarchyModules.ORDERS);
 * 
 * @author GitHub Copilot & robex08
 * @date 15. prosince 2025
 */

import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import hierarchyService, { HierarchyModules, HierarchyStatus } from '../services/hierarchyService';

/**
 * Hook pro načtení hierarchie
 * 
 * @param {string} module - Typ modulu (HierarchyModules.ORDERS, ...)
 * @param {boolean} autoRefresh - Automaticky obnovit při změně auth
 * @returns {{
 *   config: Object|null,
 *   loading: boolean,
 *   error: string|null,
 *   isActive: boolean,
 *   isDisabled: boolean,
 *   isImmune: boolean,
 *   message: string|null,
 *   bannerColor: string,
 *   refresh: Function
 * }}
 */
export const useHierarchy = (module = HierarchyModules.ORDERS, autoRefresh = true) => {
  const { token, username } = useContext(AuthContext);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfig = async (forceRefresh = false) => {
    if (!token || !username) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const hierarchyConfig = await hierarchyService.getHierarchyConfigCached(
        token, 
        username, 
        forceRefresh
      );
      
      setConfig(hierarchyConfig);
      
    } catch (err) {
      console.error('❌ [useHierarchy] Chyba načítání:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRefresh) {
      loadConfig();
    }
  }, [token, username, module, autoRefresh]);

  // Vypočítané hodnoty
  const isActive = config?.status === HierarchyStatus.ACTIVE;
  const isDisabled = config?.status === HierarchyStatus.DISABLED;
  const isImmune = config?.status === HierarchyStatus.IMMUNE;
  const message = config ? hierarchyService.getHierarchyInfoMessage(config, module) : null;
  const bannerColor = config ? hierarchyService.getHierarchyBannerColor(config) : 'info';

  return {
    config,
    loading,
    error,
    isActive,
    isDisabled,
    isImmune,
    message,
    bannerColor,
    refresh: () => loadConfig(true)
  };
};

/**
 * Hook pro kontrolu, zda je hierarchie aktivní pro modul
 * 
 * @param {string} module - Typ modulu
 * @returns {{
 *   isActive: boolean,
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export const useHierarchyModule = (module) => {
  const { config, loading, error } = useHierarchy(module);
  
  const isActive = config?.modules?.[module] || false;
  
  return {
    isActive,
    loading,
    error
  };
};

export default useHierarchy;
