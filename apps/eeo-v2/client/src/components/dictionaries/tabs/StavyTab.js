/**
 * Stavy Tab - Správa stavů objednávek s TanStack Table
 * DB 25_stavy: id, typ_objektu, kod_stavu, nadrazeny_kod_stavu, nazev_stavu, popis, platnost_do, aktivni
 * @date 2025-10-23
 */

import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faEdit, faTrash, faChevronUp, faChevronDown, faCheckCircle, faTimesCircle, faTimes, faEraser, faBolt, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { Circle } from 'lucide-react';
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
  getStavyList,
  createStav,
  updateStav,
  deleteStav,
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
  color: #6b7280;
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
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

const TypeBadge = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${props => props.$type === 'OBJEDNAVKA' ? '#dbeafe' : props.$type === 'FAKTURA' ? '#fef3c7' : '#e5e7eb'};
  color: ${props => props.$type === 'OBJEDNAVKA' ? '#1e40af' : props.$type === 'FAKTURA' ? '#92400e' : '#374151'};
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: normal;
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

const StavyTab = () => {
  const { token, user, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { cache, loadDictionary, refreshDictionary, invalidateCache } = useContext(DictionaryCacheContext);

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
  const [globalFilter, setGlobalFilter] = useState(() => getUserStorage('stavy_globalFilter', ''));
  const [aktivniFilter, setAktivniFilter] = useState(() => getUserStorage('stavy_aktivniFilter', 'all'));
  const [columnFilters, setColumnFilters] = useState(() => getUserStorage('stavy_columnFilters', {}));
  const [sorting, setSorting] = useState(() => getUserStorage('stavy_sorting', []));
  const [pageSize, setPageSize] = useState(() => getUserStorage('stavy_pageSize', 25));
  const [pageIndex, setPageIndex] = useState(() => getUserStorage('stavy_pageIndex', 0));

  const [editDialog, setEditDialog] = useState({ open: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await loadDictionary('stavy');
      setData(result || []);
    } catch (error) {
      showToast(error.message || 'Chyba při načítání stavů', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.username) {
      if (cache.stavy?.loaded && cache.stavy.data) {
        setData(cache.stavy.data);
        setLoading(false);
      } else {
        fetchData();
      }
    }
  }, [token, user?.username, cache.stavy?.loaded]);

  useEffect(() => { setUserStorage('stavy_globalFilter', globalFilter); }, [globalFilter, user_id]);
  useEffect(() => { setUserStorage('stavy_aktivniFilter', aktivniFilter); }, [aktivniFilter, user_id]);
  useEffect(() => { setUserStorage('stavy_columnFilters', columnFilters); }, [columnFilters, user_id]);
  useEffect(() => { setUserStorage('stavy_sorting', sorting); }, [sorting, user_id]);
  useEffect(() => { setUserStorage('stavy_pageSize', pageSize); }, [pageSize, user_id]);
  useEffect(() => { setUserStorage('stavy_pageIndex', pageIndex); }, [pageIndex, user_id]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Normalizace aktivni pole (může být 1/0, "1"/"0" nebo true/false)
      const isAktivni = item.aktivni === 1 || item.aktivni === true || item.aktivni === "1";

      if (aktivniFilter === 'aktivni' && !isAktivni) return false;
      if (aktivniFilter === 'neaktivni' && isAktivni) return false;

      if (columnFilters.nazev_stavu &&
          !(item.nazev_stavu || '').toLowerCase().includes(columnFilters.nazev_stavu.toLowerCase())) {
        return false;
      }

      if (columnFilters.kod_stavu &&
          !(item.kod_stavu || '').toLowerCase().includes(columnFilters.kod_stavu.toLowerCase())) {
        return false;
      }

      if (columnFilters.typ_objektu &&
          !(item.typ_objektu || '').toLowerCase().includes(columnFilters.typ_objektu.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [data, aktivniFilter, columnFilters]);

  const columns = useMemo(() => [
    {
      accessorKey: 'nazev_stavu',
      header: 'Název stavu',
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', textAlign: 'left' }}>
          <Circle size={16} style={{ color: '#3b82f6', marginTop: '2px' }} />
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
      accessorKey: 'kod_stavu',
      header: 'Kód stavu',
      enableSorting: true,
      cell: ({ getValue }) => (
        <Badge>{getValue() || '—'}</Badge>
      ),
    },
    {
      accessorKey: 'typ_objektu',
      header: 'Typ objektu',
      enableSorting: true,
      cell: ({ getValue }) => {
        const typ = getValue();
        return <TypeBadge $type={typ}>{typ || 'N/A'}</TypeBadge>;
      },
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
            title="Upravit"
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            className="delete"
            onClick={() => setDeleteDialog({ open: true, item: row.original })}
            title="Smazat"
          >
            <FontAwesomeIcon icon={faTrash} />
          </IconButton>
        </ActionCell>
      ),
    },
  ], []);

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

  // Pagination handlers
  const goToFirstPage = () => setPageIndex(0);
  const goToPreviousPage = () => setPageIndex(prev => Math.max(0, prev - 1));
  const goToNextPage = () => setPageIndex(prev => Math.min(table.getPageCount() - 1, prev + 1));
  const goToLastPage = () => setPageIndex(table.getPageCount() - 1);

  const handleCreate = async (formData) => {
    try {
      await createStav({
        token,
        username: user?.username,
        ...formData,
      });
      showToast?.('Stav vytvořen', { type: 'success' });
      invalidateCache('stavy');
      fetchData();
      setEditDialog({ open: false, item: null });
    } catch (error) {
      showToast?.(error.message || 'Chyba při vytváření', { type: 'error' });
      throw error;
    }
  };

  const handleUpdate = async (formData) => {
    try {
      await updateStav({
        token,
        username: user?.username,
        id: editDialog.item.id,
        ...formData,
      });
      showToast?.('Stav aktualizován', { type: 'success' });
      invalidateCache('stavy');
      fetchData();
      setEditDialog({ open: false, item: null });
    } catch (error) {
      showToast?.(error.message || 'Chyba při aktualizaci', { type: 'error' });
      throw error;
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStav({
        token,
        username: user?.username,
        id: deleteDialog.item.id,
      });
      showToast?.('Stav smazán', { type: 'success' });
      invalidateCache('stavy');
      fetchData();
      setDeleteDialog({ open: false, item: null });
    } catch (error) {
      showToast?.(error.message || 'Chyba při mazání', { type: 'error' });
      throw error;
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
    setGlobalFilter('');
    setAktivniFilter('all');
    setColumnFilters({});
  };

  const dialogFields = [
    {
      name: 'nazev_stavu',
      label: 'Název stavu',
      type: 'text',
      required: true,
      placeholder: 'Název stavu',
    },
    {
      name: 'kod_stavu',
      label: 'Kód stavu',
      type: 'text',
      required: true,
      placeholder: 'NOVY, SCHVALENY, ...',
    },
    {
      name: 'typ_objektu',
      label: 'Typ objektu',
      type: 'select',
      required: true,
      options: [
        { value: 'OBJEDNAVKA', label: 'Objednávka' },
        { value: 'FAKTURA', label: 'Faktura' },
      ],
    },
    {
      name: 'nadrazeny_kod_stavu',
      label: 'Nadřazený kód',
      type: 'text',
      required: false,
      placeholder: 'Volitelně',
    },
    {
      name: 'popis',
      label: 'Popis',
      type: 'textarea',
      required: false,
      placeholder: 'Popis stavu',
    },
    {
      name: 'platnost_do',
      label: 'Platnost do',
      type: 'date',
      required: false,
    },
    {
      name: 'aktivni',
      label: 'Aktivní',
      type: 'checkbox',
      required: false,
    },
  ];

  return (
    <Container>
      <ActionBar>
        <SearchBox>
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Hledat ve stavech..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          {globalFilter && (
            <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
              <FontAwesomeIcon icon={faTimes} />
            </ClearButton>
          )}
        </SearchBox>

        <ActionButton $primary onClick={() => setEditDialog({ open: true, item: null })}>
          <FontAwesomeIcon icon={faPlus} />
          Přidat stav
        </ActionButton>
      </ActionBar>

      <TableContainer>
        <Table>
          <thead>
            <TableHeaderRow>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header, headerIndex) => (
                  <TableHeaderCell
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <HeaderContent $isFirstColumn={headerIndex === 0}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <FontAwesomeIcon
                          icon={header.column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
                          style={{ fontSize: '0.75rem' }}
                        />
                      )}
                    </HeaderContent>
                  </TableHeaderCell>
                ))
              )}
            </TableHeaderRow>

            <TableHeaderFilterRow>
              <TableHeaderCell>
                <ColumnFilterWrapper>
                  <FontAwesomeIcon icon={faSearch} />
                  <ColumnFilterInput
                    type="text"
                    placeholder="Hledat název..."
                    value={columnFilters.nazev_stavu || ''}
                    onChange={(e) => setColumnFilters({ ...columnFilters, nazev_stavu: e.target.value })}
                  />
                  {columnFilters.nazev_stavu && (
                    <ColumnClearButton
                      onClick={() => {
                        const { nazev_stavu, ...rest } = columnFilters;
                        setColumnFilters(rest);
                      }}
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
                    value={columnFilters.kod_stavu || ''}
                    onChange={(e) => setColumnFilters({ ...columnFilters, kod_stavu: e.target.value })}
                  />
                  {columnFilters.kod_stavu && (
                    <ColumnClearButton
                      onClick={() => {
                        const { kod_stavu, ...rest } = columnFilters;
                        setColumnFilters(rest);
                      }}
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
                    placeholder="Typ..."
                    value={columnFilters.typ_objektu || ''}
                    onChange={(e) => setColumnFilters({ ...columnFilters, typ_objektu: e.target.value })}
                  />
                  {columnFilters.typ_objektu && (
                    <ColumnClearButton
                      onClick={() => {
                        const { typ_objektu, ...rest } = columnFilters;
                        setColumnFilters(rest);
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </ColumnClearButton>
                  )}
                </ColumnFilterWrapper>
              </TableHeaderCell>
              <TableHeaderCell>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px' }}>
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
              <TableHeaderCell>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '32px'
                }}>
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
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <TableCell colSpan={columns.length}>Načítám...</TableCell>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <TableCell colSpan={columns.length}>
                  <EmptyState>
                    <Circle size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                    <h3>{data.length === 0 ? 'Žádné stavy' : 'Nenalezeny žádné stavy'}</h3>
                    <p>{data.length === 0 ? 'Nejsou k dispozici žádné stavy' : 'Zkuste změnit vyhledávání nebo filtry'}</p>
                  </EmptyState>
                </TableCell>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <TableRow key={row.id} $isEven={idx % 2 === 0}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
            Zobrazeno {Math.min(pageIndex * pageSize + 1, filteredData.length)} - {Math.min((pageIndex + 1) * pageSize, filteredData.length)} z {filteredData.length} záznamů
            {data.length !== filteredData.length && ` (celkem ${data.length})`}
          </PageInfo>
          <PaginationButtons>
            <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
              Zobrazit:
            </span>
            <PageSizeSelect value={pageSize} onChange={(e) => {
              const newSize = Number(e.target.value);
              setPageSize(newSize);
              setPageIndex(0);
            }}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
            </PageSizeSelect>
            <PageButton onClick={goToFirstPage} disabled={pageIndex === 0}>
              ««
            </PageButton>
            <PageButton onClick={goToPreviousPage} disabled={pageIndex === 0}>
              ‹
            </PageButton>
            <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
              Stránka {pageIndex + 1} z {Math.max(1, table.getPageCount())}
            </span>
            <PageButton onClick={goToNextPage} disabled={pageIndex >= table.getPageCount() - 1}>
              ›
            </PageButton>
            <PageButton onClick={goToLastPage} disabled={pageIndex >= table.getPageCount() - 1}>
              »»
            </PageButton>
          </PaginationButtons>
        </Pagination>
      </TableContainer>

      <UniversalDictionaryDialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, item: null })}
        onSave={editDialog.item ? handleUpdate : handleCreate}
        title={editDialog.item ? 'Upravit stav' : 'Nový stav'}
        fields={dialogFields}
        initialData={editDialog.item}
      />

      <DictionaryConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Smazat stav?"
        message={`Opravdu chcete smazat stav "${deleteDialog.item?.nazev_stavu}"?`}
      />
    </Container>
  );
};

export default StavyTab;
