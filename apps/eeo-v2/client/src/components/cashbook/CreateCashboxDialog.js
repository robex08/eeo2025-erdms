import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { X, Save, AlertTriangle, User, Calendar, Hash, Building, Plus, Trash2, ChevronDown, Search } from 'lucide-react';
import cashbookAPI from '../../services/cashbookService';
import { getUsekyList } from '../../services/apiv2Dictionaries';
import { fetchAllUsers } from '../../services/api2auth';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import DatePicker from '../DatePicker';

// ============================================================================
// ANIMACE
// ============================================================================

const slideInUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
  animation: fadeIn 0.15s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: ${slideInUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  letter-spacing: -0.01em;

  svg {
    width: 20px;
    height: 20px;
    opacity: 0.9;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ModalBody = styled.div`
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 0;
  flex: 1;
  overflow: hidden;
`;

const LeftSection = styled.div`
  padding: 2rem;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
`;

const RightSection = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  gap: 1rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 1.25rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    width: 16px;
    height: 16px;
    color: #64748b;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;

  ${props => props.required && `
    &::after {
      content: ' *';
      color: #dc2626;
    }
  `}
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid ${props => props.hasError ? '#ef4444' : '#cbd5e1'};
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.15s;
  background: white;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const ErrorText = styled.div`
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

const HintText = styled.div`
  color: #64748b;
  font-size: 0.75rem;
  margin-top: 0.375rem;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.15s;
  font-family: inherit;
  background: white;
  resize: vertical;
  min-height: 60px;

  &:hover:not(:disabled) {
    border-color: #cbd5e1;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const UsersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem;
  background: ${props => props.isMain ? '#ecfdf5' : 'white'};
  border: 1px solid ${props => props.isMain ? '#10b981' : '#e2e8f0'};
  border-radius: 8px;
  transition: all 0.15s;

  &:hover {
    border-color: ${props => props.isMain ? '#059669' : '#cbd5e1'};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.isMain ?
    'linear-gradient(135deg, #059669 0%, #10b981 100%)' :
    'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 0.125rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MainBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  background: #10b981;
  color: white;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const UserDates = styled.div`
  font-size: 0.75rem;
  color: #64748b;
`;

const UserActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: ${props => props.danger ? '#fee2e2' : '#f1f5f9'};
  color: ${props => props.danger ? '#dc2626' : '#64748b'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: ${props => props.danger ? '#fecaca' : '#e2e8f0'};
    color: ${props => props.danger ? '#b91c1c' : '#475569'};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const AddUserSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
`;

const AddUserForm = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.15s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxGroup = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #475569;
  cursor: pointer;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
    cursor: pointer;
  }
`;

const Button = styled.button`
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.15s;

  &.primary {
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: white;

    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      transform: translateY(-1px);
    }
  }

  &.secondary {
    background: #f1f5f9;
    color: #475569;

    &:hover:not(:disabled) {
      background: #e2e8f0;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ModalFooter = styled.div`
  padding: 1.25rem 2rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
`;

const InfoMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;

  svg {
    width: 16px;
    height: 16px;
    color: #94a3b8;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const EmptyUsersState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #94a3b8;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 0.75rem;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
`;

// SearchableSelect styled components
const SearchableSelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchableSelectButton = styled.div`
  width: 100%;
  padding: 0.625rem 2.25rem 0.625rem ${props => props.$hasIcon ? '2.5rem' : '0.75rem'};
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  background: ${props => props.disabled ? '#f1f5f9' : 'white'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  color: ${props => props.$isEmpty ? '#94a3b8' : '#1e293b'};
  font-weight: ${props => props.$isEmpty ? '400' : '600'};
  display: flex;
  align-items: center;
  gap: 0.625rem;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: #cbd5e1;
  }

  ${props => props.$isOpen && `
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  `}

  .icon {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
  }
`;

const SearchableDropdown = styled.div`
  position: fixed;
  max-height: 280px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 999999;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.5rem;
  border: none;
  font-size: 0.875rem;
  outline: none;

  &::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }

  &:focus {
    background: #f8fafc;
  }
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #475569;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 2.25rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    color: #64748b;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const DropdownOptions = styled.div`
  overflow-y: auto;
  flex: 1;
`;

const DropdownOption = styled.div`
  padding: 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f1f5f9;
  }

  ${props => props.$selected && `
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #1e40af;
    font-weight: 600;
  `}
`;

const NoResults = styled.div`
  padding: 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
`;

const UsekDisplay = styled.div`
  margin-top: 0.625rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #86efac;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.625rem;
`;

const UsekBadge = styled.span`
  padding: 0.25rem 0.5rem;
  background: #059669;
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
`;

const UsekName = styled.span`
  color: #065f46;
  font-size: 0.875rem;
  font-weight: 500;
`;

// SearchableSelect Component
const SearchableSelect = ({ value, onChange, options, placeholder, disabled, icon, searchPlaceholder = "Hledat..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <SearchableSelectWrapper ref={wrapperRef}>
      <SearchableSelectButton
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={disabled}
        $isEmpty={!selectedOption}
        $isOpen={isOpen}
        $hasIcon={!!icon}
      >
        {icon && <span className="icon">{icon}</span>}
        <span style={{ flex: 1 }}>{selectedOption ? selectedOption.label : placeholder}</span>
        {selectedOption && !disabled && (
          <ClearButton onClick={handleClear}>
            <X size={14} />
          </ClearButton>
        )}
        <ChevronDown size={16} style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </SearchableSelectButton>

      {isOpen && ReactDOM.createPortal(
        <SearchableDropdown
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <SearchInputWrapper>
            <Search size={16} />
            <SearchInput
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
            />
            {searchTerm && (
              <SearchClearButton onClick={() => setSearchTerm('')}>
                <X size={14} />
              </SearchClearButton>
            )}
          </SearchInputWrapper>
          <DropdownOptions>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <DropdownOption
                  key={option.value}
                  $selected={option.value === value}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </DropdownOption>
              ))
            ) : (
              <NoResults>Žádné výsledky</NoResults>
            )}
          </DropdownOptions>
        </SearchableDropdown>,
        document.body
      )}
    </SearchableSelectWrapper>
  );
};

// ============================================================================
// KOMPONENTA
// ============================================================================

const CreateCashboxDialog = ({ isOpen, onClose, onSuccess }) => {
  const { userDetail, token, user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  // Stav formuláře
  const [formData, setFormData] = useState({
    cislo_pokladny: '',
    nazev: '',
    kod_pracoviste: '',
    nazev_pracoviste: '',
    ciselna_rada_vpd: '',
    vpd_od_cislo: '1',
    ciselna_rada_ppd: '',
    ppd_od_cislo: '1',
    poznamka: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uzivatele, setUzivatele] = useState([]);
  const [useky, setUseky] = useState([]);
  const [selectedUsek, setSelectedUsek] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Přiřazení uživatelé
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [newUserForm, setNewUserForm] = useState({
    uzivatel_id: '',
    je_zastupce: false,
    platne_od: new Date().toISOString().split('T')[0],
    platne_do: ''
  });

  // Načíst data při otevření
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    } else {
      // Reset při zavření
      setFormData({
        cislo_pokladny: '',
        nazev: '',
        kod_pracoviste: '',
        nazev_pracoviste: '',
        ciselna_rada_vpd: '',
        vpd_od_cislo: '1',
        ciselna_rada_ppd: '',
        ppd_od_cislo: '1',
        poznamka: ''
      });
      setErrors({});
      setSelectedUsek(null);
      setAssignedUsers([]);
      setNewUserForm({
        uzivatel_id: '',
        je_zastupce: false,
        platne_od: new Date().toISOString().split('T')[0],
        platne_do: ''
      });
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    if (!token || !user?.username) return;

    setLoadingData(true);
    try {
      const [usersResult, usekyResult] = await Promise.all([
        fetchAllUsers({
          token: token,
          username: user.username
        }),
        getUsekyList({
          token: token,
          username: user.username,
          show_inactive: false
        })
      ]);

      setUzivatele(usersResult || []);
      setUseky(usekyResult || []);
    } catch (error) {
      showToast('Chyba při načítání dat', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleUsekChange = (usekId) => {
    if (!usekId) {
      setSelectedUsek(null);
      setFormData(prev => ({
        ...prev,
        kod_pracoviste: '',
        nazev_pracoviste: ''
      }));
      return;
    }

    const usek = useky.find(u => String(u.id) === String(usekId));
    setSelectedUsek(usek || null);

    if (usek) {
      setFormData(prev => ({
        ...prev,
        kod_pracoviste: usek.usek_zkr || '',
        nazev_pracoviste: usek.usek_nazev || ''
      }));
    }
  };

  // Přidání uživatele
  const handleAddUser = () => {
    if (!newUserForm.uzivatel_id) {
      showToast('Vyberte uživatele', 'error');
      return;
    }

    const userId = String(newUserForm.uzivatel_id);
    const user = uzivatele.find(u => String(u.id) === userId);

    if (!user) {
      showToast('Uživatel nenalezen', 'error');
      return;
    }

    // Kontrola duplikace
    if (assignedUsers.some(u => String(u.uzivatel_id) === userId)) {
      showToast('Tento uživatel už je přiřazen', 'error');
      return;
    }

    // Pokud přidáváme hlavního (ne zástupce), odebrat hlavní status ostatním
    const jeHlavni = !newUserForm.je_zastupce;
    if (jeHlavni) {
      setAssignedUsers(prev => prev.map(u => ({ ...u, je_hlavni: false })));
    }

    // Jméno může být v různých strukturách: prijmeni+jmeno, nebo cele_jmeno, nebo username
    const userName = user.cele_jmeno ||
                     `${user.prijmeni || ''} ${user.jmeno || ''}`.trim() ||
                     user.username ||
                     'Uživatel';

    const newAssignment = {
      uzivatel_id: parseInt(userId),
      uzivatel_jmeno: userName,
      je_hlavni: jeHlavni,
      platne_od: newUserForm.platne_od,
      platne_do: newUserForm.platne_do || null
    };

    setAssignedUsers(prev => [...prev, newAssignment]);

    // Reset formuláře
    setNewUserForm({
      uzivatel_id: '',
      je_zastupce: false,
      platne_od: new Date().toISOString().split('T')[0],
      platne_do: ''
    });
  };

  const handleRemoveUser = (uzivatel_id) => {
    setAssignedUsers(prev => prev.filter(u => u.uzivatel_id !== uzivatel_id));
  };

  const handleSetMainUser = (uzivatel_id) => {
    setAssignedUsers(prev => prev.map(u => ({
      ...u,
      je_hlavni: u.uzivatel_id === uzivatel_id
    })));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.cislo_pokladny || formData.cislo_pokladny.trim() === '') {
      newErrors.cislo_pokladny = 'Číslo pokladny je povinné';
    }

    if (!formData.nazev || formData.nazev.trim() === '') {
      newErrors.nazev = 'Název je povinný';
    }

    if (!formData.ciselna_rada_vpd || formData.ciselna_rada_vpd.trim() === '') {
      newErrors.ciselna_rada_vpd = 'Číselná řada VPD je povinná';
    }

    if (!formData.vpd_od_cislo || parseInt(formData.vpd_od_cislo) < 1) {
      newErrors.vpd_od_cislo = 'VPD od čísla musí být >= 1';
    }

    if (!formData.ciselna_rada_ppd || formData.ciselna_rada_ppd.trim() === '') {
      newErrors.ciselna_rada_ppd = 'Číselná řada PPD je povinná';
    }

    if (!formData.ppd_od_cislo || parseInt(formData.ppd_od_cislo) < 1) {
      newErrors.ppd_od_cislo = 'PPD od čísla musí být >= 1';
    }

    if (assignedUsers.length === 0) {
      newErrors.users = 'Musíte přiřadit alespoň jednoho uživatele';
      showToast('Přidejte alespoň jednoho uživatele', 'error');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Vytvoření pokladny
      const cashboxData = {
        cislo_pokladny: formData.cislo_pokladny,
        nazev: formData.nazev,
        kod_pracoviste: formData.kod_pracoviste || null,
        nazev_pracoviste: formData.nazev_pracoviste || null,
        ciselna_rada_vpd: formData.ciselna_rada_vpd,
        vpd_od_cislo: parseInt(formData.vpd_od_cislo),
        ciselna_rada_ppd: formData.ciselna_rada_ppd,
        ppd_od_cislo: parseInt(formData.ppd_od_cislo),
        poznamka: formData.poznamka || null
      };

      const createResult = await cashbookAPI.createCashbox(cashboxData);

      if (createResult.status !== 'ok') {
        throw new Error(createResult.message || 'Chyba při vytváření pokladny');
      }

      const pokladnaId = createResult.data?.pokladna_id;
      if (!pokladnaId) {
        throw new Error('Backend nevrátil ID nové pokladny');
      }

      // 2. Přiřazení uživatelů
      for (const user of assignedUsers) {
        const assignmentData = {
          pokladna_id: pokladnaId,
          uzivatel_id: user.uzivatel_id,
          je_hlavni: user.je_hlavni ? 1 : 0,
          platne_od: user.platne_od,
          platne_do: user.platne_do || null,
          poznamka: null
        };

        await cashbookAPI.assignUserToCashbox(assignmentData);
      }

      showToast('✓ Pokladna byla úspěšně vytvořena', 'success');
      onSuccess?.();
      onClose();

    } catch (error) {
      showToast(error.message || 'Chyba při vytváření pokladny', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availableUsers = uzivatele.filter(
    u => !assignedUsers.some(au => au.uzivatel_id === u.id)
  );

  return ReactDOM.createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Plus size={20} />
            Vytvořit novou pokladnu
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={18} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* LEVÁ SEKCE - Informace o pokladně */}
          <LeftSection>
            <SectionTitle>
              <Building size={16} />
              Základní informace
            </SectionTitle>

            <FormGroup>
              <Label required>Číslo pokladny</Label>
              <Input
                type="text"
                value={formData.cislo_pokladny}
                onChange={(e) => handleChange('cislo_pokladny', e.target.value)}
                placeholder="100"
                hasError={!!errors.cislo_pokladny}
                disabled={loading}
              />
              {errors.cislo_pokladny && (
                <ErrorText>
                  <AlertTriangle size={12} />
                  {errors.cislo_pokladny}
                </ErrorText>
              )}
            </FormGroup>

            <FormGroup>
              <Label required>Název pokladny</Label>
              <Input
                type="text"
                value={formData.nazev}
                onChange={(e) => handleChange('nazev', e.target.value)}
                placeholder="Hlavní pokladna"
                hasError={!!errors.nazev}
                disabled={loading}
              />
              {errors.nazev && (
                <ErrorText>
                  <AlertTriangle size={12} />
                  {errors.nazev}
                </ErrorText>
              )}
            </FormGroup>

            <FormGroup>
              <Label>
                <Building size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Úsek (zkratka)
              </Label>
              <SearchableSelect
                value={selectedUsek?.id || ''}
                onChange={(val) => handleUsekChange(val)}
                options={useky.map(usek => ({
                  value: usek.id,
                  label: `${usek.usek_zkr} - ${usek.usek_nazev}`
                }))}
                placeholder="Vyberte úsek..."
                searchPlaceholder="Hledat úsek..."
                disabled={loadingData}
                icon={<Building size={16} />}
              />

              {selectedUsek && (
                <UsekDisplay>
                  <UsekBadge>{selectedUsek.usek_zkr}</UsekBadge>
                  <UsekName>{selectedUsek.usek_nazev}</UsekName>
                </UsekDisplay>
              )}
            </FormGroup>

            <SectionTitle style={{ marginTop: '2rem' }}>
              <Hash size={16} />
              Číselné řady dokladů
            </SectionTitle>

            <FormRow>
              <FormGroup style={{ marginBottom: 0 }}>
                <Label>
                  <Hash size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  VPD prefix *
                </Label>
                <Input
                  type="text"
                  value={formData.ciselna_rada_vpd}
                  onChange={(e) => handleChange('ciselna_rada_vpd', e.target.value)}
                  placeholder="599"
                  hasError={!!errors.ciselna_rada_vpd}
                  disabled={loading}
                />
              </FormGroup>

              <FormGroup style={{ marginBottom: 0 }}>
                <Label>VPD od čísla</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.vpd_od_cislo}
                  onChange={(e) => handleChange('vpd_od_cislo', e.target.value)}
                  placeholder="1"
                  hasError={!!errors.vpd_od_cislo}
                  disabled={loading}
                />
              </FormGroup>
            </FormRow>

            <FormRow>
              <FormGroup style={{ marginBottom: 0 }}>
                <Label>
                  <Hash size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  PPD prefix *
                </Label>
                <Input
                  type="text"
                  value={formData.ciselna_rada_ppd}
                  onChange={(e) => handleChange('ciselna_rada_ppd', e.target.value)}
                  placeholder="499"
                  hasError={!!errors.ciselna_rada_ppd}
                  disabled={loading}
                />
              </FormGroup>

              <FormGroup style={{ marginBottom: 0 }}>
                <Label>PPD od čísla</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.ppd_od_cislo}
                  onChange={(e) => handleChange('ppd_od_cislo', e.target.value)}
                  placeholder="1"
                  hasError={!!errors.ppd_od_cislo}
                  disabled={loading}
                />
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label>Poznámka</Label>
              <Textarea
                value={formData.poznamka}
                onChange={(e) => handleChange('poznamka', e.target.value)}
                placeholder="Volitelná poznámka..."
                rows={2}
                disabled={loading}
              />
            </FormGroup>
          </LeftSection>

          {/* PRAVÁ SEKCE - Přiřazení uživatelé */}
          <RightSection>
            <SectionTitle>
              <User size={16} />
              Přiřazení uživatelé ({assignedUsers.length})
            </SectionTitle>

            {/* Seznam přiřazených uživatelů */}
            <UsersList>
              {assignedUsers.length === 0 ? (
                <EmptyUsersState>
                  <User size={48} />
                  <p>Zatím nejsou přiřazeni žádní uživatelé</p>
                </EmptyUsersState>
              ) : (
                assignedUsers.map(user => (
                  <UserItem key={user.uzivatel_id} isMain={user.je_hlavni}>
                    <UserInfo>
                      <UserAvatar isMain={user.je_hlavni}>
                        {user.uzivatel_jmeno.substring(0, 2).toUpperCase()}
                      </UserAvatar>
                      <UserDetails>
                        <UserName>
                          {user.uzivatel_jmeno}
                          {user.je_hlavni && <MainBadge>Hlavní</MainBadge>}
                        </UserName>
                        <UserDates>
                          {user.platne_od && `Od: ${user.platne_od}`}
                          {user.platne_do && ` | Do: ${user.platne_do}`}
                        </UserDates>
                      </UserDetails>
                    </UserInfo>
                    <UserActions>
                      {!user.je_hlavni && (
                        <IconButton
                          onClick={() => handleSetMainUser(user.uzivatel_id)}
                          title="Nastavit jako hlavního"
                        >
                          <User size={16} />
                        </IconButton>
                      )}
                      <IconButton
                        danger
                        onClick={() => handleRemoveUser(user.uzivatel_id)}
                        title="Odebrat"
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </UserActions>
                  </UserItem>
                ))
              )}
            </UsersList>

            {/* Formulář pro přidání uživatele */}
            <AddUserSection>
              <SectionTitle style={{ margin: 0 }}>
                <Plus size={16} />
                Přidat uživatele
              </SectionTitle>

              <FormGroup>
                <Label>Uživatel</Label>
                <SearchableSelect
                  value={newUserForm.uzivatel_id}
                  onChange={(val) => setNewUserForm(prev => ({ ...prev, uzivatel_id: val }))}
                  options={availableUsers.map(user => ({
                    value: user.id,
                    label: user.cele_jmeno || `${user.prijmeni || ''} ${user.jmeno || ''}`.trim() || user.username
                  }))}
                  placeholder="Vyberte uživatele..."
                  searchPlaceholder="Hledat uživatele..."
                  disabled={loading || loadingData}
                  icon={<User size={16} />}
                />
              </FormGroup>

              <AddUserForm>
                <div>
                  <Label>Platné od</Label>
                  <DatePicker
                    value={newUserForm.platne_od}
                    onChange={(newValue) => setNewUserForm(prev => ({ ...prev, platne_od: newValue }))}
                    placeholder="Vyberte datum"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label>Platné do</Label>
                  <DatePicker
                    value={newUserForm.platne_do}
                    onChange={(newValue) => setNewUserForm(prev => ({ ...prev, platne_do: newValue }))}
                    placeholder="Nevyplnit = navždy"
                    disabled={loading}
                  />
                </div>
              </AddUserForm>

              <CheckboxGroup style={{ marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={newUserForm.je_zastupce}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, je_zastupce: e.target.checked }))}
                  disabled={loading}
                />
                Zástupce (pokud nezaškrtnuto, bude hlavní pokladník)
              </CheckboxGroup>

              <Button
                className="secondary"
                onClick={handleAddUser}
                disabled={loading || !newUserForm.uzivatel_id}
              >
                <Plus size={16} />
                Přidat uživatele
              </Button>
            </AddUserSection>
          </RightSection>
        </ModalBody>

        <ModalFooter>
          <InfoMessage>
            <AlertTriangle size={16} />
            Všechna pole označená * jsou povinná
          </InfoMessage>
          <ButtonGroup>
            <Button className="secondary" onClick={onClose} disabled={loading}>
              <X size={16} />
              Zrušit
            </Button>
            <Button className="primary" onClick={handleSave} disabled={loading || loadingData}>
              <Save size={16} />
              {loading ? 'Vytvářím...' : 'Vytvořit pokladnu'}
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

export default CreateCashboxDialog;
