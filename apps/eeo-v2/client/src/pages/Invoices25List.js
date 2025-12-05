import React, { useEffect, useState, useMemo, useContext, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { ToastContext } from '../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileInvoice, faSearch, faFilter, faTimes, faPlus, faEdit, faEye, faTrash,
  faDownload, faSyncAlt, faChevronDown, faChevronUp, faEraser,
  faCalendarAlt, faUser, faBuilding, faMoneyBillWave, faPaperclip, 
  faFileAlt, faCheckCircle, faExclamationTriangle, faHourglassHalf,
  faDatabase, faBoltLightning, faTimesCircle, faDashboard
} from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';
import { prettyDate, formatDateOnly } from '../utils/format';
import { translateErrorMessage } from '../utils/errorTranslation';
import { TooltipWrapper } from '../styles/GlobalTooltip';
import DatePicker from '../components/DatePicker';
import { listInvoices25, listOrderInvoiceAttachments25 } from '../services/api25invoices';

// =============================================================================
// STYLED COMPONENTS - PŘESNĚ PODLE ORDERS25LIST
// =============================================================================

const Container = styled.div`
  position: relative;
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
  isolation: isolate;
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
  font-size: clamp(2rem, 3vw, 2.75rem);
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
const TableWrapper = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: 1rem;
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
  transition: background 0.2s ease;
  background: white;

  &:hover {
    background: #f8fafc;
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
  width: auto;
  min-width: 100px;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  /* Užší sloupce pro data */
  &.date-column {
    min-width: 80px;
    max-width: 90px;
  }
  
  /* Širší sloupce pro čísla */
  &.wide-column {
    min-width: 140px;
  }
  
  /* Úzký sloupec pro částku */
  &.amount-column {
    min-width: 80px;
    max-width: 100px;
  }
  
  /* Sorting indicator */
  &.sortable {
    padding-right: 1.5rem;
    
    .sort-icon {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.75rem;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    
    &:hover .sort-icon {
      opacity: 1;
    }
    
    &.active .sort-icon {
      opacity: 1;
      color: #fbbf24;
    }
  }
`;

const TableCell = styled.td`
  padding: 0.375rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  color: #1e293b;
  text-align: left;
  
  &.center {
    text-align: center;
  }
  
  &.right {
    text-align: right;
  }
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.25rem;

  & > svg {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
    font-size: 0.75rem;
    pointer-events: none;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.375rem 0.625rem 0.375rem 2rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.75rem;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
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
  const [selectedYear, setSelectedYear] = useState(savedState?.selectedYear || new Date().getFullYear());
  const [columnFilters, setColumnFilters] = useState(savedState?.columnFilters || {});
  
  // Filters state pro dashboard cards
  const [filters, setFilters] = useState(savedState?.filters || {
    filter_status: '' // 'paid', 'unpaid', 'overdue', 'without_order', 'my_invoices'
  });
  
  // Active filter status pro vizuální označení aktivní dlaždice
  const [activeFilterStatus, setActiveFilterStatus] = useState(savedState?.activeFilterStatus || null);
  
  // 🔍 Globální vyhledávání (nový state)
  const [globalSearchTerm, setGlobalSearchTerm] = useState(savedState?.globalSearchTerm || '');
  
  // 📊 Sorting state (client-side)
  const [sortField, setSortField] = useState(savedState?.sortField || null);
  const [sortDirection, setSortDirection] = useState(savedState?.sortDirection || 'asc'); // 'asc' nebo 'desc'
  
  // Dashboard statistiky (z BE - celkové součty podle filtru, NE jen aktuální stránka!)
  const [stats, setStats] = useState({
    total: 0,           // Celkový počet faktur (všechny stránky)
    paid: 0,            // Počet zaplacených
    unpaid: 0,          // Počet nezaplacených
    overdue: 0,         // Počet po splatnosti
    totalAmount: 0,     // Celková částka (všechny)
    paidAmount: 0,      // Částka zaplacených
    unpaidAmount: 0,    // Částka nezaplacených
    overdueAmount: 0,   // Částka po splatnosti
    withoutOrder: 0,    // Faktury bez přiřazené objednávky
    myInvoices: 0       // Moje faktury (jen pro admin/invoice_manage)
  });

  // Helper: Save state to localStorage
  const saveToLS = useCallback((state) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save invoices state to localStorage:', e);
    }
  }, [LS_KEY]);
  
  // Kontrola, jestli uživatel má admin práva nebo INVOICE_MANAGE
  const canViewAllInvoices = React.useMemo(() => {
    return hasPermission && (hasPermission('INVOICE_MANAGE') || hasPermission('ORDER_MANAGE'));
  }, [hasPermission]);
  
  // Handler: Navigace na evidenci faktury
  const handleNavigateToEvidence = () => {
    navigate('/invoice-evidence');
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
    
    // 1️⃣ Pokud je ZAPLACENÁ (fa_zaplacena = 1) → ZAPLACENO
    if (invoice.fa_zaplacena === 1 || invoice.fa_zaplacena === true) {
      return 'paid';
    }
    
    // 2️⃣ Pokud NENÍ zaplacená a má datum splatnosti → kontrola po splatnosti
    if (invoice.fa_datum_splatnosti) {
      const splatnost = new Date(invoice.fa_datum_splatnosti);
      splatnost.setHours(0, 0, 0, 0);
      
      // Pokud je splatnost v minulosti → PO SPLATNOSTI
      if (splatnost < now) {
        return 'overdue';
      }
    }
    
    // 3️⃣ Jinak → NEZAPLACENO (ale ještě není po splatnosti)
    return 'unpaid';
  }, []);

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
      
      // Číslo faktury (LIKE - částečná shoda)
      if (columnFilters.cislo_faktury && columnFilters.cislo_faktury.trim()) {
        apiParams.fa_cislo_vema = columnFilters.cislo_faktury.trim();
      }
      
      // Číslo objednávky (LIKE - částečná shoda)
      if (columnFilters.cislo_objednavky && columnFilters.cislo_objednavky.trim()) {
        apiParams.cislo_objednavky = columnFilters.cislo_objednavky.trim();
      }
      
      // Datum vystavení (přesná shoda)
      if (columnFilters.datum_vystaveni) {
        apiParams.filter_datum_vystaveni = columnFilters.datum_vystaveni;
      }
      
      // Datum splatnosti (přesná shoda)
      if (columnFilters.datum_splatnosti) {
        apiParams.filter_datum_splatnosti = columnFilters.datum_splatnosti;
      }
      
      // Stav faktury (paid/unpaid/overdue)
      if (columnFilters.stav) {
        apiParams.filter_stav = columnFilters.stav;
      }
      
      // Uživatel - celé jméno (LIKE - hledá v jméně i příjmení)
      if (columnFilters.vytvoril_uzivatel && columnFilters.vytvoril_uzivatel.trim()) {
        apiParams.filter_vytvoril_uzivatel = columnFilters.vytvoril_uzivatel.trim();
      }
      
      // Částka - rozsahový filtr (min/max)
      if (columnFilters.castka_min) {
        apiParams.castka_min = parseFloat(columnFilters.castka_min);
        console.log('📤 API: castka_min =', apiParams.castka_min);
      }
      if (columnFilters.castka_max) {
        apiParams.castka_max = parseFloat(columnFilters.castka_max);
        console.log('📤 API: castka_max =', apiParams.castka_max);
      }
      
      // Přílohy - filtr podle existence příloh
      if (columnFilters.ma_prilohy === 'with') {
        apiParams.filter_ma_prilohy = 1; // Pouze s přílohami
      } else if (columnFilters.ma_prilohy === 'without') {
        apiParams.filter_ma_prilohy = 0; // Pouze bez příloh
      }

      // 📥 Načtení faktur z BE (server-side pagination + user isolation)
      console.log('📤 Sending API params:', apiParams);
      const response = await listInvoices25(apiParams);
      console.log('📥 Received invoices:', response.faktury?.length, 'Total:', response.pagination?.total);

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
        
        // ✅ BE už vrací naparsovaná pole - použít přímo!
        strediska_kod: Array.isArray(invoice.fa_strediska_kod) ? invoice.fa_strediska_kod : [],
        poznamka: invoice.fa_poznamka || '',
        rozsirujici_data: invoice.rozsirujici_data || null, // BE už naparsoval nebo vrátil null
        
        // Přílohy (NOVÉ: BE vrací enriched data)
        pocet_priloh: invoice.pocet_priloh || 0,
        ma_prilohy: invoice.ma_prilohy || false,
        prilohy: Array.isArray(invoice.prilohy) ? invoice.prilohy : [],
        
        // Meta - vytvoril uživatel (NOVÉ: BE vrací kompletní info)
        vytvoril_uzivatel_id: typeof invoice.vytvoril_uzivatel_id === 'string' ? 
                              parseInt(invoice.vytvoril_uzivatel_id) : invoice.vytvoril_uzivatel_id,
        vytvoril_uzivatel: invoice.vytvoril_uzivatel || '', // Celé jméno s tituly
        vytvoril_uzivatel_detail: invoice.vytvoril_uzivatel_detail || null, // Kompletní objekt
        dt_vytvoreni: invoice.dt_vytvoreni,
        dt_aktualizace: invoice.dt_aktualizace,
        aktivni: invoice.aktivni === 1 || invoice.aktivni === true,
        
        // Vypočítaný status pro UI
        status: getInvoiceStatus(invoice)
      }));

      setInvoices(transformedInvoices);

      // ✅ Statistiky z BE - celkové součty podle filtru (NE jen aktuální stránka!)
      if (response.statistiky) {
        // BE vrací kompletní statistiky za celý filtr
        
        // Lokální počítání jen pro položky, které BE nevrací v statistikách
        const withoutOrderCount = transformedInvoices.filter(inv => !inv.objednavka_id).length;
        const myInvoicesCount = user_id 
          ? transformedInvoices.filter(inv => inv.vytvoril_uzivatel_id === user_id).length
          : 0;
        
        setStats({
          total: response.pagination?.total || 0,
          paid: response.statistiky.pocet_zaplaceno || 0,
          unpaid: response.statistiky.pocet_nezaplaceno || 0,
          overdue: response.statistiky.pocet_po_splatnosti || 0,
          totalAmount: parseFloat(response.statistiky.celkem_castka) || 0,
          paidAmount: parseFloat(response.statistiky.celkem_zaplaceno) || 0,
          unpaidAmount: parseFloat(response.statistiky.celkem_nezaplaceno) || 0,
          overdueAmount: parseFloat(response.statistiky.celkem_po_splatnosti) || 0,
          withoutOrder: withoutOrderCount,
          myInvoices: response.statistiky.pocet_moje_faktury || myInvoicesCount
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
          
          // Faktury bez objednávky
          if (!inv.objednavka_id) {
            acc.withoutOrder++;
          }
          
          // Moje faktury
          if (user_id && inv.vytvoril_uzivatel_id === user_id) {
            acc.myInvoices++;
          }
          
          return acc;
        }, { total: 0, paid: 0, unpaid: 0, overdue: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, overdueAmount: 0, withoutOrder: 0, myInvoices: 0 });
        
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
  }, [token, username, selectedYear, currentPage, itemsPerPage, columnFilters, filters, globalSearchTerm, showProgress, hideProgress, showToast, getInvoiceStatus]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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

  // Handler pro třídění tabulky
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      // Toggle směr třídění
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Nové pole -> výchozí směr ASC
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Třídění faktur (client-side)
  const sortedInvoices = useMemo(() => {
    if (!sortField) return invoices;

    return [...invoices].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Speciální handling pro různé typy dat
      if (sortField === 'castka') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortField.includes('datum')) {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortField === 'pocet_priloh') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, sortField, sortDirection]);

  // ⚠️ Filtrování a pagination dělá BE - invoices už jsou filtrované a stránkované!
  
  // Handlers
  const handleRefresh = () => {
    setCurrentPage(1); // Reset na první stránku
    loadData();
  };
  
  // Handler pro vymazání všech filtrů
  const handleClearAllFilters = useCallback(() => {
    setGlobalSearchTerm('');
    setColumnFilters({});
    setActiveFilterStatus(null);
    setFilters({ filter_status: '' });
    setCurrentPage(1);
  }, []);
  
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const handleViewInvoice = (invoice) => {
    console.log('View invoice:', invoice);
    showToast?.(`Zobrazit fakturu ${invoice.cislo_faktury}`, { type: 'info' });
  };

  const handleEditInvoice = (invoice) => {
    console.log('Edit invoice:', invoice);
    showToast?.(`Editovat fakturu ${invoice.cislo_faktury}`, { type: 'info' });
  };

  const handleDeleteInvoice = (invoice) => {
    console.log('Delete invoice:', invoice);
    showToast?.(`Smazat fakturu ${invoice.cislo_faktury}`, { type: 'info' });
  };

  // Generate years for select
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2020; year--) {
      years.push(year);
    }
    return years;
  }, []);

  return (
    <>
      {/* Loading Overlay */}
      <LoadingOverlay $visible={loading && invoices.length === 0}>
        <LoadingSpinner $visible={loading} />
        <LoadingMessage $visible={loading}>Načítám faktury...</LoadingMessage>
        <LoadingSubtext $visible={loading}>Vytvářím přehled faktur pro rok {selectedYear}</LoadingSubtext>
      </LoadingOverlay>

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
          <ActionButton $primary onClick={handleNavigateToEvidence}>
            <FontAwesomeIcon icon={faPlus} />
            Zaevidovat fakturu
          </ActionButton>
          
          {!showDashboard && (
            <TooltipWrapper text="Zobrazit přehledový dashboard s grafy" preferredPosition="bottom">
              <ActionButton onClick={handleToggleDashboard}>
                <FontAwesomeIcon icon={faDashboard} />
                Dashboard
              </ActionButton>
            </TooltipWrapper>
          )}
          
          <ActionButton onClick={handleRefresh}>
            <FontAwesomeIcon icon={faDownload} />
            Export
          </ActionButton>
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

            {/* Faktury bez objednávky */}
            <DashboardCard 
              onClick={() => handleDashboardCardClick('without_order')}
              $isActive={activeFilterStatus === 'without_order'}
              $color="#94a3b8"
            >
              <StatHeader>
                <StatLabel>Bez objednávky</StatLabel>
                <StatIcon $color="#94a3b8">
                  <FontAwesomeIcon icon={faTimesCircle} />
                </StatIcon>
              </StatHeader>
              <StatValue>{stats.withoutOrder}</StatValue>
              <StatLabel>Nepřiřazené faktury</StatLabel>
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
                <StatLabel>Mnou zaevidované</StatLabel>
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
            {(globalSearchTerm || Object.keys(columnFilters).some(key => columnFilters[key])) && (
              <ClearAllButton onClick={handleClearAllFilters}>
                <FontAwesomeIcon icon={faEraser} />
                Vymazat všechny filtry
              </ClearAllButton>
            )}
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
        <TableWrapper>
          <Table>
              <TableHead>
                {/* Hlavní řádek se jmény sloupců */}
                <tr>
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
                    className={`wide-column sortable ${sortField === 'cislo_faktury' ? 'active' : ''}`}
                    onClick={() => handleSort('cislo_faktury')}
                  >
                    Číslo faktury
                    {sortField === 'cislo_faktury' && (
                      <span className="sort-icon">
                        <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />
                      </span>
                    )}
                  </TableHeader>
                  <TableHeader 
                    className={`wide-column sortable ${sortField === 'cislo_objednavky' ? 'active' : ''}`}
                    onClick={() => handleSort('cislo_objednavky')}
                  >
                    Objednávka
                    {sortField === 'cislo_objednavky' && (
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
                    className={`sortable ${sortField === 'status' ? 'active' : ''}`}
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
                    className={`sortable ${sortField === 'vytvoril_uzivatel' ? 'active' : ''}`}
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
                    <FontAwesomeIcon icon={faBoltLightning} style={{ color: '#fbbf24' }} />
                  </TableHeader>
                </tr>
                {/* Druhý řádek s filtry ve sloupcích */}
                <tr>
                  {/* Doručení - datum filtr - PRVNÍ SLOUPEC */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_doruceni"
                        value={columnFilters.datum_doruceni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_doruceni: value})}
                        placeholder="Datum"
                      />
                    </div>
                  </TableHeader>
                  {/* Vystavení - datum filtr */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_vystaveni"
                        value={columnFilters.datum_vystaveni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_vystaveni: value})}
                        placeholder="Datum"
                      />
                    </div>
                  </TableHeader>
                  {/* Typ faktury - select filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <select
                      value={columnFilters.fa_typ || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, fa_typ: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.375rem 0.625rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Všechny typy</option>
                      <option value="BEZNA">BĚŽNÁ</option>
                      <option value="ZALOHOVA">ZÁLOHOVÁ</option>
                      <option value="OPRAVNA">OPRAVNÁ</option>
                      <option value="PROFORMA">PROFORMA</option>
                      <option value="DOBROPIS">DOBROPIS</option>
                    </select>
                  </TableHeader>
                  <TableHeader className="wide-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Hledat číslo..."
                        value={columnFilters.cislo_faktury || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, cislo_faktury: e.target.value})}
                      />
                      {columnFilters.cislo_faktury && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, cislo_faktury: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  <TableHeader className="wide-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Číslo obj..."
                        value={columnFilters.cislo_objednavky || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, cislo_objednavky: e.target.value})}
                      />
                      {columnFilters.cislo_objednavky && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, cislo_objednavky: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  {/* Částka - rozsahový filtr */}
                  <TableHeader className="amount-column" style={{ padding: '0.5rem 0.25rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Min"
                        value={columnFilters.castka_min || ''}
                        onChange={(e) => {
                          const newVal = e.target.value.replace(/[^0-9]/g, '');
                          console.log('🔍 Castka MIN changed:', newVal);
                          setColumnFilters({...columnFilters, castka_min: newVal});
                        }}
                        style={{
                          width: '45px',
                          padding: '0.35rem 0.25rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          background: 'white',
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>-</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Max"
                        value={columnFilters.castka_max || ''}
                        onChange={(e) => {
                          const newVal = e.target.value.replace(/[^0-9]/g, '');
                          console.log('🔍 Castka MAX changed:', newVal);
                          setColumnFilters({...columnFilters, castka_max: newVal});
                        }}
                        style={{
                          width: '45px',
                          padding: '0.35rem 0.25rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          background: 'white',
                          textAlign: 'center'
                        }}
                      />
                      {(columnFilters.castka_min || columnFilters.castka_max) && (
                        <button
                          onClick={() => setColumnFilters({...columnFilters, castka_min: '', castka_max: ''})}
                          style={{
                            position: 'absolute',
                            right: '-0.25rem',
                            top: '-0.25rem',
                            background: '#dc2626',
                            border: 'none',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            fontSize: '0.6rem',
                            padding: 0
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  </TableHeader>
                  {/* Splatnost - datum filtr */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_splatnosti"
                        value={columnFilters.datum_splatnosti || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_splatnosti: value})}
                        placeholder="Datum"
                      />
                    </div>
                  </TableHeader>
                  {/* Stav - select filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <select
                      value={columnFilters.stav || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, stav: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.375rem 0.625rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Vše</option>
                      <option value="paid">Zaplaceno</option>
                      <option value="unpaid">Nezaplaceno</option>
                      <option value="overdue">Po splatnosti</option>
                    </select>
                  </TableHeader>
                  {/* Zaevidoval - filtr uživatele */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faUser} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Jméno..."
                        value={columnFilters.vytvoril_uzivatel || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, vytvoril_uzivatel: e.target.value})}
                      />
                      {columnFilters.vytvoril_uzivatel && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, vytvoril_uzivatel: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  {/* Přílohy - select filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <select
                      value={columnFilters.ma_prilohy || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, ma_prilohy: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.375rem 0.625rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Vše</option>
                      <option value="with">S přílohami</option>
                      <option value="without">Bez příloh</option>
                    </select>
                  </TableHeader>
                  {/* Akce - tlačítko pro vymazání filtrů */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
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
              <tbody>
                {/* Error State v tabulce */}
                {error && (
                  <tr>
                    <td colSpan="11" style={{ padding: '3rem', textAlign: 'center' }}>
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
                    <td colSpan="11" style={{ padding: '3rem', textAlign: 'center' }}>
                      <EmptyStateIcon>
                        <FontAwesomeIcon icon={faFileInvoice} />
                      </EmptyStateIcon>
                      <EmptyStateText>Zatím nebyly nalezeny žádné faktury pro rok {selectedYear}</EmptyStateText>
                    </td>
                  </tr>
                )}
                
                {/* Data rows */}
                {!error && sortedInvoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="center">
                      {invoice.datum_doruceni ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.35rem' }} />
                          {formatDateOnly(invoice.datum_doruceni)}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell className="center">{invoice.datum_vystaveni ? formatDateOnly(invoice.datum_vystaveni) : '—'}</TableCell>
                    <TableCell className="center">
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
                        {invoice.fa_typ === 'BEZNA' ? 'BĚŽNÁ' : 
                         invoice.fa_typ === 'ZALOHOVA' ? 'ZÁLOHOVÁ' : 
                         invoice.fa_typ === 'OPRAVNA' ? 'OPRAVNÁ' : 
                         invoice.fa_typ === 'PROFORMA' ? 'PROFORMA' : 
                         invoice.fa_typ === 'DOBROPIS' ? 'DOBROPIS' : 
                         invoice.fa_typ || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <strong>{invoice.cislo_faktury}</strong>
                    </TableCell>
                    <TableCell>
                      <FontAwesomeIcon icon={faFileInvoice} style={{ marginRight: '0.5rem', color: '#94a3b8' }} />
                      {invoice.cislo_objednavky || invoice.objednavka_id}
                    </TableCell>
                    <TableCell className="right">
                      <strong>{formatCurrency(invoice.castka)}</strong>
                    </TableCell>
                    <TableCell className="center">{invoice.datum_splatnosti ? formatDateOnly(invoice.datum_splatnosti) : '—'}</TableCell>
                    <TableCell className="center">
                      <StatusBadge $status={invoice.status}>
                        <FontAwesomeIcon icon={getStatusIcon(invoice.status)} />
                        {getStatusLabel(invoice.status)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {invoice.vytvoril_uzivatel ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FontAwesomeIcon icon={faUser} style={{ color: '#64748b', fontSize: '0.75rem' }} />
                          {invoice.vytvoril_uzivatel}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell className="center">
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: invoice.pocet_priloh > 0 ? '#64748b' : '#cbd5e1' }}>
                        <FontAwesomeIcon icon={faPaperclip} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{invoice.pocet_priloh || 0}</span>
                      </span>
                    </TableCell>
                    <TableCell className="center">
                      <ActionMenu>
                        <TooltipWrapper text="Zobrazit detail" preferredPosition="left">
                          <ActionMenuButton 
                            className="view"
                            onClick={() => handleViewInvoice(invoice)}
                            title="Zobrazit detail"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </ActionMenuButton>
                        </TooltipWrapper>
                        <TooltipWrapper text="Editovat" preferredPosition="left">
                          <ActionMenuButton 
                            className="edit"
                            onClick={() => handleEditInvoice(invoice)}
                            title="Editovat"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </ActionMenuButton>
                        </TooltipWrapper>
                        <TooltipWrapper text="Smazat" preferredPosition="left">
                          <ActionMenuButton 
                            className="delete"
                            onClick={() => handleDeleteInvoice(invoice)}
                            title="Smazat"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </ActionMenuButton>
                        </TooltipWrapper>
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
          </TableWrapper>
      </Container>
    </>
  );
};

export default Invoices25List;
