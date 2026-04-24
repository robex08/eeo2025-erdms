import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCheck,
  faCheckDouble,
  faCheckCircle,
  faTimes,
  faTrash,
  faExclamationCircle,
  faClock,
  faInfoCircle,
  faEyeSlash,
  faBolt,
  faExclamation,
  faExclamationTriangle,
  faUserShield,
  faUsers,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

// =============================================================================
// ANIMATIONS - Smooth & Stable
// =============================================================================

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// =============================================================================
// STYLED COMPONENTS - Stabilní a moderní design
// =============================================================================

const DropdownOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  /* Transparent overlay - zachytí kliky mimo dropdown */
  background: transparent;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const DropdownContainer = styled.div`
  position: fixed;
  width: 420px;
  max-width: 90vw;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 10000;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  /* Smooth animation */
  animation: ${fadeIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  /* Performance optimization */
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform, opacity;

  /* Dynamic positioning */
  top: ${props => props.$top}px;
  left: ${props => props.$left}px;

  /* Hide until positioned */
  opacity: ${props => props.$isPositioned ? 1 : 0};
  pointer-events: ${props => props.$isPositioned ? 'auto' : 'none'};

  @media (max-width: 768px) {
    left: 10px !important;
    right: 10px;
    width: calc(100vw - 20px);
    max-height: 70vh;
  }
`;

const Header = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UnreadBadge = styled.span`
  background: ${(props) => {
    // Barvy badge podle priority notifikací - stejná logika jako v Layout.js
    const color = props.$badgeColor || 'gray';
    switch (color) {
      case 'red':
        return 'linear-gradient(135deg, #ef4444, #dc2626)'; // Urgent/EXCEPTIONAL
      case 'blue':
        return 'linear-gradient(135deg, #3b82f6, #2563eb)'; // Komentáře  
      case 'green':
        return 'linear-gradient(135deg, #22c55e, #16a34a)'; // Objednávky
      case 'gray':
      default:
        return 'linear-gradient(135deg, #6b7280, #4b5563)'; // Ostatní
    }
  }};
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
  
  /* Smooth animation při změně barvy */
  transition: background 0.3s ease;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const HeaderButton = styled.button`
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  font-size: 14px;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const NotificationsList = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f9fafb;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

const NotificationIcon = styled.div(({ $priority }) => {
  const normalizedPriority = ($priority || 'INFO').toUpperCase();
  
  let bgColor, iconColor;
  if (normalizedPriority === 'SUCCESS') {
    bgColor = '#f0fdf4';  // Světle zelená
    iconColor = '#16a34a';  // Tmavě zelená
  } else if (normalizedPriority === 'EXCEPTIONAL' || normalizedPriority === 'URGENT') {
    bgColor = '#fef2f2';  // Světle červená
    iconColor = '#dc2626';  // Tmavě červená
  } else if (normalizedPriority === 'APPROVAL' || normalizedPriority === 'HIGH' || normalizedPriority === 'WARNING') {
    bgColor = '#fff7ed';  // Světle oranžová
    iconColor = '#ea580c';  // Tmavě oranžová
  } else {
    bgColor = '#eff6ff';  // Světle modrá
    iconColor = '#3b82f6';  // Tmavě modrá
  }
  
  return `
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px; /* Zvětšeno z 18px */
    flex-shrink: 0;
    background: ${bgColor};
    color: ${iconColor};
  `;
});

const NotificationContent = styled.div`
  flex: 1;
  min-width: 0; /* Umožní text-overflow */
`;

const NotificationTitle = styled.div`
  font-weight: ${props => props.$isUnread ? 700 : 400};
  color: ${props => props.$isUnread ? '#111827' : '#6b7280'};
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
  
  /* 🚨 URGENT zvýraznění - červené pozadí + žluté písmo */
  ${props => {
    if (props.$priority === 'urgent' || props.$priority === 'URGENT' || props.$priority === 'exceptional' || props.$priority === 'EXCEPTIONAL') {
      return `
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: #fef3c7;
        padding: 6px 10px;
        border-radius: 6px;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        border: 1px solid #991b1b;
        box-shadow: 0 2px 4px rgba(220,38,38,0.3);
      `;
    }
    
    /* ⚠️ WARNING zvýraznění - žlutavé pozadí + tmavé písmo */
    if (props.$priority === 'warning' || props.$priority === 'WARNING' || props.$priority === 'high' || props.$priority === 'HIGH') {
      return `
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #451a03;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        border: 1px solid #d97706;
        box-shadow: 0 1px 3px rgba(251,191,36,0.4);
      `;
    }
    
    return '';
  }}

  /* Truncate long titles */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const NotificationMessage = styled.div`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 6px;

  /* Truncate long messages */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;

  /* HTML formatting support */
  b, strong {
    font-weight: 700;
    color: #374151;
  }

  i, em {
    font-style: italic;
  }

  u {
    text-decoration: underline;
  }

  br {
    display: block;
    content: "";
    margin-top: 0.25em;
  }

  p {
    margin: 0;
    padding: 0;
  }

  a {
    color: #3b82f6;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const NotificationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
`;

const NotificationTime = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const NotificationActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
`;

// Update NotificationItem to show actions on hover using a class selector instead
const NotificationItem = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  gap: 12px;
  align-items: start;
  animation: ${slideIn} 0.2s ease-out;
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
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-left-color: #dc2626;
  `}

  &:hover {
    background: ${props => props.$isUnread ? '#dbeafe' : '#f9fafb'};
    ${props => props.$priority === 'high' && 'background: #fee2e2;'}
    ${props => props.$priority === 'urgent' && 'background: #fecaca;'}
  }

  /* Show actions on hover - using descendant selector with div */
  &:hover > div:last-child {
    opacity: 1;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  font-size: 14px;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #111827;
  }

  &:active {
    transform: scale(0.9);
  }
`;

const Footer = styled.div`
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  text-align: center;
  flex-shrink: 0;
`;

const ViewAllButton = styled.button`
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;

  &:hover {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #9ca3af;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
`;

const LoadingState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
`;

// =============================================================================
// COMPONENT
// =============================================================================

export const NotificationDropdown = React.forwardRef(({
  anchorRef,
  visible,
  onClose,
  notifications = [],
  unreadCount = 0,
  badgeColor = 'gray',
  onNotificationClick,
  onMarkAsRead,
  onMarkAllRead,
  onDismiss,
  onDismissAll,
  loading = false
}, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Callback ref to set both internal and forwarded refs
  const setRefs = useCallback((node) => {
    // Set internal ref
    dropdownRef.current = node;
    
    // Set forwarded ref if provided
    if (ref) {
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  }, [ref]);

  // Calculate dropdown position relative to bell icon
  useEffect(() => {
    if (!visible || !anchorRef?.current) return;

    const calculatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const dropdownWidth = 420;
      const spacing = 12;

      // Position below the bell with some spacing
      const top = rect.bottom + spacing;

      // Try to align right edge with bell icon
      // but ensure it doesn't go off-screen
      let left = rect.right - dropdownWidth;

      // If it goes off the left side, align with left edge instead
      if (left < 10) {
        left = rect.left;
      }

      // If still off-screen, center it
      if (left < 10 || left + dropdownWidth > window.innerWidth - 10) {
        left = Math.max(10, (window.innerWidth - dropdownWidth) / 2);
      }

      setPosition({ top, left });
      setIsPositioned(true);
    };

    // Calculate immediately
    calculatePosition();

    // Recalculate on window resize/scroll
    const handleUpdate = () => calculatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [visible, anchorRef]);

  // Close on click outside
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose?.();
      }
    };

    // Small delay to prevent immediate close on open
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, anchorRef, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible, onClose]);

  const handleNotificationClick = (notification) => {
    onNotificationClick?.(notification);
  };

  const handleMarkAsRead = (e, notificationId) => {
    e.stopPropagation();
    onMarkAsRead?.(notificationId);
  };

  const handleDismiss = (e, notificationId) => {
    e.stopPropagation();
    onDismiss?.(notificationId);
  };

  const handleViewAll = () => {
    onClose?.();
    navigate('/notifications');
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
      month: 'short'
    });
  };

  // 🎯 Funkce pro odstranění ikon z nadpisu (eliminuje duplicity)
  const cleanNotificationTitle = (title) => {
    if (!title) return title;
    
    const originalTitle = title;
    // Odstraní emoji ikony a otazníky na začátku včetně variation selectors (\uFE0F)
    const cleanedTitle = title
      .replace(/^\?\s*/, '')     // Otazník na začátku
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
      .replace(/^[?ℹ⚠🚨✅❌⏸📧🎯📦]\uFE0F?\s*/, ''); // Fallback regex
    
    return cleanedTitle;
  };

  const getPriorityIcon = (priority, nadpis = '', notificationType = '', objTyp = '') => {
    const normalizedPriority = (priority || 'INFO').toUpperCase();
    
    // 🌟 SPECIÁLNÍ: PLANNING - ikona kalendáře
    if (objTyp === 'planning_event' || objTyp === 'planning_message') {
      return faCalendarAlt;
    }
    
    // 🌟 SPECIÁLNÍ: ADMIN_MESSAGE - ikona štítu
    if (notificationType === 'ADMIN_MESSAGE') {
      return normalizedPriority === 'HIGH' || normalizedPriority === 'URGENT' 
        ? faBolt  // Vysoká priorita - blesk
        : faUserShield;  // Normální - štít správce
    }
    
    // 🌟 SPECIÁLNÍ: SUBSTITUTION typy - ikona uživatelů
    if (notificationType === 'SUBSTITUTION_SET' || notificationType === 'SUBSTITUTION_CREATED' || notificationType === 'SUBSTITUTION_ENDED') {
      return faUsers;
    }
    
    // 🌟 SPECIÁLNÍ: Pro potvrzení věcné správnosti zobraz zelenou fajfku
    if (notificationType === 'invoice_material_check_approved' || 
        notificationType === 'INVOICE_MATERIAL_CHECK_APPROVED') {
      return faCheckCircle;  // ✅ Zelená fajfka
    }
    
    // Určíme prioritu podle emoji v nadpisu, pokud priority není specifická
    if (nadpis.includes('🚨')) {
      return faBolt; // URGENT - blesk
    }
    if (nadpis.includes('⚠️')) {
      return faExclamationTriangle; // WARNING - trojúhelník
    }
    if (nadpis.includes('ℹ️')) {
      return faInfoCircle; // INFO - kruh
    }
    
    switch (normalizedPriority) {
      case 'EXCEPTIONAL':
      case 'URGENT':
        return faBolt;  // ⚡ Blesk - červená
      case 'APPROVAL':
      case 'HIGH':
        return faExclamationTriangle;  // ⚠️ Trojúhelník - oranžová
      case 'WARNING':
        return faExclamationTriangle;  // ⚠️ Trojúhelník - oranžová
      case 'INFO':
      case 'NORMAL':
      default:
        return faInfoCircle;  // ℹ️ Info kruh - modrá
    }
  };

  // Nezobrazuj dropdown, dokud se načítají data poprvé
  // (visible && !isPositioned = čeká na pozici, visible && loading && notifications.length === 0 = první načítání)
  if (!visible || !isPositioned) return null;

  const dropdownContent = (
    <>
      <DropdownOverlay $visible={visible} onClick={onClose} />
      <DropdownContainer
        ref={setRefs}
        $top={position.top}
        $left={position.left}
        $isPositioned={isPositioned}
      >
        <Header>
          <HeaderTitle>
            <FontAwesomeIcon icon={faBell} />
            Notifikace
            {unreadCount > 0 && <UnreadBadge $badgeColor={badgeColor}>{unreadCount > 99 ? '99+' : unreadCount}</UnreadBadge>}
          </HeaderTitle>
          <HeaderActions>
            {unreadCount > 0 && (
              <HeaderButton
                onClick={onMarkAllRead}
                title="Označit vše jako přečtené"
              >
                <FontAwesomeIcon icon={faCheckDouble} />
              </HeaderButton>
            )}
            {notifications.length > 0 && (
              <HeaderButton
                onClick={onDismissAll}
                title="Skrýt vše"
              >
                <FontAwesomeIcon icon={faEyeSlash} />
              </HeaderButton>
            )}
            <HeaderButton onClick={onClose} title="Zavřít">
              <FontAwesomeIcon icon={faTimes} />
            </HeaderButton>
          </HeaderActions>
        </Header>

        <NotificationsList>
          {loading ? (
            <LoadingState>
              <div style={{ marginBottom: '8px' }}>⏳</div>
              Načítání notifikací...
            </LoadingState>
          ) : notifications.length === 0 ? (
            <EmptyState>
              <EmptyIcon>🔔</EmptyIcon>
              <EmptyText>Žádné nové notifikace</EmptyText>
            </EmptyState>
          ) : (
            notifications.slice(0, 10).map((notification, index) => {
              const isUnread = !notification.precteno || notification.precteno === 0 || notification.precteno === false;
              let priority = notification.priorita || 'normal';
              
              // 🌟 SPECIÁLNÍ: Pro potvrzení věcné správnosti nastav speciální priority
              if (notification.typ === 'invoice_material_check_approved' || 
                  notification.typ === 'INVOICE_MATERIAL_CHECK_APPROVED') {
                priority = 'SUCCESS';
              }
              
              // 🚨 Detekce URGENT z emoji v nadpisu
              if (notification.nadpis && notification.nadpis.includes('🚨')) {
                priority = 'URGENT';
              } else if (notification.nadpis && notification.nadpis.includes('⚠️')) {
                priority = 'WARNING';
              } else if (notification.nadpis && notification.nadpis.includes('ℹ️')) {
                priority = 'INFO';
              }

              // ✅ Parse data_json pro zobrazení dodatečných informací
              let notificationData = {};
              try {
                if (notification.data_json) {
                  notificationData = typeof notification.data_json === 'string'
                    ? JSON.parse(notification.data_json)
                    : notification.data_json;
                } else if (notification.data) {
                  notificationData = notification.data;
                }
              } catch (error) {
                notificationData = {};
              }

              return (
                <NotificationItem
                  key={notification.id}
                  $index={index}
                  $isUnread={isUnread}
                  $priority={priority}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotificationIcon $priority={priority}>
                    <FontAwesomeIcon icon={getPriorityIcon(priority, notification.nadpis, notification.typ, notification.objekt_typ)} />
                  </NotificationIcon>
                  <NotificationContent>
                    <NotificationTitle $isUnread={isUnread} $priority={priority}>
                      {cleanNotificationTitle(notification.nadpis) || notification.app_title || 'Bez názvu'}
                    </NotificationTitle>
                    {(notification.zprava || notification.app_message) && (
                      <NotificationMessage 
                        dangerouslySetInnerHTML={{ 
                          __html: notification.zprava || notification.app_message 
                        }}
                      />
                    )}
                    <NotificationMeta>
                      <NotificationTime>
                        <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px' }} />
                        {getTimeAgo(notification.dt_created || notification.created_at)}
                      </NotificationTime>
                      {/* Zobraz jméno uživatele, který provedl akci */}
                      {notification.typ !== 'ADMIN_MESSAGE' && (notificationData?.placeholders?.action_performed_by || notificationData?.action_performed_by) && (
                        <span style={{
                          background: '#f3e8ff',
                          color: '#6b21a8',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          👤 {notificationData?.placeholders?.action_performed_by || notificationData?.action_performed_by}
                        </span>
                      )}
                      {/* Zobraz odesílatele pro ZASTUP notifikace */}
                      {notification.objekt_typ === 'zastupovani' && notification.from_user_name && (
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          👤 {notification.from_user_name}
                        </span>
                      )}
                      {/* Zobraz odesílatele pro ADMIN zprávy - zvýrazněně */}
                      {notification.typ === 'ADMIN_MESSAGE' && notification.from_user_name && (() => {
                        const senderName = notification.from_user_name;
                        return (
                          <span style={{
                            background: '#fef3c7',
                            color: '#d97706',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            👤 Od: {senderName}
                          </span>
                        );
                      })()}
                      {/* Zobraz organizátora pro PLANNING událost - oranžový badge */}
                      {(notification.objekt_typ === 'planning_event' || notification.objekt_typ === 'planning_message') && notificationData?.organizator && (
                        <span style={{
                          background: '#fed7aa',
                          color: '#c2410c',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          👤 {notificationData.organizator}
                        </span>
                      )}
                    </NotificationMeta>
                  </NotificationContent>
                  <NotificationActions>
                    {isUnread && (
                      <ActionButton
                        onClick={(e) => handleMarkAsRead(e, notification.id)}
                        title="Označit jako přečtené"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                      </ActionButton>
                    )}
                    <ActionButton
                      onClick={(e) => handleDismiss(e, notification.id)}
                      title="Skrýt notifikaci"
                    >
                      <FontAwesomeIcon icon={faEyeSlash} />
                    </ActionButton>
                  </NotificationActions>
                </NotificationItem>
              );
            })
          )}
        </NotificationsList>

        <Footer>
          <ViewAllButton onClick={handleViewAll}>
            {notifications.length > 0
              ? `Zobrazit všechny notifikace (${notifications.length})`
              : 'Zobrazit všechny notifikace'
            }
          </ViewAllButton>
        </Footer>
      </DropdownContainer>
    </>
  );

  return ReactDOM.createPortal(dropdownContent, document.body);
});

NotificationDropdown.displayName = 'NotificationDropdown';

export default NotificationDropdown;
