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

import React, { useRef, useEffect, useState, useContext } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import useUniversalSearch from '../../hooks/useUniversalSearch';
import SearchResultsDropdown from './SearchResultsDropdown';
import { AuthContext } from '../../context/AuthContext';

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
  const { username, token, hasPermission } = useContext(AuthContext) || {};
  
  // Kontrola oprávnění - admin vidí všechny výsledky
  const canViewAllOrders = hasPermission && (
    hasPermission('INVOICE_MANAGE') || 
    hasPermission('ORDER_MANAGE') || 
    hasPermission('ADMIN')
  );
  
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
  } = useUniversalSearch();

  const [showDropdown, setShowDropdown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    updateQuery(newQuery);

    // Zobrazit dropdown pokud je něco napsáno
    if (newQuery.length > 0) {
      setShowDropdown(true);
      
      // Debounced search pouze pokud je >= 4 znaky
      if (newQuery.length >= 4) {
        console.log('🔐 [UniversalSearchInput] Debounced search - oprávnění:', {
          username,
          canViewAllOrders,
          search_all: canViewAllOrders
        });
        search(newQuery, { search_all: canViewAllOrders });
      }
    } else {
      setShowDropdown(false);
    }
  };

  /**
   * Handle Enter key - immediate search
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.length >= 4) {
      e.preventDefault();
      console.log('🔐 [UniversalSearchInput] Immediate search (Enter) - oprávnění:', {
        username,
        canViewAllOrders,
        search_all: canViewAllOrders
      });
      immediateSearch(query, { search_all: canViewAllOrders });
      setShowDropdown(true);
    }

    // Escape - zavři dropdown
    if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  /**
   * Clear input
   */
  const handleClear = () => {
    clearResults();
    setShowDropdown(false);
    inputRef.current?.focus();
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
        
        // ESC zavře dropdown pouze pokud není otevřený slide panel
        if (showDropdown && !isSlidePanel) {
          e.preventDefault();
          e.stopPropagation();
          setShowDropdown(false);
          inputRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [showDropdown]);

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
            if (query.length > 0) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => setInputFocused(false)}
          placeholder="Hledat cokoliv kdekoliv 😊"
          $hasError={!!error && query.length > 0}
        />

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

      {/* Results dropdown */}
      {showDropdown && query.length > 0 && (
        <SearchResultsDropdown
          results={results}
          loading={loading}
          query={query}
          onClose={() => setShowDropdown(false)}
          inputRef={inputRef}
          username={username}
          token={token}
        />
      )}
    </SearchWrapper>
  );
};

export default UniversalSearchInput;
