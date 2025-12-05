/**
 * 🎨 useUIState Hook
 * Spravuje UI states - modals, dialogs, sections, atd.
 */

import { useReducer, useCallback } from 'react';
import {
  uiReducer,
  initialUIState,
  UI_ACTIONS
} from '../reducers';

export const useUIState = () => {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  // Modals
  const openModal = useCallback((modalKey) => {
    dispatch({ type: UI_ACTIONS.OPEN_MODAL, payload: modalKey });
  }, []);

  const closeModal = useCallback((modalKey) => {
    dispatch({ type: UI_ACTIONS.CLOSE_MODAL, payload: modalKey });
  }, []);

  const closeAllModals = useCallback(() => {
    dispatch({ type: UI_ACTIONS.CLOSE_ALL_MODALS });
  }, []);

  // Dropdowns
  const toggleDropdown = useCallback((dropdownKey) => {
    dispatch({ type: UI_ACTIONS.TOGGLE_DROPDOWN, payload: dropdownKey });
  }, []);

  const closeAllDropdowns = useCallback(() => {
    dispatch({ type: UI_ACTIONS.CLOSE_ALL_DROPDOWNS });
  }, []);

  // Sections
  const collapseSection = useCallback((sectionKey) => {
    dispatch({ type: UI_ACTIONS.COLLAPSE_SECTION, payload: sectionKey });
  }, []);

  const expandSection = useCallback((sectionKey) => {
    dispatch({ type: UI_ACTIONS.EXPAND_SECTION, payload: sectionKey });
  }, []);

  const toggleSection = useCallback((sectionKey) => {
    dispatch({ type: UI_ACTIONS.TOGGLE_SECTION, payload: sectionKey });
  }, []);

  const collapseAllSections = useCallback(() => {
    dispatch({ type: UI_ACTIONS.COLLAPSE_ALL_SECTIONS });
  }, []);

  const expandAllSections = useCallback(() => {
    dispatch({ type: UI_ACTIONS.EXPAND_ALL_SECTIONS });
  }, []);

  const lockSection = useCallback((sectionKey) => {
    dispatch({ type: UI_ACTIONS.LOCK_SECTION, payload: sectionKey });
  }, []);

  const unlockSection = useCallback((sectionKey) => {
    dispatch({ type: UI_ACTIONS.UNLOCK_SECTION, payload: sectionKey });
  }, []);

  // Select states
  const setSelectState = useCallback((key, value) => {
    dispatch({ type: UI_ACTIONS.SET_SELECT_STATE, payload: { key, value } });
  }, []);

  const setSearchState = useCallback((key, value) => {
    dispatch({ type: UI_ACTIONS.SET_SEARCH_STATE, payload: { key, value } });
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    dispatch({ type: UI_ACTIONS.TOGGLE_FULLSCREEN });
  }, []);

  const setFullscreen = useCallback((value) => {
    dispatch({ type: UI_ACTIONS.SET_FULLSCREEN, payload: value });
  }, []);

  // Debug panel
  const toggleDebug = useCallback(() => {
    dispatch({ type: UI_ACTIONS.TOGGLE_DEBUG });
  }, []);

  const pinDebug = useCallback((value) => {
    dispatch({ type: UI_ACTIONS.PIN_DEBUG, payload: value });
  }, []);

  // Save progress
  const setSaveProgress = useCallback((value, text) => {
    dispatch({ type: UI_ACTIONS.SET_SAVE_PROGRESS, payload: { value, text } });
  }, []);

  const showSaveProgress = useCallback(() => {
    dispatch({ type: UI_ACTIONS.SHOW_SAVE_PROGRESS });
  }, []);

  const hideSaveProgress = useCallback(() => {
    dispatch({ type: UI_ACTIONS.HIDE_SAVE_PROGRESS });
  }, []);

  // ICO check
  const setIcoCheckStatus = useCallback((status) => {
    dispatch({ type: UI_ACTIONS.SET_ICO_CHECK_STATUS, payload: status });
  }, []);

  const setIcoCheckData = useCallback((data) => {
    dispatch({ type: UI_ACTIONS.SET_ICO_CHECK_DATA, payload: data });
  }, []);

  // Drag & Drop
  const setDragOver = useCallback((value) => {
    dispatch({ type: UI_ACTIONS.SET_DRAG_OVER, payload: value });
  }, []);

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: UI_ACTIONS.RESET });
  }, []);

  return {
    // State
    modals: state.modals,
    dropdowns: state.dropdowns,
    sections: state.sections,
    selectStates: state.selectStates,
    searchStates: state.searchStates,
    fullscreen: state.fullscreen,
    areSectionsCollapsed: state.areSectionsCollapsed,
    debug: state.debug,
    saveProgress: state.saveProgress,
    icoCheckStatus: state.icoCheckStatus,
    icoCheckData: state.icoCheckData,
    dragOver: state.dragOver,

    // Actions
    openModal,
    closeModal,
    closeAllModals,
    toggleDropdown,
    closeAllDropdowns,
    collapseSection,
    expandSection,
    toggleSection,
    collapseAllSections,
    expandAllSections,
    lockSection,
    unlockSection,
    setSelectState,
    setSearchState,
    toggleFullscreen,
    setFullscreen,
    toggleDebug,
    pinDebug,
    setSaveProgress,
    showSaveProgress,
    hideSaveProgress,
    setIcoCheckStatus,
    setIcoCheckData,
    setDragOver,
    reset
  };
};
