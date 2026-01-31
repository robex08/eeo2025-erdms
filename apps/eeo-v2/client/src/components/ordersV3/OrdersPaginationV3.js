/**
 * OrdersPaginationV3.js
 * 
 * Pagination komponenta pro Orders V3
 * Jednoduchý a decentní styl podle původního Orders25List
 */

import React from 'react';
import styled from '@emotion/styled';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

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
  color: #374151;

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

  svg {
    font-size: 0.875rem;
  }
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
  color: #374151;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Pagination komponenta s jednoduchým a decentním stylem
 * 
 * @param {Object} props
 * @param {number} props.currentPage - Aktuální stránka
 * @param {number} props.totalPages - Celkový počet stránek
 * @param {number} props.totalItems - Celkový počet položek
 * @param {number} props.itemsPerPage - Položek na stránku
 * @param {Function} props.onPageChange - Callback pro změnu stránky
 * @param {Function} props.onItemsPerPageChange - Callback pro změnu položek na stránku
 * @param {boolean} props.loading - Loading state
 */
function OrdersPaginationV3({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleFirstPage = () => onPageChange?.(1);
  const handlePrevPage = () => onPageChange?.(Math.max(1, currentPage - 1));
  const handleNextPage = () => onPageChange?.(Math.min(totalPages, currentPage + 1));
  const handleLastPage = () => onPageChange?.(totalPages);

  const handleItemsPerPageChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    onItemsPerPageChange?.(newValue);
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <PaginationContainer>
      {/* Info o zobrazených záznamech */}
      <PaginationInfo>
        Zobrazeno {startItem}-{endItem} z {totalItems.toLocaleString('cs-CZ')} objednávek
      </PaginationInfo>

      {/* Pagination controls */}
      <PaginationControls>
        <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
          Zobrazit:
        </span>
        <PageSizeSelect
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          disabled={loading}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </PageSizeSelect>

        <PageButton
          onClick={handleFirstPage}
          disabled={currentPage === 1 || loading}
          title="První stránka"
        >
          ««
        </PageButton>

        <PageButton
          onClick={handlePrevPage}
          disabled={currentPage === 1 || loading}
          title="Předchozí stránka"
        >
          ‹
        </PageButton>

        <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
          Stránka {currentPage} z {totalPages}
        </span>

        <PageButton
          onClick={handleNextPage}
          disabled={currentPage === totalPages || loading}
          title="Další stránka"
        >
          ›
        </PageButton>

        <PageButton
          onClick={handleLastPage}
          disabled={currentPage === totalPages || loading}
          title="Poslední stránka"
        >
          ››
        </PageButton>
      </PaginationControls>
    </PaginationContainer>
  );
}

export default OrdersPaginationV3;
