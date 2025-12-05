import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthContext } from '../context/AuthContext';
import {
  faChartLine,
  faMoneyBillWave,
  faBuilding,
  faCheckCircle,
  faClock,
  faTags,
  faExclamationTriangle,
  faCalendarAlt,
  faFileInvoice,
  faDownload,
  faFilter,
  faTimes,
  faChevronDown,
  faChevronUp,
  faSearch,
  faExpand
} from '@fortawesome/free-solid-svg-icons';
import ReportDataTable from '../components/reports/ReportDataTable';
import DatePicker from '../components/DatePicker';
import { universalSearch } from '../services/apiUniversalSearch';
import SlideInDetailPanel from '../components/UniversalSearch/SlideInDetailPanel';
import { OrderDetailView } from '../components/UniversalSearch/EntityDetailViews';
import {
  fetchOrdersAboveAmount,
  fetchOrdersBySupplier,
  fetchOrdersByStatus,
  fetchOrdersByPeriod,
  fetchPendingOrders,
  fetchAssetOrders,
  fetchOverdueOrders,
  fetchOrdersByCategory,
  exportToCSV
} from '../services/api25reports';
import { fetchSuppliersList, fetchCiselniky } from '../services/api2auth';
import { getDruhyObjednavky25 } from '../services/api25orders';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 2rem 1rem;
`;

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PageTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #2563eb;
  }
`;

const TabsContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 0.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 0.5rem;
`;

const TabButton = styled.button`
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.active ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent'};
  color: ${props => props.active ? 'white' : '#6b7280'};

  &:hover {
    background: ${props => props.active ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)' : '#f3f4f6'};
    color: ${props => props.active ? 'white' : '#1f2937'};
  }
`;

const FiltersPanel = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const FiltersPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  cursor: pointer;
  user-select: none;
`;

const FiltersPanelTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #2563eb;
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DateRangeGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  grid-column: span 2;
  
  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const DateRangeInputs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const InputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  font-size: 0.875rem;
`;

const Input = styled.input`
  width: 100%;
  padding: ${props => props.$hasIcon ? '0.75rem 0.75rem 0.75rem 2.5rem' : '0.75rem'};
  border: 2px solid ${props => props.hasError ? '#ef4444' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #1f2937;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#2563eb'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)'};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SelectIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  font-size: 0.875rem;
  z-index: 1;
`;

const Select = styled.select`
  width: 100%;
  padding: ${props => props.$hasIcon ? '0.75rem 2.5rem 0.75rem 2.5rem' : '0.75rem'};
  border: 2px solid ${props => props.hasError ? '#ef4444' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #1f2937;
  transition: all 0.2s;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5rem;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#2563eb'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)'};
  }

  option {
    padding: 0.5rem;
  }
`;

const ErrorMessage = styled.span`
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
  display: block;
`;

const ReportsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ReportCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border-color: #2563eb;
  }
`;

const ReportCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ReportIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: ${props => props.color || 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'};
  color: white;
  flex-shrink: 0;
`;

const ReportCardContent = styled.div`
  flex: 1;
`;

const ReportCardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
`;

const ReportCardDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
`;

const ReportCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const PriorityBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch(props.priority) {
      case 'high': return '#fee2e2';
      case 'medium': return '#fef3c7';
      case 'low': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch(props.priority) {
      case 'high': return '#991b1b';
      case 'medium': return '#92400e';
      case 'low': return '#1e40af';
      default: return '#374151';
    }
  }};
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #d1fae5;
  color: #065f46;
`;

// Tabulka reportu
const ReportResultsSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ResultsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const ResultsTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const FullscreenIconButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #2563eb;
    background: #f3f4f6;
  }
`;

const ResultsActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const ActionButton = styled.button`
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ClearButton = styled(ActionButton)`
  background: #f3f4f6;
  color: #374151;

  &:hover {
    background: #e5e7eb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    &:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    }
  ` : `
    background: #f3f4f6;
    color: #374151;
    &:hover {
      background: #e5e7eb;
    }
  `}
`;

const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorAlert = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

// Prokliknutelné číslo objednávky
const OrderNumberLink = styled.span`
  color: #2563eb;
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
  transition: color 0.2s;

  &:hover {
    color: #1d4ed8;
  }
`;

// Autocomplete pro dodavatele
const SupplierAutocompleteWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SupplierDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 320px;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 100;
`;

const SupplierOption = styled.div`
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f3f4f6;
  background: ${props => props.$selected ? '#eff6ff' : 'white'};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f9fafb;
  }

  ${props => props.$selected && `
    background: #eff6ff;
    border-left: 3px solid #2563eb;
  `}
`;

const SupplierName = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SupplierMeta = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const SupplierBadge = styled.span`
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #dbeafe;
  color: #1e40af;
`;

const SupplierNoResults = styled.div`
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
`;

const SupplierLoading = styled.div`
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

// =============================================================================
// HLAVNÍ KOMPONENTA
// =============================================================================

const ReportsPage = () => {
  // Kontexty (stejně jako Orders25List)
  const { user, token, username, user_id, userDetail } = useContext(AuthContext);
  
  // Ref pro fullscreen funkci
  const tableFullscreenRef = useRef(null);

  // LocalStorage helpers (per user, stejně jako Orders25List)
  const currentUserId = useMemo(() => parseInt(user_id, 10), [user_id]);
  
  const getUserKey = (baseKey) => `${baseKey}_user_${currentUserId || 'anon'}`;
  
  const getUserStorage = (baseKey, defaultValue = null) => {
    try {
      const saved = localStorage.getItem(getUserKey(baseKey));
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };
  
  const setUserStorage = (baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (e) {
      // Failed to save to localStorage
    }
  };

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Report data
  const [currentReport, setCurrentReport] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [reportTitle, setReportTitle] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  // Filtry - výchozí hodnoty
  const [filters, setFilters] = useState({
    amount: '100000',
    supplier: '',
    status: 'SCHVALENO',
    dateFrom: '',
    dateTo: '',
    days: '5',
    category: 'TECHNIKA'
  });

  // Načíst dodavatele, stavy a druhy objednávek z API (stejně jako Orders25List)
  const [dodavatele, setDodavatele] = useState([]);
  const [stavyObjednavek, setStavyObjednavek] = useState([]);
  const [druhyObjednavek, setDruhyObjednavek] = useState([]);
  const [loadingDictionaries, setLoadingDictionaries] = useState(true);
  
  // Supplier autocomplete state
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState(-1);
  const [supplierInputFocused, setSupplierInputFocused] = useState(false);
  const supplierDebounceTimer = useRef(null);
  const supplierWrapperRef = useRef(null);
  
  // Slide panel state pro detail objednávky
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Načíst filtry z localStorage po mount
  useEffect(() => {
    if (currentUserId) {
      const savedFilters = getUserStorage('reports_filters');
      if (savedFilters) {
        setFilters(savedFilters);
        // Synchronizovat supplierQuery s načteným filtrem
        if (savedFilters.supplier) {
          setSupplierQuery(savedFilters.supplier);
        }
      }
    }
  }, [currentUserId]);
  
  // Uložit filtry do localStorage při změně
  useEffect(() => {
    if (currentUserId && filters) {
      setUserStorage('reports_filters', filters);
    }
  }, [filters, currentUserId]);
  
  useEffect(() => {
    const loadDictionaries = async () => {
      // Stejně jako Orders25List - zkontrolovat dostupnost dat z AuthContext
      if (!user || !token || !username) {
        return;
      }

      try {
        const usek_zkr = userDetail?.usek_zkr || user?.usek_zkr || '';
        
        setLoadingDictionaries(true);

        // Načíst dodavatele
        const suppliersResult = await fetchSuppliersList({ token, username, user_id, usek_zkr });
        if (suppliersResult.success && suppliersResult.data) {
          const sortedSuppliers = (suppliersResult.data || []).sort((a, b) => {
            const nameA = (a.nazev || '').toLowerCase();
            const nameB = (b.nazev || '').toLowerCase();
            return nameA.localeCompare(nameB, 'cs');
          });
          setDodavatele(sortedSuppliers.map(d => ({
            value: d.nazev,
            label: d.nazev
          })));
        }

        // Načíst stavy objednávek z číselníků (stejně jako Orders25List)
        const statesData = await fetchCiselniky({ token, username, typ: 'OBJEDNAVKA' });
        const sortedStates = (statesData || []).sort((a, b) => {
          const nameA = (a.nazev_stavu || a.nazev || '').toLowerCase();
          const nameB = (b.nazev_stavu || b.nazev || '').toLowerCase();
          return nameA.localeCompare(nameB, 'cs');
        });
        setStavyObjednavek(sortedStates.map(s => ({
          value: s.nazev_stavu || s.nazev || s.kod_stavu,
          label: s.nazev_stavu || s.nazev || s.kod_stavu
        })));

        // Načíst druhy objednávek (stejně jako Orders25List)
        const druhyData = await getDruhyObjednavky25({ token, username });
        const sortedDruhy = (druhyData || []).sort((a, b) => {
          const nameA = (a.nazev_stavu || a.nazev || '').toLowerCase();
          const nameB = (b.nazev_stavu || b.nazev || '').toLowerCase();
          return nameA.localeCompare(nameB, 'cs');
        });
        setDruhyObjednavek(sortedDruhy.map(d => ({
          value: d.kod_stavu,  // KÓD (číselná hodnota) pro BE
          label: d.nazev_stavu || d.nazev || d.kod_stavu,  // NÁZEV pro zobrazení
          kod: d.kod_stavu,
          nazev: d.nazev_stavu
        })));
        
        setLoadingDictionaries(false);
      } catch (err) {
        console.error('Chyba při načítání číselníků:', err);
        setLoadingDictionaries(false);
      }
    };
    loadDictionaries();
  }, [user, token, username, userDetail]);

  // Universal Search pro dodavatele
  useEffect(() => {
    if (!supplierQuery || supplierQuery.length < 3) {
      setSupplierSuggestions([]);
      setShowSupplierDropdown(false);
      return;
    }

    if (supplierDebounceTimer.current) {
      clearTimeout(supplierDebounceTimer.current);
    }

    supplierDebounceTimer.current = setTimeout(async () => {
      try {
        setSupplierLoading(true);
        // Zobrazit dropdown jen když má input fokus
        if (supplierInputFocused) {
          setShowSupplierDropdown(true);
        }
        
        
        const result = await universalSearch({
          query: supplierQuery,
          categories: ['suppliers_from_orders'],
          limit: 10
        });
        
        
        // Backend vrací status: 'ok' (ne 'success')
        if (result.status === 'ok' && result.categories?.suppliers_from_orders?.results) {
          setSupplierSuggestions(result.categories.suppliers_from_orders.results);
        } else {
          setSupplierSuggestions([]);
        }
      } catch (err) {
        console.error('[ReportsPage] ❌ Supplier search error:', err);
        setSupplierSuggestions([]);
      } finally {
        setSupplierLoading(false);
      }
    }, 500);

    return () => {
      if (supplierDebounceTimer.current) {
        clearTimeout(supplierDebounceTimer.current);
      }
    };
  }, [supplierQuery, token, username]);

  // Click outside handler pro supplier dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierWrapperRef.current && !supplierWrapperRef.current.contains(event.target)) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validace povinných parametrů pro report
  const validateReport = (report) => {
    const errors = {};
    const required = report.requiredFields || [];
    
    required.forEach(field => {
      if (!filters[field] || filters[field] === '') {
        errors[field] = 'Povinné pole';
      }
    });
    
    return errors;
  };

  // Helper pro změnu filtru - vymaže validační chybu pro daný field
  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    
    // Vymazat validační chybu pro tento field
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  // Handler pro změnu supplier query
  const handleSupplierQueryChange = (e) => {
    const value = e.target.value;
    setSupplierQuery(value);
    
    // Update filter value
    handleFilterChange('supplier', value);
    
    // Reset selected index when typing
    setSelectedSupplierIndex(-1);
    
    // Show dropdown if typing
    if (value.length >= 3) {
      setShowSupplierDropdown(true);
    }
  };

  // Handler pro výběr dodavatele ze seznamu
  const handleSupplierSelect = (supplier) => {
    const supplierName = supplier.dodavatel_nazev || '';
    setSupplierQuery(supplierName);
    handleFilterChange('supplier', supplierName);
    setShowSupplierDropdown(false);
    setSelectedSupplierIndex(-1);
    
  };

  // Handler pro keyboard navigaci v supplier dropdown
  const handleSupplierKeyDown = (e) => {
    if (!showSupplierDropdown) return;

    // Získej aktuální seznam (suggestions + fallback dodavatelé)
    const allSuggestions = supplierSuggestions.length > 0 
      ? supplierSuggestions 
      : dodavatele
          .filter(d => d.value.toLowerCase().includes(supplierQuery.toLowerCase()))
          .slice(0, 5)
          .map(d => ({ dodavatel_nazev: d.value, pocet_objednavek: 0 }));

    if (allSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSupplierIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSupplierIndex(prev => prev > 0 ? prev - 1 : -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSupplierIndex >= 0 && allSuggestions[selectedSupplierIndex]) {
          handleSupplierSelect(allSuggestions[selectedSupplierIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowSupplierDropdown(false);
        setSelectedSupplierIndex(-1);
        break;

      default:
        break;
    }
  };

  // Handler pro otevření detailu objednávky ve slide panelu
  const handleOpenOrderDetail = (order) => {
    
    // Zajistit, že order má všechna potřebná pole pro OrderDetailView
    // aktivni může být: true/false (boolean), '1'/'0' (string), 1/0 (number)
    let aktivniNormalized;
    if (order.aktivni === true || order.aktivni === '1' || order.aktivni === 1) {
      aktivniNormalized = '1'; // OrderDetailView očekává string '1'
    } else if (order.aktivni === false || order.aktivni === '0' || order.aktivni === 0) {
      aktivniNormalized = '0'; // OrderDetailView očekává string '0'
    } else {
      aktivniNormalized = '1'; // Default: aktivní
    }
    
    const orderData = {
      ...order,
      aktivni: aktivniNormalized,
      // Zajistit id pro OrderDetailView
      id: order.id || order.objednavka_id
    };
    
    setSelectedOrder(orderData);
    setDetailPanelOpen(true);
  };

  // Handler pro zavření slide panelu
  const handleCloseDetailPanel = () => {
    setDetailPanelOpen(false);
    setTimeout(() => {
      setSelectedOrder(null);
    }, 300);
  };

  // Reporty
  const reports = {
    basic: [
      {
        id: 'above-amount',
        title: 'Objednávky nad částku',
        description: 'Zobrazí objednávky přesahující zadanou částku',
        icon: faMoneyBillWave,
        color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        priority: 'high',
        requiredFields: ['amount'],
        handler: async () => {
          const amount = parseFloat(filters.amount);
          const result = await fetchOrdersAboveAmount(amount, {}, token, username);
          return {
            data: result.data,
            title: `Objednávky nad ${formatNumber(amount)} Kč`
          };
        }
      },
      {
        id: 'by-supplier',
        title: 'Objednávky podle dodavatele',
        description: 'Filtruje objednávky podle vybraného dodavatele',
        icon: faBuilding,
        color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        priority: 'high',
        requiredFields: ['supplier'],
        handler: async () => {
          const result = await fetchOrdersBySupplier(filters.supplier, {}, token, username);
          return {
            data: result.data,
            title: `Objednávky dodavatele: ${filters.supplier}`
          };
        }
      },
      {
        id: 'by-status',
        title: 'Objednávky podle stavu',
        description: 'Zobrazí objednávky ve zvoleném stavu',
        icon: faCheckCircle,
        color: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        priority: 'medium',
        requiredFields: ['status'],
        handler: async () => {
          const result = await fetchOrdersByStatus(filters.status, {}, token, username);
          const stavLabel = stavyObjednavek.find(s => s.value === filters.status)?.label || filters.status;
          return {
            data: result.data,
            title: `Objednávky ve stavu: ${stavLabel}`
          };
        }
      },
      {
        id: 'by-period',
        title: 'Objednávky za období',
        description: 'Zobrazí objednávky vytvořené v zadaném období',
        icon: faCalendarAlt,
        color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        priority: 'medium',
        requiredFields: ['dateFrom', 'dateTo'],
        handler: async () => {
          const result = await fetchOrdersByPeriod(filters.dateFrom, filters.dateTo, {}, token, username);
          return {
            data: result.data,
            title: `Objednávky: ${filters.dateFrom} - ${filters.dateTo}`
          };
        }
      }
    ],
    monitoring: [
      {
        id: 'pending',
        title: 'Neschválené objednávky',
        description: `Objednávky čekající na schválení déle než ${filters.days} dní`,
        icon: faExclamationTriangle,
        color: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        priority: 'high',
        requiredFields: ['days'],
        handler: async () => {
          const result = await fetchPendingOrders(parseInt(filters.days), {}, token, username);
          return {
            data: result.data,
            title: `Neschválené objednávky (> ${filters.days} dní)`
          };
        }
      },
      {
        id: 'overdue',
        title: 'Objednávky po termínu',
        description: 'Objednávky po termínu dodání, které ještě nejsou dokončeny',
        icon: faClock,
        color: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        priority: 'high',
        requiredFields: [],
        handler: async () => {
          const result = await fetchOverdueOrders({}, token, username);
          return {
            data: result.data,
            title: 'Objednávky po termínu dodání'
          };
        }
      },
      {
        id: 'asset',
        title: 'Majetkové objednávky',
        description: 'Zobrazí pouze majetkové objednávky a DHM',
        icon: faFileInvoice,
        color: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        priority: 'medium',
        requiredFields: [],
        handler: async () => {
          const result = await fetchAssetOrders({}, token, username);
          return {
            data: result.data,
            title: 'Majetkové objednávky'
          };
        }
      },
      {
        id: 'by-category',
        title: 'Objednávky podle druhu',
        description: 'Filtruje objednávky podle druhu objednávky',
        icon: faTags,
        color: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        priority: 'low',
        requiredFields: ['category'],
        handler: async () => {
          const result = await fetchOrdersByCategory(filters.category, {}, token, username);
          const druhLabel = druhyObjednavek.find(d => d.value === filters.category)?.label || filters.category;
          return {
            data: result.data,
            title: `Objednávky druhu: ${druhLabel}`
          };
        }
      }
    ]
  };

  // Helper funkce pro získání celkové ceny s DPH Z POLOŽEK OBJEDNÁVKY
  // Stejná logika jako Orders25List.getOrderTotalPriceWithDPH
  const getOrderTotalPriceWithDPH = (order) => {
    // 1. Zkus vrácené pole z BE (polozky_celkova_cena_s_dph je již součet)
    if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
      const value = parseFloat(order.polozky_celkova_cena_s_dph);
      if (!isNaN(value)) return value;
    }

    // 2. Spočítej z položek
    if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
      const total = order.polozky.reduce((sum, item) => {
        const cena = parseFloat(item.cena_s_dph || 0);
        return sum + (isNaN(cena) ? 0 : cena);
      }, 0);
      return total;
    }

    // 3. Pokud nejsou položky, vrať 0
    return 0;
  };

  // Formátování
  const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('cs-CZ');
    } catch {
      return value;
    }
  };

  // Generování reportu - zobrazí tabulku pod dlaždicemi
  const handleGenerateReport = async (report) => {
    // Validace povinných parametrů
    const errors = validateReport(report);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Vymazat předchozí validační chyby
    setValidationErrors({});
    
    setLoading(true);
    setError(null);
    setCurrentReport(report);
    
    try {
      const result = await report.handler();
      
      if (!result.data || result.data.length === 0) {
        setError('Žádná data nebyla nalezena pro zvolené filtry.');
        setReportData([]);
        setReportTitle('');
        setLoading(false);
        return;
      }
      
      setReportData(result.data);
      setReportTitle(result.title);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(`Chyba při generování reportu: ${err.message}`);
      setReportData([]);
      setReportTitle('');
    } finally {
      setLoading(false);
    }
  };

  // Export
  const handleExportReport = () => {
    if (!reportData || reportData.length === 0) return;
    
    const filename = `report_${currentReport?.id}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(reportData, filename);
  };

  // Vymazat výsledky reportu
  const handleClearReport = () => {
    setReportData([]);
    setReportTitle('');
    setCurrentReport(null);
    setError(null);
  };

  // Sloupce pro tabulku (používají enriched data z Order V2 API)
  // První sloupec je dynamický podle typu reportu
  const getOrderColumns = () => {
    const baseColumns = [
      {
        accessorKey: 'cislo_objednavky',
        header: 'Číslo objednávky',
        cell: info => {
          const cislo = info.getValue();
          const order = info.row.original;
          return cislo ? (
            <OrderNumberLink onClick={() => handleOpenOrderDetail(order)}>
              {cislo}
            </OrderNumberLink>
          ) : '-';
        },
        enableSorting: true,
        enableColumnFilter: true
      },
      {
        accessorKey: 'dt_vytvoreni',
        header: 'Datum vytvoření',
        cell: info => formatDate(info.getValue() || info.row.original.dt_objednavky),
        enableSorting: true,
        enableColumnFilter: true,
        meta: { align: 'center' }
      },
      {
        accessorKey: 'predmet',
        header: 'Předmět',
        cell: info => info.getValue() || '-',
        enableSorting: true,
        enableColumnFilter: true
      },
      {
        accessorKey: 'dodavatel_nazev',
        header: 'Dodavatel',
        cell: info => info.getValue() || '-',
        enableSorting: true,
        enableColumnFilter: true
      },
      {
        accessorKey: 'dodavatel_ico',
        header: 'IČO dodavatele',
        cell: info => info.getValue() || '-',
        enableSorting: true,
        enableColumnFilter: true
      },
      {
        accessorKey: 'stav_objednavky',
        header: 'Stav',
        cell: info => {
          const order = info.row.original;
          // Enriched stav_workflow objekt
          if (order.stav_workflow) {
            if (typeof order.stav_workflow === 'object') {
              return order.stav_workflow.nazev_stavu || order.stav_workflow.nazev || 'Neznámý stav';
            }
            return String(order.stav_workflow);
          }
          return order.stav_objednavky || '-';
        },
        enableSorting: true,
        enableColumnFilter: true
      },
      {
        accessorKey: 'cena_s_dph',
        header: 'Cena s DPH',
        cell: info => {
          const order = info.row.original;
          const cena = getOrderTotalPriceWithDPH(order);
          return formatCurrency(cena);
        },
        enableSorting: true,
        enableColumnFilter: true,
        meta: { align: 'right' }
      },
      {
        accessorKey: 'druh_objednavky',
        header: 'Druh',
        cell: info => {
          const order = info.row.original;
          // Podpora různých formátů dat z backendu (stejně jako Orders25List)
          // 1. Enriched: order.druh_objednavky = {kod, nazev}
          if (order.druh_objednavky?.nazev) {
            return order.druh_objednavky.nazev;
          }
          // 2. Direct: order.druh_objednavky_nazev (string)
          if (order.druh_objednavky_nazev) {
            return order.druh_objednavky_nazev;
          }
          // 3. Code only: order.druh_objednavky_kod (string) - přelož přes číselník
          if (order.druh_objednavky_kod) {
            const druh = druhyObjednavek.find(d => d.kod === order.druh_objednavky_kod);
            return druh?.nazev || druh?.label || order.druh_objednavky_kod;
          }
          // 4. String/number value: order.druh_objednavky - přelož přes číselník
          if (order.druh_objednavky) {
            const druh = druhyObjednavek.find(d => d.kod === order.druh_objednavky || d.value === order.druh_objednavky);
            return druh?.nazev || druh?.label || order.druh_objednavky;
          }
          return '-';
        },
        enableSorting: true,
        enableColumnFilter: true
      },
      {
        accessorKey: 'objednatel',
        header: 'Objednatel',
        cell: info => {
          const order = info.row.original;
          // Enriched data - objednatel_uzivatel.cele_jmeno
          if (order.objednatel_uzivatel?.cele_jmeno) {
            return order.objednatel_uzivatel.cele_jmeno;
          }
          if (order.objednatel?.cele_jmeno) {
            return order.objednatel.cele_jmeno;
          }
          return '-';
        },
        enableSorting: true,
        enableColumnFilter: true
      },
      {
        accessorKey: 'garant',
        header: 'Garant',
        cell: info => {
          const order = info.row.original;
          // Enriched data - garant_uzivatel.cele_jmeno
          if (order.garant_uzivatel?.cele_jmeno) {
            return order.garant_uzivatel.cele_jmeno;
          }
          if (order.garant?.cele_jmeno) {
            return order.garant.cele_jmeno;
          }
          return '-';
        },
        enableSorting: true,
        enableColumnFilter: true
      },
      {
        accessorKey: 'termin_dodani',
        header: 'Termín dodání',
        cell: info => formatDate(info.getValue()),
        enableSorting: true,
        enableColumnFilter: true,
        meta: { align: 'center' }
      },
      {
        accessorKey: 'faktury_splatnost',
        header: 'Faktury splatnost',
        cell: info => {
          const order = info.row.original;
          const faktury = order.faktury || [];
          if (faktury.length === 0) return '-';
          
          // Zobrazit všechny splatnosti faktur na více řádcích
          const splatnosti = faktury
            .map(f => f.fa_datum_splatnosti || f.fa_splatnost)
            .filter(Boolean)
            .map(date => formatDate(date));
          
          if (splatnosti.length === 0) return '-';
          
          // Každé datum na nový řádek
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {splatnosti.map((datum, idx) => (
                <div key={idx}>{datum}</div>
              ))}
            </div>
          );
        },
        enableSorting: false,
        enableColumnFilter: false,
        meta: { align: 'center' }
      },
      {
        accessorKey: 'umisteni_majetku',
        header: 'Umístění majetku',
        cell: info => {
          const order = info.row.original;
          return order.vecna_spravnost_umisteni_majetku || '-';
        },
        enableSorting: true,
        enableColumnFilter: true
      }
    ];

    // Určit prioritní sloupec podle typu reportu
    let priorityColumn = null;
    
    if (currentReport) {
      switch (currentReport.id) {
        case 'above-amount':
          // Cena s DPH na první místo
          priorityColumn = baseColumns.find(col => col.accessorKey === 'cena_s_dph');
          break;
        
        case 'by-supplier':
          // Dodavatel + IČO na první místa
          priorityColumn = [
            baseColumns.find(col => col.accessorKey === 'dodavatel_nazev'),
            baseColumns.find(col => col.accessorKey === 'dodavatel_ico')
          ];
          break;
        
        case 'by-status':
          // Stav na první místo
          priorityColumn = baseColumns.find(col => col.accessorKey === 'stav_objednavky');
          break;
        
        case 'by-period':
          // Datum vytvoření na první místo
          priorityColumn = baseColumns.find(col => col.accessorKey === 'dt_vytvoreni');
          break;
        
        case 'pending':
          // Stav + Dní + Datum vytvoření na první místa
          priorityColumn = [
            baseColumns.find(col => col.accessorKey === 'stav_objednavky'),
            {
              accessorKey: 'days_pending',
              header: 'Dní',
              cell: info => {
                const order = info.row.original;
                const createdDate = order.dt_vytvoreni || order.datum_vytvoreni || order.dt_objednavky;
                if (!createdDate) return '-';
                const created = new Date(createdDate);
                const now = new Date();
                const daysDiff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
                return daysDiff;
              },
              enableSorting: true,
              enableColumnFilter: false,
              meta: { align: 'center' }
            },
            baseColumns.find(col => col.accessorKey === 'dt_vytvoreni')
          ];
          break;
        
        case 'overdue':
          // Faktury splatnost + Termín dodání + Stav na první místa
          priorityColumn = [
            baseColumns.find(col => col.accessorKey === 'faktury_splatnost'),
            baseColumns.find(col => col.accessorKey === 'termin_dodani'),
            baseColumns.find(col => col.accessorKey === 'stav_objednavky')
          ];
          break;
        
        case 'asset':
          // Stav → Umístění majetku → Druh objednávky na první místa
          priorityColumn = [
            baseColumns.find(col => col.accessorKey === 'stav_objednavky'),
            baseColumns.find(col => col.accessorKey === 'umisteni_majetku'),
            baseColumns.find(col => col.accessorKey === 'druh_objednavky')
          ];
          break;
        
        case 'by-category':
          // Druh objednávky na první místo
          priorityColumn = baseColumns.find(col => col.accessorKey === 'druh_objednavky');
          break;
        
        default:
          break;
      }
    }

    // Sestavit finální sloupce s prioritním sloupcem na začátku
    if (priorityColumn) {
      const priorityCols = Array.isArray(priorityColumn) ? priorityColumn : [priorityColumn];
      const priorityKeys = priorityCols.map(col => col.accessorKey);
      
      // Odebrat prioritní sloupce z base columns
      const remainingCols = baseColumns.filter(col => !priorityKeys.includes(col.accessorKey));
      
      // Vrátit prioritní sloupce + zbytek
      return [...priorityCols, ...remainingCols];
    }

    return baseColumns;
  };

  const currentReports = activeTab === 0 ? reports.basic : reports.monitoring;

  return (
    <PageWrapper>
      <PageContainer>
        {/* Header */}
        <PageHeader>
          <PageTitle>
            <FontAwesomeIcon icon={faChartLine} />
            Reporty
          </PageTitle>
        </PageHeader>

        {/* Tabs */}
        <TabsContainer>
          <TabButton active={activeTab === 0} onClick={() => setActiveTab(0)}>
            Základní reporty
          </TabButton>
          <TabButton active={activeTab === 1} onClick={() => setActiveTab(1)}>
            Monitoring & Kontrola
          </TabButton>
        </TabsContainer>

        {/* Filtry */}
        <FiltersPanel>
          <FiltersPanelHeader onClick={() => setFiltersExpanded(!filtersExpanded)}>
            <FiltersPanelTitle>
              <FontAwesomeIcon icon={faFilter} />
              Filtry pro reporty
            </FiltersPanelTitle>
            <FontAwesomeIcon icon={filtersExpanded ? faChevronUp : faChevronDown} />
          </FiltersPanelHeader>
          
          {filtersExpanded && (
            <FiltersGrid>
              <FilterGroup>
                <FilterLabel>Částka (Kč)</FilterLabel>
                <InputWrapper>
                  <InputIcon>
                    <FontAwesomeIcon icon={faMoneyBillWave} />
                  </InputIcon>
                  <Input
                    type="number"
                    value={filters.amount}
                    onChange={(e) => handleFilterChange('amount', e.target.value)}
                    placeholder="100000"
                    hasError={validationErrors.amount}
                    $hasIcon={true}
                  />
                </InputWrapper>
                {validationErrors.amount && <ErrorMessage>{validationErrors.amount}</ErrorMessage>}
              </FilterGroup>

              <FilterGroup>
                <FilterLabel>Dodavatel</FilterLabel>
                <SupplierAutocompleteWrapper ref={supplierWrapperRef}>
                  <InputWrapper>
                    <InputIcon>
                      <FontAwesomeIcon icon={faBuilding} />
                    </InputIcon>
                    <Input
                      type="text"
                      value={supplierQuery}
                      onChange={handleSupplierQueryChange}
                      onKeyDown={handleSupplierKeyDown}
                      onFocus={() => {
                        setSupplierInputFocused(true);
                        if (supplierQuery.length >= 3 && supplierSuggestions.length > 0) {
                          setShowSupplierDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        setSupplierInputFocused(false);
                        // Timeout aby klik na dropdown item stihl proběhnout
                        setTimeout(() => setShowSupplierDropdown(false), 200);
                      }}
                      placeholder="Začněte psát název dodavatele (min. 3 znaky)..."
                      hasError={validationErrors.supplier}
                      $hasIcon={true}
                    />
                  </InputWrapper>
                  {showSupplierDropdown && (
                    <SupplierDropdown>
                      {supplierLoading ? (
                        <SupplierLoading>
                          <FontAwesomeIcon icon={faSearch} spin />
                          Hledám dodavatele...
                        </SupplierLoading>
                      ) : supplierSuggestions.length > 0 ? (
                        supplierSuggestions.map((supplier, idx) => (
                          <SupplierOption
                            key={idx}
                            onClick={() => handleSupplierSelect(supplier)}
                            $selected={selectedSupplierIndex === idx}
                          >
                            <SupplierName>
                              {supplier.dodavatel_nazev}
                              {supplier.pocet_objednavek > 0 && (
                                <SupplierBadge>
                                  {supplier.pocet_objednavek} obj.
                                </SupplierBadge>
                              )}
                            </SupplierName>
                            <SupplierMeta>
                              {supplier.dodavatel_ico && <span>IČO: {supplier.dodavatel_ico}</span>}
                              {supplier.dodavatel_kontakt_email && <span>• {supplier.dodavatel_kontakt_email}</span>}
                              {supplier.posledni_pouziti && (
                                <span>• Poslední použití: {new Date(supplier.posledni_pouziti).toLocaleDateString('cs-CZ')}</span>
                              )}
                            </SupplierMeta>
                          </SupplierOption>
                        ))
                      ) : (
                        <>
                          <SupplierNoResults>
                            Žádní dodavatelé z objednávek pro "{supplierQuery}".
                          </SupplierNoResults>
                          {/* Fallback: Nabídnout dodavatele z číselníku */}
                          {dodavatele
                            .filter(d => d.value.toLowerCase().includes(supplierQuery.toLowerCase()))
                            .slice(0, 5)
                            .map((d, idx) => (
                              <SupplierOption
                                key={idx}
                                onClick={() => handleSupplierSelect({ dodavatel_nazev: d.value, pocet_objednavek: 0 })}
                                $selected={selectedSupplierIndex === idx}
                              >
                                <SupplierName>
                                  {d.value}
                                  <SupplierBadge style={{ background: '#f3f4f6', color: '#6b7280' }}>
                                    z číselníku
                                  </SupplierBadge>
                                </SupplierName>
                              </SupplierOption>
                            ))
                          }
                        </>
                      )}
                    </SupplierDropdown>
                  )}
                </SupplierAutocompleteWrapper>
                {validationErrors.supplier && <ErrorMessage>{validationErrors.supplier}</ErrorMessage>}
              </FilterGroup>

              <FilterGroup>
                <FilterLabel>Druh objednávky</FilterLabel>
                <SelectWrapper>
                  <SelectIcon>
                    <FontAwesomeIcon icon={faTags} />
                  </SelectIcon>
                  <Select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    disabled={loadingDictionaries}
                    hasError={validationErrors.category}
                    $hasIcon={true}
                  >
                    <option value="">{loadingDictionaries ? 'Načítám druhy...' : '-- Vyberte druh --'}</option>
                    {druhyObjednavek.map((druh) => (
                      <option key={druh.value} value={druh.value}>
                        {druh.label}
                      </option>
                    ))}
                  </Select>
                </SelectWrapper>
                {validationErrors.category && <ErrorMessage>{validationErrors.category}</ErrorMessage>}
              </FilterGroup>

              <FilterGroup>
                <FilterLabel>Stav objednávky</FilterLabel>
                <SelectWrapper>
                  <SelectIcon>
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </SelectIcon>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    disabled={loadingDictionaries}
                    hasError={validationErrors.status}
                    $hasIcon={true}
                  >
                    <option value="">{loadingDictionaries ? "Načítám stavy..." : "-- Vyberte stav --"}</option>
                    {stavyObjednavek.map((stav) => (
                      <option key={stav.value} value={stav.value}>
                        {stav.label}
                      </option>
                    ))}
                  </Select>
                </SelectWrapper>
                {validationErrors.status && <ErrorMessage>{validationErrors.status}</ErrorMessage>}
              </FilterGroup>

              <DateRangeGroup>
                <DateRangeInputs>
                  <FilterGroup>
                    <FilterLabel>Datum od</FilterLabel>
                    <DatePicker
                      value={filters.dateFrom}
                      onChange={(value) => handleFilterChange('dateFrom', value)}
                      placeholder="Vyberte datum od"
                      hasError={validationErrors.dateFrom}
                    />
                    {validationErrors.dateFrom && <ErrorMessage>{validationErrors.dateFrom}</ErrorMessage>}
                  </FilterGroup>

                  <FilterGroup>
                    <FilterLabel>Datum do</FilterLabel>
                    <DatePicker
                      value={filters.dateTo}
                      onChange={(value) => handleFilterChange('dateTo', value)}
                      placeholder="Vyberte datum do"
                      hasError={validationErrors.dateTo}
                    />
                    {validationErrors.dateTo && <ErrorMessage>{validationErrors.dateTo}</ErrorMessage>}
                  </FilterGroup>
                </DateRangeInputs>
              </DateRangeGroup>

              <FilterGroup>
                <FilterLabel>Počet dní</FilterLabel>
                <InputWrapper>
                  <InputIcon>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                  </InputIcon>
                  <Input
                    type="number"
                    value={filters.days}
                    onChange={(e) => handleFilterChange('days', e.target.value)}
                    hasError={validationErrors.days}
                    placeholder="5"
                    $hasIcon={true}
                  />
                </InputWrapper>
                {validationErrors.days && <ErrorMessage>{validationErrors.days}</ErrorMessage>}
                <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Pro report "Neschválené objednávky": Objednávky čekající na schválení déle než X dní
                </small>
              </FilterGroup>
            </FiltersGrid>
          )}
        </FiltersPanel>

        {/* Reporty Grid */}
        <ReportsGrid>
          {currentReports.map((report) => (
            <ReportCard key={report.id} onClick={() => handleGenerateReport(report)}>
              <ReportCardHeader>
                <ReportIcon color={report.color}>
                  <FontAwesomeIcon icon={report.icon} />
                </ReportIcon>
                <ReportCardContent>
                  <ReportCardTitle>{report.title}</ReportCardTitle>
                  <ReportCardDescription>{report.description}</ReportCardDescription>
                </ReportCardContent>
              </ReportCardHeader>
              <ReportCardFooter>
                <PriorityBadge priority={report.priority}>
                  {report.priority === 'high' ? 'Vysoká priorita' : 
                   report.priority === 'medium' ? 'Střední priorita' : 
                   'Nízká priorita'}
                </PriorityBadge>
                <StatusBadge>Hotovo</StatusBadge>
              </ReportCardFooter>
            </ReportCard>
          ))}
        </ReportsGrid>

        {/* Loading */}
        {loading && (
          <LoadingOverlay>
            <Spinner />
          </LoadingOverlay>
        )}

        {/* Výsledky reportu - dynamická tabulka pod dlaždicemi */}
        {reportData.length > 0 && (
          <ReportResultsSection>
            <ResultsHeader>
              <ResultsTitle>
                {reportTitle}
                <FullscreenIconButton 
                  onClick={() => {
                    if (tableFullscreenRef.current) {
                      tableFullscreenRef.current();
                    }
                  }}
                  title="Zobrazit tabulku na celou obrazovku"
                >
                  <FontAwesomeIcon icon={faExpand} />
                </FullscreenIconButton>
              </ResultsTitle>
              <ResultsActions>
                <ClearButton onClick={handleClearReport}>
                  <FontAwesomeIcon icon={faTimes} />
                  Vymazat
                </ClearButton>
                <ActionButton onClick={handleExportReport}>
                  <FontAwesomeIcon icon={faDownload} />
                  Exportovat CSV
                </ActionButton>
              </ResultsActions>
            </ResultsHeader>
            
            <ReportDataTable
              data={reportData}
              columns={getOrderColumns()}
              title={reportTitle}
              onExport={handleExportReport}
              fullscreenRef={tableFullscreenRef}
            />
          </ReportResultsSection>
        )}

        {/* Chybová hláška */}
        {error && !loading && reportData.length === 0 && (
          <ReportResultsSection>
            <div style={{color: '#ef4444', textAlign: 'center', padding: '2rem'}}>
              {error}
            </div>
          </ReportResultsSection>
        )}
      </PageContainer>

      {/* Slide Panel pro detail objednávky */}
      {detailPanelOpen && selectedOrder && (
        <SlideInDetailPanel
          isOpen={detailPanelOpen}
          onClose={handleCloseDetailPanel}
          title="Detail objednávky"
        >
          <OrderDetailView
            data={selectedOrder}
            username={username}
            token={token}
            onCloseAll={handleCloseDetailPanel}
          />
        </SlideInDetailPanel>
      )}
    </PageWrapper>
  );
};

export default ReportsPage;
