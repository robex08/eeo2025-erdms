/**
 * SmlouvyFormModal - Formulář pro vytvoření/editaci smlouvy
 * 
 * Funkce:
 * - Validace všech polí
 * - Auto-výpočet DPH
 * - ARES popup dialog podle OrderForm25
 * - Ikona ARES uvnitř IČO input boxu
 * - Persistentní zvýraznění polí podle hodnot
 * - User audit trail
 * 
 * @author Frontend Team  
 * @date 2025-12-28
 */

import React, { useState, useContext, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faSpinner, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Calculator } from 'lucide-react';

import AuthContext from '../../../context/AuthContext';
import {
  createSmlouva,
  updateSmlouva,
  getDruhySmluv,
  DRUH_SMLOUVY_OPTIONS_FALLBACK,
  STAV_SMLOUVY_OPTIONS,
  SAZBA_DPH_OPTIONS
} from '../../../services/apiSmlouvy';
import DatePicker from '../../DatePicker';

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const Overlay = styled.div`
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
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
`;

const ModalTitle = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ModalBody = styled.div`
  padding: 2rem;
`;

const Form = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  ${props => props.$fullWidth ? 'grid-column: span 2;' : ''}
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  
  &.required::after {
    content: ' *';
    color: #ef4444;
  }
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.$error ? '#ef4444' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: ${props => props.value && props.value !== '' ? '600' : '400'};
  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.$error ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &::placeholder {
    color: #9ca3af;
  }

  &:read-only {
    background: #f9fafb;
    color: #6b7280;
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.$error ? '#ef4444' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  font-weight: ${props => props.value && props.value !== '' ? '600' : '400'};
  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.$error ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  option {
    padding: 0.5rem;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.$error ? '#ef4444' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  font-weight: ${props => props.value && props.value !== '' ? '600' : '400'};
  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.$error ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const ErrorText = styled.span`
  color: #ef4444;
  font-size: 0.75rem;
  font-weight: 500;
`;

const SectionHeader = styled.div`
  margin: 2rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
  
  h3 {
    margin: 0;
    color: #1f2937;
    font-size: 1.125rem;
    font-weight: 600;
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
  }

  input:checked + .slider {
    background-color: #3b82f6;
  }

  input:checked + .slider:before {
    transform: translateX(26px);
  }

  .slider.round {
    border-radius: 24px;
  }

  .slider.round:before {
    border-radius: 50%;
  }
`;

const ThreeColumnRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
`;

const TwoColumnRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const InnerFormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InfoText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
  margin-top: 0.25rem;
`;

const ToggleSection = styled.div`
  margin: 1.5rem 0;
`;

const SectionTitle = styled.h3`
  margin: 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const OptionalFields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1.5rem;
  border: 2px solid #e0f2fe;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f7fa 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

// Currency Input Components
const CurrencyInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InputWithIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CalculatorIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 1rem;
  z-index: 1;

  &::before {
    content: '🔢';
  }
`;

const CurrencySymbol = styled.div`
  position: absolute;
  right: 12px;
  color: ${props => props.disabled ? '#9ca3af' : '#374151'};
  font-weight: 600;
  font-size: 0.875rem;
  pointer-events: none;
  user-select: none;
`;

const StyledCurrencyInput = styled.input`
  width: 100%;
  padding: 0.75rem 45px 0.75rem 2.5rem;
  border: 2px solid ${props => props.$error ? '#ef4444' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: ${props => props.value && props.value !== '' ? '600' : '400'};
  color: ${props => props.value && props.value !== '' ? '#1f2937' : '#6b7280'};
  text-align: right;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.$error ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }
`;

// ARES styled components podle OrderForm25
const AresSearchIcon = styled.div`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #059669;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  z-index: 2;

  &:hover {
    background-color: #f0fdf4;
    color: #047857;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

// ARES Popup Styled Components podle OrderForm25
const AresPopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  padding: 1rem;
`;

const AresPopupModal = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
`;

const AresPopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
`;

const AresPopupTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    color: #059669;
  }
`;

const AresPopupCloseButton = styled.button`
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 0.5rem;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f3f4f6;
    color: #374151;
  }
`;

const AresPopupContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const AresSearchInputField = styled.input`
  width: 100%;
  padding: 1rem 1.5rem;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  font-size: 1rem;
  outline: none;
  background: #f9fafb;
  
  &::placeholder {
    color: #9ca3af;
  }
  
  &:focus {
    background: white;
  }
`;

const AresList = styled.div`
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
`;

const AresItem = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
`;

const AresItemContent = styled.div`
  margin-bottom: 1rem;
`;

const AresItemButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const AresActionButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${props => props.primary ? `
    background: #3b82f6;
    color: white;
    border: 1px solid #3b82f6;
    
    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
  ` : `
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    
    &:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AresLoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  
  svg {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid transparent;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;

  &:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #374151;
  border-color: #d1d5db;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
`;

// =============================================================================
// CURRENCY INPUT COMPONENT
// =============================================================================

const CurrencyInput = ({ 
  fieldName, 
  value, 
  onChange, 
  onBlur, 
  disabled = false, 
  hasError = false, 
  placeholder = ''
}) => {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number to Czech format: "1 234,56"
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '';
    
    return num.toLocaleString('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Initialize from props value
  useEffect(() => {
    setLocalValue(formatCurrency(value));
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Allow only digits, spaces, commas, periods, and minus
    if (!/^[0-9\s,.,-]*$/.test(inputValue)) {
      return;
    }
    
    setLocalValue(inputValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlurLocal = () => {
    setIsFocused(false);
    
    // Format the value when losing focus
    const cleanValue = localValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    
    let finalValue = '';
    if (!isNaN(numValue)) {
      finalValue = numValue.toFixed(2);
      const formatted = formatCurrency(finalValue);
      setLocalValue(formatted);
    } else {
      setLocalValue('');
    }
    
    // Clean value before sending to onBlur
    const finalCleanValue = isNaN(numValue) ? '' : numValue.toFixed(2);
    
    if (onBlur) {
      onBlur(fieldName, finalCleanValue);
    }
  };

  return (
    <CurrencyInputWrapper>
      <InputWithIcon>
        <CalculatorIcon />
        <StyledCurrencyInput
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlurLocal}
          disabled={disabled}
          $error={hasError}
          placeholder={placeholder}
        />
        <CurrencySymbol disabled={disabled}>Kč</CurrencySymbol>
      </InputWithIcon>
    </CurrencyInputWrapper>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SmlouvyFormModal = ({ smlouva, useky, onClose }) => {
  const { user, token } = useContext(AuthContext);
  const isEdit = !!smlouva;

  // Form state
  const [formData, setFormData] = useState({
    cislo_smlouvy: smlouva?.cislo_smlouvy || '',
    usek_id: smlouva?.usek_id || '',
    druh_smlouvy: smlouva?.druh_smlouvy || 'SLUZBY',
    nazev_firmy: smlouva?.nazev_firmy || '',
    ico: smlouva?.ico || '',
    dic: smlouva?.dic || '',
    nazev_smlouvy: smlouva?.nazev_smlouvy || '',
    popis_smlouvy: smlouva?.popis_smlouvy || '',
    platnost_od: smlouva?.platnost_od?.substring(0, 10) || '',
    platnost_do: smlouva?.platnost_do?.substring(0, 10) || '',
    hodnota_bez_dph: smlouva?.hodnota_bez_dph || '',
    hodnota_s_dph: smlouva?.hodnota_s_dph || '',
    sazba_dph: smlouva?.sazba_dph || 21,
    aktivni: smlouva?.aktivni !== undefined ? smlouva.aktivni : 1,
    stav: smlouva?.stav || 'AKTIVNI',
    poznamka: smlouva?.poznamka || '',
    cislo_dms: smlouva?.cislo_dms || '',
    kategorie: smlouva?.kategorie || ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [druhySmluv, setDruhySmluv] = useState(DRUH_SMLOUVY_OPTIONS_FALLBACK);
  const [loadingDruhy, setLoadingDruhy] = useState(true);
  const [aresState, setAresState] = useState({
    popupOpen: false,
    search: '',
    results: [],
    loading: false
  });

  // ARES state helpers
  const aresPopupOpen = aresState.popupOpen;
  const setAresPopupOpen = (val) => setAresState(s => ({...s, popupOpen: val}));
  const aresSearch = aresState.search;
  const setAresSearch = (val) => setAresState(s => ({...s, search: val}));
  const aresResults = aresState.results;
  const setAresResults = (val) => setAresState(s => ({...s, results: val}));
  const aresLoading = aresState.loading;
  const setAresLoading = (val) => setAresState(s => ({...s, loading: val}));

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    const fetchDruhySmluv = async () => {
      try {
        const data = await getDruhySmluv({
          token: user?.token,
          username: user?.username
        });
        setDruhySmluv(data);
      } catch (error) {
        console.error('Error fetching druhy smluv:', error);
        // Použit fallback hodnoty
        setDruhySmluv(DRUH_SMLOUVY_OPTIONS_FALLBACK);
      } finally {
        setLoadingDruhy(false);
      }
    };
    
    if (user?.token && user?.username) {
      fetchDruhySmluv();
    } else {
      // Použít fallback pokud není user
      setDruhySmluv(DRUH_SMLOUVY_OPTIONS_FALLBACK);
      setLoadingDruhy(false);
    }
  }, [user]); // Závislost na user pro správné načtení dat

  useEffect(() => {
    if (user?.id) {
      console.log('User loaded for audit trail:', {
        id: user.id,
        jmeno: user.jmeno,
        prijmeni: user.prijmeni
      });
    }
  }, [user, token]);

  // =============================================================================
  // HANDLERS
  // =============================================================================
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // ARES handlers podle OrderForm25
  const handleAresSearch = () => {
    const currentName = formData.nazev_firmy || '';
    const currentICO = formData.ico || '';
    const searchTerm = currentName || currentICO;

    setAresSearch(searchTerm);
    setAresPopupOpen(true);
    if (searchTerm && searchTerm.length >= 2) {
      fetchAresData(searchTerm);
    }
  };

  const handleAresSearchChange = (e) => {
    const value = e.target.value;
    setAresSearch(value);
    
    if (value && value.length >= 2) {
      fetchAresData(value);
    } else {
      setAresResults([]);
    }
  };

  const handleAresSelect = (aresItem) => {
    setFormData(prev => ({
      ...prev,
      ico: aresItem.ico || '',
      nazev_firmy: aresItem.obchodni_firma || aresItem.nazev || ''
    }));
    
    setAresPopupOpen(false);
    setAresSearch('');
    setAresResults([]);
  };

  const fetchAresData = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setAresResults([]);
      return;
    }

    setAresLoading(true);
    try {
      const response = await fetch(`/eeo2025-api/api/ares/search.php?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Chyba při načítání dat z ARES');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setAresResults(data.data);
      } else {
        setAresResults([]);
        console.warn('ARES API returned unexpected format:', data);
      }
    } catch (error) {
      console.error('Error fetching ARES data:', error);
      setAresResults([]);
    } finally {
      setAresLoading(false);
    }
  };

  const handleHodnotaBezDphChange = (value) => {
    const numValue = parseFloat(value) || 0;
    const sazbaDph = parseFloat(formData.sazba_dph) || 21;
    const hodnotaSDph = numValue * (1 + sazbaDph / 100);
    
    setFormData(prev => ({
      ...prev,
      hodnota_bez_dph: value,
      hodnota_s_dph: hodnotaSDph.toFixed(2)
    }));
  };

  const handleHodnotaSDphChange = (value) => {
    const numValue = parseFloat(value) || 0;
    const sazbaDph = parseFloat(formData.sazba_dph) || 21;
    const hodnotaBezDph = numValue / (1 + sazbaDph / 100);
    
    setFormData(prev => ({
      ...prev,
      hodnota_s_dph: value,
      hodnota_bez_dph: hodnotaBezDph.toFixed(2)
    }));
  };

  const handleSazbaDphChange = (newSazba) => {
    const hodnotaBezDph = parseFloat(formData.hodnota_bez_dph) || 0;
    const newSazbaNum = parseFloat(newSazba) || 21;
    const hodnotaSDph = hodnotaBezDph * (1 + newSazbaNum / 100);
    
    setFormData(prev => ({
      ...prev,
      sazba_dph: newSazba,
      hodnota_s_dph: hodnotaSDph.toFixed(2)
    }));
  };

  // =============================================================================
  // VALIDATION
  // =============================================================================

  const validateForm = () => {
    const newErrors = {};
    
    // Povinná pole
    if (!formData.cislo_smlouvy?.trim()) {
      newErrors.cislo_smlouvy = 'Číslo smlouvy je povinné';
    }
    
    if (!formData.usek_id) {
      newErrors.usek_id = 'Úsek je povinný';
    }
    
    if (!formData.nazev_firmy?.trim()) {
      newErrors.nazev_firmy = 'Název firmy je povinný';
    }
    
    if (!formData.ico?.trim()) {
      newErrors.ico = 'IČO je povinné';
    }
    
    if (!formData.nazev_smlouvy?.trim()) {
      newErrors.nazev_smlouvy = 'Název smlouvy je povinný';
    }
    
    if (!formData.platnost_od) {
      newErrors.platnost_od = 'Datum platnosti od je povinné';
    }
    
    if (!formData.platnost_do) {
      newErrors.platnost_do = 'Datum platnosti do je povinné';
    }
    
    if (!formData.hodnota_bez_dph || parseFloat(formData.hodnota_bez_dph) <= 0) {
      newErrors.hodnota_bez_dph = 'Hodnota bez DPH musí být větší než 0';
    }
    
    if (!formData.hodnota_s_dph || parseFloat(formData.hodnota_s_dph) <= 0) {
      newErrors.hodnota_s_dph = 'Hodnota s DPH musí být větší než 0';
    }
    
    // Validace IČO
    if (formData.ico && !/^\d{8}$/.test(formData.ico)) {
      newErrors.ico = 'IČO musí obsahovat přesně 8 číslic';
    }
    
    // Validace data platnosti
    if (formData.platnost_od && formData.platnost_do) {
      const dateOd = new Date(formData.platnost_od);
      const dateDo = new Date(formData.platnost_do);
      
      if (dateOd >= dateDo) {
        newErrors.platnost_do = 'Datum platnosti do musí být pozdější než datum od';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================================================
  // SUBMIT
  // =============================================================================

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    
    try {
      let response;
      
      if (isEdit) {
        response = await updateSmlouva(smlouva.id, {
          ...formData,
          upravil_user_id: user?.id || null
        }, token);
      } else {
        response = await createSmlouva({
          ...formData,
          vytvoril_user_id: user?.id || null
        }, token);
      }

      if (response.success) {
        onClose();
      } else {
        setErrors({ submit: response.message || 'Chyba při ukládání smlouvy' });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setErrors({ submit: 'Neočekávaná chyba při ukládání. Zkuste to znovu.' });
    } finally {
      setSaving(false);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <>
      {/* Main Modal */}
      {ReactDOM.createPortal(
        <Overlay>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                {isEdit ? 'Editovat smlouvu' : 'Přidat novou smlouvu'}
              </ModalTitle>
              <CloseButton onClick={onClose}>
                <FontAwesomeIcon icon={faTimes} />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              <Form>
                {/* Číslo smlouvy */}
                <FormField>
                  <Label className="required">Číslo smlouvy</Label>
                  <Input
                    type="text"
                    value={formData.cislo_smlouvy}
                    onChange={(e) => handleInputChange('cislo_smlouvy', e.target.value)}
                    $error={errors.cislo_smlouvy}
                    placeholder="např. S-147/750309/26/23"
                  />
                  {errors.cislo_smlouvy && <ErrorText>{errors.cislo_smlouvy}</ErrorText>}
                </FormField>

                {/* Úsek */}
                <FormField>
                  <Label className="required">Úsek</Label>
                  <Select
                    value={formData.usek_id}
                    onChange={(e) => handleInputChange('usek_id', e.target.value)}
                    $error={errors.usek_id}
                  >
                    <option value="">Vyberte úsek</option>
                    {useky.map(usek => (
                      <option key={usek.id} value={usek.id}>
                        {usek.usek_zkr} - {usek.usek_nazev}
                      </option>
                    ))}
                  </Select>
                  {errors.usek_id && <ErrorText>{errors.usek_id}</ErrorText>}
                </FormField>

                {/* Druh smlouvy */}
                <FormField>
                  <Label className="required">Druh smlouvy</Label>
                  <Select
                    value={formData.druh_smlouvy}
                    onChange={(e) => handleInputChange('druh_smlouvy', e.target.value)}
                    $error={errors.druh_smlouvy}
                  >
                    {loadingDruhy ? (
                      <option>Načítám...</option>
                    ) : (
                      druhySmluv.map(druh => (
                        <option key={druh.value || druh.kod} value={druh.value || druh.kod}>
                          {druh.label || druh.nazev}
                        </option>
                      ))
                    )}
                  </Select>
                  {errors.druh_smlouvy && <ErrorText>{errors.druh_smlouvy}</ErrorText>}
                </FormField>

                {/* Aktivní switch */}
                <FormField style={{ alignItems: 'center', gap: '1rem' }}>
                  <Label style={{ margin: 0 }}>Aktivní</Label>
                  <ToggleSwitch>
                    <input
                      type="checkbox"
                      checked={formData.aktivni === 1}
                      onChange={(e) => handleInputChange('aktivni', e.target.checked ? 1 : 0)}
                    />
                    <span className="slider round"></span>
                  </ToggleSwitch>
                </FormField>

                {/* === DODAVATEL === */}
                <SectionHeader>
                  <h3>Dodavatel</h3>
                </SectionHeader>

                {/* Název firmy */}
                <FormField $fullWidth>
                  <Label className="required">Název firmy</Label>
                  <Input
                    type="text"
                    value={formData.nazev_firmy}
                    onChange={(e) => handleInputChange('nazev_firmy', e.target.value)}
                    $error={errors.nazev_firmy}
                    placeholder="např. Acme Corporation s.r.o."
                  />
                  {errors.nazev_firmy && <ErrorText>{errors.nazev_firmy}</ErrorText>}
                </FormField>

                {/* IČO s ARES ikonou uvnitř */}
                <FormField>
                  <Label className="required">IČO</Label>
                  <div style={{position: 'relative'}}>
                    <Input
                      type="text"
                      value={formData.ico}
                      onChange={(e) => handleInputChange('ico', e.target.value)}
                      $error={errors.ico}
                      placeholder="8 číslic"
                      maxLength="8"
                      style={{paddingRight: '40px'}}
                    />
                    <AresSearchIcon
                      onClick={handleAresSearch}
                      title="Vyhledat v ARES registru"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/>
                        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                      </svg>
                    </AresSearchIcon>
                  </div>
                  {errors.ico && <ErrorText>{errors.ico}</ErrorText>}
                </FormField>

                {/* DIČ */}
                <FormField>
                  <Label>DIČ</Label>
                  <Input
                    type="text"
                    value={formData.dic}
                    onChange={(e) => handleInputChange('dic', e.target.value)}
                    placeholder="např. CZ12345678"
                  />
                </FormField>

                {/* Název smlouvy */}
                <FormField $fullWidth>
                  <Label className="required">Název smlouvy</Label>
                  <Input
                    type="text"
                    value={formData.nazev_smlouvy}
                    onChange={(e) => handleInputChange('nazev_smlouvy', e.target.value)}
                    $error={errors.nazev_smlouvy}
                    placeholder="např. Smlouva o poskytování poradenských služeb"
                  />
                  {errors.nazev_smlouvy && <ErrorText>{errors.nazev_smlouvy}</ErrorText>}
                </FormField>

                <FormField $fullWidth>
                  <Label>Popis smlouvy</Label>
                  <TextArea
                    value={formData.popis_smlouvy}
                    onChange={(e) => handleInputChange('popis_smlouvy', e.target.value)}
                    placeholder="Detail popis smlouvy (nepovinné)..."
                  />
                </FormField>

                {/* === PLATNOST A HODNOTA === */}
                <SectionHeader>
                  <h3>Platnost a hodnota</h3>
                </SectionHeader>

                {/* První řádek: Platnost od | Platnost do | Sazba DPH */}
                <ThreeColumnRow>
                  {/* Platnost od */}
                  <InnerFormField>
                    <Label className="required">Platnost od</Label>
                    <DatePicker
                      value={formData.platnost_od}
                      onChange={(value) => handleInputChange('platnost_od', value)}
                      $error={errors.platnost_od}
                    />
                    {errors.platnost_od && <ErrorText>{errors.platnost_od}</ErrorText>}
                  </InnerFormField>

                  {/* Platnost do */}
                  <InnerFormField>
                    <Label className="required">Platnost do</Label>
                    <DatePicker
                      value={formData.platnost_do}
                      onChange={(value) => handleInputChange('platnost_do', value)}
                      $error={errors.platnost_do}
                    />
                    {errors.platnost_do && <ErrorText>{errors.platnost_do}</ErrorText>}
                  </InnerFormField>

                  {/* Sazba DPH */}
                  <InnerFormField>
                    <Label className="required">Sazba DPH (%)</Label>
                    <Select
                      value={formData.sazba_dph}
                      onChange={(e) => handleSazbaDphChange(e.target.value)}
                      $error={errors.sazba_dph}
                    >
                      {SAZBA_DPH_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {errors.sazba_dph && <ErrorText>{errors.sazba_dph}</ErrorText>}
                  </InnerFormField>
                </ThreeColumnRow>

                {/* Druhý řádek: Hodnota bez DPH | Hodnota s DPH */}
                <TwoColumnRow>
                  {/* Hodnota bez DPH */}
                  <InnerFormField>
                    <Label className="required">Hodnota bez DPH (Kč)</Label>
                    <CurrencyInput
                      fieldName="hodnota_bez_dph"
                      value={formData.hodnota_bez_dph}
                      onChange={(fieldName, value) => handleHodnotaBezDphChange(value)}
                      hasError={!!errors.hodnota_bez_dph}
                      placeholder="0,00"
                    />
                    {errors.hodnota_bez_dph && <ErrorText>{errors.hodnota_bez_dph}</ErrorText>}
                    <InfoText>🔄 Hodnota s DPH se dopočítá</InfoText>
                  </InnerFormField>

                  {/* Hodnota s DPH */}
                  <InnerFormField>
                    <Label className="required">Hodnota s DPH (Kč)</Label>
                    <CurrencyInput
                      fieldName="hodnota_s_dph"
                      value={formData.hodnota_s_dph}
                      onChange={(fieldName, value) => handleHodnotaSDphChange(value)}
                      hasError={!!errors.hodnota_s_dph}
                      placeholder="0,00"
                    />
                    {errors.hodnota_s_dph && <ErrorText>{errors.hodnota_s_dph}</ErrorText>}
                  </InnerFormField>
                </TwoColumnRow>

                {/* === VOLITELNÉ ÚDAJE === */}
                <ToggleSection>
                  <SectionTitle
                    onClick={() => setShowOptionalFields(!showOptionalFields)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    Volitelné údaje
                    <FontAwesomeIcon 
                      icon={faChevronDown} 
                      style={{ 
                        transform: showOptionalFields ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }} 
                    />
                  </SectionTitle>
                </ToggleSection>

                {showOptionalFields && (
                  <OptionalFields>
                    {/* Číslo DMS */}
                    <FormField>
                      <Label>Číslo DMS</Label>
                      <Input
                        type="text"
                        value={formData.cislo_dms}
                        onChange={(e) => handleInputChange('cislo_dms', e.target.value)}
                        placeholder="Číslo v DMS systému"
                      />
                    </FormField>

                    {/* Kategorie */}
                    <FormField>
                      <Label>Kategorie</Label>
                      <Input
                        type="text"
                        value={formData.kategorie}
                        onChange={(e) => handleInputChange('kategorie', e.target.value)}
                        placeholder="Kategorie smlouvy"
                      />
                    </FormField>

                    {/* Poznámka */}
                    <FormField style={{gridColumn: 'span 2'}}>
                      <Label>Poznámka</Label>
                      <TextArea
                        rows={4}
                        value={formData.poznamka}
                        onChange={(e) => handleInputChange('poznamka', e.target.value)}
                        placeholder="Dodatečné poznámky"
                      />
                    </FormField>
                  </OptionalFields>
                )}
              </Form>
            </ModalBody>
            
            <ModalFooter>
              <SecondaryButton onClick={onClose}>Zrušit</SecondaryButton>
              <PrimaryButton onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Ukládám...</>
                ) : (
                  <><FontAwesomeIcon icon={faSave} /> {isEdit ? 'Uložit změny' : 'Přidat smlouvu'}</>
                )}
              </PrimaryButton>
            </ModalFooter>
          </ModalContent>
        </Overlay>,
        document.body
      )}
      
      {/* ARES Search Popup podle OrderForm25 */}
      {aresPopupOpen && ReactDOM.createPortal(
        <AresPopupOverlay>
          <AresPopupModal onClick={(e) => e.stopPropagation()}>
            <AresPopupHeader>
              <AresPopupTitle>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                  <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                </svg>
                ARES - Administrativní registr ekonomických subjektů
              </AresPopupTitle>
              <AresPopupCloseButton
                onClick={() => {
                  setAresPopupOpen(false);
                  setAresSearch('');
                  setAresResults([]);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </AresPopupCloseButton>
            </AresPopupHeader>
            
            <AresPopupContent>
              <AresSearchInputField
                type="text"
                value={aresSearch}
                onChange={handleAresSearchChange}
                placeholder="Zadejte název firmy nebo IČO..."
                autoFocus
              />
              
              {aresLoading && (
                <AresLoadingSpinner>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Načítám data z ARES...
                </AresLoadingSpinner>
              )}
              
              {!aresLoading && aresResults.length === 0 && aresSearch && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  Žádné výsledky nenalezeny pro "<strong>{aresSearch}</strong>"
                </div>
              )}
              
              {!aresLoading && aresResults.length > 0 && (
                <AresList>
                  {aresResults.map((aresItem, index) => (
                    <AresItem key={index}>
                      <AresItemContent>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                          {aresItem.obchodni_firma || aresItem.nazev || 'Název nenalezen'}
                        </div>
                        <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>
                          <strong>IČO:</strong> {aresItem.ico || 'Neuvedeno'}
                        </div>
                        {aresItem.dic && (
                          <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>
                            <strong>DIČ:</strong> {aresItem.dic}
                          </div>
                        )}
                        {aresItem.adresa && (
                          <div style={{ color: '#6b7280' }}>
                            <strong>Adresa:</strong> {aresItem.adresa}
                          </div>
                        )}
                      </AresItemContent>
                      
                      <AresItemButtons>
                        <AresActionButton
                          primary
                          onClick={() => handleAresSelect(aresItem)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                          Vybrat dodavatele
                        </AresActionButton>
                      </AresItemButtons>
                    </AresItem>
                  ))}
                </AresList>
              )}
            </AresPopupContent>
          </AresPopupModal>
        </AresPopupOverlay>,
        document.body
      )}
    </>
  );
};

export default SmlouvyFormModal;