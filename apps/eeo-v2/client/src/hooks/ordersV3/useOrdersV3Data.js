/**
 * useOrdersV3Data.js
 * 
 * 🚀 OPTIMALIZACE: Deduplikovaný data fetching s request caching
 * Eliminuje race conditions a duplicitní API calls
 */

import { useState, useCallback, useRef } from 'react';

/**
 * Request status constants
 */
const REQUEST_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Optimalizovaný data fetching hook s request deduplication
 * 
 * @param {Function} apiFunction - API funkce pro volání
 * @param {Function} showProgress - Progress callback
 * @param {Function} hideProgress - Hide progress callback
 * @returns {Object} Data loading state a funkce
 */
export function useOrdersV3Data(apiFunction, showProgress, hideProgress) {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [unfilteredStats, setUnfilteredStats] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Request management
  const currentRequestRef = useRef(null);
  const lastRequestParamsRef = useRef(null);
  const cacheRef = useRef(new Map());
  
  /**
   * ✅ CACHE INVALIDATION: Vymaže cache při změně filtrů
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    // console.log('🗑️ Cache cleared due to filters change');
  }, []);
  
  /**
   * ✅ OPTIMALIZACE: Deduplikované API volání s cache
   */
  const fetchData = useCallback(async (params) => {
    // Create request signature for deduplication
    const requestSignature = JSON.stringify(params);
    
    // ✅ DEDUPLICATION: Pokud je stejný request již v běhu, počkej na něj
    if (currentRequestRef.current && lastRequestParamsRef.current === requestSignature) {
      // console.log('🔄 Request deduplication: waiting for existing request...');
      return currentRequestRef.current;
    }
    
    // ✅ CACHE CHECK: Zkontroluj cache pro rychlé výsledky
    // Pro fulltext search kratší expiraci (500ms), jinak 2s
    const hasFulltext = params.filters?.fulltext_search;
    const cacheExpiration = hasFulltext ? 500 : 2000; // 500ms pro fulltext, 2s pro ostatní
    
    const cached = cacheRef.current.get(requestSignature);
    if (cached && (Date.now() - cached.timestamp < cacheExpiration)) {
      setData(cached.data.orders || []);
      setStats(cached.data.stats || null);
      setPagination(cached.data.pagination || null);
      setError(null);
      return cached;
    }
    
    // ✅ NEW REQUEST: Start new API call
    setLoading(true);
    setError(null);
    showProgress?.();
    
    // Store request info
    lastRequestParamsRef.current = requestSignature;
    
    const requestPromise = (async () => {
      try {
        const response = await apiFunction(params);
        
        // ✅ SUCCESS: Store data and cache result
        if (response.status === 'success' && response.data) {
          const result = {
            data: response.data,
            timestamp: Date.now(),
            status: REQUEST_STATUS.SUCCESS
          };
          
          // Update cache
          cacheRef.current.set(requestSignature, result);
          
          // Clean old cache entries (keep max 50 entries)
          if (cacheRef.current.size > 50) {
            const oldestKey = cacheRef.current.keys().next().value;
            cacheRef.current.delete(oldestKey);
          }
          
          // Update state
          setData(response.data.orders || []);
          setStats(response.data.stats || null);
          setUnfilteredStats(response.data.unfilteredStats || null);
          setPagination(response.data.pagination || null);
          setError(null);
          
          return result;
        } else {
          throw new Error(response.message || 'Invalid API response');
        }
        
      } catch (err) {
        console.error('❌ API Error:', err);
        
        const errorResult = {
          error: err.message || 'Unknown error',
          timestamp: Date.now(),
          status: REQUEST_STATUS.ERROR
        };
        
        setError(err.message || 'Chyba při načítání dat');
        // Keep previous data on error
        
        return errorResult;
        
      } finally {
        setLoading(false);
        hideProgress?.();
        // Clear current request ref
        currentRequestRef.current = null;
        lastRequestParamsRef.current = null;
      }
    })();
    
    // Store promise for deduplication
    currentRequestRef.current = requestPromise;
    
    return requestPromise;
  }, [apiFunction, showProgress, hideProgress]);
  
  /**
   * ✅ OPTIMALIZACE: Cancel current request
   */
  const cancelCurrentRequest = useCallback(() => {
    if (currentRequestRef.current) {
      // console.log('🚫 Cancelling current request...');
      currentRequestRef.current = null;
      lastRequestParamsRef.current = null;
      setLoading(false);
      hideProgress?.();
    }
  }, [hideProgress]);
  
  /**
   * ✅ OPTIMALIZACE: Get cache status for debugging
   */
  const getCacheInfo = useCallback(() => {
    return {
      size: cacheRef.current.size,
      keys: [...cacheRef.current.keys()],
      isRequestInProgress: !!currentRequestRef.current,
      lastRequestParams: lastRequestParamsRef.current
    };
  }, []);
  
  return {
    // Data
    data,
    stats,
    unfilteredStats,
    pagination,
    loading,
    error,
    
    // Actions
    fetchData,
    cancelCurrentRequest,
    clearCache,
    
    // Debug
    getCacheInfo,
    
    // Status
    isRequestInProgress: !!currentRequestRef.current,
  };
}

export default useOrdersV3Data;