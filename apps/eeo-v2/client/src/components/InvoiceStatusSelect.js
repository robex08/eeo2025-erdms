import React, { useState, useRef, useEffect } from 'react';
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
 * @param {Object} props
 * @param {string} props.currentStatus - Aktuální stav faktury (ENUM hodnota)
 * @param {string} props.dueDate - Datum splatnosti (YYYY-MM-DD)
 * @param {boolean} props.isVerified - Zda je potvrzena věcná správnost
 * @param {Function} props.onStatusChange - Callback při změně stavu
 * @param {Function} props.onVerifyToggle - Callback při změně věcné správnosti
 * @param {boolean} props.disabled - Zakázat interakci (read-only)
 */

// Styled components
const Container = styled.div`
  position: relative;
  display: inline-block;
  text-align: left;
  width: 100%;
  max-width: 260px;
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
  font-size: 0.875rem;
  font-weight: 500;
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

const VerifyButton = styled.button`
  padding: 0.25rem;
  border-radius: 9999px;
  transition: colors 0.2s;
  flex-shrink: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  
  color: ${props => props.$verified ? '#16a34a' : '#d1d5db'};
  background-color: ${props => props.$verified ? '#dcfce7' : 'transparent'};
  
  &:hover {
    color: ${props => props.$verified ? '#15803d' : '#22c55e'};
    background-color: ${props => props.$verified ? '#bbf7d0' : '#f9fafb'};
  }
`;

const Dropdown = styled.div`
  position: absolute;
  z-index: 50;
  width: 18rem;
  margin-top: 0.5rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  outline: none;
  animation: fadeIn 0.1s;
  left: 0;
  
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
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.$cancelled ? '#6b7280' : '#111827'};
  text-decoration: ${props => props.$cancelled ? 'line-through' : 'none'};
  margin: 0;
`;

const StatusOptionDesc = styled.p`
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0.125rem 0 0 0;
  line-height: 1.25;
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
  STORNO: {
    id: 'STORNO',
    label: 'Storno',
    description: 'Faktura stažena dodavatelem',
    color: 'background-color: #f1f5f9; color: #94a3b8; border-color: #cbd5e1; text-decoration: line-through;',
    icon: XCircle
  }
};

const InvoiceStatusSelect = ({ 
  currentStatus = 'ZAEVIDOVANA', 
  dueDate, 
  isVerified = false,
  onStatusChange,
  onVerifyToggle,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Získat konfiguraci aktuálního stavu
  const activeStateConfig = INVOICE_STATES[currentStatus] || INVOICE_STATES.ZAEVIDOVANA;
  const isFinalState = ['ZAPLACENO', 'K_ZAPLACENI', 'STORNO'].includes(currentStatus);

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
  const isOverdue = !isFinalState && daysDiff < 0; // Je po splatnosti a není zaplacena/storno

  // Určení vzhledu
  let displayColor = activeStateConfig.color;
  const DisplayIcon = activeStateConfig.icon;
  let displayLabel = activeStateConfig.label;
  let overdueBadge = null;
  let tooltipText = `Stav: ${activeStateConfig.label}`;

  if (dueDate && !isFinalState) {
    if (isOverdue) {
      // PO SPLATNOSTI - zčervenáme
      displayColor = 'background-color: #fef2f2; color: #991b1b; border-color: #fecaca;';
      overdueBadge = `${Math.abs(daysDiff)} d. po`;
      tooltipText += `\nPOZOR: ${Math.abs(daysDiff)} dní po splatnosti!`;
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
    <Container ref={dropdownRef}>
      <ButtonRow>
        <StatusButton
          onClick={handleStatusClick}
          type="button"
          title={tooltipText}
          $color={displayColor}
          $disabled={disabled}
        >
          <ButtonContent>
            <DisplayIcon size={16} style={{ flexShrink: 0, color: isOverdue ? '#991b1b' : 'inherit' }} />
            <ButtonLabel>{displayLabel}</ButtonLabel>
            {overdueBadge && (
              <OverdueBadge>{overdueBadge}</OverdueBadge>
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

        {/* Indikátor věcné správnosti - zobrazit pouze pro stav VECNA_SPRAVNOST */}
        {currentStatus === 'VECNA_SPRAVNOST' && !disabled && (
          <VerifyButton
            onClick={(e) => {
              e.stopPropagation();
              if (onVerifyToggle) {
                onVerifyToggle(!isVerified);
              }
            }}
            title={isVerified ? "Věcně správné - Potvrzeno" : "Kliknutím potvrďte věcnou správnost"}
            $verified={isVerified}
          >
            <CheckCircle size={20} fill={isVerified ? "currentColor" : "none"} />
          </VerifyButton>
        )}
      </ButtonRow>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <Dropdown>
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
        </Dropdown>
      )}
    </Container>
  );
};

export default InvoiceStatusSelect;
