/**
 * Úseky Tab - Správa úseků s TanStack Table
 *
 * DB: id, usek_nazev, usek_zkr, aktivni
 * API: /ciselniky/useky/list|by-id|insert|update|delete
 *
 * Features:
 * - TanStack Table s řazením
 * - Globální fulltextové vyhledávání
 * - Sloupcové textové filtry
 * - Icon filtr pro aktivní/neaktivní
 * - localStorage perzistence filtrů
 * - ID jako superscript
 * - CRUD operace (Create, Update, Delete)
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
import { Network, Users } from 'lucide-react';
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
  getUsekyList,
  createUsek,
  updateUsek,
  deleteUsek,
} from '../../../services/apiv2Dictionaries';
import UniversalDictionaryDialog from '../UniversalDictionaryDialog';
import DictionaryConfirmDialog from '../DictionaryConfirmDialog';

// =============================================================================
// STYLED COMPONENTS (same as PoziceTab)
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
  th:nth-of-type(1), td:nth-of-type(1) { width: auto; }     /* Název úseku */
  th:nth-of-type(2), td:nth-of-type(2) { width: 150px; }    /* Zkratka */
  th:nth-of-type(3), td:nth-of-type(3) { width: 140px; }    /* Počet uživatelů */
  th:nth-of-type(4), td:nth-of-type(4) { width: 90px; }     /* Aktivní */
  th:last-child, td:last-child { width: 100px; }            /* Akce */
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

// =============================================================================
// COMPONENT
// =============================================================================

const UsekyTab = () => {
  const { token, user, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { cache, loadDictionary, refreshDictionary, invalidateCache } = useContext(DictionaryCacheContext);

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
    return getUserStorage('useky_globalFilter', '');
  });

  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('useky_columnFilters', {});
  });

  const [aktivniFilter, setAktivniFilter] = useState(() => {
    return getUserStorage('useky_aktivniFilter', 'all');
  });

  const [sorting, setSorting] = useState(() => {
    return getUserStorage('useky_sorting', []);
  });

  const [pageSize, setPageSize] = useState(() => {
    return getUserStorage('useky_pageSize', 25);
  });

  const [pageIndex, setPageIndex] = useState(() => {
    return getUserStorage('useky_pageIndex', 0);
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
    setUserStorage('useky_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('useky_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('useky_aktivniFilter', aktivniFilter);
  }, [aktivniFilter, user_id]);

  useEffect(() => {
    setUserStorage('useky_sorting', sorting);
  }, [sorting, user_id]);

  useEffect(() => {
    setUserStorage('useky_pageSize', pageSize);
  }, [pageSize, user_id]);

  useEffect(() => {
    setUserStorage('useky_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  // ============= DATA FETCHING =============
  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await loadDictionary('useky');
      setData(result || []);
    } catch (error) {
      showToast(error.message || 'Chyba při načítání úseků', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.username) {
      // Pokud jsou data v cache, použij je
      if (cache.useky?.loaded && cache.useky.data) {
        setData(cache.useky.data);
        setLoading(false);
      } else {
        fetchData();
      }
    } else {
    }
  }, [token, user?.username, cache.useky?.loaded]);

  // ============= FILTERED DATA =============
  const filteredData = useMemo(() => {
    const filtered = data.filter((item) => {
      // Icon filtr - aktivní/neaktivní
      // Normalizace aktivni pole (může být 1/0, "1"/"0" nebo true/false)
      const isAktivni = item.aktivni === 1 || item.aktivni === true || item.aktivni === "1";

      if (aktivniFilter === 'aktivni' && !isAktivni) return false;
      if (aktivniFilter === 'neaktivni' && isAktivni) return false;

      // Global filter
      if (globalFilter) {
        const searchLower = globalFilter.toLowerCase();
        const matchGlobal =
          (item.usek_nazev || '').toLowerCase().includes(searchLower) ||
          (item.usek_zkr || '').toLowerCase().includes(searchLower) ||
          (item.id || '').toString().toLowerCase().includes(searchLower);

        if (!matchGlobal) return false;
      }

      // Column filters - textové
      if (columnFilters.usek_nazev &&
          !(item.usek_nazev || '').toLowerCase().includes(columnFilters.usek_nazev.toLowerCase())) {
        return false;
      }

      if (columnFilters.usek_zkr &&
          !(item.usek_zkr || '').toLowerCase().includes(columnFilters.usek_zkr.toLowerCase())) {
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

    return filtered;
  }, [data, globalFilter, columnFilters, aktivniFilter]);

  // ============= COLUMNS DEFINITION =============
  const columns = useMemo(() => [
    {
      accessorKey: 'usek_nazev',
      header: 'Název úseku',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Network size={16} style={{ color: '#3b82f6', marginTop: '2px' }} />
          <span>
            {row.original.usek_nazev}
            <sup style={{
              fontSize: '0.65em',
              opacity: 0.6,
              marginLeft: '0.25rem',
              color: '#6b7280'
            }}>
              #{row.original.id}
            </sup>
          </span>
        </div>
      )
    },
    {
      accessorKey: 'usek_zkr',
      header: 'Zkratka',
      cell: ({ row }) => (
        <Badge>{row.original.usek_zkr}</Badge>
      )
    },
    {
      accessorKey: 'pocet_uzivatelu',
      header: 'Počet uživatelů',
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {row.original.pocet_uzivatelu !== undefined ? (
            <UserCountBadge
              title={`${row.original.pocet_uzivatelu} ${row.original.pocet_uzivatelu === 1 ? 'uživatel má' : 'uživatelů má'} tento úsek`}
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
            title="Upravit úsek"
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            className="delete"
            onClick={() => handleDeleteClick(row.original)}
            title="Smazat úsek"
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </ActionCell>
      )
    }
  ], []);

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
        await createUsek({
          token,
          username: user.username,
          ...formData
        });
        showToast('Úsek byl vytvořen', 'success');
        invalidateCache('useky');
        fetchData();
        setIsDialogOpen(false);
      } else {
        await updateUsek({
          token,
          username: user.username,
          id: editingItem.id,
          ...formData
        });
        showToast('Úsek byl aktualizován', 'success');
        invalidateCache('useky');
        fetchData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      showToast(error.message || 'Chyba při ukládání úseku', 'error');
    }
  };
  const handleConfirmDelete = async () => {
    try {
      await deleteUsek({
        token,
        username: user.username,
        id: deletingItem.id
      });
      showToast('Úsek byl smazán', 'success');
      invalidateCache('useky');
      fetchData();
      setIsConfirmOpen(false);
      setDeletingItem(null);
    } catch (error) {
      showToast(error.message || 'Chyba při mazání úseku', 'error');
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
      name: 'usek_nazev',
      label: 'Název úseku',
      type: 'text',
      required: true,
      placeholder: 'Zadejte název úseku'
    },
    {
      name: 'usek_zkr',
      label: 'Zkratka',
      type: 'text',
      required: true,
      placeholder: 'Zadejte zkratku (např. IT, HR)'
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
          <div style={{ marginTop: '1rem' }}>Načítám úseky...</div>
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
            placeholder="Vyhledat v úsecích..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          {globalFilter && (
            <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>

        <ActionButton $primary onClick={handleCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Nový úsek
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
                      {header.id === 'usek_nazev' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Filtrovat..."
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
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'usek_zkr' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Filtrovat..."
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
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'aktivni' && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '32px' }}>
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

                {/* Data rows */}
                {loading ? (
                  <tr>
                    <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                      Načítám...
                    </TableCell>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                      <EmptyState>
                        <Network size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                        <h3>{data.length === 0 ? 'Žádné úseky' : 'Nenalezeny žádné úseky'}</h3>
                        <p>{data.length === 0 ? 'Nejsou k dispozici žádné úseky' : 'Zkuste změnit vyhledávání nebo filtry'}</p>
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
                Zobrazeno {Math.min(pageIndex * pageSize + 1, filteredData.length)} - {Math.min((pageIndex + 1) * pageSize, filteredData.length)} z {filteredData.length} úseků
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
        title={dialogMode === 'create' ? 'Nový úsek' : 'Upravit úsek'}
        fields={dialogFields}
        initialData={editingItem}
      />

      <DictionaryConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Smazat úsek"
        message={`Opravdu chcete smazat úsek "${deletingItem?.usek_nazev}"?`}
      />
    </Container>
  );
};

export default UsekyTab;
