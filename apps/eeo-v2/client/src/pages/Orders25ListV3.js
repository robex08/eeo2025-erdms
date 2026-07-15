/**
 * 📋 Orders25ListV3.js
 * 
 * VERZE 3.0 - Nová implementace seznamu objednávek s backend paging
 * 
 * Datum: 23. ledna 2026
 * Účel: Paralelní implementace pro postupný přechod na BE paging/filtering
 * Status: ✅ PRODUKČNÍ - Verze 3.0
 * 
 * Dokumentace: /docs/ORDERS25LIST_BACKEND_PAGINATION_ANALYSIS.md
 * 
 * Změny oproti V2:
 * - ✅ Backend pagination (50-100 záznamů na stránku)
 * - ✅ Backend filtering (SQL místo JS)
 * - ✅ Postupné načítání (lazy loading)
 * - ✅ Optimalizované pro velké množství dat (10 000+ objednávek)
 * - ✅ Menší RAM footprint
 * - ✅ Rychlejší response time
 */

import React, { useContext, useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRocket, 
  faSpinner, 
  faExclamationTriangle,
  faCog,
  faChartBar,
  faFilter,
  faSearch,
  faEye,
  faEyeSlash,
  faPalette,
  faTimes,
  faEraser,
  faSync,
  faLock,
  faClock,
  faEnvelope,
  faPhone,
  faUnlock,
  faPlus,
  faFileExport,
  faCalendarAlt,
  faTrash,
  faCheckCircle,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

// Status colors
import { STATUS_COLORS, getStatusColor } from '../constants/orderStatusColors';

// Context
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { ToastContext } from '../context/ToastContext';
import { useBackgroundTasks } from '../context/BackgroundTasksContext';

// API Services
import { getOrderV2, deleteOrderV2 } from '../services/apiOrderV2';
import { findOrderPageV3 } from '../services/apiOrdersV3';
import { fetchCiselniky } from '../services/api2auth';
import { getInvoicesByOrder25 } from '../services/api25invoices';
import { fetchCurrentlySubstituting } from '../services/apiSubstitution';

// Custom hooks
import { useOrdersV3 } from '../hooks/ordersV3/useOrdersV3';
import useOrdersV3State from '../hooks/ordersV3/useOrdersV3State';
import useOrderPermissions from '../hooks/ordersV3/useOrderPermissions';

// Components
import OrdersDashboardV3Full from '../components/ordersV3/OrdersDashboardV3Full';
import OrdersFiltersV3Full from '../components/ordersV3/OrdersFiltersV3Full';
import OrdersPaginationV3 from '../components/ordersV3/OrdersPaginationV3';
import OrdersColumnConfigV3 from '../components/ordersV3/OrdersColumnConfigV3';
import VirtualizedOrdersTable from '../components/ordersV3/VirtualizedOrdersTable';
import { OrderContextMenu } from '../components/OrderContextMenu';
import { SmartTooltip } from '../styles/SmartTooltip';
import ConfirmDialog from '../components/ConfirmDialog';
import InvoiceListPopup from '../components/InvoiceListPopup';
import { exportCsv } from '../utils/format';
import { isValidConcept, hasDraftChanges } from '../utils/draftUtils.js';
import draftManager from '../services/DraftManager';

// Config
import ORDERS_V3_CONFIG from '../constants/ordersV3Config';

// Lazy loaded components for performance
const DocxGeneratorModal = lazy(() => import('../components/DocxGeneratorModal').then(m => ({ default: m.DocxGeneratorModal })));

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  width: 100%;
  padding: 1rem 1.5rem;
  margin: 0;
  min-height: calc(100vh - var(--app-fixed-offset, 140px));
  box-sizing: border-box;
  position: relative;
  
  /* Fade-in animace po načtení */
  opacity: ${props => props.$isInitialized ? 1 : 0};
  transition: opacity 0.4s ease-in-out;
`;


const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1rem;
  color: white;
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  order: 2;
  
  @media (max-width: 768px) {
    order: 1;
  }
`;

const Title = styled.h1`
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  order: 1;
  
  @media (max-width: 768px) {
    order: 2;
    width: 100%;
    justify-content: center;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 3px solid #e5e7eb;
  
  > :first-child {
    margin-right: auto;
  }
`;

// Minimal fulltext search (fallback když jsou rozšířené filtry skryté)
const QuickSearch = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 260px;
  max-width: 520px;
  margin-right: auto;
`;

const QuickSearchInput = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
`;

const QuickSearchClear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.7rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #3b82f6;
  }
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  border: 2px solid ${props => props.$active ? '#3b82f6' : '#e2e8f0'};
  border-radius: 8px;
  color: ${props => props.$active ? 'white' : '#475569'};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f1f5f9'};
    border-color: ${props => props.$active ? '#2563eb' : '#3b82f6'};
  }

  svg {
    font-size: 0.9rem;
  }
`;

const PeriodWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PeriodLabel = styled.label`
  font-weight: 600;
  font-size: 1rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
`;

const PeriodSelectorButton = styled.button`
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  width: auto;
  min-width: 240px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;

  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.25);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }
`;

const PeriodMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  background: rgba(30, 64, 175, 0.98);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  min-width: 240px;
  z-index: 10001;
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(30, 64, 175, 0.3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.8);
    border-radius: 4px;
  }
`;

const PeriodMenuItem = styled.div`
  padding: 0.75rem 1rem;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &:first-of-type {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  &:last-of-type {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const PeriodDropdownContainer = styled.div`
  position: relative;
  width: auto;
`;

const ReloadButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    font-size: 0.9rem;
    animation: ${props => props.$loading ? 'spin 1s linear infinite' : 'none'};
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;


// 🎬 Loading Overlay s blur efektem a smooth transitions
const InitializationOverlay = styled.div`
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

const InitializationSpinner = styled.div`
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

const InitializationMessage = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
  margin-bottom: 0.5rem;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.1s, opacity 0.5s ease-in-out 0.1s;
`;

const InitializationSubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  transform: translateY(${props => props.$visible ? '0' : '10px'});
  opacity: ${props => props.$visible ? 1 : 0};
  transition: transform 0.5s ease-in-out 0.15s, opacity 0.5s ease-in-out 0.15s;
`;



const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  color: #cbd5e1;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #475569;
  margin: 0 0 0.5rem 0;
`;

const EmptyText = styled.p`
  font-size: 1rem;
  color: #64748b;
  margin: 0;
`;

const ErrorAlert = styled.div`
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #ef4444;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// 🔒 Styled components for locked order dialog
const InfoText = styled.p`
  margin: 0.75rem 0;
  color: #64748b;
  line-height: 1.6;
`;

const UserInfo = styled.div`
  padding: 1rem;
  background: #f8fafc;
  border-left: 4px solid #3b82f6;
  border-radius: 4px;
  margin: 1rem 0;
  font-size: 1.1rem;
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

const ErrorIcon = styled.div`
  font-size: 2rem;
  color: #ef4444;
`;

const ErrorMessage = styled.div`
  flex: 1;
  font-size: 1rem;
  color: #b91c1c;
  font-weight: 500;
`;

const TablePlaceholder = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: center;
  color: #64748b;
  font-size: 1rem;
  font-style: italic;
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Funkce pro mapování uživatelského stavu na systémový kód
const mapUserStatusToSystemCode = (userStatus) => {
  if (userStatus && typeof userStatus === 'string') {
    if (userStatus.startsWith('Zamítnut')) return 'ZAMITNUTA';
    if (userStatus.startsWith('Schválen')) return 'SCHVALENA';
    if (userStatus.startsWith('Dokončen')) return 'DOKONCENA';
    if (userStatus.startsWith('Zrušen')) return 'ZRUSENA';
    if (userStatus.startsWith('Archivován')) return 'ARCHIVOVANO';
    if (userStatus.startsWith('Zkontrolovan')) return 'ZKONTROLOVANA';
  }
  
  const mapping = {
    'Ke schválení': 'ODESLANA_KE_SCHVALENI',
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
    'Smazaná': 'SMAZANA',
    'Koncept': 'NOVA'
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
        const workflowStates = Array.isArray(order.stav_workflow_kod) 
          ? order.stav_workflow_kod 
          : JSON.parse(order.stav_workflow_kod);
        if (Array.isArray(workflowStates)) {
          const lastState = workflowStates[workflowStates.length - 1];
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
    return statusColors?.light || STATUS_COLORS.NOVA.light;
  } catch (error) {
    return STATUS_COLORS.NOVA.light;
  }
};

// Funkce pro získání system status kódu objednávky
const getOrderSystemStatus = (order) => {
  if (!order) return 'NOVA';
  
  try {
    if (order.stav_workflow_kod) {
      const workflowStates = Array.isArray(order.stav_workflow_kod) 
        ? order.stav_workflow_kod 
        : JSON.parse(order.stav_workflow_kod);
      if (Array.isArray(workflowStates) && workflowStates.length > 0) {
        const lastState = workflowStates[workflowStates.length - 1];
        if (typeof lastState === 'object' && (lastState.kod_stavu || lastState.nazev_stavu)) {
          return lastState.kod_stavu || 'NEZNAMY';
        } else {
          return typeof lastState === 'string' ? lastState : 'NOVA';
        }
      }
    }
  } catch {}
  
  return order.stav_id_num || order.stav_id || 'NOVA';
};

// ============================================================================
// COLUMN LABELS (pro konfiguraci)
// ============================================================================

const COLUMN_LABELS = {
  expander: '',
  approve: 'Schválení / Storno',
  kontrola_komentare: 'Kontrola / Komentáře',
  dt_objednavky: 'Datum objednávky',
  cislo_objednavky: 'Evidenční číslo',
  financovani: 'Financování',
  objednatel_garant: 'Objednatel / Garant',
  prikazce_schvalovatel: 'Příkazce / Schvalovatel',
  dodavatel_nazev: 'Dodavatel',
  stav_objednavky: 'Stav',
  stav_registru: 'Stav registru',
  max_cena_s_dph: 'Max. cena s DPH',
  cena_s_dph: 'Cena s DPH',
  faktury_celkova_castka_s_dph: 'Cena FA s DPH',
  actions: 'Akce',
};

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

function decodeOpravneni(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function Orders25ListV3() {
  // Contexts
  const { user_id, userDetail, token, username, hasPermission, hasAdminRole } = useContext(AuthContext);
  const { showToast: progressShowToast, showProgress, hideProgress } = useContext(ProgressContext);
  const { showToast: toastShowToast } = useContext(ToastContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Prefer ToastContext, fallback to ProgressContext
  const showToast = toastShowToast || progressShowToast;

  // Background tasks (auto-refresh)
  const bgTasksContext = useBackgroundTasks();

  // 🔄 BT: čas posledního tichého auto-refresh (zobrazuje se vedle ikony refresh)
  const [lastBtAutoRefreshTime, setLastBtAutoRefreshTime] = useState(null);
  const [activeSubstitutions, setActiveSubstitutions] = useState([]);

  // 🐛 CRITICAL FIX: API V2 vrací ID jako NUMBER, AuthContext má user_id jako STRING
  // Musíme konvertovat na number pro správné porovnání v permissions
  const currentUserId = useMemo(() => parseInt(user_id, 10), [user_id]);

  // Check if user is ADMIN (SUPERADMIN or ADMINISTRATOR role)
  const isAdmin = useMemo(() => {
    return hasAdminRole && hasAdminRole();
  }, [hasAdminRole]);

  const isBudgetManagerRole = useMemo(() => {
    return userDetail?.roles?.some(role => role.kod_role === 'SPRAVCE_ROZPOCTU');
  }, [userDetail?.roles]);

  // ✅ Kontrola privilegovaných rolí (účetní, hlavní účetní, veřejné zakázky)
  const hasAccountingRole = useMemo(() => {
    if (!userDetail?.roles) return false;
    return userDetail.roles.some(role => 
      role.kod_role === 'UCETNI' || 
      role.kod_role === 'HLAVNI_UCETNI' || 
      role.kod_role === 'VEREJNE_ZAKAZKY'
    );
  }, [userDetail?.roles]);

  const hasApproveColumn = useMemo(() => {
    if (!hasPermission) return false;
    const hasDelegatedApprove = activeSubstitutions.some(item => {
      const perms = decodeOpravneni(item?.opravneni);
      return toBool(perms?.approve ?? item?.approve ?? item?.can_approve);
    });

    return (hasAdminRole && hasAdminRole()) ||
      hasPermission('ORDER_APPROVE') ||
      hasPermission('ORDER_EDIT_ALL') ||
      hasPermission('ORDER_EDIT_OWN') ||
      hasPermission('ORDER_EDIT_SUBORDINATE') ||
      hasPermission('ORDER_MANAGE') ||
      hasDelegatedApprove;
  }, [hasAdminRole, hasPermission, activeSubstitutions]);

  const substitutedApproverIds = useMemo(() => {
    return activeSubstitutions
      .filter(item => {
        const perms = decodeOpravneni(item?.opravneni);
        return toBool(perms?.approve ?? item?.approve ?? item?.can_approve);
      })
      .map(item => item?.zastupovany_id)
      .filter(id => id !== null && id !== undefined)
      .map(id => String(id));
  }, [activeSubstitutions]);

  const substitutedMaterialCheckerIds = useMemo(() => {
    return activeSubstitutions
      .filter(item => {
        const perms = decodeOpravneni(item?.opravneni);
        const canConfirm = toBool(perms?.confirm ?? perms?.material_check ?? perms?.materialCorrectness ?? item?.confirm ?? item?.can_confirm);
        const canApprove = toBool(perms?.approve ?? item?.approve ?? item?.can_approve);
        const canView = toBool(perms?.view ?? item?.view ?? item?.can_view);
        return canConfirm || canApprove || canView;
      })
      .map(item => item?.zastupovany_id)
      .filter(id => id !== null && id !== undefined)
      .map(id => String(id));
  }, [activeSubstitutions]);

  const substitutedViewerIds = useMemo(() => {
    return activeSubstitutions
      .filter(item => {
        const perms = decodeOpravneni(item?.opravneni);
        const canView = toBool(perms?.view ?? item?.view ?? item?.can_view);
        const canApprove = toBool(perms?.approve ?? item?.approve ?? item?.can_approve);
        const canConfirm = toBool(perms?.confirm ?? perms?.material_check ?? perms?.materialCorrectness ?? item?.confirm ?? item?.can_confirm);
        return canView || canApprove || canConfirm;
      })
      .map(item => item?.zastupovany_id)
      .filter(id => id !== null && id !== undefined)
      .map(id => String(id));
  }, [activeSubstitutions]);

  const substitutedApproverIdSet = useMemo(() => new Set(substitutedApproverIds), [substitutedApproverIds]);

  // ✅ OPTIMALIZACE: Memoizované permission funkce místo inline definic
  const {
    canEdit,
    canCreateInvoice,
    canExportDocument,
    canDelete,
    canHardDelete,
    canViewDetails,
    canGenerateFinancialControl,
  } = useOrderPermissions(hasPermission, currentUserId, {
    substitutedApproverIds,
    substitutedMaterialCheckerIds,
    substitutedViewerIds,
  });

  // ✅ Permission funkce nyní v useOrderPermissions hook

  // State pro třídění - výchozí: datum aktualizace sestupně (nejnovější první)
  const [sorting, setSorting] = useState([{ id: 'dt_objednavky', desc: true }]);

  // State pro global/fulltext search - musí být před useOrdersV3 kvůli dependency
  const [globalFilter, setGlobalFilter] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_globalFilter_${user_id}`);
    return saved || '';
  });

  // Ref na aktuální globalFilter (aby BT callback nemusel být re-registrán při každém psaní)
  const globalFilterRef = useRef(globalFilter);
  useEffect(() => {
    globalFilterRef.current = globalFilter;
  }, [globalFilter]);

  // ✅ DEBOUNCED globalFilter - zpoždění 500ms pro omezení API requestů
  const [debouncedGlobalFilter, setDebouncedGlobalFilter] = useState(globalFilter);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGlobalFilter(globalFilter);
    }, 500); // 500ms debounce - vhodné pro fulltext search

    return () => clearTimeout(timer);
  }, [globalFilter]);

  useEffect(() => {
    let cancelled = false;

    const loadActiveSubstitutions = async () => {
      if (!token || !username) {
        if (!cancelled) setActiveSubstitutions([]);
        return;
      }

      try {
        const current = await fetchCurrentlySubstituting({ token, username });
        if (!cancelled) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const normalized = (Array.isArray(current) ? current : []).filter(item => {
            if (!item) return false;
            if (item.aktivni === false || item.aktivni === 0 || item.aktivni === '0') return false;
            if (item.dt_od && todayStr < item.dt_od) return false;
            if (item.dt_do && todayStr > item.dt_do) return false;
            return true;
          });
          setActiveSubstitutions(normalized);
        }
      } catch (_) {
        if (!cancelled) setActiveSubstitutions([]);
      }
    };

    loadActiveSubstitutions();
    return () => {
      cancelled = true;
    };
  }, [token, username]);

  // State pro číselník stavů (načítá se z API)
  const [orderStatesList, setOrderStatesList] = useState([]);

  // Custom hook pro Orders V3
  const {
    // Data
    orders,
    loading,
    error,
    stats,
    filteredStats,
    
    // Pagination
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    
    // Filtry
    selectedPeriod,
    setSelectedPeriod,
    columnFilters,
    dashboardFilters,
    handlePanelFiltersChange,
    handleColumnFilterChange,
    handleDashboardFilterChange,
    handleClearFilters: originalClearFilters,
    
    // Column Configuration
    columnVisibility,
    columnOrder,
    handleColumnVisibilityChange,
    handleColumnOrderChange,
    handleResetColumnConfig,
    
    // Expanded Rows
    expandedRows,
    subRowsData,
    handleToggleRow,
    
    // Actions
    loadOrders,
    clearCache, // ✅ Pro vyčištění cache po update operacích
    
    // Utils
    getOrderTotalPriceWithDPH,
    
    // 🆕 Kontrola a komentáře
    handleToggleOrderCheck,
    handleLoadComments,
    handleAddComment,
    handleDeleteComment,
  } = useOrdersV3({
    token,
    username,
    userId: user_id,
    showProgress,
    hideProgress,
    sorting: sorting,
    globalFilter: debouncedGlobalFilter, // ✅ Použití debounced hodnoty pro API requesty
    initialDashboardFilter: location.state?.dashboardFilter || '', // 🎯 Dashboard proklik - bez blinku
  });

  // ✅ VIRTUALIZATION: Automatic based na data size (declared after orders)
  const shouldUseVirtualization = orders.length >= ORDERS_V3_CONFIG.VIRTUALIZATION_THRESHOLD;

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const maxItems = itemsPerPage && itemsPerPage > 0
      ? Math.min(itemsPerPage, orders.length)
      : Math.min(20, orders.length);

    const snapshot = orders.slice(0, maxItems).map((order) => ({
      id: order.id,
      cislo_objednavky: order.cislo_objednavky,
      stav_workflow_kod: order.stav_workflow_kod,
      stav_objednavky: order.stav_objednavky,
      stav_id: order.stav_id,
      stav_id_num: order.stav_id_num,
    }));
  }, [orders, itemsPerPage]);

  // Helper funkce pro získání labelu období
  const getPeriodLabel = (value) => {
    const labels = {
      'all': 'Vše (bez omezení)',
      'current-year': 'Aktuální rok',
      'current-month': 'Aktuální měsíc',
      'last-month': 'Poslední měsíc',
      'last-quarter': 'Poslední kvartál',
      'all-months': 'Všechny měsíce'
    };
    return labels[value] || value;
  };

  // ✅ OPTIMALIZACE: Consolidated state management místo 7x individual useState + useEffect
  const {
    preferences,
    updatePreferences,
    showDashboard,
    showFilters,
    dashboardMode,
    showRowColoring,
    columnSizing,
  } = useOrdersV3State(user_id);

  const showFiltersStorageKey = useMemo(() => {
    return user_id ? `${ORDERS_V3_CONFIG.STORAGE_PREFIX}_showFilters_${user_id}` : null;
  }, [user_id]);

  const setShowFilters = useCallback((value) => {
    updatePreferences({ showFilters: value });
    if (showFiltersStorageKey) {
      localStorage.setItem(showFiltersStorageKey, String(value));
    }
  }, [updatePreferences, showFiltersStorageKey]);
  
  // State pro inicializaci - skryje obsah až do načtení všech dat
  const [isInitialized, setIsInitialized] = useState(false);
  
  // State pro backend pagination toggle
  const [useBackendPagination, setUseBackendPagination] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_useBackendPagination_${user_id}`);
    return saved !== null ? JSON.parse(saved) : true; // Defaultně zapnuto
  });
  
  // State pro dialogy
  const [docxModalOpen, setDocxModalOpen] = useState(false);
  const [docxModalOrder, setDocxModalOrder] = useState(null);
  
  // 📋 Period dropdown state
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  
  // 🆕 State pro kontextové menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, order, selectedData, selectedText }
  const lastSelectedTextRef = useRef('');
  const lastSelectionRangeRef = useRef(null);
  
  // State pro highlight objednávky po návratu z editace
  const [highlightOrderId, setHighlightOrderId] = useState(null);
  const [highlightAction, setHighlightAction] = useState(null); // 🎨 approve/reject/postpone pro barvu
  const [isSearchingForOrder, setIsSearchingForOrder] = useState(false);
  // Ref pro dvoufázový scroll po návratu z editace:
  // 1) zjistit page (API) 2) počkat na načtení orders pro tu page a teprve pak scrollovat
  const pendingScrollToOrderRef = useRef(null); // { orderId, page }
  
  // 🔒 State pro locked order dialog
  const [showLockedOrderDialog, setShowLockedOrderDialog] = useState(false);
  const [lockedOrderInfo, setLockedOrderInfo] = useState(null);
  
  // 🎯 State pro draft confirm dialog (kontrola rozdělaných objednávek)
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [currentDraftData, setCurrentDraftData] = useState(null);
  const [orderToEdit, setOrderToEdit] = useState(null);

  // 🧾 State pro popup výběru faktury (když má objednávka již přiřazené faktury)
  const [invoicePopupVisible, setInvoicePopupVisible] = useState(false);
  const [invoicePopupOrder, setInvoicePopupOrder] = useState(null);
  const [invoicePopupInvoices, setInvoicePopupInvoices] = useState([]);
  const [invoicePopupLoading, setInvoicePopupLoading] = useState(false);

  // 🆕 State pro potvrzení zavření rozpracované objednávky při vytváření nové
  const [showNewOrderConfirmDialog, setShowNewOrderConfirmDialog] = useState(false);

  // 🗑️ State pro mazání objednávky
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('soft'); // 'soft' | 'hard' | 'restore'

  const isSelectionInsideOrdersTable = useCallback((selection) => {
    const tableElement = document.querySelector('[data-orders-v3-table="true"]');
    if (!tableElement || !selection) return false;

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    const anchorElement = anchorNode?.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : anchorNode instanceof Element
        ? anchorNode
        : null;
    const focusElement = focusNode?.nodeType === Node.TEXT_NODE
      ? focusNode.parentElement
      : focusNode instanceof Element
        ? focusNode
        : null;

    return !!(
      (anchorElement && tableElement.contains(anchorElement)) ||
      (focusElement && tableElement.contains(focusElement))
    );
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection?.();
      const text = selection?.toString().trim() || '';
      if (text) {
        lastSelectedTextRef.current = text;
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          try {
            lastSelectionRangeRef.current = selection.getRangeAt(0).cloneRange();
          } catch {
            lastSelectionRangeRef.current = null;
          }
        }
      }
    };

    const handleMouseDownCapture = (e) => {
      if (e.button !== 2) return;
      const selection = window.getSelection?.();
      if (!selection || selection.isCollapsed) return;
      if (isSelectionInsideOrdersTable(selection)) {
        e.preventDefault();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDownCapture, true);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDownCapture, true);
    };
  }, [isSelectionInsideOrdersTable]);

  // 🎯 Effect: Načtení číselníku stavů z API
  useEffect(() => {
    const loadStates = async () => {
      if (!token || !username) return;
      
      try {
        const statesData = await fetchCiselniky({ token, username, typ: 'OBJEDNAVKA' });
        
        // Seřaď stavy abecedně podle názvu a přidej .label (stejně jako OrdersFiltersV3Full)
        const sortedStates = (statesData || []).sort((a, b) => {
          const nameA = (a.nazev_stavu || a.nazev || '').toLowerCase();
          const nameB = (b.nazev_stavu || b.nazev || '').toLowerCase();
          return nameA.localeCompare(nameB, 'cs');
        }).map(status => {
          const kod = status.kod_stavu || status.kod || '';
          const nazev = status.nazev_stavu || status.nazev || kod;
          return {
            ...status,
            id: kod,
            label: nazev, // ✅ Přidej .label pro zobrazení v UI
            kod_stavu: kod
          };
        });
        
        setOrderStatesList(sortedStates);
        
        // 🔧 VALIDACE: Ověř že uložený filtr stavu existuje v číselníku
        const prefsKey = `ordersV3_preferences_${user_id}`;
        const savedPrefs = localStorage.getItem(prefsKey);
        if (savedPrefs) {
          try {
            const prefs = JSON.parse(savedPrefs);
            if (prefs.columnFilters && prefs.columnFilters.stav_objednavky) {
              const stavValue = prefs.columnFilters.stav_objednavky;
              
              // Kontrola 1: Je to český název? (mezera nebo diakritika)
              const isCzechName = typeof stavValue === 'string' && (/\s/.test(stavValue) || /[áčďéěíňóřšťúůýž]/i.test(stavValue));
              
              // Kontrola 2: Existuje v číselníku?
              const existsInCiselnik = sortedStates.some(state => state.kod_stavu === stavValue);
              
              if (isCzechName || !existsInCiselnik) {
                console.log('🧹 CLEANUP: Neplatný stav filtru:', stavValue, '- mažu z localStorage');
                delete prefs.columnFilters.stav_objednavky;
                localStorage.setItem(prefsKey, JSON.stringify(prefs));
                
                // ✅ Informuj state management (BEZ reloadu)
                if (typeof handleColumnFilterChange === 'function') {
                  handleColumnFilterChange('stav_objednavky', '');
                }
              }
            }
          } catch (e) {
            console.error('❌ Chyba při validaci filtrů:', e);
          }
        }
      } catch (error) {
        console.error('❌ Chyba při načítání číselníku stavů:', error);
      }
    };
    
    loadStates();
  }, [token, username, user_id]);

  // 🎯 Effect: Detekce dokončení inicializace - fade-in po načtení dat
  useEffect(() => {
    // Počkej až se načtou objednávky a statistiky
    if (!loading && orders.length >= 0 && stats.total >= 0) {
      // Krátké zpoždění pro plynulé zobrazení (300ms)
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loading, orders.length, stats.total]);

  // ✅ Převod filtrů pro find-page (shodně s backend mapováním v useOrdersV3)
  const getFindPageFilters = useCallback(() => {
    const filters = {
      ...(columnFilters || {})
    };

    if (globalFilter && globalFilter.trim()) {
      filters.fulltext_search = globalFilter.trim();
    }

    if (dashboardFilters?.filter_status) {
      const statusKey = dashboardFilters.filter_status;

      if (statusKey === 'moje_objednavky') {
        filters.moje_objednavky = true;
      } else if (statusKey === 'mimoradne_udalosti') {
        filters.mimoradne_udalosti = true;
      } else if (statusKey === 's_fakturou') {
        filters.s_fakturou = true;
      } else if (statusKey === 's_nezaplacenymi_fakturami') {
        filters.s_nezaplacenymi_fakturami = true;
      } else if (statusKey === 'se_zaplacenou_fakturou') {
        filters.se_zaplacenou_fakturou = true;
      } else if (statusKey === 's_prilohami') {
        filters.s_prilohami = true;
        // Vzájemně se vylučující filtr
        delete filters.bez_obj_priloh;
      } else if (statusKey === 'bez_obj_priloh') {
        filters.bez_obj_priloh = true;
        // Vzájemně se vylučující filtr
        delete filters.s_prilohami;
      } else if (statusKey === 's_komentari') {
        filters.s_komentari = true;
      } else if (statusKey === 's_mymi_komentari') {
        filters.s_mymi_komentari = true;
      } else {
        const dashboardStatusMap = {
          'nova': 'NOVA',
          'ke_schvaleni': 'KE_SCHVALENI',
          'schvalena': 'SCHVALENA',
          'zamitnuta': 'ZAMITNUTA',
          'rozpracovana': 'ROZPRACOVANA',
          'odeslana': 'ODESLANA',
          'potvrzena': 'POTVRZENA',
          'k_uverejneni': 'K_UVEREJNENI_DO_REGISTRU',
          'uverejnena': 'UVEREJNENA',
          'fakturace': 'FAKTURACE',
          'vecna_spravnost': 'VECNA_SPRAVNOST',
          'zkontrolovana': 'ZKONTROLOVANA',
          'dokoncena': 'DOKONCENA',
          'zrusena': 'ZRUSENA',
          'smazana': 'SMAZANA',
          // „ROZPRACOVANÉ“ = vše co už je po schválení a běží procesem
          // (včetně registru smluv)
          'rozpracovane_stavy': ['SCHVALENA', 'ROZPRACOVANA', 'ODESLANA', 'POTVRZENA', 'K_UVEREJNENI_DO_REGISTRU', 'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'CEKA_SE', 'NEUVEREJNIT'],
        };

        // 🎯 Speciální boolean filtry (fakturace_prodleni apod.)
        if (statusKey === 'fakturace_prodleni') {
          filters.fakturace_prodleni = true;
        } else {
          const mappedStatus = dashboardStatusMap[statusKey];
          if (mappedStatus) {
            filters.stav = Array.isArray(mappedStatus) ? mappedStatus : [mappedStatus];
          } else {
            filters.stav = [String(statusKey).toUpperCase()];
          }
        }
      }
    }

    return filters;
  }, [columnFilters, dashboardFilters, globalFilter]);

  // 🎯 Effect pro zpracování dashboard prokliku (dashboardFilter + clearFilters)
  // POZNÁMKA: dashboardFilter se nastavuje už v useOrdersV3State přes initialDashboardFilter,
  // zde řešíme hlavně čistění perzistentního state (fulltext a location.state).
  useEffect(() => {
    const dashboardFilter = location.state?.dashboardFilter;
    const shouldClearFilters = location.state?.clearFilters === true;

    if (!dashboardFilter && !shouldClearFilters) return;

    // Pokud přišel požadavek na čistý start z dashboardu,
    // smažeme fulltext (u status filtru je column/dashboard stav řešen už při initu).
    if (shouldClearFilters) {
      setGlobalFilter('');

      // Pro dlaždici "Celkem" nepřichází dashboardFilter,
      // proto explicitně vyčistíme i sloupcové/dashboard filtry.
      if (!dashboardFilter) {
        originalClearFilters();
      }
    }

    // Vyčistit state, aby se proklik neaplikoval opakovaně při refreshi
    const { dashboardFilter: _df, clearFilters: _cf, ...rest } = location.state || {};
    const newState = Object.keys(rest).length > 0 ? rest : null;
    navigate(`${location.pathname}${location.search || ''}`, { replace: true, state: newState });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Jen při prvním renderování

  // 🎯 Effect pro highlight a scroll na objednávku po návratu z editace
  useEffect(() => {
    const orderIdFromEdit = location.state?.highlightOrderId || location.state?.orderIdFromEdit;
    
    if (!orderIdFromEdit || isSearchingForOrder) return;

    // ✅ KRITICKÉ: location.state se NEMAŽE přes window.history.replaceState.
    // Musíme použít react-router navigate(..., { replace: true, state: ... }), jinak efekt poběží dokola.
    const clearHighlightState = () => {
      try {
        const currentState = location.state;
        if (!currentState) return;

        const { highlightOrderId, orderIdFromEdit: _orderIdFromEdit, ...rest } = currentState;
        const newState = Object.keys(rest || {}).length > 0 ? rest : null;

        navigate(`${location.pathname}${location.search || ''}`, {
          replace: true,
          state: newState
        });
      } catch (e) {
        // Fallback - neblokovat UX
      }
    };
    
    // Async funkce pro vyhledání a scroll na objednávku
    const findAndScrollToOrder = async () => {
      setIsSearchingForOrder(true);
      
      try {
        // Pokud už máme uložený pending cíl pro tenhle orderId, NEVOLEJ API znovu.
        // Jen čekej na načtení správné stránky a přítomnost objednávky v `orders`.
        if (pendingScrollToOrderRef.current?.orderId === orderIdFromEdit) {
          const pendingPage = pendingScrollToOrderRef.current?.page;

          // Čekáme až se přepne stránka
          if (pendingPage && pendingPage !== currentPage) {
            return;
          }

          // Jsme na cílové stránce → jakmile se objednávka objeví v orders, scrollni
          const orderOnCurrentPage = orders.find(order => order.id === orderIdFromEdit);
          if (orderOnCurrentPage) {
            performScrollAndHighlight(orderIdFromEdit);
            pendingScrollToOrderRef.current = null;
            clearHighlightState();
          }
          return;
        } else {
          // Nový orderId (nebo první průchod) → vyčistit pending
          pendingScrollToOrderRef.current = null;
        }

        // Nejprve zkontrolovat zda je objednávka již na aktuální stránce
        const orderOnCurrentPage = orders.find(order => order.id === orderIdFromEdit);
        
        if (orderOnCurrentPage) {
          // Objednávka JE na aktuální stránce - okamžitě highlight a scroll
          performScrollAndHighlight(orderIdFromEdit);
          clearHighlightState();
          return;
        }
        
        // Objednávka NENÍ na aktuální stránce - zavolat API pro nalezení stránky
        const result = await findOrderPageV3({
          token,
          username,
          order_id: orderIdFromEdit,
          per_page: itemsPerPage,
          period: selectedPeriod,
          filters: getFindPageFilters(),
          sorting: sorting
        });
        
        if (result.found && result.page) {
          console.log(`✅ Objednávka nalezena na stránce ${result.page}`);

          // Uložit pending cíl - zabrání opakovaným voláním find-page během přepínání stránky
          pendingScrollToOrderRef.current = { orderId: orderIdFromEdit, page: result.page };
          
          // Přepnout na správnou stránku
          if (result.page !== currentPage) {
            handlePageChange(result.page);
            // highlight a scroll se provede až po načtení nové stránky
            // (další průchod useEffect když se změní orders)
          } else {
            // Už jsme na správné stránce, ale orders ještě neobsahují tu objednávku
            // (může se stát při race condition) - scroll provedeme až po načtení
          }
        } else {
          // Objednávka nenalezena (nesplňuje filtry nebo jiný problém)
          showToast && showToast(
            result.message || `Objednávka #${orderIdFromEdit} nenalezena v aktuálních filtrech nebo období.`, 
            { type: 'info' }
          );
          pendingScrollToOrderRef.current = null;
          clearHighlightState();
        }
        
      } catch (error) {
        console.error('❌ Chyba při hledání objednávky:', error);
        showToast && showToast(
          `Chyba při hledání objednávky: ${error.message}`, 
          { type: 'error' }
        );
        pendingScrollToOrderRef.current = null;
        clearHighlightState();
      } finally {
        setIsSearchingForOrder(false);
      }
    };
    
    // Funkce pro provedení scroll a highlight
    const performScrollAndHighlight = (orderId) => {
      setHighlightOrderId(orderId);
      
      // Počkat na render a pak scrollovat
      setTimeout(() => {
        const rowElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (rowElement) {
          rowElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // console.log('✅ Scrolloval na objednávku #' + orderId);
        }
      }, 300);
      
      // Zrušit highlight po 3 sekundách
      setTimeout(() => {
        setHighlightOrderId(null);
      }, 3000);
    };
    
    // Spustit vyhledávání pouze pokud máme načtené orders
    if (orders.length > 0) {
      findAndScrollToOrder();
    }
    
  }, [location.state, orders, currentPage, token, username, itemsPerPage, selectedPeriod, columnFilters, dashboardFilters, globalFilter, sorting, showToast, handlePageChange, isSearchingForOrder, getFindPageFilters]);

  // ✅ VLASTNÍ handleClearFilters která také vymaže globalFilter 
  const handleClearFilters = useCallback(() => {
    originalClearFilters(); // Vymaže sloupcové filtry a dashboard filtry
    setGlobalFilter('');    // Vymaže fulltext search
  }, [originalClearFilters, setGlobalFilter]);

  // 🎯 Effect pro proklik z dashboardu "komentáře" - filtrovat dle čísla objednávky
  useEffect(() => {
    const cisloObj = location.state?.columnFilterCisloObj;
    if (!cisloObj) return;
    // Vyčistit filtry a nastavit filtr čísla objednávky
    originalClearFilters();
    setGlobalFilter('');
    handleColumnFilterChange('cislo_objednavky', cisloObj);
    // Vyčistit state
    const { columnFilterCisloObj: _c, clearFilters: _cf, ...rest } = location.state || {};
    navigate(`${location.pathname}${location.search || ''}`, { replace: true, state: Object.keys(rest).length > 0 ? rest : null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper pro detekci jakýchkoliv aktivních filtrů (column filters nebo dashboard filter)
  const hasAnyActiveFilters = useMemo(() => {
    const isActiveFilterValue = (v) => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'string') return v.trim().length > 0;
      if (typeof v === 'boolean') return v === true;
      if (typeof v === 'number') return Number.isFinite(v); // 0 je validní hodnota
      if (typeof v === 'object') {
        // rekurzivně projdi vnořené struktury (kdyby přibyly)
        return Object.values(v).some(isActiveFilterValue);
      }
      return false;
    };

    // Dashboard filtry
    if (isActiveFilterValue(dashboardFilters?.filter_status)) return true;
    if (isActiveFilterValue(dashboardFilters?.filter_my_orders)) return true;
    if (isActiveFilterValue(dashboardFilters?.filter_archivovano)) return true;

    // Fulltext
    if (isActiveFilterValue(globalFilter)) return true;

    // Sloupcové filtry (včetně stringových – např. stav_objednavky)
    const cf = columnFilters || {};
    return Object.values(cf).some(isActiveFilterValue);
  }, [columnFilters, dashboardFilters, globalFilter]);

  // ✅ OPTIMALIZACE: localStorage efekty nahrazeny debounced save v useOrdersV3State
  
  // Pouze globalFilter zůstává samostatný
  useEffect(() => {
    if (user_id) {
      localStorage.setItem(`ordersV3_globalFilter_${user_id}`, globalFilter);
    }
  }, [globalFilter, user_id]);

  // Handler pro uložení konfigurace sloupců
  const handleSaveColumnConfig = async () => {
    try {
      // Uložit do localStorage (per user)
      if (user_id) {
        localStorage.setItem(`ordersV3_columnVisibility_${user_id}`, JSON.stringify(columnVisibility));
        localStorage.setItem(`ordersV3_columnOrder_${user_id}`, JSON.stringify(columnOrder));
        localStorage.setItem(`ordersV3_columnSizing_${user_id}`, JSON.stringify(columnSizing));
      }
      
      // ✅ Uložení do backend user profilu
      try {
        const { saveUserSettings, loadSettingsFromLocalStorage } = await import('../services/userSettingsApi');
        
        // Načíst aktuální nastavení
        const currentSettings = loadSettingsFromLocalStorage(user_id) || {};
        
        // Přidat/aktualizovat Orders V3 preferences
        const updatedSettings = {
          ...currentSettings,
          ordersV3Preferences: {
            columnVisibility,
            columnOrder,
            columnSizing,
            showDashboard,
            showFilters,
            dashboardMode,
            showRowColoring,
            itemsPerPage,
            selectedPeriod,
            updatedAt: new Date().toISOString()
          }
        };
        
        // Uložit do backend
        await saveUserSettings({
          token,
          username,
          userId: user_id,
          nastaveni: updatedSettings
        });
        
        showToast?.('✅ Konfigurace sloupců uložena do vašeho profilu', { type: 'success' });
      } catch (backendError) {
        console.warn('⚠️ Backend save failed, but localStorage saved:', backendError);
        showToast?.('⚠️ Konfigurace uložena lokálně (backend nedostupný)', { type: 'warning' });
      }
      
    } catch (err) {
      console.error('❌ Error saving column config:', err);
      showToast?.('❌ Chyba při ukládání konfigurace', { type: 'error' });
    }
  };

  // Handler pro reset šířek sloupců
  const handleResetColumnWidths = () => {
    if (user_id) {
      localStorage.removeItem(`ordersV3_columnSizing_${user_id}`);
    }
    window.location.reload(); // Reload pro aplikaci změn
  };
  
  const handleRefreshOrders = useCallback(() => {
    clearCache?.();
    // ✅ Manuální refresh musí vzít aktuální fulltext hned (nečekat na debounce)
    loadOrders(globalFilter, { forceRefresh: true });
    showToast?.('🔄 Objednávky se načítají z databáze...', { type: 'info' });
  }, [clearCache, loadOrders, showToast, globalFilter]);

  // ✅ BT AUTO-REFRESH: registrace callbacku pro background task (každých 5 min)
  // - volá V3 endpointy přes `loadOrders`
  // - probíhá tiše (silent)
  // - nastaví čas posledního auto-refreshu pro zobrazení v headeru
  useEffect(() => {
    if (!bgTasksContext?.registerOrdersV3RefreshCallback) {
      return;
    }

    const btRefreshCallback = async () => {
      try {
        const gf = globalFilterRef.current;
        const result = await loadOrders(gf, { forceRefresh: false, silent: true });
        if (result?.status === 'success') {
          setLastBtAutoRefreshTime(new Date());
        }
        return result;
      } catch (_) {
        // Tiché selhání - background refresh nesmí rušit UI
        return undefined;
      }
    };

    bgTasksContext.registerOrdersV3RefreshCallback(btRefreshCallback);

    return () => {
      if (bgTasksContext.unregisterOrdersV3RefreshCallback) {
        bgTasksContext.unregisterOrdersV3RefreshCallback();
      } else {
        // Backward compat fallback
        bgTasksContext.registerOrdersV3RefreshCallback?.(null);
      }
    };
  }, [bgTasksContext, loadOrders]);

  // 🆕 Handler pro export aktuálně zobrazených dat (Orders V3)
  const handleExportList = useCallback(() => {
    try {
      if (!Array.isArray(orders) || orders.length === 0) {
        showToast?.('Není co exportovat', { type: 'warning' });
        return;
      }

      const visibleColumns = Array.isArray(columnOrder)
        ? columnOrder.filter((col) => columnVisibility?.[col])
        : Object.keys(columnVisibility || {}).filter((col) => columnVisibility?.[col]);

      const columnsToExport = visibleColumns.length > 0
        ? visibleColumns
        : ['cislo_objednavky', 'dt_objednavky', 'dodavatel_nazev', 'stav_objednavky', 'max_cena_s_dph'];

      const toText = (value) => {
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.map((v) => toText(v)).join(' | ');
        if (typeof value === 'object') {
          if (value.nazev_stavu) return value.nazev_stavu;
          if (value.nazev) return value.nazev;
          if (value.kod_stavu) return value.kod_stavu;
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }
        return String(value);
      };

      const rows = orders.map((order) => {
        const row = {};
        columnsToExport.forEach((col) => {
          const label = COLUMN_LABELS[col] || col;
          row[label] = toText(order?.[col]);
        });
        return row;
      });

      exportCsv(rows, 'objednavky_v3', { separator: ';', includeBOM: true });
      showToast?.('✅ Export byl vygenerován', { type: 'success' });
    } catch (error) {
      console.error('❌ Chyba při exportu objednávek V3:', error);
      showToast?.('❌ Export se nepodařilo dokončit', { type: 'error' });
    }
  }, [orders, columnOrder, columnVisibility, showToast]);

  // 🆕 Handler pro vytvoření nové objednávky (s kontrolou rozpracovaného draftu)
  const handleCreateNewOrder = useCallback(async () => {
    try {
      draftManager.setCurrentUser(user_id);
      const hasDraft = await draftManager.hasDraft();

      if (!hasDraft) {
        navigate('/order-form-25');
        return;
      }

      const draftData = await draftManager.loadDraft();
      const hasNewConcept = isValidConcept(draftData);
      const hasDbChanges = hasDraftChanges(draftData);

      if (hasNewConcept || hasDbChanges) {
        setShowNewOrderConfirmDialog(true);
        return;
      }

      navigate('/order-form-25');
    } catch (error) {
      console.warn('⚠️ [Orders25ListV3] Kontrola draftu selhala, pokračuji na nový formulář:', error);
      navigate('/order-form-25');
    }
  }, [user_id, navigate]);

  // 🆕 Potvrzení: smazat draft a otevřít nový formulář
  const handleConfirmCreateNewOrder = useCallback(async () => {
    try {
      draftManager.setCurrentUser(user_id);
      await draftManager.deleteDraft();
    } catch (error) {
      console.warn('⚠️ [Orders25ListV3] Nepodařilo se smazat draft:', error);
    }

    localStorage.removeItem(`activeOrderEditId_${user_id}`);
    setShowNewOrderConfirmDialog(false);

    if (window.location.pathname === '/order-form-25') {
      window.location.href = '/order-form-25';
      return;
    }

    navigate('/order-form-25');
  }, [user_id, navigate]);

  // 🔓 Handler pro force unlock (pouze admin)
  const handleForceUnlock = useCallback(async () => {
    if (!lockedOrderInfo) return;

    try {
      // Import lockOrderV2 s force parametrem
      const { lockOrderV2 } = await import('../services/apiOrderV2');
      
      // Zavolej lock s force=true (admin může převzít zámek)
      await lockOrderV2({ 
        orderId: lockedOrderInfo.orderId, 
        token, 
        username, 
        force: true 
      });
      
      showToast('Objednávka byla převzata a odemčena', { type: 'success' });
      
      // Zavři dialog
      setShowLockedOrderDialog(false);
      setLockedOrderInfo(null);
      
      // Naviguj na formulář
      navigate(`/order-form-25?edit=${lockedOrderInfo.orderId}`, { 
        state: { 
          returnTo: '/orders25-list-v3',
          highlightOrderId: lockedOrderInfo.orderId
        } 
      });
      
    } catch (error) {
      console.error('❌ Chyba při force unlock:', error);
      showToast('Chyba při převzetí objednávky', { type: 'error' });
    }
  }, [lockedOrderInfo, token, username, navigate, showToast]);

  // Handler pro editaci objednávky
  const handleEditOrder = async (order) => {
    // 🔒 KONTROLA OPRÁVNĚNÍ
    // Pokud uživatel nemá editační práva (např. vidí objednávku přes zastupování),
    // otevřeme formulář v režimu náhledu (viewOnly) - bez zamčení, Save neaktivní
    if (!canEdit(order)) {
      navigate(`/order-form-25?edit=${order.id}&viewOnly=1`, { 
        state: { 
          returnTo: '/orders25-list-v3',
          highlightOrderId: order.id
        } 
      });
      return;
    }

    // 🔒 KONTROLA ZAMČENÍ - PŘED NAČÍTÁNÍM DAT!
    const orderIdToCheck = order.id || order.objednavka_id;

    try {
      // ✅ V2 API - načti aktuální data z DB pro kontrolu lock_info
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

      // 🔒 Kontrola zamčení jiným uživatelem
      if (dbOrder.lock_info?.locked === true && !dbOrder.lock_info?.is_owned_by_me && !dbOrder.lock_info?.is_expired) {
        const lockInfo = dbOrder.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
        
        // Zobraz dialog s informacemi o zamčení
        setLockedOrderInfo({
          orderId: orderIdToCheck,
          orderNumber: order.cislo_objednavky || order.evidencni_cislo || `#${orderIdToCheck}`,
          lockedByUserName: lockedByUserName,
          lockedByUserEmail: lockInfo.locked_by_user_email || null,
          lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
          lockAgeMinutes: lockInfo.lock_age_minutes ? Math.round(lockInfo.lock_age_minutes) : null,
          lockedAt: lockInfo.locked_at || null
        });
        setShowLockedOrderDialog(true);
        return;
      }

      // 🔒 DŮLEŽITÉ: Pro V3 list provést reálné zamčení před navigací.
      // Důvod: OrderForm25 umí načíst existující draft a vrátit se dřív, než zavolá lock.
      // Tím pádem by se v DB nepropsal zámek (dt_zamek/zamek_uzivatel_id) i když je uživatel v editaci.
      if (dbOrder.lock_info?.is_owned_by_me !== true) {
        try {
          const { lockOrderV2 } = await import('../services/apiOrderV2');
          await lockOrderV2({ orderId: orderIdToCheck, token, username });
        } catch (lockError) {
          // Pokud lock endpoint vrátí lock_info, je zamčeno jiným uživatelem (race condition)
          if (lockError?.lock_info) {
            const lockInfo = lockError.lock_info;
            const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

            setLockedOrderInfo({
              orderId: orderIdToCheck,
              orderNumber: order.cislo_objednavky || order.evidencni_cislo || `#${orderIdToCheck}`,
              lockedByUserName: lockedByUserName,
              lockedByUserEmail: lockInfo.locked_by_user_email || null,
              lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
              lockAgeMinutes: lockInfo.lock_age_minutes ? Math.round(lockInfo.lock_age_minutes) : null,
              lockedAt: lockInfo.locked_at || null
            });
            setShowLockedOrderDialog(true);
            return;
          }

          console.warn('⚠️ [Orders25ListV3] Nepodařilo se zamknout objednávku před navigací:', lockError);
        }
      }

      // 🎯 KONTROLA DRAFTU - PŘED NAVIGACÍ!
      // Zkontroluj, jestli existuje validní koncept (pro rozhodnutí o confirm dialogu)
      draftManager.setCurrentUser(user_id);
      const hasDraft = await draftManager.hasDraft();

      let shouldShowConfirmDialog = false;
      let draftDataToStore = null;
      let isDraftForThisOrder = false;

      if (hasDraft) {
        try {
          const draftData = await draftManager.loadDraft();

          // 🎯 KONTROLA OWNERSHIP: Patří draft k TÉTO objednávce?
          const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
          const currentOrderId = order.id;

          // ✅ Pokud draft patří k TÉTO objednávce, NEPTAT SE!
          if (draftOrderId && currentOrderId && String(draftOrderId) === String(currentOrderId)) {
            shouldShowConfirmDialog = false; // Draft patří k této objednávce - použij ho tiše
            isDraftForThisOrder = true;
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
          console.warn('⚠️ Chyba při kontrole draftu:', error);
          shouldShowConfirmDialog = false;
        }
      }

      // 🎯 OPTIMALIZACE: Pokud draft patří k TÉTO objednávce, rovnou naviguj bez reload
      if (isDraftForThisOrder) {
        navigate(`/order-form-25?edit=${order.id}`, { 
          state: { 
            returnTo: '/orders25-list-v3',
            highlightOrderId: order.id
          } 
        });
        return;
      }

      // Pokud existuje draft JINÉ objednávky, zobraz confirm dialog
      if (shouldShowConfirmDialog) {
        setCurrentDraftData(draftDataToStore);
        setOrderToEdit(order);
        setShowEditConfirmModal(true);
        return;
      }

      // ✅ Objednávka je dostupná - naviguj na formulář
      navigate(`/order-form-25?edit=${order.id}`, { 
        state: { 
          returnTo: '/orders25-list-v3',
          highlightOrderId: order.id // 🎯 Pro scroll a highlight po návratu
        } 
      });
      
    } catch (error) {
      console.error('❌ Chyba při kontrole dostupnosti objednávky:', error);
      showToast('Chyba při kontrole dostupnosti objednávky', { type: 'error' });
    }
  };

  // 🎯 Handler pro POTVRZENÍ editace (z confirm dialogu)
  const handleEditConfirm = () => {
    setShowEditConfirmModal(false);
    
    // Smaž existující draft - uživatel potvrdil, že chce opustit rozdělanou objednávku
    try {
      draftManager.setCurrentUser(user_id);
      draftManager.deleteDraft();
    } catch (error) {
      console.warn('⚠️ Chyba při mazání draftu:', error);
    }

    // Naviguj na formulář
    if (orderToEdit) {
      navigate(`/order-form-25?edit=${orderToEdit.id}`, { 
        state: { 
          returnTo: '/orders25-list-v3',
          highlightOrderId: orderToEdit.id
        } 
      });
    }
    
    // Reset state
    setOrderToEdit(null);
    setCurrentDraftData(null);
  };

  // 🎯 Handler pro ZRUŠENÍ editace (z confirm dialogu)
  const handleEditCancel = () => {
    setShowEditConfirmModal(false);
    setOrderToEdit(null);
    setCurrentDraftData(null);
  };

  // Handler pro evidování faktury
  const handleCreateInvoice = async (order) => {
    // ✅ Kontrola zda je objednávka ve správném stavu a má práva
    if (!canCreateInvoice(order)) {
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

    try {
      // 🔒 Kontrola zamčení před navigací na formulář faktur
      // ✅ V2 API - načti aktuální data z DB pro kontrolu lock_info
      const dbOrder = await getOrderV2(order.id, token, username, true);

      if (!dbOrder) {
        showToast('Nepodařilo se načíst objednávku z databáze', { type: 'error' });
        return;
      }

      // 🔒 Kontrola zamčení jiným uživatelem
      if (dbOrder.lock_info?.locked === true && !dbOrder.lock_info?.is_owned_by_me && !dbOrder.lock_info?.is_expired) {
        const lockInfo = dbOrder.lock_info;
        const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;
        
        // Zobraz dialog s informacemi o zamčení
        setLockedOrderInfo({
          orderId: order.id,
          orderNumber: order.cislo_objednavky || order.evidencni_cislo || `#${order.id}`,
          lockedByUserName: lockedByUserName,
          lockedByUserEmail: lockInfo.locked_by_user_email || null,
          lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
          lockAgeMinutes: lockInfo.lock_age_minutes ? Math.round(lockInfo.lock_age_minutes) : null,
          lockedAt: lockInfo.locked_at || null
        });
        setShowLockedOrderDialog(true);
        return;
      }
    
      // 🎯 Získat číslo objednávky pro prefill vašeptávači
      const orderNumber = order.cislo_objednavky || order.evidencni_cislo || `#${order.id}`;
      
      // 🔍 Pokud má objednávka faktury, zobraz popup se seznamem
      const invoiceCount = order.pocet_faktur || 0;
      
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
      
    } catch (error) {
      console.error('❌ Chyba při kontrole dostupnosti objednávky:', error);
      showToast('Chyba při kontrole dostupnosti objednávky', { type: 'error' });
    }
  };

  // Handlery pro popup se seznamem faktur objednávky
  const handleCloseInvoicePopup = useCallback(() => {
    setInvoicePopupVisible(false);
    setInvoicePopupOrder(null);
    setInvoicePopupInvoices([]);
  }, []);

  const handleEditInvoiceFromPopup = useCallback((invoice) => {
    setInvoicePopupVisible(false);
    navigate('/invoice-evidence', {
      state: {
        editInvoiceId: invoice.id,
        orderIdForLoad: invoicePopupOrder?.id
      }
    });
  }, [navigate, invoicePopupOrder]);

  const handleAddInvoiceFromPopup = useCallback(() => {
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

  // Handler pro export DOCX
  const handleExportOrder = async (order) => {
    try {
      // 🔄 Načíst enriched data z BE (V3 API nevrací enriched uživatele)
      showProgress?.();
      
      const enrichedOrder = await getOrderV2(order.id, token, username, true);
      
      if (!enrichedOrder) {
        throw new Error('Nepodařilo se načíst detaily objednávky');
      }
      
      hideProgress?.();
      
      // ✅ Předej enriched data do dialogu
      setDocxModalOrder(enrichedOrder);
      setDocxModalOpen(true);

    } catch (error) {
      console.error('❌ [Orders25ListV3] Chyba při otevírání DOCX dialogu:', error);
      hideProgress?.();
      showToast?.(`Chyba při otevírání DOCX generátoru: ${error.message}`, { type: 'error' });
    }
  };

  // Handler pro zavření DOCX modalu
  const handleDocxModalClose = () => {
    setDocxModalOpen(false);
    setDocxModalOrder(null);
  };

  // Handler pro akce v tabulce
  const handleActionClick = (action, order) => {
    switch (action) {
      case 'edit':
        handleEditOrder(order);
        break;
      case 'create-invoice':
        handleCreateInvoice(order);
        break;
      case 'export':
        handleExportOrder(order);
        break;
      case 'delete':
        handleDeleteOrder(order);
        break;
      case 'refresh':
        // Refresh dat po schválení/zamítnutí objednávky
        loadOrders(globalFilter, { forceRefresh: true });
        break;
      default:
        console.warn('Neznámá akce:', action);
    }
  };

  // Handler pro smazání objednávky – otevře custom dialog
  const handleDeleteOrder = useCallback((order) => {
    if (!canDelete(order)) {
      showToast && showToast('Nemáte oprávnění ke smazání této objednávky.', { type: 'error' });
      return;
    }

    // Neaktivní objednávka + admin = možnost obnovy nebo hard delete
    if (order.aktivni === 0 && isAdmin) {
      setDeleteType('restore');
    } else {
      setDeleteType('soft');
    }

    setOrderToDelete(order);
    setShowDeleteConfirmModal(true);
  }, [canDelete, isAdmin, showToast]);

  // Potvrzení mazání
  const handleDeleteConfirm = useCallback(async (type) => {
    if (!orderToDelete) return;
    
    const orderName = orderToDelete?.cislo_objednavky || orderToDelete?.predmet || `ID ${orderToDelete?.id}`;
    
    try {
      if (type === 'restore') {
        // V2 API – soft delete na neaktivní = obnova není v API, použijeme 'restore' endpoint pokud existuje
        // Fallback: jen oznámíme a zavřeme
        showToast && showToast('Funkce obnovení není v tomto rozhraní momentálně dostupná. Kontaktujte administrátora.', { type: 'warning' });
        setShowDeleteConfirmModal(false);
        setOrderToDelete(null);
        return;
      }

      // 🛠️ Toast "Mazání..." okamžitě
      showToast && showToast(`🗑️ Mazání objednávky ${orderName}...`, { type: 'info' });
      
      // Zavřít dialog okamžitě (animace)
      setShowDeleteConfirmModal(false);
      setOrderToDelete(null);

      // API volání
      const snapshot = orderToDelete;

      if (type === 'hard') {
        await deleteOrderV2(snapshot.id, token, username, true);
        showToast && showToast(`✅ Objednávka ${orderName} byla úplně smazána včetně všech příloh.`, { type: 'success' });
      } else {
        await deleteOrderV2(snapshot.id, token, username);
        showToast && showToast(`✅ Objednávka ${orderName} byla označena jako neaktivní.`, { type: 'success' });
      }
      
      // 🔄 Refresh dat na pozadí (vymáže cache a načte aktuální data)
      if (clearCache) clearCache();
      if (loadOrders) {
        // Silent refresh (bez toast "Načítání...") - uživatel viděl success toast
        await loadOrders(globalFilter, { forceRefresh: true, silent: true });
      }
      
    } catch (err) {
      showToast && showToast(`❌ Chyba při mazání objednávky ${orderName}: ${err.message}`, { type: 'error' });
      // Nemusíme rollback - data se refreshnou při příštím load
    }
  }, [orderToDelete, token, username, showToast, clearCache, loadOrders, globalFilter]);

  // Zrušení mazání
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirmModal(false);
    setOrderToDelete(null);
  }, []);

  // Handler pro rozbalení řádku
  const handleRowExpand = useCallback((orderOrId) => {
    const orderId = typeof orderOrId === 'object' && orderOrId !== null
      ? orderOrId.id
      : orderOrId;

    if (!orderId) return;
    handleToggleRow(orderId);
  }, [handleToggleRow]);

  const handleHighlightOrder = useCallback((orderId, action) => {
    setHighlightOrderId(orderId);
    setHighlightAction(action); // approve/reject/postpone
    // Highlight zůstane dokud uživatel sám nerefreshne stránku
  }, []);

  // 🆕 CONTEXT MENU HANDLERS
  
  // Handler pro otevření kontextového menu
  const handleContextMenu = useCallback((e, order, cellData = null) => {
    e.preventDefault(); // Zabraň výchozímu kontextovému menu

    const selection = window.getSelection?.();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      try {
        lastSelectionRangeRef.current = selection.getRangeAt(0).cloneRange();
      } catch {
        lastSelectionRangeRef.current = null;
      }
    }

    const selectedText = window.getSelection?.().toString().trim()
      || lastSelectedTextRef.current
      || '';

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
      selectedData: selectedData,
      selectedText: selectedText
    });

    if (lastSelectionRangeRef.current) {
      const restoreSelection = () => {
        const currentSelection = window.getSelection?.();
        if (!currentSelection) return;
        try {
          currentSelection.removeAllRanges();
          currentSelection.addRange(lastSelectionRangeRef.current);
        } catch {
          // Ignore failures when range is no longer valid.
        }
      };

      window.requestAnimationFrame(restoreSelection);
    }
  }, []);

  // Handler pro event delegation (klik na tabulku)
  const handleTableContextMenu = useCallback((e) => {
    const row = e.target.closest('tr[data-order-index]');
    if (!row) return;

    const orderIndex = parseInt(row.dataset.orderIndex, 10);
    const order = orders[orderIndex]; // V3 používá přímo orders array (backend pagination)
    if (!order) return;

    handleContextMenu(e, order);
  }, [orders, handleContextMenu]);

  // Handler pro zavření kontextového menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Context menu actions
  const handleAddToTodo = useCallback((order) => {
    // TODO: Implementovat přidání do TODO
    showToast?.(`Přidáno do TODO: ${order.cislo_objednavky}`, { type: 'info' });
  }, [showToast]);

  const handleAddAlarm = useCallback((order) => {
    // TODO: Implementovat přidání alarmu
    showToast?.(`Přidán alarm pro: ${order.cislo_objednavky}`, { type: 'info' });
  }, [showToast]);

  const handleContextMenuEdit = useCallback((order) => {
    handleCloseContextMenu();
    handleEditOrder(order);
  }, [handleCloseContextMenu, handleEditOrder]);

  const handleContextMenuDelete = useCallback((order) => {
    handleCloseContextMenu();
    handleDeleteOrder(order);
  }, [handleCloseContextMenu, handleDeleteOrder]);

  const handleGenerateDocx = useCallback((order) => {
    handleCloseContextMenu();
    handleExportOrder(order);
  }, [handleCloseContextMenu, handleExportOrder]);

  const handleGenerateFinancialControl = useCallback(async (order) => {
    handleCloseContextMenu();
    try {
      showProgress?.('Načítání dat pro finanční kontrolu...');
      
      // Načti enriched data pro finanční kontrolu
      const enrichedOrder = await getOrderV2(order.id, { token, username });
      
      hideProgress?.();
      
      // TODO: Otevřít modal pro finanční kontrolu
      showToast?.(`Finanční kontrola pro: ${order.cislo_objednavky}`, { type: 'success' });
      console.log('💰 Finanční kontrola:', enrichedOrder);
    } catch (error) {
      hideProgress?.();
      showToast?.(`Chyba při načítání dat: ${error.message}`, { type: 'error' });
    }
  }, [handleCloseContextMenu, token, username, showProgress, hideProgress, showToast]);

  const handleApproveFromContextMenu = useCallback(async (order) => {
    handleCloseContextMenu();
    // 🔁 Otevři stejný dialog jako přes ikonu v tabulce (řeší OrdersTableV3 interně)
    try {
      window.dispatchEvent(new CustomEvent('ordersV3:openApprovalDialog', {
        detail: {
          orderId: order?.id,
          source: 'context-menu'
        }
      }));
    } catch (error) {
      showToast?.(`Chyba při otevření schvalování: ${error?.message || 'Neznámá chyba'}`, { type: 'error' });
    }
  }, [handleCloseContextMenu, showToast]);

  // 🆕 V3: Handler pro přidání komentáře z context menu
  const handleContextMenuAddComment = useCallback((order) => {
    handleCloseContextMenu();
    // Stejná logika jako klik na ikonu komentáře v tabulce
    // TODO: Otevřít CommentsTooltip - zatím jen toast
    showToast?.(`Komentáře pro objednávku: ${order.cislo_objednavky}`, { type: 'info' });
  }, [handleCloseContextMenu, showToast]);

  // 🆕 V3: Handler pro kontrolu OBJ z context menu
  const handleContextMenuToggleCheck = useCallback(async (order) => {
    handleCloseContextMenu();
    try {
      const currentChecked = order?.kontrola?.zkontrolovano || false;
      await handleToggleOrderCheck(order.id, !currentChecked);
      showToast?.(
        currentChecked 
          ? `Kontrola zrušena pro: ${order.cislo_objednavky}` 
          : `Objednávka označena jako zkontrolovaná: ${order.cislo_objednavky}`,
        { type: 'success' }
      );
    } catch (error) {
      showToast?.(`Chyba při změně kontroly: ${error.message}`, { type: 'error' });
    }
  }, [handleCloseContextMenu, handleToggleOrderCheck, showToast]);

  // 🆕 V3: Permissions pro kontextové menu
  
  // canAddComment - kontrola zda je uživatel účastník objednávky (12 rolí) nebo admin
  const isUserInOrderRole = useCallback((order) => {
    if (!order || !currentUserId || isNaN(currentUserId)) return false;

    const participantRoles = [
      order.uzivatel_id,                        // 1. Autor
      order.objednatel_id,                      // 2. Objednatel
      order.garant_uzivatel_id || order.garant_id, // 3. Garant (compatibility s oběma formáty)
      order.schvalovatel_id,                    // 4. Schvalovatel
      order.prikazce_id,                        // 5. Příkazce
      order.uzivatel_akt_id,                    // 6. Aktualizoval
      order.odesilatel_id,                      // 7. Odesilatel
      order.dodavatel_potvrdil_id,              // 8. Potvrdil dodavatel
      order.zverejnil_id,                       // 9. Zveřejnil
      order.fakturant_id,                       // 10. Fakturant
      order.dokoncil_id,                        // 11. Dokončil
      order.potvrdil_vecnou_spravnost_id,       // 12. Potvrdil věcnou správnost
    ];

    return participantRoles.some(roleId =>
      roleId !== null && roleId !== undefined && String(roleId) === String(currentUserId)
    );
  }, [currentUserId]);

  const canAddComment = useCallback((order) => {
    if (!order || !currentUserId || isNaN(currentUserId)) return false;
    
    // Admin role
    const isAdmin = hasPermission('SUPERADMIN') || 
                    hasPermission('ADMINISTRATOR') || 
                    hasPermission('ORDER_MANAGE');
    
    if (isAdmin) return true;
    
    // 12 rolí účastníků objednávky
    // ⚠️ POZOR: Backend API vrací některá pole s jiným názvem!
    // - garant_uzivatel_id (DB) → garant_id (API)
    return isUserInOrderRole(order);
  }, [currentUserId, hasPermission, isUserInOrderRole]);

  const canCancelOrder = useCallback((order) => {
    if (!order || !currentUserId || isNaN(currentUserId) || !hasPermission) return false;

    const isBudgetManagerRole = userDetail?.roles?.some(role => role.kod_role === 'SPRAVCE_ROZPOCTU');

    // ✅ Zjisti workflow stav objednávky
    let lastState = '';
    try {
      let workflowStates = [];
      if (Array.isArray(order.stav_workflow_kod)) {
        workflowStates = order.stav_workflow_kod;
      } else if (typeof order.stav_workflow_kod === 'string') {
        workflowStates = JSON.parse(order.stav_workflow_kod);
      }
      
      if (workflowStates.length > 0) {
        const last = workflowStates[workflowStates.length - 1];
        lastState = (typeof last === 'string' 
          ? last 
          : (last.kod_stavu || last.nazev_stavu || '')
        ).toUpperCase().trim();
      }
    } catch (e) {
      lastState = '';
    }

    // ⚠️ SPECIÁLNÍ PRAVIDLO: Pro stav ODESLANA_KE_SCHVALENI
    // Příkazce a admini NEMOHOU stornovat - mají ikonu schválení/zamítnutí
    if (lastState === 'ODESLANA_KE_SCHVALENI') {
      const isPrikazce = String(order.prikazce_id) === String(currentUserId);
      const isSubstituteForPrikazce = substitutedApproverIdSet.has(String(order.prikazce_id));
      const isAdmin = hasPermission('SUPERADMIN') || 
                      hasPermission('ADMINISTRATOR') || 
                      hasPermission('ORDER_MANAGE');
      
      if (isPrikazce || isSubstituteForPrikazce || isAdmin || isBudgetManagerRole) {
        return false; // Příkazce/admin nemůže stornovat - má zamítnout místo toho
      }
    }

    // ✅ Standardní oprávnění pro storno
    if (hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_MANAGE') || hasPermission('ORDER_EDIT_SUBORDINATE')) {
      return true;
    }

    if (hasPermission('ORDER_EDIT_OWN')) {
      return isUserInOrderRole(order);
    }

    return false;
  }, [currentUserId, hasPermission, isUserInOrderRole, userDetail?.roles, substitutedApproverIdSet]);

  // canToggleCheck - pouze SUPERADMIN, ADMINISTRATOR, KONTROLOR_OBJEDNAVEK
  const canToggleCheck = useCallback(() => {
    return hasPermission('SUPERADMIN') || 
           hasPermission('ADMINISTRATOR') || 
           hasPermission('KONTROLOR_OBJEDNAVEK');
  }, [hasPermission]);

  // canApprove - příkazce nebo admin + workflow stav + KONTROLA ÚSEKU
  const canApprove = useCallback((order) => {
    if (!order) return false;
    
    const isPrikazce = String(order.prikazce_id) === String(currentUserId);
    const isSubstituteForPrikazce = substitutedApproverIdSet.has(String(order.prikazce_id));
    const isBudgetManagerRole = userDetail?.roles?.some(role => role.kod_role === 'SPRAVCE_ROZPOCTU');
    const isAdminRole = hasAdminRole && hasAdminRole();
    
    // Zkontroluj workflow stav
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
    
    // 🎯 ADMINI mohou vždy schvalovat (pokud je správný stav)
    if (isAdminRole) {
      return isAllowedState;
    }
    
    // 🔒 OPRÁVNĚNÍ KE SCHVALOVÁNÍ (konzistentní s OrdersTableV3 a OrderForm25):
    // - Pouze přímý příkazce objednávky
    // - Správce rozpočtu
    // ❌ ODSTRANENO: Kontrola příkazce ze stejného úseku (nekonzistentní s OrdersTableV3)
    //    Příkazce může schvalovat POUZE svoje objednávky (kde je přímým příkazcem)
    if (isBudgetManagerRole || isPrikazce || isSubstituteForPrikazce) {
      return (isPrikazce || isSubstituteForPrikazce) && isAllowedState;
    }
    
    return false;
  }, [currentUserId, hasAdminRole, userDetail, substitutedApproverIdSet]);

  const isApprovalViaSubstitution = useCallback((order) => {
    if (!order) return false;
    const prikazceId = String(order.prikazce_id || '');
    if (!prikazceId) return false;

    return (
      substitutedApproverIdSet.has(prikazceId) &&
      prikazceId !== String(currentUserId)
    );
  }, [substitutedApproverIdSet, currentUserId]);

  return (
    <>
      {/* Initialization Overlay - zobrazí se při prvním načtení */}
      <InitializationOverlay $visible={!isInitialized}>
        <InitializationSpinner $visible={!isInitialized} />
        <InitializationMessage $visible={!isInitialized}>
          Inicializace přehledu objednávek
        </InitializationMessage>
        <InitializationSubtext $visible={!isInitialized}>
          Načítám objednávky a statistiky z databáze...
        </InitializationSubtext>
      </InitializationOverlay>
      
      {/* Main Content - fade-in po inicializaci */}
      <Container $isInitialized={isInitialized}>
      {/* Header */}
      <Header>
        <TitleSection>
          <Title>
            Objednávky (V3)
            <FontAwesomeIcon icon={faRocket} style={{ color: 'white' }} />
          </Title>
        </TitleSection>

        <HeaderActions>
          {/* Výběr období */}
          <PeriodWrapper>
            <PeriodLabel>
              <FontAwesomeIcon icon={faCalendarAlt} />
              Období:
            </PeriodLabel>
            <PeriodDropdownContainer>
              <PeriodSelectorButton
                onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                disabled={loading}
              >
                <span>{getPeriodLabel(selectedPeriod)}</span>
                <FontAwesomeIcon 
                  icon={isPeriodDropdownOpen ? faChevronDown : faChevronDown}
                  style={{ transform: isPeriodDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                />
              </PeriodSelectorButton>
              {isPeriodDropdownOpen && (
                <PeriodMenu>
                  <PeriodMenuItem onClick={() => { setSelectedPeriod('current-year'); setIsPeriodDropdownOpen(false); }}>
                    Aktuální rok
                  </PeriodMenuItem>
                  <PeriodMenuItem onClick={() => { setSelectedPeriod('current-month'); setIsPeriodDropdownOpen(false); }}>
                    Aktuální měsíc
                  </PeriodMenuItem>
                  <PeriodMenuItem onClick={() => { setSelectedPeriod('last-month'); setIsPeriodDropdownOpen(false); }}>
                    Poslední měsíc
                  </PeriodMenuItem>
                  <PeriodMenuItem onClick={() => { setSelectedPeriod('last-quarter'); setIsPeriodDropdownOpen(false); }}>
                    Poslední kvartál
                  </PeriodMenuItem>
                  <PeriodMenuItem onClick={() => { setSelectedPeriod('all'); setIsPeriodDropdownOpen(false); }}>
                    Vše (bez omezení)
                  </PeriodMenuItem>
                </PeriodMenu>
              )}
            </PeriodDropdownContainer>
          </PeriodWrapper>

          {/* ✨ Reload tlačítko */}
          <SmartTooltip text="Načíst objednávky z databáze (vyčistit cache)" icon="info" preferredPosition="bottom">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ReloadButton
                onClick={() => {
                  clearCache?.();
                  // ✅ Manuální refresh musí vzít aktuální fulltext hned (nečekat na debounce)
                  loadOrders(globalFilter, { forceRefresh: true });
                  showToast?.('🔄 Objednávky se načítají z databáze...', { type: 'info' });
                }}
                disabled={loading}
                $loading={loading}
              >
                <FontAwesomeIcon icon={faSync} />
              </ReloadButton>

              {lastBtAutoRefreshTime && (
                <span
                  style={{
                    color: '#fde68a', // světle žlutá (amber-200)
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 1px rgba(0,0,0,0.25)'
                  }}
                  title="Čas posledního automatického refresh (BT)"
                >
                  LAST:{lastBtAutoRefreshTime.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </SmartTooltip>
        </HeaderActions>
      </Header>

      {/* Action Bar - toggles a konfigurace */}
      <ActionBar>
        {/* Nová objednávka - na začátek řádku */}
        <SmartTooltip text="Vytvořit novou objednávku" icon="success" preferredPosition="bottom">
          <ToggleButton
            onClick={handleCreateNewOrder}
            style={{
              background: '#166534',
              borderColor: '#166534',
              color: 'white',
              fontWeight: 700
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
            Nová objednávka
          </ToggleButton>
        </SmartTooltip>

        {/* 🔎 Fulltext nahoře NEukazovat jako výchozí, pokud uživatel skryl filtry.
            Zobrazí se jen když je fulltext opravdu zadaný (user-defined). */}
        {!showFilters && !!globalFilter?.trim?.() && (
          <QuickSearch>
            <FontAwesomeIcon icon={faSearch} style={{ color: '#64748b' }} />
            <QuickSearchInput
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Fulltext (vyhledávání v objednávkách)"
              aria-label="Fulltext vyhledávání"
            />
            {globalFilter?.trim() && (
              <QuickSearchClear
                type="button"
                onClick={() => setGlobalFilter('')}
                title="Vymazat fulltext"
              >
                <FontAwesomeIcon icon={faTimes} />
              </QuickSearchClear>
            )}
          </QuickSearch>
        )}

        {/* Zrušit filtry - vždy první v řadě těchto tlačítek */}
        <SmartTooltip text="Vymaže všechny aktivní filtry včetně fulltext searche" icon="warning" preferredPosition="bottom">
          <ToggleButton
            onClick={handleClearFilters}
            style={{
              background: '#dc2626',
              borderColor: '#dc2626',
              color: 'white'
            }}
          >
            <FontAwesomeIcon icon={faEraser} style={{ color: 'white' }} />
            Zrušit filtr
          </ToggleButton>
        </SmartTooltip>

        {/* Toggle Filtry - zobrazit POUZE když jsou skryté */}
        {!showFilters && (
          <SmartTooltip text="Zobrazit pokročilé filtry" icon="info" preferredPosition="bottom">
            <ToggleButton
              $active={false}
              onClick={() => setShowFilters(true)}
            >
              <FontAwesomeIcon icon={faFilter} />
              Filtry
            </ToggleButton>
          </SmartTooltip>
        )}

        {/* Toggle Dashboard - zobrazit POUZE když je skrytý */}
        {!showDashboard && (
          <SmartTooltip text="Zobrazit dashboard s přehledem statistik" icon="info" preferredPosition="bottom">
            <ToggleButton
              $active={false}
              onClick={() => updatePreferences({ showDashboard: true })}
            >
              <FontAwesomeIcon icon={faChartBar} />
              Dashboard
            </ToggleButton>
          </SmartTooltip>
        )}

        {/* Toggle Podbarvení řádků */}
        <SmartTooltip text={showRowColoring ? 'Vypnout podbarvení řádků' : 'Zapnout podbarvení řádků'} icon="info" preferredPosition="bottom">
          <ToggleButton
            $active={showRowColoring}
            onClick={() => updatePreferences({ showRowColoring: !showRowColoring })}
          >
            <FontAwesomeIcon icon={faPalette} />
          </ToggleButton>
        </SmartTooltip>

        {/* Konfigurace sloupců */}
        <SmartTooltip text="Export aktuálně načtených objednávek do CSV" icon="success" preferredPosition="bottom">
          <ToggleButton onClick={handleExportList}>
            <FontAwesomeIcon icon={faFileExport} />
          </ToggleButton>
        </SmartTooltip>

        <SmartTooltip text="Nastavit viditelnost a pořadí sloupců tabulky" icon="info" preferredPosition="bottom">
          <OrdersColumnConfigV3
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            columnLabels={COLUMN_LABELS}
            onVisibilityChange={handleColumnVisibilityChange}
            onOrderChange={handleColumnOrderChange}
            onReset={handleResetColumnConfig}
            onSave={handleSaveColumnConfig}
            userId={user_id}
          />
        </SmartTooltip>
      </ActionBar>

      {/* Error state */}
      {error && (
        <ErrorAlert>
          <ErrorIcon>
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </ErrorIcon>
          <ErrorMessage>{error}</ErrorMessage>
        </ErrorAlert>
      )}

      {/* Dashboard */}
      {showDashboard && (
        <OrdersDashboardV3Full
          stats={stats || {}}
          filteredStats={filteredStats}
          totalAmount={stats?.totalAmount || 0}
          filteredTotalAmount={stats?.filteredTotalAmount}
          filteredCount={stats?.filteredCount}
          hasActiveFilters={hasAnyActiveFilters}
          activeStatus={dashboardFilters.filter_status}
          onStatusClick={handleDashboardFilterChange}
          onHide={() => updatePreferences({ showDashboard: false })}
          mode={dashboardMode}
          onModeChange={(mode) => updatePreferences({ dashboardMode: mode })}
        />
      )}

      {/* Filters - zobrazit pouze když showFilters === true */}
      {showFilters && (
        <OrdersFiltersV3Full
          token={token}
          username={username}
          userId={user_id}
          filters={columnFilters}
          onFilterChange={handlePanelFiltersChange}
          onClearAll={handleClearFilters} // ✅ Vráceno zpět
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onHide={() => setShowFilters(false)}
        />
      )}

      {/* Table - virtualizovaná verze pro optimální performance */}
      <VirtualizedOrdersTable
        data={orders}
        visibleColumns={columnVisibility ? Object.keys(columnVisibility).filter(col => columnVisibility[col]) : []}
        columnOrder={columnOrder}
        columnFilters={columnFilters} // ✅ Synchronizace filters
        sorting={sorting}
        onSortingChange={setSorting}
        onRowExpand={handleRowExpand}
        onActionClick={handleActionClick}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onColumnReorder={handleColumnOrderChange}
        onColumnFiltersChange={handleColumnFilterChange}
        orderStatesList={orderStatesList} // ✅ Options pro stavový filtr
        userId={user_id}
        userDetail={userDetail} // 🔒 Pro kontrolu úseku při schvalování
        token={token}
        username={username}
        isLoading={loading}
        error={error}
        canEdit={canEdit}
        canCreateInvoice={canCreateInvoice}
        canExportDocument={canExportDocument}
        canDelete={canDelete}
        canHardDelete={canHardDelete}
        canGenerateFinancialControl={canGenerateFinancialControl()}
        showApproveColumn={true}
        canApproveOrder={canApprove}
        isApprovalViaSubstitution={isApprovalViaSubstitution}
        canCancelOrder={canCancelOrder}
        isBudgetManagerRole={isBudgetManagerRole}
        isAdmin={isAdmin}
        hasPermission={hasPermission}
        hasAccountingRole={hasAccountingRole}
        showRowColoring={showRowColoring}
        getRowBackgroundColor={getRowBackgroundColor}
        highlightOrderId={highlightOrderId}
        highlightAction={highlightAction} // 🎨 Akce pro určení barvy
        onHighlightOrder={handleHighlightOrder}
        showToast={showToast} // 🎯 Toast notifikace
        clearCache={clearCache} // ✅ Vyčistí cache po update operacích
        onRefreshOrders={handleRefreshOrders}
        getOrderTotalPriceWithDPH={getOrderTotalPriceWithDPH}
        forceVirtualization={shouldUseVirtualization}
        showPerformanceInfo={process.env.NODE_ENV === 'development'}
        isBudgetManagerRole={isBudgetManagerRole}
        // 🆕 Kontrola a komentáře
        onToggleOrderCheck={handleToggleOrderCheck}
        onLoadComments={handleLoadComments}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onTableContextMenu={handleTableContextMenu}
      />

      {/* 🆕 Kontextové menu */}
      {contextMenu && (
        <OrderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          order={contextMenu.order}
          selectedData={contextMenu.selectedData}
          selectedText={contextMenu.selectedText}
          onClose={handleCloseContextMenu}
          onAddToTodo={handleAddToTodo}
          onAddAlarm={handleAddAlarm}
          onAddComment={handleContextMenuAddComment}
          onToggleCheck={handleContextMenuToggleCheck}
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
          canApprove={canApprove(contextMenu.order)}
          canAddComment={canAddComment(contextMenu.order)}
          canToggleCheck={canToggleCheck()}
          canGenerateFinancialControl={canGenerateFinancialControl()}
        />
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <OrdersPaginationV3
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          loading={loading}
        />
      )}

      {/* DOCX Generator Modal - Lazy loaded for better performance */}
      {docxModalOpen && (
        <Suspense fallback={null}>
          <DocxGeneratorModal
            order={docxModalOrder}
            isOpen={docxModalOpen}
            onClose={handleDocxModalClose}
          />
        </Suspense>
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
          showCancel={isAdmin}
          cancelText={isAdmin ? "Převzít objednávku" : undefined}
          onCancel={isAdmin ? handleForceUnlock : undefined}
        >
          <InfoText>
            Objednávka <strong>{lockedOrderInfo.orderNumber}</strong> je aktuálně editována uživatelem:
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
              Zamčeno před {lockedOrderInfo.lockAgeMinutes} {
                lockedOrderInfo.lockAgeMinutes === 1 ? 'minutou' : 
                lockedOrderInfo.lockAgeMinutes < 5 ? 'minutami' : 
                'minutami'
              }
            </LockTimeInfo>
          )}

          <InfoText>
            Objednávku nelze načíst, dokud ji má otevřenou jiný uživatel.
            Prosím, kontaktujte uživatele výše a požádejte ho o uložení a zavření objednávky.
          </InfoText>

          {isAdmin && (
            <InfoText style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 600 }}>
              <FontAwesomeIcon icon={faUnlock} /> Jako administrátor můžete objednávku převzít a násilně odemknout tlačítkem níže.
            </InfoText>
          )}
        </ConfirmDialog>,
        document.body
      )}

      {createPortal(
        <ConfirmDialog
          isOpen={showNewOrderConfirmDialog}
          onClose={() => setShowNewOrderConfirmDialog(false)}
          onConfirm={handleConfirmCreateNewOrder}
          title="Rozpracovaná objednávka"
          icon={faExclamationTriangle}
          variant="warning"
          confirmText="Ano, zavřít a vytvořit novou"
          showCancel={true}
          cancelText="Zrušit"
          onCancel={() => setShowNewOrderConfirmDialog(false)}
        >
          Máte rozpracovanou objednávku v Order formuláři.
          <br />
          Pokud budete pokračovat, rozpracovaná data se zavřou a otevře se nová objednávka.
        </ConfirmDialog>,
        document.body
      )}

      {/* 🎯 Dialog pro potvrzení editace - varování o rozděl aných objednávkách */}
      {createPortal(
        <ConfirmDialog
          isOpen={showEditConfirmModal}
          onClose={handleEditCancel}
          onConfirm={handleEditConfirm}
          title="Potvrzení editace objednávky"
          icon={faExclamationTriangle}
          variant="warning"
          confirmText="Ano, pokračovat"
          cancelText="Ne, zrušit"
        >
          <p>
            Chystáte se editovat objednávku <strong>"{orderToEdit?.cislo_objednavky || orderToEdit?.evidencni_cislo || orderToEdit?.predmet || (orderToEdit?.id ? `ID ${orderToEdit.id}` : 'neznámá objednávka')}"</strong>.
          </p>

          {/* Zobraz varování o rozepracované objednávce, pokud existuje */}
          {(() => {
            if (!currentDraftData) return null;

            try {
              const formData = currentDraftData.formData || currentDraftData;
              const draftTitle = formData.ev_cislo || formData.cislo_objednavky || formData.predmet || '★ KONCEPT ★';
              const isNewConcept = isValidConcept(currentDraftData);

              return (
                <p style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f59e0b', margin: '0.5rem 0' }}>
                  <strong>Pozor:</strong> Máte rozepracovanou {isNewConcept ? 'novou objednávku' : 'editaci objednávky'}{' '}
                  <strong>{draftTitle}</strong>. Přepnutím na jinou objednávku přijdete o neuložené změny!
                </p>
              );
            } catch (error) {
              return null;
            }
          })()}

          <p>
            <strong>Varování:</strong> Tímto budou zrušeny všechny případné neuložené změny v jiných objednávkách a může dojít ke ztrátě dat.
          </p>
          <p>
            Chcete pokračovat v editaci?
          </p>
        </ConfirmDialog>,
        document.body
      )}

      {/* 🗑️ Dialog pro smazání / deaktivaci objednávky */}
      {createPortal(
        <ConfirmDialog
          isOpen={showDeleteConfirmModal}
          onClose={handleDeleteCancel}
          onConfirm={() => handleDeleteConfirm(deleteType)}
          title={
            orderToDelete && orderToDelete.aktivni === 0 && isAdmin
              ? (deleteType === 'restore' ? 'Obnovení objednávky' : 'Úplné smazání objednávky')
              : 'Smazání objednávky'
          }
          icon={
            orderToDelete && orderToDelete.aktivni === 0 && isAdmin
              ? (deleteType === 'restore' ? faCheckCircle : faTrash)
              : faTrash
          }
          variant={
            orderToDelete && orderToDelete.aktivni === 0 && isAdmin
              ? (deleteType === 'restore' ? 'success' : 'danger')
              : 'danger'
          }
          confirmText={
            orderToDelete && orderToDelete.aktivni === 0 && isAdmin
              ? (deleteType === 'restore' ? '✅ Obnovit objednávku' : '⚠️ Smazat úplně')
              : isAdmin
                ? 'Smazat úplně'
                : 'Označit neaktivní'
          }
          cancelText="Zrušit"
          showCancel={true}
          onCancel={handleDeleteCancel}
          key={deleteType + (orderToDelete?.aktivni ? '-active' : '-inactive')}
        >
          {orderToDelete && orderToDelete.aktivni === 0 && isAdmin ? (
            /* NEAKTIVNÍ objednávka – volba: obnovit nebo hard delete */
            <>
              <p style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
                Co chcete udělat s neaktivní objednávkou{' '}
                <strong>"{orderToDelete?.cislo_objednavky || orderToDelete?.predmet || `ID ${orderToDelete?.id}`}"</strong>?
              </p>
              <div style={{ background: '#f8fafc', border: '2px solid #cbd5e1', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569', fontSize: '1rem' }}>🔧 Vyberte akci:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label
                    onClick={() => setDeleteType('restore')}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer',
                      padding: '0.75rem', borderRadius: '6px', transition: 'all 0.2s',
                      border: `2px solid ${deleteType === 'restore' ? '#10b981' : '#e2e8f0'}`,
                      background: deleteType === 'restore' ? '#f0fdf4' : 'white',
                    }}
                  >
                    <input type="radio" name="v3DeleteType" value="restore" checked={deleteType === 'restore'}
                      onChange={e => { e.stopPropagation(); setDeleteType('restore'); }}
                      style={{ marginTop: '0.25rem', cursor: 'pointer' }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: deleteType === 'restore' ? '#166534' : '#475569' }}>
                        🔄 Obnovit objednávku
                      </div>
                      <div style={{ fontSize: '0.85rem', color: deleteType === 'restore' ? '#166534' : '#64748b', lineHeight: '1.4' }}>
                        Objednávka bude znovu <strong>aktivní</strong> a objeví se v přehledu.
                      </div>
                    </div>
                  </label>
                  <label
                    onClick={() => setDeleteType('hard')}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer',
                      padding: '0.75rem', borderRadius: '6px', transition: 'all 0.2s',
                      border: `2px solid ${deleteType === 'hard' ? '#ef4444' : '#e2e8f0'}`,
                      background: deleteType === 'hard' ? '#fef2f2' : 'white',
                    }}
                  >
                    <input type="radio" name="v3DeleteType" value="hard" checked={deleteType === 'hard'}
                      onChange={e => { e.stopPropagation(); setDeleteType('hard'); }}
                      style={{ marginTop: '0.25rem', cursor: 'pointer' }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: deleteType === 'hard' ? '#dc2626' : '#475569' }}>
                        ⚠️ Smazat úplně (HARD DELETE)
                      </div>
                      <div style={{ fontSize: '0.85rem', color: deleteType === 'hard' ? '#dc2626' : '#64748b', lineHeight: '1.4' }}>
                        Objednávka bude <strong>fyzicky smazána z databáze</strong> včetně všech položek a příloh. Tuto akci nelze vrátit zpět!
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </>
          ) : (
            /* AKTIVNÍ objednávka – soft delete (nebo hard pro admina) */
            <>
              <p style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>
                Chystáte se smazat objednávku{' '}
                <strong>"{orderToDelete?.cislo_objednavky || orderToDelete?.predmet || `ID ${orderToDelete?.id}`}"</strong>.
              </p>
              {isAdmin ? (
                <div>
                  <p><strong>Máte administrátorská práva. Vyberte způsob smazání:</strong></p>
                  <div style={{
                    background: '#f8fafc',
                    border: '2px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginTop: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#475569', fontSize: '1rem' }}>
                      🔧 Vyberte akci:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* SOFT DELETE */}
                      <label
                        onClick={() => setDeleteType('soft')}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          cursor: 'pointer',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          transition: 'all 0.2s',
                          border: `2px solid ${deleteType === 'soft' ? '#3b82f6' : '#e2e8f0'}`,
                          background: deleteType === 'soft' ? '#eff6ff' : 'white',
                        }}
                      >
                        <input
                          type="radio"
                          name="v3DeleteTypeActive"
                          value="soft"
                          checked={deleteType === 'soft'}
                          onChange={e => { e.stopPropagation(); setDeleteType('soft'); }}
                          style={{ marginTop: '0.25rem', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{
                            fontWeight: 600,
                            marginBottom: '0.25rem',
                            color: deleteType === 'soft' ? '#1e40af' : '#475569'
                          }}>
                            🔒 Označit jako neaktivní
                          </div>
                          <div style={{
                            fontSize: '0.85rem',
                            color: deleteType === 'soft' ? '#1e40af' : '#64748b',
                            lineHeight: '1.4'
                          }}>
                            Objednávka zůstane v databázi, ale <strong>nebude se zobrazovat v seznamech</strong>.
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
                          borderRadius: '6px',
                          transition: 'all 0.2s',
                          border: `2px solid ${deleteType === 'hard' ? '#ef4444' : '#e2e8f0'}`,
                          background: deleteType === 'hard' ? '#fef2f2' : 'white',
                        }}
                      >
                        <input
                          type="radio"
                          name="v3DeleteTypeActive"
                          value="hard"
                          checked={deleteType === 'hard'}
                          onChange={e => { e.stopPropagation(); setDeleteType('hard'); }}
                          style={{ marginTop: '0.25rem', cursor: 'pointer' }}
                        />
                        <div>
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
                </div>
              ) : (
                <p>Objednávka bude označena jako neaktivní. Zůstane v databázi, ale nebude se zobrazovat v seznamech.</p>
              )}
            </>
          )}
        </ConfirmDialog>,
        document.body
      )}

      {/* Popup se seznamem faktur přiřazených k objednávce */}
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
    </Container>
    </>
  );
}

export default Orders25ListV3;
