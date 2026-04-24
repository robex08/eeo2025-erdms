import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';
import { X, ChevronDown } from 'lucide-react';

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
    left: 0.625rem;
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
  height: 38px;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0 2.25rem 0 2rem' : '0 2.25rem 0 0.75rem'};
  padding-left: ${props => props.hasIcon ? '2rem' : '0.75rem'};
  padding-right: 2.25rem;
  border: 1.5px solid ${props => props.hasError ? '#dc2626' : props.$active ? '#f59e0b' : '#e2e8f0'};
  border-radius: 9px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  background: ${props => props.hasError ? '#fee2e2' : (props.disabled ? '#f9fafb' : (props.$active ? '#fffbeb' : '#ffffff'))};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  color: ${props => {
    if (props.disabled) return '#6b7280'; // Sladěno s disabled Input barvou
    if (props.placeholder || !props.value || props.value === '') return '#9ca3af';
    return '#1f2937';
  }};

  font-weight: ${props => props.disabled ? '400' : (props.$active ? '600' : '400')};


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
  transition: border-color 0.15s ease;
  box-shadow: none;

  &:hover {
    border-color: ${props => props.disabled ? '#e5e7eb' : (props.hasError ? '#dc2626' : '#94a3b8')};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#2563eb'};
    box-shadow: none;
  }
`;

const CustomSelectDropdown = styled.div`
  position: fixed;
  z-index: 2147483647;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
  max-height: 300px;
  overflow-y: auto;
  min-width: 200px;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Prevent text selection while scrolling */
  user-select: none;

  /* Optimalizace pro plynulejší scrollování */
  scroll-behavior: auto;
  contain: layout style paint;
  will-change: scroll-position;
  transform: translateZ(0); /* Force hardware acceleration */

  /* Stylový scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f8fafc;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
    transition: background 0.2s;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const CustomSelectOption = styled.div`
  padding: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  border-bottom: 1px solid #f3f4f6;
  color: #1f2937;
  font-weight: 400; /* Normal font pro všechny možnosti */

  /* Hierarchické zobrazení - level 0 (okresy) na pozadí, level 1 (stanoviště) odsazené */
  ${props => props.level === 0 && props.isParent && `
    background-color: #f9fafb;
    font-weight: 500;
  `}

  ${props => props.level === 1 && `
    padding-left: 2rem;
  `}

  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }

  ${props => props.selected && `
    background: #eff6ff;
    border-left: 3px solid #3b82f6;
    font-weight: 600; /* Bold jen pro vybranou možnost */
  `}

  ${props => props.highlighted && !props.selected && `
    background: #f8fafc;
    border-left: 3px solid #93c5fd;
  `}
`;

const CustomSelectGroupHeader = styled.div`
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  cursor: default;
`;

const SearchBox = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px 8px 0 0;
  /* Wrapper pro relativní pozicování ikony lupy uvnitř inputu */
  & > div[data-search-icon-wrapper] {
    position: relative;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.625rem 0.5rem 1.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
  display: flex;
  align-items: center;
  z-index: 1;
`;

const SelectedValue = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: none;
  letter-spacing: normal;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif !important;
  font-size: inherit;
  color: ${props => {
    if (props.disabled) return '#6b7280';
    return props.isEmpty ? '#9ca3af' : '#1f2937';
  }};
  font-weight: ${props => props.disabled ? '400' : (props.isEmpty ? '400' : '600')};
`;

const TwoLineLabel = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  gap: 2px;

  .line1 {
    font-weight: 700;
    font-size: 0.9em; /* menší písmo pro KÓD triggeru */
  }

  .line2 {
    font-size: 0.78em;
    color: #64748b;
    font-weight: 500;
  }
`;

const ClearButton = styled.span`
  position: absolute;
  right: 28px;
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
  width: 18px;
  height: 18px;
  border-radius: 4px;
  transition: background-color 0.15s ease, color 0.15s ease;
  z-index: 2;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  &:active {
    background: #e5e7eb;
  }
  
  svg {
    width: 12px;
    height: 12px;
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
    /* Klik přes checkbox propadne na parent MultiSelectOption - jinak nativní checkbox zachytí event a readOnly checkbox nereaguje */
    pointer-events: none;
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
  highlightActive,
  enableSearch = true, // Výchozí hodnota true, ale lze vypnout
  // Global state hooks
  selectStates,
  setSelectStates,
  searchStates,
  setSearchStates,
  touchedSelectFields,
  setTouchedSelectFields,
  hasTriedToSubmit,
  toggleSelect,
  filterOptions = (options, searchTerm, field) => {
    // Výchozí implementace pokud není poskytnuta
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(opt => {
      const label = opt.nazev || opt.label || opt.nazev_stavu || opt.name || opt.value || String(opt);
      return label.toLowerCase().includes(lowerSearch);
    });
  },
  getOptionLabel = (option, field) => {
    // Výchozí implementace pokud není poskytnuta
    if (!option) return '';
    return option.nazev || option.label || option.nazev_stavu || option.name || option.value || String(option);
  }
}) => {
  const isOpen = selectStates?.[field] || false;
  const searchTerm = searchStates?.[field] || '';
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);

  // State pro klávesovou navigaci
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // State pro pozicování dropdownu (pro portal)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpwards: false });

  // 🔥 OPRAVA: Fallback pro toggleSelect pokud není poskytnut
  const safeToggleSelect = toggleSelect || ((fieldName) => {
    if (setSelectStates) {
      setSelectStates(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    }
  });

  const filteredOptions = filterOptions(options, searchTerm, field);
  
  // Aktualizuj pozici dropdownu při otevření a při scrollu/resize
  React.useLayoutEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownMaxHeight = 300; // Max výška dropdownu
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Pokud není dost místa dole (méně než 300px) a nahoře je víc místa, otevři nahoru
        const openUpwards = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;
        
        setDropdownPosition({
          top: openUpwards ? rect.top - 4 : rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          openUpwards: openUpwards
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
      // Pro LP kódy porovnávej podle ID (field může být 'lp_kod' nebo 'lp_kod_row_123')
      if (field === 'lp_kod' || field.startsWith('lp_kod_')) {
        return (opt.id || opt.kod) === value || String(opt.id) === String(value) || opt === value;
      }
      // Pro druhy objednávky porovnávej podle value (kod_stavu)
      if (field === 'druh_objednavky_kod') {
        return (opt.value || opt.kod || opt.id) === value || opt === value;
      }
      // Pro filtry faktur porovnávej podle value
      if (field === 'fa_typ' || field === 'stav' || field === 'vecna_kontrola' || field === 'ma_prilohy' ||
          field === 'floating_fa_typ' || field === 'floating_stav' || field === 'floating_vecna_kontrola' || field === 'ma_prilohy_floating') {
        return (opt.value || opt.id) === value || opt === value;
      }
      // Pro rok, období a sekci (ProfilePage) porovnávej podle value
      if (field === 'vychozi_rok' || field === 'vychozi_obdobi' || field === 'vychozi_sekce_po_prihlaseni') {
        return opt.value === value || opt === value;
      }
      // 🆕 Pro garanta a příkazce (ProfilePage) porovnávej podle value (může být string nebo number)
      if (field === 'vychozi_garant_id' || field === 'vychozi_prikazce_id') {
        return opt.value == value || opt === value; // == pro porovnání string vs number
      }
      // Pro ostatní podle ID
      return (opt.id || opt.user_id || opt.uzivatel_id) === value || opt === value;
    });

  // Pro production můžeme debug vypnout
  // if (field.includes('_id') && field !== 'lp_kod' && value) {
  // }

  const displayValue = multiple
    ? (Array.isArray(value) && value.length > 0
        ? (value.length === 1
            ? (() => {
                const option = options.find(opt => (opt.id || opt.kod || opt.value) === value[0]);
                if (!option) return String(value[0]);
                // Zkus getOptionLabel (pokud je custom)
                if (typeof getOptionLabel === 'function') {
                  const customLabel = getOptionLabel(option, field);
                  if (customLabel && customLabel !== String(value[0])) {
                    return typeof customLabel === 'string' ? customLabel.replace(/\s*\n\s*/g, ' ') : String(customLabel);
                  }
                }
                const rawLabel = option.label || option.cislo_lp || option.nazev || option.nazev_role || option.prijmeni || value[0];
                return typeof rawLabel === 'string' ? rawLabel.replace(/\s*\n\s*/g, ' ') : String(rawLabel);
              })()
            : `Vybráno: ${value.length}`)
        : placeholder)
    : (selectedOption ? getOptionLabel(selectedOption, field) : placeholder);

  const filterFieldNames = new Set([
    'fa_typ',
    'stav',
    'vecna_kontrola',
    'ma_prilohy',
    'floating_fa_typ',
    'floating_stav',
    'floating_vecna_kontrola',
    'ma_prilohy_floating',
    'statusFilter'
  ]);

  // Pro multiselect kontroluj hodnotu jinak
  // Pro filtry: prázdná hodnota '', null, undefined znamená "Vše" = nemá aktivní filtr
  const isFilterFieldForHasValue = typeof field === 'string' && filterFieldNames.has(field);
  
  // Extrahuj skutečnou hodnotu - může být string nebo objekt {value: ...}
  const actualValue = (typeof value === 'object' && value !== null && 'value' in value) 
    ? value.value 
    : value;
  
  const hasValue = multiple
    ? (Array.isArray(value) && value.length > 0)
    : (isFilterFieldForHasValue 
        ? (actualValue !== '' && actualValue !== null && actualValue !== undefined && actualValue !== 'all')
        : selectedOption);

  const isFilterField = typeof highlightActive === 'boolean'
    ? highlightActive
    : (typeof field === 'string' && (/filter/i.test(field) || filterFieldNames.has(field)));
  const isActiveHighlight = Boolean(isFilterField && hasValue && !disabled && !hasError);

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
        } else if (field === 'lp_kod' || field.startsWith('lp_kod_')) {
          return (opt.id || opt.kod) === value || String(opt.id) === String(value) || opt === value;
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

  // Scroll highlighted option do view - VYPNUTO (nechceme auto-scroll při výběru)
  // useEffect(() => {
  //   if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
  //     const optionElement = optionRefs.current[highlightedIndex];
  //     if (optionElement && dropdownRef.current) {
  //       const dropdown = dropdownRef.current;
  //       const optionRect = optionElement.getBoundingClientRect();
  //       const dropdownRect = dropdown.getBoundingClientRect();

  //       // Scroll pouze pokud option není viditelná
  //       if (optionRect.top < dropdownRect.top) {
  //         optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  //       } else if (optionRect.bottom > dropdownRect.bottom) {
  //         optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  //       }
  //     }
  //   }
  // }, [highlightedIndex, isOpen]);

  const handleClear = (e) => {
    e.stopPropagation(); // Prevent opening dropdown
    
    if (disabled) return;
    
    // Clear the value - pro multiselect prázdné pole, jinak prázdný string
    const clearedValue = multiple ? [] : '';
    onChange({ target: { value: clearedValue } });
    
    // Mark as touched
    if (setTouchedSelectFields && typeof setTouchedSelectFields === 'function') {
      setTouchedSelectFields((prev) => ({ ...prev, [field]: true }));
    }
    
    // Trigger onBlur if provided
    if (onBlur) {
      onBlur({ target: { value: clearedValue } });
    }
  };

  const handleSelect = (option) => {
    // Skupinové hlavičky jsou pouze vizuální – nelze je vybrat
    if (!option || option.isGroupHeader) return;

    let optionValue;

    // Pro stav objednávky ukládej kod_stavu/kod
    if (field === 'statusFilter') {
      optionValue = option.kod_stavu || option.kod || option;
    } else if (field === 'pageSize') {
      optionValue = option.value || option.id || option;
    } else if (field === 'zpusob_financovani') {
      // Pro financování ukládej kod_stavu
      optionValue = option.kod || option.id || option;
    } else if (field === 'lp_kod' || field.startsWith('lp_kod_')) {
      // Pro LP kódy ukládej ID LP záznamu
      optionValue = option.id || option.kod || option;
    } else if (field === 'druh_objednavky_kod') {
      // Pro druhy objednávky ukládej value (což je kod_stavu)
      optionValue = option.value || option.kod || option.id || option;
    } else if (field === 'fa_typ' || field === 'stav' || field === 'vecna_kontrola' || field === 'ma_prilohy' ||
               field === 'floating_fa_typ' || field === 'floating_stav' || field === 'floating_vecna_kontrola' || field === 'ma_prilohy_floating') {
      // Pro faktury - vracíme PŘÍMO hodnotu (string), respektujeme prázdný string pro "Vše"
      optionValue = 'value' in option ? option.value : (option.id !== undefined ? option.id : option);
      onChange(optionValue); // PŘÍMO hodnota, ne event wrapper
      setSelectStates(prev => ({ ...prev, [field]: false }));
      setSearchStates(prev => ({ ...prev, [field]: '' }));
      if (setTouchedSelectFields && typeof setTouchedSelectFields === 'function') {
        setTouchedSelectFields(prev => ({ ...prev, [field]: true }));
      }
      if (onBlur) {
        onBlur(field, optionValue);
      }
      return;
    } else if (field === 'vychozi_garant_id' || field === 'vychozi_prikazce_id') {
      // 🆕 Pro garanta a příkazce (ProfilePage) ukládej value
      optionValue = option.value || option.id || option.user_id || option;
    } else {
      optionValue = option.id || option.user_id || option.uzivatel_id || option;
    }

    onChange({ target: { value: optionValue } });
    setSelectStates(prev => ({ ...prev, [field]: false }));
    setSearchStates(prev => ({ ...prev, [field]: '' }));

    // Označ pole jako touched při výběru hodnoty
    if (setTouchedSelectFields && typeof setTouchedSelectFields === 'function') {
      setTouchedSelectFields(prev => ({ ...prev, [field]: true }));
    }

    // Zavolej onBlur callback pro automatické ukládání
    if (onBlur) {
      onBlur(field, optionValue);
    }
  };

  const handleToggleOption = (option) => {
    // Skupinové hlavičky jsou pouze vizuální – nelze je vybrat
    if (!option || option.isGroupHeader) return;

    let optionValue;

    // Pro LP kódy ukládej ID LP záznamu
    if (field === 'lp_kod' || field.startsWith('lp_kod_')) {
      optionValue = option.id || option.kod || option;
    } else {
      optionValue = option.id || option.user_id || option.value || option;
    }

    const currentValues = Array.isArray(value) ? value : [];
    // OPRAVA: Porovnávej s type-coercion (== místo ===) kvůli string/number nekonzistenci z API
    const isAlreadySelected = currentValues.some(v => v == optionValue);
    const newValues = isAlreadySelected
      ? currentValues.filter(v => v != optionValue)
      : [...currentValues, optionValue];

    // Zachovat scroll pozici před změnou
    const scrollPosition = dropdownRef.current?.scrollTop || 0;

    onChange(newValues); // Pro multiselect pošli přímo array

    // Označ pole jako touched při výběru hodnoty
    if (setTouchedSelectFields && typeof setTouchedSelectFields === 'function') {
      setTouchedSelectFields(prev => ({ ...prev, [field]: true }));
    }

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
            safeToggleSelect(field);
          }
        }}
        disabled={disabled}
        hasError={shouldShowError}
        $active={isActiveHighlight}
        data-filter-active={isActiveHighlight ? 'true' : 'false'}
        placeholder={(multiple ? !hasValue : !selectedOption) ? "true" : "false"}
        value={(multiple ? (hasValue ? 'selected' : '') : (selectedOption ? value : ''))}
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
            safeToggleSelect(field);
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
                  // Přeskočit skupinové hlavičky
                  if (option && option.isGroupHeader) return;
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
          if (setTouchedSelectFields && typeof setTouchedSelectFields === 'function') {
            setTouchedSelectFields(prev => ({ ...prev, [field]: true }));
          }

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
        <SelectedValue isEmpty={multiple ? !hasValue : !selectedOption} disabled={disabled} title={
          multiple && Array.isArray(value) && value.length > 1
            ? value.map(val => {
                const opt = options.find(o => (o.id || o.user_id || o.value || o.kod) === val);
                if (!opt) return String(val);
                // Použij getOptionLabel pokud je definován
                if (typeof getOptionLabel === 'function') {
                  const lbl = getOptionLabel(opt, field);
                  if (lbl && lbl !== String(val)) return lbl;
                }
                return opt.label || opt.nazev || opt.nazev_role || (opt.prijmeni ? `${opt.prijmeni} ${opt.jmeno || ''}`.trim() : null) || opt.cislo_lp || String(val);
              }).join('\n')
            : undefined
        }>
          {displayValue}
        </SelectedValue>
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
        {!disabled && (
          <span style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
            transition: 'transform 0.15s ease',
            color: '#6b7280',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center'
          }}>
            <ChevronDown size={16} />
          </span>
        )}
      </CustomSelectButton>

      {isOpen && !disabled && createPortal(
        <CustomSelectDropdown 
          ref={dropdownRef}
          style={{
            top: dropdownPosition.openUpwards ? 'auto' : `${dropdownPosition.top}px`,
            bottom: dropdownPosition.openUpwards ? `${window.innerHeight - dropdownPosition.top}px` : 'auto',
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {enableSearch && options.length > 5 && (
            <SearchBox>
              <div data-search-icon-wrapper>
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
                        // Přeskočit skupinové hlavičky
                        if (option && option.isGroupHeader) return;
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
              </div>
            </SearchBox>
          )}

          {loading ? (
            <CustomSelectOption>{loadingText}</CustomSelectOption>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              // Skupinové hlavičky (neklikatelné)
              if (option && option.isGroupHeader) {
                return (
                  <CustomSelectGroupHeader
                    key={option.id || option.value || `group-${index}`}
                    title={option.label || option.name || ''}
                  >
                    {option.label || option.name}
                  </CustomSelectGroupHeader>
                );
              }

              const isSelected = multiple
                ? (Array.isArray(value) ? value.some(v => v == (option.id || option.user_id || option.value || option.kod || option)) : false)
                : field === 'statusFilter'
                ? ((option.kod_stavu || option.kod) === value || option === value)
                : field === 'pageSize'
                ? ((option.value || option.id) === value || option === value)
                : field === 'zpusob_financovani'
                ? ((option.kod || option.id) === value || option === value)
                : (field === 'lp_kod' || field.startsWith('lp_kod_'))
                ? ((option.id || option.kod) === value || String(option.id) === String(value) || option === value)
                : field === 'druh_objednavky_kod'
                ? ((option.value || option.kod || option.id) === value || option === value)
                : field === 'fa_typ' || field === 'stav' || field === 'vecna_kontrola' || field === 'ma_prilohy' ||
                  field === 'floating_fa_typ' || field === 'floating_stav' || field === 'floating_vecna_kontrola' || field === 'ma_prilohy_floating'
                ? ((option.value || option.id) === value || option === value)
                : ((option.id || option.user_id || option.uzivatel_id) === value || option === value);

              const isHighlighted = highlightedIndex === index;

              // Pro všechny multiselect používej speciální komponentu s checkboxem
              if (multiple) {
                const optionLabel = getOptionLabel(option, field);
                const optionLabelForTitle = typeof optionLabel === 'string' ? optionLabel.replace(/\s*\n\s*/g, ' ') : String(optionLabel);
                const isTwoLine = field === 'templateEventTypes' && typeof optionLabel === 'string' && optionLabel.includes('\n');
                const [line1, ...rest] = isTwoLine ? optionLabel.split('\n') : [];
                const line2 = isTwoLine ? rest.join('\n') : '';
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
                    title={optionLabelForTitle}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                    />
                    <span>
                      {isTwoLine ? (
                        <TwoLineLabel>
                          <span className="line1">{line1}</span>
                          <span className="line2">{line2}</span>
                        </TwoLineLabel>
                      ) : (
                        optionLabel
                      )}
                    </span>
                  </MultiSelectOption>
                );
              }

              // Pro ostatní selecty používej CustomSelectOption
              const optionLabel = getOptionLabel(option, field);
              const optionLabelForTitle = typeof optionLabel === 'string' ? optionLabel.replace(/\s*\n\s*/g, ' ') : String(optionLabel);
              const isTwoLine = field === 'templateEventTypes' && typeof optionLabel === 'string' && optionLabel.includes('\n');
              const [line1, ...rest] = isTwoLine ? optionLabel.split('\n') : [];
              const line2 = isTwoLine ? rest.join('\n') : '';
              return (
                <CustomSelectOption
                  className={disabled ? 'custom-select-disabled' : ''}
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
                  title={optionLabelForTitle}
                >
                  {isTwoLine ? (
                    <TwoLineLabel>
                      <span className="line1">{line1}</span>
                      <span className="line2">{line2}</span>
                    </TwoLineLabel>
                  ) : (
                    optionLabel
                  )}
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