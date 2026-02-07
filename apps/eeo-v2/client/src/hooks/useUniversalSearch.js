/**
 * Hook pro univerzální vyhledávání s debounce
 * 
 * Funkce:
 * - Debounce 500ms (nehledá při každém stisku klávesy)
 * - Enter = okamžité hledání (přeskočí debounce)
 * - Loading state
 * - Error handling
 * - Min 3 znaky pro vyhledávání
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { universalSearch } from '../services/apiUniversalSearch';

export const useUniversalSearch = (onSearchSuccess = null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState('');
  
  const debounceTimer = useRef(null);
  const abortController = useRef(null);

  /**
   * Zruš probíhající request
   */
  const cancelRequest = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  /**
   * Provede vyhledávání
   */
  const search = useCallback(async (searchQuery, options = {}) => {
    // Validace
    if (!searchQuery || searchQuery.length < 4) {
      setError('Zadejte alespoň 4 znaky');
      setResults(null);
      return;
    }

    // Zruš předchozí request
    cancelRequest();

    setLoading(true);
    setError(null);

    try {
      const data = await universalSearch({
        query: searchQuery,
        ...options
      });

      // ✅ OPRAVA: Backend posílá "categories" místo "results"
      setResults(data);
      setError(null);
      
      // Zavolej callback po úspěšném vyhledání
      if (onSearchSuccess && typeof onSearchSuccess === 'function') {
        onSearchSuccess(searchQuery, data.categories || {});
      }
    } catch (err) {
      console.error('❌ useUniversalSearch error:', err);
      setError(err.message || 'Nastala chyba při vyhledávání');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [cancelRequest, onSearchSuccess]);

  /**
   * Debounced search - čeká 500ms před provedením
   */
  const debouncedSearch = useCallback((searchQuery, options = {}) => {
    // Vyčisti předchozí timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Validace délky
    if (searchQuery.length < 4) {
      if (searchQuery.length > 0) {
        setError('Zadejte alespoň 4 znaky');
      } else {
        setError(null);
      }
      setResults(null);
      return;
    }

    // Nastav nový timer
    debounceTimer.current = setTimeout(() => {
      search(searchQuery, options);
    }, 500);
  }, [search]);

  /**
   * Immediate search - bez debounce (pro Enter)
   */
  const immediateSearch = useCallback((searchQuery, options = {}) => {
    // Zruš debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    search(searchQuery, options);
  }, [search]);

  /**
   * Vyčisti výsledky a error
   */
  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setQuery('');
    
    // Zruš timery a requesty
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    cancelRequest();
  }, [cancelRequest]);

  /**
   * Update query state
   */
  const updateQuery = useCallback((newQuery) => {
    setQuery(newQuery);
    
    if (!newQuery || newQuery.length === 0) {
      clearResults();
    }
  }, [clearResults]);

  /**
   * Cleanup při unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      cancelRequest();
    };
  }, [cancelRequest]);

  return {
    query,
    updateQuery,
    search: debouncedSearch,
    immediateSearch,
    loading,
    error,
    results,
    clearResults,
    // Pomocné hodnoty
    hasResults: results !== null && results.total_results > 0,
    isEmpty: results !== null && results.total_results === 0
  };
};

export default useUniversalSearch;
