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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMinus,
  faInfoCircle,
  faExclamationTriangle,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';

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
  grid-template-columns: 200px 1fr 100px;
  gap: 12px;
  margin-bottom: 12px;
  align-items: start;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  
  label {
    font-size: 12px;
    font-weight: 600;
    color: #495057;
    margin-bottom: 4px;
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

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid ${props => props.hasError ? '#dc3545' : '#ced4da'};
  border-radius: 4px;
  font-size: 14px;
  text-align: right;
  font-family: 'Roboto Mono', monospace;
  
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  color: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
    color: white;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

export default function LPCerpaniEditor({ 
  faktura, 
  orderData, 
  lpCerpani = [], 
  onChange,
  disabled = false 
}) {
  const [rows, setRows] = useState([]);
  const [validationMessages, setValidationMessages] = useState([]);

  // Extrahovat LP kódy z financování objednávky
  const availableLPCodes = useMemo(() => {
    if (!orderData?.financovani) return [];
    
    try {
      const fin = typeof orderData.financovani === 'string' 
        ? JSON.parse(orderData.financovani) 
        : orderData.financovani;
      
      if (fin.typ === 'LP' && Array.isArray(fin.lp_kody)) {
        return fin.lp_kody.map(kod => ({
          cislo: kod,
          id: null // ID se může načíst z číselníku LP, pokud potřeba
        }));
      }
    } catch (e) {
      console.error('Chyba při parsování financování:', e);
    }
    
    return [];
  }, [orderData]);

  // Je LP financování?
  const isLPFinancing = availableLPCodes.length > 0;

  // Inicializace rows z lpCerpani prop
  useEffect(() => {
    if (lpCerpani && lpCerpani.length > 0) {
      setRows(lpCerpani.map((item, idx) => ({
        id: `row_${idx}_${Date.now()}`,
        lp_cislo: item.lp_cislo || '',
        lp_id: item.lp_id || null,
        castka: item.castka || 0,
        poznamka: item.poznamka || ''
      })));
    } else if (isLPFinancing && availableLPCodes.length === 1 && faktura?.fa_castka) {
      // 🔥 AUTO-FILL: Pokud je jen jeden LP kód, automaticky předvyplnit
      const autoRow = {
        id: `row_auto_${Date.now()}`,
        lp_cislo: availableLPCodes[0].cislo,
        lp_id: availableLPCodes[0].id,
        castka: parseFloat(faktura.fa_castka),
        poznamka: ''
      };
      setRows([autoRow]);
      onChange && onChange([autoRow]);
    } else {
      setRows([]);
    }
  }, [lpCerpani, isLPFinancing, availableLPCodes, faktura?.fa_castka]);

  // Součet přiřazených částek
  const totalAssigned = useMemo(() => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.castka) || 0), 0);
  }, [rows]);

  // Validace
  useEffect(() => {
    const messages = [];
    const faCastka = parseFloat(faktura?.fa_castka) || 0;

    // 1. Povinnost pro LP financování
    if (isLPFinancing && rows.length === 0) {
      messages.push({
        type: 'error',
        text: '⚠️ Objednávka je financována z LP. Musíte přiřadit alespoň jeden LP kód!',
        code: 'MISSING_LP'
      });
    }

    // 2. Kontrola překročení
    if (totalAssigned > faCastka) {
      messages.push({
        type: 'error',
        text: `❌ Součet LP čerpání (${formatCurrency(totalAssigned)} Kč) překračuje částku faktury (${formatCurrency(faCastka)} Kč)`,
        code: 'EXCEEDS_LIMIT'
      });
    }

    // 3. Informace o neúplném přiřazení (ne error!)
    if (totalAssigned > 0 && totalAssigned < faCastka) {
      messages.push({
        type: 'info',
        text: `ℹ️ Přiřadili jste ${formatCurrency(totalAssigned)} Kč z ${formatCurrency(faCastka)} Kč faktury. Rozdělení částky je na vaší odpovědnosti.`,
        code: 'PARTIAL_ASSIGNMENT'
      });
    }

    // 4. Potvrzení úplného přiřazení
    if (totalAssigned === faCastka && rows.length > 0) {
      messages.push({
        type: 'success',
        text: `✅ Celá částka faktury byla přiřazena na LP kódy.`,
        code: 'COMPLETE'
      });
    }

    // 5. Kontrola nulových částek
    const zeroRows = rows.filter(r => !r.castka || parseFloat(r.castka) <= 0);
    if (zeroRows.length > 0) {
      messages.push({
        type: 'error',
        text: `❌ Všechny částky musí být větší než 0 Kč`,
        code: 'ZERO_AMOUNT'
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
  }, [rows, totalAssigned, faktura, isLPFinancing]);

  // Handler pro změnu LP kódu
  const handleLPChange = useCallback((rowId, lpCislo) => {
    setRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, lp_cislo: lpCislo, lp_id: null } // TODO: načíst lp_id z číselníku
        : row
    ));
  }, []);

  // Handler pro změnu částky
  const handleCastkaChange = useCallback((rowId, value) => {
    setRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, castka: parseCurrency(value) }
        : row
    ));
  }, []);

  // Handler pro smazání řádku
  const handleRemoveRow = useCallback((rowId) => {
    setRows(prev => prev.filter(row => row.id !== rowId));
  }, []);

  // Handler pro přidání řádku
  const handleAddRow = useCallback(() => {
    const newRow = {
      id: `row_${Date.now()}`,
      lp_cislo: '',
      lp_id: null,
      castka: 0,
      poznamka: ''
    };
    setRows(prev => [...prev, newRow]);
  }, []);

  // Aktualizovat parent component při změně rows
  useEffect(() => {
    if (onChange) {
      // Vyfiltrovat pouze validní řádky (s LP kódem a částkou)
      const validRows = rows.filter(r => r.lp_cislo && r.castka > 0);
      onChange(validRows);
    }
  }, [rows, onChange]);

  // Pokud není LP financování, nezobrazovat editor
  if (!isLPFinancing) {
    return null;
  }

  const hasErrors = validationMessages.some(m => m.type === 'error');
  const faCastka = parseFloat(faktura?.fa_castka) || 0;

  return (
    <EditorWrapper hasError={hasErrors}>
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

      {availableLPCodes.length === 1 && rows.length > 0 && (
        <AutoFillNote>
          ℹ️ Objednávka používá pouze jeden LP kód, částka byla automaticky předvyplněna. Můžete ji upravit podle potřeby.
        </AutoFillNote>
      )}

      {rows.map((row, index) => (
        <LPRow key={row.id}>
          <FormGroup>
            <label>LP kód *</label>
            <Select
              value={row.lp_cislo}
              onChange={(e) => handleLPChange(row.id, e.target.value)}
              disabled={disabled}
            >
              <option value="">-- Vyberte LP --</option>
              {availableLPCodes.map(lp => (
                <option key={lp.cislo} value={lp.cislo}>
                  LP-{lp.cislo}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <label>Částka (Kč) *</label>
            <Input
              type="text"
              value={formatCurrency(row.castka)}
              onChange={(e) => handleCastkaChange(row.id, e.target.value)}
              placeholder="0,00"
              disabled={disabled}
              hasError={!row.castka || row.castka <= 0}
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
              <FontAwesomeIcon icon={faMinus} />
            </IconButton>
          </ButtonGroup>
        </LPRow>
      ))}

      {availableLPCodes.length > rows.length && (
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
