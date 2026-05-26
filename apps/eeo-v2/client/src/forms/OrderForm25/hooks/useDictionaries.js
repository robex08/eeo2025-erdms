/**
 * 📚 useDictionaries Hook
 * Načítá všechny číselníky paralelně a řídí jejich stav
 */

import { useReducer, useCallback, useEffect, useRef } from 'react';
import {
  dictionariesReducer,
  initialDictionariesState,
  DICTIONARIES_ACTIONS,
  areAllDictionariesLoaded
} from '../reducers';

// Import API funkcí
import { fetchAllUsers, fetchApprovers, fetchLimitovanePrisliby } from '../../../services/api2auth';
import {
  getStrediska25,
  getFinancovaniZdroj25,
  getDruhyObjednavky25,
  getTypyPriloh25,
  getTypyFaktur25,
  getStavyWorkflow25
} from '../../../services/api25orders';

export const useDictionaries = ({ token, username, enabled = true }) => {
  const [state, dispatch] = useReducer(dictionariesReducer, initialDictionariesState);
  const loadingRef = useRef(false); // Prevence duplicitního načítání
  const resolveRef = useRef(null);
  const promiseRef = useRef(null);
  const abortControllerRef = useRef(null); // 🔴 AbortController pro cancellation

  // 🎯 Hlavní funkce pro načtení všech číselníků paralelně
  const loadAll = useCallback(async () => {
    if (!token || !username) {
      return false;
    }

    if (loadingRef.current) {
      // Already loading - vrátíme existující promise
      return promiseRef.current;
    }

    loadingRef.current = true;

    // 🔴 AbortController DISABLED - způsoboval problémy s StrictMode remount
    // abortControllerRef.current = new AbortController();
    // const signal = abortControllerRef.current.signal;
    const signal = { aborted: false }; // Dummy signal - vždy false, nikdy neabortuje

    // Vytvoř Promise který se resolve až když jsou všechny číselníky načtené
    if (!promiseRef.current) {
      promiseRef.current = new Promise((resolve) => {
        resolveRef.current = resolve;
      });
    }

    try {
      // Paralelní načtení všech číselníků
      const results = await Promise.allSettled([
        // 1. All Users (including inactive - filtering done in OrderForm25)
        (async () => {
          if (signal.aborted) return { key: 'users', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'users' } });
            const users = await fetchAllUsers({ token, username, show_inactive: true }); // ⚠️ TODO: API nepodporuje signal zatím
            if (signal.aborted) return { key: 'users', success: false, cancelled: true };

            // ✅ Bez SYSTEM uživatele - přidá se dynamicky jen u archivovaných objednávek
            dispatch({ type: DICTIONARIES_ACTIONS.SET_USERS, payload: users || [] });
            return { key: 'users', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'users', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'users', error: error.message } });
            return { key: 'users', success: false, error };
          }
        })(),

        // 2. Approvers
        (async () => {
          if (signal.aborted) return { key: 'approvers', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'approvers' } });
            const approvers = await fetchApprovers({ token, username }); // ⚠️ TODO: API nepodporuje signal zatím
            if (signal.aborted) return { key: 'approvers', success: false, cancelled: true };

            // ✅ Bez SYSTEM uživatele - přidá se dynamicky jen u archivovaných objednávek
            dispatch({ type: DICTIONARIES_ACTIONS.SET_APPROVERS, payload: approvers || [] });
            return { key: 'approvers', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'approvers', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'approvers', error: error.message } });
            return { key: 'approvers', success: false, error };
          }
        })(),

        // 3. Střediska
        (async () => {
          if (signal.aborted) return { key: 'strediska', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'strediska' } });
            const strediska = await getStrediska25({ token, username }); // ⚠️ TODO: API nepodporuje signal zatím
            if (signal.aborted) return { key: 'strediska', success: false, cancelled: true };
            dispatch({ type: DICTIONARIES_ACTIONS.SET_STREDISKA, payload: strediska || [] });
            return { key: 'strediska', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'strediska', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'strediska', error: error.message } });
            return { key: 'strediska', success: false, error };
          }
        })(),

        // 4. Financování
        (async () => {
          if (signal.aborted) return { key: 'financovani', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'financovani' } });
            const financovani = await getFinancovaniZdroj25({ token, username }); // ⚠️ TODO: API nepodporuje signal zatím
            if (signal.aborted) return { key: 'financovani', success: false, cancelled: true };
            dispatch({ type: DICTIONARIES_ACTIONS.SET_FINANCOVANI, payload: financovani || [] });
            return { key: 'financovani', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'financovani', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'financovani', error: error.message } });
            return { key: 'financovani', success: false, error };
          }
        })(),

        // 5. Druhy objednávky
        (async () => {
          if (signal.aborted) return { key: 'druhy', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'druhy' } });
            const druhyData = await getDruhyObjednavky25({ token, username }); // ⚠️ TODO: API nepodporuje signal zatím
            if (signal.aborted) return { key: 'druhy', success: false, cancelled: true };
            // ✅ OPRAVA: druhyData je už pole (stejně jako getFinancovaniZdroj25), ne objekt s property .data
            const druhyOptions = druhyData || [];
            dispatch({
              type: DICTIONARIES_ACTIONS.SET_DRUHY,
              payload: { options: druhyOptions, rawData: druhyData }
            });
            return { key: 'druhy', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'druhy', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'druhy', error: error.message } });
            return { key: 'druhy', success: false, error };
          }
        })(),

        // 6. LP Kódy (limitované příslíby) - ✅ Backend filtruje dle modulu (context='orders')
        (async () => {
          if (signal.aborted) return { key: 'lpKody', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'lpKody' } });
            const lpKody = await fetchLimitovanePrisliby({ token, username, context: 'orders' });
            if (signal.aborted) return { key: 'lpKody', success: false, cancelled: true };
            dispatch({ type: DICTIONARIES_ACTIONS.SET_LP_KODY, payload: lpKody || [] });
            return { key: 'lpKody', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'lpKody', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'lpKody', error: error.message } });
            return { key: 'lpKody', success: false, error };
          }
        })(),

        // 7. Typy příloh
        (async () => {
          if (signal.aborted) return { key: 'prilohyTypy', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'prilohyTypy' } });
            const prilohyTypy = await getTypyPriloh25({ token, username }); // ⚠️ TODO: API nepodporuje signal zatím
            if (signal.aborted) return { key: 'prilohyTypy', success: false, cancelled: true };
            dispatch({ type: DICTIONARIES_ACTIONS.SET_PRILOHY_TYPY, payload: prilohyTypy || [] });
            return { key: 'prilohyTypy', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'prilohyTypy', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'prilohyTypy', error: error.message } });
            return { key: 'prilohyTypy', success: false, error };
          }
        })(),

        // 8. Typy faktur - klasifikace příloh (FAKTURA_TYP)
        (async () => {
          if (signal.aborted) return { key: 'typyFaktur', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'typyFaktur' } });
            const typyFaktur = await getTypyFaktur25({ token, username }); // Klasifikace příloh
            if (signal.aborted) return { key: 'typyFaktur', success: false, cancelled: true };
            dispatch({ type: DICTIONARIES_ACTIONS.SET_TYPY_FAKTUR, payload: typyFaktur || [] });
            return { key: 'typyFaktur', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'typyFaktur', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'typyFaktur', error: error.message } });
            return { key: 'typyFaktur', success: false, error };
          }
        })(),

        // 9. Stavy workflow (číselník OBJEDNAVKA)
        (async () => {
          if (signal.aborted) return { key: 'stavyWorkflow', success: false, cancelled: true };
          try {
            dispatch({ type: DICTIONARIES_ACTIONS.START_LOADING, payload: { key: 'stavyWorkflow' } });
            const stavyWorkflow = await getStavyWorkflow25({ token, username }); // ⚠️ TODO: API nepodporuje signal zatím
            if (signal.aborted) return { key: 'stavyWorkflow', success: false, cancelled: true };
            dispatch({ type: DICTIONARIES_ACTIONS.SET_STAVY_WORKFLOW, payload: stavyWorkflow || {} });
            return { key: 'stavyWorkflow', success: true };
          } catch (error) {
            if (error.name === 'AbortError' || signal.aborted) {
              return { key: 'stavyWorkflow', success: false, cancelled: true };
            }
            dispatch({ type: DICTIONARIES_ACTIONS.SET_ERROR, payload: { key: 'stavyWorkflow', error: error.message } });
            return { key: 'stavyWorkflow', success: false, error };
          }
        })()
      ]);

      // Vyhodnocení výsledků (ignorovat cancelled)
      const successful = results.filter(r =>
        r.status === 'fulfilled' &&
        r.value.success &&
        !r.value.cancelled
      ).length;

      const failed = results.filter(r =>
        r.status === 'rejected' ||
        (r.status === 'fulfilled' && !r.value.success && !r.value.cancelled)
      ).length;

      const cancelled = results.filter(r =>
        r.status === 'fulfilled' && r.value.cancelled
      ).length;

      // 🔍 DEBUG: Log které dictionary bylo cancelled
      results.forEach((r, index) => {
        if (r.status === 'fulfilled' && r.value.cancelled) {
        }
      });
      // 🔧 KRITICKÁ KONTROLA: Pokud jsou cancelled users nebo approvers, NEOZNAČIT jako hotové
      const criticalCancelled = results.some(r =>
        r.status === 'fulfilled' &&
        r.value.cancelled &&
        (r.value.key === 'users' || r.value.key === 'approvers')
      );

      if (criticalCancelled) {
        // NEvyřešit promise - lifecycle zůstane v LOADING_DICTIONARIES
        return false;
      }

      // Označit jako hotové (i když některé failovaly - formulář by měl být použitelný)
      dispatch({ type: DICTIONARIES_ACTIONS.ALL_LOADED });

      // 🔧 FIX: Resolve promise VŽDY po dokončení načítání (i když později abort)
      // Jinak se lifecycle nikdy nedostane z LOADING_DICTIONARIES fáze
      if (resolveRef.current) {
        resolveRef.current(true);
      }

      // ✅ Final check pokud mezitím nebylo cancelled (ale promise už je resolved)
      // Disabled - signal.aborted je vždy false
      // if (signal.aborted) {
      //   return false;
      // }

      return true;
    } catch (error) {
      // Kontrola jestli to není cancel error - DISABLED
      // if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
      //   return false;
      // }

      if (resolveRef.current) {
        resolveRef.current(false);
      }
      return false;
    } finally {
      loadingRef.current = false;
    }
  }, [token, username]);

  // Auto-load pokud je enabled
  const loadAllRef = useRef();
  loadAllRef.current = loadAll;

  useEffect(() => {
    if (enabled && token && username && !state.isReady && !loadingRef.current) {
      loadAllRef.current();
    }
  }, [enabled, token, username, state.isReady]); // 🔧 FIX: Use ref to avoid loadAll dependency loop

  // 🔴 Cleanup - abort všechny pending requesty při unmount
  useEffect(() => {
    return () => {
      // ⚠️ Cleanup DISABLED - způsobuje problémy s StrictMode
      // Nechej requesty dokončit, AbortController není potřeba pro tento use case
      // if (abortControllerRef.current) {
      //   abortControllerRef.current.abort();
      // }
    };
  }, []);

  return {
    // State
    ...state,

    // Functions
    loadAll,

    // Abort function pro manuální cancel
    abort: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },

    // Promise pro await v jiných hookách
    readyPromise: promiseRef.current
  };
};
