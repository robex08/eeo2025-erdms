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
  grid-template-columns: 1fr 200px 48px; /* Flexibilnější layout */
  gap: 20px;
  margin-bottom: 20px;
  align-items: end; /* Zarovnání na spodní hranu pro konzistenci */
  padding: 20px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: stretch;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 70px; /* Zajistí konzistentní výšku */
  
  label {
    font-size: 13px;
    font-weight: 600;
    color: #495057;
    margin-bottom: 6px;
    height: 20px;
    line-height: 20px;
    display: flex;
    align-items: center;
  }

  /* 🎯 Sjednocení výšky všech input elementů */
  [data-component="CustomSelect"] {
    height: 44px !important;
    
    & > div:first-child {
      height: 44px !important;
      display: flex;
      align-items: center;
    }
    
    /* Centrace placeholderu */
    .select__placeholder {
      line-height: 1;
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
  height: 44px; /* Stejná výška jako CustomSelect */
  padding: 10px 50px 10px 12px;
  border: 1px solid ${props => props.hasError ? '#dc3545' : '#ced4da'};
  border-radius: 6px;
  font-size: 14px;
  text-align: right;
  font-family: 'Roboto Mono', monospace;
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
  right: 12px;
  color: ${props => props.disabled ? '#9ca3af' : '#374151'};
  font-weight: 600;
  font-size: 0.875rem;
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
  min-height: 70px; /* Odpovídá FormGroup min-height */
  padding-bottom: 2px; /* Drobné doladění zarovnání */
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
  width: 44px;
  height: 44px;
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
    width: 16px;
    height: 16px;
  }
`;

const AddButton = styled.button`
  padding: 10px 16px;
  border: 2px dashed #007bff;
  border-radius: 4px;
  background: white;
  color: #007bff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  width: 100%;
  
  &:hover:not(:disabled) {
    background: #007bff;
    color: white;
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
  availableLPCodes = [], // 🔥 LP kódy z číselníku (předané z OrderForm25)
  onChange,
  onValidationChange, // 🔥 Callback pro zprávu o chybách
  disabled = false
}) {
  // 🚨 DEBUG: Log props na začátku
  console.log('🚨 [LPCerpaniEditor] INIT - Props debug:', {
    hasOrderData: !!orderData,
    orderDataKeys: orderData ? Object.keys(orderData) : null,
    orderDataLpKod: orderData?.lp_kod,
    orderDataFinancovani: orderData?.financovani,
    availableLPCodesCount: availableLPCodes?.length,
    lpCerpaniCount: lpCerpani?.length
  });
  
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

  // 🔥 Filtrovat LP kódy podle financování objednávky
  const filteredLPCodes = useMemo(() => {
    if (!availableLPCodes || availableLPCodes.length === 0) {
      console.warn('🚨 [LPCerpaniEditor] Žádné dostupné LP kódy!');
      console.log('🔍 availableLPCodes:', availableLPCodes);
      console.log('🔍 availableLPCodes.length:', availableLPCodes?.length);
      console.log('🔍 prvních 3 LP kódy:', availableLPCodes?.slice(0, 3));
      return [];
    }
    
    // 🔍 DEBUG: Log všech dostupných LP kódů
    console.log('🔍 [LPCerpaniEditor] Všechny dostupné LP kódy:', availableLPCodes.slice(0, 5));
    
    // Zkusit několik možných umístění LP kódů v orderData
    let lpKodyFromOrder = null;
    
    // 🔍 DEBUG: Log orderData pro analýzu
    console.log('🔍 [LPCerpaniEditor] orderData pro LP filtrování:', {
      lp_kod: orderData?.lp_kod,
      financovani: orderData?.financovani
    });
    
    // Možnost 1: orderData.lp_kod (array) - původní OrderForm25
    if (orderData?.lp_kod && Array.isArray(orderData.lp_kod) && orderData.lp_kod.length > 0) {
      lpKodyFromOrder = orderData.lp_kod;
      console.log('🎯 [LPCerpaniEditor] Našel LP kódy v orderData.lp_kod:', lpKodyFromOrder);
    }
    // Možnost 2: orderData.financovani.lp_kody (z parsed financování)
    else if (orderData?.financovani?.lp_kody && Array.isArray(orderData.financovani.lp_kody) && orderData.financovani.lp_kody.length > 0) {
      lpKodyFromOrder = orderData.financovani.lp_kody;
      console.log('🎯 [LPCerpaniEditor] Našel LP kódy v orderData.financovani.lp_kody:', lpKodyFromOrder);
    }
    
    if (!lpKodyFromOrder || lpKodyFromOrder.length === 0) {
      console.warn('🚨 [LPCerpaniEditor] Žádné LP kódy v objednávce - zobrazím všechny!');
      console.log('🔍 Kontrola LP kódů: orderData.lp_kod =', orderData?.lp_kod);
      console.log('🔍 Kontrola LP kódů: orderData.financovani =', orderData?.financovani);
      
      // 🔥 FALLBACK: Pokud nejsou specifikovány LP kódy, zobraz všechny dostupné
      console.log('✅ [LPCerpaniEditor] Používám všechny dostupné LP kódy jako fallback');
      return availableLPCodes;
    }
    
    // Filtrovat availableLPCodes podle LP kódů z objednávky
    const filtered = availableLPCodes.filter(lpOption => {
      return lpKodyFromOrder.some(kodValue => {
        // kodValue může být ID nebo kód (string)
        const match = lpOption.id === kodValue || 
               lpOption.id === Number(kodValue) ||
               lpOption.kod === kodValue ||
               lpOption.cislo_lp === kodValue;
        
        if (match) {
          console.log('✅ [LPCerpaniEditor] LP kód match:', { lpOption, kodValue });
        }
        return match;
      });
    });
    
    console.log('🎯 [LPCerpaniEditor] Finální filtrované LP kódy:', filtered);
    console.log('🎯 [LPCerpaniEditor] Počet filtrovaných LP kódů:', filtered.length);
    if (filtered.length > 0) {
      console.log('🎯 [LPCerpaniEditor] Prvních 3 filtrované:', filtered.slice(0, 3));
    } else {
      console.warn('⚠️ [LPCerpaniEditor] Žádné LP kódy po filtrování! Použiji všechny jako fallback.');
      return availableLPCodes; // 🔥 Fallback na všechny
    }
    return filtered;
  }, [orderData?.lp_kod, orderData?.financovani, availableLPCodes]);

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

  // Inicializace rows z lpCerpani prop
  useEffect(() => {
    const currentLength = lpCerpani?.length || 0;
    
    // Pokud se lpCerpani ZMĚNILO (jiná délka než předtím)
    if (currentLength !== prevLpCerpaniLengthRef.current) {
      prevLpCerpaniLengthRef.current = currentLength;
      
      if (currentLength > 0) {
        // Načíst existující data
        setRows(lpCerpani.map((item, idx) => {
          // Najít LP kód v dostupných options pro správné namapování
          const matchedLP = availableLPCodes?.find(lp => 
            lp.id === item.lp_id || 
            lp.cislo_lp === item.lp_cislo || 
            lp.kod === item.lp_cislo
          );
          
          return {
            id: `row_${idx}_${Date.now()}`,
            lp_cislo: item.lp_cislo || '',
            lp_id: item.lp_id || (matchedLP ? matchedLP.id : null),
            castka: item.castka || 0,
            poznamka: item.poznamka || '',
            lp_data: matchedLP || null
          };
        }));
        autoFilledRef.current = true;
      } else if (!autoFilledRef.current && isLPFinancing && filteredLPCodes.length === 1 && faktura?.fa_castka) {
        // 🔥 AUTO-FILL: Pouze pokud ještě nebylo auto-filled
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
        // Parent bude informován skrz druhý useEffect
      } else {
        // Prázdné lpCerpani a není co auto-fillovat
        setRows([]);
      }
    }
  }, [lpCerpani, isLPFinancing, filteredLPCodes, faktura?.fa_castka]);

  // Součet přiřazených částek
  const totalAssigned = useMemo(() => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.castka) || 0), 0);
  }, [rows]);

  // Validace
  useEffect(() => {
    const messages = [];
    const faCastka = parseFloat(faktura?.fa_castka) || 0;

    // 1. Povinnost pro LP financování - musí mít alespoň jeden VALIDNÍ řádek
    const validRows = rows.filter(r => r.lp_id && r.lp_cislo && r.castka > 0);
    if (isLPFinancing && validRows.length === 0) {
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

    // 6. Kontrola duplicitních LP kódů
    const lpCisla = rows.map(r => r.lp_cislo).filter(Boolean);
    const duplicates = lpCisla.filter((item, index) => lpCisla.indexOf(item) !== index);
    if (duplicates.length > 0) {
      messages.push({
        type: 'warning',
        text: `⚠️ Duplicitní LP kódy: ${duplicates.join(', ')}`,
        code: 'DUPLICATES'
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
    console.log('🔍 [handleLPChange] Změna LP kódu:', { rowId, selectedLpId });
    
    setRows(prev => {
      const updated = prev.map(row => {
        if (row.id === rowId) {
          // 🎯 Najít LP kód podle ID
          const lpOption = filteredLPCodes.find(lp => lp.id === selectedLpId);
          console.log('🎯 [handleLPChange] Nalezený LP:', lpOption);
          
          return {
            ...row,
            lp_cislo: lpOption ? lpOption.cislo_lp || lpOption.kod : '',  // Uložit cislo_lp/kod
            lp_id: selectedLpId || null,     // Uložit ID pro databázi
            lp_data: lpOption || null       // Uložit celý objekt pro reference
          };
        }
        return row;
      });
      
      // Volání onChange okamžitě po aktualizaci
      if (onChange) {
        const validRows = updated.filter(r => r.lp_cislo && r.lp_id && r.castka > 0);
        setTimeout(() => onChange(validRows), 0);
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
      
      // Volání onChange okamžitě po aktualizaci
      if (onChange) {
        const validRows = updated.filter(r => r.lp_id && r.lp_cislo && r.castka > 0);
        setTimeout(() => onChange(validRows), 0);
      }
      
      return updated;
    });
  }, [onChange]);

  // Handler pro smazání řádku
  const handleRemoveRow = useCallback((rowId) => {
    setRows(prev => {
      const updated = prev.filter(row => row.id !== rowId);
      
      // Volání onChange okamžitě po aktualizaci
      if (onChange) {
        const validRows = updated.filter(r => r.lp_id && r.lp_cislo && r.castka > 0);
        setTimeout(() => onChange(validRows), 0);
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
      
      // Volání onChange okamžitě po aktualizaci
      if (onChange) {
        const validRows = updated.filter(r => r.lp_id && r.lp_cislo && r.castka > 0);
        setTimeout(() => onChange(validRows), 0);
      }
      
      return updated;
    });
  }, [onChange]);
  
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
        // 🔍 DEBUG: Kontrola dat řádku a options
        console.log('🔍 [LPCerpaniEditor Řádek render]', {
          rowId: row.id,
          lp_cislo: row.lp_cislo,
          lp_id: row.lp_id,
          castka: row.castka,
          availableOptions: filteredLPCodes.length,
          firstOption: filteredLPCodes[0]
        });
        
        return (
        <LPRow key={row.id}>
          <FormGroup>
            <label>
              LP kód <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <CustomSelect
              data-component="CustomSelect"
              value={row.lp_id}
              onChange={(selectedValue) => {
                // 🔍 DEBUG: Log hodnot z CustomSelect
                console.log('🔍 [CustomSelect onChange]:', { selectedValue, row });
                
                handleLPChange(row.id, selectedValue);
              }}
              onBlur={() => {}}
              options={filteredLPCodes}
              placeholder="-- Vyberte LP kód --"
              field={`lp_${row.id}`}
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
              getOptionLabel={(option) => {
                // 🔍 DEBUG: Log option struktura
                console.log('🔍 [getOptionLabel] option:', option);
                
                if (!option) return '';
                
                // Priorita: cislo_lp > kod > id
                const kod = option.cislo_lp || option.kod || option.id;
                const nazev = option.nazev_uctu || option.nazev || 'Bez názvu';
                
                return `${kod} - ${nazev}`;
              }}
              getOptionValue={(option) => option?.id || option?.value || option}
            />
          </FormGroup>

          <FormGroup>
            <label>Částka (Kč) <span style={{color: '#dc2626'}}>*</span></label>
            <CurrencyAmountInput
              value={row.castka || ''}
              onChange={(newValue) => handleCastkaChange(row.id, newValue)}
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
        );
      })}

      {filteredLPCodes.length > rows.length && (
        <AddButton
          type="button"
          onClick={handleAddRow}
          disabled={disabled}
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

// ✅ React.memo pro prevenci zbytečných re-renderů
export default React.memo(LPCerpaniEditor, (prevProps, nextProps) => {
  // Porovnat jen klíčové props pro re-render
  return (
    prevProps.faktura?.id === nextProps.faktura?.id &&
    prevProps.orderData?.id === nextProps.orderData?.id &&
    prevProps.lpCerpani === nextProps.lpCerpani &&
    prevProps.availableLPCodes === nextProps.availableLPCodes &&
    prevProps.disabled === nextProps.disabled
  );
});
