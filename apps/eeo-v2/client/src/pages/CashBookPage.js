import React, { useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalculator,
  faPlus,
  faTrash,
  faEdit,
  faPrint,
  faFileExport,
  faCheck,
  faInfoCircle,
  faChevronLeft,
  faChevronRight,
  faCalendarDay,
  faLock,
  faLockOpen,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from '../components/DatePicker';
import ConfirmDialog from '../components/ConfirmDialog';
import EditableCombobox from '../components/EditableCombobox';
import ModernHelper from '../components/ModernHelper';
import { fetchLimitovanePrisliby } from '../services/api2auth';
import { pdf } from '@react-pdf/renderer';
import PokladniKnihaPDF from '../components/PokladniKnihaPDF';
import { Global, css } from '@emotion/react';
import cashbookAPI from '../services/cashbookService';
import BookStatusBadge from '../components/cashbook/BookStatusBadge';
import CashboxSelector from '../components/CashboxSelector';
import { getCashbookPermissionsObject } from '../utils/cashbookPermissions';

// =============================================================================
// PRINT STYLES - Pro čistý tisk pouze tabulky
// =============================================================================

const printStyles = css`
  @media print {
    /* Skrýt vše kromě tabulky při tisku */
    body * {
      visibility: hidden;
    }

    /* Zobrazit pouze obsah pokladní knihy */
    .cashbook-print-area,
    .cashbook-print-area * {
      visibility: visible;
    }

    /* Odstranit padding/margin z body */
    body {
      margin: 0;
      padding: 0;
      background: white;
    }

    /* Tabulka na celou šířku */
    .cashbook-print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 2rem;
    }

    /* Zobrazit hlavičku jen při tisku */
    .print-header {
      display: block !important;
    }

    /* Skrýt akční tlačítka, navigaci atd. */
    button,
    .no-print {
      display: none !important;
    }

    /* Optimalizace tabulky pro tisk */
    table {
      page-break-inside: auto;
      border-collapse: collapse;
      width: 100%;
      font-size: 0.8rem;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    thead {
      display: table-header-group;
    }

    tfoot {
      display: table-footer-group;
    }

    /* Menší padding pro tisk */
    td, th {
      padding: 0.25rem 0.5rem !important;
    }
  }
`;

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const highlightPulse = keyframes`
  0%, 100% {
    background-color: #fff;
  }
  50% {
    background-color: #dbeafe;
  }
`;

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  animation: ${fadeIn} 0.6s ease-out;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(30, 64, 175, 0.3);
  margin-bottom: 2rem;
  animation: ${slideIn} 0.8s ease-out;

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
    margin: 0;
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    h1 {
      font-size: 2rem;
    }
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  animation: ${slideIn} 0.6s ease-out 0.2s both;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid ${props => {
    switch (props.variant) {
      case 'primary': return '#10b981';
      case 'danger': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  }};
  border-radius: 8px;
  background: ${props => {
    if (props.$filled) {
      switch (props.variant) {
        case 'primary': return '#10b981';
        case 'danger': return '#ef4444';
        case 'warning': return '#f59e0b';
        default: return '#3b82f6';
      }
    }
    return 'white';
  }};
  color: ${props => {
    if (props.$filled) return 'white';
    switch (props.variant) {
      case 'primary': return '#10b981';
      case 'danger': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  }};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => {
      if (props.$filled) {
        switch (props.variant) {
          case 'primary': return '#059669';
          case 'danger': return '#dc2626';
          case 'warning': return '#d97706';
          default: return '#2563eb';
        }
      }
      switch (props.variant) {
        case 'primary': return '#d1fae5';
        case 'danger': return '#fee2e2';
        case 'warning': return '#fef3c7';
        default: return '#eff6ff';
      }
    }};
    border-color: ${props => {
      switch (props.variant) {
        case 'primary': return '#059669';
        case 'danger': return '#dc2626';
        case 'warning': return '#d97706';
        default: return '#2563eb';
      }
    }};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${props => {
      switch (props.variant) {
        case 'primary': return 'rgba(16, 185, 129, 0.25)';
        case 'danger': return 'rgba(239, 68, 68, 0.25)';
        case 'warning': return 'rgba(245, 158, 11, 0.25)';
        default: return 'rgba(59, 130, 246, 0.25)';
      }
    }};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const MonthNavigation = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  color: white;
  animation: ${slideIn} 0.6s ease-out 0.2s both;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
`;

const MonthInfo = styled.div`
  flex: 1;

  h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .carry-over {
    font-size: 0.95rem;
    opacity: 0.95;
    margin: 0.25rem 0 0 0;

    .amount {
      font-weight: 600;
      font-size: 1.1rem;
      margin-left: 0.5rem;
    }
  }
`;

const MonthControls = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const MonthButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const LockedBookWarning = styled.div`
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 2px solid #dc2626;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
  animation: ${slideIn} 0.4s ease-out;

  .warning-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;

    .icon {
      font-size: 2.5rem;
      color: #dc2626;
      animation: pulse 2s ease-in-out infinite;
    }

    h3 {
      color: #991b1b;
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
    }
  }

  .warning-content {
    color: #7f1d1d;
    line-height: 1.6;

    p {
      margin: 0.75rem 0;
    }

    strong {
      color: #991b1b;
      font-weight: 600;
    }

    .contact-info {
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 8px;
      border-left: 4px solid #dc2626;
    }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
`;

const PreviousMonthWarning = styled.div`
  background: linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%);
  border: 2px solid #ffc107;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 3px 10px rgba(255, 193, 7, 0.2);
  animation: ${slideIn} 0.4s ease-out;

  display: flex;
  align-items: flex-start;
  gap: 1rem;

  @media print {
    display: none;
  }
`;

const WarningIcon = styled.div`
  font-size: 1.5rem;
  color: #ff9800;
  line-height: 1;
  margin-top: 0.25rem;
  flex-shrink: 0;
`;

const WarningContent = styled.div`
  flex: 1;

  h4 {
    margin: 0 0 0.5rem 0;
    color: #f57c00;
    font-size: 1rem;
    font-weight: 600;
  }

  p {
    margin: 0.25rem 0;
    color: #5d4037;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  strong {
    color: #e65100;
  }

  .tip {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #666;
  }
`;

const InfoPanel = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #3b82f6;
  animation: ${slideIn} 0.6s ease-out 0.3s both;

  .organization-info {
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;

    .info-text {
      flex: 1;
      min-width: 300px;

      h3 {
        color: #1f2937;
        margin: 0 0 0.5rem 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      p {
        color: #6b7280;
        margin: 0;
        font-size: 0.95rem;
      }
    }

    .info-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .summary-item {
    text-align: center;

    .label {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }

    .value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
    }

    &.positive .value {
      color: #059669;
    }

    &.negative .value {
      color: #dc2626;
    }
  }
`;

// 🆕 Sticky kompaktní přehled při scrollování
const StickyCompactSummary = styled.div`
  position: fixed;
  top: var(--app-fixed-offset-actual, 130px);
  left: 0;
  right: 0;
  z-index: 40;
  background: white;
  border-bottom: 2px solid #3b82f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0.75rem 2rem;

  /* Plynulý přechod */
  opacity: ${props => props.$visible ? '1' : '0'};
  transform: translateY(${props => props.$visible ? '0' : '-100%'});
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
  }

  @media print {
    display: none !important;
  }

  .compact-title {
    font-weight: 600;
    color: #1f2937;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .compact-values {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .compact-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .compact-label {
      font-size: 0.75rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .compact-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin-top: 0.1rem;

      &.positive {
        color: #059669;
      }

      &.negative {
        color: #dc2626;
      }
    }
  }

  @media print {
    display: none !important;
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  overflow-y: visible;
  animation: ${fadeIn} 0.8s ease-out 0.4s both;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background: #f8fafc;
    color: #374151;
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: sticky;
    top: 0;
    z-index: 10;
    line-height: 1.3;
    vertical-align: middle;
  }

  td {
    color: #1f2937;
  }

  tbody tr:hover {
    background: #f9fafb;
  }

  .row-number {
    width: 60px;
    text-align: center;
    font-weight: 600;
    color: #6b7280;
  }

  .date-cell {
    width: 130px; /* Zúženo z 220px - datum se nesmí zalamovat */
    min-width: 130px;
    padding: 0.5rem;
    position: relative;
    overflow: visible;
    white-space: nowrap; /* Zabránění zalamování datumu */

    /* DatePicker má vlastní padding, resetujeme padding buňky když je uvnitř */
    > div {
      margin: -0.25rem;
      position: relative;
      z-index: 100;
    }
  }

  .document-cell {
    width: 120px;
    font-family: monospace;
    font-weight: 500;
    text-align: left;
  }

  .description-cell {
    width: 360px; /* 60% poměr - Obsah */
    text-align: left;
  }

  .person-cell {
    width: 150px; /* Vráceno na původní šířku */
    text-align: center;

    /* V td zarovnat vlevo */
    td& {
      text-align: left;
    }
  }

  .amount-cell {
    width: 120px;
    text-align: center;
    font-family: monospace;
    font-weight: 500;

    /* V td zarovnat vpravo */
    td& {
      text-align: right;
    }
  }

  .balance-cell {
    width: 120px;
    text-align: center;
    font-family: monospace;
    font-weight: 600;

    /* V td zarovnat vpravo a zvýraznit */
    td& {
      text-align: right;
      background: #f0f9f4;
    }
  }

  .lp-code-cell {
    width: 180px; /* Rozšířeno ze 100px - kvůli popisu LP kódu */
    min-width: 180px;
    font-family: monospace;
    font-size: 0.875rem;
    text-align: left;
  }

  .note-cell {
    width: 240px; /* 40% poměr - Poznámka */
    font-size: 0.875rem;
    color: #6b7280;
    text-align: left;
  }

  .actions-cell {
    width: 80px;
    text-align: center;
  }

  .income {
    color: #059669;
  }

  .expense {
    color: #dc2626;
  }
`;

// Wrapper pro cenový input s Kč symbolem
const CurrencyInputWrapper = styled.div`
  position: relative;
  width: 100%;

  /* Kč symbol vpravo */
  &::after {
    content: 'Kč';
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
    pointer-events: none;
  }
`;

const EditableInput = styled.input`
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &.date-input {
    font-family: monospace;
  }

  &.amount-input {
    text-align: right;
    font-family: monospace;
    padding-right: 2.5rem; /* místo pro Kč symbol */

    /* Odstranění spinner šipek - WebKit */
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    /* Odstranění spinner šipek - Firefox */
    &[type=number] {
      -moz-appearance: textfield;
    }
  }

  &.readonly {
    background: #f3f4f6;
    border-color: #e5e7eb;
    cursor: not-allowed;
  }
`;

const EditableSelect = styled.select`
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ActionIcon = styled.button`
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    color: ${props => props.danger ? '#dc2626' : '#374151'};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const AddRowButton = styled.button`
  width: 100%;
  padding: 1rem;
  border: 2px dashed #d1d5db;
  background: #f9fafb;
  color: #6b7280;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
  }

  &:active {
    transform: scale(0.99);
  }
`;

// =============================================================================
// COMPONENT
// =============================================================================

const CashBookPage = () => {
  const { user, token, hasPermission, userDetail } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  // 🆕 Načíst poslední výběr období z localStorage (hlavně pro adminy)
  const loadSavedPeriod = () => {
    try {
      const saved = localStorage.getItem('cashbook_selector_period');
      if (saved) {
        const { year, month } = JSON.parse(saved);
        return { year, month };
      }
    } catch (err) {
      // Tichá chyba
    }
    return { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  };

  const savedPeriod = loadSavedPeriod();

  // Aktuální měsíc a rok pro paging
  const [currentMonth, setCurrentMonth] = useState(savedPeriod.month); // 1-12
  const [currentYear, setCurrentYear] = useState(savedPeriod.year);
  const [carryOverAmount, setCarryOverAmount] = useState(0); // Převod z předchozího měsíce

  // 🆕 State pro sticky kompaktní přehled
  const [showStickySummary, setShowStickySummary] = useState(false);



  // State pro ConfirmDialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [closeMonthDialogOpen, setCloseMonthDialogOpen] = useState(false);
  const [lockBookDialogOpen, setLockBookDialogOpen] = useState(false);
  const [reopenMonthDialogOpen, setReopenMonthDialogOpen] = useState(false);
  const [unlockBookDialogOpen, setUnlockBookDialogOpen] = useState(false);
  const [retroactiveCreationBlockedDialogOpen, setRetroactiveCreationBlockedDialogOpen] = useState(false);

  // Stav pokladní knihy - VŠECHNY HOOKS MUSÍ BÝT NA ZAČÁTKU
  // ✅ FIX: Prázdné pole - data se načtou z DB nebo localStorage v useEffect
  const [cashBookEntries, setCashBookEntries] = useState([]);

  // 🆕 REF: Pro přístup k aktuálnímu stavu v intervalech (bez restart intervalu)
  const cashBookEntriesRef = useRef(cashBookEntries);
  useEffect(() => {
    cashBookEntriesRef.current = cashBookEntries;
  }, [cashBookEntries]);

  const [lastSavedEntryId, setLastSavedEntryId] = useState(null);

  // LP kódy načtené z API
  const [lpCodes, setLpCodes] = useState([]);
  const [lpLoading, setLpLoading] = useState(true);
  
  // 🆕 MULTI-LP: Inline rozbalovací panel pro editaci podřádků
  const [expandedDetailEntryId, setExpandedDetailEntryId] = useState(null);
  const [detailEditBuffer, setDetailEditBuffer] = useState([]);

  // 🆕 CASHBOOK V2: Přiřazení pokladny
  const [mainAssignment, setMainAssignment] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);

  // 🆕 CASHBOOK V3: Všechny pokladny (pro uživatele s _ALL oprávněními)
  const [userAssignments, setUserAssignments] = useState([]); // Pokladny uživatele
  const [allAssignments, setAllAssignments] = useState([]);   // Všechny pokladny (admin/MANAGE)

  // 🆕 KROK 3: Stav pokladní knihy a nastavení prefixu
  const [bookStatus, setBookStatus] = useState('aktivni'); // aktivni | uzavrena_uzivatelem | zamknuta_spravcem
  const [bookStatusMetadata, setBookStatusMetadata] = useState(null); // { closedDate, closedBy, lockedDate, lockedBy }
  const [usePrefixedNumbers, setUsePrefixedNumbers] = useState(false); // Z nastavení cashbook_use_prefix
  const [settingsLoading, setSettingsLoading] = useState(true);

  // 🆕 DB SYNC: Tracking aktuální knihy a sync stavu
  const [currentBookId, setCurrentBookId] = useState(null); // ID knihy v DB
  const [currentBookData, setCurrentBookData] = useState(null); // 🆕 Celý objekt knihy z BE (obsahuje lokalita_nazev, usek_nazev atd.)
  const [isSyncing, setIsSyncing] = useState(false); // Probíhá synchronizace
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(null); // Poslední úspěšná sync

  // 🆕 PREVIOUS MONTH WARNING: Varování pokud předchozí měsíc není uzavřený
  const [showPreviousMonthWarning, setShowPreviousMonthWarning] = useState(false);
  const [syncConflicts, setSyncConflicts] = useState([]); // Pole konfliktů ke zobrazení

  // Získat lokalitu podle přihlášeného uživatele
  const getUserLocation = () => {
    // Získání lokality z userDetail - správná cesta je lokalita_nazev.nazev
    const location = userDetail?.lokalita_nazev?.nazev || userDetail?.lokalita?.nazev || userDetail?.location || "Příbram";
    return location;
  };

  // 🔍 DEBUG: Sledovat změny mainAssignment (zakomentováno - způsobovalo spam v konzoli)
  // useEffect(() => {
  //   console.log('🔄 mainAssignment ZMĚNA:', {
  //     id: mainAssignment?.id,
  //     cislo_pokladny: mainAssignment?.cislo_pokladny,
  //     uzivatel_id: mainAssignment?.uzivatel_id,
  //     uzivatel_cele_jmeno: mainAssignment?.uzivatel_cele_jmeno,
  //     nazev_pracoviste: mainAssignment?.nazev_pracoviste,
  //     je_hlavni: mainAssignment?.je_hlavni
  //   });
  // }, [mainAssignment]);

  // Organizační info
  const organizationInfo = {
    organizationName: "Zdravotnická záchranná služba Středočeského kraje, příspěvková organizace",
    workplace: mainAssignment?.nazev_pracoviste || mainAssignment?.kod_pracoviste || getUserLocation(), // 🆕 Z vlastníka pokladny
    cashboxNumber: mainAssignment?.cislo_pokladny || 600, // 🆕 Z přiřazení, fallback 600
    cashboxVpd: mainAssignment?.ciselna_rada_vpd || null, // 🆕 Číselná řada VPD
    cashboxPpd: mainAssignment?.ciselna_rada_ppd || null, // 🆕 Číselná řada PPD
    month: new Date(currentYear, currentMonth - 1).toLocaleDateString('cs-CZ', { month: 'long' }),
    year: currentYear
  };

  // ✅ OPRAVA: LocalStorage klíč musí být v useMemo aby se aktualizoval když přijde userDetail
  // 🆕 OPRAVA 2: Klíč musí zahrnovat i mainAssignment.id, aby admin měl oddělené cache pro každou pokladnu
  const STORAGE_KEY = useMemo(() => {
    const userId = userDetail?.id || 'default';
    const assignmentId = mainAssignment?.id || 'noassignment';
    const key = `cashbook_${userId}_${assignmentId}_${currentYear}_${currentMonth}`;
    return key;
  }, [userDetail?.id, mainAssignment?.id, currentYear, currentMonth]);

  // 🆕 OPRÁVNĚNÍ: Výpočet oprávnění uživatele
  const cashbookPermissions = useMemo(() => {
    return getCashbookPermissionsObject(userDetail);
  }, [userDetail]);

  // 🆕 Může vidět všechny pokladny?
  // UPRAVENO: Selector se zobrazí i běžnému uživateli, pokud má více než 1 pokladnu přiřazenu
  const canSeeAllCashboxes = useMemo(() => {
    // Admin/MANAGE může vidět všechny pokladny v systému
    const hasAllPermissions = cashbookPermissions.canReadAll ||
                              cashbookPermissions.canEditAll ||
                              cashbookPermissions.canDeleteAll ||
                              cashbookPermissions.canManage;

    // Běžný uživatel s více než 1 pokladnou může přepínat mezi svými pokladnami
    const hasMultipleCashboxes = userAssignments && userAssignments.length > 1;

    return hasAllPermissions || hasMultipleCashboxes;
  }, [cashbookPermissions, userAssignments]);

  // =============================================================================
  // 🆕 DB SYNC HELPER FUNCTIONS (musí být před useEffect který je volá)
  // =============================================================================

  /**
   * Transformace DB entry → Frontend formát
   */
  const transformDBEntryToFrontend = useCallback((dbEntry) => {
    // ✅ Použít DB timestamp pro detekci změn (admin mohl přečíslovat)
    const dbTimestamp = dbEntry.aktualizovano || dbEntry.vytvoreno;

    // 🆕 MULTI-LP: Načíst detail položky pokud existují
    const detailItems = dbEntry.detail_items || [];
    const hasDetails = detailItems.length > 0;

    return {
      id: `local_${Date.now()}_${Math.random()}`, // Lokální ID
      db_id: dbEntry.id,                           // DB ID
      date: dbEntry.datum_zapisu,
      documentNumber: dbEntry.cislo_dokladu,
      description: dbEntry.obsah_zapisu || '',
      person: dbEntry.komu_od_koho || '',
      income: dbEntry.castka_prijem ? parseFloat(dbEntry.castka_prijem) : null,
      expense: dbEntry.castka_vydaj ? parseFloat(dbEntry.castka_vydaj) : null,
      balance: parseFloat(dbEntry.zustatek_po_operaci || 0),
      lpCode: hasDetails ? '' : (dbEntry.lp_kod || ''), // Master LP kod jen pokud NENÍ multi-LP
      note: dbEntry.poznamka || '',
      isEditing: false,

      // 🆕 MULTI-LP support
      detailItems: detailItems.map(item => ({
        lp_kod: item.lp_kod || '',
        castka: parseFloat(item.castka || 0),
        popis: item.popis || ''
      })),

      // 🆕 SYNC metadata pro detekci změn v DB
      last_modified_local: new Date().toISOString(),
      last_synced_at: dbTimestamp,           // Kdy bylo naposledy syncnuté z DB
      db_updated_at: dbTimestamp,            // Kdy bylo v DB aktualizováno
      changed: false,                        // Zda má lokální neuložené změny
      sync_status: 'synced'                  // synced | pending | error
    };
  }, []); // žádné dependencies

  /**
   * Transformace Frontend entry → DB payload
   */
  const transformFrontendEntryToDB = useCallback((entry, bookId) => {
    const payload = {
      book_id: bookId,
      datum_zapisu: entry.date,
      cislo_dokladu: entry.documentNumber, // ✅ Poslat číslo dokladu (může být změněno při změně typu)
      obsah_zapisu: entry.description || '', // Vždy poslat, i když prázdný string
      komu_od_koho: entry.person || '', // Vždy poslat
      // ✅ FIX: Explicitně poslat 0 místo null/undefined, aby se smazala původní hodnota
      castka_prijem: entry.income || 0,
      castka_vydaj: entry.expense || 0,
      typ_dokladu: entry.expense > 0 ? 'vydaj' : 'prijem', // 🆕 MULTI-LP potřebuje typ
      poznamka: entry.note || '' // Vždy poslat
    };
    
    // 🆕 MULTI-LP: Pokud má detailItems, poslat je (NEPOSLAT master lp_kod)
    if (entry.detailItems && entry.detailItems.length > 0) {
      payload.detail_items = entry.detailItems;
      payload.castka_celkem = entry.detailItems.reduce((sum, item) => sum + (item.castka || 0), 0);
      console.log('📦 MULTI-LP payload:', { 
        detail_items_count: entry.detailItems.length, 
        castka_celkem: payload.castka_celkem,
        detail_items: entry.detailItems
      });
      // Master LP kód je prázdný, když jsou detaily
    } else if (entry.lpCode) {
      // Původní flow - pouze pokud NENÍ multi-LP
      payload.lp_kod = entry.lpCode;
    }
    
    return payload;
  }, []); // žádné dependencies

  /**
   * Načtení knihy z DB (nebo vytvoření nové)
   */
  const ensureBookExists = useCallback(async () => {
    if (!mainAssignment?.id || !userDetail?.id) {
      return null;
    }

    try {
      // ✅ FIX: Když admin přepne na jinou pokladnu, načíst knihy pro UŽIVATELE TÉ POKLADNY
      const targetUserId = mainAssignment.uzivatel_id || userDetail.id;

      // 1. Zkusit načíst existující knihu
      const booksResult = await cashbookAPI.listBooks(targetUserId, currentYear, currentMonth);

      if (booksResult.status === 'ok' && booksResult.data?.books?.length > 0) {
        const book = booksResult.data.books[0];

        setCurrentBookId(book.id);
        setCurrentBookData(book); // 🆕 Uložit celý objekt knihy
        setBookStatus(book.stav_knihy || 'aktivni');
        setCarryOverAmount(parseFloat(book.prevod_z_predchoziho || 0));

        // Načíst detaily knihy včetně položek (s force_recalc pro aktuální převod)
        const bookDetail = await cashbookAPI.getBook(book.id, true);

        if (bookDetail.status === 'ok' && bookDetail.data?.entries) {
          // Transformovat entries do frontend formátu
          const transformedEntries = bookDetail.data.entries.map(transformDBEntryToFrontend);
          return { book, entries: transformedEntries };
        }

        return { book, entries: [] };
      } else {
        // 2. Kniha neexistuje - zkusit vytvořit
        // ✅ Pokud má uživatel přiřazení (mainAssignment.id existuje), vytvoř knihu
        if (mainAssignment?.id) {

          const createResult = await cashbookAPI.createBook(
            mainAssignment.id,  // prirazeni_pokladny_id
            currentYear,
            currentMonth,
            targetUserId        // uzivatel_id
          );

          if (createResult.status === 'ok') {
            // ✅ Backend vrací jen book_id (ne celý objekt)
            const bookId = createResult.data?.book_id || createResult.data?.id;

            if (bookId) {
              // Načíst kompletní knihu z DB (včetně prevod_z_predchoziho s force_recalc)
              const bookDetail = await cashbookAPI.getBook(bookId, true);

              if (bookDetail.status === 'ok') {
                const newBook = bookDetail.data?.book || bookDetail.data;

                setCurrentBookId(bookId);
                setCurrentBookData(newBook); // 🆕 Uložit celý objekt knihy
                setBookStatus(newBook.stav_knihy || 'aktivni');
                setCarryOverAmount(parseFloat(newBook.prevod_z_predchoziho || 0));

                const transformedEntries = (bookDetail.data?.entries || []).map(transformDBEntryToFrontend);
                return { book: newBook, entries: transformedEntries };
              }
            }
          }

          // Pokud se sem dostaneme, něco se nepovedlo
          const errorMsg = createResult.message || createResult.error || 'Backend nevrátil book_id';
          throw new Error('Nepodařilo se vytvořit knihu: ' + errorMsg);
        } else {
          // ❌ Uživatel nemá přiřazení pokladny - zobrazit chybu
          console.warn('⛔ Uživatel nemá přiřazení k žádné pokladně', { mainAssignment, userDetail });
          throw new Error('NO_ASSIGNMENT');
        }
      }
    } catch (error) {
      console.error('❌ Chyba při zajištění existence knihy:', error);

      // ✅ Speciální zpracování chyby - uživatel nemá přiřazení
      if (error.message === 'NO_ASSIGNMENT') {
        showToast('Bohužel Vám pokladní kniha nebyla přidělena. Kontaktujte správce.', 'error');
        // Nastavit prázdný stav
        setCashBookEntries([]);
        setCurrentBookId(null);
        return null;
      }

      showToast('Chyba při načítání/vytváření knihy: ' + error.message, 'error');
      return null;
    }
  }, [mainAssignment, userDetail, currentYear, currentMonth, showToast, transformDBEntryToFrontend]);

  /**
   * Uložit data do localStorage (backup)
   */
  const saveToLocalStorage = useCallback((entries, status, carryOver) => {
    const dataToSave = {
      entries: entries,
      bookStatus: status,
      carryOverAmount: carryOver,
      lastModified: new Date().toISOString(),
      lastSyncTimestamp: lastSyncTimestamp
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [STORAGE_KEY, lastSyncTimestamp]);

  /**
   * Synchronizace lokálních změn do DB
   * @param {Array} entries - Pole položek k synchronizaci
   * @param {number} bookId - ID knihy (volitelné, použije currentBookId ze state)
   */
  const syncLocalChangesToDB = useCallback(async (entries, bookId = null) => {
    const targetBookId = bookId || currentBookId;

    if (!targetBookId || isSyncing) {
      return;
    }

    if (isSyncing) {
      return;
    }

    try {
      setIsSyncing(true);

      let syncedCount = 0;
      let errorCount = 0;

      for (const entry of entries) {
        // Přeskočit položky které jsou již syncnuté
        if (entry.sync_status === 'synced' && !entry.changed) {
          continue;
        }

        try {
          if (entry.db_id) {
            // Existuje v DB - update
            await cashbookAPI.updateEntry(entry.db_id, transformFrontendEntryToDB(entry, targetBookId));
          } else {
            // Neexistuje v DB - create
            const result = await cashbookAPI.createEntry(transformFrontendEntryToDB(entry, targetBookId));

            if (result.status === 'ok' && result.data?.entry) {
              // Aktualizovat entry s DB ID
              entry.db_id = result.data.entry.id;
              entry.documentNumber = result.data.entry.cislo_dokladu;
            }
          }

          // Označit jako syncnuté
          entry.changed = false;
          entry.sync_status = 'synced';
          entry.last_synced_at = new Date().toISOString();
          syncedCount++;

        } catch (error) {
          console.error('❌ Chyba při sync entry:', error);
          entry.sync_status = 'error';
          errorCount++;
        }
      }

      // Aktualizovat totals v DB
      const totalIncome = entries.reduce((sum, e) => sum + (e.income || 0), 0);
      const totalExpenses = entries.reduce((sum, e) => sum + (e.expense || 0), 0);
      const endBalance = carryOverAmount + totalIncome - totalExpenses;

      await cashbookAPI.updateBook(targetBookId, {
        celkove_prijmy: totalIncome,
        celkove_vydaje: totalExpenses,
        koncovy_stav: endBalance,
        pocet_zaznamu: entries.length
      });

      setLastSyncTimestamp(new Date().toISOString());

      if (errorCount > 0) {
        showToast(`Synchronizováno ${syncedCount} položek, ${errorCount} chyb`, 'warning');
      }

    } catch (error) {
      console.error('❌ Chyba při synchronizaci:', error);
      showToast('Chyba při synchronizaci s databází', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [currentBookId, isSyncing, carryOverAmount, showToast, transformFrontendEntryToDB]);

  // 🆕 DB SYNC: Načíst data z DB při načtení komponenty nebo změně měsíce
  useEffect(() => {
    // ✅ DŮLEŽITÉ: Nepokračuj pokud ještě nemáme userDetail nebo mainAssignment
    if (!userDetail?.id || !mainAssignment?.id) {
      return;
    }

    const loadDataFromDB = async () => {
      try {
        // 1. Zajistit existenci knihy v DB (nebo vytvořit novou)
        const result = await ensureBookExists();

        if (!result) {
          // Pokud je to chyba oprávnění, nechat prázdnou tabulku (již zobrazená chyba v ensureBookExists)
          // Jinak zkusit localStorage jako fallback
          if (currentBookId === null) {
            // Nebyla vytvořena/načtena žádná kniha - zobrazit prázdnou stránku
            setCashBookEntries([]);
            return;
          }
          loadFromLocalStorageOnly();
          return;
        }

        const { book, entries } = result;

        // ✅ NASTAVIT STAV KNIHY HNED PO NAČTENÍ (priorita DB dat)
        setBookStatus(book.stav_knihy || 'aktivni');

        // ✅ NASTAVIT METADATA O UZAVŘENÍ/ZAMČENÍ
        // Backend vrací kompletní jména (uzivatel_jmeno_plne, zamknul_spravce_jmeno_plne)
        const closedByName = book.uzivatel_jmeno_plne || `ID: ${book.uzivatel_id}`;
        const lockedByName = book.zamknul_spravce_jmeno_plne || null;

        setBookStatusMetadata({
          closedDate: book.uzavrena_uzivatelem_kdy || null,
          closedBy: closedByName,
          lockedDate: book.zamknuta_spravcem_kdy || null,
          lockedBy: lockedByName,
        });

        // ✅ DETEKCE PAGE RELOAD (F5)
        // Pokud je performance.navigation.type === 1, je to reload stránky
        const isPageReload = window.performance?.navigation?.type === 1 ||
                            window.performance?.getEntriesByType?.('navigation')?.[0]?.type === 'reload';

        // 2. Načíst localStorage pro porovnání (pouze pokud NENÍ page reload)
        const savedData = localStorage.getItem(STORAGE_KEY);
        let localEntries = [];
        let localTimestamp = null;

        if (savedData && !isPageReload) {
          try {
            const parsed = JSON.parse(savedData);
            localEntries = parsed.entries || [];
            localTimestamp = parsed.lastSyncTimestamp;
          } catch (error) {
            console.error('❌ Chyba parsování localStorage:', error);
          }
        }

        // 🆕 KONTROLA: Porovnat timestamp DB vs localStorage
        // Pokud má DB novější data (např. admin přečísloval), použít DB
        const dbIsNewer = book.aktualizovano && localTimestamp &&
                         new Date(book.aktualizovano) > new Date(localTimestamp);



        // 3. Rozhodnout, která data použít
        // ✅ STRATEGIE: DB JE VŽDY ZDROJ PRAVDY
        // localStorage slouží POUZE jako dočasný offline backup
        // Po F5 nebo změně uživatele se VŽDY načte čerstvá data z DB

        // 🎯 PRAVIDLO 1: Pokud je page reload (F5), VŽDY ignorovat localStorage
        if (isPageReload) {
          // F5 → načíst jen z DB, smazat starý localStorage
          setCashBookEntries(entries);
          if (entries.length > 0) {
            saveToLocalStorage(entries, book.stav_knihy, parseFloat(book.prevod_z_predchoziho || 0));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
          setLastSyncTimestamp(new Date().toISOString());
        }
        // 🎯 PRAVIDLO 2: Pokud DB má novější data než localStorage (timestamp check)
        else if (dbIsNewer) {
          // Admin mohl změnit data (přečíslování dokladů) → použít DB
          setCashBookEntries(entries);
          saveToLocalStorage(entries, book.stav_knihy, parseFloat(book.prevod_z_predchoziho || 0));
          setLastSyncTimestamp(new Date().toISOString());
        }
        // 🎯 PRAVIDLO 3: Pokud DB má data, použít DB (standardní načtení)
        else if (entries.length > 0) {
          // DB má data → použít DB jako zdroj pravdy
          setCashBookEntries(entries);
          saveToLocalStorage(entries, book.stav_knihy, parseFloat(book.prevod_z_predchoziho || 0));
          setLastSyncTimestamp(new Date().toISOString());
        }
        // 🎯 PRAVIDLO 4: DB je prázdná, ale localStorage má unsyncnutá data
        else if (entries.length === 0 && localEntries.length > 0) {
          // Pouze pokud localStorage patří TÉTO pokladně a TOMUTO uživateli
          const isValidCache = STORAGE_KEY.includes(`_${mainAssignment.id}_`) &&
                              STORAGE_KEY.includes(`_${userDetail.id}_`);

          if (isValidCache) {
            // Offline režim - použít lokální data a pokusit se sync
            setCashBookEntries(localEntries);
            syncLocalChangesToDB(localEntries, book.id);
          } else {
            // Cache je pro jinou pokladnu/uživatele → smazat a začít čistě
            setCashBookEntries([]);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
        // � PRAVIDLO 4: Ani DB ani localStorage nemá data → prázdný start
        else {
          setCashBookEntries([]);
          localStorage.removeItem(STORAGE_KEY);
        }

      } catch (error) {
        console.error('❌ Chyba při načítání z DB:', error);
        loadFromLocalStorageOnly();
      }
    };

    // Helper: Načíst pouze z localStorage (fallback)
    const loadFromLocalStorageOnly = () => {
      const savedData = localStorage.getItem(STORAGE_KEY);

      // Načíst konečný zůstatek z předchozího měsíce (pro výpočet carryOver pokud není uložený)
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevStorageKey = `cashbook_${userDetail.id}_${prevYear}_${prevMonth}`;

      let calculatedCarryOver = 0;
      const prevMonthData = localStorage.getItem(prevStorageKey);

      if (prevMonthData) {
        try {
          const prevParsed = JSON.parse(prevMonthData);
          const prevEntries = prevParsed.entries || [];

          // Spočítat konečný zůstatek předchozího měsíce
          const prevInitialBalance = prevParsed.carryOverAmount || 0;
          const totalIncome = prevEntries.reduce((sum, entry) => sum + (entry.income || 0), 0);
          const totalExpenses = prevEntries.reduce((sum, entry) => sum + (entry.expense || 0), 0);
          calculatedCarryOver = prevInitialBalance + totalIncome - totalExpenses;

        } catch (error) {
          console.error('❌ Chyba při načítání dat předchozího měsíce:', error);
        }
      }

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);

          // Načíst entries z localStorage
          setCashBookEntries(parsed.entries || []);
          setBookStatus(parsed.bookStatus || 'aktivni');

          const storedCarryOver = parsed.carryOverAmount;
          if (typeof storedCarryOver === 'number') {
            setCarryOverAmount(storedCarryOver);
          } else {
            setCarryOverAmount(calculatedCarryOver);
            const updatedData = { ...parsed, carryOverAmount: calculatedCarryOver };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
          }
        } catch (error) {
          console.error('❌ Chyba při načítání dat z localStorage:', error);
          setCashBookEntries([]);
          setCarryOverAmount(calculatedCarryOver);
        }
      } else {
        setCashBookEntries([]);
        setCarryOverAmount(calculatedCarryOver);
      }
    };

    // Spustit načítání z DB
    loadDataFromDB();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY, currentMonth, currentYear, userDetail?.id, mainAssignment?.id, mainAssignment?.cislo_pokladny]);

  // Načíst LP kódy z API při načtení komponenty (jednou)
  useEffect(() => {
    const loadLpCodes = async () => {

      // OPRAVA: token je samostatná proměnná, není součástí user objektu!
      if (!token || !user?.username) {
        setLpLoading(false);
        return;
      }

      try {
        setLpLoading(true);

        // Použít stejnou funkci jako v OrderForm25
        const data = await fetchLimitovanePrisliby({
          token: token,
          username: user.username
        });

        // Transformovat data do jednotného formátu { code, name }
        // SPRÁVNÁ STRUKTURA: cislo_lp (např. "LPIT01"), nazev_uctu (název LP kódu)
        const transformedLps = Array.isArray(data) ? data.map(lp => {
          const code = lp.cislo_lp || lp.kod || lp.code || lp.id;
          const name = lp.nazev_uctu || lp.nazev || lp.name || lp.popis || '';
          return { code, name };
        }) : [];

        setLpCodes(transformedLps);
        setLpLoading(false);
      } catch (error) {
        console.error('❌ Chyba při načítání LP kódů:', error);
        showToast('Nepodařilo se načíst LP kódy', 'error');
        setLpCodes([]);
        setLpLoading(false);
      }
    };

    loadLpCodes();
  }, [token, user?.username, showToast]); // Načte se jednou když máme token a username

  // 🆕 STICKY SUMMARY: Sledování scrollu pro zobrazení kompaktního přehledu
  useEffect(() => {
    const handleScroll = () => {
      // Layout používá fixed main element pro scrollování
      const mainElement = document.querySelector('main');
      if (!mainElement) return;

      const scrollTop = mainElement.scrollTop;

      // Zobrazit sticky při scrollu 575px
      const threshold = 575;
      const shouldShow = scrollTop > threshold;

      // Debug - odkomentuj pro testování
      // console.log('Scroll:', scrollTop, 'Threshold:', threshold, 'Show:', shouldShow);

      setShowStickySummary(shouldShow);
    };

    // Najít main element a připojit listener
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    mainElement.addEventListener('scroll', handleScroll);

    // Kontrola při mount (pokud už je scrollnuté)
    handleScroll();

    // Re-kalkulovat threshold při resize (mění se výška InfoPanel)
    window.addEventListener('resize', handleScroll);

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // 🆕 AUTO REFRESH: Automatický refresh při návratu do okna + periodický refresh
  useEffect(() => {
    // Funkce pro refresh dat z DB
    const refreshDataFromDB = async (showMessage = false) => {
      if (!currentBookId) return;

      try {
        // 1. Načíst fresh data z DB včetně book info (s force_recalc pro přepočet převodu)
        const bookData = await cashbookAPI.getBook(currentBookId, true);

        if (bookData.status === 'ok') {
          // ✅ FIX: Aktualizovat carryOverAmount z DB (může se změnit při úpravě předchozího měsíce)
          const book = bookData.data?.book || bookData.data;
          if (book && book.prevod_z_predchoziho !== undefined) {
            const freshCarryOver = parseFloat(book.prevod_z_predchoziho || 0);
            setCarryOverAmount(freshCarryOver);
          }

          const entries = bookData.data?.entries || [];
          const dbEntries = entries.map(entry => ({
            ...entry,
            id: entry.id || `temp-${Date.now()}-${Math.random()}`,
            db_id: entry.id,
            date: entry.datum_zapisu || entry.datum || new Date().toISOString().split('T')[0],
            documentNumber: entry.cislo_dokladu || '',
            description: entry.obsah_zapisu || '',
            person: entry.komu_od_koho || '',
            income: entry.castka_prijem ? parseFloat(entry.castka_prijem) : null,
            expense: entry.castka_vydaj ? parseFloat(entry.castka_vydaj) : null,
            balance: parseFloat(entry.zustatek_po_operaci || 0),
            lpCode: entry.lp_kod || '',
            note: entry.poznamka || '',
            isEditing: false,
            changed: false,
            sync_status: 'synced'
          }));

          // 2. Načíst lokální data z localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          const localData = stored ? JSON.parse(stored) : null;

          // 3. Sloučit data - DB má přednost, ale zachovat lokální editace
          if (localData?.entries && localData.entries.some(e => e.isEditing || e.changed)) {
            // Jsou lokální změny - mergovat opatrně
            const mergedEntries = dbEntries.map(dbEntry => {
              const localEntry = localData.entries.find(le => le.id === dbEntry.id);
              return localEntry?.changed ? localEntry : dbEntry;
            });

            setCashBookEntries(mergedEntries);
            if (showMessage) {
              showToast('Data refreshnuta - zachovány lokální změny', 'info');
            }
          } else {
            // Žádné lokální změny - prostě nahradit
            setCashBookEntries(dbEntries);
            if (showMessage) {
              showToast('Data aktualizována z DB', 'success');
            }
          }
        }
      } catch (error) {
        console.error('❌ Chyba při auto-refresh:', error);
        // Tichá chyba - neomezovat UX
      }
    };

    // Handler pro návrat do okna
    const handleVisibilityChange = () => {
      // Pokud se uživatel vrátí do okna (z hidden na visible)
      if (!document.hidden && currentBookId) {
        refreshDataFromDB(true); // S toast notifikací
      }
    };

    // Periodický refresh na pozadí každé 2 minuty
    const intervalId = setInterval(() => {
      // ⚠️ KONTROLA: Pouze pokud uživatel NEUPRAVUJE žádný záznam A NEMÁ NEULOŽENÉ ZMĚNY
      // Zkontroluj, zda není nějaký entry v režimu editace nebo nesynchronizované změny
      const stored = localStorage.getItem(STORAGE_KEY);
      const localData = stored ? JSON.parse(stored) : null;
      const hasEditingEntryInLocalStorage = localData?.entries?.some(e => e.isEditing) || false;
      const hasUnsyncedChanges = localData?.entries?.some(e => e.changed || e.sync_status !== 'synced') || false;

      // ✅ FIX: Kontrola i aktuálního stavu cashBookEntries (použití ref pro aktuální hodnotu)
      const hasEditingEntryInState = cashBookEntriesRef.current?.some(e => e.isEditing) || false;

      if (!hasEditingEntryInLocalStorage && !hasEditingEntryInState && !hasUnsyncedChanges) {
        // Refresh POUZE když:
        // 1. Žádný záznam není v editaci (localStorage)
        // 2. Žádný záznam není v editaci (aktuální state)
        // 3. Žádný záznam nemá nesynchronizované změny
        refreshDataFromDB(false); // Bez toast notifikace
      }
      // Pokud je nějaký záznam v editaci, přeskočíme refresh
    }, 120000); // 2 minuty (120 sekund)

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [currentBookId, STORAGE_KEY, showToast]);

  // 🆕 UNIFIED: Načíst assignments (vlastní + admin allAssignments) v JEDNOM useEffect
  useEffect(() => {
    const loadAllData = async () => {
      if (!userDetail?.id) {
        return;
      }

      try {
        setAssignmentLoading(true);

        // 1️⃣ VŽDY načíst vlastní přiřazení
        const userResult = await cashbookAPI.listAssignments(userDetail.id, true);
        const userAssignments = userResult.data?.assignments || [];
        setUserAssignments(userAssignments);

        // 2️⃣ Pokud má admin oprávnění, načíst i všechny pokladny
        let allAvailableAssignments = userAssignments; // Default pro běžné uživatele

        if (canSeeAllCashboxes) {
          try {
            const allResult = await cashbookAPI.getCashboxListByPeriod(
              currentYear,
              currentMonth,
              true,  // active_only
              true   // include_users
            );

            if (allResult.status === 'ok' && allResult.data?.pokladny) {
              const transformedData = allResult.data.pokladny.map(item => ({
                ...item,
                id: parseInt(item.prirazeni_id || item.id, 10),
                pokladna_id: parseInt(item.id, 10),
                cislo_pokladny: parseInt(item.cislo_pokladny, 10),
                aktivni: parseInt(item.aktivni, 10),
                uzivatel_id: parseInt(item.uzivatel_id, 10),
                je_hlavni: 1,
              }));

              setAllAssignments(transformedData);
              allAvailableAssignments = transformedData; // Admin vidí všechny
            }
          } catch (err) {
            // Tichá chyba - není kritická
          }
        }

        // 3️⃣ Vybrat správnou pokladnu (localStorage → hlavní → první)
        let selectedAssignment = null;

        // Zkusit localStorage
        try {
          const saved = localStorage.getItem('cashbook_selector_cashbox');
          if (saved) {
            const savedData = JSON.parse(saved);
            selectedAssignment = allAvailableAssignments.find(a => a.id === savedData.id);
          }
        } catch (err) {
          // Tichá chyba
        }

        // Fallback na hlavní nebo první
        if (!selectedAssignment) {
          const main = allAvailableAssignments.find(a => a.je_hlavni === 1);
          selectedAssignment = main || allAvailableAssignments[0];
        }

        if (selectedAssignment) {
          setMainAssignment(selectedAssignment);
        } else {
          showToast('Nemáte přiřazenou pokladnu.', 'error');
        }

      } catch (error) {
        console.error('❌ Chyba při načítání dat:', error);
        showToast('Chyba při načítání dat: ' + error.message, 'error');
      } finally {
        setAssignmentLoading(false);
      }
    };

    loadAllData();
  }, [userDetail?.id, canSeeAllCashboxes, currentYear, currentMonth, showToast]);

  // 🆕 Uložit výběr období do localStorage (hlavně pro adminy)
  useEffect(() => {
    try {
      localStorage.setItem('cashbook_selector_period', JSON.stringify({
        year: currentYear,
        month: currentMonth
      }));
    } catch (err) {
      // Tichá chyba
    }
  }, [currentYear, currentMonth]);

  // 🆕 KROK 4: Načíst nastavení prefixovaných čísel při mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);

        // Backend API vrací při dotazu na konkrétní klíč: {status: 'ok', data: {key: 'cashbook_use_prefix', value: '0'}}
        const result = await cashbookAPI.getSettings('cashbook_use_prefix');

        if (result.status === 'ok' && result.data) {
          // Backend vrací objekt s key a value, ne pole
          const value = result.data.value;
          const usePrefix = value === '1' || value === 1;
          setUsePrefixedNumbers(usePrefix);
        } else {
          setUsePrefixedNumbers(false);
        }
      } catch (error) {
        console.error('❌ CASHBOOK V2: Chyba při načítání nastavení:', error);
        // V případě chyby použijeme false (bez prefixů)
        setUsePrefixedNumbers(false);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Počáteční zůstatek = převod z předchozího měsíce
  const initialBalance = carryOverAmount;

  // Vypočítané hodnoty
  const totals = React.useMemo(() => {
    const totalIncome = cashBookEntries.reduce((sum, entry) => sum + (entry.income || 0), 0);
    const totalExpenses = cashBookEntries.reduce((sum, entry) => sum + (entry.expense || 0), 0);
    const currentBalance = initialBalance + totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      currentBalance,
      entryCount: cashBookEntries.length
    };
  }, [cashBookEntries, carryOverAmount, initialBalance]);

  // ✅ ZJEDNODUŠENO: Používáme data přímo z cashBookEntries jak přijdou z DB
  // DB už obsahuje správně přečíslované doklady, není třeba je přepočítávat

  // 🆕 Funkce pro načtení posledních P a V čísel z předchozího měsíce
  const getLastDocumentNumbersFromPreviousMonth = useCallback(async () => {
    if (!mainAssignment?.uzivatel_id) {
      return { lastP: 0, lastV: 0 };
    }

    const userId = mainAssignment.uzivatel_id;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    try {
      // Najít knihu pro předchozí měsíc
      const booksResult = await cashbookAPI.listBooks(userId, prevYear, prevMonth);

      if (booksResult.status !== 'ok' || !booksResult.data?.books || booksResult.data.books.length === 0) {
        return { lastP: 0, lastV: 0 };
      }

      const prevBook = booksResult.data.books[0]; // První kniha pro ten měsíc

      // Načíst entries z té knihy
      const bookResult = await cashbookAPI.getBook(prevBook.id, false);

      if (bookResult.status === 'ok' && bookResult.data?.entries?.length > 0) {
        const entries = bookResult.data.entries;

        // Najít nejvyšší P číslo (z DB pole cislo_dokladu)
        const pNumbers = entries
          .filter(e => e.cislo_dokladu?.startsWith('P'))
          .map(e => parseInt(e.cislo_dokladu.substring(1)) || 0);
        const lastP = pNumbers.length > 0 ? Math.max(...pNumbers) : 0;

        // Najít nejvyšší V číslo
        const vNumbers = entries
          .filter(e => e.cislo_dokladu?.startsWith('V'))
          .map(e => parseInt(e.cislo_dokladu.substring(1)) || 0);
        const lastV = vNumbers.length > 0 ? Math.max(...vNumbers) : 0;

        return { lastP, lastV };
      }

      return { lastP: 0, lastV: 0 };
    } catch (error) {
      console.error('❌ Chyba při načítání čísel z předchozího měsíce:', error);
      return { lastP: 0, lastV: 0 };
    }
  }, [mainAssignment, currentMonth, currentYear]);

  // Formátování českých korun
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Formátování českého data
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ');
  };

  // Dnešní datum ve formátu YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // 🆕 ZJEDNODUŠENO: Generování čísla dokladu - pokračuje od posledního v aktuálním měsíci
  // Pokud je měsíc prázdný, načte poslední číslo z předchozího měsíce
  const generateDocumentNumber = async (isIncome) => {
    const type = isIncome ? 'P' : 'V';

    // Najít nejvyšší číslo v aktuálním měsíci
    const currentMonthNumbers = cashBookEntries
      .filter(entry => entry.documentNumber?.startsWith(type))
      .map(entry => parseInt(entry.documentNumber.substring(1)) || 0);

    let nextNumber;

    if (currentMonthNumbers.length > 0) {
      // Pokud už máme doklady v tomto měsíci, pokračuj od nejvyššího
      nextNumber = Math.max(...currentMonthNumbers) + 1;
    } else {
      // Pokud je měsíc prázdný, načti poslední číslo z předchozího měsíce
      const { lastP, lastV } = await getLastDocumentNumbersFromPreviousMonth();
      nextNumber = (type === 'P' ? lastP : lastV) + 1;
    }

    return `${type}${String(nextNumber).padStart(3, '0')}`;
  };

  // 🚨 Helper: Kontrola, zda existují uzavřené měsíce v budoucnosti
  const checkForClosedFutureMonths = useCallback(async (targetYear, targetMonth) => {
    if (!mainAssignment?.uzivatel_id) {
      return { hasClosedFuture: false, closedMonths: [] };
    }

    try {
      const userId = mainAssignment.uzivatel_id;
      const closedMonths = [];

      // Projít všechny měsíce od targetMonth+1 do aktuálního měsíce
      const today = new Date();
      const currentSystemMonth = today.getMonth() + 1;
      const currentSystemYear = today.getFullYear();

      let checkYear = targetYear;
      let checkMonth = targetMonth + 1;

      // Normalizace (pokud je targetMonth = 12, další měsíc je 1 v dalším roce)
      if (checkMonth > 12) {
        checkMonth = 1;
        checkYear++;
      }

      // Procházet měsíce až do aktuálního
      while (
        checkYear < currentSystemYear ||
        (checkYear === currentSystemYear && checkMonth <= currentSystemMonth)
      ) {
        const booksResult = await cashbookAPI.listBooks(userId, checkYear, checkMonth);

        if (booksResult.status === 'ok' && booksResult.data?.books?.length > 0) {
          const book = booksResult.data.books[0];
          // Kontrola, zda je kniha uzavřená nebo zamčená
          if (book.stav_knihy === 'uzavrena_uzivatelem' || book.stav_knihy === 'zamknuta_spravcem') {
            closedMonths.push({
              year: checkYear,
              month: checkMonth,
              status: book.stav_knihy,
              monthName: new Date(checkYear, checkMonth - 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })
            });
          }
        }

        // Posun na další měsíc
        checkMonth++;
        if (checkMonth > 12) {
          checkMonth = 1;
          checkYear++;
        }
      }

      return {
        hasClosedFuture: closedMonths.length > 0,
        closedMonths: closedMonths
      };
    } catch (error) {
      console.error('❌ Chyba při kontrole budoucích uzavřených měsíců:', error);
      return { hasClosedFuture: false, closedMonths: [] };
    }
  }, [mainAssignment]);

  // 🆕 Kontrola zda předchozí měsíc je uzavřený (pro warning)
  const checkPreviousMonthStatus = useCallback(async () => {
    if (!currentBookId || !mainAssignment?.uzivatel_id) {
      setShowPreviousMonthWarning(false);
      return;
    }

    const userId = mainAssignment.uzivatel_id;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    try {
      const result = await cashbookAPI.listBooks(userId, prevYear, prevMonth);

      if (result.status === 'ok' && result.data?.books?.length > 0) {
        const prevBook = result.data.books[0];

        // Pokud je předchozí měsíc AKTIVNÍ (ne uzavřený) → zobrazit warning
        if (prevBook.stav_knihy === 'aktivni') {
          setShowPreviousMonthWarning(true);
        } else {
          setShowPreviousMonthWarning(false);
        }
      } else {
        // Předchozí měsíc neexistuje → žádné varování
        setShowPreviousMonthWarning(false);
      }
    } catch (error) {
      console.error('Chyba při kontrole předchozího měsíce:', error);
      setShowPreviousMonthWarning(false);
    }
  }, [mainAssignment, currentYear, currentMonth, currentBookId]);

  // useEffect pro kontrolu předchozího měsíce
  useEffect(() => {
    checkPreviousMonthStatus();
  }, [checkPreviousMonthStatus]);

  // Navigace na předchozí měsíc
  const goToPreviousMonth = async () => {
    // Vypočítat cílový měsíc
    let targetMonth = currentMonth - 1;
    let targetYear = currentYear;

    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear--;
    }

    // 🚨 OCHRANA: Kontrola, zda pro cílový měsíc již kniha EXISTUJE
    if (mainAssignment?.uzivatel_id) {
      try {
        const userId = mainAssignment.uzivatel_id;
        const targetBooksResult = await cashbookAPI.listBooks(userId, targetYear, targetMonth);

        // Pokud kniha NEEXISTUJE → zkontrolovat uzavřené měsíce v budoucnosti
        if (!targetBooksResult.data?.books || targetBooksResult.data.books.length === 0) {
          const { hasClosedFuture, closedMonths } = await checkForClosedFutureMonths(targetYear, targetMonth);

          if (hasClosedFuture) {
            // Existují uzavřené měsíce → BLOKOVAT vytvoření nové knihy v minulosti
            setRetroactiveCreationBlockedDialogOpen(true);
            return; // ZASTAVIT navigaci
          }
        }
        // Pokud kniha EXISTUJE → povolit navigaci (jen prohlížení)
      } catch (error) {
        console.error('❌ Chyba při kontrole existence knihy:', error);
        // V případě chyby povolit navigaci
      }
    }

    // Uložit aktuální měsíc před přepnutím
    const dataToSave = {
      entries: cashBookEntries.map(entry => ({ ...entry, isEditing: false })),
      carryOverAmount: carryOverAmount,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

    // Přepnout měsíc
    setCurrentMonth(targetMonth);
    setCurrentYear(targetYear);
  };

  // Navigace na následující měsíc (max do aktuálního měsíce)
  const goToNextMonth = () => {
    const today = new Date();
    const currentSystemMonth = today.getMonth() + 1;
    const currentSystemYear = today.getFullYear();

    // Neumožnit jít dál než aktuální měsíc
    if (currentYear === currentSystemYear && currentMonth === currentSystemMonth) {
      showToast('Nelze přejít do budoucnosti', 'warning');
      return;
    }

    // Uložit aktuální měsíc před přepnutím
    const dataToSave = {
      entries: cashBookEntries.map(entry => ({ ...entry, isEditing: false })),
      carryOverAmount: carryOverAmount,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

    // Přepnout měsíc
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Přejít na aktuální měsíc
  const goToCurrentMonth = () => {
    // Uložit současný měsíc před přepnutím
    const dataToSave = {
      entries: cashBookEntries.map(entry => ({ ...entry, isEditing: false })),
      carryOverAmount: carryOverAmount,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

    const today = new Date();
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
  };

  // Přidání nového řádku
  const addNewEntry = () => {
    const newId = Date.now();

    // Určit správné datum: pokud jsme v minulém měsíci, použít poslední den toho měsíce
    const today = new Date();
    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === (today.getMonth() + 1);

    let defaultDate;
    if (isCurrentMonth) {
      // Aktuální měsíc - dnešní datum
      defaultDate = getTodayDate();
    } else {
      // Minulý měsíc - poslední den toho měsíce
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0); // Den 0 = poslední den předchozího měsíce
      const year = lastDayOfMonth.getFullYear();
      const month = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
      const day = String(lastDayOfMonth.getDate()).padStart(2, '0');
      defaultDate = `${year}-${month}-${day}`;
    }

    const newEntry = {
      id: newId,
      date: defaultDate,
      documentNumber: "", // Ponecháme prázdné, vyplní se automaticky podle typu
      description: "",
      person: "",
      income: null,
      expense: null,
      balance: totals.currentBalance,
      lpCode: "",
      note: "",
      isEditing: true,
      // 🆕 MULTI-LP: Podřádky s LP kódy
      detailItems: [], // Pole {popis, castka, lp_kod, lp_popis}
      hasDetails: false // Flag zda má podřádky
    };

    setCashBookEntries(prev => [...prev, newEntry]);

    // ✅ OPTIMALIZACE: requestAnimationFrame pro focus (browser-friendly)
    requestAnimationFrame(() => {
      const descriptionInput = document.querySelector(`input[data-entry-id="${newId}"][data-field="description"]`);
      if (descriptionInput) {
        descriptionInput.focus();
      }
    });

    return newId;
  };

  // 🆕 CASHBOX SELECTOR: Handler pro změnu pokladny
  const handleCashboxChange = useCallback(async (newAssignment) => {
    if (!newAssignment || newAssignment.id === mainAssignment?.id) {
      return; // Stejná pokladna, nic nedělat
    }

    // Nastavit novou pokladnu
    setMainAssignment(newAssignment);

    // 🆕 Uložit výběr pokladny do localStorage (hlavně pro adminy)
    try {
      const saveData = {
        id: newAssignment.id,
        cislo_pokladny: newAssignment.cislo_pokladny,
        uzivatel_id: newAssignment.uzivatel_id
      };
      localStorage.setItem('cashbook_selector_cashbox', JSON.stringify(saveData));
    } catch (err) {
      // Tichá chyba - není kritická
    }

    // Vymazat aktuální data
    setCashBookEntries([]);
    setCurrentBookId(null);
    setCarryOverAmount(0);

    // Force reload - data se načtou automaticky v useEffect který sleduje mainAssignment
    showToast(`Přepnuto na pokladnu ${newAssignment.cislo_pokladny} - ${newAssignment.nazev_pracoviste || newAssignment.nazev}`, 'success');
  }, [mainAssignment, showToast]);

  // Handler pro tlačítko "Přidat nový řádek" - stejná logika jako Shift+Insert
  const handleAddNewRow = () => {
    // Najít editovaný řádek
    const editingEntry = cashBookEntries.find(entry => entry.isEditing);

    if (editingEntry) {
      // Kontrola, zda je řádek prázdný
      const isEmpty = (
        !editingEntry.documentNumber &&
        !editingEntry.description &&
        !editingEntry.person &&
        !editingEntry.income &&
        !editingEntry.expense &&
        !editingEntry.lpCode &&
        !editingEntry.note
      );

      if (isEmpty) {
        // Prázdný řádek - jen přesuň focus na "Obsah zápisu"
        requestAnimationFrame(() => {
          const descriptionInput = document.querySelector(`input[data-entry-id="${editingEntry.id}"][data-field="description"]`);
          if (descriptionInput) {
            descriptionInput.focus();
          }
        });
      } else {
        // Řádek má nějaký obsah - ulož ho a přidej nový

        // ✅ OPTIMALIZACE: Synchronní update pomocí flushSync
        ReactDOM.flushSync(() => {
          // Ukonči editaci všech řádků (automaticky se uloží)
          setCashBookEntries(prev =>
            prev.map(entry => ({ ...entry, isEditing: false }))
          );
        });

        // Okamžitě ulož a přidej nový řádek
        autoSave();
        addNewEntry();
      }
    } else {
      // Žádný řádek není editován, rovnou přidej nový
      addNewEntry();
    }
  };

  // Odstranění řádku - otevře ConfirmDialog
  const removeEntry = (id) => {
    setEntryToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Potvrzení smazání řádku
  const handleConfirmDelete = async () => {
    if (entryToDelete) {
      const entry = cashBookEntries.find(e => e.id === entryToDelete);

      // Odstranit z frontendu
      setCashBookEntries(prev => prev.filter(entry => entry.id !== entryToDelete));

      // Pokud má DB ID, smazat i z DB
      if (entry?.db_id) {
        try {
          await cashbookAPI.deleteEntry(entry.db_id);
          showToast('Položka byla smazána z databáze', 'success');
        } catch (error) {
          console.error('❌ Chyba při mazání z DB:', error);
          showToast('Chyba při mazání z databáze', 'error');
        }
      } else {
        showToast('Položka byla odstraněna', 'success');
      }

      // Uložit změny do localStorage
      const updatedEntries = cashBookEntries.filter(e => e.id !== entryToDelete);
      saveToLocalStorage(updatedEntries, bookStatus, carryOverAmount);
    }
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  // Zrušení smazání řádku
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  // Zapnutí editace řádku
  const startEditing = (id) => {
    setCashBookEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, isEditing: true } : entry
      )
    );
  };

  // Ukončení editace řádku
  const stopEditing = async (id) => {
    const editedEntry = cashBookEntries.find(e => e.id === id);
    if (!editedEntry) return;

    // 🔧 VALIDACE: Pokud je entry prázdná (nemá popis), zrušit ji místo ukládání
    const isEmpty = !editedEntry.description?.trim() && 
                    !editedEntry.income && 
                    !editedEntry.expense && 
                    (!editedEntry.detailItems || editedEntry.detailItems.length === 0);
    
    if (isEmpty) {
      // Pokud je to nový záznam (nemá db_id), smazat ho
      if (!editedEntry.db_id) {
        setCashBookEntries(prev => {
          const filtered = prev.filter(entry => entry.id !== id);
          
          // Uložit změny do localStorage
          const dataToSave = {
            entries: filtered.map(entry => ({ ...entry, isEditing: false })),
            carryOverAmount: carryOverAmount,
            lastModified: new Date().toISOString()
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
          
          return filtered;
        });
        return;
      } else {
        // Pokud existuje v DB, jen zrušit editaci (obnovit původní data)
        cancelEditing(id);
        return;
      }
    }

    // ✅ VALIDACE: Zkontrolovat, jestli prefix čísla dokladu odpovídá typu (příjem/výdaj)
    let documentNumber = editedEntry.documentNumber;
    const hasIncome = editedEntry.income && editedEntry.income > 0;
    const hasExpense = editedEntry.expense && editedEntry.expense > 0;
    let typeChanged = false;

    // 🆕 Pokud nemá číslo dokladu a má příjem/výdaj, vygenerovat nové číslo
    if (!documentNumber && (hasIncome || hasExpense)) {
      const shouldBeP = hasIncome && !hasExpense;
      const shouldBeV = hasExpense && !hasIncome;

      if (shouldBeP) {
        // Vygenerovat nové P číslo
        const currentMonthPNumbers = cashBookEntries
          .filter(e => e.id !== id && e.documentNumber?.startsWith('P'))
          .map(e => parseInt(e.documentNumber.substring(1)) || 0);

        let nextP;
        if (currentMonthPNumbers.length > 0) {
          nextP = Math.max(...currentMonthPNumbers) + 1;
        } else {
          const { lastP } = await getLastDocumentNumbersFromPreviousMonth();
          nextP = lastP + 1;
        }

        documentNumber = `P${String(nextP).padStart(3, '0')}`;
        typeChanged = true;
        console.log(`✨ Nová entry - vygenerováno číslo: ${documentNumber}`);

      } else if (shouldBeV) {
        // Vygenerovat nové V číslo
        const currentMonthVNumbers = cashBookEntries
          .filter(e => e.id !== id && e.documentNumber?.startsWith('V'))
          .map(e => parseInt(e.documentNumber.substring(1)) || 0);

        let nextV;
        if (currentMonthVNumbers.length > 0) {
          nextV = Math.max(...currentMonthVNumbers) + 1;
        } else {
          const { lastV } = await getLastDocumentNumbersFromPreviousMonth();
          nextV = lastV + 1;
        }

        documentNumber = `V${String(nextV).padStart(3, '0')}`;
        typeChanged = true;
        console.log(`✨ Nová entry - vygenerováno číslo: ${documentNumber}`);
      }
    }

    // Validace existujícího čísla dokladu
    if (documentNumber && !typeChanged) {
      const currentPrefix = documentNumber.charAt(0);
      const shouldBeP = hasIncome && !hasExpense;
      const shouldBeV = hasExpense && !hasIncome;

      // Pokud je prefix špatný, opravit ho
      if (shouldBeP && currentPrefix !== 'P') {
        // Změna z V na P - vygenerovat nové P číslo
        // 1. Najít nejvyšší P číslo v aktuálním měsíci
        const currentMonthPNumbers = cashBookEntries
          .filter(e => e.id !== id && e.documentNumber?.startsWith('P'))
          .map(e => parseInt(e.documentNumber.substring(1)) || 0);

        let nextP;
        if (currentMonthPNumbers.length > 0) {
          // Pokud už máme P doklady v tomto měsíci, pokračuj od nejvyššího
          nextP = Math.max(...currentMonthPNumbers) + 1;
        } else {
          // Pokud ještě nemáme žádné P doklady, načti poslední z předchozího měsíce
          const { lastP } = await getLastDocumentNumbersFromPreviousMonth();
          nextP = lastP + 1;
        }

        documentNumber = `P${String(nextP).padStart(3, '0')}`;
        typeChanged = true;
        console.log(`🔄 Změna typu: V → P, nové číslo: ${documentNumber}`);
        showToast(`Změna typu dokladu: výdaj → příjem. Nové číslo: ${documentNumber}`, 'info');

      } else if (shouldBeV && currentPrefix !== 'V') {
        // Změna z P na V - vygenerovat nové V číslo
        // 1. Najít nejvyšší V číslo v aktuálním měsíci
        const currentMonthVNumbers = cashBookEntries
          .filter(e => e.id !== id && e.documentNumber?.startsWith('V'))
          .map(e => parseInt(e.documentNumber.substring(1)) || 0);

        let nextV;
        if (currentMonthVNumbers.length > 0) {
          // Pokud už máme V doklady v tomto měsíci, pokračuj od nejvyššího
          nextV = Math.max(...currentMonthVNumbers) + 1;
        } else {
          // Pokud ještě nemáme žádné V doklady, načti poslední z předchozího měsíce
          const { lastV } = await getLastDocumentNumbersFromPreviousMonth();
          nextV = lastV + 1;
        }

        documentNumber = `V${String(nextV).padStart(3, '0')}`;
        typeChanged = true;
        console.log(`🔄 Změna typu: P → V, nové číslo: ${documentNumber}`);
        showToast(`Změna typu dokladu: příjem → výdaj. Nové číslo: ${documentNumber}`, 'info');
      }
    }

    // Označit entry jako změněnou
    const updatedEntry = {
      ...editedEntry,
      documentNumber, // Použít opravené číslo dokladu
      isEditing: false,
      changed: true,
      sync_status: 'pending',
      last_modified_local: new Date().toISOString()
    };

    setCashBookEntries(prev => {
      const updatedEntries = prev.map(entry =>
        entry.id === id ? updatedEntry : entry
      );

      // ✅ Uložit změny do localStorage ihned (backup)
      saveToLocalStorage(updatedEntries, bookStatus, carryOverAmount);

      return updatedEntries;
    });

    setLastSavedEntryId(id);

    setTimeout(() => {
      setLastSavedEntryId(null);
    }, 5000);

    // 🆕 Sync do DB na pozadí
    if (currentBookId) {
      try {
        const payload = transformFrontendEntryToDB(updatedEntry, currentBookId);

        if (updatedEntry.db_id) {
          // Update existující entry
          console.log('🔹 UPDATE payload:', { entry_id: updatedEntry.db_id, cislo_dokladu: payload.cislo_dokladu, typeChanged });
          const updateResult = await cashbookAPI.updateEntry(updatedEntry.db_id, payload);

          // ✅ Pokud se změnil typ (typeChanged), použít číslo z frontendu, ne z backendu
          if (updateResult.status === 'ok') {
            console.log('🔹 UPDATE result:', { backend_cislo: updateResult.data?.entry?.cislo_dokladu, frontend_cislo: documentNumber, typeChanged });
            setCashBookEntries(prev => prev.map(e =>
              e.id === id ? {
                ...e,
                // Pokud byl změněn typ, použít nové číslo z frontendu, jinak použít číslo z backendu
                documentNumber: typeChanged ? documentNumber : (updateResult.data?.entry?.cislo_dokladu || e.documentNumber),
                sync_status: 'synced',
                changed: false,
                last_synced_at: new Date().toISOString()
              } : e
            ));
          }
        } else {
          // Create novou entry
          console.log('🔹 CREATE payload:', { cislo_dokladu: payload.cislo_dokladu, typeChanged });
          const result = await cashbookAPI.createEntry(payload);

          if (result.status === 'ok' && result.data?.entry) {
            console.log('🔹 CREATE result:', { backend_cislo: result.data?.entry?.cislo_dokladu, frontend_cislo: documentNumber });
            // Aktualizovat s DB ID a číslem dokladu
            // ✅ Pokud jsme vygenerovali číslo na frontendu (typeChanged), použít to, jinak číslo z backendu
            setCashBookEntries(prev => prev.map(e =>
              e.id === id ? {
                ...e,
                db_id: result.data.entry.id,
                documentNumber: typeChanged ? documentNumber : (result.data.entry.cislo_dokladu || documentNumber),
                sync_status: 'synced',
                changed: false,
                last_synced_at: new Date().toISOString()
              } : e
            ));
          }
        }

        // Update totals v DB
        const totalIncome = cashBookEntries.reduce((sum, e) => sum + (e.income || 0), 0);
        const totalExpenses = cashBookEntries.reduce((sum, e) => sum + (e.expense || 0), 0);
        const endBalance = carryOverAmount + totalIncome - totalExpenses;

        await cashbookAPI.updateBook(currentBookId, {
          celkove_prijmy: totalIncome,
          celkove_vydaje: totalExpenses,
          koncovy_stav: endBalance
        });

      } catch (error) {
        console.error('❌ Chyba při ukládání do DB:', error);
        showToast('Uloženo lokálně, sync do DB selhala: ' + error.message, 'warning');

        // Označit jako error
        setCashBookEntries(prev => prev.map(e =>
          e.id === id ? { ...e, sync_status: 'error' } : e
        ));
      }
    }
  };

  // Zrušení editace řádku bez uložení (ESC)
  const cancelEditing = (id) => {
    const originalEntry = cashBookEntries.find(entry => entry.id === id);

    // Pokud je to nový řádek (ještě neuložený), úplně ho smažeme
    if (originalEntry && !originalEntry.description && !originalEntry.documentNumber) {
      setCashBookEntries(prev => {
        const filtered = prev.filter(entry => entry.id !== id);

        // Uložit změny do localStorage ihned po smazání
        const dataToSave = {
          entries: filtered.map(entry => ({ ...entry, isEditing: false })),
          carryOverAmount: carryOverAmount,
          lastModified: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

        return filtered;
      });
    } else {
      // Jinak jen ukončíme editaci
      setCashBookEntries(prev =>
        prev.map(entry =>
          entry.id === id ? { ...entry, isEditing: false } : entry
        )
      );
    }
  };

  // Handler pro Shift+Enter (uložit) a ESC (zrušit)
  const handleKeyDown = (e, entryId) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      stopEditing(entryId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing(entryId);
    }
  };

  // Aktualizace hodnoty v řádku s validacemi
  const updateEntry = (id, field, value) => {
    setCashBookEntries(prev => {
      const newEntries = prev.map(entry => {
        if (entry.id !== id) return entry;

        let processedValue = value;

        // Validace pro různé typy polí
        if (field === 'income' || field === 'expense') {
          // Zajistit, že druhé pole je prázdné
          // Číslo dokladu se přepočítá automaticky v derived state
          const updatedEntry = { ...entry, [field]: processedValue };
          if (field === 'income') {
            updatedEntry.expense = null;
          } else {
            updatedEntry.income = null;
          }
          return updatedEntry;
        }

        // Validace data
        if (field === 'date') {
          const today = new Date();
          const entryDate = new Date(value);

          // Varování pokud je datum v budoucnosti
          if (entryDate > today) {
            showToast('Pozor: Datum je v budoucnosti', 'warning');
          }
        }

        // Poznámka: Číslo dokladu se negeneruje manuálně - je automatické

        return { ...entry, [field]: processedValue };
      });

      // Přepočítání zůstatků pro všechny záznamy
      if (field === 'income' || field === 'expense') {
        let runningBalance = initialBalance;
        return newEntries.map(entry => {
          if (entry.income) runningBalance += entry.income;
          if (entry.expense) runningBalance -= entry.expense;
          return { ...entry, balance: runningBalance };
        });
      }

      return newEntries;
    });
  };

  // Auto-save do localStorage bez ukončení editace (pro onBlur)
  const autoSave = () => {
    try {
      const dataToSave = {
        entries: cashBookEntries,
        carryOverAmount: carryOverAmount,
        lastModified: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Chyba při auto-ukládání do localStorage:', error);
    }
  };

  // Export do různých formátů
  const exportData = (format) => {
    try {
      const filename = `Pokladni_kniha_${organizationInfo.workplace}_${organizationInfo.month}_${organizationInfo.year}`;

      if (format === 'CSV') {
        exportToCSV(filename);
      } else if (format === 'PDF') {
        generatePDFReport(filename);
      }
    } catch (error) {
      showToast('Chyba při exportu dat', 'error');
    }
  };

  // Export do CSV
  const exportToCSV = (filename) => {
    // Hlavička tabulky
    const headers = [
      'Řádek', 'Datum', 'Číslo dokladu', 'Obsah zápisu', 'Komu/Od koho',
      'Příjmy (Kč)', 'Výdaje (Kč)', 'Zůstatek (Kč)', 'LP kód', 'Poznámka'
    ];

    // Data řádků
    const rows = cashBookEntries.map((entry, index) => [
      index + 1,
      formatDate(entry.date),
      entry.documentNumber || '',
      `"${(entry.description || '').replace(/"/g, '""')}"`, // Escapování uvozovek
      `"${(entry.person || '').replace(/"/g, '""')}"`,
      entry.income ? entry.income.toFixed(2) : '',
      entry.expense ? entry.expense.toFixed(2) : '',
      entry.balance.toFixed(2),
      entry.lpCode || '',
      `"${(entry.note || '').replace(/"/g, '""')}"`
    ]);

    // Sestavení CSV obsahu (hlavička + řádky)
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // BOM pro správné zobrazení češtiny v Excelu
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Stažení souboru
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast('CSV soubor byl exportován', 'success');
  };

  // Generování PDF reportu
  const generatePDFReport = async (filename) => {
    try {
      // Příprava informací o generátorovi PDF
      const generatedBy = {
        fullName: `${userDetail?.titul_pred || ''} ${userDetail?.jmeno || ''} ${userDetail?.prijmeni || ''} ${userDetail?.titul_za || ''}`.trim(),
        usekZkr: userDetail?.usek_zkr?.[0] || '',
        lokalita: getUserLocation(),
      };

      // Vytvoření PDF dokumentu pomocí @react-pdf/renderer
      const blob = await pdf(
        <PokladniKnihaPDF
          organizationInfo={{
            organizationName: organizationInfo.organizationName,
            workplace: getUserLocation(),
            cashboxNumber: organizationInfo.cashboxNumber,
            month: organizationInfo.month,
            year: organizationInfo.year,
          }}
          carryOverAmount={carryOverAmount}
          totals={totals}
          entries={cashBookEntries}
          generatedBy={generatedBy}
          bookStatus={{
            status: bookStatus,
            closedDate: bookStatusMetadata?.closedDate,
            closedBy: bookStatusMetadata?.closedBy,
            lockedDate: bookStatusMetadata?.lockedDate,
            lockedBy: bookStatusMetadata?.lockedBy,
          }}
        />
      ).toBlob();

      // Vytvoření URL pro blob a stažení
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('PDF report byl úspěšně vygenerován', 'success');
    } catch (error) {
      console.error('Chyba při generování PDF:', error);
      showToast('Chyba při generování PDF reportu', 'error');
    }
  };

  // Tisk pomocí PDF (otevře PDF v novém okně pro tisk)
  const printPDFReport = async () => {
    try {
      // Příprava informací o generátorovi PDF
      const generatedBy = {
        fullName: `${userDetail?.titul_pred || ''} ${userDetail?.jmeno || ''} ${userDetail?.prijmeni || ''} ${userDetail?.titul_za || ''}`.trim(),
        usekZkr: userDetail?.usek_zkr?.[0] || '',
        lokalita: getUserLocation(),
      };

      // Vytvoření PDF dokumentu pomocí @react-pdf/renderer
      const blob = await pdf(
        <PokladniKnihaPDF
          organizationInfo={{
            organizationName: organizationInfo.organizationName,
            workplace: getUserLocation(),
            cashboxNumber: organizationInfo.cashboxNumber,
            month: organizationInfo.month,
            year: organizationInfo.year,
          }}
          carryOverAmount={carryOverAmount}
          totals={totals}
          entries={cashBookEntries}
          generatedBy={generatedBy}
          bookStatus={{
            status: bookStatus,
            closedDate: bookStatusMetadata?.closedDate,
            closedBy: bookStatusMetadata?.closedBy,
            lockedDate: bookStatusMetadata?.lockedDate,
            lockedBy: bookStatusMetadata?.lockedBy,
          }}
        />
      ).toBlob();

      // Vytvoření URL pro blob a otevření v novém okně pro tisk
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        // Počkat než se PDF načte a otevřít tiskový dialog
        printWindow.onload = () => {
          printWindow.print();
          // URL se uvolní až po zavření okna
          printWindow.onafterprint = () => {
            URL.revokeObjectURL(url);
          };
        };
      } else {
        // Pokud se nepodařilo otevřít okno, uvolni URL
        URL.revokeObjectURL(url);
        showToast('Nepodařilo se otevřít tiskový dialog. Zkontrolujte blokování vyskakovacích oken.', 'error');
      }
    } catch (error) {
      console.error('Chyba při tisku PDF:', error);
      showToast('Chyba při přípravě tisku', 'error');
    }
  };

  // ============================================================================
  // HIERARCHIE OPRÁVNĚNÍ PRO POKLADNÍ KNIHU
  // ============================================================================
  //
  // Hierarchie (sestupně):
  // 1. SUPERADMIN/ADMINISTRATOR → může vše
  // 2. CASH_BOOK_MANAGE → kompletní správa všech pokladních knih
  // 3. *_ALL oprávnění → přístup ke všem pokladním knihám
  // 4. *_OWN oprávnění → přístup pouze ke vlastní pokladní knize
  //
  // Vlastnictví pokladní knihy = celá kniha za měsíc jednoho uživatele
  // ============================================================================

  // 1. Kontrola superadmin/admin role
  const isSuperAdmin = userDetail?.roles?.some(r =>
    r.kod_role === 'SUPERADMIN' || r.kod_role === 'ADMINISTRATOR'
  );

  // 2. Kontrola MANAGE oprávnění (může vše)
  const hasManagePermission = hasPermission && hasPermission('CASH_BOOK_MANAGE');

  // 3. Kontrola _ALL oprávnění (všechny pokladní knihy)
  const canReadAll = hasPermission && hasPermission('CASH_BOOK_READ_ALL');
  const canEditAll = hasPermission && hasPermission('CASH_BOOK_EDIT_ALL');
  const canDeleteAll = hasPermission && hasPermission('CASH_BOOK_DELETE_ALL');
  const canExportAll = hasPermission && hasPermission('CASH_BOOK_EXPORT_ALL');

  // 4. Kontrola _OWN oprávnění (pouze vlastní pokladna)
  const canReadOwn = hasPermission && hasPermission('CASH_BOOK_READ_OWN');
  const canEditOwn = hasPermission && hasPermission('CASH_BOOK_EDIT_OWN');
  const canDeleteOwn = hasPermission && hasPermission('CASH_BOOK_DELETE_OWN');
  const canExportOwn = hasPermission && hasPermission('CASH_BOOK_EXPORT_OWN');

  // 5. Kontrola CREATE oprávnění (společné pro vlastní i všechny)
  const canCreate = hasPermission && hasPermission('CASH_BOOK_CREATE');

  // 6. Zjistit, jestli aktuálně zobrazená pokladna patří přihlášenému uživateli
  // UPRAVENO: Kontroluje nejen vlastníka, ale i přiřazení jako zástupce
  const isCurrentUserCashbook = useMemo(() => {
    if (!mainAssignment || !userDetail) return false;

    // Kontrola 1: Je uživatel vlastníkem této pokladny?
    const isOwner = String(mainAssignment.uzivatel_id) === String(userDetail.id);

    // Kontrola 2: Je uživatel přiřazen k této pokladně (hlavní nebo zástupce)?
    const isAssignedToThisCashbox = userAssignments?.some(assignment => {
      return String(assignment.pokladna_id) === String(mainAssignment.pokladna_id) &&
             String(assignment.uzivatel_id) === String(userDetail.id);
    });

    return isOwner || isAssignedToThisCashbox;
  }, [mainAssignment, userDetail, userAssignments]);

  // 🎯 CENTRÁLNÍ FUNKCE PRO KONTROLU EDITOVATELNOSTI
  // Řídí VŠE - stav knihy (uzavřená/zamčená) + oprávnění
  const isBookEditable = useMemo(() => {
    // 1. Kontrola stavu knihy - uzavřená nebo zamčená
    const isLocked = bookStatus === 'uzavrena_uzivatelem' || bookStatus === 'zamknuta_spravcem';

    // 2. ❌ ZAMČENÁ/UZAVŘENÁ KNIHA → NIKDO NEMŮŽE EDITOVAT!
    //    Admin/MANAGE může jen ODEMKNOUT, ale dokud je zamčená, NESMÍ editovat položky!
    if (isLocked) {
      return false;
    }

    // 3. Kniha je AKTIVNÍ → kontrola běžných oprávnění
    // Může editovat: SuperAdmin, MANAGE, EDIT_ALL, nebo (EDIT_OWN + vlastní pokladna)
    return isSuperAdmin ||
           hasManagePermission ||
           canEditAll ||
           (canEditOwn && isCurrentUserCashbook);
  }, [bookStatus, isSuperAdmin, hasManagePermission, canEditAll, canEditOwn, isCurrentUserCashbook]);

  // 🎯 Odvozené hodnoty z centrální funkce
  const canViewCashBook = isSuperAdmin || hasManagePermission || canReadAll || (canReadOwn && isCurrentUserCashbook);
  const canActuallyEdit = isBookEditable;
  const canActuallyDelete = isBookEditable; // Stejná logika jako edit
  const canActuallyCreate = isBookEditable; // Stejná logika jako edit
  const canExportCashBook = isSuperAdmin || hasManagePermission || canExportAll || (canExportOwn && isCurrentUserCashbook);

  // Pro kompatibilitu - budget oprávnění zůstává
  const canEditBudget = hasPermission && hasPermission('BUDGET_MANAGE');

  // 🆕 Helper: Kontrola, zda lze měsíc uzavřít/zamknout (musí být ukončený)
  // Např. listopad 2025 lze uzavřít až 1.12.2025
  const canCloseCurrentPeriod = useMemo(() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1; // 1-12

    // Pokud je zobrazený měsíc v minulosti, lze uzavřít
    if (currentYear < todayYear) return true;
    if (currentYear === todayYear && currentMonth < todayMonth) return true;

    // Pokud je zobrazený měsíc aktuální nebo budoucí, NELZE uzavřít
    return false;
  }, [currentYear, currentMonth]);

  // 🆕 KROK 3: Funkce pro workflow uzavírání - OTEVŘE DIALOG
  const handleCloseMonth = () => {
    if (!hasManagePermission && !(canEditOwn && isCurrentUserCashbook)) {
      showToast('Nemáte oprávnění uzavřít tento měsíc', 'error');
      return;
    }

    if (!canCloseCurrentPeriod) {
      showToast('Nelze uzavřít aktuální měsíc. Uzavřít lze až od 1. dne následujícího měsíce.', 'warning');
      return;
    }

    if (!currentBookId) {
      showToast('Chyba: Kniha není načtena', 'error');
      return;
    }

    // Otevřít confirm dialog
    setCloseMonthDialogOpen(true);
  };

  // 🆕 Přečíslování všech entries v aktuálním a následujících měsících
  const renumberAllFutureMonths = async () => {
    if (!mainAssignment?.uzivatel_id) return;

    try {
      // Získat všechny knihy od aktuálního měsíce do budoucnosti
      const allBooksResult = await cashbookAPI.listBooks(mainAssignment.uzivatel_id);

      if (allBooksResult.status !== 'ok') {
        throw new Error('Backend vrátil chybu: ' + (allBooksResult.message || 'neznámá'));
      }

      // Backend může vracet různé struktury - zkusme najít pole knih
      let booksArray = null;

      if (Array.isArray(allBooksResult.data)) {
        booksArray = allBooksResult.data;
      } else if (allBooksResult.data?.books && Array.isArray(allBooksResult.data.books)) {
        booksArray = allBooksResult.data.books;
      } else if (allBooksResult.books && Array.isArray(allBooksResult.books)) {
        booksArray = allBooksResult.books;
      }

      if (!booksArray) {
        console.error('❌ Nepodařilo se najít pole knih v odpovědi:', allBooksResult);
        throw new Error('Backend nevrátil pole knih');
      }

      // Filtrovat knihy >= aktuální měsíc a seřadit chronologicky
      const futureBooks = booksArray.filter(book => {
        const bookDate = new Date(book.rok, book.mesic - 1);
        const currentDate = new Date(currentYear, currentMonth - 1);
        return bookDate >= currentDate;
      }).sort((a, b) => {
        if (a.rok !== b.rok) return a.rok - b.rok;
        return a.mesic - b.mesic;
      });

      // ✅ Nejprve zjistit poslední P/V čísla z PŘEDCHOZÍHO měsíce (před aktuálním)
      const { lastP: prevLastP, lastV: prevLastV } = await getLastDocumentNumbersFromPreviousMonth();
      let lastP = prevLastP;
      let lastV = prevLastV;

      // Projít všechny knihy chronologicky
      for (const book of futureBooks) {

        // Načíst všechny entries pro tuto knihu pomocí getBook()
        const bookResult = await cashbookAPI.getBook(book.id, false); // force_recalc = false

        if (bookResult.status !== 'ok' || !bookResult.data?.entries) {
          console.warn(`⚠️ Nepodařilo se načíst entries pro knihu ${book.id}`);
          continue;
        }

        const entries = bookResult.data.entries;

        // Seřadit entries podle data
        const sortedEntries = [...entries].sort((a, b) => {
          const dateA = new Date(a.datum_zapisu);
          const dateB = new Date(b.datum_zapisu);
          return dateA - dateB;
        });

        // Přečíslovat entries
        for (const entry of sortedEntries) {
          const hasIncome = entry.castka_prijem && parseFloat(entry.castka_prijem) > 0;
          const hasExpense = entry.castka_vydaj && parseFloat(entry.castka_vydaj) > 0;

          let newNumber = null;

          if (hasIncome && !hasExpense) {
            // Příjem - použít P
            lastP++;
            newNumber = `P${String(lastP).padStart(3, '0')}`;
          } else if (hasExpense && !hasIncome) {
            // Výdaj - použít V
            lastV++;
            newNumber = `V${String(lastV).padStart(3, '0')}`;
          }

          // Pokud se číslo změnilo, aktualizovat v DB
          if (newNumber && newNumber !== entry.cislo_dokladu) {
            console.log(`  🔄 ${entry.cislo_dokladu} → ${newNumber}`);
            // ✅ FIX: RAW data z API mají 'id', ne 'db_id'
            await cashbookAPI.updateEntry(entry.id, {
              cislo_dokladu: newNumber
            });
          }
        }
      }

      return { success: true, lastP, lastV };

    } catch (error) {
      console.error('❌ Chyba při přečíslování:', error);
      return { success: false, error: error.message };
    }
  };

  // 🆕 Potvrzení uzavření měsíce (voláno z dialogu)
  const confirmCloseMonth = async () => {
    setCloseMonthDialogOpen(false);

    try {
      // 🔄 KROK 0: Zkontrolovat aktuální stav knihy před operací
      const bookCheckResult = await cashbookAPI.getBook(currentBookId, false);
      if (bookCheckResult.status === 'ok' && bookCheckResult.data?.stav_knihy) {
        const currentState = bookCheckResult.data.stav_knihy;
        
        if (currentState !== 'aktivni') {
          // Kniha už je uzavřená - synchronizovat stav ve frontendu
          setBookStatus(currentState);
          showToast(`Kniha je již ve stavu: ${currentState}`, 'warning');
          return;
        }
      }

      // 🔄 KROK 1: Nejprve přečíslovat všechny knihy od aktuální do budoucna
      showToast('Probíhá přečíslování dokladů...', 'info');
      const renumberResult = await renumberAllFutureMonths();

      if (!renumberResult.success) {
        throw new Error(`Chyba při přečíslování: ${renumberResult.error}`);
      }

      showToast(`Přečíslování dokončeno (P: ${renumberResult.lastP}, V: ${renumberResult.lastV})`, 'success');

      // 🔄 KROK 2: Znovu načíst aktuální měsíc, aby se zobrazily nové číslování
      const reloadResult = await cashbookAPI.getBook(currentBookId, false);
      if (reloadResult.status === 'ok' && reloadResult.data?.entries) {
        const transformedEntries = reloadResult.data.entries.map(transformDBEntryToFrontend);
        setCashBookEntries(transformedEntries);
      }

      // 🔄 KROK 3: Uzavřít měsíc
      const result = await cashbookAPI.closeMonth(currentBookId);

      if (result.status === 'ok') {
        setBookStatus('uzavrena_uzivatelem');
        showToast('Měsíc byl úspěšně uzavřen', 'success');

        // Synchronizovat do localStorage
        saveToLocalStorage(cashBookEntries, 'uzavrena_uzivatelem', carryOverAmount);
      } else {
        throw new Error(result.message || 'Neznámá chyba');
      }
    } catch (error) {
      console.error('❌ Chyba při uzavírání měsíce:', error);
      showToast('Chyba při uzavírání měsíce: ' + error.message, 'error');
      
      // 🔄 Po chybě znovu načíst stav knihy z DB
      try {
        const bookCheckResult = await cashbookAPI.getBook(currentBookId, false);
        if (bookCheckResult.status === 'ok' && bookCheckResult.data?.stav_knihy) {
          setBookStatus(bookCheckResult.data.stav_knihy);
        }
      } catch (recheckError) {
        console.error('Nepodařilo se znovu načíst stav knihy:', recheckError);
      }
    }
  };

  const handleLockBook = () => {
    if (!hasManagePermission) {
      showToast('Nemáte oprávnění zamknout knihu', 'error');
      return;
    }

    if (!canCloseCurrentPeriod) {
      showToast('Nelze zamknout aktuální měsíc. Zamknout lze až od 1. dne následujícího měsíce.', 'warning');
      return;
    }

    if (!currentBookId) {
      showToast('Chyba: Kniha není načtena', 'error');
      return;
    }

    // Otevřít confirm dialog
    setLockBookDialogOpen(true);
  };

  // 🆕 Potvrzení zamknutí měsíce (voláno z dialogu)
  const confirmLockBook = async () => {
    setLockBookDialogOpen(false);

    try {
      // 🆕 Volat skutečné API
      const result = await cashbookAPI.lockBook(currentBookId);

      if (result.status === 'ok') {
        setBookStatus('zamknuta_spravcem');
        showToast('Kniha byla zamčena správcem', 'success');

        // Synchronizovat do localStorage
        saveToLocalStorage(cashBookEntries, 'zamknuta_spravcem', carryOverAmount);
      } else {
        throw new Error(result.message || 'Neznámá chyba');
      }
    } catch (error) {
      console.error('❌ Chyba při zamykání knihy:', error);
      showToast('Chyba při zamykání knihy: ' + error.message, 'error');
    }
  };

  const handleUnlockBook = () => {
    // ✅ Admin s MANAGE může odemknout cokoli (uzavrena_uzivatelem i zamknuta_spravcem)
    // ✅ Běžný uživatel s EDIT_OWN může odemknout jen svou vlastní uzavrena_uzivatelem knihu
    // ❌ Běžný uživatel NEMŮŽE odemknout zamknuta_spravcem (ani svou)

    if (bookStatus === 'zamknuta_spravcem' && !hasManagePermission) {
      showToast('Kniha je zamčená správcem. Kontaktujte administrátora.', 'error');
      return;
    }

    if (bookStatus === 'uzavrena_uzivatelem' && !hasManagePermission && !(canEditOwn && isCurrentUserCashbook)) {
      showToast('Nemáte oprávnění odemknout tento měsíc', 'error');
      return;
    }

    if (!currentBookId) {
      showToast('Chyba: Kniha není načtena', 'error');
      return;
    }

    // Otevřít příslušný dialog podle stavu knihy
    if (bookStatus === 'zamknuta_spravcem') {
      setUnlockBookDialogOpen(true);
    } else if (bookStatus === 'uzavrena_uzivatelem') {
      setReopenMonthDialogOpen(true);
    }
  };

  // ✅ Confirm handler pro otevření měsíce (uzavrena_uzivatelem)
  const confirmReopenMonth = async () => {
    setReopenMonthDialogOpen(false);

    try {
      const result = await cashbookAPI.reopenBook(currentBookId);

      if (result.status === 'ok') {
        setBookStatus('aktivni');
        showToast('Měsíc byl znovu otevřen', 'success');
        saveToLocalStorage(cashBookEntries, 'aktivni', carryOverAmount);
      } else {
        throw new Error(result.message || 'Neznámá chyba');
      }
    } catch (error) {
      console.error('❌ Chyba při otevírání měsíce:', error);
      showToast('Chyba při otevírání měsíce: ' + error.message, 'error');
    }
  };

  // ✅ Confirm handler pro odemknutí zamčeného měsíce (zamknuta_spravcem)
  const confirmUnlockBook = async () => {
    setUnlockBookDialogOpen(false);

    try {
      const result = await cashbookAPI.reopenBook(currentBookId);

      if (result.status === 'ok') {
        setBookStatus('aktivni');
        showToast('Měsíc byl odemčen administrátorem', 'success');
        saveToLocalStorage(cashBookEntries, 'aktivni', carryOverAmount);
      } else {
        throw new Error(result.message || 'Neznámá chyba');
      }
    } catch (error) {
      console.error('❌ Chyba při odemykání měsíce:', error);
      showToast('Chyba při odemykání měsíce: ' + error.message, 'error');
    }
  };

  // Globální handler pro Shift+Insert (musí být až po definici canActuallyCreate)
  useEffect(() => {
    const handleGlobalKeyDown = async (e) => {
      if (e.shiftKey && e.key === 'Insert' && canActuallyCreate) {
        e.preventDefault();

        // Najít editovaný řádek
        const editingEntry = cashBookEntries.find(entry => entry.isEditing);

        if (editingEntry) {
          // ✅ NOVĚ: Ulož aktuální řádek do DB (stejně jako Shift+Enter)
          await stopEditing(editingEntry.id);

          // ✅ OPTIMALIZACE: Okamžitě přidej nový řádek
          addNewEntry();

          // Focus na první pole nového řádku pomocí RAF
          requestAnimationFrame(() => {
            const firstInput = document.querySelector('.entry-row:last-child input');
            if (firstInput) {
              firstInput.focus();
            }
          });
        } else {
          // Žádný řádek není editován, rovnou přidej nový
          addNewEntry();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [canActuallyCreate, totals.currentBalance, cashBookEntries, autoSave, addNewEntry]);

  // 🆕 CASHBOOK V2: Loading state při načítání přiřazení
  // ⚠️ DŮLEŽITÉ: Kontrola oprávnění MUSÍ být až PO načtení přiřazení!
  if (assignmentLoading) {
    return (
      <PageContainer>
        <Header>
          <h1>
            <FontAwesomeIcon icon={faCalculator} />
            Pokladní kniha
          </h1>
          <p className="subtitle">Načítání...</p>
        </Header>
        <InfoPanel>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <FontAwesomeIcon icon={faCalculator} size="3x" style={{ color: '#3b82f6', marginBottom: '1rem' }} className="fa-spin" />
            <h3>Načítání přiřazení pokladny...</h3>
            <p>Prosím vyčkejte</p>
          </div>
        </InfoPanel>
      </PageContainer>
    );
  }

  // 🆕 CASHBOOK V2: Varování pokud uživatel nemá přiřazenou pokladnu
  if (!mainAssignment) {
    return (
      <PageContainer>
        <Header>
          <h1>
            <FontAwesomeIcon icon={faCalculator} />
            Pokladní kniha
          </h1>
          <p className="subtitle">Chyba konfigurace</p>
        </Header>
        <InfoPanel>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <FontAwesomeIcon icon={faInfoCircle} size="3x" style={{ color: '#f59e0b', marginBottom: '1rem' }} />
            <h3>Nemáte přiřazenou pokladnu</h3>
            <p>Pro práci s pokladní knihou musíte mít přiřazenou alespoň jednu pokladnu.</p>
            <p>Kontaktujte administrátora systému pro přiřazení pokladny.</p>
          </div>
        </InfoPanel>
      </PageContainer>
    );
  }

  // ⚠️ Pokud nemá oprávnění, zobraz varování (kontrola až po načtení přiřazení!)
  if (!canViewCashBook) {
    return (
      <PageContainer>
        <Header>
          <h1>
            <FontAwesomeIcon icon={faCalculator} />
            Pokladní kniha
          </h1>
          <p className="subtitle">Přístup odepřen</p>
        </Header>
        <InfoPanel>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <FontAwesomeIcon icon={faInfoCircle} size="3x" style={{ color: '#dc2626', marginBottom: '1rem' }} />
            <h3>Nedostatečná oprávnění</h3>
            <p>Pro přístup k pokladní knize potřebujete oprávnění CASH_BOOK_READ_OWN nebo vyšší.</p>
            <p>Kontaktujte správce systému pro udělení potřebných oprávnění.</p>
          </div>
        </InfoPanel>
      </PageContainer>
    );
  }

  return (
    <>
      <Global styles={printStyles} />
      <PageContainer>
        <Header className="no-print">
          <h1>
            <FontAwesomeIcon icon={faCalculator} />
            Pokladní kniha
          </h1>
          <p className="subtitle">
            {(() => {
              // ✅ Získat informace o vlastníkovi pokladny z book objektu (currentBookData)
              // Backend vrací vše z JOIN: uzivatel_jmeno_plne, lokalita_nazev, usek_nazev
              const userName = currentBookData?.uzivatel_jmeno_plne ||
                              currentBookData?.uzivatel_cele_jmeno ||
                              mainAssignment?.uzivatel_cele_jmeno ||
                              (mainAssignment?.uzivatel_jmeno && mainAssignment?.uzivatel_prijmeni
                                ? `${mainAssignment.uzivatel_jmeno} ${mainAssignment.uzivatel_prijmeni}`
                                : null);
              const lokalita = currentBookData?.lokalita_nazev || mainAssignment?.lokalita_nazev || mainAssignment?.lokalita_kod;
              const usek = currentBookData?.usek_nazev || mainAssignment?.usek_nazev;
              const cashboxNum = organizationInfo.cashboxNumber;
              const vpd = organizationInfo.cashboxVpd;
              const ppd = organizationInfo.cashboxPpd;

              return (
                <>
                  {userName ? `${userName} | ` : ''}
                  {lokalita && `${lokalita} | `}
                  {usek && `${usek} | `}
                  Pokladna č. {cashboxNum}
                  {vpd && ppd && ` | VPD: ${vpd} | PPD: ${ppd}`}
                </>
              );
            })()}
          </p>
        </Header>

        {/* 🆕 CASHBOX SELECTOR - Přepínání mezi pokladnami (jen pro uživatele s _ALL oprávněními) */}
        {canSeeAllCashboxes && !assignmentLoading && (
          <div className="no-print" style={{ marginBottom: '1rem' }}>
            <CashboxSelector
              currentCashbox={mainAssignment}
              userCashboxes={userAssignments}
              allCashboxes={allAssignments}
              permissions={cashbookPermissions}
              canSeeAllCashboxes={canSeeAllCashboxes}
              onCashboxChange={handleCashboxChange}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onPeriodChange={(year, month) => {
                setCurrentYear(year);
                setCurrentMonth(month);
              }}
            />
          </div>
        )}

        {/* 🆕 Sticky kompaktní přehled při scrollování */}
        <StickyCompactSummary $visible={showStickySummary}>
          <div className="compact-title">
            <FontAwesomeIcon icon={faCalculator} />
            Přehled pokladny - {organizationInfo.month} {organizationInfo.year}
            <BookStatusBadge status={bookStatus} />
          </div>
          <div className="compact-values">
            <div className="compact-item">
              <div className="compact-label">Převod</div>
              <div className="compact-value">{formatCurrency(carryOverAmount)}</div>
            </div>
            <div className="compact-item">
              <div className="compact-label">Příjmy</div>
              <div className="compact-value positive">{formatCurrency(totals.totalIncome)}</div>
            </div>
            <div className="compact-item">
              <div className="compact-label">Výdaje</div>
              <div className="compact-value negative">{formatCurrency(totals.totalExpenses)}</div>
            </div>
            <div className="compact-item">
              <div className="compact-label">Zůstatek</div>
              <div className={`compact-value ${totals.currentBalance >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(totals.currentBalance)}
              </div>
            </div>
            <div className="compact-item">
              <div className="compact-label">Počet operací</div>
              <div className="compact-value">{totals.entryCount}</div>
            </div>
          </div>
        </StickyCompactSummary>

        {/* Informační panel */}
        <InfoPanel className="no-print">
        <div className="organization-info">
          <div className="info-text">
            <h3>
              <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '0.5rem' }} />
              Přehled pokladny
              {/* 🆕 KROK 3: Status badge přímo u nadpisu */}
              <span style={{ marginLeft: '1rem', display: 'inline-flex', verticalAlign: 'middle' }}>
                <BookStatusBadge status={bookStatus} />
              </span>
            </h3>
            <p>Aktuální stav pokladní knihy za měsíc {organizationInfo.month} {organizationInfo.year}</p>
          </div>

          {/* 🆕 KROK 3: Workflow tlačítka vpravo */}
          {/* ✅ Zobrazit uživatelům s EDIT_OWN (jen pro vlastní knihu) nebo MANAGE (všechny knihy) */}
          {((canEditOwn && isCurrentUserCashbook) || hasManagePermission) && (
            <div className="info-actions">
              {bookStatus === 'aktivni' && (
                <ActionButton
                  type="button"
                  variant="warning"
                  onClick={handleCloseMonth}
                  disabled={!canCloseCurrentPeriod}
                  title={
                    !canCloseCurrentPeriod
                      ? `Nelze uzavřít aktuální měsíc. Uzavřít lze až od 1. dne následujícího měsíce.`
                      : "Uzavřít měsíc - knihu nebude možné editovat"
                  }
                >
                  <FontAwesomeIcon icon={faCheck} />
                  Uzavřít měsíc
                </ActionButton>
              )}

              {/* 🔒 Zamknout může jen správce - zobrazit i po uzavření měsíce */}
              {hasManagePermission && (bookStatus === 'aktivni' || bookStatus === 'uzavrena_uzivatelem') && (
                <ActionButton
                  type="button"
                  variant="danger"
                  onClick={handleLockBook}
                  disabled={!canCloseCurrentPeriod}
                  title={
                    !canCloseCurrentPeriod
                      ? `Nelze zamknout aktuální měsíc. Zamknout lze až od 1. dne následujícího měsíce.`
                      : "Zamknout knihu správcem - nelze editovat ani odemknout"
                  }
                >
                  🔒 Zamknout
                </ActionButton>
              )}

              {/* Otevřít měsíc může běžný uživatel (uzavrena_uzivatelem) nebo správce (vše) */}
              {bookStatus === 'uzavrena_uzivatelem' && (
                <ActionButton
                  type="button"
                  variant="primary"
                  $filled
                  onClick={handleUnlockBook}
                  title="Otevřít měsíc pro editaci"
                >
                  🔓 Otevřít měsíc
                </ActionButton>
              )}

              {/* Zamčená správcem - jen správce může odemknout */}
              {bookStatus === 'zamknuta_spravcem' && hasManagePermission && (
                <ActionButton
                  type="button"
                  variant="primary"
                  $filled
                  onClick={handleUnlockBook}
                  title="Odemknout knihu zamčenou správcem"
                >
                  🔓 Odemknout (Admin)
                </ActionButton>
              )}
            </div>
          )}
        </div>

        <div className="summary-grid">
          <div className="summary-item info">
            <div className="label">Převod z předchozího měsíce</div>
            <div className="value">{formatCurrency(carryOverAmount)}</div>
          </div>
          <div className="summary-item positive">
            <div className="label">Příjmy v měsíci</div>
            <div className="value">{formatCurrency(totals.totalIncome)}</div>
          </div>
          <div className="summary-item negative">
            <div className="label">Výdaje v měsíci</div>
            <div className="value">{formatCurrency(totals.totalExpenses)}</div>
          </div>
          <div className={`summary-item ${totals.currentBalance >= 0 ? 'positive' : 'negative'}`}>
            <div className="label">Koncový stav měsíce</div>
            <div className="value">{formatCurrency(totals.currentBalance)}</div>
          </div>
          <div className="summary-item">
            <div className="label">Počet operací</div>
            <div className="value">{totals.entryCount}</div>
          </div>
        </div>
      </InfoPanel>

      {/* Navigace mezi měsíci */}
      <MonthNavigation className="no-print">
        <MonthInfo>
          <h2>
            {organizationInfo.month} {organizationInfo.year}
          </h2>
        </MonthInfo>
        <MonthControls>
          <MonthButton onClick={goToPreviousMonth} title="Předchozí měsíc">
            <FontAwesomeIcon icon={faChevronLeft} />
            Předchozí
          </MonthButton>
          <MonthButton
            onClick={goToCurrentMonth}
            disabled={currentMonth === new Date().getMonth() + 1 && currentYear === new Date().getFullYear()}
            title="Aktuální měsíc"
          >
            <FontAwesomeIcon icon={faCalendarDay} />
            Nyní
          </MonthButton>
          <MonthButton
            onClick={goToNextMonth}
            disabled={currentMonth === new Date().getMonth() + 1 && currentYear === new Date().getFullYear()}
            title="Následující měsíc"
          >
            Další
            <FontAwesomeIcon icon={faChevronRight} />
          </MonthButton>
        </MonthControls>
      </MonthNavigation>

      {/* ⚠️ Warning box pro otevřený předchozí měsíc */}
      {showPreviousMonthWarning && (
        <PreviousMonthWarning>
          <WarningIcon>
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </WarningIcon>
          <WarningContent>
            <h4>⚠️ Předchozí měsíc není uzavřený</h4>
            <p>
              <strong>Pozor:</strong> Předchozí měsíc (
              {new Date(
                currentMonth === 1 ? currentYear - 1 : currentYear,
                (currentMonth === 1 ? 12 : currentMonth - 1) - 1
              ).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}) není uzavřen.
            </p>
            <p>
              Čísla dokladů <strong>PPD a VPD</strong> v tomto měsíci se mohou po uzavření předchozího měsíce
              <strong> automaticky přepočítat</strong> pro zachování správné posloupnosti.
            </p>
            <p className="tip">
              💡 Doporučujeme nejprve uzavřít předchozí měsíce chronologicky od nejstaršího.
            </p>
          </WarningContent>
        </PreviousMonthWarning>
      )}

      {/* Tabulka pokladní knihy */}
      <div className="cashbook-print-area">
        {/* Hlavička pro tisk */}
        <div className="print-header" style={{
          display: 'none',
          textAlign: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #1e40af'
        }}>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#1e40af',
            margin: '0 0 0.5rem 0'
          }}>
            Pokladní kniha
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#4b5563',
            margin: '0'
          }}>
            {/* ✅ Jméno vlastníka + oddělení + pokladna + období */}
            {(() => {
              const userName = mainAssignment?.uzivatel_cele_jmeno ||
                              (mainAssignment?.uzivatel_jmeno && mainAssignment?.uzivatel_prijmeni
                                ? `${mainAssignment.uzivatel_jmeno} ${mainAssignment.uzivatel_prijmeni}`
                                : null);
              const workplace = mainAssignment?.nazev_pracoviste || mainAssignment?.kod_pracoviste;
              const cashboxNum = mainAssignment?.cislo_pokladny;

              return (
                <>
                  {userName || 'Bez uživatele'}
                  {' | '}
                  {workplace || 'Bez oddělení'}
                  {' | '}
                  Pokladna č. {cashboxNum || organizationInfo.cashboxNumber}
                  {' | '}
                  {organizationInfo.month} {organizationInfo.year}
                </>
              );
            })()}
          </p>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0.5rem 0 0 0'
          }}>
            VPD: {organizationInfo.cashboxVpd || 'N/A'} |
            PPD: {organizationInfo.cashboxPpd || 'N/A'} |
            Převod z předchozího měsíce: {formatCurrency(carryOverAmount)}
          </p>
        </div>

        <TableContainer>
          <Table>
            <thead>
            <tr>
              <th className="row-number">#</th>
              <th className="date-cell">Datum</th>
              <th className="document-cell">Doklad č.</th>
              <th className="description-cell">Obsah zápisu</th>
              <th className="person-cell">Komu/Od koho</th>
              <th className="amount-cell income">Příjmy<br/>(Kč)</th>
              <th className="amount-cell expense">Výdaje<br/>(Kč)</th>
              <th className="balance-cell">Zůstatek<br/>(Kč)</th>
              <th className="lp-code-cell">LP kód</th>
              <th className="note-cell">Poznámka</th>
              {canActuallyEdit && <th className="actions-cell">Akce</th>}
            </tr>
          </thead>
          <tbody>
            {cashBookEntries.map((entry, index) => {
              const isLastSaved = entry.id === lastSavedEntryId;
              return (
              <React.Fragment key={entry.id}>
              <tr
                onDoubleClick={() => {
                  if (canActuallyEdit && !entry.isEditing) {
                    startEditing(entry.id);
                  }
                }}
                style={{
                  cursor: canActuallyEdit && !entry.isEditing ? 'pointer' : 'default',
                  animation: isLastSaved ? `${highlightPulse} 1s ease-in-out 5` : 'none'
                }}
              >
                <td className="row-number">{index + 1}</td>

                <td className="date-cell">
                  {entry.isEditing ? (
                    <DatePicker
                      value={entry.date}
                      onChange={(newDate) => updateEntry(entry.id, 'date', newDate)}
                      placeholder="Vyberte datum"
                      limitToMonth={currentMonth}
                      limitToYear={currentYear}
                    />
                  ) : (
                    formatDate(entry.date)
                  )}
                </td>

                <td className="document-cell">
                  {/* 🆕 KROK 4: Zobrazit prefixované číslo pokud je zapnuto nastavení */}
                  {(() => {
                    if (!entry.documentNumber) {
                      return '';
                    }

                    // 🔧 OPRAVA: Pokud číslo už obsahuje pomlčku, je už prefixované z DB → zobrazit jak je
                    if (entry.documentNumber.includes('-')) {
                      const type = entry.documentNumber.charAt(0); // P nebo V
                      return (
                        <span
                          title={`Číslo dokladu: ${entry.documentNumber}`}
                          style={{
                            cursor: 'help',
                            fontWeight: '500',
                            color: type === 'P' ? '#059669' : '#dc2626'
                          }}
                        >
                          {entry.documentNumber}
                        </span>
                      );
                    }

                    // Číslo nemá prefix (např. V012) → přidat prefix pokud je zapnuto
                    if (!usePrefixedNumbers) {
                      return entry.documentNumber;
                    }

                    const type = entry.documentNumber.charAt(0); // P nebo V
                    const number = entry.documentNumber.substring(1); // 001

                    // Určit číselnou řadu podle typu dokladu
                    let prefix = '';
                    if (type === 'V' && organizationInfo.cashboxVpd) {
                      prefix = organizationInfo.cashboxVpd; // VPD = výdajový pokladní doklad
                    } else if (type === 'P' && organizationInfo.cashboxPpd) {
                      prefix = organizationInfo.cashboxPpd; // PPD = příjmový pokladní doklad
                    }

                    const prefixedNumber = prefix ? `${type}${prefix}-${number}` : entry.documentNumber;

                    return (
                      <span
                        title={`Pořadové číslo dokladu v roce: ${entry.documentNumber}`}
                        style={{
                          cursor: 'help',
                          fontWeight: '500',
                          color: type === 'P' ? '#059669' : '#dc2626'
                        }}
                      >
                        {prefixedNumber}
                      </span>
                    );
                  })()}
                </td>

                <td className="description-cell">
                  {entry.isEditing ? (
                    <EditableInput
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, entry.id)}
                      onBlur={autoSave}
                      data-entry-id={entry.id}
                      data-field="description"
                      placeholder="Popis operace"
                    />
                  ) : (
                    entry.description
                  )}
                </td>

                <td className="person-cell">
                  {entry.isEditing ? (
                    <EditableInput
                      value={entry.person}
                      onChange={(e) => updateEntry(entry.id, 'person', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, entry.id)}
                      onBlur={autoSave}
                      placeholder="Jméno osoby"
                    />
                  ) : (
                    entry.person
                  )}
                </td>

                <td className="amount-cell income">
                  {entry.isEditing ? (
                    <CurrencyInputWrapper>
                      <EditableInput
                        type="text"
                        value={entry.income ? entry.income.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}
                        onChange={(e) => {
                          const cleanValue = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.');
                          const numValue = parseFloat(cleanValue);
                          updateEntry(entry.id, 'income', isNaN(numValue) ? null : numValue);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, entry.id)}
                        onBlur={autoSave}
                        placeholder="0"
                        className="amount-input"
                      />
                    </CurrencyInputWrapper>
                  ) : (
                    entry.income ? formatCurrency(entry.income) : ''
                  )}
                </td>

                <td className="amount-cell expense">
                  {entry.isEditing ? (
                    <CurrencyInputWrapper>
                      <EditableInput
                        type="text"
                        value={entry.expense ? entry.expense.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}
                        onChange={(e) => {
                          const cleanValue = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.');
                          const numValue = parseFloat(cleanValue);
                          updateEntry(entry.id, 'expense', isNaN(numValue) ? null : numValue);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, entry.id)}
                        onBlur={autoSave}
                        placeholder="0"
                        className="amount-input"
                      />
                    </CurrencyInputWrapper>
                  ) : (
                    entry.expense ? formatCurrency(entry.expense) : ''
                  )}
                </td>

                <td className="balance-cell">
                  {formatCurrency(entry.balance)}
                </td>

                <td className="lp-code-cell">
                  {entry.isEditing ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {/* Master LP kód - disabled pokud jsou detail položky, povinný u výdajů */}
                      {!(entry.detailItems && entry.detailItems.length > 0) && (
                        <div style={{ position: 'relative', flex: 1 }}>
                          <EditableCombobox
                            value={entry.lpCode || ''}
                            onChange={(e) => updateEntry(entry.id, 'lpCode', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, entry.id)}
                            onBlur={autoSave}
                            options={lpCodes}
                            placeholder={lpLoading ? 'Načítání...' : (entry.expense > 0 ? 'LP kód (povinný) *' : 'LP kód (nepovinný)')}
                            disabled={lpLoading}
                            loading={lpLoading}
                            hasError={entry.expense > 0 && !entry.lpCode}
                          />
                          {entry.expense > 0 && !entry.lpCode && (
                            <div style={{ 
                              position: 'absolute', 
                              top: '100%', 
                              left: 0, 
                              fontSize: '10px', 
                              color: '#f44336', 
                              marginTop: '2px',
                              whiteSpace: 'nowrap'
                            }}>
                              ⚠ LP kód je povinný u výdajů
                            </div>
                          )}
                        </div>
                      )}
                      {/* Tlačítko pro rozbalení inline panelu - pouze u výdajů */}
                      {entry.expense > 0 && (
                        <button
                          onClick={() => {
                            if (expandedDetailEntryId === entry.id) {
                              setExpandedDetailEntryId(null);
                              setDetailEditBuffer([]);
                            } else {
                              setExpandedDetailEntryId(entry.id);
                              setDetailEditBuffer(entry.detailItems && entry.detailItems.length > 0 
                                ? [...entry.detailItems] 
                                : [{ popis: '', castka: 0, lp_kod: '', lp_popis: '' }]
                              );
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            background: expandedDetailEntryId === entry.id 
                              ? '#ff9800' 
                              : (entry.detailItems && entry.detailItems.length > 0 ? '#4caf50' : '#2196f3'),
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            minWidth: '24px'
                          }}
                          title={expandedDetailEntryId === entry.id 
                            ? 'Zavřít panel' 
                            : (entry.detailItems && entry.detailItems.length > 0 
                              ? entry.detailItems.map(item => `${item.lp_kod}: ${item.castka} Kč${item.popis ? ' - ' + item.popis : ''}`).join('\n')
                              : 'Přidat více LP kódů')
                          }
                        >
                          {expandedDetailEntryId === entry.id 
                            ? '▼' 
                            : (entry.detailItems && entry.detailItems.length > 0 ? `${entry.detailItems.length}×` : '+')}
                        </button>
                      )}
                      {/* Zobrazení multi-LP v edit módu */}
                      {entry.detailItems && entry.detailItems.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#4caf50', fontWeight: 'bold' }}>
                          Multi-LP ({entry.detailItems.length}×)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {entry.detailItems && entry.detailItems.length > 0 ? (
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {entry.detailItems.map((item, idx) => (
                            <div key={idx}>{item.lp_kod} ({item.castka} Kč)</div>
                          ))}
                        </div>
                      ) : (
                        entry.lpCode || '-'
                      )}
                    </div>
                  )}
                </td>

                <td className="note-cell">
                  {entry.isEditing ? (
                    <EditableInput
                      value={entry.note}
                      onChange={(e) => updateEntry(entry.id, 'note', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, entry.id)}
                      onBlur={autoSave}
                      placeholder="Poznámka"
                    />
                  ) : (
                    entry.note
                  )}
                </td>

                {canActuallyEdit && (
                  <td className="actions-cell">
                    {entry.isEditing ? (
                      <>
                        <ActionIcon onClick={() => stopEditing(entry.id)} title="Potvrdit">
                          <FontAwesomeIcon icon={faCheck} />
                        </ActionIcon>
                      </>
                    ) : (
                      <>
                        <ActionIcon onClick={() => startEditing(entry.id)} title="Editovat">
                          <FontAwesomeIcon icon={faEdit} />
                        </ActionIcon>
                        {canActuallyDelete && (
                          <ActionIcon
                            onClick={() => removeEntry(entry.id)}
                            title="Smazat"
                            danger
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </ActionIcon>
                        )}
                      </>
                    )}
                  </td>
                )}
              </tr>
              {/* 🆕 INLINE MULTI-LP PANEL */}
              {expandedDetailEntryId === entry.id && (
                <tr key={`detail-${entry.id}`} style={{ background: '#f8f9fa' }}>
                  <td colSpan={1} style={{ padding: 0 }}></td>
                  <td colSpan={2} style={{ padding: 0 }}></td>
                  <td colSpan={canActuallyEdit ? 8 : 7} style={{ padding: '16px 16px 16px 8px' }}>
                    <div style={{ 
                      background: 'white', 
                      border: '2px solid #2196f3', 
                      borderRadius: '8px', 
                      padding: '16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '12px',
                        borderBottom: '2px solid #e0e0e0',
                        paddingBottom: '8px'
                      }}>
                        <h4 style={{ margin: 0, color: '#2196f3' }}>
                          📋 Rozpad LP kódů pro doklad {entry.documentNumber || '(nový)'}
                        </h4>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                          Celkem: {entry.expense || 0} Kč
                        </div>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', tableLayout: 'fixed' }}>
                        <thead>
                          <tr style={{ background: '#f5f5f5' }}>
                            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '50%' }}>Popis položky</th>
                            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '18%' }}>Částka</th>
                            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd', width: '25%' }}>LP kód</th>
                            <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd', width: '7%' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailEditBuffer.map((item, idx) => {
                            const isValidLp = !item.lp_kod || lpCodes.find(lp => lp.code === item.lp_kod);
                            return (
                              <tr key={idx}>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                  <input
                                    type="text"
                                    value={item.popis || ''}
                                    onChange={(e) => {
                                      const updated = [...detailEditBuffer];
                                      updated[idx].popis = e.target.value;
                                      setDetailEditBuffer(updated);
                                    }}
                                    style={{ 
                                      width: '100%', 
                                      padding: '0.5rem', 
                                      fontSize: '0.9rem', 
                                      border: '1px solid #ccc', 
                                      borderRadius: '4px',
                                      boxSizing: 'border-box'
                                    }}
                                    placeholder="Např. Oprava kavovaru"
                                  />
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      value={item.castka ? item.castka.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}
                                      onChange={(e) => {
                                        const updated = [...detailEditBuffer];
                                        const cleanValue = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.');
                                        const numValue = parseFloat(cleanValue);
                                        updated[idx].castka = isNaN(numValue) ? 0 : numValue;
                                        setDetailEditBuffer(updated);
                                      }}
                                      style={{ 
                                        width: '100%', 
                                        padding: '0.5rem 35px 0.5rem 0.5rem', 
                                        fontSize: '0.9rem', 
                                        border: '1px solid #ccc', 
                                        borderRadius: '4px',
                                        textAlign: 'right',
                                        boxSizing: 'border-box'
                                      }}
                                      placeholder="0"
                                    />
                                    <span style={{
                                      position: 'absolute',
                                      right: '8px',
                                      color: '#374151',
                                      fontWeight: '600',
                                      fontSize: '13px',
                                      pointerEvents: 'none',
                                      userSelect: 'none'
                                    }}>
                                      Kč
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                  <EditableCombobox
                                    value={item.lp_kod || ''}
                                    onChange={(e) => {
                                      const updated = [...detailEditBuffer];
                                      const selectedLp = lpCodes.find(lp => lp.code === e.target.value);
                                      updated[idx].lp_kod = e.target.value;
                                      updated[idx].lp_popis = selectedLp?.name || '';
                                      setDetailEditBuffer(updated);
                                    }}
                                    options={lpCodes}
                                    placeholder={lpLoading ? 'Načítání...' : 'LP kód (např. LPIT01)'}
                                    disabled={lpLoading}
                                    loading={lpLoading}
                                    hasError={!isValidLp}
                                  />
                                  {!isValidLp && (
                                    <div style={{ color: '#f44336', fontSize: '10px', marginTop: '2px' }}>
                                      ⚠ Neplatný kód
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                  <button
                                    onClick={() => {
                                      const updated = detailEditBuffer.filter((_, i) => i !== idx);
                                      setDetailEditBuffer(updated);
                                    }}
                                    style={{ 
                                      padding: '0.5rem', 
                                      background: '#dc3545', 
                                      color: 'white', 
                                      border: 'none', 
                                      borderRadius: '4px', 
                                      cursor: 'pointer',
                                      fontSize: '18px',
                                      minWidth: '40px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      lineHeight: 1
                                    }}
                                    title="Smazat řádek"
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <button
                        onClick={() => {
                          setDetailEditBuffer([...detailEditBuffer, { popis: '', castka: 0, lp_kod: '', lp_popis: '' }]);
                        }}
                        style={{ 
                          padding: '6px 12px', 
                          background: '#4caf50', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '13px',
                          marginBottom: '12px'
                        }}
                      >
                        + Přidat položku
                      </button>

                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '2px solid #e0e0e0'
                      }}>
                        <div style={{ fontSize: '14px' }}>
                          Součet položek: <strong>{detailEditBuffer.reduce((sum, item) => sum + (item.castka || 0), 0).toFixed(2)} Kč</strong>
                          {Math.abs(detailEditBuffer.reduce((sum, item) => sum + (item.castka || 0), 0) - (entry.expense || 0)) > 0.01 && (
                            <span style={{ color: '#f44336', marginLeft: '8px' }}>
                              ⚠ Nesouhlasí s částkou výdaje!
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setExpandedDetailEntryId(null);
                              setDetailEditBuffer([]);
                            }}
                            style={{ 
                              padding: '8px 16px', 
                              background: '#6c757d', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px', 
                              cursor: 'pointer' 
                            }}
                          >
                            Zrušit
                          </button>
                          <button
                            onClick={() => {
                              // Validace
                              const totalDetail = detailEditBuffer.reduce((sum, item) => sum + (item.castka || 0), 0);
                              if (Math.abs(totalDetail - (entry.expense || 0)) > 0.01) {
                                toast.error(`⚠️ Součet položek (${totalDetail.toFixed(2)} Kč) se neshoduje s částkou výdaje (${entry.expense} Kč)`, {
                                  position: "top-center",
                                  autoClose: 4000
                                });
                                return;
                              }
                              
                              for (const item of detailEditBuffer) {
                                if (!item.lp_kod) {
                                  toast.warning('⚠️ Všechny položky musí mít vybraný LP kód', {
                                    position: "top-center",
                                    autoClose: 3000
                                  });
                                  return;
                                }
                                if (!lpCodes.find(lp => lp.code === item.lp_kod)) {
                                  toast.error(`❌ LP kód '${item.lp_kod}' není platný`, {
                                    position: "top-center",
                                    autoClose: 3000
                                  });
                                  return;
                                }
                              }
                              
                              // Uložit do entry
                              setCashBookEntries(prev => prev.map(e => 
                                e.id === entry.id 
                                  ? { 
                                      ...e, 
                                      detailItems: detailEditBuffer,
                                      lpCode: '',
                                      hasDetails: true,
                                      changed: true,
                                      sync_status: 'pending'
                                    }
                                  : e
                              ));
                              
                              toast.success(`✅ Uloženo ${detailEditBuffer.length} LP kódů pod dokladem ${entry.documentNumber}`, {
                                position: "top-right",
                                autoClose: 2000
                              });
                              
                              setExpandedDetailEntryId(null);
                              setDetailEditBuffer([]);
                              autoSave();
                            }}
                            style={{ 
                              padding: '8px 16px', 
                              background: '#2196f3', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px', 
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            💾 Uložit
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </Table>

        {canActuallyCreate && (
          <div style={{ padding: '1rem' }}>
            <AddRowButton onClick={handleAddNewRow}>
              <FontAwesomeIcon icon={faPlus} />
              Přidat nový řádek
            </AddRowButton>
          </div>
        )}
      </TableContainer>
      
      {/* ⚠️ Kompaktní info box pro zamčenou knihu */}
      {bookStatus === 'zamknuta_spravcem' && (
        <div className="no-print" style={{
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            fontSize: '2rem',
            color: '#dc2626',
            flexShrink: 0
          }}>
            <FontAwesomeIcon icon={faLock} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              margin: '0 0 0.5rem 0', 
              color: '#991b1b', 
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              🔒 Pokladní kniha je finálně uzamčena správcem
            </h4>
            <p style={{ 
              margin: 0, 
              color: '#7f1d1d', 
              fontSize: '0.875rem',
              lineHeight: '1.4'
            }}>
              Tento měsíc byl zamčen administrátorem a je již zaúčtován. 
              <strong> Nelze přidávat, upravovat ani mazat záznamy.</strong>
              {' '}V případě potřeby změn kontaktujte správce pokladní knihy.
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Legenda horkých kláves - pouze pro aktivní knihu */}
      {bookStatus === 'aktivni' && (
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2rem',
          padding: '0.75rem 1rem',
          marginTop: '0.75rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#475569',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <kbd style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '0.15rem 0.4rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1e40af',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}>Shift</kbd>
          <span>+</span>
          <kbd style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '0.15rem 0.4rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1e40af',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}>Insert</kbd>
          <span style={{ marginLeft: '0.25rem' }}>Nový řádek</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <kbd style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '0.15rem 0.4rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1e40af',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}>Shift</kbd>
          <span>+</span>
          <kbd style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '0.15rem 0.4rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1e40af',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}>Enter</kbd>
          <span style={{ marginLeft: '0.25rem' }}>Uložit a ukončit editaci</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <kbd style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '0.15rem 0.4rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1e40af',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}>ESC</kbd>
          <span style={{ marginLeft: '0.25rem' }}>Zrušit editaci bez uložení</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <kbd style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '0.15rem 0.4rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1e40af',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}>Double-click</kbd>
          <span style={{ marginLeft: '0.25rem' }}>Editovat řádek</span>
        </div>
        </div>
      )}

      {/* Panel všech tlačítek pod tabulkou */}
      <ActionBar className="no-print" style={{ marginTop: '1rem' }}>
        <ActionGroup>
          {/* Prázdné místo vlevo - můžete přidat další tlačítka */}
        </ActionGroup>

        <ActionGroup>
          {/* Export tlačítka */}
          {canExportCashBook && (
            <>
              <ActionButton type="button" onClick={() => exportData('CSV')}>
                <FontAwesomeIcon icon={faFileExport} />
                Export CSV
              </ActionButton>
              <ActionButton type="button" onClick={() => exportData('PDF')}>
                <FontAwesomeIcon icon={faPrint} />
                Export PDF
              </ActionButton>
              <ActionButton
                type="button"
                onClick={printPDFReport}
                title="Tisknout pokladní knihu (PDF formát, A4 na šířku)"
              >
                <FontAwesomeIcon icon={faPrint} />
                Tisknout
              </ActionButton>
            </>
          )}
        </ActionGroup>
      </ActionBar>

      {/* ConfirmDialog pro smazání položky */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Smazání položky"
        icon="trash"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onClose={handleCancelDelete}
      >
        Opravdu chcete odstranit tento záznam z pokladní knihy? Tato akce je nevratná.
      </ConfirmDialog>

      {/* ConfirmDialog pro uzavření měsíce */}
      <ConfirmDialog
        isOpen={closeMonthDialogOpen}
        title={`Uzavřít měsíc ${new Date(currentYear, currentMonth - 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}`}
        icon={faCheck}
        variant="warning"
        onConfirm={confirmCloseMonth}
        onClose={() => setCloseMonthDialogOpen(false)}
      >
        <div style={{ textAlign: 'left' }}>
          <p><strong>Po uzavření měsíce:</strong></p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Nebude možné přidávat nové záznamy</li>
            <li>Nebude možné upravovat existující záznamy</li>
            <li>Měsíc lze znovu otevřít tlačítkem "Otevřít měsíc"</li>
          </ul>

          <div style={{
            background: '#fef3c7',
            border: '2px solid #d97706',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem'
          }}>
            <p style={{ color: '#92400e', fontWeight: '600', marginBottom: '0.5rem' }}>
              🔄 Automatické přečíslování dokladů
            </p>
            <p style={{ color: '#92400e', fontSize: '0.9rem' }}>
              Před uzavřením budou <strong>všechny doklady</strong> v tomto měsíci i ve všech následujících měsících <strong>přečíslovány chronologicky</strong> podle data a typu (P/V).
            </p>
            <p style={{ color: '#92400e', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Tím se zajistí správné navazující pořadí čísel dokladů.
            </p>
          </div>

          <p style={{ marginTop: '1rem', fontWeight: '500' }}>Opravdu chcete pokračovat?</p>
        </div>
      </ConfirmDialog>

      {/* ConfirmDialog pro zamknutí měsíce (ADMIN) */}
      <ConfirmDialog
        isOpen={lockBookDialogOpen}
        title={`⚠️ Zamknout měsíc ${new Date(currentYear, currentMonth - 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}`}
        icon={faLock}
        variant="danger"
        onConfirm={confirmLockBook}
        onClose={() => setLockBookDialogOpen(false)}
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '1rem' }}>
            POZOR: Toto je finální uzavření měsíce!
          </p>
          <p><strong>Po zamknutí správcem:</strong></p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Nikdo (ani běžný uživatel) nebude moci upravovat záznamy</li>
            <li>Nikdo (ani běžný uživatel) nebude moci otevřít měsíc</li>
            <li>Odemknout může pouze správce tlačítkem "Odemknout (Admin)"</li>
            <li>Toto je <strong>FINÁLNÍ</strong> uzavření měsíce</li>
          </ul>
          <p style={{ marginTop: '1rem' }}>Pokračovat s finálním zamčením?</p>
        </div>
      </ConfirmDialog>

      {/* ConfirmDialog pro otevření uzavřeného měsíce (uzavrena_uzivatelem) */}
      <ConfirmDialog
        isOpen={reopenMonthDialogOpen}
        title={`⚠️ Otevřít měsíc ${new Date(currentYear, currentMonth - 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}`}
        icon={faExclamationTriangle}
        variant="warning"
        onConfirm={confirmReopenMonth}
        onClose={() => setReopenMonthDialogOpen(false)}
        confirmText="Ano, otevřít měsíc"
        cancelText="Zrušit"
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ color: '#ff9800', fontWeight: 'bold', marginBottom: '1rem' }}>
            ⚠️ POZOR: Znovu otevíráte uzavřený měsíc!
          </p>
          <p><strong>Po otevření měsíce:</strong></p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Bude možné znovu <strong>přidávat</strong> nové záznamy</li>
            <li>Bude možné <strong>upravovat</strong> existující záznamy</li>
            <li>Bude možné <strong>mazat</strong> záznamy</li>
            <li>Měsíc <strong>nebude uzavřen</strong> pro účetní operace</li>
            <li style={{ color: '#d97706', fontWeight: '500', marginTop: '0.5rem' }}>
              ⚠️ Pokud následně provedete změny a znovu měsíc uzavřete, čísla dokladů v následujících měsících budou přečíslována
            </li>
          </ul>
          <p style={{ marginTop: '1rem', color: '#ff9800', fontWeight: 'bold' }}>
            ⚠️ Tímto zrušíte uzavření měsíce! Opravdu pokračovat?
          </p>
        </div>
      </ConfirmDialog>

      {/* ConfirmDialog pro odemknutí zamčeného měsíce (zamknuta_spravcem) - ADMIN ONLY */}
      <ConfirmDialog
        isOpen={unlockBookDialogOpen}
        title={`🔓 Odemknout měsíc ${new Date(currentYear, currentMonth - 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}`}
        icon={faLockOpen}
        variant="danger"
        onConfirm={confirmUnlockBook}
        onClose={() => setUnlockBookDialogOpen(false)}
        confirmText="Ano, odemknout (Admin)"
        cancelText="Zrušit"
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '1rem' }}>
            🚨 ADMIN AKCE: Odemykáte finálně zamčený měsíc!
          </p>
          <p><strong>Po odemknutí správcem:</strong></p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Bude možné znovu <strong>přidávat a upravovat</strong> záznamy</li>
            <li>Bude možné <strong>mazat</strong> záznamy</li>
            <li>Měsíc <strong>ztratí finální uzavření</strong></li>
            <li>Všichni uživatelé budou moci opět editovat</li>
          </ul>
          <p style={{ marginTop: '1rem', color: '#dc3545', fontWeight: 'bold' }}>
            🚨 POZOR: Toto ruší finální administrativní uzamčení! Opravdu pokračovat?
          </p>
        </div>
      </ConfirmDialog>

      {/* InfoDialog pro blokaci zpětné tvorby knih (uzavřené měsíce v budoucnosti) */}
      <ConfirmDialog
        isOpen={retroactiveCreationBlockedDialogOpen}
        title="🚫 Zpětné vytvoření knihy není možné"
        icon={faExclamationTriangle}
        variant="danger"
        onConfirm={() => setRetroactiveCreationBlockedDialogOpen(false)}
        onClose={() => setRetroactiveCreationBlockedDialogOpen(false)}
        confirmText="Rozumím"
        showCancel={false}
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '1rem' }}>
            ⛔ NELZE VYTVOŘIT NOVOU KNIHU V TOMTO MĚSÍCI
          </p>
          <p>Pro tento měsíc <strong>nemáte založenou pokladní knihu</strong> a existují <strong>uzavřené měsíce v budoucnosti</strong>.</p>
          <p style={{ marginTop: '1rem' }}><strong>Důvody blokace:</strong></p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>V následujících měsících máte <strong>uzavřené nebo zamčené</strong> knihy</li>
            <li>Zpětné vytvoření knihy by <strong>porušilo kontinuitu</strong> účetnictví</li>
            <li>Nelze dodatečně vytvářet knihy <strong>před uzavřenými měsíci</strong></li>
          </ul>
          <p style={{ marginTop: '1rem', color: '#28a745', fontWeight: 'bold' }}>
            ✅ POZNÁMKA: Prohlížení existujících knih v minulosti je možné kdykoliv.
          </p>
          <p style={{ marginTop: '1rem', color: '#ff9800', fontWeight: 'bold' }}>
            � Řešení: Nejprve otevřete uzavřené měsíce v budoucnosti, pak můžete vytvořit nové knihy v minulosti.
          </p>
        </div>
      </ConfirmDialog>

      {/* Kontextový pomocník - Moderní Sponka */}
      {hasPermission('HELPER_VIEW') && <ModernHelper pageContext="cashbook" />}
      
      {/* Toast notifikace kontejner */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      </PageContainer>
    </>
  );
};

export default CashBookPage;