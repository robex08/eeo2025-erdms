import React, { useState, useEffect, useContext, useMemo } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { AuthContext } from '../../context/AuthContext';
import { useActivity } from '../../context/ActivityContext';
import {
  createUser,
  updateUser,
  fetchUserDetail,
  fetchLokality,
  fetchPozice,
  fetchOrganizace,
  fetchRole,
  fetchRoleDetail,
  fetchPrava,
  fetchUseky
} from '../../services/api2auth';
import { User, Shield, Building, X, Save, AlertCircle, Check, Mail, Phone, Key, MapPin, Briefcase, Award, Search } from 'lucide-react';
import { CustomSelect } from '../CustomSelect';
import PasswordStrengthValidator, { validatePasswordStrength } from '../PasswordStrengthValidator';

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
// STYLED COMPONENTS - PODLE ContactEditDialog.js
// ============================================================================

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 92vh;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  animation: ${slideInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem 0.75rem 1.5rem;
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.05"><circle cx="30" cy="30" r="1"/></g></svg>');
    pointer-events: none;
  }
`;

const ModalHeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
`;

const ModalSubtitle = styled.p`
  margin: 0.375rem 0 0 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8125rem;
  font-weight: 400;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  padding: 0.625rem;
  border-radius: 10px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem 0;
  background: white;
  border-bottom: 2px solid #e2e8f0;
`;

const Tab = styled.button`
  padding: 0.625rem 1.25rem;
  border: none;
  background: ${props => props.$active ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  font-weight: ${props => props.$active ? '600' : '500'};
  font-size: 0.8125rem;
  cursor: pointer;
  border-radius: 10px 10px 0 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;

  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#f1f5f9'};
    color: ${props => props.$active ? 'white' : '#3b82f6'};
  }

  ${props => props.$active && `
    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    }
  `}
`;

const ModalBody = styled.div`
  max-height: calc(92vh - 220px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f8fafc;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const FormSection = styled.div`
  padding: 1.25rem 1.5rem;
  background: white;

  &:not(:last-child) {
    border-bottom: 1px solid #f1f5f9;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 1.25rem; /* row-gap column-gap */

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGrid3Col = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem 1.25rem; /* row-gap column-gap */

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGrid4Col = styled.div`
  display: grid;
  grid-template-columns: 0.7fr 1.5fr 1.5fr 0.8fr; /* Titul před (užší) | Příjmení | Jméno | Titul za (užší) */
  gap: 1rem 1.25rem; /* row-gap column-gap */

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  grid-column: ${props => props.$fullWidth ? 'span 2' : 'span 1'};

  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.8125rem;
  color: #374151;
  margin-bottom: 0.375rem;
  display: block;

  &::after {
    content: ${props => props.required ? '" *"' : '""'};
    color: #dc2626;
    margin-left: 2px;
  }
`;

const Required = styled.span`
  color: #dc2626;
`;

// Wrapper pro input s ikonou
const InputWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg {
    position: absolute;
    left: 0.625rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 15px !important;
    height: 15px !important;
  }
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.625rem 0.625rem 0.625rem 2.25rem' : '0.625rem'};
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  background: ${props => props.hasError ? '#fef2f2' : '#ffffff'};

  /* Zvýrazněné vyplněné hodnoty vs. placeholder - sladěno s CustomSelect */
  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  font-weight: ${props => {
    if (props.disabled) return '400';
    return props.value && props.value !== '' ? '600' : '400';
  }};

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:focus + svg {
    color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  /* Sjednocení placeholder barvy se selecty */
  &::placeholder {
    color: #9ca3af;
    opacity: 1;
    font-weight: 400;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;

  input {
    padding-left: 2.25rem;
    padding-right: ${props => props.hasValue ? '2.25rem' : '0.625rem'};
  }

  .search-icon {
    position: absolute;
    left: 0.625rem;
    color: #9ca3af;
    pointer-events: none;
  }

  .clear-icon {
    position: absolute;
    right: 0.625rem;
    color: #9ca3af;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: #dc2626;
    }
  }
`;

const ErrorText = styled.span`
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid #e5e7eb;
`;

const SectionIcon = styled.div`
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
`;

const SectionTitle = styled.h3`
  margin: 1.5rem 0 0.875rem 0;
  padding-bottom: 0.5rem;
  color: #64748b;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e5e7eb;

  &:first-child {
    margin-top: 0;
  }
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.625rem;
  max-height: 350px;
  overflow-y: auto;
  padding: 0.875rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
`;

// Toggle Switch pro Aktivní checkbox
const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 56px;
  height: 28px;
  cursor: pointer;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    border-radius: 28px;
    transition: all 0.3s ease;

    &::before {
      content: '';
      position: absolute;
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
  }

  input:checked + span {
    background-color: #3b82f6;
  }

  input:checked + span::before {
    transform: translateX(28px);
  }

  input:focus + span {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ToggleLabel = styled.div`
  font-size: 0.8125rem;
  color: ${props => props.$active ? '#16a34a' : '#64748b'};
  font-weight: ${props => props.$active ? '600' : '400'};
  transition: all 0.3s ease;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.625rem;
  background: white;
  border-radius: 8px;
  border: 2px solid ${props => props.$checked ? '#3b82f6' : '#e5e7eb'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin-top: 2px;
  accent-color: #3b82f6;
`;

const CheckboxContent = styled.div`
  flex: 1;
`;

const CheckboxTitle = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 0.8125rem;
  margin-bottom: 0.25rem;
`;

const CheckboxDescription = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
`;

const ModalFooter = styled.div`
  padding: 1.25rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #64748b;
`;

const FooterRight = styled.div`
  display: flex;
  gap: 0.875rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.cancel {
    background: white;
    color: #64748b;
    border: 2px solid #e2e8f0;

    &:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
  }

  &.primary {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    border: 2px solid transparent;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
    }

    &:disabled {
      background: #e2e8f0;
      color: #64748b;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }

  /* 🎯 Success stav po úspěšném uložení */
  &.success {
    background: linear-gradient(135deg, #10b981, #059669) !important;
    color: white;
    border: 2px solid transparent;
    animation: successPulse 0.5s ease-out;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4);
    }
  }

  @keyframes successPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem;
  background: #dcfce7;
  border: 2px solid #86efac;
  border-radius: 8px;
  color: #166534;
  font-weight: 500;
  font-size: 0.8125rem;
  margin-bottom: 0.875rem;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem;
  background: #fee2e2;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  font-weight: 500;
  margin-bottom: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  max-height: 350px;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: #9ca3af;
  font-size: 0.8125rem;
`;

const FilterCheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  background: ${props => props.$checked ? '#eff6ff' : 'white'};
  border: 1px solid ${props => props.$checked ? '#3b82f6' : '#e5e7eb'};

  &:hover {
    background: ${props => props.$checked ? '#dbeafe' : '#f9fafb'};
    border-color: ${props => props.$checked ? '#2563eb' : '#d1d5db'};
  }

  input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #3b82f6;
  }

  span {
    font-weight: ${props => props.$checked ? '600' : '500'};
    color: ${props => props.$checked ? '#1e40af' : '#4b5563'};
  }
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UserManagementModal = ({
  isOpen,
  onClose,
  mode, // 'create' | 'edit'
  userData = null,
  onSuccess,
  addToast
}) => {
  const { token, user, userDetail } = useContext(AuthContext);
  const { triggerActivity } = useActivity();
  const [activeTab, setActiveTab] = useState('detail');
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false); // 🎯 Nový state pro success efekt
  const [isClosing, setIsClosing] = useState(false); // 🔒 Flag pro prevenci duplicitního zavírání
  const [loadingData, setLoadingData] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 🔑 Kontrola oprávnění: Pouze SUPERADMIN a ADMINISTRATOR mohou měnit username
  const canEditUsername = useMemo(() => {
    if (!userDetail || !userDetail.roles) return false;
    return userDetail.roles.some(role =>
      role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
    );
  }, [userDetail]);

  // CustomSelect states
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState(new Set());

  // Helper: Vytvoření hierarchické struktury lokalit (okres -> stanoviště)
  const createHierarchicalLokality = (lokalityData) => {
    if (!Array.isArray(lokalityData) || lokalityData.length === 0) return [];

    const hierarchical = [];

    // Rozdělení na okresy (typ === 'Ředitelství' nebo parent_id === null) a stanoviště
    const okresy = lokalityData.filter(l =>
      l.typ === 'Ředitelství' ||
      !l.parent_id ||
      l.parent_id === null ||
      l.parent_id === ''
    );

    const stanoviste = lokalityData.filter(l =>
      l.typ !== 'Ředitelství' &&
      l.parent_id &&
      l.parent_id !== null &&
      l.parent_id !== ''
    );

    // Řazení okresů podle názvu
    okresy.sort((a, b) => (a.nazev || '').localeCompare(b.nazev || '', 'cs'));

    // Pro každý okres přidáme jej a jeho stanoviště
    okresy.forEach(okres => {
      // Přidat okres jako parent
      hierarchical.push({
        ...okres,
        level: 0,
        isParent: true,
        displayLabel: okres.nazev // Bez odsazení
      });

      // Najít stanoviště tohoto okresu
      const children = stanoviste.filter(s => String(s.parent_id) === String(okres.id));

      // Řazení stanovišť podle názvu
      children.sort((a, b) => (a.nazev || '').localeCompare(b.nazev || '', 'cs'));

      // Přidat stanoviště s odsazením - CSS řeší odsazení pomocí level prop
      children.forEach(child => {
        hierarchical.push({
          ...child,
          level: 1,
          isParent: false,
          parentId: okres.id,
          displayLabel: child.nazev // BEZ odsazení - CSS to udělá
        });
      });
    });

    // Přidat osiřelé stanoviště (pokud nějaké zbudou)
    const processedIds = new Set(hierarchical.map(h => h.id));
    const orphans = lokalityData.filter(l => !processedIds.has(l.id));

    if (orphans.length > 0) {
      // console.warn('⚠️ Osiřelé lokality:', orphans);
      orphans.forEach(orphan => {
        hierarchical.push({
          ...orphan,
          level: 1,
          isParent: false,
          isOrphan: true,
          displayLabel: `⚠️ ${orphan.nazev}`
        });
      });
    }

    return hierarchical;
  };

  // Form data
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    jmeno: '',
    prijmeni: '',
    titul_pred: '',
    titul_za: '',
    email: '',
    telefon: '',
    usek_id: null,
    lokalita_id: null,
    pozice_id: null,
    organizace_id: null,
    aktivni: 1,
    roles: [],
    direct_rights: []
  });

  // Číselníky
  const [lokality, setLokality] = useState([]);
  const [pozice, setPozice] = useState([]);
  const [organizace, setOrganizace] = useState([]);
  const [role, setRole] = useState([]);
  const [prava, setPrava] = useState([]);
  const [useky, setUseky] = useState([]);

  // Filtry pro role a práva
  const [roleFilter, setRoleFilter] = useState('');
  const [pravaFilter, setPravaFilter] = useState('');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false); // 🎯 Checkbox pro zobrazení jen nepřiřazených práv

  // Práva načtená z rolí (pro zobrazení jako disabled/readonly)
  const [rightsFromRoles, setRightsFromRoles] = useState(new Set());

  // Filtrované role podle vyhledávacího filtru
  const filteredRoles = useMemo(() => {
    if (!roleFilter.trim()) return role;
    const search = roleFilter.toLowerCase();
    return role.filter(r =>
      (r.nazev_role || r.nazev || '').toLowerCase().includes(search) ||
      (r.popis || '').toLowerCase().includes(search)
    );
  }, [role, roleFilter]);

  // Filtrovaná práva podle vyhledávacího filtru a checkboxu "Zobrazit jen nepřiřazená"
  const filteredPrava = useMemo(() => {
    let filtered = prava;

    // ✅ Filtr: Zobrazit jen nepřiřazená práva = ta, která NEJSOU checked (zaškrtnutá)
    // Nepřiřazená = práva, která uživatel NEMÁ (nejsou ani z role, ani přímo přiřazená)
    if (showOnlyUnassigned) {
      filtered = filtered.filter(p => {
        const pravoId = Number(p.id); // ❗ Konverze na NUMBER
        const isFromRole = rightsFromRoles.has(pravoId);
        const isDirectlySelected = formData.direct_rights.includes(pravoId);
        const isChecked = isFromRole || isDirectlySelected;
        // Zobrazit pouze NEZAŠKRTNUTÁ práva (uživatel je NEMÁ)
        return !isChecked;
      });
    }

    // 🔍 Filtr podle vyhledávacího pole (aplikuje se AŽ po filtru nepřiřazených)
    if (pravaFilter.trim()) {
      const search = pravaFilter.toLowerCase();
      filtered = filtered.filter(p =>
        (p.popis || '').toLowerCase().includes(search) ||
        (p.kod_prava || '').toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [prava, pravaFilter, showOnlyUnassigned, rightsFromRoles, formData.direct_rights]);

  // Load číselníky
  useEffect(() => {
    if (isOpen && token && user?.username) {
      loadReferenceData();
      // Reset success stavu při otevření dialogu
      setIsSaved(false);
      setIsClosing(false); // 🔒 Reset closing flag
    }
  }, [isOpen, token, user]);

  // Pre-fill data v edit mode - ROVNOU bez čekání na číselníky!
  useEffect(() => {
    // Při edit mode rovnou inicializuj formData z userData (CustomSelect si najde hodnoty sám)
    if (isOpen && mode === 'edit' && userData) {
      // Debug pouze pokud jsou problémy
      // console.log('🔍 UserManagementModal - userData:', userData);

      // EXTRAHUJ ID z různých formátů dat - CustomSelect potřebuje NUMBER pro strict comparison!
      const extractedIds = {
        // Úsek - může být usek_id přímo nebo vnořený objekt usek.id
        usek_id: userData.usek_id || userData.usek?.id || null,

        // Lokalita - může být lokalita_id přímo, vnořený objekt lokalita.id, nebo najdeme podle názvu
        lokalita_id: userData.lokalita_id ||
          userData.lokalita?.id ||
          (userData.lokalita_nazev ?
            lokality.find(l => l.nazev === userData.lokalita_nazev)?.id
            : null) || null,

        // Pozice - může být pozice_id přímo, vnořený objekt pozice.id, nebo najdeme podle názvu
        pozice_id: userData.pozice_id ||
          userData.pozice?.id ||
          (userData.nazev_pozice ?
            pozice.find(p => p.nazev_pozice === userData.nazev_pozice)?.id
            : null) || null,

        // Organizace - může být organizace_id přímo nebo vnořený objekt organizace.id
        organizace_id: userData.organizace_id ||
          userData.organizace?.id ||
          null
      };

      // Zpracuj role - najdi ID podle nazev_role v načtených rolích
      let rolesIds = [];
      if (Array.isArray(userData.roles)) {
        rolesIds = userData.roles.map(r => {
          let id = null;
          if (typeof r === 'object' && r !== null) {
            // Pokud má ID, použij ho
            if (r.id || r.role_id) {
              id = r.id || r.role_id;
            }
            // Jinak najdi v číselníku podle nazev_role nebo kod_role
            else if (r.nazev_role || r.kod_role) {
              const foundRole = role.find(roleItem => 
                roleItem.nazev_role === r.nazev_role || roleItem.kod_role === r.kod_role
              );
              id = foundRole?.id;
            }
          } else {
            // Pokud je číslo/string, použij přímo
            id = r;
          }
          // ❗ KONVERZE NA NUMBER pro strict comparison v checkbox
          return id != null ? Number(id) : null;
        }).filter(x => x != null);
      }
      console.log('🔍 UserManagementModal - Role IDs po mapování:', rolesIds);
      console.log('🔍 UserManagementModal - userData.roles:', userData.roles);

      // Zpracuj práva - najdi ID podle kod_prava v načtených právech
      let rightsIds = [];
      if (Array.isArray(userData.direct_rights)) {
        rightsIds = userData.direct_rights.map(p => {
          let id = null;
          if (typeof p === 'object' && p !== null) {
            // Pokud má ID, použij ho
            if (p.id || p.pravo_id) {
              id = p.id || p.pravo_id;
            }
            // Jinak najdi v číselníku podle kod_prava
            else if (p.kod_prava) {
              const foundRight = prava.find(pravaItem => pravaItem.kod_prava === p.kod_prava);
              id = foundRight?.id;
            }
          } else {
            // Pokud je číslo/string, použij přímo
            id = p;
          }
          // ❗ KONVERZE NA NUMBER pro strict comparison v checkbox
          return id != null ? Number(id) : null;
        }).filter(x => x != null);
      }
      console.log('🔍 UserManagementModal - Rights IDs po mapování:', rightsIds);
      console.log('🔍 UserManagementModal - userData.direct_rights:', userData.direct_rights);

      const newFormData = {
        username: userData.username || '',
        password: '',
        jmeno: userData.jmeno || userData.name || '',
        prijmeni: userData.prijmeni || userData.surname || '',
        titul_pred: userData.titul_pred || '',
        titul_za: userData.titul_za || '',
        email: userData.email || '',
        telefon: userData.telefon || '',
        usek_id: extractedIds.usek_id,
        lokalita_id: extractedIds.lokalita_id,
        pozice_id: extractedIds.pozice_id,
        organizace_id: extractedIds.organizace_id,
        aktivni: userData.aktivni === 'Ano' || userData.aktivni === 1 || userData.aktivni === '1' ? 1 : 0,
        roles: rolesIds,
        direct_rights: rightsIds
      };

      console.log('📝 UserManagementModal - Nastavuji formData:', newFormData);
      console.log('📝 UserManagementModal - formData.roles:', newFormData.roles, 'typy:', newFormData.roles.map(id => typeof id));
      setFormData(newFormData);
      setErrors({});
      setSuccessMessage('');
      setErrorMessage('');
    } else if (isOpen && mode === 'create') {
      setFormData({
        username: '',
        password: '',
        jmeno: '',
        prijmeni: '',
        titul_pred: '',
        titul_za: '',
        email: '',
        telefon: '',
        usek_id: null,
        lokalita_id: null,
        pozice_id: null,
        organizace_id: null,
        aktivni: 1,
        roles: [],
        direct_rights: []
      });
      setErrors({});
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [isOpen, mode, userData]);

  const loadReferenceData = async () => {
    setLoadingData(true);
    try {
      const [
        lokalityData,
        poziceData,
        organizaceData,
        roleData,
        pravaData,
        usekyData
      ] = await Promise.all([
        fetchLokality({ token, username: user.username }),
        fetchPozice({ token, username: user.username }),
        fetchOrganizace({ token, username: user.username }),
        fetchRole({ token, username: user.username }),
        fetchPrava({ token, username: user.username }),
        fetchUseky({ token, username: user.username })
      ]);

      // console.log('📋 Načtené číselníky:', {
      //   lokality: lokalityData?.length,
      //   pozice: poziceData?.length,
      //   organizace: organizaceData?.length,
      //   useky: usekyData?.length,
      //   role: roleData?.length,
      //   prava: pravaData?.length
      // });

      // DEBUG: Zjistit jestli role obsahují práva
      // if (roleData && roleData.length > 0) {
      //   console.log('🔍 První role (kontrola struktury):', roleData[0]);
      //   console.log('🔍 Má role práva?', roleData[0]?.rights ? 'ANO' : 'NE');
      // }

      // Vytvoření hierarchické struktury lokalit (okres -> stanoviště)
      const hierarchicalLokality = createHierarchicalLokality(lokalityData || []);

      // Seřazení rolí abecedně podle názvu
      const sortedRole = (roleData || []).sort((a, b) => {
        const nameA = (a.nazev_role || a.nazev || '').toLowerCase();
        const nameB = (b.nazev_role || b.nazev || '').toLowerCase();
        return nameA.localeCompare(nameB, 'cs');
      });

      // Seřazení práv abecedně podle kódu
      const sortedPrava = (pravaData || []).sort((a, b) => {
        const codeA = (a.kod_prava || a.nazev || '').toLowerCase();
        const codeB = (b.kod_prava || b.nazev || '').toLowerCase();
        return codeA.localeCompare(codeB, 'cs');
      });

      setLokality(hierarchicalLokality);
      setPozice(poziceData || []);
      setOrganizace(organizaceData || []);
      setRole(sortedRole);
      setPrava(sortedPrava);
      setUseky(usekyData || []);
    } catch (error) {
      // console.error('Chyba při načítání číselníků:', error);
      setErrorMessage('Chyba při načítání dat. Zkuste to prosím znovu.');
    } finally {
      setLoadingData(false);
    }
  };

  // CustomSelect helper funkce
  const toggleSelect = (field) => {
    setSelectStates(prev => ({ ...prev, [field]: !prev[field] }));
    if (!selectStates[field]) {
      setSearchStates(prev => ({ ...prev, [field]: '' }));
    }
  };

  const filterOptions = (options, searchTerm, field) => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();

    return options.filter(opt => {
      if (field === 'usek_id') {
        return (opt.usek_nazev?.toLowerCase().includes(term) ||
                opt.usek_zkr?.toLowerCase().includes(term));
      }
      if (field === 'lokalita_id') {
        return opt.nazev?.toLowerCase().includes(term);
      }
      if (field === 'pozice_id') {
        return opt.nazev_pozice?.toLowerCase().includes(term);
      }
      if (field === 'organizace_id') {
        return opt.nazev?.toLowerCase().includes(term);
      }
      return true;
    });
  };

  const getOptionLabel = (option, field) => {
    if (!option) return '';
    if (field === 'usek_id') return `${option.usek_nazev} (${option.usek_zkr})`;
    if (field === 'lokalita_id') {
      // Hierarchické zobrazení - přesně jako OrderForm25
      return option.displayLabel || option.nazev;
    }
    if (field === 'pozice_id') return option.nazev_pozice;
    if (field === 'organizace_id') return option.nazev;
    return '';
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Funkce pro načtení práv ze všech vybraných rolí
  const loadRightsFromRoles = async (roleIds) => {
    if (!roleIds || roleIds.length === 0) {
      // console.log('⚠️ Žádné role k načtení');
      setRightsFromRoles(new Set());
      return;
    }

    // console.log('🔍 Začínám načítat práva pro role:', roleIds);

    try {
      const allRights = new Set();

      // Načíst detail každé role
      for (const roleId of roleIds) {
        // console.log(`📡 Načítám detail role ID: ${roleId}`);
        const roleDetail = await fetchRoleDetail({
          token,
          username: user.username,
          roleId: roleId
        });

        if (roleDetail && roleDetail.prava && Array.isArray(roleDetail.prava)) {
          // console.log(`  ✓ Role ${roleId} má ${roleDetail.prava.length} práv:`, roleDetail.prava.map(p => p.kod_prava));
          roleDetail.prava.forEach(p => {
            if (p.id) {
              allRights.add(Number(p.id)); // ❗ Konverze na NUMBER
            }
          });
        } else {
          // console.log(`  ⚠️ Role ${roleId} nemá práva nebo špatná struktura`);
        }
      }

      // console.log(`✅ Načteno celkem ${allRights.size} unikátních práv z ${roleIds.length} rolí`);
      setRightsFromRoles(allRights);
    } catch (error) {
      setRightsFromRoles(new Set());
    }
  };

  // Při změně rolí přenačíst jejich práva
  useEffect(() => {
    if (isOpen && formData.roles && formData.roles.length > 0 && token && user?.username) {
      // console.log('🔄 Načítám práva pro role:', formData.roles);
      loadRightsFromRoles(formData.roles);
    } else if (isOpen) {
      // console.log('🔄 Žádné role, vynulování práv');
      setRightsFromRoles(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.roles, isOpen, token, user?.username]);

  // Při zavření dialogu vyčistit práva z rolí
  useEffect(() => {
    if (!isOpen) {
      setRightsFromRoles(new Set());
    }
  }, [isOpen]);

  const handleCheckboxChange = (field, id) => {
    // Standardní toggle pro všechna pole
    setFormData(prev => {
      const current = prev[field] || [];
      const isChecked = current.includes(id);

      return {
        ...prev,
        [field]: isChecked
          ? current.filter(x => x !== id)
          : [...current, id]
      };
    });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'Username musí mít alespoň 3 znaky';
    }

    if (formData.username && !/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      newErrors.username = 'Username může obsahovat pouze písmena, číslice, tečky, pomlčky a podtržítka';
    }

    // Validace hesla pro CREATE režim
    if (mode === 'create') {
      if (!formData.password) {
        newErrors.password = 'Heslo je povinné';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Heslo musí mít alespoň 8 znaků';
      } else if (!validatePasswordStrength(formData.password)) {
        newErrors.password = 'Heslo musí obsahovat alespoň 8 znaků, malé a velké písmeno, číslo a speciální znak';
      }
    }

    // Validace hesla pro EDIT režim (pouze pokud je zadáno)
    if (mode === 'edit' && formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'Heslo musí mít alespoň 8 znaků';
      } else if (!validatePasswordStrength(formData.password)) {
        newErrors.password = 'Heslo musí obsahovat alespoň 8 znaků, malé a velké písmeno, číslo a speciální znak';
      }
    }

    if (!formData.jmeno || !formData.jmeno.trim()) {
      newErrors.jmeno = 'Jméno je povinné';
    }

    if (!formData.prijmeni || !formData.prijmeni.trim()) {
      newErrors.prijmeni = 'Příjmení je povinné';
    }

    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email je povinný';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Neplatný formát emailu';
    }

    if (!formData.telefon || !formData.telefon.trim()) {
      newErrors.telefon = 'Telefon je povinný';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🔒 Prevence Enter key submit - zabrání nechtěnému submitování formuláře
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleSubmit = async () => {
    // 🔒 Prevence duplicitního submitu
    if (loading || isClosing) {
      return;
    }

    // Resetovat zprávy
    setSuccessMessage('');
    setErrorMessage('');

    // Validace
    if (!validate()) {
      setErrorMessage('Opravte prosím chyby ve formuláři');
      setActiveTab('detail');
      return;
    }

    // Nastavit loading stav - tlačítko zobrazí "Ukládám..."
    setLoading(true);

    try {
      // Připravit payload - data upravovaného/vytvářeného uživatele
      const userData_payload = {
        jmeno: formData.jmeno,
        prijmeni: formData.prijmeni,
        titul_pred: formData.titul_pred?.trim() || '',  // Prázdný string zůstane prázdný string
        titul_za: formData.titul_za?.trim() || '',      // Prázdný string zůstane prázdný string
        email: formData.email || null,
        telefon: formData.telefon || null,
        usek_id: formData.usek_id || null,
        lokalita_id: formData.lokalita_id || null,
        pozice_id: formData.pozice_id || null,
        organizace_id: formData.organizace_id || null,
        aktivni: formData.aktivni,
        roles: formData.roles,
        direct_rights: formData.direct_rights
      };

      let result;

      if (mode === 'create') {
        // Pro CREATE: username je přímo v payloadu (nový uživatel)
        const createPayload = {
          token,
          username: user.username, // Requestor (kdo vytváří)
          new_username: formData.username, // Nový username vytvářeného uživatele
          password: formData.password,
          ...userData_payload
        };

        result = await createUser(createPayload);
        const newUserName = `${formData.prijmeni || ''} ${formData.jmeno || ''}`.trim() || formData.username;
        setSuccessMessage(`Uživatel ${newUserName} byl úspěšně vytvořen`);
        if (addToast) addToast(`✓ Nový uživatel ${newUserName} (${formData.username}) byl úspěšně vytvořen a uložen do databáze`, { type: 'success' });
      } else {
        // Pro UPDATE: username je requestor, new_username je upravovaný
        const updatePayload = {
          id: parseInt(userData.id), // ID upravovaného uživatele (MUSÍ být number!)
          token,
          username: user.username, // Requestor (kdo provádí úpravu)
          ...userData_payload,
          password: formData.password || null // Heslo pouze pokud se mění
        };

        // 🔑 Přidat new_username POUZE pokud:
        // 1. Se username změnil (formData.username !== userData.username)
        // 2. A uživatel má oprávnění (canEditUsername)
        const originalUsername = userData.username;
        const hasUsernameChanged = formData.username !== originalUsername;

        if (hasUsernameChanged && canEditUsername) {
          updatePayload.new_username = formData.username;
        } else if (hasUsernameChanged && !canEditUsername) {
          // Varování: username se změnil, ale uživatel nemá oprávnění
          if (addToast) addToast('Nemáte oprávnění ke změně username', { type: 'warning' });
          // Neposílat new_username, použít původní
        }

        result = await updateUser(updatePayload);
        const updatedUserName = `${formData.prijmeni || ''} ${formData.jmeno || ''}`.trim() || formData.username;

        // Zpracování response - pokud backend vrátil informaci o změně username
        let successMsg = `Uživatel ${updatedUserName} byl úspěšně aktualizován`;
        if (result.data?.username_changed && result.data?.old_username && result.data?.new_username) {
          successMsg += ` (username změněn: ${result.data.old_username} → ${result.data.new_username})`;
        }

        setSuccessMessage(successMsg);
        if (addToast) {
          if (result.data?.username_changed) {
            addToast(`✓ ${successMsg}`, { type: 'success' });
          } else {
            addToast(`✓ Změny uživatele ${updatedUserName} (${formData.username}) byly úspěšně uloženy do databáze`, { type: 'success' });
          }
        }
      }

      // Trigger activity update after successful save
      triggerActivity();

      // ✅ ÚSPĚCH - Nastavit success stav na tlačítku
      setIsSaved(true);

      // 🔒 Nastavit flag zavírání - zabrání duplicitnímu close
      if (isClosing) {
        return;
      }
      setIsClosing(true);

      // 🎯 DŮLEŽITÉ: onSuccess se volá AŽ PO zavření dialogu
      // Jinak parent spustí refresh během zavírání → dialog blikne
      const successData = result.data; // Uchovat data

      // ✨ Rychlá animace - uživatel vidí zelenou success animaci na tlačítku
      // Počkat 1.5 sekundy pro zobrazení success animace, pak zavřít
      setTimeout(() => {
        onClose();

        // 🔄 Okamžitě po zavření spustit reload dat na pozadí v parentu
        // Callback onSuccess - až AFTER close, aby se zabránilo re-renderu během zavírání
        if (onSuccess) {
          // setTimeout zajistí, že se zavolá až po úplném zavření
          setTimeout(() => {
            onSuccess(successData);
          }, 100); // Krátká pauza pro jistotu, že modal je unmounted
        }
      }, 1500); // ⏱️ 1.5 sekundy - rychlá success animace, pak okamžitý reload na pozadí

    } catch (error) {
      // ❌ CHYBA - Dialog NEZAVÍRAT, zobrazit chybu

      // Sestavit detailní chybovou zprávu
      let errorDetails = error.message || 'Chyba při ukládání uživatele';

      // Přidat raw response pokud existuje
      if (error.response) {
        errorDetails += `\n\n📡 Backend Response:\n${JSON.stringify(error.response, null, 2)}`;
      } else if (error.data) {
        errorDetails += `\n\n📡 Error Data:\n${JSON.stringify(error.data, null, 2)}`;
      }

      // Přidat status code
      if (error.status) {
        errorDetails += `\n\n🔴 HTTP Status: ${error.status}`;
      }

      setErrorMessage(errorDetails);
      if (addToast) addToast(`✗ ${error.message || 'Chyba při ukládání uživatele do databáze'}`, { type: 'error' });

      // Dialog ZŮSTÁVÁ OTEVŘENÝ - uživatel může opravit chyby

    } finally {
      // Vypnout loading stav (tlačítko zpět na "Uložit změny")
      // ALE POUZE pokud se dialog NEzavírá (při chybě)
      if (!isClosing) {
        setLoading(false);
      }
    }
  };

  // 🔒 KRITICKÉ: Dialog zůstává viditelný i když isClosing=true!
  // Zabrání pouze OPĚTOVNÉMU otevření po zavření
  // Uživatel MUSÍ vidět success animaci po dobu 2 sekund
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalOverlay>
      <ModalContainer
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <ModalHeader>
          <ModalHeaderContent>
            <HeaderLeft>
              <ModalTitle>
                {mode === 'create' ? 'Přidat nového uživatele' : 'Upravit uživatele'}
              </ModalTitle>
              <ModalSubtitle>
                {mode === 'create'
                  ? 'Vyplňte základní údaje uživatele'
                  : `Aktualizujte informace o uživateli ${[userData?.titul_pred, userData?.jmeno, userData?.prijmeni, userData?.titul_za].filter(Boolean).join(' ')}`
                }
              </ModalSubtitle>
            </HeaderLeft>
            <CloseButton onClick={onClose} disabled={loading}>
              <X size={20} />
            </CloseButton>
          </ModalHeaderContent>
        </ModalHeader>

        <TabsContainer>
          <Tab $active={activeTab === 'detail'} onClick={() => setActiveTab('detail')}>
            <User size={16} />
            Detail uživatele
          </Tab>
          <Tab $active={activeTab === 'roles'} onClick={() => setActiveTab('roles')}>
            <Shield size={16} />
            Role ({formData.roles.length})
          </Tab>
          <Tab $active={activeTab === 'rights'} onClick={() => setActiveTab('rights')}>
            <Shield size={16} />
            Přímá práva ({formData.direct_rights.length}/{rightsFromRoles.size})
          </Tab>
          <Tab $active={activeTab === 'organization'} onClick={() => setActiveTab('organization')}>
            <Building size={16} />
            Organizace
          </Tab>
        </TabsContainer>

        <ModalBody>
          {successMessage && (
            <SuccessMessage>
              <Check size={20} />
              {successMessage}
            </SuccessMessage>
          )}

          {errorMessage && (
            <ErrorMessage>
              <div style={{ flexShrink: 0 }}>
                <AlertCircle size={20} />
              </div>
              <div style={{ flex: 1 }}>{errorMessage}</div>
            </ErrorMessage>
          )}

          {loadingData ? (
            <EmptyState>
              <LoadingSpinner />
              <div style={{ marginTop: '1rem' }}>Načítání dat...</div>
            </EmptyState>
          ) : (
            <>
              {/* TAB: Detail uživatele */}
              {activeTab === 'detail' && (
                <FormSection>
                  <SectionTitle>Přihlašovací údaje</SectionTitle>
                  <FormGrid3Col>
                    <FormGroup>
                      <Label required>
                        Username
                        {mode === 'edit' && !canEditUsername && (
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 400 }}>
                            {' '}(změna pouze pro SUPERADMIN/ADMINISTRATOR)
                          </span>
                        )}
                      </Label>
                      <InputWithIcon>
                        <User size={16} />
                        <Input
                          hasIcon
                          value={formData.username}
                          onChange={(e) => handleChange('username', e.target.value)}
                          disabled={mode === 'edit' && !canEditUsername}
                          placeholder="novak.jan"
                          hasError={!!errors.username}
                        />
                      </InputWithIcon>
                      {errors.username && <ErrorText><AlertCircle size={12} />{errors.username}</ErrorText>}
                    </FormGroup>

                    <FormGroup>
                      <Label required={mode === 'create'}>
                        Heslo
                        {mode === 'edit' && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400 }}> (ponechat prázdné)</span>}
                      </Label>
                      <InputWithIcon>
                        <Key size={16} />
                        <Input
                          hasIcon
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          placeholder={mode === 'edit' ? 'Nové heslo (volitelné)' : 'Heslo'}
                          autoComplete="new-password"
                          hasError={!!errors.password}
                        />
                      </InputWithIcon>
                      {errors.password && <ErrorText><AlertCircle size={12} />{errors.password}</ErrorText>}
                      {formData.password && (
                        <PasswordStrengthValidator
                          password={formData.password}
                          showRequirements={true}
                        />
                      )}
                    </FormGroup>

                    <FormGroup>
                      <Label>Aktivní</Label>
                      <ToggleContainer>
                        <ToggleSwitch>
                          <input
                            type="checkbox"
                            checked={formData.aktivni === 1}
                            onChange={(e) => handleChange('aktivni', e.target.checked ? 1 : 0)}
                          />
                          <span></span>
                        </ToggleSwitch>
                        <ToggleLabel $active={formData.aktivni === 1}>
                          {formData.aktivni === 1 ? 'Aktivní' : 'Neaktivní'}
                        </ToggleLabel>
                      </ToggleContainer>
                    </FormGroup>
                  </FormGrid3Col>

                  <SectionTitle>Osobní údaje</SectionTitle>
                  <FormGrid4Col>
                    <FormGroup>
                      <Label>Titul před</Label>
                      <InputWithIcon>
                        <Award size={16} />
                        <Input
                          hasIcon
                          value={formData.titul_pred}
                          onChange={(e) => handleChange('titul_pred', e.target.value)}
                          placeholder="Ing."
                        />
                      </InputWithIcon>
                    </FormGroup>

                    <FormGroup>
                      <Label required>Příjmení</Label>
                      <InputWithIcon>
                        <User size={16} />
                        <Input
                          hasIcon
                          value={formData.prijmeni}
                          onChange={(e) => handleChange('prijmeni', e.target.value)}
                          placeholder="Novák"
                          hasError={!!errors.prijmeni}
                        />
                      </InputWithIcon>
                      {errors.prijmeni && <ErrorText><AlertCircle size={12} />{errors.prijmeni}</ErrorText>}
                    </FormGroup>

                    <FormGroup>
                      <Label required>Jméno</Label>
                      <InputWithIcon>
                        <User size={16} />
                        <Input
                          hasIcon
                          value={formData.jmeno}
                          onChange={(e) => handleChange('jmeno', e.target.value)}
                          placeholder="Jan"
                          hasError={!!errors.jmeno}
                        />
                      </InputWithIcon>
                      {errors.jmeno && <ErrorText><AlertCircle size={12} />{errors.jmeno}</ErrorText>}
                    </FormGroup>

                    <FormGroup>
                      <Label>Titul za</Label>
                      <InputWithIcon>
                        <Award size={16} />
                        <Input
                          hasIcon
                          value={formData.titul_za}
                          onChange={(e) => handleChange('titul_za', e.target.value)}
                          placeholder="Ph.D."
                        />
                      </InputWithIcon>
                    </FormGroup>
                  </FormGrid4Col>

                  <FormGrid style={{ marginTop: '1rem' }}>
                    <FormGroup>
                      <Label required>Email</Label>
                      <InputWithIcon>
                        <Mail size={16} />
                        <Input
                          hasIcon
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="jan.novak@example.com"
                          hasError={!!errors.email}
                        />
                      </InputWithIcon>
                      {errors.email && <ErrorText><AlertCircle size={12} />{errors.email}</ErrorText>}
                    </FormGroup>

                    <FormGroup>
                      <Label required>Telefon</Label>
                      <InputWithIcon>
                        <Phone size={16} />
                        <Input
                          hasIcon
                          value={formData.telefon}
                          onChange={(e) => handleChange('telefon', e.target.value)}
                          placeholder="+420 123 456 789"
                          hasError={!!errors.telefon}
                        />
                      </InputWithIcon>
                      {errors.telefon && <ErrorText><AlertCircle size={12} />{errors.telefon}</ErrorText>}
                    </FormGroup>
                  </FormGrid>
                </FormSection>
              )}

              {/* TAB: Role */}
              {activeTab === 'roles' && (
                <FormSection>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <SectionTitle style={{ marginBottom: 0 }}>
                      Přiřazené role
                      <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#9ca3af', marginLeft: '0.5rem' }}>
                        ({formData.roles.length} vybráno{filteredRoles.length !== role.length ? `, zobrazeno ${filteredRoles.length}` : ''})
                      </span>
                    </SectionTitle>
                    <SearchInputWrapper hasValue={!!roleFilter}>
                      <Search size={16} className="search-icon" />
                      <Input
                        type="text"
                        placeholder="Vyhledat roli..."
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{ width: '290px' }}
                      />
                      {roleFilter && (
                        <X
                          size={16}
                          className="clear-icon"
                          onClick={() => setRoleFilter('')}
                        />
                      )}
                    </SearchInputWrapper>
                  </div>
                  {role.length === 0 ? (
                    <EmptyState>Žádné role k dispozici</EmptyState>
                  ) : filteredRoles.length === 0 ? (
                    <EmptyState>Žádné role nenalezeny</EmptyState>
                  ) : (
                    <CheckboxGrid>
                      {filteredRoles.map(r => {
                        const roleId = Number(r.id); // ❗ Konverze na NUMBER
                        const isChecked = formData.roles.includes(roleId);
                        return (
                        <CheckboxLabel
                          key={r.id}
                          $checked={isChecked}
                        >
                          <Checkbox
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange('roles', roleId)}
                          />
                          <CheckboxContent>
                            <CheckboxTitle>{r.nazev_role || r.nazev}</CheckboxTitle>
                            {r.popis && <CheckboxDescription>{r.popis}</CheckboxDescription>}
                          </CheckboxContent>
                        </CheckboxLabel>
                        );
                      })}
                    </CheckboxGrid>
                  )}
                </FormSection>
              )}

              {/* TAB: Přímá práva */}
              {activeTab === 'rights' && (
                <FormSection>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <SectionTitle style={{ marginBottom: 0 }}>
                      Přímá práva uživatele
                      <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#9ca3af', marginLeft: '0.5rem' }}>
                        ({formData.direct_rights.length}/{rightsFromRoles.size}/{filteredPrava.length})
                      </span>
                    </SectionTitle>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {/* Checkbox pro filtr nepřiřazených práv */}
                      <FilterCheckboxLabel
                        $checked={showOnlyUnassigned}
                        title="Zobrazit pouze práva, která uživatel NEMÁ (nejsou zaškrtnutá)"
                      >
                        <input
                          type="checkbox"
                          checked={showOnlyUnassigned}
                          onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
                        />
                        <span>Jen nepřiřazená</span>
                      </FilterCheckboxLabel>

                      {/* Vyhledávací pole */}
                      <SearchInputWrapper hasValue={!!pravaFilter}>
                        <Search size={16} className="search-icon" />
                        <Input
                          type="text"
                          placeholder="Vyhledat právo..."
                          value={pravaFilter}
                          onChange={(e) => setPravaFilter(e.target.value)}
                          style={{ width: '290px' }}
                        />
                        {pravaFilter && (
                          <X
                            size={16}
                            className="clear-icon"
                            onClick={() => setPravaFilter('')}
                          />
                        )}
                      </SearchInputWrapper>
                    </div>
                  </div>
                  {prava.length === 0 ? (
                    <EmptyState>Žádná práva k dispozici</EmptyState>
                  ) : filteredPrava.length === 0 ? (
                    <EmptyState>Žádná práva nenalezena</EmptyState>
                  ) : (
                    <CheckboxGrid>
                      {filteredPrava.map(p => {
                        const pravoId = Number(p.id); // ❗ Konverze na NUMBER
                        const isFromRole = rightsFromRoles.has(pravoId);
                        const isDirectlySelected = formData.direct_rights.includes(pravoId);
                        const isChecked = isFromRole || isDirectlySelected;

                        return (
                          <CheckboxLabel
                            key={p.id}
                            $checked={isChecked}
                            style={{
                              opacity: isFromRole && !isDirectlySelected ? 0.7 : 1,
                              background: isFromRole && !isDirectlySelected ? '#f0f9ff' : undefined
                            }}
                          >
                            <Checkbox
                              type="checkbox"
                              checked={isChecked}
                              disabled={isFromRole && !isDirectlySelected}
                              onChange={() => handleCheckboxChange('direct_rights', pravoId)}
                              style={{ cursor: isFromRole && !isDirectlySelected ? 'not-allowed' : 'pointer' }}
                            />
                            <CheckboxContent>
                              <CheckboxTitle style={{ fontFamily: 'monospace' }}>
                                {p.kod_prava || p.nazev}
                                {isFromRole && !isDirectlySelected && (
                                  <span style={{
                                    marginLeft: '0.5rem',
                                    fontSize: '0.75rem',
                                    color: '#0284c7',
                                    fontWeight: 600
                                  }}>
                                    (z role)
                                  </span>
                                )}
                              </CheckboxTitle>
                              {p.popis && <CheckboxDescription>{p.popis}</CheckboxDescription>}
                            </CheckboxContent>
                          </CheckboxLabel>
                        );
                      })}
                    </CheckboxGrid>
                  )}
                </FormSection>
              )}

              {/* TAB: Organizace */}
              {activeTab === 'organization' && (
                <FormSection>
                  <SectionTitle>Organizační zařazení</SectionTitle>
                  <FormGrid>
                    <FormGroup>
                      <Label>Úsek</Label>
                      <CustomSelect
                        icon={<Building size={16} />}
                        value={formData.usek_id || ''}
                        onChange={(e) => handleChange('usek_id', e.target.value || '')}
                        options={useky}
                        placeholder="-- Vyberte úsek --"
                        field="usek_id"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Lokalita</Label>
                      <CustomSelect
                        icon={<MapPin size={16} />}
                        value={formData.lokalita_id || ''}
                        onChange={(e) => handleChange('lokalita_id', e.target.value || '')}
                        options={lokality}
                        placeholder="-- Vyberte lokalitu --"
                        field="lokalita_id"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Pozice</Label>
                      <CustomSelect
                        icon={<Briefcase size={16} />}
                        value={formData.pozice_id || ''}
                        onChange={(e) => handleChange('pozice_id', e.target.value || '')}
                        options={pozice}
                        placeholder="-- Vyberte pozici --"
                        field="pozice_id"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                    </FormGroup>

                    <FormGroup style={{ gridColumn: '1 / -1' }}>
                      <Label>Organizace</Label>
                      <CustomSelect
                        icon={<Building size={16} />}
                        value={formData.organizace_id || ''}
                        onChange={(e) => handleChange('organizace_id', e.target.value || '')}
                        options={organizace}
                        placeholder="-- Vyberte organizaci --"
                        field="organizace_id"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                    </FormGroup>
                  </FormGrid>
                </FormSection>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <FooterLeft>
            {/* Placeholder pro levou stranu footer */}
          </FooterLeft>
          <FooterRight>
            <Button
              type="button"
              className="cancel"
              onClick={onClose}
              disabled={loading}
            >
              <X size={16} />
              Zrušit
            </Button>
            <Button
              type="button"
              className={isSaved ? 'success' : 'primary'}
              onClick={handleSubmit}
              disabled={loading || loadingData || isSaved}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  Ukládám...
                </>
              ) : isSaved ? (
                <>
                  <Check size={16} />
                  Uloženo
                </>
              ) : (
                <>
                  <Save size={16} />
                  {mode === 'create' ? 'Vytvořit uživatele' : 'Uložit změny'}
                </>
              )}
            </Button>
          </FooterRight>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>,
    document.body
  );
};

export default UserManagementModal;
