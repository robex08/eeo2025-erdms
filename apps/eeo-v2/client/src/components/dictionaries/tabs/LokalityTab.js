/**
 * Lokality Tab - Správa lokalit s TanStack Table
 * DB 25_lokality: id, nazev, typ (enum), parent_id, aktivni (tinyint)
 * Hierarchický číselník okresů a stanovišť s ikonovým filtrem aktivní
 * @date 2025-10-23
 */

import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faEdit, faTrash, faChevronUp, faChevronDown, faCheckCircle, faTimesCircle, faTimes, faEraser, faBolt } from '@fortawesome/free-solid-svg-icons';
import { MapPin, Users } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';
import { DictionaryCacheContext } from '../../../context/DictionaryCacheContext';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  getLokalityList,
  createLokalita,
  updateLokalita,
  deleteLokalita,
} from '../../../services/apiv2Dictionaries';
import { createDictionaryPermissionHelper } from '../../../utils/dictionaryPermissions';
import UniversalDictionaryDialog from '../UniversalDictionaryDialog';
import DictionaryConfirmDialog from '../DictionaryConfirmDialog';

// =============================================================================
// STYLED COMPONENTS - podle vzoru Users.js
// =============================================================================

const Container = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid #e5e7eb;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  background: ${props => props.$primary ? '#3b82f6' : 'white'};
  color: ${props => props.$primary ? 'white' : '#3b82f6'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary ? '#2563eb' : '#eff6ff'};
    border-color: ${props => props.$primary ? '#2563eb' : '#2563eb'};
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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isFirstColumn ? 'flex-start' : 'center'};
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

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
`;

const PageInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
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

const ColumnFilter = styled(ColumnFilterInput)``;

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

const TypeBadge = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${props => props.$type === 'vnitrni' ? '#dbeafe' : props.$type === 'vnejsi' ? '#fef3c7' : '#e5e7eb'};
  color: ${props => props.$type === 'vnitrni' ? '#1e40af' : props.$type === 'vnejsi' ? '#92400e' : '#374151'};
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: normal;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
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

const LokalityTab = () => {
  const { token, user, userDetail, hasPermission, hasAdminRole } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { cache, loadDictionary, invalidateCache } = useContext(DictionaryCacheContext);

  // Oprávnění pro lokality
  const permissions = createDictionaryPermissionHelper('LOCATIONS', hasPermission, hasAdminRole);

  // Helper functions for user-specific localStorage
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
      // Ignorovat chyby zápisu
    }
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState(() => {
    return getUserStorage('lokality_globalFilter', '');
  });
  const [aktivniFilter, setAktivniFilter] = useState(() => {
    return getUserStorage('lokality_aktivniFilter', 'all');
  });
  const [columnFilters, setColumnFilters] = useState(() => {
    return getUserStorage('lokality_columnFilters', {});
  });
  const [sorting, setSorting] = useState(() => {
    return getUserStorage('lokality_sorting', []);
  });
  const [pageSize, setPageSize] = useState(() => {
    return getUserStorage('lokality_pageSize', 25);
  });
  const [pageIndex, setPageIndex] = useState(() => {
    return getUserStorage('lokality_pageIndex', 0);
  });

  const [editDialog, setEditDialog] = useState({ open: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await loadDictionary('lokality');
      setData(result || []);
    } catch (error) {
      showToast(error.message || 'Chyba při načítání lokalit', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.username) {
      if (cache.lokality?.loaded && cache.lokality.data) {
        setData(cache.lokality.data);
        setLoading(false);
      } else {
        fetchData();
      }
    }
  }, [token, user?.username, cache.lokality?.loaded]);

  // Save filters to localStorage when they change
  useEffect(() => {
    setUserStorage('lokality_globalFilter', globalFilter);
  }, [globalFilter, user_id]);

  useEffect(() => {
    setUserStorage('lokality_aktivniFilter', aktivniFilter);
  }, [aktivniFilter, user_id]);

  useEffect(() => {
    setUserStorage('lokality_columnFilters', columnFilters);
  }, [columnFilters, user_id]);

  useEffect(() => {
    setUserStorage('lokality_sorting', sorting);
  }, [sorting, user_id]);

  useEffect(() => {
    setUserStorage('lokality_pageSize', pageSize);
  }, [pageSize, user_id]);

  useEffect(() => {
    setUserStorage('lokality_pageIndex', pageIndex);
  }, [pageIndex, user_id]);

  // ============= FILTERED DATA =============
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Icon filtr - aktivní/neaktivní
      // Normalizace aktivni pole (může být 1/0, "1"/"0" nebo true/false)
      const isAktivni = item.aktivni === 1 || item.aktivni === true || item.aktivni === "1";

      if (aktivniFilter === 'aktivni' && !isAktivni) return false;
      if (aktivniFilter === 'neaktivni' && isAktivni) return false;

      // Column filters - textové
      if (columnFilters.nazev &&
          !(item.nazev || '').toLowerCase().includes(columnFilters.nazev.toLowerCase())) {
        return false;
      }

      if (columnFilters.typ &&
          !(item.typ || '').toLowerCase().includes(columnFilters.typ.toLowerCase())) {
        return false;
      }

      if (columnFilters.parent_id && item.parent_id) {
        const parent = data.find(p => p.id === item.parent_id);
        const parentName = parent ? parent.nazev : '';
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
  }, [data, aktivniFilter, columnFilters]);

  const columns = useMemo(() => [
    {
      accessorKey: 'nazev',
      header: 'Název lokality',
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left' }}>
          <MapPin size={16} style={{ color: '#3b82f6', marginTop: '2px' }} />
          <strong>
            {getValue()}
            {row.original.id && (
              <sup style={{
                fontSize: '0.6rem',
                color: '#9ca3af',
                fontWeight: 'normal',
                marginLeft: '4px'
              }}>
                #{row.original.id}
              </sup>
            )}
          </strong>
        </div>
      ),
    },
    {
      accessorKey: 'parent_id',
      header: 'Nadřazená lokalita',
      enableSorting: true,
      cell: ({ getValue }) => {
        const parentId = getValue();
        if (!parentId) return <div style={{ textAlign: 'left' }}><span style={{ color: '#9ca3af' }}>—</span></div>;
        const parent = data.find(item => item.id === parentId);
        return <div style={{ textAlign: 'left' }}>{parent ? parent.nazev : `ID: ${parentId}`}</div>;
      },
    },
    {
      accessorKey: 'typ',
      header: 'Typ lokality',
      enableSorting: true,
      cell: ({ getValue }) => {
        const typ = getValue();
        return <Badge>{typ || 'Neznámý'}</Badge>;
      },
    },
    {
      accessorKey: 'pocet_uzivatelu',
      header: 'Počet uživatelů',
      enableSorting: true,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {row.original.pocet_uzivatelu !== undefined ? (
            <UserCountBadge
              title={`${row.original.pocet_uzivatelu} ${row.original.pocet_uzivatelu === 1 ? 'uživatel má' : 'uživatelů má'} tuto lokalitu`}
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
      enableSorting: true,
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
      size: 120,
      cell: ({ row }) => (
        <ActionCell>
          <IconButton
            className="edit"
            onClick={() => setEditDialog({ open: true, item: row.original })}
            title={permissions.canEdit() ? "Upravit" : "Nemáte oprávnění editovat"}
            disabled={!permissions.canEdit()}
            style={{ opacity: permissions.canEdit() ? 1 : 0.4, cursor: permissions.canEdit() ? 'pointer' : 'not-allowed' }}
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            className="delete"
            onClick={() => setDeleteDialog({ open: true, item: row.original })}
            title={permissions.canDelete() ? "Smazat" : "Nemáte oprávnění mazat"}
            disabled={!permissions.canDelete()}
            style={{ opacity: permissions.canDelete() ? 1 : 0.4, cursor: permissions.canDelete() ? 'pointer' : 'not-allowed' }}
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </ActionCell>
      ),
    },
  ], [data]);

  const table = useReactTable({
    data: filteredData,
    columns,
    initialState: {
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    state: {
      globalFilter,
      sorting,
      pagination: { pageSize, pageIndex },
    },
    onGlobalFilterChange: setGlobalFilter,
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
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Pagination navigation helpers
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

  const handleCreate = async (formData) => {
    try {
      await createLokalita({
        token,
        username: user?.username,
        ...formData,
      });
      showToast?.('Lokalita vytvořena', { type: 'success' });
      invalidateCache('lokality');
      fetchData();
      setEditDialog({ open: false, item: null });
    } catch (error) {
      showToast?.(error.message || 'Chyba při vytváření', { type: 'error' });
      throw error;
    }
  };

  const handleUpdate = async (formData) => {
    try {
      await updateLokalita({
        token,
        username: user?.username,
        id: editDialog.item.id,
        ...formData,
      });
      showToast?.('Lokalita aktualizována', { type: 'success' });
      invalidateCache('lokality');
      fetchData();
      setEditDialog({ open: false, item: null });
    } catch (error) {
      showToast?.(error.message || 'Chyba při aktualizaci', { type: 'error' });
      throw error;
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLokalita({
        token,
        username: user?.username,
        id: deleteDialog.item.id,
      });
      showToast?.('Lokalita smazána', { type: 'success' });
      invalidateCache('lokality');
      fetchData();
      setDeleteDialog({ open: false, item: null });
    } catch (error) {
      showToast?.(error.message || 'Chyba při mazání', { type: 'error' });
      throw error;
    }
  };

  // ============= HANDLERS =============
  const handleAktivniFilterClick = () => {
    setAktivniFilter(prev => {
      if (prev === 'all') return 'aktivni';
      if (prev === 'aktivni') return 'neaktivni';
      return 'all';
    });
  };

  const handleClearFilters = () => {
    setGlobalFilter('');
    setAktivniFilter('all');
    setColumnFilters({});
  };

  const dialogFields = [
    {
      name: 'nazev',
      label: 'Název',
      type: 'text',
      required: true,
      placeholder: 'Název lokality',
    },
    {
      name: 'typ',
      label: 'Typ',
      type: 'select',
      required: true,
      options: [
        { value: 'vnitrni', label: 'Vnitřní' },
        { value: 'vnejsi', label: 'Vnější' },
      ],
    },
    {
      name: 'parent_id',
      label: 'Nadřazená lokalita',
      type: 'select',
      options: [
        { value: null, label: 'Žádná (kořen)' },
        ...data.map(item => ({ value: item.id, label: item.nazev })),
      ],
    },
  ];

  return (
    <Container>
      <ActionBar>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Hledat v lokalitách..."
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
          />
          {globalFilter && (
            <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>

        <ActionButton
          $primary
          onClick={() => setEditDialog({ open: true, item: null })}
          disabled={!permissions.canCreate()}
          title={!permissions.canCreate() ? 'Nemáte oprávnění vytvářet lokality' : 'Přidat novou lokalitu'}
        >
          <FontAwesomeIcon icon={faPlus} />
          Nová lokalita
        </ActionButton>
      </ActionBar>

      <TableContainer>
        <Table>
          <tbody>
            <TableHeaderRow>
              {table.getHeaderGroups()[0].headers.map((header, headerIndex) => (
                <TableHeaderCell
                  key={header.id}
                  style={{
                    width: header.id === 'typ' ? '140px' :
                           header.id === 'pocet_uzivatelu' ? '140px' :
                           header.id === 'aktivni' ? '90px' :
                           header.id === 'actions' ? '90px' : 'auto',
                    maxWidth: header.id === 'typ' ? '140px' :
                              header.id === 'pocet_uzivatelu' ? '140px' :
                              header.id === 'aktivni' ? '90px' :
                              header.id === 'actions' ? '90px' : 'none',
                    ...(headerIndex === 0 && { textAlign: 'left' })
                  }}
                >
                  <HeaderContent
                    $isFirstColumn={headerIndex === 0}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <span>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.column.getCanSort() && header.column.getIsSorted() && (
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
                    placeholder="Hledat název..."
                    value={columnFilters.nazev || ''}
                    onChange={(e) => setColumnFilters(prev => ({...prev, nazev: e.target.value}))}
                  />
                  {columnFilters.nazev && (
                    <ColumnClearButton
                      onClick={() => setColumnFilters(prev => {
                        const { nazev, ...rest } = prev;
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
                    placeholder="Nadřazená..."
                    value={columnFilters.parent_id || ''}
                    onChange={(e) => setColumnFilters(prev => ({...prev, parent_id: e.target.value}))}
                  />
                  {columnFilters.parent_id && (
                    <ColumnClearButton
                      onClick={() => setColumnFilters(prev => {
                        const { parent_id, ...rest } = prev;
                        return rest;
                      })}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </ColumnClearButton>
                  )}
                </ColumnFilterWrapper>
              </TableHeaderCell>
              <TableHeaderCell style={{ width: '140px', maxWidth: '140px' }}>
                <ColumnFilterWrapper>
                  <FontAwesomeIcon icon={faSearch} />
                  <ColumnFilterInput
                    type="text"
                    placeholder="Typ..."
                    value={columnFilters.typ || ''}
                    onChange={(e) => setColumnFilters(prev => ({...prev, typ: e.target.value}))}
                  />
                  {columnFilters.typ && (
                    <ColumnClearButton
                      onClick={() => setColumnFilters(prev => {
                        const { typ, ...rest } = prev;
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
              <TableHeaderCell style={{ width: '90px', maxWidth: '90px' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <FilterActionButton
                    onClick={handleClearFilters}
                    title="Vymazat všechny filtry"
                    disabled={Object.keys(columnFilters).length === 0 && aktivniFilter === 'all'}
                  >
                    <FontAwesomeIcon icon={faEraser} />
                  </FilterActionButton>
                </div>
              </TableHeaderCell>
            </TableHeaderFilterRow>

            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <TableCell colSpan={columns.length}>
                  <EmptyState>
                    <MapPin size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                    <h3>{data.length === 0 ? 'Žádné lokality' : 'Nenalezeny žádné lokality'}</h3>
                    <p>{data.length === 0 ? 'Nejsou k dispozici žádné lokality' : 'Zkuste změnit vyhledávání nebo filtry'}</p>
                  </EmptyState>
                </TableCell>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <TableRow key={row.id} $isEven={idx % 2 === 0}>
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width: cell.column.id === 'typ' ? '140px' :
                               cell.column.id === 'aktivni' ? '90px' :
                               cell.column.id === 'actions' ? '90px' : 'auto',
                        maxWidth: cell.column.id === 'typ' ? '140px' :
                                  cell.column.id === 'aktivni' ? '90px' :
                                  cell.column.id === 'actions' ? '90px' : 'none',
                        ...(cellIndex === 0 && { textAlign: 'left' })
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
          <PageInfo>
            Zobrazeno {Math.min(pageIndex * pageSize + 1, filteredData.length)} - {Math.min((pageIndex + 1) * pageSize, filteredData.length)} z {filteredData.length} lokalit
          </PageInfo>

          <PaginationButtons>
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
          </PaginationButtons>
        </Pagination>
      </TableContainer>

      {editDialog.open && (
        <UniversalDictionaryDialog
          title={editDialog.item ? 'Upravit lokalitu' : 'Nová lokalita'}
          fields={dialogFields}
          initialData={editDialog.item}
          onSave={editDialog.item ? handleUpdate : handleCreate}
          onClose={() => setEditDialog({ open: false, item: null })}
        />
      )}

      {deleteDialog.open && (
        <DictionaryConfirmDialog
          title="Smazat lokalitu"
          message={
            <>
              <p>Opravdu chcete smazat lokalitu <strong>{deleteDialog.item?.nazev}</strong>?</p>
              <p style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ POZOR: Záznam bude trvale odstraněn z databáze!</p>
            </>
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteDialog({ open: false, item: null })}
          confirmText="Smazat"
          cancelText="Zrušit"
        />
      )}
    </Container>
  );
};

export default LokalityTab;
