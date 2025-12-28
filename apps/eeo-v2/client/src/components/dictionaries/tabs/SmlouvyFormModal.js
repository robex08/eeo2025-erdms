/**
 * SmlouvyFormModal - Formulář pro vytvoření/editaci smlouvy
 * 
 * Funkce:
 * - Validace všech polí
 * - Auto-výpočet DPH
 * - Kontrola IČO
 * - Datepicker pro platnost
 * - Dropdown pro úseky, druhy, stavy
 * 
 * @author Frontend Team  
 * @date 2025-11-23
 */

import React, { useState, useContext, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faSpinner, faChevronDown, faFileContract, faPlus } from '@fortawesome/free-solid-svg-icons';
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
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-height: 85vh;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: white;
  font-weight: 700;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  z-index: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const Body = styled.div`
  padding: 1.5rem 2rem;
  overflow-y: auto;
  flex: 1;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  grid-column: ${props => props.$fullWidth ? 'span 2' : 'span 1'};

  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &.required::after {
    content: '*';
    color: #ef4444;
    margin-left: 0.25rem;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid ${props => props.$error ? '#ef4444' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: ${props => props.$highlight ? '600' : '500'};
  color: ${props => props.$highlight ? '#000000' : 'inherit'};
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

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid ${props => props.$error ? '#ef4444' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: ${props => props.$highlight ? '600' : '500'};
  color: ${props => props.$highlight ? '#000000' : 'inherit'};
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;
  padding-right: 2.5rem;

  &:focus {
    outline: none;
    border-color: ${props => props.$error ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:hover {
    border-color: #3b82f6;
  }

  &:disabled {
    background-color: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: ${props => props.$highlight ? '600' : '400'};
  color: ${props => props.$highlight ? '#000000' : 'inherit'};
  min-height: 80px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

// Currency Input Components
const CurrencyInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputWithIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const CurrencySymbol = styled.span`
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
  font-weight: ${props => props.$highlight ? '600' : '500'};
  color: ${props => props.$highlight ? '#000000' : 'inherit'};
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

const CalculatorIcon = styled(Calculator)`
  position: absolute;
  left: 12px;
  color: #6b7280;
  width: 16px;
  height: 16px;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding-top: 0.5rem;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: relative;
    width: 56px;
    height: 28px;
    background-color: #cbd5e1;
    border-radius: 28px;
    transition: all 0.3s ease;
    flex-shrink: 0;

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

  input:checked + .slider {
    background-color: #3b82f6;
  }

  input:checked + .slider::before {
    transform: translateX(28px);
  }

  input:focus + .slider {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .label-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
  }
`;

const ErrorText = styled.span`
  font-size: 0.8rem;
  color: #ef4444;
`;

const Footer = styled.div`
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: #f9fafb;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.$variant === 'primary' ? '#3b82f6' : '#f3f4f6'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#374151'};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'primary' ? '#2563eb' : '#e5e7eb'};
    transform: translateY(-1px);
    box-shadow: ${props => props.$variant === 'primary' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const InfoText = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  font-style: italic;
  margin-top: 0.25rem;
`;

const SectionHeader = styled.div`
  grid-column: span 2;
  margin-top: ${props => props.$first ? '0' : '1rem'};
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: ${props => props.$collapsible ? 'pointer' : 'default'};
  user-select: none;

  @media (max-width: 768px) {
    grid-column: span 1;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-icon {
    font-size: 0.875rem;
    color: #64748b;
    transition: transform 0.2s ease;
    transform: ${props => props.$collapsed ? 'rotate(0deg)' : 'rotate(180deg)'};
  }
`;

const CollapsibleContent = styled.div`
  display: ${props => props.$collapsed ? 'none' : 'contents'};
`;

const HintBox = styled.div`
  grid-column: span 2;
  padding: 0.75rem 1rem;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #1e40af;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const ThreeColumnRow = styled.div`
  grid-column: span 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-column: span 1;
  }
`;

const TwoColumnRow = styled.div`
  grid-column: span 2;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-column: span 1;
  }
`;

const InnerFormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

// =============================================================================
// CURRENCY INPUT COMPONENT
// =============================================================================

function CurrencyInput({ 
  fieldName, 
  value, 
  onChange, 
  onBlur, 
  disabled = false, 
  hasError = false, 
  placeholder = '',
  highlight = false
}) {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number to Czech format: "1 234,56"
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
  };

  // Initialize local value from props (only when not focused)
  useEffect(() => {
    if (!isFocused) {
      const formattedValue = formatCurrency(value || '');
      if (localValue !== formattedValue) {
        setLocalValue(formattedValue);
      }
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Update local value immediately (without formatting)
    setLocalValue(newValue);
    
    // Clean value before sending to onChange
    const cleanValue = newValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);
    
    // Call onChange with cleaned value
    onChange(fieldName, finalValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlurLocal = () => {
    setIsFocused(false);
    
    // Format value on blur
    const formatted = formatCurrency(localValue);
    setLocalValue(formatted);
    
    // Clean value before sending to onBlur
    const cleanValue = localValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);
    
    if (onBlur) {
      onBlur(fieldName, finalValue);
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
          $highlight={highlight}
          placeholder={placeholder}
        />
        <CurrencySymbol disabled={disabled}>Kč</CurrencySymbol>
      </InputWithIcon>
    </CurrencyInputWrapper>
  );
}

// =============================================================================
// KOMPONENTA
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
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [druhySmluv, setDruhySmluv] = useState(DRUH_SMLOUVY_OPTIONS_FALLBACK);
  const [loadingDruhy, setLoadingDruhy] = useState(true);
  
  // 🎯 State pro zvýraznění nedávno změněných polí
  const [recentlyChangedFields, setRecentlyChangedFields] = useState(new Set());
  
  // 🎯 Ref pro tracking timeoutů (aby se správně čistily)
  const highlightTimeoutsRef = useRef({});

  // =============================================================================
  // NAČTENÍ DRUHŮ SMLUV Z API
  // =============================================================================

  useEffect(() => {
    const fetchDruhySmluv = async () => {
      try {
        setLoadingDruhy(true);
        const druhy = await getDruhySmluv({ token, username: user.username });
        setDruhySmluv(druhy);
      } catch (err) {
        console.error('Chyba při načítání druhů smluv:', err);
        // Ponecháme fallback hodnoty
      } finally {
        setLoadingDruhy(false);
      }
    };

    if (user && token) {
      fetchDruhySmluv();
    }
  }, [user, token]);

  // =============================================================================
  // FIELD CHANGE TRACKING
  // =============================================================================
  
  const markFieldAsChanged = (fieldName) => {
    // Pokud existuje předchozí timeout pro toto pole, zruš ho
    if (highlightTimeoutsRef.current[fieldName]) {
      clearTimeout(highlightTimeoutsRef.current[fieldName]);
    }
    
    // Přidej pole do Set zvýrazněných polí
    setRecentlyChangedFields(prev => new Set(prev).add(fieldName));
    
    // Nastav nový timeout pro odstranění zvýraznění
    highlightTimeoutsRef.current[fieldName] = setTimeout(() => {
      setRecentlyChangedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
      // Vyčisti referenci na timeout
      delete highlightTimeoutsRef.current[fieldName];
    }, 2000);
  };
  
  // Cleanup timeoutů při unmount
  useEffect(() => {
    return () => {
      // Při unmount vyčisti všechny timeouty
      Object.values(highlightTimeoutsRef.current).forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
    };
  }, []);
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    markFieldAsChanged(field);
  };

  // =============================================================================
  // AUTO-CALCULATE DPH
  // =============================================================================

  const handleHodnotaBezDphChange = (value) => {
    const bezDph = parseFloat(value) || 0;
    const sazbaDph = parseFloat(formData.sazba_dph) || 0;
    const sDph = bezDph * (1 + sazbaDph / 100);
    
    setFormData(prev => ({
      ...prev,
      hodnota_bez_dph: value,
      hodnota_s_dph: sDph.toFixed(2)
    }));
    
    markFieldAsChanged('hodnota_bez_dph');
    markFieldAsChanged('hodnota_s_dph');
  };

  const handleHodnotaSDphChange = (value) => {
    const sDph = parseFloat(value) || 0;
    const sazbaDph = parseFloat(formData.sazba_dph) || 0;
    const bezDph = sDph / (1 + sazbaDph / 100);
    
    setFormData(prev => ({
      ...prev,
      hodnota_s_dph: value,
      hodnota_bez_dph: bezDph.toFixed(2)
    }));
    
    markFieldAsChanged('hodnota_s_dph');
    markFieldAsChanged('hodnota_bez_dph');
  };

  const handleSazbaDphChange = (value) => {
    const sazbaDph = parseFloat(value) || 0;
    const bezDph = parseFloat(formData.hodnota_bez_dph) || 0;
    const sDph = bezDph * (1 + sazbaDph / 100);
    
    setFormData(prev => ({
      ...prev,
      sazba_dph: value,
      hodnota_s_dph: sDph.toFixed(2)
    }));
    
    markFieldAsChanged('sazba_dph');
    markFieldAsChanged('hodnota_s_dph');
  };

  // =============================================================================
  // VALIDATION
  // =============================================================================

  const validate = () => {
    const newErrors = {};

    if (!formData.cislo_smlouvy.trim()) {
      newErrors.cislo_smlouvy = 'Číslo smlouvy je povinné';
    }

    if (!formData.usek_id) {
      newErrors.usek_id = 'Úsek je povinný';
    }

    if (!formData.druh_smlouvy) {
      newErrors.druh_smlouvy = 'Druh smlouvy je povinný';
    }

    if (!formData.nazev_firmy.trim()) {
      newErrors.nazev_firmy = 'Název firmy je povinný';
    }
    
    if (!formData.ico.trim()) {
      newErrors.ico = 'IČO je povinné';
    }

    if (!formData.nazev_smlouvy.trim()) {
      newErrors.nazev_smlouvy = 'Název smlouvy je povinný';
    }

    if (!formData.platnost_od) {
      newErrors.platnost_od = 'Platnost od je povinná';
    }

    if (!formData.platnost_do) {
      newErrors.platnost_do = 'Platnost do je povinná';
    }

    if (formData.platnost_od && formData.platnost_do) {
      if (new Date(formData.platnost_do) < new Date(formData.platnost_od)) {
        newErrors.platnost_do = 'Datum do musí být po datu od';
      }
    }

    if (!formData.hodnota_bez_dph || parseFloat(formData.hodnota_bez_dph) <= 0) {
      newErrors.hodnota_bez_dph = 'Hodnota bez DPH je povinná a musí být kladná';
    }

    if (!formData.hodnota_s_dph || parseFloat(formData.hodnota_s_dph) <= 0) {
      newErrors.hodnota_s_dph = 'Hodnota s DPH je povinná a musí být kladná';
    }

    if (formData.ico && !/^\d{8}$/.test(formData.ico)) {
      newErrors.ico = 'IČO musí obsahovat 8 číslic';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================================================
  // SAVE
  // =============================================================================

  const handleSave = async () => {
    if (!validate()) {
      // Chyby jsou již zobrazeny inline v errors state
      return;
    }

    try {
      setSaving(true);

      if (isEdit) {
        await updateSmlouva({
          token: token,
          username: user.username,
          id: smlouva.id,
          smlouvaData: formData
        });
        // Úspěšná aktualizace - zavřít modal a reloadnout data
      } else {
        await createSmlouva({
          token: token,
          username: user.username,
          smlouvaData: formData
        });
        // Úspěšné vytvoření - zavřít modal a reloadnout data
      }

      onClose(true);
    } catch (err) {
      // Zobrazíme error inline v modalu
      setErrors(prev => ({ ...prev, _global: 'Chyba při ukládání: ' + err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return ReactDOM.createPortal(
    <Overlay>
      <Modal>
        <Header>
          <Title>
            <FontAwesomeIcon icon={isEdit ? faFileContract : faPlus} />
            {isEdit ? 'Upravit smlouvu' : 'Nová smlouva'}
          </Title>
          <CloseButton onClick={() => !saving && onClose(false)}>
            <FontAwesomeIcon icon={faTimes} />
          </CloseButton>
        </Header>

        {errors._global && (
          <div style={{ padding: '1rem 1.5rem', background: '#fee2e2', borderLeft: '4px solid #dc2626', color: '#dc2626', fontWeight: 600 }}>
            ❌ {errors._global}
          </div>
        )}

        <Body>
          <FormGrid>
            {/* === ZÁKLADNÍ ÚDAJE === */}
            <SectionHeader $first>
              <h3>📋 Základní údaje</h3>
            </SectionHeader>

            <HintBox>
              💡 Povinné položky jsou označeny hvězdičkou (*). DPH se počítá automaticky.
            </HintBox>

            {/* Číslo smlouvy */}
            <FormField>
              <Label className="required">Číslo smlouvy</Label>
              <Input
                type="text"
                value={formData.cislo_smlouvy}
                onChange={(e) => handleChange('cislo_smlouvy', e.target.value)}
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
                onChange={(e) => handleChange('usek_id', e.target.value)}
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
                onChange={(e) => handleChange('druh_smlouvy', e.target.value)}
                $error={errors.druh_smlouvy}
                disabled={loadingDruhy}
              >
                {loadingDruhy ? (
                  <option value="">Načítám druhy smluv...</option>
                ) : (
                  druhySmluv.map(opt => (
                    <option key={opt.value} value={opt.value} title={opt.popis}>
                      {opt.label}
                    </option>
                  ))
                )}
              </Select>
              {errors.druh_smlouvy && <ErrorText>{errors.druh_smlouvy}</ErrorText>}
              {formData.druh_smlouvy && druhySmluv.find(d => d.value === formData.druh_smlouvy)?.popis && (
                <InfoText>
                  {druhySmluv.find(d => d.value === formData.druh_smlouvy).popis}
                </InfoText>
              )}
            </FormField>

            {/* Aktivní */}
            <FormField>
              <Label>Stav smlouvy</Label>
              <ToggleSwitch>
                <input
                  type="checkbox"
                  checked={formData.aktivni === 1}
                  onChange={(e) => handleChange('aktivni', e.target.checked ? 1 : 0)}
                />
                <span className="slider" />
                <span className="label-text">{formData.aktivni === 1 ? '✅ Aktivní' : '⏸️ Neaktivní'}</span>
              </ToggleSwitch>
            </FormField>

            {/* === DODAVATEL === */}
            <SectionHeader>
              <h3>🏢 Dodavatel</h3>
            </SectionHeader>

            {/* Název firmy */}
            <FormField $fullWidth>
              <Label className="required">Název firmy</Label>
              <Input
                type="text"
                value={formData.nazev_firmy}
                onChange={(e) => handleChange('nazev_firmy', e.target.value)}
                $error={errors.nazev_firmy}
                placeholder="např. Alter Audit, s.r.o."
              />
              {errors.nazev_firmy && <ErrorText>{errors.nazev_firmy}</ErrorText>}
            </FormField>

            {/* IČO */}
            <FormField>
              <Label className="required">IČO</Label>
              <Input
                type="text"
                value={formData.ico}
                onChange={(e) => handleInputChange('ico', e.target.value)}
                $error={errors.ico}
                $highlight={recentlyChangedFields.has('ico')}
                placeholder="8 číslic"
                maxLength="8"
              />
              {errors.ico && <ErrorText>{errors.ico}</ErrorText>}
            </FormField>

            {/* DIČ */}
            <FormField>
              <Label>DIČ</Label>
              <Input
                type="text"
                value={formData.dic}
                onChange={(e) => handleChange('dic', e.target.value)}
                placeholder="např. CZ12345678"
              />
            </FormField>

            {/* === NÁZEV A POPIS === */}
            <SectionHeader>
              <h3>📄 Název a popis</h3>
            </SectionHeader>

            {/* Název smlouvy */}
            <FormField $fullWidth>
              <Label className="required">Název smlouvy</Label>
              <Input
                type="text"
                value={formData.nazev_smlouvy}
                onChange={(e) => handleChange('nazev_smlouvy', e.target.value)}
                $error={errors.nazev_smlouvy}
                placeholder="např. Smlouva o poskytování poradenských služeb"
              />
              {errors.nazev_smlouvy && <ErrorText>{errors.nazev_smlouvy}</ErrorText>}
            </FormField>

            {/* Popis smlouvy */}
            <FormField $fullWidth>
              <Label>Popis smlouvy</Label>
              <TextArea
                value={formData.popis_smlouvy}
                onChange={(e) => handleChange('popis_smlouvy', e.target.value)}
                placeholder="Detailní popis smlouvy (nepovinné)..."
              />
            </FormField>

            {/* === PLATNOST A HODNOTA === */}
            <SectionHeader>
              <h3>💰 Platnost a hodnota</h3>
            </SectionHeader>

            {/* První řádek: Platnost od | Platnost do | Sazba DPH */}
            <ThreeColumnRow>
              {/* Platnost od */}
              <InnerFormField>
                <Label className="required">Platnost od</Label>
                <DatePicker
                  value={formData.platnost_od}
                  onChange={(value) => handleChange('platnost_od', value)}
                  placeholder="Vyberte datum od"
                  hasError={!!errors.platnost_od}
                />
                {errors.platnost_od && <ErrorText>{errors.platnost_od}</ErrorText>}
              </InnerFormField>

              {/* Platnost do */}
              <InnerFormField>
                <Label className="required">Platnost do</Label>
                <DatePicker
                  value={formData.platnost_do}
                  onChange={(value) => handleChange('platnost_do', value)}
                  placeholder="Vyberte datum do"
                  hasError={!!errors.platnost_do}
                />
                {errors.platnost_do && <ErrorText>{errors.platnost_do}</ErrorText>}
              </InnerFormField>

              {/* Sazba DPH */}
              <InnerFormField>
                <Label>Sazba DPH (%)</Label>
                <Select
                  value={formData.sazba_dph}
                  onChange={(e) => handleSazbaDphChange(e.target.value)}
                >
                  {SAZBA_DPH_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
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
                  highlight={recentlyChangedFields.has('hodnota_bez_dph')}
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
                  highlight={recentlyChangedFields.has('hodnota_s_dph')}
                  placeholder="0,00"
                />
                {errors.hodnota_s_dph && <ErrorText>{errors.hodnota_s_dph}</ErrorText>}
              </InnerFormField>
            </TwoColumnRow>

            {/* === VOLITELNÉ ÚDAJE === */}
            <SectionHeader 
              $collapsible 
              $collapsed={!showOptionalFields}
              onClick={() => setShowOptionalFields(!showOptionalFields)}
            >
              <h3>🔧 Volitelné údaje</h3>
              <FontAwesomeIcon icon={faChevronDown} className="toggle-icon" />
            </SectionHeader>

            <CollapsibleContent $collapsed={!showOptionalFields}>
              {/* Číslo DMS */}
              <FormField>
                <Label>Číslo DMS</Label>
                <Input
                  type="text"
                  value={formData.cislo_dms}
                  onChange={(e) => handleChange('cislo_dms', e.target.value)}
                  placeholder="např. DMS-2025-123"
                />
              </FormField>

              {/* Kategorie */}
              <FormField>
                <Label>Kategorie</Label>
                <Input
                  type="text"
                  value={formData.kategorie}
                  onChange={(e) => handleChange('kategorie', e.target.value)}
                  placeholder="např. IT, Poradenství"
                />
              </FormField>

              {/* Poznámka */}
              <FormField $fullWidth>
                <Label>Interní poznámka</Label>
                <TextArea
                  value={formData.poznamka}
                  onChange={(e) => handleChange('poznamka', e.target.value)}
                  placeholder="Interní poznámka (nezobrazuje se veřejně)..."
                />
              </FormField>
            </CollapsibleContent>
          </FormGrid>
        </Body>

        <Footer>
          <Button onClick={() => !saving && onClose(false)} disabled={saving}>
            Zrušit
          </Button>
          <Button $variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Ukládám...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} />
                {isEdit ? 'Uložit změny' : 'Vytvořit smlouvu'}
              </>
            )}
          </Button>
        </Footer>
      </Modal>
    </Overlay>,
    document.body
  );
};

export default SmlouvyFormModal;
