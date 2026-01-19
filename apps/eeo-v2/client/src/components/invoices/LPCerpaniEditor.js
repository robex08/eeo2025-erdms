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
  grid-template-columns: 1fr 220px 52px; /* Lepší proporce pro větší elementy */
  gap: 24px; /* Větší mezery */
  margin-bottom: 24px;
  align-items: end;
  padding: 24px; /* Větší padding */
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px; /* Větší border-radius */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); /* Jemnější shadow */
  
  @media (max-width: 1200px) {
    grid-template-columns: 2fr 180px 52px;
    gap: 16px;
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
  font-weight: ${props => (props.value && props.value !== '0' && props.value !== '') ? '600' : '400'}; /* Tučný když je vyplněné */
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
  if (!value) return 0;
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
    if (!val && val !== 0) return '';
    const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
  }, []);

  // Počítaná hodnota místo useEffect
  const displayValue = useMemo(() => {
    if (isFocused) {
      return localValue;
    }
    return formatCurrency(value || '');
  }, [value, isFocused, localValue, formatCurrency]);

  // Synchronizovat localValue s value pouze když není focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatCurrency(value || ''));
    }
  }, [value, isFocused, formatCurrency]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Očistit hodnotu a vrátit jako string s tečkou
    const cleanValue = newValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);

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
  onValidationChange, 
  disabled = false
}) {
  
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
  
  // 🔥 Stabilní ref pro onValidationChange callback (prevence infinite loop)
  const onValidationChangeRef = useRef(onValidationChange);
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  }, [onValidationChange]);

  // Filtrovat LP kódy podle financování objednávky
  const filteredLPCodes = useMemo(() => {
    if (!availableLPCodes || availableLPCodes.length === 0) {
      return [];
    }
    
    // Zkusit několik možných umístění LP kódů v orderData
    let lpKodyFromOrder = null;
    
    // Možnost 1: orderData.lp_kod (array) - původní OrderForm25
    if (orderData?.lp_kod && Array.isArray(orderData.lp_kod) && orderData.lp_kod.length > 0) {
      lpKodyFromOrder = orderData.lp_kod;
    }
    // Možnost 2: orderData.financovani.lp_kody (z parsed financování)
    else if (orderData?.financovani?.lp_kody && Array.isArray(orderData.financovani.lp_kody) && orderData.financovani.lp_kody.length > 0) {
      lpKodyFromOrder = orderData.financovani.lp_kody;
    }
    
    if (!lpKodyFromOrder || lpKodyFromOrder.length === 0) {
      // Fallback: Pokud nejsou specifikovány LP kódy, zobraz všechny dostupné
      return availableLPCodes;
    }
    
    // Filtrovat availableLPCodes podle LP kódů z objednávky
    const filtered = availableLPCodes.filter(lpOption => {
      return lpKodyFromOrder.some(kodValue => {
        // kodValue může být ID nebo kód (string)
        return lpOption.id === kodValue || 
               lpOption.id === Number(kodValue) ||
               lpOption.kod === kodValue ||
               lpOption.cislo_lp === kodValue;
      });
    });
    
    return filtered.length > 0 ? filtered : availableLPCodes;
  }, [orderData?.lp_kod, orderData?.financovani, availableLPCodes]);

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
  
  // Reset auto-fill flag když se změní faktura
  useEffect(() => {
    if (faktura?.id !== prevFakturaIdRef.current) {
      autoFilledRef.current = false;
      prevFakturaIdRef.current = faktura?.id;
      prevLpCerpaniLengthRef.current = 0;
    }
  }, [faktura?.id]);

  // Inicializace rows z lpCerpani prop - JEDNODUCHÁ LOGIKA
  useEffect(() => {
    // Získat ID faktury z různých možných umístění
    const fakturaId = faktura?.id || faktura?.invoice_id;
    
    console.log('🔍 DEBUG LPCerpaniEditor useEffect TRIGGERED:', {
      lpCerpaniLength: lpCerpani?.length,
      lpCerpani,
      fakturaId,
      faktura_id_field: faktura?.id,
      faktura_invoice_id_field: faktura?.invoice_id
    });
    
    if (!fakturaId) {
      console.log('⚠️ Není faktura ID - ale pokračuji stejně pokud máme lpCerpani data');
      // Pokračovat i bez ID pokud máme data
    }
    
    // Pokud máme lpCerpani data, naplnit rows
    if (lpCerpani && lpCerpani.length > 0) {
      console.log('✅ Mám lpCerpani data, mapuji do rows');
      
      const newRows = lpCerpani.map((item, idx) => {
        const matchedLP = availableLPCodes?.find(lp => 
          lp.id === item.lp_id || 
          lp.cislo_lp === item.lp_cislo || 
          lp.kod === item.lp_cislo
        );
        
        return {
          id: item.id || `row_${idx}_${Date.now()}`,
          lp_cislo: item.lp_cislo || '',
          lp_id: item.lp_id || (matchedLP ? matchedLP.id : null),
          castka: parseFloat(item.castka) || 0,
          poznamka: item.poznamka || '',
          lp_data: matchedLP || null
        };
      });
      
      console.log('✅ Nastavuji rows:', newRows);
      setRows(newRows);
    } 
    // Auto-fill pro jeden LP kód
    else if (lpCerpani && lpCerpani.length === 0 && isLPFinancing && filteredLPCodes.length === 1 && faktura?.fa_castka && !autoFilledRef.current) {
      console.log('✅ Auto-fill jednoho LP kódu');
      const autoRow = {
        id: `row_auto_${Date.now()}`,
        lp_cislo: filteredLPCodes[0].cislo_lp || filteredLPCodes[0].kod,
        lp_id: filteredLPCodes[0].id,
        castka: parseFloat(faktura.fa_castka),
        poznamka: '',
        lp_data: filteredLPCodes[0]
      };
      setRows([autoRow]);
      autoFilledRef.current = true;
      
      if (onChange) {
        onChange([autoRow]);
      }
    }
  }, [lpCerpani, faktura?.id, faktura?.invoice_id, faktura?.fa_castka, isLPFinancing, filteredLPCodes, availableLPCodes, onChange]);

  // Součet přiřazených částek
  const totalAssigned = useMemo(() => {
    const sum = rows.reduce((sum, row) => sum + (parseFloat(row.castka) || 0), 0);
    console.log('🔍 DEBUG LPCerpaniEditor - totalAssigned:', {
      rows,
      rowsLength: rows.length,
      sum,
      rowsCastky: rows.map(r => ({ castka: r.castka, parsed: parseFloat(r.castka) }))
    });
    return sum;
  }, [rows]);

  // Validace
  useEffect(() => {
    const messages = [];
    const faCastka = parseFloat(faktura?.fa_castka) || 0;

    // 1. Povinnost pro LP financování - musí mít alespoň jeden VALIDNÍ řádek
    const validRows = rows.filter(r => r.lp_id && r.lp_cislo && r.castka > 0);
    // ❌ ZRUŠENO: Nezobrazovat warning v disabled stavu
    if (!disabled && isLPFinancing && validRows.length === 0) {
      messages.push({
        type: 'error',
        text: '⚠️ Objednávka je financována z LP. Musíte přiřadit alespoň jeden LP kód s částkou!',
        code: 'MISSING_LP'
      });
    }

    // 2. Kontrola nevyplněných řádků (má LP kód ale ne částku nebo naopak)
    const incompleteRows = rows.filter(r => 
      (r.lp_id && (!r.castka || r.castka <= 0)) || 
      (!r.lp_id && r.castka > 0)
    );
    if (incompleteRows.length > 0) {
      messages.push({
        type: 'error',
        text: '❌ Všechny řádky musí mít vyplněný LP kód i částku',
        code: 'INCOMPLETE_ROWS'
      });
    }

    // 3. Kontrola překročení
    if (totalAssigned > faCastka) {
      messages.push({
        type: 'error',
        text: `❌ Součet LP čerpání (${formatCurrency(totalAssigned)} Kč) překračuje částku faktury (${formatCurrency(faCastka)} Kč)`,
        code: 'EXCEEDS_LIMIT'
      });
    }

    // 4. Informace o neúplném přiřazení (ne error!)
    if (totalAssigned > 0 && totalAssigned < faCastka) {
      messages.push({
        type: 'info',
        text: `ℹ️ Přiřadili jste ${formatCurrency(totalAssigned)} Kč z ${formatCurrency(faCastka)} Kč faktury. Rozdělení částky je na vaší odpovědnosti.`,
        code: 'PARTIAL_ASSIGNMENT'
      });
    }

    // 5. Potvrzení úplného přiřazení
    if (totalAssigned === faCastka && rows.length > 0) {
      messages.push({
        type: 'success',
        text: `✅ Celá částka faktury byla přiřazena na LP kódy.`,
        code: 'COMPLETE'
      });
    }

    setValidationMessages(messages);
    
    // Informovat parent o chybách pomocí stabilního ref callbacku
    if (onValidationChangeRef.current) {
      const hasErrors = messages.some(m => m.type === 'error');
      onValidationChangeRef.current(hasErrors);
    }
  }, [rows, totalAssigned, faktura, isLPFinancing]);

  // Handler pro změnu LP kódu
  const handleLPChange = useCallback((rowId, selectedLpId) => {
    setRows(prev => {
      const updated = prev.map(row => {
        if (row.id === rowId) {
          // Najít LP kód podle ID
          const lpOption = filteredLPCodes.find(lp => lp.id === selectedLpId);
          
          return {
            ...row,
            lp_cislo: lpOption ? lpOption.cislo_lp || lpOption.kod : '',
            lp_id: selectedLpId || null,
            lp_data: lpOption || null
          };
        }
        return row;
      });
      
      // 🔥 FIX: Posílat VŠECHNY řádky (i částečně vyplněné), parent má validovat před uložením
      if (onChange) {
        setTimeout(() => onChange(updated), 0);
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
      
      // 🔥 FIX: Posílat VŠECHNY řádky (i částečně vyplněné), parent má validovat před uložením
      if (onChange) {
        setTimeout(() => onChange(updated), 0);
      }
      
      return updated;
    });
  }, [onChange]);

  // Handler pro smazání řádku
  const handleRemoveRow = useCallback((rowId) => {
    setRows(prev => {
      const updated = prev.filter(row => row.id !== rowId);
      
      // Volání onChange okamžitě po aktualizaci - poslat všechny zbývající řádky
      if (onChange) {
        setTimeout(() => onChange(updated), 0);
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
      
      // 🔥 FIX: NEVOLAT onChange při přidání prázdného řádku
      // onChange se zavolá až při vyplnění LP kódu nebo částky (handleLPChange, handleCastkaChange)
      // Jinak se resetuje parent state a řádek zmizí
      
      return updated;
    });
  }, []);
  
  // Handler pro uložení dat při opuštění pole
  const handleSaveData = useCallback(() => {
    if (onChange) {
      onChange(rows);
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

      {rows.map((row, index) => (
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
              hasError={!row.lp_id}
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
              getOptionLabel={(option) => option?.label || `${option?.cislo_lp || option?.kod || option?.id} - ${option?.nazev_uctu || option?.nazev || 'Bez názvu'}`}
            />
          </FormGroup>

          <FormGroup>
            <label>Částka (Kč)&nbsp;<span style={{color: '#dc2626'}}>*</span></label>
            <CurrencyAmountInput
              value={row.castka || ''}
              onChange={(newValue) => handleCastkaChange(row.id, newValue)}
              onBlur={handleSaveData}
              hasError={!row.castka || row.castka <= 0}
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
      ))}

      {/* Tlačítko "Přidat další LP kód" - skrýt když je disabled (věcná už byla potvrzena) */}
      {!disabled && filteredLPCodes.length > rows.length && (
        <AddButton
          type="button"
          onClick={handleAddRow}
        >
          <FontAwesomeIcon icon={faPlus} /> Přidat další LP kód
        </AddButton>
      )}

      {validationMessages.map((msg, idx) => (
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
