import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCheck,
  faCheckDouble,
  faTimes,
  faTrash,
  faFilter,
  faSearch,
  faExclamationCircle,
  faClock,
  faInfoCircle,
  faEdit,
  faEye,
  faEyeSlash,
  faUndo,
  faChevronDown,
  faChevronUp,
  faChevronRight,
  faSyncAlt,
  faLayerGroup,
  faList,
  faExpandAlt,
  faCompressAlt,
  faExclamationTriangle,
  faBolt,
  faExclamation
} from '@fortawesome/free-solid-svg-icons';
import { useBackgroundTasks } from '../context/BackgroundTasksContext';
import { SmartTooltip } from '../styles/SmartTooltip';
import {
  getNotificationsList,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  restoreNotification,
  deleteNotification,
  deleteAllNotifications,
  NOTIFICATION_CONFIG
} from '../services/notificationsUnified';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { isValidConcept, hasDraftChanges } from '../utils/draftUtils.js';
import draftManager from '../services/DraftManager';
import { AuthContext } from '../context/AuthContext';
import { getNotificationIcon, getNotificationEmoji } from '../utils/iconMapping'; // 🎯 Unified icon mapping
import { getOrderV2 } from '../services/apiOrderV2'; // ✅ Pro kontrolu zamčení objednávky
import { safeToast } from '../utils/globalToast'; // ✅ Pro toast notifikace

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
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: none;
  margin: 0 auto;
`;

const TitlePanel = styled.div`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
`;

const TitleLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TitleRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const RefreshButton = styled.button`
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

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PageDivider = styled.div`
  border-bottom: 3px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: calc(1.5rem + 3px);
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const PageHeader = styled.div`
  margin-bottom: 32px;
`;

const PageSubtitle = styled.p`
  font-size: 15px;
  color: #6b7280;
  margin: 0;
`;

const ToolbarContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SearchBox = styled.div`
  width: 100%;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 40px 10px 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.15s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
`;

const ClearSearchButton = styled.button`
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

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
`;

const ActionButtonsGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  width: 100%;
`;

const HeaderActionButton = styled.button`
  padding: 0.75rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    flex-shrink: 0;
  }
`;

const FilterButton = styled.button`
  padding: 0.5rem 1rem;
  border: 2px solid ${props => props.$active ? '#3b82f6' : '#e2e8f0'};
  background: ${props => props.$active ? '#eff6ff' : 'white'};
  color: ${props => props.$active ? '#1d4ed8' : '#64748b'};
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    border-color: #3b82f6;
    color: #1d4ed8;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 2px solid ${props => {
    if (props.$variant === 'danger') return '#ef4444';
    if (props.$variant === 'success') return '#10b981';
    if (props.$variant === 'warning') return '#f59e0b';
    return '#6b7280';
  }};
  background: white;
  color: ${props => {
    if (props.$variant === 'danger') return '#991b1b';
    if (props.$variant === 'success') return '#065f46';
    if (props.$variant === 'warning') return '#92400e';
    return '#6b7280';
  }};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: ${props => {
      if (props.$variant === 'danger') return '#fee2e2';
      if (props.$variant === 'success') return '#d1fae5';
      if (props.$variant === 'warning') return '#fef3c7';
      return '#f8fafc';
    }};
    border-color: ${props => {
      if (props.$variant === 'danger') return '#ef4444';
      if (props.$variant === 'success') return '#10b981';
      if (props.$variant === 'warning') return '#f59e0b';
      return '#cbd5e1';
    }};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    flex-shrink: 0;
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const CollapseLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.5rem 0 1rem 0;
  color: #94a3b8;
  font-weight: 500;
  position: relative;
`;

const DashboardLabel = styled.span`
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
  padding-right: 1rem;
  background: white;
  position: relative;
  z-index: 1;
`;

const DividerLine = styled.hr`
  flex: 1;
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0;
`;

const CollapseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  transition: color 0.3s ease;
  position: relative;
  z-index: 2;
  padding: 0.25rem 0.5rem;
  margin-left: 0.5rem;

  &:hover {
    color: #3b82f6;
  }
`;

const StatCard = styled.div`
  background: ${props => props.$isActive ?
    `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)` :
    'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: 16px;
  border-left: ${props => props.$isActive ? '6px' : '4px'} solid ${props => props.$color || '#3b82f6'};
  box-shadow: ${props => props.$isActive ?
    `0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 2px ${props.$color || '#3b82f6'}40` :
    '0 1px 3px rgba(0, 0, 0, 0.05)'};
  flex: 1;
  min-width: 140px;
  max-width: 200px;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  transition: all 0.25s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:hover {
    transform: ${props => props.$clickable ? 'translateY(-2px)' : 'translateY(-1px)'};
    box-shadow: ${props => props.$clickable ?
      '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06)' :
      '0 2px 4px rgba(0, 0, 0, 0.08)'};
    ${props => props.$clickable && `
      background: linear-gradient(145deg, ${props.$color || '#3b82f6'}25, ${props.$color || '#3b82f6'}15);
    `}
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
`;

const StatIcon = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 1.75rem;
  opacity: 0.7;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  line-height: 1.3;
  margin-top: auto;
`;

const NotificationsList = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

const NotificationItem = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  gap: 14px;
  align-items: center;
  transition: all 0.15s ease;
  cursor: pointer;
  animation: ${slideIn} 0.3s ease-out;
  animation-delay: ${props => props.$index * 0.03}s;
  animation-fill-mode: backwards;

  /* Unread styling */
  background: ${props => props.$isUnread ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'transparent'};
  border-left: ${props => props.$isUnread ? '4px solid #3b82f6' : '4px solid transparent'};

  /* Priority coloring */
  ${props => props.$priority === 'high' && `
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-left-color: #ef4444;
  `}

  ${props => props.$priority === 'urgent' && `
    background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
    border-left-color: #dc2626;
  `}

  &:hover {
    background: ${props => props.$isUnread ? '#dbeafe' : '#f9fafb'};
    ${props => props.$priority === 'high' && 'background: #fee2e2;'}
    ${props => props.$priority === 'urgent' && 'background: #fecaca;'}
  }

  &:last-child {
    border-bottom: none;
  }
`;

const NotificationIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${props => {
    const priority = (props.$priority || 'INFO').toUpperCase();
    if (priority === 'EXCEPTIONAL' || priority === 'URGENT') return '#fef2f2';
    if (priority === 'APPROVAL' || priority === 'HIGH') return '#fffbeb';
    return '#eff6ff';
  }};
  color: ${props => {
    const priority = (props.$priority || 'INFO').toUpperCase();
    if (priority === 'EXCEPTIONAL' || priority === 'URGENT') return '#dc2626';
    if (priority === 'APPROVAL' || priority === 'HIGH') return '#f59e0b';
    return '#3b82f6';
  }};
`;

const NotificationContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 10px;
`;

const NotificationTitle = styled.div`
  font-weight: ${props => props.$isUnread ? 700 : 600};
  color: ${props => props.$isUnread ? '#111827' : '#374151'};
  font-size: 15px;
  line-height: 1.5;
`;

const NotificationMessage = styled.div`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 12px;
`;

const NotificationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: #9ca3af;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TypeBadge = styled.span`
  background: ${props => {
    if (props.$type === 'order') return '#dbeafe';
    if (props.$type === 'TODO_ALARM') return '#fef3c7';
    if (props.$type === 'system') return '#e5e7eb';
    return '#f3f4f6';
  }};
  color: ${props => {
    if (props.$type === 'order') return '#1e40af';
    if (props.$type === 'TODO_ALARM') return '#92400e';
    if (props.$type === 'system') return '#374151';
    return '#6b7280';
  }};
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
`;

const NotificationActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const IconButton = styled.button`
  background: transparent;
  border: 1px solid transparent;
  color: #6b7280;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
    color: #111827;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const EmptyState = styled.div`
  padding: 80px 20px;
  text-align: center;
  color: #9ca3af;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
`;

const EmptySubtext = styled.div`
  font-size: 14px;
  color: #9ca3af;
`;

const LoadingState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 15px;
`;

// =============================================================================
// PAGINATION STYLED COMPONENTS
// =============================================================================

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Vrátí barevnou kombinaci (background, color) podle typu notifikace nebo labelu akce
 */
const getActionColor = (notificationType, actionLabel) => {
  // Podle labelu akce (priorita 1)
  if (actionLabel) {
    const label = actionLabel.toLowerCase();
    if (label.includes('schválil') || label.includes('approved')) {
      return { background: '#d1fae5', color: '#065f46' }; // zelená
    }
    if (label.includes('zamítl') || label.includes('rejected') || label.includes('odmítl')) {
      return { background: '#fee2e2', color: '#991b1b' }; // červená
    }
    if (label.includes('vytvořil') || label.includes('created')) {
      return { background: '#dbeafe', color: '#1e40af' }; // modrá
    }
    if (label.includes('odeslal') || label.includes('sent')) {
      return { background: '#e0e7ff', color: '#4338ca' }; // indigo
    }
    if (label.includes('upravil') || label.includes('edited')) {
      return { background: '#fef3c7', color: '#92400e' }; // žlutá
    }
    if (label.includes('zrušil') || label.includes('cancelled')) {
      return { background: '#f3f4f6', color: '#374151' }; // šedá
    }
  }

  // Podle typu notifikace (fallback)
  if (notificationType) {
    if (notificationType.includes('schvalena') || notificationType.includes('approved')) {
      return { background: '#d1fae5', color: '#065f46' };
    }
    if (notificationType.includes('zamitnuta') || notificationType.includes('rejected')) {
      return { background: '#fee2e2', color: '#991b1b' };
    }
    if (notificationType.includes('nova') || notificationType.includes('created')) {
      return { background: '#dbeafe', color: '#1e40af' };
    }
    if (notificationType.includes('ke_schvaleni')) {
      return { background: '#fef3c7', color: '#92400e' };
    }
    if (notificationType.includes('odeslana') || notificationType.includes('sent')) {
      return { background: '#e0e7ff', color: '#4338ca' };
    }
  }

  // Default fialová
  return { background: '#f3e8ff', color: '#6b21a8' };
};

// =============================================================================
// COMPONENT
// =============================================================================

export const NotificationsPage = () => {
  const bgTasks = useBackgroundTasks();
  const navigate = useNavigate();
  const { userDetail } = React.useContext(AuthContext);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🗄️ Search query s localStorage
  const [searchQuery, setSearchQuery] = useState(() => {
    const saved = localStorage.getItem('notifications_searchQuery');
    return saved || '';
  });

  // 🗄️ Checkboxy pro filtry s localStorage
  const [showUnread, setShowUnread] = useState(() => {
    const saved = localStorage.getItem('notifications_showUnread');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showRead, setShowRead] = useState(() => {
    const saved = localStorage.getItem('notifications_showRead');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showUrgent, setShowUrgent] = useState(() => {
    const saved = localStorage.getItem('notifications_showUrgent');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showHigh, setShowHigh] = useState(() => {
    const saved = localStorage.getItem('notifications_showHigh');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showNormal, setShowNormal] = useState(() => {
    const saved = localStorage.getItem('notifications_showNormal');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // 🗄️ Dashboard stat filter s localStorage
  const [activeStatFilter, setActiveStatFilter] = useState(() => {
    const saved = localStorage.getItem('notifications_activeStatFilter');
    return saved || null;
  });

  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  // 🗄️ Režim vláken s localStorage - seskupování notifikací podle objednávek (výchozí: zapnuto)
  const [threadMode, setThreadMode] = useState(() => {
    const saved = localStorage.getItem('notifications_threadMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [expandedThreads, setExpandedThreads] = useState(new Set());

  // 🗄️ Detailní režim - zobrazení detailů notifikací (výchozí: zapnuto, uloženo v LS)
  const [detailMode, setDetailMode] = useState(() => {
    const saved = localStorage.getItem('notifications_detailMode');
    return saved !== null ? JSON.parse(saved) : true; // výchozí: true
  });

  // 🗄️ Collapse stav dashboardu (výchozí: rozbalený)
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(() => {
    const saved = localStorage.getItem('notifications_dashboardCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // 🔒 Stavy pro dialog zamčené objednávky
  const [showLockedOrderDialog, setShowLockedOrderDialog] = useState(false);
  const [lockedOrderInfo, setLockedOrderInfo] = useState(null);
  const [orderToEdit, setOrderToEdit] = useState(null);

  // 📝 Stavy pro draft warning dialog
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [currentDraftData, setCurrentDraftData] = useState(null);
  const [targetOrderId, setTargetOrderId] = useState(null);

  // ✅ Paginace
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Načtení notifikací z databáze
  useEffect(() => {
    loadNotifications();
  }, []);

  // 🗄️ Uložení všech filtrů do localStorage
  useEffect(() => {
    localStorage.setItem('notifications_searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem('notifications_showUnread', JSON.stringify(showUnread));
  }, [showUnread]);

  useEffect(() => {
    localStorage.setItem('notifications_showRead', JSON.stringify(showRead));
  }, [showRead]);

  useEffect(() => {
    localStorage.setItem('notifications_showUrgent', JSON.stringify(showUrgent));
  }, [showUrgent]);

  useEffect(() => {
    localStorage.setItem('notifications_showHigh', JSON.stringify(showHigh));
  }, [showHigh]);

  useEffect(() => {
    localStorage.setItem('notifications_showNormal', JSON.stringify(showNormal));
  }, [showNormal]);

  useEffect(() => {
    localStorage.setItem('notifications_activeStatFilter', activeStatFilter || '');
  }, [activeStatFilter]);

  useEffect(() => {
    localStorage.setItem('notifications_threadMode', JSON.stringify(threadMode));
  }, [threadMode]);

  useEffect(() => {
    localStorage.setItem('notifications_detailMode', JSON.stringify(detailMode));
  }, [detailMode]);

  useEffect(() => {
    localStorage.setItem('notifications_dashboardCollapsed', JSON.stringify(isDashboardCollapsed));
  }, [isDashboardCollapsed]);

  // Auto-refresh při nových notifikacích z backgroundu
  useEffect(() => {
    if (bgTasks?.registerNewNotificationsCallback) {
      // Registruj callback pro nové notifikace
      const handleNewNotifications = (newNotifications, unreadCount) => {
        // Auto-refresh stránky když přijdou nové notifikace nebo se změní stav
        loadNotifications();
      };

      bgTasks.registerNewNotificationsCallback(handleNewNotifications);

      // Cleanup - odregistruj callback při unmount
      return () => {
        bgTasks.registerNewNotificationsCallback(null);
      };
    }
  }, [bgTasks]);

  // Překlad kategorií do češtiny
  const getCategoryLabel = (category) => {
    const labels = {
      'orders': 'Objednávky',
      'todo': 'TODO úkoly',
      'system': 'Systém',
      'mentions': 'Zmínky',
      'reminders': 'Připomínky'
    };
    return labels[category] || category;
  };

      const loadNotifications = async (showSpinner = false) => {
    if (showSpinner) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      // Načtení notifikací z backendu - 100 posledních notifikací
      // ✅ include_dismissed: true - pro stránku chceme i skryté notifikace
      const result = await getNotificationsList({
        limit: 100,
        offset: 0,
        unread_only: false,
        include_dismissed: true
      });

      // Backend vrací data v result.data
      const notificationsData = result.data || [];

      // Obohať notifikace o config (ikony, barvy)
      const enrichedNotifications = notificationsData.map(notification => {
        const config = NOTIFICATION_CONFIG[notification.typ] || {};
        return {
          ...notification,
          icon: config.icon || '🔔',
          color: config.color || '#3b82f6',
          category: config.category || 'system',
          priority: notification.priorita || config.priority || 'normal'
        };
      });

      setNotifications(enrichedNotifications);

    } catch (error) {
      setError('Nepodařilo se načíst notifikace. Zkontroluj konzoli pro detaily.');

      // V případě chyby zobraz prázdný seznam
      setNotifications([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadNotifications(true);
  };

  // Handler pro kliknutí na statistickou dlaždici (filtr)
  const handleStatCardClick = (filterValue) => {
    if (filterValue === 'total') {
      // Celkem - zruš VŠECHNY filtry
      setActiveStatFilter(null);
      setShowUnread(false);
      setShowRead(false);
      setShowUrgent(false);
      setShowHigh(false);
      setShowNormal(false);
      setSearchQuery(''); // Zruš i vyhledávání
      return;
    }

    if (activeStatFilter === filterValue) {
      // Zrušit filtr - kliknutí podruhé
      setActiveStatFilter(null);
      setShowUnread(false);
      setShowRead(false);
      setShowUrgent(false);
      setShowHigh(false);
      setShowNormal(false);
    } else {
      // Nastavit filtr
      setActiveStatFilter(filterValue);

      // Vypnout ostatní filtry
      setShowUnread(false);
      setShowRead(false);
      setShowUrgent(false);
      setShowHigh(false);
      setShowNormal(false);

      // Zapnout příslušný filtr podle typu
      if (filterValue === 'unread') {
        setShowUnread(true);
      } else if (filterValue === 'urgent') {
        setShowUrgent(true);
      } else if (filterValue === 'high') {
        setShowHigh(true);
      }
      // Pro stavy objednávek se filtr uloží do activeStatFilter a použije ve filteredNotifications
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        notification.nadpis?.toLowerCase().includes(query) ||
        notification.zprava?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Filtr podle typu notifikace (z dashboard dlaždic)
    if (activeStatFilter && !['total', 'unread', 'urgent', 'high'].includes(activeStatFilter)) {
      // Mapování filterValue na notification type
      const typeMapping = {
        'nova': 'ORDER_CREATED',
        'keSchvaleni': 'ORDER_PENDING_APPROVAL',
        'schvalena': 'ORDER_APPROVED',
        'zamitnuta': 'ORDER_REJECTED',
        'cekaSe': 'ORDER_AWAITING_CHANGES',
        'odeslana': 'ORDER_SENT_TO_SUPPLIER',
        'potvrzena': 'ORDER_CONFIRMED_BY_SUPPLIER',
        'cekaKontrola': 'ORDER_VERIFICATION_PENDING',
        'vecnaSpravnost': 'ORDER_VERIFICATION_APPROVED',
        'registrZverejnena': 'ORDER_REGISTRY_PUBLISHED',
        'dokoncena': 'ORDER_COMPLETED',
        'zrusena': 'ORDER_CANCELLED',
      };

      const notificationType = typeMapping[activeStatFilter];
      if (notificationType && notification.typ !== notificationType) {
        return false;
      }
    }

    // Čtení/Nepřečteno - pokud je alespoň jeden zaškrtnutý, filtruj podle toho
    const hasReadFilter = showUnread || showRead;
    if (hasReadFilter) {
      const isUnread = !notification.precteno || notification.precteno === 0;
      const matchesReadFilter =
        (showUnread && isUnread) ||
        (showRead && !isUnread);
      if (!matchesReadFilter) return false;
    }

    // Priorita - pokud je alespoň jedna zaškrtnutá, filtruj podle toho (OR logika)
    const hasPriorityFilter = showUrgent || showHigh || showNormal;
    if (hasPriorityFilter) {
      const priority = notification.priorita || 'normal';
      const matchesPriorityFilter =
        (showUrgent && priority === 'urgent') ||
        (showHigh && priority === 'high') ||
        (showNormal && priority === 'normal');
      if (!matchesPriorityFilter) return false;
    }

    return true;
  });

  // ✅ Seskupení notifikací do vláken podle order_id
  const groupNotificationsIntoThreads = (notificationsList) => {
    if (!threadMode) {
      // Režim bez vláken - vrátit notifikace jako jsou
      return notificationsList.map(n => ({ isThread: false, notification: n }));
    }

    const threads = new Map();
    const nonOrderNotifications = [];

    notificationsList.forEach((notification, idx) => {
      // ✅ Backend už vrací parsovaný objekt 'data'
      let orderId = null;
      try {
        const data = notification.data || {};
        orderId = data?.order_id;

        // ✅ Normalizuj orderId na string pro konzistentní porovnávání
        if (orderId !== null && orderId !== undefined) {
          orderId = String(orderId);
        }
      } catch (e) {
      }

      // 🎯 Pokud je to notifikace objednávky NEBO TODO alarm s order_id, přidej do vlákna
      const isOrderNotification = notification.typ?.includes('order');
      const isTodoAlarm = notification.typ?.includes('todo_alarm');

      if ((isOrderNotification || isTodoAlarm) && orderId) {
        if (!threads.has(orderId)) {
          threads.set(orderId, []);
        }
        threads.get(orderId).push(notification);
      } else {
        // Ostatní notifikace (bez order_id) zobraz normálně
        nonOrderNotifications.push(notification);
      }
    });

    // Vytvoř výsledný seznam: vlákna + jednotlivé notifikace
    const result = [];

    // Seřaď vlákna podle nejnovější notifikace v každém vlákně
    const sortedThreads = Array.from(threads.entries())
      .map(([orderId, threadNotifications]) => {
        // Seřaď notifikace ve vlákně od nejnovější k nejstarší
        const sorted = [...threadNotifications].sort((a, b) => {
          const dateA = new Date(a.dt_created || a.created_at || 0);
          const dateB = new Date(b.dt_created || b.created_at || 0);
          return dateB - dateA; // Sestupně (nejnovější první)
        });
        return { orderId, notifications: sorted, newestDate: sorted[0]?.dt_created || sorted[0]?.created_at };
      })
      .sort((a, b) => {
        const dateA = new Date(a.newestDate || 0);
        const dateB = new Date(b.newestDate || 0);
        return dateB - dateA; // Vlákna seřazená podle nejnovější notifikace
      });

    // Přidej vlákna do pole s jejich datem pro řazení
    const threadsWithDates = sortedThreads.map(({ orderId, notifications: threadNotifications }) => ({
      isThread: true,
      orderId,
      notifications: threadNotifications,
      mainNotification: threadNotifications[0], // Nejnovější jako hlavní
      olderNotifications: threadNotifications.slice(1), // Starší pod ní
      sortDate: new Date(threadNotifications[0]?.dt_created || threadNotifications[0]?.created_at || 0)
    }));

    // Přidej non-order notifikace s jejich datem
    const nonOrderWithDates = nonOrderNotifications.map(n => ({
      isThread: false,
      notification: n,
      sortDate: new Date(n.dt_created || n.created_at || 0)
    }));

    // Slouč obě pole a seřaď podle data (nejnovější první)
    const allItems = [...threadsWithDates, ...nonOrderWithDates].sort((a, b) => {
      return b.sortDate - a.sortDate;
    });

    // Odstraň sortDate z výsledku (už nepotřebujeme)
    return allItems.map(item => {
      const { sortDate, ...rest } = item;
      return rest;
    });
  };

  const threadedNotifications = groupNotificationsIntoThreads(filteredNotifications);

  // ✅ Funkce pro rozbalení/sbalení všech vláken
  const handleExpandAll = () => {
    const allThreadIds = threadedNotifications
      .filter(item => item.isThread && item.olderNotifications.length > 0)
      .map(item => item.orderId);
    setExpandedThreads(new Set(allThreadIds));
  };

  const handleCollapseAll = () => {
    setExpandedThreads(new Set());
  };

  // Statistics
  // Statistiky - pouze celkové a podle typů objednávek
  const stats = {
    total: notifications.length,

    // Statistiky podle stavů objednávek
    nova: notifications.filter(n => n.typ === 'ORDER_CREATED').length,
    keSchvaleni: notifications.filter(n => n.typ === 'ORDER_PENDING_APPROVAL').length,
    schvalena: notifications.filter(n => n.typ === 'ORDER_APPROVED').length,
    zamitnuta: notifications.filter(n => n.typ === 'ORDER_REJECTED').length,
    cekaSe: notifications.filter(n => n.typ === 'ORDER_AWAITING_CHANGES').length,
    odeslana: notifications.filter(n => n.typ === 'ORDER_SENT_TO_SUPPLIER').length,
    potvrzena: notifications.filter(n => n.typ === 'ORDER_CONFIRMED_BY_SUPPLIER').length,
    cekaKontrola: notifications.filter(n => n.typ === 'ORDER_VERIFICATION_PENDING').length,
    vecnaSpravnost: notifications.filter(n => n.typ === 'ORDER_VERIFICATION_APPROVED').length,
    registrZverejnena: notifications.filter(n => n.typ === 'ORDER_REGISTRY_PUBLISHED').length,
    dokoncena: notifications.filter(n => n.typ === 'ORDER_COMPLETED').length,
    zrusena: notifications.filter(n => n.typ === 'ORDER_CANCELLED').length,
  };

  // ✅ Paginace - výpočet
  const totalPages = Math.ceil(threadedNotifications.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedNotifications = threadedNotifications.slice(startIndex, endIndex);

  // ✅ Paginace - navigační funkce
  const goToFirstPage = () => {
    setCurrentPage(0);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages - 1);
  };

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  // ✅ Reset stránky na 0 při změně filtrů
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, showUnread, showRead, showUrgent, showHigh, showNormal, threadMode]);

  // 🔒 Handlery pro locked order dialog
  const handleLockedOrderCancel = () => {
    setShowLockedOrderDialog(false);
    setLockedOrderInfo(null);
    setOrderToEdit(null);
  };

  const handleLockedOrderForceUnlock = () => {
    if (orderToEdit?.objednavka_id) {
      // Zavři dialog a přejdi na editaci s force parametrem
      setShowLockedOrderDialog(false);
      navigate(`/order-form-25?edit=${orderToEdit.objednavka_id}&force=1`);
    }
  };

  // 📝 Handlery pro draft warning dialog
  const handleEditCancel = () => {
    setShowEditConfirmModal(false);
    setCurrentDraftData(null);
    setTargetOrderId(null);
  };

  const handleEditConfirm = async () => {
    setShowEditConfirmModal(false);
    
    // Smaž draft
    const user_id = userDetail?.uzivatel_id || userDetail?.user_id;
    if (user_id) {
      draftManager.setCurrentUser(user_id);
      await draftManager.deleteAllDraftKeys();
    }

    // Naviguj na cílovou objednávku
    if (targetOrderId) {
      navigate(`/order-form-25?edit=${targetOrderId}`);
    }

    // Vyčisti state
    setCurrentDraftData(null);
    setTargetOrderId(null);
  };

  const handleNotificationClick = async (notification) => {
    // Označit jako přečtenou pokud není
    const isUnread = !notification.precteno || notification.precteno === 0;
    if (isUnread) {
      await handleMarkAsRead(notification.id);
    }

    // Navigace podle typu notifikace
    try {
      // ✅ Backend už vrací parsovaný objekt 'data', nemusíme parsovat 'data_json'
      const data = notification.data || {};

      // ✅ VŽDY EDIT MÓD - všechny notifikace otevírají objednávku k editaci!
      const mode = 'edit';

      // 🎯 OPRAVA: ID objednávky může být v data.order_id NEBO v notification.objekt_id (po Czechification)
      const orderId = data.order_id || notification.objekt_id;

      // Notifikace objednávek - navigace na detail
      if (notification.typ && notification.typ.includes('order') && orderId) {
        const targetOrderId = parseInt(orderId);

        // 🔒 KONTROLA ZAMČENÍ - pokud jdeme do edit módu, zkontroluj zda není zamčená jiným uživatelem
        if (mode === 'edit') {
          const token = userDetail?.token;
          const username = userDetail?.username;

          if (token && username) {
            try {
              const dbOrder = await getOrderV2(targetOrderId, token, username, true);

              if (!dbOrder) {
                safeToast('error', 'Nepodařilo se načíst objednávku z databáze');
                return;
              }

              // Kontrola zamčení - pokud je locked: true, je zamčená JINÝM uživatelem
              // ⚠️ Blokuj pouze pokud locked=true A NENÍ můj zámek A NENÍ expired (>15 min)
              if (dbOrder.lock_info?.locked === true && !dbOrder.lock_info?.is_owned_by_me && !dbOrder.lock_info?.is_expired) {
                const lockInfo = dbOrder.lock_info;
                const lockedByUserName = lockInfo.locked_by_user_fullname || `uživatel #${lockInfo.locked_by_user_id}`;

                // Zjisti, zda má uživatel právo na force unlock
                const canForceUnlock = userDetail?.roles?.some(role =>
                  role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
                );

                setLockedOrderInfo({
                  lockedByUserName,
                  lockedByUserEmail: lockInfo.locked_by_user_email || null,
                  lockedByUserTelefon: lockInfo.locked_by_user_telefon || null,
                  lockedAt: lockInfo.locked_at || null,
                  lockAgeMinutes: lockInfo.lock_age_minutes || null,
                  canForceUnlock,
                  orderId: targetOrderId,
                  userRoleName: userDetail?.roles?.find(r => r.kod_role === 'SUPERADMIN' || r.kod_role === 'ADMINISTRATOR')?.nazev_role || 'administrátor'
                });
                setOrderToEdit({ objednavka_id: targetOrderId });
                setShowLockedOrderDialog(true);
                return; // ZASTAVIT - čekáme na rozhodnutí uživatele
              }
            } catch (error) {
              console.error('Chyba při kontrole zamčení:', error);
              safeToast('error', 'Chyba při kontrole dostupnosti objednávky');
              return;
            }
          }
        }

        // 🎯 PŘESNĚ STEJNÝ KÓD JAKO V Orders25List.js - handleEdit()
        // 🔧 OPRAVA: Backend používá uzivatel_id, ne user_id!
        const user_id = userDetail?.uzivatel_id || userDetail?.user_id;
        if (user_id) {
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
              const currentOrderId = targetOrderId;

              // ✅ Pokud draft patří k TÉTO objednávce, NEPTAT SE!
              if (draftOrderId && currentOrderId && String(draftOrderId) === String(currentOrderId)) {
                shouldShowConfirmDialog = false;
                isDraftForThisOrder = true;
              } else {
                // ❌ Draft patří k JINÉ objednávce - zeptej se
                const hasNewConcept = isValidConcept(draftData);
                const hasDbChanges = hasDraftChanges(draftData);
                shouldShowConfirmDialog = hasNewConcept || hasDbChanges;

                if (shouldShowConfirmDialog) {
                  draftDataToStore = draftData;
                } else {
                }
              }
            } catch (error) {
              console.error('❌ Chyba při načítání draftu:', error);
              shouldShowConfirmDialog = false;
            }
          }

          // 🎯 OPTIMALIZACE: Pokud draft patří k TÉTO objednávce, rovnou naviguj
          if (isDraftForThisOrder) {
            navigate(`/order-form-25?edit=${targetOrderId}`);
            return;
          }

          // 🎯 Pokud existuje draft pro JINOU objednávku, zobraz confirm dialog
          if (shouldShowConfirmDialog && draftDataToStore) {
            setCurrentDraftData(draftDataToStore);
            setTargetOrderId(targetOrderId);
            setShowEditConfirmModal(true);
            return; // Čekáme na rozhodnutí uživatele
          }
        }

        // ✅ VŽDY EDIT MÓD - použij orderId proměnnou (ne data.order_id)
        navigate(`/order-form-25?edit=${orderId}`);
      }
      // TODO alarmy - navigace na objednávku (alarm_todo také obsahuje 'order' a spadne do větve výše)
      else if (notification.typ && notification.typ.includes('alarm_todo') && data.order_id) {
        // ⚠️ Fallback pro alarm_todo bez 'order' v typu - STEJNÝ KÓD JAKO VÝŠE
        const targetOrderId = parseInt(data.order_id);
        const user_id = userDetail?.user_id;

        if (user_id) {
          draftManager.setCurrentUser(user_id);
          const hasDraft = await draftManager.hasDraft();

          let shouldShowConfirmDialog = false;
          let draftDataToStore = null;
          let isDraftForThisOrder = false;

          if (hasDraft) {
            try {
              const draftData = await draftManager.loadDraft();
              const draftOrderId = draftData.savedOrderId || draftData.formData?.id;
              const currentOrderId = targetOrderId;

              if (draftOrderId && currentOrderId && String(draftOrderId) === String(currentOrderId)) {
                shouldShowConfirmDialog = false;
                isDraftForThisOrder = true;
              } else {
                const hasNewConcept = isValidConcept(draftData);
                const hasDbChanges = hasDraftChanges(draftData);
                shouldShowConfirmDialog = hasNewConcept || hasDbChanges;

                if (shouldShowConfirmDialog) {
                  draftDataToStore = draftData;
                }
              }
            } catch (error) {
              shouldShowConfirmDialog = false;
            }
          }

          if (isDraftForThisOrder) {
            navigate(`/order-form-25?edit=${targetOrderId}`);
            return;
          }

          if (shouldShowConfirmDialog && draftDataToStore) {
            setCurrentDraftData(draftDataToStore);
            setTargetOrderId(targetOrderId);
            setShowEditConfirmModal(true);
            return; // Čekáme na rozhodnutí uživatele
          }
        }

        navigate(`/order-form-25?edit=${data.order_id}`);
      }

    } catch (error) {
    }
  };

  const handleMarkAsRead = async (notificationId, e) => {
    e?.stopPropagation();

    try {
      // Zavolej backend API
      await markNotificationAsRead(notificationId);

      // Aktualizuj lokální stav
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: 1 } : n)
      );

      // Aktualizuj badge v menu
      if (bgTasks?.handleUnreadCountChange) {
        const currentCount = bgTasks.unreadNotificationsCount || 0;
        if (currentCount > 0) {
          bgTasks.handleUnreadCountChange(currentCount - 1);
        }
      }
    } catch (error) {
      alert('Nepodařilo se označit notifikaci jako přečtenou.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Zavolej backend API
      await markAllNotificationsAsRead();

      // Aktualizuj všechny jako přečtené
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: 1 }))
      );

      // Aktualizuj badge na 0
      if (bgTasks?.handleUnreadCountChange) {
        bgTasks.handleUnreadCountChange(0);
      }
    } catch (error) {
      alert('Nepodařilo se označit všechny notifikace jako přečtené.');
    }
  };

  const handleDismiss = async (notificationId, e) => {
    e?.stopPropagation();

    try {
      // Zavolej backend API
      await dismissNotification(notificationId);

      // ✅ Na stránce správy: NEODSTRAŇUJ notifikaci, pouze ji označ jako skrytou
      // Uživatel ji uvidí se statusem "Skrytá v dropdownu"
      setNotifications(prev => {
        const updated = prev.map(n => n.id === notificationId ? { ...n, is_dismissed: 1 } : n);
        return updated;
      });

      // Aktualizuj badge pokud byla notifikace nepřečtená
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && (!notification.precteno || notification.precteno === 0)) {
        if (bgTasks?.handleUnreadCountChange) {
          const currentCount = bgTasks.unreadNotificationsCount || 0;
          if (currentCount > 0) {
            bgTasks.handleUnreadCountChange(currentCount - 1);
          }
        }
      }
    } catch (error) {
      alert('Nepodařilo se smazat notifikaci.');
    }
  };

  // ✅ RESTORE - Obnovit skrytou notifikaci (znovu zobrazit v dropdownu)
  const handleRestore = async (notificationId, e) => {
    e?.stopPropagation();

    try {
      // Zavolej backend API
      await restoreNotification(notificationId);

      // Aktualizuj lokální stav - označ jako ne-skrytou
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_dismissed: 0 } : n)
      );
    } catch (error) {
      alert('Nepodařilo se obnovit notifikaci.');
    }
  };

  const handleDismissAll = async () => {
    try {
      // Smazat všechny notifikace paralelně
      const dismissPromises = notifications.map(n => dismissNotification(n.id));
      await Promise.all(dismissPromises);

      // ✅ Na stránce správy: NEODSTRAŇUJ notifikace, pouze je označ jako skryté
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_dismissed: 1 }))
      );

      // Aktualizuj badge na 0
      if (bgTasks?.handleUnreadCountChange) {
        bgTasks.handleUnreadCountChange(0);
      }
    } catch (error) {
      alert('Nepodařilo se smazat všechny notifikace. Některé mohly být smazány.');
      // Znovu načti pro sync se skutečným stavem
      loadNotifications();
    }
  };
  // ✅ DELETE - Smazat jednotlivou notifikaci z DB
  const handleDelete = (notificationId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Smazat notifikaci',
      message: 'Opravdu chcete trvale smazat tuto notifikaci z databáze?\n\nTato akce je NEVRATNÁ!',
      icon: faTrash,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          await deleteNotification(notificationId);

          // Odstraň z lokálního stavu
          setNotifications(prev => prev.filter(n => n.id !== notificationId));

          // Aktualizuj badge pokud byla nepřečtená
          const notification = notifications.find(n => n.id === notificationId);
          if (notification && (!notification.precteno || notification.precteno === 0)) {
            if (bgTasks?.handleUnreadCountChange) {
              const currentCount = bgTasks.unreadNotificationsCount || 0;
              if (currentCount > 0) {
                bgTasks.handleUnreadCountChange(currentCount - 1);
              }
            }
          }
        } catch (error) {
          setConfirmDialog({
            isOpen: true,
            title: 'Chyba',
            message: 'Nepodařilo se smazat notifikaci.\n\nZkuste to prosím znovu.',
            icon: faExclamationCircle,
            variant: 'danger',
            onConfirm: () => setConfirmDialog({ isOpen: false }),
            onCancel: () => setConfirmDialog({ isOpen: false })
          });
        }
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };
  // ✅ DELETE ALL - Smazat všechny nebo filtrované notifikace z DB
  const handleDeleteAll = () => {
    // Pokud je aktivní filtr, smaž pouze zobrazené notifikace
    const hasActiveFilter = searchQuery || showUnread || showRead || showUrgent || showHigh || showNormal;
    const notificationsToDelete = hasActiveFilter ? filteredNotifications : notifications;
    const count = notificationsToDelete.length;
    const actionText = hasActiveFilter ? 'zobrazené' : 'VŠECHNY';

    setConfirmDialog({
      isOpen: true,
      title: hasActiveFilter ? 'Smazat zobrazené notifikace' : 'Smazat všechny notifikace',
      message: `Opravdu chcete trvale smazat ${actionText} notifikace (${count} ks) z databáze?\n\nTato akce je NEVRATNÁ a nelze ji vrátit zpět!`,
      icon: faExclamationTriangle,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          let result;

          if (hasActiveFilter) {
            // Smaž pouze filtrované notifikace (jedna po druhé)
            const deletePromises = notificationsToDelete.map(n => deleteNotification(n.id));
            await Promise.all(deletePromises);
            result = { deleted_count: notificationsToDelete.length };

            // Odstraň smazané notifikace z lokálního stavu
            const deletedIds = new Set(notificationsToDelete.map(n => n.id));
            setNotifications(prev => prev.filter(n => !deletedIds.has(n.id)));

            // Aktualizuj badge - odečti smazané nepřečtené
            const deletedUnreadCount = notificationsToDelete.filter(n => !n.precteno || n.precteno === 0).length;
            if (deletedUnreadCount > 0 && bgTasks?.handleUnreadCountChange) {
              const currentCount = bgTasks.unreadNotificationsCount || 0;
              bgTasks.handleUnreadCountChange(Math.max(0, currentCount - deletedUnreadCount));
            }
          } else {
            // Smaž všechny notifikace
            result = await deleteAllNotifications();

            // Vyčisti lokální stav
            setNotifications([]);

            // Aktualizuj badge na 0
            if (bgTasks?.handleUnreadCountChange) {
              bgTasks.handleUnreadCountChange(0);
            }
          }

        } catch (error) {
          setConfirmDialog({
            isOpen: true,
            title: 'Chyba',
            message: 'Nepodařilo se smazat notifikace.\n\nZkuste to prosím znovu.',
            icon: faExclamationCircle,
            variant: 'danger',
            onConfirm: () => setConfirmDialog({ isOpen: false }),
            onCancel: () => setConfirmDialog({ isOpen: false })
          });
        }
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Právě teď';
    if (diffMins < 60) return `Před ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Před ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Před ${diffDays} d`;

    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // 🎯 getPriorityIcon je nyní importován z utils/iconMapping.js
  // Odstraněna lokální implementace pro zajištění konzistence ikon

  // 🎯 Helper pro ikonu podle priority (místo emoji) - větší velikost
  const getPriorityIconComponent = (priority, nadpis = '') => {
    const normalizedPriority = (priority || 'INFO').toUpperCase();
    
    const iconStyle = { 
      fontSize: '18px' // Zvětšená ikona
    };
    
    // Určíme prioritu podle emoji v nadpisu, pokud priority není specifická
    if (nadpis.includes('🚨')) {
      return <FontAwesomeIcon icon={faBolt} style={{ ...iconStyle, color: '#dc2626' }} />; // URGENT - červený blesk
    }
    if (nadpis.includes('⚠️')) {
      return <FontAwesomeIcon icon={faExclamationTriangle} style={{ ...iconStyle, color: '#ea580c' }} />; // WARNING - oranžový trojúhelník
    }
    if (nadpis.includes('ℹ️')) {
      return <FontAwesomeIcon icon={faInfoCircle} style={{ ...iconStyle, color: '#2563eb' }} />; // INFO - modrý kruh
    }
    
    switch (normalizedPriority) {
      case 'EXCEPTIONAL':
      case 'URGENT':
        return <FontAwesomeIcon icon={faBolt} style={{ ...iconStyle, color: '#dc2626' }} />;
      case 'APPROVAL':
      case 'HIGH':
        return <FontAwesomeIcon icon={faExclamationTriangle} style={{ ...iconStyle, color: '#ea580c' }} />;
      case 'WARNING':
        return <FontAwesomeIcon icon={faExclamationTriangle} style={{ ...iconStyle, color: '#ea580c' }} />;
      case 'INFO':
      case 'NORMAL':
      case 'LOW':
      default:
        return <FontAwesomeIcon icon={faInfoCircle} style={{ ...iconStyle, color: '#2563eb' }} />;
    }
  };

  // 🎯 Funkce pro odstranění ikon z nadpisu (eliminuje duplicity)
  const cleanNotificationTitle = (title) => {
    if (!title) return title;
    
    const originalTitle = title;
    // Odstraní emoji ikony na začátku včetně variation selectors (\uFE0F)
    const cleanedTitle = title
      .replace(/^ℹ️\s*/, '')     // Info emoji s variation selector
      .replace(/^ℹ\uFE0F\s*/, '') // Info emoji s explicit variation selector  
      .replace(/^⚠️\s*/, '')     // Warning emoji s variation selector
      .replace(/^⚠\uFE0F\s*/, '') // Warning emoji s explicit variation selector
      .replace(/^🚨\s*/, '')     // Emergency emoji
      .replace(/^✅\s*/, '')     // Check mark
      .replace(/^❌\s*/, '')     // Cross mark
      .replace(/^⏸️\s*/, '')     // Pause button
      .replace(/^⏸\uFE0F\s*/, '') // Pause s explicit variation selector
      .replace(/^📧\s*/, '')     // Email
      .replace(/^🎯\s*/, '')     // Target
      .replace(/^📦\s*/, '')     // Package
      .replace(/^[ℹ⚠🚨✅❌⏸📧🎯📦]\uFE0F?\s*/, ''); // Fallback regex
    
    return cleanedTitle;
  };

  return (
    <PageContainer>
      <ContentWrapper>
        <TitlePanel>
          <TitleLeft>
            <SmartTooltip text="Obnovit data z databáze (force reload)" icon="warning" preferredPosition="bottom">
              <RefreshButton
                onClick={handleRefresh}
              >
                <FontAwesomeIcon icon={faSyncAlt} />
              </RefreshButton>
            </SmartTooltip>
            {/* ✅ Přepínač režimu vláken */}
            <SmartTooltip
              text={threadMode ? "Zobrazit všechny notifikace samostatně" : "Seskupit notifikace objednávek do vláken"}
              icon="info"
              preferredPosition="bottom"
            >
              <RefreshButton
                onClick={() => setThreadMode(!threadMode)}
                style={{
                background: threadMode ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: threadMode ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.3)'
              }}
            >
              <FontAwesomeIcon icon={threadMode ? faLayerGroup : faList} />
            </RefreshButton>
            </SmartTooltip>
            {stats.unread > 0 && (
              <HeaderActionButton
                onClick={handleMarkAllRead}
                title="Označit všechny notifikace jako přečtené"
              >
                <FontAwesomeIcon icon={faCheckDouble} />
                Označit vše jako přečtené
              </HeaderActionButton>
            )}
            {notifications.length > 0 && (
              <HeaderActionButton
                onClick={handleDismissAll}
                title="Skrýt všechny notifikace ze zvonečku"
              >
                <FontAwesomeIcon icon={faEyeSlash} />
                Skrýt vše ze zvonečku
              </HeaderActionButton>
            )}
            {notifications.length > 0 && (() => {
              const hasActiveFilter = searchQuery || showUnread || showRead || showUrgent || showHigh || showNormal;
              const count = hasActiveFilter ? filteredNotifications.length : notifications.length;
              const buttonText = hasActiveFilter ? `Smazat zobrazené (${count})` : 'Smazat vše trvale';

              return (
                <HeaderActionButton
                  onClick={handleDeleteAll}
                  title={hasActiveFilter ? `Smaže ${count} zobrazených notifikací` : `Smaže všechny notifikace (${count} ks)`}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  {buttonText}
                </HeaderActionButton>
              );
            })()}
            <HeaderActionButton
              onClick={() => setDetailMode(!detailMode)}
              title={detailMode ? "Skrýt detaily (předmět, cena, tagy)" : "Zobrazit detaily (předmět, cena, tagy)"}
              style={{ marginRight: 'auto' }}
            >
              <FontAwesomeIcon icon={detailMode ? faEye : faEyeSlash} />
              Detailní režim
            </HeaderActionButton>
          </TitleLeft>
          <PageTitle>
            Správa a přehled notifikací
            <FontAwesomeIcon icon={faBell} />
          </PageTitle>
        </TitlePanel>

        <PageDivider />

        {/* 🎯 Dashboard statistiky - s collapse */}
        <CollapseLine>
          <DashboardLabel>Dashboard - přehled notifikací</DashboardLabel>
          <DividerLine />
          <CollapseButton onClick={() => setIsDashboardCollapsed(!isDashboardCollapsed)}>
            <FontAwesomeIcon icon={isDashboardCollapsed ? faChevronDown : faChevronUp} />
          </CollapseButton>
        </CollapseLine>

        {!isDashboardCollapsed && (
        <StatsBar>
          <StatCard
            $color="#3b82f6"
            $clickable={true}
            $isActive={!searchQuery && !activeStatFilter}
            onClick={() => handleStatCardClick('total')}
            title="Kliknutím zrušíte všechny filtry"
          >
            <StatValue>{stats.total}</StatValue>
            <StatIcon>📊</StatIcon>
            <StatLabel>Celkem notifikací</StatLabel>
          </StatCard>

          <StatCard
            $color="#64748b"
            $clickable={true}
            $isActive={activeStatFilter === 'nova'}
            onClick={() => handleStatCardClick('nova')}
            title="Filtrovat: Objednávka vytvořena"
          >
            <StatValue>{stats.nova}</StatValue>
            <StatIcon>📝</StatIcon>
            <StatLabel>Nová</StatLabel>
          </StatCard>

          <StatCard
            $color="#3b82f6"
            $clickable={true}
            $isActive={activeStatFilter === 'keSchvaleni'}
            onClick={() => handleStatCardClick('keSchvaleni')}
            title="Filtrovat: Objednávka ke schválení"
          >
            <StatValue>{stats.keSchvaleni}</StatValue>
            <StatIcon>📋</StatIcon>
            <StatLabel>Ke schválení</StatLabel>
          </StatCard>

          <StatCard
            $color="#16a34a"
            $clickable={true}
            $isActive={activeStatFilter === 'schvalena'}
            onClick={() => handleStatCardClick('schvalena')}
            title="Filtrovat: Objednávka schválena"
          >
            <StatValue>{stats.schvalena}</StatValue>
            <StatIcon>👍</StatIcon>
            <StatLabel>Schválená</StatLabel>
          </StatCard>

          <StatCard
            $color="#dc2626"
            $clickable={true}
            $isActive={activeStatFilter === 'zamitnuta'}
            onClick={() => handleStatCardClick('zamitnuta')}
            title="Filtrovat: Objednávka zamítnuta"
          >
            <StatValue>{stats.zamitnuta}</StatValue>
            <StatIcon>❌</StatIcon>
            <StatLabel>Zamítnutá</StatLabel>
          </StatCard>

          <StatCard
            $color="#f59e0b"
            $clickable={true}
            $isActive={activeStatFilter === 'cekaSe'}
            onClick={() => handleStatCardClick('cekaSe')}
            title="Filtrovat: Objednávka čeká"
          >
            <StatValue>{stats.cekaSe}</StatValue>
            <StatIcon>⏸️</StatIcon>
            <StatLabel>Čeká se</StatLabel>
          </StatCard>

          <StatCard
            $color="#3b82f6"
            $clickable={true}
            $isActive={activeStatFilter === 'odeslana'}
            onClick={() => handleStatCardClick('odeslana')}
            title="Filtrovat: Objednávka odeslána dodavateli"
          >
            <StatValue>{stats.odeslana}</StatValue>
            <StatIcon>📤</StatIcon>
            <StatLabel>Odeslána dodavateli</StatLabel>
          </StatCard>

          <StatCard
            $color="#8b5cf6"
            $clickable={true}
            $isActive={activeStatFilter === 'potvrzena'}
            onClick={() => handleStatCardClick('potvrzena')}
            title="Filtrovat: Objednávka potvrzena dodavatelem"
          >
            <StatValue>{stats.potvrzena}</StatValue>
            <StatIcon>✔️</StatIcon>
            <StatLabel>Potvrzena dodavatelem</StatLabel>
          </StatCard>

          <StatCard
            $color="#f59e0b"
            $clickable={true}
            $isActive={activeStatFilter === 'cekaKontrola'}
            onClick={() => handleStatCardClick('cekaKontrola')}
            title="Filtrovat: Čeká na kontrolu"
          >
            <StatValue>{stats.cekaKontrola}</StatValue>
            <StatIcon>🔍</StatIcon>
            <StatLabel>Čeká na kontrolu</StatLabel>
          </StatCard>

          <StatCard
            $color="#10b981"
            $clickable={true}
            $isActive={activeStatFilter === 'vecnaSpravnost'}
            onClick={() => handleStatCardClick('vecnaSpravnost')}
            title="Filtrovat: Věcná správnost potvrzena"
          >
            <StatValue>{stats.vecnaSpravnost}</StatValue>
            <StatIcon>✅</StatIcon>
            <StatLabel>Věcná správnost</StatLabel>
          </StatCard>

          <StatCard
            $color="#10b981"
            $clickable={true}
            $isActive={activeStatFilter === 'registrZverejnena'}
            onClick={() => handleStatCardClick('registrZverejnena')}
            title="Filtrovat: Zveřejněna v registru smluv"
          >
            <StatValue>{stats.registrZverejnena}</StatValue>
            <StatIcon>📢</StatIcon>
            <StatLabel>Zveřejněna v registru</StatLabel>
          </StatCard>

          <StatCard
            $color="#059669"
            $clickable={true}
            $isActive={activeStatFilter === 'dokoncena'}
            onClick={() => handleStatCardClick('dokoncena')}
            title="Filtrovat: Objednávka dokončena"
          >
            <StatValue>{stats.dokoncena}</StatValue>
            <StatIcon>🎯</StatIcon>
            <StatLabel>Dokončená</StatLabel>
          </StatCard>

          <StatCard
            $color="#6b7280"
            $clickable={true}
            $isActive={activeStatFilter === 'zrusena'}
            onClick={() => handleStatCardClick('zrusena')}
            title="Filtrovat: Objednávka zrušena"
          >
            <StatValue>{stats.zrusena}</StatValue>
            <StatIcon>🚫</StatIcon>
            <StatLabel>Zrušená</StatLabel>
          </StatCard>
        </StatsBar>
        )}

        <ToolbarContainer>
          <SearchBox>
            <SearchIcon>
              <FontAwesomeIcon icon={faSearch} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Hledat v notifikacích..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <ClearSearchButton onClick={() => setSearchQuery('')} title="Vymazat">
                <FontAwesomeIcon icon={faTimes} />
              </ClearSearchButton>
            )}
          </SearchBox>

          <FilterGroup>
            <FilterButton
              $active={!showUnread && !showRead}
              onClick={() => {
                setShowUnread(false);
                setShowRead(false);
              }}
            >
              Všechny
            </FilterButton>
            <FilterButton
              $active={showUnread}
              onClick={() => {
                setShowUnread(!showUnread);
                if (!showUnread) setShowRead(false);
              }}
            >
              <FontAwesomeIcon icon={faBell} />
              Nepřečtené
            </FilterButton>
            <FilterButton
              $active={showRead}
              onClick={() => {
                setShowRead(!showRead);
                if (!showRead) setShowUnread(false);
              }}
            >
              <FontAwesomeIcon icon={faCheckDouble} />
              Přečtené
            </FilterButton>
            <FilterButton
              $active={showUrgent}
              onClick={() => setShowUrgent(!showUrgent)}
            >
              <FontAwesomeIcon icon={faExclamationCircle} />
              Urgentní
            </FilterButton>
            <FilterButton
              $active={showHigh}
              onClick={() => setShowHigh(!showHigh)}
            >
              <FontAwesomeIcon icon={faClock} />
              Vysoká
            </FilterButton>
            <FilterButton
              $active={showNormal}
              onClick={() => setShowNormal(!showNormal)}
            >
              <FontAwesomeIcon icon={faInfoCircle} />
              Normální
            </FilterButton>

            {/* ✅ Globální tlačítka pro rozbalení/sbalení vláken - pouze v thread módu */}
            {threadMode && threadedNotifications.some(item => item.isThread && item.olderNotifications.length > 0) && (
              <>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <FilterButton
                    onClick={handleExpandAll}
                    title="Rozbalit všechna vlákna"
                    style={{ borderColor: '#10b981', color: '#10b981' }}
                  >
                    <FontAwesomeIcon icon={faExpandAlt} />
                    Rozbalit vše
                  </FilterButton>
                  <FilterButton
                    onClick={handleCollapseAll}
                    title="Sbalit všechna vlákna"
                    style={{ borderColor: '#6366f1', color: '#6366f1' }}
                  >
                    <FontAwesomeIcon icon={faCompressAlt} />
                    Sbalit vše
                  </FilterButton>
                </div>
              </>
            )}
          </FilterGroup>
        </ToolbarContainer>

        <NotificationsList>
          {error ? (
            <EmptyState>
              <EmptyIcon>❌</EmptyIcon>
              <EmptyText>Chyba při načítání</EmptyText>
              <EmptySubtext>{error}</EmptySubtext>
              <ActionButton
                style={{ marginTop: '16px' }}
                onClick={loadNotifications}
              >
                Zkusit znovu
              </ActionButton>
            </EmptyState>
          ) : loading ? (
            <LoadingState>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
              Načítání notifikací...
            </LoadingState>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState>
              <EmptyIcon>🔔</EmptyIcon>
              <EmptyText>
                {searchQuery || showUnread || showRead || showUrgent || showHigh || showNormal
                  ? 'Žádné notifikace neodpovídají filtrům'
                  : 'Žádné notifikace'
                }
              </EmptyText>
              <EmptySubtext>
                {searchQuery || showUnread || showRead || showUrgent || showHigh || showNormal
                  ? 'Zkuste změnit filtry nebo vyhledávání'
                  : 'Budete informováni o nových událostech'
                }
              </EmptySubtext>
            </EmptyState>
          ) : (
            paginatedNotifications.map((item, index) => {
              // ✅ REŽIM VLÁKEN - Pokud je to vlákno objednávky
              if (item.isThread) {
                const { orderId, mainNotification, olderNotifications } = item;
                const isExpanded = expandedThreads.has(orderId);
                const threadCount = olderNotifications.length;

                // ✅ Unikátní klíč pro vlákno kombinující thread-orderId-mainNotificationId
                const threadKey = `thread-${orderId}-${mainNotification.id}`;

                const isUnread = !mainNotification.precteno || mainNotification.precteno === 0 || mainNotification.precteno === false;
                const isDismissed = mainNotification.skryto === 1 || mainNotification.skryto === true;
                const priority = mainNotification.priorita || 'normal';

                // ✅ Backend už vrací parsovaný objekt 'data', nemusíme parsovat
                const notificationData = mainNotification.data || {};
                mainNotification.data = notificationData;

                return (
                  <React.Fragment key={threadKey}>
                    {/* Hlavní (nejnovější) notifikace vlákna */}
                    <NotificationItem
                      $index={index}
                      $isUnread={isUnread}
                      $priority={priority}
                      onClick={() => handleNotificationClick(mainNotification)}
                      style={{
                        borderLeft: threadCount > 0 ? '4px solid #3b82f6' : undefined
                      }}
                    >
                      <NotificationIcon $priority={priority}>
                        {getPriorityIconComponent(priority, mainNotification.nadpis)}
                      </NotificationIcon>
                      <NotificationContent>
                        <NotificationHeader>
                          <NotificationTitle $isUnread={isUnread}>
                            {(() => {
                              if (mainNotification.typ?.includes('order') && mainNotification.data?.order_id && mainNotification.nadpis) {
                                const cleanedTitle = cleanNotificationTitle(mainNotification.nadpis);
                                const evCisloMatch = cleanedTitle.match(/(O-[^\s:]+)/);
                                if (evCisloMatch) {
                                  const evCislo = evCisloMatch[1];
                                  const textBefore = cleanedTitle.substring(0, evCisloMatch.index);
                                  const textAfter = cleanedTitle.substring(evCisloMatch.index + evCislo.length);

                                  return (
                                    <>
                                      {textBefore}
                                      <a
                                        href={`/order-form-25?edit=${mainNotification.data.order_id}&archivovano=1`}
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          // ✅ OPRAVENO: Použij handleNotificationClick pro kontrolu draftu
                                          await handleNotificationClick(mainNotification);
                                        }}
                                        style={{
                                          color: '#3b82f6',
                                          textDecoration: 'none',
                                          fontWeight: '700'
                                        }}
                                        title="Editovat objednávku"
                                      >
                                        {evCislo}
                                        <sup style={{ fontSize: '0.6em', fontWeight: '400', marginLeft: '0.2em', color: '#64748b' }}>
                                          #{mainNotification.data.order_id}
                                        </sup>
                                      </a>
                                      {textAfter}
                                      {!detailMode && (
                                        <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '0.9em', marginLeft: '0.5em' }}>
                                          | <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px', marginRight: '4px' }} />
                                          {getTimeAgo(mainNotification.dt_created || mainNotification.created_at)}
                                          {mainNotification.data?.placeholders?.action_performed_by && ` | ${mainNotification.data.placeholders.action_performed_by}`}
                                          {mainNotification.from_user_name && ` | Od: ${mainNotification.from_user_name}`}
                                        </span>
                                      )}
                                    </>
                                  );
                                }
                              }
                              return (
                                <>
                                  {cleanNotificationTitle(mainNotification.nadpis)}
                                  {!detailMode && (
                                    <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '0.9em', marginLeft: '0.5em' }}>
                                      | <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px', marginRight: '4px' }} />
                                      {getTimeAgo(mainNotification.dt_created || mainNotification.created_at)}
                                      {mainNotification.data?.placeholders?.action_performed_by && ` | ${mainNotification.data.placeholders.action_performed_by}`}
                                      {mainNotification.from_user_name && ` | Od: ${mainNotification.from_user_name}`}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                            {threadCount > 0 && (
                              <span
                                style={{
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  fontSize: '0.85em',
                                  marginLeft: '0.75em',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  padding: '3px 8px',
                                  borderRadius: '6px'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedThreads(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(orderId)) {
                                      newSet.delete(orderId);
                                    } else {
                                      newSet.add(orderId);
                                    }
                                    return newSet;
                                  });
                                }}
                                title={isExpanded ? "Skrýt starší notifikace" : "Zobrazit starší notifikace"}
                              >
                                <FontAwesomeIcon icon={isExpanded ? faChevronDown : faLayerGroup} style={{ marginRight: '4px' }} />
                                {threadCount} {threadCount === 1 ? 'starší' : threadCount < 5 ? 'starší' : 'starších'}
                              </span>
                            )}
                          </NotificationTitle>
                        </NotificationHeader>
                        {mainNotification.typ?.includes('order') && mainNotification.data?.placeholders ? (
                          <NotificationMessage>
                            <strong>Předmět:</strong> {mainNotification.data.placeholders.order_subject || mainNotification.data.placeholders.predmet || 'N/A'} | <strong>Cena:</strong> {mainNotification.data.placeholders.max_price_with_dph || mainNotification.data.placeholders.amount || 'N/A'} | <strong>Objednatel:</strong> {mainNotification.data.placeholders.creator_name || mainNotification.data.placeholders.objednatel_name || 'N/A'} | <strong>Garant:</strong> {mainNotification.data.placeholders.garant_name || 'N/A'} | <strong>Příkazce:</strong> {mainNotification.data.placeholders.prikazce_name || mainNotification.data.placeholders.schvalovatel_name || 'N/A'}
                          </NotificationMessage>
                        ) : mainNotification.zprava || mainNotification.message ? (
                          <NotificationMessage>
                            {mainNotification.zprava || mainNotification.message}
                          </NotificationMessage>
                        ) : null}

                        {detailMode && mainNotification.data?.placeholders?.note && (
                          <div style={{
                            fontSize: '0.85rem',
                            color: '#475569',
                            fontStyle: 'italic',
                            marginTop: '0.5rem',
                            padding: '0.625rem 0.75rem',
                            background: '#f8fafc',
                            borderLeft: '3px solid #cbd5e1',
                            borderRadius: '4px'
                          }}>
                            <strong style={{ fontStyle: 'normal', color: '#64748b' }}>📝 Poznámka:</strong>{' '}
                            {mainNotification.data.placeholders.note}
                          </div>
                        )}

                        <NotificationMeta>
                          {mainNotification.category && (
                            <TypeBadge $type={mainNotification.category}>
                              {getCategoryLabel(mainNotification.category)}
                            </TypeBadge>
                          )}
                          {mainNotification.data?.placeholders?.action_date && (
                            <TypeBadge style={{ background: '#dbeafe', color: '#1e40af' }}>
                              📅 {mainNotification.data.placeholders.action_date}
                            </TypeBadge>
                          )}
                          {mainNotification.data?.placeholders?.action_performed_by && (
                            <TypeBadge style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 600 }}>
                              👤 {mainNotification.data.placeholders.action_performed_by}
                            </TypeBadge>
                          )}
                        </NotificationMeta>
                      </NotificationContent>
                      <NotificationActions>
                        {/* ✅ Ikona rozbalení/sbalení vlákna */}
                        {olderNotifications.length > 0 && (
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              const newExpanded = new Set(expandedThreads);
                              if (isExpanded) {
                                newExpanded.delete(orderId);
                              } else {
                                newExpanded.add(orderId);
                              }
                              setExpandedThreads(newExpanded);
                            }}
                            title={isExpanded ? "Sbalit vlákno" : "Rozbalit vlákno"}
                            style={{
                              color: isExpanded ? '#6366f1' : '#10b981'
                            }}
                          >
                            <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
                          </IconButton>
                        )}

                        {isUnread && (
                          <IconButton
                            onClick={(e) => handleMarkAsRead(mainNotification.id, e)}
                            title="Označit jako přečtené"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </IconButton>
                        )}
                        {isDismissed ? (
                          <IconButton
                            onClick={(e) => handleRestore(mainNotification.id, e)}
                            title="Zobrazit zpět ve zvonečku"
                            style={{ color: '#16a34a' }}
                          >
                            <FontAwesomeIcon icon={faUndo} />
                          </IconButton>
                        ) : (
                          <IconButton
                            onClick={(e) => handleDismiss(mainNotification.id, e)}
                            title="Skrýt ze zvonečku (zůstane zde v historii)"
                          >
                            <FontAwesomeIcon icon={faEyeSlash} />
                          </IconButton>
                        )}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(mainNotification.id);
                          }}
                          title="Smazat trvale z databáze"
                          style={{ color: '#dc2626' }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </IconButton>
                      </NotificationActions>
                    </NotificationItem>

                    {/* ✅ Starší notifikace ve vlákně (rozbalitelné) */}
                    {isExpanded && olderNotifications.map((olderNotif, olderIndex) => {
                      const olderIsUnread = !olderNotif.precteno || olderNotif.precteno === 0;
                      const olderIsDismissed = olderNotif.skryto === 1;
                      const olderPriority = olderNotif.priority || 'normal';

                      // ✅ Backend už vrací parsovaný objekt 'data'
                      const olderData = olderNotif.data || {};
                      olderNotif.data = olderData;

                      return (
                        <NotificationItem
                          key={`${threadKey}-older-${olderNotif.id}`}
                          $index={index + olderIndex + 1}
                          $isUnread={olderIsUnread}
                          $priority={olderPriority}
                          onClick={() => handleNotificationClick(olderNotif)}
                          style={{
                            marginLeft: '3rem',
                            borderLeft: '3px solid #cbd5e1',
                            background: '#f9fafb',
                            opacity: 0.85,
                            padding: '10px 14px'
                          }}
                        >
                          <NotificationContent style={{ marginLeft: '0' }}>
                            <NotificationHeader style={{ marginBottom: '6px' }}>
                              <NotificationTitle $isUnread={olderIsUnread} style={{ fontSize: '13.5px', lineHeight: '1.4' }}>
                                {(() => {
                                  // Parsing ev. čísla začínajícího na "O-" a vytvoření odkazu
                                  if (olderNotif.type?.includes('order') && olderNotif.data?.order_id && olderNotif.title) {
                                    const evCisloMatch = olderNotif.title.match(/(O-[^\s:]+)/);
                                    if (evCisloMatch) {
                                      const evCislo = evCisloMatch[1];
                                      const textBefore = olderNotif.title.substring(0, evCisloMatch.index);
                                      const textAfter = olderNotif.title.substring(evCisloMatch.index + evCislo.length);

                                      return (
                                        <>
                                          {textBefore}
                                          <a
                                            href={`/order-form-25?edit=${olderNotif.data.order_id}&archivovano=1`}
                                            onClick={async (e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              // ✅ OPRAVENO: Použij handleNotificationClick pro kontrolu draftu
                                              await handleNotificationClick(olderNotif);
                                            }}
                                            style={{
                                              color: '#3b82f6',
                                              textDecoration: 'none',
                                              fontWeight: '700'
                                            }}
                                            title="Editovat objednávku"
                                          >
                                            {evCislo}
                                            <sup style={{ fontSize: '0.6em', fontWeight: '400', marginLeft: '0.2em', color: '#64748b' }}>
                                              #{olderNotif.data.order_id}
                                            </sup>
                                          </a>
                                          {textAfter}
                                          {!detailMode && (
                                            <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '0.85em', marginLeft: '0.5em' }}>
                                              | <FontAwesomeIcon icon={faClock} style={{ fontSize: '10px', marginRight: '4px' }} />
                                              {getTimeAgo(olderNotif.dt_created || olderNotif.created_at)}
                                              {olderNotif.data?.placeholders?.action_performed_by && ` | ${olderNotif.data.placeholders.action_performed_by}`}
                                              {olderNotif.from_user_name && ` | Od: ${olderNotif.from_user_name}`}
                                            </span>
                                          )}
                                        </>
                                      );
                                    }
                                  }
                                  return (
                                    <>
                                      {olderNotif.title}
                                      {!detailMode && (
                                        <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '0.85em', marginLeft: '0.5em' }}>
                                          | <FontAwesomeIcon icon={faClock} style={{ fontSize: '10px', marginRight: '4px' }} />
                                          {getTimeAgo(olderNotif.dt_created || olderNotif.created_at)}
                                          {olderNotif.data?.placeholders?.action_performed_by && ` | ${olderNotif.data.placeholders.action_performed_by}`}
                                          {olderNotif.from_user_name && ` | Od: ${olderNotif.from_user_name}`}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </NotificationTitle>
                            </NotificationHeader>
                            {olderNotif.typ?.includes('order') && olderNotif.data ? (
                              <NotificationMessage style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '6px' }}>
                                <strong>Předmět:</strong> {olderNotif.data.placeholders?.order_subject || olderNotif.data.placeholders?.predmet || 'N/A'} | <strong>Cena:</strong> {olderNotif.data.placeholders?.max_price_with_dph || olderNotif.data.placeholders?.amount || 'N/A'} | <strong>Objednatel:</strong> {olderNotif.data.placeholders?.creator_name || olderNotif.data.placeholders?.objednatel_name || 'N/A'} | <strong>Garant:</strong> {olderNotif.data.placeholders?.garant_name || 'N/A'} | <strong>Příkazce:</strong> {olderNotif.data.placeholders?.prikazce_name || olderNotif.data.placeholders?.schvalovatel_name || 'N/A'}
                              </NotificationMessage>
                            ) : olderNotif.zprava || olderNotif.message ? (
                              <NotificationMessage style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '6px' }}>
                                {olderNotif.zprava || olderNotif.message}
                              </NotificationMessage>
                            ) : null}

                            {detailMode && olderNotif.data?.placeholders?.note && (
                              <div style={{
                                fontSize: '0.8rem',
                                color: '#475569',
                                fontStyle: 'italic',
                                marginTop: '0.5rem',
                                padding: '0.5rem 0.625rem',
                                background: '#f8fafc',
                                borderLeft: '2px solid #cbd5e1',
                                borderRadius: '3px',
                                lineHeight: '1.4'
                              }}>
                                <strong style={{ fontStyle: 'normal', color: '#64748b' }}>📝 Poznámka:</strong>{' '}
                                {olderNotif.data.placeholders.note}
                              </div>
                            )}

                            <NotificationMeta style={{ gap: '10px', marginTop: '6px' }}>
                              {olderNotif.category && (
                                <TypeBadge $type={olderNotif.category} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {getCategoryLabel(olderNotif.category)}
                                </TypeBadge>
                              )}
                              {olderNotif.data?.placeholders?.action_date && (
                                <TypeBadge style={{ background: '#dbeafe', color: '#1e40af', fontSize: '10px', padding: '2px 6px' }}>
                                  📅 {olderNotif.data.placeholders.action_date}
                                </TypeBadge>
                              )}
                              {olderNotif.data?.placeholders?.action_performed_by && (
                                <TypeBadge style={{ background: '#f3e8ff', color: '#6b21a8', fontSize: '10px', padding: '2px 6px', fontWeight: 600 }}>
                                  👤 {olderNotif.data.placeholders.action_performed_by}
                                </TypeBadge>
                              )}
                              {olderIsDismissed && (
                                <TypeBadge style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: '10px', padding: '2px 6px' }}>
                                  � Nezobrazuje se ve zvonečku
                                </TypeBadge>
                              )}
                            </NotificationMeta>
                          </NotificationContent>
                          <NotificationActions>
                            {olderIsUnread && (
                              <IconButton
                                onClick={(e) => handleMarkAsRead(olderNotif.id, e)}
                                title="Označit jako přečtené"
                                style={{ width: '28px', height: '28px' }}
                              >
                                <FontAwesomeIcon icon={faCheck} />
                              </IconButton>
                            )}
                            {olderIsDismissed ? (
                              <IconButton
                                onClick={(e) => handleRestore(olderNotif.id, e)}
                                title="Zobrazit zpět ve zvonečku"
                                style={{ color: '#16a34a', width: '28px', height: '28px' }}
                              >
                                <FontAwesomeIcon icon={faUndo} />
                              </IconButton>
                            ) : (
                              <IconButton
                                onClick={(e) => handleDismiss(olderNotif.id, e)}
                                title="Skrýt ze zvonečku (zůstane zde v historii)"
                                style={{ width: '28px', height: '28px' }}
                              >
                                <FontAwesomeIcon icon={faEyeSlash} />
                              </IconButton>
                            )}
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(olderNotif.id);
                              }}
                              title="Smazat trvale z databáze"
                              style={{ color: '#dc2626', width: '28px', height: '28px' }}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </IconButton>
                          </NotificationActions>
                        </NotificationItem>
                      );
                    })}
                  </React.Fragment>
                );
              }

              // ✅ NORMÁLNÍ REŽIM - Jednotlivá notifikace (non-order nebo režim bez vláken)
              const notification = item.notification || item;
              const isUnread = !notification.precteno || notification.precteno === 0 || notification.precteno === false;
              const isDismissed = notification.skryto === 1 || notification.skryto === true;
              const priority = notification.priorita || 'normal';

              // ✅ Backend už vrací parsovaný objekt 'data'
              const notificationData = notification.data || {};
              notification.data = notificationData;

              // ✅ Unikátní klíč pro jednotlivé notifikace - použijeme ID notifikace
              const notificationKey = `notification-${notification.id}`;

              return (
                <NotificationItem
                  key={notificationKey}
                  $index={index}
                  $isUnread={isUnread}
                  $priority={priority}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotificationIcon $priority={priority}>
                    {getPriorityIconComponent(priority, notification.nadpis)}
                  </NotificationIcon>
                  <NotificationContent>
                    <NotificationHeader>
                      <NotificationTitle $isUnread={isUnread}>
                        {(() => {
                          // Parsing ev. čísla začínajícího na "O-" a vytvoření odkazu
                          if (notification.typ?.includes('order') && notification.data?.order_id && notification.nadpis) {
                            const cleanedTitle = cleanNotificationTitle(notification.nadpis);
                            const evCisloMatch = cleanedTitle.match(/(O-[^\s:]+)/);
                            if (evCisloMatch) {
                              const evCislo = evCisloMatch[1];
                              const textBefore = cleanedTitle.substring(0, evCisloMatch.index);
                              const textAfter = cleanedTitle.substring(evCisloMatch.index + evCislo.length);

                              return (
                                <>
                                  {textBefore}
                                  <a
                                    href={`/order-form-25?edit=${notification.data.order_id}&archivovano=1`}
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // ✅ OPRAVENO: Použij handleNotificationClick pro kontrolu draftu
                                      await handleNotificationClick(notification);
                                    }}
                                    style={{
                                      color: '#3b82f6',
                                      textDecoration: 'none',
                                      fontWeight: '700'
                                    }}
                                    title="Editovat objednávku"
                                  >
                                    {evCislo}
                                    <sup style={{ fontSize: '0.6em', fontWeight: '400', marginLeft: '0.2em', color: '#64748b' }}>
                                      #{notification.data.order_id}
                                    </sup>
                                  </a>
                                  {textAfter}
                                  {!detailMode && (
                                    <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '0.9em', marginLeft: '0.5em' }}>
                                      | <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px', marginRight: '4px' }} />
                                      {getTimeAgo(notification.dt_created || notification.created_at)}
                                      {notification.data?.placeholders?.action_performed_by && ` | ${notification.data.placeholders.action_performed_by}`}
                                      {notification.from_user_name && ` | Od: ${notification.from_user_name}`}
                                    </span>
                                  )}
                                </>
                              );
                            }
                          }
                          return (
                            <>
                              {cleanNotificationTitle(notification.nadpis)}
                              {!detailMode && (
                                <span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '0.9em', marginLeft: '0.5em' }}>
                                  | <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px', marginRight: '4px' }} />
                                  {getTimeAgo(notification.dt_created || notification.created_at)}
                                  {notification.data?.placeholders?.action_performed_by && ` | ${notification.data.placeholders.action_performed_by}`}
                                  {notification.from_user_name && ` | Od: ${notification.from_user_name}`}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </NotificationTitle>
                    </NotificationHeader>
                    {detailMode && notification.typ?.includes('order') && notification.data ? (
                      <NotificationMessage>
                        <strong>Předmět:</strong> {notification.data.order_subject || 'N/A'} | <strong>Cena:</strong> {notification.data.max_price ? `${notification.data.max_price} Kč` : 'N/A'} | <strong>Objednatel:</strong> {notification.data.creator_name || 'N/A'} | <strong>Garant:</strong> {notification.data.garant_name || 'N/A'} | <strong>Příkazce:</strong> {notification.data.prikazce_name || 'N/A'}
                      </NotificationMessage>
                    ) : detailMode && notification.zprava ? (
                      <NotificationMessage>
                        {notification.zprava}
                      </NotificationMessage>
                    ) : null}

                    {/* Poznámka */}
                    {detailMode && notification.data?.placeholders?.note && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#475569',
                        fontStyle: 'italic',
                        marginTop: '0.5rem',
                        padding: '0.625rem 0.75rem',
                        background: '#f8fafc',
                        borderLeft: '3px solid #cbd5e1',
                        borderRadius: '4px'
                      }}>
                        <strong style={{ fontStyle: 'normal', color: '#64748b' }}>📝 Poznámka:</strong>{' '}
                        {notification.data.placeholders.note}
                      </div>
                    )}

                    <NotificationMeta>
                      {detailMode && (
                        <MetaItem>
                          <FontAwesomeIcon icon={faClock} style={{ fontSize: '12px' }} />
                          {getTimeAgo(notification.dt_created || notification.created_at)}
                        </MetaItem>
                      )}
                      {detailMode && notification.kategorie && (
                        <TypeBadge $type={notification.kategorie}>
                          {getCategoryLabel(notification.kategorie)}
                        </TypeBadge>
                      )}
                      {/* Datum akce jako badge */}
                      {detailMode && notification.data?.placeholders?.action_date && (
                        <TypeBadge style={{ background: '#dbeafe', color: '#1e40af' }}>
                          📅 {notification.data.placeholders.action_date}
                        </TypeBadge>
                      )}
                      {/* Osoba jako badge */}
                      {detailMode && notification.data?.placeholders?.action_performed_by && (
                        <TypeBadge style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 600 }}>
                          👤 {notification.data.placeholders.action_performed_by}
                        </TypeBadge>
                      )}
                    </NotificationMeta>
                  </NotificationContent>
                  <NotificationActions>
                    {isUnread && (
                      <IconButton
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        title="Označit jako přečtené"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                      </IconButton>
                    )}
                    {/* ✅ Pokud je dismissed, nabídnout OBNOVENÍ místo skrytí */}
                    {isDismissed ? (
                      <IconButton
                        onClick={(e) => handleRestore(notification.id, e)}
                        title="Zobrazit zpět ve zvonečku"
                        style={{ color: '#16a34a' }}
                      >
                        <FontAwesomeIcon icon={faUndo} />
                      </IconButton>
                    ) : (
                      <IconButton
                        onClick={(e) => handleDismiss(notification.id, e)}
                        title="Skrýt ze zvonečku (zůstane zde v historii)"
                      >
                        <FontAwesomeIcon icon={faEyeSlash} />
                      </IconButton>
                    )}
                    {/* ✅ Tlačítko pro trvalé smazání z databáze */}
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      title="Smazat trvale z databáze"
                      style={{ color: '#dc2626' }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </IconButton>
                  </NotificationActions>
                </NotificationItem>
              );
            })
          )}
        </NotificationsList>

        {/* ✅ Pagination */}
        {!loading && !error && filteredNotifications.length > 0 && (
          <PaginationContainer>
            <PaginationInfo>
              Zobrazeno {paginatedNotifications.length} z {threadedNotifications.length} notifikací
              {threadedNotifications.length !== notifications.length && (
                <span> (filtrováno z {notifications.length})</span>
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
                  setCurrentPage(0); // Reset na první stránku
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </PageSizeSelect>

              <PageButton
                onClick={goToFirstPage}
                disabled={!canGoPrevious}
              >
                ««
              </PageButton>
              <PageButton
                onClick={goToPreviousPage}
                disabled={!canGoPrevious}
              >
                ‹
              </PageButton>

              <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
                Stránka {currentPage + 1} z {totalPages || 1}
              </span>

              <PageButton
                onClick={goToNextPage}
                disabled={!canGoNext}
              >
                ›
              </PageButton>
              <PageButton
                onClick={goToLastPage}
                disabled={!canGoNext}
              >
                »»
              </PageButton>
            </PaginationControls>
          </PaginationContainer>
        )}
      </ContentWrapper>

      {/* 🔒 Modal pro zamčenou objednávku */}
      {lockedOrderInfo && (
        <ConfirmDialog
          isOpen={showLockedOrderDialog}
          onClose={handleLockedOrderCancel}
          onConfirm={lockedOrderInfo.canForceUnlock ? handleLockedOrderForceUnlock : handleLockedOrderCancel}
          title={lockedOrderInfo.canForceUnlock ? 'Objednávka je zamčená' : 'Objednávka není dostupná'}
          icon="🔒"
          variant="warning"
          confirmText={lockedOrderInfo.canForceUnlock ? 'Odemknout a převzít' : 'Zavřít'}
          cancelText="Zrušit"
          showCancel={lockedOrderInfo.canForceUnlock}
        >
          {lockedOrderInfo.canForceUnlock ? (
            <div style={{ padding: '1rem 0' }}>
              <p style={{ color: '#dc2626', fontWeight: '600', marginBottom: '1rem' }}>
                ⚠️ Objednávka je aktuálně editována uživatelem:
              </p>
              <div style={{ padding: '1rem', background: '#f8fafc', borderLeft: '4px solid #3b82f6', borderRadius: '4px', marginBottom: '1rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>{lockedOrderInfo.lockedByUserName}</strong>
              </div>
              {(lockedOrderInfo.lockedByUserEmail || lockedOrderInfo.lockedByUserTelefon) && (
                <div style={{ padding: '1rem', background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#1e40af' }}>Kontaktní údaje:</p>
                  {lockedOrderInfo.lockedByUserEmail && (
                    <div style={{ padding: '0.5rem 0', color: '#1e40af' }}>📧 {lockedOrderInfo.lockedByUserEmail}</div>
                  )}
                  {lockedOrderInfo.lockedByUserTelefon && (
                    <div style={{ padding: '0.5rem 0', color: '#1e40af' }}>📞 {lockedOrderInfo.lockedByUserTelefon}</div>
                  )}
                </div>
              )}
              <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '1rem' }}>
                Jako <strong>{lockedOrderInfo.userRoleName}</strong> máte právo objednávku odemknout a převzít ji na sebe.
                Tato akce upozorní původního uživatele, že mu byla objednávka odebrána.
              </p>
              <p style={{ color: '#dc2626', fontWeight: '600' }}>
                Opravdu chcete převzít editaci této objednávky?
              </p>
            </div>
          ) : (
            <div style={{ padding: '1rem 0' }}>
              <p style={{ color: '#dc2626', fontWeight: '600', marginBottom: '1rem' }}>
                ❌ Objednávka je aktuálně editována jiným uživatelem:
              </p>
              <div style={{ padding: '1rem', background: '#f8fafc', borderLeft: '4px solid #dc2626', borderRadius: '4px', marginBottom: '1rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>{lockedOrderInfo.lockedByUserName}</strong>
              </div>
              {(lockedOrderInfo.lockedByUserEmail || lockedOrderInfo.lockedByUserTelefon) && (
                <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#991b1b' }}>Kontaktujte uživatele:</p>
                  {lockedOrderInfo.lockedByUserEmail && (
                    <div style={{ padding: '0.5rem 0', color: '#991b1b' }}>📧 {lockedOrderInfo.lockedByUserEmail}</div>
                  )}
                  {lockedOrderInfo.lockedByUserTelefon && (
                    <div style={{ padding: '0.5rem 0', color: '#991b1b' }}>📞 {lockedOrderInfo.lockedByUserTelefon}</div>
                  )}
                </div>
              )}
              <p style={{ color: '#64748b', lineHeight: '1.6' }}>
                Pokud je to nezbytné, kontaktujte administrátora, který má právo objednávku odemknout.
              </p>
            </div>
          )}
        </ConfirmDialog>
      )}

      {/* ✅ Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        icon={confirmDialog.icon}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onClose={confirmDialog.onCancel}
      >
        {confirmDialog.message}
      </ConfirmDialog>

      {/* 📝 Draft Warning Dialog - STEJNÝ JAKO V Orders25List */}
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
          Chystáte se editovat objednávku z notifikace.
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
                <strong>{draftTitle}</strong>
                . Přepnutím na jinou objednávku přijdete o neuložené změny!
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
      </ConfirmDialog>
    </PageContainer>
  );
};

export default NotificationsPage;
