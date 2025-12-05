/**
 * 🎨 UI STATE REDUCER
 * Spravuje všechny UI stavy - modals, dialogs, sections, atd.
 */

// Počáteční stav
export const initialUIState = {
  // Modals & Dialogs
  modals: {
    cancelConfirm: false,
    supplierSearch: false,
    aresPopup: false,
    templateSave: false,
    templateDeleteConfirm: false,
    icoCheck: false,
    saveProgress: false,
    addFaktura: false,

    // Unlock confirmation modals
    unlockPhase1Confirm: false,
    unlockPhase2Confirm: false,
    unlockRegistrConfirm: false,
    unlockFakturaceConfirm: false,
    unlockVecnaSpravnostConfirm: false,
    unlockDokonceniConfirm: false
  },

  // Dropdowns & Menus
  dropdowns: {
    template: false
  },

  // Sections state (collapsed/expanded)
  sections: {
    collapsed: {
      // Bude obsahovat: { 'section1': true, 'section2': false, ... }
    },
    locked: {
      // Bude obsahovat: { 'phase2': true, ... }
    }
  },

  // Select states (open/closed, search values)
  selectStates: {
    // Zachováno z původního kódu
  },

  searchStates: {
    // Zachováno z původního kódu
  },

  // Global UI states
  fullscreen: false,
  areSectionsCollapsed: false,

  // Debug panel
  debug: {
    visible: false,
    pinned: false
  },

  // Progress indicators
  saveProgress: {
    visible: false,
    value: 0,
    text: ''
  },

  // ICO check status
  icoCheckStatus: null, // null, 'checking', 'found-local', 'found-ares', 'not-found'
  icoCheckData: null,

  // Drag & Drop
  dragOver: false
};

// Action types
export const UI_ACTIONS = {
  // Modals
  OPEN_MODAL: 'OPEN_MODAL',
  CLOSE_MODAL: 'CLOSE_MODAL',
  CLOSE_ALL_MODALS: 'CLOSE_ALL_MODALS',

  // Dropdowns
  TOGGLE_DROPDOWN: 'TOGGLE_DROPDOWN',
  CLOSE_ALL_DROPDOWNS: 'CLOSE_ALL_DROPDOWNS',

  // Sections
  COLLAPSE_SECTION: 'COLLAPSE_SECTION',
  EXPAND_SECTION: 'EXPAND_SECTION',
  TOGGLE_SECTION: 'TOGGLE_SECTION',
  COLLAPSE_ALL_SECTIONS: 'COLLAPSE_ALL_SECTIONS',
  EXPAND_ALL_SECTIONS: 'EXPAND_ALL_SECTIONS',
  LOCK_SECTION: 'LOCK_SECTION',
  UNLOCK_SECTION: 'UNLOCK_SECTION',

  // Select states
  SET_SELECT_STATE: 'SET_SELECT_STATE',
  SET_SEARCH_STATE: 'SET_SEARCH_STATE',

  // Global UI
  TOGGLE_FULLSCREEN: 'TOGGLE_FULLSCREEN',
  SET_FULLSCREEN: 'SET_FULLSCREEN',

  // Debug panel
  TOGGLE_DEBUG: 'TOGGLE_DEBUG',
  PIN_DEBUG: 'PIN_DEBUG',

  // Progress
  SET_SAVE_PROGRESS: 'SET_SAVE_PROGRESS',
  SHOW_SAVE_PROGRESS: 'SHOW_SAVE_PROGRESS',
  HIDE_SAVE_PROGRESS: 'HIDE_SAVE_PROGRESS',

  // ICO check
  SET_ICO_CHECK_STATUS: 'SET_ICO_CHECK_STATUS',
  SET_ICO_CHECK_DATA: 'SET_ICO_CHECK_DATA',

  // Drag & Drop
  SET_DRAG_OVER: 'SET_DRAG_OVER',

  // Reset
  RESET: 'RESET'
};

// Reducer
export const uiReducer = (state, action) => {
  switch (action.type) {
    case UI_ACTIONS.OPEN_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: true
        }
      };

    case UI_ACTIONS.CLOSE_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: false
        }
      };

    case UI_ACTIONS.CLOSE_ALL_MODALS:
      const closedModals = {};
      Object.keys(state.modals).forEach(key => {
        closedModals[key] = false;
      });
      return {
        ...state,
        modals: closedModals
      };

    case UI_ACTIONS.TOGGLE_DROPDOWN:
      return {
        ...state,
        dropdowns: {
          ...state.dropdowns,
          [action.payload]: !state.dropdowns[action.payload]
        }
      };

    case UI_ACTIONS.CLOSE_ALL_DROPDOWNS:
      const closedDropdowns = {};
      Object.keys(state.dropdowns).forEach(key => {
        closedDropdowns[key] = false;
      });
      return {
        ...state,
        dropdowns: closedDropdowns
      };

    case UI_ACTIONS.COLLAPSE_SECTION:
      return {
        ...state,
        sections: {
          ...state.sections,
          collapsed: {
            ...state.sections.collapsed,
            [action.payload]: true
          }
        }
      };

    case UI_ACTIONS.EXPAND_SECTION:
      return {
        ...state,
        sections: {
          ...state.sections,
          collapsed: {
            ...state.sections.collapsed,
            [action.payload]: false
          }
        }
      };

    case UI_ACTIONS.TOGGLE_SECTION:
      return {
        ...state,
        sections: {
          ...state.sections,
          collapsed: {
            ...state.sections.collapsed,
            [action.payload]: !state.sections.collapsed[action.payload]
          }
        }
      };

    case UI_ACTIONS.COLLAPSE_ALL_SECTIONS:
      return {
        ...state,
        areSectionsCollapsed: true
      };

    case UI_ACTIONS.EXPAND_ALL_SECTIONS:
      return {
        ...state,
        areSectionsCollapsed: false
      };

    case UI_ACTIONS.LOCK_SECTION:
      return {
        ...state,
        sections: {
          ...state.sections,
          locked: {
            ...state.sections.locked,
            [action.payload]: true
          }
        }
      };

    case UI_ACTIONS.UNLOCK_SECTION:
      return {
        ...state,
        sections: {
          ...state.sections,
          locked: {
            ...state.sections.locked,
            [action.payload]: false
          }
        }
      };

    case UI_ACTIONS.SET_SELECT_STATE:
      return {
        ...state,
        selectStates: {
          ...state.selectStates,
          [action.payload.key]: action.payload.value
        }
      };

    case UI_ACTIONS.SET_SEARCH_STATE:
      return {
        ...state,
        searchStates: {
          ...state.searchStates,
          [action.payload.key]: action.payload.value
        }
      };

    case UI_ACTIONS.TOGGLE_FULLSCREEN:
      return {
        ...state,
        fullscreen: !state.fullscreen
      };

    case UI_ACTIONS.SET_FULLSCREEN:
      return {
        ...state,
        fullscreen: action.payload
      };

    case UI_ACTIONS.TOGGLE_DEBUG:
      return {
        ...state,
        debug: {
          ...state.debug,
          visible: !state.debug.visible
        }
      };

    case UI_ACTIONS.PIN_DEBUG:
      return {
        ...state,
        debug: {
          ...state.debug,
          pinned: action.payload
        }
      };

    case UI_ACTIONS.SET_SAVE_PROGRESS:
      return {
        ...state,
        saveProgress: {
          ...state.saveProgress,
          value: action.payload.value,
          text: action.payload.text
        }
      };

    case UI_ACTIONS.SHOW_SAVE_PROGRESS:
      return {
        ...state,
        saveProgress: {
          ...state.saveProgress,
          visible: true
        }
      };

    case UI_ACTIONS.HIDE_SAVE_PROGRESS:
      return {
        ...state,
        saveProgress: {
          ...state.saveProgress,
          visible: false
        }
      };

    case UI_ACTIONS.SET_ICO_CHECK_STATUS:
      return {
        ...state,
        icoCheckStatus: action.payload
      };

    case UI_ACTIONS.SET_ICO_CHECK_DATA:
      return {
        ...state,
        icoCheckData: action.payload
      };

    case UI_ACTIONS.SET_DRAG_OVER:
      return {
        ...state,
        dragOver: action.payload
      };

    case UI_ACTIONS.RESET:
      return initialUIState;

    default:
      return state;
  }
};

// Helper funkce
export const isAnyModalOpen = (state) => {
  return Object.values(state.modals).some(value => value === true);
};

export const isSectionCollapsed = (state, sectionKey) => {
  return state.sections.collapsed[sectionKey] === true;
};

export const isSectionLocked = (state, sectionKey) => {
  return state.sections.locked[sectionKey] === true;
};
