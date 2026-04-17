import React, { useEffect, useState, useMemo, useContext, useCallback, useRef, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { DebugContext } from '../context/DebugContext';
import { ToastContext } from '../context/ToastContext';
import { loadSettingsFromLocalStorage } from '../services/userSettingsApi';
import ConfirmDialog from '../components/ConfirmDialog';
import InvoiceListPopup from '../components/InvoiceListPopup';
import ModernHelper from '../components/ModernHelper';
import DatePicker from '../components/DatePicker';
import OperatorInput from '../components/OperatorInput';
import { useBackgroundTasks } from '../context/BackgroundTasksContext';
import { createDownloadLink25, lockOrder25, unlockOrder25, getDruhyObjednavky25, getStrediska25 } from '../services/api25orders';
import { getOrderV2, updateOrderV2, listOrdersV2, deleteOrderV2, restoreOrderV2, downloadOrderAttachment, downloadInvoiceAttachment } from '../services/apiOrderV2'; // ✅ V2 API pro načítání, mazání, obnovu a přílohy
import { getInvoicesByOrder25 } from '../services/api25invoices';
import { fetchAllUsers, fetchApprovers, fetchCiselniky, fetchLimitovanePrisliby } from '../services/api2auth';
import { getDocxSablonyList } from '../services/apiv2Dictionaries';
import { STATUS_COLORS, getStatusColor } from '../constants/orderStatusColors';
import { normalizeStav } from '../utils/orderStatus';
import { removeDiacritics } from '../utils/textHelpers';
import {
  filterMyOrders,
  applyColumnFilters
} from '../utils/orderFilters';
import {
  filterByGlobalSearch,
  filterByStatusArray,
  filterByArchived,
  filterByUser,
  filterByDateRange,
  filterByAmountRange,
  filterByRegistrStatus
} from '../utils/orderFiltersAdvanced';
import { 
  filterOrders as filterOrdersShared,
  calculateOrderStats, 
  getOrderSystemStatus,
  getOrderTotalPriceWithDPH 
} from '../utils/orderStatsUtils';
import ordersCacheService from '../services/ordersCacheService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faFilter, faTimes, faPlus, faEdit, faEye, faTrash, faFileWord,
  faDownload, faSyncAlt, faChevronDown, faChevronUp,
  faFileInvoice, faChartBar, faTableColumns, faFileExport,
  faBolt, faCalendarAlt, faUser, faBuilding, faMoneyBillWave,
  faCheckCircle, faTimesCircle, faHourglassHalf, faExclamationTriangle,
  faFilePen, faShield, faTruck, faXmark, faClock, faCircleNotch,
  faEraser, faList, faPalette, faMinus, faInfoCircle, faThumbsUp,
  faUsers, faPaperclip,
  faRocket, faBell, faArchive, faDatabase, faBoltLightning, faFileAlt,
  faFaceFrown, faLock, faEnvelope, faPhone, faFileContract,
  faReceipt, faListCheck,
  faChevronLeft, faChevronRight, faBullseye, faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import styled from '@emotion/styled';
import { Calendar } from 'lucide-react';
import { CustomSelect, SelectWithIcon } from '../components/CustomSelect';
import { OrderContextMenu } from '../components/OrderContextMenu';
import { TooltipWrapper } from '../styles/GlobalTooltip';
import { SmartTooltip } from '../styles/SmartTooltip';
import { prettyDate, formatDateOnly, exportCsv } from '../utils/format';
import { isValidConcept, hasDraftChanges, getDraftKey } from '../utils/draftUtils.js';
import order25DraftStorageService from '../services/order25DraftStorageService'; // ORDER25 STANDARD
import draftManager from '../services/DraftManager'; // 🎯 CENTRALIZOVANÝ DRAFT MANAGER
import { broadcastDraftUpdated, broadcastDraftDeleted, broadcastOrderSaved, onTabSyncMessage, BROADCAST_TYPES } from '../utils/tabSync';
import { translateErrorMessage, translateErrorMessageShort } from '../utils/errorTranslation';
import { getStatusIcon } from '../utils/iconMapping'; // 🎯 Unified icon mapping
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

//  PERFORMANCE: Lazy load DocxGeneratorModal (pouze když je potřeba)
const DocxGeneratorModal = lazy(() => import('../components/DocxGeneratorModal').then(m => ({ default: m.DocxGeneratorModal })));

//  PERFORMANCE: Lazy load FinancialControlModal
const FinancialControlModal = lazy(() => import('../components/FinancialControlModal'));

// =============================================================================
// KEYFRAMES FOR ANIMATIONS
// =============================================================================

const highlightPulse = `
  @keyframes highlightPulse {
    0% {
      filter: brightness(1.4) saturate(1.3);
      box-shadow: 0 0 30px currentColor, 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px) scale(1.015);
    }
    15% {
      filter: brightness(1.5) saturate(1.4);
      box-shadow: 0 0 40px currentColor, 0 6px 20px rgba(0, 0, 0, 0.2);
      transform: translateY(-3px) scale(1.02);
    }
    30% {
      filter: brightness(1.3) saturate(1.2);
      box-shadow: 0 0 25px currentColor, 0 3px 12px rgba(0, 0, 0, 0.12);
      transform: translateY(-1px) scale(1.01);
    }
    60% {
      filter: brightness(1.15) saturate(1.1);
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08);
      transform: translateY(0) scale(1.005);
    }
    80% {
      filter: brightness(1.05) saturate(1.05);
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
      transform: translateY(0) scale(1.002);
    }
    100% {
      filter: brightness(1) saturate(1);
      box-shadow: none;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    100% { background-position: 100% 50%; }
  }
`;

// =============================================================================
// STYLED COMPONENTS
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

// 🔧 ADMIN: Checkbox pro zobrazení neaktivních objednávek
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

  const PageHeader = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 2rem;
  `;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  padding-bottom: 1rem;
  border-bottom: 3px solid #e5e7eb;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  height: 38px;
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

// Funkce pro vytvoření světlejší barvy (90% světlosti)
const getLighterColor = (color, opacity = 0.9) => {
  // Pokud je barva ve formátu hex, převeď na rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Pokud je už rgba/rgb, upravíme opacity
  if (color.includes('rgba')) {
    return color.replace(/[\d\.]+\)$/g, `${opacity})`);
  }

  if (color.includes('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
  }

  // Fallback
  return color;
};

// Funkce pro mapování uživatelského stavu na systémový kód
const mapUserStatusToSystemCode = (userStatus) => {
  // Kontrola na začátek textu pro různé varianty
  if (userStatus && typeof userStatus === 'string') {
    if (userStatus.startsWith('Zamítnut')) return 'ZAMITNUTA';
    if (userStatus.startsWith('Schválen')) return 'SCHVALENA';
    if (userStatus.startsWith('Dokončen')) return 'DOKONCENA';
    if (userStatus.startsWith('Zrušen')) return 'ZRUSENA';
    if (userStatus.startsWith('Archivován')) return 'ARCHIVOVANO';
    if (userStatus.startsWith('Zkontrolovan')) return 'ZKONTROLOVANA';
  }
  
  const mapping = {
    'Ke schválení': 'ODESLANA_KE_SCHVALENI', // ✅ FIX: Backend používá ODESLANA_KE_SCHVALENI, ne KE_SCHVALENI
    'Nová': 'NOVA',
    'Rozpracovaná': 'ROZPRACOVANA',
    'Odeslaná dodavateli': 'ODESLANA',
    'Potvrzená dodavatelem': 'POTVRZENA',
    'Ke zveřejnění': 'K_UVEREJNENI_DO_REGISTRU',
    'Má být zveřejněna': 'K_UVEREJNENI_DO_REGISTRU',
    'Uveřejněná': 'UVEREJNENA',
    'Čeká na potvrzení': 'CEKA_POTVRZENI',
    'Čeká se': 'CEKA_SE',
    'Odloženo': 'CEKA_SE',
    'Fakturace': 'FAKTURACE',
    'Věcná správnost': 'VECNA_SPRAVNOST',
    'Zkontrolovaná': 'ZKONTROLOVANA',
    'Zkontrolována': 'ZKONTROLOVANA',
    'Smazaná': 'SMAZANA',
    'Koncept': 'NOVA' // Koncepty se mapují jako nové objednávky
  };
  return mapping[userStatus] || userStatus;
};

// Funkce pro barvu pozadí řádků tabulky - světlé odstíny
const getRowBackgroundColor = (order) => {
  try {
    // Speciální případ pro koncepty
    if (order?.isDraft || order?.je_koncept) {
      return STATUS_COLORS.NOVA.light;
    }

    // Získej systémový stav pro mapování na barvy
    let systemStatus;

    // Preferuj uživatelsky přívětivý stav z stav_objednavky a zmapuj na systémový
    if (order?.stav_objednavky) {
      systemStatus = mapUserStatusToSystemCode(order.stav_objednavky);
    }
    // Fallback na stav_workflow_kod
    else if (order?.stav_workflow_kod) {
      try {
        const workflowStates = JSON.parse(order.stav_workflow_kod);
        if (Array.isArray(workflowStates)) {
          const lastState = workflowStates[workflowStates.length - 1];
          // Použij nazev_stavu nebo kod_stavu pokud je k dispozici
          if (typeof lastState === 'object' && (lastState.kod_stavu || lastState.nazev_stavu)) {
            systemStatus = lastState.kod_stavu || 'NEZNAMY';
          } else {
            systemStatus = typeof lastState === 'string' ? lastState : 'NEZNAMY';
          }
        } else {
          systemStatus = order.stav_workflow_kod;
        }
      } catch {
        systemStatus = order.stav_workflow_kod;
      }
    }
    // Další fallbacky pro různé názvy polí
    else {
      systemStatus = order?.stav_id_num ?? order?.stav_id ?? order?.status_id ?? order?.stav ?? 'NOVA';
    }

    const statusColors = getStatusColor(systemStatus);

    // Debug výpis (pro testování) - přímo první objednávka
    if (order?.cislo_objednavky && order.cislo_objednavky.toString().endsWith('1')) {

    }

    return statusColors?.light || STATUS_COLORS.NOVA.light;
  } catch (error) {
    // Error getting row background color
    return STATUS_COLORS.NOVA.light;
  }
};

// Funkce pro barvu dlaždic dashboard - tmavé barvy
const getDashboardColor = (stav) => {
  try {
    const statusColors = getStatusColor(stav);
    return statusColors.dark;
  } catch {
    return STATUS_COLORS.NOVA.dark;
  }
};

// 🎯 getStatusIcon je nyní importován z utils/iconMapping.js
// Odstraněna lokální implementace pro zajištění konzistence ikon

// 🎨 Helper funkce pro získání emoji ikony podle stavu (stejné jako v NotificationsPage)
const getStatusEmoji = (status) => {
  const normalizedStatus = status?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Odstranění diakritiky

  switch (normalizedStatus) {
    case 'nova':
    case 'koncept':
      return '📝';
    case 'ke_schvaleni':
    case 'keschvaleni':
      return '📋';
    case 'schvalena':
      return '👍';
    case 'zamitnuta':
      return '❌';
    case 'rozpracovana':
      return '🕐';
    case 'odeslana':
      return '📤';
    case 'potvrzena':
      return '✔';
    case 'uverejnena':
    case 'registr_zverejnena':
    case 'registrzverejnena':
      return '📢';
    case 'dokoncena':
      return '🎯';
    case 'ceka_potvrzeni':
    case 'cekapotvrzeni':
      return '⏸';
    case 'ceka_se':
    case 'cekase':
      return '⏸';
    case 'zrusena':
      return '🚫';
    case 'smazana':
      return '🗑';
    case 'ceka_kontrola':
    case 'cekakontrola':
      return '🔍';
    case 'vecna_spravnost':
    case 'vecnaspravnost':
      return '✅';
    case 'archivovano':
    case 'archivovana':
      return '📦';
    default:
      return '📊';
  }
};

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

  /* Lepší responzivita pro různé zoom úrovně */
  @media (max-width: 1400px) {
    grid-template-columns: minmax(320px, 350px) repeat(auto-fit, minmax(160px, 200px));
    gap: clamp(0.7rem, 1.3vw, 1.4rem);
  }

  @media (max-width: 1200px) {
    grid-template-columns: minmax(300px, 330px) repeat(auto-fit, minmax(150px, 180px));
    gap: clamp(0.6rem, 1.2vw, 1.3rem);
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: clamp(0.8rem, 2vw, 1.2rem);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: clamp(0.8rem, 2vw, 1.15rem);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: clamp(0.6rem, 2vw, 0.9rem);
  }

  /* Speciální pravidla pro vysoký zoom (detekce přes velké font-size) */
  @media (min-width: 1600px) {
    grid-template-columns: minmax(400px, 450px) repeat(auto-fit, minmax(200px, 250px));
    gap: clamp(1.2rem, 1.8vw, 2rem);
  }
`;

const LargeStatCard = styled.div`
  background: linear-gradient(145deg, #ffffff, #f9fafb);
  border-radius: 16px;
  padding: clamp(1.25rem, 1.5vw, 1.75rem);
  border-left: 6px solid ${props => props.$color || '#3b82f6'};
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.06);

  transition: all 0.3s ease;
  grid-row: span 2;
  grid-column: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: fit-content;
  height: 100%;
  position: relative;
  width: 100%;
  box-sizing: border-box;

  /* Hover efekt */
  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.12),
      0 4px 8px rgba(0, 0, 0, 0.08);
  }

  /* Responsive breakpoints */
  @media (max-width: 1200px) {
    grid-row: span 1;
    grid-column: span 2;
    min-height: clamp(140px, 15vh, 180px);
  }

  @media (max-width: 900px) {
    grid-column: span 1;
    min-height: clamp(120px, 14vh, 160px);
    padding: clamp(1rem, 1.2vw, 1.5rem);
  }

  @media (max-width: 768px) {
    min-height: clamp(110px, 13vh, 150px);
  }

  @media (max-width: 600px) {
    min-height: clamp(100px, 12vh, 130px);
    padding: clamp(0.8rem, 1vw, 1.25rem);
  }
`;

const StatCard = styled.div`
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: clamp(0.8rem, 1vw, 1rem);
  border-left: 4px solid ${props => props.$color || '#3b82f6'};
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);

  transition: all 0.25s ease;
  min-height: clamp(90px, 10vh, 120px);
  min-width: clamp(160px, 18vw, 220px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  width: 100%;
  box-sizing: border-box;

  /* Hover efekt */
  &:hover {
    transform: ${props => props.$clickable ? 'translateY(-2px)' : 'translateY(-1px)'};
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.06);
    ${props => props.$clickable && `
      background: linear-gradient(145deg, ${props.$color || '#3b82f6'}25, ${props.$color || '#3b82f6'}15);
    `}
  }

  /* Aktivní stav */
  ${props => props.$isActive && `
    border-left-width: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 2px ${props.$color || '#3b82f6'}40;
  `}

  /* Responsive breakpoints pro různé velikosti obrazovky a zoom */
  @media (max-width: 1400px) {
    min-height: clamp(85px, 9vh, 110px);
    min-width: clamp(150px, 16vw, 200px);
  }

  @media (max-width: 1200px) {
    min-height: clamp(80px, 8vh, 105px);
    min-width: clamp(140px, 15vw, 190px);
  }

  @media (max-width: 900px) {
    min-height: clamp(75px, 8vh, 100px);
    min-width: 100%;
  }

  @media (max-width: 768px) {
    min-height: clamp(70px, 7vh, 95px);
    padding: clamp(0.7rem, 0.8vw, 0.9rem);
  }

  @media (max-width: 600px) {
    min-height: clamp(65px, 7vh, 85px);
    padding: clamp(0.6rem, 0.7vw, 0.8rem);
  }
`;

const StatValue = styled.div`
  font-size: clamp(1.25rem, 2.5vw, 1.875rem);
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
  text-align: left;

  /* Zajištění čitelnosti na různých zoom úrovních */
  @media (max-width: 1400px) {
    font-size: clamp(1.2rem, 2.3vw, 1.75rem);
  }

  @media (max-width: 1200px) {
    font-size: clamp(1.15rem, 2.2vw, 1.65rem);
  }

  @media (max-width: 900px) {
    font-size: clamp(1.1rem, 2.1vw, 1.6rem);
  }

  @media (max-width: 768px) {
    font-size: clamp(1rem, 2vw, 1.5rem);
  }

  @media (max-width: 600px) {
    font-size: clamp(0.95rem, 1.8vw, 1.3rem);
  }
`;

const StatLabel = styled.div`
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
  color: #64748b;
  font-weight: 500;
  text-align: left;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* Responzivní velikosti pro různé zoom úrovně */
  @media (max-width: 1200px) {
    white-space: normal;
    line-height: 1.3;
  }

  @media (max-width: 900px) {
    font-size: clamp(0.7rem, 1.1vw, 0.825rem);
  }

  @media (max-width: 768px) {
    font-size: clamp(0.65rem, 1vw, 0.8rem);
  }

  @media (max-width: 600px) {
    font-size: clamp(0.6rem, 0.9vw, 0.75rem);
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

  /* Když obsahuje FontAwesome ikonu (fallback) */
  color: ${props => props.$color || '#64748b'};
`;

const LargeStatValue = styled.div`
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 700;
  color: #1e293b;
  text-align: center;
  line-height: 1.1;
  margin-bottom: 0.5rem;

  /* Responzivní velikosti pro různé zoom úrovně */
  @media (max-width: 1400px) {
    font-size: clamp(1.15rem, 2.3vw, 1.6rem);
  }

  @media (max-width: 1200px) {
    font-size: clamp(1.3rem, 2.6vw, 2rem);
  }

  @media (max-width: 900px) {
    font-size: clamp(1.2rem, 2.4vw, 1.9rem);
  }

  @media (max-width: 768px) {
    font-size: clamp(1.1rem, 2.2vw, 1.8rem);
  }

  @media (max-width: 600px) {
    font-size: clamp(1rem, 2vw, 1.6rem);
  }
`;

const LargeStatLabel = styled.div`
  font-size: 1rem;
  color: #64748b;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1rem;

  @media (max-width: 480px) {
    font-size: 0.875rem;
  }
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const SummaryItem = styled.div`
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid ${props => props.$color || '#d1d5db'};
  background: ${props => props.$bg || 'rgba(0, 0, 0, 0.02)'};
`;

const SummaryLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.$color || '#6b7280'};
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryValue = styled.div`
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
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

//  CACHE: Status indicator komponenty
const CacheStatusIconWrapper = styled(TooltipWrapper)`
  /* Wrapper má správný position: relative z TooltipWrapper */
  
  /* OPRAVA: Tooltip má být úplně skrytý, ne jen průhledný */
  .tooltip {
    display: none;
  }
  
  &:hover .tooltip {
    display: flex;
    opacity: 1;
  }
`;

// 💡 Hint text komponenta (jako LockWarning u pokladny)
const HintText = styled.span`
  margin-left: 0.5rem;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: help;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;

  /* Styling pro <kbd> tagy podle obrázku */
  kbd {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.2;
    color: #1e40af;
    background: #dbeafe;
    border: 1px solid #93c5fd;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    text-transform: capitalize;
    white-space: nowrap;
  }
`;

const CacheStatusIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.fromCache
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  };
  color: white;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: help;
  transition: all 0.2s ease;
  position: relative;
  z-index: 999999;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }
`;

const YearFilterLabel = styled.label`
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RefreshIconButton = styled.button`
  background: ${props => props.isBackgroundActive
    ? 'rgba(255, 193, 7, 0.2)' /* Žlutá při background refresh */
    : 'rgba(255, 255, 255, 0.15)'}; /* Normální bílá */
  border: 1px solid ${props => props.isBackgroundActive
    ? 'rgba(255, 193, 7, 0.4)' /* Žlutý okraj */
    : 'rgba(255, 255, 255, 0.3)'}; /* Normální okraj */
  color: ${props => props.isBackgroundActive ? '#ffc107' : 'white'}; /* Žlutá/bílá ikona */
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
    background: ${props => props.isBackgroundActive
      ? 'rgba(255, 193, 7, 0.3)' /* Žlutá hover */
      : 'rgba(255, 255, 255, 0.25)'}; /* Bílá hover */
    border-color: ${props => props.isBackgroundActive
      ? 'rgba(255, 193, 7, 0.6)' /* Žlutý hover okraj */
      : 'rgba(255, 255, 255, 0.4)'}; /* Bílý hover okraj */
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const RefreshTimeLabel = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  margin-left: 0.5rem;
  white-space: nowrap;
  font-weight: 500;
`;

const MonthFilterLabel = styled.label`
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
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

const MonthFilterSelect = styled.select`
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
  width: auto;
  min-width: 240px;

  /* Scrollbar styling */
  overflow-y: auto;
  max-height: 400px;

  &::-webkit-scrollbar {
    width: 12px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(30, 64, 175, 0.3);
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(96, 165, 250, 0.9));
    border-radius: 6px;
    border: 2px solid rgba(30, 64, 175, 0.3);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(96, 165, 250, 1));
  }

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.8) rgba(30, 64, 175, 0.3);

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
    font-size: 0.95rem;

    &:hover {
      background: #2563eb;
    }

    &[data-separator="true"] {
      padding: 0.5rem 1rem !important;
      margin: 0 !important;
      width: 100% !important;
      height: auto !important;
      line-height: normal !important;
      font-size: 0.95rem !important;
      color: white !important;
      background: #1e40af !important;
      border: none !important;
      border-top: 1px solid white !important;
      cursor: default;
      pointer-events: none;
      display: block;
      box-sizing: border-box;
    }

    &[data-action="true"] {
      font-style: normal;
      color: white;
      font-weight: normal;
      padding: 0.5rem;
      margin: 0;
      background: #1e40af;

      &:hover {
        background: #2563eb;
      }
    }
  }
`;

// Custom Month Dropdown Components
const MonthDropdownContainer = styled.div`
  position: relative;
  width: auto;
  min-width: 240px;
`;

const YearDropdownContainer = styled.div`
  position: relative;
  width: auto;
  min-width: 160px;
`;

const MonthDropdownButton = styled.button`
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
  width: 100%;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

const MonthDropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: #1e40af;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  backdrop-filter: blur(8px);

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 12px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(30, 64, 175, 0.3);
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(96, 165, 250, 0.9));
    border-radius: 6px;
    border: 2px solid rgba(30, 64, 175, 0.3);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(96, 165, 250, 1));
  }

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.8) rgba(30, 64, 175, 0.3);
`;

const MonthDropdownItem = styled.div`
  padding: 0.75rem 1rem;
  color: white;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  font-size: 0.95rem;
  transition: background 0.15s ease;
  pointer-events: ${props => props.disabled ? 'none' : 'auto'};

  ${props => props.separator && `
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    padding: 0.5rem 1rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
  `}

  ${props => props.action && `
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  `}

  ${props => !props.disabled && !props.separator && `
    &:hover {
      background: #2563eb;
    }
  `}
`;

// Filters Panel
const FiltersPanel = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const FiltersHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 0.6fr 0.6fr;
  gap: clamp(1rem, 1.5vw, 1.5rem);
  margin-top: 1.5rem;
  margin-bottom: 1rem;

  /* První řádek: Objednatel (1), Garant (1), Příkazce (1), Schvalovatel (1), Stav objednávky (0.6+0.6) */
  /* Druhý řádek: Datum (2), Cena (2), Stav registru (0.6), Mimořádné události (0.6) pod Stav objednávky */
  
  & > *:nth-of-type(5) {
    grid-column: 5 / 7; /* Stav objednávky zabere sloupce 5, 6 (šířka 0.6+0.6) */
  }

  & > *:nth-of-type(6) {
    grid-column: 1 / 3; /* Datum - sloupce 1, 2 */
  }

  & > *:nth-of-type(7) {
    grid-column: 3 / 5; /* Cena - sloupce 3, 4 */
  }

  & > *:nth-of-type(8) {
    grid-column: 5 / 6; /* Stav registru - sloupec 5 (0.6fr) - zarovnán doleva */
  }

  & > *:nth-of-type(9) {
    grid-column: 6 / 7; /* Mimořádné události - sloupec 6 (0.6fr) - zarovnán doprava */
  }

  /* Responzivní breakpointy */
  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);

    & > *:nth-of-type(5) {
      grid-column: 3 / 4; /* Stav objednávky - 1 sloupec */
    }

    /* Na středních obrazovkách - datum a cena na vlastní řádky */
    & > *:nth-of-type(6) {
      grid-column: 1 / -1;
    }

    & > *:nth-of-type(7) {
      grid-column: 1 / -1;
    }

    & > *:nth-of-type(8) {
      grid-column: 1 / 2;
    }

    & > *:nth-of-type(9) {
      grid-column: 2 / 3;
    }
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);

    & > *:nth-of-type(5) {
      grid-column: 1 / -1; /* Stav objednávky - full width */
    }

    /* Na středních obrazovkách - datum a cena na vlastní řádky */
    & > *:nth-of-type(6) {
      grid-column: 1 / -1;
    }

    & > *:nth-of-type(7) {
      grid-column: 1 / -1;
    }

    & > *:nth-of-type(8) {
      grid-column: 1 / 2;
    }

    & > *:nth-of-type(9) {
      grid-column: 2 / 3;
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: clamp(0.8rem, 1.2vw, 1.25rem);

    /* Na mobilech - všechno na jeden sloupec */
    & > * {
      grid-column: 1 !important;
    }
  }

  @media (max-width: 480px) {
    gap: clamp(0.6rem, 1vw, 1rem);
  }
`;

// Wrapper pro tlačítko vymazat filtry v gridu
const ClearFiltersWrapper = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FilterLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 0.5rem;
`;

const FilterLabelLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterClearButton = styled.button`
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  color: #9ca3af;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
  border-radius: 4px;
  opacity: ${props => props.visible ? 1 : 0};
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
  margin-left: auto;

  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

// Wrapper pro input s ikonou - konzistentní se zbytkem aplikace
const FilterInputWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg:first-of-type {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 20px;
  height: 20px;

  &:hover {
    color: #6b7280;
  }

  > svg {
    width: 14px !important;
    height: 14px !important;
  }
`;

const FilterInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.5rem 2.5rem 0.5rem 2.5rem' : '0.5rem'};
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
  height: 42px;

  /* Pro number inputy - zarovnání doprava a odstranění šipek */
  ${props => props.type === 'number' && `
    text-align: right;
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
  `}

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

// Wrapper pro select s ikonou
const FilterSelectWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }
`;

const FilterSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.hasIcon ? '0.75rem 1.75rem 0.75rem 2.5rem' : '0.75rem 1.75rem 0.75rem 0.75rem'};
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  color: #1f2937;
  font-weight: 500;
  transition: all 0.2s ease;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #3b82f6;
  }

  /* Custom dropdown arrow - stejná jako v OrderForm25 */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;

  /* Styling pro placeholder option */
  option[value=""] {
    color: #9ca3af;
    font-weight: 400;
  }

  option {
    color: #1f2937;
    font-weight: 500;
    padding: 0.5rem;
  }
`;

// Layout pre cena od-do (dva inputy vedľa seba)
const PriceRangeGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PriceRangeInputs = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const PriceInputWrapper = styled.div`
  flex: 1;
  position: relative;

  > svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }

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
    z-index: 2;
  }
`;

const PriceSeparator = styled.span`
  color: #6b7280;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0 0.25rem;
`;

// Layout pre datum od-do (dva inputy vedľa seba)
const DateRangeGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const DateRangeInputs = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const DateInputWrapper = styled.div`
  flex: 1;
  position: relative;

  > svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }
`;

const DateSeparator = styled.span`
  color: #6b7280;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0 0.25rem;
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;

  > svg:first-of-type {
    position: absolute;
    left: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 12px !important;
    height: 12px !important;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1;
  width: 16px;
  height: 16px;

  &:hover {
    color: #6b7280;
  }

  > svg {
    width: 10px !important;
    height: 10px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  max-width: ${props => props.type === 'number' ? '120px' : '100%'};
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: #f9fafb;
  transition: all 0.2s ease;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 0.75rem;
  }
`;

const ActionBadge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  background: #dc2626;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  pointer-events: none;
  line-height: 1.2;
  z-index: 10;
  /* Prevence blikání */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;
  transform: translateZ(0);
`;

const FilterActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 2px;
  font-size: 14px;
  position: relative;
  overflow: visible;
  /* Prevence blikání ikon */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  backface-visibility: hidden;

  /* Stabilizace ikon */
  svg {
    display: block;
    pointer-events: none;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    transition: left 0.5s;
    pointer-events: none;
  }

  &:hover {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    color: #1e40af;
    border-color: #3b82f6;
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-1px) scale(1.02);
  }

  &.active {
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
    color: white;
    border-color: #1d4ed8;
    box-shadow:
      0 4px 16px rgba(59, 130, 246, 0.4),
      0 0 20px rgba(59, 130, 246, 0.3);
    transform: scale(1.1);

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg,
        rgba(255, 255, 255, 0.1) 0%,
        transparent 20%,
        transparent 80%,
        rgba(255, 255, 255, 0.1) 100%);
      animation: shimmer 2s infinite;
    }

    &:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%);
      box-shadow:
        0 6px 20px rgba(59, 130, 246, 0.5),
        0 0 25px rgba(59, 130, 246, 0.4);
      transform: scale(1.12) translateY(-2px);
    }
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// Empty State Styles
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  margin: 2rem 0;
  border: 2px dashed #cbd5e1;
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  color: #94a3b8;
  margin-bottom: 1.5rem;
  opacity: 0.7;
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 0.5rem 0;
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  max-width: 500px;
`;

// Table Styles - wrapper s relativní pozicí pro scroll indikátory
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

// Floating Header Panel - zobrazí se při scrollování
const FloatingHeaderPanel = styled.div`
  position: fixed;
  top: calc(var(--app-header-height, 96px) + 48px);
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  border-top: 2px solid #cbd5e1;
  border-bottom: 3px solid #3b82f6;
  opacity: ${props => props.$visible ? 1 : 0};
  transform: translateY(${props => props.$visible ? '0' : '-10px'});
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const FloatingTableWrapper = styled.div`
  overflow-x: auto;
  max-width: 100%;
  padding: 0 1rem;
  box-sizing: border-box;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
  
  /* Synchronizace scroll pozice s hlavní tabulkou */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

// Scroll šipka - levá - FIXED position (pohybuje se s vertikálním scrollem)
const ScrollArrowLeft = styled.button`
  position: fixed;
  left: 50px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 9999;

  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  background: ${props => {
    // Plná bílá JEN když je hover přímo NAD ŠIPKOU
    if (props.$arrowHovered) {
      return 'rgba(255, 255, 255, 0.98)';
    }
    return 'rgba(255, 255, 255, 0.25)'; // 75% průhledná (zobrazuje se když je hover nad tabulkou)
  }};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  transition: all 0.3s ease;

  /* Zobrazit když: 1) je potřeba scrollovat A 2) je hover nad tabulkou NEBO nad šipkou */
  opacity: ${props => (props.$visible && (props.$tableHovered || props.$arrowHovered)) ? 1 : 0};
  pointer-events: ${props => (props.$visible && (props.$tableHovered || props.$arrowHovered)) ? 'auto' : 'none'};
  transform: translateY(-50%); /* Vždy stejná velikost, žádný scale */

  &:hover:not(:disabled) {
    background: rgba(248, 250, 252, 0.98);
    border-color: #3b82f6;
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(-50%) scale(1.05);
  }

  &:disabled {
    opacity: 0;
    pointer-events: none;
  }

  svg {
    width: 22px;
    height: 22px;
    color: #3b82f6;
  }
`;

// Scroll šipka - pravá - FIXED position
const ScrollArrowRight = styled(ScrollArrowLeft)`
  left: auto;
  right: 50px;
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
  /* Základní pozadí řádku podle priority:
     1. NEAKTIVNÍ OBJEDNÁVKY - nejvyšší priorita - šedé, přeškrtnuté
     2. KONCEPTY V EDITACI - druhá nejvyšší priorita - oranžové zvýraznění
     3. ZVÝRAZŇOVÁNÍ PODLE STAVU - pokud je zapnuto
     4. STRIPING - jednoduché střídání bílé/šedé (pokud highlighting vypnuto)
  */
  background: ${props => {
    // 1. NEAKTIVNÍ OBJEDNÁVKY - jen šedé pozadí, přeškrtnutí se dělá v CSS níže
    if (props.$isInactive) {
      return '#f8f9fa';
    }

    // 2. KONCEPTY V EDITACI - DRUHÁ NEJVYŠŠÍ PRIORITA - vždy viditelné
    if (props.$isDraft || props.$hasLocalChanges) {
      return 'linear-gradient(135deg, #ea580c 0%, #f97316 30%, #ea580c 70%, #dc2626 100%)';
    }

    // 3. ZVÝRAZŇOVÁNÍ PODLE STAVU - pokud je zapnuto
    if (props.$showHighlighting && props.$order) {
      const bgColor = getRowBackgroundColor(props.$order);
      if (bgColor && bgColor !== 'transparent') {
        return `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 50%, ${bgColor} 100%)`;
      }
    }

    // 4. DEFAULT - čistě bílé pozadí
    return 'white';
  }};

  /* Speciální efekty pro NEAKTIVNÍ OBJEDNÁVKY - přeškrtnuté jako u faktur */
  ${props => props.$isInactive ? `
    opacity: 0.6;
    position: relative;
    text-decoration: line-through;
    background: #f8f9fa !important;

    /* Šedé písmo pro neaktivní */
    color: #6c757d !important;

    /* Všechny vnořené elementy */
    & * {
      color: #6c757d !important;
      text-decoration: line-through;
    }

    & div, & span, & sup, & sub, & small, & strong {
      color: #6c757d !important;
    }

    /* Ikony a SVG */
    & .fa, & svg, & [class*="fa-"] {
      color: #6c757d !important;
    }

    /* Disabled tlačítka */
    & button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Hover efekt */
    &:hover {
      opacity: 0.75;
      background: #e9ecef !important;
    }
  ` : ''}

  /* Speciální efekty pro KONCEPTY V EDITACI - jen světlejší pozadí */
  ${props => (props.$isDraft || props.$hasLocalChanges) ? `
    border-left: 4px solid #ea580c;
    position: relative;
    z-index: 5;

    /* Bílé písmo pro koncepty - důležité pro čitelnost */
    color: white !important;
    font-weight: 700;

    /* Všechny vnořené elementy */
    & * {
      color: white !important;
      font-weight: 600 !important;
    }

    & div, & span, & sup, & sub, & small, & strong {
      color: white !important;
    }

    /* Ikony a SVG */
    & .fa, & svg, & [class*="fa-"] {
      color: white !important;
    }

    /* Tlačítka v konceptech */
    & button {
      color: white !important;
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.3) !important;

      &:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
      }
    }

    /* Vstupní pole v konceptech */
    & input {
      background: rgba(255, 255, 255, 0.1) !important;
      color: white !important;
      border-color: rgba(255, 255, 255, 0.3) !important;

      &::placeholder {
        color: rgba(255, 255, 255, 0.7) !important;
      }
    }

    /* Hover efekt pro koncepty - jen světlejší pozadí */
    &:hover {
      background: linear-gradient(135deg, #fed7aa 0%, #fdba74 30%, #fb923c 70%, #f97316 100%) !important;

      & * {
        color: #7c2d12 !important;
      }
    }
  ` : ''}

  /* EFEKTY PODLE STAVU - pouze pokud není koncept */
  ${props => {
    if (!(props.$isDraft || props.$hasLocalChanges) && props.$showHighlighting && props.$order) {
      // Získej systémový stav pomocí stejné logiky jako getRowBackgroundColor
      let systemStatus;

      if (props.$order?.stav_objednavky) {
        // Mapování uživatelsky přívětivých stavů na systémové kódy
        const mapping = {
          'Ke schválení': 'ODESLANA_KE_SCHVALENI', // ✅ FIX: Backend používá ODESLANA_KE_SCHVALENI
          'Nová': 'NOVA',
          'Schválená': 'SCHVALENA',
          'Zamítnutá': 'ZAMITNUTA',
          'Rozpracovaná': 'ROZPRACOVANA',
          'Odeslaná dodavateli': 'ODESLANA',
          'Potvrzená dodavatelem': 'POTVRZENA',
          'Uveřejněná': 'UVEREJNENA',
          'Čeká na potvrzení': 'CEKA_POTVRZENI',
          'Čeká se': 'CEKA_SE',
          'Odloženo': 'CEKA_SE',
          'Dokončená': 'DOKONCENA',
          'Zrušená': 'ZRUSENA',
          'Smazaná': 'SMAZANA',
          'Koncept': 'NOVA'
        };
        systemStatus = mapping[props.$order.stav_objednavky] || props.$order.stav_objednavky;
      } else if (props.$order?.stav_workflow_kod) {
        try {
          const workflowStates = JSON.parse(props.$order.stav_workflow_kod);
          systemStatus = Array.isArray(workflowStates) ? workflowStates[workflowStates.length - 1] : props.$order.stav_workflow_kod;
        } catch {
          systemStatus = props.$order.stav_workflow_kod;
        }
      } else {
        systemStatus = props.$order?.stav_id_num ?? props.$order?.stav_id ?? props.$order?.status_id ?? props.$order?.stav ?? 'NOVA';
      }

      const statusColors = getStatusColor(systemStatus);
      const bgColor = statusColors?.light || '#f8fafc';
      const darkColor = statusColors?.dark || '#64748b';

      return `
        /* Jemný 3D efekt podle stavu */
        box-shadow:
          0 2px 8px ${bgColor}66,
          inset 0 1px 0 rgba(255, 255, 255, 0.5);

        /* Lepší čitelnost textu */
        color: #1f2937;
        font-weight: 500;

        /* Hover efekt pro řádky s highlighting - jen světlejší pozadí */
        &:hover {
          filter: brightness(1.1);
          color: #1f2937 !important;
        }
      `;
    }
    return '';
  }}

  /* 🔧 NEAKTIVNÍ (SMAZANÉ) OBJEDNÁVKY - admin view */
  ${props => props.$inactive ? `
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
  ` : ''}

  /* BLINK EFEKT při uložení - má nejvyšší prioritu */
  ${props => props.$isHighlighted ? highlightPulse + `
    animation: highlightPulse 3s ease-out;
    animation-iteration-count: 1;
    z-index: 100 !important;
    position: relative;
    
    /* Po dokončení animace zůstane výrazný tmavě zelený border */
    border: 3px solid #059669 !important;
    border-left: 6px solid #047857 !important;
    box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.2) !important;
  ` : ''}

  /* Jemný hover efekt pro všechny řádky (kromě konceptů které mají vlastní) */
  ${props => !(props.$isDraft || props.$hasLocalChanges) ? `
    &:hover {
      ${props.$showHighlighting ?
        // Pokud je highlighting zapnuto, jen jemné zesvětlení
        `filter: brightness(1.08);` :
        // Pokud highlighting vypnuto, světle modrý hover
        `background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;`
      }
    }
  ` : ''}

  /* Plynulé přechody */
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  /* Cursor pro řádek - pointer s kontextovým menu (double-click pro editaci) */
  cursor: pointer;
`;

const TableHeader = styled.th`
  padding: 0.5rem 0.375rem;
  text-align: center;
  font-weight: 600;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  user-select: none;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TableCell = styled.td`
  padding: 0.375rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #3b82f6;
  font-size: 1.25rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background: #eff6ff;
  }
`;

// Expanded Row Content
const ExpandedContent = styled.div`
  padding: 0.75rem;
  background: ${props => {
    if (props.$order && props.$showRowHighlighting) {
      // Získej systémový stav pro mapování na barvy
      let systemStatus;

      // Preferuj uživatelsky přívětivý stav z stav_objednavky a zmapuj na systémový
      if (props.$order?.stav_objednavky) {
        systemStatus = mapUserStatusToSystemCode(props.$order.stav_objednavky);
      }
      // Fallback na stav_workflow_kod
      else if (props.$order?.stav_workflow_kod) {
        try {
          const workflowStates = JSON.parse(props.$order.stav_workflow_kod);
          systemStatus = Array.isArray(workflowStates) ? workflowStates[workflowStates.length - 1] : props.$order.stav_workflow_kod;
        } catch {
          systemStatus = props.$order.stav_workflow_kod;
        }
      } else {
        systemStatus = props.$order?.stav_id_num ?? props.$order?.stav_id ?? props.$order?.status_id ?? props.$order?.stav ?? 'NOVA';
      }

      const statusColors = getStatusColor(systemStatus);
      const bgColor = statusColors?.light || '#f8fafc';
      const lighterBgColor = getLighterColor(bgColor, 0.05); // Jen 5% opacity pro jemnější efekt

      return lighterBgColor;
    }
    return '#f9fafb'; // Lehce šedé pozadí pro lepší kontrast
  }};
  border-top: 2px solid ${props => {
    if (props.$order && props.$showRowHighlighting) {
      // Získej systémový stav pro mapování na barvy
      let systemStatus;

      if (props.$order?.stav_objednavky) {
        systemStatus = mapUserStatusToSystemCode(props.$order.stav_objednavky);
      } else if (props.$order?.stav_workflow_kod) {
        try {
          const workflowStates = JSON.parse(props.$order.stav_workflow_kod);
          systemStatus = Array.isArray(workflowStates) ? workflowStates[workflowStates.length - 1] : props.$order.stav_workflow_kod;
        } catch {
          systemStatus = props.$order.stav_workflow_kod;
        }
      } else {
        systemStatus = props.$order?.stav_id_num ?? props.$order?.stav_id ?? props.$order?.status_id ?? props.$order?.stav ?? 'NOVA';
      }

      const statusColors = getStatusColor(systemStatus);
      const darkColor = statusColors?.dark || '#64748b';

      return darkColor;
    }
    return '#e5e7eb';
  }};
  border-bottom: 2px solid #000000;
`;

const ExpandedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;

  /* První řádek: 4 karty (Základní, Finanční, Odpovědné, Workflow) */
  /* Každá karta zabere 1 sloupec = 25% šířky */

  /* Druhý řádek: 3 sloupce (Dodavatel, Položky+Faktury, Přílohy) */
  /* Každý sloupec zabere 33.33% šířky */

  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// Třísloupcový layout: Dodavatel | Položky+Faktury | Přílohy
const ThreeColumnLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(200px, 0.8fr) 1.1fr 1.1fr; /* Dodavatel užší, položky+faktury a přílohy širší */
  gap: 0.75rem;
  grid-column: 1 / -1; /* Zabere celou šířku gridu */

  @media (max-width: 1400px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const SupplierColumn = styled.div`
  display: flex;
  flex-direction: column;
  
  /* InfoCard má zabrat celou výšku */
  > div {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
`;

const MiddleColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const AttachmentsColumn = styled.div`
  display: flex;
  flex-direction: column;

  /* InfoCard má zabrat celou výšku */
  > div {
    flex: 1;
    display: flex;
    flex-direction: column;

    /* Obsah přílohy roztáhnout */
    > div:last-child {
      flex: 1;
      overflow-y: auto;
    }
  }
`;

// Starý layout (ponechán pro případné další použití)
const SecondRowLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  grid-column: 1 / -1;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  > div {
    flex: 1;
    display: flex;
    flex-direction: column;

    > div:last-child {
      flex: 1;
      overflow-y: auto;
    }
  }
`;
const InfoCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 0.625rem;
  border-left: 4px solid ${props => {
    if (props.$order && props.$showRowHighlighting) {
      // Získej systémový stav pro mapování na barvy
      let systemStatus;

      if (props.$order?.stav_objednavky) {
        systemStatus = mapUserStatusToSystemCode(props.$order.stav_objednavky);
      } else if (props.$order?.stav_workflow_kod) {
        try {
          const workflowStates = JSON.parse(props.$order.stav_workflow_kod);
          systemStatus = Array.isArray(workflowStates) ? workflowStates[workflowStates.length - 1] : props.$order.stav_workflow_kod;
        } catch {
          systemStatus = props.$order.stav_workflow_kod;
        }
      } else {
        systemStatus = props.$order?.stav_id_num ?? props.$order?.stav_id ?? props.$order?.status_id ?? props.$order?.stav ?? 'NOVA';
      }

      const statusColors = getStatusColor(systemStatus);
      const darkColor = statusColors?.dark || '#3b82f6';

      return darkColor;
    }
    return '#3b82f6';
  }};
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);

  /* 3D efekt pro karty */
  position: relative;
  transform: translateZ(0);
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  /* Subtle gradient overlay pro 3D efekt */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.02) 100%);
    border-radius: 8px;
    pointer-events: none;
  }
`;

const InfoCardTitle = styled.h4`
  margin: 0 0 0.375rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0a0a0a;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #6b7280;
    opacity: 0.8;
  }
`;

// 🆕 Komponenty pro faktury a dodatečné dokumenty
const ListItemCard = styled.div`
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateX(2px);
  }
`;

const ListItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
  gap: 12px;
`;

const ListItemTitle = styled.div`
  font-weight: 600;
  font-size: 0.95em;
  color: #0f172a;
  flex: 1;
`;

const ListItemBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  background: ${props => props.$success ? '#dcfce7' : props.$warning ? '#fef3c7' : '#dbeafe'};
  color: ${props => props.$success ? '#166534' : props.$warning ? '#854d0e' : '#1e40af'};
  border: 1px solid ${props => props.$success ? '#86efac' : props.$warning ? '#fde047' : '#93c5fd'};

  svg {
    color: #6b7280;
    opacity: 0.8;
  }
`;

const ListItemMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.85em;
  color: #64748b;
`;

const ListItemMetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const AttachmentsList = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
  font-size: 0.85em;
  transition: background 0.15s ease;

  &:hover {
    background: #e0f2fe !important;
  }
`;

const AttachmentName = styled.span`
  flex: 1;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AttachmentSize = styled.span`
  color: #94a3b8;
  font-size: 0.9em;
  margin-left: 8px;
`;

// 🆕 Komponenty pro fáze dokončení
const PhaseProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
`;

const PhaseProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.$progress || 0}%;
`;

const PhaseLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9em;
  margin-bottom: 4px;

  .phase-name {
    font-weight: 500;
    color: #1e293b;
  }

  .phase-percent {
    font-weight: 600;
    color: #3b82f6;
  }
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 0.225rem 0;
  border-bottom: 1px dashed #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #0a0a0a;
  flex-shrink: 0;
  white-space: nowrap;
  max-width: 45%;
`;

const InfoValue = styled.span`
  color: #0a0a0a;
  text-align: right;
  word-wrap: break-word;
  overflow-wrap: break-word;
  flex: 1;
  min-width: 0;
  line-height: 1.3;
`;

// Pagination
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

// Status Badge
const StatusBadge = styled.span`
  display: inline-flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  border: 2px solid;
  background: ${props => {
    // Speciální styling pro editované/konceptové řádky - transparentní pozadí (jen obrys)
    if (props.$isInEditRow) {
      return 'transparent';
    }
    const statusColors = getStatusColor(props.$status);
    return statusColors?.light || STATUS_COLORS.NOVA.light;
  }};
  color: ${props => {
    // Speciální styling pro editované/konceptové řádky - tmavé barvy pro dobrý kontrast
    if (props.$isInEditRow) {
      const statusColors = getStatusColor(props.$status);
      return statusColors?.dark || STATUS_COLORS.NOVA.dark;
    }
    const statusColors = getStatusColor(props.$status);
    return statusColors?.dark || STATUS_COLORS.NOVA.dark;
  }};
  border-color: ${props => {
    // Speciální styling pro editované/konceptové řádky - sytě červený rámeček místo modrého
    if (props.$isInEditRow) {
      return '#dc2626'; // sytě červená barva pro edit řádky místo rušivé modré
    }
    const statusColors = getStatusColor(props.$status);
    return statusColors?.dark || STATUS_COLORS.NOVA.dark;
  }};
  box-shadow: ${props => {
    // Přidej stín pro lepší viditelnost na oranžovém pozadí
    if (props.$isInEditRow) {
      return '0 1px 3px rgba(0, 0, 0, 0.2)';
    }
    return 'none';
  }};
`;

// Action Menu
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
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  border-radius: 4px;
  color: ${props => props.$disabled ? '#94a3b8' : '#64748b'};
  font-size: 0.8rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
  opacity: ${props => props.$disabled ? '0.4' : '1'};
  position: relative;

  /* Prevence blikání ikon */
  svg {
    display: block;
    pointer-events: none;
  }

  &:hover:not(:disabled):not([disabled]) {
    background: #f1f5f9;
    color: #1e293b;
  }

  &.edit:hover {
    color: ${props => props.$disabled ? '#94a3b8' : '#3b82f6'};
    background: ${props => props.$disabled ? 'transparent' : '#eff6ff'};
  }

  &.export-document:hover {
    color: ${props => props.$disabled ? '#94a3b8' : '#059669'};
    background: ${props => props.$disabled ? 'transparent' : '#ecfdf5'};
  }

  &.delete:hover {
    color: ${props => props.$disabled ? '#94a3b8' : '#dc2626'};
    background: ${props => props.$disabled ? 'transparent' : '#fef2f2'};
  }

  &.create-invoice:hover {
    color: ${props => props.$disabled ? '#94a3b8' : '#0891b2'};
    background: ${props => props.$disabled ? 'transparent' : '#ecfeff'};
  }

  &.financial-control:hover {
    color: ${props => props.$disabled ? '#94a3b8' : '#7c3aed'};
    background: ${props => props.$disabled ? 'transparent' : '#f5f3ff'};
  }
`;

// Badge pro počet faktur na ikoně
const InvoiceCountBadge = styled.span`
  position: absolute;
  top: -2px;
  right: 0px;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
`;

// Debug Panel Styles
const DebugPanel = styled.div`
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border: 2px solid #0ea5e9;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: white;
  font-family: 'Courier New', monospace;
  box-shadow: 0 8px 32px rgba(14, 165, 233, 0.3);
`;

const DebugHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba(14, 165, 233, 0.3);
`;

const DebugTitle = styled.h3`
  margin: 0;
  color: #0ea5e9;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DebugContent = styled.div`
  max-height: 400px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid rgba(14, 165, 233, 0.2);
`;

const DebugSection = styled.div`
  margin-bottom: 1rem;
  &:last-child { margin-bottom: 0; }
`;

const DebugLabel = styled.div`
  color: #0ea5e9;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const DebugValue = styled.pre`
  margin: 0;
  color: #e2e8f0;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #0ea5e9;
`;

// Loading Overlay with blur and fade effects
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

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const LoadingSpinner = styled.div`
  width: 64px;
  height: 64px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #f59e0b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
  transform: scale(${props => props.$visible ? 1 : 0.8});
  transition: transform 0.5s ease-in-out;

  @keyframes spin {
    0% { transform: rotate(0deg) scale(1); }
    100% { transform: rotate(360deg) scale(1); }
  }
`;

const LoadingMessage = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
  margin-bottom: 0.5rem;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.1s, opacity 0.5s ease-in-out 0.1s;
`;

const LoadingSubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.15s, opacity 0.5s ease-in-out 0.15s;
`;

const PageContent = styled.div`
  position: relative;
  filter: blur(${props => props.$blurred ? '5px' : '0px'});
  opacity: ${props => props.$blurred ? 0.6 : 1};
  transition: filter 0.5s ease-in-out, opacity 0.5s ease-in-out;
  pointer-events: ${props => props.$blurred ? 'none' : 'auto'};
  will-change: ${props => props.$blurred ? 'filter, opacity' : 'auto'};
  isolation: isolate;
`;

// 🔒 Styled komponenty pro zamčenou objednávku dialog (používáno v LOCKED ORDER ConfirmDialog)
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

// 📊 Styled komponenty pro export preview modal
const ExportPreviewOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999999;
  animation: fadeIn 0.2s ease;
  padding: 2rem;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ExportPreviewDialog = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ExportPreviewHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px 16px 0 0;
`;

const ExportPreviewTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  svg {
    font-size: 1.75rem;
  }
`;

const ExportPreviewCloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  svg {
    font-size: 1.25rem;
  }
`;

const ExportPreviewContent = styled.div`
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
`;

const ExportInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const ExportInfoCard = styled.div`
  padding: 0.75rem;
  background: linear-gradient(135deg, #f6f8fb 0%, #eef2f7 100%);
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const ExportInfoLabel = styled.div`
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 0.375rem;
`;

const ExportInfoValue = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  svg {
    font-size: 1rem;
    color: #667eea;
  }
`;

const ExportPreviewTable = styled.div`
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  width: fit-content;
  min-width: 100%;
`;

const ExportPreviewTableHeader = styled.div`
  display: flex;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
`;

const ExportPreviewTableHeaderCell = styled.div`
  padding: 0.75rem 1rem;
  border-right: 1px solid #e5e7eb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  
  &:last-child {
    border-right: none;
  }
`;

const ExportPreviewTableRow = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }

  &:nth-of-type(even) {
    background: #f9fafb;
  }

  &:hover {
    background: #f3f4f6;
  }
`;

const ExportPreviewTableCell = styled.div`
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #1f2937;
  border-right: 1px solid #e5e7eb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  
  &:last-child {
    border-right: none;
  }
`;

const ExportPreviewFooter = styled.div`
  padding: 1.5rem 2rem;
  border-top: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
`;

const ExportPreviewNote = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #3b82f6;
  }
`;

const ExportPreviewActions = styled.div`
  display: flex;
  gap: 1rem;
`;

const ExportPreviewButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;

  ${props => props.$variant === 'cancel' && `
    background: white;
    color: #6b7280;
    border: 2px solid #e5e7eb;

    &:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `}

  ${props => props.$variant === 'confirm' && `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.5);
    }
  `}

  svg {
    font-size: 1rem;
  }
`;

// 📄 Styled komponenty pro dialog hromadného generování DOCX
const BulkDocxOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999999;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const BulkDocxDialog = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from { transform: translateY(50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const BulkDocxHeader = styled.div`
  background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
  padding: 1.5rem 2rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BulkDocxTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BulkDocxBody = styled.div`
  padding: 2rem;
  max-height: calc(90vh - 200px);
  overflow-y: auto;
`;

const BulkDocxOrderItem = styled.div`
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: #0891b2;
    box-shadow: 0 4px 12px rgba(8, 145, 178, 0.1);
  }
`;

const BulkDocxOrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const BulkDocxOrderNumber = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BulkDocxOrderInfo = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 0.75rem;
`;

const BulkDocxSignerSelect = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.75rem;
`;

const BulkDocxSignerLabel = styled.label`
  font-weight: 600;
  color: #475569;
  min-width: 120px;
`;

const BulkDocxFooter = styled.div`
  background: #f8fafc;
  padding: 1.5rem 2rem;
  border-top: 2px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const BulkDocxSummary = styled.div`
  font-size: 1rem;
  color: #475569;
  font-weight: 600;
`;

const BulkDocxActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const BulkDocxButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid;

  &.primary {
    background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
    color: white;
    border-color: #0891b2;

    &:hover {
      background: linear-gradient(135deg, #0e7490 0%, #0891b2 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
    }
  }

  &.secondary {
    background: white;
    color: #64748b;
    border-color: #cbd5e1;

    &:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
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

// =============================================================================
// FORCE UNLOCK WARNING DIALOG - Styled Components
// =============================================================================

const ForceUnlockWarningOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ForceUnlockWarningDialog = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ForceUnlockWarningHeader = styled.div`
  background: linear-gradient(135deg, #fca5a5, #ef4444, #dc2626);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 3px solid #b91c1c;
`;

const ForceUnlockWarningIcon = styled.div`
  font-size: 2.5rem;
  animation: pulse 2s ease-in-out infinite;
  filter: drop-shadow(0 2px 8px rgba(185, 28, 28, 0.5));

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }
`;

const ForceUnlockWarningTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1.25rem;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  flex: 1;
`;

const ForceUnlockWarningContent = styled.div`
  padding: 1.5rem;
`;

const ForceUnlockWarningMessage = styled.div`
  margin-bottom: 1.25rem;
  line-height: 1.6;
  color: #374151;

  strong {
    color: #dc2626;
    font-weight: 700;
  }

  p {
    margin: 0 0 0.75rem 0;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const ForceUnlockWarningDetails = styled.div`
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 2px solid #fecaca;
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
`;

const ForceUnlockWarningDetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.9375rem;

  &:last-child {
    margin-bottom: 0;
  }

  svg {
    color: #dc2626;
    flex-shrink: 0;
  }
`;

const ForceUnlockWarningDetailLabel = styled.span`
  font-weight: 700;
  color: #7f1d1d;
  min-width: 120px;
`;

const ForceUnlockWarningDetailValue = styled.span`
  color: #991b1b;
  flex: 1;
`;

const ForceUnlockWarningActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #f3f4f6;
`;

const ForceUnlockWarningButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  ${props => props.$primary ? `
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);

    &:hover {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
    }
  ` : `
    background: #f3f4f6;
    color: #374151;

    &:hover {
      background: #e5e7eb;
    }
  `}

  &:active {
    transform: translateY(0);
  }
`;

// 🎯 Schvalovací dialog (pro příkazce)
const ApprovalDialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ApprovalDialog = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 1200px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ApprovalDialogHeader = styled.div`
  background: linear-gradient(135deg, #10b981, #059669);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 2px solid #047857;
`;

const ApprovalDialogIcon = styled.div`
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 8px rgba(4, 120, 87, 0.5));
`;

const ApprovalDialogTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1.125rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  flex: 1;
`;

const ApprovalDialogContent = styled.div`
  padding: 1.25rem;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
`;

// 🆕 Two-column layout
const ApprovalTwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const ApprovalLeftColumn = styled.div`
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

const ApprovalRightColumn = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  height: fit-content;
`;

// 🆕 Kompaktní seznam (místo tabulky)
const ApprovalCompactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const ApprovalCompactItem = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
  
  &:last-child {
    border-bottom: none;
  }
`;

const ApprovalCompactLabel = styled.div`
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 600;
`;

const ApprovalCompactValue = styled.div`
  font-size: 0.875rem;
  color: #0f172a;
  line-height: 1.4;
  word-break: break-word;
`;

// 🆕 Sekce nadpisy
const ApprovalSection = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  
  &:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const ApprovalSectionTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
`;

// 🆕 LP Item - kompaktní zobrazení v pravém sloupci
const ApprovalLPItem = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ApprovalLPHeader = styled.div`
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
`;

const ApprovalLPRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
  color: #64748b;
  
  strong {
    color: #0f172a;
    font-size: 0.875rem;
  }
  
  ${props => props.$highlight && `
    background: #f8fafc;
    padding: 0.5rem;
    margin: 0.25rem -0.5rem;
    border-radius: 4px;
  `}
`;

const ApprovalDialogTopGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  grid-column: 1 / -1;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ApprovalDialogSection = styled.div`
  margin-bottom: ${props => props.$fullWidth ? '1rem' : '0'};
  grid-column: ${props => props.$fullWidth ? '1 / -1' : 'auto'};

  &:last-child {
    margin-bottom: 0;
  }
`;

const ApprovalDialogLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ApprovalDialogValue = styled.div`
  font-size: 0.9375rem;
  color: #0f172a;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  line-height: 1.4;
`;

const ApprovalDialogNote = styled.div`
  font-size: 0.8125rem;
  color: #64748b;
  font-style: italic;
  margin-top: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: #f1f5f9;
  border-left: 3px solid #cbd5e1;
  border-radius: 4px;
`;

const ApprovalDialogTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.625rem;
  border: 2px solid ${props => props.$hasError ? '#ef4444' : '#e2e8f0'};
  border-radius: 6px;
  font-size: 0.9375rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
  background: ${props => props.$hasError ? '#fef2f2' : 'white'};

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#dc2626' : '#10b981'};
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const ApprovalDialogError = styled.div`
  color: #ef4444;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-top: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;

  &:before {
    content: '⚠️';
    font-size: 0.875rem;
  }
`;

const ApprovalDialogActions = styled.div`
  display: flex;
  gap: 0.625rem;
  margin-top: 1.25rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
`;

const ApprovalDialogButton = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${props => {
    if (props.$approve) {
      return `
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        box-shadow: 0 3px 8px rgba(16, 185, 129, 0.25);

        &:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
        }
      `;
    } else if (props.$reject) {
      return `
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        box-shadow: 0 3px 8px rgba(239, 68, 68, 0.25);

        &:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
        }
      `;
    } else if (props.$postpone) {
      return `
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        box-shadow: 0 3px 8px rgba(245, 158, 11, 0.25);

        &:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
        }
      `;
    } else {
      return `
        background: #f3f4f6;
        color: #374151;

        &:hover {
          background: #e5e7eb;
        }
      `;
    }
  }}

  &:active {
    transform: translateY(0);
  }
`;

// =============================================================================
// MULTISELECT KOMPONENTA (mimo hlavní komponentu aby se nevytvářela při každém renderu)
// =============================================================================

const MultiSelectLocal = ({ field, value, onChange, options, placeholder, icon }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState(''); // 🔍 Přidáno vyhledávání
  const dropdownRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  // Zavři dropdown při kliku mimo
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(''); // Vymaž vyhledávání při zavření
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // 🔍 Focus na vyhledávací pole při otevření
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // ✅ OPTIMALIZACE: requestAnimationFrame místo setTimeout
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Memoizuj aktuální hodnoty pro rychlejší porovnávání
  const valueSet = React.useMemo(() => {
    const arr = Array.isArray(value) ? value : [];
    // Převeď všechny hodnoty na stringy pro konzistentní porovnávání
    return new Set(arr.map(v => String(v)));
  }, [value]);

  // 🔍 Filtrované options podle vyhledávání
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;

    const search = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return options.filter(opt => {
      const label = (opt.displayName || opt.nazev_stavu || opt.nazev || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return label.includes(search);
    });
  }, [options, searchTerm]);

  const getDisplayValue = React.useCallback(() => {
    if (!value || value.length === 0) return placeholder || 'Vyberte...';
    if (value.length === 1) {
      const opt = options?.find(o => String(o.id) === String(value[0]));
      // Pro názvy použij pořadí: displayName > nazev_stavu > nazev
      return opt ? (opt.displayName || opt.nazev_stavu || opt.nazev || value[0]) : value[0];
    }
    return `Vybráno: ${value.length}`;
  }, [value, options, placeholder]);

  const handleToggle = React.useCallback((optValue) => {
    const currentValue = Array.isArray(value) ? value : [];
    const newValue = currentValue.includes(optValue)
      ? currentValue.filter(v => v !== optValue)
      : [...currentValue, optValue];

    // MultiSelectLocal value change

    // Vytvoř fake event s options pro kompatibilitu s existujícími handlery
    const fakeEvent = {
      target: {
        options: newValue.map(v => ({ value: v, selected: true }))
      }
    };
    onChange(fakeEvent);
  }, [value, onChange, field]);

  const handleMainClick = React.useCallback((e) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }, []);

  const handleItemClick = React.useCallback((e, optValue) => {
    e.stopPropagation();
    handleToggle(optValue);
  }, [handleToggle]);

  // Pokud nejsou options, zobraz placeholder
  if (!options || options.length === 0) {
    return (
      <div style={{
        padding: '0.75rem 2.5rem',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        color: '#9ca3af',
        fontSize: '0.875rem'
      }}>
        Načítání...
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={handleMainClick}
        style={{
          width: '100%',
          padding: '0.75rem 2.5rem 0.75rem 2.5rem',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '0.875rem',
          background: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          color: (!value || value.length === 0) ? '#9ca3af' : '#1f2937',
          fontWeight: (value && value.length > 0) ? '600' : '400'
        }}
      >
        <span>{getDisplayValue()}</span>
        <svg
          style={{
            position: 'absolute',
            right: '0.5rem',
            width: '16px',
            height: '16px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#ffffff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          zIndex: 9999,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '400px'
        }}>
          {/* 🔍 Vyhledávací pole */}
          <div style={{
            padding: '0.75rem',
            borderBottom: '2px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            background: '#ffffff',
            zIndex: 1
          }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <FontAwesomeIcon
                icon={faSearch}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  width: '12px',
                  height: '12px',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hledat..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Seznam options */}
          <div style={{
            overflowY: 'auto',
            maxHeight: '300px'
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '0.875rem'
              }}>
                Žádné výsledky
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optValue = String(opt.id || '');
                const optLabel = opt.displayName || opt.nazev_stavu || opt.nazev || 'Bez názvu';
                const isSelected = valueSet.has(optValue);

                if (!optValue) {
                  return null; // Přeskoč položky bez ID
                }

                return (
                  <div
                    key={optValue}
                    onClick={(e) => handleItemClick(e, optValue)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px',
                        accentColor: '#3b82f6',
                        pointerEvents: 'none'
                      }}
                    />
                    <span style={{
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#1f2937' : '#4b5563'
                    }}>
                      {optLabel}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Ikona vlevo dole */}
      {icon && (
        <div style={{
          position: 'absolute',
          left: '0.75rem',
          bottom: '0.75rem',
          color: '#9ca3af',
          pointerEvents: 'none',
          fontSize: '14px'
        }}>
          {icon}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Orders25List = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, username, hasPermission, hasAdminRole, user_id, userDetail, userPermissions, expandedPermissions } = useContext(AuthContext);
  const { setProgress } = useContext(ProgressContext) || {};
  const { setDebugInfo } = useContext(DebugContext) || {};
  const { showToast } = useContext(ToastContext) || {};
  
  // HIERARCHIE: Načíst konfiguraci hierarchie
  const [hierarchyConfig, setHierarchyConfig] = useState(null);

  // CRITICAL FIX: API V2 vrací ID jako NUMBER, AuthContext má user_id jako STRING
  // Konverze na number pro všechna porovnání
  const currentUserId = useMemo(() => parseInt(user_id, 10), [user_id]);

  // Helper funkce pro user-specific localStorage klíče
  const getUserKey = (baseKey) => `${baseKey}_user_${currentUserId || 'anon'}`;

  // Helper funkce pro ukládání/načítání s user izolací
  const getUserStorage = (baseKey, defaultValue = null) => {
    try {
      const saved = localStorage.getItem(getUserKey(baseKey));
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const setUserStorage = (baseKey, value) => {
    try {
      localStorage.setItem(getUserKey(baseKey), JSON.stringify(value));
    } catch (e) {
      // Failed to save to localStorage
    }
  };
  const bgTasksContext = useBackgroundTasks();

  //  CACHE FIX: Stabilizuj permissions pro dependencies (useMemo místo přímého volání hasPermission)
  // Toto zabrání zbytečnému rerendering při každém F5
  const permissions = useMemo(() => {
    if (!hasPermission) return { canViewAll: false, hasOnlyOwn: false };

    const canViewAll = hasPermission('ORDER_MANAGE') ||
                       hasPermission('ORDER_READ_ALL') ||
                       hasPermission('ORDER_VIEW_ALL') ||
                       hasPermission('ORDER_EDIT_ALL') ||
                       hasPermission('ORDER_DELETE_ALL');

    const hasOnlyOwn = !canViewAll && (
      hasPermission('ORDER_READ_OWN') ||
      hasPermission('ORDER_VIEW_OWN') ||
      hasPermission('ORDER_EDIT_OWN') ||
      hasPermission('ORDER_DELETE_OWN')
    );

    return { canViewAll, hasOnlyOwn };
  }, [hasPermission]);

  //  OPTIMALIZACE: Ref pro aktuální hodnotu permissions
  // Použití v loadData useCallback pro odstranění circular dependency
  const permissionsRef = useRef(permissions);

  // Aktualizuj ref při každé změně permissions
  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  // 🏢 HIERARCHIE: Načíst konfiguraci při mount a změně tokenu/username
  useEffect(() => {
    const loadHierarchy = async () => {
      if (!token || !username) {
        setHierarchyConfig(null);
        return;
      }
      
      try {
        const { getHierarchyConfig } = await import('../services/hierarchyService');
        const config = await getHierarchyConfig(token, username);
        setHierarchyConfig(config);
      } catch (error) {
        console.error('❌ [Orders25List] Chyba při načítání hierarchie:', error);
        setHierarchyConfig({
          status: 'error',
          enabled: false,
          profileId: null,
          profileName: null,
          error: error.message
        });
      }
    };
    
    loadHierarchy();
  }, [token, username]);

  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState({});

  // � Dynamické načtení typů příloh z DB
  const [attachmentTypes, setAttachmentTypes] = useState([]);
  
  useEffect(() => {
    const loadAttachmentTypes = async () => {
      if (!token || !username) return;
      
      try {
        const { getTypyPriloh25 } = await import('../services/api25orders');
        const types = await getTypyPriloh25({ token, username, aktivni: 1 });
        setAttachmentTypes(types);
      } catch (error) {
        console.error('Chyba při načítání typů příloh:', error);
      }
    };
    
    loadAttachmentTypes();
  }, [token, username]);

  // �🔥 CRITICAL PERFORMANCE: Ref pro users - předchází re-renderingu columns useMemo
  // Když se users objekt změní (loadData), columns by se přepočítávaly → celá tabulka re-render!
  const usersRef = useRef(users);

  // Aktualizuj ref při každé změně users
  useEffect(() => {
    usersRef.current = users;
  }, [users]);
  const [apiMeta, setApiMeta] = useState(null); // Meta data z API response (admin_analysis, atd.)

  // 📏 State a ref pro scroll šipky a shadow efekty
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const [isTableHovered, setIsTableHovered] = useState(false); // Hover nad CELOU tabulkou (wrapper)
  const [isArrowHovered, setIsArrowHovered] = useState(false); // Hover nad šipkou (aby nezmizelá když na ni najedeš)
  const tableWrapperRef = useRef(null); // Pro wrapper s shadow efekty

  // 🎈 State a refs pro floating header
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const [columnWidths, setColumnWidths] = useState([]);
  const tableRef = useRef(null); // Pro Intersection Observer (ukazuje na TableContainer)

  // Tento effect musí být až PO definici table instance, proto ho přesuneme níže
  // Placeholder pro floating header observer - bude definován až po table instance

  // Callback ref pro TableScrollWrapper - detekuje hover nad CELOU tabulkou
  const setTableWrapperRef = useCallback((node) => {
    tableWrapperRef.current = node;

    if (node) {
      const handleMouseEnter = () => {
        setIsTableHovered(true);
      };

      const handleMouseLeave = () => {
        setIsTableHovered(false);
        // NERESTUJI isArrowHovered - to ať si řídí šipka sama!
      };

      node.addEventListener('mouseenter', handleMouseEnter);
      node.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        node.removeEventListener('mouseenter', handleMouseEnter);
        node.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  // 🎈 Měření šířek sloupců pro floating header
  useEffect(() => {
    const measureColumnWidths = () => {
      if (!tableRef.current) {
        return;
      }

      // Najdeme všechny th elementy v prvním řádku hlavičky
      const headerCells = tableRef.current.querySelectorAll('thead tr:first-child th');
      const widths = Array.from(headerCells).map(cell => cell.offsetWidth);
      setColumnWidths(widths);
    };

    // Pokud nejsou data nebo je loading, čekáme
    if (loading || !orders || orders.length === 0) {
      return;
    }

    // Malé zpoždění pro jistotu, že DOM je vykreslený
    const timer = setTimeout(() => {
      measureColumnWidths();
    }, 250);

    // Změř znovu po změně velikosti okna
    window.addEventListener('resize', measureColumnWidths);

    return () => {
      window.removeEventListener('resize', measureColumnWidths);
      clearTimeout(timer);
    };
  }, [loading, orders]); // Závislosti: spustí se znovu když se změní loading nebo data

  // 🎈 Synchronizace horizontálního scrollu mezi hlavní tabulkou a floating headerem
  useEffect(() => {
    if (!showFloatingHeader) return;
    
    const mainWrapper = tableWrapperRef.current;
    const floatingWrapper = document.querySelector('[data-floating-header-wrapper]');
    
    if (!mainWrapper || !floatingWrapper) return;
    
    const syncScroll = (e) => {
      if (e.target === mainWrapper) {
        floatingWrapper.scrollLeft = mainWrapper.scrollLeft;
      } else if (e.target === floatingWrapper) {
        mainWrapper.scrollLeft = floatingWrapper.scrollLeft;
      }
    };
    
    mainWrapper.addEventListener('scroll', syncScroll);
    floatingWrapper.addEventListener('scroll', syncScroll);
    
    // Inicializuj scroll pozici
    floatingWrapper.scrollLeft = mainWrapper.scrollLeft;
    
    return () => {
      mainWrapper.removeEventListener('scroll', syncScroll);
      floatingWrapper.removeEventListener('scroll', syncScroll);
    };
  }, [showFloatingHeader]);

  //  STATE pro inicializaci - splash screen zmizí až po dokončení VŠEHO
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true); // Pro fade efekt

  //  CACHE: State pro tracking cache info
  const [lastLoadSource, setLastLoadSource] = useState(null); // 'cache' | 'database' | null
  const [lastLoadTime, setLastLoadTime] = useState(null);
  const [lastLoadDuration, setLastLoadDuration] = useState(null); // Jak dlouho trvalo načtení (ms)

  // 🔄 STATE pro background refresh ikonu a čas
  const [isBackgroundRefreshActive, setIsBackgroundRefreshActive] = useState(false); // Žlutá ikona po background reloadu
  const [lastRefreshTime, setLastRefreshTime] = useState(null); // Čas posledního refreshe pro zobrazení vedle ikony

  // Dropdown lists - připravené seznamy pro rychlé zobrazení
  const [objednatelList, setObjednatelList] = useState([]);
  const [garantList, setGarantList] = useState([]);
  const [schvalovatelList, setSchvalovatelList] = useState([]);

  // Data z DB pro filtry
  const [allUsers, setAllUsers] = useState([]); // všichni uživatelé z DB pro filtry
  const [approversList, setApproversList] = useState([]); // schvalovatelé z DB
  const [orderStatesList, setOrderStatesList] = useState([]); // stavy objednávek z číselníku
  const [lpKodyList, setLpKodyList] = useState([]); // LP kódy pro převod ID na názvy
  const [druhyObjednavkyList, setDruhyObjednavkyList] = useState([]); // druhy objednávek z DB
  const [strediskaList, setStrediskaList] = useState([]); // střediska z DB
  
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [currentDraftData, setCurrentDraftData] = useState(null); // Data draftu pro zobrazení v modalu
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('soft'); // 🔧 Typ mazání: 'soft', 'hard', 'restore'
  const [showArchivedWarningModal, setShowArchivedWarningModal] = useState(false);
  const [showArchivedWithDraftWarningModal, setShowArchivedWithDraftWarningModal] = useState(false); // Kombinovaný modal

  // 🎯 State pro schvalovací dialog (příkazce)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [orderToApprove, setOrderToApprove] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalCommentError, setApprovalCommentError] = useState(''); // Validační error pro poznámku

  // 🔒 Nový state pro dialog zamčené objednávky
  const [showLockedOrderDialog, setShowLockedOrderDialog] = useState(false);
  const [lockedOrderInfo, setLockedOrderInfo] = useState(null); // Info o zamčení: { lockedByUserName, canForceUnlock, orderId }

  // ⚠ State pro Force Unlock Warning Dialog
  const [showForceUnlockWarning, setShowForceUnlockWarning] = useState(false);
  const [forceUnlockWarningData, setForceUnlockWarningData] = useState(null); // { orderNumber, lockedBy, lockedByEmail, lockedByPhone, lockedAt }

  // 📄 State pro hromadné generování DOCX
  const [showBulkDocxDialog, setShowBulkDocxDialog] = useState(false);
  const [bulkDocxOrders, setBulkDocxOrders] = useState([]); // Pole objednávek pro hromadné generování
  const [bulkDocxSigners, setBulkDocxSigners] = useState(() => {
    // Načti z localStorage
    return getUserStorage('bulkDocxSigners', {});
  }); // {orderId: userId} - výběr podepisovatelů
  const [bulkDocxTemplates, setBulkDocxTemplates] = useState(() => {
    // Načti z localStorage
    return getUserStorage('bulkDocxTemplates', {});
  }); // {orderId: templateName} - výběr šablon

  // ✅ State pro hromadné schvalování
  const [showBulkApprovalDialog, setShowBulkApprovalDialog] = useState(false);
  const [bulkApprovalOrders, setBulkApprovalOrders] = useState([]);

  // ✅ State pro hromadné mazání
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteOrders, setBulkDeleteOrders] = useState([]);
  const [bulkDeleteType, setBulkDeleteType] = useState('soft'); // 'soft' nebo 'hard'

  // 📄 State pro DOCX šablony z číselníku
  const [docxTemplates, setDocxTemplates] = useState([]);

  const [showDashboard, setShowDashboard] = useState(() => {
    // Načti stav z localStorage s user izolací, výchozí je true (zobrazeno)
    return getUserStorage('orders25List_showDashboard', true);
  });

  // 🧪 DEBUG: State pro Order V2 API test panel
  const [showApiTestPanel, setShowApiTestPanel] = useState(false);
  const [apiTestData, setApiTestData] = useState(null);
  const [showModalStylesPanel, setShowModalStylesPanel] = useState(false); // 🎨 Panel pro návrhy stylů modálů
  const [showFiltersPanel, setShowFiltersPanel] = useState(() => {
    // Načti stav z localStorage pro zobrazení celého panelu filtrů s user izolací, výchozí je true (zobrazeno)
    return getUserStorage('orders25List_showFiltersPanel', true);
  });
  const [showFilters, setShowFilters] = useState(() => {
    // Načti stav z localStorage s user izolací, výchozí je false (skryto)
    return getUserStorage('orders25List_showFilters', false);
  });
  const [showDebug, setShowDebug] = useState(() => {
    // Načti stav z localStorage s user izolací, výchozí je false (skryto)
    return getUserStorage('orders25List_showDebug', false);
  });

  // User settings - načíst z localStorage (bez transformace - používáme české klíče přímo)
  const userSettings = useMemo(() => {
    if (!currentUserId) return null;
    return loadSettingsFromLocalStorage(currentUserId);
  }, [currentUserId]);

  // Zkontrolovat zda má uživatel vlastní nastavení dlaždic
  const hasCustomTileSettings = useMemo(() => {
    return userSettings?.viditelne_dlazdice && Object.keys(userSettings.viditelne_dlazdice).length > 0;
  }, [userSettings]);

  const [dashboardCompact, setDashboardCompact] = useState(() => {
    // Načti stav z localStorage s user izolací, výchozí je true (kompaktní)
    return getUserStorage('orders25List_dashboardCompact', true);
  });
  
  // Dashboard mode: 'standard' (compact/full toggle) nebo 'custom' (dle user settings)
  const [dashboardMode, setDashboardMode] = useState(() => {
    return getUserStorage('orders25List_dashboardMode', 'standard');
  });
  
  const [activeStatusFilter, setActiveStatusFilter] = useState(() => {
    return getUserStorage('orders25List_activeStatusFilter', null);
  }); // Pro dashboard klikací filtry
  
  // Filtr pro schvalování objednávek - pole aktivních filtrů
  const [approvalFilter, setApprovalFilter] = useState(() => {
    const saved = getUserStorage('orders25List_approvalFilter', null);
    // Migrace starého formátu na nový
    if (saved === 'all' || saved === null) return [];
    if (saved === 'pending') return ['pending'];
    if (saved === 'approved') return ['approved'];
    return Array.isArray(saved) ? saved : [];
  });
  
  const [rawData, setRawData] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Filters - load from localStorage s user izolací
  const [globalFilter, setGlobalFilter] = useState(() => {
    return getUserStorage('orders25List_globalFilter', '');
  });
  // 🔖 STATUS FILTER - PRIORITA: 1. LS (session změny), 2. userSettings (DB), 3. prázdné pole
  // Po přihlášení: načte z DB (userSettings.vychozi_filtry_stavu_objednavek)
  // Během session: změny se ukládají do LS a mají prioritu
  // Po kliknutí "Uložit a aplikovat" v Profile: LS se vyčistí → načte nové DB hodnoty
  const [statusFilter, setStatusFilter] = useState(() => {
    const saved = getUserStorage('orders25List_statusFilter', null);
    if (saved !== null) {
      // Pokud je uložené jako string (backward compatibility), převeď na pole
      const result = Array.isArray(saved) ? saved : (saved ? [saved] : []);
      return result;
    }
    
    // Načíst z uživatelských nastavení (DB)
    try {
      const userSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
      if (userSettings?.vychozi_filtry_stavu_objednavek && Array.isArray(userSettings.vychozi_filtry_stavu_objednavek)) {
        return userSettings.vychozi_filtry_stavu_objednavek;
      }
    } catch (e) {
      console.warn('Nelze načíst nastavení filtrů stavů:', e);
    }
    
    // Fallback: prázdné pole (žádné přednastavené filtry)
    return [];
  });
  const [userFilter, setUserFilter] = useState(() => {
    return getUserStorage('orders25List_userFilter', '');
  });

  // Simple dropdown selections (just for showing selected values) - CHANGED TO ARRAYS for multiselect
  const [selectedObjednatel, setSelectedObjednatel] = useState(() => {
    const saved = getUserStorage('orders25List_selectedObjednatel', []);
    // Backward compatibility: převeď string na pole
    return Array.isArray(saved) ? saved : (saved ? [saved] : []);
  });
  const [selectedGarant, setSelectedGarant] = useState(() => {
    const saved = getUserStorage('orders25List_selectedGarant', []);
    // Backward compatibility: převeď string na pole
    return Array.isArray(saved) ? saved : (saved ? [saved] : []);
  });
  const [selectedSchvalovatel, setSelectedSchvalovatel] = useState(() => {
    const saved = getUserStorage('orders25List_selectedSchvalovatel', []);
    // Backward compatibility: převeď string na pole
    return Array.isArray(saved) ? saved : (saved ? [saved] : []);
  });
  const [selectedPrikazce, setSelectedPrikazce] = useState(() => {
    const saved = getUserStorage('orders25List_selectedPrikazce', []);
    // Backward compatibility: převeď string na pole
    return Array.isArray(saved) ? saved : (saved ? [saved] : []);
  });
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [amountFromFilter, setAmountFromFilter] = useState(() => {
    return getUserStorage('orders25List_amountFrom', '');
  });
  const [amountToFilter, setAmountToFilter] = useState(() => {
    return getUserStorage('orders25List_amountTo', '');
  });

  // Filtry pro zveřejnění
  const [filterMaBytZverejneno, setFilterMaBytZverejneno] = useState(() => {
    return getUserStorage('orders25List_filterMaBytZverejneno', false);
  });
  const [filterByloZverejneno, setFilterByloZverejneno] = useState(() => {
    return getUserStorage('orders25List_filterByloZverejneno', false);
  });

  // Filtr pro mimořádné objednávky
  const [filterMimoradneObjednavky, setFilterMimoradneObjednavky] = useState(() => {
    return getUserStorage('orders25List_filterMimoradneObjednavky', false);
  });

  // Filtry pro faktury a přílohy
  const [filterWithInvoices, setFilterWithInvoices] = useState(false);
  const [filterWithAttachments, setFilterWithAttachments] = useState(false);

  // Popup pro seznam faktur
  const [invoicePopupVisible, setInvoicePopupVisible] = useState(false);
  const [invoicePopupOrder, setInvoicePopupOrder] = useState(null);
  const [invoicePopupInvoices, setInvoicePopupInvoices] = useState([]);
  const [invoicePopupLoading, setInvoicePopupLoading] = useState(false);

  // 🔧 ADMIN FEATURE: Zobrazení POUZE neaktivních objednávek (aktivni = 0)
  // Checkbox viditelný pouze pro ADMIN role
  const [showOnlyInactive, setShowOnlyInactive] = useState(false); // NEVER persisted to localStorage
  
  // Check if user is ADMIN (SUPERADMIN or ADMINISTRATOR role)
  const isAdmin = useMemo(() => {
    return hasAdminRole && hasAdminRole();
  }, [hasAdminRole]);

  // Výběr objednávek pro hromadné akce (React Table format: { '0': true, '2': true })
  const [rowSelection, setRowSelection] = useState(() => {
    // Načti z localStorage s user izolací
    return getUserStorage('orders25List_rowSelection', {});
  });

  // Ukládej rowSelection do localStorage při každé změně
  useEffect(() => {
    setUserStorage('orders25List_rowSelection', rowSelection);
  }, [rowSelection]);

  // Highlight newly created order
  const [highlightOrderId, setHighlightOrderId] = useState(null);

  // Column-specific filters (textové filtry z hlavičky tabulky) - load from localStorage
  const [columnFilters, setColumnFilters] = useState(() => {
    // 🐛 FIX: Neklade filtry pokud není user_id (currentUserId by byl NaN)
    // Filtry se načtou až v useEffect když je currentUserId validní
    if (!user_id || isNaN(parseInt(user_id, 10))) {
      return {
        dt_objednavky: '',
        cislo_objednavky: '',
        predmet: '',
        objednatel: '',
        stav_objednavky: '',
        max_cena_s_dph: '',
        garant: '',
        prikazce: '',
        schvalovatel: ''
      };
    }
    return getUserStorage('orders25List_columnFilters', {
      dt_objednavky: '',
      cislo_objednavky: '',
      predmet: '',
      objednatel: '',
      stav_objednavky: '',
      max_cena_s_dph: '',
      garant: '',
      prikazce: '',
      schvalovatel: ''
    });
  });

  // � FIX: Načti filtry z localStorage když se currentUserId stane validní
  // Problém: currentUserId může být NaN při prvním renderu pokud user_id není ready
  // Řešení: Načti filtry až když je currentUserId validní číslo
  useEffect(() => {
    if (!isNaN(currentUserId) && currentUserId > 0) {
      const savedFilters = getUserStorage('orders25List_columnFilters', null);
      if (savedFilters) {
        setColumnFilters(savedFilters);
      }
      // 🐛 FIX: Načti také multiselect filtry
      const savedMultiselectFilters = getUserStorage('orders25List_multiselectFilters', null);
      if (savedMultiselectFilters) {
        setMultiselectFilters(savedMultiselectFilters);
      }
    }
  }, [currentUserId]); // Spustí se když se currentUserId změní z NaN na validní číslo

  // �🚀 PERFORMANCE: Debounced column filters pro rychlejší psaní
  // Lokální state pro okamžitou změnu inputu (UX), debounce pro aplikaci filtru (performance)
  const [localColumnFilters, setLocalColumnFilters] = useState(columnFilters);
  const columnFilterTimeoutRef = useRef(null);

  // Synchronizuj local state když se změní column filters z jiného zdroje (např. clear all)
  useEffect(() => {
    setLocalColumnFilters(columnFilters);
  }, [columnFilters]);

  // Debounced setter pro column filters
  const setColumnFiltersDebounced = useCallback((newFilters) => {
    // Okamžitě updatni lokální state (input se updatuje bez zpoždění)
    setLocalColumnFilters(newFilters);

    // Clear předchozí timeout
    if (columnFilterTimeoutRef.current) {
      clearTimeout(columnFilterTimeoutRef.current);
    }

    // Aplikuj filtr po 300ms debounce
    columnFilterTimeoutRef.current = setTimeout(() => {
      setColumnFilters(newFilters);
      setUserStorage('orders25List_columnFilters', newFilters);
    }, 300);
  }, []);

  // Multiselect filters (ID filtry z rozšířeného filtrovacího panelu)
  const [multiselectFilters, setMultiselectFilters] = useState(() => {
    // 🐛 FIX: Načti multiselect filtry z localStorage (per-user)
    if (!user_id || isNaN(parseInt(user_id, 10))) {
      return {
        objednatel: '',
        garant: '',
        prikazce: '',
        schvalovatel: ''
      };
    }
    return getUserStorage('orders25List_multiselectFilters', {
      objednatel: '',
      garant: '',
      prikazce: '',
      schvalovatel: ''
    });
  });

  // 🐛 FIX: Ulož multiselect filtry do localStorage když se změní
  useEffect(() => {
    if (!isNaN(currentUserId) && currentUserId > 0) {
      setUserStorage('orders25List_multiselectFilters', multiselectFilters);
    }
  }, [multiselectFilters, currentUserId]);

  // 🧹 CLEANUP: Clear debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (columnFilterTimeoutRef.current) {
        clearTimeout(columnFilterTimeoutRef.current);
      }
    };
  }, []);

  // Row highlighting by status (zvýrazňování podle stavu)
  const [showRowHighlighting, setShowRowHighlighting] = useState(() => {
    return getUserStorage('orders25List_showRowHighlighting', true);
  });

  // Year filter - load from localStorage s user izolací or use user settings or current year
  // 📅 YEAR FILTER - PRIORITA: 1. LS (session změny), 2. userSettings (DB), 3. aktuální rok
  // Po přihlášení: načte z DB (userSettings)
  // Během session: změny se ukládají do LS a mají prioritu
  // Po kliknutí "Uložit a aplikovat" v Profile: LS se vyčistí → načte nové DB hodnoty
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = getUserStorage('orders25List_selectedYear', null);
    if (saved !== null) return saved;
    
    // Načíst z uživatelských nastavení (DB)
    try {
      const userSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
      if (userSettings?.vychozi_rok) {
        // Pokud je 'current', použij aktuální rok
        if (userSettings.vychozi_rok === 'current') {
          return new Date().getFullYear();
        }
        // Pokud je 'all', vrať 'all'
        if (userSettings.vychozi_rok === 'all') {
          return 'all';
        }
        // Jinak vrať konkrétní rok
        return userSettings.vychozi_rok;
      }
    } catch (e) {
      console.warn('Nelze načíst nastavení roku:', e);
    }
    
    // Fallback: aktuální rok
    return new Date().getFullYear();
  });

  // 📅 MONTH FILTER - PRIORITA: 1. LS (session změny), 2. userSettings (DB), 3. 'all'
  // Po přihlášení: načte z DB (userSettings)
  // Během session: změny se ukládají do LS a mají prioritu
  // Po kliknutí "Uložit a aplikovat" v Profile: LS se vyčistí → načte nové DB hodnoty
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = getUserStorage('orders25List_selectedMonth', null);
    if (saved !== null) return saved;
    
    // Načíst z uživatelských nastavení (DB)
    try {
      const userSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
      if (userSettings?.vychozi_obdobi) {
        return userSettings.vychozi_obdobi; // 'all' nebo '1'-'12' nebo 'last-month', 'Q1', etc.
      }
    } catch (e) {
      console.warn('Nelze načíst nastavení období:', e);
    }
    
    // Fallback: všechny měsíce
    return 'all';
  });

  // Show expanded month options
  const [showExpandedMonths, setShowExpandedMonths] = useState(() => {
    const saved = getUserStorage('orders25List_selectedMonth', 'all');
    // Pokud je uložená hodnota mimo základní 4, zobraz rozšířené možnosti
    return saved && !['all', 'last-month', 'last-quarter', 'last-half'].includes(saved);
  });

  // Show archived orders checkbox - defaultně false (nezaškrtnuto = nezobrazovat archivované)
  const [showArchived, setShowArchived] = useState(() => {
    return getUserStorage('orders25List_showArchived', false);
  });

  // "JEN MOJE" filter - dostupný pro všechny uživatele
  // Filtruje objednávky kde je přihlášený uživatel: objednatel, uživatel, garant, příkazce, schvalovatel, fakturant, zveřejnil, dokončil, potvrdil věcnou správnost
  const [showOnlyMyOrders, setShowOnlyMyOrders] = useState(() => {
    return getUserStorage('orders25List_showOnlyMyOrders', false);
  });

  // Export preview modal
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState(null);

  // Ref pro měsíční select
  const monthSelectRef = useRef(null);

  // Ref pro roční select
  const yearSelectRef = useRef(null);

  // Stav pro otevření měsíčního dropdownu
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  // Stav pro otevření ročního dropdownu
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  // Custom Select states
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState(new Set());
  const [hasTriedToSubmit, setHasTriedToSubmit] = useState(false);

  // Kontextové menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, order }

  // DOCX Generator Modal
  const [docxModalOpen, setDocxModalOpen] = useState(false);
  const [docxModalOrder, setDocxModalOrder] = useState(null);

  // Financial Control Modal
  const [financialControlModalOpen, setFinancialControlModalOpen] = useState(false);
  const [financialControlOrder, setFinancialControlOrder] = useState(null);

  // Memoizované options pro MultiSelect - aby se nevytvářely nové pole při každém renderu
  const sortedAllUsers = useMemo(() => {
    const processed = [...allUsers].map(user => {
      // Najdi první dostupné ID
      const userId = user.id || user.uzivatel_id || user.user_id;
      if (!userId) {
        // User without ID - data issue
      }
      return {
        ...user,
        id: userId // Vždy nastav id
      };
    }).sort((a, b) => {
      const nameA = a.displayName || '';
      const nameB = b.displayName || '';
      return nameA.localeCompare(nameB);
    });

    return processed;
  }, [allUsers]);

  const sortedApprovers = useMemo(() => {
    const processed = [...approversList].map(approver => {
      // Najdi první dostupné ID
      const approverId = approver.id || approver.user_id || approver.uzivatel_id;
      if (!approverId) {
        // Approver without ID - data issue
      }
      return {
        ...approver,
        id: approverId, // Vždy nastav id
        // Normalizuj displayName
        displayName: approver.displayName || approver.jmeno_prijmeni || `${approver.jmeno || ''} ${approver.prijmeni || ''}`.trim() || `User ${approverId}`
      };
    }).sort((a, b) => {
      const nameA = a.displayName || '';
      const nameB = b.displayName || '';
      return nameA.localeCompare(nameB);
    });

    return processed;
  }, [approversList]);

  // Filtrované approvers podle showArchived
  const sortedActiveApprovers = useMemo(() => {
    if (showArchived) {
      return sortedApprovers; // Pokud je archiv zapnutý, zobraz všechny schvalovatele
    }

    // Jinak pouze aktivní (aktivni = 1)
    return sortedApprovers.filter(approver => {
      // Primárně používáme pole 'aktivni' (1 = aktivní, 0 = neaktivní)
      if (approver.aktivni !== undefined && approver.aktivni !== null) {
        return approver.aktivni === 1 || approver.aktivni === '1' || approver.aktivni === true;
      }
      // Fallback na deaktivovan (0 = aktivní, 1 = neaktivní)
      if (approver.deaktivovan !== undefined && approver.deaktivovan !== null) {
        return approver.deaktivovan === 0 || approver.deaktivovan === '0' || approver.deaktivovan === false;
      }
      // Fallback: pokud žádné pole není, považuj za aktivního
      return true;
    });
  }, [sortedApprovers, showArchived]);

  // Filtrované seznamy podle showArchived
  const sortedActiveUsers = useMemo(() => {
    if (showArchived) {
      return sortedAllUsers; // Pokud je archiv zapnutý, zobraz všechny uživatele
    }

    // Jinak pouze aktivní (aktivni = 1)
    return sortedAllUsers.filter(user => {
      // Primárně používáme pole 'aktivni' (1 = aktivní, 0 = neaktivní)
      if (user.aktivni !== undefined && user.aktivni !== null) {
        return user.aktivni === 1 || user.aktivni === '1' || user.aktivni === true;
      }
      // Fallback na deaktivovan (0 = aktivní, 1 = neaktivní)
      if (user.deaktivovan !== undefined && user.deaktivovan !== null) {
        return user.deaktivovan === 0 || user.deaktivovan === '0' || user.deaktivovan === false;
      }
      // Fallback: pokud žádné pole není, považuj za aktivního
      return true;
    });
  }, [sortedAllUsers, showArchived]);

  const statusOptions = useMemo(() => {
    return [...orderStatesList].map(status => {
      //  POUŽIJ ČESKÝ NÁZEV jako ID pro filtrování (ne kod_stavu)
      // Protože order.stav_objednavky obsahuje české názvy
      const statusName = status.nazev_stavu || status.nazev || status.kod_stavu || status.id;
      return {
        ...status,
        id: statusName, // Český název pro porovnání
        kod_stavu: status.kod_stavu || status.id // Zachovej originální kód
      };
    });
  }, [orderStatesList]);

  // Listen for calendar date filter changes from Layout.js
  useEffect(() => {
    const handleDateFilterChange = (event) => {
      const { dateFrom, dateTo, userId } = event.detail || {};
      const currentUserId = user_id || 'anon';

      // Only react if the event is for current user
      if (userId !== currentUserId) return;

      if (dateFrom) {
        setDateFromFilter(dateFrom || '');
      }
      if (dateTo !== undefined) { // Allow empty string to clear
        setDateToFilter(dateTo || '');
      }
    };

    window.addEventListener('orders25_date_filter_changed', handleDateFilterChange);

    return () => {
      window.removeEventListener('orders25_date_filter_changed', handleDateFilterChange);
    };
  }, [user_id]);

  // Load date filters from localStorage when user_id becomes available
  useEffect(() => {
    if (!user_id) return;

    const sid = user_id || 'anon';
    const dateFromKey = `orders25_dateFrom_${sid}`;
    const dateToKey = `orders25_dateTo_${sid}`;

    try {
      const savedFrom = localStorage.getItem(dateFromKey);
      const savedTo = localStorage.getItem(dateToKey);
      if (savedFrom && !dateFromFilter) setDateFromFilter(savedFrom || '');
      if (savedTo && !dateToFilter) setDateToFilter(savedTo || '');
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id]); // Načti jen jednou když se user_id změní

  // Table pagination - load from localStorage
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('orders25List_pageSize');
    return saved ? parseInt(saved, 10) : 25;
  });

  const [currentPageIndex, setCurrentPageIndex] = useState(() => {
    const saved = localStorage.getItem('orders25List_pageIndex');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Table sorting - load from user-specific localStorage
  const [sorting, setSorting] = useState(() => {
    return getUserStorage('orders25List_sorting', []);
  });

  // 📍 EXPANDED ROWS: State pro rozbalené řádky (ukládáme row index, ne ID)
  const [expanded, setExpanded] = useState({});

  // DEBOUNCE: Ref pro timeout column filtrů (3 sekundy delay)
  const columnFiltersTimeoutRef = useRef(null);

  // DEBOUNCED: Funkce pro uložení column filtrů s 3s debounce
  const saveColumnFiltersDebounced = useCallback((filters) => {
    if (!user_id) return;

    // Zruš předchozí timeout
    if (columnFiltersTimeoutRef.current) {
      clearTimeout(columnFiltersTimeoutRef.current);
    }

    // Nastav nový timeout na 3 sekundy
    columnFiltersTimeoutRef.current = setTimeout(() => {
      setUserStorage('orders25List_columnFilters', filters);
    }, 3000); // 3 sekundy debounce
  }, [user_id, setUserStorage]);

  // OPTIMALIZACE: Batch update všech filtrů do localStorage najednou
  // Nahrazuje 14 samostatných useEffects → 1 useEffect
  // Výhody: rychlejší při změně user_id, méně re-renderů, lepší čitelnost
  useEffect(() => {
    if (!user_id) return; // Čekej na user_id

    // Jednoduché filtry - přímé uložení
    const simpleFilters = {
      'orders25List_globalFilter': globalFilter,
      'orders25List_statusFilter': statusFilter,
      'orders25List_userFilter': userFilter,
      'orders25List_selectedObjednatel': selectedObjednatel,
      'orders25List_selectedGarant': selectedGarant,
      'orders25List_selectedSchvalovatel': selectedSchvalovatel,
      'orders25List_selectedPrikazce': selectedPrikazce,
      'orders25List_amountFrom': amountFromFilter,
      'orders25List_amountTo': amountToFilter,
      'orders25List_filterMaBytZverejneno': filterMaBytZverejneno,
      'orders25List_filterByloZverejneno': filterByloZverejneno,
      'orders25List_activeStatusFilter': activeStatusFilter,
      'orders25List_sorting': sorting // ← Přidáno sorting
      // POZNÁMKA: columnFilters se ukládají separátně s debounce
    };

    // Batch save všech jednoduchých filtrů
    Object.entries(simpleFilters).forEach(([key, value]) => {
      setUserStorage(key, value);
    });

    // Speciální handling pro datum filtry (odstranění pokud prázdné)
    if (dateFromFilter) {
      setUserStorage('orders25_dateFrom', dateFromFilter);
    } else {
      const key = getUserKey('orders25_dateFrom');
      localStorage.removeItem(key);
    }

    if (dateToFilter) {
      setUserStorage('orders25_dateTo', dateToFilter);
    } else {
      const key = getUserKey('orders25_dateTo');
      localStorage.removeItem(key);
    }
  }, [
    globalFilter,
    statusFilter,
    userFilter,
    selectedObjednatel,
    selectedGarant,
    selectedSchvalovatel,
    selectedPrikazce,
    dateFromFilter,
    dateToFilter,
    amountFromFilter,
    amountToFilter,
    filterMaBytZverejneno,
    filterByloZverejneno,
    activeStatusFilter,
    sorting, // ← Přidáno sorting do dependencies
    user_id
    // POZNÁMKA: columnFilters se zpracovávají separátně s debounce
  ]);

  // DEBOUNCED useEffect: Column filters s 3s debounce - brání zahlcování localStorage při rychlém psaní
  useEffect(() => {
    saveColumnFiltersDebounced(columnFilters);
  }, [columnFilters, saveColumnFiltersDebounced]);

  // CLEANUP: Vyčisti timeout při unmount
  useEffect(() => {
    return () => {
      if (columnFiltersTimeoutRef.current) {
        clearTimeout(columnFiltersTimeoutRef.current);
      }
    };
  }, []);

  // SCROLL STATE: Ref pro tracking zda už byla pozice obnovena
  const scrollStateRestored = React.useRef(false);
  const isFirstRender = React.useRef(true); // ← Track first render

  // 📍 SCROLL STATE: Pamatuj si předchozí filtry pro detekci REÁLNÉ změny
  const prevFiltersRef = React.useRef(null);

  // 📍 SCROLL STATE: Ref pro uložené ID rozbalených objednávek (obnov později když je filteredData ready)
  const pendingExpandedOrderIds = React.useRef(null);

  // 📍 SCROLL STATE: Ref na filteredData (pro použití v save useEffect)
  const filteredDataRef = React.useRef([]);

  // 📍 SCROLL STATE: Refs pro aktuální hodnoty (pro scroll listener)
  const currentPageIndexRef = React.useRef(currentPageIndex);
  const pageSizeRef = React.useRef(pageSize);
  const expandedRef = React.useRef(expanded);

  // Aktualizuj refs při každé změně
  React.useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
    pageSizeRef.current = pageSize;
    expandedRef.current = expanded;
  }, [currentPageIndex, pageSize, expanded]);

  // 🎬 INITIALIZATION: Ref pro sledování kroků inicializace
  const initStepsCompleted = React.useRef({
    dataLoaded: false,
    paginationRestored: false,
    expandedRestored: false,
    scrollRestored: false
  });

  // 📍 SCROLL STATE: Obnovit pozici při prvním načtení dat
  useEffect(() => {
    // Pokud už byla pozice obnovena, skip
    if (scrollStateRestored.current) {
      return;
    }

    // Pokud nejsou potřebná data, skip
    if (!user_id) {
      return;
    }

    // Pokud ještě nejsou načtená data (loading), počkej
    if (loading) {
      return;
    }

    // Pokud jsou data prázdná, označ všechny kroky jako hotové
    if (orders.length === 0) {
      initStepsCompleted.current.dataLoaded = true; //  FIX: Musí být nastaven i dataLoaded!
      initStepsCompleted.current.paginationRestored = true;
      initStepsCompleted.current.expandedRestored = true;
      initStepsCompleted.current.scrollRestored = true;
      scrollStateRestored.current = true;
      return;
    }

    const savedState = ordersCacheService.getScrollState(user_id, {
      ...(selectedYear !== 'all' && { rok: selectedYear }),
      mesic: selectedMonth
    }, orders.length);

    if (savedState && savedState.page && savedState.rowsPerPage) {
      // Obnov stránku (convert from 1-based to 0-based)
      const targetPage = savedState.page - 1;
      const maxPage = Math.ceil(orders.length / savedState.rowsPerPage) - 1;

      if (targetPage >= 0 && targetPage <= maxPage) {
        setCurrentPageIndex(targetPage);
      }

      // Obnov page size pokud se změnil
      if (savedState.rowsPerPage !== pageSize) {
        setPageSize(savedState.rowsPerPage);
        localStorage.setItem('orders25List_pageSize', savedState.rowsPerPage);
      }

      initStepsCompleted.current.paginationRestored = true;

      // 📍 OBNOV ROZBALENÉ OBJEDNÁVKY - ulož ID do ref (obnov později)
      if (savedState.expandedOrderIds && savedState.expandedOrderIds.length > 0) {
        pendingExpandedOrderIds.current = savedState.expandedOrderIds;
      } else {
        // Žádné rozbalené objednávky
        initStepsCompleted.current.expandedRestored = true;
      }

      // Scroll restoration disabled
      initStepsCompleted.current.scrollRestored = true;
    } else {
      // Žádný uložený stav
      initStepsCompleted.current.paginationRestored = true;
      initStepsCompleted.current.expandedRestored = true;
      initStepsCompleted.current.scrollRestored = true;
    }

    scrollStateRestored.current = true;
  }, [orders.length, loading, user_id, selectedYear, selectedMonth, pageSize]);

  // 📍 SCROLL STATE: Helper funkce pro manuální uložení pozice
  const saveCurrentScrollState = useCallback(() => {
    if (!user_id || !scrollStateRestored.current || orders.length === 0) {
      return;
    }

    // Scroll saving disabled - keeping only expanded rows memory
    const currentPage = currentPageIndexRef.current;
    const currentPageSize = pageSizeRef.current;
    const currentExpanded = expandedRef.current;

    const expandedOrderIds = Object.keys(currentExpanded)
      .filter(index => currentExpanded[index])
      .map(index => {
        const order = filteredDataRef.current[parseInt(index)];
        return order?.id;
      })
      .filter(Boolean);

    ordersCacheService.saveScrollState(user_id, {
      ...(selectedYear !== 'all' && { rok: selectedYear }),
      mesic: selectedMonth
    }, {
      page: currentPage + 1,
      rowsPerPage: currentPageSize,
      scrollY: 0, // Scroll disabled
      totalRows: orders.length,
      expandedOrderIds
    });
  }, [user_id, selectedYear, selectedMonth, orders.length]);

  // 📍 AUTO-SAVE: Automaticky ukládej při změně stránky, pageSize nebo expanded rows
  useEffect(() => {
    // Skip pokud ještě nebyla obnovena pozice (neukládej při prvním načtení)
    if (!scrollStateRestored.current) {
      return;
    }

    // Ulož aktuální stav
    saveCurrentScrollState();
  }, [currentPageIndex, pageSize, expanded, saveCurrentScrollState]);

  // 📍 SCROLL STATE: Invaliduj POUZE při SKUTEČNÉ změně filtrů
  useEffect(() => {
    // Skip první render (při mount se filtry inicializují)
    if (isFirstRender.current) {
      isFirstRender.current = false;

      // Ulož aktuální hodnoty filtrů jako baseline
      prevFiltersRef.current = {
        year: selectedYear,
        month: selectedMonth,
        status: statusFilter,
        user: userFilter,
        global: globalFilter,
        objednatel: selectedObjednatel,
        garant: selectedGarant,
        schvalovatel: selectedSchvalovatel,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
        amountFrom: amountFromFilter,
        amountTo: amountToFilter,
        activeStatus: activeStatusFilter
      };

      return;
    }

    if (!user_id || !prevFiltersRef.current) return;

    // Porovnej PŘEDCHOZÍ hodnoty s aktuálními
    const currentFilters = {
      year: selectedYear,
      month: selectedMonth,
      status: statusFilter,
      user: userFilter,
      global: globalFilter,
      objednatel: selectedObjednatel,
      garant: selectedGarant,
      schvalovatel: selectedSchvalovatel,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
      amountFrom: amountFromFilter,
      amountTo: amountToFilter,
      activeStatus: activeStatusFilter
    };

    // Detekuj skutečnou změnu
    const hasChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(currentFilters);

    if (!hasChanged) {
      return; // Filtry se nezměnily = jen remount komponenty
    }

    // Ulož nové hodnoty
    prevFiltersRef.current = currentFilters;

    // Při SKUTEČNÉ změně filtru resetuj scroll state
    ordersCacheService.clearScrollState(user_id, {
      ...(selectedYear !== 'all' && { rok: selectedYear }),
      mesic: selectedMonth
    });

    // Reset tracking
    scrollStateRestored.current = false;

    // Reset rozbalených objednávek
    setExpanded({});

    // Reset na první stránku
    setCurrentPageIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedYear, selectedMonth, statusFilter, userFilter, globalFilter,
      selectedObjednatel, selectedGarant, selectedSchvalovatel,
      dateFromFilter, dateToFilter, amountFromFilter, amountToFilter, activeStatusFilter]);

  // 🔄 AUTO-REFRESH: Poslouchat Custom Event "orderStatusChanged" z notifikací
  // Když přijde notifikace o změně stavu objednávky, auto-reload té konkrétní objednávky z DB
  useEffect(() => {
    const handleOrderStatusChanged = async (event) => {
      const { orderId, orderNumber, notificationType } = event.detail;
      
      if (!orderId || !token || !username) return;

      try {
        // ✅ V2 API: Načti aktualizovanou objednávku z DB
        const response = await getOrderV2(orderId, token, username, true);
        
        if (response && response.data) {
          const updatedOrder = response.data;
          
          // Aktualizuj konkrétní objednávku v seznamu
          setOrders(prevOrders => {
            const orderExists = prevOrders.some(o => String(o.id) === String(orderId));
            
            if (orderExists) {
              // UPDATE: Nahraď existující objednávku
              return prevOrders.map(order => 
                String(order.id) === String(orderId) ? updatedOrder : order
              );
            } else {
              // INSERT: Přidej novou objednávku na začátek (může být nová objednávka jiného uživatele)
              return [updatedOrder, ...prevOrders].sort((a, b) => b.id - a.id);
            }
          });
          
        }
      } catch (error) {
        // Tiché selhání - nezpůsobí problém v UI
        console.warn('Auto-refresh objednávky selhal:', error);
      }
    };

    window.addEventListener('orderStatusChanged', handleOrderStatusChanged);
    
    return () => {
      window.removeEventListener('orderStatusChanged', handleOrderStatusChanged);
    };
  }, [token, username]);

  // Debug výpis pro testování highlighting
  React.useEffect(() => {
    if (orders.length > 0) {

      // Success log odstraněn

      // Debug výpis odstraněn pro produkci

    }
  }, [showRowHighlighting, orders]);

  // Custom Select helper functions
  const toggleSelect = useCallback((field) => {
    setSelectStates(prev => {
      // Zavři všechny ostatní selecty
      const newState = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {});
      // Toggleni jen požadovaný select
      newState[field] = !prev[field];
      return newState;
    });
  }, []);

  const filterOptions = useCallback((options, searchTerm, field) => {
    if (!searchTerm) return options;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return options.filter(option => {
      const label = getOptionLabel(option, field);
      return label.toLowerCase().includes(lowerSearchTerm);
    });
  }, []);

  const getOptionLabel = useCallback((option, field) => {
    if (!option) return '';

    switch (field) {
      case 'statusFilter':
        return option.nazev_stavu || option.nazev || option.popis || option.kod_stavu || option.kod || String(option);
      case 'selectedObjednatel':
      case 'selectedGarant':
        return option.displayName || `${option.jmeno || ''} ${option.prijmeni || ''}`.trim() || 'Bez jména';
      case 'selectedSchvalovatel':
        return option.displayName || option.jmeno_prijmeni || `${option.jmeno || ''} ${option.prijmeni || ''}`.trim() || 'Bez jména';
      case 'pageSize':
        return option.label || String(option.value || option);
      // OrderForm25 field typy
      case 'lp_kod':
        return `${option.kod || option.id || option} - ${option.nazev || option.label || 'Bez názvu'}`;
      case 'druh_objednavky_kod':
        return option.nazev || option.label || (typeof option === 'string' ? option : 'Neznámý');
      default:
        return String(option);
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-custom-select]')) {
        setSelectStates({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Připrav dropdown seznamy pro filtry
  const prepareDropdownLists = useCallback((ordersData) => {
    // Preparing dropdown lists

    // Objednatelé
    const uniqueObjednatele = new Set();
    const uniqueGaranti = new Set();
    const uniqueSchvalovatelé = new Set();

    ordersData.forEach(order => {
      // Objednatel: objednatel_id -> uzivatel_id
      const objednatelId = order.objednatel_id || order.uzivatel_id;
      if (objednatelId && users[objednatelId]) {
        uniqueObjednatele.add(objednatelId);
      }

      // Garant
      if (order.garant_uzivatel_id && users[order.garant_uzivatel_id]) {
        uniqueGaranti.add(order.garant_uzivatel_id);
      }

      // Schvalovatel
      if (order.schvalovatel_id && users[order.schvalovatel_id]) {
        uniqueSchvalovatelé.add(order.schvalovatel_id);
      }
    });

    // Převeď na seřazené seznamy
    const sortByName = (a, b) => {
      const nameA = (typeof users[a] === 'object' ? users[a].displayName : users[a]) || '';
      const nameB = (typeof users[b] === 'object' ? users[b].displayName : users[b]) || '';
      return nameA.localeCompare(nameB);
    };

    // ℹ POZNÁMKA: objednatelList a garantList se již nepoužívají
    // Filtry GARANT a OBJEDNATEL používají přímo sortedActiveUsers (reaguje na showArchived)
    const objednatelArray = Array.from(uniqueObjednatele).sort(sortByName);
    const garantArray = Array.from(uniqueGaranti).sort(sortByName);
    const schvalovatelArray = Array.from(uniqueSchvalovatelé).sort(sortByName);

    // Dropdown lists prepared

    setObjednatelList(objednatelArray);
    setGarantList(garantArray);
    setSchvalovatelList(schvalovatelArray);
  }, [users]);

  // Aktualizuj dropdown seznamy když se změní users nebo orders
  useEffect(() => {
    if (orders.length > 0 && Object.keys(users).length > 0) {
      prepareDropdownLists(orders);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, users]); // prepareDropdownLists vynecháno - stabilní díky useCallback s [users]

  // Load data
  const loadData = useCallback(async (forceRefresh = false, silent = false, overrideShowOnlyInactive = null) => {
    if (!token || !user?.username) return;

    //  CACHE: Start měření doby načítání
    const loadStartTime = performance.now();

    try {
      // ⚠️ Vynuluj highlight jen při NORMÁLNÍM načítání (ne silent)
      // Silent reload = po schválení - border musí zůstat
      if (!silent) {
        setHighlightOrderId(null);
      }
      
      if (!silent) {
        setLoading(true);
        setError(null);
        setProgress?.(5);
      }

      // Load orders podle oprávnění - použij orders25/by-user pro filtrování na BE
      if (!silent) setProgress?.(20);

      let ordersData;

      // Získej datum_od a datum_do pro API
      const dateRange = calculateDateRange();

      // OPTIMALIZACE: Použij ref pro aktuální permissions místo přímé dependency
      const currentPermissions = permissionsRef.current;
      const canViewAllOrders = currentPermissions.canViewAll;
      const hasOnlyOwnPermissions = currentPermissions.hasOnlyOwn;

      // 🔧 Použij override hodnotu pokud je poskytnutá, jinak state
      const effectiveShowOnlyInactive = overrideShowOnlyInactive !== null ? overrideShowOnlyInactive : showOnlyInactive;

      // MIGRACE: Fetch funkce pro V2 API
      const fetchFunction = async () => {
        const filters = {
          ...dateRange,
          ...(showArchived && { archivovano: 1 }),
          // 🔧 ADMIN FEATURE: Zobrazení POUZE neaktivních objednávek (aktivni = 0)
          // Pouze pokud je uživatel ADMIN a checkbox je zaškrtnutý
          ...(isAdmin && effectiveShowOnlyInactive && { show_only_inactive: 1 })
        };

        setApiTestData(prev => ({
          ...prev,
          requestFilters: filters,
          requestTimestamp: new Date().toISOString()
        }));

        //  V2 API: VŽDY používej enriched endpoint pro kompletní data
        // returnFullResponse=true pro získání meta dat z backendu
        const apiResult = await listOrdersV2(filters, token, username, true, true);

        //  Ulož meta data do state (admin_analysis, atd.)
        if (apiResult?.meta) {
          setApiMeta(apiResult.meta);
        }

        // 🧪 DEBUG: Ulož API response data
        setApiTestData(prev => ({
          ...prev,
          apiResponse: apiResult?.data,
          apiResponseCount: apiResult?.data?.length || 0,
          archivedInResponse: apiResult?.data?.filter(o => o.stav_objednavky === 'ARCHIVOVANO').length || 0,
          responseTimestamp: new Date().toISOString()
        }));

        return apiResult?.data || [];
      };

      //  CACHE: Použij getOrders pro inteligentní cache (memory + localStorage + TTL)
      // forceRefresh se používá JEN při manuálním kliknutí na tlačítko "Obnovit"

      const cacheResult = forceRefresh
        ? await ordersCacheService.forceRefresh(
            user_id,
            fetchFunction,
            {
              ...dateRange,
              viewAll: canViewAllOrders,
              showArchived: showArchived,
              showOnlyInactive: effectiveShowOnlyInactive // 🔧 Klíč cache musí zahrnovat i tento filtr
            }
          )
        : await ordersCacheService.getOrders(
            user_id,
            fetchFunction,
            {
              ...dateRange,
              viewAll: canViewAllOrders,
              showArchived: showArchived,
              showOnlyInactive: effectiveShowOnlyInactive // 🔧 Klíč cache musí zahrnovat i tento filtr
            }
          );

      //  CACHE: Rozbal data a info o zdroji
      ordersData = cacheResult.data;

      // 🚫 FILTR: Odstraň systémové šablony (ID <= 1)
      // Systémové objednávky s ID=0 a ID=1 se nesmí zobrazovat v seznamu
      if (ordersData && Array.isArray(ordersData)) {
        ordersData = ordersData.filter(o => {
          const orderId = parseInt(o.id);
          return !isNaN(orderId) && orderId > 1;
        });
      }

      //  Změř dobu načítání
      const loadEndTime = performance.now();
      const loadDuration = Math.round(loadEndTime - loadStartTime);

      //  Nastav zdroj podle skutečného zdroje z cache
      setLastLoadSource(cacheResult.source); // 'memory', 'database', nebo 'database_forced'
      setLastLoadTime(new Date());
      setLastLoadDuration(loadDuration);

      if (!silent) setProgress?.(60);

      // Load users for names
      try {
        const usersData = await fetchAllUsers({ token, username, show_inactive: true });
        const usersMap = {};

        //  Přidej systémového uživatele SYSTEM (ID 0) pro archivované objednávky
        usersMap['0'] = {
          id: '0',
          jmeno: 'SYSTEM',
          prijmeni: '',
          titul_pred: '',
          titul_za: '',
          username: 'system',
          displayName: 'SYSTEM'
        };

        usersData.forEach((u, index) => {
          // Uložíme kompletní informace o uživateli včetně titulů
          const userId = u.id || u.user_id || u.uzivatel_id;

          // Správné pořadí: Titul před + Jméno + Příjmení + Titul za
          const titul_pred_str = u.titul_pred ? u.titul_pred + ' ' : '';
          const jmeno_str = u.jmeno || '';
          const prijmeni_str = u.prijmeni || '';
          const titul_za_str = u.titul_za ? ', ' + u.titul_za : '';
          const displayName = `${titul_pred_str}${jmeno_str} ${prijmeni_str}${titul_za_str}`.replace(/\s+/g, ' ').trim() || u.username || u.uzivatelske_jmeno || `User ${userId}`;

          if (userId) {
            usersMap[userId] = {
              id: userId,
              jmeno: u.jmeno || '',
              prijmeni: u.prijmeni || '',
              titul_pred: u.titul_pred || '',
              titul_za: u.titul_za || '',
              username: u.username || u.uzivatelske_jmeno || '',
              displayName: displayName
            };

          }
        });

        setUsers(usersMap);

        if (!silent) setProgress?.(70);

        // NYNÍ můžeme zpracovat koncepty s dostupnými users daty
        const localDrafts = [];
        try {
          //  FIX: Použij draftManager místo přímého localStorage
          draftManager.setCurrentUser(user_id);
          const draftData = await draftManager.loadDraft();

          if (draftData) {
            const isConceptValid = isValidConcept(draftData);
            const hasDbChanges = hasDraftChanges(draftData);

            if (isConceptValid && !hasDbChanges) {
              const formData = draftData.formData || draftData;
              const draftKey = getDraftKey(user_id); // Získej klíč pro ID

              // Extrahuj ID z hodnot (CustomSelect může uložit objekt místo ID)
              let garantUserId = formData.garant_uzivatel_id;
              if (typeof garantUserId === 'object' && garantUserId !== null) {
                garantUserId = garantUserId.id || garantUserId.user_id || garantUserId.uzivatel_id;
              }

              let objednatelId = formData.objednatel_id || user_id;
              if (typeof objednatelId === 'object' && objednatelId !== null) {
                objednatelId = objednatelId.id || objednatelId.user_id || objednatelId.uzivatel_id;
              }

              const conceptOrder = {
                id: `draft_${draftKey}`,
                cislo_objednavky: formData.ev_cislo || '★ KONCEPT ★',
                predmet: formData.predmet || 'Nová objednávka (koncept)',
                popis_pozadavku: formData.popis_pozadavku || '',
                stav_objednavky: 'Koncept',
                stav_workflow_kod: '["NOVA"]',
                max_cena_s_dph: formData.max_cena_s_dph || 0,
                poznamky: formData.poznamky || '',
                dodavatel_nazev: formData.dodavatel_nazev || '',
                dodavatel_kontakt_jmeno: formData.dodavatel_kontakt_jmeno || '',
                dodavatel_kontakt_telefon: formData.dodavatel_kontakt_telefon || '',
                dodavatel_kontakt_email: formData.dodavatel_kontakt_email || '',
                garant_uzivatel_id: garantUserId || '',
                objednatel_id: objednatelId || '',
                prikazce_id: formData.prikazce_id || '',
                uzivatel_id: objednatelId || user_id,
                strediska_kod: formData.strediska_kod || [],
                // 🔥 FIX: Použít lokální český čas místo UTC
                dt_vytvoreni: draftData.timestamp || (() => {
                  const now = new Date();
                  const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0');
                  const h = String(now.getHours()).padStart(2,'0'), min = String(now.getMinutes()).padStart(2,'0'), s = String(now.getSeconds()).padStart(2,'0');
                  return `${y}-${m}-${d} ${h}:${min}:${s}`;
                })(),
                temp_datum_objednavky: draftData.firstAutoSaveDate ? draftData.firstAutoSaveDate.split('T')[0] : (formData.temp_datum_objednavky || (() => {
                  const now = new Date();
                  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                })()),
                vytvoril_uzivatel: username,
                isDraft: true,
                je_koncept: true,
                _originalKey: draftKey,
                _originalData: draftData,
                _formData: formData
              };

              localDrafts.push(conceptOrder);
            }
          } else {
          }
        } catch (err) {
          console.error('❌ [Orders25List] Chyba při načítání draftu:', err);
        }

        // Přidej koncepty na začátek seznamu
        if (localDrafts.length > 0) {
          ordersData = [...localDrafts, ...(ordersData || [])];
        }

        // Uložíme také všechny uživatele pro filtry (ne jen ty z objednávek)
        const allUsersForFilters = usersData.map(u => {
          // Zkus najít ID z různých možných polí
          const userId = u.id || u.user_id || u.uzivatel_id;

          const titul_pred_str = u.titul_pred ? u.titul_pred + ' ' : '';
          const jmeno_str = u.jmeno || '';
          const prijmeni_str = u.prijmeni || '';
          const titul_za_str = u.titul_za ? ', ' + u.titul_za : '';
          const displayName = `${titul_pred_str}${jmeno_str} ${prijmeni_str}${titul_za_str}`.replace(/\s+/g, ' ').trim() || u.username || u.uzivatelske_jmeno || `User ${userId}`;

          return {
            id: userId,
            jmeno: u.jmeno || '',
            prijmeni: u.prijmeni || '',
            titul_pred: u.titul_pred || '',
            titul_za: u.titul_za || '',
            username: u.username || u.uzivatelske_jmeno || '',
            email: u.email || '',
            deaktivovan: u.deaktivovan !== undefined ? u.deaktivovan : 0, // Stav deaktivace (0 = aktivní, 1 = deaktivovaný)
            aktivni: u.aktivni !== undefined ? u.aktivni : 1, // Stav aktivity (1 = aktivní, 0 = neaktivní)
            displayName: displayName
          };
        });

        //  Přidej systémového uživatele SYSTEM (ID 0) pro archivované objednávky
        allUsersForFilters.unshift({
          id: '0',
          jmeno: 'SYSTEM',
          prijmeni: '',
          titul_pred: '',
          titul_za: '',
          username: 'system',
          email: '',
          deaktivovan: 0,
          aktivni: 1,
          displayName: 'SYSTEM'
        });

        setAllUsers(allUsersForFilters);

        setProgress?.(70);
      } catch (err) {
        // Error loading users
      }

      // Load schvalovatelé z DB
      try {
        const approversData = await fetchApprovers({ token, username: user.username });

        // Přidej displayName pro schvalovatelje pokud chybí
        const approversWithDisplayName = (approversData || []).map(approver => {
          if (approver.displayName) return approver; // už má displayName

          const titul_pred_str = approver.titul_pred ? approver.titul_pred + ' ' : '';
          const jmeno_str = approver.jmeno || '';
          const prijmeni_str = approver.prijmeni || '';
          const titul_za_str = approver.titul_za ? ', ' + approver.titul_za : '';
          const displayName = `${titul_pred_str}${jmeno_str} ${prijmeni_str}${titul_za_str}`.replace(/\s+/g, ' ').trim() ||
                             approver.jmeno_prijmeni ||
                             approver.username ||
                             approver.uzivatelske_jmeno ||
                             `User ${approver.user_id || approver.uzivatel_id}`;

          return { ...approver, displayName };
        });

        //  Přidej systémového uživatele SYSTEM (ID 0) pro archivované objednávky
        approversWithDisplayName.unshift({
          id: '0',
          user_id: '0',
          uzivatel_id: '0',
          jmeno: 'SYSTEM',
          prijmeni: '',
          titul_pred: '',
          titul_za: '',
          username: 'system',
          deaktivovan: 0,
          aktivni: 1,
          displayName: 'SYSTEM'
        });

        setApproversList(approversWithDisplayName);
        if (!silent) setProgress?.(75);
      } catch (err) {
        // Error loading approvers
      }

      // Load číselníky pro stavy objednávek
      try {
        const statesData = await fetchCiselniky({ token, username: user.username, typ: 'OBJEDNAVKA' });
        // Seřaď stavy abecedně podle názvu
        const sortedStates = (statesData || []).sort((a, b) => {
          const nameA = (a.nazev_stavu || a.nazev || '').toLowerCase();
          const nameB = (b.nazev_stavu || b.nazev || '').toLowerCase();
          return nameA.localeCompare(nameB, 'cs');
        });
        setOrderStatesList(sortedStates);
        if (!silent) setProgress?.(80);
      } catch (err) {
        // Error loading state codes
      }

      // Load DOCX šablony pomocí getDocxSablonyList (stejně jako v jednotlivém DOCX dialogu)
      try {
        const response = await getDocxSablonyList({
          token,
          username: user.username,
          aktivni: 1 // Pouze aktivní šablony
        });

        const templatesData = response?.data || [];

        // Seřaď šablony podle názvu
        const sortedTemplates = (templatesData || []).sort((a, b) => {
          const nameA = (a.nazev || a.kod || '').toLowerCase();
          const nameB = (b.nazev || b.kod || '').toLowerCase();
          return nameA.localeCompare(nameB, 'cs');
        });
        setDocxTemplates(sortedTemplates);
      } catch (err) {
        console.warn('❌ Nepodařilo se načíst DOCX šablony:', err);
        // Fallback na prázdný seznam
        setDocxTemplates([]);
      }

      // Load LP kódy pro převod ID na názvy
      try {
        const lpData = await fetchLimitovanePrisliby({ token, username: user.username });
        setLpKodyList(lpData || []);
      } catch (err) {
        // Error loading LP codes
      }

      // Load druhy objednávek
      try {
        const druhyData = await getDruhyObjednavky25({ token, username: user.username });
        setDruhyObjednavkyList(druhyData || []);
      } catch (err) {
        console.warn('❌ Nepodařilo se načíst druhy objednávek:', err);
        setDruhyObjednavkyList([]);
      }

      // Load střediska
      try {
        const strediskaData = await getStrediska25({ token, username: user.username });
        setStrediskaList(strediskaData || []);
      } catch (err) {
        console.warn('❌ Nepodařilo se načíst střediska:', err);
        setStrediskaList([]);
      }

      // 🎯 SPOLEČNÉ FILTROVÁNÍ: Použij stejnou funkci jako mobile
      // Filtrování: id > 1, !isLocalConcept, archivované (pokud showArchived=false), příkazce (pokud !canViewAll)
      let finalOrders = filterOrdersShared(ordersData || [], {
        showArchived: showArchived,  // Desktop používá showArchived přímo
        userId: canViewAllOrders ? null : user_id,  // Filtruj podle userId pouze pokud není admin
        isAdmin: canViewAllOrders   // canViewAll = isAdmin
      });

      // Označit existující DB řádky, které mají rozpracované změny - DRAFT MANAGER
      draftManager.setCurrentUser(user_id);
      const hasUserDraft = await draftManager.hasDraft();

      if (hasUserDraft) {
        try {
          const draftData = await draftManager.loadDraft();

          // Použij správnou funkci pro kontrolu validních draft změn
          const hasValidDraftChanges = hasDraftChanges(draftData);
          // Označuj řádek POUZE pokud skutečně má validní změny
          if (hasValidDraftChanges) {
            // Pokud má draft DB ID, pokus se označit odpovídající řádek
            const orderIdToMark = draftData.formData?.id || draftData.savedOrderId;
            if (orderIdToMark) {
              let foundAndMarked = false;
              finalOrders = finalOrders.map(order => {
                // Porovnávej jak čísla tak stringy (DB může vracet různé typy)
                const orderIdStr = String(order.id);
                const markIdStr = String(orderIdToMark);

                if (orderIdStr === markIdStr && !order.isDraft) {
                  foundAndMarked = true;
                  return { ...order, hasLocalDraftChanges: true };
                }
                return order;
              });
            }
          }
        } catch (err) {
          // Chyba při kontrole DB řádků pro označení
        }
      }

      //  NORMALIZACE: Pro archivované objednávky bez příkazce/schvalovatele nastav SYSTEM (ID 0)
      finalOrders = finalOrders.map(order => {
        // Aplikuj pouze na archivované objednávky (importované staré objednávky)
        if (order.stav_objednavky === 'ARCHIVOVANO') {
          const normalized = { ...order };

          // Pokud není příkazce, nastav SYSTEM (ID 0)
          if (!normalized.prikazce_id || normalized.prikazce_id === '' || normalized.prikazce_id === null) {
            normalized.prikazce_id = '0';
          }

          // Pokud není schvalovatel, nastav SYSTEM (ID 0)
          if (!normalized.schvalovatel_id || normalized.schvalovatel_id === '' || normalized.schvalovatel_id === null) {
            normalized.schvalovatel_id = '0';
          }

          return normalized;
        }
        return order;
      });

      // 📊 DEBUG: Debug logy byly odstraněny pro lepší výkon v produkci

      setOrders(finalOrders);

      // Populate rawData for debug panel
      setRawData({
        timestamp: new Date().toISOString(),
        ordersCount: finalOrders.length,
        allFields: finalOrders.length > 0 ? Object.keys(finalOrders[0]) : [],
        firstOrder: finalOrders[0] || null,
        rawData: finalOrders
      });

      // Generate calendar_order_counts immediately after loading from DB
      // This must run BEFORE any filtering, on raw DB data
      try {
        const counts = {};

        finalOrders.forEach(order => {
          // Skip draft/concept orders
          if (order.isDraft || order.isLocalConcept) return;

          // Get order date - try multiple field names
          let dateStr = order.dt_objednavky || order.datum_objednavky || order.created_at || order.dt_vytvoreni;

          if (!dateStr) return;

          // Parse date - support both ISO format (YYYY-MM-DD HH:MM:SS) and Czech format (DD.MM.YYYY)
          let year, month, day;

          // Try ISO format first (from DB): YYYY-MM-DD HH:MM:SS or YYYY-MM-DD
          const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            year = isoMatch[1];
            month = isoMatch[2];
            day = isoMatch[3];
          } else {
            // Try Czech format: DD.MM.YYYY
            const czMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (czMatch) {
              day = czMatch[1];
              month = czMatch[2];
              year = czMatch[3];
            } else {
              return; // Neither format matched
            }
          }

          // Create key in format YYYY-MM-DD
          const key = `${year}-${month}-${day}`;

          // Initialize day data if not exists
          if (!counts[key]) {
            counts[key] = { total: 0, pending: 0 };
          }

          counts[key].total += 1;

          // 🚨 OPRAVA: Detekce "Ke schválení" konzistentně s dlazdičkami
          // Použij stejnou logiku jako getOrderSystemStatus()
          let systemStatus = 'UNKNOWN';

          if (order.isDraft || order.je_koncept) {
            systemStatus = 'NOVA';
          } else if (order.stav_objednavky) {
            systemStatus = mapUserStatusToSystemCode(order.stav_objednavky);
          } else if (order.stav_workflow_kod) {
            try {
              const workflowStates = JSON.parse(order.stav_workflow_kod);
              systemStatus = Array.isArray(workflowStates)
                ? workflowStates[workflowStates.length - 1]
                : order.stav_workflow_kod;
            } catch {
              systemStatus = order.stav_workflow_kod;
            }
          }

          // Ke schválení = KE_SCHVALENI
          if (systemStatus === 'KE_SCHVALENI') {
            counts[key].pending += 1;
          }
        });

        //  OPRAVA: Ukládat přímo do localStorage bez user_id suffixu
        // CalendarPanel čte z 'calendar_order_counts', ne z getUserKey()
        localStorage.setItem('calendar_order_counts', JSON.stringify(counts));
        localStorage.setItem('calendar_order_counts_updated', Date.now());
        window.dispatchEvent(new CustomEvent('calendar_order_counts_updated'));
      } catch (err) {
        // Tiše ignorovat chyby při generování kalendáře
      }

      if (!silent) setProgress?.(100);

      // ❌ ODSTRANĚNO: Broadcast po každém načtení dat
      // Toto způsobovalo nekonečnou smyčku mezi záložkami
      // Broadcast se pošle jen když se draft skutečně změní (v handleDraftSave, handleDelete, etc.)

      // 🎬 INITIALIZATION: Označ dokončení načítání dat
      initStepsCompleted.current.dataLoaded = true;

    } catch (err) {
      // Překládáme anglické error messages do češtiny
      const errorMessage = translateErrorMessage(err.message || 'Chyba při načítání objednávek');
      setError(errorMessage);

      // 🎬 INITIALIZATION: V případě chyby označ všechny kroky jako hotové
      initStepsCompleted.current.dataLoaded = true;
      initStepsCompleted.current.paginationRestored = true;
      initStepsCompleted.current.expandedRestored = true;
      initStepsCompleted.current.scrollRestored = true;
    } finally {
      if (!silent) {
        setLoading(false);
        setInitializing(false);
        setTimeout(() => setProgress?.(0), 500);
      } else {
        // I při silent reloadu vynuluj progress bar (pokud nějaký zůstal)
        setTimeout(() => setProgress?.(0), 100);
      }
    }
  }, [token, user?.username, user_id, selectedYear, selectedMonth, showArchived, showOnlyInactive, isAdmin]);
  // OPTIMALIZACE: Odstraněno 'permissions' z dependencies - použit permissionsRef.current místo toho
  // Toto odstraní circular dependency a zabrání zbytečným reload při změně permissions objektu
  // permissions změny jsou zachyceny přes ref který je vždy aktuální

  // Load data on mount - s kontrolou forceReload z navigation state
  // ✅ OPRAVA: Počkat na inicializaci permissions před prvním loadem
  // Problém: Běžní uživatelé (jen OWN permissions) viděli prázdný seznam po přihlášení,
  // protože loadData se volal dřív než se načetla oprávnění/hierarchie
  useEffect(() => {
    // Počkat, až jsou permissions inicializované (hasPermission funkce je k dispozici)
    if (!hasPermission || !token || !user?.username) {
      return;
    }
    
    const shouldForceReload = location.state?.forceReload === true;
    loadData(shouldForceReload);
  }, [loadData, location.state?.forceReload, hasPermission, token, user?.username]);

  // Listen for ORDER_SAVED broadcasts from other tabs/windows
  // 🔥 PERFORMANCE: Debounce loadData to prevent message handler violations
  // 🔒 LOOP PREVENTION: Ignoruj vlastní broadcasty
  useEffect(() => {
    let debounceTimer = null;
    let lastMessageTimestamp = 0;

    const cleanup = onTabSyncMessage((message) => {
      // 🔒 Ignoruj duplikátní zprávy ve velmi krátkém časovém intervalu (< 100ms)
      // Toto zabrání smyčce kdy jedna záložka pošle broadcast -> druhá reaguje -> pošle další broadcast
      const now = Date.now();
      if (now - lastMessageTimestamp < 100) {
        return; // Ignoruj duplicity
      }
      lastMessageTimestamp = now;

      if (message.type === BROADCAST_TYPES.ORDER_SAVED || message.type === BROADCAST_TYPES.DRAFT_DELETED) {
        //  PERFORMANCE: Debounce loadData - prevent excessive reloads from multiple messages
        // Chrome violation fixed: Increased debounce to 1000ms to prevent handler violations
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // ✅ FIX: Zachovat aktuální showOnlyInactive při BT reload
          // ⚠️ SECURITY: Pokud není admin, vždy použít false (checkbox není viditelný)
          loadData(true, false, isAdmin ? showOnlyInactive : false);
          debounceTimer = null;
        }, 1000); // 1000ms debounce (zvýšeno pro performance)
      }
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      cleanup();
    };
  }, [loadData, showOnlyInactive, isAdmin]);

  // Registrace callback pro getCurrentFilters - používá background task před API voláním
  useEffect(() => {
    if (!bgTasksContext?.registerGetCurrentFiltersCallback) {
      return;
    }

    // Vrací aktuální filtry (ROK, OBDOBÍ, ARCHIV) pro background refresh
    // Stejná logika jako loadData() - zajištění konzistence mezi F5 a background refresh
    const getFiltersCallback = () => {
      // Pomocná funkce pro výpočet datum_od a datum_do (kopie z loadData)
      const getDateRange = () => {
        if (selectedYear !== 'all') {
          const year = parseInt(selectedYear);

          if (selectedMonth) {
            const monthMatch = selectedMonth.match(/^(\d+)(?:-(\d+))?$/);
            if (monthMatch) {
              const startMonth = parseInt(monthMatch[1]);
              const endMonth = monthMatch[2] ? parseInt(monthMatch[2]) : startMonth;

              const datum_od = `${year}-${String(startMonth).padStart(2, '0')}-01`;
              const lastDay = new Date(year, endMonth, 0).getDate();
              const datum_do = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

              return { datum_od, datum_do };
            }
          } else {
            return {
              datum_od: `${year}-01-01`,
              datum_do: `${year}-12-31`
            };
          }
        }
        return {};
      };

      const dateRange = getDateRange();
      const filters = { ...dateRange };

      // ARCHIV filtr
      if (showArchived) {
        filters.archivovano = 1;
      }

      // 🔧 ADMIN FEATURE: Jen neaktivní objednávky (aktivni = 0)
      if (isAdmin && showOnlyInactive) {
        filters.show_only_inactive = 1;
      }

      return filters;
    };

    bgTasksContext.registerGetCurrentFiltersCallback(getFiltersCallback);

    return () => {
      bgTasksContext.registerGetCurrentFiltersCallback?.(null);
    };
  }, [bgTasksContext, selectedYear, selectedMonth, showArchived, isAdmin, showOnlyInactive]);

  // Registrace callback pro background refresh objednávek
  // ✅ Background refresh FUNGUJE pro všechny uživatele
  // Backend API nyní filtruje podle permissions (uzivatel_id pro ORDER_READ_OWN)
  // ✅ FIX: Background refresh nyní posílá STEJNÉ filtry jako F5 reload do backendu!
  useEffect(() => {
    if (!bgTasksContext) return;

    const refreshCallback = (ordersData) => {
      //  OPTIMALIZACE: Validace dat před nastavením
      // Ochrana proti přepsání existujících dat nevalidními daty

      // Kontrola 1: Data musí být pole
      if (!ordersData || !Array.isArray(ordersData)) {
        return; // ← OCHRANA: Neměnit orders pokud data nejsou validní
      }

      // Kontrola 2: Pokud máme aktuálně data a přišlo prázdné pole, varování
      if (orders.length > 0 && ordersData.length === 0) {
        return; // ← OCHRANA: Zachovat aktuální data místo přepsání prázdným polem
      }

      // Kontrola 3: Minimální validace struktury dat (první objednávka má ID)
      if (ordersData.length > 0 && !ordersData[0]?.id) {
        return;
      }

      // FILTR: Odstraň systémové šablony (ID <= 1)
      // Systémové objednávky s ID=0 a ID=1 se nesmí zobrazovat v seznamu objednávek
      const filteredOrders = ordersData.filter(o => {
        const orderId = parseInt(o.id);
        return !isNaN(orderId) && orderId > 1;
      });

      // Backend již filtroval podle ROK, OBDOBÍ, ARCHIV - data jsou ready to use!
      // Frontend filtraci NUŽ JUŽ NEPOTŘEBUJEME - backend posílá již filtrovaná data

      // Nastavit žlutou ikonu a čas posledního background refreshe
      setIsBackgroundRefreshActive(true);
      setLastRefreshTime(new Date());

      setOrders(filteredOrders);

      // Update rawData for debug panel
      setRawData({
        timestamp: new Date().toISOString(),
        ordersCount: filteredOrders.length,
        allFields: filteredOrders.length > 0 ? Object.keys(filteredOrders[0]) : [],
        firstOrder: filteredOrders[0] || null,
        rawData: filteredOrders
      });
    };

    bgTasksContext.registerOrdersRefreshCallback?.(refreshCallback);

    return () => {
      bgTasksContext.registerOrdersRefreshCallback?.(null);
    };
  }, [bgTasksContext, showToast, orders.length]); // ← Odstraněny showArchived, user_id, currentUserId, permissions - již nejsou potřeba

  // 🔔 Registrace callbacku pro nové notifikace (force unlock warning)
  useEffect(() => {
    if (!bgTasksContext?.registerNewNotificationsCallback) {
      return;
    }

    const handleNewNotifications = (notifications, unreadCount) => {
      if (!notifications || notifications.length === 0) {
        return;
      }

      // Hledej ORDER_UNLOCK_FORCED notifikace
      const forceUnlockNotifications = notifications.filter(n =>
        n.type === 'order_unlock_forced' &&
        n.precteno === false
      );

      if (forceUnlockNotifications.length > 0) {
        // Zobraz warning dialog pro první force unlock notifikaci
        const notification = forceUnlockNotifications[0];

        // Parsuj data z notifikace
        const notifData = notification.data || {};

        setForceUnlockWarningData({
          orderNumber: notifData.cislo_objednavky || 'N/A',
          lockedBy: notifData.forced_by_name || notifData.forced_by_username || 'N/A',
          lockedByEmail: notifData.forced_by_email || null,
          lockedByPhone: notifData.forced_by_telefon || null,
          lockedAt: notifData.forced_at || new Date().toISOString(),
          notificationId: notification.id
        });

        setShowForceUnlockWarning(true);

      }
    };

    bgTasksContext.registerNewNotificationsCallback(handleNewNotifications);

    return () => {
      bgTasksContext.registerNewNotificationsCallback?.(null);
    };
  }, [bgTasksContext]);

  // Check for highlighted order ID from DraftManager (after redirect from form)
  useEffect(() => {
    if (!user_id) return;

    // 🎯 Načíst highlightOrderId přes DraftManager
    const uiState = draftManager.getUIState();
    const highlightId = uiState?.highlightOrderId;

    if (highlightId) {
      setHighlightOrderId(highlightId);

      // 🔥 HNED SMAZAT z DraftManager po nastavení
      draftManager.saveUIState({ highlightOrderId: null });

      // 📜 AUTOMATICKÝ SCROLL na zvýrazněnou objednávku
      // Počkat až se DOM aktualizuje (po načtení dat)
      const scrollToHighlightedRow = () => {
        const highlightedRow = document.querySelector(`[data-order-id="${highlightId}"]`);
        if (highlightedRow) {
          // Získej pozici řádku a výšku okna
          const rect = highlightedRow.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const rowHeight = rect.height;

          // Zjisti, jestli je to jeden z prvních řádků (málo prostoru nahoře)
          const rowTop = highlightedRow.offsetTop;
          const isNearTop = rowTop < viewportHeight / 2;

          // 📍 Pro řádky nahoře (včetně PRVNÍHO) použij 'start', jinak 'center'
          const blockPosition = isNearTop ? 'start' : 'center';

          try {
            highlightedRow.scrollIntoView({
              behavior: 'smooth',
              block: blockPosition,  // 'start' pro první řádky, 'center' pro ostatní
              inline: 'nearest'
            });
          } catch (e) {
            // Fallback pro starší prohlížeče
            highlightedRow.scrollIntoView(isNearTop); // true = align top, false = align bottom
          }
          return true; // Úspěch
        }
        return false; // Nepodařilo se najít
      };

      // První pokus po 300ms
      setTimeout(() => {
        if (!scrollToHighlightedRow()) {

          // Druhý pokus po 800ms (celkem 1100ms)
          setTimeout(() => {
            if (!scrollToHighlightedRow()) {
            }
          }, 800);
        }
      }, 300);

      // Clear highlight after 5 seconds with fade effect
      setTimeout(() => {
        setHighlightOrderId(null);
      }, 5000);
    }
  }, [orders, user_id]); // Run when orders change (after load)

  // Mapování uživatelsky přívětivých stavů na systémové kódy pro statistiky

  // Helper function to get order status pro ZOBRAZENÍ (preferuje stav_objednavky, fallback na stav_workflow_kod)
  // 🔥 CRITICAL: Must use useCallback to prevent filteredData useMemo from recalculating on every render
  const getOrderDisplayStatus = useCallback((order) => {
    // Preferuj uživatelsky přívětivý stav z stav_objednavky
    if (order.stav_objednavky) {
      return order.stav_objednavky;
    }

    // Fallback na poslední stav z stav_workflow_kod - použij kod_stavu nebo nazev_stavu
    if (order.stav_workflow_kod) {
      try {
        const workflowStates = JSON.parse(order.stav_workflow_kod);
        if (Array.isArray(workflowStates)) {
          const lastState = workflowStates[workflowStates.length - 1];
          // Použij kod_stavu pokud je k dispozici
          if (typeof lastState === 'object' && (lastState.kod_stavu || lastState.nazev_stavu)) {
            return lastState.kod_stavu || 'NEZNAMY_STAV';
          }
          return typeof lastState === 'string' ? lastState : 'NEZNAMY_STAV';
        } else {
          return order.stav_workflow_kod;
        }
      } catch {
        return order.stav_workflow_kod;
      }
    }

    return 'DRAFT';
  }, []); // No dependencies - pure function

  // 🔥 CRITICAL: Must use useCallback to prevent filteredData useMemo from recalculating on every render
  // Helper function to get order status pro STATISTIKY (vždy systémový kód)
  const getOrderSystemStatus = useCallback((order) => {
    // Speciální případ pro koncepty - počítají se jako NOVA pro statistiky
    if (order.isDraft || order.je_koncept) {
      return 'NOVA';
    }

    // Získej základní systémový stav
    let systemStatus;

    // Pokud máme uživatelsky přívětivý stav, zmapuj na systémový kód
    if (order.stav_objednavky) {
      systemStatus = mapUserStatusToSystemCode(order.stav_objednavky);
    }
    // Fallback na poslední stav z stav_workflow_kod
    else if (order.stav_workflow_kod) {
      try {
        const workflowStates = JSON.parse(order.stav_workflow_kod);
        systemStatus = Array.isArray(workflowStates) ? workflowStates[workflowStates.length - 1] : order.stav_workflow_kod;
      } catch {
        systemStatus = order.stav_workflow_kod;
      }
    }
    else {
      systemStatus = 'DRAFT';
    }

    // SPECIALNI LOGIKA PRO UVEREJNENI V REGISTRU SMLUV
    // Kontroluj data o publikaci - ma prednost pred obecnym stavem
    if (order.registr_smluv || order.stav_workflow_kod) {
      const registr = order.registr_smluv;
      
      // Pokud ma dt_zverejneni A registr_iddt, je jiz zverejneno
      if (registr?.dt_zverejneni && registr?.registr_iddt) {
        return 'UVEREJNENA';
      }
      
      // Ziskej workflow status pro kontrolu UVEREJNIT
      let workflowStatus = null;
      if (order.stav_workflow_kod) {
        try {
          let workflowStates = [];
          if (Array.isArray(order.stav_workflow_kod)) {
            workflowStates = order.stav_workflow_kod;
          } else if (typeof order.stav_workflow_kod === 'string') {
            workflowStates = JSON.parse(order.stav_workflow_kod);
            if (!Array.isArray(workflowStates)) {
              workflowStates = [];
            }
          }
          if (workflowStates.length > 0) {
            const lastState = workflowStates[workflowStates.length - 1];
            workflowStatus = typeof lastState === 'object' ? lastState.kod_stavu : lastState;
          }
        } catch (e) {
          // Pokud parsing selže, ignoruj
        }
      }
      
      // Pokud má být zveřejněna (3 podmínky jako checkbox):
      // 1. workflow status je UVEREJNIT
      // 2. registr.zverejnit === 'ANO'
      // 3. registr.ma_byt_zverejnena === true/1
      const maZverejnit = workflowStatus === 'UVEREJNIT' || 
                          registr?.zverejnit === 'ANO' || 
                          registr?.ma_byt_zverejnena;
      
      if (maZverejnit && !registr?.registr_iddt) {
        return 'K_UVEREJNENI_DO_REGISTRU';
      }
    }

    return systemStatus;
  }, []); // No dependencies - pure function

  // Helper funkce pro ziskani aktualniho workflow stavu objednavky
  const getOrderWorkflowStatus = useCallback((order) => {
    if (!order) return null;

    // Zkus ziskat posledni stav z stav_workflow_kod
    if (order.stav_workflow_kod) {
      try {
        let workflowStates = [];
        if (Array.isArray(order.stav_workflow_kod)) {
          workflowStates = order.stav_workflow_kod;
        } else if (typeof order.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(order.stav_workflow_kod);
          if (!Array.isArray(workflowStates)) {
            workflowStates = [];
          }
        }

        if (workflowStates.length > 0) {
          const lastState = workflowStates[workflowStates.length - 1];
          if (typeof lastState === 'object' && lastState.kod_stavu) {
            return lastState.kod_stavu;
          } else if (typeof lastState === 'string') {
            return lastState;
          }
        }
      } catch (e) {
        // Pokud parsing selže, pokračuj na další fallbacky
      }
    }

    // Fallback na stav_workflow objekt
    if (order.stav_workflow) {
      if (typeof order.stav_workflow === 'object' && order.stav_workflow.kod_stavu) {
        return order.stav_workflow.kod_stavu;
      }
    }

    return null;
  }, []);

  // Helper funkce pro ziskani celkove ceny s DPH Z POLOZEK OBJEDNAVKY
  // Pocita POUZE ze souctu polozek (cena_s_dph), NIKDY z max_cena_s_dph
  const getOrderTotalPriceWithDPH = useCallback((order) => {
    // 1. PRIORITA: Faktury (pokud existuji) - skutecne utracene penize
    if (order.faktury_celkova_castka_s_dph != null && order.faktury_celkova_castka_s_dph !== '') {
      const value = parseFloat(order.faktury_celkova_castka_s_dph);
      if (!isNaN(value) && value > 0) return value;
    }
    
    // 2. PRIORITA: Polozky - objednane ale jeste nefakturovane
    if (order.polozky_celkova_cena_s_dph != null && order.polozky_celkova_cena_s_dph !== '') {
      const value = parseFloat(order.polozky_celkova_cena_s_dph);
      if (!isNaN(value) && value > 0) return value;
    }

    // 🔄 Spočítej z pole položek jako fallback (Order V2 API vrací polozky přímo v order objektu)
    if (order.polozky && Array.isArray(order.polozky) && order.polozky.length > 0) {
      const total = order.polozky.reduce((sum, item) => {
        const cena = parseFloat(item.cena_s_dph || 0);
        return sum + (isNaN(cena) ? 0 : cena);
      }, 0);
      if (total > 0) return total;
    }

    // 3. PRIORITA: Max cena ke schválení - schválený limit, se kterým musíme počítat
    if (order.max_cena_s_dph != null && order.max_cena_s_dph !== '') {
      const value = parseFloat(order.max_cena_s_dph);
      if (!isNaN(value) && value > 0) return value;
    }

    // Pokud objednávka nemá žádnou částku, vrať 0
    return 0;
  }, [orders]);

  // 📊 GLOBAL Stats calculation - ALWAYS from orders (before user filters)
  // Used ONLY for total amount display
  const globalStats = useMemo(() => {
    const dataToCount = orders;
    
    const totalAmount = dataToCount.reduce((sum, order) => {
      const amount = getOrderTotalPriceWithDPH(order);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const completedAmount = dataToCount.reduce((sum, order) => {
      const status = getOrderSystemStatus(order);
      const isCompleted = ['DOKONCENA', 'VYRIZENA', 'COMPLETED'].includes(status);
      if (isCompleted) {
        const amount = getOrderTotalPriceWithDPH(order);
        return sum + (isNaN(amount) ? 0 : amount);
      }
      return sum;
    }, 0);

    const incompleteAmount = dataToCount.reduce((sum, order) => {
      const status = getOrderSystemStatus(order);
      const isCancelledOrRejected = ['STORNOVA', 'ZAMITNUTA', 'ZRUSENA', 'CANCELLED', 'SMAZANA'].includes(status);
      const isCompleted = ['DOKONCENA', 'VYRIZENA', 'COMPLETED'].includes(status);
      if (!isCancelledOrRejected && !isCompleted) {
        const amount = getOrderTotalPriceWithDPH(order);
        return sum + (isNaN(amount) ? 0 : amount);
      }
      return sum;
    }, 0);

    return {
      totalAmount,
      completedAmount,
      incompleteAmount
    };
  }, [orders, getOrderSystemStatus, getOrderTotalPriceWithDPH]);

  // 📊 Stats calculation - from base orders for tiles
  const stats = useMemo(() => {
    // ✅ Count from orders (before filters) for initial dashboard state
    const dataToCount = orders;
    
    const total = dataToCount.length;
    const byStatus = dataToCount.reduce((acc, order) => {
      const systemStatus = getOrderSystemStatus(order);
      acc[systemStatus] = (acc[systemStatus] || 0) + 1;
      return acc;
    }, {});

    // 📄 Počítání objednávek s fakturami (min. 1 faktura)
    const withInvoices = dataToCount.reduce((count, order) => {
      const faktury = order.faktury || [];
      const fakturyCount = order.faktury_count || faktury.length || 0;
      return fakturyCount > 0 ? count + 1 : count;
    }, 0);

    // 📎 Počítání objednávek s přílohami (min. 1 příloha)
    const withAttachments = dataToCount.reduce((count, order) => {
      const prilohy = order.prilohy || [];
      const prilohyCount = order.prilohy_count || prilohy.length || 0;
      return prilohyCount > 0 ? count + 1 : count;
    }, 0);

    // ⚠ Počítání mimořádných událostí
    const mimoradneUdalosti = dataToCount.reduce((count, order) => {
      return order.mimoradna_udalost ? count + 1 : count;
    }, 0);

    return {
      total,
      nova: byStatus.NOVA || 0,
      ke_schvaleni: byStatus.ODESLANA_KE_SCHVALENI || 0,
      schvalena: byStatus.SCHVALENA || 0,
      zamitnuta: byStatus.ZAMITNUTA || 0,
      ceka_se: byStatus.CEKA_SE || 0,
      rozpracovana: byStatus.ROZPRACOVANA || 0,
      odeslana: byStatus.ODESLANA || 0,
      potvrzena: byStatus.POTVRZENA || 0,
      uverejnena: byStatus.UVEREJNENA || 0,
      fakturace: byStatus.FAKTURACE || 0,
      vecna_spravnost: byStatus.VECNA_SPRAVNOST || 0,
      dokoncena: byStatus.DOKONCENA || 0,
      vyrizena: byStatus.VYRIZENA || 0,
      zrusena: byStatus.ZRUSENA || 0,
      stornova: byStatus.STORNOVA || 0,
      smazana: byStatus.SMAZANA || 0,
      archivovano: byStatus.ARCHIVOVANO || 0,
      k_uverejneni_do_registru: byStatus.K_UVEREJNENI_DO_REGISTRU || 0,
      ceka_potvrzeni: byStatus.CEKA_POTVRZENI || 0,
      draft: byStatus.DRAFT || 0,
      approved: byStatus.APPROVED || 0,
      completed: byStatus.COMPLETED || 0,
      cancelled: byStatus.CANCELLED || 0,
      totalAmount: globalStats.totalAmount,
      completedAmount: globalStats.completedAmount,
      incompleteAmount: globalStats.incompleteAmount,
      withInvoices,
      withAttachments,
      mimoradneUdalosti
    };
  }, [orders, globalStats, getOrderSystemStatus]);

  // Pomocná funkce pro získání data objednávky (skutečné nebo dočasné pro koncepty)
  // Získání full datetime pro objednávku
  const getOrderDateTime = useCallback((order) => {
    // Pokud je to koncept (isDraft)
    if (order.isDraft) {
      // Pokud má uložené datum prvního autosave v _originalData, použij ho
      if (order._originalData?.firstAutoSaveDate && typeof order._originalData.firstAutoSaveDate === 'string') {
        return order._originalData.firstAutoSaveDate; // Celý ISO string
      }
      // Jinak použij dt_vytvoreni
      if (order.dt_vytvoreni && typeof order.dt_vytvoreni === 'string') {
        return order.dt_vytvoreni; // Celý ISO string
      }
    }
    // Jinak použij standardní dt_objednavky
    return (order.dt_objednavky && typeof order.dt_objednavky === 'string') ? order.dt_objednavky : null;
  }, []);

  // Získání jen data pro objednávku (pro filtrování apod.)
  const getOrderDate = useCallback((order) => {
    const dateTime = getOrderDateTime(order);
    return (dateTime && typeof dateTime === 'string') ? dateTime.split('T')[0] : null;
  }, [getOrderDateTime]);

  // Helper funkce pro zvýraznění vyhledaného textu
  const highlightText = useCallback((text, searchTerm) => {
    if (!text || !searchTerm || typeof text !== 'string') return text;

    // Normalizace - odstranění diakritiky pro porovnání
    const normalizedText = removeDiacritics(text.toLowerCase());
    const normalizedSearch = removeDiacritics(searchTerm.toLowerCase());

    const index = normalizedText.indexOf(normalizedSearch);
    if (index === -1) return text;

    // Zvýraznění textu s diakritikou
    const beforeMatch = text.substring(0, index);
    const match = text.substring(index, index + normalizedSearch.length);
    const afterMatch = text.substring(index + normalizedSearch.length);

    return (
      <>
        {beforeMatch}
        <mark style={{ backgroundColor: '#ffeb3b', padding: '0 2px', borderRadius: '2px' }}>
          {match}
        </mark>
        {afterMatch}
      </>
    );
  }, []);

  // 🎨 Helper pro zvýraznění textu podle globálního nebo sloupcového filtru
  const highlightTextWithFilters = useCallback((text, columnKey) => {
    if (!text || typeof text !== 'string') return text;
    
    // Priorita: sloupcový filtr (localColumnFilters pro okamžitý feedback) > globální filtr
    const columnFilterValue = localColumnFilters[columnKey];
    const searchTerm = columnFilterValue || globalFilter;
    
    return searchTerm ? highlightText(text, searchTerm) : text;
  }, [localColumnFilters, globalFilter, highlightText]);

  // 🔥 CRITICAL PERFORMANCE: Forward declaration for action click handler
  // Defined here (before columns) to avoid "Cannot access before initialization" error
  // Actual handlers (handleEdit, handleView, etc.) are defined later
  // Uses refs to access handlers without creating circular dependencies
  const handlersRef = useRef({});

  const handleActionClick = useCallback((e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    
    // 🔧 KRITICKÉ: Kontrola disabled stavu pomocí data-disabled atributu
    if (button.dataset.disabled === 'true') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const action = button.dataset.action;
    const orderIndex = parseInt(button.dataset.orderIndex, 10); // Local index in current page
    const orderId = parseInt(button.dataset.orderId, 10); // Actual order ID from DB
    
    // Use LOCAL index to get order from filteredDataRef (current page data)
    const order = filteredDataRef.current[orderIndex];

    if (!order) {
      return;
    }

    // Use refs to call handlers (populated after they're defined)
    const handlers = handlersRef.current;
    switch (action) {
      case 'edit':
        handlers.handleEdit?.(order);
        break;
      case 'view':
        handlers.handleView?.(order);
        break;
      case 'export':
        handlers.handleExportDocument?.(order);
        break;
      case 'financial-control':
        handlers.handleFinancialControl?.(order);
        break;
      case 'create-invoice':
        handlers.handleCreateInvoice?.(order);
        break;
      case 'delete':
        handlers.handleDelete?.(order);
        break;
    }
  }, []); // No dependencies - uses refs

  // Helper function to get user display name with titles
  // 🔥 CRITICAL: Uses usersRef.current instead of users dependency to prevent columns re-render
  const getUserDisplayName = useCallback((userId, enrichedUser = null) => {
    if (enrichedUser) {
      const { titul_pred, jmeno, prijmeni, titul_za } = enrichedUser;
      // Správné pořadí: Titul před + Jméno + Příjmení + Titul za
      const titul_pred_str = titul_pred ? titul_pred + ' ' : '';
      const jmeno_str = jmeno || '';
      const prijmeni_str = prijmeni || '';
      const titul_za_str = titul_za ? ', ' + titul_za : '';

      return `${titul_pred_str}${jmeno_str} ${prijmeni_str}${titul_za_str}`.replace(/\s+/g, ' ').trim();
    }

    const currentUsers = usersRef.current;
    if (userId && currentUsers[userId]) {
      // Pokud máme objekt s displayName, použij ho
      if (typeof currentUsers[userId] === 'object' && currentUsers[userId].displayName) {
        return currentUsers[userId].displayName;
      }
      // Pokud je to starý formát (pouze string), použij ho
      if (typeof currentUsers[userId] === 'string') {
        return currentUsers[userId];
      }
    }

    return 'Neznámý';
  }, []); // No dependencies - uses usersRef.current

  // Helper function to get druh objednávky název by kod
  const getDruhObjednavkyNazev = useCallback((kod) => {
    if (!kod) return '---';
    const druh = druhyObjednavkyList.find(d => d.kod === kod);
    return druh?.nazev || kod;
  }, [druhyObjednavkyList]);

  // Helper function to get středisko název by kod
  const getStrediskoNazev = useCallback((kod) => {
    if (!kod) return '---';
    // Převod na string pro porovnání (API může vracet čísla i stringy)
    const kodStr = String(kod);
    
    // Hledáme středisko - data mohou být v raw objektu nebo přímo
    const stredisko = strediskaList.find(s => {
      const itemKod = String(s.value || s.kod_stavu || s.kod || s.raw?.kod_stavu || s.raw?.kod);
      return itemKod === kodStr;
    });
    
    // Vrátíme celý nazev_stavu tak jak je v DB (např. "100 Správa Kladno")
    const nazev = stredisko?.label || stredisko?.nazev_stavu || stredisko?.nazev || 
                  stredisko?.raw?.nazev_stavu || stredisko?.raw?.nazev;
    
    return nazev || `Středisko (kód ${kod})`;
  }, [strediskaList]);

  // 🎯 HELPER: Wrapper pro sortingFn - VŽDY dává konceptům prioritu
  // Zajišťuje, že koncepty (isDraft nebo je_koncept) jsou VŽDY první v tabulce,
  // bez ohledu na řazení ostatních sloupců
  const withDraftPriority = useCallback((sortingFn) => {
    return (rowA, rowB, columnId) => {
      const aIsDraft = rowA.original.isDraft || rowA.original.je_koncept || false;
      const bIsDraft = rowB.original.isDraft || rowB.original.je_koncept || false;
      
      // Pokud jedna je draft a druhá ne, draft je vždy první
      if (aIsDraft && !bIsDraft) return -1;
      if (!aIsDraft && bIsDraft) return 1;
      
      // Obě jsou drafty nebo obě nejsou - použij původní sorting
      return sortingFn(rowA, rowB, columnId);
    };
  }, []);

  // Column definitions
  const columns = useMemo(() => [
    {
      id: 'select',
      header: '',
      cell: ({ row }) => (
        <div style={{ display: 'none' }}>
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
          />
        </div>
      ),
      size: 0,
      meta: {
        align: 'center',
        hidden: true
      }
    },
    {
      id: 'expander',
      header: '',
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ExpandButton
            onClick={(e) => {
              row.getToggleExpandedHandler()(e);

              // Pokud se řádek rozbaluje, načti detaily osob (pokud ještě nejsou v enriched datech)
              if (!row.getIsExpanded()) {
                const order = row.original;

                // Order V2 API enriched vrací: uzivatel{}, prikazce_uzivatel{}, garant_uzivatel{}, schvalovatel{}
                // Načti detaily jen pokud chybí
                if (order.prikazce_id && !order.prikazce?.email && !order.prikazce_uzivatel?.email) {
                  loadPersonDetail(order.id, 'prikazce', order.prikazce_id);
                }
                if (order.uzivatel_id && !order.objednatel?.email && !order.uzivatel?.email) {
                  loadPersonDetail(order.id, 'objednatel', order.uzivatel_id);
                }
                if (order.garant_uzivatel_id && !order.garant?.email && !order.garant_uzivatel?.email) {
                  loadPersonDetail(order.id, 'garant', order.garant_uzivatel_id);
                }
                if (order.schvalovatel_id && !order.schvalovatel?.email) {
                  loadPersonDetail(order.id, 'schvalovatel', order.schvalovatel_id);
                }
              }
            }}
            title={row.getIsExpanded() ? 'Sbalit' : 'Rozbalit'}
          >
            <FontAwesomeIcon icon={row.getIsExpanded() ? faMinus : faPlus} />
          </ExpandButton>
        </div>
      ),
      size: 35,
      meta: {
        align: 'center'
      }
    },
    // 🎯 Sloupec SCHVÁLIT - ikona pro rychlé schválení (pouze pro ADMINI a ORDER_APPROVE)
    ...(hasAdminRole() || hasPermission('ORDER_APPROVE') ? [{
      id: 'approve',
      header: () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '0.9rem', opacity: 0.7 }} />
        </div>
      ),
      cell: ({ row }) => {
        const order = row.original;
        
        // Kontrola oprávnění
        const isPrikazce = String(order.prikazce_id) === String(currentUserId);
        const isAdmin = hasAdminRole();
        const hasApprovePermission = hasPermission('ORDER_APPROVE');
        const canUserApprove = isPrikazce || isAdmin || hasApprovePermission;
        
        if (!canUserApprove) return null;
        
        // Kontrola workflow stavu
        let workflowStates = [];
        try {
          if (Array.isArray(order.stav_workflow_kod)) {
            workflowStates = order.stav_workflow_kod;
          } else if (typeof order.stav_workflow_kod === 'string') {
            workflowStates = JSON.parse(order.stav_workflow_kod);
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
        
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const orderDetail = await getOrderV2(order.id, token, username, true, 0);

                  // 🔒 LOCK CHECK: rychlé schválení nesmí pokračovat, pokud je objednávka zamčena jiným uživatelem
                  if (orderDetail?.lock_info?.locked === true && !orderDetail.lock_info?.is_owned_by_me && !orderDetail.lock_info?.is_expired) {
                    const lockInfo = orderDetail.lock_info;
                    const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

                    // Pro schvalování NEumožňujeme force unlock (bezpečné výchozí chování)
                    setLockedOrderInfo({
                      lockedByUserName,
                      lockedByUserEmail: lockInfo.locked_by_user_email || null,
                      lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
                      lockedAt: lockInfo.locked_at || null,
                      lockAgeMinutes: lockInfo.lock_age_minutes || null,
                      canForceUnlock: false,
                      orderId: order.id,
                      userRoleName: 'administrátor',
                      blockedAction: 'approve'
                    });
                    setOrderToEdit(null);
                    setShowLockedOrderDialog(true);
                    return;
                  }

                  setOrderToApprove(orderDetail);
                  setApprovalComment(orderDetail.schvaleni_komentar || '');
                  setShowApprovalDialog(true);
                } catch (error) {
                  console.error('Chyba při načítání detailu objednávky:', error);
                  showToast('Chyba při načítání objednávky', { type: 'error' });
                }
              }}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                color: iconColor,
                cursor: 'pointer',
                padding: '0.35rem 0.5rem',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = hoverBgColor;
                e.currentTarget.style.borderColor = hoverBorderColor;
                e.currentTarget.style.color = hoverIconColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = iconColor;
              }}
              title={isPending ? "Schválit objednávku (ke schválení)" : "Zobrazit schválení (vyřízeno)"}
            >
              <FontAwesomeIcon icon={icon} />
            </button>
          </div>
        );
      },
      size: 45,
      meta: {
        align: 'center'
      }
    }] : []),
    {
      accessorKey: 'dt_objednavky',
      header: 'Datum objednávky',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const dateA = getOrderDateTime(rowA.original);
        const dateB = getOrderDateTime(rowB.original);

        // Pokud jeden z řádků nemá datum, dej ho na konec
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        // Porovnej timestamp
        const timeA = new Date(dateA).getTime();
        const timeB = new Date(dateB).getTime();
        return timeA - timeB;
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const order = row.original;
        const orderDateTime = getOrderDateTime(order);
        if (!orderDateTime) return false;

        // Datum poslední změny (bez času)
        const lastModified = order.dt_aktualizace || order.dt_objednavky || orderDateTime;
        const lastModifiedStr = formatDateOnly(new Date(lastModified));

        // Datum a čas vytvoření
        const created = order.dt_vytvoreni || orderDateTime;
        const createdDate = new Date(created);
        const createdDateStr = formatDateOnly(createdDate);
        const createdTimeStr = createdDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

        // Převést filterValue (yyyy-mm-dd) na dd.mm.yyyy pro porovnání
        let searchText = filterValue;
        if (filterValue.includes('-') && filterValue.length === 10) {
          // Formát yyyy-mm-dd z DatePickeru
          const date = new Date(filterValue);
          if (!isNaN(date.getTime())) {
            searchText = formatDateOnly(date);
          }
        }

        // Spojit všechny tři hodnoty pro prohledávání
        const fullText = `${lastModifiedStr} ${createdDateStr} ${createdTimeStr}`;

        // Case-insensitive a bez diakritiky
        const normalizedText = removeDiacritics(fullText.toLowerCase());
        const normalizedFilter = removeDiacritics(searchText.toLowerCase());

        return normalizedText.includes(normalizedFilter);
      },
      cell: ({ row }) => {
        const order = row.original;
        const orderDateTime = getOrderDateTime(order);
        if (!orderDateTime) return <div style={{ textAlign: 'center' }}>---</div>;

        // Datum poslední změny objednávky (bez času)
        const lastModified = order.dt_aktualizace || order.dt_objednavky || orderDateTime;
        const lastModifiedDate = new Date(lastModified);
        const lastModifiedStr = formatDateOnly(lastModifiedDate);

        // Datum a čas vytvoření objednávky
        const created = order.dt_vytvoreni || orderDateTime;
        const createdDate = new Date(created);
        const createdDateStr = formatDateOnly(createdDate);
        const createdTimeStr = createdDate.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

        return (
          <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
            <div>{lastModifiedStr}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{createdDateStr}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{createdTimeStr}</div>
          </div>
        );
      },
      size: 90
    },
    {
      accessorKey: 'cislo_objednavky',
      header: 'Evidenční číslo',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const numA = rowA.original.cislo_objednavky || '';
        const numB = rowB.original.cislo_objednavky || '';

        // Prázdné hodnoty na konec
        if (!numA && !numB) return 0;
        if (!numA) return 1;
        if (!numB) return -1;

        // České třídění čísel objednávek
        return numA.localeCompare(numB, 'cs', { numeric: true, sensitivity: 'base' });
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const cislo = row.original.cislo_objednavky || '';
        const predmet = row.original.predmet || '';

        // Filtruj podle čísla i předmětu (OR podmínka)
        const normalizedCislo = removeDiacritics(cislo.toLowerCase());
        const normalizedPredmet = removeDiacritics(predmet.toLowerCase());
        const normalizedFilter = removeDiacritics(filterValue.toLowerCase());

        return normalizedCislo.includes(normalizedFilter) || normalizedPredmet.includes(normalizedFilter);
      },
      cell: ({ row }) => (
        <div style={{
          textAlign: 'left',
          whiteSpace: 'normal',
          overflow: 'visible',
          position: 'relative'
        }}>
          {/* První řádek - Ev. číslo */}
          <div style={{
            fontWeight: 600,
            color: '#1e293b',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}>
            {row.original.mimoradna_udalost && (
              <SmartTooltip content="Mimořádná objednávka (krize/havárie)">
                <span style={{
                  color: '#dc2626',
                  fontWeight: 'bold',
                  marginRight: '4px',
                  fontSize: '1.1em'
                }}>
                  <FontAwesomeIcon icon={faBoltLightning} />
                </span>
              </SmartTooltip>
            )}
            {row.original.stav_objednavky === 'ARCHIVOVANO' && (
              <span style={{
                color: '#dc2626',
                fontWeight: 'bold',
                marginRight: '4px',
                fontSize: '1.1em'
              }}>
                ⚠
              </span>
            )}
            {highlightTextWithFilters(row.original.cislo_objednavky || '---', 'cislo_objednavky')}
            {row.original.id && !row.original.isDraft && !row.original.je_koncept && (
              <sup style={{
                fontSize: '0.6rem',
                color: '#9ca3af',
                fontWeight: 'normal',
                marginLeft: '2px'
              }}>
                #{row.original.id}
              </sup>
            )}
          </div>
          {/* Druhý řádek - Předmět */}
          {row.original.predmet && (
            <div style={{
              fontSize: '1em',
              fontWeight: 600,
              color: '#1e293b',
              marginTop: '4px',
              lineHeight: '1.3',
              maxWidth: '300px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word'
            }}>
              {highlightTextWithFilters(row.original.predmet, 'predmet')}
            </div>
          )}
        </div>
      ),
      size: 140
    },
    {
      accessorKey: 'zpusob_financovani',
      header: 'Financování',
      sortingFn: withDraftPriority((rowA, rowB) => {
        // Funkce pro získání způsobu financování - STEJNÁ LOGIKA JAKO V PODŘÁDKU
        const getFinancovaniText = (order) => {
          // Priorita: order.financovani.typ_nazev nebo order.financovani.typ
          if (order.financovani && typeof order.financovani === 'object') {
            return order.financovani.typ_nazev || order.financovani.typ || '';
          }
          return '';
        };

        const nameA = getFinancovaniText(rowA.original);
        const nameB = getFinancovaniText(rowB.original);

        // České třídění (prázdné na konec)
        if (!nameA && !nameB) return 0;
        if (!nameA) return 1;
        if (!nameB) return -1;

        return nameA.localeCompare(nameB, 'cs', { sensitivity: 'base' });
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const order = row.original;
        let financovaniText = '';
        let detailText = '';

        // STEJNÁ LOGIKA JAKO V PODŘÁDKU
        if (order.financovani && typeof order.financovani === 'object') {
          financovaniText = order.financovani.typ_nazev || order.financovani.typ || '';
          
          // Získat detail podle typu financování
          const typ = order.financovani.typ || '';
          
          // LP - zobrazit jen LP kódy (bez popisů)
          if (typ === 'LP') {
            // Priorita 1: lp_nazvy array (enriched data) - ale použij jen kódy
            if (order.financovani.lp_nazvy && Array.isArray(order.financovani.lp_nazvy) && order.financovani.lp_nazvy.length > 0) {
              const lpKody = order.financovani.lp_nazvy
                .map(lp => lp.cislo_lp || lp.kod || '')
                .filter(Boolean);
              
              if (lpKody.length > 0) {
                detailText = lpKody.join(', ');
              }
            }
            // Fallback: lp_kody array
            else if (order.financovani.lp_kody && Array.isArray(order.financovani.lp_kody) && order.financovani.lp_kody.length > 0) {
              detailText = order.financovani.lp_kody.join(', ');
            }
          }
          // Smlouva - zobrazit číslo smlouvy
          else if (typ === 'SMLOUVA') {
            detailText = order.financovani.cislo_smlouvy || '';
          }
          // Individuální schválení - zobrazit číslo individuálního schválení
          else if (typ === 'INDIVIDUALNI_SCHVALENI') {
            detailText = order.financovani.individualni_schvaleni || '';
          }
        }

        // Pokud je prázdný, hledej "---"
        if (!financovaniText) {
          const normalizedFilter = removeDiacritics(filterValue.toLowerCase());
          return normalizedFilter === '---' || normalizedFilter === '';
        }

        // Case-insensitive a bez diakritiky - hledej v typu financování i v detailu
        const normalizedFilter = removeDiacritics(filterValue.toLowerCase());
        const normalizedFinancovani = removeDiacritics(String(financovaniText).toLowerCase());
        const normalizedDetail = detailText ? removeDiacritics(String(detailText).toLowerCase()) : '';

        // Hledej v hlavním textu NEBO v detailu (LP kódy, smlouva, atd.)
        return normalizedFinancovani.includes(normalizedFilter) || normalizedDetail.includes(normalizedFilter);
      },
      cell: ({ row }) => {
        const order = row.original;
        let financovaniText = '---';
        let detailText = '';

        // STEJNÁ LOGIKA JAKO V PODŘÁDKU: order.financovani.typ_nazev nebo order.financovani.typ
        if (order.financovani && typeof order.financovani === 'object') {
          financovaniText = order.financovani.typ_nazev || order.financovani.typ || '---';
          
          // Získat detail podle typu financování
          const typ = order.financovani.typ || '';
          
          // LP - zobrazit jen LP kódy (bez popisů)
          if (typ === 'LP') {
            // Priorita 1: lp_nazvy array (enriched data) - ale použij jen kódy
            if (order.financovani.lp_nazvy && Array.isArray(order.financovani.lp_nazvy) && order.financovani.lp_nazvy.length > 0) {
              const lpKody = order.financovani.lp_nazvy
                .map(lp => lp.cislo_lp || lp.kod || '')
                .filter(Boolean);
              
              if (lpKody.length > 0) {
                detailText = lpKody.join(', ');
              }
            }
            // Fallback: lp_kody array
            else if (order.financovani.lp_kody && Array.isArray(order.financovani.lp_kody) && order.financovani.lp_kody.length > 0) {
              detailText = order.financovani.lp_kody.join(', ');
            }
          }
          // Smlouva - zobrazit číslo smlouvy
          else if (typ === 'SMLOUVA') {
            detailText = order.financovani.cislo_smlouvy || '';
          }
          // Individuální schválení - zobrazit číslo individuálního schválení
          else if (typ === 'INDIVIDUALNI_SCHVALENI') {
            detailText = order.financovani.individualni_schvaleni || '';
          }
        }

        // Zkrátit víceoslovné názvy: "Limitovaný příslib" -> "Limitovaný p."
        let displayText = financovaniText;
        if (financovaniText !== '---') {
          const words = financovaniText.trim().split(/\s+/);
          if (words.length > 1) {
            // První slovo celé + první písmeno dalších slov s tečkou
            displayText = words[0] + ' ' + words.slice(1).map(w => w.charAt(0) + '.').join(' ');
          }
        }

        // Priorita zvýraznění: column filter > global filter
        const highlightFilter = columnFilters.zpusob_financovani || globalFilter;

        return (
          <div style={{
            textAlign: 'left',
            whiteSpace: 'nowrap',
            lineHeight: '1.3'
          }}
          title={financovaniText !== '---' ? financovaniText : ''}
          >
            <div style={{
              fontWeight: 600,
              color: '#7c3aed'
            }}>
              {highlightFilter
                ? highlightText(displayText, highlightFilter)
                : displayText
              }
            </div>
            {detailText && (
              <div style={{
                fontSize: '0.8em',
                color: '#6b7280',
                marginTop: '2px',
                fontWeight: 500
              }}>
                {highlightFilter
                  ? highlightText(detailText, highlightFilter)
                  : detailText
                }
              </div>
            )}
            
            {/* Roční plán čerpání - jen pro smlouvy se stropovou cenou */}
            {order.financovani?.typ === 'SMLOUVA' && order._enriched?.smlouva_info && (() => {
              const smlouvaInfo = order._enriched.smlouva_info;
              const hodnotaSmlouvy = parseFloat(smlouvaInfo.hodnota) || 0;
              const cerpanoPozadovano = parseFloat(smlouvaInfo.cerpano_pozadovano) || 0;
              const percentCerpani = hodnotaSmlouvy > 0 ? Math.round((cerpanoPozadovano / hodnotaSmlouvy) * 100) : 0;
              
              if (hodnotaSmlouvy > 0) {
                const currentMonth = new Date().getMonth();
                const planedPercentForCurrentMonth = Math.floor(((currentMonth + 1) / 12.0) * 100.0);
                const isUnderPlan = percentCerpani <= planedPercentForCurrentMonth;
                
                return (
                  <div style={{
                    display: 'flex',
                    width: '100%',
                    minHeight: '14px',
                    gap: '1px',
                    background: '#f1f5f9',
                    borderRadius: '2px',
                    padding: '1px',
                    marginTop: '3px'
                  }}>
                    {Array.from({ length: 12 }).map((_, monthIndex) => {
                      const isCurrentMonth = monthIndex === currentMonth;
                      const planedPercent = Math.floor(((monthIndex + 1) / 12.0) * 100.0);
                      
                      let bgColor;
                      if (isCurrentMonth) {
                        bgColor = isUnderPlan ? '#22c55e' : '#ef4444';
                      } else if (monthIndex < currentMonth) {
                        bgColor = '#94a3b8';
                      } else {
                        bgColor = '#e2e8f0';
                      }
                      
                      const textColor = isCurrentMonth ? '#ffffff' : (monthIndex < currentMonth ? '#1e293b' : '#64748b');
                      
                      return (
                        <div
                          key={monthIndex}
                          style={{
                            flex: 1,
                            background: bgColor,
                            borderRadius: '1px',
                            position: 'relative',
                            border: isCurrentMonth ? '1px solid #0f172a' : 'none',
                            minHeight: '12px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            paddingBottom: '1px'
                          }}
                          title={`${percentCerpani}% / ${planedPercent}%`}
                        >
                          <div style={{ 
                            fontSize: '0.45rem', 
                            fontWeight: 700,
                            color: textColor,
                            lineHeight: 1
                          }}>
                            {planedPercent}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Roční plán čerpání - pro LP (může jich být více na jedné objednávce) */}
            {order.financovani?.typ === 'LP' && order._enriched?.lp_info && Array.isArray(order._enriched.lp_info) && order._enriched.lp_info.length > 0 && (
              <>
                {order._enriched.lp_info.map((lp, lpIndex) => {
                  const hodnotaLP = parseFloat(lp.total_limit) || 0;
                  const cerpanoPredpoklad = parseFloat(lp.cerpano_predpoklad) || 0;
                  const percentCerpani = hodnotaLP > 0 ? Math.round((cerpanoPredpoklad / hodnotaLP) * 100) : 0;
                  
                  if (hodnotaLP > 0) {
                    const currentMonth = new Date().getMonth();
                    const planedPercentForCurrentMonth = Math.floor(((currentMonth + 1) / 12.0) * 100.0);
                    const isUnderPlan = percentCerpani <= planedPercentForCurrentMonth;
                    
                    return (
                      <div 
                        key={lpIndex}
                        style={{
                          display: 'flex',
                          width: '100%',
                          minHeight: '14px',
                          gap: '1px',
                          background: '#f1f5f9',
                          borderRadius: '2px',
                          padding: '1px',
                          marginTop: '3px'
                        }}
                      >
                        {Array.from({ length: 12 }).map((_, monthIndex) => {
                          const isCurrentMonth = monthIndex === currentMonth;
                          const planedPercent = Math.floor(((monthIndex + 1) / 12.0) * 100.0);
                          
                          let bgColor;
                          if (isCurrentMonth) {
                            bgColor = isUnderPlan ? '#22c55e' : '#ef4444';
                          } else if (monthIndex < currentMonth) {
                            bgColor = '#94a3b8';
                          } else {
                            bgColor = '#e2e8f0';
                          }
                          
                          const textColor = isCurrentMonth ? '#ffffff' : (monthIndex < currentMonth ? '#1e293b' : '#64748b');
                          
                          return (
                            <div
                              key={monthIndex}
                              style={{
                                flex: 1,
                                background: bgColor,
                                borderRadius: '1px',
                                position: 'relative',
                                border: isCurrentMonth ? '1px solid #0f172a' : 'none',
                                minHeight: '12px',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                paddingBottom: '1px'
                              }}
                              title={`${lp.kod}: ${percentCerpani}% / ${planedPercent}%`}
                            >
                              <div style={{ 
                                fontSize: '0.45rem', 
                                fontWeight: 700,
                                color: textColor,
                                lineHeight: 1
                              }}>
                                {planedPercent}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                })}
              </>
            )}
          </div>
        );
      },
      size: 100
    },
    {
      accessorKey: 'objednatel_garant',
      header: 'Objednatel / Garant',
      sortingFn: withDraftPriority((rowA, rowB) => {
        // Třídění primárně podle objednatele
        const getObjednatelName = (order) => {
          if (order.objednatel_uzivatel) {
            if (order.objednatel_uzivatel.cele_jmeno) {
              return order.objednatel_uzivatel.cele_jmeno;
            }
            return getUserDisplayName(null, order.objednatel_uzivatel);
          }
          if (order.objednatel) {
            const obj = order.objednatel;
            if (obj.cele_jmeno) {
              return obj.cele_jmeno;
            }
            if (obj.jmeno && obj.prijmeni) {
              const titul_pred_str = obj.titul_pred ? obj.titul_pred + ' ' : '';
              const titul_za_str = obj.titul_za ? ', ' + obj.titul_za : '';
              return `${titul_pred_str}${obj.jmeno} ${obj.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
            }
            if (obj.username) {
              return obj.username;
            }
          }
          if (order.objednatel_id) {
            return getUserDisplayName(order.objednatel_id);
          }
          return '---';
        };

        const nameA = getObjednatelName(rowA.original);
        const nameB = getObjednatelName(rowB.original);

        // České třídění jmen (--- na konec)
        if (nameA === '---' && nameB === '---') return 0;
        if (nameA === '---') return 1;
        if (nameB === '---') return -1;

        return nameA.localeCompare(nameB, 'cs', { sensitivity: 'base' });
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const order = row.original;
        let objednatelName = '---';
        let garantName = '---';

        // Získej jméno objednatele
        if (order.objednatel_uzivatel) {
          if (order.objednatel_uzivatel.cele_jmeno) {
            objednatelName = order.objednatel_uzivatel.cele_jmeno;
          } else {
            objednatelName = getUserDisplayName(null, order.objednatel_uzivatel);
          }
        } else if (order.objednatel) {
          const obj = order.objednatel;
          if (obj.cele_jmeno) {
            objednatelName = obj.cele_jmeno;
          } else if (obj.jmeno && obj.prijmeni) {
            const titul_pred_str = obj.titul_pred ? obj.titul_pred + ' ' : '';
            const titul_za_str = obj.titul_za ? ', ' + obj.titul_za : '';
            objednatelName = `${titul_pred_str}${obj.jmeno} ${obj.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
          } else if (obj.username) {
            objednatelName = obj.username;
          }
        } else if (order.objednatel_id) {
          objednatelName = getUserDisplayName(order.objednatel_id);
        }

        // Získej jméno garanta
        if (order.garant_uzivatel) {
          if (order.garant_uzivatel.cele_jmeno) {
            garantName = order.garant_uzivatel.cele_jmeno;
          } else {
            garantName = getUserDisplayName(null, order.garant_uzivatel);
          }
        } else if (order.garant) {
          const gar = order.garant;
          if (gar.cele_jmeno) {
            garantName = gar.cele_jmeno;
          } else if (gar.jmeno && gar.prijmeni) {
            const titul_pred_str = gar.titul_pred ? gar.titul_pred + ' ' : '';
            const titul_za_str = gar.titul_za ? ', ' + gar.titul_za : '';
            garantName = `${titul_pred_str}${gar.jmeno} ${gar.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
          } else if (gar.username) {
            garantName = gar.username;
          }
        } else if (order.garant_uzivatel_id) {
          garantName = getUserDisplayName(order.garant_uzivatel_id);
        }

        // Filtruj podle obou jmen (OR podmínka)
        const normalizedObjednatel = removeDiacritics(objednatelName.toLowerCase());
        const normalizedGarant = removeDiacritics(garantName.toLowerCase());
        const normalizedFilter = removeDiacritics(filterValue.toLowerCase());

        return normalizedObjednatel.includes(normalizedFilter) || normalizedGarant.includes(normalizedFilter);
      },
      cell: ({ row, table }) => {
        const order = row.original;
        let objednatelName = '---';
        let garantName = '---';

        // Získej jméno objednatele
        if (order.objednatel_uzivatel) {
          if (order.objednatel_uzivatel.cele_jmeno) {
            objednatelName = order.objednatel_uzivatel.cele_jmeno;
          } else {
            objednatelName = getUserDisplayName(null, order.objednatel_uzivatel);
          }
        } else if (order.objednatel) {
          const obj = order.objednatel;
          if (obj.cele_jmeno) {
            objednatelName = obj.cele_jmeno;
          } else if (obj.jmeno && obj.prijmeni) {
            const titul_pred_str = obj.titul_pred ? obj.titul_pred + ' ' : '';
            const titul_za_str = obj.titul_za ? ', ' + obj.titul_za : '';
            objednatelName = `${titul_pred_str}${obj.jmeno} ${obj.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
          } else if (obj.username) {
            objednatelName = obj.username;
          }
        } else if (order.objednatel_id) {
          objednatelName = getUserDisplayName(order.objednatel_id);
        }

        // Získej jméno garanta
        if (order.garant_uzivatel) {
          if (order.garant_uzivatel.cele_jmeno) {
            garantName = order.garant_uzivatel.cele_jmeno;
          } else {
            garantName = getUserDisplayName(null, order.garant_uzivatel);
          }
        } else if (order.garant) {
          const gar = order.garant;
          if (gar.cele_jmeno) {
            garantName = gar.cele_jmeno;
          } else if (gar.jmeno && gar.prijmeni) {
            const titul_pred_str = gar.titul_pred ? gar.titul_pred + ' ' : '';
            const titul_za_str = gar.titul_za ? ', ' + gar.titul_za : '';
            garantName = `${titul_pred_str}${gar.jmeno} ${gar.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
          } else if (gar.username) {
            garantName = gar.username;
          }
        } else if (order.garant_uzivatel_id) {
          garantName = getUserDisplayName(order.garant_uzivatel_id);
        }

        // Získej aktuální filtr pro tento sloupec
        const columnFilter = columnFilters['objednatel_garant'] || '';
        const searchTerm = columnFilter || globalFilter;

        return (
          <div style={{ lineHeight: '1.3' }} title={`Objednatel: ${objednatelName}\nGarant: ${garantName}`}>
            <div style={{ fontWeight: 500 }}>
              {searchTerm ? highlightText(objednatelName, searchTerm) : objednatelName}
            </div>
            <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
              {searchTerm ? highlightText(garantName, searchTerm) : garantName}
            </div>
          </div>
        );
      },
      size: 130
    },
    {
      accessorKey: 'prikazce_schvalovatel',
      header: 'Příkazce / Schvalovatel',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const getPrikazceName = (order) => {
          if (order.prikazce_uzivatel) {
            return getUserDisplayName(null, order.prikazce_uzivatel);
          }
          if (order.prikazce) {
            const pri = order.prikazce;
            if (pri.jmeno && pri.prijmeni) {
              const titul_pred_str = pri.titul_pred ? pri.titul_pred + ' ' : '';
              const titul_za_str = pri.titul_za ? ', ' + pri.titul_za : '';
              return `${titul_pred_str}${pri.jmeno} ${pri.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
            }
            if (pri.username) {
              return pri.username;
            }
            if (pri.cele_jmeno) {
              return pri.cele_jmeno;
            }
          }
          if (order.prikazce_id) {
            return getUserDisplayName(order.prikazce_id);
          }
          return '---';
        };

        const nameA = getPrikazceName(rowA.original);
        const nameB = getPrikazceName(rowB.original);

        // České třídění jmen (--- na konec)
        if (nameA === '---' && nameB === '---') return 0;
        if (nameA === '---') return 1;
        if (nameB === '---') return -1;

        return nameA.localeCompare(nameB, 'cs', { sensitivity: 'base' });
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const order = row.original;
        let prikazceName = '---';
        let schvalovatelName = '---';

        // Získej jméno příkazce
        if (order.prikazce_uzivatel) {
          prikazceName = getUserDisplayName(null, order.prikazce_uzivatel);
        } else if (order.prikazce) {
          const pri = order.prikazce;
          if (pri.jmeno && pri.prijmeni) {
            const titul_pred_str = pri.titul_pred ? pri.titul_pred + ' ' : '';
            const titul_za_str = pri.titul_za ? ', ' + pri.titul_za : '';
            prikazceName = `${titul_pred_str}${pri.jmeno} ${pri.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
          } else if (pri.username) {
            prikazceName = pri.username;
          } else if (pri.cele_jmeno) {
            prikazceName = pri.cele_jmeno;
          }
        } else if (order.prikazce_id) {
          prikazceName = getUserDisplayName(order.prikazce_id);
        }

        // Získej jméno schvalovatele
        if (order.schvalovatel_uzivatel) {
          schvalovatelName = getUserDisplayName(null, order.schvalovatel_uzivatel);
        } else if (order.schvalovatel) {
          const sch = order.schvalovatel;
          if (sch.jmeno && sch.prijmeni) {
            const titul_pred_str = sch.titul_pred ? sch.titul_pred + ' ' : '';
            const titul_za_str = sch.titul_za ? ', ' + sch.titul_za : '';
            schvalovatelName = `${titul_pred_str}${sch.jmeno} ${sch.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
          } else if (sch.username) {
            schvalovatelName = sch.username;
          } else if (sch.cele_jmeno) {
            schvalovatelName = sch.cele_jmeno;
          }
        } else if (order.schvalovatel_id) {
          schvalovatelName = getUserDisplayName(order.schvalovatel_id);
        }

        // Filtruj podle obou jmen (OR podmínka)
        const normalizedPrikazce = removeDiacritics(prikazceName.toLowerCase());
        const normalizedSchvalovatel = removeDiacritics(schvalovatelName.toLowerCase());
        const normalizedFilter = removeDiacritics(filterValue.toLowerCase());

        return normalizedPrikazce.includes(normalizedFilter) || normalizedSchvalovatel.includes(normalizedFilter);
      },
      cell: ({ row, table }) => {
        const order = row.original;
        let prikazceName = '---';
        let schvalovatelName = '---';

        // Získej jméno příkazce
        if (order.prikazce_uzivatel) {
          prikazceName = getUserDisplayName(null, order.prikazce_uzivatel);
        } else if (order.prikazce) {
          const pri = order.prikazce;
          if (pri.jmeno && pri.prijmeni) {
            const titul_pred_str = pri.titul_pred ? pri.titul_pred + ' ' : '';
            const titul_za_str = pri.titul_za ? ', ' + pri.titul_za : '';
            prikazceName = `${titul_pred_str}${pri.jmeno} ${pri.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
          } else if (pri.username) {
            prikazceName = pri.username;
          } else if (pri.cele_jmeno) {
            prikazceName = pri.cele_jmeno;
          }
        } else if (order.prikazce_id) {
          prikazceName = getUserDisplayName(order.prikazce_id);
        }

        // Získej jméno schvalovatele
        if (order.schvalovatel_uzivatel) {
          schvalovatelName = getUserDisplayName(null, order.schvalovatel_uzivatel);
        } else if (order.schvalovatel) {
          const sch = order.schvalovatel;
          if (sch.jmeno && sch.prijmeni) {
            const titul_pred_str = sch.titul_pred ? sch.titul_pred + ' ' : '';
            const titul_za_str = sch.titul_za ? ', ' + sch.titul_za : '';
            schvalovatelName = `${titul_pred_str}${sch.jmeno} ${sch.prijmeni}${titul_za_str}`.replace(/\s+/g, ' ').trim();
          } else if (sch.username) {
            schvalovatelName = sch.username;
          } else if (sch.cele_jmeno) {
            schvalovatelName = sch.cele_jmeno;
          }
        } else if (order.schvalovatel_id) {
          schvalovatelName = getUserDisplayName(order.schvalovatel_id);
        }

        // Získej aktuální filtr pro tento sloupec
        const columnFilter = columnFilters['prikazce_schvalovatel'] || '';
        const searchTerm = columnFilter || globalFilter;

        return (
          <div style={{ lineHeight: '1.3' }} title={`Příkazce: ${prikazceName}\nSchvalovatel: ${schvalovatelName}`}>
            <div style={{ fontWeight: 500 }}>
              {searchTerm ? highlightText(prikazceName, searchTerm) : prikazceName}
            </div>
            <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
              {searchTerm ? highlightText(schvalovatelName, searchTerm) : schvalovatelName}
            </div>
          </div>
        );
      },
      size: 130
    },
    {
      accessorKey: 'dodavatel_nazev',
      header: 'Dodavatel',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const nameA = rowA.original.dodavatel_nazev || '---';
        const nameB = rowB.original.dodavatel_nazev || '---';

        // České třídění názvů (--- na konec)
        if (nameA === '---' && nameB === '---') return 0;
        if (nameA === '---') return 1;
        if (nameB === '---') return -1;

        return nameA.localeCompare(nameB, 'cs', { sensitivity: 'base' });
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const order = row.original;

        // Vyhledávej v názvu, IČO, adrese, emailu, telefonu, kontaktní osobě
        const searchableText = [
          order.dodavatel_nazev || '',
          order.dodavatel_ico || '',
          order.dodavatel_ulice || '',
          order.dodavatel_mesto || '',
          order.dodavatel_psc || '',
          order.dodavatel_kontakt_email || '',
          order.dodavatel_kontakt_telefon || '',
          order.dodavatel_kontakt_jmeno || ''
        ].join(' ').toLowerCase();

        const normalizedText = removeDiacritics(searchableText);
        const normalizedFilter = removeDiacritics(filterValue.toLowerCase());

        return normalizedText.includes(normalizedFilter);
      },
      cell: ({ row }) => {
        const order = row.original;

        if (!order.dodavatel_nazev) {
          return <div style={{ color: '#9ca3af' }}>---</div>;
        }

        // Sestavení kontaktů (email | telefon)
        const kontakty = [];
        if (order.dodavatel_kontakt_email) kontakty.push(order.dodavatel_kontakt_email);
        if (order.dodavatel_kontakt_telefon) kontakty.push(order.dodavatel_kontakt_telefon);
        const kontaktText = kontakty.join(' | ');

        // Adresa dodavatele
        const adresaText = order.dodavatel_adresa || '';

        return (
          <div style={{ lineHeight: '1.4' }}>
            {/* Řádek 1: Název dodavatele */}
            <div style={{ fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {highlightTextWithFilters(order.dodavatel_nazev, 'dodavatel_nazev')}
            </div>
            {/* Řádek 2: Adresa (menší písmo) */}
            {adresaText && (
              <div style={{ fontSize: '0.85em', color: '#6b7280', wordBreak: 'break-word' }}>
                {highlightTextWithFilters(adresaText, 'dodavatel_nazev')}
              </div>
            )}
            {/* Řádek 3: IČO (menší písmo) */}
            {order.dodavatel_ico && (
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                IČO: {highlightTextWithFilters(order.dodavatel_ico, 'dodavatel_nazev')}
              </div>
            )}
            {/* Řádek 4: Email | Telefon */}
            {kontaktText && (
              <div style={{ fontSize: '0.85em', color: '#6b7280', wordBreak: 'break-all' }}>
                {highlightTextWithFilters(kontaktText, 'dodavatel_nazev')}
              </div>
            )}
          </div>
        );
      },
      size: 160
    },
    {
      accessorKey: 'stav_objednavky',
      header: 'Stav',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const getStatusText = (order) => {
          const displayStatus = getOrderDisplayStatus(order);

          if (order.isDraft || order.je_koncept) {
            return 'Nova / koncept';
          }
          if (order.stav_workflow) {
            if (typeof order.stav_workflow === 'object') {
              if (order.stav_workflow.nazev_stavu) {
                return order.stav_workflow.nazev_stavu;
              }
              if (order.stav_workflow.nazev) {
                return order.stav_workflow.nazev;
              }
              return 'Neznámý stav';
            }
            return order.stav_workflow?.nazev_stavu || order.stav_workflow?.nazev || String(order.stav_workflow) || 'Neznámý stav';
          }

          return displayStatus;
        };

        const statusA = getStatusText(rowA.original);
        const statusB = getStatusText(rowB.original);

        // České třídění stavů (prázdné na konec)
        if (!statusA && !statusB) return 0;
        if (!statusA) return 1;
        if (!statusB) return -1;

        return statusA.localeCompare(statusB, 'cs', { sensitivity: 'base' });
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const order = row.original;
        const displayStatus = getOrderDisplayStatus(order);
        let statusText = displayStatus;

        // Stejná logika jako v sortingFn - získej zobrazovaný text
        if (order.isDraft || order.je_koncept) {
          statusText = 'Nova / koncept';
        } else if (order.stav_workflow) {
          if (typeof order.stav_workflow === 'object') {
            if (order.stav_workflow.nazev_stavu) {
              statusText = order.stav_workflow.nazev_stavu;
            } else if (order.stav_workflow.nazev) {
              statusText = order.stav_workflow.nazev;
            } else {
              statusText = 'Neznámý stav';
            }
          } else {
            statusText = order.stav_workflow?.nazev_stavu || order.stav_workflow?.nazev || String(order.stav_workflow) || 'Neznámý stav';
          }
        }

        // Case-insensitive a bez diakritiky
        const normalizedText = removeDiacritics(statusText.toLowerCase());
        const normalizedFilter = removeDiacritics(filterValue.toLowerCase());

        return normalizedText.includes(normalizedFilter);
      },
      cell: ({ row }) => {
        const order = row.original;
        const statusCode = getOrderSystemStatus(order);
        const displayStatus = getOrderDisplayStatus(order);

        // Použijeme displayStatus (uživatelsky přívětivý) pro zobrazení
        let statusText = displayStatus;

        // Speciální zobrazení pro koncepty
        if (order.isDraft || order.je_koncept) {
          statusText = 'Nova / koncept';
        }
        else if (order.stav_workflow) {
          // Order V2 API enriched může vracet stav_workflow objekt nebo string
          if (typeof order.stav_workflow === 'object') {
            // Použij nazev_stavu pokud je k dispozici
            if (order.stav_workflow.nazev_stavu) {
              statusText = order.stav_workflow.nazev_stavu;
            } else if (order.stav_workflow.nazev) {
              statusText = order.stav_workflow.nazev;
            } else {
              statusText = 'Neznámý stav';
            }
          } else {
            // Pro string nebo jiné primitivní hodnoty
            statusText = order.stav_workflow?.nazev_stavu || order.stav_workflow?.nazev || String(order.stav_workflow) || 'Neznámý stav';
          }
        }

        return (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            width: '100%'
          }}>
            <StatusBadge
              $status={statusCode}
              $isInEditRow={row.original.isDraft || row.original.hasLocalDraftChanges || false}
            >
              <FontAwesomeIcon
                icon={
                  statusCode === 'NOVA' ? faFilePen :
                  statusCode === 'KE_SCHVALENI' ? faClock :
                  statusCode === 'SCHVALENA' ? faShield :
                  statusCode === 'POTVRZENA' ? faCheckCircle :
                  statusCode === 'ZKONTROLOVANA' ? faCheckCircle :
                  statusCode === 'CEKA_SE' ? faHourglassHalf :
                  statusCode === 'K_UVEREJNENI_DO_REGISTRU' ? faFileContract :
                  statusCode === 'UVEREJNENA' ? faFileContract :
                  statusCode === 'DOKONCENA' ? faTruck :
                  statusCode === 'ZRUSENA' ? faXmark :
                  faCircleNotch
                }
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                  fontSize: '12px'
                }}
              />
              <span style={{ lineHeight: '1.2' }}>{statusText}</span>
            </StatusBadge>
          </div>
        );
      },
      size: 120
    },
    {
      accessorKey: 'stav_registru',
      header: 'Stav registru',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const getRegistrStav = (order) => {
          const registr = order.registr_smluv;
          const workflowStatus = getOrderWorkflowStatus(order);

          if (registr) {
            if (registr.dt_zverejneni && registr.registr_iddt) {
              return 'Zveřejněno';
            }
            if (workflowStatus === 'UVEREJNIT' || registr.zverejnit === 'ANO') {
              return 'Má být zveřejněno';
            }
          }
          if (workflowStatus === 'UVEREJNIT') {
            return 'Má být zveřejněno';
          }

          return ''; // prázdné
        };

        const stavA = getRegistrStav(rowA.original);
        const stavB = getRegistrStav(rowB.original);

        // Prázdné hodnoty nejprve, pak třídění podle názvu
        if (!stavA && !stavB) return 0;
        if (!stavA) return -1; // prázdné nahoru
        if (!stavB) return 1;

        return stavA.localeCompare(stavB, 'cs', { sensitivity: 'base' });
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const order = row.original;
        const registr = order.registr_smluv;
        const workflowStatus = getOrderWorkflowStatus(order);
        let stavText = '';

        // Stejná logika jako v sortingFn - získej zobrazovaný text
        if (registr) {
          if (registr.dt_zverejneni && registr.registr_iddt) {
            stavText = 'Zveřejněno';
          } else if (workflowStatus === 'UVEREJNIT' || registr.zverejnit === 'ANO') {
            stavText = 'Má být zveřejněno';
          }
        } else if (workflowStatus === 'UVEREJNIT') {
          stavText = 'Má být zveřejněno';
        }

        // Pokud je prázdný, prohledávej i "---" (pro případ, že uživatel zadá ---)
        if (!stavText) {
          const normalizedFilter = removeDiacritics(filterValue.toLowerCase());
          return normalizedFilter === '---' || normalizedFilter === '';
        }

        // Case-insensitive a bez diakritiky
        const normalizedText = removeDiacritics(stavText.toLowerCase());
        const normalizedFilter = removeDiacritics(filterValue.toLowerCase());

        return normalizedText.includes(normalizedFilter);
      },
      cell: ({ row }) => {
        const order = row.original;
        const registr = order.registr_smluv;
        const workflowStatus = getOrderWorkflowStatus(order);

        let stavText = '';
        let stavIcon = null;
        let statusCode = 'EMPTY'; // Pro prázdný stav

        // Logika podle BE struktury + workflow stavu:
        // 1. Pokud existuje dt_zverejneni A registr_iddt -> "Zveřejněno"
        // 2. Pokud je workflow stav UVEREJNIT NEBO zverejnit: "ANO" -> "Má být zveřejněno"
        // 3. Jinak -> prázdné

        if (registr) {
          // 1. Zveřejněno - má vyplněné oboje dt_zverejneni I registr_iddt
          if (registr.dt_zverejneni && registr.registr_iddt) {
            stavText = 'Zveřejněno';
            stavIcon = faCheckCircle;
            statusCode = 'UVEREJNENA'; // Použij status code pro zelené téma
          }
          // 2. Má být zveřejněno - workflow stav UVEREJNIT NEBO má zaškrtnuté zverejnit: 'ANO'
          else if (workflowStatus === 'UVEREJNIT' || registr.zverejnit === 'ANO') {
            stavText = 'Má být zveřejněno';
            stavIcon = faClock;
            statusCode = 'KE_SCHVALENI'; // Použij status code pro oranžové téma
          }
        }
        // Zkontroluj i případ, kdy registr_smluv neexistuje, ale stav je UVEREJNIT
        else if (workflowStatus === 'UVEREJNIT') {
          stavText = 'Má být zveřejněno';
          stavIcon = faClock;
          statusCode = 'KE_SCHVALENI';
        }

        // Pokud nemáme žádný stav, vrať ---
        if (!stavText) {
          return (
            <div style={{
              textAlign: 'left',
              color: '#94a3b8',
              fontSize: '0.9em'
            }}>
              ---
            </div>
          );
        }

        return (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            width: '100%'
          }}>
            <StatusBadge
              $status={statusCode}
              $isInEditRow={false}
              title={registr?.registr_iddt || ''}
            >
              <FontAwesomeIcon
                icon={stavIcon}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                  fontSize: '12px'
                }}
              />
              <span style={{ lineHeight: '1.2' }}>{stavText}</span>
            </StatusBadge>
          </div>
        );
      },
      size: 120
    },
    {
      accessorKey: 'max_cena_s_dph',
      header: 'Max. cena s DPH',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const priceA = parseFloat(rowA.original.max_cena_s_dph || 0);
        const priceB = parseFloat(rowB.original.max_cena_s_dph || 0);

        // Numerické třídění (0 nebo NaN na konec)
        const validA = !isNaN(priceA) && priceA > 0 ? priceA : -Infinity;
        const validB = !isNaN(priceB) && priceB > 0 ? priceB : -Infinity;

        return validA - validB;
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const price = parseFloat(row.original.max_cena_s_dph || 0);
        const filterTrimmed = filterValue.trim();

        // Podpora pro porovnávací operátory: =10000, <10000, >10000
        if (filterTrimmed.match(/^[=<>]/)) {
          const operator = filterTrimmed[0];
          // Odstranit mezery, carky a dalsi non-numeric znaky krome tecky
          const valueStr = filterTrimmed.substring(1).trim().replace(/\s/g, '').replace(/,/g, '');
          const compareValue = parseFloat(valueStr);

          // Platné číslo pro porovnání (včetně 0)
          if (!isNaN(compareValue) && !isNaN(price)) {
            if (operator === '=') return Math.abs(price - compareValue) < 0.01; // Rovnost s tolerancí
            if (operator === '<') return price < compareValue;
            if (operator === '>') return price > compareValue;
          }
          return false;
        }

        // Běžné vyhledávání v textu
        if (!isNaN(price)) {
          if (price > 0) {
            // Formátuj cenu jako string pro vyhledávání
            const priceText = price.toLocaleString('cs-CZ');

            // Case-insensitive (čísla bez diakritiky)
            const normalizedText = priceText.toLowerCase();
            const normalizedFilter = filterValue.toLowerCase();

            return normalizedText.includes(normalizedFilter);
          } else {
            // Cena je 0 - hledej "0" nebo "---"
            return filterValue === '0' || filterValue === '---' || filterValue === '';
          }
        }

        // Pokud nemá cenu, hledej "---"
        return filterValue === '---' || filterValue === '';
      },
      cell: ({ row }) => {
        const maxPrice = parseFloat(row.original.max_cena_s_dph || 0);
        const fakturaPrice = parseFloat(row.original.faktury_celkova_castka_s_dph || 0);
        
        // Pokud faktura překračuje max cenu, zobraz červeně
        const isOverLimit = fakturaPrice > 0 && maxPrice > 0 && fakturaPrice > maxPrice;
        
        return (
          <div style={{ 
            textAlign: 'right', 
            fontWeight: 600, 
            fontFamily: 'monospace', 
            whiteSpace: 'nowrap',
            color: isOverLimit ? '#dc2626' : 'inherit'
          }}>
            {!isNaN(maxPrice) && maxPrice > 0 ? <>{maxPrice.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;Kč</> : '---'}
          </div>
        );
      },
      minSize: 85,
      size: 100,
      maxSize: 130,
      enableResizing: true
    },
    {
      accessorKey: 'cena_s_dph',
      header: 'Cena s DPH',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const priceA = getOrderTotalPriceWithDPH(rowA.original);
        const priceB = getOrderTotalPriceWithDPH(rowB.original);

        // Numerické třídění (0 nebo NaN na konec)
        const validA = !isNaN(priceA) && priceA > 0 ? priceA : -Infinity;
        const validB = !isNaN(priceB) && priceB > 0 ? priceB : -Infinity;

        return validA - validB;
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const price = getOrderTotalPriceWithDPH(row.original);
        const filterTrimmed = filterValue.trim();

        // Podpora pro porovnávací operátory: =10000, <10000, >10000
        if (filterTrimmed.match(/^[=<>]/)) {
          const operator = filterTrimmed[0];
          // Odstranit mezery, čárky a další non-numeric znaky kromě tečky
          const valueStr = filterTrimmed.substring(1).trim().replace(/\s/g, '').replace(/,/g, '');
          const compareValue = parseFloat(valueStr);

          // Platné číslo pro porovnání (včetně 0)
          if (!isNaN(compareValue) && !isNaN(price)) {
            if (operator === '=') return Math.abs(price - compareValue) < 0.01; // Rovnost s tolerancí
            if (operator === '<') return price < compareValue;
            if (operator === '>') return price > compareValue;
          }
          return false;
        }

        // Běžné vyhledávání v textu
        if (!isNaN(price)) {
          if (price > 0) {
            // Formátuj cenu jako string pro vyhledávání
            const priceText = price.toLocaleString('cs-CZ');

            // Case-insensitive (čísla bez diakritiky)
            const normalizedText = priceText.toLowerCase();
            const normalizedFilter = filterValue.toLowerCase();

            return normalizedText.includes(normalizedFilter);
          } else {
            // Cena je 0 - hledej "0" nebo "---"
            return filterValue === '0' || filterValue === '---' || filterValue === '';
          }
        }

        // Pokud nemá cenu, hledej "---"
        return filterValue === '---' || filterValue === '';
      },
      cell: ({ row }) => {
        //  Zobraz pouze cenu z položek objednávky (ne max_cena_s_dph!)
        let price = 0;
        
        // 1. PRIORITA: Položky - vypočítaná cena z položek
        if (row.original.polozky_celkova_cena_s_dph != null && row.original.polozky_celkova_cena_s_dph !== '') {
          const value = parseFloat(row.original.polozky_celkova_cena_s_dph);
          if (!isNaN(value) && value > 0) price = value;
        } else if (row.original.polozky && Array.isArray(row.original.polozky) && row.original.polozky.length > 0) {
          // Spočítej z položek jako fallback
          price = row.original.polozky.reduce((sum, item) => {
            const cena = parseFloat(item.cena_s_dph || 0);
            return sum + (isNaN(cena) ? 0 : cena);
          }, 0);
        }
        
        return (
          <div style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {!isNaN(price) && price > 0 ? <>{price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;Kč</> : '---'}
          </div>
        );
      },
      minSize: 85,
      size: 100,
      maxSize: 130,
      enableResizing: true
    },
    {
      accessorKey: 'faktury_celkova_castka_s_dph',
      header: 'Cena FA s DPH',
      sortingFn: withDraftPriority((rowA, rowB) => {
        const priceA = parseFloat(rowA.original.faktury_celkova_castka_s_dph || 0);
        const priceB = parseFloat(rowB.original.faktury_celkova_castka_s_dph || 0);

        // Numerické třídění (0 nebo NaN na konec)
        const validA = !isNaN(priceA) && priceA > 0 ? priceA : -Infinity;
        const validB = !isNaN(priceB) && priceB > 0 ? priceB : -Infinity;

        return validA - validB;
      }),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const price = parseFloat(row.original.faktury_celkova_castka_s_dph || 0);
        const filterTrimmed = filterValue.trim();

        // Podpora pro porovnávací operátory: =10000, <10000, >10000
        if (filterTrimmed.match(/^[=<>]/)) {
          const operator = filterTrimmed[0];
          const valueStr = filterTrimmed.substring(1).trim().replace(/\s/g, '').replace(/,/g, '');
          const compareValue = parseFloat(valueStr);

          if (!isNaN(compareValue) && !isNaN(price)) {
            if (operator === '=') return Math.abs(price - compareValue) < 0.01;
            if (operator === '<') return price < compareValue;
            if (operator === '>') return price > compareValue;
          }
          return false;
        }

        // Běžné vyhledávání v textu
        if (!isNaN(price)) {
          if (price > 0) {
            const priceText = price.toLocaleString('cs-CZ');
            const normalizedText = priceText.toLowerCase();
            const normalizedFilter = filterValue.toLowerCase();
            return normalizedText.includes(normalizedFilter);
          } else {
            return filterValue === '0' || filterValue === '---' || filterValue === '';
          }
        }

        return filterValue === '---' || filterValue === '';
      },
      cell: ({ row }) => {
        const price = parseFloat(row.original.faktury_celkova_castka_s_dph || 0);
        return (
          <div style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap', color: '#059669' }}>
            {!isNaN(price) && price > 0 ? <>{price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;Kč</> : '---'}
          </div>
        );
      },
      minSize: 85,
      size: 100,
      maxSize: 130,
      enableResizing: true
    },
    {
      id: 'actions',
      header: () => (
        <div style={{
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
        }}>
          <FontAwesomeIcon
            icon={faBolt}
            style={{
              color: '#eab308',
              fontSize: '16px'
            }}
          />
        </div>
      ),
      cell: ({ row }) => {
        // 🔥 PERFORMANCE: Use refs to avoid columns re-render when pagination changes
        const orderIndex = row.index; // LOCAL index in current page
        const orderId = row.original.id; // Actual order ID from database
        // 🔧 Backend VŽDY posílá aktivni jako integer 0 nebo 1 (nikdy string nebo boolean)
        const isInactive = row.original.aktivni === 0;
        return (
          <ActionMenu onClick={handleActionClick}>
            {/* 1⃣ EDIT */}
            <ActionMenuButton
              className="edit"
              data-action="edit"
              data-order-index={orderIndex}
              data-order-id={orderId}
              data-disabled={isInactive || !canEdit(row.original) ? 'true' : undefined}
              $disabled={isInactive || !canEdit(row.original)}
              title={
                isInactive
                  ? "Neaktivní objednávka - nelze editovat"
                  : row.original.isDraft
                  ? "Vrátit se ke konceptu objednávky"
                  : row.original.hasLocalDraftChanges
                    ? "Pokračovat v editaci"
                    : "Editovat"
              }
            >
              <FontAwesomeIcon icon={faEdit} />
            </ActionMenuButton>
            {/* 2⃣ EVIDOVAT FAKTURU */}
            <ActionMenuButton
              className="create-invoice"
              data-action="create-invoice"
              data-order-index={orderIndex}
              data-order-id={orderId}
              data-disabled={isInactive || row.original.hasLocalDraftChanges || !canCreateInvoice(row.original) ? 'true' : undefined}
              $disabled={isInactive || row.original.hasLocalDraftChanges || !canCreateInvoice(row.original)}
              title={
                isInactive
                  ? "Neaktivní objednávka - nelze evidovat fakturu"
                  : row.original.hasLocalDraftChanges 
                  ? 'Objednávka je právě otevřená na formuláři - zavřete ji pro evidování faktury' 
                  : (!canCreateInvoice(row.original) 
                    ? 'Evidování faktury je dostupné pouze ve stavech: Fakturace, Věcná správnost, Zkontrolována (ne v Dokončená)' 
                    : 'Evidovat fakturu k této objednávce')
              }
            >
              <FontAwesomeIcon icon={faFileInvoice} />
              {/* Badge s počtem faktur */}
              {row.original.faktury_count > 0 && (
                <InvoiceCountBadge>
                  {row.original.faktury_count}
                </InvoiceCountBadge>
              )}
            </ActionMenuButton>
            {/* 3⃣ GENEROVAT DOCX */}
            <ActionMenuButton
              className="export-document"
              data-action="export"
              data-order-index={orderIndex}
              data-order-id={orderId}
              data-disabled={isInactive || row.original.hasLocalDraftChanges || !canExportDocument(row.original) ? 'true' : undefined}
              $disabled={isInactive || row.original.hasLocalDraftChanges || !canExportDocument(row.original)}
              title={
                isInactive
                  ? "Neaktivní objednávka - nelze generovat DOCX"
                  : row.original.hasLocalDraftChanges 
                  ? 'Objednávka je právě otevřená na formuláři - zavřete ji pro generování DOCX' 
                  : (!canExportDocument(row.original) 
                    ? 'Generování DOCX je dostupné pouze pro objednávky od stavu ROZPRACOVANÁ' 
                    : 'Generovat DOCX')
              }
            >
              <FontAwesomeIcon icon={faFileWord} />
            </ActionMenuButton>
            {/* 4⃣ FINANČNÍ KONTROLA */}
            <ActionMenuButton
              className="financial-control"
              data-action="financial-control"
              data-order-index={orderIndex}
              data-order-id={orderId}
              data-disabled={isInactive || getOrderSystemStatus(row.original) !== 'DOKONCENA' ? 'true' : undefined}
              $disabled={isInactive || getOrderSystemStatus(row.original) !== 'DOKONCENA'}
              title={
                isInactive
                  ? "Neaktivní objednávka - nelze generovat finanční kontrolu"
                  : getOrderSystemStatus(row.original) !== 'DOKONCENA' 
                  ? 'Finanční kontrola je dostupná pouze pro objednávky ve stavu DOKONČENA'
                  : 'Generovat finanční kontrolu (PDF/tisk)'
              }
            >
              <FontAwesomeIcon icon={faListCheck} />
            </ActionMenuButton>
            {/* 5⃣ SMAZAT/OBNOVIT - VŽDY AKTIVNÍ (i pro neaktivní objednávky) */}
            {canDelete(row.original) && (
              <ActionMenuButton
                className="delete"
                data-action="delete"
                data-order-index={orderIndex}
                data-order-id={orderId}
                $disabled={false}
                title={isInactive && isAdmin ? "Obnovit nebo úplně smazat neaktivní objednávku" : "Smazat objednávku"}
              >
                <FontAwesomeIcon icon={faTrash} />
              </ActionMenuButton>
            )}
          </ActionMenu>
        );
      },
      size: 100,
      minSize: 100,
      maxSize: 120
    }
  ], [getOrderDate, getOrderWorkflowStatus, getOrderSystemStatus, globalFilter, highlightText, handleActionClick, getUserDisplayName, hasPermission, columnFilters]);
  // 🔥 CRITICAL: Removed currentPageIndex, pageSize from deps
  // orderIndex is calculated inside cell renderer, doesn't need to be in deps
  // handleActionClick has stable reference (no deps) - won't cause re-render
  // Removed 'users' dependency - uses usersRef.current via getUserDisplayName instead
  // This prevents entire table re-render when users object changes (loadData)
  // Added hasPermission to deps for conditional rendering of delete icon

  // 🔍 FUNKCE PRO ZVÝRAZNĚNÍ VYHLEDÁVANÉHO TEXTU V PODŘÁDCÍCH
  const highlightSearchText = useCallback((text, searchTerm) => {
    if (!text || !searchTerm || typeof text !== 'string') return text;

    const normalizedText = String(text);
    const normalizedSearch = removeDiacritics(searchTerm.toLowerCase());

    if (!normalizedSearch) return normalizedText;

    // Najdi všechny výskyty vyhledávaného textu (bez diakritiky)
    const textLower = removeDiacritics(normalizedText.toLowerCase());
    const parts = [];
    let lastIndex = 0;
    let index = textLower.indexOf(normalizedSearch);

    while (index !== -1) {
      // Přidej text před nalezeným výskytem
      if (index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {normalizedText.substring(lastIndex, index)}
          </span>
        );
      }

      // Přidej zvýrazněný text
      parts.push(
        <mark
          key={`highlight-${index}`}
          style={{
            backgroundColor: '#fef08a',
            color: '#854d0e',
            fontWeight: 600,
            padding: '1px 2px',
            borderRadius: '2px',
            boxShadow: '0 0 0 1px rgba(133, 77, 14, 0.1)'
          }}
        >
          {normalizedText.substring(index, index + normalizedSearch.length)}
        </mark>
      );

      lastIndex = index + normalizedSearch.length;
      index = textLower.indexOf(normalizedSearch, lastIndex);
    }

    // Přidej zbytek textu
    if (lastIndex < normalizedText.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {normalizedText.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? <>{parts}</> : normalizedText;
  }, []);

  // Get unique users for dropdowns from current orders data

  // ✨ REFACTORED: Filter function - rozděleno do modulárních funkcí
  const filteredData = useMemo(() => {
    const filtered = orders.filter(order => {
      
      // 1. "Jen moje" filtr  
      if (!filterMyOrders(order, showOnlyMyOrders, userDetail, currentUserId)) {
        return false;
      }

      // 2a. Sloupcové filtry z hlavičky tabulky (textové)
      if (!applyColumnFilters(order, columnFilters, getOrderDate, getOrderDisplayStatus, getUserDisplayName)) {
        return false;
      }

      // 2b. Multiselect filtry z rozšířeného panelu (ID)
      if (!applyColumnFilters(order, multiselectFilters, getOrderDate, getOrderDisplayStatus, getUserDisplayName)) {
        return false;
      }

      // 3. Globální vyhledávání
      if (!filterByGlobalSearch(order, globalFilter, getUserDisplayName, getOrderDisplayStatus)) {
        return false;
      }

      // 4. Filtr podle statusu (pole stavů)
      if (!filterByStatusArray(order, statusFilter, getOrderSystemStatus)) {
        return false;
      }

      // 4.5. Filtr podle schvalování
      if (approvalFilter.length > 0) {
        let workflowStates = [];
        try {
          if (Array.isArray(order.stav_workflow_kod)) {
            workflowStates = order.stav_workflow_kod;
          } else if (typeof order.stav_workflow_kod === 'string') {
            workflowStates = JSON.parse(order.stav_workflow_kod);
          }
        } catch (e) {
          workflowStates = [];
        }
        
        const lastState = workflowStates.length > 0 
          ? (typeof workflowStates[workflowStates.length - 1] === 'string' 
              ? workflowStates[workflowStates.length - 1] 
              : (workflowStates[workflowStates.length - 1].kod_stavu || workflowStates[workflowStates.length - 1].nazev_stavu || '')
            ).toUpperCase()
          : '';
        
        const pendingStates = ['ODESLANA_KE_SCHVALENI', 'CEKA_SE'];
        const approvedStates = ['SCHVALENA', 'ZAMITNUTA'];
        
        const isPending = pendingStates.includes(lastState);
        const isApproved = approvedStates.includes(lastState);
        
        const showPending = approvalFilter.includes('pending');
        const showApproved = approvalFilter.includes('approved');
        
        // Pokud má filtr pending a objednávka není pending, skip
        if (showPending && !isPending && !(showApproved && isApproved)) {
          return false;
        }
        
        // Pokud má filtr approved a objednávka není approved, skip
        if (showApproved && !isApproved && !(showPending && isPending)) {
          return false;
        }
        
        // Pokud objednávka není ani pending ani approved, skip
        if (!isPending && !isApproved) {
          return false;
        }
      }

      // 5. ❌ ODSTRANĚNO: Filtr archivovaných - už jsou vyfiltrované společnou funkcí filterOrders()!
      // if (!filterByArchived(order, showArchived, getOrderSystemStatus)) return false;

      // 6. Filtr podle uživatele
      if (!filterByUser(order, userFilter)) {
        return false;
      }

      // 7. Filtr podle datového rozmezí
      if (!filterByDateRange(order, dateFromFilter, dateToFilter, getOrderDate)) {
        return false;
      }

      // 8. Filtr podle částky
      if (!filterByAmountRange(order, amountFromFilter, amountToFilter)) {
        return false;
      }

      // 9. Filtr podle registru smluv
      if (!filterByRegistrStatus(order, filterMaBytZverejneno, filterByloZverejneno, getOrderWorkflowStatus)) {
        return false;
      }

      // 10. Filtr podle mimořádných objednávek
      if (filterMimoradneObjednavky) {
        if (!order.mimoradna_udalost) {
          return false;
        }
      }

      // 11. Filtr podle faktur (min. 1 faktura)
      if (filterWithInvoices) {
        const faktury = order.faktury || [];
        const fakturyCount = order.faktury_count || faktury.length || 0;
        if (fakturyCount === 0) {
          return false;
        }
      }

      // 12. Filtr podle příloh (min. 1 příloha)
      if (filterWithAttachments) {
        const prilohy = order.prilohy || [];
        const prilohyCount = order.prilohy_count || prilohy.length || 0;
        if (prilohyCount === 0) {
          return false;
        }
      }

      return true;
    });

    // 📌 SORTING: Koncepty (drafty) vždy jako první
    // Objednávky co nejsou ještě uložené v DB (isDraft nebo je_koncept) zobrazit jako první řádky
    const sortedFiltered = filtered.sort((a, b) => {
      const aIsDraft = a.isDraft || a.je_koncept || false;
      const bIsDraft = b.isDraft || b.je_koncept || false;
      
      // Pokud jedna je draft a druhá ne, draft je první
      if (aIsDraft && !bIsDraft) return -1;
      if (!aIsDraft && bIsDraft) return 1;
      
      // Jinak zachovat původní pořadí
      return 0;
    });

    return sortedFiltered;
  }, [
    orders,
    columnFilters,
    multiselectFilters,
    globalFilter,
    statusFilter,
    approvalFilter,
    userFilter,
    dateFromFilter,
    dateToFilter,
    amountFromFilter,
    amountToFilter,
    filterMaBytZverejneno,
    filterByloZverejneno,
    filterMimoradneObjednavky,
    filterWithInvoices,
    filterWithAttachments,
    getOrderDate,
    getUserDisplayName,
    getOrderDisplayStatus,
    getOrderSystemStatus,
    showArchived,
    showOnlyMyOrders,
    userDetail,
    currentUserId,
    getOrderWorkflowStatus
  ]);

  // 📊 FILTERED Stats - recalculate stats from filteredData when filters are active
  const filteredStats = useMemo(() => {
    // Check if any filter is active (except showArchived which is handled in orders)
    const hasActiveFilters = 
      globalFilter ||
      statusFilter.length > 0 ||
      userFilter.length > 0 ||
      dateFromFilter ||
      dateToFilter ||
      amountFromFilter ||
      amountToFilter ||
      filterMaBytZverejneno ||
      filterByloZverejneno ||
      filterMimoradneObjednavky ||
      filterWithInvoices ||
      filterWithAttachments ||
      showOnlyMyOrders ||
      Object.keys(columnFilters).length > 0 ||
      Object.keys(multiselectFilters).length > 0;

    // If no filters active, use base stats
    if (!hasActiveFilters) {
      return stats;
    }

    // Otherwise, recalculate from filteredData
    const dataToCount = filteredData;
    const total = dataToCount.length;
    
    const byStatus = dataToCount.reduce((acc, order) => {
      const systemStatus = getOrderSystemStatus(order);
      acc[systemStatus] = (acc[systemStatus] || 0) + 1;
      return acc;
    }, {});

    // 📄 Počítání objednávek s fakturami (min. 1 faktura)
    const withInvoices = dataToCount.reduce((count, order) => {
      const faktury = order.faktury || [];
      const fakturyCount = order.faktury_count || faktury.length || 0;
      return fakturyCount > 0 ? count + 1 : count;
    }, 0);

    // 📎 Počítání objednávek s přílohami (min. 1 příloha)
    const withAttachments = dataToCount.reduce((count, order) => {
      const prilohy = order.prilohy || [];
      const prilohyCount = order.prilohy_count || prilohy.length || 0;
      return prilohyCount > 0 ? count + 1 : count;
    }, 0);

    // ⚠ Počítání mimořádných událostí
    const mimoradneUdalosti = dataToCount.reduce((count, order) => {
      return order.mimoradna_udalost ? count + 1 : count;
    }, 0);

    return {
      total,
      nova: byStatus.NOVA || 0,
      ke_schvaleni: byStatus.ODESLANA_KE_SCHVALENI || 0,
      schvalena: byStatus.SCHVALENA || 0,
      zamitnuta: byStatus.ZAMITNUTA || 0,
      ceka_se: byStatus.CEKA_SE || 0,
      rozpracovana: byStatus.ROZPRACOVANA || 0,
      odeslana: byStatus.ODESLANA || 0,
      potvrzena: byStatus.POTVRZENA || 0,
      uverejnena: byStatus.UVEREJNENA || 0,
      fakturace: byStatus.FAKTURACE || 0,
      vecna_spravnost: byStatus.VECNA_SPRAVNOST || 0,
      dokoncena: byStatus.DOKONCENA || 0,
      vyrizena: byStatus.VYRIZENA || 0,
      zrusena: byStatus.ZRUSENA || 0,
      stornova: byStatus.STORNOVA || 0,
      smazana: byStatus.SMAZANA || 0,
      archivovano: byStatus.ARCHIVOVANO || 0,
      k_uverejneni_do_registru: byStatus.K_UVEREJNENI_DO_REGISTRU || 0,
      ceka_potvrzeni: byStatus.CEKA_POTVRZENI || 0,
      draft: byStatus.DRAFT || 0,
      approved: byStatus.APPROVED || 0,
      completed: byStatus.COMPLETED || 0,
      cancelled: byStatus.CANCELLED || 0,
      totalAmount: globalStats.totalAmount, // Keep global total
      completedAmount: globalStats.completedAmount, // Keep global
      incompleteAmount: globalStats.incompleteAmount, // Keep global
      withInvoices,
      withAttachments,
      mimoradneUdalosti
    };
  }, [
    filteredData,
    stats,
    globalStats,
    getOrderSystemStatus,
    globalFilter,
    statusFilter,
    userFilter,
    dateFromFilter,
    dateToFilter,
    amountFromFilter,
    amountToFilter,
    filterMaBytZverejneno,
    filterByloZverejneno,
    filterMimoradneObjednavky,
    filterWithInvoices,
    filterWithAttachments,
    showOnlyMyOrders,
    columnFilters,
    multiselectFilters
  ]);

  // 🧪 DEBUG: Ulož filtered data pro test panel
  useEffect(() => {
    setApiTestData(prev => ({
      ...prev,
      filteredData: filteredData,
      filteredCount: filteredData.length,
      archivedInFiltered: filteredData.filter(o => getOrderSystemStatus(o) === 'ARCHIVOVANO').length,
      nonArchivedInFiltered: filteredData.filter(o => getOrderSystemStatus(o) !== 'ARCHIVOVANO').length,
      filterState: {
        showArchived,
        selectedYear,
        selectedMonth,
        canViewAllOrders: permissionsRef.current?.canViewAll,
        currentUserId
      }
    }));
  }, [filteredData, showArchived, selectedYear, selectedMonth, currentUserId, getOrderSystemStatus]);

  // 📍 SCROLL STATE: Obnov rozbalené objednávky AŽ když je filteredData ready
  useEffect(() => {
    // Aktualizuj ref pro použití v save useEffect
    filteredDataRef.current = filteredData;

    if (!pendingExpandedOrderIds.current || filteredData.length === 0) {
      return;
    }

    // Počkej na render tabulky, pak rozbali objednávky podle ID
    setTimeout(() => {
      // Double-check že ref stále existuje (mohl být vynulován mezitím)
      if (!pendingExpandedOrderIds.current || !Array.isArray(pendingExpandedOrderIds.current)) {
        return;
      }

      const newExpanded = {};

      // Najdi indexy objednávek podle ID
      pendingExpandedOrderIds.current.forEach(orderId => {
        const index = filteredData.findIndex(order => order.id === orderId);
        if (index >= 0) {
          newExpanded[index] = true;
        }
      });

      if (Object.keys(newExpanded).length > 0) {
        setExpanded(newExpanded);

        // 🎬 INITIALIZATION: Označ dokončení rozbalení
        initStepsCompleted.current.expandedRestored = true;

        // Označ scroll jako "připravený"
        initStepsCompleted.current.scrollRestored = true;
      } else {
        // Žádné objednávky se nepodařilo rozbalit
        initStepsCompleted.current.expandedRestored = true;
        initStepsCompleted.current.scrollRestored = true;
      }

      // Vyčisti ref
      pendingExpandedOrderIds.current = null;
    }, 100); // Krátké čekání aby se stihla vykreslit tabulka
  }, [filteredData]); // Spustí se když je filteredData připravené

  // 🎬 INITIALIZATION: Kontroluj dokončení všech kroků a skryj splash screen
  //  REVERT: Vrácen původní polling přístup (funguje spolehlivě)
  // Event-driven přístup by vyžadoval přepis všech míst kde se nastavuje initStepsCompleted.current
  useEffect(() => {
    const steps = initStepsCompleted.current;

    // Kontroluj každých 100ms jestli jsou všechny kroky hotové
    const checkInterval = setInterval(() => {
      if (steps.dataLoaded && steps.paginationRestored &&
          steps.expandedRestored && steps.scrollRestored) {

        // Začni fade-out
        setSplashVisible(false);

        // Po dokončení fade animace (200ms) označ inicializaci jako hotovou
        setTimeout(() => {
          setInitializationComplete(true);
        }, 200);

        clearInterval(checkInterval);
      }
    }, 100);

    // Cleanup
    return () => clearInterval(checkInterval);
  }, []); // Spustí se jen jednou při mount

  // Debug log - upozornění na aktivní filtry bez výsledků
  useEffect(() => {
    const hasActiveFilters =
      globalFilter ||
      (Array.isArray(statusFilter) && statusFilter.length > 0) ||
      userFilter ||
      dateFromFilter ||
      dateToFilter ||
      amountFromFilter ||
      amountToFilter ||
      Object.values(columnFilters).some(val => val);

    if (hasActiveFilters && orders.length > 0 && filteredData.length === 0) {
      // Filter warning detection - filters are hiding all orders
    }
  }, [filteredData.length, orders.length, globalFilter, statusFilter, userFilter, dateFromFilter, dateToFilter, amountFromFilter, amountToFilter, columnFilters]);

  // Funkce pro rozbalení/sbalení všech řádků
  const expandAllRows = () => {
    table.toggleAllRowsExpanded(true);
  };

  const collapseAllRows = () => {
    table.toggleAllRowsExpanded(false);
  };

  const toggleAllRows = () => {
    const anyExpanded = table.getIsSomeRowsExpanded();
    table.toggleAllRowsExpanded(!anyExpanded);
  };

  // Table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableExpanding: true,
    getRowCanExpand: () => true,
    enableRowSelection: true,
    manualPagination: false,
    state: {
      sorting,
      expanded,
      rowSelection,
      pagination: {
        pageSize: pageSize,
        pageIndex: currentPageIndex,
      },
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
  });

  //  OPTIMALIZACE: Odstraněn redundantní useEffect pro table.setPageSize/Index
  // React Table automaticky reaguje na změny v state.pagination prop
  // Manuální nastavování způsobovalo potenciální race conditions

  //  OPTIMALIZACE: sorting useEffect byl přesunut do batch localStorage updatu výše

  // Reset to first page if current page is out of bounds - sleduj jen data length
  const pageCount = Math.max(1, Math.ceil(filteredData.length / pageSize));
  useEffect(() => {
    const maxPageIndex = pageCount - 1;
    if (currentPageIndex > maxPageIndex && maxPageIndex >= 0) {
      setCurrentPageIndex(0);
      setUserStorage('orders25List_pageIndex', 0);
      // React Table automaticky reaguje na změnu state.pagination.pageIndex
    }
  }, [pageCount, currentPageIndex, pageSize]); // ✅ Bez 'table' a 'filteredData'

  // 🎯 Floating header intersection observer - aktivuje se když jsou data načtená a tabulka vykreslená
  useEffect(() => {
    // Dokud se načítají data nebo nejsou žádná data, observer neběží
    if (loading || filteredData.length === 0) {
      setShowFloatingHeader(false);
      return;
    }
    
    // Ověř že tabulka je vykreslená v DOM
    if (!tableRef.current) {
      setShowFloatingHeader(false);
      return;
    }
    
    const thead = tableRef.current.querySelector('thead');
    if (!thead) {
      setShowFloatingHeader(false);
      return;
    }
    
    const appHeaderHeight = 96;
    const menuBarHeight = 48;
    const totalHeaderHeight = appHeaderHeight + menuBarHeight;
    
    let previousShowState = false;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
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
      { threshold: 0 }
    );
    
    observer.observe(thead);
    
    return () => {
      observer.disconnect();
    };
  }, [loading, filteredData.length, tableRef.current]); // Přidán tableRef.current do dependencies

  // Pagination navigation helpers - přímé funkce bez memoizace (table se mění každý render)
  const goToFirstPage = () => {
    saveCurrentScrollState();
    setCurrentPageIndex(0);
    setUserStorage('orders25List_pageIndex', 0);
  };

  const goToPreviousPage = () => {
    saveCurrentScrollState();
    const newIndex = Math.max(0, currentPageIndex - 1);
    setCurrentPageIndex(newIndex);
    setUserStorage('orders25List_pageIndex', newIndex);
  };

  const goToNextPage = () => {
    saveCurrentScrollState();
    const newIndex = Math.min(pageCount - 1, currentPageIndex + 1);
    setCurrentPageIndex(newIndex);
    setUserStorage('orders25List_pageIndex', newIndex);
  };

  const goToLastPage = () => {
    saveCurrentScrollState();
    const lastIndex = pageCount - 1;
    setCurrentPageIndex(lastIndex);
    setUserStorage('orders25List_pageIndex', lastIndex);
  };

  // Permission checks
  const canEdit = (order) => {
    if (!hasPermission) return false;

    // Koncepty může editovat každý kdo má základní práva (je to jeho vlastní koncept)
    if (order.isDraft || order.je_koncept) {
      return hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_EDIT_OWN');
    }

    // Uživatelé s ORDER_*_ALL oprávněními mohou editovat všechny objednávky
    if (hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_MANAGE')) {
      return true;
    }

    // ✅ Schvalovatelé mohou editovat (dle viditelnosti z API)
    if (hasPermission('ORDER_APPROVE')) {
      return true;
    }

    // 🏢 DEPARTMENT-BASED SUBORDINATE PERMISSIONS
    // ORDER_EDIT_SUBORDINATE = plná editace objednávek kolegů z úseku
    if (hasPermission('ORDER_EDIT_SUBORDINATE')) {
      return true;
    }

    // 🏢 ORDER_READ_SUBORDINATE = POUZE čtení, ŽÁDNÁ editace
    // KRITICKÉ: Pokud má READ_SUBORDINATE a NENÍ v roli → FALSE (read-only)
    if (hasPermission('ORDER_READ_SUBORDINATE') && !hasPermission('ORDER_EDIT_SUBORDINATE')) {
      // Zkontrolovat, zda je v roli na této konkrétní objednávce
      const isInOrderRole = (
        order.objednatel_id === currentUserId ||
        order.uzivatel_id === currentUserId ||
        order.garant_uzivatel_id === currentUserId ||
        order.schvalovatel_id === currentUserId ||
        order.prikazce_id === currentUserId ||
        order.uzivatel_akt_id === currentUserId ||
        order.odesilatel_id === currentUserId ||
        order.dodavatel_potvrdil_id === currentUserId ||
        order.zverejnil_id === currentUserId ||
        order.fakturant_id === currentUserId ||
        order.dokoncil_id === currentUserId ||
        order.potvrdil_vecnou_spravnost_id === currentUserId
      );
      
      // Pokud NENÍ v roli → FALSE (nesmí editovat, i když má ORDER_EDIT_OWN)
      if (!isInOrderRole) {
        return false;
      }
      // Pokud JE v roli → pokračuj normální kontrolou (ORDER_EDIT_OWN apod.)
    }

    // Uživatelé s ORDER_*_OWN oprávněními (včetně ORDER_2025) mohou editovat pouze své objednávky
    if (hasPermission('ORDER_EDIT_OWN') || hasPermission('ORDER_2025')) {
      return order.objednatel_id === currentUserId ||
             order.uzivatel_id === currentUserId ||
             order.garant_uzivatel_id === currentUserId ||
             order.schvalovatel_id === currentUserId;
    }

    return false;
  };

  const canDelete = (order) => {
    if (!hasPermission) return false;

    // Zakázat smazání pro objednávky v editaci/konceptu
    if (order.isDraft || order.je_koncept || order.hasLocalDraftChanges) return false;

    // Importované objednávky (ARCHIVOVANO) mohou mazat pouze ORDER_MANAGE a ORDER_DELETE_ALL
    if (order.stav_objednavky === 'ARCHIVOVANO') {
      return hasPermission('ORDER_MANAGE') || hasPermission('ORDER_DELETE_ALL');
    }

    // Uživatelé s ORDER_DELETE_ALL nebo ORDER_MANAGE mohou mazat všechny objednávky
    if (hasPermission('ORDER_DELETE_ALL') || hasPermission('ORDER_MANAGE')) {
      return true;
    }

    // 🏢 DEPARTMENT-BASED SUBORDINATE PERMISSIONS
    // ORDER_EDIT_SUBORDINATE = může mazat objednávky kolegů z úseku
    if (hasPermission('ORDER_EDIT_SUBORDINATE')) {
      return true;
    }

    // 🏢 ORDER_READ_SUBORDINATE = NESMÍ mazat (read-only)
    // KRITICKÉ: Pokud má READ_SUBORDINATE a NENÍ v roli → FALSE
    if (hasPermission('ORDER_READ_SUBORDINATE') && !hasPermission('ORDER_EDIT_SUBORDINATE')) {
      // Zkontrolovat, zda je v roli na této konkrétní objednávce
      const isInOrderRole = (
        order.objednatel_id === currentUserId ||
        order.uzivatel_id === currentUserId ||
        order.garant_uzivatel_id === currentUserId ||
        order.schvalovatel_id === currentUserId ||
        order.prikazce_id === currentUserId ||
        order.uzivatel_akt_id === currentUserId ||
        order.odesilatel_id === currentUserId ||
        order.dodavatel_potvrdil_id === currentUserId ||
        order.zverejnil_id === currentUserId ||
        order.fakturant_id === currentUserId ||
        order.dokoncil_id === currentUserId ||
        order.potvrdil_vecnou_spravnost_id === currentUserId
      );
      
      // Pokud NENÍ v roli → FALSE (nesmí mazat, i když má ORDER_DELETE_OWN)
      if (!isInOrderRole) {
        return false;
      }
      // Pokud JE v roli → pokračuj normální kontrolou
    }

    // Uživatelé s ORDER_DELETE_OWN mohou mazat pouze své objednávky
    if (hasPermission('ORDER_DELETE_OWN')) {
      return order.objednatel_id === currentUserId ||
             order.uzivatel_id === currentUserId ||
             order.garant_uzivatel_id === currentUserId ||
             order.schvalovatel_id === currentUserId;
    }

    return false;
  };

  const canExportDocument = (order) => {
    // ✅ Generování DOCX: od fáze ROZPRACOVANA až do DOKONCENA (dle WorkflowManager fáze 3-8)
    if (!order) return false;

    // ✅ POVOLENÉ STAVY: Od ROZPRACOVANA až do DOKONCENA
    // ⚠ SCHVALENA NENÍ POVOLENA - musí následovat ROZPRACOVANA nebo vyšší fáze!
    // Podle WorkflowManager mappingu:
    // - FÁZE 3: ROZPRACOVANA (START - začalo se pracovat)
    // - FÁZE 4: POTVRZENA, ODESLANA
    // - FÁZE 5-7: UVEREJNIT, UVEREJNENA, NEUVEREJNIT, FAKTURACE, VECNA_SPRAVNOST
    // - FÁZE 8: DOKONCENA, ZKONTROLOVANA
    const allowedStates = [
      'ROZPRACOVANA',     // ✅ FÁZE 3 - START (začalo se vyplňovat)
      // ❌ 'SCHVALENA' - pouze schváleno, ale ještě se nezačalo pracovat
      'POTVRZENA',        // ✅ FÁZE 4
      'ODESLANA',         // ✅ FÁZE 4
      'UVEREJNIT',        // ✅ FÁZE 5
      'UVEREJNENA',       // ✅ FÁZE 6
      'NEUVEREJNIT',      // ✅ FÁZE 6
      'FAKTURACE',        // ✅ FÁZE 6
      'VECNA_SPRAVNOST',  // ✅ FÁZE 7
      'DOKONCENA',        // ✅ FÁZE 8 - KONEC
      'ZKONTROLOVANA',    // ✅ FÁZE 8
      'CEKA_SE'           // ✅ Speciální stav - čeká se na dodavatele
    ];

    // ✅ KONTROLUJ ZDA POLE WORKFLOW STAVŮ OBSAHUJE ALESPOŇ JEDEN POVOLENÝ STAV
    let workflowStates = [];
    let aktualniStav = null;
    let nazevStavu = '';

    try {
      // Priorita 1: stav_workflow_kod (pole stavů - KONTROLUJ OBSAH, ne jen poslední!)
      if (order.stav_workflow_kod) {
        //  FIX: Může být UŽ ARRAY nebo STRING
        if (Array.isArray(order.stav_workflow_kod)) {
          workflowStates = order.stav_workflow_kod;
        } else if (typeof order.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(order.stav_workflow_kod);
          if (!Array.isArray(workflowStates)) {
            workflowStates = [];
          }
        }

        // Vezmi poslední stav pro zobrazení v debug logu
        if (workflowStates.length > 0) {
          const lastState = workflowStates[workflowStates.length - 1];
          if (typeof lastState === 'object' && (lastState.kod_stavu || lastState.nazev_stavu)) {
            aktualniStav = lastState.kod_stavu || lastState.nazev_stavu;
            nazevStavu = lastState.nazev_stavu || lastState.kod_stavu || '';
          } else if (typeof lastState === 'string') {
            aktualniStav = lastState;
            nazevStavu = lastState;
          }
        }
      }

      // Priorita 2: fallback na jiné pole stavu
      if (!aktualniStav) {
        aktualniStav = order.stav_id_num || order.stav_id || order.stav || order.nazev_stavu;
        nazevStavu = order.nazev_stavu || order.status_name || aktualniStav;
      }
    } catch (error) {
      aktualniStav = order.stav_id_num || order.stav_id || order.nazev_stavu;
      nazevStavu = order.nazev_stavu || '';
      workflowStates = [];
    }

    // ✅ KONTROLA: Obsahuje pole workflow stavů ALESPOŇ JEDEN povolený stav?
    const canGenerate = workflowStates.some(state => {
      // Normalizuj stav (může být string nebo objekt)
      let stavCode = '';
      if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
        stavCode = String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
      } else if (typeof state === 'string') {
        stavCode = String(state).toUpperCase().trim();
      }

      return allowedStates.includes(stavCode);
    });

    return canGenerate;
  };

  /**
   * ✅ Kontrola zda lze evidovat fakturu k objednávce
   * Od stavu ROZPRACOVANA výše + kontrola práv (pouze ADMINI, Invoice_manage, Invoice_add)
   */
  const canCreateInvoice = (order) => {
    if (!order) return false;

    // 🔒 KROK 1: Kontrola práv - POUZE pro správce faktur
    if (!hasPermission) return false;
    
    const hasInvoicePermission = hasPermission('ADMINI') || 
                                  hasPermission('INVOICE_MANAGE') || 
                                  hasPermission('INVOICE_ADD');
    
    if (!hasInvoicePermission) return false;

    // ✅ KROK 2: POVOLENÉ STAVY: POUZE Fakturace, Věcná kontrola, Zkontrolováno
    const allowedStates = [
      'FAKTURACE',        // ✅ FÁZE 6 - probíhá fakturace
      'VECNA_SPRAVNOST',  // ✅ FÁZE 7 - kontrola věcné správnosti
      'ZKONTROLOVANA'     // ✅ FÁZE 8 - zkontrolována
    ];

    // ❌ NEPLATNÉ STAVY (stornované/zamítnuté/dokončené)
    const invalidStates = ['STORNOVANA', 'ZAMITNUTA', 'DOKONCENA'];

    let workflowStates = [];
    try {
      if (order.stav_workflow_kod) {
        if (Array.isArray(order.stav_workflow_kod)) {
          workflowStates = order.stav_workflow_kod;
        } else if (typeof order.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(order.stav_workflow_kod);
          if (!Array.isArray(workflowStates)) {
            workflowStates = [];
          }
        }
      }
    } catch (error) {
      workflowStates = [];
    }

    // ✅ Zkontroluj zda není stornovaná/zamítnutá
    const hasInvalidState = workflowStates.some(state => {
      let stavCode = '';
      if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
        stavCode = String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
      } else if (typeof state === 'string') {
        stavCode = String(state).toUpperCase().trim();
      }
      return invalidStates.includes(stavCode);
    });

    if (hasInvalidState) {
      return false;
    }

    // ✅ Zkontroluj zda obsahuje alespoň jeden platný stav
    const hasValidState = workflowStates.some(state => {
      let stavCode = '';
      if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
        stavCode = String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
      } else if (typeof state === 'string') {
        stavCode = String(state).toUpperCase().trim();
      }
      return allowedStates.includes(stavCode);
    });

    return hasValidState;
  };

  // Funkce pro výběr šablon - nabídni VŠECHNY aktivní šablony (stejně jako v jednotlivém dialogu)
  const getTemplateOptions = (order) => {
    if (!order) return [];

    // Pokud nejsou načtené šablony z API, vrať prázdné pole
    if (!docxTemplates || docxTemplates.length === 0) {
      console.warn('⚠ [DOCX] Šablony nejsou načtené pro order:', order.cislo_objednavky);
      return [];
    }

    // Mapuj VŠECHNY šablony na formát pro select (bez filtrování!)
    const options = docxTemplates.map(template => ({
      value: template.kod || template.id,
      label: template.nazev || template.kod || 'Bez názvu'
    }));

    return options;
  };

  // Handlers
  const handleExportDocument = async (order) => {
    try {
      // 🔄 KRITICKÁ OPRAVA: Načti detail objednávky s enriched daty (účastníci workflow - garant, příkazce, schvalovatel, atd.)
      const enrichedOrder = await getOrderV2(order.id, token, username, true, 0);
      
      // ✅ Předej enriched data do dialogu (teď už máme garanta, příkazce, schvalovatele s cele_jmeno)
      setDocxModalOrder(enrichedOrder);
      setDocxModalOpen(true);

    } catch (error) {
      console.error('❌ [Orders25List] Chyba při otevírání DOCX dialogu:', error);
      showToast?.(`Chyba při otevírání DOCX generátoru: ${error.message}`, { type: 'error' });
    }
  };
  const handleEdit = async (order) => {
    // 🔒 KONTROLA OPRÁVNĚNÍ - PRVNÍ VĚC!
    if (!canEdit(order)) {
      showToast('Nemáte oprávnění editovat tuto objednávku', { type: 'warning' });
      return;
    }

    // 🎯 KONCEPT vs EDITACE - KRITICKÉ ROZLIŠENÍ!
    //
    // KONCEPT (isDraft === true):
    //   - Objekt NENÍ V DATABÁZI
    //   - Je uložen POUZE v localStorage (order25DraftStorageService)
    //   - URL: /order-form-25?mode=concept
    //   - Stav: "Koncept" (NIKDY ne "Editace"!)
    //
    // EDITACE (hasLocalDraftChanges === true):
    //   - Objekt JE V DATABÁZI (má objednavka_id)
    //   - Má uložené změny v localStorage
    //   - URL: /order-form-25?edit=<objednavka_id>
    //   - Stav: "Editace"

    // ✅ KONCEPT - pokračovat v tvorbě nové objednávky (není v DB)
    if (order.isDraft && !order.objednavka_id) {
      navigate(`/order-form-25?mode=concept`);
      return;
    }

    // ✅ EDITACE - pokračovat v editaci existující DB objednávky (má lokální změny)
    if (order.hasLocalDraftChanges && order.objednavka_id) {
      // 🎯 ZVÝRAZNĚNÍ: Ulož ID objednávky pro zvýraznění při návratu na seznam
      try {
        draftManager.setCurrentUser(user_id);
        draftManager.saveUIState({ 
          highlightOrderId: order.objednavka_id,
          editOrderId: order.objednavka_id 
        });
      } catch (e) {
        console.error('❌ Chyba při ukládání highlightOrderId:', e);
      }
      
      navigate(`/order-form-25?edit=${order.objednavka_id}`);
      return;
    }

    // 🔒 KONTROLA ZAMČENÍ - PRVNÍ VĚC PŘED NAČÍTÁNÍM DAT!
    // Načti aktuální data z DB pro kontrolu lock_info (BE vrací lock_info v orders25/by-id)
    const orderIdToCheck = order.id || order.objednavka_id;

    try {
      // ✅ V2 API
      const dbOrder = await getOrderV2(
        orderIdToCheck,
        token,
        username,
        true // enriched = true
      );

      if (!dbOrder) {
        showToast('Nepodařilo se načíst objednávku z databáze', { type: 'error' });
        return;
      }

      // 🔒 NOVÁ LOGIKA podle BE dokumentace (24.10.2025):
      // BE vrací locked: true POUZE když je zamčená JINÝM uživatelem
      // locked: false znamená "můžu editovat" (volná NEBO moje zamčená)

      //   orderId: orderIdToCheck,
      //   locked: dbOrder.lock_info?.locked,
      //   lock_status: dbOrder.lock_info?.lock_status,
      //   is_owned_by_me: dbOrder.lock_info?.is_owned_by_me,
      //   locked_by: dbOrder.lock_info?.locked_by_user_fullname
      // });

      // ✅ JEDNODUCHÁ kontrola podle nové BE sémantiky
      // ⚠️ Blokuj pouze pokud locked=true A NENÍ můj zámek A NENÍ expired (>15 min)
      if (dbOrder.lock_info?.locked === true && !dbOrder.lock_info?.is_owned_by_me && !dbOrder.lock_info?.is_expired) {
        // ❌ Zamčená JINÝM uživatelem - ZOBRAZ dialog a BLOKUJ editaci
        const lockInfo = dbOrder.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

        // Zjisti, zda má uživatel právo na force unlock (SUPERADMIN nebo ADMINISTRATOR)
        const canForceUnlock = userDetail?.roles?.some(role =>
          role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
        );
        // Ulož info o zamčení včetně kontaktních údajů (24.10.2025 - rozšířený lock_info)
        setLockedOrderInfo({
          lockedByUserName,
          lockedByUserEmail: lockInfo.locked_by_user_email || null,
          lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
          lockedAt: lockInfo.locked_at || null,
          lockAgeMinutes: lockInfo.lock_age_minutes || null,
          canForceUnlock,
          orderId: orderIdToCheck,
          userRoleName: userDetail?.roles?.find(r => r.kod_role === 'SUPERADMIN' || r.kod_role === 'ADMINISTRATOR')?.nazev_role || 'administrátor',
          blockedAction: 'edit'
        });
        setOrderToEdit(order); // Ulož pro pozdější použití
        setShowLockedOrderDialog(true);
        return; // ZASTAVIT - čekáme na rozhodnutí uživatele
      } else {
        // ✅ locked === false znamená můžu editovat (volná NEBO moje zamčená)
      }
    } catch (error) {
      showToast('Chyba při kontrole dostupnosti objednávky', { type: 'error' });
      return;
    }

    // Zkontroluj, jestli existuje validní koncept (pro rozhodnutí o confirm dialogu) - DRAFT MANAGER
    draftManager.setCurrentUser(user_id);
    const hasDraft = await draftManager.hasDraft();

    let shouldShowConfirmDialog = false;
    let draftDataToStore = null;
    let isDraftForThisOrder = false; // 🎯 NOVÝ FLAG

    if (hasDraft) {
      try {
        const draftData = await draftManager.loadDraft();

        // 🎯 KONTROLA OWNERSHIP: Patří draft k TÉTO objednávce?
        const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
        const currentOrderId = order.id;

        // ✅ Pokud draft patří k TÉTO objednávce, NEPTAT SE!
        if (draftOrderId && currentOrderId && String(draftOrderId) === String(currentOrderId)) {
          shouldShowConfirmDialog = false; // Draft patří k této objednávce - použij ho tiše
          isDraftForThisOrder = true; // 🎯 OZNAČIT že draft je pro tuto objednávku
        } else {
          // ❌ Draft patří k JINÉ objednávce - zeptej se
          const hasNewConcept = isValidConcept(draftData);
          const hasDbChanges = hasDraftChanges(draftData);
          shouldShowConfirmDialog = hasNewConcept || hasDbChanges;

          if (shouldShowConfirmDialog) {
            draftDataToStore = draftData; // Ulož pro zobrazení v modalu
          }
        }

      } catch (error) {
        shouldShowConfirmDialog = false;
      }
    }

    // 🎯 OPTIMALIZACE: Pokud draft patří k TÉTO objednávce, rovnou naviguj bez reload
    if (isDraftForThisOrder) {
      // 🎯 ZVÝRAZNĚNÍ: Ulož ID objednávky pro zvýraznění při návratu na seznam
      try {
        draftManager.setCurrentUser(user_id);
        draftManager.saveUIState({ 
          highlightOrderId: order.id,
          editOrderId: order.id 
        });
      } catch (e) {
        console.error('❌ Chyba při ukládání highlightOrderId:', e);
      }
      
      // Draft už existuje pro tuto objednávku - pouze naviguj na formulář
      // NEMAZAT draft, NENAČÍTAT znovu z DB
      navigate(`/order-form-25?edit=${order.id}`);
      return;
    }

    // KONTROLA: Pokud je objednávka ARCHIVOVANO a zároveň existuje koncept
    if (order.stav_objednavky === 'ARCHIVOVANO' && shouldShowConfirmDialog) {
      setCurrentDraftData(draftDataToStore);
      setOrderToEdit(order);
      setShowArchivedWithDraftWarningModal(true); // Zobraz KOMBINOVANÝ modal
      return;
    }

    // KONTROLA: Pokud je objednávka ARCHIVOVANO (bez konceptu)
    if (order.stav_objednavky === 'ARCHIVOVANO') {
      setOrderToEdit(order);
      setShowArchivedWarningModal(true);
      return;
    }

    // Rozhodni, zda zobrazit confirm dialog nebo editovat rovnou
    if (shouldShowConfirmDialog) {
      setCurrentDraftData(draftDataToStore); // Ulož draft data
      setOrderToEdit(order); // Nastav pro modal
      setShowEditConfirmModal(true);
    } else {
      handleEditConfirm(order); // Předej order přímo
    }
  };

  // Handler pro KOMBINOVANÝ modal (archivováno + draft)
  const handleArchivedWithDraftConfirm = () => {
    // 1. Zavři kombinovaný modal
    setShowArchivedWithDraftWarningModal(false);

    // 2. Smaž existující draft z localStorage - DRAFT MANAGER
    draftManager.setCurrentUser(user_id);
    draftManager.deleteDraft();

    // 3. Edituj archivovanou objednávku (s parametrem archivovano=1)
    if (orderToEdit) {
      handleEditConfirm(orderToEdit);
    }
  };

  const handleArchivedWarningConfirm = async () => {
    // Zavři archivovaný warning modal
    setShowArchivedWarningModal(false);

    // Pokračuj v normálním edit flow - zkontroluj, jestli existuje koncept - DRAFT MANAGER
    draftManager.setCurrentUser(user_id);
    const hasDraft = await draftManager.hasDraft();

    let shouldShowConfirmDialog = false;
    let isDraftForThisOrder = false; // 🎯 NOVÝ FLAG

    if (hasDraft) {
      try {
        const draftData = await draftManager.loadDraft();

        // 🎯 KONTROLA OWNERSHIP: Patří draft k TÉTO objednávce?
        const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
        const currentOrderId = orderToEdit?.id;

        // ✅ Pokud draft patří k TÉTO objednávce, NEPTAT SE!
        if (draftOrderId && currentOrderId && String(draftOrderId) === String(currentOrderId)) {
          shouldShowConfirmDialog = false; // Draft patří k této objednávce - použij ho tiše
          isDraftForThisOrder = true; // 🎯 OZNAČIT že draft je pro tuto objednávku
        } else {
          // ❌ Draft patří k JINÉ objednávce - zeptej se
          const hasNewConcept = isValidConcept(draftData);
          const hasDbChanges = hasDraftChanges(draftData);
          shouldShowConfirmDialog = hasNewConcept || hasDbChanges;
        }
      } catch (error) {
        shouldShowConfirmDialog = false;
      }
    }

    // 🎯 OPTIMALIZACE: Pokud draft patří k TÉTO objednávce, rovnou naviguj bez reload
    if (isDraftForThisOrder && orderToEdit) {
      // 🎯 ZVÝRAZNĚNÍ: Ulož ID objednávky pro zvýraznění při návratu na seznam
      try {
        draftManager.setCurrentUser(user_id);
        draftManager.saveUIState({ 
          highlightOrderId: orderToEdit.id,
          editOrderId: orderToEdit.id 
        });
      } catch (e) {
        console.error('❌ Chyba při ukládání highlightOrderId:', e);
      }
      
      // Draft už existuje pro tuto objednávku - pouze naviguj na formulář
      navigate(`/order-form-25?edit=${orderToEdit.id}&archivovano=1`);
      return;
    }

    // Rozhodni, zda zobrazit confirm dialog nebo editovat rovnou
    if (shouldShowConfirmDialog) {
      setShowEditConfirmModal(true);
    } else {
      handleEditConfirm(orderToEdit);
    }
  };

  const handleEditConfirm = async (orderParam = null) => {

    // Pokud orderParam je SyntheticEvent (z onClick), ignoruj ho a použij orderToEdit ze state
    let orderToUse = orderToEdit;
    if (orderParam && orderParam.id && !orderParam.type) { // orderParam je skutečná objednávka, ne event
      orderToUse = orderParam;
    }

    if (!orderToUse) {
      return;
    }

    try {
      const orderIdToLoad = orderToUse.id || orderToUse.objednavka_id;

      if (!orderIdToLoad) {
        showToast('Chyba: Nelze určit ID objednávky', { type: 'error' });
        return;
      }

      // Načti aktuální data z DB - ✅ V2 API
      const dbOrder = await getOrderV2(
        orderIdToLoad,
        token,
        username,
        true // enriched = true
      );

      if (!dbOrder) {
        showToast('Nepodařilo se načíst objednávku z databáze', { type: 'error' });
        return;
      }

      // 🔒 Zamkni objednávku pro editaci (kontrola zamčení už byla provedena v handleEdit)
      try {
        const lockResult = await lockOrder25({ token, username, orderId: orderIdToLoad });
        if (lockResult.success) {
        }
      } catch (lockError) {
        //
        // Pokračuj i když selže zamykání (kontrola už byla provedena v handleEdit)
      }

      // Načti detaily objednatele z DB přes jeho ID
      let objednatelDetails = null;

      if (dbOrder.objednatel_id) {
        try {
          const { getUserDetailApi2 } = await import('../services/api2auth');
          objednatelDetails = await getUserDetailApi2(username, token, dbOrder.objednatel_id);
        } catch (error) {
          // DŮLEŽITÉ: Pokud nelze načíst detaily, zkusíme najít uživatele v existujícím seznamu
          objednatelDetails = null;
        }
      } else {
      }

      let cleanedKeys = [];

      // Vyčisti všechny staré koncepty
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('orderForm25_') ||
          key.startsWith('order25_draft_') ||  // ORDER25 STANDARD
          key.startsWith('order25-draft-') ||  // LEGACY cleanup
          key.startsWith('orderForm25-') ||
          key.includes('draft') && key.includes('order')
        )) {
          localStorage.removeItem(key);
          cleanedKeys.push(key);
        }
      }

      // Vytvoř koncept s čerstvými daty z DB
      const orderId = dbOrder.id;

      // Vytvoř správné údaje objednatele z načtených detailů z DB
      let objednatelData = {
        objednatel_id: dbOrder.objednatel_id || user_id,
        jmeno: 'Neuvedeno',
        email: '',
        telefon: ''
      };

      if (objednatelDetails) {
        // Použij detaily načtené z DB podle objednatel_id
        const jmeno = `${objednatelDetails.titul_pred ? objednatelDetails.titul_pred + ' ' : ''}${objednatelDetails.jmeno || ''} ${objednatelDetails.prijmeni || ''}${objednatelDetails.titul_za ? ', ' + objednatelDetails.titul_za : ''}`.replace(/\s+/g, ' ').trim();
        objednatelData = {
          objednatel_id: dbOrder.objednatel_id,
          jmeno: jmeno || 'Neuvedeno',
          email: objednatelDetails.email || '',
          telefon: objednatelDetails.telefon || ''
        };
      } else if (dbOrder.objednatel_id) {
      }

      // Analýza workflow stavu a nastavení checkboxů
      const hasWorkflowState = (workflowCode, state) => {
        if (!workflowCode) return false;
        try {
          if (typeof workflowCode === 'string' && workflowCode.startsWith('[')) {
            const states = JSON.parse(workflowCode);
            return Array.isArray(states) && states.includes(state);
          }
          return String(workflowCode).includes(state);
        } catch {
          return String(workflowCode).includes(state);
        }
      };

      // Analýza workflow stavu pro správné nastavení UI
      const isSchvalena = hasWorkflowState(dbOrder.stav_workflow_kod, 'SCHVALENA');
      const isOdeslana = hasWorkflowState(dbOrder.stav_workflow_kod, 'ODESLANA');
      const isZrusena = hasWorkflowState(dbOrder.stav_workflow_kod, 'ZRUSENA');
      const isZamitnuta = hasWorkflowState(dbOrder.stav_workflow_kod, 'ZAMITNUTA');
      const isCekaSe = hasWorkflowState(dbOrder.stav_workflow_kod, 'CEKA_SE');

      // Odvození UI stavů ze workflow
      let stavSchvaleni = dbOrder.stav_schvaleni || ''; // Zachovat původní nebo prázdný
      if (isSchvalena) {
        stavSchvaleni = 'schvaleno';
      } else if (isZamitnuta) {
        stavSchvaleni = 'neschvaleno';
      } else if (isCekaSe) {
        stavSchvaleni = 'ceka_se';
      }

      // DEBUG: Kontrola ev_cislo před vytvořením draftu
      const finalEvCislo = dbOrder.cislo_objednavky || dbOrder.ev_cislo || 'CHYBA: Chybí číslo v DB!';

      const freshDraft = {
        formData: {
          ...dbOrder, // Čerstvá data z DB
          uzivatel_id: user_id, // Současný uživatel co edituje
          // KRITICKÉ: Správné mapování čísla objednávky pro frontend
          ev_cislo: dbOrder.cislo_objednavky || dbOrder.ev_cislo || 'CHYBA: Chybí číslo v DB!',
          // Správné nastavení UI prvků podle workflow stavu
          stav_schvaleni: stavSchvaleni, // Odvozeno ze workflow
          stav_odeslano: isOdeslana,     // Checkbox "Odesláno"
          // 🛑 ODSTRANĚNO: stav_stornovano - pole neexistuje v DB, používá se hasWorkflowState(stav_workflow_kod, 'ZRUSENA')
          // EXPLICITNĚ přepsat údaje objednatele z API (aby nepřepsaly starší data z dbOrder)
          ...(objednatelData && {
            objednatel_id: objednatelData.objednatel_id,
            jmeno: objednatelData.jmeno,
            email: objednatelData.email,
            telefon: objednatelData.telefon
          })
        },
        timestamp: Date.now(),
        version: '1.4',
        isConceptSaved: true,
        isChanged: false, // Synchronní s DB
        isOrderSavedToDB: true,
        savedOrderId: orderId,
        attachments: []
      };

      // Ulož koncept s DB daty
      setUserStorage('order25-draft', freshDraft);

      // Odešli broadcast událost pro aktualizaci menubar
      broadcastDraftUpdated(user_id, freshDraft);

      // 🔄 EXPLICITNÍ REFRESH MENUBAR: Oznám MenuBaru o načtení objednávky pro editaci
      window.dispatchEvent(new CustomEvent('orderDraftChange', {
        detail: {
          hasDraft: true,
          isEditMode: true, // EDITACE objednávky (ne koncept)
          orderId: orderId,
          orderNumber: finalEvCislo,
          isLoading: false
        }
      }));

      // 🎯 ZVÝRAZNĚNÍ: Ulož ID objednávky pro zvýraznění při návratu na seznam
      try {
        draftManager.setCurrentUser(user_id);
        draftManager.saveUIState({ 
          highlightOrderId: orderId,
          editOrderId: orderId 
        });
      } catch (e) {
        console.error('❌ Chyba při ukládání highlightOrderId:', e);
      }

      // Použij React Router s edit parametrem pro načtení objednávky do editace
      navigate(`/order-form-25?edit=${orderId}&archivovano=1`);

    } catch (error) {
      showToast('Chyba při načítání objednávky z databáze', { type: 'error' });
    }

    setShowEditConfirmModal(false);
    setOrderToEdit(null);
  };

  const handleEditCancel = () => {
    // Jen zavři modal bez mazání konceptů
    // Uživatel zůstane na seznamu objednávek a zachovají se jeho rozepsané změny
    setShowEditConfirmModal(false);
    setOrderToEdit(null);
    setCurrentDraftData(null);
  };

  const handleView = (order) => {
    // TODO: Implement preview

  };

  const handleFinancialControl = async (order) => {
    try {
      // Zkontroluj stav objednávky pomocí getOrderSystemStatus
      const systemStatus = getOrderSystemStatus(order);
      if (systemStatus !== 'DOKONCENA') {
        showToast?.('Finanční kontrola je dostupná pouze pro dokončené objednávky', { type: 'warning' });
        return;
      }

      // 🔥 KRITICKÉ: Obohacení order objektu o LP názvy (stejně jako v OrderForm25)
      let enrichedOrder = { ...order };
      
      // Načíst LP názvy VŽDY (ne jen pro LP financování)
      try {
        const lpNazvy = await fetchLimitovanePrisliby({ token, username });
        enrichedOrder = {
          ...order,
          lp_nazvy: lpNazvy,
          financovani: {
            ...order.financovani,
            lp_nazvy: lpNazvy
          }
        };
      } catch (error) {
        console.error('❌ [Orders25List] Chyba při načítání LP názvy:', error);
      }

      // Otevři modal s PDF náhledem
      setFinancialControlOrder(enrichedOrder);
      setFinancialControlModalOpen(true);
    } catch (error) {
      console.error('❌ [Orders25List] Chyba při otevírání finanční kontroly:', error);
      showToast?.(`Chyba při otevírání finanční kontroly: ${error.message}`, { type: 'error' });
    }
  };

  // 📏 Handler pro scroll šipky - scrolluj o šířku viewportu
  const handleScrollLeft = () => {
    const tableContainer = tableRef.current;
    if (!tableContainer) return;

    // Scrolluj o 80% šířky containeru doleva
    const scrollAmount = tableContainer.clientWidth * 0.8;
    tableContainer.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleScrollRight = () => {
    const tableContainer = tableRef.current;
    if (!tableContainer) return;

    // Scrolluj o 80% šířky containeru doprava
    const scrollAmount = tableContainer.clientWidth * 0.8;
    tableContainer.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  // Handler pro vytvoření nové objednávky z action menu
  const handleCreateNewOrder = async () => {
    // Zkontroluj, jestli existuje aktivní koncept nebo editace - DRAFT MANAGER
    draftManager.setCurrentUser(user_id);
    const hasDraft = await draftManager.hasDraft();

    let shouldShowConfirmDialog = false;
    let draftDataToStore = null;

    if (hasDraft) {
      try {
        const draftData = await draftManager.loadDraft();
        const hasNewConcept = isValidConcept(draftData);
        const hasDbChanges = hasDraftChanges(draftData);
        shouldShowConfirmDialog = hasNewConcept || hasDbChanges;

        if (shouldShowConfirmDialog) {
          draftDataToStore = draftData; // Ulož pro zobrazení v modalu
        }
      } catch (error) {
        shouldShowConfirmDialog = false;
      }
    }

    // Pokud existuje aktivní koncept/editace, zobraz confirm dialog
    if (shouldShowConfirmDialog) {
      setCurrentDraftData(draftDataToStore); // Ulož draft data pro modal
      setOrderToEdit(null); // Žádná konkrétní objednávka - vytváříme novou
      setShowEditConfirmModal(true);
    } else {
      // Rovnou přesměruj na prázdný formulář
      navigate('/order-form-25');
    }
  };

  // Handler pro potvrzení vytvoření nové objednávky (po confirm dialogu)
  const handleCreateNewOrderConfirm = () => {
    // Smaž existující draft - DRAFT MANAGER
    draftManager.setCurrentUser(user_id);
    draftManager.deleteDraft();

    //  KRITICKÉ: Vymaž activeOrderEditId z localStorage (jinak se načte původní objednávka)
    localStorage.removeItem(`activeOrderEditId_${user_id}`);

    // Zavři modal a vyčisti state
    setShowEditConfirmModal(false);
    setOrderToEdit(null);
    setCurrentDraftData(null);

    //  FIX: Pokud je otevřený formulář, force reload přes window.location
    const isOnOrderForm = window.location.pathname === '/order-form-25';
    
    if (isOnOrderForm) {
      // Jsme na formuláři - použij window.location pro hard reload
      window.location.href = '/order-form-25';
    } else {
      // Nejsme na formuláři - normální navigate
      navigate('/order-form-25');
    }
  };

  // =============================================================================
  // 🔒 HANDLER PRO ZAMČENOU OBJEDNÁVKU
  // =============================================================================

  const handleLockedOrderForceUnlock = async () => {
    if (!lockedOrderInfo) return;

    try {
      // 1. Násilně odemkni
      const unlockResult = await unlockOrder25({
        token,
        username,
        orderId: lockedOrderInfo.orderId,
        force: true
      });

      if (unlockResult.success && unlockResult.unlock_type === 'forced') {
        showToast(
          `Objednávka byla násilně odemčena uživateli ${lockedOrderInfo.lockedByUserName} a převzata`,
          { type: 'success' }
        );

        // 2. Zamkni pro aktuálního uživatele
        const lockResult = await lockOrder25({ token, username, orderId: lockedOrderInfo.orderId });
        if (lockResult.success) {
          showToast(
            `Objednávka byla zamknuta pro editaci`,
            { type: 'success' }
          );
        }

        // Zavři dialog
        setShowLockedOrderDialog(false);
        setLockedOrderInfo(null);

        // Pokračuj v editaci - znovu zavolej handleEditConfirm
        if (orderToEdit) {
          handleEditConfirm(orderToEdit);
        }
      }
    } catch (forceError) {
      showToast(
        `Nepodařilo se násilně odemknout objednávku: ${forceError.message}`,
        { type: 'error' }
      );
      setShowLockedOrderDialog(false);
      setLockedOrderInfo(null);
      setOrderToEdit(null);
    }
  };

  const handleLockedOrderCancel = () => {
    // Zavři dialog a vyčisti state
    setShowLockedOrderDialog(false);
    setLockedOrderInfo(null);
    setShowEditConfirmModal(false);
    setOrderToEdit(null);
  };

  // =============================================================================
  // FORCE UNLOCK WARNING DIALOG HANDLERS
  // =============================================================================

  const handleForceUnlockWarningClose = () => {
    setShowForceUnlockWarning(false);
    setForceUnlockWarningData(null);
  };

  const handleForceUnlockWarningAcknowledge = async () => {
    // Označ notifikaci jako přečtenou (pokud máme ID)
    if (forceUnlockWarningData?.notificationId) {
      try {
        // TODO: Volání API pro označení notifikace jako přečtené
        // await markNotificationAsRead(forceUnlockWarningData.notificationId);
      } catch (error) {
      }
    }

    // Refresh dat (objednávka byla převzata jiným uživatelem)
    await loadData(true);

    // Zavři dialog
    handleForceUnlockWarningClose();

    showToast?.('Seznam objednávek byl aktualizován', { type: 'info' });
  };

  // =============================================================================
  // KONTEXTOVÉ MENU HANDLERS
  // =============================================================================

  // 🔥 CRITICAL PERFORMANCE: Memoize to prevent re-creating on every render
  const handleContextMenu = useCallback((e, order, cellData = null) => {
    e.preventDefault(); // Zabraň výchozímu kontextovému menu

    // Zjisti na jakou buňku se kliklo
    let selectedData = null;
    const target = e.target;

    if (cellData) {
      selectedData = cellData;
    } else if (target && target.closest('td')) {
      // Najdi text obsahu buňky
      const cellElement = target.closest('td');
      selectedData = {
        value: cellElement.textContent?.trim() || '',
        element: cellElement
      };
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      order: order,
      selectedData: selectedData
    });
  }, []); // No dependencies - pure event handler

  // 🔥 PERFORMANCE: Event delegation handler - avoid inline functions in render loop
  // Uses filteredDataRef to prevent re-creation when filteredData changes
  const handleTableContextMenu = useCallback((e) => {
    const row = e.target.closest('tr[data-order-index]');
    if (!row) return;

    const orderIndex = parseInt(row.dataset.orderIndex, 10);
    const order = filteredDataRef.current[orderIndex];
    if (!order) return;

    handleContextMenu(e, order);
  }, [handleContextMenu]); // No filteredData dependency - uses ref!

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleAddToTodo = useCallback((order) => {
    // TODO: Implementace - přidá objednávku do TODO panelu
    showToast(`🎯 Funkce "Přidat do TODO" bude brzy implementována pro objednávku ${order.cislo_objednavky}`, { type: 'info' });
  }, [showToast]);

  const handleAddAlarm = useCallback((order) => {
    // TODO: Implementace - otevře dialog pro nastavení alarmu
    showToast(`⏰ Funkce "Přidat alarm" bude brzy implementována pro objednávku ${order.cislo_objednavky}`, { type: 'info' });
  }, [showToast]);

  const handleContextMenuEdit = useCallback((order) => {
    // Použije existující handleEdit
    handleEdit(order);
  }, [handleEdit]);

  const handleContextMenuDelete = useCallback((order) => {
    // Použije existující handleDelete
    handleDelete(order);
  }, []);

  const handleGenerateDocx = useCallback((order) => {
    // Zavolá stejnou funkci jako action button
    handleExportDocument(order);
  }, [handleExportDocument]);

  const handleGenerateFinancialControl = useCallback(async (order) => {
    try {
      // 🔄 KRITICKÁ OPRAVA: Načti detail objednávky s enriched daty (LP názvy, faktury, atd.)
      const enrichedOrder = await getOrderV2(order.id, token, username, true, 0);

      
      // Otevření modalu s náhledem PDF finanční kontroly
      setFinancialControlOrder(enrichedOrder);
      setFinancialControlModalOpen(true);
    } catch (error) {
      console.error('Chyba při načítání detailu objednávky pro finanční kontrolu:', error);
      showToast('Nepodařilo se načíst detail objednávky', { type: 'error' });
    }
  }, [token, username, showToast]);

  // 🎯 Handler pro schválení objednávky z kontextového menu (příkazce)
  const handleApproveFromContextMenu = useCallback(async (order) => {
    try {
      // Načti detail objednávky s enriched daty (LP budget, smlouva, střediska)
      const orderDetail = await getOrderV2(order.id, token, username, true, 0);

      // 🔒 LOCK CHECK: schvalování z kontextového menu nesmí pokračovat, pokud je objednávka zamčena jiným uživatelem
      if (orderDetail?.lock_info?.locked === true && !orderDetail.lock_info?.is_owned_by_me && !orderDetail.lock_info?.is_expired) {
        const lockInfo = orderDetail.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

        // Pro schvalování NEumožňujeme force unlock (bezpečné výchozí chování)
        setLockedOrderInfo({
          lockedByUserName,
          lockedByUserEmail: lockInfo.locked_by_user_email || null,
          lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
          lockedAt: lockInfo.locked_at || null,
          lockAgeMinutes: lockInfo.lock_age_minutes || null,
          canForceUnlock: false,
          orderId: order.id,
          userRoleName: 'administrátor',
          blockedAction: 'approve'
        });
        setOrderToEdit(null);
        setShowLockedOrderDialog(true);
        return;
      }

      setOrderToApprove(orderDetail);
      // Načti existující komentář ke schválení z DB (pokud existuje)
      setApprovalComment(orderDetail.schvaleni_komentar || '');
      setShowApprovalDialog(true);
    } catch (error) {
      console.error('Chyba při načítání detailu objednávky:', error);
      showToast('Nepodařilo se načíst detail objednávky', { type: 'error' });
    }
  }, [token, username, showToast]);

  // 🎯 Handler pro zpracování schválení objednávky
  const handleApprovalAction = useCallback(async (action) => {
    if (!orderToApprove) return;

    // ⚠️ VALIDACE: Pro Odložit a Zamítnout je poznámka POVINNÁ
    if ((action === 'reject' || action === 'postpone') && !approvalComment.trim()) {
      setApprovalCommentError('Poznámka je povinná pro zamítnutí nebo odložení');
      return;
    }

    // Vymaž validaci pokud je vše OK
    setApprovalCommentError('');

    try {
      // Načti současný workflow stav
      let workflowStates = [];
      try {
        if (Array.isArray(orderToApprove.stav_workflow_kod)) {
          workflowStates = [...orderToApprove.stav_workflow_kod];
        } else if (typeof orderToApprove.stav_workflow_kod === 'string') {
          workflowStates = JSON.parse(orderToApprove.stav_workflow_kod);
        }
      } catch (e) {
        workflowStates = [];
      }

      // Připrav nový workflow stav podle akce
      let newWorkflowStates = workflowStates.filter(s => 
        !['ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA', 'SCHVALENA'].includes(s)
      );

      let orderUpdate = {
        schvaleni_komentar: approvalComment || '', // ✅ Ukládá se vždy - i prázdný pro schválení
        mimoradna_udalost: orderToApprove.mimoradna_udalost // ✅ ZACHOVAT status Mimořádná událost
      };

      const timestamp = new Date().toISOString();

      switch (action) {
        case 'approve':
          // Schválit - přidej SCHVALENA
          newWorkflowStates.push('SCHVALENA');
          orderUpdate.stav_objednavky = 'Schválená';
          orderUpdate.dt_schvaleni = timestamp;
          orderUpdate.schvalil_uzivatel_id = currentUserId;
          break;

        case 'reject':
          // Zamítnout - přidej ZAMITNUTA
          newWorkflowStates.push('ZAMITNUTA');
          orderUpdate.stav_objednavky = 'Zamítnutá';
          orderUpdate.dt_schvaleni = timestamp;
          orderUpdate.schvalil_uzivatel_id = currentUserId;
          break;

        case 'postpone':
          // Odložit - přidej CEKA_SE (také zaznamenat kdo a kdy)
          newWorkflowStates.push('CEKA_SE');
          orderUpdate.stav_objednavky = 'Odloženo';
          orderUpdate.dt_schvaleni = timestamp;
          orderUpdate.schvalil_uzivatel_id = currentUserId;
          break;

        default:
          return;
      }

      orderUpdate.stav_workflow_kod = JSON.stringify(newWorkflowStates);

      // 🚀 OPTIMISTICKÝ UPDATE - okamžitě zobraz změnu před DB reloadem
      setOrders(prev => prev.map(o => {
        if (o.id === orderToApprove.id) {
          return {
            ...o,
            stav_workflow_kod: newWorkflowStates,
            stav_objednavky: orderUpdate.stav_objednavky,
            schvaleni_komentar: orderUpdate.schvaleni_komentar,
            dt_schvaleni: orderUpdate.dt_schvaleni,
            schvalil_uzivatel_id: orderUpdate.schvalil_uzivatel_id
          };
        }
        return o;
      }));

      // Zavři dialog
      setShowApprovalDialog(false);
      setOrderToApprove(null);
      setApprovalComment('');
      setApprovalCommentError('');

      // Zobraz úspěšnou zprávu
      const currentUser = users[currentUserId];
      const userName = currentUser ? `${currentUser.jmeno} ${currentUser.prijmeni}` : 'Váš účet';
      
      const actionMessages = {
        approve: `✅ Objednávka ${orderToApprove.ev_cislo || orderToApprove.cislo_objednavky} byla úspěšně schválena\n📋 ${orderToApprove.predmet?.substring(0, 60)}${orderToApprove.predmet?.length > 60 ? '...' : ''}\n👤 Schválil: ${userName}`,
        reject: `❌ Objednávka ${orderToApprove.ev_cislo || orderToApprove.cislo_objednavky} byla zamítnuta\n📋 ${orderToApprove.predmet?.substring(0, 60)}${orderToApprove.predmet?.length > 60 ? '...' : ''}\n👤 Zamítl: ${userName}`,
        postpone: `⏸️ Objednávka ${orderToApprove.ev_cislo || orderToApprove.cislo_objednavky} byla odložena\n📋 ${orderToApprove.predmet?.substring(0, 60)}${orderToApprove.predmet?.length > 60 ? '...' : ''}\n👤 Odložil: ${userName}`
      };
      showToast(actionMessages[action], { type: 'success' });

      // Zvýrazni objednávku
      setHighlightOrderId(orderToApprove.id);

      // 🔥 API CALL na pozadí (nedočkáme se ho)
      updateOrderV2(orderToApprove.id, orderUpdate, token, username).catch(apiError => {
        console.error('API update failed:', apiError);
        showToast('Změna byla zobrazena, ale mohlo dojít k chybě na serveru. Obnovte stránku.', { type: 'warning' });
      });

      // 🔔 TRIGGER NOTIFICATION na pozadí
      try {
        const eventTypeMap = {
          approve: 'ORDER_APPROVED',
          reject: 'ORDER_REJECTED', 
          postpone: 'ORDER_PENDING_APPROVAL'
        };
        
        const eventType = eventTypeMap[action];
        if (eventType) {
          const baseURL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
          fetch(`${baseURL}notifications/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              username,
              event_type: eventType,
              object_id: orderToApprove.id,
              trigger_user_id: currentUserId,
              debug: false
            })
          }).catch(err => console.error('Notification error:', err));
        }
      } catch (notifError) {
        console.error('❌ Failed to trigger notification:', notifError);
      }

      // ⚡ RYCHLÝ REFRESH - pouze té konkrétní objednávky z DB (na pozadí)
      setTimeout(async () => {
        try {
          const result = await getOrderV2(orderToApprove.id, token, username, true, 0);
          
          if (result?.data) {
            setOrders(prev => prev.map(o => 
              o.id === orderToApprove.id ? { ...o, ...result.data } : o
            ));
            ordersCacheService.invalidate(user_id);
          }
        } catch (refreshError) {
          console.error('Background refresh failed:', refreshError);
          // Není kritické - optimistický update už proběhl
        }
      }, 500); // Po 500ms obnov tu konkrétní objednávku z DB

    } catch (error) {
      console.error('Chyba při zpracování schválení:', error);
      showToast('Chyba při zpracování schválení objednávky', { type: 'error' });
    }
  }, [orderToApprove, approvalComment, currentUserId, token, username, showToast, loadData, user_id]);

  const handleDocxModalClose = useCallback(() => {
    setDocxModalOpen(false);
    setDocxModalOrder(null);
  }, []);

  const handleDelete = useCallback((order) => {
    if (!canDelete(order)) {
      showToast('Nemáte oprávnění smazat tuto objednávku', { type: 'warning' });
      return;
    }
    
    // 🔧 Nastavit výchozí delete type podle stavu objednávky
    if (order.aktivni === 0 && isAdmin) {
      // Neaktivní objednávka + admin = možnost restore nebo hard delete
      setDeleteType('restore'); // Výchozí: obnovit
    } else {
      // Aktivní objednávka = soft delete
      setDeleteType('soft');
    }
    
    setOrderToDelete(order);
    setShowDeleteConfirmModal(true);
  }, [canDelete, showToast, isAdmin]);
  
  // Handler: Evidovat fakturu
  const handleCreateInvoice = useCallback(async (order) => {
    // ✅ Kontrola zda je objednávka ve správném stavu a má práva
    if (!canCreateInvoice(order)) {
      // Rozlišit důvod zamítnutí
      const hasInvoicePermission = hasPermission && (hasPermission('ADMINI') || 
                                     hasPermission('INVOICE_MANAGE') || 
                                     hasPermission('INVOICE_ADD'));
      
      if (!hasInvoicePermission) {
        showToast('Nemáte oprávnění pro evidování faktur', { type: 'error' });
      } else {
        showToast('Evidování faktury je dostupné pouze pro objednávky od stavu ROZPRACOVANÁ', { type: 'warning' });
      }
      return;
    }
    
    // 🎯 Získat číslo objednávky pro prefill v našeptávači
    const orderNumber = order.cislo_objednavky || order.evidencni_cislo || `#${order.id}`;
    
    // 🔍 Pokud má objednávka faktury, zobraz popup se seznamem
    const invoiceCount = order.faktury_count || 0;
    
    if (invoiceCount > 0) {
      // Otevři popup a načti faktury
      setInvoicePopupOrder(order);
      setInvoicePopupVisible(true);
      setInvoicePopupLoading(true);
      setInvoicePopupInvoices([]);
      
      try {
        const invoices = await getInvoicesByOrder25({
          token,
          username,
          objednavka_id: order.id
        });
        setInvoicePopupInvoices(invoices || []);
      } catch (error) {
        console.error('Chyba při načítání faktur:', error);
        showToast('Nepodařilo se načíst faktury objednávky', { type: 'error' });
        setInvoicePopupInvoices([]);
      } finally {
        setInvoicePopupLoading(false);
      }
    } else {
      // Navigace do modulu faktur s číslem objednávky v searchTerm
      navigate('/invoice-evidence', { 
        state: { 
          prefillSearchTerm: orderNumber,
          orderIdForLoad: order.id
        } 
      });
    }
  }, [token, username, navigate, showToast, hasPermission]);

  // Handlers pro popup se seznamem faktur
  const handleCloseInvoicePopup = useCallback(() => {
    setInvoicePopupVisible(false);
    setInvoicePopupOrder(null);
    setInvoicePopupInvoices([]);
  }, []);

  const handleEditInvoiceFromPopup = useCallback((invoice) => {
    // Zavři popup a naviguj do modulu faktur s předvyplněnou fakturou k editaci
    setInvoicePopupVisible(false);
    navigate('/invoice-evidence', { 
      state: { 
        editInvoiceId: invoice.id,  // ✅ Správný parametr pro editaci faktury
        orderIdForLoad: invoicePopupOrder?.id
      } 
    });
  }, [navigate, invoicePopupOrder]);

  const handleAddInvoiceFromPopup = useCallback(() => {
    // Zavři popup a naviguj do modulu faktur pro vytvoření nové faktury
    const orderNumber = invoicePopupOrder?.cislo_objednavky || 
                       invoicePopupOrder?.evidencni_cislo || 
                       `#${invoicePopupOrder?.id}`;
    
    setInvoicePopupVisible(false);
    navigate('/invoice-evidence', { 
      state: { 
        prefillSearchTerm: orderNumber,
        orderIdForLoad: invoicePopupOrder?.id
      } 
    });
  }, [navigate, invoicePopupOrder]);

  // 🔥 PERFORMANCE: Populate handlers ref for handleActionClick
  // Direct assignment (not useEffect) - happens on every render
  // This is intentional: ensures ref is always up-to-date before render
  handlersRef.current = {
    handleEdit,
    handleView,
    handleExportDocument,
    handleFinancialControl,
    handleCreateInvoice,
    handleDelete
  };

  const handleDeleteConfirm = async (deleteType) => {
    if (!orderToDelete) return;

    try {
      // 🔄 RESTORE - obnova neaktivní objednávky (pouze admin)
      if (deleteType === 'restore') {
        if (!isAdmin) {
          showToast && showToast('Nemáte oprávnění k obnově objednávek.', { type: 'error' });
          return;
        }

        try {
          await restoreOrderV2(orderToDelete.id, token, username);
          showToast && showToast(`Objednávka "${orderToDelete.cislo_objednavky}" byla obnovena.`, { type: 'success' });
          
          // Reload data to show restored order
          loadData();
        } catch (error) {
          const errorMsg = translateErrorMessageShort(error.message);
          showToast && showToast(`Chyba při obnově: ${errorMsg}`, { type: 'error' });
        }
        
        setShowDeleteConfirmModal(false);
        setOrderToDelete(null);
        return;
      }

      // ✅ V2 API: deleteOrderV2 s parametrem soft/hard

      // ✅ Okamžitě odebrat ze seznamu (optimistická aktualizace)
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderToDelete.id));

      if (deleteType === 'hard') {
        // ✅ V2 API: Úplné smazání včetně položek a příloh (na pozadí)
        deleteOrderV2(orderToDelete.id, token, username, true)
          .then(() => {
            showToast && showToast('Objednávka byla úplně smazána včetně všech příloh.', { type: 'success' });
          })
          .catch(error => {
            // Rollback - vrátit objednávku zpět
            setOrders(prevOrders => [...prevOrders, orderToDelete].sort((a, b) => b.id - a.id));
            const errorMsg = translateErrorMessageShort(error.message);
            showToast && showToast(`Chyba při mazání: ${errorMsg}`, { type: 'error' });
          });
      } else {
        // ✅ V2 API: Pouze označit jako neaktivní (soft delete, na pozadí)
        deleteOrderV2(orderToDelete.id, token, username)
          .then(() => {
            showToast && showToast('Objednávka byla označena jako neaktivní.', { type: 'success' });
          })
          .catch(error => {
            // Rollback - vrátit objednávku zpět
            setOrders(prevOrders => [...prevOrders, orderToDelete].sort((a, b) => b.id - a.id));
            const errorMsg = translateErrorMessageShort(error.message);
            showToast && showToast(`Chyba při mazání: ${errorMsg}`, { type: 'error' });
          });
      }

      // ❌ NEREFRESHOVAT loadData() - už jsme odebrali lokálně

      // Odešli broadcast událost pro aktualizaci menubar (objednávka byla smazána)
      broadcastDraftDeleted(user_id);

    } catch (error) {
      const errorMsg = translateErrorMessageShort(error.message);
      showToast && showToast(`Chyba při mazání objednávky: ${errorMsg}`, { type: 'error' });
    } finally {
      setShowDeleteConfirmModal(false);
      setOrderToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmModal(false);
    setOrderToDelete(null);
  };

  const performDelete = async (order, orderName) => {
    try {
      setLoading(true);

      // ✅ V2 API: soft delete
      await deleteOrderV2(order.id, token, username);

      // Refresh data after successful deletion
      await loadData();

      // Show success notification
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showNotification', {
          detail: {
            message: `Objednávka "${orderName}" byla označena jako neaktivní.`,
            type: 'success'
          }
        });
        window.dispatchEvent(event);
      }

    } catch (error) {
      // Error deleting order

      // Show error notification
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showNotification', {
          detail: {
            message: `Chyba při mazání objednávky: ${error.message}`,
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewOrder = async () => {
    // 🎯 KONTROLA AKTIVNÍHO DRAFTU - stejná logika jako v handleEdit
    // Zkontroluj, jestli existuje validní draft (pro rozhodnutí o confirm dialogu)
    draftManager.setCurrentUser(user_id);
    const hasDraft = await draftManager.hasDraft();

    let shouldShowConfirmDialog = false;
    let draftDataToStore = null;

    if (hasDraft) {
      try {
        const draftData = await draftManager.loadDraft();

        // Zkontroluj, jestli jsou v draftu platné změny
        const hasNewConcept = isValidConcept(draftData);
        const hasDbChanges = hasDraftChanges(draftData);
        shouldShowConfirmDialog = hasNewConcept || hasDbChanges;

        if (shouldShowConfirmDialog) {
          draftDataToStore = draftData; // Ulož pro zobrazení v modalu
        }
      } catch (error) {
        shouldShowConfirmDialog = false;
      }
    }

    // Rozhodni, zda zobrazit confirm dialog nebo vytvořit novou rovnou
    if (shouldShowConfirmDialog) {
      setCurrentDraftData(draftDataToStore); // Ulož draft data
      setOrderToEdit(null); // Jasně indikuj, že jde o NOVOU objednávku
      setShowEditConfirmModal(true);
    } else {
      // Žádný draft nebo prázdný draft - naviguj rovnou
      navigate('/order-form-25');
    }
  };

  const handleRefresh = async () => {
    //  FORCE REFRESH: Vymaž cache a načti z DB
    if (!token || !user?.username) return;

    // Reset background refresh stavu (uživatel kliknul manuálně)
    setIsBackgroundRefreshActive(false);
    setLastRefreshTime(new Date());

    try {
      // 1. Vymaž celou cache pro aktuálního uživatele (všechny filtry)
      ordersCacheService.invalidate(user_id);

      // 2. Vymaž i scroll state
      ordersCacheService.clearScrollState(user_id);

      // 3. Force reload z databáze
      setLoading(true);
      await loadData(true); // forceRefresh=true

      // 4. Trigger manuální refresh notifikací
      if (bgTasksContext?.triggerNotificationsRefresh) {
        bgTasksContext.triggerNotificationsRefresh();
      }

      // 5. Zobraz toast potvrzení
      showToast && showToast('Seznam objednávek byl obnoven z databáze', { type: 'success' });

    } catch (error) {
      showToast && showToast('Chyba při obnovení dat: ' + error.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    setUserStorage('orders25List_selectedYear', newYear);
    setIsYearDropdownOpen(false);
  };

  // Toggle year dropdown
  const toggleYearDropdown = () => {
    setIsYearDropdownOpen(prev => !prev);
  };

  // Close year dropdown when clicking outside
  useEffect(() => {
    if (!isYearDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (yearSelectRef.current && !yearSelectRef.current.contains(event.target)) {
        setIsYearDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isYearDropdownOpen]);

  const handleMonthChange = (newMonth) => {
    // Pokud uživatel vybere "show-more", jen zobraz další možnosti a nechej dropdown otevřený
    if (newMonth === 'show-more') {
      setShowExpandedMonths(true);
      // Necháme dropdown otevřený - neměníme isMonthDropdownOpen
      return;
    }

    // Pokud uživatel vybere "show-less", sbal zpět na základní možnosti
    if (newMonth === 'show-less') {
      setShowExpandedMonths(false);
      // Necháme dropdown otevřený - neměníme isMonthDropdownOpen
      return;
    }

    // Pro skutečný výběr měsíce - zavřeme dropdown
    setSelectedMonth(newMonth);
    setUserStorage('orders25List_selectedMonth', newMonth);
    setIsMonthDropdownOpen(false);
    
    // 🔥 KRITICKÉ: Vyčisti manuální datum filtry při změně měsíce
    // Když uživatel vybere "Aktuální měsíc", "Poslední měsíc", atd.,
    // nesmí se použít starší manuální datum filtry (dateFromFilter, dateToFilter)
    // Backend vrátí správná data podle roku/měsíce
    setDateFromFilter('');
    setDateToFilter('');
    
    // Vymaž také z localStorage aby se neobnovily při F5
    const sid = user_id || 'anon';
    try {
      localStorage.removeItem(`orders25_dateFrom_${sid}`);
      localStorage.removeItem(`orders25_dateTo_${sid}`);
    } catch (_) {}
  };

  // Handle show archived checkbox change
  const handleShowArchivedChange = (e) => {
    // Pokud je to událost z checkboxu, použij checked
    // Pokud je to kliknutí na div, toggleni hodnotu
    const newValue = e?.target?.type === 'checkbox' ? e.target.checked : !showArchived;

    setShowArchived(newValue);
    setUserStorage('orders25List_showArchived', newValue);
  };

  // Toggle month dropdown
  const toggleMonthDropdown = () => {
    setIsMonthDropdownOpen(prev => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isMonthDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (monthSelectRef.current && !monthSelectRef.current.contains(event.target)) {
        setIsMonthDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMonthDropdownOpen]);

  // Helper funkce pro získání datum_od a datum_do pro API
  const calculateDateRange = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    const currentDay = today.getDate();
    const year = selectedYear !== 'all' ? parseInt(selectedYear) : currentYear;

    // 🔥 FIX: Funkce pro formátování data v ČESKÉ časové zóně (ne UTC!)
    const formatDateLocal = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (selectedMonth) {
      case 'all':
        // Žádný měsíční filtr
        if (selectedYear !== 'all') {
          // Konkrétní rok - celý rok - používáme 'rok' parametr pro backend
          return {
            rok: year
          };
        }
        // Všechny roky - žádný datumový filtr
        return {};

      case 'current-month':
        // Aktuální měsíc: od 1. do dnes (např. 1.1.2026 - 5.1.2026)
        // ✅ Backend vrátí JEN aktuální měsíc (leden 2026), NE předchozí měsíce
        return {
          rok: currentYear,
          mesic: String(currentMonth + 1)
        };

      case 'last-month': {
        // Poslední měsíc: 30 dní od dnešního data zpět (např. 6.12.2025 - 5.1.2026)
        const lastMonthFrom = new Date(today);
        lastMonthFrom.setDate(lastMonthFrom.getDate() - 30);
        
        return {
          datum_od: formatDateLocal(lastMonthFrom),
          datum_do: formatDateLocal(today)
        };
      }

      case 'last-quarter': {
        // Poslední kvartál: 3 měsíce od dnešního data zpět (např. 5.10.2025 - 5.1.2026)
        const lastQuarterFrom = new Date(today);
        lastQuarterFrom.setMonth(lastQuarterFrom.getMonth() - 3);
        
        return {
          datum_od: formatDateLocal(lastQuarterFrom),
          datum_do: formatDateLocal(today)
        };
      }

      case 'last-half': {
        // Posledních 6 měsíců: 6 měsíců od dnešního data zpět (např. 5.7.2025 - 5.1.2026)
        const lastHalfFrom = new Date(today);
        lastHalfFrom.setMonth(lastHalfFrom.getMonth() - 6);
        
        return {
          datum_od: formatDateLocal(lastHalfFrom),
          datum_do: formatDateLocal(today)
        };
      }

      case 'last-year': {
        // Poslední rok: 12 měsíců od dnešního data zpět (např. 5.1.2025 - 5.1.2026)
        const lastYearFrom = new Date(today);
        lastYearFrom.setMonth(lastYearFrom.getMonth() - 12);
        
        return {
          datum_od: formatDateLocal(lastYearFrom),
          datum_do: formatDateLocal(today)
        };
      }

      default: {
        // Konkrétní měsíc nebo rozsah (např. "1", "1-3", "10-12")
        if (selectedYear === 'all') {
          // Pokud není vybrán rok, nefiltrujeme
          return {};
        }

        const monthMatch = selectedMonth.match(/^(\d+)(?:-(\d+))?$/);
        if (monthMatch) {
          const startMonth = parseInt(monthMatch[1]);
          const endMonth = monthMatch[2] ? parseInt(monthMatch[2]) : startMonth;

          // Backend akceptuje 'rok' a 'mesic' (např. "10" nebo "10-12")
          return {
            rok: year,
            mesic: endMonth === startMonth ? `${startMonth}` : `${startMonth}-${endMonth}`
          };
        }
        
        return {};
      }
    }
  };

  // Helper funkce pro získání názvu měsíce
  const getMonthLabel = (value) => {
    const labels = {
      'all': 'Všechny měsíce',
      'current-month': 'Aktuální měsíc',
      'last-month': 'Poslední měsíc',
      'last-quarter': 'Poslední kvartál',
      'last-half': 'Poslední půlrok',
      'last-year': 'Poslední rok',
      '1': 'Leden',
      '2': 'Únor',
      '3': 'Březen',
      '4': 'Duben',
      '5': 'Květen',
      '6': 'Červen',
      '7': 'Červenec',
      '8': 'Srpen',
      '9': 'Září',
      '10': 'Říjen',
      '11': 'Listopad',
      '12': 'Prosinec',
      '1-3': 'Q1 (Leden-Březen)',
      '4-6': 'Q2 (Duben-Červen)',
      '7-9': 'Q3 (Červenec-Září)',
      '10-12': 'Q4 (Říjen-Prosinec)'
    };
    return labels[value] || value;
  };

  // Helper funkce pro získání seznamu roků
  const getYearsList = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2016;
    const years = []; // Začni bez "Všechny roky"

    // Generuj roky od 2016 do současnosti (vzestupně)
    for (let year = startYear; year <= currentYear; year++) {
      years.push(year);
    }

    // Pokud je současný rok menší než 2016, přidej ho
    if (currentYear < startYear) {
      years.push(currentYear);
    }

    // Vrať roky v sestupném pořadí (nejnovější nahoře), "Všechny" až na konci
    const numericYears = years.sort((a, b) => b - a);
    return [...numericYears, 'all']; // "Všechny roky" na konci
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      // Načti aktuální nastavení sloupců z databáze
      const { fetchUserSettings } = await import('../services/userSettingsApi');
      const userSettingsFromDB = await fetchUserSettings({ 
        token, 
        username, 
        userId: currentUserId 
      });
      
      const csvColumns = userSettingsFromDB?.export_csv_sloupce || {};
      
      // Načti nastavení multiline/list oddělovače z profilu
      const listDelimiterMap = {
        'pipe': '|',
        'comma': ',',
        'semicolon': ';',
        'custom': userSettingsFromDB?.exportCsvListCustomDelimiter || '|'
      };
      const listSeparator = listDelimiterMap[userSettingsFromDB?.exportCsvListDelimiter || 'pipe'] || '|';
      
      // Připrav aktuální filtry pro backend (jen filtrovaná data)
      const currentFilters = {
        columnFilters,
        multiselectFilters,
        globalFilter,
        statusFilter,
        userFilter,
        dateFromFilter,
        dateToFilter,
        amountFromFilter,
        amountToFilter,
        filterMaBytZverejneno,
        filterByloZverejneno,
        filterMimoradneObjednavky,
        filterWithInvoices,
        filterWithAttachments,
        showOnlyMyOrders,
        selectedYear,
        selectedMonth,
        showArchived
      };
      
      // Připrav payload s nastavením pro backend
      const exportPayload = {
        token,
        username,
        filters: currentFilters,
        export_settings: {
          csv_columns: csvColumns,
          list_delimiter: listSeparator
        }
      };
      
      // TODO: Volání na backend endpoint pro export s nastavením
      // const exportResponse = await api25orders.post('orders25/export', exportPayload);
      // Pro nyní zachovám stávající logiku s načtenými nastavením z DB
      
      const csvColumnsFromDB = csvColumns;
    
    //  Helper: Bezpečné získání hodnoty s fallbackem
    const safeGet = (value, fallback = '') => {
      if (value === null || value === undefined) return fallback;
      if (typeof value === 'object') {
        // Objekt konvertovat na JSON string (nebezpečné pro React rendering)
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      return String(value);
    };
    
    //  Helper: Formátování jména uživatele z enriched dat
    const formatUserName = (user) => {
      if (!user) return '';
      const titul_pred = user.titul_pred ? user.titul_pred + ' ' : '';
      const jmeno = user.jmeno || '';
      const prijmeni = user.prijmeni || '';
      const titul_za = user.titul_za ? ', ' + user.titul_za : '';
      return `${titul_pred}${jmeno} ${prijmeni}${titul_za}`.trim().replace(/\s+/g, ' ');
    };
    
    const exportData = filteredData.map(order => {
      const enriched = order._enriched || {};
      const row = {};

      // Získáme způsob financování z JSON struktury
      const financovaniKodyMap = {
        'SMLOUVA': 'Smlouva',
        'INDIVIDUALNI_SCHVALENI': 'Individuální schválení',
        'POKLADNA': 'Pokladna',
        'LP': 'Limitovaný příslib',
        'POJISTNA_UDALOST': 'Pojistná událost'
      };

      let zpusobFinancovani = '';
      let finData = null;

      // OPRAVA: order.financovani už je objekt (ne JSON string!)
      if (order.financovani && typeof order.financovani === 'object') {
        finData = order.financovani;
      } else if (order.financovani_parsed && typeof order.financovani_parsed === 'object') {
        finData = order.financovani_parsed;
      } else if (order.financovani && typeof order.financovani === 'string') {
        try {
          finData = JSON.parse(order.financovani);
        } catch {
          // Pokud není JSON, je to jen string hodnota
          zpusobFinancovani = order.financovani;
        }
      } else if (order.zpusob_financovani) {
        if (typeof order.zpusob_financovani === 'string') {
          try {
            finData = JSON.parse(order.zpusob_financovani);
          } catch {
            zpusobFinancovani = order.zpusob_financovani;
          }
        } else if (typeof order.zpusob_financovani === 'object') {
          finData = order.zpusob_financovani;
        }
      }

      // Pokud máme parsovaná data, extrahujeme nazev_stavu nebo mapujeme kod_stavu
      if (finData && typeof finData === 'object') {
        const financovaniValue = finData.nazev_stavu ||
                               (finData.kod_stavu ? financovaniKodyMap[finData.kod_stavu] : null) ||
                               finData.nazev || finData.label || '';
        zpusobFinancovani = String(financovaniValue || ''); // Zajisti, že je to vždy string
      }
      
      // Zajisti, že zpusobFinancovani je vždy string
      zpusobFinancovani = String(zpusobFinancovani || '');

      // 🎯 DYNAMICKÉ SLOUPCE PODLE NASTAVENÍ V PROFILU

      // Základní identifikace
      if (csvColumnsFromDB.id) row['ID'] = safeGet(order.id);
      if (csvColumnsFromDB.cislo_objednavky) row['Číslo objednávky'] = safeGet(order.cislo_objednavky);
      
      // Předmět a popis
      if (csvColumnsFromDB.predmet) row['Předmět'] = safeGet(order.predmet);
      if (csvColumnsFromDB.poznamka) row['Poznámka'] = safeGet(order.poznamka);
      
      // Stavy
      if (csvColumnsFromDB.stav_objednavky) {
        // Použij přímo stav_objednavky z order (obsahuje český název)
        row['Stav objednávky'] = safeGet(order.stav_objednavky) || getOrderDisplayStatus(order);
      }
      if (csvColumnsFromDB.stav_workflow) {
        row['Workflow stavy'] = enriched.stav_workflow 
          ? (Array.isArray(enriched.stav_workflow) 
              ? enriched.stav_workflow.map(s => s.nazev_stavu || s.nazev || '').filter(Boolean).join(listSeparator)
              : (enriched.stav_workflow.nazev_stavu || enriched.stav_workflow.nazev || ''))
          : '';
      }
      if (csvColumnsFromDB.stav_komentar) row['Komentář ke stavu'] = safeGet(order.stav_komentar);
      
      // Datumy - použití formatDateOnly pro konzistentní formátování
      if (csvColumnsFromDB.dt_objednavky) row['Datum objednávky'] = getOrderDate(order) ? formatDateOnly(getOrderDate(order)) : '';
      if (csvColumnsFromDB.dt_vytvoreni) row['Datum vytvoření'] = order.dt_vytvoreni ? formatDateOnly(order.dt_vytvoreni) : '';
      if (csvColumnsFromDB.dt_schvaleni) row['Datum schválení'] = order.dt_schvaleni ? formatDateOnly(order.dt_schvaleni) : '';
      if (csvColumnsFromDB.dt_odeslani) row['Datum odeslání'] = order.dt_odeslani ? formatDateOnly(order.dt_odeslani) : '';
      if (csvColumnsFromDB.dt_akceptace) row['Datum akceptace'] = order.dt_akceptace ? formatDateOnly(order.dt_akceptace) : '';
      if (csvColumnsFromDB.dt_zverejneni) row['Datum zveřejnění'] = order.dt_zverejneni ? formatDateOnly(order.dt_zverejneni) : '';
      if (csvColumnsFromDB.dt_predpokladany_termin_dodani) row['Předpokl. termín dodání'] = order.predpokladany_termin_dodani ? formatDateOnly(order.predpokladany_termin_dodani) : '';
      if (csvColumnsFromDB.dt_aktualizace) row['Datum aktualizace'] = order.dt_aktualizace ? formatDateOnly(order.dt_aktualizace) : '';
      
      // Finanční údaje - ošetření NaN hodnot
      if (csvColumnsFromDB.max_cena_s_dph) row['Max. cena s DPH'] = parseFloat(order.max_cena_s_dph) || 0;

      
      // LP kódy a názvy z financovani JSON
      if (csvColumnsFromDB.financovani_lp_kody) {
        // Skutečné názvy polí: lp_kody (ne lp_kod!) nebo doplnujici_data.lp_kod
        const lpKody = finData?.lp_kody || finData?.doplnujici_data?.lp_kod;
        
        row['LP kódy'] = lpKody 
          ? (Array.isArray(lpKody) ? lpKody.join(listSeparator) : String(lpKody)) 
          : '';
      }
      if (csvColumnsFromDB.financovani_lp_nazvy) {
        // Extrahuj lp_nazvy z financovani objektu
        const lpNazvy = finData?.lp_nazvy;
        
        if (lpNazvy && Array.isArray(lpNazvy)) {
          // lp_nazvy je array objektů s názvem
          const nazvy = lpNazvy.map(nazev => 
            typeof nazev === 'object' && nazev.nazev ? nazev.nazev : String(nazev)
          );
          row['LP názvy'] = nazvy.join(listSeparator);
        } else {
          row['LP názvy'] = '';
        }
      }
      if (csvColumnsFromDB.financovani_lp_cisla) {
        // lp_kody obsahují přímo čísla LP
        const lpKody = finData?.lp_kody || finData?.doplnujici_data?.lp_kod;
        row['LP čísla'] = lpKody 
          ? (Array.isArray(lpKody) ? lpKody.join(listSeparator) : String(lpKody)) 
          : '';
      }
      if (csvColumnsFromDB.financovani_typ) {
        // Skutečné pole: typ (ne .typ!) nebo kod_stavu
        const typValue = finData?.typ || finData?.kod_stavu;
        row['Typ financování'] = String(typValue || '');
      }
      if (csvColumnsFromDB.financovani_typ_nazev) {
        // Přímý název typu z financovani objektu
        const nazevValue = finData?.typ_nazev || finData?.nazev_stavu || 
                          (finData?.kod_stavu ? financovaniKodyMap[finData.kod_stavu] : null);
        row['Název typu financování'] = String(nazevValue || zpusobFinancovani || '');
      }
      
      // Pojišťovací údaje - z root objektu i z financovani JSON
      if (csvColumnsFromDB.pojistna_udalost_cislo) {
        row['Číslo pojistné události'] = safeGet(order.pojistna_udalost_cislo) || safeGet(finData?.pojistna_udalost_cislo) || '';
      }
      if (csvColumnsFromDB.pojistna_udalost_poznamka) {
        row['Poznámka k pojišťovacím údajům'] = safeGet(order.pojistna_udalost_poznamka) || safeGet(finData?.pojistna_udalost_poznamka) || '';
      }
      
      // Smlouvy a individuální schválení
      if (csvColumnsFromDB.cislo_smlouvy) {
        row['Číslo smlouvy'] = safeGet(order.cislo_smlouvy) || safeGet(finData?.cislo_smlouvy) || '';
      }
      if (csvColumnsFromDB.individualni_schvaleni) {
        const individualniSchvaleni = order.individualni_schvaleni || finData?.individualni_schvaleni;
        row['Individuální schválení'] = (individualniSchvaleni === 1 || individualniSchvaleni === '1' || individualniSchvaleni === true) ? 'Ano' : 'Ne';
      }
      if (csvColumnsFromDB.individualni_poznamka) {
        row['Poznámka k individuálnímu schválení'] = safeGet(order.individualni_poznamka) || safeGet(finData?.individualni_poznamka) || '';
      }
      if (csvColumnsFromDB.financovani_raw) {
        const rawValue = order.financovani;
        row['Financování (raw JSON)'] = typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue || '');
      }
      
      // Odpovědné osoby - použití enriched dat s formátovacím helperem
      if (csvColumnsFromDB.uzivatel) {
        row['Objednatel'] = enriched.uzivatel
          ? formatUserName(enriched.uzivatel)
          : getUserDisplayName(order.uzivatel_id);
      }
      if (csvColumnsFromDB.uzivatel_email) row['Objednatel email'] = safeGet(enriched.uzivatel?.email);
      if (csvColumnsFromDB.uzivatel_telefon) row['Objednatel telefon'] = safeGet(enriched.uzivatel?.telefon);
      if (csvColumnsFromDB.garant_uzivatel) row['Garant'] = enriched.garant_uzivatel ? formatUserName(enriched.garant_uzivatel) : '';
      if (csvColumnsFromDB.garant_uzivatel_email) row['Garant email'] = safeGet(enriched.garant_uzivatel?.email);
      if (csvColumnsFromDB.garant_uzivatel_telefon) row['Garant telefon'] = safeGet(enriched.garant_uzivatel?.telefon);
      if (csvColumnsFromDB.schvalovatel) row['Schvalovatel'] = enriched.schvalovatel ? formatUserName(enriched.schvalovatel) : '';
      if (csvColumnsFromDB.schvalovatel_email) row['Schvalovatel email'] = safeGet(enriched.schvalovatel?.email);
      if (csvColumnsFromDB.schvalovatel_telefon) row['Schvalovatel telefon'] = safeGet(enriched.schvalovatel?.telefon);
      if (csvColumnsFromDB.prikazce) row['Příkazce'] = enriched.prikazce_po ? formatUserName(enriched.prikazce_po) : '';
      if (csvColumnsFromDB.prikazce_email) row['Příkazce email'] = safeGet(enriched.prikazce_po?.email);
      if (csvColumnsFromDB.prikazce_telefon) row['Příkazce telefon'] = safeGet(enriched.prikazce_po?.telefon);
      if (csvColumnsFromDB.vytvoril_uzivatel) row['Vytvořil'] = enriched.vytvoril_uzivatel ? formatUserName(enriched.vytvoril_uzivatel) : '';
      if (csvColumnsFromDB.odesilatel) row['Odesílatel'] = enriched.odesilatel ? formatUserName(enriched.odesilatel) : '';
      if (csvColumnsFromDB.dokoncil) row['Dokončil'] = enriched.dokoncil ? formatUserName(enriched.dokoncil) : '';
      if (csvColumnsFromDB.fakturant) row['Fakturant'] = enriched.fakturant ? formatUserName(enriched.fakturant) : '';
      if (csvColumnsFromDB.zverejnil_uzivatel) row['Zveřejnil'] = enriched.zverejnil_uzivatel ? formatUserName(enriched.zverejnil_uzivatel) : '';
      
      // Dodavatel
      if (csvColumnsFromDB.dodavatel_nazev) row['Dodavatel'] = safeGet(order.dodavatel_nazev);
      if (csvColumnsFromDB.dodavatel_ico) row['Dodavatel IČO'] = safeGet(order.dodavatel_ico);
      if (csvColumnsFromDB.dodavatel_dic) row['Dodavatel DIČ'] = safeGet(order.dodavatel_dic);
      if (csvColumnsFromDB.dodavatel_adresa) row['Dodavatel adresa'] = safeGet(order.dodavatel_adresa);
      if (csvColumnsFromDB.dodavatel_zastoupeny) row['Dodavatel zastoupený'] = safeGet(order.dodavatel_zastoupeny);
      if (csvColumnsFromDB.dodavatel_kontakt_jmeno) row['Dodavatel kontakt jméno'] = safeGet(order.dodavatel_kontakt_jmeno);
      if (csvColumnsFromDB.dodavatel_kontakt_email) row['Dodavatel kontakt email'] = safeGet(order.dodavatel_kontakt_email);
      if (csvColumnsFromDB.dodavatel_kontakt_telefon) row['Dodavatel kontakt telefon'] = safeGet(order.dodavatel_kontakt_telefon);
      
      // Střediska - ošetření různých zdrojů dat (exportuje NÁZVY, ne kódy)
      if (csvColumnsFromDB.strediska_kod) {
        row['Střediska (kódy)'] = safeGet(order.strediska_kod);
      }
      if (csvColumnsFromDB.strediska_nazvy) {
        row['Střediska (názvy)'] = enriched.strediska && Array.isArray(enriched.strediska) && enriched.strediska.length > 0
          ? enriched.strediska.map(s => s.nazev || s.kod || '').filter(Boolean).join(listSeparator)
          : (Array.isArray(order.strediska_kod) ? order.strediska_kod.map(kod => getStrediskoNazev(kod) || kod).filter(Boolean).join(listSeparator) : '');
      }
      if (csvColumnsFromDB.druh_objednavky_kod) row['Druh objednávky'] = safeGet(enriched.druh_objednavky?.nazev || order.druh_objednavky_kod);
      if (csvColumnsFromDB.stav_workflow_kod) row['Stav workflow kód'] = safeGet(order.stav_workflow_kod);
      if (csvColumnsFromDB.mimoradna_udalost) row['Mimořádná událost'] = (order.mimoradna_udalost === 1 || order.mimoradna_udalost === true) ? 'Ano' : 'Ne';
      
      // Položky - bezpečné zpracování arrays
      if (csvColumnsFromDB.pocet_polozek) row['Počet položek'] = (order.polozky && Array.isArray(order.polozky)) ? order.polozky.length : 0;
      if (csvColumnsFromDB.polozky_celkova_cena_s_dph) row['Položky celková cena s DPH'] = getOrderTotalPriceWithDPH(order);
      if (csvColumnsFromDB.polozky_popis) {
        row['Položky popis'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => safeGet(p.popis)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.polozky_cena_bez_dph) {
        row['Položky cena bez DPH'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => parseFloat(p.cena_bez_dph) || 0).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.polozky_sazba_dph) {
        row['Položky sazba DPH'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => (p.sazba_dph || 0) + '%').join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.polozky_cena_s_dph) {
        row['Položky cena s DPH'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => parseFloat(p.cena_s_dph) || 0).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.polozky_usek_kod) {
        row['Položky úsek kód'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => safeGet(p.usek_kod)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.polozky_budova_kod) {
        row['Položky budova kód'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => safeGet(p.budova_kod)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.polozky_mistnost_kod) {
        row['Položky místnost kód'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => safeGet(p.mistnost_kod)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.polozky_poznamka) {
        row['Položky poznámka'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => safeGet(p.poznamka)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.polozky_poznamka_umisteni) {
        row['Položky poznámka umístění'] = (order.polozky && Array.isArray(order.polozky))
          ? order.polozky.map(p => safeGet(p.poznamka_umisteni)).filter(Boolean).join(listSeparator)
          : '';
      }
      
      // Přílohy
      if (csvColumnsFromDB.prilohy_count) {
        row['Počet příloh'] = (order.prilohy && Array.isArray(order.prilohy)) ? order.prilohy.length : 0;
      }
      if (csvColumnsFromDB.prilohy_guid) {
        row['Přílohy GUID'] = (order.prilohy && Array.isArray(order.prilohy))
          ? order.prilohy.map(p => safeGet(p.guid)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.prilohy_typ) {
        row['Přílohy typ'] = (order.prilohy && Array.isArray(order.prilohy))
          ? order.prilohy.map(p => safeGet(p.typ_prilohy)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.prilohy_nazvy) {
        row['Přílohy názvy'] = (order.prilohy && Array.isArray(order.prilohy))
          ? order.prilohy.map(p => safeGet(p.nazev || p.originalni_nazev || p.originalni_nazev_souboru)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.prilohy_velikosti) {
        row['Přílohy velikosti'] = (order.prilohy && Array.isArray(order.prilohy))
          ? order.prilohy.map(p => safeGet(p.velikost_souboru_b) || 0).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.prilohy_nahrano_uzivatel) {
        row['Přílohy nahráno uživatel'] = (order.prilohy && Array.isArray(order.prilohy))
          ? order.prilohy.map(p => safeGet(p.nahrano_uzivatel_celne_jmeno)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.prilohy_dt_vytvoreni) {
        row['Přílohy datum vytvoření'] = (order.prilohy && Array.isArray(order.prilohy))
          ? order.prilohy.map(p => safeGet(p.dt_vytvoreni)).filter(Boolean).join(listSeparator)
          : '';
      }
      
      // Faktury - bezpečné zpracování
      if (csvColumnsFromDB.faktury_count) {
        row['Počet faktur'] = (order.faktury && Array.isArray(order.faktury)) ? order.faktury.length : 0;
      }
      if (csvColumnsFromDB.faktury_celkova_castka) {
        const totalInvoices = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.reduce((sum, f) => sum + (parseFloat(f.fa_castka) || 0), 0)
          : 0;
        row['Faktury celková částka'] = totalInvoices;
      }
      if (csvColumnsFromDB.faktury_cisla_vema) {
        row['Faktury čísla VEMA'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => safeGet(f.fa_cislo_vema)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.faktury_stav) {
        row['Faktury stav'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => safeGet(f.stav)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.faktury_datum_vystaveni) {
        row['Faktury datum vystavení'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => safeGet(f.fa_datum_vystaveni)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.faktury_datum_splatnosti) {
        row['Faktury datum splatnosti'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => safeGet(f.fa_datum_splatnosti)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.faktury_datum_doruceni) {
        row['Faktury datum doručení'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => safeGet(f.fa_datum_doruceni)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.faktury_strediska_kod) {
        row['Faktury střediska'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => Array.isArray(f.fa_strediska_kod) ? f.fa_strediska_kod.join(',') : safeGet(f.fa_strediska_kod)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.faktury_poznamka) {
        row['Faktury poznámka'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => safeGet(f.fa_poznamka)).filter(Boolean).join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.faktury_dorucena) {
        row['Faktury doručena'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => (f.fa_dorucena === 1 || f.fa_dorucena === '1' || f.fa_dorucena === true) ? 'Ano' : 'Ne').join(listSeparator)
          : '';
      }
      if (csvColumnsFromDB.faktury_zaplacena) {
        row['Faktury zaplacena'] = (order.faktury && Array.isArray(order.faktury))
          ? order.faktury.map(f => (f.fa_zaplacena === 1 || f.fa_zaplacena === '1' || f.fa_zaplacena === true) ? 'Ano' : 'Ne').join(listSeparator)
          : '';
      }
      
      // Registr smluv a ostatní
      if (csvColumnsFromDB.zverejnit) row['Zveřejnit v registru'] = safeGet(order.zverejnit);
      if (csvColumnsFromDB.registr_iddt) row['Registr IDDT'] = safeGet(order.registr_iddt);
      if (csvColumnsFromDB.zaruka) row['Záruka'] = safeGet(order.zaruka);
      if (csvColumnsFromDB.misto_dodani) row['Místo dodání'] = safeGet(order.misto_dodani);
      if (csvColumnsFromDB.schvaleni_komentar) row['Schválení komentář'] = safeGet(order.schvaleni_komentar);
      if (csvColumnsFromDB.dokonceni_poznamka) row['Dokončení poznámka'] = safeGet(order.dokonceni_poznamka);
      if (csvColumnsFromDB.potvrzeni_dokonceni_objednavky) row['Potvrzení dokončení objednávky'] = (order.potvrzeni_dokonceni_objednavky === 1 || order.potvrzeni_dokonceni_objednavky === true) ? 'Ano' : 'Ne';
      if (csvColumnsFromDB.potvrzeni_vecne_spravnosti) row['Potvrzení věcné správnosti'] = (order.potvrzeni_vecne_spravnosti === 1 || order.potvrzeni_vecne_spravnosti === true) ? 'Ano' : 'Ne';
      if (csvColumnsFromDB.vecna_spravnost_poznamka) row['Věcná správnost poznámka'] = safeGet(order.vecna_spravnost_poznamka);
      if (csvColumnsFromDB.dt_dokonceni) row['Datum dokončení'] = order.dt_dokonceni ? formatDateOnly(order.dt_dokonceni) : '';

      return row;
    });

    // Převod exportCsvDelimiter na skutečný separátor
    const delimiterMap = {
      'semicolon': ';',
      'tab': '\t',
      'pipe': '|',
      'custom': userSettingsFromDB?.exportCsvCustomDelimiter || ';'
    };
    
    const separator = delimiterMap[userSettingsFromDB?.exportCsvDelimiter || 'semicolon'] || ';';
    
    // Připrav data pro náhled a zobraz modal
    const columnCount = Object.keys(exportData[0] || {}).length;
    const separatorName = userSettingsFromDB?.exportCsvDelimiter === 'tab' ? 'Tabulátor' : 
                          userSettingsFromDB?.exportCsvDelimiter === 'pipe' ? 'Svislítko (|)' :
                          userSettingsFromDB?.exportCsvDelimiter === 'custom' ? `Vlastní (${userSettingsFromDB?.exportCsvCustomDelimiter || ';'})` :
                          'Středník (;)';
    
    // Multiline/list oddělovač z nastavení (už načteno výše v handleExport)
    const multilineSeparator = listSeparator;
    const multilineSeparatorName = userSettingsFromDB?.exportCsvListDelimiter === 'comma' ? 'Čárka (,)' :
                                    userSettingsFromDB?.exportCsvListDelimiter === 'semicolon' ? 'Středník (;)' :
                                    userSettingsFromDB?.exportCsvListDelimiter === 'custom' ? `Vlastní (${userSettingsFromDB?.exportCsvListCustomDelimiter || '|'})` :
                                    'Svislítko (|)';
    
    // Spočítej jen aktivní sloupce pro preview
    const activeColumnCount = Object.values(csvColumnsFromDB).filter(Boolean).length;
    
    setExportPreviewData({
      data: exportData,
      separator,
      separatorName,
      multilineSeparator,
      multilineSeparatorName,
      columnCount: activeColumnCount,
      rowCount: exportData.length,
      csvColumnsFromDB // Přidej nastavení pro preview modal
    });
    setShowExportPreview(true);
    
    } catch (error) {
      console.error('Chyba při exportu:', error);
      showToast('Chyba při načítání nastavení exportu: ' + (error.message || error), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Funkce pro finální export (volána z preview modalu)
  const handleConfirmExport = () => {
    if (!exportPreviewData) return;
    
    exportCsv(exportPreviewData.data, 'objednavky_2025', { 
      separator: exportPreviewData.separator,
      includeBOM: true // UTF-8 BOM pro správné zobrazení v Excelu
    });
    
    setShowExportPreview(false);
    setExportPreviewData(null);
    showToast('Export byl úspěšně stažen', 'success');
  };

  // Pomocné funkce pro formátování částek s oddělovači tisíců
  const formatNumberWithSpaces = (value) => {
    if (!value) return '';
    // Odstraň všechny mezery a nečíselné znaky kromě čárky a tečky
    const numericValue = value.toString().replace(/[^\d]/g, '');
    if (!numericValue) return '';

    // Přidej mezery jako oddělovače tisíců
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const parseFormattedNumber = (value) => {
    if (!value) return '';
    // Odstraň mezery a vrať čistě číselnou hodnotu
    return value.toString().replace(/\s/g, '');
  };

  const handleAmountFromChange = (e) => {
    const rawValue = e.target.value;
    const numericValue = parseFormattedNumber(rawValue);
    setAmountFromFilter(numericValue);
  };

  const handleAmountToChange = (e) => {
    const rawValue = e.target.value;
    const numericValue = parseFormattedNumber(rawValue);
    setAmountToFilter(numericValue);
  };

  const clearFilters = () => {
    // 🔧 Vymaž column filtry (volá clearColumnFilters logiku)
    clearColumnFilters();
    
    // 🔧 Dodatečné filtry, které clearColumnFilters() neresetuje
    setGlobalFilter('');
    setUserFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setAmountFromFilter('');
    setAmountToFilter('');
    setActiveStatusFilter(null); // Zruš také aktivní filter z dlaždic (dashboard karty)
    
    // ⚠️ ROK a MĚSÍC se NERESETUJE - jsou uložené v profilu uživatele
    // setSelectedYear() - NEMĚNÍME
    // setSelectedMonth() - NEMĚNÍME
    
    // 🔧 Reset dalších filtrů
    setFilterMaBytZverejneno(false);
    setFilterByloZverejneno(false);
    setFilterMimoradneObjednavky(false);
    setFilterWithInvoices(false);
    setFilterWithAttachments(false);
    setShowArchived(false);
    setShowOnlyMyOrders(false);

    // Vymaž všechny filtry z localStorage (používáme getUserKey pro user-specific klíče)
    localStorage.removeItem(getUserKey('orders25List_globalFilter'));
    localStorage.removeItem(getUserKey('orders25List_userFilter'));
    localStorage.removeItem(getUserKey('orders25_dateFrom'));
    localStorage.removeItem(getUserKey('orders25_dateTo'));
    localStorage.removeItem(getUserKey('orders25List_amountFrom'));
    localStorage.removeItem(getUserKey('orders25List_amountTo'));
    localStorage.removeItem(getUserKey('orders25List_activeStatusFilter'));
    // ⚠️ ROK a MĚSÍC se z localStorage NEMAŽOU - jsou pevně nastavené
    // localStorage.removeItem(getUserKey('orders25List_selectedYear')); - NEMAZEME
    // localStorage.removeItem(getUserKey('orders25List_selectedMonth')); - NEMAZEME
    localStorage.removeItem(getUserKey('orders25List_filterMaBytZverejneno')); // 🔧 Vymaž filtr zveřejnění
    localStorage.removeItem(getUserKey('orders25List_filterByloZverejneno')); // 🔧 Vymaž filtr zveřejnění
    localStorage.removeItem(getUserKey('orders25List_filterMimoradneObjednavky')); // 🔧 Vymaž filtr mimořádných objednávek
    localStorage.removeItem(getUserKey('orders25List_showArchived')); // 🔧 Vymaž filtr archivovaných
    localStorage.removeItem(getUserKey('orders25List_showOnlyMyOrders')); // 🔧 Vymaž filtr "jen moje"
  };

  // Handlery pro jednoduché filtrování přes globalFilter
  const handleStatusFilterChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected && options[i].value) {
        selected.push(options[i].value);
      }
    }
    setStatusFilter(selected);
    setUserStorage('orders25List_statusFilter', selected);
  };

  const handleObjednatelChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected && options[i].value) {
        selected.push(options[i].value);
      }
    }

    setSelectedObjednatel(selected);
    setUserStorage('orders25List_selectedObjednatel', selected);

    // Ulož vybraná ID oddělená | do MULTISELECT filtru (ne do columnFilters!)
    if (selected.length === 0) {
      setMultiselectFilters(prev => ({ ...prev, objednatel: '' }));
    } else {
      // Ulož ID oddělená |
      const filterValue = selected.join('|');
      setMultiselectFilters(prev => ({ ...prev, objednatel: filterValue }));
    }
  };

  const handleGarantChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected && options[i].value) {
        selected.push(options[i].value);
      }
    }

    setSelectedGarant(selected);
    setUserStorage('orders25List_selectedGarant', selected);

    // Ulož vybraná ID oddělená | do MULTISELECT filtru
    if (selected.length === 0) {
      setMultiselectFilters(prev => ({ ...prev, garant: '' }));
    } else {
      const filterValue = selected.join('|');
      setMultiselectFilters(prev => ({ ...prev, garant: filterValue }));
    }
  };

  const handleSchvalovatelChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected && options[i].value) {
        selected.push(options[i].value);
      }
    }

    setSelectedSchvalovatel(selected);
    setUserStorage('orders25List_selectedSchvalovatel', selected);

    // Ulož vybraná ID oddělená | do MULTISELECT filtru
    if (selected.length === 0) {
      setMultiselectFilters(prev => ({ ...prev, schvalovatel: '' }));
    } else {
      const filterValue = selected.join('|');
      setMultiselectFilters(prev => ({ ...prev, schvalovatel: filterValue }));
    }
  };

  const handlePrikazceChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected && options[i].value) {
        selected.push(options[i].value);
      }
    }

    setSelectedPrikazce(selected);
    setUserStorage('orders25List_selectedPrikazce', selected);

    // Ulož vybraná ID oddělená | do MULTISELECT filtru
    if (selected.length === 0) {
      setMultiselectFilters(prev => ({ ...prev, prikazce: '' }));
    } else {
      const filterValue = selected.join('|');
      setMultiselectFilters(prev => ({ ...prev, prikazce: filterValue }));
    }
  };

  const clearColumnFilters = () => {
    // Vymaž vyhledávací pole v hlavičce tabulky
    const emptyFilters = {
      dt_objednavky: '',
      cislo_objednavky: '',
      predmet: '',
      objednatel: '',
      stav_objednavky: '',
      max_cena_s_dph: '',
      garant: '',
      prikazce: '',
      schvalovatel: ''
    };
    
    // Clear debounce timeout
    if (columnFilterTimeoutRef.current) {
      clearTimeout(columnFilterTimeoutRef.current);
    }
    
    setColumnFilters(emptyFilters);
    setLocalColumnFilters(emptyFilters);
    setUserStorage('orders25List_columnFilters', emptyFilters);

    // 🐛 FIX: Vymaž také multiselect filtry
    const emptyMultiselectFilters = {
      objednatel: '',
      garant: '',
      prikazce: '',
      schvalovatel: ''
    };
    setMultiselectFilters(emptyMultiselectFilters);
    setUserStorage('orders25List_multiselectFilters', emptyMultiselectFilters);

    // Reset selectů v rozšířeném filtru - prázdná pole místo prázdných stringů
    setSelectedObjednatel([]);
    setSelectedGarant([]);
    setSelectedPrikazce([]);
    setSelectedSchvalovatel([]);
    setStatusFilter([]);

    // 🐛 FIX: Resetuj také approvalFilter (Ke schválení/Vyřízené)
    setApprovalFilter([]);

    // Vymaž také z localStorage
    setUserStorage('orders25List_selectedObjednatel', []);
    setUserStorage('orders25List_selectedGarant', []);
    setUserStorage('orders25List_selectedPrikazce', []);
    setUserStorage('orders25List_selectedSchvalovatel', []);
    setUserStorage('orders25List_statusFilter', []);
    setUserStorage('orders25List_approvalFilter', []);
  };

  // Funkce pro vymazání jednotlivých filtrů
  const clearStatusFilter = () => {
    setStatusFilter([]);
    setUserStorage('orders25List_statusFilter', []);
  };

  // Funkce pro načtení vlastního filtru z DB (userSettings)
  const loadCustomStatusFilter = () => {
    try {
      // Vyčistit localStorage cache (používá getUserKey formát: baseKey_user_userId)
      const cacheKey = getUserKey('orders25List_statusFilter');
      localStorage.removeItem(cacheKey);
      
      // Načíst z userSettings (DB)
      const userSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
      if (userSettings?.vychozi_filtry_stavu_objednavek && Array.isArray(userSettings.vychozi_filtry_stavu_objednavek)) {
        const customFilter = userSettings.vychozi_filtry_stavu_objednavek;
        setStatusFilter(customFilter);
        setUserStorage('orders25List_statusFilter', customFilter);
        
        if (showToast) {
          showToast(`Načten vlastní filtr stavů (${customFilter.length} ${customFilter.length === 1 ? 'stav' : customFilter.length < 5 ? 'stavy' : 'stavů'})`, 'success');
        }
      } else {
        if (showToast) {
          showToast('Vlastní filtr stavů není nastaven. Nastavte ho v Profilu → Nastavení.', 'info');
        }
      }
    } catch (e) {
      console.error('Chyba při načítání vlastního filtru:', e);
      if (showToast) {
        showToast('Chyba při načítání vlastního filtru stavů', 'error');
      }
    }
  };

  const clearObjednatelFilter = () => {
    setSelectedObjednatel([]);
    setMultiselectFilters(prev => ({ ...prev, objednatel: '' }));
    setUserStorage('orders25List_selectedObjednatel', []);
  };

  const clearGarantFilter = () => {
    setSelectedGarant([]);
    setMultiselectFilters(prev => ({ ...prev, garant: '' }));
    setUserStorage('orders25List_selectedGarant', []);
  };

  const clearSchvalovatelFilter = () => {
    setSelectedSchvalovatel([]);
    setMultiselectFilters(prev => ({ ...prev, schvalovatel: '' }));
    setUserStorage('orders25List_selectedSchvalovatel', []);
  };

  const clearPrikazceFilter = () => {
    setSelectedPrikazce([]);
    setMultiselectFilters(prev => ({ ...prev, prikazce: '' }));
    setUserStorage('orders25List_selectedPrikazce', []);
  };

  const clearDateFilter = () => {
    setDateFromFilter('');
    setDateToFilter('');
    const sid = user_id || 'anon';
    localStorage.removeItem(`orders25_dateFrom_${sid}`);
    localStorage.removeItem(`orders25_dateTo_${sid}`);
  };

  const clearPriceFilter = () => {
    setAmountFromFilter('');
    setAmountToFilter('');
  };

  const toggleRowHighlighting = () => {
    const newHighlighting = !showRowHighlighting;
    setShowRowHighlighting(newHighlighting);
    setUserStorage('orders25List_showRowHighlighting', newHighlighting);
  };

  // Handler pro klik na dashboard karty - filtrování podle stavu
  // 🎯 VŠECHNY DLAŽDICE FUNGUJÍ JAKO RADIO - VŽDY JEN JEDNA AKTIVNÍ
  const handleStatusFilterClick = (status) => {
    if (activeStatusFilter === status) {
      // Opakovaný klik - zruš všechny filtry
      setActiveStatusFilter(null);
      setStatusFilter([]);
      setUserStorage('orders25List_statusFilter', []);
      setFilterWithInvoices(false);
      setFilterWithAttachments(false);
      setFilterMimoradneObjednavky(false);
      setUserStorage('orders25List_filterMimoradneObjednavky', false);
    } else {
      //  MAPUJ DASHBOARD KÓDY NA ČESKÉ NÁZVY (ne systémové kódy!)
      const statusToCzechName = {
        'ke_schvaleni': 'Ke schválení',
        'schvalena': 'Schválená',
        'rozpracovana': 'Rozpracovaná',
        'odeslana': 'Odeslaná dodavateli',
        'potvrzena': 'Potvrzená dodavatelem',
        'k_uverejneni_do_registru': 'Ke zveřejnění', //  FIX: Změněno z "Má být zveřejněna"
        'uverejnena': 'Zveřejněno', //  FIX: Opraveno na "Zveřejněno" (tak jak je v DB)
        'fakturace': 'Fakturace',
        'vecna_spravnost': 'Věcná správnost',
        'dokoncena': 'Dokončená',
        'nova': 'Nová',
        'zamitnuta': 'Zamítnutá',
        'zrusena': 'Zrušená',
        'ceka_potvrzeni': 'Čeká na potvrzení',
        'ceka_se': 'Odloženo',
        'smazana': 'Smazaná',
        'archivovano': 'Archivováno'
      };

      // Zruš všechny ostatní filtry
      setFilterWithInvoices(false);
      setFilterWithAttachments(false);
      setFilterMimoradneObjednavky(false);
      setUserStorage('orders25List_filterMimoradneObjednavky', false);
      
      // Aktivuj pouze tento stav
      setActiveStatusFilter(status);
      const czechName = statusToCzechName[status] || status;
      setStatusFilter([czechName]);
      setUserStorage('orders25List_statusFilter', [czechName]);
    }
  };

  const handleToggleInvoicesFilter = () => {
    if (filterWithInvoices) {
      // Opakovaný klik - zruš všechny filtry
      setFilterWithInvoices(false);
      setActiveStatusFilter(null);
      setStatusFilter([]);
      setUserStorage('orders25List_statusFilter', []);
      setFilterWithAttachments(false);
      setFilterMimoradneObjednavky(false);
      setUserStorage('orders25List_filterMimoradneObjednavky', false);
    } else {
      // Zruš všechny ostatní filtry a aktivuj faktury
      setActiveStatusFilter(null);
      setStatusFilter([]);
      setUserStorage('orders25List_statusFilter', []);
      setFilterWithAttachments(false);
      setFilterMimoradneObjednavky(false);
      setUserStorage('orders25List_filterMimoradneObjednavky', false);
      setFilterWithInvoices(true);
    }
  };

  const handleToggleAttachmentsFilter = () => {
    if (filterWithAttachments) {
      // Opakovaný klik - zruš všechny filtry
      setFilterWithAttachments(false);
      setActiveStatusFilter(null);
      setStatusFilter([]);
      setUserStorage('orders25List_statusFilter', []);
      setFilterWithInvoices(false);
      setFilterMimoradneObjednavky(false);
      setUserStorage('orders25List_filterMimoradneObjednavky', false);
    } else {
      // Zruš všechny ostatní filtry a aktivuj přílohy
      setActiveStatusFilter(null);
      setStatusFilter([]);
      setUserStorage('orders25List_statusFilter', []);
      setFilterWithInvoices(false);
      setFilterMimoradneObjednavky(false);
      setUserStorage('orders25List_filterMimoradneObjednavky', false);
      setFilterWithAttachments(true);
    }
  };

  const handleToggleMimoradneFilter = () => {
    if (filterMimoradneObjednavky) {
      // Opakovaný klik - zruš všechny filtry
      setFilterMimoradneObjednavky(false);
      setUserStorage('orders25List_filterMimoradneObjednavky', false);
      setActiveStatusFilter(null);
      setStatusFilter([]);
      setUserStorage('orders25List_statusFilter', []);
      setFilterWithInvoices(false);
      setFilterWithAttachments(false);
    } else {
      // Zruš všechny ostatní filtry a aktivuj mimořádné
      setActiveStatusFilter(null);
      setStatusFilter([]);
      setUserStorage('orders25List_statusFilter', []);
      setFilterWithInvoices(false);
      setFilterWithAttachments(false);
      setFilterMimoradneObjednavky(true);
      setUserStorage('orders25List_filterMimoradneObjednavky', true);
    }
  };

  const handleToggleDebug = () => {
    const newShowDebug = !showDebug;
    setShowDebug(newShowDebug);
    setUserStorage('orders25List_showDebug', newShowDebug);
  };

  const handleToggleDashboard = () => {
    const newShowDashboard = !showDashboard;
    setShowDashboard(newShowDashboard);
    setUserStorage('orders25List_showDashboard', newShowDashboard);
  };

  const handleToggleFilters = () => {
    const newShowFilters = !showFilters;
    setShowFilters(newShowFilters);
    setUserStorage('orders25List_showFilters', newShowFilters);
  };

  const handleHideFilters = () => {
    setShowFiltersPanel(false);
    setUserStorage('orders25List_showFiltersPanel', false);
  };

  const handleShowFilters = () => {
    setShowFiltersPanel(true);
    setUserStorage('orders25List_showFiltersPanel', true);
  };

  const handleToggleDashboardView = () => {
    // Přepnout mezi Kompaktní a Plný a deaktivovat Vlastní režim
    const newDashboardCompact = !dashboardCompact;
    setDashboardCompact(newDashboardCompact);
    setUserStorage('orders25List_dashboardCompact', newDashboardCompact);
    
    // Deaktivovat Vlastní režim
    if (dashboardMode === 'custom') {
      setDashboardMode('standard');
      setUserStorage('orders25List_dashboardMode', 'standard');
    }
  };

  const handleToggleCustomDashboard = () => {
    // Aktivovat/deaktivovat Vlastní režim
    const newMode = dashboardMode === 'custom' ? 'standard' : 'custom';
    setDashboardMode(newMode);
    setUserStorage('orders25List_dashboardMode', newMode);
  };

  // Helper funkce pro kontrolu zda má být dlaždice viditelná v Custom režimu
  const isTileVisible = useCallback((tileKey) => {
    if (dashboardMode !== 'custom' || !userSettings?.viditelne_dlazdice) {
      return true; // V standard režimu zobrazit vše
    }
    return userSettings.viditelne_dlazdice[tileKey] === true;
  }, [dashboardMode, userSettings]);

  const handleToggleOnlyMyOrders = () => {
    const newShowOnlyMyOrders = !showOnlyMyOrders;
    setShowOnlyMyOrders(newShowOnlyMyOrders);
    setUserStorage('orders25List_showOnlyMyOrders', newShowOnlyMyOrders);
  };

  // Stažení přílohy
  const handleDownloadAttachment = async (attachment, orderId) => {
    const fileName = attachment.originalni_nazev_souboru || attachment.nazev || `priloha_${attachment.id}`;

    // Pro archivované objednávky (importované ze staré DB) - stáhnout přímo ze staré URL
    if (attachment.typ_prilohy === 'IMPORT' && attachment.originalni_nazev_souboru) {
      const oldAttachmentsUrl = process.env.REACT_APP_OLD_ATTACHMENTS_URL || 'https://erdms.zachranka.cz/prilohy/';
      const oldUrl = `${oldAttachmentsUrl}${attachment.originalni_nazev_souboru}`;

      // Stáhnout přímo bez dialogu
      const link = document.createElement('a');
      link.href = oldUrl;
      link.download = attachment.originalni_nazev_souboru;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast?.(`Příloha "${attachment.originalni_nazev_souboru}" se stahuje ze starého systému`, { type: 'info' });
      return;
    }

    // Standardní stažení pro běžné přílohy
    if (!attachment.id || !orderId || !token || !username) {
      showToast?.('Nelze stáhnout přílohu - chybí potřebné údaje', { type: 'error' });
      return;
    }

    try {
      let blob;
      
      // ✅ Rozlišení podle tabulky (ne podle typ_prilohy):
      // - Má faktura_id → příloha z tabulky 25a_faktury_prilohy → příloha FAKTURY
      // - Nemá faktura_id → příloha z tabulky 25a_objednavky_prilohy → příloha OBJEDNÁVKY
      const fakturaId = attachment.faktura_id || attachment.invoice_id;
      
      if (fakturaId) {
        // Příloha faktury (z tabulky faktury_prilohy)
        blob = await downloadInvoiceAttachment(fakturaId, attachment.id, username, token);
      } else {
        // Příloha objednávky (z tabulky objednavky_prilohy)
        blob = await downloadOrderAttachment(orderId, attachment.id, username, token);
      }

      // Přímo stáhnout soubor bez dialogů
      createDownloadLink25(blob, fileName);
      showToast?.(`Příloha stažena`, { type: 'success' });

    } catch (error) {
      showToast?.(error.message || 'Přílohu nelze stáhnout', { type: 'error' });
    }
  };

  // State pro detaily osob
  const [personDetailsCache, setPersonDetailsCache] = useState({});

  // Funkce pro načtení detailu osoby - zavolá se při rozbalení řádku
  const loadPersonDetail = async (orderId, personKey, personId) => {
    const cacheKey = `${orderId}_${personKey}`;

    // Pokud už máme v cache, nemusíme načítat znovu
    if (personDetailsCache[cacheKey]) {
      return;
    }

    try {
      const { getUserDetailApi2 } = await import('../services/api2auth');
      const userDetail = await getUserDetailApi2(username, token, personId);

      if (userDetail) {
        const details = {
          jmeno: userDetail.jmeno,
          prijmeni: userDetail.prijmeni,
          titul_pred: userDetail.titul_pred,
          titul_za: userDetail.titul_za,
          email: userDetail.email
        };

        // Ulož do cache
        setPersonDetailsCache(prev => ({
          ...prev,
          [cacheKey]: details
        }));
      }
    } catch (error) {
      // Error loading person detail
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 📋 RENDER EXPANDED ROW - V2 API OPTIMIZED
  // ═══════════════════════════════════════════════════════════════════════════════
  const renderExpandedContent = (order) => {
    // ✅ Order V2 API vrací enriched data přímo v order objektu:
    // - polozky[] (s cena_bez_dph, cena_s_dph, dph_castka, dph_procento)
    // - polozky_count, polozky_celkova_cena_s_dph, polozky_celkova_cena_bez_dph
    // - faktury[] (s fa_castka_bez_dph, fa_castka_s_dph, fa_dph_castka, prilohy[])
    // - faktury_count, faktury_celkova_castka_s_dph
    // - prilohy[] (objednávky), prilohy_count
    // - dodavatel_detail{}, user_detail{}, organizace_detail{}
    // - strediska[], strediska_kod[]
    // - financovani{typ, lp_kody[], ...}

    // Připravíme data
    const polozky = order.polozky || [];
    const hasPolozky = Array.isArray(polozky) && polozky.length > 0;

    const faktury = order.faktury || [];
    const hasFaktury = Array.isArray(faktury) && faktury.length > 0;

    const prilohy = order.prilohy || [];
    const hasPrilohy = Array.isArray(prilohy) && prilohy.length > 0;

    const dodatecneDokumenty = order.dodatecne_dokumenty || [];
    const hasDodatecneDokumenty = Array.isArray(dodatecneDokumenty) && dodatecneDokumenty.length > 0;

    const strediska = order.strediska_kod || order.strediska || [];
    const hasStrediska = Array.isArray(strediska) && strediska.length > 0;

    return (
      <ExpandedContent $order={order} $showRowHighlighting={showRowHighlighting}>
        {(() => {
          // Helper: Získání názvu typu přílohy z DB
          const getAttachmentTypeLabel = (typ) => {
            const typeInfo = attachmentTypes.find(t => t.kod === typ || t.value === typ);
            return typeInfo ? (typeInfo.nazev || typeInfo.label) : typ;
          };
          
          window._getAttachmentTypeLabel = getAttachmentTypeLabel;
          return null;
        })()}
        
        <ExpandedGrid>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 1⃣ ZÁKLADNÍ ÚDAJE OBJEDNÁVKY */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <InfoCard $order={order} $showRowHighlighting={showRowHighlighting}>
            <InfoCardTitle>
              <FontAwesomeIcon icon={faInfoCircle} />
              Základní údaje objednávky
            </InfoCardTitle>

            {/* Číslo objednávky - celá šířka, nezalomitelné, s ID jako horní index */}
            <div style={{
              width: '100%',
              marginBottom: '0.75rem',
              padding: '0.5rem',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                fontSize: '0.75em',
                color: '#64748b',
                marginBottom: '0.25rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Číslo objednávky
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '1.15em',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {order.cislo_objednavky || '---'}
                <sup style={{
                  fontSize: '0.6em',
                  color: '#94a3b8',
                  fontWeight: 400,
                  marginLeft: '0.3em'
                }}>
                  #{order.id || '?'}
                </sup>
              </div>
            </div>

            <InfoRow>
              <InfoLabel>Předmět:</InfoLabel>
              <InfoValue style={{ fontWeight: 500 }}>
                {order.predmet || '---'}
              </InfoValue>
            </InfoRow>

            <InfoRow>
              <InfoLabel>Stav:</InfoLabel>
              <InfoValue>
                <span style={{
                  fontWeight: 600,
                  color: (() => {
                    const statusCode = order.stav_objednavky
                      ? mapUserStatusToSystemCode(order.stav_objednavky)
                      : 'NOVA';
                    const statusColors = getStatusColor(statusCode);
                    return statusColors?.dark || STATUS_COLORS.NOVA.dark;
                  })()
                }}>
                  {order.stav_objednavky || getOrderDisplayStatus(order) || '---'}
                </span>
              </InfoValue>
            </InfoRow>

            {(order.schvaleni_komentar || order.odeslani_storno_duvod) && (
              <InfoRow>
                <InfoLabel>Stav komentář:</InfoLabel>
                <InfoValue style={{ color: '#64748b' }}>
                  {[order.schvaleni_komentar, order.odeslani_storno_duvod]
                    .filter(Boolean)
                    .join(', ')}
                </InfoValue>
              </InfoRow>
            )}

            {/* Oddělovací linka pod stavem */}
            <div style={{
              borderBottom: '1px solid #e5e7eb',
              margin: '0.75rem 0'
            }} />

            <InfoRow>
              <InfoLabel>Datum vytvoření:</InfoLabel>
              <InfoValue>
                {order.dt_vytvoreni ? prettyDate(order.dt_vytvoreni) : '---'}
              </InfoValue>
            </InfoRow>

            {order.dt_schvaleni && (
              <InfoRow>
                <InfoLabel>Datum schválení:</InfoLabel>
                <InfoValue style={{ color: '#059669', fontWeight: 500 }}>
                  {prettyDate(order.dt_schvaleni)}
                </InfoValue>
              </InfoRow>
            )}

            {order.dt_predpokladany_termin_dodani && (
              <InfoRow>
                <InfoLabel>Termín dodání:</InfoLabel>
                <InfoValue style={{ fontWeight: 500 }}>
                  {formatDateOnly(order.dt_predpokladany_termin_dodani)}
                </InfoValue>
              </InfoRow>
            )}

                          {order.dt_potvrzeni_vecne_spravnosti && (
                            <InfoRow>
                              <InfoLabel>Potvrzení věc. správnosti:</InfoLabel>
                              <InfoValue style={{ color: '#0891b2', fontWeight: 500 }}>
                                {prettyDate(order.dt_potvrzeni_vecne_spravnosti)}
                              </InfoValue>
                            </InfoRow>
                          )}            {order.dt_dokonceni && (
              <InfoRow>
                <InfoLabel>Datum dokončení:</InfoLabel>
                <InfoValue style={{ color: '#16a34a', fontWeight: 600 }}>
                  {prettyDate(order.dt_dokonceni)}
                </InfoValue>
              </InfoRow>
            )}

            <InfoRow>
              <InfoLabel>Poslední změna:</InfoLabel>
              <InfoValue>
                {order.dt_aktualizace ? prettyDate(order.dt_aktualizace) : '---'}
              </InfoValue>
            </InfoRow>

            {/* Děliící linka */}
            <div style={{
              borderTop: '1px solid #d1d5db',
              margin: '0.75rem 0'
            }} />

            {/* Uveřejnění v registru smluv - VŽDY ZOBRAZIT */}
            {(() => {
              // 1. Zveřejněno - má vyplněné datum i IDDS
              if (order.registr_smluv?.dt_zverejneni && order.registr_smluv?.registr_iddt) {
                return (
                  <>
                    <InfoRow>
                      <InfoLabel>Uveřejněno v registru:</InfoLabel>
                      <InfoValue style={{
                        fontWeight: 600,
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '0.5rem'
                      }}>
                        <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '0.9em' }} />
                        <span>Ano</span>
                      </InfoValue>
                    </InfoRow>

                    <InfoRow>
                      <InfoLabel>Datum zveřejnění:</InfoLabel>
                      <InfoValue style={{ fontWeight: 500, color: '#059669' }}>
                        {formatDateOnly(order.registr_smluv.dt_zverejneni)}
                      </InfoValue>
                    </InfoRow>

                    <InfoRow>
                      <InfoLabel>Kód IDDS:</InfoLabel>
                      <InfoValue style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: '0.95em',
                        color: '#0891b2'
                      }}>
                        {order.registr_smluv.registr_iddt}
                      </InfoValue>
                    </InfoRow>
                  </>
                );
              }

              // 2. Čeká se na zveřejnění - má být zveřejněno, ale ještě nebylo
              let workflowStatus = null;
              if (order.stav_workflow_kod) {
                try {
                  // Pokud je to string, parsuj ho
                  const parsed = typeof order.stav_workflow_kod === 'string'
                    ? JSON.parse(order.stav_workflow_kod)
                    : order.stav_workflow_kod;

                  // Pokud je to pole, vezmi poslední prvek
                  if (Array.isArray(parsed)) {
                    workflowStatus = parsed[parsed.length - 1];
                  } else {
                    workflowStatus = parsed;
                  }
                } catch (e) {
                  // Pokud parsování selže, použij hodnotu jako string
                  workflowStatus = order.stav_workflow_kod;
                }
              }

              if (workflowStatus === 'UVEREJNIT' || order.registr_smluv?.zverejnit === 'ANO' || order.registr_smluv?.ma_byt_zverejnena) {
                return (
                  <InfoRow>
                    <InfoLabel>Uveřejněno v registru:</InfoLabel>
                    <InfoValue style={{
                      fontWeight: 600,
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.5rem'
                    }}>
                      <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: '0.9em' }} />
                      <span>Čeká se</span>
                    </InfoValue>
                  </InfoRow>
                );
              }

              // 3. Nebude zveřejněno
              return (
                <InfoRow>
                  <InfoLabel>Uveřejněno v registru:</InfoLabel>
                  <InfoValue style={{
                    fontWeight: 500,
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem'
                  }}>
                    <FontAwesomeIcon icon={faTimesCircle} style={{ fontSize: '0.9em' }} />
                    <span>Ne</span>
                  </InfoValue>
                </InfoRow>
              );
            })()}
          </InfoCard>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 2⃣ FINANČNÍ ÚDAJE - KOMPLETNÍ S V2 API */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <InfoCard $order={order} $showRowHighlighting={showRowHighlighting}>
            <InfoCardTitle>
              <FontAwesomeIcon icon={faMoneyBillWave} />
              Finanční údaje
            </InfoCardTitle>

            {/* 🎯 FINANČNÍ ZDROJ - NA ZAČÁTKU */}
            {/* Střediska */}
            {hasStrediska && (
              <InfoRow>
                <InfoLabel>Střediska:</InfoLabel>
                <InfoValue style={{ fontSize: '0.9em', fontWeight: 500, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                  {Array.isArray(strediska) ? (
                    strediska.map((s, idx) => {
                      let strediskoText;
                      if (typeof s === 'string' || typeof s === 'number') {
                        // Je to kód (string nebo číslo), přelož na název
                        strediskoText = getStrediskoNazev(String(s));
                      } else if (s.nazev_stavu) {
                        // Už máme enriched objekt s názvem
                        strediskoText = s.nazev_stavu;
                      } else if (s.nazev) {
                        strediskoText = s.nazev;
                      } else if (s.kod_stavu) {
                        // Máme objekt s kódem, přelož ho
                        strediskoText = getStrediskoNazev(String(s.kod_stavu));
                      } else if (s.kod) {
                        strediskoText = getStrediskoNazev(String(s.kod));
                      } else {
                        strediskoText = `Středisko ${idx + 1}`;
                      }
                      return (
                        <div key={idx}>
                          {highlightSearchText(strediskoText, globalFilter)}
                        </div>
                      );
                    })
                  ) : (
                    <div>{highlightSearchText(getStrediskoNazev(String(strediska)), globalFilter)}</div>
                  )}
                </InfoValue>
              </InfoRow>
            )}

            {/* Způsob financování */}
            {order.financovani && (
              <>
                <InfoRow>
                  <InfoLabel>Způsob financování:</InfoLabel>
                  <InfoValue style={{ fontWeight: 600, color: '#7c3aed' }}>
                    {highlightSearchText(order.financovani.typ_nazev || order.financovani.typ || '---', globalFilter)}
                  </InfoValue>
                </InfoRow>

                {/* LP kódy s detaily */}
                {order.financovani?.lp_nazvy && Array.isArray(order.financovani.lp_nazvy) && order.financovani.lp_nazvy.length > 0 && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <InfoLabel style={{ marginBottom: '0.5rem', display: 'block' }}>LP účty:</InfoLabel>
                    {order.financovani.lp_nazvy.map((lp, index) => (
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
                          {highlightSearchText(lp.cislo_lp || lp.kod || '---', globalFilter)}
                        </span>
                        {lp.nazev && (
                          <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                            – {highlightSearchText(lp.nazev, globalFilter)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Fallback na staré LP kódy (pokud nejsou lp_nazvy) */}
                {(!order.financovani?.lp_nazvy || order.financovani.lp_nazvy.length === 0) &&
                 order.financovani?.lp_kody && Array.isArray(order.financovani.lp_kody) && order.financovani.lp_kody.length > 0 && (
                  <InfoRow>
                    <InfoLabel>LP kódy:</InfoLabel>
                    <InfoValue style={{ fontSize: '0.9em' }}>
                      {highlightSearchText(order.financovani.lp_kody.join(', '), globalFilter)}
                    </InfoValue>
                  </InfoRow>
                )}

                {/* Další dynamická data financování */}
                {order.financovani && typeof order.financovani === 'object' && (() => {
                  const fin = order.financovani;
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
                          {highlightSearchText(displayValue, globalFilter)}
                        </InfoValue>
                      </InfoRow>
                    );
                  });
                })()}
              </>
            )}

            {/* Oddělovací čára */}
            {(hasStrediska || order.financovani) && (
              <div style={{
                borderBottom: '2px solid #e2e8f0',
                margin: '0.75rem 0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }} />
            )}

            {/* Oddělovací linka */}
            <div style={{
              borderBottom: '1px solid #e5e7eb',
              margin: '0.75rem 0'
            }} />

            {/* Max cena s DPH */}
            <InfoRow>
              <InfoLabel>Max. cena s DPH:</InfoLabel>
              <InfoValue style={{ fontWeight: 700, color: '#059669', fontSize: '1.1em', whiteSpace: 'nowrap' }}>
                {order.max_cena_s_dph ? <>{parseFloat(order.max_cena_s_dph).toLocaleString('cs-CZ')}&nbsp;Kč</> : '---'}
              </InfoValue>
            </InfoRow>

            {/* Druh objednávky */}
            <InfoRow>
              <InfoLabel>Druh objednávky:</InfoLabel>
              <InfoValue style={{ fontWeight: 500, fontSize: '0.9em' }}>
                {highlightSearchText((() => {
                  // Podpora různých formátů dat z backendu
                  // 1. Enriched: order.druh_objednavky = {kod, nazev}
                  if (order.druh_objednavky?.nazev) {
                    return order.druh_objednavky.nazev;
                  }
                  // 2. Direct: order.druh_objednavky_nazev (string)
                  if (order.druh_objednavky_nazev) {
                    return order.druh_objednavky_nazev;
                  }
                  // 3. Code only: order.druh_objednavky_kod (string) - přelož přes API slovník
                  if (order.druh_objednavky_kod) {
                    return getDruhObjednavkyNazev(order.druh_objednavky_kod);
                  }
                  // 4. String value: order.druh_objednavky (string) - přelož přes API slovník
                  if (typeof order.druh_objednavky === 'string') {
                    return getDruhObjednavkyNazev(order.druh_objednavky);
                  }
                  return '---';
                })(), globalFilter)}
              </InfoValue>
            </InfoRow>

            {/* POLOŽKY - CENY */}
            {hasPolozky && (
              <>
                {/* Počet položek */}
                <InfoRow>
                  <InfoLabel>Počet položek:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500 }}>
                    {order.polozky_count || polozky.length} ks
                  </InfoValue>
                </InfoRow>

                {/* Položky - cena s DPH */}
                {order.polozky_celkova_cena_s_dph && parseFloat(order.polozky_celkova_cena_s_dph) > 0 && (
                  <InfoRow>
                    <InfoLabel>Položky (s DPH):</InfoLabel>
                    <InfoValue style={{ fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap' }}>
                      {parseFloat(order.polozky_celkova_cena_s_dph).toLocaleString('cs-CZ')}&nbsp;Kč
                    </InfoValue>
                  </InfoRow>
                )}
              </>
            )}

            {/* Oddělovací linka */}
            <div style={{
              borderBottom: '1px solid #e5e7eb',
              margin: '0.75rem 0'
            }} />

            {/* FAKTURY - CENY */}
            {hasFaktury && (
              <>
                {/* Faktury - celková částka s DPH */}
                {order.faktury_celkova_castka_s_dph && parseFloat(order.faktury_celkova_castka_s_dph) > 0 && (
                  <InfoRow>
                    <InfoLabel>Faktury (s DPH):</InfoLabel>
                    <InfoValue style={{ fontWeight: 600, color: '#7c3aed', whiteSpace: 'nowrap' }}>
                      {parseFloat(order.faktury_celkova_castka_s_dph).toLocaleString('cs-CZ')}&nbsp;Kč
                    </InfoValue>
                  </InfoRow>
                )}

                {/* Počet faktur */}
                <InfoRow>
                  <InfoLabel>Počet faktur:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500 }}>
                    {order.faktury_count || faktury.length} ks
                  </InfoValue>
                </InfoRow>
              </>
            )}
          </InfoCard>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 3⃣ ODPOVĚDNÉ OSOBY */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <InfoCard $order={order} $showRowHighlighting={showRowHighlighting}>
            <InfoCardTitle>
              <FontAwesomeIcon icon={faUsers} />
              Odpovědné osoby
            </InfoCardTitle>

            {/* Objednatel */}
            <InfoRow>
              <InfoLabel>Objednatel:</InfoLabel>
              <InfoValue>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                  <span style={{ fontWeight: 500 }}>
                    {order.objednatel?.cele_jmeno || order.uzivatel?.cele_jmeno || getUserDisplayName(order.uzivatel_id) || '---'}
                  </span>
                </div>
              </InfoValue>
            </InfoRow>
            {(order.objednatel?.email || order.uzivatel?.email) && (
              <div style={{
                textAlign: 'right',
                fontSize: '0.85em',
                color: '#6b7280',
                marginTop: '-0.3rem',
                marginBottom: '0.5rem',
                paddingRight: '0',
                wordBreak: 'break-all'
              }}>
                {order.objednatel?.email || order.uzivatel?.email}
              </div>
            )}

            {/* Garant */}
            {order.garant_uzivatel && (
              <>
                <InfoRow>
                  <InfoLabel>Garant:</InfoLabel>
                  <InfoValue>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: 500 }}>
                        {order.garant_uzivatel.cele_jmeno || getUserDisplayName(order.garant_uzivatel.id) || '---'}
                      </span>
                    </div>
                  </InfoValue>
                </InfoRow>
                {order.garant_uzivatel.email && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85em',
                    color: '#6b7280',
                    marginTop: '-0.3rem',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {order.garant_uzivatel.email}
                  </div>
                )}
              </>
            )}

            {/* Příkazce */}
            {order.prikazce && (
              <>
                <InfoRow>
                  <InfoLabel>Příkazce:</InfoLabel>
                  <InfoValue>
                    <span style={{ fontWeight: 500 }}>
                      {order.prikazce.cele_jmeno || getUserDisplayName(order.prikazce.id) || '---'}
                    </span>
                  </InfoValue>
                </InfoRow>
                {order.prikazce.email && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85em',
                    color: '#6b7280',
                    marginTop: '-0.3rem',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {order.prikazce.email}
                  </div>
                )}
              </>
            )}

            {/* Schvalovatel */}
            {order.schvalovatel && (
              <>
                <InfoRow>
                  <InfoLabel>Schvalovatel:</InfoLabel>
                  <InfoValue>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: 500 }}>
                        {order.schvalovatel.cele_jmeno || getUserDisplayName(order.schvalovatel.id) || '---'}
                      </span>
                    </div>
                  </InfoValue>
                </InfoRow>
                {order.schvalovatel.email && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85em',
                    color: '#6b7280',
                    marginTop: '-0.3rem',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {order.schvalovatel.email}
                  </div>
                )}
              </>
            )}

            {/* Odesílatel */}
            {order.odesilatel && (
              <>
                <InfoRow>
                  <InfoLabel>Odesílatel:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500, color: '#0891b2' }}>
                    {order.odesilatel.cele_jmeno || '---'}
                  </InfoValue>
                </InfoRow>
                {order.odesilatel.email && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85em',
                    color: '#6b7280',
                    marginTop: '-0.3rem',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {order.odesilatel.email}
                  </div>
                )}
              </>
            )}

            {/* Dodavatel potvrdil */}
            {order.dodavatel_potvrdil && (
              <>
                <InfoRow>
                  <InfoLabel>Dodavatel potvrdil:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500, color: '#0891b2' }}>
                    {order.dodavatel_potvrdil.cele_jmeno || '---'}
                  </InfoValue>
                </InfoRow>
                {order.dodavatel_potvrdil.email && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85em',
                    color: '#6b7280',
                    marginTop: '-0.3rem',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {order.dodavatel_potvrdil.email}
                  </div>
                )}
              </>
            )}

            {/* Zveřejnil */}
            {order.zverejnil && (
              <>
                <InfoRow>
                  <InfoLabel>Zveřejnil:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500, color: '#0891b2' }}>
                    {order.zverejnil.cele_jmeno || '---'}
                  </InfoValue>
                </InfoRow>
                {order.zverejnil.email && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85em',
                    color: '#6b7280',
                    marginTop: '-0.3rem',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {order.zverejnil.email}
                  </div>
                )}
              </>
            )}

            {/* Fakturant(i) - unikátní seznam */}
            {(() => {
              // Získat všechny unikátní fakturanty z faktur
              const uniqueFakturanti = [];
              const seenIds = new Set();
              
              // Přidat primárního fakturanta (pokud existuje)
              if (order.fakturant?.id && !seenIds.has(order.fakturant.id)) {
                seenIds.add(order.fakturant.id);
                uniqueFakturanti.push({
                  ...order.fakturant,
                  isPrimary: true
                });
              }
              
              // Přidat všechny další fakturanty z jednotlivých faktur
              if (order.faktury && order.faktury.length > 0) {
                order.faktury.forEach(faktura => {
                  const creator = faktura.vytvoril_uzivatel || faktura.vytvoril;
                  if (creator?.id && !seenIds.has(creator.id)) {
                    seenIds.add(creator.id);
                    uniqueFakturanti.push({
                      ...creator,
                      isPrimary: false
                    });
                  }
                });
              }
              
              // Pokud jsou fakturanti, zobrazit je
              if (uniqueFakturanti.length === 0) return null;
              
              return (
                <>
                  <InfoRow>
                    <InfoLabel>
                      {uniqueFakturanti.length === 1 ? 'Fakturant:' : 'Fakturanti:'}
                    </InfoLabel>
                    <InfoValue style={{ fontWeight: 500, color: '#7c3aed' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                        {uniqueFakturanti.map((fakturant, idx) => (
                          <div key={fakturant.id || idx} style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: fakturant.isPrimary ? 600 : 500 }}>
                              {fakturant.cele_jmeno || '---'}
                            </div>
                            {fakturant.email && (
                              <div style={{
                                fontSize: '0.85em',
                                color: '#6b7280',
                                marginTop: '2px',
                                wordBreak: 'break-all'
                              }}>
                                {fakturant.email}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </InfoValue>
                  </InfoRow>
                </>
              );
            })()}

            {/* Potvrdil věcnou správnost */}
            {order.potvrdil_vecnou_spravnost && (
              <>
                <InfoRow>
                  <InfoLabel>Potvrdil věcnou správnost:</InfoLabel>
                  <InfoValue style={{ fontWeight: 500, color: '#0891b2' }}>
                    {order.potvrdil_vecnou_spravnost.cele_jmeno || '---'}
                  </InfoValue>
                </InfoRow>
                {order.potvrdil_vecnou_spravnost.email && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85em',
                    color: '#6b7280',
                    marginTop: '-0.3rem',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {order.potvrdil_vecnou_spravnost.email}
                  </div>
                )}
              </>
            )}

            {/* Dokončil objednávku */}
            {order.dokoncil && (
              <>
                <InfoRow>
                  <InfoLabel>Dokončil objednávku:</InfoLabel>
                  <InfoValue style={{ fontWeight: 600, color: '#16a34a' }}>
                    {order.dokoncil.cele_jmeno || '---'}
                  </InfoValue>
                </InfoRow>
                {order.dokoncil.email && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85em',
                    color: '#6b7280',
                    marginTop: '-0.3rem',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    {order.dokoncil.email}
                  </div>
                )}
              </>
            )}
          </InfoCard>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 4⃣ WORKFLOW KROKY */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <InfoCard $order={order} $showRowHighlighting={showRowHighlighting}>
            <InfoCardTitle>
              <FontAwesomeIcon icon={faListCheck} />
              Workflow kroky
            </InfoCardTitle>

            {/* Vytvořil/Objednatel */}
            {(order.objednatel || order.uzivatel) && (
              <div style={{
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px dashed #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#3b82f6' }}>
                    1. {order.objednatel ? 'Objednatel' : 'Vytvořil'}
                  </div>
                  <div style={{ fontSize: '0.9em', fontWeight: 500 }}>
                    {order.objednatel?.cele_jmeno || order.uzivatel?.cele_jmeno}
                  </div>
                </div>
                {(order.objednatel?.datum || order.uzivatel?.datum) && (
                  <div style={{
                    fontSize: '0.75em',
                    color: '#64748b',
                    textAlign: 'right'
                  }}>
                    {prettyDate(order.objednatel?.datum || order.uzivatel?.datum)}
                  </div>
                )}
              </div>
            )}

            {/* Schválil */}
            {order.schvalovatel && (
              <div style={{
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px dashed #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#059669' }}>
                    2. Schválil
                  </div>
                  <div style={{ fontSize: '0.9em', fontWeight: 500 }}>
                    {order.schvalovatel.cele_jmeno}
                  </div>
                </div>
                {order.schvalovatel.datum && (
                  <div style={{
                    fontSize: '0.75em',
                    color: '#64748b',
                    textAlign: 'right'
                  }}>
                    {prettyDate(order.schvalovatel.datum)}
                  </div>
                )}
              </div>
            )}

            {/* Odeslal */}
            {order.odesilatel && (
              <div style={{
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px dashed #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#0891b2' }}>
                    3. Odeslal dodavateli
                  </div>
                  <div style={{ fontSize: '0.9em', fontWeight: 500 }}>
                    {order.odesilatel.cele_jmeno}
                  </div>
                </div>
                {order.odesilatel.datum && (
                  <div style={{
                    fontSize: '0.75em',
                    color: '#64748b',
                    textAlign: 'right'
                  }}>
                    {formatDateOnly(order.odesilatel.datum)}
                  </div>
                )}
              </div>
            )}

            {/* Dodavatel potvrdil */}
            {order.dodavatel_potvrdil && (
              <div style={{
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px dashed #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#7c3aed' }}>
                    4. Dodavatel potvrdil
                  </div>
                  <div style={{ fontSize: '0.9em', fontWeight: 500 }}>
                    {order.dodavatel_potvrdil.cele_jmeno}
                  </div>
                </div>
                {order.dodavatel_potvrdil.datum && (
                  <div style={{
                    fontSize: '0.75em',
                    color: '#64748b',
                    textAlign: 'right'
                  }}>
                    {formatDateOnly(order.dodavatel_potvrdil.datum)}
                  </div>
                )}
              </div>
            )}

            {/* Zveřejnil */}
            {order.zverejnil && (
              <div style={{
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px dashed #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#f59e0b' }}>
                    5. Zveřejnil
                  </div>
                  <div style={{ fontSize: '0.9em', fontWeight: 500 }}>
                    {order.zverejnil.cele_jmeno}
                  </div>
                </div>
                {order.zverejnil.datum && (
                  <div style={{
                    fontSize: '0.75em',
                    color: '#64748b',
                    textAlign: 'right'
                  }}>
                    {formatDateOnly(order.zverejnil.datum)}
                  </div>
                )}
              </div>
            )}

            {/* Přidal fakturu / faktury */}
            {order.faktury && order.faktury.length > 0 && (
              <div style={{
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px dashed #e2e8f0'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#ea580c', marginBottom: '0.5rem' }}>
                  {(() => {
                    // Zkontrolovat stav workflow objednávky
                    let workflowStates = [];
                    try {
                      if (order.stav_workflow_kod) {
                        if (typeof order.stav_workflow_kod === 'string') {
                          workflowStates = JSON.parse(order.stav_workflow_kod);
                        } else if (Array.isArray(order.stav_workflow_kod)) {
                          workflowStates = order.stav_workflow_kod;
                        }
                      }
                    } catch (e) {
                      workflowStates = [];
                    }
                    
                    // Pokud obsahuje ZKONTROLOVANA nebo DOKONCENA, zobrazit plný nadpis
                    if (workflowStates.includes('ZKONTROLOVANA') || workflowStates.includes('DOKONCENA')) {
                      return '6.-7. Přidání faktur, ověření věcné správnosti';
                    }
                    // Jinak jen "Přidání faktur"
                    return '6. Přidání faktur';
                  })()}
                </div>
                
                {/* Seznam všech faktur */}
                {order.faktury
                  .filter(f => f.dt_vytvoreni) // Pouze faktury s datem vytvoření
                  .sort((a, b) => new Date(a.dt_vytvoreni) - new Date(b.dt_vytvoreni)) // Seřadit od nejstarší
                  .map((faktura, index) => (
                    <div 
                      key={faktura.id || index}
                      style={{
                        marginBottom: index < order.faktury.length - 1 ? '0.5rem' : '0',
                        paddingLeft: '0.5rem',
                        borderLeft: '2px solid #ea580c',
                        paddingTop: '0.25rem',
                        paddingBottom: '0.25rem'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1px'
                      }}>
                        <div style={{ fontSize: '0.85em', color: '#374151', fontWeight: 500 }}>
                          FA#{faktura.fa_cislo_vema || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.85em', fontWeight: 500 }}>
                          {faktura.vytvoril_uzivatel?.cele_jmeno || 
                           faktura.vytvoril?.cele_jmeno || 
                           order.fakturant?.cele_jmeno || 
                           'Neznámý'}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '0.75em',
                        color: '#64748b',
                        textAlign: 'right'
                      }}>
                        {prettyDate(faktura.dt_vytvoreni)}
                      </div>
                      
                      {/* Věcná správnost faktury */}
                      {faktura.dt_potvrzeni_vecne_spravnosti && (
                        <div style={{
                          marginTop: '0.35rem',
                          paddingTop: '0.35rem',
                          borderTop: '1px dashed #cbd5e1'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1px'
                          }}>
                            <div style={{
                              fontSize: '0.75em',
                              color: '#0891b2',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <span>✓</span>
                              <span>Věcná správnost</span>
                            </div>
                            <div style={{ fontSize: '0.85em', fontWeight: 500 }}>
                              {(() => {
                                // Sestavit celé jméno s tituly
                                if (!faktura.potvrdil_vecnou_spravnost_prijmeni) return 'N/A';
                                const parts = [];
                                if (faktura.potvrdil_vecnou_spravnost_titul_pred) {
                                  parts.push(faktura.potvrdil_vecnou_spravnost_titul_pred);
                                }
                                if (faktura.potvrdil_vecnou_spravnost_jmeno) {
                                  parts.push(faktura.potvrdil_vecnou_spravnost_jmeno);
                                }
                                parts.push(faktura.potvrdil_vecnou_spravnost_prijmeni);
                                let fullName = parts.join(' ');
                                if (faktura.potvrdil_vecnou_spravnost_titul_za) {
                                  fullName += ', ' + faktura.potvrdil_vecnou_spravnost_titul_za;
                                }
                                return fullName;
                              })()}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '0.75em',
                            color: '#64748b',
                            textAlign: 'right'
                          }}>
                            {prettyDate(faktura.dt_potvrzeni_vecne_spravnosti)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Potvrdil věcnou správnost - zobrazit pouze pokud NENÍ ve stavu ZKONTROLOVANA nebo DOKONCENA */}
            {order.potvrdil_vecnou_spravnost && (() => {
              let workflowStates = [];
              try {
                if (order.stav_workflow_kod) {
                  if (typeof order.stav_workflow_kod === 'string') {
                    workflowStates = JSON.parse(order.stav_workflow_kod);
                  } else if (Array.isArray(order.stav_workflow_kod)) {
                    workflowStates = order.stav_workflow_kod;
                  }
                }
              } catch (e) {
                workflowStates = [];
              }
              
              // Nezobrazovat samostatný blok, pokud je už zkontrolováno nebo dokončeno
              if (workflowStates.includes('ZKONTROLOVANA') || workflowStates.includes('DOKONCENA')) {
                return null;
              }
              
              return (
                <div style={{
                  marginBottom: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px dashed #e2e8f0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2px'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#0891b2' }}>
                      7. Potvrdil věcnou správnost
                    </div>
                    <div style={{ fontSize: '0.9em', fontWeight: 500 }}>
                      {order.potvrdil_vecnou_spravnost.cele_jmeno}
                    </div>
                  </div>
                  {order.potvrdil_vecnou_spravnost.datum && (
                    <div style={{
                      fontSize: '0.75em',
                      color: '#64748b',
                      textAlign: 'right'
                    }}>
                      {prettyDate(order.potvrdil_vecnou_spravnost.datum)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Dokončil */}
            {order.dokoncil && (
              <div style={{
                marginBottom: '0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85em', color: '#16a34a' }}>
                    8. Dokončil objednávku
                  </div>
                  <div style={{ fontSize: '0.9em', fontWeight: 500 }}>
                    {order.dokoncil.cele_jmeno}
                  </div>
                </div>
                {order.dokoncil.datum && (
                  <div style={{
                    fontSize: '0.75em',
                    color: '#64748b',
                    textAlign: 'right'
                  }}>
                    {prettyDate(order.dokoncil.datum)}
                  </div>
                )}
              </div>
            )}

            {/* Poslední aktualizace */}
            {order.uzivatel_akt && (
              <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '2px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.75em', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Poslední změna
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#64748b' }}>
                      {order.uzivatel_akt.cele_jmeno}
                    </div>
                  </div>
                  {order.uzivatel_akt.datum && (
                    <div style={{
                      fontSize: '0.75em',
                      color: '#94a3b8',
                      textAlign: 'right',
                      whiteSpace: 'nowrap'
                    }}>
                      {prettyDate(order.uzivatel_akt.datum)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </InfoCard>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TŘÍSLOUPCOVÝ LAYOUT: Dodavatel | Položky+Faktury | Přílohy */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <ThreeColumnLayout>
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* LEVÝ SLOUPEC: DODAVATEL */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <SupplierColumn>
              <InfoCard $order={order} $showRowHighlighting={showRowHighlighting}>
                <InfoCardTitle>
                  <FontAwesomeIcon icon={faBuilding} />
                  Dodavatel
                </InfoCardTitle>

                <InfoRow>
                  <InfoLabel>Název:</InfoLabel>
                  <InfoValue style={{ fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {highlightSearchText(order.dodavatel_nazev || '---', globalFilter)}
                  </InfoValue>
                </InfoRow>

                <InfoRow>
                  <InfoLabel>IČO:</InfoLabel>
                  <InfoValue style={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                    {highlightSearchText(order.dodavatel_ico || '---', globalFilter)}
                  </InfoValue>
                </InfoRow>

                {order.dodavatel_adresa && (
                  <InfoRow>
                    <InfoLabel>Adresa:</InfoLabel>
                    <InfoValue>{highlightSearchText(order.dodavatel_adresa, globalFilter)}</InfoValue>
                  </InfoRow>
                )}

                {order.dodavatel_zastoupeny && (
                  <InfoRow>
                    <InfoLabel>Zástupce firmy:</InfoLabel>
                    <InfoValue style={{ fontWeight: 500 }}>
                      {highlightSearchText(order.dodavatel_zastoupeny, globalFilter)}
                    </InfoValue>
                  </InfoRow>
                )}

                {/* Oddělovací linka před kontaktní osobou */}
                {(order.dodavatel_kontakt_jmeno || order.dodavatel_kontakt_email || order.dodavatel_kontakt_telefon) && (
                  <div style={{
                    margin: '0.75rem 0',
                    borderTop: '1px solid #e5e7eb'
                  }} />
                )}

                {order.dodavatel_kontakt_jmeno && (
                  <InfoRow>
                    <InfoLabel>Kontakt:</InfoLabel>
                    <InfoValue style={{ fontWeight: 500 }}>
                      {highlightSearchText(order.dodavatel_kontakt_jmeno, globalFilter)}
                    </InfoValue>
                  </InfoRow>
                )}

                {order.dodavatel_kontakt_email && (
                  <InfoRow>
                    <InfoLabel>E-mail:</InfoLabel>
                    <InfoValue style={{ wordBreak: 'break-all' }}>
                      {highlightSearchText(order.dodavatel_kontakt_email, globalFilter)}
                    </InfoValue>
                  </InfoRow>
                )}

                {order.dodavatel_kontakt_telefon && (
                  <InfoRow>
                    <InfoLabel>Telefon:</InfoLabel>
                    <InfoValue>{highlightSearchText(order.dodavatel_kontakt_telefon, globalFilter)}</InfoValue>
                  </InfoRow>
                )}
              </InfoCard>
            </SupplierColumn>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PROSTŘEDNÍ SLOUPEC: POLOŽKY + FAKTURY */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <MiddleColumn>
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* 6⃣ POLOŽKY OBJEDNÁVKY - KOMPLETNÍ S DPH */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              <InfoCard $order={order} $showRowHighlighting={showRowHighlighting}>
                <InfoCardTitle>
                  <FontAwesomeIcon icon={faList} />
                  Položky objednávky ({order.polozky_count || polozky.length})
                </InfoCardTitle>

              {hasPolozky ? (

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {polozky.slice(0, 10).map((polozka, index) => {
                  return (
                  <ListItemCard key={index}>
                    <ListItemHeader>
                      <ListItemTitle>
                        <div>
                          {highlightSearchText(polozka.popis || polozka.nazev || `Položka ${index + 1}`, globalFilter)}
                          {polozka.id && (
                            <sup style={{
                              fontSize: '0.6em',
                              color: '#94a3b8',
                              fontWeight: 400,
                              marginLeft: '4px'
                            }}>
                              #{polozka.id}
                            </sup>
                          )}
                          {polozka.lp_id && (
                            <div style={{
                              fontSize: '0.8em',
                              color: polozka.lp_kod ? '#8b5cf6' : '#dc2626',
                              fontWeight: 500,
                              marginTop: '6px',
                              paddingLeft: '8px',
                              borderLeft: `3px solid ${polozka.lp_kod ? '#8b5cf6' : '#dc2626'}`
                            }}>
                              {polozka.lp_kod || `LP#${polozka.lp_id}`}{polozka.lp_nazev && polozka.lp_nazev !== 'LP nenalezeno' ? ` - ${polozka.lp_nazev}` : polozka.lp_nazev === 'LP nenalezeno' ? ' - ⚠️ LP nenalezeno' : ''}
                            </div>
                          )}
                        </div>
                      </ListItemTitle>

                      {/* Cena s DPH - hlavní hodnota */}
                      {polozka.cena_s_dph && (
                        <div style={{
                          fontWeight: 700,
                          fontSize: '1em',
                          color: '#059669',
                          whiteSpace: 'nowrap'
                        }}>
                          {parseFloat(polozka.cena_s_dph).toLocaleString('cs-CZ')}&nbsp;Kč
                        </div>
                      )}
                    </ListItemHeader>

                    {/* Tagy pod názvem - úsek, budova, místnost, poznámka umístění */}
                    {(() => {
                      // Parsování poznámky k místu z poznamka_umisteni objektu nebo JSON pole poznamka
                      let poznamkaKMistu = null;
                      
                      // 1. Priorita: poznamka_umisteni.poznamka_lokalizace (backend enriched formát)
                      if (polozka.poznamka_umisteni && typeof polozka.poznamka_umisteni === 'object') {
                        poznamkaKMistu = polozka.poznamka_umisteni.poznamka_lokalizace || null;
                      }
                      // 2. Fallback: parsovat z JSON pole poznamka
                      else if (polozka.poznamka) {
                        try {
                          const parsed = JSON.parse(polozka.poznamka);
                          poznamkaKMistu = parsed.poznamka_lokalizace || null;
                        } catch {
                          // Pokud parsování selže, použij jako plain text
                          poznamkaKMistu = polozka.poznamka;
                        }
                      }
                      
                      // Zobraz pouze pokud existuje alespoň jeden lokalizační údaj
                      if (!polozka.mistnost_kod && !polozka.budova_kod && !polozka.usek_kod && !poznamkaKMistu && !polozka.poznamka_umisteni) {
                        return null;
                      }
                      
                      return (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '6px',
                        marginBottom: '8px'
                      }}>
                        {polozka.usek_kod && (
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            fontSize: '0.75em',
                            fontWeight: 500,
                            backgroundColor: '#f3e8ff',
                            color: '#6b21a8',
                            borderRadius: '4px',
                            border: '1px solid #d8b4fe'
                          }}>
                            Úsek: {highlightSearchText(polozka.usek_kod, globalFilter)}
                          </span>
                        )}

                        {polozka.budova_kod && (
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            fontSize: '0.75em',
                            fontWeight: 500,
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '4px',
                            border: '1px solid #93c5fd'
                          }}>
                            Budova: {highlightSearchText(polozka.budova_kod, globalFilter)}
                          </span>
                        )}

                        {polozka.mistnost_kod && (
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            fontSize: '0.75em',
                            fontWeight: 500,
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '4px',
                            border: '1px solid #93c5fd'
                          }}>
                            Místnost: {highlightSearchText(polozka.mistnost_kod, globalFilter)}
                          </span>
                        )}
                      </div>
                      );
                    })()}

                    <ListItemMeta>
                      {/* Počet */}
                      {polozka.pocet && (
                        <ListItemMetaItem>
                          <span style={{ fontWeight: 500 }}>Počet:</span>
                          <span>{polozka.pocet} {polozka.jednotka || 'ks'}</span>
                        </ListItemMetaItem>
                      )}

                      {/* Jednotková cena bez DPH */}
                      {polozka.jednotkova_cena_bez_dph && (
                        <ListItemMetaItem>
                          <span style={{ fontWeight: 500 }}>Jedn. bez DPH:</span>
                          <span>{parseFloat(polozka.jednotkova_cena_bez_dph).toLocaleString('cs-CZ')}&nbsp;Kč</span>
                        </ListItemMetaItem>
                      )}

                      {/* Jednotková cena s DPH */}
                      {polozka.jednotkova_cena_s_dph && (
                        <ListItemMetaItem>
                          <span style={{ fontWeight: 500 }}>Jedn. s DPH:</span>
                          <span>{parseFloat(polozka.jednotkova_cena_s_dph).toLocaleString('cs-CZ')}&nbsp;Kč</span>
                        </ListItemMetaItem>
                      )}

                      {/* Poznámka k místu NEBO Cena bez DPH celkem */}
                      {(() => {
                        // Parsování poznámky k místu
                        let poznamkaKMistu = null;
                        
                        // 1. Priorita: poznamka_umisteni.poznamka_lokalizace (backend enriched formát)
                        if (polozka.poznamka_umisteni && typeof polozka.poznamka_umisteni === 'object') {
                          poznamkaKMistu = polozka.poznamka_umisteni.poznamka_lokalizace || null;
                        }
                        // 2. Fallback: parsovat z JSON pole poznamka
                        else if (polozka.poznamka) {
                          try {
                            const parsed = JSON.parse(polozka.poznamka);
                            poznamkaKMistu = parsed.poznamka_lokalizace || null;
                          } catch {
                            // Pokud parsování selže, použij jako plain text
                            poznamkaKMistu = polozka.poznamka;
                          }
                        }
                        
                        // Pokud existuje poznámka, zobraz ji MÍSTO ceny bez DPH
                        if (poznamkaKMistu && poznamkaKMistu.trim()) {
                          return (
                            <ListItemMetaItem>
                              <span style={{ fontWeight: 500 }}>Poznámka k místu:</span>
                              <span style={{ color: '#92400e' }}>
                                {poznamkaKMistu}
                              </span>
                            </ListItemMetaItem>
                          );
                        }
                        
                        // Jinak zobraz cenu bez DPH (původní chování)
                        if (polozka.cena_bez_dph) {
                          return (
                            <ListItemMetaItem>
                              <span style={{ fontWeight: 500 }}>Bez DPH:</span>
                              <span style={{ color: '#64748b' }}>
                                {parseFloat(polozka.cena_bez_dph).toLocaleString('cs-CZ')}&nbsp;Kč
                              </span>
                            </ListItemMetaItem>
                          );
                        }
                        
                        return null;
                      })()}

                      {/* DPH procento */}
                      {polozka.dph_procento && (
                        <ListItemMetaItem>
                          <span style={{ fontWeight: 500 }}>DPH:</span>
                          <span>{polozka.dph_procento}%</span>
                        </ListItemMetaItem>
                      )}

                      {/* DPH částka */}
                      {polozka.dph_castka && (
                        <ListItemMetaItem>
                          <span style={{ fontWeight: 500 }}>DPH částka:</span>
                          <span>
                            {parseFloat(polozka.dph_castka).toLocaleString('cs-CZ')}&nbsp;Kč
                          </span>
                        </ListItemMetaItem>
                      )}
                    </ListItemMeta>
                  </ListItemCard>
                );
                })}

                {polozky.length > 10 && (
                  <div style={{
                    fontSize: '0.85em',
                    color: '#6b7280',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    padding: '8px'
                  }}>
                    ... a dalších {polozky.length - 10} položek
                  </div>
                )}

                {/* Společná poznámka k položkám */}
                {order.poznamka && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    fontSize: '0.9em',
                    color: '#92400e',
                    fontStyle: 'italic'
                  }}>
                    <strong style={{ fontStyle: 'normal', fontWeight: 600 }}>Poznámka k položkám:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {highlightSearchText(order.poznamka, globalFilter)}
                    </div>
                  </div>
                )}
              </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  color: '#94a3b8',
                  fontSize: '0.9em'
                }}>
                  <FontAwesomeIcon icon={faList} style={{ fontSize: '3em', marginBottom: '1rem', opacity: 0.3 }} />
                  <div>Žádné položky</div>
                </div>
              )}
            </InfoCard>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 7⃣ FAKTURY - KOMPLETNÍ S DPH A PŘÍLOHAMI */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <InfoCard $order={order} $showRowHighlighting={showRowHighlighting}>
            <InfoCardTitle>
              <FontAwesomeIcon icon={faReceipt} />
              Faktury ({order.faktury_count || faktury.length})
            </InfoCardTitle>

            {hasFaktury ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                {faktury.map((faktura, index) => {
                  return (
                    <ListItemCard key={index}>
                      {/* Nadpis: VS a částka vedle sebe */}
                      <ListItemHeader>
                        <ListItemTitle>
                          <div style={{
                            fontSize: '1.05em',
                            fontWeight: 700,
                            color: '#059669'
                          }}>
                            {highlightSearchText(faktura.fa_cislo_vema || faktura.cislo_faktury || `Faktura ${index + 1}`, globalFilter)}
                          </div>
                        </ListItemTitle>
                        
                        {/* Částka faktury - vpravo */}
                        {faktura.fa_castka && parseFloat(faktura.fa_castka) > 0 && (
                          <div style={{
                            fontWeight: 700,
                            fontSize: '1.1em',
                            color: '#059669',
                            whiteSpace: 'nowrap'
                          }}>
                            {parseFloat(faktura.fa_castka).toLocaleString('cs-CZ')}&nbsp;Kč
                          </div>
                        )}
                      </ListItemHeader>

                      <ListItemHeader style={{ marginTop: '8px' }}>
                        <ListItemTitle style={{ fontSize: '0.9em', color: '#64748b' }}>
                          {/* Evidoval: Jméno uživatele */}
                          {(faktura.vytvoril_uzivatel?.cele_jmeno || faktura.vytvoril_uzivatel_detail?.cele_jmeno) && (
                            <span style={{ fontWeight: 500 }}>
                              Evidoval: {highlightSearchText(
                                faktura.vytvoril_uzivatel?.cele_jmeno || faktura.vytvoril_uzivatel_detail?.cele_jmeno,
                                globalFilter
                              )}
                            </span>
                          )}
                        </ListItemTitle>

                        {/* Stav faktury */}
                        {faktura.stav && (
                          <ListItemBadge
                            $success={faktura.stav === 'ZAPLACENA'}
                            $warning={faktura.stav === 'NEZAPLACENA' || faktura.stav === 'VECNA_SPRAVNOST'}
                          >
                            {faktura.stav === 'ZAPLACENA' && <FontAwesomeIcon icon={faCheckCircle} />}
                            {faktura.stav === 'NEZAPLACENA' && <FontAwesomeIcon icon={faHourglassHalf} />}
                            {faktura.stav === 'VECNA_SPRAVNOST' && <FontAwesomeIcon icon={faHourglassHalf} />}
                            {faktura.stav === 'ZAPLACENA' ? 'Zaplacena' : 
                             faktura.stav === 'NEZAPLACENA' ? 'Nezaplacena' :
                             faktura.stav === 'VECNA_SPRAVNOST' ? 'Věcná správnost' :
                             faktura.stav}
                          </ListItemBadge>
                        )}
                      </ListItemHeader>

                      <ListItemMeta>
                        {/* Datum vystavení */}
                        {(faktura.fa_datum_vystaveni || faktura.dt_vystaveni) && (
                          <ListItemMetaItem>
                            <span>Vystavena: {formatDateOnly(faktura.fa_datum_vystaveni || faktura.dt_vystaveni)}</span>
                          </ListItemMetaItem>
                        )}

                        {/* Datum doručení */}
                        {faktura.fa_datum_doruceni && (
                          <ListItemMetaItem>
                            <span>Doručena: {formatDateOnly(faktura.fa_datum_doruceni)}</span>
                          </ListItemMetaItem>
                        )}

                        {/* Datum splatnosti */}
                        {(faktura.fa_datum_splatnosti || faktura.dt_splatnosti) && (
                          <ListItemMetaItem>
                            <span>Splatnost: {formatDateOnly(faktura.fa_datum_splatnosti || faktura.dt_splatnosti)}</span>
                          </ListItemMetaItem>
                        )}

                        {/* Částka bez DPH */}
                        {faktura.castka_bez_dph && parseFloat(faktura.castka_bez_dph) > 0 && (
                          <ListItemMetaItem>
                            <span style={{ fontWeight: 500 }}>Bez DPH:</span>
                            <span style={{ color: '#64748b' }}>
                              {parseFloat(faktura.castka_bez_dph).toLocaleString('cs-CZ')}&nbsp;Kč
                            </span>
                          </ListItemMetaItem>
                        )}

                        {/* DPH částka */}
                        {faktura.dph_castka && parseFloat(faktura.dph_castka) > 0 && (
                          <ListItemMetaItem>
                            <span style={{ fontWeight: 500 }}>DPH:</span>
                            <span style={{ color: '#f59e0b' }}>
                              {parseFloat(faktura.dph_castka).toLocaleString('cs-CZ')}&nbsp;Kč
                            </span>
                          </ListItemMetaItem>
                        )}

                        {/* Částka s DPH - HLAVNÍ HODNOTA */}
                        {faktura.castka_s_dph && parseFloat(faktura.castka_s_dph) > 0 && (
                          <ListItemMetaItem>
                            <span style={{ fontWeight: 700, color: '#059669', fontSize: '1.05em' }}>
                              {parseFloat(faktura.castka_s_dph).toLocaleString('cs-CZ')}&nbsp;Kč
                            </span>
                          </ListItemMetaItem>
                        )}
                      </ListItemMeta>

                      {/* Střediska faktury */}
                      {faktura.fa_strediska_kod && Array.isArray(faktura.fa_strediska_kod) && faktura.fa_strediska_kod.length > 0 && (
                        <div style={{
                          marginTop: '6px',
                          fontSize: '0.85em',
                          color: '#475569',
                          paddingTop: '6px',
                          borderTop: '1px dashed #e2e8f0'
                        }}>
                          <span style={{ fontWeight: 500 }}>Střediska:</span> {highlightSearchText(
                            faktura.fa_strediska_kod.map(kod => getStrediskoNazev(String(kod))).join(', '), 
                            globalFilter
                          )}
                        </div>
                      )}

                      {/* Poznámka k faktuře */}
                      {faktura.fa_poznamka && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 10px',
                          backgroundColor: '#fef9e7',
                          border: '1px solid #fde68a',
                          borderRadius: '4px',
                          fontSize: '0.85em',
                          color: '#92400e',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.4'
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                            Poznámka:
                          </div>
                          {highlightSearchText(faktura.fa_poznamka, globalFilter)}
                        </div>
                      )}

                      {/* Informace o věcné správnosti - zobrazit pouze pokud je potvrzena */}
                      {faktura.stav === 'VECNA_SPRAVNOST' && faktura.vecna_spravnost_potvrzeno === 1 && (
                        <div style={{
                          marginTop: '8px',
                          padding: '10px 12px',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '4px',
                          fontSize: '0.85em'
                        }}>
                          {/* Hlavní nadpis s LP čerpáním */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <div style={{ 
                              fontWeight: 700, 
                              color: '#059669',
                              fontSize: '0.95em'
                            }}>
                              ✓ Věcná správnost potvrzena
                            </div>
                            
                            {/* Čerpání z LP - nadpis vpravo */}
                            {faktura.lp_cerpani && Array.isArray(faktura.lp_cerpani) && faktura.lp_cerpani.length > 0 && (
                              <div style={{ fontWeight: 600, color: '#064e3b', fontSize: '0.9em' }}>
                                Čerpání z LP:
                              </div>
                            )}
                          </div>
                          
                          {/* Grid layout: Umístění + Poznámka vlevo | LP čerpání vpravo */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 1fr',
                            gap: '12px',
                            alignItems: 'start'
                          }}>
                            {/* Levý sloupec: Umístění a Poznámka */}
                            <div>
                              {/* Umístění majetku */}
                              {faktura.vecna_spravnost_umisteni_majetku && (
                                <div style={{ marginBottom: '6px', color: '#064e3b' }}>
                                  <span style={{ fontWeight: 600 }}>Umístění:</span>{' '}
                                  {highlightSearchText(faktura.vecna_spravnost_umisteni_majetku, globalFilter)}
                                </div>
                              )}
                              
                              {/* Poznámka k věcné správnosti */}
                              {faktura.vecna_spravnost_poznamka && (
                                <div style={{ color: '#064e3b' }}>
                                  <span style={{ fontWeight: 600 }}>Poznámka:</span>{' '}
                                  {highlightSearchText(faktura.vecna_spravnost_poznamka, globalFilter)}
                                </div>
                              )}
                            </div>
                            
                            {/* Pravý sloupec: LP čerpání - pouze částky a kódy */}
                            {faktura.lp_cerpani && Array.isArray(faktura.lp_cerpani) && faktura.lp_cerpani.length > 0 && (
                              <div style={{ 
                                paddingLeft: '12px',
                                borderLeft: '2px solid #86efac',
                                textAlign: 'right'
                              }}>
                                {faktura.lp_cerpani.map((lp, idx) => {
                                  // 🔥 FIX: Najít název LP podle lp_id z order.financovani.lp_nazvy
                                  let lpText = lp.lp_cislo || lp.lp_kod || `LP ID: ${lp.lp_id}`;
                                  
                                  // Pokud máme LP názvy v order.financovani.lp_nazvy, použij je
                                  if (order?.financovani?.lp_nazvy && Array.isArray(order.financovani.lp_nazvy)) {
                                    const lpData = order.financovani.lp_nazvy.find(item => item.id === lp.lp_id);
                                    if (lpData) {
                                      const kod = lpData.cislo_lp || lpData.kod || lp.lp_cislo || lp.lp_kod;
                                      const nazev = lpData.nazev || '';
                                      lpText = nazev ? `${kod} - ${nazev}` : kod;
                                    }
                                  }
                                  
                                  return (
                                    <div key={idx} style={{ marginBottom: '6px' }}>
                                      <div style={{ 
                                        fontWeight: 600,
                                        color: '#065f46',
                                        fontSize: '0.95em'
                                      }}>
                                        {lpText}
                                      </div>
                                      <div style={{ 
                                        fontWeight: 700,
                                        color: '#059669',
                                        fontSize: '1em'
                                      }}>
                                        {parseFloat(lp.castka).toLocaleString('cs-CZ')}&nbsp;Kč
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          
                          {/* Kdo potvrdil */}
                          {faktura.potvrdil_vecnou_spravnost_jmeno && faktura.potvrdil_vecnou_spravnost_prijmeni && (
                            <div style={{ 
                              marginTop: '6px', 
                              fontSize: '0.9em',
                              color: '#6b7280',
                              fontStyle: 'italic'
                            }}>
                              Potvrdil: {faktura.potvrdil_vecnou_spravnost_jmeno} {faktura.potvrdil_vecnou_spravnost_prijmeni}
                              {faktura.dt_potvrzeni_vecne_spravnosti && (
                                <span> ({prettyDate(faktura.dt_potvrzeni_vecne_spravnosti)})</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </ListItemCard>
                  );
                })}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                color: '#94a3b8',
                fontSize: '0.9em'
              }}>
                <FontAwesomeIcon icon={faReceipt} style={{ fontSize: '3em', marginBottom: '1rem', opacity: 0.3 }} />
                <div>Žádné faktury</div>
              </div>
            )}
          </InfoCard>
            </MiddleColumn>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PRAVÝ SLOUPEC: PŘÍLOHY */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <AttachmentsColumn>
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 8⃣ VŠECHNY PŘÍLOHY - KATEGORIZOVANÉ */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
            <InfoCard $order={order} $showRowHighlighting={showRowHighlighting}>
              <InfoCardTitle>
                <FontAwesomeIcon icon={faPaperclip} />
                Přílohy ({
                  (order.prilohy_count || prilohy.length) +
                  (dodatecneDokumenty.length) +
                  (faktury.reduce((sum, f) => sum + ((f.prilohy && f.prilohy.length) || 0), 0))
                })
              </InfoCardTitle>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>

                {/* 📎 PŘÍLOHY OBJEDNÁVKY */}
                {hasPrilohy && (
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95em',
                      color: '#1e40af',
                      marginBottom: '8px',
                      paddingBottom: '4px',
                      borderBottom: '2px solid #dbeafe'
                    }}>
                      Přílohy objednávky ({order.prilohy_count || prilohy.length})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {prilohy.slice(0, 10).map((priloha, index) => (
                        <AttachmentItem 
                          key={index}
                          onClick={() => handleDownloadAttachment(priloha, order.id)}
                          style={{ cursor: "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2228%22 height=%2228%22 viewBox=%220 0 28 28%22><path d=%22M2,2 L2,18 L8,12 L12,12 L2,2 Z%22 fill=%22%23000000%22 stroke=%22%23ffffff%22 stroke-width=%221%22/><g transform=%22translate(14,14)%22><circle cx=%227%22 cy=%227%22 r=%227%22 fill=%22%233b82f6%22/><path d=%22M7,4 L7,10 M7,10 L5,8 M7,10 L9,8%22 stroke=%22%23ffffff%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/><line x1=%224%22 y1=%2210.5%22 x2=%2210%22 y2=%2210.5%22 stroke=%22%23ffffff%22 stroke-width=%222%22 stroke-linecap=%22round%22/></g></svg>') 2 2, pointer" }}
                          title={`Stáhnout: ${priloha.nazev_souboru || priloha.nazev || `Příloha ${index + 1}`}`}
                        >
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <AttachmentName style={{ fontWeight: 500 }}>
                                {highlightSearchText(priloha.nazev_souboru || priloha.nazev || `Příloha ${index + 1}`, globalFilter)}
                                {priloha.velikost && (
                                  <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '4px' }}>
                                    ({Math.round(priloha.velikost / 1024)} KB)
                                  </span>
                                )}
                              </AttachmentName>
                              {priloha.typ_prilohy && (
                                <span style={{ 
                                  display: 'inline-block',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '12px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  background: '#dbeafe',
                                  color: '#1e40af'
                                }}>
                                  {window._getAttachmentTypeLabel(priloha.typ_prilohy).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>
                              {priloha.dt_nahrano && formatDateOnly(priloha.dt_nahrano)}
                              {priloha.popis && <> • {highlightSearchText(priloha.popis, globalFilter)}</>}
                            </div>
                          </div>
                          <FontAwesomeIcon
                            icon={faDownload}
                            style={{
                              color: '#3b82f6',
                              marginLeft: '8px'
                            }}
                          />
                        </AttachmentItem>
                      ))}

                      {prilohy.length > 10 && (
                        <div style={{
                          fontSize: '0.85em',
                          color: '#6b7280',
                          fontStyle: 'italic',
                          textAlign: 'center',
                          padding: '8px'
                        }}>
                          ... a dalších {prilohy.length - 10} příloh
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 📄 DODATEČNÉ DOKUMENTY */}
                {hasDodatecneDokumenty && (
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95em',
                      color: '#7c3aed',
                      marginBottom: '8px',
                      paddingBottom: '4px',
                      borderBottom: '2px solid #ede9fe'
                    }}>
                      Dodatečné dokumenty ({dodatecneDokumenty.length})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {dodatecneDokumenty.map((dokument, index) => (
                        <AttachmentItem 
                          key={index}
                          onClick={() => handleDownloadAttachment(dokument, order.id)}
                          style={{ cursor: "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2228%22 height=%2228%22 viewBox=%220 0 28 28%22><path d=%22M2,2 L2,18 L8,12 L12,12 L2,2 Z%22 fill=%22%23000000%22 stroke=%22%23ffffff%22 stroke-width=%221%22/><g transform=%22translate(14,14)%22><circle cx=%227%22 cy=%227%22 r=%227%22 fill=%22%237c3aed%22/><path d=%22M7,4 L7,10 M7,10 L5,8 M7,10 L9,8%22 stroke=%22%23ffffff%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/><line x1=%224%22 y1=%2210.5%22 x2=%2210%22 y2=%2210.5%22 stroke=%22%23ffffff%22 stroke-width=%222%22 stroke-linecap=%22round%22/></g></svg>') 2 2, pointer" }}
                          title={`Stáhnout: ${dokument.nazev_souboru || dokument.nazev || `Dokument ${index + 1}`}`}
                        >
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <AttachmentName style={{ fontWeight: 500 }}>
                              {highlightSearchText(dokument.nazev_souboru || dokument.nazev || `Dokument ${index + 1}`, globalFilter)}
                            </AttachmentName>
                            <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>
                              {dokument.dt_nahrano && formatDateOnly(dokument.dt_nahrano)}
                              {dokument.popis && <> • {highlightSearchText(dokument.popis, globalFilter)}</>}
                            </div>
                          </div>
                          {dokument.velikost && (
                            <AttachmentSize>
                              ({Math.round(dokument.velikost / 1024)} KB)
                            </AttachmentSize>
                          )}
                          <FontAwesomeIcon
                            icon={faDownload}
                            style={{
                              color: '#7c3aed',
                              marginLeft: '8px'
                            }}
                          />
                        </AttachmentItem>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🧾 PŘÍLOHY FAKTUR */}
                {hasFaktury && faktury.some(f => f.prilohy && f.prilohy.length > 0) && (
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.95em',
                      color: '#059669',
                      marginBottom: '8px',
                      paddingBottom: '4px',
                      borderBottom: '2px solid #d1fae5'
                    }}>
                      Přílohy faktur ({faktury.reduce((sum, f) => sum + ((f.prilohy && f.prilohy.length) || 0), 0)})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {faktury.map((faktura, fIndex) => {
                        const fakturaPrilohy = faktura.prilohy || [];
                        if (!fakturaPrilohy.length) return null;

                        return (
                          <div key={fIndex} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Nadpis faktury */}
                            <div style={{
                              fontWeight: 600,
                              fontSize: '0.85em',
                              color: '#047857',
                              marginBottom: '2px',
                              paddingLeft: '4px'
                            }}>
                              Faktura {faktura.cislo_faktury || faktura.fa_cislo_vema || `#${fIndex + 1}`}
                            </div>

                            {/* Přílohy faktury - s levým borderem */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              paddingLeft: '12px',
                              borderLeft: '3px solid #10b981'
                            }}>
                            {fakturaPrilohy.map((priloha, pIndex) => {
                              // ✅ Přidej faktura_id do přílohy pro správný download
                              const prilohaWithFakturaId = { ...priloha, faktura_id: faktura.id };
                              
                              return (
                                <AttachmentItem 
                                  key={pIndex}
                                  onClick={() => handleDownloadAttachment(prilohaWithFakturaId, order.id)}
                                  style={{ 
                                    cursor: "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2228%22 height=%2228%22 viewBox=%220 0 28 28%22><path d=%22M2,2 L2,18 L8,12 L12,12 L2,2 Z%22 fill=%22%23000000%22 stroke=%22%23ffffff%22 stroke-width=%221%22/><g transform=%22translate(14,14)%22><circle cx=%227%22 cy=%227%22 r=%227%22 fill=%22%23059669%22/><path d=%22M7,4 L7,10 M7,10 L5,8 M7,10 L9,8%22 stroke=%22%23ffffff%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/><line x1=%224%22 y1=%2210.5%22 x2=%2210%22 y2=%2210.5%22 stroke=%22%23ffffff%22 stroke-width=%222%22 stroke-linecap=%22round%22/></g></svg>') 2 2, pointer"
                                  }}
                                  title={`Stáhnout: ${priloha.originalni_nazev_souboru || priloha.nazev_souboru || priloha.nazev || 'Dokument'}`}
                                >
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <AttachmentName style={{ fontWeight: 500 }}>
                                      {highlightSearchText(priloha.originalni_nazev_souboru || priloha.nazev_souboru || priloha.nazev || 'Dokument', globalFilter)}
                                      {priloha.velikost_souboru_b && (
                                        <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '4px' }}>
                                          ({Math.round(priloha.velikost_souboru_b / 1024)} KB)
                                        </span>
                                      )}
                                    </AttachmentName>
                                    {priloha.typ_prilohy && (
                                      <span style={{ 
                                        display: 'inline-block',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '12px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: '#d1fae5',
                                        color: '#065f46'
                                      }}>
                                        {window._getAttachmentTypeLabel(priloha.typ_prilohy).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  {priloha.popis && (
                                    <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>
                                      {highlightSearchText(priloha.popis, globalFilter)}
                                    </div>
                                  )}
                                </div>
                                <FontAwesomeIcon
                                  icon={faDownload}
                                  style={{
                                    color: '#059669',
                                    marginLeft: '8px'
                                  }}
                                />
                                </AttachmentItem>
                              );
                            })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pokud nejsou žádné přílohy */}
                {!hasPrilohy && !hasDodatecneDokumenty && !(hasFaktury && faktury.some(f => f.prilohy && f.prilohy.length > 0)) && (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '0.95em'
                  }}>
                    <FontAwesomeIcon icon={faPaperclip} style={{ fontSize: '2em', marginBottom: '0.5rem', opacity: 0.3 }} />
                    <div>Žádné přílohy</div>
                  </div>
                )}

              </div>
            </InfoCard>
            </AttachmentsColumn>
          </ThreeColumnLayout>

          {/* ═══════════════════════════════════════════════════════════════════ */}
        </ExpandedGrid>
      </ExpandedContent>
    );
  };

  // 🎬 Zobraz splash screen během JAKÉHOKOLIV načítání (inicializace i refresh)
  if (loading || !initializationComplete) {
    return (
      <LoadingOverlay $visible={true}>
        <LoadingSpinner $visible={true} />
        <LoadingMessage $visible={true}>
          {!initializationComplete ? 'Inicializace přehledu objednávek' : 'Načítání dat z databáze...'}
        </LoadingMessage>
        <LoadingSubtext $visible={true}>
          {!initializationComplete && !initStepsCompleted.current.dataLoaded && 'Načítání dat z databáze...'}
          {!initializationComplete && initStepsCompleted.current.dataLoaded && !initStepsCompleted.current.paginationRestored && 'Obnovení stránkování...'}
          {!initializationComplete && initStepsCompleted.current.paginationRestored && !initStepsCompleted.current.expandedRestored && 'Rozbalování objednávek...'}
          {!initializationComplete && initStepsCompleted.current.expandedRestored && !initStepsCompleted.current.scrollRestored && 'Obnovení pozice...'}
          {initializationComplete && loading && 'Prosím čekejte...'}
        </LoadingSubtext>
      </LoadingOverlay>
    );
  }

  if (error) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <FontAwesomeIcon icon={faExclamationTriangle} size="2x" style={{ color: '#dc2626' }} />
          <div style={{ marginTop: '1rem', fontSize: '1.25rem', color: '#dc2626' }}>
            Chyba při načítání
          </div>
          <div style={{ marginTop: '0.5rem', color: '#64748b' }}>{error}</div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <ActionButton
              onClick={handleRefresh}
              $primary
            >
              <FontAwesomeIcon icon={faSyncAlt} />
              Zkusit znovu
            </ActionButton>
            <ActionButton
              onClick={() => {}}
            >
              <FontAwesomeIcon icon={faBolt} />
              Debug info
            </ActionButton>
          </div>
        </div>
      </Container>
    );
  }
  
  // CustomSelect wrapper - používá globální komponentu
  const CustomSelectLocal = (props) => (
    <CustomSelect
      {...props}
      selectStates={selectStates}
      setSelectStates={setSearchStates}
      searchStates={searchStates}
      setSearchStates={setSearchStates}
      touchedSelectFields={touchedSelectFields}
      setTouchedSelectFields={setTouchedSelectFields}
      hasTriedToSubmit={hasTriedToSubmit}
      toggleSelect={toggleSelect}
      filterOptions={filterOptions}
      getOptionLabel={getOptionLabel}
    />
  );

  return (
    <>
      {/* ⚠️ Kontrola oprávnění - pokud uživatel nemá žádná práva na objednávky */}
      {!permissions.canViewAll && !permissions.hasOnlyOwn && (
        <Container>
          <div style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            background: '#fff3cd',
            borderRadius: '8px',
            border: '2px solid #ffc107',
            margin: '2rem auto',
            maxWidth: '600px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#856404', marginBottom: '1rem' }}>Nemáte oprávnění</h2>
            <p style={{ color: '#856404', fontSize: '1.1rem', lineHeight: '1.6' }}>
              Pro zobrazení seznamu objednávek nemáte dostatečná oprávnění.<br />
              Kontaktujte administrátora systému.
            </p>
          </div>
        </Container>
      )}

      {/* ✅ Zobrazit obsah pouze pokud má uživatel nějaká práva */}
      {(permissions.canViewAll || permissions.hasOnlyOwn) && (
        <>
      {/* Loading overlay s blur efektem - MIMO Container pro správné zobrazení */}
      <LoadingOverlay $visible={loading}>
        <LoadingSpinner $visible={loading} />
        <LoadingMessage $visible={loading}>
          Načítání dat z databáze...
        </LoadingMessage>
        <LoadingSubtext $visible={loading}>
          Prosím čekejte
        </LoadingSubtext>
      </LoadingOverlay>

      <Container>
      <PageContent $blurred={loading}>
      
      {/* Year Filter - prominent position above header */}
      <YearFilterPanel>
        <YearFilterLeft>
          <YearFilterLabel>
            <FontAwesomeIcon icon={faCalendarAlt} />
            Rok:
          </YearFilterLabel>
          <YearDropdownContainer ref={yearSelectRef}>
            <MonthDropdownButton onClick={toggleYearDropdown}>
              <span>{selectedYear === 'all' ? 'Všechny roky' : selectedYear}</span>
              <FontAwesomeIcon icon={isYearDropdownOpen ? faChevronUp : faChevronDown} />
            </MonthDropdownButton>
            {isYearDropdownOpen && (
              <MonthDropdownMenu>
                {getYearsList().map(year => (
                  <MonthDropdownItem key={year} onClick={() => handleYearChange(year)}>
                    {year === 'all' ? 'Všechny roky' : year}
                  </MonthDropdownItem>
                ))}
              </MonthDropdownMenu>
            )}
          </YearDropdownContainer>

          <MonthFilterLabel>
            <FontAwesomeIcon icon={faCalendarAlt} />
            Období:
          </MonthFilterLabel>
          <MonthDropdownContainer ref={monthSelectRef}>
            <MonthDropdownButton onClick={toggleMonthDropdown}>
              <span>{getMonthLabel(selectedMonth)}</span>
              <FontAwesomeIcon icon={isMonthDropdownOpen ? faChevronUp : faChevronDown} />
            </MonthDropdownButton>
            {isMonthDropdownOpen && (
              <MonthDropdownMenu>
                <MonthDropdownItem onClick={() => handleMonthChange('all')}>
                  Všechny měsíce
                </MonthDropdownItem>
                <MonthDropdownItem onClick={() => handleMonthChange('current-month')}>
                  Aktuální měsíc
                </MonthDropdownItem>
                <MonthDropdownItem onClick={() => handleMonthChange('last-month')}>
                  Poslední měsíc
                </MonthDropdownItem>
                <MonthDropdownItem onClick={() => handleMonthChange('last-quarter')}>
                  Poslední kvartál
                </MonthDropdownItem>
                <MonthDropdownItem onClick={() => handleMonthChange('last-half')}>
                  Poslední půlrok
                </MonthDropdownItem>
                <MonthDropdownItem onClick={() => handleMonthChange('last-year')}>
                  Poslední rok
                </MonthDropdownItem>

                {!showExpandedMonths ? (
                  <>
                    <MonthDropdownItem separator disabled>
                      ━━━━━━━━━━━━━━━━━━━━
                    </MonthDropdownItem>
                    <MonthDropdownItem action onClick={() => handleMonthChange('show-more')}>
                      ➕ Zobrazit další...
                    </MonthDropdownItem>
                  </>
                ) : (
                  <>
                    <MonthDropdownItem separator disabled>
                      ━━━━━━━━━━━━━━━━━━━━
                    </MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('1')}>Leden</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('2')}>Únor</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('3')}>Březen</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('4')}>Duben</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('5')}>Květen</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('6')}>Červen</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('7')}>Červenec</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('8')}>Srpen</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('9')}>Září</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('10')}>Říjen</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('11')}>Listopad</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('12')}>Prosinec</MonthDropdownItem>
                    <MonthDropdownItem separator disabled>
                      ━━━━━━━━━━━━━━━━━━━━
                    </MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('1-3')}>Q1 (Leden-Březen)</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('4-6')}>Q2 (Duben-Červen)</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('7-9')}>Q3 (Červenec-Září)</MonthDropdownItem>
                    <MonthDropdownItem onClick={() => handleMonthChange('10-12')}>Q4 (Říjen-Prosinec)</MonthDropdownItem>
                    <MonthDropdownItem separator disabled>
                      ━━━━━━━━━━━━━━━━━━━━
                    </MonthDropdownItem>
                    <MonthDropdownItem action onClick={() => handleMonthChange('show-less')}>
                      ➖ Zobrazit méně
                    </MonthDropdownItem>
                  </>
                )}
              </MonthDropdownMenu>
            )}
          </MonthDropdownContainer>

          {/* Checkbox pro zobrazení archivovaných objednávek - POUZE PRO UŽIVATELE S PRÁVEM */}
          {hasPermission && hasPermission('ORDER_SHOW_ARCHIVE') && (
            <div style={{
              position: 'relative',
              minWidth: '180px',
              marginLeft: '1rem'
            }}>
              <MonthDropdownButton
                as="label"
                htmlFor="showArchived"
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <input
                  type="checkbox"
                  id="showArchived"
                  checked={showArchived}
                  onChange={handleShowArchivedChange}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: 'rgba(255, 255, 255, 0.9)',
                    margin: 0,
                    flexShrink: 0
                  }}
                />
                <span style={{
                  flex: 1,
                  fontWeight: 600,
                  fontSize: '1rem',
                  textAlign: 'center'
                }}>
                  ARCHIV
                </span>
                <FontAwesomeIcon
                  icon={faArchive}
                  style={{
                    fontSize: '1.1rem',
                    flexShrink: 0
                  }}
                />
              </MonthDropdownButton>
            </div>
          )}

          {/* Tlačítko Obnovit */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SmartTooltip text="Obnovit seznam objednávek (force reload z databáze)" icon="warning" preferredPosition="bottom">
              <RefreshIconButton
                onClick={handleRefresh}
                isBackgroundActive={isBackgroundRefreshActive}
              >
                <FontAwesomeIcon icon={faSyncAlt} />
              </RefreshIconButton>
            </SmartTooltip>
            {lastRefreshTime && (
              <RefreshTimeLabel>
                {lastRefreshTime.toLocaleTimeString('cs-CZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </RefreshTimeLabel>
            )}
          </div>
        </YearFilterLeft>
        <YearFilterTitle>
          {lastLoadSource && (
            <SmartTooltip 
              text={
                <>
                  {(lastLoadSource === 'memory' || lastLoadSource === 'cache')
                    ? '⚡ Načteno z cache (paměti) - rychlé zobrazení bez dotazu na databázi'
                    : '💾 Načteno z databáze - aktuální data přímo ze serveru'
                  }
                  {lastLoadTime && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                      📅 {new Date(lastLoadTime).toLocaleTimeString('cs-CZ')}
                      {lastLoadDuration !== null && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          ⏱ {lastLoadDuration}ms
                        </span>
                      )}
                    </div>
                  )}
                </>
              }
              icon="none"
              preferredPosition="bottom"
            >
              <CacheStatusIcon fromCache={lastLoadSource === 'memory' || lastLoadSource === 'cache'}>
                <FontAwesomeIcon icon={lastLoadSource === 'memory' || lastLoadSource === 'cache' ? faBoltLightning : faDatabase} />
              </CacheStatusIcon>
            </SmartTooltip>
          )}
          <span>
            Přehled objednávek
            {apiMeta?.admin_analysis?.total_without_permission_filters && (
              <sup style={{
                fontSize: '0.5em',
                marginLeft: '0.1rem',
                opacity: 0.6,
                fontWeight: 'normal'
              }}>
                {apiMeta.admin_analysis.total_without_permission_filters}
              </sup>
            )}
          </span>
          <FontAwesomeIcon icon={faFileInvoice} style={{ marginLeft: '0.5rem' }} />
        </YearFilterTitle>
      </YearFilterPanel>

      {/* Page Header */}
      <PageHeader>
        <ActionBar>
          <SmartTooltip text="Vytvořit novou objednávku" icon="success" preferredPosition="bottom">
            <ActionButton
              onClick={handleCreateNewOrder}
              style={{
                background: '#166534',
                color: 'white',
                fontWeight: 600
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
              Nová objednávka
            </ActionButton>
          </SmartTooltip>

          {!showDashboard && (
            <SmartTooltip text="Zobrazit přehledový dashboard s grafy" icon="info" preferredPosition="bottom">
              <ActionButton onClick={handleToggleDashboard}>
                <FontAwesomeIcon icon={faChartBar} />
                Dashboard
              </ActionButton>
            </SmartTooltip>
          )}

          {!showFiltersPanel && (
            <SmartTooltip text="Zobrazit pokročilé filtry" icon="info" preferredPosition="bottom">
              <ActionButton onClick={handleShowFilters}>
                <FontAwesomeIcon icon={faFilter} />
                Filtr
              </ActionButton>
            </SmartTooltip>
          )}

          <SmartTooltip text="Export aktuálního seznamu do CSV souboru" icon="success" preferredPosition="bottom">
            <ActionButton onClick={handleExport}>
              <FontAwesomeIcon icon={faFileExport} />
              Export
            </ActionButton>
          </SmartTooltip>

        </ActionBar>
      </PageHeader>

      {/* Debug Panel */}
      {showDebug && rawData && (
        <DebugPanel>
          <DebugHeader>
            <DebugTitle>
              <FontAwesomeIcon icon={faBolt} />
              🔍 DEBUG - Surová data z databáze
            </DebugTitle>
            <div style={{ display: 'flex', gap: '10px' }}>
              <ActionButton
                onClick={() => window.open('/test-notifications', '_blank')}
                style={{ background: '#1e40af', borderColor: '#60a5fa' }}
              >
                <FontAwesomeIcon icon={faBell} />
                Test Notifikací
              </ActionButton>
              <ActionButton
                onClick={() => setShowModalStylesPanel(true)}
                style={{ background: '#8b5cf6', borderColor: '#a78bfa' }}
              >
                <FontAwesomeIcon icon={faPalette} />
                Návrhy Stylů Modálů
              </ActionButton>
              <ActionButton onClick={handleToggleDebug}>
                <FontAwesomeIcon icon={faTimes} />
                Skrýt debug
              </ActionButton>
            </div>
          </DebugHeader>
          <DebugContent>
            <DebugSection>
              <DebugLabel>📊 Základní info:</DebugLabel>
              <DebugValue>{`Načteno: ${rawData.timestamp}
Počet záznamů: ${rawData.ordersCount}
Dostupná pole: ${rawData.allFields.join(', ')}`}</DebugValue>
            </DebugSection>

            {rawData.firstOrder && (
              <DebugSection>
                <DebugLabel>📝 První záznam (struktura):</DebugLabel>
                <DebugValue>{JSON.stringify(rawData.firstOrder, null, 2)}</DebugValue>
              </DebugSection>
            )}

            <DebugSection>
              <DebugLabel>🗂 Všechna data (JSON):</DebugLabel>
              <DebugValue>{JSON.stringify(rawData.rawData, null, 2)}</DebugValue>
            </DebugSection>
          </DebugContent>
        </DebugPanel>
      )}

      {/* 🧪 Order V2 API Test Panel */}
      {showApiTestPanel && (
        <DebugPanel>
          <DebugHeader>
            <DebugTitle>
              <FontAwesomeIcon icon={faBolt} />
              🧪 ORDER V2 API TEST PANEL
            </DebugTitle>
            <ActionButton onClick={() => setShowApiTestPanel(false)}>
              <FontAwesomeIcon icon={faTimes} />
              Zavřít
            </ActionButton>
          </DebugHeader>
          <DebugContent>
            {!apiTestData ? (
              <DebugSection>
                <DebugLabel>⏳ Čekám na data...</DebugLabel>
                <DebugValue>Změň filtr (rok, měsíc, archiv checkbox) nebo klikni na Obnovit pro načtení dat.</DebugValue>
              </DebugSection>
            ) : (
              <>
                {/* Filter State */}
                <DebugSection>
                  <DebugLabel>🎛 Stav filtrů:</DebugLabel>
                  <DebugValue>{JSON.stringify({
                    showArchived: apiTestData.filterState?.showArchived,
                    selectedYear: apiTestData.filterState?.selectedYear,
                    selectedMonth: apiTestData.filterState?.selectedMonth,
                    canViewAllOrders: apiTestData.filterState?.canViewAllOrders,
                    currentUserId: apiTestData.filterState?.currentUserId
                  }, null, 2)}</DebugValue>
                </DebugSection>

            {/* API Request */}
            <DebugSection>
              <DebugLabel>📡 API Request (co se posílá):</DebugLabel>
              <DebugValue>{JSON.stringify({
                endpoint: '/order-v2/list-enriched',
                filters: apiTestData.requestFilters,
                timestamp: apiTestData.requestTimestamp
              }, null, 2)}</DebugValue>
            </DebugSection>

            {/* API Response Summary */}
            <DebugSection>
              <DebugLabel>📥 API Response (co přišlo z BE):</DebugLabel>
              <DebugValue>{`Celkem objednávek: ${apiTestData.apiResponseCount || 0}
Archivované: ${apiTestData.archivedInResponse || 0}
Nearchivované: ${(apiTestData.apiResponseCount || 0) - (apiTestData.archivedInResponse || 0)}
Timestamp: ${apiTestData.responseTimestamp || 'N/A'}`}</DebugValue>
            </DebugSection>

            {/* Frontend Filter Result */}
            <DebugSection>
              <DebugLabel>🔍 Po frontend filtraci (co se zobrazuje):</DebugLabel>
              <DebugValue>{`Zobrazeno objednávek: ${apiTestData.filteredCount || 0}
Archivované: ${apiTestData.archivedInFiltered || 0}
Nearchivované: ${apiTestData.nonArchivedInFiltered || 0}`}</DebugValue>
            </DebugSection>

            {/* First 3 Orders Sample */}
            {apiTestData.apiResponse && apiTestData.apiResponse.length > 0 && (
              <DebugSection>
                <DebugLabel>📝 Ukázka prvních 3 objednávek z API:</DebugLabel>
                <DebugValue>{JSON.stringify(
                  apiTestData.apiResponse.slice(0, 3).map(o => ({
                    id: o.id,
                    cislo_objednavky: o.cislo_objednavky,
                    stav_objednavky: o.stav_objednavky,
                    uzivatel_id: o.uzivatel_id,
                    garant_uzivatel_id: o.garant_uzivatel_id,
                    dt_objednavky: o.dt_objednavky,
                    datum_obj_od: o.datum_obj_od,
                    datum_obj_do: o.datum_obj_do
                  })),
                  null,
                  2
                )}</DebugValue>
              </DebugSection>
            )}

            {/* Full API Response */}
            <DebugSection>
              <DebugLabel>🗂 Kompletní API Response (JSON):</DebugLabel>
              <DebugValue style={{ maxHeight: '400px', overflow: 'auto' }}>
                {JSON.stringify(apiTestData.apiResponse, null, 2)}
              </DebugValue>
            </DebugSection>
              </>
            )}
          </DebugContent>
        </DebugPanel>
      )}

      {/* 🎨 Modal Styles Design Panel - Návrhy stylů modálních dialogů */}
      {showModalStylesPanel && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 10001,
          overflow: 'auto',
          padding: '2rem'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            background: '#1e293b',
            borderRadius: '16px',
            padding: '2rem',
            color: 'white'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              borderBottom: '2px solid #334155',
              paddingBottom: '1rem'
            }}>
              <h2 style={{
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '1.75rem',
                fontWeight: 800
              }}>
                <FontAwesomeIcon icon={faPalette} style={{ color: '#a78bfa' }} />
                🎨 Návrhy Stylů Modálních Dialogů
              </h2>
              <button
                onClick={() => setShowModalStylesPanel(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <FontAwesomeIcon icon={faTimes} /> Zavřít
              </button>
            </div>

            {/* Intro Text */}
            <div style={{
              background: '#334155',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '2px solid #475569'
            }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem' }}>
                <strong>📋 Instrukce:</strong> Níže vidíte různé návrhy stylů pro modální confirming dialogy.
              </p>
              <p style={{ margin: 0, color: '#cbd5e1' }}>
                Každý návrh má <strong>jednoznačný název</strong> - vyber si styl, který se ti líbí,
                a řekni mi název. Pak jej použijeme jako základ pro jednotný modal systém v celé aplikaci.
              </p>
            </div>

            {/* Grid s návrhy */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: '2rem'
            }}>

              {/* NÁVRH 1: CURRENT-STYLE - Současný styl z aplikace */}
              <div style={{
                background: '#0f172a',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '2px solid #1e40af'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#60a5fa',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  borderBottom: '2px solid #1e40af',
                  paddingBottom: '0.5rem'
                }}>
                  CURRENT-STYLE (Současný)
                </h3>

                {/* Preview modalu */}
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      fontSize: '1.5rem'
                    }}>
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      margin: 0
                    }}>
                      Potvrzení akce
                    </h3>
                  </div>

                  <div style={{
                    marginBottom: '2rem',
                    lineHeight: '1.6',
                    color: '#475569'
                  }}>
                    <p style={{ margin: 0 }}>
                      Toto je ukázka současného stylu modálního dialogu.
                      Design používá kulaté ikonky, světlé pozadí a jemné stíny.
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                  }}>
                    <button style={{
                      padding: '0.75rem 1.5rem',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontWeight: 600,
                      background: 'white',
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}>
                      Zrušit
                    </button>
                    <button style={{
                      padding: '0.75rem 1.5rem',
                      border: '2px solid #dc2626',
                      borderRadius: '8px',
                      fontWeight: 600,
                      background: '#dc2626',
                      color: 'white',
                      cursor: 'pointer'
                    }}>
                      Potvrdit
                    </button>
                  </div>
                </div>
              </div>

              {/* NÁVRH 2: GRADIENT-MODERN */}
              <div style={{
                background: '#0f172a',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '2px solid #8b5cf6'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#a78bfa',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  borderBottom: '2px solid #8b5cf6',
                  paddingBottom: '0.5rem'
                }}>
                  GRADIENT-MODERN (Moderní gradient)
                </h3>

                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    borderBottom: '3px solid #553c9a'
                  }}>
                    <div style={{
                      fontSize: '2rem',
                      color: 'white',
                      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
                    }}>
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                    </div>
                    <h3 style={{
                      margin: 0,
                      color: 'white',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      Potvrzení akce
                    </h3>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <p style={{
                      margin: '0 0 1.5rem 0',
                      color: '#374151',
                      lineHeight: '1.6'
                    }}>
                      Moderní design s barevným gradientovým headerem.
                      Čisté, profesionální a vizuálně zajímavé.
                    </p>

                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      justifyContent: 'flex-end',
                      borderTop: '2px solid #f3f4f6',
                      paddingTop: '1.5rem'
                    }}>
                      <button style={{
                        padding: '0.75rem 1.5rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '10px',
                        fontWeight: 700,
                        background: 'white',
                        color: '#6b7280',
                        cursor: 'pointer'
                      }}>
                        Zrušit
                      </button>
                      <button style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                      }}>
                        Potvrdit
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* NÁVRH 3: MINIMAL-CLEAN */}
              <div style={{
                background: '#0f172a',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '2px solid #10b981'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#34d399',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  borderBottom: '2px solid #10b981',
                  paddingBottom: '0.5rem'
                }}>
                  MINIMAL-CLEAN (Minimalistický čistý)
                </h3>

                <div style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '2rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    borderLeft: '4px solid #dc2626',
                    paddingLeft: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: '#111827',
                      margin: 0
                    }}>
                      Potvrzení akce
                    </h3>
                  </div>

                  <p style={{
                    margin: '0 0 2rem 0',
                    color: '#6b7280',
                    lineHeight: '1.6',
                    fontSize: '0.9375rem'
                  }}>
                    Jednoduchý, minimalistický design bez zbytečných dekorací.
                    Soustředění na obsah a čitelnost.
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end'
                  }}>
                    <button style={{
                      padding: '0.5rem 1.25rem',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 500,
                      background: '#f3f4f6',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      Zrušit
                    </button>
                    <button style={{
                      padding: '0.5rem 1.25rem',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 500,
                      background: '#dc2626',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      Potvrdit
                    </button>
                  </div>
                </div>
              </div>

              {/* NÁVRH 4: CARD-ELEVATED */}
              <div style={{
                background: '#0f172a',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '2px solid #f59e0b'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#fbbf24',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  borderBottom: '2px solid #f59e0b',
                  paddingBottom: '0.5rem'
                }}>
                  CARD-ELEVATED (Kartový zvýšený)
                </h3>

                <div style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '0',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  border: 'none',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#f8fafc',
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d97706',
                        fontSize: '1.75rem',
                        boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.1)'
                      }}>
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                      </div>
                      <div>
                        <h3 style={{
                          fontSize: '1.375rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          margin: 0
                        }}>
                          Potvrzení akce
                        </h3>
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#64748b',
                          margin: '0.25rem 0 0 0'
                        }}>
                          Důležité rozhodnutí
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '2rem' }}>
                    <p style={{
                      margin: '0 0 2rem 0',
                      color: '#475569',
                      lineHeight: '1.7',
                      fontSize: '1rem'
                    }}>
                      Elegantní kartový design s výrazným stínem a detailním headerem.
                      Premium pocit a profesionální vzhled.
                    </p>

                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      justifyContent: 'flex-end'
                    }}>
                      <button style={{
                        padding: '0.875rem 1.75rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        fontWeight: 600,
                        background: 'white',
                        color: '#475569',
                        cursor: 'pointer',
                        fontSize: '0.9375rem'
                      }}>
                        Zrušit
                      </button>
                      <button style={{
                        padding: '0.875rem 1.75rem',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 600,
                        background: '#dc2626',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.9375rem',
                        boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.25)'
                      }}>
                        Potvrdit
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* NÁVRH 5: DARK-CONTRAST */}
              <div style={{
                background: '#0f172a',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '2px solid #ec4899'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#f9a8d4',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  borderBottom: '2px solid #ec4899',
                  paddingBottom: '0.5rem'
                }}>
                  DARK-CONTRAST (Tmavý kontrastní)
                </h3>

                <div style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  border: '1px solid #334155'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '2px solid #ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f87171',
                      fontSize: '1.5rem'
                    }}>
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#f1f5f9',
                      margin: 0
                    }}>
                      Potvrzení akce
                    </h3>
                  </div>

                  <p style={{
                    margin: '0 0 2rem 0',
                    color: '#cbd5e1',
                    lineHeight: '1.6'
                  }}>
                    Tmavý režim s vysokým kontrastem. Ideální pro aplikace
                    s dark mode nebo pro noční použití.
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                  }}>
                    <button style={{
                      padding: '0.75rem 1.5rem',
                      border: '2px solid #475569',
                      borderRadius: '8px',
                      fontWeight: 600,
                      background: '#0f172a',
                      color: '#cbd5e1',
                      cursor: 'pointer'
                    }}>
                      Zrušit
                    </button>
                    <button style={{
                      padding: '0.75rem 1.5rem',
                      border: '2px solid #ef4444',
                      borderRadius: '8px',
                      fontWeight: 600,
                      background: '#ef4444',
                      color: 'white',
                      cursor: 'pointer'
                    }}>
                      Potvrdit
                    </button>
                  </div>
                </div>
              </div>

              {/* NÁVRH 6: GLASS-MORPHISM */}
              <div style={{
                background: '#0f172a',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '2px solid #06b6d4'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: '#22d3ee',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  borderBottom: '2px solid #06b6d4',
                  paddingBottom: '0.5rem'
                }}>
                  GLASS-MORPHISM (Skleněný morfismus)
                </h3>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                  border: '1px solid rgba(255, 255, 255, 0.18)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(220, 38, 38, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(220, 38, 38, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      fontSize: '1.5rem'
                    }}>
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      margin: 0
                    }}>
                      Potvrzení akce
                    </h3>
                  </div>

                  <p style={{
                    margin: '0 0 2rem 0',
                    color: '#475569',
                    lineHeight: '1.6'
                  }}>
                    Moderní glassmorphism efekt s průhledností a rozmazáním.
                    Trendy design s hloubkou a vrstvením.
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                  }}>
                    <button style={{
                      padding: '0.75rem 1.5rem',
                      border: '2px solid rgba(209, 213, 219, 0.5)',
                      borderRadius: '8px',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}>
                      Zrušit
                    </button>
                    <button style={{
                      padding: '0.75rem 1.5rem',
                      border: '2px solid rgba(220, 38, 38, 0.5)',
                      borderRadius: '8px',
                      fontWeight: 600,
                      background: 'rgba(220, 38, 38, 0.9)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      cursor: 'pointer'
                    }}>
                      Potvrdit
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: '#334155',
              borderRadius: '12px',
              border: '2px solid #475569'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#f1f5f9' }}>
                💡 Tip pro výběr:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#cbd5e1', lineHeight: '1.8' }}>
                <li><strong>CURRENT-STYLE:</strong> Zachováme současný vzhled, jen jej zrefaktorujeme</li>
                <li><strong>GRADIENT-MODERN:</strong> Barevný, živý, moderní - hodí se pro mladší publikum</li>
                <li><strong>MINIMAL-CLEAN:</strong> Nejjednodušší, bez dekorací - rychlé načítání, univerzální</li>
                <li><strong>CARD-ELEVATED:</strong> Premium, elegantní - pro business aplikace</li>
                <li><strong>DARK-CONTRAST:</strong> Pro dark mode nebo večerní práci</li>
                <li><strong>GLASS-MORPHISM:</strong> Trendy, moderní - efektní ale může být náročnější na výkon</li>
              </ul>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dashboard */}
      {showDashboard && (
        <DashboardPanel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>
              <FontAwesomeIcon icon={faChartBar} style={{ color: '#3b82f6' }} />
              Dashboard objednávek {
                dashboardMode === 'custom' ? '(vlastní rozložení)' : 
                (dashboardCompact ? '(kompaktní)' : '(plný)')
              }
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* VLASTNÍ - viditelný pouze pokud má user nastavení */}
              {hasCustomTileSettings && (
                <SmartTooltip
                  text="Zobrazit dlaždice podle nastavení v profilu"
                  icon="info"
                  preferredPosition="bottom"
                >
                  <ActionButton 
                    onClick={handleToggleCustomDashboard}
                    style={{
                      background: dashboardMode === 'custom' ? '#3b82f6' : undefined,
                      color: dashboardMode === 'custom' ? 'white' : undefined,
                      fontWeight: dashboardMode === 'custom' ? '600' : undefined
                    }}
                  >
                    <FontAwesomeIcon icon={faList} />
                    Vlastní
                  </ActionButton>
                </SmartTooltip>
              )}

              {/* PLNÝ/KOMPAKTNÍ toggle */}
              <SmartTooltip
                text={dashboardCompact
                  ? 'Zobrazit plný dashboard se všemi statistikami'
                  : 'Zobrazit kompaktní dashboard (pouze celková hodnota)'}
                icon="info"
                preferredPosition="bottom"
              >
                <ActionButton onClick={handleToggleDashboardView}>
                  <FontAwesomeIcon icon={dashboardCompact ? faTableColumns : faFileInvoice} />
                  {dashboardCompact ? 'Plný' : 'Kompaktní'}
                </ActionButton>
              </SmartTooltip>

              <SmartTooltip text="Skrýt dashboard a zobrazit pouze tabulku objednávek" icon="info" preferredPosition="bottom">
                <ActionButton onClick={handleToggleDashboard}>
                  <FontAwesomeIcon icon={faTimes} />
                  Skrýt
                </ActionButton>
              </SmartTooltip>
            </div>
          </div>
          <DashboardGrid>
            {dashboardMode === 'custom' ? (
              // 🎨 VLASTNÍ REŽIM - zobrazit všechny zaškrtnuté dlaždice (ignorovat Plný/Kompaktní)
              <>
                {/* LargeStatCard celkem - vždy */}
                <LargeStatCard $color={STATUS_COLORS.TOTAL.dark}>
                  <div>
                    <LargeStatValue>
                      {Math.round(filteredStats.totalAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                    </LargeStatValue>
                    <LargeStatLabel>
                      Celková cena s DPH za období ({filteredStats.total})
                    </LargeStatLabel>
                    {(() => {
                      const hasActiveFilters =
                        globalFilter ||
                        (Array.isArray(statusFilter) && statusFilter.length > 0) ||
                        userFilter ||
                        dateFromFilter ||
                        dateToFilter ||
                        amountFromFilter ||
                        amountToFilter ||
                        Object.values(columnFilters).some(val => val);

                      if (hasActiveFilters && filteredData.length < orders.length) {
                        const filteredAmount = filteredData.reduce((sum, order) => {
                          const amount = getOrderTotalPriceWithDPH(order);
                          return sum + (isNaN(amount) ? 0 : amount);
                        }, 0);

                        return (
                          <div style={{
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid rgba(100, 116, 139, 0.2)'
                          }}>
                            <div style={{
                              fontSize: '1.25rem',
                              fontWeight: '700',
                              color: '#f59e0b',
                              textAlign: 'center',
                              marginBottom: '0.25rem'
                            }}>
                              {Math.round(filteredAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#f59e0b',
                              textAlign: 'center',
                              paddingBottom: '0.75rem',
                              borderBottom: '1px solid rgba(100, 116, 139, 0.2)'
                            }}>
                              Celková cena s DPH za vybrané ({filteredData.length})
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <SummaryRow>
                    <SummaryItem
                      $color="#d97706"
                      $bg="rgba(217, 119, 6, 0.08)"
                    >
                      <SummaryLabel $color="#92400e">Rozpracované</SummaryLabel>
                      <SummaryValue>
                        {Math.round(filteredData.reduce((sum, order) => {
                          const status = getOrderSystemStatus(order);
                          const isCancelledOrRejected = ['STORNOVA', 'ZAMITNUTA', 'ZRUSENA', 'CANCELLED', 'SMAZANA'].includes(status);
                          const isCompleted = ['DOKONCENA', 'VYRIZENA', 'COMPLETED'].includes(status);
                          if (!isCancelledOrRejected && !isCompleted) {
                            const amount = getOrderTotalPriceWithDPH(order);
                            return sum + (isNaN(amount) ? 0 : amount);
                          }
                          return sum;
                        }, 0)).toLocaleString('cs-CZ')}&nbsp;Kč
                      </SummaryValue>
                    </SummaryItem>

                    <SummaryItem
                      $color="#059669"
                      $bg="rgba(5, 150, 105, 0.08)"
                    >
                      <SummaryLabel $color="#065f46">Dokončené</SummaryLabel>
                      <SummaryValue>
                        {Math.round(filteredData.reduce((sum, order) => {
                          const status = getOrderSystemStatus(order);
                          const isCompleted = ['DOKONCENA', 'VYRIZENA', 'COMPLETED'].includes(status);
                          if (isCompleted) {
                            const amount = getOrderTotalPriceWithDPH(order);
                            return sum + (isNaN(amount) ? 0 : amount);
                          }
                          return sum;
                        }, 0)).toLocaleString('cs-CZ')}&nbsp;Kč
                      </SummaryValue>
                    </SummaryItem>
                  </SummaryRow>
                </LargeStatCard>

                {/* Počet objednávek - vždy */}
                <StatCard $color="#2196f3">
                  <StatHeader>
                    <StatValue>{filteredData.filter(o => !o.isDraft && !o.isLocalConcept).length}</StatValue>
                    <StatIcon $color="#2196f3">
                      <FontAwesomeIcon icon={faFileAlt} />
                    </StatIcon>
                  </StatHeader>
                  <StatLabel>Počet objednávek</StatLabel>
                </StatCard>

                {/* 🎨 VŠECHNY STAVOVÉ DLAŽDICE - filtrované podle viditelne_dlazdice */}
                {isTileVisible('nova') && (
                  <StatCard
                    $color={STATUS_COLORS.NOVA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'nova'}
                    onClick={() => handleStatusFilterClick('nova')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.nova}</StatValue>
                      <StatIcon>{getStatusEmoji('nova')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Nová / Koncept</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('ke_schvaleni') && (
                  <StatCard
                    $color={STATUS_COLORS.KE_SCHVALENI.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'ke_schvaleni'}
                    onClick={() => handleStatusFilterClick('ke_schvaleni')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.ke_schvaleni}</StatValue>
                      <StatIcon $color={STATUS_COLORS.KE_SCHVALENI.dark}>
                        <FontAwesomeIcon icon={faHourglassHalf} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Ke schválení</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('schvalena') && (
                  <StatCard
                    $color={STATUS_COLORS.SCHVALENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'schvalena'}
                    onClick={() => handleStatusFilterClick('schvalena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.schvalena}</StatValue>
                      <StatIcon $color={STATUS_COLORS.SCHVALENA.dark}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Schválená</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('zamitnuta') && (
                  <StatCard
                    $color={STATUS_COLORS.ZAMITNUTA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'zamitnuta'}
                    onClick={() => handleStatusFilterClick('zamitnuta')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.zamitnuta}</StatValue>
                      <StatIcon $color={STATUS_COLORS.ZAMITNUTA.dark}>
                        <FontAwesomeIcon icon={faTimesCircle} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Zamítnutá</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('rozpracovana') && (
                  <StatCard
                    $color={STATUS_COLORS.ROZPRACOVANA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'rozpracovana'}
                    onClick={() => handleStatusFilterClick('rozpracovana')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.rozpracovana}</StatValue>
                      <StatIcon>{getStatusEmoji('rozpracovana')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Rozpracovaná</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('odeslana_dodavateli') && (
                  <StatCard
                    $color={STATUS_COLORS.ODESLANA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'odeslana'}
                    onClick={() => handleStatusFilterClick('odeslana')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.odeslana}</StatValue>
                      <StatIcon>{getStatusEmoji('odeslana')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Odeslaná dodavateli</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('potvrzena_dodavatelem') && (
                  <StatCard
                    $color={STATUS_COLORS.POTVRZENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'potvrzena'}
                    onClick={() => handleStatusFilterClick('potvrzena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.potvrzena}</StatValue>
                      <StatIcon>{getStatusEmoji('potvrzena')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Potvrzená dodavatelem</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('k_uverejneni_do_registru') && (
                  <StatCard
                    $color={STATUS_COLORS.K_UVEREJNENI_DO_REGISTRU.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'k_uverejneni_do_registru'}
                    onClick={() => handleStatusFilterClick('k_uverejneni_do_registru')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.k_uverejneni_do_registru}</StatValue>
                      <StatIcon>{getStatusEmoji('k_uverejneni_do_registru')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Ke zveřejnění</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('uverejnena') && (
                  <StatCard
                    $color={STATUS_COLORS.UVEREJNENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'uverejnena'}
                    onClick={() => handleStatusFilterClick('uverejnena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.uverejnena}</StatValue>
                      <StatIcon>{getStatusEmoji('uverejnena')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Zveřejněno</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('ceka_na_potvrzeni') && (
                  <StatCard
                    $color={STATUS_COLORS.CEKA_POTVRZENI.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'ceka_potvrzeni'}
                    onClick={() => handleStatusFilterClick('ceka_potvrzeni')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.ceka_potvrzeni}</StatValue>
                      <StatIcon>{getStatusEmoji('ceka_potvrzeni')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Čeká na potvrzení</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('ceka_se') && (
                  <StatCard
                    $color={STATUS_COLORS.CEKA_SE.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'ceka_se'}
                    onClick={() => handleStatusFilterClick('ceka_se')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.ceka_se}</StatValue>
                      <StatIcon>{getStatusEmoji('ceka_se')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Odloženo</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('fakturace') && (
                  <StatCard
                    $color={STATUS_COLORS.FAKTURACE.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'fakturace'}
                    onClick={() => handleStatusFilterClick('fakturace')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.fakturace}</StatValue>
                      <StatIcon>{getStatusEmoji('fakturace')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Fakturace</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('vecna_spravnost') && (
                  <StatCard
                    $color={STATUS_COLORS.VECNA_SPRAVNOST.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'vecna_spravnost'}
                    onClick={() => handleStatusFilterClick('vecna_spravnost')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.vecna_spravnost}</StatValue>
                      <StatIcon>{getStatusEmoji('vecna_spravnost')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Věcná správnost</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('dokoncena') && (
                  <StatCard
                    $color={STATUS_COLORS.DOKONCENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'dokoncena'}
                    onClick={() => handleStatusFilterClick('dokoncena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.dokoncena}</StatValue>
                      <StatIcon>{getStatusEmoji('dokoncena')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Dokončená</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('zrusena') && (
                  <StatCard
                    $color={STATUS_COLORS.ZRUSENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'zrusena'}
                    onClick={() => handleStatusFilterClick('zrusena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.zrusena}</StatValue>
                      <StatIcon>{getStatusEmoji('zrusena')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Zrušená</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('smazana') && (
                  <StatCard
                    $color={STATUS_COLORS.SMAZANA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'smazana'}
                    onClick={() => handleStatusFilterClick('smazana')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.smazana}</StatValue>
                      <StatIcon>{getStatusEmoji('smazana')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Smazaná</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('archivovano') && (
                  <StatCard
                    $color={STATUS_COLORS.ARCHIVOVANO.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'archivovano'}
                    onClick={() => handleStatusFilterClick('archivovano')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.archivovano}</StatValue>
                      <StatIcon>{getStatusEmoji('archivovano')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Archivováno / Import</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('s_fakturou') && (
                  <StatCard
                    $color={STATUS_COLORS.WITH_INVOICES.dark}
                    $clickable={true}
                    $isActive={filterWithInvoices}
                    onClick={handleToggleInvoicesFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.withInvoices}</StatValue>
                      <StatIcon>📄</StatIcon>
                    </StatHeader>
                    <StatLabel>S fakturou</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('s_prilohami') && (
                  <StatCard
                    $color={STATUS_COLORS.WITH_ATTACHMENTS.dark}
                    $clickable={true}
                    $isActive={filterWithAttachments}
                    onClick={handleToggleAttachmentsFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.withAttachments}</StatValue>
                      <StatIcon>📎</StatIcon>
                    </StatHeader>
                    <StatLabel>S přílohami</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('mimoradne_udalosti') && (
                  <StatCard
                    $color="#dc2626"
                    $clickable={true}
                    $isActive={filterMimoradneObjednavky}
                    onClick={handleToggleMimoradneFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.mimoradneUdalosti}</StatValue>
                      <StatIcon $color="#dc2626">
                        <FontAwesomeIcon icon={faBoltLightning} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Mimořádné události</StatLabel>
                  </StatCard>
                )}

                {/* Moje objednávky dlaždice - pro všechny uživatele */}
                {isTileVisible('moje_objednavky') && (() => {
                  const currentUserIdNum = parseInt(user_id, 10);

                  const myOrdersCount = filteredData.filter(order => {
                    const isObjednatel = parseInt(order.uzivatel_id, 10) === currentUserIdNum;
                    const isGarant = parseInt(order.garant_uzivatel_id, 10) === currentUserIdNum;
                    const isSchvalovatel = parseInt(order.schvalovatel_id, 10) === currentUserIdNum;
                    const isPrikazce = parseInt(order.prikazce_id, 10) === currentUserIdNum;

                    return isObjednatel || isGarant || isSchvalovatel || isPrikazce;
                  }).length;

                  return (
                    <StatCard
                      $color="#7c3aed"
                      $clickable={true}
                      $isActive={showOnlyMyOrders}
                      onClick={handleToggleOnlyMyOrders}
                    >
                      <StatHeader>
                        <StatValue>{myOrdersCount}</StatValue>
                        <StatIcon $color="#7c3aed">
                          <FontAwesomeIcon icon={faUser} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Moje objednávky</StatLabel>
                    </StatCard>
                  );
                })()}

                {/*  Dodatečné dokumenty dlaždice */}
                {isTileVisible('dodatecne_dokumenty') && (() => {
                  let dokumentyCount = 0;

                  filteredData.forEach(order => {
                    if (order._enriched?.dodatecne_dokumenty && Array.isArray(order._enriched.dodatecne_dokumenty)) {
                      dokumentyCount += order._enriched.dodatecne_dokumenty.length;
                    }
                    if (!order._enriched?.dodatecne_dokumenty && order._enriched?.dodatecne_dokumenty_count) {
                      dokumentyCount += order._enriched.dodatecne_dokumenty_count;
                    }
                  });

                  return dokumentyCount > 0 ? (
                    <StatCard $color="#06b6d4">
                      <StatHeader>
                        <StatValue>{dokumentyCount}</StatValue>
                        <StatIcon $color="#06b6d4">
                          <FontAwesomeIcon icon={faFileAlt} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Dodat. dokumenty</StatLabel>
                    </StatCard>
                  ) : null;
                })()}

                {/* ✅ Věcná kontrola dlaždice */}
                {isTileVisible('vecna_kontrola') && (() => {
                  let vecnaKontrolaCount = 0;
                  let vecnaKontrolaOk = 0;

                  filteredData.forEach(order => {
                    if (order._enriched?.vecna_kontrola) {
                      vecnaKontrolaCount++;
                      if (order._enriched.vecna_kontrola.stav === 'OK' ||
                          order._enriched.vecna_kontrola.stav === 'SCHVALENO' ||
                          order._enriched.vecna_kontrola.provedena === true) {
                        vecnaKontrolaOk++;
                      }
                    }
                    if (order.vecna_kontrola === true || order.vecna_spravnost === true) {
                      vecnaKontrolaCount++;
                      vecnaKontrolaOk++;
                    }
                  });

                  return vecnaKontrolaCount > 0 ? (
                    <StatCard $color="#10b981" title={`Schváleno: ${vecnaKontrolaOk} z ${vecnaKontrolaCount}`}>
                      <StatHeader>
                        <StatValue>{vecnaKontrolaOk}/{vecnaKontrolaCount}</StatValue>
                        <StatIcon $color="#10b981">
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Věcná kontrola</StatLabel>
                    </StatCard>
                  ) : null;
                })()}

                {/* 📋 Registr smluv dlaždice */}
                {isTileVisible('registr_smluv') && (() => {
                  let registrSmlouvCount = 0;
                  let registrSmlouvAktivni = 0;

                  filteredData.forEach(order => {
                    if (order._enriched?.registr_smluv) {
                      registrSmlouvCount++;
                      if (order._enriched.registr_smluv.stav === 'AKTIVNI' ||
                          order._enriched.registr_smluv.aktivni === true) {
                        registrSmlouvAktivni++;
                      }
                    }
                    if (order.cislo_smlouvy || order._enriched?.cislo_smlouvy) {
                      registrSmlouvCount++;
                      registrSmlouvAktivni++;
                    }
                  });

                  return registrSmlouvCount > 0 ? (
                    <StatCard $color="#0ea5e9" title={`Aktivních: ${registrSmlouvAktivni} z ${registrSmlouvCount}`}>
                      <StatHeader>
                        <StatValue>{registrSmlouvCount}</StatValue>
                        <StatIcon $color="#0ea5e9">
                          <FontAwesomeIcon icon={faFileContract} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Registr smluv</StatLabel>
                    </StatCard>
                  ) : null;
                })()}

                {/* 🎯 Fáze dokončení dlaždice */}
                {isTileVisible('faze_dokonceni') && (() => {
                  let fazeDokonceniCount = 0;
                  let fazeDokonceniHotovo = 0;

                  filteredData.forEach(order => {
                    if (order._enriched?.faze_dokonceni || order.dokonceno) {
                      fazeDokonceniCount++;
                      if (order.dokonceno === 1 || order._enriched?.faze_dokonceni?.stav === 'DOKONCENO') {
                        fazeDokonceniHotovo++;
                      }
                    }
                  });

                  return fazeDokonceniCount > 0 ? (
                    <StatCard $color="#ec4899" title={`Dokončeno: ${fazeDokonceniHotovo} z ${fazeDokonceniCount}`}>
                      <StatHeader>
                        <StatValue>{fazeDokonceniHotovo}/{fazeDokonceniCount}</StatValue>
                        <StatIcon $color="#ec4899">
                          <FontAwesomeIcon icon={faRocket} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Fáze dokončení</StatLabel>
                    </StatCard>
                  ) : null;
                })()}
              </>
            ) : dashboardCompact ? (
              // Kompaktní verze
              <>
                <StatCard $color={STATUS_COLORS.TOTAL.dark}>
                  <div style={{ width: '100%' }}>
                    <StatValue style={{ textAlign: 'left' }}>{Math.round(filteredStats.totalAmount).toLocaleString('cs-CZ')}&nbsp;Kč</StatValue>
                    <StatLabel style={{ textAlign: 'left' }}>Celková cena s DPH za období ({stats.total})</StatLabel>
                    {(() => {
                      const hasActiveFilters =
                        globalFilter ||
                        (Array.isArray(statusFilter) && statusFilter.length > 0) ||
                        userFilter ||
                        dateFromFilter ||
                        dateToFilter ||
                        amountFromFilter ||
                        amountToFilter ||
                        Object.values(columnFilters).some(val => val);

                      if (hasActiveFilters && filteredData.length < orders.length) {
                        const filteredAmount = filteredData.reduce((sum, order) => {
                          const amount = getOrderTotalPriceWithDPH(order);
                          return sum + (isNaN(amount) ? 0 : amount);
                        }, 0);

                        return (
                          <div style={{
                            marginTop: '0.5rem',
                            paddingTop: '0.5rem',
                            borderTop: '1px solid rgba(100, 116, 139, 0.2)'
                          }}>
                            <div style={{
                              fontSize: '1rem',
                              fontWeight: '700',
                              color: '#f59e0b',
                              textAlign: 'left',
                              marginBottom: '0.125rem'
                            }}>
                              {Math.round(filteredAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                            </div>
                            <div style={{
                              fontSize: '0.65rem',
                              fontWeight: '600',
                              color: '#f59e0b',
                              textAlign: 'left',
                              paddingBottom: '0.5rem',
                              borderBottom: '1px solid rgba(100, 116, 139, 0.2)'
                            }}>
                              Celková cena s DPH za vybrané ({filteredData.filter(o => !o.isDraft && !o.isLocalConcept).length})
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </StatCard>

                <StatCard $color="#2196f3">
                  <StatHeader>
                    <StatValue>{filteredData.filter(o => !o.isDraft && !o.isLocalConcept).length}</StatValue>
                    <StatIcon $color="#2196f3">
                      <FontAwesomeIcon icon={faFileAlt} />
                    </StatIcon>
                  </StatHeader>
                  <StatLabel>Počet objednávek</StatLabel>
                </StatCard>

                {filteredStats.ke_schvaleni > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.KE_SCHVALENI.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'ke_schvaleni'}
                    onClick={() => handleStatusFilterClick('ke_schvaleni')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.ke_schvaleni}</StatValue>
                      <StatIcon $color={STATUS_COLORS.KE_SCHVALENI.dark}>
                        <FontAwesomeIcon icon={getStatusIcon('ke_schvaleni')} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Ke schválení</StatLabel>
                  </StatCard>
                )}
                {filteredStats.schvalena > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.SCHVALENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'schvalena'}
                    onClick={() => handleStatusFilterClick('schvalena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.schvalena}</StatValue>
                      <StatIcon $color={STATUS_COLORS.SCHVALENA.dark}>
                        <FontAwesomeIcon icon={getStatusIcon('schvalena')} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Schválená</StatLabel>
                  </StatCard>
                )}
                {filteredStats.rozpracovana > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.ROZPRACOVANA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'rozpracovana'}
                    onClick={() => handleStatusFilterClick('rozpracovana')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.rozpracovana}</StatValue>
                      <StatIcon $color={STATUS_COLORS.ROZPRACOVANA.dark}>
                        <FontAwesomeIcon icon={getStatusIcon('rozpracovana')} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Rozpracovaná</StatLabel>
                  </StatCard>
                )}
                {filteredStats.odeslana > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.ODESLANA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'odeslana'}
                    onClick={() => handleStatusFilterClick('odeslana')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.odeslana}</StatValue>
                      <StatIcon $color={STATUS_COLORS.ODESLANA.dark}>
                        <FontAwesomeIcon icon={getStatusIcon('odeslana')} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Odeslaná dodavateli</StatLabel>
                  </StatCard>
                )}
                {filteredStats.potvrzena > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.POTVRZENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'potvrzena'}
                    onClick={() => handleStatusFilterClick('potvrzena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.potvrzena}</StatValue>
                      <StatIcon $color={STATUS_COLORS.POTVRZENA.dark}>
                      <FontAwesomeIcon icon={getStatusIcon('potvrzena')} />
                    </StatIcon>
                  </StatHeader>
                  <StatLabel>Potvrzená dodavatelem</StatLabel>
                </StatCard>
                )}
                {filteredStats.k_uverejneni_do_registru > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.K_UVEREJNENI_DO_REGISTRU.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'k_uverejneni_do_registru'}
                    onClick={() => handleStatusFilterClick('k_uverejneni_do_registru')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.k_uverejneni_do_registru}</StatValue>
                      <StatIcon $color={STATUS_COLORS.K_UVEREJNENI_DO_REGISTRU.dark}>
                        <FontAwesomeIcon icon={getStatusIcon('k_uverejneni_do_registru')} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Ke zveřejnění</StatLabel>
                  </StatCard>
                )}
                {filteredStats.uverejnena > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.UVEREJNENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'uverejnena'}
                    onClick={() => handleStatusFilterClick('uverejnena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.uverejnena}</StatValue>
                      <StatIcon $color={STATUS_COLORS.UVEREJNENA.dark}>
                        <FontAwesomeIcon icon={getStatusIcon('uverejnena')} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Zveřejněno</StatLabel>
                  </StatCard>
                )}
                {filteredStats.vecna_spravnost > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.VECNA_SPRAVNOST.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'vecna_spravnost'}
                    onClick={() => handleStatusFilterClick('vecna_spravnost')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.vecna_spravnost}</StatValue>
                      <StatIcon $color={STATUS_COLORS.VECNA_SPRAVNOST.dark}>
                        <FontAwesomeIcon icon={getStatusIcon('vecna_spravnost')} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Věcná správnost</StatLabel>
                  </StatCard>
                )}
                {filteredStats.fakturace > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.FAKTURACE.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'fakturace'}
                    onClick={() => handleStatusFilterClick('fakturace')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.fakturace}</StatValue>
                      <StatIcon $color={STATUS_COLORS.FAKTURACE.dark}>
                        <FontAwesomeIcon icon={getStatusIcon('fakturace')} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Fakturace</StatLabel>
                  </StatCard>
                )}
                {filteredStats.dokoncena > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.DOKONCENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'dokoncena'}
                    onClick={() => handleStatusFilterClick('dokoncena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.dokoncena}</StatValue>
                      <StatIcon $color={STATUS_COLORS.DOKONCENA.dark}>
                        🎯
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Dokončená</StatLabel>
                  </StatCard>
                )}
                {filteredStats.withInvoices > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.WITH_INVOICES.dark}
                    $clickable={true}
                    $isActive={filterWithInvoices}
                    onClick={handleToggleInvoicesFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.withInvoices}</StatValue>
                      <StatIcon $color={STATUS_COLORS.WITH_INVOICES.dark}>
                        <FontAwesomeIcon icon={faFileInvoice} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>S fakturou</StatLabel>
                  </StatCard>
                )}
                {filteredStats.withAttachments > 0 && (
                  <StatCard
                    $color={STATUS_COLORS.WITH_ATTACHMENTS.dark}
                    $clickable={true}
                    $isActive={filterWithAttachments}
                    onClick={handleToggleAttachmentsFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.withAttachments}</StatValue>
                      <StatIcon $color={STATUS_COLORS.WITH_ATTACHMENTS.dark}>
                        <FontAwesomeIcon icon={faPaperclip} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>S přílohami</StatLabel>
                  </StatCard>
                )}

                {stats.mimoradneUdalosti > 0 && (
                  <StatCard
                    $color="#dc2626"
                    $clickable={true}
                    $isActive={filterMimoradneObjednavky}
                    onClick={handleToggleMimoradneFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.mimoradneUdalosti}</StatValue>
                      <StatIcon $color="#dc2626">
                        <FontAwesomeIcon icon={faBoltLightning} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Mimořádné události</StatLabel>
                  </StatCard>
                )}

                {/* Moje objednávky dlaždice - pro všechny uživatele (kompaktní režim) */}
                {(() => {
                  // Spočítej kolik objednávek patří danému uživateli ZE FILTROVANÝCH DAT
                  // Order V2 API enriched používá tyto názvy polí:
                  // - uzivatel_id: ID objednatele (vytvořil objednávku)
                  // - garant_uzivatel_id: ID garanta (NE garant_id!)
                  // - prikazce_id: ID příkazce
                  // - schvalovatel_id: ID schvalovatele

                  // 🔥 CRITICAL FIX: Konverze user_id na number pro porovnání (API V2 vrací čísla)
                  const currentUserIdNum = parseInt(user_id, 10);

                  const myOrdersCount = filteredData.filter(order => {
                    const isObjednatel = parseInt(order.uzivatel_id, 10) === currentUserIdNum;
                    const isGarant = parseInt(order.garant_uzivatel_id, 10) === currentUserIdNum;
                    const isSchvalovatel = parseInt(order.schvalovatel_id, 10) === currentUserIdNum;
                    const isPrikazce = parseInt(order.prikazce_id, 10) === currentUserIdNum;

                    return isObjednatel || isGarant || isSchvalovatel || isPrikazce;
                  }).length;

                  return (
                    <StatCard
                      $color="#7c3aed"
                      $clickable={true}
                      $isActive={showOnlyMyOrders}
                      onClick={handleToggleOnlyMyOrders}
                    >
                      <StatHeader>
                        <StatValue>{myOrdersCount}</StatValue>
                        <StatIcon $color="#7c3aed">
                          <FontAwesomeIcon icon={faUser} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Moje objednávky</StatLabel>
                    </StatCard>
                  );
                })()}
              </>
            ) : (
              // Plná verze s čistým designem
              <>
                <LargeStatCard $color={STATUS_COLORS.TOTAL.dark}>
                  <div>
                    <LargeStatValue>
                      {Math.round(filteredStats.totalAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                    </LargeStatValue>
                    <LargeStatLabel>
                      Celková cena s DPH za období ({stats.total})
                    </LargeStatLabel>
                    {(() => {
                      const hasActiveFilters =
                        globalFilter ||
                        (Array.isArray(statusFilter) && statusFilter.length > 0) ||
                        userFilter ||
                        dateFromFilter ||
                        dateToFilter ||
                        amountFromFilter ||
                        amountToFilter ||
                        Object.values(columnFilters).some(val => val);

                      if (hasActiveFilters && filteredData.length < orders.length) {
                        const filteredAmount = filteredData.reduce((sum, order) => {
                          const amount = getOrderTotalPriceWithDPH(order);
                          return sum + (isNaN(amount) ? 0 : amount);
                        }, 0);

                        return (
                          <div style={{
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid rgba(100, 116, 139, 0.2)'
                          }}>
                            <div style={{
                              fontSize: '1.25rem',
                              fontWeight: '700',
                              color: '#f59e0b',
                              textAlign: 'center',
                              marginBottom: '0.25rem'
                            }}>
                              {Math.round(filteredAmount).toLocaleString('cs-CZ')}&nbsp;Kč
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#f59e0b',
                              textAlign: 'center',
                              paddingBottom: '0.75rem',
                              borderBottom: '1px solid rgba(100, 116, 139, 0.2)'
                            }}>
                              Celková cena s DPH za vybrané ({filteredData.length})
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <SummaryRow>
                    <SummaryItem
                      $color="#d97706"
                      $bg="rgba(217, 119, 6, 0.08)"
                    >
                      <SummaryLabel $color="#92400e">Rozpracované</SummaryLabel>
                      <SummaryValue>
                        {Math.round(filteredData.reduce((sum, order) => {
                          const status = getOrderSystemStatus(order);
                          const isCancelledOrRejected = ['STORNOVA', 'ZAMITNUTA', 'ZRUSENA', 'CANCELLED', 'SMAZANA'].includes(status);
                          const isCompleted = ['DOKONCENA', 'VYRIZENA', 'COMPLETED'].includes(status);
                          if (!isCancelledOrRejected && !isCompleted) {
                            const amount = getOrderTotalPriceWithDPH(order);
                            return sum + (isNaN(amount) ? 0 : amount);
                          }
                          return sum;
                        }, 0)).toLocaleString('cs-CZ')}&nbsp;Kč
                      </SummaryValue>
                    </SummaryItem>

                    <SummaryItem
                      $color="#059669"
                      $bg="rgba(5, 150, 105, 0.08)"
                    >
                      <SummaryLabel $color="#065f46">Dokončené</SummaryLabel>
                      <SummaryValue>
                        {Math.round(filteredData.reduce((sum, order) => {
                          const status = getOrderSystemStatus(order);
                          const isCompleted = ['DOKONCENA', 'VYRIZENA', 'COMPLETED'].includes(status);
                          if (isCompleted) {
                            const amount = getOrderTotalPriceWithDPH(order);
                            return sum + (isNaN(amount) ? 0 : amount);
                          }
                          return sum;
                        }, 0)).toLocaleString('cs-CZ')}&nbsp;Kč
                      </SummaryValue>
                    </SummaryItem>
                  </SummaryRow>
                </LargeStatCard>

                <StatCard $color="#2196f3">
                  <StatHeader>
                    <StatValue>{filteredData.filter(o => !o.isDraft && !o.isLocalConcept).length}</StatValue>
                    <StatIcon $color="#2196f3">
                      <FontAwesomeIcon icon={faFileAlt} />
                    </StatIcon>
                  </StatHeader>
                  <StatLabel>Počet objednávek</StatLabel>
                </StatCard>

                {isTileVisible('nova') && (
                  <StatCard
                    $color={STATUS_COLORS.NOVA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'nova'}
                    onClick={() => handleStatusFilterClick('nova')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.nova}</StatValue>
                      <StatIcon>{getStatusEmoji('nova')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Nová / Koncept</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('ke_schvaleni') && (
                  <StatCard
                    $color={STATUS_COLORS.KE_SCHVALENI.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'ke_schvaleni'}
                    onClick={() => handleStatusFilterClick('ke_schvaleni')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.ke_schvaleni}</StatValue>
                      <StatIcon $color={STATUS_COLORS.KE_SCHVALENI.dark}>
                        <FontAwesomeIcon icon={faHourglassHalf} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Ke schválení</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('schvalena') && (
                  <StatCard
                    $color={STATUS_COLORS.SCHVALENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'schvalena'}
                    onClick={() => handleStatusFilterClick('schvalena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.schvalena}</StatValue>
                      <StatIcon $color={STATUS_COLORS.SCHVALENA.dark}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Schválená</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('zamitnuta') && (
                  <StatCard
                    $color={STATUS_COLORS.ZAMITNUTA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'zamitnuta'}
                    onClick={() => handleStatusFilterClick('zamitnuta')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.zamitnuta}</StatValue>
                      <StatIcon $color={STATUS_COLORS.ZAMITNUTA.dark}>
                        <FontAwesomeIcon icon={faTimesCircle} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Zamítnutá</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('rozpracovana') && (
                  <StatCard
                    $color={STATUS_COLORS.ROZPRACOVANA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'rozpracovana'}
                    onClick={() => handleStatusFilterClick('rozpracovana')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.rozpracovana}</StatValue>
                      <StatIcon>{getStatusEmoji('rozpracovana')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Rozpracovaná</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('odeslana_dodavateli') && (
                  <StatCard
                    $color={STATUS_COLORS.ODESLANA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'odeslana'}
                    onClick={() => handleStatusFilterClick('odeslana')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.odeslana}</StatValue>
                      <StatIcon>{getStatusEmoji('odeslana')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Odeslaná dodavateli</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('potvrzena_dodavatelem') && (
                  <StatCard
                    $color={STATUS_COLORS.POTVRZENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'potvrzena'}
                    onClick={() => handleStatusFilterClick('potvrzena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.potvrzena}</StatValue>
                      <StatIcon>{getStatusEmoji('potvrzena')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Potvrzená dodavatelem</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('k_uverejneni_do_registru') && (
                  <StatCard
                    $color={STATUS_COLORS.K_UVEREJNENI_DO_REGISTRU.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'k_uverejneni_do_registru'}
                    onClick={() => handleStatusFilterClick('k_uverejneni_do_registru')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.k_uverejneni_do_registru}</StatValue>
                      <StatIcon>{getStatusEmoji('k_uverejneni_do_registru')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Ke zveřejnění</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('uverejnena') && (
                  <StatCard
                    $color={STATUS_COLORS.UVEREJNENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'uverejnena'}
                    onClick={() => handleStatusFilterClick('uverejnena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.uverejnena}</StatValue>
                      <StatIcon>{getStatusEmoji('uverejnena')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Zveřejněno</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('ceka_na_potvrzeni') && (
                  <StatCard
                    $color={STATUS_COLORS.CEKA_POTVRZENI.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'ceka_potvrzeni'}
                    onClick={() => handleStatusFilterClick('ceka_potvrzeni')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.ceka_potvrzeni}</StatValue>
                      <StatIcon>{getStatusEmoji('ceka_potvrzeni')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Čeká na potvrzení</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('ceka_se') && (
                  <StatCard
                    $color={STATUS_COLORS.CEKA_SE.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'ceka_se'}
                    onClick={() => handleStatusFilterClick('ceka_se')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.ceka_se}</StatValue>
                      <StatIcon>{getStatusEmoji('ceka_se')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Odloženo</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('fakturace') && (
                  <StatCard
                    $color={STATUS_COLORS.FAKTURACE.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'fakturace'}
                    onClick={() => handleStatusFilterClick('fakturace')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.fakturace}</StatValue>
                      <StatIcon>{getStatusEmoji('fakturace')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Fakturace</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('vecna_spravnost') && (
                  <StatCard
                    $color={STATUS_COLORS.VECNA_SPRAVNOST.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'vecna_spravnost'}
                    onClick={() => handleStatusFilterClick('vecna_spravnost')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.vecna_spravnost}</StatValue>
                      <StatIcon>{getStatusEmoji('vecna_spravnost')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Věcná správnost</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('dokoncena') && (
                  <StatCard
                    $color={STATUS_COLORS.DOKONCENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'dokoncena'}
                    onClick={() => handleStatusFilterClick('dokoncena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.dokoncena}</StatValue>
                      <StatIcon>{getStatusEmoji('dokoncena')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Dokončená</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('zrusena') && (
                  <StatCard
                    $color={STATUS_COLORS.ZRUSENA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'zrusena'}
                    onClick={() => handleStatusFilterClick('zrusena')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.zrusena}</StatValue>
                      <StatIcon>{getStatusEmoji('zrusena')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Zrušená</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('smazana') && (
                  <StatCard
                    $color={STATUS_COLORS.SMAZANA.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'smazana'}
                    onClick={() => handleStatusFilterClick('smazana')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.smazana}</StatValue>
                      <StatIcon>{getStatusEmoji('smazana')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Smazaná</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('archivovano') && (
                  <StatCard
                    $color={STATUS_COLORS.ARCHIVOVANO.dark}
                    $clickable={true}
                    $isActive={activeStatusFilter === 'archivovano'}
                    onClick={() => handleStatusFilterClick('archivovano')}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.archivovano}</StatValue>
                      <StatIcon>{getStatusEmoji('archivovano')}</StatIcon>
                    </StatHeader>
                    <StatLabel>Archivováno / Import</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('s_fakturou') && (
                  <StatCard
                    $color={STATUS_COLORS.WITH_INVOICES.dark}
                    $clickable={true}
                    $isActive={filterWithInvoices}
                    onClick={handleToggleInvoicesFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.withInvoices}</StatValue>
                      <StatIcon>📄</StatIcon>
                    </StatHeader>
                    <StatLabel>S fakturou</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('s_prilohami') && (
                  <StatCard
                    $color={STATUS_COLORS.WITH_ATTACHMENTS.dark}
                    $clickable={true}
                    $isActive={filterWithAttachments}
                    onClick={handleToggleAttachmentsFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.withAttachments}</StatValue>
                      <StatIcon>📎</StatIcon>
                    </StatHeader>
                    <StatLabel>S přílohami</StatLabel>
                  </StatCard>
                )}

                {isTileVisible('mimoradne_udalosti') && (
                  <StatCard
                    $color="#dc2626"
                    $clickable={true}
                    $isActive={filterMimoradneObjednavky}
                    onClick={handleToggleMimoradneFilter}
                  >
                    <StatHeader>
                      <StatValue>{filteredStats.mimoradneUdalosti}</StatValue>
                      <StatIcon $color="#dc2626">
                        <FontAwesomeIcon icon={faBoltLightning} />
                      </StatIcon>
                    </StatHeader>
                    <StatLabel>Mimořádné události</StatLabel>
                  </StatCard>
                )}

                {/* Moje objednávky dlaždice - pro všechny uživatele */}
                {isTileVisible('moje_objednavky') && (() => {
                  // Spočítej kolik objednávek patří danému uživateli ZE FILTROVANÝCH DAT
                  // Order V2 API enriched používá tyto názvy polí:
                  // - uzivatel_id: ID objednatele (vytvořil objednávku)
                  // - garant_uzivatel_id: ID garanta (NE garant_id!)
                  // - prikazce_id: ID příkazce
                  // - schvalovatel_id: ID schvalovatele

                  // 🔥 CRITICAL FIX: Konverze user_id na number pro porovnání (API V2 vrací čísla)
                  const currentUserIdNum = parseInt(user_id, 10);

                  const myOrdersCount = filteredData.filter(order => {
                    const isObjednatel = parseInt(order.uzivatel_id, 10) === currentUserIdNum;
                    const isGarant = parseInt(order.garant_uzivatel_id, 10) === currentUserIdNum;
                    const isSchvalovatel = parseInt(order.schvalovatel_id, 10) === currentUserIdNum;
                    const isPrikazce = parseInt(order.prikazce_id, 10) === currentUserIdNum;

                    return isObjednatel || isGarant || isSchvalovatel || isPrikazce;
                  }).length;

                  return (
                    <StatCard
                      $color="#7c3aed"
                      $clickable={true}
                      $isActive={showOnlyMyOrders}
                      onClick={handleToggleOnlyMyOrders}
                    >
                      <StatHeader>
                        <StatValue>{myOrdersCount}</StatValue>
                        <StatIcon $color="#7c3aed">
                          <FontAwesomeIcon icon={faUser} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Moje objednávky</StatLabel>
                    </StatCard>
                  );
                })()}

                {/*  Dodatečné dokumenty dlaždice */}
                {isTileVisible('dodatecne_dokumenty') && (() => {
                  let dokumentyCount = 0;

                  filteredData.forEach(order => {
                    if (order._enriched?.dodatecne_dokumenty && Array.isArray(order._enriched.dodatecne_dokumenty)) {
                      dokumentyCount += order._enriched.dodatecne_dokumenty.length;
                    }
                    // Fallback
                    if (!order._enriched?.dodatecne_dokumenty && order._enriched?.dodatecne_dokumenty_count) {
                      dokumentyCount += order._enriched.dodatecne_dokumenty_count;
                    }
                  });

                  return dokumentyCount > 0 ? (
                    <StatCard $color="#06b6d4">
                      <StatHeader>
                        <StatValue>{dokumentyCount}</StatValue>
                        <StatIcon $color="#06b6d4">
                          <FontAwesomeIcon icon={faFileAlt} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Dodat. dokumenty</StatLabel>
                    </StatCard>
                  ) : null;
                })()}

                {/* ✅ Věcná kontrola dlaždice */}
                {isTileVisible('vecna_kontrola') && (() => {
                  let vecnaKontrolaCount = 0;
                  let vecnaKontrolaOk = 0;

                  filteredData.forEach(order => {
                    if (order._enriched?.vecna_kontrola) {
                      vecnaKontrolaCount++;
                      if (order._enriched.vecna_kontrola.stav === 'OK' ||
                          order._enriched.vecna_kontrola.stav === 'SCHVALENO' ||
                          order._enriched.vecna_kontrola.provedena === true) {
                        vecnaKontrolaOk++;
                      }
                    }
                    // Fallback na boolean pole
                    if (order.vecna_kontrola === true || order.vecna_spravnost === true) {
                      vecnaKontrolaCount++;
                      vecnaKontrolaOk++;
                    }
                  });

                  return vecnaKontrolaCount > 0 ? (
                    <StatCard $color="#10b981" title={`Schváleno: ${vecnaKontrolaOk} z ${vecnaKontrolaCount}`}>
                      <StatHeader>
                        <StatValue>{vecnaKontrolaOk}/{vecnaKontrolaCount}</StatValue>
                        <StatIcon $color="#10b981">
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Věcná kontrola</StatLabel>
                    </StatCard>
                  ) : null;
                })()}

                {/* 📋 Registr smluv dlaždice */}
                {isTileVisible('registr_smluv') && (() => {
                  let registrSmlouvCount = 0;
                  let registrSmlouvAktivni = 0;

                  filteredData.forEach(order => {
                    if (order._enriched?.registr_smluv) {
                      registrSmlouvCount++;
                      if (order._enriched.registr_smluv.stav === 'AKTIVNI' ||
                          order._enriched.registr_smluv.aktivni === true) {
                        registrSmlouvAktivni++;
                      }
                    }
                    // Fallback na číslo smlouvy
                    if (order.cislo_smlouvy || order._enriched?.cislo_smlouvy) {
                      registrSmlouvCount++;
                      registrSmlouvAktivni++; // Předpokládáme aktivní pokud má číslo
                    }
                  });

                  return registrSmlouvCount > 0 ? (
                    <StatCard $color="#0ea5e9" title={`Aktivních: ${registrSmlouvAktivni} z ${registrSmlouvCount}`}>
                      <StatHeader>
                        <StatValue>{registrSmlouvCount}</StatValue>
                        <StatIcon $color="#0ea5e9">
                          <FontAwesomeIcon icon={faFileContract} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Registr smluv</StatLabel>
                    </StatCard>
                  ) : null;
                })()}

                {/* 🎯 Fáze dokončení dlaždice */}
                {isTileVisible('faze_dokonceni') && (() => {
                  let fazeDokonceniCount = 0;
                  let fazeDokonceniHotovo = 0;

                  filteredData.forEach(order => {
                    if (order._enriched?.faze_dokonceni || order.dokonceno) {
                      fazeDokonceniCount++;
                      if (order.dokonceno === 1 || order._enriched?.faze_dokonceni?.stav === 'DOKONCENO') {
                        fazeDokonceniHotovo++;
                      }
                    }
                  });

                  return fazeDokonceniCount > 0 ? (
                    <StatCard $color="#ec4899" title={`Dokončeno: ${fazeDokonceniHotovo} z ${fazeDokonceniCount}`}>
                      <StatHeader>
                        <StatValue>{fazeDokonceniHotovo}/{fazeDokonceniCount}</StatValue>
                        <StatIcon $color="#ec4899">
                          <FontAwesomeIcon icon={faRocket} />
                        </StatIcon>
                      </StatHeader>
                      <StatLabel>Fáze dokončení</StatLabel>
                    </StatCard>
                  ) : null;
                })()}
              </>
            )}
          </DashboardGrid>
        </DashboardPanel>
      )}

      {/* Filters */}
      {showFiltersPanel && (
        <FiltersPanel>
          <FiltersHeader>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FontAwesomeIcon icon={faFilter} style={{ color: '#3b82f6' }} />
            Filtry a vyhledávání
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* 🔧 ADMIN: Checkbox pro zobrazení POUZE neaktivních objednávek */}
            {isAdmin && (
              <AdminCheckboxWrapper title="Zobrazit pouze neaktivní (smazané) objednávky - viditelné pouze pro administrátory">
                <input
                  type="checkbox"
                  checked={showOnlyInactive}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setRowSelection({});
                    
                    // 🔧 KRITICKÉ: Okamžitě vymazat cache a nastavit novou hodnotu
                    ordersCacheService.invalidate(null);
                    setShowOnlyInactive(newValue);
                    
                    // 🔧 KRITICKÉ: Předat novou hodnotu přímo do loadData pomocí override parametru
                    // Jinak by loadData použil starou hodnotu ze state (closure)
                    await loadData(true, false, newValue);
                  }}
                />
                <FontAwesomeIcon icon={faEyeSlash} />
                <span>Pouze neaktivní</span>
              </AdminCheckboxWrapper>
            )}

            <SmartTooltip text="Vymazat všechny filtry a zobrazit všechny objednávky" icon="warning" preferredPosition="bottom">
              <ActionButton onClick={clearFilters} style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: 'white' }}>
                <FontAwesomeIcon icon={faEraser} />
                Vymazat filtry
              </ActionButton>
            </SmartTooltip>

            <SmartTooltip text="Načíst vlastní filtr stavů z vašich nastavení (Profil → Nastavení → Výchozí filtry stavů objednávek)" icon="info" preferredPosition="bottom">
              <ActionButton 
                onClick={loadCustomStatusFilter} 
                style={{
                  backgroundColor: (() => {
                    // Check if custom filter is active
                    try {
                      const userSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
                      const customFilter = userSettings?.vychozi_filtry_stavu_objednavek;
                      if (customFilter && Array.isArray(customFilter) && customFilter.length > 0) {
                        // Compare current statusFilter with custom filter
                        if (statusFilter.length === customFilter.length && 
                            statusFilter.every(val => customFilter.includes(val))) {
                          return '#3b82f6'; // Active - blue
                        }
                      }
                    } catch (e) {}
                    return 'transparent'; // Inactive - transparent
                  })(),
                  borderColor: '#3b82f6',
                  color: (() => {
                    try {
                      const userSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
                      const customFilter = userSettings?.vychozi_filtry_stavu_objednavek;
                      if (customFilter && Array.isArray(customFilter) && customFilter.length > 0) {
                        if (statusFilter.length === customFilter.length && 
                            statusFilter.every(val => customFilter.includes(val))) {
                          return 'white'; // Active - white text
                        }
                      }
                    } catch (e) {}
                    return '#3b82f6'; // Inactive - blue text
                  })(),
                }}
              >
                <FontAwesomeIcon icon={faFilter} />
                Vlastní
              </ActionButton>
            </SmartTooltip>

            <SmartTooltip
              text={showFilters
                ? 'Skrýt rozšířené filtry (zobrazit pouze základní vyhledávání)'
                : 'Zobrazit rozšířené filtry (stav, fakturace, uživatelé, lokality...)'}
              icon="info"
              preferredPosition="bottom"
            >
              <ActionButton onClick={handleToggleFilters}>
                <FontAwesomeIcon icon={showFilters ? faChevronUp : faChevronDown} />
                {showFilters ? 'Skrýt filtry' : 'Rozšířený filtr'}
              </ActionButton>
            </SmartTooltip>

            <SmartTooltip text="Skrýt celý panel filtrů a vyhledávání" icon="info" preferredPosition="bottom">
              <ActionButton onClick={handleHideFilters}>
                <FontAwesomeIcon icon={faTimes} />
                Skrýt
              </ActionButton>
            </SmartTooltip>
          </div>
        </FiltersHeader>

        <FilterGroup>
          <FilterLabel>
            <FontAwesomeIcon icon={faSearch} />
            Fulltext vyhledávání
            <HintText title="Vyhledávání bez diakritiky a bez rozlišení velikosti písmen. 💡 Tip: SHIFT+Enter rozbalí/zabalí všechny řádky se shodou vyhledávání">
              💡 Bez diakritiky • <kbd>Shift</kbd> + <kbd>Enter</kbd> rozbalí řádky se shodou vyhledávání
            </HintText>
          </FilterLabel>
          <FilterInputWithIcon>
            <FontAwesomeIcon icon={faSearch} />
            <FilterInput
              type="text"
              placeholder="Hledat v evidenčním čísle, předmětu, objednateli..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              onKeyDown={(e) => {
                // 🔍 SHIFT+Enter = Rozbal/Zabal všechny nalezené objednávky
                if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault();

                  if (filteredData && filteredData.length > 0) {
                    // Zjisti zda jsou všechny rozbalené
                    const allExpanded = filteredData.every((_, index) => expanded[index]);

                    if (allExpanded) {
                      // Zabal všechny
                      setExpanded({});
                      showToast?.(
                        `Zabaleno ${filteredData.length} ${filteredData.length === 1 ? 'objednávka' : filteredData.length < 5 ? 'objednávky' : 'objednávek'}`,
                        { type: 'info', duration: 2000 }
                      );
                    } else {
                      // Rozbal všechny
                      const newExpanded = {};
                      filteredData.forEach((order, index) => {
                        newExpanded[index] = true;
                      });
                      setExpanded(newExpanded);

                      showToast?.(
                        `Rozbaleno ${filteredData.length} ${filteredData.length === 1 ? 'objednávka' : filteredData.length < 5 ? 'objednávky' : 'objednávek'}`,
                        { type: 'success', duration: 2000 }
                      );
                    }
                  }
                }
              }}
              hasIcon
              title="Fulltextové vyhledávání bez diakritiky a bez rozlišení velikosti písmen.&#10;💡 Tip: SHIFT+Enter pro rozbalení/zabalení všech výsledků"
            />
            {globalFilter && (
              <ClearButton onClick={() => setGlobalFilter('')} title="Vymazat">
                <FontAwesomeIcon icon={faTimes} />
              </ClearButton>
            )}
          </FilterInputWithIcon>
        </FilterGroup>

        {showFilters && (
          <FiltersGrid>
            {/* První řádek: Objednatel, Garant, Příkazce, Schvalovatel, Stav objednávky */}
            <FilterGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faUser} />
                  Objednatel
                </FilterLabelLeft>
                <FilterClearButton
                  type="button"
                  visible={selectedObjednatel.length > 0}
                  onClick={clearObjednatelFilter}
                  title="Vymazat filtr"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </FilterClearButton>
              </FilterLabel>
              <SelectWithIcon>
                <MultiSelectLocal
                  field="selectedObjednatel"
                  value={selectedObjednatel}
                  onChange={handleObjednatelChange}
                  options={sortedActiveUsers}
                  placeholder="Vyberte objednatele..."
                  icon={<FontAwesomeIcon icon={faUser} />}
                />
              </SelectWithIcon>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faUser} />
                  Garant
                </FilterLabelLeft>
                <FilterClearButton
                  type="button"
                  visible={selectedGarant.length > 0}
                  onClick={clearGarantFilter}
                  title="Vymazat filtr"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </FilterClearButton>
              </FilterLabel>
              <SelectWithIcon>
                <MultiSelectLocal
                  field="selectedGarant"
                  value={selectedGarant}
                  onChange={handleGarantChange}
                  options={sortedActiveUsers}
                  placeholder="Vyberte garanty..."
                  icon={<FontAwesomeIcon icon={faUser} />}
                />
              </SelectWithIcon>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faUser} />
                  Příkazce
                </FilterLabelLeft>
                <FilterClearButton
                  type="button"
                  visible={selectedPrikazce.length > 0}
                  onClick={clearPrikazceFilter}
                  title="Vymazat filtr"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </FilterClearButton>
              </FilterLabel>
              <SelectWithIcon>
                <MultiSelectLocal
                  field="selectedPrikazce"
                  value={selectedPrikazce}
                  onChange={handlePrikazceChange}
                  options={sortedActiveApprovers}
                  placeholder="Vyberte příkazce..."
                  icon={<FontAwesomeIcon icon={faUser} />}
                />
              </SelectWithIcon>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faShield} />
                  Schvalovatel
                </FilterLabelLeft>
                <FilterClearButton
                  type="button"
                  visible={selectedSchvalovatel.length > 0}
                  onClick={clearSchvalovatelFilter}
                  title="Vymazat filtr"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </FilterClearButton>
              </FilterLabel>
              <SelectWithIcon>
                <MultiSelectLocal
                  field="selectedSchvalovatel"
                  value={selectedSchvalovatel}
                  onChange={handleSchvalovatelChange}
                  options={sortedActiveApprovers}
                  placeholder="Vyberte schvalovatele..."
                  icon={<FontAwesomeIcon icon={faShield} />}
                />
              </SelectWithIcon>
            </FilterGroup>

            <FilterGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faList} />
                  Stav objednávky
                </FilterLabelLeft>
                <FilterClearButton
                  type="button"
                  visible={statusFilter.length > 0}
                  onClick={clearStatusFilter}
                  title="Vymazat filtr"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </FilterClearButton>
              </FilterLabel>
              <SelectWithIcon>
                <MultiSelectLocal
                  field="statusFilter"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  options={statusOptions}
                  placeholder="Vyberte stavy..."
                  icon={<FontAwesomeIcon icon={faList} />}
                />
              </SelectWithIcon>
            </FilterGroup>

            {/* Druhý řádek: Datum od-do, Cena od-do */}
            <DateRangeGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  Datum od - do
                </FilterLabelLeft>
                <FilterClearButton
                  type="button"
                  visible={dateFromFilter || dateToFilter}
                  onClick={clearDateFilter}
                  title="Vymazat filtr"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </FilterClearButton>
              </FilterLabel>
              <DateRangeInputs>
                <DateInputWrapper>
                  <DatePicker
                    fieldName="dateFromFilter"
                    value={dateFromFilter || ''}
                    onChange={(value) => setDateFromFilter(value || '')}
                    placeholder="Datum od"
                  />
                </DateInputWrapper>
                <DateSeparator>—</DateSeparator>
                <DateInputWrapper>
                  <DatePicker
                    fieldName="dateToFilter"
                    value={dateToFilter || ''}
                    onChange={(value) => setDateToFilter(value || '')}
                    placeholder="Datum do"
                  />
                </DateInputWrapper>
              </DateRangeInputs>
            </DateRangeGroup>

            <PriceRangeGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faMoneyBillWave} />
                  Cena od - do (Kč)
                </FilterLabelLeft>
                <FilterClearButton
                  type="button"
                  visible={amountFromFilter || amountToFilter}
                  onClick={clearPriceFilter}
                  title="Vymazat filtr"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </FilterClearButton>
              </FilterLabel>
              <PriceRangeInputs>
                <PriceInputWrapper>
                  <FontAwesomeIcon icon={faMoneyBillWave} />
                  <FilterInput
                    type="text"
                    placeholder="0"
                    value={formatNumberWithSpaces(amountFromFilter)}
                    onChange={handleAmountFromChange}
                    hasIcon
                    style={{ textAlign: 'right', paddingRight: '2.5rem' }}
                  />
                </PriceInputWrapper>
                <PriceSeparator>—</PriceSeparator>
                <PriceInputWrapper>
                  <FontAwesomeIcon icon={faMoneyBillWave} />
                  <FilterInput
                    type="text"
                    placeholder="∞"
                    value={formatNumberWithSpaces(amountToFilter)}
                    onChange={handleAmountToChange}
                    hasIcon
                    style={{ textAlign: 'right', paddingRight: '2.5rem' }}
                  />
                </PriceInputWrapper>
              </PriceRangeInputs>
            </PriceRangeGroup>

            {/* Rychlé filtry pro Stav registru + Mimořádné události */}
            <FilterGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faFileContract} />
                  Stav registru
                </FilterLabelLeft>
              </FilterLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: filterMaBytZverejneno ? '600' : '400',
                  color: filterMaBytZverejneno ? '#f59e0b' : '#4b5563'
                }}>
                  <input
                    type="checkbox"
                    checked={filterMaBytZverejneno}
                    onChange={(e) => {
                      setFilterMaBytZverejneno(e.target.checked);
                      setUserStorage('orders25List_filterMaBytZverejneno', e.target.checked);
                    }}
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                      accentColor: '#f59e0b'
                    }}
                  />
                  <span>Má být zveřejněno</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: filterByloZverejneno ? '600' : '400',
                  color: filterByloZverejneno ? '#10b981' : '#4b5563'
                }}>
                  <input
                    type="checkbox"
                    checked={filterByloZverejneno}
                    onChange={(e) => {
                      setFilterByloZverejneno(e.target.checked);
                      setUserStorage('orders25List_filterByloZverejneno', e.target.checked);
                    }}
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                      accentColor: '#10b981'
                    }}
                  />
                  <span>Bylo již zveřejněno</span>
                </label>
              </div>
            </FilterGroup>

            {/* Mimořádné události - vedle Stav registru */}
            <FilterGroup>
              <FilterLabel>
                <FilterLabelLeft>
                  <FontAwesomeIcon icon={faBoltLightning} />
                  Mimořádné události
                </FilterLabelLeft>
              </FilterLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: filterMimoradneObjednavky ? '600' : '400',
                  color: filterMimoradneObjednavky ? '#dc2626' : '#4b5563'
                }}>
                  <input
                    type="checkbox"
                    checked={filterMimoradneObjednavky}
                    onChange={(e) => {
                      setFilterMimoradneObjednavky(e.target.checked);
                      setUserStorage('orders25List_filterMimoradneObjednavky', e.target.checked);
                    }}
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                      accentColor: '#dc2626'
                    }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Krize / Havárie
                  </span>
                </label>
              </div>
            </FilterGroup>

          </FiltersGrid>
        )}
        </FiltersPanel>
      )}

      {/* Table */}
      <TableScrollWrapper
        ref={setTableWrapperRef}
        $showLeftShadow={showLeftShadow}
        $showRightShadow={showRightShadow}
      >
          <TableContainer ref={tableRef}>
            <Table>
              <TableHead>
            {/* Header row with column names */}
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHeader
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      width: header.getSize()
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && header.column.getIsSorted() && (
                        <FontAwesomeIcon
                          icon={
                            header.column.getIsSorted() === 'asc' ? faChevronUp :
                            faChevronDown
                          }
                        />
                      )}
                    </div>
                  </TableHeader>
                ))}
              </tr>
            ))}

            {/* Filter row with search inputs */}
            <tr>
              {table.getHeaderGroups()[0]?.headers.map(header => (
                <TableHeader key={`filter-${header.id}`} style={{
                  padding: '0.5rem',
                  backgroundColor: '#f8f9fa',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  {header.id === 'select' ? (
                    <div style={{ display: 'none' }}>
                      <input
                        type="checkbox"
                        checked={table.getIsAllRowsSelected()}
                        ref={(el) => {
                          if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
                        }}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        title={table.getIsAllRowsSelected() ? 'Zrušit výběr všech' : 'Vybrat vše'}
                      />
                    </div>
                  ) : header.id === 'expander' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '32px'
                    }}>
                      <FilterActionButton
                        onClick={toggleAllRows}
                        title={table.getIsSomeRowsExpanded() ? "Sbalit všechny řádky" : "Rozbalit všechny řádky"}
                      >
                        <FontAwesomeIcon icon={table.getIsSomeRowsExpanded() ? faMinus : faPlus} />
                      </FilterActionButton>
                    </div>
                  ) : header.id === 'approve' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '3px',
                      height: '32px'
                    }}>
                      <FilterActionButton
                        onClick={() => {
                          const newFilter = approvalFilter.includes('pending')
                            ? approvalFilter.filter(f => f !== 'pending')
                            : [...approvalFilter, 'pending'];
                          setApprovalFilter(newFilter);
                          setUserStorage('orders25List_approvalFilter', newFilter);
                        }}
                        title={approvalFilter.includes('pending') 
                          ? "Zrušit filtr: Ke schválení" 
                          : "Filtrovat: Ke schválení"
                        }
                        className={approvalFilter.includes('pending') ? 'active' : ''}
                        style={{
                          color: approvalFilter.includes('pending') ? '#92400e' : undefined,
                          background: approvalFilter.includes('pending') ? '#fef3c7' : undefined
                        }}
                      >
                        <FontAwesomeIcon icon={faHourglassHalf} />
                      </FilterActionButton>
                      <FilterActionButton
                        onClick={() => {
                          const newFilter = approvalFilter.includes('approved')
                            ? approvalFilter.filter(f => f !== 'approved')
                            : [...approvalFilter, 'approved'];
                          setApprovalFilter(newFilter);
                          setUserStorage('orders25List_approvalFilter', newFilter);
                        }}
                        title={approvalFilter.includes('approved')
                          ? "Zrušit filtr: Vyřízené" 
                          : "Filtrovat: Vyřízené"
                        }
                        className={approvalFilter.includes('approved') ? 'active' : ''}
                        style={{
                          color: approvalFilter.includes('approved') ? '#166534' : undefined,
                          background: approvalFilter.includes('approved') ? '#dcfce7' : undefined
                        }}
                      >
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </FilterActionButton>
                    </div>
                  ) : header.id === 'actions' ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '3px',
                      height: '32px'
                    }}>
                      {/* Hromadné akce - DOČASNĚ SKRYTO (nedokončená funkcionalita) */}
                      {false && (() => {
                        const selectedCount = table.getSelectedRowModel().rows.length;
                        if (selectedCount > 0) {
                          const selectedOrders = table.getSelectedRowModel().rows.map(row => row.original);

                          // Kolik objednávek je "Ke schválení"
                          const approvalCount = selectedOrders.filter(o => o.stav_objednavky === 'Ke schválení').length;

                          // Kolik objednávek lze generovat DOCX (stejná detekce jako v kontextovém menu)
                          const docxCount = selectedOrders.filter(o => canExportDocument(o)).length;

                          return (
                            <>
                              {/* Schvalování - jen pro admin + právo APPROVE */}
                              {approvalCount > 0 && (hasPermission('ADMIN') || hasPermission('ORDER_APPROVE')) && (
                                <FilterActionButton
                                  onClick={() => {
                                    const eligibleOrders = selectedOrders.filter(o => o.stav_objednavky === 'Ke schválení');
                                    setBulkApprovalOrders(eligibleOrders);
                                    setShowBulkApprovalDialog(true);
                                  }}
                                  title={`Schválit ${approvalCount} vybraných objednávek (stav Ke schválení)`}
                                  style={{ color: '#059669' }}
                                >
                                  <FontAwesomeIcon icon={faCheckCircle} />
                                  <ActionBadge>{approvalCount}</ActionBadge>
                                </FilterActionButton>
                              )}

                              {docxCount > 0 && (
                                <FilterActionButton
                                  onClick={() => {
                                    const eligibleOrders = selectedOrders.filter(o => canExportDocument(o));
                                    setBulkDocxOrders(eligibleOrders);
                                    // Inicializuj výběr podepisovatelů - výchozí je schvalovatel
                                    const initialSigners = {};
                                    const initialTemplates = {};
                                    eligibleOrders.forEach(order => {
                                      initialSigners[order.id] = order.schvalovatel_id || order.schvalovatel || null;
                                      // Výchozí šablona podle stavu a ceny
                                      const templates = getTemplateOptions(order);
                                      if (templates.length > 0) {
                                        initialTemplates[order.id] = templates[0].value; // První dostupná šablona
                                      }
                                    });
                                    setBulkDocxSigners(initialSigners);
                                    setBulkDocxTemplates(initialTemplates);
                                    setShowBulkDocxDialog(true);
                                  }}
                                  title={`Generovat DOCX pro ${docxCount} vybraných objednávek (fáze Rozpracovaná+)`}
                                  style={{ color: '#0891b2' }}
                                >
                                  <FontAwesomeIcon icon={faFileWord} />
                                  <ActionBadge>{docxCount}</ActionBadge>
                                </FilterActionButton>
                              )}

                              <FilterActionButton
                                onClick={() => {
                                  setBulkDeleteOrders(selectedOrders);
                                  setShowBulkDeleteDialog(true);
                                }}
                                title={`Smazat ${selectedCount} vybraných objednávek`}
                                style={{ color: '#dc2626' }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                                <ActionBadge>{selectedCount}</ActionBadge>
                              </FilterActionButton>
                            </>
                          );
                        }
                        return null;
                      })()}

                      {/* Defaultní akce - vždy zobrazené */}
                      <FilterActionButton
                        onClick={clearColumnFilters}
                        title="Vymazat filtry sloupců"
                      >
                        <FontAwesomeIcon icon={faEraser} />
                      </FilterActionButton>
                      <FilterActionButton
                        onClick={toggleRowHighlighting}
                        title={showRowHighlighting ?
                          "Vypnout zvýrazňování řádků podle stavu objednávky\n(koncepty zůstanou vždy zvýrazněné)" :
                          "Zapnout zvýrazňování řádků podle stavu objednávky\n(každý stav má svou barvu)"}
                        className={showRowHighlighting ? 'active' : ''}
                      >
                        <FontAwesomeIcon icon={faPalette} />
                      </FilterActionButton>
                    </div>
                  ) : header.column.columnDef.accessorKey === 'dt_objednavky' ? (
                    <div style={{ position: 'relative' }}>
                      <DatePicker
                        fieldName="dt_objednavky_filter"
                        value={columnFilters[header.column.columnDef.accessorKey] || ''}
                        onChange={(value) => {
                          const newFilters = { ...columnFilters };
                          // Uložit datum ve formátu yyyy-mm-dd (jak ho vrací DatePicker)
                          newFilters[header.column.columnDef.accessorKey] = value;
                          setColumnFilters(newFilters);
                        }}
                        placeholder="Datum"
                        variant="compact"
                      />
                    </div>
                  ) : header.column.columnDef.accessorKey === 'max_cena_s_dph' || 
                     header.column.columnDef.accessorKey === 'cena_s_dph' || 
                     header.column.columnDef.accessorKey === 'faktury_celkova_castka_s_dph' ? (
                    <div style={{ position: 'relative' }}>
                      <OperatorInput
                        value={localColumnFilters[header.column.columnDef.accessorKey] || ''}
                        onChange={(value) => {
                          const newFilters = { ...localColumnFilters };
                          newFilters[header.column.columnDef.accessorKey] = value;
                          setColumnFiltersDebounced(newFilters);
                        }}
                        placeholder={
                          header.column.columnDef.accessorKey === 'max_cena_s_dph' ? 'Max. cena s DPH' :
                          header.column.columnDef.accessorKey === 'cena_s_dph' ? 'Cena s DPH' :
                          'Cena FA s DPH'
                        }
                        clearButton={true}
                        onClear={() => {
                          const newFilters = { ...localColumnFilters };
                          newFilters[header.column.columnDef.accessorKey] = '';
                          setColumnFiltersDebounced(newFilters);
                        }}
                      />
                    </div>
                  ) : (
                    <ColumnFilterWrapper>
                      <FontAwesomeIcon icon={faSearch} />
                      <ColumnFilterInput
                        type="text"
                        placeholder={`Hledat ${header.column.columnDef.header}...`}
                        value={localColumnFilters[header.column.columnDef.accessorKey] || ''}
                        onChange={(e) => {
                          const newFilters = { ...localColumnFilters };
                          newFilters[header.column.columnDef.accessorKey] = e.target.value;
                          setColumnFiltersDebounced(newFilters);
                        }}
                      />
                      {localColumnFilters[header.column.columnDef.accessorKey] && (
                        <ColumnClearButton
                          onClick={() => {
                            const newFilters = { ...localColumnFilters };
                            delete newFilters[header.column.columnDef.accessorKey];
                            setColumnFiltersDebounced(newFilters);
                          }}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </ColumnClearButton>
                      )}
                    </ColumnFilterWrapper>
                  )}
                </TableHeader>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {orders.length === 0 ? (
              // Prázdný stav - uživatel nemá žádné objednávky (před filtrováním)
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <EmptyState>
                    <EmptyStateIcon>
                      <FontAwesomeIcon icon={faFaceFrown} />
                    </EmptyStateIcon>
                    <EmptyStateTitle>Zatím nemáte žádnou objednávku</EmptyStateTitle>
                    <EmptyStateText>
                      Vytvořte svou první objednávku kliknutím na tlačítko "Nová objednávka" výše.
                    </EmptyStateText>
                  </EmptyState>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              // Filtrováno - žádné výsledky
              <tr>
                <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  <FontAwesomeIcon icon={faFilter} style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
                  <div>Žádné objednávky nevyhovují nastaveným filtrům</div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, index) => (
              <React.Fragment key={row.id}>
                <TableRow
                  $order={row.original}
                  $isDraft={row.original.isDraft || false}
                  $hasLocalChanges={row.original.hasLocalDraftChanges || false}
                  $showHighlighting={showRowHighlighting}
                  $isHighlighted={highlightOrderId && (row.original.id === highlightOrderId || row.original.cislo_objednavky === highlightOrderId)}
                  $isInactive={row.original.aktivni === 0}
                  onContextMenu={handleTableContextMenu}
                  onDoubleClick={() => {
                    if (canEdit(row.original)) {
                      handleEdit(row.original);
                    }
                  }}
                  data-order-id={row.original.cislo_objednavky || row.original.id}
                  data-order-index={index + (currentPageIndex * pageSize)}
                  data-inactive={row.original.aktivni === 0 ? 'true' : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className={row.original.aktivni === 0 ? 'inactive-content' : ''}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && (
                  <TableRow
                    $order={row.original}
                    $showHighlighting={showRowHighlighting}
                    $isInactive={row.original.aktivni === 0}
                    onContextMenu={handleTableContextMenu}
                    data-order-id={row.original.cislo_objednavky || row.original.id}
                    data-order-index={index + (currentPageIndex * pageSize)}
                    data-inactive={row.original.aktivni === 0 ? 'true' : undefined}
                  >
                    <TableCell colSpan={columns.length} style={{ padding: 0, borderBottom: '1px solid #000' }}>
                      {renderExpandedContent(row.original)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )))}
          </tbody>
        </Table>

        {/* Pagination */}
        <PaginationContainer>
          <PaginationInfo>
            Zobrazeno {table.getRowModel().rows.length} z {filteredData.length} objednávek
            {filteredData.length !== orders.length && (
              <span> (filtrováno z {orders.length})</span>
            )}
          </PaginationInfo>

          <PaginationControls>
            <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
              Zobrazit:
            </span>
            <PageSizeSelect
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                setPageSize(newSize);
                setUserStorage('orders25List_pageSize', newSize);
                // Resetuj na první stránku při změně velikosti stránky
                setCurrentPageIndex(0);
                setUserStorage('orders25List_pageIndex', 0);
                // ❌ REMOVED: table.setPageSize/setPageIndex - React Table reaguje na state.pagination
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </PageSizeSelect>

            <PageButton
              onClick={goToFirstPage}
              disabled={!table.getCanPreviousPage()}
            >
              ««
            </PageButton>
            <PageButton
              onClick={goToPreviousPage}
              disabled={!table.getCanPreviousPage()}
            >
              ‹
            </PageButton>

            <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
              Stránka {table.getState().pagination.pageIndex + 1} z {table.getPageCount()}
            </span>

            <PageButton
              onClick={goToNextPage}
              disabled={!table.getCanNextPage()}
            >
              ›
            </PageButton>
            <PageButton
              onClick={goToLastPage}
              disabled={!table.getCanNextPage()}
            >
              »»
            </PageButton>
          </PaginationControls>
        </PaginationContainer>
      </TableContainer>
    </TableScrollWrapper>

    {/* Floating Scroll Šipky - React Portal (FIXED position, mimo DOM tabulky) */}
    {ReactDOM.createPortal(
      <>
        <ScrollArrowLeft
          $visible={showLeftArrow}
          $tableHovered={isTableHovered}
          $arrowHovered={isArrowHovered}
          onClick={handleScrollLeft}
          onMouseEnter={() => setIsArrowHovered(true)}
          onMouseLeave={() => setIsArrowHovered(false)}
          disabled={!showLeftArrow}
          aria-label="Scrollovat doleva"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </ScrollArrowLeft>

        <ScrollArrowRight
          $visible={showRightArrow}
          $tableHovered={isTableHovered}
          $arrowHovered={isArrowHovered}
          onClick={handleScrollRight}
          onMouseEnter={() => setIsArrowHovered(true)}
          onMouseLeave={() => setIsArrowHovered(false)}
          disabled={!showRightArrow}
          aria-label="Scrollovat doprava"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </ScrollArrowRight>
      </>,
      document.body
    )}

    {/* Modální dialog pro potvrzení editace - GRADIENT-MODERN style */}
    <ConfirmDialog
      isOpen={showEditConfirmModal}
      onClose={handleEditCancel}
      onConfirm={() => {
        if (orderToEdit) {
          handleEditConfirm();
        } else {
          handleCreateNewOrderConfirm();
        }
      }}
      title={orderToEdit ? 'Potvrzení editace objednávky' : 'Potvrzení vytvoření nové objednávky'}
      icon={faExclamationTriangle}
      variant="warning"
      confirmText="Ano, pokračovat"
      cancelText="Ne, zrušit"
    >
      {orderToEdit ? (
        <p>
          Chystáte se editovat objednávku <strong>"{orderToEdit?.cislo_objednavky || orderToEdit?.predmet || orderToEdit?.ev_cislo || (orderToEdit?.id ? `ID ${orderToEdit.id}` : 'neznámá objednávka')}"</strong>.
        </p>
      ) : (
        <p>
          Chystáte se vytvořit <strong>novou objednávku</strong>.
        </p>
      )}

      {/* DEBUG INFO - zobraz draft který bude smazán */}
      {process.env.NODE_ENV === 'development' && (() => {
        if (!currentDraftData) return (
          <details style={{ fontSize: '0.8em', color: '#666', margin: '0.5rem 0' }}>
            <summary>Debug info - žádný draft v state</summary>
            <pre>currentDraftData: null{'\n'}orderToEdit: {JSON.stringify(orderToEdit, null, 2)}</pre>
          </details>
        );

        try {
          const formData = currentDraftData.formData || currentDraftData;
          const isNewConcept = isValidConcept(currentDraftData);
          const hasDbChanges = hasDraftChanges(currentDraftData);

          return (
            <details style={{ fontSize: '0.8em', color: '#666', margin: '0.5rem 0' }}>
              <summary>Debug info - draft který bude smazán ✓</summary>
              <pre>
{`📝 Draft Title: ${formData.ev_cislo || formData.cislo_objednavky || formData.predmet || 'N/A'}
🆔 Draft ID: ${formData.id || 'žádné ID (nový koncept)'}
📋 Předmět: ${formData.predmet || 'N/A'}
🆕 Is New Concept: ${isNewConcept ? 'ANO - úplně nová objednávka' : 'NE'}
✏ Has DB Changes: ${hasDbChanges ? 'ANO - editace existující DB obj.' : 'NE'}
🎯 Saved Order ID: ${currentDraftData.savedOrderId || 'žádné'}

➡ Přepínáme na:
${orderToEdit ? `   Objednávku: ${orderToEdit.cislo_objednavky || orderToEdit.predmet || 'ID ' + orderToEdit.id}` : '   NOVOU objednávku (prázdný formulář)'}`}
              </pre>
            </details>
          );
        } catch (error) {
          return (
            <details style={{ fontSize: '0.8em', color: '#666', margin: '0.5rem 0' }}>
              <summary>Debug info - chyba zpracování draftu</summary>
              <pre>Error: {error.message}{'\n'}orderToEdit: {JSON.stringify(orderToEdit, null, 2)}</pre>
            </details>
          );
        }
      })()}

      {/* Zobraz varování o rozepracované objednávce, pokud existuje - ORDER25 SERVICE */}
      {(() => {
        if (!currentDraftData) return null;

        try {
          const formData = currentDraftData.formData || currentDraftData;
          const draftTitle = formData.ev_cislo || formData.cislo_objednavky || formData.predmet || '★ KONCEPT ★';
          const isNewConcept = isValidConcept(currentDraftData);

          return (
            <p style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f59e0b', margin: '0.5rem 0' }}>
              <strong>Pozor:</strong> Máte rozepracovanou {isNewConcept ? 'novou objednávku' : 'editaci objednávky'}{' '}
              <strong>{draftTitle}</strong>
              . {orderToEdit ? 'Přepnutím na jinou objednávku' : 'Vytvořením nové objednávky'} přijdete o neuložené změny!
            </p>
          );
        } catch (error) {
          // Chyba při zpracování draft pro confirm dialog
          return null;
        }
      })()}

      {orderToEdit ? (
        <>
          <p>
            <strong>Varování:</strong> Tímto budou zrušeny všechny případné neuložené změny v jiných objednávkách a může dojít ke ztrátě dat.
          </p>
          <p>
            Chcete pokračovat v editaci?
          </p>
        </>
      ) : (
        <>
          <p>
            <strong>Varování:</strong> Tímto budou zrušeny všechny neuložené změny v současné objednávce a může dojít ke ztrátě dat.
          </p>
          <p>
            Chcete vytvořit novou objednávku a zahodit neuložené změny?
          </p>
        </>
      )}
    </ConfirmDialog>

      {/* Modální dialog pro varování o archivované objednávce - GRADIENT-MODERN style */}
      <ConfirmDialog
        isOpen={showArchivedWarningModal}
        onClose={() => { setShowArchivedWarningModal(false); setOrderToEdit(null); }}
        onConfirm={handleArchivedWarningConfirm}
        title="Varování - Importovaná objednávka"
        icon={faExclamationTriangle}
        variant="warning"
        confirmText="Ano, rozumím rizikům a chci pokračovat"
        cancelText="Ne, zrušit"
      >
        <p>
          Chystáte se editovat archivovanou objednávku <strong>"{orderToEdit?.cislo_objednavky || orderToEdit?.ev_cislo || 'neznámá objednávka'}"</strong>.
        </p>

        <p style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f59e0b', margin: '0.75rem 0' }}>
          <strong>⚠ UPOZORNĚNÍ:</strong> Tato objednávka byla importována z původního systému EEO a má stav <strong>ARCHIVOVÁNO</strong>.
        </p>

        <p>
          Editace této objednávky může ovlivnit případný opakovaný import dat, pokud bude prováděna aktualizace objednávek ze starého systému.
        </p>

        <p>
          <strong>Důsledky editace:</strong>
        </p>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Změny v objednávce mohou být přepsány při opakovaném importu</li>
          <li>Data nemusí odpovídat původnímu systému EEO</li>
          <li>Může dojít ke ztrátě vašich úprav</li>
        </ul>

        <p style={{ marginTop: '1rem' }}>
          Opravdu chcete pokračovat v editaci?
        </p>
      </ConfirmDialog>

      {/* KOMBINOVANÝ modal: Archivovaná objednávka + existující koncept - GRADIENT-MODERN style */}
      <ConfirmDialog
        isOpen={showArchivedWithDraftWarningModal}
        onClose={() => { setShowArchivedWithDraftWarningModal(false); setOrderToEdit(null); }}
        onConfirm={handleArchivedWithDraftConfirm}
        title="Důležité varování"
        icon={faExclamationTriangle}
        variant="warning"
        confirmText="Ano, rozumím a chci pokračovat"
        cancelText="Ne, zrušit"
      >
        <p>
          Chystáte se editovat archivovanou objednávku <strong>"{orderToEdit?.cislo_objednavky || orderToEdit?.ev_cislo || 'neznámá objednávka'}"</strong>.
        </p>

        {/* VAROVÁNÍ 1: Archivovaná objednávka */}
        <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f59e0b', margin: '0.75rem 0' }}>
          <strong>⚠ VAROVÁNÍ - ARCHIVOVÁNO:</strong><br />
          Tato objednávka byla importována z původního systému EEO a má stav <strong>ARCHIVOVÁNO</strong>.
          Editace může být přepsána při opakovaném importu dat.
        </div>

        {/* VAROVÁNÍ 2: Ztráta rozpracované objednávky */}
        <div style={{ background: '#fee2e2', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ef4444', margin: '0.75rem 0' }}>
          <strong>🗑 ZTRÁTA KONCEPTU:</strong><br />
          Máte rozpracovanou objednávku, která bude při pokračování <strong>ZTRACENA</strong> a nelze ji obnovit!
        </div>

        <p style={{ marginTop: '1rem' }}>
          <strong>Co se stane po pokračování:</strong>
        </p>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Váš rozpracovaný koncept bude <strong>trvale smazán</strong></li>
          <li>Otevřete archivovanou objednávku k editaci</li>
          <li>Změny mohou být přepsány při budoucím importu</li>
        </ul>

        <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#dc2626' }}>
          Opravdu chcete pokračovat a ztratit rozpracovanou objednávku?
        </p>
      </ConfirmDialog>

      {/* Modální dialog pro potvrzení smazání - GRADIENT-MODERN style */}
      <ConfirmDialog
        isOpen={showDeleteConfirmModal}
        onClose={handleDeleteCancel}
        onConfirm={() => {
          // 🔄 Rozlišení mezi restore, hard delete a soft delete podle deleteType
          if (deleteType === 'restore') {
            handleDeleteConfirm('restore');
          } else if (deleteType === 'hard') {
            handleDeleteConfirm('hard');
          } else {
            handleDeleteConfirm('soft');
          }
        }}
        title={
          orderToDelete && !orderToDelete.aktivni && isAdmin 
            ? (deleteType === 'restore' ? "Obnovení objednávky" : "Úplné smazání objednávky")
            : "Smazání objednávky"
        }
        icon={
          orderToDelete && !orderToDelete.aktivni && isAdmin 
            ? (deleteType === 'restore' ? faCheckCircle : faTrash)
            : faTrash
        }
        variant={
          orderToDelete && !orderToDelete.aktivni && isAdmin 
            ? (deleteType === 'restore' ? "success" : "danger")
            : "danger"
        }
        confirmText={
          orderToDelete && !orderToDelete.aktivni && isAdmin 
            ? (deleteType === 'restore' ? '✅ Obnovit objednávku' : '⚠️ Smazat úplně')
            : hasPermission('ADMINI') 
              ? 'Smazat úplně' 
              : 'Označit neaktivní'
        }
        cancelText="Zrušit"
        key={deleteType + (orderToDelete?.aktivni ? '-active' : '-inactive')}
      >
        {orderToDelete && !orderToDelete.aktivni && isAdmin ? (
          /* NEAKTIVNÍ OBJEDNÁVKA - Možnost obnovení nebo hard delete */
          <>
            <p style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
              Co chcete udělat s neaktivní objednávkou <strong>"{orderToDelete?.cislo_objednavky || orderToDelete?.predmet || `ID ${orderToDelete?.id}`}"</strong>?
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
                    cursor: 'pointer',
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
                    style={{ marginTop: '0.25rem', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 600, 
                      marginBottom: '0.25rem', 
                      color: deleteType === 'restore' ? '#166534' : '#475569' 
                    }}>
                      🔄 Obnovit objednávku
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: deleteType === 'restore' ? '#166534' : '#64748b',
                      lineHeight: '1.4'
                    }}>
                      Objednávka bude znovu <strong>aktivní</strong> a objeví se v běžném přehledu.
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
                    cursor: 'pointer',
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
                    style={{ marginTop: '0.25rem', cursor: 'pointer' }}
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
                      Objednávka bude <strong>fyzicky smazána z databáze</strong> včetně všech položek a příloh. Tuto akci nelze vrátit zpět!
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </>
        ) : (
          /* AKTIVNÍ OBJEDNÁVKA - Možnosti smazání */
          <>
            <p>
              Chystáte se smazat objednávku <strong>"{orderToDelete?.cislo_objednavky || orderToDelete?.predmet || `ID ${orderToDelete?.id}`}"</strong>.
            </p>

            {hasPermission('ADMINI') ? (
              <div>
                <p><strong>Máte administrátorská práva. Vyberte způsob smazání:</strong></p>
                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '6px', margin: '1rem 0' }}>
                  <p><strong>Označit jako neaktivní:</strong> Objednávka zůstane v databázi, ale nebude se zobrazovat v seznamech.</p>
                  <p><strong>Smazat úplně:</strong> Objednávka bude natrvalo smazána včetně všech položek a příloh. Tuto akci nelze vrátit zpět!</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => handleDeleteConfirm('soft')}
                    style={{
                      padding: '0.875rem 1.75rem',
                      border: '2px solid #d1d5db',
                      borderRadius: '10px',
                      fontWeight: '700',
                      background: 'white',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '0.9375rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Označit neaktivní
                  </button>
                </div>
              </div>
            ) : (
              <p>Objednávka bude označena jako neaktivní. Zůstane v databázi, ale nebude se zobrazovat v seznamech.</p>
            )}
          </>
        )}
      </ConfirmDialog>

      {/* 🔒 Modal pro zamčenou objednávku - GRADIENT-MODERN style (ZELENÝ inforamční) */}
      {lockedOrderInfo && (
        <ConfirmDialog
          isOpen={showLockedOrderDialog}
          onClose={handleLockedOrderCancel}
          onConfirm={lockedOrderInfo.canForceUnlock ? handleLockedOrderForceUnlock : handleLockedOrderCancel}
          title={lockedOrderInfo.canForceUnlock ? 'Objednávka je zamčená' : 'Objednávka není dostupná'}
          icon={faLock}
          variant="success"
          confirmText={lockedOrderInfo.canForceUnlock ? 'Odemknout a převzít' : 'Zavřít'}
          cancelText="Zrušit"
          showCancel={lockedOrderInfo.canForceUnlock}
        >
          {lockedOrderInfo.canForceUnlock ? (
            <>
              <WarningText>
                ⚠ Objednávka je aktuálně editována uživatelem:
              </WarningText>
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
                Jako <strong>{lockedOrderInfo.userRoleName}</strong> můžete objednávku násilně odemknout a převzít.
              </InfoText>
              <WarningText>
                ⚠ Původní uživatel bude informován o převzetí objednávky a ztratí neuložené změny.
              </WarningText>
            </>
          ) : (
            <>
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
                {((lockedOrderInfo.blockedAction || 'edit') === 'approve')
                  ? 'Nelze objednávku schválit, protože je aktuálně v editaci. Počkejte, až bude uživatel s editací hotový, nebo ho kontaktujte.'
                  : 'Nelze ji načíst pro editaci. Počkejte, až bude uživatel s editací hotový, nebo ho kontaktujte.'}
              </InfoText>
            </>
          )}
        </ConfirmDialog>
      )}

      {/* ⚠ FORCE UNLOCK WARNING DIALOG */}
      {showForceUnlockWarning && forceUnlockWarningData && ReactDOM.createPortal(
        <ForceUnlockWarningOverlay onClick={(e) => e.target === e.currentTarget && handleForceUnlockWarningClose()}>
          <ForceUnlockWarningDialog onClick={(e) => e.stopPropagation()}>
            <ForceUnlockWarningHeader>
              <ForceUnlockWarningIcon>⚠</ForceUnlockWarningIcon>
              <ForceUnlockWarningTitle>NÁSILNÉ PŘEVZETÍ OBJEDNÁVKY</ForceUnlockWarningTitle>
            </ForceUnlockWarningHeader>

            <ForceUnlockWarningContent>
              <ForceUnlockWarningMessage>
                <p>
                  <strong>Vaše objednávka byla násilně převzata jiným uživatelem!</strong>
                </p>
                <p>
                  Objednávka <strong>{forceUnlockWarningData.orderNumber}</strong> byla násilně odemčena
                  a převzata. Vaše neuložené změny mohly být ztraceny.
                </p>
              </ForceUnlockWarningMessage>

              <ForceUnlockWarningDetails>
                <ForceUnlockWarningDetailRow>
                  <FontAwesomeIcon icon={faFileAlt} />
                  <ForceUnlockWarningDetailLabel>Objednávka:</ForceUnlockWarningDetailLabel>
                  <ForceUnlockWarningDetailValue>{forceUnlockWarningData.orderNumber}</ForceUnlockWarningDetailValue>
                </ForceUnlockWarningDetailRow>

                <ForceUnlockWarningDetailRow>
                  <FontAwesomeIcon icon={faUser} />
                  <ForceUnlockWarningDetailLabel>Převzal:</ForceUnlockWarningDetailLabel>
                  <ForceUnlockWarningDetailValue>{forceUnlockWarningData.lockedBy}</ForceUnlockWarningDetailValue>
                </ForceUnlockWarningDetailRow>

                {forceUnlockWarningData.lockedByEmail && (
                  <ForceUnlockWarningDetailRow>
                    <FontAwesomeIcon icon={faEnvelope} />
                    <ForceUnlockWarningDetailLabel>Email:</ForceUnlockWarningDetailLabel>
                    <ForceUnlockWarningDetailValue>
                      <a
                        href={`mailto:${forceUnlockWarningData.lockedByEmail}`}
                        style={{ color: '#991b1b', textDecoration: 'underline' }}
                      >
                        {forceUnlockWarningData.lockedByEmail}
                      </a>
                    </ForceUnlockWarningDetailValue>
                  </ForceUnlockWarningDetailRow>
                )}

                {forceUnlockWarningData.lockedByPhone && (
                  <ForceUnlockWarningDetailRow>
                    <FontAwesomeIcon icon={faPhone} />
                    <ForceUnlockWarningDetailLabel>Telefon:</ForceUnlockWarningDetailLabel>
                    <ForceUnlockWarningDetailValue>
                      <a
                        href={`tel:${forceUnlockWarningData.lockedByPhone}`}
                        style={{ color: '#991b1b', textDecoration: 'underline' }}
                      >
                        {forceUnlockWarningData.lockedByPhone}
                      </a>
                    </ForceUnlockWarningDetailValue>
                  </ForceUnlockWarningDetailRow>
                )}

                <ForceUnlockWarningDetailRow>
                  <FontAwesomeIcon icon={faClock} />
                  <ForceUnlockWarningDetailLabel>Čas:</ForceUnlockWarningDetailLabel>
                  <ForceUnlockWarningDetailValue>
                    {new Date(forceUnlockWarningData.lockedAt).toLocaleString('cs-CZ')}
                  </ForceUnlockWarningDetailValue>
                </ForceUnlockWarningDetailRow>
              </ForceUnlockWarningDetails>

              <ForceUnlockWarningActions>
                <ForceUnlockWarningButton onClick={handleForceUnlockWarningClose}>
                  Zavřít
                </ForceUnlockWarningButton>
                <ForceUnlockWarningButton $primary onClick={handleForceUnlockWarningAcknowledge}>
                  <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.5rem' }} />
                  Rozumím, aktualizovat seznam
                </ForceUnlockWarningButton>
              </ForceUnlockWarningActions>
            </ForceUnlockWarningContent>
          </ForceUnlockWarningDialog>
        </ForceUnlockWarningOverlay>,
        document.body
      )}

      {/* 🎯 Schvalovací dialog (pro příkazce) */}
      {showApprovalDialog && orderToApprove && ReactDOM.createPortal(
        <ApprovalDialogOverlay>
          <ApprovalDialog>
            <ApprovalDialogHeader>
              <ApprovalDialogIcon>✅</ApprovalDialogIcon>
              <ApprovalDialogTitle>
                Schválení objednávky
                <span style={{ 
                  marginLeft: '1rem', 
                  fontSize: '0.9em', 
                  fontWeight: 700,
                  color: '#fbbf24',
                  background: '#065f46',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  border: '2px solid #047857',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                }}>
                  {orderToApprove.stav_objednavky || '---'}
                </span>
                {orderToApprove.mimoradna_udalost == 1 && (
                  <span style={{ 
                    marginLeft: '0.5rem',
                    fontSize: '1.1em',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    color: '#dc2626',
                    fontWeight: 'bold'
                  }} title="Mimořádná událost">
                    <FontAwesomeIcon icon={faBoltLightning} />
                  </span>
                )}
              </ApprovalDialogTitle>
            </ApprovalDialogHeader>

            <ApprovalDialogContent>
              {/* 2-Column Layout: Levý sloupec = základní info, pravý = financování */}
              <ApprovalTwoColumnLayout>
                {/* LEVÝ SLOUPEC - Základní informace */}
                <ApprovalLeftColumn>
                  <ApprovalCompactList>
                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Číslo:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        <strong>{orderToApprove.cislo_objednavky || orderToApprove.evidencni_cislo || `#${orderToApprove.id}`}</strong>
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Předmět:</ApprovalCompactLabel>
                      <ApprovalCompactValue>{orderToApprove.predmet || orderToApprove.nazev_objednavky || '---'}</ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Objednatel:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        {(() => {
                          if (orderToApprove.objednatel_uzivatel) {
                            const u = orderToApprove.objednatel_uzivatel;
                            return u.cele_jmeno || `${u.jmeno || ''} ${u.prijmeni || ''}`.trim() || u.username || '---';
                          } else if (orderToApprove.objednatel_id) {
                            return getUserDisplayName(orderToApprove.objednatel_id);
                          }
                          return '---';
                        })()}
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Garant:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        {(() => {
                          if (orderToApprove.garant_uzivatel) {
                            const u = orderToApprove.garant_uzivatel;
                            return u.cele_jmeno || `${u.jmeno || ''} ${u.prijmeni || ''}`.trim() || u.username || '---';
                          } else if (orderToApprove.garant_uzivatel_id) {
                            return getUserDisplayName(orderToApprove.garant_uzivatel_id);
                          }
                          return '---';
                        })()}
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>

                    {orderToApprove.strediska_kod && Array.isArray(orderToApprove.strediska_kod) && orderToApprove.strediska_kod.length > 0 && (
                      <ApprovalCompactItem>
                        <ApprovalCompactLabel>Střediska:</ApprovalCompactLabel>
                        <ApprovalCompactValue>
                          {orderToApprove._enriched?.strediska && Array.isArray(orderToApprove._enriched.strediska) && orderToApprove._enriched.strediska.length > 0
                            ? orderToApprove._enriched.strediska.map(s => s.nazev || s.kod).join(', ')
                            : orderToApprove.strediska_kod.join(', ')}
                        </ApprovalCompactValue>
                      </ApprovalCompactItem>
                    )}

                    <ApprovalCompactItem>
                      <ApprovalCompactLabel>Max. cena:</ApprovalCompactLabel>
                      <ApprovalCompactValue>
                        <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>
                          {orderToApprove.max_cena_s_dph 
                            ? `${parseFloat(orderToApprove.max_cena_s_dph).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`
                            : '---'}
                        </strong>
                      </ApprovalCompactValue>
                    </ApprovalCompactItem>
                  </ApprovalCompactList>

                  {/* Poznámka ke schválení - v levém sloupci */}
                  <ApprovalSection style={{ marginTop: '1rem' }}>
                    <ApprovalSectionTitle>📝 Poznámka ke schválení (nepovinná)</ApprovalSectionTitle>
                    <ApprovalDialogTextarea
                      $hasError={!!approvalCommentError}
                      value={approvalComment}
                      onChange={(e) => {
                        setApprovalComment(e.target.value);
                        if (approvalCommentError) {
                          setApprovalCommentError('');
                        }
                      }}
                      placeholder="Nepovinná poznámka ke schválení (povinná pro Odložit/Zamítnout)..."
                    />
                    {approvalCommentError && (
                      <ApprovalDialogError>{approvalCommentError}</ApprovalDialogError>
                    )}
                  </ApprovalSection>
                </ApprovalLeftColumn>

                {/* PRAVÝ SLOUPEC - Financování (LP/Smlouvy) */}
                <ApprovalRightColumn>
                  {/* LP */}
                  {orderToApprove.financovani?.lp_kody && Array.isArray(orderToApprove.financovani.lp_kody) && orderToApprove.financovani.lp_kody.length > 0 && (
                    <>
                      <ApprovalSectionTitle>💰 Limitované přísliby</ApprovalSectionTitle>
                      {(() => {
                        const lpInfo = orderToApprove._enriched?.lp_info || [];
                        
                        if (lpInfo.length > 0) {
                          return lpInfo.map((lp, idx) => {
                            // Výpočet procenta čerpání (plánovaného)
                            const hodnotaLP = parseFloat(lp.total_limit) || 0;
                            const cerpanoPredpoklad = parseFloat(lp.cerpano_predpoklad) || 0;
                            const cerpanoSkutecne = parseFloat(lp.cerpano_skutecne) || 0;
                            const percentCerpani = hodnotaLP > 0 ? Math.round((cerpanoPredpoklad / hodnotaLP) * 100) : 0;
                            const hasLimit = hodnotaLP > 0;
                            
                            return (
                              <ApprovalLPItem key={idx}>
                                <ApprovalLPHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{lp.kod} — {lp.nazev}</span>
                                  {hasLimit && (
                                    <div style={{
                                      background: percentCerpani <= 100 ? '#dcfce7' : '#fee2e2',
                                      color: percentCerpani <= 100 ? '#166534' : '#991b1b',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.875rem',
                                      fontWeight: 700,
                                      border: `1px solid ${percentCerpani <= 100 ? '#86efac' : '#fca5a5'}`,
                                      minWidth: '50px',
                                      textAlign: 'center'
                                    }}>
                                      {percentCerpani}%
                                    </div>
                                  )}
                                </ApprovalLPHeader>
                                <ApprovalLPRow>
                                  <span>Celkový limit:</span>
                                  <strong>{lp.total_limit ? parseFloat(lp.total_limit).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč</strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow>
                                  <span>Čerpáno (předpokl.):</span>
                                  <strong>{cerpanoPredpoklad.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow $highlight>
                                  <span>Zbývá (předpokl.):</span>
                                  <strong style={{ color: lp.remaining_budget && parseFloat(lp.remaining_budget) < 0 ? '#dc2626' : '#059669' }}>
                                    {lp.remaining_budget ? parseFloat(lp.remaining_budget).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč
                                  </strong>
                                </ApprovalLPRow>
                                <ApprovalLPRow>
                                  <span>Čerpáno (skutečně):</span>
                                  <strong>{cerpanoSkutecne.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</strong>
                                </ApprovalLPRow>
                                
                                {/* Roční plán čerpání - progress bar */}
                                {hodnotaLP > 0 && (() => {
                                  const currentMonth = new Date().getMonth(); // 0-11
                                  const currentMonthName = new Date().toLocaleDateString('cs-CZ', { month: 'long' });
                                  const planedPercentForCurrentMonth = Math.floor(((currentMonth + 1) / 12.0) * 100.0);
                                  const isUnderPlan = percentCerpani <= planedPercentForCurrentMonth;
                                  
                                  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                                  
                                  return (
                                    <ApprovalLPRow style={{ flexDirection: 'column', alignItems: 'flex-start', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Roční plán čerpání:</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isUnderPlan ? '#059669' : '#dc2626' }}>
                                          {percentCerpani}% / {planedPercentForCurrentMonth}% ({currentMonthName})
                                        </span>
                                      </div>
                                      <div style={{
                                        display: 'flex',
                                        width: '100%',
                                        minHeight: '36px',
                                        gap: '2px',
                                        background: '#f1f5f9',
                                        borderRadius: '4px',
                                        padding: '3px',
                                        position: 'relative'
                                      }}>
                                        {Array.from({ length: 12 }).map((_, monthIndex) => {
                                          const isCurrentMonth = monthIndex === currentMonth;
                                          const planedPercent = Math.floor(((monthIndex + 1) / 12.0) * 100.0);
                                          
                                          let bgColor;
                                          if (isCurrentMonth) {
                                            bgColor = isUnderPlan ? '#22c55e' : '#ef4444';
                                          } else if (monthIndex < currentMonth) {
                                            bgColor = '#94a3b8';
                                          } else {
                                            bgColor = '#e2e8f0';
                                          }
                                          
                                          const textColor = isCurrentMonth ? '#ffffff' : (monthIndex < currentMonth ? '#1e293b' : '#64748b');
                                          
                                          return (
                                            <div
                                              key={monthIndex}
                                              style={{
                                                flex: 1,
                                                background: bgColor,
                                                borderRadius: '3px',
                                                position: 'relative',
                                                border: isCurrentMonth ? '2px solid #0f172a' : 'none',
                                                minHeight: '30px',
                                                paddingLeft: '1px',
                                                paddingRight: '1px'
                                              }}
                                              title={`${percentCerpani}% / ${planedPercent}%`}
                                            >
                                              <div style={{
                                                position: 'absolute',
                                                top: '2px',
                                                right: '3px',
                                                fontSize: '0.5rem',
                                                fontWeight: 500,
                                                opacity: 0.6,
                                                color: textColor,
                                                zIndex: 10
                                              }}>
                                                {romanNumerals[monthIndex]}
                                              </div>
                                              
                                              <div style={{ 
                                                position: 'absolute',
                                                bottom: '0px',
                                                left: '0',
                                                right: '0',
                                                textAlign: 'center',
                                                fontSize: '0.65rem', 
                                                fontWeight: 700,
                                                color: textColor
                                              }}>
                                                {planedPercent}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </ApprovalLPRow>
                                  );
                                })()}
                              </ApprovalLPItem>
                            );
                          });
                        } else {
                          return <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{orderToApprove.financovani.lp_kody.join(', ')}</div>;
                        }
                      })()}
                      {orderToApprove.financovani?.lp_poznamka && (
                        <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                          <strong>Poznámka:</strong> {orderToApprove.financovani.lp_poznamka}
                        </div>
                      )}
                    </>
                  )}

                  {/* Smlouva */}
                  {(orderToApprove.cislo_smlouvy || orderToApprove.financovani?.cislo_smlouvy) && (
                    <>
                      <ApprovalSectionTitle style={{ marginTop: orderToApprove.financovani?.lp_kody ? '1rem' : '0' }}>📄 Smlouva</ApprovalSectionTitle>
                      {(() => {
                        const smlouvaInfo = orderToApprove._enriched?.smlouva_info;
                        const cisloSmlouvy = orderToApprove.cislo_smlouvy || orderToApprove.financovani?.cislo_smlouvy;
                        
                        if (smlouvaInfo && smlouvaInfo.hodnota) {
                          // Výpočet procent čerpání (pokud je stropová cena)
                          const hodnotaSmlouvy = parseFloat(smlouvaInfo.hodnota) || 0;
                          const cerpanoPozadovano = parseFloat(smlouvaInfo.cerpano_pozadovano) || 0;
                          const percentCerpani = hodnotaSmlouvy > 0 ? Math.round((cerpanoPozadovano / hodnotaSmlouvy) * 100) : 0;
                          const hasStropovaCena = hodnotaSmlouvy > 0;
                          
                          return (
                            <ApprovalLPItem>
                              <ApprovalLPHeader>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{cisloSmlouvy}</span>
                                  {/* Vizuální indikátor čerpání - jen pokud má smlouva stropovou cenu */}
                                  {hasStropovaCena && (
                                    <div style={{
                                      background: percentCerpani <= 100 ? '#dcfce7' : '#fee2e2',
                                      color: percentCerpani <= 100 ? '#166534' : '#991b1b',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '4px',
                                      fontSize: '0.875rem',
                                      fontWeight: 700,
                                      border: `1px solid ${percentCerpani <= 100 ? '#86efac' : '#fca5a5'}`,
                                      minWidth: '50px',
                                      textAlign: 'center'
                                    }}>
                                      {percentCerpani}%
                                    </div>
                                  )}
                                </div>
                              </ApprovalLPHeader>
                              <ApprovalLPRow>
                                <span>Hodnota smlouvy:</span>
                                <strong>{parseFloat(smlouvaInfo.hodnota).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</strong>
                              </ApprovalLPRow>
                              <ApprovalLPRow>
                                <span>Čerpáno (požad.):</span>
                                <strong>{smlouvaInfo.cerpano_pozadovano ? parseFloat(smlouvaInfo.cerpano_pozadovano).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč</strong>
                              </ApprovalLPRow>
                              <ApprovalLPRow $highlight>
                                <span>Zbývá (požad.):</span>
                                <strong style={{ color: smlouvaInfo.zbyva_pozadovano && parseFloat(smlouvaInfo.zbyva_pozadovano) < 0 ? '#dc2626' : '#059669' }}>
                                  {smlouvaInfo.zbyva_pozadovano ? parseFloat(smlouvaInfo.zbyva_pozadovano).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč
                                </strong>
                              </ApprovalLPRow>
                              <ApprovalLPRow>
                                <span>Čerpáno (skut.):</span>
                                <strong>{smlouvaInfo.cerpano_skutecne ? parseFloat(smlouvaInfo.cerpano_skutecne).toLocaleString('cs-CZ', { minimumFractionDigits: 2 }) : '0,00'} Kč</strong>
                              </ApprovalLPRow>
                              
                              {/* Roční plán čerpání - progress bar */}
                              {hodnotaSmlouvy > 0 && (() => {
                                const currentMonth = new Date().getMonth(); // 0-11
                                const currentMonthName = new Date().toLocaleDateString('cs-CZ', { month: 'long' });
                                // Výpočet s desetinami, pak zaokrouhlení dolů
                                const planedPercentForCurrentMonth = Math.floor(((currentMonth + 1) / 12.0) * 100.0);
                                const isUnderPlan = percentCerpani <= planedPercentForCurrentMonth;
                                
                                // Římské číslice pro měsíce
                                const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                                
                                return (
                                  <ApprovalLPRow style={{ flexDirection: 'column', alignItems: 'flex-start', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Roční plán čerpání:</span>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isUnderPlan ? '#059669' : '#dc2626' }}>
                                        {percentCerpani}% / {planedPercentForCurrentMonth}% ({currentMonthName})
                                      </span>
                                    </div>
                                    <div style={{
                                      display: 'flex',
                                      width: '100%',
                                      minHeight: '36px',
                                      gap: '2px',
                                      background: '#f1f5f9',
                                      borderRadius: '4px',
                                      padding: '3px',
                                      position: 'relative'
                                    }}>
                                      {Array.from({ length: 12 }).map((_, monthIndex) => {
                                        const isCurrentMonth = monthIndex === currentMonth;
                                        // Výpočet s desetinami, pak zaokrouhlení dolů
                                        const planedPercent = Math.floor(((monthIndex + 1) / 12.0) * 100.0);
                                        
                                        // Barva čtverečku
                                        let bgColor;
                                        if (isCurrentMonth) {
                                          bgColor = isUnderPlan ? '#22c55e' : '#ef4444'; // Zelená/Červená pro aktuální měsíc
                                        } else if (monthIndex < currentMonth) {
                                          bgColor = '#94a3b8'; // Tmavší pro minulé měsíce
                                        } else {
                                          bgColor = '#e2e8f0'; // Světlá pro budoucí měsíce
                                        }
                                        
                                        const textColor = isCurrentMonth ? '#ffffff' : (monthIndex < currentMonth ? '#1e293b' : '#64748b');
                                        
                                        return (
                                          <div
                                            key={monthIndex}
                                            style={{
                                              flex: 1,
                                              background: bgColor,
                                              borderRadius: '3px',
                                              position: 'relative',
                                              border: isCurrentMonth ? '2px solid #0f172a' : 'none',
                                              minHeight: '30px',
                                              paddingLeft: '1px',
                                              paddingRight: '1px'
                                            }}
                                            title={`${percentCerpani}% / ${planedPercent}%`}
                                          >
                                            {/* Římská číslice vpravo nahoře - malá */}
                                            <div style={{
                                              position: 'absolute',
                                              top: '2px',
                                              right: '3px',
                                              fontSize: '0.5rem',
                                              fontWeight: 500,
                                              opacity: 0.6,
                                              color: textColor,
                                              zIndex: 10
                                            }}>
                                              {romanNumerals[monthIndex]}
                                            </div>
                                            
                                            {/* Procento dole - stejná velikost všude */}
                                            <div style={{ 
                                              position: 'absolute',
                                              bottom: '0px',
                                              left: '0',
                                              right: '0',
                                              textAlign: 'center',
                                              fontSize: '0.65rem', 
                                              fontWeight: 700,
                                              color: textColor
                                            }}>
                                              {planedPercent}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </ApprovalLPRow>
                                );
                              })()}
                            </ApprovalLPItem>
                          );
                        } else {
                          return (
                            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                              Číslo: <strong>{cisloSmlouvy}</strong>
                            </div>
                          );
                        }
                      })()}
                    </>
                  )}
                </ApprovalRightColumn>
              </ApprovalTwoColumnLayout>

              <ApprovalDialogActions>
                <ApprovalDialogButton onClick={() => {
                  setShowApprovalDialog(false);
                  setOrderToApprove(null);
                  setApprovalComment('');
                  setApprovalCommentError('');
                }}>
                  Storno
                </ApprovalDialogButton>

                <ApprovalDialogButton 
                  $postpone
                  onClick={() => handleApprovalAction('postpone')}
                >
                  ⏰ Odložit
                </ApprovalDialogButton>

                <ApprovalDialogButton 
                  $reject
                  onClick={() => handleApprovalAction('reject')}
                >
                  ❌ Zamítnout
                </ApprovalDialogButton>

                <ApprovalDialogButton 
                  $approve
                  onClick={() => handleApprovalAction('approve')}
                >
                  ✅ Schválit
                </ApprovalDialogButton>
              </ApprovalDialogActions>
            </ApprovalDialogContent>
          </ApprovalDialog>
        </ApprovalDialogOverlay>,
        document.body
      )}

      {/* Kontextové menu */}
      {contextMenu && (
        <OrderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          order={contextMenu.order}
          selectedData={contextMenu.selectedData}
          onClose={handleCloseContextMenu}
          onAddToTodo={handleAddToTodo}
          onAddAlarm={handleAddAlarm}
          onEdit={handleContextMenuEdit}
          onDelete={handleContextMenuDelete}
          onGenerateDocx={handleGenerateDocx}
          onGenerateFinancialControl={handleGenerateFinancialControl}
          onApprove={handleApproveFromContextMenu}
          canDelete={
            hasPermission('ORDER_MANAGE') ||
            hasPermission('ORDER_DELETE_ALL') ||
            hasPermission('ORDER_2025') ||
            (hasPermission('ORDER_DELETE_OWN') && contextMenu.order.uzivatel_id === currentUserId)
          }
          canApprove={
            (() => {
              if (!contextMenu.order) return false;
              
              // DEBUG - logování oprávnění
              const isPrikazce = String(contextMenu.order.prikazce_id) === String(currentUserId);
              const isAdminRole = hasAdminRole();
              
              // 1. Zkontroluj oprávnění: Příkazce NEBO ADMINI (Superadmin/Administrator)
              const hasPermissionToApprove = isPrikazce || isAdminRole;
              
              if (!hasPermissionToApprove) {
                return false;
              }
              
              // 2. Zkontroluj workflow stav
              let workflowStates = [];
              try {
                if (Array.isArray(contextMenu.order.stav_workflow_kod)) {
                  workflowStates = contextMenu.order.stav_workflow_kod;
                } else if (typeof contextMenu.order.stav_workflow_kod === 'string') {
                  workflowStates = JSON.parse(contextMenu.order.stav_workflow_kod);
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
              
              return isAllowedState;
            })()
          }
        />
      )}

      {/* DOCX Generator Modal - Lazy loaded for better performance */}
      {docxModalOpen && (
        <Suspense fallback={<div>Načítání...</div>}>
          <DocxGeneratorModal
            order={docxModalOrder}
            isOpen={docxModalOpen}
            onClose={handleDocxModalClose}
          />
        </Suspense>
      )}

      {/* Financial Control Modal - Lazy loaded for better performance */}
      {financialControlModalOpen && (
        <Suspense fallback={<div>Načítání finanční kontroly...</div>}>
          <FinancialControlModal
            order={financialControlOrder}
            onClose={() => {
              setFinancialControlModalOpen(false);
              setFinancialControlOrder(null);
            }}
            generatedBy={{
              fullName: `${userDetail?.titul_pred || ''} ${userDetail?.jmeno || ''} ${userDetail?.prijmeni || ''} ${userDetail?.titul_za || ''}`.trim(),
              position: userDetail?.pozice || 'Pracovník'
            }}
          />
        </Suspense>
      )}

      {/* Hromadné generování DOCX - Dialog */}
      {showBulkDocxDialog && ReactDOM.createPortal(
        <BulkDocxOverlay>
          <BulkDocxDialog onClick={(e) => e.stopPropagation()}>
            <BulkDocxHeader>
              <BulkDocxTitle>
                <FontAwesomeIcon icon={faFileWord} />
                Hromadné generování DOCX
              </BulkDocxTitle>
              <button
                onClick={() => setShowBulkDocxDialog(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </BulkDocxHeader>

            <BulkDocxBody>
              {bulkDocxOrders.map((order, index) => (
                <BulkDocxOrderItem key={order.id || index}>
                  <BulkDocxOrderHeader>
                    <BulkDocxOrderNumber>
                      <FontAwesomeIcon icon={faFileInvoice} style={{ color: '#0891b2' }} />
                      Objednávka #{order.cislo_objednavky || order.id}
                    </BulkDocxOrderNumber>
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#64748b',
                      background: '#f1f5f9',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontWeight: '600'
                    }}>
                      {order.stav_objednavky || 'N/A'}
                    </span>
                  </BulkDocxOrderHeader>

                  <BulkDocxOrderInfo>
                    <strong>Předmět objednávky:</strong> {order.predmet || 'Bez předmětu'}
                  </BulkDocxOrderInfo>

                  <BulkDocxOrderInfo>
                    <strong>Max. cena s DPH:</strong> {order.max_cena_s_dph ? `${parseFloat(order.max_cena_s_dph).toLocaleString('cs-CZ')} Kč` : 'Neuvedeno'}
                  </BulkDocxOrderInfo>

                  <BulkDocxOrderInfo>
                    <strong>Dodavatel:</strong> {order.dodavatel_nazev || 'N/A'}
                  </BulkDocxOrderInfo>

                  <BulkDocxSignerSelect>
                    <BulkDocxSignerLabel>
                      Šablona:
                    </BulkDocxSignerLabel>
                    <select
                      value={bulkDocxTemplates[order.id] || ''}
                      onChange={(e) => {
                        const newTemplates = {
                          ...bulkDocxTemplates,
                          [order.id]: e.target.value
                        };
                        setBulkDocxTemplates(newTemplates);
                        setUserStorage('bulkDocxTemplates', newTemplates);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontWeight: bulkDocxTemplates[order.id] ? '600' : '400',
                        color: bulkDocxTemplates[order.id] ? '#1f2937' : '#9ca3af',
                        background: 'white',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <option value="">-- Vyberte šablonu --</option>
                      {getTemplateOptions(order).map(template => (
                        <option key={template.value} value={template.value}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </BulkDocxSignerSelect>

                  <BulkDocxSignerSelect>
                    <BulkDocxSignerLabel>
                      Podepisovatel:
                    </BulkDocxSignerLabel>
                    <select
                      value={bulkDocxSigners[order.id] || ''}
                      onChange={(e) => {
                        const newSigners = {
                          ...bulkDocxSigners,
                          [order.id]: e.target.value
                        };
                        setBulkDocxSigners(newSigners);
                        setUserStorage('bulkDocxSigners', newSigners);
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontWeight: bulkDocxSigners[order.id] ? '600' : '400',
                        color: bulkDocxSigners[order.id] ? '#1f2937' : '#9ca3af',
                        background: 'white',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <option value="">Vyberte podepisovatele...</option>
                      {(() => {
                        const availableUsers = [];

                        // Garant
                        if (order.garant_uzivatel_id && order.garant_uzivatel?.cele_jmeno &&
                            order.garant_uzivatel.cele_jmeno !== 'Nezadáno' && order.garant_uzivatel.cele_jmeno !== 'Nezadano') {
                          availableUsers.push({
                            id: order.garant_uzivatel_id,
                            name: order.garant_uzivatel.cele_jmeno,
                            role: 'Garant'
                          });
                        }

                        // Příkazce
                        if (order.prikazce_id && order.prikazce?.cele_jmeno &&
                            order.prikazce.cele_jmeno !== 'Nezadáno' && order.prikazce.cele_jmeno !== 'Nezadano') {
                          availableUsers.push({
                            id: order.prikazce_id,
                            name: order.prikazce.cele_jmeno,
                            role: 'Příkazce'
                          });
                        }

                        // Schvalovatel
                        if (order.schvalovatel_id && order.schvalovatel?.cele_jmeno &&
                            order.schvalovatel.cele_jmeno !== 'Nezadáno' && order.schvalovatel.cele_jmeno !== 'Nezadano') {
                          availableUsers.push({
                            id: order.schvalovatel_id,
                            name: order.schvalovatel.cele_jmeno,
                            role: 'Schvalovatel'
                          });
                        }

                        // Objednatel
                        if (order.objednatel_id && order.objednatel?.cele_jmeno &&
                            order.objednatel.cele_jmeno !== 'Nezadáno' && order.objednatel.cele_jmeno !== 'Nezadano') {
                          availableUsers.push({
                            id: order.objednatel_id,
                            name: order.objednatel.cele_jmeno,
                            role: 'Objednatel'
                          });
                        }

                        return availableUsers.map((user, index) => (
                          <option key={`${order.id}-${user.id}-${user.role}-${index}`} value={user.id}>
                            {user.name} ({user.role})
                          </option>
                        ));
                      })()}
                    </select>
                  </BulkDocxSignerSelect>
                </BulkDocxOrderItem>
              ))}
            </BulkDocxBody>

            <BulkDocxFooter>
              <BulkDocxSummary>
                Celkem: {bulkDocxOrders.length} objednávek
              </BulkDocxSummary>
              <BulkDocxActions>
                <BulkDocxButton
                  className="secondary"
                  onClick={() => setShowBulkDocxDialog(false)}
                >
                  Zrušit
                </BulkDocxButton>
                <BulkDocxButton
                  className="primary"
                  onClick={() => {
                    // Validace: zkontroluj, že všechny objednávky mají vybranou šablonu
                    const missingTemplates = bulkDocxOrders.filter(order => !bulkDocxTemplates[order.id]);
                    if (missingTemplates.length > 0) {
                      const orderNumbers = missingTemplates.map(o => `#${o.cislo_objednavky || o.id}`).join(', ');
                      showToast && showToast(
                        `Vyberte šablonu pro všechny objednávky. Chybí u: ${orderNumbers}`,
                        { type: 'error' }
                      );
                      return;
                    }

                    // Validace: zkontroluj, že všechny objednávky mají vybraného podepisovatele
                    const missingSigners = bulkDocxOrders.filter(order => !bulkDocxSigners[order.id]);
                    if (missingSigners.length > 0) {
                      const orderNumbers = missingSigners.map(o => `#${o.cislo_objednavky || o.id}`).join(', ');
                      showToast && showToast(
                        `Vyberte podepisovatele pro všechny objednávky. Chybí u: ${orderNumbers}`,
                        { type: 'error' }
                      );
                      return;
                    }

                    // TODO: Implementovat hromadné generování
                    alert('TODO: Implementovat hromadné generování DOCX');
                    setShowBulkDocxDialog(false);
                  }}
                >
                  <FontAwesomeIcon icon={faFileWord} style={{ marginRight: '0.5rem' }} />
                  Generovat DOCX
                </BulkDocxButton>
              </BulkDocxActions>
            </BulkDocxFooter>
          </BulkDocxDialog>
        </BulkDocxOverlay>,
        document.body
      )}

      {/* Hromadné schvalování - ConfirmDialog */}
      {showBulkApprovalDialog && (
        <ConfirmDialog
          isOpen={showBulkApprovalDialog}
          onClose={() => setShowBulkApprovalDialog(false)}
          onConfirm={async () => {
            try {
              setLoading(true);

              // Hromadné schválení - update stavu na SCHVALENA
              const results = await Promise.allSettled(
                bulkApprovalOrders.map(async (order) => {
                  // Načti aktuální workflow stavy
                  let currentWorkflow = [];
                  try {
                    if (Array.isArray(order.stav_workflow_kod)) {
                      currentWorkflow = order.stav_workflow_kod;
                    } else if (typeof order.stav_workflow_kod === 'string') {
                      currentWorkflow = JSON.parse(order.stav_workflow_kod);
                    }
                  } catch (e) {
                    currentWorkflow = [];
                  }

                  // Přidej nový stav SCHVALENA
                  const newWorkflow = [
                    ...currentWorkflow,
                    {
                      kod_stavu: 'SCHVALENA',
                      nazev_stavu: 'Schválená',
                      timestamp: new Date().toISOString(),
                      uzivatel_id: currentUserId
                    }
                  ];

                  // Update objednávky
                  const updateData = {
                    stav_objednavky: 'Schválená',
                    stav_workflow_kod: JSON.stringify(newWorkflow),
                    // 🔥 FIX: Použít lokální český čas místo UTC
                    datum_schvaleni: (() => {
                      const now = new Date();
                      const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0');
                      const h = String(now.getHours()).padStart(2,'0'), min = String(now.getMinutes()).padStart(2,'0'), s = String(now.getSeconds()).padStart(2,'0');
                      return `${y}-${m}-${d} ${h}:${min}:${s}`;
                    })()
                  };

                  const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api.eeo/orders-v2.php`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      action: 'update',
                      id: order.id,
                      data: updateData,
                      username: username
                    })
                  });

                  if (!response.ok) {
                    throw new Error(`Chyba při schvalování objednávky #${order.cislo_objednavky}`);
                  }

                  return { success: true, orderId: order.id };
                })
              );

              const successful = results.filter(r => r.status === 'fulfilled').length;
              const failed = results.filter(r => r.status === 'rejected').length;

              if (successful > 0) {
                showToast(`✅ Schváleno: ${successful} objednávek`, 'success');
                // Refresh dat
                await loadData();
                // Zruš výběr
                table.toggleAllRowsSelected(false);
              }

              if (failed > 0) {
                showToast(`⚠ Selhalo: ${failed} objednávek`, 'error');
              }

              setShowBulkApprovalDialog(false);
            } catch (error) {
              console.error('Chyba při hromadném schvalování:', error);
              showToast('Chyba při hromadném schvalování', 'error');
            } finally {
              setLoading(false);
            }
          }}
          title="Hromadné schválení objednávek"
          icon={faCheckCircle}
          variant="success"
          confirmText="Schválit vše"
          cancelText="Zrušit"
        >
          <div style={{ padding: '1rem 0' }}>
            <p style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
              Opravdu chcete schválit <strong>{bulkApprovalOrders.length}</strong> vybraných objednávek?
            </p>
            <div style={{
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#166534' }}>
                📋 Seznam objednávek ke schválení:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#166534' }}>
                {bulkApprovalOrders.map(order => (
                  <li key={order.id} style={{ marginBottom: '0.5rem' }}>
                    <strong>#{order.cislo_objednavky}</strong> - {order.nazev || 'Bez názvu'}
                  </li>
                ))}
              </ul>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Po schválení budou objednávky přesunuty do stavu <strong>"Schválená"</strong> a bude
              zaznamenáno datum schválení.
            </p>
          </div>
        </ConfirmDialog>
      )}

      {/* Hromadné mazání - ConfirmDialog */}
      {showBulkDeleteDialog && (
        <ConfirmDialog
          isOpen={showBulkDeleteDialog}
          onClose={() => setShowBulkDeleteDialog(false)}
          onConfirm={async () => {
            try {
              setLoading(true);

              // Použij vybraný typ mazání (pro adminy)
              const canHardDelete = hasPermission('ADMIN') || hasPermission('ORDER_DELETE_ALL');
              const useHardDelete = canHardDelete && bulkDeleteType === 'hard';

              const results = await Promise.allSettled(
                bulkDeleteOrders.map(async (order) => {
                  // Smazání objednávky s parametrem hard delete
                  const response = await deleteOrderV2(order.id, token, username, useHardDelete);

                  return { success: true, orderId: order.id };
                })
              );

              const successful = results.filter(r => r.status === 'fulfilled').length;
              const failed = results.filter(r => r.status === 'rejected').length;

              if (successful > 0) {
                // Odeber smazané objednávky ze seznamu
                setOrders(prevOrders =>
                  prevOrders.filter(o => !bulkDeleteOrders.find(del => del.id === o.id))
                );
                showToast(`✅ Smazáno: ${successful} objednávek`, 'success');
                // Zruš výběr
                table.toggleAllRowsSelected(false);
              }

              if (failed > 0) {
                showToast(`⚠ Selhalo: ${failed} objednávek`, 'error');
              }

              setShowBulkDeleteDialog(false);
            } catch (error) {
              console.error('Chyba při hromadném mazání:', error);
              showToast('Chyba při hromadném mazání', 'error');
            } finally {
              setLoading(false);
            }
          }}
          title="Hromadné mazání objednávek"
          icon={faTrash}
          variant="danger"
          confirmText={
            (hasPermission('ADMIN') || hasPermission('ORDER_DELETE_ALL'))
              ? (bulkDeleteType === 'hard' ? "⚠ Smazat úplně" : "Smazat (soft)")
              : "Smazat (soft)"
          }
          cancelText="Zrušit"
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
                Opravdu chcete smazat <strong>{bulkDeleteOrders.length}</strong> vybraných objednávek?
              </p>

              {(hasPermission('ADMIN') || hasPermission('ORDER_DELETE_ALL')) ? (
                <>
                  {/* Výběr typu mazání pro adminy */}
                  <div style={{
                    background: '#f8fafc',
                    border: '2px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569', fontSize: '1rem' }}>
                       Vyberte typ smazání:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        padding: '0.75rem',
                        border: `2px solid ${bulkDeleteType === 'soft' ? '#3b82f6' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        background: bulkDeleteType === 'soft' ? '#eff6ff' : 'white',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="deleteType"
                          value="soft"
                          checked={bulkDeleteType === 'soft'}
                          onChange={(e) => setBulkDeleteType(e.target.value)}
                          style={{ marginTop: '0.25rem', accentColor: '#3b82f6', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                            Měkké smazání (SOFT DELETE)
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            Objednávky budou označeny jako neaktivní. Lze později obnovit.
                          </div>
                        </div>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        padding: '0.75rem',
                        border: `2px solid ${bulkDeleteType === 'hard' ? '#dc2626' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        background: bulkDeleteType === 'hard' ? '#fef2f2' : 'white',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="deleteType"
                          value="hard"
                          checked={bulkDeleteType === 'hard'}
                          onChange={(e) => setBulkDeleteType(e.target.value)}
                          style={{ marginTop: '0.25rem', accentColor: '#dc2626', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '0.25rem' }}>
                            ⚠ Úplné smazání (HARD DELETE)
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                            <strong>NEVRATNÉ!</strong> Smaže vše včetně položek, příloh a historie.
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
                    ℹ Měkké smazání (SOFT DELETE)
                  </h4>
                  <p style={{ margin: 0, color: '#92400e', fontSize: '0.95rem' }}>
                    Objednávky budou pouze <strong>označeny jako neaktivní</strong>.
                    Administrátor je může později obnovit.
                  </p>
                </div>
              )}
            </div>

            {/* PRAVÝ SLOUPEC - Seznam objednávek */}
            <div style={{
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>
                📋 Seznam objednávek ke smazání:
              </h4>
              <div style={{ margin: 0, color: '#475569', maxHeight: '300px', overflowY: 'auto' }}>
                {bulkDeleteOrders.map(order => (
                  <div key={order.id} style={{
                    marginBottom: '0.75rem',
                    padding: '0.5rem',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                      #{order.cislo_objednavky}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {order.predmet || order.nazev || 'Bez názvu'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ConfirmDialog>
      )}
      </PageContent>
      </Container>

      {/* 📊 Export Preview Modal */}
      {showExportPreview && exportPreviewData && (
        <ExportPreviewOverlay>
          <ExportPreviewDialog>
            <ExportPreviewHeader>
              <ExportPreviewTitle>
                <FontAwesomeIcon icon={faFileExport} />
                Náhled exportu CSV
              </ExportPreviewTitle>
              <ExportPreviewCloseButton onClick={() => setShowExportPreview(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </ExportPreviewCloseButton>
            </ExportPreviewHeader>

            <ExportPreviewContent>
              {/* Informační karty */}
              <ExportInfoGrid>
                <ExportInfoCard>
                  <ExportInfoLabel>Počet záznamů</ExportInfoLabel>
                  <ExportInfoValue>
                    <FontAwesomeIcon icon={faDatabase} />
                    {exportPreviewData.rowCount}
                  </ExportInfoValue>
                </ExportInfoCard>
                <ExportInfoCard>
                  <ExportInfoLabel>Počet sloupců</ExportInfoLabel>
                  <ExportInfoValue>
                    <FontAwesomeIcon icon={faTableColumns} />
                    {exportPreviewData.columnCount}
                  </ExportInfoValue>
                </ExportInfoCard>
                <ExportInfoCard>
                  <ExportInfoLabel>Oddělovač sloupců</ExportInfoLabel>
                  <ExportInfoValue>
                    <FontAwesomeIcon icon={faListCheck} />
                    {exportPreviewData.separatorName}
                  </ExportInfoValue>
                </ExportInfoCard>
                <ExportInfoCard>
                  <ExportInfoLabel>Oddělovač multiline</ExportInfoLabel>
                  <ExportInfoValue>
                    <FontAwesomeIcon icon={faListCheck} />
                    {exportPreviewData.multilineSeparatorName}
                  </ExportInfoValue>
                </ExportInfoCard>
                <ExportInfoCard>
                  <ExportInfoLabel>Aktivní filtry</ExportInfoLabel>
                  <ExportInfoValue>
                    <FontAwesomeIcon icon={faFilter} />
                    {(() => {
                      let filterCount = 0;
                      if (globalFilter) filterCount++;
                      if (selectedYear !== new Date().getFullYear()) filterCount++;
                      if (selectedMonth !== 'all') filterCount++;
                      if (statusFilter && statusFilter.length > 0) filterCount++;
                      if (selectedObjednatel && selectedObjednatel.length > 0) filterCount++;
                      if (selectedGarant && selectedGarant.length > 0) filterCount++;
                      if (selectedSchvalovatel && selectedSchvalovatel.length > 0) filterCount++;
                      if (selectedPrikazce && selectedPrikazce.length > 0) filterCount++;
                      if (dateFromFilter || dateToFilter) filterCount++;
                      if (amountFromFilter || amountToFilter) filterCount++;
                      return filterCount || 'Žádné';
                    })()}
                  </ExportInfoValue>
                </ExportInfoCard>
              </ExportInfoGrid>

              {/* Náhled prvních 5 řádků */}
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                Náhled prvních 5 řádků
              </h3>
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <ExportPreviewTable>
                <ExportPreviewTableHeader>
                  {Object.keys(exportPreviewData.data[0] || {})
                    .filter(column => {
                      // Zobraz jen sloupce, které má uživatel aktivní v nastavení
                      // Převeď český název sloupce zpět na databázový klíč
                      const dbKey = Object.entries({
                        'ID': 'id',
                        'Číslo objednávky': 'cislo_objednavky',
                        'Předmět': 'predmet',
                        'Poznámka': 'poznamka',
                        'Stav objednávky': 'stav_objednavky',
                        'Datum objednávky': 'dt_objednavky',
                        'Datum schválení': 'dt_schvaleni',
                        'Datum dokončení': 'dt_dokonceni',
                        'Celková cena s DPH': 'celkova_cena_s_dph',
                        'Dodavatel': 'dodavatel_nazev',
                        'Objednatel': 'objednatel',
                        'Garant': 'garant',
                        'Střediska': 'strediska',
                        'LP kódy': 'financovani_lp_kody',
                        'LP názvy': 'financovani_lp_nazvy',
                        'LP čísla': 'financovani_lp_cisla',
                        'Typ financování': 'financovani_typ',
                        'Název typu financování': 'financovani_typ_nazev',
                        'Financování (raw JSON)': 'financovani_raw'
                      }).find(([czech, db]) => czech === column)?.[1];
                      
                      return dbKey ? (exportPreviewData.csvColumnsFromDB[dbKey] || false) : true;
                    })
                    .map((column, idx) => {
                    // Vypočítej maximální šířku sloupce (hlavička + všechny hodnoty)
                    const headerLength = column.length;
                    const maxValueLength = Math.max(
                      ...exportPreviewData.data.slice(0, 5).map(row => 
                        String(row[column] || '').length
                      )
                    );
                    const maxLength = Math.max(headerLength, maxValueLength);
                    // Min 100px, max 400px, 8px na znak (průměrná šířka)
                    const width = Math.min(Math.max(maxLength * 8 + 32, 100), 400);
                    
                    return (
                      <ExportPreviewTableHeaderCell key={idx} style={{ width: `${width}px`, minWidth: `${width}px` }}>
                        {column}
                      </ExportPreviewTableHeaderCell>
                    );
                  })}
                </ExportPreviewTableHeader>
                {exportPreviewData.data.slice(0, 5).map((row, rowIdx) => (
                  <ExportPreviewTableRow key={rowIdx}>
                    {Object.entries(row)
                      .filter(([column]) => {
                        // Stejný filtr jako pro hlavičky
                        const dbKey = Object.entries({
                          'ID': 'id',
                          'Číslo objednávky': 'cislo_objednavky',
                          'Předmět': 'predmet',
                          'Poznámka': 'poznamka',
                          'Stav objednávky': 'stav_objednavky',
                          'Datum objednávky': 'dt_objednavky',
                          'Datum schválení': 'dt_schvaleni',
                          'Datum dokončení': 'dt_dokonceni',
                          'Celková cena s DPH': 'celkova_cena_s_dph',
                          'Dodavatel': 'dodavatel_nazev',
                          'Objednatel': 'objednatel',
                          'Garant': 'garant',
                          'Střediska': 'strediska',
                          'LP kódy': 'financovani_lp_kody',
                          'LP názvy': 'financovani_lp_nazvy',
                          'LP čísla': 'financovani_lp_cisla',
                          'Typ financování': 'financovani_typ',
                          'Název typu financování': 'financovani_typ_nazev',
                          'Financování (raw JSON)': 'financovani_raw'
                        }).find(([czech, db]) => czech === column)?.[1];
                        
                        return dbKey ? (exportPreviewData.csvColumnsFromDB[dbKey] || false) : true;
                      })
                      .map(([column, value], cellIdx) => {
                      // Stejný výpočet šířky jako u hlavičky
                      const headerLength = column.length;
                      const maxValueLength = Math.max(
                        ...exportPreviewData.data.slice(0, 5).map(r => 
                          String(r[column] || '').length
                        )
                      );
                      const maxLength = Math.max(headerLength, maxValueLength);
                      const width = Math.min(Math.max(maxLength * 8 + 32, 100), 400);
                      
                      return (
                        <ExportPreviewTableCell key={cellIdx} style={{ width: `${width}px`, minWidth: `${width}px` }} title={value}>
                          {value}
                        </ExportPreviewTableCell>
                      );
                    })}
                  </ExportPreviewTableRow>
                ))}
              </ExportPreviewTable>
              </div>
            </ExportPreviewContent>

            <ExportPreviewFooter>
              <ExportPreviewNote>
                <FontAwesomeIcon icon={faInfoCircle} />
                Export bude obsahovat pouze {exportPreviewData.rowCount} vyfiltrovaných objednávek
              </ExportPreviewNote>
              <ExportPreviewActions>
                <ExportPreviewButton 
                  $variant="cancel" 
                  onClick={() => setShowExportPreview(false)}
                >
                  <FontAwesomeIcon icon={faTimes} />
                  Zrušit
                </ExportPreviewButton>
                <ExportPreviewButton 
                  $variant="confirm" 
                  onClick={handleConfirmExport}
                >
                  <FontAwesomeIcon icon={faDownload} />
                  Stáhnout CSV
                </ExportPreviewButton>
              </ExportPreviewActions>
            </ExportPreviewFooter>
          </ExportPreviewDialog>
        </ExportPreviewOverlay>
      )}

      {/* Floating Header Panel - React Portal */}
      {showFloatingHeader && ReactDOM.createPortal(
        <FloatingHeaderPanel $visible={showFloatingHeader}>
          <FloatingTableWrapper data-floating-header-wrapper>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              {/* Definice šířek sloupců podle naměřených hodnot */}
              {columnWidths.length > 0 && (
                <colgroup>
                  {columnWidths.map((width, index) => (
                    <col key={index} style={{ width: `${width}px` }} />
                  ))}
                </colgroup>
              )}
              <TableHead>
                {/* Hlavní řádek se jmény sloupců - renderuj stejný header jako v hlavní tabulce */}
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHeader
                        key={header.id}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        style={{
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          width: header.getSize()
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && header.column.getIsSorted() && (
                            <FontAwesomeIcon
                              icon={header.column.getIsSorted() === 'desc' ? faChevronDown : faChevronUp}
                              style={{ fontSize: '0.75rem', opacity: 0.7 }}
                            />
                          )}
                        </div>
                      </TableHeader>
                    ))}
                  </tr>
                ))}
                {/* Druhý řádek s filtry ve sloupcích - PŘESNÁ KOPIE Z ORIGINÁLNÍ HLAVIČKY */}
                <tr>
                  {table.getHeaderGroups()[0]?.headers.map(header => (
                    <TableHeader key={`filter-floating-${header.id}`} style={{
                      padding: '0.5rem',
                      backgroundColor: '#f8f9fa',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      {header.id === 'select' ? (
                        <div style={{ display: 'none' }}>
                          <input
                            type="checkbox"
                            checked={table.getIsAllRowsSelected()}
                            ref={(el) => {
                              if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
                            }}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            title={table.getIsAllRowsSelected() ? 'Zrušit výběr všech' : 'Vybrat vše'}
                          />
                        </div>
                      ) : header.id === 'expander' ? (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '32px'
                        }}>
                          <FilterActionButton
                            onClick={toggleAllRows}
                            title={table.getIsSomeRowsExpanded() ? "Sbalit všechny řádky" : "Rozbalit všechny řádky"}
                          >
                            <FontAwesomeIcon icon={table.getIsSomeRowsExpanded() ? faMinus : faPlus} />
                          </FilterActionButton>
                        </div>
                      ) : header.id === 'approve' ? (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '3px',
                          height: '32px'
                        }}>
                          <FilterActionButton
                            onClick={() => {
                              const newFilter = approvalFilter.includes('pending')
                                ? approvalFilter.filter(f => f !== 'pending')
                                : [...approvalFilter, 'pending'];
                              setApprovalFilter(newFilter);
                              setUserStorage('orders25List_approvalFilter', newFilter);
                            }}
                            title={approvalFilter.includes('pending') 
                              ? "Zrušit filtr: Ke schválení" 
                              : "Filtrovat: Ke schválení"
                            }
                            className={approvalFilter.includes('pending') ? 'active' : ''}
                            style={{
                              color: approvalFilter.includes('pending') ? '#92400e' : undefined,
                              background: approvalFilter.includes('pending') ? '#fef3c7' : undefined
                            }}
                          >
                            <FontAwesomeIcon icon={faHourglassHalf} />
                          </FilterActionButton>
                          <FilterActionButton
                            onClick={() => {
                              const newFilter = approvalFilter.includes('approved')
                                ? approvalFilter.filter(f => f !== 'approved')
                                : [...approvalFilter, 'approved'];
                              setApprovalFilter(newFilter);
                              setUserStorage('orders25List_approvalFilter', newFilter);
                            }}
                            title={approvalFilter.includes('approved')
                              ? "Zrušit filtr: Vyřízené" 
                              : "Filtrovat: Vyřízené"
                            }
                            className={approvalFilter.includes('approved') ? 'active' : ''}
                            style={{
                              color: approvalFilter.includes('approved') ? '#166534' : undefined,
                              background: approvalFilter.includes('approved') ? '#dcfce7' : undefined
                            }}
                          >
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </FilterActionButton>
                        </div>
                      ) : header.id === 'actions' ? (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '3px',
                          height: '32px'
                        }}>
                          {/* Hromadné akce - DOČASNĚ SKRYTO */}
                          {false && (() => {
                            const selectedCount = table.getSelectedRowModel().rows.length;
                            if (selectedCount > 0) {
                              const selectedOrders = table.getSelectedRowModel().rows.map(row => row.original);
                              const approvalCount = selectedOrders.filter(o => o.stav_objednavky === 'Ke schválení').length;
                              const docxCount = selectedOrders.filter(o => canExportDocument(o)).length;

                              return (
                                <>
                                  {approvalCount > 0 && (hasPermission('ADMIN') || hasPermission('ORDER_APPROVE')) && (
                                    <FilterActionButton
                                      onClick={() => {
                                        const eligibleOrders = selectedOrders.filter(o => o.stav_objednavky === 'Ke schválení');
                                        setBulkApprovalOrders(eligibleOrders);
                                        setShowBulkApprovalDialog(true);
                                      }}
                                      title={`Schválit ${approvalCount} vybraných objednávek`}
                                      style={{ color: '#059669' }}
                                    >
                                      <FontAwesomeIcon icon={faCheckCircle} />
                                      <ActionBadge>{approvalCount}</ActionBadge>
                                    </FilterActionButton>
                                  )}
                                  {docxCount > 0 && (
                                    <FilterActionButton
                                      onClick={() => {
                                        const eligibleOrders = selectedOrders.filter(o => canExportDocument(o));
                                        setBulkDocxOrders(eligibleOrders);
                                        const initialSigners = {};
                                        const initialTemplates = {};
                                        eligibleOrders.forEach(order => {
                                          initialSigners[order.id] = order.schvalovatel_id || order.schvalovatel || null;
                                          const templates = getTemplateOptions(order);
                                          if (templates.length > 0) {
                                            initialTemplates[order.id] = templates[0].value;
                                          }
                                        });
                                        setBulkDocxSigners(initialSigners);
                                        setBulkDocxTemplates(initialTemplates);
                                        setShowBulkDocxDialog(true);
                                      }}
                                      title={`Generovat DOCX pro ${docxCount} vybraných objednávek`}
                                      style={{ color: '#0891b2' }}
                                    >
                                      <FontAwesomeIcon icon={faFileWord} />
                                      <ActionBadge>{docxCount}</ActionBadge>
                                    </FilterActionButton>
                                  )}
                                  <FilterActionButton
                                    onClick={() => {
                                      setBulkDeleteOrders(selectedOrders);
                                      setShowBulkDeleteDialog(true);
                                    }}
                                    title={`Smazat ${selectedCount} vybraných objednávek`}
                                    style={{ color: '#dc2626' }}
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                    <ActionBadge>{selectedCount}</ActionBadge>
                                  </FilterActionButton>
                                </>
                              );
                            }
                            return null;
                          })()}
                          <FilterActionButton
                            onClick={clearColumnFilters}
                            title="Vymazat filtry sloupců"
                          >
                            <FontAwesomeIcon icon={faEraser} />
                          </FilterActionButton>
                          <FilterActionButton
                            onClick={toggleRowHighlighting}
                            title={showRowHighlighting ? "Vypnout zvýrazňování řádků" : "Zapnout zvýrazňování řádků"}
                            className={showRowHighlighting ? 'active' : ''}
                          >
                            <FontAwesomeIcon icon={faPalette} />
                          </FilterActionButton>
                        </div>
                      ) : header.column.columnDef.accessorKey === 'dt_objednavky' ? (
                        <div style={{ position: 'relative' }}>
                          <DatePicker
                            fieldName="dt_objednavky_filter_floating"
                            value={columnFilters[header.column.columnDef.accessorKey] || ''}
                            onChange={(value) => {
                              const newFilters = { ...columnFilters };
                              // Uložit datum ve formátu yyyy-mm-dd (jak ho vrací DatePicker)
                              newFilters[header.column.columnDef.accessorKey] = value;
                              setColumnFilters(newFilters);
                            }}
                            placeholder="Datum"
                            variant="compact"
                          />
                        </div>
                      ) : header.column.columnDef.accessorKey === 'max_cena_s_dph' || 
                         header.column.columnDef.accessorKey === 'cena_s_dph' || 
                         header.column.columnDef.accessorKey === 'faktury_celkova_castka_s_dph' ? (
                        <div style={{ position: 'relative' }}>
                          <OperatorInput
                            value={localColumnFilters[header.column.columnDef.accessorKey] || ''}
                            onChange={(value) => {
                              const newFilters = { ...localColumnFilters };
                              newFilters[header.column.columnDef.accessorKey] = value;
                              setColumnFiltersDebounced(newFilters);
                            }}
                            placeholder={
                              header.column.columnDef.accessorKey === 'max_cena_s_dph' ? 'Max. cena s DPH' :
                              header.column.columnDef.accessorKey === 'cena_s_dph' ? 'Cena s DPH' :
                              'Cena FA s DPH'
                            }
                            clearButton={true}
                            onClear={() => {
                              const newFilters = { ...localColumnFilters };
                              newFilters[header.column.columnDef.accessorKey] = '';
                              setColumnFiltersDebounced(newFilters);
                            }}
                          />
                        </div>
                      ) : (
                        <ColumnFilterWrapper>
                          <FontAwesomeIcon icon={faSearch} />
                          <ColumnFilterInput
                            type="text"
                            placeholder={`Hledat ${header.column.columnDef.header}...`}
                            value={localColumnFilters[header.column.columnDef.accessorKey] || ''}
                            onChange={(e) => {
                              const newFilters = { ...localColumnFilters };
                              newFilters[header.column.columnDef.accessorKey] = e.target.value;
                              setColumnFiltersDebounced(newFilters);
                            }}
                          />
                          {localColumnFilters[header.column.columnDef.accessorKey] && (
                            <ColumnClearButton
                              onClick={() => {
                                const newFilters = { ...localColumnFilters };
                                delete newFilters[header.column.columnDef.accessorKey];
                                setColumnFiltersDebounced(newFilters);
                              }}
                              title="Vymazat"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </ColumnClearButton>
                          )}
                        </ColumnFilterWrapper>
                      )}
                    </TableHeader>
                  ))}
                </tr>
              </TableHead>
            </table>
          </FloatingTableWrapper>
        </FloatingHeaderPanel>,
        document.body
      )}

      {/* Moderní Sponka helper - kontextová nápověda pro seznam objednávek */}
      {hasPermission('HELPER_VIEW') && <ModernHelper pageContext="orders" />}
      
      {/* Popup se seznamem faktur */}
      {invoicePopupVisible && (
        <InvoiceListPopup
          invoices={invoicePopupInvoices}
          order={invoicePopupOrder}
          loading={invoicePopupLoading}
          onClose={handleCloseInvoicePopup}
          onEditInvoice={handleEditInvoiceFromPopup}
          onAddInvoice={handleAddInvoiceFromPopup}
        />
      )}
      
      {/* ✅ Konec podmíněného zobrazení pro uživatele s oprávněními */}
      </>
      )}
    </>
  );
};

export default Orders25List;