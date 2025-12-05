import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSave,
  faFileInvoice,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faBuilding,
  faCalendar,
  faMoneyBillWave,
  faClipboardCheck,
  faExpand,
  faCompress,
  faArrowLeft,
  faCreditCard,
  faUpload,
  faChevronUp,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { ProgressContext } from '../context/ProgressContext';
import { createInvoiceWithAttachmentV2, createInvoiceV2 } from '../services/api25invoices';
import { getOrderV2 } from '../services/apiOrderV2';
import { universalSearch } from '../services/apiUniversalSearch';
import { formatDateOnly } from '../utils/format';
import OrderFormReadOnly from '../components/OrderFormReadOnly';
import DatePicker from '../components/DatePicker';
import { CustomSelect } from '../components/CustomSelect';

// Helper: formát data pro input type="date" (YYYY-MM-DD)
const formatDateForPicker = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toISOString().split('T')[0];
};

// ===================================================================
// STYLED COMPONENTS - Recyklované z OrderForm25 + nové pro layout
// ===================================================================

const PageContainer = styled.div`
  position: relative;
  width: 100%;
  height: calc(100vh - 60px);
  background: #f9fafb;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const FullscreenOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  z-index: 99999;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const PageHeader = styled.div`
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px solid #3498db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ContentLayout = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
`;

const FormColumn = styled.div`
  width: 60%;
  background: white;
  border-right: 2px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const FormColumnHeader = styled.div`
  flex-shrink: 0;
  background: white;
  padding: 1.5rem 2rem 1rem 2rem;
  border-bottom: 2px solid #e5e7eb;
`;

const FormColumnContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2rem;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const PreviewColumn = styled.div`
  width: 40%;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PreviewColumnHeader = styled.div`
  flex-shrink: 0;
  background: #f8fafc;
  padding: 1.25rem 2rem 1.5rem 2rem;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const ToggleButton = styled.button`
  background: ${props => props.disabled ? '#e5e7eb' : '#3b82f6'};
  color: ${props => props.disabled ? '#94a3b8' : 'white'};
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s ease;
  white-space: nowrap;
  align-self: center;
  margin: 0;

  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const PreviewColumnContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2rem;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #e5e7eb;
  }

  &::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  color: #1e293b;
  margin: 0 0 1.5rem 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #3498db;
  display: flex;
  align-items: center;
  gap: 10px;
`;

// Recyklované z OrderForm25 - FakturaCard layout
const FakturaCard = styled.div`
  border: 2px solid ${props => props.$hasError ? '#ef4444' : '#e5e7eb'};
  border-radius: 12px;
  padding: 1.5rem;
  background: ${props => props.$isEditing ? '#f0f9ff' : '#ffffff'};
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || '1fr'};
  gap: ${props => props.$gap || '1rem'};
  margin-bottom: 1rem;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldLabel = styled.label`
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RequiredStar = styled.span`
  color: #ef4444;
`;

const CurrencyInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const CurrencySymbol = styled.span`
  position: absolute;
  right: 12px;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: inherit;
  pointer-events: none;
  user-select: none;
  display: flex;
  align-items: center;
  height: 100%;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #94a3af;
  }
`;

const Textarea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  font-family: inherit;
  background-color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  option {
    padding: 0.5rem;
  }
`;

const FileInputWrapper = styled.div`
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  input[type="file"] {
    display: none;
  }
`;

const FileInputLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #64748b;

  &:hover {
    color: #3b82f6;
  }
`;

const VecnaSpravnostPanel = styled.div`
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #86efac;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
`;

const VecnaSpravnostTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #166534;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 2px solid #d1fae5;
  transition: all 0.2s ease;

  &:hover {
    border-color: #86efac;
    background: #f0fdf4;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  strong {
    color: #166534;
    font-size: 1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e5e7eb;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.875rem 1.75rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;

  ${props => props.$variant === 'primary' && `
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;

    &:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
  `}

  ${props => props.$variant === 'secondary' && `
    background: #f1f5f9;
    color: #475569;

    &:hover {
      background: #e2e8f0;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`;

const OrderPreviewCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
`;

const OrderHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const OrderNumber = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
`;

const OrderBadge = styled.span`
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => props.$color || '#64748b'};
  color: white;
`;

const OrderDetailRow = styled.div`
  display: flex;
  margin-bottom: 12px;
  gap: 12px;
`;

const OrderDetailLabel = styled.div`
  font-weight: 600;
  color: #64748b;
  min-width: 140px;
  font-size: 0.9rem;
`;

const OrderDetailValue = styled.div`
  color: #1e293b;
  flex: 1;
  font-size: 0.9rem;
`;

const LoadingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #64748b;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorAlert = styled.div`
  background: #fef2f2;
  border: 2px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HelpText = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.5rem;
  font-style: italic;
`;

const SelectedFileName = styled.div`
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// Autocomplete styled components
const AutocompleteWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const AutocompleteInput = styled(Input)`
  padding-right: 2.5rem;
`;

const AutocompleteDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 400px;
  overflow-y: auto;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const OrderSuggestionItem = styled.div`
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s ease;

  &:hover {
    background: #eff6ff;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const OrderSuggestionTitle = styled.div`
  font-weight: 600;
  color: #1e40af;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
`;

const OrderSuggestionDetail = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.25rem;
`;

const OrderSuggestionBadge = styled.span`
  background: ${props => props.$color || '#e5e7eb'};
  color: ${props => props.$textColor || '#374151'};
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const NoResults = styled.div`
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.9rem;
`;

const SearchingSpinner = styled.div`
  padding: 1rem;
  text-align: center;
  color: #6b7280;
`;

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function InvoiceEvidencePage() {
  const navigate = useNavigate();
  const { orderId } = useParams(); // URL param
  const { token, username, user_id, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { setProgress } = useContext(ProgressContext) || {};

  // Kontrola oprávnění - uživatelé s MANAGE právy nebo ADMIN role vidí všechny objednávky
  // hasPermission('ADMIN') kontroluje SUPERADMIN NEBO ADMINISTRATOR (speciální alias v AuthContext)
  const canViewAllOrders = hasPermission('INVOICE_MANAGE') || 
                           hasPermission('ORDER_MANAGE') || 
                           hasPermission('ADMIN');



  // State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  // Autocomplete state
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSuggestions, setOrderSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Ref pro OrderFormReadOnly
  const orderFormRef = useRef(null);
  
  // State pro sledování collapse stavu
  const [hasAnySectionCollapsed, setHasAnySectionCollapsed] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    order_id: orderId || '',
    fa_cislo_vema: '',
    fa_typ: 'BEZNA', // Výchozí typ: Běžná faktura
    fa_datum_doruceni: formatDateForPicker(new Date()),
    fa_datum_vystaveni: formatDateForPicker(new Date()),
    fa_datum_splatnosti: '',
    fa_castka: '',
    fa_poznamka: '',
    // Příloha
    file: null
  });

  // CustomSelect states
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState(new Set());

  // Načtení objednávky při mount nebo změně orderId
  const loadOrderData = useCallback(async (orderIdToLoad) => {
    if (!orderIdToLoad || !token || !username) {
      return;
    }

    setOrderLoading(true);
    setError(null);

    try {
      const orderData = await getOrderV2(orderIdToLoad, token, username, true);

      if (orderData && orderData.id) {
        setOrderData(orderData);
        console.log('✅ Objednávka načtena:', orderData);
        // Aktualizuj searchTerm aby zobrazoval pouze ev. číslo
        const evCislo = orderData.cislo_objednavky || orderData.evidencni_cislo || `#${orderData.id}`;
        setSearchTerm(evCislo);
      } else {
        setError('Nepodařilo se načíst data objednávky');
      }
    } catch (err) {
      setError(err.message || 'Chyba při načítání objednávky');
      showToast && showToast(err.message || 'Chyba při načítání objednávky', 'error');
    } finally {
      setOrderLoading(false);
    }
  }, [token, username, showToast]);

  // Search objednávek pro autocomplete
  const searchOrders = useCallback(async (search) => {
    // ✅ universalSearch vyžaduje min 3 znaky
    if (!search || search.length < 3) {
      setOrderSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = {
        query: search,
        categories: ['orders_2025'],
        limit: 15,
        archivovano: 0, // Jen aktivní objednávky
        search_all: canViewAllOrders // ✅ Ignorovat permissions, vrátit všechny výsledky
      };
      
      const response = await universalSearch(searchParams);

      // ✅ Správná cesta k datům z universalSearch
      const orders = response?.categories?.orders_2025?.results || [];

      // Filtruj objednávky OD ROZPRACOVANÁ VČETNĚ a výše
      // Fáze workflow: NOVA → ROZPRACOVANA → KE_SCHVALENI → SCHVALENA → ODESLANA → POTVRZENA → FAKTURACE → VECNA_SPRAVNOST → DOKONCENA
      const sentOrders = orders.filter(order => {
        // ✅ stav_kod je JSON string, musíme parsovat
        let stavKody = [];
        try {
          if (order.stav_kod) {
            stavKody = JSON.parse(order.stav_kod);
          }
        } catch (e) {
          // Ignorovat chyby parsování
        }
        
        // Kontrola stavů pro fakturaci:
        // ❌ NEPLATNÉ (stornované/zamítnuté): STORNOVANA, ZAMITNUTA
        // ⏸️ IGNOROVANÉ (před odesláním): NOVA, KONCEPT, KE_SCHVALENI, SCHVALENA
        // ✅ PLATNÉ: vše od ODESLANA/ODESLANO dále včetně NEUVEREJNIT (= nezveřejněná v registru smluv, ale platná objednávka)
        
        const invalidStates = ['STORNOVANA', 'ZAMITNUTA'];
        const hasInvalidState = stavKody.some(stav => invalidStates.includes(stav));
        
        const validStates = ['ODESLANA', 'ODESLANO', 'POTVRZENA', 'NEUVEREJNIT', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'];
        const hasValidState = stavKody.some(stav => validStates.includes(stav));
        
        if (hasInvalidState) {
          return false;
        }
        
        if (!hasValidState) {
          return false;
        }

        // ✅ Pokud má uživatel MANAGE práva nebo je ADMIN, zobraz všechny objednávky
        if (canViewAllOrders) {
          return true;
        }

        // ⚠️ Běžný uživatel - kontrola vlastnictví nebo úseku
        // TODO: Implementovat kontrolu úseku (usek_id) pokud bude potřeba
        // Pro teď předpokládáme že universalSearch už filtruje podle úseku na backendu
        return true;
      });

      setOrderSuggestions(sentOrders);
      setShowSuggestions(true);
    } catch (err) {
      setOrderSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search při psaní (jen když jsou suggestions otevřené)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && showSuggestions) {
        searchOrders(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, showSuggestions, searchOrders]);

  // Effect: Načíst objednávku když je orderId v URL
  useEffect(() => {
    if (orderId) {
      setFormData(prev => ({ ...prev, order_id: orderId }));
      // loadOrderData automaticky nastaví searchTerm po načtení
      loadOrderData(orderId);
    }
  }, [orderId, loadOrderData]);

  // Effect: Reload objednávky když user změní order_id v inputu
  useEffect(() => {
    if (formData.order_id && formData.order_id !== orderId) {
      loadOrderData(formData.order_id);
    }
  }, [formData.order_id, orderId, loadOrderData]);

  // Effect: Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.autocomplete-wrapper')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler: změna inputu
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler: změna search inputu pro autocomplete
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);
    
    // Pokud uživatel mění text, vymažeme order_id a orderData
    // aby se nemohlo stát, že bude vyplněn nevalidní text s validním order_id
    if (value !== searchTerm) {
      setFormData(prev => ({ ...prev, order_id: '' }));
      setOrderData(null);
    }
  };

  // Handler: výběr objednávky z autocomplete
  const handleSelectOrder = (order) => {
    setFormData(prev => ({
      ...prev,
      order_id: order.id
    }));
    // ✏️ Zobraz jen evidenční číslo bez předmětu
    const evCislo = order.cislo_objednavky || order.evidencni_cislo || `#${order.id}`;
    setSearchTerm(evCislo);
    setShowSuggestions(false);
    
    // 🎯 Nastavit pro OrderForm25 - načte z localStorage
    localStorage.setItem('activeOrderEditId', order.id);
    
    loadOrderData(order.id);
  };

  // Handler: změna souboru
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      file: file || null
    }));
  };

  // Handler: submit formuláře
  const handleSubmit = async () => {
    setError(null);

    // Validace
    // order_id není povinné - faktura může přijít bez objednávky
    // Ale pokud je searchTerm vyplněn a není order_id, znamená to nevalidní výběr
    if (searchTerm && !formData.order_id) {
      setError('Pokud zadáváte ev. číslo, musíte vybrat objednávku z našeptávače');
      return;
    }

    if (!formData.fa_cislo_vema) {
      setError('Vyplňte číslo faktury');
      return;
    }

    if (!formData.fa_typ) {
      setError('Vyberte typ faktury');
      return;
    }

    if (!formData.fa_datum_vystaveni) {
      setError('Vyplňte datum vystavení');
      return;
    }

    if (!formData.fa_castka) {
      setError('Vyplňte částku faktury');
      return;
    }

    setLoading(true);
    setProgress?.(50);

    try {
      // Věcná správnost podle dokumentace
      const getMysqlDateTime = () => {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
      };

      const apiParams = {
        token,
        username,
        order_id: formData.order_id || null, // Může být null pokud faktura není vázána na objednávku
        fa_cislo_vema: formData.fa_cislo_vema,
        fa_typ: formData.fa_typ,
        fa_datum_vystaveni: formData.fa_datum_vystaveni,
        fa_castka: formData.fa_castka,
        fa_datum_splatnosti: formData.fa_datum_splatnosti || null,
        fa_poznamka: formData.fa_poznamka || null
      };

      let result;

      if (formData.file) {
        // S přílohou
        result = await createInvoiceWithAttachmentV2({
          ...apiParams,
          file: formData.file
        });
      } else {
        // Bez přílohy
        result = await createInvoiceV2(apiParams);
      }

      setProgress?.(100);
      showToast && showToast('✅ Faktura byla úspěšně zaevidována', 'success');

      // Navigovat zpět na seznam faktur
      setTimeout(() => {
        navigate('/invoices25');
      }, 800);

    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'Chyba při evidenci faktury');
      showToast && showToast(err.message || 'Chyba při evidenci faktury', 'error');
      setProgress?.(0);
    } finally {
      setLoading(false);
    }
  };

  // Handler: zpět na seznam
  const handleBack = () => {
    navigate(-1);
  };

  // Handler: toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Content komponenta (sdílená pro normal i fullscreen režim)
  const PageContent = (
    <>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={faFileInvoice} />
          Zaevidovat fakturu
        </PageTitle>
        <HeaderActions>
          <IconButton onClick={toggleFullscreen} title={isFullscreen ? 'Normální režim' : 'Celá obrazovka'}>
            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            {isFullscreen ? 'Normální' : 'Celá obrazovka'}
          </IconButton>
          <IconButton onClick={handleBack} title="Zpět">
            <FontAwesomeIcon icon={faArrowLeft} />
            Zpět
          </IconButton>
        </HeaderActions>
      </PageHeader>

      <ContentLayout $fullscreen={isFullscreen}>
        {/* LEVÁ STRANA - FORMULÁŘ (60%) */}
        <FormColumn>
          <FormColumnHeader>
            <SectionTitle>
              <FontAwesomeIcon icon={faCreditCard} />
              Údaje faktury
            </SectionTitle>
          </FormColumnHeader>

          <FormColumnContent>
            {error && (
              <ErrorAlert>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {error}
              </ErrorAlert>
            )}

            <FakturaCard $isEditing={true}>
            {/* GRID 3x - ŘÁDEK 1: Ev. číslo (1 sloupec) | Předmět (2 sloupce) */}
            <FieldRow $columns="1fr 1fr 1fr">
              <FieldGroup style={{ width: '100%' }}>
                <FieldLabel>
                  Vyberte objednávku dle ev. čísla
                </FieldLabel>
                <AutocompleteWrapper className="autocomplete-wrapper" style={{ width: '100%' }}>
                  <AutocompleteInput
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    disabled={!!orderId}
                    placeholder="Začněte psát evidenční číslo..."
                    style={{ width: '100%' }}
                  />
                  {showSuggestions && searchTerm && (
                    <AutocompleteDropdown>
                      {isSearching ? (
                        <SearchingSpinner>
                          <FontAwesomeIcon icon={faFileInvoice} spin />
                          {' Vyhledávám...'}
                        </SearchingSpinner>
                      ) : orderSuggestions.length > 0 ? (
                        orderSuggestions.map(order => {
                          // Získat poslední stav z workflow
                          let stavText = '';
                          
                          // Pole "stav" obsahuje český název aktuálního stavu (např. "Rozpracovaná")
                          if (order.stav) {
                            stavText = order.stav;
                          }
                          
                          // Případně lze použít stav_kod (JSON array) a vzít poslední
                          // např. ["SCHVALENA","ROZPRACOVANA"] -> "ROZPRACOVANA"
                          // Ale "stav" už obsahuje lidsky čitelný název, takže to stačí

                          // Barva badgeu podle stavu
                          const getStavColor = (stav) => {
                            const stavLower = (stav || '').toLowerCase();
                            if (stavLower.includes('dokončen') || stavLower.includes('zkontrolovan')) {
                              return { bg: '#d1fae5', text: '#065f46' }; // Zelená
                            }
                            if (stavLower.includes('fakturac') || stavLower.includes('věcná správnost')) {
                              return { bg: '#dbeafe', text: '#1e40af' }; // Modrá
                            }
                            if (stavLower.includes('odeslan') || stavLower.includes('potvr')) {
                              return { bg: '#e0e7ff', text: '#3730a3' }; // Indigo
                            }
                            if (stavLower.includes('schval')) {
                              return { bg: '#fef3c7', text: '#92400e' }; // Žlutá
                            }
                            return { bg: '#e5e7eb', text: '#374151' }; // Šedá (default)
                          };

                          const stavColors = getStavColor(stavText);

                          return (
                            <OrderSuggestionItem
                              key={order.id}
                              onClick={() => handleSelectOrder(order)}
                            >
                              <OrderSuggestionTitle>
                                {order.cislo_objednavky || order.evidencni_cislo || `#${order.id}`}
                                {stavText && (
                                  <OrderSuggestionBadge $color={stavColors.bg} $textColor={stavColors.text} style={{ marginLeft: '0.5rem' }}>
                                    {stavText}
                                  </OrderSuggestionBadge>
                                )}
                                {order.max_cena_s_dph && (
                                  <OrderSuggestionBadge $color="#fef3c7" $textColor="#92400e" style={{ marginLeft: '0.5rem' }}>
                                    {parseFloat(order.max_cena_s_dph).toLocaleString('cs-CZ')} Kč
                                  </OrderSuggestionBadge>
                                )}
                              </OrderSuggestionTitle>
                              <OrderSuggestionDetail>
                                {order.dodavatel_nazev && (
                                  <span>
                                    <strong>{order.dodavatel_nazev}</strong>
                                    {order.dodavatel_ico && ` (IČO: ${order.dodavatel_ico})`}
                                  </span>
                                )}
                                {order.creator && (
                                  <span>Objednatel: {order.creator}</span>
                                )}
                                {order.schvalovatel && (
                                  <span>Schvalovatel: {order.schvalovatel}</span>
                                )}
                              </OrderSuggestionDetail>
                            </OrderSuggestionItem>
                          );
                        })
                      ) : (
                        <NoResults>Žádné objednávky nenalezeny</NoResults>
                      )}
                    </AutocompleteDropdown>
                  )}
                </AutocompleteWrapper>
                <HelpText>
                  {orderId 
                    ? 'Objednávka je předvyplněna z kontextu' 
                    : 'Nepovinné - pokud faktura není vázána na objednávku, nechte prázdné'}
                </HelpText>
              </FieldGroup>

              {/* Předmět - dynamicky zobrazený při výběru objednávky (zabere 2 sloupce) */}
              <FieldGroup style={{ gridColumn: 'span 2' }}>
                <FieldLabel>Předmět</FieldLabel>
                <div style={{ 
                  padding: '0.75rem', 
                  background: orderData ? '#f0f9ff' : '#f9fafb', 
                  border: orderData ? '2px solid #3b82f6' : '2px solid #e5e7eb', 
                  borderRadius: '8px',
                  color: orderData ? '#1e40af' : '#9ca3af',
                  fontWeight: orderData ? '500' : '400',
                  minHeight: '44px'
                }}>
                  {orderData ? (orderData.predmet || '—') : '—'}
                </div>
              </FieldGroup>
            </FieldRow>

            {/* GRID 3x - ŘÁDEK 2: Datum doručení | Datum vystavení | Datum splatnosti */}
            <FieldRow $columns="1fr 1fr 1fr">
              <FieldGroup>
                <FieldLabel>
                  Datum doručení <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <DatePicker
                  value={formData.fa_datum_doruceni}
                  onChange={(date) => setFormData(prev => ({ ...prev, fa_datum_doruceni: date }))}
                  placeholder="dd.mm.rrrr"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>
                  Datum vystavení <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <DatePicker
                  value={formData.fa_datum_vystaveni}
                  onChange={(date) => setFormData(prev => ({ ...prev, fa_datum_vystaveni: date }))}
                  placeholder="dd.mm.rrrr"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>
                  Datum splatnosti <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <DatePicker
                  value={formData.fa_datum_splatnosti}
                  onChange={(date) => setFormData(prev => ({ ...prev, fa_datum_splatnosti: date }))}
                  placeholder="dd.mm.rrrr"
                />
              </FieldGroup>
            </FieldRow>

            {/* GRID 3x - ŘÁDEK 3: Typ faktury | Variabilní symbol | Částka vč. DPH */}
            <FieldRow $columns="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" $gap="1rem">
              <FieldGroup>
                <FieldLabel>
                  Typ faktury <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <CustomSelect
                  field="fa_typ"
                  value={formData.fa_typ}
                  onChange={(e) => setFormData(prev => ({ ...prev, fa_typ: e.target.value }))}
                  options={[
                    { id: 'BEZNA', nazev: 'Běžná faktura' },
                    { id: 'ZALOHOVA', nazev: 'Zálohová faktura' },
                    { id: 'OPRAVNA', nazev: 'Opravná faktura' },
                    { id: 'PROFORMA', nazev: 'Proforma' },
                    { id: 'DOBROPIS', nazev: 'Dobropis' }
                  ]}
                  placeholder="-- Vyberte typ --"
                  required={true}
                  selectStates={selectStates}
                  setSelectStates={setSelectStates}
                  searchStates={searchStates}
                  setSearchStates={setSearchStates}
                  touchedSelectFields={touchedSelectFields}
                  setTouchedSelectFields={setTouchedSelectFields}
                  toggleSelect={(field) => setSelectStates(prev => ({ ...prev, [field]: !prev[field] }))}
                  filterOptions={(options, searchTerm) => {
                    if (!searchTerm) return options;
                    return options.filter(opt => 
                      opt.nazev?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  }}
                  getOptionLabel={(option) => option?.nazev || ''}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>
                  Variabilní symbol <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <Input
                  type="text"
                  name="fa_cislo_vema"
                  value={formData.fa_cislo_vema}
                  onChange={handleInputChange}
                  placeholder="12345678"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>
                  <FontAwesomeIcon icon={faMoneyBillWave} />
                  Částka vč. DPH <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <CurrencyInputWrapper>
                  <Input
                    type="text"
                    name="fa_castka"
                    value={formData.fa_castka}
                    onChange={handleInputChange}
                    placeholder="25 000,50"
                    style={{textAlign: 'right', paddingRight: '40px', width: '100%'}}
                  />
                  <CurrencySymbol>Kč</CurrencySymbol>
                </CurrencyInputWrapper>
              </FieldGroup>
            </FieldRow>

            {/* GRID 1x - ŘÁDEK 5: Poznámka (celá šířka) */}
            <FieldRow $columns="1fr">
              <FieldGroup>
                <FieldLabel>
                  Poznámka
                </FieldLabel>
                <Textarea
                  name="fa_poznamka"
                  value={formData.fa_poznamka}
                  onChange={handleInputChange}
                  placeholder="Volitelná poznámka..."
                />
              </FieldGroup>
            </FieldRow>

            {/* Příloha */}
            <FieldRow>
              <FieldGroup>
                <FieldLabel>
                  <FontAwesomeIcon icon={faUpload} />
                  Příloha faktury
                </FieldLabel>
                <FileInputWrapper>
                  <FileInputLabel htmlFor="file-upload">
                    <FontAwesomeIcon icon={faUpload} size="2x" />
                    <div>Klikněte nebo přetáhněte soubor</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3af' }}>
                      Podporované formáty: PDF, ISDOC, DOCX, XLSX, obrázky (JPG, PNG, GIF)
                    </div>
                  </FileInputLabel>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.isdoc,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                  />
                </FileInputWrapper>
                {formData.file && (
                  <SelectedFileName>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981' }} />
                    <strong>Vybraný soubor:</strong> {formData.file.name}
                  </SelectedFileName>
                )}
              </FieldGroup>
            </FieldRow>
          </FakturaCard>

          {/* TLAČÍTKA */}
          <ButtonGroup>
            <Button $variant="secondary" onClick={handleBack} disabled={loading}>
              <FontAwesomeIcon icon={faTimes} />
              Zrušit
            </Button>
            <Button $variant="primary" onClick={handleSubmit} disabled={loading}>
              <FontAwesomeIcon icon={loading ? faExclamationTriangle : faSave} />
              {loading ? 'Ukládám...' : 'Zaevidovat fakturu'}
            </Button>
          </ButtonGroup>
          </FormColumnContent>
        </FormColumn>

        {/* PRAVÁ STRANA - NÁHLED OBJEDNÁVKY (40%) */}
        <PreviewColumn>
          <PreviewColumnHeader>
            <SectionTitle>
              <FontAwesomeIcon icon={faBuilding} />
              Náhled objednávky
              {orderData && (
                <span style={{marginLeft: '1rem', fontSize: '1.1rem', fontWeight: 700, color: '#1e40af'}}>
                  {orderData.cislo_objednavky || `#${orderData.id}`}
                </span>
              )}
            </SectionTitle>
            {orderData && (
              <ToggleButton
                onClick={() => {
                  if (hasAnySectionCollapsed) {
                    orderFormRef.current?.expandAll();
                  } else {
                    orderFormRef.current?.collapseAll();
                  }
                }}
              >
                <FontAwesomeIcon icon={hasAnySectionCollapsed ? faChevronDown : faChevronUp} />
                {hasAnySectionCollapsed ? 'Rozbalit vše' : 'Sbalit vše'}
              </ToggleButton>
            )}
          </PreviewColumnHeader>

          <PreviewColumnContent>
          {orderLoading && (
            <LoadingOverlay>
              <LoadingSpinner />
              <div>Načítám objednávku...</div>
            </LoadingOverlay>
          )}

          {!orderLoading && !orderData && formData.order_id && (
            <ErrorAlert>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              Nepodařilo se načíst objednávku ID {formData.order_id}
            </ErrorAlert>
          )}

          {!orderLoading && !orderData && !formData.order_id && (
            <div style={{ color: '#94a3af', textAlign: 'center', padding: '3rem' }}>
              <FontAwesomeIcon icon={faBuilding} size="3x" style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Žádná objednávka nevybrána</div>
              <div style={{ fontSize: '0.9rem' }}>Začněte psát do pole "Vyberte objednávku"</div>
            </div>
          )}

          {!orderLoading && orderData && (
            <OrderFormReadOnly 
              ref={orderFormRef} 
              orderData={orderData}
              onCollapseChange={setHasAnySectionCollapsed}
            />
          )}

          {false && orderData && (
            <OrderPreviewCard>
              <OrderHeaderRow>
                <OrderNumber>
                  {orderData.evidencni_cislo || `Obj. #${orderData.id}`}
                </OrderNumber>
                <OrderBadge $color={orderData.stav_workflow_kod === 'ODESLANA' ? '#10b981' : '#3b82f6'}>
                  {orderData.stav_workflow_nazev || 'Nezn. stav'}
                </OrderBadge>
              </OrderHeaderRow>

              <OrderDetailRow>
                <OrderDetailLabel>Předmět:</OrderDetailLabel>
                <OrderDetailValue style={{ fontWeight: 500 }}>
                  {orderData.predmet || 'N/A'}
                </OrderDetailValue>
              </OrderDetailRow>

              <OrderDetailRow>
                <OrderDetailLabel>
                  <FontAwesomeIcon icon={faMoneyBillWave} /> Max. cena s DPH:
                </OrderDetailLabel>
                <OrderDetailValue style={{ fontWeight: 600, color: '#1e40af' }}>
                  {orderData.max_cena_s_dph 
                    ? `${Number(orderData.max_cena_s_dph).toLocaleString('cs-CZ')} Kč` 
                    : 'N/A'}
                </OrderDetailValue>
              </OrderDetailRow>

              <OrderDetailRow>
                <OrderDetailLabel>
                  <FontAwesomeIcon icon={faBuilding} /> Příkazce:
                </OrderDetailLabel>
                <OrderDetailValue>
                  {orderData._enriched?.prikazce?.display_name || orderData.prikazce_id || 'N/A'}
                </OrderDetailValue>
              </OrderDetailRow>

              {orderData._enriched?.dodavatel?.ico && (
                <OrderDetailRow>
                  <OrderDetailLabel>IČO dodavatele:</OrderDetailLabel>
                  <OrderDetailValue>
                    {orderData._enriched.dodavatel.ico}
                  </OrderDetailValue>
                </OrderDetailRow>
              )}

              {orderData.dodavatel_nazev && (
                <OrderDetailRow>
                  <OrderDetailLabel>Dodavatel:</OrderDetailLabel>
                  <OrderDetailValue>
                    {orderData.dodavatel_nazev}
                  </OrderDetailValue>
                </OrderDetailRow>
              )}

              <OrderDetailRow>
                <OrderDetailLabel>
                  <FontAwesomeIcon icon={faCalendar} /> Datum vytvoření:
                </OrderDetailLabel>
                <OrderDetailValue>
                  {orderData.datum_vytvoreni ? formatDateOnly(orderData.datum_vytvoreni) : 'N/A'}
                </OrderDetailValue>
              </OrderDetailRow>

              {orderData.garant_cele_jmeno && (
                <OrderDetailRow>
                  <OrderDetailLabel>Garant:</OrderDetailLabel>
                  <OrderDetailValue>
                    {orderData.garant_cele_jmeno}
                  </OrderDetailValue>
                </OrderDetailRow>
              )}

              {orderData.cislo_smlouvy && (
                <OrderDetailRow>
                  <OrderDetailLabel>Číslo smlouvy:</OrderDetailLabel>
                  <OrderDetailValue>
                    {orderData.cislo_smlouvy}
                  </OrderDetailValue>
                </OrderDetailRow>
              )}
            </OrderPreviewCard>
          )}
          </PreviewColumnContent>
        </PreviewColumn>
      </ContentLayout>
    </>
  );

  // Render: normální režim vs fullscreen režim (portal)
  if (isFullscreen) {
    return createPortal(
      <FullscreenOverlay>
        {PageContent}
      </FullscreenOverlay>,
      document.body
    );
  }

  // Normální režim
  return (
    <PageContainer>
      {PageContent}
    </PageContainer>
  );
}
