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
  columnOrder,
  columnLabels,
  onVisibilityChange,
  onOrderChange,
  onReset,
  onSave,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleToggleVisibility = (columnId) => {
    onVisibilityChange?.(columnId, !columnVisibility[columnId]);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...columnOrder];
    const draggedItem = newOrder[draggedIndex];

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
    onReset?.();
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
                {columnOrder.map((columnId, index) => (
                  <ColumnItem
                    key={columnId}
                    $visible={columnVisibility[columnId]}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <DragHandle title="Přetáhněte pro změnu pořadí">
                      <FontAwesomeIcon icon={faGripVertical} />
                    </DragHandle>

                    <ColumnLabel $visible={columnVisibility[columnId]}>
                      {columnLabels[columnId] || columnId}
                    </ColumnLabel>

                    <VisibilityToggle
                      $visible={columnVisibility[columnId]}
                      onClick={() => handleToggleVisibility(columnId)}
                      title={columnVisibility[columnId] ? 'Skrýt sloupec' : 'Zobrazit sloupec'}
                    >
                      <FontAwesomeIcon icon={columnVisibility[columnId] ? faEye : faEyeSlash} />
                    </VisibilityToggle>
                  </ColumnItem>
                ))}
              </ColumnList>
            </ModalBody>

            <ModalFooter>
              <ResetButton onClick={handleReset} title="Obnovit výchozí nastavení">
                <FontAwesomeIcon icon={faUndo} />
                Výchozí
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
