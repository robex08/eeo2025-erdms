/**
 * Práva Tab - Správa práv s plnou CRUD funkcionalitou
 *
 * DB: id, kod_prava, popis, aktivni
 * API: /ciselniky/prava/list, insert, update, delete
 *
 * Features:
 * - TanStack Table s řazením
 * - Globální fulltextové vyhledávání
 * - Sloupcové textové filtry (kod_prava, popis)
 * - Icon filtr pro aktivní/neaktivní
 * - localStorage perzistence filtrů
 * - ID jako superscript
 * - Plná CRUD funkcionalita (vytvoření, editace, mazání)
 * - Oprávnění: ADMIN nebo DICT_MANAGE
 *
 * @date 2025-11-17
 */

import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faPlus, faEdit, faTrash,
  faChevronUp, faChevronDown, faTimes,
  faCheckCircle, faTimesCircle, faExclamationCircle, faBolt, faEraser
} from '@fortawesome/free-solid-svg-icons';
import { Key, Users } from 'lucide-react';
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
  getPravaList,
  createPravo,
  updatePravo,
  deletePravo
} from '../../../services/apiv2Dictionaries';
import UniversalDictionaryDialog from '../UniversalDictionaryDialog';
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
  border: 2px solid #3b82f6;
  border-radius: 8px;
  background: ${props => props.$primary ? '#3b82f6' : 'white'};
  color: ${props => props.$primary ? 'white' : '#3b82f6'};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary ? '#2563eb' : '#eff6ff'};
    border-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
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
  th:nth-of-type(1), td:nth-of-type(1) { width: auto; }     /* Popis práva */
  th:nth-of-type(2), td:nth-of-type(2) { width: 200px; }    /* Kód práva */
  th:nth-of-type(3), td:nth-of-type(3) { width: 140px; }    /* Počet uživatelů */
  th:nth-of-type(4), td:nth-of-type(4) { width: 90px; }     /* Aktivní */
  th:last-child, td:last-child { width: 100px; }            /* Akce */
`;

const TableHeaderRow = styled.tr`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem 1rem;
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
  gap: 0.5rem;
  user-select: none;
`;

const TableRow = styled.tr`
  background: ${props => props.$isEven ? '#f8fafc' : 'white'};
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
  }
`;

const TableCell = styled.td`
  padding: 1rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #374151;
  vertical-align: middle;
  text-align: center;

  &:first-of-type {
    text-align: left;
  }
`;

const ActionCell = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
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

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

// Column filter components
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
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 0.75rem;
  }
`;

const ColumnFilter = styled(ColumnFilterInput)``;

const IconFilterButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }

  svg {
    width: 20px;
    height: 20px;
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
    border-color: #3b82f6;
    color: #3b82f6;
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

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

const PageButton = styled(PaginationButton)``;

const PageInfo = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
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

const LoadingOverlay = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
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

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
  font-size: 1rem;
`;

const InfoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  font-size: 0.875rem;
  color: #475569;
  white-space: nowrap;
`;

const CodeBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #475569;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #3730a3;
  font-family: monospace;
`;

const PermissionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
  border-radius: 6px;
  font-weight: 500;
  color: #1e40af;
`;

const UserCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: help;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

// =============================================================================
// COMPONENT
// =============================================================================

const PravaTab = () => {
  const { token, user, userDetail, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { cache, loadDictionary, invalidateCache } = useContext(DictionaryCacheContext);

  // Kontrola oprávnění pro editaci
  const canEdit = hasPermission('ADMIN') || hasPermission('DICT_MANAGE');

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

  // ============= STATE =============
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [globalFilter, setGlobalFilter] = useState(() => {
    return getUserStorage('prava_globalFilter', '');
  });

  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('prava_columnFilters', {});
  });

  const [aktivniFilter, setAktivniFilter] = useState(() => {
    return getUserStorage('prava_aktivniFilter', 'all');
  });

  const [sorting, setSorting] = useState(() => {
    return getUserStorage('prava_sorting', []);
  });

  const [pageSize, setPageSize] = useState(() => {
    return getUserStorage('prava_pageSize', 25);
  });

  const [pageIndex, setPageIndex] = useState(() => {
    return getUserStorage('prava_pageIndex', 0);
  });

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [editingItem, setEditingItem] = useState(null);

  // Confirm dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);

  // ============= SAVE TO LOCALSTORAGE =============
  useEffect(() => {
    setUserStorage('prava_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('prava_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('prava_aktivniFilter', aktivniFilter);
  }, [aktivniFilter, user_id]);

  useEffect(() => {
    setUserStorage('prava_sorting', sorting);
  }, [sorting, user_id]);

  useEffect(() => {
    setUserStorage('prava_pageSize', pageSize);
  }, [pageSize, user_id]);

  useEffect(() => {
    setUserStorage('prava_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  // ============= DATA FETCHING =============
  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await loadDictionary('prava');
      setData(result || []);
    } catch (error) {
      showToast(error.message || 'Chyba při načítání práv', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.username) {
      if (cache.prava?.loaded && cache.prava.data) {
        setData(cache.prava.data);
        setLoading(false);
      } else {
        fetchData();
      }
    } else {
    }
  }, [token, user?.username, cache.prava?.loaded]);

  // ============= FILTERED DATA =============
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Icon filtr - aktivní/neaktivní
      // Normalizace aktivni pole (může být 1/0, "1"/"0" nebo true/false)
      const isAktivni = item.aktivni === 1 || item.aktivni === true || item.aktivni === "1";

      if (aktivniFilter === 'aktivni' && !isAktivni) return false;
      if (aktivniFilter === 'neaktivni' && isAktivni) return false;

      // Global filter
      if (globalFilter) {
        const searchLower = globalFilter.toLowerCase();
        const matchGlobal =
          (item.kod_prava || '').toLowerCase().includes(searchLower) ||
          (item.popis || '').toLowerCase().includes(searchLower) ||
          (item.id || '').toString().toLowerCase().includes(searchLower);

        if (!matchGlobal) return false;
      }

      // Column filters - textové
      if (columnFilters.kod_prava &&
          !(item.kod_prava || '').toLowerCase().includes(columnFilters.kod_prava.toLowerCase())) {
        return false;
      }

      if (columnFilters.popis &&
          !(item.popis || '').toLowerCase().includes(columnFilters.popis.toLowerCase())) {
        return false;
      }

      // Filtr počtu uživatelů (číselný)
      if (columnFilters.pocet_uzivatelu &&
          item.pocet_uzivatelu !== undefined &&
          !item.pocet_uzivatelu.toString().includes(columnFilters.pocet_uzivatelu)) {
        return false;
      }

      return true;
    });
  }, [data, globalFilter, columnFilters, aktivniFilter]);

  // ============= COLUMNS DEFINITION =============
  const columns = useMemo(() => [
    {
      accessorKey: 'popis',
      header: 'Popis práva',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Key size={16} style={{ color: '#3b82f6', marginTop: '2px' }} />
          <span style={{ fontWeight: '600', color: row.original.popis ? '#374151' : '#9ca3af' }}>
            {row.original.popis || '-'}
            <sup style={{
              fontSize: '0.65em',
              opacity: 0.6,
              marginLeft: '0.25rem',
              color: '#6b7280',
              fontWeight: 'normal'
            }}>
              #{row.original.id}
            </sup>
          </span>
        </div>
      )
    },
    {
      accessorKey: 'kod_prava',
      header: 'Kód práva',
      cell: ({ getValue }) => (
        <Badge>{getValue() || '—'}</Badge>
      )
    },
    {
      accessorKey: 'pocet_uzivatelu',
      header: 'Počet uživatelů',
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {row.original.pocet_uzivatelu !== undefined ? (
            <UserCountBadge
              title={`${row.original.pocet_uzivatelu} ${row.original.pocet_uzivatelu === 1 ? 'uživatel má' : 'uživatelů má'} toto právo`}
            >
              <Users size={12} />
              {row.original.pocet_uzivatelu}
            </UserCountBadge>
          ) : (
            <span style={{ color: '#9ca3af' }}>—</span>
          )}
        </div>
      )
    },
    {
      accessorKey: 'aktivni',
      header: 'Aktivní',
      cell: ({ row }) => {
        // Normalizace aktivni pole (může být 1/0, "1"/"0" nebo true/false)
        const isAktivni = row.original.aktivni === 1 || row.original.aktivni === true || row.original.aktivni === "1";
        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FontAwesomeIcon
              icon={isAktivni ? faCheckCircle : faTimesCircle}
              style={{
                color: isAktivni ? '#22c55e' : '#ef4444',
                fontSize: '18px'
              }}
            />
          </div>
        );
      }
    },
    ...(canEdit ? [{
      id: 'actions',
      header: () => (
        <div style={{
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
        }}>
          <FontAwesomeIcon
            icon={faBolt}
            style={{
              color: '#eab308',
              fontSize: '16px'
            }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <ActionCell>
          <IconButton
            className="edit"
            onClick={() => handleEdit(row.original)}
            title="Upravit právo"
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            className="delete"
            onClick={() => handleDeleteClick(row.original)}
            title="Smazat právo"
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </ActionCell>
      )
    }] : [])
  ], [data]);

  // ============= TABLE INSTANCE =============
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function'
        ? updater({ pageSize, pageIndex })
        : updater;
      setPageSize(newState.pageSize);
      setPageIndex(newState.pageIndex);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  // ============= HANDLERS =============
  const handleCreate = () => {
    setDialogMode('create');
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item) => {
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
        await createPravo({
          token,
          username: user.username,
          ...formData
        });
        showToast('Právo bylo úspěšně vytvořeno', 'success');
      } else {
        await updatePravo({
          token,
          username: user.username,
          id: editingItem.id,
          ...formData
        });
        showToast('Právo bylo úspěšně aktualizováno', 'success');
      }
      setIsDialogOpen(false);
      invalidateCache('prava');
      fetchData();
    } catch (error) {
      showToast(error.message || 'Chyba při ukládání práva', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deletePravo({
        token,
        username: user.username,
        id: deletingItem.id
      });
      showToast('Právo bylo úspěšně smazáno', 'success');
      setIsConfirmOpen(false);
      invalidateCache('prava');
      fetchData();
    } catch (error) {
      showToast(error.message || 'Chyba při mazání práva', 'error');
    }
  };

  const handleAktivniFilterClick = () => {
    setAktivniFilter(prev => {
      if (prev === 'all') return 'aktivni';
      if (prev === 'aktivni') return 'neaktivni';
      return 'all';
    });
  };

  const handleClearFilters = () => {
    setColumnFilters({});
    setAktivniFilter('all');
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
            placeholder="Vyhledat v právech..."
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
          <ActionButton $primary onClick={handleCreate} title="Vytvořit nové právo">
            <FontAwesomeIcon icon={faPlus} />
            Nové právo
          </ActionButton>
        )}
      </ActionBar>

      <TableContainer>
        {loading ? (
          <LoadingState>Načítám práva...</LoadingState>
        ) : (
          <>
            <Table>
              <tbody>
                <TableHeaderRow>
                  {table.getHeaderGroups()[0].headers.map(header => (
                    <TableHeaderCell
                      key={header.id}
                      style={{
                        width: header.id === 'aktivni' ? '80px' :
                               header.id === 'actions' ? '90px' : 'auto',
                        maxWidth: header.id === 'aktivni' ? '80px' :
                                  header.id === 'actions' ? '90px' : 'none'
                      }}
                    >
                      <HeaderContent
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ cursor: 'pointer' }}
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

                <TableHeaderFilterRow>
                  <TableHeaderCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Hledat popis..."
                        value={columnFilters.popis || ''}
                        onChange={(e) => setColumnFilters(prev => ({...prev, popis: e.target.value}))}
                      />
                      {columnFilters.popis && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { popis, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Kód..."
                        value={columnFilters.kod_prava || ''}
                        onChange={(e) => setColumnFilters(prev => ({...prev, kod_prava: e.target.value}))}
                      />
                      {columnFilters.kod_prava && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { kod_prava, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="number"
                        placeholder="Počet..."
                        value={columnFilters.pocet_uzivatelu || ''}
                        onChange={(e) => setColumnFilters(prev => ({...prev, pocet_uzivatelu: e.target.value}))}
                      />
                      {columnFilters.pocet_uzivatelu && (
                        <ColumnClearButton
                          onClick={() => setColumnFilters(prev => {
                            const { pocet_uzivatelu, ...rest } = prev;
                            return rest;
                          })}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeaderCell>
                  <TableHeaderCell style={{ width: '90px', maxWidth: '90px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <IconFilterButton
                        onClick={handleAktivniFilterClick}
                        title={
                          aktivniFilter === 'all' ? 'Zobrazeny všechny (klikněte pro filtr aktivních)' :
                          aktivniFilter === 'aktivni' ? 'Zobrazeny pouze aktivní (klikněte pro filtr neaktivních)' :
                          'Zobrazeny pouze neaktivní (klikněte pro zobrazení všech)'
                        }
                      >
                        {aktivniFilter === 'all' ? (
                          <div style={{ position: 'relative', width: '20px', height: '20px' }}>
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
                                color: '#16a34a'
                              }}
                            />
                            <FontAwesomeIcon
                              icon={faTimesCircle}
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
                                color: '#dc2626'
                              }}
                            />
                          </div>
                        ) : aktivniFilter === 'aktivni' ? (
                          <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#16a34a' }} />
                        ) : (
                          <FontAwesomeIcon icon={faTimesCircle} style={{ color: '#dc2626' }} />
                        )}
                      </IconFilterButton>
                    </div>
                  </TableHeaderCell>
                  {canEdit && (
                    <TableHeaderCell style={{ width: '90px', maxWidth: '90px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <FilterActionButton
                          onClick={handleClearFilters}
                          title="Vymazat všechny filtry"
                        >
                          <FontAwesomeIcon icon={faEraser} />
                        </FilterActionButton>
                      </div>
                    </TableHeaderCell>
                  )}
                </TableHeaderFilterRow>

                {filteredData.length === 0 ? (
                  <tr>
                    <TableCell colSpan={canEdit ? 5 : 4}>
                      <EmptyState>
                        <Key size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                        <h3>{data.length === 0 ? 'Žádná práva' : 'Nenalezena žádná práva'}</h3>
                        <p>{data.length === 0 ? 'Nejsou k dispozici žádná práva' : 'Zkuste změnit vyhledávání nebo filtry'}</p>
                      </EmptyState>
                    </TableCell>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          style={{
                            width: cell.column.id === 'aktivni' ? '80px' :
                                   cell.column.id === 'actions' ? '90px' : 'auto',
                            maxWidth: cell.column.id === 'aktivni' ? '80px' :
                                      cell.column.id === 'actions' ? '90px' : 'none'
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </tbody>
            </Table>

            <Pagination>
              <PaginationInfo>
                Zobrazeno {Math.min(pageIndex * pageSize + 1, filteredData.length)} - {Math.min((pageIndex + 1) * pageSize, filteredData.length)} z {filteredData.length} práv
              </PaginationInfo>

              <PaginationControls>
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

                <PageButton
                  onClick={goToFirstPage}
                  disabled={pageIndex === 0}
                >
                  ««
                </PageButton>
                <PageButton
                  onClick={goToPreviousPage}
                  disabled={pageIndex === 0}
                >
                  ‹
                </PageButton>

                <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
                  Stránka {pageIndex + 1} z {Math.max(1, table.getPageCount())}
                </span>

                <PageButton
                  onClick={goToNextPage}
                  disabled={pageIndex >= table.getPageCount() - 1}
                >
                  ›
                </PageButton>
                <PageButton
                  onClick={goToLastPage}
                  disabled={pageIndex >= table.getPageCount() - 1}
                >
                  »»
                </PageButton>
              </PaginationControls>
            </Pagination>
          </>
        )}
      </TableContainer>

      {/* Dialog pro vytvoření/úpravu práva */}
      <UniversalDictionaryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        editData={editingItem}
        title={dialogMode === 'create' ? 'Vytvořit nové právo' : 'Upravit právo'}
        icon={Key}
        fields={[
          { name: 'kod_prava', label: 'Kód práva', type: 'text', required: true },
          { name: 'popis', label: 'Popis', type: 'textarea', required: false },
          { name: 'aktivni', label: 'Aktivní', type: 'checkbox', required: false, default: true }
        ]}
      />

      {/* Potvrzovací dialog pro smazání */}
      <DictionaryConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Smazat právo"
        message={`Opravdu chcete smazat právo "${deletingItem?.kod_prava || deletingItem?.popis}"?`}
      />
    </Container>
  );
};

export default PravaTab;
