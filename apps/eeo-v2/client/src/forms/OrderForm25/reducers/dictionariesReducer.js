/**
 * 📚 DICTIONARIES REDUCER
 * Spravuje všechny číselníky a jejich loading states
 */

// Počáteční stav
export const initialDictionariesState = {
  data: {
    allUsers: [],
    approvers: [],
    strediskaOptions: [],
    financovaniOptions: [],
    druhyObjednavkyOptions: [],
    druhyObjednavkyRawData: null,
    lpKodyOptions: [],
    prilohyTypyOptions: [],
    typyFakturOptions: [],
    stavyWorkflowMap: {} // 🆕 Mapa workflow stavů (key: workflow_kod, value: {kod, nazev, popis})
  },
  loading: {
    users: false,
    approvers: false,
    strediska: false,
    financovani: false,
    druhy: false,
    lpKody: false,
    prilohyTypy: false,
    typyFaktur: false,
    stavyWorkflow: false // 🆕
  },
  errors: {
    users: null,
    approvers: null,
    strediska: null,
    financovani: null,
    druhy: null,
    lpKody: null,
    prilohyTypy: null,
    typyFaktur: null,
    stavyWorkflow: null // 🆕
  },
  isReady: false,
  loadedCount: 0,
  totalToLoad: 9 // 🆕 Změněno z 8 na 9 (přidán číselník workflow stavů)
};

// Action types
export const DICTIONARIES_ACTIONS = {
  START_LOADING: 'START_LOADING',
  SET_USERS: 'SET_USERS',
  SET_APPROVERS: 'SET_APPROVERS',
  SET_STREDISKA: 'SET_STREDISKA',
  SET_FINANCOVANI: 'SET_FINANCOVANI',
  SET_DRUHY: 'SET_DRUHY',
  SET_LP_KODY: 'SET_LP_KODY',
  SET_PRILOHY_TYPY: 'SET_PRILOHY_TYPY',
  SET_TYPY_FAKTUR: 'SET_TYPY_FAKTUR',
  SET_STAVY_WORKFLOW: 'SET_STAVY_WORKFLOW', // 🆕
  SET_ERROR: 'SET_ERROR',
  ALL_LOADED: 'ALL_LOADED',
  RESET: 'RESET'
};

// Reducer
export const dictionariesReducer = (state, action) => {
  switch (action.type) {
    case DICTIONARIES_ACTIONS.START_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: true
        },
        errors: {
          ...state.errors,
          [action.payload.key]: null
        }
      };

    case DICTIONARIES_ACTIONS.SET_USERS:
      return {
        ...state,
        data: { ...state.data, allUsers: action.payload },
        loading: { ...state.loading, users: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_APPROVERS:
      return {
        ...state,
        data: { ...state.data, approvers: action.payload },
        loading: { ...state.loading, approvers: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_STREDISKA:
      return {
        ...state,
        data: { ...state.data, strediskaOptions: action.payload },
        loading: { ...state.loading, strediska: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_FINANCOVANI:
      return {
        ...state,
        data: { ...state.data, financovaniOptions: action.payload },
        loading: { ...state.loading, financovani: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_DRUHY:
      return {
        ...state,
        data: {
          ...state.data,
          druhyObjednavkyOptions: action.payload.options,
          druhyObjednavkyRawData: action.payload.rawData
        },
        loading: { ...state.loading, druhy: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_LP_KODY:
      return {
        ...state,
        data: { ...state.data, lpKodyOptions: action.payload },
        loading: { ...state.loading, lpKody: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_PRILOHY_TYPY:
      return {
        ...state,
        data: { ...state.data, prilohyTypyOptions: action.payload },
        loading: { ...state.loading, prilohyTypy: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_TYPY_FAKTUR:
      return {
        ...state,
        data: { ...state.data, typyFakturOptions: action.payload },
        loading: { ...state.loading, typyFaktur: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_STAVY_WORKFLOW:
      return {
        ...state,
        data: { ...state.data, stavyWorkflowMap: action.payload },
        loading: { ...state.loading, stavyWorkflow: false },
        loadedCount: state.loadedCount + 1
      };

    case DICTIONARIES_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: false
        },
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        }
      };

    case DICTIONARIES_ACTIONS.ALL_LOADED:
      return {
        ...state,
        isReady: true
      };

    case DICTIONARIES_ACTIONS.RESET:
      return initialDictionariesState;

    default:
      return state;
  }
};

// Helper funkce
export const areAllDictionariesLoaded = (state) => {
  return state.loadedCount >= state.totalToLoad;
};

export const getDictionaryErrors = (state) => {
  return Object.entries(state.errors)
    .filter(([_, error]) => error !== null)
    .map(([key, error]) => ({ key, error }));
};

export const getLoadingProgress = (state) => {
  return Math.round((state.loadedCount / state.totalToLoad) * 100);
};
