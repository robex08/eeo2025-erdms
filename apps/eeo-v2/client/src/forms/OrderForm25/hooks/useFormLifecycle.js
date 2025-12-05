/**
 * 🔄 useFormLifecycle Hook
 * Řídí celý životní cyklus formuláře od mountu po ready state
 */

import { useReducer, useCallback, useEffect } from 'react';
import {
  lifecycleReducer,
  initialLifecycleState,
  LIFECYCLE_ACTIONS,
  LIFECYCLE_PHASES
} from '../reducers';

export const useFormLifecycle = () => {
  const [state, dispatch] = useReducer(lifecycleReducer, initialLifecycleState);

  /**
   * Start načítání číselníků
   */
  const startDictionariesLoad = useCallback(() => {
    dispatch({ type: LIFECYCLE_ACTIONS.START_DICTIONARIES_LOAD });
  }, []);

  /**
   * Číselníky načteny - ready pro data
   */
  const dictionariesLoaded = useCallback(() => {
    dispatch({ type: LIFECYCLE_ACTIONS.DICTIONARIES_LOADED });
  }, []);

  /**
   * Start načítání dat objednávky
   */
  const startDataLoad = useCallback(() => {
    dispatch({ type: LIFECYCLE_ACTIONS.START_DATA_LOAD });
  }, []);

  /**
   * Data načtena
   */
  const dataLoaded = useCallback(() => {
    dispatch({ type: LIFECYCLE_ACTIONS.DATA_LOADED });
  }, []);

  /**
   * Formulář ready pro editaci
   */
  const setReady = useCallback(() => {
    dispatch({ type: LIFECYCLE_ACTIONS.READY });
  }, []);

  /**
   * Chyba při inicializaci
   */
  const setError = useCallback((error) => {
    dispatch({ type: LIFECYCLE_ACTIONS.ERROR, payload: error });
  }, []);

  /**
   * Reset lifecycle
   */
  const reset = useCallback(() => {
    dispatch({ type: LIFECYCLE_ACTIONS.RESET });
  }, []);

  return {
    // State
    phase: state.phase,
    isInitializing: state.isInitializing,
    isLoadingDictionaries: state.isLoadingDictionaries,
    isLoadingFormData: state.isLoadingFormData,
    isReady: state.isReady,
    error: state.error,
    phaseHistory: state.phaseHistory,

    // Actions
    startDictionariesLoad,
    dictionariesLoaded,
    startDataLoad,
    dataLoaded,
    setReady,
    setError,
    reset,

    // Helpers
    isInPhase: (phase) => state.phase === phase,
    canLoadData: () => state.phase === LIFECYCLE_PHASES.READY_FOR_DATA
  };
};
