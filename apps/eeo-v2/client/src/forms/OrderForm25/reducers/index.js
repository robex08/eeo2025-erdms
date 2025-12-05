/**
 * 📦 REDUCERS INDEX
 * Centrální export všech reducerů
 */

export {
  lifecycleReducer,
  initialLifecycleState,
  LIFECYCLE_PHASES,
  LIFECYCLE_ACTIONS,
  getLifecycleDebugInfo
} from './lifecycleReducer';

export {
  dictionariesReducer,
  initialDictionariesState,
  DICTIONARIES_ACTIONS,
  areAllDictionariesLoaded,
  getDictionaryErrors,
  getLoadingProgress
} from './dictionariesReducer';

export {
  loadingReducer,
  initialLoadingState,
  LOADING_ACTIONS,
  LOADING_KEYS,
  isAnyLoading,
  getActiveOperations,
  getOperationDuration
} from './loadingReducer';

export {
  uiReducer,
  initialUIState,
  UI_ACTIONS,
  isAnyModalOpen,
  isSectionCollapsed,
  isSectionLocked
} from './uiReducer';
