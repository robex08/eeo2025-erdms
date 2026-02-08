/**
 * OrdersColumnConfigV3.js
 * 
 * Komponenta pro konfiguraci viditelnosti a pořadí sloupců tabulky
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog,
  faEye,
  faEyeSlash,
  faGripVertical,
  faUndo,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const ConfigButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  color: #3b82f6;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #3b82f6;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }

  svg {
    font-size: 1rem;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    color: #3b82f6;
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  svg {
    font-size: 1.25rem;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const ColumnList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ColumnItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.$visible ? 'white' : '#f8fafc'};
  border: 2px solid ${props => props.$visible ? '#e2e8f0' : '#e2e8f0'};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  color: #94a3b8;
  cursor: grab;
  font-size: 1.25rem;

  &:active {
    cursor: grabbing;
  }
`;

const ColumnLabel = styled.div`
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${props => props.$visible ? '#1e293b' : '#94a3b8'};
`;

const VisibilityToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${props => props.$visible ? '#10b981' : '#ef4444'};
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  svg {
    font-size: 1rem;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-top: 2px solid #e2e8f0;
  gap: 1rem;
`;

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  color: #ef4444;
  border: 2px solid #ef4444;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #ef4444;
    color: white;
  }
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }
`;

// ============================================================================
// CONSTANTS
// ============================================================================

// Sloupce které nelze skrýt ani přesunout
const LOCKED_COLUMNS = ['expander', 'actions'];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Komponenta pro konfiguraci sloupců
 * 
 * @param {Object} props
 * @param {Object} props.columnVisibility - Viditelnost sloupců { columnId: boolean }
 * @param {Array} props.columnOrder - Pořadí sloupců ['columnId1', 'columnId2', ...]
 * @param {Object} props.columnLabels - Názvy sloupců { columnId: 'Label' }
 * @param {Function} props.onVisibilityChange - Callback pro změnu viditelnosti
 * @param {Function} props.onOrderChange - Callback pro změnu pořadí
 * @param {Function} props.onReset - Callback pro reset na výchozí
 * @param {Function} props.onSave - Callback pro uložení (do user settings)
 */
function OrdersColumnConfigV3({
  columnVisibility,
  columnOrder = [],
  columnLabels,
  onVisibilityChange,
  onOrderChange,
  onReset,
  onSave,
  userId,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  // Ensure columnOrder is always an array
  const safeColumnOrder = Array.isArray(columnOrder) ? columnOrder : [];

  const handleToggleVisibility = (columnId) => {
    // Zakázat skrytí locked sloupců
    if (LOCKED_COLUMNS.includes(columnId)) {
      return;
    }
    onVisibilityChange?.(columnId, !columnVisibility[columnId]);
  };

  const handleDragStart = (e, index, columnId) => {
    // Zakázat drag locked sloupců
    if (LOCKED_COLUMNS.includes(columnId)) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index, columnId) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Zakázat drop na locked sloupce
    if (LOCKED_COLUMNS.includes(columnId)) {
      return;
    }

    const newOrder = [...safeColumnOrder];
    const draggedItem = newOrder[draggedIndex];
    
    // Zakázat přesun locked sloupců
    if (LOCKED_COLUMNS.includes(draggedItem)) {
      return;
    }

    // Remove from old position
    newOrder.splice(draggedIndex, 1);
    // Insert at new position
    newOrder.splice(index, 0, draggedItem);

    onOrderChange?.(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleReset = () => {
    if (userId) {
      // Vymazat VŠECHNY localStorage klíče pro Orders V3
      const storagePrefix = 'ordersV3_v3'; // Použít aktuální prefix
      const keysToRemove = [
        `${storagePrefix}_showDashboard_${userId}`,
        `${storagePrefix}_showFilters_${userId}`,
        `${storagePrefix}_dashboardMode_${userId}`,
        `${storagePrefix}_showRowColoring_${userId}`,
        `${storagePrefix}_itemsPerPage_${userId}`,
        `${storagePrefix}_selectedPeriod_${userId}`,
        `${storagePrefix}_columnFilters_${userId}`,
        `${storagePrefix}_dashboardFilters_${userId}`,
        `${storagePrefix}_expandedRows_${userId}`,
        `${storagePrefix}_columnVisibility_${userId}`,
        `${storagePrefix}_columnOrder_${userId}`,
        `${storagePrefix}_columnSizing_${userId}`, // Šířky sloupců
        `${storagePrefix}_preferences_${userId}`, // Centralizované preferences
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('✅ localStorage vyčištěno, všechny preference resetovány');
    }
    
    onReset?.();
    setIsOpen(false);
    
    // Reload stránky pro načtení výchozích hodnot
    alert('Veškerá nastavení byla resetována na výchozí hodnoty. Stránka se obnoví.');
    window.location.reload();
  };

  const handleResetColumnWidths = () => {
    if (userId) {
      const storagePrefix = 'ordersV3_v3';
      localStorage.removeItem(`${storagePrefix}_columnSizing_${userId}`);
      alert('Šířky sloupců byly resetovány. Stránka se obnoví.');
      window.location.reload();
    }
  };

  const handleSave = () => {
    onSave?.();
    setIsOpen(false);
  };

  return (
    <>
      {/* Tlačítko pro otevření konfigurace */}
      <ConfigButton onClick={() => setIsOpen(true)} title="Konfigurace sloupců">
        <FontAwesomeIcon icon={faCog} />
        Sloupce
      </ConfigButton>

      {/* Modal s konfigurací */}
      {isOpen && (
        <ModalOverlay onClick={() => setIsOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                <FontAwesomeIcon icon={faCog} />
                Konfigurace sloupců
              </ModalTitle>
              <CloseButton onClick={() => setIsOpen(false)} title="Zavřít">
                <FontAwesomeIcon icon={faTimes} />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              <ColumnList>
                {safeColumnOrder.map((columnId, index) => {
                  const isLocked = LOCKED_COLUMNS.includes(columnId);
                  
                  return (
                    <ColumnItem
                      key={columnId}
                      $visible={columnVisibility[columnId]}
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStart(e, index, columnId)}
                      onDragOver={(e) => handleDragOver(e, index, columnId)}
                      onDragEnd={handleDragEnd}
                      style={{
                        opacity: isLocked ? 0.6 : 1,
                        cursor: isLocked ? 'not-allowed' : 'default'
                      }}
                    >
                      <DragHandle 
                        title={isLocked ? 'Tento sloupec nelze přesouvat' : 'Přetáhněte pro změnu pořadí'}
                        style={{ 
                          cursor: isLocked ? 'not-allowed' : 'grab',
                          opacity: isLocked ? 0.3 : 1
                        }}
                      >
                        <FontAwesomeIcon icon={faGripVertical} />
                      </DragHandle>

                      <ColumnLabel $visible={columnVisibility[columnId]}>
                        {columnLabels[columnId] || columnId}
                        {isLocked && <span style={{ marginLeft: '8px', fontSize: '0.75em', color: '#94a3b8' }}>(固定)</span>}
                      </ColumnLabel>

                      <VisibilityToggle
                        $visible={columnVisibility[columnId]}
                        onClick={() => handleToggleVisibility(columnId)}
                        title={isLocked ? 'Tento sloupec nelze skrýt' : (columnVisibility[columnId] ? 'Skrýt sloupec' : 'Zobrazit sloupec')}
                        disabled={isLocked}
                        style={{
                          opacity: isLocked ? 0.3 : 1,
                          cursor: isLocked ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <FontAwesomeIcon icon={columnVisibility[columnId] ? faEye : faEyeSlash} />
                      </VisibilityToggle>
                    </ColumnItem>
                  );
                })}
              </ColumnList>
            </ModalBody>

            <ModalFooter>
              <ResetButton onClick={handleReset} title="Obnovit kompletně výchozí nastavení (smaže všechny preferences a šířky)">
                <FontAwesomeIcon icon={faUndo} />
                Reset vše
              </ResetButton>
              
              <ResetButton 
                onClick={handleResetColumnWidths}
                title="Resetovat pouze šířky sloupců"
                style={{ marginLeft: '8px' }}
              >
                <FontAwesomeIcon icon={faUndo} />
                Reset šířek
              </ResetButton>

              <SaveButton onClick={handleSave} title="Uložit nastavení">
                Uložit
              </SaveButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}

export default OrdersColumnConfigV3;
