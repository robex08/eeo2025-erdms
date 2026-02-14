/**
 * Universal Search Input Component
 * 
 * Search pole s:
 * - Debounce 500ms
 * - Clear button (X)
 * - Loading spinner
 * - Dropdown s výsledky
 * - Enter = okamžité hledání
 */

import React, { useRef, useEffect, useState, useContext, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import useUniversalSearch from '../../hooks/useUniversalSearch';
import SearchResultsDropdown from './SearchResultsDropdown';
import SearchHistory from './SearchHistory';
import { AuthContext } from '../../context/AuthContext';
import { getSearchHistory, saveSearchToHistory, removeSearchFromHistory, clearSearchHistory } from '../../utils/searchHistory';
import BitcoinCrashScreen from '../EasterEgg/BitcoinCrashScreen';

// Styled components
const SearchWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
`;

const SearchInputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  pointer-events: none;
  z-index: 2;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 0.5rem 3rem 0.5rem 3rem;
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid ${props => props.$hasError ? '#ef4444' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 6px;
  outline: none;
  transition: all 0.2s ease;
  background: ${props => props.$hasError ? 'white' : 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: blur(8px);
  color: ${props => props.$hasError ? '#1e293b' : 'white'};
  font-family: inherit;
  cursor: pointer;

  &::placeholder {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#ef4444' : 'rgba(255, 255, 255, 0.8)'};
    background: ${props => props.$hasError ? 'white' : 'rgba(255, 255, 255, 0.25)'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.2)'};
  }

  &:hover:not(:focus) {
    background: ${props => props.$hasError ? 'white' : 'rgba(255, 255, 255, 0.2)'};
  }
`;

const RightIcons = styled.div`
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 2;
`;

const ShortcutHint = styled.div`
  position: absolute;
  right: 8px;
  bottom: 4px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  user-select: none;
  font-weight: 500;
  letter-spacing: 0.5px;
  z-index: 1;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  animation: spin 1s linear infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const HintText = styled.div`
  margin-top: 6px;
  padding: 6px 12px;
  background: ${props => props.$warning ? '#fef3c7' : '#f1f5f9'};
  color: ${props => props.$warning ? '#92400e' : '#475569'};
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
`;

/**
 * Universal Search Input Component
 */
const UniversalSearchInput = () => {
  const { username, token, hasPermission, user_id } = useContext(AuthContext) || {};
  
  // Kontrola oprávnění - admin vidí všechny výsledky
  const canViewAllOrders = hasPermission && (
    hasPermission('INVOICE_MANAGE') || 
    hasPermission('ORDER_MANAGE') || 
    hasPermission('ADMIN')
  );
  
  // Callback po úspěšném vyhledání - uložíme do historie
  const handleSearchSuccess = useCallback((searchQuery, categories) => {
    if (user_id && searchQuery && searchQuery.length >= 2) {
      saveSearchToHistory(user_id, searchQuery, categories);
      // Reload historie
      const updatedHistory = getSearchHistory(user_id);
      setSearchHistory(updatedHistory);
    }
  }, [user_id]);
  
  const {
    query,
    updateQuery,
    search,
    immediateSearch,
    loading,
    error,
    results,
    clearResults,
    hasResults,
    isEmpty
  } = useUniversalSearch(handleSearchSuccess);

  const [showDropdown, setShowDropdown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(-1);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [resultActionTrigger, setResultActionTrigger] = useState(0);
  const [resultActionType, setResultActionType] = useState('enter'); // 'enter', 'expand', 'collapse'
  
  // 🥚 Easter Egg State - Bitcoin Crash Screen
  const [showBitcoinCrash, setShowBitcoinCrash] = useState(false);
  
  const navigableItemsRef = useRef([]);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  
  // Callback pro update navigovatelných položek
  const handleNavigableItemsChange = useCallback((items) => {
    navigableItemsRef.current = items || [];
    
    // Pokud je selectedResultIndex >= počtu položek, resetuj ho
    if (selectedResultIndex >= items.length) {
      setSelectedResultIndex(items.length > 0 ? items.length - 1 : -1);
    }
  }, [selectedResultIndex]);

  /**
   * Načíst historii při mount nebo změně user_id
   */
  useEffect(() => {
    if (user_id) {
      setSearchHistory(getSearchHistory(user_id));
    }
  }, [user_id]);
  
  /**
   * Globální keyboard shortcut: Win+U nebo Cmd+U = focus do search
   */
  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      // Win+U (Windows/Linux) nebo Cmd+U (Mac) - POUZE metaKey
      if (e.metaKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select(); // Vybere celý text pokud nějaký je
        }
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeydown);
    return () => document.removeEventListener('keydown', handleGlobalKeydown);
  }, []);
  
  /**
   * Spočítat celkový počet výsledků pro navigaci
   */
  const totalResults = useMemo(() => {
    if (!results?.categories) return 0;
    return Object.values(results.categories).reduce((sum, cat) => 
      sum + (cat.results?.length || 0), 0
    );
  }, [results]);

  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    updateQuery(newQuery);

    // Zobrazit historii pokud je input prázdný nebo < 2 znaky
    if (newQuery.length < 2) {
      setShowHistory(true);
      setShowDropdown(false);
      setSelectedHistoryIndex(-1);
      setSelectedResultIndex(-1);
    } else {
      setShowHistory(false);
      setShowDropdown(true);
      setSelectedHistoryIndex(-1);
      setSelectedResultIndex(-1);
      
      // Debounced search pouze pokud je >= 4 znaky
      if (newQuery.length >= 4) {
        search(newQuery, { search_all: canViewAllOrders });
      }
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    // Arrow navigation v historii (priorita ma historie pokud je zobrazena)
    if (showHistory && searchHistory.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedHistoryIndex(prev => 
          prev < searchHistory.length - 1 ? prev + 1 : prev
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedHistoryIndex(prev => prev > 0 ? prev - 1 : -1);
        return;
      }
      
      // Enter - vyber položku z historie
      if (e.key === 'Enter' && selectedHistoryIndex >= 0) {
        e.preventDefault();
        const selectedItem = searchHistory[selectedHistoryIndex];
        if (selectedItem) {
          handleSelectFromHistory(selectedItem.query);
        }
        return;
      }
    }
    
    // Arrow navigation ve výsledcích vyhledávání (když NEJSOU zobrazena historie)
    if (!showHistory && showDropdown) {
      const maxIndex = navigableItemsRef.current.length - 1;
      
      if (e.key === 'ArrowDown' && maxIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedResultIndex(prev => {
          if (prev === -1) return 0; // První položka
          return prev < maxIndex ? prev + 1 : prev;
        });
        return;
      }
      
      if (e.key === 'ArrowUp' && maxIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedResultIndex(prev => {
          if (prev <= 0) return -1; // Zpět na input
          return prev - 1;
        });
        return;
      }
      
      // ArrowRight - rozbalit kategorii (pokud je vybraná kategorie)
      if (e.key === 'ArrowRight' && selectedResultIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        const selectedItem = navigableItemsRef.current[selectedResultIndex];
        if (selectedItem && selectedItem.type === 'category') {
          setResultActionType('expand');
          setResultActionTrigger(prev => prev + 1);
        }
        return;
      }
      
      // ArrowLeft - sbalit kategorii (pokud je vybraná kategorie)
      if (e.key === 'ArrowLeft' && selectedResultIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        const selectedItem = navigableItemsRef.current[selectedResultIndex];
        if (selectedItem && selectedItem.type === 'category') {
          setResultActionType('collapse');
          setResultActionTrigger(prev => prev + 1);
        }
        return;
      }
      
      // Enter - otevři detail vybraného výsledku
      if (e.key === 'Enter' && selectedResultIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        setResultActionType('enter');
        setResultActionTrigger(prev => prev + 1); // Trigger akce v SearchResultsDropdown
        return;
      }
    }
    
    // 🥚 Easter Egg: Shift+Enter s "BitcoiN" = Bitcoin Crash Screen
    if (e.key === 'Enter' && e.shiftKey && query === 'BitcoiN') {
      e.preventDefault();
      setShowBitcoinCrash(true);
      // Zavři dropdown
      setShowDropdown(false);
      setShowHistory(false);
      setSelectedHistoryIndex(-1);
      setSelectedResultIndex(-1);
      return;
    }
    
    // Enter - immediate search
    if (e.key === 'Enter' && query.length >= 4) {
      e.preventDefault();
      immediateSearch(query, { search_all: canViewAllOrders });
      setShowDropdown(true);
      setShowHistory(false);
      setSelectedHistoryIndex(-1);
      setSelectedResultIndex(-1);
    }

    // Escape - zavři dropdown
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setShowHistory(false);
      setSelectedHistoryIndex(-1);
      setSelectedResultIndex(-1);
      inputRef.current?.blur();
    }
  };

  /**
   * Vyber query z historie
   */
  const handleSelectFromHistory = (selectedQuery) => {
    updateQuery(selectedQuery);
    setShowHistory(false);
    setSelectedHistoryIndex(-1);
    
    // Proveď hledání
    if (selectedQuery.length >= 4) {
      immediateSearch(selectedQuery, { search_all: canViewAllOrders });
      setShowDropdown(true);
    }
  };

  /**
   * Odstraň položku z historie
   */
  const handleRemoveFromHistory = (queryToRemove) => {
    if (user_id) {
      removeSearchFromHistory(user_id, queryToRemove);
      const updated = getSearchHistory(user_id);
      setSearchHistory(updated);
      setSelectedHistoryIndex(-1);
    }
  };

  /**
   * Vymaž celou historii
   */
  const handleClearHistory = () => {
    if (user_id) {
      clearSearchHistory(user_id);
      setSearchHistory([]);
      setSelectedHistoryIndex(-1);
    }
  };

  /**
   * Clear input
   */
  const handleClear = () => {
    clearResults();
    setShowDropdown(false);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  /**
   * 🥚 Close Bitcoin Crash Screen Easter Egg
   */
  const handleCloseBitcoinCrash = () => {
    setShowBitcoinCrash(false);
    // Clear search field po easter egg
    updateQuery('');
    clearResults();
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Ignoruj kliky na slide-in detail panel (renderovaný pomocí Portal)
      const isClickOnSlidePanel = e.target.closest('[data-slide-panel]');
      
      if (wrapperRef.current && !wrapperRef.current.contains(e.target) && !isClickOnSlidePanel) {
        setShowDropdown(false);
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Show dropdown when we have results
   */
  useEffect(() => {
    if (results && query.length >= 4 && inputFocused) {
      setShowDropdown(true);
    }
  }, [results, query, inputFocused]);

  /**
   * Handle ESC key to close dropdown and focus input
   * POUZE když není otevřený slide panel
   */
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        // Kontrola, jestli není otevřený slide panel
        const isSlidePanel = document.querySelector('[data-slide-panel]');
        
        // ESC zavře dropdown/history pouze pokud není otevřený slide panel
        if ((showDropdown || showHistory) && !isSlidePanel) {
          e.preventDefault();
          e.stopPropagation();
          setShowDropdown(false);
          setShowHistory(false);
          inputRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [showDropdown, showHistory]);

  return (
    <SearchWrapper ref={wrapperRef}>
      <SearchInputContainer>
        <SearchIcon>
          <FontAwesomeIcon icon={faSearch} />
        </SearchIcon>

        <StyledInput
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setInputFocused(true);
            // Pokud je input prázdný, zobraz historii
            if (query.length < 2) {
              setShowHistory(true);
            } else if (query.length > 0) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => setInputFocused(false)}
          placeholder="Hledat cokoliv kdekoliv 😊"
          $hasError={!!error && query.length > 0}
        />
        
        {/* Shortcut hint - zobrazit pouze když není focus a není text */}
        {!inputFocused && !query && (
          <ShortcutHint>Win+U</ShortcutHint>
        )}

        <RightIcons>
          {loading && (
            <LoadingSpinner>
              <FontAwesomeIcon icon={faSpinner} />
            </LoadingSpinner>
          )}

          {query && !loading && (
            <IconButton
              onClick={handleClear}
              title="Vymazat"
              type="button"
            >
              <FontAwesomeIcon icon={faTimes} />
            </IconButton>
          )}
        </RightIcons>
      </SearchInputContainer>

      {/* Search History - zobrazit když je input krátký a má focus */}
        {showHistory && inputFocused && searchHistory.length > 0 && (
          <SearchHistory
            history={searchHistory}
            onSelectQuery={handleSelectFromHistory}
            onRemoveItem={handleRemoveFromHistory}
            onClearAll={handleClearHistory}
            selectedIndex={selectedHistoryIndex}
          />
        )}      {/* Results dropdown */}
      {showDropdown && query.length > 0 && (
        <SearchResultsDropdown
          results={results}
          loading={loading}
          query={query}
          onClose={() => setShowDropdown(false)}
          inputRef={inputRef}
          username={username}
          token={token}
          selectedResultIndex={selectedResultIndex}
          onResultAction={resultActionTrigger}
          onNavigableItemsChange={handleNavigableItemsChange}
          resultActionType={resultActionType}
        />
      )}

      {/* 🥚 Bitcoin Crash Screen Easter Egg */}
      <BitcoinCrashScreen 
        isVisible={showBitcoinCrash}
        onClose={handleCloseBitcoinCrash}
      />
    </SearchWrapper>
  );
};

export default UniversalSearchInput;
