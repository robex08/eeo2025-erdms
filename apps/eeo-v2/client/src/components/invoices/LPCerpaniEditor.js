/**
 * LPCerpaniEditor.js - Komponenta pro rozdělení částky faktury mezi LP kódy
 * 
 * 🎯 ÚČEL:
 * Umožňuje uživatelům při kontrole věcné správnosti rozdělit částku faktury
 * mezi více LP (Limitované příslby) kódů. Tím se sleduje skutečné čerpání
 * LP na úrovni faktur, ne jen plánované na úrovni položek.
 * 
 * ✅ PRAVIDLA:
 * - Součet částek MUSÍ být ≤ fa_castka (nesmí překročit)
 * - Pokud je financování typu LP, MUSÍ být min. 1 LP kód přiřazen
 * - Každá částka MUSÍ být > 0
 * - Auto-fill pro jeden LP kód (celá fa_castka)
 * 
 * 📊 DATA:
 * - Input: faktura (fa_castka), orderData (financovani)
 * - Output: lpCerpani array [{lp_cislo, lp_id, castka, poznamka}]
 * 
 * Created: 2025-12-29
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTimes,
  faInfoCircle,
  faExclamationTriangle,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { Trash, Hash } from 'lucide-react';
import { CustomSelect } from '../CustomSelect';

// ============ STYLED COMPONENTS ============

const EditorWrapper = styled.div`
  background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid ${props => props.hasError ? '#dc3545' : '#e9ecef'};
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #dee2e6;
`;

const HeaderTitle = styled.h4`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: #007bff;
  }
`;

const SummaryBox = styled.div`
  display: flex;
  gap: 24px;
  font-size: 14px;
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  
  label {
    font-size: 11px;
    text-transform: uppercase;
    color: #6c757d;
    margin-bottom: 4px;
  }
  
  span {
    font-size: 16px;
    font-weight: 600;
    color: ${props => props.highlight ? '#007bff' : '#333'};
  }
`;

const LPRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 160px 48px; /* Zúžené sloupce pro lepší fit */
  gap: 16px; /* Menší mezery */
  margin-bottom: 24px;
  align-items: end;
  padding: 20px; /* Optimalizovaný padding */
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden; /* Zabrání přetečení */
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr 140px 48px;
    gap: 12px;
    padding: 16px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: stretch;
    padding: 16px;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 80px; /* Větší výška pro lepší proporce */
  
  label {
    font-size: 14px; /* Větší font pro lepší čitelnost */
    font-weight: 600;
    color: #495057;
    margin-bottom: 8px;
    height: 22px;
    line-height: 22px;
    display: flex;
    align-items: center;
  }

  /* Sjednocení výšky všech input elementů */
  [data-component="CustomSelect"] {
    height: 48px !important; /* Větší výška pro lepší UX */
    
    & > div:first-of-type {
      height: 48px !important;
      display: flex;
      align-items: center;
      padding: 0 16px; /* Větší padding pro lepší design */
      font-size: 15px; /* Větší font v selectu */
      font-weight: ${props => props.isFilled ? '600' : '400'}; /* Tučný když je vyplněné */
      
      /* Ellipsis pro dlouhé texty */
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    
    /* Centrace placeholderu */
    .select__placeholder {
      line-height: 1;
      font-size: 15px;
      font-weight: 400; /* Placeholder vždy normální */
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    
    /* Styling pro dropdown options */
    .select__option {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      padding: 8px 12px;
      
      &:hover {
        background: #f8f9fa;
      }
    }
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  &:disabled {
    background: #e9ecef;
    cursor: not-allowed;
  }
`;

const AmountInput = styled.input`
  width: 100%;
  height: 48px; /* Stejná výška jako CustomSelect */
  padding: 12px 50px 12px 16px; /* Větší padding pro lepší UX */
  border: 1px solid ${props => props.hasError ? '#dc3545' : '#ced4da'};
  border-radius: 6px;
  font-size: 15px; /* Větší font pro lepší čitelnost */
  font-weight: ${props => (props.value !== '' && props.value !== null && props.value !== undefined) ? '600' : '400'}; /* Tučný když je vyplněné (včetně 0) */
  text-align: right;
  font-family: inherit; /* Sjednocený font s celou stránkou */
  box-sizing: border-box;
  transition: border-color 0.15s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc3545' : '#007bff'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 53, 69, 0.15)' : 'rgba(0, 123, 255, 0.15)'};
  }
  
  &:disabled {
    background: #f8f9fa;
    cursor: not-allowed;
    color: #6c757d;
  }
  
  &::placeholder {
    color: #adb5bd;
    font-style: normal;
  }
`;

const AmountInputWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
`;

const CurrencySymbol = styled.span`
  position: absolute;
  right: 16px; /* Větší offset kvůli většímu paddingu */
  color: ${props => props.disabled ? '#9ca3af' : '#374151'};
  font-weight: 600;
  font-size: 15px; /* Větší font pro sladění s inputem */
  font-family: inherit;
  pointer-events: none;
  user-select: none;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-height: 80px; /* Odpovídá FormGroup min-height */
  padding-bottom: 4px;
`;

const IconButton = styled.button`
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px; /* Stejná velikost jako výška inputů */
  height: 48px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.25);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  svg {
    color: white;
    width: 18px; /* Větší ikona pro lepší proporce */
    height: 18px;
  }
`;

const AddButton = styled.button`
  padding: 12px 20px; /* Větší padding */
  border: 2px dashed #007bff;
  border-radius: 8px; /* Větší border-radius */
  background: white;
  color: #007bff;
  font-size: 15px; /* Větší font */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 12px;
  width: 100%;
  
  &:hover:not(:disabled) {
    background: #007bff;
    color: white;
    border-style: solid;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: #ced4da;
    color: #6c757d;
  }
`;

const ValidationMessage = styled.div`
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  background: ${props => {
    if (props.type === 'error') return '#f8d7da';
    if (props.type === 'warning') return '#fff3cd';
    if (props.type === 'success') return '#d1e7dd';
    return '#d1ecf1';
  }};
  
  color: ${props => {
    if (props.type === 'error') return '#842029';
    if (props.type === 'warning') return '#664d03';
    if (props.type === 'success') return '#0f5132';
    return '#055160';
  }};
  
  border: 1px solid ${props => {
    if (props.type === 'error') return '#f5c2c7';
    if (props.type === 'warning') return '#ffecb5';
    if (props.type === 'success') return '#badbcc';
    return '#b6effb';
  }};
  
  svg {
    flex-shrink: 0;
  }
`;

const AutoFillNote = styled.div`
  background: #e7f3ff;
  border-left: 4px solid #007bff;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #004085;
  border-radius: 4px;
`;

// ============ HELPERS ============

const formatCurrency = (value) => {
  if (!value && value !== 0) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
};

const parseCurrency = (value) => {
  // ✅ Akceptovat 0 jako validní hodnotu - kontrolovat pouze prázdný string/null/undefined
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = value.toString().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// ============ MAIN COMPONENT ============

// CurrencyAmountInput Sub-komponenta pro částku s Kč
const CurrencyAmountInput = React.memo(function CurrencyAmountInput({ value, onChange, hasError, disabled }) {
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Formátování měny
  const formatCurrency = useCallback((val) => {
    // ✅ Akceptovat 0 jako validní hodnotu
    if (val === null || val === undefined || val === '') return '';
    const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
  }, []);

  // Počítaná hodnota místo useEffect
  const displayValue = useMemo(() => {
    if (isFocused) {
      return localValue;
    }
    // ✅ Explicitní kontrola - value může být 0, což je validní!
    const valueToFormat = (value !== null && value !== undefined) ? value : '';
    const formatted = formatCurrency(valueToFormat);
    return formatted;
  }, [value, isFocused, localValue, formatCurrency]);

  // Synchronizovat localValue s value pouze když není focused
  useEffect(() => {
    if (!isFocused) {
      // ✅ Explicitní kontrola - value může být 0, což je validní!
      const valueToFormat = (value !== null && value !== undefined) ? value : '';
      setLocalValue(formatCurrency(valueToFormat));
    }
  }, [value, isFocused, formatCurrency]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Očistit hodnotu a vrátit jako číslo (ne string)
    const cleanValue = newValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    // ✅ Akceptovat 0 jako validní hodnotu - isNaN kontroluje pouze neplatné vstupy
    // Vrátit číslo, ne string - aby prop value byl konzistentní
    const finalValue = isNaN(numValue) ? 0 : numValue;

    onChange(finalValue);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlurLocal = useCallback(() => {
    setIsFocused(false);

    // Formátovat hodnotu při ztrátě fokusu
    const formatted = formatCurrency(localValue);
    setLocalValue(formatted);
  }, [localValue, formatCurrency]);

  return (
    <AmountInputWrapper>
      <AmountInput
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlurLocal}
        disabled={disabled}
        hasError={hasError}
        placeholder="0,00"
      />
      <CurrencySymbol disabled={disabled}>Kč</CurrencySymbol>
    </AmountInputWrapper>
  );
});

function LPCerpaniEditor({ 
  faktura, 
  orderData, 
  lpCerpani = [], 
  availableLPCodes = [], 
  onChange,
  lpCerpaniRef, // 🔥 REF pro synchronní přístup k aktuálním datům (pro validaci v parent)
  hasTriedToSubmit = false,
  disabled = false
}) {
  
  // 🛡️ NORMALIZACE: Zajistit, že lpCerpani je vždy pole
  const normalizedLpCerpani = useMemo(() => {
    if (!lpCerpani) return [];
    if (Array.isArray(lpCerpani)) return lpCerpani;
    // Pokud je to objekt (např. z localStorage), převést na pole
    if (typeof lpCerpani === 'object') {
      return Object.values(lpCerpani);
    }
    return [];
  }, [lpCerpani]);
  
  const [rows, setRows] = useState([]);
  const [validationMessages, setValidationMessages] = useState([]);
  
  // 🆕 States pro CustomSelect
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState({});
  
  // 🔥 Ref pro sledování, zda už byl proveden auto-fill (aby se neopakoval)
  const autoFilledRef = useRef(false);
  const prevFakturaIdRef = useRef(null);
  const prevLpCerpaniLengthRef = useRef(0);

  // 🔥 Parse financovani pokud je string (z DB přichází jako JSON string)
  const parsedFinancovani = useMemo(() => {
    if (!orderData?.financovani) return null;
    if (typeof orderData.financovani === 'string') {
      try {
        return JSON.parse(orderData.financovani);
      } catch (e) {
        console.warn('[LPCerpaniEditor] Nelze parsovat financovani:', e);
        return null;
      }
    }
    return orderData.financovani;
  }, [orderData?.financovani]);

  // Filtrovat LP kódy podle financování objednávky
  const filteredLPCodes = useMemo(() => {
    console.debug('[LPCerpaniEditor] filteredLPCodes START', {
      availableLPCodes: availableLPCodes?.length,
      orderDataLpKod: orderData?.lp_kod,
      parsedFinancovani,
      firstAvailable: availableLPCodes?.[0]
    });
    
    if (!availableLPCodes || availableLPCodes.length === 0) {
      return [];
    }
    
    // Zkusit několik možných umístění LP kódů v orderData
    let lpKodyFromOrder = null;
    
    // Možnost 1: orderData.lp_kod (array) - původní OrderForm25
    if (orderData?.lp_kod && Array.isArray(orderData.lp_kod) && orderData.lp_kod.length > 0) {
      lpKodyFromOrder = orderData.lp_kod;
      console.debug('[LPCerpaniEditor] Using orderData.lp_kod:', lpKodyFromOrder);
    }
    // Možnost 2: parsedFinancovani.lp_kody (z parsed financování - JSON string)
    else if (parsedFinancovani?.lp_kody && Array.isArray(parsedFinancovani.lp_kody) && parsedFinancovani.lp_kody.length > 0) {
      lpKodyFromOrder = parsedFinancovani.lp_kody;
      console.debug('[LPCerpaniEditor] Using parsedFinancovani.lp_kody:', lpKodyFromOrder);
    }
    
    if (!lpKodyFromOrder || lpKodyFromOrder.length === 0) {
      // Fallback: Pokud nejsou specifikovány LP kódy, zobraz všechny dostupné
      console.debug('[LPCerpaniEditor] FALLBACK - no lpKodyFromOrder, returning all:', availableLPCodes.length);
      return availableLPCodes;
    }
    
    // Filtrovat availableLPCodes podle LP kódů z objednávky
    const filtered = availableLPCodes.filter(lpOption => {
      return lpKodyFromOrder.some(kodValue => {
        // 🔥 OPRAVA: Porovnávat jako STRING pro jistotu (z DB přichází různé typy)
        const optId = String(lpOption.id || '');
        const optKod = String(lpOption.kod || '');
        const optCisloLp = String(lpOption.cislo_lp || '');
        const searchVal = String(kodValue || '');
        
        const match = optId === searchVal || 
                      optKod === searchVal ||
                      optCisloLp === searchVal;
        if (match) {
          console.debug('[LPCerpaniEditor] MATCH found:', { lpOption, kodValue, optId, searchVal });
        }
        return match;
      });
    });
    
    console.debug('[LPCerpaniEditor] filtered result:', filtered.length, filtered);
    return filtered.length > 0 ? filtered : availableLPCodes;
  }, [orderData?.lp_kod, parsedFinancovani, availableLPCodes]);

  // Transformovat options pro CustomSelect
  const transformedOptions = useMemo(() => {
    return filteredLPCodes.map(lp => ({
      ...lp,
      label: (() => {
        const kod = lp.cislo_lp || lp.kod || lp.id;
        const nazev = lp.nazev_uctu || lp.nazev || 'Bez názvu';
        
        // Zkrácení dlouhých názvů pro lepší responsivitu
        const maxLength = 35;
        const fullLabel = `${kod} - ${nazev}`;
        
        if (fullLabel.length > maxLength) {
          return `${kod} - ${nazev.substring(0, maxLength - kod.length - 6)}...`;
        }
        
        return fullLabel;
      })()
    }));
  }, [filteredLPCodes]);

  // Je LP financování?
  const isLPFinancing = filteredLPCodes.length > 0;
  
  // 🔥 SYNCHRONNÍ AUTO-FILL: Vypočítat auto-fill hodnotu a nastavit ref SYNCHRONNĚ při renderování
  // Toto zajistí že ref je aktuální PŘED tím než uživatel klikne submit
  const autoFillValue = useMemo(() => {
    // Podmínky pro auto-fill
    const shouldAutoFill = 
      normalizedLpCerpani.length === 0 &&
      isLPFinancing &&
      filteredLPCodes.length === 1 &&
      faktura &&
      faktura.fa_castka !== null &&
      faktura.fa_castka !== undefined &&
      faktura.fa_castka !== '';
    
    if (shouldAutoFill) {
      return [{
        id: `row_auto_sync_${faktura?.id || Date.now()}`,
        lp_cislo: filteredLPCodes[0].cislo_lp || filteredLPCodes[0].kod,
        lp_id: filteredLPCodes[0].id,
        castka: parseFloat(faktura.fa_castka) || 0,
        poznamka: '',
        lp_data: filteredLPCodes[0]
      }];
    }
    return null;
  }, [normalizedLpCerpani.length, isLPFinancing, filteredLPCodes, faktura]);
  
  // 🔥 SYNCHRONNĚ nastavit ref když máme auto-fill hodnotu (provede se při každém renderování)
  if (autoFillValue && lpCerpaniRef && !autoFilledRef.current) {
    lpCerpaniRef.current = autoFillValue;
    console.debug('[LPCerpaniEditor] SYNC ref update with autoFillValue:', autoFillValue);
  }
  
  // Reset auto-fill flag když se změní faktura
  useEffect(() => {
    if (faktura?.id !== prevFakturaIdRef.current) {
      autoFilledRef.current = false;
      prevFakturaIdRef.current = faktura?.id;
      prevLpCerpaniLengthRef.current = 0;
    }
  }, [faktura?.id]);

  // 🔥 STABILIZACE: Použít useMemo pro lpCerpani serializaci (zabránit změně reference)
  const lpCerpaniKey = useMemo(() => {
    if (!normalizedLpCerpani || normalizedLpCerpani.length === 0) return 'empty';
    // Vytvořit stabilní klíč z hlavních atributů
    return normalizedLpCerpani.map(lp => `${lp.lp_id}_${lp.castka}`).join('|');
  }, [normalizedLpCerpani]);

  // Inicializace rows z lpCerpani prop - s kontrolou změn
  useEffect(() => {
    console.debug('[LPCerpaniEditor] useEffect START', {
      fakturaId: faktura?.id,
      fa_castka: faktura?.fa_castka,
      normalizedLpCerpaniLen: normalizedLpCerpani?.length,
      rowsLen: rows.length,
      filteredLPCodesLen: filteredLPCodes.length,
      isLPFinancing,
      autoFilledRef: autoFilledRef.current
    });
    
    // 🔥 GUARD: Pokud je nová faktura (změnilo se ID), resetovat auto-fill flag
    if (faktura?.id !== prevFakturaIdRef.current) {
      autoFilledRef.current = false;
      prevFakturaIdRef.current = faktura?.id;
      console.debug('[LPCerpaniEditor] NEW FAKTURA - reset autoFilledRef');
    }
    
    // Pokud máme lpCerpani data, naplnit rows
    if (normalizedLpCerpani && normalizedLpCerpani.length > 0) {
      const newRows = normalizedLpCerpani.map((item, idx) => {
        const matchedLP = availableLPCodes?.find(lp => 
          lp.id === item.lp_id || 
          lp.cislo_lp === item.lp_cislo || 
          lp.kod === item.lp_cislo
        );
        
        // 🔥 AUTO-FIX: Pokud je 1 LP kód a řádek nemá lp_id, doplň ho automaticky
        let lpIdToUse = item.lp_id || (matchedLP ? matchedLP.id : null);
        let lpCisloToUse = item.lp_cislo || '';
        
        // Pokud stále nemáme lp_id a je pouze 1 LP kód dostupný, použij ho
        if (!lpIdToUse && filteredLPCodes.length === 1 && filteredLPCodes[0]?.id) {
          lpIdToUse = filteredLPCodes[0].id;
          lpCisloToUse = filteredLPCodes[0].cislo_lp || filteredLPCodes[0].kod || '';
          console.debug('[LPCerpaniEditor] AUTO-FIX: doplnění lp_id z filteredLPCodes[0]', {
            original_lp_id: item.lp_id,
            fixed_lp_id: lpIdToUse,
            fixed_lp_cislo: lpCisloToUse
          });
        }
        
        return {
          id: item.id || `row_${idx}_${Date.now()}`,
          lp_cislo: lpCisloToUse,
          lp_id: lpIdToUse,
          // ✅ Explicitně kontrolovat null/undefined - 0 je validní hodnota!
          castka: (item.castka !== null && item.castka !== undefined) ? parseFloat(item.castka) : 0,
          poznamka: item.poznamka || '',
          lp_data: matchedLP || (filteredLPCodes.length === 1 ? filteredLPCodes[0] : null)
        };
      });
      
      // 🔥 OPTIMALIZACE: Pouze aktualizovat pokud se data skutečně změnila
      setRows(prevRows => {
        // Rychlá kontrola délky
        if (prevRows.length !== newRows.length) {
          return newRows;
        }
        
        // Deep comparison - porovnat lp_id, castka, lp_cislo
        const hasChanges = newRows.some((newRow, idx) => {
          const prevRow = prevRows[idx];
          if (!prevRow) return true;
          
          // ✅ Řádek je prázdný POUZE když nemá LP ID a částka je null/undefined/prázdná
          // 0 je VALIDNÍ hodnota pro zálohové faktury!
          const isPrevEmpty = !prevRow.lp_id && (prevRow.castka === null || prevRow.castka === undefined || prevRow.castka === '');
          const isNewEmpty = !newRow.lp_id && (newRow.castka === null || newRow.castka === undefined || newRow.castka === '');
          
          if (isPrevEmpty && isNewEmpty) {
            return false; // Oba jsou prázdné → žádná změna
          }
          
          // Porovnat konkrétní hodnoty (ID nepočítat - může se generovat nové)
          return prevRow.lp_id !== newRow.lp_id ||
                 prevRow.castka !== newRow.castka ||
                 prevRow.lp_cislo !== newRow.lp_cislo;
        });
        
        return hasChanges ? newRows : prevRows;
      });
    } 
    // Auto-fill pro jeden LP kód
    // ✅ Pozor: faktura.fa_castka může být 0 (nulová faktura) – to je validní a musí se také auto-fillnout.
    else if (
      normalizedLpCerpani &&
      normalizedLpCerpani.length === 0 &&
      rows.length === 0 && // 🔥 PŘIDÁNO: Spustit auto-fill pouze když rows jsou prázdné
      isLPFinancing &&
      filteredLPCodes.length === 1 &&
      filteredLPCodes[0]?.id && // 🔥 PŘIDÁNO: LP musí mít ID!
      faktura &&
      faktura.fa_castka !== null &&
      faktura.fa_castka !== undefined &&
      faktura.fa_castka !== ''
    ) {
      const lpToUse = filteredLPCodes[0];
      console.debug('[LPCerpaniEditor] 🚀 AUTO-FILL TRIGGERED', {
        fakturaId: faktura?.id,
        fa_castka: faktura?.fa_castka,
        filteredLPCodesLen: filteredLPCodes.length,
        lpToUse,
        lpToUseId: lpToUse?.id,
        rowsLen: rows.length
      });
      const autoRow = {
        id: `row_auto_${Date.now()}`,
        lp_cislo: lpToUse.cislo_lp || lpToUse.kod || '',
        lp_id: lpToUse.id,
        castka: parseFloat(faktura.fa_castka) || 0,
        poznamka: '',
        lp_data: lpToUse
      };
      console.debug('[LPCerpaniEditor] AUTO-FILL autoRow:', autoRow);
      setRows([autoRow]);
      autoFilledRef.current = true;
      
      // 🔥 FIX: Aktualizovat ref pro validaci v parent
      if (lpCerpaniRef) {
        lpCerpaniRef.current = [autoRow];
      }
      
      // Volat onChange pro state update (použít setTimeout místo flushSync - flushSync nefunguje v useEffect)
      if (onChange) {
        setTimeout(() => {
          onChange([autoRow]);
          console.debug('[LPCerpaniEditor] auto-fill onChange called', [autoRow]);
        }, 0);
      }
    }
    // Pokud lpCerpani je prázdné a není LP financování, vyčistit rows
    else if (!isLPFinancing && rows.length > 0) {
      console.debug('[LPCerpaniEditor] clearing rows - not LP financing');
      setRows([]);
    }
    // 🔥 DEBUG: Žádná větev se nespustila
    else {
      console.debug('[LPCerpaniEditor] NO BRANCH MATCHED', {
        normalizedLpCerpaniLen: normalizedLpCerpani?.length,
        rowsLen: rows.length,
        isLPFinancing,
        filteredLPCodesLen: filteredLPCodes.length,
        fa_castka: faktura?.fa_castka,
        fa_castka_valid: faktura?.fa_castka !== null && faktura?.fa_castka !== undefined && faktura?.fa_castka !== ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lpCerpaniKey, faktura?.id, faktura?.fa_castka, isLPFinancing, filteredLPCodes.length]);

  // Součet přiřazených částek
  const totalAssigned = useMemo(() => {
    const sum = rows.reduce((sum, row) => sum + (parseFloat(row.castka) || 0), 0);
    return sum;
  }, [rows]);

  // 💬 Lokální validace pro ZOBRAZENÍ HLÁŠEK (nestaví errors v parent)
  useEffect(() => {
    if (!hasTriedToSubmit) {
      setValidationMessages([]);
      return;
    }

    const messages = [];
    
    // Prázdné řádky - ✅ 0 je validní hodnota!
    const emptyRows = rows.filter(r => {
      const hasNoLp = r.id && !r.lp_id;
      const hasNoCastka = r.castka === null || r.castka === undefined || r.castka === '' || (typeof r.castka === 'string' && r.castka.trim() === '');
      return hasNoLp && hasNoCastka;
    });
    if (emptyRows.length > 0) {
      messages.push({
        type: 'error',
        text: `Máte ${emptyRows.length} prázdný řádek. Vyplňte LP kód a částku nebo jej smažte.`
      });
    }

    // Neúplné řádky - ✅ 0 je validní hodnota!
    const incompleteRows = rows.filter(r => {
      const hasLp = (r.lp_id !== null && r.lp_id !== undefined && String(r.lp_id).trim() !== '') ||
                    (r.lp_cislo !== null && r.lp_cislo !== undefined && String(r.lp_cislo).trim() !== '');
      const hasCastka = r.castka !== null && r.castka !== undefined && r.castka !== '' && !isNaN(parseFloat(r.castka));
      
      // Má LP ale nemá částku NEBO nemá LP ale má částku
      return (hasLp && !hasCastka) || (!hasLp && hasCastka);
    });
    if (incompleteRows.length > 0) {
      messages.push({
        type: 'error',
        text: 'Všechny řádky musí mít vyplněný LP kód i částku'
      });
    }

    setValidationMessages(messages);
  }, [hasTriedToSubmit, rows]);

  // Handler pro změnu LP kódu
  const handleLPChange = useCallback((rowId, selectedLpId) => {
    setRows(prev => {
      const updated = prev.map(row => {
        if (row.id === rowId) {
          // Najít LP kód podle ID nebo podle kódu (cislo_lp/kod)
          const lpOption = filteredLPCodes.find(lp =>
            lp.id === selectedLpId ||
            lp.cislo_lp === selectedLpId ||
            lp.kod === selectedLpId
          );
          
          return {
            ...row,
            lp_cislo: lpOption ? (lpOption.cislo_lp || lpOption.kod) : (selectedLpId || ''),
            lp_id: (lpOption && lpOption.id !== undefined && lpOption.id !== null)
              ? lpOption.id
              : (selectedLpId || null),
            lp_data: lpOption || null
          };
        }
        return row;
      });
      
      // 🔥 FILTER: Posílat pouze vyplněné řádky (má LP kód A validní částku - včetně 0 a záporných)
      if (onChange) {
        const validRows = updated.filter(row => {
          const hasLpRef = (row.lp_id !== null && row.lp_id !== undefined && String(row.lp_id).trim() !== '') ||
                           (row.lp_cislo !== null && row.lp_cislo !== undefined && String(row.lp_cislo).trim() !== '');
          return hasLpRef &&
                 row.castka !== null && row.castka !== undefined && row.castka !== '' &&
                 !isNaN(parseFloat(row.castka));
        });
        setTimeout(() => onChange(validRows), 0);
        console.debug('[LPCerpaniEditor] onChange validRows (LP change)', validRows);
      }
      
      return updated;
    });
  }, [filteredLPCodes, onChange]);

  // Handler pro změnu částky
  const handleCastkaChange = useCallback((rowId, value) => {
    setRows(prev => {
      const updated = prev.map(row => 
        row.id === rowId 
          ? { ...row, castka: parseCurrency(value) }
          : row
      );
      
      // 🔥 FILTER: Posílat pouze vyplněné řádky (má LP kód A validní částku - včetně 0 a záporných)
      if (onChange) {
        const validRows = updated.filter(row => {
          const hasLpRef = (row.lp_id !== null && row.lp_id !== undefined && String(row.lp_id).trim() !== '') ||
                           (row.lp_cislo !== null && row.lp_cislo !== undefined && String(row.lp_cislo).trim() !== '');
          return hasLpRef &&
                 row.castka !== null && row.castka !== undefined && row.castka !== '' &&
                 !isNaN(parseFloat(row.castka));
        });
        setTimeout(() => onChange(validRows), 0);
        console.debug('[LPCerpaniEditor] onChange validRows (částka change)', validRows);
      }
      
      return updated;
    });
  }, [onChange]);

  // Handler pro smazání řádku
  const handleRemoveRow = useCallback((rowId) => {
    setRows(prev => {
      const updated = prev.filter(row => row.id !== rowId);
      
      // 🔥 FILTER: Posílat pouze vyplněné řádky (má LP kód A validní částku - včetně 0 a záporných)
      if (onChange) {
        const validRows = updated.filter(row => {
          const hasLpRef = (row.lp_id !== null && row.lp_id !== undefined && String(row.lp_id).trim() !== '') ||
                           (row.lp_cislo !== null && row.lp_cislo !== undefined && String(row.lp_cislo).trim() !== '');
          return hasLpRef &&
                 row.castka !== null && row.castka !== undefined && row.castka !== '' &&
                 !isNaN(parseFloat(row.castka));
        });
        setTimeout(() => onChange(validRows), 0);
        console.debug('[LPCerpaniEditor] onChange validRows (remove row)', validRows);
      }
      
      return updated;
    });
  }, [onChange]);

  // Handler pro přidání řádku
  const handleAddRow = useCallback(() => {
    const newRow = {
      id: `row_${Date.now()}`,
      lp_cislo: '',
      lp_id: null,
      castka: 0,
      poznamka: ''
    };
    setRows(prev => {
      const updated = [...prev, newRow];
      
      // 🔥 NEVOLAT onChange při přidání prázdného řádku - pouze lokálně přidat do state
      // onChange se zavolá až když uživatel vyplní LP kód nebo částku
      
      return updated;
    });
  }, [onChange]);
  
  // Handler pro uložení dat při opuštění pole
  const handleSaveData = useCallback(() => {
    if (onChange) {
      // 🔥 FILTER: Posílat pouze vyplněné řádky (má LP kód A validní částku - včetně 0 a záporných)
      const validRows = rows.filter(row => {
        const hasLpRef = (row.lp_id !== null && row.lp_id !== undefined && String(row.lp_id).trim() !== '') ||
                         (row.lp_cislo !== null && row.lp_cislo !== undefined && String(row.lp_cislo).trim() !== '');
        return hasLpRef &&
               row.castka !== null && row.castka !== undefined && row.castka !== '' &&
               !isNaN(parseFloat(row.castka));
      });
      onChange(validRows);
      console.debug('[LPCerpaniEditor] onChange validRows (save)', validRows);
    }
  }, [onChange, rows]);

  const toggleSelect = useCallback((fieldName) => {
    setSelectStates(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  }, []);

  const filterOptions = useCallback((options, searchTerm, field) => {
    if (!searchTerm) return options;
    
    const searchLower = searchTerm.toLowerCase();
    return options.filter(option => {
      // Hledej v cislo_lp, kódu i názvu
      const kod = option.cislo_lp || option.kod || option.id || '';
      const nazev = option.nazev_uctu || option.nazev || '';
      
      return kod.toLowerCase().includes(searchLower) || 
             nazev.toLowerCase().includes(searchLower);
    });
  }, []);

  return (
    <EditorWrapper>
      <EditorHeader>
        <HeaderTitle>
          <FontAwesomeIcon icon={faInfoCircle} />
          LP Čerpání na Faktuře
        </HeaderTitle>
        <SummaryBox>
          <SummaryItem>
            <label>Faktura částka</label>
            <span>{formatCurrency(faktura?.fa_castka || 0)} Kč</span>
          </SummaryItem>
          <SummaryItem highlight>
            <label>Přiřazeno celkem</label>
            <span>{formatCurrency(totalAssigned)} Kč</span>
          </SummaryItem>
          <SummaryItem>
            <label>Zbývá přiřadit</label>
            <span>{formatCurrency((faktura?.fa_castka || 0) - totalAssigned)} Kč</span>
          </SummaryItem>
        </SummaryBox>
      </EditorHeader>

      {filteredLPCodes.length === 1 && rows.length > 0 && (
        <AutoFillNote>
          ℹ️ Objednávka používá pouze jeden LP kód, částka byla automaticky předvyplněna. Můžete ji upravit podle potřeby.
        </AutoFillNote>
      )}

      {rows.map((row, index) => {
        // 🔥 DEBUG: Log row data
        console.debug('[LPCerpaniEditor] RENDER ROW', {
          row,
          lp_id: row.lp_id,
          lp_id_type: typeof row.lp_id,
          transformedOptionsLen: transformedOptions.length,
          transformedOptionsFirst: transformedOptions[0]
        });
        
        // Detekce chybného řádku pro červené zvýraznění - POUZE když validateNow=true
        const isEmptyRow = !row.lp_id && (!row.castka || row.castka <= 0);
        const hasLpError = !row.lp_id && row.castka > 0; // má částku ale ne LP kód
        const hasCastkaError = row.lp_id && (!row.castka || row.castka <= 0); // má LP kód ale ne částku
        
        return (
        <LPRow key={row.id}>
          <FormGroup>
            <label>
              LP kód&nbsp;<span style={{ color: '#dc2626' }}>*</span>
            </label>
            <CustomSelect
              data-component="CustomSelect"
              value={row.lp_id || ''}
              onChange={(e) => {
                const selectedId = e?.target?.value || e;
                handleLPChange(row.id, selectedId);
              }}
              onBlur={handleSaveData}
              options={transformedOptions}
              placeholder="-- Vyberte LP kód --"
              field={`lp_kod_${row.id}`}
              icon={<Hash />}
              disabled={disabled}
              hasError={hasTriedToSubmit && (isEmptyRow || hasLpError)}
              required={true}
              multiple={false}
              selectStates={selectStates}
              setSelectStates={setSelectStates}
              searchStates={searchStates}
              setSearchStates={setSearchStates}
              touchedSelectFields={touchedSelectFields}
              setTouchedSelectFields={setTouchedSelectFields}
              hasTriedToSubmit={false}
              toggleSelect={toggleSelect}
              filterOptions={filterOptions}
              getOptionLabel={(option) => option?.label || `${option?.cislo_lp || option?.kod || option?.id} - ${option?.vyuziti || option?.nazev_uctu || option?.nazev || 'Bez názvu'}`}
            />
          </FormGroup>

          <FormGroup>
            <label>Částka (Kč)&nbsp;<span style={{color: '#dc2626'}}>*</span></label>
            <CurrencyAmountInput
              value={(row.castka !== null && row.castka !== undefined) ? row.castka : ''}
              onChange={(newValue) => handleCastkaChange(row.id, newValue)}
              onBlur={handleSaveData}
              hasError={hasTriedToSubmit && (isEmptyRow || hasCastkaError)}
              disabled={disabled}
              required
            />
          </FormGroup>

          <ButtonGroup>
            <IconButton
              type="button"
              variant="danger"
              onClick={() => handleRemoveRow(row.id)}
              disabled={disabled || rows.length === 1}
              title="Odebrat řádek"
            >
              <Trash size={16} />
            </IconButton>
          </ButtonGroup>
        </LPRow>
        );
      })}

      {/* Tlačítko "Přidat další LP kód" - skrýt když je disabled (věcná už byla potvrzena) */}
      {!disabled && filteredLPCodes.length > rows.length && (
        <AddButton
          type="button"
          onClick={handleAddRow}
        >
          <FontAwesomeIcon icon={faPlus} /> Přidat další LP kód
        </AddButton>
      )}

      {/* 💬 Validace - POUZE lokální zobrazení, centrální validace běží v OrderForm25 */}
      {hasTriedToSubmit && validationMessages.length > 0 && validationMessages.map((msg, idx) => (
        <ValidationMessage key={idx} type={msg.type}>
          <FontAwesomeIcon 
            icon={
              msg.type === 'error' ? faExclamationTriangle :
              msg.type === 'success' ? faCheckCircle :
              faInfoCircle
            } 
          />
          <span>{msg.text}</span>
        </ValidationMessage>
      ))}
    </EditorWrapper>
  );
}

// React.memo pro prevenci zbytečných re-renderů
export default React.memo(LPCerpaniEditor);
