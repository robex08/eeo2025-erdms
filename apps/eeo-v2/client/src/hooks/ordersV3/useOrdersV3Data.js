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
  // ✅ Latest-wins: zabrání, aby starší request (např. bez fulltextu) přepsal novější filtrovaný výsledek
  const requestIdRef = useRef(0);
  // ✅ Skutečné zrušení fetch requestu (AbortController)
  const abortControllerRef = useRef(null);
  
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
    // Každé volání dostane vlastní ID; pouze nejnovější request smí měnit state
    const myRequestId = ++requestIdRef.current;

    // ✅ forceRefresh: manuální refresh z DB má obejít cache i deduplikaci
    const forceRefresh = Boolean(params?.forceRefresh);

    // Nevkládat do signature ani neposílat do API
    const paramsForRequest = { ...(params || {}) };
    delete paramsForRequest.forceRefresh;

    // Create request signature for deduplication (bez interních flagů)
    const requestSignature = JSON.stringify(paramsForRequest);
    
    // ✅ DEDUPLICATION: Pokud je stejný request již v běhu, počkej na něj
    if (!forceRefresh && currentRequestRef.current && lastRequestParamsRef.current === requestSignature) {
      // console.log('🔄 Request deduplication: waiting for existing request...');
      return currentRequestRef.current;
    }
    
    // ✅ CACHE CHECK: Zkontroluj cache pro rychlé výsledky
    // Pro fulltext search kratší expiraci (500ms), jinak 2s
    const hasFulltext = params.filters?.fulltext_search;
    const cacheExpiration = hasFulltext ? 500 : 2000; // 500ms pro fulltext, 2s pro ostatní
    
    const cached = cacheRef.current.get(requestSignature);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < cacheExpiration)) {
      // Použij pouze pokud je to stále nejnovější volání
      if (myRequestId === requestIdRef.current) {
        setData(cached.data.orders || []);
        setStats(cached.data.stats || null);
        setUnfilteredStats(cached.data.unfilteredStats || null);
        setPagination(cached.data.pagination || null);
        setError(null);
      }
      return cached;
    }
    
    // ✅ NEW REQUEST: Start new API call
    // Pokud běží předchozí request (s jiným podpisem), zruš ho.
    // Pozn.: dedup pro stejný podpis je řešen výše.
    try {
      abortControllerRef.current?.abort();
    } catch {
      // ignore
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    showProgress?.();
    
    // Store request info
    lastRequestParamsRef.current = requestSignature;
    
    const requestPromise = (async () => {
      try {
        // Přidej AbortController signal do API params (pokud API funkce podporuje fetch)
        const response = await apiFunction({ ...paramsForRequest, signal: abortControllerRef.current?.signal });
        
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
          
          // Update state (jen pokud je request stále aktuální)
          if (myRequestId === requestIdRef.current) {
            setData(response.data.orders || []);
            setStats(response.data.stats || null);
            setUnfilteredStats(response.data.unfilteredStats || null);
            setPagination(response.data.pagination || null);
            setError(null);
          }
          
          return result;
        } else {
          throw new Error(response.message || 'Invalid API response');
        }
        
      } catch (err) {
        // Fetch byl zrušen - nevypisuj jako chybu
        if (err?.name === 'AbortError') {
          return {
            error: 'aborted',
            timestamp: Date.now(),
            status: REQUEST_STATUS.IDLE
          };
        }
        console.error('❌ API Error:', err);
        
        const errorResult = {
          error: err.message || 'Unknown error',
          timestamp: Date.now(),
          status: REQUEST_STATUS.ERROR
        };
        
        if (myRequestId === requestIdRef.current) {
          setError(err.message || 'Chyba při načítání dat');
        }
        // Keep previous data on error
        
        return errorResult;
        
      } finally {
        // Loading/progress a request refs uklízej jen pokud je to stále nejnovější request
        if (myRequestId === requestIdRef.current) {
          setLoading(false);
          hideProgress?.();
          currentRequestRef.current = null;
          lastRequestParamsRef.current = null;
          abortControllerRef.current = null;
        }
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
      // Invalidate all in-flight requests (latest-wins gate)
      requestIdRef.current++;
      try {
        abortControllerRef.current?.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
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