import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faMinus, faFilter, faSearch, faCalendar, 
  faMoneyBill, faFileInvoice, faEdit, 
  faTrash, faCheckCircle, faExclamationTriangle, faSpinner, faUndo 
} from '@fortawesome/free-solid-svg-icons';
import { Calculator } from 'lucide-react';
import DatePicker from '../components/DatePicker';
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

const InlineSelect = styled.select`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
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
  
  // Přidání nové položky k existujícímu ročnímu poplatku
  const [addingItemToFeeId, setAddingItemToFeeId] = useState(null);
  const [newItemData, setNewItemData] = useState({
    nazev_polozky: '',
    datum_splatnosti: '',
    castka: '',
    faktura_id: null,
    faktura_cislo: ''
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
    druh: '',
    platba: '',
    castka: '',
    rok: new Date().getFullYear(),
    datum_prvni_splatnosti: `${new Date().getFullYear()}-01-01`
  });
  
  // Debounced search
  const debouncedSmlouvySearch = useDebounce(smlouvySearch, 300);
  
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
      
      // 🔍 DEBUG - RAW data číselníků
      console.log('📊 RAW Číselníky - Druhy:', druhyRes);
      console.log('📊 RAW Číselníky - Platby:', platbyRes);
      console.log('📊 RAW Číselníky - Stavy:', stavyRes);
      console.log('🔍 Struktura Druhy[0]:', druhyRes?.[0]);
      console.log('🔍 Struktura Platby[0]:', platbyRes?.[0]);
      console.log('🔍 Struktura Stavy[0]:', stavyRes?.[0]);
      
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
    setEditItemData({
      nazev_polozky: item.nazev_polozky,
      datum_splatnosti: item.datum_splatnosti,
      castka: item.castka,
      faktura_id: item.faktura_id,
      faktura_cislo: item.faktura_cislo || ''
    });
    setFakturySearch(item.faktura_cislo || '');
    if (focusOnFaktura) {
      setShouldFocusFaktura(true);
    }
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
      // Pokud byla přiřazena faktura, automaticky nastavit jako zaplaceno
      const dataToSave = {...editItemData};
      if (dataToSave.faktura_id && !dataToSave.stav) {
        dataToSave.stav = 'ZAPLACENO';
        dataToSave.datum_zaplaceni = new Date().toISOString().split('T')[0];
      }
      
      await handleUpdateItem(itemId, dataToSave);
      setEditingItemId(null);
      setEditItemData({});
      setFakturySearch('');
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
      faktura_id: null,
      faktura_cislo: ''
    });
    setFakturySearch('');
    setShowFakturySuggestions(false);
  };
  
  const handleCancelAddItem = () => {
    setAddingItemToFeeId(null);
    setNewItemData({
      nazev_polozky: '',
      datum_splatnosti: '',
      castka: '',
      faktura_id: null,
      faktura_cislo: ''
    });
    setFakturySearch('');
    setShowFakturySuggestions(false);
  };
  
  const handleSaveNewItem = async (feeId) => {
    if (!newItemData.nazev_polozky || !newItemData.datum_splatnosti || !newItemData.castka) {
      showToast('Vyplňte název, splatnost a částku', 'error');
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
        faktura_id: newItemData.faktura_id || null
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
    if (!newFeeData.smlouva_id) {
      showToast('Vyberte smlouvu', 'error');
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
    
    console.log('📤 Posílám na BE:', {
      celkova_castka: celkovaCastka,
      smlouva_id: newFeeData.smlouva_id,
      nazev: newFeeData.nazev,
      druh: newFeeData.druh,
      platba: newFeeData.platba
    });
    
    try {
      const response = await createAnnualFee({
        token,
        username,
        smlouva_id: newFeeData.smlouva_id,
        nazev: newFeeData.nazev,
        druh: newFeeData.druh,
        platba: newFeeData.platba,
        celkova_castka: celkovaCastka,
        rok: newFeeData.rok,
        datum_prvni_splatnosti: newFeeData.datum_prvni_splatnosti
      });
      
      if (response.status === 'success') {
        showToast('Roční poplatek vytvořen', 'success');
        
        // Reset form
        setNewFeeData({
          smlouva_id: null,
          smlouva_cislo: '',
          dodavatel_nazev: '',
          nazev: '',
          druh: '',
          platba: '',
          castka: '',
          rok: new Date().getFullYear(),
          datum_prvni_splatnosti: `${new Date().getFullYear()}-01-01`
        });
        setSmlouvySearch('');
        setShowNewRow(false);
        
        // Reload list
        loadAnnualFees();
      }
    } catch (error) {
      console.error('Chyba při vytváření poplatku:', error);
      showToast(error.message || 'Chyba při vytváření poplatku', 'error');
    }
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
  
  // DELETE handler
  const handleDeleteFee = async (id) => {
    if (!window.confirm('Opravdu smazat tento roční poplatek?')) {
      return;
    }
    
    try {
      const response = await deleteAnnualFee({
        token,
        username,
        id
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
      const response = await updateAnnualFee({
        token,
        username,
        id: feeId,
        data: editFeeData
      });
      
      if (response.status === 'success') {
        showToast('Roční poplatek aktualizován', 'success');
        setEditingFeeId(null);
        setEditFeeData({});
        loadAnnualFees();
      }
    } catch (error) {
      console.error('Chyba při aktualizaci poplatku:', error);
      showToast(error.message || 'Chyba při aktualizaci poplatku', 'error');
    }
  };
  
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0 Kč';
    const num = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '0 Kč';
    // Formát: 100 000 Kč (mezera jako tisícový oddělovač)
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',') + ' Kč';
  };
  
  const formatCurrencySimple = (val) => {
    if (!val && val !== 0) return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',') + ' Kč';
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
                <Th>Smlouva</Th>
                <Th>Dodavatel</Th>
                <Th>Název</Th>
                <Th>Druh / Platba</Th>
                <Th>Celková částka</Th>
                <Th>Zaplaceno</Th>
                <Th>Zbývá</Th>
                <Th>Položky</Th>
                <Th>Stav</Th>
                <Th>Zpracovatel</Th>
                <Th>Akce</Th>
              </tr>
            </Thead>
            <Tbody>
              {/* II. Inline řádek pro vytvoření nového ročního poplatku */}
              {!showNewRow ? (
                <NewRowTr>
                  <Td colSpan="12" style={{textAlign: 'center', padding: '12px'}}>
                    <NewRowButton onClick={() => setShowNewRow(true)}>
                      <FontAwesomeIcon icon={faPlus} />
                      Nový roční poplatek
                    </NewRowButton>
                  </Td>
                </NewRowTr>
              ) : (
                <NewRowTr>
                  <Td>
                    <NewRowButton onClick={() => { setShowNewRow(false); setSmlouvySearch(''); setShowSmlouvySuggestions(false); }} title="Zrušit">
                      <FontAwesomeIcon icon={faMinus} />
                    </NewRowButton>
                  </Td>
                  <Td>
                    <SuggestionsWrapper ref={smlouvySearchRef}>
                      <InlineInput 
                        placeholder="Smlouva # (min 3 znaky)" 
                        value={smlouvySearch}
                        onChange={(e) => setSmlouvySearch(e.target.value)}
                        onFocus={() => smlouvySearch.length >= 3 && setShowSmlouvySuggestions(true)}
                      />
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
                    <InlineInput 
                      placeholder="Dodavatel (načte se ze smlouvy)" 
                      value={newFeeData.dodavatel_nazev}
                      disabled 
                      style={{background: '#f9fafb'}} 
                    />
                  </Td>
                  <Td>
                    <InlineInput 
                      placeholder="Název ročního poplatku" 
                      value={newFeeData.nazev}
                      onChange={(e) => setNewFeeData(prev => ({...prev, nazev: e.target.value}))}
                    />
                  </Td>
                  <Td>
                    <InlineSelect 
                      value={newFeeData.druh}
                      onChange={(e) => setNewFeeData(prev => ({...prev, druh: e.target.value}))}
                    >
                      <option key="empty-druh" value="">Druh...</option>
                      {druhy.map(d => (
                        <option key={d.kod_stavu} value={d.kod_stavu}>{d.nazev_stavu}</option>
                      ))}
                    </InlineSelect>
                    <InlineSelect 
                      style={{marginTop: '4px'}}
                      value={newFeeData.platba}
                      onChange={(e) => setNewFeeData(prev => ({...prev, platba: e.target.value}))}
                    >
                      <option key="empty-platba" value="">Platba...</option>
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
                        onChange={(e) => setNewFeeData(prev => ({...prev, castka: e.target.value}))}
                        style={{paddingRight: '40px', textAlign: 'right'}}
                      />
                      <CurrencySymbol>Kč</CurrencySymbol>
                    </CurrencyInputWrapper>
                  </Td>
                  <Td colSpan="4" style={{textAlign: 'right'}}>
                    <Button 
                      variant="primary" 
                      style={{padding: '6px 16px', fontSize: '0.85rem', marginRight: '8px'}}
                      onClick={handleCreateAnnualFee}
                    >
                      💾 Uložit
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => { setShowNewRow(false); setSmlouvySearch(''); setShowSmlouvySuggestions(false); }} 
                      style={{padding: '6px 16px', fontSize: '0.85rem'}}
                    >
                      Zrušit
                    </Button>
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
                      <ExpandButton title={expandedRows.has(fee.id) ? 'Sbalit' : 'Rozbalit'}>
                        <FontAwesomeIcon icon={expandedRows.has(fee.id) ? faMinus : faPlus} />
                      </ExpandButton>
                    </Td>
                    <Td><strong>{fee.smlouva_cislo}</strong></Td>
                    <Td>{fee.dodavatel_nazev}</Td>
                    <Td>
                      {isEditingFee ? (
                        <InlineInput
                          value={editFeeData.nazev || ''}
                          onChange={(e) => setEditFeeData(prev => ({...prev, nazev: e.target.value}))}
                          style={{fontSize: '0.85rem'}}
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
                    <Td>
                      {isEditingFee ? (
                        <CurrencyInput
                          value={editFeeData.celkova_castka || ''}
                          onChange={(val) => setEditFeeData(prev => ({...prev, celkova_castka: val}))}
                        />
                      ) : (
                        <>
                          <strong>{formatCurrency(fee.celkova_castka)}</strong>
                          {fee.pocet_polozek > 0 && fee.stav !== 'ZAPLACENO' && (
                            <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '2px'}}>
                              {formatCurrency(fee.celkova_castka / fee.pocet_polozek)}/{fee.platba === 'MESICNI' ? 'měsíc' : fee.platba === 'KVARTALNI' ? 'Q' : 'rok'}
                            </div>
                          )}
                        </>
                      )}
                    </Td>
                    <Td style={{color: '#10b981'}}>{formatCurrency(fee.zaplaceno_celkem)}</Td>
                    <Td style={{color: '#ef4444'}}>{formatCurrency(fee.zbyva_zaplatit)}</Td>
                    <Td>
                      {fee.pocet_zaplaceno}/{fee.pocet_polozek}
                    </Td>
                    <Td>
                      <StatusBadge status={fee.stav}>
                        {fee.stav === 'ZAPLACENO' && <FontAwesomeIcon icon={faCheckCircle} />}
                        {fee.stav === 'V_RESENI' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                        {fee.stav_nazev}
                      </StatusBadge>
                    </Td>
                    <Td style={{fontSize: '0.85rem', color: '#6b7280'}}>
                      {fee.aktualizoval_jmeno && fee.aktualizoval_prijmeni ? (
                        <div>{fee.aktualizoval_jmeno} {fee.aktualizoval_prijmeni}</div>
                      ) : fee.vytvoril_jmeno && fee.vytvoril_prijmeni ? (
                        <div>{fee.vytvoril_jmeno} {fee.vytvoril_prijmeni}</div>
                      ) : '-'}
                    </Td>
                    <Td>
                      <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
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
                                  handleDeleteFee(fee.id);
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
                      <SubItemsWrapper colSpan="9">
                        <SubItemsTable>
                          <thead>
                            <tr>
                              <Th indent style={{background: '#f3f4f6'}}>Položka</Th>
                              <Th style={{background: '#f3f4f6'}}>Splatnost</Th>
                              <Th style={{background: '#f3f4f6'}}>Částka</Th>
                              <Th style={{background: '#f3f4f6'}}>Zaplaceno</Th>
                              <Th style={{background: '#f3f4f6'}}>Faktura</Th>
                              <Th style={{background: '#f3f4f6'}}>Stav</Th>
                              <Th style={{background: '#f3f4f6'}}>Zpracovatel</Th>
                              <Th style={{background: '#f3f4f6'}}>Akce</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {fee.polozky.map(item => {
                              const isEditing = editingItemId === item.id;
                              return (
                              <SubItemRow key={item.id}>
                                {/* Položka */}
                                <SubItemCell indent>
                                  {isEditing ? (
                                    <InlineInput 
                                      value={editItemData.nazev_polozky || ''}
                                      onChange={(e) => setEditItemData(prev => ({...prev, nazev_polozky: e.target.value}))}
                                      style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%', minWidth: '120px'}}
                                      placeholder="Název položky"
                                    />
                                  ) : (
                                    <strong>{item.nazev_polozky}</strong>
                                  )}
                                </SubItemCell>
                                
                                {/* Splatnost */}
                                <SubItemCell>
                                  {isEditing ? (
                                    <div style={{maxWidth: '130px'}}>
                                      <DatePicker
                                        fieldName="datum_splatnosti"
                                        value={editItemData.datum_splatnosti || ''}
                                        onChange={(field, val) => setEditItemData(prev => ({...prev, [field]: val}))}
                                        placeholder="Vyberte datum"
                                        variant="compact"
                                      />
                                    </div>
                                  ) : (
                                    formatDate(item.datum_splatnosti)
                                  )}
                                </SubItemCell>
                                
                                {/* Částka */}
                                <SubItemCell>
                                  {isEditing ? (
                                    <div style={{maxWidth: '120px'}}>
                                      <CurrencyInput
                                        value={editItemData.castka || ''}
                                        onChange={(val) => setEditItemData(prev => ({...prev, castka: val}))}
                                        placeholder="0,00"
                                      />
                                    </div>
                                  ) : (
                                    formatCurrency(item.castka)
                                  )}
                                </SubItemCell>
                                
                                {/* Zaplaceno */}
                                <SubItemCell>
                                  {formatDate(item.datum_zaplaceni)}
                                </SubItemCell>
                                
                                {/* Faktura */}
                                <SubItemCell>
                                  {isEditing ? (
                                    <SuggestionsWrapper ref={fakturySearchRef}>
                                      <InlineInput 
                                        ref={fakturyInputRef}
                                        value={fakturySearch}
                                        onChange={(e) => setFakturySearch(e.target.value)}
                                        onFocus={() => fakturySearch.length >= 3 && setShowFakturySuggestions(true)}
                                        style={{
                                          fontSize: '0.85rem', 
                                          padding: '4px 6px', 
                                          width: '100%',
                                          minWidth: '100px',
                                          maxWidth: '180px',
                                          backgroundColor: !editItemData.faktura_id ? '#fee2e2' : 'white',
                                          borderColor: !editItemData.faktura_id ? '#ef4444' : '#d1d5db'
                                        }}
                                        placeholder="VS, název..."
                                      />
                                      {showFakturySuggestions && fakturySuggestions.length > 0 && (
                                        <SuggestionsDropdown style={{maxHeight: '200px'}}>
                                          {isSearchingFaktury && (
                                            <SuggestionItem style={{textAlign: 'center', color: '#9ca3af'}}>
                                              <FontAwesomeIcon icon={faSpinner} spin /> Vyhledávání...
                                            </SuggestionItem>
                                          )}
                                          {!isSearchingFaktury && fakturySuggestions.map(faktura => (
                                            <SuggestionItem key={faktura.id} onClick={() => handleSelectFaktura(faktura)}>
                                              <SuggestionTitle>
                                                <SuggestionBadge $color="#ef4444" $textColor="white">FA</SuggestionBadge>
                                                {faktura.fa_cislo_vema}
                                                {faktura.castka && (
                                                  <span style={{marginLeft: '8px', color: '#10b981', fontWeight: '600', fontSize: '0.9rem'}}>
                                                    {formatCurrencySimple(faktura.castka)}
                                                  </span>
                                                )}
                                                {faktura.stav_workflow && (
                                                  <InvoiceStatusBadge status={faktura.stav_workflow} style={{marginLeft: '8px'}}>
                                                    {getInvoiceStatusText(faktura.stav_workflow)}
                                                  </InvoiceStatusBadge>
                                                )}
                                              </SuggestionTitle>
                                              <SuggestionDetail>
                                                {(faktura.dodavatel_nazev || faktura.nazev_firmy) && (
                                                  <span style={{fontSize: '0.75rem', display: 'block'}}>
                                                    <strong>{faktura.dodavatel_nazev || faktura.nazev_firmy}</strong>
                                                    {(faktura.dodavatel_ico || faktura.ico) && ` (IČO: ${faktura.dodavatel_ico || faktura.ico})`}
                                                  </span>
                                                )}
                                                {faktura.datum_splatnosti && (
                                                  <span style={{fontSize: '0.7rem', color: '#6b7280', display: 'block', marginTop: '2px'}}>
                                                    Splatnost: {formatDate(faktura.datum_splatnosti)}
                                                    {faktura.datum_vystaveni && ` • Vystaveno: ${formatDate(faktura.datum_vystaveni)}`}
                                                  </span>
                                                )}
                                              </SuggestionDetail>
                                            </SuggestionItem>
                                          ))}
                                        </SuggestionsDropdown>
                                      )}
                                    </SuggestionsWrapper>
                                  ) : (
                                    item.faktura_cislo ? (
                                      <span style={{fontSize: '0.85rem'}}>{item.faktura_cislo}</span>
                                    ) : (
                                      <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>Nepřiřazena</span>
                                    )
                                  )}
                                </SubItemCell>
                                
                                {/* Stav */}
                                <SubItemCell>
                                  <StatusBadge status={item.stav} style={{fontSize: '0.85rem'}}>
                                    {item.stav === 'ZAPLACENO' ? (
                                      <><FontAwesomeIcon icon={faCheckCircle} /> Zaplaceno</>
                                    ) : 'Nezaplaceno'}
                                  </StatusBadge>
                                </SubItemCell>
                                
                                {/* Upravil */}
                                <SubItemCell style={{fontSize: '0.85rem', color: '#6b7280'}}>
                                  {item.aktualizoval_jmeno && item.aktualizoval_prijmeni ? (
                                    <span>{item.aktualizoval_jmeno} {item.aktualizoval_prijmeni}</span>
                                  ) : item.vytvoril_jmeno && item.vytvoril_prijmeni ? (
                                    <span>{item.vytvoril_jmeno} {item.vytvoril_prijmeni}</span>
                                  ) : '-'}
                                </SubItemCell>
                                
                                {/* Akce */}
                                <SubItemCell>
                                  <div style={{display: 'flex', gap: '6px', justifyContent: 'flex-start'}}>
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
                                            style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', background: '#f59e0b', color: 'white', borderColor: '#f59e0b'}}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleUpdateItem(item.id, { stav: 'NEZAPLACENO', datum_zaplaceni: null });
                                            }}
                                            title="Vrátit na nezaplaceno"
                                          >
                                            <FontAwesomeIcon icon={faUndo} />
                                          </Button>
                                        ) : (
                                          <Button 
                                            variant="secondary" 
                                            style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', background: '#10b981', color: 'white', borderColor: '#10b981'}}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Pokud není přiřazená faktura, otevřít editaci s fokusem na fakturu
                                              if (!item.faktura_id) {
                                                handleStartEditItem(item, true);
                                              } else {
                                                handleUpdateItem(item.id, { stav: 'ZAPLACENO', datum_zaplaceni: new Date().toISOString().split('T')[0] });
                                              }
                                            }}
                                            title="Označit jako zaplaceno"
                                          >
                                            <FontAwesomeIcon icon={faCheckCircle} />
                                          </Button>
                                        )}
                                        <Button 
                                          variant="secondary" 
                                          style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto'}}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartEditItem(item);
                                          }}
                                          title="Upravit položku"
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
                                {/* Položka */}
                                <SubItemCell indent>
                                  <InlineInput 
                                    value={newItemData.nazev_polozky || ''}
                                    onChange={(e) => setNewItemData(prev => ({...prev, nazev_polozky: e.target.value}))}
                                    style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%', minWidth: '120px'}}
                                    placeholder="Název položky"
                                  />
                                </SubItemCell>
                                
                                {/* Splatnost */}
                                <SubItemCell>
                                  <div style={{maxWidth: '130px'}}>
                                    <DatePicker
                                      fieldName="datum_splatnosti"
                                      value={newItemData.datum_splatnosti || ''}
                                      onChange={(field, val) => setNewItemData(prev => ({...prev, [field]: val}))}
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
                                
                                {/* Zaplaceno */}
                                <SubItemCell>
                                  <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>-</span>
                                </SubItemCell>
                                
                                {/* Faktura */}
                                <SubItemCell>
                                  <SuggestionsWrapper ref={fakturySearchRef}>
                                    <InlineInput 
                                      value={fakturySearch}
                                      onChange={(e) => setFakturySearch(e.target.value)}
                                      onFocus={() => fakturySearch.length >= 3 && setShowFakturySuggestions(true)}
                                      style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%', minWidth: '100px', maxWidth: '180px'}}
                                      placeholder="VS, název..."
                                    />
                                    {showFakturySuggestions && fakturySuggestions.length > 0 && (
                                      <SuggestionsDropdown style={{maxHeight: '200px'}}>
                                        {isSearchingFaktury && (
                                          <SuggestionItem style={{textAlign: 'center', color: '#9ca3af'}}>
                                            <FontAwesomeIcon icon={faSpinner} spin /> Vyhledávání...
                                          </SuggestionItem>
                                        )}
                                        {!isSearchingFaktury && fakturySuggestions.map(faktura => (
                                          <SuggestionItem key={faktura.id} onClick={() => {
                                            setNewItemData(prev => ({
                                              ...prev,
                                              faktura_id: faktura.id,
                                              faktura_cislo: faktura.fa_cislo_vema
                                            }));
                                            setFakturySearch(faktura.fa_cislo_vema);
                                            setShowFakturySuggestions(false);
                                          }}>
                                            <SuggestionTitle>
                                              <SuggestionBadge $color="#ef4444" $textColor="white">FA</SuggestionBadge>
                                              {faktura.fa_cislo_vema}
                                              {faktura.castka && (
                                                <span style={{marginLeft: '8px', color: '#10b981', fontWeight: '600', fontSize: '0.9rem'}}>
                                                  {formatCurrencySimple(faktura.castka)}
                                                </span>
                                              )}
                                              {faktura.stav_workflow && (
                                                <InvoiceStatusBadge status={faktura.stav_workflow} style={{marginLeft: '8px'}}>
                                                  {getInvoiceStatusText(faktura.stav_workflow)}
                                                </InvoiceStatusBadge>
                                              )}
                                            </SuggestionTitle>
                                            <SuggestionDetail>
                                              {(faktura.dodavatel_nazev || faktura.nazev_firmy) && (
                                                <span style={{fontSize: '0.75rem', display: 'block'}}>
                                                  <strong>{faktura.dodavatel_nazev || faktura.nazev_firmy}</strong>
                                                  {(faktura.dodavatel_ico || faktura.ico) && ` (IČO: ${faktura.dodavatel_ico || faktura.ico})`}
                                                </span>
                                              )}
                                              {faktura.datum_splatnosti && (
                                                <span style={{fontSize: '0.7rem', color: '#6b7280', display: 'block', marginTop: '2px'}}>
                                                  Splatnost: {formatDate(faktura.datum_splatnosti)}
                                                  {faktura.datum_vystaveni && ` • Vystaveno: ${formatDate(faktura.datum_vystaveni)}`}
                                                </span>
                                              )}
                                            </SuggestionDetail>
                                          </SuggestionItem>
                                        ))}
                                      </SuggestionsDropdown>
                                    )}
                                  </SuggestionsWrapper>
                                </SubItemCell>
                                
                                {/* Stav */}
                                <SubItemCell>
                                  <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>Nová</span>
                                </SubItemCell>
                                
                                {/* Zpracovatel */}
                                <SubItemCell style={{fontSize: '0.85rem', color: '#6b7280'}}>
                                  <span>-</span>
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
    </PageContainer>
  );
}

export default AnnualFeesPage;
