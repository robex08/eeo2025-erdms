import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Banknote, 
  Building2, 
  FileInput, 
  HelpCircle, 
  XCircle,
  ChevronDown
} from 'lucide-react';

/**
 * InvoiceStatusSelect - Komponenta pro výběr workflow stavu faktury
 * 
 * DŮLEŽITÉ: Tato komponenta je POUZE INFORMATIVNÍ!
 * - Věcná kontrola se potvrzuje POUZE přes formulář faktury (ne zde)
 * - Jediná automatika: ZAEVIDOVANA + potvrzení věcné (ve formuláři) → VECNA_SPRAVNOST
 * 
 * @param {Object} props
 * @param {string} props.currentStatus - Aktuální stav faktury (ENUM hodnota)
 * @param {string} props.dueDate - Datum splatnosti (YYYY-MM-DD)
 * @param {Function} props.onStatusChange - Callback při změně stavu
 * @param {boolean} props.disabled - Zakázat interakci (read-only)
 */

// Styled components
const Container = styled.div`
  position: relative;
  display: inline-block;
  text-align: left;
  width: 100%;
  max-width: 260px;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.375rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 400;
  letter-spacing: -0.01em;
  border: 1px solid;
  border-radius: 6px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  
  ${props => props.$color}
  
  &:hover {
    box-shadow: ${props => props.$disabled ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
  }
  
  &:focus {
    outline: none;
    ring: 2px;
    ring-offset: 1px;
    ring-color: #3b82f6;
  }
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  flex: 1;
`;

const ButtonLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OverdueBadge = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 700;
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  white-space: nowrap;
`;

const Dropdown = styled.div`
  position: fixed;
  z-index: 9999;
  width: 18rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  outline: none;
  animation: fadeIn 0.1s;
  
  /* Pozice se nastaví dynamicky pomocí inline style */
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const DropdownContent = styled.div`
  padding: 0.25rem 0;
  max-height: 320px;
  overflow-y: auto;
  
  /* Stylový scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
`;

const DropdownHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
`;

const StatusOption = styled.button`
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  transition: background-color 0.2s;
  background-color: ${props => props.$active ? '#eff6ff' : 'transparent'};
  border: none;
  cursor: pointer;
  border-top: ${props => props.$hasBorder ? '1px solid #f3f4f6' : 'none'};
  margin-top: ${props => props.$hasBorder ? '0.25rem' : '0'};
  font-size: 0.9rem;
  font-weight: 400;
  letter-spacing: -0.01em;
  
  &:hover {
    background-color: #f9fafb;
  }
`;

const StatusIconBox = styled.div`
  margin-top: 0.125rem;
  padding: 0.25rem;
  border-radius: 6px;
  ${props => props.$color}
`;

const StatusOptionContent = styled.div`
  flex: 1;
`;

const StatusOptionLabel = styled.p`
  font-size: 0.9rem;
  font-weight: 400;
  color: ${props => props.$cancelled ? '#6b7280' : '#111827'};
  text-decoration: ${props => props.$cancelled ? 'line-through' : 'none'};
  margin: 0;
  letter-spacing: -0.01em;
`;

const StatusOptionDesc = styled.p`
  font-size: 0.8rem;
  font-weight: 400;
  color: #6b7280;
  margin: 0.125rem 0 0 0;
  line-height: 1.25;
  letter-spacing: -0.01em;
`;

const ActiveCheck = styled(CheckCircle)`
  margin-left: auto;
  margin-top: 0.25rem;
  color: #2563eb;
  flex-shrink: 0;
`;

// Definice stavů faktur (podle DB ENUM)
const INVOICE_STATES = {
  ZAEVIDOVANA: {
    id: 'ZAEVIDOVANA',
    label: 'Zaevidovaná',
    description: 'Nově vložená z podatelny',
    color: 'background-color: #f3f4f6; color: #374151; border-color: #d1d5db;',
    icon: FileInput
  },
  VECNA_SPRAVNOST: {
    id: 'VECNA_SPRAVNOST',
    label: 'Věcná správnost',
    description: 'Poslaná k potvrzení věcné správnosti',
    color: 'background-color: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;',
    icon: CheckCircle
  },
  V_RESENI: {
    id: 'V_RESENI',
    label: 'V řešení',
    description: 'Čeká se na dořešení (nejasnosti, dotazy)',
    color: 'background-color: #fff7ed; color: #c2410c; border-color: #fed7aa;',
    icon: HelpCircle
  },
  PREDANA_PO: {
    id: 'PREDANA_PO',
    label: 'Předaná PO',
    description: 'Fyzicky na ředitelství (v kolečku)',
    color: 'background-color: #faf5ff; color: #7e22ce; border-color: #e9d5ff;',
    icon: Building2
  },
  K_ZAPLACENI: {
    id: 'K_ZAPLACENI',
    label: 'K zaplacení',
    description: 'Předáno HÚ k úhradě, finální stav pro účetní',
    color: 'background-color: #ecfeff; color: #0e7490; border-color: #a5f3fc;',
    icon: Banknote
  },
  ZAPLACENO: {
    id: 'ZAPLACENO',
    label: 'Zaplaceno',
    description: 'Uhrazeno (pro vzdělávání apod.)',
    color: 'background-color: #ecfdf5; color: #047857; border-color: #a7f3d0;',
    icon: CheckCircle
  },
  DOKONCENA: {
    id: 'DOKONCENA',
    label: 'Dokončená',
    description: 'Faktura zcela dokončena',
    color: 'background-color: #f0fdf4; color: #15803d; border-color: #bbf7d0;',
    icon: CheckCircle
  },
  STORNO: {
    id: 'STORNO',
    label: 'Storno+',
    description: 'Faktura stažena dodavatelem',
    color: 'background-color: #f1f5f9; color: #94a3b8; border-color: #cbd5e1; text-decoration: line-through;',
    icon: XCircle
  }
};

const InvoiceStatusSelect = ({ 
  currentStatus = 'ZAEVIDOVANA', 
  dueDate,
  onStatusChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUpward: false });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Kontrola, zda klik není na tlačítko nebo dropdown
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Výpočet pozice dropdownu v portalu
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        
        // Získat skutečnou výšku dropdownu pokud existuje, jinak použít odhad
        const dropdownHeight = dropdownRef.current 
          ? dropdownRef.current.offsetHeight 
          : 380; // Přibližná výška pro první render
        
        const openUpward = spaceBelow < dropdownHeight + 16 && buttonRect.top > dropdownHeight + 16;
        
        setDropdownPosition({
          top: openUpward ? buttonRect.top - dropdownHeight - 8 : buttonRect.bottom + 8,
          left: buttonRect.left,
          openUpward
        });
      };
      
      // První update s malým zpožděním pro získání výšky dropdownu
      updatePosition();
      setTimeout(updatePosition, 0);
      
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Získat konfiguraci aktuálního stavu
  const activeStateConfig = INVOICE_STATES[currentStatus] || INVOICE_STATES.ZAEVIDOVANA;
  // ⚠️ Finální stavy (nezobrazovat "po splatnosti"):
  // - ZAPLACENO, DOKONCENA = faktura je vyřízená
  // - STORNO = faktura je zrušená, už se neřeší
  // ✅ K_ZAPLACENI NENÍ finální stav! Znamená "čeká na zaplacení" a MŮŽE být po splatnosti!
  const isFinalState = ['ZAPLACENO', 'DOKONCENA', 'STORNO'].includes(currentStatus);

  // Výpočet rozdílu dní do/po splatnosti
  const getDaysDiff = () => {
    if (!dueDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const daysDiff = getDaysDiff();
  const isOverdue = !isFinalState && daysDiff < 0; // Je po splatnosti a není zaplacena/dokončena/storno

  // Určení vzhledu
  let displayColor = activeStateConfig.color;
  const DisplayIcon = activeStateConfig.icon;
  let displayLabel = activeStateConfig.label;
  let overdueBadge = null;
  let tooltipText = `Stav: ${activeStateConfig.label}`;
  let iconColor = 'inherit';
  let badgeColor = { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };

  if (dueDate && !isFinalState) {
    if (isOverdue) {
      // PO SPLATNOSTI - rozlišit závažnost intenzitou POZADÍ (text stejný)
      if (currentStatus === 'ZAEVIDOVANA') {
        // 🔴 KRITICKÉ: Nová faktura už po splatnosti - NEJTMAVŠÍ pozadí, světle žlutý text
        displayColor = 'background-color: #7f1d1d; color: #fef08a; border-color: #991b1b;';
        iconColor = '#fef08a';
        badgeColor = { bg: '#991b1b', text: '#fef08a', border: '#7f1d1d' };
        tooltipText += `\n⚠️ KRITICKÉ: ${Math.abs(daysDiff)} dní po splatnosti! (faktura teprve zaevidována)`;
      } else if (currentStatus === 'PREDANA_PO') {
        // 🔴 KRITICKÉ: Předána PO a po splatnosti - světlejší než ZAEVIDOVANA
        displayColor = 'background-color: #b91c1c; color: #ffffff; border-color: #dc2626;';
        iconColor = '#ffffff';
        badgeColor = { bg: '#dc2626', text: '#ffffff', border: '#b91c1c' };
        tooltipText += `\n⚠️ KRITICKÉ: ${Math.abs(daysDiff)} dní po splatnosti! (předána PO)`;
      } else if (currentStatus === 'K_ZAPLACENI') {
        // 🟢 NEJMÉNĚ KRITICKÉ: K zaplacení - NEJSVĚTLEJŠÍ pozadí (jen čeká na platbu)
        displayColor = 'background-color: #fef2f2; color: #991b1b; border-color: #fecaca;';
        iconColor = '#991b1b';
        badgeColor = { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
        tooltipText += `\n⚠️ POZOR: ${Math.abs(daysDiff)} dní po splatnosti! (připraveno k platbě)`;
      } else if (currentStatus === 'VECNA_SPRAVNOST') {
        // 🟡 MÍRNĚJŠÍ: Věcná správnost provedena - lehce tmavší pozadí než K_ZAPLACENI
        displayColor = 'background-color: #fee2e2; color: #991b1b; border-color: #fca5a5;';
        iconColor = '#991b1b';
        badgeColor = { bg: '#fecaca', text: '#991b1b', border: '#f87171' };
        tooltipText += `\n⚠️ POZOR: ${Math.abs(daysDiff)} dní po splatnosti! (věcná správnost potvrzena)`;
      } else {
        // 🟠 STŘEDNÍ: Ostatní stavy (V_RESENI, atd.) - střední pozadí
        displayColor = 'background-color: #fecaca; color: #991b1b; border-color: #fca5a5;';
        iconColor = '#991b1b';
        badgeColor = { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
        tooltipText += `\n⚠️ POZOR: ${Math.abs(daysDiff)} dní po splatnosti!`;
      }
      overdueBadge = `${Math.abs(daysDiff)} d. po`;
    } else {
      // V BUDOUCNU - info v tooltipu
      tooltipText += `\nSplatnost za ${daysDiff} dní (${new Date(dueDate).toLocaleDateString('cs-CZ')})`;
    }
  }

  const handleStatusClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (stateId) => {
    if (onStatusChange) {
      onStatusChange(stateId);
    }
    setIsOpen(false);
  };

  return (
    <Container ref={containerRef}>
      <ButtonRow>
        <StatusButton
          ref={buttonRef}
          onClick={handleStatusClick}
          type="button"
          title={tooltipText}
          $color={displayColor}
          $disabled={disabled}
        >
          <ButtonContent>
            <DisplayIcon size={16} style={{ flexShrink: 0, color: iconColor }} />
            <ButtonLabel>{displayLabel}</ButtonLabel>
            {overdueBadge && (
              <OverdueBadge style={{ 
                backgroundColor: badgeColor.bg, 
                color: badgeColor.text, 
                borderColor: badgeColor.border 
              }}>{overdueBadge}</OverdueBadge>
            )}
          </ButtonContent>
          <ChevronDown 
            size={14} 
            style={{ 
              opacity: 0.5, 
              marginLeft: '0.5rem', 
              flexShrink: 0,
              transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }} 
          />
        </StatusButton>
      </ButtonRow>

      {/* Dropdown menu v React Portal */}
      {isOpen && !disabled && createPortal(
        <Dropdown 
          ref={dropdownRef}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <DropdownContent>
            <DropdownHeader>
              <span>Změnit stav</span>
              {!isFinalState && dueDate && (
                <span style={{ color: daysDiff < 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                  {daysDiff < 0 ? `${Math.abs(daysDiff)} dní po splat.` : `${daysDiff} dní do splat.`}
                </span>
              )}
            </DropdownHeader>
            
            {Object.values(INVOICE_STATES).map((state) => {
              const StateIcon = state.icon;
              const isActive = currentStatus === state.id;
              const isCancelled = state.id === 'STORNO';

              return (
                <StatusOption
                  key={state.id}
                  onClick={() => handleOptionClick(state.id)}
                  $active={isActive}
                  $hasBorder={isCancelled}
                >
                  <StatusIconBox $color={state.color.split(';')[0] + '; ' + state.color.split(';')[1]}>
                    <StateIcon size={16} />
                  </StatusIconBox>
                  <StatusOptionContent>
                    <StatusOptionLabel $cancelled={isCancelled}>
                      {state.label}
                    </StatusOptionLabel>
                    <StatusOptionDesc>
                      {state.description}
                    </StatusOptionDesc>
                  </StatusOptionContent>
                  {isActive && <ActiveCheck size={16} />}
                </StatusOption>
              );
            })}
          </DropdownContent>
        </Dropdown>,
        document.body
      )}
    </Container>
  );
};

export default InvoiceStatusSelect;
