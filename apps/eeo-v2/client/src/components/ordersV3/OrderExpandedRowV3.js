/** @jsxImportSource @emotion/react */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { downloadOrderAttachment, downloadInvoiceAttachment } from '../../services/apiOrderV2';
import AttachmentViewer from '../invoices/AttachmentViewer';
import { SmartTooltip } from '../../styles/SmartTooltip'; // ✅ Custom tooltip component
import {
  faInfoCircle,
  faBox,
  faFileInvoice,
  faPaperclip,
  faProjectDiagram,
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faFileAlt,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFileImage,
  faFileArchive,
  faFile,
  faDownload,
  faSync,
  faFilePen,
  faClock,
  faCalendarDays,
  faShield,
  faFileContract,
  faTruck,
  faXmark,
  faCircleNotch,
  faHourglassHalf,
  faEdit,
  faComment,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';

// ✅ Obrysové (bez výplně) ikonky pro datum/čas
import {
  faClock as faClockRegular,
  faCalendarDays as faCalendarDaysRegular
} from '@fortawesome/free-regular-svg-icons';

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
`;

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const ExpandedRow = styled.tr`
  animation: ${fadeIn} 0.2s ease-out;
`;

const ExpandedCell = styled.td`
  padding: 0 !important;
  background: #f9fafb;
  border-top: 2px solid #e5e7eb;
  border-bottom: 2px solid #000000;
  overflow-x: auto;
  overflow-y: visible;
`;

const ExpandedContent = styled.div`
  padding: 1rem;
  display: inline-block;
  min-width: max(100%, 1400px);
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.2);

  &:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 0.875rem;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 0.875rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
`;

const CardTitle = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: #1e293b;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #3b82f6;
    font-size: 0.875rem;
  }
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0 1rem;
  align-items: start;
  margin-bottom: 0.5rem;
  font-size: 0.9375rem;
  line-height: 1.4;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.div`
  font-weight: 500;
  color: #64748b;
`;

const InfoValue = styled.div`
  color: #1e293b;
  word-break: break-word;

  &.empty {
    color: #94a3b8;
    font-style: italic;
  }

  &.highlight {
    font-weight: 600;
    color: #1e40af;
  }

  &.currency {
    font-weight: 600;
    color: #059669;
  }
`;

// Prefix ikonky pro datumové řádky (viz styl Workflow bloků)
const InfoLabelWithIcon = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-weight: 500;
  color: #64748b;
`;

const InfoPrefixIcon = styled.div`
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 0.65rem;
  flex-shrink: 0;
  margin-top: 2px;
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    const colors = {
      NOVA: 'rgba(219, 234, 254, 0.4)',
      ODESLANA_KE_SCHVALENI: 'rgba(254, 226, 226, 0.4)',
      SCHVALENA: 'rgba(254, 215, 170, 0.4)',
      ZAMITNUTA: 'rgba(229, 231, 235, 0.4)',
      ROZPRACOVANA: 'rgba(254, 243, 199, 0.4)',
      ODESLANA: 'rgba(224, 231, 255, 0.4)',
      POTVRZENA: 'rgba(221, 214, 254, 0.4)',
      K_UVEREJNENI_DO_REGISTRU: 'rgba(204, 251, 241, 0.4)',
      UVEREJNENA: 'rgba(209, 250, 229, 0.4)',
      DOKONCENA: 'rgba(209, 250, 229, 0.4)',
      ZRUSENA: 'rgba(254, 202, 202, 0.4)',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || 'rgba(241, 245, 249, 0.4)';
  }};
  color: ${props => {
    const colors = {
      NOVA: '#1e40af',
      ODESLANA_KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#d97706',
      ODESLANA: '#4f46e5',
      POTVRZENA: '#6d28d9',
      K_UVEREJNENI_DO_REGISTRU: '#0d9488',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZRUSENA: '#dc2626',
      EMPTY: '#64748b',
    };
    return colors[props.$status] || '#64748b';
  }};
  border: 1.5px solid ${props => {
    const colors = {
      NOVA: '#1e40af',
      ODESLANA_KE_SCHVALENI: '#dc2626',
      SCHVALENA: '#ea580c',
      ZAMITNUTA: '#6b7280',
      ROZPRACOVANA: '#d97706',
      ODESLANA: '#4f46e5',
      POTVRZENA: '#6d28d9',
      K_UVEREJNENI_DO_REGISTRU: '#0d9488',
      UVEREJNENA: '#059669',
      DOKONCENA: '#059669',
      ZRUSENA: '#dc2626',
      EMPTY: 'transparent',
    };
    return colors[props.$status] || '#94a3b8';
  }};
`;

// Loading States
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.875rem;
  gap: 0.5rem;

  svg {
    animation: ${spin} 1s linear infinite;
  }
`;

const SkeletonLine = styled.div`
  height: ${props => props.$height || '18px'};
  background: linear-gradient(to right, #f1f5f9 0%, #e2e8f0 20%, #f1f5f9 40%, #f1f5f9 100%);
  background-size: 936px 100%;
  animation: ${shimmer} 1.5s linear infinite;
  border-radius: 4px;
  margin-bottom: ${props => props.$marginBottom || '0.5rem'};
`;

// Error State
const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.875rem;

  svg {
    flex-shrink: 0;
    font-size: 1.25rem;
  }
`;

const RetryButton = styled.button`
  margin-left: auto;
  padding: 0.375rem 0.75rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #b91c1c;
  }
`;

// Items Table
const ItemsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  margin-top: 0.5rem;
  table-layout: auto;
  overflow-wrap: break-word;

  thead tr {
    &:hover {
      background-color: #f8fafc !important;
    }
  }

  tbody tr {
    transition: background-color 0.15s ease;
    
    &:hover {
      background-color: #f1f5f9;
    }
  }
`;

const ItemsTh = styled.th`
  text-align: left;
  padding: 0.5rem;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: #475569;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  word-wrap: break-word;
`;

const ItemsTd = styled.td`
  padding: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
  word-wrap: break-word;
  overflow-wrap: break-word;
  vertical-align: top;

  &.numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &.currency {
    font-weight: 500;
    color: #059669;
  }
`;

// Invoices
const InvoiceItem = styled.div`
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InvoiceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const InvoiceNumber = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
`;

const InvoiceAmount = styled.div`
  font-weight: 600;
  color: #059669;
  font-size: 0.875rem;
`;

const InvoiceDetail = styled.div`
  font-size: 0.9375rem;
  color: #64748b;
  margin-top: 0.25rem;
`;

const InvoiceStatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  background: ${props => props.$success ? '#dcfce7' : props.$warning ? '#fef3c7' : '#dbeafe'};
  color: ${props => props.$success ? '#166534' : props.$warning ? '#854d0e' : '#1e40af'};
  border: 1px solid ${props => props.$success ? '#86efac' : props.$warning ? '#fde047' : '#93c5fd'};

  svg {
    font-size: 0.75rem;
  }
`;

const AttachmentTypeBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
`;

// Attachments
const AttachmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const AttachmentItem = styled.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateX(2px);
  }
`;

const AttachmentIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$bg || '#e0e7ff'};
  color: ${props => props.$color || '#3b82f6'};
  border-radius: 6px;
  flex-shrink: 0;
  font-size: 0.875rem;
`;

const AttachmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AttachmentName = styled.div`
  font-weight: 500;
  font-size: 0.9375rem;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AttachmentMeta = styled.div`
  font-size: 0.9375rem;
  color: #64748b;
  margin-top: 0.125rem;
`;

const AttachmentDownload = styled.div`
  color: #3b82f6;
  font-size: 0.875rem;
`;

// Workflow Steps
const WorkflowSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const WorkflowStep = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.625rem;
  background: #f8fafc;
  border-left: 3px solid ${props => {
    if (props.$status === 'completed') return '#10b981';
    if (props.$status === 'current') return '#3b82f6';
    if (props.$status === 'rejected') return '#ef4444';
    return '#e5e7eb';
  }};
  border-radius: 4px;
`;

const WorkflowIcon = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${props => {
    if (props.$status === 'completed') return '#d1fae5';
    if (props.$status === 'current') return '#dbeafe';
    if (props.$status === 'rejected') return '#fee2e2';
    return '#f1f5f9';
  }};
  color: ${props => {
    if (props.$status === 'completed') return '#059669';
    if (props.$status === 'current') return '#2563eb';
    if (props.$status === 'rejected') return '#dc2626';
    return '#94a3b8';
  }};
  font-size: 0.75rem;
  flex-shrink: 0;
`;

const WorkflowContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const WorkflowTitle = styled.div`
  font-weight: 500;
  font-size: 0.8125rem;
  color: #1e293b;
`;

const WorkflowMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
`;

const EmptyState = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.8125rem;
  font-style: italic;
`;

// =============================================================================
// INLINE COMMENTS (stejný vzhled jako OrderCommentsTooltip)
// =============================================================================

const InlineCommentsTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InlineCommentItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: ${props => props.$isOwn ? '#eff6ff' : '#f8fafc'};
  border-left: 3px solid ${props => props.$isOwn ? '#3b82f6' : '#cbd5e1'};
  border-radius: 6px;
  transition: all 0.15s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const InlineCommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const InlineCommentAuthor = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const InlineCommentDate = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  flex-shrink: 0;
`;

const InlineCommentText = styled.div`
  font-size: 0.9rem;
  color: #334155;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

const InlineCommentsSearchInput = styled.input`
  width: 240px;
  max-width: 38vw;
  padding: 0.35rem 1.65rem 0.35rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.8rem;
  outline: none;
  color: #0f172a;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const InlineCommentsSearchWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const InlineCommentsSearchClearButton = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #64748b;
    background: rgba(148, 163, 184, 0.15);
  }
`;

const InlineRepliesWrapper = styled.div`
  margin-top: 0.75rem;
  margin-left: 2rem;
  padding-left: 1.25rem;
  border-left: 3px solid #3b82f6;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: linear-gradient(to right, rgba(59, 130, 246, 0.03), transparent);
  padding-right: 0.5rem;
  border-radius: 0 6px 6px 0;
`;

const InlineReplyItem = styled.div`
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 0.85rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }
`;

const PartnerBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #7c3aed;
  background: #f3e8ff;
  border: 1px solid #e9d5ff;
  flex-shrink: 0;
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getFileIcon = (fileName) => {
  if (!fileName) return faFile;
  
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (['pdf'].includes(ext)) return faFilePdf;
  if (['doc', 'docx'].includes(ext)) return faFileWord;
  if (['xls', 'xlsx'].includes(ext)) return faFileExcel;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return faFileImage;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return faFileArchive;
  
  return faFileAlt;
};

const getFileIconColor = (fileName) => {
  if (!fileName) return { bg: '#e5e7eb', color: '#64748b' };
  
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (['pdf'].includes(ext)) return { bg: '#fee2e2', color: '#dc2626' };
  if (['doc', 'docx'].includes(ext)) return { bg: '#dbeafe', color: '#2563eb' };
  if (['xls', 'xlsx'].includes(ext)) return { bg: '#d1fae5', color: '#059669' };
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return { bg: '#fef3c7', color: '#f59e0b' };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { bg: '#e0e7ff', color: '#6366f1' };
  
  return { bg: '#e5e7eb', color: '#64748b' };
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '---';
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
};

// Formátování pouze data (bez času)
const formatDateOnly = (dateString) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
};

// Formátování pouze času
const formatTimeOnly = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch {
    return '';
  }
};

// Vrátí true, pokud vstup vypadá jako datum+čas (ne pouze datum)
const hasTimePart = (dateString) => {
  if (!dateString) return false;
  if (typeof dateString !== 'string') return true; // Date objekt apod.
  // MySQL: YYYY-MM-DD HH:MM:SS, ISO: YYYY-MM-DDTHH:MM:SS
  return /[T\s]\d{2}:\d{2}/.test(dateString);
};

// Formát + ikonka podle toho, jestli obsahuje čas
const formatSmartDate = (dateString) => (hasTimePart(dateString) ? formatDateTime(dateString) : formatDateOnly(dateString));
const getSmartDateIcon = (dateString) => (hasTimePart(dateString) ? faClockRegular : faCalendarDaysRegular);

// Ikona přesně jako ve workflow (šedá), přímo před datem/časem
const renderSmartDateInline = (dateString) => {
  if (!dateString) return '---';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <FontAwesomeIcon icon={getSmartDateIcon(dateString)} style={{ color: '#94a3b8' }} />
      <span>{formatSmartDate(dateString)}</span>
    </span>
  );
};

// Vynuceně jen datum (bez času) + kalendář
const renderDateOnlyInline = (dateString) => {
  if (!dateString) return '---';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <FontAwesomeIcon icon={faCalendarDaysRegular} style={{ color: '#94a3b8' }} />
      <span>{formatDateOnly(dateString)}</span>
    </span>
  );
};

// Získání lidsky čitelného stavu objednávky
const getOrderDisplayStatus = (order) => {
  // Backend vrací sloupec 'stav_objednavky' který už obsahuje čitelný český název
  return order?.stav_objednavky || '---';
};

// Hardcoded mapování stavů faktur (FA) - záměrně bez číselníku
// ⚠️ Pozn.: Stavy FA aktuálně nejsou v DB číselnících
const INVOICE_STATUS_LABELS = {
  // Nové workflow stavy
  ZAEVIDOVANA: 'Zaevidovaná',
  VECNA_SPRAVNOST: 'Věcná správnost',
  V_RESENI: 'V řešení',
  PREDANA_PO: 'Předaná PO',
  K_ZAPLACENI: 'K zaplacení',
  ZAPLACENO: 'Zaplaceno',
  DOKONCENA: 'Dokončena',
  STORNO: 'Storno',
  // Starší kompatibilní stavy
  NOVA: 'Nová',
  NEZAPLACENA: 'Nezaplacena',
  ZAPLACENA: 'Zaplacena',
};

const INVOICE_STATUS_ALIASES = {
  'Věcná správnost': 'VECNA_SPRAVNOST',
  'Nová': 'NOVA',
  'Nezaplacena': 'NEZAPLACENA',
  'Zaplacena': 'ZAPLACENA',
  'Zaplaceno': 'ZAPLACENO',
  'K zaplacení': 'K_ZAPLACENI',
  'V řešení': 'V_RESENI',
  'Předaná PO': 'PREDANA_PO',
  'Dokončena': 'DOKONCENA',
  'Storno': 'STORNO',
};

const normalizeInvoiceStatus = (status) => {
  if (!status || typeof status !== 'string') return '';
  if (INVOICE_STATUS_ALIASES[status]) return INVOICE_STATUS_ALIASES[status];
  return status.trim().toUpperCase();
};

const getInvoiceStatusLabel = (status) => {
  if (!status) return '';
  const normalized = normalizeInvoiceStatus(status);
  return INVOICE_STATUS_LABELS[normalized] || status;
};

const ATTACHMENT_TYPE_FALLBACK_LABELS = {
  OBJ: 'Objednávka',
  FAKTURA: 'Faktura',
  FA: 'Faktura',
  ISDOC: 'ISDOC',
  DOPLNEK_FA: 'Doplněk FA',
  DOKLAD: 'Doklad',
  JINE: 'Jiné',
  POTVRZENA_OBJEDNAVKA: 'Potvrzená objednávka',
  KOSILKA: 'Košilka',
};

const prettifyAttachmentType = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (value.includes(' - ')) return value;
  if (!/^[A-Z0-9_]+$/.test(value)) return value;

  const mapped = ATTACHMENT_TYPE_FALLBACK_LABELS[value];
  if (mapped) return mapped;

  const words = value
    .split('_')
    .filter(Boolean)
    .map(w => w.charAt(0) + w.slice(1).toLowerCase());

  return words.join(' ');
};

// Mapování lidského stavu na systémový kód pro barvy
const mapUserStatusToSystemCode = (userStatus) => {
  if (userStatus && typeof userStatus === 'string') {
    if (userStatus.startsWith('Zamítnut')) return 'ZAMITNUTA';
    if (userStatus.startsWith('Schválen')) return 'SCHVALENA';
    if (userStatus.startsWith('Dokončen')) return 'DOKONCENA';
    if (userStatus.startsWith('Zrušen')) return 'ZRUSENA';
    if (userStatus.startsWith('Archivován')) return 'ARCHIVOVANO';
  }
  
  const mapping = {
    'Ke schválení': 'ODESLANA_KE_SCHVALENI',
    'Nová': 'NOVA',
    'Rozpracovaná': 'ROZPRACOVANA',
    'Odeslaná dodavateli': 'ODESLANA',
    'Potvrzená dodavatelem': 'POTVRZENA',
    'Má být zveřejněna': 'K_UVEREJNENI_DO_REGISTRU',
    'Uveřejněná': 'UVEREJNENA',
    'Čeká na potvrzení': 'CEKA_POTVRZENI',
    'Čeká se': 'CEKA_SE',
    'Fakturace': 'FAKTURACE',
    'Věcná správnost': 'VECNA_SPRAVNOST',
    'Zkontrolována': 'ZKONTROLOVANA',
    'Smazaná': 'SMAZANA',
    'Koncept': 'NOVA',
  };
  return mapping[userStatus] || 'DEFAULT';
};

// Formátování data s časem
const formatDateTime = (dateString) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
};

// Formátování jména s titulem
const formatUserName = (jmeno, prijmeni, titulPred, titulZa) => {
  const parts = [];
  
  if (titulPred) parts.push(titulPred);
  if (jmeno) parts.push(jmeno);
  if (prijmeni) parts.push(prijmeni);
  if (titulZa) parts.push(titulZa);
  
  return parts.length > 0 ? parts.join(' ') : '---';
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const OrderExpandedRowV3 = ({ order, detail, loading, error, onRetry, onForceRefresh, colSpan, token, username, onActionClick, canEdit, showToast, setOrderToApprove, setApprovalComment, setShowApprovalDialog, canApproveOrder, onLoadComments, onAddComment, onDeleteComment }) => {
  // 🖼️ State pro AttachmentViewer
  const [viewerAttachment, setViewerAttachment] = useState(null);

  // Číselníky typů příloh (OBJ + FA)
  const [attachmentTypeLabels, setAttachmentTypeLabels] = useState({
    obj: {},
    fa: {}
  });

  // 💬 Inline komentáře v podřádku
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [comments, setComments] = useState([]);

  // 🧩 Rozbalit / sbalit blok komentářů (UI preference jen lokálně v rámci podřádku)
  const [isCommentsBlockExpanded, setIsCommentsBlockExpanded] = useState(true);

  // 🔎 Vyhledávání v inline komentářích (autor + text)
  const [commentsSearchQuery, setCommentsSearchQuery] = useState('');

  const loadInlineComments = useCallback(async () => {
    if (!onLoadComments || !order?.id) return;
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await onLoadComments(order.id, 200, 0);
      setComments(Array.isArray(result?.comments) ? result.comments : []);
    } catch (e) {
      setCommentsError(e?.message || 'Chyba při načítání komentářů');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [onLoadComments, order?.id]);

  const handleForceRefreshAll = useCallback(async () => {
    if (onForceRefresh) {
      await Promise.resolve(onForceRefresh());
    }

    if (onLoadComments && order?.id) {
      await loadInlineComments();
    }
  }, [onForceRefresh, onLoadComments, order?.id, loadInlineComments]);

  useEffect(() => {
    // Načti komentáře při otevření podřádku + po změně detailu/počtu komentářů
    // (pokryje refresh tlačítko i obecné refresh scénáře)
    if (!order?.id) return;
    if (onLoadComments) {
      loadInlineComments();
    }
  }, [order?.id, order?.comments_count, detail, onLoadComments, loadInlineComments]);

  useEffect(() => {
    if (!token || !username) return;

    let isCancelled = false;

    const loadAttachmentTypeLabels = async () => {
      try {
        const { getTypyPriloh25, getTypyFaktur25 } = await import('../../services/api25orders');

        const [objTypes, faTypes] = await Promise.all([
          getTypyPriloh25({ token, username, aktivni: 1 }),
          getTypyFaktur25({ token, username, aktivni: 1 })
        ]);

        if (isCancelled) return;

        const toMap = (list) => (Array.isArray(list) ? list.reduce((acc, item) => {
          const key = (item?.kod || item?.value || '').toString().trim().toUpperCase();
          const label = (item?.nazev || item?.label || '').toString().trim();
          if (key && label) acc[key] = label;
          return acc;
        }, {}) : {});

        setAttachmentTypeLabels({
          obj: toMap(objTypes),
          fa: toMap(faTypes)
        });
      } catch (e) {
        // Bezpečný fallback - UI pojede dál přes hardcoded mapování
        console.warn('⚠️ Nepodařilo se načíst číselníky typů příloh pro V3 detail:', e?.message || e);
      }
    };

    loadAttachmentTypeLabels();

    return () => {
      isCancelled = true;
    };
  }, [token, username]);

  const getAttachmentTypeLabel = useCallback((typeCode, source = 'obj') => {
    if (!typeCode) return '';

    const raw = String(typeCode).trim();
    if (!raw) return '';

    const normalized = raw.toUpperCase();
    const fromDb = source === 'fa'
      ? attachmentTypeLabels?.fa?.[normalized]
      : attachmentTypeLabels?.obj?.[normalized];

    return fromDb || prettifyAttachmentType(raw);
  }, [attachmentTypeLabels]);

  // --- Threading komentářů (parent_comment_id) ---
  const normalizedComments = useMemo(() => {
    return (comments || []).map((c) => {
      if (!c) return c;
      const idRaw = c.id;
      const parentRaw = c.parent_comment_id;
      const id = idRaw !== undefined && idRaw !== null ? Number(idRaw) : idRaw;
      const parentId = parentRaw !== undefined && parentRaw !== null ? Number(parentRaw) : parentRaw;
      return {
        ...c,
        id: Number.isNaN(id) ? c.id : id,
        parent_comment_id: Number.isNaN(parentId) ? c.parent_comment_id : parentId,
      };
    });
  }, [comments]);

  // Filtrování vláken podle search dotazu.
  // Chování: pokud matchne reply, zahrneme i jeho parenty pro kontext + potomky pro čitelné vlákno.
  const threadComments = useMemo(() => {
    const q = (commentsSearchQuery || '').trim();
    if (!q) return normalizedComments;

    const normalize = (s) => String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const nq = normalize(q);
    if (!nq) return normalizedComments;

    const byId = new Map();
    (normalizedComments || []).forEach((c) => {
      if (c?.id != null) byId.set(c.id, c);
    });

    const includeIds = new Set();

    // 1) Najdi přímé match
    (normalizedComments || []).forEach((c) => {
      if (!c) return;
      const author = normalize(c.autor_jmeno || c.autor_username || '');
      const text = normalize(c.obsah_plain || c.obsah || '');
      if (author.includes(nq) || text.includes(nq)) {
        if (c.id != null) includeIds.add(c.id);
      }
    });

    if (includeIds.size === 0) {
      return [];
    }

    // 2) Přidej parent chain pro kontext
    const addParents = (id) => {
      let cur = byId.get(id);
      const seen = new Set();
      while (cur && cur.parent_comment_id) {
        if (seen.has(cur.id)) break;
        seen.add(cur.id);
        const parentId = cur.parent_comment_id;
        const parent = byId.get(parentId);
        if (!parent) break;
        includeIds.add(parent.id);
        cur = parent;
      }
    };
    Array.from(includeIds).forEach(addParents);

    // 3) Přidej potomky (reply chain), aby vlákno nebylo useknuté
    // Build children index
    const childrenByParent = new Map();
    (normalizedComments || []).forEach((c) => {
      if (!c) return;
      const parentId = c.parent_comment_id || null;
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push(c);
    });

    let changed = true;
    while (changed) {
      changed = false;
      for (const id of Array.from(includeIds)) {
        const kids = childrenByParent.get(id) || [];
        kids.forEach((k) => {
          if (k?.id != null && !includeIds.has(k.id)) {
            includeIds.add(k.id);
            changed = true;
          }
        });
      }
    }

    return (normalizedComments || []).filter((c) => c?.id != null && includeIds.has(c.id));
  }, [normalizedComments, commentsSearchQuery]);

  const commentsById = useMemo(() => {
    const map = new Map();
    (threadComments || []).forEach((c) => {
      if (c && c.id !== undefined && c.id !== null) map.set(c.id, c);
    });
    return map;
  }, [threadComments]);

  const childrenByParent = useMemo(() => {
    const map = new Map();
    (threadComments || []).forEach((c) => {
      if (!c) return;
      const parentId = c.parent_comment_id || null;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId).push(c);
    });

    // seřadit děti podle dt_vytvoreni ASC (stabilně)
    const toTs = (v) => {
      const t = new Date(v || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => toTs(a?.dt_vytvoreni) - toTs(b?.dt_vytvoreni));
      map.set(k, arr);
    }

    return map;
  }, [threadComments]);

  const getChildren = useCallback((parentId) => {
    return childrenByParent.get(parentId || null) || [];
  }, [childrenByParent]);

  // Najdi kořen vlákna (multi-level). Pokud parent chybí v datech, ber jako root.
  const getRootId = useCallback((comment) => {
    if (!comment) return null;
    let current = comment;
    const seen = new Set();
    while (current?.parent_comment_id) {
      if (seen.has(current.id)) break; // cyklus
      seen.add(current.id);
      const parent = commentsById.get(current.parent_comment_id);
      if (!parent) break;
      current = parent;
    }
    return current?.id ?? null;
  }, [commentsById]);

  const rootThreads = useMemo(() => {
    // root = parent_comment_id null/0 nebo parent nenalezen
    const roots = [];
    const rootIds = new Set();
    (threadComments || []).forEach((c) => {
      if (!c) return;
      const rootId = getRootId(c);
      if (rootId == null) return;
      if (!rootIds.has(rootId)) {
        rootIds.add(rootId);
        const root = commentsById.get(rootId);
        if (root) roots.push(root);
      }
    });

    // seřadit rooty podle dt_vytvoreni ASC (chronologicky)
    const toTs = (v) => {
      const t = new Date(v || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    roots.sort((a, b) => toTs(a?.dt_vytvoreni) - toTs(b?.dt_vytvoreni));
    return roots;
  }, [threadComments, getRootId, commentsById]);
  
  // 📥 Download/Preview handler pro přílohy - detekce typu a zobrazení ve vieweru
  const handleDownloadAttachment = async (attachment, orderId) => {
    const fileName = attachment.originalni_nazev_souboru || `priloha_${attachment.id}`;

    if (!attachment.id || !orderId || !token || !username) {
      if (showToast) {
        showToast('Nelze otevřít přílohu - chybí potřebné údaje', { type: 'error' });
      }
      return;
    }

    try {
      let blob;
      
      // ✅ Rozlišení podle tabulky:
      // - Má faktura_id → příloha FAKTURY
      // - Nemá faktura_id → příloha OBJEDNÁVKY
      const fakturaId = attachment.faktura_id || attachment.invoice_id;
      
      if (fakturaId) {
        // Příloha faktury
        blob = await downloadInvoiceAttachment(fakturaId, attachment.id, username, token);
      } else {
        // Příloha objednávky
        blob = await downloadOrderAttachment(orderId, attachment.id, username, token);
      }

      // Detekce typu souboru z přípony
      const ext = fileName.toLowerCase().split('.').pop();

      // Typy podporované pro preview
      const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const isPreviewable = previewableTypes.includes(ext);
      const isPdf = ext === 'pdf';

      // 🖼️ Otevřít ve vieweru
      setViewerAttachment({
        ...attachment,
        blob: blob, // Poslat blob (AttachmentViewer vytvoří blob URL)
        blobUrl: window.URL.createObjectURL(blob), // Přidat blob URL přímo
        filename: fileName,
        nazev_souboru: fileName,
        originalni_nazev_souboru: fileName,
        fileType: isPdf ? 'pdf' : (isPreviewable ? 'image' : 'other')
      });

    } catch (error) {
      console.error('Chyba při otevírání přílohy:', error);
      if (showToast) {
        showToast(error.message || 'Nepodařilo se otevřít přílohu', { type: 'error' });
      }
    }
  };

  // Error State (nejvyšší priorita)
  if (error) {
    return (
      <ExpandedRow>
        <ExpandedCell colSpan={colSpan}>
          <ExpandedContent>
            <ErrorContainer>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  Nepodařilo se načíst detail objednávky
                </div>
                <div>{error}</div>
              </div>
              {onRetry && (
                <RetryButton onClick={onRetry}>
                  Zkusit znovu
                </RetryButton>
              )}
            </ErrorContainer>
          </ExpandedContent>
        </ExpandedCell>
      </ExpandedRow>
    );
  }

  // Loading State (priorita před "no data")
  if (loading || !detail) {
    return (
      <ExpandedRow>
        <ExpandedCell colSpan={colSpan}>
          <LoadingContainer>
            <FontAwesomeIcon icon={faSpinner} />
            Načítání detailů objednávky...
          </LoadingContainer>
        </ExpandedCell>
      </ExpandedRow>
    );
  }

  // Detail data
  const polozky = detail.polozky || [];
  const faktury = detail.faktury || [];
  const prilohy = detail.prilohy || [];
  const workflow = detail.workflow_kroky || [];

  // 📎 AGREGACE: Přílohy faktur ze všech faktur do jednoho pole
  const fakturyPrilohy = faktury.reduce((acc, faktura) => {
    if (faktura.prilohy && faktura.prilohy.length > 0) {
      // Přidáme info o faktuře ke každé příloze
      const prilohyWithInvoiceInfo = faktura.prilohy.map(priloha => ({
        ...priloha,
        faktura_cislo: faktura.fa_cislo_vema,
        faktura_id: faktura.id
      }));
      return [...acc, ...prilohyWithInvoiceInfo];
    }
    return acc;
  }, []);

  return (
    <>
    <ExpandedRow>
      <ExpandedCell colSpan={colSpan}>
        <ExpandedContent>
          <Grid>
            {/* 1⃣ ZÁKLADNÍ ÚDAJE OBJEDNÁVKY */}
            <Card>
              <CardTitle>
                {onForceRefresh ? (
                  <FontAwesomeIcon 
                    icon={faSync} 
                    style={{ cursor: 'pointer', color: '#3b82f6' }}
                    onClick={handleForceRefreshAll}
                    title="Znovu načíst data z databáze"
                  />
                ) : (
                  <FontAwesomeIcon icon={faInfoCircle} />
                )}
                Základní údaje objednávky
              </CardTitle>

              <div style={{ 
                marginBottom: '0.75rem', 
                padding: '0.5rem', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                borderRadius: '6px', 
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.5em', color: '#0f172a' }}>
                  {detail.cislo_objednavky || '---'}
                  <sup style={{ fontSize: '0.5em', color: '#94a3b8', fontWeight: 400, marginLeft: '0.3em' }}>
                    #{detail.id || '?'}
                  </sup>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {/* 🎯 Schvalovací tlačítko - stejná logika jako v hlavním řádku */}
                  {(() => {
                    const canApproveThisOrder = canApproveOrder ? canApproveOrder(detail) : true;

                    // Zkontroluj workflow stav pro schvalovací ikonu
                    let workflowStates = [];
                    try {
                      if (Array.isArray(detail.stav_workflow_kod)) {
                        workflowStates = detail.stav_workflow_kod;
                      } else if (typeof detail.stav_workflow_kod === 'string' && detail.stav_workflow_kod.trim()) {
                        workflowStates = JSON.parse(detail.stav_workflow_kod);
                      }
                    } catch (e) {
                      workflowStates = [];
                    }
                    
                    const allowedStates = ['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'SCHVALENA', 'ZAMITNUTA'];
                    const lastState = workflowStates.length > 0 
                      ? (typeof workflowStates[workflowStates.length - 1] === 'string' 
                          ? workflowStates[workflowStates.length - 1] 
                          : (workflowStates[workflowStates.length - 1].kod_stavu || workflowStates[workflowStates.length - 1].nazev_stavu || '')
                        ).toUpperCase()
                      : '';
                    
                    const isAllowedState = allowedStates.includes(lastState);
                    
                    if (!isAllowedState) return null;
                    
                    // Určení ikony podle stavu
                    const pendingStates = ['ODESLANA_KE_SCHVALENI', 'CEKA_SE'];
                    const approvedStates = ['SCHVALENA', 'ZAMITNUTA'];
                    const isPending = pendingStates.includes(lastState);
                    const isApproved = approvedStates.includes(lastState);
                    
                    // Použití barev z STATUS_COLORS (jako v dashboardu) + křížek pro zamítnutou
                    let icon, iconColor, hoverBgColor, hoverBorderColor, hoverIconColor;
                    
                    if (isPending) {
                      // Ke schválení - červená + hodiny
                      icon = faHourglassHalf;
                      iconColor = '#dc2626'; // červená
                      hoverBgColor = '#fecaca';
                      hoverBorderColor = '#dc2626';
                      hoverIconColor = '#991b1b';
                    } else if (lastState === 'SCHVALENA') {
                      // Schválená - oranžová + fajfka
                      icon = faCheckCircle;
                      iconColor = '#ea580c'; // oranžová
                      hoverBgColor = '#fed7aa';
                      hoverBorderColor = '#ea580c';
                      hoverIconColor = '#c2410c';
                    } else {
                      // Zamítnutá - šedá + křížek
                      icon = faTimesCircle;
                      iconColor = '#6b7280'; // šedá
                      hoverBgColor = '#e5e7eb';
                      hoverBorderColor = '#6b7280';
                      hoverIconColor = '#4b5563';
                    }
                    
                    const tooltipText = canApproveThisOrder
                      ? (isPending ? "Schválit objednávku (ke schválení)" : "Zobrazit schválení (vyřízeno)")
                      : "Nemůžete schválit objednávku – je určena jinému příkazci.";

                    const tooltipIcon = canApproveThisOrder
                      ? (isPending ? "warning" : (lastState === 'SCHVALENA' ? "success" : "info"))
                      : "warning";

                    return (
                      <SmartTooltip 
                        text={tooltipText} 
                        icon={tooltipIcon} 
                        preferredPosition="top"
                      >
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!canApproveThisOrder) {
                              return;
                            }
                            try {
                              // 🔒 DŮLEŽITÉ: Schvalovací dialog otevírat přes centralizovaný event,
                              // aby se před otevřením vždy provedl lock-check (řeší OrdersTableV3).
                              window.dispatchEvent(new CustomEvent('ordersV3:openApprovalDialog', {
                                detail: {
                                  orderId: order?.id,
                                  source: 'expanded-row'
                                }
                              }));
                            } catch (error) {
                              console.error('Chyba při otevírání schvalovacího dialogu:', error);

                              // Fallback (bez lock-checku) – jen pokud by event selhal
                              try {
                                setOrderToApprove && setOrderToApprove(detail);
                                setApprovalComment && setApprovalComment(detail.schvaleni_komentar || '');
                                setShowApprovalDialog && setShowApprovalDialog(true);
                              } catch {
                                // noop
                              }
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            border: `2px solid ${canApproveThisOrder ? iconColor : '#e5e7eb'}`,
                            borderRadius: '6px',
                            background: canApproveThisOrder ? 'white' : '#f3f4f6',
                            color: canApproveThisOrder ? iconColor : '#9ca3af',
                            cursor: canApproveThisOrder ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                            fontSize: '1rem'
                          }}
                          onMouseOver={(e) => {
                            if (!canApproveThisOrder) return;
                            e.currentTarget.style.background = hoverBgColor;
                            e.currentTarget.style.borderColor = hoverBorderColor;
                            e.currentTarget.style.color = hoverIconColor;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${hoverBgColor}`;
                          }}
                          onMouseOut={(e) => {
                            if (!canApproveThisOrder) return;
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = iconColor;
                            e.currentTarget.style.color = iconColor;
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <FontAwesomeIcon icon={icon} />
                        </button>
                      </SmartTooltip>
                    );
                  })()}
                  
                  {/* 📝 Edit tlačítko */}
                  {canEdit && canEdit(order) && (
                    <SmartTooltip text="Editovat objednávku" icon="info" preferredPosition="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionClick?.('edit', order);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          border: '2px solid #3b82f6',
                          borderRadius: '6px',
                          background: 'white',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '1rem'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#eff6ff';
                          e.currentTarget.style.borderColor = '#2563eb';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                    </SmartTooltip>
                  )}
                </div>
              </div>

              <InfoRow>
                <InfoLabel>Předmět:</InfoLabel>
                <InfoValue style={{ fontWeight: 500 }}>{detail.predmet || '---'}</InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>Stav:</InfoLabel>
                <InfoValue style={{ 
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: (() => {
                    const statusCode = mapUserStatusToSystemCode(getOrderDisplayStatus(detail));
                    const colors = {
                      NOVA: '#1e40af',
                      ODESLANA_KE_SCHVALENI: '#dc2626',
                      SCHVALENA: '#ea580c',
                      ZAMITNUTA: '#6b7280',
                      ROZPRACOVANA: '#d97706',
                      ODESLANA: '#4f46e5',
                      POTVRZENA: '#6d28d9',
                      K_UVEREJNENI_DO_REGISTRU: '#0d9488',
                      UVEREJNENA: '#059669',
                      DOKONCENA: '#059669',
                      ZRUSENA: '#dc2626',
                    };
                    return colors[statusCode] || '#64748b';
                  })()
                }}>
                  <FontAwesomeIcon 
                    icon={
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'NOVA' ? faFilePen :
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'ODESLANA_KE_SCHVALENI' ? faClock :
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'SCHVALENA' ? faShield :
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'POTVRZENA' ? faCheckCircle :
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'UVEREJNENA' ? faFileContract :
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'DOKONCENA' ? faTruck :
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'ZRUSENA' ? faXmark :
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'ZAMITNUTA' ? faXmark :
                      mapUserStatusToSystemCode(getOrderDisplayStatus(detail)) === 'ODESLANA' ? faCheckCircle :
                      faCircleNotch
                    } 
                    style={{ fontSize: '12px' }} 
                  />
                  <span>{getOrderDisplayStatus(detail)}</span>
                </InfoValue>
              </InfoRow>

              {(detail.schvaleni_komentar || detail.odeslani_storno_duvod) && (
                <InfoRow>
                  <InfoLabel>Stav komentář:</InfoLabel>
                  <InfoValue style={{ color: '#64748b' }}>
                    {[detail.schvaleni_komentar, detail.odeslani_storno_duvod].filter(Boolean).join(', ')}
                  </InfoValue>
                </InfoRow>
              )}

              <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.75rem 0' }} />

              <InfoRow>
                <InfoLabel>Datum vytvoření:</InfoLabel>
                <InfoValue>{renderSmartDateInline(detail.dt_vytvoreni)}</InfoValue>
              </InfoRow>

              {detail.dt_schvaleni && (
                <InfoRow>
                  <InfoLabel>Datum schválení:</InfoLabel>
                  <InfoValue style={{ color: '#059669', fontWeight: 500 }}>{renderSmartDateInline(detail.dt_schvaleni)}</InfoValue>
                </InfoRow>
              )}

              {detail.dt_predpokladany_termin_dodani && (
                <InfoRow>
                  <InfoLabel>Termín dodání:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500 }}>{renderSmartDateInline(detail.dt_predpokladany_termin_dodani)}</InfoValue>
                </InfoRow>
              )}

              {detail.dt_potvrzeni_vecne_spravnosti && (
                <InfoRow>
                  <InfoLabel>Potvrzení věc. správnosti:</InfoLabel>
                  <InfoValue style={{ color: '#0891b2', fontWeight: 500 }}>{renderSmartDateInline(detail.dt_potvrzeni_vecne_spravnosti)}</InfoValue>
                </InfoRow>
              )}

              {detail.dt_dokonceni && (
                <InfoRow>
                  <InfoLabel>Datum dokončení:</InfoLabel>
                  <InfoValue style={{ color: '#16a34a', fontWeight: 600 }}>{renderSmartDateInline(detail.dt_dokonceni)}</InfoValue>
                </InfoRow>
              )}

              <InfoRow>
                <InfoLabel>Poslední změna:</InfoLabel>
                <InfoValue>{renderSmartDateInline(detail.dt_aktualizace)}</InfoValue>
              </InfoRow>

              <div style={{ borderTop: '1px solid #d1d5db', margin: '0.75rem 0' }} />

              {/* Uveřejnění v registru - placeholder */}
              <InfoRow>
                <InfoLabel>Uveřejněno v registru:</InfoLabel>
                <InfoValue style={{ fontWeight: 500, color: '#6b7280' }}>
                  {detail.registr_iddt ? 'Ano' : detail.zverejnit ? 'Čeká se' : 'Ne'}
                </InfoValue>
              </InfoRow>
              {detail.dt_zverejneni && (
                <InfoRow>
                  <InfoLabel>Datum zveřejnění:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500, color: '#059669' }}>{renderSmartDateInline(detail.dt_zverejneni)}</InfoValue>
                </InfoRow>
              )}
              {detail.registr_iddt && (
                <InfoRow>
                  <InfoLabel>Kód IDDS:</InfoLabel>
                  <InfoValue style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.95em', color: '#0891b2' }}>
                    {detail.registr_iddt}
                  </InfoValue>
                </InfoRow>
              )}
            </Card>

            {/* 2⃣ FINANČNÍ ÚDAJE */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faInfoCircle} />
                Finanční údaje
              </CardTitle>

              {/* Střediska */}
              {(detail.strediska_nazvy || detail.strediska_kod) && (
                <InfoRow>
                  <InfoLabel>Střediska:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.9em', fontWeight: 500 }}>
                    {detail.strediska_nazvy || detail.strediska_kod}
                  </InfoValue>
                </InfoRow>
              )}

              {/* Způsob financování */}
              {(detail.financovani_display || detail.financovani) && (
                <>
                  <InfoRow>
                    <InfoLabel>Způsob financování:</InfoLabel>
                    <InfoValue style={{ fontWeight: 600, color: '#7c3aed' }}>
                      {detail.financovani_display || detail.financovani}
                    </InfoValue>
                  </InfoRow>

                  {/* LP kódy s detaily - zobrazit POD způsobem financování */}
                  {detail.financovani?.lp_nazvy && Array.isArray(detail.financovani.lp_nazvy) && detail.financovani.lp_nazvy.length > 0 && (
                    <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                      {detail.financovani.lp_nazvy.map((lp, index) => (
                        <div key={index} style={{
                          fontSize: '0.9em',
                          marginBottom: '0.25rem',
                          paddingLeft: '0.5rem',
                          borderLeft: '3px solid #7c3aed',
                          backgroundColor: '#faf5ff',
                          padding: '0.4rem 0.5rem',
                          borderRadius: '0 4px 4px 0'
                        }}>
                          <span style={{ fontWeight: 600, color: '#7c3aed' }}>
                            {lp.cislo_lp || lp.kod || '---'}
                          </span>
                          {lp.nazev && (
                            <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                              – {lp.nazev}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Další dynamická data financování */}
              {detail.financovani && typeof detail.financovani === 'object' && (() => {
                const fin = detail.financovani;
                const skipKeys = ['typ', 'typ_nazev', 'nazev', 'lp_kody', 'lp_nazvy', 'kod_stavu', 'nazev_stavu', 'label'];
                const extraKeys = Object.keys(fin).filter(key => !skipKeys.includes(key) && fin[key] != null);

                return extraKeys.map(key => {
                  const value = fin[key];
                  const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                  const labelMap = {
                    'cislo': 'Číslo',
                    'poznamka': 'Poznámka',
                    'lp_poznamka': 'Poznámka k LP',
                    'cislo_smlouvy': 'Číslo smlouvy',
                    'smlouva_cislo': 'Číslo smlouvy',
                    'poznamka_smlouvy': 'Poznámka smlouvy',
                    'cislo_pojistne_udalosti': 'Číslo pojistné události',
                    'poznamka_pojistne_udalosti': 'Poznámka',
                    'individualni_schvaleni': 'Číslo schválení',
                    'individualni_poznamka': 'Poznámka',
                    'individualni_schvaleni_poznamka': 'Poznámka',
                    'pokladna_cislo': 'Číslo',
                    'pokladna_poznamka': 'Poznámka',
                    'castka': 'Částka',
                    'datum': 'Datum',
                    'schvalovaci_osoba': 'Schvalující osoba'
                  };
                  const label = labelMap[key] || key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

                  return (
                    <InfoRow key={key}>
                      <InfoLabel>{label}:</InfoLabel>
                      <InfoValue style={{ fontSize: '0.9em' }}>
                        {displayValue}
                      </InfoValue>
                    </InfoRow>
                  );
                });
              })()}

              <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.75rem 0' }} />

              <InfoRow>
                <InfoLabel>Max. cena s DPH:</InfoLabel>
                <InfoValue style={{ fontWeight: 700, color: '#059669', fontSize: '1.1em' }}>
                  {formatCurrency(detail.max_cena_s_dph)}
                </InfoValue>
              </InfoRow>

              <InfoRow>
                <InfoLabel>Druh objednávky:</InfoLabel>
                <InfoValue style={{ fontWeight: 500, fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{detail.druh_objednavky_nazev || detail.druh_objednavky_kod || '---'}</span>
                  {(() => {
                    const isMajetek = detail.druh_objednavky_atribut === 1 || 
                                     detail._enriched?.druh_objednavky?.atribut_objektu === 1;
                    
                    return isMajetek ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em'
                      }}>
                        Majetek
                      </span>
                    ) : null;
                  })()}
                </InfoValue>
              </InfoRow>

              {polozky.length > 0 && (
                <>
                  <InfoRow>
                    <InfoLabel>Počet položek:</InfoLabel>
                    <InfoValue style={{ fontWeight: 500 }}>{polozky.length} ks</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>Položky (s DPH):</InfoLabel>
                    <InfoValue style={{ fontWeight: 600, color: '#3b82f6' }}>
                      {formatCurrency(detail.polozky_celkova_cena_s_dph)}
                    </InfoValue>
                  </InfoRow>
                </>
              )}

              <div style={{ borderBottom: '1px solid #e5e7eb', margin: '0.75rem 0' }} />

              {faktury.length > 0 && (
                <>
                  <InfoRow>
                    <InfoLabel>Počet faktur:</InfoLabel>
                    <InfoValue style={{ fontWeight: 500 }}>{faktury.length} ks</InfoValue>
                  </InfoRow>
                </>
              )}

              <div style={{ borderTop: '2px solid #7c3aed', margin: '0.75rem 0' }} />

              {/* DODAVATEL - v rámci Finančních údajů */}
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faTruck} style={{ color: '#ea580c' }} />
                Dodavatel
              </div>

              <InfoRow>
                <InfoLabel>Název:</InfoLabel>
                <InfoValue style={{ fontWeight: 600, color: '#ea580c' }}>
                  {detail.dodavatel_nazev || '---'}
                </InfoValue>
              </InfoRow>

              {detail.dodavatel_ico && (
                <InfoRow>
                  <InfoLabel>IČO:</InfoLabel>
                  <InfoValue>{detail.dodavatel_ico}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_dic && (
                <InfoRow>
                  <InfoLabel>DIČ:</InfoLabel>
                  <InfoValue>{detail.dodavatel_dic}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_adresa && (
                <InfoRow>
                  <InfoLabel>Adresa:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.85em' }}>{detail.dodavatel_adresa}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_kontakt_jmeno && (
                <InfoRow>
                  <InfoLabel>Kontakt:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.85em' }}>{detail.dodavatel_kontakt_jmeno}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_kontakt_email && (
                <InfoRow>
                  <InfoLabel>Email:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.8em', color: '#6b7280' }}>{detail.dodavatel_kontakt_email}</InfoValue>
                </InfoRow>
              )}

              {detail.dodavatel_kontakt_telefon && (
                <InfoRow>
                  <InfoLabel>Telefon:</InfoLabel>
                  <InfoValue style={{ fontSize: '0.85em' }}>{detail.dodavatel_kontakt_telefon}</InfoValue>
                </InfoRow>
              )}
            </Card>

            {/* 3⃣ ODPOVĚDNÉ OSOBY */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faInfoCircle} />
                Odpovědné osoby
              </CardTitle>

              {/* Objednatel */}
              {(detail.objednatel_jmeno || detail.objednatel_prijmeni || detail.uzivatel_jmeno || detail.uzivatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    {/* Label role */}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Objednatel
                    </div>
                    {/* Celé jméno s titulem */}
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {detail.objednatel_jmeno && detail.objednatel_prijmeni
                        ? formatUserName(detail.objednatel_jmeno, detail.objednatel_prijmeni, detail.objednatel_titul_pred, detail.objednatel_titul_za)
                        : formatUserName(detail.uzivatel_jmeno, detail.uzivatel_prijmeni, detail.uzivatel_titul_pred, detail.uzivatel_titul_za)}
                    </div>
                    {/* Email zarovnaný doprava ve druhém sloupci */}
                    {(detail.objednatel_email || detail.uzivatel_email) && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.objednatel_email || detail.uzivatel_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Garant */}
              {(detail.garant_jmeno || detail.garant_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Garant
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.garant_jmeno, detail.garant_prijmeni, detail.garant_titul_pred, detail.garant_titul_za)}
                    </div>
                    {detail.garant_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.garant_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Příkazce */}
              {(detail.prikazce_jmeno || detail.prikazce_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Příkazce
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.prikazce_jmeno, detail.prikazce_prijmeni, detail.prikazce_titul_pred, detail.prikazce_titul_za)}
                    </div>
                    {detail.prikazce_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.prikazce_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Schvalovatel */}
              {(detail.schvalovatel_jmeno || detail.schvalovatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Schvalovatel
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.schvalovatel_jmeno, detail.schvalovatel_prijmeni, detail.schvalovatel_titul_pred, detail.schvalovatel_titul_za)}
                    </div>
                    {detail.schvalovatel_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.schvalovatel_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Odesílatel */}
              {(detail.odesilatel_jmeno || detail.odesilatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Odesílatel
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0891b2' }}>
                      {formatUserName(detail.odesilatel_jmeno, detail.odesilatel_prijmeni, detail.odesilatel_titul_pred, detail.odesilatel_titul_za)}
                    </div>
                    {detail.odesilatel_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.odesilatel_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dodavatel potvrdil */}
              {(detail.dodavatel_potvrdil_jmeno || detail.dodavatel_potvrdil_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Dodavatel potvrdil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0891b2' }}>
                      {formatUserName(detail.dodavatel_potvrdil_jmeno, detail.dodavatel_potvrdil_prijmeni, detail.dodavatel_potvrdil_titul_pred, detail.dodavatel_potvrdil_titul_za)}
                    </div>
                    {detail.dodavatel_potvrdil_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.dodavatel_potvrdil_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Zveřejnil */}
              {(detail.zverejnil_jmeno || detail.zverejnil_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Zveřejnil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0891b2' }}>
                      {formatUserName(detail.zverejnil_jmeno, detail.zverejnil_prijmeni, detail.zverejnil_titul_pred, detail.zverejnil_titul_za)}
                    </div>
                    {detail.zverejnil_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.zverejnil_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fakturant */}
              {(detail.fakturant_jmeno || detail.fakturant_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Fakturant
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#7c3aed' }}>
                      {formatUserName(detail.fakturant_jmeno, detail.fakturant_prijmeni, detail.fakturant_titul_pred, detail.fakturant_titul_za)}
                    </div>
                    {detail.fakturant_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.fakturant_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Potvrdil věcnou správnost */}
              {(detail.potvrdil_vecnou_spravnost_jmeno || detail.potvrdil_vecnou_spravnost_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Potvrdil věcnou správnost
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0891b2' }}>
                      {formatUserName(detail.potvrdil_vecnou_spravnost_jmeno, detail.potvrdil_vecnou_spravnost_prijmeni, detail.potvrdil_vecnou_spravnost_titul_pred, detail.potvrdil_vecnou_spravnost_titul_za)}
                    </div>
                    {detail.potvrdil_vecnou_spravnost_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.potvrdil_vecnou_spravnost_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dokončil objednávku */}
              {(detail.dokoncil_jmeno || detail.dokoncil_prijmeni) && (
                <div style={{ marginBottom: '0rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0 1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Dokončil objednávku
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>
                      {formatUserName(detail.dokoncil_jmeno, detail.dokoncil_prijmeni, detail.dokoncil_titul_pred, detail.dokoncil_titul_za)}
                    </div>
                    {detail.dokoncil_email && (
                      <div style={{ gridColumn: '2', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {detail.dokoncil_email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* 4⃣ WORKFLOW KROKY */}
            <Card>
              <CardTitle>
                <FontAwesomeIcon icon={faProjectDiagram} />
                Workflow
              </CardTitle>

              {/* 1. Vytvořil/Objednatel */}
              {(detail.objednatel_jmeno || detail.objednatel_prijmeni || detail.uzivatel_jmeno || detail.uzivatel_prijmeni) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#3b82f6' }}>
                      1. {detail.objednatel_jmeno ? 'Objednatel' : 'Vytvořil'}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {detail.objednatel_jmeno && detail.objednatel_prijmeni 
                        ? formatUserName(detail.objednatel_jmeno, detail.objednatel_prijmeni, detail.objednatel_titul_pred, detail.objednatel_titul_za)
                        : formatUserName(detail.uzivatel_jmeno, detail.uzivatel_prijmeni, detail.uzivatel_titul_pred, detail.uzivatel_titul_za)}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_vytvoreni && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {renderSmartDateInline(detail.dt_vytvoreni)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Schválil */}
              {(detail.schvalovatel_jmeno || detail.schvalovatel_prijmeni) && detail.dt_schvaleni && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#059669' }}>
                      2. Schválil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.schvalovatel_jmeno, detail.schvalovatel_prijmeni, detail.schvalovatel_titul_pred, detail.schvalovatel_titul_za)}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_schvaleni && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {renderSmartDateInline(detail.dt_schvaleni)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Odeslal dodavateli */}
              {(detail.odesilatel_jmeno || detail.odesilatel_prijmeni || detail.dt_odeslani) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#0891b2' }}>
                      3. Odeslal dodavateli
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {(detail.odesilatel_jmeno || detail.odesilatel_prijmeni) 
                        ? formatUserName(detail.odesilatel_jmeno, detail.odesilatel_prijmeni, detail.odesilatel_titul_pred, detail.odesilatel_titul_za)
                        : '---'}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_odeslani && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {renderDateOnlyInline(detail.dt_odeslani)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Dodavatel potvrdil */}
              {(detail.dodavatel_potvrdil_jmeno || detail.dodavatel_potvrdil_prijmeni || detail.dt_akceptace) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#7c3aed' }}>
                      4. Dodavatel potvrdil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {(detail.dodavatel_potvrdil_jmeno || detail.dodavatel_potvrdil_prijmeni) 
                        ? formatUserName(detail.dodavatel_potvrdil_jmeno, detail.dodavatel_potvrdil_prijmeni, detail.dodavatel_potvrdil_titul_pred, detail.dodavatel_potvrdil_titul_za)
                        : '---'}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_akceptace && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {renderDateOnlyInline(detail.dt_akceptace)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Zveřejnil */}
              {(detail.zverejnil_jmeno || detail.zverejnil_prijmeni) && detail.dt_zverejneni && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#f59e0b' }}>
                      5. Zveřejnil
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.zverejnil_jmeno, detail.zverejnil_prijmeni, detail.zverejnil_titul_pred, detail.zverejnil_titul_za)}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_zverejneni && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {renderSmartDateInline(detail.dt_zverejneni)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6.-7. Přidání faktur, ověření věcné správnosti */}
              {detail.faktury && detail.faktury.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#ea580c', marginBottom: '0.5rem' }}>
                    6.-7. Přidání faktur, ověření věcné správnosti
                  </div>
                  {detail.faktury
                    .filter(f => f.dt_vytvoreni)
                    .sort((a, b) => new Date(a.dt_vytvoreni) - new Date(b.dt_vytvoreni))
                    .map((faktura, index) => (
                      <div key={faktura.id || index} style={{ marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #ea580c', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                        {/* Řádek faktury */}
                        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start', marginBottom: '0.25rem' }}>
                          <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>
                            FA VS: {faktura.fa_cislo_vema || 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                            {faktura.vytvoril_jmeno && faktura.vytvoril_prijmeni 
                              ? formatUserName(faktura.vytvoril_jmeno, faktura.vytvoril_prijmeni, faktura.vytvoril_titul_pred, faktura.vytvoril_titul_za)
                              : detail.fakturant_jmeno && detail.fakturant_prijmeni
                              ? formatUserName(detail.fakturant_jmeno, detail.fakturant_prijmeni, detail.fakturant_titul_pred, detail.fakturant_titul_za)
                              : 'Neznámý'}
                          </div>
                          
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {renderSmartDateInline(faktura.dt_vytvoreni)}
                          </div>
                          <div></div>
                        </div>
                        
                        {/* Věcná správnost */}
                        {faktura.dt_potvrzeni_vecne_spravnosti && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                              <div style={{ fontSize: '0.75rem', color: '#0891b2', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>✓</span>
                                <span>Věcná správnost</span>
                              </div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                {faktura.potvrdil_vecnou_spravnost_jmeno && faktura.potvrdil_vecnou_spravnost_prijmeni
                                  ? formatUserName(faktura.potvrdil_vecnou_spravnost_jmeno, faktura.potvrdil_vecnou_spravnost_prijmeni, faktura.potvrdil_vecnou_spravnost_titul_pred, faktura.potvrdil_vecnou_spravnost_titul_za)
                                  : detail.potvrdil_vecnou_spravnost_jmeno && detail.potvrdil_vecnou_spravnost_prijmeni
                                  ? formatUserName(detail.potvrdil_vecnou_spravnost_jmeno, detail.potvrdil_vecnou_spravnost_prijmeni, detail.potvrdil_vecnou_spravnost_titul_pred, detail.potvrdil_vecnou_spravnost_titul_za)
                                  : '---'}
                              </div>
                              
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {renderSmartDateInline(faktura.dt_potvrzeni_vecne_spravnosti)}
                              </div>
                              <div></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* 7. Dokončil objednávku */}
              {(detail.dokoncil_jmeno || detail.dokoncil_prijmeni) && detail.dt_dokonceni && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.5rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Jméno */}
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#16a34a' }}>
                      7. Dokončil objednávku
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {formatUserName(detail.dokoncil_jmeno, detail.dokoncil_prijmeni, detail.dokoncil_titul_pred, detail.dokoncil_titul_za)}
                    </div>
                    
                    {/* Řádek 2: Datum */}
                    {detail.dt_dokonceni && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {renderSmartDateInline(detail.dt_dokonceni)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* POSLEDNÍ ZMĚNA - BEZ ČÍSLA */}
              {(detail.uzivatel_aktualizace_jmeno || detail.uzivatel_aktualizace_prijmeni) && detail.dt_aktualizace && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.25rem 1rem', alignItems: 'start' }}>
                    {/* Řádek 1: Název | Datum */}
                    <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Poslední změna
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>
                      {formatDateOnly(detail.dt_aktualizace)}
                    </div>
                    
                    {/* Řádek 2: Celé jméno | Čas */}
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
                      {formatUserName(detail.uzivatel_aktualizace_jmeno, detail.uzivatel_aktualizace_prijmeni, detail.uzivatel_aktualizace_titul_pred, detail.uzivatel_aktualizace_titul_za)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                      {formatTimeOnly(detail.dt_aktualizace)}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </Grid>

          {/* Bottom Section: Layout 1|3, 2|3 (Položky | Faktury, Přílohy OBJ | Faktury) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: '0.75rem',
            marginBottom: '0.75rem'
          }}>
            {/* 6⃣ POL OBJ - POLOŽKY OBJEDNÁVKY (1. řádek, levý sloupec) */}
            <Card style={{ gridColumn: '1', gridRow: '1' }}>
              <CardTitle>
                <FontAwesomeIcon icon={faBox} />
                Položky objednávky ({polozky.length})
              </CardTitle>
              {polozky.length === 0 ? (
                <EmptyState>Žádné položky</EmptyState>
              ) : (
                <ItemsTable>
                  <thead>
                    <tr>
                      <ItemsTh style={{ textAlign: 'left' }}>Popis</ItemsTh>
                      <ItemsTh className="numeric">Cena bez DPH</ItemsTh>
                      <ItemsTh className="numeric">Sazba DPH</ItemsTh>
                      <ItemsTh className="numeric">Cena s DPH</ItemsTh>
                    </tr>
                  </thead>
                  <tbody>
                    {polozky.map((item, index) => (
                      <React.Fragment key={index}>
                        <tr>
                          <ItemsTd style={{ textAlign: 'left' }}>
                            <div style={{ marginBottom: '0.5rem' }}>{item.popis || '---'}</div>
                            
                            {/* Úsek / Budova / Místnost */}
                            {(item.usek_kod || item.budova_kod || item.mistnost_kod) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '0.35rem' }}>
                                {item.usek_kod && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    fontSize: '0.7em',
                                    fontWeight: 500,
                                    backgroundColor: '#f3e8ff',
                                    color: '#6b21a8',
                                    borderRadius: '4px',
                                    border: '1px solid #d8b4fe'
                                  }}>
                                    Úsek: {item.usek_kod}
                                  </span>
                                )}
                                {item.budova_kod && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    fontSize: '0.7em',
                                    fontWeight: 500,
                                    backgroundColor: '#dbeafe',
                                    color: '#1e40af',
                                    borderRadius: '4px',
                                    border: '1px solid #93c5fd'
                                  }}>
                                    Budova: {item.budova_kod}
                                  </span>
                                )}
                                {item.mistnost_kod && (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    fontSize: '0.7em',
                                    fontWeight: 500,
                                    backgroundColor: '#dbeafe',
                                    color: '#1e40af',
                                    borderRadius: '4px',
                                    border: '1px solid #93c5fd'
                                  }}>
                                    Místnost: {item.mistnost_kod}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Poznámka lokalizace z JSON */}
                            {(() => {
                              try {
                                const poznamkaData = item.poznamka ? JSON.parse(item.poznamka) : null;
                                if (poznamkaData?.poznamka_lokalizace) {
                                  return (
                                    <div style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#64748b',
                                      marginBottom: '0.35rem',
                                      fontStyle: 'italic'
                                    }}>
                                      <strong>Poznámka:</strong> {poznamkaData.poznamka_lokalizace}
                                    </div>
                                  );
                                }
                              } catch (e) {
                                // Pokud poznamka není JSON, zobrazíme ji jako plain text
                                if (item.poznamka) {
                                  return (
                                    <div style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#64748b',
                                      marginBottom: '0.35rem',
                                      fontStyle: 'italic'
                                    }}>
                                      💬 {item.poznamka}
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                            
                            {/* LP kódy */}
                            {item.lppts_cislo && (
                              <div>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  fontSize: '0.7em',
                                  fontWeight: 500,
                                  backgroundColor: '#f3e8ff',
                                  color: '#6b21a8',
                                  borderRadius: '4px',
                                  border: '1px solid #d8b4fe'
                                }}>
                                  {item.lppts_cislo}{item.lppts_nazev ? ` - ${item.lppts_nazev}` : ''}
                                </span>
                              </div>
                            )}
                          </ItemsTd>
                          <ItemsTd className="numeric currency">
                            {formatCurrency(item.cena_bez_dph)}
                          </ItemsTd>
                          <ItemsTd className="numeric">
                            {item.sazba_dph ? `${item.sazba_dph}%` : '---'}
                          </ItemsTd>
                          <ItemsTd className="numeric currency">
                            {formatCurrency(item.cena_s_dph)}
                          </ItemsTd>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </ItemsTable>
              )}
            </Card>

            {/* 7⃣ FAKTURY VC. PŘÍLOH (pravý sloupec, přes oba řádky) */}
            <Card style={{ gridColumn: '2', gridRow: '1 / 3' }}>
              <CardTitle>
                <FontAwesomeIcon icon={faFileInvoice} />
                Faktury vc. příloh ({faktury.length})
              </CardTitle>
              {faktury.length === 0 ? (
                <EmptyState>Žádné faktury</EmptyState>
              ) : (
                faktury.map((invoice, index) => {
                  // Přílohy této konkrétní faktury
                  const invoiceAttachments = invoice.prilohy || [];
                  const invoiceStatus = normalizeInvoiceStatus(invoice.stav);
                  
                  return (
                  <InvoiceItem key={index}>
                    <InvoiceHeader>
                      <InvoiceNumber>
                        FA VS: {invoice.fa_cislo_vema || invoice.id || 'N/A'}
                      </InvoiceNumber>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <InvoiceAmount>
                          {formatCurrency(invoice.fa_castka)}
                        </InvoiceAmount>
                        {invoice.stav && (
                          <InvoiceStatusBadge 
                            $success={['ZAPLACENA', 'ZAPLACENO', 'DOKONCENA'].includes(invoiceStatus)}
                            $warning={['NEZAPLACENA', 'NOVA', 'ZAEVIDOVANA', 'VECNA_SPRAVNOST', 'V_RESENI', 'PREDANA_PO', 'K_ZAPLACENI'].includes(invoiceStatus)}
                          >
                            {['ZAPLACENA', 'ZAPLACENO', 'DOKONCENA'].includes(invoiceStatus) && <FontAwesomeIcon icon={faCheckCircle} />}
                            {['NEZAPLACENA', 'NOVA', 'ZAEVIDOVANA', 'VECNA_SPRAVNOST', 'V_RESENI', 'PREDANA_PO', 'K_ZAPLACENI'].includes(invoiceStatus) && <FontAwesomeIcon icon={faHourglassHalf} />}
                            {invoiceStatus === 'STORNO' && <FontAwesomeIcon icon={faTimesCircle} />}
                            {getInvoiceStatusLabel(invoice.stav)}
                          </InvoiceStatusBadge>
                        )}
                      </div>
                    </InvoiceHeader>
                    {(invoice.vytvoril_jmeno || invoice.vytvoril_prijmeni) && (
                      <InvoiceDetail style={{ fontWeight: 500 }}>
                        <span style={{ color: '#6b7280', fontWeight: 600 }}>Evidoval:</span> <span style={{ color: '#1e293b', fontWeight: 600 }}>{formatUserName(invoice.vytvoril_jmeno, invoice.vytvoril_prijmeni, invoice.vytvoril_titul_pred, invoice.vytvoril_titul_za)}</span>
                      </InvoiceDetail>
                    )}
                    {(invoice.fa_datum_doruceni || invoice.fa_datum_vystaveni || invoice.fa_datum_splatnosti) && (
                      <InvoiceDetail>
                        {invoice.fa_datum_doruceni && (
                          <span>Doručeno: {formatDate(invoice.fa_datum_doruceni)}</span>
                        )}
                        {invoice.fa_datum_doruceni && invoice.fa_datum_vystaveni && (
                          <span> | </span>
                        )}
                        {invoice.fa_datum_vystaveni && (
                          <span>Vystaveno: {formatDate(invoice.fa_datum_vystaveni)}</span>
                        )}
                        {invoice.fa_datum_vystaveni && invoice.fa_datum_splatnosti && (
                          <span> | </span>
                        )}
                        {!invoice.fa_datum_vystaveni && invoice.fa_datum_doruceni && invoice.fa_datum_splatnosti && (
                          <span> | </span>
                        )}
                        {invoice.fa_datum_splatnosti && (
                          <span>Splatnost: {formatDate(invoice.fa_datum_splatnosti)}</span>
                        )}
                      </InvoiceDetail>
                    )}
                    {invoice.dt_potvrzeni_vecne_spravnosti && (
                      <InvoiceDetail>
                        <span style={{ color: '#0891b2', fontWeight: 600 }}>Věcná správnost:</span> <span style={{ color: '#64748b' }}>{formatDateTime(invoice.dt_potvrzeni_vecne_spravnosti)}</span>
                        {(invoice.potvrdil_vecnou_spravnost_jmeno || invoice.potvrdil_vecnou_spravnost_prijmeni) && (
                          <span style={{ color: '#0891b2', fontWeight: 500 }}> - {formatUserName(invoice.potvrdil_vecnou_spravnost_jmeno, invoice.potvrdil_vecnou_spravnost_prijmeni, invoice.potvrdil_vecnou_spravnost_titul_pred, invoice.potvrdil_vecnou_spravnost_titul_za)}</span>
                        )}
                      </InvoiceDetail>
                    )}
                    {invoice.vecna_spravnost_poznamka && (
                      <InvoiceDetail style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.8rem' }}>
                        <strong>Poznámka VS:</strong> {invoice.vecna_spravnost_poznamka}
                      </InvoiceDetail>
                    )}
                    {invoice.fa_poznamka && (
                      <InvoiceDetail style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.8rem' }}>
                        <strong>Poznámka:</strong> {invoice.fa_poznamka}
                      </InvoiceDetail>
                    )}

                    {/* 📎 PŘÍLOHY TÉTO FAKTURY - zobrazeny přímo ve struktuře faktura+přílohy */}
                    {invoiceAttachments.length > 0 && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        paddingTop: '0.75rem', 
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          color: '#6b7280', 
                          marginBottom: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}>
                          <FontAwesomeIcon icon={faPaperclip} />
                          Přílohy FA VS: {invoice.fa_cislo_vema || invoice.id || 'N/A'} ({invoiceAttachments.length})
                        </div>
                        <AttachmentsList>
                          {invoiceAttachments.map((attachment, attIdx) => {
                            const fileName = attachment.originalni_nazev_souboru || 'Příloha';
                            const icon = getFileIcon(fileName);
                            const colors = getFileIconColor(fileName);
                            const fileExists = attachment.file_exists !== false;
                            
                            return (
                              <AttachmentItem
                                key={attIdx}
                                as="div"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (fileExists) {
                                    handleDownloadAttachment(attachment, order.id);
                                  }
                                }}
                                style={{
                                  opacity: fileExists ? 1 : 0.6,
                                  border: fileExists ? undefined : '1px solid #ef4444',
                                  cursor: fileExists ? 'pointer' : 'not-allowed'
                                }}
                              >
                                <AttachmentIcon $bg={colors.bg} $color={colors.color}>
                                  <FontAwesomeIcon icon={icon} />
                                </AttachmentIcon>
                                <AttachmentInfo>
                                  <AttachmentName>
                                    {!fileExists && (
                                      <span style={{ color: '#ef4444', marginRight: '6px' }}>
                                        <FontAwesomeIcon icon={faExclamationTriangle} />
                                      </span>
                                    )}
                                    {fileName}
                                    {attachment.typ_prilohy && (
                                      <AttachmentTypeBadge style={{ marginLeft: '8px' }}>
                                        {getAttachmentTypeLabel(attachment.typ_prilohy, 'fa')}
                                      </AttachmentTypeBadge>
                                    )}
                                  </AttachmentName>
                                  <AttachmentMeta style={{ color: fileExists ? undefined : '#ef4444' }}>
                                    {!fileExists && <span style={{ fontWeight: 600 }}>⚠️ Soubor nenalezen • </span>}
                                    {(attachment.nahrano_jmeno || attachment.nahrano_prijmeni) ? (
                                      <span style={{ fontWeight: 500 }}>{formatUserName(attachment.nahrano_jmeno, attachment.nahrano_prijmeni, attachment.nahrano_titul_pred, attachment.nahrano_titul_za)}</span>
                                    ) : attachment.nahrano_uzivatel_id ? (
                                      <span>Uživatel #{attachment.nahrano_uzivatel_id}</span>
                                    ) : (
                                      <span>Neznámý uživatel</span>
                                    )}
                                    {attachment.dt_vytvoreni && (
                                      <span style={{ color: '#94a3b8' }}> • {formatDateTime(attachment.dt_vytvoreni)}</span>
                                    )}
                                    {attachment.velikost_souboru_b && (
                                      <span> • {Math.round(attachment.velikost_souboru_b / 1024)} KB</span>
                                    )}
                                  </AttachmentMeta>
                                </AttachmentInfo>
                                {attachment.systemova_cesta && fileExists && (
                                  <AttachmentDownload>
                                    <FontAwesomeIcon icon={faDownload} />
                                  </AttachmentDownload>
                                )}
                              </AttachmentItem>
                            );
                          })}
                        </AttachmentsList>
                      </div>
                    )}
                  </InvoiceItem>
                  );
                })
              )}
            </Card>

            {/* 8⃣ PŘÍLOHY OBJEDNÁVKY (2. řádek, levý sloupec) */}
            <Card style={{ gridColumn: '1', gridRow: '2' }}>
              <CardTitle>
                <FontAwesomeIcon icon={faPaperclip} />
                Přílohy objednávky ({prilohy.length})
              </CardTitle>
            {prilohy.length === 0 ? (
              <EmptyState>Žádné přílohy</EmptyState>
            ) : (
              <AttachmentsList>
                {prilohy.map((attachment, index) => {
                  const fileName = attachment.originalni_nazev_souboru || 'Příloha';
                  const icon = getFileIcon(fileName);
                  const colors = getFileIconColor(fileName);
                  const fileExists = attachment.file_exists !== false; // default true pro kompatibilitu
                  
                  return (
                    <AttachmentItem
                      key={index}
                      as="div"
                      onClick={(e) => {
                        e.preventDefault();
                        if (fileExists) {
                          handleDownloadAttachment(attachment, order.id);
                        }
                      }}
                      style={{
                        opacity: fileExists ? 1 : 0.6,
                        border: fileExists ? undefined : '1px solid #ef4444',
                        cursor: fileExists ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <AttachmentIcon $bg={colors.bg} $color={colors.color}>
                        <FontAwesomeIcon icon={icon} />
                      </AttachmentIcon>
                      <AttachmentInfo>
                        <AttachmentName>
                          {!fileExists && (
                            <span style={{ color: '#ef4444', marginRight: '6px' }}>
                              <FontAwesomeIcon icon={faExclamationTriangle} />
                            </span>
                          )}
                          {fileName}
                          {attachment.typ_prilohy && (
                            <AttachmentTypeBadge style={{ marginLeft: '8px' }}>
                              {getAttachmentTypeLabel(attachment.typ_prilohy, 'obj')}
                            </AttachmentTypeBadge>
                          )}
                        </AttachmentName>
                        <AttachmentMeta style={{ color: fileExists ? undefined : '#ef4444' }}>
                          {!fileExists && <span style={{ fontWeight: 600 }}>⚠️ Soubor nenalezen • </span>}
                          {(attachment.nahral_jmeno || attachment.nahral_prijmeni) ? (
                            <span style={{ fontWeight: 500 }}>{formatUserName(attachment.nahral_jmeno, attachment.nahral_prijmeni, attachment.nahral_titul_pred, attachment.nahral_titul_za)}</span>
                          ) : attachment.nahrano_uzivatel_id ? (
                            <span>Uživatel #{attachment.nahrano_uzivatel_id}</span>
                          ) : (
                            <span>Neznámý uživatel</span>
                          )}
                          {attachment.dt_vytvoreni && (
                            <span style={{ color: '#94a3b8' }}> • {formatDateTime(attachment.dt_vytvoreni)}</span>
                          )}
                          {attachment.velikost_souboru_b && (
                            <span> • {Math.round(attachment.velikost_souboru_b / 1024)} KB</span>
                          )}
                        </AttachmentMeta>
                      </AttachmentInfo>
                      {attachment.systemova_cesta && fileExists && (
                        <AttachmentDownload>
                          <FontAwesomeIcon icon={faDownload} />
                        </AttachmentDownload>
                      )}
                    </AttachmentItem>
                  );
                })}
              </AttachmentsList>
            )}
          </Card>
          </div>

          {/* 💬 KOMENTÁŘE K OBJEDNÁVCE (full width) */}
          <Card style={{ marginTop: '0.75rem' }}>
            <CardTitle>
              <FontAwesomeIcon icon={faComment} />
              Komentáře k objednávce ({order.comments_count || comments.length || 0})
              <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <InlineCommentsSearchWrapper>
                  <InlineCommentsSearchInput
                    value={commentsSearchQuery}
                    onChange={(e) => setCommentsSearchQuery(e.target.value)}
                    placeholder="Hledat v komentářích…"
                    title="Hledat v komentářích (autor + text)"
                  />
                  {!!(commentsSearchQuery || '').trim() && (
                    <InlineCommentsSearchClearButton
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentsSearchQuery('');
                      }}
                      title="Vymazat"
                      aria-label="Vymazat hledání"
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </InlineCommentsSearchClearButton>
                  )}
                </InlineCommentsSearchWrapper>

                <SmartTooltip text="Obnovit komentáře z databáze" icon="info" preferredPosition="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadInlineComments();
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      borderRadius: '6px',
                      padding: '0.25rem 0.4rem',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                    title="Refresh"
                  >
                    <FontAwesomeIcon icon={faSync} spin={commentsLoading} />
                  </button>
                </SmartTooltip>

                <SmartTooltip text={isCommentsBlockExpanded ? 'Sbalit blok komentářů' : 'Rozbalit blok komentářů'} icon="info" preferredPosition="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCommentsBlockExpanded((v) => !v);
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      borderRadius: '6px',
                      padding: '0.25rem 0.4rem',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                    title={isCommentsBlockExpanded ? 'Sbalit' : 'Rozbalit'}
                  >
                    <FontAwesomeIcon icon={isCommentsBlockExpanded ? faChevronUp : faChevronDown} />
                  </button>
                </SmartTooltip>
              </span>
            </CardTitle>

            {isCommentsBlockExpanded && commentsLoading && (
              <div style={{ padding: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faSpinner} spin />
                Načítání komentářů...
              </div>
            )}

            {isCommentsBlockExpanded && !commentsLoading && commentsError && (
              <div style={{ padding: '1rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {commentsError}
              </div>
            )}

            {isCommentsBlockExpanded && !commentsLoading && !commentsError && rootThreads.length === 0 && (
              <EmptyState>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <FontAwesomeIcon icon={faComment} style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }} />
                  <div>
                    {(commentsSearchQuery || '').trim()
                      ? 'Žádné výsledky pro hledání.'
                      : 'Zatím žádné komentáře.'}
                  </div>
                </div>
              </EmptyState>
            )}

            {isCommentsBlockExpanded && !commentsLoading && !commentsError && rootThreads.length > 0 && (
              <InlineCommentsTimeline>
                {rootThreads.map((root) => {
                  const renderNode = (node, depth = 0, visited = new Set()) => {
                    if (!node) return null;
                    if (visited.has(node.id)) return null;
                    visited.add(node.id);

                    const children = getChildren(node.id);
                    const text = node.obsah_plain || node.obsah || '';
                    const partnerId = node.partner_id || node.partnerId || null;
                    const parent = node.parent_comment_id ? commentsById.get(node.parent_comment_id) : null;
                    const replyingTo = parent?.autor_jmeno || parent?.autor_username || null;

                    const isOwn = (() => {
                      const a = (node.autor_username || '').toString().toLowerCase();
                      const u = (username || '').toString().toLowerCase();
                      return a && u && a === u;
                    })();

                    const isReply = depth > 0;

                    const content = (
                      <>
                        <InlineCommentHeader>
                          <InlineCommentAuthor title={node.autor_jmeno || node.autor_username || ''}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {node.autor_jmeno || node.autor_username || 'Neznámý'}
                            </span>
                            {partnerId && <PartnerBadge>Partner #{partnerId}</PartnerBadge>}
                          </InlineCommentAuthor>
                          <InlineCommentDate>{renderSmartDateInline(node.dt_vytvoreni)}</InlineCommentDate>
                        </InlineCommentHeader>

                        {replyingTo && (
                          <div style={{ marginTop: '-0.25rem', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                            Odpověď na: <span style={{ fontWeight: 700, color: '#64748b' }}>{replyingTo}</span>
                          </div>
                        )}

                        <InlineCommentText>{text}</InlineCommentText>
                      </>
                    );

                    return (
                      <div key={node.id}>
                        {isReply ? (
                          <InlineReplyItem>{content}</InlineReplyItem>
                        ) : (
                          <InlineCommentItem $isOwn={isOwn}>{content}</InlineCommentItem>
                        )}

                        {children.length > 0 && (
                          <InlineRepliesWrapper>
                            {children.map((child) => renderNode(child, depth + 1, new Set(visited)))}
                          </InlineRepliesWrapper>
                        )}
                      </div>
                    );
                  };

                  return renderNode(root, 0, new Set());
                })}
              </InlineCommentsTimeline>
            )}
          </Card>

          {/* Workflow (pokud existuje) */}
          {workflow && workflow.length > 0 && (
            <Card style={{ marginTop: '0.75rem' }}>
              <CardTitle>
                <FontAwesomeIcon icon={faProjectDiagram} />
                Průběh workflow ({workflow.length} kroků)
              </CardTitle>
              <WorkflowSteps>
                {workflow.map((step, index) => {
                  const status = step.stav === 'schvaleno' 
                    ? 'completed' 
                    : step.stav === 'zamitnuto' 
                    ? 'rejected' 
                    : step.je_aktualni 
                    ? 'current' 
                    : 'pending';
                  
                  return (
                    <WorkflowStep key={index} $status={status}>
                      <WorkflowIcon $status={status}>
                        <FontAwesomeIcon 
                          icon={
                            status === 'completed' ? faCheckCircle :
                            status === 'rejected' ? faTimesCircle :
                            status === 'current' ? faSpinner :
                            faInfoCircle
                          }
                        />
                      </WorkflowIcon>
                      <WorkflowContent>
                        <WorkflowTitle>
                          {step.nazev_kroku || `Krok ${index + 1}`}
                        </WorkflowTitle>
                        {step.schvalil_uzivatel && (
                          <WorkflowMeta>
                            {step.schvalil_uzivatel}{' '}
                            <span style={{ color: '#cbd5e1' }}>•</span>{' '}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <FontAwesomeIcon icon={getSmartDateIcon(step.datum_schvaleni)} style={{ color: '#94a3b8' }} />
                              {formatSmartDate(step.datum_schvaleni)}
                            </span>
                          </WorkflowMeta>
                        )}
                        {step.poznamka && (
                          <WorkflowMeta style={{ marginTop: '0.25rem' }}>
                            {step.poznamka}
                          </WorkflowMeta>
                        )}
                      </WorkflowContent>
                    </WorkflowStep>
                  );
                })}
              </WorkflowSteps>
            </Card>
          )}
        </ExpandedContent>
      </ExpandedCell>
    </ExpandedRow>

    {/* 🖼️ AttachmentViewer Modal */}
    {viewerAttachment && (
      <AttachmentViewer
        attachment={viewerAttachment}
        closeOnOverlayClick={false}
        onClose={() => {
          // Cleanup blob URL při zavření vieweru
          if (viewerAttachment.blobUrl && viewerAttachment.blobUrl.startsWith('blob:')) {
            window.URL.revokeObjectURL(viewerAttachment.blobUrl);
          }
          setViewerAttachment(null);
        }}
      />
    )}
    </>
  );
};

export default OrderExpandedRowV3;
