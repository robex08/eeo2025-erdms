/**
 * 🔽 useExpandedRowsV3
 * 
 * Hook pro správu rozbalitelných řádků v Orders V3
 * 
 * Funkce:
 * - ✅ Sledování rozbalených řádků (expandedRows state)
 * - ✅ Persistence do localStorage (per user)
 * - ✅ Lazy loading - detail se načítá až při rozbalení
 * - ✅ Batch reload při mount - postupné načítání uložených rozbalených řádků
 * - ✅ Cache načtených detailů (aby se nenačítalo znovu)
 * 
 * @returns {Object} - { expandedRows, toggleRow, isExpanded, getRowDetail, loadingDetails }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOrderDetailV3 } from '../../services/apiOrderV3';

const STORAGE_KEY_PREFIX = 'ordersV3_expandedRows_user_';
const DETAILS_CACHE_KEY_PREFIX = 'ordersV3_detailsCache_user_';

export const useExpandedRowsV3 = ({ token, username, userId }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [loadingDetails, setLoadingDetails] = useState(new Set());
  const [detailsCache, setDetailsCache] = useState({});
  const [errors, setErrors] = useState({});
  
  // Ref pro zamezení duplicitních načítání
  const fetchingRef = useRef(new Set());
  
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  const cacheKey = `${DETAILS_CACHE_KEY_PREFIX}${userId}`;

  // 💾 Load expanded rows from localStorage při mount
  useEffect(() => {
    if (!userId) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setExpandedRows(new Set(parsed));
        }
      }

      // Load cached details
      const cachedDetails = localStorage.getItem(cacheKey);
      if (cachedDetails) {
        const parsed = JSON.parse(cachedDetails);
        setDetailsCache(parsed);
      }
    } catch (error) {
      console.warn('⚠️ Chyba při načítání rozbalených řádků z localStorage:', error);
    }
  }, [userId, storageKey, cacheKey]);

  // 💾 Save expanded rows to localStorage při změně
  useEffect(() => {
    if (!userId || expandedRows.size === 0) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(expandedRows)));
    } catch (error) {
      console.warn('⚠️ Chyba při ukládání rozbalených řádků do localStorage:', error);
    }
  }, [expandedRows, userId, storageKey]);

  // 💾 Save details cache to localStorage
  useEffect(() => {
    if (!userId || Object.keys(detailsCache).length === 0) return;

    try {
      // Omezit velikost cache - max 50 items
      const entries = Object.entries(detailsCache);
      if (entries.length > 50) {
        const limited = Object.fromEntries(entries.slice(-50));
        localStorage.setItem(cacheKey, JSON.stringify(limited));
      } else {
        localStorage.setItem(cacheKey, JSON.stringify(detailsCache));
      }
    } catch (error) {
      console.warn('⚠️ Chyba při ukládání cache detailů do localStorage:', error);
    }
  }, [detailsCache, userId, cacheKey]);

  // 📥 Načtení detailu objednávky (lazy loading)
  const loadOrderDetail = useCallback(async (orderId) => {
    console.log(`📥 [LOAD] Starting load for order ${orderId}`);
    
    // Pokud už je v cache, nemusíme načítat
    if (detailsCache[orderId]) {
      console.log(`✅ [LOAD] Order ${orderId} found in cache, returning cached data`);
      return detailsCache[orderId];
    }

    // Pokud se právě načítá, počkáme
    if (fetchingRef.current.has(orderId)) {
      console.log(`⏳ [LOAD] Order ${orderId} is already being fetched, skipping`);
      return null;
    }

    console.log(`🌐 [LOAD] Fetching order ${orderId} from API...`);
    
    // Označíme že se načítá
    fetchingRef.current.add(orderId);
    setLoadingDetails(prev => new Set([...prev, orderId]));

    try {
      const detail = await getOrderDetailV3({ 
        token, 
        username, 
        orderId 
      });

      // Uložíme do cache
      setDetailsCache(prev => ({
        ...prev,
        [orderId]: detail
      }));

      // Odstraníme z loading
      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });

      fetchingRef.current.delete(orderId);

      return detail;
    } catch (error) {
      console.error(`❌ Chyba při načítání detailu objednávky ${orderId}:`, error);
      
      setErrors(prev => ({
        ...prev,
        [orderId]: error.message || 'Chyba při načítání detailu'
      }));

      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });

      fetchingRef.current.delete(orderId);

      return null;
    }
  }, [token, username, detailsCache]);

  // 🔽 Toggle row expansion
  const toggleRow = useCallback(async (orderId) => {
    const isCurrentlyExpanded = expandedRows.has(orderId);

    if (isCurrentlyExpanded) {
      // Sbalit
      setExpandedRows(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    } else {
      // Rozbalit a načíst detail
      setExpandedRows(prev => new Set([...prev, orderId]));
      
      // Načíst detail pokud není v cache
      if (!detailsCache[orderId]) {
        await loadOrderDetail(orderId);
      }
    }
  }, [expandedRows, detailsCache, loadOrderDetail]);

  // ❓ Check if row is expanded
  const isExpanded = useCallback((orderId) => {
    return expandedRows.has(orderId);
  }, [expandedRows]);

  // 📖 Get cached detail for order
  const getRowDetail = useCallback((orderId) => {
    return detailsCache[orderId] || null;
  }, [detailsCache]);

  // 🔄 Refresh detail (force reload)
  const refreshDetail = useCallback(async (orderId) => {
    console.log(`🔄 [REFRESH] Starting refresh for order ${orderId}`);
    
    // Vyčistit fetchingRef (důležité!)
    fetchingRef.current.delete(orderId);
    
    // Vyčistit loading state
    setLoadingDetails(prev => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
    
    // Vyčistit error pro tento order
    setErrors(prev => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });

    // Odstranit z cache
    setDetailsCache(prev => {
      const next = { ...prev };
      delete next[orderId];
      console.log(`🔄 [REFRESH] Cache cleared for order ${orderId}`);
      return next;
    });

    // Vyčistit z localStorage cache
    try {
      const cachedDetails = localStorage.getItem(cacheKey);
      if (cachedDetails) {
        const parsed = JSON.parse(cachedDetails);
        delete parsed[orderId];
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
        console.log(`🔄 [REFRESH] localStorage cache cleared for order ${orderId}`);
      }
    } catch (error) {
      console.warn('⚠️ Chyba při čištění cache v localStorage:', error);
    }

    // PŘÍMO volat API (nepoužívat loadOrderDetail kvůli closure problému)
    console.log(`🔄 [REFRESH] Calling API directly for order ${orderId}`);
    
    // Označíme že se načítá
    fetchingRef.current.add(orderId);
    setLoadingDetails(prev => new Set([...prev, orderId]));

    try {
      const detail = await getOrderDetailV3({ 
        token, 
        username, 
        orderId 
      });

      console.log(`✅ [REFRESH] API response received for order ${orderId}`);

      // Uložíme do cache
      setDetailsCache(prev => ({
        ...prev,
        [orderId]: detail
      }));

      // Odstraníme z loading
      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });

      fetchingRef.current.delete(orderId);

      return detail;
    } catch (error) {
      console.error(`❌ [REFRESH] Error loading order ${orderId}:`, error);
      
      setErrors(prev => ({
        ...prev,
        [orderId]: error.message || 'Chyba při načítání detailu'
      }));

      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });

      fetchingRef.current.delete(orderId);

      return null;
    }
  }, [token, username, cacheKey]);

  // 🗑️ Clear cache
  const clearCache = useCallback(() => {
    setDetailsCache({});
    try {
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('⚠️ Chyba při mazání cache detailů z localStorage:', error);
    }
  }, [cacheKey]);

  // 🗑️ Clear expanded rows
  const clearExpanded = useCallback(() => {
    setExpandedRows(new Set());
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('⚠️ Chyba při mazání rozbalených řádků z localStorage:', error);
    }
  }, [storageKey]);

  return {
    // State
    expandedRows: Array.from(expandedRows),
    loadingDetails: Array.from(loadingDetails),
    errors,
    
    // Functions
    toggleRow,
    isExpanded,
    getRowDetail,
    loadOrderDetail, // 🆕 Přidáno pro explicitní načtení detailu
    refreshDetail,
    clearCache,
    clearExpanded,
    
    // Stats
    expandedCount: expandedRows.size,
    cachedCount: Object.keys(detailsCache).length
  };
};

export default useExpandedRowsV3;
