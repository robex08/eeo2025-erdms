/**
 * Context Menu pro číselníky
 * Pravé tlačítko myši menu pro akce nad záznamy
 *
 * @author Frontend Team
 * @date 2025-10-19
 */

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrash,
  faToggleOn,
  faToggleOff,
  faCopy,
  faEye
} from '@fortawesome/free-solid-svg-icons';

const MenuContainer = styled.div`
  position: fixed;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0.5rem 0;
  min-width: 200px;
  z-index: 99999;
  font-size: 0.875rem;
  animation: fadeIn 0.15s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${props => props.$danger ? '#dc2626' : props.$success ? '#16a34a' : '#0f172a'};
  transition: all 0.15s;
  text-align: left;

  &:hover {
    background: ${props => props.$danger ? '#fee2e2' : props.$success ? '#dcfce7' : '#f1f5f9'};
    color: ${props => props.$danger ? '#991b1b' : props.$success ? '#15803d' : '#0369a1'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: #94a3b8;

    &:hover {
      background: transparent;
      color: #94a3b8;
    }
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${props => props.$danger ? '#dc2626' : props.$success ? '#16a34a' : '#64748b'};
  }

  &:hover svg {
    color: ${props => props.$danger ? '#991b1b' : props.$success ? '#15803d' : '#0369a1'};
  }

  &:disabled svg {
    color: #94a3b8;
  }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: #e2e8f0;
  margin: 0.5rem 0;
`;

const MenuLabel = styled.span`
  flex: 1;
  font-weight: 500;
`;

/**
 * Context menu pro číselníky
 *
 * @param {number} x - X pozice
 * @param {number} y - Y pozice
 * @param {object} item - Vybraný záznam
 * @param {function} onClose - Zavřít menu
 * @param {function} onEdit - Editovat
 * @param {function} onDelete - Smazat
 * @param {function} onToggleActive - Zapnout/Vypnout
 * @param {function} onView - Zobrazit detail
 * @param {boolean} canEdit - Může editovat?
 * @param {boolean} canDelete - Může smazat?
 * @param {boolean} readOnly - Je číselník read-only?
 */
const DictionaryContextMenu = ({
  x,
  y,
  item,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
  onView,
  canEdit = true,
  canDelete = true,
  readOnly = false,
}) => {
  const menuRef = useRef(null);

  // Zavři při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjustuj pozici aby menu bylo viditelné
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const handleCopy = async () => {
    try {
      const text = JSON.stringify(item, null, 2);
      await navigator.clipboard.writeText(text);
    } catch (error) {
    }
    onClose();
  };

  return ReactDOM.createPortal(
    <MenuContainer ref={menuRef} style={{ left: x, top: y }}>
      {/* Zobrazit detail (pro read-only) */}
      {onView && (
        <>
          <MenuItem onClick={() => { onView(item); onClose(); }}>
            <FontAwesomeIcon icon={faEye} />
            <MenuLabel>Zobrazit detail</MenuLabel>
          </MenuItem>
          <MenuDivider />
        </>
      )}

      {/* Editace (pouze pro editovatelné) */}
      {!readOnly && onEdit && (
        <MenuItem
          onClick={() => { onEdit(item); onClose(); }}
          disabled={!canEdit}
        >
          <FontAwesomeIcon icon={faEdit} />
          <MenuLabel>Upravit</MenuLabel>
        </MenuItem>
      )}

      {/* Toggle Active (pouze pro editovatelné s aktivním polem) */}
      {!readOnly && onToggleActive && item.aktivni !== undefined && (
        <MenuItem
          $success={!item.aktivni}
          onClick={() => { onToggleActive(item); onClose(); }}
          disabled={!canEdit}
        >
          <FontAwesomeIcon icon={item.aktivni ? faToggleOff : faToggleOn} />
          <MenuLabel>{item.aktivni ? 'Deaktivovat' : 'Aktivovat'}</MenuLabel>
        </MenuItem>
      )}

      {/* Kopírovat */}
      <MenuItem onClick={handleCopy}>
        <FontAwesomeIcon icon={faCopy} />
        <MenuLabel>Kopírovat do schránky</MenuLabel>
      </MenuItem>

      {/* Smazat (pouze pro editovatelné) */}
      {!readOnly && onDelete && (
        <>
          <MenuDivider />
          <MenuItem
            $danger
            onClick={() => { onDelete(item); onClose(); }}
            disabled={!canDelete}
          >
            <FontAwesomeIcon icon={faTrash} />
            <MenuLabel>Smazat</MenuLabel>
          </MenuItem>
        </>
      )}
    </MenuContainer>,
    document.body
  );
};

export default DictionaryContextMenu;
