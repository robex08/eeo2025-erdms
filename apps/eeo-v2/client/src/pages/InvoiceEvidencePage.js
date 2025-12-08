import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  faUnlock
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { ProgressContext } from '../context/ProgressContext';
import { createInvoiceWithAttachmentV2, createInvoiceV2, getInvoiceById25, updateInvoiceV2 } from '../services/api25invoices';
import { getOrderV2, updateOrderV2 } from '../services/apiOrderV2';
import { getSmlouvaDetail } from '../services/apiSmlouvy';
import { universalSearch } from '../services/apiUniversalSearch';
import { fetchAllUsers } from '../services/api2auth';
import { getStrediska25 } from '../services/api25orders';
import { formatDateOnly } from '../utils/format';
import OrderFormReadOnly from '../components/OrderFormReadOnly';
import SmlouvaPreview from '../components/SmlouvaPreview';
import DatePicker from '../components/DatePicker';
import { CustomSelect } from '../components/CustomSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import { Search } from 'lucide-react';
import draftManager from '../services/DraftManager';
import { notificationService, NOTIFICATION_TYPES } from '../services/notificationsUnified';

// Helper: formát data pro input type="date" (YYYY-MM-DD)
const formatDateForPicker = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toISOString().split('T')[0];
};

// ===================================================================
// STYLED COMPONENTS - Recyklované z OrderForm25 + nové pro layout
// ===================================================================

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
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px solid #3498db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
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

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
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

const FileInputWrapper = styled.div`
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  input[type="file"] {
    display: none;
  }
`;

const FileInputLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #64748b;

  &:hover {
    color: #3b82f6;
  }
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
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;

    &:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
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

const SelectedFileName = styled.div`
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    color: #6b7280;
    background: #f3f4f6;
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
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
    // NEUVEREJNIT, UVEREJNENA - před první fakturou (po potvrzení dodavatele)
    // FAKTURACE - první faktura byla přidána
    // VECNA_SPRAVNOST - čeká na kontrolu věcné správnosti
    // ZKONTROLOVANA - věcná správnost byla zkontrolována
    const allowedStates = ['NEUVEREJNIT', 'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA'];
    
    if (!allowedStates.includes(currentState)) {
      return { 
        allowed: false, 
        reason: `Fakturaci lze přidat pouze k objednávkám ve stavu: NEUVEŘEJNIT, UVEŘEJNĚNA, FAKTURACE, VĚCNÁ SPRÁVNOST nebo ZKONTROLOVANÁ. Aktuální stav: ${currentState}`
      };
    }

    return { allowed: true, reason: null };
  }, []);

  // State
  const [isFullscreen, setIsFullscreen] = useState(true);
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
  
  // State pro sledování editace faktury
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  // State pro unlock entity (změna objednávky/smlouvy u existující FA)
  const [isEntityUnlocked, setIsEntityUnlocked] = useState(false);



  // Form data
  const [formData, setFormData] = useState({
    order_id: orderId || '',
    smlouva_id: null, // ID smlouvy (alternativa k order_id)
    fa_cislo_vema: '',
    fa_typ: 'BEZNA', // Výchozí typ: Běžná faktura
    fa_datum_doruceni: formatDateForPicker(new Date()),
    fa_datum_vystaveni: formatDateForPicker(new Date()),
    fa_datum_splatnosti: '',
    fa_castka: '',
    fa_poznamka: '',
    fa_strediska_kod: [], // Střediska - array kódů
    // Příloha
    file: null,
    // Nové položky (nepovinné, pod čárou)
    fa_predana_zam_id: null,
    fa_datum_predani_zam: '',
    fa_datum_vraceni_zam: ''
  });

  // CustomSelect states
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState(new Set());

  // Střediska options
  const [strediskaOptions, setStrediskaOptions] = useState([]);
  const [strediskaLoading, setStrediskaLoading] = useState(false);
  
  // Zaměstnanci options (pro předání FA)
  const [zamestnanci, setZamestnanci] = useState([]);
  const [zamestnanciLoading, setZamestnanciLoading] = useState(false);
  
  // Tracking změn kritických polí
  const [originalFormData, setOriginalFormData] = useState(null);
  const [hasChangedCriticalField, setHasChangedCriticalField] = useState(false);

  // Načtení středisek a zaměstnanců při mount (pouze pokud existuje token)
  useEffect(() => {
    const loadStrediska = async () => {
      if (!token || !username) {
        console.log('⏳ Token nebo username ještě není k dispozici, čekám...');
        return;
      }
      
      setStrediskaLoading(true);
      try {
        const data = await getStrediska25({ token, username });
        if (data && Array.isArray(data)) {
          // API vrací přímo objekty s value a label, není potřeba nic mapovat
          setStrediskaOptions(data);
          console.log('✅ Střediska načtena:', data.length);
        }
      } catch (err) {
        console.error('Chyba při načítání středisek:', err);
      } finally {
        setStrediskaLoading(false);
      }
    };

    const loadZamestnanci = async () => {
      if (!token || !username) return;
      
      setZamestnanciLoading(true);
      try {
        // Načtení všech uživatelů přes fetchAllUsers API (stejně jako OrderList25)
        const usersData = await fetchAllUsers({ token, username });
        
        if (usersData && Array.isArray(usersData)) {
          // Filtrovat pouze aktivní uživatele a seřadit podle příjmení
          const aktivni = usersData
            .filter(u => u.aktivni === 1)
            .sort((a, b) => {
              const aName = `${a.prijmeni || ''} ${a.jmeno || ''}`.trim();
              const bName = `${b.prijmeni || ''} ${b.jmeno || ''}`.trim();
              return aName.localeCompare(bName, 'cs');
            });
          setZamestnanci(aktivni);
          console.log('✅ Zaměstnanci načteni:', aktivni.length);
        }
      } catch (err) {
        console.error('Chyba při načítání zaměstnanců:', err);
      } finally {
        setZamestnanciLoading(false);
      }
    };

    // Spustit pouze pokud máme token a username
    if (token && username) {
      loadStrediska();
      loadZamestnanci();
    }
  }, [token, username]);

  // Detekce změny kritických polí faktury
  // Varování má smysl POUZE pokud:
  // 1. FA MĚLA přiřazenou OBJ nebo SML (ne NULL)
  // 2. FA NEBYLA předána zaměstnanci
  // 3. Věcná kontrola JIŽ BYLA PROVEDENA (vecna_spravnost_potvrzeno = 1)
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

  // Načtení faktury při editaci (z location.state)
  useEffect(() => {
    const loadInvoiceForEdit = async () => {
      const editInvoiceId = location.state?.editInvoiceId;
      const orderIdForLoad = location.state?.orderIdForLoad;
      
      if (!editInvoiceId || !token || !username) {
        return;
      }
      
      // Počkat na načtení středisek (potřebujeme je pro mapování)
      if (strediskaOptions.length === 0) {
        return;
      }
      
      // Pokud už je tato faktura načtená (máme data v formData), skip
      // Kontrola přes fa_cislo_vema je spolehlivější než editingInvoiceId
      if (editingInvoiceId === editInvoiceId && formData.fa_cislo_vema) {
        console.log('ℹ️ Faktura už je načtená (fa_cislo_vema:', formData.fa_cislo_vema, ')');
        return;
      }
      
      console.log('📝 Načítám fakturu pro editaci, ID:', editInvoiceId);
      setLoading(true);
      setEditingInvoiceId(editInvoiceId);
      
      try {
        // Načíst data faktury
        const invoiceData = await getInvoiceById25({ token, username, id: editInvoiceId });
        
        console.log('✅ Faktura načtena pro editaci:', invoiceData);
        
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
            // Věcná správnost (pro detekci změn kritických polí)
            vecna_spravnost_potvrzeno: invoiceData.vecna_spravnost_potvrzeno || 0
          };
          
          setFormData(loadedFormData);
          // Uložit originální data pro detekci změn
          setOriginalFormData(loadedFormData);
          
          // Pokud je známa objednávka, načíst ji a nastavit searchTerm
          if (orderIdForLoad || invoiceData.objednavka_id) {
            const orderIdToLoad = orderIdForLoad || invoiceData.objednavka_id;
            await loadOrderData(orderIdToLoad);
            setSelectedType('order');
            
            // Nastavit searchTerm pokud máme číslo objednávky
            if (invoiceData.cislo_objednavky) {
              setSearchTerm(invoiceData.cislo_objednavky);
            }
          }
          // Pokud je známa smlouva, načíst ji
          else if (invoiceData.smlouva_id) {
            await loadSmlouvaData(invoiceData.smlouva_id);
            setSelectedType('smlouva');
          }
          
          showToast?.(`Faktura ${invoiceData.fa_cislo_vema} načtena pro editaci`, { type: 'info' });
        }
      } catch (err) {
        console.error('❌ Chyba při načítání faktury:', err);
        showToast?.(err.message || 'Chyba při načítání faktury', { type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    // Spustit pouze pokud existuje editInvoiceId v location.state
    if (location.state?.editInvoiceId) {
      loadInvoiceForEdit();
    }
  }, [location.state?.editInvoiceId, token, username, strediskaOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Načtení objednávky při mount nebo změně orderId
  const loadOrderData = useCallback(async (orderIdToLoad) => {
    if (!orderIdToLoad || !token || !username) {
      return;
    }

    setOrderLoading(true);
    setError(null);

    try {
      // ✅ Načti plná data objednávky s enriched daty (faktury, položky, atd.)
      const orderData = await getOrderV2(orderIdToLoad, token, username, true);

      if (orderData && orderData.id) {
        setOrderData(orderData);
        console.log('✅ Objednávka načtena:', orderData);
        console.log('🌐 RAW API RESPONSE - COMPLETE orderData:', JSON.stringify(orderData, null, 2));
        console.log('📦 RAW orderData.polozky_objednavky:', JSON.stringify(orderData.polozky_objednavky, null, 2));
        console.log('📦 RAW orderData.faktury:', JSON.stringify(orderData.faktury, null, 2));
        console.log('💰 orderData.max_cena_s_dph:', orderData.max_cena_s_dph);
        console.log('💰 Počet položek:', orderData.polozky_objednavky?.length || 0);
        console.log('💰 Počet faktur:', orderData.faktury?.length || 0);
        // Aktualizuj searchTerm aby zobrazoval pouze ev. číslo
        const evCislo = orderData.cislo_objednavky || orderData.evidencni_cislo || `#${orderData.id}`;
        setSearchTerm(evCislo);
      } else {
        setError('Nepodařilo se načíst data objednávky');
      }
    } catch (err) {
      setError(err.message || 'Chyba při načítání objednávky');
      showToast && showToast(err.message || 'Chyba při načítání objednávky', 'error');
    } finally {
      setOrderLoading(false);
    }
  }, [token, username, showToast]);

  const loadSmlouvaData = useCallback(async (smlouvaId) => {
    if (!smlouvaId || !token || !username) {
      return;
    }

    setOrderLoading(true); // Použijeme stejný loading state
    setError(null);

    try {
      console.log('🔍 Načítám smlouvu ID:', smlouvaId);
      const smlouvaData = await getSmlouvaDetail({ token, username, id: smlouvaId });
      
      console.log('📦 RAW API RESPONSE - smlouvaData:', JSON.stringify(smlouvaData, null, 2));

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
        
        setSmlouvaData(normalizedData);
        setSelectedType('smlouva');
        console.log('✅ Smlouva načtena (normalized):', normalizedData);
        
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
        
        const validStates = ['ODESLANA', 'ODESLANO', 'POTVRZENA', 'NEUVEREJNIT', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'];
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
  }, [searchTerm, showSuggestions, searchEntities]);

  // Effect: Načíst objednávku když je orderId v URL
  useEffect(() => {
    if (orderId) {
      setFormData(prev => ({ ...prev, order_id: orderId }));
      // loadOrderData automaticky nastaví searchTerm po načtení
      loadOrderData(orderId);
    }
  }, [orderId, loadOrderData]);

  // Effect: Reload objednávky když user změní order_id v inputu
  useEffect(() => {
    if (formData.order_id && formData.order_id !== orderId) {
      loadOrderData(formData.order_id);
    }
  }, [formData.order_id, orderId, loadOrderData]);

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
      
      if (orderCheck?.lock_info?.locked === true) {
        const lockInfo = orderCheck.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

        setOrderLoading(false);
        
        // Zobraz dialog
        setConfirmDialog({
          isOpen: true,
          title: '🔒 Objednávka je zamčená',
          message: `Objednávka ${evCislo} je právě otevřená na editaci uživatelem ${lockedByUserName}.\n\n⚠️ NEJDŘÍVE MUSÍ ${lockedByUserName.toUpperCase()} ZAVŘÍT OBJEDNÁVKU!\n\nObjednávka je zamčená a nelze ji zpracovávat, dokud ji jiný uživatel uzamkl pro editaci.`,
          onConfirm: () => {
            setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
          },
          onCancel: null
        });
        return;
      }
    } catch (err) {
      console.warn('⚠️ Nepodařilo se zkontrolovat lock status:', err);
    } finally {
      setOrderLoading(false);
    }

    // ✅ VŠE OK - pokračuj s načtením
    proceedWithOrderLoad(order, evCislo);
  };

  // Helper funkce pro načtení objednávky
  const proceedWithOrderLoad = (order, evCislo) => {
    setFormData(prev => ({
      ...prev,
      order_id: order.id,
      smlouva_id: null // Vyčistit smlouvu pokud byla předtím
    }));
    setSearchTerm(evCislo);
    setShowSuggestions(false);
    setSelectedType('order');
    setSmlouvaData(null); // Vyčistit data smlouvy
    
    // 🎯 Nastavit pro OrderForm25 - načte z localStorage
    localStorage.setItem('activeOrderEditId', order.id);
    
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

    // Scroll na začátek formuláře
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showToast && showToast('📝 Faktura načtena pro úpravu', 'info');
  }, [showToast, orderData, canAddInvoiceToOrder]);

  // Handler: změna souboru
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      file: file || null
    }));
  };

  // Handler: drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFormData(prev => ({
        ...prev,
        file: file
      }));
    }
  };

  // 🔔 Funkce pro odeslání notifikací při změně stavu objednávky na věcnou kontrolu
  const sendInvoiceNotifications = async (orderId, orderData) => {
    try {
      // Získej příjemce notifikací z dat objednávky
      const recipientUserIds = new Set();

      // 1. Objednatel (uzivatel_id nebo objednatel_id)
      if (orderData.uzivatel_id) {
        recipientUserIds.add(parseInt(orderData.uzivatel_id, 10));
      } else if (orderData.objednatel_id) {
        recipientUserIds.add(parseInt(orderData.objednatel_id, 10));
      }

      // 2. Garant
      if (orderData.garant_uzivatel_id) {
        recipientUserIds.add(parseInt(orderData.garant_uzivatel_id, 10));
      }

      // 3. Schvalovatel (příkazce)
      if (orderData.prikazce_id) {
        recipientUserIds.add(parseInt(orderData.prikazce_id, 10));
      }

      // Filtr: Odstranit nevalidní ID
      const validRecipients = Array.from(recipientUserIds).filter(id => {
        return id && !isNaN(id) && id > 0;
      });

      // Pokud nejsou žádní příjemci, skonči
      if (validRecipients.length === 0) {
        console.warn('⚠️ Žádní příjemci notifikací pro objednávku:', orderId);
        return;
      }

      // Odeslat notifikaci o změně stavu na věcnou kontrolu
      await notificationService.create({
        token,
        username,
        type: NOTIFICATION_TYPES.ORDER_STATUS_KONTROLA_CEKA, // 'order_status_kontrola_ceka'
        order_id: orderId,
        action_user_id: user_id,
        recipients: validRecipients
      });

      console.log('✅ Notifikace o věcné kontrole odeslány:', {
        orderId,
        recipients: validRecipients,
        type: NOTIFICATION_TYPES.ORDER_STATUS_KONTROLA_CEKA
      });
    } catch (error) {
      console.error('❌ Chyba při odesílání notifikací:', error);
      // Neblokujeme workflow kvůli chybě notifikace
    }
  };

  // Handler: submit formuláře
  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});

    // ✅ Kontrola stavu objednávky (pouze pokud není editace existující faktury)
    if (formData.order_id && orderData && !editingInvoiceId) {
      const invoiceCheck = canAddInvoiceToOrder(orderData);
      if (!invoiceCheck.allowed) {
        setError(invoiceCheck.reason);
        showToast && showToast(invoiceCheck.reason, 'error');
        return;
      }
    }

    // ✅ Validace povinných polí
    const errors = {};
    
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

    // Pokud jsou chyby, zobraz je a zastav submit
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Opravte prosím chyby ve formuláři před odesláním');
      return;
    }

    setLoading(true);
    setProgress?.(50);

    try {
      // Věcná správnost podle dokumentace
      const getMysqlDateTime = () => {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
      };

      console.log('🔍 FORM DATA před API:', {
        fa_typ: formData.fa_typ,
        fa_typ_type: typeof formData.fa_typ
      });

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
        // Nové položky (nepovinné) - prázdný string místo null aby PHP !empty() vrátil NULL do DB
        fa_predana_zam_id: formData.fa_predana_zam_id || '',
        fa_datum_predani_zam: formData.fa_datum_predani_zam || '',
        fa_datum_vraceni_zam: formData.fa_datum_vraceni_zam || ''
      };

      console.log('🔍 API PARAMS:', {
        fa_typ: apiParams.fa_typ,
        fa_typ_type: typeof apiParams.fa_typ
      });

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
          fa_predana_zam_id: formData.fa_predana_zam_id || '',
          fa_datum_predani_zam: formData.fa_datum_predani_zam || '',
          fa_datum_vraceni_zam: formData.fa_datum_vraceni_zam || '',
          // fa_strediska_kod je již array stringů ["101_RLP_KLADNO"], jen JSON.stringify
          fa_strediska_kod: JSON.stringify(formData.fa_strediska_kod || [])
        };

        result = await updateInvoiceV2({
          token,
          username,
          invoice_id: editingInvoiceId,
          updateData
        });
        
        setProgress?.(100);
        showToast && showToast('✅ Faktura byla úspěšně aktualizována', 'success');
      } else {
        // NOVÁ FAKTURA - CREATE
        if (formData.file) {
          // S přílohou
          result = await createInvoiceWithAttachmentV2({
            ...apiParams,
            file: formData.file
          });
        } else {
          // Bez přílohy
          result = await createInvoiceV2(apiParams);
        }

        setProgress?.(100);
        showToast && showToast('✅ Faktura byla úspěšně zaevidována', 'success');
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

          // Logika pro změnu workflow stavu podle aktuálního stavu:
          // NOVÁ FAKTURA:
          // 1. NEUVEREJNIT nebo UVEREJNENA → přidat FAKTURACE → přidat VECNA_SPRAVNOST
          // 2. FAKTURACE → přidat VECNA_SPRAVNOST
          // 3. ZKONTROLOVANA → vrátit na VECNA_SPRAVNOST (faktury byly upraveny)
          // 4. VECNA_SPRAVNOST → nechat beze změny
          // 
          // EDITACE FAKTURY:
          // - ZKONTROLOVANA nebo DOKONCENA → vrátit na VECNA_SPRAVNOST (musí projít novou kontrolou)
          // - VECNA_SPRAVNOST → nechat (už čeká na kontrolu)
          
          let needsUpdate = false;
          
          if (editingInvoiceId) {
            // EDITACE existující faktury
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
              console.log('⚠️ EDITACE FAKTURY: Objednávka vrácena na věcnou správnost');
            }
            // Pokud je už ve VECNA_SPRAVNOST, necháme beze změny
          } else {
            // NOVÁ FAKTURA
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

            console.log('✅ Workflow objednávky aktualizováno:', {
              oldState: currentState,
              newStates: stavKody,
              newStatusText: 'Věcná správnost'
            });

            // 🔔 NOTIFIKACE: Odeslat notifikace objednateli, garantovi a schvalovateli
            await sendInvoiceNotifications(formData.order_id, orderData);

            // ✅ Reload objednávky aby se zobrazil nový stav
            await loadOrderData(formData.order_id);
          }
        } catch (updateErr) {
          console.error('⚠️ Nepodařilo se aktualizovat workflow objednávky:', updateErr);
          // Neblokujeme úspěch faktury, jen logujeme chybu
        }
      }

      // 🔄 ZŮSTAT NA FORMULÁŘI - pouze resetovat formulář faktury
      // Při editaci vymazat entity, při nové faktuře zachovat pro další evidenci
      const keepEntity = !editingInvoiceId;
      
      setFormData({
        order_id: keepEntity ? formData.order_id : '', // Při editaci vymazat
        smlouva_id: keepEntity ? formData.smlouva_id : null, // Při editaci vymazat
        fa_cislo_vema: '',
        fa_typ: 'BEZNA',
        fa_datum_doruceni: formatDateForPicker(new Date()),
        fa_datum_vystaveni: formatDateForPicker(new Date()),
        fa_datum_splatnosti: '',
        fa_castka: '',
        fa_poznamka: '',
        fa_strediska_kod: [],
        file: null,
        fa_predana_zam_id: null,
        fa_datum_predani_zam: '',
        fa_datum_vraceni_zam: ''
      });

      // Reset editace faktury
      setEditingInvoiceId(null);
      
      // Při editaci vymazat i preview entity
      if (editingInvoiceId) {
        setOrderData(null);
        setSmlouvaData(null);
        setSearchTerm('');
        setShowSuggestions(false);
      }

      // Reset pole errors
      setFieldErrors({});

    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'Chyba při evidenci faktury');
      showToast && showToast(err.message || 'Chyba při evidenci faktury', 'error');
      setProgress?.(0);
    } finally {
      setLoading(false);
    }
  };

  // Handler: zpět na seznam
  const handleBack = () => {
    navigate(-1);
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

    // Auto-focus search
    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
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

  // Content komponenta (sdílená pro normal i fullscreen režim)
  const PageContent = (
    <>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={editingInvoiceId ? faEdit : faFileInvoice} />
          {editingInvoiceId ? 'Upravit fakturu' : 'Zaevidovat fakturu'}
        </PageTitle>
        <HeaderActions>
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
          <FormColumnHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <SectionTitle style={{ margin: 0 }}>
              <FontAwesomeIcon icon={faCreditCard} />
              Údaje faktury
              {editingInvoiceId && (
                <span style={{ 
                  marginLeft: '1rem',
                  color: '#6b7280',
                  fontSize: '0.9rem',
                  fontWeight: 400
                }}>
                  - Režim úprav #{editingInvoiceId}
                </span>
              )}
            </SectionTitle>
            {editingInvoiceId && (
              <button
                onClick={() => {
                  setEditingInvoiceId(null);
                  setFormData({
                    order_id: formData.order_id,
                    fa_cislo_vema: '',
                    fa_typ: 'BEZNA',
                    fa_datum_doruceni: formatDateForPicker(new Date()),
                    fa_datum_vystaveni: formatDateForPicker(new Date()),
                    fa_datum_splatnosti: '',
                    fa_castka: '',
                    fa_poznamka: '',
                    file: null
                  });
                  navigate(location.pathname, { replace: true, state: {} });
                  showToast && showToast('✨ Formulář resetován pro novou fakturu', 'info');
                }}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
                title="Zrušit úpravy a vrátit se k novému záznamu"
              >
                <FontAwesomeIcon icon={faTimes} /> Zrušit úpravu
              </button>
            )}
          </FormColumnHeader>

          <FormColumnContent>
            {error && (
              <ErrorAlert>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {error}
              </ErrorAlert>
            )}

            <FakturaCard $isEditing={true}>
            {/* GRID 3x - ŘÁDEK 1: Ev. číslo objednávky | Předmět | Celková cena */}
            <FieldRow $columns="2fr 2fr 1fr">
              <FieldGroup style={{ width: '100%' }}>
                <FieldLabel>
                  Vyberte objednávku nebo smlouvu
                </FieldLabel>
                <AutocompleteWrapper className="autocomplete-wrapper" style={{ width: '100%', position: 'relative' }}>
                  {/* Ikona zámku - klikatelná pro odemčení */}
                  {editingInvoiceId && (formData.order_id || formData.smlouva_id) && !isEntityUnlocked && (
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
                    disabled={!!orderId || (editingInvoiceId && (formData.order_id || formData.smlouva_id) && !isEntityUnlocked)}
                    placeholder={
                      "Začněte psát ev. číslo objednávky nebo smlouvy (min. 3 znaky)..."
                    }
                    style={{ 
                      width: '100%',
                      paddingLeft: (editingInvoiceId && (formData.order_id || formData.smlouva_id) && !isEntityUnlocked) ? '2.5rem' : '0.75rem'
                    }}
                  />
                  {searchTerm && !orderId && isEntityUnlocked && (
                    <ClearButton
                      type="button"
                      onClick={handleClearSearch}
                      title="Vymazat hledání"
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

              {/* Předmět / Název - dynamicky podle typu entity */}
              <FieldGroup>
                <FieldLabel>
                  {selectedType === 'smlouva' ? 'Název smlouvy' : 'Předmět objednávky'}
                </FieldLabel>
                <div style={{ 
                  height: '48px',
                  padding: '1px 0.875rem', 
                  display: 'flex',
                  alignItems: 'center',
                  background: (orderData || smlouvaData) ? '#f0f9ff' : '#f9fafb', 
                  border: (orderData || smlouvaData) ? '2px solid #3b82f6' : '2px solid #e5e7eb', 
                  borderRadius: '8px',
                  color: (orderData || smlouvaData) ? '#1e40af' : '#9ca3af',
                  fontWeight: (orderData || smlouvaData) ? '500' : '400',
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
                    console.log('🔍 FA_TYP CHANGE:', e.target.value, typeof e.target.value);
                    setFormData(prev => ({ ...prev, fa_typ: e.target.value }));
                  }}
                  options={[
                    { id: 'BEZNA', nazev: 'Běžná faktura' },
                    { id: 'ZALOHOVA', nazev: 'Zálohová faktura' },
                    { id: 'OPRAVNA', nazev: 'Opravná faktura' },
                    { id: 'PROFORMA', nazev: 'Proforma' },
                    { id: 'DOBROPIS', nazev: 'Dobropis' }
                  ]}
                  placeholder="-- Vyberte typ --"
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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
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
                  placeholder="12345678"
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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                      title="Vymazat částku"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </FieldLabel>
                <CurrencyInputWrapper>
                  <Input
                    type="text"
                    name="fa_castka"
                    value={formData.fa_castka}
                    onChange={handleInputChange}
                    placeholder="25 000,50"
                    style={{textAlign: 'right', paddingRight: '40px', width: '100%'}}
                    $hasError={!!fieldErrors.fa_castka}
                  />
                  <CurrencySymbol>Kč</CurrencySymbol>
                </CurrencyInputWrapper>
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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
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
                  disabled={strediskaLoading}
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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
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
                  placeholder="Volitelná poznámka..."
                />
              </FieldGroup>
            </FieldRow>

            {/* Příloha */}
            <FieldRow>
              <FieldGroup>
                <FieldLabel>
                  Příloha faktury
                </FieldLabel>
                <FileInputWrapper
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <FileInputLabel htmlFor="file-upload">
                    <FontAwesomeIcon icon={faUpload} size="2x" />
                    <div>Klikněte nebo přetáhněte soubor</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3af' }}>
                      Podporované formáty: PDF, ISDOC, DOCX, XLSX, obrázky (JPG, PNG, GIF)
                    </div>
                  </FileInputLabel>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.isdoc,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                  />
                </FileInputWrapper>
                {formData.file && (
                  <SelectedFileName>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981' }} />
                    <strong>Vybraný soubor:</strong> {formData.file.name}
                  </SelectedFileName>
                )}
              </FieldGroup>
            </FieldRow>

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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
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
                  disabled={zamestnanciLoading}
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
          {editingInvoiceId && formData.order_id && orderData && canAddInvoiceToOrder(orderData).allowed && (
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
          <ButtonGroup>
            <Button $variant="secondary" onClick={handleBack} disabled={loading}>
              <FontAwesomeIcon icon={faTimes} />
              Zrušit
            </Button>
            <Button 
              $variant="primary" 
              onClick={handleSubmit} 
              disabled={loading || (formData.order_id && orderData && !canAddInvoiceToOrder(orderData).allowed)}
              title={
                formData.order_id && orderData && !canAddInvoiceToOrder(orderData).allowed
                  ? canAddInvoiceToOrder(orderData).reason
                  : ''
              }
            >
              <FontAwesomeIcon icon={loading ? faExclamationTriangle : faSave} />
              {loading ? 'Ukládám...' : (
                editingInvoiceId 
                  ? 'Aktualizovat fakturu' 
                  : (formData.order_id && orderData 
                      ? 'Připojit fakturu' 
                      : 'Zaevidovat fakturu')
              )}
            </Button>
          </ButtonGroup>
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
                borderBottom: selectedType === 'smlouva' ? '2px solid #10b981' : '2px solid #3498db',
                marginBottom: '1rem'
              }}>
                <SectionTitle style={{ margin: 0, border: 'none', paddingBottom: 0, whiteSpace: 'nowrap' }}>
                  <FontAwesomeIcon icon={selectedType === 'smlouva' ? faFileContract : faBuilding} />
                  {selectedType === 'smlouva' ? 'Náhled smlouvy' : 'Náhled objednávky'}
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
                    <div style={{
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
                      whiteSpace: 'nowrap'
                    }}>
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
                    <div style={{
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
                      whiteSpace: 'nowrap'
                    }}>
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
                        const section = document.querySelector('[data-section="polozky"]');
                        if (section) {
                          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
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
                        const section = document.querySelector('[data-section="faktury"]');
                        if (section) {
                          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
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
              onEditInvoice={handleEditInvoice}
              canEditInvoice={canAddInvoiceToOrder(orderData).allowed}
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
                  {orderData.datum_vytvoreni ? formatDateOnly(orderData.datum_vytvoreni) : 'N/A'}
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
    </>
  );
}
