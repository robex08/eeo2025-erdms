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
  background: #f8f9fa;
  border: 1px solid ${props => props.hasError ? '#dc3545' : '#dee2e6'};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
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
  grid-template-columns: 280px minmax(180px, 1fr) 50px;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  
  label {
    font-size: 12px;
    font-weight: 600;
    color: #495057;
    margin-bottom: 4px;
    
    /* Červená hvězdička pro povinná pole */
    &:has(+ select[required]),
    &:has(+ input[required]) {
      &::after {
        content: ' *';
        color: #dc2626;
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
  flex: 1;
  padding: 8px 12px;
  border: 1px solid ${props => props.hasError ? '#dc3545' : '#ced4da'};
  border-radius: 4px;
  font-size: 14px;
  text-align: right;
  font-family: 'Roboto Mono', monospace;
  padding-right: 40px; /* Prostor pro Kč */
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc3545' : '#007bff'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 53, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)'};
  }
  
  &:disabled {
    background: #e9ecef;
    cursor: not-allowed;
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
  gap: 8px;
  align-items: center;
  justify-content: center;
`;

const IconButton = styled.button`
  margin-top: 18px;
  background: #ef4444;
  color: white;
  border: 2px solid white;
  border-radius: 6px;
  padding: 0.375rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    background-color: #dc2626;
    transform: scale(1.1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  }

  &:active:not(:disabled) {
    background-color: #b91c1c;
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    color: white;
    width: 16px;
    height: 16px;
  }
`;;

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
  const [rows, setRows] = useState([]);
  const [validationMessages, setValidationMessages] = useState([]);
  
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
    if (!availableLPCodes || availableLPCodes.length === 0) return [];
    
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
      return [];
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
    
    return filtered;
  }, [orderData?.lp_kod, availableLPCodes]);

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
        setRows(lpCerpani.map((item, idx) => ({
          id: `row_${idx}_${Date.now()}`,
          lp_cislo: item.lp_cislo || '',
          lp_id: item.lp_id || null,
          castka: item.castka || 0,
          poznamka: item.poznamka || ''
        })));
        autoFilledRef.current = true;
      } else if (!autoFilledRef.current && isLPFinancing && filteredLPCodes.length === 1 && faktura?.fa_castka) {
        // 🔥 AUTO-FILL: Pouze pokud ještě nebylo auto-filled
        const autoRow = {
          id: `row_auto_${Date.now()}`,
          lp_cislo: filteredLPCodes[0].cislo_lp || filteredLPCodes[0].kod,
          lp_id: filteredLPCodes[0].id,
          castka: parseFloat(faktura.fa_castka),
          poznamka: ''
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
    const validRows = rows.filter(r => r.lp_cislo && r.castka > 0);
    if (isLPFinancing && validRows.length === 0) {
      messages.push({
        type: 'error',
        text: '⚠️ Objednávka je financována z LP. Musíte přiřadit alespoň jeden LP kód s částkou!',
        code: 'MISSING_LP'
      });
    }

    // 2. Kontrola nevyplněných řádků (má LP kód ale ne částku nebo naopak)
    const incompleteRows = rows.filter(r => 
      (r.lp_cislo && (!r.castka || r.castka <= 0)) || 
      (!r.lp_cislo && r.castka > 0)
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
  const handleLPChange = useCallback((rowId, selectedValues) => {
    setRows(prev => {
      const updated = prev.map(row => {
        if (row.id === rowId) {
          // selectedValues je array hodnot (protože multiple=false, bude obsahovat max 1 prvek)
          const newValue = Array.isArray(selectedValues) && selectedValues.length > 0 
            ? selectedValues[0] 
            : '';
          
          // Najít LP objekt podle cislo_lp
          const selectedLP = filteredLPCodes.find(lp => 
            (lp.cislo_lp || lp.kod) === newValue
          );
          
          return {
            ...row,
            lp_cislo: newValue,
            lp_id: selectedLP?.id || null
          };
        }
        return row;
      });
      
      // Volání onChange okamžitě po aktualizaci
      if (onChange) {
        const validRows = updated.filter(r => r.lp_cislo && r.castka > 0);
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
        const validRows = updated.filter(r => r.lp_cislo && r.castka > 0);
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
        const validRows = updated.filter(r => r.lp_cislo && r.castka > 0);
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
        const validRows = updated.filter(r => r.lp_cislo && r.castka > 0);
        setTimeout(() => onChange(validRows), 0);
      }
      
      return updated;
    });
  }, [onChange]);

  // Pokud není LP financování, nezobrazovat editor
  if (!isLPFinancing) {
    return null;
  }

  const hasErrors = validationMessages.some(m => m.type === 'error');
  const faCastka = parseFloat(faktura?.fa_castka) || 0;

  return (
    <EditorWrapper 
      hasError={hasErrors}
    >
      <EditorHeader>
        <HeaderTitle>
          <FontAwesomeIcon icon={faInfoCircle} />
          Rozložení LP čerpání
        </HeaderTitle>
        <SummaryBox>
          <SummaryItem>
            <label>Částka faktury</label>
            <span>{formatCurrency(faCastka)} Kč</span>
          </SummaryItem>
          <SummaryItem highlight>
            <label>Přiřazeno na LP</label>
            <span>{formatCurrency(totalAssigned)} Kč</span>
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
              LP kód <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <CustomSelect
              value={row.lp_cislo ? [row.lp_cislo] : []}
              onChange={(selectedValues) => handleLPChange(row.id, selectedValues)}
              options={filteredLPCodes}
              placeholder="-- Vyberte LP --"
              field={`lp_row_${row.id}`}
              icon={<Hash />}
              disabled={disabled}
              hasError={false}
              required={true}
              multiple={false}
              getOptionLabel={(option) => {
                if (!option) return '';
                // Použít label pokud existuje, jinak sestavit z cislo_lp a nazev_uctu
                return option.label || `${option.cislo_lp || option.kod} - ${option.nazev_uctu || option.nazev || 'Bez názvu'}`;
              }}
              getOptionValue={(option) => {
                if (!option) return '';
                return option.cislo_lp || option.kod || option.id || String(option);
              }}
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
      ))}

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
