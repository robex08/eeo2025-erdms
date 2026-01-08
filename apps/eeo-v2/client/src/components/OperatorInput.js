/**
 * OperatorInput Component
 * Input pole s prefixem pro výběr operátoru (=, <, >)
 */

import React from 'react';
import styled from '@emotion/styled';

const OperatorInput = ({ value = '', onChange, placeholder = '0', icon }) => {
  // Rozdělit value na operátor a číslo
  // Formát: "=5000" nebo ">1000" nebo "<500"
  const parseValue = (val) => {
    if (!val) return { operator: '>', number: '' };
    
    const match = val.match(/^([=<>])(.*)$/);
    if (match) {
      return { operator: match[1], number: match[2].trim() };
    }
    // Pokud není operátor, předpokládej >
    return { operator: '>', number: val };
  };

  const { operator, number } = parseValue(value);

  const handleOperatorChange = (newOperator) => {
    // Pokud není číslo, vrať prázdný string (zobraz všechno)
    if (!number || number.trim() === '') {
      onChange('');
    } else {
      onChange(`${newOperator}${number}`);
    }
  };

  const handleNumberChange = (e) => {
    const rawValue = e.target.value;
    // Povolit pouze číslice, mezery a případně desetinnou tečku/čárku
    const cleanValue = rawValue.replace(/[^\d\s,.]/g, '');
    
    // Pokud je číslo prázdné, vrať prázdný string (zobraz všechno)
    if (!cleanValue || cleanValue.trim() === '') {
      onChange('');
    } else {
      onChange(operator + cleanValue);
    }
  };

  // Formátování čísla s mezerami (1000 -> 1 000)
  const formatNumberWithSpaces = (num) => {
    if (!num) return '';
    const cleaned = num.replace(/\s/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  return (
    <Wrapper>
      <OperatorSelect 
        value={operator} 
        onChange={(e) => handleOperatorChange(e.target.value)}
        title="Vyberte operátor porovnání"
      >
        <option value="=">=</option>
        <option value="<">&lt;</option>
        <option value=">">&gt;</option>
      </OperatorSelect>
      <Separator>|</Separator>
      {icon && <IconWrapper>{icon}</IconWrapper>}
      <NumberInput
        type="text"
        placeholder={placeholder}
        value={formatNumberWithSpaces(number)}
        onChange={handleNumberChange}
        hasIcon={!!icon}
      />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  max-width: 135px;
  width: 100%;

  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const OperatorSelect = styled.select`
  border: none;
  background: #f8fafc;
  padding: 0.4rem 0.3rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  outline: none;
  border-right: 1px solid #e2e8f0;
  min-width: 38px;
  text-align: center;

  &:hover {
    background: #f1f5f9;
  }

  option {
    font-size: 1rem;
  }
`;

const Separator = styled.span`
  color: #cbd5e1;
  font-weight: 300;
  padding: 0 0.25rem;
  user-select: none;
  font-size: 0.875rem;
`;

const IconWrapper = styled.div`
  position: absolute;
  right: 0.5rem;
  color: #94a3b8;
  pointer-events: none;
`;

const NumberInput = styled.input`
  flex: 1;
  border: none;
  padding: 0.4rem 0.3rem;
  padding-right: ${props => props.hasIcon ? '2rem' : '0.3rem'};
  font-size: 0.8125rem;
  color: #1e293b;
  outline: none;
  text-align: right;
  background: transparent;
  min-width: 50px;

  &::placeholder {
    color: #94a3b8;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
`;

export default OperatorInput;
