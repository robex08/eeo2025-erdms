/**
 * ⏳ LOADING REDUCER
 * Centralizovaná správa všech loading states
 */

// Počáteční stav
export const initialLoadingState = {
  // Hlavní loading states
  dictionaries: false,
  formData: false,

  // Save/Update operations
  saving: false,
  autoSaving: false,
  savingDraft: false,

  // Attachments
  uploadingFiles: false,
  checkingSyncAttachments: false,

  // Supplier operations
  supplierSearch: false,
  aresSearch: false,
  savingSupplier: false,

  // Templates
  loadingTemplates: false,
  savingTemplate: false,
  deletingTemplate: false,

  // Invoices
  loadingInvoices: false,
  uploadingInvoice: false,
  deletingInvoice: false,

  // Specific dictionaries (pro progress bar)
  loadingUsers: false,
  loadingApprovers: false,
  loadingStrediska: false,
  loadingFinancovani: false,
  loadingDruhyObjednavky: false,
  loadingLpKody: false,
  loadingPrilohyTypy: false,

  // Tracking
  activeOperations: [] // Array operací které právě běží
};

// Action types
export const LOADING_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  START_OPERATION: 'START_OPERATION',
  END_OPERATION: 'END_OPERATION',
  START_MULTIPLE: 'START_MULTIPLE',
  END_MULTIPLE: 'END_MULTIPLE',
  RESET: 'RESET'
};

// Reducer
export const loadingReducer = (state, action) => {
  switch (action.type) {
    case LOADING_ACTIONS.SET_LOADING:
      return {
        ...state,
        [action.payload.key]: action.payload.value
      };

    case LOADING_ACTIONS.START_OPERATION:
      return {
        ...state,
        [action.payload.key]: true,
        activeOperations: [
          ...state.activeOperations,
          { key: action.payload.key, startTime: Date.now() }
        ]
      };

    case LOADING_ACTIONS.END_OPERATION:
      return {
        ...state,
        [action.payload.key]: false,
        activeOperations: state.activeOperations.filter(
          op => op.key !== action.payload.key
        )
      };

    case LOADING_ACTIONS.START_MULTIPLE:
      const newState = { ...state };
      Object.keys(action.payload).forEach(key => {
        newState[key] = true;
      });
      return {
        ...newState,
        activeOperations: [
          ...state.activeOperations,
          ...Object.keys(action.payload).map(key => ({
            key,
            startTime: Date.now()
          }))
        ]
      };

    case LOADING_ACTIONS.END_MULTIPLE:
      const endState = { ...state };
      action.payload.forEach(key => {
        endState[key] = false;
      });
      return {
        ...endState,
        activeOperations: state.activeOperations.filter(
          op => !action.payload.includes(op.key)
        )
      };

    case LOADING_ACTIONS.RESET:
      return initialLoadingState;

    default:
      return state;
  }
};

// Helper funkce
export const isAnyLoading = (state) => {
  return Object.entries(state).some(([key, value]) =>
    key !== 'activeOperations' && value === true
  );
};

export const getActiveOperations = (state) => {
  return state.activeOperations;
};

export const getOperationDuration = (state, operationKey) => {
  const operation = state.activeOperations.find(op => op.key === operationKey);
  if (!operation) return 0;
  return Date.now() - operation.startTime;
};

// Pre-defined loading states pro často používané operace
export const LOADING_KEYS = {
  DICTIONARIES: 'dictionaries',
  FORM_DATA: 'formData',
  SAVING: 'saving',
  AUTO_SAVING: 'autoSaving',
  SAVING_DRAFT: 'savingDraft',
  UPLOADING_FILES: 'uploadingFiles',
  CHECKING_SYNC: 'checkingSyncAttachments',
  SUPPLIER_SEARCH: 'supplierSearch',
  ARES_SEARCH: 'aresSearch',
  SAVING_SUPPLIER: 'savingSupplier',
  TEMPLATES: 'loadingTemplates',
  INVOICES: 'loadingInvoices'
};
