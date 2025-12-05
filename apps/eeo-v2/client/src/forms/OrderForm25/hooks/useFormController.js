/**
 * 🎮 useFormController Hook
 * MASTER HOOK - Řídí celou inicializaci a lifecycle formuláře
 */

import { useCallback, useEffect, useRef } from 'react';
import { useFormLifecycle } from './useFormLifecycle';
import { useDictionaries } from './useDictionaries';
import { useOrderDataLoader } from './useOrderDataLoader';
import { useUIState } from './useUIState';
import { LIFECYCLE_PHASES } from '../reducers';

// 🆔 COMPONENT INSTANCE TRACKING
// Každá instance formuláře má vlastní ID
// Window flag obsahuje ID aktuálně běžící inicializace
if (typeof window !== 'undefined') {
  if (!window.__orderFormCurrentInstanceId) {
    window.__orderFormCurrentInstanceId = null;
  }
  if (!window.__orderFormInitInProgress) {
    window.__orderFormInitInProgress = false;
  }
}

export const useFormController = ({
  token,
  username,
  userId,
  editOrderId,
  archivovanoParam,
  onDataLoaded, // Callback když jsou data načtena
  onError, // Callback při chybě
  onReady // Callback když je formulář ready
}) => {
  const lifecycle = useFormLifecycle();
  const dictionaries = useDictionaries({ token, username, enabled: true });
  const orderDataLoader = useOrderDataLoader({ token, username, dictionaries });
  const ui = useUIState();

  // 🆔 Vytvoř unikátní ID pro tuto instanci komponenty
  const instanceIdRef = useRef(`form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // 🔒 Ref-based lock pro prevenci duplicitní inicializace
  const initLockRef = useRef(false);
  const cleanupRef = useRef(false);
  const hasInitializedRef = useRef(false); // ✅ Ref pro tracking zda už proběhla inicializace
  const isMountedRef = useRef(true); // 🎯 Tracking mounting state
  const strictModeUnmountRef = useRef(false); // 🎯 Detekce StrictMode unmount

  // 🔧 REFS pro useEffect - zabránit opakovanému volání
  const lifecycleRef = useRef();
  const dictionariesRef = useRef();
  const orderDataLoaderRef = useRef();
  const onDataLoadedRef = useRef();
  const onErrorRef = useRef();
  const onReadyRef = useRef();

  // Update refs při každém renderu
  lifecycleRef.current = lifecycle;
  dictionariesRef.current = dictionaries;
  orderDataLoaderRef.current = orderDataLoader;
  onDataLoadedRef.current = onDataLoaded;
  onErrorRef.current = onError;
  onReadyRef.current = onReady;

  // 🗑️ REMOVED: initializeForm - moved inline to useEffect to prevent dependency loops

  /**
   * 🧹 CLEANUP EFFECT
   * Samostatný effect pro cleanup aby měl vlastní lifecycle
   */
  useEffect(() => {
    const instanceId = instanceIdRef.current;

    return () => {
      const wasInitializing = window.__orderFormInitInProgress &&
                            window.__orderFormCurrentInstanceId === instanceId;

      // 🎯 STRICTMODE DETECTION
      const timeSinceMount = Date.now() - parseInt(instanceId.split('_')[1]);

      if (timeSinceMount < 100 && wasInitializing) {
        if (process.env.NODE_ENV === 'development') {
        }
        strictModeUnmountRef.current = true;
        return;
      }

      // 🎯 HMR DETECTION - pokud je unmount těsně po mount, je to pravděpodobně HMR
      if (timeSinceMount < 500) {
        if (process.env.NODE_ENV === 'development') {
        }
        // Pro HMR nastavíme cleanup s delším timeoutem
        setTimeout(() => {
          if (window.__orderFormCurrentInstanceId === instanceId) {
            window.__orderFormInitInProgress = false;
            window.__orderFormCurrentInstanceId = null;
          }
          cleanupRef.current = true;
        }, 1000); // Delší timeout pro HMR
        return;
      }

      // Normální cleanup - delayed pro StrictMode safety
      if (process.env.NODE_ENV === 'development') {
      }
      setTimeout(() => {
        if (window.__orderFormCurrentInstanceId === instanceId) {
          window.__orderFormInitInProgress = false;
          window.__orderFormCurrentInstanceId = null;
        }
        cleanupRef.current = true;
      }, 200);
    };
  }, []); // Spustí se jednou při mount/unmount

  /**
   * 🚀 Auto-initialization při mountu
   * Spustí se když jsou token a username dostupné
   *
   * ⚠️ INSTANCE-BASED: Každá instance má vlastní ID
   * 🎯 STRICTMODE DETECTION: Ignoruje StrictMode test unmount
   * 🔄 NAVIGATION FIX: Re-initialize when editOrderId changes
   */
  useEffect(() => {
    console.log('🔍🔍🔍 [useFormController] useEffect SE SPOUŠTÍ! token:', !!token, 'username:', !!username, 'editOrderId:', editOrderId);
    const instanceId = instanceIdRef.current;
    isMountedRef.current = true;

    // 🔄 NAVIGATION FIX: Reset VŽDY když se změní editOrderId
    // This allows re-initialization when navigating between orders
    
    // ✅ CRITICAL: Reset VŠECH flagů pro re-inicializaci
    hasInitializedRef.current = false;
    initLockRef.current = false;
    cleanupRef.current = false;
    strictModeUnmountRef.current = false;
    
    // ✅ CRITICAL: Reset global window flags
    if (window.__orderFormCurrentInstanceId === instanceIdRef.current) {
      window.__orderFormInitInProgress = false;
      window.__orderFormCurrentInstanceId = null;
    }
    
    // ✅ CRITICAL: Reset lifecycle state při změně editOrderId
    lifecycle.reset();

    // Skip pokud už je označený pro cleanup (ale ne StrictMode unmount nebo HMR)
    // ⚠️ V production mode by cleanup měl zastavit re-init, ale v dev mode (HMR) ne
    if (cleanupRef.current && !strictModeUnmountRef.current) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    // Reset StrictMode flag pokud byl nastaven
    if (strictModeUnmountRef.current) {
      strictModeUnmountRef.current = false;
    }

    if (token && username) {
      console.log('🔍 [useFormController] Mám token a username, VOLÁM init()');
      hasInitializedRef.current = true; // ✅ Označit že inicializace začala
      // 🔧 Call initializeForm directly to avoid dependency loop - use refs
      const init = async () => {
        console.log('🔍 [useFormController] init() FUNKCE SE SPOUŠTÍ!');
        const instanceId = instanceIdRef.current;

        // 🔒 DOUBLE CHECK LOCK - prevence race conditions
        if (initLockRef.current) {
          return { success: false, reason: 'already_running' };
        }

        // Check jestli jiná instance už běží
        if (window.__orderFormInitInProgress && window.__orderFormCurrentInstanceId !== instanceId) {
          return { success: false, reason: 'other_instance_running' };
        }

        // 🔒 SET LOCK - OKAMŽITĚ, synchronně
        initLockRef.current = true;
        window.__orderFormInitInProgress = true;
        window.__orderFormCurrentInstanceId = instanceId;

        try {
          // Use current refs to get latest values
          const currentLifecycle = lifecycleRef.current;
          const currentDictionaries = dictionariesRef.current;
          const currentOrderDataLoader = orderDataLoaderRef.current;
          const currentOnDataLoaded = onDataLoadedRef.current;
          const currentOnError = onErrorRef.current;
          const currentOnReady = onReadyRef.current;

          // FÁZE 1: Načtení číselníků
          if (process.env.NODE_ENV === 'development') {
          }
          
          // ✅ Optimalizace: Pokud číselníky už jsou načtené' (např. po HMR), přeskoč
          if (!currentDictionaries.isReady) {
            currentLifecycle.startDictionariesLoad();

            const dictionariesSuccess = await currentDictionaries.loadAll();

            if (!dictionariesSuccess) {
              throw new Error('Failed to load dictionaries');
            }

            if (process.env.NODE_ENV === 'development') {
            }
            currentLifecycle.dictionariesLoaded();
          } else {
            if (process.env.NODE_ENV === 'development') {
            }
            currentLifecycle.dictionariesLoaded();
          }

          // FÁZE 2: Načtení dat objednávky (pokud edit/copy)
          let loadedData = null;
          let sourceOrderId = null;

          if (process.env.NODE_ENV === 'development') {
          }

          if (editOrderId) {
            // EDIT MODE
            console.log('🔍 [useFormController] EDIT MODE - editOrderId:', editOrderId, 'archivovano:', archivovanoParam);
            if (process.env.NODE_ENV === 'development') {
            }
            currentLifecycle.startDataLoad();

            loadedData = await currentOrderDataLoader.loadOrderForEdit({
              orderId: editOrderId,
              archivovano: archivovanoParam === '1' ? 1 : 0
            });
            console.log('🔍 [useFormController] loadedData po loadOrderForEdit:', loadedData);

            if (process.env.NODE_ENV === 'development') {
            }
            currentLifecycle.dataLoaded();

          } else {
            // NEW ORDER - žádná data k načtení, ale stále zavolat callback pro draft loading!
            if (process.env.NODE_ENV === 'development') {
            }
            currentLifecycle.dataLoaded(); // Přeskočit data loading fázi
            loadedData = {}; // ✅ Prázdný objekt aby se zavolal onDataLoaded
          }

          // FÁZE 3: Formulář ready
          currentLifecycle.setReady();

          // Callbacks - ✅ Volat VŽDY, i pro NEW order (kvůli draft loading)
          if (currentOnDataLoaded) {
            currentOnDataLoaded(loadedData, sourceOrderId);
          }

          if (currentOnReady) {
            currentOnReady();
          }

          // ✅ FIX: Uvolnit lock po úspěšném dokončení
          initLockRef.current = false;
          window.__orderFormInitInProgress = false;

          return {
            success: true,
            data: loadedData,
            sourceOrderId
          };

        } catch (error) {
          const currentLifecycle = lifecycleRef.current;
          const currentOnError = onErrorRef.current;

          currentLifecycle.setError(error.message);

          // Reset locks při chybě
          initLockRef.current = false;
          window.__orderFormInitInProgress = false;
          if (window.__orderFormCurrentInstanceId === instanceId) {
            window.__orderFormCurrentInstanceId = null;
          }

          if (currentOnError) {
            currentOnError(error);
          }

          return {
            success: false,
            error: error.message
          };
        }
      };

      init();
    }
  }, [token, username, editOrderId]); // 🔧 FIX: REMOVED initializeForm and copyOrderId to prevent infinite loop

  return {
    // Lifecycle
    lifecycle: {
      phase: lifecycle.phase,
      isInitializing: lifecycle.isInitializing,
      isLoadingDictionaries: lifecycle.isLoadingDictionaries,
      isLoadingFormData: lifecycle.isLoadingFormData,
      isReady: lifecycle.isReady,
      error: lifecycle.error,
      isInPhase: lifecycle.isInPhase,
      canLoadData: lifecycle.canLoadData
    },

    // Dictionaries
    dictionaries: {
      data: dictionaries.data,
      loading: dictionaries.loading,
      errors: dictionaries.errors,
      isReady: dictionaries.isReady,
      loadedCount: dictionaries.loadedCount,
      totalToLoad: dictionaries.totalToLoad
    },

    // Order data loader
    orderDataLoader: {
      loading: orderDataLoader.loading,
      error: orderDataLoader.error,
      loadOrderForEdit: orderDataLoader.loadOrderForEdit
      // loadOrderForCopy: Funkce existuje v useOrderDataLoader, ale není použita v UI
    },

    // UI State
    ui,

    // Master functions
    // initializeForm: removed - inline in useEffect to prevent loops
    reset: () => {
      const instanceId = instanceIdRef.current;
      lifecycle.reset();
      ui.reset();

      // Reset všechny lock flagy
      initLockRef.current = false;
      cleanupRef.current = false;
      hasInitializedRef.current = false; // ✅ Reset hasInitialized flag

      // Reset global flags pokud tato instance je ta aktivní
      if (window.__orderFormCurrentInstanceId === instanceId) {
        window.__orderFormInitInProgress = false;
        window.__orderFormCurrentInstanceId = null;
      }
    }
  };
};
