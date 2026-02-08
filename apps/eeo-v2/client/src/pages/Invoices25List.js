import React, { useEffect, useState, useMemo, useContext, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { ToastContext } from '../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice, faSearch, faFilter, faTimes, faPlus, faEdit, faEye, faTrash,
  faDownload, faSyncAlt, faChevronDown, faChevronUp, faEraser,
  faCalendarAlt, faCalendarCheck, faUser, faBuilding, faMoneyBillWave, faPaperclip, 
  faFileAlt, faCheckCircle, faExclamationTriangle, faHourglassHalf,
  faDatabase, faCheck, faTimesCircle, faDashboard, faMoneyBill, faIdCard, faFileContract,
  faLock, faEnvelope, faPhone, faClock, faUnlink, faCheckSquare, faSquare, faEyeSlash, faCoins
} from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';
import { prettyDate, formatDateOnly } from '../utils/format';
import { translateErrorMessage } from '../utils/errorTranslation';
import { TooltipWrapper } from '../styles/GlobalTooltip';
import '../styles/tableFiltersImprovement.css';
import DatePicker from '../components/DatePicker';
import { CustomSelect } from '../components/CustomSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import SlideInDetailPanel from '../components/UniversalSearch/SlideInDetailPanel';
import InvoiceStatusSelect from '../components/InvoiceStatusSelect';
import InvoiceAttachmentsTooltip from '../components/invoices/InvoiceAttachmentsTooltip';
import OrderAttachmentsTooltip from '../components/orders/OrderAttachmentsTooltip';
import AttachmentViewer from '../components/invoices/AttachmentViewer';
import OperatorInput from '../components/OperatorInput';
import { listInvoices25, listInvoiceAttachments25, deleteInvoiceV2, restoreInvoiceV2, updateInvoiceV2 } from '../services/api25invoices';
import { getInvoiceTypes25, getOrdersList25 } from '../services/api25orders';
import { getOrderV2 } from '../services/apiOrderV2';
import { toggleInvoiceCheck, getInvoiceChecks } from '../services/apiInvoiceCheck';

// =============================================================================
// STYLED COMPONENTS - PŘESNĚ PODLE ORDERS25LIST
// =============================================================================

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

// 💰 Roční poplatky badge
const InfoIconBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: 50%;
  color: white;
  font-size: 11px;
  margin-left: 8px;
  cursor: help;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.15);
    box-shadow: 0 4px 8px rgba(245, 158, 11, 0.4);
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

const Container = styled.div`
  position: relative;
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
  isolation: isolate;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Year Filter Panel (prominent position above main header)
const YearFilterPanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  color: white;
  position: relative;
  z-index: 9999;
`;

const YearFilterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const YearFilterTitle = styled.h2`
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const YearFilterLabel = styled.label`
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const YearFilterSelect = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  option {
    background: #1e40af;
    color: white;
    padding: 0.5rem;
  }
`;

const RefreshIconButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  width: 42px;
  height: 42px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  margin-left: 0.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

// 🔍 Search Panel styled components
const SearchPanel = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SearchPanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SearchPanelTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  > svg {
    color: #3b82f6;
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
  
  &:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// 🔧 ADMIN: Checkbox pro zobrazení neaktivních faktur
const AdminCheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #fef3c7;
  border: 2px solid #fbbf24;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #92400e;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  
  &:hover {
    background: #fde68a;
    border-color: #f59e0b;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
  }
  
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #f59e0b;
  }
  
  svg {
    color: #d97706;
    font-size: 1rem;
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;
  
  > svg:first-of-type {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    z-index: 1;
    pointer-events: none;
    font-size: 1.1rem;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.875rem 3rem 0.875rem 3rem;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`;

const SearchHint = styled.div`
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #64748b;
  font-style: italic;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  padding-bottom: 1rem;
  border-bottom: 3px solid #e5e7eb;
  margin-bottom: 1.5rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background: ${props => props.$primary ? '#3b82f6' : 'white'};
  color: ${props => props.$primary ? 'white' : '#3b82f6'};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$primary ? '#2563eb' : '#eff6ff'};
    border-color: ${props => props.$primary ? '#2563eb' : '#2563eb'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

// Dashboard Panel
const DashboardPanel = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(350px, 400px) repeat(auto-fit, minmax(180px, 220px));
  gap: clamp(0.8rem, 1.5vw, 1.65rem);
  margin-bottom: 1.5rem;
  align-items: start;
  justify-content: start;
  overflow-x: auto;

  @media (max-width: 1400px) {
    grid-template-columns: minmax(320px, 350px) repeat(auto-fit, minmax(160px, 200px));
  }

  @media (max-width: 1200px) {
    grid-template-columns: minmax(300px, 330px) repeat(auto-fit, minmax(150px, 180px));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
`;

const DashboardCard = styled.div`
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  padding: clamp(0.8rem, 1vw, 1rem);
  border-radius: 12px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);
  border-left: ${props => props.$isActive ? '6px' : '4px'} solid ${props => props.$color || '#3b82f6'};
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: clamp(90px, 10vh, 115px);
  min-width: clamp(160px, 17vw, 210px);

  /* Subtle shine effect */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.15) 50%,
      transparent 70%
    );
    transform: rotate(45deg);
    transition: opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.06);
    ${props => !props.$isActive && `
      background: linear-gradient(145deg, ${props.$color || '#3b82f6'}15, ${props.$color || '#3b82f6'}08);
    `}

    &::before {
      opacity: 1;
    }
  }
  
  /* Aktivní stav */
  ${props => props.$isActive && `
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 2px ${props.$color || '#3b82f6'}40;
  `}

  &:active {
    transform: translateY(-1px);
    box-shadow:
      0 5px 10px rgba(0, 0, 0, 0.1),
      0 3px 6px rgba(0, 0, 0, 0.06);
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const StatIcon = styled.div`
  font-size: 1.5rem;
  opacity: 0.85;
  line-height: 1;
  color: ${props => props.$color || '#64748b'};
`;

const StatValue = styled.div`
  font-size: clamp(1.25rem, 2.5vw, 1.875rem);
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  text-align: left;
`;

const StatLabel = styled.div`
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
  color: #64748b;
  font-weight: 500;
  text-align: left;
  line-height: 1.4;
`;

// Large stat card (první karta s celkovým přehledem) - zabírá 2 řádky
const LargeStatCard = styled.div`
  background: linear-gradient(145deg, #ffffff, #f9fafb);
  padding: clamp(1.25rem, 1.5vw, 1.75rem);
  border-radius: 16px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.06);
  border-left: 6px solid ${props => props.$color || '#3b82f6'};
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  grid-row: span 2;
  grid-column: 1;
  min-height: fit-content;
  height: 100%;

  /* Subtle shine effect */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.15) 50%,
      transparent 70%
    );
    transform: rotate(45deg);
    transition: opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.12),
      0 4px 8px rgba(0, 0, 0, 0.08);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(-1px);
    box-shadow:
      0 5px 10px rgba(0, 0, 0, 0.1),
      0 3px 6px rgba(0, 0, 0, 0.06);
  }
`;

const LargeStatValue = styled.div`
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  font-weight: 700;
  color: #1e293b;
  text-align: left;
  line-height: 1.1;
  margin-bottom: 0.5rem;
`;

const LargeStatLabel = styled.div`
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 600;
  text-align: left;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: auto;
`;

const SummaryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  border-left: 4px solid ${props => props.$color || '#d1d5db'};
  background: ${props => props.$bg || '#f8fafc'};
`;

const SummaryLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const SummaryValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
`;

// Table styles
const TableScrollWrapper = styled.div`
  position: relative;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  /* Shadow indikátory na okrajích když je možné scrollovat */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40px;
    pointer-events: none;
    z-index: 10;
    transition: opacity 0.3s ease;
  }

  /* Levý shadow - když není na začátku */
  &::before {
    left: 0;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.1), transparent);
    opacity: ${props => props.$showLeftShadow ? 1 : 0};
    border-radius: 8px 0 0 8px;
  }

  /* Pravý shadow - když není na konci */
  &::after {
    right: 0;
    background: linear-gradient(to left, rgba(0, 0, 0, 0.1), transparent);
    opacity: ${props => props.$showRightShadow ? 1 : 0};
    border-radius: 0 8px 8px 0;
  }
`;

const TableContainer = styled.div`
  /* Horizontální scrollování když se tabulka nevejde */
  overflow-x: auto;
  overflow-y: visible;
  position: relative;

  /* Smooth scrolling pro lepší UX */
  scroll-behavior: smooth;

  /* Skrýt scrollbar - zabránit blikání */
  &::-webkit-scrollbar {
    display: none;
  }

  /* Firefox scrollbar - skrýt */
  scrollbar-width: none;
  
  /* IE a Edge - skrýt */
  -ms-overflow-style: none;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
`;

const TableHead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  background: white;

  &:hover {
    background-color: #f3f4f6 !important;
    background: #f3f4f6 !important;
  }

  /* STORNO state styling - jen text obsahu */
  &[data-storno="true"] .storno-content {
    text-decoration: line-through;
    opacity: 0.6;
  }

  /* Buňka se stavem (dropdown) - bez stylování */
  &[data-storno="true"] td:nth-of-type(9) {
    text-decoration: none;
    opacity: 1;
  }
  
  /* 🔧 NEAKTIVNÍ (SMAZANÉ) FAKTURY - admin view */
  &[data-inactive="true"] {
    background: #fef2f2 !important;
    opacity: 0.75;
    
    &:hover {
      background: #fee2e2 !important;
    }
    
    /* Dvojité přeškrtnutí textu */
    .inactive-content {
      text-decoration: line-through double;
      text-decoration-color: #dc2626;
      opacity: 0.7;
    }
  }
`;

const TableHeader = styled.th`
  padding: 0.5rem 0.375rem;
  text-align: center;
  font-weight: 600;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  user-select: none;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TableCell = styled.td`
  padding: 0.375rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  
  &.center {
    text-align: center;
  }
  
  &.right {
    text-align: right;
  }
`;

// Floating panel který se zobrazí při scrollování
const FloatingHeaderPanel = styled.div`
  position: fixed;
  top: calc(var(--app-header-height, 96px) + 48px); /* Pod fixní hlavičkou + menu bar (96px + 48px = 144px) */
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999; /* Vysoký z-index pro jistotu viditelnosti */
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  border-top: 2px solid #cbd5e1; /* Světle šedý top border pro oddělení od menu baru */
  border-bottom: 3px solid #3b82f6;
  opacity: ${props => props.$visible ? 1 : 0};
  transform: translateY(${props => props.$visible ? '0' : '-10px'});
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const FloatingTableWrapper = styled.div`
  overflow-x: auto;
  max-width: 100%;
  padding: 0 1rem; /* Stejný padding jako Container */
  box-sizing: border-box;
  
  /* Stejné písmo jako hlavní tabulka */
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
  min-height: 45px;

  & > svg {
    position: absolute;
    left: 1rem;
    color: #4285f4;
    font-size: 0.875rem;
    pointer-events: none;
    z-index: 2;
  }
`;

const ColumnFilterSelect = styled.select`
  width: 100%;
  padding: 0.375rem 0.625rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.75rem;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 2rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    opacity: 0.7;
    cursor: wait;
    background-color: #f8f9fa;
  }
`;

// Wrapper pro kompaktní CustomSelect v tabulce
const CompactSelectWrapper = styled.div`
  width: 100%;
  
  /* Override CustomSelect styles pro tabulku */
  & [data-custom-select] {
    width: 100%;
  }
  
  & > div > div:first-of-type {
    height: auto !important;
    min-height: 42px;
    padding: 0.75rem 1rem !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    border: 2px solid #e2e8f0 !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    transition: all 0.2s ease !important;
    
    &:hover {
      border-color: #4285f4 !important;
    }
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
  cursor: text;
  min-height: 42px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #4285f4;
    box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
  }

  &:hover {
    border-color: #4285f4;
  }

  &::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }

  &[type="date"] {
    cursor: pointer;
    
    &::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 1;
    }
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.75rem;
  transition: color 0.2s ease;

  &:hover {
    color: #dc2626;
  }
`;

const ActionMenu = styled.div`
  display: flex;
  gap: 0.12rem;
  justify-content: center;
  align-items: center;
`;

const ActionMenuButton = styled.button`
  padding: 0.375rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: #64748b;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;

  svg {
    display: block;
    pointer-events: none;
  }

  &:hover:not(:disabled) {
    background: #f1f5f9;
    color: #1e293b;
  }

  &.view:hover:not(:disabled) {
    color: #3b82f6;
    background: #eff6ff;
  }

  &.edit:hover:not(:disabled) {
    color: #3b82f6;
    background: #eff6ff;
  }

  &.unlink:hover:not(:disabled) {
    color: #f97316;
    background: #fff7ed;
  }

  &.delete:hover:not(:disabled) {
    color: #dc2626;
    background: #fef2f2;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  border: 2px solid;
  white-space: nowrap;
  background: ${props => {
    switch(props.$status) {
      case 'paid': return '#dcfce7';
      case 'unpaid': return '#fef3c7';
      case 'overdue': return '#fee2e2';
      default: return '#e5e7eb';
    }
  }};
  color: ${props => {
    switch(props.$status) {
      case 'paid': return '#166534';
      case 'unpaid': return '#854d0e';
      case 'overdue': return '#991b1b';
      default: return '#1f2937';
    }
  }};
  border-color: ${props => {
    switch(props.$status) {
      case 'paid': return '#86efac';
      case 'unpaid': return '#fde047';
      case 'overdue': return '#fca5a5';
      default: return '#d1d5db';
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #94a3b8;
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyStateText = styled.p`
  font-size: 1.125rem;
  font-weight: 500;
  margin: 0;
`;

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

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(248, 250, 252, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.5s ease-in-out;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const LoadingSpinner = styled.div`
  width: 64px;
  height: 64px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #f59e0b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingMessage = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
  margin-bottom: 0.5rem;
`;

const LoadingSubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
`;

// Jemný overlay pro filtrování (když už jsou zobrazené faktury)
const FilteringOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.2s ease-in-out;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  backdrop-filter: blur(2px);
`;

const FilteringSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(229, 231, 235, 0.8);
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FilteringText = styled.div`
  margin-left: 1rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
  letter-spacing: 0.02em;
`;

// =============================================================================
// SLIDE PANEL - Detail faktury styled components
// =============================================================================

const DetailViewWrapper = styled.div`
  position: relative;
  min-height: 100%;
`;

const WatermarkIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 280px;
  color: rgba(0, 0, 0, 0.025);
  z-index: 0;
  pointer-events: none;
  user-select: none;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
`;

const DetailSection = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
`;

const InfoGrid = styled.div`
  display: grid;
  gap: 1rem;
  
  &:not(:last-child) {
    margin-bottom: 1rem;
  }
  
  /* Dva sloupce pro větší obrazovky */
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const InfoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const InfoRowFullWidth = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  grid-column: 1 / -1; /* Roztažení přes oba sloupce */
`;

const InfoIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 6px;
  color: #3b82f6;
  flex-shrink: 0;
  font-size: 0.875rem;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.25rem;
`;

const InfoValue = styled.div`
  font-size: 0.9375rem;
  color: #1e293b;
  font-weight: 500;
  word-break: break-word;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$color || '#e2e8f0'};
  color: ${props => props.$textColor || '#475569'};
`;

const ClickableValue = styled.span`
  cursor: pointer;
  color: #3b82f6;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  
  &:hover {
    color: #1e40af;
    background: #eff6ff;
    text-decoration: underline;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const ActionButtonsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e2e8f0;
`;

const SlideActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.$borderColor || '#3b82f6'};
  background: ${props => props.$bg || 'white'};
  color: ${props => props.$color || '#3b82f6'};
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$hoverBg || '#eff6ff'};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const AttachmentsGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #eff6ff;
    border-color: #3b82f6;
    transform: translateX(4px);
  }
`;

const AttachmentIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$color || '#f1f5f9'};
  border-radius: 6px;
  color: ${props => props.$iconColor || '#3b82f6'};
  flex-shrink: 0;
  font-size: 0.875rem;
`;

const AttachmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AttachmentName = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
  word-break: break-word;
`;

const AttachmentMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.125rem;
`;

const AttachmentAction = styled.div`
  color: #3b82f6;
  font-size: 1rem;
`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Invoices25List = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, username, hasPermission, user_id } = useContext(AuthContext);
  const { showProgress, hideProgress } = useContext(ProgressContext) || {};
  const { showToast } = useContext(ToastContext) || {};

  // LocalStorage klíč pro uložení stavu (user-specific)
  const LS_KEY = `invoices25_filters_state_${user_id || 'guest'}`;

  // Helper: Load state from localStorage
  const loadFromLS = () => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Failed to load invoices state from localStorage:', e);
      return null;
    }
  };

  const savedState = loadFromLS();

  // State
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceChecks, setInvoiceChecks] = useState({});
  const [checksLoading, setChecksLoading] = useState(false);
  
  // ⚠️ DEPRECATED: Tento stav se již nepoužívá - check_status je přímo v invoice objektu z BE
  // Ponecháno pro kompatibilitu s toggle funkcionalitou
  const [selectedYear, setSelectedYear] = useState(savedState?.selectedYear || new Date().getFullYear());
  const [columnFilters, setColumnFilters] = useState(savedState?.columnFilters || {});
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState(savedState?.columnFilters || {});
  
  // Debouncing pro filtry - 400ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
    }, 400);

    return () => clearTimeout(timer);
  }, [columnFilters]);
  
  // State pro CustomSelect komponenty
  const [selectStates, setSelectStates] = useState({
    fa_typ: false,
    stav: false,
    vecna_kontrola: false,
    ma_prilohy: false,
    ma_prilohy_floating: false,
  });
  
  // Search states pro CustomSelect
  const [searchStates, setSearchStates] = useState({
    fa_typ: '',
    stav: '',
    vecna_kontrola: '',
    ma_prilohy: '',
    ma_prilohy_floating: '',
  });
  
  // Tracking které Custom Select fields byly "touched"
  const [touchedSelectFields, setTouchedSelectFields] = useState(new Set());
  
  // Filters state pro dashboard cards
  const [filters, setFilters] = useState(savedState?.filters || {
    filter_status: '' // 'paid', 'unpaid', 'overdue', 'without_order', 'my_invoices'
  });
  
  // Active filter status pro vizuální označení aktivní dlaždice
  const [activeFilterStatus, setActiveFilterStatus] = useState(savedState?.activeFilterStatus || null);
  
  // 🔍 Globální vyhledávání (nový state)
  const [globalSearchTerm, setGlobalSearchTerm] = useState(savedState?.globalSearchTerm || '');
  
  // � ADMIN FEATURE: Zobrazení POUZE neaktivních faktur (aktivni = 0)
  // Checkbox viditelný pouze pro role ADMINISTRATOR a SUPERADMIN
  const [showOnlyInactive, setShowOnlyInactive] = useState(false); // NEVER persisted to localStorage
  
  // �📊 Sorting state (client-side)
  const [sortField, setSortField] = useState(savedState?.sortField || null);
  const [sortDirection, setSortDirection] = useState(savedState?.sortDirection || 'asc'); // 'asc' nebo 'desc'
  
  // Check if user is ADMIN (SUPERADMIN or ADMINISTRATOR role)
  const isAdmin = hasPermission && (hasPermission('SUPERADMIN') || hasPermission('ADMINISTRATOR'));
  
  // Check if user can control invoices (KONTROLOR_FAKTUR role)
  const canControlInvoices = React.useMemo(() => {
    return hasPermission && (
      hasPermission('SUPERADMIN') || 
      hasPermission('ADMINISTRATOR') || 
      hasPermission('KONTROLOR_FAKTUR')
    );
  }, [hasPermission]);
  
  // Dashboard statistiky (z BE - celkové součty podle filtru, NE jen aktuální stránka!)
  const [stats, setStats] = useState({
    total: 0,           // Celkový počet faktur (všechny stránky)
    paid: 0,            // Počet zaplacených
    unpaid: 0,          // Počet nezaplacených
    overdue: 0,         // Počet po splatnosti
    withinDue: 0,       // Počet ve splatnosti (nezaplacené, ale ne po splatnosti)
    totalAmount: 0,     // Celková částka (všechny)
    paidAmount: 0,      // Částka zaplacených
    unpaidAmount: 0,    // Částka nezaplacených
    overdueAmount: 0,   // Částka po splatnosti
    withinDueAmount: 0, // Částka ve splatnosti
    withoutOrder: 0,    // Faktury bez přiřazení (bez obj. ANI smlouvy)
    myInvoices: 0,      // Moje faktury (jen pro admin/invoice_manage)
    kontrolovano: 0     // Zkontrolované faktury (kontrola_radku)
  });
  
  // 🔍 Sidebar search pro objednávky bez faktury
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [debouncedSidebarSearch, setDebouncedSidebarSearch] = useState('');
  
  // Debouncing pro sidebar search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSidebarSearch(sidebarSearch);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [sidebarSearch]);
  
  // Helper funkce pro normalizaci textu (bez diakritiky + lowercase)
  const normalizeSearchText = useCallback((text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }, []);

  // Helper: Save state to localStorage
  const saveToLS = useCallback((state) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save invoices state to localStorage:', e);
    }
  }, [LS_KEY]);
  
  // Kontrola oprávnění
  const canViewAllInvoices = React.useMemo(() => {
    return hasPermission && (hasPermission('INVOICE_MANAGE') || hasPermission('ORDER_MANAGE'));
  }, [hasPermission]);
  
  const canManageInvoices = React.useMemo(() => {
    return hasPermission && hasPermission('INVOICE_MANAGE');
  }, [hasPermission]);
  
  // Právo pro věcnou kontrolu - vyžaduje OBĚ práva současně (pokud org. hierarchie neříká jinak)
  const canConfirmVecnaKontrola = React.useMemo(() => {
    return hasPermission && 
           hasPermission('INVOICE_VIEW') && 
           hasPermission('INVOICE_MATERIAL_CORRECTNESS');
  }, [hasPermission]);
  
  // 🎯 Floating header panel state
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const [columnWidths, setColumnWidths] = useState([]);
  const tableRef = useRef(null);
  
  // Sledování scrollování - zobrazí floating header když hlavička tabulky zmizí nad viewport
  useEffect(() => {
    if (!tableRef.current) return;
    
    const thead = tableRef.current.querySelector('thead');
    if (!thead) return;
    
    const appHeaderHeight = 96;
    const menuBarHeight = 48;
    const totalHeaderHeight = appHeaderHeight + menuBarHeight; // 144px
    
    // Intersection Observer - sleduje viditelnost thead elementu
    let previousShowState = false;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Kontrola skutečné pozice: pokud spodní okraj thead je nad fixním headerem (< 144px),
        // znamená to, že hlavička je schovaná a zobrazíme floating header
        const theadBottom = entry.boundingClientRect.bottom;
        const shouldShow = theadBottom < totalHeaderHeight;
        
        // Track floating header state globally for DatePicker scroll handlers
        window.__floatingHeaderVisible = shouldShow;
        
        // Close dropdowns only when floating header visibility actually changes
        if (shouldShow !== previousShowState) {
          window.dispatchEvent(new Event('closeAllDatePickers'));
          previousShowState = shouldShow;
        }
        
        setShowFloatingHeader(shouldShow);
      },
      {
        // threshold 0 = spustí se při jakékoli změně viditelnosti
        threshold: 0
      }
    );
    
    observer.observe(thead);
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Měření šířek sloupců z originální tabulky
  useEffect(() => {
    const measureColumnWidths = () => {
      if (!tableRef.current) return;
      
      // Najdeme všechny th elementy v prvním řádku hlavičky
      const headerCells = tableRef.current.querySelectorAll('thead tr:first-child th');
      const widths = Array.from(headerCells).map(cell => cell.offsetWidth);
      setColumnWidths(widths);
    };
    
    // Změř hned po načtení
    measureColumnWidths();
    
    // Změř znovu po změně velikosti okna
    window.addEventListener('resize', measureColumnWidths);
    
    // Změř znovu po načtení dat (malé zpoždění pro jistotu)
    const timer = setTimeout(measureColumnWidths, 100);
    
    return () => {
      window.removeEventListener('resize', measureColumnWidths);
      clearTimeout(timer);
    };
  }, [invoices, loading]);
  
  // State pro delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    invoice: null
  });
  const [deleteType, setDeleteType] = useState('soft');
  
  // State pro payment status dialog
  const [paymentDialog, setPaymentDialog] = useState({
    isOpen: false,
    invoice: null,
    newStatus: false
  });
  
  // State pro workflow status change dialog (změna ze ZAPLACENO)
  const [statusChangeDialog, setStatusChangeDialog] = useState({
    isOpen: false,
    invoice: null,
    newStatus: null
  });
  
  // State pro confirm dialog (unlink, atd.)
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
  const [isCheckingLock, setIsCheckingLock] = useState(false); // Prevent multiple clicks
  
  // State pro slide panel (náhled faktury)
  const [slidePanelOpen, setSlidePanelOpen] = useState(false);
  const [slidePanelInvoice, setSlidePanelInvoice] = useState(null);
  const [slidePanelLoading, setSlidePanelLoading] = useState(false);
  const [slidePanelAttachments, setSlidePanelAttachments] = useState([]);
  
  // State pro attachments tooltip
  const [attachmentsTooltip, setAttachmentsTooltip] = useState(null);
  const [orderAttachmentsTooltip, setOrderAttachmentsTooltip] = useState(null);
  
  // State pro attachment viewer
  const [viewerAttachment, setViewerAttachment] = useState(null);
  
  // Typy faktur z DB (pro filtr a zobrazení)
  const [invoiceTypes, setInvoiceTypes] = useState([]);
  const [invoiceTypesLoading, setInvoiceTypesLoading] = useState(false);
  
  // 📋 State pro sidebar s objednávkami připravenými k fakturaci
  const [showOrdersSidebar, setShowOrdersSidebar] = useState(false);
  const [ordersReadyForInvoice, setOrdersReadyForInvoice] = useState([]);
  const [ordersReadyCount, setOrdersReadyCount] = useState(0);
  const [loadingOrdersReady, setLoadingOrdersReady] = useState(false);
  
  // Handler: Navigace na evidenci faktury
  const handleNavigateToEvidence = () => {
    // Vymazat localStorage aby se otevřel čistý formulář
    localStorage.removeItem('invoiceFormData');
    localStorage.removeItem('invoiceAttachments');
    // Nastavit sessionStorage flag pro detekci fresh navigation
    sessionStorage.setItem('invoice_fresh_navigation', 'true');
    navigate('/invoice-evidence', {
      state: {
        clearForm: true, // Flag pro InvoiceEvidencePage
        timestamp: Date.now() // Timestamp pro detekci F5 (po F5 zmizí)
      }
    });
  };

  // 🎯 Handler pro editaci objednávky - PŘESNĚ podle Orders25List
  const handleEditOrder = async (invoice) => {
    // Zabránit vícenásobnému kliknutí
    if (isCheckingLock) {
      return;
    }

    if (!invoice.objednavka_id) {
      showToast('Faktura není přiřazena k objednávce', { type: 'warning' });
      return;
    }

    setIsCheckingLock(true);

    try {
      // 🔒 KONTROLA LOCK - načti aktuální data z DB
      const dbOrder = await getOrderV2(invoice.objednavka_id, token, username, true);

      if (!dbOrder) {
        showToast('Nepodařilo se načíst objednávku z databáze', { type: 'error' });
        setIsCheckingLock(false);
        return;
      }

      // 🔒 Blokuj pouze pokud locked=true A NENÍ můj zámek A NENÍ expired
      if (dbOrder.lock_info?.locked === true && !dbOrder.lock_info?.is_owned_by_me && !dbOrder.lock_info?.is_expired) {
        const lockInfo = dbOrder.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

        // Zjisti, zda má uživatel právo na force unlock
        const canForceUnlock = hasPermission && (
          hasPermission('SUPERADMIN') || hasPermission('ADMINISTRATOR')
        );

        setLockedOrderInfo({
          lockedByUserName,
          lockedByUserEmail: lockInfo.locked_by_user_email || null,
          lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
          lockedAt: lockInfo.locked_at || null,
          lockAgeMinutes: lockInfo.lock_age_minutes || null,
          canForceUnlock,
          orderId: invoice.objednavka_id,
          userRoleName: canForceUnlock ? 'administrátor' : null
        });
        setShowLockedOrderDialog(true);
        setIsCheckingLock(false);
        return;
      }

      // ✅ Není zamčená - naviguj na editaci objednávky
      console.log('📋 Invoices25List → OrderForm25 (z tabulky):', {
        orderId: invoice.objednavka_id,
        returnTo: '/invoices25-list',
        navigateTo: `/order-form-25?edit=${invoice.objednavka_id}`
      });
      setIsCheckingLock(false);
      navigate(`/order-form-25?edit=${invoice.objednavka_id}`, {
        state: {
          returnTo: '/invoices25-list'
        }
      });

    } catch (error) {
      console.error('❌ Chyba při kontrole zámku objednávky:', error);
      showToast('Chyba při kontrole dostupnosti objednávky', { type: 'error' });
      setIsCheckingLock(false);
    }
  };

  // 🎯 Handler pro zobrazení faktur přiřazených ke smlouvě
  const handleViewContractInvoices = (invoice) => {
    if (!invoice.smlouva_id) {
      showToast('Faktura není přiřazena ke smlouvě', { type: 'warning' });
      return;
    }

    // Otevřít fakturu k editaci/potvrzení věcné správnosti
    // Používáme stejnou logiku jako handleEditInvoice, ale pro faktury se smlouvou
    handleEditInvoice(invoice);
  };

  // Handler: Otevřít fakturu k náhledu kliknutím na číslo objednávky/smlouvy
  // 🔒 Handler pro zavření LOCK dialogu
  const handleLockedOrderCancel = () => {
    setShowLockedOrderDialog(false);
    setLockedOrderInfo(null);
    setIsCheckingLock(false); // Odemknout pro další pokus
  };
  
  // 📋 Handler: Načíst objednávky připravené k fakturaci (DOKONCENA, bez faktury)
  const loadOrdersReadyForInvoice = async () => {
    setLoadingOrdersReady(true);
    try {
      // Načti všechny aktivní objednávky aktuálního roku
      const currentYear = new Date().getFullYear();
      const response = await getOrdersList25({
        token,
        username,
        filters: {
          rok: currentYear,
          stav_objednavky: 'FAKTURACE'
        }
      });

      if (Array.isArray(response)) {
        // Filtruj na FE: pouze objednávky BEZ faktury
        const filteredOrders = response.filter(order => {
          const hasNoInvoice = (!order.faktury || order.faktury.length === 0) && (!order.faktury_count || order.faktury_count === 0);
          return hasNoInvoice;
        });
        
        const orders = filteredOrders.map(order => {
          return {
            id: order.id,
            cislo_objednavky: order.cislo_objednavky,
            predmet: order.predmet,
            dodavatel_nazev: order._enriched?.dodavatel?.nazev || order.dodavatel_nazev,
            dodavatel_ico: order._enriched?.dodavatel?.ico || order.dodavatel_ico,
            max_cena_s_dph: order.max_cena_s_dph,
            polozky_celkova_cena_s_dph: order.polozky_celkova_cena_s_dph,
            dt_vytvoreni: order.dt_vytvoreni,
            // Financování - předej celý objekt, zobrazení bude v UI
            financovani: order.financovani,
            // Účastníci
            objednatel: order._enriched?.objednatel || order._enriched?.uzivatel || null,
            garant: order._enriched?.garant_uzivatel || order._enriched?.garant || null,
            prikazce: order._enriched?.prikazce || null,
            schvalovatel: order._enriched?.schvalovatel || null,
            // Přílohy
            prilohy: order.prilohy || order._enriched?.prilohy || [],
            pocet_priloh: order.pocet_priloh || order.prilohy?.length || 0
          };
        });
        
        setOrdersReadyForInvoice(orders);
        setOrdersReadyCount(orders.length);
      } else {
        setOrdersReadyForInvoice([]);
        setOrdersReadyCount(0);
      }
    } catch (error) {
      console.error('❌ Chyba při načítání objednávek připravených k fakturaci:', error);
      setOrdersReadyForInvoice([]);
      setOrdersReadyCount(0);
    } finally {
      setLoadingOrdersReady(false);
    }
  };

  // 📋 Handler: Otevřít sidebar s objednávkami
  const handleOpenOrdersSidebar = () => {
    setShowOrdersSidebar(true);
    loadOrdersReadyForInvoice(); // Načti aktuální seznam
  };

  // 📋 Handler: Zavřít sidebar
  const handleCloseOrdersSidebar = () => {
    setShowOrdersSidebar(false);
    // Zavřít i tooltip s přílohami pokud je otevřený
    setOrderAttachmentsTooltip(null);
  };

  // 📋 Handler: Vybrat objednávku a přejít na evidenci faktury
  // 📋 Handler: Vybrat objednávku a přejít na evidenci faktury
  const handleSelectOrderForInvoice = (order) => {
    setShowOrdersSidebar(false);
    // Zavřít i tooltip s přílohami pokud je otevřený
    setOrderAttachmentsTooltip(null);
    // Naviguj na evidenci faktury s předvyplněným order ID v URL
    navigate(`/invoice-evidence/${order.id}`, {
      state: {
        fromOrdersReadyList: true,
        orderNumber: order.cislo_objednavky,
        orderIdForLoad: order.id, // Přidat ID objednávky pro načtení
        prefillSearchTerm: order.cislo_objednavky || `#${order.id}`, // Předvyplnit našeptávač
        timestamp: Date.now()
      }
    });
  };
  
  const handleAddInvoiceToEntity = async (invoice) => {
    // ⚠️ Zabránit vícenásobnému kliknutí
    if (isCheckingLock) {
      return;
    }
    
    if (invoice.objednavka_id) {
      setIsCheckingLock(true); // Zamknout funkci
      
      // 🔒 KONTROLA LOCK před otevřením faktury k objednávce
      try {
        const { getOrderV2 } = await import('../services/apiOrderV2');
        const orderCheck = await getOrderV2(invoice.objednavka_id, token, username, false);
        
        // ⚠️ DŮLEŽITÉ: Blokuj pouze pokud je locked === true (zamčená JINÝM uživatelem)
        // Pokud is_owned_by_me === true, NEPŘERUŠUJ (můžu pokračovat)
        // Pokud is_expired === true, NEPŘERUŠUJ (zámek vypršel po 15 minutách)
        if (orderCheck?.lock_info?.locked === true && !orderCheck?.lock_info?.is_owned_by_me && !orderCheck?.lock_info?.is_expired) {
          const lockInfo = orderCheck.lock_info;
          const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
          
          // Ulož info o zamčení
          setLockedOrderInfo({
            lockedByUserName,
            lockedByUserEmail: lockInfo.locked_by_user_email || null,
            lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
            lockedAt: lockInfo.locked_at || null,
            lockAgeMinutes: lockInfo.lock_age_minutes || null,
            canForceUnlock: false, // V invoice listu neumožňujeme force unlock
            orderId: invoice.objednavka_id
          });
          setShowLockedOrderDialog(true);
          setIsCheckingLock(false); // Odemknout
          return; // ⚠️ NEPOKRAČUJ - nepřecházej na jinou stránku!
        }
      } catch (err) {
        // ⚠️ DŮLEŽITÉ: Chyba při kontrole LOCK - zobraz dialog, NEPŘECHÁZEJ na stránku
        console.error('⚠️ LOCK Invoices25List: Chyba kontroly LOCK obj #' + invoice.objednavka_id, err);
        console.error('⚠️ Error details:', err);
        
        // Pro VŠECHNY chyby zobraz dialog s informací
        const lockInfo = {
          lockedByUserName: 'Nedostupné',
          lockedByUserEmail: null,
          lockedByUserTelefon: null,
          lockedAt: null,
          lockAgeMinutes: null,
          canForceUnlock: false,
          orderId: invoice.objednavka_id,
          errorMessage: err?.message || 'Chyba při načítání informací o objednávce'
        };
        
        setLockedOrderInfo(lockInfo);
        setShowLockedOrderDialog(true);
        setIsCheckingLock(false); // Odemknout
        return; // ⚠️ VŽDY ukonči - NIKDY nenaviguj při chybě
      }
      
      // ✅ Není zamčená - otevřít fakturu k náhledu (s editInvoiceId pro načtení dat faktury)
      setIsCheckingLock(false); // Odemknout
      navigate('/invoice-evidence', {
        state: {
          editInvoiceId: invoice.id,
          orderIdForLoad: invoice.objednavka_id
        }
      });
    } else if (invoice.smlouva_id) {
      // Otevřít fakturu ke smlouvě
      navigate('/invoice-evidence', {
        state: {
          editInvoiceId: invoice.id,
          smlouvaIdForLoad: invoice.smlouva_id
        }
      });
    }
  };
  
  // Handler pro kliknutí na dashboard kartu - filtrování
  const handleDashboardCardClick = useCallback((filterType) => {
    // ✅ Backend API podporuje filter_status (commit 0783884)
    // Možné hodnoty: 'paid', 'unpaid', 'overdue', 'without_order', 'my_invoices'
    
    // Toggle logika - klik na aktivní dlazdici zruší filtr
    if (activeFilterStatus === filterType) {
      setActiveFilterStatus(null);
      setFilters(prev => ({
        ...prev,
        filter_status: ''
      }));
      setCurrentPage(1);
      return;
    }
    
    // Aktivace nového filtru
    setActiveFilterStatus(filterType);
    setFilters(prev => ({
      ...prev,
      filter_status: filterType === 'all' ? '' : filterType
    }));
    
    // Reset na první stránku při změně filtru
    setCurrentPage(1);
  }, [activeFilterStatus]);
  
  // Dashboard visibility state
  const [showDashboard, setShowDashboard] = useState(savedState?.showDashboard ?? true);
  
  // Toggle dashboard visibility
  const handleToggleDashboard = useCallback(() => {
    setShowDashboard(prev => !prev);
  }, []);
  
  // Helper funkce pro CustomSelect komponenty
  const toggleSelect = useCallback((selectName) => {
    setSelectStates(prev => {
      // Zavři všechny selecty
      const newState = {
        fa_typ: false,
        stav: false,
        vecna_kontrola: false,
        ma_prilohy: false,
        ma_prilohy_floating: false,
      };
      // Otevři pouze vybraný select (pokud byl zavřený)
      newState[selectName] = !prev[selectName];
      return newState;
    });
  }, []);
  
  const closeAllSelects = useCallback(() => {
    setSelectStates({
      fa_typ: false,
      stav: false,
      vecna_kontrola: false,
      ma_prilohy: false,
      ma_prilohy_floating: false,
    });
  }, []);
  
  // Funkce pro filtraci možností podle vyhledávání
  const filterOptions = useCallback((options, searchTerm, searchField) => {
    if (!searchTerm) return options;
    const filtered = options.filter(option => {
      const label = getOptionLabel(option, searchField);
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
    return filtered;
  }, []);
  
  // Funkce pro získání labelu možnosti
  const getOptionLabel = useCallback((option, field) => {
    if (!option) return '';
    
    switch (field) {
      case 'fa_typ':
      case 'floating_fa_typ':
        return option.nazev || option.label || '';
      case 'stav':
      case 'floating_stav':
        return option.label || option.value || '';
      case 'vecna_kontrola':
      case 'floating_vecna_kontrola':
        return option.label || option.value || '';
      case 'ma_prilohy':
      case 'ma_prilohy_floating':
        return option.label || option.value || '';
      default:
        return option.label || option.nazev || option.value || '';
    }
  }, []);
  
  // 🧹 Vyčistit všechny filtry (sloupcové + dashboard + fulltext)
  const handleClearAllFilters = useCallback(() => {
    setColumnFilters({});
    setFilters({ filter_status: '' });
    setActiveFilterStatus(null);
    setGlobalSearchTerm('');
    setShowOnlyInactive(false); // 🔧 Reset admin checkbox
    setCurrentPage(1);
  }, []);
  

  
  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
  const [itemsPerPage, setItemsPerPage] = useState(savedState?.itemsPerPage || 50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // 📄 Invoice API - načítáme reálná data z BE
  // API endpointy: invoices25/list, invoices25/by-order, invoices25/create, atd.

  // ✅ Pomocná funkce pro určení statusu faktury podle fa_zaplacena + splatnost
  const getInvoiceStatus = useCallback((invoice) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // 1️⃣ Pokud má stav ZAPLACENO nebo DOKONCENA → ZAPLACENO
    // ⚠️ DŮLEŽITÉ: fa_zaplacena ignorujeme! Rozhoduje pouze workflow stav!
    if (invoice.stav === 'ZAPLACENO' || invoice.stav === 'DOKONCENA') {
      return 'paid';
    }
    
    // 🚫 Pokud je STORNO → vrátit 'paid' (aby se nepočítala do "po splatnosti" ani "nezaplaceno")
    // Stornované faktury jsou zrušené a neřeší se
    if (invoice.stav === 'STORNO') {
      return 'paid'; // Technicky není 'paid', ale nechceme ji v overdue/unpaid
    }
    
    // 2️⃣ Pokud má datum splatnosti → kontrola po splatnosti
    // ⚠️ DŮLEŽITÉ: Stav K_ZAPLACENI je PŘED zaplacením, takže MŮŽE být po splatnosti!
    // Pouze stavy ZAPLACENO, DOKONCENA a STORNO se NIKDY nepočítají jako "po splatnosti"
    const datumSplatnosti = invoice.datum_splatnosti || invoice.fa_datum_splatnosti;
    if (datumSplatnosti) {
      const splatnost = new Date(datumSplatnosti);
      splatnost.setHours(0, 0, 0, 0);
      
      // Pokud je splatnost v minulosti → PO SPLATNOSTI
      if (splatnost < now) {
        return 'overdue';
      }
    }
    
    // 3️⃣ Jinak → NEZAPLACENO (ale ještě není po splatnosti)
    return 'unpaid';
  }, []);

  // ⏰ Funkce pro výpočet počtu dní po splatnosti
  const getDaysOverdue = useCallback((invoice) => {
    if (!invoice.datum_splatnosti && !invoice.fa_datum_splatnosti) {
      return 0;
    }

    const status = getInvoiceStatus(invoice);
    if (status !== 'overdue') {
      return 0;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const splatnost = new Date(invoice.datum_splatnosti || invoice.fa_datum_splatnosti);
    splatnost.setHours(0, 0, 0, 0);
    
    const diffTime = now - splatnost;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }, [getInvoiceStatus]);

  // 💾 Ukládání stavu do localStorage při změnách
  useEffect(() => {
    const stateToSave = {
      selectedYear,
      columnFilters,
      filters,
      activeFilterStatus,
      globalSearchTerm,
      showDashboard,
      currentPage,
      itemsPerPage,
      sortField,
      sortDirection
    };
    saveToLS(stateToSave);
  }, [selectedYear, columnFilters, filters, activeFilterStatus, globalSearchTerm, showDashboard, currentPage, itemsPerPage, saveToLS]);

  // Load data
  const loadData = useCallback(async () => {
    if (!token || !username) {
      setError('Není k dispozici autentizační token');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      showProgress?.();

      // 📥 Sestavení API parametrů podle BE dokumentace (flat struktura)
      const apiParams = {
        token, 
        username,
        page: currentPage,
        per_page: itemsPerPage
      };
      
      // Rok -> datum_od/datum_do
      if (selectedYear) {
        apiParams.datum_od = `${selectedYear}-01-01`;
        apiParams.datum_do = `${selectedYear}-12-31`;
      }
      
      // 🔍 Globální vyhledávání (search_term)
      if (globalSearchTerm && globalSearchTerm.trim()) {
        apiParams.search_term = globalSearchTerm.trim();
      }
      
      // ✅ Dashboard card filter - filter_status
      if (filters.filter_status) {
        apiParams.filter_status = filters.filter_status;
      }
      
      // 📋 Sloupcové filtry - OPRAVENÉ!
      
      // Datum doručení (přesná shoda)
      if (debouncedColumnFilters.datum_doruceni && typeof debouncedColumnFilters.datum_doruceni === 'string' && debouncedColumnFilters.datum_doruceni.trim()) {
        apiParams.filter_datum_doruceni = debouncedColumnFilters.datum_doruceni.trim();
      }
      
      // Datum aktualizace (přesná shoda)
      if (debouncedColumnFilters.dt_aktualizace && typeof debouncedColumnFilters.dt_aktualizace === 'string' && debouncedColumnFilters.dt_aktualizace.trim()) {
        apiParams.filter_dt_aktualizace = debouncedColumnFilters.dt_aktualizace.trim();
      }
      
      // Typ faktury (přesná shoda) - pouze pokud není "Všechny typy"
      const faTypValue = typeof debouncedColumnFilters.fa_typ === 'object' ? debouncedColumnFilters.fa_typ?.value : debouncedColumnFilters.fa_typ;
      if (faTypValue && faTypValue.toString().trim() !== '') {
        apiParams.filter_fa_typ = faTypValue;
      }
      
      // Číslo faktury (LIKE - částečná shoda)
      if (debouncedColumnFilters.cislo_faktury && typeof debouncedColumnFilters.cislo_faktury === 'string' && debouncedColumnFilters.cislo_faktury.trim()) {
        apiParams.fa_cislo_vema = debouncedColumnFilters.cislo_faktury.trim();
      }
      
      // Číslo objednávky (LIKE - částečná shoda)
      if (debouncedColumnFilters.cislo_objednavky && typeof debouncedColumnFilters.cislo_objednavky === 'string' && debouncedColumnFilters.cislo_objednavky.trim()) {
        apiParams.cislo_objednavky = debouncedColumnFilters.cislo_objednavky.trim();
      }
      
      // Datum vystavení (přesná shoda)
      if (debouncedColumnFilters.datum_vystaveni && typeof debouncedColumnFilters.datum_vystaveni === 'string' && debouncedColumnFilters.datum_vystaveni.trim()) {
        apiParams.filter_datum_vystaveni = debouncedColumnFilters.datum_vystaveni.trim();
      }
      
      // Datum splatnosti (přesná shoda)
      if (debouncedColumnFilters.datum_splatnosti && typeof debouncedColumnFilters.datum_splatnosti === 'string' && debouncedColumnFilters.datum_splatnosti.trim()) {
        apiParams.filter_datum_splatnosti = debouncedColumnFilters.datum_splatnosti.trim();
      }
      
      // Stav faktury - pouze pokud není "Všechny stavy"
      const stavValue = typeof debouncedColumnFilters.stav === 'object' ? debouncedColumnFilters.stav?.value : debouncedColumnFilters.stav;
      if (stavValue && stavValue.toString().trim() !== '') {
        apiParams.filter_stav = stavValue;
      }
      
      // Uživatel - celé jméno (LIKE - hledá v jméně i příjmení)
      if (debouncedColumnFilters.vytvoril_uzivatel && typeof debouncedColumnFilters.vytvoril_uzivatel === 'string' && debouncedColumnFilters.vytvoril_uzivatel.trim()) {
        apiParams.filter_vytvoril_uzivatel = debouncedColumnFilters.vytvoril_uzivatel.trim();
      }
      
      // Kontrola řádku (all/kontrolovano/nekontrolovano)
      if (debouncedColumnFilters.kontrola_radku && debouncedColumnFilters.kontrola_radku !== 'all') {
        apiParams.filter_kontrola_radku = debouncedColumnFilters.kontrola_radku;
      }
      
      // Částka - operátor-based filtr (=, <, >)
      // Format: "=5000" nebo ">1000" nebo "<500"
      // POZOR: Pokud je jen operátor bez čísla (např. ">"), ignoruj (neparsuj)
      if (debouncedColumnFilters.castka && debouncedColumnFilters.castka.trim()) {
        const castkaTrimmed = debouncedColumnFilters.castka.trim();
        const match = castkaTrimmed.match(/^([=<>])(.+)$/);
        
        if (match && match[2]) { // ✅ Kontrola že existuje číslo za operátorem
          const operator = match[1];
          const amountStr = match[2].replace(/\s/g, '').replace(/,/g, '');
          
          if (amountStr) { // ✅ Kontrola že není prázdný string
            const amount = parseFloat(amountStr);
            
            if (!isNaN(amount) && amount > 0) { // ✅ Kontrola že je to platné číslo větší než 0
              // Přeložit operátor na API parametry
              if (operator === '=') {
                apiParams.castka_eq = amount;
              } else if (operator === '<') {
                apiParams.castka_lt = amount;
              } else if (operator === '>') {
                apiParams.castka_gt = amount;
              }
            }
          }
        }
      }
      
      // Přílohy - filtr podle existence příloh
      const maPrilobyValue = typeof debouncedColumnFilters.ma_prilohy === 'object' ? debouncedColumnFilters.ma_prilohy?.value : debouncedColumnFilters.ma_prilohy;
      if (maPrilobyValue === 'with') {
        apiParams.filter_ma_prilohy = 1; // Pouze s přílohami
      } else if (maPrilobyValue === 'without') {
        apiParams.filter_ma_prilohy = 0; // Pouze bez příloh
      } else if (maPrilobyValue === 'spisovka') {
        apiParams.filter_ma_prilohy = 2; // Pouze ze spisovky
      }
      
      // Věcná kontrola - filtr
      const vecnaKontrolaValue = typeof debouncedColumnFilters.vecna_kontrola === 'object' ? debouncedColumnFilters.vecna_kontrola?.value : debouncedColumnFilters.vecna_kontrola;
      if (vecnaKontrolaValue === 'yes') {
        apiParams.filter_vecna_kontrola = 1; // Pouze provedena
      } else if (vecnaKontrolaValue === 'no') {
        apiParams.filter_vecna_kontrola = 0; // Pouze neprovedena
      }
      // Jinak (prázdný string nebo '') neposílej nic
      
      // Věcnou provedl - text filtr
      if (debouncedColumnFilters.vecnou_provedl && typeof debouncedColumnFilters.vecnou_provedl === 'string') {
        apiParams.filter_vecnou_provedl = debouncedColumnFilters.vecnou_provedl.trim();
      }
      
      // Předáno zaměstnanci - text filtr
      if (debouncedColumnFilters.predano_zamestnanec && typeof debouncedColumnFilters.predano_zamestnanec === 'string') {
        apiParams.filter_predano_zamestnanec = debouncedColumnFilters.predano_zamestnanec.trim();
      }
      
      // 📥 ŘAZENÍ - podle sortField a sortDirection
      if (sortField && sortField.trim()) {
        apiParams.order_by = sortField.trim();
        apiParams.order_direction = sortDirection || 'desc'; // default DESC
      }
      
      // 🔧 ADMIN FEATURE: Zobrazení POUZE neaktivních faktur (aktivni = 0)
      // Pouze pokud je uživatel ADMIN a checkbox je zaškrtnutý
      if (isAdmin && showOnlyInactive) {
        apiParams.show_only_inactive = 1;
      }

      // 📥 Načtení faktur z BE (server-side pagination + user isolation)
      const response = await listInvoices25(apiParams);

      // Transformace dat z BE formátu
      const invoicesList = response.faktury || [];
      
      // ✅ Ulož pagination info z BE (server-side pagination)
      if (response.pagination) {
        setTotalPages(response.pagination.total_pages || 0);
        setTotalItems(response.pagination.total || 0);
      } else {
        // Fallback: žádná pagination data
        setTotalPages(0);
        setTotalItems(0);
      }
      // ⚠️ BE už parsuje JSON pole - NENÍ potřeba volat JSON.parse()!
      const transformedInvoices = invoicesList.map(invoice => ({
        // Základní data
        id: typeof invoice.id === 'string' ? parseInt(invoice.id) : invoice.id,
        objednavka_id: typeof invoice.objednavka_id === 'string' ? parseInt(invoice.objednavka_id) : invoice.objednavka_id,
        cislo_objednavky: invoice.cislo_objednavky || '',
        // Smlouva (univerzální přiřazení OBJ nebo SML)
        smlouva_id: typeof invoice.smlouva_id === 'string' ? parseInt(invoice.smlouva_id) : invoice.smlouva_id,
        cislo_smlouvy: invoice.cislo_smlouvy || '',
        
        // ✅ TŘÍFÁZOVÝ SYSTÉM KONTROLY - check_status z BE
        check_status: invoice.check_status || 'unchecked',
        
        // Organizace
        organizace_id: invoice.organizace_id || null,
        organizace_nazev: invoice.organizace_nazev || '',
        
        // Úsek (NOVÉ)
        objednavka_usek_id: invoice.objednavka_usek_id || null,
        objednavka_usek_zkr: invoice.objednavka_usek_zkr || '',
        
        // Fakturační data
        cislo_faktury: invoice.fa_cislo_vema || '',
        castka: parseFloat(invoice.fa_castka) || 0,
        datum_vystaveni: invoice.fa_datum_vystaveni,
        datum_splatnosti: invoice.fa_datum_splatnosti,
        datum_doruceni: invoice.fa_datum_doruceni,
        fa_typ: invoice.fa_typ || 'BEZNA', // ✅ Typ faktury
        
        // Status (BE vrací int: 0/1)
        dorucena: invoice.fa_dorucena === 1 || invoice.fa_dorucena === true,
        zaplacena: invoice.fa_zaplacena === 1 || invoice.fa_zaplacena === true, // ✅ NOVÉ pole
        
        // Workflow stav (ENUM hodnota z DB)
        stav: invoice.stav || 'ZAEVIDOVANA', // ✅ Workflow stav faktury
        
        // ✅ BE už vrací naparsovaná pole - použít přímo!
        strediska_kod: Array.isArray(invoice.fa_strediska_kod) ? invoice.fa_strediska_kod : [],
        poznamka: invoice.fa_poznamka || '',
        rozsirujici_data: invoice.rozsirujici_data || null, // BE už naparsoval nebo vrátil null
        
        // Přílohy (NOVÉ: BE vrací enriched data)
        pocet_priloh: invoice.pocet_priloh || 0,
        ma_prilohy: invoice.ma_prilohy || false,
        prilohy: Array.isArray(invoice.prilohy) ? invoice.prilohy : [],
        
        // Spisovka tracking
        from_spisovka: invoice.from_spisovka || false,
        spisovka_dokument_id: invoice.spisovka_dokument_id || null,
        
        // Meta - vytvoril uživatel (NOVÉ: BE vrací kompletní info)
        vytvoril_uzivatel_id: typeof invoice.vytvoril_uzivatel_id === 'string' ? 
                              parseInt(invoice.vytvoril_uzivatel_id) : invoice.vytvoril_uzivatel_id,
        vytvoril_uzivatel: invoice.vytvoril_uzivatel || '', // Celé jméno s tituly
        vytvoril_uzivatel_detail: invoice.vytvoril_uzivatel_detail || null, // Kompletní objekt
        dt_vytvoreni: invoice.dt_vytvoreni,
        dt_aktualizace: invoice.dt_aktualizace,
        aktivni: invoice.aktivni === 1 || invoice.aktivni === true,
        
        // Věcná správnost - přenést všechna pole z BE
        potvrdil_vecnou_spravnost_id: invoice.potvrdil_vecnou_spravnost_id || null,
        potvrdil_vecnou_spravnost_jmeno: (() => {
          // Sestavit celé jméno s tituly: "Bc. Jan Novák, Ph.D."
          if (!invoice.potvrdil_vecnou_spravnost_prijmeni) return null;
          const parts = [];
          if (invoice.potvrdil_vecnou_spravnost_titul_pred) {
            parts.push(invoice.potvrdil_vecnou_spravnost_titul_pred);
          }
          if (invoice.potvrdil_vecnou_spravnost_jmeno) {
            parts.push(invoice.potvrdil_vecnou_spravnost_jmeno);
          }
          parts.push(invoice.potvrdil_vecnou_spravnost_prijmeni);
          let fullName = parts.join(' ');
          if (invoice.potvrdil_vecnou_spravnost_titul_za) {
            fullName += ', ' + invoice.potvrdil_vecnou_spravnost_titul_za;
          }
          return fullName;
        })(),
        potvrdil_vecnou_spravnost_email: invoice.potvrdil_vecnou_spravnost_email || null,
        dt_potvrzeni_vecne_spravnosti: invoice.dt_potvrzeni_vecne_spravnosti || null,
        vecna_spravnost_potvrzeno: invoice.vecna_spravnost_potvrzeno === 1 || invoice.vecna_spravnost_potvrzeno === true,
        vecna_spravnost_poznamka: invoice.vecna_spravnost_poznamka || null,
        vecna_spravnost_umisteni_majetku: invoice.vecna_spravnost_umisteni_majetku || null,
        
        // Předáno zaměstnanci
        fa_predana_zam_id: invoice.fa_predana_zam_id || null,
        fa_predana_zam_jmeno_cele: invoice.fa_predana_zam_jmeno_cele || null,
        fa_datum_predani_zam: invoice.fa_datum_predani_zam || null,
        fa_datum_vraceni_zam: invoice.fa_datum_vraceni_zam || null,
        
        // Zkrácená jména pro tabulku
        vytvoril_uzivatel_zkracene: invoice.vytvoril_uzivatel_zkracene || null,
        potvrdil_vecnou_spravnost_zkracene: invoice.potvrdil_vecnou_spravnost_zkracene || null,
        
        // 🎯 DODAVATEL - info z objednávky nebo smlouvy
        dodavatel_nazev: invoice.dodavatel_nazev || null,
        dodavatel_ico: invoice.dodavatel_ico || null,
        
        // 🎯 STAV OBJEDNÁVKY - pro zelené/oranžové/modré zbarvení
        objednavka_je_dokoncena: invoice.objednavka_je_dokoncena || false,
        objednavka_je_zkontrolovana: invoice.objednavka_je_zkontrolovana || false,
        
        // Vypočítaný status pro UI
        status: getInvoiceStatus(invoice)
      }));

      setInvoices(transformedInvoices);

      // ✅ Statistiky z BE - celkové součty podle filtru (NE jen aktuální stránka!)
      if (response.statistiky) {
        // BE vrací kompletní statistiky za celý filtr
        
        setStats({
          total: response.pagination?.total || 0,
          paid: response.statistiky.pocet_zaplaceno || 0,
          unpaid: response.statistiky.pocet_nezaplaceno || 0,
          overdue: response.statistiky.pocet_po_splatnosti || 0,
          withinDue: response.statistiky.pocet_ve_splatnosti || 0,
          storno: response.statistiky.pocet_storno || 0,
          vecnaSpravnost: response.statistiky.pocet_vecna_spravnost || 0,
          totalAmount: parseFloat(response.statistiky.celkem_castka) || 0,
          paidAmount: parseFloat(response.statistiky.celkem_zaplaceno) || 0,
          unpaidAmount: parseFloat(response.statistiky.celkem_nezaplaceno) || 0,
          overdueAmount: parseFloat(response.statistiky.celkem_po_splatnosti) || 0,
          withinDueAmount: parseFloat(response.statistiky.celkem_ve_splatnosti) || 0,
          stornoAmount: parseFloat(response.statistiky.celkem_storno) || 0,
          vecnaSpravnostAmount: parseFloat(response.statistiky.celkem_vecna_spravnost) || 0,
          myInvoices: response.statistiky.pocet_moje_faktury || 0,
          // ✅ Nové statistiky z BE
          withOrder: response.statistiky.pocet_s_objednavkou || 0,
          withContract: response.statistiky.pocet_s_smlouvou || 0,
          withoutOrder: response.statistiky.pocet_bez_prirazeni || 0,
          fromSpisovka: response.statistiky.pocet_ze_spisovky || 0,
          kontrolovano: response.statistiky.pocet_zkontrolovano || 0
        });
      } else {
        // Fallback: pokud BE nevrátilo statistiky, spočítej lokálně (jen aktuální stránka!)
        const localStats = transformedInvoices.reduce((acc, inv) => {
          acc.totalAmount += inv.castka;
          
          if (inv.status === 'paid') {
            acc.paid++;
            acc.paidAmount += inv.castka;
          }
          if (inv.status === 'unpaid') {
            acc.unpaid++;
            acc.unpaidAmount += inv.castka;
          }
          if (inv.status === 'overdue') {
            acc.overdue++;
            acc.overdueAmount += inv.castka;
          }
          
          // Faktury bez přiřazení (bez obj. ANI smlouvy)
          if (!inv.objednavka_id && !inv.smlouva_id) {
            acc.withoutOrder++;
          }
          
          // S objednávkou
          if (inv.objednavka_id) {
            acc.withOrder++;
          }
          
          // Se smlouvou
          if (inv.smlouva_id) {
            acc.withContract++;
          }
          
          // Ze Spisovky
          if (inv.from_spisovka) {
            acc.fromSpisovka++;
          }
          
          // Moje faktury
          if (user_id && inv.vytvoril_uzivatel_id === user_id) {
            acc.myInvoices++;
          }
          
          return acc;
        }, { total: 0, paid: 0, unpaid: 0, overdue: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, overdueAmount: 0, withoutOrder: 0, myInvoices: 0, withOrder: 0, withContract: 0, fromSpisovka: 0 });
        
        localStats.total = response.pagination?.total || transformedInvoices.length;
        setStats(localStats);
      }
      setError(null);

    } catch (err) {
      console.error('❌ Chyba při načítání faktur:', err);
      
      // Speciální handling pro 404 - endpoint ještě není implementován na BE
      let errorMsg;
      if (err?.message?.includes('Endpoint nenalezen') || err?.message?.includes('404')) {
        errorMsg = '⚠️ Seznam faktur je momentálně ve vývoji. Backend endpoint invoices25/list ještě není dostupný. Faktury lze zatím zobrazit v detailu jednotlivých objednávek.';
        console.warn('🚧 Backend endpoint invoices25/list není dostupný (404)');
      } else {
        errorMsg = translateErrorMessage(err?.message || err?.toString() || 'Došlo k chybě při načítání faktur');
      }
      
      setError(errorMsg);
      showToast?.(errorMsg, { type: err?.message?.includes('404') ? 'warning' : 'error' });
      setInvoices([]);
    } finally {
      setLoading(false);
      hideProgress?.();
    }
  }, [token, username, selectedYear, currentPage, itemsPerPage, debouncedColumnFilters, filters, globalSearchTerm, sortField, sortDirection, isAdmin, showOnlyInactive, showProgress, hideProgress, showToast, getInvoiceStatus]);

  // Initial load
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]); // showOnlyInactive is already in loadData dependencies

  // ⚠️ DEPRECATED: Načtení stavů kontrol - již se nepoužívá!
  // Backend nyní vrací check_status přímo v seznamu faktur
  // Tento useEffect ponecháno pouze pro případ toggle kontroly (refresh jedné faktury)
  useEffect(() => {
    // Již se nenačítá automaticky - check_status je v invoice objektu
    // Tento hook se spustí pouze po toggle kontroly (když se změní invoiceChecks)
  }, [invoices, token, username]);

  // Načtení typů faktur z DB (pouze jednou při mount)
  useEffect(() => {
    const loadInvoiceTypes = async () => {
      if (!token || !username || invoiceTypes.length > 0) return;
      
      setInvoiceTypesLoading(true);
      try {
        const data = await getInvoiceTypes25({ token, username, aktivni: 1 });
        if (data && Array.isArray(data)) {
          setInvoiceTypes(data);
        }
      } catch (err) {
        console.error('Chyba při načítání typů faktur:', err);
      } finally {
        setInvoiceTypesLoading(false);
      }
    };

    loadInvoiceTypes();
  }, [token, username, invoiceTypes.length]);
  
  // 📋 Načtení počtu objednávek připravených k fakturaci (pouze při mount)
  useEffect(() => {
    const loadCount = async () => {
      if (!token || !username || !(canManageInvoices || isAdmin)) {
        return;
      }
      
      try {
        const currentYear = new Date().getFullYear();
        
        const response = await getOrdersList25({
          token,
          username,
          filters: {
            rok: currentYear,
            stav_objednavky: 'FAKTURACE' // 📋 Filtr na BE - jen objednávky ve stavu FAKTURACE
          }
        });

        if (Array.isArray(response)) {
          // Filtruj na FE: pouze bez faktury
          const count = response.filter(order => 
            (!order.faktury || order.faktury.length === 0) && 
            (!order.faktury_count || order.faktury_count === 0)
          ).length;
          
          setOrdersReadyCount(count);
        }
      } catch (error) {
        console.error('❌ Chyba při načítání počtu objednávek:', error);
      }
    };
    
    loadCount();
  }, [token, username, canManageInvoices, isAdmin]);
  
  // 📋 Refresh count při návratu na stránku (například po evidenci faktury)
  useEffect(() => {
    // Pokud se uživatel vrátí na stránku, aktualizuj počet
    const handleVisibilityChange = () => {
      if (!document.hidden && token && username && (canManageInvoices || isAdmin)) {
        // Stránka se stala viditelnou, refresh count
        const loadCount = async () => {
          try {
            const currentYear = new Date().getFullYear();
            const response = await getOrdersList25({
              token,
              username,
              filters: {
                rok: currentYear,
                stav_objednavky: 'FAKTURACE' // 📋 Filtr na BE
              }
            });

            if (Array.isArray(response)) {
              const count = response.filter(order => 
                (!order.faktury || order.faktury.length === 0) && 
                (!order.faktury_count || order.faktury_count === 0)
              ).length;
              setOrdersReadyCount(count);
            }
          } catch (error) {
            console.error('❌ Chyba při aktualizaci počtu objednávek:', error);
          }
        };
        loadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token, username, canManageInvoices, isAdmin]);
  
  // Připravit options pro CustomSelect komponenty
  const invoiceTypeOptions = useMemo(() => {
    const types = invoiceTypes.map(type => ({
      value: type.id,
      label: type.nazev.toUpperCase(),
      nazev: type.nazev
    }));
    return [{ value: '', label: 'Vše', nazev: 'Vše' }, ...types];
  }, [invoiceTypes]);
  
  const stavOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Vše' },
      { value: 'ZAEVIDOVANA', label: 'Zaevidovaná' },
      { value: 'VECNA_SPRAVNOST', label: 'Věcná správnost' },
      { value: 'V_RESENI', label: 'V řešení' },
      { value: 'PREDANA_PO', label: 'Předaná PO' },
      { value: 'K_ZAPLACENI', label: 'K zaplacení' },
      { value: 'ZAPLACENO', label: 'Zaplaceno' },
      { value: 'DOKONCENA', label: 'Dokončená' },
      { value: 'STORNO', label: 'Storno' },
    ];
    return options;
  }, []);
  
  const vecnaKontrolaOptions = useMemo(() => [
    { value: '', label: 'Vše' },
    { value: 'yes', label: 'Provedena' },
    { value: 'no', label: 'Neprovedena' },
  ], []);

  // Reset na první stránku při změně filtrů
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters, selectedYear, globalSearchTerm]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get invoice type display name
  const getInvoiceTypeName = (invoice) => {
    // Pokud backend vrací fa_typ_nazev z JOINu, použij ho
    if (invoice.fa_typ_nazev) {
      return invoice.fa_typ_nazev.toUpperCase();
    }
    
    // Fallback: najdi typ v načtených typech z DB
    const foundType = invoiceTypes.find(type => type.id === invoice.fa_typ);
    if (foundType) {
      return foundType.nazev.toUpperCase();
    }
    
    // Poslední fallback: hardcoded názvy
    switch(invoice.fa_typ) {
      case 'BEZNA': return 'BĚŽNÁ';
      case 'ZALOHOVA': return 'ZÁLOHOVÁ';
      case 'OPRAVNA': return 'OPRAVNÁ';
      case 'PROFORMA': return 'PROFORMA';
      case 'DOBROPIS': return 'DOBROPIS';
      case 'VYUCTOVACI': return 'VYÚČTOVACÍ';
      case 'JINA': return 'JINÁ';
      default: return invoice.fa_typ || '—';
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    switch(status) {
      case 'paid': return 'Zaplaceno';
      case 'unpaid': return 'Nezaplaceno';
      case 'overdue': return 'Po splatnosti';
      default: return 'Neznámý';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch(status) {
      case 'paid': return faCheckCircle;
      case 'unpaid': return faHourglassHalf;
      case 'overdue': return faExclamationTriangle;
      default: return faFileInvoice;
    }
  };

  // Překlad workflow stavů faktury (skutečný stav ze sloupce 'stav')
  const getWorkflowStatusLabel = (stav) => {
    switch(stav) {
      case 'NOVA': return 'Nová';
      case 'NEZAPLACENO': return 'Nezaplaceno';
      case 'K_ZAPLACENI': return 'K zaplacení';
      case 'ZAPLACENO': return 'Zaplaceno';
      case 'DOKONCENA': return 'Dokončena';
      case 'STORNO': return 'Storno';
      case 'VECNA_SPRAVNOST': return 'Věcná správnost';
      case 'SCHVALENO': return 'Schváleno';
      default: return stav || 'Neznámý';
    }
  };

  // Ikona pro workflow stav
  const getWorkflowStatusIcon = (stav) => {
    switch(stav) {
      case 'NOVA': return faFileInvoice;
      case 'NEZAPLACENO': return faHourglassHalf;
      case 'K_ZAPLACENI': return faMoneyBillWave;
      case 'ZAPLACENO': return faCheckCircle;
      case 'DOKONCENA': return faCheckCircle;
      case 'STORNO': return faTimesCircle;
      case 'VECNA_SPRAVNOST': return faCheckSquare;
      case 'SCHVALENO': return faCheck;
      default: return faFileInvoice;
    }
  };

  // Barva pro workflow stav
  const getWorkflowStatusColor = (stav) => {
    switch(stav) {
      case 'NOVA': return '#3b82f6';
      case 'NEZAPLACENO': return '#f59e0b';
      case 'K_ZAPLACENI': return '#10b981';
      case 'ZAPLACENO': return '#059669';
      case 'DOKONCENA': return '#059669';
      case 'STORNO': return '#ef4444';
      case 'VECNA_SPRAVNOST': return '#8b5cf6';
      case 'SCHVALENO': return '#10b981';
      default: return '#64748b';
    }
  };

  // Handler pro třídění tabulky
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      // Cycle: ASC → DESC → NONE (reset)
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        // Zrušit třídění
        setSortField('');
        setSortDirection('asc');
      }
    } else {
      // Nové pole -> výchozí směr ASC
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // ⚠️ ŘAZENÍ DĚLÁ BACKEND - invoices už jsou seřazené podle sortField a sortDirection!
  // Client-side řazení je zakázáno - používáme data přímo z BE
  const sortedInvoices = useMemo(() => {
    return invoices; // Backend už vrací seřazená a filtrovaná data
  }, [invoices]);

  // ⚠️ Filtrování a pagination dělá BE - invoices už jsou filtrované a stránkované!
  
  // Handlers
  const handleRefresh = async () => {
    try {
      setCurrentPage(1); // Reset na první stránku
      await loadData();
      showToast?.('✅ Seznam faktur byl obnoven z databáze', 'success');
    } catch (err) {
      console.error('❌ Chyba při obnovování seznamu faktur:', err);
      showToast?.('❌ Chyba při obnovování seznamu faktur', 'error');
    }
  };
  
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const handleViewInvoice = async (invoice) => {
    setSlidePanelInvoice(invoice);
    setSlidePanelOpen(true);
    
    // Přílohy jsou už v invoice.prilohy - není potřeba volat API
    setSlidePanelAttachments(invoice.prilohy || []);
    setSlidePanelLoading(false);
  };

  const handleEditInvoice = async (invoice) => {
    // 🔒 KONTROLA LOCK před editací faktury s objednávkou
    if (invoice.objednavka_id) {
      try {
        const { getOrderV2 } = await import('../services/apiOrderV2');
        const orderCheck = await getOrderV2(invoice.objednavka_id, token, username, false);
        
        // ⚠️ DŮLEŽITÉ: Blokuj pouze pokud je locked === true (zamčená JINÝM uživatelem)
        // Pokud is_owned_by_me === true, NEPŘERUŠUJ (můžu pokračovat)
        // Pokud is_expired === true, NEPŘERUŠUJ (zámek vypršel po 15 minutách)
        if (orderCheck?.lock_info?.locked === true && !orderCheck?.lock_info?.is_owned_by_me && !orderCheck?.lock_info?.is_expired) {
          const lockInfo = orderCheck.lock_info;
          const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
          
          // Ulož info o zamčení
          setLockedOrderInfo({
            lockedByUserName,
            lockedByUserEmail: lockInfo.locked_by_user_email || null,
            lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
            lockedAt: lockInfo.locked_at || null,
            lockAgeMinutes: lockInfo.lock_age_minutes || null,
            canForceUnlock: false, // V invoice listu neumožňujeme force unlock
            orderId: invoice.objednavka_id
          });
          setShowLockedOrderDialog(true);
          return;
        }
      } catch (err) {
        // ⚠️ DŮLEŽITÉ: Chyba při kontrole LOCK - zobraz dialog, NEPŘECHÁZEJ na stránku
        console.error('⚠️ LOCK Invoices25List: Chyba kontroly LOCK obj #' + invoice.objednavka_id, err);
        
        const lockInfo = {
          lockedByUserName: 'Nedostupné',
          lockedByUserEmail: null,
          lockedByUserTelefon: null,
          lockedAt: null,
          lockAgeMinutes: null,
          canForceUnlock: false,
          orderId: invoice.objednavka_id,
          errorMessage: err?.message || 'Chyba při načítání informací o objednávce'
        };
        
        setLockedOrderInfo(lockInfo);
        setShowLockedOrderDialog(true);
        return; // ⚠️ VŽDY ukonči - NIKDY nenaviguj při chybě
      }
    }
    
    // ✅ Není zamčená nebo nemá objednávku - pokračuj s editací
    navigate('/invoice-evidence', { 
      state: { 
        editInvoiceId: invoice.id,
        orderIdForLoad: invoice.objednavka_id || null
      } 
    });
  };

  // Handler pro odpojení faktury od objednávky/smlouvy
  const handleUnlinkInvoice = (invoice) => {
    const entityType = invoice.objednavka_id ? 'objednávky' : invoice.smlouva_id ? 'smlouvy' : null;
    const entityNumber = invoice.objednavka_id 
      ? (invoice.cislo_objednavky || `#${invoice.objednavka_id}`)
      : invoice.smlouva_id 
        ? (invoice.cislo_smlouvy || `#${invoice.smlouva_id}`)
        : null;
    
    if (!entityType) {
      showToast?.('Faktura není přiřazena k žádné objednávce ani smlouvě', { type: 'warning' });
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: `⚠️ Odpojit fakturu od ${entityType}?`,
      message: `Opravdu chcete odpojit fakturu ${invoice.fa_cislo_vema || invoice.cislo_faktury || `#${invoice.id}`} od ${entityType} ${entityNumber}?\n\n` +
        `Co se stane:\n` +
        `• Faktura zůstane v systému jako SAMOSTATNÁ\n` +
        `• ${entityType === 'objednávky' ? 'Objednávka' : 'Smlouva'} už nebude vidět tuto fakturu\n` +
        `• Workflow ${entityType === 'objednávky' ? 'objednávky' : 'smlouvy'} se může změnit\n` +
        `• Čerpání LP bude odebráno (pokud bylo přiřazeno)\n` +
        `• Věcná správnost bude VYMAZÁNA (datum, umístění, potvrzující uživatel)\n` +
        `• Předání zaměstnanci bude VYMAZÁNO (komu, datum předání i vrácení)\n\n` +
        `⚠️ Tuto akci NELZE vzít zpět!`,
      onConfirm: async () => {
        try {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
          
          // API call pro odpojení
          const { updateInvoiceV2 } = await import('../services/api25invoices');
          const updateData = {};
          
          // Nastavit správné pole podle entity type
          if (invoice.objednavka_id) {
            updateData.objednavka_id = null; // Odpojit od objednávky
          }
          if (invoice.smlouva_id) {
            updateData.smlouva_id = null; // Odpojit od smlouvy
          }
          
          // ✅ Vymazat všechny údaje o věcné kontrole při odpojení
          // Protože věcná kontrola byla prováděna pro původní entitu
          updateData.dt_potvrzeni_vecne_spravnosti = null;
          updateData.vecna_spravnost_umisteni_majetku = null;
          updateData.vecna_spravnost_poznamka = null;
          updateData.potvrdil_vecnou_spravnost_id = null;
          updateData.vecna_spravnost_potvrzeno = 0;
          
          // ✅ Vymazat všechny údaje o předání zaměstnanci při odpojení
          updateData.fa_predana_zam_id = null;
          updateData.fa_datum_predani_zam = null;
          updateData.fa_datum_vraceni_zam = null;
          
          await updateInvoiceV2({
            token,
            username,
            invoice_id: invoice.id,
            updateData
          });
          
          // Refresh seznam faktur
          loadData();
          
          showToast?.(
            `✅ Faktura ${invoice.fa_cislo_vema || invoice.cislo_faktury || `#${invoice.id}`} byla odpojena od ${entityType} ${entityNumber}`,
            { type: 'success' }
          );
        } catch (err) {
          console.error('❌ Chyba při odpojování faktury:', err);
          showToast?.(
            `Nepodařilo se odpojit fakturu: ${err.message || 'Neznámá chyba'}`,
            { type: 'error' }
          );
        }
      },
      onCancel: () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  const handleDeleteInvoice = (invoice) => {
    // Pokud je faktura neaktivní, nastav výchozí akci na 'restore'
    const initialType = (!invoice.aktivni && isAdmin) ? 'restore' : 'soft';
    setDeleteType(initialType);
    setDeleteDialog({
      isOpen: true,
      invoice
    });
  };
  
  // Handler pro otevření dialogu věcné kontroly
  const handleOpenVecnaKontrola = async (invoice) => {
    
    // 🔒 KONTROLA LOCK před otevřením věcné kontroly faktury s objednávkou
    if (invoice.objednavka_id) {
      try {
        const { getOrderV2 } = await import('../services/apiOrderV2');
        const orderCheck = await getOrderV2(invoice.objednavka_id, token, username, false);
        
        // ⚠️ DŮLEŽITÉ: Blokuj pouze pokud je locked === true (zamčená JINÝM uživatelem)
        // Pokud is_owned_by_me === true, NEPŘERUŠUJ (můžu pokračovat)
        // Pokud is_expired === true, NEPŘERUŠUJ (zámek vypršel po 15 minutách)
        if (orderCheck?.lock_info?.locked === true && !orderCheck?.lock_info?.is_owned_by_me && !orderCheck?.lock_info?.is_expired) {
          const lockInfo = orderCheck.lock_info;
          const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
          
          // Ulož info o zamčení
          setLockedOrderInfo({
            lockedByUserName,
            lockedByUserEmail: lockInfo.locked_by_user_email || null,
            lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
            lockedAt: lockInfo.locked_at || null,
            lockAgeMinutes: lockInfo.lock_age_minutes || null,
            canForceUnlock: false, // V invoice listu neumozňujeme force unlock
            orderId: invoice.objednavka_id
          });
          setShowLockedOrderDialog(true);
          return; // Přeruš otevírání dialogu věcné kontroly
        }
      } catch (err) {
        // ⚠️ DŮLEŽITÉ: Rozlišit typ chyby
        console.error('⚠️ LOCK Invoices25List: Chyba kontroly LOCK obj #' + invoice.objednavka_id, err);
        
        // 🔥 403 Forbidden - uživatel nemá právo vidět objednávku
        if (err?.message?.includes('Nemáte oprávnění') || err?.message?.includes('oprávnění')) {
          showToast?.(
            `Nemáte oprávnění k zobrazení objednávky #${invoice.objednavka_id}. Faktura může být přiřazena k objednávce z jiné organizace.`,
            { type: 'error', duration: 6000 }
          );
          return; // ⚠️ Nepokračuj - uživatel nemá právo
        }
        
        // 🔥 Jiná chyba - zobraz locked dialog s chybovou hláškou
        const lockInfo = {
          lockedByUserName: 'Nedostupné',
          lockedByUserEmail: null,
          lockedByUserTelefon: null,
          lockedAt: null,
          lockAgeMinutes: null,
          canForceUnlock: false,
          orderId: invoice.objednavka_id,
          errorMessage: err?.message || 'Chyba při načítání informací o objednávce'
        };
        
        setLockedOrderInfo(lockInfo);
        setShowLockedOrderDialog(true);
        return; // ⚠️ VŽDY ukonči
      }
    }
    
    // ✅ Není zamčená nebo nemá objednávku - otevři formular věcné kontroly
    
    // Navigovat na InvoiceEvidencePage s editInvoiceId a příznakem materialCorrectness
    navigate('/invoice-evidence', { 
      state: { 
        editInvoiceId: invoice.id,
        orderIdForLoad: invoice.objednavka_id || null,
        openMaterialCorrectness: true // Příznak pro automatické otevření sekce věcné kontroly
      } 
    });
  };

  const confirmDeleteInvoice = async (hardDelete = false) => {
    const { invoice } = deleteDialog;
    
    if (!invoice) return;
    
    try {
      showProgress?.('Odstraňuji fakturu...');
      
      await deleteInvoiceV2(invoice.id, token, username, hardDelete);
      
      showToast?.(`Faktura ${invoice.cislo_faktury} byla úspěšně ${hardDelete ? 'trvale smazána' : 'odstraněna'}`, { 
        type: 'success' 
      });
      
      // Zavřít dialog
      setDeleteDialog({ isOpen: false, invoice: null });
      setDeleteType('soft');
      
      // Obnovit seznam
      loadData();
      
    } catch (err) {
      console.error('Error deleting invoice:', err);
      
      // 🔍 Pokud je 404, faktura již byla smazána - jen refreshnout seznam
      if (err.message?.includes('nenalezena') || err.message?.includes('404')) {
        showToast?.(`Faktura ${invoice.cislo_faktury} již byla dříve smazána`, { type: 'info' });
        loadData();
      } else if (err.message?.includes('oprávnění') || err.message?.includes('administrátor') || err.message?.includes('SUPERADMIN')) {
        // ⚠️ 403 Forbidden - permission error (NEODHLAŠOVAT!)
        showToast?.(err.message || 'Nemáte oprávnění k této akci', { type: 'error', duration: 5000 });
      } else {
        showToast?.(err.message || 'Chyba při mazání faktury', { type: 'error' });
      }
      
      // ✅ VŽDY zavřít dialog při jakékoliv chybě
      setDeleteDialog({ isOpen: false, invoice: null });
      setDeleteType('soft');
      
    } finally {
      hideProgress?.();
    }
  };

  const confirmRestoreInvoice = async () => {
    const { invoice } = deleteDialog;
    
    if (!invoice) return;
    
    try {
      showProgress?.('Obnovuji fakturu...');
      
      await restoreInvoiceV2(invoice.id, token, username);
      
      showToast?.(`Faktura ${invoice.cislo_faktury} byla úspěšně obnovena`, { 
        type: 'success' 
      });
      
      // Zavřít dialog
      setDeleteDialog({ isOpen: false, invoice: null });
      setDeleteType('soft');
      
      // Obnovit seznam
      loadData();
      
    } catch (err) {
      console.error('Error restoring invoice:', err);
      
      if (err.message?.includes('oprávnění') || err.message?.includes('administrátor') || err.message?.includes('SUPERADMIN')) {
        showToast?.(err.message || 'Nemáte oprávnění k této akci', { type: 'error', duration: 5000 });
      } else {
        showToast?.(err.message || 'Chyba při obnově faktury', { type: 'error' });
      }
      
      // Zavřít dialog
      setDeleteDialog({ isOpen: false, invoice: null });
      setDeleteType('soft');
      
    } finally {
      hideProgress?.();
    }
  };

  // Handle invoice status change (workflow state)
  const handleStatusChange = async (invoice, newStatus) => {
    if (!invoice || !newStatus) return;
    
    // ⚠️ KONTROLA: Pokud je současný stav ZAPLACENO a uživatel mění na jiný stav -> zobrazit warning
    const currentStatus = invoice.stav || 'ZAEVIDOVANA';
    if (currentStatus === 'ZAPLACENO' && newStatus !== 'ZAPLACENO') {
      setStatusChangeDialog({
        isOpen: true,
        invoice: invoice,
        newStatus: newStatus
      });
      return; // Přerušit - čeká se na potvrzení
    }
    
    // Provést změnu přímo (bez dialogu)
    await performStatusChange(invoice, newStatus);
  };
  
  // Provést změnu workflow stavu (voláno přímo nebo po potvrzení dialogu)
  const performStatusChange = async (invoice, newStatus) => {
    if (!invoice || !newStatus) return;
    
    const currentStatus = invoice.stav || 'ZAEVIDOVANA';
    
    try {
      showProgress?.(`Měním stav faktury na ${newStatus}...`);
      
      await updateInvoiceV2({
        token,
        username,
        invoice_id: invoice.id,
        updateData: {
          stav: newStatus
        }
      });
      
      // Lokální update faktury - optimistický update
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => {
          if (inv.id === invoice.id) {
            const updates = { stav: newStatus };
            
            // Pokud měníme Z ZAPLACENO na jiný stav -> zrušit fa_zaplacena flag
            if (currentStatus === 'ZAPLACENO' && newStatus !== 'ZAPLACENO') {
              updates.zaplacena = false;
              updates.fa_zaplacena = false;
            }
            
            // Pokud měníme NA ZAPLACENO -> nastavit fa_zaplacena flag
            if (newStatus === 'ZAPLACENO') {
              updates.zaplacena = true;
              updates.fa_zaplacena = true;
            }
            
            return { ...inv, ...updates };
          }
          return inv;
        })
      );
      
      showToast?.(
        `Stav faktury ${invoice.cislo_faktury} byl změněn`, 
        { type: 'success' }
      );
      
    } catch (err) {
      console.error('Error updating invoice status:', err);
      showToast?.(translateErrorMessage(err?.message) || 'Chyba při aktualizaci stavu faktury', { type: 'error' });
      // Při chybě obnov data ze serveru
      loadData();
    } finally {
      hideProgress?.();
    }
  };

  const handleTogglePaymentStatus = (invoice) => {
    // Use transformed 'zaplacena' field which is boolean
    const currentlyPaid = invoice.zaplacena;
    const newStatus = !currentlyPaid;
    
    // If changing to paid - do it directly without dialog
    if (newStatus === true) {
      confirmTogglePaymentStatus(invoice, newStatus);
    } else {
      // If changing to unpaid - show warning dialog
      setPaymentDialog({
        isOpen: true,
        invoice: invoice,
        newStatus: newStatus
      });
    }
  };

  // Confirm payment status change and update DB
  const confirmTogglePaymentStatus = async (invoice, newStatus) => {
    if (!invoice) return;
    
    try {
      showProgress?.('Aktualizuji stav platby...');
      
      const updateData = {
        fa_zaplacena: newStatus ? 1 : 0,
        // 🔥 FIX: Použít lokální české datum místo UTC
        fa_datum_uhrazeni: newStatus ? (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : null
      };
      
      // 🔄 Synchronizace workflow stavu s platbou
      if (newStatus) {
        // Nastavuji na ZAPLACENO → workflow stav = ZAPLACENO
        updateData.stav = 'ZAPLACENO';
      } else {
        // Zrušuji ZAPLACENO → pokud je workflow stav ZAPLACENO, vrátit na K_ZAPLACENI
        if (invoice.stav === 'ZAPLACENO') {
          updateData.stav = 'K_ZAPLACENI';
        }
      }
      
      await updateInvoiceV2({
        token,
        username,
        invoice_id: invoice.id,
        updateData
      });
      
      showToast?.(
        `Faktura ${invoice.cislo_faktury} označena jako ${newStatus ? 'ZAPLACENO ✅' : 'NEZAPLACENO ⏳'}`, 
        { type: 'success' }
      );
      
      // Zavřít dialog
      setPaymentDialog({ isOpen: false, invoice: null, newStatus: false });
      
      // Obnovit seznam
      loadData();
      
    } catch (err) {
      console.error('Error updating payment status:', err);
      showToast?.(err.message || 'Chyba při aktualizaci stavu platby', { type: 'error' });
    } finally {
      hideProgress?.();
    }
  };

  // Generate years for select
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2025; year--) {
      years.push(year);
    }
    return years;
  }, []);

  return (
    <>
      {/* Loading Overlay - při prvním načítání */}
      <LoadingOverlay $visible={loading && invoices.length === 0}>
        <LoadingSpinner $visible={loading} />
        <LoadingMessage $visible={loading}>Načítám faktury...</LoadingMessage>
        <LoadingSubtext $visible={loading}>Načítám přehled faktur z databáze...</LoadingSubtext>
      </LoadingOverlay>

      {/* Filtering Overlay - jemný při filtrování už načtených faktur */}
      <FilteringOverlay $visible={loading && invoices.length > 0}>
        <FilteringSpinner />
        <FilteringText>Filtruji...</FilteringText>
      </FilteringOverlay>

      <Container>
        {/* Year Filter Panel */}
        <YearFilterPanel>
          <YearFilterLeft>
            <YearFilterLabel>
              <FontAwesomeIcon icon={faCalendarAlt} />
              Rok:
            </YearFilterLabel>
            <YearFilterSelect value={selectedYear} onChange={handleYearChange}>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </YearFilterSelect>
            <TooltipWrapper text="Obnovit data" preferredPosition="bottom">
              <RefreshIconButton onClick={handleRefresh}>
                <FontAwesomeIcon icon={faSyncAlt} />
              </RefreshIconButton>
            </TooltipWrapper>
          </YearFilterLeft>
          
          <YearFilterTitle>
            Přehled faktur
            <FontAwesomeIcon icon={faFileInvoice} />
          </YearFilterTitle>
        </YearFilterPanel>

        {/* Action Bar - hlavní */}
        <ActionBar>
          {canManageInvoices && (
            <ActionButton $primary onClick={handleNavigateToEvidence}>
              <FontAwesomeIcon icon={faPlus} />
              Zaevidovat fakturu
            </ActionButton>
          )}
          
          {/* 📋 Tlačítko pro objednávky připravené k fakturaci */}
          {(canManageInvoices || isAdmin) && (
            <TooltipWrapper text="Zobrazit seznam objednávek připravených k fakturaci" preferredPosition="bottom">
              <ActionButton 
                onClick={handleOpenOrdersSidebar}
                disabled={ordersReadyCount === 0}
                style={{ opacity: ordersReadyCount === 0 ? 0.5 : 1, cursor: ordersReadyCount === 0 ? 'not-allowed' : 'pointer' }}
              >
                <FontAwesomeIcon icon={faFileInvoice} />
                Zaevidovat fakturu k objednávce ({ordersReadyCount})
              </ActionButton>
            </TooltipWrapper>
          )}
          
          {!showDashboard && (
            <TooltipWrapper text="Zobrazit přehledový dashboard s grafy" preferredPosition="bottom">
              <ActionButton onClick={handleToggleDashboard}>
                <FontAwesomeIcon icon={faDashboard} />
                Dashboard
              </ActionButton>
            </TooltipWrapper>
          )}
          
          {/* Export button - TEMPORARILY HIDDEN */}
          {false && (
            <ActionButton onClick={handleRefresh}>
              <FontAwesomeIcon icon={faDownload} />
              Export
            </ActionButton>
          )}
        </ActionBar>

        {/* Dashboard Cards - podmíneněně viditelný */}
        {showDashboard && (
          <DashboardPanel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faDashboard} style={{ color: '#3b82f6' }} />
                Dashboard faktur
              </h3>
              <TooltipWrapper text="Skrýt dashboard a zobrazit pouze tabulku faktur" preferredPosition="bottom">
                <ActionButton onClick={handleToggleDashboard}>
                  <FontAwesomeIcon icon={faTimes} />
                  Skrýt
                </ActionButton>
              </TooltipWrapper>
            </div>
            <DashboardGrid>
            {/* Large Summary Card - Celková částka */}
            <LargeStatCard $color="#8b5cf6" onClick={() => handleDashboardCardClick('all')}>
              <div>
                <LargeStatValue>{formatCurrency(stats.totalAmount)}</LargeStatValue>
                <LargeStatLabel>Celková částka {selectedYear}</LargeStatLabel>
              </div>
              <SummaryRow>
                <SummaryItem $color="#22c55e" $bg="#f0fdf4">
                  <SummaryLabel>Zaplaceno ({stats.paid})</SummaryLabel>
                  <SummaryValue>{formatCurrency(stats.paidAmount)}</SummaryValue>
                </SummaryItem>
                <SummaryItem $color="#f59e0b" $bg="#fef3c7">
                  <SummaryLabel>Nezaplaceno ({stats.unpaid})</SummaryLabel>
                  <SummaryValue>{formatCurrency(stats.unpaidAmount)}</SummaryValue>
                </SummaryItem>
                {stats.overdue > 0 && (
                  <SummaryItem $color="#ef4444" $bg="#fee2e2">
                    <SummaryLabel>Po splatnosti ({stats.overdue})</SummaryLabel>
                    <SummaryValue>{formatCurrency(stats.overdueAmount)}</SummaryValue>
                  </SummaryItem>
                )}
              </SummaryRow>
            </LargeStatCard>

            {/* Celkem faktur */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('all')}
              $isActive={activeFilterStatus === 'all'}
              $color="#3b82f6"
            >
              <StatHeader>
                <StatLabel>Celkem faktur</StatLabel>
                <StatIcon $color="#3b82f6">
                  <FontAwesomeIcon icon={faFileInvoice} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.total}</StatValue>
              <StatLabel>Všechny faktury {selectedYear}</StatLabel>
            </DashboardCard>

            {/* Věcná správnost */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('vecna_spravnost')}
              $isActive={activeFilterStatus === 'vecna_spravnost'}
              $color="#3b82f6"
            >
              <StatHeader>
                <StatLabel>Věcná správnost</StatLabel>
                <StatIcon $color="#3b82f6">
                  <FontAwesomeIcon icon={faCheckSquare} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.vecnaSpravnost}</StatValue>
              <StatLabel>Ve věcné kontrole</StatLabel>
            </DashboardCard>

            {/* Zaplaceno */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('paid')}
              $isActive={activeFilterStatus === 'paid'}
              $color="#22c55e"
            >
              <StatHeader>
                <StatLabel>Zaplaceno</StatLabel>
                <StatIcon $color="#22c55e">
                  <FontAwesomeIcon icon={faCheckCircle} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.paid}</StatValue>
              <StatLabel>Uhrazené faktury</StatLabel>
            </DashboardCard>

            {/* Nezaplaceno */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('unpaid')}
              $isActive={activeFilterStatus === 'unpaid'}
              $color="#f59e0b"
            >
              <StatHeader>
                <StatLabel>Nezaplaceno</StatLabel>
                <StatIcon $color="#f59e0b">
                  <FontAwesomeIcon icon={faHourglassHalf} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.unpaid}</StatValue>
              <StatLabel>Čekající na platbu</StatLabel>
            </DashboardCard>

            {/* Ve splatnosti */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('within_due')}
              $isActive={activeFilterStatus === 'within_due'}
              $color="#10b981"
            >
              <StatHeader>
                <StatLabel>Ve splatnosti</StatLabel>
                <StatIcon $color="#10b981">
                  <FontAwesomeIcon icon={faCheckCircle} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.withinDue}</StatValue>
              <StatLabel>Nezaplacené ve lhůtě</StatLabel>
            </DashboardCard>

            {/* Po splatnosti */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('overdue')}
              $isActive={activeFilterStatus === 'overdue'}
              $color="#ef4444"
            >
              <StatHeader>
                <StatLabel>Po splatnosti</StatLabel>
                <StatIcon $color="#ef4444">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.overdue}</StatValue>
              <StatLabel>Překročená splatnost</StatLabel>
            </DashboardCard>

            {/* Storno */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('storno')}
              $isActive={activeFilterStatus === 'storno'}
              $color="#64748b"
            >
              <StatHeader>
                <StatLabel>Storno</StatLabel>
                <StatIcon $color="#64748b">
                  <FontAwesomeIcon icon={faTimesCircle} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.storno}</StatValue>
              <StatLabel>Stornované faktury</StatLabel>
            </DashboardCard>

            {/* Faktury bez objednávky */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('without_order')}
              $isActive={activeFilterStatus === 'without_order'}
              $color="#94a3b8"
            >
              <StatHeader>
                <StatLabel>Bez přiřazení</StatLabel>
                <StatIcon $color="#94a3b8">
                  <FontAwesomeIcon icon={faTimesCircle} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.withoutOrder}</StatValue>
              <StatLabel>Nepřiřazené faktury</StatLabel>
            </DashboardCard>

            {/* Přiřazené k objednávce */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('with_order')}
              $isActive={activeFilterStatus === 'with_order'}
              $color="#8b5cf6"
            >
              <StatHeader>
                <StatLabel>Přiřazené OBJ</StatLabel>
                <StatIcon $color="#8b5cf6">
                  <FontAwesomeIcon icon={faFileContract} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.withOrder}</StatValue>
              <StatLabel>S objednávkou</StatLabel>
            </DashboardCard>

            {/* Přiřazené ke smlouvě */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('with_contract')}
              $isActive={activeFilterStatus === 'with_contract'}
              $color="#0ea5e9"
            >
              <StatHeader>
                <StatLabel>Přiřazené SML</StatLabel>
                <StatIcon $color="#0ea5e9">
                  <FontAwesomeIcon icon={faIdCard} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.withContract}</StatValue>
              <StatLabel>Se smlouvou</StatLabel>
            </DashboardCard>

            {/* Ze Spisovky */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('from_spisovka')}
              $isActive={activeFilterStatus === 'from_spisovka'}
              $color="#10b981"
            >
              <StatHeader>
                <StatLabel>Ze Spisovky</StatLabel>
                <StatIcon $color="#10b981">
                  <FontAwesomeIcon icon={faDatabase} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.fromSpisovka}</StatValue>
              <StatLabel>Import ze Spisovky</StatLabel>
            </DashboardCard>

            {/* Kontrola faktur */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('kontrolovano')}
              $isActive={activeFilterStatus === 'kontrolovano'}
              $color="#22c55e"
            >
              <StatHeader>
                <StatLabel>Kontrola faktur</StatLabel>
                <StatIcon $color="#22c55e">
                  <FontAwesomeIcon icon={faCheckCircle} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.kontrolovano}</StatValue>
              <StatLabel>Zkontrolováno</StatLabel>
            </DashboardCard>

            {/* Moje faktury - pouze pro admin/invoice_manage */}
            {canViewAllInvoices && (
              <DashboardCard 
                onClick={() => handleDashboardCardClick('my_invoices')}
                $isActive={activeFilterStatus === 'my_invoices'}
                $color="#06b6d4"
              >
                <StatHeader>
                  <StatLabel>Moje faktury</StatLabel>
                  <StatIcon $color="#06b6d4">
                    <FontAwesomeIcon icon={faUser} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{stats.myInvoices}</StatValue>
                <StatLabel>Předané / Věcná</StatLabel>
              </DashboardCard>
            )}
            </DashboardGrid>
          </DashboardPanel>
        )}

        {/* 🔍 Globální vyhledávání - pod dashboardem */}
        <SearchPanel>
          <SearchPanelHeader>
            <SearchPanelTitle>
              <FontAwesomeIcon icon={faSearch} />
              Vyhledávání
            </SearchPanelTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* 🔧 ADMIN: Checkbox pro zobrazení POUZE neaktivních faktur */}
              {isAdmin && (
                <AdminCheckboxWrapper title="Zobrazit pouze neaktivní (smazané) faktury - viditelné pouze pro administrátory">
                  <input
                    type="checkbox"
                    checked={showOnlyInactive}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setShowOnlyInactive(newValue);
                      setCurrentPage(1); // Reset to first page when toggling
                    }}
                  />
                  <FontAwesomeIcon icon={faEyeSlash} />
                  <span>Pouze neaktivní</span>
                </AdminCheckboxWrapper>
              )}
              <ClearAllButton onClick={handleClearAllFilters} title="Vymazat všechny filtry">
                <FontAwesomeIcon icon={faEraser} />
                Vymazat filtry
              </ClearAllButton>
            </div>
          </SearchPanelHeader>
          
          <SearchInputWrapper>
            <FontAwesomeIcon icon={faSearch} />
            <SearchInput
              type="text"
              placeholder="Hledat v čísle faktury, objednávky, organizaci, úseku, uživateli, poznámce..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrentPage(1);
                  loadData();
                }
              }}
            />
            {globalSearchTerm && (
              <SearchClearButton onClick={() => setGlobalSearchTerm('')}>
                <FontAwesomeIcon icon={faTimes} />
              </SearchClearButton>
            )}
          </SearchInputWrapper>
          
          {globalSearchTerm && (
            <SearchHint>
              💡 Vyhledávání probíhá bez diakritiky. Stiskněte Enter pro okamžité vyhledání.
            </SearchHint>
          )}
        </SearchPanel>

        {/* Table - vždy zobrazená s hlavičkou */}
        <TableScrollWrapper>
          <TableContainer ref={tableRef}>
            <Table>
              <TableHead>
                {/* Hlavní řádek se jmény sloupců */}
                <tr>
                  {/* PRVNÍ SLOUPEC - Kontrola řádku */}
                  <TableHeader title="Kontrola">
                    <FontAwesomeIcon icon={faCheckSquare} style={{ color: '#64748b' }} />
                  </TableHeader>
                  <TableHeader 
                    className={`date-column sortable ${sortField === 'dt_aktualizace' ? 'active' : ''}`}
                    onClick={() => handleSort('dt_aktualizace')}
                  >
                    Aktualizováno
                    {sortField === 'dt_aktualizace' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`wide-column sortable ${sortField === 'cislo_faktury' ? 'active' : ''}`}
                    onClick={() => handleSort('cislo_faktury')}
                    style={{ textAlign: 'center' }}
                  >
                    Faktura VS
                    {sortField === 'cislo_faktury' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`sortable ${sortField === 'fa_typ' ? 'active' : ''}`}
                    onClick={() => handleSort('fa_typ')}
                  >
                    Typ
                    {sortField === 'fa_typ' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`wide-column sortable ${sortField === 'cislo_objednavky' ? 'active' : ''}`}
                    onClick={() => handleSort('cislo_objednavky')}
                    style={{ whiteSpace: 'nowrap', textAlign: 'center' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>Obj/SML/Dodavatel</span>
                    </div>
                    {sortField === 'cislo_objednavky' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`date-column sortable ${sortField === 'datum_doruceni' ? 'active' : ''}`}
                    onClick={() => handleSort('datum_doruceni')}
                  >
                    Doručení
                    {sortField === 'datum_doruceni' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`date-column sortable ${sortField === 'datum_vystaveni' ? 'active' : ''}`}
                    onClick={() => handleSort('datum_vystaveni')}
                  >
                    Vystavení
                    {sortField === 'datum_vystaveni' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`date-column sortable ${sortField === 'datum_splatnosti' ? 'active' : ''}`}
                    onClick={() => handleSort('datum_splatnosti')}
                  >
                    Splatnost
                    {sortField === 'datum_splatnosti' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`amount-column sortable ${sortField === 'castka' ? 'active' : ''}`}
                    onClick={() => handleSort('castka')}
                    style={{ textAlign: 'center', minWidth: '180px', width: '180px' }}
                  >
                    Částka
                    {sortField === 'castka' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`status-column sortable ${sortField === 'status' ? 'active' : ''}`}
                    onClick={() => handleSort('status')}
                    style={{ textAlign: 'center' }}
                  >
                    Stav
                    {sortField === 'status' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`narrow-column sortable ${sortField === 'vytvoril_uzivatel' ? 'active' : ''}`}
                    onClick={() => handleSort('vytvoril_uzivatel')}
                  >
                    Zaevidoval
                    {sortField === 'vytvoril_uzivatel' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`sortable ${sortField === 'fa_predana_zam_jmeno' ? 'active' : ''}`}
                    onClick={() => handleSort('fa_predana_zam_jmeno')}
                    style={{ minWidth: '120px' }}
                  >
                    Předáno
                    {sortField === 'fa_predana_zam_jmeno' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`narrow-column sortable ${sortField === 'potvrdil_vecnou_spravnost_jmeno' ? 'active' : ''}`}
                    onClick={() => handleSort('potvrdil_vecnou_spravnost_jmeno')}
                  >
                    Věcnou provedl
                    {sortField === 'potvrdil_vecnou_spravnost_jmeno' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`sortable ${sortField === 'vecna_spravnost_potvrzeno' ? 'active' : ''}`}
                    onClick={() => handleSort('vecna_spravnost_potvrzeno')}
                    title="Věcná kontrola"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#64748b' }} />
                    {sortField === 'vecna_spravnost_potvrzeno' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`sortable ${sortField === 'pocet_priloh' ? 'active' : ''}`}
                    onClick={() => handleSort('pocet_priloh')}
                  >
                    <FontAwesomeIcon icon={faPaperclip} style={{ color: '#64748b' }} />
                    {sortField === 'pocet_priloh' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#64748b' }} />
                  </TableHeader>
                </tr>
                {/* NOVÝ KONZISTENTNÍ FILTROVACÍ ŘÁDEK */}
                <tr className="filter-row">
                  {/* Kontrola řádku - PRVNÍ SLOUPEC */}
                  <TableHeader className="filter-cell">
                    <button
                      onClick={() => {
                        const currentState = columnFilters.kontrola_radku || 'all';
                        const nextState = currentState === 'all' ? 'kontrolovano' : 
                                         currentState === 'kontrolovano' ? 'nekontrolovano' : 
                                         'all';
                        setColumnFilters({...columnFilters, kontrola_radku: nextState});
                      }}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                      }}
                      title={(() => {
                        const state = columnFilters.kontrola_radku || 'all';
                        if (state === 'kontrolovano') return 'Filtr: Pouze zkontrolované (klikněte pro nekontrolované)';
                        if (state === 'nekontrolovano') return 'Filtr: Pouze nekontrolované (klikněte pro vše)';
                        return 'Filtr: Vše (klikněte pro zkontrolované)';
                      })()}
                    >
                      {(() => {
                        const state = columnFilters.kontrola_radku || 'all';
                        if (state === 'all') {
                          return (
                            <svg viewBox="0 0 448 512" style={{ width: '20px', height: '20px' }}>
                              <defs>
                                <clipPath id="clip-left-kontrola">
                                  <rect x="0" y="0" width="224" height="512"/>
                                </clipPath>
                                <clipPath id="clip-right-kontrola">
                                  <rect x="224" y="0" width="224" height="512"/>
                                </clipPath>
                              </defs>
                              {/* Plný vyplněný čtvereček - levá polovina zelená */}
                              <path d="M384 32C419.3 32 448 60.65 448 96V416C448 451.3 419.3 480 384 480H64C28.65 480 0 451.3 0 416V96C0 60.65 28.65 32 64 32H384z"
                                    fill="#10b981" clipPath="url(#clip-left-kontrola)"/>
                              {/* Plný vyplněný čtvereček - pravá polovina šedá */}
                              <path d="M384 32C419.3 32 448 60.65 448 96V416C448 451.3 419.3 480 384 480H64C28.65 480 0 451.3 0 416V96C0 60.65 28.65 32 64 32H384z"
                                    fill="#94a3b8" clipPath="url(#clip-right-kontrola)"/>
                            </svg>
                          );
                        }
                        if (state === 'kontrolovano') {
                          return <FontAwesomeIcon icon={faCheckSquare} style={{ color: '#10b981', fontSize: '20px' }}/>;
                        }
                        // Nekontrolováno - prázdný čtvereček se silnějším obrysem
                        return (
                          <svg viewBox="0 0 448 512" style={{ width: '20px', height: '20px' }}>
                            <path d="M384 32C419.3 32 448 60.65 448 96V416C448 451.3 419.3 480 384 480H64C28.65 480 0 451.3 0 416V96C0 60.65 28.65 32 64 32H384zM384 80H64C55.16 80 48 87.16 48 96V416C48 424.8 55.16 432 64 432H384C392.8 432 400 424.8 400 416V96C400 87.16 392.8 80 384 80z"
                                  fill="#64748b" 
                                  stroke="#64748b" 
                                  strokeWidth="32"/>
                          </svg>
                        );
                      })()}
                    </button>
                  </TableHeader>
                  
                  {/* Aktualizováno */}
                  <TableHeader className="filter-cell">
                    <div className="date-filter-wrapper">
                      <DatePicker
                        fieldName="dt_aktualizace"
                        value={columnFilters.dt_aktualizace || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, dt_aktualizace: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>

                  {/* Číslo faktury */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faSearch} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Číslo faktury..."
                        value={columnFilters.cislo_faktury || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, cislo_faktury: e.target.value})}
                      />
                      {columnFilters.cislo_faktury && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, cislo_faktury: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Typ faktury */}
                  <TableHeader className="filter-cell">
                    <div className="select-filter-wrapper">
                      <CustomSelect
                        value={columnFilters.fa_typ || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, fa_typ: value})}
                        options={invoiceTypeOptions}
                        field="fa_typ"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        enableSearch={false}
                        placeholder="Všechny typy"
                        disabled={invoiceTypesLoading}
                      />
                    </div>
                  </TableHeader>

                  {/* Objednávka/Smlouva */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faSearch} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Obj./Smlouva..."
                        value={columnFilters.cislo_objednavky || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, cislo_objednavky: e.target.value})}
                        title="Hledá v číslech objednávek i smluv"
                      />
                      {columnFilters.cislo_objednavky && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, cislo_objednavky: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Doručení */}
                  <TableHeader className="filter-cell">
                    <div className="date-filter-wrapper">
                      <DatePicker
                        fieldName="datum_doruceni"
                        value={columnFilters.datum_doruceni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_doruceni: value})}
                        placeholder="Doručení"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>

                  {/* Vystavení */}
                  <TableHeader className="filter-cell">
                    <div className="date-filter-wrapper">
                      <DatePicker
                        fieldName="datum_vystaveni"
                        value={columnFilters.datum_vystaveni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_vystaveni: value})}
                        placeholder="Vystavení"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>

                  {/* Splatnost */}
                  <TableHeader className="filter-cell">
                    <div className="date-filter-wrapper">
                      <DatePicker
                        fieldName="datum_splatnosti"
                        value={columnFilters.datum_splatnosti || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_splatnosti: value})}
                        placeholder="Splatnost"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>

                  {/* Částka */}
                  <TableHeader className="filter-cell amount-column">
                    <div className="operator-filter-wrapper">
                      <OperatorInput
                        value={columnFilters.castka || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, castka: value})}
                        placeholder="Částka"
                        clearButton={true}
                        onClear={() => {
                          setColumnFilters({...columnFilters, castka: ''});
                        }}
                      />
                    </div>
                  </TableHeader>

                  {/* Stav */}
                  <TableHeader className="filter-cell">
                    <div className="select-filter-wrapper">
                      <CustomSelect
                        value={columnFilters.stav || ''}
                        onChange={(value) => {
                          setColumnFilters({...columnFilters, stav: value});
                        }}
                        options={stavOptions}
                        field="stav"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        enableSearch={false}
                        placeholder="Všechny stavy"
                      />
                    </div>
                  </TableHeader>

                  {/* Zaevidoval */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faUser} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Jméno..."
                        value={columnFilters.vytvoril_uzivatel || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, vytvoril_uzivatel: e.target.value})}
                      />
                      {columnFilters.vytvoril_uzivatel && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, vytvoril_uzivatel: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Předáno zaměstnanci */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faUser} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Jméno..."
                        value={columnFilters.predano_zamestnanec || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, predano_zamestnanec: e.target.value})}
                      />
                      {columnFilters.predano_zamestnanec && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, predano_zamestnanec: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Věcnou provedl */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faUser} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Jméno..."
                        value={columnFilters.vecnou_provedl || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, vecnou_provedl: e.target.value})}
                      />
                      {columnFilters.vecnou_provedl && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, vecnou_provedl: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Věcná kontrola */}
                  <TableHeader className="filter-cell">
                    <div className="select-filter-wrapper">
                      <CustomSelect
                        value={columnFilters.vecna_kontrola || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, vecna_kontrola: value})}
                        options={vecnaKontrolaOptions}
                        field="vecna_kontrola"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        enableSearch={false}
                        placeholder="Vše"
                      />
                    </div>
                  </TableHeader>

                  {/* Přílohy */}
                  <TableHeader className="filter-cell">
                    <div className="select-filter-wrapper">
                      <CustomSelect
                        value={activeFilterStatus === 'from_spisovka' ? 'spisovka' : (columnFilters.ma_prilohy || '')}
                        onChange={(value) => {
                          if (value === 'spisovka') {
                            setFilters(prev => ({ ...prev, filter_status: 'from_spisovka' }));
                            setActiveFilterStatus('from_spisovka');
                            setColumnFilters({...columnFilters, ma_prilohy: ''});
                          } else {
                            setFilters(prev => ({ ...prev, filter_status: '' }));
                            setActiveFilterStatus(null);
                            setColumnFilters({...columnFilters, ma_prilohy: value});
                          }
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: '', label: 'Vše' },
                          { value: 'without', label: 'Bez příloh' },
                          { value: 'with', label: 'S přílohami' },
                          { value: 'spisovka', label: 'Ze spisovky' }
                        ]}
                        field="ma_prilohy"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        enableSearch={false}
                        placeholder="Vše"
                      />
                    </div>
                  </TableHeader>

                  {/* Akce */}
                  <TableHeader className="filter-cell">
                    <div className="action-filter-wrapper">
                      <button
                        className="clear-all-button"
                        onClick={() => setColumnFilters({})}
                        title="Vymazat všechny filtry"
                      >
                        <FontAwesomeIcon icon={faEraser} />
                      </button>
                    </div>
                  </TableHeader>
                </tr>
              </TableHead>
              <tbody>
                {/* Error State v tabulce */}
                {error && (
                  <tr>
                    <td colSpan="16" style={{ padding: '3rem', textAlign: 'center' }}>
                      <EmptyStateIcon>
                        <FontAwesomeIcon icon={error.includes('ve vývoji') || error.includes('404') ? faExclamationTriangle : faTimesCircle} />
                      </EmptyStateIcon>
                      <EmptyStateText>{typeof error === 'string' ? error : error.message || 'Došlo k chybě při načítání faktur'}</EmptyStateText>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {(error.includes('ve vývoji') || error.includes('404')) && (
                          <ActionButton 
                            $primary 
                            onClick={() => navigate('/orders25')}
                            title="Faktury lze zobrazit v detailu jednotlivých objednávek"
                          >
                            <FontAwesomeIcon icon={faFileInvoice} style={{ marginRight: '0.5rem' }} />
                            Přejít na objednávky
                          </ActionButton>
                        )}
                        <ActionButton onClick={handleRefresh}>
                          <FontAwesomeIcon icon={faSyncAlt} style={{ marginRight: '0.5rem' }} />
                          Zkusit znovu
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                )}
                
                {/* Empty State v tabulce */}
                {!error && invoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan="16" style={{ padding: '3rem', textAlign: 'center' }}>
                      <EmptyStateIcon>
                        <FontAwesomeIcon icon={faFileInvoice} />
                      </EmptyStateIcon>
                      <EmptyStateText>Zatím nebyly nalezeny žádné faktury</EmptyStateText>
                    </td>
                  </tr>
                )}
                
                {/* Data rows */}
                {!error && sortedInvoices.map((invoice, idx) => (
                  <TableRow 
                    key={invoice.id}
                    data-storno={invoice.stav === 'STORNO' ? 'true' : 'false'}
                    data-inactive={!invoice.aktivni ? 'true' : 'false'}
                    style={{
                      backgroundColor: invoice.from_spisovka ? '#f0fdf4' : 'transparent'
                    }}
                  >
                    {/* Kontrola řádku faktury - PRVNÍ SLOUPEC */}
                    <TableCell className="center">
                      {(() => {
                        // ✅ OPTIMALIZACE: check_status a kontrola přichází přímo z BE v invoice objektu
                        const checkStatus = invoice.check_status || 'unchecked';
                        const kontrolaData = invoice.rozsirujici_data?.kontrola_radku;
                        const isChecked = kontrolaData?.kontrolovano || false;
                        
                        // ✅ TŘÍFÁZOVÝ SYSTÉM:
                        // - unchecked: ⚪ Nezkontrolováno
                        // - checked_ok: ✅ Zkontrolováno, beze změn (zelená)
                        // - checked_modified: ⚠️ Zkontrolováno, ale upraveno (oranžová)
                        
                        let accentColor = '#10b981';  // Default zelená
                        let tooltipText = '⚪ Nezkontrolováno';
                        
                        if (isChecked) {
                          if (checkStatus === 'checked_modified') {
                            accentColor = '#f59e0b';  // Oranžová
                            tooltipText = `⚠️ Zkontrolováno, ale následně upraveno\n\nKontroloval: ${kontrolaData?.kontroloval_cele_jmeno || kontrolaData?.kontroloval_username}\nDatum kontroly: ${kontrolaData?.dt_kontroly}\n\n⚠️ Faktura byla po kontrole upravena!\nPro potvrzení zkontrolujte znovu.`;
                          } else {
                            accentColor = '#10b981';  // Zelená
                            tooltipText = `✅ Zkontrolováno - v pořádku\n\nKontroloval: ${kontrolaData?.kontroloval_cele_jmeno || kontrolaData?.kontroloval_username}\nDatum kontroly: ${kontrolaData?.dt_kontroly}`;
                          }
                        }
                        
                        return (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!canControlInvoices}
                            onChange={async (e) => {
                              e.stopPropagation();
                              const newState = e.target.checked;
                              
                              // 🎯 OPTIMISTIC UPDATE: Okamžitě aktualizovat lokální stav bez refreshe
                              const optimisticUpdate = (prevInvoices) => {
                                return prevInvoices.map(inv => {
                                  if (inv.id === invoice.id) {
                                    return {
                                      ...inv,
                                      rozsirujici_data: {
                                        ...inv.rozsirujici_data,
                                        kontrola_radku: newState ? {
                                          kontrolovano: true,
                                          kontroloval_user_id: user_id,
                                          kontroloval_username: username,
                                          kontroloval_cele_jmeno: user?.fullName || username,
                                          dt_kontroly: new Date().toISOString()
                                        } : {
                                          kontrolovano: false,
                                          kontroloval_user_id: null,
                                          kontroloval_username: null,
                                          kontroloval_cele_jmeno: null,
                                          dt_kontroly: null
                                        }
                                      },
                                      check_status: newState ? 'checked_ok' : 'unchecked'
                                    };
                                  }
                                  return inv;
                                });
                              };
                              
                              // Okamžitě aktualizovat UI
                              setInvoices(optimisticUpdate);
                              
                              // 📊 Update statistiky
                              setStats(prevStats => ({
                                ...prevStats,
                                kontrolovano: prevStats.kontrolovano + (newState ? 1 : -1)
                              }));
                              
                              try {
                                // Provést API volání na pozadí
                                await toggleInvoiceCheck(
                                  invoice.id, 
                                  newState, 
                                  token, 
                                  username
                                );
                                
                                showToast(
                                  newState 
                                    ? '✅ Faktura označena jako zkontrolovaná' 
                                    : '⚪ Kontrola zrušena',
                                  'success'
                                );
                                
                              } catch (err) {
                                console.error('Chyba při změně stavu kontroly:', err);
                                // Rollback při chybě
                                setInvoices(prevInvoices => prevInvoices.map(inv => {
                                  if (inv.id === invoice.id) {
                                    return invoice; // Vrátit původní stav
                                  }
                                  return inv;
                                }));
                                setStats(prevStats => ({
                                  ...prevStats,
                                  kontrolovano: prevStats.kontrolovano - (newState ? 1 : -1)
                                }));
                                showToast(err.message || 'Chyba při změně stavu kontroly', 'error');
                              }
                            }}
                            style={{
                              cursor: canControlInvoices ? 'pointer' : 'not-allowed',
                              width: '18px',
                              height: '18px',
                              accentColor: accentColor,
                              opacity: canControlInvoices ? 1 : 0.5
                            }}
                            title={tooltipText}
                          />
                        );
                      })()}
                    </TableCell>
                    
                    <TableCell className="center">
                      <span className={`${invoice.stav === 'STORNO' ? 'storno-content' : ''} ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        {invoice.dt_aktualizace ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span>{formatDateOnly(invoice.dt_aktualizace)}</span>
                            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                              {new Date(invoice.dt_aktualizace).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="center">
                      <span className={`${invoice.stav === 'STORNO' ? 'storno-content' : ''} ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        <strong>{invoice.cislo_faktury}</strong>
                        {invoice.rozsirujici_data?.rocni_poplatek && (
                          <TooltipWrapper
                            content={
                              <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                                <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '8px' }}>
                                  💰 Faktura přiřazena k ročnímu poplatku
                                </strong>
                                <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                  <strong>Název:</strong> {invoice.rozsirujici_data.rocni_poplatek.nazev}
                                </div>
                                <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                  <strong>Rok:</strong> {invoice.rozsirujici_data.rocni_poplatek.rok}
                                </div>
                                {invoice.cislo_smlouvy && (
                                  <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                    <strong>Smlouva:</strong> {invoice.cislo_smlouvy}
                                  </div>
                                )}
                                {invoice.rozsirujici_data.rocni_poplatek.prirazeno_uzivatelem_jmeno && (
                                  <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                    <strong>Přiřadil:</strong> {invoice.rozsirujici_data.rocni_poplatek.prirazeno_uzivatelem_jmeno}
                                  </div>
                                )}
                                {invoice.rozsirujici_data.rocni_poplatek.prirazeno_dne && (
                                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '6px' }}>
                                    Datum přiřazení: {new Date(invoice.rozsirujici_data.rocni_poplatek.prirazeno_dne).toLocaleString('cs-CZ')}
                                  </div>
                                )}
                              </div>
                            }
                            position="top"
                            showDelay={200}
                          >
                            <InfoIconBadge style={{ marginLeft: '6px' }}>
                              <FontAwesomeIcon icon={faCoins} />
                            </InfoIconBadge>
                          </TooltipWrapper>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="center">
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: invoice.fa_typ === 'ZALOHOVA' ? '#dbeafe' : 
                                         invoice.fa_typ === 'OPRAVNA' ? '#fef3c7' : 
                                         invoice.fa_typ === 'PROFORMA' ? '#e0e7ff' : 
                                         invoice.fa_typ === 'DOBROPIS' ? '#dcfce7' : '#f1f5f9',
                          color: invoice.fa_typ === 'ZALOHOVA' ? '#1e40af' : 
                                 invoice.fa_typ === 'OPRAVNA' ? '#92400e' : 
                                 invoice.fa_typ === 'PROFORMA' ? '#4338ca' : 
                                 invoice.fa_typ === 'DOBROPIS' ? '#166534' : '#475569'
                        }}>
                          {getInvoiceTypeName(invoice)}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell style={{ whiteSpace: 'nowrap' }}>
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        {invoice.cislo_smlouvy || invoice.cislo_objednavky ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            {/* První řádek - číslo smlouvy/objednávky s ikonami */}
                            {invoice.cislo_smlouvy ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: '#3b82f6' }}>
                                  <FontAwesomeIcon icon={faFileContract} style={{ marginRight: '0.5rem' }} />
                                  {invoice.cislo_smlouvy}
                                </span>
                                {/* Ikona pro faktury ke smlouvě */}
                                <FontAwesomeIcon 
                                  icon={faEdit}
                                  style={{ 
                                    color: '#64748b',
                                    cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                                    opacity: invoiceTypesLoading ? 0.7 : 1,
                                    transition: 'opacity 0.2s, color 0.2s',
                                    fontSize: '0.875rem'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewContractInvoices(invoice);
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                  title="Editovat přidruženou fakturu ke smlouvě"
                                />
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {/* Číslo objednávky - KLIKATELNÉ pro editaci */}
                                <span
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                                    opacity: invoiceTypesLoading ? 0.7 : 1,
                                    color: invoice.objednavka_je_dokoncena ? '#059669' : (invoice.objednavka_je_zkontrolovana ? '#ea580c' : '#3b82f6'),
                                    transition: 'opacity 0.2s'
                                  }}
                                  onClick={() => handleEditOrder(invoice)}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                  title="Klikněte pro editaci objednávky"
                                >
                                  <FontAwesomeIcon 
                                    icon={faFileInvoice} 
                                    style={{ 
                                      marginRight: '0.5rem', 
                                      color: invoice.objednavka_je_dokoncena ? '#059669' : (invoice.objednavka_je_zkontrolovana ? '#ea580c' : '#3b82f6')
                                    }} 
                                  />
                                  {invoice.cislo_objednavky}
                                </span>
                                {/* Ikona pro faktury k objednávce */}
                                <FontAwesomeIcon 
                                  icon={faEdit}
                                  style={{ 
                                    color: '#64748b',
                                    cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                                    opacity: invoiceTypesLoading ? 0.7 : 1,
                                    transition: 'opacity 0.2s, color 0.2s',
                                    fontSize: '0.875rem'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddInvoiceToEntity(invoice);
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                  title="Editovat přidruženou fakturu k objednávce"
                                />
                              </div>
                            )}
                            
                            {/* Druhý řádek - dodavatel název | IČO */}
                            {(invoice.dodavatel_nazev || invoice.dodavatel_ico) ? (
                              <div style={{ 
                                fontSize: '0.8em', 
                                color: '#64748b',
                                marginLeft: '1.5rem'
                              }}>
                                {invoice.dodavatel_nazev || 'Název nedostupný'}{invoice.dodavatel_ico ? ` | IČO: ${invoice.dodavatel_ico}` : ''}
                              </div>
                            ) : (
                              <div style={{ 
                                fontSize: '0.8em', 
                                color: '#94a3b8',
                                marginLeft: '1.5rem'
                              }}>
                                Dodavatel nespecifikován
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Nepřiřazena</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="center" style={{ whiteSpace: 'nowrap' }}>
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        {invoice.datum_doruceni ? (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.35rem' }} />
                            {formatDateOnly(invoice.datum_doruceni)}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="center">
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>{invoice.datum_vystaveni ? formatDateOnly(invoice.datum_vystaveni) : '—'}</span>
                    </TableCell>
                    <TableCell className="center">
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>{invoice.datum_splatnosti ? formatDateOnly(invoice.datum_splatnosti) : '—'}</span>
                    </TableCell>
                    <TableCell className="amount-column">
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}><strong>{formatCurrency(invoice.castka)}</strong></span>
                    </TableCell>
                    <TableCell className="center">
                      <InvoiceStatusSelect 
                        currentStatus={invoice.stav || 'ZAEVIDOVANA'}
                        dueDate={invoice.datum_splatnosti}
                        onStatusChange={(newStatus) => handleStatusChange(invoice, newStatus)}
                        disabled={!canManageInvoices && !isAdmin}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        {invoice.vytvoril_uzivatel_zkracene ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <FontAwesomeIcon icon={faUser} style={{ color: '#64748b', fontSize: '0.7rem' }} />
                              <strong>{invoice.vytvoril_uzivatel_zkracene}</strong>
                            </div>
                            {invoice.dt_vytvoreni && (() => {
                              // Výpočet rozdílu mezi datem vytvoření a splatností
                              const dtVytvoreni = new Date(invoice.dt_vytvoreni);
                              const dtSplatnosti = invoice.datum_splatnosti ? new Date(invoice.datum_splatnosti) : null;
                              
                              let isWarning = false;
                              if (dtSplatnosti) {
                                const diffMs = dtSplatnosti - dtVytvoreni;
                                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                                // Pokud je vytvoření max 2 dny před splatností nebo po splatnosti
                                isWarning = diffDays <= 2;
                              }
                              
                              return (
                                <div style={{ 
                                  color: isWarning ? '#991b1b' : '#64748b', 
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: isWarning ? '#fee2e2' : 'transparent',
                                  padding: isWarning ? '0.15rem 0.35rem' : '0',
                                  borderRadius: isWarning ? '3px' : '0',
                                  fontWeight: isWarning ? '700' : 'normal'
                                }}>
                                  <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: '0.7rem' }} />
                                  {formatDateOnly(invoice.dt_vytvoreni)}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        {invoice.fa_predana_zam_jmeno_cele ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <FontAwesomeIcon icon={faUser} style={{ color: '#64748b', fontSize: '0.7rem' }} />
                              <strong>{invoice.fa_predana_zam_jmeno_cele}</strong>
                            </div>
                            {(invoice.fa_datum_predani_zam || invoice.fa_datum_vraceni_zam) && (
                              <div style={{ 
                                color: '#64748b', 
                                fontSize: '0.75rem', 
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                                alignItems: 'center'
                              }}>
                                {invoice.fa_datum_predani_zam && (
                                  <div title="Datum předání" style={{ whiteSpace: 'nowrap' }}>
                                    ↓ {formatDateOnly(invoice.fa_datum_predani_zam)}
                                  </div>
                                )}
                                {invoice.fa_datum_vraceni_zam && (
                                  <div title="Datum vrácení" style={{ whiteSpace: 'nowrap' }}>
                                    ↑ {formatDateOnly(invoice.fa_datum_vraceni_zam)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        {invoice.potvrdil_vecnou_spravnost_zkracene ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <FontAwesomeIcon icon={faUser} style={{ color: '#64748b', fontSize: '0.7rem' }} />
                              <strong>{invoice.potvrdil_vecnou_spravnost_zkracene}</strong>
                            </div>
                            {invoice.dt_potvrzeni_vecne_spravnosti && (
                              <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  backgroundColor: '#94a3b8',
                                  fontSize: '0.55rem'
                                }}>
                                  <FontAwesomeIcon icon={faCheck} style={{ color: 'white' }} />
                                </div>
                                <span title="Datum potvrzení věcné správnosti" style={{ whiteSpace: 'nowrap' }}>
                                  {formatDateOnly(invoice.dt_potvrzeni_vecne_spravnosti)}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="center">
                      <span className={`storno-content ${!invoice.aktivni ? 'inactive-content' : ''}`}>
                        {invoice.vecna_spravnost_potvrzeno ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#16a34a',
                            fontSize: '0.6rem'
                        }} title="Věcná správnost provedena">
                          <FontAwesomeIcon icon={faCheck} style={{ color: 'white' }} />
                        </div>
                      ) : (
                        <FontAwesomeIcon icon={faTimesCircle} style={{ color: '#cbd5e1', fontSize: '0.9rem' }} title="Věcná správnost neprovedena" />
                      )}
                      </span>
                    </TableCell>
                    <TableCell className="center">
                      <div 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', cursor: invoice.pocet_priloh > 0 ? 'pointer' : 'default' }}
                        onClick={(e) => {
                          if (invoice.pocet_priloh > 0 && invoice.prilohy && invoice.prilohy.length > 0) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const tooltipHeight = Math.min(invoice.prilohy.length * 70 + 100, 400);
                            // Vypočítat reálnou šířku tooltip podle obsahu a šířky okna
                            const maxFilenameLength = Math.max(...invoice.prilohy.map(p => (p.originalni_nazev_souboru || p.original_filename || p.nazev_souboru || p.filename || 'Příloha').length));
                            const maxPossibleWidth = Math.min(400, window.innerWidth - 40); // 20px margin z každé strany
                            const estimatedWidth = Math.max(280, Math.min(maxPossibleWidth, maxFilenameLength * 8 + 120)); // 8px per char + padding + icon space
                            
                            // Horizontální pozice - centrovat pod element, ale respektovat okraje okna
                            let leftPos = rect.left + (rect.width / 2) - (estimatedWidth / 2);
                            const rightEdge = leftPos + estimatedWidth;
                            
                            // Pokud tooltip přetéká vlevo, zarovnat k levému okraji (+20px padding)
                            if (leftPos < 20) {
                              leftPos = 20;
                            }
                            // Pokud tooltip přetéká vpravo, zarovnat k pravému okraji (-20px padding)  
                            if (rightEdge > window.innerWidth - 20) {
                              leftPos = window.innerWidth - estimatedWidth - 20;
                            }
                            
                            setAttachmentsTooltip({
                              attachments: invoice.prilohy,
                              invoiceId: invoice.id,
                              position: {
                                top: spaceBelow > tooltipHeight ? rect.bottom + 5 : rect.top - tooltipHeight - 5,
                                left: leftPos
                              }
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          // Zavřít tooltip po 500ms, pokud není hover nad tooltipem
                          setTimeout(() => {
                            if (!document.querySelector('[data-tooltip-hover]')) {
                              setAttachmentsTooltip(null);
                            }
                          }, 500);
                        }}
                      >
                        <div 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.25rem', 
                            color: invoice.pocet_priloh > 0 ? '#64748b' : '#cbd5e1',
                            transition: 'color 0.2s'
                          }} 
                          title="Počet příloh"
                        >
                          <FontAwesomeIcon icon={faPaperclip} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{invoice.pocet_priloh || 0}</span>
                        </div>
                        {invoice.from_spisovka && (
                          <FontAwesomeIcon icon={faFileAlt} style={{ color: '#059669', fontSize: '0.95rem', marginLeft: '0.15rem' }} title="Příloha vložena ze Spisovky" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="center">
                      <ActionMenu>
                        {/* Ikona "Zaplaceno" - jen pro INVOICE_MANAGE nebo ADMIN - TEMPORARILY HIDDEN */}
                        {false && (canManageInvoices || isAdmin) && (
                          <TooltipWrapper text={(invoice.zaplacena || invoice.stav === 'ZAPLACENO') ? "Označit jako nezaplacenou" : "Označit jako zaplacenou"} preferredPosition="left">
                            <ActionMenuButton
                              className={(invoice.zaplacena || invoice.stav === 'ZAPLACENO') ? "paid" : "unpaid"}
                              onClick={() => handleTogglePaymentStatus(invoice)}
                              title={(invoice.zaplacena || invoice.stav === 'ZAPLACENO') ? "Označit jako nezaplacenou" : "Označit jako zaplacenou"}
                              style={{
                                color: (invoice.zaplacena || invoice.stav === 'ZAPLACENO') ? '#16a34a' : '#dc2626',
                                background: 'transparent'
                              }}
                            >
                              <FontAwesomeIcon icon={(invoice.zaplacena || invoice.stav === 'ZAPLACENO') ? faCheckCircle : faMoneyBillWave} />
                            </ActionMenuButton>
                          </TooltipWrapper>
                        )}
                        
                        {/* Ikona věcné kontroly - jen pro uživatele s INVOICE_VIEW + INVOICE_MATERIAL_CORRECTNESS */}
                        {canConfirmVecnaKontrola && !canManageInvoices && !isAdmin && (
                          <TooltipWrapper 
                            text={
                              invoice.vecna_spravnost_potvrzeno 
                                ? `Věcná správnost potvrzena - kliknutím můžete změnit rozhodnutí` 
                                : "Potvrdit věcnou správnost faktury"
                            } 
                            preferredPosition="left"
                          >
                            <ActionMenuButton 
                              className="edit"
                              onClick={() => handleOpenVecnaKontrola(invoice)}
                              title={invoice.vecna_spravnost_potvrzeno ? "Změnit rozhodnutí o věcné správnosti" : "Potvrdit věcnou správnost"}
                              style={{
                                color: '#64748b',
                                background: 'transparent',
                                fontSize: '0.75rem'
                              }}
                            >
                              <FontAwesomeIcon icon={faCheckCircle} />
                            </ActionMenuButton>
                          </TooltipWrapper>
                        )}
                        
                        <TooltipWrapper text="Zobrazit detail" preferredPosition="left">
                          <ActionMenuButton 
                            className="view"
                            onClick={() => handleViewInvoice(invoice)}
                            title="Zobrazit detail"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </ActionMenuButton>
                        </TooltipWrapper>
                        {canManageInvoices && (
                          <TooltipWrapper text="Editovat" preferredPosition="left">
                            <ActionMenuButton 
                              className="edit"
                              onClick={() => handleEditInvoice(invoice)}
                              title="Editovat"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </ActionMenuButton>
                          </TooltipWrapper>
                        )}
                        {canManageInvoices && (() => {
                          // 🔒 KONTROLA: Zákaz odpojení pokud objednávka nebo faktura je ve stavu DOKONCENA
                          const isInvoiceCompleted = invoice.stav === 'DOKONCENA';
                          const isOrderCompleted = invoice.objednavka_je_dokoncena === true || invoice.objednavka_je_dokoncena === 1;
                          
                          const isLinked = !!(invoice.objednavka_id || invoice.smlouva_id);
                          const canUnlink = isLinked && !isInvoiceCompleted && !isOrderCompleted;
                          
                          let tooltipText = "Faktura není napojená na objednávku ani smlouvu";
                          if (isLinked) {
                            if (isInvoiceCompleted) {
                              tooltipText = "Nelze odpojit - faktura je ve stavu DOKONČENA";
                            } else if (isOrderCompleted) {
                              tooltipText = "Nelze odpojit - objednávka je ve stavu DOKONČENA";
                            } else {
                              tooltipText = "Odpojit od objednávky/smlouvy";
                            }
                          }
                          
                          return (
                            <TooltipWrapper text={tooltipText} preferredPosition="left">
                              <ActionMenuButton 
                                className="unlink"
                                onClick={() => handleUnlinkInvoice(invoice)}
                                disabled={!canUnlink}
                                title={canUnlink ? "Odpojit" : "Nelze odpojit"}
                              >
                                <FontAwesomeIcon icon={faUnlink} />
                              </ActionMenuButton>
                            </TooltipWrapper>
                          );
                        })()}
                        {(canManageInvoices || isAdmin) && (
                          <TooltipWrapper text="Smazat" preferredPosition="left">
                            <ActionMenuButton 
                              className="delete"
                              onClick={() => handleDeleteInvoice(invoice)}
                              title="Smazat"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </ActionMenuButton>
                          </TooltipWrapper>
                        )}
                      </ActionMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>

            {/* Pagination - Server-side (BE API) */}
            {totalPages > 0 && (
              <PaginationContainer>
                <PaginationInfo>
                  Zobrazeno {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} z {totalItems}
                </PaginationInfo>

                <PaginationControls>
                  <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
                    Zobrazit:
                  </span>
                  <PageSizeSelect
                    value={itemsPerPage}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setItemsPerPage(newSize);
                      setCurrentPage(1); // Reset na první stránku při změně velikosti
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </PageSizeSelect>

                  <PageButton
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    ««
                  </PageButton>
                  <PageButton
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </PageButton>

                  <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
                    Stránka {currentPage} z {totalPages}
                  </span>

                  <PageButton
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    ›
                  </PageButton>
                  <PageButton
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage >= totalPages}
                  >
                    »»
                  </PageButton>
                </PaginationControls>
              </PaginationContainer>
            )}
          </TableContainer>
        </TableScrollWrapper>
      </Container>
      
      {/* Delete/Restore Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <ConfirmDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => {
            setDeleteDialog({ isOpen: false, invoice: null });
            setDeleteType('soft');
          }}
          onConfirm={() => {
            // 🔄 Pokud je faktura neaktivní a uživatel je admin
            if (!deleteDialog.invoice?.aktivni && isAdmin) {
              // Rozlišit mezi restore a hard delete
              if (deleteType === 'restore') {
                confirmRestoreInvoice();
              } else if (deleteType === 'hard') {
                confirmDeleteInvoice(true); // ✅ Hard delete (trvale smazat z DB)
              }
            } else {
              // Jinak normální smazání aktivní faktury
              confirmDeleteInvoice(deleteType === 'hard');
            }
          }}
          title={
            !deleteDialog.invoice?.aktivni && isAdmin 
              ? (deleteType === 'restore' ? "Obnovit fakturu" : "Smazat fakturu úplně") 
              : "Odstranit fakturu"
          }
          icon={
            !deleteDialog.invoice?.aktivni && isAdmin 
              ? (deleteType === 'restore' ? faCheckCircle : faTrash) 
              : faTrash
          }
          variant={
            !deleteDialog.invoice?.aktivni && isAdmin 
              ? (deleteType === 'restore' ? 'success' : 'danger') 
              : (deleteType === 'hard' ? 'danger' : 'warning')
          }
          confirmText={
            !deleteDialog.invoice?.aktivni && isAdmin 
              ? (deleteType === 'restore' ? "✅ Obnovit fakturu" : "⚠️ Smazat úplně") 
              : isAdmin 
                ? (deleteType === 'hard' ? "⚠️ Smazat úplně" : "Smazat") 
                : "Smazat"
          }
          cancelText="Zrušit"
          key={deleteType + (deleteDialog.invoice?.aktivni ? '-active' : '-inactive')}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            padding: '1rem 0'
          }}>
            {/* LEVÝ SLOUPEC - Volba typu smazání nebo obnova */}
            <div>
              {!deleteDialog.invoice?.aktivni && isAdmin ? (
                /* NEAKTIVNÍ FAKTURA - Možnost obnovení nebo hard delete */
                <>
                  <p style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
                    Co chcete udělat s neaktivní fakturou <strong>{deleteDialog.invoice?.cislo_faktury}</strong>?
                  </p>
                  <div style={{
                    background: '#f8fafc',
                    border: '2px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569', fontSize: '1rem' }}>
                      🔧 Vyberte akci:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* OBNOVA */}
                      <label 
                        onClick={() => setDeleteType('restore')}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                          opacity: invoiceTypesLoading ? 0.7 : 1,
                          padding: '0.75rem',
                          border: `2px solid ${deleteType === 'restore' ? '#10b981' : '#e2e8f0'}`,
                          borderRadius: '6px',
                          background: deleteType === 'restore' ? '#f0fdf4' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name="deleteType"
                          value="restore"
                          checked={deleteType === 'restore'}
                          onChange={(e) => {
                            e.stopPropagation();
                            setDeleteType('restore');
                          }}
                          disabled={invoiceTypesLoading}
                          style={{ marginTop: '0.25rem', cursor: invoiceTypesLoading ? 'wait' : 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: 600, 
                            marginBottom: '0.25rem', 
                            color: deleteType === 'restore' ? '#166534' : '#475569' 
                          }}>
                            🔄 Obnovit fakturu
                          </div>
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: deleteType === 'restore' ? '#166534' : '#64748b',
                            lineHeight: '1.4'
                          }}>
                            Faktura bude znovu <strong>aktivní</strong> a objeví se v běžném přehledu.
                          </div>
                        </div>
                      </label>

                      {/* HARD DELETE */}
                      <label 
                        onClick={() => setDeleteType('hard')}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                          opacity: invoiceTypesLoading ? 0.7 : 1,
                          padding: '0.75rem',
                          border: `2px solid ${deleteType === 'hard' ? '#ef4444' : '#e2e8f0'}`,
                          borderRadius: '6px',
                          background: deleteType === 'hard' ? '#fef2f2' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name="deleteType"
                          value="hard"
                          checked={deleteType === 'hard'}
                          onChange={(e) => {
                            e.stopPropagation();
                            setDeleteType('hard');
                          }}
                          disabled={invoiceTypesLoading}
                          style={{ marginTop: '0.25rem', cursor: invoiceTypesLoading ? 'wait' : 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: 600, 
                            marginBottom: '0.25rem', 
                            color: deleteType === 'hard' ? '#dc2626' : '#475569' 
                          }}>
                            ⚠️ Smazat úplně (HARD DELETE)
                          </div>
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: deleteType === 'hard' ? '#dc2626' : '#64748b',
                            lineHeight: '1.4'
                          }}>
                            Faktura bude <strong>fyzicky smazána z databáze</strong>. Tuto akci nelze vrátit zpět!
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                /* AKTIVNÍ FAKTURA - Možnosti smazání */
                <>
                  <p style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
                    Opravdu chcete smazat fakturu <strong>{deleteDialog.invoice?.cislo_faktury}</strong>?
                  </p>

                  {isAdmin ? (
                    <>
                      {/* Výběr typu mazání pro adminy */}
                      <div style={{
                    background: '#f8fafc',
                    border: '2px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569', fontSize: '1rem' }}>
                      🔧 Vyberte typ smazání:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label 
                        onClick={() => setDeleteType('soft')}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                        opacity: invoiceTypesLoading ? 0.7 : 1,
                          padding: '0.75rem',
                          border: `2px solid ${deleteType === 'soft' ? '#3b82f6' : '#e2e8f0'}`,
                          borderRadius: '6px',
                          background: deleteType === 'soft' ? '#eff6ff' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name="deleteType"
                          value="soft"
                          checked={deleteType === 'soft'}
                          onChange={(e) => setDeleteType(e.target.value)}
                          style={{ marginTop: '0.25rem', accentColor: '#3b82f6', cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                        opacity: invoiceTypesLoading ? 0.7 : 1, pointerEvents: 'none' }}
                        />
                        <div style={{ pointerEvents: 'none' }}>
                          <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                            Měkké smazání (SOFT DELETE)
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            Faktura bude označena jako neaktivní. Lze později obnovit.
                          </div>
                        </div>
                      </label>

                      <label 
                        onClick={() => setDeleteType('hard')}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                        opacity: invoiceTypesLoading ? 0.7 : 1,
                          padding: '0.75rem',
                          border: `2px solid ${deleteType === 'hard' ? '#dc2626' : '#e2e8f0'}`,
                          borderRadius: '6px',
                          background: deleteType === 'hard' ? '#fef2f2' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name="deleteType"
                          value="hard"
                          checked={deleteType === 'hard'}
                          onChange={(e) => setDeleteType(e.target.value)}
                          style={{ marginTop: '0.25rem', accentColor: '#dc2626', cursor: invoiceTypesLoading ? 'wait' : 'pointer',
                        opacity: invoiceTypesLoading ? 0.7 : 1, pointerEvents: 'none' }}
                        />
                        <div style={{ pointerEvents: 'none' }}>
                          <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '0.25rem' }}>
                            ⚠️ Úplné smazání (HARD DELETE)
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                            <strong>NEVRATNÉ!</strong> Smaže vše včetně příloh a historie.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{
                  background: '#fef3c7',
                  border: '2px solid #fcd34d',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e' }}>
                    ℹ️ Měkké smazání (SOFT DELETE)
                  </h4>
                  <p style={{ margin: 0, color: '#92400e', fontSize: '0.95rem' }}>
                    Faktura bude pouze <strong>označena jako neaktivní</strong>.
                    Administrátor ji může později obnovit.
                  </p>
                </div>
              )}
                </>
              )}
            </div>

            {/* PRAVÝ SLOUPEC - Detail faktury */}
            <div style={{
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>
                🧾 Detail faktury ke smazání:
              </h4>
              <div style={{ margin: 0, color: '#475569' }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
                    {deleteDialog.invoice?.cislo_faktury}
                  </div>
                  {deleteDialog.invoice?.cislo_objednavky && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>
                      <strong>Objednávka:</strong> {deleteDialog.invoice.cislo_objednavky}
                    </div>
                  )}
                  {deleteDialog.invoice?.castka && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>
                      <strong>Částka:</strong> {formatCurrency(deleteDialog.invoice.castka)}
                    </div>
                  )}
                  {deleteDialog.invoice?.fa_datum_vystaveni && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>
                      <strong>Vystaveno:</strong> {new Date(deleteDialog.invoice.fa_datum_vystaveni).toLocaleDateString('cs-CZ')}
                    </div>
                  )}
                  {deleteDialog.invoice?.fa_datum_splatnosti && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      <strong>Splatnost:</strong> {new Date(deleteDialog.invoice.fa_datum_splatnosti).toLocaleDateString('cs-CZ')}
                    </div>
                  )}
                </div>
                
                {deleteDialog.invoice?.fa_zaplacena ? (
                  <div style={{
                    padding: '0.5rem',
                    background: '#d1fae5',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#065f46',
                    fontWeight: '600'
                  }}>
                    ✅ Faktura je zaplacená
                  </div>
                ) : (
                  <div style={{
                    padding: '0.5rem',
                    background: '#fee2e2',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#991b1b',
                    fontWeight: '600'
                  }}>
                    ⚠️ Faktura není zaplacená
                  </div>
                )}
              </div>
            </div>
          </div>
        </ConfirmDialog>
      )}
      
      {/* 🔒 Modal pro zamčenou objednávku - informační dialog */}
      {lockedOrderInfo && (
        <ConfirmDialog
          isOpen={showLockedOrderDialog}
          onClose={handleLockedOrderCancel}
          onConfirm={handleLockedOrderCancel}
          title="Objednávka není dostupná"
          icon={faLock}
          variant="warning"
          confirmText="Zavřít"
          showCancel={false}
        >
          <InfoText>
            {lockedOrderInfo.errorMessage ? (
              // Zobraz chybovou zprávu pokud je k dispozici
              <>
                <strong>Objednávka není dostupná:</strong>
                <br />
                {lockedOrderInfo.errorMessage}
              </>
            ) : (
              // Standardní zpráva o zamčení
              <>Objednávka je aktuálně editována uživatelem:</>
            )}
          </InfoText>
          
          {!lockedOrderInfo.errorMessage && (
            <>
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
            </>
          )}

          {!lockedOrderInfo.errorMessage && (
            <InfoText>
              Fakturu/objednávku nelze upravovat, dokud ji má otevřenou jiný uživatel.
              Prosím, kontaktujte uživatele výše a požádejte ho o uložení a zavření objednávky.
            </InfoText>
          )}
        </ConfirmDialog>
      )}
      
      {/* Payment Status Dialog */}
      {paymentDialog.isOpen && paymentDialog.invoice && (
        <ConfirmDialog
          isOpen={paymentDialog.isOpen}
          onClose={() => setPaymentDialog({ isOpen: false, invoice: null, newStatus: false })}
          onConfirm={() => confirmTogglePaymentStatus(paymentDialog.invoice, paymentDialog.newStatus)}
          title="⚠️ Změna stavu platby faktury"
          confirmText="Ano, změnit"
          cancelText="Zrušit"
          variant="warning"
        >
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{
              background: '#fef3c7',
              border: '2px solid #fcd34d',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '0.5rem' }} />
                Opravdu není faktura zaplacena?
              </h4>
              <p style={{ margin: 0, color: '#92400e', fontSize: '0.95rem' }}>
                Chystáte se změnit stav faktury z <strong>ZAPLACENO</strong> na <strong>NEZAPLACENO</strong>.
                Prosím, zkontrolujte platební údaje před potvrzením.
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>
                🧾 Detail faktury:
              </h4>
              <div style={{ margin: 0, color: '#475569' }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
                    {paymentDialog.invoice?.cislo_faktury}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>
                    <strong>Částka:</strong> {formatCurrency(paymentDialog.invoice?.castka)}
                  </div>
                  {paymentDialog.invoice?.cislo_objednavky && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>
                      <strong>Objednávka:</strong> {paymentDialog.invoice.cislo_objednavky}
                    </div>
                  )}
                  {paymentDialog.invoice?.fa_datum_splatnosti && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      <strong>Splatnost:</strong> {new Date(paymentDialog.invoice.fa_datum_splatnosti).toLocaleDateString('cs-CZ')}
                    </div>
                  )}
                </div>
                
                <div style={{
                  padding: '0.5rem',
                  background: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#065f46',
                  fontWeight: '600'
                }}>
                  Aktuální stav: ✅ ZAPLACENO
                </div>
              </div>
            </div>
          </div>
        </ConfirmDialog>
      )}
      
      {/* Workflow Status Change Dialog - změna ze stavu ZAPLACENO */}
      {statusChangeDialog.isOpen && statusChangeDialog.invoice && (
        <ConfirmDialog
          isOpen={statusChangeDialog.isOpen}
          onClose={() => setStatusChangeDialog({ isOpen: false, invoice: null, newStatus: null })}
          onConfirm={() => {
            performStatusChange(statusChangeDialog.invoice, statusChangeDialog.newStatus);
            setStatusChangeDialog({ isOpen: false, invoice: null, newStatus: null });
          }}
          title="⚠️ Změna stavu zaplacené faktury"
          confirmText="Ano, změnit stav"
          cancelText="Zrušit"
          variant="warning"
        >
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{
              background: '#fef3c7',
              border: '2px solid #fcd34d',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '0.5rem' }} />
                Měníte stav ZAPLACENÉ faktury
              </h4>
              <p style={{ margin: 0, color: '#92400e', fontSize: '0.95rem' }}>
                Faktura je aktuálně ve stavu <strong>ZAPLACENO</strong>. Opravdu chcete změnit stav na{' '}
                <strong>
                  {statusChangeDialog.newStatus === 'ZAEVIDOVANA' ? 'Zaevidovaná' :
                   statusChangeDialog.newStatus === 'VECNA_SPRAVNOST' ? 'Věcná správnost' :
                   statusChangeDialog.newStatus === 'V_RESENI' ? 'V řešení' :
                   statusChangeDialog.newStatus === 'PREDANA_PO' ? 'Předaná PO' :
                   statusChangeDialog.newStatus === 'K_ZAPLACENI' ? 'K zaplacení' :
                   statusChangeDialog.newStatus === 'STORNO' ? 'Storno+' : statusChangeDialog.newStatus}
                </strong>?
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>
                🧾 Detail faktury:
              </h4>
              <div style={{ margin: 0, color: '#475569' }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
                    {statusChangeDialog.invoice?.cislo_faktury}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>
                    <strong>Částka:</strong> {formatCurrency(statusChangeDialog.invoice?.castka)}
                  </div>
                  {statusChangeDialog.invoice?.cislo_objednavky && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>
                      <strong>Objednávka:</strong> {statusChangeDialog.invoice.cislo_objednavky}
                    </div>
                  )}
                  {statusChangeDialog.invoice?.datum_splatnosti && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      <strong>Splatnost:</strong> {new Date(statusChangeDialog.invoice.datum_splatnosti).toLocaleDateString('cs-CZ')}
                    </div>
                  )}
                </div>
                
                <div style={{
                  padding: '0.5rem',
                  background: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#065f46',
                  fontWeight: '600'
                }}>
                  Aktuální stav: ✅ ZAPLACENO
                </div>
              </div>
            </div>
          </div>
        </ConfirmDialog>
      )}
      
      {/* Confirm Dialog - Unlink faktura od objednávky/smlouvy */}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => {
            if (confirmDialog.onCancel) {
              confirmDialog.onCancel();
            } else {
              setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null });
            }
          }}
          onConfirm={() => {
            if (confirmDialog.onConfirm) {
              confirmDialog.onConfirm();
            }
          }}
          title={confirmDialog.title}
          confirmText="Ano, odpojit"
          cancelText="Zrušit"
          variant="warning"
        >
          <div style={{ whiteSpace: 'pre-line' }}>
            {confirmDialog.message}
          </div>
        </ConfirmDialog>
      )}
      
      {/* Slide Panel - Detail faktury */}
      <SlideInDetailPanel
        isOpen={slidePanelOpen}
        onClose={() => {
          setSlidePanelOpen(false);
          setSlidePanelInvoice(null);
        }}
        entityType="invoices"
        entityId={slidePanelInvoice?.id}
        loading={slidePanelLoading}
      >
        {slidePanelInvoice && (
          <DetailViewWrapper>
            <WatermarkIcon>
              <FontAwesomeIcon icon={faMoneyBillWave} />
            </WatermarkIcon>
            <ContentWrapper>
              {/* Základní informace */}
              <DetailSection>
                <SectionTitle>
                  <FontAwesomeIcon icon={faFileInvoice} style={{ marginRight: '0.5rem' }} />
                  Základní informace
                </SectionTitle>
                <InfoGrid>
                  <InfoRow>
                    <InfoIcon style={{ background: '#dbeafe', color: '#3b82f6' }}>
                      <FontAwesomeIcon icon={faFileInvoice} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Číslo faktury</InfoLabel>
                      <InfoValue style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                        <ClickableValue
                          onClick={() => {
                            setSlidePanelOpen(false);
                            handleEditInvoice(slidePanelInvoice);
                          }}
                          title="Klikněte pro úpravu faktury"
                        >
                          {slidePanelInvoice.fa_cislo_vema || slidePanelInvoice.cislo_faktury}
                          <FontAwesomeIcon icon={faEdit} style={{ fontSize: '0.85rem' }} />
                        </ClickableValue>
                        {slidePanelInvoice.rozsirujici_data?.rocni_poplatek && (
                          <TooltipWrapper
                            content={
                              <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                                <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '8px' }}>
                                  💰 Faktura přiřazena k ročnímu poplatku
                                </strong>
                                <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                  <strong>Název:</strong> {slidePanelInvoice.rozsirujici_data.rocni_poplatek.nazev}
                                </div>
                                <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                  <strong>Rok:</strong> {slidePanelInvoice.rozsirujici_data.rocni_poplatek.rok}
                                </div>
                                {slidePanelInvoice.cislo_smlouvy && (
                                  <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                    <strong>Smlouva:</strong> {slidePanelInvoice.cislo_smlouvy}
                                  </div>
                                )}
                                {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_uzivatelem_jmeno && (
                                  <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                    <strong>Přiřadil:</strong> {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_uzivatelem_jmeno}
                                  </div>
                                )}
                                {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_dne && (
                                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '6px' }}>
                                    Datum přiřazení: {new Date(slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_dne).toLocaleString('cs-CZ')}
                                  </div>
                                )}
                              </div>
                            }
                            position="top"
                            showDelay={200}
                          >
                            <InfoIconBadge>
                              <FontAwesomeIcon icon={faCoins} />
                            </InfoIconBadge>
                          </TooltipWrapper>
                        )}
                      </InfoValue>
                    </InfoContent>
                  </InfoRow>

                  {slidePanelInvoice.fa_typ && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faFileAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Typ faktury</InfoLabel>
                        <InfoValue>
                          <Badge 
                            $color={
                              slidePanelInvoice.fa_typ === 'ZALOHOVA' ? '#dbeafe' : 
                              slidePanelInvoice.fa_typ === 'OPRAVNA' ? '#fef3c7' : 
                              slidePanelInvoice.fa_typ === 'PROFORMA' ? '#e0e7ff' : 
                              slidePanelInvoice.fa_typ === 'DOBROPIS' ? '#dcfce7' : 
                              slidePanelInvoice.fa_typ === 'BEZNA' ? '#f0f9ff' : '#f1f5f9'
                            }
                            $textColor={
                              slidePanelInvoice.fa_typ === 'ZALOHOVA' ? '#1e40af' : 
                              slidePanelInvoice.fa_typ === 'OPRAVNA' ? '#92400e' : 
                              slidePanelInvoice.fa_typ === 'PROFORMA' ? '#4338ca' : 
                              slidePanelInvoice.fa_typ === 'DOBROPIS' ? '#166534' : 
                              slidePanelInvoice.fa_typ === 'BEZNA' ? '#0369a1' : '#475569'
                            }
                          >
                            {getInvoiceTypeName(slidePanelInvoice)}
                          </Badge>
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}
                </InfoGrid>

                <InfoGrid>
                  <InfoRowFullWidth>
                    <InfoIcon style={{ background: slidePanelInvoice.cislo_smlouvy ? '#fef3c7' : (slidePanelInvoice.cislo_objednavky ? '#dcfce7' : '#f1f5f9'), color: slidePanelInvoice.cislo_smlouvy ? '#f59e0b' : (slidePanelInvoice.cislo_objednavky ? '#059669' : '#94a3b8') }}>
                      <FontAwesomeIcon icon={slidePanelInvoice.cislo_smlouvy ? faFileContract : (slidePanelInvoice.cislo_objednavky ? faFileInvoice : faExclamationTriangle)} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>{slidePanelInvoice.cislo_smlouvy ? 'Číslo smlouvy' : (slidePanelInvoice.cislo_objednavky ? 'Číslo objednávky' : 'Přiřazení')}</InfoLabel>
                      <InfoValue style={{ fontWeight: '600' }}>
                        {slidePanelInvoice.cislo_smlouvy ? (
                          slidePanelInvoice.cislo_smlouvy
                        ) : slidePanelInvoice.cislo_objednavky ? (
                          slidePanelInvoice.cislo_objednavky
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Faktura není přiřazena ke smlouvě ani objednávce</span>
                        )}
                      </InfoValue>
                    </InfoContent>
                  </InfoRowFullWidth>
                </InfoGrid>

                <InfoGrid>
                  <InfoRowFullWidth>
                    <InfoIcon>
                      <FontAwesomeIcon icon={faCheckCircle} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Stav faktury</InfoLabel>
                      <InfoValue>
                        <StatusBadge style={{ 
                          background: getWorkflowStatusColor(slidePanelInvoice.stav) + '20',
                          color: getWorkflowStatusColor(slidePanelInvoice.stav),
                          border: `1px solid ${getWorkflowStatusColor(slidePanelInvoice.stav)}40`
                        }}>
                          <FontAwesomeIcon icon={getWorkflowStatusIcon(slidePanelInvoice.stav)} />
                          {' '}
                          {getWorkflowStatusLabel(slidePanelInvoice.stav)}
                          {getInvoiceStatus(slidePanelInvoice) === 'overdue' && (
                            <span style={{ marginLeft: '0.5rem', color: '#dc2626', fontWeight: '700' }}>
                              • Po splatnosti {getDaysOverdue(slidePanelInvoice)} dní
                            </span>
                          )}
                        </StatusBadge>
                      </InfoValue>
                    </InfoContent>
                  </InfoRowFullWidth>
                </InfoGrid>

                <InfoGrid>
                  {slidePanelInvoice.fa_cislo_faktury_dodavatele && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faFileAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Číslo faktury dodavatele</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          {slidePanelInvoice.fa_cislo_faktury_dodavatele}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_forma_uhrazeni && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faMoneyBill} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Forma úhrady</InfoLabel>
                        <InfoValue>
                          <Badge $color="#f0f9ff" $textColor="#0369a1">
                            {slidePanelInvoice.fa_forma_uhrazeni}
                          </Badge>
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {(slidePanelInvoice.fa_zaplacena === 1 || slidePanelInvoice.fa_zaplacena === true) && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#d1fae5', color: '#10b981' }}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Zaplaceno</InfoLabel>
                        <InfoValue style={{ color: '#10b981', fontWeight: '700' }}>
                          ✅ Faktura je uhrazená
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {(slidePanelInvoice.fa_dorucena === 1 || slidePanelInvoice.fa_dorucena === true) && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#dbeafe', color: '#3b82f6' }}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Doručení</InfoLabel>
                        <InfoValue style={{ color: '#3b82f6', fontWeight: '600' }}>
                          📬 Faktura doručena
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_strediska_kod && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faBuilding} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Střediska</InfoLabel>
                        <InfoValue>
                          {Array.isArray(slidePanelInvoice.fa_strediska_kod) 
                            ? slidePanelInvoice.fa_strediska_kod.map((s, i) => (
                                <Badge key={i} $color="#f1f5f9" $textColor="#475569" style={{ marginRight: '0.25rem', marginBottom: '0.25rem' }}>
                                  {s}
                                </Badge>
                              ))
                            : typeof slidePanelInvoice.fa_strediska_kod === 'string'
                              ? slidePanelInvoice.fa_strediska_kod
                              : 'N/A'
                          }
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}
                </InfoGrid>
              </DetailSection>

              {/* Připojená objednávka */}
              {slidePanelInvoice.cislo_objednavky && (
                <DetailSection>
                  <SectionTitle>Připojená objednávka</SectionTitle>
                  <InfoGrid>
                    <InfoRowFullWidth>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faFileAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Číslo objednávky</InfoLabel>
                        <InfoValue style={{ fontSize: '1.05rem', fontWeight: '600' }}>
                          <ClickableValue
                            onClick={() => {
                              if (slidePanelInvoice.objednavka_id) {
                                console.log('📋 Invoices25List → OrderForm25:', {
                                  orderId: slidePanelInvoice.objednavka_id,
                                  returnTo: '/invoices25-list',
                                  navigateTo: `/order-form-25?edit=${slidePanelInvoice.objednavka_id}`
                                });
                                setSlidePanelOpen(false);
                                navigate(`/order-form-25?edit=${slidePanelInvoice.objednavka_id}`, { 
                                  state: { 
                                    returnTo: '/invoices25-list'
                                  } 
                                });
                              }
                            }}
                            title="Klikněte pro úpravu objednávky"
                          >
                            {slidePanelInvoice.cislo_objednavky}
                            <FontAwesomeIcon icon={faEdit} style={{ fontSize: '0.85rem' }} />
                          </ClickableValue>
                        </InfoValue>
                      </InfoContent>
                    </InfoRowFullWidth>
                    
                    {slidePanelInvoice.predmet && (
                      <InfoRowFullWidth>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faFileAlt} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Předmět objednávky</InfoLabel>
                          <InfoValue style={{ whiteSpace: 'pre-wrap' }}>
                            {slidePanelInvoice.predmet}
                          </InfoValue>
                        </InfoContent>
                      </InfoRowFullWidth>
                    )}

                    {slidePanelInvoice.ev_cislo && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faFileAlt} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Evidenční číslo</InfoLabel>
                          <InfoValue>{slidePanelInvoice.ev_cislo}</InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.castka_celkem && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faMoneyBill} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Částka objednávky</InfoLabel>
                          <InfoValue style={{ fontWeight: '600', color: '#1e40af' }}>
                            {formatCurrency(slidePanelInvoice.castka_celkem)}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.dodavatel_nazev && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faBuilding} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Dodavatel z objednávky</InfoLabel>
                          <InfoValue>{slidePanelInvoice.dodavatel_nazev}</InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.datum_objednani && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faCalendarAlt} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Datum objednání</InfoLabel>
                          <InfoValue>
                            {new Date(slidePanelInvoice.datum_objednani).toLocaleDateString('cs-CZ')}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}
                  </InfoGrid>
                </DetailSection>
              )}

              {/* Dodavatel z faktury */}
              {(slidePanelInvoice.fa_nazev_dodavatele || slidePanelInvoice.nazev_dodavatele) && !slidePanelInvoice.dodavatel_nazev && (
                <DetailSection>
                  <SectionTitle>
                    <FontAwesomeIcon icon={faBuilding} style={{ marginRight: '0.5rem' }} />
                    Dodavatel
                  </SectionTitle>
                  <InfoGrid>
                    <InfoRowFullWidth>
                      <InfoIcon style={{ background: '#f0f9ff', color: '#0284c7' }}>
                        <FontAwesomeIcon icon={faBuilding} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Název dodavatele</InfoLabel>
                        <InfoValue style={{ fontSize: '1.05rem', fontWeight: '600' }}>
                          {slidePanelInvoice.fa_nazev_dodavatele || slidePanelInvoice.nazev_dodavatele}
                        </InfoValue>
                      </InfoContent>
                    </InfoRowFullWidth>
                    
                    {(slidePanelInvoice.fa_ico_dodavatele || slidePanelInvoice.ico_dodavatele) && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faIdCard} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>IČO</InfoLabel>
                          <InfoValue style={{ fontFamily: 'monospace', fontSize: '1rem' }}>
                            {slidePanelInvoice.fa_ico_dodavatele || slidePanelInvoice.ico_dodavatele}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.fa_dic_dodavatele && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faIdCard} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>DIČ</InfoLabel>
                          <InfoValue style={{ fontFamily: 'monospace', fontSize: '1rem' }}>
                            {slidePanelInvoice.fa_dic_dodavatele}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.fa_adresa_dodavatele && (
                      <InfoRowFullWidth>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faBuilding} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Adresa</InfoLabel>
                          <InfoValue style={{ whiteSpace: 'pre-wrap' }}>
                            {slidePanelInvoice.fa_adresa_dodavatele}
                          </InfoValue>
                        </InfoContent>
                      </InfoRowFullWidth>
                    )}
                  </InfoGrid>
                </DetailSection>
              )}

              {/* Odběratel / Příjemce faktury */}
              {(slidePanelInvoice.fa_nazev_prijemce || slidePanelInvoice.fa_ico_prijemce || slidePanelInvoice.fa_adresa_prijemce) && (
                <DetailSection>
                  <SectionTitle>
                    <FontAwesomeIcon icon={faUser} style={{ marginRight: '0.5rem' }} />
                    Odběratel / Příjemce
                  </SectionTitle>
                  <InfoGrid>
                    {slidePanelInvoice.fa_nazev_prijemce && (
                      <InfoRowFullWidth>
                        <InfoIcon style={{ background: '#f0fdf4', color: '#16a34a' }}>
                          <FontAwesomeIcon icon={faBuilding} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Název příjemce</InfoLabel>
                          <InfoValue style={{ fontSize: '1.05rem', fontWeight: '600' }}>
                            {slidePanelInvoice.fa_nazev_prijemce}
                          </InfoValue>
                        </InfoContent>
                      </InfoRowFullWidth>
                    )}
                    
                    {slidePanelInvoice.fa_ico_prijemce && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faIdCard} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>IČO příjemce</InfoLabel>
                          <InfoValue style={{ fontFamily: 'monospace', fontSize: '1rem' }}>
                            {slidePanelInvoice.fa_ico_prijemce}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.fa_dic_prijemce && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faIdCard} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>DIČ příjemce</InfoLabel>
                          <InfoValue style={{ fontFamily: 'monospace', fontSize: '1rem' }}>
                            {slidePanelInvoice.fa_dic_prijemce}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.fa_adresa_prijemce && (
                      <InfoRowFullWidth>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faBuilding} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Adresa příjemce</InfoLabel>
                          <InfoValue style={{ whiteSpace: 'pre-wrap' }}>
                            {slidePanelInvoice.fa_adresa_prijemce}
                          </InfoValue>
                        </InfoContent>
                      </InfoRowFullWidth>
                    )}
                  </InfoGrid>
                </DetailSection>
              )}

              {/* Finanční údaje */}
              <DetailSection>
                <SectionTitle>
                  <FontAwesomeIcon icon={faMoneyBillWave} style={{ marginRight: '0.5rem' }} />
                  Finanční údaje
                </SectionTitle>
                <InfoGrid>
                  <InfoRowFullWidth>
                    <InfoIcon style={{ background: '#d1fae5', color: '#10b981' }}>
                      <FontAwesomeIcon icon={faMoneyBill} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Částka faktury</InfoLabel>
                      <InfoValue style={{ fontSize: '1.35rem', fontWeight: '700', color: '#10b981' }}>
                        {formatCurrency(slidePanelInvoice.fa_castka || slidePanelInvoice.castka)}
                      </InfoValue>
                    </InfoContent>
                  </InfoRowFullWidth>

                  {slidePanelInvoice.fa_vs && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faMoneyBill} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Variabilní symbol</InfoLabel>
                        <InfoValue style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: '600' }}>
                          {slidePanelInvoice.fa_vs}
                          {slidePanelInvoice.rozsirujici_data?.rocni_poplatek && (
                            <TooltipWrapper
                              content={
                                <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                                  <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '8px' }}>
                                    💰 Faktura přiřazena k ročnímu poplatku
                                  </strong>
                                  <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                    <strong>Název:</strong> {slidePanelInvoice.rozsirujici_data.rocni_poplatek.nazev}
                                  </div>
                                  <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                    <strong>Rok:</strong> {slidePanelInvoice.rozsirujici_data.rocni_poplatek.rok}
                                  </div>
                                  {slidePanelInvoice.cislo_smlouvy && (
                                    <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                      <strong>Smlouva:</strong> {slidePanelInvoice.cislo_smlouvy}
                                    </div>
                                  )}
                                  {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_uzivatelem_jmeno && (
                                    <div style={{ color: '#e5e7eb', marginBottom: '4px' }}>
                                      <strong>Přiřadil:</strong> {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_uzivatelem_jmeno}
                                    </div>
                                  )}
                                  {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_dne && (
                                    <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '6px' }}>
                                      Datum přiřazení: {new Date(slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_dne).toLocaleString('cs-CZ')}
                                    </div>
                                  )}
                                </div>
                              }
                              position="top"
                              showDelay={200}
                            >
                              <InfoIconBadge>
                                <FontAwesomeIcon icon={faCoins} />
                              </InfoIconBadge>
                            </TooltipWrapper>
                          )}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_ks && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faMoneyBill} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Konstantní symbol</InfoLabel>
                        <InfoValue style={{ fontFamily: 'monospace' }}>
                          {slidePanelInvoice.fa_ks}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_ss && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faMoneyBill} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Specifický symbol</InfoLabel>
                        <InfoValue style={{ fontFamily: 'monospace' }}>
                          {slidePanelInvoice.fa_ss}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_cislo_uctu && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faMoneyBill} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Číslo účtu dodavatele</InfoLabel>
                        <InfoValue style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '600' }}>
                          {slidePanelInvoice.fa_cislo_uctu}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_kod_banky && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faBuilding} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Kód banky</InfoLabel>
                        <InfoValue style={{ fontFamily: 'monospace' }}>
                          {slidePanelInvoice.fa_kod_banky}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_iban && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faMoneyBill} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>IBAN</InfoLabel>
                        <InfoValue style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {slidePanelInvoice.fa_iban}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_swift && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faBuilding} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>SWIFT/BIC</InfoLabel>
                        <InfoValue style={{ fontFamily: 'monospace' }}>
                          {slidePanelInvoice.fa_swift}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}
                </InfoGrid>
              </DetailSection>

              {/* Roční poplatky - samostatný blok */}
              {slidePanelInvoice.rozsirujici_data?.rocni_poplatek && (
                <DetailSection>
                  <SectionTitle style={{ color: '#f59e0b' }}>
                    <FontAwesomeIcon icon={faCoins} style={{ marginRight: '0.5rem' }} />
                    Roční poplatek
                  </SectionTitle>
                  <InfoGrid>
                    <InfoRow>
                      <InfoIcon style={{ background: '#fef3c7', color: '#f59e0b' }}>
                        <FontAwesomeIcon icon={faFileContract} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Název</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          {slidePanelInvoice.rozsirujici_data.rocni_poplatek.nazev}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>

                    <InfoRow>
                      <InfoIcon style={{ background: '#fef3c7', color: '#f59e0b' }}>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Rok</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          {slidePanelInvoice.rozsirujici_data.rocni_poplatek.rok}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>

                    {slidePanelInvoice.cislo_smlouvy && (
                      <InfoRow>
                        <InfoIcon style={{ background: '#fef3c7', color: '#f59e0b' }}>
                          <FontAwesomeIcon icon={faFileContract} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Smlouva</InfoLabel>
                          <InfoValue>
                            {slidePanelInvoice.cislo_smlouvy}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_uzivatelem_jmeno && (
                      <InfoRow>
                        <InfoIcon style={{ background: '#fef3c7', color: '#f59e0b' }}>
                          <FontAwesomeIcon icon={faUser} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Přiřadil</InfoLabel>
                          <InfoValue>
                            {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_uzivatelem_jmeno}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_dne && (
                      <InfoRow>
                        <InfoIcon style={{ background: '#fef3c7', color: '#f59e0b' }}>
                          <FontAwesomeIcon icon={faClock} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Datum přiřazení</InfoLabel>
                          <InfoValue>
                            {new Date(slidePanelInvoice.rozsirujici_data.rocni_poplatek.prirazeno_dne).toLocaleString('cs-CZ')}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}
                  </InfoGrid>
                </DetailSection>
              )}

              {/* Evidence faktury */}
              <DetailSection>
                <SectionTitle>
                  <FontAwesomeIcon icon={faUser} style={{ marginRight: '0.5rem' }} />
                  Evidence faktury
                </SectionTitle>
                <InfoGrid>
                  {(slidePanelInvoice.vytvoril_uzivatel || slidePanelInvoice.vytvoril_uzivatel_zkracene) && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#e0e7ff', color: '#6366f1' }}>
                        <FontAwesomeIcon icon={faUser} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Fakturu evidoval(a)</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          {slidePanelInvoice.vytvoril_uzivatel || slidePanelInvoice.vytvoril_uzivatel_zkracene}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.dt_vytvoreni && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#dbeafe', color: '#3b82f6' }}>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum zaevidování</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          {new Date(slidePanelInvoice.dt_vytvoreni).toLocaleString('cs-CZ', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_predana_zam_jmeno_cele && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#fef3c7', color: '#f59e0b' }}>
                        <FontAwesomeIcon icon={faUser} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Předána zaměstnanci</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          {slidePanelInvoice.fa_predana_zam_jmeno_cele}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_datum_predani_zam && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#fef3c7', color: '#f59e0b' }}>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum předání zaměstnanci</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          ↓ {formatDateOnly(slidePanelInvoice.fa_datum_predani_zam)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_datum_vraceni_zam && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#fee2e2', color: '#dc2626' }}>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum vrácení zaměstnancem</InfoLabel>
                        <InfoValue style={{ fontWeight: '600', color: '#dc2626' }}>
                          ↑ {formatDateOnly(slidePanelInvoice.fa_datum_vraceni_zam)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}
                </InfoGrid>
              </DetailSection>

              {/* Data */}
              <DetailSection>
                <SectionTitle>
                  <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '0.5rem' }} />
                  Důležitá data
                </SectionTitle>
                <InfoGrid>
                  {slidePanelInvoice.datum_vystaveni && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#dbeafe', color: '#3b82f6' }}>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum vystavení</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          {formatDateOnly(slidePanelInvoice.datum_vystaveni)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.datum_zdanitelneho_plneni && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum zdanitelného plnění</InfoLabel>
                        <InfoValue>
                          {formatDateOnly(slidePanelInvoice.datum_zdanitelneho_plneni)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}
                  
                  {slidePanelInvoice.datum_splatnosti && (
                    <InfoRow>
                      <InfoIcon style={{ 
                        background: getInvoiceStatus(slidePanelInvoice) === 'overdue' ? '#fee2e2' : '#fef3c7',
                        color: getInvoiceStatus(slidePanelInvoice) === 'overdue' ? '#dc2626' : '#f59e0b'
                      }}>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum splatnosti</InfoLabel>
                        <InfoValue style={{ 
                          fontWeight: '700',
                          color: getInvoiceStatus(slidePanelInvoice) === 'overdue' ? '#dc2626' : '#1e293b'
                        }}>
                          {formatDateOnly(slidePanelInvoice.datum_splatnosti)}
                          {getInvoiceStatus(slidePanelInvoice) === 'overdue' && (
                            <Badge $color="#fee2e2" $textColor="#991b1b" style={{ marginLeft: '0.5rem' }}>
                              ⚠️ Po splatnosti
                            </Badge>
                          )}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.datum_prijeti && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum přijetí</InfoLabel>
                        <InfoValue>
                          {formatDateOnly(slidePanelInvoice.datum_prijeti)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.datum_doruceni && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum doručení</InfoLabel>
                        <InfoValue>
                          {formatDateOnly(slidePanelInvoice.datum_doruceni)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.datum_uhrady && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#dcfce7', color: '#059669' }}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum úhrady</InfoLabel>
                        <InfoValue style={{ fontWeight: '600', color: '#059669' }}>
                          {formatDateOnly(slidePanelInvoice.datum_uhrady)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.datum_uhrazeni && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#d1fae5', color: '#10b981' }}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum uhrazení</InfoLabel>
                        <InfoValue style={{ fontWeight: '700', color: '#10b981' }}>
                          {formatDateOnly(slidePanelInvoice.datum_uhrazeni)}
                          {' ✅'}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.datum_platby && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum platby</InfoLabel>
                        <InfoValue>
                          {formatDateOnly(slidePanelInvoice.datum_platby)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.datum_zuctovani && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum zúčtování</InfoLabel>
                        <InfoValue>
                          {formatDateOnly(slidePanelInvoice.datum_zuctovani)}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}
                </InfoGrid>
              </DetailSection>

              {/* Poznámka */}
              {slidePanelInvoice.fa_poznamka && (
                <DetailSection>
                  <SectionTitle>Poznámka</SectionTitle>
                  <InfoGrid>
                    <InfoRowFullWidth>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faFileAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Poznámka k faktuře</InfoLabel>
                        <InfoValue style={{ whiteSpace: 'pre-wrap' }}>
                          {slidePanelInvoice.fa_poznamka}
                        </InfoValue>
                      </InfoContent>
                    </InfoRowFullWidth>
                  </InfoGrid>
                </DetailSection>
              )}

              {/* Přílohy */}
              {slidePanelAttachments.length > 0 && (
                <DetailSection>
                  <SectionTitle>
                    <FontAwesomeIcon icon={faPaperclip} style={{ marginRight: '0.5rem' }} />
                    Přílohy ({slidePanelAttachments.length})
                  </SectionTitle>
                  <AttachmentsGrid>
                    {slidePanelAttachments.map((attachment, index) => {
                      // ✅ Backend vrací "original_filename" z invoices25/list
                      const fileName = attachment.original_filename || attachment.originalni_nazev_souboru || attachment.nazev_souboru || attachment.file_name || 'Neznámý soubor';
                      const fileSize = attachment.velikost_b || attachment.velikost_souboru_b || attachment.velikost_souboru || attachment.file_size;
                      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                      
                      // Ikona a barva podle typu souboru
                      let icon = faPaperclip;
                      let iconColor = '#3b82f6';
                      let bgColor = '#eff6ff';
                      
                      if (['pdf'].includes(fileExtension)) {
                        icon = faFileAlt;
                        iconColor = '#dc2626';
                        bgColor = '#fee2e2';
                      } else if (['doc', 'docx'].includes(fileExtension)) {
                        icon = faFileAlt;
                        iconColor = '#2563eb';
                        bgColor = '#dbeafe';
                      } else if (['xls', 'xlsx'].includes(fileExtension)) {
                        icon = faFileAlt;
                        iconColor = '#059669';
                        bgColor = '#d1fae5';
                      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                        icon = faFileAlt;
                        iconColor = '#7c3aed';
                        bgColor = '#ede9fe';
                      }

                      const formatFileSize = (bytes) => {
                        if (!bytes) return '';
                        const kb = bytes / 1024;
                        if (kb < 1024) return `${kb.toFixed(1)} KB`;
                        return `${(kb / 1024).toFixed(1)} MB`;
                      };

                      return (
                        <AttachmentItem
                          key={attachment.id || index}
                          onClick={async () => {
                            if (!attachment.id) return;
                            
                            try {
                              // Import download funkce
                              const { downloadInvoiceAttachment25 } = await import('../services/api25invoices');
                              
                              // Stáhnout soubor jako blob
                              const blobData = await downloadInvoiceAttachment25({
                                token,
                                username,
                                faktura_id: attachment.faktura_id || slidePanelInvoice.id,
                                priloha_id: attachment.id,
                                objednavka_id: attachment.objednavka_id
                              });
                              
                              const ext = fileName.toLowerCase().split('.').pop();

                              // Určit MIME type podle přípony
                              let mimeType = 'application/octet-stream';
                              if (ext === 'pdf') {
                                mimeType = 'application/pdf';
                              } else if (['jpg', 'jpeg'].includes(ext)) {
                                mimeType = 'image/jpeg';
                              } else if (ext === 'png') {
                                mimeType = 'image/png';
                              } else if (ext === 'gif') {
                                mimeType = 'image/gif';
                              } else if (ext === 'bmp') {
                                mimeType = 'image/bmp';
                              } else if (ext === 'webp') {
                                mimeType = 'image/webp';
                              } else if (ext === 'svg') {
                                mimeType = 'image/svg+xml';
                              }

                              // Vytvořit nový Blob se správným MIME typem
                              const blob = new Blob([blobData], { type: mimeType });
                              
                              // Vytvořit URL pro blob
                              const blobUrl = window.URL.createObjectURL(blob);
                              
                              // Check if file type is supported for preview
                              const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
                              const downloadableTypes = ['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar'];
                              
                              if (previewableTypes.includes(ext)) {
                                // Otevřít náhled pro podporované soubory
                                setViewerAttachment({
                                  ...attachment,
                                  original_filename: fileName,
                                  blobUrl: blobUrl,
                                  mimeType: mimeType
                                });
                              } else if (downloadableTypes.includes(ext)) {
                                
                                const downloadLink = document.createElement('a');
                                downloadLink.href = blobUrl;
                                downloadLink.download = fileName;
                                document.body.appendChild(downloadLink);
                                downloadLink.click();
                                document.body.removeChild(downloadLink);
                                
                                // Cleanup blob URL
                                setTimeout(() => {
                                  window.URL.revokeObjectURL(blobUrl);
                                }, 1000);
                                
                                showToast(`Stahuje se soubor: ${fileName}`, { type: 'info' });
                              } else {
                                
                                const downloadLink = document.createElement('a');
                                downloadLink.href = blobUrl;
                                downloadLink.download = fileName;
                                document.body.appendChild(downloadLink);
                                downloadLink.click();
                                document.body.removeChild(downloadLink);
                                
                                setTimeout(() => {
                                  window.URL.revokeObjectURL(blobUrl);
                                }, 1000);
                                
                                showToast(`Stahuje se soubor: ${fileName}`, { type: 'info' });
                              }
                            } catch (err) {
                              console.error('Chyba při otevírání přílohy:', err);
                              showToast('Nepodařilo se načíst přílohu', { type: 'error' });
                            }
                          }}
                          title="Klikněte pro náhled"
                          style={{ cursor: 'pointer' }}
                        >
                          <AttachmentIcon $color={bgColor} $iconColor={iconColor}>
                            <FontAwesomeIcon icon={icon} />
                          </AttachmentIcon>
                          <AttachmentInfo>
                            <AttachmentName>{fileName}</AttachmentName>
                            {fileSize && (
                              <AttachmentMeta>
                                {formatFileSize(fileSize)} • {fileExtension.toUpperCase()}
                              </AttachmentMeta>
                            )}
                          </AttachmentInfo>
                          <AttachmentAction>
                            <FontAwesomeIcon icon={faDownload} />
                          </AttachmentAction>
                        </AttachmentItem>
                      );
                    })}
                  </AttachmentsGrid>
                </DetailSection>
              )}

              {/* Kontrola věcné správnosti */}
              <DetailSection>
                <SectionTitle>
                  <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.5rem' }} />
                  Kontrola věcné správnosti
                </SectionTitle>
                <InfoGrid>
                  {(slidePanelInvoice.potvrdil_vecnou_spravnost_jmeno || slidePanelInvoice.vecna_spravnost_potvrzeno || slidePanelInvoice.dt_potvrzeni_vecne_spravnosti) ? (
                    <>
                    {(slidePanelInvoice.vecna_spravnost_potvrzeno === 1 || slidePanelInvoice.vecna_spravnost_potvrzeno === true) && (
                      <InfoRowFullWidth>
                        <InfoIcon style={{ background: '#d1fae5', color: '#10b981' }}>
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Stav věcné správnosti</InfoLabel>
                          <InfoValue>
                            <Badge 
                              $color="#d1fae5"
                              $textColor="#166534"
                              style={{ fontSize: '0.875rem', fontWeight: '700' }}
                            >
                              ✅ POTVRZENO
                            </Badge>
                          </InfoValue>
                        </InfoContent>
                      </InfoRowFullWidth>
                    )}
                    
                    {(slidePanelInvoice.vecna_spravnost_potvrzeno === 0 || !slidePanelInvoice.vecna_spravnost_potvrzeno) && slidePanelInvoice.potvrdil_vecnou_spravnost_jmeno && (
                      <InfoRowFullWidth>
                        <InfoIcon style={{ background: '#fef3c7', color: '#f59e0b' }}>
                          <FontAwesomeIcon icon={faHourglassHalf} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Stav věcné správnosti</InfoLabel>
                          <InfoValue>
                            <Badge 
                              $color="#fef3c7"
                              $textColor="#92400e"
                              style={{ fontSize: '0.875rem', fontWeight: '700' }}
                            >
                              ⏳ ČEKÁ NA KONTROLU
                            </Badge>
                          </InfoValue>
                        </InfoContent>
                      </InfoRowFullWidth>
                    )}

                    {slidePanelInvoice.potvrdil_vecnou_spravnost_jmeno && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faUser} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Potvrdil věcnou správnost</InfoLabel>
                          <InfoValue style={{ fontWeight: '600' }}>
                            {[
                              slidePanelInvoice.potvrdil_vecnou_spravnost_titul_pred,
                              slidePanelInvoice.potvrdil_vecnou_spravnost_jmeno,
                              slidePanelInvoice.potvrdil_vecnou_spravnost_prijmeni,
                              slidePanelInvoice.potvrdil_vecnou_spravnost_titul_za
                            ].filter(Boolean).join(' ')}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.dt_potvrzeni_vecne_spravnosti && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faCalendarAlt} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Datum potvrzení</InfoLabel>
                          <InfoValue>
                            {new Date(slidePanelInvoice.dt_potvrzeni_vecne_spravnosti).toLocaleString('cs-CZ', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.vecna_spravnost_poznamka && (
                      <InfoRowFullWidth>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faFileAlt} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Poznámka ke kontrole</InfoLabel>
                          <InfoValue style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                            {slidePanelInvoice.vecna_spravnost_poznamka}
                          </InfoValue>
                        </InfoContent>
                      </InfoRowFullWidth>
                    )}

                    {slidePanelInvoice.vecna_spravnost_umisteni_majetku && (
                      <InfoRowFullWidth>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faBuilding} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Umístění majetku</InfoLabel>
                          <InfoValue style={{ whiteSpace: 'pre-wrap' }}>
                            {slidePanelInvoice.vecna_spravnost_umisteni_majetku}
                          </InfoValue>
                        </InfoContent>
                      </InfoRowFullWidth>
                    )}
                    </>
                  ) : (
                    <InfoRowFullWidth>
                      <InfoIcon style={{ background: '#f1f5f9', color: '#64748b' }}>
                        <FontAwesomeIcon icon={faHourglassHalf} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Stav kontroly</InfoLabel>
                        <InfoValue style={{ color: '#64748b', fontStyle: 'italic' }}>
                          Věcná správnost nebyla dosud zkontrolována
                        </InfoValue>
                      </InfoContent>
                    </InfoRowFullWidth>
                  )}
                </InfoGrid>
              </DetailSection>

              {/* Systémové informace */}
              {(slidePanelInvoice.dt_vytvoreni || slidePanelInvoice.dt_modifikace || slidePanelInvoice.vytvoril_jmeno) && (
                <DetailSection>
                  <SectionTitle>
                    <FontAwesomeIcon icon={faDatabase} style={{ marginRight: '0.5rem' }} />
                    Systémové informace
                  </SectionTitle>
                  <InfoGrid>
                    {slidePanelInvoice.vytvoril_jmeno && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faUser} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Zaevidoval</InfoLabel>
                          <InfoValue>
                            {[
                              slidePanelInvoice.vytvoril_titul_pred,
                              slidePanelInvoice.vytvoril_jmeno,
                              slidePanelInvoice.vytvoril_prijmeni,
                              slidePanelInvoice.vytvoril_titul_za
                            ].filter(Boolean).join(' ')}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.dt_vytvoreni && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faCalendarAlt} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Datum vytvoření záznamu</InfoLabel>
                          <InfoValue>
                            {new Date(slidePanelInvoice.dt_vytvoreni).toLocaleString('cs-CZ', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}

                    {slidePanelInvoice.dt_modifikace && (
                      <InfoRow>
                        <InfoIcon>
                          <FontAwesomeIcon icon={faCalendarAlt} />
                        </InfoIcon>
                        <InfoContent>
                          <InfoLabel>Poslední změna</InfoLabel>
                          <InfoValue>
                            {new Date(slidePanelInvoice.dt_modifikace).toLocaleString('cs-CZ', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </InfoValue>
                        </InfoContent>
                      </InfoRow>
                    )}
                  </InfoGrid>
                </DetailSection>
              )}

            </ContentWrapper>
          </DetailViewWrapper>
        )}
      </SlideInDetailPanel>
      
      {/* 🎯 Floating Header Panel - zobrazí se při rolování dolů - renderuje se přes Portal */}
      {ReactDOM.createPortal(
        <FloatingHeaderPanel $visible={showFloatingHeader}>
          <FloatingTableWrapper>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {/* Definice šířek sloupců */}
              {columnWidths.length > 0 && (
                <colgroup>
                  {columnWidths.map((width, index) => (
                    <col key={index} style={{ width: `${width}px` }} />
                  ))}
                </colgroup>
              )}
              <TableHead>
                {/* Hlavní řádek se jmény sloupců */}
                <tr>
                  <TableHeader 
                    className={`date-column sortable ${sortField === 'dt_aktualizace' ? 'active' : ''}`}
                    onClick={() => handleSort('dt_aktualizace')}
                  >
                    Aktualizováno
                    {sortField === 'dt_aktualizace' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`wide-column sortable ${sortField === 'cislo_faktury' ? 'active' : ''}`}
                    onClick={() => handleSort('cislo_faktury')}
                  >
                    Faktura VS
                    {sortField === 'cislo_faktury' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`sortable ${sortField === 'fa_typ' ? 'active' : ''}`}
                    onClick={() => handleSort('fa_typ')}
                  >
                    Typ
                    {sortField === 'fa_typ' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`wide-column sortable ${sortField === 'cislo_objednavky' ? 'active' : ''}`}
                    onClick={() => handleSort('cislo_objednavky')}
                    style={{ textAlign: 'center' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>Obj/SML/Dodavatel</span>
                    </div>
                    {sortField === 'cislo_objednavky' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`date-column sortable ${sortField === 'datum_doruceni' ? 'active' : ''}`}
                    onClick={() => handleSort('datum_doruceni')}
                  >
                    Doručení
                    {sortField === 'datum_doruceni' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`date-column sortable ${sortField === 'datum_vystaveni' ? 'active' : ''}`}
                    onClick={() => handleSort('datum_vystaveni')}
                  >
                    Vystavení
                    {sortField === 'datum_vystaveni' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`date-column sortable ${sortField === 'datum_splatnosti' ? 'active' : ''}`}
                    onClick={() => handleSort('datum_splatnosti')}
                  >
                    Splatnost
                    {sortField === 'datum_splatnosti' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`amount-column sortable ${sortField === 'castka' ? 'active' : ''}`}
                    onClick={() => handleSort('castka')}
                  >
                    Částka
                    {sortField === 'castka' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`status-column sortable ${sortField === 'status' ? 'active' : ''}`}
                    onClick={() => handleSort('status')}
                  >
                    Stav
                    {sortField === 'status' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`narrow-column sortable ${sortField === 'vytvoril_uzivatel' ? 'active' : ''}`}
                    onClick={() => handleSort('vytvoril_uzivatel')}
                  >
                    Zaevidoval
                    {sortField === 'vytvoril_uzivatel' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`sortable ${sortField === 'fa_predana_zam_jmeno' ? 'active' : ''}`}
                    onClick={() => handleSort('fa_predana_zam_jmeno')}
                    style={{ minWidth: '120px' }}
                  >
                    Předáno
                    {sortField === 'fa_predana_zam_jmeno' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`narrow-column sortable ${sortField === 'potvrdil_vecnou_spravnost_jmeno' ? 'active' : ''}`}
                    onClick={() => handleSort('potvrdil_vecnou_spravnost_jmeno')}
                  >
                    Věcnou provedl
                    {sortField === 'potvrdil_vecnou_spravnost_jmeno' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`sortable ${sortField === 'vecna_spravnost_potvrzeno' ? 'active' : ''}`}
                    onClick={() => handleSort('vecna_spravnost_potvrzeno')}
                    title="Věcná kontrola"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#64748b' }} />
                    {sortField === 'vecna_spravnost_potvrzeno' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`sortable ${sortField === 'pocet_priloh' ? 'active' : ''}`}
                    onClick={() => handleSort('pocet_priloh')}
                  >
                    <FontAwesomeIcon icon={faPaperclip} style={{ color: '#64748b' }} />
                    {sortField === 'pocet_priloh' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader title="Kontrola řádku faktury">
                    <FontAwesomeIcon icon={faCheck} style={{ color: '#64748b' }} />
                  </TableHeader>
                  <TableHeader>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#64748b' }} />
                  </TableHeader>
                </tr>
                {/* FILTROVACÍ ŘÁDEK - IDENTICKÁ STRUKTURA JAKO V HLAVNÍ TABULCE */}
                <tr className="filter-row">
                  {/* Aktualizováno */}
                  <TableHeader className="filter-cell">
                    <div className="date-filter-wrapper">
                      <DatePicker
                        fieldName="dt_aktualizace"
                        value={columnFilters.dt_aktualizace || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, dt_aktualizace: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>

                  {/* Číslo faktury */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faSearch} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Číslo faktury..."
                        value={columnFilters.cislo_faktury || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, cislo_faktury: e.target.value})}
                      />
                      {columnFilters.cislo_faktury && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, cislo_faktury: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Typ faktury */}
                  <TableHeader className="filter-cell">
                    <div className="select-filter-wrapper">
                      <CustomSelect
                        value={columnFilters.fa_typ || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, fa_typ: value})}
                        options={invoiceTypeOptions}
                        field="floating_fa_typ"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        enableSearch={false}
                        placeholder="Všechny typy"
                        disabled={invoiceTypesLoading}
                      />
                    </div>
                  </TableHeader>

                  {/* Objednávka/Smlouva */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faSearch} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Obj./Smlouva..."
                        value={columnFilters.cislo_objednavky || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, cislo_objednavky: e.target.value})}
                        title="Hledá v číslech objednávek i smluv"
                      />
                      {columnFilters.cislo_objednavky && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, cislo_objednavky: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Doručení */}
                  <TableHeader className="filter-cell">
                    <div className="date-filter-wrapper">
                      <DatePicker
                        fieldName="datum_doruceni"
                        value={columnFilters.datum_doruceni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_doruceni: value})}
                        placeholder="Doručení"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>

                  {/* Vystavení */}
                  <TableHeader className="filter-cell">
                    <div className="date-filter-wrapper">
                      <DatePicker
                        fieldName="datum_vystaveni"
                        value={columnFilters.datum_vystaveni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_vystaveni: value})}
                        placeholder="Vystavení"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>

                  {/* Splatnost */}
                  <TableHeader className="filter-cell">
                    <div className="date-filter-wrapper">
                      <DatePicker
                        fieldName="datum_splatnosti"
                        value={columnFilters.datum_splatnosti || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_splatnosti: value})}
                        placeholder="Splatnost"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>

                  {/* Částka */}
                  <TableHeader className="filter-cell amount-column">
                    <div className="operator-filter-wrapper">
                      <OperatorInput
                        value={columnFilters.castka || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, castka: value})}
                        placeholder="Částka"
                        clearButton={true}
                        onClear={() => {
                          setColumnFilters({...columnFilters, castka: ''});
                        }}
                      />
                    </div>
                  </TableHeader>

                  {/* Stav */}
                  <TableHeader className="filter-cell">
                    <div className="select-filter-wrapper">
                      <CustomSelect
                        value={columnFilters.stav || ''}
                        onChange={(value) => {
                          setColumnFilters({...columnFilters, stav: value});
                        }}
                        options={stavOptions}
                        field="floating_stav"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        enableSearch={false}
                        placeholder="Všechny stavy"
                      />
                    </div>
                  </TableHeader>

                  {/* Zaevidoval */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faUser} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Jméno..."
                        value={columnFilters.vytvoril_uzivatel || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, vytvoril_uzivatel: e.target.value})}
                      />
                      {columnFilters.vytvoril_uzivatel && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, vytvoril_uzivatel: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Předáno zaměstnanci */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faUser} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Jméno..."
                        value={columnFilters.predano_zamestnanec || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, predano_zamestnanec: e.target.value})}
                      />
                      {columnFilters.predano_zamestnanec && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, predano_zamestnanec: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Věcnou provedl */}
                  <TableHeader className="filter-cell">
                    <div className="text-filter-wrapper">
                      <FontAwesomeIcon icon={faUser} className="filter-icon" />
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Jméno..."
                        value={columnFilters.vecnou_provedl || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, vecnou_provedl: e.target.value})}
                      />
                      {columnFilters.vecnou_provedl && (
                        <button
                          className="filter-clear"
                          onClick={() => setColumnFilters({...columnFilters, vecnou_provedl: ''})}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>

                  {/* Věcná kontrola */}
                  <TableHeader className="filter-cell">
                    <div className="select-filter-wrapper">
                      <CustomSelect
                        value={columnFilters.vecna_kontrola || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, vecna_kontrola: value})}
                        options={vecnaKontrolaOptions}
                        field="floating_vecna_kontrola"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        enableSearch={false}
                        placeholder="Vše"
                      />
                    </div>
                  </TableHeader>

                  {/* Přílohy */}
                  <TableHeader className="filter-cell">
                    <div className="select-filter-wrapper">
                      <CustomSelect
                        value={activeFilterStatus === 'from_spisovka' ? 'spisovka' : (columnFilters.ma_prilohy || '')}
                        onChange={(value) => {
                          if (value === 'spisovka') {
                            setFilters(prev => ({ ...prev, filter_status: 'from_spisovka' }));
                            setActiveFilterStatus('from_spisovka');
                            setColumnFilters({...columnFilters, ma_prilohy: ''});
                          } else {
                            setFilters(prev => ({ ...prev, filter_status: '' }));
                            setActiveFilterStatus(null);
                            setColumnFilters({...columnFilters, ma_prilohy: value});
                          }
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: '', label: 'Vše' },
                          { value: 'without', label: 'Bez příloh' },
                          { value: 'with', label: 'S přílohami' },
                          { value: 'spisovka', label: 'Ze spisovky' }
                        ]}
                        field="ma_prilohy_floating"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        enableSearch={false}
                        placeholder="Vše"
                      />
                    </div>
                  </TableHeader>

                  {/* Kontrola řádku - prázdná */}
                  <TableHeader className="filter-cell">
                    {/* Prázdná buňka pro checkbox kontroly */}
                  </TableHeader>

                  {/* Akce */}
                  <TableHeader className="filter-cell">
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <ActionButton 
                        onClick={() => setColumnFilters({})}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        title="Vymazat všechny filtry"
                      >
                        <FontAwesomeIcon icon={faEraser} />
                      </ActionButton>
                    </div>
                  </TableHeader>
                </tr>
              </TableHead>
            </table>
          </FloatingTableWrapper>
        </FloatingHeaderPanel>,
        document.body
      )}
      
      {/* Attachments Tooltip */}
      {attachmentsTooltip && (
        <div
          onMouseEnter={(e) => e.currentTarget.setAttribute('data-tooltip-hover', 'true')}
          onMouseLeave={(e) => {
            e.currentTarget.removeAttribute('data-tooltip-hover');
            setAttachmentsTooltip(null);
          }}
        >
          <InvoiceAttachmentsTooltip
            attachments={attachmentsTooltip.attachments}
            position={attachmentsTooltip.position}
            onClose={() => setAttachmentsTooltip(null)}
            onView={(attachmentWithBlob) => {
              setViewerAttachment(attachmentWithBlob);
              setAttachmentsTooltip(null);
            }}
            token={token}
            username={username}
          />
        </div>
      )}
      
      {/* Attachment Viewer */}
      {viewerAttachment && (
        <AttachmentViewer
          attachment={viewerAttachment}
          onClose={() => setViewerAttachment(null)}
        />
      )}
      
      {/* 📋 Sidebar s objednávkami připravenými k fakturaci */}
      <SlideInDetailPanel
        isOpen={showOrdersSidebar}
        title="Objednávky připravené k fakturaci"
        onClose={handleCloseOrdersSidebar}
        width="700px"
      >
          <div style={{ padding: '1.5rem' }}>
            {loadingOrdersReady ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <FontAwesomeIcon icon={faSyncAlt} spin style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                <p>Načítám objednávky...</p>
              </div>
            ) : ordersReadyForInvoice.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '2rem', marginBottom: '1rem', color: '#10b981' }} />
                <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Nejsou žádné objednávky připravené k fakturaci</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Všechny dokončené objednávky již mají přiřazenou fakturu.</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.95rem' }}>
                    <FontAwesomeIcon icon={faFileInvoice} style={{ marginRight: '0.5rem' }} />
                    Nalezeno <strong>{ordersReadyForInvoice.filter(order => {
                      if (!debouncedSidebarSearch.trim()) return true;
                      const searchTerm = normalizeSearchText(debouncedSidebarSearch);
                      return (
                        normalizeSearchText(order.jmeno || '').includes(searchTerm) ||
                        normalizeSearchText(order.nazev || '').includes(searchTerm) ||
                        normalizeSearchText(order.cislo_obj || '').includes(searchTerm) ||
                        normalizeSearchText(order.cislo_objednavky || '').includes(searchTerm) ||
                        normalizeSearchText(order.dodavatel_nazev || '').includes(searchTerm) ||
                        normalizeSearchText(order.dodavatel_ico || '').includes(searchTerm)
                      );
                    }).length}</strong> {ordersReadyForInvoice.filter(order => {
                      if (!debouncedSidebarSearch.trim()) return true;
                      const searchTerm = normalizeSearchText(debouncedSidebarSearch);
                      return (
                        normalizeSearchText(order.jmeno || '').includes(searchTerm) ||
                        normalizeSearchText(order.nazev || '').includes(searchTerm) ||
                        normalizeSearchText(order.cislo_obj || '').includes(searchTerm) ||
                        normalizeSearchText(order.cislo_objednavky || '').includes(searchTerm) ||
                        normalizeSearchText(order.dodavatel_nazev || '').includes(searchTerm) ||
                        normalizeSearchText(order.dodavatel_ico || '').includes(searchTerm)
                      );
                    }).length === 1 ? 'objednávka' : ordersReadyForInvoice.filter(order => {
                      if (!debouncedSidebarSearch.trim()) return true;
                      const searchTerm = normalizeSearchText(debouncedSidebarSearch);
                      return (
                        normalizeSearchText(order.jmeno || '').includes(searchTerm) ||
                        normalizeSearchText(order.nazev || '').includes(searchTerm) ||
                        normalizeSearchText(order.cislo_obj || '').includes(searchTerm) ||
                        normalizeSearchText(order.cislo_objednavky || '').includes(searchTerm) ||
                        normalizeSearchText(order.dodavatel_nazev || '').includes(searchTerm) ||
                        normalizeSearchText(order.dodavatel_ico || '').includes(searchTerm)
                      );
                    }).length <= 4 ? 'objednávky' : 'objednávek'} bez faktury
                  </p>
                </div>
                
                {/* 🔍 Search box pro sidebar */}
                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Hledat v objednávkách (číslo obj., název, dodavatel, IČO...)"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 2rem 0.6rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      background: 'white',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  {sidebarSearch && (
                    <button
                      onClick={() => setSidebarSearch('')}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseOver={(e) => e.target.style.color = '#6b7280'}
                      onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                      title="Vymazat hledání"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ordersReadyForInvoice.filter(order => {
                    if (!debouncedSidebarSearch.trim()) return true;
                    const searchTerm = normalizeSearchText(debouncedSidebarSearch);
                    return (
                      normalizeSearchText(order.jmeno || '').includes(searchTerm) ||
                      normalizeSearchText(order.nazev || '').includes(searchTerm) ||
                      normalizeSearchText(order.cislo_obj || '').includes(searchTerm) ||
                      normalizeSearchText(order.cislo_objednavky || '').includes(searchTerm) ||
                      normalizeSearchText(order.dodavatel_nazev || '').includes(searchTerm) ||
                      normalizeSearchText(order.dodavatel_ico || '').includes(searchTerm)
                    );
                  }).map(order => (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrderForInvoice(order)}
                      style={{
                        padding: '1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: '#fff'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#1e293b' }}>
                          {order.cislo_objednavky}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                          {formatDateOnly(order.dt_vytvoreni)}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '0.75rem', fontWeight: 500 }}>
                        {order.predmet}
                      </div>
                      
                      {/* Účastníci */}
                      {(order.objednatel || order.garant || order.prikazce || order.schvalovatel) && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '4px' }}>
                          {order.objednatel && (
                            <div style={{ marginBottom: '0.25rem' }}>
                              <strong>Objednatel:</strong> {order.objednatel.cele_jmeno || `${order.objednatel.jmeno} ${order.objednatel.prijmeni}`}
                            </div>
                          )}
                          {order.garant && (
                            <div style={{ marginBottom: '0.25rem' }}>
                              <strong>Garant:</strong> {order.garant.cele_jmeno || `${order.garant.jmeno} ${order.garant.prijmeni}`}
                            </div>
                          )}
                          {order.prikazce && (
                            <div style={{ marginBottom: '0.25rem' }}>
                              <strong>Příkazce:</strong> {order.prikazce.cele_jmeno || `${order.prikazce.jmeno} ${order.prikazce.prijmeni}`}
                            </div>
                          )}
                          {order.schvalovatel && (
                            <div>
                              <strong>Schvalovatel:</strong> {order.schvalovatel.cele_jmeno || `${order.schvalovatel.jmeno} ${order.schvalovatel.prijmeni}`}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Dodavatel s IČO */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        {order.dodavatel_nazev && (
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            <FontAwesomeIcon icon={faBuilding} style={{ marginRight: '0.4rem', width: '14px' }} />
                            {order.dodavatel_nazev}
                            {order.dodavatel_ico && (
                              <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>
                                | IČO: {order.dodavatel_ico}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Ikona s počtem příloh */}
                        {order.pocet_priloh > 0 && (
                          <div
                            style={{ cursor: 'pointer', padding: '0.25rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Zobrazit tooltip s přílohami při kliknutí
                              if (order.prilohy && order.prilohy.length > 0) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const tooltipWidth = 350;
                                const tooltipHeight = 300;
                                
                                // Vypočítat optimální pozici pro tooltip
                                let top = rect.bottom + 5;
                                let left = rect.left - tooltipWidth + 50;
                                
                                // Kontrola, zda tooltip nepřesahuje dolní okraj okna
                                const spaceBelow = window.innerHeight - rect.bottom;
                                if (spaceBelow < tooltipHeight + 20) {
                                  // Zobrazit nad ikonou
                                  top = rect.top - tooltipHeight - 5;
                                }
                                
                                // Kontrola, zda tooltip nepřesahuje levý okraj okna
                                if (left < 10) {
                                  left = 10;
                                }
                                
                                // Kontrola, zda tooltip nepřesahuje pravý okraj okna
                                if (left + tooltipWidth > window.innerWidth - 10) {
                                  left = window.innerWidth - tooltipWidth - 10;
                                }
                                
                                setOrderAttachmentsTooltip({
                                  attachments: order.prilohy,
                                  orderId: order.id,
                                  position: {
                                    top: Math.max(10, top),
                                    left: Math.max(10, left)
                                  }
                                });
                              }
                            }}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                              <FontAwesomeIcon icon={faPaperclip} />
                              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{order.pocet_priloh}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Financování */}
                      {order.financovani && (() => {
                        let fin = order.financovani;
                        
                        // Pokud je to string, zkusit ho parsovat jako JSON
                        if (typeof fin === 'string') {
                          try {
                            fin = JSON.parse(fin);
                          } catch (e) {
                            return (
                              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                <FontAwesomeIcon icon={faMoneyBillWave} style={{ marginRight: '0.4rem', width: '14px', color: '#6366f1' }} />
                                <strong>Financování:</strong> {fin}
                              </div>
                            );
                          }
                        }
                        
                        // Pokud to není objekt, vrátit jako text
                        if (!fin || typeof fin !== 'object') {
                          return (
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                              <FontAwesomeIcon icon={faMoneyBillWave} style={{ marginRight: '0.4rem', width: '14px', color: '#6366f1' }} />
                              <strong>Financování:</strong> —
                            </div>
                          );
                        }
                        
                        const typ = fin.typ_nazev || fin.typ;
                        if (!typ) {
                          return (
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                              <FontAwesomeIcon icon={faMoneyBillWave} style={{ marginRight: '0.4rem', width: '14px', color: '#6366f1' }} />
                              <strong>Financování:</strong> —
                            </div>
                          );
                        }
                        
                        return (
                          <div style={{ 
                            fontSize: '0.85rem', 
                            color: '#64748b', 
                            marginBottom: '0.75rem',
                            background: '#f8fafc',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                              <FontAwesomeIcon icon={faMoneyBillWave} style={{ width: '14px', color: '#6366f1' }} />
                              <strong style={{ color: '#475569' }}>Financování:</strong>
                              <span style={{ color: '#6366f1', fontWeight: '600' }}>{typ}</span>
                            </div>
                            
                            {/* LP - zobrazit poznámku a názvy LP */}
                            {(typ === 'LP' || typ.includes('Limitovan')) && (
                              <>
                                {fin.lp_nazvy && Array.isArray(fin.lp_nazvy) && fin.lp_nazvy.length > 0 && (
                                  <div style={{ marginLeft: '1.3rem', marginBottom: '0.25rem' }}>
                                    <strong style={{ fontSize: '0.8rem', color: '#64748b' }}>Položky:</strong>
                                    <div style={{ marginTop: '0.15rem' }}>
                                      {fin.lp_nazvy.map((lp, idx) => {
                                        const kod = lp.cislo_lp || lp.kod || lp.id;
                                        const nazev = lp.nazev || '';
                                        return (
                                          <div key={idx} style={{ fontSize: '0.8rem', color: '#475569', paddingLeft: '0.5rem' }}>
                                            • {kod && nazev ? `${kod} - ${nazev}` : (kod || nazev)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {fin.lp_poznamka && (
                                  <div style={{ marginLeft: '1.3rem', fontSize: '0.8rem' }}>
                                    <strong style={{ color: '#64748b' }}>Poznámka:</strong> {fin.lp_poznamka.trim()}
                                  </div>
                                )}
                              </>
                            )}
                            
                            {/* SMLOUVA - zobrazit číslo smlouvy */}
                            {(typ === 'SMLOUVA' || typ.toUpperCase() === 'SMLOUVA') && (
                              <>
                                {fin.cislo_smlouvy && (
                                  <div style={{ marginLeft: '1.3rem', fontSize: '0.8rem' }}>
                                    <strong style={{ color: '#64748b' }}>Číslo smlouvy:</strong> {fin.cislo_smlouvy}
                                  </div>
                                )}
                                {fin.smlouva_cisla && Array.isArray(fin.smlouva_cisla) && fin.smlouva_cisla.length > 0 && (
                                  <div style={{ marginLeft: '1.3rem', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                                    <strong style={{ color: '#64748b' }}>Další smlouvy:</strong> {fin.smlouva_cisla.filter(Boolean).join(', ')}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* Ceny */}
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        {order.max_cena_s_dph && (
                          <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>Max. cena s DPH:</strong>
                            <span style={{ color: '#059669', fontWeight: 600 }}>
                              {parseFloat(order.max_cena_s_dph).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                            </span>
                          </div>
                        )}
                        {order.polozky_celkova_cena_s_dph && (
                          <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>Cena položek s DPH:</strong>
                            <span style={{ color: '#059669', fontWeight: 600 }}>
                              {parseFloat(order.polozky_celkova_cena_s_dph).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </SlideInDetailPanel>
      
      {/* Tooltip pro přílohy objednávek - v Portalu pro správný z-index */}
      {orderAttachmentsTooltip && ReactDOM.createPortal(
        <OrderAttachmentsTooltip
          attachments={orderAttachmentsTooltip.attachments}
          position={orderAttachmentsTooltip.position}
          onClose={() => setOrderAttachmentsTooltip(null)}
          token={token}
          username={username}
          orderId={orderAttachmentsTooltip.orderId}
          onView={(attachmentWithBlob) => {
            setViewerAttachment(attachmentWithBlob);
            setOrderAttachmentsTooltip(null);
          }}
        />,
        document.body
      )}
    </>
  );
};

export default Invoices25List;
