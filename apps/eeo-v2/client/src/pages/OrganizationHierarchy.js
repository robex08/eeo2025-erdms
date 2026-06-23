import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import styled from '@emotion/styled';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  Handle,
  Position,
  useReactFlow,
  getSmoothStepPath
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CustomSelect } from '../components/CustomSelect';
import dagre from 'dagre';
import { graphlib } from 'dagre';
import { loadAuthData } from '../utils/authStorage';
import { ToastContext } from '../context/ToastContext';
import { 
  faSitemap, 
  faUsers, 
  faMapMarkerAlt, 
  faBell, 
  faKey,
  faSearch,
  faPlus,
  faTimes,
  faChevronDown,
  faChevronRight,
  faUserTie,
  faUserShield,
  faBuilding,
  faEnvelope,
  faSave,
  faTrash,
  faEdit,
  faEye,
  faEyeSlash,
  faLayerGroup,
  faInfoCircle,
  faExpand,
  faBullseye
} from '@fortawesome/free-solid-svg-icons';

// ✅ Normalizace starých event type kódů na nové anglické
function normalizeEventTypeCode(code) {
  const map = {
    // Staré české kódy workflow → nové anglické
    'order_status_nova': 'ORDER_CREATED',
    'order_status_rozpracovana': 'ORDER_DRAFT',
    'order_status_ke_schvaleni': 'ORDER_PENDING_APPROVAL',
    'order_status_schvalena': 'ORDER_APPROVED',
    'order_status_zamitnuta': 'ORDER_REJECTED',
    'order_status_ceka_se': 'ORDER_AWAITING_CHANGES',
    'order_status_odeslana': 'ORDER_SENT_TO_SUPPLIER',
    'order_status_ceka_potvrzeni': 'ORDER_AWAITING_CONFIRMATION',
    'order_status_potvrzena': 'ORDER_CONFIRMED_BY_SUPPLIER',
    'order_status_registr_ceka': 'ORDER_REGISTRY_PENDING',
    'order_status_registr_zverejnena': 'ORDER_REGISTRY_PUBLISHED',
    'order_status_faktura_ceka': 'ORDER_INVOICE_PENDING',
    'order_status_faktura_pridana': 'ORDER_INVOICE_ADDED',
    'order_status_faktura_schvalena': 'ORDER_INVOICE_APPROVED',
    'order_status_faktura_uhrazena': 'ORDER_INVOICE_PAID',
    'order_status_kontrola_ceka': 'INVOICE_MATERIAL_CHECK_REQUESTED',
    'order_status_kontrola_potvrzena': 'INVOICE_MATERIAL_CHECK_APPROVED',
    'order_status_kontrola_zamitnuta': 'INVOICE_MATERIAL_CHECK_REJECTED',
    'order_status_realizovana': 'ORDER_COMPLETED',
    'order_status_smazana': 'ORDER_DELETED',
    'order_status_zrusena': 'ORDER_CANCELLED',
    
    // Uppercase varianty
    'ORDER_STATUS_NOVA': 'ORDER_CREATED',
    'ORDER_STATUS_ROZPRACOVANA': 'ORDER_DRAFT',
    'ORDER_STATUS_KE_SCHVALENI': 'ORDER_PENDING_APPROVAL',
    'ORDER_STATUS_SCHVALENA': 'ORDER_APPROVED',
    'ORDER_STATUS_ZAMITNUTA': 'ORDER_REJECTED',
    'ORDER_STATUS_CEKA_SE': 'ORDER_AWAITING_CHANGES',
    'ORDER_STATUS_ODESLANA': 'ORDER_SENT_TO_SUPPLIER',
    'ORDER_STATUS_CEKA_POTVRZENI': 'ORDER_AWAITING_CONFIRMATION',
    'ORDER_STATUS_POTVRZENA': 'ORDER_CONFIRMED_BY_SUPPLIER',
    'ORDER_STATUS_REGISTR_CEKA': 'ORDER_REGISTRY_PENDING',
    'ORDER_STATUS_REGISTR_ZVEREJNENA': 'ORDER_REGISTRY_PUBLISHED',
    'ORDER_STATUS_FAKTURA_CEKA': 'ORDER_INVOICE_PENDING',
    'ORDER_STATUS_FAKTURA_PRIDANA': 'ORDER_INVOICE_ADDED',
    'ORDER_STATUS_FAKTURA_SCHVALENA': 'ORDER_INVOICE_APPROVED',
    'ORDER_STATUS_FAKTURA_UHRAZENA': 'ORDER_INVOICE_PAID',
    'ORDER_STATUS_KONTROLA_CEKA': 'INVOICE_MATERIAL_CHECK_REQUESTED',
    'ORDER_STATUS_KONTROLA_POTVRZENA': 'INVOICE_MATERIAL_CHECK_APPROVED',
    'ORDER_STATUS_KONTROLA_ZAMITNUTA': 'INVOICE_MATERIAL_CHECK_REJECTED',
    'ORDER_STATUS_REALIZOVANA': 'ORDER_COMPLETED',
    'ORDER_STATUS_SMAZANA': 'ORDER_DELETED',
    'ORDER_STATUS_ZRUSENA': 'ORDER_CANCELLED',
    
    // Bez prefixu
    'NOVA': 'ORDER_CREATED',
    'ROZPRACOVANA': 'ORDER_DRAFT',
    'ODESLANA_KE_SCHVALENI': 'ORDER_PENDING_APPROVAL',
    'SCHVALENA': 'ORDER_APPROVED',
    'ZAMITNUTA': 'ORDER_REJECTED',
    'CEKA_SE': 'ORDER_AWAITING_CHANGES',
    'ODESLANA': 'ORDER_SENT_TO_SUPPLIER',
    'CEKA_POTVRZENI': 'ORDER_AWAITING_CONFIRMATION',
    'POTVRZENA': 'ORDER_CONFIRMED_BY_SUPPLIER',
    'REGISTR_CEKA': 'ORDER_REGISTRY_PENDING',
    'REGISTR_ZVEREJNENA': 'ORDER_REGISTRY_PUBLISHED',
    'FAKTURA_CEKA': 'ORDER_INVOICE_PENDING',
    'FAKTURA_PRIDANA': 'ORDER_INVOICE_ADDED',
    'FAKTURA_SCHVALENA': 'ORDER_INVOICE_APPROVED',
    'FAKTURA_UHRAZENA': 'ORDER_INVOICE_PAID',
    'KONTROLA_CEKA': 'INVOICE_MATERIAL_CHECK_REQUESTED',
    'KONTROLA_POTVRZENA': 'INVOICE_MATERIAL_CHECK_APPROVED',
    'KONTROLA_ZAMITNUTA': 'INVOICE_MATERIAL_CHECK_REJECTED',
    'REALIZOVANA': 'ORDER_COMPLETED',
    'SMAZANA': 'ORDER_DELETED',
    'ZRUSENA': 'ORDER_CANCELLED'
  };
  
  const key = String(code).toLowerCase();
  
  // Pokud existuje mapování, použij ho
  if (map[key]) {
    return map[key];
  }
  
  // Jinak převeď lowercase na uppercase (pro případy jako "user_mention" → "USER_MENTION")
  const strCode = String(code);
  if (strCode === strCode.toLowerCase() && strCode.includes('_')) {
    return strCode.toUpperCase();
  }
  
  // Pokud je už uppercase, vrať tak jak je
  return strCode;
}

// ✅ Helper funkce pro konzistentní zobrazení event types
function getNotificationTypeLabel(englishCode) {
  const labels = {
    // ✅ HLAVNÍ NOTIFIKACE OBJEDNÁVEK
    'ORDER_CREATED': 'Nová objednávka',
    'ORDER_PENDING_APPROVAL': 'Ke schválení',
    'ORDER_APPROVED': 'Schváleno',
    'ORDER_REJECTED': 'Zamítnuto',
    'ORDER_AWAITING_CHANGES': 'Čeká na doplnění',
    'ORDER_SENT_TO_SUPPLIER': 'Odesláno dodavateli',
    'ORDER_CONFIRMED_BY_SUPPLIER': 'Potvrzeno dodavatelem',
    'ORDER_COMPLETED': 'Dokončeno',
    'ORDER_CANCELLED': 'Zrušeno',
    'ORDER_REGISTRY_PUBLISHED': 'Registr zveřejněn',
    'ORDER_REGISTRY_PENDING': 'Čeká registr',
    
    // ✅ FAKTURY
    'INVOICE_CREATED': 'Nová faktura',
    'INVOICE_MATERIAL_CHECK_REQUESTED': 'Čeká věcná kontrola',
    'INVOICE_MATERIAL_CHECK_APPROVED': 'Věcná správnost OK',
    'INVOICE_APPROVED': 'Faktura schválena',
    'INVOICE_PAID': 'Faktura uhrazena',
    
    // ✅ SYSTÉMOVÉ
    'system_maintenance': 'Údržba systému',
    'user_mention': 'Zmínka v komentáři',
    'deadline_reminder': 'Připomínka termínu',
    
    // ✅ TODO ALARMY
    'alarm_todo_normal': 'TODO alarm',
    'alarm_todo_high': 'TODO urgentní', 
    'alarm_todo_expired': 'TODO prošlý termín'
  };
  
  return labels[englishCode] || englishCode;
}

// API Configuration
const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

// Potlačit neškodnou ResizeObserver chybu (běžné u ReactFlow)
// Tato chyba je známá React Flow issue a je neškodná - jen informuje o resize operacích
const originalConsoleError = window.console.error;
window.console.error = (...args) => {
  const errorMsg = typeof args[0] === 'string' ? args[0] : args[0]?.message || '';
  // Ignorovat všechny ResizeObserver related errors
  if (errorMsg.includes('ResizeObserver') || 
      errorMsg.includes('undelivered notifications')) {
    return;
  }
  originalConsoleError.call(window.console, ...args);
};

// Potlačit ResizeObserver error v global error handleru
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (msg.includes('ResizeObserver') || 
      msg.includes('undelivered notifications')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
}, true);

// Potlačit i v unhandledrejection
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || e.reason || '';
  if (typeof msg === 'string' && (msg.includes('ResizeObserver') || 
      msg.includes('undelivered notifications'))) {
    e.preventDefault();
    return false;
  }
});

// Styled Components
const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  margin-top: -1em; /* Kompenzace padding-top z Layout Content */
  user-select: none;
  -webkit-user-select: none;
`;

const Header = styled.div`
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e0e6ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex-shrink: 0;
  user-select: none;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.5rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background: ${props => props.primary ? '#3b82f6' : 'white'};
  color: ${props => props.primary ? '#fff' : '#2c3e50'};
  border: 1px solid ${props => props.primary ? '#3b82f6' : '#e0e6ed'};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
  font-weight: 500;

  &:hover {
    background: ${props => props.primary ? '#2563eb' : '#f8fafc'};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

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
  z-index: 10000;
  animation: fadeIn 0.2s ease-in-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #dc2626;
  font-size: 1.25rem;
  font-weight: 700;
`;

const ModalBody = styled.div`
  color: #475569;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 24px;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.variant === 'danger' ? `
    background: #dc2626;
    color: white;
    &:hover {
      background: #b91c1c;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    }
  ` : `
    background: #f1f5f9;
    color: #475569;
    &:hover {
      background: #e2e8f0;
    }
  `}
`;

// Warning Dialog Components
const WarningDialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  animation: fadeIn 0.2s ease-in-out;
  backdrop-filter: blur(2px);
`;

const WarningDialogContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-left: 6px solid #f59e0b;
`;

const WarningDialogHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const WarningDialogIcon = styled.div`
  font-size: 3rem;
  line-height: 1;
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;

const WarningDialogTitle = styled.h3`
  margin: 0;
  color: #1e293b;
  font-size: 1.4rem;
  font-weight: 700;
  flex: 1;
`;

const WarningDialogMessage = styled.div`
  color: #475569;
  font-size: 1rem;
  line-height: 1.7;
  margin-bottom: 28px;
  white-space: pre-wrap;
`;

const WarningDialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const WarningDialogButton = styled.button`
  padding: 12px 28px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;


const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 480px; /* +20% oproti původním 400px */
  background: white;
  border-right: 1px solid #e0e6ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  user-select: none;
`;

const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e6ed;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const SidebarTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SearchBox = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e0e6ed;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 32px 8px 36px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  background: #f8fafc;
  color: #2c3e50;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 28px;
  top: 22px;
  color: #94a3b8;
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 24px;
  top: 20px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    background: #e2e8f0;
    color: #475569;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  padding-bottom: 190px; /* Prostor pro obě fixní tlačítka (Přidat vybrané + Resetovat plochu) */

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const CollapsibleSection = styled.div`
  margin-bottom: 8px;
`;

const SectionHeader = styled.div`
  padding: 10px 12px;
  background: ${props => props.expanded ? '#f1f5f9' : 'transparent'};
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
  }

  svg:first-of-type {
    width: 12px;
  }
`;

const SectionContent = styled.div`
  margin-top: 4px;
  padding-left: 8px;
  display: ${props => props.expanded ? 'block' : 'none'};
`;

const UserItem = styled.div`
  padding: 10px 12px;
  margin-bottom: 6px;
  background: ${props => props.isDragging ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
  border: 2px solid ${props => props.isDragging ? '#667eea' : '#e0e6ed'};
  border-radius: 8px;
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  color: ${props => props.isDragging ? '#fff' : '#2c3e50'};
  box-shadow: ${props => props.isDragging ? '0 8px 24px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)'};

  &:hover {
    border-color: #3b82f6;
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  &:active {
    cursor: grabbing;
  }
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
`;

const UserMeta = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  gap: 6px;
  align-items: center;
`;

const LocationItem = styled(UserItem)`
  cursor: ${props => props.isDragging ? 'grabbing' : 'grab'};
  opacity: ${props => props.isDragging ? 0.8 : 1};
  transform: ${props => props.isDragging ? 'rotate(2deg) scale(1.05)' : 'none'};
  
  &:hover {
    transform: ${props => props.isDragging ? 'rotate(2deg) scale(1.05)' : 'translateX(4px)'};
  }
`;

const LocationIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #92400e 0%, #78350f 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(146, 64, 14, 0.3);
`;

const DepartmentIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
`;

const CanvasArea = styled.div`
  flex: 1;
  position: relative;
  background: #f5f7fa;
  user-select: none; /* Zakázat výběr textu v celé canvas oblasti */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  
  /* Animace pro čárkovanou čáru */
  @keyframes dashdraw {
    to {
      stroke-dashoffset: -10;
    }
  }
  
  /* Pointer kurzor při hover nad nodem nebo edge */
  .react-flow__node,
  .react-flow__edge {
    cursor: pointer !important;
  }
  
  /* Crosshair při SHIFT (selection mode) - NEJVYŠŠÍ PRIORITA */
  &.selection-mode .react-flow__pane,
  &.selection-mode .react-flow__pane:hover,
  &.selection-mode .react-flow__pane:active,
  &.selection-mode .react-flow__pane:focus {
    cursor: crosshair !important;
  }
  
  /* Výchozí grab kurzor pro pan - JEN pokud NENÍ selection mode */
  &:not(.selection-mode) .react-flow__pane {
    cursor: grab !important;
  }
  
  /* Grabbing kurzor při aktivním panování - JEN pokud NENÍ selection mode */
  &:not(.selection-mode) .react-flow__pane:active {
    cursor: grabbing !important;
  }
  
  /* Styl pro výběrový obdélník (box-select) */
  .react-flow__selection {
    background: rgba(102, 126, 234, 0.08) !important;
    border: 2px dashed #667eea !important;
    border-radius: 8px !important;
  }
  
  .react-flow__nodesselection {
    background: transparent !important;
    border: none !important;
  }
`;

const DetailPanel = styled.div`
  width: 456px; /* +20% oproti původním 380px (panel nastavení node/edge) */
  background: white;
  border-left: 1px solid #e0e6ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0,0,0,0.05);
`;

const DetailHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e6ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const DetailHeaderTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const InfoButton = styled.button`
  background: rgba(255,255,255,0.15);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: auto;
  margin-right: 8px;
  font-size: 16px;

  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const DetailContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  /* Scrollbar pro email preview */
  .email-preview-body {
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
      
      &:hover {
        background: #94a3b8;
      }
    }
  }
`;

const DetailSection = styled.div`
  margin-bottom: 28px;
`;

const DetailSectionTitle = styled.h4`
  margin: 0 0 16px 0;
  color: #475569;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  background: #f8fafc;
  color: #2c3e50;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:read-only {
    background: #e2e8f0;
    cursor: not-allowed;
  }
`;

const ProfileSelectWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 2px;
  transition: all 0.2s;
  
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:hover {
    border-color: #d1d5db;
  }
`;

const ProfileSelect = styled.select`
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 20px;
  padding-right: 36px;
  
  option {
    padding: 10px;
    font-size: 0.875rem;
  }
`;

const ProfileSelectArrow = styled.div`
  display: none;
`;

const ProfileDeleteButton = styled.button`
  padding: 4px 8px;
  background: transparent;
  border: 1px solid #e5e7eb;
  color: ${props => props.disabled ? '#d1d5db' : '#6b7280'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  border-radius: 6px;
  min-width: 32px;
  height: 32px;
  
  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
  }
  
  &:active:not(:disabled) {
    background: #f3f4f6;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 16px;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  background: white;
  color: #2c3e50;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
  height: 40px;
  font-weight: 500;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #2c3e50;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;

  &:hover {
    background: #f8fafc;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #667eea;
  }
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const Tag = styled.div`
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
  color: #667eea;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  border: 1px solid #667eea30;

  button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
`;

const Divider = styled.div`
  height: 1px;
  background: #e0e6ed;
  margin: 20px 0;
`;

const CombinationTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 0.9rem;

  th {
    background: #f8f9fa;
    padding: 8px;
    text-align: left;
    font-weight: 600;
    color: #495057;
    border-bottom: 2px solid #dee2e6;
  }

  td {
    padding: 8px;
    border-bottom: 1px solid #e9ecef;
  }

  tr:hover {
    background: #f8f9fa;
  }

  button {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
`;

const CombinationAddRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  margin-top: 12px;

  > div {
    flex: 1;
  }

  button {
    padding: 8px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: transform 0.2s, box-shadow 0.2s;
    white-space: nowrap;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }
`;

// Custom Dialog Components
const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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

const DialogBox = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const DialogIcon = styled.div`
  font-size: 3rem;
  text-align: center;
  margin-bottom: 16px;
`;

const DialogTitle = styled.h2`
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 1.5rem;
  text-align: center;
`;

const DialogMessage = styled.div`
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 24px;
  white-space: pre-line;
`;

const DialogActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const DialogButton = styled.button`
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  
  ${props => props.primary ? `
    background: #667eea;
    color: white;
    &:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  ` : `
    background: #e0e6ed;
    color: #64748b;
    &:hover {
      background: #cbd5e1;
    }
  `}
`;

const DialogStats = styled.div`
  background: #f8fafc;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  
  div {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 0.9rem;
    
    &:not(:last-child) {
      border-bottom: 1px solid #e0e6ed;
    }
    
    strong {
      color: #2c3e50;
      font-weight: 600;
    }
    
    span {
      color: #667eea;
      font-weight: 700;
    }
  }
`;

const HelpModalContent = styled.div`
  max-height: 80vh;
  overflow-y: auto;
  padding: 0 4px;
`;

const HelpSection = styled.div`
  margin-bottom: 24px;
  
  h3 {
    color: #2c3e50;
    font-size: 1.1rem;
    margin: 0 0 12px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  p {
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0 0 8px 0;
  }
  
  code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    color: #667eea;
  }
`;

const HelpExample = styled.div`
  background: #f8fafc;
  border-left: 3px solid #667eea;
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
  font-size: 0.9rem;
  
  strong {
    color: #2c3e50;
    display: block;
    margin-bottom: 4px;
  }
  
  span {
    color: #64748b;
  }
`;

// Custom Node Component
const CustomNode = ({ data, selected }) => {
  // Rozlišit typ node (user, location, department, template, role, lp_kod, financing, genericRecipient)
  const isTemplate = data.type === 'template';
  const isRole = data.type === 'role';
  const isLocation = data.type === 'location';
  const isDepartment = data.type === 'department';
  const isLpCode = data.type === 'lp_kod'; // ✅ NOVÉ
  const isFinancing = data.type === 'financing'; // ✅ NOVÉ
  const isUser = !isLocation && !isDepartment && !isTemplate && !isRole && !isLpCode && !isFinancing;
  
  // Pro template nodes - jen zelený výstupní bod
  if (isTemplate) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: selected 
          ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
          : 'white',
        border: `3px solid ${selected ? '#f59e0b' : '#f59e0b'}`,
        minWidth: '200px',
        boxShadow: selected 
          ? '0 6px 16px rgba(245, 158, 11, 0.4)'
          : '0 2px 8px rgba(245, 158, 11, 0.15)',
        transition: 'all 0.2s',
        position: 'relative',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}>
        {/* Jen zelený source handle - šablona vysílá notifikace */}
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: '16px',
            height: '16px',
            background: '#10b981',
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.5)',
            cursor: 'crosshair',
            right: '-10px'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
          }}>
            🔔
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 700, 
              color: '#78350f',
              fontSize: '0.85rem',
              marginBottom: '2px'
            }}>
              {data.name}
            </div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#92400e',
              fontWeight: 500
            }}>
              {data.position}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pro role nodes - fialový node s target handle
  if (isRole) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: selected 
          ? 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)'
          : 'white',
        border: `3px solid ${selected ? '#8b5cf6' : '#8b5cf6'}`,
        minWidth: '200px',
        boxShadow: selected 
          ? '0 6px 16px rgba(139, 92, 246, 0.4)'
          : '0 2px 8px rgba(139, 92, 246, 0.15)',
        transition: 'all 0.2s',
        position: 'relative',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}>
        {/* Source handle - role může vysílat notifikace/práva */}
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: '16px',
            height: '16px',
            background: '#10b981',
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.5)',
            cursor: 'crosshair',
            right: '-10px'
          }}
        />
        {/* Target handle - role přijímá uživatele */}
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: '16px',
            height: '16px',
            background: '#ef4444',
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
            cursor: 'crosshair',
            left: '-10px'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
            color: 'white'
          }}>
            🛡️
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 700, 
              color: '#6d28d9',
              fontSize: '0.85rem',
              marginBottom: '2px'
            }}>
              {data.name}
            </div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#8b5cf6',
              fontWeight: 500
            }}>
              {data.metadata?.userCount ? `👥 ${data.metadata.userCount} uživatelů` : 'Role'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pro location/department nodes - zjednodušená vizualizace
  if (isLocation || isDepartment) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: selected 
          ? (isLocation ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)')
          : 'white',
        border: `3px solid ${selected ? (isLocation ? '#92400e' : '#059669') : (isLocation ? '#92400e' : '#059669')}`,
        minWidth: '160px',
        boxShadow: selected 
          ? `0 6px 16px ${isLocation ? 'rgba(146, 64, 14, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`
          : `0 2px 8px ${isLocation ? 'rgba(146, 64, 14, 0.15)' : 'rgba(5, 150, 105, 0.15)'}`,
        transition: 'all 0.2s',
        position: 'relative',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        textAlign: 'center'
      }}>
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: '14px',
            height: '14px',
            background: isLocation ? '#92400e' : '#059669',
            border: '2px solid white',
            boxShadow: `0 2px 6px ${isLocation ? 'rgba(146, 64, 14, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`,
            cursor: 'crosshair'
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: '14px',
            height: '14px',
            background: isLocation ? '#92400e' : '#059669',
            border: '2px solid white',
            boxShadow: `0 2px 6px ${isLocation ? 'rgba(146, 64, 14, 0.4)' : 'rgba(5, 150, 105, 0.4)'}`,
            cursor: 'crosshair'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <FontAwesomeIcon 
            icon={isLocation ? faMapMarkerAlt : faUserTie} 
            style={{ 
              color: isLocation ? '#92400e' : '#059669',
              fontSize: '1.1rem'
            }} 
          />
          <div style={{ 
            fontWeight: 700, 
            color: '#2c3e50',
            fontSize: '0.9rem'
          }}>
            {data.name}
          </div>
        </div>
      </div>
    );
  }
  
  // ✅ NOVÉ: Pro LP kód nodes - červený node
  if (isLpCode) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: selected 
          ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
          : 'white',
        border: `3px solid ${selected ? '#dc2626' : '#dc2626'}`,
        minWidth: '180px',
        boxShadow: selected 
          ? '0 6px 16px rgba(220, 38, 38, 0.4)'
          : '0 2px 8px rgba(220, 38, 38, 0.15)',
        transition: 'all 0.2s',
        position: 'relative',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}>
        {/* Source a Target handles */}
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: '14px',
            height: '14px',
            background: '#dc2626',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
            cursor: 'crosshair'
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: '14px',
            height: '14px',
            background: '#dc2626',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
            cursor: 'crosshair'
          }}
        />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
            color: 'white'
          }}>
            📋
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 700, 
              color: '#991b1b',
              fontSize: '0.85rem'
            }}>
              {data.lp_cislo}
            </div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#dc2626',
              fontWeight: 500 
            }}>
              {data.usek || data.nazev || 'LP'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ NOVÉ: Pro financování nodes - zelený node
  if (isFinancing) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: selected 
          ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
          : 'white',
        border: `3px solid ${selected ? '#16a34a' : '#16a34a'}`,
        minWidth: '180px',
        boxShadow: selected 
          ? '0 6px 16px rgba(22, 163, 74, 0.4)'
          : '0 2px 8px rgba(22, 163, 74, 0.15)',
        transition: 'all 0.2s',
        position: 'relative',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}>
        {/* Source a Target handles */}
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: '14px',
            height: '14px',
            background: '#16a34a',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.4)',
            cursor: 'crosshair'
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: '14px',
            height: '14px',
            background: '#16a34a',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.4)',
            cursor: 'crosshair'
          }}
        />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #16a34a 0%, #166534 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
            color: 'white'
          }}>
            💰
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 700, 
              color: '#166534',
              fontSize: '0.85rem'
            }}>
              {data.typ || data.nazev}
            </div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#16a34a',
              fontWeight: 500 
            }}>
              {data.popis || data.description || 'Financování'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User node - původní vizualizace
  return (
    <div style={{
      padding: '14px',
      borderRadius: '12px',
      background: selected ? 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)' : 'white',
      border: `3px solid ${selected ? '#3b82f6' : '#3b82f6'}`,
      minWidth: '220px',
      boxShadow: selected 
        ? '0 8px 24px rgba(59, 130, 246, 0.5), 0 0 0 2px #93c5fd' 
        : '0 4px 12px rgba(59, 130, 246, 0.15)',
      transition: 'all 0.2s',
      position: 'relative',
      transform: selected ? 'scale(1.02)' : 'scale(1)'
    }}>
      {/* Target handle - kam přijdou šipky (nahoře) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: '16px',
          height: '16px',
          background: '#3b82f6',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
          cursor: 'crosshair'
        }}
      />
      
      {/* Source handle - odkud táhneme šipky (dole) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: '16px',
          height: '16px',
          background: '#10b981',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
          cursor: 'crosshair'
        }}
      />

      {/* Notification badges - pravý horní roh */}
      {data.notifications && (data.notifications.hasEmail || data.notifications.hasInApp) && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          alignItems: 'center'
        }}>
          {data.notifications.hasEmail && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(102, 126, 234, 0.4)',
              cursor: 'help'
            }} title="Email notifikace aktivní">
              <FontAwesomeIcon icon={faEnvelope} style={{ color: 'white', fontSize: '0.7rem' }} />
            </div>
          )}
          {data.notifications.hasInApp && (
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(245, 87, 108, 0.4)',
              cursor: 'help'
            }} title="In-app notifikace aktivní">
              <FontAwesomeIcon icon={faBell} style={{ color: 'white', fontSize: '0.7rem' }} />
            </div>
          )}
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <UserAvatar>{data.initials}</UserAvatar>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem', marginBottom: '2px' }}>
            {data.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            {data.position}
          </div>
        </div>
      </div>
      {data.metadata && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#64748b', 
          paddingTop: '10px', 
          borderTop: '1px solid #e0e6ed',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: '#f5576c' }} />
            {data.metadata.location}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FontAwesomeIcon icon={faUserTie} style={{ color: '#00f2fe' }} />
            {data.metadata.department}
          </div>
          {data.notifications && data.notifications.types && data.notifications.types.length > 0 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              marginTop: '4px',
              paddingTop: '6px',
              borderTop: '1px dashed #e0e6ed'
            }}>
              <FontAwesomeIcon icon={faBell} style={{ color: '#667eea' }} />
              <span style={{ fontSize: '0.7rem', color: '#667eea', fontWeight: 600 }}>
                {data.notifications.types.length} typ{data.notifications.types.length > 1 ? 'y' : ''} notifikací
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Custom Edge Component with dashed animated smoothstep line (lomená pravoúhlá čára)
const CustomEdge = ({ 
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  source
}) => {
  const { getNode } = useReactFlow();
  
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  // Získej zdrojový node a jeho barvu
  const sourceNode = getNode(source);
  let strokeColor = '#94a3b8'; // Default šedá
  
  if (sourceNode?.data?.type === 'template') {
    strokeColor = '#f59e0b'; // Oranžová pro šablony
  } else if (sourceNode?.data?.type === 'location') {
    strokeColor = '#92400e'; // Tmavě hnědá pro lokality
  } else if (sourceNode?.data?.type === 'department') {
    strokeColor = '#059669'; // Tmavě zelená pro útvary
  } else if (sourceNode?.data?.type === 'lp_kod') { // ✅ NOVÉ
    strokeColor = '#dc2626'; // Červená pro LP kódy
  } else if (sourceNode?.data?.type === 'financing') { // ✅ NOVÉ
    strokeColor = '#16a34a'; // Zelená pro financování
  } else if (sourceNode?.type === 'custom') {
    strokeColor = '#3b82f6'; // Modrá pro uživatele
  }
  
  return (
    <>
      {/* Neviditelná širší klikací plocha */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      {/* Viditelná čára */}
      <path
        id={id}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 2.5,
          strokeDasharray: '8, 4',
          animation: 'dashdraw 0.5s linear infinite',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Main Component with error boundary for hot-reload issues
const OrganizationHierarchy = () => {
  const reactFlowWrapper = useRef(null);
  const { showToast } = useContext(ToastContext);
  const [hasError, setHasError] = useState(false);
  
  // Catch ReactFlow hot-reload errors
  useEffect(() => {
    const handleError = (event) => {
      if (event.message?.includes('useNodesState') || event.message?.includes('useEdgesState')) {
        console.warn('ReactFlow HMR error - refresh needed');
        setHasError(true);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  // Search terms pro každou sekci (načíst z LS)
  const [searchUsers, setSearchUsers] = useState(() => localStorage.getItem('hierarchy_search_users') || '');
  const [searchRoles, setSearchRoles] = useState(() => localStorage.getItem('hierarchy_search_roles') || '');
  const [searchLocations, setSearchLocations] = useState(() => localStorage.getItem('hierarchy_search_locations') || '');
  const [searchDepartments, setSearchDepartments] = useState(() => localStorage.getItem('hierarchy_search_departments') || '');
  const [searchLpCodes, setSearchLpCodes] = useState(() => localStorage.getItem('hierarchy_search_lp_codes') || ''); // ✅ NOVÉ
  const [searchFinancing, setSearchFinancing] = useState(() => localStorage.getItem('hierarchy_search_financing') || ''); // ✅ NOVÉ
  const [searchTemplates, setSearchTemplates] = useState(() => localStorage.getItem('hierarchy_search_templates') || '');
  
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem('hierarchy_expanded_sections');
    return saved ? JSON.parse(saved) : {
      users: true,
      roles: false,
      locations: false,
      departments: false,
      lpCodes: false, // ✅ NOVÉ
      financing: false, // ✅ NOVÉ
      genericRecipients: false,
      notificationTemplates: false
    };
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Data from API
  const [allUsers, setAllUsers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [allLpCodes, setAllLpCodes] = useState([]); // ✅ NOVÉ: LP KÓDY
  const [allFinancing, setAllFinancing] = useState([]); // ✅ NOVÉ: FINANCOVÁNÍ
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [allNotificationTemplates, setAllNotificationTemplates] = useState([]);
  const [notificationEventTypes, setNotificationEventTypes] = useState([]); // Event Types pro Notification Center
  
  // Detail panel data - rozsirene lokality a notifikace pro vybrany vztah
  const [selectedExtendedLocations, setSelectedExtendedLocations] = useState([]);
  const [selectedNotificationTypes, setSelectedNotificationTypes] = useState([]);
  // ❌ selectedNotificationEventTypes ODSTRANĚNO - EDGE dědí event types z parent TEMPLATE NODE

  // Detail panel data - EDGE notifikace (stejná logika jako u NODE)
  const [edgeScopeFilter, setEdgeScopeFilter] = useState('NONE');
  const [edgeSendEmail, setEdgeSendEmail] = useState(false);
  const [edgeSendInApp, setEdgeSendInApp] = useState(true);
  const [edgeRecipientRole, setEdgeRecipientRole] = useState('WARNING'); // Default WARNING (standard)
  const [edgeEventTypes, setEdgeEventTypes] = useState([]); // Event types na EDGE (přesunuto z NODE)
  
  // TARGET NODE: scopeDefinition a delivery options (Varianta B)
  const [targetScopeType, setTargetScopeType] = useState('ALL'); // ALL / SELECTED / DYNAMIC_FROM_ENTITY
  const [targetScopeField, setTargetScopeField] = useState('prikazce_id'); // pro DYNAMIC_FROM_ENTITY (LEGACY - single field)
  const [targetScopeFields, setTargetScopeFields] = useState(['prikazce_id']); // pro DYNAMIC_FROM_ENTITY (MULTI-FIELD)
  const [targetSelectedIds, setTargetSelectedIds] = useState([]); // pro SELECTED
  const [targetIncludeSubordinates, setTargetIncludeSubordinates] = useState(false);
  const [targetDeliveryEmail, setTargetDeliveryEmail] = useState(true);
  const [targetDeliveryInApp, setTargetDeliveryInApp] = useState(true);
  const [targetDeliverySms, setTargetDeliverySms] = useState(false);
  const [availableUsersForRole, setAvailableUsersForRole] = useState([]); // Seznam uživatelů pro výběr
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Kompletní seznam všech uživatelských polí z DB tabulek
  const allUserFields = [
    // Základní pole z 25a_objednavky
    { value: 'uzivatel_id', label: '👨‍💼 uzivatel_id (Uživatel - vytvořil)', table: '25a_objednavky' },
    { value: 'uzivatel_akt_id', label: '👨‍💻 uzivatel_akt_id (Uživatel - aktuální)', table: '25a_objednavky' },
    { value: 'garant_uzivatel_id', label: '🛡️ garant_uzivatel_id (Garant)', table: '25a_objednavky' },
    { value: 'objednatel_id', label: '📝 objednatel_id (Objednatel)', table: '25a_objednavky' },
    { value: 'schvalovatel_id', label: '✅ schvalovatel_id (Schvalovatel)', table: '25a_objednavky' },
    { value: 'prikazce_id', label: '👤 prikazce_id (Příkazce)', table: '25a_objednavky' },
    { value: 'odesilatel_id', label: '📤 odesilatel_id (Odesílatel)', table: '25a_objednavky' },
    { value: 'dodavatel_potvrdil_id', label: '🏢 dodavatel_potvrdil_id (Dodavatel - potvrdil)', table: '25a_objednavky' },
    { value: 'zverejnil_id', label: '📢 zverejnil_id (Zveřejnil)', table: '25a_objednavky' },
    { value: 'fakturant_id', label: '💰 fakturant_id (Fakturant)', table: '25a_objednavky' },
    { value: 'dokoncil_id', label: '🏁 dokoncil_id (Dokončil)', table: '25a_objednavky' },
    { value: 'potvrdil_vecnou_spravnost_id', label: '🔍 potvrdil_vecnou_spravnost_id (Potvrdil věcnou správnost)', table: '25a_objednavky' },
    { value: 'zamek_uzivatel_id', label: '🔒 zamek_uzivatel_id (Zámek uživatele)', table: '25a_objednavky' },
    
    // Pole z 25a_objednavky_faktury
    { value: 'fa_predana_zam_id', label: '📋 fa_predana_zam_id (Faktura - předána zaměstnanci)', table: '25a_faktury' },
    { value: 'vytvoril_uzivatel_id', label: '🆕 vytvoril_uzivatel_id (Vytvořil uživatel)', table: '25a_faktury' },
    { value: 'aktualizoval_uzivatel_id', label: '📝 aktualizoval_uzivatel_id (Aktualizoval uživatel)', table: '25a_faktury' },
  ];
  
  // Source INFO recipients configuration
  const [sourceInfoEnabled, setSourceInfoEnabled] = useState(true);
  const [sourceInfoFields, setSourceInfoFields] = useState(['uzivatel_id', 'garant_uzivatel_id', 'objednatel_id']);
  
  // Warning Dialog state
  const [warningDialog, setWarningDialog] = useState({
    show: false,
    title: '',
    message: '',
    icon: '⚠️'
  });
  
  // Detail panel data - druh vztahu a scope
  const [relationshipType, setRelationshipType] = useState('prime'); // prime, zastupovani, delegovani, rozsirene
  const [relationshipScope, setRelationshipScope] = useState('OWN'); // OWN, TEAM, LOCATION, ALL
  
  // Detail panel data - template varianty
  const [templateNormalVariant, setTemplateNormalVariant] = useState('');
  const [templateUrgentVariant, setTemplateUrgentVariant] = useState('');
  const [templateInfoVariant, setTemplateInfoVariant] = useState('');
  const [templatePreviewVariant, setTemplatePreviewVariant] = useState('');
  const [templateEventTypes, setTemplateEventTypes] = useState([]); // ⚠️ DEPRECATED: Bude odstraněno po DB migraci (event types jsou teď na EDGE)
  
  // Detail panel data - úroveň práv pro nadřízeného
  const [permissionLevel, setPermissionLevel] = useState({
    orders: 'READ_ONLY',       // READ_ONLY, READ_WRITE, READ_WRITE_DELETE, INHERIT
    invoices: 'READ_ONLY',
    contracts: 'READ_ONLY',
    cashbook: 'READ_ONLY'
  });
  
  // Detail panel data - viditelnost modulu
  const [moduleVisibility, setModuleVisibility] = useState({
    orders: true,
    invoices: true,
    contracts: false,
    cashbook: true,
    cashbookReadonly: true
  });
  
  // Sledování Shift klávesy pro změnu kurzoru
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  // Helper funkce pro CustomSelect
  const toggleSelect = useCallback((fieldName) => {
    setSelectStates(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  }, []);
  
  const closeAllSelects = useCallback(() => {
    setSelectStates({});
  }, []);
  
  const filterOptions = useCallback((options, searchTerm, fieldName) => {
    if (!searchTerm) return options;
    const normalized = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // ✅ Speciální režim: seskupené event types (hlavičky + položky)
    if (fieldName === 'templateEventTypes') {
      const matches = [];
      const matchedGroups = new Set();

      for (const opt of options) {
        if (!opt || opt.isGroupHeader) continue;
        const label = opt.name || opt.label || opt.nazev || String(opt);
        const normalizedLabel = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedLabel.includes(normalized)) {
          matches.push(opt);
          if (opt.groupKey) matchedGroups.add(opt.groupKey);
        }
      }

      if (matches.length === 0) return [];

      // Zachovat pořadí skupin podle původního seznamu
      const result = [];
      let currentGroup = null;

      for (const opt of options) {
        if (!opt) continue;

        if (opt.isGroupHeader) {
          currentGroup = opt.groupKey || null;
          if (currentGroup && matchedGroups.has(currentGroup)) {
            result.push(opt);
          }
          continue;
        }

        if (opt.groupKey && matchedGroups.has(opt.groupKey)) {
          const label = opt.name || opt.label || opt.nazev || String(opt);
          const normalizedLabel = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (normalizedLabel.includes(normalized)) {
            result.push(opt);
          }
        }
      }

      return result;
    }

    // Default
    return options.filter(option => {
      if (!option || option.isGroupHeader) return false;
      const label = option.name || option.label || option.nazev || String(option);
      const normalizedLabel = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedLabel.includes(normalized);
    });
  }, []);
  
  const getOptionLabel = useCallback((option, fieldName) => {
    if (option?.isGroupHeader) {
      return option.label || option.name || '';
    }
    if (fieldName === 'extendedLocations' || fieldName === 'extendedDepartments') {
      return option.name + (option.code ? ` (${option.code})` : '');
    }
    if (fieldName === 'notificationTypes') {
      return option.name || option.label || String(option);
    }
    return option.name || option.label || option.nazev || String(option);
  }, []);
  
  // Detail panel data - rozsirene useky
  const [selectedExtendedDepartments, setSelectedExtendedDepartments] = useState([]);
  
  // Detail panel data - kombinace lokalita+utvar
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  
  // State management pro CustomSelect komponenty (multiselect)
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState({});
  
  // Profily organizacnich radu
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileDialogMode, setProfileDialogMode] = useState('save'); // 'save' or 'saveAs'
  
  // Auto-save rozsirenych lokalit, useku, kombinaci, event types, typu vztahu, scope, modulu a permission level do edge
  React.useEffect(() => {
    if (selectedEdge) {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === selectedEdge.id) {
            return {
              ...e,
              data: {
                ...e.data,
                // Druh vztahu a scope (pro DB)
                relationshipType: relationshipType,
                druh_vztahu: relationshipType, // alias pro DB
                scope: relationshipScope,
                // Viditelnost modulu (pro DB)
                modules: moduleVisibility,
                // Úroveň práv pro každý modul (pro DB)
                permissionLevel: permissionLevel,
                // Rozsirene lokality/useky/kombinace
                extended: {
                  locations: selectedExtendedLocations,
                  departments: selectedExtendedDepartments,
                  combinations: selectedCombinations
                },
                // ❌ Notifikace - types ODSTRANĚNY (EDGE dědí event types z parent TEMPLATE NODE)
                // Pouze scope_filter, sendEmail, sendInApp, recipientRole se ukládají přímo v onChange handleru
                notifications: {
                  ...(e.data?.notifications || {})
                  // types: ODSTRANĚNO - nepotřebujeme ukládat, parent template je source of truth
                }
              }
            };
          }
          return e;
        })
      );
    }
  }, [
    selectedExtendedLocations, 
    selectedExtendedDepartments, 
    selectedCombinations,
    relationshipType,
    relationshipScope,
    moduleVisibility,
    permissionLevel,
    selectedEdge
  ]);

  // Auto-save EDGE notification settings (stejná logika jako u NODE template variant)
  const prevSelectedEdgeId = React.useRef(null);
  React.useEffect(() => {
    if (selectedEdge) {
      // Pokud se změnil vybraný edge, jen ulož jeho ID a NEUKLÁDEJ data
      if (prevSelectedEdgeId.current !== selectedEdge.id) {
        prevSelectedEdgeId.current = selectedEdge.id;
        return;
      }
      
      // Ulož data jen pokud editujeme STEJNÝ edge
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === selectedEdge.id) {
            return {
              ...e,
              data: {
                ...e.data,
                scope_filter: edgeScopeFilter,
                sendEmail: edgeSendEmail,
                sendInApp: edgeSendInApp,
                priority: edgeRecipientRole, // NOVÉ: priority místo recipientRole
                eventTypes: edgeEventTypes, // ✅ NOVÉ: Event types na EDGE
                source_info_recipients: {
                  enabled: sourceInfoEnabled,
                  fields: sourceInfoFields
                }
              }
            };
          }
          return e;
        })
      );
    } else {
      prevSelectedEdgeId.current = null;
    }
  }, [edgeScopeFilter, edgeSendEmail, edgeSendInApp, edgeRecipientRole, edgeEventTypes, sourceInfoEnabled, sourceInfoFields, selectedEdge]);
  
  // MULTI-FIELD: Synchronizace targetScopeFields do selectedNode při změně
  useEffect(() => {
    if (selectedNode && selectedNode.data?.scopeDefinition && targetScopeFields?.length > 0) {
      // Validace fields - použít všechna pole z allUserFields
      const validFields = allUserFields.map(f => f.value);
      
      const cleanedFields = targetScopeFields.filter(field => {
        const isValid = validFields.includes(field);
        if (!isValid) {
          console.warn(`❌ Invalid field '${field}' filtered out from targetScopeFields`);
        }
        return isValid;
      });
      
      if (cleanedFields.length !== targetScopeFields.length) {
        setTargetScopeFields(cleanedFields);
        return; // Zabráníme nekonečné smyčce
      }
      
      // Aktualizovat node konfiguraci s multi-field
      setNodes(prevNodes => 
        prevNodes.map(node => {
          if (node.id === selectedNode.id) {
            const updatedNode = {
              ...node,
              data: {
                ...node.data,
                scopeDefinition: {
                  ...node.data.scopeDefinition,
                  fields: cleanedFields,
                  // Odebrat starý single field pokud existuje
                  field: undefined
                }
              }
            };
            delete updatedNode.data.scopeDefinition.field;
            
            return updatedNode;
          }
          return node;
        })
      );
    }
  }, [targetScopeFields, selectedNode]);
  
  // MULTI-FIELD: Synchronizace sourceInfoFields do selectedEdge při změně
  useEffect(() => {
    if (selectedEdge && sourceInfoEnabled && sourceInfoFields?.length > 0) {
      const validFields = [
        'uzivatel_id', 'uzivatel_akt_id', 'garant_uzivatel_id', 'objednatel_id',
        'schvalovatel_id', 'prikazce_id', 'zamek_uzivatel_id', 'vytvoril_uzivatel_id',
        'aktualizoval_uzivatel_id', 'potvrdil_dodavatel_id', 'prikazce_fakturace_id',
        'fa_predana_zam_id', 'potvrdil_vecnou_spravnost_id', 'sml_id', 'obj_id',
        'odesilatel_id', 'dodavatel_potvrdil_id', 'zverejnil_id', 'fakturant_id', 'dokoncil_id'
      ];
      
      const cleanedFields = sourceInfoFields.filter(field => validFields.includes(field));
      
      if (cleanedFields.length !== sourceInfoFields.length) {
        setSourceInfoFields(cleanedFields);
        return;
      }
      
      // Aktualizovat edge konfiguraci s multi-field
      setEdges(prevEdges => 
        prevEdges.map(edge => {
          if (edge.id === selectedEdge.id) {
            const updatedEdge = {
              ...edge,
              data: {
                ...edge.data,
                source_info_recipients: {
                  enabled: sourceInfoEnabled,
                  fields: cleanedFields
                }
              }
            };
            
            return updatedEdge;
          }
          return edge;
        })
      );
    }
  }, [sourceInfoFields, sourceInfoEnabled, selectedEdge]);
  
  // Auto-save template variant do node
  React.useEffect(() => {
    if (selectedNode && selectedNode.data?.type === 'template') {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === selectedNode.id) {
            return {
              ...n,
              data: {
                ...n.data,
                // ✅ FIX: Uložit null místo prázdného stringu pro lepší fallback handling
                normalVariant: templateNormalVariant || null,
                urgentVariant: templateUrgentVariant || null,
                infoVariant: templateInfoVariant || null,
                previewVariant: templatePreviewVariant || null,
                eventTypes: templateEventTypes // Uložit event types do node data
              }
            };
          }
          return n;
        })
      );
    }
  }, [templateNormalVariant, templateUrgentVariant, templateInfoVariant, templatePreviewVariant, templateEventTypes, selectedNode]);
  
  // Načíst seznam uživatelů pro SELECTED scope
  React.useEffect(() => {
    const loadUsersForNode = async () => {
      if (!selectedNode || targetScopeType !== 'SELECTED') {
        setAvailableUsersForRole([]);
        return;
      }

      setLoadingUsers(true);
      try {
        // Pro ROLE node - filtruj uživatele kteří mají tuto roli
        if (selectedNode.data.type === 'role' && selectedNode.data.roleId) {
          const usersWithRole = allUsers.filter(user => 
            user.roles && Array.isArray(user.roles) && user.roles.includes(selectedNode.data.roleId)
          );
          setAvailableUsersForRole(usersWithRole);
        }
        // Pro DEPARTMENT node - filtruj uživatele z tohoto úseku
        else if (selectedNode.data.type === 'department' && selectedNode.data.departmentId) {
          const usersInDepartment = allUsers.filter(user => 
            user.usek_id === selectedNode.data.departmentId
          );
          setAvailableUsersForRole(usersInDepartment);
        }
        // Pro USER node - není třeba seznam
        else {
          setAvailableUsersForRole([]);
        }
      } catch (error) {
        console.error('Error filtering users:', error);
        setAvailableUsersForRole([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsersForNode();
  }, [selectedNode?.data?.roleId, selectedNode?.data?.departmentId, selectedNode?.data?.type, targetScopeType, allUsers]);
  
  // Selection state pro levy panel (checkboxy)
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [selectedDepartments, setSelectedDepartments] = useState(new Set());
  const [selectedLpCodes, setSelectedLpCodes] = useState(new Set()); // ✅ NOVÉ
  const [selectedFinancing, setSelectedFinancing] = useState(new Set()); // ✅ NOVÉ
  const [selectedNotificationTemplates, setSelectedNotificationTemplates] = useState(new Set());
  
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // UI state
  const [showHelp, setShowHelp] = useState(() => {
    const saved = localStorage.getItem('hierarchy_help_collapsed');
    return saved ? saved === 'false' : true; // Default: zobrazit
  });
  
  const [showDetailHelpModal, setShowDetailHelpModal] = useState(false);
  const [showFullscreenEmailModal, setShowFullscreenEmailModal] = useState(false);
  const [fullscreenEmailData, setFullscreenEmailData] = useState(null);
  
  // Custom dialog state
  const [dialog, setDialog] = useState({
    show: false,
    type: 'confirm', // 'confirm' | 'alert' | 'success'
    icon: '❓',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Pokračovat',
    cancelText: 'Zrušit',
    stats: null
  });

  // LocalStorage keys pro persistenci
  const LS_NODES_KEY = 'hierarchy_draft_nodes';
  const LS_EDGES_KEY = 'hierarchy_draft_edges';
  const LS_TIMESTAMP_KEY = 'hierarchy_draft_timestamp';
  const LS_PROFILE_KEY = 'hierarchy_selected_profile';
  const LS_SEARCH_USERS = 'hierarchy_search_users';
  const LS_SEARCH_LOCATIONS = 'hierarchy_search_locations';
  const LS_SEARCH_DEPARTMENTS = 'hierarchy_search_departments';
  const LS_SEARCH_TEMPLATES = 'hierarchy_search_templates';
  const LS_EXPANDED_SECTIONS = 'hierarchy_expanded_sections';

  // State pro sledování, zda byl draft načten
  const [hasDraft, setHasDraft] = useState(false);

  // Auto-save search terms do localStorage
  useEffect(() => {
    localStorage.setItem('hierarchy_search_users', searchUsers);
  }, [searchUsers]);
  
  useEffect(() => {
    localStorage.setItem('hierarchy_search_locations', searchLocations);
  }, [searchLocations]);
  
  useEffect(() => {
    localStorage.setItem('hierarchy_search_departments', searchDepartments);
  }, [searchDepartments]);
  
  useEffect(() => {
    localStorage.setItem('hierarchy_search_templates', searchTemplates);
  }, [searchTemplates]);
  
  // Auto-save expanded sections do localStorage
  useEffect(() => {
    localStorage.setItem('hierarchy_expanded_sections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  // Auto-save do localStorage při změně nodes/edges s MULTI-FIELD validací
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      try {
        // VALIDACE A NORMALIZACE před uložením do localStorage
        const normalizedNodes = nodes.map(node => {
          const normalized = { ...node };
          
          // MIGRACE A VALIDACE scopeDefinition
          if (normalized.data?.scopeDefinition) {
            const scope = normalized.data.scopeDefinition;
            
            // ✅ AUTO-FIX: Doplnit chybějící type podle obsahu
            if (!scope.type) {
              if (scope.fields && scope.fields.length > 0) {
                normalized.data.scopeDefinition.type = 'DYNAMIC_FROM_ENTITY';
              } else if (scope.selectedIds && scope.selectedIds.length > 0) {
                normalized.data.scopeDefinition.type = 'SELECTED';
              } else {
                normalized.data.scopeDefinition.type = 'ALL_IN_ROLE';
              }
            }
            
            // Převést starý formát field na nový fields
            if (scope.field && !scope.fields) {
              normalized.data.scopeDefinition.fields = [scope.field];
              delete normalized.data.scopeDefinition.field;
            }
            
            // Validace fields array
            if (scope.fields && Array.isArray(scope.fields)) {
              const validFields = allUserFields.map(f => f.value);
              
              normalized.data.scopeDefinition.fields = scope.fields.filter(field => {
                const isValid = validFields.includes(field);
                if (!isValid) {
                  console.warn(`❌ [localStorage] Invalid field '${field}' removed from node ${node.id}`);
                }
                return isValid;
              });
            }
          }
          
          return normalized;
        });
        
        const normalizedEdges = edges.map(edge => {
          const normalized = { ...edge };
          
          // MIGRACE edge source_info_recipients: field -> fields
          if (normalized.data?.source_info_recipients) {
            const sourceInfo = normalized.data.source_info_recipients;
            
            if (sourceInfo.field && !sourceInfo.fields) {
              normalized.data.source_info_recipients.fields = [sourceInfo.field];
              delete normalized.data.source_info_recipients.field;
            }
            
            // Validace edge fields
            if (sourceInfo.fields && Array.isArray(sourceInfo.fields)) {
              const validFields = allUserFields.map(f => f.value);
              
              normalized.data.source_info_recipients.fields = sourceInfo.fields.filter(field => {
                return validFields.includes(field);
              });
            }
          }
          
          return normalized;
        });
        
        // Uložit normalizovaná data
        localStorage.setItem(LS_NODES_KEY, JSON.stringify(normalizedNodes));
        localStorage.setItem(LS_EDGES_KEY, JSON.stringify(normalizedEdges));
        localStorage.setItem(LS_TIMESTAMP_KEY, new Date().toISOString());
        
        // Přidat metadata pro multi-field tracking
        localStorage.setItem(`${LS_NODES_KEY}_metadata`, JSON.stringify({
          version: '1.1',
          multiFieldSupport: true,
          nodeCount: normalizedNodes.length,
          edgeCount: normalizedEdges.length,
          lastSaved: new Date().toISOString()
        }));
        
        setHasDraft(true);
        
      } catch (err) {
        console.error('❌ [localStorage] Chyba při ukládání draft hierarchie:', err);
      }
    }
  }, [nodes, edges]);

  // Handler pro smazání vybraných nodes/edges pomocí DELETE klávesy
  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedEdges = edges.filter(e => e.selected);
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return; // Nic není vybráno
    }

    // Zobrazit custom confirm dialog
    setDialog({
      show: true,
      type: 'confirm',
      icon: '🗑️',
      title: 'Smazat vybrané prvky?',
      message: `Opravdu chcete smazat ${selectedNodes.length} uzlů a ${selectedEdges.length} vztahů?`,
      confirmText: 'Smazat',
      cancelText: 'Zrušit',
      onConfirm: () => {
        // Smazat vybrané nodes
        if (selectedNodes.length > 0) {
          const nodeIdsToDelete = selectedNodes.map(n => n.id);
          setNodes(nds => nds.filter(n => !nodeIdsToDelete.includes(n.id)));
          // Smazat i edges spojené s těmito nodes
          setEdges(eds => eds.filter(e => 
            !nodeIdsToDelete.includes(e.source) && 
            !nodeIdsToDelete.includes(e.target)
          ));
        }
        
        // Smazat vybrané edges
        if (selectedEdges.length > 0) {
          const edgeIdsToDelete = selectedEdges.map(e => e.id);
          setEdges(eds => eds.filter(e => !edgeIdsToDelete.includes(e.id)));
        }
        
        setDialog({ ...dialog, show: false });
      },
      onCancel: () => {
        setDialog({ ...dialog, show: false });
      }
    });
  }, [nodes, edges, setNodes, setEdges, dialog]);

  // Keyboard listener pro DELETE klávesu
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Delete nebo Backspace (na Macu)
      if (event.key === 'Delete' || (event.key === 'Backspace' && event.metaKey)) {
        event.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected]);

  // Shift key listener pro změnu kurzoru na crosshair při selection mode
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Shift' && !isShiftPressed) {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    // Reset při ztrátě focusu (např. ALT+TAB)
    const handleBlur = () => {
      setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isShiftPressed]);

  // Load data from API
  useEffect(() => {
    const loadHierarchyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. NEJDŘÍVE zkontrolovat localStorage draft s MULTI-FIELD migrací
        let draftLoaded = false;
        try {
          const savedNodes = localStorage.getItem(LS_NODES_KEY);
          const savedEdges = localStorage.getItem(LS_EDGES_KEY);
          const savedTimestamp = localStorage.getItem(LS_TIMESTAMP_KEY);
          const savedMetadata = localStorage.getItem(`${LS_NODES_KEY}_metadata`);
          
          if (savedNodes && savedEdges && savedTimestamp) {
            const timestamp = new Date(savedTimestamp);
            const hoursSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
            
            // Načíst pouze pokud je draft mladší než 24 hodin
            if (hoursSince < 24) {
              let parsedNodes = JSON.parse(savedNodes);
              let parsedEdges = JSON.parse(savedEdges);
              
              // MIGRACE STARÉHO FORMÁTU: field -> fields
              let needsUpdate = false;
              let parsedMetadata = null;
              
              try {
                parsedMetadata = savedMetadata ? JSON.parse(savedMetadata) : null;
              } catch (e) {
                console.warn('⚠️ [localStorage] Invalid metadata format, will migrate');
              }
              
              const isOldFormat = !parsedMetadata || !parsedMetadata.multiFieldSupport;
              
              if (isOldFormat) {
                
                // MIGRACE NODES: field -> fields
                parsedNodes = parsedNodes.map(node => {
                  if (node.data?.scopeDefinition?.field && !node.data.scopeDefinition.fields) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        scopeDefinition: {
                          ...node.data.scopeDefinition,
                          fields: [node.data.scopeDefinition.field],
                          field: undefined
                        }
                      }
                    };
                  }
                  return node;
                });
                
                // MIGRACE EDGES: source_info field -> fields
                parsedEdges = parsedEdges.map(edge => {
                  if (edge.data?.source_info_recipients?.field && !edge.data.source_info_recipients.fields) {
                    return {
                      ...edge,
                      data: {
                        ...edge.data,
                        source_info_recipients: {
                          ...edge.data.source_info_recipients,
                          fields: [edge.data.source_info_recipients.field],
                          field: undefined
                        }
                      }
                    };
                  }
                  return edge;
                });
                
                needsUpdate = true;
              }
              
              if (parsedNodes.length > 0 || parsedEdges.length > 0) {
                draftLoaded = true;
                setHasDraft(true);
                setNodes(parsedNodes);
                setEdges(parsedEdges);
                
                // Aktualizovat localStorage s migrovanými daty
                if (needsUpdate) {
                  localStorage.setItem(LS_NODES_KEY, JSON.stringify(parsedNodes));
                  localStorage.setItem(LS_EDGES_KEY, JSON.stringify(parsedEdges));
                  localStorage.setItem(`${LS_NODES_KEY}_metadata`, JSON.stringify({
                    version: '1.1',
                    multiFieldSupport: true,
                    migrated: true,
                    migratedAt: new Date().toISOString(),
                    nodeCount: parsedNodes.length,
                    edgeCount: parsedEdges.length
                  }));
                }
              }
            } else {
              // Smazat zastaralý draft
              localStorage.removeItem(LS_NODES_KEY);
              localStorage.removeItem(LS_EDGES_KEY);
              localStorage.removeItem(LS_TIMESTAMP_KEY);
              localStorage.removeItem(`${LS_NODES_KEY}_metadata`);
            }
          }
        } catch (err) {
          console.error('❌ [localStorage] Chyba při načítání draft:', err);
        }

        // 2. Načíst token a user data
        const token = await loadAuthData.token();
        const userData = await loadAuthData.user();
        const username = userData?.username || localStorage.getItem('username');

        const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

        // POST requesty pro PHP API
        const fetchData = async (endpoint) => {
          const response = await fetch(`${apiBase}/${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, username })
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${endpoint}`);
          }
          return response.json();
        };

        // 3. Paralelní načtení dat (BEZ struktury - tu načteme až po zjištění profilu)
        const [usersData, rolesData, locationsData, departmentsData, lpCodesData, financingData, profilesData, notifTypesData, templatesData, eventTypesData] = await Promise.all([
          fetchData('hierarchy/users'),
          fetchData('ciselniky/role/list'),
          fetchData('hierarchy/locations'),
          fetchData('hierarchy/departments'),
          fetchData('hierarchy/lp-codes'), // ✅ NOVÉ: LP KÓDY
          fetchData('hierarchy/financing'), // ✅ NOVÉ: FINANCOVÁNÍ
          fetchData('hierarchy/profiles/list'),
          fetchData('hierarchy/notification-types'),
          fetchData('notifications/templates/list'),
          fetchData('notifications/event-types/list')
        ]);

        const users = usersData.data || [];
        const roles = rolesData.data || [];
        
        // Spočítat počet uživatelů pro každou roli (z pole user.roles)
        const rolesWithUserCount = roles.map(role => {
          const userCount = users.filter(user => {
            // Kontrola, jestli uživatel má tuto roli přiřazenou (user.roles je pole ID)
            return user.roles && Array.isArray(user.roles) && user.roles.includes(role.id);
          }).length;
          
          return {
            ...role,
            userCount: userCount
          };
        });
        
        setAllUsers(users);
        setAllRoles(rolesWithUserCount);
        setAllLocations(locationsData.data || []);
        setAllDepartments(departmentsData.data || []);
        setAllLpCodes(lpCodesData.data || []); // ✅ NOVÉ: Načíst LP KÓDY
        setAllFinancing(financingData.data || []); // ✅ NOVÉ: Načíst FINANCOVÁNÍ
        setNotificationTypes(notifTypesData.data || []);
        setAllNotificationTemplates(templatesData.data || []);
        
        // Normalizovat event types - převést staré kódy na nové
        const normalizedEventTypes = (eventTypesData.data || []).map(eventType => ({
          ...eventType,
          kod: normalizeEventTypeCode(eventType.kod || eventType.code),
          code: normalizeEventTypeCode(eventType.kod || eventType.code)
        }));
        setNotificationEventTypes(normalizedEventTypes);
        
        // Nastavit profily a najít aktivní
        const profilesList = profilesData.data || [];
        setProfiles(profilesList);
        
        // 🔥 PRIORITA načítání profilu:
        // 1. localStorage (poslední vybraný uživatelem)
        // 2. Global Settings (DB default)
        // 3. Fallback: aktivní profil nebo první
        let selectedProfile = null;
        
        // 1. Zkusit načíst z localStorage (poslední volba uživatele)
        const savedProfileId = localStorage.getItem(LS_PROFILE_KEY);
        if (savedProfileId) {
          selectedProfile = profilesList.find(p => p.id === parseInt(savedProfileId));
          if (selectedProfile) {
          }
        }
        
        // 2. Pokud není v localStorage, zkus Global Settings API
        if (!selectedProfile) {
          try {
            const { getGlobalSettings } = await import('../services/globalSettingsApi');
            const globalSettings = await getGlobalSettings(token, username);
            
            if (globalSettings.hierarchy_profile_id) {
              selectedProfile = profilesList.find(p => p.id === parseInt(globalSettings.hierarchy_profile_id));
              if (selectedProfile) {
              }
            }
          } catch (err) {
            console.warn('⚠️ Failed to load profile from Global Settings:', err);
          }
        }
        
        // 3. Fallback: Použít aktivní profil
        if (!selectedProfile) {
          selectedProfile = profilesList.find(p => p.isActive) || profilesList[0];
        }
        
        setCurrentProfile(selectedProfile || null);
        
        
        // 🔥 TEĎ načíst strukturu z structure_json (nové API)
        let structureData = { success: true, data: { nodes: [], edges: [] } };
        if (selectedProfile) {
          structureData = await fetch(`${API_BASE_URL}/hierarchy/profiles/load-structure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, username, profile_id: selectedProfile.id })
          }).then(r => r.json());
        }
        
        
        // Preferovat API data před draftem z localStorage
        const shouldLoadFromApi = structureData.success && structureData.data && (
          (structureData.data.nodes && structureData.data.nodes.length > 0) ||
          (structureData.data.edges && structureData.data.edges.length > 0)
        );

        // 4. Nastavit hierarchickou strukturu z API (preferovat API před draftem)
        if (shouldLoadFromApi) {
          
          // Nové API vrací { nodes, edges } přímo ze structure_json
          const apiNodes = Array.isArray(structureData?.data?.nodes) ? structureData.data.nodes : [];
          const apiEdges = Array.isArray(structureData?.data?.edges) ? structureData.data.edges : [];
          
          
          if (apiNodes.length === 0 && apiEdges.length === 0) {
            console.warn('⚠️ Empty structure data from API - will load empty canvas');
            setNodes([]);
            setEdges([]);
            setLoading(false);
            return;
          }

          
          // API nodes jsou už ve správném formátu (id, typ, pozice, data)
          const flowNodes = apiNodes.map(node => {
            // Normalizovat event types v template nodes
            if (node.data?.type === 'template' && node.data?.eventTypes) {
              return {
                id: node.id,
                type: 'custom',
                position: node.pozice || { x: 100, y: 100 },
                data: {
                  ...node.data,
                  eventTypes: node.data.eventTypes.map(et => normalizeEventTypeCode(et))
                }
              };
            }
            return {
              id: node.id,
              type: 'custom',
              position: node.pozice || { x: 100, y: 100 },
              data: node.data || {}
            };
          });
          
          // API edges jsou už ve správném formátu (id, source, target, typ, data)
          // Normalizovat event types v edges
          const flowEdges = apiEdges.map(edge => {
            if (edge.data?.eventTypes) {
              return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: 'custom',
                animated: false,
                data: {
                  ...edge.data,
                  eventTypes: edge.data.eventTypes.map(et => normalizeEventTypeCode(et))
                }
              };
            }
            return {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              type: 'custom',
              animated: false,
              data: edge.data || {}
            };
          });
          
          setNodes(flowNodes);
          setEdges(flowEdges);
          setHasDraft(false);
          
          // Smazat localStorage draft
          localStorage.removeItem(LS_NODES_KEY);
          localStorage.removeItem(LS_EDGES_KEY);
          localStorage.removeItem(LS_TIMESTAMP_KEY);
          
        } else {
          // Fallback: Načíst draft z localStorage
          
          const savedNodes = localStorage.getItem(LS_NODES_KEY);
          const savedEdges = localStorage.getItem(LS_EDGES_KEY);
          
          if (savedNodes && savedEdges) {
            setNodes(JSON.parse(savedNodes));
            setEdges(JSON.parse(savedEdges));
            setHasDraft(true);
          } else {
            setNodes([]);
            setEdges([]);
            setHasDraft(false);
          }
        }
        
        setLoading(false);
        
      } catch (error) {
        console.error('❌ Error loading initial data:', error);
        setLoading(false);
      }
    };

    loadHierarchyData();
  }, []); // Empty deps - run once on mount

  // Effect: Auto-save nodes/edges to localStorage (draft system)
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      localStorage.setItem(LS_NODES_KEY, JSON.stringify(nodes));
      localStorage.setItem(LS_EDGES_KEY, JSON.stringify(edges));
      localStorage.setItem(LS_TIMESTAMP_KEY, Date.now().toString());
    }
  }, [nodes, edges]);

  // Effect: Profile change handler
  useEffect(() => {
    if (currentProfile && currentProfile.id) {
      // Reload by triggering the main load - just clear nodes/edges
      // Main useEffect will reload on mount
      setNodes([]);
      setEdges([]);
      setLoading(true);
      
      // Note: Actual reload happens in main useEffect on []
      // This just signals UI that we're loading
      setTimeout(() => setLoading(false), 500);
    }
  }, [currentProfile?.id]);

  // Auto-fit graf po načtení nodes
  useEffect(() => {
    if (nodes.length > 0 && reactFlowInstance) {
      // Počkat na render a pak fitView
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
      }, 100);
    }
  }, [nodes.length, reactFlowInstance]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // TODO: Keyboard shortcuts implementation
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const onConnect = useCallback((params) => {
    // Určit typ vztahu a barvu podle source a target nodes
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    // ✅ VALIDACE: Pokud source je TEMPLATE, zkontrolovat zda má definované event types
    if (sourceNode?.data?.type === 'template') {
      const hasEventTypes = sourceNode.data?.eventTypes && sourceNode.data.eventTypes.length > 0;
      
      if (!hasEventTypes) {
        // 🚫 ZAMÍTNOUT spojení - template nemá event types
        if (window.showToast) {
          window.showToast(
            `⚠️ Nelze vytvořit spojení!\n\n` +
            `Šablona "${sourceNode.data?.label || 'Neznámá'}" nemá definované žádné události (Event Types).\n\n` +
            `📝 Nejprve klikněte na šablonu a přidejte alespoň jednu událost v sekci "Typy událostí".`,
            { type: 'warning', timeout: 8000 }
          );
        } else {
          setWarningDialog({
            show: true,
            title: 'Nelze vytvořit spojení!',
            message: `Šablona "${sourceNode.data?.label || 'Neznámá'}" nemá definované žádné události (Event Types).\n\nNejprve klikněte na šablonu a přidejte alespoň jednu událost.`,
            icon: '⚠️'
          });
        }
        return; // ❌ Zrušit vytvoření edge
      }
    }
    
    let relationType = 'user-user';
    if (sourceNode && targetNode) {
      const sourceType = sourceNode.data?.type || 'user';
      const targetType = targetNode.data?.type || 'user';
      relationType = `${sourceType}-${targetType}`;
    }
    
    // Určit barvu podle typu (podle legendy)
    let edgeColor = '#3b82f6'; // výchozí modrá
    if (relationType.includes('template')) {
      edgeColor = '#f59e0b'; // Oranžová pro notifikace (podle legendy)
    } else if (relationType.includes('role')) {
      edgeColor = '#8b5cf6'; // Fialová pro role (podle legendy)
    } else if (relationType.includes('location')) {
      edgeColor = '#92400e'; // Tmavě hnědá pro lokality (podle legendy)
    } else if (relationType.includes('department')) {
      edgeColor = '#059669'; // Tmavě zelená pro úseky (podle legendy)
    } else if (relationType === 'user-user') {
      edgeColor = '#3b82f6'; // Modrá pro uživatel-uživatel (podle legendy)
    }
    
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      markerEnd: { 
        type: MarkerType.ArrowClosed,
        color: edgeColor 
      },
      style: { 
        stroke: edgeColor, 
        strokeWidth: 3 
      },
      data: {
        type: relationType
      }
    }, eds));
  }, [nodes]);

  // Aktualizovat počty uživatelů u rolí, lokalit a úseků po změně edges
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const nodeType = node.data?.type;
        
        // Počítat pouze pro role, lokality a úseky
        if (nodeType === 'role' || nodeType === 'location' || nodeType === 'department') {
          // Najít všechny edges směřující k tomuto nodu (target)
          const connectedEdges = edges.filter(e => e.target === node.id);
          
          // Spočítat unikátní uživatele připojené k tomuto nodu
          const connectedUserNodes = connectedEdges
            .map(e => nodes.find(n => n.id === e.source))
            .filter(n => n?.data?.type === 'user');
          
          const userCount = connectedUserNodes.length;
          
          // Aktualizovat metadata s počtem
          return {
            ...node,
            data: {
              ...node.data,
              metadata: {
                ...node.data.metadata,
                userCount: userCount
              }
            }
          };
        }
        
        return node;
      }));
  }, [edges, nodes.length]); // Závislost na edges a počtu nodes (ne na nodes samotných, aby se zabránilo nekonečné smyčce)

  const onNodeClick = useCallback((event, node) => {
    // Pokud není CTRL/CMD, zobrazit detail panel (single selection)
    if (!event.ctrlKey && !event.metaKey) {
      setSelectedNode(node);
      setSelectedEdge(null);
      setShowDetailPanel(true);
      
      // Načíst template varianty pokud je to template node
      if (node.data?.type === 'template') {
        // ✅ FIX: Pokud je normalVariant prázdný, nastavit na null místo prázdného stringu
        setTemplateNormalVariant(node.data.normalVariant || null);
        setTemplateUrgentVariant(node.data.urgentVariant || null);
        setTemplateInfoVariant(node.data.infoVariant || null);
        setTemplatePreviewVariant(node.data.previewVariant || node.data.normalVariant || null);
        
        // Normalizovat event types při načtení z NODE
        const rawEventTypes = node.data.eventTypes || [];
        const normalizedEventTypes = rawEventTypes.map(et => normalizeEventTypeCode(et));
        setTemplateEventTypes(normalizedEventTypes);
      }
      
      // Načíst TARGET NODE data (role/úsek/user)
      if (node.data?.type === 'role' || node.data?.type === 'department' || node.data?.type === 'user') {
        setTargetScopeType(node.data?.scopeDefinition?.type || 'ALL');
        setTargetScopeField(node.data?.scopeDefinition?.field || 'prikazce_id');
        setTargetScopeFields(node.data?.scopeDefinition?.fields || ['prikazce_id']);
        setTargetSelectedIds(node.data?.scopeDefinition?.selectedIds || []);
        setTargetIncludeSubordinates(node.data?.scopeDefinition?.includeSubordinates || false);
        setTargetDeliveryEmail(node.data?.delivery?.email !== false);
        setTargetDeliveryInApp(node.data?.delivery?.inApp !== false);
        setTargetDeliverySms(node.data?.delivery?.sms === true);
      }
    } else {
      // Multi-select - skrýt detail panel
      setShowDetailPanel(false);
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setShowDetailPanel(true);
    
    // Najit source a target nodes pro zobrazeni jmen
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    // Nacist rozsirene lokality z edge data
    const extendedLocs = edge.data?.extended?.locations || edge.data?.permissions?.extended?.locations || [];
    setSelectedExtendedLocations(extendedLocs);
    
    // Nacist rozsirene useky z edge data
    const extendedDepts = edge.data?.extended?.departments || edge.data?.permissions?.extended?.departments || [];
    setSelectedExtendedDepartments(extendedDepts);
    
    // Nacist notifikacni nastaveni z edge data (STEJNÁ LOGIKA JAKO U NODE)
    setEdgeScopeFilter(edge.data?.scope_filter || 'NONE');
    setEdgeSendEmail(edge.data?.sendEmail || false);
    setEdgeSendInApp(edge.data?.sendInApp !== false);
    setEdgeRecipientRole(edge.data?.priority || edge.data?.recipientRole || 'APPROVAL'); // NOVÉ: priority (fallback na recipientRole pro staré data)
    // Normalizovat event types při načtení z EDGE
    const rawEdgeEventTypes = edge.data?.eventTypes || [];
    const normalizedEdgeEventTypes = rawEdgeEventTypes.map(et => normalizeEventTypeCode(et));
    setEdgeEventTypes(normalizedEdgeEventTypes);
    setRelationshipType(edge.data?.relationshipType || edge.data?.druh_vztahu || 'prime');
    setRelationshipScope(edge.data?.scope || 'OWN');
    
    // Načíst source INFO recipients konfiguraci
    setSourceInfoEnabled(edge.data?.source_info_recipients?.enabled !== false); // Default true
    setSourceInfoFields(edge.data?.source_info_recipients?.fields || ['uzivatel_id', 'garant_uzivatel_id', 'objednatel_id']);
    
    // Nacist viditelnost modulu z edge data (zkontrolovat modules i visibility)
    setModuleVisibility({
      orders: edge.data?.modules?.orders ?? edge.data?.visibility?.objednavky ?? false,
      invoices: edge.data?.modules?.invoices ?? edge.data?.visibility?.faktury ?? false,
      contracts: edge.data?.modules?.contracts ?? edge.data?.visibility?.smlouvy ?? false,
      cashbook: edge.data?.modules?.cashbook ?? edge.data?.visibility?.pokladna ?? false,
      cashbookReadonly: edge.data?.modules?.cashbookReadonly ?? false,
      users: edge.data?.modules?.users ?? edge.data?.visibility?.uzivatele ?? false,
      lp: edge.data?.modules?.lp ?? edge.data?.visibility?.lp ?? false
    });
    
    // Nacist uroven prav z edge data
    setPermissionLevel({
      orders: edge.data?.permissionLevel?.orders || 'READ_ONLY',
      invoices: edge.data?.permissionLevel?.invoices || 'READ_ONLY',
      contracts: edge.data?.permissionLevel?.contracts || 'READ_ONLY',
      cashbook: edge.data?.permissionLevel?.cashbook || 'READ_ONLY'
    });
    
    // Nacist kombinace lokalita+utvar z edge data
    const combos = edge.data?.extended?.combinations || edge.data?.permissions?.extended?.combinations || [];
    setSelectedCombinations(combos);
    
    // Nacist typy notifikaci z edge data
    const notifTypes = edge.data?.notifications?.types || edge.data?.permissions?.notifications?.types || [];
    setSelectedNotificationTypes(notifTypes);
    
    // Pridat metadata k edge pro zobrazeni
    setSelectedEdge({
      ...edge,
      metadata: {
        sourceName: sourceNode?.data?.name || 'Neznamy',
        targetName: targetNode?.data?.name || 'Neznamy',
        sourceType: sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user',
        targetType: targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user'
      }
    });
  }, [nodes]);
  
  // Helper funkce pro určení typu vztahu
  const getRelationshipTypeInfo = useCallback((sourceType, targetType) => {
    const types = {
      'user-user': {
        label: 'Uživatel → Uživatel',
        icon: '👤→👤',
        description: 'Klasický nadřízený-podřízený vztah',
        sourceLabel: 'Nadřízený (získává práva)',
        targetLabel: 'Podřízený (sdílí data)',
        showScope: true,
        showExtended: true,
        showModules: true,
        explanation: (source, target) => `${source} získá práva vidět data od ${target} podle nastavení rozsahu a modulů.`
      },
      'location-user': {
        label: 'Lokalita → Uživatel',
        icon: '📍→👤',
        description: 'Všichni uživatelé z lokality sdílí data nadřízenému',
        sourceLabel: 'Lokalita (zdroj dat)',
        targetLabel: 'Nadřízený uživatel (získává data)',
        showScope: false, // Scope je implicitně LOCATION
        showExtended: false,
        showModules: true,
        explanation: (source, target) => `${target} získá práva vidět data od VŠECH uživatelů v lokalitě ${source}.`
      },
      'user-location': {
        label: 'Uživatel → Lokalita',
        icon: '👤→📍',
        description: 'Nadřízený vidí všechny uživatele v lokalitě',
        sourceLabel: 'Nadřízený uživatel (získává práva)',
        targetLabel: 'Lokalita (zdroj dat)',
        showScope: false, // Scope je implicitně LOCATION
        showExtended: true,
        showModules: true,
        explanation: (source, target) => `${source} získá práva vidět data od VŠECH uživatelů v lokalitě ${target}.`
      },
      'department-user': {
        label: 'Úsek → Uživatel',
        icon: '🏢→👤',
        description: 'Všichni uživatelé z úseku sdílí data nadřízenému',
        sourceLabel: 'Úsek (zdroj dat)',
        targetLabel: 'Nadřízený uživatel (získává data)',
        showScope: false, // Scope je implicitně TEAM
        showExtended: false,
        showModules: true,
        explanation: (source, target) => `${target} získá práva vidět data od VŠECH uživatelů v úseku ${source}.`
      },
      'user-department': {
        label: 'Uživatel → Úsek',
        icon: '👤→🏢',
        description: 'Nadřízený vidí všechny uživatele v úseku',
        sourceLabel: 'Nadřízený uživatel (získává práva)',
        targetLabel: 'Úsek (zdroj dat)',
        showScope: false, // Scope je implicitně TEAM
        showExtended: true,
        showModules: true,
        explanation: (source, target) => `${source} získá práva vidět data od VŠECH uživatelů v úseku ${target}.`
      },
      'template-user': {
        label: 'Notifikační šablona → Uživatel',
        icon: '📧→👤',
        description: 'Uživatel bude dostávat notifikace z této šablony',
        sourceLabel: 'Notifikační šablona',
        targetLabel: 'Příjemce (uživatel)',
        showScope: false,
        showExtended: false,
        showModules: false,
        explanation: (source, target) => `${target} bude dostávat notifikace typu "${source}".`
      },
      'template-location': {
        label: 'Notifikační šablona → Lokalita',
        icon: '📧→📍',
        description: 'Všichni uživatelé v lokalitě budou dostávat notifikace',
        sourceLabel: 'Notifikační šablona',
        targetLabel: 'Příjemci (lokalita)',
        showScope: false,
        showExtended: false,
        showModules: false,
        explanation: (source, target) => `VŠICHNI uživatelé v lokalitě ${target} budou dostávat notifikace typu "${source}".`
      },
      'template-department': {
        label: 'Notifikační šablona → Úsek',
        icon: '📧→🏢',
        description: 'Všichni uživatelé v úseku budou dostávat notifikace',
        sourceLabel: 'Notifikační šablona',
        targetLabel: 'Příjemci (úsek)',
        showScope: false,
        showExtended: false,
        showModules: false,
        explanation: (source, target) => `VŠICHNI uživatelé v úseku ${target} budou dostávat notifikace typu "${source}".`
      },
      'user-role': {
        label: 'Uživatel → Role',
        icon: '👤→🛡️',
        description: 'Uživatel získává oprávnění z role',
        sourceLabel: 'Uživatel (příjemce práv)',
        targetLabel: 'Role (zdroj oprávnění)',
        showScope: false,
        showExtended: false,
        showModules: true,
        explanation: (source, target) => `${source} má přiřazenou roli ${target} a získává z ní oprávnění pro moduly.`
      },
      'role-user': {
        label: 'Role → Uživatel',
        icon: '🛡️→👤',
        description: 'Role přiřazuje oprávnění uživateli',
        sourceLabel: 'Role (zdroj oprávnění)',
        targetLabel: 'Uživatel (příjemce práv)',
        showScope: false,
        showExtended: false,
        showModules: true,
        explanation: (source, target) => `Role ${source} přiřazuje oprávnění uživateli ${target}.`
      },
      'template-role': {
        label: 'Notifikační šablona → Role',
        icon: '📧→🛡️',
        description: 'Všichni uživatelé s rolí budou dostávat notifikace',
        sourceLabel: 'Notifikační šablona',
        targetLabel: 'Příjemci (role)',
        showScope: false,
        showExtended: false,
        showModules: false,
        explanation: (source, target) => `VŠICHNI uživatelé s rolí ${target} budou dostávat notifikace typu "${source}".`
      },
      'department-role': {
        label: 'Úsek → Role',
        icon: '🏢→🛡️',
        description: 'Uživatelé s danou rolí v úseku získávají viditelnost dat',
        sourceLabel: 'Úsek (zdroj dat)',
        targetLabel: 'Role (získává práva)',
        showScope: true,
        showExtended: false,
        showModules: true,
        explanation: (source, target) => `Všichni uživatelé s rolí ${target} získají práva vidět data z úseku ${source}.`
      },
      'role-department': {
        label: 'Role → Úsek',
        icon: '🛡️→🏢',
        description: 'Role získává viditelnost dat z úseku',
        sourceLabel: 'Role (získává práva)',
        targetLabel: 'Úsek (zdroj dat)',
        showScope: true,
        showExtended: false,
        showModules: true,
        explanation: (source, target) => `Uživatelé s rolí ${source} získají práva vidět data z úseku ${target}.`
      },
      'location-role': {
        label: 'Lokalita → Role',
        icon: '📍→🛡️',
        description: 'Uživatelé s danou rolí v lokalitě získávají viditelnost dat',
        sourceLabel: 'Lokalita (zdroj dat)',
        targetLabel: 'Role (získává práva)',
        showScope: true,
        showExtended: false,
        showModules: true,
        explanation: (source, target) => `Všichni uživatelé s rolí ${target} získají práva vidět data z lokality ${source}.`
      },
      'role-location': {
        label: 'Role → Lokalita',
        icon: '🛡️→📍',
        description: 'Role získává viditelnost dat z lokality',
        sourceLabel: 'Role (získává práva)',
        targetLabel: 'Lokalita (zdroj dat)',
        showScope: true,
        showExtended: false,
        showModules: true,
        explanation: (source, target) => `Uživatelé s rolí ${source} získají práva vidět data z lokality ${target}.`
      },
      'role-role': {
        label: 'Role → Role',
        icon: '🛡️→🛡️',
        description: 'Hierarchický vztah mezi rolemi (nadřízená → podřízená)',
        sourceLabel: 'Nadřízená role (získává práva)',
        targetLabel: 'Podřízená role (sdílí data)',
        showScope: true,
        showExtended: true,
        showModules: true,
        explanation: (source, target) => `${source} získá práva vidět data od uživatelů s rolí ${target}. Rozsah a Moduly určují, co přesně uvidí (objednávky/faktury/pokladnu).`
      },
      // ✅ NOVÉ: Vztahy pro LP KÓDY a FINANCOVÁNÍ
      'user-lp_kod': {
        label: 'Uživatel → LP kód',
        icon: '👤→📋',
        description: 'Uživatel má přístup k LP kódu pro čerpání',
        sourceLabel: 'Uživatel (čerpající)',
        targetLabel: 'LP kód (limitovaný příslib)',
        showScope: false, // LP kód nemá scope jako data
        showExtended: false,
        showModules: false, // LP kód není modul
        explanation: (source, target) => `${source} může čerpat z LP kódu ${target}.`
      },
      'user-financing': {
        label: 'Uživatel → Způsob financování',
        icon: '👤→💰',
        description: 'Uživatel má přístup k tomuto způsobu financování',
        sourceLabel: 'Uživatel (čerpající)',
        targetLabel: 'Způsob financování',
        showScope: false,
        showExtended: false,
        showModules: false,
        explanation: (source, target) => `${source} může používat způsob financování ${target}.`
      },
      'role-lp_kod': {
        label: 'Role → LP kód',
        icon: '🛡️→📋',
        description: 'Všichni uživatelé s rolí mohou čerpat z LP kódu',
        sourceLabel: 'Role (čerpající)',
        targetLabel: 'LP kód (limitovaný příslib)',
        showScope: false,
        showExtended: false,
        showModules: false,
        explanation: (source, target) => `Všichni uživatelé s rolí ${source} mohou čerpat z LP kódu ${target}.`
      },
      'role-financing': {
        label: 'Role → Způsob financování',
        icon: '🛡️→💰',
        description: 'Všichni uživatelé s rolí mohou používat tento způsob financování',
        sourceLabel: 'Role (čerpající)',
        targetLabel: 'Způsob financování',
        showScope: false,
        showExtended: false,
        showModules: false,
        explanation: (source, target) => `Všichni uživatelé s rolí ${source} mohou používat způsob financování ${target}.`
      }
    };
    
    const key = `${sourceType}-${targetType}`;
    return types[key] || types['user-user']; // Fallback na user-user
  }, []);

  // Handler pro automatické uložení layout pozic po přetažení uzlu
  const onNodeDragStop = useCallback(async (event, node) => {
    
    // Aktualizovat pozici uzlu v state (už je hotovo přes onNodesChange)
    // Nyní jen zalogovat pro debug
    const updatedNode = nodes.find(n => n.id === node.id);
  }, [nodes]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // === SELECTION HANDLERS PRO LEVÝ PANEL ===
  
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleLocationSelection = (locationId) => {
    setSelectedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const toggleDepartmentSelection = (deptId) => {
    setSelectedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  const toggleLpCodeSelection = (lpId) => { // ✅ NOVÉ
    setSelectedLpCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lpId)) {
        newSet.delete(lpId);
      } else {
        newSet.add(lpId);
      }
      return newSet;
    });
  };

  const toggleFinancingSelection = (finId) => { // ✅ NOVÉ
    setSelectedFinancing(prev => {
      const newSet = new Set(prev);
      if (newSet.has(finId)) {
        newSet.delete(finId);
      } else {
        newSet.add(finId);
      }
      return newSet;
    });
  };

  const toggleRoleSelection = (roleId) => {
    setSelectedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const selectAllUsers = () => {
    setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
  };

  const deselectAllUsers = () => {
    setSelectedUsers(new Set());
  };

  const selectAllLocations = () => {
    setSelectedLocations(new Set(filteredLocations.map(l => l.id)));
  };

  const deselectAllLocations = () => {
    setSelectedLocations(new Set());
  };

  const selectAllDepartments = () => {
    setSelectedDepartments(new Set(filteredDepartments.map(d => d.id)));
  };

  const deselectAllDepartments = () => {
    setSelectedDepartments(new Set());
  };

  const selectAllLpCodes = () => { // ✅ NOVÉ
    setSelectedLpCodes(new Set(filteredLpCodes.map(l => l.id)));
  };

  const deselectAllLpCodes = () => { // ✅ NOVÉ
    setSelectedLpCodes(new Set());
  };

  const selectAllFinancing = () => { // ✅ NOVÉ
    setSelectedFinancing(new Set(filteredFinancing.map(f => f.id)));
  };

  const deselectAllFinancing = () => { // ✅ NOVÉ
    setSelectedFinancing(new Set());
  };

  const toggleNotificationTemplateSelection = (templateId) => {
    setSelectedNotificationTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const selectAllNotificationTemplates = () => {
    setSelectedNotificationTemplates(new Set(filteredNotificationTemplates.map(t => t.id)));
  };

  const deselectAllNotificationTemplates = () => {
    setSelectedNotificationTemplates(new Set());
  };

  // Přidat vybrané položky na plochu
  const addSelectedToCanvas = () => {
    const newNodes = [];
    let index = nodes.length;
    const timestamp = Date.now();

    // Přidat vybrané uživatele (povolujeme duplicity)
    selectedUsers.forEach((userId, userIndex) => {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        newNodes.push({
          id: `user-${userId}-${timestamp}-${userIndex}`,
          type: 'custom',
          position: {
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 180
          },
          data: {
            userId: userId, // Původní user ID
            name: user.name,
            position: user.position,
            initials: user.initials,
            metadata: {
              location: user.location,
              department: user.department
            }
          }
        });
        index++;
      }
    });

    // Přidat vybrané lokality jako samostatné nodes
    selectedLocations.forEach((locationId, locIndex) => {
      const location = allLocations.find(l => l.id === locationId);
      if (location) {
        newNodes.push({
          id: `location-${locationId}-${timestamp}-${locIndex}`,
          type: 'custom',
          position: {
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 180
          },
          data: {
            type: 'location',
            locationId: locationId,
            name: location.name
          }
        });
        index++;
      }
    });

    // Přidat vybrané útvary jako samostatné nodes
    selectedDepartments.forEach((deptId, deptIndex) => {
      const department = allDepartments.find(d => d.id === deptId);
      if (department) {
        newNodes.push({
          id: `department-${deptId}-${timestamp}-${deptIndex}`,
          type: 'custom',
          position: {
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 180
          },
          data: {
            type: 'department',
            departmentId: deptId,
            name: department.name
          }
        });
        index++;
      }
    });

    // Přidat vybrané notifikační šablony jako samostatné nodes
    selectedNotificationTemplates.forEach((templateId, tplIndex) => {
      const template = allNotificationTemplates.find(t => t.id === templateId);
      if (template) {
        newNodes.push({
          id: `template-${templateId}-${timestamp}-${tplIndex}`,
          type: 'custom',
          position: {
            x: 100 + (index % 5) * 250,
            y: 100 + Math.floor(index / 5) * 180
          },
          data: {
            type: 'template',
            templateId: templateId,
            name: template.nazev || template.name,
            position: 'Notifikační šablona',
            initials: '🔔',
            metadata: {
              type: 'template',
              template: template.nazev || template.name
            }
          }
        });
        index++;
      }
    });

    if (newNodes.length > 0) {
      setNodes(prevNodes => [...prevNodes, ...newNodes]);
      
      // Vymazat výběr
      setSelectedUsers(new Set());
      setSelectedLocations(new Set());
      setSelectedDepartments(new Set());
    }
  };

  // Store dragged item info for HTML5 drag & drop
  const [draggedItem, setDraggedItem] = React.useState(null);

  const onReactFlowDrop = (event) => {
    event.preventDefault();
    
    if (!draggedItem) {
      return;
    }
    
    if (!reactFlowInstance) {
      return;
    }
    
    const dragId = draggedItem;
    
    // Najdi ReactFlow wrapper (.react-flow) a získej jeho pozici
    const reactFlowElement = event.currentTarget.querySelector('.react-flow');
    if (!reactFlowElement) {
      console.error('⚠️ ReactFlow element not found');
      return;
    }
    
    const reactFlowBounds = reactFlowElement.getBoundingClientRect();
    
    // Vypočítej pozici pomocí screenToFlowPosition (ReactFlow 11.x)
    // Odečti polovinu šířky/výšky nodu, aby kurzor byl přibližně ve středu karty
    const nodeWidth = 220;  // Přibližná šířka custom node
    const nodeHeight = 80;  // Přibližná výška custom node
    
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - nodeWidth / 2,
      y: event.clientY - nodeHeight / 2,
    });
    
    // Zpracování notifikační šablony - přidat jako node
    if (dragId.startsWith('notif-')) {
      const notifId = parseInt(dragId.replace('notif-', ''), 10);
      const template = allNotificationTemplates.find(t => t.id === notifId);
      
      if (template) {
        const nodeId = `template-${notifId}-${Date.now()}`;
        
        // 🔥 AUTOMATICKY NASTAVIT EVENT TYPE z template.typ (normalizovat staré kódy)
        const templateEventType = template.typ || template.type;
        const normalizedTemplateEventType = templateEventType ? normalizeEventTypeCode(templateEventType) : null;
        const initialEventTypes = normalizedTemplateEventType ? [normalizedTemplateEventType] : [];
        
        const newNode = {
          id: nodeId,
          type: 'custom',
          position,
          data: {
            type: 'template',
            templateId: notifId,
            name: template.nazev || template.name,
            position: 'Notifikační šablona',
            initials: '🔔',
            eventTypes: initialEventTypes, // ✅ Přidat event types hned při vytvoření
            metadata: {
              type: 'template',
              template: template.nazev || template.name
            }
          }
        };
        
        setNodes((nds) => [...nds, newNode]);
      }
      return;
    }
    
    // Zpracování role - přidat jako node
    if (dragId.startsWith('role-')) {
      const roleId = parseInt(dragId.replace('role-', ''), 10);
      const role = allRoles.find(r => r.id === roleId);
      
      if (role) {
        const nodeId = `role-${roleId}-${Date.now()}`;
        
        const newNode = {
          id: nodeId,
          type: 'custom',
          position,
          data: {
            type: 'role',
            roleId: roleId,
            name: role.nazev_role,
            label: role.nazev_role,
            metadata: {
              type: 'role',
              popis: role.popis || '',
              orders: role.orders || 0,
              invoices: role.invoices || 0,
              cashbook: role.cashbook || 0
            }
          }
        };
        
        setNodes((nds) => [...nds, newNode]);
      }
      return;
    }
    
    // Zpracování uživatele
    if (!dragId.startsWith('loc-') && !dragId.startsWith('dept-') && !dragId.startsWith('role-') && !dragId.startsWith('lp-') && !dragId.startsWith('fin-')) {
      const user = allUsers.find(u => u.id === dragId);
      
      if (user) {
        // Generuj unikátní ID pro node (povoluje duplicity stejného uživatele)
        const nodeId = `user-${dragId}-${Date.now()}`;
        
        const newNode = {
          id: nodeId,
          type: 'custom',
          position,
          data: {
            type: 'user',
            userId: dragId, // Původní user ID pro propojení s DB
            name: user.name,
            position: user.position,
            initials: user.initials,
            metadata: {
              location: user.location,
              department: user.department
            }
          }
        };
        
        setNodes((nds) => [...nds, newNode]);
      }
      return;
    }
    
    // Zpracovani lokality - prida samotnou lokalitu jako node
    if (dragId.startsWith('loc-')) {
      const locationId = dragId.replace('loc-', '');
      const location = allLocations.find(l => l.id === locationId);
      
      if (!location) {
        console.error('❌ Location not found:', locationId);
        return;
      }
      
      const nodeId = `location-${locationId}-${Date.now()}`;
      
      const newNode = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          type: 'location',
          locationId: locationId,
          name: location.name,
          position: 'Lokalita',
          initials: location.name.substring(0, 2).toUpperCase(),
          metadata: {
            type: 'location',
            location: location.name
          }
        }
      };
      
      setNodes((nds) => [...nds, newNode]);
      return;
    }
    
    // Zpracovani utvaru - prida samotny utvar jako node
    if (dragId.startsWith('dept-')) {
      const deptId = dragId.replace('dept-', '');
      const department = allDepartments.find(d => d.id === deptId);
      
      if (!department) {
        console.error('❌ Department not found:', deptId);
        return;
      }
      
      const nodeId = `department-${deptId}-${Date.now()}`;
      
      const newNode = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          type: 'department',
          departmentId: deptId,
          name: department.name,
          position: 'Utvar',
          initials: department.name.substring(0, 2).toUpperCase(),
          metadata: {
            type: 'department',
            department: department.name
          }
        }
      };
      
      setNodes((nds) => [...nds, newNode]);
      return;
    }

    // Zpracování role
    if (dragId.startsWith('role-')) {
      const roleId = dragId.replace('role-', '');
      const role = allRoles.find(r => r.id === roleId);
      
      if (role) {
        const nodeId = `role-${roleId}-${Date.now()}`;
        
        const newNode = {
          id: nodeId,
          type: 'custom',
          position,
          data: {
            type: 'role',
            roleId: roleId,
            name: role.nazev_role,
            position: role.popis || 'Role',
            metadata: {
              userCount: role.userCount,
              description: role.popis
            }
          }
        };
        
        setNodes((nds) => [...nds, newNode]);
      }
      return;
    }

    // ✅ NOVÉ: Zpracování LP kódu
    if (dragId.startsWith('lp-')) {
      const lpId = dragId.replace('lp-', '');
      const lp = allLpCodes.find(l => String(l.id) === String(lpId));
      
      if (!lp) {
        console.error('❌ LP kód nenalezen:', lpId, 'dostupné:', allLpCodes.map(l => l.id));
        return;
      }
      
      const nodeId = `lp-${lpId}-${Date.now()}`;
      
      const newNode = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          type: 'lp_kod',
          lp_id: lp.lp_id || lp.id,
          lp_cislo: lp.lp_cislo,
          nazev: lp.nazev,
          usek: lp.usek,
          metadata: {
            lp_id: lp.lp_id || lp.id,
            orderCount: lp.orderCount || 0
          }
        }
      };
      
      setNodes((nds) => [...nds, newNode]);
      return;
    }

    // ✅ NOVÉ: Zpracování financování
    if (dragId.startsWith('fin-')) {
      const finId = dragId.replace('fin-', '');
      const fin = allFinancing.find(f => String(f.id) === String(finId));
      
      if (!fin) {
        console.error('❌ Financování nenalezeno:', finId, 'dostupné:', allFinancing.map(f => f.id));
        return;
      }
      
      const nodeId = `fin-${finId}-${Date.now()}`;
      
      const newNode = {
        id: nodeId,
        type: 'custom',
        position,
        data: {
          type: 'financing',
          financing_id: finId,
          typ: fin.typ,
          nazev: fin.nazev || fin.typ,
          popis: fin.popis,
          metadata: {
            description: fin.popis || ''
          }
        }
      };
      
      setNodes((nds) => [...nds, newNode]);
      return;
    }
  };

  const onReactFlowDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleAutoGenerateHierarchy = () => {
    // Kontrola zda jsou vybrané nody na ploše
    const selectedNodes = nodes.filter(n => n.selected);
    
    if (selectedNodes.length === 0) {
      setDialog({
        show: true,
        type: 'alert',
        icon: '⚠️',
        title: 'Žádné položky nevybrány na ploše',
        message: 'Pro vytvoření AI hierarchie musíte nejprve vybrat nody na ploše.\n\nPoužijte:\n• Táhněte myší pro výběr oblasti (crosshair kurzor)\n• CTRL+klik pro individuální výběr\n• SHIFT+klik pro rozsah',
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
      return;
    }

    // Generovat hierarchii pouze z vybraných nodů na ploše
    generateHierarchyFromSelectedNodes(selectedNodes);
  };

  // Automatické rozložení grafu pomocí dagre
  const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    const nodeWidth = 200;
    const nodeHeight = 120;
    
    dagreGraph.setGraph({ 
      rankdir: direction,
      nodesep: 80,      // Horizontální mezera mezi uzly
      ranksep: 120,     // Vertikální mezera mezi úrovněmi
      marginx: 50,
      marginy: 50
    });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  };

  // Pomocná funkce pro výpočet skóre shody mezi dvěma zkratkami útvarů
  // Vrací číslo 0-100, čím vyšší tím lepší shoda
  const getDepartmentMatchScore = (code1, code2) => {
    if (!code1 || !code2) return 0;
    
    const c1 = code1.trim().toUpperCase();
    const c2 = code2.trim().toUpperCase();
    
    if (c1 === c2) return 100; // Přesná shoda
    
    // Rozdělit na části (např. "PTN BN" -> ["PTN", "BN"])
    const parts1 = c1.split(/\s+/);
    const parts2 = c2.split(/\s+/);
    
    // Počet společných částí
    let commonParts = 0;
    parts1.forEach(p1 => {
      if (parts2.includes(p1)) commonParts++;
    });
    
    if (commonParts === 0) return 0;
    
    // Skóre = (počet společných částí / větší počet částí) * 80
    const maxParts = Math.max(parts1.length, parts2.length);
    return Math.floor((commonParts / maxParts) * 80);
  };
  
  // Najde nejlepšího nadřízeného ze seznamu podle shody útvaru
  const findBestDepartmentMatch = (user, candidates) => {
    if (!candidates || candidates.length === 0) return null;
    if (!user?.departmentCode) return candidates[0]; // Fallback na prvního
    
    let bestMatch = null;
    let bestScore = 0;
    
    candidates.forEach(candidate => {
      const score = getDepartmentMatchScore(user.departmentCode, candidate.departmentCode);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    });
    
    // Vrátit pouze pokud je skóre > 0 (aspoň nějaká shoda)
    return bestScore > 0 ? bestMatch : null;
  };

  const generateHierarchyFromSelected = () => {

    // Získat všechny vybrané uživatele
    let selectedUsersList = [];
    
    // Přidat přímo vybrané uživatele
    selectedUsers.forEach(userId => {
      const user = allUsers.find(u => u.id === userId);
      if (user) selectedUsersList.push(user);
    });
    
    // Přidat uživatele z vybraných lokalit
    selectedLocations.forEach(locationId => {
      const location = allLocations.find(l => l.id === locationId);
      if (location) {
        const usersInLocation = allUsers.filter(u => u.location === location.name);
        usersInLocation.forEach(user => {
          if (!selectedUsersList.find(u => u.id === user.id)) {
            selectedUsersList.push(user);
          }
        });
      }
    });
    
    // Přidat uživatele z vybraných útvarů
    selectedDepartments.forEach(deptId => {
      const department = allDepartments.find(d => d.id === deptId);
      if (department) {
        const usersInDept = allUsers.filter(u => u.department === department.name);
        usersInDept.forEach(user => {
          if (!selectedUsersList.find(u => u.id === user.id)) {
            selectedUsersList.push(user);
          }
        });
      }
    });

    if (selectedUsersList.length === 0) {
      setDialog({
        show: true,
        type: 'alert',
        icon: '⚠️',
        title: 'Žádní uživatelé',
        message: 'Ve vybraných položkách nejsou žádní uživatelé.',
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
      return;
    }


    // Analyzovat role z vybraných uživatelů
    const director = selectedUsersList.find(u => {
      const pos = u.position?.toLowerCase() || '';
      return pos === 'ředitel' || pos === 'ředitelka';
    });
    
    const deputies = selectedUsersList.filter(u => 
      u.position?.toLowerCase().includes('náměstek')
    );
    
    const directorHeads = selectedUsersList.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      return pos.includes('vedoucí') && (dept.includes('ředitel') || pos.includes('ředitel'));
    });
    
    const heads = selectedUsersList.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      return pos.includes('vedoucí') && !dept.includes('ředitel') && !pos.includes('ředitel');
    });
    
    const others = selectedUsersList.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      return !pos.includes('ředitel') &&
             !pos.includes('náměstek') &&
             !pos.includes('vedoucí');
    });

    // Vytvořit nodes a edges
    const newNodes = [];
    const newEdges = [];
    const timestamp = Date.now();

    // Ředitel
    if (director) {
      newNodes.push({
        id: `user-${director.id}-${timestamp}-0`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: director.id,
          name: director.name,
          position: director.position,
          initials: director.initials,
          metadata: {
            location: director.location,
            department: director.department
          }
        }
      });
    }

    // Náměstci
    deputies.forEach((deputy, i) => {
      const nodeId = `user-${deputy.id}-${timestamp}-${i + 1}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: deputy.id,
          name: deputy.name,
          position: deputy.position,
          initials: deputy.initials,
          metadata: {
            location: deputy.location,
            department: deputy.department
          }
        }
      });

      if (director) {
        newEdges.push({
          id: `e-${newNodes[0].id}-${nodeId}`,
          source: newNodes[0].id,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      }
    });

    // Vedoucí úseku ředitele
    let nodeIndex = 1 + deputies.length;
    directorHeads.forEach((head, i) => {
      const nodeId = `user-${head.id}-${timestamp}-${nodeIndex + i}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: head.id,
          name: head.name,
          position: head.position,
          initials: head.initials,
          metadata: {
            location: head.location,
            department: head.department
          }
        }
      });

      if (director) {
        newEdges.push({
          id: `e-${newNodes[0].id}-${nodeId}`,
          source: newNodes[0].id,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      }
    });

    // Ostatní vedoucí
    nodeIndex += directorHeads.length;
    heads.forEach((head, i) => {
      const nodeId = `user-${head.id}-${timestamp}-${nodeIndex + i}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: head.id,
          name: head.name,
          position: head.position,
          initials: head.initials,
          metadata: {
            location: head.location,
            department: head.department
          }
        }
      });

      // Připojit k náměstkovi se stejným útvarem
      const deputyWithSameDept = deputies.find(d => d.department === head.department);
      if (deputyWithSameDept) {
        const deputyNode = newNodes.find(n => n.data.userId === deputyWithSameDept.id);
        if (deputyNode) {
          newEdges.push({
            id: `e-${deputyNode.id}-${nodeId}`,
            source: deputyNode.id,
            target: nodeId,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      } else if (director) {
        // Fallback na ředitele
        newEdges.push({
          id: `e-${newNodes[0].id}-${nodeId}`,
          source: newNodes[0].id,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      }
    });

    // Ostatní zaměstnanci
    nodeIndex += heads.length;
    others.forEach((user, i) => {
      const nodeId = `user-${user.id}-${timestamp}-${nodeIndex + i}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          userId: user.id,
          name: user.name,
          position: user.position,
          initials: user.initials,
          metadata: {
            location: user.location,
            department: user.department
          }
        }
      });

      // Připojit k vedoucímu stejného útvaru
      const headWithSameDept = heads.find(h => h.department === user.department);
      if (headWithSameDept) {
        const headNode = newNodes.find(n => n.data.userId === headWithSameDept.id);
        if (headNode) {
          newEdges.push({
            id: `e-${headNode.id}-${nodeId}`,
            source: headNode.id,
            target: nodeId,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      }
    });

    // Aplikovat layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, 'TB');
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Vyčistit výběr
    setSelectedUsers(new Set());
    setSelectedLocations(new Set());
    setSelectedDepartments(new Set());

    setDialog({
      show: true,
      type: 'success',
      icon: '✅',
      title: 'AI Hierarchie vytvořena!',
      message: 'Hierarchie byla automaticky vygenerovana z vybranych polozek.\nZkontrolujte strukturu a pripadne upravte.\nNezapomente ulozit!',
      stats: {
        'Ředitel': director ? '1' : '0',
        'Náměstci': deputies.length,
        'Vedoucí úseku ředitele': directorHeads.length,
        'Vedoucí ostatních úseků': heads.length,
        'Ostatní': others.length,
        '─────────': '─────',
        'Celkem uzlů': layoutedNodes.length,
        'Celkem vztahů': layoutedEdges.length
      },
      onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'OK',
      cancelText: null
    });
  };

  // Nová funkce pro práci s vybranými nody na ploše
  const generateHierarchyFromSelectedNodes = (selectedNodes) => {

    if (selectedNodes.length === 0) return;

    // Analyzovat role z vybraných nodů
    const director = selectedNodes.find(n => {
      const pos = n.data.position?.toLowerCase() || '';
      return pos === 'ředitel' || pos === 'ředitelka';
    });
    
    const deputies = selectedNodes.filter(n => 
      n.data.position?.toLowerCase().includes('náměstek')
    );
    
    const heads = selectedNodes.filter(n => 
      n.data.position?.toLowerCase().includes('vedoucí')
    );
    
    const others = selectedNodes.filter(n => 
      !n.data.position?.toLowerCase().includes('ředitel') &&
      !n.data.position?.toLowerCase().includes('náměstek') &&
      !n.data.position?.toLowerCase().includes('vedoucí')
    );

    // Vytvo\u0159 nové edges podle hierarchie
    const newEdges = [];
    const timestamp = Date.now();

    // Náměstci -> Ředitel
    if (director) {
      deputies.forEach(deputy => {
        newEdges.push({
          id: `e-${director.id}-${deputy.id}-${timestamp}`,
          source: director.id,
          target: deputy.id,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      });

      // Vedoucí -> Ředitel nebo Náměstek (podle útvaru)
      heads.forEach(head => {
        const deputyWithSameDept = deputies.find(d => 
          d.data.metadata?.department === head.data.metadata?.department
        );
        
        const sourceNode = deputyWithSameDept || director;
        newEdges.push({
          id: `e-${sourceNode.id}-${head.id}-${timestamp}`,
          source: sourceNode.id,
          target: head.id,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#667eea', strokeWidth: 3 }
        });
      });
    }

    // Odstranit staré edges mezi vybranými nody
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => 
      !selectedNodeIds.has(e.source) || !selectedNodeIds.has(e.target)
    );

    // Přidat nové edges
    const updatedEdges = [...filteredEdges, ...newEdges];
    
    // Aplikovat layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, updatedEdges, 'TB');
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    setDialog({
      show: true,
      type: 'success',
      icon: '✅',
      title: 'Hierarchie reorganizována!',
      message: `Vybrané nody (${selectedNodes.length}) byly reorganizovány podle rolí.\nZkontrolujte strukturu a případně upravte.`,
      stats: {
        'Ředitel': director ? '1' : '0',
        'Náměstci': deputies.length,
        'Vedoucí': heads.length,
        'Ostatní': others.length,
        '─────────': '─────',
        'Nové vztahy': newEdges.length
      },
      onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'OK',
      cancelText: null
    });
  };

  const generateHierarchy = () => {


    // Pokud už existují vztahy (načtené z DB), použít je a jen aplikovat layout
    if (edges.length > 0) {
      
      // Vytvořit nodes ze všech uživatelů
      const existingNodes = allUsers.map((user) => ({
        id: user.id,
        type: 'custom',
        position: { x: 0, y: 0 }, // Bude přepočítáno dagre
        data: {
          name: user.name,
          position: user.position,
          initials: user.initials,
          metadata: {
            location: user.location,
            department: user.department
          }
        }
      }));

      // Aplikovat dagre layout na existující strukturu
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(existingNodes, edges, 'TB');
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      setDialog({
        show: true,
        type: 'success',
        icon: '✅',
        title: 'Layout aplikován!',
        message: 'Pouzity existujici vztahy z databaze.\nAplikovano prehledne automaticke rozlozeni.',
        stats: {
          'Celkem uzlů': layoutedNodes.length,
          'Vztahů z DB': layoutedEdges.length
        },
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
      return;
    }

    // Pokud neexistují vztahy, vygenerovat nové ze STÁVAJÍCÍCH PŘIŘAZENÍ v DB

    // 1. Seskupení podle útvarů a pozic (používáme REÁLNÁ přiřazení z 25_uzivatele)
    // Ředitel = přesně "Ředitel" (ne vedoucí, ne náměstek)
    const director = allUsers.find(u => {
      const pos = u.position?.toLowerCase() || '';
      return pos === 'ředitel' || pos === 'ředitelka';
    });
    
    // Náměstci - seskupeni podle jejich útvarů (department/departmentCode)
    const deputies = allUsers.filter(u => 
      u.position?.toLowerCase().includes('náměstek')
    );
    
    // Vedoucí úseku ředitele - jdou PŘÍMO pod ředitele
    const directorHeads = allUsers.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      return pos.includes('vedoucí') && (dept.includes('ředitel') || pos.includes('ředitel'));
    });
    
    // Ostatní vedoucí (ne ředitelského úseku) - BUDOU nadřízeni svému útvaru
    const heads = allUsers.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      const dept = u.department?.toLowerCase() || '';
      return pos.includes('vedoucí') && !dept.includes('ředitel') && !pos.includes('ředitel');
    });
    
    // Ostatní zaměstnanci - přiřazeni podle svého útvaru (department)
    const others = allUsers.filter(u => {
      const pos = u.position?.toLowerCase() || '';
      return !pos.includes('ředitel') &&
             !pos.includes('náměstek') &&
             !pos.includes('vedoucí');
    });

    // 2. Vytvoření nodes (pozice budou přepočítány dagre)
    const newNodes = [];
    const newEdges = [];
    let yPos = 100;
    const xSpacing = 280;
    const ySpacing = 180;

    // Ředitel nahoře (střed)
    if (director) {
      newNodes.push({
        id: director.id,
        type: 'custom',
        position: { x: 500, y: yPos },
        data: {
          name: director.name,
          position: director.position,
          initials: director.initials,
          metadata: {
            location: director.location,
            department: director.department
          }
        }
      });
      yPos += ySpacing;
    }

    // Náměstci pod ředitelem
    if (deputies.length > 0) {
      const startX = 500 - ((deputies.length - 1) * xSpacing) / 2;
      deputies.forEach((deputy, i) => {
        newNodes.push({
          id: deputy.id,
          type: 'custom',
          position: { x: startX + (i * xSpacing), y: yPos },
          data: {
            name: deputy.name,
            position: deputy.position,
            initials: deputy.initials,
            metadata: {
              location: deputy.location,
              department: deputy.department
            }
          }
        });

        // Spojit s ředitelem
        if (director) {
          newEdges.push({
            id: `e-${director.id}-${deputy.id}`,
            source: director.id,
            target: deputy.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      });
      yPos += ySpacing;
    }

    // Vedoucí úseku ředitele - PŘÍMO pod ředitele (ne přes náměstky!)
    if (directorHeads.length > 0) {
      const startX = 200;
      directorHeads.forEach((head, i) => {
        newNodes.push({
          id: head.id,
          type: 'custom',
          position: { x: startX + (i * 250), y: yPos },
          data: {
            name: head.name,
            position: head.position,
            initials: head.initials,
            metadata: {
              location: head.location,
              department: head.department
            }
          }
        });

        // Vedoucí ředitelského úseku jde PŘÍMO na ředitele
        if (director) {
          newEdges.push({
            id: `e-${director.id}-${head.id}`,
            source: director.id,
            target: head.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      });
      yPos += ySpacing;
    }

    // Ostatní vedoucí - pod náměstky (podle útvaru)
    if (heads.length > 0) {
      const startX = 200;
      heads.forEach((head, i) => {
        newNodes.push({
          id: head.id,
          type: 'custom',
          position: { x: startX + (i * 250), y: yPos },
          data: {
            name: head.name,
            position: head.position,
            initials: head.initials,
            metadata: {
              location: head.location,
              department: head.department
            }
          }
        });

        // Najít náměstka s nejlepší shodou útvaru (podle zkratky), nebo ředitele
        const sameDepDeputy = findBestDepartmentMatch(head, deputies);
        const parent = sameDepDeputy || (deputies.length > 0 ? deputies[0] : director);
        
        if (parent) {
          newEdges.push({
            id: `e-${parent.id}-${head.id}`,
            source: parent.id,
            target: head.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      });
      yPos += ySpacing;
    }

    // Ostatní zaměstnanci
    if (others.length > 0) {
      const startX = 100;
      const maxPerRow = 5;
      others.forEach((user, i) => {
        const row = Math.floor(i / maxPerRow);
        const col = i % maxPerRow;
        
        newNodes.push({
          id: user.id,
          type: 'custom',
          position: { x: startX + (col * 220), y: yPos + (row * ySpacing) },
          data: {
            name: user.name,
            position: user.position,
            initials: user.initials,
            metadata: {
              location: user.location,
              department: user.department
            }
          }
        });

        // Najít nadřízeného s nejlepší shodou útvaru - porovnat všechny možnosti
        const allPossibleParents = [...heads, ...directorHeads, ...deputies];
        const bestMatch = findBestDepartmentMatch(user, allPossibleParents);
        const parent = bestMatch || (deputies.length > 0 ? deputies[0] : director);
        
        // Debug: zobrazit skóre shody
        if (bestMatch) {
          const score = getDepartmentMatchScore(user.departmentCode, bestMatch.departmentCode);
        }
        
        if (parent) {
          newEdges.push({
            id: `e-${parent.id}-${user.id}`,
            source: parent.id,
            target: user.id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#667eea', strokeWidth: 3 }
          });
        }
      });
    }

    // Aplikovat automatické rozložení pomocí dagre
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, 'TB');
    
    // Nastavit nové nodes a edges s optimálním layoutem
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    setDialog({
      show: true,
      type: 'success',
      icon: '✅',
      title: 'Hierarchie automaticky vytvorena!',
      message: 'Zkontrolujte strukturu a případně upravte.\nNezapomeňte uložit!',
      stats: {
        'Ředitel': director ? '1' : '0',
        'Náměstci': deputies.length,
        'Vedoucí úseku ředitele': directorHeads.length,
        'Vedoucí ostatních úseků': heads.length,
        'Ostatní': others.length,
        '─────────': '─────',
        'Celkem uzlů': layoutedNodes.length,
        'Celkem vztahů': layoutedEdges.length
      },
      onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'OK',
      cancelText: null
    });
  };

  // ============ PROFILE MANAGEMENT ============
  
  const loadProfiles = async () => {
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      const response = await fetch(`${apiBase}/hierarchy/profiles/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username })
      });
      
      const result = await response.json();
      if (result.success) {
        setProfiles(result.data || []);
        const activeProfile = result.data.find(p => p.isActive) || result.data[0];
        setCurrentProfile(activeProfile || null);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  const handleDeleteProfile = async () => {
    if (!currentProfile || profiles.length <= 1) {
      return;
    }

    const relationshipsText = currentProfile.relationshipsCount > 0 
      ? `\n\n⚠️ Profil obsahuje ${currentProfile.relationshipsCount} vztahů, které budou také smazány!`
      : '';

    setDialog({
      show: true,
      type: 'confirm',
      icon: '🗑️',
      title: 'Smazat profil?',
      message: `Opravdu chcete smazat profil "${currentProfile.name}"?${relationshipsText}\n\nTato akce je nevratná!`,
      onConfirm: async () => {
        try {
          const token = await loadAuthData.token();
          const userData = await loadAuthData.user();
          const username = userData?.username || localStorage.getItem('username');
          const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

          const response = await fetch(`${apiBase}/hierarchy/profiles/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token, 
              username, 
              profile_id: currentProfile.id 
            })
          });

          const result = await response.json();
          
          if (result.success) {
            setDialog({
              show: true,
              type: 'success',
              icon: '✅',
              title: 'Profil smazán',
              message: `Profil "${currentProfile.name}" byl úspěšně smazán.`,
              onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
              confirmText: 'OK',
              cancelText: null
            });

            // Obnovit seznam profilů a vybrat první dostupný
            await loadProfiles();
            
            // Vyčistit canvas
            setNodes([]);
            setEdges([]);
          } else {
            throw new Error(result.error || 'Chyba při mazání profilu');
          }
        } catch (err) {
          console.error('Delete profile error:', err);
          setDialog({
            show: true,
            type: 'alert',
            icon: '❌',
            title: 'Chyba při mazání',
            message: err.message,
            onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
            confirmText: 'OK',
            cancelText: null
          });
        }
      },
      onCancel: () => setDialog(prev => ({ ...prev, show: false })),
      confirmText: 'Smazat',
      cancelText: 'Zrušit'
    });
  };
  
  const handleToggleProfileActive = async () => {
    if (!currentProfile) return;
    
    const newActiveState = !currentProfile.isActive;
    const action = newActiveState ? 'aktivovat' : 'deaktivovat';
    
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      
      const { setProfileActive } = await import('../services/hierarchyProfilesApi');
      await setProfileActive(token, username, currentProfile.id, newActiveState);
      
      // Aktualizovat lokální stav
      setProfiles(profiles.map(p => 
        p.id === currentProfile.id ? { ...p, isActive: newActiveState } : p
      ));
      setCurrentProfile({ ...currentProfile, isActive: newActiveState });
      
      const statusText = newActiveState ? 'aktivován (viditelný v AppSettings)' : 'deaktivován (skrytý v AppSettings)';
    } catch (error) {
      console.error(`Chyba při pokusu ${action} profil:`, error);
      setWarningDialog({
        show: true,
        title: `Nepodařilo se ${action} profil`,
        message: error.message || 'Neznámá chyba',
        icon: '❌'
      });
    }
  };
  
  const handleProfileChange = async (profileId) => {
    const profile = profiles.find(p => p.id === parseInt(profileId));
    if (!profile) {
      return;
    }
    
    // Pokud ma draft, zeptat se zda chce prepisat
    if (hasDraft && (nodes.length > 0 || edges.length > 0)) {
      if (!window.confirm(`Máte neuložené změny v auto-draftu.\n\nChcete načíst profil "${profile.name}"?\n\nNeuložené změny budou ztraceny.`)) {
        return;
      }
    }
    
    setCurrentProfile(profile);
    
    // Uložit vybraný profil do LocalStorage
    localStorage.setItem(LS_PROFILE_KEY, profileId.toString());
    
    
    // Nacist strukturu pro vybrany profil (NOVÉ API)
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      const response = await fetch(`${apiBase}/hierarchy/profiles/load-structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, profile_id: profileId })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // API vrací structure_json formát s nodes a edges
        const apiNodes = result.data.nodes || [];
        const apiEdges = result.data.edges || [];
        
        if (apiNodes.length === 0 && apiEdges.length === 0) {
          setNodes([]);
          setEdges([]);
        } else {
          
          // Zajistit, že všechny nodes mají position
          const validNodes = apiNodes.map((node, index) => ({
            ...node,
            position: node.position || { x: 100 + (index % 5) * 200, y: 100 + Math.floor(index / 5) * 150 }
          }));
          
          setNodes(validNodes);
          setEdges(apiEdges);
          
          
          // 🆕 FORCE RE-RENDER: Po načtení profilu znovu vyfituj viewport
          // Malé zpoždění aby se ReactFlow stihl inicializovat
          setTimeout(() => {
            if (reactFlowInstance) {
              reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
            }
          }, 100);
        }
        
        // Vymazat draft pri nacitani profilu
        localStorage.removeItem(LS_NODES_KEY);
        localStorage.removeItem(LS_EDGES_KEY);
        localStorage.removeItem(LS_TIMESTAMP_KEY);
        setHasDraft(false);
      }
    } catch (err) {
      console.error('Failed to load profile structure:', err);
    }
  };
  
  const handleSaveAs = () => {
    setProfileDialogMode('saveAs');
    setShowProfileDialog(true);
  };
  
  const handleProfileSaveConfirm = async (profileName, profileDescription) => {
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      // Nejdrive vytvorit profil
      const createResponse = await fetch(`${apiBase}/hierarchy/profiles/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          username,
          name: profileName,
          description: profileDescription,
          set_active: false
        })
      });
      
      const createResult = await createResponse.json();
      
      if (createResult.code === 'PROFILE_EXISTS') {
        // Profil existuje - zobrazit confirm dialog
        return { exists: true, profileName };
      }
      
      if (!createResult.success) {
        throw new Error(createResult.error || 'Chyba pri vytvareni profilu');
      }
      
      const newProfileId = createResult.profile_id;
      
      // Ulozit hierarchii do noveho profilu
      await handleSave(newProfileId);
      
      // Obnovit seznam profilu
      await loadProfiles();
      
      setShowProfileDialog(false);
      
      return { success: true };
      
    } catch (err) {
      console.error('Profile save error:', err);
      return { error: err.message };
    }
  };

  const handleSave = async (targetProfileId = null) => {
    try {
      const token = await loadAuthData.token();
      const userData = await loadAuthData.user();
      const username = userData?.username || localStorage.getItem('username');
      const apiBase = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
      
      const profileId = targetProfileId || currentProfile?.id || 1;
      
      // NOVÝ SYSTÉM: Uložit nodes a edges jako JSON do structure_json
      const payload = {
        token,
        username,
        profile_id: profileId,
        nodes: nodes.map(n => ({
          id: n.id,
          typ: n.data?.type || (n.data?.userId ? 'user' : n.data?.locationId ? 'location' : n.data?.departmentId ? 'department' : n.data?.templateId ? 'template' : n.data?.roleId ? 'role' : 'user'),
          pozice: n.position,
          data: n.data
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          typ: e.data?.typ || (e.data?.notifications ? 'notification' : 'relation'),
          data: e.data || {}
        }))
      };
      
      
      const response = await fetch(`${apiBase}/hierarchy/profiles/save-structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SAVE Error response:', errorText);
        throw new Error('Chyba pri ukladani');
      }

      const result = await response.json();
      if (result.success) {
        localStorage.removeItem(LS_NODES_KEY);
        localStorage.removeItem(LS_EDGES_KEY);
        localStorage.removeItem(LS_TIMESTAMP_KEY);
        setHasDraft(false);
        
        // Automaticky přepnout na uložený profil a uložit do LocalStorage
        if (result.profile_id && result.profile_id !== currentProfile?.id) {
          const savedProfile = profiles.find(p => p.id === result.profile_id);
          if (savedProfile) {
            setCurrentProfile(savedProfile);
            localStorage.setItem(LS_PROFILE_KEY, savedProfile.id.toString());
          }
        }
        
        // Zobrazit toast notifikaci místo dialogu
        showToast(
          `✅ Hierarchie úspěšně uložena! Uloženo ${nodes.length} uzlů a ${edges.length} vztahů.`,
          { type: 'success', timeout: 5000 }
        );
      } else {
        console.error('❌ SAVE Failed:', result.error, result.details);
        throw new Error(result.error || 'Neznama chyba');
      }
    } catch (err) {
      console.error('💥 SAVE Exception:', err);
      setDialog({
        show: true,
        type: 'alert',
        icon: '❌',
        title: 'Chyba pri ukladani',
        message: err.message,
        onConfirm: () => setDialog(prev => ({ ...prev, show: false })),
        confirmText: 'OK',
        cancelText: null
      });
    }
  };

  const handleDeleteNode = async () => {
    if (selectedNode) {
      
      // Odstranit node a všechny související hrany z UI (optimistic update)
      setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      setShowDetailPanel(false);
      
      // Poznámka: Skutečné mazání z DB proběhne při dalším uložení (handleSave)
      // V2 systém ukládá celou hierarchii najednou, ne jednotlivé nodes
    }
  };

  const handleDeleteEdge = async () => {
    if (selectedEdge) {
      
      // Odstranit z UI okamžitě (optimistic update)
      setEdges((eds) => eds.filter(e => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      setShowDetailPanel(false);
      
      // Poznámka: Skutečné mazání z DB proběhne při dalším uložení (handleSave)
      // V2 systém ukládá celou hierarchii najednou, ne jednotlivé vztahy
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.position?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.location?.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const filteredRoles = allRoles.filter(role =>
    role.nazev_role?.toLowerCase().includes(searchRoles.toLowerCase()) ||
    (role.popis && role.popis.toLowerCase().includes(searchRoles.toLowerCase()))
  );

  const filteredLocations = allLocations.filter(loc =>
    loc.name?.toLowerCase().includes(searchLocations.toLowerCase()) ||
    loc.code?.toLowerCase().includes(searchLocations.toLowerCase())
  );

  const filteredDepartments = allDepartments.filter(dept =>
    dept.name?.toLowerCase().includes(searchDepartments.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchDepartments.toLowerCase())
  );

  const filteredLpCodes = allLpCodes.filter(lp => // ✅ NOVÉ
    lp.lp_cislo?.toLowerCase().includes(searchLpCodes.toLowerCase()) ||
    lp.nazev?.toLowerCase().includes(searchLpCodes.toLowerCase()) ||
    lp.usek?.toLowerCase().includes(searchLpCodes.toLowerCase())
  );

  const filteredFinancing = allFinancing.filter(fin => // ✅ NOVÉ
    fin.typ?.toLowerCase().includes(searchFinancing.toLowerCase()) ||
    fin.nazev?.toLowerCase().includes(searchFinancing.toLowerCase()) ||
    fin.popis?.toLowerCase().includes(searchFinancing.toLowerCase())
  );

  const filteredNotificationTemplates = allNotificationTemplates.filter(template =>
    (template.nazev || template.name)?.toLowerCase().includes(searchTemplates.toLowerCase()) ||
    (template.typ || template.type)?.toLowerCase().includes(searchTemplates.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchTemplates.toLowerCase()))
  );

  // Hot-reload error fallback
  if (hasError) {
    return (
      <Container>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faSitemap} />
            Systém workflow a notifikací
          </Title>
        </Header>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#f59e0b',
          fontSize: '1.1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ marginBottom: '1rem' }}>Hot-reload chyba detekována</div>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Obnovit stránku (F5)
            </button>
          </div>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faSitemap} />
            Systém workflow a notifikací
          </Title>
        </Header>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#64748b',
          fontSize: '1.1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <div>Načítání hierarchie...</div>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faSitemap} />
            Systém workflow a notifikací
          </Title>
        </Header>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#ef4444',
          fontSize: '1.1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <div>Chyba při načítání: {error}</div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      <style>{`
        .email-preview-body::-webkit-scrollbar {
          width: 8px;
        }
        .email-preview-body::-webkit-scrollbar-track {
          background: #f9fafb;
        }
        .email-preview-body::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .email-preview-body::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      <Container>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Title>
              <FontAwesomeIcon icon={faSitemap} />
              Systém workflow a notifikací
            </Title>
            {(nodes.length > 0 || edges.length > 0) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: hasDraft ? '#dbeafe' : '#fef3c7',
              border: `1px solid ${hasDraft ? '#60a5fa' : '#fbbf24'}`,
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: hasDraft ? '#1e3a8a' : '#92400e'
            }}>
              <span style={{ fontSize: '1.2rem' }}>{hasDraft ? '💾' : '⚠️'}</span>
              <span>
                <strong>{nodes.length}</strong> uzlů, <strong>{edges.length}</strong> vztahů
                <br/>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {hasDraft ? 'Nacteno z auto-draftu' : 'Neulozeno (auto-draft)'}
                </span>
              </span>
            </div>
            )}
          </div>
          <HeaderActions>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '320px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>
              Profil:
            </label>
            <ProfileSelectWrapper>
              <ProfileSelect
                value={currentProfile?.id || ''}
                onChange={(e) => handleProfileChange(e.target.value)}
              >
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                    {profile.isActive ? ' ✅' : ' ⚪'}
                    {profile.relationshipsCount > 0 ? ` (${profile.relationshipsCount})` : ''}
                  </option>
                ))}
              </ProfileSelect>
              <ProfileSelectArrow>▼</ProfileSelectArrow>
              <ProfileDeleteButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleProfileActive();
                }}
                disabled={!currentProfile}
                title={currentProfile?.isActive ? 'Deaktivovat profil (skryje se v AppSettings)' : 'Aktivovat profil (zobrazí se v AppSettings)'}
                style={{ 
                  background: currentProfile?.isActive ? '#10b981' : '#6b7280',
                  marginRight: '4px',
                  fontSize: '0.85rem',
                  padding: '4px 8px'
                }}
              >
                {currentProfile?.isActive ? '✓' : '○'}
              </ProfileDeleteButton>
              <ProfileDeleteButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProfile();
                }}
                disabled={!currentProfile || profiles.length <= 1}
                title={profiles.length <= 1 ? 'Nelze smazat poslední profil' : 'Smazat aktuální profil'}
              >
                🗑️
              </ProfileDeleteButton>
            </ProfileSelectWrapper>
          </div>
          <Button onClick={handleAutoGenerateHierarchy} disabled={loading || allUsers.length === 0}>
            <span style={{ fontSize: '1.1rem', marginRight: '4px' }}>🤖</span>
            AI Asistent
          </Button>
          <Button 
            onClick={() => {
              if (nodes.length > 0) {
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'TB');
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
              }
            }}
            disabled={nodes.length === 0}
            title="Automaticky prerovnat existujici strukturu"
          >
            <span style={{ fontSize: '1.1rem', marginRight: '4px' }}>📐</span>
            Přerovnat
          </Button>
          <Button>
            <FontAwesomeIcon icon={faEye} />
            Náhled
          </Button>
          <Button primary onClick={() => handleSave()} disabled={loading || (nodes.length === 0 && edges.length === 0)}>
            <FontAwesomeIcon icon={faSave} />
            Uložit
          </Button>
          <Button onClick={handleSaveAs} disabled={loading || (nodes.length === 0 && edges.length === 0)}>
            <FontAwesomeIcon icon={faSave} />
            Uložit jako...
          </Button>
          </HeaderActions>
        </Header>

        <div style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
          borderBottom: '2px solid #e0e6ed',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          fontSize: '0.8rem',
          flexWrap: 'wrap'
        }}>
        <span style={{ fontWeight: 700, color: '#475569' }}>Legenda vztahů:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#3b82f6', borderRadius: '2px' }}></div>
          <span style={{ color: '#1e40af' }}>Uživatel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#92400e', borderRadius: '2px' }}></div>
          <span style={{ color: '#78350f' }}>Lokalita</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#059669', borderRadius: '2px' }}></div>
          <span style={{ color: '#065f46' }}>Úsek</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#f59e0b', borderRadius: '2px' }}></div>
          <span style={{ color: '#d97706' }}>Notifikace</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '3px', background: '#8b5cf6', borderRadius: '2px' }}></div>
          <span style={{ color: '#6d28d9' }}>Role</span>
        </div>
      </div>

      <MainContent>
        <Sidebar>
            <SidebarHeader>
              <SidebarTitle>
                <FontAwesomeIcon icon={faLayerGroup} />
                Přehled položek workflow
              </SidebarTitle>
            </SidebarHeader>

            {/* Globální search box - vyhledává ve všech sekcích najednou */}
            <SearchBox>
              <SearchIcon>
                <FontAwesomeIcon icon={faSearch} />
              </SearchIcon>
              <SearchInput
                placeholder="Hledat ve všech sekcích..."
                value={searchUsers}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchUsers(value);
                  setSearchLocations(value);
                  setSearchDepartments(value);
                  setSearchTemplates(value);
                }}
              />
              {searchUsers && (
                <SearchClearButton
                  onClick={() => {
                    setSearchUsers('');
                    setSearchLocations('');
                    setSearchDepartments('');
                    setSearchTemplates('');
                  }}
                  title="Vymazat vyhledávání ve všech sekcích"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </SearchClearButton>
              )}
            </SearchBox>

            <SidebarContent>
              <CollapsibleSection>
                <SectionHeader 
                  expanded={expandedSections.users}
                  onClick={() => toggleSection('users')}
                >
                  <FontAwesomeIcon icon={expandedSections.users ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faUsers} />
                  UŽIVATELÉ ({filteredUsers.length})
                  {selectedUsers.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#667eea', fontWeight: 'bold' }}>
                      {selectedUsers.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.users}>
                  {/* Search box pro uživatele */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat uživatele..."
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchUsers && (
                        <SearchClearButton
                          onClick={() => setSearchUsers('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedUsers.size === filteredUsers.length) {
                          deselectAllUsers();
                        } else {
                          selectAllUsers();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedUsers.size === filteredUsers.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredUsers.map((user) => (
                      <UserItem
                        key={user.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', user.id);
                          setDraggedItem(user.id);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                        }}
                        style={{
                          background: selectedUsers.has(user.id) ? '#ede9fe' : 'white',
                          borderColor: selectedUsers.has(user.id) ? '#8b5cf6' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.has(user.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleUserSelection(user.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#8b5cf6',
                                    flexShrink: 0
                                  }}
                                />
                                <UserAvatar>{user.initials}</UserAvatar>
                                <UserInfo>
                                  <UserName>{user.name}</UserName>
                                  <UserMeta>
                                    {user.position} • {user.location}
                                  </UserMeta>
                        </UserInfo>
                      </UserItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              {/* SEKCE: ROLE */}
              <CollapsibleSection>
                <SectionHeader 
                  expanded={expandedSections.roles}
                  onClick={() => toggleSection('roles')}
                >
                  <FontAwesomeIcon icon={expandedSections.roles ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faUserShield} />
                  ROLE ({filteredRoles.length})
                </SectionHeader>
                <SectionContent expanded={expandedSections.roles}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat roli..."
                        value={searchRoles}
                        onChange={(e) => setSearchRoles(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchRoles && (
                        <SearchClearButton
                          onClick={() => setSearchRoles('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                    <button
                      onClick={() => {
                        if (selectedRoles.size === filteredRoles.length) {
                          setSelectedRoles(new Set());
                        } else {
                          setSelectedRoles(new Set(filteredRoles.map(r => r.id)));
                        }
                      }}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedRoles.size === filteredRoles.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredRoles.map((role) => (
                      <UserItem
                        key={`role-${role.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `role-${role.id}`);
                          setDraggedItem(`role-${role.id}`);
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        style={{
                          background: selectedRoles.has(role.id) ? '#f5f3ff' : 'white',
                          borderColor: selectedRoles.has(role.id) ? '#8b5cf6' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.has(role.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleRoleSelection(role.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#8b5cf6',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <FontAwesomeIcon icon={faUserShield} style={{ color: '#8b5cf6', fontSize: '1.1rem' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#6d28d9' }}>
                              {role.nazev_role}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginTop: '2px' }}>
                              {role.userCount || 0} uživatelů{role.popis ? ` • ${role.popis}` : ''}
                            </div>
                          </div>
                        </div>
                      </UserItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              <CollapsibleSection>
                <SectionHeader 
                  expanded={expandedSections.locations}
                  onClick={() => toggleSection('locations')}
                >
                  <FontAwesomeIcon icon={expandedSections.locations ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  LOKALITY ({filteredLocations.length})
                  {selectedLocations.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#f5576c', fontWeight: 'bold' }}>
                      {selectedLocations.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.locations}>
                  {/* Search box pro lokality */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat lokalitu..."
                        value={searchLocations}
                        onChange={(e) => setSearchLocations(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchLocations && (
                        <SearchClearButton
                          onClick={() => setSearchLocations('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedLocations.size === filteredLocations.length) {
                          deselectAllLocations();
                        } else {
                          selectAllLocations();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedLocations.size === filteredLocations.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredLocations.map((loc) => (
                      <LocationItem
                        key={loc.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `loc-${loc.id}`);
                          setDraggedItem(`loc-${loc.id}`);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                        }}
                        style={{
                          background: selectedLocations.has(loc.id) ? '#fef3c7' : 'white',
                          borderColor: selectedLocations.has(loc.id) ? '#fbbf24' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                                <input
                                  type="checkbox"
                                  checked={selectedLocations.has(loc.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleLocationSelection(loc.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#f59e0b',
                                    flexShrink: 0
                                  }}
                                />
                                <LocationIcon>
                                  <FontAwesomeIcon icon={faBuilding} />
                                </LocationIcon>
                        <UserInfo>
                          <UserName>{loc.name}</UserName>
                          <UserMeta>{loc.userCount} uživatelů • {loc.code}</UserMeta>
                        </UserInfo>
                      </LocationItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              <CollapsibleSection>
                <SectionHeader 
                  expanded={expandedSections.departments}
                  onClick={() => toggleSection('departments')}
                >
                  <FontAwesomeIcon icon={expandedSections.departments ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faUserTie} />
                  ÚSEKY ({filteredDepartments.length})
                  {selectedDepartments.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#00f2fe', fontWeight: 'bold' }}>
                      {selectedDepartments.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.departments}>
                  {/* Search box pro útvary */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat útvar..."
                        value={searchDepartments}
                        onChange={(e) => setSearchDepartments(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchDepartments && (
                        <SearchClearButton
                          onClick={() => setSearchDepartments('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedDepartments.size === filteredDepartments.length) {
                          deselectAllDepartments();
                        } else {
                          selectAllDepartments();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedDepartments.size === filteredDepartments.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredDepartments.map((dept) => (
                      <LocationItem
                        key={dept.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `dept-${dept.id}`);
                          setDraggedItem(`dept-${dept.id}`);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                        }}
                        style={{
                          background: selectedDepartments.has(dept.id) ? '#dbeafe' : 'white',
                          borderColor: selectedDepartments.has(dept.id) ? '#60a5fa' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                                <input
                                  type="checkbox"
                                  checked={selectedDepartments.has(dept.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleDepartmentSelection(dept.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#3b82f6',
                                    flexShrink: 0
                                  }}
                                />
                                <DepartmentIcon>
                                  <FontAwesomeIcon icon={faUserTie} />
                                </DepartmentIcon>
                        <UserInfo>
                          <UserName>{dept.name}</UserName>
                          <UserMeta>{dept.userCount} uživatelů • {dept.code}</UserMeta>
                        </UserInfo>
                      </LocationItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              {/* ✅ NOVÉ: LP KÓDY sekce */}
              <CollapsibleSection>
                <SectionHeader
                  expanded={expandedSections.lpCodes}
                  onClick={() => toggleSection('lpCodes')}
                >
                  <FontAwesomeIcon icon={expandedSections.lpCodes ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faLayerGroup} />
                  LP KÓDY ({filteredLpCodes.length})
                  {selectedLpCodes.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#dc2626', fontWeight: 'bold' }}>
                      {selectedLpCodes.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.lpCodes}>
                  {/* Search box pro LP kódy */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat LP..."
                        value={searchLpCodes}
                        onChange={(e) => setSearchLpCodes(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchLpCodes && (
                        <SearchClearButton
                          onClick={() => setSearchLpCodes('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedLpCodes.size === filteredLpCodes.length) {
                          deselectAllLpCodes();
                        } else {
                          selectAllLpCodes();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedLpCodes.size === filteredLpCodes.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredLpCodes.map((lp) => (
                      <UserItem
                        key={`lp-${lp.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `lp-${lp.id}`);
                          setDraggedItem(`lp-${lp.id}`);
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        style={{
                          background: selectedLpCodes.has(lp.id) ? '#fee2e2' : 'white',
                          borderColor: selectedLpCodes.has(lp.id) ? '#dc2626' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLpCodes.has(lp.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleLpCodeSelection(lp.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#dc2626',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <FontAwesomeIcon icon={faLayerGroup} style={{ color: '#dc2626', fontSize: '1.1rem' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#991b1b' }}>
                              {lp.lp_cislo}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px' }}>
                              {lp.nazev || lp.popis || ''}{lp.usek ? ` • ${lp.usek}` : ''}
                            </div>
                          </div>
                        </div>
                      </UserItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              {/* ✅ NOVÉ: FINANCOVÁNÍ sekce */}
              <CollapsibleSection>
                <SectionHeader
                  expanded={expandedSections.financing}
                  onClick={() => toggleSection('financing')}
                >
                  <FontAwesomeIcon icon={expandedSections.financing ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faLayerGroup} />
                  FINANCOVÁNÍ ({filteredFinancing.length})
                  {selectedFinancing.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
                      {selectedFinancing.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.financing}>
                  {/* Search box pro financování */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat financování..."
                        value={searchFinancing}
                        onChange={(e) => setSearchFinancing(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchFinancing && (
                        <SearchClearButton
                          onClick={() => setSearchFinancing('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedFinancing.size === filteredFinancing.length) {
                          deselectAllFinancing();
                        } else {
                          selectAllFinancing();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedFinancing.size === filteredFinancing.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredFinancing.map((fin) => (
                      <UserItem
                        key={`fin-${fin.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `fin-${fin.id}`);
                          setDraggedItem(`fin-${fin.id}`);
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        style={{
                          background: selectedFinancing.has(fin.id) ? '#dcfce7' : 'white',
                          borderColor: selectedFinancing.has(fin.id) ? '#16a34a' : '#e0e6ed',
                          cursor: 'grab'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFinancing.has(fin.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleFinancingSelection(fin.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#16a34a',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <FontAwesomeIcon icon={faLayerGroup} style={{ color: '#16a34a', fontSize: '1.1rem' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#166534' }}>
                              {fin.typ || fin.nazev}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '2px' }}>
                              {fin.popis || fin.description || ''}
                            </div>
                          </div>
                        </div>
                      </UserItem>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>

              {/* NOTIFIKAČNÍ ŠABLONY - Nová sekce */}
              <CollapsibleSection>
                <SectionHeader
                  expanded={expandedSections.notificationTemplates}
                  onClick={() => toggleSection('notificationTemplates')}
                >
                  <FontAwesomeIcon icon={expandedSections.notificationTemplates ? faChevronDown : faChevronRight} />
                  <FontAwesomeIcon icon={faBell} />
                  NOTIFIKAČNÍ ŠABLONY ({filteredNotificationTemplates.length})
                  {selectedNotificationTemplates.size > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>
                      {selectedNotificationTemplates.size} vybráno
                    </span>
                  )}
                </SectionHeader>
                <SectionContent expanded={expandedSections.notificationTemplates}>
                  {/* Search box pro notifikační šablony */}
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed' }}>
                    <SearchBox style={{ margin: 0 }}>
                      <SearchIcon>
                        <FontAwesomeIcon icon={faSearch} />
                      </SearchIcon>
                      <SearchInput
                        placeholder="Hledat šablonu..."
                        value={searchTemplates}
                        onChange={(e) => setSearchTemplates(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 32px' }}
                      />
                      {searchTemplates && (
                        <SearchClearButton
                          onClick={() => setSearchTemplates('')}
                          title="Vymazat"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </SearchClearButton>
                      )}
                    </SearchBox>
                  </div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e6ed', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedNotificationTemplates.size === filteredNotificationTemplates.length) {
                          deselectAllNotificationTemplates();
                        } else {
                          selectAllNotificationTemplates();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e0e6ed',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#475569',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                    >
                      {selectedNotificationTemplates.size === filteredNotificationTemplates.length ? '☐ Zrušit vše' : '☑ Vybrat vše'}
                    </button>
                  </div>
                  <div>
                    {filteredNotificationTemplates.map((template) => (
                      <div
                        key={template.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('application/reactflow', `notif-${template.id}`);
                          setDraggedItem(`notif-${template.id}`);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                        }}
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid #e0e6ed',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          cursor: 'grab',
                          background: selectedNotificationTemplates.has(template.id) ? '#fef3c7' : 'white',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => toggleNotificationTemplateSelection(template.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNotificationTemplates.has(template.id)}
                          onChange={() => toggleNotificationTemplateSelection(template.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#f59e0b',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        />
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                        }}>
                          <FontAwesomeIcon icon={faBell} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: '600', 
                            color: '#2c3e50', 
                            fontSize: '0.9rem',
                            marginBottom: '4px'
                          }}>
                            {template.nazev || template.name}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <code style={{ 
                              background: '#f1f5f9', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontSize: '0.7rem'
                            }}>
                              {normalizeEventTypeCode(template.typ || template.type)}
                            </code>
                            {template.email?.sendByDefault && (
                              <span style={{ color: '#3b82f6' }}>
                                <FontAwesomeIcon icon={faEnvelope} /> Email
                              </span>
                            )}
                            <span style={{ 
                              color: template.priorityDefault === 'urgent' ? '#dc2626' : 
                                     template.priorityDefault === 'high' ? '#f59e0b' : '#64748b',
                              fontWeight: '600'
                            }}>
                              {template.priorityDefault}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionContent>
              </CollapsibleSection>
            </SidebarContent>

            {/* Akční tlačítka - Přidat vybrané (nad fixní patičkou) */}
            {(selectedUsers.size > 0 || selectedLocations.size > 0 || selectedDepartments.size > 0 || selectedNotificationTemplates.size > 0) && (
              <div style={{
                position: 'absolute',
                bottom: '66px',
                left: 0,
                right: 0,
                padding: '16px',
                borderTop: '2px solid #e0e6ed',
                background: 'linear-gradient(180deg, #f8fafc 0%, white 100%)',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                zIndex: 9
              }}>
                <button
                  onClick={addSelectedToCanvas}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  <span>
                    Přidat vybrané ({selectedUsers.size + selectedLocations.size + selectedDepartments.size + selectedNotificationTemplates.size})
                  </span>
                </button>
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  textAlign: 'center'
                }}>
                  {selectedUsers.size > 0 && `${selectedUsers.size} uživatelů`}
                  {selectedUsers.size > 0 && (selectedLocations.size > 0 || selectedDepartments.size > 0 || selectedNotificationTemplates.size > 0) && ' • '}
                  {selectedLocations.size > 0 && `${selectedLocations.size} lokalit`}
                  {selectedLocations.size > 0 && (selectedDepartments.size > 0 || selectedNotificationTemplates.size > 0) && ' • '}
                  {selectedDepartments.size > 0 && `${selectedDepartments.size} útvarů`}
                  {selectedDepartments.size > 0 && selectedNotificationTemplates.size > 0 && ' • '}
                  {selectedNotificationTemplates.size > 0 && `${selectedNotificationTemplates.size} šablon`}
                </div>
              </div>
            )}

            {/* Fixní patička - Reset plochy (vždy viditelná) */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              background: 'white',
              borderTop: '2px solid #e0e6ed',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
              zIndex: 10
            }}>
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Resetovat plochu',
                    message: 'Opravdu chcete smazat celou plochu a začít znovu od začátku? Tato akce je nevratná.',
                    onConfirm: () => {
                      setNodes([]);
                      setEdges([]);
                      localStorage.removeItem('hierarchy_draft_nodes');
                      localStorage.removeItem('hierarchy_draft_edges');
                      localStorage.removeItem('hierarchy_draft_timestamp');
                      setHasDraft(false);
                      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
                    }
                  });
                }}
                disabled={nodes.length === 0}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: nodes.length === 0 ? '#f1f5f9' : 'white',
                  color: nodes.length === 0 ? '#94a3b8' : '#dc2626',
                  border: `2px solid ${nodes.length === 0 ? '#e2e8f0' : '#fecaca'}`,
                  borderRadius: '8px',
                  cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (nodes.length > 0) {
                    e.target.style.background = '#fef2f2';
                    e.target.style.borderColor = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (nodes.length > 0) {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#fecaca';
                  }
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
                <span>Resetovat plochu</span>
              </button>
            </div>
          </Sidebar>

          <CanvasArea
            onDrop={onReactFlowDrop}
            onDragOver={onReactFlowDragOver}
            className={isShiftPressed ? 'selection-mode' : ''}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onNodeDragStop={onNodeDragStop}
              onInit={(instance) => {
                setReactFlowInstance(instance);
                // 🆕 Fit view hned po inicializaci (opraví zobrazení po F5)
                setTimeout(() => {
                  instance.fitView({ padding: 0.2, duration: 800 });
                }, 100);
              }}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
              selectionOnDrag
              panOnDrag
              panOnScroll={true}
              zoomOnScroll={true}
              zoomOnDoubleClick={false}
              selectionMode="partial"
              selectionKeyCode="Shift"
              multiSelectionKeyCode="Control"
              selectNodesOnDrag={false}
              onSelectionChange={(params) => {
                const selectedNodesCount = params.nodes.length;
                const selectedEdgesCount = params.edges.length;
                const totalSelected = selectedNodesCount + selectedEdgesCount;
                
                // Zobrazit detail panel jen když je vybrán právě 1 prvek
                if (totalSelected === 1) {
                  if (selectedNodesCount === 1) {
                    setSelectedNode(params.nodes[0]);
                    setSelectedEdge(null);
                    setShowDetailPanel(true);
                  } else if (selectedEdgesCount === 1) {
                    setSelectedEdge(params.edges[0]);
                    setSelectedNode(null);
                    setShowDetailPanel(true);
                  }
                } else if (totalSelected > 1) {
                  // Multi-select - skrýt panel
                  setShowDetailPanel(false);
                  setSelectedNode(null);
                  setSelectedEdge(null);
                } else {
                  // Nic není vybráno
                  setShowDetailPanel(false);
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }
              }}
            >
                    <Background color="#cbd5e1" gap={20} size={1} />
                    <Controls />
                    <MiniMap 
                      nodeColor={(node) => {
                        if (node.data?.type === 'template') return '#f59e0b'; // Oranžová pro šablony
                        if (node.data?.type === 'location') return '#92400e'; // Tmavě hnědá pro lokality
                        if (node.data?.type === 'department') return '#059669'; // Tmavě zelená pro útvary
                        return '#3b82f6'; // Modrá pro uživatele
                      }}
                      maskColor="rgba(245, 247, 250, 0.8)"
                      pannable={true}
                      zoomable={true}
                      style={{
                        background: 'white',
                        border: '1px solid #e0e6ed',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    />
                    {showHelp ? (
                      <Panel position="top-left" style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e0e6ed',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '16px',
                        width: '360px',
                        maxHeight: 'calc(100vh - 120px)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px',
                          paddingBottom: '10px',
                          borderBottom: '1px solid #e0e6ed'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.4rem' }}>💡</span>
                            <strong style={{ color: '#2c3e50', fontSize: '0.95rem' }}>Nápověda</strong>
                          </div>
                          <button
                            onClick={() => {
                              setShowHelp(false);
                              localStorage.setItem('hierarchy_help_collapsed', 'true');
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.3rem',
                              color: '#94a3b8',
                              padding: '4px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '6px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#64748b';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#94a3b8';
                            }}
                            title="Skrýt nápovědu"
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          color: '#64748b',
                          fontSize: '0.82rem',
                          lineHeight: '1.5',
                          paddingRight: '8px'
                        }}>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              1. Ovládání plátna:
                            </strong>
                            • <strong>Posun:</strong> Táhněte myší (bez klávesy)<br/>
                            • <strong>SHIFT + tažení:</strong> Výběr více nodů najednou<br/>
                            • <strong>CTRL + klik:</strong> Přidat/odebrat node do výběru
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              2. Přidejte uživatele:
                            </strong>
                            • Přetáhněte z levého panelu<br/>
                            • Nebo použijte 🤖 AI Struktura
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              3. Vytvořte vztah (šipku):
                            </strong>
                            • Najděte 🟢 zelený kroužek DOLE u nadřízeného<br/>
                            • Držte a táhněte myší<br/>
                            • Pusťte na 🔵 modrý kroužek NAHOŘE u podřízeného
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              4. Přerovnání:
                            </strong>
                            • Tlacitko 📐 Prerovnat = automaticky layout<br/>
                            • Nebo přetahujte uzly ručně
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#2c3e50', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              5. Detail vztahu:
                            </strong>
                            • Klikněte na šipku → otevře se pravý panel<br/>
                            • Nastavte práva a lokality
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#f5576c', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              6. Ulozeni:
                            </strong>
                            • Tlačítko "Uložit do DB" vpravo nahoře
                          </div>
                          <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                            <strong style={{ color: '#10b981', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>
                              💾 Auto-save:
                            </strong>
                            <span style={{ fontSize: '0.8rem' }}>
                              Pozice uzlu se ukladaji automaticky do localStorage a obnovi se po refreshi. Draft se vymaze po ulozeni do DB.
                            </span>
                          </div>
                        </div>
                      </Panel>
                    ) : (
                      <Panel position="top-left" style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e0e6ed',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        width: '52px',
                        height: '52px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setShowHelp(true);
                        localStorage.setItem('hierarchy_help_collapsed', 'false');
                      }}>
                        <span 
                          style={{ fontSize: '1.7rem', transition: 'transform 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          title="Zobrazit nápovědu"
                        >
                          💡
                        </span>
                      </Panel>
                    )}
            </ReactFlow>
          </CanvasArea>

        {showDetailPanel && (selectedNode || selectedEdge) && (
          <DetailPanel>
            <DetailHeader>
              <DetailHeaderTitle>
                <FontAwesomeIcon icon={faEdit} />
                {selectedNode ? 'Detail uzlu' : 'Detail vztahu'}
              </DetailHeaderTitle>
              <InfoButton onClick={() => setShowDetailHelpModal(true)}>
                <FontAwesomeIcon icon={faInfoCircle} />
              </InfoButton>
              <CloseButton onClick={() => {
                setShowDetailPanel(false);
                setSelectedNode(null);
                setSelectedEdge(null);
                setNodes((nds) =>
                  nds.map((n) => ({
                    ...n,
                    data: { ...n.data, isSelected: false }
                  }))
                );
              }}>
                <FontAwesomeIcon icon={faTimes} />
              </CloseButton>
            </DetailHeader>

            <DetailContent>
              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faUserTie} />
                  Základní informace
                </DetailSectionTitle>
                
                {/* NOTIFIKAČNÍ ŠABLONA */}
                {selectedNode && selectedNode.data.type === 'template' && (
                  <>
                    <FormGroup>
                      <Label>Název šablony</Label>
                      <Input value={selectedNode.data.label || selectedNode.data.name} readOnly />
                    </FormGroup>
                    
                    {/* NASTAVENÍ HTML ŠABLON PRO NORMÁLNÍ A MIMOŘÁDNÝ STAV */}
                    {(() => {
                      const template = allNotificationTemplates.find(t => t.id === selectedNode.data.templateId);
                      if (!template) return null;
                      
                      // Parser všech variant z email_body podle <!-- RECIPIENT: TYPE -->
                      // ✅ FÁZE 1 UPGRADE - Podporuje RECIPIENT i APPROVER_NORMAL
                      const parseAllVariants = (emailBody) => {
                        if (!emailBody) return [];
                        
                        const variants = [];
                        
                        // Definice všech možných variant (nový GENERIC RECIPIENT systém)
                        const variantTypes = [
                          // ✅ RECIPIENT - univerzální příjemce (dle org. hierarchie)
                          { type: 'RECIPIENT', icon: '📧', name: 'Příjemce (univerzální varianta)', priority: 'normal' },
                          
                          // ✅ SUBMITTER - autor/spouštěč akce (potvrzení, info)
                          { type: 'SUBMITTER', icon: '✅', name: 'Autor akce (potvrzovací varianta)', priority: 'info' },
                          
                          // 🔧 LEGACY - zpětná kompatibilita (bude postupně odstraněno)
                          { type: 'APPROVER_NORMAL', icon: '🟠', name: '[LEGACY] Schvalovatel normální', priority: 'legacy' },
                          { type: 'APPROVER_URGENT', icon: '🔴', name: '[LEGACY] Schvalovatel urgentní', priority: 'legacy' }
                        ];
                        
                        variantTypes.forEach(variantDef => {
                          const marker = `<!-- RECIPIENT: ${variantDef.type} -->`;
                          if (emailBody.includes(marker)) {
                            variants.push({
                              type: variantDef.type,
                              icon: variantDef.icon,
                              name: variantDef.name
                            });
                          }
                        });
                        
                        return variants;
                      };
                      
                      const availableVariants = parseAllVariants(template.email_telo || template.email_body);
                      
                      // Určení výchozích hodnot
                      const defaultVariant = availableVariants.length > 0 ? availableVariants[0].type : '';
                      
                      if (availableVariants.length === 0) {
                        return (
                          <div style={{
                            padding: '12px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            color: '#991b1b',
                            fontSize: '0.85rem'
                          }}>
                            ⚠️ <strong>Varování:</strong> Email šablona neobsahuje žádné varianty
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          {/* Výběr varianty pro WARNING */}
                          <FormGroup>
                            <Label>🟡 WARNING varianta</Label>
                            <select
                              value={templateNormalVariant || defaultVariant}
                              onChange={(e) => setTemplateNormalVariant(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.9rem'
                              }}
                            >
                              {availableVariants.filter(v => v.priority !== 'legacy').map(variant => (
                                <option key={variant.type} value={variant.type}>
                                  {variant.icon} {variant.name}
                                </option>
                              ))}
                            </select>
                          </FormGroup>
                          
                          {/* Výběr varianty pro URGENT */}
                          <FormGroup>
                            <Label>🔴 URGENT varianta</Label>
                            <select
                              value={templateUrgentVariant || defaultVariant}
                              onChange={(e) => setTemplateUrgentVariant(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.9rem'
                              }}
                            >
                              {availableVariants.filter(v => v.priority !== 'legacy').map(variant => (
                                <option key={variant.type} value={variant.type}>
                                  {variant.icon} {variant.name}
                                </option>
                              ))}
                            </select>
                          </FormGroup>
                          
                          {/* Výběr varianty pro INFO */}
                          <FormGroup>
                            <Label>🔵 INFO varianta</Label>
                            <select
                              value={templateInfoVariant || defaultVariant}
                              onChange={(e) => setTemplateInfoVariant(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.9rem'
                              }}
                            >
                              {availableVariants.filter(v => v.priority !== 'legacy').map(variant => (
                                <option key={variant.type} value={variant.type}>
                                  {variant.icon} {variant.name}
                                </option>
                              ))}
                            </select>
                          </FormGroup>
                          
                          {/* Výběr pro náhled */}
                          <FormGroup style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                            <Label>Varianta pro náhled</Label>
                            <select
                              value={templatePreviewVariant || templateNormalVariant || defaultVariant}
                              onChange={(e) => setTemplatePreviewVariant(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                background: '#f8fafc'
                              }}
                            >
                              {availableVariants.map(variant => (
                                <option key={variant.type} value={variant.type}>
                                  {variant.icon} {variant.name}
                                </option>
                              ))}
                            </select>
                          </FormGroup>
                        </>
                      );
                    })()}
                    
                    {/* Event Types - kdy se notifikace spustí */}
                    <FormGroup style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                      <Label>
                        📅 Kdy poslat notifikaci (Event Types)
                        <span style={{ color: '#3b82f6', marginLeft: '4px' }}>*</span>
                      </Label>
                      <CustomSelect
                        multiple
                        value={templateEventTypes}
                        onChange={(value) => setTemplateEventTypes(value)}
                        options={(() => {
                          const raw = (notificationEventTypes || []).map(eventType => {
                            // ✅ NORMALIZOVAT KÓD - převést staré na nové anglické
                            const rawCode = eventType.kod || eventType.code;
                            const code = normalizeEventTypeCode(rawCode);
                            
                            const category = eventType.kategorie || eventType.category || null;
                            // ✅ Český popis ber primárně z backendu/DB (`nazev`),
                            // fallback na FE helper mapping (pro starší/legacy případy)
                            const czechLabel = (eventType.nazev || eventType.name || '').toString().trim() || getNotificationTypeLabel(code);

                            // Skupina: primárně podle kategorie z BE, fallback podle prefixu
                            let groupKey = 'other';
                            let groupLabel = 'Ostatní';
                            const cat = (category || '').toString().toLowerCase();

                            if (cat === 'invoices' || code?.startsWith('INVOICE_')) {
                              groupKey = 'invoices';
                              groupLabel = 'Faktury';
                            } else if (cat === 'orders' || code?.startsWith('ORDER_')) {
                              groupKey = 'orders';
                              groupLabel = 'Objednávky';
                            } else if (cat === 'contracts' || code?.startsWith('CONTRACT_')) {
                              groupKey = 'contracts';
                              groupLabel = 'Smlouvy';
                            } else if (cat === 'cashbook' || code?.startsWith('CASHBOOK_')) {
                              groupKey = 'cashbook';
                              groupLabel = 'Pokladna';
                            }

                            return {
                              id: code,
                              value: code,
                              // ✅ Formát pro uživatele (2 řádky):
                              // TRIGGER_CODE
                              // (Český popis)
                              // Hodnota = code (nemění se) → nerozbije uložené přiřazení v hierarchii
                              label: `${code}\n(${czechLabel})`,
                              groupKey,
                              groupLabel
                            };
                          });

                          // Seřadit uvnitř skupin podle labelu
                          const groupsOrder = [
                            { key: 'orders', label: 'Objednávky' },
                            { key: 'invoices', label: 'Faktury' },
                            { key: 'contracts', label: 'Smlouvy' },
                            { key: 'cashbook', label: 'Pokladna' },
                            { key: 'other', label: 'Ostatní' }
                          ];

                          const byGroup = raw.reduce((acc, opt) => {
                            const k = opt.groupKey || 'other';
                            if (!acc[k]) acc[k] = [];
                            acc[k].push(opt);
                            return acc;
                          }, {});

                          for (const k of Object.keys(byGroup)) {
                            byGroup[k].sort((a, b) => (a.label || '').localeCompare((b.label || ''), 'cs'));
                          }

                          const finalOptions = [];
                          for (const g of groupsOrder) {
                            const items = byGroup[g.key] || [];
                            if (items.length === 0) continue;
                            finalOptions.push({
                              id: `__group_${g.key}`,
                              value: `__group_${g.key}`,
                              label: g.label,
                              isGroupHeader: true,
                              groupKey: g.key
                            });
                            finalOptions.push(...items);
                          }

                          return finalOptions;
                        })()}
                        placeholder="Vyberte event types..."
                        field="templateEventTypes"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                        hasTriedToSubmit={false}
                      />
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#64748b', 
                        marginTop: '6px'
                      }}>
                        💡 Např. ORDER_PENDING_APPROVAL, ORDER_APPROVED...
                      </div>
                    </FormGroup>
                    
                    {/* Info o routingu */}
                    <div style={{
                      padding: '8px',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#0369a1',
                      marginTop: '12px'
                    }}>
                      💡 Na <strong>EDGE</strong> vyberete kterou variantu poslat (WARN/URGENT/INFO)
                    </div>
                    
                    {/* PREVIEW NOTIFIKACE */}
                    {(() => {
                      const template = allNotificationTemplates.find(t => t.id === selectedNode.data.templateId);
                      
                      if (!template) return null;
                      
                      // 🎭 MOCK DATA pro náhled - kompletní seznam všech možných placeholderů
                      const mockData = {
                        // Základní údaje objednávky
                        order_number: 'O-2025-00142',
                        order_id: '142',
                        ev_cislo: 'O-2025-00142',
                        cislo_objednavky: 'O-2025-00142',
                        
                        // Stav a data
                        status: 'Ke schválení',
                        old_status: 'Nová',
                        new_status: 'Ke schválení',
                        datum_vytvoreni: '14.12.2025',
                        datum_pozadavku: '14.12.2025',
                        datum_zmeny: '14.12.2025 15:30',
                        
                        // Předmět - všechny varianty
                        predmet: 'Nákup kancelářského vybavení pro oddělení IT',
                        order_subject: 'Nákup kancelářského vybavení pro oddělení IT',
                        subject: 'Nákup kancelářského vybavení pro oddělení IT',
                        
                        // Ceny
                        cena_celkem: '45 670 Kč',
                        cena_bez_dph: '37 743 Kč',
                        cena_s_dph: '45 670 Kč',
                        max_price_with_dph: '50 000 Kč',
                        
                        // Dodavatel
                        dodavatel: 'ALZA.cz s.r.o.',
                        supplier_name: 'ALZA.cz s.r.o.',
                        supplier: 'ALZA.cz s.r.o.',
                        
                        // Žadatel/Požadovatel
                        pozadovatel_jmeno: 'Jan Novák',
                        pozadovatel_email: 'jan.novak@example.com',
                        pozadovatel: 'Jan Novák',
                        requester_name: 'Jan Novák',
                        requester_email: 'jan.novak@example.com',
                        
                        // Schvalovatel
                        schvalovatel_jmeno: 'Ing. Petr Svoboda',
                        schvalovatel_email: 'petr.svoboda@example.com',
                        approver_name: 'Ing. Petr Svoboda',
                        approver_email: 'petr.svoboda@example.com',
                        
                        // Akce a uživatel akce
                        action_user_name: 'Jan Novák',
                        action_performed_by: 'Jan Novák',
                        action_date: '14.12.2025 15:30',
                        
                        // URL a odkazy
                        url_objednavky: 'https://eeo.example.com/order-form-25?edit=142',
                        order_url: 'https://eeo.example.com/order-form-25?edit=142',
                        url: 'https://eeo.example.com/order-form-25?edit=142',
                        
                        // Poznámky a důvody
                        poznamka: 'Nutné schválit do konce týdne kvůli slevové akci',
                        reason: 'Změna schvalování dle interních směrnic',
                        comment: 'Žádné další poznámky',
                        
                        // Obecné
                        user_name: 'Jan Novák',
                        user_email: 'jan.novak@example.com',
                        recipient_name: 'Ing. Petr Svoboda',
                        
                        // Datum a čas
                        date: '14.12.2025',
                        time: '15:30',
                        datetime: '14.12.2025 15:30'
                      };
                      
                      // Funkce pro nahrazení placeholderů mock daty (podporuje {key} i {{key}})
                      const replacePlaceholders = (text) => {
                        if (!text) return text;
                        let result = text;
                        Object.keys(mockData).forEach(key => {
                          // Nahradit {key} i {{key}}
                          const regex1 = new RegExp(`\\{${key}\\}`, 'g');
                          const regex2 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                          result = result.replace(regex1, mockData[key]);
                          result = result.replace(regex2, mockData[key]);
                        });
                        return result;
                      };
                      
                      return (
                        <>
                          {/* Preview In-App Notifikace - STEJNÝ STYL JAKO ZVONĚČEK */}
                          {((template.app_nadpis || template.app_title) || (template.app_zprava || template.app_message)) && (
                            <div style={{ marginTop: '16px' }}>
                              <Label style={{ marginBottom: '8px', display: 'block' }}>
                                <FontAwesomeIcon icon={faBell} style={{ marginRight: '6px', color: '#f5576c' }} />
                                Náhled In-App notifikace (zvoněček)
                              </Label>
                              {/* Simulace NotificationItem ze zvonečku */}
                              <div style={{
                                padding: '16px',
                                borderLeft: '4px solid #3b82f6',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'start',
                                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                borderRadius: '8px',
                                border: '1px solid #93c5fd'
                              }}>
                                {/* Ikona notifikace */}
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '20px',
                                  flexShrink: 0,
                                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                  color: 'white',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                  ℹ️
                                </div>
                                
                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {/* Title - TUČNÝ */}
                                  <div style={{
                                    fontWeight: 700,
                                    color: '#111827',
                                    fontSize: '14px',
                                    lineHeight: 1.4,
                                    marginBottom: '4px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                  }}>
                                    {replacePlaceholders(template.app_nadpis || template.app_title) || 'Schválena: O-1958/75030926/2025/IT'}
                                  </div>
                                  
                                  {/* Message */}
                                  {(template.app_zprava || template.app_message) && (
                                    <div style={{
                                      fontSize: '13px',
                                      color: '#6b7280',
                                      lineHeight: 1.5,
                                      marginBottom: '6px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical'
                                    }}>
                                      {replacePlaceholders(template.app_zprava || template.app_message)}
                                    </div>
                                  )}
                                  
                                  {/* Meta - čas + uživatel */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '12px',
                                    color: '#9ca3af',
                                    marginTop: '6px'
                                  }}>
                                    {/* Čas */}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      🕐 Před 1 h
                                    </span>
                                    {/* Uživatel */}
                                    <span style={{
                                      background: '#f3e8ff',
                                      color: '#6b21a8',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 500
                                    }}>
                                      👤 {mockData.action_performed_by || 'Jan Novák'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div style={{
                                marginTop: '6px',
                                fontSize: '0.7rem',
                                color: '#64748b',
                                fontStyle: 'italic'
                              }}>
                                💡 Přesně toto uvidí uživatel ve zvonečku • Mock data pro ukázku
                              </div>
                            </div>
                          )}
                          
                          {/* Preview Email Notifikace - KOMPLETNÍ NÁHLED s MOCK daty */}
                          <div style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <Label style={{ marginBottom: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '6px', color: '#667eea' }} />
                                Náhled Email šablony
                                {(() => {
                                  const variantType = templatePreviewVariant || templateNormalVariant || 'APPROVER_NORMAL';
                                  const variantLabels = {
                                    'APPROVER_NORMAL': '🟠',
                                    'APPROVER_URGENT': '🔴',
                                    'SUBMITTER': '🟢',
                                    'DEFAULT': '📋'
                                  };
                                  return (
                                    <span style={{
                                      padding: '4px 10px',
                                      background: '#f3f4f6',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      color: '#374151'
                                    }}>
                                      {variantLabels[variantType] || '📋'} {
                                        variantType === 'APPROVER_NORMAL' ? 'Normální' :
                                        variantType === 'APPROVER_URGENT' ? 'Mimořádný' :
                                        variantType === 'SUBMITTER' ? 'Autor' :
                                        'Výchozí'
                                      }
                                    </span>
                                  );
                                })()}
                              </Label>
                              <button
                                onClick={() => {
                                  setFullscreenEmailData({
                                    template,
                                    mockData,
                                    replacePlaceholders,
                                    selectedVariantType: templatePreviewVariant || templateNormalVariant || 'APPROVER_NORMAL'
                                  });
                                  setShowFullscreenEmailModal(true);
                                }}
                                style={{
                                  padding: '8px',
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '36px',
                                  height: '36px',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                                }}
                                title="Otevřít fullscreen náhled"
                              >
                                <FontAwesomeIcon icon={faExpand} />
                              </button>
                            </div>
                            <div style={{
                              border: '2px solid #667eea',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              background: 'white',
                              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
                            }}>
                              {/* Email Header */}
                              <div style={{
                                padding: '8px 12px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                fontSize: '0.75rem'
                              }}>
                                <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ fontSize: '0.8rem' }}>📧 Email Preview</strong>
                                </div>
                                <div style={{ marginBottom: '3px', opacity: 0.95, fontSize: '0.7rem' }}>
                                  <strong>Předmět:</strong> {replacePlaceholders(template.email_predmet || template.email_subject || 'Bez předmětu')}
                                </div>
                                <div style={{ marginBottom: '3px', opacity: 0.95, fontSize: '0.7rem' }}>
                                  <strong>Odesílatel:</strong> EEO Systém &lt;noreply@eeo.cz&gt;
                                </div>
                                <div style={{ opacity: 0.95, fontSize: '0.7rem' }}>
                                  <strong>Příjemce:</strong> {mockData.recipient_name || mockData.user_name} &lt;{mockData.user_email}&gt;
                                </div>
                              </div>
                              {/* Email Body - KOMPLETNÍ SCROLLOVATELNÝ náhled - ZMENŠENO */}
                              <div style={{
                                padding: '8px',
                                fontSize: '0.5rem',
                                lineHeight: '1.3',
                                color: '#1f2937',
                                maxHeight: '400px',
                                minHeight: '150px',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                background: '#ffffff',
                                zoom: '0.6',
                                transformOrigin: 'top left'
                              }}
                              className="email-preview-body"
                              >
                                <div 
                                  dangerouslySetInnerHTML={{ 
                                    __html: replacePlaceholders(
                                      (() => {
                                        // Extrakce správné varianty podle výběru v templatePreviewVariant
                                        const selectedVariantType = templatePreviewVariant || templateNormalVariant || 'APPROVER_NORMAL';
                                        const emailBody = template.email_telo || template.email_body || '<p style="color: #9ca3af; font-style: italic;">Email tělo není definováno v šabloně</p>';
                                        
                                        // Pokud není delimiter, vrať celý email_body
                                        if (!emailBody.includes('<!-- RECIPIENT:')) {
                                          return emailBody;
                                        }
                                        
                                        // Extrahuj specifickou variantu
                                        const delimiter = `<!-- RECIPIENT: ${selectedVariantType} -->`;
                                        const startPos = emailBody.indexOf(delimiter);
                                        
                                        if (startPos === -1) {
                                          return emailBody; // Fallback
                                        }
                                        
                                        // Najdi začátek HTML (po delimiteru)
                                        let htmlStart = startPos + delimiter.length;
                                        
                                        // Najdi konec (další delimiter nebo konec stringu)
                                        const otherDelimiters = ['APPROVER_NORMAL', 'APPROVER_URGENT', 'SUBMITTER']
                                          .filter(d => d !== selectedVariantType)
                                          .map(d => `<!-- RECIPIENT: ${d} -->`);
                                        
                                        let htmlEnd = emailBody.length;
                                        for (const otherDelimiter of otherDelimiters) {
                                          const pos = emailBody.indexOf(otherDelimiter, htmlStart);
                                          if (pos !== -1 && pos < htmlEnd) {
                                            htmlEnd = pos;
                                          }
                                        }
                                        
                                        return emailBody.substring(htmlStart, htmlEnd).trim();
                                      })()
                                    ).replace(/\n/g, '<br />')
                                  }} 
                                />
                              </div>
                              {/* Email Footer */}
                              <div style={{
                                padding: '12px 20px',
                                background: '#f9fafb',
                                borderTop: '1px solid #e5e7eb',
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                textAlign: 'center'
                              }}>
                                📅 {mockData.datetime} • 🔔 Automatická notifikace z EEO systému
                              </div>
                            </div>
                            <div style={{
                              marginTop: '8px',
                              padding: '8px 12px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              color: '#1e40af',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>💡</span>
                              <span>Plně scrollovatelný náhled HTML šablony s nahrazenými placeholdery mock daty</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                    
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#92400e'
                    }}>
                      <strong>📧 Co tato šablona definuje:</strong>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                        <li>Kterému <strong>uživateli</strong> se notifikace pošle</li>
                        <li>Zda má uživatel <strong>notifikace zapnuté</strong></li>
                        <li>Zda má uživatel <strong>roli/práva</strong> pro příjem notifikace</li>
                        <li>Scope viditelnosti může určovat, zda notifikaci dostane</li>
                      </ul>
                    </div>
                    
                    {/* Zobrazení přiřazení - ke komu vede šipka */}
                    {(() => {
                      const recipients = edges
                        .filter(e => e.source === selectedNode.id)
                        .map(e => {
                          const targetNode = nodes.find(n => n.id === e.target);
                          return {
                            id: targetNode?.id,
                            name: targetNode?.data?.label || targetNode?.data?.name || 'Neznámý',
                            type: targetNode?.data?.type || 'user',
                            edgeId: e.id
                          };
                        });
                      
                      return (
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '12px', 
                          background: '#f0f9ff', 
                          border: '2px solid #3b82f6',
                          borderRadius: '8px' 
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '12px',
                            fontWeight: '600',
                            color: '#1e40af',
                            fontSize: '0.9rem'
                          }}>
                            <FontAwesomeIcon icon={faBell} />
                            Notifikace je přiřazena na:
                          </div>
                          
                          {recipients.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {recipients.map((recipient, i) => {
                                let icon = '👤';
                                let bgColor = '#dbeafe';
                                let textColor = '#1e40af';
                                
                                if (recipient.type === 'location') {
                                  icon = '📍';
                                  bgColor = '#d1fae5';
                                  textColor = '#065f46';
                                } else if (recipient.type === 'department') {
                                  icon = '🏢';
                                  bgColor = '#dbeafe';
                                  textColor = '#1e40af';
                                }
                                
                                return (
                                  <div key={i} style={{ 
                                    padding: '8px 12px', 
                                    background: bgColor,
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    color: textColor,
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                  onClick={() => {
                                    const node = nodes.find(n => n.id === recipient.id);
                                    if (node) {
                                      setSelectedNode(node);
                                      setSelectedEdge(null);
                                    }
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                  title="Klikněte pro zobrazení detailu">
                                    <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                                    <span>{recipient.name}</span>
                                    {recipient.type === 'location' && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(lokalita)</span>}
                                    {recipient.type === 'department' && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(úsek)</span>}
                                    {recipient.type === 'user' && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(uživatel)</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                              Šablona zatím není přiřazena k žádnému uživateli, lokalitě ani úseku
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* ODCHOZÍ NOTIFIKACE (komu se posílá) */}
                    {(() => {
                      const outgoingEdges = edges.filter(e => e.source === selectedNode.id);
                      if (outgoingEdges.length === 0) return (
                        <div style={{
                          marginTop: '16px',
                          padding: '12px',
                          background: '#fef3c7',
                          border: '2px solid #fbbf24',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#92400e'
                        }}>
                          ⚠️ <strong>Šablona není propojena s žádným příjemcem!</strong>
                          <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                            Přetáhněte šipku z této šablony na uživatele, roli nebo dynamického příjemce.
                          </div>
                        </div>
                      );
                      
                      return (
                        <div style={{
                          marginTop: '16px',
                          padding: '12px',
                          background: '#f0fdf4',
                          border: '2px solid #10b981',
                          borderRadius: '8px'
                        }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#065f46', marginBottom: '10px' }}>
                            📤 Odchozí notifikace ({outgoingEdges.length}):
                          </div>
                          {outgoingEdges.map((edge, idx) => {
                            const targetNode = nodes.find(n => n.id === edge.target);
                            const recipientType = targetNode?.data?.type === 'genericRecipient' 
                              ? targetNode.data.genericType 
                              : targetNode?.data?.type?.toUpperCase() || 'UNKNOWN';
                            const scopeFilter = edge.data?.scope_filter || 'NONE';
                            const recipientRole = edge.data?.recipientRole || 'INFO';
                            const eventTypes = edge.data?.eventTypes || [];
                            
                            const recipientTypeColors = {
                              'TRIGGER_USER': { bg: '#d1fae5', border: '#10b981', text: '#065f46', icon: '🎯' },
                              'ENTITY_AUTHOR': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: '✍️' },
                              'ENTITY_OWNER': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '👤' },
                              'USER': { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8', icon: '👤' },
                              'ROLE': { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3', icon: '🎭' }
                            };
                            
                            const colors = recipientTypeColors[recipientType] || { 
                              bg: '#f3f4f6', border: '#9ca3af', text: '#374151', icon: '❓' 
                            };
                            
                            return (
                              <div key={edge.id} style={{
                                padding: '10px',
                                background: colors.bg,
                                border: `2px solid ${colors.border}`,
                                borderRadius: '6px',
                                marginBottom: idx < outgoingEdges.length - 1 ? '8px' : '0',
                                fontSize: '0.85rem'
                              }}>
                                <div style={{ fontWeight: '700', color: colors.text, marginBottom: '6px' }}>
                                  {colors.icon} {targetNode?.data?.name || 'Unknown'} 
                                  <span style={{ fontWeight: '600', opacity: 0.8, marginLeft: '6px' }}>
                                    ({recipientType})
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: colors.text, lineHeight: '1.5' }}>
                                  <strong>🎯 Typ notifikace:</strong> {recipientRole}<br/>
                                  <strong>📍 Scope Filter:</strong> {scopeFilter}
                                  {scopeFilter === 'ENTITY_PARTICIPANTS' && <span style={{ color: '#10b981' }}> ⭐</span>}
                                  {eventTypes.length > 0 && (
                                    <>
                                      <br/><strong>⚡ Event Types:</strong> {eventTypes.slice(0, 2).map(et => normalizeEventTypeCode(et)).join(', ')}
                                      {eventTypes.length > 2 && ` +${eventTypes.length - 2} dalších`}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#047857', 
                            marginTop: '8px',
                            fontStyle: 'italic',
                            paddingTop: '8px',
                            borderTop: '1px solid #d1fae5'
                          }}>
                            💡 Klikněte na <strong>šipku (hranu)</strong> pro úpravu Scope Filter a typu notifikace
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
                
                {/* LOKALITA NODE */}
                {selectedNode && selectedNode.data.type === 'location' && (
                  <>
                    <FormGroup>
                      <Label>Název lokality</Label>
                      <Input value={selectedNode.data.label || selectedNode.data.name} readOnly />
                    </FormGroup>
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#f0fdf4',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#065f46'
                    }}>
                      <strong>📍 Co lokalita definuje:</strong>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                        <li>Rozšíření <strong>viditelnosti</strong> v rámci lokality</li>
                        <li>Určuje <strong>scope</strong> pro data (objednávky, faktury, pokladna)</li>
                        <li>Může mít dodatečná <strong>práva</strong> vázaná na lokalitu</li>
                      </ul>
                    </div>
                  </>
                )}
                
                {/* ÚSEK NODE */}
                {selectedNode && selectedNode.data.type === 'department' && (
                  <>
                    <FormGroup>
                      <Label>Název úseku</Label>
                      <Input value={selectedNode.data.label || selectedNode.data.name} readOnly />
                    </FormGroup>
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#eff6ff',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#1e40af'
                    }}>
                      <strong>🏢 Co úsek definuje:</strong>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                        <li>Rozšíření <strong>viditelnosti</strong> v rámci úseku</li>
                        <li>Určuje <strong>scope</strong> pro data (objednávky, faktury, pokladna)</li>
                        <li>Může mít dodatečná <strong>práva</strong> vázaná na úsek</li>
                      </ul>
                    </div>
                    
                    {/* TARGET NODE konfigurace - scope a delivery */}
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '16px', 
                      background: 'linear-gradient(135deg, #fff5f5 0%, #ffe4e6 100%)', 
                      border: '3px solid #f43f5e',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(244, 63, 94, 0.15)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        marginBottom: '16px',
                        fontWeight: '700',
                        color: '#be123c',
                        fontSize: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <FontAwesomeIcon icon={faBullseye} style={{ fontSize: '1.2rem' }} />
                        🎯 TARGET: Komu se pošle notifikace
                      </div>
                      
                      {/* Scope Type pro ÚSEK */}
                      <FormGroup>
                        <Label style={{ fontWeight: '600', color: '#881337', fontSize: '0.9rem' }}>
                          Rozsah příjemců
                        </Label>
                        <Select
                          value={targetScopeType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setTargetScopeType(newType);
                            const updatedNode = {
                              ...selectedNode,
                              data: {
                                ...selectedNode.data,
                                scopeDefinition: {
                                  ...(selectedNode.data.scopeDefinition || {}),
                                  type: newType,
                                  roleId: selectedNode.data.roleId
                                }
                              }
                            };
                            setSelectedNode(updatedNode);
                            setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                          }}
                          style={{ 
                            background: 'white', 
                            border: '2px solid #fb7185',
                            fontWeight: '500',
                            color: '#881337'
                          }}
                        >
                          <option value="ALL_IN_DEPARTMENT">🏢 Všichni v tomto úseku</option>
                          <option value="ENTITY_PARTICIPANTS">🤝 Účastníci entity (prikazce, garant, objednatel...)</option>
                          <option value="SELECTED">✅ Vybraní uživatelé z úseku</option>
                        </Select>
                      </FormGroup>
                      
                      {/* SELECTED: Výběr konkrétních uživatelů z úseku */}
                      {targetScopeType === 'SELECTED' && (
                        <FormGroup>
                          <Label style={{ fontWeight: '600', color: '#881337', fontSize: '0.85rem' }}>
                            Vyberte uživatele z úseku
                          </Label>
                          <div style={{ 
                            padding: '12px', 
                            background: '#fff', 
                            border: '2px solid #fb7185',
                            borderRadius: '8px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}>
                            {loadingUsers ? (
                              <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '20px' }}>
                                ⏳ Načítám uživatele z úseku {selectedNode.data.name}...
                              </div>
                            ) : availableUsersForRole.length === 0 ? (
                              <div style={{ fontSize: '0.85rem', color: '#dc2626', textAlign: 'center', padding: '20px' }}>
                                ⚠️ Žádní uživatelé v tomto úseku
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px', fontStyle: 'italic' }}>
                                  💡 Zaškrtněte uživatele z úseku, kteří dostanou notifikaci
                                </div>
                                {availableUsersForRole.map(user => (
                                  <label key={user.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    transition: 'background 0.2s',
                                    background: targetSelectedIds.includes(String(user.id)) ? '#fef3c7' : 'transparent'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = targetSelectedIds.includes(String(user.id)) ? '#fef3c7' : '#f9fafb'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = targetSelectedIds.includes(String(user.id)) ? '#fef3c7' : 'transparent'}>
                                    <input
                                      type="checkbox"
                                      checked={targetSelectedIds.includes(String(user.id))}
                                      onChange={(e) => {
                                        const userId = String(user.id);
                                        let newIds;
                                        if (e.target.checked) {
                                          newIds = [...targetSelectedIds, userId];
                                        } else {
                                          newIds = targetSelectedIds.filter(id => id !== userId);
                                        }
                                        setTargetSelectedIds(newIds);
                                        const updatedNode = {
                                          ...selectedNode,
                                          data: {
                                            ...selectedNode.data,
                                            scopeDefinition: {
                                              ...selectedNode.data.scopeDefinition,
                                              selectedIds: newIds
                                            }
                                          }
                                        };
                                        setSelectedNode(updatedNode);
                                        setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                                      }}
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', fontWeight: targetSelectedIds.includes(String(user.id)) ? '600' : '400' }}>
                                      {user.jmeno && user.prijmeni ? `${user.jmeno} ${user.prijmeni}` : (user.full_name || user.username)}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>
                                      ID: {user.id}
                                    </span>
                                  </label>
                                ))}
                                <div style={{ 
                                  marginTop: '12px', 
                                  paddingTop: '12px', 
                                  borderTop: '1px dashed #e5e7eb',
                                  fontSize: '0.75rem',
                                  color: '#059669',
                                  fontWeight: '600'
                                }}>
                                  ✅ Vybráno: {targetSelectedIds.length} z {availableUsersForRole.length} uživatelů
                                </div>
                              </>
                            )}
                          </div>
                        </FormGroup>
                      )}
                      
                      {/* ENTITY_PARTICIPANTS: Info */}
                      {selectedNode.data.scopeDefinition?.type === 'ENTITY_PARTICIPANTS' && (
                        <div style={{ 
                          marginTop: '10px',
                          padding: '12px',
                          background: '#fef3c7',
                          border: '2px solid #f59e0b',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: '#78350f'
                        }}>
                          <strong>💡 Jak to funguje:</strong>
                          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                            <li>Systém načte <strong>všechny účastníky entity</strong> z vybraných polí (prikazce_id, garant_uzivatel_id, objednatel_id, uzivatel_id, dodavatel_potvrdil_id, fakturant_id, atd.)</li>
                            <li>Pokud je některý z nich <strong>z tohoto úseku</strong>, dostane notifikaci</li>
                            <li>Funguje jako <strong>filtr "úsek"</strong> na seznam účastníků</li>
                          </ul>
                        </div>
                      )}
                      
                      {/* Delivery Options */}
                      <div style={{ 
                        marginTop: '16px', 
                        paddingTop: '16px', 
                        borderTop: '2px dashed #fda4af'
                      }}>
                        <Label style={{ fontWeight: '600', color: '#881337', fontSize: '0.9rem', marginBottom: '12px' }}>
                          Způsob doručení
                        </Label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '2px solid #fda4af',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fb7185'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fda4af'}>
                            <input
                              type="checkbox"
                              checked={targetDeliveryEmail}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTargetDeliveryEmail(checked);
                                const updatedNode = {
                                  ...selectedNode,
                                  data: {
                                    ...selectedNode.data,
                                    delivery: {
                                      ...(selectedNode.data.delivery || {}),
                                      email: checked
                                    }
                                  }
                                };
                                setSelectedNode(updatedNode);
                                setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#881337' }}>
                              📧 Email
                            </span>
                          </label>
                          
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '2px solid #fda4af',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fb7185'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fda4af'}>
                            <input
                              type="checkbox"
                              checked={targetDeliveryInApp}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTargetDeliveryInApp(checked);
                                const updatedNode = {
                                  ...selectedNode,
                                  data: {
                                    ...selectedNode.data,
                                    delivery: {
                                      ...(selectedNode.data.delivery || {}),
                                      inApp: checked
                                    }
                                  }
                                };
                                setSelectedNode(updatedNode);
                                setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#881337' }}>
                              🔔 In-app notifikace (zvoneček)
                            </span>
                          </label>
                          
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '2px solid #fda4af',
                            transition: 'all 0.2s',
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fb7185'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fda4af'}>
                            <input
                              type="checkbox"
                              checked={targetDeliverySms}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTargetDeliverySms(checked);
                                const updatedNode = {
                                  ...selectedNode,
                                  data: {
                                    ...selectedNode.data,
                                    delivery: {
                                      ...(selectedNode.data.delivery || {}),
                                      sms: checked
                                    }
                                  }
                                };
                                setSelectedNode(updatedNode);
                                setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#881337' }}>
                              📱 SMS (zatím nedostupné)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* ROLE NODE */}
                {selectedNode && selectedNode.data.type === 'role' && (
                  <>
                    <FormGroup>
                      <Label>Název role</Label>
                      <Input value={selectedNode.data.label || selectedNode.data.name} readOnly />
                    </FormGroup>
                    {selectedNode.data.metadata?.popis && (
                      <FormGroup>
                        <Label>Popis</Label>
                        <Input value={selectedNode.data.metadata.popis} readOnly />
                      </FormGroup>
                    )}
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#f5f3ff',
                      border: '2px solid #8b5cf6',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#6b21a8'
                    }}>
                      <strong>🛡️ Co role definuje:</strong>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                        <li>Sadu <strong>oprávnění</strong> pro moduly (objednávky, faktury, pokladna)</li>
                        <li>Přiřazení <strong>uživatelům</strong> pro dědění práv</li>
                        <li>Možnost přijímat <strong>notifikace</strong> pro celou roli</li>
                      </ul>
                    </div>
                    
                    {/* Zobrazení přiřazených uživatelů */}
                    {(() => {
                      const assignedUsers = edges
                        .filter(e => e.target === selectedNode.id)
                        .map(e => {
                          const sourceNode = nodes.find(n => n.id === e.source);
                          return {
                            id: sourceNode?.id,
                            name: sourceNode?.data?.label || sourceNode?.data?.name || 'Neznámý',
                            position: sourceNode?.data?.position || '',
                            edgeId: e.id
                          };
                        });
                      
                      return (
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '12px', 
                          background: '#eff6ff', 
                          border: '2px solid #3b82f6',
                          borderRadius: '8px' 
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '12px',
                            fontWeight: '600',
                            color: '#1e40af',
                            fontSize: '0.9rem'
                          }}>
                            <FontAwesomeIcon icon={faUsers} />
                            Uživatelé s touto rolí ({assignedUsers.length})
                          </div>
                          
                          {assignedUsers.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {assignedUsers.map((user, i) => (
                                <div key={i} style={{ 
                                  padding: '8px 12px', 
                                  background: '#dbeafe',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  color: '#1e40af',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px'
                                }}
                                onClick={() => {
                                  const node = nodes.find(n => n.id === user.id);
                                  if (node) {
                                    setSelectedNode(node);
                                    setSelectedEdge(null);
                                  }
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                title="Klikněte pro zobrazení detailu uživatele">
                                  <span style={{ fontSize: '1rem' }}>👤 {user.name}</span>
                                  {user.position && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{user.position}</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                              Role zatím není přiřazena žádnému uživateli
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Oprávnění modulů role */}
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      background: '#fef3c7', 
                      border: '2px solid #f59e0b',
                      borderRadius: '8px' 
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '12px',
                        fontWeight: '600',
                        color: '#92400e',
                        fontSize: '0.9rem'
                      }}>
                        <FontAwesomeIcon icon={faUserShield} />
                        Oprávnění modulů
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '10px' }}>
                        Tato role má přístup k následujícím modulům:
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                          // Najít roli v allRoles podle roleId
                          const role = allRoles.find(r => r.id === selectedNode.data.roleId);
                          const modules = role?.modules || { orders: false, invoices: false, cashbook: false };
                          
                          return ['orders', 'invoices', 'cashbook'].map(module => {
                            const hasPermission = modules[module] === true || modules[module] === 1;
                            const moduleNames = {
                              orders: '📦 Objednávky',
                              invoices: '📄 Faktury',
                              cashbook: '💰 Pokladna'
                            };
                            
                            return (
                              <div key={module} style={{ 
                                padding: '8px 12px', 
                                background: hasPermission ? '#d1fae5' : '#fee2e2',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: hasPermission ? '#065f46' : '#991b1b',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{ fontSize: '1.2rem' }}>{hasPermission ? '✅' : '❌'}</span>
                                <span>{moduleNames[module]}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    
                    {/* TARGET NODE konfigurace - scope a delivery */}
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '16px', 
                      background: 'linear-gradient(135deg, #fff5f5 0%, #ffe4e6 100%)', 
                      border: '3px solid #f43f5e',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(244, 63, 94, 0.15)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        marginBottom: '16px',
                        fontWeight: '700',
                        color: '#be123c',
                        fontSize: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <FontAwesomeIcon icon={faBullseye} style={{ fontSize: '1.2rem' }} />
                        🎯 TARGET: Komu se pošle notifikace
                      </div>
                      
                      {/* Scope Type */}
                      <FormGroup>
                        <Label style={{ fontWeight: '600', color: '#881337', fontSize: '0.9rem' }}>
                          Rozsah příjemců
                        </Label>
                        <Select
                          value={targetScopeType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setTargetScopeType(newType);
                            
                            // Pokud je DYNAMIC_FROM_ENTITY a field chybí, nastav default
                            const currentField = selectedNode.data?.scopeDefinition?.field;
                            const fieldToUse = (newType === 'DYNAMIC_FROM_ENTITY' && !currentField) 
                              ? targetScopeField || 'prikazce_id' 
                              : currentField;
                            
                            const updatedNode = {
                              ...selectedNode,
                              data: {
                                ...selectedNode.data,
                                scopeDefinition: {
                                  ...(selectedNode.data.scopeDefinition || {}),
                                  type: newType,
                                  roleId: selectedNode.data.roleId,
                                  ...(newType === 'DYNAMIC_FROM_ENTITY' && { field: fieldToUse })
                                }
                              }
                            };
                            setSelectedNode(updatedNode);
                            setNodes(nodes.map(n => n.id === selectedNode.id ? updatedNode : n));
                          }}
                          style={{ 
                            border: '2px solid #fb7185',
                            fontWeight: '500',
                            color: '#881337'
                          }}
                        >
                          <option value="ALL">🌐 Všichni uživatelé s touto rolí</option>
                          <option value="SELECTED">✅ Jen vybraní uživatelé</option>
                          <option value="DYNAMIC_FROM_ENTITY">⚡ Dynamicky z pole entity</option>
                        </Select>
                      </FormGroup>
                      
                      {/* DYNAMIC: Výběr polí (MULTI-SELECT) */}
                      {targetScopeType === 'DYNAMIC_FROM_ENTITY' && (
                        <FormGroup>
                          <Label style={{ fontWeight: '600', color: '#881337', fontSize: '0.85rem' }}>
                            🔗 Pole entity pro automatické získání příjemců
                          </Label>
                          <div style={{ 
                            padding: '12px', 
                            background: 'white', 
                            border: '2px solid #fb7185',
                            borderRadius: '8px',
                            maxHeight: '400px',
                            overflowY: 'auto'
                          }}>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#9f1239',
                              marginBottom: '12px',
                              fontStyle: 'italic'
                            }}>
                              💡 Zaškrtněte pole z kterých chcete získat ID uživatelů. Systém pošle notifikaci všem vybraným uživatelům, pokud mají správnou roli.
                            </div>
                            
                            {allUserFields.map(field => (
                              <label key={field.value} style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '8px',
                                padding: '10px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                transition: 'background 0.2s',
                                background: targetScopeFields.includes(field.value) ? '#fef3c7' : 'transparent',
                                border: targetScopeFields.includes(field.value) ? '1px solid #f59e0b' : '1px solid transparent'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = targetScopeFields.includes(field.value) ? '#fef3c7' : '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.background = targetScopeFields.includes(field.value) ? '#fef3c7' : 'transparent'}>
                                <input
                                  type="checkbox"
                                  checked={targetScopeFields.includes(field.value)}
                                  onChange={(e) => {
                                    const fieldValue = field.value;
                                    let newFields;
                                    if (e.target.checked) {
                                      newFields = [...targetScopeFields, fieldValue];
                                    } else {
                                      newFields = targetScopeFields.filter(f => f !== fieldValue);
                                    }
                                    setTargetScopeFields(newFields);
                                    
                                    // Update single field for backward compatibility
                                    setTargetScopeField(newFields[0] || 'prikazce_id');
                                    
                                    const updatedNode = {
                                      ...selectedNode,
                                      data: {
                                        ...selectedNode.data,
                                        scopeDefinition: {
                                          ...selectedNode.data.scopeDefinition,
                                          fields: newFields, // NOVÝ multi-field systém
                                          field: newFields[0] || 'prikazce_id' // LEGACY kompatibilita
                                        }
                                      }
                                    };
                                    setSelectedNode(updatedNode);
                                    setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                                  }}
                                  style={{ 
                                    marginTop: '2px',
                                    transform: 'scale(1.1)'
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#374151' }}>
                                    {field.label}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                                    Tabulka: {field.table}
                                  </div>
                                </div>
                              </label>
                            ))}
                            
                            {targetScopeFields.length === 0 && (
                              <div style={{ 
                                fontSize: '0.8rem', 
                                color: '#dc2626', 
                                textAlign: 'center', 
                                padding: '20px',
                                fontWeight: '500'
                              }}>
                                ⚠️ Musíte vybrat alespoň jedno pole!
                              </div>
                            )}
                            
                            {targetScopeFields.length > 0 && (
                              <div style={{ 
                                marginTop: '12px',
                                padding: '8px',
                                background: '#f0fdf4',
                                border: '1px solid #22c55e',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                color: '#15803d'
                              }}>
                                ✅ Vybráno {targetScopeFields.length} pole: {targetScopeFields.join(', ')}
                              </div>
                            )}
                          </div>
                        </FormGroup>
                      )}
                      
                      {/* SELECTED: Výběr konkrétních uživatelů */}
                      {targetScopeType === 'SELECTED' && (
                        <FormGroup>
                          <Label style={{ fontWeight: '600', color: '#881337', fontSize: '0.85rem' }}>
                            Vyberte konkrétní uživatele
                          </Label>
                          <div style={{ 
                            padding: '12px', 
                            background: '#fff', 
                            border: '2px solid #fb7185',
                            borderRadius: '8px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}>
                            {loadingUsers ? (
                              <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '20px' }}>
                                ⏳ Načítám uživatele s rolí {selectedNode.data.name}...
                              </div>
                            ) : availableUsersForRole.length === 0 ? (
                              <div style={{ fontSize: '0.85rem', color: '#dc2626', textAlign: 'center', padding: '20px' }}>
                                ⚠️ Žádní uživatelé s touto rolí
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px', fontStyle: 'italic' }}>
                                  💡 Zaškrtněte uživatele, kteří dostanou notifikaci
                                </div>
                                {availableUsersForRole.map(user => (
                                  <label key={user.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    transition: 'background 0.2s',
                                    background: targetSelectedIds.includes(String(user.id)) ? '#fef3c7' : 'transparent'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = targetSelectedIds.includes(String(user.id)) ? '#fef3c7' : '#f9fafb'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = targetSelectedIds.includes(String(user.id)) ? '#fef3c7' : 'transparent'}>
                                    <input
                                      type="checkbox"
                                      checked={targetSelectedIds.includes(String(user.id))}
                                      onChange={(e) => {
                                        const userId = String(user.id);
                                        let newIds;
                                        if (e.target.checked) {
                                          newIds = [...targetSelectedIds, userId];
                                        } else {
                                          newIds = targetSelectedIds.filter(id => id !== userId);
                                        }
                                        setTargetSelectedIds(newIds);
                                        const updatedNode = {
                                          ...selectedNode,
                                          data: {
                                            ...selectedNode.data,
                                            scopeDefinition: {
                                              ...selectedNode.data.scopeDefinition,
                                              selectedIds: newIds
                                            }
                                          }
                                        };
                                        setSelectedNode(updatedNode);
                                        setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                                      }}
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', fontWeight: targetSelectedIds.includes(String(user.id)) ? '600' : '400' }}>
                                      {user.jmeno && user.prijmeni ? `${user.jmeno} ${user.prijmeni}` : (user.full_name || user.username)}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>
                                      ID: {user.id}
                                    </span>
                                  </label>
                                ))}
                                <div style={{ 
                                  marginTop: '12px', 
                                  paddingTop: '12px', 
                                  borderTop: '1px dashed #e5e7eb',
                                  fontSize: '0.75rem',
                                  color: '#059669',
                                  fontWeight: '600'
                                }}>
                                  ✅ Vybráno: {targetSelectedIds.length} z {availableUsersForRole.length} uživatelů
                                </div>
                              </>
                            )}
                          </div>
                        </FormGroup>
                      )}
                      
                      {/* Delivery Options */}
                      <div style={{ 
                        marginTop: '16px', 
                        paddingTop: '16px', 
                        borderTop: '2px dashed #fda4af'
                      }}>
                        <Label style={{ fontWeight: '600', color: '#881337', fontSize: '0.9rem', marginBottom: '12px' }}>
                          Způsob doručení
                        </Label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '2px solid #fda4af',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fb7185'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fda4af'}>
                            <input
                              type="checkbox"
                              checked={targetDeliveryEmail}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTargetDeliveryEmail(checked);
                                const updatedNode = {
                                  ...selectedNode,
                                  data: {
                                    ...selectedNode.data,
                                    delivery: {
                                      ...(selectedNode.data.delivery || {}),
                                      email: checked
                                    }
                                  }
                                };
                                setSelectedNode(updatedNode);
                                setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#881337' }}>
                              📧 Email
                            </span>
                          </label>
                          
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '2px solid #fda4af',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fb7185'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fda4af'}>
                            <input
                              type="checkbox"
                              checked={targetDeliveryInApp}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTargetDeliveryInApp(checked);
                                const updatedNode = {
                                  ...selectedNode,
                                  data: {
                                    ...selectedNode.data,
                                    delivery: {
                                      ...(selectedNode.data.delivery || {}),
                                      inApp: checked
                                    }
                                  }
                                };
                                setSelectedNode(updatedNode);
                                setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#881337' }}>
                              🔔 In-app notifikace (zvoneček)
                            </span>
                          </label>
                          
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '2px solid #fda4af',
                            transition: 'all 0.2s',
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fb7185'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fda4af'}>
                            <input
                              type="checkbox"
                              checked={targetDeliverySms}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTargetDeliverySms(checked);
                                const updatedNode = {
                                  ...selectedNode,
                                  data: {
                                    ...selectedNode.data,
                                    delivery: {
                                      ...(selectedNode.data.delivery || {}),
                                      sms: checked
                                    }
                                  }
                                };
                                setSelectedNode(updatedNode);
                                setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#881337' }}>
                              📱 SMS (zatím nedostupné)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {/* ✅ NOVÉ: LP KÓD NODE */}
                {selectedNode && selectedNode.data.type === 'lp_kod' && (
                  <>
                    <FormGroup>
                      <Label>LP kód (Číslo limitovaného příslibu)</Label>
                      <Input value={selectedNode.data.lp_cislo || 'Neuvedeno'} readOnly style={{ fontWeight: '600', fontSize: '1.1rem', color: '#dc2626' }} />
                    </FormGroup>
                    <FormGroup>
                      <Label>Název/Účel</Label>
                      <Input value={selectedNode.data.nazev || 'Neuvedeno'} readOnly />
                    </FormGroup>
                    <FormGroup>
                      <Label>Úsek</Label>
                      <Input value={selectedNode.data.usek || 'Neuvedeno'} readOnly style={{ background: '#f0fdf4', fontWeight: '500', border: '1px solid #86efac' }} />
                    </FormGroup>
                    {selectedNode.data.metadata?.orderCount !== undefined && (
                      <FormGroup>
                        <Label>Počet objednávek s tímto LP</Label>
                        <Input value={selectedNode.data.metadata.orderCount || 0} readOnly style={{ background: '#fef3c7', fontWeight: '600', border: '1px solid #f59e0b' }} />
                      </FormGroup>
                    )}
                    
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: '#fee2e2',
                      border: '2px solid #dc2626',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#991b1b'
                    }}>
                      <strong>📋 Co LP kód definuje:</strong>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                        <li>Uživatelé mohou <strong>čerpat</strong> z tohoto LP kódu při vytváření objednávek</li>
                        <li>LP kód má <strong>limit</strong> a kontrolu čerpání</li>
                        <li>Propojení přes <strong>edge</strong> určuje, kdo může čerpat</li>
                      </ul>
                    </div>
                    
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      background: '#f0f9ff', 
                      border: '2px solid #3b82f6',
                      borderRadius: '8px' 
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '12px',
                        fontWeight: '600',
                        color: '#1e40af',
                        fontSize: '0.9rem'
                      }}>
                        <FontAwesomeIcon icon={faUsers} />
                        Kdo může čerpat z tohoto LP kódu
                      </div>
                      
                      {(() => {
                        const incomingEdges = edges.filter(e => e.target === selectedNode.id);
                        
                        if (incomingEdges.length === 0) {
                          return (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                              Zatím není přiřazen žádný uživatel nebo role
                            </div>
                          );
                        }
                        
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {incomingEdges.map((edge, i) => {
                              const sourceNode = nodes.find(n => n.id === edge.source);
                              const sourceType = sourceNode?.data?.type || 'user';
                              const icon = sourceType === 'role' ? '🛡️' : '👤';
                              
                              return (
                                <div key={i} style={{ 
                                  padding: '8px 12px', 
                                  background: '#dbeafe',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  color: '#1e40af',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onClick={() => {
                                  setSelectedEdge(edge);
                                  setSelectedNode(null);
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                title="Klikněte pro zobrazení detailu vztahu">
                                  {icon} {sourceNode?.data?.name || 'Neznámý'}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
                
                {/* ✅ NOVÉ: FINANCOVÁNÍ NODE */}
                {selectedNode && selectedNode.data.type === 'financing' && (
                  <>
                    <FormGroup>
                      <Label>Typ financování</Label>
                      <Input value={selectedNode.data.typ || 'Neuvedeno'} readOnly style={{ fontWeight: '600', fontSize: '1.1rem', color: '#16a34a' }} />
                    </FormGroup>
                    <FormGroup>
                      <Label>Název</Label>
                      <Input value={selectedNode.data.nazev || selectedNode.data.typ || 'Neuvedeno'} readOnly />
                    </FormGroup>
                    {selectedNode.data.popis && (
                      <FormGroup>
                        <Label>Popis</Label>
                        <Input value={selectedNode.data.popis} readOnly style={{ background: '#f0fdf4', border: '1px solid #86efac' }} />
                      </FormGroup>
                    )}
                    
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: '#f0fdf4',
                      border: '2px solid #16a34a',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#15803d'
                    }}>
                      <strong>💰 Co způsob financování definuje:</strong>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                        <li>Uživatelé mohou používat tento <strong>způsob platby</strong></li>
                        <li>Definuje <strong>typ financování</strong> (rozpočet, grant, projekt...)</li>
                        <li>Propojení přes <strong>edge</strong> určuje, kdo může používat</li>
                      </ul>
                    </div>
                    
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      background: '#f0f9ff', 
                      border: '2px solid #3b82f6',
                      borderRadius: '8px' 
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '12px',
                        fontWeight: '600',
                        color: '#1e40af',
                        fontSize: '0.9rem'
                      }}>
                        <FontAwesomeIcon icon={faUsers} />
                        Kdo může používat toto financování
                      </div>
                      
                      {(() => {
                        const incomingEdges = edges.filter(e => e.target === selectedNode.id);
                        
                        if (incomingEdges.length === 0) {
                          return (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                              Zatím není přiřazen žádný uživatel nebo role
                            </div>
                          );
                        }
                        
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {incomingEdges.map((edge, i) => {
                              const sourceNode = nodes.find(n => n.id === edge.source);
                              const sourceType = sourceNode?.data?.type || 'user';
                              const icon = sourceType === 'role' ? '🛡️' : '👤';
                              
                              return (
                                <div key={i} style={{ 
                                  padding: '8px 12px', 
                                  background: '#dbeafe',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  color: '#1e40af',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onClick={() => {
                                  setSelectedEdge(edge);
                                  setSelectedNode(null);
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                title="Klikněte pro zobrazení detailu vztahu">
                                  {icon} {sourceNode?.data?.name || 'Neznámý'}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
                
                {/* UŽIVATELSKÝ NODE */}
                {selectedNode && (!selectedNode.data.type || selectedNode.data.type === 'user') && (
                  <>
                    <FormGroup>
                      <Label>Uživatel</Label>
                      <Input value={selectedNode.data.name} readOnly />
                    </FormGroup>
                    <FormGroup>
                      <Label>Pozice</Label>
                      <Input value={selectedNode.data.position} readOnly />
                    </FormGroup>
                    <FormGroup style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e6ed' }}>
                      <Label style={{ color: '#10b981' }}>
                        📍 Výchozí lokalita (z DB)
                      </Label>
                      <Input 
                        value={selectedNode.data.metadata?.location || 'Neuvedeno'} 
                        readOnly 
                        style={{ background: '#f0fdf4', fontWeight: '500', border: '1px solid #86efac' }}
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label style={{ color: '#10b981' }}>
                        🏢 Výchozí úsek (z DB)
                      </Label>
                      <Input 
                        value={selectedNode.data.metadata?.department || 'Neuvedeno'} 
                        readOnly 
                        style={{ background: '#f0fdf4', fontWeight: '500', border: '1px solid #86efac' }}
                      />
                    </FormGroup>
                    
                    {/* ✅ NOVÉ: Info panel - pro nastavení klikni na konkrétní edge */}
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '16px', 
                      background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)', 
                      border: '3px solid #3b82f6',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        marginBottom: '12px',
                        fontWeight: '700',
                        color: '#1e40af',
                        fontSize: '0.95rem'
                      }}>
                        <FontAwesomeIcon icon={faInfoCircle} style={{ fontSize: '1.2rem' }} />
                        Nastavení vztahů
                      </div>
                      
                      <div style={{ 
                        padding: '12px',
                        background: 'white',
                        border: '2px solid #93c5fd',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#1e3a8a',
                        lineHeight: '1.6'
                      }}>
                        💡 <strong>Jak nastavit notifikace, oprávnění nebo LP kódy:</strong><br/>
                        • <strong>Klikni na šipku (edge)</strong> mezi uzly<br/>
                        • Zobrazí se nastavení podle typu vztahu:<br/>
                        &nbsp;&nbsp;→ Šablona → Uživatel: způsob doručení (email/in-app)<br/>
                        &nbsp;&nbsp;→ Uživatel → Uživatel: scope, moduly, rozšířené lokality<br/>
                        &nbsp;&nbsp;→ Uživatel → LP kód: info o čerpání<br/>
                        &nbsp;&nbsp;→ Uživatel → Financování: info o způsobu platby
                      </div>
                    </div>
                  </>
                )}
                
                {/* Sekce: Aktuální vztahy v diagramu - pouze pro USER node */}
                {selectedNode && (!selectedNode.data.type || selectedNode.data.type === 'user') && (
                  <div style={{ 
                    marginTop: '24px', 
                    padding: '12px', 
                    background: '#f0f9ff', 
                    border: '2px solid #3b82f6',
                    borderRadius: '8px' 
                  }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '12px',
                        fontWeight: '600',
                        color: '#1e40af',
                        fontSize: '0.9rem'
                      }}>
                        <FontAwesomeIcon icon={faSitemap} />
                        Aktuální vztahy v diagramu
                      </div>
                      
                      {(() => {
                        // Najdi příchozí vztahy (šipky směřující DO tohoto nodu)
                        const incomingEdges = edges
                          .filter(e => e.target === selectedNode.id)
                          .map(e => {
                            const sourceNode = nodes.find(n => n.id === e.source);
                            const sourceType = sourceNode?.data?.type || 'user';
                            
                            let icon = '👤';
                            let typeLabel = 'Uživatel';
                            let color = '#3b82f6';
                            
                            if (sourceType === 'template') {
                              icon = '📧';
                              typeLabel = 'Notifikace';
                              color = '#8b5cf6';
                            } else if (sourceType === 'role') {
                              icon = '🛡️';
                              typeLabel = 'Role';
                              color = '#a855f7';
                            } else if (sourceType === 'location') {
                              icon = '📍';
                              typeLabel = 'Lokalita';
                              color = '#10b981';
                            } else if (sourceType === 'department') {
                              icon = '🏢';
                              typeLabel = 'Úsek';
                              color = '#3b82f6';
                            } else if (e.data?.relationshipType === 'zastupovani') {
                              typeLabel = 'Zastupování';
                            } else {
                              typeLabel = 'Nadřízený';
                            }
                            
                            return {
                              name: sourceNode?.data?.name || 'Neznámý',
                              edgeId: e.id,
                              icon,
                              typeLabel,
                              color
                            };
                          });
                        
                        // Najdi odchozí vztahy (šipky směřující Z tohoto nodu)
                        const outgoingEdges = edges
                          .filter(e => e.source === selectedNode.id)
                          .map(e => {
                            const targetNode = nodes.find(n => n.id === e.target);
                            const targetType = targetNode?.data?.type || 'user';
                            
                            let icon = '👤';
                            let typeLabel = 'Podřízený';
                            let color = '#3b82f6';
                            
                            if (targetType === 'lp_kod') {
                              icon = '📋';
                              typeLabel = 'LP kód';
                              color = '#dc2626';
                            } else if (targetType === 'financing') {
                              icon = '💰';
                              typeLabel = 'Financování';
                              color = '#16a34a';
                            } else if (targetType === 'role') {
                              icon = '🛡️';
                              typeLabel = 'Role';
                              color = '#a855f7';
                            } else if (targetType === 'location') {
                              icon = '📍';
                              typeLabel = 'Lokalita';
                              color = '#10b981';
                            } else if (targetType === 'department') {
                              icon = '🏢';
                              typeLabel = 'Úsek';
                              color = '#3b82f6';
                            } else if (e.data?.relationshipType === 'zastupovani') {
                              typeLabel = 'Zastupování';
                            }
                            
                            return {
                              name: targetNode?.data?.name || targetNode?.data?.lp_cislo || targetNode?.data?.typ || 'Neznámý',
                              edgeId: e.id,
                              icon,
                              typeLabel,
                              color
                            };
                          });
                        
                        return (
                          <>
                            <div style={{ marginBottom: '12px' }}>
                              <strong style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '6px' }}>
                                ⬅️ Příchozí vztahy ({incomingEdges.length})
                              </strong>
                              {incomingEdges.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {incomingEdges.map((item, i) => (
                                    <div key={i} style={{ 
                                      padding: '8px 10px', 
                                      background: '#dbeafe',
                                      borderRadius: '6px',
                                      fontSize: '0.8rem',
                                      color: item.color,
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                    onClick={() => {
                                      const edge = edges.find(e => e.id === item.edgeId);
                                      if (edge) {
                                        setSelectedEdge(edge);
                                        setSelectedNode(null);
                                      }
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                    title="Klikněte pro zobrazení detailu vztahu">
                                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                      <div style={{ flex: 1 }}>
                                        <div>{item.name}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>({item.typeLabel})</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Žádné příchozí vztahy
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <strong style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '6px' }}>
                                ➡️ Odchozí vztahy ({outgoingEdges.length})
                              </strong>
                              {outgoingEdges.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {outgoingEdges.map((item, i) => (
                                    <div key={i} style={{ 
                                      padding: '8px 10px', 
                                      background: '#dbeafe',
                                      borderRadius: '6px',
                                      fontSize: '0.8rem',
                                      color: item.color,
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                    onClick={() => {
                                      const edge = edges.find(e => e.id === item.edgeId);
                                      if (edge) {
                                        setSelectedEdge(edge);
                                        setSelectedNode(null);
                                      }
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                    title="Klikněte pro zobrazení detailu vztahu">
                                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                      <div style={{ flex: 1 }}>
                                        <div>{item.name}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>({item.typeLabel})</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  Žádné odchozí vztahy
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                )}
                
                {selectedEdge && (() => {
                  const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                  const targetNode = nodes.find(n => n.id === selectedEdge.target);
                  
                  return (
                  <>
                    {/* Typ vztahu badge */}
                    <div style={{
                      marginBottom: '16px',
                      padding: '10px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(102,126,234,0.3)'
                    }}>
                      {(() => {
                        const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                        const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                        const relationInfo = getRelationshipTypeInfo(sourceType, targetType);
                        return `${relationInfo.icon} ${relationInfo.label}`;
                      })()}
                    </div>
                    
                    <FormGroup>
                      <Label>{(() => {
                        const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                        const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                        return getRelationshipTypeInfo(sourceType, targetType).sourceLabel;
                      })()}</Label>
                      <Input value={sourceNode?.data?.label || sourceNode?.data?.name || 'Neznámý'} readOnly style={{ fontWeight: '600', color: '#059669' }} />
                    </FormGroup>
                    <FormGroup>
                      <Label>{(() => {
                        const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                        const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                        return getRelationshipTypeInfo(sourceType, targetType).targetLabel;
                      })()}</Label>
                      <Input value={targetNode?.data?.label || targetNode?.data?.name || 'Neznámý'} readOnly style={{ fontWeight: '600', color: '#3b82f6' }} />
                    </FormGroup>
                    
                    {/* Vysvětlení logiky vztahu */}
                    <div style={{
                      marginTop: '16px',
                      marginBottom: '16px',
                      padding: '12px',
                      background: '#f0fdf4',
                      border: '2px solid #86efac',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#15803d'
                    }}>
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', lineHeight: '1.6' }}>
                        {(() => {
                          const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                          const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                          const sourceName = sourceNode?.data?.name?.split(' ')[0] || 'Zdroj';
                          const targetName = targetNode?.data?.name?.split(' ')[0] || 'Cíl';
                          
                          // Template → User/Location/Department (NOTIFIKACE)
                          if (sourceType === 'template') {
                            if (targetType === 'user') {
                              return (
                                <>
                                  <strong>{targetName}</strong> bude dostávat notifikace podle šablony <strong>{sourceName}</strong>.<br/>
                                  <strong>Typ notifikace</strong> určuje prioritu (důležitá/schvalovací/informační).<br/>
                                  <strong>Event Types</strong> určují, kdy se notifikace odešle.
                                </>
                              );
                            } else {
                              return (
                                <>
                                  Všichni uživatelé v <strong>{targetName}</strong> dostanou notifikace podle šablony <strong>{sourceName}</strong>.<br/>
                                  <strong>Event Types</strong> určují, kdy se notifikace odešle.
                                </>
                              );
                            }
                          }
                          
                          // Ostatní vztahy (PRÁVA)
                          return (
                            <>
                              <strong>{sourceName}</strong> získá práva vidět data od <strong>{targetName}</strong>.<br/>
                              <strong>Rozsah</strong> a <strong>Moduly</strong> určují, co přesně uvidí (objednávky/faktury/pokladnu).<br/>
                              <strong>Rozšířené lokality/úseky</strong> přidávají další data mimo základní vztah.
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Typ vztahu - zobraz JEN pro user-user vztahy */}
                    {(() => {
                      const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                      const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                      
                      if (sourceType === 'user' && targetType === 'user') {
                        return (
                          <FormGroup>
                            <Label>Typ vztahu</Label>
                            <Select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)}>
                              <option value="prime">Přímý nadřízený</option>
                              <option value="zastupovani">Zastupování</option>
                              <option value="delegovani" disabled style={{ color: '#9ca3af' }}>Delegování (TODO)</option>
                              <option value="rozsirene" disabled style={{ color: '#9ca3af' }}>Rozšířené oprávnění (TODO)</option>
                            </Select>
                          </FormGroup>
                        );
                      }
                      return null;
                    })()}
                  </>
                  );
                })()}
                
                {/* Sekce Základní vlastnosti vztahu - POUZE pro edge */}
                {selectedEdge && (() => {
                  const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                  const targetNode = nodes.find(n => n.id === selectedEdge.target);
                  const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                  const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                  const relationInfo = getRelationshipTypeInfo(sourceType, targetType);
                  
                  // Zobraz scope jen když má smysl (ne pro notifikace)
                  if (!relationInfo.showScope) return null;
                  
                  return (
                <FormGroup>
                  <Label>
                    Rozsah viditelnosti (Scope)
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', marginLeft: '8px' }}>
                      → co uvidí {sourceNode?.data?.name?.split(' ')[0] || 'nadřízený'}?
                    </span>
                  </Label>
                  <Select value={relationshipScope} onChange={(e) => setRelationshipScope(e.target.value)}>
                    <option value="OWN">🔒 OWN - Jen své vlastní záznamy</option>
                    <option value="TEAM">👥 TEAM - Záznamy svého úseku</option>
                    <option value="LOCATION">📍 LOCATION - Vše v rámci lokality</option>
                    <option value="ALL">🌐 ALL - Vše (admin přístup)</option>
                  </Select>
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#475569'
                  }}>
                    <strong>Vysvětlení:</strong>
                    <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                      <li><strong>OWN:</strong> Vidí jen své záznamy (vlastní objednávky/faktury)</li>
                      <li><strong>TEAM:</strong> Vidí záznamy celého úseku</li>
                      <li><strong>LOCATION:</strong> Vidí vše v rámci lokality (např. všechny úseky v Berouně)</li>
                      <li><strong>ALL:</strong> Vidí všechny záznamy v systému (nadřazený přístup)</li>
                    </ul>
                  </div>
                </FormGroup>
                  );
                })()}
                
                {/* Checkbox pro filtrování podle konkrétní objednávky (User→Department/Location) */}
                {selectedEdge && (() => {
                  const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                  const targetNode = nodes.find(n => n.id === selectedEdge.target);
                  const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                  const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                  
                  // Zobraz jen pro User → Department/Location vztahy
                  if (sourceType === 'user' && (targetType === 'department' || targetType === 'location')) {
                    return (
                      <FormGroup style={{ marginTop: '16px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '12px',
                          background: '#f0fdf4',
                          border: '2px solid #86efac',
                          borderRadius: '8px'
                        }}>
                          <input 
                            type="checkbox"
                            id="applyToOrdersOnly"
                            checked={selectedEdge.data?.applyToOrdersOnly || false}
                            onChange={(e) => {
                              setEdges(edges.map(edge => 
                                edge.id === selectedEdge.id 
                                  ? { ...edge, data: { ...edge.data, applyToOrdersOnly: e.target.checked }}
                                  : edge
                              ));
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              marginTop: '2px'
                            }}
                          />
                          <label htmlFor="applyToOrdersOnly" style={{ cursor: 'pointer', flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>
                              🎯 Platí jen pro objednávky z tohoto {targetType === 'department' ? 'úseku' : 'lokality'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#166534', lineHeight: '1.5' }}>
                              <strong>✅ Zapnuto:</strong> Uživatel uvidí/upraví jen objednávky vytvořené v tomto {targetType === 'department' ? 'úseku' : 'lokalitě'}.<br/>
                              <strong>❌ Vypnuto:</strong> Viditelnost se řídí podle nastaveného Scope (OWN/TEAM/LOCATION/ALL).
                            </div>
                          </label>
                        </div>
                      </FormGroup>
                    );
                  }
                  return null;
                })()}
              </DetailSection>

              {/* Sekce Oprávnění pro moduly - POUZE pro edge (vztahy) kde má smysl */}
              {selectedEdge && (() => {
                const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                const targetNode = nodes.find(n => n.id === selectedEdge.target);
                const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                const relationInfo = getRelationshipTypeInfo(sourceType, targetType);
                
                if (!relationInfo.showModules) return null;
                
                return (
              <>
              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faEye} />
                  Oprávnění pro moduly (workflow)
                </DetailSectionTitle>
                
                {/* Info box s vysvětlením */}
                <div style={{
                  padding: '12px',
                  background: '#f0f9ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#1e40af',
                  marginBottom: '16px'
                }}>
                  <strong>ℹ️ Jak to funguje:</strong>
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#3b82f6' }}>
                    Vztah rozšíří viditelnost dat podle lokalit a úseků.
                    Uživatel MUSÍ mít základní právo (roli) pro přístup k modulu.
                  </div>
                </div>
                
                <CheckboxGroup>
                  {/* AKTIVNÍ MODULY - s workflow podporou */}
                  <CheckboxLabel>
                    <input 
                      type="checkbox" 
                      checked={moduleVisibility.orders}
                      onChange={(e) => setModuleVisibility(prev => ({ ...prev, orders: e.target.checked }))}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span>📋 <strong>Objednávky</strong></span>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        AKTIVNÍ
                      </span>
                    </div>
                  </CheckboxLabel>
                  {moduleVisibility.orders && (
                    <div style={{ marginLeft: '32px', marginTop: '6px', marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Úroveň práv pro nadřízeného:</label>
                      <select
                        value={permissionLevel.orders}
                        onChange={(e) => setPermissionLevel(prev => ({ ...prev, orders: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          background: 'white'
                        }}
                      >
                        <option value="READ_ONLY">👁️ Jen čtení (vidí záznamy)</option>
                        <option value="READ_WRITE">✏️ Čtení + Editace</option>
                        <option value="READ_WRITE_DELETE">🗑️ Plný přístup (i mazání)</option>
                        <option value="INHERIT">🔗 Dědit práva podřízeného</option>
                      </select>
                    </div>
                  )}
                  
                  <CheckboxLabel>
                    <input 
                      type="checkbox" 
                      checked={moduleVisibility.invoices}
                      onChange={(e) => setModuleVisibility(prev => ({ ...prev, invoices: e.target.checked }))}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span>🧾 <strong>Faktury</strong></span>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        AKTIVNÍ
                      </span>
                    </div>
                  </CheckboxLabel>
                  {moduleVisibility.invoices && (
                    <div style={{ marginLeft: '32px', marginTop: '6px', marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Úroveň práv pro nadřízeného:</label>
                      <select
                        value={permissionLevel.invoices}
                        onChange={(e) => setPermissionLevel(prev => ({ ...prev, invoices: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          background: 'white'
                        }}
                      >
                        <option value="READ_ONLY">👁️ Jen čtení (vidí záznamy)</option>
                        <option value="READ_WRITE">✏️ Čtení + Editace</option>
                        <option value="READ_WRITE_DELETE">🗑️ Plný přístup (i mazání)</option>
                        <option value="INHERIT">🔗 Dědit práva podřízeného</option>
                      </select>
                    </div>
                  )}
                  
                  <div style={{ marginLeft: '0px', paddingLeft: '0px' }}>
                    <CheckboxLabel>
                      <input 
                        type="checkbox"
                        checked={moduleVisibility.cashbook}
                        onChange={(e) => setModuleVisibility(prev => ({ ...prev, cashbook: e.target.checked }))}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span>💰 <strong>Pokladna</strong></span>
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          ČÁSTEČNĚ
                        </span>
                      </div>
                    </CheckboxLabel>
                    {/* Sub-option pro pokladnu */}
                    <div style={{ marginLeft: '32px', marginTop: '6px', marginBottom: '6px' }}>
                      <CheckboxLabel style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                        <input 
                          type="checkbox"
                          checked={moduleVisibility.cashbookReadonly}
                          onChange={(e) => setModuleVisibility(prev => ({ ...prev, cashbookReadonly: e.target.checked }))}
                          disabled={!moduleVisibility.cashbook}
                        />
                        <span style={{ color: '#64748b' }}>📖 Jen pro čtení (read-only)</span>
                      </CheckboxLabel>
                    </div>
                    {moduleVisibility.cashbook && (
                      <div style={{ marginLeft: '32px', marginTop: '6px', marginBottom: '12px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Úroveň práv pro nadřízeného:</label>
                        <select
                          value={permissionLevel.cashbook}
                          onChange={(e) => setPermissionLevel(prev => ({ ...prev, cashbook: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            background: 'white'
                          }}
                        >
                          <option value="READ_ONLY">👁️ Jen čtení (vidí záznamy)</option>
                          <option value="READ_WRITE">✏️ Čtení + Editace</option>
                          <option value="READ_WRITE_DELETE">🗑️ Plný přístup (i mazání)</option>
                          <option value="INHERIT">🔗 Dědit práva podřízeného</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {/* NEAKTIVNÍ MODULY - zatím bez workflow */}
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px dashed #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '8px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Plánované moduly (TODO):
                    </div>
                    
                    <CheckboxLabel style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      <input 
                        type="checkbox" 
                        disabled
                        checked={moduleVisibility.contracts}
                        onChange={(e) => setModuleVisibility(prev => ({ ...prev, contracts: e.target.checked }))}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📄 Smlouvy</span>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>(připravujeme)</span>
                      </div>
                    </CheckboxLabel>
                  </div>
                </CheckboxGroup>
                
                {/* Poznámka o právech */}
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#92400e'
                }}>
                  <strong>⚠️ Důležité:</strong> Vztah funguje jen pokud má uživatel globální právo
                  (např. <code style={{ background: '#fef3c7', padding: '2px 4px', borderRadius: '3px' }}>INVOICE_MANAGE</code>).
                </div>
              </DetailSection>
              </>
                );
              })()}

              {/* Sekce Rozšířené lokality/úseky - POUZE pro edge (vztahy) kde má smysl */}
              {selectedEdge && (() => {
                const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                const targetNode = nodes.find(n => n.id === selectedEdge.target);
                const sourceType = sourceNode?.data?.metadata?.type || sourceNode?.data?.type || 'user';
                const targetType = targetNode?.data?.metadata?.type || targetNode?.data?.type || 'user';
                const relationInfo = getRelationshipTypeInfo(sourceType, targetType);
                
                if (!relationInfo.showExtended) return null;
                
                return (
              <>
              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  Rozšířené lokality
                </DetailSectionTitle>
                <FormGroup>
                  <CustomSelect
                    value={selectedExtendedLocations}
                    onChange={(newValues) => setSelectedExtendedLocations(newValues)}
                    options={allLocations}
                    placeholder="Vyberte lokality..."
                    field="extendedLocations"
                    multiple={true}
                    selectStates={selectStates}
                    setSelectStates={setSelectStates}
                    searchStates={searchStates}
                    setSearchStates={setSearchStates}
                    touchedSelectFields={touchedSelectFields}
                    setTouchedSelectFields={setTouchedSelectFields}
                    toggleSelect={toggleSelect}
                    filterOptions={filterOptions}
                    getOptionLabel={getOptionLabel}
                    hasTriedToSubmit={false}
                  />
                </FormGroup>
              </DetailSection>

              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faBuilding} />
                  Rozšířené úseky
                </DetailSectionTitle>
                <FormGroup>
                  <CustomSelect
                    value={selectedExtendedDepartments}
                    onChange={(newValues) => setSelectedExtendedDepartments(newValues)}
                    options={allDepartments}
                    placeholder="Vyberte úseky..."
                    field="extendedDepartments"
                    multiple={true}
                    selectStates={selectStates}
                    setSelectStates={setSelectStates}
                    searchStates={searchStates}
                    setSearchStates={setSearchStates}
                    touchedSelectFields={touchedSelectFields}
                    setTouchedSelectFields={setTouchedSelectFields}
                    toggleSelect={toggleSelect}
                    filterOptions={filterOptions}
                    getOptionLabel={getOptionLabel}
                    hasTriedToSubmit={false}
                  />
                </FormGroup>
              </DetailSection>

              <Divider />

              <DetailSection>
                <DetailSectionTitle>
                  <FontAwesomeIcon icon={faLayerGroup} />
                  Kombinace lokalita + úsek
                </DetailSectionTitle>
                <p style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '12px' }}>
                  Specifické kombinace lokalita+úsek (AND logika). Např. "jen IT z Berouna".
                </p>
                {selectedCombinations.length > 0 ? (
                  <CombinationTable>
                    <thead>
                      <tr>
                        <th>Lokalita</th>
                        <th>Úsek</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCombinations.map((combo, index) => {
                        const location = allLocations.find(l => l.id === combo.locationId);
                        const department = allDepartments.find(d => d.id === combo.departmentId);
                        return (
                          <tr key={index}>
                            <td>{location?.name || 'N/A'}</td>
                            <td>{department?.name || 'N/A'}</td>
                            <td>
                              <button onClick={() => {
                                setSelectedCombinations(prev => prev.filter((_, i) => i !== index));
                              }}>
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </CombinationTable>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#adb5bd', fontStyle: 'italic', marginTop: '8px' }}>
                    Zatim zadne kombinace
                  </p>
                )}
                <CombinationAddRow>
                  <FormGroup style={{ marginBottom: 0 }}>
                    <Label>Lokalita</Label>
                    <Select id="combo-location-select">
                      <option value="">-- Vyberte lokalitu --</option>
                      {allLocations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.code ? `(${loc.code})` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup style={{ marginBottom: 0 }}>
                    <Label>Úsek</Label>
                    <Select id="combo-department-select">
                      <option value="">-- Vyberte úsek --</option>
                      {allDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <button onClick={() => {
                    const locSelect = document.getElementById('combo-location-select');
                    const deptSelect = document.getElementById('combo-department-select');
                    const locationId = locSelect.value;
                    const departmentId = deptSelect.value;
                    
                    if (locationId && departmentId) {
                      // Check if combination already exists
                      const exists = selectedCombinations.some(
                        c => c.locationId === locationId && c.departmentId === departmentId
                      );
                      
                      if (!exists) {
                        setSelectedCombinations(prev => [...prev, { locationId, departmentId }]);
                        locSelect.value = '';
                        deptSelect.value = '';
                      }
                    }
                  }}>
                    Pridat
                  </button>
                </CombinationAddRow>
              </DetailSection>
              </>
                );
              })()}

              {/* Sekce notifikací - zobraz jen když edge obsahuje template */}
              {selectedEdge && (() => {
                const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                const targetNode = nodes.find(n => n.id === selectedEdge.target);
                const isTemplateEdge = sourceNode?.data?.type === 'template' || targetNode?.data?.type === 'template';
                
                if (!isTemplateEdge) return null;
                
                // Najdi template node
                const templateNode = sourceNode?.data?.type === 'template' ? sourceNode : targetNode;
                
                return (
                  <>
                    <DetailSection>
                      <DetailSectionTitle>
                        <FontAwesomeIcon icon={faBell} />
                        Nastavení notifikací
                      </DetailSectionTitle>
                      <div style={{ 
                        padding: '12px', 
                        background: '#fef3c7', 
                        borderRadius: '6px',
                        marginBottom: '12px',
                        border: '1px solid #fbbf24'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: '#78350f', fontWeight: 500 }}>
                          🔔 <strong>{templateNode?.data?.name}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '4px' }}>
                          Bude odesílána: {targetNode?.data?.type === 'template' ? sourceNode.data.name : targetNode.data.name}
                        </div>
                        <div style={{ 
                          fontSize: '0.7rem', 
                          color: '#92400e', 
                          marginTop: '6px',
                          fontStyle: 'italic',
                          paddingTop: '6px',
                          borderTop: '1px solid #fbbf24'
                        }}>
                          💡 Variantu HTML emailu vyberte v detailu notifikačního uzlu (klikněte na uzel)
                        </div>
                      </div>
                      
                      {/* Recipient Type Display */}
                      <div style={{ 
                        padding: '10px', 
                        background: '#e0f2fe', 
                        borderRadius: '6px',
                        marginBottom: '12px',
                        border: '2px solid #0ea5e9'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: '#0c4a6e', fontWeight: 600, marginBottom: '4px' }}>
                          👤 Typ příjemce
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 700 }}>
                          {(() => {
                            const recipientNode = targetNode?.data?.type === 'template' ? sourceNode : targetNode;
                            const nodeType = recipientNode?.data?.type;
                            const genericType = recipientNode?.data?.genericType;
                            
                            if (nodeType === 'genericRecipient' && genericType) {
                              const labels = {
                                'TRIGGER_USER': '🎯 Spouštěč akce',
                                'ENTITY_AUTHOR': '✍️ Objednatel / Autor',
                                'ENTITY_OWNER': '👤 Příkazce / Vlastník'
                              };
                              return labels[genericType] || genericType;
                            } else if (nodeType === 'user') {
                              return '👤 Konkrétní uživatel';
                            } else if (nodeType === 'role') {
                              return '🎭 Role (všichni s touto rolí)';
                            } else if (nodeType === 'group') {
                              return '👥 Skupina';
                            } else {
                              return nodeType?.toUpperCase() || 'NEZNÁMÝ';
                            }
                          })()}
                        </div>
                        <div style={{ 
                          fontSize: '0.7rem', 
                          color: '#0c4a6e', 
                          marginTop: '4px',
                          fontStyle: 'italic'
                        }}>
                          Určuje, komu se bude notifikace posílat
                        </div>
                      </div>
                      
                      {/* Scope Filter - určuje komu se posílá notifikace */}
                      <FormGroup style={{ marginBottom: '16px' }}>
                        <Label>
                          🎯 Scope Filter - komu se pošle?
                          <span style={{ color: '#f59e0b', marginLeft: '4px' }}>*</span>
                        </Label>
                        <Select 
                          value={edgeScopeFilter}
                          onChange={(e) => setEdgeScopeFilter(e.target.value)}
                          title="Určuje, komu se bude notifikace posílat"
                          style={{
                            border: edgeScopeFilter === 'PARTICIPANTS_ALL' ? '2px solid #059669' :
                                   edgeScopeFilter === 'PARTICIPANTS_PRIKAZCE' ? '2px solid #dc2626' : 
                                   edgeScopeFilter === 'LOCATION' ? '2px solid #f59e0b' : 
                                   edgeScopeFilter === 'NONE' ? '2px solid #9ca3af' : '2px solid #3b82f6'
                          }}
                        >
                          <option value="NONE">🚫 NONE - nikdo nedostane notifikaci</option>
                          <option value="PARTICIPANTS_ALL">👥 PARTICIPANTS_ALL - všichni z entity</option>
                          <option value="PARTICIPANTS_PRIKAZCE">👤 PARTICIPANTS_PRIKAZCE - jen příkazce</option>
                          <option value="LOCATION">📍 LOCATION - celá lokalita</option>
                          <option value="ALL_IN_ROLE">🎭 ALL_IN_ROLE - všichni s touto rolí</option>
                        </Select>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: edgeScopeFilter === 'PARTICIPANTS_ALL' ? '#065f46' : 
                                 edgeScopeFilter === 'NONE' ? '#6b7280' : '#1e40af',
                          marginTop: '8px',
                          padding: '10px',
                          background: edgeScopeFilter === 'PARTICIPANTS_ALL' ? '#d1fae5' : 
                                     edgeScopeFilter === 'NONE' ? '#f3f4f6' : '#eff6ff',
                          border: edgeScopeFilter === 'PARTICIPANTS_ALL' ? '1px solid #a7f3d0' : 
                                 edgeScopeFilter === 'NONE' ? '1px solid #d1d5db' : '1px solid #93c5fd',
                          borderRadius: '6px',
                          lineHeight: '1.6'
                        }}>
                          {edgeScopeFilter === 'PARTICIPANTS_ALL' ? (
                            <>
                              <strong>👥 PARTICIPANTS_ALL:</strong><br/>
                              Notifikace dostane příkazce, objednatel, garant a další účastníci uvedení v entitě (objednávce/faktuře)
                            </>
                          ) : edgeScopeFilter === 'PARTICIPANTS_PRIKAZCE' ? (
                            <>
                              <strong>👤 PARTICIPANTS_PRIKAZCE:</strong><br/>
                              Notifikace dostane pouze příkazce entity
                            </>
                          ) : edgeScopeFilter === 'LOCATION' ? (
                            <>
                              <strong>📍 LOCATION:</strong><br/>
                              Notifikace dostanouší všichni uživatelé v dané lokalitě
                            </>
                          ) : edgeScopeFilter === 'NONE' ? (
                            <>
                              <strong>🚫 NONE:</strong><br/>
                              Notifikace se neposílá nikomu - pouze test režim
                            </>
                          ) : (
                            <>
                              <strong>Obecné nastavení</strong><br/>
                              Specifické chování dle typu
                            </>
                          )}
                        </div>
                      </FormGroup>

                      {/* Priorita notifikace pro příjemce - NOVÝ SYSTÉM */}
                      <FormGroup style={{ marginBottom: '16px' }}>
                        <Label>
                          ⚡ Která varianta šablony se použije?
                          <span style={{ color: '#3b82f6', marginLeft: '4px' }}>*</span>
                        </Label>
                        <Select 
                          value={edgeRecipientRole}
                          onChange={(e) => setEdgeRecipientRole(e.target.value)}
                          title="Určuje, jakou variantu emailu použít"
                          style={{
                            border: edgeRecipientRole === 'AUTO' ? '2px solid #8b5cf6' :
                                   edgeRecipientRole === 'URGENT' ? '2px solid #dc2626' : 
                                   edgeRecipientRole === 'INFO' ? '2px solid #10b981' : '2px solid #3b82f6'
                          }}
                        >
                          <option value="AUTO">🔮 AUTO - dle mimoradna_udalost pole</option>
                          <option value="URGENT">🔴 URGENT - vždy urgentní</option>
                          <option value="WARNING">🟡 WARNING - vždy standardní</option>
                          <option value="INFO">🔵 INFO - vždy informační</option>
                        </Select>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: edgeRecipientRole === 'AUTO' ? '#6b21a8' : '#1e40af', 
                          marginTop: '8px',
                          padding: '10px',
                          background: edgeRecipientRole === 'AUTO' ? '#f5f3ff' : '#eff6ff',
                          border: edgeRecipientRole === 'AUTO' ? '1px solid #c4b5fd' : '1px solid #93c5fd',
                          borderRadius: '6px',
                          lineHeight: '1.6'
                        }}>
                          {edgeRecipientRole === 'AUTO' ? (
                            <>
                              <strong>🔮 AUTO režim:</strong><br/>
                              • Pokud <code>mimoradna_udalost = 1</code> → použije <strong>URGENT</strong> variantu<br/>
                              • Pokud <code>mimoradna_udalost = 0</code> → použije <strong>WARNING</strong> variantu<br/>
                              • Ideální pro ORDER_STATUS_* události
                            </>
                          ) : (
                            <>
                              <strong>Manuální režim:</strong><br/>
                              Vždy se použije vybraná varianta bez ohledu na stav entity
                            </>
                          )}
                        </div>
                      </FormGroup>
                    </DetailSection>
                    <Divider />
                  </>
                );
              })()}

              {/* Akční tlačítka - zobrazit vždy když je vybraný node nebo edge */}
              {(selectedNode || selectedEdge) && (
              <DetailSection>
                {/* Tlačítko 'Uložit změny' odstraněno - změny se ukládají automaticky přes useEffect */}
                {/* Finální uložení do DB proběhne přes hlavní tlačítko ULOŽIT / ULOŽIT JAKO v headeru */}
                <button
                  onClick={selectedNode ? handleDeleteNode : handleDeleteEdge}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#b91c1c';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#dc2626';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>{selectedNode ? 'Odstranit uzel' : 'Odstranit vztah'}</span>
                </button>
              </DetailSection>
              )}
            </DetailContent>
          </DetailPanel>
        )}
      </MainContent>

      {dialog.show && (
        <DialogOverlay onClick={() => dialog.onCancel?.()}>
          <DialogBox onClick={(e) => e.stopPropagation()}>
            <DialogIcon>{dialog.icon}</DialogIcon>
            <DialogTitle>{dialog.title}</DialogTitle>
            <DialogMessage>{dialog.message}</DialogMessage>
            {dialog.stats && (
              <DialogStats>
                {Object.entries(dialog.stats).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}:</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </DialogStats>
            )}
            <DialogActions>
              {dialog.cancelText && (
                <DialogButton onClick={dialog.onCancel}>
                  {dialog.cancelText}
                </DialogButton>
              )}
              <DialogButton primary onClick={dialog.onConfirm}>
                {dialog.confirmText}
              </DialogButton>
            </DialogActions>
          </DialogBox>
        </DialogOverlay>
      )}

      {/* Detail Help Modal */}
      {showDetailHelpModal && (
        <DialogOverlay onClick={(e) => {
          // Zavřít pouze při kliknutí na overlay, ne na dialogBox
          if (e.target === e.currentTarget) {
            setShowDetailHelpModal(false);
          }
        }}>
          <DialogBox onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <DialogIcon>💡</DialogIcon>
            <DialogTitle>
              {selectedNode ? 'Nápověda k detailu uzlu' : 'Nápověda k detailu vztahu'}
            </DialogTitle>
            <HelpModalContent>
              {selectedNode ? (
                // Node help
                <>
                  <HelpSection>
                    <h3>📋 {selectedNode.data?.label}</h3>
                    <p>Panel zobrazuje vztahy tohoto uzlu v diagramu:</p>
                    <p style={{ marginTop: '8px' }}>
                      <strong>⬆️ Nadřízení</strong> - komu tento uzel podléhá<br/>
                      <strong>⬇️ Podřízení</strong> - kdo tomuto uzlu podléhá
                    </p>
                  </HelpSection>

                  <HelpSection>
                    <h3>💾 Ukládání</h3>
                    <p>
                      Změny se automaticky ukládají do <code>localStorage</code>. Pro trvalé uložení do DB použijte 
                      tlačítko <strong>"💾 Uložit do DB"</strong>.
                    </p>
                  </HelpSection>
                </>
              ) : (
                // Edge help
                <>
                  <HelpSection>
                    <h3>🔗 {(() => {
                      const sourceNode = nodes.find(n => n.id === selectedEdge?.source);
                      const targetNode = nodes.find(n => n.id === selectedEdge?.target);
                      return `${sourceNode?.data?.label || '?'} → ${targetNode?.data?.label || '?'}`;
                    })()}</h3>
                    <p><strong>Nadřízený získává práva vidět data od Podřízeného</strong> podle nastavení.</p>
                  </HelpSection>

                  <HelpSection>
                    <h3>🎯 Rozsah ({relationshipScope})</h3>
                    <p>
                      <code>OWN</code> - vlastní záznamy podřízeného<br/>
                      <code>TEAM</code> - celý úsek podřízeného<br/>
                      <code>LOCATION</code> - celá lokalita podřízeného<br/>
                      <code>ALL</code> - kompletní přístup
                    </p>
                  </HelpSection>

                  <HelpSection>
                    <h3>🔐 Úroveň práv</h3>
                    <p>Určuje, CO může nadřízený dělat se záznamy podřízeného:</p>
                    <HelpExample>
                      <strong>Příklad:</strong>
                      <span>
                        Holovský (THP) má právo <code>CREATE + EDIT</code> vlastní objednávky.<br/>
                        Černhorský je nadřízený s úrovní <code>READ_ONLY</code>.<br/>
                        → Černhorský <strong>vidí</strong> Holovského objednávky, ale <strong>nemůže je editovat</strong>.
                      </span>
                    </HelpExample>
                    <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>
                      <code>READ_ONLY</code> - vidí záznamy, nemůže editovat<br/>
                      <code>READ_WRITE</code> - může editovat záznamy<br/>
                      <code>READ_WRITE_DELETE</code> - plný přístup včetně mazání<br/>
                      <code>INHERIT</code> - dědí stejná práva jako podřízený
                    </p>
                    {(moduleVisibility.orders || moduleVisibility.invoices || moduleVisibility.cashbook) && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#166534' }}>Aktuální nastavení:</strong>
                        <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '4px' }}>
                          {moduleVisibility.orders && `📋 Objednávky: ${permissionLevel.orders}`}<br/>
                          {moduleVisibility.invoices && `🧾 Faktury: ${permissionLevel.invoices}`}<br/>
                          {moduleVisibility.cashbook && `💰 Pokladna: ${permissionLevel.cashbook}`}
                        </div>
                      </div>
                    )}
                  </HelpSection>

                  <HelpSection>
                    <h3>📦 Rozšířená oprávnění</h3>
                    <p>
                      <strong>Lokality/Úseky:</strong> Nadřízený vidí data i z dalších míst mimo základní vztah.<br/>
                      <strong>Notifikace:</strong> {edgeSendEmail ? 'Email ✓' : 'Email ✗'} {edgeSendInApp ? 'In-app ✓' : 'In-app ✗'}
                    </p>
                  </HelpSection>

                  <HelpSection>
                    <h3>💡 Kompletní příklad</h3>
                    <HelpExample>
                      <span style={{ fontSize: '0.85rem' }}>
                        <strong>Situace:</strong> Petr je nadřízený Jana.<br/>
                        <strong>Nastavení:</strong> TEAM scope, modul Objednávky, úroveň READ_ONLY<br/><br/>
                        <strong>Výsledek:</strong><br/>
                        → Petr <strong>vidí všechny objednávky</strong> z Janova úseku (i od kolegů)<br/>
                        → Petr <strong>nemůže editovat</strong> tyto objednávky (jen číst)<br/>
                        → Pokud Jan má právo vytvářet, Petr to právo <strong>nedostane</strong>
                      </span>
                    </HelpExample>
                  </HelpSection>
                </>
              )}
            </HelpModalContent>
            <DialogActions style={{ marginTop: '20px' }}>
              <DialogButton primary onClick={() => setShowDetailHelpModal(false)}>
                Rozumím
              </DialogButton>
            </DialogActions>
          </DialogBox>
        </DialogOverlay>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDialog.isOpen && (
        <ModalOverlay onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <FontAwesomeIcon icon={faTrash} />
              {confirmDialog.title}
            </ModalHeader>
            <ModalBody>
              {confirmDialog.message}
            </ModalBody>
            <ModalActions>
              <ModalButton
                onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
              >
                Zrušit
              </ModalButton>
              <ModalButton
                variant="danger"
                onClick={confirmDialog.onConfirm}
              >
                Ano, smazat
              </ModalButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
      
      {/* Profile Save As Dialog */}
      {showProfileDialog && (
        <ProfileDialog
          mode={profileDialogMode}
          onClose={() => setShowProfileDialog(false)}
          onSave={handleProfileSaveConfirm}
          existingProfiles={profiles}
        />
      )}
      
      {/* Fullscreen Email Modal */}
      {showFullscreenEmailModal && (
        <FullscreenEmailModal
          isOpen={showFullscreenEmailModal}
          onClose={() => {
            setShowFullscreenEmailModal(false);
            setFullscreenEmailData(null);
          }}
          emailData={fullscreenEmailData}
        />
      )}

      {/* Warning Dialog */}
      {warningDialog.show && (
        <WarningDialogOverlay onClick={() => setWarningDialog({ ...warningDialog, show: false })}>
          <WarningDialogContent onClick={(e) => e.stopPropagation()}>
            <WarningDialogHeader>
              <WarningDialogIcon>{warningDialog.icon}</WarningDialogIcon>
              <WarningDialogTitle>{warningDialog.title}</WarningDialogTitle>
            </WarningDialogHeader>
            <WarningDialogMessage>{warningDialog.message}</WarningDialogMessage>
            <WarningDialogActions>
              <WarningDialogButton onClick={() => setWarningDialog({ ...warningDialog, show: false })}>
                OK, rozumím
              </WarningDialogButton>
            </WarningDialogActions>
          </WarningDialogContent>
        </WarningDialogOverlay>
      )}
      </Container>
    </>
  );
};

// Profile Dialog Component
const ProfileDialog = ({ mode, onClose, onSave, existingProfiles }) => {
  const [profileName, setProfileName] = React.useState('');
  const [profileDescription, setProfileDescription] = React.useState('');
  const [error, setError] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);
  
  const handleSubmit = async () => {
    if (!profileName.trim()) {
      setError('Nazev profilu je povinny');
      return;
    }
    
    const result = await onSave(profileName, profileDescription);
    
    if (result.exists) {
      setShowConfirm(true);
    } else if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };
  
  const handleOverwrite = async () => {
    // TODO: Implementovat přepsání existujícího profilu
    setShowConfirm(false);
    onClose();
  };
  
  if (showConfirm) {
    return (
      <DialogOverlay onClick={onClose}>
        <DialogBox onClick={(e) => e.stopPropagation()}>
          <DialogIcon>⚠️</DialogIcon>
          <DialogTitle>Profil jiz existuje</DialogTitle>
          <DialogMessage>
            Profil s nazvem "<strong>{profileName}</strong>" jiz existuje.
            <br/><br/>
            Chcete jej prepsat?
          </DialogMessage>
          <DialogActions>
            <DialogButton onClick={() => setShowConfirm(false)}>
              Zrusit
            </DialogButton>
            <DialogButton primary onClick={handleOverwrite}>
              Ano, prepsat
            </DialogButton>
          </DialogActions>
        </DialogBox>
      </DialogOverlay>
    );
  }
  
  return (
    <DialogOverlay onClick={onClose}>
      <DialogBox onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <DialogIcon>💾</DialogIcon>
        <DialogTitle>{mode === 'saveAs' ? 'Ulozit jako novy profil' : 'Ulozit profil'}</DialogTitle>
        <div style={{ padding: '20px', textAlign: 'left' }}>
          <FormGroup>
            <Label>Nazev profilu *</Label>
            <Input
              type="text"
              value={profileName}
              onChange={(e) => {
                setProfileName(e.target.value);
                setError('');
              }}
              placeholder="napr. ZZSSK 2025, DEV DEMO..."
              autoFocus
            />
          </FormGroup>
          <FormGroup>
            <Label>Popis (volitelny)</Label>
            <textarea
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              placeholder="Strucny popis profilu..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #e0e6ed',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </FormGroup>
          {error && (
            <div style={{ 
              padding: '10px', 
              background: '#fee', 
              border: '1px solid #fcc',
              borderRadius: '6px',
              color: '#c00',
              fontSize: '0.9rem',
              marginTop: '10px'
            }}>
              {error}
            </div>
          )}
        </div>
        <DialogActions>
          <DialogButton onClick={onClose}>
            Zrusit
          </DialogButton>
          <DialogButton primary onClick={handleSubmit}>
            Ulozit
          </DialogButton>
        </DialogActions>
      </DialogBox>
    </DialogOverlay>
  );
};

// Fullscreen Email Modal Component
const FullscreenEmailModal = ({ isOpen, onClose, emailData }) => {
  if (!isOpen || !emailData) return null;
  
  const { template, mockData, replacePlaceholders, selectedVariantType } = emailData;
  
  // Funkce pro extrakci správné varianty z email_body
  const extractEmailVariant = (emailBody, variantType) => {
    if (!emailBody) return emailBody;
    
    // Pokud je DEFAULT nebo není delimiter, vrať celý email_body
    if (variantType === 'DEFAULT' || !emailBody.includes('<!-- RECIPIENT:')) {
      return emailBody;
    }
    
    // Extrahuj specifickou variantu
    const delimiter = `<!-- RECIPIENT: ${variantType} -->`;
    const startPos = emailBody.indexOf(delimiter);
    
    if (startPos === -1) {
      return emailBody; // Fallback
    }
    
    // Najdi začátek HTML (po delimiteru)
    let htmlStart = startPos + delimiter.length;
    
    // Najdi konec (další delimiter nebo konec stringu)
    const otherDelimiters = ['APPROVER_NORMAL', 'APPROVER_URGENT', 'SUBMITTER']
      .filter(d => d !== variantType)
      .map(d => `<!-- RECIPIENT: ${d} -->`);
    
    let htmlEnd = emailBody.length;
    for (const otherDelimiter of otherDelimiters) {
      const pos = emailBody.indexOf(otherDelimiter, htmlStart);
      if (pos !== -1 && pos < htmlEnd) {
        htmlEnd = pos;
      }
    }
    
    return emailBody.substring(htmlStart, htmlEnd).trim();
  };
  
  const emailBodyToDisplay = extractEmailVariant(template.email_telo || template.email_body, selectedVariantType || 'DEFAULT');
  
  return (
    <ModalOverlay onClick={onClose} style={{ zIndex: 20000 }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '98vw',
          maxWidth: '1400px',
          height: '75vh',
          maxHeight: 'calc(100vh - 140px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          margin: '30px auto'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '12px 12px 0 0',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FontAwesomeIcon icon={faEnvelope} />
              Email Šablona
              {selectedVariantType && selectedVariantType !== 'DEFAULT' && (() => {
                const variantIcons = {
                  'APPROVER_NORMAL': '🔴',
                  'APPROVER_URGENT': '🟠',
                  'SUBMITTER': '🟢'
                };
                return variantIcons[selectedVariantType] || '';
              })()}
            </h2>
            <div style={{ fontSize: '0.85rem', opacity: 0.95 }}>
              <strong>Šablona:</strong> {template.nazev || template.name || 'Bez názvu'}
              {selectedVariantType && selectedVariantType !== 'DEFAULT' && (
                <>
                  {' • '}
                  <strong>Varianta:</strong> {
                    selectedVariantType === 'APPROVER_NORMAL' ? 'Schvalovatel (normální)' :
                    selectedVariantType === 'APPROVER_URGENT' ? 'Schvalovatel (mimořádný)' :
                    selectedVariantType === 'SUBMITTER' ? 'Autor objednávky' :
                    selectedVariantType
                  }
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        {/* Email Preview - IFRAME S JEDNÍM SCROLLEM */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'white'
        }}>
          {/* Email Header */}
          <div style={{
            padding: '20px 30px',
            borderBottom: '1px solid #e5e7eb',
            background: '#fafbfc',
            flexShrink: 0
          }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', lineHeight: '1.4' }}>
                {replacePlaceholders(template.email_predmet || template.email_subject || 'Bez předmětu')}
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '6px' }}>
              <strong style={{ color: '#374151' }}>Od:</strong> EEO Systém &lt;noreply@eeo.cz&gt;
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
              <strong style={{ color: '#374151' }}>Komu:</strong> {mockData.recipient_name || mockData.user_name} &lt;{mockData.user_email}&gt;
            </div>
            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '8px' }}>
              {mockData.datetime}
            </div>
          </div>
          
          {/* Email Body - IFRAME BEZ VLASTNÍHO SCROLLU */}
          <iframe
            title="Email Preview"
            style={{
              width: '100%',
              flex: 1,
              border: 'none',
              background: 'white',
              overflow: 'hidden'
            }}
            srcDoc={`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  html, body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    background: #f9fafb;
                    overflow: visible;
                    height: auto;
                  }
                </style>
              </head>
              <body>
                ${replacePlaceholders(emailBodyToDisplay || '<p style="color: #9ca3af; font-style: italic;">Email tělo není definováno v šabloně</p>')}
              </body>
              </html>
            `}
          />
        </div>
      </div>
    </ModalOverlay>
  );
};

export default OrganizationHierarchy;
