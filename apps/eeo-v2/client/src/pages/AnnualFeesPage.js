import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faMinus, faFilter, faSearch, faCalendar, 
  faMoneyBill, faFileInvoice, faEdit, 
  faTrash, faCheckCircle, faExclamationTriangle, faSpinner, faUndo, faTimes, faAngleDown 
} from '@fortawesome/free-solid-svg-icons';
import { Calculator } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import ConfirmDialog from '../components/ConfirmDialog';
import { 
  getAnnualFeesList, 
  getAnnualFeeDetail, 
  createAnnualFee, 
  createAnnualFeeItem,
  updateAnnualFee, 
  updateAnnualFeeItem, 
  deleteAnnualFee 
} from '../services/apiAnnualFees';
import { universalSearch } from '../services/apiUniversalSearch';
import { getSmlouvaDetail } from '../services/apiSmlouvy';
import { getStavyRocnichPoplatku, getDruhyRocnichPoplatku, getPlatbyRocnichPoplatku } from '../services/apiv2Dictionaries';
import { useDebounce } from '../hooks/useDebounce';

/**
 * 📋 EVIDENCE ROČNÍCH POPLATKŮ
 * 
 * Stránka pro správu ročních poplatků vázaných na smlouvy
 * - Rozbalitelné řádky (dropdown) podle vzoru Order V3
 * - Automatické generování položek podle typu platby (měsíční/kvartální/roční)
 * - Integrace se smlouvami a fakturami
 * 
 * ✅ DATA: Připojeno na API
 * - POST /api.eeo/annual-fees/list (seznam s filtry)
 * - POST /api.eeo/annual-fees/detail (detail s položkami)
 * - POST /api.eeo/annual-fees/create (vytvoření + auto-generování položek)
 * - POST /api.eeo/annual-fees/update-item (změna stavu položky)
 * - POST /api.eeo/annual-fees/delete (smazání poplatku)
 * 
 * @version 1.1.0
 * @date 2026-01-27
 */

// 🎨 STYLED COMPONENTS

const CurrencyInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const CurrencySymbol = styled.span`
  position: absolute;
  right: 8px;
  color: ${props => props.disabled ? '#9ca3af' : '#374151'};
  font-weight: 600;
  font-size: 0.875rem;
  font-family: inherit;
  pointer-events: none;
  user-select: none;
  display: flex;
  align-items: center;
  height: 100%;
`;

const PageContainer = styled.div`
  width: 100%;
  padding: 16px;
  margin: 0;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Využití celé šířky obrazovky jako u Order V3 */
  @media (min-width: 1920px) {
    padding: 20px;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  
  .beta-badge {
    padding: 4px 12px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    letter-spacing: 0.5px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: inherit;
  
  ${props => props.variant === 'primary' && `
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: white;
    color: #374151;
    border: 2px solid #e5e7eb;
    
    &:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const FiltersBar = styled.div`
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
`;

const FilterLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #374151;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #d1d5db;
  }
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
`;

const SearchInput = styled.input`
  padding: 8px 12px 8px 40px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #374151;
  background: white;
  min-width: 300px;
  transition: all 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px center;
  background-size: 18px;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const SuggestionsWrapper = styled.div`
  position: relative;
  z-index: 100;
`;

const SuggestionsDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 500px;
  width: max-content;
  max-width: 800px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  margin-top: 4px;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 10000;
`;

const SuggestionItem = styled.div`
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s ease;
  
  &:hover {
    background: #f9fafb;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const SuggestionTitle = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SuggestionBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  background: ${props => props.$color || '#e5e7eb'};
  color: ${props => props.$textColor || '#374151'};
`;

const SuggestionDetail = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: visible;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
  font-size: 0.875rem;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-bottom: 2px solid #e5e7eb;
`;

const Th = styled.th`
  padding: 12px 8px;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  white-space: nowrap;
`;

const Tbody = styled.tbody`
  tr:hover {
    background: #f9fafb;
  }
`;

const Tr = styled.tr`
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s ease;
  
  ${props => props.clickable && `
    cursor: pointer;
  `}
`;

const Td = styled.td`
  padding: 12px 8px;
  color: #1e293b;
  font-size: 0.875rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  vertical-align: middle;
  position: relative;
  overflow: visible;
`;

const ExpandButton = styled.button`
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  
  &:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #475569;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  
  ${props => {
    switch(props.status) {
      case 'ZAPLACENO':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'NEZAPLACENO':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      case 'V_RESENI':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
        `;
    }
  }}
`;

const InvoiceStatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  
  ${props => {
    switch(props.status) {
      case 'ZAPLACENO':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'VECNA_SPRAVNOST':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case 'K_ZAPLACENI':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'PREDANA_PO':
        return `
          background: #e0e7ff;
          color: #4338ca;
        `;
      case 'V_RESENI':
        return `
          background: #fce7f3;
          color: #9f1239;
        `;
      case 'ZAEVIDOVANA':
        return `
          background: #e5e7eb;
          color: #374151;
        `;
      case 'STORNO':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

const SubItemsContainer = styled.tr`
  background: #f9fafb;
`;

const SubItemsWrapper = styled.td`
  padding: 0 !important;
`;

const SubItemsTable = styled.table`
  width: 100%;
  background: #fafbfc;
  border-left: 4px solid #10b981;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.875rem;
`;

const SubItemRow = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f3f4f6;
  }
`;

const SubItemCell = styled.td`
  padding: 10px 12px;
  padding-left: ${props => props.indent ? '48px' : '16px'};
  color: #64748b;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  vertical-align: middle;
`;

// II. Styled komponenty pro inline "Nový řádek" formulář
const NewRowTr = styled.tr`
  background: #f0fdf4;
  border: 2px solid #10b981;
  
  &:hover {
    background: #dcfce7;
  }
`;

const NewRowButton = styled.button`
  width: 100%;
  background: transparent;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
  padding: 16px 24px;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 600;
  transition: all 0.2s ease;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:hover {
    background: #f9fafb;
    border-color: #10b981;
    color: #10b981;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    font-size: 1.1rem;
  }
`;

const InlineInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    color: #6b7280;
    background: #f3f4f6;
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }
`;

const DateWithArrowContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
`;

const ArrowButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

// 🔔 Modal komponenty
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #111827;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #6b7280;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const PolozkyTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    background: #f3f4f6;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
  }
  
  td {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  tbody tr:hover {
    background: #f9fafb;
  }
`;

const InlineSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: all 0.2s ease;
  background: #ffffff;
  cursor: pointer;

  /* Zvýrazněné vybrané hodnoty vs. placeholder */
  color: ${props => props.value && props.value !== '' && props.value !== 'placeholder' ? '#1f2937' : '#6b7280'};
  font-weight: ${props => {
    if (props.disabled) return '400';
    return props.value && props.value !== '' && props.value !== 'placeholder' ? '600' : '400';
  }};

  /* Custom arrow */
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;
  padding-right: 2.5rem;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 8px 0;
  }
  
  p {
    font-size: 0.95rem;
    margin: 0;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #10b981;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 16px auto;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// 🧩 CURRENCY INPUT COMPONENT - Převzato z OrderForm25
function CurrencyInput({ value, onChange, onBlur, disabled, hasError, placeholder = '0,00' }) {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Funkce pro formátování měny (BEZ Kč, protože to je fixně vpravo)
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
  };

  // Inicializace lokální hodnoty z props (pouze když není focused)
  useEffect(() => {
    if (!isFocused) {
      const formattedValue = formatCurrency(value || '');
      if (localValue !== formattedValue) {
        setLocalValue(formattedValue);
      }
    }
  }, [value, isFocused, localValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Očistit hodnotu od formátování
    const cleanValue = newValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);

    if (onChange) {
      onChange(finalValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlurLocal = () => {
    setIsFocused(false);

    // Formátovat hodnotu při ztrátě fokusu
    const formatted = formatCurrency(localValue);
    setLocalValue(formatted);

    const cleanValue = localValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);

    if (onBlur) {
      onBlur(finalValue);
    }
  };

  return (
    <CurrencyInputWrapper>
      <InlineInput
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlurLocal}
        disabled={disabled}
        style={{ textAlign: 'right', paddingRight: '32px' }}
      />
      <CurrencySymbol disabled={disabled}>Kč</CurrencySymbol>
    </CurrencyInputWrapper>
  );
}

// 🧩 MAIN COMPONENT

function AnnualFeesPage() {
  const { token, username, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  // State
  const [loading, setLoading] = useState(true);
  const [annualFees, setAnnualFees] = useState([]);
  
  // 💾 Inicializace expandedRows z localStorage
  const [expandedRows, setExpandedRows] = useState(() => {
    try {
      const saved = localStorage.getItem('annualFees_expandedRows');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      console.error('Chyba při načítání expandedRows z localStorage:', error);
      return new Set();
    }
  });
  
  const [showNewRow, setShowNewRow] = useState(false);
  const [filters, setFilters] = useState({
    rok: new Date().getFullYear(),
    druh: 'all',
    platba: 'all',
    stav: 'all',
    smlouva: ''
  });
  
  // Číselníky
  const [druhy, setDruhy] = useState([]);
  const [platby, setPlatby] = useState([]);
  const [stavy, setStavy] = useState([]);
  
  // Autocomplete pro smlouvy
  const [smlouvySearch, setSmlouvySearch] = useState('');
  const [smlouvySuggestions, setSmlouvySuggestions] = useState([]);
  const [showSmlouvySuggestions, setShowSmlouvySuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const smlouvySearchRef = useRef(null);
  
  // Editace hlavního řádku (fee)
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editFeeData, setEditFeeData] = useState({});
  
  // Editace položek
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemData, setEditItemData] = useState({});
  
  // 🔔 Modal pro potvrzení položek
  const [showPolozkyModal, setShowPolozkyModal] = useState(false);
  const [generatedPolozky, setGeneratedPolozky] = useState([]);
  const [pendingFeeData, setPendingFeeData] = useState(null); // Hlavní řádek čekající na potvrzení
  const [isCreating, setIsCreating] = useState(false); // true = CREATE, false = UPDATE
  
  // Přidání nové položky k existujícímu ročnímu poplatku
  const [addingItemToFeeId, setAddingItemToFeeId] = useState(null);
  const [newItemData, setNewItemData] = useState({
    nazev_polozky: '', // Poznámka
    datum_splatnosti: '',
    castka: '',
    cislo_dokladu: '', // Číslo dokladu (VEMA)
    datum_zaplaceno: new Date().toISOString().split('T')[0] // Dnešní datum
  });
  
  // Autocomplete pro faktury
  const [fakturySearch, setFakturySearch] = useState('');
  const [fakturySuggestions, setFakturySuggestions] = useState([]);
  const [showFakturySuggestions, setShowFakturySuggestions] = useState(false);
  const [isSearchingFaktury, setIsSearchingFaktury] = useState(false);
  const fakturySearchRef = useRef(null);
  const fakturyInputRef = useRef(null);
  const [shouldFocusFaktura, setShouldFocusFaktura] = useState(false);
  const debouncedFakturySearch = useDebounce(fakturySearch, 300);
  
  // Form data pro CREATE
  const [newFeeData, setNewFeeData] = useState({
    smlouva_id: null,
    smlouva_cislo: '',
    dodavatel_nazev: '',
    nazev: '',
    poznamka: '',
    druh: 'JINE',
    platba: 'MESICNI',
    castka: '',
    rok: new Date().getFullYear(),
    datum_prvni_splatnosti: `${new Date().getFullYear()}-01-01`
  });
  
  // Debounced search
  const debouncedSmlouvySearch = useDebounce(smlouvySearch, 300);
  
  // 💰 Formátování částek
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
  };
  
  const formatCurrencySimple = (val) => {
    if (!val && val !== 0) return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',') + ' Kč';
  };
  
  // 🔧 Generování položek (stejná logika jako backend)
  const generatePolozkyLocal = (platba, rok, celkovaCastka, datumPrvniSplatnosti) => {
    const polozky = [];
    const datum = new Date(datumPrvniSplatnosti);
    
    const mesiceCesky = [
      '', 'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
      'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
    ];
    
    let pocetPolozek = 0;
    
    switch (platba) {
      case 'MESICNI':
        pocetPolozek = 12;
        for (let i = 0; i < 12; i++) {
          const mesic = datum.getMonth() + 1;
          polozky.push({
            nazev_polozky: `${mesiceCesky[mesic]} ${rok}`,
            datum_splatnosti: datum.toISOString().split('T')[0],
            castka: celkovaCastka / 12,
            cislo_dokladu: '',
            datum_zaplaceno: null
          });
          datum.setMonth(datum.getMonth() + 1);
        }
        break;
        
      case 'KVARTALNI':
        pocetPolozek = 4;
        for (let i = 1; i <= 4; i++) {
          polozky.push({
            nazev_polozky: `Q${i} ${rok}`,
            datum_splatnosti: datum.toISOString().split('T')[0],
            castka: celkovaCastka / 4,
            cislo_dokladu: '',
            datum_zaplaceno: null
          });
          datum.setMonth(datum.getMonth() + 3);
        }
        break;
        
      case 'ROCNI':
        pocetPolozek = 1;
        polozky.push({
          nazev_polozky: `Roční poplatek ${rok}`,
          datum_splatnosti: datum.toISOString().split('T')[0],
          castka: celkovaCastka,
          cislo_dokladu: '',
          datum_zaplaceno: null
        });
        break;
        
      case 'JINA':
        // Žádné položky - přidávají se manuálně
        break;
        
      default:
        console.warn('Neznámý typ platby:', platba);
    }
    
    return polozky;
  };

  // 🔄 Aktualizace datumů podle periody platby od daného řádku dolů
  const updateDatesFromIndex = (items, setItems, startIndex, platba, baseDate) => {
    const updated = [...items];
    const startDate = new Date(baseDate);
    
    for (let i = startIndex + 1; i < updated.length; i++) {
      const nextDate = new Date(startDate);
      const offset = i - startIndex;
      
      switch (platba) {
        case 'MESICNI':
          nextDate.setMonth(startDate.getMonth() + offset);
          break;
        case 'KVARTALNI':
          nextDate.setMonth(startDate.getMonth() + (offset * 3));
          break;
        case 'ROCNI':
          nextDate.setFullYear(startDate.getFullYear() + offset);
          break;
        default:
          continue; // Pro JINA a neznámé typy neaktualizujeme
      }
      
      updated[i].datum_splatnosti = nextDate.toISOString().split('T')[0];
    }
    
    setItems(updated);
  };

  // Aktualizace dat v existujících annual fees
  const updateExistingDatesFromIndex = async (itemIndex, fee, setAnnualFees, saveToDatabase = true) => {
    // Nejprve aktualizovat stav pro okamžitou vizuální zpětnou vazbu
    setAnnualFees(prevFees => 
      prevFees.map(f => {
        if (f.id === fee.id) {
          const updated = {...f};
          const updatedPolozky = [...f.polozky];
          const startItem = updatedPolozky[itemIndex];
          if (!startItem) return f;

          const startDate = new Date(startItem.datum_splatnosti);
          
          for (let i = itemIndex + 1; i < updatedPolozky.length; i++) {
            const nextDate = new Date(startDate);
            const offset = i - itemIndex;
            
            switch (fee.periodicnost_platby) {
              case 'MESICNI':
                nextDate.setMonth(startDate.getMonth() + offset);
                break;
              case 'KVARTALNI':
                nextDate.setMonth(startDate.getMonth() + (offset * 3));
                break;
              case 'ROCNI':
                nextDate.setFullYear(startDate.getFullYear() + offset);
                break;
              default:
                continue; // Pro JINA a neznámé typy neaktualizujeme
            }
            
            updatedPolozky[i] = {
              ...updatedPolozky[i],
              datum_splatnosti: nextDate.toISOString().split('T')[0]
            };
          }
          
          updated.polozky = updatedPolozky;
          return updated;
        }
        return f;
      })
    );

    // Pokud je saveToDatabase true, uložit změny do databáze
    if (saveToDatabase) {
      try {
        const startItem = fee.polozky[itemIndex];
        if (!startItem) return;

        const startDate = new Date(startItem.datum_splatnosti);
        const updatePromises = [];
        
        for (let i = itemIndex + 1; i < fee.polozky.length; i++) {
          const nextDate = new Date(startDate);
          const offset = i - itemIndex;
          
          switch (fee.periodicnost_platby) {
            case 'MESICNI':
              nextDate.setMonth(startDate.getMonth() + offset);
              break;
            case 'KVARTALNI':
              nextDate.setMonth(startDate.getMonth() + (offset * 3));
              break;
            case 'ROCNI':
              nextDate.setFullYear(startDate.getFullYear() + offset);
              break;
            default:
              continue;
          }
          
          const item = fee.polozky[i];
          updatePromises.push(
            updateAnnualFeeItem({
              token,
              username,
              id: item.id,
              data: { datum_splatnosti: nextDate.toISOString().split('T')[0] }
            })
          );
        }

        await Promise.all(updatePromises);
        showToast('Data splatnosti byla aktualizována podle periody platby', 'success');
        
      } catch (error) {
        console.error('Chyba při aktualizaci dat splatnosti:', error);
        showToast('Chyba při ukládání aktualizovaných dat splatnosti', 'error');
        
        // V případě chyby obnovit data z databáze
        const detail = await getAnnualFeeDetail({
          token,
          username,
          id: fee.id
        });
        
        if (detail.data) {
          setAnnualFees(prev => prev.map(f => 
            f.id === fee.id ? { ...f, ...detail.data } : f
          ));
        }
      }
    }
  };
  
  // Load číselníky
  useEffect(() => {
    loadCiselniky();
  }, []);
  
  const loadCiselniky = async () => {
    try {
      const [druhyRes, platbyRes, stavyRes] = await Promise.all([
        getDruhyRocnichPoplatku({ token, username }),
        getPlatbyRocnichPoplatku({ token, username }),
        getStavyRocnichPoplatku({ token, username })
      ]);
      
      setDruhy(druhyRes || []);
      setPlatby(platbyRes || []);
      setStavy(stavyRes || []);
    } catch (error) {
      console.error('Chyba při načítání číselníků:', error);
      showToast('Chyba při načítání číselníků', 'error');
    }
  };
  
  // Load data
  useEffect(() => {
    loadAnnualFees();
  }, [filters]);
  
  // Load číselníky při startu
  useEffect(() => {
    if (token && username) {
      loadCiselniky();
    }
  }, [token, username]);
  
  // 💾 Uložit expandedRows do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('annualFees_expandedRows', JSON.stringify([...expandedRows]));
    } catch (error) {
      console.error('Chyba při ukládání expandedRows do localStorage:', error);
    }
  }, [expandedRows]);
  
  const loadAnnualFees = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      const response = await getAnnualFeesList({
        token,
        username,
        filters: {
          rok: filters.rok,
          druh: filters.druh !== 'all' ? filters.druh : undefined,
          platba: filters.platba !== 'all' ? filters.platba : undefined,
          stav: filters.stav !== 'all' ? filters.stav : undefined,
          smlouva: filters.smlouva || undefined
        }
      });
      
      // Backend nyní vrací pocet_zaplaceno přímo - nemusíme přepočítávat
      setAnnualFees(response.data || []);
      
      // 💾 Načíst detaily pro již rozbalené řádky
      if (expandedRows.size > 0) {
        const fees = response.data || [];
        for (const feeId of expandedRows) {
          const feeExists = fees.find(f => f.id === feeId);
          if (feeExists && !feeExists.polozky) {
            try {
              const detail = await getAnnualFeeDetail({
                token,
                username,
                id: feeId
              });
              
              if (detail.data) {
                setAnnualFees(prev => prev.map(fee => 
                  fee.id === feeId ? { ...fee, polozky: detail.data.polozky } : fee
                ));
              }
            } catch (error) {
              console.error(`Chyba při načítání detailu pro ID ${feeId}:`, error);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Chyba při načítání ročních poplatků:', error);
      showToast('Chyba při načítání ročních poplatků', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle row expansion
  const toggleRow = async (id) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      
      // Načíst detail s položkami
      try {
        const detail = await getAnnualFeeDetail({
          token,
          username,
          id
        });
        
        if (detail.data) {
          setAnnualFees(prev => prev.map(fee => 
            fee.id === id ? { ...fee, polozky: detail.data.polozky } : fee
          ));
        }
      } catch (error) {
        console.error('Chyba při načítání detailu:', error);
        showToast('Chyba při načítání detailu poplatku', 'error');
      }
    }
    
    setExpandedRows(newExpanded);
  };
  
  // Filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Search smluv pro autocomplete
  useEffect(() => {
    if (debouncedSmlouvySearch.length >= 3) {
      searchSmlouvy(debouncedSmlouvySearch);
    } else {
      setSmlouvySuggestions([]);
      setShowSmlouvySuggestions(false);
    }
  }, [debouncedSmlouvySearch]);
  
  // Search faktur pro autocomplete
  useEffect(() => {
    if (debouncedFakturySearch.length >= 3) {
      searchFaktury(debouncedFakturySearch);
    } else {
      setFakturySuggestions([]);
      setShowFakturySuggestions(false);
    }
  }, [debouncedFakturySearch]);
  
  // Fokus na pole faktury při otevření editace kvůli chybějící faktuře
  useEffect(() => {
    if (shouldFocusFaktura && fakturyInputRef.current) {
      setTimeout(() => {
        fakturyInputRef.current?.focus();
        setShouldFocusFaktura(false);
      }, 100);
    }
  }, [shouldFocusFaktura, editingItemId]);
  
  const searchSmlouvy = async (query) => {
    if (!query || query.length < 3) {
      setSmlouvySuggestions([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await universalSearch({
        query,
        categories: ['contracts'],
        limit: 10,
        archivovano: 0
      });
      
      const contracts = response?.categories?.contracts?.results || [];
      const activeContracts = contracts.filter(c => c.aktivni === 1);
      
      setSmlouvySuggestions(activeContracts);
      setShowSmlouvySuggestions(true);
    } catch (error) {
      console.error('Chyba při vyhledávání smluv:', error);
      setSmlouvySuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const searchFaktury = async (query) => {
    if (!query || query.length < 3) {
      setFakturySuggestions([]);
      return;
    }
    
    setIsSearchingFaktury(true);
    try {
      const response = await universalSearch({
        query,
        categories: ['invoices'],
        limit: 10,
        include_inactive: false  // ✅ Nabízet JEN aktivní faktury (aktivni = 1)
      });
      
      const invoices = response?.categories?.invoices?.results || [];
      
      // Filtruj pouze aktivní faktury
      // Backend už zajišťuje, že se nabízejí:
      // 1) Nepřiřazené faktury (smlouva_id IS NULL AND objednavka_id IS NULL)
      // 2) Faktury již přiřazené k ročním poplatkům (mají rocni_poplatek v rozsirujici_data)
      // Takže když editujeme položku s fakturou, ta se nabídne znovu
      const activeFaktury = invoices.filter(f => f.aktivni === 1 || f.aktivni === '1');
      
      setFakturySuggestions(activeFaktury);
      setShowFakturySuggestions(true);
    } catch (error) {
      console.error('Chyba při vyhledávání faktur:', error);
      setFakturySuggestions([]);
    } finally {
      setIsSearchingFaktury(false);
    }
  };
  
  const handleStartEditItem = (item, focusOnFaktura = false) => {
    setEditingItemId(item.id);
    
    // Pokud je to payment mode (tlačítko zaplatit), init datum na dnes
    const isPaymentMode = item._paymentMode || false;
    const initDatumZaplaceno = isPaymentMode && !item.datum_zaplaceno
      ? new Date().toISOString().split('T')[0]
      : (item.datum_zaplaceno || '');
    
    setEditItemData({
      nazev_polozky: item.nazev_polozky,
      datum_splatnosti: item.datum_splatnosti,
      castka: item.castka,
      cislo_dokladu: item.cislo_dokladu || '',
      datum_zaplaceno: initDatumZaplaceno,
      _paymentMode: isPaymentMode
    });
  };
  
  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditItemData({});
    setFakturySearch('');
    setFakturySuggestions([]);
    setShowFakturySuggestions(false);
    setShouldFocusFaktura(false);
  };
  
  const handleSaveEditItem = async (itemId) => {
    try {
      const dataToSave = {...editItemData};
      
      // 🧹 Vyčistit prázdné datumové hodnoty (MySQL nechce prázdné stringy)
      if (dataToSave.datum_splatnosti === '') dataToSave.datum_splatnosti = null;
      if (dataToSave.datum_zaplaceno === '') dataToSave.datum_zaplaceno = null;
      
      // Pokud je payment mode, validovat a nastavit status
      if (dataToSave._paymentMode) {
        if (!dataToSave.cislo_dokladu || !dataToSave.cislo_dokladu.trim()) {
          showToast('Pro zaplacení je povinné číslo dokladu', 'error');
          return;
        }
        
        if (!dataToSave.datum_zaplaceno) {
          showToast('Pro zaplacení je povinné datum zaplacení', 'error');
          return;
        }
        
        // AŽ NYNÍ změnit status na ZAPLACENO
        dataToSave.stav = 'ZAPLACENO';
        dataToSave.datum_zaplaceni = dataToSave.datum_zaplaceno;
      }
      
      // Vyčistit interní flag
      delete dataToSave._paymentMode;
      
      await handleUpdateItem(itemId, dataToSave);
      setEditingItemId(null);
      setEditItemData({});
    } catch (error) {
      console.error('Chyba při ukládání položky:', error);
    }
  };
  
  const handleStartAddItem = (feeId) => {
    setAddingItemToFeeId(feeId);
    setNewItemData({
      nazev_polozky: '',
      datum_splatnosti: '',
      castka: '',
      cislo_dokladu: '',
      datum_zaplaceno: new Date().toISOString().split('T')[0]
    });
  };
  
  const handleCancelAddItem = () => {
    setAddingItemToFeeId(null);
    setNewItemData({
      nazev_polozky: '',
      datum_splatnosti: '',
      castka: '',
      cislo_dokladu: '',
      datum_zaplaceno: new Date().toISOString().split('T')[0]
    });
  };
  
  const handleSaveNewItem = async (feeId) => {
    if (!newItemData.nazev_polozky || !newItemData.datum_splatnosti || !newItemData.castka) {
      showToast('Vyplňte poznámku, splatnost a částku', 'error');
      return;
    }
    
    // Očistit částku od formátování
    const castkaStr = (newItemData.castka || '').toString().trim();
    const cleanCastka = castkaStr.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsedCastka = parseFloat(cleanCastka);
    
    if (isNaN(parsedCastka) || parsedCastka <= 0) {
      showToast('Vyplňte platnou částku', 'error');
      return;
    }
    
    try {
      const response = await createAnnualFeeItem({
        token,
        username,
        rocni_poplatek_id: feeId,
        nazev_polozky: newItemData.nazev_polozky,
        datum_splatnosti: newItemData.datum_splatnosti,
        castka: Math.round(parsedCastka * 100) / 100,
        cislo_dokladu: newItemData.cislo_dokladu || null,
        datum_zaplaceno: newItemData.datum_zaplaceno || null
      });
      
      if (response.status === 'success') {
        showToast('Položka přidána', 'success');
        handleCancelAddItem();
        loadAnnualFees();
      } else {
        showToast(response.message || 'Chyba při přidávání položky', 'error');
      }
    } catch (error) {
      console.error('Chyba při přidávání položky:', error);
      showToast('Chyba při přidávání položky', 'error');
    }
  };
  
  const handleSelectFaktura = (faktura) => {
    setEditItemData(prev => ({
      ...prev,
      faktura_id: faktura.id,
      faktura_cislo: faktura.fa_cislo_vema
    }));
    setFakturySearch(faktura.fa_cislo_vema);
    setShowFakturySuggestions(false);
  };
  
  // Select smlouva z autocomplete
  const handleSelectSmlouva = async (smlouva) => {
    try {
      // Načíst detail smlouvy pro dodavatele
      const detail = await getSmlouvaDetail({
        token,
        username,
        id: smlouva.id
      });
      
      setNewFeeData(prev => ({
        ...prev,
        smlouva_id: smlouva.id,
        smlouva_cislo: smlouva.cislo_smlouvy || '',
        dodavatel_nazev: detail.data?.nazev_firmy || smlouva.nazev_firmy || ''
      }));
      
      setSmlouvySearch(smlouva.cislo_smlouvy || '');
      setShowSmlouvySuggestions(false);
    } catch (error) {
      console.error('Chyba při načítání detailu smlouvy:', error);
      showToast('Chyba při načítání detailu smlouvy', 'error');
    }
  };
  
  // Close autocomplete při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (smlouvySearchRef.current && !smlouvySearchRef.current.contains(event.target)) {
        setShowSmlouvySuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Close faktury autocomplete při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fakturySearchRef.current && !fakturySearchRef.current.contains(event.target)) {
        setShowFakturySuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // CREATE handler
  const handleCreateAnnualFee = async () => {
    // Validace
    if (!newFeeData.smlouva_id && !newFeeData.dodavatel_nazev.trim()) {
      showToast('Vyberte smlouvu nebo vyplňte dodavatele', 'error');
      return;
    }
    if (!newFeeData.nazev.trim()) {
      showToast('Vyplňte název', 'error');
      return;
    }
    if (!newFeeData.druh) {
      showToast('Vyberte druh poplatku', 'error');
      return;
    }
    if (!newFeeData.platba) {
      showToast('Vyberte typ platby', 'error');
      return;
    }
    
    // Očistit částku od formátování (mezery, čárky)
    const castkaStr = (newFeeData.castka || '').toString().trim();
    const cleanCastka = castkaStr.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsedCastka = parseFloat(cleanCastka);
    
    console.log('🔍 DEBUG CREATE:', {
      originalCastka: newFeeData.castka,
      castkaStr,
      cleanCastka,
      parsedCastka,
      isNaN: isNaN(parsedCastka),
      typeof: typeof parsedCastka
    });
    
    if (!castkaStr || castkaStr === '' || isNaN(parsedCastka) || parsedCastka <= 0) {
      showToast('Vyplňte platnou částku (musí být větší než 0)', 'error');
      console.error('❌ Validace částky selhala');
      return;
    }
    
    // Zaokrouhlení na 2 desetinná místa pro konzistenci
    const celkovaCastka = Math.round(parsedCastka * 100) / 100;
    
    // 🔔 Vygenerovat položky a zobrazit modal pro potvrzení
    const polozky = generatePolozkyLocal(
      newFeeData.platba,
      newFeeData.rok,
      celkovaCastka,
      newFeeData.datum_prvni_splatnosti
    );
    
    setGeneratedPolozky(polozky);
    setPendingFeeData({
      smlouva_id: newFeeData.smlouva_id,
      dodavatel_nazev: newFeeData.dodavatel_nazev,
      nazev: newFeeData.nazev,
      poznamka: newFeeData.poznamka,
      druh: newFeeData.druh,
      platba: newFeeData.platba,
      celkova_castka: celkovaCastka,
      rok: newFeeData.rok,
      datum_prvni_splatnosti: newFeeData.datum_prvni_splatnosti
    });
    setIsCreating(true);
    setShowPolozkyModal(true);
  };
  
  // UPDATE item handler
  const handleUpdateItem = async (itemId, data) => {
    try {
      const response = await updateAnnualFeeItem({
        token,
        username,
        id: itemId,
        data
      });
      
      if (response.status === 'success') {
        showToast('Položka aktualizována', 'success');
        
        // Najít ID hlavičky pro refresh
        const fee = annualFees.find(f => f.polozky && f.polozky.some(item => item.id === itemId));
        
        if (fee) {
          // Načíst aktualizovaný detail s přepočítanými hodnotami z BE
          const detail = await getAnnualFeeDetail({
            token,
            username,
            id: fee.id
          });
          
          if (detail.data) {
            // ✅ Aktualizovat celou hlavičku + položky z BE (má správné přepočítané hodnoty)
            // Vypočítat pocet_zaplaceno z položek
            const pocet_zaplaceno = (detail.data.polozky || []).filter(item => item.stav === 'ZAPLACENO').length;
            
            setAnnualFees(prev => prev.map(f => 
              f.id === fee.id ? { ...f, ...detail.data, polozky: detail.data.polozky, pocet_zaplaceno } : f
            ));
          }
        }
      }
    } catch (error) {
      console.error('Chyba při aktualizaci položky:', error);
      showToast(error.message || 'Chyba při aktualizaci položky', 'error');
    }
  };
  
  // State pro confirm dialog
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ isOpen: false, feeId: null, feeName: '' });
  
  // DELETE handler - otevře confirm dialog
  const handleDeleteFee = (id, name) => {
    setDeleteConfirmDialog({
      isOpen: true,
      feeId: id,
      feeName: name || 'Roční poplatek'
    });
  };
  
  // Potvrzeno smazání
  const handleConfirmDelete = async () => {
    const { feeId } = deleteConfirmDialog;
    setDeleteConfirmDialog({ isOpen: false, feeId: null, feeName: '' });
    
    try {
      const response = await deleteAnnualFee({
        token,
        username,
        id: feeId
      });
      
      if (response.status === 'success') {
        showToast('Roční poplatek smazán', 'success');
        loadAnnualFees();
      }
    } catch (error) {
      console.error('Chyba při mazání poplatku:', error);
      showToast(error.message || 'Chyba při mazání poplatku', 'error');
    }
  };
  
  // Editace hlavního řádku (fee)
  const handleStartEditFee = (fee) => {
    console.log('📝 Start edit fee:', fee);
    console.log('📊 Druhy:', druhy);
    console.log('📊 Platby:', platby);
    setEditingFeeId(fee.id);
    setEditFeeData({
      nazev: fee.nazev,
      poznamka: fee.poznamka || '',
      celkova_castka: fee.celkova_castka,
      druh: fee.druh,
      platba: fee.platba,
      rok: fee.rok
    });
  };
  
  const handleCancelEditFee = () => {
    setEditingFeeId(null);
    setEditFeeData({});
  };
  
  const handleSaveEditFee = async (feeId) => {
    try {
      // Očistit celkovou částku od formátování
      const cleanData = {...editFeeData};
      if (cleanData.celkova_castka) {
        const castkaStr = cleanData.celkova_castka.toString().trim();
        const cleanCastka = castkaStr.replace(/[^\d,.-]/g, '').replace(',', '.');
        cleanData.celkova_castka = parseFloat(cleanCastka);
      }
      
      // Najít původní fee pro porovnání
      const originalFee = annualFees.find(f => f.id === feeId);
      const platbaChanged = cleanData.platba && cleanData.platba !== originalFee.platba;
      const castkaChanged = cleanData.celkova_castka && cleanData.celkova_castka !== originalFee.celkova_castka;

      // 🔔 Pokud se změnila platba nebo částka, zobrazit modal pro úpravu položek
      if (platbaChanged || castkaChanged) {
        // Pro UPDATE mode: použít existující položky místo generování nových
        const existingPolozky = originalFee.polozky || [];
        
        let polozky;
        if (platbaChanged) {
          // Pokud se změnila platba, vygenerovat nové položky
          polozky = generatePolozkyLocal(
            cleanData.platba || originalFee.platba,
            cleanData.rok || originalFee.rok,
            cleanData.celkova_castka || originalFee.celkova_castka,
            originalFee.datum_prvni_splatnosti || `${originalFee.rok}-01-01`
          );
        } else {
          // Pouze se změnila částka - zachovat existující položky a přepočítat částky
          const novaCastka = cleanData.celkova_castka || originalFee.celkova_castka;
          polozky = existingPolozky.map(polozka => ({
            ...polozka,
            castka: novaCastka / existingPolozky.length
          }));
        }
        
        setGeneratedPolozky(polozky);
        setPendingFeeData({
          ...cleanData,
          id: feeId
        });
        setIsCreating(false);
        setShowPolozkyModal(true);
      } else {
        // Žádná změna položek - uložit rovnou
        const response = await updateAnnualFee({
          token,
          username,
          id: feeId,
          data: cleanData
        });
        
        if (response.status === 'success') {
          showToast('Roční poplatek aktualizován', 'success');
          setEditingFeeId(null);
          setEditFeeData({});
          loadAnnualFees();
        }
      }
    } catch (error) {
      console.error('Chyba při aktualizaci poplatku:', error);
      showToast(error.message || 'Chyba při aktualizaci poplatku', 'error');
    }
  };
  
  // 🔔 Finální potvrzení z modalu - vytvoří/aktualizuje hlavní řádek + položky
  const handleConfirmPolozky = async () => {
    try {
      if (isCreating) {
        // CREATE - vytvořit nový roční poplatek
        const dataToSend = {
          token,
          username,
          ...pendingFeeData,
          polozky: generatedPolozky // Posíláme upravené položky
        };
        
        // 🔧 DEBUG: Výpis request payload do console
        console.group('🔧 [DEBUG] Annual Fees CREATE Request');
        console.log('📤 Data posílaná na backend:', dataToSend);
        console.log('📋 Položky z modal dialogu:', generatedPolozky);
        console.log('📄 Pending fee data:', pendingFeeData);
        console.log('🔍 Klíče v dataToSend:', Object.keys(dataToSend));
        console.log('💰 celkova_castka:', dataToSend.celkova_castka, typeof dataToSend.celkova_castka);
        console.log('👤 token a username:', { token: dataToSend.token, username: dataToSend.username });
        console.groupEnd();
        
        const response = await createAnnualFee(dataToSend);
        
        if (response.status === 'success') {
          showToast('Roční poplatek vytvořen', 'success');
          
          // Reset form
          setNewFeeData({
            smlouva_id: null,
            smlouva_cislo: '',
            dodavatel_nazev: '',
            nazev: '',
            poznamka: '',
            druh: 'JINE',
            platba: 'MESICNI',
            castka: '',
            rok: new Date().getFullYear(),
            datum_prvni_splatnosti: `${new Date().getFullYear()}-01-01`
          });
          setSmlouvySearch('');
          setShowNewRow(false);
          setShowPolozkyModal(false);
          setGeneratedPolozky([]);
          setPendingFeeData(null);
          
          // Reload list
          loadAnnualFees();
        }
      } else {
        // UPDATE - aktualizovat existující roční poplatek
        const dataToUpdate = {
          token,
          username,
          id: pendingFeeData.id,
          data: {
            ...pendingFeeData,
            polozky: generatedPolozky // Posíláme upravené položky
          }
        };
        
        // 🔧 DEBUG: Výpis request payload do console
        console.group('🔧 [DEBUG] Annual Fees UPDATE Request');
        console.log('📤 Data posílaná na backend:', dataToUpdate);
        console.log('📋 Položky z modal dialogu:', generatedPolozky);
        console.log('📄 Pending fee data:', pendingFeeData);
        console.groupEnd();
        
        const response = await updateAnnualFee(dataToUpdate);
        
        if (response.status === 'success') {
          showToast('Roční poplatek aktualizován', 'success');
          setEditingFeeId(null);
          setEditFeeData({});
          setShowPolozkyModal(false);
          setGeneratedPolozky([]);
          setPendingFeeData(null);
          loadAnnualFees();
        }
      }
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      showToast(error.message || 'Chyba při ukládání', 'error');
    }
  };
  
  const getInvoiceStatusText = (status) => {
    switch(status) {
      case 'ZAPLACENO': return 'Zaplaceno';
      case 'VECNA_SPRAVNOST': return 'Věcná správnost';
      case 'K_ZAPLACENI': return 'K zaplacení';
      case 'PREDANA_PO': return 'Předána PO';
      case 'V_RESENI': return 'V řešení';
      case 'ZAEVIDOVANA': return 'Zaevidována';
      case 'STORNO': return 'Storno';
      default: return status || '-';
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('cs-CZ');
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={faMoneyBill} />
          Evidence ročních poplatků
          <span className="beta-badge">BETA</span>
        </PageTitle>
        {/* II. Tlačítko přesunuto do tabulky jako inline řádek */}
      </PageHeader>
      
      <FiltersBar>
        <FilterGroup>
          <FilterLabel>Rok</FilterLabel>
          <Select 
            value={filters.rok} 
            onChange={(e) => handleFilterChange('rok', e.target.value)}
          >
            <option key="2026" value="2026">2026</option>
            <option key="2025" value="2025">2025</option>
            <option key="2024" value="2024">2024</option>
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Druh</FilterLabel>
          <Select 
            value={filters.druh} 
            onChange={(e) => handleFilterChange('druh', e.target.value)}
          >
            <option key="all" value="all">Vše</option>
            {druhy.map(d => (
              <option key={d.kod_stavu} value={d.kod_stavu}>{d.nazev_stavu}</option>
            ))}
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Typ platby</FilterLabel>
          <Select 
            value={filters.platba} 
            onChange={(e) => handleFilterChange('platba', e.target.value)}
          >
            <option key="all" value="all">Vše</option>
            {platby.map(p => (
              <option key={p.kod_stavu} value={p.kod_stavu}>{p.nazev_stavu}</option>
            ))}
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Stav</FilterLabel>
          <Select 
            value={filters.stav} 
            onChange={(e) => handleFilterChange('stav', e.target.value)}
          >
            <option key="all" value="all">Vše</option>
            {stavy.map(s => (
              <option key={s.kod_stavu} value={s.kod_stavu}>{s.nazev_stavu}</option>
            ))}
          </Select>
        </FilterGroup>
        
        <FilterGroup style={{ flex: 1 }}>
          <FilterLabel>Hledat smlouvu</FilterLabel>
          <SearchInput 
            type="text"
            placeholder="Číslo smlouvy nebo dodavatel..."
            value={filters.smlouva}
            onChange={(e) => handleFilterChange('smlouva', e.target.value)}
          />
        </FilterGroup>
      </FiltersBar>
      
      <TableContainer>
        {loading ? (
          <LoadingState>
            <div className="spinner"></div>
            <p>Načítání ročních poplatků...</p>
          </LoadingState>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th style={{width: '50px'}}></Th>
                <Th style={{width: '70px'}}>Rok</Th>
                <Th>Smlouva</Th>
                <Th>Dodavatel</Th>
                <Th>Název</Th>
                <Th>Druh / Platba</Th>
                <Th>Celková částka</Th>
                <Th>Zaplaceno</Th>
                <Th>Zbývá</Th>
                <Th>Položky</Th>
                <Th style={{textAlign: 'center'}}>Stav</Th>
                <Th>Zpracovatel</Th>
                <Th>Poznámka</Th>
                <Th style={{textAlign: 'center'}}>Akce</Th>
              </tr>
            </Thead>
            <Tbody>
              {/* II. Inline řádek pro vytvoření nového ročního poplatku */}
              {!showNewRow ? (
                <NewRowTr>
                  <Td colSpan="14" style={{textAlign: 'center', padding: '12px'}}>
                    <NewRowButton onClick={() => setShowNewRow(true)}>
                      <FontAwesomeIcon icon={faPlus} />
                      Nový roční poplatek
                    </NewRowButton>
                  </Td>
                </NewRowTr>
              ) : (
                <NewRowTr>
                  <Td colSpan="2">
                    <InlineSelect
                      value={newFeeData.rok}
                      onChange={(e) => setNewFeeData(prev => ({...prev, rok: parseInt(e.target.value)}))}
                      style={{textAlign: 'right'}}
                    >
                      {Array.from({length: new Date().getFullYear() - 2026 + 1}, (_, i) => 2026 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </InlineSelect>
                  </Td>
                  <Td>
                    <SuggestionsWrapper ref={smlouvySearchRef}>
                      <InlineInput 
                        placeholder="Smlouva # (min 3 znaky)" 
                        value={smlouvySearch}
                        onChange={(e) => setSmlouvySearch(e.target.value)}
                        onFocus={() => smlouvySearch.length >= 3 && setShowSmlouvySuggestions(true)}
                        style={{paddingRight: smlouvySearch ? '2rem' : '0.5rem'}}
                      />
                      {smlouvySearch && (
                        <ClearButton
                          type="button"
                          onClick={() => {
                            setSmlouvySearch('');
                            setNewFeeData(prev => ({
                              ...prev,
                              smlouva_id: null,
                              smlouva_cislo: ''
                            }));
                            setShowSmlouvySuggestions(false);
                          }}
                          title="Vymazat smlouvu"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{fontSize: '0.875rem'}} />
                        </ClearButton>
                      )}
                      {showSmlouvySuggestions && smlouvySuggestions.length > 0 && (
                        <SuggestionsDropdown>
                          {isSearching && (
                            <SuggestionItem style={{textAlign: 'center', color: '#9ca3af'}}>
                              <FontAwesomeIcon icon={faSpinner} spin /> Vyhledávání...
                            </SuggestionItem>
                          )}
                          {!isSearching && smlouvySuggestions.map(smlouva => (
                            <SuggestionItem key={smlouva.id} onClick={() => handleSelectSmlouva(smlouva)}>
                              <SuggestionTitle>
                                <SuggestionBadge $color="#10b981" $textColor="white">SML</SuggestionBadge>
                                {smlouva.cislo_smlouvy}
                                {smlouva.hodnota_s_dph && (
                                  <SuggestionBadge $color="#fef3c7" $textColor="#92400e">
                                    {parseFloat(smlouva.hodnota_s_dph).toLocaleString('cs-CZ')} Kč
                                  </SuggestionBadge>
                                )}
                              </SuggestionTitle>
                              <SuggestionDetail>
                                {smlouva.nazev_smlouvy && <span><strong>Název:</strong> {smlouva.nazev_smlouvy}</span>}
                                {smlouva.nazev_firmy && (
                                  <span>
                                    <strong>{smlouva.nazev_firmy}</strong>
                                    {smlouva.ico && ` (IČO: ${smlouva.ico})`}
                                  </span>
                                )}
                              </SuggestionDetail>
                            </SuggestionItem>
                          ))}
                        </SuggestionsDropdown>
                      )}
                      {showSmlouvySuggestions && !isSearching && smlouvySearch.length >= 3 && smlouvySuggestions.length === 0 && (
                        <SuggestionsDropdown>
                          <SuggestionItem style={{textAlign: 'center', color: '#9ca3af'}}>
                            Žádné smlouvy nenalezeny
                          </SuggestionItem>
                        </SuggestionsDropdown>
                      )}
                    </SuggestionsWrapper>
                  </Td>
                  <Td>
                    <div style={{position: 'relative'}}>
                      <InlineInput 
                        placeholder={newFeeData.smlouva_id ? "Dodavatel (ze smlouvy)" : "Dodavatel (vyplňte ručně)"}
                        value={newFeeData.dodavatel_nazev}
                        onChange={(e) => setNewFeeData(prev => ({...prev, dodavatel_nazev: e.target.value}))}
                        disabled={!!newFeeData.smlouva_id}
                        style={{
                          background: newFeeData.smlouva_id ? '#f9fafb' : 'white',
                          paddingRight: (newFeeData.dodavatel_nazev && !newFeeData.smlouva_id) ? '2rem' : '0.5rem'
                        }}
                      />
                      {newFeeData.dodavatel_nazev && !newFeeData.smlouva_id && (
                        <ClearButton
                          type="button"
                          onClick={() => setNewFeeData(prev => ({...prev, dodavatel_nazev: ''}))}
                          title="Vymazat dodavatele"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{fontSize: '0.875rem'}} />
                        </ClearButton>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div style={{position: 'relative'}}>
                      <InlineInput 
                        placeholder="Název ročního poplatku" 
                        value={newFeeData.nazev}
                        onChange={(e) => setNewFeeData(prev => ({...prev, nazev: e.target.value}))}
                        style={{paddingRight: newFeeData.nazev ? '2rem' : '0.5rem'}}
                      />
                      {newFeeData.nazev && (
                        <ClearButton
                          type="button"
                          onClick={() => setNewFeeData(prev => ({...prev, nazev: ''}))}
                          title="Vymazat název"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{fontSize: '0.875rem'}} />
                        </ClearButton>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <InlineSelect 
                      value={newFeeData.druh}
                      onChange={(e) => setNewFeeData(prev => ({...prev, druh: e.target.value}))}
                      style={{marginBottom: '4px'}}
                    >
                      {druhy.map(d => (
                        <option key={d.kod_stavu} value={d.kod_stavu}>{d.nazev_stavu}</option>
                      ))}
                    </InlineSelect>
                    <InlineSelect 
                      value={newFeeData.platba}
                      onChange={(e) => setNewFeeData(prev => ({...prev, platba: e.target.value}))}
                    >
                      {platby.map(p => (
                        <option key={p.kod_stavu} value={p.kod_stavu}>
                          {p.nazev_stavu} {p.pocet_polozek && `(${p.pocet_polozek}x)`}
                        </option>
                      ))}
                    </InlineSelect>
                  </Td>
                  <Td>
                    <CurrencyInputWrapper>
                      <InlineInput 
                        placeholder="Celková částka" 
                        type="text" 
                        value={newFeeData.castka}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Povolit pouze číslice, čárku, tečku, mezery a mínus
                          const cleaned = value.replace(/[^\d,.\s-]/g, '');
                          setNewFeeData(prev => ({...prev, castka: cleaned}));
                        }}
                        onBlur={(e) => {
                          // Při blur formátovat hodnotu
                          const cleanValue = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.');
                          const numValue = parseFloat(cleanValue);
                          if (!isNaN(numValue)) {
                            const formatted = formatCurrency(numValue);
                            setNewFeeData(prev => ({...prev, castka: formatted}));
                          }
                        }}
                        onFocus={(e) => {
                          // Při focus odstranit formátování pro snadnější editaci
                          const cleanValue = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.');
                          const numValue = parseFloat(cleanValue);
                          if (!isNaN(numValue)) {
                            setNewFeeData(prev => ({...prev, castka: numValue.toFixed(2)}));
                          }
                        }}
                        style={{
                          paddingRight: newFeeData.castka ? '65px' : '40px',
                          textAlign: 'right'
                        }}
                      />
                      <CurrencySymbol>Kč</CurrencySymbol>
                    </CurrencyInputWrapper>
                  </Td>
                  <Td colSpan="5"></Td>
                  <Td>
                    <div style={{position: 'relative'}}>
                      <InlineInput
                        placeholder="Poznámka..."
                        value={newFeeData.poznamka}
                        onChange={(e) => setNewFeeData(prev => ({...prev, poznamka: e.target.value}))}
                        style={{
                          fontSize: '0.85rem',
                          paddingRight: newFeeData.poznamka ? '2rem' : '0.5rem'
                        }}
                      />
                      {newFeeData.poznamka && (
                        <ClearButton
                          type="button"
                          onClick={() => setNewFeeData(prev => ({...prev, poznamka: ''}))}
                          title="Vymazat poznámku"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{fontSize: '0.875rem'}} />
                        </ClearButton>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                      <Button 
                        variant="primary" 
                        style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto'}}
                        onClick={handleCreateAnnualFee}
                        title="Uložit"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => { setShowNewRow(false); setSmlouvySearch(''); setShowSmlouvySuggestions(false); }} 
                        style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', color: '#ef4444', borderColor: '#ef4444'}}
                        title="Zrušit"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </Button>
                    </div>
                  </Td>
                </NewRowTr>
              )}
              
              {/* Existující řádky */}
              {annualFees.map(fee => {
                const isEditingFee = editingFeeId === fee.id;
                const hasZaplaceno = fee.pocet_zaplaceno > 0;
                return (
                <React.Fragment key={fee.id}>
                  <Tr clickable={!isEditingFee} onClick={() => !isEditingFee && toggleRow(fee.id)}>
                    <Td>
                      {!isEditingFee && (
                        <ExpandButton title={expandedRows.has(fee.id) ? 'Sbalit' : 'Rozbalit'}>
                          <FontAwesomeIcon icon={expandedRows.has(fee.id) ? faMinus : faPlus} />
                        </ExpandButton>
                      )}
                    </Td>
                    <Td>
                      {isEditingFee ? (
                        <InlineSelect
                          value={editFeeData.rok || new Date().getFullYear()}
                          onChange={(e) => setEditFeeData(prev => ({...prev, rok: parseInt(e.target.value)}))}
                        >
                          {Array.from({length: new Date().getFullYear() - 2026 + 1}, (_, i) => 2026 + i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </InlineSelect>
                      ) : (
                        <strong>{fee.rok}</strong>
                      )}
                    </Td>
                    <Td><strong>{fee.smlouva_cislo}</strong></Td>
                    <Td>{fee.dodavatel_nazev}</Td>
                    <Td>
                      {isEditingFee ? (
                        <InlineInput
                          value={editFeeData.nazev || ''}
                          onChange={(e) => setEditFeeData(prev => ({...prev, nazev: e.target.value}))}
                          style={{fontSize: '0.85rem'}}
                          placeholder="Název"
                        />
                      ) : (
                        fee.nazev
                      )}
                    </Td>
                    <Td>
                      {isEditingFee ? (
                        <>
                          <InlineSelect
                            value={editFeeData.druh || ''}
                            onChange={(e) => setEditFeeData(prev => ({...prev, druh: e.target.value}))}
                            style={{fontSize: '0.85rem', marginBottom: '4px'}}
                          >
                            <option value="">Vyberte druh</option>
                            {druhy.map(d => (
                              <option key={d.kod_stavu || d.kod} value={d.kod_stavu || d.kod}>{d.nazev_stavu || d.nazev}</option>
                            ))}
                          </InlineSelect>
                          <InlineSelect
                            value={editFeeData.platba || ''}
                            onChange={(e) => setEditFeeData(prev => ({...prev, platba: e.target.value}))}
                            style={{fontSize: '0.85rem'}}
                          >
                            <option value="">Vyberte platbu</option>
                            {platby.map(p => (
                              <option key={p.kod_stavu || p.kod} value={p.kod_stavu || p.kod}>{p.nazev_stavu || p.nazev}</option>
                            ))}
                          </InlineSelect>
                        </>
                      ) : (
                        <>
                          <div>{fee.druh_nazev}</div>
                          <div style={{fontSize: '0.85rem', color: '#9ca3af'}}>{fee.platba_nazev}</div>
                        </>
                      )}
                    </Td>
                    <Td style={{textAlign: 'right'}}>
                      {isEditingFee ? (
                        <CurrencyInput
                          value={editFeeData.celkova_castka || ''}
                          onChange={(val) => setEditFeeData(prev => ({...prev, celkova_castka: val}))}
                        />
                      ) : (
                        <>
                          <strong>{formatCurrency(fee.celkova_castka)} Kč</strong>
                          {fee.pocet_polozek > 0 && fee.stav !== 'ZAPLACENO' && (
                            <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '2px'}}>
                              {formatCurrency(fee.celkova_castka / fee.pocet_polozek)} Kč/{fee.platba === 'MESICNI' ? 'měsíc' : fee.platba === 'KVARTALNI' ? 'Q' : 'rok'}
                            </div>
                          )}
                        </>
                      )}
                    </Td>
                    <Td style={{color: '#10b981', textAlign: 'right'}}>{formatCurrency(fee.zaplaceno_celkem)} Kč</Td>
                    <Td style={{color: '#ef4444', textAlign: 'right'}}>{formatCurrency(fee.zbyva_zaplatit)} Kč</Td>
                    <Td>
                      {fee.pocet_zaplaceno}/{fee.pocet_polozek}
                    </Td>
                    <Td style={{textAlign: 'center'}}>
                      <StatusBadge status={fee.stav}>
                        {fee.stav === 'ZAPLACENO' && <FontAwesomeIcon icon={faCheckCircle} />}
                        {fee.stav === 'V_RESENI' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                        {fee.stav_nazev}
                      </StatusBadge>
                    </Td>
                    <Td style={{fontSize: '0.75rem', color: '#1f2937', lineHeight: '1.3'}}>
                      {fee.aktualizoval_jmeno || fee.vytvoril_jmeno || fee.dt_aktualizace || fee.dt_vytvoreni ? (
                        <div>
                          <div>
                            {fee.aktualizoval_jmeno ? (
                              `${fee.aktualizoval_jmeno} ${fee.aktualizoval_prijmeni || ''}`
                            ) : fee.vytvoril_jmeno ? (
                              `${fee.vytvoril_jmeno} ${fee.vytvoril_prijmeni || ''}`
                            ) : ''}
                          </div>
                          <div>{formatDate(fee.dt_aktualizace || fee.dt_vytvoreni)}</div>
                        </div>
                      ) : (
                        <span style={{color: '#9ca3af'}}>-</span>
                      )}
                    </Td>
                    <Td style={{fontSize: '0.85rem', color: '#6b7280'}}>
                      {isEditingFee ? (
                        <InlineInput
                          value={editFeeData.poznamka || ''}
                          onChange={(e) => setEditFeeData(prev => ({...prev, poznamka: e.target.value}))}
                          style={{fontSize: '0.85rem'}}
                          placeholder="Poznámka"
                        />
                      ) : (
                        fee.poznamka ? (
                          <div style={{color: '#6b7280'}}>💬 {fee.poznamka}</div>
                        ) : '-'
                      )}
                    </Td>
                    <Td>
                      <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                        {isEditingFee ? (
                          <>
                            <Button 
                              variant="secondary" 
                              style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', background: '#10b981', color: 'white', borderColor: '#10b981'}}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEditFee(fee.id);
                              }}
                              title="Uložit změny"
                            >
                              <FontAwesomeIcon icon={faCheckCircle} />
                            </Button>
                            <Button 
                              variant="secondary" 
                              style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', color: '#ef4444', borderColor: '#ef4444'}}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEditFee();
                              }}
                              title="Zrušit"
                            >
                              <FontAwesomeIcon icon={faMinus} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="secondary" 
                              style={{
                                padding: '6px 10px', 
                                fontSize: '0.85rem', 
                                minWidth: 'auto',
                                opacity: hasZaplaceno ? 0.5 : 1,
                                cursor: hasZaplaceno ? 'not-allowed' : 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!hasZaplaceno) {
                                  handleStartEditFee(fee);
                                }
                              }}
                              disabled={hasZaplaceno}
                              title={hasZaplaceno ? 'Nelze editovat - již jsou zaplacené položky' : 'Upravit roční poplatek'}
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </Button>
                            <Button 
                              variant="secondary" 
                              style={{
                                padding: '6px 10px', 
                                fontSize: '0.85rem', 
                                minWidth: 'auto', 
                                color: '#ef4444', 
                                borderColor: '#ef4444',
                                opacity: hasZaplaceno ? 0.5 : 1,
                                cursor: hasZaplaceno ? 'not-allowed' : 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!hasZaplaceno) {
                                  handleDeleteFee(fee.id, fee.nazev);
                                }
                              }}
                              disabled={hasZaplaceno}
                              title={hasZaplaceno ? 'Nelze smazat - již jsou zaplacené položky' : 'Smazat roční poplatek'}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </Button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                  
                  {expandedRows.has(fee.id) && fee.polozky && (
                    <SubItemsContainer>
                      {/* Prázdné buňky pro odsazení - zarovnání pod sloupec "Název" */}
                      <Td style={{border: 'none', background: '#f9fafb'}}></Td>
                      <Td style={{border: 'none', background: '#f9fafb'}}></Td>
                      <Td style={{border: 'none', background: '#f9fafb'}}></Td>
                      <Td style={{border: 'none', background: '#f9fafb'}}></Td>
                      <SubItemsWrapper colSpan="10">
                        <SubItemsTable>
                          <thead>
                            <tr>
                              <Th indent colSpan="4" style={{background: '#f3f4f6'}}>Poznámka</Th>
                              <Th style={{background: '#f3f4f6'}}>Splatnost</Th>
                              <Th style={{background: '#f3f4f6'}}>Částka</Th>
                              <Th style={{background: '#f3f4f6', width: '140px'}}>Číslo dokladu</Th>
                              <Th style={{background: '#f3f4f6', width: '130px'}}>Zaplaceno</Th>
                              <Th style={{background: '#f3f4f6', textAlign: 'center'}}>Stav</Th>
                              <Th style={{background: '#f3f4f6', width: '120px', fontSize: '0.75rem'}}>Aktualizoval</Th>
                              <Th style={{background: '#f3f4f6', textAlign: 'center'}}>Akce</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {fee.polozky.map((item, itemIndex) => {
                              const isEditing = editingItemId === item.id;
                              // Kontrola, zda lze položku zaplatit (všechny předchozí musí být zaplacené)
                              const canPay = fee.polozky
                                .slice(0, itemIndex)
                                .every(prevItem => prevItem.stav === 'ZAPLACENO');
                              // Kontrola, zda lze zrušit platbu (žádná následující nesmí být zaplacená)
                              const canUndo = fee.polozky
                                .slice(itemIndex + 1)
                                .every(nextItem => nextItem.stav !== 'ZAPLACENO');
                              return (
                              <SubItemRow key={item.id}>
                                {/* Poznámka */}
                                <SubItemCell indent colSpan="4">
                                  {isEditing ? (
                                    editItemData._paymentMode ? (
                                      <strong style={{color: '#6b7280'}}>{item.nazev_polozky}</strong>
                                    ) : (
                                      <InlineInput 
                                        value={editItemData.nazev_polozky || ''}
                                        onChange={(e) => setEditItemData(prev => ({...prev, nazev_polozky: e.target.value}))}
                                        style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%'}}
                                        placeholder="Poznámka"
                                      />
                                    )
                                  ) : (
                                    <strong>{item.nazev_polozky}</strong>
                                  )}
                                </SubItemCell>
                                
                                {/* Splatnost */}
                                <SubItemCell>
                                  {isEditing ? (
                                    editItemData._paymentMode ? (
                                      <span style={{color: '#6b7280'}}>{formatDate(item.datum_splatnosti)}</span>
                                    ) : (
                                      <div style={{maxWidth: '130px'}}>
                                        <DateWithArrowContainer>
                                          <DatePicker
                                            value={editItemData.datum_splatnosti || ''}
                                            onChange={(date) => setEditItemData(prev => ({...prev, datum_splatnosti: date}))}
                                            placeholder="dd.mm.rrrr"
                                            variant="compact"
                                            style={{width: '105px'}}
                                          />
                                          <ArrowButton
                                            onClick={() => {
                                              const currentItemIndex = fee.polozky.findIndex(p => p.id === item.id);
                                              updateExistingDatesFromIndex(currentItemIndex, fee, setAnnualFees);
                                            }}
                                            title={`Aktualizovat data níže podle periody platby (${fee.periodicnost_platby})`}
                                          >
                                            <FontAwesomeIcon icon={faAngleDown} size="sm" />
                                          </ArrowButton>
                                        </DateWithArrowContainer>
                                      </div>
                                    )
                                  ) : (
                                    formatDate(item.datum_splatnosti)
                                  )}
                                </SubItemCell>
                                
                                {/* Částka */}
                                <SubItemCell>
                                  {isEditing ? (
                                    editItemData._paymentMode ? (
                                      <span style={{color: '#6b7280'}}>{formatCurrency(item.castka)} Kč</span>
                                    ) : (
                                      <div style={{maxWidth: '120px'}}>
                                        <CurrencyInput
                                          value={editItemData.castka || ''}
                                          onChange={(val) => setEditItemData(prev => ({...prev, castka: val}))}
                                          placeholder="0,00"
                                        />
                                      </div>
                                    )
                                  ) : (
                                    <>{formatCurrency(item.castka)} Kč</>
                                  )}
                                </SubItemCell>
                                
                                {/* Číslo dokladu (VEMA) */}
                                <SubItemCell>
                                  {isEditing ? (
                                    <InlineInput 
                                      value={editItemData.cislo_dokladu || ''}
                                      onChange={(e) => setEditItemData(prev => ({...prev, cislo_dokladu: e.target.value}))}
                                      style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%', maxWidth: '130px'}}
                                      placeholder="Číslo dokladu"
                                    />
                                  ) : (
                                    item.cislo_dokladu || <span style={{color: '#9ca3af'}}>-</span>
                                  )}
                                </SubItemCell>
                                
                                {/* Datum zaplaceno */}
                                <SubItemCell>
                                  {isEditing ? (
                                    editItemData._paymentMode ? (
                                      <div style={{maxWidth: '130px'}}>
                                        <DatePicker
                                          value={editItemData.datum_zaplaceno || ''}
                                          onChange={(date) => setEditItemData(prev => ({...prev, datum_zaplaceno: date}))}
                                          placeholder="dd.mm.rrrr"
                                          variant="compact"
                                        />
                                      </div>
                                    ) : (
                                      <span style={{color: '#9ca3af'}}>-</span>
                                    )
                                  ) : (
                                    formatDate(item.datum_zaplaceno)
                                  )}
                                </SubItemCell>
                                
                                {/* Stav */}
                                <SubItemCell style={{textAlign: 'center'}}>
                                  <StatusBadge status={item.stav} style={{fontSize: '0.85rem'}}>
                                    {item.stav === 'ZAPLACENO' ? (
                                      <><FontAwesomeIcon icon={faCheckCircle} /> Zaplaceno</>
                                    ) : 'Nezaplaceno'}
                                  </StatusBadge>
                                </SubItemCell>
                                
                                {/* Aktualizoval - jméno + datum na dva řádky */}
                                <SubItemCell style={{fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.3'}}>
                                  {item.aktualizoval_jmeno || item.dt_aktualizace ? (
                                    <div>
                                      <div>{item.aktualizoval_jmeno} {item.aktualizoval_prijmeni}</div>
                                      <div>{formatDate(item.dt_aktualizace)}</div>
                                    </div>
                                  ) : (
                                    <span style={{color: '#9ca3af'}}>-</span>
                                  )}
                                </SubItemCell>
                                
                                {/* Akce */}
                                <SubItemCell>
                                  <div style={{display: 'flex', gap: '6px', justifyContent: 'flex-end'}}>
                                    {isEditing ? (
                                      <>
                                        <Button 
                                          variant="secondary" 
                                          style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', background: '#10b981', color: 'white', borderColor: '#10b981'}}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveEditItem(item.id);
                                          }}
                                          title="Uložit změny"
                                        >
                                          <FontAwesomeIcon icon={faCheckCircle} />
                                        </Button>
                                        <Button 
                                          variant="secondary" 
                                          style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', color: '#ef4444', borderColor: '#ef4444'}}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelEditItem();
                                          }}
                                          title="Zrušit"
                                        >
                                          <FontAwesomeIcon icon={faMinus} />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        {item.stav === 'ZAPLACENO' ? (
                                          <Button 
                                            variant="secondary" 
                                            style={{
                                              padding: '6px 10px', 
                                              fontSize: '0.85rem', 
                                              minWidth: 'auto', 
                                              background: canUndo ? '#f59e0b' : '#9ca3af', 
                                              color: 'white', 
                                              borderColor: canUndo ? '#f59e0b' : '#9ca3af',
                                              opacity: canUndo ? 1 : 0.6,
                                              cursor: canUndo ? 'pointer' : 'not-allowed'
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!canUndo) return;
                                              handleUpdateItem(item.id, { 
                                                stav: 'NEZAPLACENO', 
                                                datum_zaplaceni: null,
                                                datum_zaplaceno: null,
                                                faktura_id: null
                                              });
                                            }}
                                            title={canUndo ? 'Vrátit na nezaplaceno' : 'Nejdříve zrušte platbu u následujících položek'}
                                            disabled={!canUndo}
                                          >
                                            <FontAwesomeIcon icon={faUndo} />
                                          </Button>
                                        ) : (
                                          <Button 
                                            variant="secondary" 
                                            style={{
                                              padding: '6px 10px', 
                                              fontSize: '0.85rem', 
                                              minWidth: 'auto', 
                                              background: canPay ? '#10b981' : '#9ca3af', 
                                              color: 'white', 
                                              borderColor: canPay ? '#10b981' : '#9ca3af',
                                              opacity: canPay ? 1 : 0.6,
                                              cursor: canPay ? 'pointer' : 'not-allowed'
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!canPay) return;
                                              // Otevřít edit režim s příznakem, že chceme zaplatit
                                              const itemForPayment = {...item, _paymentMode: true};
                                              handleStartEditItem(itemForPayment);
                                            }}
                                            title={canPay ? 'Označit jako zaplaceno' : 'Nejdříve zaplaťte předchozí položky'}
                                            disabled={!canPay}
                                          >
                                            <FontAwesomeIcon icon={faMoneyBill} />
                                          </Button>
                                        )}
                                        <Button 
                                          variant="secondary" 
                                          style={{
                                            padding: '6px 10px', 
                                            fontSize: '0.85rem', 
                                            minWidth: 'auto',
                                            opacity: item.stav === 'ZAPLACENO' ? 0.4 : 1,
                                            cursor: item.stav === 'ZAPLACENO' ? 'not-allowed' : 'pointer'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.stav !== 'ZAPLACENO') {
                                              handleStartEditItem(item);
                                            }
                                          }}
                                          title={item.stav === 'ZAPLACENO' ? 'Pro editaci nejdříve zrušte zaplacení' : 'Upravit položku'}
                                          disabled={item.stav === 'ZAPLACENO'}
                                        >
                                          <FontAwesomeIcon icon={faEdit} />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </SubItemCell>
                              </SubItemRow>
                              );
                            })}
                            
                            {/* Řádek pro přidání nové položky */}
                            {addingItemToFeeId === fee.id && (
                              <SubItemRow>
                                {/* Poznámka */}
                                <SubItemCell indent colSpan="4">
                                  <InlineInput 
                                    value={newItemData.nazev_polozky || ''}
                                    onChange={(e) => setNewItemData(prev => ({...prev, nazev_polozky: e.target.value}))}
                                    style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%'}}
                                    placeholder="Poznámka"
                                  />
                                </SubItemCell>
                                
                                {/* Splatnost */}
                                <SubItemCell>
                                  <div style={{maxWidth: '130px'}}>
                                    <DatePicker
                                      value={newItemData.datum_splatnosti || ''}
                                      onChange={(date) => setNewItemData(prev => ({...prev, datum_splatnosti: date}))}
                                      placeholder="Vyberte datum"
                                      variant="compact"
                                    />
                                  </div>
                                </SubItemCell>
                                
                                {/* Částka */}
                                <SubItemCell>
                                  <div style={{maxWidth: '120px'}}>
                                    <CurrencyInput
                                      value={newItemData.castka || ''}
                                      onChange={(val) => setNewItemData(prev => ({...prev, castka: val}))}
                                      placeholder="0,00"
                                    />
                                  </div>
                                </SubItemCell>
                                
                                {/* Číslo dokladu (VEMA) */}
                                <SubItemCell>
                                  <InlineInput 
                                    value={newItemData.cislo_dokladu || ''}
                                    onChange={(e) => setNewItemData(prev => ({...prev, cislo_dokladu: e.target.value}))}
                                    style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%', maxWidth: '130px'}}
                                    placeholder="Číslo dokladu"
                                  />
                                </SubItemCell>
                                
                                {/* Datum zaplaceno */}
                                <SubItemCell>
                                  <div style={{maxWidth: '130px'}}>
                                    <DatePicker
                                      value={newItemData.datum_zaplaceno || ''}
                                      onChange={(date) => setNewItemData(prev => ({...prev, datum_zaplaceno: date}))}
                                      placeholder="dd.mm.rrrr"
                                      variant="compact"
                                    />
                                  </div>
                                </SubItemCell>
                                
                                {/* Stav */}
                                <SubItemCell>
                                  <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>Nová</span>
                                </SubItemCell>
                                
                                {/* Akce */}
                                <SubItemCell>
                                  <div style={{display: 'flex', gap: '6px', justifyContent: 'flex-start'}}>
                                    <Button 
                                      variant="secondary" 
                                      style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', background: '#10b981', color: 'white', borderColor: '#10b981'}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveNewItem(fee.id);
                                      }}
                                      title="Uložit novou položku"
                                    >
                                      <FontAwesomeIcon icon={faCheckCircle} />
                                    </Button>
                                    <Button 
                                      variant="secondary" 
                                      style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', color: '#ef4444', borderColor: '#ef4444'}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelAddItem();
                                      }}
                                      title="Zrušit"
                                    >
                                      <FontAwesomeIcon icon={faMinus} />
                                    </Button>
                                  </div>
                                </SubItemCell>
                              </SubItemRow>
                            )}
                          </tbody>
                        </SubItemsTable>
                        
                        {/* Tlačítko pro přidání další položky */}
                        {addingItemToFeeId !== fee.id && (
                          <NewRowButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartAddItem(fee.id);
                            }}
                            style={{marginTop: '8px'}}
                          >
                            <FontAwesomeIcon icon={faPlus} style={{marginRight: '8px'}} />
                            Přidat další položku
                          </NewRowButton>
                        )}
                      </SubItemsWrapper>
                    </SubItemsContainer>
                  )}
                </React.Fragment>
                );
              })}
              
              {/* Empty state message v tabulce */}
              {annualFees.length === 0 && !showNewRow && (
                <Tr>
                  <Td colSpan="12" style={{textAlign: 'center', padding: '40px', color: '#9ca3af'}}>
                    <div style={{fontSize: '3rem', marginBottom: '16px'}}>
                      <FontAwesomeIcon icon={faMoneyBill} />
                    </div>
                    <h3 style={{margin: '0 0 8px 0', color: '#6b7280'}}>Žádné roční poplatky</h3>
                    <p style={{margin: '0'}}>Začněte kliknutím na tlačítko "+ Nový roční poplatek" výše</p>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </TableContainer>
      
      {/* 🔔 Modal pro úpravu položek před uložením */}
      {showPolozkyModal && (
        <ModalOverlay>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>{isCreating ? 'Potvrzení položek' : 'Úprava položek'}</h2>
              <CloseButton onClick={() => setShowPolozkyModal(false)}>×</CloseButton>
            </ModalHeader>
            
            <ModalBody>
              <p style={{marginBottom: '20px', color: '#6b7280'}}>
                {isCreating 
                  ? `Budou vytvořeny ${generatedPolozky.length} položky. Můžete je upravit před uložením.`
                  : `Položky budou přegenerovány (${generatedPolozky.length} ks). Můžete je upravit před uložením.`
                }
              </p>
              
              <PolozkyTable>
                <thead>
                  <tr>
                    <th>Poznámka</th>
                    <th>Splatnost</th>
                    <th>Částka (Kč)</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedPolozky.map((polozka, index) => (
                    <tr key={index}>
                      <td>
                        <InlineInput
                          value={polozka.nazev_polozky}
                          onChange={(e) => {
                            const updated = [...generatedPolozky];
                            updated[index].nazev_polozky = e.target.value;
                            setGeneratedPolozky(updated);
                          }}
                          style={{width: '100%'}}
                        />
                      </td>
                      <td>
                        <DateWithArrowContainer>
                          <DatePicker
                            value={polozka.datum_splatnosti}
                            onChange={(date) => {
                              const updated = [...generatedPolozky];
                              updated[index].datum_splatnosti = date;
                              setGeneratedPolozky(updated);
                            }}
                            placeholder="dd.mm.rrrr"
                            variant="compact"
                            style={{flex: 1}}
                          />
                          <ArrowButton
                            onClick={() => {
                              updateDatesFromIndex(
                                generatedPolozky,
                                setGeneratedPolozky,
                                index,
                                pendingFeeData.platba,
                                polozka.datum_splatnosti
                              );
                            }}
                            title="Aktualizovat datumy níže podle periody platby"
                          >
                            <FontAwesomeIcon icon={faAngleDown} />
                          </ArrowButton>
                        </DateWithArrowContainer>
                      </td>
                      <td>
                        <CurrencyInput
                          value={polozka.castka}
                          onChange={(val) => {
                            const updated = [...generatedPolozky];
                            updated[index].castka = val;
                            setGeneratedPolozky(updated);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PolozkyTable>
            </ModalBody>
            
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowPolozkyModal(false)}>
                Zrušit
              </Button>
              <Button variant="primary" onClick={handleConfirmPolozky}>
                <FontAwesomeIcon icon={faCheckCircle} style={{marginRight: '8px'}} />
                Uložit
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
      
      {/* Confirm dialog pro mazání */}
      <ConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        onClose={() => setDeleteConfirmDialog({ isOpen: false, feeId: null, feeName: '' })}
        onConfirm={handleConfirmDelete}
        title="Smazat roční poplatek"
        message={
          <div>
            <p>Opravdu chcete smazat roční poplatek?</p>
            <p style={{fontWeight: 'bold', marginTop: '8px'}}>{deleteConfirmDialog.feeName}</p>
            <p style={{color: '#ef4444', marginTop: '12px'}}>⚠️ Tato akce je nevratná.</p>
          </div>
        }
        icon={faTrash}
        variant="danger"
        confirmText="Smazat"
        cancelText="Zrušit"
      />
    </PageContainer>
  );
}

export default AnnualFeesPage;
