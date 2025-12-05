import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faExpand, faTimes } from '@fortawesome/free-solid-svg-icons';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';

// =============================================================================
// STYLED COMPONENTS - Orders25List style
// =============================================================================

const TableWrapper = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  margin-top: 1rem;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  overflow-y: visible;
  width: 100%;
  position: relative;
  
  /* Horizontal scrollbar styling */
  &::-webkit-scrollbar {
    height: 12px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    border-radius: 6px;
    border: 2px solid #f1f5f9;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #3b82f6 #f1f5f9;
`;

const StyledTable = styled.table`
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const TableHeader = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const HeaderRow = styled.tr``;

const HeaderCell = styled.th`
  padding: 1rem;
  text-align: ${props => props.$align || 'left'};
  color: white;
  font-weight: 600;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  white-space: nowrap;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.$sortable ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  }
  
  &:first-of-type {
    border-top-left-radius: 12px;
  }
  
  &:last-of-type {
    border-top-right-radius: 12px;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SortIcon = styled.span`
  opacity: 0.7;
  font-size: 0.75rem;
`;

const SearchRow = styled.tr`
  background: #f8fafc;
`;

const SearchCell = styled.th`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #e2e8f0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s;
  
  /* Zebra striping */
  &:nth-of-type(even) {
    background-color: #fafbfc;
  }
  
  &:hover {
    background-color: #f0f9ff;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 0.875rem 1rem;
  color: #1f2937;
  vertical-align: middle;
  white-space: nowrap;
  text-align: ${props => props.$align || 'left'};
  
  /* První sloupec (číslo objednávky) - tučně */
  &:first-of-type {
    font-weight: 600;
    color: #1e40af;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  margin: 2rem;
  border: 2px dashed #cbd5e1;
  
  p {
    font-size: 1.125rem;
    font-weight: 500;
    margin: 0;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const PaginationControls = styled.div`
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
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
`;

// =============================================================================
// FULLSCREEN STYLED COMPONENTS
// =============================================================================

const TableHeaderWithFullscreen = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
`;

const TableTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const FullscreenButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem;
  background: white;
`;

const FullscreenButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 1.1rem;

  &:hover {
    color: #2563eb;
    background: #f3f4f6;
  }
`;

const FullscreenModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const FullscreenContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 98vw;
  height: 95vh;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const FullscreenHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
`;

const FullscreenTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CloseButton = styled.button`
  background: #ef4444;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 50%;
  transition: all 0.2s;
  font-size: 1.2rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #dc2626;
    transform: scale(1.05);
  }
`;

const FullscreenTableWrapper = styled.div`
  flex: 1;
  overflow: auto;
  background: white;
  
  /* Custom scrollbar for fullscreen */
  &::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    border-radius: 6px;
    border: 2px solid #f1f5f9;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
  }
`;

/**
 * ReportDataTable - Univerzální tabulka pro zobrazení dat reportů
 * Podporuje řazení, filtrování, stránkování a export
 * Stylováno podle Orders25List s gradientní hlavičkou
 */
const ReportDataTable = ({ 
  data = [], 
  columns = [],
  title = '',
  onExport = null,
  initialPageSize = 10,  // Výchozí stránkování na 10 záznamů
  fullscreenRef = null  // Ref pro fullscreen funkci
}) => {
  
  const [sorting, setSorting] = React.useState([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: initialPageSize
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen handlers
  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // Expose openFullscreen via ref
  useEffect(() => {
    if (fullscreenRef) {
      fullscreenRef.current = openFullscreen;
    }
  }, [fullscreenRef, openFullscreen]);

  // ESC key listener for closing fullscreen
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        closeFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen, closeFullscreen]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  // Formátování čísel
  const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Formátování data
  const formatDate = (value) => {
    if (!value) return '-';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('cs-CZ');
    } catch {
      return value;
    }
  };

  const renderTable = () => (
    <TableContainer>
      <StyledTable>
        {/* Hlavička s gradientem */}
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <HeaderRow key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const canSort = header.column.getCanSort();
                const sortDirection = header.column.getIsSorted();
                
                return (
                  <HeaderCell
                    key={header.id}
                    $sortable={canSort}
                    $align={header.column.columnDef.meta?.align}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <HeaderContent>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {canSort && (
                        <SortIcon>
                          <FontAwesomeIcon 
                            icon={
                              sortDirection === 'asc' ? faSortUp :
                              sortDirection === 'desc' ? faSortDown :
                              faSort
                            } 
                          />
                        </SortIcon>
                      )}
                    </HeaderContent>
                  </HeaderCell>
                );
              })}
            </HeaderRow>
          ))}
          
          {/* Hledací řádek */}
          <SearchRow>
            {table.getHeaderGroups()[0].headers.map(header => (
              <SearchCell key={`search-${header.id}`}>
                {header.column.getCanFilter() && (
                  <SearchInput
                    type="text"
                    value={String(header.column.getFilterValue() ?? '')}
                    onChange={(e) => header.column.setFilterValue(e.target.value)}
                    placeholder="Hledat..."
                  />
                )}
              </SearchCell>
            ))}
          </SearchRow>
        </TableHeader>
        
        {/* Tělo tabulky */}
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <TableCell colSpan={columns.length}>
                <EmptyState>
                  Žádná data k zobrazení
                </EmptyState>
              </TableCell>
            </tr>
          ) : (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} $align={cell.column.columnDef.meta?.align}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );

  return (
    <>
      <TableWrapper>
        {renderTable()}
        
        {/* Pagination */}
        <PaginationContainer>
          <PaginationInfo>
            Zobrazeno {table.getRowModel().rows.length} z {table.getFilteredRowModel().rows.length} záznamů
            {table.getFilteredRowModel().rows.length !== data.length && (
              <span> (filtrováno z {data.length})</span>
            )}
          </PaginationInfo>

          <PaginationControls>
            <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
              Zobrazit:
            </span>
            <PageSizeSelect
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </PageSizeSelect>

            <PageButton
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              ««
            </PageButton>
            <PageButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ‹
            </PageButton>

            <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
              Stránka {table.getState().pagination.pageIndex + 1} z {table.getPageCount()}
            </span>

            <PageButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              ›
            </PageButton>
            <PageButton
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              »»
            </PageButton>
          </PaginationControls>
        </PaginationContainer>
      </TableWrapper>

      {/* Fullscreen portal */}
      {isFullscreen && createPortal(
        <FullscreenModal onClick={closeFullscreen}>
          <FullscreenContent onClick={(e) => e.stopPropagation()}>
            <FullscreenHeader>
              <FullscreenTitle>
                {title || 'Report'}
              </FullscreenTitle>
              <CloseButton onClick={closeFullscreen}>
                <FontAwesomeIcon icon={faTimes} />
              </CloseButton>
            </FullscreenHeader>
            <FullscreenTableWrapper>
              {renderTable()}
            </FullscreenTableWrapper>
          </FullscreenContent>
        </FullscreenModal>,
        document.body
      )}
    </>
  );
};

export default ReportDataTable;
