/**
 * Limitované Příslibové kódy Tab - Správa LP kódů v číselníkách
 *
 * DB: 25_limitovane_prisliby
 * Sloupce: id, user_id, usek_id, kategorie, cislo_lp, cislo_uctu, nazev_uctu,
 *          vyuziti, vyse_financniho_kryti, platne_od, platne_do
 *
 * Features:
 * - TanStack Table s řazením a filtry
 * - Vyhledávání podle čísla LP kódu
 * - Sloupcové filtry
 * - localStorage perzistence filtrů
 * - ID jako superscript
 * - CRUD operace (Create, Update, Delete) pouze pro adminy
 * - Toast notifikace místo alertů
 *
 * @author Frontend Team
 * @date 2026-05-22
 */

import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faSearch, faEdit, faTrash,
  faChevronUp, faChevronDown, faTimes, faEraser, faBolt
} from '@fortawesome/free-solid-svg-icons';
import { Coins } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';
import { DictionaryCacheContext } from '../../../context/DictionaryCacheContext';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  getLimitovanePrislibList,
  createLimitovanePrislib,
  updateLimitovanePrislib,
  deleteLimitovanePrislib,
} from '../../../services/apiv2Dictionaries';
import LPFormModal from './LPFormModal';
import DictionaryConfirmDialog from '../DictionaryConfirmDialog';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Container = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid #e5e7eb;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 2px solid #10b981;
  border-radius: 8px;
  background: ${props => props.$primary ? '#10b981' : 'white'};
  color: ${props => props.$primary ? 'white' : '#10b981'};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary ? '#059669' : '#f0fdf4'};
    border-color: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
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
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  /* Fixní šířky sloupců */
  th:nth-of-type(1), td:nth-of-type(1) { width: 120px; }    /* Číslo LP */
  th:nth-of-type(2), td:nth-of-type(2) { width: 150px; }    /* Číslo účtu */
  th:nth-of-type(3), td:nth-of-type(3) { width: auto; }     /* Název účtu */
  th:nth-of-type(4), td:nth-of-type(4) { width: auto; }     /* Využití */
  th:nth-of-type(5), td:nth-of-type(5) { width: 120px; }    /* Úsek */
  th:nth-of-type(6), td:nth-of-type(6) { width: 130px; }    /* Kategorie */
  th:nth-of-type(7), td:nth-of-type(7) { width: 140px; }    /* Výše krytí */
  th:nth-of-type(8), td:nth-of-type(8) { width: 120px; }    /* Platné od */
  th:nth-of-type(9), td:nth-of-type(9) { width: 120px; }    /* Platné do */
  th:last-child, td:last-child { width: 100px; }            /* Akce */
`;

const TableHeaderRow = styled.tr`
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
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
  cursor: pointer;

  &:first-of-type {
    text-align: left;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TableHeaderFilterRow = styled.tr`
  background: #f8f9fa;
`;

const TableHeaderFilterCell = styled.th`
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border-bottom: 2px solid #e5e7eb;
  border-top: 1px solid #e5e7eb;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  user-select: none;

  &.left {
    justify-content: flex-start;
  }
`;

const TableRow = styled.tr`
  background: ${props => props.$isEven ? '#f8fafc' : 'white'};
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
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

  &.edit {
    &:hover {
      color: #10b981;
      background: #f0fdf4;
    }
  }

  &.delete {
    &:hover {
      color: #dc2626;
      background: #fef2f2;
    }
  }
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;

  > svg:first-of-type {
    position: absolute;
    left: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 12px !important;
    height: 12px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: #f9fafb;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #10b981;
    background: white;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 0.75rem;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 20px;
  height: 20px;

  &:hover {
    color: #ef4444;
  }

  svg {
    width: 12px !important;
    height: 12px !important;
  }
`;

const FilterActionButton = styled.button`
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;

  &:hover {
    background: #f3f4f6;
    border-color: #10b981;
    color: #10b981;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
    border-color: #10b981;
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
    border-color: #10b981;
  }

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #64748b;
  font-size: 1.1rem;
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    opacity: 0.3;
  }

  h3 {
    margin: 0.5rem 0;
    color: #374151;
    font-size: 1.125rem;
  }

  p {
    margin: 0.5rem 0 0 0;
    color: #6b7280;
    font-size: 0.875rem;
  }
`;

const LPCodeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
`;

const AmountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  background: ${props => props.$amount > 1000000 ? '#fee2e2' : '#dbeafe'};
  color: ${props => props.$amount > 1000000 ? '#dc2626' : '#1e40af'};
  border: 1px solid ${props => props.$amount > 1000000 ? '#fca5a5' : '#93c5fd'};
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ');
  } catch {
    return dateStr;
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const LimitovanePrislibTab = () => {
  const { user, token, hasAdminRole, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { invalidateCache } = useContext(DictionaryCacheContext) || {};

  // Permissions - pouze ADMIN může upravovat
  const canEdit = typeof hasAdminRole === 'function' ? hasAdminRole() : false;

  // ============= LOCALSTORAGE HELPERS =============
  const user_id = userDetail?.user_id;

  const getUserKey = (baseKey) => {
    const sid = user_id || 'anon';
    return `${baseKey}_${sid}`;
  };

  const getUserStorage = (baseKey, defaultValue = null) => {
    try {
      const item = localStorage.getItem(getUserKey(baseKey));
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const setUserStorage = (baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (error) {
      // Ignorovat chyby
    }
  };

  // ============= HELPER FUNCTIONS =============
  const compareNumericValue = (itemValue, filterValue) => {
    if (!filterValue || filterValue.trim() === '') return true;
    
    const trimmed = filterValue.trim();
    const operatorMatch = trimmed.match(/^(>=|<=|>|<|=)\s*(.+)$/);
    
    if (!operatorMatch) {
      return String(itemValue || '').toLowerCase().includes(trimmed.toLowerCase());
    }
    
    const operator = operatorMatch[1];
    const valueStr = operatorMatch[2].trim();
    const compareValue = parseFloat(valueStr);
    
    if (isNaN(compareValue)) return true;
    
    const numericItemValue = parseFloat(itemValue);
    if (isNaN(numericItemValue)) return false;
    
    switch (operator) {
      case '>': return numericItemValue > compareValue;
      case '<': return numericItemValue < compareValue;
      case '>=': return numericItemValue >= compareValue;
      case '<=': return numericItemValue <= compareValue;
      case '=': return numericItemValue === compareValue;
      default: return true;
    }
  };

  // ============= STATE =============
  const [lpKody, setLpKody] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [globalFilter, setGlobalFilter] = useState(() => {
    return getUserStorage('lp_globalFilter', '');
  });
  
  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('lp_columnFilters', {
      cislo_lp: '',
      cislo_uctu: '',
      nazev_uctu: '',
      vyuziti: '',
      usek_zkr: '',
      prikazce: '',
      kategorie: '',
      vyse_financniho_kryti: '',
      platne_od: '',
      platne_do: ''
    });
  });

  const [pageIndex, setPageIndex] = useState(() => {
    return getUserStorage('lp_pageIndex', 0);
  });
  
  const [pageSize, setPageSize] = useState(() => {
    return getUserStorage('lp_pageSize', 20);
  });

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [editingItem, setEditingItem] = useState(null);

  // Delete confirm
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);

  // ============= SAVE TO LOCALSTORAGE =============
  useEffect(() => {
    setUserStorage('lp_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('lp_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('lp_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  useEffect(() => {
    setUserStorage('lp_pageSize', pageSize);
  }, [pageSize, user_id]);

  // ============= FETCH DATA =============
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getLimitovanePrislibList({
        token,
        username: user.username
      });
      setLpKody(data || []);
    } catch (error) {
      showToast(error.message || 'Chyba při načítání LP kódů', 'error');
      setLpKody([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.username) {
      fetchData();
    }
  }, [token, user]);

  // ============= FILTERED DATA =============
  const filteredData = useMemo(() => {
    return lpKody.filter((item) => {
      // Global search
      if (globalFilter) {
        const searchLower = globalFilter.toLowerCase();
        const celeMeno = [(item.prikazce_titul || ''), (item.prikazce_prijmeni || ''), (item.prikazce_jmeno || '')].filter(Boolean).join(' ').toLowerCase();
        const matchGlobal =
          (item.cislo_lp || '').toString().toLowerCase().includes(searchLower) ||
          (item.cislo_uctu || '').toLowerCase().includes(searchLower) ||
          (item.nazev_uctu || '').toLowerCase().includes(searchLower) ||
          (item.vyuziti || '').toLowerCase().includes(searchLower) ||
          (item.usek_zkr || '').toLowerCase().includes(searchLower) ||
          celeMeno.includes(searchLower) ||
          (item.kategorie || '').toLowerCase().includes(searchLower);

        if (!matchGlobal) return false;
      }

      // Column filters
      if (columnFilters.cislo_lp &&
          !(item.cislo_lp || '').toString().toLowerCase().includes(columnFilters.cislo_lp.toLowerCase())) {
        return false;
      }
      if (columnFilters.cislo_uctu &&
          !(item.cislo_uctu || '').toLowerCase().includes(columnFilters.cislo_uctu.toLowerCase())) {
        return false;
      }
      if (columnFilters.nazev_uctu &&
          !(item.nazev_uctu || '').toLowerCase().includes(columnFilters.nazev_uctu.toLowerCase())) {
        return false;
      }
      if (columnFilters.vyuziti &&
          !(item.vyuziti || '').toLowerCase().includes(columnFilters.vyuziti.toLowerCase())) {
        return false;
      }
      if (columnFilters.usek_zkr &&
          !(item.usek_zkr || '').toLowerCase().includes(columnFilters.usek_zkr.toLowerCase())) {
        return false;
      }
      if (columnFilters.prikazce) {
        const celeMeno = [(item.prikazce_titul || ''), (item.prikazce_prijmeni || ''), (item.prikazce_jmeno || '')].filter(Boolean).join(' ').toLowerCase();
        if (!celeMeno.includes(columnFilters.prikazce.toLowerCase())) {
          return false;
        }
      }
      if (columnFilters.kategorie &&
          !(item.kategorie || '').toLowerCase().includes(columnFilters.kategorie.toLowerCase())) {
        return false;
      }
      
      // Numeric filter - Výše finančního krytí
      if (columnFilters.vyse_financniho_kryti && 
          !compareNumericValue(item.vyse_financniho_kryti, columnFilters.vyse_financniho_kryti)) {
        return false;
      }
      
      // Date filter - Platné od
      if (columnFilters.platne_od && item.platne_od) {
        const itemDate = item.platne_od.split(' ')[0]; // Extrahovat jen datum (YYYY-MM-DD)
        if (!itemDate.includes(columnFilters.platne_od)) {
          return false;
        }
      }
      
      // Date filter - Platné do
      if (columnFilters.platne_do && item.platne_do) {
        const itemDate = item.platne_do.split(' ')[0]; // Extrahovat jen datum (YYYY-MM-DD)
        if (!itemDate.includes(columnFilters.platne_do)) {
          return false;
        }
      }

      return true;
    });
  }, [lpKody, globalFilter, columnFilters]);

  // ============= TABLE DEFINITION =============
  const columns = useMemo(
    () => [
      {
        accessorKey: 'cislo_lp',
        header: 'Číslo LP',
        cell: ({ row }) => (
          <div style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
            <LPCodeBadge>
              {row.original.cislo_lp}
            </LPCodeBadge>
            <sup style={{
              fontSize: '0.65em',
              opacity: 0.5,
              marginLeft: '0.35rem',
              color: '#6b7280',
              fontWeight: '600'
            }}>
              #{row.original.id}
            </sup>
          </div>
        ),
      },
      {
        accessorKey: 'cislo_uctu',
        header: 'Číslo účtu',
        cell: ({ row }) => <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.original.cislo_uctu || '—'}</span>,
      },
      {
        accessorKey: 'nazev_uctu',
        header: 'Název účtu',
        cell: ({ row }) => <div style={{ textAlign: 'left' }}>{row.original.nazev_uctu || '—'}</div>,
      },
      {
        accessorKey: 'vyuziti',
        header: 'Využití',
        cell: ({ row }) => <div style={{ textAlign: 'left', fontSize: '0.85rem' }}>{row.original.vyuziti || '—'}</div>,
      },
      {
        accessorKey: 'usek_zkr',
        header: 'Úsek',
        cell: ({ row }) => (
          <div title={row.original.usek_nazev}>
            <strong>{row.original.usek_zkr || '—'}</strong>
          </div>
        ),
      },
      {
        accessorKey: 'prikazce',
        header: 'Příkazce',
        cell: ({ row }) => {
          const titul = row.original.prikazce_titul || '';
          const prijmeni = row.original.prikazce_prijmeni || '';
          const jmeno = row.original.prikazce_jmeno || '';
          const celeMeno = [titul, prijmeni, jmeno].filter(Boolean).join(' ');
          return <div style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{celeMeno || '—'}</div>;
        },
      },
      {
        accessorKey: 'kategorie',
        header: 'Kategorie',
        cell: ({ row }) => row.original.kategorie || '—',
      },
      {
        accessorKey: 'vyse_financniho_kryti',
        header: 'Výše krytí',
        cell: ({ row }) => (
          <div style={{ 
            textAlign: 'right', 
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#374151',
            fontWeight: '500'
          }}>
            {formatCurrency(row.original.vyse_financniho_kryti)}
          </div>
        ),
      },
      {
        accessorKey: 'cerpani',
        header: 'Čerpání',
        cell: ({ row }) => {
          const vyse = parseFloat(row.original.vyse_financniho_kryti) || 0;
          const cerpano = parseFloat(row.original.cerpano) || 0;
          const zbyva = vyse - cerpano;
          const jePrecerpano = zbyva < 0;
          const procento = vyse > 0 ? (cerpano / vyse) * 100 : 0;
          
          return (
            <div style={{ 
              textAlign: 'right', 
              fontSize: '0.8rem',
              lineHeight: '1.4'
            }}>
              <div style={{ 
                color: jePrecerpano ? '#dc2626' : procento > 90 ? '#dc2626' : procento > 75 ? '#f59e0b' : '#059669',
                fontWeight: '600'
              }}>
                {formatCurrency(cerpano)}
              </div>
              <div style={{ 
                color: jePrecerpano ? '#dc2626' : '#6b7280',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>
                zbývá: {formatCurrency(zbyva)}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'platne_od',
        header: 'Platné od',
        cell: ({ row }) => formatDate(row.original.platne_od),
      },
      {
        accessorKey: 'platne_do',
        header: 'Platné do',
        cell: ({ row }) => formatDate(row.original.platne_do),
      },
      {
        id: 'actions',
        header: () => (
          <FontAwesomeIcon icon={faBolt} style={{ color: '#eab308', fontSize: '16px' }} />
        ),
        cell: ({ row }) => (
          <ActionCell>
            {canEdit && (
              <>
                <IconButton
                  className="edit"
                  onClick={() => handleEditClick(row.original)}
                  title="Upravit LP kód"
                >
                  <FontAwesomeIcon icon={faEdit} />
                </IconButton>
                <IconButton
                  className="delete"
                  onClick={() => handleDeleteClick(row.original)}
                  title="Smazat LP kód"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </IconButton>
              </>
            )}
          </ActionCell>
        ),
      },
    ],
    [canEdit]
  );

  // ============= TABLE INSTANCE =============
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex, pageSize });
        setPageIndex(newState.pageIndex);
        setPageSize(newState.pageSize);
      }
    },
    manualPagination: false,
  });

  // ============= HANDLERS =============
  const handleCreate = () => {
    setDialogMode('create');
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (item) => {
    setDialogMode('edit');
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (item) => {
    setDeletingItem(item);
    setIsConfirmOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      if (dialogMode === 'create') {
        await createLimitovanePrislib({
          token,
          username: user.username,
          ...formData
        });
        showToast('LP kód byl úspěšně vytvořen', 'success');
      } else {
        await updateLimitovanePrislib({
          token,
          username: user.username,
          id: editingItem.id,
          ...formData
        });
        showToast('LP kód byl úspěšně aktualizován', 'success');
      }
      setIsDialogOpen(false);
      if (typeof invalidateCache === 'function') {
        invalidateCache('limitovane_prisliby');
      }
      fetchData();
    } catch (error) {
      showToast(error.message || 'Chyba při ukládání LP kódu', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteLimitovanePrislib({
        token,
        username: user.username,
        id: deletingItem.id
      });
      showToast('LP kód byl úspěšně smazán', 'success');
      setIsConfirmOpen(false);
      if (typeof invalidateCache === 'function') {
        invalidateCache('limitovane_prisliby');
      }
      fetchData();
    } catch (error) {
      showToast(error.message || 'Chyba při mazání LP kódu', 'error');
    }
  };

  const handleClearFilters = () => {
    setColumnFilters({
      cislo_lp: '',
      cislo_uctu: '',
      nazev_uctu: '',
      vyuziti: '',
      usek_zkr: '',
      kategorie: '',
      vyse_financniho_kryti: '',
      platne_od: '',
      platne_do: ''
    });
  };

  // ============= PAGINATION HANDLERS =============
  const goToFirstPage = () => {
    setPageIndex(0);
  };

  const goToPreviousPage = () => {
    setPageIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setPageIndex(prev => Math.min(table.getPageCount() - 1, prev + 1));
  };

  const goToLastPage = () => {
    setPageIndex(table.getPageCount() - 1);
  };

  // ============= RENDER =============
  return (
    <Container>
      <ActionBar>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Vyhledat LP kód, účet, využití..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          {globalFilter && (
            <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>

        {canEdit && (
          <ActionButton $primary onClick={handleCreate} title="Vytvořit nový LP kód">
            <FontAwesomeIcon icon={faPlus} />
            Nový LP kód
          </ActionButton>
        )}
      </ActionBar>

      <TableContainer>
        {loading ? (
          <LoadingState>Načítám LP kódy...</LoadingState>
        ) : (
          <>
            <Table>
              <tbody>
                {/* První řádek - názvy sloupců */}
                <TableHeaderRow>
                  {table.getHeaderGroups()[0].headers.map(header => (
                    <TableHeaderCell key={header.id}>
                      <HeaderContent
                        className={header.id === 'cislo_lp' || header.id === 'nazev_uctu' || header.id === 'vyuziti' ? 'left' : ''}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                      >
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getIsSorted() && (
                          <FontAwesomeIcon
                            icon={header.column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
                            style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}
                          />
                        )}
                      </HeaderContent>
                    </TableHeaderCell>
                  ))}
                </TableHeaderRow>

                {/* Druhý řádek - filtry */}
                <TableHeaderFilterRow>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="LP..."
                        value={columnFilters.cislo_lp || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, cislo_lp: e.target.value }))}
                      />
                      {columnFilters.cislo_lp && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { cislo_lp, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Účet..."
                        value={columnFilters.cislo_uctu || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, cislo_uctu: e.target.value }))}
                      />
                      {columnFilters.cislo_uctu && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { cislo_uctu, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Název..."
                        value={columnFilters.nazev_uctu || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, nazev_uctu: e.target.value }))}
                      />
                      {columnFilters.nazev_uctu && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { nazev_uctu, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Využití..."
                        value={columnFilters.vyuziti || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, vyuziti: e.target.value }))}
                      />
                      {columnFilters.vyuziti && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { vyuziti, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Úsek..."
                        value={columnFilters.usek_zkr || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, usek_zkr: e.target.value }))}
                      />
                      {columnFilters.usek_zkr && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { usek_zkr, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Příkazce..."
                        value={columnFilters.prikazce || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, prikazce: e.target.value }))}
                      />
                      {columnFilters.prikazce && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { prikazce, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Kategorie..."
                        value={columnFilters.kategorie || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, kategorie: e.target.value }))}
                      />
                      {columnFilters.kategorie && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { kategorie, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder=">= 1000000"
                        value={columnFilters.vyse_financniho_kryti || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, vyse_financniho_kryti: e.target.value }))}
                        title="Použijte operátory: > < >= <= ="
                      />
                      {columnFilters.vyse_financniho_kryti && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { vyse_financniho_kryti, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    {/* Čerpání - bez filtru */}
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="YYYY-MM-DD"
                        value={columnFilters.platne_od || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, platne_od: e.target.value }))}
                      />
                      {columnFilters.platne_od && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { platne_od, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="YYYY-MM-DD"
                        value={columnFilters.platne_do || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, platne_do: e.target.value }))}
                      />
                      {columnFilters.platne_do && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { platne_do, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderFilterCell>
                  <TableHeaderFilterCell>
                    <FilterActionButton onClick={handleClearFilters} title="Vymazat všechny filtry">
                      <FontAwesomeIcon icon={faEraser} />
                    </FilterActionButton>
                  </TableHeaderFilterCell>
                </TableHeaderFilterRow>

                {/* Data rows */}
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <TableCell colSpan={table.getAllColumns().length} style={{ textAlign: 'center', padding: '2rem' }}>
                      <EmptyState>
                        <Coins size={48} />
                        <h3>{lpKody.length === 0 ? 'Žádné LP kódy' : 'Nenalezeny žádné LP kódy'}</h3>
                        <p>{lpKody.length === 0 ? 'Nejsou k dispozici žádné LP kódy' : 'Zkuste změnit vyhledávání nebo filtry'}</p>
                      </EmptyState>
                    </TableCell>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, idx) => (
                    <TableRow key={row.id} $isEven={idx % 2 === 0}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </tbody>
            </Table>

            {/* Pagination */}
            <Pagination>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <PaginationButton onClick={goToFirstPage} disabled={!table.getCanPreviousPage()}>
                  ««
                </PaginationButton>
                <PaginationButton onClick={goToPreviousPage} disabled={!table.getCanPreviousPage()}>
                  «
                </PaginationButton>
                <PaginationButton onClick={goToNextPage} disabled={!table.getCanNextPage()}>
                  »
                </PaginationButton>
                <PaginationButton onClick={goToLastPage} disabled={!table.getCanNextPage()}>
                  »»
                </PaginationButton>
              </div>

              <PageInfo>
                Strana {table.getState().pagination.pageIndex + 1} z {table.getPageCount() || 1} •{' '}
                Celkem {filteredData.length} záznamů
              </PageInfo>

              <PageSizeSelect
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(0);
                }}
              >
                <option value={10}>10 řádků</option>
                <option value={20}>20 řádků</option>
                <option value={50}>50 řádků</option>
                <option value={100}>100 řádků</option>
              </PageSizeSelect>
            </Pagination>
          </>
        )}
      </TableContainer>

      {/* Dialog pro vytvoření/editaci */}
      {isDialogOpen && (
        <LPFormModal
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          mode={dialogMode}
          initialData={editingItem}
        />
      )}

      {/* Confirm dialog pro mazání */}
      {isConfirmOpen && (
        <DictionaryConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Smazat LP kód?"
          message={`Opravdu chcete smazat LP kód "${deletingItem?.cislo_lp}"? Tato akce je nevratná.`}
          confirmText="Smazat"
          cancelText="Zrušit"
        />
      )}
    </Container>
  );
};

export default LimitovanePrislibTab;
