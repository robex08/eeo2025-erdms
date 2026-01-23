/**
 * OrdersPaginationV3.js
 * 
 * Pagination komponenta pro Orders V3
 * Server-side pagination s pokročilými controls
 */

import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-top: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  
  strong {
    color: #1e293b;
    font-weight: 600;
  }
`;

const PaginationButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PaginationButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${props => props.disabled ? '#f1f5f9' : 'white'};
  color: ${props => props.disabled ? '#94a3b8' : '#3b82f6'};
  border: 2px solid ${props => props.disabled ? '#e2e8f0' : '#3b82f6'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #3b82f6;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  svg {
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }
`;

const PageInfo = styled.div`
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  min-width: 120px;
  text-align: center;
`;

const ItemsPerPageSelect = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  select {
    padding: 0.5rem 1rem;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
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
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const PageJumpInput = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
    white-space: nowrap;
  }

  input {
    width: 70px;
    padding: 0.5rem;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    text-align: center;
    transition: all 0.2s ease;

    &:hover {
      border-color: #3b82f6;
    }

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Pagination komponenta s pokročilými controls
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
  const [jumpToPage, setJumpToPage] = React.useState('');

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

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const page = parseInt(jumpToPage, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange?.(page);
      setJumpToPage('');
    }
  };

  if (totalItems === 0) {
    return (
      <PaginationContainer>
        <PaginationInfo>
          Žádné záznamy k zobrazení
        </PaginationInfo>
      </PaginationContainer>
    );
  }

  return (
    <PaginationContainer>
      {/* Info o zobrazených záznamech */}
      <PaginationInfo>
        Zobrazeno <strong>{startItem}-{endItem}</strong> z <strong>{totalItems.toLocaleString('cs-CZ')}</strong> objednávek
      </PaginationInfo>

      {/* Pagination buttons */}
      <PaginationButtons>
        <PaginationButton
          onClick={handleFirstPage}
          disabled={currentPage === 1 || loading}
          title="První stránka"
        >
          <FontAwesomeIcon icon={faAngleDoubleLeft} />
        </PaginationButton>

        <PaginationButton
          onClick={handlePrevPage}
          disabled={currentPage === 1 || loading}
          title="Předchozí stránka"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
          Předchozí
        </PaginationButton>

        <PageInfo>
          {currentPage} / {totalPages}
        </PageInfo>

        <PaginationButton
          onClick={handleNextPage}
          disabled={currentPage === totalPages || loading}
          title="Další stránka"
        >
          Další
          <FontAwesomeIcon icon={faChevronRight} />
        </PaginationButton>

        <PaginationButton
          onClick={handleLastPage}
          disabled={currentPage === totalPages || loading}
          title="Poslední stránka"
        >
          <FontAwesomeIcon icon={faAngleDoubleRight} />
        </PaginationButton>
      </PaginationButtons>

      {/* Položek na stránku */}
      <ItemsPerPageSelect>
        <label htmlFor="items-per-page">Záznamů na stránku:</label>
        <select
          id="items-per-page"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          disabled={loading}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </ItemsPerPageSelect>

      {/* Jump to page */}
      {totalPages > 5 && (
        <PageJumpInput as="form" onSubmit={handleJumpToPage}>
          <label htmlFor="jump-to-page">Přejít na:</label>
          <input
            id="jump-to-page"
            type="number"
            min="1"
            max={totalPages}
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            placeholder={currentPage.toString()}
            disabled={loading}
          />
        </PageJumpInput>
      )}
    </PaginationContainer>
  );
}

export default OrdersPaginationV3;
