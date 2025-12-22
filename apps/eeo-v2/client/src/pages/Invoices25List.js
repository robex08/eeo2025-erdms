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
  faCalendarAlt, faUser, faBuilding, faMoneyBillWave, faPaperclip, 
  faFileAlt, faCheckCircle, faExclamationTriangle, faHourglassHalf,
  faDatabase, faCheck, faTimesCircle, faDashboard, faMoneyBill, faIdCard, faFileContract,
  faLock, faEnvelope, faPhone, faClock
} from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';
import { prettyDate, formatDateOnly } from '../utils/format';
import { translateErrorMessage } from '../utils/errorTranslation';
import { TooltipWrapper } from '../styles/GlobalTooltip';
import DatePicker from '../components/DatePicker';
import ConfirmDialog from '../components/ConfirmDialog';
import SlideInDetailPanel from '../components/UniversalSearch/SlideInDetailPanel';
import { listInvoices25, listInvoiceAttachments25, deleteInvoiceV2, updateInvoiceV2 } from '../services/api25invoices';

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
    withoutOrder: 0,    // Faktury bez přiřazení (bez obj. ANI smlouvy)
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
  
  // Kontrola oprávnění
  const canViewAllInvoices = React.useMemo(() => {
    return hasPermission && (hasPermission('INVOICE_MANAGE') || hasPermission('ORDER_MANAGE'));
  }, [hasPermission]);
  
  const canManageInvoices = React.useMemo(() => {
    return hasPermission && hasPermission('INVOICE_MANAGE');
  }, [hasPermission]);
  
  const isAdmin = React.useMemo(() => {
    return hasPermission && hasPermission('ADMIN');
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
  
  // 🔒 State pro LOCK dialog system
  const [showLockedOrderDialog, setShowLockedOrderDialog] = useState(false);
  const [lockedOrderInfo, setLockedOrderInfo] = useState(null);
  const [isCheckingLock, setIsCheckingLock] = useState(false); // Prevent multiple clicks
  
  // State pro slide panel (náhled faktury)
  const [slidePanelOpen, setSlidePanelOpen] = useState(false);
  const [slidePanelInvoice, setSlidePanelInvoice] = useState(null);
  const [slidePanelLoading, setSlidePanelLoading] = useState(false);
  const [slidePanelAttachments, setSlidePanelAttachments] = useState([]);
  
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

  // Handler: Přidat fakturu k objednávce/smlouvě kliknutím na číslo
  // 🔒 Handler pro zavření LOCK dialogu
  const handleLockedOrderCancel = () => {
    setShowLockedOrderDialog(false);
    setLockedOrderInfo(null);
    setIsCheckingLock(false); // Odemknout pro další pokus
  };
  
  const handleAddInvoiceToEntity = async (invoice) => {
    // ⚠️ Zabránit vícenásobnému kliknutí
    if (isCheckingLock) {
      console.log('⚠️ Už probíhá kontrola LOCK, ignoruji další klik');
      return;
    }
    
    if (invoice.objednavka_id) {
      setIsCheckingLock(true); // Zamknout funkci
      
      // 🔒 KONTROLA LOCK před přidáním faktury k objednávce
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
        
        console.log('🔒 Zobrazuji LOCK dialog s chybou');
        setLockedOrderInfo(lockInfo);
        setShowLockedOrderDialog(true);
        setIsCheckingLock(false); // Odemknout
        return; // ⚠️ VŽDY ukonči - NIKDY nenaviguj při chybě
      }
      
      // ✅ Není zamčená - přidat fakturu k objednávce
      setIsCheckingLock(false); // Odemknout
      navigate('/invoice-evidence', {
        state: {
          orderIdForLoad: invoice.objednavka_id
        }
      });
    } else if (invoice.smlouva_id) {
      // Přidat fakturu ke smlouvě
      navigate('/invoice-evidence', {
        state: {
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
  
  // 🧹 Vyčistit všechny filtry (sloupcové + dashboard + fulltext)
  const handleClearAllFilters = useCallback(() => {
    setColumnFilters({});
    setFilters({ filter_status: '' });
    setActiveFilterStatus(null);
    setGlobalSearchTerm('');
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
      
      // Datum doručení (přesná shoda)
      if (columnFilters.datum_doruceni) {
        apiParams.filter_datum_doruceni = columnFilters.datum_doruceni;
      }
      
      // Datum aktualizace (přesná shoda)
      if (columnFilters.dt_aktualizace) {
        apiParams.filter_dt_aktualizace = columnFilters.dt_aktualizace;
      }
      
      // Typ faktury (přesná shoda)
      if (columnFilters.fa_typ) {
        apiParams.filter_fa_typ = columnFilters.fa_typ;
      }
      
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
      }
      if (columnFilters.castka_max) {
        apiParams.castka_max = parseFloat(columnFilters.castka_max);
      }
      
      // Přílohy - filtr podle existence příloh
      if (columnFilters.ma_prilohy === 'with') {
        apiParams.filter_ma_prilohy = 1; // Pouze s přílohami
      } else if (columnFilters.ma_prilohy === 'without') {
        apiParams.filter_ma_prilohy = 0; // Pouze bez příloh
      }
      
      // Věcná kontrola - filtr
      if (columnFilters.vecna_kontrola === 'yes') {
        apiParams.filter_vecna_kontrola = 1; // Pouze provedena
      } else if (columnFilters.vecna_kontrola === 'no') {
        apiParams.filter_vecna_kontrola = 0; // Pouze neprovedena
      }
      
      // Věcnou provedl - text filtr
      if (columnFilters.vecnou_provedl) {
        apiParams.filter_vecnou_provedl = columnFilters.vecnou_provedl.trim();
      }
      
      // Předáno zaměstnanci - text filtr
      if (columnFilters.predano_zamestnanec) {
        apiParams.filter_predano_zamestnanec = columnFilters.predano_zamestnanec.trim();
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
          totalAmount: parseFloat(response.statistiky.celkem_castka) || 0,
          paidAmount: parseFloat(response.statistiky.celkem_zaplaceno) || 0,
          unpaidAmount: parseFloat(response.statistiky.celkem_nezaplaceno) || 0,
          overdueAmount: parseFloat(response.statistiky.celkem_po_splatnosti) || 0,
          myInvoices: response.statistiky.pocet_moje_faktury || 0,
          // ✅ Nové statistiky z BE
          withOrder: response.statistiky.pocet_s_objednavkou || 0,
          withContract: response.statistiky.pocet_s_smlouvou || 0,
          withoutOrder: response.statistiky.pocet_bez_prirazeni || 0,
          fromSpisovka: response.statistiky.pocet_ze_spisovky || 0
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
    console.log('🔍 [Invoices25List] Opening slide panel for invoice:', invoice);
    console.log('🔍 [Invoices25List] ALL invoice keys:', Object.keys(invoice));
    console.log('🔍 [Invoices25List] Keys containing "vecn":', Object.keys(invoice).filter(k => k.toLowerCase().includes('vecn')));
    console.log('🔍 [Invoices25List] Keys containing "potvrd":', Object.keys(invoice).filter(k => k.toLowerCase().includes('potvrd')));
    console.log('🔍 [Invoices25List] Věcná správnost data:', {
      potvrdil_vecnou_spravnost_jmeno: invoice.potvrdil_vecnou_spravnost_jmeno,
      vecna_spravnost_potvrzeno: invoice.vecna_spravnost_potvrzeno,
      dt_potvrzeni_vecne_spravnosti: invoice.dt_potvrzeni_vecne_spravnosti,
      vecna_spravnost_poznamka: invoice.vecna_spravnost_poznamka,
      vecna_spravnost_umisteni_majetku: invoice.vecna_spravnost_umisteni_majetku,
      potvrdil_vecnou_spravnost_id: invoice.potvrdil_vecnou_spravnost_id
    });
    
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
    console.log('✅ LOCK Invoices25List: Obj ' + (invoice.objednavka_id ? '#' + invoice.objednavka_id : 'bez obj') + ' OK - otevírám FA');
    navigate('/invoice-evidence', { 
      state: { 
        editInvoiceId: invoice.id,
        orderIdForLoad: invoice.objednavka_id || null
      } 
    });
  };

  const handleDeleteInvoice = (invoice) => {
    // Otevře dialog a resetuje typ mazání na 'soft'
    setDeleteType('soft');
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
        // ⚠️ DŮLEŽITÉ: Chyba při kontrole LOCK - zobraz dialog
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

  // Handle payment status toggle (open dialog only for unpaid change)
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
      
      await updateInvoiceV2({
        token,
        username,
        invoice_id: invoice.id,
        updateData: {
          fa_zaplacena: newStatus ? 1 : 0,
          fa_datum_uhrazeni: newStatus ? new Date().toISOString().split('T')[0] : null
        }
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
          {canManageInvoices && (
            <ActionButton $primary onClick={handleNavigateToEvidence}>
              <FontAwesomeIcon icon={faPlus} />
              Zaevidovat fakturu
            </ActionButton>
          )}
          
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
            <ClearAllButton onClick={handleClearAllFilters}>
              <FontAwesomeIcon icon={faEraser} />
              Vymazat vše
            </ClearAllButton>
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
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Objednávka/Smlouva
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
                    style={{ textAlign: 'right' }}
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
                    Předáno zaměstnanci
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
                {/* Druhý řádek s filtry ve sloupcích */}
                <tr>
                  {/* Aktualizováno - datum filtr - PRVNÍ SLOUPEC */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_dt_aktualizace"
                        value={columnFilters.dt_aktualizace || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, dt_aktualizace: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>
                  {/* Faktura VS - text filtr */}
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
                        placeholder="Obj/Sml..."
                        value={columnFilters.cislo_objednavky || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, cislo_objednavky: e.target.value})}
                        title="Hledá v číslech objednávek i smluv"
                      />
                      {columnFilters.cislo_objednavky && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, cislo_objednavky: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  {/* Doručení - datum filtr */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_doruceni"
                        value={columnFilters.datum_doruceni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_doruceni: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>
                  {/* Vystavení - datum filtr (přesunuto sem) */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_vystaveni"
                        value={columnFilters.datum_vystaveni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_vystaveni: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>
                  {/* Splatnost - datum filtr (přesunuto před částku) */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_splatnosti"
                        value={columnFilters.datum_splatnosti || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_splatnosti: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
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
                  {/* Předáno zaměstnanci - text filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)', minWidth: '120px' }}>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faUser} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Celé jméno..."
                        value={columnFilters.predano_zamestnanec || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, predano_zamestnanec: e.target.value})}
                      />
                      {columnFilters.predano_zamestnanec && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, predano_zamestnanec: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  {/* Věcnou provedl - text filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faUser} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Celé jméno..."
                        value={columnFilters.vecnou_provedl || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, vecnou_provedl: e.target.value})}
                      />
                      {columnFilters.vecnou_provedl && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, vecnou_provedl: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  {/* Věcná kontrola - select filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <select
                      value={columnFilters.vecna_kontrola || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, vecna_kontrola: e.target.value})}
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
                      <option value="yes">Provedena</option>
                      <option value="no">Neprovedena</option>
                    </select>
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
                    <td colSpan="14" style={{ padding: '3rem', textAlign: 'center' }}>
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
                    <td colSpan="14" style={{ padding: '3rem', textAlign: 'center' }}>
                      <EmptyStateIcon>
                        <FontAwesomeIcon icon={faFileInvoice} />
                      </EmptyStateIcon>
                      <EmptyStateText>Zatím nebyly nalezeny žádné faktury pro rok {selectedYear}</EmptyStateText>
                    </td>
                  </tr>
                )}
                
                {/* Data rows */}
                {!error && sortedInvoices.map(invoice => (
                  <TableRow 
                    key={invoice.id}
                    style={{
                      backgroundColor: invoice.from_spisovka ? '#f0fdf4' : 'transparent'
                    }}
                  >
                    <TableCell className="center">
                      {invoice.dt_aktualizace ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span>{formatDateOnly(invoice.dt_aktualizace)}</span>
                          <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                            {new Date(invoice.dt_aktualizace).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="center">
                      <strong>{invoice.cislo_faktury}</strong>
                    </TableCell>
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
                    <TableCell style={{ whiteSpace: 'nowrap' }}>
                      {invoice.cislo_smlouvy ? (
                        <div 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.25rem',
                            cursor: 'pointer',
                            color: '#3b82f6'
                          }}
                          onClick={() => handleAddInvoiceToEntity(invoice)}
                          title="Klikněte pro přidání další faktury k této smlouvě"
                        >
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <FontAwesomeIcon icon={faFileContract} style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                            {invoice.cislo_smlouvy}
                          </div>
                        </div>
                      ) : invoice.cislo_objednavky ? (
                        <div
                          style={{
                            cursor: 'pointer',
                            color: '#3b82f6',
                            transition: 'opacity 0.2s'
                          }}
                          onClick={() => handleAddInvoiceToEntity(invoice)}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          title="Klikněte pro přidání další faktury k této objednávce"
                        >
                          <FontAwesomeIcon icon={faFileInvoice} style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                          {invoice.cislo_objednavky}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Nepřiřazena</span>
                      )}
                    </TableCell>
                    <TableCell className="center" style={{ whiteSpace: 'nowrap' }}>
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
                    <TableCell className="center">{invoice.datum_splatnosti ? formatDateOnly(invoice.datum_splatnosti) : '—'}</TableCell>
                    <TableCell className="right">
                      <strong>{formatCurrency(invoice.castka)}</strong>
                    </TableCell>
                    <TableCell className="center">
                      <StatusBadge $status={invoice.status}>
                        <FontAwesomeIcon icon={getStatusIcon(invoice.status)} />
                        {getStatusLabel(invoice.status)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {invoice.vytvoril_uzivatel_zkracene ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FontAwesomeIcon icon={faUser} style={{ color: '#64748b', fontSize: '0.75rem' }} />
                          {invoice.vytvoril_uzivatel_zkracene}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {invoice.potvrdil_vecnou_spravnost_zkracene ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FontAwesomeIcon icon={faUser} style={{ color: '#64748b', fontSize: '0.7rem' }} />
                            <strong>{invoice.potvrdil_vecnou_spravnost_zkracene}</strong>
                          </div>
                          {invoice.dt_potvrzeni_vecne_spravnosti && (
                            <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: '0.7rem' }} />
                              <span title="Datum potvrzení věcné správnosti" style={{ whiteSpace: 'nowrap' }}>
                                {formatDateOnly(invoice.dt_potvrzeni_vecne_spravnosti)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell className="center">
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
                    </TableCell>
                    <TableCell className="center">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: invoice.pocet_priloh > 0 ? '#64748b' : '#cbd5e1' }} title="Počet příloh">
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
                        {/* Ikona "Zaplaceno" - jen pro INVOICE_MANAGE nebo ADMIN */}
                        {(canManageInvoices || isAdmin) && (
                          <TooltipWrapper text={invoice.zaplacena ? "Označit jako nezaplacenou" : "Označit jako zaplacenou"} preferredPosition="left">
                            <ActionMenuButton
                              className={invoice.zaplacena ? "paid" : "unpaid"}
                              onClick={() => handleTogglePaymentStatus(invoice)}
                              title={invoice.zaplacena ? "Označit jako nezaplacenou" : "Označit jako zaplacenou"}
                              style={{
                                color: invoice.zaplacena ? '#16a34a' : '#dc2626',
                                background: 'transparent'
                              }}
                            >
                              <FontAwesomeIcon icon={invoice.zaplacena ? faCheckCircle : faMoneyBillWave} />
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
      
      {/* Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <ConfirmDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => {
            setDeleteDialog({ isOpen: false, invoice: null });
            setDeleteType('soft');
          }}
          onConfirm={() => confirmDeleteInvoice(deleteType === 'hard')}
          title="Odstranit fakturu"
          icon={faTrash}
          variant={deleteType === 'hard' ? 'danger' : 'warning'}
          confirmText={isAdmin ? (deleteType === 'hard' ? "⚠️ Smazat úplně" : "Smazat") : "Smazat"}
          cancelText="Zrušit"
          key={deleteType}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            padding: '1rem 0'
          }}>
            {/* LEVÝ SLOUPEC - Volba typu smazání */}
            <div>
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
                          cursor: 'pointer',
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
                          style={{ marginTop: '0.25rem', accentColor: '#3b82f6', cursor: 'pointer', pointerEvents: 'none' }}
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
                          cursor: 'pointer',
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
                          style={{ marginTop: '0.25rem', accentColor: '#dc2626', cursor: 'pointer', pointerEvents: 'none' }}
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
                  <InfoRowFullWidth>
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
                      </InfoValue>
                    </InfoContent>
                  </InfoRowFullWidth>

                  <InfoRow>
                    <InfoIcon>
                      <FontAwesomeIcon icon={faCheckCircle} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Stav platby</InfoLabel>
                      <InfoValue>
                        <StatusBadge $status={getInvoiceStatus(slidePanelInvoice)}>
                          <FontAwesomeIcon icon={getStatusIcon(getInvoiceStatus(slidePanelInvoice))} />
                          {' '}
                          {getStatusLabel(getInvoiceStatus(slidePanelInvoice))}
                        </StatusBadge>
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
                            {slidePanelInvoice.fa_typ}
                          </Badge>
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

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
                                setSlidePanelOpen(false);
                                navigate('/orders25', { 
                                  state: { 
                                    editOrderId: slidePanelInvoice.objednavka_id,
                                    returnTo: '/invoices25'
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

              {/* Data */}
              <DetailSection>
                <SectionTitle>
                  <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '0.5rem' }} />
                  Důležitá data
                </SectionTitle>
                <InfoGrid>
                  {slidePanelInvoice.fa_datum_vystaveni && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#dbeafe', color: '#3b82f6' }}>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum vystavení</InfoLabel>
                        <InfoValue style={{ fontWeight: '600' }}>
                          {new Date(slidePanelInvoice.fa_datum_vystaveni).toLocaleDateString('cs-CZ', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_datum_zdanitelneho_plneni && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum zdanitelného plnění</InfoLabel>
                        <InfoValue>
                          {new Date(slidePanelInvoice.fa_datum_zdanitelneho_plneni).toLocaleDateString('cs-CZ', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}
                  
                  {slidePanelInvoice.fa_datum_splatnosti && (
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
                          {new Date(slidePanelInvoice.fa_datum_splatnosti).toLocaleDateString('cs-CZ', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                          {getInvoiceStatus(slidePanelInvoice) === 'overdue' && (
                            <Badge $color="#fee2e2" $textColor="#991b1b" style={{ marginLeft: '0.5rem' }}>
                              ⚠️ Po splatnosti
                            </Badge>
                          )}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_datum_prijeti && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum přijetí</InfoLabel>
                        <InfoValue>
                          {new Date(slidePanelInvoice.fa_datum_prijeti).toLocaleDateString('cs-CZ', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_datum_doruceni && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum doručení</InfoLabel>
                        <InfoValue>
                          {new Date(slidePanelInvoice.fa_datum_doruceni).toLocaleDateString('cs-CZ', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_datum_uhrazeni && (
                    <InfoRow>
                      <InfoIcon style={{ background: '#d1fae5', color: '#10b981' }}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum uhrazení</InfoLabel>
                        <InfoValue style={{ fontWeight: '700', color: '#10b981' }}>
                          {new Date(slidePanelInvoice.fa_datum_uhrazeni).toLocaleDateString('cs-CZ', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                          {' ✅'}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_datum_platby && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum platby</InfoLabel>
                        <InfoValue>
                          {new Date(slidePanelInvoice.fa_datum_platby).toLocaleDateString('cs-CZ', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </InfoValue>
                      </InfoContent>
                    </InfoRow>
                  )}

                  {slidePanelInvoice.fa_datum_zuctovani && (
                    <InfoRow>
                      <InfoIcon>
                        <FontAwesomeIcon icon={faCalendarAlt} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datum zúčtování</InfoLabel>
                        <InfoValue>
                          {new Date(slidePanelInvoice.fa_datum_zuctovani).toLocaleDateString('cs-CZ', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
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
                      const fileName = attachment.nazev_souboru || attachment.file_name || 'Neznámý soubor';
                      const fileSize = attachment.velikost_souboru || attachment.file_size;
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
                          onClick={() => {
                            if (attachment.url || attachment.file_path) {
                              window.open(attachment.url || attachment.file_path, '_blank');
                            }
                          }}
                          title="Klikněte pro stažení"
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
                  >
                    Objednávka/Smlouva
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
                    Předáno zaměstnanci
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
                {/* Druhý řádek s filtry ve sloupcích */}
                <tr>
                  {/* Aktualizováno - datum filtr - PRVNÍ SLOUPEC */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_dt_aktualizace"
                        value={columnFilters.dt_aktualizace || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, dt_aktualizace: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>
                  {/* Faktura VS - text filtr */}
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
                        placeholder="Obj/Sml..."
                        value={columnFilters.cislo_objednavky || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, cislo_objednavky: e.target.value})}
                        title="Hledá v číslech objednávek i smluv"
                      />
                      {columnFilters.cislo_objednavky && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, cislo_objednavky: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  {/* Doručení - datum filtr */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_doruceni"
                        value={columnFilters.datum_doruceni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_doruceni: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>
                  {/* Vystavení - datum filtr (přesunuto sem) */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_vystaveni"
                        value={columnFilters.datum_vystaveni || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_vystaveni: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  </TableHeader>
                  {/* Splatnost - datum filtr (přesunuto před částku) */}
                  <TableHeader className="date-column" style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="filter_datum_splatnosti"
                        value={columnFilters.datum_splatnosti || ''}
                        onChange={(value) => setColumnFilters({...columnFilters, datum_splatnosti: value})}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
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
                  {/* Předáno zaměstnanci - text filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)', minWidth: '120px' }}>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faUser} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Celé jméno..."
                        value={columnFilters.predano_zamestnanec || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, predano_zamestnanec: e.target.value})}
                      />
                      {columnFilters.predano_zamestnanec && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, predano_zamestnanec: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  {/* Věcnou provedl - text filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faUser} />
                      <ColumnFilterInput
                        type="text"
                        placeholder="Celé jméno..."
                        value={columnFilters.vecnou_provedl || ''}
                        onChange={(e) => setColumnFilters({...columnFilters, vecnou_provedl: e.target.value})}
                      />
                      {columnFilters.vecnou_provedl && (
                        <ColumnClearButton onClick={() => setColumnFilters({...columnFilters, vecnou_provedl: ''})}>
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  </TableHeader>
                  {/* Věcná kontrola - select filtr */}
                  <TableHeader style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <select
                      value={columnFilters.vecna_kontrola || ''}
                      onChange={(e) => setColumnFilters({...columnFilters, vecna_kontrola: e.target.value})}
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
                      <option value="yes">Provedena</option>
                      <option value="no">Neprovedena</option>
                    </select>
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
            </table>
          </FloatingTableWrapper>
        </FloatingHeaderPanel>,
        document.body
      )}
    </>
  );
};

export default Invoices25List;
