/**
 * DictionaryCacheContext - Centrální cache pro všechny číselníky
 * Načítá data jednou při vstupu do sekce Číselníky a ukládá do memory
 * Refresh pouze přes tlačítko "Obnovit"
 *
 * @date 2025-10-24
 */

import React, { createContext, useState, useCallback, useContext } from 'react';
import { AuthContext } from './AuthContext';
import {
  getUsekyList,
  getStavyList,
  getPoziceList,
  getRoleListEnriched,
  getPravaList,
  getLokalityList,
  getOrganizaceList,
} from '../services/apiv2Dictionaries';

export const DictionaryCacheContext = createContext();

export const DictionaryCacheProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext);

  // Cache states pro každý číselník
  const [cache, setCache] = useState({
    useky: { data: null, loading: false, loaded: false, error: null },
    stavy: { data: null, loading: false, loaded: false, error: null },
    pozice: { data: null, loading: false, loaded: false, error: null },
    role: { data: null, loading: false, loaded: false, error: null },
    prava: { data: null, loading: false, loaded: false, error: null },
    lokality: { data: null, loading: false, loaded: false, error: null },
    organizace: { data: null, loading: false, loaded: false, error: null },
  });

  // Globální loading state pro první načtení všech číselníků
  const [isInitializing, setIsInitializing] = useState(false);

  /**
   * Načte konkrétní číselník
   */
  const loadDictionary = useCallback(async (dictionaryType, force = false) => {
    if (!token || !user) return;

    // Pokud už je načtený a není force, vrátíme cache
    if (cache[dictionaryType]?.loaded && !force) {
      return cache[dictionaryType].data;
    }

    // Nastavíme loading state
    setCache(prev => ({
      ...prev,
      [dictionaryType]: { ...prev[dictionaryType], loading: true, error: null }
    }));

    try {
      let data = null;
      const username = user?.username;

      switch (dictionaryType) {
        case 'useky':
          data = await getUsekyList({ token, username });
          break;
        case 'stavy':
          data = await getStavyList({ token, username });
          break;
        case 'pozice':
          data = await getPoziceList({ token, username });
          break;
        case 'role':
          data = await getRoleListEnriched({ token, username });
          break;
        case 'prava':
          data = await getPravaList({ token, username });
          break;
        case 'lokality':
          data = await getLokalityList({ token, username });
          break;
        case 'organizace':
          data = await getOrganizaceList({ token, username });
          break;
        default:
          throw new Error(`Unknown dictionary type: ${dictionaryType}`);
      }

      setCache(prev => ({
        ...prev,
        [dictionaryType]: {
          data,
          loading: false,
          loaded: true,
          error: null
        }
      }));

      return data;
    } catch (error) {
      setCache(prev => ({
        ...prev,
        [dictionaryType]: {
          ...prev[dictionaryType],
          loading: false,
          error: error.message || 'Chyba při načítání'
        }
      }));
      throw error;
    }
  }, [token, user, cache]);

  /**
   * Načte všechny číselníky najednou (při prvním vstupu)
   */
  const loadAllDictionaries = useCallback(async () => {
    if (!token || !user) return;

    setIsInitializing(true);

    const dictionaryTypes = ['useky', 'stavy', 'pozice', 'role', 'prava', 'lokality', 'organizace'];

    try {
      await Promise.all(
        dictionaryTypes.map(type => loadDictionary(type, true))
      );
    } catch (error) {
    } finally {
      setIsInitializing(false);
    }
  }, [token, user, loadDictionary]);

  /**
   * Refresh konkrétního číselníku
   */
  const refreshDictionary = useCallback(async (dictionaryType) => {
    return loadDictionary(dictionaryType, true);
  }, [loadDictionary]);

  /**
   * Refresh všech číselníků
   */
  const refreshAllDictionaries = useCallback(async () => {
    return loadAllDictionaries();
  }, [loadAllDictionaries]);

  /**
   * Vyčistí cache (např. při odhlášení)
   */
  const clearCache = useCallback(() => {
    setCache({
      useky: { data: null, loading: false, loaded: false, error: null },
      stavy: { data: null, loading: false, loaded: false, error: null },
      pozice: { data: null, loading: false, loaded: false, error: null },
      role: { data: null, loading: false, loaded: false, error: null },
      prava: { data: null, loading: false, loaded: false, error: null },
      lokality: { data: null, loading: false, loaded: false, error: null },
      organizace: { data: null, loading: false, loaded: false, error: null },
    });
  }, []);

  /**
   * Invaliduje cache pro konkrétní číselník (po CRUD operaci)
   */
  const invalidateCache = useCallback((dictionaryType) => {
    setCache(prev => ({
      ...prev,
      [dictionaryType]: { ...prev[dictionaryType], loaded: false }
    }));
  }, []);

  const value = {
    cache,
    isInitializing,
    loadDictionary,
    loadAllDictionaries,
    refreshDictionary,
    refreshAllDictionaries,
    clearCache,
    invalidateCache,
  };

  return (
    <DictionaryCacheContext.Provider value={value}>
      {children}
    </DictionaryCacheContext.Provider>
  );
};
