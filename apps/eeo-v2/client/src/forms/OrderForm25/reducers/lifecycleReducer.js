/**
 * 🔄 LIFECYCLE REDUCER
 * Řídí životní cyklus formuláře: MOUNTING → LOADING_DICTIONARIES → READY_FOR_DATA → DATA_LOADED → READY
 */

// Fáze inicializace formuláře
export const LIFECYCLE_PHASES = {
  MOUNTING: 'MOUNTING',                       // Komponent se mountuje
  LOADING_DICTIONARIES: 'LOADING_DICTIONARIES', // Načítají se číselníky
  READY_FOR_DATA: 'READY_FOR_DATA',          // Číselníky ready, můžeme načíst data
  LOADING_DATA: 'LOADING_DATA',              // Načítají se data objednávky
  DATA_LOADED: 'DATA_LOADED',                // Data načtena, formulář se vyplňuje
  READY: 'READY',                            // Vše hotové, uživatel může editovat
  ERROR: 'ERROR'                             // Chyba při inicializaci
};

// Počáteční stav
export const initialLifecycleState = {
  phase: LIFECYCLE_PHASES.MOUNTING,
  isInitializing: true,
  isLoadingDictionaries: false,
  isLoadingFormData: false,
  isReady: false,
  error: null,
  startTime: Date.now(),
  phaseHistory: [] // Pro debugging - historie přechodů mezi fázemi
};

// Action types
export const LIFECYCLE_ACTIONS = {
  START_DICTIONARIES_LOAD: 'START_DICTIONARIES_LOAD',
  DICTIONARIES_LOADED: 'DICTIONARIES_LOADED',
  START_DATA_LOAD: 'START_DATA_LOAD',
  DATA_LOADED: 'DATA_LOADED',
  READY: 'READY',
  ERROR: 'ERROR',
  RESET: 'RESET'
};

// Reducer
export const lifecycleReducer = (state, action) => {
  const addToHistory = (phase) => [
    ...state.phaseHistory,
    { phase, timestamp: Date.now() }
  ];

  switch (action.type) {
    case LIFECYCLE_ACTIONS.START_DICTIONARIES_LOAD:
      return {
        ...state,
        phase: LIFECYCLE_PHASES.LOADING_DICTIONARIES,
        isLoadingDictionaries: true,
        phaseHistory: addToHistory(LIFECYCLE_PHASES.LOADING_DICTIONARIES)
      };

    case LIFECYCLE_ACTIONS.DICTIONARIES_LOADED:
      return {
        ...state,
        phase: LIFECYCLE_PHASES.READY_FOR_DATA,
        isLoadingDictionaries: false,
        phaseHistory: addToHistory(LIFECYCLE_PHASES.READY_FOR_DATA)
      };

    case LIFECYCLE_ACTIONS.START_DATA_LOAD:
      return {
        ...state,
        phase: LIFECYCLE_PHASES.LOADING_DATA,
        isLoadingFormData: true,
        phaseHistory: addToHistory(LIFECYCLE_PHASES.LOADING_DATA)
      };

    case LIFECYCLE_ACTIONS.DATA_LOADED:
      return {
        ...state,
        phase: LIFECYCLE_PHASES.DATA_LOADED,
        isLoadingFormData: false,
        phaseHistory: addToHistory(LIFECYCLE_PHASES.DATA_LOADED)
      };

    case LIFECYCLE_ACTIONS.READY:
      return {
        ...state,
        phase: LIFECYCLE_PHASES.READY,
        isInitializing: false,
        isReady: true,
        phaseHistory: addToHistory(LIFECYCLE_PHASES.READY)
      };

    case LIFECYCLE_ACTIONS.ERROR:
      return {
        ...state,
        phase: LIFECYCLE_PHASES.ERROR,
        error: action.payload,
        isInitializing: false,
        isLoadingDictionaries: false,
        isLoadingFormData: false,
        phaseHistory: addToHistory(LIFECYCLE_PHASES.ERROR)
      };

    case LIFECYCLE_ACTIONS.RESET:
      return {
        ...initialLifecycleState,
        startTime: Date.now()
      };

    default:
      return state;
  }
};

// Helper funkce pro debugging
export const getLifecycleDebugInfo = (state) => {
  const totalTime = Date.now() - state.startTime;
  const phases = state.phaseHistory.map((p, idx) => {
    const prevTime = idx > 0 ? state.phaseHistory[idx - 1].timestamp : state.startTime;
    const duration = p.timestamp - prevTime;
    return `${p.phase} (${duration}ms)`;
  });

  return {
    currentPhase: state.phase,
    totalTime: `${totalTime}ms`,
    phaseSequence: phases.join(' → '),
    isReady: state.isReady,
    error: state.error
  };
};
