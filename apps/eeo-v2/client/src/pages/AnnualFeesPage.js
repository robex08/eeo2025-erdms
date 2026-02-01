import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faMinus, faFilter, faSearch, faCalendar, 
  faMoneyBill, faFileInvoice, faEdit, 
  faTrash, faCheckCircle, faExclamationTriangle, faSpinner, faUndo, faTimes, faArrowDown, faEraser,
  faPaperclip, faUpload, faDownload, faFile 
} from '@fortawesome/free-solid-svg-icons';
import { Calculator, AlertCircle, CheckCircle2, AlertTriangle, Info as InfoIcon, Paperclip, Upload, Download, Trash2, X } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import ConfirmDialog from '../components/ConfirmDialog';
import AnnualFeeAttachmentsTooltip from '../components/AnnualFeeAttachmentsTooltip';
import AttachmentViewer from '../components/invoices/AttachmentViewer';
import { 
  getAnnualFeesList, 
  getAnnualFeeDetail, 
  getAnnualFeesStats,
  createAnnualFee, 
  createAnnualFeeItem,
  updateAnnualFee, 
  updateAnnualFeeItem,
  deleteAnnualFee,
  deleteAnnualFeeItem,
  uploadAnnualFeeAttachment,
  listAnnualFeeAttachments,
  downloadAnnualFeeAttachment,
  deleteAnnualFeeAttachment,
  isAllowedAnnualFeeFileType,
  isAllowedAnnualFeeFileSize,
  formatFileSize
} from '../services/apiAnnualFees';
import { universalSearch } from '../services/apiUniversalSearch';
import { getSmlouvaDetail } from '../services/apiSmlouvy';
import { getStavyRocnichPoplatku, getDruhyRocnichPoplatku, getPlatbyRocnichPoplatku } from '../services/apiv2Dictionaries';
import { useDebounce } from '../hooks/useDebounce';

/**
 * 📋 EVIDENCE ROČNÍCH POPLATKŮ
 * 
 * Stránka pro správu ročních poplatků vázaných na smlouvy
 * - Rozbalitelné řádky (dropdown) podle vzoru Order V3
 * - Automatické generování položek podle typu platby (měsíční/kvartální/roční)
 * - Integrace se smlouvami a fakturami
 * 
 * ✅ DATA: Připojeno na API
 * - POST /api.eeo/annual-fees/list (seznam s filtry)
 * - POST /api.eeo/annual-fees/detail (detail s položkami)
 * - POST /api.eeo/annual-fees/create (vytvoření + auto-generování položek)
 * - POST /api.eeo/annual-fees/update-item (změna stavu položky)
 * - POST /api.eeo/annual-fees/delete (smazání poplatku)
 * 
 * @version 1.1.0
 * @date 2026-01-27
 */

// 🎨 STYLED COMPONENTS

const CurrencyInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const CurrencySymbol = styled.span`
  position: absolute;
  right: 8px;
  color: ${props => props.disabled ? '#9ca3af' : '#374151'};
  font-weight: 600;
  font-size: 0.875rem;
  font-family: inherit;
  pointer-events: none;
  user-select: none;
  display: flex;
  align-items: center;
  height: 100%;
`;

const PageContainer = styled.div`
  width: 100%;
  padding: 16px;
  margin: 0;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Využití celé šířky obrazovky jako u Order V3 */
  @media (min-width: 1920px) {
    padding: 20px;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  
  .beta-badge {
    padding: 4px 12px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    letter-spacing: 0.5px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: inherit;
  
  ${props => props.variant === 'primary' && `
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: white;
    color: #374151;
    border: 2px solid #e5e7eb;
    
    &:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const FiltersBar = styled.div`
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
`;

const FilterLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #374151;
  background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E") no-repeat right 8px center;
  background-size: 16px;
  padding-right: 32px;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  
  &:hover {
    border-color: #d1d5db;
  }
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
`;

const SearchInput = styled.input`
  padding: 8px 12px 8px 40px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #374151;
  background: white;
  width: 100%;
  min-width: 200px;
  transition: all 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px center;
  background-size: 18px;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const ClearAllButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  white-space: nowrap;
  height: 40px;
  align-self: flex-end; /* Zarovnání k dolnímu okraji jako ostatní prvky */
  
  &:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ExpandCollapseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 10px;
  
  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
    color: #374151;
  }
  
  &:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    width: 10px;
    height: 10px;
  }
`;

const SuggestionsWrapper = styled.div`
  position: relative;
  z-index: 100;
`;

const SuggestionsDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 500px;
  width: max-content;
  max-width: 800px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  margin-top: 4px;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 10000;
`;

const SuggestionItem = styled.div`
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s ease;
  
  &:hover {
    background: #f9fafb;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const SuggestionTitle = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SuggestionBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  background: ${props => props.$color || '#e5e7eb'};
  color: ${props => props.$textColor || '#374151'};
`;

const SuggestionDetail = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: visible;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
  font-size: 0.875rem;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-bottom: 2px solid #e5e7eb;
`;

const Th = styled.th`
  padding: 12px 8px;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  white-space: nowrap;
`;

const Tbody = styled.tbody`
  tr:hover {
    background: #f9fafb;
  }
`;

const Tr = styled.tr`
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s ease;
  
  ${props => props.clickable && `
    cursor: pointer;
  `}
`;

const Td = styled.td`
  padding: 12px 8px;
  color: #1e293b;
  font-size: 0.875rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  vertical-align: middle;
  position: relative;
  overflow: visible;
`;

const ExpandButton = styled.button`
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  
  &:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #475569;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  
  ${props => {
    switch(props.status) {
      case 'ZAPLACENO':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'NEZAPLACENO':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      case 'PO_SPLATNOSTI':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      case 'BLIZI_SE_SPLATNOST':
        return `
          background: #fef3c7;
          color: #d97706;
        `;
      case 'CASTECNE':
        return `
          background: #fef3c7;
          color: #d97706;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
        `;
    }
  }}
`;

const InvoiceStatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  
  ${props => {
    switch(props.status) {
      case 'ZAPLACENO':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'VECNA_SPRAVNOST':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case 'K_ZAPLACENI':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'PREDANA_PO':
        return `
          background: #e0e7ff;
          color: #4338ca;
        `;
      case 'PO_SPLATNOSTI':
        return `
          background: #fee2e2;
          color: #dc2626;
        `;
      case 'BLIZI_SE_SPLATNOST':
        return `
          background: #fef3c7;
          color: #d97706;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

const SubItemsContainer = styled.tr`
  background: #f9fafb;
`;

const SubItemsWrapper = styled.td`
  padding: 0 !important;
`;

const SubItemsTable = styled.table`
  width: 100%;
  background: #fafbfc;
  border-left: 4px solid #10b981;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.875rem;
`;

const SubItemRow = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f3f4f6;
  }
`;

const SubItemCell = styled.td`
  padding: 10px 12px;
  padding-left: ${props => props.indent ? '48px' : '16px'};
  color: #64748b;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  vertical-align: middle;
`;

// II. Styled komponenty pro inline "Nový řádek" formulář
const NewRowTr = styled.tr`
  background: #f0fdf4;
  border: 2px solid #10b981;
  
  &:hover {
    background: #dcfce7;
  }
`;

const NewRowButton = styled.button`
  width: 100%;
  background: transparent;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
  padding: 16px 24px;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 600;
  transition: all 0.2s ease;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:hover {
    background: #f9fafb;
    border-color: #10b981;
    color: #10b981;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    font-size: 1.1rem;
  }
`;

const InlineInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
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
  z-index: 10;

  &:hover {
    color: #6b7280;
    background: #f3f4f6;
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }
`;

const DateWithArrowContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
`;

const ArrowButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

// 🔔 Modal komponenty
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #111827;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #6b7280;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const PolozkyTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    background: #f3f4f6;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
  }
  
  td {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  tbody tr:hover {
    background: #f9fafb;
  }
`;

const InlineSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 2px solid ${props => props.hasError ? '#dc2626' : '#e5e7eb'};
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: all 0.2s ease;
  background: #ffffff;
  cursor: pointer;

  /* Zvýrazněné vybrané hodnoty vs. placeholder */
  color: ${props => props.value && props.value !== '' && props.value !== 'placeholder' ? '#1f2937' : '#6b7280'};
  font-weight: ${props => {
    if (props.disabled) return '400';
    return props.value && props.value !== '' && props.value !== 'placeholder' ? '600' : '400';
  }};

  /* Custom arrow */
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px 16px;
  padding-right: 32px;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc2626' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 8px 0;
  }
  
  p {
    font-size: 0.95rem;
    margin: 0;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #10b981;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 16px auto;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// 🧩 CURRENCY INPUT COMPONENT - Převzato z OrderForm25
function CurrencyInput({ value, onChange, onBlur, disabled, hasError, placeholder = '0,00' }) {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Funkce pro formátování měny (BEZ Kč, protože to je fixně vpravo)
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
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
    setLocalValue(newValue);

    // Očistit hodnotu od formátování
    const cleanValue = newValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);

    if (onChange) {
      onChange(finalValue);
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

    const cleanValue = localValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    const finalValue = isNaN(numValue) ? '' : numValue.toFixed(2);

    if (onBlur) {
      onBlur(finalValue);
    }
  };

  return (
    <CurrencyInputWrapper>
      <InlineInput
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlurLocal}
        disabled={disabled}
        style={{ textAlign: 'right', paddingRight: '32px' }}
      />
      <CurrencySymbol disabled={disabled}>Kč</CurrencySymbol>
    </CurrencyInputWrapper>
  );
}

// Dashboard komponenty
const DashboardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const DashboardCard = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  text-align: center;
  position: relative;
  
  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }
  
  .value {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }
  
  .amount {
    font-size: 0.875rem;
    color: #64748b;
    margin-top: 0.25rem;
  }
  
  &.overdue {
    border-color: #ef4444;
    .value { color: #ef4444; }
  }
  
  &.current {
    border-color: #3b82f6;
    .value { color: #3b82f6; }
  }
  
  @keyframes pulseAlert {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1);
    }
    50% { 
      opacity: 0.6; 
      transform: scale(1.1);
    }
  }
  
  .alert-icon {
    position: absolute;
    right: 24px;
    top: 1rem;
    bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ef4444;
    font-size: 53px;
    font-weight: bold;
    animation: pulseAlert 1.5s ease-in-out infinite;
    z-index: 1;
    line-height: 1;
  }
  
  .alert-icon-left {
    position: absolute;
    left: 24px;
    top: 1rem;
    bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ef4444;
    font-size: 53px;
    font-weight: bold;
    animation: pulseAlert 1.5s ease-in-out infinite;
    z-index: 1;
    line-height: 1;
  }
  
  .alert-icon-orange {
    position: absolute;
    right: 24px;
    top: 1rem;
    bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff9800;
    font-size: 53px;
    font-weight: bold;
    animation: pulseAlert 1.5s ease-in-out infinite;
    z-index: 1;
    line-height: 1;
  }
  
  .alert-icon-left-orange {
    position: absolute;
    left: 24px;
    top: 1rem;
    bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff9800;
    font-size: 53px;
    font-weight: bold;
    animation: pulseAlert 1.5s ease-in-out infinite;
    z-index: 1;
    line-height: 1;
  }
`;

const Badge = styled.span`
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.25rem;
`;

// Pagination komponenty podle vzoru Orders25List
const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
`;

// Řádky po splatnosti styling
const OverdueRow = styled.tr`
  &.overdue-highlight {
    background-color: #fef2f2 !important;
    border-left: 4px solid #ef4444;
  }
`;

// 📎 PŘÍLOHY - Styled komponenty
const AttachmentsContainer = styled.div`
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const AttachmentsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.$isDragging ? '#3b82f6' : '#cbd5e1'};
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
  background: ${props => props.$isDragging ? '#eff6ff' : 'white'};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 1rem;
  
  &:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }
`;

const DropZoneContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const DropZoneIcon = styled.div`
  font-size: 2rem;
  color: ${props => props.$isDragging ? '#3b82f6' : '#94a3b8'};
`;

const DropZoneText = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const AttachmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
`;

const AttachmentIcon = styled.div`
  font-size: 1.25rem;
  color: #3b82f6;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AttachmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AttachmentName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AttachmentMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
`;

const AttachmentActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const AttachmentButton = styled.button`
  padding: 0.375rem 0.5rem;
  border: none;
  background: ${props => props.$danger ? '#fee2e2' : '#eff6ff'};
  color: ${props => props.$danger ? '#dc2626' : '#3b82f6'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$danger ? '#fecaca' : '#dbeafe'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

// PDF Viewer styled components
// 🧩 MAIN COMPONENT

function AnnualFeesPage() {
  const { token, username, userDetail, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  // 🔐 KONTROLA OPRÁVNĚNÍ
  // Pravidla:
  // 1. ADMIN + ANNUAL_FEES_MANAGE = plný přístup
  // 2. ANNUAL_FEES_VIEW = pouze čtení
  // 3. ANNUAL_FEES_CREATE + ANNUAL_FEES_EDIT = vytváření + editace
  // 4. ANNUAL_FEES_DELETE (+ EDIT) = mazání
  // 5. ANNUAL_FEES_ITEM_PAYMENT (+ VIEW nebo EDIT) = označování plateb
  
  const isAdmin = hasPermission('ADMIN');
  const hasManage = hasPermission('ANNUAL_FEES_MANAGE');
  const hasView = hasPermission('ANNUAL_FEES_VIEW');
  const hasCreate = hasPermission('ANNUAL_FEES_CREATE');
  const hasEdit = hasPermission('ANNUAL_FEES_EDIT');
  const hasDelete = hasPermission('ANNUAL_FEES_DELETE');
  const hasItemPayment = hasPermission('ANNUAL_FEES_ITEM_PAYMENT');
  
  // Kombinované kontroly
  const canView = isAdmin || hasManage || hasView || hasEdit || hasCreate;
  const canCreate = isAdmin || hasManage || hasCreate;
  const canEdit = isAdmin || hasManage || hasEdit;
  const canDelete = isAdmin || hasManage || (hasDelete && hasEdit); // DELETE jen s EDIT
  const canMarkPayment = isAdmin || hasManage || (hasItemPayment && (hasView || hasEdit));
  
  // 📎 STATE PRO PŘÍLOHY
  const [attachments, setAttachments] = useState({}); // { [feeId]: [{id, original_name, ...}] }
  const [uploadingAttachments, setUploadingAttachments] = useState(new Set());
  const [isDragging, setIsDragging] = useState({}); // { [feeId]: boolean }
  
  // 🎨 HELPER FUNKCE PRO FORMÁTOVANÉ TOASTY
  // Vytváří jednotný vzhled pro všechny toast zprávy s ikonami a barvami
  const formatToastMessage = useCallback((message, type = 'info') => {
    const styles = {
      error: {
        color: '#d32f2f',
      },
      success: {
        color: '#0d7d3e',
      },
      warning: {
        color: '#d46b08',
      },
      info: {
        color: '#4b5563',
      }
    };

    const style = styles[type] || styles.info;

    return (
      <div style={{ 
        fontSize: '14px',
        lineHeight: '1.5',
        color: style.color,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {message}
      </div>
    );
  }, []);
  
  // State
  const [loading, setLoading] = useState(true);
  const [annualFees, setAnnualFees] = useState([]);
  
  // 💾 Inicializace expandedRows z localStorage
  const [expandedRows, setExpandedRows] = useState(() => {
    try {
      // Vymazat starý localStorage s Set struktuou
      const saved = localStorage.getItem('annualFees_expandedRows');
      if (saved && saved.includes('[') && saved.includes(']')) {
        // Starý formát (array), vymaž a začni znovu
        localStorage.removeItem('annualFees_expandedRows');
        return {};
      }
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Chyba při načítání expandedRows z localStorage:', error);
      // Vymaž poškozený localStorage
      localStorage.removeItem('annualFees_expandedRows');
      return {};
    }
  });
  
  const [showNewRow, setShowNewRow] = useState(false);
  const [filters, setFilters] = useState({
    rok: new Date().getFullYear(),
    druh: 'all',
    platba: 'all',
    stav: 'all',
    smlouva: ''
  });
  
  // Fulltext vyhledávání state
  const [fulltextSearch, setFulltextSearch] = useState('');
  const debouncedFulltext = useDebounce(fulltextSearch, 300);
  
  // Číselníky
  const [druhy, setDruhy] = useState([]);
  const [platby, setPlatby] = useState([]);
  const [stavy, setStavy] = useState([]);
  
  // Autocomplete pro smlouvy
  const [smlouvySearch, setSmlouvySearch] = useState('');
  const [smlouvySuggestions, setSmlouvySuggestions] = useState([]);
  const [showSmlouvySuggestions, setShowSmlouvySuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const smlouvySearchRef = useRef(null);
  
  // Editace hlavního řádku (fee)
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editFeeData, setEditFeeData] = useState({});
  
  // Editace položek
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemData, setEditItemData] = useState({});
  
  // Bulk expand/collapse state
  const [expandingAll, setExpandingAll] = useState(false);
  
  // 🔔 Modal pro potvrzení položek
  const [showPolozkyModal, setShowPolozkyModal] = useState(false);
  const [generatedPolozky, setGeneratedPolozky] = useState([]);
  const [pendingFeeData, setPendingFeeData] = useState(null); // Hlavní řádek čekající na potvrzení
  const [isCreating, setIsCreating] = useState(false); // true = CREATE, false = UPDATE
  
  // 📄 Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSizeOptions = [5, 10, 25, 50, 100];
  
  // 📊 Dashboard data
  const [dashboardStats, setDashboardStats] = useState({
    dueSoon: 0,               // Blíží se splatnost (10 dní)
    dueSoonAmount: 0,         // Částka blíží se splatnost
    currentMonth: 0,          // Aktuální měsíc
    currentMonthAmount: 0,    // Částka aktuální měsíc
    overdue: 0,               // Po splatnosti
    overdueAmount: 0,         // Částka po splatnosti
    totalActive: 0,           // Celkem aktivních
    totalActiveAmount: 0,     // Částka celkem aktivních
    totalToPay: 0,            // Celkem k zaplacení
    totalPaid: 0,             // Celkem zaplaceno
    totalRemaining: 0         // Celkem zbývá
  });
  
  // Přidání nové položky k existujícímu ročnímu poplatku
  const [addingItemToFeeId, setAddingItemToFeeId] = useState(null);
  const [newItemData, setNewItemData] = useState({
    nazev_polozky: '', // Poznámka
    datum_splatnosti: '',
    castka: '',
    cislo_dokladu: '', // Číslo dokladu (VEMA)
    datum_zaplaceno: new Date().toISOString().split('T')[0] // Dnešní datum
  });
  
  // Autocomplete pro faktury
  const [fakturySearch, setFakturySearch] = useState('');
  const [fakturySuggestions, setFakturySuggestions] = useState([]);
  const [showFakturySuggestions, setShowFakturySuggestions] = useState(false);
  const [isSearchingFaktury, setIsSearchingFaktury] = useState(false);
  const fakturySearchRef = useRef(null);
  const fakturyInputRef = useRef(null);
  const [shouldFocusFaktura, setShouldFocusFaktura] = useState(false);
  const debouncedFakturySearch = useDebounce(fakturySearch, 300);
  
  // Form data pro CREATE
  const [newFeeData, setNewFeeData] = useState({
    smlouva_id: null,
    smlouva_cislo: '',
    dodavatel_nazev: '',
    nazev: '',
    poznamka: '',
    druh: 'JINE',
    platba: 'MESICNI',
    castka: '',
    rok: new Date().getFullYear(),
    datum_prvni_splatnosti: `${new Date().getFullYear()}-01-01`
  });
  
  // Debounced search
  const debouncedSmlouvySearch = useDebounce(smlouvySearch, 300);
  
  // 💰 Formátování částek
  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
  };
  
  const formatCurrencySimple = (val) => {
    if (!val && val !== 0) return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',') + ' Kč';
  };
  
  // 🔧 Generování položek (stejná logika jako backend)
  // Funkce pro kontrolu splatnosti
  const isItemOverdue = (item) => {
    // Zaplacené položky NIKDY nejsou po splatnosti
    if (item.stav === 'ZAPLACENO') return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Nulové časy pro přesné porovnání dat
    
    const dueDate = new Date(item.datum_splatnosti);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  };
  
  // Funkce pro kontrolu "blíží se splatnost" (do 10 dní)
  const isItemDueSoon = (item) => {
    // Zaplacené položky nejsou "blíží se splatnost"
    if (item.stav === 'ZAPLACENO') return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(item.datum_splatnosti);
    dueDate.setHours(0, 0, 0, 0);
    
    const dueSoonLimit = new Date(today);
    dueSoonLimit.setDate(today.getDate() + 10);
    
    // Blíží se splatnost: od dneška (včetně) do 10 dní dopředu (včetně)
    return dueDate >= today && dueDate <= dueSoonLimit;
  };

  // Funkce pro automatické určení stavu položky podle data splatnosti
  const getItemStatusByDate = (item) => {
    if (item.stav === 'ZAPLACENO') return 'ZAPLACENO';
    
    if (isItemOverdue(item)) {
      return 'PO_SPLATNOSTI';
    } else if (isItemDueSoon(item)) {
      return 'BLIZI_SE_SPLATNOST';
    } else {
      return 'NEZAPLACENO';
    }
  };
  
  // Funkce pro výpočet nezaplacených položek po splatnosti
  const getUnpaidItemsCount = (fee) => {
    // Použij data z API (dostupná hned) místo počítání z fee.polozky (dostupná až po rozbalení)
    return fee.pocet_po_splatnosti || 0;
  };
  
  // Funkce pro badge - vrátí počty pro oba typy problémů
  const getBadgeInfo = (fee) => {
    const overdue = fee.pocet_po_splatnosti || 0;
    const dueSoon = fee.pocet_blizi_se_splatnost || 0;
    
    return { 
      overdue: overdue,
      dueSoon: dueSoon,
      hasAny: overdue > 0 || dueSoon > 0 
    };
  };
  
  const generatePolozkyLocal = (platba, rok, celkovaCastka, datumPrvniSplatnosti) => {
    const polozky = [];
    const datum = new Date(datumPrvniSplatnosti);
    
    const mesiceCesky = [
      '', 'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
      'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
    ];
    
    let pocetPolozek = 0;
    
    switch (platba) {
      case 'MESICNI':
        pocetPolozek = 12;
        for (let i = 0; i < 12; i++) {
          const mesic = datum.getMonth() + 1;
          polozky.push({
            nazev_polozky: `${mesiceCesky[mesic]} ${rok}`,
            datum_splatnosti: datum.toISOString().split('T')[0],
            castka: celkovaCastka / 12,
            cislo_dokladu: '',
            datum_zaplaceno: null
          });
          datum.setMonth(datum.getMonth() + 1);
        }
        break;
        
      case 'KVARTALNI':
        pocetPolozek = 4;
        for (let i = 1; i <= 4; i++) {
          polozky.push({
            nazev_polozky: `Q${i} ${rok}`,
            datum_splatnosti: datum.toISOString().split('T')[0],
            castka: celkovaCastka / 4,
            cislo_dokladu: '',
            datum_zaplaceno: null
          });
          datum.setMonth(datum.getMonth() + 3);
        }
        break;
        
      case 'ROCNI':
        pocetPolozek = 1;
        polozky.push({
          nazev_polozky: `Roční poplatek ${rok}`,
          datum_splatnosti: datum.toISOString().split('T')[0],
          castka: celkovaCastka,
          cislo_dokladu: '',
          datum_zaplaceno: null
        });
        break;
        
      case 'JINA':
        // Žádné položky - přidávají se manuálně
        break;
        
      default:
        console.warn('Neznámý typ platby:', platba);
    }
    
    return polozky;
  };

  // 🔄 Aktualizace datumů podle periody platby od daného řádku dolů
  const updateDatesFromIndex = (items, setItems, startIndex, platba, baseDate) => {
    const updated = [...items];
    // Parsuj datum ze stringu (YYYY-MM-DD)
    const [year, month, day] = baseDate.split('-').map(Number);
    
    for (let i = startIndex + 1; i < updated.length; i++) {
      const offset = i - startIndex;
      let targetYear = year;
      let targetMonth = month; // 1-based (1 = leden)
      
      switch (platba) {
        case 'MESICNI':
          targetMonth = month + offset;
          break;
        case 'KVARTALNI':
          targetMonth = month + (offset * 3);
          break;
        case 'ROCNI':
          targetYear = year + offset;
          break;
        default:
          continue; // Pro JINA a neznámé typy neaktualizujeme
      }
      
      // Normalizuj měsíc a rok (pokud měsíc přesahuje 12)
      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }
      while (targetMonth < 1) {
        targetMonth += 12;
        targetYear -= 1;
      }
      
      // Zkontroluj, zda den existuje v cílovém měsíci
      const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
      const finalDay = Math.min(day, daysInTargetMonth);
      
      // Vytvoř finální datum ve formátu YYYY-MM-DD
      const finalDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
      
      updated[i].datum_splatnosti = finalDate;
    }
    
    setItems(updated);
  };

  // Aktualizace dat v existujících annual fees
  const updateExistingDatesFromIndex = async (itemIndex, fee, setAnnualFees, customStartDate = null, saveToDatabase = true) => {
    // Získat aktuální stav dat ze state
    let currentFee = fee;
    setAnnualFees(prevFees => {
      const found = prevFees.find(f => f.id === fee.id);
      if (found) currentFee = found;
      return prevFees;
    });

    // Nejprve aktualizovat stav pro okamžitou vizuální zpětnou vazbu
    setAnnualFees(prevFees => 
      prevFees.map(f => {
        if (f.id === currentFee.id) {
          const updated = {...f};
          const updatedPolozky = [...f.polozky];
          const startItem = updatedPolozky[itemIndex];
          if (!startItem) return f;

          const startDate = new Date(customStartDate || startItem.datum_splatnosti);
          
          for (let i = itemIndex + 1; i < updatedPolozky.length; i++) {
            // Parsuj datum ze stringu (YYYY-MM-DD)
            const dateStr = customStartDate || startItem.datum_splatnosti;
            const [year, month, day] = dateStr.split('-').map(Number);
            const offset = i - itemIndex;
            
            let targetYear = year;
            let targetMonth = month; // 1-based (1 = leden)
            
            switch (currentFee.platba) {
              case 'MESICNI':
                targetMonth = month + offset;
                break;
              case 'KVARTALNI':
                targetMonth = month + (offset * 3);
                break;
              case 'ROCNI':
                targetYear = year + offset;
                break;
              default:
                continue; // Pro JINA a neznámé typy neaktualizujeme
            }
            
            // Normalizuj měsíc a rok (pokud měsíc přesahuje 12)
            while (targetMonth > 12) {
              targetMonth -= 12;
              targetYear += 1;
            }
            while (targetMonth < 1) {
              targetMonth += 12;
              targetYear -= 1;
            }
            
            // Zkontroluj, zda den existuje v cílovém měsíci
            const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
            const finalDay = Math.min(day, daysInTargetMonth);
            
            // Vytvoř finální datum ve formátu YYYY-MM-DD
            const finalDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
            
            updatedPolozky[i] = {
              ...updatedPolozky[i],
              datum_splatnosti: finalDate
            };
          }
          
          updated.polozky = updatedPolozky;
          return updated;
        }
        return f;
      })
    );

    // Pokud je saveToDatabase true, uložit změny do databáze
    if (saveToDatabase) {
      try {
        const startItem = currentFee.polozky[itemIndex];
        if (!startItem) return;

        const startDate = new Date(customStartDate || startItem.datum_splatnosti);
        const updatePromises = [];
        
        for (let i = itemIndex + 1; i < currentFee.polozky.length; i++) {
          // Parsuj datum ze stringu (YYYY-MM-DD)
          const dateStr = customStartDate || startItem.datum_splatnosti;
          const [year, month, day] = dateStr.split('-').map(Number);
          const offset = i - itemIndex;
          
          let targetYear = year;
          let targetMonth = month; // 1-based (1 = leden)
          
          switch (currentFee.platba) {
            case 'MESICNI':
              targetMonth = month + offset;
              break;
            case 'KVARTALNI':
              targetMonth = month + (offset * 3);
              break;
            case 'ROCNI':
              targetYear = year + offset;
              break;
            default:
              continue;
          }
          
          // Normalizuj měsíc a rok (pokud měsíc přesahuje 12)
          while (targetMonth > 12) {
            targetMonth -= 12;
            targetYear += 1;
          }
          while (targetMonth < 1) {
            targetMonth += 12;
            targetYear -= 1;
          }
          
          // Zkontroluj, zda den existuje v cílovém měsíci
          const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
          const finalDay = Math.min(day, daysInTargetMonth);
          
          // Vytvoř finální datum ve formátu YYYY-MM-DD
          const finalDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
          
          const item = currentFee.polozky[i];
          updatePromises.push(
            updateAnnualFeeItem({
              token,
              username,
              id: item.id,
              data: { datum_splatnosti: finalDate }
            })
          );
        }

        await Promise.all(updatePromises);
        showToast(formatToastMessage('Data splatnosti byla aktualizována podle periody platby', 'success'), { type: 'success' });
        
      } catch (error) {
        console.error('Chyba při aktualizaci dat splatnosti:', error);
        showToast(formatToastMessage('Chyba při ukládání aktualizovaných dat splatnosti', 'error'), { type: 'error' });
        
        // V případě chyby obnovit data z databáze
        const detail = await getAnnualFeeDetail({
          token,
          username,
          id: currentFee.id
        });
        
        if (detail.data) {
          setAnnualFees(prev => prev.map(f => 
            f.id === currentFee.id ? { ...f, ...detail.data } : f
          ));
        }
      }
    }
  };
  
  // Load číselníky
  useEffect(() => {
    loadCiselniky();
  }, []);
  
  const loadCiselniky = async () => {
    try {
      const [druhyRes, platbyRes, stavyRes] = await Promise.all([
        getDruhyRocnichPoplatku({ token, username }),
        getPlatbyRocnichPoplatku({ token, username }),
        getStavyRocnichPoplatku({ token, username })
      ]);
      
      setDruhy(druhyRes || []);
      setPlatby(platbyRes || []);
      setStavy(stavyRes || []);
    } catch (error) {
      console.error('Chyba při načítání číselníků:', error);
      showToast(formatToastMessage('Chyba při načítání číselníků', 'error'), { type: 'error' });
    }
  };
  
  // Load data
  useEffect(() => {
    loadAnnualFees(1, pageSize); // Vždy začni na stránce 1 při změně filtrů
  }, [filters]);
  
  // Load data when page changes (pouze pro server-side pagination)
  useEffect(() => {
    // Pro stavový filtr neloadujeme data znovu, jen použijeme client-side pagination
    const isStatusFilterActive = filters.stav && filters.stav !== 'all';
    if (!isStatusFilterActive) {
      loadAnnualFees(currentPage, pageSize);
    }
  }, [currentPage]);

  // Load data when page size changes
  useEffect(() => {
    loadAnnualFees(1, pageSize);
  }, [pageSize]);
  
  // Load číselníky při startu
  useEffect(() => {
    if (token && username) {
      loadCiselniky();
    }
  }, [token, username]);
  
  // 💾 Uložit expandedRows do localStorage při změně
  useEffect(() => {
    try {
      localStorage.setItem('annualFees_expandedRows', JSON.stringify(expandedRows));
    } catch (error) {
      console.error('Chyba při ukládání expandedRows do localStorage:', error);
    }
  }, [expandedRows]);
  
  const loadAnnualFees = async (page = currentPage, size = pageSize) => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Pokud je aktivní filtr stavu, načteme všechny položky pro client-side filtrování
      const isStatusFilterActive = filters.stav && filters.stav !== 'all';
      const paginationParams = isStatusFilterActive ? {
        page: 1,
        pageSize: 10000 // Načteme všechny položky pro client-side filtrování
      } : {
        page: page,
        pageSize: size
      };
      
      // Načíst seznam poplatků s paginací
      const response = await getAnnualFeesList({
        token,
        username,
        filters: {
          rok: filters.rok,
          druh: filters.druh !== 'all' ? filters.druh : undefined,
          platba: filters.platba !== 'all' ? filters.platba : undefined,
          // stav filtrujeme až na frontendu, nikoliv v API
          smlouva: filters.smlouva || undefined
        },
        pagination: paginationParams
      });
      
      if (isStatusFilterActive) {
        // Pro stavový filtr nepoužíváme server-side pagination
        // Pagination data se budou počítat z filtredAnnualFees v komponentě
        setCurrentPage(page); // Ale current page si pamatujeme
      } else {
        // Nastavit pagination data pro server-side pagination
        setTotalRecords(response.totalRecords || 0);
        setTotalPages(response.totalPages || 0);
        setCurrentPage(page);
      }
      
      // Načíst dashboard statistiky
      try {
        const statsResponse = await getAnnualFeesStats({
          token,
          username,
          rok: filters.rok !== 'all' ? filters.rok : undefined
        });
        
        if (statsResponse.status === 'success' && statsResponse.data?.dashboard) {
          setDashboardStats(statsResponse.data.dashboard);
        }
      } catch (statsError) {
        console.error('Chyba při načítání dashboard statistik:', statsError);
      }
      
      // Inicializovat počítadla pro filtrování
      const feesWithInitializedCounts = (response.data || []).map(fee => {
        // Pokud nejsou počítadla nastavená, inicializuj je na 0
        return {
          ...fee,
          pocet_po_splatnosti: fee.pocet_po_splatnosti ?? 0,
          pocet_blizi_se_splatnost: fee.pocet_blizi_se_splatnost ?? 0,
          pocet_zaplaceno: fee.pocet_zaplaceno ?? 0
        };
      });
      
      setAnnualFees(feesWithInitializedCounts);
      
      // � Načíst počty příloh pro všechny řádky
      feesWithInitializedCounts.forEach(fee => {
        loadAttachments(fee.id);
      });
      
      // �💾 Načíst detaily pro již rozbalené řádky
      if (expandedRows.size > 0) {
        const fees = response.data || [];
        for (const feeId of expandedRows) {
          const feeExists = fees.find(f => f.id === feeId);
          if (feeExists && !feeExists.polozky) {
            try {
              const detail = await getAnnualFeeDetail({
                token,
                username,
                id: feeId
              });
              
              if (detail.data) {
                setAnnualFees(prev => prev.map(fee => 
                  fee.id === feeId ? { ...fee, polozky: detail.data.polozky } : fee
                ));
              }
            } catch (error) {
              console.error(`Chyba při načítání detailu pro ID ${feeId}:`, error);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Chyba při načítání ročních poplatků:', error);
      showToast(formatToastMessage('Chyba při načítání ročních poplatků', 'error'), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle row expansion
  const toggleRow = async (id) => {
    const newExpanded = { ...expandedRows };
    
    if (newExpanded[id]) {
      delete newExpanded[id];
    } else {
      newExpanded[id] = true;
      
      // Načíst detail s položkami
      try {
        const detail = await getAnnualFeeDetail({
          token,
          username,
          id
        });
        
        if (detail.data) {
          setAnnualFees(prev => prev.map(fee => 
            fee.id === id ? { ...fee, polozky: detail.data.polozky } : fee
          ));
        }
      } catch (error) {
        console.error('Chyba při načítání detailu:', error);
        showToast(formatToastMessage('Chyba při načítání detailu poplatku', 'error'), { type: 'error' });
      }
      
      // 📎 Načíst přílohy
      loadAttachments(id);
    }
    
    setExpandedRows(newExpanded);
  };
  
  // Rozbalit všechny řádky
  const expandAll = async () => {
    setExpandingAll(true);
    
    try {
      const allIds = filteredAnnualFees.map(fee => fee.id);
      const newExpanded = {};
      allIds.forEach(id => {
        newExpanded[id] = true;
      });
      
      // Načíst detaily pro všechny
      for (const id of allIds) {
        const fee = annualFees.find(f => f.id === id);
        if (!fee.polozky) {
          try {
            const detail = await getAnnualFeeDetail({ token, username, id });
            if (detail.data) {
              setAnnualFees(prev => prev.map(f => 
                f.id === id ? { ...f, polozky: detail.data.polozky } : f
              ));
            }
          } catch (error) {
            console.error(`Chyba při načítání detailu pro ID ${id}:`, error);
          }
        }
      }
      
      setExpandedRows(newExpanded);
    } finally {
      setExpandingAll(false);
    }
  };
  
  // Sbalit všechny řádky
  const collapseAll = () => {
    setExpandedRows({});
  };
  
  // Filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset na první stránku při změně filtru
  };

  // Fulltext search change
  const handleFulltextSearchChange = (value) => {
    setFulltextSearch(value);
    setCurrentPage(1); // Reset na první stránku při změně vyhledávání
  };
  
  // Funkce pro zrušení všech filtrů
  const handleClearFilters = () => {
    setFilters({
      rok: new Date().getFullYear(),
      druh: 'all',
      platba: 'all',
      stav: 'all',
      smlouva: ''
    });
    setFulltextSearch('');
    setCurrentPage(1); // Reset na první stránku při vymazání filtrů
  };
  
  // Normalizace textu pro vyhledávání - bez diakritiky a case-insensitive
  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // odstraní diakritiku
  };
  
  // Kontrola zda řetězec obsahuje hledaný term
  const containsSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return false;
    return normalizeText(text).includes(normalizeText(searchTerm));
  };
  
  // Filtrovaná data podle fulltext vyhledávání a stavu
  const filteredAnnualFees = annualFees.filter(fee => {
    // Fulltext filtr
    if (debouncedFulltext) {
      // Vyhledávej v hlavních polích
      const mainFields = [
        fee.nazev,
        fee.smlouva_cislo,
        fee.dodavatel_nazev,
        fee.druh_nazev,
        fee.platba_nazev,
        fee.poznamka,
        fee.stav_nazev,
        fee.aktualizoval_jmeno,
        fee.aktualizoval_prijmeni,
        fee.vytvoril_jmeno,
        fee.vytvoril_prijmeni
      ];
      
      // Zkontroluj hlavní pole
      const foundInMain = mainFields.some(field => containsSearchTerm(field, debouncedFulltext));
      if (!foundInMain) {
        // Zkontroluj i podpoložky (pokud jsou načtené)
        if (fee.polozky && fee.polozky.length > 0) {
          const foundInItems = fee.polozky.some(item => {
            const itemFields = [
              item.nazev_polozky,
              item.cislo_dokladu,
              item.stav,
              item.aktualizoval_jmeno,
              item.aktualizoval_prijmeni
            ];
            return itemFields.some(field => containsSearchTerm(field, debouncedFulltext));
          });
          if (!foundInItems) return false;
        } else {
          return false;
        }
      }
    }
    
    // Filtrování podle stavu (používá počítadla)
    if (filters.stav && filters.stav !== 'all') {
      switch (filters.stav) {
        case '_PO_SPLATNOSTI':
          return (fee.pocet_po_splatnosti || 0) > 0;
        case '_BLIZI_SE_SPLATNOST':
          return (fee.pocet_blizi_se_splatnost || 0) > 0;
        case 'ZAPLACENO':
          // Všechny položky zaplacené
          return fee.pocet_polozek > 0 && fee.pocet_zaplaceno === fee.pocet_polozek;
        case 'NEZAPLACENO':
          // Má nezaplacené položky, ale nejsou po/blížící se splatnosti
          return (fee.pocet_polozek - (fee.pocet_zaplaceno || 0)) > 0 && 
                 (fee.pocet_po_splatnosti || 0) === 0 && 
                 (fee.pocet_blizi_se_splatnost || 0) === 0;
        case 'CASTECNE':
          // Některé zaplacené, ale ne všechny
          return (fee.pocet_zaplaceno || 0) > 0 && (fee.pocet_zaplaceno || 0) < fee.pocet_polozek;
        default:
          return true;
      }
    }
    
    return true;
  });

  // Client-side pagination pro případy kdy je aktivní stavový filtr
  const isStatusFilterActive = filters.stav && filters.stav !== 'all';
  const paginatedData = isStatusFilterActive ? (() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAnnualFees.slice(startIndex, endIndex);
  })() : filteredAnnualFees;

  // Pagination data pro zobrazení
  const paginationInfo = isStatusFilterActive ? {
    totalRecords: filteredAnnualFees.length,
    totalPages: Math.ceil(filteredAnnualFees.length / pageSize),
    currentPage: currentPage
  } : {
    totalRecords: totalRecords,
    totalPages: totalPages,
    currentPage: currentPage
  };
  
  // Funkce pro zvýraznění hledaného textu
  const highlightSearchTerm = (text, searchTerm) => {
    if (!text || !searchTerm) return text;
    
    const normalizedText = normalizeText(text);
    const normalizedSearch = normalizeText(searchTerm);
    const index = normalizedText.indexOf(normalizedSearch);
    
    if (index === -1) return text;
    
    const beforeMatch = text.substring(0, index);
    const match = text.substring(index, index + searchTerm.length);
    const afterMatch = text.substring(index + searchTerm.length);
    
    return (
      <>
        {beforeMatch}
        <span style={{ backgroundColor: '#fef3c7', fontWeight: 'bold' }}>{match}</span>
        {afterMatch}
      </>
    );
  };
  
  // Search smluv pro autocomplete
  useEffect(() => {
    if (debouncedSmlouvySearch.length >= 3) {
      searchSmlouvy(debouncedSmlouvySearch);
    } else {
      setSmlouvySuggestions([]);
      setShowSmlouvySuggestions(false);
    }
  }, [debouncedSmlouvySearch]);
  
  // Search faktur pro autocomplete
  useEffect(() => {
    if (debouncedFakturySearch.length >= 3) {
      searchFaktury(debouncedFakturySearch);
    } else {
      setFakturySuggestions([]);
      setShowFakturySuggestions(false);
    }
  }, [debouncedFakturySearch]);
  
  // Fokus na pole faktury při otevření editace kvůli chybějící faktuře
  useEffect(() => {
    if (shouldFocusFaktura && fakturyInputRef.current) {
      setTimeout(() => {
        fakturyInputRef.current?.focus();
        setShouldFocusFaktura(false);
      }, 100);
    }
  }, [shouldFocusFaktura, editingItemId]);
  
  // ============================================================================
  // 📎 FUNKCE PRO PŘÍLOHY
  // ============================================================================
  
  const fileInputRef = useRef(null);
  
  // Načtení příloh pro daný poplatek
  const loadAttachments = async (feeId) => {
    if (!token || !username) return;
    
    try {
      const result = await listAnnualFeeAttachments({ token, username, rocni_poplatek_id: feeId });
      if (result.success) {
        setAttachments(prev => ({ ...prev, [feeId]: result.data || [] }));
      }
    } catch (error) {
      console.error('Chyba při načítání příloh:', error);
    }
  };
  
  // Upload souboru
  const handleFileUpload = async (feeId, files) => {
    if (!files || files.length === 0) return;
    if (!canCreate && !canEdit) {
      showToast(formatToastMessage('⚠️ Nemáte oprávnění nahrávat přílohy', 'error'), { type: 'error' });
      return;
    }
    
    const file = files[0];
    
    // Validace typu
    if (!isAllowedAnnualFeeFileType(file.name)) {
      showToast(formatToastMessage('⚠️ Nepovolený typ souboru. Povolené: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, GIF, ZIP, RAR', 'error'), { type: 'error' });
      return;
    }
    
    // Validace velikosti (10 MB)
    if (!isAllowedAnnualFeeFileSize(file.size)) {
      showToast(formatToastMessage('⚠️ Soubor je příliš velký. Maximální velikost: 10 MB', 'error'), { type: 'error' });
      return;
    }
    
    // Nastavit uploading stav
    setUploadingAttachments(prev => new Set([...prev, feeId]));
    
    try {
      const result = await uploadAnnualFeeAttachment({ token, username, rocni_poplatek_id: feeId, file });
      
      if (result.success) {
        showToast(formatToastMessage('✅ Příloha byla úspěšně nahrána', 'success'), { type: 'success' });
        await loadAttachments(feeId);
      } else {
        showToast(formatToastMessage(`⚠️ ${result.message || 'Chyba při nahrávání přílohy'}`, 'error'), { type: 'error' });
      }
    } catch (error) {
      console.error('Chyba při uploadu přílohy:', error);
      showToast(formatToastMessage('⚠️ Chyba při nahrávání přílohy', 'error'), { type: 'error' });
    } finally {
      setUploadingAttachments(prev => {
        const newSet = new Set(prev);
        newSet.delete(feeId);
        return newSet;
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Stažení přílohy
  const handleDownloadAttachment = async (feeId, attachmentId, filename) => {
    if (!canView) {
      showToast(formatToastMessage('⚠️ Nemáte oprávnění stahovat přílohy', 'error'), { type: 'error' });
      return;
    }
    
    try {
      // Determine file type
      const extension = filename.split('.').pop().toLowerCase();
      let fileType = 'other';
      
      if (extension === 'pdf') {
        fileType = 'pdf';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
        fileType = 'image';
      }
      
      // For viewable files (PDF, images) open in viewer
      if (fileType === 'pdf' || fileType === 'image') {
        // Fetch soubor jako blob
        const BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');
        const response = await fetch(`${BASE_URL}/annual-fees/attachments/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            username,
            attachment_id: attachmentId
          }),
        });

        if (!response.ok) {
          throw new Error('Chyba při načítání souboru');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        setPdfViewer({
          visible: true,
          url,
          filename,
          fileType
        });
      } else {
        // Pro ostatní soubory standardní stažení
        await downloadAnnualFeeAttachment({ token, username, rocni_poplatek_id: feeId, attachment_id: attachmentId, filename });
      }
    } catch (error) {
      console.error('Chyba při stahování přílohy:', error);
      showToast(formatToastMessage('⚠️ Chyba při stahování přílohy', 'error'), { type: 'error' });
    }
  };
  
  // Smazání přílohy
  const handleDeleteAttachment = (feeId, attachmentId, filename) => {
    if (!canEdit) {
      showToast(formatToastMessage('⚠️ Nemáte oprávnění mazat přílohy', 'error'), { type: 'error' });
      return;
    }
    
    setDeleteAttachmentDialog({ isOpen: true, feeId, attachmentId, filename });
  };
  
  const handleConfirmDeleteAttachment = async () => {
    const { feeId, attachmentId } = deleteAttachmentDialog;
    setDeleteAttachmentDialog({ isOpen: false, feeId: null, attachmentId: null, filename: '' });
    
    try {
      const result = await deleteAnnualFeeAttachment({ token, username, rocni_poplatek_id: feeId, attachment_id: attachmentId });
      
      if (result.success) {
        showToast(formatToastMessage('🗑️ Příloha byla smazána', 'success'), { type: 'success' });
        await loadAttachments(feeId);
      } else {
        showToast(formatToastMessage(`⚠️ ${result.message || 'Chyba při mazání přílohy'}`, 'error'), { type: 'error' });
      }
    } catch (error) {
      console.error('Chyba při mazání přílohy:', error);
      showToast(formatToastMessage('⚠️ Chyba při mazání přílohy', 'error'), { type: 'error' });
    }
  };
  
  // Drag & Drop handlers
  const handleFileDragEnter = (e, feeId) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(prev => ({ ...prev, [feeId]: true }));
  };
  
  const handleFileDragLeave = (e, feeId) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(prev => ({ ...prev, [feeId]: false }));
  };
  
  const handleFileDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleFileDrop = (e, feeId) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(prev => ({ ...prev, [feeId]: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(feeId, files);
    }
  };
  
  // Otevřít file picker
  const openFilePicker = (feeId) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.feeId = feeId;
      fileInputRef.current.click();
    }
  };
  
  const handleFileInputChange = (e) => {
    const feeId = parseInt(e.target.dataset.feeId);
    const files = Array.from(e.target.files);
    if (files.length > 0 && feeId) {
      handleFileUpload(feeId, files);
    }
  };
  
  const searchSmlouvy = async (query) => {
    if (!query || query.length < 3) {
      setSmlouvySuggestions([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await universalSearch({
        query,
        categories: ['contracts'],
        limit: 10,
        archivovano: 0
      });
      
      const contracts = response?.categories?.contracts?.results || [];
      const activeContracts = contracts.filter(c => c.aktivni === 1);
      
      setSmlouvySuggestions(activeContracts);
      setShowSmlouvySuggestions(true);
    } catch (error) {
      console.error('Chyba při vyhledávání smluv:', error);
      setSmlouvySuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const searchFaktury = async (query) => {
    if (!query || query.length < 3) {
      setFakturySuggestions([]);
      return;
    }
    
    setIsSearchingFaktury(true);
    try {
      const response = await universalSearch({
        query,
        categories: ['invoices'],
        limit: 10,
        include_inactive: false  // ✅ Nabízet JEN aktivní faktury (aktivni = 1)
      });
      
      const invoices = response?.categories?.invoices?.results || [];
      
      // Filtruj pouze aktivní faktury
      // Backend už zajišťuje, že se nabízejí:
      // 1) Nepřiřazené faktury (smlouva_id IS NULL AND objednavka_id IS NULL)
      // 2) Faktury již přiřazené k ročním poplatkům (mají rocni_poplatek v rozsirujici_data)
      // Takže když editujeme položku s fakturou, ta se nabídne znovu
      const activeFaktury = invoices.filter(f => f.aktivni === 1 || f.aktivni === '1');
      
      setFakturySuggestions(activeFaktury);
      setShowFakturySuggestions(true);
    } catch (error) {
      console.error('Chyba při vyhledávání faktur:', error);
      setFakturySuggestions([]);
    } finally {
      setIsSearchingFaktury(false);
    }
  };
  
  const handleStartEditItem = (item, focusOnFaktura = false) => {
    setEditingItemId(item.id);
    
    // Pokud je to payment mode (tlačítko zaplatit), init datum na dnes
    const isPaymentMode = item._paymentMode || false;
    const initDatumZaplaceno = isPaymentMode && !item.datum_zaplaceno
      ? new Date().toISOString().split('T')[0]
      : (item.datum_zaplaceno || '');
    
    setEditItemData({
      nazev_polozky: item.nazev_polozky,
      datum_splatnosti: item.datum_splatnosti,
      castka: item.castka,
      cislo_dokladu: item.cislo_dokladu || '',
      datum_zaplaceno: initDatumZaplaceno,
      _paymentMode: isPaymentMode
    });
  };
  
  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditItemData({});
    setFakturySearch('');
    setFakturySuggestions([]);
    setShowFakturySuggestions(false);
    setShouldFocusFaktura(false);
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    const maxPages = isStatusFilterActive ? paginationInfo.totalPages : totalPages;
    if (newPage >= 1 && newPage <= maxPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      
      // Pro server-side pagination znovu načti data
      if (!isStatusFilterActive) {
        // Počkej na aktualizaci currentPage a pak načti data
        setTimeout(() => loadAnnualFees(newPage, pageSize), 10);
      }
      // Pro client-side pagination se data znovu načítají automaticky přes paginatedData computed property
    }
  };
  
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset na první stránku
  };

  // Generování stránek pro pagination
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    if (end - start + 1 < maxVisiblePages && start > 1) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };
  
  const handleSaveEditItem = async (itemId) => {
    try {
      const dataToSave = {...editItemData};
      
      // 🧹 Vyčistit prázdné datumové hodnoty (MySQL nechce prázdné stringy)
      if (dataToSave.datum_splatnosti === '') dataToSave.datum_splatnosti = null;
      if (dataToSave.datum_zaplaceno === '') dataToSave.datum_zaplaceno = null;
      
      // Pokud je payment mode, validovat a nastavit status
      if (dataToSave._paymentMode) {
        if (!dataToSave.cislo_dokladu || !dataToSave.cislo_dokladu.trim()) {
          showToast('Pro zaplacení je povinné číslo dokladu', 'error');
          return;
        }
        
        if (!dataToSave.datum_zaplaceno) {
          showToast('Pro zaplacení je povinné datum zaplacení', 'error');
          return;
        }
        
        // AŽ NYNÍ změnit status na ZAPLACENO
        dataToSave.stav = 'ZAPLACENO';
        dataToSave.datum_zaplaceni = dataToSave.datum_zaplaceno;
      }
      
      // Vyčistit interní flag
      delete dataToSave._paymentMode;
      
      await handleUpdateItem(itemId, dataToSave);
      setEditingItemId(null);
      setEditItemData({});
    } catch (error) {
      console.error('Chyba při ukládání položky:', error);
    }
  };
  
  const handleStartAddItem = (feeId) => {
    setAddingItemToFeeId(feeId);
    setNewItemData({
      nazev_polozky: '',
      datum_splatnosti: '',
      castka: ''
    });
  };
  
  const handleCancelAddItem = () => {
    setAddingItemToFeeId(null);
    setNewItemData({
      nazev_polozky: '',
      datum_splatnosti: '',
      castka: ''
    });
  };
  
  const handleSaveNewItem = async (feeId) => {
    if (!newItemData.nazev_polozky || !newItemData.datum_splatnosti || !newItemData.castka) {
      showToast(formatToastMessage('⚠️ Vyplňte poznámku, splatnost a částku', 'error'), { type: 'error' });
      return;
    }
    
    // Očistit částku od formátování
    const castkaStr = (newItemData.castka || '').toString().trim();
    const cleanCastka = castkaStr.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsedCastka = parseFloat(cleanCastka);
    
    if (isNaN(parsedCastka) || parsedCastka <= 0) {
      showToast(formatToastMessage('💰 Vyplňte platnou částku', 'error'), { type: 'error' });
      return;
    }
    
    try {
      const response = await createAnnualFeeItem({
        token,
        username,
        rocni_poplatek_id: feeId,
        nazev_polozky: newItemData.nazev_polozky,
        datum_splatnosti: newItemData.datum_splatnosti,
        castka: Math.round(parsedCastka * 100) / 100
        // Číslo dokladu a datum zaplacení se nenastavují - budou null/prázdné
      });
      
      if (response.status === 'success') {
        showToast(formatToastMessage('✅ Položka přidána', 'success'), { type: 'success' });
        handleCancelAddItem();
        loadAnnualFees();
      } else {
        showToast(formatToastMessage(`⚠️ ${response.message || 'Chyba při přidávání položky'}`, 'error'), { type: 'error' });
      }
    } catch (error) {
      console.error('Chyba při přidávání položky:', error);
      showToast(formatToastMessage('⚠️ Chyba při přidávání položky', 'error'), { type: 'error' });
    }
  };
  
  const handleSelectFaktura = (faktura) => {
    setEditItemData(prev => ({
      ...prev,
      faktura_id: faktura.id,
      faktura_cislo: faktura.fa_cislo_vema
    }));
    setFakturySearch(faktura.fa_cislo_vema);
    setShowFakturySuggestions(false);
  };
  
  // Select smlouva z autocomplete
  const handleSelectSmlouva = async (smlouva) => {
    try {
      // Načíst detail smlouvy pro dodavatele
      const detail = await getSmlouvaDetail({
        token,
        username,
        id: smlouva.id
      });
      
      setNewFeeData(prev => ({
        ...prev,
        smlouva_id: smlouva.id,
        smlouva_cislo: smlouva.cislo_smlouvy || '',
        dodavatel_nazev: detail.data?.nazev_firmy || smlouva.nazev_firmy || ''
      }));
      
      setSmlouvySearch(smlouva.cislo_smlouvy || '');
      setShowSmlouvySuggestions(false);
    } catch (error) {
      console.error('Chyba při načítání detailu smlouvy:', error);
      showToast(formatToastMessage('⚠️ Chyba při načítání detailu smlouvy', 'error'), { type: 'error' });
    }
  };
  
  // Close autocomplete při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (smlouvySearchRef.current && !smlouvySearchRef.current.contains(event.target)) {
        setShowSmlouvySuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Close faktury autocomplete při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fakturySearchRef.current && !fakturySearchRef.current.contains(event.target)) {
        setShowFakturySuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // CREATE handler
  const handleCreateAnnualFee = async () => {
    // Validace - názvu a základních polí (smlouva/dodavatel už není povinný)
    if (!newFeeData.nazev.trim()) {
      showToast(formatToastMessage('⚠️ Vyplňte název', 'error'), { type: 'error' });
      return;
    }
    if (!newFeeData.druh) {
      showToast(formatToastMessage('📂 Vyberte druh poplatku', 'error'), { type: 'error' });
      return;
    }
    if (!newFeeData.platba) {
      showToast(formatToastMessage('💳 Vyberte typ platby', 'error'), { type: 'error' });
      return;
    }
    
    // Očistit částku od formátování (mezery, čárky)
    const castkaStr = (newFeeData.castka || '').toString().trim();
    const cleanCastka = castkaStr.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsedCastka = parseFloat(cleanCastka);

    if (!castkaStr || castkaStr === '' || isNaN(parsedCastka) || parsedCastka <= 0) {
      showToast(formatToastMessage('💰 Vyplňte platnou částku (musí být větší než 0)', 'error'), { type: 'error' });
      return;
    }
    
    // Zaokrouhlení na 2 desetinná místa pro konzistenci
    const celkovaCastka = Math.round(parsedCastka * 100) / 100;
    
    // 🔔 Vygenerovat položky a zobrazit modal pro potvrzení
    const polozky = generatePolozkyLocal(
      newFeeData.platba,
      newFeeData.rok,
      celkovaCastka,
      newFeeData.datum_prvni_splatnosti
    );
    
    setGeneratedPolozky(polozky);
    setPendingFeeData({
      smlouva_id: newFeeData.smlouva_id,
      dodavatel_nazev: newFeeData.dodavatel_nazev,
      nazev: newFeeData.nazev,
      poznamka: newFeeData.poznamka,
      druh: newFeeData.druh,
      platba: newFeeData.platba,
      celkova_castka: celkovaCastka,
      rok: newFeeData.rok,
      datum_prvni_splatnosti: newFeeData.datum_prvni_splatnosti
    });
    setIsCreating(true);
    setShowPolozkyModal(true);
  };
  
  // UPDATE item handler
  const handleUpdateItem = async (itemId, data) => {
    try {
      // Automaticky aktualizovat stav podle data splatnosti (pokud není zaplaceno)
      let finalData = { ...data };
      if (finalData.stav !== 'ZAPLACENO') {
        const mockItem = {
          stav: finalData.stav || 'NEZAPLACENO',
          datum_splatnosti: finalData.datum_splatnosti || new Date().toISOString().split('T')[0]
        };
        const autoStatus = getItemStatusByDate(mockItem);
        finalData.stav = autoStatus;
      }
      
      const response = await updateAnnualFeeItem({
        token,
        username,
        id: itemId,
        data: finalData
      });
      
      if (response.status === 'success') {
        showToast(formatToastMessage('✅ Položka aktualizována', 'success'), { type: 'success' });
        
        // Najít ID hlavičky pro refresh
        const fee = annualFees.find(f => f.polozky && f.polozky.some(item => item.id === itemId));
        
        if (fee) {
          // Načíst aktualizovaný detail s přepočítanými hodnotami z BE
          const detail = await getAnnualFeeDetail({
            token,
            username,
            id: fee.id
          });
          
          if (detail.data) {
            // ✅ Aktualizovat celou hlavičku + položky z BE (má správné přepočítané hodnoty)
            // Vypočítat pocet_zaplaceno z položek
            const pocet_zaplaceno = (detail.data.polozky || []).filter(item => item.stav === 'ZAPLACENO').length;
            
            // Vypočítat pocet_po_splatnosti a pocet_blizi_se_splatnost pro aktualizaci badges
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const pocet_po_splatnosti = (detail.data.polozky || []).filter(item => {
              if (item.stav === 'ZAPLACENO') return false;
              const dueDate = new Date(item.datum_splatnosti);
              dueDate.setHours(0, 0, 0, 0);
              return dueDate < today;
            }).length;
            
            const pocet_blizi_se_splatnost = (detail.data.polozky || []).filter(item => {
              if (item.stav === 'ZAPLACENO') return false;
              const dueDate = new Date(item.datum_splatnosti);
              dueDate.setHours(0, 0, 0, 0);
              const dueSoonLimit = new Date(today);
              dueSoonLimit.setDate(today.getDate() + 10);
              // Blíží se splatnost: od dneška (včetně) do 10 dní dopředu (včetně)
              return dueDate >= today && dueDate <= dueSoonLimit;
            }).length;
            
            setAnnualFees(prev => prev.map(f => 
              f.id === fee.id ? { 
                ...f, 
                ...detail.data, 
                polozky: detail.data.polozky, 
                pocet_zaplaceno, 
                pocet_po_splatnosti, 
                pocet_blizi_se_splatnost 
              } : f
            ));
            
            // ✅ Refresh dashboard statistik po změně
            try {
              const statsResponse = await getAnnualFeesStats({
                token,
                username,
                rok: filters.rok !== 'all' ? filters.rok : undefined
              });
              
              if (statsResponse.status === 'success' && statsResponse.data?.dashboard) {
                setDashboardStats(statsResponse.data.dashboard);
              }
            } catch (statsError) {
              console.error('Chyba při aktualizaci dashboard statistik:', statsError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chyba při aktualizaci položky:', error);
      showToast(formatToastMessage(`⚠️ ${error.message || 'Chyba při aktualizaci položky'}`, 'error'), { type: 'error' });
    }
  };

  // DELETE item handler
  const handleDeleteItem = (itemId, itemNazev) => {
    setDeleteItemConfirmDialog({
      isOpen: true,
      itemId: itemId,
      itemName: itemNazev || 'Položka'
    });
  };
  
  // Potvrzeno smazání položky
  const handleConfirmDeleteItem = async () => {
    const { itemId } = deleteItemConfirmDialog;
    setDeleteItemConfirmDialog({ isOpen: false, itemId: null, itemName: '' });
    
    try {
      const response = await deleteAnnualFeeItem({
        token,
        username,
        id: itemId
      });
      
      if (response.status === 'success') {
        showToast(formatToastMessage('🗑️ Položka smazána', 'success'), { type: 'success' });
        
        // Najít ID hlavičky pro refresh
        const fee = annualFees.find(f => f.polozky && f.polozky.some(item => item.id === itemId));
        
        if (fee) {
          // Reload celého seznamu aby se aktualizovaly sumy
          loadAnnualFees();
        }
      }
    } catch (error) {
      console.error('Chyba při mazání položky:', error);
      showToast(formatToastMessage(`⚠️ ${error.message || 'Chyba při mazání položky'}`, 'error'), { type: 'error' });
    }
  };

  // State pro confirm dialog
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ isOpen: false, feeId: null, feeName: '' });
  
  // State pro confirm dialog položky
  const [deleteItemConfirmDialog, setDeleteItemConfirmDialog] = useState({ isOpen: false, itemId: null, itemName: '' });
  
  // State pro confirm dialog přílohy
  const [deleteAttachmentDialog, setDeleteAttachmentDialog] = useState({ isOpen: false, feeId: null, attachmentId: null, filename: '' });
  
  // State pro attachments tooltip popup
  const [attachmentsTooltip, setAttachmentsTooltip] = useState({ visible: false, feeId: null, position: { top: 0, left: 0 } });
  
  // State pro PDF viewer
  const [pdfViewer, setPdfViewer] = useState({ visible: false, url: '', filename: '', fileType: 'pdf' });
  
  // Cleanup PDF viewer URL on unmount
  useEffect(() => {
    return () => {
      if (pdfViewer.url && pdfViewer.url.startsWith('blob:')) {
        window.URL.revokeObjectURL(pdfViewer.url);
      }
    };
  }, [pdfViewer.url]);
  
  // DELETE handler - otevře confirm dialog
  const handleDeleteFee = (id, name) => {
    setDeleteConfirmDialog({
      isOpen: true,
      feeId: id,
      feeName: name || 'Roční poplatek'
    });
  };
  
  // Potvrzeno smazání
  const handleConfirmDelete = async () => {
    const { feeId } = deleteConfirmDialog;
    setDeleteConfirmDialog({ isOpen: false, feeId: null, feeName: '' });
    
    try {
      const response = await deleteAnnualFee({
        token,
        username,
        id: feeId
      });
      
      if (response.status === 'success') {
        showToast(formatToastMessage('🗑️ Roční poplatek smazán', 'success'), { type: 'success' });
        loadAnnualFees();
      }
    } catch (error) {
      console.error('Chyba při mazání poplatku:', error);
      showToast(formatToastMessage(`⚠️ ${error.message || 'Chyba při mazání poplatku'}`, 'error'), { type: 'error' });
    }
  };
  
  // Editace hlavního řádku (fee)
  const handleStartEditFee = (fee) => {
    setEditingFeeId(fee.id);
    setEditFeeData({
      nazev: fee.nazev,
      poznamka: fee.poznamka || '',
      celkova_castka: fee.celkova_castka,
      druh: fee.druh,
      platba: fee.platba,
      rok: fee.rok,
      dodavatel_nazev: fee.dodavatel_nazev || ''
    });
  };
  
  const handleCancelEditFee = () => {
    setEditingFeeId(null);
    setEditFeeData({});
  };
  
  const handleSaveEditFee = async (feeId) => {
    try {
      // Očistit celkovou částku od formátování
      const cleanData = {...editFeeData};
      if (cleanData.celkova_castka) {
        const castkaStr = cleanData.celkova_castka.toString().trim();
        const cleanCastka = castkaStr.replace(/[^\d,.-]/g, '').replace(',', '.');
        cleanData.celkova_castka = parseFloat(cleanCastka);
      }
      
      // Pokud je zadán dodavatel_nazev, uložit do rozsirujici_data
      if (cleanData.dodavatel_nazev) {
        cleanData.rozsirujici_data = {
          dodavatel_nazev: cleanData.dodavatel_nazev
        };
        delete cleanData.dodavatel_nazev; // Odebrat z přímého payloadu
      }
      
      // Odebrat smlouva_cislo - není editovatelné (vázáno na smlouvu)
      delete cleanData.smlouva_cislo;
      
      // Najít původní fee pro porovnání
      const originalFee = annualFees.find(f => f.id === feeId);
      const platbaChanged = cleanData.platba && cleanData.platba !== originalFee.platba;
      const castkaChanged = cleanData.celkova_castka && cleanData.celkova_castka !== originalFee.celkova_castka;

      // 🔔 Pokud se změnila platba nebo částka, načíst detail a zobrazit modal pro úpravu položek
      if (platbaChanged || castkaChanged) {
        console.log('🔧 Změna platby/částky detekována - načítám detail pro položky...', {
          platbaChanged,
          castkaChanged,
          feeId,
          originalFee: originalFee.nazev
        });
        
        // Načíst detail s položkami z BE
        const detail = await getAnnualFeeDetail({
          token,
          username,
          id: feeId
        });
        
        if (!detail?.data?.polozky) {
          console.error('❌ Nepodařilo se načíst detail nebo položky pro fee ID:', feeId);
          throw new Error('Nepodařilo se načíst stávající položky');
        }
        
        const existingPolozky = detail.data.polozky;
        console.log('✅ Načteno položek pro regeneraci:', existingPolozky.length);
        
        let polozky;
        if (platbaChanged) {
          // Pokud se změnila platba, vygenerovat nové položky
          polozky = generatePolozkyLocal(
            cleanData.platba || originalFee.platba,
            cleanData.rok || originalFee.rok,
            cleanData.celkova_castka || originalFee.celkova_castka,
            originalFee.datum_prvni_splatnosti || `${originalFee.rok}-01-01`
          );
        } else {
          // Pouze se změnila částka - zachovat existující položky a přepočítat částky
          const novaCastka = cleanData.celkova_castka || originalFee.celkova_castka;
          polozky = existingPolozky.map(polozka => ({
            ...polozka,
            castka: novaCastka / existingPolozky.length
          }));
        }
        
        setGeneratedPolozky(polozky);
        setPendingFeeData({
          ...cleanData,
          id: feeId
        });
        setIsCreating(false);
        setShowPolozkyModal(true);
      } else {
        // Žádná změna položek - uložit rovnou
        const response = await updateAnnualFee({
          token,
          username,
          id: feeId,
          data: cleanData
        });
        
        if (response.status === 'success') {
          showToast('Roční poplatek aktualizován', 'success');
          setEditingFeeId(null);
          setEditFeeData({});
          loadAnnualFees();
        }
      }
    } catch (error) {
      console.error('Chyba při aktualizaci poplatku:', error);
      showToast(formatToastMessage(`⚠️ ${error.message || 'Chyba při aktualizaci poplatku'}`, 'error'), { type: 'error' });
    }
  };
  
  // 🔔 Finální potvrzení z modalu - vytvoří/aktualizuje hlavní řádek + položky
  const handleConfirmPolozky = async () => {
    try {
      if (isCreating) {
        // CREATE - vytvořit nový roční poplatek
        const dataToSend = {
          token,
          username,
          ...pendingFeeData,
          polozky: generatedPolozky // Posíláme upravené položky
        };
        
        // 🔧 DEBUG: Výpis request payload do console
        const response = await createAnnualFee(dataToSend);
        
        if (response.status === 'success') {
          showToast(formatToastMessage('✅ Roční poplatek vytvořen', 'success'), { type: 'success' });
          
          // Reset form
          setNewFeeData({
            smlouva_id: null,
            smlouva_cislo: '',
            dodavatel_nazev: '',
            nazev: '',
            poznamka: '',
            druh: 'JINE',
            platba: 'MESICNI',
            castka: '',
            rok: new Date().getFullYear(),
            datum_prvni_splatnosti: `${new Date().getFullYear()}-01-01`
          });
          setSmlouvySearch('');
          setShowNewRow(false);
          setShowPolozkyModal(false);
          setGeneratedPolozky([]);
          setPendingFeeData(null);
          
          // Reload list
          loadAnnualFees();
        }
      } else {
        // UPDATE - aktualizovat existující roční poplatek
        const dataToUpdate = {
          token,
          username,
          id: pendingFeeData.id,
          data: {
            ...pendingFeeData,
            polozky: generatedPolozky // Posíláme upravené položky
          }
        };
        
        // 🔧 DEBUG: Výpis request payload do console
        const response = await updateAnnualFee(dataToUpdate);
        
        if (response.status === 'success') {
          showToast(formatToastMessage('✅ Roční poplatek aktualizován', 'success'), { type: 'success' });
          setEditingFeeId(null);
          setEditFeeData({});
          setShowPolozkyModal(false);
          setGeneratedPolozky([]);
          setPendingFeeData(null);
          loadAnnualFees();
        }
      }
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      showToast(formatToastMessage(`⚠️ ${error.message || 'Chyba při ukládání'}`, 'error'), { type: 'error' });
    }
  };
  
  const getInvoiceStatusText = (status) => {
    switch(status) {
      case 'ZAPLACENO': return 'Zaplaceno';
      case 'VECNA_SPRAVNOST': return 'Věcná správnost';
      case 'K_ZAPLACENI': return 'K zaplacení';
      case 'PREDANA_PO': return 'Předána PO';
      case 'PO_SPLATNOSTI': return 'Po splatnosti';
      case 'BLIZI_SE_SPLATNOST': return 'Blíží se splatnost';
      case 'ZAEVIDOVANA': return 'Zaevidována';
      case 'STORNO': return 'Storno';
      default: return status || '-';
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('cs-CZ');
  };
  
  // Pokud nemá právo VIEW, zobraz access denied screen
  if (!canView) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>🔒 Přístup odepřen</PageTitle>
        </PageHeader>
        <div style={{padding: '2rem', textAlign: 'center'}}>
          <p style={{fontSize: '1.1rem', color: '#6b7280', marginBottom: '1rem'}}>
            Nemáte oprávnění k zobrazení ročních poplatků.
          </p>
          <p style={{fontSize: '0.95rem', color: '#9ca3af'}}>
            Pro přístup kontaktujte administrátora systému.
          </p>
        </div>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={faMoneyBill} />
          Evidence ročních poplatků
          <span className="beta-badge">BETA</span>
        </PageTitle>
        {/* II. Tlačítko přesunuto do tabulky jako inline řádek */}
      </PageHeader>
      
      {/* Dashboard */}
      <DashboardContainer>
        <DashboardCard className="due-soon" style={{borderColor: '#ff9800'}}>
          <h3>Blíží se splatnost</h3>
          <div style={{fontSize: '20px', fontWeight: 'bold', color: '#ff9800'}}>
            {dashboardStats.dueSoon || 0}
          </div>
          <small>{dashboardStats.dueSoonAmount || '0'} Kč (do 10 dní)</small>
        </DashboardCard>
        <DashboardCard className="overdue">
          <h3>Po splatnosti</h3>
          <div style={{fontSize: '20px', fontWeight: 'bold', color: '#f44336'}}>
            {dashboardStats.overdue || 0}
          </div>
          <small>{dashboardStats.overdueAmount || '0'} Kč</small>
          {dashboardStats.overdue > 0 && (
            <>
              <span className="alert-icon-left">!</span>
              <span className="alert-icon">!</span>
            </>
          )}
        </DashboardCard>
        <DashboardCard>
          <h3>Platby v aktuálním měsíci</h3>
          <div style={{fontSize: '20px', fontWeight: 'bold', color: '#2196f3'}}>
            {dashboardStats.currentMonth || 0}
          </div>
          <small>{dashboardStats.currentMonthAmount || '0'} Kč</small>
        </DashboardCard>
        <DashboardCard>
          <h3>K zaplacení</h3>
          <div style={{fontSize: '20px', fontWeight: 'bold', color: '#ff9800'}}>
            {dashboardStats.totalToPay || '0'} Kč
          </div>
          <small>Nezaplacené položky</small>
        </DashboardCard>
        <DashboardCard>
          <h3>Zaplaceno</h3>
          <div style={{fontSize: '20px', fontWeight: 'bold', color: '#4caf50'}}>
            {dashboardStats.totalPaid || '0'} Kč
          </div>
          <small>Uhrazené platby</small>
        </DashboardCard>
        <DashboardCard>
          <h3>Celkem aktivních</h3>
          <div style={{fontSize: '20px', fontWeight: 'bold', color: '#607d8b'}}>
            {dashboardStats.totalActive || 0}
          </div>
          <small>{dashboardStats.totalActiveAmount || '0'} Kč</small>
        </DashboardCard>
      </DashboardContainer>

      <FiltersBar>
        <FilterGroup>
          <FilterLabel>Rok</FilterLabel>
          <Select 
            value={filters.rok} 
            onChange={(e) => handleFilterChange('rok', e.target.value)}
          >
            <option key="2026" value="2026">2026</option>
            <option key="2025" value="2025">2025</option>
            <option key="2024" value="2024">2024</option>
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Druh</FilterLabel>
          <Select 
            value={filters.druh} 
            onChange={(e) => handleFilterChange('druh', e.target.value)}
          >
            <option key="all" value="all">Vše</option>
            {druhy.map(d => (
              <option key={d.kod_stavu} value={d.kod_stavu}>{d.nazev_stavu}</option>
            ))}
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Typ platby</FilterLabel>
          <Select 
            value={filters.platba} 
            onChange={(e) => handleFilterChange('platba', e.target.value)}
          >
            <option key="all" value="all">Vše</option>
            {platby.map(p => (
              <option key={p.kod_stavu} value={p.kod_stavu}>{p.nazev_stavu}</option>
            ))}
          </Select>
        </FilterGroup>
        
        <FilterGroup>
          <FilterLabel>Stav</FilterLabel>
          <Select 
            value={filters.stav} 
            onChange={(e) => handleFilterChange('stav', e.target.value)}
          >
            <option key="all" value="all">Vše</option>
            <option key="ZAPLACENO" value="ZAPLACENO">Zaplaceno</option>
            <option key="NEZAPLACENO" value="NEZAPLACENO">Nezaplaceno</option>
            <option key="CASTECNE" value="CASTECNE">Částečně zaplaceno</option>
            <option key="_PO_SPLATNOSTI" value="_PO_SPLATNOSTI">Po splatnosti</option>
            <option key="_BLIZI_SE_SPLATNOST" value="_BLIZI_SE_SPLATNOST">Blíží se splatnost</option>
          </Select>
        </FilterGroup>
        
        <FilterGroup style={{ flex: 1, minWidth: '300px' }}>
          <FilterLabel>Fulltext vyhledávání</FilterLabel>
          <SearchInput 
            type="text"
            placeholder="Vyhledat ve všech polích..."
            value={fulltextSearch}
            onChange={(e) => handleFulltextSearchChange(e.target.value)}
          />
        </FilterGroup>
        
        <ClearAllButton 
          onClick={handleClearFilters}
          title="Zrušit všechny filtry a vyhledávání"
        >
          <FontAwesomeIcon icon={faEraser} />
          Vymazat filtry
        </ClearAllButton>
      </FiltersBar>
      
      {/* 📎 Hidden file input pro přílohy - globální pro všechny řádky */}
      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar"
      />
      
      {/* Expand/Collapse All tlačítka */}
      {filteredAnnualFees.length > 0 && (
        <div style={{display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'flex-end'}}>
          <Button
            variant="secondary"
            onClick={expandAll}
            style={{padding: '6px 12px', fontSize: '0.875rem'}}
            title="Rozbalit všechny podřádky"
          >
            <FontAwesomeIcon icon={faPlus} style={{marginRight: '6px'}} />
            Rozbalit vše
          </Button>
          <Button
            variant="secondary"
            onClick={collapseAll}
            style={{padding: '6px 12px', fontSize: '0.875rem'}}
            title="Sbalit všechny podřádky"
          >
            <FontAwesomeIcon icon={faMinus} style={{marginRight: '6px'}} />
            Sbalit vše
          </Button>
        </div>
      )}
      
      <TableContainer>
        {loading ? (
          <LoadingState>
            <div className="spinner"></div>
            <p>Načítání ročních poplatků...</p>
          </LoadingState>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th style={{width: '50px', textAlign: 'center'}}>
                  <ExpandCollapseButton
                    onClick={() => {
                      const allExpanded = Object.keys(expandedRows).length === filteredAnnualFees.length;
                      if (allExpanded) {
                        // Sbalit vše
                        collapseAll();
                      } else {
                        // Rozbalit vše (načte data z databáze)
                        expandAll();
                      }
                    }}
                    disabled={expandingAll}
                    title={expandingAll ? "Načítám detaily..." : (Object.keys(expandedRows).length === filteredAnnualFees.length ? "Sbalit všechny řádky" : "Rozbalit všechny řádky")}
                  >
                    {expandingAll ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      <FontAwesomeIcon 
                        icon={Object.keys(expandedRows).length === filteredAnnualFees.length ? faMinus : faPlus} 
                      />
                    )}
                  </ExpandCollapseButton>
                </Th>
                <Th style={{width: '100px'}}>
                  Rok
                </Th>
                <Th>Smlouva</Th>
                <Th>Dodavatel</Th>
                <Th>Název</Th>
                <Th>Druh / Platba</Th>
                <Th>Celková částka</Th>
                <Th>Zaplaceno</Th>
                <Th>Zbývá</Th>
                <Th>Položky</Th>
                <Th style={{textAlign: 'center'}}>Stav</Th>
                <Th>Zpracovatel</Th>
                <Th>Poznámka</Th>
                <Th style={{textAlign: 'center'}} title="Přílohy">📎</Th>
                <Th style={{textAlign: 'center'}}>Akce</Th>
              </tr>
            </Thead>
            <Tbody>
              {/* II. Inline řádek pro vytvoření nového ročního poplatku - pouze s právem CREATE */}
              {canCreate && !showNewRow && (
                <NewRowTr>
                  <Td colSpan="15" style={{textAlign: 'center', padding: '12px'}}>
                    <NewRowButton onClick={() => setShowNewRow(true)}>
                      <FontAwesomeIcon icon={faPlus} />
                      Nový roční poplatek
                    </NewRowButton>
                  </Td>
                </NewRowTr>
              )}
              
              {canCreate && showNewRow && (
                <NewRowTr>
                  <Td colSpan="2">
                    <InlineSelect
                      value={newFeeData.rok}
                      onChange={(e) => setNewFeeData(prev => ({...prev, rok: parseInt(e.target.value)}))}
                      style={{textAlign: 'right'}}
                    >
                      {Array.from({length: new Date().getFullYear() - 2026 + 1}, (_, i) => 2026 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </InlineSelect>
                  </Td>
                  <Td>
                    <SuggestionsWrapper ref={smlouvySearchRef}>
                      <InlineInput 
                        placeholder="Smlouva # (min 3 znaky)" 
                        value={smlouvySearch}
                        onChange={(e) => setSmlouvySearch(e.target.value)}
                        onFocus={() => smlouvySearch.length >= 3 && setShowSmlouvySuggestions(true)}
                        style={{paddingRight: smlouvySearch ? '2rem' : '0.5rem'}}
                      />
                      {smlouvySearch && (
                        <ClearButton
                          type="button"
                          onClick={() => {
                            setSmlouvySearch('');
                            setNewFeeData(prev => ({
                              ...prev,
                              smlouva_id: null,
                              smlouva_cislo: ''
                            }));
                            setShowSmlouvySuggestions(false);
                          }}
                          title="Vymazat smlouvu"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{fontSize: '0.875rem'}} />
                        </ClearButton>
                      )}
                      {showSmlouvySuggestions && smlouvySuggestions.length > 0 && (
                        <SuggestionsDropdown>
                          {isSearching && (
                            <SuggestionItem style={{textAlign: 'center', color: '#9ca3af'}}>
                              <FontAwesomeIcon icon={faSpinner} spin /> Vyhledávání...
                            </SuggestionItem>
                          )}
                          {!isSearching && smlouvySuggestions.map(smlouva => (
                            <SuggestionItem key={smlouva.id} onClick={() => handleSelectSmlouva(smlouva)}>
                              <SuggestionTitle>
                                <SuggestionBadge $color="#10b981" $textColor="white">SML</SuggestionBadge>
                                {smlouva.cislo_smlouvy}
                                {smlouva.hodnota_s_dph && (
                                  <SuggestionBadge $color="#fef3c7" $textColor="#92400e">
                                    {parseFloat(smlouva.hodnota_s_dph).toLocaleString('cs-CZ')} Kč
                                  </SuggestionBadge>
                                )}
                              </SuggestionTitle>
                              <SuggestionDetail>
                                {smlouva.nazev_smlouvy && <span><strong>Název:</strong> {smlouva.nazev_smlouvy}</span>}
                                {smlouva.nazev_firmy && (
                                  <span>
                                    <strong>{smlouva.nazev_firmy}</strong>
                                    {smlouva.ico && ` (IČO: ${smlouva.ico})`}
                                  </span>
                                )}
                              </SuggestionDetail>
                            </SuggestionItem>
                          ))}
                        </SuggestionsDropdown>
                      )}
                      {showSmlouvySuggestions && !isSearching && smlouvySearch.length >= 3 && smlouvySuggestions.length === 0 && (
                        <SuggestionsDropdown>
                          <SuggestionItem style={{textAlign: 'center', color: '#9ca3af'}}>
                            Žádné smlouvy nenalezeny
                          </SuggestionItem>
                        </SuggestionsDropdown>
                      )}
                    </SuggestionsWrapper>
                  </Td>
                  <Td>
                    <div style={{position: 'relative'}}>
                      <InlineInput 
                        placeholder={newFeeData.smlouva_id ? "Dodavatel (ze smlouvy)" : "Dodavatel (vyplňte ručně)"}
                        value={newFeeData.dodavatel_nazev}
                        onChange={(e) => setNewFeeData(prev => ({...prev, dodavatel_nazev: e.target.value}))}
                        disabled={!!newFeeData.smlouva_id}
                        style={{
                          background: newFeeData.smlouva_id ? '#f9fafb' : 'white',
                          paddingRight: (newFeeData.dodavatel_nazev && !newFeeData.smlouva_id) ? '2rem' : '0.5rem'
                        }}
                      />
                      {newFeeData.dodavatel_nazev && !newFeeData.smlouva_id && (
                        <ClearButton
                          type="button"
                          onClick={() => setNewFeeData(prev => ({...prev, dodavatel_nazev: ''}))}
                          title="Vymazat dodavatele"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{fontSize: '0.875rem'}} />
                        </ClearButton>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div style={{position: 'relative'}}>
                      <InlineInput 
                        placeholder="Název ročního poplatku" 
                        value={newFeeData.nazev}
                        onChange={(e) => setNewFeeData(prev => ({...prev, nazev: e.target.value}))}
                        style={{paddingRight: newFeeData.nazev ? '2rem' : '0.5rem'}}
                      />
                      {newFeeData.nazev && (
                        <ClearButton
                          type="button"
                          onClick={() => setNewFeeData(prev => ({...prev, nazev: ''}))}
                          title="Vymazat název"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{fontSize: '0.875rem'}} />
                        </ClearButton>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <InlineSelect 
                      value={newFeeData.druh}
                      onChange={(e) => setNewFeeData(prev => ({...prev, druh: e.target.value}))}
                      style={{marginBottom: '4px'}}
                    >
                      {druhy.map(d => (
                        <option key={d.kod_stavu} value={d.kod_stavu}>{d.nazev_stavu}</option>
                      ))}
                    </InlineSelect>
                    <InlineSelect 
                      value={newFeeData.platba}
                      onChange={(e) => setNewFeeData(prev => ({...prev, platba: e.target.value}))}
                    >
                      {platby.map(p => (
                        <option key={p.kod_stavu} value={p.kod_stavu}>
                          {p.nazev_stavu} {p.pocet_polozek && `(${p.pocet_polozek}x)`}
                        </option>
                      ))}
                    </InlineSelect>
                  </Td>
                  <Td>
                    <CurrencyInputWrapper>
                      <InlineInput 
                        placeholder="Celková částka" 
                        type="text" 
                        value={newFeeData.castka}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Povolit pouze číslice, čárku, tečku, mezery a mínus
                          const cleaned = value.replace(/[^\d,.\s-]/g, '');
                          setNewFeeData(prev => ({...prev, castka: cleaned}));
                        }}
                        onBlur={(e) => {
                          // Při blur formátovat hodnotu
                          const cleanValue = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.');
                          const numValue = parseFloat(cleanValue);
                          if (!isNaN(numValue)) {
                            const formatted = formatCurrency(numValue);
                            setNewFeeData(prev => ({...prev, castka: formatted}));
                          }
                        }}
                        onFocus={(e) => {
                          // Při focus odstranit formátování pro snadnější editaci
                          const cleanValue = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.');
                          const numValue = parseFloat(cleanValue);
                          if (!isNaN(numValue)) {
                            setNewFeeData(prev => ({...prev, castka: numValue.toFixed(2)}));
                          }
                        }}
                        style={{
                          paddingRight: newFeeData.castka ? '65px' : '40px',
                          textAlign: 'right'
                        }}
                      />
                      <CurrencySymbol>Kč</CurrencySymbol>
                    </CurrencyInputWrapper>
                  </Td>
                  <Td colSpan="5"></Td>
                  <Td>
                    <div style={{position: 'relative'}}>
                      <InlineInput
                        placeholder="Poznámka..."
                        value={newFeeData.poznamka}
                        onChange={(e) => setNewFeeData(prev => ({...prev, poznamka: e.target.value}))}
                        style={{
                          fontSize: '0.85rem',
                          paddingRight: newFeeData.poznamka ? '2rem' : '0.5rem'
                        }}
                      />
                      {newFeeData.poznamka && (
                        <ClearButton
                          type="button"
                          onClick={() => setNewFeeData(prev => ({...prev, poznamka: ''}))}
                          title="Vymazat poznámku"
                        >
                          <FontAwesomeIcon icon={faTimes} style={{fontSize: '0.875rem'}} />
                        </ClearButton>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                      <Button 
                        variant="primary" 
                        style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto'}}
                        onClick={handleCreateAnnualFee}
                        title="Uložit"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => { setShowNewRow(false); setSmlouvySearch(''); setShowSmlouvySuggestions(false); }} 
                        style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', color: '#ef4444', borderColor: '#ef4444'}}
                        title="Zrušit"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </Button>
                    </div>
                  </Td>
                </NewRowTr>
              )}
              
              {/* Existující řádky */}
              {paginatedData.map(fee => {
                const isEditingFee = editingFeeId === fee.id;
                const hasZaplaceno = fee.pocet_zaplaceno > 0;
                const hasOverdueItems = fee.pocet_po_splatnosti > 0;
                const hasDueSoonItems = fee.pocet_blizi_se_splatnost > 0;
                
                // Zkontroluj zda jsou všechny podpoložky zaplacené podle počtů z API
                const allItemsPaid = fee.pocet_polozek > 0 && fee.pocet_zaplaceno === fee.pocet_polozek;
                
                // Priorita barev: zelená (vše zaplaceno) > červená (po splatnosti) > oranžová (blíží se splatnost)
                let rowBackgroundColor = undefined;
                if (allItemsPaid) {
                  rowBackgroundColor = '#dcfce7'; // Světle zelená - vše zaplaceno
                } else if (hasOverdueItems) {
                  rowBackgroundColor = '#ffebee'; // Světle červená
                } else if (hasDueSoonItems) {
                  rowBackgroundColor = '#fff3e0'; // Světle oranžová
                }
                return (
                <React.Fragment key={fee.id}>
                  <Tr 
                    clickable={!isEditingFee} 
                    onClick={() => !isEditingFee && toggleRow(fee.id)}
                    style={{
                      backgroundColor: rowBackgroundColor
                    }}
                  >
                    <Td>
                      {!isEditingFee && (
                        <div style={{position: 'relative', display: 'inline-block'}}>
                          <ExpandButton title={expandedRows[fee.id] ? 'Sbalit' : 'Rozbalit'}>
                            <FontAwesomeIcon icon={expandedRows[fee.id] ? faMinus : faPlus} />
                            {(() => {
                              const badgeInfo = getBadgeInfo(fee);
                              if (!badgeInfo.hasAny) return null;
                              
                              return (
                                <>
                                  {/* Červené číslo po splatnosti - pravý horní roh */}
                                  {badgeInfo.overdue > 0 && (
                                    <Badge style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      backgroundColor: '#f44336',
                                      color: 'white',
                                      borderRadius: '50%',
                                      width: '16px',
                                      height: '16px',
                                      fontSize: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 'bold',
                                      lineHeight: '1',
                                      zIndex: 2
                                    }}>
                                      {badgeInfo.overdue}
                                    </Badge>
                                  )}
                                  
                                  {/* Oranžové číslo blíží se splatnost - pravý dolní roh */}
                                  {badgeInfo.dueSoon > 0 && (
                                    <Badge style={{
                                      position: 'absolute',
                                      bottom: '-6px',
                                      right: '-6px',
                                      backgroundColor: '#ff9800',
                                      color: 'white',
                                      borderRadius: '50%',
                                      width: '16px',
                                      height: '16px',
                                      fontSize: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 'bold',
                                      lineHeight: '1',
                                      zIndex: 2
                                    }}>
                                      {badgeInfo.dueSoon}
                                    </Badge>
                                  )}
                                </>
                              );
                            })()}
                          </ExpandButton>
                        </div>
                      )}
                    </Td>
                    <Td>
                      {isEditingFee ? (
                        <InlineSelect
                          value={editFeeData.rok || new Date().getFullYear()}
                          onChange={(e) => setEditFeeData(prev => ({...prev, rok: parseInt(e.target.value)}))}
                          style={{minWidth: '80px'}}
                        >
                          {Array.from({length: new Date().getFullYear() - 2026 + 1}, (_, i) => 2026 + i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </InlineSelect>
                      ) : (
                        <strong>{fee.rok}</strong>
                      )}
                    </Td>
                    <Td>
                      <strong>{highlightSearchTerm(fee.smlouva_cislo || '', debouncedFulltext)}</strong>
                    </Td>
                    <Td>
                      {isEditingFee ? (
                        <InlineInput
                          value={editFeeData.dodavatel_nazev || ''}
                          onChange={(e) => setEditFeeData(prev => ({...prev, dodavatel_nazev: e.target.value}))}
                          style={{fontSize: '0.85rem'}}
                          placeholder="Název dodavatele"
                        />
                      ) : (
                        highlightSearchTerm(fee.dodavatel_nazev || '', debouncedFulltext)
                      )}
                    </Td>
                    <Td>
                      {isEditingFee ? (
                        <InlineInput
                          value={editFeeData.nazev || ''}
                          onChange={(e) => setEditFeeData(prev => ({...prev, nazev: e.target.value}))}
                          style={{fontSize: '0.85rem'}}
                          placeholder="Název"
                        />
                      ) : (
                        highlightSearchTerm(fee.nazev || '', debouncedFulltext)
                      )}
                    </Td>
                    <Td>
                      {isEditingFee ? (
                        <>
                          <InlineSelect
                            value={editFeeData.druh || ''}
                            onChange={(e) => setEditFeeData(prev => ({...prev, druh: e.target.value}))}
                            style={{fontSize: '0.85rem', marginBottom: '4px'}}
                          >
                            <option value="">Vyberte druh</option>
                            {druhy.map(d => (
                              <option key={d.kod_stavu || d.kod} value={d.kod_stavu || d.kod}>{d.nazev_stavu || d.nazev}</option>
                            ))}
                          </InlineSelect>
                          <InlineSelect
                            value={editFeeData.platba || ''}
                            onChange={(e) => setEditFeeData(prev => ({...prev, platba: e.target.value}))}
                            style={{fontSize: '0.85rem'}}
                          >
                            <option value="">Vyberte platbu</option>
                            {platby.map(p => (
                              <option key={p.kod_stavu || p.kod} value={p.kod_stavu || p.kod}>{p.nazev_stavu || p.nazev}</option>
                            ))}
                          </InlineSelect>
                        </>
                      ) : (
                        <>
                          <div>{highlightSearchTerm(fee.druh_nazev || '', debouncedFulltext)}</div>
                          <div style={{fontSize: '0.85rem', color: '#9ca3af'}}>{highlightSearchTerm(fee.platba_nazev || '', debouncedFulltext)}</div>
                        </>
                      )}
                    </Td>
                    <Td style={{textAlign: 'right'}}>
                      {isEditingFee ? (
                        <CurrencyInput
                          value={editFeeData.celkova_castka || ''}
                          onChange={(val) => setEditFeeData(prev => ({...prev, celkova_castka: val}))}
                        />
                      ) : (
                        <>
                          <strong>{formatCurrency(fee.celkova_castka)} Kč</strong>
                          {fee.pocet_polozek > 0 && fee.stav !== 'ZAPLACENO' && (
                            <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '2px'}}>
                              {formatCurrency(fee.celkova_castka / fee.pocet_polozek)} Kč/{fee.platba === 'MESICNI' ? 'měsíc' : fee.platba === 'KVARTALNI' ? 'Q' : 'rok'}
                            </div>
                          )}
                        </>
                      )}
                    </Td>
                    <Td style={{color: '#10b981', textAlign: 'right'}}>{formatCurrency(fee.zaplaceno_celkem)} Kč</Td>
                    <Td style={{color: '#ef4444', textAlign: 'right'}}>{formatCurrency(fee.zbyva_zaplatit)} Kč</Td>
                    <Td>
                      {fee.pocet_zaplaceno}/{fee.pocet_polozek}
                    </Td>
                    <Td style={{textAlign: 'center'}}>
                      <StatusBadge status={fee.stav}>
                        {fee.stav === 'ZAPLACENO' && <FontAwesomeIcon icon={faCheckCircle} />}
                        {fee.stav === 'PO_SPLATNOSTI' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                        {highlightSearchTerm(fee.stav_nazev || '', debouncedFulltext)}
                      </StatusBadge>
                    </Td>
                    <Td style={{fontSize: '0.75rem', color: '#1f2937', lineHeight: '1.3'}}>
                      {fee.aktualizoval_jmeno || fee.vytvoril_jmeno || fee.dt_aktualizace || fee.dt_vytvoreni ? (
                        <div>
                          <div>
                            {fee.aktualizoval_jmeno ? (
                              highlightSearchTerm(`${fee.aktualizoval_jmeno} ${fee.aktualizoval_prijmeni || ''}`, debouncedFulltext)
                            ) : fee.vytvoril_jmeno ? (
                              highlightSearchTerm(`${fee.vytvoril_jmeno} ${fee.vytvoril_prijmeni || ''}`, debouncedFulltext)
                            ) : ''}
                          </div>
                          <div>{formatDate(fee.dt_aktualizace || fee.dt_vytvoreni)}</div>
                        </div>
                      ) : (
                        <span style={{color: '#9ca3af'}}>-</span>
                      )}
                    </Td>
                    <Td style={{fontSize: '0.85rem', color: '#6b7280'}}>
                      {isEditingFee ? (
                        <InlineInput
                          value={editFeeData.poznamka || ''}
                          onChange={(e) => setEditFeeData(prev => ({...prev, poznamka: e.target.value}))}
                          style={{fontSize: '0.85rem'}}
                          placeholder="Poznámka"
                        />
                      ) : (
                        fee.poznamka ? (
                          <div style={{color: '#6b7280'}}>{highlightSearchTerm(fee.poznamka, debouncedFulltext)}</div>
                        ) : '-'
                      )}
                    </Td>
                    <Td style={{textAlign: 'center'}}>
                      <span 
                        style={{cursor: 'pointer'}} 
                        title={`${attachments[fee.id]?.length || 0} příloha/y - klikněte pro zobrazení`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setAttachmentsTooltip({
                            visible: true,
                            feeId: fee.id,
                            position: {
                              top: rect.bottom + window.scrollY + 8,
                              left: Math.min(rect.left + window.scrollX, window.innerWidth - 320)
                            }
                          });
                        }}
                      >
                        <Paperclip size={16} style={{marginRight: '4px', color: attachments[fee.id]?.length > 0 ? '#3b82f6' : '#cbd5e1'}} />
                        <span style={{fontSize: '0.875rem', color: '#64748b'}}>{attachments[fee.id]?.length || 0}</span>
                      </span>
                    </Td>
                    <Td>
                      <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                        {isEditingFee ? (
                          <>
                            <Button 
                              variant="secondary" 
                              style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', background: '#10b981', color: 'white', borderColor: '#10b981'}}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEditFee(fee.id);
                              }}
                              title="Uložit změny"
                            >
                              <FontAwesomeIcon icon={faCheckCircle} />
                            </Button>
                            <Button 
                              variant="secondary" 
                              style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', color: '#ef4444', borderColor: '#ef4444'}}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEditFee();
                              }}
                              title="Zrušit"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </Button>
                          </>
                        ) : (
                          <>
                            {/* Tlačítko EDIT - pouze s právem EDIT */}
                            {canEdit && (
                              <Button 
                                variant="secondary" 
                                style={{
                                  padding: '6px 10px', 
                                  fontSize: '0.85rem', 
                                  minWidth: 'auto',
                                  opacity: hasZaplaceno ? 0.5 : 1,
                                  cursor: hasZaplaceno ? 'not-allowed' : 'pointer'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!hasZaplaceno) {
                                    handleStartEditFee(fee);
                                  }
                                }}
                                disabled={hasZaplaceno}
                                title={hasZaplaceno ? 'Nelze editovat - již jsou zaplacené položky' : 'Upravit roční poplatek'}
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </Button>
                            )}
                            {/* Tlačítko DELETE - pouze s právem DELETE (+ EDIT) */}
                            {canDelete && (
                              <Button 
                                variant="secondary" 
                                style={{
                                  padding: '6px 10px', 
                                  fontSize: '0.85rem', 
                                  minWidth: 'auto', 
                                  color: '#ef4444', 
                                  borderColor: '#ef4444',
                                  opacity: hasZaplaceno ? 0.5 : 1,
                                  cursor: hasZaplaceno ? 'not-allowed' : 'pointer'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!hasZaplaceno) {
                                    handleDeleteFee(fee.id, fee.nazev);
                                  }
                                }}
                                disabled={hasZaplaceno}
                                title={hasZaplaceno ? 'Nelze smazat - již jsou zaplacené položky' : 'Smazat roční poplatek'}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                  
                  {expandedRows[fee.id] && fee.polozky && (
                    <SubItemsContainer>
                      {/* Prázdné buňky pro odsazení - zarovnání pod sloupec "Název" */}
                      <Td style={{border: 'none', background: '#f9fafb'}}></Td>
                      <Td style={{border: 'none', background: '#f9fafb'}}></Td>
                      
                      {/* 📎 DROPZONE PRO PŘÍLOHY - VLEVO */}
                      <Td colSpan="4" style={{verticalAlign: 'top', padding: '16px', background: '#f9fafb'}}>
                        <AttachmentsContainer>
                          <AttachmentsHeader>
                            <Paperclip size={18} />
                            <span>Přílohy ({attachments[fee.id]?.length || 0})</span>
                          </AttachmentsHeader>
                          
                          {/* Dropzone */}
                          {canView && (
                            <DropZone
                              $isDragging={isDragging[fee.id] || false}
                              onClick={(e) => {
                                e.stopPropagation();
                                openFilePicker(fee.id);
                              }}
                              onDragEnter={(e) => handleFileDragEnter(e, fee.id)}
                              onDragLeave={(e) => handleFileDragLeave(e, fee.id)}
                              onDragOver={handleFileDragOver}
                              onDrop={(e) => handleFileDrop(e, fee.id)}
                            >
                              <DropZoneContent>
                                <DropZoneIcon $isDragging={isDragging[fee.id] || false}>
                                  {uploadingAttachments.has(fee.id) ? (
                                    '⏳'
                                  ) : (
                                    <Upload size={32} />
                                  )}
                                </DropZoneIcon>
                                <DropZoneText>
                                  {uploadingAttachments.has(fee.id) 
                                    ? 'Nahrávám...' 
                                    : 'Klikněte nebo přetáhněte soubor'}
                                </DropZoneText>
                                <DropZoneText style={{fontSize: '0.75rem', marginTop: '4px'}}>
                                  Max 10 MB • PDF, DOC, XLS, obrázky, ZIP
                                </DropZoneText>
                              </DropZoneContent>
                            </DropZone>
                          )}
                          
                          {/* Seznam příloh */}
                          {attachments[fee.id] && attachments[fee.id].length > 0 && (
                            <AttachmentsList>
                              {attachments[fee.id].map(att => {
                                const extension = att.systemova_cesta?.split('.').pop()?.toLowerCase();
                                const fileIcon = extension === 'pdf' ? '📄' :
                                               ['jpg', 'jpeg', 'png', 'gif'].includes(extension) ? '🖼️' :
                                               ['doc', 'docx'].includes(extension) ? '📝' :
                                               ['xls', 'xlsx'].includes(extension) ? '📊' :
                                               ['zip', 'rar'].includes(extension) ? '📦' : '📎';
                                
                                return (
                                  <AttachmentItem key={att.id}>
                                    <AttachmentIcon>{fileIcon}</AttachmentIcon>
                                    <AttachmentInfo>
                                      <AttachmentName title={att.originalni_nazev_souboru}>
                                        {att.originalni_nazev_souboru}
                                      </AttachmentName>
                                      <AttachmentMeta>
                                        {formatFileSize(att.velikost_souboru_b)} • {att.dt_vytvoreni ? new Date(att.dt_vytvoreni).toLocaleDateString('cs-CZ') : ''}
                                      </AttachmentMeta>
                                    </AttachmentInfo>
                                    <AttachmentActions>
                                      <AttachmentButton
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadAttachment(fee.id, att.id, att.originalni_nazev_souboru);
                                        }}
                                        title="Stáhnout"
                                      >
                                        <Download size={14} />
                                      </AttachmentButton>
                                      {canEdit && (
                                        <AttachmentButton
                                          $danger
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteAttachment(fee.id, att.id, att.originalni_nazev_souboru);
                                          }}
                                          title="Smazat"
                                        >
                                          <Trash2 size={14} />
                                        </AttachmentButton>
                                      )}
                                    </AttachmentActions>
                                  </AttachmentItem>
                                );
                              })}
                            </AttachmentsList>
                          )}
                        </AttachmentsContainer>
                      </Td>
                      
                      {/* POLOŽKY - VPRAVO */}
                      <SubItemsWrapper colSpan="9">
                        <SubItemsTable>
                          <thead>
                            <tr>
                              <Th indent colSpan="4" style={{background: '#f3f4f6'}}>Poznámka</Th>
                              <Th style={{background: '#f3f4f6'}}>Splatnost</Th>
                              <Th style={{background: '#f3f4f6'}}>Částka</Th>
                              <Th style={{background: '#f3f4f6', width: '140px'}}>Číslo dokladu</Th>
                              <Th style={{background: '#f3f4f6', width: '130px'}}>Zaplaceno</Th>
                              <Th style={{background: '#f3f4f6', textAlign: 'center'}}>Stav</Th>
                              <Th style={{background: '#f3f4f6', width: '120px', fontSize: '0.75rem'}}>Aktualizoval</Th>
                              <Th style={{background: '#f3f4f6', textAlign: 'center'}}>Akce</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {fee.polozky.map((item, itemIndex) => {
                              const isEditing = editingItemId === item.id;
                              // Kontrola, zda lze položku zaplatit (všechny předchozí musí být zaplacené)
                              const canPay = fee.polozky
                                .slice(0, itemIndex)
                                .every(prevItem => prevItem.stav === 'ZAPLACENO');
                              // Kontrola, zda lze zrušit platbu (žádná následující nesmí být zaplacená)
                              const canUndo = fee.polozky
                                .slice(itemIndex + 1)
                                .every(nextItem => nextItem.stav !== 'ZAPLACENO');
                              return (
                              <SubItemRow 
                                key={item.id}
                                style={{
                                  backgroundColor: item.stav === 'ZAPLACENO' ? '#dcfce7' : // Světle zelená pro zaplacené
                                                 isItemOverdue(item) ? '#ffcccb' : 
                                                 isItemDueSoon(item) ? '#ffe0b3' : undefined
                                }}
                              >
                                {/* Poznámka */}
                                <SubItemCell indent colSpan="4">
                                  {isEditing ? (
                                    editItemData._paymentMode ? (
                                      <strong style={{color: '#6b7280'}}>{item.nazev_polozky}</strong>
                                    ) : (
                                      <InlineInput 
                                        value={editItemData.nazev_polozky || ''}
                                        onChange={(e) => setEditItemData(prev => ({...prev, nazev_polozky: e.target.value}))}
                                        style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%'}}
                                        placeholder="Poznámka"
                                      />
                                    )
                                  ) : (
                                    <strong>{highlightSearchTerm(item.nazev_polozky || '', debouncedFulltext)}</strong>
                                  )}
                                </SubItemCell>
                                
                                {/* Splatnost */}
                                <SubItemCell>
                                  {isEditing ? (
                                    editItemData._paymentMode ? (
                                      <span style={{color: '#6b7280'}}>{formatDate(item.datum_splatnosti)}</span>
                                    ) : (
                                      <div style={{maxWidth: '130px'}}>
                                        <DateWithArrowContainer>
                                          <DatePicker
                                            value={editItemData.datum_splatnosti || ''}
                                            onChange={(date) => setEditItemData(prev => ({...prev, datum_splatnosti: date}))}
                                            placeholder="dd.mm.rrrr"
                                            variant="compact"
                                            style={{width: '105px'}}
                                          />
                                          <ArrowButton
                                            onClick={async () => {
                                              const currentItemIndex = fee.polozky.findIndex(p => p.id === item.id);
                                              
                                              // Použít aktuální datum z editace nebo z položky
                                              const currentDate = editItemData.datum_splatnosti || item.datum_splatnosti;
                                              
                                              // Nejprve uložit aktuálně editované datum, pak aktualizovat ostatní
                                              if (editItemData.datum_splatnosti && editItemData.datum_splatnosti !== item.datum_splatnosti) {
                                                // Uložit aktuální editaci nejprve
                                                await handleUpdateItem(item.id, { datum_splatnosti: editItemData.datum_splatnosti });
                                              }
                                              
                                              // Pak aktualizovat následující data s ukládáním do DB
                                              updateExistingDatesFromIndex(currentItemIndex, fee, setAnnualFees, currentDate, true);
                                            }}
                                            title={`Aktualizovat data níže podle periody platby (${fee.platba})`}
                                          >
                                            <FontAwesomeIcon icon={faArrowDown} size="sm" />
                                          </ArrowButton>
                                        </DateWithArrowContainer>
                                      </div>
                                    )
                                  ) : (
                                    formatDate(item.datum_splatnosti)
                                  )}
                                </SubItemCell>
                                
                                {/* Částka */}
                                <SubItemCell>
                                  {isEditing ? (
                                    editItemData._paymentMode ? (
                                      <span style={{color: '#6b7280'}}>{formatCurrency(item.castka)} Kč</span>
                                    ) : (
                                      <div style={{maxWidth: '120px'}}>
                                        <CurrencyInput
                                          value={editItemData.castka || ''}
                                          onChange={(val) => setEditItemData(prev => ({...prev, castka: val}))}
                                          placeholder="0,00"
                                        />
                                      </div>
                                    )
                                  ) : (
                                    <>{formatCurrency(item.castka)} Kč</>
                                  )}
                                </SubItemCell>
                                
                                {/* Číslo dokladu (VEMA) */}
                                <SubItemCell>
                                  {isEditing ? (
                                    <InlineInput 
                                      value={editItemData.cislo_dokladu || ''}
                                      onChange={(e) => setEditItemData(prev => ({...prev, cislo_dokladu: e.target.value}))}
                                      style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%', maxWidth: '130px'}}
                                      placeholder="Číslo dokladu"
                                    />
                                  ) : (
                                    item.cislo_dokladu ? 
                                      highlightSearchTerm(item.cislo_dokladu, debouncedFulltext) : 
                                      <span style={{color: '#9ca3af'}}>-</span>
                                  )}
                                </SubItemCell>
                                
                                {/* Datum zaplaceno */}
                                <SubItemCell>
                                  {isEditing ? (
                                    editItemData._paymentMode ? (
                                      <div style={{maxWidth: '130px'}}>
                                        <DatePicker
                                          value={editItemData.datum_zaplaceno || ''}
                                          onChange={(date) => setEditItemData(prev => ({...prev, datum_zaplaceno: date}))}
                                          placeholder="dd.mm.rrrr"
                                          variant="compact"
                                        />
                                      </div>
                                    ) : (
                                      <span style={{color: '#9ca3af'}}>-</span>
                                    )
                                  ) : (
                                    formatDate(item.datum_zaplaceno)
                                  )}
                                </SubItemCell>
                                
                                {/* Stav */}
                                <SubItemCell style={{textAlign: 'center'}}>
                                  <StatusBadge status={item.stav} style={{fontSize: '0.85rem'}}>
                                    {item.stav === 'ZAPLACENO' ? (
                                      <><FontAwesomeIcon icon={faCheckCircle} /> {highlightSearchTerm('Zaplaceno', debouncedFulltext)}</>
                                    ) : highlightSearchTerm('Nezaplaceno', debouncedFulltext)}
                                  </StatusBadge>
                                </SubItemCell>
                                
                                {/* Aktualizoval - jméno + datum na dva řádky */}
                                <SubItemCell style={{fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.3'}}>
                                  {item.aktualizoval_jmeno || item.dt_aktualizace ? (
                                    <div>
                                      <div>{highlightSearchTerm(`${item.aktualizoval_jmeno || ''} ${item.aktualizoval_prijmeni || ''}`.trim(), debouncedFulltext)}</div>
                                      <div>{formatDate(item.dt_aktualizace)}</div>
                                    </div>
                                  ) : (
                                    <span style={{color: '#9ca3af'}}>-</span>
                                  )}
                                </SubItemCell>
                                
                                {/* Akce */}
                                <SubItemCell>
                                  <div style={{display: 'flex', gap: '6px', justifyContent: 'flex-end'}}>
                                    {isEditing ? (
                                      <>
                                        <Button 
                                          variant="secondary" 
                                          style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', background: '#10b981', color: 'white', borderColor: '#10b981'}}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveEditItem(item.id);
                                          }}
                                          title="Uložit změny"
                                        >
                                          <FontAwesomeIcon icon={faCheckCircle} />
                                        </Button>
                                        <Button 
                                          variant="secondary" 
                                          style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', color: '#ef4444', borderColor: '#ef4444'}}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelEditItem();
                                          }}
                                          title="Zrušit"
                                        >
                                          <FontAwesomeIcon icon={faTimes} />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        {item.stav === 'ZAPLACENO' ? (
                                          <Button 
                                            variant="secondary" 
                                            style={{
                                              padding: '6px 10px', 
                                              fontSize: '0.85rem', 
                                              minWidth: 'auto', 
                                              background: canUndo ? '#f59e0b' : '#9ca3af', 
                                              color: 'white', 
                                              borderColor: canUndo ? '#f59e0b' : '#9ca3af',
                                              opacity: canUndo ? 1 : 0.6,
                                              cursor: canUndo ? 'pointer' : 'not-allowed'
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!canUndo) return;
                                              // Při zrušení platby automaticky určit stav podle data splatnosti
                                              const mockItem = {
                                                stav: 'NEZAPLACENO',
                                                datum_splatnosti: item.datum_splatnosti
                                              };
                                              const autoStatus = getItemStatusByDate(mockItem);
                                              handleUpdateItem(item.id, { 
                                                stav: autoStatus, 
                                                datum_zaplaceni: null,
                                                datum_zaplaceno: null,
                                                faktura_id: null
                                              });
                                            }}
                                            title={canUndo ? 'Vrátit na nezaplaceno' : 'Nejdříve zrušte platbu u následujících položek'}
                                            disabled={!canUndo}
                                          >
                                            <FontAwesomeIcon icon={faUndo} />
                                          </Button>
                                        ) : (
                                          <Button 
                                            variant="secondary" 
                                            style={{
                                              padding: '6px 10px', 
                                              fontSize: '0.85rem', 
                                              minWidth: 'auto', 
                                              background: canPay ? '#10b981' : '#9ca3af', 
                                              color: 'white', 
                                              borderColor: canPay ? '#10b981' : '#9ca3af',
                                              opacity: canPay ? 1 : 0.6,
                                              cursor: canPay ? 'pointer' : 'not-allowed'
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!canPay) return;
                                              // Otevřít edit režim s příznakem, že chceme zaplatit
                                              const itemForPayment = {...item, _paymentMode: true};
                                              handleStartEditItem(itemForPayment);
                                            }}
                                            title={canPay ? 'Označit jako zaplaceno' : 'Nejdříve zaplaťte předchozí položky'}
                                            disabled={!canPay}
                                          >
                                            <FontAwesomeIcon icon={faMoneyBill} />
                                          </Button>
                                        )}
                                        <Button 
                                          variant="secondary" 
                                          style={{
                                            padding: '6px 10px', 
                                            fontSize: '0.85rem', 
                                            minWidth: 'auto',
                                            opacity: item.stav === 'ZAPLACENO' ? 0.4 : 1,
                                            cursor: item.stav === 'ZAPLACENO' ? 'not-allowed' : 'pointer'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.stav !== 'ZAPLACENO') {
                                              handleStartEditItem(item);
                                            }
                                          }}
                                          title={item.stav === 'ZAPLACENO' ? 'Pro editaci nejdříve zrušte zaplacení' : 'Upravit položku'}
                                          disabled={item.stav === 'ZAPLACENO'}
                                        >
                                          <FontAwesomeIcon icon={faEdit} />
                                        </Button>
                                        <Button 
                                          variant="secondary" 
                                          style={{
                                            padding: '6px 10px', 
                                            fontSize: '0.85rem', 
                                            minWidth: 'auto',
                                            color: item.stav === 'ZAPLACENO' ? '#9ca3af' : '#ef4444',
                                            borderColor: item.stav === 'ZAPLACENO' ? '#9ca3af' : '#ef4444',
                                            opacity: item.stav === 'ZAPLACENO' ? 0.4 : 1,
                                            cursor: item.stav === 'ZAPLACENO' ? 'not-allowed' : 'pointer'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.stav !== 'ZAPLACENO') {
                                              handleDeleteItem(item.id, item.nazev_polozky);
                                            }
                                          }}
                                          title={item.stav === 'ZAPLACENO' ? 'Nelze smazat zaplacenou položku' : 'Smazat položku'}
                                          disabled={item.stav === 'ZAPLACENO'}
                                        >
                                          <FontAwesomeIcon icon={faTrash} />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </SubItemCell>
                              </SubItemRow>
                              );
                            })}
                            
                            {/* Řádek pro přidání nové položky */}
                            {addingItemToFeeId === fee.id && (
                              <SubItemRow>
                                {/* Poznámka */}
                                <SubItemCell indent colSpan="4">
                                  <InlineInput 
                                    value={newItemData.nazev_polozky || ''}
                                    onChange={(e) => setNewItemData(prev => ({...prev, nazev_polozky: e.target.value}))}
                                    style={{fontSize: '0.85rem', padding: '4px 6px', width: '100%'}}
                                    placeholder="Poznámka k položce"
                                  />
                                </SubItemCell>
                                
                                {/* Splatnost */}
                                <SubItemCell>
                                  <div style={{maxWidth: '130px'}}>
                                    <DatePicker
                                      value={newItemData.datum_splatnosti || ''}
                                      onChange={(date) => setNewItemData(prev => ({...prev, datum_splatnosti: date}))}
                                      placeholder="Vyberte datum"
                                      variant="compact"
                                    />
                                  </div>
                                </SubItemCell>
                                
                                {/* Částka */}
                                <SubItemCell>
                                  <div style={{maxWidth: '120px'}}>
                                    <CurrencyInput
                                      value={newItemData.castka || ''}
                                      onChange={(val) => setNewItemData(prev => ({...prev, castka: val}))}
                                      placeholder="0,00"
                                    />
                                  </div>
                                </SubItemCell>
                                
                                {/* Číslo dokladu - prázdné */}
                                <SubItemCell>
                                  <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>—</span>
                                </SubItemCell>
                                
                                {/* Datum zaplaceno - prázdné */}
                                <SubItemCell>
                                  <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>—</span>
                                </SubItemCell>
                                
                                {/* Stav - prázdný pro nové položky */}
                                <SubItemCell>
                                  <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>—</span>
                                </SubItemCell>
                                
                                {/* Aktualizoval - prázdný sloupec */}
                                <SubItemCell>
                                  <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>—</span>
                                </SubItemCell>
                                
                                {/* Akce - zarovnané vpravo */}
                                <SubItemCell>
                                  <div style={{display: 'flex', gap: '6px', justifyContent: 'flex-end'}}>
                                    <Button 
                                      variant="secondary" 
                                      style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', background: '#10b981', color: 'white', borderColor: '#10b981'}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveNewItem(fee.id);
                                      }}
                                      title="Uložit novou položku"
                                    >
                                      <FontAwesomeIcon icon={faCheckCircle} />
                                    </Button>
                                    <Button 
                                      variant="secondary" 
                                      style={{padding: '6px 10px', fontSize: '0.85rem', minWidth: 'auto', color: '#ef4444', borderColor: '#ef4444'}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelAddItem();
                                      }}
                                      title="Zrušit"
                                    >
                                      <FontAwesomeIcon icon={faTimes} />
                                    </Button>
                                  </div>
                                </SubItemCell>
                              </SubItemRow>
                            )}
                          </tbody>
                        </SubItemsTable>
                        
                        {/* Tlačítko pro přidání další položky - pouze s CREATE nebo EDIT */}
                        {(canCreate || canEdit) && addingItemToFeeId !== fee.id && (
                          <NewRowButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartAddItem(fee.id);
                            }}
                            style={{marginTop: '8px'}}
                          >
                            <FontAwesomeIcon icon={faPlus} style={{marginRight: '8px'}} />
                            Přidat další položku
                          </NewRowButton>
                        )}
                      </SubItemsWrapper>
                    </SubItemsContainer>
                  )}
                </React.Fragment>
                );
              })}
              
              {/* Empty state message v tabulce */}
              {filteredAnnualFees.length === 0 && !showNewRow && (
                <Tr>
                  <Td colSpan="14" style={{textAlign: 'center', padding: '40px', color: '#9ca3af'}}>
                    <div style={{fontSize: '3rem', marginBottom: '16px'}}>
                      <FontAwesomeIcon icon={faMoneyBill} />
                    </div>
                    <h3 style={{margin: '0 0 8px 0', color: '#6b7280'}}>
                      {annualFees.length === 0 ? 'Žádné roční poplatky' : 'Nenalezeny žádné výsledky'}
                    </h3>
                    <p style={{margin: '0'}}>
                      {annualFees.length === 0 
                        ? 'Začněte kliknutím na tlačítko "+ Nový roční poplatek" výše' 
                        : 'Zkuste upravit filtry nebo vyhledávací termín'
                      }
                    </p>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </TableContainer>

      {/* Pagination podle vzoru Orders25List */}
      {totalRecords > 0 && (
        <PaginationContainer>
          <PaginationInfo>
            Zobrazeno {((paginationInfo.currentPage - 1) * pageSize) + 1}-{Math.min(paginationInfo.currentPage * pageSize, paginationInfo.totalRecords)} z {paginationInfo.totalRecords} ročních poplatků
            {filteredAnnualFees.length !== annualFees.length && (
              <span> (filtrováno z {annualFees.length})</span>
            )}
          </PaginationInfo>

          <PaginationControls>
            <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
              Zobrazit:
            </span>
            <PageSizeSelect
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </PageSizeSelect>

            <PageButton
              onClick={() => handlePageChange(1)}
              disabled={paginationInfo.currentPage === 1}
            >
              ««
            </PageButton>
            <PageButton
              onClick={() => handlePageChange(paginationInfo.currentPage - 1)}
              disabled={paginationInfo.currentPage === 1}
            >
              ‹
            </PageButton>

            <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
              Stránka {paginationInfo.currentPage} z {paginationInfo.totalPages}
            </span>

            <PageButton
              onClick={() => handlePageChange(paginationInfo.currentPage + 1)}
              disabled={paginationInfo.currentPage === paginationInfo.totalPages}
            >
              ›
            </PageButton>
            <PageButton
              onClick={() => handlePageChange(paginationInfo.totalPages)}
              disabled={paginationInfo.currentPage === paginationInfo.totalPages}
            >
              »»
            </PageButton>
          </PaginationControls>
        </PaginationContainer>
      )}
      
      {/* 🔔 Modal pro úpravu položek před uložením */}
      {showPolozkyModal && (
        <ModalOverlay>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>{isCreating ? 'Potvrzení položek' : 'Úprava položek'}</h2>
              <CloseButton onClick={() => setShowPolozkyModal(false)}>×</CloseButton>
            </ModalHeader>
            
            <ModalBody>
              <p style={{marginBottom: '20px', color: '#6b7280'}}>
                {isCreating 
                  ? `Budou vytvořeny ${generatedPolozky.length} položky. Můžete je upravit před uložením.`
                  : `Položky budou přegenerovány (${generatedPolozky.length} ks). Můžete je upravit před uložením.`
                }
              </p>
              
              <PolozkyTable>
                <thead>
                  <tr>
                    <th>Poznámka</th>
                    <th>Splatnost</th>
                    <th>Částka (Kč)</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedPolozky.map((polozka, index) => (
                    <tr key={index}>
                      <td>
                        <InlineInput
                          value={polozka.nazev_polozky}
                          onChange={(e) => {
                            const updated = [...generatedPolozky];
                            updated[index].nazev_polozky = e.target.value;
                            setGeneratedPolozky(updated);
                          }}
                          style={{width: '100%'}}
                        />
                      </td>
                      <td>
                        <DateWithArrowContainer>
                          <DatePicker
                            value={polozka.datum_splatnosti}
                            onChange={(date) => {
                              const updated = [...generatedPolozky];
                              updated[index].datum_splatnosti = date;
                              setGeneratedPolozky(updated);
                            }}
                            placeholder="dd.mm.rrrr"
                            variant="compact"
                            style={{flex: 1}}
                          />
                          <ArrowButton
                            onClick={() => {
                              // Použít aktuální snapshot položek s aktuálními daty
                              const currentPolozky = [...generatedPolozky];
                              const currentDate = currentPolozky[index].datum_splatnosti;
                              updateDatesFromIndex(
                                currentPolozky,
                                setGeneratedPolozky,
                                index,
                                pendingFeeData.platba,
                                currentDate
                              );
                            }}
                            title="Aktualizovat datumy níže podle periody platby"
                          >
                            <FontAwesomeIcon icon={faArrowDown} />
                          </ArrowButton>
                        </DateWithArrowContainer>
                      </td>
                      <td>
                        <CurrencyInput
                          value={polozka.castka}
                          onChange={(val) => {
                            const updated = [...generatedPolozky];
                            updated[index].castka = val;
                            setGeneratedPolozky(updated);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PolozkyTable>
            </ModalBody>
            
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowPolozkyModal(false)}>
                Zrušit
              </Button>
              <Button variant="primary" onClick={handleConfirmPolozky}>
                <FontAwesomeIcon icon={faCheckCircle} style={{marginRight: '8px'}} />
                Uložit
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
      
      {/* Confirm dialog pro mazání */}
      <ConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        onClose={() => setDeleteConfirmDialog({ isOpen: false, feeId: null, feeName: '' })}
        onConfirm={handleConfirmDelete}
        title="Smazat roční poplatek"
        message={
          <div>
            <p>Opravdu chcete smazat roční poplatek?</p>
            <p style={{fontWeight: 'bold', marginTop: '8px'}}>{deleteConfirmDialog.feeName}</p>
            <p style={{color: '#ef4444', marginTop: '12px'}}>⚠️ Tato akce je nevratná.</p>
          </div>
        }
        icon={faTrash}
        variant="danger"
        confirmText="Smazat"
        cancelText="Zrušit"
      />

      {/* KONFIRMACE SMAZÁNÍ POLOŽKY */}
      <ConfirmDialog
        isOpen={deleteItemConfirmDialog.isOpen}
        onClose={() => setDeleteItemConfirmDialog({ isOpen: false, itemId: null, itemName: '' })}
        onConfirm={handleConfirmDeleteItem}
        title="Smazat položku"
        message={
          <div>
            <p>Opravdu chcete smazat položku?</p>
            <p style={{fontWeight: 'bold', marginTop: '8px'}}>{deleteItemConfirmDialog.itemName}</p>
            <p style={{color: '#ef4444', marginTop: '12px'}}>⚠️ Tato akce je nevratná.</p>
          </div>
        }
        icon={faTrash}
        variant="danger"
        confirmText="Smazat"
        cancelText="Zrušit"
      />
      
      {/* KONFIRMACE SMAZÁNÍ PŘÍLOHY */}
      <ConfirmDialog
        isOpen={deleteAttachmentDialog.isOpen}
        onClose={() => setDeleteAttachmentDialog({ isOpen: false, feeId: null, attachmentId: null, filename: '' })}
        onConfirm={handleConfirmDeleteAttachment}
        title="Smazat přílohu"
        message={
          <div>
            <p>Opravdu chcete smazat přílohu?</p>
            <p style={{fontWeight: 'bold', marginTop: '8px'}}>{deleteAttachmentDialog.filename}</p>
            <p style={{color: '#ef4444', marginTop: '12px'}}>⚠️ Tato akce je nevratná.</p>
          </div>
        }
        icon={faTrash}
        variant="danger"
        confirmText="Smazat"
        cancelText="Zrušit"
      />
      
      {/* TOOLTIP PŘÍLOH */}
      {attachmentsTooltip.visible && attachmentsTooltip.feeId && attachments[attachmentsTooltip.feeId] && (
        <AnnualFeeAttachmentsTooltip
          attachments={attachments[attachmentsTooltip.feeId]}
          position={attachmentsTooltip.position}
          token={token}
          username={username}
          onView={(attachment) => {
            // Uzavřít tooltip
            setAttachmentsTooltip({ visible: false, feeId: null, position: { top: 0, left: 0 } });
            // Otevřít PDF viewer
            setPdfViewer({
              visible: true,
              url: attachment.blobUrl,
              filename: attachment.filename,
              fileType: attachment.fileType || 'other'
            });
          }}
        />
      )}
      
      {/* Click overlay pro zavření tooltipu */}
      {attachmentsTooltip.visible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
          onClick={() => setAttachmentsTooltip({ visible: false, feeId: null, position: { top: 0, left: 0 } })}
        />
      )}
      
      {/* ATTACHMENT VIEWER */}
      {pdfViewer.visible && (
        <AttachmentViewer
          attachment={{
            blobUrl: pdfViewer.url,
            filename: pdfViewer.filename,
            fileType: pdfViewer.fileType
          }}
          onClose={() => {
            // Data URLs don't need to be revoked like blob URLs
            if (pdfViewer.url && pdfViewer.url.startsWith('blob:')) {
              window.URL.revokeObjectURL(pdfViewer.url);
            }
            setPdfViewer({ visible: false, url: '', filename: '', fileType: 'pdf' });
          }}
        />
      )}
    </PageContainer>
  );
}

export default AnnualFeesPage;
