import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';
import { X } from 'lucide-react';

// =============================================================================
// STYLED COMPONENTS - PŘESNĚ PODLE VZORU Z OrderForm25.js
// =============================================================================

const CustomSelectWrapper = styled.div`
  position: relative;
  width: 100%;
  z-index: ${props => props.isOpen ? 10000 : 1};
`;

// Wrapper pro select s ikonou
const SelectWithIcon = styled.div`
  position: relative;
  width: 100%;

  svg.prefix-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px;
    height: 16px;
  }
`;

const CustomSelectButton = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.75rem 1.75rem 0.75rem 2.5rem' : '0.75rem 1.75rem 0.75rem 0.75rem'};
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: ${props => props.hasError ? '#fee2e2' : (props.disabled ? '#f9fafb' : '#ffffff')};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  color: ${props => {
    if (props.disabled) return '#6b7280'; // Sladěno s disabled Input barvou
    if (props.placeholder || !props.value || props.value === '') return '#9ca3af';
    return '#1f2937';
  }};

  font-weight: ${props => props.disabled ? '400' : (props.value && props.value !== '' && props.placeholder !== "true" ? '600' : '400')};

  /* CSS třída pro disabled stav - nejsilnější možný override */
  &.custom-select-disabled {
    font-weight: 400 !important;
    color: #6b7280 !important; /* Sladěno s disabled Input barvou */
  }
  &.custom-select-disabled * {
    font-weight: 400 !important;
    color: #6b7280 !important;
  }

  display: flex;
  align-items: center;
  position: relative;
  transition: all 0.2s ease;

  /* Custom arrow */
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  background-image: ${props => {
    if (props.disabled) {
      return props.isOpen
        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E")`
        : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;
    } else if (props.hasError) {
      return props.isOpen
        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b91c1c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E")`
        : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b91c1c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;
    } else {
      return props.isOpen
        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E")`
        : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;
    }
  }};
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;

  &:hover {
    border-color: ${props => props.disabled ? '#e5e7eb' : (props.hasError ? '#dc2626' : '#3b82f6')};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }
`;

const CustomSelectDropdown = styled.div`
  position: fixed;
  z-index: 99999;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  min-width: 200px;

  /* Prevent text selection while scrolling */
  user-select: none;

  /* Optimalizace pro plynulejší scrollování */
  scroll-behavior: auto;
  contain: layout style paint;
  will-change: scroll-position;
  transform: translateZ(0); /* Force hardware acceleration */

  /* Lepší scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: #d1d5db #f9fafb;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f9fafb;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

const CustomSelectOption = styled.div`
  padding: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  border-bottom: 1px solid #f3f4f6;
  color: #1f2937;
  font-weight: 400 !important; /* Normal font pro všechny možnosti - s !important */

  /* Hierarchické zobrazení - level 0 (okresy) tučně, level 1 (stanoviště) odsazené */
  ${props => props.level === 0 && props.isParent && `
    font-weight: 600 !important;
    background-color: #f9fafb;
  `}

  ${props => props.level === 1 && `
    padding-left: 2rem;
  `}

  &:hover {
    background: #f8fafc;
    font-weight: ${props => props.level === 0 && props.isParent ? '600 !important' : '400 !important'};
  }

  &:last-child {
    border-bottom: none;
  }

  ${props => props.selected && `
    background: #eff6ff;
    border-left: 3px solid #3b82f6;
    font-weight: 600 !important; /* Bold jen pro vybranou možnost */
  `}

  ${props => props.highlighted && !props.selected && `
    background: #f8fafc;
    border-left: 3px solid #93c5fd;
  `}
`;

const SearchBox = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px 8px 0 0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
`;

const SelectedValue = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${props => props.isEmpty ? '#9ca3af' : '#1f2937'};
  font-weight: ${props => props.disabled ? '400' : (props.isEmpty ? '400' : '600')};
`;

const ClearButton = styled.span`
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  transition: all 0.2s ease;
  z-index: 2;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  &:active {
    background: #e5e7eb;
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const MultiSelectOption = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;

  &:hover {
    background-color: #f3f4f6;
  }

  ${props => props.highlighted && `
    background-color: #f8fafc;
    border-left: 3px solid #93c5fd;
  `}

  input[type="checkbox"] {
    margin-right: 8px;
    cursor: pointer;
  }

  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #1f2937;
    font-size: 14px;
  }
`;

// =============================================================================
// CUSTOM SELECT KOMPONENTA - PŘESNĚ PODLE VZORU Z OrderForm25.js
// =============================================================================

const CustomSelect = ({
  value,
  onChange,
  onBlur,
  options = [],
  placeholder,
  disabled = false,
  hasError = false,
  required = false,
  field,
  loading = false,
  loadingText = '',
  icon = null,
  multiple = false,
  isClearable = false,
  // Global state hooks
  selectStates,
  setSelectStates,
  searchStates,
  setSearchStates,
  touchedSelectFields,
  setTouchedSelectFields,
  hasTriedToSubmit,
  toggleSelect,
  filterOptions,
  getOptionLabel
}) => {
  const isOpen = selectStates[field];
  const searchTerm = searchStates[field];
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);

  // State pro klávesovou navigaci
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // State pro pozicování dropdownu (pro portal)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const filteredOptions = filterOptions(options, searchTerm, field);
  
  // Aktualizuj pozici dropdownu při otevření a při scrollu/resize
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    };

    updatePosition();

    if (isOpen) {
      // Při scrollu nebo resize aktualizuj pozici
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const selectedOption = multiple
    ? null // Pro multiselect nepoužíváme selectedOption
    : options.find(opt => {
      // Pro stav objednávky porovnávej podle kod_stavu/kod
      if (field === 'statusFilter') {
        return (opt.kod_stavu || opt.kod) === value || opt === value;
      }
      // Pro pageSize porovnávej podle value
      if (field === 'pageSize') {
        return (opt.value || opt.id) === value || opt === value;
      }
      // Pro financování porovnávej podle kodu
      if (field === 'zpusob_financovani') {
        return (opt.kod || opt.id) === value || opt === value;
      }
      // Pro LP kódy porovnávej podle ID
      if (field === 'lp_kod') {
        return (opt.id || opt.kod) === value || opt === value;
      }
      // Pro druhy objednávky porovnávej podle value (kod_stavu)
      if (field === 'druh_objednavky_kod') {
        return (opt.value || opt.kod || opt.id) === value || opt === value;
      }
      // Pro typ faktury porovnávej podle id
      if (field === 'fa_typ') {
        return opt.id === value || opt === value;
      }
      // Pro rok, období a sekci (ProfilePage) porovnávej podle value
      if (field === 'vychozi_rok' || field === 'vychozi_obdobi' || field === 'vychozi_sekce_po_prihlaseni') {
        return opt.value === value || opt === value;
      }
      // Pro ostatní podle ID
      return (opt.id || opt.user_id || opt.uzivatel_id) === value || opt === value;
    });

  // Pro production můžeme debug vypnout
  // if (field.includes('_id') && field !== 'lp_kod' && value) {
  //   console.log(`🎯 CustomSelect[${field}] selectedOption:`, selectedOption, 'z options.length=', options.length);
  // }

  const displayValue = multiple && field === 'lp_kod'
    ? (Array.isArray(value) && value.length > 0
        ? value.map(val => {
            const option = options.find(opt => (opt.id || opt.kod) === val);
            // OPRAVA: Použij label místo jen cislo_lp, aby se zobrazil celý název včetně popisu
            return option ? (option.label || option.cislo_lp || val) : val;
          }).join(', ')
        : placeholder)
    : (selectedOption ? getOptionLabel(selectedOption, field) : placeholder);

  // Pro multiselect LP kódy kontroluj hodnotu jinak
  const hasValue = multiple && field === 'lp_kod'
    ? (Array.isArray(value) && value.length > 0)
    : selectedOption;

  const shouldShowError = hasError || (required && !hasValue && !loading && !disabled && hasTriedToSubmit);

  // Zavři dropdown při kliku mimo
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSelectStates(prev => ({ ...prev, [field]: false }));
        setSearchStates(prev => ({ ...prev, [field]: '' }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, field, setSelectStates, setSearchStates]);

  // Reset highlighted indexu při otevření/zavření dropdownu
  useEffect(() => {
    if (isOpen) {
      // Vynuluj optionRefs při změně filteredOptions
      optionRefs.current = [];

      // Najdi index aktuálně vybrané hodnoty
      const selectedIndex = filteredOptions.findIndex(opt => {
        if (field === 'statusFilter') {
          return (opt.kod_stavu || opt.kod) === value || opt === value;
        } else if (field === 'pageSize') {
          return (opt.value || opt.id) === value || opt === value;
        } else if (field === 'zpusob_financovani') {
          return (opt.kod || opt.id) === value || opt === value;
        } else if (field === 'lp_kod') {
          return (opt.id || opt.kod) === value || opt === value;
        } else if (field === 'druh_objednavky_kod') {
          return (opt.value || opt.kod || opt.id) === value || opt === value;
        } else if (field === 'fa_typ') {
          return opt.id === value || opt === value;
        } else {
          return (opt.id || opt.user_id || opt.uzivatel_id) === value || opt === value;
        }
      });
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, filteredOptions, value, field]);

  // Auto-focus search inputu při otevření (pouze pro větší seznamy, opatrně)
  useEffect(() => {
    if (isOpen && options.length > 5 && searchInputRef.current) {
      setTimeout(() => {
        // Pouze pokud není již focused jiný element v dropdown
        if (searchInputRef.current && !document.activeElement?.closest('[data-custom-select]')) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, options.length]);

  // Scroll highlighted option do view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      const optionElement = optionRefs.current[highlightedIndex];
      if (optionElement && dropdownRef.current) {
        const dropdown = dropdownRef.current;
        const optionRect = optionElement.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();

        // Scroll pouze pokud option není viditelná
        if (optionRect.top < dropdownRect.top) {
          optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (optionRect.bottom > dropdownRect.bottom) {
          optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleClear = (e) => {
    e.stopPropagation(); // Prevent opening dropdown
    
    if (disabled) return;
    
    // Clear the value - pro multiselect prázdné pole, jinak prázdný string
    const clearedValue = multiple ? [] : '';
    onChange({ target: { value: clearedValue } });
    
    // Mark as touched
    if (setTouchedSelectFields) {
      setTouchedSelectFields((prev) => ({ ...prev, [field]: true }));
    }
    
    // Trigger onBlur if provided
    if (onBlur) {
      onBlur({ target: { value: clearedValue } });
    }
  };

  const handleSelect = (option) => {
    let optionValue;

    // Pro stav objednávky ukládej kod_stavu/kod
    if (field === 'statusFilter') {
      optionValue = option.kod_stavu || option.kod || option;
    } else if (field === 'pageSize') {
      optionValue = option.value || option.id || option;
    } else if (field === 'zpusob_financovani') {
      // Pro financování ukládej kod_stavu
      optionValue = option.kod || option.id || option;
    } else if (field === 'lp_kod') {
      // Pro LP kódy ukládej ID LP záznamu
      optionValue = option.id || option.kod || option;
    } else if (field === 'druh_objednavky_kod') {
      // Pro druhy objednávky ukládej value (což je kod_stavu)
      optionValue = option.value || option.kod || option.id || option;
    } else if (field === 'fa_typ') {
      // Pro typ faktury ukládej id
      optionValue = option.id || option;
    } else {
      optionValue = option.id || option.user_id || option.uzivatel_id || option;
    }

    onChange({ target: { value: optionValue } });
    setSelectStates(prev => ({ ...prev, [field]: false }));
    setSearchStates(prev => ({ ...prev, [field]: '' }));

    // Označ pole jako touched při výběru hodnoty
    setTouchedSelectFields(prev => new Set(prev).add(field));

    // Zavolej onBlur callback pro automatické ukládání
    if (onBlur) {
      onBlur(field, optionValue);
    }
  };

  const handleToggleOption = (option) => {
    let optionValue;

    // Pro LP kódy ukládej ID LP záznamu
    if (field === 'lp_kod') {
      optionValue = option.id || option.kod || option;
    } else {
      optionValue = option.id || option.user_id || option.value || option;
    }

    const currentValues = Array.isArray(value) ? value : [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];

    // Zachovat scroll pozici před změnou
    const scrollPosition = dropdownRef.current?.scrollTop || 0;

    onChange(newValues); // Pro multiselect pošli přímo array

    // Označ pole jako touched při výběru hodnoty
    setTouchedSelectFields(prev => new Set(prev).add(field));

    // Zavolej onBlur callback pro automatické ukládání
    if (onBlur) {
      onBlur(field, newValues);
    }

    // OPRAVA: Zachovat scroll pozici a neměnit focus pokud není nutné
    if (multiple) {
      requestAnimationFrame(() => {
        if (dropdownRef.current) {
          dropdownRef.current.scrollTop = scrollPosition;
        }
        // Neměnit focus, nechat uživatele rolovat v klidu
      });
    }
  };

  return (
    <CustomSelectWrapper data-custom-select data-field={field} isOpen={isOpen}>
      <CustomSelectButton
        ref={buttonRef}
        onClick={() => {
          if (!disabled) {
            toggleSelect(field);
          }
        }}
        disabled={disabled}
        hasError={shouldShowError}
        placeholder={!selectedOption ? "true" : "false"}
        value={selectedOption ? value : ''}
        isOpen={isOpen}
        data-field={field}
        tabIndex={disabled ? -1 : 0}
        className={disabled ? 'custom-select-disabled' : ''}
        style={{
          fontWeight: disabled ? '400 !important' : undefined,
          color: disabled ? '#6b7280 !important' : undefined
        }}
        onKeyDown={(e) => {
          if (disabled) return;

          // Space nebo Enter otevře dropdown (pokud není otevřený)
          if ((e.key === ' ' || e.key === 'Enter') && !isOpen) {
            e.preventDefault();
            toggleSelect(field);
            return;
          }

          // Šipky a další klávesy fungují když je dropdown otevřený
          if (isOpen) {
            switch (e.key) {
              case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                  prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;

              case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;

              case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                  const option = filteredOptions[highlightedIndex];
                  multiple ? handleToggleOption(option) : handleSelect(option);
                }
                break;

              case 'Escape':
                e.preventDefault();
                setSelectStates(prev => ({ ...prev, [field]: false }));
                setSearchStates(prev => ({ ...prev, [field]: '' }));
                buttonRef.current?.focus();
                break;

              case 'Tab':
                // 🔒 VŽDY zabránit default Tab behavior když je dropdown otevřený!
                e.preventDefault();

                // ✅ Při Tab VYBER zvýrazněnou položku PŘED zavřením dropdownu
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                  const option = filteredOptions[highlightedIndex];
                  multiple ? handleToggleOption(option) : handleSelect(option);
                }

                // Zavři dropdown
                setSelectStates(prev => ({ ...prev, [field]: false }));
                setSearchStates(prev => ({ ...prev, [field]: '' }));

                // Po zavření vrať focus na button a simuluj Tab pro přeskok na další pole
                setTimeout(() => {
                  buttonRef.current?.focus();
                  // Simuluj Tab key event pro přeskok na další pole
                  const tabEvent = new KeyboardEvent('keydown', {
                    key: 'Tab',
                    code: 'Tab',
                    keyCode: 9,
                    which: 9,
                    bubbles: true,
                    cancelable: true
                  });
                  buttonRef.current?.dispatchEvent(tabEvent);
                }, 0);
                break;

              default:
                // Pokud je to písmeno/číslo a není search box, otevři dropdown a přesuň focus na search
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                  if (searchInputRef.current) {
                    searchInputRef.current.focus();
                    // Nechej klávesovou událost propadnout do search inputu
                  }
                }
                break;
            }
          }
        }}
        onBlur={() => {
          // Označ pole jako touched
          setTouchedSelectFields(prev => new Set(prev).add(field));

          // Volej onBlur pouze pokud není dropdown otevřený
          if (!isOpen && onBlur) {
            onBlur(field, value);
          }
        }}
        hasIcon={!!icon}
      >
        {icon && <span style={{
          position: 'absolute',
          left: '12px',
          color: '#9ca3af',
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {React.cloneElement(icon, { size: 16 })}
        </span>}
        <SelectedValue isEmpty={!selectedOption} disabled={disabled}>{displayValue}</SelectedValue>
        {isClearable && !disabled && hasValue && (
          <ClearButton
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClear(e);
              }
            }}
            title="Smazat hodnotu"
          >
            <X />
          </ClearButton>
        )}
      </CustomSelectButton>

      {isOpen && !disabled && createPortal(
        <CustomSelectDropdown 
          ref={dropdownRef}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {options.length > 5 && (
            <SearchBox>
              <SearchIcon>
                <FontAwesomeIcon icon={faSearch} size="sm" />
              </SearchIcon>
              <SearchInput
                ref={searchInputRef}
                type="text"
                placeholder="Vyhledat..."
                value={searchTerm}
                onChange={(e) => setSearchStates(prev => ({
                  ...prev,
                  [field]: e.target.value
                }))}
                onKeyDown={(e) => {
                  // 🎯 Šipky nahoru/dolů POUZE pro navigaci v dropdownu
                  // 👉 preventDefault() zruší pohyb kurzoru v inputu
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (e.key === 'ArrowDown') {
                      setHighlightedIndex(prev =>
                        prev < filteredOptions.length - 1 ? prev + 1 : prev
                      );
                    } else {
                      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                    }
                    return;
                  }

                  // Ostatní klávesy
                  switch (e.key) {
                    case 'Enter':
                      e.preventDefault();
                      e.stopPropagation();
                      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                        const option = filteredOptions[highlightedIndex];
                        multiple ? handleToggleOption(option) : handleSelect(option);
                      }
                      break;

                    case 'Escape':
                      e.preventDefault();
                      setSelectStates(prev => ({ ...prev, [field]: false }));
                      setSearchStates(prev => ({ ...prev, [field]: '' }));
                      buttonRef.current?.focus();
                      break;

                    case 'Tab':
                      // 🔒 VŽDY zabránit default Tab behavior když je dropdown otevřený!
                      e.preventDefault();

                      // ✅ Při Tab VYBER zvýrazněnou položku PŘED zavřením dropdownu
                      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                        const option = filteredOptions[highlightedIndex];
                        multiple ? handleToggleOption(option) : handleSelect(option);
                      }

                      // Zavři dropdown
                      setSelectStates(prev => ({ ...prev, [field]: false }));
                      setSearchStates(prev => ({ ...prev, [field]: '' }));

                      // Po zavření vrať focus na button a simuluj Tab pro přeskok na další pole
                      setTimeout(() => {
                        buttonRef.current?.focus();
                        // Simuluj Tab key event pro přeskok na další pole
                        const tabEvent = new KeyboardEvent('keydown', {
                          key: 'Tab',
                          code: 'Tab',
                          keyCode: 9,
                          which: 9,
                          bubbles: true,
                          cancelable: true
                        });
                        buttonRef.current?.dispatchEvent(tabEvent);
                      }, 0);
                      break;

                    default:
                      break;
                  }
                }}
              />
            </SearchBox>
          )}

          {loading ? (
            <CustomSelectOption>{loadingText}</CustomSelectOption>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = multiple && field === 'lp_kod'
                ? (Array.isArray(value) ? value.includes(option.id || option.kod || option) : false)
                : field === 'statusFilter'
                ? ((option.kod_stavu || option.kod) === value || option === value)
                : field === 'pageSize'
                ? ((option.value || option.id) === value || option === value)
                : field === 'zpusob_financovani'
                ? ((option.kod || option.id) === value || option === value)
                : field === 'lp_kod'
                ? ((option.id || option.kod) === value || option === value)
                : field === 'druh_objednavky_kod'
                ? ((option.value || option.kod || option.id) === value || option === value)
                : field === 'fa_typ'
                ? (option.id === value || option === value)
                : ((option.id || option.user_id || option.uzivatel_id) === value || option === value);

              const isHighlighted = highlightedIndex === index;

              // Pro multiselect LP kódy používej speciální komponentu s checkboxem
              if (multiple && field === 'lp_kod') {
                return (
                  <MultiSelectOption
                    key={option.id || option.user_id || option.value || index}
                    level={0}
                    highlighted={isHighlighted}
                    ref={el => optionRefs.current[index] = el}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleOption(option);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                    />
                    <span>
                      {getOptionLabel(option, field)}
                    </span>
                  </MultiSelectOption>
                );
              }

              // Pro ostatní selecty používej CustomSelectOption
              return (
                <CustomSelectOption
                  key={option.id || option.user_id || option.uzivatel_id || option.kod_stavu || option.kod || option.value || index}
                  selected={isSelected}
                  highlighted={isHighlighted}
                  level={option.level !== undefined ? option.level : 0}
                  isParent={option.isParent || false}
                  ref={el => optionRefs.current[index] = el}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    multiple ? handleToggleOption(option) : handleSelect(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {getOptionLabel(option, field)}
                </CustomSelectOption>
              );
            })
          ) : (
            <CustomSelectOption>Žádné výsledky</CustomSelectOption>
          )}
        </CustomSelectDropdown>,
        document.body
      )}
    </CustomSelectWrapper>
  );
};

export { CustomSelect, SelectWithIcon };