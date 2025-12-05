import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrash,
  faUserCheck,
  faUserSlash,
  faUserMinus,
  faBan,
  faCut,
  faCopy,
  faPaste,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

const MenuContainer = styled.div`
  position: fixed;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0.5rem 0;
  min-width: 220px;
  z-index: 999999;
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
  color: ${props => props.danger ? '#dc2626' : props.success ? '#16a34a' : '#0f172a'};
  transition: all 0.15s;
  text-align: left;

  &:hover {
    background: ${props => props.danger ? '#fee2e2' : props.success ? '#dcfce7' : '#f1f5f9'};
    color: ${props => props.danger ? '#991b1b' : props.success ? '#15803d' : '#0369a1'};
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
    color: ${props => props.danger ? '#dc2626' : props.success ? '#16a34a' : '#64748b'};
  }

  &:hover svg {
    color: ${props => props.danger ? '#991b1b' : props.success ? '#15803d' : '#0369a1'};
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
 * Kontextové menu pro řádky tabulky uživatelů
 * @param {Object} props
 * @param {number} props.x - X pozice menu
 * @param {number} props.y - Y pozice menu
 * @param {Object} props.user - Vybraný uživatel
 * @param {Function} props.onClose - Callback pro zavření menu
 * @param {Function} props.onEdit - Editovat uživatele
 * @param {Function} props.onDelete - Smazat uživatele
 * @param {Function} props.onToggleActive - Povolit/Zakázat uživatele
 * @param {boolean} props.canEdit - Má uživatel právo editovat?
 * @param {boolean} props.canDelete - Má uživatel právo smazat?
 * @param {Object} props.selectedData - Vybraná data (buňka nebo řádek)
 */
export const UserContextMenu = ({
  x,
  y,
  user,
  onClose,
  onEdit,
  onDelete,
  onToggleActive,
  canEdit = true,
  canDelete = false,
  selectedData = null
}) => {
  const menuRef = useRef(null);
  const [hasClipboardData, setHasClipboardData] = useState(false);
  const [clipboardData, setClipboardData] = useState(null);

  // Kontrola obsahu schránky při otevření menu
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          setHasClipboardData(text && text.trim().length > 0);

          try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object') {
              setClipboardData(data);
            }
          } catch {
            setClipboardData(text);
          }
        }
      } catch (error) {
        const localData = localStorage.getItem('clipboard_data');
        setHasClipboardData(!!localData);
        if (localData) {
          try {
            setClipboardData(JSON.parse(localData));
          } catch {
            setClipboardData(localData);
          }
        }
      }
    };

    checkClipboard();
  }, []);

  // Funkce pro kopírování do schránky
  const handleCopy = async () => {
    let dataToCopy;
    let description = '';

    if (selectedData && selectedData.value) {
      dataToCopy = selectedData.value;
      description = `buňka: "${dataToCopy.substring(0, 50)}${dataToCopy.length > 50 ? '...' : ''}"`;
    } else {
      dataToCopy = JSON.stringify(user, null, 2);
      description = `uživatel ${user.username || user.id}`;
    }

    try {
      const textToCopy = typeof dataToCopy === 'string' ? dataToCopy : JSON.stringify(dataToCopy);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      const clipboardInfo = {
        data: dataToCopy,
        description: description,
        type: selectedData ? 'cell' : 'row',
        timestamp: Date.now()
      };
      localStorage.setItem('clipboard_data', JSON.stringify(clipboardInfo));
      setHasClipboardData(true);
      setClipboardData(dataToCopy);


    } catch (error) {
    }
  };

  // Funkce pro vystříhnutí
  const handleCut = async () => {
    await handleCopy();
    const cutData = {
      action: 'cut',
      data: selectedData || user,
      type: selectedData ? 'cell' : 'row',
      userId: user.id || user.username,
      timestamp: Date.now()
    };

    localStorage.setItem('clipboard_action', JSON.stringify(cutData));
  };

  // Funkce pro vložení ze schránky
  const handlePaste = async () => {
    try {
      let clipboardInfo = null;

      // Zkus načíst ze schránky
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            clipboardInfo = { data: text, type: 'external' };
          }
        }
      } catch (error) {
      }

      // Pokud jsme nenačetli ze schránky, zkus localStorage
      if (!clipboardInfo) {
        const localData = localStorage.getItem('clipboard_data');
        if (localData) {
          try {
            clipboardInfo = JSON.parse(localData);
          } catch {
            clipboardInfo = { data: localData, type: 'text' };
          }
        }
      }

      if (clipboardInfo && clipboardInfo.data) {

        alert(`Vloženo: ${clipboardInfo.description || 'data ze schránky'}`);
      }
    } catch (error) {
    }
  };

  // Detekce stavu uživatele (aktivní/neaktivní)
  // Kontrolujeme různé varianty pole: active (boolean z Users.js), is_active, aktivni
  const isActive =
    user?.active === true ||
    user?.active === 1 ||
    user?.is_active === 1 ||
    user?.is_active === true ||
    user?.aktivni === 1 ||
    user?.aktivni === true;

  // Zavřít menu při kliku mimo něj
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'c':
          case 'C':
            e.preventDefault();
            handleCopy();
            onClose();
            break;
          case 'x':
          case 'X':
            e.preventDefault();
            handleCut();
            onClose();
            break;
          case 'v':
          case 'V':
            if (hasClipboardData) {
              e.preventDefault();
              handlePaste();
              onClose();
            }
            break;
        }
      }
    };

    // Malé zpoždění, aby se menu nestihlo zavřít hned po otevření
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 50);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Zajisti, aby se menu zobrazilo v rámci viewportu
  const adjustedPosition = () => {
    if (!menuRef.current) return { left: x, top: y };

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = x;
    let top = y;

    // Kontrola, zda menu přesahuje pravý okraj
    if (x + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 10;
    }

    // Kontrola, zda menu přesahuje spodní okraj
    if (y + menuRect.height > viewportHeight) {
      top = viewportHeight - menuRect.height - 10;
    }

    return { left, top };
  };

  const position = adjustedPosition();

  return ReactDOM.createPortal(
    <MenuContainer
      ref={menuRef}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`
      }}
    >
      <MenuItem
        onClick={() => { handleCut(); onClose(); }}
        title={`Vystrihnout ${selectedData ? 'obsah buňky' : 'celý řádek'} (Ctrl+X)`}
      >
        <FontAwesomeIcon icon={faCut} />
        <MenuLabel>Vystrihnout</MenuLabel>
      </MenuItem>

      <MenuItem
        onClick={() => { handleCopy(); onClose(); }}
        title={`Kopírovat ${selectedData ? 'obsah buňky' : 'celý řádek'} (Ctrl+C)`}
      >
        <FontAwesomeIcon icon={faCopy} />
        <MenuLabel>Kopírovat</MenuLabel>
      </MenuItem>

      <MenuItem
        disabled={!hasClipboardData}
        onClick={() => { if (hasClipboardData) { handlePaste(); onClose(); } }}
        title={
          !hasClipboardData
            ? 'Schránka je prázdná'
            : `Vložit ze schránky${clipboardData ? ` (${typeof clipboardData === 'string' ? clipboardData.substring(0, 30) + '...' : 'strukturovaná data'})` : ''}`
        }
      >
        <FontAwesomeIcon icon={faPaste} />
        <MenuLabel>Vložit</MenuLabel>
      </MenuItem>

      <MenuDivider />

      <MenuItem
        disabled={!canEdit}
        onClick={() => { if (canEdit) { onEdit(user); onClose(); } }}
        title={!canEdit ? 'Nemáte oprávnění k editaci tohoto uživatele' : 'Editovat uživatele'}
      >
        <FontAwesomeIcon icon={faEdit} />
        <MenuLabel>Editovat uživatele</MenuLabel>
      </MenuItem>

      <MenuDivider />

      <MenuItem
        success={!isActive}
        danger={isActive}
        onClick={() => { onToggleActive(user, isActive); onClose(); }}
        title={isActive ? 'Zakázat uživatele' : 'Povolit uživatele'}
      >
        <FontAwesomeIcon icon={isActive ? faUserSlash : faUserCheck} />
        <MenuLabel>{isActive ? 'Zakázat uživatele' : 'Povolit uživatele'}</MenuLabel>
      </MenuItem>

      <MenuDivider />

      <MenuItem
        danger
        onClick={() => { onDelete(user); onClose(); }}
        title={
          !canDelete
            ? 'Nemáte oprávnění ke smazání - uživatel bude pouze deaktivován'
            : 'Trvale smazat uživatele z databáze'
        }
      >
        <FontAwesomeIcon icon={canDelete ? faTrash : faUserMinus} />
        <MenuLabel>{canDelete ? 'Smazat uživatele' : 'Deaktivovat uživatele'}</MenuLabel>
      </MenuItem>

      <MenuDivider />

      <MenuItem onClick={() => onClose()}>
        <FontAwesomeIcon icon={faTimes} />
        <MenuLabel>Storno</MenuLabel>
      </MenuItem>
    </MenuContainer>,
    document.body
  );
};

export default UserContextMenu;
