import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoice, faUser, faSignOutAlt, faUsers, faPlus, faBug, faTrash, faCopy, faRotateLeft, faPlusSquare, faMinusSquare, faEdit, faTasks, faStickyNote, faBell, faFilter, faCalendarDays, faAddressBook, faKey, faComments, faBook, faCalculator, faMicrophone, faInfoCircle, faChartBar, faChartLine, faPhone, faCog, faTruck, faSitemap, faQuestionCircle, faLockOpen, faSquareRootAlt, faPlug, faDatabase, faRocket, faMoneyBill, faFlask, faList, faLock, faExclamationTriangle, faChevronUp, faChevronDown, faHome } from '@fortawesome/free-solid-svg-icons';
import ChangePasswordDialog from './ChangePasswordDialog';
import { AuthContext } from '../context/AuthContext';
import { changePasswordApi2 } from '../services/api2auth';
import CalendarPanel from './panels/CalendarPanel';
import NotificationDropdown from './NotificationDropdown';
import SystemInfoService from '../services/systemInfoService';
import SmartTooltip from '../styles/SmartTooltip';
// translation logic moved to utils/translate
import { setApiDebugEnabled } from '../services/apiv2';
import { saveCurrentLocation } from '../utils/logoutCleanup';
// (AuthContext already imported above)
import { ProgressContext } from '../context/ProgressContext';
import { DebugContext } from '../context/DebugContext'; // Use DebugContext
import { useBackgroundTasks as useBgTasksContext } from '../context/BackgroundTasksContext';
import { css, Global } from '@emotion/react';
import styled from '@emotion/styled';
// Extracted floating panels
import { TodoPanel, NotesPanel, ChatPanel } from './panels';
import { formatDateOnly, prettyDate } from '../utils/format';
import { useFloatingPanels } from '../hooks/useFloatingPanels';
import { useGlobalVoiceRecognition } from '../hooks/useGlobalVoiceRecognition';
import { useTodoAlarms } from '../hooks/useTodoAlarms';
import useActivityTracking from '../hooks/useActivityTracking'; // ✅ NOVÉ: Activity tracking
import { FloatingAlarmManager } from './FloatingAlarmPopup';
import { translateToCz } from '../utils/translate';
import { useDebugPanel } from '../hooks/useDebugPanel';
import { ASSETS } from '../config/assets';
import FinancialCalculator from './FinancialCalculator';
import CurrencyTicker from './CurrencyTicker';
import { ToastContext } from '../context/ToastContext';
import StickyNotesOverlay from './StickyNotesOverlay';
import { runAllEncryptionTests } from '../utils/encryptionUtils';
import { isValidConcept, hasDraftChanges, getOrderPhaseFromDraft } from '../utils/draftUtils.js';
import { onTabSyncMessage, BROADCAST_TYPES, initTabSync, closeTabSync } from '../utils/tabSync';
import draftManager from '../services/DraftManager'; // CENTRALIZED DRAFT MANAGER
import { getToolsVisibility } from '../utils/toolsVisibility';
import UniversalSearchInput from './UniversalSearch/UniversalSearchInput';
import { checkMaintenanceMode } from '../services/globalSettingsApi';
import { getGlobalSettings } from '../services/globalSettingsApi';
import { getDefaultHomepageSync } from '../utils/homepageHelper';
import cashbookAPI from '../services/cashbookService';

// Inject small CSS for bell pulse if missing
if (typeof document !== 'undefined' && !document.getElementById('bell-pulse-styles')) {
  const style = document.createElement('style');
  style.id = 'bell-pulse-styles';
  style.textContent = `
    @keyframes bell-pulse { 0% { transform: scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); } 50% { transform: scale(1.12); box-shadow: 0 6px 18px rgba(59,130,246,0.18); } 100% { transform: scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); } }
    @keyframes mic-pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 50% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
    @keyframes pulse-maintenance { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    [data-bell-pulse='1'] { animation: bell-pulse .9s ease; }
  `;
  document.head.appendChild(style);
}

// Helper to set runtime actual offsets (header + menu) if their rendered heights differ
const useActualOffset = () => {
  // Provide a stable force-update function so the Layout can retry measurements
  const forceRef = useRef(() => {});
  useEffect(() => {
    let ro = null;
    let mo = null;
    const measureNow = () => {
      try {
        const headerEl = document.querySelector('header');
        const navEl = document.querySelector('nav');
        if (!headerEl || !navEl) return;
        const h = Math.round(headerEl.getBoundingClientRect().height || 0);
        const n = Math.round(navEl.getBoundingClientRect().height || 0);
        const saneH = (h >= 24 && h <= 600) ? h : null;
        const saneN = (n >= 20 && n <= 400) ? n : null;
        if (saneH && saneN) {
          const total = saneH + saneN;
          document.documentElement.style.setProperty('--app-header-height', saneH + 'px');
          document.documentElement.style.setProperty('--app-menu-height', saneN + 'px');
          document.documentElement.style.setProperty('--app-fixed-offset', `calc(var(--app-header-height) + var(--app-menu-height))`);
          document.documentElement.style.setProperty('--app-fixed-offset-actual', total + 'px');
        }
      } catch (e) { /* ignore measurement errors */ }
    };

    const attachObservers = (headerEl, navEl) => {
      if (!headerEl || !navEl) return;
      const update = () => {
        try { requestAnimationFrame(measureNow); } catch(_) { measureNow(); }
      };
      update();
      try {
        ro = new ResizeObserver(update);
        ro.observe(headerEl);
        ro.observe(navEl);
      } catch (e) { ro = null; }
      window.addEventListener('orientationchange', update);
      window.addEventListener('resize', update);
    };

    // Try immediate attach first
    const headerEl = document.querySelector('header');
    const navEl = document.querySelector('nav');
    if (headerEl && navEl) {
      attachObservers(headerEl, navEl);
    } else {
      // If header/nav not present yet (e.g. before login), watch for their insertion
      try {
        mo = new MutationObserver((mutations, observer) => {
          const h = document.querySelector('header');
          const n = document.querySelector('nav');
          if (h && n) {
            attachObservers(h, n);
            try { observer.disconnect(); } catch(_) {}
            mo = null;
          }
        });
        mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
      } catch (e) { /* fallback: nothing we can do */ }
    }

    // expose a force update function
    forceRef.current = () => {
      try { measureNow(); } catch(_) {}
    };

    return () => {
      try { if (ro && typeof ro.disconnect === 'function') ro.disconnect(); } catch(_) {}
      try { if (mo && typeof mo.disconnect === 'function') mo.disconnect(); } catch(_) {}
      try { window.removeEventListener('orientationchange', () => {}); } catch(_) {}
      try { window.removeEventListener('resize', () => {}); } catch(_) {}
    };
  }, []);

  // return stable function
  return useCallback(() => { try { forceRef.current && forceRef.current(); } catch(_) {} }, []);
};

const layoutStyle = css`
  /* Sjednocený základ – font nyní řídí :root proměnná --app-font-family */
  font-family: var(--app-font-family, 'Inter', 'Arial', sans-serif);
  background-color: var(--app-primary); /* use theme var */
  color: #333;
  min-height: 100vh;
  height: 100vh;
  position: relative;
  overflow: hidden; /* vnější stránka bez scrollbaru – scroll uvnitř Content */
`;
const Header = styled.header(({ theme }) => {
  // Detekce dev prostředí z URL
  const isDevEnv = typeof window !== 'undefined' && window.location.pathname.startsWith('/dev/');
  
  // Dev: tmavě hnědá → tmavě červená, Produkce: modrý gradient
  const gradient = isDevEnv
    ? 'linear-gradient(135deg, #654321 0%, #8B4513 40%, #A0522D 70%, #8B0000 100%)'
    : `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryAccent} 70%, ${theme.colors.primaryAccentAlt} 100%)`;
  
  return `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: ${gradient};
    color: #fff;
    height: var(--app-header-height, 96px);
    padding: 10px 20px 14px 20px;
    box-sizing: border-box;
    flex-shrink: 0;
    transition: background .3s ease;
  `;
});
const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderLogo = styled.img`
  height: 70px;
  width: auto;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
`;

const HeaderCenter = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  max-width: 600px;
`;

const HeaderRight = styled.div`text-align:right;`;

// Theme toggle button removed per user request
// Datum + čas (čas dominantní)
const DateTimeBlock = styled.div`display:flex;flex-direction:row;align-items:baseline;gap:0.6rem;margin:0;padding:0;font-weight:600;color:${({theme})=>theme.colors.gold};letter-spacing:0.5px;white-space:nowrap;`;
const DateLine = styled.span`font-size: var(--app-header-title-size, 1.75rem); line-height:1.05;`;
const TimeLine = styled.span`font-size: var(--app-header-title-size, 1.75rem); line-height:1.05; font-weight:var(--app-header-title-weight, 600);`;
const CalendarBtn = styled.button`
  background: transparent; border: none; color: ${({theme})=>theme.colors.gold}; cursor: pointer; padding: 0; margin: 0; display:inline-flex; align-items:center; justify-content:center;
  opacity: .9; transition: opacity .18s ease, transform .18s ease; &:hover{opacity:1;} &:active{transform:scale(.94);}
  /* fine tune position: a bit left from the time and slightly lower to center with digits */
  margin-right: 0.25rem;
  transform: translateY(2px);
`;

// 🎯 OPTIMALIZACE: Samostatná komponenta pro čas - re-renderuje se pouze ona
const LiveDateTime = React.memo(() => {
  const [currentDateTime, setCurrentDateTime] = useState({
    date: formatDateOnly(new Date()),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime({
        date: formatDateOnly(new Date()),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }, 60000); // ✅ Aktualizace každou MINUTU (ne každých 10s)

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <DateLine>{currentDateTime.date}</DateLine>
      <TimeLine>{currentDateTime.time}</TimeLine>
    </>
  );
});

// (Removed unused Menu styled component)
const MenuLeft = styled.div`
  display: flex;
  gap: 0.25em; /* tighter spacing between items */
  flex: 1;
  padding: 0.25em 0.5em; /* sníženo pro fit do 48px nav výšky */
  background: ${({theme})=>theme.colors.surfaceLight};
  border-radius: 1.2em;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.04);
  min-width:0;
  overflow-x:visible; /* Změněno z hidden - aby scrollWidth fungoval pro detekci */
`;
const MenuRight = styled.div`
  display: flex;
  gap: 10px; /* tighter spacing */
  justify-content: flex-end;
  min-width: 0; /* avoid forcing extra width */
`;

// Dropdown submenu styled components
const MenuDropdownWrapper = styled.div`
  position: relative;
`;

const MenuDropdownButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5em;
  background: transparent;
  border: none;
  color: ${({theme}) => theme.colors.primary};
  font-size: 1.05em;
  line-height: 1.5;
  min-height: 2.8em;
  padding: 0.4em 0.85em;
  border-radius: 0.8em;
  transition: all 0.22s ease;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(34,197,94,0.04);
  
  /* Hover underline effect like MenuLinkLeft */
  &::after {
    content: '';
    position: absolute;
    right: 0.75em;
    bottom: 0.35em;
    height: 3px;
    width: 0;
    background: ${({theme}) => theme.colors.primary};
    border-radius: 2px;
    opacity: 0;
    transition: width .28s ease, opacity .25s ease;
  }
  
  &:hover {
    background: rgba(32,45,101,0.08);
    color: #202d65;
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.20));
  }
  
  &:hover::after {
    width: 20%;
    opacity: 1;
  }
  
  &:active {
    background: linear-gradient(90deg, transparent 0 33.333%, rgba(32,45,101,0.18) 33.333% 100%);
  }
  
  .svg-inline--fa {
    font-size: 1.35em;
    margin-right: 0.35em;
    transition: transform 0.2s ease;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
  }
  
  .chevron {
    font-size: 0.8em;
    margin-left: 0.3em;
    transition: transform 0.2s ease;
  }
  
  &[data-open="true"] .chevron {
    transform: rotate(180deg);
  }
`;

const MenuDropdownContent = styled.div`
  position: fixed;
  background: white;
  border-radius: 0.8em;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 200px;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 9999;
  display: ${({$open}) => $open ? 'block' : 'none'};
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 0 0.8em 0.8em 0;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const MenuDropdownItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 0.75em 1em;
  color: ${({theme}) => theme.colors.primary};
  text-decoration: none;
  font-size: 0.95em;
  transition: all 0.22s ease;
  border-left: 3px solid transparent;

  &:hover {
    background: rgba(32,45,101,0.08);
    color: #202d65;
    border-left-color: ${({theme}) => theme.colors.primary};
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.20));
  }

  &:active {
    background: linear-gradient(90deg, transparent 0 33.333%, rgba(32,45,101,0.18) 33.333% 100%);
  }

  .svg-inline--fa {
    font-size: 1.2em;
    color: inherit;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
  }
`;// Styled Link components to ensure styles always apply
const MenuLinkLeft = styled(Link, {
  shouldForwardProp: (prop) => !['$active','$noHoverUnderline'].includes(prop)
})(({ $active, $noHoverUnderline, theme }) => `
  display: flex;
  align-items: center;
  gap: 0.5em;
  text-decoration: none !important;
  color: ${theme.colors.primary};
  font-size: 1.05em;
  line-height: 1.5;
  min-height: 2.8em;
  padding: 0.4em 0.85em;
  border-radius: 0.8em;
  transition: all 0.22s ease;
  box-shadow: 0 1px 4px rgba(34,197,94,0.04);
  font-weight: 500;
  position: relative;
  overflow: hidden;

  &:link, &:visited {
    color: ${theme.colors.primary};
    text-decoration: none !important;
  }

  .svg-inline--fa:not([data-force-white='true']), svg:not([data-force-white='true']) {
    font-size: 1.35em !important;
    margin-right: 0.35em !important;
    color: inherit !important;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
    transition: inherit !important;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    right: 0.75em;
    bottom: 0.35em;
    height: 3px;
    width: ${$active ? '20%' : '0'};
    background: ${theme.colors.primary};
    border-radius: 2px;
    opacity: ${$active ? '1' : '0'};
    transition: width .28s ease, opacity .25s ease;
    ${$noHoverUnderline ? 'display: none !important;' : ''}
  }

  &:hover:not([data-no-hover-underline]), &:focus-visible:not([data-no-hover-underline]) {
    background: ${$active ? 'transparent' : 'rgba(32,45,101,0.08)'};
    color: #202d65 !important;
    filter: drop-shadow(0 2px 6px rgba(32,45,101,${$active ? '0.25' : '0.20'}));
  }

  &:hover::after, &:focus-visible::after {
    width: 20%;
    opacity: 1;
  }

  &:active {
    background: linear-gradient(90deg, transparent 0 33.333%, rgba(32,45,101,0.18) 33.333% 100%);
  }

  ${$active ? `
    color: #202d65 !important;
    background: transparent;
    box-shadow: none;
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.25));
  ` : ''}
`);

const MenuLinkRight = styled(Link, {
  shouldForwardProp: (prop) => prop !== '$active'
})(({ $active, theme }) => `
  display: flex;
  align-items: center;
  gap: 0.7em;
  text-decoration: none !important;
  color: ${$active ? '#170D79' : theme.colors.primary};
  font-size: 1.08em;
  padding: 0.35em 0.6em;
  border-radius: 0.8em;
  transition: all 0.22s ease;
  box-shadow: ${$active ? 'none' : '0 1px 4px rgba(34,197,94,0.04)'};
  font-weight: 500;
  position: relative;
  overflow: hidden;
  background: transparent;

  &:link, &:visited {
    color: ${$active ? '#170D79' : theme.colors.primary};
    text-decoration: none !important;
  }

  .svg-inline--fa, svg {
    font-size: 1.35em !important;
    margin-right: 0.35em !important;
    color: inherit !important;
    background: none !important;
    transition: inherit !important;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
    pointer-events: none;
  }

  &:hover, &:focus-visible {
    background: rgba(32,45,101,0.08);
    color: ${theme.colors.primary} !important;
    box-shadow: none;
    text-decoration: none !important;
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.20));
  }

  &:active {
    background: linear-gradient(90deg, transparent 0 33.333%, rgba(32,45,101,0.18) 33.333% 100%);
  }
`);

// Direct styled link for "Nová objednávka" - jednoduchá struktura
const NewOrderLink = styled(Link)`
  /* JEDNODUCHÁ struktura - link má barvu, ikona i text dědí */

  /* default: New (green) - TMAVÁ ZELENÁ BEZ GRADIENTU */
  background: #166534;
  color: #fff; /* BÍLÝ text i ikony současně */
  border-radius: 999px;
  padding: 0.25em 1.05em 0.25em 0.9em; /* sníženo top/bottom o 0.1em */
  font-size: 0.95em;
  font-weight: 600;
  box-shadow: 0 3px 10px -2px rgba(0,0,0,0.35), 0 0 0 1px rgba(22, 101, 52, 0.5) inset;
  text-decoration: none !important;

  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  line-height: 1.1;
  transition: all .25s ease;
  cursor: pointer;

  /* Ikona i text prostě dědí barvu - ŽÁDNÉ složité CSS */
  svg,
  .svg-inline--fa {
    color: inherit !important;
    fill: inherit !important;
    transition: inherit !important;
  }

  &:link, &:visited {
    color: #fff;
    text-decoration: none !important;
  }

  /* Draft variant (red/rozpracovaná) */
  &[data-status='draft'] {
    background: #dc2626;
    box-shadow: 0 3px 10px -2px rgba(220,38,38,0.55), 0 0 0 1px #b91c1c inset;
    color: #fff;

    &:link, &:visited { color: #fff; }
  }

  /* Edit variant (světlejší oranžová pro editaci) */
  &[data-status='edit'] {
    background: #ea580c;
    box-shadow: 0 3px 10px -2px rgba(234,88,12,0.55), 0 0 0 1px #dc2626 inset;
    color: #fff;

    &:link, &:visited { color: #fff; }
  }

  /* Inactive state */
  &[data-inactive='true'] {
    background: rgba(107,114,128,0.4);
    color: #0f172a;
    box-shadow: inset 0 1px 0 rgba(15,23,42,0.06);
    border: 1px solid rgba(15,23,42,0.12);
    cursor: default;

    &:link, &:visited { color: #0f172a; }
  }

  /* Hover efekt - ZLATÝ text i ikona současně */
  &:hover:not([data-inactive='true']) {
    color: #FFD700 !important;
    transform: translateY(-1px);
  }

  /* Ensure the badge acts as a single interactive element */
  &:active:not([data-inactive='true']) {
    transform: translateY(0px);
    transition: all .1s ease;
  }
`;

// Styled link pro Pokladna - modrá/finanční barva
const CashBookLink = styled(Link)`
  background: #1e40af; /* tmavě modrá */
  color: #fff;
  border-radius: 999px;
  padding: 0.25em 1.05em 0.25em 0.9em;
  font-size: 0.95em;
  font-weight: 600;
  box-shadow: 0 3px 10px -2px rgba(30,64,175,0.45), 0 0 0 1px rgba(37,99,235,0.5) inset;
  text-decoration: none !important;
  position: relative;

  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  line-height: 1.1;
  transition: all .25s ease;
  cursor: pointer;

  svg,
  .svg-inline--fa {
    color: inherit !important;
    fill: inherit !important;
    transition: inherit !important;
  }

  &:link, &:visited {
    color: #fff;
    text-decoration: none !important;
  }

  &:hover {
    color: #FFD700 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px -2px rgba(30,64,175,0.6), 0 0 0 1px rgba(59,130,246,0.7) inset;
  }

  &:active {
    transform: translateY(0px);
    transition: all .1s ease;
  }
`;

// Styled link pro Zaevidovat fakturu - stejná modrá jako na Invoices25List (#3b82f6)
const InvoiceCreateLink = styled(Link)`
  background: #3b82f6; /* světle modrá */
  color: #fff;
  border-radius: 999px;
  padding: 0.25em 1.05em 0.25em 0.9em;
  font-size: 0.95em;
  font-weight: 600;
  box-shadow: 0 3px 10px -2px rgba(59,130,246,0.45), 0 0 0 1px rgba(59,130,246,0.5) inset;
  text-decoration: none !important;
  position: relative;

  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  line-height: 1.1;
  transition: all .25s ease;
  cursor: pointer;

  svg,
  .svg-inline--fa {
    color: inherit !important;
    fill: inherit !important;
    transition: inherit !important;
  }

  &:link, &:visited {
    color: #fff;
    text-decoration: none !important;
  }

  /* Inactive state */
  &[data-inactive='true'] {
    background: rgba(107,114,128,0.4);
    color: #0f172a;
    box-shadow: inset 0 1px 0 rgba(15,23,42,0.06);
    border: 1px solid rgba(15,23,42,0.12);
    cursor: default;

    &:link, &:visited { color: #0f172a; }
  }

  &:hover:not([data-inactive='true']) {
    color: #FFD700 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px -2px rgba(59,130,246,0.6), 0 0 0 1px rgba(96,165,250,0.7) inset;
  }

  &:active:not([data-inactive='true']) {
    transform: translateY(0px);
    transition: all .1s ease;
  }
`;

// removed unused logoutButtonStyle

// Shared styles for menu icon buttons
// Logout button styled to visually match right menu links
const LogoutButton = styled.button(({theme}) => `
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none !important;
  color: ${theme.colors.primary};
  font-size: 1.08em;
  padding: 0.6em;
  border-radius: 0.8em;
  transition: all 0.22s ease;
  box-shadow: 0 1px 4px rgba(34,197,94,0.04);
  font-weight: 500;
  position: relative;
  overflow: hidden;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;

  .svg-inline--fa, svg {
    font-size: 1.35em !important;
    margin-right: 0 !important;
    color: inherit !important;
    background: none !important;
    transition: inherit !important;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
    pointer-events: none;
  }

  &:hover, &:focus-visible {
    background: rgba(32,45,101,0.08) !important;
    color: ${theme.colors.primary} !important;
    box-shadow: none;
    text-decoration: none !important;
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.20));
  }

  &:active {
    background: linear-gradient(90deg, transparent 0 33.333%, rgba(32,45,101,0.18) 33.333% 100%);
  }
`);

// Generic menu icon button for consistency
const MenuIconButton = styled.button(({theme}) => `
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none !important;
  color: ${theme.colors.primary};
  font-size: 1.08em;
  padding: 0.6em;
  border-radius: 0.8em;
  transition: all 0.22s ease;
  box-shadow: 0 1px 4px rgba(34,197,94,0.04);
  font-weight: 500;
  position: relative;
  overflow: hidden;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;

  .svg-inline--fa, svg {
    font-size: 1.35em !important;
    margin-right: 0 !important;
    color: inherit !important;
    background: none !important;
    transition: inherit !important;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
    pointer-events: none;
  }

  &:hover, &:focus-visible {
    background: rgba(32,45,101,0.08) !important;
    color: ${theme.colors.primary} !important;
    box-shadow: none;
    text-decoration: none !important;
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.20));
  }

  &:active {
    background: linear-gradient(90deg, transparent 0 33.333%, rgba(32,45,101,0.18) 33.333% 100%);
  }
`);

// Požadavek: padding 0px (jen ikona) – použito pro SUPERADMIN NOTES ikonu v menubaru
const MenuIconButtonZeroPad = styled(MenuIconButton)(() => `
  padding: 0px !important;
  width: 2.6em;
  height: 2.6em;
`);

// SUPERADMIN NOTES ikona úplně v levém rohu menubaru (mimo "pill" MenuLeft)
const MenuCornerLeft = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 48px;
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
`;

const MenuCornerButton = styled.button(({ theme }) => `
  width: 48px;
  height: 48px;
  padding: 0px !important;
  margin: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #facc15; /* sytá žlutá */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
  transition: background 0.18s ease, filter 0.18s ease;

  .svg-inline--fa, svg {
    font-size: 1.25em !important;
    margin: 0 !important;
    color: inherit !important;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
    pointer-events: none;
  }

  &:hover, &:focus-visible {
    background: rgba(32,45,101,0.08);
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.20));
    outline: none;
  }

  &:active {
    background: rgba(32,45,101,0.14);
  }
`);

// Menu icon link for profile - same styling as buttons but as a link
const MenuIconLink = styled(Link)(({theme}) => `
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none !important;
  color: ${theme.colors.primary};
  font-size: 1.08em;
  padding: 0.6em;
  border-radius: 0.8em;
  transition: all 0.22s ease;
  box-shadow: 0 1px 4px rgba(34,197,94,0.04);
  font-weight: 500;
  position: relative;
  overflow: hidden;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;

  .svg-inline--fa, svg {
    font-size: 1.35em !important;
    margin-right: 0 !important;
    color: inherit !important;
    background: none !important;
    transition: inherit !important;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
    pointer-events: none;
  }

  &:hover, &:focus-visible {
    background: rgba(32,45,101,0.08) !important;
    color: ${theme.colors.primary} !important;
    box-shadow: none;
    text-decoration: none !important;
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.20));
  }

  &:active {
    background: linear-gradient(90deg, transparent 0 33.333%, rgba(32,45,101,0.18) 33.333% 100%);
  }

  &:link, &:visited {
    color: ${theme.colors.primary};
    text-decoration: none !important;
  }
`);

// Notification button with badge
const NotificationIconButton = styled.button(({theme}) => `
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none !important;
  color: ${theme.colors.primary};
  font-size: 1.08em;
  padding: 0.6em;
  border-radius: 0.8em;
  transition: all 0.22s ease;
  box-shadow: 0 1px 4px rgba(34,197,94,0.04);
  font-weight: 500;
  position: relative;
  overflow: hidden;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;

  .svg-inline--fa, svg {
    font-size: 1.35em !important;
    margin-right: 0 !important;
    color: inherit !important;
    background: none !important;
    transition: inherit !important;
    filter: drop-shadow(0 2px 4px rgba(32,45,101,0.10));
    pointer-events: none;
  }

  &:hover, &:focus-visible {
    background: rgba(32,45,101,0.08) !important;
    color: ${theme.colors.primary} !important;
    box-shadow: none;
    text-decoration: none !important;
    filter: drop-shadow(0 2px 6px rgba(32,45,101,0.20));
  }

  &:active {
    background: linear-gradient(90deg, transparent 0 33.333%, rgba(32,45,101,0.18) 33.333% 100%);
  }
`);

const NotificationBadge = styled.span`
  position: absolute;
  top: 0.2em;
  right: 0.2em;
  background: ${(props) => {
    // Barvy badge podle priority notifikací
    const color = props.$badgeColor || 'gray';
    switch (color) {
      case 'red':
        return '#dc2626'; // Urgent/EXCEPTIONAL/APPROVAL (nejvyšší priorita)
      case 'blue':
        return '#3b82f6'; // Komentáře
      case 'green':
        return '#22c55e'; // Objednávky
      case 'orange':
        return '#f97316'; // Méně důležité notifikace
      case 'gray':
      default:
        return '#6b7280'; // Žádné notifikace
    }
  }};
  color: white;
  font-size: 0.65em;
  font-weight: 600;
  padding: 0.15em 0.35em;
  border-radius: 0.8em;
  min-width: 1.2em;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  pointer-events: none;
  line-height: 1.2;
  
  /* Smooth animation při změně barvy */
  transition: background 0.3s ease;
`;
const MenuBar = styled.nav`
  position: fixed;
  top: var(--app-header-height, 96px); /* nav přímo navázán na aktuální výšku headeru */
  left: 0;
  right: 0;
  height: 48px;
  background-color: ${({theme})=>theme.colors.surfaceLight};
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  z-index: 90; /* under header (100) but above content */
  padding-left: 40px;
  padding-right: 40px;
  width:100%;
  box-sizing:border-box;
  overflow-x:hidden;
  overflow-y:hidden; /* skryj případný vnitřní scroll */
`;

const Content = styled.main(({ theme, $formView, $unauth }) => {
  if ($unauth) {
    return `
      position: relative;
      top: auto;
      left: 0;
      right: 0;
      bottom: auto;
      min-height:100vh;
      padding: 2.5rem 1.25rem 3rem;
      background:${theme.colors.surfaceAlt};
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      overflow:visible;
    `;
  }
  return `
    position: fixed;
    --_safe-offset: calc(var(--app-fixed-offset) + 1px);
    top: var(--app-fixed-offset-actual, var(--app-fixed-offset-safe, var(--_safe-offset)));
    left: 0;
    right: 0;
    bottom: var(--app-footer-height, 54px);
    overflow-y: ${$formView ? 'auto' : 'visible'};
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 1em 0 0 0;
    background: ${$formView ? theme.colors.gray100 : theme.colors.surfaceAlt};
    display:flex;
    flex-direction:column;
    z-index: 10;
  `;
});
const Footer = styled.footer`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  min-height: 54px;
  padding: 0;
  background-color: ${props => props.$transparent ? 'rgba(244, 244, 244, 0.6)' : '#f4f4f4'};
  backdrop-filter: ${props => props.$transparent ? 'blur(12px)' : 'none'};
  color: #666;
  font-size: 13px;
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  border-top: ${props => props.$transparent ? '1px solid rgba(204, 204, 204, 0.3)' : '1px solid #ccc'};
  z-index: 100;
`;

const FooterLeft = styled.div`
  width: 20%;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    display: none;
  }
`;

const FooterCenter = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  z-index: 1;

  & > * {
    pointer-events: auto;
  }
`;
// (RSS logic is defined inside Layout component to respect Hooks rules)

// Paleta barev pro poznámky
const NOTES_COLOR_PALETTE = [
  '#fef9c3', '#fde68a', '#facc15', '#f59e0b', '#d97706',
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8',
  '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4338ca',
  '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#be123c',
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#15803d',
  '#f5f5f5', '#e2e8f0', '#94a3b8', '#64748b', '#334155'
];
// Moved panel specific styled components into floating/ modules
// const AddTaskForm removed (now in TodoPanel)
const TaskInput = styled.input`
  flex:1; border:1px solid #93c5fd; background:#f0f8ff; color:#0f172a; padding:.5rem .65rem; border-radius:6px; font-size:.725rem; outline:none; transition:border-color .18s, box-shadow .18s, background .18s; font-weight:500;
  &::placeholder { color:#1e3a8a; opacity:.55; }
  &:focus{border-color:#60a5fa; box-shadow:0 0 0 2px rgba(96,165,250,0.35); background:#ffffff;}
`;

const DebugPanel = styled.div`
  position: fixed;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(2px);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0.5rem 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #facc15;
  font-size: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  max-width: 95vw;
  max-height: 90vh;
`;
const DebugPanelHeader = styled.div`
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:0.5rem;
  font-weight:600;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;
const DebugScroll = styled.div`
  flex:1;
  overflow:auto;
  padding:0.25rem 0.25rem 0.5rem;
  border:1px solid #333;
  border-radius:4px;
  background:#0d0d0d;
  font-family: "JetBrains Mono", Menlo, monospace;
  line-height:1.3;
  scrollbar-width: thin; scrollbar-color:#555 #0d0d0d;
  &::-webkit-scrollbar { width:11px; }
  &::-webkit-scrollbar-track { background:#0d0d0d; }
  &::-webkit-scrollbar-thumb { background:#333; border-radius:6px; border:2px solid #0d0d0d; }
  &::-webkit-scrollbar-thumb:hover { background:#444; }
`;
// Notifications scroll wrapper
const NotificationsScroll = styled.div`
  flex:1; overflow:auto; display:flex; flex-direction:column; gap:.4rem; border:1px solid #334155; border-radius:6px; padding:.45rem; background:#0f172a;
  scrollbar-width: thin; scrollbar-color:#475569 #0f172a;
  &::-webkit-scrollbar { width:10px; }
  &::-webkit-scrollbar-track { background:#0f172a; border-radius:6px; }
  &::-webkit-scrollbar-thumb { background:#334155; border-radius:6px; border:2px solid #0f172a; }
  &::-webkit-scrollbar-thumb:hover { background:#475569; }
`;
const LogBlock = styled.pre`
  margin:0;
  padding:0.25rem 0.4rem 0.4rem;
  background:#111;
  border-left:3px solid #4b5563;
  white-space:pre-wrap;
  word-break:break-word;
`;

// ---- Restored styled components (missing after refactors) ----
const GlobalProgressWrapper = styled.div`
  position: fixed; top:0; left:0; right:0; height:5px; background:#e0e0e0; z-index:1200; pointer-events:none;
  opacity:${p=>p.$hiding?0:1}; transition:opacity 350ms ease;`;
const GlobalProgressBar = styled.div`
  height:100%; background:linear-gradient(90deg,#2e7d32,#4caf50 40%,#66bb6a); box-shadow:0 0 4px rgba(0,0,0,0.25),0 0 6px rgba(76,175,80,0.55); width:0%; transition:width .25s ease;`;
const GlobalAddBtn = styled(Link)`
  width:46px; height:46px; border-radius:50%; background:#166534; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.4em; text-decoration:none; box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 1px rgba(22, 101, 52, 0.5) inset; cursor:pointer; opacity:.35; transition:opacity .22s ease, transform .22s ease, background .22s ease; .svg-inline--fa{color:#fff !important; filter:none !important;} &:hover,&:focus-visible{opacity:.92; outline:none;} &:active{transform:scale(.9);} &[data-status='draft']{ background:#dc2626; box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 1px rgba(185, 28, 28, 0.65) inset; } &[data-status='edit']{ background:#ea580c; box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 1px rgba(234,88,12,0.65) inset; }`;

const GlobalInvoiceBtn = styled(Link)`
  position:relative; width:46px; height:46px; border-radius:50%; background:#3b82f6; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.4em; text-decoration:none; box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 1px rgba(59, 130, 246, 0.5) inset; cursor:pointer; opacity:.35; transition:opacity .22s ease, transform .22s ease, background .22s ease; 
  .svg-inline--fa{color:#fff !important; filter:none !important;} 
  &:hover:not([data-inactive='true']),&:focus-visible:not([data-inactive='true']){opacity:.92; outline:none;} 
  &:active:not([data-inactive='true']){transform:scale(.9);} 
  &[data-inactive='true']{ background:#94a3b8; cursor:default; opacity:.25; pointer-events:none; }`;

const GlobalCashBookBtn = styled(Link)`
  position:relative; width:46px; height:46px; border-radius:50%; background:#1e40af; color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.4em; text-decoration:none; box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 1px rgba(30, 64, 175, 0.5) inset; cursor:pointer; opacity:.35; transition:opacity .22s ease, transform .22s ease, background .22s ease; 
  .svg-inline--fa{color:#fff !important; filter:none !important;} 
  &:hover:not([data-inactive='true']),&:focus-visible:not([data-inactive='true']){opacity:.92; outline:none;} 
  &:active:not([data-inactive='true']){transform:scale(.9);} 
  &[data-inactive='true']{ background:#94a3b8; cursor:default; opacity:.25; pointer-events:none; }`;

const DebugDockWrapper = styled.div`position:fixed; left:.75rem; bottom:.75rem; z-index:4000; font-family:monospace; display:flex; flex-direction:column; gap:.55rem;`;
const DebugToggleBtn = styled.button`
  background:#000; color:#fbbf24; border:1px solid #fbbf24; border-radius:50%; width:46px; height:46px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.08) inset; opacity:.40; transition:opacity .25s ease, transform .25s ease, background .25s ease; backdrop-filter:blur(2px); &:hover,&:focus-visible{opacity:.95; outline:none;} &:active{transform:scale(.9);} `;
const RoundFab = styled.button`
  width:46px; height:46px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.25em; color:#fff; background:#475569; box-shadow:0 4px 14px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.07) inset; opacity:.35; transition:opacity .22s ease, transform .22s ease, background .22s ease; &:hover,&:focus-visible{opacity:.92; outline:none;} &:active{transform:scale(.9);} `;
const FabGroup = styled.div`position:fixed; right:.75rem; bottom:.75rem; display:flex; flex-direction:row; gap:.55rem; z-index:4000; align-items:center;`;

const SmallIconBtn = styled.button`
  background:${({theme})=>theme.colors.darkBg};
  border:1px solid ${({theme})=>theme.colors.darkBorder};
  color:#f8fafc;
  padding:0.25rem 0.45rem;
  border-radius:4px;
  font-size:0.65rem;
  text-transform:uppercase;
  letter-spacing:0.5px;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:0.35rem;
  &:hover { background:${({theme})=>theme.colors.darkBorder}; }
`;

// Jemnější nadpis v hlavicce – sjednocení s formulářem (menší, netučný) a bez defaultního <h1> 2em
const HeaderTitle = styled.h1`
  margin: 0 0 0.25rem 0;
  /* Plně řízeno přes CSS proměnné – žádné lokální odchylky */
  font-size: var(--app-header-title-size, 1.75rem);
  font-weight: var(--app-header-title-weight, 600);
  line-height: 1.10;
  letter-spacing: 0.4px;
  color: rgba(255,255,255,0.92);
  font-family: var(--app-font-family, 'Inter', 'Arial', sans-serif);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
`;

// Notification Bell Wrapper - 100% BACKEND API
// VŠE načítá z backend API - žádné lokální TODO alarmy!
// Hover = zobrazí dropdown, Click = přejde na stránku /notifications
const NotificationBellWrapper = ({ userId }) => {
  const bgTasks = useBgTasksContext();
  const navigate = useNavigate();
  const { userDetail } = useContext(AuthContext);

  // ✅ POUZE backend unread count a badge color (z BackgroundTasksContext)
  const unreadCount = bgTasks?.unreadNotificationsCount || 0;
  const badgeColor = bgTasks?.notificationsBadgeColor || 'gray';


  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // ✅ Načtení notifikací POUZE z backend API
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { getNotificationsList } = require('../services/notificationsApi');

      const result = await getNotificationsList({
        limit: 20,
        unread_only: false,
        include_dismissed: false  // ← Pro dropdown NECHCEME skryté notifikace
      });

      const apiNotifications = result.data || [];
      
      // 🔄 AUTO-REFRESH: Detekuj nové nepřečtené notifikace o změně stavu objednávky
      // a triggeruj auto-refresh v Orders25List
      const newUnreadOrderNotifications = apiNotifications.filter(n => {
        const isUnread = !n.precteno || n.precteno === 0;
        const isOrderStatusChange = n.type && n.type.startsWith('order_status_');
        const hasOrderId = n.order_id && n.order_id > 0;
        return isUnread && isOrderStatusChange && hasOrderId;
      });

      // Pokud jsou nové nepřečtené notifikace o objednávkách, vyšli event
      if (newUnreadOrderNotifications.length > 0) {
        newUnreadOrderNotifications.forEach(notification => {
          window.dispatchEvent(new CustomEvent('orderStatusChanged', {
            detail: {
              orderId: notification.order_id,
              orderNumber: notification.order_number,
              notificationType: notification.typ,
              timestamp: new Date().toISOString()
            }
          }));
        });
      }
      
      setNotifications(apiNotifications);
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Click handler na zvoneček - toggle dropdown
  const handleBellClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle dropdown
    if (dropdownVisible) {
      // Zavři dropdown
      setDropdownVisible(false);
    } else {
      // Otevři dropdown - nejdříve načti data
      await loadNotifications();
      setDropdownVisible(true);
    }
  };

  // Handlers pro akce v dropdownu
  const handleNotificationClick = async (notification) => {
    // Označit jako přečtenou pokud není
    const isUnread = !notification.precteno || notification.precteno === 0;
    if (isUnread) {
      await handleMarkAsRead(notification.id);
    }

    // Navigace podle typu
    try {

      let data = {};

      // Parse data_json
      if (notification.data_json) {
        if (typeof notification.data_json === 'string') {
          try {
            data = JSON.parse(notification.data_json);
          } catch (e) {
          }
        } else {
          data = notification.data_json;
        }
      } else if (notification.data) {
        data = notification.data;
      }
      // � FALLBACK: Pokud má starý formát (id + mode), převeď na order_id
      if (!data.order_id && data.id) {
        data.order_id = data.id;
      }

      if (notification.typ?.includes('order') && data.order_id) {
        const targetOrderId = parseInt(data.order_id);
        const user_id = userDetail?.user_id;

        // 🎯 PŘESNĚ STEJNÝ KÓD JAKO V Orders25List.js - handleEdit()
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
            setDropdownVisible(false);
            return;
          }

          // 🎯 Pokud existuje draft pro JINOU objednávku, zobraz confirm dialog
          if (shouldShowConfirmDialog && draftDataToStore) {
            const formData = draftDataToStore.formData || draftDataToStore;
            const draftTitle = formData.ev_cislo || formData.cislo_objednavky || formData.predmet || '★ KONCEPT ★';
            const hasNewConcept = isValidConcept(draftDataToStore);

            const confirmResult = window.confirm(
              `⚠️ POZOR - Máte rozpracovanou ${hasNewConcept ? 'novou objednávku' : 'editaci objednávky'} "${draftTitle}" s neuloženými změnami.\n\n` +
              `Přepnutím na jinou objednávku přijdete o neuložené změny!\n\n` +
              `Chcete pokračovat a zahodit neuložené změny?`
            );

            if (!confirmResult) {
              // Uživatel zrušil - nezavírej dropdown, zůstaneme kde jsme
              return;
            }

            // Uživatel potvrdil - vyčisti koncept a pokračuj
            await draftManager.deleteDraft();
          }
        }

        // ✅ Navigace
        navigate(`/order-form-25?edit=${data.order_id}`);
        setDropdownVisible(false);
      } else if (notification.typ?.includes('alarm_todo') && data.order_id) {
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
            setDropdownVisible(false);
            return;
          }

          if (shouldShowConfirmDialog && draftDataToStore) {
            const formData = draftDataToStore.formData || draftDataToStore;
            const draftTitle = formData.ev_cislo || formData.cislo_objednavky || formData.predmet || '★ KONCEPT ★';
            const hasNewConcept = isValidConcept(draftDataToStore);

            const confirmResult = window.confirm(
              `⚠️ POZOR - Máte rozpracovanou ${hasNewConcept ? 'novou objednávku' : 'editaci objednávky'} "${draftTitle}" s neuloženými změnami.\n\n` +
              `Přepnutím na jinou objednávku přijdete o neuložené změny!\n\n` +
              `Chcete pokračovat a zahodit neuložené změny?`
            );

            if (!confirmResult) {
              return;
            }

            await draftManager.deleteDraft();
          }
        }

        navigate(`/order-form-25?edit=${data.order_id}`);
        setDropdownVisible(false);
      }
    } catch (error) {
    }

    setDropdownVisible(false);
  };

  const handleMarkAsRead = async (notificationId) => {

    try {
      const { markNotificationAsRead } = require('../services/notificationsApi');
      await markNotificationAsRead(notificationId);

      // Aktualizuj lokální stav - použij 'precteno' místo 'is_read'
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, precteno: 1, is_read: 1 } : n)
      );

      // Aktualizuj badge
      if (bgTasks?.handleUnreadCountChange) {
        const currentCount = bgTasks.unreadNotificationsCount || 0;
        if (currentCount > 0) {
          bgTasks.handleUnreadCountChange(currentCount - 1);
        }
      }
    } catch (error) {
    }
  };

  const handleMarkAllRead = async () => {

    try {
      const { markAllNotificationsAsRead } = require('../services/notificationsApi');
      await markAllNotificationsAsRead();

      // Aktualizuj všechny jako přečtené - použij 'precteno' místo 'is_read'
      setNotifications(prev =>
        prev.map(n => ({ ...n, precteno: 1, is_read: 1 }))
      );

      // Aktualizuj badge na 0
      if (bgTasks?.handleUnreadCountChange) {
        bgTasks.handleUnreadCountChange(0);
      }
    } catch (error) {
    }
  };

  const handleDismiss = async (notificationId) => {
    try {
      const { dismissNotification } = require('../services/notificationsApi');

      // ✅ Skryj v backendu (is_dismissed = 1)
      await dismissNotification(notificationId);

      // Odstraň z lokálního stavu dropdownu
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
    }
  };

  const handleDismissAll = async () => {
    try {
      const { dismissAllNotifications } = require('../services/notificationsApi');

      // ✅ Skryj všechny v backendu (is_dismissed = 1)
      await dismissAllNotifications();

      // Vyčisti lokální stav dropdownu
      setNotifications([]);

      // Aktualizuj badge na 0
      if (bgTasks?.handleUnreadCountChange) {
        bgTasks.handleUnreadCountChange(0);
      }
    } catch (error) {
      // Znovu načti pro sync
      await loadNotifications();
    }
  };

  const handleViewAllClick = () => {
    setDropdownVisible(false);
    navigate('/notifications');
  };

  return (
    <SmartTooltip
      text={unreadCount > 0
        ? `Máte ${unreadCount} ${unreadCount === 1 ? 'nepřečtenou notifikaci' : unreadCount < 5 ? 'nepřečtené notifikace' : 'nepřečtených notifikací'}`
        : 'Žádné nové notifikace'}
      icon={unreadCount > 0 ? 'warning' : 'info'}
      preferredPosition="bottom"
    >
      <div
        ref={containerRef}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        <NotificationIconButton
          ref={buttonRef}
          title=""
          data-bell-pulse={unreadCount > 0 ? '1' : '0'}
          style={{ cursor: 'pointer' }}
          onClick={handleBellClick}
          onMouseDown={(e) => e.preventDefault()}
        >
          <FontAwesomeIcon icon={faBell} />
          {/* 🎯 Skryj bulinu když je dropdown otevřený */}
          {unreadCount > 0 && !dropdownVisible && (
            <NotificationBadge $badgeColor={badgeColor}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </NotificationBadge>
          )}
        </NotificationIconButton>

        {dropdownVisible && (
          <div
            style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          >
            <NotificationDropdown
              ref={dropdownRef}
              anchorRef={buttonRef}
              visible={dropdownVisible}
              onClose={() => setDropdownVisible(false)}
              notifications={notifications}
              unreadCount={unreadCount}
              badgeColor={badgeColor}
              onNotificationClick={handleNotificationClick}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllRead={handleMarkAllRead}
              onDismiss={handleDismiss}
              onDismissAll={handleDismissAll}
              onViewAllClick={handleViewAllClick}
              loading={loading}
            />
          </div>
        )}
      </div>
    </SmartTooltip>
  );
};

const Layout = ({ children }) => {
  // ✅ NOVÉ: Activity tracking - automaticky sleduje route změny
  useActivityTracking();

  // RSS vtipy: kompletně odstraněno (na žádost uživatele)

  // State pro submenu - Administrace
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);
  const adminButtonRef = useRef(null);
  const [adminDropdownPosition, setAdminDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // State pro submenu - Manažerské analýzy
  const [analyticsMenuOpen, setAnalyticsMenuOpen] = useState(false);
  const analyticsMenuRef = useRef(null);
  const analyticsButtonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // State pro submenu - BETA funkce
  const [betaMenuOpen, setBetaMenuOpen] = useState(false);
  const betaMenuRef = useRef(null);
  const betaButtonRef = useRef(null);
  const [betaDropdownPosition, setBetaDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // State pro submenu - Přehled (dynamické menu)
  const [prehledMenuOpen, setPrehledMenuOpen] = useState(false);
  const prehledMenuRef = useRef(null);
  const prehledButtonRef = useRef(null);
  const [prehledDropdownPosition, setPrehledDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // State pro detekci přetečení menu
  const menuLeftRef = useRef(null);
  
  // State pro název databáze (načte se z API)
  const [databaseName, setDatabaseName] = useState(null);
  
  // State pro systémové informace z API
  const [systemInfo, setSystemInfo] = useState(null);
  
  // State pro maintenance mode indikátor
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  
  // State pro module visibility settings
  const [moduleSettings, setModuleSettings] = useState({
    module_orders_visible: true,
    module_orders_v3_visible: false,
    module_invoices_visible: true,
    module_annual_fees_visible: true
  });

  // Pozice dropdownu pro Administrace se počítá synchronně v onClick handleru

  // Pozice dropdownu pro Manažerské analýzy se počítá synchronně v onClick handleru

  // Zavřít submenu při kliku mimo - Administrace
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target) &&
          adminButtonRef.current && !adminButtonRef.current.contains(event.target)) {
        setAdminMenuOpen(false);
      }
    };
    
    if (adminMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [adminMenuOpen]);

  // Zavřít submenu při kliku mimo - Manažerské analýzy
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (analyticsMenuRef.current && !analyticsMenuRef.current.contains(event.target) &&
          analyticsButtonRef.current && !analyticsButtonRef.current.contains(event.target)) {
        setAnalyticsMenuOpen(false);
      }
    };
    
    if (analyticsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [analyticsMenuOpen]);

  // Zavřít submenu při kliku mimo - BETA
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (betaMenuRef.current && !betaMenuRef.current.contains(event.target) &&
          betaButtonRef.current && !betaButtonRef.current.contains(event.target)) {
        setBetaMenuOpen(false);
      }
    };
    
    if (betaMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [betaMenuOpen]);

  // Zavřít submenu při kliku mimo - Přehled
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (prehledMenuRef.current && !prehledMenuRef.current.contains(event.target) &&
          prehledButtonRef.current && !prehledButtonRef.current.contains(event.target)) {
        setPrehledMenuOpen(false);
      }
    };
    
    if (prehledMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [prehledMenuOpen]);

  // State pro blikací efekt a aktuální databázi
  const [dbSourceBlinking, setDbSourceBlinking] = useState(false);
  const [selectedDbSource, setSelectedDbSource] = useState(() => {
    try {
      return localStorage.getItem('orders_dbSource') || process.env.REACT_APP_DB_ORDER_KEY || 'objednavky0123';
    } catch {
      return process.env.REACT_APP_DB_ORDER_KEY || 'objednavky0123';
    }
  });

  // Funkce pro mapování tabulky objednávek na tabulku příloh
  const getAttachmentTableName = (orderTableName) => {
    if (orderTableName === 'objednavky') return 'pripojene_dokumenty';
    const match = orderTableName.match(/^objednavky(\d+.*)$/);
    if (match) return `pripojene_odokumenty${match[1]}`;
    return 'pripojene_odokumenty0123';
  };

  // Poslouchej změny v localStorage (při změně v Orders.js)
  useEffect(() => {
    const checkStorage = () => {
      try {
        const stored = localStorage.getItem('orders_dbSource');
        if (!stored) return;

        if (stored !== selectedDbSource) {
          // Aktualizuj state
          setSelectedDbSource(stored);

          // Trigger blikání (vlnový efekt - délka podle délky textu)
          setDbSourceBlinking(true);
          const attachmentName = getAttachmentTableName(stored);
          const maxTextLength = Math.max(stored.length, attachmentName.length);
          const animDuration = Math.max(800, maxTextLength * 80); // 80ms per character, min 800ms
          setTimeout(() => setDbSourceBlinking(false), animDuration);
        }
      } catch (err) {
      }
    };

    // Polling pro změny v rámci stejného tabu
    const interval = setInterval(checkStorage, 300);

    return () => clearInterval(interval);
  }, [selectedDbSource]);

  const { isLoggedIn, logout, fullName, user_id, userDetail, hasPermission, hasAdminRole, user, token, username, hierarchyStatus, expandedPermissions } = useContext(AuthContext); // Přidán user_id pro filtrování draftu a hierarchyStatus
  const toastCtx = useContext(ToastContext);
  const showToast = (msg, opts) => { try { toastCtx?.showToast?.(msg, opts); } catch {} };
  // Change password dialog state (menu)
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const { progress, active, failed, transitionMs, visible, hiding, reset: resetProgress } = useContext(ProgressContext) || { progress: 0, active: false, failed: false, transitionMs: 250, visible:false, hiding:false, reset: () => {} };
  const { debugMessage, logEntries, clearDebug, addDebugEntry } = useContext(DebugContext); // Use DebugContext
  // Floating panels consolidated in custom hook
  const panels = useFloatingPanels(user_id, isLoggedIn, token, user?.username);
  const {
    todoOpen, setTodoOpen, notesOpen, setNotesOpen, notifOpen, setNotifOpen, chatOpen, setChatOpen,
    todoFont, notesFont, notifFont, chatFont, adjTodo, adjNotes, adjNotif, adjChat,
    tasks, newTask, setNewTask, addTask, toggleTask, removeTask, reorderTasks, updateTaskAlarm, updateTaskPriority, clearDone,
  clearAllTasks, importTasks,
    notesText, setNotesText, transcriptionText, setTranscriptionText, notesRef, showNotesColors, setShowNotesColors, clearAllNotes,
  notifications, setNotifications, openNotifications, clearNotifications, markAllRead, unreadCount,
    chatMessages, setChatMessages, newChatMessage, setNewChatMessage, openChat, addChatMessage, markChatMessagesRead, clearChatMessages, unreadChatCount,
    todoPanelState, notesPanelState, notifPanelState, chatPanelState, beginPanelDrag, bringPanelFront, panelZ
  } = panels;
  const { flushNotesSave, flushTasksSave, notesSaving, notesLastSaved, notesSaveError, serverSyncStatus, manualServerSync, hasServerAPI, autoSaveStatus, manualSaveNotes, manualSaveTodo, refreshFromServer, formatTime, minimizePanel, maximizePanel, restorePanel } = panels; // extract flush helpers + status + server sync + window controls

  // Financial Calculator state
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorPosition, setCalculatorPosition] = useState({ x: 100, y: 100 });
  const [calculatorActive, setCalculatorActive] = useState(false);
  const [calculatorLastResult, setCalculatorLastResult] = useState(null);
  const [calculatorLastExpression, setCalculatorLastExpression] = useState(null);

  // 🌲 HIERARCHIE: Použít data z AuthContext
  const hierarchyInfo = useMemo(() => {
    if (!hierarchyStatus || !hierarchyStatus.hierarchyEnabled || !hierarchyStatus.profileId) {
      return { enabled: false };
    }
    
    return {
      profileId: hierarchyStatus.profileId,
      enabled: true,
      isImmune: hierarchyStatus.isImmune || false
    };
  }, [hierarchyStatus]);
  
  // Check if user is ADMINI (not ADMINISTRATOR or SUPERADMIN)
  const isAdmini = useMemo(() => {
    return userDetail?.roles?.some(role => role.kod_role === 'ADMINI') || false;
  }, [userDetail]);

  // SUPERADMIN (má automaticky sticky NOTES tabuli)
  const isSuperAdmin = useMemo(() => {
    return userDetail?.roles?.some(role => role.kod_role === 'SUPERADMIN') || false;
  }, [userDetail]);

  // Sticky NOTES právo (SUPERADMIN nebo explicitní STICKY_MANAGE)
  const canUseStickyNotes = useMemo(() => {
    if (!isLoggedIn) return false;
    if (isSuperAdmin) return true;
    if (typeof hasPermission === 'function') return !!hasPermission('STICKY_MANAGE');
    return false;
  }, [isLoggedIn, isSuperAdmin, hasPermission]);

  // Fullscreen sticky NOTES overlay
  const [stickyNotesOpen, setStickyNotesOpen] = useState(false);

  // Hotkey: Win/Cmd + N → sticky NOTES (dle oprávnění)
  useEffect(() => {
    if (!isLoggedIn || !canUseStickyNotes) return;

    const onKeyDown = (e) => {
      try {
        // Nech psaní do formulářů (aby to nerušilo)
        const t = e.target;
        const tag = t?.tagName;
        const isTypingTarget = (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          t?.isContentEditable
        );
        if (isTypingTarget) return;

        // Meta/Win/Cmd + N
        if (e.metaKey && !e.shiftKey && !e.altKey && !e.ctrlKey && e.key?.toLowerCase?.() === 'n') {
          e.preventDefault();
          setStickyNotesOpen((v) => !v);
        }
      } catch {
        // ignore
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isLoggedIn, canUseStickyNotes]);

  // Pokud uživatel nemá oprávnění / není přihlášen, overlay vždy zavřít
  useEffect(() => {
    if (!isLoggedIn || !canUseStickyNotes) {
      setStickyNotesOpen(false);
    }
  }, [isLoggedIn, canUseStickyNotes]);

  // Check if user has all three permissions (Invoices + Orders + Annual Fees)
  // These users should also get dropdown menu to save space
  const hasAllThreePermissions = useMemo(() => {
    if (!hasPermission) return false;
    
    const hasInvoices = hasPermission('INVOICE_VIEW') || hasPermission('INVOICE_EDIT') || hasPermission('INVOICE_MANAGE');
    const hasOrders = hasPermission('ORDER_VIEW') || hasPermission('ORDER_EDIT') || hasPermission('ORDER_MANAGE') || hasPermission('ORDER_2025') || hasPermission('ORDER_OLD');
    const hasAnnualFees = hasPermission('ANNUAL_FEES_VIEW') || hasPermission('ANNUAL_FEES_EDIT') || hasPermission('ANNUAL_FEES_MANAGE');
    
    return hasInvoices && hasOrders && hasAnnualFees;
  }, [hasPermission, userDetail]);

  const hasAnalyticsPermission = useMemo(() => {
    if (!hasPermission) return false;

    return (
      hasPermission('REPORT_VIEW') || hasPermission('REPORT_MANAGE') || hasPermission('REPORT_EXPORT') ||
      hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_MANAGE') || hasPermission('STATISTICS_EXPORT')
    );
  }, [hasPermission]);

  const hasAnalyticsManagePermission = useMemo(() => {
    if (!hasPermission) return false;

    return (
      (typeof hasAdminRole === 'function' && hasAdminRole()) ||
      hasPermission('REPORT_VIEW') || hasPermission('REPORT_EDIT') || hasPermission('REPORT_MANAGE') ||
      hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_EDIT') || hasPermission('STATISTICS_MANAGE') ||
      hasPermission('FIN_CONTROL_VIEW') || hasPermission('FIN_CONTROL_EDIT') || hasPermission('FIN_CONTROL_MANAGE') ||
      hasPermission('EDUCATION_VIEW') || hasPermission('EDUCATION_EDIT') || hasPermission('EDUCATION_MANAGE') ||
      hasPermission('ATTACHMENTS_VIEW') || hasPermission('ATTACHMENTS_MANAGE') ||
      hasPermission('PIVOT_VIEW') || hasPermission('PIVOT_EDIT') || hasPermission('PIVOT_MANAGE') ||
      hasPermission('SPENDING_VIEW_ALL') || hasPermission('SPENDING_VIEW_OWN') || hasPermission('SPENDING_MANAGE')
    );
  }, [hasPermission, hasAdminRole]);

  const hasAssetMenuAccess = useMemo(() => {
    if (!hasPermission) return false;
    return (
      (typeof hasAdminRole === 'function' && hasAdminRole()) ||
      hasPermission('ASSET_VIEW') || hasPermission('ASSET_MANAGE') || hasPermission('ASSET_EXPORT')
    );
  }, [hasPermission, hasAdminRole]);

  const hasBetaMenuAccess = useMemo(() => {
    return (
      (typeof hasAdminRole === 'function' && hasAdminRole()) ||
      (typeof hasPermission === 'function' && hasPermission('BETA_TESTER'))
    );
  }, [hasAdminRole, hasPermission]);

  const [hasAssignedCashbook, setHasAssignedCashbook] = useState(false);

  const isCashBookAdminOrManage = useMemo(() => {
    return (
      (typeof hasAdminRole === 'function' && hasAdminRole()) ||
      (typeof hasPermission === 'function' && hasPermission('CASH_BOOK_MANAGE'))
    );
  }, [hasAdminRole, hasPermission]);

  const hasAnyCashBookPermission = useMemo(() => {
    if (typeof hasPermission !== 'function') return false;

    return (
      hasPermission('CASH_BOOK_MANAGE') ||
      hasPermission('CASH_BOOK_READ_ALL') ||
      hasPermission('CASH_BOOK_READ_OWN') ||
      hasPermission('CASH_BOOK_EDIT_ALL') ||
      hasPermission('CASH_BOOK_EDIT_OWN') ||
      hasPermission('CASH_BOOK_DELETE_ALL') ||
      hasPermission('CASH_BOOK_DELETE_OWN') ||
      hasPermission('CASH_BOOK_EXPORT_ALL') ||
      hasPermission('CASH_BOOK_EXPORT_OWN') ||
      hasPermission('CASH_BOOK_CREATE')
    );
  }, [hasPermission]);

  useEffect(() => {
    let cancelled = false;

    const loadCashbookAssignment = async () => {
      if (!isLoggedIn || !user_id || !hasAnyCashBookPermission) {
        if (!cancelled) setHasAssignedCashbook(false);
        return;
      }

      // Admin/MANAGE se neomezují přiřazením pokladny
      if (isCashBookAdminOrManage) {
        if (!cancelled) setHasAssignedCashbook(true);
        return;
      }

      try {
        const response = await cashbookAPI.listAssignments(user_id, true);
        const assignments = Array.isArray(response?.data?.assignments)
          ? response.data.assignments
          : Array.isArray(response?.assignments)
            ? response.assignments
            : [];

        const hasAnyActiveAssignment = assignments.some((a) => String(a?.aktivni ?? '1') === '1');
        if (!cancelled) setHasAssignedCashbook(hasAnyActiveAssignment);
      } catch (e) {
        if (!cancelled) setHasAssignedCashbook(false);
      }
    };

    loadCashbookAssignment();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user_id, hasAnyCashBookPermission, isCashBookAdminOrManage]);

  const showCashBookButton = isCashBookAdminOrManage || (hasAnyCashBookPermission && hasAssignedCashbook);

  const canAccessCerpani = useMemo(() => {
    if (!isLoggedIn) return false;

    const perms = Array.isArray(expandedPermissions)
      ? expandedPermissions.map((p) => String(p || '').toUpperCase())
      : [];

    const hasLpToken = (perm) => /(^|_)LP(_|$)/.test(perm);

    const isAdminOrManage =
      (typeof hasAdminRole === 'function' && hasAdminRole()) ||
      (typeof hasPermission === 'function' && (
        hasPermission('SPEDNIG_MANAGE') ||
        hasPermission('SPNDING_MANAGE') ||
        hasPermission('SPENDING_MANAGE') ||
        hasPermission('LP_MANAGE') ||
        hasPermission('CONTRACT_MANAGE')
      ));

    if (isAdminOrManage) return true;

    return perms.some((perm) => {
      const isViewScope = perm.endsWith('_VIEW_ALL') || perm.endsWith('_VIEW_OWN') || perm.endsWith('_VIEW');
      if (!isViewScope) return false;
      return (
        perm === 'SPEDNIG_VIEW_ALL' ||
        perm === 'SPNDING_VIEW_ALL' ||
        perm === 'SPEDNING_VIEW_ALL' ||
        perm === 'SPENDING_VIEW_ALL' ||
        perm === 'SPEDNIG_VIEW_OWN' ||
        perm === 'SPNDING_VIEW_OWN' ||
        perm === 'SPEDNING_VIEW_OWN' ||
        perm === 'SPENDING_VIEW_OWN' ||
        perm === 'SPEDNIG_VIEW' ||
        perm === 'SPNDING_VIEW' ||
        perm === 'SPEDNING_VIEW' ||
        perm === 'SPENDING_VIEW' ||
        perm === 'CERPANI_VIEW_ALL' ||
        perm === 'CERPANI_VIEW_OWN' ||
        perm === 'CERPANI_VIEW' ||
        perm.includes('SMLOUV') ||
        perm.includes('CONTRACT') ||
        hasLpToken(perm) ||
        perm.includes('LIMIT') ||
        perm.includes('PRISLIB')
      );
    });
  }, [isLoggedIn, expandedPermissions, hasAdminRole, hasPermission]);

  // Notes recording state (pro floating button)
  const [notesRecording, setNotesRecording] = useState(false);

  // Tool icons visibility from user settings - with dynamic reload
  const [toolsVisibilityKey, setToolsVisibilityKey] = useState(0);
  
  // useMemo aby se nepřepočítávalo při každém renderu (jen když se změní user_id nebo toolsVisibilityKey)
  const toolsVisibility = useMemo(() => {
    try {
      return getToolsVisibility(user_id);
    } catch (e) {
      console.warn('Chyba při načítání viditelnosti nástrojů:', e);
      // Fallback: všechny nástroje viditelné
      return { notes: true, todo: true, chat: true, kalkulacka: true };
    }
  }, [user_id, toolsVisibilityKey]); // Re-calculate only when user_id or toolsVisibilityKey changes

  // Fetch system info from API (database, environment, etc.)
  useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        const info = await SystemInfoService.getSystemInfo();
        setSystemInfo(info);
        
        // Backwards compatibility - set database name for existing code
        if (info?.database?.display_name) {
          setDatabaseName(info.database.display_name);
        }
      } catch (error) {
        console.warn('Nepodařilo se načíst systémové informace:', error);
      }
    };
    
    const loadModuleSettings = async () => {
      if (token && username) {
        try {
          const settings = await getGlobalSettings(token, username);
          setModuleSettings({
            module_orders_visible: settings.module_orders_visible ?? true,
            module_orders_v3_visible: settings.module_orders_v3_visible ?? false,
            module_invoices_visible: settings.module_invoices_visible ?? true,
            module_annual_fees_visible: settings.module_annual_fees_visible ?? true
          });
        } catch (error) {
          console.warn('Nepodařilo se načíst nastavení modulů:', error);
        }
      }
    };
    
    loadSystemInfo();
    loadModuleSettings();
  }, [token, username]); // Run when token/username available

  // Refresh system info after login
  useEffect(() => {
    if (isLoggedIn && token && username) {
      const refreshSystemInfo = async () => {
        try {
          // ⏱️ Malé zpoždění, aby se localStorage stihl naplnit
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Clear cache to force fresh load from API
          SystemInfoService.clearCache();
          const info = await SystemInfoService.getSystemInfo();
          setSystemInfo(info);
          
          if (info?.database?.display_name) {
            setDatabaseName(info.database.display_name);
          }
          
          // Refresh module settings
          const settings = await getGlobalSettings(token, username);
          setModuleSettings({
            module_orders_visible: settings.module_orders_visible ?? true,
            module_orders_v3_visible: settings.module_orders_v3_visible ?? false,
            module_invoices_visible: settings.module_invoices_visible ?? true,
            module_annual_fees_visible: settings.module_annual_fees_visible ?? true
          });
        } catch (error) {
          console.warn('Nepodařilo se aktualizovat systémové informace:', error);
        }
      };
      
      refreshSystemInfo();
    }
  }, [isLoggedIn, token, username]); // Refresh when user logs in

  // Refresh system info after logout (clear cache when user logs out)
  useEffect(() => {
    if (!isLoggedIn) {
      // Při odhlášení vyčistit cache a resetovat na fallback
      SystemInfoService.clearCache();
      setSystemInfo(null);
      setDatabaseName(null);
    }
  }, [isLoggedIn]);

  // Check maintenance mode status periodically
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const maintenanceActive = await checkMaintenanceMode();
        setIsMaintenanceMode(maintenanceActive);
      } catch (error) {
        console.warn('Nepodařilo se zkontrolovat maintenance mode:', error);
        setIsMaintenanceMode(false);
      }
    };

    // Check immediately on mount
    checkMaintenance();

    // Check every 30 seconds
    const interval = setInterval(checkMaintenance, 30000);

    return () => clearInterval(interval);
  }, []);

  // Listen for settings changes (triggered after saving settings in ProfilePage)
  useEffect(() => {
    const handleSettingsChange = () => {
      setToolsVisibilityKey(prev => prev + 1);
    };

    window.addEventListener('userSettingsChanged', handleSettingsChange);
    return () => window.removeEventListener('userSettingsChanged', handleSettingsChange);
  }, []);

  // Callback funkce pro externí vkládání textu do NotesPanel
  const notesExternalInsertCallbackRef = useRef(null);

  // Globální voice recognition - funguje i když NotesPanel není otevřený
  const globalVoice = useGlobalVoiceRecognition({
    onOpenNotesPanel: () => {
      //
      // Otevřít NotesPanel, pokud není
      if (!notesOpen) {
        setNotesOpen(true);
        setEngagedPair(true);
        setHoveredPanel(null);
        bringPanelFront('notes');
      }
    },
    onInsertToNotes: (htmlText) => {
      //
      // Vložit text do NotesPanel pomocí callback funkce (použij REF pro aktuální hodnotu)
      if (notesExternalInsertCallbackRef.current && typeof notesExternalInsertCallbackRef.current === 'function') {
        notesExternalInsertCallbackRef.current(htmlText);
      }
    },
    keywords: [
      // Klíčová slova pro zvýraznění
      'urgentní', 'havárie', 'zranění', 'sanitka', 'priorita', 'okamžitě',
      'důležité', 'kritické', 'pozor', 'varování', 'alarm'
    ],
    lang: 'cs-CZ'
  });

  // Synchronizace stavu nahrávání s UI (červené tlačítko)
  useEffect(() => {
    // ✅ POUZE pokud je API podporováno, synchronizuj recording state
    if (globalVoice.isSupported) {
      setNotesRecording(globalVoice.isRecording);
    }
  }, [globalVoice.isRecording, globalVoice.isSupported]);

  // BackgroundTasksContext - potřebujeme ho dříve pro handleTodoAlarmNotification
  const bgTasksContext = useBgTasksContext();
  const notificationUnreadCount = bgTasksContext?.unreadNotificationsCount || 0;

  // Handler pro přidání TODO alarmu do notifikací (ALARM = Toast + zvonek)
  const handleTodoAlarmNotification = useCallback((notification) => {
    const newNotification = {
      id: notification.id,
      type: 'TODO_ALARM',
      title: notification.priorita === 'HIGH'
        ? '🚨 TODO Alarm (HIGH)'
        : '⏰ TODO Alarm',
      message: notification.zprava,
      dt_created: new Date(notification.timestamp).toISOString(),
      timestamp: notification.timestamp,
      is_read: 0,
      read: false,
      priority: notification.priorita || 'NORMAL',
      data: {
        taskId: notification.taskId,
        alarmTime: notification.alarmTime
      }
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Seřadit podle datumu (nejnovější nahoře)
      return updated.sort((a, b) => {
        const dateA = new Date(a.dt_created || a.timestamp || 0);
        const dateB = new Date(b.dt_created || b.timestamp || 0);
        return dateB - dateA; // Descending (nejnovější první)
      });
    });

    if (bgTasksContext?.handleUnreadCountChange) {
      const currentCount = bgTasksContext.unreadNotificationsCount || 0;
      bgTasksContext.handleUnreadCountChange(currentCount + 1);
    }
  }, [setNotifications, bgTasksContext]);

  // Počet nedokončených TODO úkolů pro badge
  const unfinishedTasksCount = useMemo(() => tasks.filter(t => !t.done).length, [tasks]);

  // Počet aktivních TODO alarmů pro badge (vlevo na ikoně)
  const activeAlarmsCount = useMemo(() => {
    const now = Date.now();
    return tasks.filter(task => {
      if (!task.alarm || task.done) return false;
      const alarmTime = typeof task.alarm === 'object' ? task.alarm.time : task.alarm;
      return alarmTime && alarmTime > now; // Budoucí aktivní alarmy
    }).length;
  }, [tasks]);

  // TODO Alarms - kontrola alarmů na pozadí (odeslání na backend → zobrazí se jako notifikace)
  const { activeAlarms, handleDismissAlarm, handleCompleteTask } = useTodoAlarms(
    tasks,
    updateTaskAlarm,
    isLoggedIn,
    user_id,
    handleTodoAlarmNotification, // callback pro přidání do zvonečku
    showToast, // Toast notifikace pro alarmy
    fullName // Jméno uživatele pro BE notifikace
  );

  // ⚠️ REFAKTOR: TODO alarmy se načítají pouze z API
  // Ž ádné localStorage načítání - notifikace přijdou z getNotificationsList()

  // Handler pro označení úkolu jako hotového z floating alarmu
  const handleCompleteFromAlarm = useCallback((taskId) => {
    const completedTaskId = handleCompleteTask(taskId);
    if (completedTaskId) {
      toggleTask(completedTaskId);

      // HIGH alarm completed = smaž notifikaci ze zvonečku
      setNotifications(prev => {
        const filtered = prev.filter(n => {
          if (n.type === 'TODO_ALARM' && n.data?.taskId === completedTaskId) {
            // Aktualizuj badge
            if (n.precteno === 0 && bgTasksContext?.unreadNotificationsCount > 0) {
              bgTasksContext.handleUnreadCountChange?.(bgTasksContext.unreadNotificationsCount - 1);
            }

            return false; // Odstraň
          }
          return true; // Ponech
        });
        return filtered;
      });
    }
  }, [handleCompleteTask, toggleTask, setNotifications, user_id, bgTasksContext]);

  // Callback pro smazání TODO ALARM notifikace při odkřížknutí úkolu
  const handleDeleteAlarmNotificationOnComplete = useCallback((taskId) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => {
        if (n.type === 'TODO_ALARM' && n.data?.taskId === taskId) {
          // Aktualizuj badge (pokud byla nepřečtená)
          if (n.precteno === 0 && bgTasksContext?.unreadNotificationsCount > 0) {
            bgTasksContext.handleUnreadCountChange?.(bgTasksContext.unreadNotificationsCount - 1);
          }

          return false; // Odstraň
        }
        return true; // Ponech
      });
      return filtered;
    });
  }, [setNotifications, user_id, bgTasksContext]);

  // Wrapper pro toggleTask, který automaticky maže alarm notifikace
  const toggleTaskWithAlarmCleanup = useCallback((taskId) => {
    toggleTask(taskId, handleDeleteAlarmNotificationOnComplete);
  }, [toggleTask, handleDeleteAlarmNotificationOnComplete]);

  // Callback pro update alarmu z FloatingAlarmPopup (snooze)
  useEffect(() => {
    window.updateTaskAlarmFromPopup = (taskId, updatedAlarm) => {
      updateTaskAlarm(taskId, updatedAlarm);
      // Dismiss popup - isSnoozed=true pro reset checkedAlarmsRef
      handleDismissAlarm(taskId, true);
    };

    return () => {
      delete window.updateTaskAlarmFromPopup;
    };
  }, [updateTaskAlarm, handleDismissAlarm]);

  // Debug log filter (toggleable row)
  const [debugFilterOpen, setDebugFilterOpen] = useState(false);
  const [debugFilter, setDebugFilter] = useState('');
  const normalizedFilter = debugFilter.trim().toLowerCase();
  const filteredLogEntries = useMemo(()=>{
    if (!normalizedFilter) return logEntries;
    return logEntries.filter(e => {
      try {
        const base = JSON.stringify(e).toLowerCase();
        return base.includes(normalizedFilter);
      } catch { return false; }
    });
  }, [logEntries, normalizedFilter]);
  // Highlight support
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const highlightRegex = useMemo(()=> normalizedFilter ? new RegExp(escapeRegExp(normalizedFilter), 'gi') : null, [normalizedFilter]);
  const applyHighlight = useCallback((htmlOrText) => {
    if (!highlightRegex || !htmlOrText) return htmlOrText;
    return htmlOrText.replace(highlightRegex, m => `<mark class="dbg-hl">${m}</mark>`);
  }, [highlightRegex]);
  useEffect(()=>{
    if (highlightRegex) {
      requestAnimationFrame(()=>{
        const first = document.querySelector('.dbg-hl');
        if (first) first.scrollIntoView({block:'center', behavior:'smooth'});
      });
    }
  }, [highlightRegex, filteredLogEntries]);
  const navigate = useNavigate();
  const location = useLocation();

  // ── Scroll FAB + Quick Nav (jen na /stats-reports) ─────────────────────────
  const [scrollFabAtBottom, setScrollFabAtBottom] = useState(false);
  const [statsNavOpen, setStatsNavOpen] = useState(false);
  const [statsNavPinned, setStatsNavPinned] = useState(false);
  const [statsNavSections, setStatsNavSections] = useState([]);

  useEffect(() => {
    if (!location.pathname.startsWith('/stats-reports')) return;
    const el = document.querySelector('main');
    if (!el) return;
    const onScroll = () => {
      setScrollFabAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => setStatsNavSections(e.detail?.sections || []);
    window.addEventListener('statsNavSections', handler);
    return () => window.removeEventListener('statsNavSections', handler);
  }, []);

  // Zavři nav popup kliknutím mimo
  useEffect(() => {
    if (!statsNavOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-stats-nav]')) { setStatsNavOpen(false); setStatsNavPinned(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statsNavOpen]);

  // Zavři nav když přejdeme pryč ze stats-reports
  useEffect(() => {
    if (!location.pathname.startsWith('/stats-reports')) { setStatsNavOpen(false); setStatsNavPinned(false); }
  }, [location.pathname]);

  const handleScrollFab = () => {
    const el = document.querySelector('main');
    if (!el) return;
    if (scrollFabAtBottom) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  };
  const handleStatsNavItem = (key) => {
    window.dispatchEvent(new CustomEvent('statsScrollToSection', { detail: { key } }));
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Persist last top-level route (menu section) so we can restore after refresh

  // Reset progress bar on route change if previous route left it visible (prevence visící zelené lišty)
  useEffect(() => {
    const t = setTimeout(() => {
      try { if (!active && visible) resetProgress(); } catch {}
    }, 120);
    return () => clearTimeout(t);
  }, [location.pathname, active, visible, resetProgress]);
  // Bell anchor ref and pulse indicator when new notification arrives
  const notifBtnRef = useRef(null);
  const prevNotifCountRef = useRef(notifications.length);
  const [bellPulse, setBellPulse] = useState(false);
  useEffect(() => {
    const prev = prevNotifCountRef.current;
    if (notifications.length > prev && !notifOpen) {
      // new notification arrived while bubble closed -> pulse bell
      setBellPulse(true);
      setTimeout(() => setBellPulse(false), 900);
      // Also show a toast for the newest incoming notification
      try {
        const newest = notifications && notifications.length ? notifications[0] : null;
        if (newest && showToast) {
          // Speciální zpracování pro TODO_ALARM - pouze jednou pro každý alarm
          const t = String(newest.type || '').toLowerCase();

          if (newest.type === 'TODO_ALARM') {
            // Pro TODO_ALARM použij speciální 'alarm' toast typ
            const priority = newest.priority || 'NORMAL';
            const toastType = priority === 'HIGH' ? 'alarm_high' : 'alarm';
            const msg = newest.message || 'TODO Alarm';

            // Kontrola, zda už nebyl toast pro tento alarm zobrazen
            const alarmId = newest.id;
            const storageKey = `toast_alarm_shown_${user_id}`;

            try {
              const shownAlarms = JSON.parse(localStorage.getItem(storageKey) || '[]');
              if (!shownAlarms.includes(alarmId)) {
                // Toast ještě nebyl zobrazen - zobraz ho a označ jako zobrazený
                showToast(msg, { type: toastType, timeout: 8000 });
                shownAlarms.push(alarmId);
                localStorage.setItem(storageKey, JSON.stringify(shownAlarms));
              }
            } catch {
              // Fallback - zobraz toast
              showToast(msg, { type: toastType, timeout: 8000 });
            }
          } else {
            // Standardní notifikace
            const typeMap = t.includes('error') ? 'error'
              : (t.includes('approved') || t.includes('welcome')) ? 'success'
              : (t.includes('reminder') || t.includes('warn')) ? 'warning'
              : 'info';
            const msg = newest.message || 'Nová notifikace';
            showToast(msg, { type: typeMap, timeout: 6000 });
          }
        }
      } catch {}
    }
    prevNotifCountRef.current = notifications.length;
  }, [notifications.length, notifOpen]);

  // Control mounted state to allow exit animation (panel remains mounted briefly after notifOpen false)
  const [notifMounted, setNotifMounted] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarBtnRef = useRef(null);
  useEffect(() => {
    if (notifOpen) setNotifMounted(true);
    else {
      // delay unmount to allow exit animation (~180ms)
      const t = setTimeout(() => setNotifMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [notifOpen]);
  // Stav rozpracované objednávky – načítáme pomocí draftStorageService (FÁZE 2)
  const [hasDraftOrder, setHasDraftOrder] = useState(false);

  // State for edit mode information from OrderForm
  const [isOrderEditMode, setIsOrderEditMode] = useState(false);
  const [editOrderId, setEditOrderId] = useState(null);
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [orderPhaseInfo, setOrderPhaseInfo] = useState({ phase: 1, isZrusena: false });

  // 🔍 DEBUG: Logovat pouze při změně hodnot (ne při každém renderu)
  const prevMenuBarState = useRef({ hasDraftOrder: false, isOrderEditMode: false, editOrderId: null, editOrderNumber: '' });
  useEffect(() => {
    const current = { hasDraftOrder, isOrderEditMode, editOrderId, editOrderNumber };
    const prev = prevMenuBarState.current;
    
    if (prev.hasDraftOrder !== current.hasDraftOrder ||
        prev.isOrderEditMode !== current.isOrderEditMode ||
        prev.editOrderId !== current.editOrderId ||
        prev.editOrderNumber !== current.editOrderNumber) {
      
      prevMenuBarState.current = current;
    }
  }, [hasDraftOrder, isOrderEditMode, editOrderId, editOrderNumber]);

  // Helper pro opakované vyhodnocení (při loginu, user_id změně, eventech)
  const recalcHasDraft = useCallback(async () => {
    try {
      if (user_id) {
        // 🎯 CENTRALIZED: Použij DraftManager místo přímého volání
        if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
        }
        draftManager.setCurrentUser(user_id);
        const hasDraft = await draftManager.hasDraft();

        if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
        }

        if (!hasDraft) {
          setHasDraftOrder(false);
          setOrderPhaseInfo({ phase: 1, isZrusena: false });
          setIsOrderEditMode(false);
          setEditOrderId(null);
          setEditOrderNumber('');
          return;
        }

        try {
          // 🎯 CENTRALIZED: Načti draft přes DraftManager
          const draftData = await draftManager.loadDraft();

          if (!draftData || !draftData.formData) {
            // ❌ KRITICKÉ: Draft neexistuje NEBO je invalidated → SMAŽ HO!
            // loadDraft() vrací null když je draft invalidated
            try {
              await draftManager.deleteDraft();
            } catch (deleteError) {
            }

            setHasDraftOrder(false);
            setOrderPhaseInfo({ phase: 1, isZrusena: false });
            setIsOrderEditMode(false);
            setEditOrderId(null);
            setEditOrderNumber('');
            return;
          }

          // Draft existuje - analyzuj jeho obsah
          setHasDraftOrder(true);

          // KRITICKÉ: Určit isEditMode podle savedOrderId (ne isOrderSavedToDB!)
          // savedOrderId existuje → objednávka je skutečně v DB → EDITACE
          // savedOrderId = null, ale má formData.id → KONCEPT s autosave ID
          const isEditMode = !!(draftData.savedOrderId && draftData.formData?.id);

          // Načti editační režim info z draftu
          setIsOrderEditMode(isEditMode);
          setEditOrderId(draftData.savedOrderId || null);
          setEditOrderNumber(draftData.formData?.cislo_objednavky || '');

          // Zjisti fázi a stav objednávky z draftu
          const phaseInfo = getOrderPhaseFromDraft(draftData);
          setOrderPhaseInfo(phaseInfo);

        } catch (draftError) {
          setHasDraftOrder(false);
          setIsOrderEditMode(false);
          setEditOrderId(null);
          setEditOrderNumber('');
          setOrderPhaseInfo({ phase: 1, isZrusena: false });
        }
      } else {
        // Anonymní uživatel nemá draft
        setHasDraftOrder(false);
        setOrderPhaseInfo({ phase: 1, isZrusena: false });
        setIsOrderEditMode(false);
        setEditOrderId(null);
        setEditOrderNumber('');
      }
    } catch (error) {
      setHasDraftOrder(false);
      setIsOrderEditMode(false);
      setEditOrderId(null);
      setEditOrderNumber('');
      setOrderPhaseInfo({ phase: 1, isZrusena: false });
    }
  }, [user_id]);  // Listener custom eventu z OrderFormComponent (emitovat při změně / uložení / zrušení)
  useEffect(() => {
    const handler = (e) => {
      if (typeof e.detail?.hasDraft === 'boolean') {
        setHasDraftOrder(e.detail.hasDraft);

        // If we're starting to load an order for editing, only update edit mode if not in loading state
        if (e.detail?.isLoading) {
          // Keep current menu bar state while loading, don't switch yet
          return;
        }

        // Update edit mode information only when fully loaded
        // KRITICKÉ: Pokud event neobsahuje isEditMode, NEMĚNIT stav (zachovat předchozí hodnotu)
        if (typeof e.detail?.isEditMode === 'boolean') {
          setIsOrderEditMode(e.detail.isEditMode);
        }
        if (e.detail?.orderId !== undefined) {
          setEditOrderId(e.detail.orderId);
        }
        if (e.detail?.orderNumber !== undefined) {
          setEditOrderNumber(e.detail.orderNumber);
        }

        // 🔧 FIX: Volat recalcHasDraft() POUZE když hasDraft je TRUE
        // Pokud je false, draft byl smazán a není co načítat
        if (e.detail.hasDraft === true) {
          recalcHasDraft();
        } else {
          // Draft byl smazán - vyčistit všechny stavy
          setIsOrderEditMode(false);
          setEditOrderId(null);
          setEditOrderNumber('');
          setOrderPhaseInfo({ phase: 1, isZrusena: false });
        }
      } else {
        // fallback: explicitně načti jen pro aktuálního uživatele / anonymně
        recalcHasDraft(); // async ale nemusí čekat
        setIsOrderEditMode(false);
        setEditOrderId(null);
        setEditOrderNumber('');
        setOrderPhaseInfo({ phase: 1, isZrusena: false });
      }
    };
    window.addEventListener('orderDraftChange', handler);
    return () => window.removeEventListener('orderDraftChange', handler);
  }, [user_id, recalcHasDraft]);

  // 🎯 [SYNCHRONNÍ MENUBAR] Poslouchat OrderForm25 stav a OKAMŽITĚ aktualizovat MenuBar
  // PRIORITA: Layout nastavuje MenuBar → OrderForm se načte podle toho
  const pendingResetTimeoutRef = useRef(null);
  
  useEffect(() => {
    const handler = (e) => {
      const state = e.detail;
      if (!state) return;

      // 🔥 OKAMŽITÉ nastavení MenuBaru podle stavu z OrderForm25
      
      // 1️⃣ EDITACE (má savedOrderId) → MenuBar = "Editace objednávky"
      if (state.isEditMode && state.orderId) {
        if (pendingResetTimeoutRef.current) {
          clearTimeout(pendingResetTimeoutRef.current);
          pendingResetTimeoutRef.current = null;
        }
        
        setHasDraftOrder(true);
        setIsOrderEditMode(true);
        setEditOrderId(state.orderId);
        setEditOrderNumber(state.orderNumber || '');
        
        if (state.currentPhase) {
          setOrderPhaseInfo({
            phase: state.currentPhase,
            isZrusena: state.mainWorkflowState === 'ZRUSENA'
          });
        }
        return;
      }
      
      // 2️⃣ KONCEPT (hasDraft=true, ale BEZ savedOrderId) → MenuBar = "Koncept objednávka"
      if (state.hasDraft === true && !state.isEditMode) {
        if (pendingResetTimeoutRef.current) {
          clearTimeout(pendingResetTimeoutRef.current);
          pendingResetTimeoutRef.current = null;
        }
        
        setHasDraftOrder(true);
        setIsOrderEditMode(false);
        setEditOrderId(null);
        setEditOrderNumber('');
        setOrderPhaseInfo({ phase: state.currentPhase || 1, isZrusena: false });
        return;
      }
      
      // 3️⃣ RESET (hasDraft=false nebo undefined) → MenuBar = "Nová objednávka"
      // POZOR: Zpožděný reset kvůli React remount (strict mode)
      if (state.hasDraft === false || state.hasDraft === undefined) {
        if (pendingResetTimeoutRef.current) {
          clearTimeout(pendingResetTimeoutRef.current);
          pendingResetTimeoutRef.current = null;
        }
        
        pendingResetTimeoutRef.current = setTimeout(async () => {
          // Ověř skutečnou existenci draftu
          if (user_id) {
            try {
              draftManager.setCurrentUser(user_id);
              const actuallyHasDraft = await draftManager.hasDraft();
              
              if (actuallyHasDraft) {
                recalcHasDraft();
                return;
              }
            } catch (e) {
              // Pokud selže kontrola, pokračuj s reset
            }
          }
          
          // Draft skutečně neexistuje → RESET
          setHasDraftOrder(false);
          setIsOrderEditMode(false);
          setEditOrderId(null);
          setEditOrderNumber('');
          setOrderPhaseInfo({ phase: 1, isZrusena: false });
          pendingResetTimeoutRef.current = null;
        }, 150);
        
        return;
      }
    };

    window.addEventListener('orderFormStateChange', handler);

    // Načti stav i při mount (pokud OrderForm25 už běží)
    if (window.__orderFormState) {
      handler({ detail: window.__orderFormState });
    }

    return () => {
      window.removeEventListener('orderFormStateChange', handler);
      if (pendingResetTimeoutRef.current) {
        clearTimeout(pendingResetTimeoutRef.current);
        pendingResetTimeoutRef.current = null;
      }
    };
  }, [user_id, recalcHasDraft]);

  // Recalc když se změní user_id (přihlášení/odhlášení). Už existující vlastní draft se tak znovu označí.
  useEffect(() => {
    if (user_id) {
      recalcHasDraft(); // async ale fire-and-forget
    }
  }, [user_id, recalcHasDraft]);

  // Recalc po přechodu do stavu přihlášení (např. po obnově session) – jistota že badge ukáže Rozpracovaná.
  useEffect(() => {
    if (isLoggedIn && user_id) {
      recalcHasDraft(); // async ale fire-and-forget
    } else {
      setHasDraftOrder(false); // při odhlášení schovej
      setOrderPhaseInfo({ phase: 1, isZrusena: false }); // reset phase info
    }
  }, [isLoggedIn, recalcHasDraft]);

  // ✅ ODSTRANĚNO: currentDateTime state přesunut do LiveDateTime komponenty

  const handleLogoutClick = async () => {
    // Zavřít všechny panely před odhlášením
    setTodoOpen(false);
    setNotesOpen(false);
    setNotifOpen(false);
    setDebugOpen(false);

    // Uložit současnou pozici pro obnovení po přihlášení
    try {
      saveCurrentLocation();
    } catch (error) {
    }

    // Uložit poznámky a TODO před odhlášením
    try {
      if (flushNotesSave) {
        flushNotesSave();
      }
    } catch (error) {
    }
    try {
      if (flushTasksSave) {
        await flushTasksSave();
      }
    } catch (error) {
    }

    // Krátká pauza pro dokončení ukládání
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 100);
  };

  // Pokud se změní uživatel, přepočítej dostupnost draftu, aby se neukazovala cizí "Rozpracovaná".
  useEffect(() => {
    recalcHasDraft();
  }, [user_id, recalcHasDraft]);

  // ✅ BROADCAST: Poslouchej změny draftu z ostatních záložek
  useEffect(() => {
    if (!isLoggedIn || !user_id) return;

    // Inicializuj broadcast channel
    initTabSync();

    const cleanup = onTabSyncMessage((message) => {
      if (!message || !message.type) return;

      // Reaguj pouze na zprávy relevantní pro menu bar
      switch (message.type) {
        case BROADCAST_TYPES.DRAFT_UPDATED:
          // Draft byl uložen/upraven v jiné záložce → refresh UI
          if (message.payload?.userId === user_id) {
            recalcHasDraft();
          }
          break;

        case BROADCAST_TYPES.DRAFT_DELETED:
          // Draft byl vymazán v jiné záložce → refresh UI
          if (message.payload?.userId === user_id) {
            recalcHasDraft();
          }
          break;

        case BROADCAST_TYPES.ORDER_SAVED:
          // Objednávka byla uložena → refresh UI (může se změnit z "Koncept" na "Editace")
          recalcHasDraft();
          break;

        default:
          // Ostatní zprávy ignoruj
          break;
      }
    });

    return () => {
      if (cleanup) cleanup();
      closeTabSync();
    };
  }, [isLoggedIn, user_id, recalcHasDraft]);

  const isActive = (path) => location.pathname === path;
  // Floating panels active tracking (independent of z-index) + outside click blur
  const [activePanel, setActivePanel] = useState(null); // currently used for notifications focus
  const [engagedPair, setEngagedPair] = useState(false); // both todo + notes fully visible when true
  const [hoveredPanel, setHoveredPanel] = useState(null); // ephemeral hover highlight when not engaged
  // When a panel is opened, make it active
  // Opening panels does not auto-engage; they start in semi-transparent mode until clicked.
  useEffect(() => { if (!todoOpen && !notesOpen && !chatOpen) { setEngagedPair(false); setHoveredPanel(null); } }, [todoOpen, notesOpen, chatOpen]);
  useEffect(() => { if (notifOpen) setActivePanel(p => p === null ? 'notif' : p); }, [notifOpen]);
  // Outside click -> deactivate (retain z-order but all semi-transparent)
  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-floating-panel]')) return; // inside – handled separately
      setActivePanel(null); // lose notif focus too
      setEngagedPair(false); // return panels to base transparency
      setHoveredPanel(null);
      setCalculatorActive(false); // deaktivovat kalkulačku také
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const activateAndFront = useCallback((key) => { // for notifications only
    bringPanelFront(key);
    setActivePanel(key);
    setCalculatorActive(false); // Deaktivovat kalkulačku když se aktivuje notification panel
  }, [bringPanelFront]);
  const engageTodoNotes = useCallback((clickedKey) => {
    // Bring clicked front, engage pair (if the other is open it will become fully visible too)
    bringPanelFront(clickedKey);
    setEngagedPair(true);
    setHoveredPanel(null);
    setCalculatorActive(false); // Deaktivovat kalkulačku když se aktivuje TODO/Notes
  }, [bringPanelFront]);
  // Opacity mapping (interpreting request):
  // mimo (outside / idle) => 65% => opacity 0.35
  // hover => 10% => opacity 0.90
  // klik (engaged) => 5% => opacity 0.95
  const basePanelOpacity = 0.35;   // idle (65% transparent)
  const hoverPanelOpacity = 0.90;  // hover (10% transparent)
  const engagedOpacity = 0.95;     // engaged/clicked (5% transparent)

  // Detekce SUPERADMIN a DEBUG route
  const isSuperAdminPerm = hasPermission && hasPermission('SUPERADMIN');
  const isDebugRoute = location.pathname === '/debug';
  const debugGloballyDisabled = (() => { try { return (localStorage.getItem('debug_disable') || process.env.REACT_APP_DEBUG_OFF) === '1'; } catch { return true; } })();
  const canDebug = !debugGloballyDisabled && isLoggedIn && isSuperAdminPerm && isDebugRoute;

  // Add userDetail JSON to debug log when debug is enabled and user is logged in
  useEffect(() => {
    if (canDebug && isLoggedIn && userDetail) {
      addDebugEntry({
        type: 'USER_DETAIL',
        message: 'Aktuální userDetail JSON',
        userDetail
      }, { keepObject: true });
    }
    // Only on change of userDetail
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDebug, isLoggedIn, userDetail]);
  const { debugOpen, setDebugOpen, debugFont, setDebugFont, panelSize, panelPos, setPanelPos, beginResize, headerMouseDown, resetPanel } = useDebugPanel();
  const [collapsedLogs, setCollapsedLogs] = useState(() => new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  const parsedJson = useMemo(() => { try { return JSON.parse(debugMessage); } catch { return null; } }, [debugMessage]);
  const syntaxHighlight = (obj) => {
    if (!obj) return debugMessage;
    const json = JSON.stringify(obj, null, 2);
    return json
      .replace(/(&|<|>)/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
      .replace(/"(.*?)"(?=:)/g, '<span class="json-key">"$1"</span>')
      .replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, '<span class="json-string">"$1"</span>')
      .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
      .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
      .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="json-number">$1</span>');
  };
  const copyAll = () => {
    const bundle = { debugMessage: parsedJson || debugMessage, logs: logEntries };
    try { navigator.clipboard.writeText(JSON.stringify(bundle, null, 2)); } catch {}
  };
  const toggleOneLog = (ts) => {
    setCollapsedLogs(prev => { const next = new Set(prev); if (next.has(ts)) next.delete(ts); else next.add(ts); return next; });
  };
  // Sync notes DOM if external change to notesText (e.g., translation replacing innerHTML)
  // Moved to NotesPanel
  // (panel viewport clamping & persistence now handled inside useFloatingPanels hook)

  const collapseAll = (collapse) => {
    if (collapse) {
      // sbal aktuálně viditelné, ale neoznačuj budoucí
      setCollapsedLogs(new Set(logEntries.map(l => l.ts)));
      setAllCollapsed(true);
    } else {
      setCollapsedLogs(new Set());
      setAllCollapsed(false);
    }
  };

  // Pokud přibudou nové logy a máme globální collapse zapnutý, přidej je také
  // Záměrně žádný efekt: nové logy ponecháme vždy rozbalené.

  // debug panel drag/resize handled via useDebugPanel

  // Aktivuj / deaktivuj API tracing pouze pro ADMIN
  useEffect(() => {
    try { setApiDebugEnabled(canDebug); } catch {}
    return () => { if (!canDebug) return; try { setApiDebugEnabled(false); } catch {} };
  }, [canDebug]);

  // Přidá číslování řádků dovnitř <pre> bloků (JSON) – nečíslujeme logy, ale jednotlivé řádky obsahu
  const addLineNumbersToPre = (html) => {
    if (!html || typeof html !== 'string') return html;
    if (html.includes('data-ln-ready')) return html; // už zpracováno
    const match = html.match(/<pre[^>]*>[\s\S]*?<\/pre>/);
    if (!match) return html;
    const fullPre = match[0];
    const styleMatch = fullPre.match(/<pre[^>]*style="([^"]*)"/);
    const inner = fullPre.replace(/<pre[^>]*>/,'').replace(/<\/pre>/,'');
    const lines = inner.split('\n');
    const numbered = lines.map((line, idx) => {
      const safeLine = line === '' ? '&nbsp;' : line; // zachová prázdné řádky
      return `<div class="dbg-ln" style="display:flex;">`+
        `<span style="user-select:none;color:#6b7280;opacity:0.7;padding:0 6px;text-align:right;min-width:3ch;font-family:monospace;font-size:0.85em;">${idx+1}</span>`+
        `<span style="flex:1;white-space:pre;overflow:hidden;">${safeLine}</span>`+
      `</div>`;
    }).join('');
    const baseStyle = styleMatch ? styleMatch[1] : 'background:#052e16;border:1px solid #064e3b;border-radius:4px;padding:4px 6px;white-space:pre;font-family:monospace;font-size:11px;';
    const replacement = `<div data-ln-ready="1" style="${baseStyle};overflow:auto;">${numbered}</div>`;
    return html.replace(fullPre, replacement);
  };

  // Hook returns a force-update function we can call after transient UI changes
  const forceUpdateOffsets = useActualOffset();

  // If user just logged in, retry measurements shortly after to allow mounted content to settle
  useEffect(() => {
    if (!isLoggedIn) return;
    const t = setTimeout(() => { try { forceUpdateOffsets(); } catch(_) {} }, 140);
    const t2 = setTimeout(() => { try { forceUpdateOffsets(); } catch(_) {} }, 700);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [isLoggedIn, forceUpdateOffsets]);

  // If global progress finishes, re-measure (progress bar mount/unmount can shift header height)
  useEffect(() => {
    if (active) return; // only act when it just became inactive
    const t = setTimeout(() => { try { forceUpdateOffsets(); } catch(_) {} }, 120);
    return () => clearTimeout(t);
  }, [active, forceUpdateOffsets]);

  // Debug utilita pro F5 testing (development only) - ESLint compliant placement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('../utils/refreshUtils.js').catch(console.warn);
    }
  }, []);

  return (
    <div css={layoutStyle}>
  {/* runtime render path debug log removed */}
      {active && visible && (
        <GlobalProgressWrapper $hiding={hiding}>
          <GlobalProgressBar
            style={{
              width: `${Math.min(Math.max(Number.isFinite(Number(progress)) ? Number(progress) : 0, 0), 100)}%`,
              background: failed
                ? 'linear-gradient(90deg,#8e0b0b,#c62828 55%,#ef5350)'
                : 'linear-gradient(90deg,#2e7d32,#4caf50 40%,#66bb6a)',
              boxShadow: failed
                ? '0 0 4px rgba(0,0,0,0.25),0 0 8px rgba(239,83,80,0.65)'
                : '0 0 4px rgba(0,0,0,0.25),0 0 6px rgba(76,175,80,0.55)',
              transition: `width ${transitionMs}ms ease, background 350ms ease, box-shadow 350ms ease`
            }}
          />
        </GlobalProgressWrapper>
      )}
      <Global styles={css`
        /* Minimal residual global tweaks that are layout specific (not typography) */
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root { width:100%; max-width:100%; overflow-x:hidden; }
        body { margin:0; }
        /* Debug panel line numbering (kept local here) */
        .dbg-global-wrapper { counter-reset: dbgLine; padding-left:38px; }
        .dbg-ln { position: relative; }
        .dbg-ln::before { counter-increment: dbgLine; content: counter(dbgLine); position:absolute; left:-38px; width:32px; text-align:right; padding-right:6px; color:#ffffff; font-size:0.70rem; font-family:"JetBrains Mono", monospace; user-select:none; opacity:0.65; }
  .dbg-pre-big { font-size:1.2em !important; }
  .dbg-pre-big .dbg-ln span:first-of-type { font-size:0.8em !important; }
  mark.dbg-hl { background: #f59e0b; color:#111; padding:0 2px; border-radius:2px; box-shadow:0 0 0 1px rgba(0,0,0,0.35) inset; }

  @keyframes db-wave {
    0% {
      background-position: -100% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .db-source-blink {
    background: linear-gradient(
      90deg,
      #9ca3af 0%,
      #9ca3af 30%,
      #3b82f6 40%,
      #10b981 50%,
      #3b82f6 60%,
      #9ca3af 70%,
      #9ca3af 100%
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: db-wave calc(var(--wave-duration, 1.5s)) cubic-bezier(0.25, 0.1, 0.25, 1) 1;
    display: inline-block;
    font-weight: 700 !important;
  }
      `} />
  <Header data-auth={isLoggedIn ? '1':'0'}>
        <HeaderLeft>
          <HeaderLogo src={ASSETS.LOGO_ZZS_MAIN} alt="ZZS Středočeského kraje" />
          <div>
            <HeaderTitle>
              Systém správy a workflow objednávek
              <sup style={{ fontSize: '0.5em', marginLeft: '4px', fontWeight: '600', color: '#fbbf24', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {/* MAINTENANCE label při aktivním maintenance módu */}
                {isMaintenanceMode && (
                  <span style={{ 
                    color: '#f97316', 
                    fontWeight: '700',
                    backgroundColor: 'rgba(249, 115, 22, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    marginRight: '6px',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    animation: 'pulse-maintenance 2s ease-in-out infinite'
                  }}>
                    MAINTENANCE
                  </span>
                )}
                {/* DEVELOP label pro dev prostředí */}
                {typeof window !== 'undefined' && window.location.pathname.startsWith('/dev/') && (
                  <span style={{ 
                    color: '#ff6b6b', 
                    fontWeight: '700',
                    backgroundColor: 'rgba(220, 38, 38, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    marginRight: '6px',
                    border: '1px solid rgba(220, 38, 38, 0.4)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px'
                  }}>
                    <span>DEVELOP</span>
                    {databaseName && (
                      <span style={{ 
                        fontSize: '0.6em', 
                        fontWeight: '600',
                        opacity: 0.9
                      }}>{databaseName}</span>
                    )}
                  </span>
                )}
                {process.env.REACT_APP_VERSION?.match(/(\d+\.\d+[a-z]?)/)?.[1] || ''}
                {hierarchyInfo?.enabled && hierarchyInfo?.profileId && (
                  <span style={{ 
                    color: hierarchyInfo.isImmune ? '#9ca3af' : '#10b981', 
                    fontWeight: '700',
                    opacity: hierarchyInfo.isImmune ? 0.6 : 1
                  }}>.H{hierarchyInfo.profileId}</span>
                )}
              </sup>
            </HeaderTitle>
            {isLoggedIn && (
              <p style={{ margin: 0, fontSize: '.85rem', letterSpacing: '.35px', fontWeight: 500, fontStyle: 'normal', color: '#ffffff', opacity: 0.95 }}>
                {process.env.REACT_ORG_NAME || 'Zdravotnická záchranná služba Středočeského kraje, příspěvková organizace'}
              </p>
            )}
          </div>
        </HeaderLeft>

        {/* Universal Search - centrovaný */}
        {isLoggedIn && (
          <HeaderCenter>
            <UniversalSearchInput />
          </HeaderCenter>
        )}

        <HeaderRight>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.35rem'}}>
            <DateTimeBlock>
              {isLoggedIn && (
                <>
                  {/* DEBUG - pouze pro SUPERADMIN */}
                  {hasPermission && hasPermission('SUPERADMIN') && (
                    <CalendarBtn 
                      as={Link} 
                      to="/debug" 
                      title="DEBUG panel" 
                      aria-label="DEBUG panel"
                      style={{
                        fontSize: 'var(--app-header-title-size, 1.75rem)',
                        background: isActive('/debug') 
                          ? 'linear-gradient(135deg, #ffffff 0%, #dc2626 100%)'
                          : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(220,38,38,0.8) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginRight: '0.5rem'
                      }}
                    >
                      <FontAwesomeIcon icon={faBug} />
                    </CalendarBtn>
                  )}
                  {/* Kalendář - ref MUSÍ být přímo na tlačítku! */}
                  <CalendarBtn ref={calendarBtnRef} title="Otevřít kalendář s přehledem objednávek" onClick={()=>setCalendarOpen(v=>!v)} aria-label="Otevřít kalendář" style={{fontSize: 'var(--app-header-title-size, 1.75rem)'}}>
                    <FontAwesomeIcon icon={faCalendarDays} />
                  </CalendarBtn>
                </>
              )}
              <LiveDateTime />
            </DateTimeBlock>
            {isLoggedIn && (
              <CalendarPanel
                anchorRef={calendarBtnRef}
                isVisible={calendarOpen}
                onClose={()=>setCalendarOpen(false)}
                isLoggedIn={isLoggedIn}
                onDateSelect={(czDate) => {
                    try {
                      // Persist date filters for Orders25List
                      // Single click = set SAME date for both "from" and "to" to show only that day
                      const sid = user_id || 'anon';
                      const dateFromKey = `orders25_dateFrom_${sid}`;
                      const dateToKey = `orders25_dateTo_${sid}`;
                      const dateUpdatedKey = `orders25_date_filter_updated_${sid}`;

                      // Convert Czech format DD.MM.YYYY to YYYY-MM-DD for input[type="date"]
                      const parts = czDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
                      if (parts) {
                        const isoDate = `${parts[3]}-${parts[2]}-${parts[1]}`;
                        try { localStorage.setItem(dateFromKey, isoDate); } catch(_) {}
                        try { localStorage.setItem(dateToKey, isoDate); } catch(_) {} // Same date for "to" = show only this day
                        try { localStorage.setItem(dateUpdatedKey, String(Date.now())); } catch(_) {}

                        // Dispatch event for Orders25List to react
                        window.dispatchEvent(new CustomEvent('orders25_date_filter_changed', {
                          detail: { dateFrom: isoDate, dateTo: isoDate, userId: sid }
                        }));
                      }

                      // DON'T navigate away from forms - stay where we are if on form
                      const currentPath = location?.pathname || window.location.pathname;
                      if (currentPath && (currentPath.startsWith('/orders-new') || currentPath.startsWith('/order-form-25'))) {
                        setCalendarOpen(false); // Just close calendar, don't navigate
                      } else {
                        // navigate to orders overview (dynamická homepage podle nastavení)
                        const homepage = getDefaultHomepageSync();
                        try { navigate(homepage); } catch(_) {}
                      }
                    } catch (_) {}
                  }}
                onDateRangeSelect={(czDateFrom, czDateTo) => {
                    try {
                      // Persist date range for Orders25List (dateFromFilter + dateToFilter)
                      const sid = user_id || 'anon';
                      const dateFromKey = `orders25_dateFrom_${sid}`;
                      const dateToKey = `orders25_dateTo_${sid}`;
                      const dateUpdatedKey = `orders25_date_filter_updated_${sid}`;

                      // Convert Czech format DD.MM.YYYY to YYYY-MM-DD
                      const convertDate = (czDate) => {
                        const parts = czDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
                        return parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : '';
                      };

                      const isoDateFrom = convertDate(czDateFrom);
                      const isoDateTo = convertDate(czDateTo);

                      if (isoDateFrom && isoDateTo) {
                        try { localStorage.setItem(dateFromKey, isoDateFrom); } catch(_) {}
                        try { localStorage.setItem(dateToKey, isoDateTo); } catch(_) {}
                        try { localStorage.setItem(dateUpdatedKey, String(Date.now())); } catch(_) {}

                        // Dispatch event for Orders25List
                        window.dispatchEvent(new CustomEvent('orders25_date_filter_changed', {
                          detail: { dateFrom: isoDateFrom, dateTo: isoDateTo, userId: sid }
                        }));
                      }

                      // Navigate to orders list (dynamická homepage podle nastavení)
                      const currentPath = location?.pathname || window.location.pathname;
                      if (!currentPath || (!currentPath.startsWith('/orders-new') && !currentPath.startsWith('/order-form-25'))) {
                        const homepage = getDefaultHomepageSync();
                        try { navigate(homepage); } catch(_) {}
                      } else {
                        setCalendarOpen(false);
                      }
                    } catch (_) {}
                  }}
              />
            )}
            {isLoggedIn && userDetail && (
              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 500, letterSpacing: '.4px', color: 'rgba(255,255,255,0.9)' }}>
                Přihlášený uživatel: <span style={{ fontWeight: 600 }}>
                  {(() => {
                    const base = `${userDetail.titul_pred ? userDetail.titul_pred + ' ' : ''}${userDetail.jmeno || ''} ${userDetail.prijmeni || ''}${userDetail.titul_za ? ', ' + userDetail.titul_za : ''}`.replace(/\s+/g, ' ').trim() || 'Neuvedeno';

                    // usek_zkr může být string, array nebo prázdné
                    let usekZkr = '';
                    if (Array.isArray(userDetail.usek_zkr) && userDetail.usek_zkr.length > 0) {
                      usekZkr = userDetail.usek_zkr.join(', ');
                    } else if (typeof userDetail.usek_zkr === 'string' && userDetail.usek_zkr.trim()) {
                      usekZkr = userDetail.usek_zkr.trim();
                    }

                    // Lokalita z userDetail
                    const lokalita = userDetail?.lokalita_nazev?.nazev || userDetail?.lokalita?.nazev || '';

                    // Sestavení výsledného řetězce: Jméno | Úsek | Lokalita
                    let result = base;
                    if (usekZkr) result += ` | ${usekZkr}`;
                    if (lokalita) result += ` | ${lokalita}`;

                    return result;
                  })()}
                </span>
              </p>
            )}
          </div>
        </HeaderRight>
      </Header>
      {isLoggedIn && (
        <MenuBar>
          {canUseStickyNotes && (
            <MenuCornerLeft>
              <SmartTooltip
                text={stickyNotesOpen ? 'Skrýt Sticky desku (Esc)' : 'Otevřít Sticky desku (Win/Cmd + N)'}
                icon="info"
                preferredPosition="bottom"
              >
                <MenuCornerButton
                  type="button"
                  onClick={() => setStickyNotesOpen((v) => !v)}
                  title=""
                  aria-label="Sticky deska"
                >
                  <FontAwesomeIcon icon={faStickyNote} />
                </MenuCornerButton>
              </SmartTooltip>
            </MenuCornerLeft>
          )}
          <MenuLeft ref={menuLeftRef}>
            <SmartTooltip content="Dashboard" position="bottom">
              <MenuLinkLeft to="/dashboard" style={{ fontSize: '1.1em', padding: '0.4em 0.35em 0.4em 0.85em' }}>
                <FontAwesomeIcon icon={faHome} style={{ marginRight: 0 }} />
              </MenuLinkLeft>
            </SmartTooltip>
            { hasPermission && (
                hasPermission('USER_MANAGE') || 
                hasPermission('DICT_MANAGE') || 
                hasPermission('PHONEBOOK_MANAGE') ||
                hasPermission('SUPPLIER_MANAGE') ||
                hasPermission('LOCATIONS_MANAGE') || 
                hasPermission('POSITIONS_MANAGE') || 
                hasPermission('DEPARTMENTS_MANAGE') || 
                hasPermission('ORGANIZATIONS_MANAGE') || 
                hasPermission('STATES_MANAGE') || 
                hasPermission('ROLES_MANAGE') || 
                hasPermission('PERMISSIONS_MANAGE') || 
                hasPermission('DOCX_TEMPLATES_MANAGE') || 
                hasPermission('CASH_BOOKS_MANAGE') || 
                hasPermission('CONTRACT_MANAGE') ||
                (hasAdminRole && hasAdminRole()) ||
                (userDetail?.roles && userDetail.roles.some(role => role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'))
              ) && (
              <MenuDropdownWrapper>
                <MenuDropdownButton 
                  ref={adminButtonRef}
                  onClick={() => {
                    if (!adminMenuOpen && adminButtonRef.current) {
                      const rect = adminButtonRef.current.getBoundingClientRect();
                      setAdminDropdownPosition({
                        top: rect.bottom + 5,
                        left: rect.left,
                        width: rect.width
                      });
                    }
                    setAdminMenuOpen(!adminMenuOpen);
                  }}
                  data-open={adminMenuOpen}
                >
                  <FontAwesomeIcon icon={faCog} /> Administrace
                  <span className="chevron" style={{fontSize: '0.7em', marginLeft: '0.5em', fontWeight: 'bold'}}>
                    {adminMenuOpen ? '▴' : '▾'}
                  </span>
                </MenuDropdownButton>
                {adminMenuOpen && ReactDOM.createPortal(
                  <MenuDropdownContent 
                    ref={adminMenuRef}
                    $open={adminMenuOpen}
                    style={{
                      top: `${adminDropdownPosition.top}px`,
                      left: `${adminDropdownPosition.left}px`,
                      minWidth: `${adminDropdownPosition.width}px`
                    }}
                  >
                    {(
                      hasAdminRole() ||
                      hasPermission('SUPPLIER_MANAGE') || hasPermission('PHONEBOOK_MANAGE')
                    ) && (
                      <MenuDropdownItem 
                        to="/address-book" 
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faAddressBook} /> Adresář
                      </MenuDropdownItem>
                    )}
                    {(
                      hasAdminRole() ||
                      hasPermission('DICT_MANAGE') ||
                      hasPermission('LOCATIONS_VIEW') || hasPermission('LOCATIONS_CREATE') || hasPermission('LOCATIONS_EDIT') || hasPermission('LOCATIONS_DELETE') ||
                      hasPermission('POSITIONS_VIEW') || hasPermission('POSITIONS_CREATE') || hasPermission('POSITIONS_EDIT') || hasPermission('POSITIONS_DELETE') ||
                      hasPermission('CONTRACT_VIEW') || hasPermission('CONTRACT_CREATE') || hasPermission('CONTRACT_EDIT') || hasPermission('CONTRACT_DELETE') ||
                      hasPermission('ORGANIZATIONS_VIEW') || hasPermission('ORGANIZATIONS_CREATE') || hasPermission('ORGANIZATIONS_EDIT') || hasPermission('ORGANIZATIONS_DELETE') ||
                      hasPermission('DEPARTMENTS_VIEW') || hasPermission('DEPARTMENTS_CREATE') || hasPermission('DEPARTMENTS_EDIT') || hasPermission('DEPARTMENTS_DELETE') ||
                      hasPermission('STATES_VIEW') || hasPermission('STATES_CREATE') || hasPermission('STATES_EDIT') || hasPermission('STATES_DELETE') ||
                      hasPermission('ROLES_VIEW') || hasPermission('ROLES_CREATE') || hasPermission('ROLES_EDIT') || hasPermission('ROLES_DELETE') ||
                      hasPermission('PERMISSIONS_VIEW') || hasPermission('PERMISSIONS_CREATE') || hasPermission('PERMISSIONS_EDIT') || hasPermission('PERMISSIONS_DELETE') ||
                      hasPermission('DOCX_TEMPLATES_VIEW') || hasPermission('DOCX_TEMPLATES_CREATE') || hasPermission('DOCX_TEMPLATES_EDIT') || hasPermission('DOCX_TEMPLATES_DELETE') ||
                      hasPermission('CASH_BOOKS_VIEW') || hasPermission('CASH_BOOKS_CREATE') || hasPermission('CASH_BOOKS_EDIT') || hasPermission('CASH_BOOKS_DELETE')
                    ) && (
                      <MenuDropdownItem 
                        to="/dictionaries" 
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faBook} /> Číselníky
                      </MenuDropdownItem>
                    )}
                    {(hasPermission('USER_VIEW') || hasPermission('USER_MANAGE') || (hasAdminRole && hasAdminRole())) && (
                      <MenuDropdownItem 
                        to="/users" 
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faUsers} /> Uživatelé
                      </MenuDropdownItem>
                    )}
                    {(userDetail?.roles && userDetail.roles.some(role => role.kod_role === 'SUPERADMIN')) && (
                      <MenuDropdownItem 
                        to="/organization-hierarchy" 
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faSitemap} /> Systém workflow a notifikací
                      </MenuDropdownItem>
                    )}
                    {(userDetail?.roles && userDetail.roles.some(role => role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR')) && (
                      <MenuDropdownItem 
                        to="/app-settings" 
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faCog} /> Nastavení aplikace
                      </MenuDropdownItem>
                    )}
                  </MenuDropdownContent>,
                  document.body
                )}
              </MenuDropdownWrapper>
            ) }
            { (hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('PHONEBOOK_VIEW')) ? (
              <MenuLinkLeft to="/contacts" $active={isActive('/contacts')}>
                <FontAwesomeIcon icon={faAddressBook} /> Kontakty
              </MenuLinkLeft>
            ) : null }
            
            {/* Přehled menu - pro ADMINI nebo uživatele se všemi třemi právy */}
            { (hasAdminRole && hasAdminRole()) || hasAllThreePermissions ? (
              <MenuDropdownWrapper>
                <MenuDropdownButton 
                  ref={prehledButtonRef}
                  onClick={() => {
                    if (!prehledMenuOpen && prehledButtonRef.current) {
                      const rect = prehledButtonRef.current.getBoundingClientRect();
                      setPrehledDropdownPosition({
                        top: rect.bottom + 5,
                        left: rect.left,
                        width: rect.width
                      });
                    }
                    setPrehledMenuOpen(!prehledMenuOpen);
                  }}
                  data-open={prehledMenuOpen}
                >
                  <FontAwesomeIcon icon={faList} /> Přehled
                  <span className="chevron" style={{fontSize: '0.7em', marginLeft: '0.5em', fontWeight: 'bold'}}>
                    {prehledMenuOpen ? '▴' : '▾'}
                  </span>
                </MenuDropdownButton>
                {prehledMenuOpen && ReactDOM.createPortal(
                  <MenuDropdownContent 
                    ref={prehledMenuRef}
                    $open={prehledMenuOpen}
                    style={{
                      top: `${prehledDropdownPosition.top}px`,
                      left: `${prehledDropdownPosition.left}px`,
                      minWidth: `${prehledDropdownPosition.width}px`
                    }}
                  >
                    {/* Objednávky - zobrazit vždy (nebo když jsou enabled) */}
                    {moduleSettings.module_orders_visible && (
                      <MenuDropdownItem 
                        to="/orders25-list" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} fixedWidth /> Objednávky
                      </MenuDropdownItem>
                    )}
                    
                    {/* Objednávky V3 - zobrazit když enabled */}
                    {moduleSettings.module_orders_v3_visible && (
                      <MenuDropdownItem 
                        to="/orders25-list-v3" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} fixedWidth style={{color: '#3b82f6'}} /> Objednávky (V3)
                      </MenuDropdownItem>
                    )}
                    
                    {/* Faktury - zobrazit když enabled */}
                    {moduleSettings.module_invoices_visible && (
                      <MenuDropdownItem 
                        to="/invoices25-list" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} fixedWidth /> Faktury
                      </MenuDropdownItem>
                    )}
                    
                    {/* Majetek - pro uživatele s ASSET oprávněním (v submenu = jen "Majetek") */}
                    {((hasAdminRole && hasAdminRole()) || hasAssetMenuAccess) && (
                      <MenuDropdownItem 
                        to="/majetek-overview" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faList} fixedWidth style={{color: '#6366f1'}} /> Majetek
                      </MenuDropdownItem>
                    )}
                    
                    {/* Roční poplatky - zobrazit když enabled */}
                    {moduleSettings.module_annual_fees_visible && (
                      <MenuDropdownItem 
                        to="/annual-fees" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faMoneyBill} fixedWidth style={{color: '#10b981'}} /> Roční poplatky
                      </MenuDropdownItem>
                    )}

                    {/* Staré objednávky - vždy zobrazit */}
                    <MenuDropdownItem 
                      to="/orders" 
                      onClick={() => setPrehledMenuOpen(false)}
                    >
                      <FontAwesomeIcon icon={faFileInvoice} fixedWidth /> Objednávky (&lt; 2026)
                    </MenuDropdownItem>

                    {/* --- DISABLED MODULY (jen pro admin/BETA_TESTER) - na konci --- */}
                    {!moduleSettings.module_orders_visible && ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('BETA_TESTER'))) && (
                      <MenuDropdownItem 
                        to="/orders25-list" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} fixedWidth style={{color: '#f59e0b'}} /> Objednávky <span style={{fontSize: '0.7em', color: '#ef4444'}}>(BETA)</span>
                      </MenuDropdownItem>
                    )}
                    
                    {!moduleSettings.module_orders_v3_visible && ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('BETA_TESTER'))) && (
                      <MenuDropdownItem 
                        to="/orders25-list-v3" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} fixedWidth style={{color: '#3b82f6'}} /> Objednávky (V3) <span style={{fontSize: '0.7em', color: '#ef4444'}}>(BETA)</span>
                      </MenuDropdownItem>
                    )}
                    
                    {!moduleSettings.module_invoices_visible && ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('BETA_TESTER'))) && (
                      <MenuDropdownItem 
                        to="/invoices25-list" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} fixedWidth style={{color: '#10b981'}} /> Faktury <span style={{fontSize: '0.7em', color: '#ef4444'}}>(BETA)</span>
                      </MenuDropdownItem>
                    )}
                    
                    {!moduleSettings.module_annual_fees_visible && ((hasAdminRole && hasAdminRole()) || (hasPermission && hasPermission('BETA_TESTER'))) && (
                      <MenuDropdownItem 
                        to="/annual-fees" 
                        onClick={() => setPrehledMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faMoneyBill} fixedWidth style={{color: '#10b981'}} /> Roční poplatky <span style={{fontSize: '0.7em', color: '#ef4444'}}>(BETA)</span>
                      </MenuDropdownItem>
                    )}
                  </MenuDropdownContent>,
                  document.body
                )}
              </MenuDropdownWrapper>
            ) : null }
            
            {/* Menu položky pro přehledy - skryto pro ADMINI a uživatele se všemi třemi právy */}
            { !((hasAdminRole && hasAdminRole()) || hasAllThreePermissions) && ((hasPermission && (hasPermission('INVOICE_MANAGE') || hasPermission('INVOICE_VIEW')))) && moduleSettings.module_invoices_visible && (
              <MenuLinkLeft to="/invoices25-list" $active={isActive('/invoices25-list')}>
                <FontAwesomeIcon icon={faFileInvoice} /> Faktury - přehled
              </MenuLinkLeft>
            ) }
            { !((hasAdminRole && hasAdminRole()) || hasAllThreePermissions) && hasPermission && (hasPermission('ORDER_MANAGE') || hasPermission('ORDER_OLD')) && (
              <MenuLinkLeft to="/orders" $active={isActive('/orders')}>
                <FontAwesomeIcon icon={faFileInvoice} /> Objednávky (&lt; 2026)
              </MenuLinkLeft>
            ) }
            { !((hasAdminRole && hasAdminRole()) || hasAllThreePermissions) && hasPermission && (hasPermission('ORDER_MANAGE') || hasPermission('ORDER_2025')) && moduleSettings.module_orders_visible && (
              <MenuLinkLeft to="/orders25-list" $active={isActive('/orders25-list')}>
                <FontAwesomeIcon icon={faFileInvoice} /> Objednávky - přehled
              </MenuLinkLeft>
            ) }
            { !((hasAdminRole && hasAdminRole()) || hasAllThreePermissions) && hasPermission && (hasPermission('ORDER_MANAGE') || hasPermission('ORDER_2025')) && moduleSettings.module_orders_v3_visible && (
              <MenuLinkLeft to="/orders25-list-v3" $active={isActive('/orders25-list-v3')}>
                <FontAwesomeIcon icon={faRocket} style={{color: '#3b82f6'}} /> Objednávky (V3)
              </MenuLinkLeft>
            ) }

            {!hasAnalyticsManagePermission && canAccessCerpani && (
              <MenuLinkLeft to="/cerpani" $active={isActive('/cerpani')}>
                <FontAwesomeIcon icon={faMoneyBill} /> Čerpání
              </MenuLinkLeft>
            )}

            {/* Přehled majetku - standalone link pro uživatele bez Přehled dropdown */}
            { !((hasAdminRole && hasAdminRole()) || hasAllThreePermissions) && hasAssetMenuAccess && (
              <MenuLinkLeft to="/majetek-overview" $active={isActive('/majetek-overview')}>
                <FontAwesomeIcon icon={faList} style={{color: '#6366f1'}} /> Přehled majetku
              </MenuLinkLeft>
            )}
            
            {/* Manažerské analýzy - zobrazit pokud má právo k reportům nebo statistikám */}
            { hasAnalyticsManagePermission && (
              <MenuDropdownWrapper>
                <MenuDropdownButton 
                  ref={analyticsButtonRef}
                  onClick={() => {
                    if (!analyticsMenuOpen && analyticsButtonRef.current) {
                      const rect = analyticsButtonRef.current.getBoundingClientRect();
                      setDropdownPosition({
                        top: rect.bottom + 5,
                        left: rect.left,
                        width: rect.width
                      });
                    }
                    setAnalyticsMenuOpen(!analyticsMenuOpen);
                  }}
                  data-open={analyticsMenuOpen}
                >
                  <FontAwesomeIcon icon={faChartBar} /> Manažerské analýzy
                  <span className="chevron" style={{fontSize: '0.7em', marginLeft: '0.5em', fontWeight: 'bold'}}>
                    {analyticsMenuOpen ? '▴' : '▾'}
                  </span>
                </MenuDropdownButton>
                {analyticsMenuOpen && ReactDOM.createPortal(
                  <MenuDropdownContent 
                    ref={analyticsMenuRef}
                    $open={analyticsMenuOpen}
                    style={{
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      minWidth: `${dropdownPosition.width}px`
                    }}
                  >
                    {canAccessCerpani && (
                      <MenuDropdownItem 
                        to="/cerpani" 
                        onClick={() => setAnalyticsMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faMoneyBill} /> Čerpání
                      </MenuDropdownItem>
                    )}
                    {/* Statistika a reporty - nový modul nahrazující Reporty + Statistiky */}
                    {((typeof hasAdminRole === 'function' && hasAdminRole()) || (
                      hasPermission('FIN_CONTROL_VIEW') || hasPermission('FIN_CONTROL_EDIT') || hasPermission('FIN_CONTROL_MANAGE') ||
                      hasPermission('EDUCATION_VIEW') || hasPermission('EDUCATION_EDIT') || hasPermission('EDUCATION_MANAGE') ||
                      hasPermission('ATTACHMENTS_VIEW') || hasPermission('ATTACHMENTS_MANAGE') ||
                      hasPermission('PIVOT_VIEW') || hasPermission('PIVOT_EDIT') || hasPermission('PIVOT_MANAGE') ||
                      hasPermission('REPORT_VIEW') || hasPermission('REPORT_EDIT') || hasPermission('REPORT_MANAGE') ||
                      hasPermission('STATISTICS_VIEW') || hasPermission('STATISTICS_EDIT') || hasPermission('STATISTICS_MANAGE') ||
                      hasPermission('SPENDING_VIEW_ALL') || hasPermission('SPENDING_VIEW_OWN') || hasPermission('SPENDING_MANAGE')
                    )) && (
                      <MenuDropdownItem 
                        to="/stats-reports" 
                        onClick={() => setAnalyticsMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faChartBar} /> Statistika a reporty
                      </MenuDropdownItem>
                    )}
                  </MenuDropdownContent>,
                  document.body
                )}
              </MenuDropdownWrapper>
            ) }
            
            {/* 🚀 BETA menu - nové/experimentální funkce - pro ADMIN a BETA_TESTER */}
            {hasBetaMenuAccess && (
              <MenuDropdownWrapper>
                <MenuDropdownButton 
                  ref={betaButtonRef}
                  onClick={() => {
                    if (!betaMenuOpen && betaButtonRef.current) {
                      const rect = betaButtonRef.current.getBoundingClientRect();
                      setBetaDropdownPosition({
                        top: rect.bottom + 5,
                        left: rect.left,
                        width: rect.width
                      });
                    }
                    setBetaMenuOpen(!betaMenuOpen);
                  }}
                  data-open={betaMenuOpen}
                  style={{
                    background: betaMenuOpen 
                      ? 'linear-gradient(90deg, transparent 0 33.333%, rgba(59,130,246,0.25) 33.333% 100%)'
                      : 'transparent'
                  }}
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.6rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                    letterSpacing: '0.5px'
                  }}>
                    <FontAwesomeIcon icon={faFlask} style={{ fontSize: '0.9rem' }} />
                    BETA
                  </span>
                  <span className="chevron" style={{fontSize: '0.7em', marginLeft: '0.5em', fontWeight: 'bold'}}>
                    {betaMenuOpen ? '▴' : '▾'}
                  </span>
                </MenuDropdownButton>
                {betaMenuOpen && ReactDOM.createPortal(
                  <MenuDropdownContent 
                    ref={betaMenuRef}
                    $open={betaMenuOpen}
                    style={{
                      top: `${betaDropdownPosition.top}px`,
                      left: `${betaDropdownPosition.left}px`,
                      minWidth: `${betaDropdownPosition.width}px`
                    }}
                  >
                    {hasBetaMenuAccess && !moduleSettings.module_orders_v3_visible && (
                      <MenuDropdownItem 
                        to="/orders25-list-v3" 
                        onClick={() => setBetaMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} style={{color: '#3b82f6'}} /> Objednávky (V3)
                      </MenuDropdownItem>
                    )}
                    {hasBetaMenuAccess && !moduleSettings.module_orders_visible && hasPermission && (hasPermission('ORDER_MANAGE') || hasPermission('ORDER_2025')) && (
                      <MenuDropdownItem 
                        to="/orders25-list" 
                        onClick={() => setBetaMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} style={{color: '#f59e0b'}} /> Objednávky - přehled
                      </MenuDropdownItem>
                    )}
                    {hasBetaMenuAccess && !moduleSettings.module_invoices_visible && hasPermission && (hasPermission('INVOICE_MANAGE') || hasPermission('INVOICE_VIEW')) && (
                      <MenuDropdownItem 
                        to="/invoices25-list" 
                        onClick={() => setBetaMenuOpen(false)}
                      >
                        <FontAwesomeIcon icon={faFileInvoice} style={{color: '#10b981'}} /> Faktury - přehled
                      </MenuDropdownItem>
                    )}
                    
                    {/* Pokud nejsou žádné beta moduly, zobrazit placeholder */}
                    {moduleSettings.module_orders_v3_visible && 
                     moduleSettings.module_orders_visible && 
                     moduleSettings.module_invoices_visible && 
                     moduleSettings.module_annual_fees_visible && !hasBetaMenuAccess && (
                      <>
                        <div style={{
                          padding: '1rem',
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: '0.9rem',
                          fontStyle: 'italic'
                        }}>
                          Žádné beta verze k dispozici
                        </div>
                        <div style={{
                          borderTop: '1px solid #e5e7eb',
                          margin: '0.5rem 0'
                        }} />
                        <MenuDropdownItem 
                          to="/access-denied" 
                          onClick={() => setBetaMenuOpen(false)}
                        >
                          <FontAwesomeIcon icon={faLock} style={{color: '#dc2626'}} /> Test: Přístup zamítnut
                        </MenuDropdownItem>
                        <MenuDropdownItem 
                          to="/not-found-test" 
                          onClick={() => setBetaMenuOpen(false)}
                        >
                          <FontAwesomeIcon icon={faExclamationTriangle} style={{color: '#f59e0b'}} /> Test: Stránka nenalezena
                        </MenuDropdownItem>
                      </>
                    )}
                  </MenuDropdownContent>,
                  document.body
                )}
              </MenuDropdownWrapper>
            ) }
          </MenuLeft>
          <MenuRight>
            {/* Pokladna - Cash Book */}
            {/* Zobrazit pokud: Admin/SuperAdmin NEBO má jakékoliv CASH_BOOK oprávnění */}
            { showCashBookButton && (
              <SmartTooltip text="Správa pokladní knihy" icon="info" preferredPosition="bottom">
                <CashBookLink to="/cash-book">
                  <FontAwesomeIcon icon={faCalculator} style={{ fontSize:'1em' }} />
                  Pokladna
                </CashBookLink>
              </SmartTooltip>
            ) }

            {/* Zaevidovat fakturu */}
            {/* Zobrazit pokud: má oprávnění INVOICE_MANAGE */}
            {hasPermission && hasPermission('INVOICE_MANAGE') && (
              <SmartTooltip 
                text={location.pathname === '/invoice-evidence' ? 'Evidence faktury již otevřena' : 'Zaevidovat novou fakturu'} 
                icon={location.pathname === '/invoice-evidence' ? 'info' : 'success'} 
                preferredPosition="bottom"
              >
                <InvoiceCreateLink 
                  to={location.pathname === '/invoice-evidence' ? '#' : '/invoice-evidence'}
                  onClick={(e) => {
                    if (location.pathname === '/invoice-evidence') { 
                      e.preventDefault(); 
                      return; 
                    }
                  }}
                  data-inactive={location.pathname === '/invoice-evidence' ? 'true' : 'false'}
                  style={{
                    pointerEvents: location.pathname === '/invoice-evidence' ? 'none' : undefined
                  }}
                >
                  <FontAwesomeIcon icon={faFileInvoice} style={{ fontSize:'1em' }} />
                  Zaevidovat fakturu
                </InvoiceCreateLink>
              </SmartTooltip>
            )}

            {/* JEDNODUCHÁ struktura: Link > ikona + text */}
            {hasPermission && (hasPermission('ORDER_CREATE') || hasPermission('ORDER_SAVE')) && (
            <SmartTooltip
              text={location.pathname === '/order-form-25' ? 'Formulář již otevřen' : (() => {
                if (hasDraftOrder && !isOrderEditMode) {
                  return 'Pokračovat v konceptu objednávky';
                }
                if (isOrderEditMode && editOrderNumber) {
                  return `Editovat objednávku ${editOrderNumber}`;
                } else if (isOrderEditMode) {
                  return 'Editovat aktuální objednávku';
                }
                return 'Vytvořit novou objednávku';
              })()}
              icon={(() => {
                if (location.pathname === '/order-form-25') return 'info';
                if (isOrderEditMode) return 'database';
                if (hasDraftOrder && !isOrderEditMode) return 'time';
                return 'success';
              })()}
              preferredPosition="bottom"
            >
            <NewOrderLink
              to={location.pathname === '/order-form-25' ? '#' : '/order-form-25'}
              onClick={(e) => {
                if (location.pathname === '/order-form-25') { e.preventDefault(); return; }
                try { resetProgress(); } catch(e) {}
                window.dispatchEvent(new CustomEvent('orderDraftInternal', { detail: { action: 'reload-draft' } }));
              }}
              title=""
              data-status={location.pathname === '/order-form-25'
                ? 'inactive'
                : (() => {
                    if (isOrderEditMode) return 'edit';
                    if (!hasDraftOrder || orderPhaseInfo.isZrusena) return 'new';
                    return 'draft';
                  })()}
              data-inactive={location.pathname === '/order-form-25' ? 'true' : 'false'}
              style={{
                pointerEvents: location.pathname === '/order-form-25' ? 'none' : undefined
              }}
            >
              <FontAwesomeIcon icon={(() => {
                // Pokud má draft nebo je v edit režimu → Edit ikona
                if (hasDraftOrder || isOrderEditMode) {
                  return faEdit;
                }

                // Jinak plus (nová objednávka)
                return faPlus;
              })()} style={{ fontSize:'1em' }} />
              {(() => {
                // 1. Pokud má draft a NENÍ v edit režimu → "Koncept objednávka"
                if (hasDraftOrder && !isOrderEditMode) {
                  return 'Koncept objednávka';
                }

                // 2. Pokud je v edit režimu → "Editace objednávky" (bez čísla v menu)
                if (isOrderEditMode) {
                  return 'Editace objednávky';
                }

                // 3. Jinak "Nová objednávka"
                return 'Nová objednávka';
              })()}

            </NewOrderLink>
            </SmartTooltip>
            )}
            {/* Notifications - 100% Backend API */}
            <NotificationBellWrapper
              userId={user_id}
            />
            <SmartTooltip text="Zobrazit a upravit profil uživatele" icon="info" preferredPosition="bottom">
              <MenuIconLink to="/profile" title="">
                <FontAwesomeIcon icon={faUser} />
              </MenuIconLink>
            </SmartTooltip>
            <SmartTooltip text="Nápověda" icon="info" preferredPosition="bottom">
              <MenuIconLink to="/help" title="">
                <FontAwesomeIcon icon={faQuestionCircle} />
              </MenuIconLink>
            </SmartTooltip>
            <SmartTooltip text="O aplikaci" icon="info" preferredPosition="bottom">
              <MenuIconLink to="/about" title="">
                <FontAwesomeIcon icon={faInfoCircle} />
              </MenuIconLink>
            </SmartTooltip>
            <SmartTooltip text="Odhlásit se z aplikace" icon="error" preferredPosition="bottom">
              <LogoutButton type="button" onClick={handleLogoutClick} title="">
                <FontAwesomeIcon icon={faSignOutAlt} />
              </LogoutButton>
            </SmartTooltip>
          </MenuRight>
        </MenuBar>
      )}
  <Content $formView={location.pathname === '/orders-new' || location.pathname === '/order-form-25'} $unauth={!isLoggedIn}>
        {children}
      </Content>

      {/* Fullscreen sticky NOTES overlay – dle oprávnění (DB + fallback LocalStorage) */}
      {isLoggedIn && canUseStickyNotes && (
        <StickyNotesOverlay
          open={stickyNotesOpen}
          onClose={() => setStickyNotesOpen(false)}
          storageKey={`eeo_v2_sticky_notes_overlay_v1_${user_id || 'anon'}`}
          apiAuth={{ token, username, userId: user_id }}
        />
      )}
      {isLoggedIn && (
        <FabGroup>
      {/* Shared change-password dialog from top menu */}
      <ChangePasswordDialog
        open={pwdOpen}
        onClose={()=> { setPwdOpen(false); setPwdError(''); }}
        loading={pwdLoading}
        error={pwdError}
        onSubmit={async ({ oldPassword, newPassword }) => {
          if (!user?.username || !token) { setPwdError('Nejste přihlášen.'); return; }
          try {
            setPwdLoading(true); setPwdError('');
            await changePasswordApi2({ token, username: user.username, oldPassword, newPassword });
            setPwdLoading(false); setPwdOpen(false);
            try { showToast('Heslo bylo úspěšně změněno.', { type: 'success' }); } catch {}
          } catch (e) {
            setPwdLoading(false); setPwdError(e?.message || 'Změna hesla selhala.');
            try { showToast(e?.message || 'Změna hesla selhala.', { type: 'error' }); } catch {}
          }
        }}
      />
          {/* NOTES TOOL BUTTON - conditional visibility */}
          {toolsVisibility.notes && (
          <SmartTooltip
            text={notesOpen ? 'Skrýt Poznámky' : 'Otevřít Poznámky'}
            icon="info"
            preferredPosition="left"
          >
            <RoundFab
              type="button"
              onClick={()=> {
                // Standardní logika toggle (kontrola podpory je v NotesPanel při kliknutí na mikrofon)
                setNotesOpen(o=> {
                  const next=!o;
                  if(next) {
                    setEngagedPair(true);
                    setHoveredPanel(null);
                    bringPanelFront('notes');
                  } else if(!todoOpen && !chatOpen) {
                    setEngagedPair(false);
                  }
                  return next;
                });
              }}
              style={{
                background: notesRecording ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#ca8a04',
                position: 'relative',
                animation: notesRecording ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
                opacity: notesRecording ? 1 : 0.35  // PLNÁ VIDITELNOST při nahrávání!
              }}
            >
            {/* Ikona - StickyNote nebo Mikrof při nahrávání */}
            <FontAwesomeIcon
              icon={notesRecording ? faMicrophone : faStickyNote}
              style={{
                fontSize: notesRecording ? '1.3em' : '1.1em',
                color: '#ffffff',  // ČISTĚ BÍLÁ
                opacity: 1,  // ŽÁDNÁ TRANSPARENTNOST
                filter: notesRecording ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.6)) brightness(1.2)' : undefined
              }}
            />

            {/* Indikátor: malá tečka když jsou poznámky neprázdné */}
            {!notesOpen && notesText && typeof notesText === 'string' && notesText.trim().length > 0 && !notesRecording && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '50%',
                width: '10px',
                height: '10px',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.5)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
              />
            )}
          </RoundFab>
          </SmartTooltip>
          )}
          {/* TODO TOOL BUTTON - conditional visibility */}
          {toolsVisibility.todo && (
          <SmartTooltip
            text={todoOpen ? 'Skrýt TODO' : 'Otevřít TODO seznam'}
            icon="info"
            preferredPosition="left"
          >
            <RoundFab type="button" onClick={()=> setTodoOpen(o=> { const next=!o; if(next) { setEngagedPair(true); setHoveredPanel(null); bringPanelFront('todo'); } else if(!notesOpen && !chatOpen) { setEngagedPair(false); } return next; })} style={{ background:'#2563eb', position: 'relative' }}>
            <FontAwesomeIcon icon={faTasks} />
            {/* Badge vlevo - počet aktivních alarmů */}
            {!todoOpen && activeAlarmsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                left: '-6px',
                background: 'linear-gradient(135deg, #fb923c, #f97316)',
                color: 'white',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(249, 115, 22, 0.4)'
              }}>
                ⏰
              </span>
            )}
            {/* Badge vpravo - počet nedokončených úkolů */}
            {!todoOpen && unfinishedTasksCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: '#dc2626',
                color: 'white',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                border: '2px solid white'
              }}>
                {unfinishedTasksCount > 99 ? '99+' : unfinishedTasksCount}
              </span>
            )}
          </RoundFab>
          </SmartTooltip>
          )}
          {/* CHAT TOOL BUTTON - conditional visibility */}
          {toolsVisibility.chat && (
          <SmartTooltip
            text={chatOpen ? 'Skrýt Chat' : 'Otevřít Chat'}
            icon="info"
            preferredPosition="left"
          >
            <RoundFab type="button" onClick={()=> setChatOpen(o=> { const next=!o; if(next) { setEngagedPair(true); setHoveredPanel(null); bringPanelFront('chat'); } else if(!notesOpen && !todoOpen) { setEngagedPair(false); } return next; })} style={{ background:'#16a34a', position: 'relative' }}>
            <FontAwesomeIcon icon={faComments} />
            {unreadChatCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: '#dc2626',
                color: 'white',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                border: '2px solid white'
              }}>
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </RoundFab>
          </SmartTooltip>
          )}

          {/* FINANCIAL CALCULATOR - conditional visibility */}
          {toolsVisibility.kalkulacka && (
          <SmartTooltip
            text={(() => {
              const baseTitle = calculatorOpen ? 'Skrýt kalkulačku' : 'Otevřít finanční kalkulačku';
              const resultText = calculatorLastResult ? `\nPosledný výsledek: ${calculatorLastExpression} = ${calculatorLastResult}` : '';
              return baseTitle + resultText;
            })()}
            icon="info"
            preferredPosition="left"
          >
            <RoundFab
              type="button"
              onClick={() => setCalculatorOpen(o => !o)}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              <FontAwesomeIcon icon={faSquareRootAlt} />
            </RoundFab>
          </SmartTooltip>
          )}

          {/* Floating button pro správu pokladny - VLEVO od faktury */}
          {(
            (userDetail?.roles && userDetail.roles.some(role => role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR')) ||
            (hasPermission && (
              hasPermission('CASH_BOOK_MANAGE') ||
              hasPermission('CASH_BOOK_READ_ALL') ||
              hasPermission('CASH_BOOK_READ_OWN') ||
              hasPermission('CASH_BOOK_EDIT_ALL') ||
              hasPermission('CASH_BOOK_EDIT_OWN') ||
              hasPermission('CASH_BOOK_DELETE_ALL') ||
              hasPermission('CASH_BOOK_DELETE_OWN') ||
              hasPermission('CASH_BOOK_EXPORT_ALL') ||
              hasPermission('CASH_BOOK_EXPORT_OWN') ||
              hasPermission('CASH_BOOK_CREATE')
            ))
          ) && (
            <SmartTooltip
              text="Správa pokladní knihy"
              icon="success"
              preferredPosition="left"
            >
              <GlobalCashBookBtn
                to="/cash-book"
                aria-label="Pokladní kniha"
                title=""
              >
                <FontAwesomeIcon icon={faCalculator} />
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#10b981',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '700',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  pointerEvents: 'none'
                }}>+</span>
              </GlobalCashBookBtn>
            </SmartTooltip>
          )}

          {/* Floating button pro zaevidování faktury - VLEVO od objednávky */}
          {hasPermission && hasPermission('INVOICE_MANAGE') && (
            <SmartTooltip
              text={location.pathname === '/invoice-evidence' ? 'Evidence faktury již otevřena' : 'Zaevidovat novou fakturu'}
              icon={location.pathname === '/invoice-evidence' ? 'info' : 'success'}
              preferredPosition="left"
            >
              <GlobalInvoiceBtn
                to={location.pathname === '/invoice-evidence' ? '#' : '/invoice-evidence'}
                aria-label="Zaevidovat fakturu"
                title=""
                onClick={(e) => {
                  if (location.pathname === '/invoice-evidence') { 
                    e.preventDefault(); 
                    return; 
                  }
                }}
                data-inactive={location.pathname === '/invoice-evidence' ? 'true' : 'false'}
                style={{ 
                  pointerEvents: location.pathname === '/invoice-evidence' ? 'none' : undefined
                }}
              >
                <FontAwesomeIcon icon={faFileInvoice} />
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#10b981',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '700',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  pointerEvents: 'none'
                }}>+</span>
              </GlobalInvoiceBtn>
            </SmartTooltip>
          )}

          {/* FLOATING IKONA OBJEDNÁVKY - VPRAVO od faktury */}
          <SmartTooltip
            text={(() => {
              // Jednodušší logika: Nova pouze když je zrušená nebo nemá draft
              if (!hasDraftOrder || orderPhaseInfo.isZrusena) {
                return 'Vytvořit novou objednávku';
              }

              // Pokud má draft a není v edit režimu → Koncept
              if (hasDraftOrder && !isOrderEditMode) {
                return 'Pokračovat v konceptu objednávky';
              }

              // Pokud je v edit režimu → Edit
              if (isOrderEditMode) {
                const cisloObjednavky = editOrderNumber ||
                                      (editOrderId ? `O-${editOrderId.toString().padStart(4, '0')}-2025-ZZS-EEO` : null);
                return cisloObjednavky ? (
                  <span>
                    Editovat objednávku <span style={{whiteSpace: 'nowrap'}}>{cisloObjednavky}</span>
                  </span>
                ) : 'Editovat aktuální objednávku';
              }

              return 'Vytvořit novou objednávku';
            })()}
            icon={(() => {
              if (isOrderEditMode) return 'database';
              if (!hasDraftOrder || orderPhaseInfo.isZrusena) return 'success';
              if (hasDraftOrder && !isOrderEditMode) return 'time';
              return 'success';
            })()}
            preferredPosition="left"
          >
            <GlobalAddBtn
              to="/order-form-25"
              aria-label={(() => {
                // Jednodušší logika: Nova pouze když je zrušená nebo nemá draft
                if (!hasDraftOrder || orderPhaseInfo.isZrusena) {
                  return 'Nová objednávka';
                }

                // Pokud má draft nebo je v edit režimu → Edit
                if (hasDraftOrder || isOrderEditMode || orderPhaseInfo.phase > 1) {
                  // Pro aria-label použij editOrderNumber pokud je k dispozici
                  const cisloObjednavky = editOrderNumber ||
                                        (editOrderId ? `O-${editOrderId.toString().padStart(4, '0')}-2025-ZZS-EEO` : null);
                  // Poznámka: aria-label nemůže obsahovat JSX, používáme string
                  return cisloObjednavky ? `Editace objednávky ${cisloObjednavky}` : 'Editace objednávky';
                }

                return 'Nová objednávka';
              })()}
              title=""
              onClick={() => {
                try { resetProgress(); } catch(e) {}
                window.dispatchEvent(new CustomEvent('orderDraftInternal', { detail: { action: 'reload-draft' } }));
              }}
              data-status={(() => {
                if (isOrderEditMode) return 'edit';
                if (!hasDraftOrder || orderPhaseInfo.isZrusena) return 'new';
                return 'draft';
              })()}
              style={{ position:'static' }}
            >
              <FontAwesomeIcon icon={(() => {
                // Edit ma prednost pred zrusenou/bez draftu
                if (isOrderEditMode) {
                  return faEdit;
                }

                // Jednodušší logika ikony - plus jen když je zrušená nebo nemá draft
                if (!hasDraftOrder || orderPhaseInfo.isZrusena) {
                  return faPlus; // Nová objednávka (pouze když zrušená nebo bez draftu)
                }

                // Pokud má draft nebo je v edit režimu → Edit ikona
                if (hasDraftOrder || orderPhaseInfo.phase > 1) {
                  return faEdit;
                }

                // Fallback plus (nová objednávka)
                return faPlus;
              })()} />
            </GlobalAddBtn>
          </SmartTooltip>
        </FabGroup>
      )}
      {/* duplicate dialog removed - single instance mounted earlier in FabGroup */}

      {todoOpen && (
        <TodoPanel
          state={todoPanelState}
          font={todoFont}
          tasks={tasks}
          newTask={newTask}
          setNewTask={setNewTask}
          addTask={addTask}
          toggleTask={toggleTaskWithAlarmCleanup}
          removeTask={removeTask}
          reorderTasks={reorderTasks}
          updateTaskAlarm={updateTaskAlarm}
          updateTaskPriority={updateTaskPriority}
          clearDone={clearDone}
          clearAllTasks={clearAllTasks}
          importTasks={importTasks}
          onClose={()=>{ setTodoOpen(false); if (!notesOpen && !chatOpen) { setEngagedPair(false); setHoveredPanel(null); } }}
          adjustFont={adjTodo}
          bringFront={()=>engageTodoNotes('todo')}
          beginDrag={beginPanelDrag}
          panelZ={panelZ.todo}
          isActive={engagedPair}
          hovered={hoveredPanel === 'todo'}
          opacityConfig={{ base: basePanelOpacity, hover: hoverPanelOpacity, engaged: engagedOpacity }}
          onHoverEnter={()=>{ if(!engagedPair) setHoveredPanel('todo'); }}
          onHoverLeave={()=>{ if(hoveredPanel==='todo' && !engagedPair) setHoveredPanel(null); }}
          onEngage={()=>engageTodoNotes('todo')}
          storageId={user_id || 'anon'}
          autoSaveStatus={autoSaveStatus}
          serverSyncStatus={serverSyncStatus}
          manualSaveTodo={manualSaveTodo}
          refreshFromServer={refreshFromServer}
          formatTime={formatTime}
          minimizePanel={minimizePanel}
          maximizePanel={maximizePanel}
        />
      )}

      {/* TODO Alarm Floating Popups (HIGH priority) */}
      <FloatingAlarmManager
        alarms={activeAlarms}
        onDismiss={handleDismissAlarm}
        onComplete={handleCompleteFromAlarm}
      />

      {notesOpen && (
        <NotesPanel
          state={notesPanelState}
          font={notesFont}
          notesRef={notesRef}
          notesText={notesText}
          transcriptionText={transcriptionText}
          setTranscriptionText={setTranscriptionText}
          onInput={(e)=>{ setNotesText(e.currentTarget.innerHTML); }}
          onPaste={(e)=>{ e.preventDefault(); const text=(e.clipboardData||window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, text); }}
          onClose={()=>{ try { flushNotesSave && flushNotesSave(); } catch {}; setNotesOpen(false); if (!todoOpen && !chatOpen) { setEngagedPair(false); setHoveredPanel(null); } }}
          adjustFont={adjNotes}
          translateToCz={translateToCz}
          setNotesText={setNotesText}
          tasks={tasks}
          showColors={showNotesColors}
          setShowColors={setShowNotesColors}
          NOTES_COLOR_PALETTE={NOTES_COLOR_PALETTE}
          bringFront={()=>engageTodoNotes('notes')}
          beginDrag={beginPanelDrag}
          panelZ={panelZ.notes}
          isActive={engagedPair}
          hovered={hoveredPanel === 'notes'}
          opacityConfig={{ base: basePanelOpacity, hover: hoverPanelOpacity, engaged: engagedOpacity }}
          onHoverEnter={()=>{ if(!engagedPair) setHoveredPanel('notes'); }}
          onHoverLeave={()=>{ if(hoveredPanel==='notes' && !engagedPair) setHoveredPanel(null); }}
          onEngage={()=>engageTodoNotes('notes')}
          storageId={user_id || 'anon'}
          saving={notesSaving}
          lastSaved={notesLastSaved}
          saveError={notesSaveError}
          autoSaveStatus={autoSaveStatus}
          serverSyncStatus={serverSyncStatus}
          manualSaveNotes={manualSaveNotes}
          refreshFromServer={refreshFromServer}
          formatTime={formatTime}
          minimizePanel={minimizePanel}
          maximizePanel={maximizePanel}
          clearAllNotes={clearAllNotes}
          onRecordingChange={setNotesRecording}
          onExternalInsert={(callback) => { notesExternalInsertCallbackRef.current = callback; }}
          globalVoiceRecognition={globalVoice}
        />
      )}
      {chatOpen && (
        <ChatPanel
          state={chatPanelState}
          font={chatFont}
          chatMessages={chatMessages}
          newChatMessage={newChatMessage}
          setNewChatMessage={setNewChatMessage}
          addChatMessage={addChatMessage}
          clearChatMessages={clearChatMessages}
          markChatMessagesRead={markChatMessagesRead}
          onClose={()=>{ setChatOpen(false); if (!todoOpen && !notesOpen) { setEngagedPair(false); setHoveredPanel(null); } }}
          adjustFont={adjChat}
          bringFront={() => bringPanelFront('chat')}
          beginDrag={beginPanelDrag}
          panelZ={panelZ.chat}
          isActive={engagedPair}
          hovered={hoveredPanel === 'chat'}
          opacityConfig={{
            base: 0.95,
            hover: 0.98
          }}
          onHoverEnter={()=>{ if(!engagedPair) setHoveredPanel('chat'); }}
          onHoverLeave={()=>{ if(hoveredPanel==='chat' && !engagedPair) setHoveredPanel(null); }}
        />
      )}
      {/* Notifications bubble is rendered inline next to the bell icon above */}
      <Footer $transparent={!isLoggedIn}>
        <FooterLeft>
          {isLoggedIn && <CurrencyTicker />}
        </FooterLeft>
        <FooterCenter>
          <span style={{ display: 'block', textAlign: 'center', lineHeight: '1.5' }}>
            © {process.env.REACT_APP_FOOTER_OWNER || '2025 ZZS SK, p.o., Robert Holovský'} | verze {process.env.REACT_APP_VERSION}
            {' | '}
            <FontAwesomeIcon 
              icon={faPlug} 
              style={{ 
                marginRight: '0.35rem', 
                color: (process.env.REACT_APP_API2_BASE_URL || '').includes('/dev/') ? '#ff6b6b' : '#94a3b8',
                fontSize: '0.8em'
              }} 
            />
            <span style={{ 
              fontFamily: 'monospace', 
              fontSize: '0.85em',
              color: (process.env.REACT_APP_API2_BASE_URL || '').includes('/dev/') ? '#ff6b6b' : '#94a3b8',
              fontWeight: (process.env.REACT_APP_API2_BASE_URL || '').includes('/dev/') ? '700' : '400'
            }}>
              {(() => {
                // Detekce skutečné API cesty
                const isDevelopment = process.env.NODE_ENV === 'development';
                const apiUrl = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
                
                // V npm start (development) se používá setupProxy.js který přesměruje /api.eeo -> /dev/api.eeo
                // V buildu se používá přímá cesta z REACT_APP_API2_BASE_URL
                if (isDevelopment) {
                  return '/dev/api.eeo (proxy)';
                } else if (apiUrl.includes('/dev/')) {
                  return '/dev/api.eeo';
                } else {
                  return '/api.eeo';
                }
              })()}
            </span>
            {' | '}
            <FontAwesomeIcon 
              icon={faDatabase} 
              style={{ 
                marginRight: '0.35rem', 
                color: systemInfo?.environment?.is_dev ? '#22c55e' : '#6366f1',
                fontSize: '0.8em'
              }} 
            />
            <span 
              onClick={async () => {
                try {
                  SystemInfoService.clearCache();
                  const info = await SystemInfoService.getSystemInfo();
                  setSystemInfo(info);
                  if (info?.database?.display_name) {
                    setDatabaseName(info.database.display_name);
                  }
                } catch (error) {
                  console.error('Chyba při refresh system info:', error);
                }
              }}
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '0.85em',
                color: systemInfo?.environment?.is_dev ? '#22c55e' : '#6366f1',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textDecorationColor: 'rgba(255,255,255,0.3)'
              }}
              title="Klikni pro aktualizaci názvu databáze z API"
            >
              {systemInfo?.database?.display_name || 'NAČÍTÁ...'}
            </span>
          </span>
        </FooterCenter>
      </Footer>

      {/* Scroll FAB + Quick Nav – pouze na stránce Statistiky & Reporty */}
      {isLoggedIn && location.pathname.startsWith('/stats-reports') && (
        <div data-stats-nav
          onMouseEnter={() => setStatsNavOpen(true)}
          onMouseLeave={() => { if (!statsNavPinned) setStatsNavOpen(false); }}
          style={{ position: 'fixed', left: '.75rem', bottom: '.75rem', zIndex: 4001, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Quick nav popup */}
          {statsNavOpen && statsNavSections.length > 0 && (
            <div style={{
              position: 'absolute', bottom: '54px', left: 0,
              background: 'rgba(10,18,36,0.78)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '12px', padding: '0.5rem 0 0',
              width: 'max-content', minWidth: '220px', maxWidth: '520px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
              zIndex: 4002,
            }}>
              <div style={{ padding: '0.4rem 0.9rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #334155', marginBottom: '0.3rem' }}>
                Rychlá navigace
              </div>
              {statsNavSections.map((s, i) => (
                <button key={s.key} onClick={() => handleStatsNavItem(s.key)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '0.45rem 0.9rem', background: 'transparent', border: 'none',
                  color: '#e2e8f0', fontSize: '0.85rem', cursor: 'pointer',
                  borderLeft: '3px solid transparent', transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.borderLeftColor = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; e.currentTarget.style.color = '#e2e8f0'; }}
                >
                  <span style={{ color: '#64748b', fontSize: '0.75rem', marginRight: '0.5rem' }}>{i + 1}.</span>
                  {s.label}
                </button>
              ))}
              {/* Bridge – zabraňuje mezeře mezi popupem a čepičkou při přejezdu myší */}
              <div style={{ position: 'absolute', bottom: '-10px', left: 0, right: 0, height: '10px' }} />
            </div>
          )}
          {/* Split FAB: čepička (nav) + tělo (scroll) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '999px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(29,78,216,0.45)' }}>
            {/* Čepička – klik připne panel, hover otvírá */}
            <div
              onClick={() => {
                if (statsNavPinned) { setStatsNavPinned(false); setStatsNavOpen(false); }
                else { setStatsNavPinned(true); setStatsNavOpen(true); }
              }}
              style={{
                width: '40px', height: '14px',
                background: statsNavPinned ? '#7c3aed' : statsNavOpen ? '#1e40af' : '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.15)', transition: 'background 0.15s',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: statsNavPinned ? '8px' : '12px', height: '1.5px', background: '#fff', borderRadius: '1px', display: 'block', transition: 'width 0.15s' }} />
            </div>
            {/* Tělo – scroll ↓/↑ */}
            <RoundFab type="button" onClick={handleScrollFab} style={{
              background: '#1d4ed8', width: '40px', height: '40px',
              borderRadius: 0, boxShadow: 'none',
            }}>
              <FontAwesomeIcon icon={scrollFabAtBottom ? faChevronUp : faChevronDown} />
            </RoundFab>
          </div>
        </div>
      )}

      {/* DEBUG PANEL RE-ENABLED */}
      {canDebug && (
        <DebugDockWrapper>
          {debugOpen && (
            <DebugPanel style={{ width: panelSize.width, height: panelSize.height, left: panelPos.left, top: panelPos.top }}>
              {/* Resize edges */}
              <div onMouseDown={(e)=>beginResize(e,'top')} style={{position:'absolute', top:0, left:8, right:8, height:6, cursor:'ns-resize'}} />
              <div onMouseDown={(e)=>beginResize(e,'right')} style={{position:'absolute', top:8, right:0, bottom:8, width:6, cursor:'ew-resize'}} />
              <div onMouseDown={(e)=>beginResize(e,'bottom')} style={{position:'absolute', left:8, right:8, bottom:0, height:6, cursor:'ns-resize'}} />
              <div onMouseDown={(e)=>beginResize(e,'left')} style={{position:'absolute', top:8, left:0, bottom:8, width:6, cursor:'ew-resize'}} />
              {/* Corners */}
              <div onMouseDown={(e)=>beginResize(e,'top-left')} style={{position:'absolute', top:0, left:0, width:12, height:12, cursor:'nwse-resize'}} />
              <div onMouseDown={(e)=>beginResize(e,'top-right')} style={{position:'absolute', top:0, right:0, width:12, height:12, cursor:'nesw-resize'}} />
              <div onMouseDown={(e)=>beginResize(e,'bottom-right')} style={{position:'absolute', bottom:0, right:0, width:12, height:12, cursor:'nwse-resize'}} />
              <div onMouseDown={(e)=>beginResize(e,'bottom-left')} style={{position:'absolute', bottom:0, left:0, width:12, height:12, cursor:'nesw-resize'}} />
              <DebugPanelHeader onMouseDown={headerMouseDown} style={{cursor:'move', userSelect:'none'}}>
                <span>DEBUG PANEL</span>
                <div style={{display:'flex', gap:'0.4rem', alignItems:'center'}} onMouseDown={(e)=>e.stopPropagation()}>
                  <SmallIconBtn type="button" onClick={()=>setDebugFilterOpen(o=>!o)} title={debugFilterOpen ? 'Skrýt filtr' : 'Zobrazit filtr'}>
                    <FontAwesomeIcon icon={faFilter}/> {debugFilterOpen ? 'Hide' : 'Filter'}
                  </SmallIconBtn>
                  {normalizedFilter && (
                    <span style={{fontSize:'0.55rem', opacity:.6, letterSpacing:'1px'}}>{filteredLogEntries.length}/{logEntries.length}</span>
                  )}
                  <SmallIconBtn type="button" onClick={()=>setDebugFont(f=>Math.min(28, f+1))} title="Zvětšit písmo (A+)">A+</SmallIconBtn>
                  <SmallIconBtn type="button" disabled={debugFont<=8} onClick={()=>setDebugFont(f=>Math.max(8, f-1))} title="Zmenšit písmo (A-)">A-</SmallIconBtn>
                  <SmallIconBtn type="button" onClick={resetPanel} title="Reset panelu"><FontAwesomeIcon icon={faRotateLeft}/>Reset</SmallIconBtn>
                  <SmallIconBtn type="button" onClick={() => collapseAll(!allCollapsed)} title={allCollapsed ? 'Rozbalit všechny logy' : 'Sbalit všechny logy'}>
                    <FontAwesomeIcon icon={allCollapsed ? faPlusSquare : faMinusSquare} />
                  </SmallIconBtn>
                  <SmallIconBtn type="button" onClick={copyAll} title="Kopírovat JSON & logy"><FontAwesomeIcon icon={faCopy}/>Copy</SmallIconBtn>
                  <SmallIconBtn type="button" onClick={clearDebug} title="Vymazat"><FontAwesomeIcon icon={faTrash}/>Vymazat</SmallIconBtn>
                  <SmallIconBtn type="button" onClick={()=>setDebugOpen(false)} title="Zavřít">X</SmallIconBtn>
                </div>
              </DebugPanelHeader>
               <DebugScroll style={{ fontSize: debugFont }}>
                {debugFilterOpen && (
                  <div style={{position:'sticky', top:0, zIndex:5, background:'#0f172a', padding:'0.35rem 0.35rem 0.5rem', borderBottom:'1px solid #334155', boxShadow:'0 2px 4px -2px rgba(0,0,0,0.6)'}}>
                    <div style={{display:'flex', gap:'.5rem', alignItems:'center'}}>
                      <FontAwesomeIcon icon={faFilter} style={{opacity:0.75}} />
                      <input
                        type="text"
                        placeholder="filter (case-insensitive, fulltext)"
                        value={debugFilter}
                        onChange={e=>setDebugFilter(e.target.value)}
                        style={{flex:1, background:'#111', color:'#f1f5f9', border:'1px solid #334155', borderRadius:4, padding:'0.25rem .45rem', fontSize:debugFont-2}}
                      />
                      {debugFilter && (
                        <SmallIconBtn type="button" onClick={()=>setDebugFilter('')} title="Vymazat filtr">×</SmallIconBtn>
                      )}
                      {normalizedFilter && (
                        <span style={{fontSize:'0.55rem', opacity:.65, letterSpacing:'1px', whiteSpace:'nowrap'}}>{filteredLogEntries.length}/{logEntries.length}</span>
                      )}
                    </div>
                  </div>
                )}
                {/* LocalStorage INFO for TODO/POZNÁMKY debugging */}
                <div className="dbg-global-wrapper" style={{marginBottom:'0.5rem'}}>
                  <div className="dbg-ln" style={{fontSize:'0.6rem', opacity:0.7, margin:'0 0 0.25rem', letterSpacing:'1px'}}>LOCALSTORAGE TODO/POZNÁMKY</div>
                  {(() => {
                    const todoNotesKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && (key.includes('layout_tasks_') || key.includes('layout_notes_') || key.includes('todo_') || key.includes('notes_'))) {
                        todoNotesKeys.push(key);
                      }
                    }

                    if (todoNotesKeys.length === 0) {
                      return <div style={{fontSize:'0.65rem', opacity:0.5, fontStyle:'italic'}}>Žádné TODO/POZNÁMKY klíče nenalezeny</div>;
                    }

                    return (
                      <div style={{fontSize:'0.65rem', fontFamily:'monospace'}}>
                        {todoNotesKeys.map(key => (
                          <div key={key} style={{marginBottom:'0.2rem', opacity:0.8}}>
                            <span style={{color:'#fbbf24'}}>{key}</span>
                            <button
                              style={{marginLeft:'0.5rem', fontSize:'0.5rem', padding:'1px 4px', background:'#dc2626', color:'white', border:'none', borderRadius:'2px', cursor:'pointer'}}
                              onClick={() => {
                                localStorage.removeItem(key);
                                // Re-render by forcing state change
                                setDebugOpen(false);
                                setTimeout(() => setDebugOpen(true), 10);
                              }}
                              title="Smazat tento klíč"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* LocalStorage INFO for OrderForm25 auto-save koncept debugging */}
                <div className="dbg-global-wrapper" style={{marginBottom:'0.5rem'}}>
                  <div className="dbg-ln" style={{fontSize:'0.6rem', opacity:0.7, margin:'0 0 0.25rem', letterSpacing:'1px'}}>LOCALSTORAGE ORDERFORM25 AUTO-SAVE KONCEPT</div>
                  {(() => {
                    const orderKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && (key.includes('order') || key.includes('Order') || key.includes('draft'))) {
                        orderKeys.push(key);
                      }
                    }

                    if (orderKeys.length === 0) {
                      return <div style={{fontSize:'0.65rem', opacity:0.5, fontStyle:'italic'}}>Žádné ORDER klíče nenalezeny</div>;
                    }

                    return (
                      <div style={{fontSize:'0.65rem', fontFamily:'monospace'}}>
                        {orderKeys.map(key => {
                          const value = localStorage.getItem(key);
                          let parsed = null;
                          let isJsonValid = false;

                          try {
                            if (value) {
                              parsed = JSON.parse(value);
                              isJsonValid = true;
                            }
                          } catch {}

                          return (
                            <div key={key} style={{marginBottom:'0.5rem', border:'1px solid #334155', borderRadius:'4px', padding:'0.5rem', background:'#111827'}}>
                              <div style={{display:'flex', alignItems:'center', marginBottom:'0.3rem'}}>
                                <span style={{color:'#fbbf24', fontWeight:'bold'}}>{key}</span>
                                <button
                                  style={{marginLeft:'0.5rem', fontSize:'0.5rem', padding:'1px 4px', background:'#dc2626', color:'white', border:'none', borderRadius:'2px', cursor:'pointer'}}
                                  onClick={() => {
                                    localStorage.removeItem(key);
                                    setDebugOpen(false);
                                    setTimeout(() => setDebugOpen(true), 10);
                                  }}
                                  title="Smazat tento klíč"
                                >×</button>
                              </div>

                              {isJsonValid && parsed ? (
                                <div style={{fontSize:'0.6rem', lineHeight:'1.3'}}>
                                  <div style={{color:'#10b981'}}>✓ Velikost: {value.length} znaků</div>
                                  {parsed.formData && (
                                    <div style={{marginTop:'0.2rem'}}>
                                      <div style={{color:'#8b5cf6'}}>FormData:</div>
                                      <div style={{marginLeft:'1rem', color:'#cbd5e1'}}>
                                        • predmet: {parsed.formData.predmet || '❌'}
                                        <br />• garant: {parsed.formData.garant_uzivatel_id || '❌'}
                                        <br />• prikazce: {parsed.formData.prikazce_id || '❌'}
                                        <br />• max_cena: {parsed.formData.max_cena_s_dph || '❌'}
                                        <br />• polozky: {parsed.formData.polozky_objednavky?.length || 0}
                                        <br />• temp_datum: {parsed.formData.temp_datum_objednavky || '❌'}
                                      </div>
                                    </div>
                                  )}
                                  {parsed.attachments && (
                                    <div style={{marginTop:'0.2rem', color:'#f59e0b'}}>
                                      Přílohy: {parsed.attachments.length || 0}
                                    </div>
                                  )}
                                  {parsed.timestamp && (
                                    <div style={{marginTop:'0.2rem', color:'#64748b'}}>
                                      Timestamp: {prettyDate(parsed.timestamp)}
                                    </div>
                                  )}
                                  {parsed.firstAutoSaveDate && (
                                    <div style={{color:'#64748b'}}>
                                      První auto-save: {prettyDate(parsed.firstAutoSaveDate)}
                                    </div>
                                  )}
                                  <div style={{color:'#64748b'}}>
                                    Verze: {parsed.version || '❌'} | Koncept: {parsed.isConceptSaved ? '✓' : '❌'} | DB: {parsed.isOrderSavedToDB ? '✓' : '❌'}
                                  </div>
                                </div>
                              ) : (
                                <div style={{fontSize:'0.6rem', color:'#ef4444'}}>
                                  ❌ Neplatný JSON nebo prázdný: {value?.substring(0, 100)}...
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* ENCRYPTION DEBUG ACTIONS */}
                <div className="dbg-global-wrapper" style={{marginBottom:'0.5rem'}}>
                  <div className="dbg-ln" style={{fontSize:'0.6rem', opacity:0.7, margin:'0 0 0.25rem', letterSpacing:'1px'}}>ENCRYPTION DEBUG</div>
                  <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'0.5rem'}}>
                    <button
                      style={{fontSize:'0.6rem', padding:'2px 6px', background:'#0ea5e9', color:'white', border:'none', borderRadius:'3px', cursor:'pointer'}}
                      onClick={async () => {
                        try {
                          const result = await runAllEncryptionTests();
                          const message = result.success ? 'Všechny encryption testy prošly!' : 'Některé encryption testy selhaly - viz console';
                          const type = result.success ? 'success' : 'error';
                          showToast && showToast(message, type);
                        } catch (error) {
                          showToast && showToast('Chyba při testování encryption - viz console', 'error');
                        }
                      }}
                      title="Spustí komplexní test encryption mechanismu"
                    >Test Encryption</button>

                    <button
                      style={{fontSize:'0.6rem', padding:'2px 6px', background:'#dc2626', color:'white', border:'none', borderRadius:'3px', cursor:'pointer'}}
                      onClick={() => {
                        // Použij Toast confirmation místo systémového dialogu
                        showToast && showToast('Vymazat všechna auth data ze sessionStorage?', {
                          type: 'warning',
                          duration: 8000,
                          action: {
                            label: 'Ano, vymazat',
                            onClick: () => {
                              sessionStorage.clear();
                              showToast('SessionStorage vymazán - refreshuj stránku', 'success');
                            }
                          }
                        });
                      }}
                      title="Vymaže všechna auth data ze sessionStorage"
                    >Clear Session</button>

                    <button
                      style={{fontSize:'0.6rem', padding:'2px 6px', background:'#7c3aed', color:'white', border:'none', borderRadius:'3px', cursor:'pointer'}}
                      onClick={() => {
                        const seed = sessionStorage.getItem('_session_seed');
                        const message = `Session Seed: ${seed || 'žádný'}. Tento seed se používá pro generování encryption klíčů.`;
                        showToast && showToast(message, 'info', { duration: 6000 });
                      }}
                      title="Zobrazí aktuální session seed pro encryption"
                    >Show Seed</button>

                    <button
                      style={{fontSize:'0.6rem', padding:'2px 6px', background:'#f59e0b', color:'white', border:'none', borderRadius:'3px', cursor:'pointer'}}
                      onClick={() => {
                        const reasons = ['USER_MANUAL', 'TOKEN_EXPIRED', 'DATA_CORRUPTION', 'ENCRYPTION_ERROR'];
                        const reason = reasons[Math.floor(Math.random() * reasons.length)];

                        // Import debug utility
                        import('../utils/logoutToastUtils.js').then(({ testLogoutToast }) => {
                          testLogoutToast(showToast, reason, `Debug test ${reason}`);
                        });
                      }}
                      title="Testuje různé logout toast notifikace (bez skutečného logout)"
                    >Test Logout Toast</button>
                  </div>
                </div>

                <div className="dbg-global-wrapper" style={{marginBottom:'0.5rem'}}>
                  <div className="dbg-ln" style={{fontSize:'0.6rem', opacity:0.7, margin:'0 0 0.25rem', letterSpacing:'1px'}}>PRIMARY PAYLOAD</div>
                  {(() => {
                    const primaryHtmlRaw = `<pre>${syntaxHighlight(parsedJson || null)}</pre>`;
                    let primaryHtmlNumbered = addLineNumbersToPre(primaryHtmlRaw);
                    // přidáme class pro větší písmo jen v primary payload
                    primaryHtmlNumbered = primaryHtmlNumbered.replace('data-ln-ready="1"', 'data-ln-ready="1" class="dbg-pre-big"');
                    return <div style={{ fontSize: debugFont - 1 }} dangerouslySetInnerHTML={{__html: primaryHtmlNumbered}} />;
                  })()}
                </div>
                {filteredLogEntries.length > 0 && (
                  <div className="dbg-global-wrapper">
                    <div className="dbg-ln" style={{fontSize:'0.6rem', opacity:0.7, margin:'0.5rem 0 0.25rem', letterSpacing:'1px'}}>LOG STREAM ({filteredLogEntries.length}/{logEntries.length})</div>
                    {(() => {
                      const lastEntries = filteredLogEntries.slice(-50);
                      return lastEntries.map(l => {
                        const isCollapsed = collapsedLogs.has(l.ts);
                        if (l.isHtml && l.structured && typeof l.entry === 'object') {
                          let processedBody = addLineNumbersToPre(l.entry.bodyHtml);
                          if (highlightRegex) processedBody = applyHighlight(processedBody);
                          let headerHtml = l.entry.headerHtml;
                          if (highlightRegex) headerHtml = applyHighlight(headerHtml);
                          return (
                            <div key={l.ts} style={{ margin: '0 0 4px' }}>
                              <div className="dbg-ln" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                                <span
                                  onClick={() => toggleOneLog(l.ts)}
                                  title={isCollapsed ? 'Rozbalit' : 'Sbalit'}
                                  style={{ display: 'inline-block', width: '16px', textAlign: 'center', fontWeight: 600, cursor:'pointer', userSelect:'none' }}
                                >{isCollapsed ? '+' : '−'}</span>
                                <div style={{ flex: 1, cursor:'text', userSelect:'text' }} dangerouslySetInnerHTML={{ __html: headerHtml }} />
                              </div>
                              {!isCollapsed && (
                                <div style={{ marginLeft: '18px' }} dangerouslySetInnerHTML={{ __html: processedBody }} />
                              )}
                            </div>
                          );
                        }
                        // fallback původní formát (plain / starší záznamy)
                        const processedFallback = l.isHtml ? addLineNumbersToPre(l.entry) : l.entry;
                        const isObjectEntry = !l.isHtml && typeof l.entry === 'object';
                        let objectHtml = null;
                        // Speciální formátování pro WORKFLOW záznamy: zobrazit na jedné řádce s prefixem
                        if (isObjectEntry && l.entry && l.entry.type === 'WORKFLOW') {
                          const timeStr = new Date(l.ts).toLocaleTimeString('cs-CZ',{hour12:false});
                          const msg = l.entry.message || '';
                          const prev = l.entry.payload?.prev || '∅';
                          const next = l.entry.payload?.next || '∅';
                          const cause = l.entry.payload?.cause;
                          const seq = l.entry.seq ? `WF#${l.entry.seq} ` : '';
                          // Krátká notace prev -> next
                          let lineRaw = `[WORKFLOW] : [${timeStr}] ${seq}${msg} (${prev} → ${next})` + (cause ? ` {${cause}}` : '');
                          if (highlightRegex) lineRaw = applyHighlight(lineRaw);
                          return (
                            <LogBlock key={l.ts} className="dbg-ln" style={{ fontSize: debugFont - 1, margin: '0 0 4px' }}>
                              <span style={{ cursor: 'pointer', fontWeight: 600, marginRight: '6px', userSelect:'none' }} onClick={() => toggleOneLog(l.ts)}>{isCollapsed ? '+' : '−'}</span>
                              {!isCollapsed && (
                                <span style={{cursor:'text', userSelect:'text'}} dangerouslySetInnerHTML={{__html: lineRaw}} />
                              )}
                            </LogBlock>
                          );
                        }
                        if (isObjectEntry) {
                          try {
                            const jsonStr = JSON.stringify(l.entry, null, 2);
                            let esc = jsonStr.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                            if (highlightRegex) esc = applyHighlight(esc);
                            objectHtml = `<pre style="margin:0;padding:4px 6px;background:#0f172a;border:1px solid #1e293b;border-radius:4px;white-space:pre-wrap;word-break:break-word;">${esc}</pre>`;
                          } catch {}
                        }
                        let headerText = `[${new Date(l.ts).toLocaleTimeString()}] ${processedFallback}`;
                        if (highlightRegex && !l.isHtml && !isObjectEntry) headerText = applyHighlight(headerText);
                        return (
                          <LogBlock key={l.ts} className="dbg-ln" style={{ fontSize: debugFont - 1, margin: '0 0 4px' }}>
                            <span style={{ cursor: 'pointer', fontWeight: 600, marginRight: '6px', userSelect:'none' }} onClick={() => toggleOneLog(l.ts)}>{isCollapsed ? '+' : '−'}</span>
                            {!isCollapsed && (
                              isObjectEntry ? <span dangerouslySetInnerHTML={{ __html: objectHtml }} /> : (
                                l.isHtml ? <span dangerouslySetInnerHTML={{ __html: highlightRegex ? applyHighlight(processedFallback) : processedFallback }} /> : <span style={{cursor:'text', userSelect:'text'}} dangerouslySetInnerHTML={{__html: headerText}} />
                              )
                            )}
                          </LogBlock>
                        );
                      });
                    })()}
                  </div>
                )}
              </DebugScroll>
              <div style={{fontSize:'0.55rem', opacity:0.55, letterSpacing:'0.75px'}}>Debug helpers are available through the in-app Debug panel API.</div>
            </DebugPanel>
          )}
          <DebugToggleBtn type="button" onClick={()=>setDebugOpen(o=>!o)} title={debugOpen ? 'Skrýt debug panel' : 'Otevřít debug panel'}>
            <FontAwesomeIcon icon={faBug} />
          </DebugToggleBtn>
        </DebugDockWrapper>
      )}

      {/* Financial Calculator */}
      <FinancialCalculator
        isOpen={calculatorOpen}
        onClose={() => {
          setCalculatorOpen(false);
          setCalculatorActive(false);
        }}
        position={calculatorPosition}
        onPositionChange={setCalculatorPosition}
        isActive={calculatorActive}
        onEngage={() => setCalculatorActive(true)}
        onLastResultChange={(result, expression) => {
          setCalculatorLastResult(result);
          setCalculatorLastExpression(expression);
        }}
      />

    </div>
  );
};

export default Layout;
