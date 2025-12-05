/**
 * SmlouvyTab - Správa smluv v číselníkách
 * 
 * Funkce:
 * - Seznam smluv s filtry (úsek, druh, stav, platnost, fulltext)
 * - Vytvoření/editace smlouvy
 * - Hromadný import z Excel/CSV
 * - Detail smlouvy se statistikami a objednávkami
 * - Manuální přepočet čerpání
 * - Soft delete (deaktivace)
 * 
 * @author Frontend Team
 * @date 2025-11-23
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrash, faEye, faFileImport, faSyncAlt,
  faSearch, faFilter, faDownload, faCheckCircle, faTimesCircle, faBolt, faTimes,
  faChevronDown, faChevronUp, faToggleOn, faToggleOff, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { FileText } from 'lucide-react';

// TanStack Table
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';

// Dialogs
import ConfirmDialog from '../../ConfirmDialog';

// API Services
import {
  getSmlouvyList,
  getSmlouvaDetail,
  createSmlouva,
  updateSmlouva,
  deleteSmlouva,
  prepocetCerpaniSmluv,
  DRUH_SMLOUVY_OPTIONS,
  STAV_SMLOUVY_OPTIONS,
  getStavSmlouvyColor,
  getStavSmlouvyLabel
} from '../../../services/apiSmlouvy';

import { getUsekyList } from '../../../services/apiv2Dictionaries';

// Context
import { useContext } from 'react';
import AuthContext from '../../../context/AuthContext';

// Common Components
import { SmartTooltip } from '../../../styles/SmartTooltip';
import DatePicker from '../../DatePicker';

// Local Components
import SmlouvyFormModal from './SmlouvyFormModal';
import SmlouvyDetailModal from './SmlouvyDetailModal';
import SmlouvyImportModal from './SmlouvyImportModal';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Container = styled.div`
  padding: 1rem;
`;

const ToolbarContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid #e5e7eb;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid ${props => 
    props.$variant === 'primary' ? '#3b82f6' :
    props.$variant === 'success' ? '#10b981' :
    props.$variant === 'warning' ? '#f59e0b' : '#3b82f6'};
  border-radius: 8px;
  background: ${props => 
    props.$variant === 'primary' ? '#3b82f6' :
    props.$variant === 'success' ? '#10b981' :
    props.$variant === 'warning' ? '#f59e0b' : 'white'};
  color: ${props => 
    props.$variant === 'primary' || props.$variant === 'success' || props.$variant === 'warning' ? 'white' : '#3b82f6'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => 
      props.$variant === 'primary' ? '#2563eb' :
      props.$variant === 'success' ? '#059669' :
      props.$variant === 'warning' ? '#d97706' : '#eff6ff'};
    border-color: ${props => 
      props.$variant === 'primary' ? '#2563eb' :
      props.$variant === 'success' ? '#059669' :
      props.$variant === 'warning' ? '#d97706' : '#2563eb'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const FilterSection = styled.div`
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const FilterField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const FilterLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
`;

const FilterSelectWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }
`;

const FilterSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.75rem 1.75rem 0.75rem 2.5rem' : '0.75rem 1.75rem 0.75rem 0.75rem'};
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  color: #1f2937;
  font-weight: 500;
  transition: all 0.2s ease;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #3b82f6;
  }

  /* Custom dropdown arrow */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;

  /* Styling pro placeholder option */
  option[value=""] {
    color: #9ca3af;
    font-weight: 400;
  }

  option {
    color: #1f2937;
    font-weight: 500;
    padding: 0.5rem;
  }
`;

const FilterInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;



const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 56px;
  height: 28px;
  cursor: pointer;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    border-radius: 28px;
    transition: all 0.3s ease;

    &::before {
      content: '';
      position: absolute;
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
  }

  input:checked + span {
    background-color: #3b82f6;
  }

  input:checked + span::before {
    transform: translateX(28px);
  }

  input:focus + span {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 100%;

  svg.search-icon {
    position: absolute;
    left: 0.75rem;
    color: #6b7280;
    pointer-events: none;
    font-size: 1rem;
  }

  input {
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 2.5rem;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: #9ca3af;
    }
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    color: #dc2626;
    transform: translateY(-50%) scale(1.2);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const StatsBar = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
`;

const StatValue = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.$color || '#1e293b'};
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableHeaderCell = styled.th`
  padding: 1rem 0.75rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  user-select: none;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};

  &:first-of-type {
    text-align: left;
  }

  &:hover {
    background: ${props => props.$sortable ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  user-select: none;
`;

const TableHeaderFilterRow = styled.tr`
  background: #f8f9fa;
  border-top: 1px solid #e5e7eb;
`;

const TableHeaderFilterCell = styled.th`
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  > svg {
    position: absolute;
    left: 0.75rem;
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 14px !important;
    height: 14px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const ColumnFilterSelect = styled.select`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const Tbody = styled.tbody``;

const TableRow = styled.tr`
  background: ${props => props.$isEven ? '#f8fafc' : 'white'};
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
  }
`;

const TableCell = styled.td`
  padding: 1rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 0.875rem;
  text-align: center;

  &:first-of-type {
    text-align: left;
    white-space: nowrap;
  }

  &:nth-of-type(2),
  &:nth-of-type(3),
  &:nth-of-type(4),
  &:nth-of-type(5) {
    text-align: left;
  }

  &:nth-of-type(3) {
    max-width: 200px;
    word-wrap: break-word;
    white-space: normal;
  }

  &:nth-of-type(4) {
    max-width: 300px;
    word-wrap: break-word;
    white-space: normal;
  }

  &:nth-of-type(7) {
    white-space: nowrap;
    min-width: 150px;
  }
`;

const Badge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$color || '#e2e8f0'};
  color: white;
  display: inline-block;
`;

const StatusBadge = Badge;

const ProgressBar = styled.div`
  width: 100%;
  max-width: 150px;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => {
    const percent = parseFloat(props.$percent) || 0;
    if (percent >= 90) return '#ef4444';
    if (percent >= 75) return '#f59e0b';
    if (percent >= 50) return '#3b82f6';
    return '#10b981';
  }};
  width: ${props => Math.min(parseFloat(props.$percent) || 0, 100)}%;
  transition: width 0.3s;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PaginationButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #1f2937;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ActionCell = styled.div`
  display: flex;
  gap: 0.12rem;
  justify-content: center;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #1e293b;
    background: #f1f5f9;
  }

  &.view {
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  }

  &.edit {
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  }

  &.delete {
    &:hover {
      color: #dc2626;
      background: #fef2f2;
    }
  }

  &.toggle-active {
    &:hover {
      color: #10b981;
      background: #f0fdf4;
    }
  }

  &.toggle-inactive {
    &:hover {
      color: #6b7280;
      background: #f9fafb;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #64748b;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.3;
`;

const EmptyText = styled.div`
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
`;

const EmptyHint = styled.div`
  font-size: 0.9rem;
  color: #94a3b8;
`;

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const FILTERS_STORAGE_KEY = 'smlouvy_filters';
const SHOW_FILTERS_STORAGE_KEY = 'smlouvy_showFilters';

// Helper funkce pro načtení filtrů z localStorage
const loadFiltersFromStorage = () => {
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('⚠️ Chyba při načítání filtrů smluv z localStorage:', error);
  }
  return null;
};

// Helper funkce pro uložení filtrů do localStorage
const saveFiltersToStorage = (filters) => {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.warn('⚠️ Chyba při ukládání filtrů smluv do localStorage:', error);
  }
};

// Helper funkce pro načtení stavu showFilters z localStorage
const loadShowFiltersFromStorage = () => {
  try {
    const saved = localStorage.getItem(SHOW_FILTERS_STORAGE_KEY);
    return saved === 'true';
  } catch (error) {
    return false;
  }
};

// Helper funkce pro uložení stavu showFilters do localStorage
const saveShowFiltersToStorage = (show) => {
  try {
    localStorage.setItem(SHOW_FILTERS_STORAGE_KEY, show.toString());
  } catch (error) {
    console.warn('⚠️ Chyba při ukládání stavu filtrů do localStorage:', error);
  }
};

// =============================================================================
// KOMPONENTA
// =============================================================================

const SmlouvyTab = () => {
  const { user, token } = useContext(AuthContext);

  // State
  const [smlouvy, setSmlouvy] = useState([]);
  const [useky, setUseky] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters - načíst z localStorage při inicializaci
  const [showFilters, setShowFilters] = useState(() => loadShowFiltersFromStorage());
  const [filters, setFilters] = useState(() => {
    const savedFilters = loadFiltersFromStorage();
    return savedFilters || {
      search: '',
      usek_id: '',
      druh_smlouvy: '',
      stav: '',
      platnost_od: '',
      platnost_do: '',
      show_inactive: false
    };
  });

  // TanStack Table state
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState({
    cislo_smlouvy: '',
    nazev_firmy: '',
    ico: '',
    nazev_smlouvy: '',
    usek_zkr: '',
    druh_smlouvy: '',
    stav: ''
  });

  // Pagination
  const [pageSize, setPageSize] = useState(() => {
    try {
      const saved = localStorage.getItem('smlouvy_pageSize');
      return saved ? parseInt(saved, 10) : 25;
    } catch {
      return 25;
    }
  });
  const [pageIndex, setPageIndex] = useState(0);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingSmlouva, setEditingSmlouva] = useState(null);
  const [viewingSmlouva, setViewingSmlouva] = useState(null);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: null
  });

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [smlouvyResult, usekyResult] = await Promise.all([
        getSmlouvyList({
          token: token,
          username: user.username,
          ...filters
        }),
        getUsekyList({
          token: token,
          username: user.username,
          show_inactive: false
        })
      ]);

      setSmlouvy(smlouvyResult.data);
      setUseky(usekyResult);
    } catch (err) {
      console.error('[SMLOUVY] ❌ Error loading data:', err);
      console.error('[SMLOUVY] ❌ Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =============================================================================
  // PERSISTENCE - Ukládání filtrů do localStorage
  // =============================================================================

  useEffect(() => {
    saveFiltersToStorage(filters);
  }, [filters]);

  useEffect(() => {
    saveShowFiltersToStorage(showFilters);
  }, [showFilters]);

  // =============================================================================
  // LOCAL FILTERING
  // =============================================================================

  const filteredSmlouvy = useMemo(() => {
    return smlouvy.filter(smlouva => {
      // Aktivní/neaktivní
      if (!filters.show_inactive && smlouva.aktivni !== 1) {
        return false;
      }

      // Fulltext search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = (
          (smlouva.cislo_smlouvy || '').toLowerCase().includes(searchLower) ||
          (smlouva.nazev_smlouvy || '').toLowerCase().includes(searchLower) ||
          (smlouva.nazev_firmy || '').toLowerCase().includes(searchLower) ||
          (smlouva.popis_smlouvy || '').toLowerCase().includes(searchLower)
        );
        if (!matches) return false;
      }

      // Úsek
      if (filters.usek_id && smlouva.usek_id !== parseInt(filters.usek_id)) {
        return false;
      }

      // Druh smlouvy
      if (filters.druh_smlouvy && smlouva.druh_smlouvy !== filters.druh_smlouvy) {
        return false;
      }

      // Stav
      if (filters.stav && smlouva.stav !== filters.stav) {
        return false;
      }

      // Datumový rozsah - smlouva musí pokrývat (obsahovat) zadané datum
      if (filters.platnost_od) {
        const filterOd = new Date(filters.platnost_od);
        const smlouvaOd = new Date(smlouva.platnost_od);
        const smlouvaDo = new Date(smlouva.platnost_do);
        
        // Smlouva musí pokrývat datum "od" (může začínat dříve nebo ve stejný den a končit později nebo ve stejný den)
        if (filterOd < smlouvaOd || filterOd > smlouvaDo) {
          return false;
        }
      }

      if (filters.platnost_do) {
        const filterDo = new Date(filters.platnost_do);
        const smlouvaOd = new Date(smlouva.platnost_od);
        const smlouvaDo = new Date(smlouva.platnost_do);
        
        // Smlouva musí pokrývat datum "do" (může začínat dříve nebo ve stejný den a končit později nebo ve stejný den)
        if (filterDo < smlouvaOd || filterDo > smlouvaDo) {
          return false;
        }
      }

      // Column filters (druhý řádek)
      if (columnFilters.cislo_smlouvy && !(smlouva.cislo_smlouvy || '').toLowerCase().includes(columnFilters.cislo_smlouvy.toLowerCase())) {
        return false;
      }
      if (columnFilters.nazev_firmy && !(smlouva.nazev_firmy || '').toLowerCase().includes(columnFilters.nazev_firmy.toLowerCase())) {
        return false;
      }
      if (columnFilters.ico && !(smlouva.ico || '').toLowerCase().includes(columnFilters.ico.toLowerCase())) {
        return false;
      }
      if (columnFilters.nazev_smlouvy && !(smlouva.nazev_smlouvy || '').toLowerCase().includes(columnFilters.nazev_smlouvy.toLowerCase())) {
        return false;
      }
      if (columnFilters.usek_zkr && !(smlouva.usek_zkr || '').toLowerCase().includes(columnFilters.usek_zkr.toLowerCase())) {
        return false;
      }
      if (columnFilters.druh_smlouvy && smlouva.druh_smlouvy !== columnFilters.druh_smlouvy) {
        return false;
      }
      if (columnFilters.stav && smlouva.stav !== columnFilters.stav) {
        return false;
      }

      return true;
    });
  }, [smlouvy, filters, columnFilters]);

  // =============================================================================
  // PAGINATION - useEffects (před table)
  // =============================================================================

  // Save pageSize to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('smlouvy_pageSize', pageSize.toString());
    } catch (error) {
      console.warn('⚠️ Chyba při ukládání pageSize:', error);
    }
  }, [pageSize]);

  // Reset pageIndex when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [filters]);

  // =============================================================================
  // STATISTICS
  // =============================================================================

  const statistics = useMemo(() => {
    // ✅ AKTIVNÍ = kde aktivni != 0 (nebo aktivni === true / aktivni === 1)
    const aktivniSmlouvy = filteredSmlouvy.filter(s => s.aktivni == 1 || s.aktivni === true);
    
    // ✅ PRAVIDLO: Pokud je show_inactive=false, vyloučit smlouvy kde aktivni==0
    const smlouvyProStatistiku = filters.show_inactive 
      ? filteredSmlouvy      // Zobrazují se i neaktivní → sečíst všechny zobrazené
      : aktivniSmlouvy;       // Nezobrazují se neaktivní → sečíst jen kde aktivni!=0
    
    // ✅ CELKEM ČERPÁNO: Podle pravidla výše
    const celkemCerpano = smlouvyProStatistiku.reduce((sum, s) => sum + (parseFloat(s.cerpano_celkem) || 0), 0);
    
    // ✅ CELKOVÝ LIMIT: Sečíst hodnota_s_dph (počáteční stav)
    const celkemLimit = smlouvyProStatistiku.reduce((sum, s) => sum + (parseFloat(s.hodnota_s_dph) || 0), 0);
    // ✅ ZBÝVÁ: Počáteční stav - čerpáno
    const celkemZbyva = celkemLimit - celkemCerpano;
    
    // ℹ️ CELKOVÉ PLNĚNÍ: Informativní součet maximálních plnění (nepoužívá se ve výpočtech)
    const celkemPlneni = smlouvyProStatistiku.reduce((sum, s) => sum + (parseFloat(s.hodnota_plneni_s_dph) || 0), 0);
    
    // ✅ PRŮMĚRNÉ ČERPÁNÍ: Počítáme vůči hodnota_s_dph
    const prumerneCerpani = aktivniSmlouvy.length > 0 
      ? aktivniSmlouvy.reduce((sum, s) => {
          const pocatecniStav = parseFloat(s.hodnota_s_dph) || 0;
          const cerpano = parseFloat(s.cerpano_celkem) || 0;
          return sum + (pocatecniStav > 0 ? (cerpano / pocatecniStav) * 100 : 0);
        }, 0) / aktivniSmlouvy.length 
      : 0;

    return {
      pocet_celkem: filteredSmlouvy.length,
      pocet_aktivnich: aktivniSmlouvy.length,
      celkem_cerpano: celkemCerpano,
      celkem_limit: celkemLimit,
      celkem_zbyva: celkemZbyva,
      celkem_plneni: celkemPlneni,
      prumerne_cerpani: prumerneCerpani
    };
  }, [filteredSmlouvy, filters.show_inactive]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleCreate = () => {
    setEditingSmlouva(null);
    setFormModalOpen(true);
  };

  const handleEdit = (smlouva) => {
    setEditingSmlouva(smlouva);
    setFormModalOpen(true);
  };

  const handleView = async (smlouva) => {
    try {
      const detail = await getSmlouvaDetail({
        token: token,
        username: user.username,
        id: smlouva.id
      });
      setViewingSmlouva(detail);
      setDetailModalOpen(true);
    } catch (err) {
      console.error('Chyba při načítání detailu:', err);
      setError('Chyba při načítání detailu: ' + err.message);
    }
  };

  const handleToggleStatus = async (smlouva) => {
    const isActive = smlouva.aktivni == 1 || smlouva.aktivni === true;
    const action = isActive ? 'deaktivovat' : 'aktivovat';

    setConfirmDialog({
      isOpen: true,
      title: isActive ? 'Deaktivace smlouvy' : 'Aktivace smlouvy',
      message: isActive ? (
        <>
          <p>Opravdu chcete deaktivovat smlouvu <strong>{smlouva.cislo_smlouvy}</strong>?</p>
          <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 600 }}>
            ⚠️ Smlouva se nebude nabízet v objednávkách a nebude se počítat do statistik čerpání.
          </p>
        </>
      ) : (
        <>
          <p>Opravdu chcete aktivovat smlouvu <strong>{smlouva.cislo_smlouvy}</strong>?</p>
          <p style={{ marginTop: '1rem', color: '#10b981', fontWeight: 600 }}>
            ✅ Smlouva se bude nabízet v objednávkách a bude se počítat do statistik čerpání.
          </p>
        </>
      ),
      variant: isActive ? 'warning' : 'success',
      onConfirm: async () => {
        try {
          await updateSmlouva({
            token: token,
            username: user.username,
            id: smlouva.id,
            smlouvaData: {
              aktivni: isActive ? 0 : 1
            }
          });
          console.log(`Smlouva byla ${isActive ? 'deaktivována' : 'aktivována'}:`, smlouva.cislo_smlouvy);
          loadData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err) {
          console.error(`Chyba při ${action}:`, err);
          setError(`Chyba při ${action}: ` + err.message);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  const handleDelete = async (smlouva) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Smazání smlouvy',
      message: (
        <>
          <p>Opravdu chcete trvale smazat smlouvu <strong>{smlouva.cislo_smlouvy}</strong>?</p>
          <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 600 }}>
            ⚠️ Tato akce je <strong>NEVRATNÁ</strong>!
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
            Tip: Pokud chcete smlouvu jen dočasně skrýt, použijte raději deaktivaci.
          </p>
        </>
      ),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteSmlouva({
            token: token,
            username: user.username,
            id: smlouva.id
          });
          console.log('Smlouva byla smazána:', smlouva.cislo_smlouvy);
          loadData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err) {
          console.error('Chyba při mazání:', err);
          setError('Chyba při mazání: ' + err.message);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  const handlePrepocetCerpani = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Přepočet čerpání smluv',
      message: (
        <>
          <p>Opravdu chcete přepočítat čerpání <strong>všech smluv</strong>?</p>
          <p style={{ marginTop: '1rem', color: '#f59e0b', fontWeight: 600 }}>
            ⏱️ Tato operace může trvat několik sekund.
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
            Systém projde všechny objednávky a aktualizuje částky na jednotlivých smlouvách.
          </p>
        </>
      ),
      variant: 'warning',
      onConfirm: async () => {
        try {
          const result = await prepocetCerpaniSmluv({
            token: token,
            username: user.username,
            cislo_smlouvy: null,
            usek_id: null
          });
          console.log('Přepočet dokončen:', result);
          loadData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err) {
          console.error('Chyba při přepočtu:', err);
          setError('Chyba při přepočtu: ' + err.message);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // =============================================================================
  // TANSTACK TABLE - COLUMNS & INSTANCE
  // =============================================================================

  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.accessor('cislo_smlouvy', {
      header: 'Číslo smlouvy',
      cell: info => <strong>{info.getValue()}</strong>,
      enableSorting: true
    }),
    columnHelper.accessor('nazev_firmy', {
      header: 'Firma',
      cell: info => info.getValue(),
      enableSorting: true
    }),
    columnHelper.accessor('ico', {
      header: 'IČO',
      cell: info => info.getValue() || '---',
      enableSorting: true
    }),
    columnHelper.accessor('nazev_smlouvy', {
      header: 'Název smlouvy',
      cell: info => info.getValue(),
      enableSorting: true
    }),
    columnHelper.accessor('usek_zkr', {
      header: 'Úsek',
      cell: info => info.getValue(),
      enableSorting: true
    }),
    columnHelper.accessor('platnost_od', {
      header: 'Platnost',
      cell: info => {
        const row = info.row.original;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            {row.platnost_od && <div><strong>Od:</strong> {formatDate(row.platnost_od)}</div>}
            <div><strong>Do:</strong> {formatDate(row.platnost_do)}</div>
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.platnost_od ? new Date(rowA.original.platnost_od).getTime() : 0;
        const b = rowB.original.platnost_od ? new Date(rowB.original.platnost_od).getTime() : 0;
        return a - b;
      }
    }),
    columnHelper.accessor('hodnota_s_dph', {
      header: 'Počáteční stav s DPH',
      cell: info => (
        <span style={{ color: '#1e40af', fontWeight: '600' }}>
          {formatCurrency(info.getValue())}
        </span>
      ),
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = parseFloat(rowA.original.hodnota_s_dph) || 0;
        const b = parseFloat(rowB.original.hodnota_s_dph) || 0;
        return a - b;
      }
    }),
    columnHelper.accessor('cerpano_celkem', {
      header: 'Čerpání s DPH',
      cell: info => {
        const row = info.row.original;
        const pocatecniStav = parseFloat(row.hodnota_s_dph) || 0;
        const cerpano = parseFloat(info.getValue()) || 0;
        const percent = pocatecniStav > 0 ? (cerpano / pocatecniStav) * 100 : 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <ProgressBar>
              <ProgressFill $percent={percent} />
            </ProgressBar>
            <small>{percent.toFixed(1)}%</small>
            <strong>{formatCurrency(cerpano)}</strong>
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = parseFloat(rowA.original.cerpano_celkem) || 0;
        const b = parseFloat(rowB.original.cerpano_celkem) || 0;
        return a - b;
      }
    }),
    columnHelper.accessor(
      row => (parseFloat(row.hodnota_s_dph) || 0) - (parseFloat(row.cerpano_celkem) || 0),
      {
        id: 'zbyva',
        header: 'Zbývá s DPH',
        cell: info => {
          const zbyva = info.getValue();
          return (
            <span style={{ 
              color: zbyva >= 0 ? '#10b981' : '#dc2626',
              fontWeight: '600'
            }}>
              {formatCurrency(zbyva)}
            </span>
          );
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = (parseFloat(rowA.original.hodnota_s_dph) || 0) - (parseFloat(rowA.original.cerpano_celkem) || 0);
          const b = (parseFloat(rowB.original.hodnota_s_dph) || 0) - (parseFloat(rowB.original.cerpano_celkem) || 0);
          return a - b;
        }
      }
    ),
    columnHelper.accessor('stav', {
      header: 'Stav',
      cell: info => (
        <StatusBadge $color={getStavSmlouvyColor(info.getValue())}>
          {getStavSmlouvyLabel(info.getValue())}
        </StatusBadge>
      ),
      enableSorting: true
    }),
    columnHelper.display({
      id: 'actions',
      header: () => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <FontAwesomeIcon icon={faBolt} style={{ color: '#eab308', fontSize: '16px' }} />
        </div>
      ),
      cell: props => (
        <ActionCell>
          <SmartTooltip content="Detail smlouvy">
            <IconButton onClick={() => handleView(props.row.original)} className="view">
              <FontAwesomeIcon icon={faEye} />
            </IconButton>
          </SmartTooltip>
          <SmartTooltip content="Upravit smlouvu">
            <IconButton onClick={() => handleEdit(props.row.original)} className="edit">
              <FontAwesomeIcon icon={faEdit} />
            </IconButton>
          </SmartTooltip>
          <SmartTooltip content={props.row.original.aktivni ? "Deaktivovat" : "Aktivovat"}>
            <IconButton 
              onClick={() => handleToggleStatus(props.row.original)} 
              className={props.row.original.aktivni ? "toggle-active" : "toggle-inactive"}
            >
              <FontAwesomeIcon icon={props.row.original.aktivni ? faToggleOn : faToggleOff} />
            </IconButton>
          </SmartTooltip>
          <SmartTooltip content="Smazat smlouvu">
            <IconButton onClick={() => handleDelete(props.row.original)} className="delete">
              <FontAwesomeIcon icon={faTrash} />
            </IconButton>
          </SmartTooltip>
        </ActionCell>
      )
    })
  ], [handleView, handleEdit, handleToggleStatus, handleDelete]);

  const table = useReactTable({
    data: filteredSmlouvy,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  // =============================================================================
  // PAGINATION - data a handlers (po table)
  // =============================================================================

  // Get sorted rows
  const sortedRows = table.getSortedRowModel().rows;

  // Paginated data - použít seřazené rows z TanStack Table
  const paginatedRows = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, pageIndex, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  // Pagination handlers
  const goToFirstPage = () => setPageIndex(0);
  const goToPreviousPage = () => setPageIndex(prev => Math.max(0, prev - 1));
  const goToNextPage = () => setPageIndex(prev => Math.min(totalPages - 1, prev + 1));
  const goToLastPage = () => setPageIndex(totalPages - 1);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      usek_id: '',
      druh_smlouvy: '',
      stav: '',
      platnost_od: '',
      platnost_do: '',
      show_inactive: false
    });
  };

  const handleFormClose = (reload) => {
    setFormModalOpen(false);
    setEditingSmlouva(null);
    if (reload) {
      loadData();
    }
  };

  const handleDetailClose = () => {
    setDetailModalOpen(false);
    setViewingSmlouva(null);
  };

  const handleImportClose = (reload) => {
    setImportModalOpen(false);
    if (reload) {
      loadData();
    }
  };

  // =============================================================================
  // FORMAT HELPERS
  // =============================================================================

  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
  };



  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Container>
      {/* Toolbar */}
      <ToolbarContainer>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Hledat podle čísla, názvu, firmy..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          {filters.search && (
            <ClearButton onClick={() => handleFilterChange('search', '')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>

        <ActionButton onClick={() => setShowFilters(!showFilters)}>
          <FontAwesomeIcon icon={showFilters ? faChevronUp : faChevronDown} />
          {showFilters ? 'Skrýt filtry' : 'Rozšířený filtr'}
        </ActionButton>

        <ActionButton $variant="primary" onClick={handleCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Přidat smlouvu
        </ActionButton>
        <ActionButton $variant="success" onClick={() => setImportModalOpen(true)}>
          <FontAwesomeIcon icon={faFileImport} />
          Import z Excel
        </ActionButton>
        <ActionButton $variant="warning" onClick={handlePrepocetCerpani}>
          <FontAwesomeIcon icon={faSyncAlt} />
          Přepočítat čerpání
        </ActionButton>
      </ToolbarContainer>

      {/* Filters */}
      <FilterSection $visible={showFilters}>
        <FilterGrid>
          <FilterField>
            <FilterLabel>Úsek</FilterLabel>
            <FilterSelect
              value={filters.usek_id}
              onChange={(e) => handleFilterChange('usek_id', e.target.value)}
            >
              <option value="">Všechny úseky</option>
              {useky.map(usek => (
                <option key={usek.id} value={usek.id}>
                  {usek.usek_zkr} - {usek.usek_nazev}
                </option>
              ))}
            </FilterSelect>
          </FilterField>

          <FilterField>
            <FilterLabel>Druh smlouvy</FilterLabel>
            <FilterSelect
              value={filters.druh_smlouvy}
              onChange={(e) => handleFilterChange('druh_smlouvy', e.target.value)}
            >
              <option value="">Všechny druhy</option>
              {DRUH_SMLOUVY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </FilterSelect>
          </FilterField>

          <FilterField>
            <FilterLabel>Stav</FilterLabel>
            <FilterSelect
              value={filters.stav}
              onChange={(e) => handleFilterChange('stav', e.target.value)}
            >
              <option value="">Všechny stavy</option>
              {STAV_SMLOUVY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </FilterSelect>
          </FilterField>

          <FilterField>
            <FilterLabel>Platnost od</FilterLabel>
            <DatePicker
              value={filters.platnost_od}
              onChange={(value) => handleFilterChange('platnost_od', value)}
              placeholder="Vyberte datum od"
            />
          </FilterField>

          <FilterField>
            <FilterLabel>Platnost do</FilterLabel>
            <DatePicker
              value={filters.platnost_do}
              onChange={(value) => handleFilterChange('platnost_do', value)}
              placeholder="Vyberte datum do"
            />
          </FilterField>

          <FilterField>
            <FilterLabel style={{ marginBottom: '0.3rem' }}>&nbsp;</FilterLabel>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              height: '46px'
            }}>
              <ToggleSwitch>
                <input
                  type="checkbox"
                  checked={filters.show_inactive}
                  onChange={(e) => handleFilterChange('show_inactive', e.target.checked)}
                />
                <span />
              </ToggleSwitch>
              <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#475569' }}>Zobrazit neaktivní</span>
            </div>
          </FilterField>

          <FilterField>
            <FilterLabel style={{ marginBottom: '0.3rem' }}>&nbsp;</FilterLabel>
            <ActionButton onClick={handleResetFilters} style={{ width: '100%', height: '46px' }}>Vymazat filtry</ActionButton>
          </FilterField>
        </FilterGrid>
      </FilterSection>

      {/* Statistics */}
      <StatsBar>
        <StatItem>
          <StatLabel>Smluv celkem</StatLabel>
          <StatValue>{statistics.pocet_celkem}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Aktivních</StatLabel>
          <StatValue $color="#10b981">{statistics.pocet_aktivnich}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Celkový limit</StatLabel>
          <StatValue>{formatCurrency(statistics.celkem_limit)}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Celkem čerpáno</StatLabel>
          <StatValue $color="#3b82f6">{formatCurrency(statistics.celkem_cerpano)}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Zbývá</StatLabel>
          <StatValue $color="#10b981">{formatCurrency(statistics.celkem_zbyva)}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Celkové plnění</StatLabel>
          <StatValue $color="#6b7280">{formatCurrency(statistics.celkem_plneni)}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Průměrné čerpání</StatLabel>
          <StatValue>{statistics.prumerne_cerpani.toFixed(1)}%</StatValue>
        </StatItem>
      </StatsBar>

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <TableContainer>
        <Table>
          <Thead>
            {/* První řádek - názvy sloupců s řazením */}
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHeaderCell
                    key={header.id}
                    $sortable={header.column.getCanSort()}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : (
                      <HeaderContent>
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getIsSorted() && (
                          <FontAwesomeIcon
                            icon={header.column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
                            style={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </HeaderContent>
                    )}
                  </TableHeaderCell>
                ))}
              </tr>
            ))}

              {/* Druhý řádek - sloupcové filtry */}
              <TableHeaderFilterRow>
                {/* Číslo smlouvy */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat číslo..."
                      value={columnFilters.cislo_smlouvy}
                      onChange={(e) => setColumnFilters(prev => ({...prev, cislo_smlouvy: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* Firma */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat firmu..."
                      value={columnFilters.nazev_firmy}
                      onChange={(e) => setColumnFilters(prev => ({...prev, nazev_firmy: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* IČO */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat IČO..."
                      value={columnFilters.ico}
                      onChange={(e) => setColumnFilters(prev => ({...prev, ico: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* Název smlouvy */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat název..."
                      value={columnFilters.nazev_smlouvy}
                      onChange={(e) => setColumnFilters(prev => ({...prev, nazev_smlouvy: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* Úsek */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat úsek..."
                      value={columnFilters.usek_zkr}
                      onChange={(e) => setColumnFilters(prev => ({...prev, usek_zkr: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* Platnost - prázdná buňka */}
                <TableHeaderFilterCell />
                {/* Počáteční stav - prázdná buňka */}
                <TableHeaderFilterCell />
                {/* Čerpání - prázdná buňka */}
                <TableHeaderFilterCell />
                {/* Zbývá - prázdná buňka */}
                <TableHeaderFilterCell />
                {/* Stav */}
                <TableHeaderFilterCell>
                  <ColumnFilterSelect
                    value={columnFilters.stav}
                    onChange={(e) => setColumnFilters(prev => ({...prev, stav: e.target.value}))}
                  >
                    <option value="">Všechny</option>
                    {STAV_SMLOUVY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </ColumnFilterSelect>
                </TableHeaderFilterCell>
                {/* Akce - prázdná buňka */}
                <TableHeaderFilterCell />
              </TableHeaderFilterRow>
            </Thead>
            <Tbody>
              {loading ? (
                <tr>
                  <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                    Načítám smlouvy...
                  </TableCell>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                    <EmptyState>
                      <EmptyIcon><FileText size={48} /></EmptyIcon>
                      <EmptyText>{smlouvy.length === 0 ? 'Žádné smlouvy' : 'Nenalezeny žádné smlouvy'}</EmptyText>
                      <EmptyHint>{smlouvy.length === 0 ? 'Vytvořte novou smlouvu pomocí tlačítka "Přidat smlouvu"' : 'Zkuste změnit vyhledávání nebo filtry'}</EmptyHint>
                    </EmptyState>
                  </TableCell>
                </tr>
              ) : (
                paginatedRows.map((row, index) => (
                  <TableRow key={row.id} $isEven={index % 2 === 0}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </Tbody>
          </Table>

          {/* Pagination */}
          <Pagination>
            <PageInfo>
              Zobrazeno {Math.min(pageIndex * pageSize + 1, sortedRows.length)} - {Math.min((pageIndex + 1) * pageSize, sortedRows.length)} z {sortedRows.length} smluv
            </PageInfo>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
                Zobrazit:
              </span>
              <PageSizeSelect
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  setPageIndex(0);
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </PageSizeSelect>

              <PaginationButton
                onClick={goToFirstPage}
                disabled={pageIndex === 0}
              >
                ««
              </PaginationButton>
              <PaginationButton
                onClick={goToPreviousPage}
                disabled={pageIndex === 0}
              >
                ‹
              </PaginationButton>

              <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
                Stránka {pageIndex + 1} z {Math.max(1, totalPages)}
              </span>

              <PaginationButton
                onClick={goToNextPage}
                disabled={pageIndex >= totalPages - 1}
              >
                ›
              </PaginationButton>
              <PaginationButton
                onClick={goToLastPage}
                disabled={pageIndex >= totalPages - 1}
              >
                »»
              </PaginationButton>
            </div>
          </Pagination>
        </TableContainer>

      {/* Modals */}
      {formModalOpen && (
        <SmlouvyFormModal
          smlouva={editingSmlouva}
          useky={useky}
          onClose={handleFormClose}
        />
      )}

      {detailModalOpen && viewingSmlouva && (
        <SmlouvyDetailModal
          smlouva={viewingSmlouva}
          onClose={handleDetailClose}
          onEdit={() => {
            handleDetailClose();
            handleEdit(viewingSmlouva.smlouva);
          }}
        />
      )}

      {importModalOpen && (
        <SmlouvyImportModal
          useky={useky}
          onClose={handleImportClose}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        icon={faExclamationTriangle}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      >
        {confirmDialog.message}
      </ConfirmDialog>
    </Container>
  );
};

export default SmlouvyTab;
