/**
 * 🔍 SEARCH HISTORY DROPDOWN
 * 
 * Zobrazuje historii posledních vyhledávání
 * Zobrazuje se když je input prázdný nebo má méně než 2 znaky
 */

import React from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';

const HistoryDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
`;

const HistoryHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
  border-radius: 8px 8px 0 0;
  
  h4 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const ClearAllButton = styled.button`
  background: none;
  border: none;
  color: #ef4444;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  
  &:hover {
    background: #fee2e2;
  }
  
  svg {
    font-size: 12px;
  }
`;

const HistoryItem = styled.div`
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f3f4f6;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f9fafb;
  }
`;

const HistoryItemContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HistoryIcon = styled.div`
  color: #9ca3af;
  font-size: 14px;
  width: 20px;
  text-align: center;
`;

const HistoryText = styled.div`
  flex: 1;
`;

const HistoryQuery = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 2px;
`;

const HistoryMeta = styled.div`
  font-size: 12px;
  color: #9ca3af;
  display: flex;
  gap: 8px;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  
  ${HistoryItem}:hover & {
    opacity: 1;
  }
  
  &:hover {
    background: #fee2e2;
    color: #ef4444;
  }
  
  svg {
    font-size: 14px;
  }
`;

const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
`;

/**
 * Formátuje timestamp na čitelný text
 */
const formatTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Před chvílí';
  if (minutes < 60) return `Před ${minutes} min`;
  if (hours < 24) return `Před ${hours} h`;
  if (days < 7) return `Před ${days} dny`;
  
  return new Date(timestamp).toLocaleDateString('cs-CZ');
};

/**
 * Přeloží kategorie na česky
 */
const getCategoryLabels = (categories) => {
  const labels = {
    users: 'Uživatelé',
    orders_2025: 'Objednávky',
    contracts: 'Smlouvy',
    invoices: 'Faktury',
    suppliers: 'Dodavatelé',
    suppliers_from_orders: 'Dodavatelé z obj.'
  };
  
  return categories
    .map(cat => labels[cat] || cat)
    .join(', ');
};

/**
 * SearchHistory Component
 */
export const SearchHistory = ({ 
  history, 
  onSelectQuery, 
  onRemoveItem, 
  onClearAll 
}) => {
  if (!history || history.length === 0) {
    return (
      <HistoryDropdown>
        <EmptyState>
          Zatím jste nic nehledali
        </EmptyState>
      </HistoryDropdown>
    );
  }
  
  return (
    <HistoryDropdown>
      <HistoryHeader>
        <h4>📋 Poslední hledání</h4>
        <ClearAllButton onClick={onClearAll}>
          <FontAwesomeIcon icon={faTrash} />
          Vymazat
        </ClearAllButton>
      </HistoryHeader>
      
      {history.map((item, index) => (
        <HistoryItem 
          key={index}
          onClick={() => onSelectQuery(item.query)}
        >
          <HistoryItemContent>
            <HistoryIcon>
              <FontAwesomeIcon icon={faClock} />
            </HistoryIcon>
            <HistoryText>
              <HistoryQuery>{item.query}</HistoryQuery>
              <HistoryMeta>
                <span>{formatTime(item.timestamp)}</span>
                {item.categories && item.categories.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{getCategoryLabels(item.categories)}</span>
                  </>
                )}
              </HistoryMeta>
            </HistoryText>
          </HistoryItemContent>
          
          <RemoveButton 
            onClick={(e) => {
              e.stopPropagation();
              onRemoveItem(item.query);
            }}
            title="Odstranit z historie"
          >
            <FontAwesomeIcon icon={faTimes} />
          </RemoveButton>
        </HistoryItem>
      ))}
    </HistoryDropdown>
  );
};

export default SearchHistory;
