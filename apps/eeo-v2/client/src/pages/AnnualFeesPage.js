import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faMinus, faFilter, faSearch, faCalendar, 
  faMoneyBill, faFileInvoice, faEdit, 
  faTrash, faCheckCircle, faExclamationTriangle, faSpinner 
} from '@fortawesome/free-solid-svg-icons';
import { 
  getAnnualFeesList, 
  getAnnualFeeDetail, 
  createAnnualFee, 
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
  background: transparent;
  border: 1px dashed #10b981;
  border-radius: 4px;
  color: #10b981;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  transition: all 0.15s ease;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:hover {
    background: #10b981;
    color: white;
    border-style: solid;
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

// 🧩 MAIN COMPONENT

function AnnualFeesPage() {
  const { token, username, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  // State
  const [loading, setLoading] = useState(true);
  const [annualFees, setAnnualFees] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
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
      
      setAnnualFees(response.data || []);
      
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
        
        // ✅ Aktualizovat lokální stav místo refreshe celého seznamu
        setAnnualFees(prev => prev.map(fee => {
          // Najít položku v poli položek
          if (fee.polozky && fee.polozky.some(item => item.id === itemId)) {
            const updatedPolozky = fee.polozky.map(item => 
              item.id === itemId 
                ? { ...item, ...data, ...response.data } // Merge s daty z BE (obsahuje přepočítané hodnoty)
                : item
            );
            
            // Přepočítat sumarizační hodnoty v hlavičce
            const zaplaceno = updatedPolozky
              .filter(p => p.stav === 'ZAPLACENO')
              .reduce((sum, p) => sum + parseFloat(p.castka || 0), 0);
            
            const zbyva = fee.celkova_castka - zaplaceno;
            
            // Určit nový stav hlavičky
            let novyStav = 'NEZAPLACENO';
            if (zaplaceno >= fee.celkova_castka) {
              novyStav = 'ZAPLACENO';
            } else if (zaplaceno > 0) {
              novyStav = 'CASTECNE';
            }
            
            return {
              ...fee,
              polozky: updatedPolozky,
              zaplaceno_celkem: zaplaceno,
              zbyva_zaplatit: zbyva,
              stav: novyStav
            };
          }
          return fee;
        }));
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
    const formatCurrency = (amount) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK'
    }).format(amount);
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
              </tr>
            </Thead>
            <Tbody>
              {/* II. Inline řádek pro vytvoření nového ročního poplatku */}
              {!showNewRow ? (
                <NewRowTr>
                  <Td colSpan="10" style={{textAlign: 'center', padding: '12px'}}>
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
              {annualFees.map(fee => (
                <React.Fragment key={fee.id}>
                  <Tr clickable onClick={() => toggleRow(fee.id)}>
                    <Td>
                      <ExpandButton title={expandedRows.has(fee.id) ? 'Sbalit' : 'Rozbalit'}>
                        <FontAwesomeIcon icon={expandedRows.has(fee.id) ? faMinus : faPlus} />
                      </ExpandButton>
                    </Td>
                    <Td><strong>{fee.smlouva_cislo}</strong></Td>
                    <Td>{fee.dodavatel_nazev}</Td>
                    <Td>{fee.nazev}</Td>
                    <Td>
                      <div>{fee.druh_nazev}</div>
                      <div style={{fontSize: '0.85rem', color: '#9ca3af'}}>{fee.platba_nazev}</div>
                    </Td>
                    <Td>
                      <strong>{formatCurrency(fee.celkova_castka)}</strong>
                      {fee.pocet_polozek > 0 && fee.stav !== 'ZAPLACENO' && (
                        <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '2px'}}>
                          {formatCurrency(fee.celkova_castka / fee.pocet_polozek)}/{fee.platba === 'MESICNI' ? 'měsíc' : fee.platba === 'KVARTALNI' ? 'Q' : 'rok'}
                        </div>
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
                  </Tr>
                  
                  {expandedRows.has(fee.id) && fee.polozky && (
                    <SubItemsContainer>
                      <SubItemsWrapper colSpan="10">
                        <SubItemsTable>
                          <thead>
                            <tr>
                              <Th indent style={{background: '#f3f4f6'}}>Položka</Th>
                              <Th style={{background: '#f3f4f6'}}>Částka</Th>
                              <Th style={{background: '#f3f4f6'}}>Splatnost</Th>
                              <Th style={{background: '#f3f4f6'}}>Zaplaceno</Th>
                              <Th style={{background: '#f3f4f6'}}>Faktura</Th>
                              <Th style={{background: '#f3f4f6'}}>Stav</Th>
                              <Th style={{background: '#f3f4f6'}}>Akce</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {fee.polozky.map(item => (
                              <SubItemRow key={item.id}>
                                <SubItemCell indent>
                                  <strong>{item.nazev_polozky}</strong>
                                </SubItemCell>
                                <SubItemCell>{formatCurrency(item.castka)}</SubItemCell>
                                <SubItemCell>
                                  <InlineInput 
                                    type="date" 
                                    value={item.datum_splatnosti}
                                    onChange={(e) => handleUpdateItem(item.id, { datum_splatnosti: e.target.value })}
                                    style={{fontSize: '0.85rem', padding: '4px 8px'}}
                                  />
                                </SubItemCell>
                                <SubItemCell>{formatDate(item.datum_zaplaceni)}</SubItemCell>
                                <SubItemCell>
                                  {item.faktura_cislo || '-'}
                                </SubItemCell>
                                <SubItemCell>
                                  <StatusBadge status={item.stav}>
                                    {item.stav === 'ZAPLACENO' ? (
                                      <><FontAwesomeIcon icon={faCheckCircle} /> Zaplaceno</>
                                    ) : 'Nezaplaceno'}
                                  </StatusBadge>
                                </SubItemCell>
                                <SubItemCell>
                                  {item.stav !== 'ZAPLACENO' && (
                                    <Button 
                                      variant="secondary" 
                                      style={{padding: '6px 12px', fontSize: '0.85rem', marginRight: '4px'}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateItem(item.id, { stav: 'ZAPLACENO', datum_zaplaceni: new Date().toISOString().split('T')[0] });
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faCheckCircle} />
                                      Zaplaceno
                                    </Button>
                                  )}
                                </SubItemCell>
                              </SubItemRow>
                            ))}
                          </tbody>
                        </SubItemsTable>
                        <div style={{padding: '12px', textAlign: 'right', borderTop: '1px solid #e5e7eb'}}>
                          <Button 
                            variant="secondary" 
                            style={{padding: '6px 12px', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444'}}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFee(fee.id);
                            }}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                            Smazat poplatek
                          </Button>
                        </div>
                      </SubItemsWrapper>
                    </SubItemsContainer>
                  )}
                </React.Fragment>
              ))}
              
              {/* Empty state message v tabulce */}
              {annualFees.length === 0 && !showNewRow && (
                <Tr>
                  <Td colSpan="10" style={{textAlign: 'center', padding: '40px', color: '#9ca3af'}}>
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
