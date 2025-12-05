/**
 * Organizace Tab - Správa organizací s TanStack Table
 *
 * DB: id, nazev_organizace, ico, ulice_cislo, mesto, psc, zastoupeny, datova_schranka, email, telefon
 * API: /ciselniky/organizace/list|by-id|insert|update|delete
 *
 * Features:
 * - TanStack Table s řazením
 * - Globální fulltextové vyhledávání
 * - Sloupcové textové filtry
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
  faChevronUp, faChevronDown, faTimes, faCheckCircle, faTimesCircle, faEraser, faBolt, faSyncAlt
} from '@fortawesome/free-solid-svg-icons';
import { Building, Users } from 'lucide-react';
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
  getOrganizaceList,
  createOrganizace,
  updateOrganizace,
  deleteOrganizace,
} from '../../../services/apiv2Dictionaries';
import UniversalDictionaryDialog from '../UniversalDictionaryDialog';
import DictionaryConfirmDialog from '../DictionaryConfirmDialog';

// =============================================================================
// STYLED COMPONENTS (same as PoziceTab/UsekyTab)
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

const IconFilterButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 4px;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    transform: scale(1.1);
  }

  svg {
    width: 20px !important;
    height: 20px !important;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    opacity: 0.5;
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

const InfoText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
`;

// =============================================================================
// COMPONENT
// =============================================================================

const OrganizaceTab = () => {
  const { token, user, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { cache, loadDictionary, invalidateCache } = useContext(DictionaryCacheContext);

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
    return getUserStorage('organizace_globalFilter', '');
  });

  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('organizace_columnFilters', {});
  });

  const [aktivniFilter, setAktivniFilter] = useState(() => {
    return getUserStorage('organizace_aktivniFilter', 'all'); // 'all' | 'aktivni' | 'neaktivni'
  });

  const [sorting, setSorting] = useState(() => {
    return getUserStorage('organizace_sorting', []);
  });

  const [pageSize, setPageSize] = useState(() => {
    return getUserStorage('organizace_pageSize', 25);
  });

  const [pageIndex, setPageIndex] = useState(() => {
    return getUserStorage('organizace_pageIndex', 0);
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
    setUserStorage('organizace_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('organizace_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('organizace_aktivniFilter', aktivniFilter);
  }, [aktivniFilter, user_id]);

  useEffect(() => {
    setUserStorage('organizace_sorting', sorting);
  }, [sorting, user_id]);

  useEffect(() => {
    setUserStorage('organizace_pageSize', pageSize);
  }, [pageSize, user_id]);

  useEffect(() => {
    setUserStorage('organizace_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  // ============= DATA FETCHING =============
  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await loadDictionary('organizace');
      setData(result || []);
    } catch (error) {
      showToast(error.message || 'Chyba při načítání organizací', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.username) {
      if (cache.organizace?.loaded && cache.organizace.data) {
        setData(cache.organizace.data);
        setLoading(false);
      } else {
        fetchData();
      }
    } else {
    }
  }, [token, user?.username, cache.organizace?.loaded]);

  // ============= FILTERED DATA =============
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // ⭐ POZNÁMKA: aktivniFilter je nyní aplikován na BE straně při fetchData()
      // Zde filtrujeme pouze podle search a column filters

      // Global filter
      if (globalFilter) {
        const searchLower = globalFilter.toLowerCase();
        const matchGlobal =
          (item.nazev_organizace || '').toLowerCase().includes(searchLower) ||
          (item.ico || '').toLowerCase().includes(searchLower) ||
          (item.mesto || '').toLowerCase().includes(searchLower) ||
          (item.email || '').toLowerCase().includes(searchLower) ||
          (item.id || '').toString().toLowerCase().includes(searchLower);

        if (!matchGlobal) return false;
      }

      // Column filters - textové
      if (columnFilters.nazev_organizace &&
          !(item.nazev_organizace || '').toLowerCase().includes(columnFilters.nazev_organizace.toLowerCase())) {
        return false;
      }

      if (columnFilters.ico &&
          !(item.ico || '').toLowerCase().includes(columnFilters.ico.toLowerCase())) {
        return false;
      }

      if (columnFilters.mesto &&
          !(item.mesto || '').toLowerCase().includes(columnFilters.mesto.toLowerCase())) {
        return false;
      }

      if (columnFilters.adresa &&
          !(item.adresa || '').toLowerCase().includes(columnFilters.adresa.toLowerCase())) {
        return false;
      }

      if (columnFilters.kontakt &&
          !(item.kontakt || '').toLowerCase().includes(columnFilters.kontakt.toLowerCase())) {
        return false;
      }

      if (columnFilters.zastoupeny &&
          !(item.zastoupeny || '').toLowerCase().includes(columnFilters.zastoupeny.toLowerCase())) {
        return false;
      }

      if (columnFilters.pocet_uzivatelu &&
          !item.pocet_uzivatelu.toString().includes(columnFilters.pocet_uzivatelu)) {
        return false;
      }

      return true;
    });
  }, [data, globalFilter, columnFilters]); // ⭐ aktivniFilter odstraněn z dependencies

  // ============= COLUMNS DEFINITION =============
  const columns = useMemo(() => [
    {
      accessorKey: 'nazev_organizace',
      header: 'Název organizace',
      cell: ({ row }) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <Building size={16} style={{ color: '#3b82f6', marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600 }}>
                {row.original.nazev_organizace}
                <sup style={{
                  fontSize: '0.65em',
                  opacity: 0.6,
                  marginLeft: '0.25rem',
                  color: '#6b7280',
                  fontWeight: 400
                }}>
                  #{row.original.id}
                </sup>
              </div>
              {row.original.ico && (
                <InfoText>IČO: {row.original.ico}</InfoText>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'adresa',
      header: 'Adresa',
      cell: ({ row }) => (
        <div>
          {row.original.ulice_cislo && (
            <div>{row.original.ulice_cislo}</div>
          )}
          {(row.original.mesto || row.original.psc) && (
            <InfoText>
              {row.original.psc && `${row.original.psc} `}
              {row.original.mesto}
            </InfoText>
          )}
          {!row.original.ulice_cislo && !row.original.mesto && !row.original.psc && (
            <span style={{ color: '#9ca3af' }}>Bez adresy</span>
          )}
        </div>
      )
    },
    {
      accessorKey: 'kontakt',
      header: 'Kontakt',
      cell: ({ row }) => (
        <div>
          {row.original.email && (
            <div style={{ fontSize: '0.875rem' }}>{row.original.email}</div>
          )}
          {row.original.telefon && (
            <InfoText>{row.original.telefon}</InfoText>
          )}
          {!row.original.email && !row.original.telefon && (
            <span style={{ color: '#9ca3af' }}>Bez kontaktu</span>
          )}
        </div>
      )
    },
    {
      accessorKey: 'zastoupeny',
      header: 'Zastoupen',
      cell: ({ row }) => (
        <span style={{ color: row.original.zastoupeny ? '#374151' : '#9ca3af', fontSize: '0.875rem' }}>
          {row.original.zastoupeny || 'Neuvedeno'}
        </span>
      )
    },
    {
      accessorKey: 'pocet_uzivatelu',
      header: 'Počet uživatelů',
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {row.original.pocet_uzivatelu !== undefined ? (
            <UserCountBadge
              title={`${row.original.pocet_uzivatelu} ${row.original.pocet_uzivatelu === 1 ? 'uživatel patří' : 'uživatelů patří'} do této organizace`}
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
        // Backend může vracet string "1"/"0" nebo number 1/0 nebo boolean
        const aktivniValue = row.original.aktivni;
        const isAktivni = aktivniValue === 1 || aktivniValue === "1" || aktivniValue === true;
        return (
          <div style={{
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '18px'
          }}
          title={isAktivni ? 'Aktivní' : 'Neaktivní'}
          >
            <FontAwesomeIcon
              icon={isAktivni ? faCheckCircle : faTimesCircle}
              style={{ color: isAktivni ? '#16a34a' : '#dc2626' }}
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
            title="Upravit organizaci"
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            className="delete"
            onClick={() => handleDeleteClick(row.original)}
            title="Smazat organizaci"
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
        await createOrganizace({
          token,
          username: user.username,
          ...formData
        });
        showToast('Organizace byla vytvořena', 'success');
        invalidateCache('organizace');
        fetchData();
        setIsDialogOpen(false);
      } else {
        await updateOrganizace({
          token,
          username: user.username,
          id: editingItem.id,
          ...formData
        });
        showToast('Organizace byla aktualizována', 'success');
        invalidateCache('organizace');
        fetchData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      showToast(error.message || 'Chyba při ukládání organizace', 'error');
    }
  };
  const handleConfirmDelete = async () => {
    try {
      await deleteOrganizace({
        token,
        username: user.username,
        id: deletingItem.id
      });
      showToast('Organizace byla smazána', 'success');
      invalidateCache('organizace');
      fetchData();
      setIsConfirmOpen(false);
      setDeletingItem(null);
    } catch (error) {
      showToast(error.message || 'Chyba při mazání organizace', 'error');
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

  const handleClearFilters = () => {
    setColumnFilters({});
  };

  // ============= DIALOG FIELDS =============
  const dialogFields = [
    {
      name: 'nazev_organizace',
      label: 'Název organizace',
      type: 'text',
      required: true,
      placeholder: 'Zadejte název organizace'
    },
    {
      name: 'ico',
      label: 'IČO',
      type: 'text',
      required: false,
      placeholder: 'Např. 12345678'
    },
    {
      name: 'ulice_cislo',
      label: 'Ulice a číslo',
      type: 'text',
      required: false,
      placeholder: 'Např. Hlavní 123'
    },
    {
      name: 'mesto',
      label: 'Město',
      type: 'text',
      required: false,
      placeholder: 'Např. Praha'
    },
    {
      name: 'psc',
      label: 'PSČ',
      type: 'text',
      required: false,
      placeholder: 'Např. 11000'
    },
    {
      name: 'zastoupeny',
      label: 'Zastoupen',
      type: 'text',
      required: false,
      placeholder: 'Např. Jan Novák, jednatel'
    },
    {
      name: 'datova_schranka',
      label: 'Datová schránka',
      type: 'text',
      required: false,
      placeholder: 'ID datové schránky'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: false,
      placeholder: 'info@organizace.cz'
    },
    {
      name: 'telefon',
      label: 'Telefon',
      type: 'tel',
      required: false,
      placeholder: '+420 123 456 789'
    }
  ];

  // ============= RENDER =============
  if (loading) {
    return (
      <Container>
        <LoadingOverlay>
          <FontAwesomeIcon icon={faSyncAlt} spin size="2x" />
          <div style={{ marginTop: '1rem' }}>Načítám organizace...</div>
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
            placeholder="Vyhledat v organizacích..."
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
          Nová organizace
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
                      {header.id === 'nazev_organizace' && (
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

                      {header.id === 'ico' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="IČO..."
                            value={columnFilters.ico || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { ico: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, ico: value };
                              });
                            }}
                          />
                          {columnFilters.ico && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { ico: removed, ...rest } = prev;
                                  return rest;
                                });
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'mesto' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Město..."
                            value={columnFilters.mesto || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { mesto: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, mesto: value };
                              });
                            }}
                          />
                          {columnFilters.mesto && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { mesto: removed, ...rest } = prev;
                                  return rest;
                                });
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'adresa' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Adresa..."
                            value={columnFilters.adresa || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { adresa: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, adresa: value };
                              });
                            }}
                          />
                          {columnFilters.adresa && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { adresa: removed, ...rest } = prev;
                                  return rest;
                                });
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'kontakt' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Kontakt..."
                            value={columnFilters.kontakt || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { kontakt: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, kontakt: value };
                              });
                            }}
                          />
                          {columnFilters.kontakt && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { kontakt: removed, ...rest } = prev;
                                  return rest;
                                });
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}

                      {header.id === 'zastoupeny' && (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder="Zastoupen..."
                            value={columnFilters.zastoupeny || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { zastoupeny: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, zastoupeny: value };
                              });
                            }}
                          />
                          {columnFilters.zastoupeny && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { zastoupeny: removed, ...rest } = prev;
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
                            value={columnFilters.pocet_uzivatelu || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setColumnFilters(prev => {
                                if (!value) {
                                  const { pocet_uzivatelu: removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, pocet_uzivatelu: value };
                              });
                            }}
                          />
                          {columnFilters.pocet_uzivatelu && (
                            <ColumnClearButton
                              onClick={() => {
                                setColumnFilters(prev => {
                                  const { pocet_uzivatelu: removed, ...rest } = prev;
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
                            onClick={() => {
                              if (aktivniFilter === 'all') {
                                setAktivniFilter('aktivni');
                              } else if (aktivniFilter === 'aktivni') {
                                setAktivniFilter('neaktivni');
                              } else {
                                setAktivniFilter('all');
                              }
                            }}
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
                          <IconFilterButton
                            onClick={() => {
                              setColumnFilters({});
                              setAktivniFilter('all');
                            }}
                            title="Vymazat všechny filtry"
                            disabled={Object.keys(columnFilters).length === 0 && aktivniFilter === 'all'}
                          >
                            <FontAwesomeIcon icon={faEraser} style={{ fontSize: '14px' }} />
                          </IconFilterButton>
                        </div>
                      )}
                    </TableHeaderFilterCell>
                  ))}
                </TableHeaderFilterRow>

                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <TableCell colSpan={columns.length}>
                      <EmptyState>
                        <Building size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                        <h3>Žádné organizace</h3>
                        <p>{globalFilter || Object.keys(columnFilters).length > 0 || aktivniFilter !== 'all' ? 'Zkuste změnit vyhledávání nebo filtry' : 'Nejsou k dispozici žádné organizace'}</p>
                      </EmptyState>
                    </TableCell>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow key={row.id} $isEven={index % 2 === 0}>
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
              <PageInfo>
                Zobrazeno {Math.min(pageIndex * pageSize + 1, filteredData.length)} - {Math.min((pageIndex + 1) * pageSize, filteredData.length)} z {filteredData.length} organizací
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
        title={dialogMode === 'create' ? 'Nová organizace' : 'Upravit organizaci'}
        fields={dialogFields}
        initialData={editingItem}
      />

      <DictionaryConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Smazat organizaci"
        message={`Opravdu chcete smazat organizaci "${deletingItem?.nazev_organizace}"?`}
      />
    </Container>
  );
};

export default OrganizaceTab;
