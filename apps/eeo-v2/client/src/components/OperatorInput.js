/**
 * OperatorInput Component
 * Input pole s prefixem pro výběr operátoru (=, <, >)
 */

import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const OperatorInput = ({ value = '', onChange, placeholder = '0', icon, clearButton, onClear, isActive = false }) => {
  // Rozdělit value na operátor a číslo
  // Formát: "=5000" nebo ">1000" nebo "<500"
  const parseValue = (val) => {
    if (!val) return { operator: '=', number: '' };
    
    const match = val.match(/^([=<>])(.*)$/);
    if (match) {
      return { operator: match[1], number: match[2].trim() };
    }
    // Pokud není operátor, předpokládej =
    return { operator: '=', number: val };
  };

  const { operator, number } = parseValue(value);

  const handleOperatorChange = (newOperator) => {
    // Pokud není číslo, neposílej prázdný string - zachovej operátor
    if (!number || number.trim() === '') {
      // Vrať jen operátor bez čísla - tím se filtr neaktivuje, ale uživatel vidí vybraný operátor
      onChange(newOperator);
    } else {
      // DŮLEŽITÉ: Odstranit mezery před odesláním do API
      const valueWithoutSpaces = number.replace(/\s/g, '');
      onChange(`${newOperator}${valueWithoutSpaces}`);
    }
  };

  const handleNumberChange = (e) => {
    const rawValue = e.target.value;
    // Povolit číslice, mezery, deseti tečku/čárku, a MINUS znaménko
    const cleanValue = rawValue.replace(/[^\d\s,.\-]/g, '');
    
    // Pokud je číslo prázdné (ale ne minus), vrať jen operátor
    if (!cleanValue || cleanValue.trim() === '') {
      onChange(operator);
    } else {
      // DŮLEŽITÉ: Odstranit mezery před odesláním do API
      const valueWithoutSpaces = cleanValue.replace(/\s/g, '');
      // Poslat hodnotu i když je jen minus (aby zůstal v inputu)
      onChange(operator + valueWithoutSpaces);
    }
  };

  // Formátování čísla s mezerami (1000 -> 1 000, -1000 -> -1 000)
  const formatNumberWithSpaces = (num) => {
    if (!num) return '';
    const cleaned = num.replace(/\s/g, '');
    // Oddělení minus znaménka od čísla
    const isNegative = cleaned.startsWith('-');
    const absNum = isNegative ? cleaned.slice(1) : cleaned;
    const formatted = absNum.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return isNegative ? '-' + formatted : formatted;
  };

  return (
    <Wrapper $active={isActive} data-filter-active={isActive ? 'true' : 'false'}>
      <OperatorSelect 
        value={operator} 
        onChange={(e) => handleOperatorChange(e.target.value)}
        title="Vyberte operátor porovnání"
      >
        <option value="=">=</option>
        <option value="<">&lt;</option>
        <option value=">">&gt;</option>
      </OperatorSelect>
      <NumberInput
        type="text"
        placeholder={placeholder}
        value={formatNumberWithSpaces(number)}
        onChange={handleNumberChange}
        $hasValue={!!(number && number.trim())}
      />
      {number && number.trim() && clearButton && onClear && (
        <ClearButton onClick={onClear} title="Zrušit filtr">
          <FontAwesomeIcon icon={faTimes} style={{ width: '10px', height: '10px' }} />
        </ClearButton>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid ${props => props.$active ? '#f59e0b' : '#cbd5e1'};
  border-radius: 6px;
  background: ${props => props.$active ? '#fffbeb' : '#ffffff'};
  transition: border-color 0.15s ease;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  box-sizing: border-box;

  &:focus-within {
    border-color: #2563eb;
  }
`;

const OperatorSelect = styled.select`
  border: none;
  background: transparent;
  padding: 0 4px 0 6px;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  outline: none;
  border-right: 1px solid #e2e8f0;
  min-width: 26px;
  text-align: center;
  box-sizing: border-box;
  line-height: 1;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  height: 100%;
  font-family: inherit;

  &:hover {
    background: #f1f5f9;
  }

  option {
    font-size: 0.875rem;
    font-weight: 500;
  }
`;

const Separator = styled.span`
  display: none;
`;

const IconWrapper = styled.div`
  position: absolute;
  right: 0.5rem;
  color: #94a3b8;
  pointer-events: none;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
  z-index: 1;
  width: 16px;
  height: 16px;
  font-size: 11px;
  line-height: 1;
  border-radius: 3px;

  &:hover {
    color: #6b7280;
  }
`;

const NumberInput = styled.input`
  flex: 1;
  border: none;
  padding: 0 24px 0 8px;
  margin: 0;
  font-size: 0.75rem;
  color: #1e293b;
  outline: none;
  text-align: right;
  background: transparent;
  min-width: 40px;
  box-sizing: border-box;
  line-height: 1;
  height: 100%;
  font-family: inherit;

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
`;

export default OperatorInput;
