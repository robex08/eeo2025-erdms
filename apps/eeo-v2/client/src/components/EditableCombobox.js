import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const ComboboxWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const ComboboxInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${props => props.hasError ? '#e53e3e' : '#cbd5e0'};
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: ${props => props.disabled ? '#f7fafc' : 'white'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'text'};
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#e53e3e' : '#4299e1'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(229, 62, 62, 0.1)' : 'rgba(66, 153, 225, 0.1)'};
  }

  &::placeholder {
    color: #a0aec0;
  }
`;

const DropdownList = styled.ul`
  position: fixed; /* Fixed místo absolute pro Portal */
  min-width: 320px; /* Širší dropdown kvůli popisu LP kódů */
  max-width: 500px;
  max-height: 250px;
  overflow-y: auto;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000; /* Vysoký z-index pro Portal */
  margin: 0;
  padding: 0;
  list-style: none;
`;

const DropdownItem = styled.li`
  padding: 0.6rem 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s;
  font-size: 0.9rem;
  border-bottom: 1px solid #f7fafc;

  &:hover,
  &.highlighted {
    background-color: #edf2f7;
  }

  &.selected {
    background-color: #4299e1;
    color: white;

    small {
      color: #e6f2ff;
    }
  }

  strong {
    font-family: monospace;
    font-size: 0.95rem;
    color: #2d3748;
  }

  &.selected strong {
    color: white;
  }

  small {
    display: block;
    color: #718096;
    font-size: 0.8rem;
    margin-top: 0.2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const NoResults = styled.div`
  padding: 0.75rem;
  color: #718096;
  font-size: 0.85rem;
  text-align: center;
  font-style: italic;
`;

// =============================================================================
// EDITABLE COMBOBOX COMPONENT
// =============================================================================

/**
 * EditableCombobox - Komponenta kombinující input s autocomplete
 *
 * Umožňuje:
 * - Volný text (uživatel může napsat cokoliv) - pokud strictSelect=false
 * - Pouze výběr ze seznamu - pokud strictSelect=true
 * - Našeptávání při shodě s položkami
 * - Výběr z našeptávaných položek
 *
 * @param {string} value - Aktuální hodnota
 * @param {function} onChange - Callback při změně hodnoty
 * @param {function} onKeyDown - Callback při stisku klávesy
 * @param {function} onBlur - Callback při opuštění inputu
 * @param {array} options - Pole možností pro našeptávání [{ code, name }, ...]
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Zakázání inputu
 * @param {boolean} hasError - Indikace chyby
 * @param {boolean} loading - Indikace načítání
 * @param {boolean} strictSelect - Pokud true, umožňuje pouze výběr ze seznamu (ne volné psaní)
 */
const EditableCombobox = ({
  value = '',
  onChange,
  onKeyDown,
  onBlur,
  options = [],
  placeholder = 'Začněte psát...',
  disabled = false,
  hasError = false,
  loading = false,
  strictSelect = false
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Synchronizace s vnější hodnotou
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Výpočet pozice dropdownu
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 320) // Minimálně 320px
      });
    }
  };

  // Aktualizovat pozici při otevření nebo scrollu
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();

      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  // Filtrování možností podle zadaného textu
  const filteredOptions = React.useMemo(() => {
    if (!inputValue || loading) return options;

    const searchTerm = inputValue.toLowerCase().trim();
    return options.filter(option => {
      const code = (option.code || '').toLowerCase();
      const name = (option.name || '').toLowerCase();
      const displayName = (option.displayName || '').toLowerCase();
      const dropdownDisplay = (option.dropdownDisplay || '').toLowerCase();
      const usek_zkr = (option.usek_zkr || '').toLowerCase();
      const usek_nazev = (option.usek_nazev || '').toLowerCase();
      return code.includes(searchTerm) || 
             name.includes(searchTerm) || 
             displayName.includes(searchTerm) ||
             dropdownDisplay.includes(searchTerm) ||
             usek_zkr.includes(searchTerm) ||
             usek_nazev.includes(searchTerm);
    });
  }, [inputValue, options, loading]);

  // Zavření dropdownu při kliku mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // Propagace změny nahoru
    if (onChange) {
      onChange({ target: { value: newValue } });
    }
  };

  const handleInputFocus = () => {
    if (!disabled && options.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = (e) => {
    // Delay pro umožnění kliku na položku
    // Poznámka: onMouseDown s preventDefault zajistí, že blur se nespustí při kliku
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);

      // ✅ STRICT SELECT: Pokud je zapnutý strict režim a hodnota není v seznamu, vymazat
      if (strictSelect && inputValue) {
        const isValid = options.some(opt => opt.code === inputValue);
        if (!isValid) {
          setInputValue('');
          if (onChange) {
            onChange({ target: { value: '' } });
          }
        }
      }

      if (onBlur) {
        onBlur(e);
      }
    }, 200);
  };

  const selectOption = (option) => {
    const newValue = option.code;
    setInputValue(newValue);
    setIsOpen(false);
    setHighlightedIndex(-1);

    // DŮLEŽITÉ: Propagace změny s novým value PŘED fokusem
    if (onChange) {
      onChange({ target: { value: newValue } });
    }

    // Focus až po propagaci změny
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    // Propagace key eventu pro navigaci v tabulce
    if (onKeyDown && !isOpen) {
      onKeyDown(e);
      return;
    }

    // Navigace v dropdown menu
    if (isOpen && filteredOptions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;

        case 'Enter':
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            e.preventDefault();
            selectOption(filteredOptions[highlightedIndex]);
          } else {
            // Enter bez výběru z dropdown - propaguj event
            if (onKeyDown) {
              onKeyDown(e);
            }
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;

        case 'Tab':
          // Tab zavře dropdown a pokračuje v navigaci
          setIsOpen(false);
          setHighlightedIndex(-1);
          if (onKeyDown) {
            onKeyDown(e);
          }
          break;

        default:
          // Pro ostatní klávesy - propaguj event
          if (onKeyDown) {
            onKeyDown(e);
          }
      }
    } else if (onKeyDown) {
      // Dropdown není otevřený - propaguj všechny eventy
      onKeyDown(e);
    }
  };

  return (
    <ComboboxWrapper ref={wrapperRef}>
      <ComboboxInput
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={loading ? 'Načítání...' : placeholder}
        disabled={disabled || loading}
        hasError={hasError}
        autoComplete="off"
      />

      {isOpen && !disabled && !loading && ReactDOM.createPortal(
        <DropdownList
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <DropdownItem
                key={`${option.code}-${index}`}
                className={`${highlightedIndex === index ? 'highlighted' : ''} ${
                  inputValue === option.code ? 'selected' : ''
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Zabrání blur eventu
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <strong>{option.dropdownDisplay || option.displayName || option.code}</strong>
                {option.name && <small>{option.name}</small>}
              </DropdownItem>
            ))
          ) : (
            <NoResults>
              {inputValue ? 'Žádná shoda. Můžete zadat vlastní text.' : 'Začněte psát pro filtrování...'}
            </NoResults>
          )}
        </DropdownList>,
        document.body
      )}
    </ComboboxWrapper>
  );
};

export default EditableCombobox;
