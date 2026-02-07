/**
 * 📋 Orders25ListV3.js
 * 
 * VERZE 3.0 - Nová implementace seznamu objednávek s backend paging
 * 
 * Datum: 23. ledna 2026
 * Účel: Paralelní implementace pro postupný přechod na BE paging/filtering
 * Status: 🚧 BETA - Ve vývoji, zatím jen pro ADMINY
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

import React, { useContext, useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRocket, 
  faSpinner, 
  faExclamationTriangle,
  faInfoCircle,
  faCog,
  faChartBar,
  faFilter,
  faEye,
  faEyeSlash,
  faPalette,
} from '@fortawesome/free-solid-svg-icons';

// Status colors
import { STATUS_COLORS, getStatusColor } from '../constants/orderStatusColors';

// Context
import { AuthContext } from '../context/AuthContext';
import { ProgressContext } from '../context/ProgressContext';
import { ToastContext } from '../context/ToastContext';

// API Services
import { getOrderV2, deleteOrderV2 } from '../services/apiOrderV2';
import { findOrderPageV3 } from '../services/apiOrdersV3';

// Custom hooks
import { useOrdersV3 } from '../hooks/ordersV3/useOrdersV3';

// Components
import OrdersDashboardV3Full from '../components/ordersV3/OrdersDashboardV3Full';
import OrdersFiltersV3Full from '../components/ordersV3/OrdersFiltersV3Full';
import OrdersPaginationV3 from '../components/ordersV3/OrdersPaginationV3';
import OrdersColumnConfigV3 from '../components/ordersV3/OrdersColumnConfigV3';
import OrdersTableV3 from '../components/ordersV3/OrdersTableV3';

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
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1.5rem;
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
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
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

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)'};
  border: 2px solid ${props => props.$active ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  svg {
    font-size: 0.9rem;
  }
`;

const PeriodSelector = styled.select`
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

  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  option {
    background: #1e40af;
    color: white;
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
  approve: '',
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function Orders25ListV3() {
  // Contexts
  const { user_id, userDetail, token, username, hasPermission } = useContext(AuthContext);
  const { showToast: progressShowToast, showProgress, hideProgress } = useContext(ProgressContext);
  const { showToast: toastShowToast } = useContext(ToastContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Prefer ToastContext, fallback to ProgressContext
  const showToast = toastShowToast || progressShowToast;

  // Permission check functions
  const canEdit = (order) => {
    if (!hasPermission) return false;

    // Koncepty může editovat každý kdo má základní práva
    if (order.isDraft || order.je_koncept) {
      return hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_EDIT_OWN');
    }

    // Uživatelé s ORDER_*_ALL oprávněními mohou editovat všechny objednávky
    if (hasPermission('ORDER_EDIT_ALL') || hasPermission('ORDER_MANAGE')) {
      return true;
    }

    // DEPARTMENT-BASED SUBORDINATE PERMISSIONS
    if (hasPermission('ORDER_EDIT_SUBORDINATE')) {
      return true;
    }

    // ORDER_READ_SUBORDINATE = POUZE čtení, ŽÁDNÁ editace
    if (hasPermission('ORDER_READ_SUBORDINATE') && !hasPermission('ORDER_EDIT_SUBORDINATE')) {
      const isInOrderRole = (
        order.objednatel_id === user_id ||
        order.uzivatel_id === user_id ||
        order.garant_uzivatel_id === user_id ||
        order.schvalovatel_id === user_id ||
        order.prikazce_id === user_id
      );
      if (!isInOrderRole) return false;
    }

    // Uživatelé s ORDER_*_OWN oprávněními mohou editovat pouze své objednávky
    if (hasPermission('ORDER_EDIT_OWN') || hasPermission('ORDER_2025')) {
      return order.objednatel_id === user_id ||
             order.uzivatel_id === user_id ||
             order.garant_uzivatel_id === user_id ||
             order.schvalovatel_id === user_id;
    }

    return false;
  };

  const canExportDocument = (order) => {
    if (!order) return false;

    const allowedStates = [
      'ROZPRACOVANA', 'POTVRZENA', 'ODESLANA', 'UVEREJNIT', 'UVEREJNENA',
      'NEUVEREJNIT', 'FAKTURACE', 'VECNA_SPRAVNOST', 'DOKONCENA', 'ZKONTROLOVANA', 'CEKA_SE'
    ];

    let workflowStates = [];
    try {
      if (order.stav_workflow_kod) {
        workflowStates = Array.isArray(order.stav_workflow_kod)
          ? order.stav_workflow_kod
          : JSON.parse(order.stav_workflow_kod);
        if (!Array.isArray(workflowStates)) workflowStates = [];
      }
    } catch {
      workflowStates = [];
    }

    return workflowStates.some(state => {
      let stavCode = '';
      if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
        stavCode = String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
      } else if (typeof state === 'string') {
        stavCode = String(state).toUpperCase().trim();
      }
      return allowedStates.includes(stavCode);
    });
  };

  const canCreateInvoice = (order) => {
    if (!order) return false;
    if (!hasPermission) return false;

    const hasInvoicePermission = hasPermission('ADMINI') ||
                                  hasPermission('INVOICE_MANAGE') ||
                                  hasPermission('INVOICE_ADD');
    if (!hasInvoicePermission) return false;

    // ✅ POVOLENÉ STAVY: POUZE Fakturace, Věcná kontrola, Zkontrolováno (NE Dokončená)
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
        workflowStates = Array.isArray(order.stav_workflow_kod)
          ? order.stav_workflow_kod
          : JSON.parse(order.stav_workflow_kod);
        if (!Array.isArray(workflowStates)) workflowStates = [];
      }
    } catch {
      workflowStates = [];
    }

    // ✅ Zkontroluj zda není stornovaná/zamítnutá/dokončená
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
    return workflowStates.some(state => {
      let stavCode = '';
      if (typeof state === 'object' && (state.kod_stavu || state.nazev_stavu)) {
        stavCode = String(state.kod_stavu || state.nazev_stavu).toUpperCase().trim();
      } else if (typeof state === 'string') {
        stavCode = String(state).toUpperCase().trim();
      }
      return allowedStates.includes(stavCode);
    });
  };

  const canDelete = (order) => {
    if (!hasPermission) return false;

    // Zakázat smazání pro koncepty/drafty
    if (order.isDraft || order.je_koncept || order.hasLocalDraftChanges) return false;

    // Importované objednávky (ARCHIVOVANO) mohou mazat pouze ORDER_MANAGE a ORDER_DELETE_ALL
    if (order.stav_objednavky === 'ARCHIVOVANO') {
      return hasPermission('ORDER_MANAGE') || hasPermission('ORDER_DELETE_ALL');
    }

    // Uživatelé s ORDER_DELETE_ALL nebo ORDER_MANAGE mohou mazat všechny objednávky
    if (hasPermission('ORDER_DELETE_ALL') || hasPermission('ORDER_MANAGE')) {
      return true;
    }

    // DEPARTMENT-BASED SUBORDINATE PERMISSIONS
    if (hasPermission('ORDER_EDIT_SUBORDINATE')) {
      return true;
    }

    // ORDER_READ_SUBORDINATE = NESMÍ mazat (read-only)
    if (hasPermission('ORDER_READ_SUBORDINATE') && !hasPermission('ORDER_EDIT_SUBORDINATE')) {
      const isInOrderRole = (
        order.objednatel_id === user_id ||
        order.uzivatel_id === user_id ||
        order.garant_uzivatel_id === user_id ||
        order.schvalovatel_id === user_id ||
        order.prikazce_id === user_id
      );
      if (!isInOrderRole) return false;
    }

    // Uživatelé s ORDER_DELETE_OWN mohou mazat pouze své objednávky
    if (hasPermission('ORDER_DELETE_OWN')) {
      return order.objednatel_id === user_id ||
             order.uzivatel_id === user_id ||
             order.garant_uzivatel_id === user_id ||
             order.schvalovatel_id === user_id;
    }

    return false;
  };

  const canHardDelete = (order) => {
    // Hard delete pouze pro ADMINI
    return hasPermission && hasPermission('ADMINI');
  };

  // Custom hook pro Orders V3
  const {
    // Data
    orders,
    loading,
    error,
    stats,
    
    // Pagination
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    
    // Filtry
    selectedYear,
    setSelectedYear,
    columnFilters,
    dashboardFilters,
    handlePanelFiltersChange,
    handleColumnFilterChange,
    handleDashboardFilterChange,
    handleClearFilters,
    
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
  } = useOrdersV3({
    token,
    username,
    userId: user_id,
    showProgress,
    hideProgress,
  });

  // Helper funkce pro získání labelu období
  const getPeriodLabel = (value) => {
    const labels = {
      'all': 'Vše (bez omezení)',
      'current-month': 'Aktuální měsíc',
      'last-month': 'Poslední měsíc',
      'last-quarter': 'Poslední kvartál',
      'all-months': 'Všechny měsíce'
    };
    return labels[value] || value;
  };

  // State pro inicializaci - skryje obsah až do načtení všech dat
  const [isInitialized, setIsInitialized] = useState(false);
  
  // State pro výběr období
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_selectedPeriod_${user_id}`);
    return saved || 'all';
  });
  
  // State pro backend pagination toggle
  const [useBackendPagination, setUseBackendPagination] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_useBackendPagination_${user_id}`);
    return saved !== null ? JSON.parse(saved) : true; // Defaultně zapnuto
  });
  
  // Local state pro UI toggles s LocalStorage persistencí
  const [showDashboard, setShowDashboard] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_showDashboard_${user_id}`);
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [showFilters, setShowFilters] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_showFilters_${user_id}`);
    return saved !== null ? JSON.parse(saved) : false;
  });
  
  const [dashboardMode, setDashboardMode] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_dashboardMode_${user_id}`);
    // Normalizovat na lowercase, výchozí 'dynamic'
    return saved ? saved.toLowerCase() : 'dynamic'; // full, dynamic, compact - výchozí dynamic
  });
  
  const [showRowColoring, setShowRowColoring] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_showRowColoring_${user_id}`);
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // State pro global/fulltext search
  const [globalFilter, setGlobalFilter] = useState(() => {
    const saved = localStorage.getItem(`ordersV3_globalFilter_${user_id}`);
    return saved || '';
  });
  
  // State pro dialogy
  const [docxModalOpen, setDocxModalOpen] = useState(false);
  const [docxModalOrder, setDocxModalOrder] = useState(null);
  
  // State pro třídění
  const [sorting, setSorting] = useState([]);
  
  // State pro highlight objednávky po návratu z editace
  const [highlightOrderId, setHighlightOrderId] = useState(null);
  const [isSearchingForOrder, setIsSearchingForOrder] = useState(false);

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

  // 🎯 Effect pro highlight a scroll na objednávku po návratu z editace
  useEffect(() => {
    const orderIdFromEdit = location.state?.highlightOrderId || location.state?.orderIdFromEdit;
    
    if (!orderIdFromEdit || isSearchingForOrder) return;
    
    // Async funkce pro vyhledání a scroll na objednávku
    const findAndScrollToOrder = async () => {
      setIsSearchingForOrder(true);
      
      try {
        // Nejprve zkontrolovat zda je objednávka již na aktuální stránce
        const orderOnCurrentPage = orders.find(order => order.id === orderIdFromEdit);
        
        if (orderOnCurrentPage) {
          // Objednávka JE na aktuální stránce - okamžitě highlight a scroll
          performScrollAndHighlight(orderIdFromEdit);
          window.history.replaceState({}, document.title);
          setIsSearchingForOrder(false);
          return;
        }
        
        // Objednávka NENÍ na aktuální stránce - zavolat API pro nalezení stránky
        console.log('🔍 Hledám objednávku #' + orderIdFromEdit + ' v datasetu...');
        
        const result = await findOrderPageV3({
          token,
          username,
          order_id: orderIdFromEdit,
          per_page: itemsPerPage,
          year: selectedYear,
          filters: columnFilters,
          sorting: sorting
        });
        
        if (result.found && result.page) {
          console.log(`✅ Objednávka nalezena na stránce ${result.page}`);
          
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
            result.message || `Objednávka #${orderIdFromEdit} nenalezena v aktuálních filtrech nebo roce ${selectedYear}.`, 
            { type: 'info' }
          );
          window.history.replaceState({}, document.title);
          setIsSearchingForOrder(false);
        }
        
      } catch (error) {
        console.error('❌ Chyba při hledání objednávky:', error);
        showToast && showToast(
          `Chyba při hledání objednávky: ${error.message}`, 
          { type: 'error' }
        );
        window.history.replaceState({}, document.title);
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
          console.log('✅ Scrolloval na objednávku #' + orderId);
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
    
  }, [location.state, orders, currentPage, token, username, itemsPerPage, selectedYear, columnFilters, sorting, showToast, handlePageChange, isSearchingForOrder]);

  // Efekty pro uložení do LocalStorage při změně
  useEffect(() => {
    if (user_id) {
      localStorage.setItem(`ordersV3_showDashboard_${user_id}`, JSON.stringify(showDashboard));
    }
  }, [showDashboard, user_id]);

  useEffect(() => {
    if (user_id) {
      localStorage.setItem(`ordersV3_showFilters_${user_id}`, JSON.stringify(showFilters));
    }
  }, [showFilters, user_id]);

  useEffect(() => {
    if (user_id) {
      localStorage.setItem(`ordersV3_dashboardMode_${user_id}`, dashboardMode);
    }
  }, [dashboardMode, user_id]);

  useEffect(() => {
    if (user_id) {
      localStorage.setItem(`ordersV3_showRowColoring_${user_id}`, JSON.stringify(showRowColoring));
    }
  }, [showRowColoring, user_id]);

  // Persist selectedPeriod do localStorage
  useEffect(() => {
    if (user_id) {
      localStorage.setItem(`ordersV3_selectedPeriod_${user_id}`, selectedPeriod);
    }
  }, [selectedPeriod, user_id]);

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
      }
      
      // TODO: Implementovat uložení do user settings na backend
      // console.log('💾 Saving column config:', {
      //   columnVisibility,
      //   columnOrder,
      // });
      
      // console.log('✅ Column config saved to localStorage');
    } catch (err) {
      console.error('❌ Error saving column config:', err);
    }
  };

  // Handler pro reset šířek sloupců
  const handleResetColumnWidths = () => {
    if (user_id) {
      localStorage.removeItem(`ordersV3_columnSizing_${user_id}`);
    }
    window.location.reload(); // Reload pro aplikaci změn
  };

  // Handler pro editaci objednávky
  const handleEditOrder = async (order) => {
    // 🔒 KONTROLA OPRÁVNĚNÍ - PRVNÍ VĚC!
    if (!canEdit(order)) {
      showToast('Nemáte oprávnění editovat tuto objednávku', { type: 'warning' });
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
        
        showToast(
          `Objednávka je zamčená uživatelem ${lockedByUserName}. Nemůžete ji editovat.`,
          { type: 'warning' }
        );
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

  // Handler pro evidování faktury
  const handleCreateInvoice = (order) => {
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
    
    // 🎯 Získat číslo objednávky pro prefill v našeptávači
    const orderNumber = order.cislo_objednavky || order.evidencni_cislo || `#${order.id}`;
    
    // Navigace do modulu faktur s číslem objednávky v searchTerm
    navigate('/invoice-evidence', { 
      state: { 
        prefillSearchTerm: orderNumber,
        orderIdForLoad: order.id
      } 
    });
  };

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
      default:
        console.warn('Neznámá akce:', action);
    }
  };

  // Handler pro smazání objednávky
  const handleDeleteOrder = (order) => {
    const isHardDelete = canHardDelete(order);
    const deleteType = isHardDelete ? 'HARD DELETE' : 'SOFT DELETE (deaktivace)';
    
    // TODO: Zobrazit custom dialog s volbou hard/soft delete
    const confirmMessage = isHardDelete
      ? `Opravdu chcete NATRVALO SMAZAT objednávku ${order.cislo_objednavky}?\n\nADMIN MODE: Můžete zvolit:\n- HARD DELETE (natrvalo)\n- SOFT DELETE (deaktivovat)\n\nTato akce je nevratná!`
      : `Opravdu chcete DEAKTIVOVAT objednávku ${order.cislo_objednavky}?\n\nObjednávka bude skryta, ale data zůstanou v systému.`;
    
    if (window.confirm(confirmMessage)) {
      // TODO: Implementovat API volání pro delete/deactivate
      // if (isHardDelete) {
      //   await deleteOrder(order.id, 'hard');
      // } else {
      //   await deleteOrder(order.id, 'soft');
      // }
    }
  };

  // Handler pro rozbalení řádku
  const handleRowExpand = (order) => {
    handleToggleRow(order.id);
  };

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
            <Badge>
              <FontAwesomeIcon icon={faInfoCircle} />
              BETA
            </Badge>
            Objednávky V3
            <FontAwesomeIcon icon={faRocket} style={{ color: 'white' }} />
          </Title>
        </TitleSection>

        <HeaderActions>
          {/* Výběr období */}
          <PeriodSelector
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            disabled={loading}
          >
            <option value="all">Vše (bez omezení)</option>
            <option value="current-month">Aktuální měsíc</option>
            <option value="last-month">Poslední měsíc</option>
            <option value="last-quarter">Poslední kvartál</option>
            <option value="all-months">Všechny měsíce</option>
          </PeriodSelector>

          {/* Toggle Dashboard */}
          <ToggleButton
            $active={showDashboard}
            onClick={() => setShowDashboard(!showDashboard)}
            title={showDashboard ? 'Skrýt dashboard' : 'Zobrazit dashboard'}
          >
            <FontAwesomeIcon icon={showDashboard ? faEyeSlash : faEye} />
            <FontAwesomeIcon icon={faChartBar} />
          </ToggleButton>

          {/* Toggle Filtry */}
          <ToggleButton
            $active={showFilters}
            onClick={() => setShowFilters(!showFilters)}
            title={showFilters ? 'Skrýt filtry' : 'Zobrazit filtry'}
          >
            <FontAwesomeIcon icon={showFilters ? faEyeSlash : faEye} />
            <FontAwesomeIcon icon={faFilter} />
          </ToggleButton>

          {/* Toggle Podbarvení řádků */}
          <ToggleButton
            $active={showRowColoring}
            onClick={() => setShowRowColoring(!showRowColoring)}
            title={showRowColoring ? 'Vypnout podbarvení řádků' : 'Zapnout podbarvení řádků'}
          >
            <FontAwesomeIcon icon={faPalette} />
          </ToggleButton>

          {/* Konfigurace sloupců */}
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
        </HeaderActions>
      </Header>

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
          stats={stats}
          totalAmount={stats.totalAmount || 0}
          filteredTotalAmount={stats.filteredTotalAmount || stats.totalAmount || 0}
          filteredCount={totalItems}
          hasActiveFilters={dashboardFilters.filter_status || Object.keys(columnFilters).length > 0}
          activeStatus={dashboardFilters.filter_status}
          onStatusClick={handleDashboardFilterChange}
          onHide={() => setShowDashboard(false)}
          mode={dashboardMode}
          onModeChange={setDashboardMode}
        />
      )}

      {/* Filters */}
      <OrdersFiltersV3Full
        token={token}
        username={username}
        userId={user_id}
        filters={columnFilters}
        onFilterChange={handlePanelFiltersChange}
        onClearAll={handleClearFilters}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onHide={() => setShowFilters(false)}
      />

      {/* Table - zobrazit vždy */}
      <OrdersTableV3
        data={orders}
        visibleColumns={Object.keys(columnVisibility).filter(col => columnVisibility[col])}
        columnOrder={columnOrder}
        sorting={sorting}
        onSortingChange={setSorting}
        onRowExpand={handleRowExpand}
        onActionClick={handleActionClick}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onColumnReorder={handleColumnOrderChange}
        onColumnFiltersChange={handleColumnFilterChange}
        userId={user_id}
        token={token}
        username={username}
        isLoading={loading}
        error={error}
        canEdit={canEdit}
        canCreateInvoice={canCreateInvoice}
        canExportDocument={canExportDocument}
        canDelete={canDelete}
        canHardDelete={canHardDelete}
        showRowColoring={showRowColoring}
        getRowBackgroundColor={getRowBackgroundColor}
        highlightOrderId={highlightOrderId}
      />

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
    </Container>
    </>
  );
}

export default Orders25ListV3;
