/**
 * Pozice Tab - Správa pozic s TanStack Table
 *
 * DB: id, nazev_pozice, parent_id, usek_zkr, usek_nazev, usek_popis, aktivni
 * API: /ciselniky/pozice/list|by-id|insert|update|delete
 *
 * Features:
 * - TanStack Table s řazením
 * - Globální fulltextové vyhledávání
 * - Sloupcové textové filtry
 * - Icon filtr pro aktivní/neaktivní
 * - localStorage perzistence filtrů
 * - ID jako superscript
 * - CRUD operace (Create, Update, Delete)
 * - Úsek zobrazený jako: usek_zkr - usek_nazev + usek_popis (2 řádky)
 *
 * @date 2025-10-23
 */

import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faSearch, faEdit, faTrash,
  faChevronUp, faChevronDown, faTimes,
  faCheckCircle, faTimesCircle, faBolt, faSyncAlt, faEraser
} from '@fortawesome/free-solid-svg-icons';
import { Briefcase, Users } from 'lucide-react';
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
  getPoziceList,
  createPozice,
  updatePozice,
  deletePozice,
} from '../../../services/apiv2Dictionaries';
import { createDictionaryPermissionHelper } from '../../../utils/dictionaryPermissions';
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
`;

const TableHeaderRow = styled.tr`
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

const ActionCell = styled(TableCell)`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
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
  font-size: 0.875rem;
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

const PoziceTab = () => {
  const { token, user, userDetail, hasPermission, hasAdminRole } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { cache, loadDictionary, invalidateCache } = useContext(DictionaryCacheContext);

  // Oprávnění pro pozice
  const permissions = createDictionaryPermissionHelper('POSITIONS', hasPermission, hasAdminRole);

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
    return getUserStorage('pozice_globalFilter', '');
  });

  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('pozice_columnFilters', {});
  });

  const [aktivniFilter, setAktivniFilter] = useState(() => {
    return getUserStorage('pozice_aktivniFilter', 'all');
  });

  const [sorting, setSorting] = useState(() => {
    return getUserStorage('pozice_sorting', []);
  });

  const [pageSize, setPageSize] = useState(() => {
    return getUserStorage('pozice_pageSize', 25);
  });

  const [pageIndex, setPageIndex] = useState(() => {
    return getUserStorage('pozice_pageIndex', 0);
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
    setUserStorage('pozice_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('pozice_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('pozice_aktivniFilter', aktivniFilter);
  }, [aktivniFilter, user_id]);

  useEffect(() => {
    setUserStorage('pozice_sorting', sorting);
  }, [sorting, user_id]);

  useEffect(() => {
    setUserStorage('pozice_pageSize', pageSize);
  }, [pageSize, user_id]);

  useEffect(() => {
    setUserStorage('pozice_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  // ============= DATA FETCHING =============
  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await loadDictionary('pozice');
      setData(result || []);
    } catch (error) {
      showToast(error.message || 'Chyba při načítání pozic', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.username) {
      if (cache.pozice?.loaded && cache.pozice.data) {
        setData(cache.pozice.data);
        setLoading(false);
      } else {
        fetchData();
      }
    } else {
    }
  }, [token, user?.username, cache.pozice?.loaded]);

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
        const usekText = (item.usek_zkr || '') + ' ' + (item.usek_nazev || '') + ' ' + (item.usek_popis || '');
        const matchGlobal =
          (item.nazev_pozice || '').toLowerCase().includes(searchLower) ||
          usekText.toLowerCase().includes(searchLower) ||
          (item.id || '').toString().toLowerCase().includes(searchLower);

        if (!matchGlobal) return false;
      }

      // Column filters - textové
      if (columnFilters.nazev_pozice &&
          !(item.nazev_pozice || '').toLowerCase().includes(columnFilters.nazev_pozice.toLowerCase())) {
        return false;
      }

      if (columnFilters.usek) {
        const usekText = (item.usek_zkr || '') + ' ' + (item.usek_nazev || '') + ' ' + (item.usek_popis || '');
        if (!usekText.toLowerCase().includes(columnFilters.usek.toLowerCase())) {
          return false;
        }
      }

      if (columnFilters.parent_id && item.parent_id) {
        const parent = data.find(p => p.id === item.parent_id);
        const parentName = parent ? parent.nazev_pozice : '';
        if (!parentName.toLowerCase().includes(columnFilters.parent_id.toLowerCase())) {
          return false;
        }
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

  // ============= PARENT NAME HELPER =============
  const getParentName = (parentId) => {
    if (!parentId) return '-';
    const parent = data.find(p => p.id === parentId);
    return parent ? parent.nazev_pozice : `ID: ${parentId}`;
  };

  // ============= COLUMNS DEFINITION =============
  const columns = useMemo(() => [
    {
      accessorKey: 'nazev_pozice',
      header: 'Název pozice',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Briefcase size={16} style={{ color: '#3b82f6', marginTop: '2px' }} />
          <span style={{ fontWeight: '600' }}>
            {row.original.nazev_pozice}
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
      accessorKey: 'usek',
      header: 'Úsek',
      cell: ({ row }) => {
        const usekZkr = row.original.usek_zkr || '';
        const usekNazev = row.original.usek_nazev || '';
        const usekPopis = row.original.usek_popis || '';

        if (!usekZkr && !usekNazev && !usekPopis) {
          return <span style={{ color: '#9ca3af' }}>-</span>;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {(usekZkr || usekNazev) && (
              <div style={{ color: '#374151' }}>
                {usekZkr && usekNazev ? `${usekZkr} - ${usekNazev}` : (usekZkr || usekNazev)}
              </div>
            )}
            {usekPopis && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {usekPopis}
              </div>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'parent_id',
      header: 'Nadřazená pozice',
      cell: ({ row }) => (
        <span style={{ color: row.original.parent_id ? '#374151' : '#9ca3af' }}>
          {getParentName(row.original.parent_id)}
        </span>
      )
    },
    {
      accessorKey: 'pocet_uzivatelu',
      header: 'Počet uživatelů',
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {row.original.pocet_uzivatelu !== undefined ? (
            <UserCountBadge
              title={`${row.original.pocet_uzivatelu} ${row.original.pocet_uzivatelu === 1 ? 'uživatel má' : 'uživatelů má'} tuto pozici`}
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
    {
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
            title={permissions.canEdit() ? "Upravit pozici" : "Nemáte oprávnění editovat"}
            disabled={!permissions.canEdit()}
            style={{ opacity: permissions.canEdit() ? 1 : 0.4, cursor: permissions.canEdit() ? 'pointer' : 'not-allowed' }}
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            className="delete"
            onClick={() => handleDeleteClick(row.original)}
            title={permissions.canDelete() ? "Smazat pozici" : "Nemáte oprávnění mazat"}
            disabled={!permissions.canDelete()}
            style={{ opacity: permissions.canDelete() ? 1 : 0.4, cursor: permissions.canDelete() ? 'pointer' : 'not-allowed' }}
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </ActionCell>
      )
    }
  ], [data]);

  // ============= TABLE INSTANCE =============
  const table = useReactTable({
    data: filteredData,
    columns,
    initialState: {
      pagination: { pageSize: 25, pageIndex: 0 },
    },
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
        await createPozice({
          token,
          username: user.username,
          ...formData
        });
        showToast('Pozice byla vytvořena', 'success');
        invalidateCache('pozice');
        fetchData();
        setIsDialogOpen(false);
      } else {
        await updatePozice({
          token,
          username: user.username,
          id: editingItem.id,
          ...formData
        });
        showToast('Pozice byla aktualizována', 'success');
        invalidateCache('pozice');
        fetchData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      showToast(error.message || 'Chyba při ukládání pozice', 'error');
    }
  };
  const handleConfirmDelete = async () => {
    try {
      await deletePozice({
        token,
        username: user.username,
        id: deletingItem.id
      });
      showToast('Pozice byla smazána', 'success');
      invalidateCache('pozice');
      fetchData();
      setIsConfirmOpen(false);
      setDeletingItem(null);
    } catch (error) {
      showToast(error.message || 'Chyba při mazání pozice', 'error');
    }
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

  // ============= DIALOG FIELDS =============
  const dialogFields = [
    {
      name: 'nazev_pozice',
      label: 'Název pozice',
      type: 'text',
      required: true,
      placeholder: 'Zadejte název pozice'
    },
    {
      name: 'parent_id',
      label: 'Nadřazená pozice',
      type: 'select',
      required: false,
      options: [
        { value: '', label: 'Žádná (root)' },
        ...data.map(p => ({ value: p.id, label: p.nazev_pozice }))
      ]
    },
    {
      name: 'popis',
      label: 'Popis',
      type: 'textarea',
      required: false,
      placeholder: 'Zadejte popis pozice (volitelné)'
    },
    {
      name: 'aktivni',
      label: 'Aktivní',
      type: 'checkbox',
      required: false
    }
  ];

  // ============= RENDER =============
  if (loading) {
    return (
      <Container>
        <LoadingOverlay>
          <FontAwesomeIcon icon={faSyncAlt} spin size="2x" />
          <div style={{ marginTop: '1rem' }}>Načítám pozice...</div>
        </LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      {/* Action Bar */}
      <ActionBar>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Vyhledat v pozicích..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          {globalFilter && (
            <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>

        <ActionButton
          $primary
          onClick={handleCreate}
          disabled={!permissions.canCreate()}
          title={!permissions.canCreate() ? 'Nemáte oprávnění vytvářet pozice' : 'Přidat novou pozici'}
        >
          <FontAwesomeIcon icon={faPlus} />
          Nová pozice
        </ActionButton>
      </ActionBar>

      {/* Table */}
      <TableContainer>
        <Table>
          <tbody>
            {/* První řádek - názvy sloupců s řazením */}
            <TableHeaderRow>
              {table.getHeaderGroups()[0].headers.map(header => (
                <TableHeaderCell key={header.id}>
                  {header.id !== 'actions' ? (
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
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  )}
                </TableHeaderCell>
              ))}
            </TableHeaderRow>

            {/* Druhý řádek - filtry */}
            <TableHeaderFilterRow>
                  {table.getHeaderGroups()[0].headers.map(header => (
                    <TableHeaderFilterCell key={header.id}>
                      {header.id === 'nazev_pozice' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Hledat..."
                            value={columnFilters[header.id] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { [header.id]: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, [header.id]: value };
                              });
                            }}
                          />
                          {columnFilters[header.id] && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { [header.id]: removed, ...rest } = prev;
                                  return rest;
                                });
                              }}
                              title="Vymazat"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'usek' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Hledat..."
                            value={columnFilters[header.id] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { [header.id]: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, [header.id]: value };
                              });
                            }}
                          />
                          {columnFilters[header.id] && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { [header.id]: removed, ...rest } = prev;
                                  return rest;
                                });
                              }}
                              title="Vymazat"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'parent_id' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Hledat..."
                            value={columnFilters[header.id] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { [header.id]: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, [header.id]: value };
                              });
                            }}
                          />
                          {columnFilters[header.id] && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { [header.id]: removed, ...rest } = prev;
                                  return rest;
                                });
                              }}
                              title="Vymazat"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'pocet_uzivatelu' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="number"
                            placeholder="Počet..."
                            value={columnFilters[header.id] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { [header.id]: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, [header.id]: value };
                              });
                            }}
                          />
                          {columnFilters[header.id] && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { [header.id]: removed, ...rest } = prev;
                                  return rest;
                                });
                              }}
                              title="Vymazat"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'aktivni' && (
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
                      )}

                      {header.id === 'actions' && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '32px' }}>
                          <FilterActionButton
                            onClick={handleClearFilters}
                            title="Vymazat všechny filtry sloupců"
                            disabled={
                              Object.keys(columnFilters).length === 0 &&
                              aktivniFilter === 'all'
                            }
                          >
                            <FontAwesomeIcon icon={faEraser} />
                          </FilterActionButton>
                        </div>
                      )}
                    </TableHeaderFilterCell>
                  ))}
                </TableHeaderFilterRow>

              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <TableCell colSpan={columns.length}>
                    <EmptyState>
                      <Briefcase size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                      <h3>{data.length === 0 ? 'Žádné pozice' : 'Nenalezeny žádné pozice'}</h3>
                      <p>{data.length === 0 ? 'Nejsou k dispozici žádné pozice' : 'Zkuste změnit vyhledávání nebo filtry'}</p>
                    </EmptyState>
                  </TableCell>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow key={row.id} $isEven={index % 2 === 0}>
                    {row.getVisibleCells().map(cell => (
                      cell.column.id === 'actions' ? (
                        <React.Fragment key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </React.Fragment>
                      ) : (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    ))}
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>

          {/* Pagination */}
          <Pagination>
            <PageInfo>
              Zobrazeno {Math.min(pageIndex * pageSize + 1, filteredData.length)} - {Math.min((pageIndex + 1) * pageSize, filteredData.length)} z {filteredData.length} pozic
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
                Stránka {pageIndex + 1} z {Math.max(1, table.getPageCount())}
              </span>

              <PaginationButton
                onClick={goToNextPage}
                disabled={pageIndex >= table.getPageCount() - 1}
              >
                ›
              </PaginationButton>
              <PaginationButton
                onClick={goToLastPage}
                disabled={pageIndex >= table.getPageCount() - 1}
              >
                »»
              </PaginationButton>
            </div>
          </Pagination>
      </TableContainer>

      {/* Dialogs */}
      <UniversalDictionaryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        mode={dialogMode}
        title={dialogMode === 'create' ? 'Nová pozice' : 'Upravit pozici'}
        fields={dialogFields}
        initialData={editingItem}
      />

      <DictionaryConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Smazat pozici"
        message={`Opravdu chcete smazat pozici "${deletingItem?.nazev_pozice}"?`}
      />
    </Container>
  );
};

export default PoziceTab;
