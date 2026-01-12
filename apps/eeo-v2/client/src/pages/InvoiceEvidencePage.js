/**
 * InvoiceEvidencePage.js - Komponenta pro evidenci a úpravu faktur
 * 
 * ✅ OPTIMALIZOVÁNO (29.12.2025):
 * - Odstraněny duplicitní useEffecty pro načítání objednávky (3 místa → 1)
 * - Opraveny dependency arrays v useEffect (localStorage, debounced search)
 * - Přidán flag pro jednorázový auto-scroll na fakturu
 * - Optimalizován handleAttachmentUploaded - stabilní reference pomocí useRef
 * - Přidán cleanup pro originalFormData při submitu (prevence memory leak)
 * - Spisovka effect spouští se pouze jednou při mount
 * - Resize handler používá functional update
 * 
 * ODHADOVANÁ ÚSPORA: ~40-60% méně re-renderů
 */

import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { unstable_batchedUpdates } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSave,
  faFileInvoice,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faBuilding,
  faCalendar,
  faMoneyBillWave,
  faClipboardCheck,
  faExpand,
  faCompress,
  faArrowLeft,
  faCreditCard,
  faUpload,
  faChevronUp,
  faChevronDown,
  faSearch,
  faSpinner,
  faEdit,
  faFileContract,
  faLock,
  faUnlock,
  faBookOpen,
  faEnvelope,
  faPhone,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { ProgressContext } from '../context/ProgressContext';
import { createInvoiceWithAttachmentV2, createInvoiceV2, getInvoiceById25, updateInvoiceV2, deleteInvoiceAttachment25 } from '../services/api25invoices';
import { getOrderV2, updateOrderV2, lockOrderV2, unlockOrderV2 } from '../services/apiOrderV2';
import { getSmlouvaDetail } from '../services/apiSmlouvy';
import { universalSearch } from '../services/apiUniversalSearch';
import { fetchAllUsers } from '../services/api2auth';
import { getStrediska25, getTypyFaktur25, getInvoiceTypes25 } from '../services/api25orders';
import { formatDateOnly } from '../utils/format';
import OrderFormReadOnly from '../components/OrderFormReadOnly';
import SmlouvaPreview from '../components/SmlouvaPreview';
import DatePicker from '../components/DatePicker';
import { CustomSelect } from '../components/CustomSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import { Search } from 'lucide-react';
import draftManager from '../services/DraftManager';
import { notificationService, NOTIFICATION_TYPES } from '../services/notificationsUnified';
import { triggerNotification } from '../services/notificationsApi';
import SpisovkaInboxPanel from '../components/panels/SpisovkaInboxPanel';
import { InvoiceAttachmentsCompact, LPCerpaniEditor } from '../components/invoices';
import { parseISDOCFile, createISDOCSummary, mapISDOCToFaktura } from '../utils/isdocParser';
import { markSpisovkaDocumentProcessed } from '../services/apiSpisovkaZpracovani';
import { saveFakturaLPCerpani, getFakturaLPCerpani } from '../services/apiFakturyLPCerpani';
import { useDictionaries } from '../forms/OrderForm25/hooks/useDictionaries';

// Helper: formát data pro input type="date" (YYYY-MM-DD)
const formatDateForPicker = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  // 🔥 FIX: Použít lokální české datum místo UTC
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Currency Input Component - zachovává pozici kurzoru při psaní
function CurrencyInput({ fieldName, value, onChange, onBlur, disabled, hasError, placeholder }) {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Funkce pro formátování měny (BEZ Kč, protože to je fixně vpravo)
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
    // Pro faktury/účetnictví přesně 2 desetinná místa
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
  };

  // Inicializace lokální hodnoty z props (pouze když není focused)
  useEffect(() => {
    if (!isFocused) {
      const formattedValue = formatCurrency(value || '');
      if (localValue !== formattedValue) {
        setLocalValue(formattedValue);
      }
    }
  }, [value, isFocused, localValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;

    // Aktualizovat lokální hodnotu okamžitě (bez formátování)
    setLocalValue(newValue);

    // Očistit hodnotu od formátování
    const cleanValue = newValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);

    // Volat onChange s očištěnou hodnotou
    if (onChange) {
      onChange({ target: { name: fieldName, value: finalValue } });
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlurLocal = () => {
    setIsFocused(false);

    // Formátovat hodnotu při ztrátě fokusu
    const formatted = formatCurrency(localValue);
    setLocalValue(formatted);

    // Očistit hodnotu před odesláním do onBlur
    const cleanValue = localValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);

    // Zavolat parent onBlur pro validaci
    if (onBlur) {
      onBlur({ target: { name: fieldName, value: finalValue } });
    }
  };

  return (
    <CurrencyInputWrapper>
      <Input
        ref={inputRef}
        type="text"
        name={fieldName}
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlurLocal}
        disabled={disabled}
        style={{ textAlign: 'right', paddingRight: '40px', fontWeight: isFocused ? '400' : '600' }}
        $hasError={hasError}
      />
      <CurrencySymbol>Kč</CurrencySymbol>
    </CurrencyInputWrapper>
  );
}

// ===================================================================
// STYLED COMPONENTS - Recyklované z OrderForm25 + nové pro layout
// ===================================================================

// 🔒 LOCK Dialog komponenty
const UserInfo = styled.div`
  padding: 1rem;
  background: #f8fafc;
  border-left: 4px solid #3b82f6;
  border-radius: 4px;
  margin: 1rem 0;
  font-size: 1.1rem;
`;

const InfoText = styled.p`
  margin: 0.75rem 0;
  color: #64748b;
  line-height: 1.6;
`;

const WarningText = styled.p`
  margin: 0.75rem 0;
  color: #dc2626;
  font-weight: 600;
  line-height: 1.6;
`;

const ContactInfo = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  color: #1e40af;

  &:not(:last-child) {
    border-bottom: 1px solid #e0e7ff;
  }

  svg {
    color: #3b82f6;
    width: 18px;
    height: 18px;
  }

  a {
    color: #1e40af;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      color: #1e3a8a;
      text-decoration: underline;
    }
  }
`;

const ContactLabel = styled.span`
  font-weight: 600;
  min-width: 80px;
  color: #64748b;
`;

const LockTimeInfo = styled.div`
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #92400e;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #f59e0b;
    width: 16px;
    height: 16px;
  }
`;

const PageContainer = styled.div`
  position: relative;
  width: 100%;
  height: calc(100vh - 60px);
  background: #f9fafb;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const FullscreenOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  z-index: 99999;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const PageHeader = styled.div`
  background: linear-gradient(135deg, #dbeafe 0%, #ffffff 100%);
  color: #1f2937;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const IconButton = styled.button`
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  color: #6b7280;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: #ffffff;
    border-color: #3b82f6;
    color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  background: #10b981;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const TooltipContent = styled.div`
  position: fixed;
  top: ${props => props.$top || 0}px;
  left: ${props => props.$left || 0}px;
  min-width: 350px;
  max-width: 450px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  opacity: ${props => props.show ? 1 : 0};
  visibility: ${props => props.show ? 'visible' : 'hidden'};
  transform: ${props => props.show ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s ease;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    right: 20px;
    border: 6px solid transparent;
    border-bottom-color: #e5e7eb;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 100%;
    right: 21px;
    border: 5px solid transparent;
    border-bottom-color: #ffffff;
  }
`;

const TooltipTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TooltipItem = styled.div`
  padding: 0.4rem;
  border-radius: 6px;
  margin-bottom: 0.3rem;
  background: #f0fdf4;
  border: 1px solid #d1fae5;
  font-size: 0.75rem;
  color: #1f2937;

  &:last-child {
    margin-bottom: 0;
  }
`;

const TooltipItemTitle = styled.div`
  font-weight: 600;
  color: #065f46;
  margin-bottom: 0.2rem;
`;

const TooltipItemMeta = styled.div`
  font-size: 0.7rem;
  color: #6b7280;
  display: flex;
  justify-content: space-between;
`;

const ContentLayout = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
`;

const FormColumn = styled.div`
  width: 55%;
  background: white;
  border-right: 2px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const FormColumnHeader = styled.div`
  flex-shrink: 0;
  background: white;
  padding: 1.5rem 2rem 1rem 2rem;
  border-bottom: 2px solid #e5e7eb;
`;

const FormColumnContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2rem;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const PreviewColumn = styled.div`
  width: 45%;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PreviewColumnHeader = styled.div`
  flex-shrink: 0;
  background: #f8fafc;
  padding: 1.25rem 2rem 1.5rem 2rem;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const ToggleButton = styled.button`
  background: ${props => props.disabled ? '#e5e7eb' : '#3b82f6'};
  color: ${props => props.disabled ? '#94a3b8' : 'white'};
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s ease;
  white-space: nowrap;
  align-self: center;
  margin: 0;

  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const PreviewColumnContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2rem;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #e5e7eb;
  }

  &::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  color: #1e293b;
  margin: 0 0 1.5rem 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #3498db;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
`;

// Collapsible Section Components - inspirované OrderForm25.js
const CollapsibleSection = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
  overflow: visible;
  border: 2px solid #e2e8f0;
`;

const CollapsibleHeader = styled.div`
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-bottom: 3px solid #1e40af;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px 12px 0 0;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;

  &:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 1.1rem;
  color: white;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionContent = styled.div`
  padding: 1.5rem 1.25rem;
  display: ${props => props.$collapsed ? 'none' : 'block'};
`;

const CollapseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: transform 0.3s ease;
  transform: ${props => props.$collapsed ? 'rotate(180deg)' : 'rotate(0deg)'};

  &:hover {
    color: rgba(255, 255, 255, 0.8);
  }
`;

// Recyklované z OrderForm25 - FakturaCard layout
const FakturaCard = styled.div`
  border: 2px solid ${props => props.$hasError ? '#ef4444' : '#e5e7eb'};
  border-radius: 12px;
  padding: 1.5rem;
  background: ${props => props.$isEditing ? '#f0f9ff' : '#ffffff'};
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || '1fr'};
  gap: ${props => props.$gap || '1rem'};
  margin-bottom: 1rem;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldLabel = styled.label`
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RequiredStar = styled.span`
  color: #ef4444;
`;

const CurrencyInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const CurrencySymbol = styled.span`
  position: absolute;
  right: 12px;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: inherit;
  pointer-events: none;
  user-select: none;
  display: flex;
  align-items: center;
  height: 100%;
`;

const Input = styled.input`
  width: 100%;
  height: 48px;
  padding: 1px 0.875rem;
  border: 2px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #94a3af;
  }
`;

const Textarea = styled.textarea`
  padding: 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  height: 48px;
  padding: 1px 2.5rem 1px 0.875rem;
  border: 2px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  font-family: inherit;
  background-color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    border-color: ${props => props.$hasError ? '#ef4444' : '#cbd5e1'};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  option {
    padding: 0.5rem;
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const VecnaSpravnostPanel = styled.div`
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #86efac;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
`;

const VecnaSpravnostTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #166534;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 2px solid #d1fae5;
  transition: all 0.2s ease;

  &:hover {
    border-color: #86efac;
    background: #f0fdf4;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  strong {
    color: #166534;
    font-size: 1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e5e7eb;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.875rem 1.75rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;

  ${props => props.$variant === 'primary' && `
    background: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
  `}

  ${props => props.$variant === 'secondary' && `
    background: #f1f5f9;
    color: #475569;

    &:hover {
      background: #e2e8f0;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`;

const OrderPreviewCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
`;

const OrderHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const OrderNumber = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
`;

const OrderBadge = styled.span`
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => props.$color || '#64748b'};
  color: white;
`;

const OrderDetailRow = styled.div`
  display: flex;
  margin-bottom: 12px;
  gap: 12px;
`;

const OrderDetailLabel = styled.div`
  font-weight: 600;
  color: #64748b;
  min-width: 140px;
  font-size: 0.9rem;
`;

const OrderDetailValue = styled.div`
  color: #1e293b;
  flex: 1;
  font-size: 0.9rem;
`;

const LoadingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #64748b;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorAlert = styled.div`
  background: #fef2f2;
  border: 2px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HelpText = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.5rem;
  font-style: italic;
`;

const FieldError = styled.div`
  font-size: 0.85rem;
  color: #dc2626;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 500;
`;

// Autocomplete styled components
const AutocompleteWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const AutocompleteInput = styled(Input)`
  padding-right: 2.5rem;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  font-size: 0.75rem;
  opacity: 0.6;

  &:hover {
    color: #94a3b8;
    opacity: 1;
  }

  &:active {
    transform: translateY(-50%) scale(0.9);
  }
`;

const AutocompleteDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 150%;
  max-height: 400px;
  overflow-y: auto;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
`;

const OrderSuggestionItem = styled.div`
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s ease;

  &:hover {
    background: #eff6ff;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const OrderSuggestionTitle = styled.div`
  font-weight: 600;
  color: #1e40af;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
`;

const OrderSuggestionDetail = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.25rem;
`;

const OrderSuggestionBadge = styled.span`
  background: ${props => props.$color || '#e5e7eb'};
  color: ${props => props.$textColor || '#374151'};
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const NoResults = styled.div`
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.9rem;
`;

const SearchingSpinner = styled.div`
  padding: 1rem;
  text-align: center;
  color: #6b7280;
`;

// ===================================================================
// PROGRESS MODAL - Modální okno pro zobrazení průběhu ukládání
// ===================================================================

const ProgressOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100010;
  animation: fadeIn 0.2s ease-in;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ProgressModal = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ProgressHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ProgressIconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: ${props => {
    if (props.status === 'success') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    if (props.status === 'error') return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
  }};
  color: white;
  animation: ${props => props.status === 'loading' ? 'pulse 2s ease-in-out infinite' : 'none'};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

const ProgressTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
`;

const ProgressMessage = styled.div`
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const ProgressBarWrapper = styled.div`
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
  border-radius: 4px;
  transition: width 0.3s ease-out;
  width: ${props => props.progress || 0}%;
  background-size: 200% 100%;
  animation: shimmer 2s infinite;

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const ProgressActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const ProgressButton = styled.button`
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  background: ${props => props.variant === 'primary' ? '#3b82f6' : '#e5e7eb'};
  color: ${props => props.variant === 'primary' ? 'white' : '#374151'};

  &:hover {
    background: ${props => props.variant === 'primary' ? '#2563eb' : '#d1d5db'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Multi-select komponenta pro střediska
const MultiSelectWrapper = styled.div`
  position: relative;
  width: 100%;
  z-index: ${props => props.isOpen ? 10000 : 1};
`;

const MultiSelectButton = styled.div`
  width: 100%;
  box-sizing: border-box;
  height: 48px;
  padding: 1px 2.5rem 1px 0.875rem;
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e2e8f0'};
  border-radius: 8px;
  font-size: 0.95rem;
  background: ${props => props.disabled ? '#f1f5f9' : '#ffffff'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  color: ${props => {
    if (props.disabled) return '#6b7280';
    if (props.placeholder || !props.value || props.value === '') return '#94a3af';
    return '#1f2937';
  }};
  font-weight: ${props => props.disabled ? '400' : (props.value && props.value !== '' && props.placeholder !== "true" ? '600' : '400')};
  display: flex;
  align-items: center;
  position: relative;
  transition: all 0.2s ease;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  background-image: ${props => {
    if (props.disabled) {
      return props.isOpen
        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E")`
        : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;
    } else if (props.hasError) {
      return props.isOpen
        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b91c1c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E")`
        : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b91c1c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;
    } else {
      return props.isOpen
        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='18 15 12 9 6 15'%3E%3C/polyline%3E%3C/svg%3E")`
        : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;
    }
  }};
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px 12px;

  &:hover {
    border-color: ${props => props.disabled ? '#e2e8f0' : (props.hasError ? '#dc2626' : '#cbd5e1')};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }
`;

const SelectedValue = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${props => props.isEmpty ? '#9ca3af' : '#1f2937'};
  font-weight: ${props => props.isEmpty ? '400' : '600'};
`;

const MultiSelectDropdown = styled.div`
  position: fixed;
  z-index: 40;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  min-width: 200px;
  user-select: none;
  scroll-behavior: auto;
  contain: layout style paint;
  will-change: scroll-position;
  transform: translateZ(0);
  scrollbar-width: thin;
  scrollbar-color: #d1d5db #f9fafb;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f9fafb;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

const SearchBox = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
`;

const MultiSelectOption = styled.div`
  padding: ${props => props.level === 0 ? '0.75rem' : '0.5rem 0.75rem 0.5rem 2rem'};
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props => props.level === 0 ? '#f9fafb' : '#ffffff'};
  border-bottom: ${props => props.level === 0 ? '2px solid #e5e7eb' : '1px solid #f3f4f6'};
  font-weight: ${props => props.level === 0 ? '600' : '400'};
  color: ${props => props.level === 0 ? '#111827' : '#4b5563'};
  position: relative;
  will-change: transform;
  backface-visibility: hidden;
  outline: none;

  &:hover {
    background: ${props => props.level === 0 ? '#f3f4f6' : '#f8fafc'};
  }

  &:focus {
    background: #dbeafe;
    box-shadow: inset 0 0 0 2px #3b82f6;
  }

  &:last-child {
    border-bottom: none;
  }

  input[type="checkbox"] {
    margin: 0;
    pointer-events: none;
  }

  span {
    padding-left: ${props => (props.level || 0) * 20}px;
    font-weight: ${props => (props.level || 0) === 0 ? '600' : '400'};
  }
`;

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function InvoiceEvidencePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams(); // URL param
  const { token, username, user_id, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const { setProgress } = useContext(ProgressContext) || {};

  // 📚 LP Kódy pro čerpání 
  const dictionaries = useDictionaries({ token, username, showToast });

  // Kontrola oprávnění - uživatelé s MANAGE právy nebo ADMIN role vidí všechny objednávky
  // hasPermission('ADMIN') kontroluje SUPERADMIN NEBO ADMINISTRATOR (speciální alias v AuthContext)
  const canViewAllOrders = hasPermission('INVOICE_MANAGE') || 
                           hasPermission('ORDER_MANAGE') || 
                           hasPermission('ADMIN');

  // Helper: získání finálního stavu objednávky
  const getCurrentWorkflowState = useCallback((order) => {
    if (!order || !order.stav_workflow_kod) {
      return null;
    }

    let stavKody = [];
    try {
      if (typeof order.stav_workflow_kod === 'string') {
        stavKody = JSON.parse(order.stav_workflow_kod);
      } else if (Array.isArray(order.stav_workflow_kod)) {
        stavKody = order.stav_workflow_kod;
      }
    } catch (e) {
      return null;
    }

    return stavKody.length > 0 ? stavKody[stavKody.length - 1] : null;
  }, []);

  // Helper: kontrola zda lze přidat fakturu k objednávce (musí být ve stavu FAKTURACE, VECNA_SPRAVNOST nebo ZKONTROLOVANA)
  const canAddInvoiceToOrder = useCallback((order) => {
    if (!order || !order.stav_workflow_kod) {
      return { allowed: false, reason: 'Objednávka nemá definovaný stav' };
    }

    // stav_workflow_kod je JSON array stringů - obsahuje celou historii workflow
    let stavKody = [];
    try {
      if (typeof order.stav_workflow_kod === 'string') {
        stavKody = JSON.parse(order.stav_workflow_kod);
      } else if (Array.isArray(order.stav_workflow_kod)) {
        stavKody = order.stav_workflow_kod;
      }
    } catch (e) {
      return { allowed: false, reason: 'Chyba při parsování stavu objednávky' };
    }

    // ✅ DŮLEŽITÉ: Bereme pouze POSLEDNÍ stav (finální stav objednávky)
    const currentState = stavKody.length > 0 ? stavKody[stavKody.length - 1] : null;
    
    if (!currentState) {
      return { allowed: false, reason: 'Objednávka nemá definovaný aktuální stav' };
    }

    // Povolené stavy pro fakturaci
    // NEUVEREJNIT - objednávka NEBUDE zveřejněna (nezáznamná objednávka)
    // UVEREJNENA - objednávka zveřejněna v registru
    // FAKTURACE - první faktura byla přidána
    // VECNA_SPRAVNOST - čeká na kontrolu věcné správnosti
    // ZKONTROLOVANA - věcná správnost byla zkontrolována
    // ❌ KE_ZVEREJNENI - čeká na úvodní zveřejnění, faktury ještě NELZE přidat
    // ❌ POTVRZENA - přechází automaticky na NEUVEREJNIT/UVEREJNENA
    // ❌ DOKONCENA - konečný stav, nelze přidávat faktury
    const allowedStates = ['NEUVEREJNIT', 'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA'];
    
    if (!allowedStates.includes(currentState)) {
      return { 
        allowed: false, 
        reason: `Fakturaci lze přidat pouze k objednávkám ve stavu: NEUVEŘEJNIT, UVEŘEJNĚNA, FAKTURACE, VĚCNÁ SPRÁVNOST nebo ZKONTROLOVANÁ. Aktuální stav: ${currentState}`
      };
    }

    return { allowed: true, reason: null };
  }, []);

  // 🎨 Readonly režim pro omezené účty
  const isReadOnlyMode = !hasPermission('INVOICE_MANAGE') && hasPermission('INVOICE_MATERIAL_CORRECTNESS');

  // �📂 Collapsible sections state
  const [sectionStates, setSectionStates] = useState(() => {
    // Default stavy
    const defaultStates = {
      invoiceData: true, // vždy rozvinutá při načtení
      materialCorrectness: !hasPermission('INVOICE_MANAGE') // rozvinuto pouze pro uživatele bez INVOICE_MANAGE
    };

    // Zkusit načíst z localStorage při první inicializaci
    try {
      const savedSections = localStorage.getItem(`invoiceSections_${user_id}`);
      if (savedSections) {
        const parsed = JSON.parse(savedSections);
        return { ...defaultStates, ...parsed };
      }
    } catch (e) {
      console.warn('⚠️ Chyba při načítání stavu sekcí z localStorage:', e);
    }

    return defaultStates;
  });

  // Toggle funkce pro sekce
  const toggleSection = useCallback((sectionName) => {
    setSectionStates(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  }, []);

  // State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [smlouvaData, setSmlouvaData] = useState(null);
  const [selectedType, setSelectedType] = useState('order'); // 'order' nebo 'smlouva'
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Autocomplete state - univerzální pro objednávky i smlouvy
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]); // Změněno z orderSuggestions
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Ref pro OrderFormReadOnly
  const orderFormRef = useRef(null);
  
  // State pro sledování collapse stavu
  const [hasAnySectionCollapsed, setHasAnySectionCollapsed] = useState(false);
  
  // State pro sledování editace faktury (localStorage se načte v useEffect)
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  
  // 🆕 Flag: Je to PŮVODNÍ EDITACE faktury (načtená z location.state, localStorage)?
  // Rozlišuje původní editaci od nové faktury, kde se ID vytvoří jen pro upload příloh
  const [isOriginalEdit, setIsOriginalEdit] = useState(false);
  
  // 🆕 Flag: Faktura byla POTVRZENA uživatelem (kliknutí na Zaevidovat)
  // Tento flag se NENASTAVÍ při auto-vytvoření faktury při uploadu přílohy
  const [invoiceUserConfirmed, setInvoiceUserConfirmed] = useState(false);

  // ✅ Ref pro sledování resetu - blokuje useEffect během reset operace
  // POZNÁMKA: Tento pattern je OK - ref slouží jako synchronizační mechanismus
  const isResettingRef = useRef(false);
  
  // 🚫 Flag pro prevenci localStorage reload po úspěšném UPDATE/CREATE
  const [justCompletedOperation, setJustCompletedOperation] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });
  
  // 🔒 State pro LOCK dialog system
  const [showLockedOrderDialog, setShowLockedOrderDialog] = useState(false);
  const [lockedOrderInfo, setLockedOrderInfo] = useState(null);

  // State pro unlock entity (změna objednávky/smlouvy u existující FA)
  const [isEntityUnlocked, setIsEntityUnlocked] = useState(false);
  // State pro zapamatování, zda měla faktura původně přiřazenou objednávku/smlouvu
  const [hadOriginalEntity, setHadOriginalEntity] = useState(false);

  // 🎯 Progress Modal State - zobrazení průběhu ukládání
  const [progressModal, setProgressModal] = useState({
    show: false,
    status: 'loading', // 'loading' | 'success' | 'error'
    progress: 0,
    title: '',
    message: ''
  });

  // Spisovka Inbox Panel - pouze pro ADMIN
  const [spisovkaInboxOpen, setSpisovkaInboxOpen] = useState(false);
  const [spisovkaInboxState, setSpisovkaInboxState] = useState({
    x: Math.max(0, window.innerWidth - 750), // Snap doprava, min 0 (nesmí být záporné)
    y: 144, // Pod fixed header (96px) + menubar (48px)
    w: 750, // Šířka jako náhled faktury
    h: Math.max(400, window.innerHeight - 144 - 54), // Mezi header+menubar a footer
    minimized: false
  });
  const [spisovkaTodayCount, setSpisovkaTodayCount] = useState(0);
  const [spisovkaLastRecords, setSpisovkaLastRecords] = useState([]);
  const [showSpisovkaTooltip, setShowSpisovkaTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipButtonRef = useRef(null);
  
  // 📋 Callback pro refresh Spisovka panelu po označení dokumentu
  const [spisovkaRefreshCounter, setSpisovkaRefreshCounter] = useState(0);
  const handleSpisovkaRefresh = useCallback(() => {
    setSpisovkaRefreshCounter(prev => prev + 1);
  }, []);

  // 🔄 Resize handler - kontrola pozice panelu při změně velikosti okna
  useEffect(() => {
    const handleResize = () => {
      setSpisovkaInboxState(prev => {
        // Kontrola, zda panel není mimo viditelnou oblast
        const maxX = window.innerWidth - prev.w - 20;
        const maxY = window.innerHeight - prev.h - 20;
        
        return {
          ...prev,
          x: Math.min(Math.max(20, prev.x), maxX),
          y: Math.min(Math.max(20, prev.y), maxY)
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // ✅ OPRAVENO: Ponecháme [] ale používáme functional update

  // Form data - inicializace s výchozími hodnotami (localStorage se načte v useEffect)
  const [formData, setFormData] = useState({
    order_id: orderId || '',
    smlouva_id: null,
    fa_cislo_vema: '',
    fa_typ: 'BEZNA',
    fa_datum_doruceni: formatDateForPicker(new Date()),
    fa_datum_vystaveni: '',
    fa_datum_splatnosti: '',
    fa_castka: '',
    fa_poznamka: '',
    fa_strediska_kod: [],
    fa_predana_zam_id: null,
    fa_datum_predani_zam: '',
    fa_datum_vraceni_zam: '',
    // Věcná kontrola
    vecna_spravnost_umisteni_majetku: '',
    vecna_spravnost_poznamka: '',
    vecna_spravnost_potvrzeno: 0,
    potvrdil_vecnou_spravnost_id: null,
    dt_potvrzeni_vecne_spravnosti: ''
  });

  // Přílohy faktury - inicializace prázdná (localStorage se načte v useEffect)
  const [attachments, setAttachments] = useState([]);
  
  // 🔄 Flag pro sledování zda už bylo načteno z localStorage (zabránit opakovanému načítání)
  const [lsLoaded, setLsLoaded] = useState(false);

  // 🔥 LP čerpání (Limitované přísliby) - např. [{lp_cislo: '6', lp_id: 6, castka: 50000, poznamka: ''}]
  const [lpCerpani, setLpCerpani] = useState([]);
  const [lpCerpaniLoaded, setLpCerpaniLoaded] = useState(false);
  // ✅ Flag pro kontrolu zda POVOLIT auto-save do localStorage
  // Když uživatel klikne "Zrušit úpravu", nastaví se na false aby se data znovu neuložila
  const [allowLSSave, setAllowLSSave] = useState(true);

  // 📋 SPISOVKA METADATA - pomocná proměnná pro tracking (uloží se při drag & drop ze Spisovky)
  // Používáme useRef místo useState, aby se metadata neztrácela v closure callbacků
  const pendingSpisovkaMetadataRef = useRef(null);

  // CustomSelect states
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState({});

  // Střediska options
  const [strediskaOptions, setStrediskaOptions] = useState([]);
  const [strediskaLoading, setStrediskaLoading] = useState(false);

  // Typy faktur (klasifikace příloh) - FAKTURA_TYP
  const [typyFakturOptions, setTypyFakturOptions] = useState([]);
  const [typyFakturLoading, setTypyFakturLoading] = useState(false);
  
  // Typy faktur pro pole fa_typ - FAKTURA (BEZNA, ZALOHOVA, ...)
  const [invoiceTypesOptions, setInvoiceTypesOptions] = useState([]);
  const [invoiceTypesLoading, setInvoiceTypesLoading] = useState(false);
  
  // Zaměstnanci options (pro předání FA)
  const [zamestnanci, setZamestnanci] = useState([]);
  const [zamestnanciLoading, setZamestnanciLoading] = useState(false);
  
  // Tracking změn kritických polí
  const [originalFormData, setOriginalFormData] = useState(null);
  const [hasChangedCriticalField, setHasChangedCriticalField] = useState(false);

  // 🆕 Detekce změny POUZE polí věcné správnosti (pro readonly uživatele)
  const hasChangedVecnaSpravnost = useMemo(() => {
    if (!editingInvoiceId || !originalFormData) return false;
    
    const vecnaSpravnostFields = [
      'umisteni_majetku',
      'poznamka_vecne_spravnosti',
      'vecna_spravnost_potvrzeno',
      'potvrdil_vecnou_spravnost_id',
      'datum_potvrzeni_vecne_spravnosti'
    ];
    
    return vecnaSpravnostFields.some(field => {
      const original = originalFormData[field];
      const current = formData[field];
      return original !== current;
    });
  }, [formData, originalFormData, editingInvoiceId]);

  // 🔒 Zjistit, zda je objednávka ve stavu DOKONČENA (již nelze provádět věcnou kontrolu)
  const isOrderCompleted = useMemo(() => {
    if (!orderData || !orderData.stav_workflow_kod) return false;
    
    let stavKody = [];
    try {
      if (typeof orderData.stav_workflow_kod === 'string') {
        stavKody = JSON.parse(orderData.stav_workflow_kod);
      } else if (Array.isArray(orderData.stav_workflow_kod)) {
        stavKody = orderData.stav_workflow_kod;
      }
    } catch (e) {
      return false;
    }
    
    const currentState = stavKody.length > 0 ? stavKody[stavKody.length - 1] : null;
    return currentState === 'DOKONCENA';
  }, [orderData]);

  // 🔒 Zjistit, zda lze fakturu editovat (stejná logika jako disable na tlačítku Aktualizovat)
  const isInvoiceEditable = useMemo(() => {
    // Readonly režim - nemůže editovat
    if (isReadOnlyMode) return false;
    
    // Pokud je faktura přiřazena k objednávce a objednávka neumožňuje přidání faktury
    if (formData.order_id && orderData && !canAddInvoiceToOrder(orderData).allowed) return false;
    
    // 🔥 OPRAVA: Běžný uživatel (s INVOICE_MANAGE) nemůže editovat fakturu po schválení věcné správnosti
    // Pouze admin (INVOICE_MANAGE_ALL) může editovat i po schválení
    if (formData.vecna_spravnost_potvrzeno === 1 && !hasPermission('INVOICE_MANAGE_ALL')) {
      return false;
    }
    
    return true;
  }, [isReadOnlyMode, formData.order_id, formData.vecna_spravnost_potvrzeno, orderData, canAddInvoiceToOrder, hasPermission]);

  // 🆕 SEPARÁTNÍ LOGIKA PRO SEKCI VĚCNÉ SPRÁVNOSTI
  // Věcná správnost JE editovatelná dokud NENÍ potvrzena V DATABÁZI
  // Po potvrzení (originalFormData.vecna_spravnost_potvrzeno === 1 V DB) se ZAMKNE
  // 🔥 DŮLEŽITÉ: Kontrolujeme PŮVODNÍ stav z DB, ne aktuální formData!
  //             Změny se projeví až po uložení do DB a reload
  const isVecnaSpravnostEditable = useMemo(() => {
    // Musí mít alespoň jedno z těchto oprávnění:
    // - INVOICE_MANAGE (plný přístup k fakturám)
    // - INVOICE_MATERIAL_CORRECTNESS (pouze věcná správnost)
    const hasAnyPermission = hasPermission('INVOICE_MANAGE') || hasPermission('INVOICE_MATERIAL_CORRECTNESS');
    if (!hasAnyPermission) {
      return false; // Bez permission vůbec nemůže editovat
    }
    
    // 🔥 KLÍČOVÁ ZMĚNA: Kontrolujeme PŮVODNÍ stav z DB, ne aktuální formData
    // Pokud už JE potvrzena věcná správnost V DATABÁZI → ZAMČENO (kromě INVOICE_MANAGE_ALL)
    const vecnaPotvrzenaVDB = originalFormData?.vecna_spravnost_potvrzeno === 1;
    if (vecnaPotvrzenaVDB && !hasPermission('INVOICE_MANAGE_ALL')) {
      return false;
    }
    
    // Pokud je objednávka dokončená → ZAMČENO
    if (isOrderCompleted) return false;
    
    // Jinak ODEMČENO
    return true;
  }, [originalFormData, isOrderCompleted, hasPermission]);

  // � Načítání LP číselníků při mount
  useEffect(() => {
    if (!token || !username) return;
    
    dictionaries.loadAll();
  }, [token, username]); // eslint-disable-line react-hooks/exhaustive-deps

  // �💾 AUTO-SAVE všech dat do localStorage při změně (per-user pomocí user_id)
  // Sloučení všech AUTO-SAVE operací do jednoho useEffect pro efektivitu
  useEffect(() => {
    if (!lsLoaded || !user_id || !allowLSSave) return; // ✅ OPRAVENO: Kontrola allowLSSave flagu
    
    try {
      localStorage.setItem(`invoiceForm_${user_id}`, JSON.stringify(formData));
      localStorage.setItem(`invoiceAttach_${user_id}`, JSON.stringify(attachments));
      
      if (editingInvoiceId) {
        localStorage.setItem(`invoiceEdit_${user_id}`, JSON.stringify(editingInvoiceId));
      } else {
        localStorage.removeItem(`invoiceEdit_${user_id}`);
      }
      
      localStorage.setItem(`invoiceOrigEntity_${user_id}`, JSON.stringify(hadOriginalEntity));
      
      // 🆕 Uložit LP čerpání
      if (lpCerpani && Array.isArray(lpCerpani) && lpCerpani.length > 0) {
        localStorage.setItem(`invoiceLpCerpani_${user_id}`, JSON.stringify(lpCerpani));
      } else {
        localStorage.removeItem(`invoiceLpCerpani_${user_id}`);
      }
      
      // 🆕 Uložit stav sekcí (sbalené/rozbalené)
      localStorage.setItem(`invoiceSections_${user_id}`, JSON.stringify(sectionStates));
    } catch (err) {
      console.warn('❌ Chyba při ukládání do localStorage:', err);
    }
  }, [formData, attachments, editingInvoiceId, hadOriginalEntity, lpCerpani, sectionStates, user_id, lsLoaded, allowLSSave]); // ✅ Přidáno lpCerpani, sectionStates

  // 🔄 NOVÝ: Načtení dat z localStorage při mount (pouze jednou, po získání user_id)
  useEffect(() => {
    if (!user_id || lsLoaded || isResettingRef.current) return;
    
    // Detekce fresh navigation pomocí sessionStorage
    // Při kliknutí na "Zaevidovat fakturu" nastavíme flag, který zůstane až do zavření tabu
    const freshNavigationFlag = sessionStorage.getItem('invoice_fresh_navigation');
    const isEditingExisting = location.state?.editInvoiceId;
    const isLoadingOrder = location.state?.orderIdForLoad;
    const isLoadingSmlouva = location.state?.smlouvaIdForLoad;
    
    // Vymažeme flag po použití (jednorázový)
    if (freshNavigationFlag) {
      sessionStorage.removeItem('invoice_fresh_navigation');
    }
    
    // Skip localStorage pouze když:
    // 1. Je freshNavigationFlag (právě kliknuto na "Zaevidovat") NEBO
    // 2. Editujeme existující fakturu NEBO  
    // 3. Načítáme fakturu z objednávky/smlouvy NEBO
    // 4. Právě proběhla úspěšná operace (UPDATE/CREATE)
    const shouldSkipLS = freshNavigationFlag || isEditingExisting || isLoadingOrder || isLoadingSmlouva || justCompletedOperation;
    
    if (shouldSkipLS) {
      setLsLoaded(true);
      return;
    }
    
    try {
      // Načíst editingInvoiceId
      const savedEditId = localStorage.getItem(`invoiceEdit_${user_id}`);
      if (savedEditId) {
        setEditingInvoiceId(JSON.parse(savedEditId));
        // 🆕 Pokud je uloženo editingInvoiceId, nastavit i invoiceUserConfirmed
        // (protože to znamená, že faktura byla již potvrzena)
        setInvoiceUserConfirmed(true);
        setIsOriginalEdit(true);
      }
      
      // Načíst hadOriginalEntity
      const savedOrigEntity = localStorage.getItem(`invoiceOrigEntity_${user_id}`);
      if (savedOrigEntity) {
        setHadOriginalEntity(JSON.parse(savedOrigEntity));
      }
      
      // 🆕 Načíst LP čerpání
      const savedLpCerpani = localStorage.getItem(`invoiceLpCerpani_${user_id}`);
      if (savedLpCerpani) {
        try {
          const parsed = JSON.parse(savedLpCerpani);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLpCerpani(parsed);
          }
        } catch (e) {
          console.warn('⚠️ Chyba při parsování LP čerpání z localStorage:', e);
        }
      }
      
      // Načíst formData
      const savedForm = localStorage.getItem(`invoiceForm_${user_id}`);
      if (savedForm) {
        const parsed = JSON.parse(savedForm);
        setFormData(parsed);
      }
      
      // Načíst attachments
      const savedAttach = localStorage.getItem(`invoiceAttach_${user_id}`);
      if (savedAttach) {
        setAttachments(JSON.parse(savedAttach));
      }
    } catch (err) {
      console.warn('⚠️ Chyba při načítání dat z localStorage:', err);
    }
    
    setLsLoaded(true);
  }, [user_id, lsLoaded]);

  // Načtení středisek, typů faktur a zaměstnanců při mount (pouze jednou!)
  useEffect(() => {
    // ✅ Načíst data pouze jednou, při prvním mount
    if (!token || !username || strediskaOptions.length > 0) return; // Skip pokud už jsou načtena
    
    // 🚀 Paralelní načtení všech číselníků najednou
    setStrediskaLoading(true);
    setTypyFakturLoading(true);
    setInvoiceTypesLoading(true);
    setZamestnanciLoading(true);
    
    const loadAllCiselniky = async () => {
      try {
        // ⚡ Paralelní volání všech API najednou
        const [strediskaData, typyFakturData, invoiceTypesData, usersData] = await Promise.all([
          getStrediska25({ token, username }),
          getTypyFaktur25({ token, username, aktivni: 1 }),
          getInvoiceTypes25({ token, username, aktivni: 1 }),
          fetchAllUsers({ token, username, show_inactive: true })
        ]);
        
        // ✅ Zpracovat střediska
        if (strediskaData && Array.isArray(strediskaData)) {
          setStrediskaOptions(strediskaData);
        }
        
        // ✅ Zpracovat typy faktur (klasifikace příloh - FAKTURA_TYP)
        if (typyFakturData && Array.isArray(typyFakturData)) {
          setTypyFakturOptions(typyFakturData);
        }
        
        // ✅ Zpracovat typy faktur pro fa_typ pole (FAKTURA - BEZNA, ZALOHOVA, ...)
        if (invoiceTypesData && Array.isArray(invoiceTypesData)) {
          setInvoiceTypesOptions(invoiceTypesData);
        }
        
        // ✅ Zpracovat zaměstnance
        if (usersData && Array.isArray(usersData)) {
          const aktivni = usersData
            .filter(u => u.aktivni === 1)
            .sort((a, b) => {
              const aName = `${a.prijmeni || ''} ${a.jmeno || ''}`.trim();
              const bName = `${b.prijmeni || ''} ${b.jmeno || ''}`.trim();
              return aName.localeCompare(bName, 'cs');
            });
          setZamestnanci(aktivni);
        }
        
      } catch (err) {
        console.error('Chyba při načítání číselníků:', err);
      } finally {
        setStrediskaLoading(false);
        setTypyFakturLoading(false);
        setInvoiceTypesLoading(false);
        setZamestnanciLoading(false);
      }
    };
    
    loadAllCiselniky();
  }, [token, username]); // ✅ Ale jen pokud se změní token/username

  // Detekce změny kritických polí faktury
  // Varování má smysl POUZE pokud:
  // 1. FA MĚLA přiřazenou OBJ nebo SML (ne NULL)
  // 2. FA NEBYLA předána zaměstnanci
  // 3. Věcná správnost JIŽ BYLA PROVEDENA (vecna_spravnost_potvrzeno = 1)
  useEffect(() => {
    if (!editingInvoiceId || !originalFormData) return;
    
    // Kontrola podmínek pro zobrazení varování
    const hadOrderOrContract = originalFormData.order_id || originalFormData.smlouva_id;
    const wasNotHandedToEmployee = !originalFormData.fa_predana_zam_id;
    const wasAlreadyApproved = originalFormData.vecna_spravnost_potvrzeno === 1;
    
    // Varování zobrazit jen pokud jsou splněny všechny podmínky
    if (!hadOrderOrContract || !wasNotHandedToEmployee || !wasAlreadyApproved) {
      setHasChangedCriticalField(false);
      return;
    }
    
    const criticalFields = [
      'fa_castka',
      'fa_cislo_vema',
      'fa_strediska_kod',
      'fa_typ',
      'fa_datum_vystaveni',
      'fa_datum_splatnosti',
      'fa_datum_doruceni'
    ];
    
    const hasChanged = criticalFields.some(field => {
      const original = originalFormData[field];
      const current = formData[field];
      
      // Speciální handling pro array (střediska)
      if (Array.isArray(original) && Array.isArray(current)) {
        return JSON.stringify(original.sort()) !== JSON.stringify(current.sort());
      }
      
      return original !== current;
    });
    
    setHasChangedCriticalField(hasChanged);
  }, [formData, originalFormData, editingInvoiceId]);

  // Načtení faktury při editaci (z location.state nebo localStorage)
  // Flag aby se effect spustil jen jednou po načtení středisek
  const hasLoadedInvoiceRef = useRef(false);
  
  useEffect(() => {
    // ✅ Skip loading podczas resetowania
    if (isResettingRef.current) return;
    
    const loadInvoiceForEdit = async () => {
      // ✅ ID faktury může přijít z location.state NEBO z editingInvoiceId (localStorage po F5)
      const editIdToLoad = location.state?.editInvoiceId || editingInvoiceId;
      const orderIdForLoad = location.state?.orderIdForLoad;
      
      if (!editIdToLoad || !token || !username) {
        return;
      }
      
      // ✅ Počkat na načtení středisek (potřebujeme je pro mapování)
      if (strediskaOptions.length === 0) {
        return;
      }
      
      // ✅ Pokud už jsme fakturu načetli, skip (prevence duplicitního načítání)
      if (hasLoadedInvoiceRef.current && editingInvoiceId === editIdToLoad) {
        return;
      }
      
      // ⚠️ NOVÝ FIX: Pokud máme pending/uploading přílohy, NEPŘEPISOVAT state
      // (faktura se právě vytváří a nahrávají se k ní přílohy)
      const hasPendingAttachments = attachments.some(att => 
        att.status === 'pending_upload' || att.status === 'uploading'
      );
      if (hasPendingAttachments) {
        // Jen aktualizovat editingInvoiceId pro příští upload
        setEditingInvoiceId(editIdToLoad);
        return;
      }
      
      // ✅ Označit že načítáme fakturu
      hasLoadedInvoiceRef.current = true;
      
      setLoading(true);
      setEditingInvoiceId(editIdToLoad);
      // ✅ Nastavit invoiceUserConfirmed na true - načítáme existující fakturu
      setInvoiceUserConfirmed(true);
      setIsOriginalEdit(true);
      setIsOriginalEdit(true);
      
      try {
        // Načíst data faktury
        const invoiceData = await getInvoiceById25({ token, username, id: editIdToLoad });
        
        // Naplnit formulář daty faktury
        if (invoiceData) {
          // Parse středisek pokud jsou string - STEJNĚ JAKO OrderForm25
          let strediskaArray = [];
          if (invoiceData.fa_strediska_kod) {
            let parsed = [];
            if (typeof invoiceData.fa_strediska_kod === 'string') {
              try {
                parsed = JSON.parse(invoiceData.fa_strediska_kod);
              } catch (e) {
                console.warn('Chyba při parsování středisek:', e);
              }
            } else if (Array.isArray(invoiceData.fa_strediska_kod)) {
              parsed = invoiceData.fa_strediska_kod;
            }
            
            // MultiSelect očekává array STRINGŮ (values), ne objektů!
            // Pouze ověřit, že codes existují v options
            strediskaArray = parsed.map(item => {
              // Pokud je to string, vrátit ho (to je správný formát)
              if (typeof item === 'string') {
                // Ověřit, že existuje v options
                const exists = strediskaOptions.find(opt => opt.value === item);
                if (!exists) {
                  console.warn(`⚠️ Středisko ${item} není v options (neaktivní)`);
                }
                return item;
              }
              // Pokud je to objekt, extrahovat value
              if (typeof item === 'object' && item.value) {
                return item.value;
              }
              // Fallback
              return item;
            });
          }
          
          const loadedFormData = {
            order_id: invoiceData.objednavka_id || '',
            smlouva_id: invoiceData.smlouva_id || null,
            fa_cislo_vema: invoiceData.fa_cislo_vema || '',
            fa_typ: invoiceData.fa_typ || 'BEZNA',
            fa_datum_doruceni: formatDateForPicker(invoiceData.fa_datum_doruceni),
            fa_datum_vystaveni: formatDateForPicker(invoiceData.fa_datum_vystaveni),
            fa_datum_splatnosti: formatDateForPicker(invoiceData.fa_datum_splatnosti),
            fa_castka: invoiceData.fa_castka || '',
            fa_poznamka: invoiceData.fa_poznamka || '',
            fa_strediska_kod: strediskaArray,
            file: null, // Přílohy se nenačítají při editaci
            // Nové položky
            fa_predana_zam_id: invoiceData.fa_predana_zam_id || null,
            fa_datum_predani_zam: formatDateForPicker(invoiceData.fa_datum_predani_zam),
            fa_datum_vraceni_zam: formatDateForPicker(invoiceData.fa_datum_vraceni_zam),
            // Věcná kontrola
            vecna_spravnost_umisteni_majetku: invoiceData.vecna_spravnost_umisteni_majetku || '',
            vecna_spravnost_poznamka: invoiceData.vecna_spravnost_poznamka || '',
            vecna_spravnost_potvrzeno: invoiceData.vecna_spravnost_potvrzeno || 0,
            potvrdil_vecnou_spravnost_id: invoiceData.potvrdil_vecnou_spravnost_id || null,
            dt_potvrzeni_vecne_spravnosti: invoiceData.dt_potvrzeni_vecne_spravnosti || ''
          };
          
          // 🚀 BATCH všechny setState operace najednou (méně re-renderů)
          unstable_batchedUpdates(() => {
            setFormData(loadedFormData);
            // Uložit originální data pro detekci změn
            setOriginalFormData(loadedFormData);
            
            // Zapamatovat si, zda měla faktura původně přiřazenou objednávku nebo smlouvu
            const hadEntity = !!(invoiceData.objednavka_id || invoiceData.smlouva_id);
            setHadOriginalEntity(hadEntity);
            localStorage.setItem('hadOriginalEntity', JSON.stringify(hadEntity));
          });
          
          // 📎 NAČÍST PŘÍLOHY FAKTURY (pokud má reálné ID)
          try {
            const { listInvoiceAttachments } = await import('../services/apiOrderV2');
            const attachResponse = await listInvoiceAttachments(
              editIdToLoad,
              username,
              token,
              invoiceData.objednavka_id || null
            );
            const loadedAttachments = attachResponse.data?.data?.attachments || attachResponse.data?.attachments || [];
            // ✅ Přidat aliasy name/size/klasifikace pro kompatibilitu s komponentami
            const mappedAttachments = loadedAttachments.map(att => ({
              ...att,
              name: att.originalni_nazev_souboru,
              size: att.velikost_souboru_b,
              klasifikace: att.typ_prilohy,
              uploadDate: att.dt_vytvoreni
            }));
            setAttachments(mappedAttachments);
          } catch (attErr) {
            console.error('❌ Chyba při načítání příloh faktury:', attErr);
            // Nepřerušujeme načítání faktury
            setAttachments([]);
          }

          // 🆕 LP ČERPÁNÍ: Načíst čerpání LP pokud má objednávku (předběžně načteme, finální check bude až po loadOrderData)
          if (invoiceData.objednavka_id) {
            try {
              const lpResponse = await getFakturaLPCerpani(editIdToLoad, token, username);
              
              // ✅ Backend vrací: { status: "ok", data: { lp_cerpani: [...], suma, fa_castka } }
              if (lpResponse && lpResponse.status === 'ok' && lpResponse.data && lpResponse.data.lp_cerpani) {
                setLpCerpani(lpResponse.data.lp_cerpani);
                setLpCerpaniLoaded(true);
              } else {
                setLpCerpani([]);
                setLpCerpaniLoaded(true);
              }
            } catch (lpError) {
              console.error('❌ Chyba při načítání LP čerpání:', lpError);
              // Nezastavujeme načítání faktury - LP čerpání je bonusová data
              setLpCerpani([]);
              setLpCerpaniLoaded(true);
            }
          }
          
          // Pokud je známa objednávka, načíst ji a nastavit searchTerm
          if (orderIdForLoad || invoiceData.objednavka_id) {
            const orderIdToLoad = orderIdForLoad || invoiceData.objednavka_id;
            await loadOrderData(orderIdToLoad);
            
            // 🚀 BATCH entity-related setState
            unstable_batchedUpdates(() => {
              setSelectedType('order');
              // Nastavit searchTerm pokud máme číslo objednávky
              if (invoiceData.cislo_objednavky) {
                setSearchTerm(invoiceData.cislo_objednavky);
              }
            });
          }
          // Pokud je známa smlouva, načíst ji
          else if (invoiceData.smlouva_id) {
            await loadSmlouvaData(invoiceData.smlouva_id);
            setSelectedType('smlouva');
          }
        }
      } catch (err) {
        console.error('❌ Chyba při načítání faktury:', err);
        showToast?.(err.message || 'Chyba při načítání faktury', { type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    // Spustit pokud existuje editInvoiceId v location.state NEBO v editingInvoiceId (z localStorage)
    const editIdToLoad = location.state?.editInvoiceId || editingInvoiceId;
    if (editIdToLoad && strediskaOptions.length > 0) {
      loadInvoiceForEdit();
    }
  }, [location.state?.editInvoiceId, editingInvoiceId, token, username, strediskaOptions.length]); // ✅ OPRAVENO: sledujeme .length místo celého pole

  // Načtení objednávky při mount nebo změně orderId
  const loadOrderData = useCallback(async (orderIdToLoad) => {
    if (!orderIdToLoad || !token || !username) {
      return;
    }

    // 🚀 BATCH: Initial loading states
    unstable_batchedUpdates(() => {
      setOrderLoading(true);
      setError(null);
    });

    try {
      // 🔒 KROK 1: Zamknout objednávku pro editaci (přidávání faktur)
      await lockOrderV2({ orderId: orderIdToLoad, token, username, force: false });

      // ✅ KROK 2: Načti plná data objednávky s enriched daty (faktury, položky, atd.)
      const orderData = await getOrderV2(orderIdToLoad, token, username, true);

      if (orderData && orderData.id) {
        // 🚀 BATCH: All success state updates together
        unstable_batchedUpdates(() => {
          setOrderData(orderData);
          // Aktualizuj searchTerm aby zobrazoval pouze ev. číslo
          const evCislo = orderData.cislo_objednavky || orderData.evidencni_cislo || `#${orderData.id}`;
          setSearchTerm(evCislo);
        });
      } else {
        setError('Nepodařilo se načíst data objednávky');
        // Odemkni pokud se načtení nezdařilo
        await unlockOrderV2({ orderId: orderIdToLoad, token, username }).catch(e => console.warn('⚠️ Unlock failed:', e));
      }
    } catch (err) {
      console.error('❌ Chyba při načítání objednávky:', err);
      
      // 🔒 Pokud je objednávka zamčená (423), naviguj ZPĚT a zobraz toast
      const is423Error = err?.response?.status === 423 || err?.message?.includes('423') || err?.message?.includes('zamčen');
      
      if (is423Error) {
        setError('Objednávka je zamčená jiným uživatelem');
        showToast && showToast('Objednávka je zamčená jiným uživatelem', 'error');
        setOrderLoading(false);
        // Naviguj zpět na seznam faktur
        setTimeout(() => {
          navigate('/invoices25-list', { replace: true });
        }, 1500);
        return; // ⚠️ Nevolat unlock - není naše!
      }
      
      setError(err.message || 'Chyba při načítání objednávky');
      showToast && showToast(err.message || 'Chyba při načítání objednávky', 'error');
      // ⚠️ Odemkni POUZE pokud to NENÍ 423 (lock error)
      if (!is423Error) {
        await unlockOrderV2({ orderId: orderIdToLoad, token, username }).catch(e => console.warn('⚠️ Unlock failed:', e));
      }
    } finally {
      setOrderLoading(false);
    }
  }, [token, username, showToast]);

  const loadSmlouvaData = useCallback(async (smlouvaId) => {
    if (!smlouvaId || !token || !username) {
      return;
    }

    // 🚀 BATCH: Initial loading states
    unstable_batchedUpdates(() => {
      setOrderLoading(true); // Použijeme stejný loading state
      setError(null);
    });

    try {
      const smlouvaData = await getSmlouvaDetail({ token, username, id: smlouvaId });

      if (smlouvaData) {
        // API vrací data v objektu { smlouva: {...}, objednavky: [], statistiky: {} }
        // Potřebujeme extrahovat jen část smlouva
        const contract = smlouvaData.smlouva || smlouvaData;
        
        // Normalizace dat - přenést všechna data + přidat celý response
        const normalizedData = {
          ...contract,
          // Přidáme objednavky a statistiky z root objektu
          objednavky: smlouvaData.objednavky || [],
          statistiky: smlouvaData.statistiky || {}
        };
        
        // 🚀 BATCH: All success state updates together
        unstable_batchedUpdates(() => {
          setSmlouvaData(normalizedData);
          setSelectedType('smlouva');
        });
        
        // Aktualizuj formData s smlouva_id
        setFormData(prev => ({
          ...prev,
          smlouva_id: normalizedData.id,
          order_id: null // Vyčistit objednávku pokud byla předtím
        }));
        
        // Aktualizuj searchTerm - číslo smlouvy
        const cislo = normalizedData.cislo_smlouvy || `#${normalizedData.id}`;
        setSearchTerm(cislo);
        
        // Vyčistit orderData
        setOrderData(null);
      } else {
        setError('Nepodařilo se načíst data smlouvy - prázdná odpověď z API');
        showToast && showToast('Nepodařilo se načíst data smlouvy', 'error');
      }
    } catch (err) {
      console.error('❌ Chyba při načítání smlouvy:', err);
      setError(err.message || 'Chyba při načítání smlouvy');
      showToast && showToast(err.message || 'Chyba při načítání smlouvy', 'error');
    } finally {
      setOrderLoading(false);
    }
  }, [token, username, showToast]);

  // 🔓 UNLOCK objednávky při unmount komponenty (opuštění stránky)
  useEffect(() => {
    return () => {
      // 🧹 CLEANUP při unmount - kompletní čištění localStorage
      if (user_id) {
        try {
          // InvoiceEvidencePage unmount: Čištění localStorage
          
          // 1. 📋 Invoice form data
          localStorage.removeItem(`invoiceForm_${user_id}`);
          localStorage.removeItem(`invoiceAttach_${user_id}`);
          localStorage.removeItem(`invoiceEdit_${user_id}`);
          localStorage.removeItem(`invoiceOrigEntity_${user_id}`);
          localStorage.removeItem(`invoiceLpCerpani_${user_id}`);
          localStorage.removeItem(`invoiceSections_${user_id}`);
          
          // 2. 🌍 Global flags
          localStorage.removeItem('hadOriginalEntity');
          localStorage.removeItem(`activeOrderEditId_${user_id}`);
          localStorage.removeItem('spisovka_active_dokument');
          
          // 3. 📎 Cache pro objednávky a smlouvy načtené v tomto formuláři
          // (Pokud jsou cache klíče specifické pro invoice page)
          localStorage.removeItem(`invoice_order_cache_${user_id}`);
          localStorage.removeItem(`invoice_smlouva_cache_${user_id}`);
          
        } catch (error) {
          console.error('❌ InvoiceEvidencePage unmount: Chyba při čištění:', error);
        }
      }

      // Cleanup při unmount - odemkni objednávku pokud byla zamčená
      if (formData.order_id && token && username) {
        unlockOrderV2({ orderId: formData.order_id, token, username })
          .catch(err => console.warn('⚠️ Nepodařilo se odemknout objednávku:', err));
      }
    };
  }, [formData.order_id, token, username, user_id]); // Aktuální hodnoty pro unlock a cleanup

  // Načtení objednávky nebo smlouvy z location.state při mount
  useEffect(() => {
    // ✅ Pokud právě probíhá reset, nic nenačítat
    if (isResettingRef.current) {
      return;
    }
    
    const orderIdForLoad = location.state?.orderIdForLoad;
    const smlouvaIdForLoad = location.state?.smlouvaIdForLoad;
    const openMaterialCorrectness = location.state?.openMaterialCorrectness;
    const prefillSearchTerm = location.state?.prefillSearchTerm;

    // 🎯 Pokud přišlo prefillSearchTerm (číslo objednávky z Orders25List), předvyplnit ho
    if (prefillSearchTerm) {
      setSearchTerm(prefillSearchTerm);
      // Po krátkém delay otevřít našeptávač
      setTimeout(() => {
        setShowSuggestions(true);
      }, 300);
    }

    // 🎯 Pokud je příznak openMaterialCorrectness, otevři sekci věcné kontroly a scrollni na ni
    if (openMaterialCorrectness) {
      setSectionStates(prev => ({
        ...prev,
        materialCorrectness: true // Rozvinout sekci věcné kontroly
      }));
      
      // Scroll na sekci věcné kontroly po malém delay (aby se stihla vyrenderovat)
      setTimeout(() => {
        const materialSection = document.querySelector('[data-section="material-correctness"]');
        if (materialSection) {
          materialSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }

    if (orderIdForLoad && token && username) {
      // 🔒 Před načtením zkontrolovat LOCK
      (async () => {
        try {
          const orderCheck = await getOrderV2(orderIdForLoad, token, username, false);
          
          // ⚠️ Blokuj pouze pokud locked=true A NENÍ můj zámek A NENÍ expired
          if (orderCheck?.lock_info?.locked === true && !orderCheck?.lock_info?.is_owned_by_me && !orderCheck?.lock_info?.is_expired) {
            const lockInfo = orderCheck.lock_info;
            const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
            
            // Ulož info o zamčení pro vizuální dialog
            setLockedOrderInfo({
              lockedByUserName,
              lockedByUserEmail: lockInfo.locked_by_user_email || null,
              lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
              lockedAt: lockInfo.locked_at || null,
              lockAgeMinutes: lockInfo.lock_age_minutes || null,
              canForceUnlock: false,
              orderId: orderIdForLoad
            });
            setShowLockedOrderDialog(true);
            // Zůstat na seznamu
            setSelectedType('list');
            return;
          }
          
          // ✅ Není zamčená - načíst
          loadOrderData(orderIdForLoad);
          setSelectedType('order');
          setFormData(prev => ({
            ...prev,
            order_id: orderIdForLoad,
            smlouva_id: null
          }));
        } catch (err) {
          console.warn('⚠️ Chyba při kontrole LOCK:', err);
          // I při chybě zkusit načíst
          loadOrderData(orderIdForLoad);
          setSelectedType('order');
          setFormData(prev => ({
            ...prev,
            order_id: orderIdForLoad,
            smlouva_id: null
          }));
        }
      })();
    } else if (smlouvaIdForLoad && token && username) {
      // Načíst smlouvu
      loadSmlouvaData(smlouvaIdForLoad);
      setSelectedType('smlouva');
      setFormData(prev => ({
        ...prev,
        smlouva_id: smlouvaIdForLoad,
        order_id: null
      }));
    }
  }, [location.state?.orderIdForLoad, location.state?.smlouvaIdForLoad, token, username, loadOrderData, loadSmlouvaData]);

  // 🎯 Auto-scroll na fakturu při načtení dat
  const hasScrolledRef = useRef(false); // ✅ NOVÝ: Flag aby se scroll provedl jen jednou
  
  useEffect(() => {
    // ✅ Skip scrolling tijekom resetovanja  
    if (isResettingRef.current) return;
    
    if (editingInvoiceId && orderData && !orderLoading && orderFormRef.current && !hasScrolledRef.current) {
      // Rozbalit sekci faktur
      orderFormRef.current.expandSectionByName?.('faktury');
      
      // Scroll na konkrétní fakturu
      const facturaElement = document.querySelector(`[data-invoice-id="${editingInvoiceId}"]`);
      if (facturaElement) {
        facturaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledRef.current = true; // ✅ Označit jako hotové
      }
    }
  }, [editingInvoiceId, orderData, orderLoading]);

  // Search objednávek a smluv pro autocomplete
  const searchEntities = useCallback(async (search) => {
    // ✅ universalSearch vyžaduje min 3 znaky
    if (!search || search.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = {
        query: search,
        categories: ['orders_2025', 'contracts'], // Objednávky + Smlouvy
        limit: 15,
        archivovano: 0,
        search_all: canViewAllOrders
      };
      
      const response = await universalSearch(searchParams);

      const orders = response?.categories?.orders_2025?.results || [];
      const contracts = response?.categories?.contracts?.results || [];

      // Filtruj objednávky - zobraz VŠECHNY odeslané/aktivní objednávky
      const sentOrders = orders.filter(order => {
        let stavKody = [];
        try {
          if (order.stav_kod) {
            stavKody = JSON.parse(order.stav_kod);
          }
        } catch (e) {
          // Ignorovat chyby parsování
        }
        
        const invalidStates = ['STORNOVANA', 'ZAMITNUTA'];
        const hasInvalidState = stavKody.some(stav => invalidStates.includes(stav));
        
        if (hasInvalidState) {
          return false;
        }
        
        // ✅ FAKTURA SE MŮŽE PŘIDAT V TĚCHTO STAVECH (po potvrzení dodavatelem)
        // NEUVEREJNIT - objednávka NEBUDE zveřejněna (nezáznamná)
        // UVEREJNENA - objednávka zveřejněna v registru
        // FAKTURACE - první faktura přidána
        // VECNA_SPRAVNOST - věcná kontrola
        // ZKONTROLOVANA - zkontrolována
        // ❌ KE_ZVEREJNENI - čeká na zveřejnění (Úvodní), faktury NELZE přidávat
        // ❌ POTVRZENA - přejde automaticky na NEUVEREJNIT/UVEREJNENA
        // ❌ DOKONCENA - konečný stav
        const validStates = ['NEUVEREJNIT', 'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA'];
        const hasValidState = stavKody.some(stav => validStates.includes(stav));
        
        if (!hasValidState) {
          return false;
        }

        return canViewAllOrders || true;
      });

      // Filtruj smlouvy - pouze aktivní
      const activeContracts = contracts.filter(contract => contract.aktivni === 1);

      // Kombinuj výsledky s označením typu
      const combinedResults = [
        ...sentOrders.map(order => ({ ...order, _type: 'order' })),
        ...activeContracts.map(contract => ({ ...contract, _type: 'smlouva' }))
      ];

      setSuggestions(combinedResults);
      setShowSuggestions(true);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [canViewAllOrders]);

  // Debounced search při psaní (jen když jsou suggestions otevřené)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && showSuggestions) {
        searchEntities(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, showSuggestions]); // ✅ OPRAVENO: Odstranit searchEntities z dependencies

  // ✅ OPTIMALIZOVÁNO: Načítání objednávky je řešeno v useEffect pro location.state (řádky 2148-2297)
  // Duplicitní useEffecty byly odstraněny

  // Effect: Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.autocomplete-wrapper')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Effect: Načíst počet faktur ze spisovky za dnešní den (pro badge) a posledních 5 záznamů (pro tooltip)
  useEffect(() => {
    if (!hasPermission('ADMIN') && !hasPermission('FILE_REGISTRY_MANAGE')) return;

    const fetchSpisovkaData = async () => {
      try {
        // Fetch count
        const countUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/count-today`;
        const countResponse = await fetch(countUrl);
        if (countResponse.ok) {
          const countData = await countResponse.json();
          if (countData.status === 'success') {
            setSpisovkaTodayCount(countData.count);
          }
        }

        // Fetch last 5 records
        const faktoryUrl = `${process.env.REACT_APP_API2_BASE_URL}spisovka.php/faktury?limit=5&offset=0&rok=2025`;
        const faktoryResponse = await fetch(faktoryUrl);
        if (faktoryResponse.ok) {
          const faktoryData = await faktoryResponse.json();
          if (faktoryData.status === 'success') {
            setSpisovkaLastRecords(faktoryData.data);
          }
        }
      } catch (error) {
        console.error('Chyba při načítání dat ze spisovky:', error);
      }
    };

    // Initial fetch
    fetchSpisovkaData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSpisovkaData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // ✅ OPRAVENO: Pouze [] - hasPermission se kontroluje uvnitř

  // Handler: změna inputu
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler: změna search inputu pro autocomplete
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);
    
    // Pokud uživatel mění text, vymažeme order_id a orderData
    // aby se nemohlo stát, že bude vyplněn nevalidní text s validním order_id
    if (value !== searchTerm) {
      setFormData(prev => ({ ...prev, order_id: '' }));
      setOrderData(null);
    }
  };

  // Handler: odemčení entity (změna OBJ/SML u existující FA)
  const handleUnlockEntity = () => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Změna objednávky/smlouvy',
      message: (
        <div style={{ lineHeight: '1.6' }}>
          <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
            Opravdu chcete změnit přiřazení faktury k jiné objednávce nebo smlouvě?
          </p>
          <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <strong style={{ color: '#92400e' }}>⚠️ VAROVÁNÍ - Možné dopady:</strong>
            <ul style={{ margin: '0.5rem 0 0 1.25rem', color: '#78350f' }}>
              <li>Původní objednávka může být vrácena na <strong>věcnou správnost</strong></li>
              <li>Může dojít ke změně <strong>workflow stavu</strong> objednávky</li>
              <li>Částka faktury ovlivní <strong>čerpání rozpočtu</strong> nové entity</li>
              <li>Historie a notifikace budou navázány na novou entitu</li>
            </ul>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            Po odemčení budete moci vybrat jinou objednávku nebo smlouvu.
          </p>
        </div>
      ),
      onConfirm: () => {
        setIsEntityUnlocked(true);
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
      },
      onCancel: () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  // Handler: vymazání hledání objednávky
  const handleClearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    setFormData(prev => ({ ...prev, order_id: '', smlouva_id: null }));
    setOrderData(null);
    setSmlouvaData(null);
    setSelectedType('order'); // Reset na výchozí
  };

  // Handler: výběr objednávky z autocomplete
  const handleSelectOrder = async (order) => {
    const evCislo = order.cislo_objednavky || order.evidencni_cislo || `#${order.id}`;
    
    // 🚨 KONTROLA 1: Je tatáž objednávka otevřená na formuláři? (draft v localStorage)
    draftManager.setCurrentUser(user_id);
    const existingDraft = await draftManager.loadDraft();

    if (existingDraft && existingDraft.formData && parseInt(existingDraft.formData.id) === parseInt(order.id)) {
      const draftEvCislo = existingDraft.formData.cislo_objednavky || existingDraft.formData.evidencni_cislo || `#${order.id}`;
      
      // Zobraz dialog
      setConfirmDialog({
        isOpen: true,
        title: '⚠️ Objednávka je otevřená na formuláři',
        message: `Objednávka ${draftEvCislo} je právě otevřená v editačním formuláři.\n\n⚠️ NEJDŘÍVE JI ZAVŘETE!\n\nTeprve poté můžete přidávat nebo aktualizovat faktury.`,
        onConfirm: () => {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
        },
        onCancel: null
      });
      return;
    }

    // 🚨 KONTROLA 2: Je objednávka zamčená jiným uživatelem?
    setOrderLoading(true);
    try {
      const orderCheck = await getOrderV2(order.id, token, username, false); // false = bez enriched dat
      
      // ⚠️ Blokuj pouze pokud locked=true A NENÍ můj zámek A NENÍ expired
      if (orderCheck?.lock_info?.locked === true && !orderCheck?.lock_info?.is_owned_by_me && !orderCheck?.lock_info?.is_expired) {
        const lockInfo = orderCheck.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

        setOrderLoading(false);
        
        // Ulož info o zamčení pro vizuální dialog
        setLockedOrderInfo({
          lockedByUserName,
          lockedByUserEmail: lockInfo.locked_by_user_email || null,
          lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
          lockedAt: lockInfo.locked_at || null,
          lockAgeMinutes: lockInfo.lock_age_minutes || null,
          canForceUnlock: false,
          orderId: order.id
        });
        setShowLockedOrderDialog(true);
        return;
      }
    } catch (err) {
      console.warn('⚠️ Nepodařilo se zkontrolovat lock status:', err);
    } finally {
      setOrderLoading(false);
    }

    // ✅ VŠE OK - pokračuj s načtením
    await proceedWithOrderLoad(order, evCislo);
  };

  // Helper funkce pro načtení objednávky
  const proceedWithOrderLoad = async (order, evCislo) => {
    // 🔒 KONTROLA LOCK před načtením
    setOrderLoading(true);
    try {
      const orderCheck = await getOrderV2(order.id, token, username, false);
      
      // ⚠️ Blokuj pouze pokud locked=true A NENÍ můj zámek A NENÍ expired
      if (orderCheck?.lock_info?.locked === true && !orderCheck?.lock_info?.is_owned_by_me && !orderCheck?.lock_info?.is_expired) {
        const lockInfo = orderCheck.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

        setOrderLoading(false);
        
        // Ulož info o zamčení pro vizuální dialog
        setLockedOrderInfo({
          lockedByUserName,
          lockedByUserEmail: lockInfo.locked_by_user_email || null,
          lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
          lockedAt: lockInfo.locked_at || null,
          lockAgeMinutes: lockInfo.lock_age_minutes || null,
          canForceUnlock: false,
          orderId: order.id
        });
        setShowLockedOrderDialog(true);
        return;
      }
    } catch (err) {
      console.warn('⚠️ Nepodařilo se zkontrolovat lock status:', err);
    } finally {
      setOrderLoading(false);
    }
    
    // ✅ Není zamčená - pokračuj s načtením
    setFormData(prev => ({
      ...prev,
      order_id: order.id,
      smlouva_id: null
    }));
    setSearchTerm(evCislo);
    setShowSuggestions(false);
    setSelectedType('order');
    setSmlouvaData(null);
    
    localStorage.setItem(`activeOrderEditId_${user_id}`, order.id);
    
    loadOrderData(order.id);
  };

  // Handler: editace faktury - načte fakturu do formuláře
  const handleEditInvoice = useCallback((faktura) => {
    // ✅ Kontrola stavu objednávky - nelze editovat fakturu u objednávky v nevhodném stavu
    if (orderData) {
      const invoiceCheck = canAddInvoiceToOrder(orderData);
      if (!invoiceCheck.allowed) {
        showToast && showToast(`❌ ${invoiceCheck.reason}`, 'error');
        return;
      }
    }

    setFormData({
      order_id: faktura.objednavka_id || '',
      smlouva_id: faktura.smlouva_id || null,
      fa_cislo_vema: faktura.fa_cislo_vema || '',
      fa_typ: faktura.fa_typ || 'BEZNA',
      fa_datum_vystaveni: faktura.fa_datum_vystaveni || '',
      fa_datum_splatnosti: faktura.fa_datum_splatnosti || '',
      fa_datum_doruceni: faktura.fa_datum_doruceni || '',
      fa_castka: faktura.fa_castka || '',
      fa_variabilni_symbol: faktura.fa_variabilni_symbol || '',
      fa_poznamka: faktura.fa_poznamka || '',
      fa_predana_zam_id: faktura.fa_predana_zam_id || null,
      fa_datum_predani_zam: faktura.fa_datum_predani_zam || '',
      fa_datum_vraceni_zam: faktura.fa_datum_vraceni_zam || '',
      file: null,
      invoice_id: faktura.id // Uložíme ID faktury pro update místo create
    });
    
    setEditingInvoiceId(faktura.id);
    setIsOriginalEdit(true);
    
    // 🆕 Při načtení existující faktury pro editaci nastavit flag na true
    setInvoiceUserConfirmed(true);
    
    // Nastavit hadOriginalEntity podle toho, jestli má faktura přiřazenou objednávku nebo smlouvu
    const hadEntity = !!(faktura.objednavka_id || faktura.smlouva_id);
    setHadOriginalEntity(hadEntity);
    localStorage.setItem('hadOriginalEntity', JSON.stringify(hadEntity));

    // Scroll na začátek formuláře
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showToast && showToast('📝 Faktura načtena pro úpravu', 'info');
  }, [showToast, orderData, canAddInvoiceToOrder]);

  // � Handler: Odpojit fakturu od objednávky
  const handleUnlinkInvoice = useCallback((faktura) => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Odpojit fakturu od objednávky?',
      message: `Opravdu chcete odpojit fakturu ${faktura.fa_cislo_vema || faktura.cislo_faktury || `#${faktura.id}`} od této objednávky?\n\n` +
        `Co se stane:\n` +
        `• Faktura zůstane v systému jako SAMOSTATNÁ\n` +
        `• Objednávka už nebude vidět tuto fakturu\n` +
        `• Workflow objednávky se může změnit (pokud to byla poslední faktura)\n` +
        `• Čerpání LP bude odebráno (pokud bylo přiřazeno)\n\n` +
        `⚠️ Tuto akci NELZE vzít zpět!`,
      onConfirm: async () => {
        try {
          // Zavřít dialog
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
          
          // Zavolat API pro odpojení faktury
          await updateInvoiceV2({
            token,
            username,
            invoice_id: faktura.id,
            updateData: {
              objednavka_id: null  // Odpojit od objednávky
            }
          });
          
          // Reload objednávky aby se aktualizoval seznam faktur
          await loadOrderData(formData.order_id);
          
          showToast && showToast(`✅ Faktura ${faktura.fa_cislo_vema || faktura.cislo_faktury || `#${faktura.id}`} byla odpojena od objednávky`, 'success');
        } catch (err) {
          console.error('❌ Chyba při odpojování faktury:', err);
          showToast && showToast('Nepodařilo se odpojit fakturu: ' + (err.message || 'Neznámá chyba'), 'error');
        }
      },
      onCancel: () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
      }
    });
  }, [token, username, formData.order_id, loadOrderData, showToast]);

  // �📎 Handler: změna příloh (controlled component pattern)
  const handleAttachmentsChange = useCallback((updater) => {
    // ✅ Správně zpracovat funkční updater (jako setAttachments)
    setAttachments(prev => {
      // Pokud je updater funkce, zavolat ji s předchozím stavem
      const newAttachments = typeof updater === 'function' ? updater(prev) : updater;
      
      // 📋 Při přidání prvního attachmentu zkontrolovat Spisovka metadata a uložit je
      // DŮLEŽITÉ: Uložit JEN když:
      // 1. Je attachment ze Spisovky (má metadata)
      // 2. Ještě nebyl uploadován (!serverId = lokální soubor)
      // 3. Ref je prázdný (metadata ještě nebyla uložena)
      if (newAttachments && newAttachments.length > 0 && !pendingSpisovkaMetadataRef.current) {
        const firstAttachment = newAttachments[0];
        
        // ⚠️ Guard: Zkontrolovat, že firstAttachment existuje a není undefined
        if (firstAttachment) {
          // Uložit metadata JEN pro lokální soubory (před uploadem)
          if (firstAttachment.spisovka_dokument_id && 
              firstAttachment.spisovka_file_id && 
              !firstAttachment.serverId) {
            pendingSpisovkaMetadataRef.current = {
              dokument_id: firstAttachment.spisovka_dokument_id,
              spisovka_priloha_id: firstAttachment.spisovka_file_id,
              filename: firstAttachment.name
            };
            
            // 🎯 Označit v localStorage, že s tímto dokumentem pracuji
            localStorage.setItem('spisovka_active_dokument', firstAttachment.spisovka_dokument_id);
          }
        }
      }
      
      return newAttachments;
    });
  }, []);

  // 🗑️ Handler: při smazání přílohy - vyčistit pending metadata
  const handleAttachmentRemoved = useCallback((removedAttachment) => {
    // ⚠️ Guard: Zkontrolovat, že removedAttachment existuje
    if (!removedAttachment) {
      console.warn('⚠️ handleAttachmentRemoved: removedAttachment je undefined');
      return;
    }

    // Pokud byla příloha ze Spisovky a ještě nebyla uložena do DB, vyčistit metadata
    if (pendingSpisovkaMetadataRef.current) {
      const metadata = pendingSpisovkaMetadataRef.current;
      
      // Zkontrolovat, jestli mazaný soubor odpovídá pending metadata
      if (removedAttachment.spisovka_dokument_id === metadata.dokument_id ||
          removedAttachment.spisovka_file_id === metadata.spisovka_priloha_id) {
        
        pendingSpisovkaMetadataRef.current = null;
        // Vyčistit aktivní dokument z localStorage
        localStorage.removeItem('spisovka_active_dokument');
      }
    } else {
      // ✅ Žádná pending metadata - vyčistit localStorage pro jistotu
      if (removedAttachment.spisovka_dokument_id) {
        localStorage.removeItem('spisovka_active_dokument');
      }
    }
  }, []);

  // 🔄 Handler: Spisovka dokument conflict - uživatel rozhodne, zda přidat duplikát
  const handleSpisovkaConflict = useCallback(async (metadata, fakturaId, existingRecord) => {
    return new Promise((resolve) => {
      const message = (
        <div style={{ fontFamily: 'system-ui', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '12px', fontWeight: 600 }}>
            Tento dokument ze Spisovky již byl dříve zaevidován:
          </p>
          {existingRecord && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '12px'
            }}>
              <div><strong>Faktura:</strong> {existingRecord.fa_cislo_vema || existingRecord.faktura_id}</div>
              <div><strong>Datum:</strong> {existingRecord.zpracovano_kdy ? new Date(existingRecord.zpracovano_kdy).toLocaleString('cs-CZ') : 'N/A'}</div>
              <div><strong>Uživatel:</strong> {existingRecord.uzivatel_id}</div>
            </div>
          )}
          <p style={{ marginBottom: '8px' }}>
            Chcete přesto přidat tuto přílohu k nové faktuře?
          </p>
          <p style={{ fontSize: '12px', color: '#78716c', marginTop: '8px' }}>
            ⚠️ Vytvoří se duplicitní záznam v trackingu.
          </p>
        </div>
      );

      setConfirmDialog({
        isOpen: true,
        title: '⚠️ Dokument již evidován',
        message,
        onConfirm: async () => {
          // Uživatel potvrdil - force tracking
          try {
            const result = await markSpisovkaDocumentProcessed({
              username,
              token,
              dokument_id: metadata.dokument_id,
              spisovka_priloha_id: metadata.spisovka_priloha_id,
              faktura_id: fakturaId,
              fa_cislo_vema: formData.fa_cislo_vema,
              stav: 'ZAEVIDOVANO',
              poznamka: `DUPLICITA - Auto-tracking: Příloha ze Spisovky (file_id: ${metadata.spisovka_priloha_id})`,
              force: true // 🔥 Vynucení duplicity
            });

            if (result.success) {
              showToast && showToast('✅ Příloha přidána (duplicitní záznam vytvořen)', { type: 'success' });
              // 🔄 REFRESH Spisovka panelu po force tracking
              handleSpisovkaRefresh();
            } else {
              console.warn('⚠️ Force tracking se nezdařil:', result);
            }
          } catch (err) {
            console.error('❌ Force tracking error:', err);
          }
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
          resolve(false);
        }
      });
    });
  }, [username, token, formData.fa_cislo_vema, setConfirmDialog, showToast]);

  // � Helper ref pro stabilní referenci na fa_cislo_vema v callbacku
  const faCisloVemaRef = useRef(formData.fa_cislo_vema);
  useEffect(() => {
    faCisloVemaRef.current = formData.fa_cislo_vema;
  }, [formData.fa_cislo_vema]);

  // 📎 Handler: po úspěšném uploadu přílohy - volá se z InvoiceAttachmentsCompact
  const handleAttachmentUploaded = useCallback(async (fakturaId, uploadedAttachment) => {
    // Guard: Pokud není fakturaId, není co trackovat
    if (!fakturaId) {
      return;
    }
    
    // 📋 SPISOVKA TRACKING: Označit dokument jako zpracovaný (po uploadu přílohy)
    try {
      const metadata = pendingSpisovkaMetadataRef.current;
      
      if (metadata) {
        const result = await markSpisovkaDocumentProcessed({
          username,
          token,
          dokument_id: metadata.dokument_id,
          spisovka_priloha_id: metadata.spisovka_priloha_id,
          faktura_id: fakturaId,
          fa_cislo_vema: faCisloVemaRef.current, // ✅ OPRAVENO: Používáme ref namísto přímé závislosti
          stav: 'ZAEVIDOVANO',
          poznamka: `Auto-tracking: Příloha ze Spisovky (file_id: ${metadata.spisovka_priloha_id})`,
          force: false // První pokus bez force
        });
        
        // 🔍 Kontrola výsledku
        if (result.success) {
          // Vyčistit metadata po úspěšném zápisu
          pendingSpisovkaMetadataRef.current = null;
          // ⚠️ NEvyčišťovat LS zde - uživatel může přidat další přílohy ze stejné faktury
          // LS se vyčistí při opouštění stránky nebo při reset formu
          
          // 🔄 REFRESH Spisovka panelu po úspěšném markování
          handleSpisovkaRefresh();
        } else if (result.conflict) {
          // 🚨 CONFLICT - zobrazit dialog uživateli
          console.warn('⚠️ Conflict detekován:', result);
          await handleSpisovkaConflict(metadata, fakturaId, result.existingRecord);
          // Vyčistit metadata i po confliktu (dialog už byl zobrazen)
          pendingSpisovkaMetadataRef.current = null;
          // ⚠️ NEvyčišťovat LS - uživatel může přidat další přílohy
        }
      } else {
        // Pokud není metadata - nic se neděá
      }
    } catch (spisovkaErr) {
      console.error('⚠️ Nepodařilo se označit Spisovka dokument jako zpracovaný:', spisovkaErr);
      // Vyčistit metadata i při chybě
      pendingSpisovkaMetadataRef.current = null;
      // ✅ Při chybě vyčistit LS - uživatel musí začít znovu
      localStorage.removeItem('spisovka_active_dokument');
    }
  }, [username, token, handleSpisovkaConflict, handleSpisovkaRefresh]); // ✅ OPRAVENO: formData.fa_cislo_vema odstraněno z dependencies

  // 📎 Validace faktury před uploadem příloh (podle vzoru OrderForm25)
  // Parametr: faktura objekt (ne file!) - obsahuje data faktury pro validaci
  // Parametr: file (optional) - soubor pro kontrolu ISDOC
  const validateInvoiceForAttachments = useCallback((faktura, file) => {
    // Pro editaci existující faktury - povolit upload bez omezení
    if (editingInvoiceId) {
      return {
        isValid: true,
        isISDOC: false,
        categories: {}
      };
    }
    
    // Pokud je file ISDOC, povolit upload i bez vyplněných polí
    const isISDOC = file && file.name && file.name.toLowerCase().endsWith('.isdoc');
    
    if (isISDOC) {
      // ISDOC soubor - povolit upload, data se vytěží z ISDOC
      return {
        isValid: true,
        isISDOC: true,
        categories: {}
      };
    }
    
    // Běžné soubory (PDF, JPG...) - kontrolovat povinná pole faktury
    const categories = {
      objednateli: {
        label: 'Informace o objednateli',
        errors: []
      },
      schvaleni: {
        label: 'Schválení nákupu PO',
        errors: []
      }
    };
    
    // Kategorie: Informace o objednateli
    if (!faktura?.fa_cislo_vema) categories.objednateli.errors.push('Číslo faktury');
    if (!faktura?.fa_datum_splatnosti) categories.objednateli.errors.push('Datum splatnosti');
    if (!faktura?.fa_castka) categories.objednateli.errors.push('Částka');
    
    // Kategorie: Schválení nákupu PO (prázdná pro faktury - pouze pro objednávky)
    // categories.schvaleni.errors zde zůstává prázdné
    
    const allErrors = [...categories.objednateli.errors, ...categories.schvaleni.errors];
    
    return {
      isValid: allErrors.length === 0,
      isISDOC: false,
      categories
    };
  }, [editingInvoiceId]);

  // 🆕 Handler: Vytvoření faktury v DB (pro temp faktury před uploadem přílohy)
  const handleCreateInvoiceInDB = useCallback(async (tempFakturaId) => {
    try {
      const apiParams = {
        token,
        username,
        order_id: formData.order_id || null,
        smlouva_id: formData.smlouva_id || null,
        fa_cislo_vema: formData.fa_cislo_vema,
        fa_typ: formData.fa_typ || 'BEZNA',
        fa_datum_vystaveni: formData.fa_datum_vystaveni,
        fa_datum_splatnosti: formData.fa_datum_splatnosti || null,
        fa_datum_doruceni: formData.fa_datum_doruceni || null,
        fa_castka: formData.fa_castka,
        fa_poznamka: formData.fa_poznamka || '',
        fa_dorucena: formData.fa_datum_doruceni ? 1 : 0,
        fa_strediska_kod: JSON.stringify(formData.fa_strediska_kod || []),
        fa_predana_zam_id: formData.fa_predana_zam_id || null,
        fa_datum_predani_zam: formData.fa_datum_predani_zam || null,
        fa_datum_vraceni_zam: formData.fa_datum_vraceni_zam || null
      };

      // Vytvoř fakturu bez přílohy
      const result = await createInvoiceV2(apiParams);
      
      // API vrací {status: 'ok', data: {invoice_id: 89}}
      const newInvoiceId = result?.data?.invoice_id || result?.invoice_id || result?.id;
      
      if (!newInvoiceId) {
        console.error('❌ Neplatný result z createInvoiceV2:', result);
        throw new Error('Nepodařilo se vytvořit fakturu v DB - backend nevrátil ID');
      }

      // Nastav editingInvoiceId, aby se další přílohy uploadovaly k této faktuře
      setEditingInvoiceId(newInvoiceId);
      
      // ✅ Nastav hadOriginalEntity podle toho, zda má faktura objednávku/smlouvu
      // Tím zajistíme, že tlačítko bude "Aktualizovat" místo "Přiřadit"
      if (formData.order_id || formData.smlouva_id) {
        setHadOriginalEntity(true);
      }
      
      // 🔄 Refresh náhledu objednávky/smlouvy - aby se FA zobrazila v seznamu
      if (formData.order_id && orderData) {
        await loadOrderData(formData.order_id);
      }
      if (formData.smlouva_id && smlouvaData) {
        await loadSmlouvaData(formData.smlouva_id);
      }

      return newInvoiceId;
    } catch (error) {
      console.error('❌ Chyba při vytváření faktury v DB:', error);
      throw error;
    }
  }, [token, username, formData]);

  // 📄 Handler: ISDOC parsing - vyplnění faktury z ISDOC souboru
  const handleISDOCParsed = useCallback((isdocData, isdocSummary) => {
    try {
      // Mapování ISDOC dat na fakturu
      const mappedData = mapISDOCToFaktura(isdocData, {
        strediska: strediskaOptions,
        // Pokud je přiřazena objednávka, použij její střediska
        orderStrediska: orderData?.strediska_kod || formData.fa_strediska_kod
      });

      // Aktualizuj formData s daty z ISDOC
      setFormData(prev => ({
        ...prev,
        fa_cislo_vema: mappedData.fa_cislo_vema || prev.fa_cislo_vema,
        fa_datum_vystaveni: mappedData.fa_datum_vystaveni || prev.fa_datum_vystaveni,
        fa_datum_splatnosti: mappedData.fa_datum_splatnosti || prev.fa_datum_splatnosti,
        fa_castka: mappedData.fa_castka || prev.fa_castka,
        fa_strediska_kod: mappedData.fa_strediska_kod || prev.fa_strediska_kod,
        fa_poznamka: mappedData.fa_poznamka || prev.fa_poznamka
      }));

      showToast && showToast(
        `✅ Data z ISDOC byla úspěšně načtena\n\nČíslo faktury: ${mappedData.fa_cislo_vema}\nČástka: ${mappedData.fa_castka} Kč`,
        { type: 'success' }
      );
    } catch (error) {
      console.error('❌ Chyba při zpracování ISDOC:', error);
      showToast && showToast(
        `Chyba při zpracování ISDOC: ${error.message}`,
        { type: 'error' }
      );
    }
  }, [formData, orderData, strediskaOptions, showToast]);

  // 🆕 OCR Callback - Vyplní data z OCR do formuláře
  const handleOCRDataExtracted = useCallback((ocrData) => {
    try {
      // Aktualizuj formData s daty z OCR
      setFormData(prev => {
        const updates = {};
        
        // Variabilní symbol -> fa_cislo_vema
        if (ocrData.variabilniSymbol) {
          updates.fa_cislo_vema = ocrData.variabilniSymbol;
        }
        
        // Datum vystavení
        if (ocrData.datumVystaveni) {
          updates.fa_datum_vystaveni = ocrData.datumVystaveni;
        }
        
        // Datum splatnosti
        if (ocrData.datumSplatnosti) {
          updates.fa_datum_splatnosti = ocrData.datumSplatnosti;
        }
        
        // Částka
        if (ocrData.castka) {
          updates.fa_castka = ocrData.castka;
        }
        
        // 📋 SPISOVKA METADATA pro automatický tracking
        // Přidat Spisovka metadata do file objektu (pokud existují)
        if (ocrData.spisovka_dokument_id && ocrData.spisovka_priloha_id && prev.file) {
          updates.file = {
            ...prev.file,
            spisovka_dokument_id: ocrData.spisovka_dokument_id,
            spisovka_file_id: ocrData.spisovka_priloha_id
          };
        }
        
        return {
          ...prev,
          ...updates
        };
      });
      
    } catch (error) {
      console.error('❌ Chyba při aplikaci OCR dat:', error);
      showToast && showToast(
        `Chyba při aplikaci OCR dat: ${error.message}`,
        { type: 'error' }
      );
    }
  }, [showToast]);

  // 🔔 Funkce pro odeslání notifikací při změně stavu objednávky na věcnou kontrolu
  // ✅ AKTUALIZOVÁNO: Používá organizační hierarchii místo ručního výběru příjemců
  const sendInvoiceNotifications = async (orderId, orderData) => {
    try {
      const timestamp = new Date().toLocaleString('cs-CZ');
      console.log(`🔔 [${timestamp}] Notifikace → Typ: INVOICE_MATERIAL_CHECK_REQUESTED | Order: ${orderId} | User: ${user_id}`);
      
      // ✅ NOVÝ SYSTÉM: Použití organizační hierarchie
      // Backend automaticky najde správné příjemce podle hierarchie a notification profiles
      // Podporuje generické příjemce (OBJEDNATEL, GARANT, SCHVALOVATEL_1, SCHVALOVATEL_2, ...)
      const result = await triggerNotification(
        'INVOICE_MATERIAL_CHECK_REQUESTED', // 🔔 Faktura přidána - čeká na kontrolu věcné správnosti
        orderId,
        user_id // ID uživatele, který vytvořil/přiřadil fakturu
      );

      if (result.errors && result.errors.length > 0) {
        console.warn('⚠️ Některé notifikace se nepodařilo odeslat:', result.errors);
      } else {
        console.log(`✅ [${timestamp}] Notifikace odeslána úspěšně`);
      }

    } catch (error) {
      console.error('❌ Chyba při odesílání notifikací:', error);
      console.error('   Error message:', error.message);
      console.error('   Error details:', error.response?.data);
      // Neblokujeme workflow kvůli chybě notifikace
    }
  };

  // ============================================================
  // SPISOVKA INBOX PANEL - Drag handling
  // ============================================================
  const handleSpisovkaInboxDrag = useCallback((e, key, dir) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startState = { ...spisovkaInboxState };

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      setSpisovkaInboxState(prev => {
        let newState = { ...prev };
        const minW = 620; // Minimální šířka aby se vešla všechna tlačítka v hlavičce (rok + 5 period tlačítek + 3 filtry)
        const minH = 400; // Minimální výška pro zobrazení alespoň 2 faktury

        if (dir === 'move') {
          newState.x = Math.max(0, Math.min(startState.x + dx, window.innerWidth - prev.w));
          newState.y = Math.max(0, Math.min(startState.y + dy, window.innerHeight - prev.h));
        } 
        // Pravá hrana
        else if (dir === 'right') {
          newState.w = Math.max(minW, startState.w + dx);
        } 
        // Levá hrana
        else if (dir === 'left') {
          const newW = Math.max(minW, startState.w - dx);
          if (newW > minW) {
            newState.w = newW;
            newState.x = startState.x + dx;
          }
        } 
        // Horní hrana
        else if (dir === 'top') {
          const newH = Math.max(minH, startState.h - dy);
          if (newH > minH) {
            newState.h = newH;
            newState.y = startState.y + dy;
          }
        } 
        // Dolní hrana
        else if (dir === 'bottom') {
          newState.h = Math.max(minH, startState.h + dy);
        } 
        // Rohy
        else if (dir === 'top-left') {
          const newW = Math.max(minW, startState.w - dx);
          const newH = Math.max(minH, startState.h - dy);
          if (newW > minW) {
            newState.w = newW;
            newState.x = startState.x + dx;
          }
          if (newH > minH) {
            newState.h = newH;
            newState.y = startState.y + dy;
          }
        } 
        else if (dir === 'top-right') {
          const newH = Math.max(minH, startState.h - dy);
          newState.w = Math.max(minW, startState.w + dx);
          if (newH > minH) {
            newState.h = newH;
            newState.y = startState.y + dy;
          }
        } 
        else if (dir === 'bottom-left') {
          const newW = Math.max(minW, startState.w - dx);
          newState.h = Math.max(minH, startState.h + dy);
          if (newW > minW) {
            newState.w = newW;
            newState.x = startState.x + dx;
          }
        } 
        else if (dir === 'bottom-right') {
          newState.w = Math.max(minW, startState.w + dx);
          newState.h = Math.max(minH, startState.h + dy);
        }

        return newState;
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [spisovkaInboxState]);

  // Handler: UPDATE věcné kontroly (partial update)
  const handleUpdateMaterialCorrectness = async () => {
    if (!editingInvoiceId) {
      showToast && showToast('Chyba: Není vybrána faktura k aktualizaci', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validace - checkbox musí být zaškrtnutý
      if (formData.vecna_spravnost_potvrzeno !== 1) {
        showToast && showToast('Zaškrtněte políčko "Potvrzuji věcnou správnost faktury"', 'error');
        setLoading(false);
        return;
      }

      // 🔥 Validace LP čerpání pro LP financování
      if (orderData && orderData.financovani) {
        try {
          const fin = typeof orderData.financovani === 'string' 
            ? JSON.parse(orderData.financovani) 
            : orderData.financovani;
          
          if (fin.typ === 'LP') {
            // 🔥 FIX: Filtrovat jen validní řádky (s LP kódem a částkou > 0)
            const validLpCerpani = (lpCerpani || []).filter(lp => lp.lp_id && lp.lp_cislo && lp.castka > 0);
            
            if (validLpCerpani.length === 0) {
              showToast && showToast('⚠️ Objednávka je financována z LP. Musíte přiřadit alespoň jeden LP kód!', 'error');
              setLoading(false);
              return;
            }

            const totalLP = validLpCerpani.reduce((sum, lp) => sum + (parseFloat(lp.castka) || 0), 0);
            const faCastka = parseFloat(formData.fa_castka) || 0;
            if (totalLP > faCastka) {
              showToast && showToast(`❌ Součet LP čerpání překračuje částku faktury`, 'error');
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error('Chyba při validaci LP:', e);
        }
      }

      // Validace - poznámka je POVINNÁ pokud faktura překračuje MAX cenu
      if (orderData && orderData.max_cena_s_dph && formData.fa_castka) {
        const maxCena = parseFloat(orderData.max_cena_s_dph) || 0;
        const fakturaCastka = parseFloat(formData.fa_castka) || 0;
        if (fakturaCastka > maxCena && (!formData.vecna_spravnost_poznamka || formData.vecna_spravnost_poznamka.trim() === '')) {
          showToast && showToast('Vysvětlete v poznámce, proč faktura překračuje max. cenu objednávky', 'error');
          setLoading(false);
          return;
        }
      }

      // 🆕 Validace - kontrola celkového součtu všech faktur objednávky
      if (orderData && orderData.max_cena_s_dph && orderData.faktury) {
        const maxCena = parseFloat(orderData.max_cena_s_dph) || 0;
        
        // Spočítat celkový součet všech faktur (včetně aktuální)
        const totalFaktur = orderData.faktury.reduce((sum, f) => {
          // Pokud je to aktuální faktura, použít hodnotu z formuláře
          if (f.id === editingInvoiceId) {
            return sum + (parseFloat(formData.fa_castka) || 0);
          }
          // Jinak použít uloženou hodnotu
          return sum + (parseFloat(f.fa_castka) || 0);
        }, 0);
        
        // Kontrola překročení
        if (totalFaktur > maxCena) {
          const rozdil = totalFaktur - maxCena;
          
          // Pokud není vyplněna poznámka, vyžadovat zdůvodnění
          // (Warning je zobrazený v červeném boxu - scrollování k poli)
          if (!formData.vecna_spravnost_poznamka || formData.vecna_spravnost_poznamka.trim() === '') {
            // Místo toastu jen zastavíme - pole poznámky je už zvýrazněno červeně
            setLoading(false);
            return;
          }
        }
      }

      // 🆕 Validace - pokud je to poslední faktura, vyžadovat zdůvodnění
      if (orderData && orderData.faktury) {
        // Zjistit počet nepotvrzených faktur
        const nepotvrzene = orderData.faktury.filter(f => !f.vecna_spravnost_potvrzeno || f.vecna_spravnost_potvrzeno === 0);
        
        // Pokud je to poslední nepotvrzená faktura (ostatní už jsou potvrzené)
        if (nepotvrzene.length === 1 && nepotvrzene[0].id === editingInvoiceId) {
          // Vyžadovat poznámku pro poslední fakturu
          if (!formData.vecna_spravnost_poznamka || formData.vecna_spravnost_poznamka.trim() === '') {
            showToast && showToast(
              '⚠️ Toto je poslední faktura objednávky. Vyplňte prosím poznámku k věcné kontrole (např. potvrzení dokončení zakázky).',
              'error'
            );
            setLoading(false);
            return;
          }
        }
      }

      // Partial update - pouze pole věcné kontroly
      const updateData = {
        vecna_spravnost_umisteni_majetku: formData.vecna_spravnost_umisteni_majetku || '',
        vecna_spravnost_poznamka: formData.vecna_spravnost_poznamka || '',
        vecna_spravnost_potvrzeno: formData.vecna_spravnost_potvrzeno,
        potvrdil_vecnou_spravnost_id: formData.potvrdil_vecnou_spravnost_id,
        dt_potvrzeni_vecne_spravnosti: formData.dt_potvrzeni_vecne_spravnosti
      };
      
      const response = await updateInvoiceV2({
        token,
        username,
        invoice_id: editingInvoiceId,
        updateData
      });

      // ✅ Úspěšná aktualizace - zkontrolovat různé formáty response
      const isSuccess = response?.success === true || 
                       response?.status === 'success' || 
                       (response?.message && response.message.includes('úspěšně'));
      
      if (isSuccess) {
        // Aktualizovat originalFormData aby Cancel fungoval správně
        setOriginalFormData(prev => ({
          ...prev,
          ...updateData
        }));

        // 🆕 LP ČERPÁNÍ: Uložit čerpání LP po úspěšné aktualizaci věcné správnosti
        if (lpCerpani && lpCerpani.length > 0) {
          try {
            // 🔥 FIX: Filtrovat jen validní řádky před uložením do DB
            const validLpCerpani = lpCerpani.filter(lp => lp.lp_id && lp.lp_cislo && lp.castka > 0);
            
            if (validLpCerpani.length > 0) {
              await saveFakturaLPCerpani(editingInvoiceId, validLpCerpani, token, username);
            }
          } catch (lpError) {
            console.error('❌ Chyba při ukládání LP čerpání:', lpError);
            // Nezastavujeme proces - LP čerpání je bonusová data, faktura už je uložena
            showToast && showToast('Věcná správnost uložena, ale čerpání LP se nepodařilo uložit: ' + lpError.message, 'warning');
          }
        }

        // Odeslat notifikaci o věcné kontrole (pokud má objednávku)
        if (formData.order_id) {
          try {
            await notificationService.trigger(
              'ORDER_MATERIAL_CORRECTNESS',
              formData.order_id,
              user_id
            );
          } catch (notifError) {
            console.error('❌ Chyba při odesílání notifikace:', notifError);
          }
        }

        // 🆕 AUTOMATICKÝ POSUN DO STAVU ZKONTROLOVANA
        // Pokud jsou nyní VŠECHNY faktury objednávky potvrzené na věcnou správnost,
        // posun objednávku do stavu ZKONTROLOVANA
        if (formData.order_id && orderData && formData.vecna_spravnost_potvrzeno === 1) {
          try {
            // Zkontrolovat zda všechny faktury mají vecna_spravnost_potvrzeno = 1
            const allInvoicesConfirmed = orderData.faktury.every(f => {
              // Pro aktuální fakturu použít hodnotu z formuláře
              if (f.id === editingInvoiceId) {
                return formData.vecna_spravnost_potvrzeno === 1;
              }
              // Pro ostatní faktury použít uloženou hodnotu
              return f.vecna_spravnost_potvrzeno === 1;
            });

            if (allInvoicesConfirmed) {
              // Parsovat aktuální workflow stavy
              let stavKody = [];
              if (orderData.stav_workflow_kod) {
                if (typeof orderData.stav_workflow_kod === 'string') {
                  try {
                    stavKody = JSON.parse(orderData.stav_workflow_kod);
                  } catch (e) {
                    stavKody = [orderData.stav_workflow_kod];
                  }
                } else if (Array.isArray(orderData.stav_workflow_kod)) {
                  stavKody = [...orderData.stav_workflow_kod];
                }
              }

              // Pokud ještě nemá ZKONTROLOVANA, přidej ho
              if (!stavKody.includes('ZKONTROLOVANA')) {
                stavKody.push('ZKONTROLOVANA');
                
                // Aktualizuj objednávku
                await updateOrderV2(
                  formData.order_id,
                  { 
                    stav_workflow_kod: JSON.stringify(stavKody),
                    stav_objednavky: 'Zkontrolovaná'
                  },
                  token,
                  username
                );

                // 🔔 NOTIFIKACE: Poslat notifikaci o potvrzení věcné správnosti
                try {
                  const timestamp = new Date().toLocaleString('cs-CZ');
                  console.log(`🔔 [${timestamp}] Notifikace → Typ: INVOICE_MATERIAL_CHECK_APPROVED | Order: ${formData.order_id} | User: ${user_id}`);
                  
                  await triggerNotification('INVOICE_MATERIAL_CHECK_APPROVED', formData.order_id, user_id, {
                    order_number: orderData.ev_cislo || orderData.cislo_objednavky || formData.order_id,
                    order_subject: orderData.predmet || ''
                  });
                  console.log(`✅ [${timestamp}] Notifikace ZKONTROLOVANA odeslána`);
                } catch (notificationError) {
                  console.error('⚠️ Chyba při odesílání notifikace ZKONTROLOVANA:', notificationError);
                }
              }
            }
          } catch (orderUpdateError) {
            console.error('❌ Chyba při aktualizaci stavu objednávky:', orderUpdateError);
            // Nezastavujeme proces - věcná správnost je už uložená
          }
        }

        // Vždy zobrazit progress dialog pro oba typy uživatelů
        // 📝 SJEDNOCENÁ TEXTACE: Číslo FA + souvislost (OBJ/SML)
        const faCislo = formData.fa_cislo_vema || 'bez čísla';
        let successMessage = '';
        
        if (formData.order_id && orderData) {
          const objCislo = orderData.cislo_objednavky || orderData.evidencni_cislo || `#${orderData.id}`;
          successMessage = `Věcná správnost faktury ${faCislo} byla úspěšně potvrzena.\n\nSouvisí s objednávkou: ${objCislo}`;
          if (isReadOnlyMode) {
            successMessage += '\n\nBudete přesměrováni na seznam faktur.';
          }
        } else if (formData.smlouva_id && smlouvaData) {
          const smlCislo = smlouvaData.cislo_smlouvy || `#${smlouvaData.id}`;
          successMessage = `Věcná správnost faktury ${faCislo} byla úspěšně potvrzena.\n\nSouvisí se smlouvou: ${smlCislo}`;
          if (isReadOnlyMode) {
            successMessage += '\n\nBudete přesměrováni na seznam faktur.';
          }
        } else {
          successMessage = `Věcná správnost faktury ${faCislo} byla úspěšně potvrzena.`;
          if (isReadOnlyMode) {
            successMessage += '\n\nBudete přesměrováni na seznam faktur.';
          }
        }
        
        setProgressModal({
          show: true,
          status: 'success',
          title: '✅ Věcná správnost potvrzena',
          message: successMessage,
          resetData: { isVecnaSpravnost: true, isReadOnlyMode }
        });
      } else {
        // Skutečná chyba
        const errorMsg = response?.message || response?.error || 'Nepodařilo se aktualizovat věcnou správnost';
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Chyba při aktualizaci věcné kontroly:', err);
      setError(err.message || 'Nepodařilo se aktualizovat věcnou kontrolu');
      showToast && showToast(err.message || 'Nepodařilo se aktualizovat věcnou kontrolu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler: submit formuláře
  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});
    
    console.log('🚀 ========================================');
    console.log('🚀 HANDLE SUBMIT - START');
    console.log('🚀 ========================================');
    console.log('  editingInvoiceId:', editingInvoiceId);
    console.log('  isOriginalEdit:', isOriginalEdit);
    console.log('  originalFormData:', originalFormData ? 'EXISTS' : 'NULL');
    console.log('  formData.fa_stav:', formData.fa_stav);
    console.log('  formData.fa_predana_zam_id:', formData.fa_predana_zam_id);
    console.log('  formData.order_id:', formData.order_id);
    console.log('  orderData:', orderData ? 'EXISTS' : 'NULL');
    console.log('  user_id:', user_id);
    
    if (originalFormData) {
      console.log('📝 ORIGINAL DATA:');
      console.log('  originalFormData.fa_stav:', originalFormData.fa_stav);
      console.log('  originalFormData.fa_predana_zam_id:', originalFormData.fa_predana_zam_id);
    }
    
    console.log('🚀 ========================================');
    
    // 🆕 Uživatel klikl na Zaevidovat/Aktualizovat - nastavit flag
    setInvoiceUserConfirmed(true);

    // ✅ Kontrola stavu objednávky
    // - Pro NOVOU fakturu s objednávkou
    // - Pro EDITACI faktury, kde PŘIDÁVÁME objednávku (původně neměla)
    const isAddingOrderToExistingInvoice = editingInvoiceId && !hadOriginalEntity && formData.order_id;
    
    if (formData.order_id && orderData && (!editingInvoiceId || isAddingOrderToExistingInvoice)) {
      const invoiceCheck = canAddInvoiceToOrder(orderData);
      if (!invoiceCheck.allowed) {
        setError(invoiceCheck.reason);
        showToast && showToast(invoiceCheck.reason, 'error');
        return;
      }
    }
    
    // 🎯 Zobrazit progress modal ihned při startu
    setProgressModal({
      show: true,
      status: 'loading',
      progress: 10,
      title: editingInvoiceId ? 'Ukládám změny faktury...' : 'Eviduji novou fakturu...',
      message: 'Ověřuji zadané údaje a připravuji data k uložení...'
    });

    // ✅ Validace povinných polí - PŘESKOČIT pro readonly uživatele ukládající pouze věcnou správnost
    const errors = {};
    
    if (!isReadOnlyMode) {
      // Běžná validace pro uživatele s INVOICE_MANAGE
      // Číslo faktury - POVINNÉ
      if (!formData.fa_cislo_vema || !formData.fa_cislo_vema.trim()) {
        errors.fa_cislo_vema = 'Vyplňte číslo faktury';
      }

      // Typ faktury - POVINNÉ
      if (!formData.fa_typ) {
        errors.fa_typ = 'Vyberte typ faktury';
      }

      // Datum doručení - POVINNÉ
      if (!formData.fa_datum_doruceni) {
        errors.fa_datum_doruceni = 'Vyplňte datum doručení';
      }

      // Datum vystavení - POVINNÉ
      if (!formData.fa_datum_vystaveni) {
        errors.fa_datum_vystaveni = 'Vyplňte datum vystavení';
      }

      // Datum splatnosti - POVINNÉ
      if (!formData.fa_datum_splatnosti) {
        errors.fa_datum_splatnosti = 'Vyplňte datum splatnosti';
      }

      // Částka - POVINNÉ
      if (!formData.fa_castka || parseFloat(formData.fa_castka) <= 0) {
        errors.fa_castka = 'Vyplňte platnou částku faktury';
      }

      // Validace datumů předání/vrácení (nepovinné, ale pokud jsou vyplněné)
      if (formData.fa_datum_predani_zam && formData.fa_datum_vraceni_zam) {
        const predani = new Date(formData.fa_datum_predani_zam);
        const vraceni = new Date(formData.fa_datum_vraceni_zam);
        if (vraceni < predani) {
          errors.fa_datum_vraceni_zam = 'Datum vrácení nemůže být dřívější než datum předání';
        }
      }
    }

    // 🔥 SPECIÁLNÍ VALIDACE PRO READONLY UŽIVATELE (věcná správnost)
    // Kontrola překročení ceny - pokud faktura překračuje max. cenu objednávky, MUSÍ být poznámka
    if (isReadOnlyMode && editingInvoiceId && orderData && formData.vecna_spravnost_potvrzeno === 1) {
      const maxCena = parseFloat(orderData.max_cena_s_dph) || 0;
      const fakturaCastka = parseFloat(formData.fa_castka) || 0;
      const rozdil = fakturaCastka - maxCena;
      const prekroceno = rozdil > 0;

      if (prekroceno) {
        // Pokud je cena překročena, MUSÍ být vyplněna poznámka k věcné správnosti
        if (!formData.poznamka_vecne_spravnosti || formData.poznamka_vecne_spravnosti.trim() === '') {
          errors.poznamka_vecne_spravnosti = `⚠️ Faktura překračuje max. cenu objednávky o ${rozdil.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč. Vyplňte prosím důvod překročení v poznámce k věcné správnosti.`;
        }
      }
    }

    // Pokud jsou chyby, zobraz je a zastav submit
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Opravte prosím chyby ve formuláři před odesláním');
      // Zavřít progress modal při chybě validace
      setProgressModal({ show: false, status: 'error', progress: 0, title: '', message: '' });
      
      return;
    }

    setLoading(true);
    setProgress?.(50);
    
    // 🎯 Aktualizace progress - validace prošla
    setProgressModal(prev => ({
      ...prev,
      progress: 30,
      message: 'Validace formuláře dokončena, odesílám data na server...'
    }));

    try {
      // Věcná správnost podle dokumentace
      const getMysqlDateTime = () => {
        // 🔥 FIX: Použít lokální český čas místo UTC
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      const apiParams = {
        token,
        username,
        order_id: formData.order_id || null, // Může být null pokud faktura není vázána na objednávku
        smlouva_id: formData.smlouva_id || null, // Může být null pokud faktura není vázána na smlouvu
        fa_cislo_vema: formData.fa_cislo_vema,
        fa_typ: formData.fa_typ || 'BEZNA',
        fa_datum_vystaveni: formData.fa_datum_vystaveni,
        fa_datum_splatnosti: formData.fa_datum_splatnosti || null,
        fa_datum_doruceni: formData.fa_datum_doruceni || null,
        fa_castka: formData.fa_castka,
        fa_poznamka: formData.fa_poznamka || '',
        fa_dorucena: formData.fa_datum_doruceni ? 1 : 0,
        // fa_strediska_kod je již array stringů ["101_RLP_KLADNO"], jen JSON.stringify
        fa_strediska_kod: JSON.stringify(formData.fa_strediska_kod || []),
        // Nové položky (nepovinné) - null pokud není vyplněno
        fa_predana_zam_id: formData.fa_predana_zam_id || null,
        fa_datum_predani_zam: formData.fa_datum_predani_zam || null,
        fa_datum_vraceni_zam: formData.fa_datum_vraceni_zam || null
      };

      let result;

      if (editingInvoiceId) {
        // EDITACE - UPDATE faktury
        // updateInvoiceV2 očekává updateData jako separátní objekt
        const updateData = {
          objednavka_id: formData.order_id || null,
          smlouva_id: formData.smlouva_id || null,
          fa_cislo_vema: formData.fa_cislo_vema,
          fa_typ: formData.fa_typ || 'BEZNA',
          fa_datum_vystaveni: formData.fa_datum_vystaveni,
          fa_datum_splatnosti: formData.fa_datum_splatnosti || null,
          fa_datum_doruceni: formData.fa_datum_doruceni || null,
          fa_castka: formData.fa_castka,
          fa_poznamka: formData.fa_poznamka || '',
          fa_dorucena: formData.fa_datum_doruceni ? 1 : 0,
          fa_predana_zam_id: formData.fa_predana_zam_id || null,
          fa_datum_predani_zam: formData.fa_datum_predani_zam || null,
          fa_datum_vraceni_zam: formData.fa_datum_vraceni_zam || null,
          // fa_strediska_kod je již array stringů ["101_RLP_KLADNO"], jen JSON.stringify
          fa_strediska_kod: JSON.stringify(formData.fa_strediska_kod || []),
          // 🆕 VĚCNÁ SPRÁVNOST - přidat všechna pole
          umisteni_majetku: formData.umisteni_majetku || '',
          poznamka_vecne_spravnosti: formData.poznamka_vecne_spravnosti || '',
          vecna_spravnost_potvrzeno: formData.vecna_spravnost_potvrzeno || 0,
          potvrdil_vecnou_spravnost_id: formData.potvrdil_vecnou_spravnost_id || null,
          dt_potvrzeni_vecne_spravnosti: formData.dt_potvrzeni_vecne_spravnosti || null
        };
        
        // 🎯 Progress - aktualizace faktury
        setProgressModal(prev => ({
          ...prev,
          progress: 60,
          message: 'Aktualizuji údaje faktury v databázi...'
        }));

        result = await updateInvoiceV2({
          token,
          username,
          invoice_id: editingInvoiceId,
          updateData
        });
        
        // 🆕 LP ČERPÁNÍ: Uložit čerpání LP pro fakturu (pokud je LP financování)
        
        if (lpCerpani && lpCerpani.length > 0) {
          try {
            await saveFakturaLPCerpani(editingInvoiceId, lpCerpani, token, username);
          } catch (lpError) {
            console.error('❌ Chyba při ukládání LP čerpání:', lpError);
            // Nezastavujeme proces - LP čerpání je bonusová data, faktura už je uložena
            showToast && showToast('Faktura uložena, ale čerpání LP se nepodařilo uložit: ' + lpError.message, 'warning');
          }
        }
        
        setProgress?.(100);
        
        // ⏸️ POZASTAVENÍ: Success message se nastaví AŽ PO workflow update (dole)
      } else {
        // NOVÁ FAKTURA - CREATE
        // 🎯 Progress - vytváření faktury
        setProgressModal(prev => ({
          ...prev,
          progress: 60,
          message: formData.file 
            ? 'Nahrávám přílohu a vytvářím fakturu...' 
            : 'Vytvářím novou fakturu v databázi...'
        }));
        
        if (formData.file) {
          // S přílohou
          result = await createInvoiceWithAttachmentV2({
            ...apiParams,
            file: formData.file,
            klasifikace: formData.klasifikace || null // Typ přílohy
          });
        } else {
          // Bez přílohy
          result = await createInvoiceV2(apiParams);
        }

        // 🆕 LP ČERPÁNÍ: Uložit čerpání LP pro novou fakturu (pokud je LP financování)
        const newInvoiceId = result?.data?.invoice_id || result?.data?.id || result?.invoice_id || result?.id;
        
        if (newInvoiceId && lpCerpani && lpCerpani.length > 0) {
          try {
            await saveFakturaLPCerpani(newInvoiceId, lpCerpani, token, username);
          } catch (lpError) {
            console.error('❌ Chyba při ukládání LP čerpání:', lpError);
            // Nezastavujeme proces - LP čerpání je bonusová data, faktura už je uložena
            showToast && showToast('Faktura vytvořena, ale čerpání LP se nepodařilo uložit: ' + lpError.message, 'warning');
          }
        }

        setProgress?.(100);
        
        // ⏸️ POZASTAVENÍ: Success message se nastaví AŽ PO workflow update (dole)
      }

      // ✅ Pokud je faktura připojena k objednávce, aktualizuj workflow stav
      // - NOVÁ FAKTURA: přidat stav VECNA_SPRAVNOST
      // - EDITACE: vrátit na VECNA_SPRAVNOST (musí projít novou kontrolou)
      if (formData.order_id && orderData) {
        try {
          // Parsuj aktuální workflow stavy
          let stavKody = [];
          try {
            if (typeof orderData.stav_workflow_kod === 'string') {
              stavKody = JSON.parse(orderData.stav_workflow_kod);
            } else if (Array.isArray(orderData.stav_workflow_kod)) {
              stavKody = [...orderData.stav_workflow_kod];
            }
          } catch (e) {
            console.error('Chyba při parsování workflow stavů:', e);
            stavKody = [];
          }

          // Získej aktuální (poslední) stav
          const currentState = stavKody.length > 0 ? stavKody[stavKody.length - 1] : null;

          // ✅ DŮLEŽITÉ: Pokud editujeme fakturu která PŮVODNĚ NEMĚLA objednávku a TEĎ JI PŘIŘAZUJEME,
          // musíme se chovat jako NOVÁ faktura pro tuto objednávku (ne jako editace)
          const isAddingOrderToExistingInvoice = editingInvoiceId && !hadOriginalEntity && formData.order_id;

          // Logika pro změnu workflow stavu podle aktuálního stavu:
          // NOVÁ FAKTURA (nebo přiřazení k objednávce):
          // 1. NEUVEREJNIT nebo UVEREJNENA → přidat FAKTURACE → přidat VECNA_SPRAVNOST
          // 2. FAKTURACE → přidat VECNA_SPRAVNOST
          // 3. ZKONTROLOVANA → vrátit na VECNA_SPRAVNOST (faktury byly upraveny)
          // 4. VECNA_SPRAVNOST → nechat beze změny
          // 
          // EDITACE FAKTURY (která už měla objednávku):
          // - ZKONTROLOVANA nebo DOKONCENA → vrátit na VECNA_SPRAVNOST (musí projít novou kontrolou)
          // - VECNA_SPRAVNOST → nechat (už čeká na kontrolu)
          
          let needsUpdate = false;
          
          if (editingInvoiceId && !isAddingOrderToExistingInvoice) {
            // EDITACE existující faktury která UŽ MĚLA objednávku
            if (currentState === 'ZKONTROLOVANA' || currentState === 'DOKONCENA') {
              // Vrátit zpět na VECNA_SPRAVNOST - musí projít novou kontrolou
              stavKody.pop(); // Odstraň poslední stav (ZKONTROLOVANA/DOKONCENA)
              if (currentState === 'DOKONCENA' && stavKody[stavKody.length - 1] === 'ZKONTROLOVANA') {
                stavKody.pop(); // Odstraň i ZKONTROLOVANA pokud tam je
              }
              // Ujisti se že má VECNA_SPRAVNOST
              if (stavKody[stavKody.length - 1] !== 'VECNA_SPRAVNOST') {
                stavKody.push('VECNA_SPRAVNOST');
              }
              needsUpdate = true;
            }
            // Pokud je už ve VECNA_SPRAVNOST, necháme beze změny
            // Pokud je už ve VECNA_SPRAVNOST, necháme beze změny
          } else {
            // NOVÁ FAKTURA nebo PŘIŘAZENÍ FAKTURY K OBJEDNÁVCE
            if (currentState === 'NEUVEREJNIT' || currentState === 'UVEREJNENA') {
              // První faktura → přidat FAKTURACE a pak VECNA_SPRAVNOST
              stavKody.push('FAKTURACE');
              stavKody.push('VECNA_SPRAVNOST');
              needsUpdate = true;
            } else if (currentState === 'FAKTURACE') {
              // Už má FAKTURACE → jen přidat VECNA_SPRAVNOST
              stavKody.push('VECNA_SPRAVNOST');
              needsUpdate = true;
            } else if (currentState === 'ZKONTROLOVANA') {
              // Vrátit zpět na VECNA_SPRAVNOST (faktury byly upraveny)
              stavKody.pop(); // Odstraň ZKONTROLOVANA
              needsUpdate = true;
            }
            // Pokud je currentState === 'VECNA_SPRAVNOST', necháme beze změny (needsUpdate = false)
          }

          if (needsUpdate) {
            // 🎯 Progress - aktualizace workflow objednávky
            setProgressModal(prev => ({
              ...prev,
              progress: 85,
              message: 'Aktualizuji stav objednávky a odesílám notifikace...'
            }));
            
            // Aktualizuj objednávku
            // ✅ Kromě stav_workflow_kod je nutné aktualizovat i stav_objednavky (textový stav)
            await updateOrderV2(
              formData.order_id,
              { 
                stav_workflow_kod: JSON.stringify(stavKody),
                stav_objednavky: 'Věcná správnost'  // Text odpovídající stavu VECNA_SPRAVNOST
              },
              token,
              username
            );

            // 🔔 NOTIFIKACE: Odeslat notifikace přes organizační hierarchii
            // Backend sám rozhodne komu poslat (garant, objednatel, příp. "předáno komu") a eliminuje duplicity
            await sendInvoiceNotifications(formData.order_id, orderData);
            console.log('📬 Notifikace VECNA_SPRAVNOST: Odesláno přes organizační hierarchii pro objednávku:', formData.order_id);

            // ✅ Reload objednávky aby se zobrazil nový stav
            await loadOrderData(formData.order_id);
          }
        } catch (updateErr) {
          console.error('⚠️ Nepodařilo se aktualizovat workflow objednávky:', updateErr);
          // Neblokujeme úspěch faktury, jen logujeme chybu
        }
      }

      // 🔔 NOTIFIKACE: Změna stavu faktury na PŘEDÁNA (PREDANA / PREDANA_PO)
      // Poslat notifikaci když:
      // 1. Editujeme existující fakturu
      // 2. Změnil se stav faktury (fa_stav) na PREDANA nebo PREDANA_PO
      // 3. Faktura je připojena k objednávce NEBO smlouvě
      console.log('🐛 DEBUG NOTIFIKACE STAV - START');
      console.log('  editingInvoiceId:', editingInvoiceId);
      console.log('  originalFormData:', originalFormData ? 'EXISTS' : 'NULL');
      console.log('  formData.fa_stav:', formData.fa_stav);
      console.log('  formData.order_id:', formData.order_id);
      console.log('  formData.smlouva_id:', formData.smlouva_id);
      
      if (editingInvoiceId && originalFormData) {
        const originalStav = originalFormData.fa_stav;
        const currentStav = formData.fa_stav;
        const stavChanged = (originalStav !== currentStav);
        const isPredanaStav = ['PREDANA', 'PREDANA_PO', 'PREDANA_VECNA'].includes(currentStav?.toUpperCase());
        
        console.log('🐛 DEBUG NOTIFIKACE STAV - PODMÍNKY:');
        console.log('  originalStav:', originalStav);
        console.log('  currentStav:', currentStav);
        console.log('  stavChanged:', stavChanged);
        console.log('  isPredanaStav:', isPredanaStav);
        console.log('  formData.order_id:', formData.order_id);
        console.log('  orderData:', orderData ? 'EXISTS' : 'NULL');
        
        if (stavChanged && isPredanaStav) {
          try {
            const timestamp = new Date().toLocaleString('cs-CZ');
            // PRO OBJEDNÁVKY
            if (formData.order_id && orderData) {
              console.log(`🔔 [${timestamp}] ==========================================`);
              console.log(`🔔 [${timestamp}] ODESÍLÁM NOTIFIKACI - ZMĚNA STAVU FAKTURY`);
              console.log(`🔔 [${timestamp}] Typ: INVOICE_MATERIAL_CHECK_REQUESTED`);
              console.log(`🔔 [${timestamp}] Stav změněn: ${originalStav} → ${currentStav}`);
              console.log(`🔔 [${timestamp}] Order ID: ${formData.order_id}`);
              console.log(`🔔 [${timestamp}] User ID: ${user_id}`);
              console.log(`🔔 [${timestamp}] Číslo FA: ${formData.fa_cislo_vema || 'bez čísla'}`);
              
              await triggerNotification('INVOICE_MATERIAL_CHECK_REQUESTED', editingInvoiceId, user_id, {
                invoice_number: formData.fa_cislo_vema || 'bez čísla',
                invoice_state: currentStav
              });
              
              console.log(`✅ [${timestamp}] Notifikace úspěšně odeslána na backend`);
              console.log(`🔔 [${timestamp}] ==========================================`);
            }
            // PRO SMLOUVY
            else if (formData.smlouva_id && smlouvaData) {
              console.log(`🔔 [${timestamp}] ==========================================`);
              console.log(`🔔 [${timestamp}] ODESÍLÁM NOTIFIKACI - ZMĚNA STAVU FAKTURY (SMLOUVA)`);
              console.log(`🔔 [${timestamp}] Typ: INVOICE_MATERIAL_CHECK_REQUESTED`);
              console.log(`🔔 [${timestamp}] Stav změněn: ${originalStav} → ${currentStav}`);
              console.log(`🔔 [${timestamp}] Smlouva ID: ${formData.smlouva_id}`);
              console.log(`🔔 [${timestamp}] User ID: ${user_id}`);
              
              await triggerNotification('INVOICE_MATERIAL_CHECK_REQUESTED', editingInvoiceId, user_id, {
                smlouva_id: formData.smlouva_id,
                invoice_number: formData.fa_cislo_vema || 'bez čísla',
                invoice_state: currentStav
              });
              
              console.log(`✅ [${timestamp}] Notifikace úspěšně odeslána na backend`);
              console.log(`🔔 [${timestamp}] ==========================================`);
            } else {
              console.log('⚠️ DEBUG: Notifikace se NEPOSÍLÁ - chybí order_id nebo smlouva_id');
            }
          } catch (notifErr) {
            console.error('❌ CHYBA při odesílání notifikace při změně stavu faktury:');
            console.error('   Message:', notifErr.message);
            console.error('   Stack:', notifErr.stack);
            console.error('   Response:', notifErr.response?.data);
          }
        } else {
          console.log('⚠️ DEBUG: Notifikace se NEPOSÍLÁ - podmínky nesplněny:');
          if (!stavChanged) console.log('   - Stav se NEZMĚNIL');
          if (!isPredanaStav) console.log('   - Stav NENÍ typu PREDANA/PREDANA_PO/PREDANA_VECNA');
        }
      } else {
        console.log('⚠️ DEBUG: Notifikace se NEPOSÍLÁ - fakturu není editace nebo chybí originalFormData');
        if (!editingInvoiceId) console.log('   - editingInvoiceId je NULL (není to editace)');
        if (!originalFormData) console.log('   - originalFormData je NULL');
      }

      // 🔔 NOTIFIKACE: Změna "Předáno komu"
      // Poslat notifikaci když:
      // 1. Editujeme existující fakturu
      // 2. Změnilo se "Předáno komu" (fa_predana_zam_id)
      // 3. Je nastaveno datum předání (fa_datum_predani_zam) - POVINNÉ
      // 4. NENÍ nastaveno datum vrácení (fa_datum_vraceni_zam)
      // 5. Faktura je připojena k objednávce NEBO smlouvě
      console.log('🐛 DEBUG NOTIFIKACE PŘEDÁNO KOMU - START');
      console.log('  editingInvoiceId:', editingInvoiceId);
      console.log('  originalFormData:', originalFormData ? 'EXISTS' : 'NULL');
      console.log('  formData.fa_predana_zam_id:', formData.fa_predana_zam_id);
      console.log('  formData.fa_datum_predani_zam:', formData.fa_datum_predani_zam);
      console.log('  formData.fa_datum_vraceni_zam:', formData.fa_datum_vraceni_zam);
      
      if (editingInvoiceId && originalFormData && formData.fa_predana_zam_id) {
        const originalPredanoKomu = originalFormData.fa_predana_zam_id;
        const currentPredanoKomu = formData.fa_predana_zam_id;
        const hasDatePredani = !!formData.fa_datum_predani_zam;
        const hasDateVraceni = !!formData.fa_datum_vraceni_zam;
        const hasChanged = (originalPredanoKomu !== currentPredanoKomu);
        
        console.log('🐛 DEBUG NOTIFIKACE PŘEDÁNO KOMU - PODMÍNKY:');
        console.log('  originalPredanoKomu:', originalPredanoKomu);
        console.log('  currentPredanoKomu:', currentPredanoKomu);
        console.log('  hasChanged:', hasChanged);
        console.log('  hasDatePredani:', hasDatePredani);
        console.log('  hasDateVraceni:', hasDateVraceni);
        
        if (hasChanged && currentPredanoKomu && hasDatePredani && !hasDateVraceni) {
          try {
            const timestamp = new Date().toLocaleString('cs-CZ');
            // PRO OBJEDNÁVKY
            if (formData.order_id && orderData) {
              console.log(`🔔 [${timestamp}] ==========================================`);
              console.log(`🔔 [${timestamp}] ODESÍLÁM NOTIFIKACI - PŘEDÁNO KOMU (OBJEDNÁVKA)`);
              console.log(`🔔 [${timestamp}] Typ: INVOICE_MATERIAL_CHECK_REQUESTED`);
              console.log(`🔔 [${timestamp}] Změna: ${originalPredanoKomu} → ${currentPredanoKomu}`);
              console.log(`🔔 [${timestamp}] Invoice ID: ${editingInvoiceId}`);
              console.log(`🔔 [${timestamp}] Order ID: ${formData.order_id}`);
              console.log(`🔔 [${timestamp}] User ID: ${user_id}`);
              
              await triggerNotification('INVOICE_MATERIAL_CHECK_REQUESTED', editingInvoiceId, user_id, {
                invoice_number: formData.fa_cislo_vema || 'bez čísla',
                employee_id: currentPredanoKomu,
                order_id: formData.order_id
              });
              
              console.log(`✅ [${timestamp}] Notifikace úspěšně odeslána na backend`);
              console.log(`🔔 [${timestamp}] ==========================================`);
            }
            // PRO SMLOUVY
            else if (formData.smlouva_id && smlouvaData) {
              console.log(`🔔 [${timestamp}] ==========================================`);
              console.log(`🔔 [${timestamp}] ODESÍLÁM NOTIFIKACI - PŘEDÁNO KOMU (SMLOUVA)`);
              console.log(`🔔 [${timestamp}] Typ: INVOICE_MATERIAL_CHECK_REQUESTED`);
              console.log(`🔔 [${timestamp}] Změna: ${originalPredanoKomu} → ${currentPredanoKomu}`);
              console.log(`🔔 [${timestamp}] Smlouva ID: ${formData.smlouva_id}`);
              console.log(`🔔 [${timestamp}] Invoice ID: ${editingInvoiceId}`);
              console.log(`🔔 [${timestamp}] User ID: ${user_id}`);
              
              // Použít triggerNotification - volá /notifications/trigger s loadUniversalPlaceholders()
              await triggerNotification('INVOICE_MATERIAL_CHECK_REQUESTED', editingInvoiceId, user_id, {
                invoice_number: formData.fa_cislo_vema || 'bez čísla',
                employee_id: currentPredanoKomu,
                smlouva_id: formData.smlouva_id
              });
              
              console.log(`✅ [${timestamp}] Notifikace úspěšně odeslána přímo zaměstnanci ${currentPredanoKomu}`);
              console.log(`🔔 [${timestamp}] ==========================================`);
            }
            // PRO SAMOSTATNÉ FAKTURY (bez objednávky/smlouvy)
            // 🆕 NOTIFIKACE přímo zaměstnanci (fa_predana_zam_id)
            else if (editingInvoiceId) {
              console.log(`🔔 [${timestamp}] ==========================================`);
              console.log(`🔔 [${timestamp}] ODESÍLÁM NOTIFIKACI - PŘEDÁNO KOMU (SAMOSTATNÁ FAKTURA)`);
              console.log(`🔔 [${timestamp}] Typ: INVOICE_MATERIAL_CHECK_REQUESTED`);
              console.log(`🔔 [${timestamp}] Změna: ${originalPredanoKomu} → ${currentPredanoKomu}`);
              console.log(`🔔 [${timestamp}] Invoice ID: ${editingInvoiceId}`);
              console.log(`🔔 [${timestamp}] User ID: ${user_id}`);
              
              // Použít triggerNotification - volá /notifications/trigger s loadUniversalPlaceholders()
              await triggerNotification('INVOICE_MATERIAL_CHECK_REQUESTED', editingInvoiceId, user_id, {
                invoice_number: formData.fa_cislo_vema || 'bez čísla',
                employee_id: currentPredanoKomu
              });
              
              console.log(`✅ [${timestamp}] Notifikace úspěšně odeslána přímo zaměstnanci ${currentPredanoKomu}`);
              console.log(`🔔 [${timestamp}] ==========================================`);
            } else {
              console.log('⚠️ DEBUG: Notifikace se NEPOSÍLÁ - chybí editingInvoiceId (nová faktura?)');
            }
          } catch (notifErr) {
            console.error('❌ CHYBA při odesílání notifikace "Předáno komu":');
            console.error('   Message:', notifErr.message);
            console.error('   Stack:', notifErr.stack);
            console.error('   Response:', notifErr.response?.data);
          }
        } else {
          console.log('⚠️ DEBUG: Notifikace PŘEDÁNO KOMU se NEPOSÍLÁ - podmínky nesplněny:');
          if (!hasChanged) console.log('   - Předáno komu se NEZMĚNILO');
          if (!currentPredanoKomu) console.log('   - Předáno komu není vyplněno');
          if (!hasDatePredani) console.log('   - Chybí datum předání');
          if (hasDateVraceni) console.log('   - Je vyplněno datum vrácení');
        }
      } else {
        console.log('⚠️ DEBUG: Notifikace PŘEDÁNO KOMU se NEPOSÍLÁ - základní podmínky nesplněny:');
        if (!editingInvoiceId) console.log('   - editingInvoiceId je NULL (není to editace)');
        if (!originalFormData) console.log('   - originalFormData je NULL');
        if (!formData.fa_predana_zam_id) console.log('   - fa_predana_zam_id není vyplněno');
      }

      // 🎯 FINÁLNÍ SUCCESS MESSAGE - zobrazí se AŽ PO workflow update
      // 📝 SJEDNOCENÁ TEXTACE: Číslo FA + souvislost (OBJ/SML/samostatná)
      const faCislo = formData.fa_cislo_vema || 'bez čísla';
      let finalSuccessMessage = '';
      let finalSuccessTitle = '';
      
      if (editingInvoiceId) {
        // UPDATE faktury
        finalSuccessTitle = '✅ Faktura aktualizována';
        if (formData.order_id && orderData) {
          const objCislo = orderData.cislo_objednavky || orderData.evidencni_cislo || `#${orderData.id}`;
          finalSuccessMessage = `Faktura ${faCislo} byla úspěšně aktualizována.\n\nSouvisí s objednávkou: ${objCislo}`;
        } else if (formData.smlouva_id && smlouvaData) {
          const smlCislo = smlouvaData.cislo_smlouvy || `#${smlouvaData.id}`;
          finalSuccessMessage = `Faktura ${faCislo} byla úspěšně aktualizována.\n\nSouvisí se smlouvou: ${smlCislo}`;
        } else {
          finalSuccessMessage = `Faktura ${faCislo} byla úspěšně aktualizována.\n\nFaktura zatříděna jako samostatná (bez přiřazení k objednávce či smlouvě).`;
        }
      } else {
        // CREATE faktury
        finalSuccessTitle = '✅ Faktura zaevidována';
        if (formData.order_id && orderData) {
          const objCislo = orderData.cislo_objednavky || orderData.evidencni_cislo || `#${orderData.id}`;
          finalSuccessMessage = `Faktura ${faCislo} byla úspěšně zaevidována.\n\nPřiřazena k objednávce: ${objCislo}`;
        } else if (formData.smlouva_id && smlouvaData) {
          const smlCislo = smlouvaData.cislo_smlouvy || `#${smlouvaData.id}`;
          finalSuccessMessage = `Faktura ${faCislo} byla úspěšně zaevidována.\n\nPřiřazena ke smlouvě: ${smlCislo}`;
        } else {
          finalSuccessMessage = `Faktura ${faCislo} byla úspěšně zaevidována.\n\nFaktura zatříděna jako samostatná (bez přiřazení k objednávce či smlouvě).`;
        }
      }
      
      setProgressModal(prev => ({
        ...prev,
        progress: 100,
        status: 'success',
        title: finalSuccessTitle,
        message: finalSuccessMessage
      }));

      // ⚠️ RESET FORMULÁŘE se provede až po kliknutí na "Pokračovat" v progress dialogu
      // Uložíme data potřebná pro reset do stavu progress dialogu
      // ✅ PŘI UPDATE (skutečná editace původní faktury) - smazat všechno a přejít na seznam
      // ✅ PŘI CREATE (nové evidující - i když má temp ID pro přílohy) - zůstat na formuláři
      const wasEditing = isOriginalEdit;
      
      // ✅ CLEANUP: Vymazat originalFormData aby nedošlo k memory leak
      setOriginalFormData(null);
      setHasChangedCriticalField(false);
      
      // 💾 Uložit reset parametry do progress dialogu (použije se při kliknutí na "Pokračovat")
      setProgressModal(prev => ({
        ...prev,
        resetData: {
          wasEditing,
          wasReadOnlyMode: isReadOnlyMode, // 🆕 Pro rozlišení věcné správnosti vs. běžné evidence
          currentOrderId: formData.order_id,
          currentSmlouvaId: formData.smlouva_id
        }
      }));
      
      // 🚫 Nastavit flag aby se při dalším useEffect neloadovala data z LS
      setJustCompletedOperation(true);

      // 📋 SPISOVKA TRACKING: Označit dokument jako zpracovaný (pouze pro nové faktury, ne editace)
      // 📋 AUTO-TRACKING: Označit Spisovka dokument jako zpracovaný
      // Toto se provede na pozadí - neblokuje úspěch uložení faktury
      if (!editingInvoiceId && result?.data?.id) {
        try {
          // 🆕 PRIORITA 1: Hledat Spisovka metadata v prvním attachmentu
          const firstAttachment = attachments?.[0];
          
          if (firstAttachment?.spisovka_file_id && firstAttachment?.spisovka_dokument_id) {
            // ✅ PŘESNÉ PROPOJENÍ podle file_id z attachmentu
            await markSpisovkaDocumentProcessed({
              username,
              token,
              dokument_id: firstAttachment.spisovka_dokument_id,
              spisovka_priloha_id: firstAttachment.spisovka_file_id, // 🆕 Přesné ID přílohy
              faktura_id: result.data.id,
              fa_cislo_vema: formData.fa_cislo_vema,
              stav: 'ZAEVIDOVANO',
              poznamka: `Auto-tracking: Příloha ze Spisovky (file_id: ${firstAttachment.spisovka_file_id})`
            });
            
          }
          // FALLBACK: Pokud není Spisovka metadata, zkusit párovat podle názvu souboru (starý způsob)
          else if (formData.file && spisovkaLastRecords && spisovkaLastRecords.length > 0) {
            const potentialDoc = spisovkaLastRecords.find(doc => {
              if (doc.prilohy && doc.prilohy.length > 0) {
                return doc.prilohy.some(priloha => priloha.filename === formData.file.name);
              }
              return false;
            });

            if (potentialDoc?.dokument_id) {
              await markSpisovkaDocumentProcessed({
                username,
                token,
                dokument_id: potentialDoc.dokument_id,
                faktura_id: result.data.id,
                fa_cislo_vema: formData.fa_cislo_vema,
                stav: 'ZAEVIDOVANO',
                poznamka: `Auto-tracking: Párování podle názvu souboru (fallback)`
              });
              
            } else {
            }
          }
        } catch (spisovkaErr) {
          // Neblokujeme úspěch faktury - jen logujeme
          console.warn('⚠️ Nepodařilo se označit Spisovka dokument jako zpracovaný:', spisovkaErr);
        }
      }

    } catch (err) {
      console.error('=== DEBUG CATCH ERROR ===', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      setError(err.message || 'Chyba při evidenci faktury');
      setProgress?.(0);
      
      // 🗑️ KRITICKÉ: Při chybě smazat editingInvoiceId a resetovat form
      setEditingInvoiceId(null);
      setHadOriginalEntity(false);
      setInvoiceUserConfirmed(false);
      setIsOriginalEdit(false);
      setJustCompletedOperation(true); // Zabránit reload z LS
      
      // 💾 Vyčistit localStorage
      try {
        localStorage.removeItem(`invoiceForm_${user_id}`);
        localStorage.removeItem(`invoiceAttach_${user_id}`);
        localStorage.removeItem(`invoiceEdit_${user_id}`);
        localStorage.removeItem(`invoiceOrigEntity_${user_id}`);
        localStorage.removeItem(`invoiceLpCerpani_${user_id}`);
      } catch (lsErr) {
        console.warn('Chyba při mazání localStorage:', lsErr);
      }
      
      // Reset formuláře do výchozího stavu
      setFormData({
        order_id: '',
        smlouva_id: null,
        fa_cislo_vema: '',
        fa_typ: 'BEZNA',
        fa_datum_doruceni: formatDateForPicker(new Date()),
        fa_datum_vystaveni: '',
        fa_datum_splatnosti: '',
        fa_castka: '',
        fa_poznamka: '',
        fa_strediska_kod: [],
        file: null,
        fa_predana_zam_id: null,
        fa_datum_predani_zam: '',
        fa_datum_vraceni_zam: ''
      });
      setAttachments([]);
      setOrderData(null);
      setSmlouvaData(null);
      setLpCerpani([]);
      
      // 🎯 Progress - chyba při ukládání
      setProgressModal({
        show: true,
        status: 'error',
        progress: 0,
        title: 'Chyba při ukládání faktury',
        message: err.message || 'Došlo k neočekávané chybě při ukládání faktury. Zkuste to prosím znovu.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler: zpět na seznam
  const handleBack = async () => {
    // ✅ Kontrola neuložených změn (pro editaci i novou fakturu)
    const hasUnsavedChanges = editingInvoiceId 
      ? hasChangedCriticalField // Pro editaci - sledujeme kritická pole
      : (!(!formData.fa_cislo_vema && !formData.fa_castka && !formData.order_id && !formData.file)); // Pro novou fakturu - není prázdná
    
    // Pokud NEJSOU neuložené změny, rovnou zpět
    if (!hasUnsavedChanges) {
      // Vyčistit LS i při odchodu bez změn (aby se neobjevily příště)
      try {
        localStorage.removeItem(`invoiceForm_${user_id}`);
        localStorage.removeItem(`invoiceAttach_${user_id}`);
        localStorage.removeItem(`invoiceEdit_${user_id}`);
        localStorage.removeItem(`invoiceOrigEntity_${user_id}`);
        localStorage.removeItem('spisovka_active_dokument');
      } catch (err) {
        console.warn('Chyba při mazání localStorage:', err);
      }
      navigate(-1);
      return;
    }
    
    // ⚠️ Pokud má formulář neuložené změny, zeptat se na zrušení
    const dialogMessage = editingInvoiceId
      ? 'Máte neuložené změny faktury. Chcete odejít bez uložení? Všechny změny budou ztraceny.'
      : (formData.file 
        ? 'Máte rozdělanou fakturu s nahranou přílohou. Chcete zrušit evidenci? Všechna data a nahrané přílohy budou ztraceny.'
        : 'Máte rozdělanou fakturu. Chcete zrušit evidenci? Všechna vyplněná data budou ztracena.');
    
    setConfirmDialog({
      isOpen: true,
      title: editingInvoiceId ? '⚠️ Neuložené změny' : '⚠️ Zrušit evidenci faktury?',
      message: dialogMessage,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
        
        // 🗑️ Smazat přílohy POUZE pokud to byla NOVÁ faktura (temp ID nebo čerstvě vytvořená)
        // Pro EDITACI reálné faktury NEMAZAT přílohy (patří k existující faktuře v DB)
        const wasEditingRealInvoice = editingInvoiceId && Number(editingInvoiceId) > 0 && hadOriginalEntity;
        
        if (!wasEditingRealInvoice) {
          // NOVÁ FAKTURA - smazat uploadnuté přílohy
          const uploadedAttachments = attachments.filter(att => att.serverId);
          const hasRealInvoiceId = editingInvoiceId && Number(editingInvoiceId) > 0;
          
          if (uploadedAttachments.length > 0 && hasRealInvoiceId) {
            
            for (const att of uploadedAttachments) {
              try {
                await deleteInvoiceAttachment25({
                  token,
                  username,
                  faktura_id: editingInvoiceId,
                  priloha_id: att.serverId,
                  objednavka_id: formData.order_id || null,
                  hard_delete: 1 // Fyzicky smazat ze serveru
                });
              } catch (err) {
                console.error(`❌ Chyba při mazání přílohy ${att.name}:`, err);
                // Pokračovat v mazání dalších příloh i při chybě
              }
            }
          } else if (uploadedAttachments.length > 0 && !hasRealInvoiceId) {
            // Přílohy nahrány k temp-new-invoice - nemají DB záznam, nemazat přes API
          }
        } else {
          // Editace reálné faktury - přílohy NEMAZAT (patří k existující faktuře)
        }
        
        // Vyčistit formData aby se uvolnila reference na soubor
        setFormData({
          fa_cislo_vema: '',
          fa_datum_vystaveni: '',
          fa_datum_zdanitelneho_plneni: '',
          fa_datum_splatnosti: '',
          fa_castka: '',
          order_id: '',
          dodavatel_id: '',
          stredisko_id: '',
          typ_faktury: '',
          fa_poznamka: '',
          fa_predana_zam_id: '',
          file: null,
          klasifikace: null
        });
        
        // Vyčistit attachments state
        setAttachments([]);
        
        // 💾 Vymazat localStorage při zrušení
        try {
          localStorage.removeItem(`invoiceForm_${user_id}`);
          localStorage.removeItem(`invoiceAttach_${user_id}`);
          localStorage.removeItem(`invoiceEdit_${user_id}`);
          localStorage.removeItem(`invoiceOrigEntity_${user_id}`);
          localStorage.removeItem('spisovka_active_dokument');
        } catch (err) {
          console.warn('Chyba při mazání localStorage:', err);
        }
        
        navigate(-1);
      },
      onCancel: () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  // Handler: toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Helper: Toggle select dropdown
  const toggleSelect = (fieldName) => {
    setSelectStates(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Helper: Filter options
  const filterOptions = (options, searchTerm) => {
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter(opt => 
      (opt.label || opt).toLowerCase().includes(lowerSearch)
    );
  };

  // Helper: Get option label
  const getOptionLabel = (option) => {
    return option?.label || option?.value || option;
  };

  // MultiSelect komponenta
  const MultiSelect = ({
    values = [],
    onChange,
    options = [],
    placeholder,
    disabled = false
  }) => {
    const safeValues = Array.isArray(values) ? values : [];
    const isOpen = selectStates.strediska;
    const searchTerm = searchStates.strediska || '';
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const searchInputRef = useRef(null);

    const filteredOptions = filterOptions(options, searchTerm);

    // Zavřít dropdown při kliku mimo
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event) => {
        if (
          dropdownRef.current && 
          buttonRef.current &&
          !dropdownRef.current.contains(event.target) &&
          !buttonRef.current.contains(event.target)
        ) {
          setSelectStates(prev => ({ ...prev, strediska: false }));
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Pozicování pro fixed dropdown
    useEffect(() => {
      if (isOpen && buttonRef.current && dropdownRef.current) {
        const updatePosition = () => {
          if (!buttonRef.current || !dropdownRef.current) return;
          const buttonRect = buttonRef.current.getBoundingClientRect();
          const dropdown = dropdownRef.current;

          dropdown.style.left = buttonRect.left + 'px';
          dropdown.style.width = buttonRect.width + 'px';
          dropdown.style.top = (buttonRect.bottom + 2) + 'px';
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, { passive: true, capture: true });
        window.addEventListener('resize', updatePosition, { passive: true });

        return () => {
          window.removeEventListener('scroll', updatePosition, { capture: true });
          window.removeEventListener('resize', updatePosition);
        };
      }
    }, [isOpen]);

    // Auto-focus search při otevření
    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        // requestAnimationFrame místo setTimeout - synchronizuje s browser paint
        const rafId = requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
        
        return () => cancelAnimationFrame(rafId);
      }
    }, [isOpen]);

    const displayValue = safeValues.length > 0
      ? safeValues.map(val => {
          const option = options.find(opt => opt.value === val || opt === val);
          return option ? getOptionLabel(option) : val;
        }).join(', ')
      : placeholder;

    const handleToggleOption = (option) => {
      const optionValue = option.value || option;
      const newValues = safeValues.includes(optionValue)
        ? safeValues.filter(v => v !== optionValue)
        : [...safeValues, optionValue];

      onChange({ target: { value: newValues } });
    };

    return (
      <MultiSelectWrapper isOpen={isOpen}>
        <MultiSelectButton
          ref={buttonRef}
          onClick={() => !disabled && toggleSelect('strediska')}
          disabled={disabled}
          placeholder={safeValues.length === 0 ? "true" : "false"}
          value={safeValues.length > 0 ? 'selected' : ''}
          isOpen={isOpen}
        >
          <SelectedValue isEmpty={safeValues.length === 0}>{displayValue}</SelectedValue>
        </MultiSelectButton>

        {isOpen && !disabled && (
          <MultiSelectDropdown ref={dropdownRef}>
            <SearchBox>
              <SearchIcon>
                <Search size={16} />
              </SearchIcon>
              <SearchInput
                ref={searchInputRef}
                type="text"
                placeholder="Vyhledat středisko..."
                value={searchTerm}
                onChange={(e) => setSearchStates(prev => ({
                  ...prev,
                  strediska: e.target.value
                }))}
              />
            </SearchBox>

            {filteredOptions.map((option, index) => {
              const optionValue = option.value || option;
              const isChecked = safeValues.includes(optionValue);

              return (
                <MultiSelectOption
                  key={option.value || index}
                  level={option.level || 0}
                  onClick={() => handleToggleOption(option)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                  />
                  <span>{getOptionLabel(option)}</span>
                </MultiSelectOption>
              );
            })}

            {filteredOptions.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>
                Žádné středisko nenalezeno
              </div>
            )}
          </MultiSelectDropdown>
        )}
      </MultiSelectWrapper>
    );
  };

  // ⏳ LOADING GATE: Čekat na načtení číselníků před zobrazením formuláře
  const isInitialDataLoaded = strediskaOptions.length > 0 && typyFakturOptions.length > 0 && zamestnanci.length > 0;
  
  if (!isInitialDataLoaded) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>
            <FontAwesomeIcon icon={faFileInvoice} />
            Načítají se data...
          </PageTitle>
        </PageHeader>
        <ContentLayout>
          <FormColumn>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: '400px',
              gap: '1.5rem'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                border: '6px solid #e5e7eb',
                borderTop: '6px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{
                color: '#6b7280',
                fontSize: '1.1rem',
                fontWeight: '500'
              }}>
                Načítají se číselníky...
              </div>
              <div style={{
                color: '#9ca3af',
                fontSize: '0.9rem'
              }}>
                Střediska, typy faktur, zaměstnanci
              </div>
            </div>
          </FormColumn>
        </ContentLayout>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </PageContainer>
    );
  }

  // Content komponenta (sdílená pro normal i fullscreen režim)
  const PageContent = (
    <>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={(editingInvoiceId && invoiceUserConfirmed) ? faEdit : faFileInvoice} />
          {(editingInvoiceId && invoiceUserConfirmed)
            ? (isReadOnlyMode ? 'Doplnění věcné správnosti k faktuře' : 'Upravit fakturu') 
            : 'Zaevidovat fakturu'
          }
        </PageTitle>
        <HeaderActions>
          {(hasPermission('ADMIN') || hasPermission('FILE_REGISTRY_MANAGE')) && (
            <TooltipWrapper
              ref={tooltipButtonRef}
              onMouseEnter={() => {
                setShowSpisovkaTooltip(true);
                if (tooltipButtonRef.current) {
                  const rect = tooltipButtonRef.current.getBoundingClientRect();
                  const tooltipWidth = 350;
                  let left = rect.right - tooltipWidth;
                  
                  // Adjust if tooltip would go off left edge
                  if (left < 10) {
                    left = 10;
                  }
                  
                  // Adjust if tooltip would go off right edge
                  if (left + tooltipWidth > window.innerWidth - 10) {
                    left = window.innerWidth - tooltipWidth - 10;
                  }
                  
                  setTooltipPosition({
                    top: rect.bottom + 10,
                    left: left
                  });
                }
              }}
              onMouseLeave={() => setShowSpisovkaTooltip(false)}
            >
              <IconButton 
                onClick={() => {
                  setShowSpisovkaTooltip(false);
                  setSpisovkaInboxOpen(!spisovkaInboxOpen);
                }} 
                title={spisovkaInboxOpen ? 'Zavřít Spisovka InBox' : 'Otevřít Spisovka InBox'}
                style={{ 
                  backgroundColor: spisovkaInboxOpen ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: spisovkaInboxOpen ? '#10b981' : '#9ca3af'
                }}
              >
                <FontAwesomeIcon icon={faBookOpen} />
                {spisovkaTodayCount > 0 && (
                  <NotificationBadge>{spisovkaTodayCount}</NotificationBadge>
                )}
              </IconButton>
              <TooltipContent 
                show={showSpisovkaTooltip && spisovkaLastRecords.length > 0}
                $top={tooltipPosition.top}
                $left={tooltipPosition.left}
              >
                <TooltipTitle>Posledních 5 záznamů</TooltipTitle>
                {spisovkaLastRecords.map((record) => (
                  <TooltipItem key={record.dokument_id}>
                    <TooltipItemTitle>{record.nazev}</TooltipItemTitle>
                    <TooltipItemMeta>
                      <span>📎 {record.pocet_priloh} přílohy</span>
                      <span>#{record.dokument_id}</span>
                    </TooltipItemMeta>
                  </TooltipItem>
                ))}
              </TooltipContent>
            </TooltipWrapper>
          )}
          <IconButton onClick={toggleFullscreen} title={isFullscreen ? 'Normální režim' : 'Celá obrazovka'}>
            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
          </IconButton>
          <IconButton onClick={handleBack} title="Zavřít a vrátit se na seznam faktur">
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
        </HeaderActions>
      </PageHeader>

      <ContentLayout $fullscreen={isFullscreen}>
        {/* LEVÁ STRANA - FORMULÁŘ (60%) */}
        <FormColumn>
          <FormColumnHeader style={{ minHeight: '0px', padding: '0' }}>
            {/* Header je prázdný - tlačítko přesunuto do záhlaví sekce */}
          </FormColumnHeader>

          {/* Scrollable content area */}
          <FormColumnContent>
            {/* 🆕 SEKCE 1: ÚDAJE FAKTURY - collapsible */}
            <CollapsibleSection>
            <CollapsibleHeader onClick={() => toggleSection('invoiceData')}>
              <HeaderLeft>
                <FontAwesomeIcon icon={faCreditCard} />
                Údaje faktury
                {editingInvoiceId && (
                  <span style={{ 
                    marginLeft: '1rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.9rem',
                    fontWeight: 400
                  }}>
                    - Režim úprav #{editingInvoiceId}
                  </span>
                )}
              </HeaderLeft>
              <HeaderRight>
                {/* Badge pro readonly režim */}
                {isReadOnlyMode && (
                  <span style={{ 
                    marginRight: '1rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    color: '#1e40af',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    POUZE PRO ČTENÍ
                  </span>
                )}
                
                {/* 🔥 NOVÝ: Badge pro uzamčenou fakturu po schválení věcné správnosti */}
                {!isReadOnlyMode && formData.vecna_spravnost_potvrzeno === 1 && !hasPermission('INVOICE_MANAGE_ALL') && (
                  <span style={{ 
                    marginRight: '1rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <FontAwesomeIcon icon={faLock} />
                    Faktura uzamčena
                  </span>
                )}
                
                {/* Tlačítko zrušit úpravu - pouze v editačním režimu (ne readonly) */}
                {editingInvoiceId && !isReadOnlyMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Zabránit zavření sekce
                      
                      // ✅ KROK 0: Nastavit flag, že probíhá reset (blokuje useEffect)
                      isResettingRef.current = true;
                      
                      // ✅ KROK 0.5: BLOKOVAT auto-save do localStorage!
                      setAllowLSSave(false);
                      
                      // ✅ KROK 1: Vyčistit localStorage IHNED (před jakýmkoliv state update)
                      try {
                        localStorage.removeItem(`invoiceForm_${user_id}`);
                        localStorage.removeItem(`invoiceAttach_${user_id}`);
                        localStorage.removeItem(`invoiceEdit_${user_id}`);
                        localStorage.removeItem(`invoiceOrigEntity_${user_id}`);
                      } catch (err) {
                        console.warn('Chyba při mazání localStorage:', err);
                      }
                      
                      // ✅ KROK 2: Kompletní reset state
                      setEditingInvoiceId(null);
                      setInvoiceUserConfirmed(false);
                      setIsOriginalEdit(false);
                      setAttachments([]);
                      setOriginalFormData(null);
                      setHasChangedCriticalField(false);
                      setIsEntityUnlocked(false);
                      setHadOriginalEntity(false);
                      setFieldErrors({});
                      
                      // ✅ RESET loading flags
                      hasLoadedInvoiceRef.current = false; // ✅ NOVÝ: Reset aby se mohla načíst jiná faktura
                      
                      // ✅ VŽDY resetovat všechno včetně entity
                      setFormData({
                        order_id: '',
                        smlouva_id: null,
                        fa_cislo_vema: '',
                        fa_typ: 'BEZNA',
                        fa_datum_doruceni: formatDateForPicker(new Date()),
                        fa_datum_vystaveni: '',
                        fa_datum_splatnosti: '',
                        fa_castka: '',
                        fa_poznamka: '',
                        fa_strediska_kod: [],
                        file: null,
                        fa_predana_zam_id: null,
                        fa_datum_predani_zam: '',
                        fa_datum_vraceni_zam: '',
                        vecna_spravnost_umisteni_majetku: '',
                        vecna_spravnost_poznamka: '',
                        vecna_spravnost_potvrzeno: 0,
                        potvrdil_vecnou_spravnost_id: null,
                        dt_potvrzeni_vecne_spravnosti: ''
                      });
                      
                      // ✅ Vyčistit preview entity
                      setOrderData(null);
                      setSmlouvaData(null);
                      setSearchTerm('');
                      setShowSuggestions(false);
                      setSelectedType('order');
                      
                      // ✅ KROK 3: Reset location.state
                      navigate(location.pathname, { replace: true, state: {} });
                      showToast && showToast('✨ Formulář resetován pro novou fakturu', 'info');
                      
                      // ✅ KROK 4: Reset flagů po krátkém delay (až se vše dokončí)
                      setTimeout(() => {
                        isResettingRef.current = false;
                        setAllowLSSave(true); // ✅ Znovu povolit auto-save
                      }, 100);
                    }}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      marginRight: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    title="Zrušit úpravy a vrátit se k novému záznamu"
                  >
                    <FontAwesomeIcon icon={faTimes} /> Zrušit úpravu
                  </button>
                )}
                <CollapseButton $collapsed={!sectionStates.invoiceData}>
                  <FontAwesomeIcon icon={faChevronDown} />
                </CollapseButton>
              </HeaderRight>
            </CollapsibleHeader>
            <SectionContent $collapsed={!sectionStates.invoiceData}>
            {error && (
              <ErrorAlert>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {error}
              </ErrorAlert>
            )}

            <FakturaCard $isEditing={true}>
            {/* ŘÁDEK 1: Název smlouvy / Předmět objednávky - přes celou šířku */}
            <FieldRow $columns="1fr">
              <FieldGroup>
                <FieldLabel>
                  {selectedType === 'smlouva' ? 'Název smlouvy' : 'Předmět objednávky'}
                </FieldLabel>
                <div style={{ 
                  minHeight: '62px',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  background: (orderData || smlouvaData) ? '#f0f9ff' : '#f9fafb', 
                  border: (orderData || smlouvaData) ? '2px solid #3b82f6' : '2px solid #e5e7eb', 
                  borderRadius: '8px',
                  color: (orderData || smlouvaData) ? '#1e40af' : '#9ca3af',
                  fontWeight: (orderData || smlouvaData) ? '600' : '400',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}>
                  {selectedType === 'order' && orderData 
                    ? (orderData.predmet || '—')
                    : selectedType === 'smlouva' && smlouvaData
                    ? (smlouvaData.nazev_smlouvy || smlouvaData.nazev || '—')
                    : '—'}
                </div>
              </FieldGroup>
            </FieldRow>

            {/* ŘÁDEK 2: Výběr objednávky/smlouvy | Platnost/Datum vytvoření | Celková cena */}
            <FieldRow $columns="2fr 1fr 1fr">
              <FieldGroup style={{ width: '100%' }}>
                <FieldLabel>
                  Vyberte objednávku nebo smlouvu
                </FieldLabel>
                <AutocompleteWrapper className="autocomplete-wrapper" style={{ width: '100%', position: 'relative' }}>
                  {/* Ikona zámku - klikatelná pro odemčení */}
                  {editingInvoiceId && hadOriginalEntity && (formData.order_id || formData.smlouva_id) && !isEntityUnlocked && (
                    <div
                      onClick={handleUnlockEntity}
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#f59e0b',
                        fontSize: '0.875rem',
                        zIndex: 1,
                        cursor: 'pointer',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#d97706'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#f59e0b'}
                      title="Klikněte pro odemčení změny objednávky/smlouvy"
                    >
                      <FontAwesomeIcon icon={faLock} />
                    </div>
                  )}
                  <AutocompleteInput
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    disabled={isReadOnlyMode || !!orderId || (editingInvoiceId && hadOriginalEntity && (formData.order_id || formData.smlouva_id) && !isEntityUnlocked)}
                    placeholder={
                      "Začněte psát ev. číslo objednávky nebo smlouvy (min. 3 znaky)..."
                    }
                    style={{ 
                      width: '100%',
                      paddingLeft: (editingInvoiceId && hadOriginalEntity && (formData.order_id || formData.smlouva_id) && !isEntityUnlocked) ? '2.5rem' : '0.75rem',
                      paddingRight: searchTerm ? '2.5rem' : '0.75rem'
                    }}
                  />
                  {searchTerm && (
                    <ClearButton
                      type="button"
                      onClick={handleClearSearch}
                      title="Vymazat text"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </ClearButton>
                  )}
                  {showSuggestions && searchTerm && (
                    <AutocompleteDropdown>
                      {isSearching ? (
                        <SearchingSpinner>
                          <FontAwesomeIcon icon={faFileInvoice} spin />
                          {' Vyhledávám...'}
                        </SearchingSpinner>
                      ) : searchTerm.length < 3 ? (
                        <NoResults>
                          <FontAwesomeIcon icon={faSearch} style={{ marginRight: '0.5rem' }} />
                          Zadejte alespoň 3 znaky pro vyhledávání
                        </NoResults>
                      ) : suggestions.length > 0 ? (
                        suggestions.map(item => {
                          const isOrder = item._type === 'order';
                          const isSmlouva = item._type === 'smlouva';

                          // Pro objednávky
                          if (isOrder) {
                            const stavText = item.stav || '';
                            const getStavColor = (stav) => {
                              const stavLower = (stav || '').toLowerCase();
                              if (stavLower.includes('dokončen') || stavLower.includes('zkontrolovan')) {
                                return { bg: '#d1fae5', text: '#065f46' };
                              }
                              if (stavLower.includes('fakturac') || stavLower.includes('věcná správnost')) {
                                return { bg: '#dbeafe', text: '#1e40af' };
                              }
                              if (stavLower.includes('odeslan') || stavLower.includes('potvr')) {
                                return { bg: '#e0e7ff', text: '#3730a3' };
                              }
                              if (stavLower.includes('schval')) {
                                return { bg: '#fef3c7', text: '#92400e' };
                              }
                              return { bg: '#e5e7eb', text: '#374151' };
                            };
                            const stavColors = getStavColor(stavText);

                            return (
                              <OrderSuggestionItem
                                key={`order-${item.id}`}
                                onClick={() => handleSelectOrder(item)}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                  <OrderSuggestionTitle style={{ flex: 1 }}>
                                    <OrderSuggestionBadge $color="#3b82f6" $textColor="white" style={{ marginRight: '0.5rem' }}>
                                      OBJ
                                    </OrderSuggestionBadge>
                                    {item.cislo_objednavky || item.evidencni_cislo || `#${item.id}`}
                                    {stavText && (
                                      <OrderSuggestionBadge $color={stavColors.bg} $textColor={stavColors.text} style={{ marginLeft: '0.5rem' }}>
                                        {stavText}
                                      </OrderSuggestionBadge>
                                    )}
                                    {item.max_cena_s_dph && (
                                      <OrderSuggestionBadge $color="#fef3c7" $textColor="#92400e" style={{ marginLeft: '0.5rem' }}>
                                        {parseFloat(item.max_cena_s_dph).toLocaleString('cs-CZ')} Kč
                                      </OrderSuggestionBadge>
                                    )}
                                  </OrderSuggestionTitle>
                                  {item.pocet_faktur !== undefined && (
                                    <OrderSuggestionBadge 
                                      $color={item.pocet_faktur > 0 ? '#e0f2fe' : '#f1f5f9'} 
                                      $textColor={item.pocet_faktur > 0 ? '#0369a1' : '#64748b'}
                                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                      <FontAwesomeIcon icon={faFileInvoice} style={{ fontSize: '0.7rem' }} />
                                      {item.pocet_faktur || 0}
                                    </OrderSuggestionBadge>
                                  )}
                                </div>
                                <OrderSuggestionDetail>
                                  {item.predmet && <span><strong>Předmět:</strong> {item.predmet}</span>}
                                  {item.dodavatel_nazev && (
                                    <span>
                                      <strong>{item.dodavatel_nazev}</strong>
                                      {item.dodavatel_ico && ` (IČO: ${item.dodavatel_ico})`}
                                    </span>
                                  )}
                                </OrderSuggestionDetail>
                              </OrderSuggestionItem>
                            );
                          }

                          // Pro smlouvy
                          if (isSmlouva) {
                            return (
                              <OrderSuggestionItem
                                key={`smlouva-${item.id}`}
                                onClick={() => {
                                  setSelectedType('smlouva');
                                  loadSmlouvaData(item.id);
                                  setShowSuggestions(false);
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                  <OrderSuggestionTitle style={{ flex: 1 }}>
                                    <OrderSuggestionBadge $color="#10b981" $textColor="white" style={{ marginRight: '0.5rem' }}>
                                      SML
                                    </OrderSuggestionBadge>
                                    {item.cislo_smlouvy}
                                    {item.hodnota_s_dph && (
                                      <OrderSuggestionBadge $color="#fef3c7" $textColor="#92400e" style={{ marginLeft: '0.5rem' }}>
                                        {parseFloat(item.hodnota_s_dph).toLocaleString('cs-CZ')} Kč
                                      </OrderSuggestionBadge>
                                    )}
                                  </OrderSuggestionTitle>
                                </div>
                                <OrderSuggestionDetail>
                                  {item.nazev_smlouvy && <span><strong>Název:</strong> {item.nazev_smlouvy}</span>}
                                  {item.nazev_firmy && (
                                    <span>
                                      <strong>{item.nazev_firmy}</strong>
                                      {item.ico && ` (IČO: ${item.ico})`}
                                    </span>
                                  )}
                                </OrderSuggestionDetail>
                              </OrderSuggestionItem>
                            );
                          }

                          return null;
                        })
                      ) : (
                        <NoResults>
                          <FontAwesomeIcon icon={faSearch} style={{ marginRight: '0.5rem' }} />
                          Žádné objednávky ani smlouvy nenalezeny
                          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#9ca3af' }}>
                            Hledají se odeslané objednávky a aktivní smlouvy
                          </div>
                        </NoResults>
                      )}
                    </AutocompleteDropdown>
                  )}
                </AutocompleteWrapper>
                <HelpText>
                  {orderId 
                    ? 'Objednávka je předvyplněna z kontextu' 
                    : 'Nepovinné - pokud faktura není vázána na objednávku ani smlouvu, nechte prázdné'}
                </HelpText>
              </FieldGroup>

              {/* Platnost do / Datum vytvoření */}
              <FieldGroup>
                <FieldLabel>
                  {selectedType === 'smlouva' ? 'Platnost do' : 'Datum vytvoření'}
                </FieldLabel>
                <div style={{ 
                  height: '48px',
                  padding: '1px 0.875rem', 
                  display: 'flex',
                  alignItems: 'center',
                  background: (orderData || smlouvaData) ? '#fef3c7' : '#f9fafb', 
                  border: (orderData || smlouvaData) ? '2px solid #f59e0b' : '2px solid #e5e7eb', 
                  borderRadius: '8px',
                  color: (orderData || smlouvaData) ? '#92400e' : '#9ca3af',
                  fontWeight: (orderData || smlouvaData) ? '600' : '400',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}>
                  {(() => {
                    // Pro objednávky zobrazit datum vytvoření
                    if (orderData) {
                      const datum = orderData.dt_objednavky || orderData.datum_objednavky || orderData.created_at || orderData.dt_vytvoreni || orderData.datum_vytvoreni;
                      if (datum) {
                        return formatDateOnly(datum);
                      }
                    }
                    // Pro smlouvy zobrazit platnost do
                    if (smlouvaData && smlouvaData.platnost_do) {
                      return formatDateOnly(smlouvaData.platnost_do);
                    }
                    return '—';
                  })()}
                </div>
              </FieldGroup>

              {/* Celková cena - dynamicky podle typu entity */}
              <FieldGroup>
                <FieldLabel>
                  {selectedType === 'smlouva' ? 'Celkem plnění s DPH' : 'Celková cena'}
                </FieldLabel>
                <div style={{ 
                  height: '48px',
                  padding: '1px 0.875rem', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  background: (orderData || smlouvaData) ? '#f0fdf4' : '#f9fafb', 
                  border: (orderData || smlouvaData) ? '2px solid #10b981' : '2px solid #e5e7eb', 
                  borderRadius: '8px',
                  color: (orderData || smlouvaData) ? '#065f46' : '#9ca3af',
                  fontWeight: (orderData || smlouvaData) ? '700' : '400',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}>
                  {(() => {
                    let amount = null;
                    if (selectedType === 'order' && orderData?.max_cena_s_dph) {
                      amount = orderData.max_cena_s_dph;
                    } else if (selectedType === 'smlouva' && smlouvaData) {
                      amount = smlouvaData.hodnota_s_dph || smlouvaData.celkova_castka;
                    }
                    
                    return amount
                      ? new Intl.NumberFormat('cs-CZ', { 
                          style: 'decimal', 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }).format(parseFloat(amount)) + ' Kč'
                      : '—';
                  })()}
                </div>
              </FieldGroup>
            </FieldRow>

            {/* GRID 3x - ŘÁDEK 2: Datum doručení | Datum vystavení | Datum splatnosti */}
            <FieldRow $columns="1fr 1fr 1fr">
              <FieldGroup>
                <FieldLabel>
                  Datum doručení <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <DatePicker
                  value={formData.fa_datum_doruceni}
                  onChange={(date) => setFormData(prev => ({ ...prev, fa_datum_doruceni: date }))}
                  onBlur={(date) => setFormData(prev => ({ ...prev, fa_datum_doruceni: date }))}
                  disabled={!isInvoiceEditable || loading}
                  placeholder="dd.mm.rrrr"
                  hasError={!!fieldErrors.fa_datum_doruceni}
                />
                {fieldErrors.fa_datum_doruceni && (
                  <FieldError>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    {fieldErrors.fa_datum_doruceni}
                  </FieldError>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>
                  Datum vystavení <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <DatePicker
                  value={formData.fa_datum_vystaveni}
                  onChange={(date) => setFormData(prev => ({ ...prev, fa_datum_vystaveni: date }))}
                  onBlur={(date) => setFormData(prev => ({ ...prev, fa_datum_vystaveni: date }))}
                  disabled={!isInvoiceEditable || loading}
                  placeholder="dd.mm.rrrr"
                  hasError={!!fieldErrors.fa_datum_vystaveni}
                />
                {fieldErrors.fa_datum_vystaveni && (
                  <FieldError>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    {fieldErrors.fa_datum_vystaveni}
                  </FieldError>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>
                  Datum splatnosti <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <DatePicker
                  value={formData.fa_datum_splatnosti}
                  onChange={(date) => setFormData(prev => ({ ...prev, fa_datum_splatnosti: date }))}
                  onBlur={(date) => setFormData(prev => ({ ...prev, fa_datum_splatnosti: date }))}
                  disabled={!isInvoiceEditable || loading}
                  placeholder="dd.mm.rrrr"
                  hasError={!!fieldErrors.fa_datum_splatnosti}
                />
                {fieldErrors.fa_datum_splatnosti && (
                  <FieldError>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    {fieldErrors.fa_datum_splatnosti}
                  </FieldError>
                )}
              </FieldGroup>
            </FieldRow>

            {/* GRID 3x - ŘÁDEK 3: Typ faktury | Variabilní symbol | Částka vč. DPH */}
            <FieldRow $columns="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" $gap="1rem">
              <FieldGroup>
                <FieldLabel>
                  Typ faktury <RequiredStar>*</RequiredStar>
                </FieldLabel>
                <CustomSelect
                  field="fa_typ"
                  value={formData.fa_typ}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, fa_typ: e.target.value }));
                  }}
                  disabled={!isInvoiceEditable || loading || invoiceTypesLoading}
                  options={invoiceTypesOptions}
                  placeholder={invoiceTypesLoading ? "Načítám typy faktur..." : "-- Vyberte typ --"}
                  required={true}
                  selectStates={selectStates}
                  setSelectStates={setSelectStates}
                  searchStates={searchStates}
                  setSearchStates={setSearchStates}
                  touchedSelectFields={touchedSelectFields}
                  setTouchedSelectFields={setTouchedSelectFields}
                  toggleSelect={(field) => setSelectStates(prev => ({ ...prev, [field]: !prev[field] }))}
                  filterOptions={(options, searchTerm) => {
                    if (!searchTerm) return options;
                    return options.filter(opt => 
                      opt.nazev?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  }}
                  getOptionLabel={(option) => option?.nazev || ''}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Variabilní symbol <RequiredStar>*</RequiredStar></span>
                  {formData.fa_cislo_vema && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fa_cislo_vema: '' }))}
                      disabled={!isInvoiceEditable}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isInvoiceEditable ? '#9ca3af' : '#d1d5db',
                        cursor: isInvoiceEditable ? 'pointer' : 'not-allowed',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#6b7280'; }}
                      onMouseLeave={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#9ca3af'; }}
                      title="Vymazat variabilní symbol"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </FieldLabel>
                <Input
                  type="text"
                  name="fa_cislo_vema"
                  value={formData.fa_cislo_vema}
                  onChange={handleInputChange}
                  disabled={!isInvoiceEditable || loading}
                  onBlur={(e) => {
                    // Po ztrátě fokusu zvýraznit text tučně (pokud má hodnotu)
                    if (e.target.value) {
                      e.target.style.fontWeight = '600';
                    }
                  }}
                  onFocus={(e) => {
                    // Při získání fokusu vrátit normální tloušťku
                    e.target.style.fontWeight = '400';
                  }}
                  placeholder="12345678"
                  style={{ fontWeight: formData.fa_cislo_vema ? '600' : '400' }}
                  $hasError={!!fieldErrors.fa_cislo_vema}
                />
                {fieldErrors.fa_cislo_vema && (
                  <FieldError>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    {fieldErrors.fa_cislo_vema}
                  </FieldError>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Částka vč. DPH <RequiredStar>*</RequiredStar></span>
                  {formData.fa_castka && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fa_castka: '' }))}
                      disabled={!isInvoiceEditable}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isInvoiceEditable ? '#9ca3af' : '#d1d5db',
                        cursor: isInvoiceEditable ? 'pointer' : 'not-allowed',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#6b7280'; }}
                      onMouseLeave={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#9ca3af'; }}
                      title="Vymazat částku"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </FieldLabel>
                <CurrencyInput
                  fieldName="fa_castka"
                  value={formData.fa_castka}
                  onChange={handleInputChange}
                  onBlur={(e) => {
                    // Validace čísla s desetinným oddělovačem
                    const value = e.target.value;
                    if (value) {
                      const num = parseFloat(value);
                      if (isNaN(num) || num <= 0) {
                        setFieldErrors(prev => ({
                          ...prev,
                          fa_castka: 'Zadejte platnou částku (číslo větší než 0)'
                        }));
                      } else {
                        // Vymazat chybu pokud je číslo v pořádku
                        setFieldErrors(prev => {
                          const { fa_castka, ...rest } = prev;
                          return rest;
                        });
                      }
                    }
                  }}
                  disabled={!isInvoiceEditable || loading}
                  hasError={!!fieldErrors.fa_castka}
                  placeholder="25 000,50"
                />
                {fieldErrors.fa_castka && (
                  <FieldError>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    {fieldErrors.fa_castka}
                  </FieldError>
                )}
              </FieldGroup>
            </FieldRow>

            {/* GRID 1x - ŘÁDEK 5: Střediska (celá šířka) */}
            <FieldRow $columns="1fr">
              <FieldGroup>
                <FieldLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Střediska</span>
                  {formData.fa_strediska_kod && formData.fa_strediska_kod.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fa_strediska_kod: [] }))}
                      disabled={!isInvoiceEditable}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isInvoiceEditable ? '#9ca3af' : '#d1d5db',
                        cursor: isInvoiceEditable ? 'pointer' : 'not-allowed',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#6b7280'; }}
                      onMouseLeave={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#9ca3af'; }}
                      title="Vymazat střediska"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </FieldLabel>
                <MultiSelect
                  values={formData.fa_strediska_kod}
                  onChange={(e) => {
                    // MultiSelect vrací array objektů [{kod_stavu, nazev_stavu}]
                    // Stejně jako CustomSelect v OrderForm25
                    setFormData(prev => ({ 
                      ...prev, 
                      fa_strediska_kod: e.target.value 
                    }));
                  }}
                  options={strediskaOptions}
                  placeholder={strediskaLoading ? "Načítám střediska..." : "Vyberte střediska..."}
                  disabled={!isInvoiceEditable || loading || strediskaLoading}
                />
              </FieldGroup>
            </FieldRow>

            {/* GRID 1x - ŘÁDEK 6: Poznámka (celá šířka) */}
            <FieldRow $columns="1fr">
              <FieldGroup>
                <FieldLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Poznámka</span>
                  {formData.fa_poznamka && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fa_poznamka: '' }))}
                      disabled={!isInvoiceEditable}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isInvoiceEditable ? '#9ca3af' : '#d1d5db',
                        cursor: isInvoiceEditable ? 'pointer' : 'not-allowed',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#6b7280'; }}
                      onMouseLeave={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#9ca3af'; }}
                      title="Vymazat poznámku"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </FieldLabel>
                <Textarea
                  name="fa_poznamka"
                  value={formData.fa_poznamka}
                  onChange={handleInputChange}
                  disabled={!isInvoiceEditable || loading}
                  placeholder="Volitelná poznámka..."
                />
              </FieldGroup>
            </FieldRow>

            {/* 📎 PŘÍLOHY FAKTURY - Nová komponenta podle vzoru OrderForm25 */}
            <InvoiceAttachmentsCompact
              fakturaId={editingInvoiceId || 'temp-new-invoice'}
              objednavkaId={formData.order_id || null}
              fakturaTypyPrilohOptions={typyFakturOptions}
              readOnly={!isInvoiceEditable}
              onISDOCParsed={handleISDOCParsed}
              formData={formData}
              faktura={{
                fa_cislo_vema: formData.fa_cislo_vema,
                fa_datum_vystaveni: formData.fa_datum_vystaveni,
                fa_datum_splatnosti: formData.fa_datum_splatnosti,
                fa_castka: formData.fa_castka,
                fa_strediska_kod: formData.fa_strediska_kod
              }}
              validateInvoiceForAttachments={validateInvoiceForAttachments}
              allUsers={zamestnanci}
              attachments={attachments}
              onAttachmentsChange={handleAttachmentsChange}
              onAttachmentUploaded={handleAttachmentUploaded}
              onAttachmentRemoved={handleAttachmentRemoved}
              onCreateInvoiceInDB={handleCreateInvoiceInDB}
              onOCRDataExtracted={handleOCRDataExtracted}
            />

            {/* ODDĚLUJÍCÍ ČÁRA */}
            <div style={{
              borderTop: '2px solid #e5e7eb',
              margin: '1.5rem 0',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#f9fafb',
                padding: '0 1rem',
                fontSize: '0.875rem',
                color: '#6b7280',
                fontWeight: 600
              }}>
                Doplňující údaje (nepovinné)
              </div>
            </div>

            {/* GRID 2x - ŘÁDEK: Datum předání | Datum vrácení */}
            <FieldRow $columns="1fr 1fr">
              <FieldGroup>
                <FieldLabel>
                  Datum předání
                </FieldLabel>
                <DatePicker
                  value={formData.fa_datum_predani_zam}
                  onChange={(date) => setFormData(prev => ({ ...prev, fa_datum_predani_zam: date }))}
                  onBlur={(date) => setFormData(prev => ({ ...prev, fa_datum_predani_zam: date }))}
                  disabled={!isInvoiceEditable || loading}
                  placeholder="dd.mm.rrrr"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>
                  Datum vrácení
                </FieldLabel>
                <DatePicker
                  value={formData.fa_datum_vraceni_zam}
                  onChange={(date) => setFormData(prev => ({ ...prev, fa_datum_vraceni_zam: date }))}
                  onBlur={(date) => setFormData(prev => ({ ...prev, fa_datum_vraceni_zam: date }))}
                  disabled={!isInvoiceEditable || loading}
                  placeholder="dd.mm.rrrr"
                />
                {formData.fa_datum_predani_zam && formData.fa_datum_vraceni_zam && 
                 new Date(formData.fa_datum_vraceni_zam) < new Date(formData.fa_datum_predani_zam) && (
                  <FieldError>
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    Datum vrácení nemůže být dřívější než datum předání
                  </FieldError>
                )}
              </FieldGroup>
            </FieldRow>

            {/* GRID 1x - ŘÁDEK: Předáno zaměstnanci (celá šířka) */}
            <FieldRow $columns="1fr">
              <FieldGroup>
                <FieldLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Předáno zaměstnanci</span>
                  {formData.fa_predana_zam_id && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        fa_predana_zam_id: null,
                        fa_datum_predani_zam: '',
                        fa_datum_vraceni_zam: ''
                      }))}
                      disabled={!isInvoiceEditable}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isInvoiceEditable ? '#9ca3af' : '#d1d5db',
                        cursor: isInvoiceEditable ? 'pointer' : 'not-allowed',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#6b7280'; }}
                      onMouseLeave={(e) => { if (isInvoiceEditable) e.currentTarget.style.color = '#9ca3af'; }}
                      title="Vymazat zaměstnance (včetně datumů předání/vrácení)"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </FieldLabel>
                <CustomSelect
                  value={formData.fa_predana_zam_id}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    fa_predana_zam_id: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  options={zamestnanci}
                  placeholder={zamestnanciLoading ? "Načítám zaměstnance..." : "-- Nevybráno --"}
                  disabled={!isInvoiceEditable || loading || zamestnanciLoading}
                  field="fa_predana_zam_id"
                  selectStates={selectStates}
                  setSelectStates={setSelectStates}
                  searchStates={searchStates}
                  setSearchStates={setSearchStates}
                  touchedSelectFields={touchedSelectFields}
                  setTouchedSelectFields={setTouchedSelectFields}
                  toggleSelect={(field) => setSelectStates(prev => ({ ...prev, [field]: !prev[field] }))}
                  filterOptions={(options, searchTerm) => {
                    if (!searchTerm) return options;
                    return options.filter(opt => {
                      const fullName = `${opt.prijmeni || ''} ${opt.jmeno || ''} ${opt.titul_za || ''}`.toLowerCase();
                      return fullName.includes(searchTerm.toLowerCase());
                    });
                  }}
                  getOptionLabel={(option) => {
                    if (!option) return '';
                    return `${option.prijmeni || ''} ${option.jmeno || ''} ${option.titul_za ? `, ${option.titul_za}` : ''}`.trim();
                  }}
                  allowEmpty={true}
                />
                {zamestnanciLoading && (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    <FontAwesomeIcon icon={faSpinner} spin /> Načítám zaměstnance...
                  </div>
                )}
              </FieldGroup>
            </FieldRow>
          </FakturaCard>

          {/* VAROVÁNÍ: EDITACE faktury vázané na objednávku - nutnost věcné kontroly (pouze pokud je operace možná) */}
          {/* NEZOBRAZOVAT pro readonly režim (věcná kontrola) - varování je irelevantní */}
          {editingInvoiceId && formData.order_id && orderData && canAddInvoiceToOrder(orderData).allowed && !isReadOnlyMode && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '3px solid #f59e0b',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  background: '#f59e0b',
                  color: 'white',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  flexShrink: 0
                }}>
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#92400e', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    ⚠️ DŮLEŽITÉ: Aktualizace faktury vázané na objednávku
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#78350f', lineHeight: '1.6' }}>
                    Editace faktury vázané na objednávku <strong>{orderData.cislo_objednavky || orderData.evidencni_cislo}</strong> způsobí, 
                    že objednávka bude muset znovu projít <strong>věcnou správností</strong> a kontrolou.
                  </div>
                </div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '6px',
                padding: '0.75rem',
                fontSize: '0.9rem',
                color: '#78350f'
              }}>
                <strong>Co se stane po uložení:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: 0 }}>
                  <li>Objednávka bude vrácena do stavu <strong>"Věcná správnost"</strong></li>
                  <li>Objednatel, garant a schvalovatel obdrží notifikaci</li>
                  <li>Bude nutné provést novou kontrolu a schválení</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* VAROVÁNÍ: Nelze přidat/upravit fakturu k objednávce v nevhodném stavu */}
          {formData.order_id && orderData && !canAddInvoiceToOrder(orderData).allowed && (
            <div style={{
              background: editingInvoiceId ? '#fee2e2' : '#fef3c7',
              border: editingInvoiceId ? '3px solid #dc2626' : '2px solid #f59e0b',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <FontAwesomeIcon 
                icon={faExclamationTriangle} 
                style={{ 
                  color: editingInvoiceId ? '#dc2626' : '#f59e0b', 
                  marginTop: '0.25rem', 
                  fontSize: '1.25rem' 
                }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 600, 
                  color: editingInvoiceId ? '#991b1b' : '#92400e', 
                  marginBottom: '0.25rem' 
                }}>
                  ⚠️ {editingInvoiceId ? 'Nelze aktualizovat fakturu u této objednávky' : 'Nelze přidat fakturu k této objednávce'}
                </div>
                <div style={{ fontSize: '0.9rem', color: editingInvoiceId ? '#991b1b' : '#78350f' }}>
                  {canAddInvoiceToOrder(orderData).reason}
                </div>
              </div>
            </div>
          )}

          {/* VAROVÁNÍ: Změna kritických polí vyžaduje nové schválení */}
          {editingInvoiceId && hasChangedCriticalField && (
            <div style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              border: '2px solid #fb923c',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#ea580c', fontSize: '1.25rem' }} />
              <div style={{ flex: 1, fontSize: '0.9rem', color: '#9a3412' }}>
                <strong>Pozor:</strong> Změnili jste kritické pole faktury (částka, číslo, středisko, typ nebo datum). 
                Po uložení bude nutné <strong>znovu schválit věcnou správnost</strong>.
              </div>
            </div>
          )}

          {/* TLAČÍTKA */}
          {/* Zobrazit tlačítka pokud:
              - Není readonly mode (běžný uživatel s INVOICE_MANAGE)
              - NEBO je readonly mode (INVOICE_MATERIAL_CORRECTNESS) ale změnila se věcná správnost
          */}
          {(!isReadOnlyMode || (isReadOnlyMode && hasChangedVecnaSpravnost)) && (
          <ButtonGroup>
            <Button $variant="secondary" onClick={handleBack} disabled={loading}>
              <FontAwesomeIcon icon={faTimes} />
              Zrušit
            </Button>
            <Button 
              $variant="primary" 
              onClick={handleSubmit} 
              disabled={
                loading || 
                // Běžná disabled logika - nelze přidat fakturu k objednávce v zakázaném stavu
                (formData.order_id && orderData && !canAddInvoiceToOrder(orderData).allowed) ||
                // 🔥 NOVÉ: Readonly uživatelé (INVOICE_MATERIAL_CORRECTNESS) mohou uložit POUZE pokud se změnila věcná správnost
                (isReadOnlyMode && !hasChangedVecnaSpravnost)
              }
              title={
                formData.order_id && orderData && !canAddInvoiceToOrder(orderData).allowed
                  ? canAddInvoiceToOrder(orderData).reason
                  : (isReadOnlyMode && !hasChangedVecnaSpravnost)
                    ? 'Nemáte oprávnění měnit základní data faktury. Můžete pouze potvrdit věcnou správnost.'
                    : ''
              }
            >
              <FontAwesomeIcon icon={loading ? faExclamationTriangle : faSave} />
              {loading ? 'Ukládám...' : (() => {
                // 🔥 Readonly uživatelé vidí jednoduché "Uložit věcnou správnost"
                if (isReadOnlyMode) {
                  return 'Uložit věcnou správnost';
                }
                
                // ✅ OPRAVA: Tlačítko je "Aktualizovat" jen pokud:
                // 1. Máme editingInvoiceId (faktura existuje v DB)
                // 2. A ZÁROVEŇ uživatel potvrdil fakturu (klikl na Zaevidovat)
                // Tím předejdeme situaci, kdy se tlačítko změní na "Aktualizovat"
                // jen kvůli auto-vytvoření faktury při uploadu přílohy
                if (editingInvoiceId && invoiceUserConfirmed) {
                  // Editace faktury - pokud přidáváme entitu (původně neměla), zobrazit "Přiřadit"
                  if ((formData.order_id || formData.smlouva_id) && !hadOriginalEntity) {
                    if (formData.smlouva_id) {
                      return 'Přiřadit fakturu ke smlouvě';
                    }
                    return 'Přiřadit fakturu k objednávce';
                  }
                  return 'Aktualizovat fakturu';
                }
                // Nová faktura
                if (formData.order_id && orderData) {
                  return 'Přiřadit fakturu k objednávce';
                }
                if (formData.smlouva_id && smlouvaData) {
                  return 'Přiřadit fakturu ke smlouvě';
                }
                return 'Zaevidovat fakturu';
              })()}
            </Button>
          </ButtonGroup>
          )}
            </SectionContent>
          </CollapsibleSection>

          {/* 🆕 SEKCE 2: VĚCNÁ SPRÁVNOST K FAKTUŘE - collapsible */}
          {/* Zobrazit JEN pokud editujeme existující fakturu (editingInvoiceId) */}
          {editingInvoiceId && (
          <CollapsibleSection data-section="material-correctness">
            <CollapsibleHeader onClick={() => toggleSection('materialCorrectness')}>
              <HeaderLeft>
                <FontAwesomeIcon icon={faClipboardCheck} />
                Věcná správnost k faktuře
              </HeaderLeft>
              <HeaderRight>
                {/* Badge pro omezené uživatele */}
                {!hasPermission('INVOICE_MANAGE') && hasPermission('INVOICE_MATERIAL_CORRECTNESS') && (
                  <span style={{ 
                    marginRight: '1rem',
                    background: '#fef3c7',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    color: '#92400e',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '2px solid #fbbf24'
                  }}>
                    VÁŠ ÚKOL
                  </span>
                )}
                <CollapseButton $collapsed={!sectionStates.materialCorrectness}>
                  <FontAwesomeIcon icon={faChevronDown} />
                </CollapseButton>
              </HeaderRight>
            </CollapsibleHeader>
            <SectionContent $collapsed={!sectionStates.materialCorrectness}>
              <FakturaCard>
                {/* Informace - Objednávka je dokončena */}
                {isOrderCompleted && (
                  <div style={{
                    background: '#f0f9ff',
                    border: '2px solid #0284c7',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#0284c7', fontSize: '1.5rem' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#075985', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        Objednávka je dokončena
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
                        Věcná kontrola již byla provedena. Pole jsou pouze pro čtení.
                      </div>
                    </div>
                  </div>
                )}

                {/* Porovnání MAX CENA vs FAKTURA */}
                {orderData && orderData.max_cena_s_dph && formData.fa_castka && (
                  (() => {
                    const maxCena = parseFloat(orderData.max_cena_s_dph) || 0;
                    const fakturaCastka = parseFloat(formData.fa_castka) || 0;
                    const rozdil = fakturaCastka - maxCena;
                    const prekroceno = rozdil > 0;

                    return (
                      <div style={{
                        background: prekroceno ? '#fef2f2' : '#f0fdf4',
                        border: `1px solid ${prekroceno ? '#ef4444' : '#22c55e'}`,
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: '#6b7280' }}>Max. cena objednávky s DPH:</span>
                          <span style={{ fontWeight: '600', color: '#374151' }}>
                            {maxCena.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: '#6b7280' }}>Částka faktury s DPH:</span>
                          <span style={{ fontWeight: '600', color: '#374151' }}>
                            {fakturaCastka.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                          </span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          paddingTop: '0.5rem', 
                          borderTop: '1px solid #e5e7eb',
                          fontWeight: '700'
                        }}>
                          <span style={{ color: prekroceno ? '#dc2626' : '#16a34a' }}>
                            {prekroceno ? '⚠️ Překročení:' : '✅ Rozdíl:'}
                          </span>
                          <span style={{ color: prekroceno ? '#dc2626' : '#16a34a' }}>
                            {prekroceno ? '+' : ''}{rozdil.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 🔥 NOVÝ: Porovnání MAX CENA vs CELKOVÝ SOUČET VŠECH FAKTUR */}
                {orderData && orderData.max_cena_s_dph && orderData.faktury && orderData.faktury.length > 1 && (
                  (() => {
                    const maxCena = parseFloat(orderData.max_cena_s_dph) || 0;
                    
                    // Spočítat celkový součet všech faktur (včetně aktuální)
                    const totalFaktur = orderData.faktury.reduce((sum, f) => {
                      if (f.id === editingInvoiceId) {
                        return sum + (parseFloat(formData.fa_castka) || 0);
                      }
                      return sum + (parseFloat(f.fa_castka) || 0);
                    }, 0);
                    
                    const rozdil = totalFaktur - maxCena;
                    const prekroceno = rozdil > 0;

                    return (
                      <div style={{
                        background: prekroceno ? '#fef2f2' : '#f0fdf4',
                        border: `2px solid ${prekroceno ? '#dc2626' : '#22c55e'}`,
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1rem',
                        fontSize: '0.9rem'
                      }}>
                        <div style={{ 
                          fontWeight: '700', 
                          color: prekroceno ? '#991b1b' : '#166534',
                          marginBottom: '0.75rem',
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          {prekroceno ? '🚨' : '✅'} Celkový součet všech faktur objednávky
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: '#6b7280' }}>Max. cena objednávky s DPH:</span>
                          <span style={{ fontWeight: '600', color: '#374151' }}>
                            {maxCena.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: '#6b7280' }}>Součet všech faktur ({orderData.faktury.length}×):</span>
                          <span style={{ fontWeight: '600', color: '#374151' }}>
                            {totalFaktur.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                          </span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          paddingTop: '0.75rem', 
                          borderTop: `2px solid ${prekroceno ? '#fca5a5' : '#86efac'}`,
                          fontWeight: '700',
                          fontSize: '1.05rem'
                        }}>
                          <span style={{ color: prekroceno ? '#dc2626' : '#16a34a' }}>
                            {prekroceno ? '⚠️ PŘEKROČENÍ:' : '✅ Rozdíl:'}
                          </span>
                          <span style={{ color: prekroceno ? '#dc2626' : '#16a34a' }}>
                            {prekroceno ? '+' : ''}{rozdil.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                          </span>
                        </div>
                        {prekroceno && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: '#fee2e2',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: '#991b1b',
                            fontWeight: '600'
                          }}>
                            ⚠️ POZOR: Celková fakturace překračuje schválenou částku! {isInvoiceEditable ? 'Vysvětlete důvod v poznámce níže.' : 'Vysvětlení níže v Poznámce.'}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                <FieldRow $columns="1fr">
                  <FieldGroup>
                    <FieldLabel>Umístění majetku</FieldLabel>
                    <input
                      type="text"
                      value={formData.vecna_spravnost_umisteni_majetku || ''}
                      disabled={!isVecnaSpravnostEditable || loading}
                      onChange={(e) => setFormData(prev => ({ ...prev, vecna_spravnost_umisteni_majetku: e.target.value }))}
                      placeholder="Např. Kladno, budova K2, místnost 203"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        background: (!isVecnaSpravnostEditable || loading) ? '#f9fafb' : 'white',
                        cursor: (!isVecnaSpravnostEditable || loading) ? 'not-allowed' : 'text'
                      }}
                      onFocus={(e) => {
                        if (isVecnaSpravnostEditable && !loading) {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </FieldGroup>
                </FieldRow>

                <FieldRow $columns="1fr">
                  <FieldGroup>
                    <FieldLabel 
                      required={orderData && formData.fa_castka && parseFloat(formData.fa_castka) > parseFloat(orderData.max_cena_s_dph || 0)}
                      style={(orderData && formData.fa_castka && parseFloat(formData.fa_castka) > parseFloat(orderData.max_cena_s_dph || 0)) ? {color: '#dc2626', fontWeight: '700'} : {}}
                    >
                      Poznámka k věcné správnosti
                      {(orderData && formData.fa_castka && parseFloat(formData.fa_castka) > parseFloat(orderData.max_cena_s_dph || 0)) && ' (POVINNÁ - faktura překračuje MAX cenu)'}
                    </FieldLabel>
                    <textarea
                      value={formData.vecna_spravnost_poznamka || ''}
                      disabled={!isVecnaSpravnostEditable || loading}
                      onChange={(e) => setFormData(prev => ({ ...prev, vecna_spravnost_poznamka: e.target.value }))}
                      placeholder="Volitelná poznámka k věcné správnosti..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        border: (() => {
                          // Červený border POUZE když je editovatelná A překročená
                          if (isVecnaSpravnostEditable && orderData && orderData.max_cena_s_dph && orderData.faktury) {
                            const maxCena = parseFloat(orderData.max_cena_s_dph) || 0;
                            const totalFaktur = orderData.faktury.reduce((sum, f) => {
                              if (f.id === editingInvoiceId) {
                                return sum + (parseFloat(formData.fa_castka) || 0);
                              }
                              return sum + (parseFloat(f.fa_castka) || 0);
                            }, 0);
                            if (totalFaktur > maxCena) {
                              return '3px solid #dc2626';
                            }
                          }
                          return '2px solid #e5e7eb';
                        })(),
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        background: (() => {
                          if (!isVecnaSpravnostEditable || loading) return '#f9fafb';
                          // Světle červené pozadí POUZE když je editovatelná A překročená
                          if (orderData && orderData.max_cena_s_dph && orderData.faktury) {
                            const maxCena = parseFloat(orderData.max_cena_s_dph) || 0;
                            const totalFaktur = orderData.faktury.reduce((sum, f) => {
                              if (f.id === editingInvoiceId) {
                                return sum + (parseFloat(formData.fa_castka) || 0);
                              }
                              return sum + (parseFloat(f.fa_castka) || 0);
                            }, 0);
                            if (totalFaktur > maxCena) {
                              return '#fef2f2';
                            }
                          }
                          return 'white';
                        })(),
                        cursor: (!isVecnaSpravnostEditable || loading) ? 'not-allowed' : 'text',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        if (isVecnaSpravnostEditable && !loading) {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </FieldGroup>
                </FieldRow>

                {/* 🔥 LP ČERPÁNÍ EDITOR - pro faktury s LP financováním */}
                {(() => {
                  if (!orderData || !orderData.financovani) {
                    return null;
                  }
                  
                  try {
                    const fin = typeof orderData.financovani === 'string' 
                      ? JSON.parse(orderData.financovani) 
                      : orderData.financovani;
                    
                    if (fin?.typ === 'LP') {
                      return (
                        <LPCerpaniEditor
                          faktura={formData}
                          orderData={orderData}
                          lpCerpani={lpCerpani}
                          availableLPCodes={dictionaries.data?.lpKodyOptions || []}
                          onChange={(newLpCerpani) => setLpCerpani(newLpCerpani)}
                          disabled={!isVecnaSpravnostEditable || loading}
                        />
                      );
                    } else {
                      return null;
                    }
                  } catch (e) {
                    console.error('❌ [LP Editor] Chyba při parsování financování:', e);
                    return null;
                  }
                })()}

                {/* Checkbox potvrzení věcné správnosti */}
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: (!isVecnaSpravnostEditable || loading) ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: (!isVecnaSpravnostEditable || loading) ? '400' : '600',
                    color: (!isVecnaSpravnostEditable || loading) ? '#9ca3af' : '#374151'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.vecna_spravnost_potvrzeno === 1}
                      disabled={!isVecnaSpravnostEditable || loading}
                      onChange={(e) => {
                        const newValue = e.target.checked ? 1 : 0;
                        
                        let updatedFields = { vecna_spravnost_potvrzeno: newValue };
                        if (newValue === 1 && user_id && !formData.potvrdil_vecnou_spravnost_id) {
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          const hours = String(now.getHours()).padStart(2, '0');
                          const minutes = String(now.getMinutes()).padStart(2, '0');
                          const seconds = String(now.getSeconds()).padStart(2, '0');
                          const localTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                          
                          updatedFields.potvrdil_vecnou_spravnost_id = user_id;
                          updatedFields.dt_potvrzeni_vecne_spravnosti = localTimestamp;
                        }
                        
                        setFormData(prev => ({ ...prev, ...updatedFields }));
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: (isOrderCompleted || loading) ? 'not-allowed' : 'pointer',
                        accentColor: (isOrderCompleted || loading) ? '#9ca3af' : '#16a34a'
                      }}
                    />
                    <span style={{ flex: 1 }}>
                      Potvrzuji věcnou správnost faktury
                    </span>
                    {(formData.vecna_spravnost_potvrzeno === 1) && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#16a34a',
                        background: '#dcfce7',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        ✓ ZKONTROLOVÁNO
                      </span>
                    )}
                  </label>
                </div>

                {/* Tlačítka pro věcnou správnost */}
                {editingInvoiceId && (
                  <div style={{
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '2px solid #e5e7eb',
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end'
                  }}>
                    {/* Tlačítko Aktualizovat věcnou správnost - zobrazit JEN když NENÍ potvrzena V DB */}
                    {originalFormData?.vecna_spravnost_potvrzeno !== 1 && (
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: loading ? '#d1d5db' : '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1,
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => !loading && (e.target.style.background = '#15803d')}
                        onMouseLeave={(e) => !loading && (e.target.style.background = '#16a34a')}
                      >
                        <FontAwesomeIcon icon={loading ? faExclamationTriangle : faSave} />
                        {loading ? 'Ukládám...' : 'Aktualizovat věcnou správnost'}
                      </button>
                    )}
                    
                    {/* Tlačítko Opustit formulář */}
                    <button
                      onClick={() => {
                        navigate('/invoices25-list');
                      }}
                      disabled={loading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => !loading && (e.target.style.background = '#4b5563')}
                      onMouseLeave={(e) => !loading && (e.target.style.background = '#6b7280')}
                    >
                      Opustit formulář
                    </button>
                  </div>
                )}
              </FakturaCard>
            </SectionContent>
          </CollapsibleSection>
          )}
          </FormColumnContent>
        </FormColumn>

        {/* PRAVÁ STRANA - NÁHLED OBJEDNÁVKY / SMLOUVY (40%) */}
        <PreviewColumn>
          <PreviewColumnHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {/* První řádek: Náhled + EV.Č. - dynamický podle typu */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: '1rem', 
                paddingBottom: '12px',
                borderBottom: (orderData || smlouvaData) ? (selectedType === 'smlouva' ? '2px solid #10b981' : '2px solid #3498db') : '2px solid #e5e7eb',
                marginBottom: '1rem'
              }}>
                <SectionTitle style={{ margin: 0, border: 'none', paddingBottom: 0, whiteSpace: 'nowrap' }}>
                  {(orderData || smlouvaData) ? (
                    <>
                      <FontAwesomeIcon icon={selectedType === 'smlouva' ? faFileContract : faBuilding} />
                      {selectedType === 'smlouva' ? 'Náhled smlouvy' : 'Náhled objednávky'}
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faBuilding} />
                      Náhled
                    </>
                  )}
                </SectionTitle>
                {orderData && selectedType === 'order' && (
                  <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                    {orderData.cislo_objednavky || `#${orderData.id}`}
                  </span>
                )}
                {smlouvaData && selectedType === 'smlouva' && (
                  <span style={{ fontWeight: 700, color: '#059669', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                    {smlouvaData.cislo_smlouvy || `#${smlouvaData.id}`}
                  </span>
                )}
              </div>

              {/* Druhý řádek: Součty + STAV */}
              {orderData && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* STAV */}
                    <div 
                      onClick={() => {
                        // Nejdřív rozbalit sekci
                        if (orderFormRef.current?.expandSectionByName) {
                          orderFormRef.current.expandSectionByName('schvaleni');
                        }
                        // Pak scrollovat
                        setTimeout(() => {
                          const section = document.querySelector('[data-section="schvaleni"]');
                          if (section) {
                            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.4rem 0.75rem',
                        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                        border: '2px solid #10b981',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#065f46',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ fontSize: '0.6rem', opacity: 0.8, fontWeight: 500 }}>
                          STAV
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {orderData.stav_objednavky || getCurrentWorkflowState(orderData)?.replace(/_/g, ' ') || 'N/A'}
                        </div>
                      </div>
                    </div>
                    {/* MAX CENA S DPH */}
                    <div 
                      onClick={() => {
                        // Nejdřív rozbalit sekci
                        if (orderFormRef.current?.expandSectionByName) {
                          orderFormRef.current.expandSectionByName('schvaleni');
                        }
                        // Pak scrollovat
                        setTimeout(() => {
                          const section = document.querySelector('[data-section="schvaleni"]');
                          if (section) {
                            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.4rem 0.75rem',
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        border: '2px solid #64748b',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(100, 116, 139, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ fontSize: '0.6rem', opacity: 0.8, fontWeight: 500 }}>
                          MAX CENA S DPH
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {parseFloat(orderData.max_cena_s_dph || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                        </div>
                      </div>
                    </div>

                    {/* Součet položek objednávky */}
                    <div 
                      onClick={() => {
                        // Nejdřív rozbalit sekci
                        if (orderFormRef.current?.expandSectionByName) {
                          orderFormRef.current.expandSectionByName('detaily');
                        }
                        // Pak scrollovat
                        setTimeout(() => {
                          const section = document.querySelector('[data-section="detaily"]');
                          if (section) {
                            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.4rem 0.75rem',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        border: '2px solid #fbbf24',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#92400e',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(251, 191, 36, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ fontSize: '0.6rem', opacity: 0.8, fontWeight: 500 }}>
                          POLOŽKY (DPH)
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {parseFloat(orderData.polozky_celkova_cena_s_dph || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                        </div>
                      </div>
                    </div>

                    {/* Součet faktur */}
                    <div 
                      onClick={() => {
                        // Nejdřív rozbalit sekci
                        if (orderFormRef.current?.expandSectionByName) {
                          orderFormRef.current.expandSectionByName('faktury');
                        }
                        // Pak scrollovat
                        setTimeout(() => {
                          const section = document.querySelector('[data-section="faktury"]');
                          if (section) {
                            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.4rem 0.75rem',
                        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                        border: '2px solid #3b82f6',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#1e40af',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ fontSize: '0.6rem', opacity: 0.8, fontWeight: 500 }}>
                          FAKTURY
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {(() => {
                            const total = orderData.faktury?.reduce((sum, faktura) => {
                              const castka = parseFloat(faktura.fa_castka || 0);
                              return sum + castka;
                            }, 0) || 0;
                            return total.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ToggleButton
                    onClick={() => {
                      if (hasAnySectionCollapsed) {
                        orderFormRef.current?.expandAll();
                      } else {
                        orderFormRef.current?.collapseAll();
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={hasAnySectionCollapsed ? faChevronDown : faChevronUp} />
                    {hasAnySectionCollapsed ? 'Rozbalit vše' : 'Sbalit vše'}
                  </ToggleButton>
                </div>
              )}
            </div>
          </PreviewColumnHeader>

          <PreviewColumnContent>
          {orderLoading && (
            <LoadingOverlay>
              <LoadingSpinner />
              <div>Načítám {selectedType === 'smlouva' ? 'smlouvu' : 'objednávku'}...</div>
            </LoadingOverlay>
          )}

          {!orderLoading && !orderData && !smlouvaData && formData.order_id && (
            <ErrorAlert>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              Nepodařilo se načíst objednávku ID {formData.order_id}
            </ErrorAlert>
          )}

          {!orderLoading && !orderData && !smlouvaData && !formData.order_id && (
            <div style={{ color: '#94a3af', textAlign: 'center', padding: '3rem' }}>
              <FontAwesomeIcon icon={selectedType === 'smlouva' ? faFileContract : faBuilding} size="3x" style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {selectedType === 'smlouva' ? 'Žádná smlouva nevybrána' : 'Žádná objednávka nevybrána'}
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                Začněte psát do pole "Vyberte objednávku nebo smlouvu"
              </div>
            </div>
          )}

          {/* NÁHLED OBJEDNÁVKY */}
          {!orderLoading && orderData && selectedType === 'order' && (
            <OrderFormReadOnly 
              ref={orderFormRef} 
              orderData={orderData}
              onCollapseChange={setHasAnySectionCollapsed}
              onEditInvoice={isReadOnlyMode ? null : handleEditInvoice}
              onUnlinkInvoice={isReadOnlyMode ? null : handleUnlinkInvoice}
              canEditInvoice={!isReadOnlyMode && canAddInvoiceToOrder(orderData).allowed}
              editingInvoiceId={editingInvoiceId} // ✅ Předat ID editované faktury pro zvýraznění
              isReadOnlyMode={isReadOnlyMode} // ✅ Předat readonly režim pro změnu textu
              token={token}
              username={username}
            />
          )}

          {/* NÁHLED SMLOUVY */}
          {!orderLoading && smlouvaData && selectedType === 'smlouva' && (
            <SmlouvaPreview smlouvaData={smlouvaData} />
          )}

          {false && orderData && (
            <OrderPreviewCard>
              <OrderHeaderRow>
                <OrderNumber>
                  {orderData.evidencni_cislo || `Obj. #${orderData.id}`}
                </OrderNumber>
                <OrderBadge $color={orderData.stav_workflow_kod === 'ODESLANA' ? '#10b981' : '#3b82f6'}>
                  {orderData.stav_workflow_nazev || 'Nezn. stav'}
                </OrderBadge>
              </OrderHeaderRow>

              <OrderDetailRow>
                <OrderDetailLabel>Předmět:</OrderDetailLabel>
                <OrderDetailValue style={{ fontWeight: 500 }}>
                  {orderData.predmet || 'N/A'}
                </OrderDetailValue>
              </OrderDetailRow>

              <OrderDetailRow>
                <OrderDetailLabel>
                  <FontAwesomeIcon icon={faMoneyBillWave} /> Max. cena s DPH:
                </OrderDetailLabel>
                <OrderDetailValue style={{ fontWeight: 600, color: '#1e40af' }}>
                  {orderData.max_cena_s_dph 
                    ? `${Number(orderData.max_cena_s_dph).toLocaleString('cs-CZ')} Kč` 
                    : 'N/A'}
                </OrderDetailValue>
              </OrderDetailRow>

              <OrderDetailRow>
                <OrderDetailLabel>
                  <FontAwesomeIcon icon={faBuilding} /> Příkazce:
                </OrderDetailLabel>
                <OrderDetailValue>
                  {orderData._enriched?.prikazce?.display_name || orderData.prikazce_id || 'N/A'}
                </OrderDetailValue>
              </OrderDetailRow>

              {orderData._enriched?.dodavatel?.ico && (
                <OrderDetailRow>
                  <OrderDetailLabel>IČO dodavatele:</OrderDetailLabel>
                  <OrderDetailValue>
                    {orderData._enriched.dodavatel.ico}
                  </OrderDetailValue>
                </OrderDetailRow>
              )}

              {orderData.dodavatel_nazev && (
                <OrderDetailRow>
                  <OrderDetailLabel>Dodavatel:</OrderDetailLabel>
                  <OrderDetailValue>
                    {orderData.dodavatel_nazev}
                  </OrderDetailValue>
                </OrderDetailRow>
              )}

              <OrderDetailRow>
                <OrderDetailLabel>
                  <FontAwesomeIcon icon={faCalendar} /> Datum vytvoření:
                </OrderDetailLabel>
                <OrderDetailValue>
                  {(() => {
                    const datum = orderData.dt_objednavky || orderData.datum_objednavky || orderData.created_at || orderData.dt_vytvoreni || orderData.datum_vytvoreni;
                    return datum ? formatDateOnly(datum) : 'N/A';
                  })()}
                </OrderDetailValue>
              </OrderDetailRow>

              {orderData.garant_cele_jmeno && (
                <OrderDetailRow>
                  <OrderDetailLabel>Garant:</OrderDetailLabel>
                  <OrderDetailValue>
                    {orderData.garant_cele_jmeno}
                  </OrderDetailValue>
                </OrderDetailRow>
              )}

              {orderData.cislo_smlouvy && (
                <OrderDetailRow>
                  <OrderDetailLabel>Číslo smlouvy:</OrderDetailLabel>
                  <OrderDetailValue>
                    {orderData.cislo_smlouvy}
                  </OrderDetailValue>
                </OrderDetailRow>
              )}
            </OrderPreviewCard>
          )}
          </PreviewColumnContent>
        </PreviewColumn>
      </ContentLayout>
    </>
  );

  // Render: normální režim vs fullscreen režim (portal)
  return (
    <>
      {isFullscreen ? (
        createPortal(
          <FullscreenOverlay>
            {PageContent}
          </FullscreenOverlay>,
          document.body
        )
      ) : (
        <PageContainer>
          {PageContent}
        </PageContainer>
      )}

      {/* 🔒 Modal pro zamčenou objednávku - informační dialog */}
      {lockedOrderInfo && createPortal(
        <ConfirmDialog
          isOpen={showLockedOrderDialog}
          onClose={() => {
            setShowLockedOrderDialog(false);
            setLockedOrderInfo(null);
          }}
          onConfirm={() => {
            setShowLockedOrderDialog(false);
            setLockedOrderInfo(null);
          }}
          title="Objednávka není dostupná"
          icon={faLock}
          variant="warning"
          confirmText="Zavřít"
          showCancel={false}
        >
          <InfoText>
            Objednávka je aktuálně editována uživatelem:
          </InfoText>
          <UserInfo>
            <strong>{lockedOrderInfo.lockedByUserName}</strong>
          </UserInfo>

          {/* Kontaktní údaje */}
          {(lockedOrderInfo.lockedByUserEmail || lockedOrderInfo.lockedByUserTelefon) && (
            <ContactInfo>
              {lockedOrderInfo.lockedByUserEmail && (
                <ContactItem>
                  <FontAwesomeIcon icon={faEnvelope} />
                  <ContactLabel>Email:</ContactLabel>
                  <a href={`mailto:${lockedOrderInfo.lockedByUserEmail}`}>
                    {lockedOrderInfo.lockedByUserEmail}
                  </a>
                </ContactItem>
              )}
              {lockedOrderInfo.lockedByUserTelefon && (
                <ContactItem>
                  <FontAwesomeIcon icon={faPhone} />
                  <ContactLabel>Telefon:</ContactLabel>
                  <a href={`tel:${lockedOrderInfo.lockedByUserTelefon}`}>
                    {lockedOrderInfo.lockedByUserTelefon}
                  </a>
                </ContactItem>
              )}
            </ContactInfo>
          )}

          {/* Čas zamčení */}
          {lockedOrderInfo.lockAgeMinutes !== null && lockedOrderInfo.lockAgeMinutes !== undefined && (
            <LockTimeInfo>
              <FontAwesomeIcon icon={faClock} />
              Zamčeno před {lockedOrderInfo.lockAgeMinutes} {lockedOrderInfo.lockAgeMinutes === 1 ? 'minutou' : lockedOrderInfo.lockAgeMinutes < 5 ? 'minutami' : 'minutami'}
            </LockTimeInfo>
          )}

          <InfoText>
            Objednávku nelze načíst, dokud ji má otevřenou jiný uživatel.
            Prosím, kontaktujte uživatele výše a požádejte ho o uložení a zavření objednávky.
          </InfoText>
        </ConfirmDialog>,
        document.body
      )}

      {/* 🔔 Custom Confirm Dialog - VŽDY v portálu nad vším */}
      {confirmDialog.isOpen && createPortal(
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.onCancel ? "Ano, pokračovat" : "OK"}
          cancelText="Zrušit"
          showCancel={!!confirmDialog.onCancel}
          variant="warning"
          icon={faExclamationTriangle}
          onConfirm={() => {
            if (confirmDialog.onConfirm) {
              confirmDialog.onConfirm();
            }
          }}
          onClose={confirmDialog.onCancel ? () => {
            if (confirmDialog.onCancel) {
              confirmDialog.onCancel();
            }
          } : () => {}}
        />,
        document.body
      )}

      {/* 📖 Spisovka Inbox Panel - pro ADMIN nebo FILE_REGISTRY_MANAGE */}
      {(hasPermission('ADMIN') || hasPermission('FILE_REGISTRY_MANAGE')) && spisovkaInboxOpen && (
        <SpisovkaInboxPanel
          panelState={spisovkaInboxState}
          setPanelState={setSpisovkaInboxState}
          beginDrag={handleSpisovkaInboxDrag}
          onClose={() => setSpisovkaInboxOpen(false)}
          onOCRDataExtracted={handleOCRDataExtracted}
          token={token}
          username={username}
          showToast={showToast}
          onRefreshRequested={handleSpisovkaRefresh}
          refreshCounter={spisovkaRefreshCounter}
        />
      )}

      {/* 🎯 Progress Modal - zobrazení průběhu ukládání faktury */}
      {progressModal.show && createPortal(
        <ProgressOverlay>
          <ProgressModal>
            <ProgressHeader>
              <ProgressIconWrapper status={progressModal.status}>
                {progressModal.status === 'loading' && <FontAwesomeIcon icon={faSpinner} spin />}
                {progressModal.status === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
                {progressModal.status === 'error' && <FontAwesomeIcon icon={faTimesCircle} />}
              </ProgressIconWrapper>
              <ProgressTitle>{progressModal.title}</ProgressTitle>
            </ProgressHeader>

            <ProgressMessage>{progressModal.message}</ProgressMessage>

            {progressModal.status === 'loading' && (
              <ProgressBarWrapper>
                <ProgressBarFill progress={progressModal.progress} />
              </ProgressBarWrapper>
            )}

            <ProgressActions>
              {progressModal.status === 'success' && (
                <ProgressButton 
                  variant="primary" 
                  onClick={async () => {
                    // Pokud je to úspěch věcné správnosti - vrátit na seznam nebo zůstat
                    if (progressModal.resetData?.isVecnaSpravnost) {
                      setProgressModal({ show: false, status: 'loading', progress: 0, title: '', message: '', resetData: null });
                      
                      if (progressModal.resetData?.isReadOnlyMode) {
                        // Omezení uživatelé - návrat na seznam
                        navigate('/invoices25-list');
                      }
                      // Běžní uživatelé zůstavá na stránce
                      return;
                    }
                    
                    // 🎯 KROK 1: RESET příloh a editingInvoiceId NEJDŘÍV (aby useEffect nereloadoval)
                    setAttachments([]);
                    setEditingInvoiceId(null);
                    setHadOriginalEntity(false);
                    
                    // 🧹 Vyčistit location.state (aby se effect neloadoval znovu)
                    if (location.state?.editInvoiceId) {
                      navigate(location.pathname, { replace: true, state: {} });
                    }
                    
                    // 💾 Vyčistit localStorage HNED
                    try {
                      localStorage.removeItem(`invoiceForm_${user_id}`);
                      localStorage.removeItem(`invoiceAttach_${user_id}`);
                      localStorage.removeItem(`invoiceEdit_${user_id}`);
                      localStorage.removeItem(`invoiceOrigEntity_${user_id}`);
                      localStorage.removeItem('spisovka_active_dokument');
                    } catch (err) {
                      console.warn('Chyba při mazání localStorage:', err);
                    }
                    
                    // 🎯 KROK 2: RESET FORMULÁŘE
                    const resetData = progressModal.resetData || {};
                    const { wasEditing, wasReadOnlyMode, currentOrderId, currentSmlouvaId } = resetData;
                    
                    // ✅ VŽDY smazat všechno včetně objednávky/smlouvy
                    const shouldResetEntity = true;
                    
                    // Reset formData
                    setFormData({
                      order_id: shouldResetEntity ? '' : currentOrderId,
                      smlouva_id: shouldResetEntity ? null : currentSmlouvaId,
                      fa_cislo_vema: '',
                      fa_typ: 'BEZNA',
                      fa_datum_doruceni: formatDateForPicker(new Date()),
                      fa_datum_vystaveni: '',
                      fa_datum_splatnosti: '',
                      fa_castka: '',
                      fa_poznamka: '',
                      fa_strediska_kod: [],
                      file: null,
                      fa_predana_zam_id: null,
                      fa_datum_predani_zam: '',
                      fa_datum_vraceni_zam: '',
                      vecna_spravnost_umisteni_majetku: '',
                      vecna_spravnost_poznamka: '',
                      vecna_spravnost_potvrzeno: 0,
                      potvrdil_vecnou_spravnost_id: null,
                      dt_potvrzeni_vecne_spravnosti: ''
                    });
                    
                    // Reset preview entity a autocomplete
                    setOrderData(null);
                    setSmlouvaData(null);
                    setSearchTerm('');
                    setShowSuggestions(false);
                    setIsEntityUnlocked(false);
                    setHadOriginalEntity(false);

                    // Reset pole errors a tracking změn
                    setFieldErrors({});
                    setOriginalFormData(null);
                    setHasChangedCriticalField(false);
                    
                    // Reset LP čerpání
                    setLpCerpani([]);
                    setLpCerpaniLoaded(false);
                    
                    // 🆕 Reset editingInvoiceId a invoiceUserConfirmed
                    setEditingInvoiceId(null);
                    setInvoiceUserConfirmed(false);
                    setIsOriginalEdit(false);
                    
                    // 🚫 Reset flag pro localStorage (umožní načítání při F5)
                    setJustCompletedOperation(false);
                    
                    // Zavřít progress dialog
                    setProgressModal({ show: false, status: 'loading', progress: 0, title: '', message: '', resetData: null });
                    
                    // 🔄 PŘESMĚROVÁNÍ: 
                    // - Pokud byl READONLY mode (věcná správnost) → přejít na seznam faktur
                    // - Pokud byla EDITACE FAKTURY → přejít na seznam faktur 
                    // - Pokud byla NOVÁ EVIDEJCE faktury → zůstat na formuláři pro další fakturu
                    if (wasReadOnlyMode || wasEditing) {
                      navigate('/invoices25-list');
                    }
                    // Jinak zůstat na stránce s prázdným formulářem pro další fakturu
                  }}
                >
                  Pokračovat
                </ProgressButton>
              )}
              {progressModal.status === 'error' && (
                <ProgressButton 
                  variant="primary" 
                  onClick={() => {
                    setProgressModal({ show: false, status: 'loading', progress: 0, title: '', message: '' });
                    // 🚫 Reset flag aby příští načtení mohlo loadovat z LS
                    setJustCompletedOperation(false);
                  }}
                >
                  Zavřít
                </ProgressButton>
              )}
            </ProgressActions>
          </ProgressModal>
        </ProgressOverlay>,
        document.body
      )}
    </>
  );
}
