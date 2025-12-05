import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList,
  faBell,
  faEdit,
  faTrash,
  faFileWord,
  faCut,
  faCopy,
  faPaste,
  faTimes,
  faFileInvoice
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
  /* 🔧 ZMĚNA: Animace se aktivuje až po pozicování pomocí opacity v style */
  transition: opacity 0.15s ease-out;
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
  color: ${props => props.danger ? '#dc2626' : props.success ? '#059669' : '#0f172a'};
  transition: all 0.15s;
  text-align: left;

  &:hover {
    background: ${props => props.danger ? '#fee2e2' : props.success ? '#d1fae5' : '#f1f5f9'};
    color: ${props => props.danger ? '#991b1b' : props.success ? '#047857' : '#0369a1'};
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
    color: ${props => props.danger ? '#dc2626' : props.success ? '#059669' : '#64748b'};
  }

  &:hover svg {
    color: ${props => props.danger ? '#991b1b' : props.success ? '#047857' : '#0369a1'};
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
 * Kontextové menu pro řádky tabulky objednávek
 * @param {Object} props
 * @param {number} props.x - X pozice menu
 * @param {number} props.y - Y pozice menu
 * @param {Object} props.order - Vybraná objednávka
 * @param {Function} props.onClose - Callback pro zavření menu
 * @param {Function} props.onAddToTodo - Přidat do TODO
 * @param {Function} props.onAddAlarm - Přidat upozornění/alarm
 * @param {Function} props.onEdit - Editovat objednávku
 * @param {Function} props.onDelete - Smazat objednávku
 * @param {Function} props.onGenerateDocx - Generovat DOCX ze šablony
 * @param {Function} props.onGenerateFinancialControl - Generovat finanční kontrolu (PDF/tisk)
 * @param {boolean} props.canDelete - Má uživatel právo smazat?
 * @param {Object} props.selectedData - Vybraná data (buňka nebo řádek)
 */
export const OrderContextMenu = ({
  x,
  y,
  order,
  onClose,
  onAddToTodo,
  onAddAlarm,
  onEdit,
  onDelete,
  onGenerateDocx,
  onGenerateFinancialControl,
  canDelete = false,
  selectedData = null
}) => {
  const menuRef = useRef(null);
  const [hasClipboardData, setHasClipboardData] = useState(false);
  const [clipboardData, setClipboardData] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ left: x, top: y });
  const [isPositioned, setIsPositioned] = useState(false); // 🔧 NOVÉ: Vlajka pro skrytí během měření

  // Funkce pro kontrolu, zda může být generován DOCX
  const canGenerateDocx = () => {
    // ✅ Generování DOCX: od fáze ROZPRACOVANA až do DOKONCENA (dle WorkflowManager fáze 3-8)
    if (!order) return false;

    // ✅ POVOLENÉ STAVY: Od ROZPRACOVANA až do DOKONCENA
    // ⚠️ SCHVALENA NENÍ POVOLENA - musí následovat ROZPRACOVANA nebo vyšší fáze!
    // Podle WorkflowManager mappingu:
    // - FÁZE 3: ROZPRACOVANA (START - začalo se pracovat)
    // - FÁZE 4: POTVRZENA, ODESLANA
    // - FÁZE 5-7: UVEREJNIT, UVEREJNENA, NEUVEREJNIT, FAKTURACE, VECNA_SPRAVNOST
    // - FÁZE 8: DOKONCENA, ZKONTROLOVANA
    const allowedStates = [
      'ROZPRACOVANA',     // ✅ FÁZE 3 - START (začalo se vyplňovat)
      // ❌ 'SCHVALENA' - pouze schváleno, ale ještě se nezačalo pracovat
      'POTVRZENA',        // ✅ FÁZE 4
      'ODESLANA',         // ✅ FÁZE 4
      'UVEREJNIT',        // ✅ FÁZE 5
      'UVEREJNENA',       // ✅ FÁZE 6
      'NEUVEREJNIT',      // ✅ FÁZE 6
      'FAKTURACE',        // ✅ FÁZE 6
      'VECNA_SPRAVNOST',  // ✅ FÁZE 7
      'DOKONCENA',        // ✅ FÁZE 8 - KONEC
      'ZKONTROLOVANA',    // ✅ FÁZE 8
      'CEKA_SE'           // ✅ Speciální stav - čeká se na dodavatele
    ];

    // ✅ KONTROLUJ ZDA POLE WORKFLOW STAVŮ OBSAHUJE ALESPOŇ JEDEN POVOLENÝ STAV
    let workflowStates = [];
    let aktualniStav = null;
    let nazevStavu = '';

    try {
      // Priorita 1: stav_workflow_kod (pole stavů - KONTROLUJ OBSAH, ne jen poslední!)
      if (order.stav_workflow_kod) {
        // 🔧 FIX: Může být UŽ ARRAY nebo STRING
        if (Array.isArray(order.stav_workflow_kod)) {
          workflowStates = order.stav_workflow_kod;
        } else if (typeof order.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(order.stav_workflow_kod);
          if (!Array.isArray(workflowStates)) {
            workflowStates = [];
          }
        }

        // Vezmi poslední stav pro zobrazení v debug logu
        if (workflowStates.length > 0) {
          const lastState = workflowStates[workflowStates.length - 1];
          if (typeof lastState === 'object' && (lastState.kod_stavu || lastState.nazev_stavu)) {
            aktualniStav = lastState.kod_stavu || lastState.nazev_stavu;
            nazevStavu = lastState.nazev_stavu || lastState.kod_stavu || '';
          } else if (typeof lastState === 'string') {
            aktualniStav = lastState;
            nazevStavu = lastState;
          }
        }
      }

      // Priorita 2: fallback na jiné pole stavu
      if (!aktualniStav) {
        aktualniStav = order.stav_id_num || order.stav_id || order.stav || order.nazev_stavu;
        nazevStavu = order.nazev_stavu || order.status_name || aktualniStav;
      }
    } catch (error) {
      aktualniStav = order.stav_id_num || order.stav_id || order.nazev_stavu;
      nazevStavu = order.nazev_stavu || '';
      workflowStates = [];
    }

    // ✅ KONTROLA: Obsahuje pole workflow stavů ALESPOŇ JEDEN povolený stav?
    const canGenerate = workflowStates.some(state => {
      // Normalizuj stav (může být string nebo objekt)
      let stavCode = '';
      if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
        stavCode = String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
      } else if (typeof state === 'string') {
        stavCode = String(state).toUpperCase().trim();
      }

      return allowedStates.includes(stavCode);
    });

    return canGenerate;
  };

  // Funkce pro kontrolu, zda může být generována finanční kontrola
  const canGenerateFinancialControl = () => {
    if (!order) return false;

    // ✅ Finanční kontrola je dostupná POUZE pro stav DOKONCENA
    let workflowStates = [];
    let aktualniStav = null;

    try {
      // Priorita 1: stav_objednavky (české názvy)
      if (order.stav_objednavky) {
        const normalizedStav = order.stav_objednavky.toLowerCase().trim();
        if (normalizedStav === 'dokončena' || normalizedStav === 'dokoncena') {
          return true;
        }
      }

      // Priorita 2: stav_workflow_kod (pole stavů)
      if (order.stav_workflow_kod) {
        if (Array.isArray(order.stav_workflow_kod)) {
          workflowStates = order.stav_workflow_kod;
        } else if (typeof order.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(order.stav_workflow_kod);
          if (!Array.isArray(workflowStates)) {
            workflowStates = [];
          }
        }

        // Zkontroluj, jestli je poslední stav DOKONCENA
        if (workflowStates.length > 0) {
          const lastState = workflowStates[workflowStates.length - 1];
          if (typeof lastState === 'object' && (lastState.kod_stavu || lastState.nazev_stavu)) {
            aktualniStav = lastState.kod_stavu || lastState.nazev_stavu;
          } else if (typeof lastState === 'string') {
            aktualniStav = lastState;
          }

          if (aktualniStav && String(aktualniStav).toUpperCase().trim() === 'DOKONCENA') {
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Chyba při kontrole stavu pro finanční kontrolu:', error);
    }

    return false;
  };

  // 🔧 NOVÉ: useEffect pro výpočet pozice HNED po prvním renderu
  useEffect(() => {
    if (menuRef.current && !isPositioned) {
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

      // Aktualizuj pozici a označ jako "positioned"
      setMenuPosition({ left, top });
      setIsPositioned(true);
    }
  }, [x, y, isPositioned]);

  // Kontrola obsahu schránky při otevření menu
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          setHasClipboardData(text && text.trim().length > 0);

          // Zkus parsovat jako JSON (pro strukturovaná data)
          try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object') {
              setClipboardData(data);
            }
          } catch {
            // Není JSON, uložíme jako text
            setClipboardData(text);
          }
        }
      } catch (error) {
        // Pokud nemáme přístup ke schránce, zkontrolujeme localStorage
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
      // Kopírujeme obsah buňky
      dataToCopy = selectedData.value;
      description = `buňka: "${dataToCopy.substring(0, 50)}${dataToCopy.length > 50 ? '...' : ''}"`;
    } else {
      // Kopírujeme celý řádek objednávky jako JSON
      dataToCopy = JSON.stringify(order, null, 2);
      description = `objednávka ${order.cislo_objednavky || order.id}`;
    }

    try {
      const textToCopy = typeof dataToCopy === 'string' ? dataToCopy : JSON.stringify(dataToCopy);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback pro starší prohlížeče
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      // Uložíme také do localStorage jako backup s metadaty
      const clipboardInfo = {
        data: dataToCopy,
        description: description,
        type: selectedData ? 'cell' : 'row',
        timestamp: Date.now()
      };
      localStorage.setItem('clipboard_data', JSON.stringify(clipboardInfo));
      setHasClipboardData(true);
      setClipboardData(dataToCopy);

      // Můžeme přidat toast zprávu o úspěšném kopírování

    } catch (error) {
    }
  };

  // Funkce pro vystříhnutí (kopírování + označení pro smazání)
  const handleCut = async () => {
    await handleCopy();
    // Přidáme metadata o vystříhnutí
    const cutData = {
      action: 'cut',
      data: selectedData || order,
      type: selectedData ? 'cell' : 'row',
      orderId: order.id || order.cislo_objednavky,
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
        // Zde můžeme implementovat konkrétní logiku podle typu dat
        // například:
        // - Vyplnění formuláře při editaci
        // - Vytvoření nové objednávky na základě šablony
        // - Nahrazení obsahu buňky

        // Pro teď jen ukážeme informaci
        alert(`Vloženo: ${clipboardInfo.description || 'data ze schránky'}`);
      }
    } catch (error) {
    }
  };

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

  return ReactDOM.createPortal(
    <MenuContainer
      ref={menuRef}
      style={{
        left: `${menuPosition.left}px`,
        top: `${menuPosition.top}px`,
        // 🔧 NOVÉ: Skryj menu, dokud není správně umístěno (prevence flicker)
        opacity: isPositioned ? 1 : 0,
        pointerEvents: isPositioned ? 'auto' : 'none'
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

      <MenuItem onClick={() => { onAddToTodo(order); onClose(); }}>
        <FontAwesomeIcon icon={faClipboardList} />
        <MenuLabel>Přidat do mého TODO</MenuLabel>
      </MenuItem>

      <MenuItem onClick={() => { onAddAlarm(order); onClose(); }}>
        <FontAwesomeIcon icon={faBell} />
        <MenuLabel>Přidat upozornění - ALARM</MenuLabel>
      </MenuItem>

      <MenuDivider />

      <MenuItem onClick={() => { onEdit(order); onClose(); }}>
        <FontAwesomeIcon icon={faEdit} />
        <MenuLabel>Editace objednávky</MenuLabel>
      </MenuItem>

      <MenuItem
        danger
        disabled={!canDelete}
        onClick={() => { if (canDelete) { onDelete(order); onClose(); } }}
        title={!canDelete ? 'Nemáte oprávnění ke smazání této objednávky' : 'Smazat objednávku'}
      >
        <FontAwesomeIcon icon={faTrash} />
        <MenuLabel>Smazat objednávku</MenuLabel>
      </MenuItem>

      <MenuDivider />

      <MenuItem
        disabled={!canGenerateDocx()}
        onClick={() => { if (canGenerateDocx()) { onGenerateDocx(order); onClose(); } }}
        title={
          !canGenerateDocx()
            ? 'Generování DOCX je dostupné od fáze ROZPRACOVANÁ (po schválení, když se začne vyplňovat) až do DOKONČENÁ'
            : 'Generovat DOCX dokument ze šablony'
        }
      >
        <FontAwesomeIcon icon={faFileWord} />
        <MenuLabel>Generovat DOCX</MenuLabel>
      </MenuItem>

      <MenuItem
        success
        disabled={!canGenerateFinancialControl()}
        onClick={() => { if (canGenerateFinancialControl() && onGenerateFinancialControl) { onGenerateFinancialControl(order); onClose(); } }}
        title={
          !canGenerateFinancialControl()
            ? 'Finanční kontrola je dostupná pouze pro objednávky ve stavu DOKONČENA'
            : 'Generovat finanční kontrolu (PDF/tisk)'
        }
      >
        <FontAwesomeIcon icon={faFileInvoice} />
        <MenuLabel>Finanční kontrola (PDF/tisk)</MenuLabel>
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
