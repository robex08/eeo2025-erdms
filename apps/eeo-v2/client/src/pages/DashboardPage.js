/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { AuthContext } from '../context/AuthContext';
import { useBackgroundTasks } from '../context/BackgroundTasksContext';
import { getDashboardData, getCashbookSummary, getActiveUsersAdmin, getDashboardChartTimeline, getRssFeed, getFinanceMarkets, getFinanceChart } from '../services/apiDashboard';
import { getAdminMessagesUnreadCount, markNotificationAsRead } from '../services/notificationsApi';
import { fetchUserSettings, saveUserSettings } from '../services/userSettingsApi';
import { fetchMySubstitutions, fetchCurrentlySubstituting } from '../services/apiSubstitution';
import * as planningApi from '../services/planningApi';
import { theme } from '../theme/theme';
import ConfirmDialog from '../components/ConfirmDialog';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faShoppingCart, faFileInvoiceDollar, faBell,
  faExclamationTriangle, faCheckCircle, faClock, faChartBar,
  faTruck, faGavel, faGlobe, faUserShield, faCog, faArrowRight,
  faSync, faEye, faEyeSlash, faGripVertical, faTimes,
  faExclamationCircle, faCalendarAlt, faMoneyBillWave,
  faFileContract, faComments, faComment, faHourglassHalf, faFileInvoice,
  faCoins, faChartLine, faBullhorn, faGift, faInfoCircle, faCalendarCheck, faUsers, faUser, faUserFriends,
  faExpand, faCompress, faExchangeAlt, faExternalLinkAlt,
  faCloud, faWind, faTint, faThermometerHalf, faMapMarkerAlt,
  faChevronLeft, faChevronRight, faPaperPlane, faEnvelope,
  faClipboardList, faCubes, faInfinity, faHistory, faReceipt, faAddressBook
} from '@fortawesome/free-solid-svg-icons';
import { Cloud, Sun, CloudRain, CloudSnow, CloudDrizzle, Wind, Droplets, MapPin, Gauge } from 'lucide-react';
import { SmartTooltip } from '../styles/SmartTooltip';
import DashboardPermissionsModal from '../components/dashboard/DashboardPermissionsModal';
import SendQuickMessageModal from '../components/dashboard/SendQuickMessageModal';
import SlideInDetailPanel from '../components/UniversalSearch/SlideInDetailPanel';
import PlanningEventDetailPanel from '../components/PlanningEventPanel';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

// ── Fullscreen styled komponenty ─────────────────────────────────────────────
const ChartExpandBtn = styled.button`
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  line-height: 1;
  z-index: 2;
  &:hover { color: #1d4ed8; background: #eff6ff; }
`;

const ChartOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
`;

const ChartFullscreenBox = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem 2rem;
  width: 80vw;
  height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 24px 60px rgba(0,0,0,0.35);
  overflow: auto;
`;

// Vrátí kopii Chart.js options s většími fonty pro fullscreen panel
const withFsFont = (opts, sz = 15) => ({
  ...opts,
  responsive: true,
  maintainAspectRatio: false,
  plugins: opts.plugins ? {
    ...opts.plugins,
    legend: opts.plugins.legend ? {
      ...opts.plugins.legend,
      labels: { ...opts.plugins.legend.labels, font: { size: sz } }
    } : opts.plugins.legend
  } : opts.plugins,
  scales: opts.scales ? Object.fromEntries(
    Object.entries(opts.scales).map(([k, v]) => [k, {
      ...v,
      title: v.title ? { ...v.title, font: { size: sz } } : v.title,
      ticks: v.ticks ? { ...v.ticks, font: { size: sz - 1 } } : v.ticks
    }])
  ) : opts.scales
});

// ============================================================================
// CONSTANTS
// ============================================================================

const WIDGET_REGISTRY = {
  welcome:             { title: 'Přehled',                 icon: faHome,               color: '#1d4ed8', requires: 'DASHBOARD_WELCOME' },
  orders_stats:        { title: 'Statistiky objednávek',   icon: faChartBar,           color: '#1d4ed8', requires: 'DASHBOARD_ORDERS_STATS' },
  my_orders:           { title: 'Moje objednávky',         icon: faShoppingCart,        color: '#2563eb', requires: 'DASHBOARD_MY_ORDERS' },
  my_invoices:         { title: 'Faktury k potvrzení',     icon: faFileInvoiceDollar,  color: '#7c3aed', requires: 'DASHBOARD_INVOICES_CONFIRM' },
  orders_approval:     { title: 'Ke schválení',            icon: faGavel,              color: '#dc2626', requires: 'DASHBOARD_ORDERS_APPROVE' },
  invoices_overdue:    { title: 'Faktury po splatnosti',   icon: faExclamationCircle,  color: '#dc2626', requires: 'DASHBOARD_INVOICES_OVERDUE' },
  invoices_due_soon:   { title: 'Faktury blížící se spl.', icon: faCalendarAlt,        color: '#f97316', requires: 'DASHBOARD_INVOICES_DUE_SOON' },
  orders_registry:     { title: 'Registr – ke zveřejnění',            icon: faGlobe,              color: '#059669', requires: 'DASHBOARD_ORDERS_REGISTRY' },
  orders_published:    { title: 'Registr – zveřejněné objednávky',    icon: faCheckCircle,        color: '#10b981', requires: 'DASHBOARD_ORDERS_PUBLISHED' },
  alerts:              { title: 'Upozornění',              icon: faExclamationTriangle,color: '#f59e0b', requires: 'DASHBOARD_ALERTS' },
  notifications:       { title: 'Notifikace',              icon: faBell,               color: '#6366f1', requires: 'DASHBOARD_NOTIFICATIONS' },
  chart_timeline:      { title: 'Objednávky v čase',       icon: faChartBar,           color: '#0891b2', requires: 'DASHBOARD_CHART_TIMELINE' },
  top_suppliers:       { title: 'Top dodavatelé',           icon: faTruck,              color: '#b45309', requires: 'DASHBOARD_TOP_SUPPLIERS' },
  smlouvy_critical:    { title: 'Smlouvy - kritický stav',  icon: faFileContract,       color: '#dc2626', requires: 'DASHBOARD_SPENDING_CONTRACTS' },
  lp_critical:         { title: 'Limitované příslíby - stav čerpání', icon: faMoneyBillWave, color: '#dc2626', requires: 'DASHBOARD_SPENDING_LP' },
  order_comments:      { title: 'Komentáře k objednávkám',  icon: faComments,           color: '#6366f1', requires: 'DASHBOARD_ORDER_COMMENTS' },
  invoices_stats:      { title: 'Statistiky faktur',         icon: faFileInvoiceDollar,  color: '#7c3aed', requires: 'DASHBOARD_INVOICES_STATS' },
  annual_fees_due:     { title: 'Roční poplatky - splatnost', icon: faCalendarCheck,      color: '#b45309', requires: 'DASHBOARD_ANNUAL_FEES' },
  chart_majetek:       { title: 'Majetek podle druhu',         icon: faChartBar,           color: '#0f766e', requires: 'DASHBOARD_CHART_MAJETEK' },
  chart_fees:          { title: 'Roční poplatky - přehled',   icon: faChartBar,           color: '#7c3aed', requires: 'DASHBOARD_CHART_FEES' },
  cashbook_summary:    { title: 'Pokladna - přehled',         icon: faCoins,              color: '#059669', requires: 'DASHBOARD_CASH_BOOK', beta: true },
  rss_news:            { title: 'Zprávy',                      icon: faBullhorn,           color: '#f97316', requires: 'DASHBOARD_RSS_NEWS' },
  weather:             { title: 'Počasí',                      icon: faCloud,              color: '#1e40af', requires: 'DASHBOARD_WEATHER' },
  finance_markets:     { title: 'Finanční trhy',               icon: faChartLine,          color: '#059669', requires: 'DASHBOARD_FINANCE_MARKETS' },
  calendar:            { title: 'Kalendář',                    icon: faCalendarAlt,        color: '#0891b2', requires: 'DASHBOARD_CALENDAR' },
  active_users_admin:  { title: 'Přehled aktivit uživatelů',   icon: faUsers,              color: '#1d4ed8', requires: 'DASHBOARD_ACTIVE_USERS', alwaysOn: true, alwaysLast: true }
};

const DEFAULT_TILES = Object.keys(WIDGET_REGISTRY);

const CHART_COLORS = ['#1d4ed8', '#7c3aed', '#06b6d4', '#f97316', '#f43f5e', '#10b981', '#0ea5e9', '#f59e0b'];

// ============================================================================
// ANIMATIONS
// ============================================================================

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const spinAnim = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const refreshFlashAnim = keyframes`
  0%, 100% { opacity: 0.75; }
  20%, 60%  { opacity: 0.05; }
  40%, 80%  { opacity: 1; }
`;

const tickerRoll = keyframes`
  from { transform: translateY(var(--ticker-start, 0)); }
  to { transform: translateY(-100%); }
`;

// ============================================================================
// EXTERNAL WINDOW COMPONENTS (Always-on-Top)
// ============================================================================

// ============================================================================
// EXTERNAL WINDOW - Samostatný React root (nezávislý na navigaci)
// ============================================================================

// Globální store pro external windows
const externalWindowsStore = {
  orders: { window: null, root: null, updateCallback: null },
  invoices: { window: null, root: null, updateCallback: null },
  weather: { window: null, root: null, updateCallback: null },
  finance: { window: null, root: null, updateCallback: null }
};

// Funkce pro vytvoření a správu externího okna
const createExternalStatsWindow = async (type, initialData, onCloseCallback) => {
  // Nastavit title a rozměry podle typu okna
  let title, windowWidth, windowHeight;
  
  if (type === 'orders') {
    title = 'Statistiky objednávek';
    const tilesCount = 12;
    const tileWidth = 100;
    const gap = 12;
    const padding = 100;
    windowWidth = tilesCount * tileWidth + (tilesCount - 1) * gap + padding;
    windowHeight = 210;
  } else if (type === 'invoices') {
    title = 'Statistiky faktur';
    const tilesCount = 13;
    const tileWidth = 100;
    const gap = 12;
    const padding = 100;
    windowWidth = tilesCount * tileWidth + (tilesCount - 1) * gap + padding;
    windowHeight = 210;
  } else if (type === 'weather') {
    title = 'Počasí';
    windowWidth = 465;   // optimální šířka pro weather widget
    windowHeight = 470;  // optimální výška pro weather widget
  } else if (type === 'finance') {
    title = 'Finanční trhy';
    windowWidth = 1400;  // široké pro všechny tickery
    windowHeight = 280;
  }

  let win = null;

  // Pokus o Always-on-Top pomocí Document Picture-in-Picture API
  if ('documentPictureInPicture' in window) {
    try {
      win = await window.documentPictureInPicture.requestWindow({
        width: windowWidth,
        height: windowHeight,
      });
      console.log('✅ PiP okno vytvořeno');
    } catch (error) {
      console.warn('⚠️ PiP API selhalo:', error.message);
      win = null;
    }
  }

  // Fallback na klasické okno
  if (!win) {
    win = window.open(
      '',
      `stats_${type}_${Date.now()}`,
      `width=${windowWidth},height=${windowHeight},left=100,top=100,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
    );
  }

  if (!win) {
    console.warn('Vyskakovací okno bylo zablokováno. Povolte prosím pop-up okna.');
    return null;
  }

  // Nastavit HTML strukturu
  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style>
          * { box-sizing: border-box; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          /* Vlastní scrollbar styling */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.3);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.4);
            border-radius: 4px;
            transition: background 0.2s;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.6);
          }
          /* Firefox scrollbar */
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.4) rgba(15, 23, 42, 0.3);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; min-height: 100vh; background: linear-gradient(to bottom right, rgb(15, 23, 42), rgb(30, 41, 59));">
        <div id="external-root" style="min-height: 100vh; padding: 0.5rem;"></div>
      </body>
    </html>
  `);
  win.document.close();

  // Kopírovat styly z hlavní stránky
  const copyStyles = () => {
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(styleNode => {
      try {
        const cloned = styleNode.cloneNode(true);
        win.document.head.appendChild(cloned);
      } catch (e) { /* ignore */ }
    });
  };
  copyStyles();
  setTimeout(copyStyles, 100);
  setTimeout(copyStyles, 500);

  // Vytvořit React root v externím okně
  const rootElement = win.document.getElementById('external-root');
  const root = createRoot(rootElement);

  // Inicializovat store
  externalWindowsStore[type] = {
    window: win,
    root: root,
    updateCallback: null
  };

  // Sledovat zavření okna
  const checkClosed = setInterval(() => {
    if (win.closed) {
      console.log(`🚪 Externí okno ${type} bylo zavřeno`);
      clearInterval(checkClosed);
      if (externalWindowsStore[type].root) {
        externalWindowsStore[type].root.unmount();
      }
      externalWindowsStore[type] = { window: null, root: null, updateCallback: null };
      if (onCloseCallback) onCloseCallback();
    }
  }, 500);

  // Event listener pro zavření
  win.addEventListener('pagehide', () => {
    clearInterval(checkClosed);
    if (onCloseCallback) onCloseCallback();
  });

  // Render initial content
  renderExternalStatsContent(type, initialData);

  return win;
};

// Funkce pro renderování obsahu do externího okna
const renderExternalStatsContent = (type, data) => {
  const store = externalWindowsStore[type];
  if (!store.root || !data) return;

  if (type === 'orders' || type === 'invoices') {
    renderStatsContent(type, data, store);
  } else if (type === 'weather') {
    renderWeatherContent(data, store);
  } else if (type === 'finance') {
    renderFinanceContent(data, store);
  }
};

// Renderování statistik (objednávky/faktury)
const renderStatsContent = (type, data, store) => {

  const isOrders = type === 'orders';
  const title = isOrders ? 'Statistiky objednávek' : 'Statistiky faktur';
  
  const tiles = isOrders ? [
    { key: 'total', label: 'Celkem', value: data.total || 0, color: '#1d4ed8', bgColor: '#dbeafe', icon: 'fa-solid fa-list' },
    { key: 'ke_schvaleni', label: 'Ke schválení', value: data.ke_schvaleni || 0, color: '#dc2626', bgColor: '#fee2e2', icon: 'fa-solid fa-exclamation-triangle' },
    { key: 'schvalena', label: 'Schváleno', value: data.schvalena || 0, color: '#166534', bgColor: '#dcfce7', icon: 'fa-solid fa-check-circle' },
    { key: 'rozpracovana', label: 'Rozpracované', value: data.rozpracovana || 0, color: '#b45309', bgColor: '#fef3c7', icon: 'fa-solid fa-hourglass-half' },
    { key: 'odeslana', label: 'Odeslané', value: data.odeslana || 0, color: '#0284c7', bgColor: '#e0f2fe', icon: 'fa-solid fa-paper-plane' },
    { key: 'potvrzena', label: 'Potvrzené', value: data.potvrzena || 0, color: '#7c3aed', bgColor: '#ede9fe', icon: 'fa-solid fa-check' },
    { key: 'fakturace', label: 'Fakturace', value: data.fakturace || 0, color: '#06b6d4', bgColor: '#cffafe', icon: 'fa-solid fa-money-bill-wave' },
    { key: 'vecna_spravnost', label: 'Věcná spr.', value: data.vecna_spravnost || 0, color: '#be185d', bgColor: '#fce7f3', icon: 'fa-solid fa-user-shield' },
    { key: 'zkontrolovana', label: 'Zkontrolováno', value: data.zkontrolovana || 0, color: '#16a34a', bgColor: '#dcfce7', icon: 'fa-solid fa-check-double' },
    { key: 'k_uverejneni_do_registru', label: 'Ke zveřejnění', value: data.k_uverejneni_do_registru || 0, color: '#ea580c', bgColor: '#fff7ed', icon: 'fa-solid fa-globe' },
    { key: 'uverejnena', label: 'Zveřejněné', value: data.uverejnena || 0, color: '#059669', bgColor: '#ecfdf5', icon: 'fa-solid fa-check-circle' },
    { key: 'dokoncena', label: 'Dokončené', value: data.dokoncena || 0, color: '#059669', bgColor: '#d1fae5', icon: 'fa-solid fa-flag-checkered' }
  ] : [
    { key: 'total', label: 'Celkem', value: data.total || 0, color: '#1d4ed8', bgColor: '#dbeafe', icon: 'fa-solid fa-file-invoice' },
    { key: 'vecna_spravnost', label: 'Věcná spr.', value: data.vecna_spravnost || 0, color: '#7c3aed', bgColor: '#ede9fe', icon: 'fa-solid fa-user-shield' },
    { key: 'zaplaceno', label: 'Zaplaceno', value: data.zaplaceno || 0, color: '#059669', bgColor: '#dcfce7', icon: 'fa-solid fa-check-circle' },
    { key: 'nezaplaceno', label: 'Nezaplaceno', value: data.nezaplaceno || 0, color: '#b45309', bgColor: '#fef3c7', icon: 'fa-solid fa-hourglass-half' },
    { key: 've_splatnosti', label: 'Ve splatnosti', value: data.ve_splatnosti || 0, color: '#0891b2', bgColor: '#e0f2fe', icon: 'fa-solid fa-clock' },
    { key: 'po_splatnosti', label: 'Po splatnosti', value: data.po_splatnosti || 0, color: '#dc2626', bgColor: '#fee2e2', icon: 'fa-solid fa-exclamation-circle' },
    { key: 'storno', label: 'Storno', value: data.storno || 0, color: '#64748b', bgColor: '#f1f5f9', icon: 'fa-solid fa-ban' },
    { key: 'bez_prirazeni', label: 'Bez přiřazení', value: data.bez_prirazeni || 0, color: '#94a3b8', bgColor: '#f8fafc', icon: 'fa-solid fa-question-circle' },
    { key: 's_objednavkou', label: 'S objednávkou', value: data.s_objednavkou || 0, color: '#1d4ed8', bgColor: '#dbeafe', icon: 'fa-solid fa-link' },
    { key: 'se_smlouvou', label: 'Se smlouvou', value: data.se_smlouvou || 0, color: '#059669', bgColor: '#ecfdf5', icon: 'fa-solid fa-file-contract' },
    { key: 'zkontrolovano', label: 'Kontrola', value: data.zkontrolovano || 0, color: '#0891b2', bgColor: '#e0f2fe', icon: 'fa-solid fa-check' },
    { key: 's_poznamkou', label: 'S poznámkou', value: data.s_poznamkou || 0, color: '#ea580c', bgColor: '#fff7ed', icon: 'fa-solid fa-comment' },
    { key: 'moje_faktury', label: 'Moje faktury', value: data.moje_faktury || 0, color: '#6366f1', bgColor: '#eef2ff', icon: 'fa-solid fa-user' },
    { key: 'moje_nezkontrolovane', label: 'Mé nezkontrolované', value: data.moje_nezkontrolovane || 0, color: '#f59e0b', bgColor: '#fef3c7', icon: 'fa-solid fa-exclamation-triangle' }
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Vypočítat cenovou sumaci
  const totalSum = data.celkova_castka || 0;
  const formattedSum = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(totalSum);

  const content = React.createElement('div', {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '0.5rem'
    }
  }, [
    React.createElement('div', {
      key: 'header',
      style: {
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '0.5rem',
        paddingRight: '0.5rem',
        gap: '1rem'
      }
    }, [
      React.createElement('div', {
        key: 'left',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }
      }, [
        React.createElement('h1', {
          key: 'title',
          style: {
            color: 'white',
            fontSize: '14px',
            fontWeight: 700,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }
        }, [
          React.createElement('i', {
            key: 'icon',
            className: isOrders ? 'fa-solid fa-chart-bar' : 'fa-solid fa-file-invoice-dollar',
            style: { fontSize: '14px' }
          }),
          React.createElement('span', { key: 'text' }, title)
        ]),
        React.createElement('span', {
          key: 'sum',
          style: {
            color: '#10b981',
            fontSize: '16px',
            fontWeight: 700
          }
        }, formattedSum)
      ]),
      React.createElement('div', {
        key: 'right',
        style: {
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0.1rem'
        }
      }, [
        React.createElement('span', {
          key: 'date',
          style: {
            color: '#cbd5e1',
            fontSize: '9px',
            fontWeight: 500
          }
        }, dateStr),
        React.createElement('span', {
          key: 'time',
          style: {
            color: '#94a3b8',
            fontSize: '10px',
            fontWeight: 600
          }
        }, timeStr)
      ])
    ]),
    React.createElement('div', {
      key: 'content',
      style: {
        display: 'flex',
        gap: '0.75rem',
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '0.25rem 0'
      }
    }, tiles.map((tile, index) => 
      React.createElement('div', {
        key: tile.key,
        style: {
          textAlign: 'center',
          padding: '0.75rem 0.65rem',
          borderRadius: '10px',
          background: tile.bgColor,
          transition: 'all 0.2s',
          minWidth: '100px',
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem'
        }
      }, [
        React.createElement('i', {
          key: 'icon',
          className: tile.icon,
          style: {
            fontSize: '18px',
            lineHeight: 1,
            color: tile.color
          }
        }),
        React.createElement('div', {
          key: 'value',
          style: {
            fontSize: '1.5rem',
            fontWeight: 800,
            color: tile.color,
            lineHeight: 1.2
          }
        }, tile.value),
        React.createElement('div', {
          key: 'label',
          style: {
            fontSize: '0.7rem',
            color: '#64748b',
            marginTop: '0.2rem',
            textTransform: 'uppercase',
            letterSpacing: '0.03em'
          }
        }, tile.label)
      ])
    ))
  ]);

  store.root.render(content);
  console.log(`🔄 Aktualizace dat v externím okně ${type}`);
};

// Renderování počasí
const renderWeatherContent = (data, store) => {
  if (!data) return;
  
  // Renderovat WeatherWidget stejně jako v dashboardu, ale BEZ externího tlačítka
  const content = React.createElement(WeatherWidget, {
    weatherData: data,
    weatherLoading: false,
    weatherError: null,
    onRefresh: () => {
      // V externím okně nemůžeme refreshovat - prázdná funkce
      console.log('⚠️ Refresh nelze provést z externího okna');
    },
    showExternalButton: false,  // Nezobraovat externí tlačítko v externím okně
    externalWindow: null,
    onOpenExternal: null,
    onCloseExternal: null
  });

  store.root.render(content);
  console.log('🔄 Aktualizace počasí v externím okně');
};

// Renderování finančních trhů (jen tickery)
const renderFinanceContent = (data, store) => {
  if (!data) return;
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  const formatPrice = (price, currency = 'USD') => {
    if (price == null) return '–';
    if (currency === 'CZK') return price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč';
    if (currency === 'EUR') return '€' + price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const formatChange = (change) => {
    if (change == null) return '–';
    const isPositive = change >= 0;
    return `${isPositive ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%`;
  };
  
  // Kombinovat všechny tickery z již filtrovaných polí
  const allTickers = [];
  
  // Akcie - data.stocks je pole objektů
  if (data.stocks && Array.isArray(data.stocks)) {
    data.stocks.forEach((stock) => {
      allTickers.push({
        symbol: stock.ticker || stock.symbol,
        name: stock.name,
        price: stock.currency === 'CZK' ? formatPrice(stock.price, 'CZK') : formatPrice(stock.price),
        change: stock.change_percent,
        type: 'stock',
        color: stock.change_percent >= 0 ? '#059669' : '#dc2626',
        bgColor: stock.change_percent >= 0 ? '#ecfdf5' : '#fef2f2'
      });
    });
  }
  
  // Krypto - data.crypto je pole objektů
  if (data.crypto && Array.isArray(data.crypto)) {
    data.crypto.forEach((coin) => {
      allTickers.push({
        symbol: coin.symbol?.toUpperCase() || coin.id,
        name: coin.name,
        price: formatPrice(coin.price_usd),
        change: coin.change_24h,
        type: 'crypto',
        color: coin.change_24h >= 0 ? '#059669' : '#dc2626',
        bgColor: coin.change_24h >= 0 ? '#ecfdf5' : '#fef2f2'
      });
    });
  }
  
  // Forex - data.forex je pole objektů
  if (data.forex && Array.isArray(data.forex)) {
    data.forex.forEach((fx) => {
      allTickers.push({
        symbol: fx.pair,
        name: `EUR/${fx.pair}`,
        price: typeof fx.rate === 'number' ? fx.rate.toFixed(4) : '–',
        change: null,
        type: 'forex',
        color: '#0891b2',
        bgColor: '#e0f2fe'
      });
    });
  }
  
  const content = React.createElement('div', {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '0.5rem'
    }
  }, [
    React.createElement('div', {
      key: 'header',
      style: {
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '0.5rem',
        paddingRight: '0.5rem',
        gap: '1rem'
      }
    }, [
      React.createElement('div', {
        key: 'left',
        style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }
      }, [
        React.createElement('i', {
          key: 'icon',
          className: 'fa-solid fa-chart-line',
          style: { fontSize: '14px', color: 'white' }
        }),
        React.createElement('span', {
          key: 'title',
          style: { color: 'white', fontSize: '14px', fontWeight: 700 }
        }, 'Finanční trhy')
      ]),
      React.createElement('div', {
        key: 'right',
        style: {
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0.1rem'
        }
      }, [
        React.createElement('span', {
          key: 'date',
          style: { color: '#cbd5e1', fontSize: '9px', fontWeight: 500 }
        }, dateStr),
        React.createElement('span', {
          key: 'time',
          style: { color: '#94a3b8', fontSize: '10px', fontWeight: 600 }
        }, timeStr)
      ])
    ]),
    React.createElement('div', {
      key: 'content',
      style: {
        display: 'flex',
        gap: '0.5rem',
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '0.25rem 0'
      }
    }, allTickers.map((ticker, index) => 
      React.createElement('div', {
        key: `${ticker.type}-${ticker.symbol}-${index}`,
        style: {
          textAlign: 'center',
          padding: '0.75rem 0.65rem',
          borderRadius: '10px',
          background: ticker.bgColor,
          minWidth: '100px',
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }
      }, [
        React.createElement('div', {
          key: 'symbol',
          style: {
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase'
          }
        }, ticker.symbol),
        React.createElement('div', {
          key: 'price',
          style: {
            fontSize: '1.1rem',
            fontWeight: 800,
            color: ticker.color,
            lineHeight: 1.2
          }
        }, ticker.price),
        ticker.change !== null && React.createElement('div', {
          key: 'change',
          style: {
            fontSize: '0.65rem',
            fontWeight: 700,
            color: ticker.color
          }
        }, formatChange(ticker.change))
      ])
    ))
  ]);
  
  store.root.render(content);
  console.log('🔄 Aktualizace finančních trhů v externím okně');
};

// Tyto komponenty již nejsou potřeba - renderování je přímo v renderExternalStatsContent

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const PageWrapper = styled.div`
  padding: 0 1.5rem 4rem;
  width: 100%;
  box-sizing: border-box;
`;

const PageHeader = styled.div`
  position: sticky;
  top: -1em;
  z-index: 50;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0;
  margin-left: -1.5rem;
  margin-right: -1.5rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 0;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
  color: white;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 0.75rem;
  }
`;

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderIconBtn = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: rgba(255,255,255,0.15);
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
  &:hover:not(:disabled) {
    background: rgba(255,255,255,0.25);
    border-color: rgba(255,255,255,0.5);
    transform: translateY(-1px);
  }
  &:disabled { opacity: 0.5; cursor: default; }
  svg {
    animation: ${p => p.$spinning ? 'dashSpin 1s linear infinite' : 'none'};
  }
  @keyframes dashSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const RefreshBtn = HeaderIconBtn;
const ConfigBtn = HeaderIconBtn;

// 🔄 Auto-refresh toggle switch
const AutoRefreshToggle = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255,255,255,0.2);
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 26px;
    transition: all 0.3s;
    backdrop-filter: blur(8px);

    &:before {
      content: '';
      position: absolute;
      height: 18px;
      width: 18px;
      left: 2px;
      bottom: 2px;
      background: white;
      border-radius: 50%;
      transition: all 0.3s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  }

  input:checked + span {
    background: rgba(34, 197, 94, 0.6);
    border-color: rgba(34, 197, 94, 0.8);
  }

  input:checked + span:before {
    transform: translateX(22px);
  }

  &:hover span {
    background: rgba(255,255,255,0.3);
    border-color: rgba(255,255,255,0.5);
  }

  input:checked:hover + span {
    background: rgba(34, 197, 94, 0.7);
  }
`;

// 🎯 RYCHLÉ ROLE-BASED DLAZDICE (v headeru)
const QuickTiles = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const QuickTile = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: rgba(255,255,255,0.15);
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 10px;
  color: white;
  font-size: 1.65rem;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
  
  &:hover {
    background: rgba(255,255,255,0.25);
    border-color: rgba(255,255,255,0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const QuickTileIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: inherit;
  line-height: 1;
`;

const QuickTileCount = styled.span`
  position: absolute;
  top: -7px;
  right: -7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 0.35rem;
  background: #ef4444;
  border: 2.5px solid white;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
`;

const QuickTileSeparator = styled.div`
  width: 2px;
  height: 40px;
  background: rgba(255,255,255,0.3);
  border-radius: 999px;
  margin: 0 0.25rem;
  flex-shrink: 0;
`;

const DashGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
  margin-top: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
  @media (min-width: 768px) and (max-width: 1199px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1200px) and (max-width: 1599px) { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 1600px) { grid-template-columns: repeat(4, 1fr); }
`;

// BETA badge pro widgety ve vývoji
const BetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  color: #fff;
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  margin-left: 0.2rem;
  line-height: 1.4;
  box-shadow: 0 1px 4px rgba(124,58,237,0.3);
  position: relative;
  top: -0.6em;
  vertical-align: baseline;
`;

// === FOCUS ALERTS BANNER ===
const FocusBannerWrap = styled.div`
  margin-top: 1rem;
  background: linear-gradient(135deg, #fefce8 0%, #fff7ed 50%, #fef2f2 100%);
  border: 1px solid #fde68a;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
`;

const FocusBannerHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.78rem; font-weight: 700; color: #92400e;
  font-stretch: condensed; letter-spacing: -0.01em;
  border-bottom: 1px solid rgba(253,230,138,0.5);
  background: rgba(255,255,255,0.4);
`;

const FocusBannerBodyWrap = styled.div`
  position: relative;
`;

const FocusBannerScrollBtnLeft = styled.button`
  position: absolute;
  left: 6px;
  top: calc(50% - 5px);
  transform: translateY(-50%);
  z-index: 3;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s;
  color: #92400e;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1;
  ${FocusBannerWrap}:hover & { opacity: ${props => props.$scrollable ? 1 : 0}; }
  &:hover { opacity: ${props => props.$scrollable ? '1 !important' : 0}; background: rgba(255,255,255,1); }
  pointer-events: ${props => props.$scrollable ? 'auto' : 'none'};
`;

const FocusBannerScrollBtnRight = styled.button`
  position: absolute;
  right: 6px;
  top: calc(50% - 5px);
  transform: translateY(-50%);
  z-index: 3;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s;
  color: #92400e;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1;
  ${FocusBannerWrap}:hover & { opacity: ${props => props.$scrollable ? 1 : 0}; }
  &:hover { opacity: ${props => props.$scrollable ? '1 !important' : 0}; background: rgba(255,255,255,1); }
  pointer-events: ${props => props.$scrollable ? 'auto' : 'none'};
`;

const FocusBannerBody = styled.div`
  display: flex; gap: 0.75rem; padding: 0.6rem 2.25rem;
  overflow-x: auto; overflow-y: hidden;
  flex: 1;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: #fbbf24; border-radius: 2px; }
  scrollbar-width: thin;
  scrollbar-color: #fbbf24 transparent;
`;

const FocusCard = styled.div`
  flex: 0 0 auto;
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  border: 1px solid ${p => p.$severity === 'danger' ? '#fca5a5' : p.$severity === 'info' ? '#93c5fd' : '#fde68a'};
  background: ${p => p.$severity === 'danger' ? '#fef2f2' : p.$severity === 'info' ? '#eff6ff' : '#fffbeb'};
  cursor: pointer;
  transition: all 0.15s;
  min-width: 200px; max-width: 360px;
  &:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.08); }
`;

const FocusIcon = styled.div`
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem;
  background: ${p => p.$severity === 'danger' ? '#fee2e2' : p.$severity === 'info' ? '#dbeafe' : '#fef3c7'};
  color: ${p => p.$severity === 'danger' ? '#dc2626' : p.$severity === 'info' ? '#2563eb' : '#d97706'};
  flex-shrink: 0;
`;

const FocusText = styled.span`
  font-size: 0.78rem; font-weight: 500; color: #1f2937;
  line-height: 1.3;
  font-stretch: condensed; letter-spacing: -0.015em;
`;

const FocusCount = styled.span`
  font-size: 0.85rem; font-weight: 800; font-variant-numeric: tabular-nums;
  font-stretch: condensed;
  color: ${p => p.$severity === 'danger' ? '#dc2626' : p.$severity === 'info' ? '#2563eb' : '#d97706'};
  flex-shrink: 0;
`;

const WidgetCard = styled.div`
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.07);
  border-left: 5px solid ${p => p.$accent || '#1d4ed8'};
  overflow: hidden;
  animation: ${fadeInUp} 0.4s ease-out both;
  animation-delay: ${p => (p.$index || 0) * 0.06}s;
  transition: transform 0.2s, box-shadow 0.2s;
  min-height: 280px;
  
  @media (max-width: 768px) {
    min-height: 240px;
  }
  
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(15, 23, 42, 0.11); }
  ${p => p.$span2 && `grid-column: span 2; @media (max-width: 900px) { grid-column: span 1; }`}
  ${p => p.$spanFull && `grid-column: 1 / -1;`}
`;

const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.6rem;
  flex-shrink: 0;
`;

const WidgetTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${theme.colors.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-stretch: normal;
  letter-spacing: normal;
`;

const WidgetIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${p => p.$bg || '#dbeafe'};
  color: ${p => p.$color || '#1d4ed8'};
  font-size: 0.9rem;
`;

const WidgetBadge = styled.span`
  background: ${p => p.$bg || '#fee2e2'};
  color: ${p => p.$color || '#dc2626'};
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
`;

const CbLoadGate = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  min-height: 120px;
`;

const CbLoadRing = styled.span`
  display: inline-block;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3.5px solid #d1fae5;
  border-top-color: #059669;
  animation: ${spinAnim} 0.75s linear infinite;
`;

const CbLoadLabel = styled.span`
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.01em;
`;

const WidgetBody = styled.div`
  font-stretch: condensed;
  letter-spacing: -0.015em;
  ${p => p.$noScroll ? `
    padding: 0.5rem 1.25rem 1.25rem;
    overflow-y: visible;
  ` : `
    padding: 0.5rem 1.25rem 0;
    flex: 1 1 420px;
    min-height: 100px;
    overflow-y: auto;
    &::after {
      content: '';
      display: block;
      height: 1.25rem;
      flex-shrink: 0;
    }
  `}
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
`;

const ScrollableContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0.25rem;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
`;

const StatRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 0.75rem;
`;

const StatBox = styled.div`
  text-align: center;
  padding: 0.75rem 0.65rem;
  border-radius: 10px;
  background: ${p => p.$bg || '#f8f9fa'};
  cursor: ${p => p.$clickable ? 'pointer' : 'default'};
  transition: all 0.2s;
  ${p => p.$clickable && `&:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }`}
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${p => p.$color || theme.colors.primary};
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: ${theme.colors.gray500};
  margin-top: 0.2rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const ListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 6px;
  background: #f8fafc;
  &:hover { background: #edf2f7; }
  &:last-child { border-bottom: none; }
`;

const ListItemLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
`;

const ListItemTitle = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${theme.colors.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListItemSub = styled.span`
  font-size: 0.75rem;
  font-weight: 400;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListItemMeta = styled.span`
  font-size: 0.68rem;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: normal;
`;

const ListItemRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  flex-shrink: 0;
  margin-left: 0.75rem;
`;

const Amount = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${p => p.$color || theme.colors.primary};
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  background: ${p => p.$bg || '#dbeafe'};
  color: ${p => p.$color || '#1d4ed8'};
`;

const AlertItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: ${p => p.$bg || '#fffbeb'};
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  
  &:hover { 
    transform: translateX(3px); 
    box-shadow: 0 2px 8px rgba(0,0,0,0.08); 
  }
  
  &:hover .alert-arrow { 
    opacity: 1; 
    transform: translateX(2px); 
  }
  
  &:active {
    transform: scale(0.98) translateX(1px);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.05);
    background: ${p => {
      const bg = p.$bg || '#fffbeb';
      // Tmavší o 5% při kliknutí
      if (bg === '#fffbeb') return '#fef3c7';
      if (bg === '#fee2e2') return '#fecaca';
      if (bg === '#dbeafe') return '#bfdbfe';
      return bg;
    }};
  }
  
  &:last-child { margin-bottom: 0; }
`;

const AlertIcon = styled.span`
  font-size: 1.1rem;
  color: ${p => p.$color || '#f59e0b'};
  flex-shrink: 0;
  margin-top: 0.1rem;
`;

const AlertText = styled.div`
  flex: 1;
`;

const AlertTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${theme.colors.primary};
`;

const AlertMsg = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.gray500};
  margin-top: 0.1rem;
`;

const AlertMeta = styled.div`
  font-size: 0.7rem;
  color: ${theme.colors.gray400};
  margin-top: 0.2rem;
`;

const NotifItem = styled.div`
  display: flex;
  gap: 0.6rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${theme.colors.gray100};
  &:last-child { border-bottom: none; }
`;

const NotifDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color || '#3b82f6'};
  flex-shrink: 0;
  margin-top: 0.35rem;
`;

const NotifText = styled.div`
  font-size: 0.8rem;
  color: ${theme.colors.primary};
  line-height: 1.4;
`;

const NotifTime = styled.div`
  font-size: 0.7rem;
  color: ${theme.colors.gray500};
  margin-top: 0.1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 1.5rem;
  color: ${theme.colors.gray500};
  font-size: 0.85rem;
`;

const ViewAllLink = styled.div`
  text-align: right;
  padding-top: 0.5rem;
  a, button {
    background: none;
    border: none;
    color: ${theme.colors.primaryAccent};
    font-size: 0.8rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    &:hover { text-decoration: underline; }
  }
`;

const AvatarCircle = styled.div`
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${theme.colors.primaryAccentAlt} 0%, ${theme.colors.primaryAccentAltHover} 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const WelcomeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const WelcomeInfo = styled.div`
  flex: 1;
`;

const WelcomeName = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${theme.colors.primary};
`;

const WelcomeRole = styled.div`
  font-size: 0.8rem;
  color: ${theme.colors.gray500};
  margin-top: 0.15rem;
`;

const WelcomeDate = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.gray500};
  margin-top: 0.3rem;
`;

const WelcomeNameday = styled.div`
  font-size: 0.8rem;
  color: #7c3aed;
  margin-top: 0.25rem;
  svg { margin-right: 0.3rem; }
`;

const WelcomeTickerRow = styled.div`
  margin-top: 0.4rem;
`;

const PlanningTicker = styled.div`
  margin-top: 0.55rem;
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  border: 1px solid #b91c1c;
  background: #991b1b;
`;

const PlanningTickerTitle = styled.div`
  font-size: 0.65rem;
  font-weight: 700;
  color: #fde68a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
`;

const PlanningTickerActions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const PlanningTickerRestart = styled.button`
  background: none;
  border: none;
  color: #fde68a;
  cursor: pointer;
  padding: 0.1rem 0.2rem;
  font-size: 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;

  &:hover {
    background: rgba(253, 230, 138, 0.15);
  }
`;

const PlanningTickerViewport = styled.div`
  max-height: calc(1.35em * 3 + 0.2rem);
  overflow: hidden;
  position: relative;
`;

const PlanningTickerContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  animation: ${tickerRoll} var(--ticker-duration, 16s) linear forwards;
  will-change: transform;
`;

const PlanningTickerItem = styled.div`
  font-size: 0.78rem;
  line-height: 1.35;
  color: #fde68a;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(253, 230, 138, 0.35);

  &:first-of-type {
    padding-top: 0;
    border-top: none;
  }

  p, ul, ol {
    margin: 0;
    padding: 0;
  }

  ul, ol {
    padding-left: 1.1rem;
  }
`;

const PlanningTickerItemTitle = styled.div`
  font-weight: 700;
  font-size: 0.78rem;
  color: #fde68a;
  margin-bottom: 0.1rem;
`;

const PlanningTickerHtml = styled.div`
  font-size: 0.78rem;
  line-height: 1.35;
  color: #fde68a;
`;

const PlanningFullscreenScroll = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: ${tickerRoll} var(--ticker-duration, 20s) linear forwards;
  will-change: transform;
`;

const WelcomeDivider = styled.hr`
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0.75rem 0 0.6rem;
`;

const NewsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const NewsSectionTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${theme.colors.gray500};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.1rem;
`;

const NewsItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  background: ${p => p.$bg || '#f0fdf4'};
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.8; }
`;

const NewsIcon = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p => p.$color || '#10b981'}20;
  color: ${p => p.$color || '#10b981'};
  font-size: 0.65rem;
  flex-shrink: 0;
`;

const NewsText = styled.span`
  font-size: 0.75rem;
  color: #374151;
  flex: 1;
`;

const NewsCount = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  color: ${p => p.$color || '#10b981'};
`;

const NewsEmpty = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.gray400};
  font-style: italic;
  padding: 0.25rem 0;
`;

const LoadingSkeleton = styled.div`
  height: ${p => p.$h || '200px'};
  border-radius: 14px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s ease infinite;
`;

// Config modal
const ConfigOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ConfigPanel = styled.div`
  background: white;
  border-radius: 16px;
  width: min(95vw, 780px);
  max-height: 85vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
`;

const ConfigHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${theme.colors.gray200};
`;

const ConfigTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${theme.colors.primary};
  margin: 0;
`;

const ConfigCloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${theme.colors.gray500};
  font-size: 1.1rem;
  padding: 0.3rem;
  &:hover { color: ${theme.colors.primary}; }
`;

const ConfigBody = styled.div`
  padding: 0.75rem 1.25rem 1.25rem;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 1rem;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
`;

const ConfigItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.5rem;
  border-radius: 8px;
  border: 1px solid ${theme.colors.gray100};
  cursor: grab;
  transition: background 0.15s;
  &:hover { background: ${theme.colors.gray100}; }
`;

const ConfigItemIcon = styled.span`
  color: ${theme.colors.gray300};
  cursor: grab;
`;

const ConfigItemInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConfigItemTitle = styled.span`
  font-size: 0.85rem;
  color: ${theme.colors.primary};
  font-weight: 500;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  input { opacity: 0; width: 0; height: 0; }
  span {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: ${theme.colors.gray300};
    border-radius: 11px;
    transition: 0.3s;
    &:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }
  }
  input:checked + span {
    background: ${theme.colors.primaryAccent};
    &:before { transform: translateX(18px); }
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' Kč';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
};

const getInitials = (jmeno, prijmeni) => {
  return ((jmeno?.[0] || '') + (prijmeni?.[0] || '')).toUpperCase() || '?';
};

const getAlertBg = (type) => {
  if (type === 'danger') return '#fef2f2';
  if (type === 'warning') return '#fffbeb';
  if (type === 'planning') return '#e0f2fe';
  return '#f0fdf4';
};

const getAlertColor = (type) => {
  if (type === 'danger') return '#dc2626';
  if (type === 'warning') return '#f59e0b';
  if (type === 'planning') return '#0284c7';
  return '#10b981';
};

const getNotifColor = (priorita) => {
  if (priorita === 'urgent' || priorita === 'high') return '#dc2626';
  if (priorita === 'normal') return '#3b82f6';
  return '#94a3b8';
};

const STATUS_COLORS = {
  NOVA: { bg: '#dbeafe', color: '#1d4ed8' },
  KE_SCHVALENI: { bg: '#fee2e2', color: '#dc2626' },
  ODESLANA_KE_SCHVALENI: { bg: '#fee2e2', color: '#dc2626' },
  SCHVALENA: { bg: '#dcfce7', color: '#166534' },
  ZAMITNUTA: { bg: '#e5e7eb', color: '#6b7280' },
  ROZPRACOVANA: { bg: '#fef3c7', color: '#b45309' },
  ODESLANA: { bg: '#e0f2fe', color: '#0284c7' },
  ODESLANA_DODAVATELI: { bg: '#e0f2fe', color: '#0284c7' },
  POTVRZENA: { bg: '#ede9fe', color: '#7c3aed' },
  FAKTURACE: { bg: '#fef9c3', color: '#a16207' },
  VECNA_SPRAVNOST: { bg: '#fce7f3', color: '#be185d' },
  UVEREJNIT: { bg: '#dcfce7', color: '#15803d' },
  DOKONCENA: { bg: '#d1fae5', color: '#059669' },
  ZRUSENA: { bg: '#f3f4f6', color: '#9ca3af' }
};

const STATUS_LABELS = {
  NOVA: 'Nová',
  KE_SCHVALENI: 'Ke schválení',
  ODESLANA_KE_SCHVALENI: 'Ke schválení',
  SCHVALENA: 'Schválená',
  ZAMITNUTA: 'Zamítnutá',
  ROZPRACOVANA: 'Rozpracovaná',
  ODESLANA: 'Odeslaná dodavateli',
  ODESLANA_DODAVATELI: 'Odeslaná dodavateli',
  POTVRZENA: 'Potvrzená dodavatelem',
  FAKTURACE: 'Fakturace',
  VECNA_SPRAVNOST: 'Věcná správnost',
  UVEREJNIT: 'Ke zveřejnění',
  DOKONCENA: 'Dokončená',
  ZRUSENA: 'Zrušená'
};

const getStatusBadge = (stav) => {
  const s = STATUS_COLORS[stav] || { bg: '#f3f4f6', color: '#6b7280' };
  return s;
};

const getStatusLabel = (stav) => STATUS_LABELS[stav] || stav;

const FA_STATUS_COLORS = {
  ZAEVIDOVANA:   { bg: '#dbeafe', color: '#1d4ed8' },
  VECNA_SPRAVNOST: { bg: '#fce7f3', color: '#be185d' },
  V_RESENI:      { bg: '#fef3c7', color: '#b45309' },
  PREDANA_PO:    { bg: '#ede9fe', color: '#7c3aed' },
  K_ZAPLACENI:   { bg: '#d1fae5', color: '#065f46' },
  ZAPLACENO:     { bg: '#dcfce7', color: '#16a34a' },
  DOKONCENA:     { bg: '#d1fae5', color: '#059669' },
  STORNO:        { bg: '#f3f4f6', color: '#9ca3af' },
};

const FA_STATUS_LABELS = {
  ZAEVIDOVANA:    'Zaevidována',
  VECNA_SPRAVNOST: 'Věcná správnost',
  V_RESENI:       'V řešení',
  PREDANA_PO:     'Předána PO',
  K_ZAPLACENI:    'K zaplacení',
  ZAPLACENO:      'Zaplaceno',
  DOKONCENA:      'Dokončena',
  STORNO:         'Storno',
};

const getFaStatusBadge = (stav) => FA_STATUS_COLORS[stav] || { bg: '#f3f4f6', color: '#6b7280' };
const getFaStatusLabel = (stav) => FA_STATUS_LABELS[stav] || stav || '—';

// ============================================================================
// WIDGET COMPONENTS
// ============================================================================

// ── RSS Zprávy ──────────────────────────────────────────────────────────────
function RssNewsWidget({ items, loading, error, feedStatuses, maxItems = 15 }) {
  // Načíst skryté kanály z localStorage při inicializaci
  const [hiddenFeeds, setHiddenFeeds] = useState(() => {
    try {
      const saved = localStorage.getItem('rss_hidden_feeds');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const okFeeds = (feedStatuses || []).filter(f => f.status === 'ok');

  // Uložit změny do localStorage
  useEffect(() => {
    try {
      localStorage.setItem('rss_hidden_feeds', JSON.stringify(hiddenFeeds));
    } catch (e) {
      console.error('Chyba při ukládání RSS nastavení:', e);
    }
  }, [hiddenFeeds]);

  const toggleFeed = (name) => {
    setHiddenFeeds(prev => {
      if (prev.includes(name)) return prev.filter(n => n !== name);
      const wouldBeActive = okFeeds.filter(f => !prev.includes(f.name) && f.name !== name).length;
      if (wouldBeActive < 1) return prev;
      return [...prev, name];
    });
  };

  // Round-robin: rovnoměrně z každého aktivního feedu, pak seřadit dle data
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    const visible = hiddenFeeds.length > 0
      ? items.filter(it => !hiddenFeeds.includes(it.feed_name))
      : items;

    // Seskupit dle feed_name
    const byFeed = {};
    visible.forEach(it => {
      const fn = it.feed_name || '_';
      if (!byFeed[fn]) byFeed[fn] = [];
      byFeed[fn].push(it);
    });

    const feedNames = Object.keys(byFeed);
    if (feedNames.length <= 1) return visible.slice(0, maxItems);

    // Rovnoměrné rozdělení: perFeed = ceil(maxItems / feedCount)
    const perFeed = Math.ceil(maxItems / feedNames.length);
    const picked = [];
    feedNames.forEach(fn => {
      picked.push(...byFeed[fn].slice(0, perFeed));
    });

    // Seřadit dle data a oříznout na maxItems
    // Pro položky bez data (např. Finanční správa) použít stabilní pseudo-náhodné datum
    picked.sort((a, b) => {
      let da = a.pub_date_raw ? new Date(a.pub_date_raw).getTime() : 0;
      let db = b.pub_date_raw ? new Date(b.pub_date_raw).getTime() : 0;
      
      const now = Date.now();
      const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
      
      // Pro položky bez data: stabilní pseudo-náhodné datum z poslední doby (hash z GUID/title)
      if (da === 0 || da > now) {
        const seed = a.guid || a.title || '';
        const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        da = twoWeeksAgo + (hash % (now - twoWeeksAgo));
      }
      if (db === 0 || db > now) {
        const seed = b.guid || b.title || '';
        const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        db = twoWeeksAgo + (hash % (now - twoWeeksAgo));
      }
      
      return db - da;
    });
    return picked.slice(0, maxItems);
  }, [items, hiddenFeeds, maxItems]);

  if (loading && (!items || items.length === 0)) return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem'}}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{display: 'flex', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', background: '#f9fafb', border: '1px solid #f3f4f6'}}>
          <LoadingSkeleton $h="48px" style={{width: '64px', minWidth:'64px', borderRadius:'6px'}} />
          <div style={{flex: 1, display:'flex', flexDirection:'column', gap:'0.35rem'}}>
            <LoadingSkeleton $h="14px" style={{width: `${70 + (i * 5) % 25}%`, borderRadius:'4px'}} />
            <LoadingSkeleton $h="11px" style={{width: `${85 - (i * 7) % 30}%`, borderRadius:'4px'}} />
            <LoadingSkeleton $h="10px" style={{width: '40%', borderRadius:'4px'}} />
          </div>
        </div>
      ))}
    </div>
  );
  if (error) return <div style={{textAlign: 'center', padding: '2rem', color: '#dc2626'}}>Nepodařilo se načíst zprávy</div>;
  if (!items || items.length === 0) return <div style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>Žádné zprávy</div>;
  
  return (
    <div style={{display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0}}>
      {feedStatuses && feedStatuses.length > 0 && (
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.35rem', padding: '0.35rem 0.5rem 0.5rem', borderBottom: '1px solid #f3f4f6', marginBottom: '0.25rem'}}>
          {feedStatuses.map((fs, i) => {
            const isOk = fs.status === 'ok';
            const isHidden = hiddenFeeds.includes(fs.name);
            const isActive = isOk && !isHidden;
            const feedItemCount = isOk ? filteredItems.filter(it => it.feed_name === fs.name).length : 0;
            return (
              <span key={i}
                title={fs.error || (isHidden ? 'Klikni pro zobrazení' : 'Klikni pro skrytí') + (fs.resolved_url !== fs.url ? ` | Nalezeno: ${fs.resolved_url}` : '')}
                onClick={isOk ? () => toggleFeed(fs.name) : undefined}
                style={{
                  fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 500,
                  cursor: isOk ? 'pointer' : 'default',
                  background: isActive ? '#dcfce7' : fs.status === 'error' ? '#fee2e2' : '#f3f4f6',
                  color: isActive ? '#16a34a' : fs.status === 'error' ? '#dc2626' : '#9ca3af',
                  opacity: isHidden ? 0.55 : 1,
                  textDecoration: isHidden ? 'line-through' : 'none',
                  transition: 'all 0.15s',
                  userSelect: 'none',
                }}
              >
                {fs.name} {isOk ? `(${feedItemCount})` : fs.status === 'disabled' ? '(vyp.)' : '✗'}
              </span>
            );
          })}
        </div>
      )}
      <ScrollableContent>
      {filteredItems.map((item, idx) => (
        <a
          key={item.guid || idx}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', gap: '0.75rem', padding: '0.6rem 0.75rem',
            borderRadius: '8px', textDecoration: 'none', color: 'inherit',
            background: idx % 2 === 0 ? '#f9fafb' : 'white',
            border: '1px solid #f3f4f6',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
          onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? '#f9fafb' : 'white'; e.currentTarget.style.borderColor = '#f3f4f6'; }}
        >
          {/* Obrázek nebo placeholder s názvem feedu */}
          {item.image_url ? (
            <img
              src={item.image_url}
              alt=""
              style={{width: '64px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0}}
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
              }}
            />
          ) : null}
          <div style={{
            width: '64px', height: '48px', flexShrink: 0, borderRadius: '6px',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
            display: item.image_url ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            padding: '4px', textAlign: 'center', userSelect: 'none'
          }}>
            <span style={{fontSize: '0.95rem', lineHeight: 1}}>📰</span>
            <span style={{
              fontSize: '0.45rem', fontWeight: 700, color: 'white', marginTop: '2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '56px'
            }}>
              {item.feed_name || 'RSS'}
            </span>
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: '0.82rem', fontWeight: 600, color: '#1f2937', lineHeight: 1.3, marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
              {item.title}
            </div>
            <div style={{fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
              {item.description}
            </div>
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.68rem', color: '#9ca3af'}}>
              {item.category && <span style={{background: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: '4px'}}>{item.category}</span>}
              <span>{item.pub_date}</span>
              {item.feed_name && <span style={{fontStyle: 'italic'}}>{item.feed_name}</span>}
            </div>
          </div>
        </a>
      ))}
    </ScrollableContent>
    </div>
  );
}

// ── SUPERADMIN: Aktivní uživatelé ──────────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: '5min', label: 'Online',  title: 'Aktivní posledních 5 minut', color: '#16a34a' },
  { key: '12h',  label: '12h',     title: 'Přihlášeni za posledních 12 hodin', color: '#0891b2' },
  { key: '24h',  label: '24h',     title: 'Přihlášeni za posledních 24 hodin', color: '#7c3aed' },
  { key: '7d',   label: '7 dní',   title: 'Přihlášeni za posledních 7 dní',    color: '#b45309' },
];

const LS_PERIOD_KEY = 'dashboard_active_users_period';
const LS_SORT_KEY   = 'dashboard_active_users_sort';

// Cyklus sortá 3 fáze: null → asc → desc → null
function nextSortPhase(cur, field, activeField) {
  if (activeField !== field) return { field, dir: 'asc' };
  if (cur === 'asc')  return { field, dir: 'desc' };
  return { field: null, dir: null };
}

function ActiveUsersAdminWidget({ data, navigate, token, username, setQuickMessageUser, onPeriodChange }) {
  const [period, setPeriod]         = useState(() => {
    try { return localStorage.getItem(LS_PERIOD_KEY) || '5min'; } catch { return '5min'; }
  });
  const [localData, setLocalData]   = useState(data);
  const [loading, setLoading]       = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});  // {user_id: unread_count}

  // Vlastní auto-refresh widgetu každých 30s podle aktuální periody
  useEffect(() => {
    let cancelled = false;
    const fetch30 = async () => {
      const d = await getActiveUsersAdmin({ token, username, period });
      if (d && !cancelled) setLocalData(d);
    };
    fetch30();
    const iv = setInterval(fetch30, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [token, username, period]); // re-mounts při změně periody

  // ✅ Načíst počty nepřečtených zpráv pro všechny uživatele
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!localData?.items || localData.items.length === 0) {
        return;
      }
      
      const newCounts = {};
      await Promise.all(
        localData.items.map(async (user) => {
          try {
            const count = await getAdminMessagesUnreadCount(user.id);
            if (count > 0) {
              newCounts[user.id] = count;
            }
          } catch (error) {
            // tiché selhání - nevypisuj do konzole
          }
        })
      );
      setUnreadCounts(newCounts);
    };
    
    fetchUnreadCounts();
  }, [localData?.items]);

  // Synchronizace counts z externího data (quick-tile badge) — jen counts, ne items
  useEffect(() => {
    if (data?.counts) {
      setLocalData(prev => prev ? { ...prev, counts: data.counts } : data);
    }
  }, [data?.counts]);

  const switchPeriod = useCallback(async (p) => {
    if (p === period) return;
    try { localStorage.setItem(LS_PERIOD_KEY, p); } catch { /* ignore */ }
    setPeriod(p); // useEffect výše se spustí s novou periodou
    if (onPeriodChange) onPeriodChange(p); // Notifikuj parent o změně
    setLoading(true);
    try {
      const d = await getActiveUsersAdmin({ token, username, period: p });
      if (d) setLocalData(d);
    } finally {
      setLoading(false);
    }
  }, [period, token, username, onPeriodChange]);

  // Sort state (3 fáze: null → asc → desc → null)
  const [sort, setSort] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_SORT_KEY)) || { field: 'dt_posledni_aktivita', dir: 'desc' }; } catch { return { field: 'dt_posledni_aktivita', dir: 'desc' }; }
  });

  const handleSort = useCallback((field) => {
    setSort(prev => {
      const next = nextSortPhase(prev.dir, field, prev.field);
      try { localStorage.setItem(LS_SORT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const rawItems = localData?.items || [];
  const counts   = localData?.counts || {};
  const activePeriod = PERIOD_OPTIONS.find(o => o.key === period);

  // Aplikace sortu
  const items = useMemo(() => {
    if (!sort.field || !sort.dir) return rawItems;
    return [...rawItems].sort((a, b) => {
      const sortField = sort.field === 'dt_pred' ? 'dt_posledni_aktivita' : sort.field;
      let av = a[sortField], bv = b[sortField];
      // datum jako číslo
      if (sortField === 'dt_posledni_aktivita') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }
      // string
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [rawItems, sort]);

  const formatAgo = (dt) => {
    if (!dt) return '–';
    const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  const formatDateTime = (dt) => {
    if (!dt) return '–';
    return new Date(dt).toLocaleString('cs-CZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Mapování URL na názvy modulů
  const MODULE_LABELS = {
    '/orders25-list-v3': 'Objednávky',
    '/orders25-list': 'Objednávky',
    '/invoices': 'Faktury',
    '/invoices25-list': 'Faktury',
    '/dashboard': 'Domovská stránka',
    '/users': 'Správa uživatelů',
    '/smlouvy': 'Smlouvy',
    '/lp': 'LP',
    '/reports': 'Reporty',
    '/cashbook': 'Pokladna',
    '/cash-book': 'Pokladna',
    '/stats-reports': 'Statistika a reporty',
    '/dictionaries': 'Číselníky',
    '/address-book': 'Adresář',
    '/contacts': 'Kontakty',
    '/notifications': 'Notifikace',
    '/profile': 'Profil',
    '/app-settings': 'Nastavení aplikace',
    '/organization-hierarchy': 'Organizační struktura',
    '/annual-fees': 'Roční poplatky',
    '/cerpani': 'Čerpání LP',
    '/suppliers': 'Dodavatelé',
  };

  // Mapování sekcí pro Statistiky a reporty (/stats-reports?tab=...)
  const STATS_SECTIONS = {
    'control': 'Finanční kontrola',
    'vzdel': 'Vzdělávání',
    'spend': 'Čerpání',
    'reports': 'Reporty',
    'stats': 'Statistiky',
    'attachments': 'Přílohy',
    'pivot': 'Agregační tabulka - vlastní',
    'cashbook': 'Přehled pokladen',
    'dohadne': 'Dohadné položky',
  };

  // Mapování sekcí pro Číselníky (/dictionaries?tab=...)
  const DICT_SECTIONS = {
    'docx': 'DOCX Šablony',
    'cashbook': 'Pokladní knihy',
    'smlouvy': 'Smlouvy',
    'lokality': 'Lokality',
    'pozice': 'Pozice',
    'prava': 'Práva',
    'role': 'Role',
    'stavy': 'Stavy',
    'useky': 'Úseky',
    'organizace': 'Organizace',
  };

  // Parsuje cestu a vrací lidsky čitelný název s případnou sekcí
  const getModuleLabel = (modul, cesta) => {
    if (!modul && !cesta) return null;
    const path = cesta || modul || '';
    
    // Parse URL - rozděl na pathname a query params
    let pathname = path;
    let queryParams = '';
    if (path.includes('?')) {
      [pathname, queryParams] = path.split('?');
    }

    // Najdi základní název modulu
    let baseLabel = null;
    for (const [key, val] of Object.entries(MODULE_LABELS)) {
      if (pathname.includes(key)) {
        baseLabel = val;
        break;
      }
    }

    // Pokud nenajdeme v mapě, použij modul nebo poslední část cesty
    if (!baseLabel) {
      baseLabel = modul || pathname.split('/').filter(Boolean).pop() || null;
    }

    // Pokud nejsou query params, vrať jen základní label
    if (!queryParams || !baseLabel) {
      return baseLabel;
    }

    // Parse query params - hledej 'tab=...'
    const tabMatch = queryParams.match(/tab=([^&]+)/);
    if (!tabMatch) {
      return baseLabel;
    }

    const tabValue = tabMatch[1];
    let sectionLabel = null;

    // Mapování sekcí podle modulu
    if (pathname.includes('/stats-reports') && STATS_SECTIONS[tabValue]) {
      sectionLabel = STATS_SECTIONS[tabValue];
    } else if (pathname.includes('/dictionaries') && DICT_SECTIONS[tabValue]) {
      sectionLabel = DICT_SECTIONS[tabValue];
    }

    // Vrať "Modul (Sekce)" pokud máme sekci, jinak jen "Modul"
    if (sectionLabel) {
      return `${baseLabel} (${sectionLabel})`;
    }

    return baseLabel;
  };

  const ROLE_BADGES = {
    SUPERADMIN:            { label: 'SA',  title: 'Superadmin – plný přístup k systému',             color: '#dc2626' },
    ADMINISTRATOR:         { label: 'ADM', title: 'Administrátor – správa uživatelů a nastavení',      color: '#7c3aed' },
    UCETNI:                { label: 'ÚČT', title: 'Účetní – správa a zpracování faktur',               color: '#0891b2' },
    HLAVNI_UCETNI:         { label: 'HÚ',  title: 'Hlavní účetní – vedoucí účetního oddělení',         color: '#0891b2' },
    PRIKAZCE_OPERACE:      { label: 'PŘO', title: 'Příkazce operace – schvalování objednávek',         color: '#059669' },
    PRIKAZCE:              { label: 'PŘ',  title: 'Příkazce – schvalování objednávek',                 color: '#059669' },
    SPRAVCE_ROZPOCTU:      { label: 'SR',  title: 'Správce rozpočtu – kontrola a správa rozpočtu',    color: '#b45309' },
    KONTROLOR_FAKTUR:      { label: 'KF',  title: 'Kontrolor faktur – věcná správnost faktur',         color: '#6366f1' },
    KONTROLOR_OBJEDNAVEK:  { label: 'KO',  title: 'Kontrolor objednávek – kontrola objednávek',        color: '#6366f1' },
    ROZPOCTAR:             { label: 'RZP', title: 'Rozpočtář – tvorba a správa rozpočtu',              color: '#b45309' },
    VEDOUCI:               { label: 'VED', title: 'Vedoucí – vedoucí pracovník',                       color: '#0f766e' },
    VEDOUCI_ODDELENI:      { label: 'VED', title: 'Vedoucí oddělení',                                  color: '#0f766e' },
    VEDOUCI_AUTODILNY:     { label: 'VAD', title: 'Vedoucí autodílny',                                 color: '#0f766e' },
    NAMESTEK:              { label: 'NÁM', title: 'Náměstek – náměstek vedoucího',                     color: '#0f766e' },
    REDITEL:               { label: 'ŘED', title: 'Ředitel – ředitel organizace',                      color: '#0f766e' },
    VEREJNE_ZAKAZKY:       { label: 'VZ',  title: 'Veřejné zakázky – správa veřejných zakázek',       color: '#7c3aed' },
    THP_PES:               { label: 'THP', title: 'THP/PES – technicko-hospodářský pracovník',         color: '#64748b' },
    PRIMAR:                { label: 'PRM', title: 'Primář',                                            color: '#0f766e' },
    REFERENT:              { label: 'REF', title: 'Referent (sklad)',                                   color: '#64748b' },
    VRCHNI:                { label: 'VRC', title: 'Vrchní',                                            color: '#0f766e' },
  };

  if (items.length === 0 && !loading) {
    return (
      <WidgetBody>
        {/* Period badges */}
        <div style={{ display: 'flex', gap: '0.4rem', padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
          {PERIOD_OPTIONS.map(o => (
            <button key={o.key} onClick={() => switchPeriod(o.key)} title={o.title} style={{
              padding: '0.2rem 0.6rem', borderRadius: 20, border: `1.5px solid ${period === o.key ? o.color : '#e2e8f0'}`,
              background: period === o.key ? o.color + '18' : '#f8fafc', color: period === o.key ? o.color : '#64748b',
              fontWeight: period === o.key ? 700 : 500, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}>
              {o.label}
              {counts[o.key] > 0 && (
                <span style={{ background: o.color, color: '#fff', borderRadius: 10, fontSize: '0.65rem', padding: '0 0.35rem', fontWeight: 700 }}>
                  {counts[o.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <EmptyState>
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Žádní uživatelé ({activePeriod?.title?.toLowerCase()})</div>
        </EmptyState>
      </WidgetBody>
    );
  }

  return (
    <WidgetBody $noScroll style={{ padding: 0 }}>
      {/* Period badge lišta */}
      <div style={{ display: 'flex', gap: '0.4rem', padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIOD_OPTIONS.map(o => (
          <button key={o.key} onClick={() => switchPeriod(o.key)} title={o.title} style={{
            padding: '0.2rem 0.6rem', borderRadius: 20, border: `1.5px solid ${period === o.key ? o.color : '#e2e8f0'}`,
            background: period === o.key ? o.color + '18' : '#f8fafc', color: period === o.key ? o.color : '#64748b',
            fontWeight: period === o.key ? 700 : 500, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '0.3rem'
          }}>
            {o.label}
            <span style={{ background: counts[o.key] > 0 ? o.color : '#e2e8f0', color: counts[o.key] > 0 ? '#fff' : '#94a3b8', borderRadius: 10, fontSize: '0.65rem', padding: '0 0.35rem', fontWeight: 700, minWidth: '1rem', textAlign: 'center' }}>
              {counts[o.key] ?? 0}
            </span>
          </button>
        ))}
        {loading && <FontAwesomeIcon icon={faSync} spin style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: 'auto' }} />}
      </div>
      <style>{`
        .dash-act-scroll { overflow-x: auto; overflow-y: auto; max-height: 520px; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .dash-act-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .dash-act-scroll::-webkit-scrollbar-track { background: transparent; }
        .dash-act-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .dash-act-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dash-act-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFrame, sans-serif; letter-spacing: -0.01em; }
        .dash-act-table a, .dash-act-table button { font: inherit; letter-spacing: inherit; }
        .dash-act-th { text-align: left; padding: 0.5rem 0.35rem 0.5rem 1em; font-weight: 600; color: #334155; background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border-bottom: 2px solid #cbd5e1; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.025em; font-size: 0.8rem; position: sticky; top: 0; z-index: 2; }
        .dash-act-th.sortable { cursor: pointer; user-select: none; }
        .dash-act-th.sortable:hover { background: #e2e8f0; }
        .dash-act-th.active { color: #1d4ed8; background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%); border-bottom: 2px solid #3b82f6; }
        .dash-act-th.active:hover { background: #bfdbfe; }
        .dash-act-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s ease; }
        .dash-act-table tbody tr:nth-of-type(even) { background-color: #f8fafc; }
        .dash-act-table tbody tr:hover { background-color: #e8f0fe !important; }
        .dash-act-table tbody tr.dash-act-online { background-color: #f0fdf4; }
        .dash-act-table tbody tr.dash-act-online:hover { background-color: #dcfce7 !important; }
        .dash-act-td { padding: 0.6rem 0.8rem; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
      `}</style>
      <div className="dash-act-scroll">
        <table className="dash-act-table">
          <thead>
            <tr>
              {[
                { field: 'cele_jmeno',                  label: 'Uživatel',          align: 'left'   },
                { field: 'usek_zkr',                    label: 'Úsek / Pozice',     align: 'left'   },
                { field: 'lokalita',                    label: 'Lokalita',          align: 'left'   },
                { field: 'pocet_objednavek_objednatel', label: 'Objednal',          align: 'center' },
                { field: 'pocet_schvalenych',           label: 'Schválil',          align: 'center' },
                { field: 'pocet_ke_schvaleni',          label: 'Ke schválení',      align: 'center' },
                { field: 'email',                       label: 'E-mail',            align: 'center' },
                { field: 'telefon',                     label: 'Telefon',           align: 'center' },
                { field: 'modul',                       label: 'Modul',             align: 'left'   },
                { field: 'ip_adresa',                   label: 'IP adresa',         align: 'left'   },
                { field: 'dt_posledni_aktivita',        label: 'Poslední aktivita', align: 'right'  },
                { field: 'dt_pred',                     label: 'Před',              align: 'center' },
              ].map(({ field, label, align }) => {
                const isActive = field && sort.field === field;
                const sortSymbol = !isActive ? '⇅' : (sort.dir === 'asc' ? '↑' : '↓');
                const cls = ['dash-act-th', field ? 'sortable' : '', isActive ? 'active' : ''].filter(Boolean).join(' ');
                return (
                  <th key={label} className={cls} onClick={() => field && handleSort(field)} style={{ textAlign: align }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', width: '100%' }}>
                      {label}
                      {field && <span style={{ fontSize: '0.65rem', opacity: isActive ? 1 : 0.3, color: isActive ? '#2563eb' : 'inherit' }}>{sortSymbol}</span>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((u, i) => {
              const modulLabel = getModuleLabel(u.modul, u.cesta);
              const isPrikazce = (u.role_kody || []).some(r =>
                r && (r.startsWith('PRIKAZCE') || r === 'SPRAVCE_ROZPOCTU' || r === 'SUPERADMIN' || r === 'ADMINISTRATOR')
              );
              const isOnline = u.dt_posledni_aktivita &&
                (Date.now() - new Date(u.dt_posledni_aktivita).getTime()) < 5 * 60 * 1000;
              return (
                <tr key={u.id} className={isOnline ? 'dash-act-online' : ''}>
                  <td className="dash-act-td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#22c55e' : '#cbd5e1', flexShrink: 0 }} title={isOnline ? 'Online' : 'Offline'} />
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{u.cele_jmeno}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({u.username})</span>
                      {u.auth_method === 'entra_id' && (
                        <span title="Přihlášen přes Microsoft 365" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.3rem', fontSize: '0.7rem', color: '#0078d4', cursor: 'help' }}>
                          <svg viewBox="0 0 23 23" width="14" height="14" style={{ marginRight: '2px' }}>
                            <rect x="1" y="1" width="10" height="10" fill="#f25022" />
                            <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
                            <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
                            <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
                          </svg>
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setQuickMessageUser(u); }}
                        style={{ 
                          marginLeft: '0.5rem', 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          color: '#3b82f6', 
                          fontSize: '0.85rem', 
                          padding: '0.2rem 0.4rem', 
                          borderRadius: '4px', 
                          transition: 'all 0.15s',
                          position: 'relative'
                        }}
                        title="Odeslat rychlou zprávu uživateli"
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#3b82f6'; }}
                      >
                        <FontAwesomeIcon icon={faPaperPlane} />
                        {unreadCounts[u.id] > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            background: '#dc2626',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: '700',
                            padding: '1px 4px',
                            borderRadius: '8px',
                            minWidth: '14px',
                            textAlign: 'center',
                            lineHeight: '1.2'
                          }}>
                            {unreadCounts[u.id]}
                          </span>
                        )}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      {(u.role_kody || []).filter(r => ROLE_BADGES[r]).map(r => (
                        <span key={r} title={ROLE_BADGES[r].title} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: 4, background: ROLE_BADGES[r].color + '1a', color: ROLE_BADGES[r].color, border: `1px solid ${ROLE_BADGES[r].color}40`, cursor: 'help' }}>
                          {ROLE_BADGES[r].label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="dash-act-td" style={{ color: '#475569' }}>
                    {u.usek_zkr && <span style={{ fontWeight: 600 }}>{u.usek_zkr}</span>}
                    {u.pozice && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{u.pozice}</div>}
                  </td>
                  <td className="dash-act-td" style={{ color: '#475569' }}>
                    {u.lokalita ? (
                      <span style={{ fontSize: '0.85rem' }}>{u.lokalita}</span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>–</span>
                    )}
                  </td>
                  <td className="dash-act-td" style={{ textAlign: 'center', fontWeight: 600, color: u.pocet_objednavek_objednatel > 0 ? '#1d4ed8' : '#94a3b8' }}>
                    {u.pocet_objednavek_objednatel}
                  </td>
                  <td className="dash-act-td" style={{ textAlign: 'center', fontWeight: isPrikazce ? 600 : 400, color: isPrikazce && u.pocet_schvalenych > 0 ? '#059669' : '#94a3b8' }}>
                    {isPrikazce ? u.pocet_schvalenych : '–'}
                  </td>
                  <td className="dash-act-td" style={{ textAlign: 'center' }}>
                    {isPrikazce
                      ? <span style={{ fontWeight: 600, color: u.pocet_ke_schvaleni > 0 ? '#dc2626' : '#94a3b8' }}>{u.pocet_ke_schvaleni}</span>
                      : <span style={{ color: '#cbd5e1' }}>–</span>}
                  </td>
                  <td className="dash-act-td" style={{ textAlign: 'center' }}>
                    {u.email
                      ? <a href={`mailto:${u.email}`} onClick={e => e.stopPropagation()} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.78rem' }} title={`Odeslat e-mail: ${u.email}`} onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }} onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}>{u.email}</a>
                      : <span style={{ color: '#cbd5e1' }}>–</span>}
                  </td>
                  <td className="dash-act-td" style={{ textAlign: 'center' }}>
                    {u.telefon
                      ? <a href={`tel:${u.telefon.replace(/\s/g, '')}`} onClick={e => e.stopPropagation()} style={{ color: '#0891b2', textDecoration: 'none', fontSize: '0.78rem' }} title={`Volat: ${u.telefon}`} onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }} onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}>{u.telefon}</a>
                      : <span style={{ color: '#cbd5e1' }}>–</span>}
                  </td>
                  <td className="dash-act-td">
                    {modulLabel
                      ? <span style={{ padding: '0.15rem 0.45rem', borderRadius: 6, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: '0.75rem' }}>{modulLabel}</span>
                      : <span style={{ color: '#cbd5e1' }}>–</span>}
                  </td>
                  <td className="dash-act-td" style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {u.ip_adresa || <span style={{ color: '#cbd5e1' }}>–</span>}
                  </td>
                  <td className="dash-act-td" style={{ textAlign: 'right', color: '#64748b', fontSize: '0.78rem' }}>
                    {formatDateTime(u.dt_posledni_aktivita)}
                  </td>
                  <td className="dash-act-td" style={{ textAlign: 'center', color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {formatAgo(u.dt_posledni_aktivita)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </WidgetBody>
  );
}

// ── Počasí ──────────────────────────────────────────────────────────────────

const WMO_INFO = {
  0:  { text: 'Jasno',              Icon: Sun,          iconColor: '#fbbf24' },
  1:  { text: 'Skoro jasno',        Icon: Sun,          iconColor: '#fde68a' },
  2:  { text: 'Polojasno',          Icon: Cloud,        iconColor: '#e2e8f0' },
  3:  { text: 'Zataženo',           Icon: Cloud,        iconColor: '#cbd5e1' },
  45: { text: 'Mlha',               Icon: Cloud,        iconColor: '#94a3b8' },
  48: { text: 'Jinovatka',          Icon: Cloud,        iconColor: '#94a3b8' },
  51: { text: 'Slabé mrholení',     Icon: CloudDrizzle, iconColor: '#93c5fd' },
  53: { text: 'Mrholení',           Icon: CloudDrizzle, iconColor: '#60a5fa' },
  55: { text: 'Silné mrholení',     Icon: CloudDrizzle, iconColor: '#3b82f6' },
  61: { text: 'Slabý déšť',         Icon: CloudRain,    iconColor: '#93c5fd' },
  63: { text: 'Mírný déšť',         Icon: CloudRain,    iconColor: '#60a5fa' },
  65: { text: 'Silný déšť',         Icon: CloudRain,    iconColor: '#3b82f6' },
  71: { text: 'Slabé sněžení',      Icon: CloudSnow,    iconColor: '#bfdbfe' },
  73: { text: 'Sněžení',            Icon: CloudSnow,    iconColor: '#dbeafe' },
  75: { text: 'Silné sněžení',      Icon: CloudSnow,    iconColor: '#eff6ff' },
  77: { text: 'Ledové jehličky',    Icon: CloudSnow,    iconColor: '#eff6ff' },
  80: { text: 'Přeháňky',           Icon: CloudRain,    iconColor: '#93c5fd' },
  81: { text: 'Silné přeháňky',     Icon: CloudRain,    iconColor: '#60a5fa' },
  82: { text: 'Bouřkové přeháňky',  Icon: CloudRain,    iconColor: '#f59e0b' },
  95: { text: 'Bouřka',             Icon: CloudRain,    iconColor: '#fbbf24' },
  96: { text: 'Bouřka s krupobitím',Icon: CloudRain,    iconColor: '#fbbf24' },
  99: { text: 'Silná bouřka',       Icon: CloudRain,    iconColor: '#f97316' },
};

function WeatherWidget({ weatherData, weatherLoading, weatherError, onRefresh, showExternalButton, externalWindow, onOpenExternal, onCloseExternal }) {
  const isDay = weatherData?.is_day !== 0; // default: denní
  const bgGradient = isDay
    ? 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)'
    : 'linear-gradient(135deg, #1e293b 0%, #312e81 100%)';

  if (weatherLoading && !weatherData) {
    return (
      <div style={{
        background: bgGradient, borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '260px', gap: '0.75rem',
        color: '#fff', position: 'relative', overflow: 'hidden',
        width: '100%', height: '100%'
      }}>
        <FontAwesomeIcon icon={faSync} spin style={{ fontSize: '1.8rem', opacity: 0.8 }} />
        <span style={{ fontWeight: 500, opacity: 0.9, fontSize: '0.9rem' }}>Načítám počasí…</span>
      </div>
    );
  }
  if (weatherError || !weatherData) {
    return (
      <div style={{
        background: bgGradient, borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '260px', gap: '0.75rem',
        color: 'rgba(255,255,255,0.7)', position: 'relative', overflow: 'hidden',
        width: '100%', height: '100%'
      }}>
        <Cloud style={{ width: '2.5rem', height: '2.5rem', opacity: 0.6 }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Počasí není dostupné</span>
        <button onClick={onRefresh} style={{
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff', borderRadius: '999px', padding: '0.35rem 1rem',
          fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
          backdropFilter: 'blur(4px)'
        }}>Zkusit znovu</button>
      </div>
    );
  }

  const { temp, apparent_temp, humidity, wind_speed, wind_gusts, pressure, precipitation, weather_code, city, country, updated_at } = weatherData;
  const info = WMO_INFO[weather_code] || { text: 'Neznámo', Icon: Cloud, iconColor: '#e2e8f0' };
  const WeatherIcon = info.Icon || Cloud;

  return (
    <div style={{
      background: bgGradient,
      borderRadius: '24px',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      minHeight: '260px',
    }}>
      {/* Dekorativní kruhy */}
      <div style={{
        position: 'absolute', top: '-4rem', right: '-4rem',
        width: '10rem', height: '10rem',
        background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(2rem)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-4rem', left: '-4rem',
        width: '10rem', height: '10rem',
        background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(2rem)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
        {/* Hlavička */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin strokeWidth={2} style={{ width: '0.9rem', height: '0.9rem', opacity: 0.8, flexShrink: 0 }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.3px' }}>
              {city}{country ? `, ${country}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: 600,
              padding: '0.2rem 0.75rem',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '999px',
              backdropFilter: 'blur(4px)'
            }}>Dnes</span>
            <button onClick={onRefresh} title="Obnovit" style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              borderRadius: '50%', width: '1.6rem', height: '1.6rem',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)', transition: 'background 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <FontAwesomeIcon icon={faSync} style={{ fontSize: '0.7rem' }} />
            </button>
            {showExternalButton && (
              <button 
                onClick={() => externalWindow ? onCloseExternal() : onOpenExternal()} 
                title={externalWindow ? 'Zavřít externí okno' : 'Otevřít v externím okně (Always-on-Top)'}
                style={{
                  background: externalWindow ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', 
                  border: 'none', 
                  color: '#fff',
                  borderRadius: '50%', 
                  width: '1.6rem', 
                  height: '1.6rem',
                  cursor: 'pointer', 
                  display: 'flex',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)', 
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = externalWindow ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '0.7rem' }} />
              </button>
            )}
          </div>
        </div>

        {/* Teplota + lucide ikona počasí */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0', paddingBottom: '0.6rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1 }}>
              {Math.round(temp)}°
            </span>
            <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginTop: '0.2rem' }}>
              {info.text}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.15rem' }}>
              Pocitově {Math.round(apparent_temp)}°C
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
            <WeatherIcon strokeWidth={1.2} style={{
              width: '3.5rem', height: '3.5rem',
              color: info.iconColor,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
            }} />
            {precipitation != null && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.7rem', fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '999px',
                padding: '0.15rem 0.5rem',
                backdropFilter: 'blur(4px)',
              }}>
                <Droplets strokeWidth={1.8} style={{ width: '0.7rem', height: '0.7rem', opacity: 0.85 }} />
                {precipitation} mm
              </span>
            )}
          </div>
        </div>

        {/* 4 info karty 2×2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem',
          paddingTop: '0.6rem',
          borderTop: '1px solid rgba(255,255,255,0.2)'
        }}>
          {/* Vítr */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.55rem',
            background: 'rgba(255,255,255,0.1)', padding: '0.6rem 0.8rem',
            borderRadius: '14px', backdropFilter: 'blur(4px)'
          }}>
            <Wind strokeWidth={1.5} style={{ width: '1.1rem', height: '1.1rem', opacity: 0.85, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.57rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7, letterSpacing: '0.5px' }}>Vítr</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{wind_speed} km/h</span>
            </div>
          </div>
          {/* Nárazy */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.55rem',
            background: 'rgba(255,255,255,0.1)', padding: '0.6rem 0.8rem',
            borderRadius: '14px', backdropFilter: 'blur(4px)'
          }}>
            <Wind strokeWidth={2} style={{ width: '1.1rem', height: '1.1rem', opacity: 0.85, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.57rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7, letterSpacing: '0.5px' }}>Nárazy</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{wind_gusts != null ? `${wind_gusts} km/h` : '—'}</span>
            </div>
          </div>
          {/* Vlhkost */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.55rem',
            background: 'rgba(255,255,255,0.1)', padding: '0.6rem 0.8rem',
            borderRadius: '14px', backdropFilter: 'blur(4px)'
          }}>
            <Droplets strokeWidth={1.5} style={{ width: '1.1rem', height: '1.1rem', opacity: 0.85, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.57rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7, letterSpacing: '0.5px' }}>Vlhkost</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{humidity}%</span>
            </div>
          </div>
          {/* Tlak */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.55rem',
            background: 'rgba(255,255,255,0.1)', padding: '0.6rem 0.8rem',
            borderRadius: '14px', backdropFilter: 'blur(4px)'
          }}>
            <Gauge strokeWidth={1.5} style={{ width: '1.1rem', height: '1.1rem', opacity: 0.85, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.57rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7, letterSpacing: '0.5px' }}>Tlak</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{pressure != null ? `${pressure} hPa` : '—'}</span>
            </div>
          </div>
        </div>

        {/* 7denní předpověď */}
        {weatherData.forecast && weatherData.forecast.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', gap: '0.2rem',
            paddingTop: '0.6rem', marginTop: '0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}>
            {weatherData.forecast.map((day, idx) => {
              const dayInfo = WMO_INFO[day.weather_code] || { text: '?', Icon: Cloud, iconColor: '#e2e8f0' };
              const DayIcon = dayInfo.Icon || Cloud;
              const d = new Date(day.date + 'T12:00:00');
              const dayLabel = idx === 0 ? 'Dnes' : d.toLocaleDateString('cs-CZ', { weekday: 'short' });
              return (
                <div key={day.date} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
                  flex: 1, minWidth: 0,
                  opacity: idx === 0 ? 1 : 0.85,
                }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'capitalize', opacity: 0.75 }}>{dayLabel}</span>
                  <DayIcon strokeWidth={1.5} style={{ width: '1.15rem', height: '1.15rem', color: dayInfo.iconColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>{day.temp_max}°</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.6 }}>{day.temp_min}°</span>
                </div>
              );
            })}
          </div>
        )}

        {updated_at && (
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: '0.4rem' }}>
            Aktualizováno: {new Date(updated_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Finanční trhy widget ─────────────────────────────────────────────────────

const FINANCE_TIPS = [
  { tip: 'Diverzifikace portfolia snižuje riziko. Nikdy nevkládejte vše do jednoho aktiva.', category: 'Strategie' },
  { tip: 'Pravidlo 50/30/20: 50 % na potřeby, 30 % na přání, 20 % na spoření a investice.', category: 'Rozpočet' },
  { tip: 'DCA (Dollar Cost Averaging) – pravidelné investování stejné částky minimalizuje dopad volatility.', category: 'Investice' },
  { tip: 'Mějte finanční rezervu na 3–6 měsíců výdajů před investováním.', category: 'Spoření' },
  { tip: 'Složené úročení je nejsilnější síla ve financích – začněte investovat co nejdříve.', category: 'Princip' },
  { tip: 'Sledujte poměr P/E u akcií – vysoký P/E může znamenat nadhodnocení.', category: 'Akcie' },
  { tip: 'Bitcoin má omezený supply (21 mil.) – to z něj dělá deflační aktivum.', category: 'Krypto' },
  { tip: 'Nikdy neinvestujte peníze, které si nemůžete dovolit ztratit.', category: 'Pravidlo' },
  { tip: 'ETF fondy nabízejí jednoduchou diverzifikaci s nízkými poplatky.', category: 'Fondy' },
  { tip: 'Sledujte inflaci – pokud výnos investice nepřekoná inflaci, reálně ztrácíte.', category: 'Ekonomika' },
  { tip: 'Halving Bitcoinu (cca každé 4 roky) historicky vedl k růstu ceny.', category: 'Krypto' },
  { tip: 'Staking u Ethereum (ETH) umožňuje pasivní příjem kolem 3–5 % ročně.', category: 'Krypto' },
];

const FinanceScrollArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.25rem;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
`;

const FinanceConfigScroll = styled.div`
  position: relative;
  padding: 1.2rem 1.3rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
`;

const DEFAULT_FINANCE_CONFIG = {
  crypto_ids: ['bitcoin', 'ethereum'],
  stock_tickers: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'],
  fx_pairs: ['CZK', 'USD']
};

const CRYPTO_OPTIONS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: '₿' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'Ξ' },
  { id: 'solana', name: 'Solana', symbol: 'SOL' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
  { id: 'litecoin', name: 'Litecoin', symbol: 'LTC' },
];

const FX_OPTIONS = ['CZK', 'USD', 'GBP', 'CHF', 'PLN', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'HUF'];

function FinanceWidget({ financeData, financeLoading, financeError, onRefresh, userId, token, username, showExternalButton, externalWindow, onOpenExternal, onCloseExternal }) {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * FINANCE_TIPS.length));
  const [configOpen, setConfigOpen] = useState(false);
  const cfgKey = `finance_config_${userId || 'default'}`;

  // Chart state
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartRange, setChartRange] = useState('1mo');
  const [chartTickerIdx, setChartTickerIdx] = useState(0);
  const chartRotationRef = useRef(null);

  const [localConfig, setLocalConfig] = useState(() => {
    try { return { ...DEFAULT_FINANCE_CONFIG, ...JSON.parse(localStorage.getItem(cfgKey)) }; }
    catch { return { ...DEFAULT_FINANCE_CONFIG }; }
  });
  const [tickerInput, setTickerInput] = useState('');

  useEffect(() => {
    const iv = setInterval(() => {
      setTipIndex(prev => (prev + 1) % FINANCE_TIPS.length);
    }, 90000);
    return () => clearInterval(iv);
  }, []);

  // Sestavit seznam tickerů pro graf (akcie + krypto)
  const allChartTickers = useMemo(() => {
    const tickers = [...(localConfig.stock_tickers || [])];
    // CoinGecko IDs nepoužijeme přímo – mapujeme na ticker-like symboly pro Yahoo
    const cryptoTickerMap = { bitcoin: 'BTC-USD', ethereum: 'ETH-USD', solana: 'SOL-USD', ripple: 'XRP-USD', cardano: 'ADA-USD', polkadot: 'DOT-USD', dogecoin: 'DOGE-USD', 'avalanche-2': 'AVAX-USD', chainlink: 'LINK-USD', litecoin: 'LTC-USD' };
    (localConfig.crypto_ids || []).forEach(id => {
      if (cryptoTickerMap[id]) tickers.push(cryptoTickerMap[id]);
    });
    return tickers;
  }, [localConfig.stock_tickers, localConfig.crypto_ids]);

  // Fetch chart data
  const fetchChart = useCallback(async (ticker, range) => {
    if (!token || !username || !ticker) return;
    setChartLoading(true);
    try {
      const res = await getFinanceChart({ token, username, ticker, range });
      if (res?.status === 'success' && res.data) {
        setChartData(res.data);
      } else {
        setChartData(null);
      }
    } catch { setChartData(null); }
    setChartLoading(false);
  }, [token, username]);

  // Initial chart load + rotace každých 10 minut
  useEffect(() => {
    if (allChartTickers.length === 0 || !token) return;
    const idx = chartTickerIdx % allChartTickers.length;
    fetchChart(allChartTickers[idx], chartRange);

    chartRotationRef.current = setInterval(() => {
      setChartTickerIdx(prev => {
        const nextIdx = (prev + 1) % allChartTickers.length;
        return nextIdx;
      });
    }, 10 * 60 * 1000); // 10 minut

    return () => { if (chartRotationRef.current) clearInterval(chartRotationRef.current); };
  }, [chartTickerIdx, chartRange, allChartTickers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveConfig = (newCfg) => {
    setLocalConfig(newCfg);
    try { localStorage.setItem(cfgKey, JSON.stringify(newCfg)); } catch (e) { /* ignore */ }
  };

  const toggleCrypto = (id) => {
    const next = localConfig.crypto_ids.includes(id)
      ? localConfig.crypto_ids.filter(c => c !== id)
      : [...localConfig.crypto_ids, id].slice(0, 10);
    saveConfig({ ...localConfig, crypto_ids: next });
  };

  const toggleFx = (pair) => {
    const next = localConfig.fx_pairs.includes(pair)
      ? localConfig.fx_pairs.filter(p => p !== pair)
      : [...localConfig.fx_pairs, pair].slice(0, 6);
    saveConfig({ ...localConfig, fx_pairs: next });
  };

  const addTicker = () => {
    const t = tickerInput.trim().toUpperCase();
    if (t && !localConfig.stock_tickers.includes(t) && localConfig.stock_tickers.length < 15) {
      saveConfig({ ...localConfig, stock_tickers: [...localConfig.stock_tickers, t] });
      setTickerInput('');
    }
  };

  const removeTicker = (t) => {
    saveConfig({ ...localConfig, stock_tickers: localConfig.stock_tickers.filter(s => s !== t) });
  };

  const accentColor = '#059669';

  const cardStyle = (extra = {}) => ({
    background: '#f8fafc', padding: '0.6rem 0.75rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0', ...extra
  });

  if (financeLoading && !financeData) {
    return (
      <div style={{
        background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '300px', gap: '0.75rem',
        color: '#64748b', position: 'relative', overflow: 'hidden',
        width: '100%', height: '100%'
      }}>
        <FontAwesomeIcon icon={faSync} spin style={{ fontSize: '1.8rem', color: accentColor }} />
        <span style={{ fontWeight: 500, fontSize: '0.85rem', color: '#94a3b8' }}>Načítám finanční data…</span>
      </div>
    );
  }

  if (financeError || !financeData) {
    return (
      <div style={{
        background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '300px', gap: '0.75rem',
        color: '#94a3b8', position: 'relative', overflow: 'hidden',
        width: '100%', height: '100%'
      }}>
        <FontAwesomeIcon icon={faChartLine} style={{ fontSize: '2.5rem', opacity: 0.4 }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Finanční data nejsou dostupná</span>
        <button onClick={onRefresh} style={{
          background: accentColor, border: 'none',
          color: '#fff', borderRadius: '999px', padding: '0.35rem 1rem',
          fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600
        }}>Zkusit znovu</button>
      </div>
    );
  }

  const { crypto, forex, stocks, updated_at: fUpdatedAt } = financeData;
  const currentTip = FINANCE_TIPS[tipIndex];

  const formatPrice = (price, currency = 'USD') => {
    if (price == null) return '–';
    if (currency === 'CZK') return price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč';
    if (currency === 'EUR') return '€' + price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChange = (change) => {
    if (change == null) return null;
    const isPositive = change >= 0;
    return (
      <span style={{
        fontSize: '0.66rem', fontWeight: 700,
        color: isPositive ? '#059669' : '#dc2626',
        background: isPositive ? '#ecfdf5' : '#fef2f2',
        padding: '0.1rem 0.4rem', borderRadius: '6px',
        display: 'inline-flex', alignItems: 'center', gap: '0.15rem'
      }}>
        {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  const formatMarketCap = (cap) => {
    if (!cap) return '';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
    return `$${cap.toLocaleString()}`;
  };

  // ─── Config panel ────────────────────────────────────────────────────
  if (configOpen) {
    return (
      <div style={{
        background: '#fff', color: '#334155', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: '300px'
      }}>
        <FinanceConfigScroll>
          {/* Config header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
              <FontAwesomeIcon icon={faCog} style={{ marginRight: '0.4rem', color: '#94a3b8' }} />
              Nastavení widgetu
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => { setConfigOpen(false); onRefresh(); }} style={{
                background: accentColor, border: 'none', color: '#fff',
                borderRadius: '8px', padding: '0.3rem 0.8rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
              }}>Uložit & načíst</button>
              <button onClick={() => setConfigOpen(false)} style={{
                background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b',
                borderRadius: '8px', padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
              }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>

          {/* Akcie tickery */}
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>
              Akcie (ticker)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
              {localConfig.stock_tickers.map(t => (
                <span key={t} style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.2rem 0.5rem', borderRadius: '8px',
                  fontSize: '0.7rem', fontWeight: 700, color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                }}>
                  {t}
                  <span onClick={() => removeTicker(t)} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.6rem' }}>✕</span>
                </span>
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <input
                  value={tickerInput}
                  onChange={e => setTickerInput(e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter') addTicker(); }}
                  placeholder="TICKER"
                  maxLength={10}
                  style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    color: '#334155', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.68rem',
                    fontWeight: 600, width: '5rem', outline: 'none'
                  }}
                />
                <button onClick={addTicker} style={{
                  background: accentColor, border: 'none', color: '#fff', borderRadius: '6px',
                  padding: '0.2rem 0.4rem', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer'
                }}>+</button>
              </span>
            </div>
          </div>

          {/* Krypto výběr */}
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>
              Kryptoměny
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
              {CRYPTO_OPTIONS.map(c => {
                const active = localConfig.crypto_ids.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleCrypto(c.id)} style={{
                    background: active ? '#ecfdf5' : '#f8fafc',
                    border: `1px solid ${active ? '#6ee7b7' : '#e2e8f0'}`,
                    color: active ? '#065f46' : '#64748b', borderRadius: '8px', padding: '0.2rem 0.55rem',
                    fontSize: '0.68rem', fontWeight: active ? 700 : 500, cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}>
                    {c.symbol} {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Měnové páry */}
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>
              FX páry (z EUR)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
              {FX_OPTIONS.map(fx => {
                const active = localConfig.fx_pairs.includes(fx);
                return (
                  <button key={fx} onClick={() => toggleFx(fx)} style={{
                    background: active ? '#ecfdf5' : '#f8fafc',
                    border: `1px solid ${active ? '#6ee7b7' : '#e2e8f0'}`,
                    color: active ? '#065f46' : '#64748b', borderRadius: '8px', padding: '0.2rem 0.5rem',
                    fontSize: '0.68rem', fontWeight: active ? 700 : 500, cursor: 'pointer'
                  }}>
                    EUR/{fx}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 'auto' }}>
            Nastavení se ukládá lokálně. Data se aktualizují každých 15 minut.
          </div>
        </FinanceConfigScroll>
      </div>
    );
  }

  // ─── Hlavní obsah widgetu (2-sloupcový layout) ────────────────────────
  return (
    <div style={{
      background: '#fff', color: '#334155', position: 'relative', overflow: 'hidden',
      userSelect: 'none', display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%', minHeight: '300px'
    }}>
      <div style={{ position: 'relative', padding: '1.2rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FontAwesomeIcon icon={faChartLine} style={{ fontSize: '0.9rem', color: accentColor }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.2px' }}>Finanční trhy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              fontSize: '0.58rem', fontWeight: 700, padding: '0.12rem 0.5rem',
              background: '#ecfdf5', borderRadius: '999px', color: accentColor, letterSpacing: '0.5px'
            }}>LIVE</span>
            <button onClick={() => setConfigOpen(true)} title="Nastavení" style={{
              background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#94a3b8',
              borderRadius: '50%', width: '1.45rem', height: '1.45rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <FontAwesomeIcon icon={faCog} style={{ fontSize: '0.55rem' }} />
            </button>
            <button onClick={onRefresh} title="Obnovit" style={{
              background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#94a3b8',
              borderRadius: '50%', width: '1.45rem', height: '1.45rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <FontAwesomeIcon icon={faSync} style={{ fontSize: '0.55rem' }} />
            </button>
            {showExternalButton && (
              <button 
                onClick={() => externalWindow ? onCloseExternal() : onOpenExternal()} 
                title={externalWindow ? 'Zavřít externí okno' : 'Otevřít v externím okně (Always-on-Top)'}
                style={{
                  background: externalWindow ? '#e2e8f0' : '#f1f5f9', 
                  border: '1px solid #e2e8f0', 
                  color: externalWindow ? accentColor : '#94a3b8',
                  borderRadius: '50%', 
                  width: '1.45rem', 
                  height: '1.45rem', 
                  cursor: 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = accentColor; }}
                onMouseLeave={e => { 
                  e.currentTarget.style.background = externalWindow ? '#e2e8f0' : '#f1f5f9'; 
                  e.currentTarget.style.color = externalWindow ? accentColor : '#94a3b8'; 
                }}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: '0.55rem' }} />
              </button>
            )}
          </div>
        </div>

        {/* 2-sloupcový grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>
          {/* ─── LEVÝ SLOUPEC: Krypto + Tip ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {/* Krypto */}
            {crypto && crypto.length > 0 && (
              <>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>Kryptoměny</span>
                {crypto.map((coin) => {
                  // Najdi odpovídající ticker v allChartTickers
                  const cryptoTickerMap = { bitcoin: 'BTC-USD', ethereum: 'ETH-USD', solana: 'SOL-USD', ripple: 'XRP-USD', cardano: 'ADA-USD', polkadot: 'DOT-USD', dogecoin: 'DOGE-USD', 'avalanche-2': 'AVAX-USD', chainlink: 'LINK-USD', litecoin: 'LTC-USD' };
                  const ticker = cryptoTickerMap[coin.id];
                  const tickerIndex = allChartTickers.indexOf(ticker);
                  const isActive = chartData?.ticker === ticker || (tickerIndex >= 0 && tickerIndex === (chartTickerIdx % allChartTickers.length));
                  
                  return (
                    <div 
                      key={coin.id} 
                      onClick={() => {
                        if (tickerIndex >= 0) {
                          setChartTickerIdx(tickerIndex);
                          if (chartRotationRef.current) {
                            clearInterval(chartRotationRef.current);
                            chartRotationRef.current = null;
                          }
                        }
                      }}
                      style={{
                        ...cardStyle(), 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: tickerIndex >= 0 ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        border: isActive ? `2px solid ${accentColor}` : '1px solid #e2e8f0',
                        background: isActive ? '#ecfdf5' : '#f8fafc',
                        boxShadow: isActive ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none'
                      }}
                      onMouseEnter={e => { if (tickerIndex >= 0 && !isActive) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseLeave={e => { if (tickerIndex >= 0 && !isActive) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '1.8rem', height: '1.8rem', borderRadius: '50%',
                          background: coin.id === 'bitcoin' ? 'linear-gradient(135deg, #f7931a 0%, #ffb347 100%)' :
                                      coin.id === 'ethereum' ? 'linear-gradient(135deg, #627eea 0%, #8c9eff 100%)' :
                                      'linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.65rem', fontWeight: 800, color: '#fff',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                        }}>
                          {coin.symbol}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{coin.name}</span>
                          <span style={{ fontSize: '0.56rem', color: '#94a3b8' }}>MCap: {formatMarketCap(coin.market_cap)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>{formatPrice(coin.price_usd)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ fontSize: '0.56rem', color: '#94a3b8' }}>{formatPrice(coin.price_czk, 'CZK')}</span>
                          {formatChange(coin.change_24h)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Finanční tipy – dynamicky dorovnání s pravým sloupcem */}
            {(() => {
              const cryptoCount = crypto?.length || 0;
              const stocksCount = stocks?.length || 0;
              const fxRows = forex?.length ? Math.ceil(forex.length / 3) + 1 : 0;
              // Pravý sloupec má cca stocksCount + fxRows položek, levý má cryptoCount
              // Dorovnej tipy, ale max 4 a min 1
              const diff = (stocksCount + fxRows) - cryptoCount;
              const tipsCount = Math.max(1, Math.min(4, diff));
              const tips = [];
              for (let i = 0; i < tipsCount; i++) {
                tips.push(FINANCE_TIPS[(tipIndex + i) % FINANCE_TIPS.length]);
              }
              return tips.map((tip, idx) => (
                <div key={idx} style={{
                  ...cardStyle({ padding: '0.6rem 0.75rem', borderLeft: `3px solid ${accentColor}`, background: '#f0fdf4' })
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                    <FontAwesomeIcon icon={faInfoCircle} style={{ fontSize: '0.55rem', color: accentColor }} />
                    <span style={{ fontSize: '0.52rem', fontWeight: 700, textTransform: 'uppercase', color: '#059669', letterSpacing: '0.5px' }}>
                      {tip.category}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.68rem', lineHeight: 1.45, color: '#334155', fontWeight: 500 }}>
                    {tip.tip}
                  </p>
                </div>
              ));
            })()}
          </div>

          {/* ─── PRAVÝ SLOUPEC: Akcie + FX ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minHeight: 0 }}>
            {/* Akcie */}
            {stocks && stocks.length > 0 && (
              <>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>Akcie</span>
                <FinanceScrollArea>
                  {stocks.map((s) => {
                    const tickerIndex = allChartTickers.indexOf(s.ticker);
                    const isActive = chartData?.ticker === s.ticker || (tickerIndex >= 0 && tickerIndex === (chartTickerIdx % allChartTickers.length));
                    
                    return (
                      <div 
                        key={s.ticker} 
                        onClick={() => {
                          if (tickerIndex >= 0) {
                            setChartTickerIdx(tickerIndex);
                            if (chartRotationRef.current) {
                              clearInterval(chartRotationRef.current);
                              chartRotationRef.current = null;
                            }
                          }
                        }}
                        style={{
                          ...cardStyle({ padding: '0.5rem 0.7rem' }),
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          cursor: tickerIndex >= 0 ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          border: isActive ? `2px solid ${accentColor}` : '1px solid #e2e8f0',
                          background: isActive ? '#ecfdf5' : '#f8fafc',
                          boxShadow: isActive ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none'
                        }}
                        onMouseEnter={e => { if (tickerIndex >= 0 && !isActive) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseLeave={e => { if (tickerIndex >= 0 && !isActive) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{s.ticker}</span>
                          <span style={{ fontSize: '0.55rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                            {s.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                            {s.currency === 'CZK' ? formatPrice(s.price, 'CZK') : formatPrice(s.price)}
                          </span>
                          {formatChange(s.change)}
                        </div>
                      </div>
                    );
                  })}
                </FinanceScrollArea>
              </>
            )}

            {/* Pokud nejsou akcie, zobrazit instrukci */}
            {(!stocks || stocks.length === 0) && (
              <div style={{ ...cardStyle({ padding: '0.8rem' }), textAlign: 'center' }}>
                <FontAwesomeIcon icon={faChartLine} style={{ fontSize: '1.5rem', marginBottom: '0.4rem', display: 'block', color: '#cbd5e1' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>Akcie se načítají…</span>
                <br />
                <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Klikněte na ⚙ pro nastavení tickerů</span>
              </div>
            )}

            {/* FX kurzy */}
            {forex && forex.length > 0 && (
              <>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginTop: '0.15rem' }}>Měnové kurzy</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: '0.3rem' }}>
                  {forex.map((fx) => (
                    <div key={fx.pair} style={{
                      ...cardStyle({ padding: '0.4rem 0.45rem', display: 'flex', flexDirection: 'column', alignItems: 'center' })
                    }}>
                      <span style={{ fontSize: '0.52rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{fx.pair}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', marginTop: '0.02rem' }}>
                        {fx.rate?.toFixed(fx.pair.includes('CZK') || fx.pair.includes('HUF') || fx.pair.includes('JPY') ? 2 : 4)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Mini-graf cenového vývoje ─── */}
        {allChartTickers.length > 0 && (
          <div style={{
            marginTop: '0.7rem', background: '#f8fafc', borderRadius: '10px',
            border: '1px solid #e2e8f0', padding: '0.65rem 0.8rem'
          }}>
            {/* Graf header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                  {chartData?.ticker || allChartTickers[chartTickerIdx % allChartTickers.length] || '–'}
                </span>
                {chartData?.price_current != null && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                    {({ USD: '$', EUR: '€', GBP: '£', CZK: 'Kč', JPY: '¥' })[chartData.currency] || (chartData.currency + ' ')}
                    {chartData.price_current.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                {chartData && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, padding: '0.08rem 0.35rem', borderRadius: '6px',
                    color: chartData.change_pct >= 0 ? '#059669' : '#dc2626',
                    background: chartData.change_pct >= 0 ? '#ecfdf5' : '#fef2f2'
                  }}>
                    {chartData.change_pct >= 0 ? '+' : ''}{chartData.change_pct}%
                  </span>
                )}
                {chartData?.name && chartData.name !== chartData.ticker && (
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{chartData.name}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {['1mo', '3mo', 'ytd'].map(r => (
                  <button key={r} onClick={() => { setChartRange(r); }}
                    style={{
                      background: chartRange === r ? '#059669' : '#f1f5f9',
                      color: chartRange === r ? '#fff' : '#64748b',
                      border: `1px solid ${chartRange === r ? '#059669' : '#e2e8f0'}`,
                      borderRadius: '6px', padding: '0.12rem 0.4rem', fontSize: '0.58rem',
                      fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    {r === '1mo' ? '1M' : r === '3mo' ? '3M' : 'YTD'}
                  </button>
                ))}
                <button onClick={() => setChartTickerIdx(prev => (prev + 1) % allChartTickers.length)}
                  title="Další ticker" style={{
                    background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#94a3b8',
                    borderRadius: '6px', padding: '0.12rem 0.35rem', fontSize: '0.55rem',
                    fontWeight: 700, cursor: 'pointer', marginLeft: '0.15rem'
                  }}
                >▶</button>
              </div>
            </div>

            {/* Graf tělo */}
            <div style={{ height: '120px', position: 'relative' }}>
              {chartLoading && !chartData && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.72rem' }}>
                  <FontAwesomeIcon icon={faSync} spin style={{ marginRight: '0.4rem' }} /> Načítám graf…
                </div>
              )}
              {!chartLoading && !chartData && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1', fontSize: '0.72rem' }}>
                  Data pro graf nejsou dostupná
                </div>
              )}
              {chartData && chartData.points && (
                <Line
                  data={{
                    labels: chartData.points.map(p => {
                      const d = new Date(p.date);
                      return `${d.getDate()}.${d.getMonth() + 1}.`;
                    }),
                    datasets: [{
                      data: chartData.points.map(p => p.price),
                      borderColor: chartData.change_pct >= 0 ? '#059669' : '#dc2626',
                      backgroundColor: chartData.change_pct >= 0 ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
                      borderWidth: 1.5,
                      pointRadius: 0,
                      pointHitRadius: 8,
                      tension: 0.3,
                      fill: true
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      datalabels: { display: false },
                      tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 10 },
                        bodyFont: { size: 11, weight: 'bold' },
                        padding: 6,
                        cornerRadius: 6,
                        callbacks: {
                          label: (ctx) => `$${ctx.parsed.y?.toFixed(2)}`
                        }
                      }
                    },
                    scales: {
                      x: {
                        display: true,
                        grid: { display: false },
                        ticks: { font: { size: 8 }, color: '#cbd5e1', maxTicksLimit: 6, maxRotation: 0 },
                        border: { display: false }
                      },
                      y: {
                        display: true,
                        position: 'right',
                        grid: { color: '#f1f5f9', lineWidth: 1 },
                        ticks: { font: { size: 8 }, color: '#94a3b8', maxTicksLimit: 4, callback: (v) => '$' + v.toLocaleString() },
                        border: { display: false }
                      }
                    },
                    interaction: { intersect: false, mode: 'index' },
                    animation: { duration: 400 }
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Timestamp */}
        {fUpdatedAt && (
          <div style={{ fontSize: '0.56rem', color: '#cbd5e1', textAlign: 'right', marginTop: '0.5rem' }}>
            Aktualizováno: {new Date(fUpdatedAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
            {financeData?.cached && ' (cache)'}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kalendář ─────────────────────────────────────────────────────────────────

const CAL_MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const CAL_DAYS   = ['Po','Út','St','Čt','Pá','So','Ne'];
const CAL_YEARS  = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

function CalendarWidget({ token, username, mySubstitutions, substituting, onHeaderButton, onPlanningEventsUpdate, urlEventId, urlOpenPanel }) {
  const today = new Date();
  
  // Načíst uložený stav kalendáře z localStorage
  const getSavedCalendarState = () => {
    try {
      const saved = localStorage.getItem('dashboardCalendarState');
      if (saved) {
        const { year, month } = JSON.parse(saved);
        return { year, month };
      }
    } catch (e) {
      console.error('Chyba při načítání stavu kalendáře:', e);
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  };
  
  const savedState = getSavedCalendarState();
  const [viewYear, setViewYear]   = useState(savedState.year);
  const [viewMonth, setViewMonth] = useState(savedState.month);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState(false);
  const [panelDayKey, setPanelDayKey] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTargetEventId, setPanelTargetEventId] = useState(null);
  const [panelDirectEvent, setPanelDirectEvent] = useState(null);
  const [termNotes, setTermNotes] = useState({}); // { [termId]: 'poznamka' }
  const [flashState, setFlashState] = useState({}); // { [termId]: 'accepted' | 'declined' }
  const [toast, setToast] = useState(null); // { type, message }
  const [calendarDialog, setCalendarDialog] = useState({ isOpen: false, data: null });

  // Zjisti, zda datum (rok, měsíc, den) spadá do rozsahu zastupování
  const checkDay = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const asZastupovany = mySubstitutions.filter(s =>
      s.aktivni && dateStr >= s.dt_od && dateStr <= s.dt_do
    );
    const asZastupce = substituting.filter(s =>
      s.aktivni && dateStr >= s.dt_od && dateStr <= s.dt_do
    );
    return { asZastupovany, asZastupce };
  };

  const parseSqlDateTime = (value) => {
    if (!value) return null;
    if (value.length === 10) {
      const d = new Date(`${value}T00:00:00`);
      return isNaN(d) ? null : d;
    }
    const d = new Date(value.replace(' ', 'T'));
    return isNaN(d) ? null : d;
  };

  const formatCzDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  const formatCzDateTime = (value) => {
    const d = parseSqlDateTime(value);
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  };

  const formatResponseLabel = (value) => {
    if (value === 'accepted') return 'Akceptováno';
    if (value === 'declined') return 'Odmítnuto';
    return value || '—';
  };

  const getTermLabel = (term) => {
    if (!term?.dt_od) return 'Termín';
    const start = formatCzDateTime(term.dt_od);
    const end = term.dt_do ? formatCzDateTime(term.dt_do) : '';
    return end ? `${start} – ${end}` : start;
  };

  const getResponseDeadline = (event, term) => {
    if (term?.deadline) {
      return parseSqlDateTime(term.deadline);
    }
    const start = parseSqlDateTime(term?.dt_od || event?.dt_od);
    if (!start) return null;
    const end = parseSqlDateTime(term?.dt_do);
    const created = parseSqlDateTime(event?.dt_vytvoreno || event?.dt_create || event?.dt_created);
    const startDate = new Date(start);
    // Pravidla (vztažena k dt_od termínu):
    // - událost vytvořená ten samý den jako dt_od => dt_od - 1h
    // - vícedenní (konec je jiný den než začátek)  => dt_od - 24h
    // - jednodenní (default)                        => dt_od - 6h
    const isMultiDay = end && startDate.toDateString() !== new Date(end).toDateString();
    const sameDayCreated = created && new Date(created).toDateString() === startDate.toDateString();

    let deadline = new Date(startDate);
    if (sameDayCreated) {
      deadline.setHours(deadline.getHours() - 1);
    } else if (isMultiDay) {
      deadline.setHours(deadline.getHours() - 24);
    } else {
      deadline.setHours(deadline.getHours() - 6);
    }
    return deadline;
  };

  const canChangeResponse = (event, term) => {
    if (term?.can_change !== undefined && term?.can_change !== null) {
      return Boolean(term.can_change);
    }
    const deadline = getResponseDeadline(event, term);
    if (!deadline) return true;
    return new Date() <= deadline;
  };

  const handleRespond = async (event, term, type) => {
    if (!term?.id || !(typeof term.id === 'number' || /^\d+$/.test(String(term.id)))) {
      setToast({ type: 'error', message: 'Termín nemá platné ID' });
      setTimeout(() => setToast(null), 2500);
      return;
    }

    // ✅ Kontrola kapacity - pokud je plný a uživatel není účastník
    if (type === 'accepted') {
      const isFull = term.is_full === true;
      const isUserAccepted = term?.moje_odpoved?.typ_odpovedi === 'accepted';
      if (isFull && !isUserAccepted) {
        setToast({ 
          type: 'error', 
          message: '⛔ Termín je plně obsazen. Nelze jej akceptovat.' 
        });
        setTimeout(() => setToast(null), 3500);
        return;
      }
    }

    const terminId = Number(term.id);
    const poznamka = (termNotes[terminId] || '').trim();
    try {
      const result = await planningApi.respondToEvent({
        id: event.id,
        termin_id: terminId,
        typ_odpovedi: type,
        poznamka
      });

      const dtOdpovedi = new Date().toISOString();
      const newResponse = { typ_odpovedi: type, poznamka, dt_odpovedi: dtOdpovedi, termin_id: terminId };

      // Flash efekt pouze v postranním panelu (portal).
      // Nevynucujeme timeout-clear, aby kalendář zbytečně neproblikával re-renderem.
      if (panelOpen) {
        setFlashState(prev => ({ ...prev, [terminId]: `${type}-${Date.now()}` }));
      }

      setCalendarEvents(prev => prev.map(ev => {
        if (ev.id !== event.id) return ev;
        const existingTerms = Array.isArray(ev.terminy) ? [...ev.terminy] : [];
        const idx = existingTerms.findIndex(t => Number(t.id) === terminId);
        if (idx >= 0) {
          // ✅ Aktualizovat accepted_count a is_full z response
          const acceptedCount = result?.data?.accepted_count;
          const isFull = result?.data?.is_full;
          existingTerms[idx] = { 
            ...existingTerms[idx], 
            moje_odpoved: newResponse,
            ...(acceptedCount !== undefined && { accepted_count: acceptedCount }),
            ...(isFull !== undefined && { is_full: isFull })
          };
        }
        return { ...ev, terminy: existingTerms };
      }));
    } catch (error) {
      console.error('❌ Chyba při odpovědi na termín:', error);
      setToast({
        type: 'error',
        message: 'Nepodařilo se uložit odpověď: ' + (error?.response?.data?.message || error.message || 'neznámá chyba')
      });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const isTermOnSelectedDay = (term, event) => {
    if (!panelDayKey) return false;
    const selectedDate = new Date(`${panelDayKey}T00:00:00`);
    const start = parseSqlDateTime(term?.dt_od || event?.dt_od);
    if (!start) return false;
    const end = parseSqlDateTime(term?.dt_do || event?.dt_do) || start;
    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const dayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return selectedDate >= dayStart && selectedDate <= dayEnd;
  };

  const goToToday = () => { 
    setViewYear(today.getFullYear()); 
    setViewMonth(today.getMonth()); 
    // Smazat uložený stav - vrátili jsme se na aktuální měsíc
    localStorage.removeItem('dashboardCalendarState');
  };
  const prevMonth = () => {
    if (viewMonth === 0) { 
      setViewMonth(11); 
      setViewYear(y => {
        const newYear = y - 1;
        localStorage.setItem('dashboardCalendarState', JSON.stringify({ year: newYear, month: 11 }));
        return newYear;
      }); 
    }
    else {
      setViewMonth(m => {
        const newMonth = m - 1;
        localStorage.setItem('dashboardCalendarState', JSON.stringify({ year: viewYear, month: newMonth }));
        return newMonth;
      });
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { 
      setViewMonth(0); 
      setViewYear(y => {
        const newYear = y + 1;
        localStorage.setItem('dashboardCalendarState', JSON.stringify({ year: newYear, month: 0 }));
        return newYear;
      }); 
    }
    else {
      setViewMonth(m => {
        const newMonth = m + 1;
        localStorage.setItem('dashboardCalendarState', JSON.stringify({ year: viewYear, month: newMonth }));
        return newMonth;
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchCalendar = async () => {
      setCalendarLoading(true);
      setCalendarError(false);
      try {
        const response = await planningApi.getCalendarEvents({
          year: viewYear,
          month: viewMonth + 1
        });
        if (!cancelled) {
          setCalendarEvents(response.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setCalendarEvents([]);
          setCalendarError(true);
        }
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    };

    fetchCalendar();
    return () => { cancelled = true; };
  }, [viewYear, viewMonth]);

  // 📅 Filtrování planning událostí pro aktuálního uživatele (k reakci)
  const myPlanningEvents = useMemo(() => {
    if (!username || !calendarEvents || calendarEvents.length === 0) return [];
    
    const now = new Date();
    
    return calendarEvents.filter(event => {
      // Pouze aktivní události
      if (!event.aktivni || event.aktivni === 0) return false;
      
      // Má alespoň jeden termín v budoucnosti
      const hasFutureTerm = event.terminy?.some(term => {
        const termDate = term.dt_do ? new Date(term.dt_do) : (term.dt_od ? new Date(term.dt_od) : null);
        return termDate && termDate > now;
      });
      if (!hasFutureTerm) return false;
      
      // Uživatel je v příjemcích nebo má na událost reagovat
      const isPrijemce = event.prijemci?.some(p => p.username === username);
      if (!isPrijemce) return false;
      
      // Ještě nemá odpověď nebo má odpověď 'null'
      const hasResponse = event.terminy?.some(term => {
        const response = term.responses?.find(r => r.username === username);
        return response && response.odpoved && response.odpoved !== 'null';
      });
      
      return !hasResponse; // Vrátit pouze pokud NEMÁ odpověď
    });
  }, [username, calendarEvents]);

  // Posílat my planning events ven přes callback
  useEffect(() => {
    if (onPlanningEventsUpdate) {
      onPlanningEventsUpdate(myPlanningEvents);
    }
  }, [myPlanningEvents, onPlanningEventsUpdate]);

  // 🆕 Automatické otevření panelu události z URL parametrů (z emailové notifikace)
  useEffect(() => {
    if (!urlEventId || !urlOpenPanel) return;

    setPanelTargetEventId(Number(urlEventId));

    // Načíst konkrétní událost podle ID (ne čekat na calendarEvents)
    const loadEventAndOpenPanel = async () => {
      try {
        const eventResponse = await planningApi.getEvent(urlEventId);
        const event = eventResponse?.data || eventResponse || null;

        const isRecipient = event?.isRecipient;
        const isEmailLinkRecipient = event?.isEmailLinkRecipient;
        const denyFromEmailLink = (isEmailLinkRecipient === false || isEmailLinkRecipient === 0 || isEmailLinkRecipient === '0');
        if (denyFromEmailLink || isRecipient === false || isRecipient === 0 || isRecipient === '0') {
          setToast({
            type: 'error',
            message: 'Tato událost nebyla určena pro přihlášeného uživatele.'
          });
          setTimeout(() => setToast(null), 5000);
          setPanelDirectEvent(null);
          setPanelOpen(false);
          return;
        }

        setPanelDirectEvent(event || null);

        if (event && event.terminy && event.terminy.length > 0) {
          // Najít nejbližší termín
          const firstTerm = event.terminy[0];
          if (firstTerm && firstTerm.dt_od) {
            // Parsovat datum termínu
            const termDate = parseSqlDateTime(firstTerm.dt_od);
            if (termDate) {

              // Nastavit správný měsíc/rok v kalendáři
              const eventYear = termDate.getFullYear();
              const eventMonth = termDate.getMonth();
              
              // Přepnout kalendář na měsíc události
              setViewYear(eventYear);
              setViewMonth(eventMonth);
              localStorage.setItem('dashboardCalendarState', JSON.stringify({ year: eventYear, month: eventMonth }));
              
              // Nastavit key pro panel (po krátké pauze, aby se stihly načíst události)
              setTimeout(() => {
                const key = `${eventYear}-${String(eventMonth + 1).padStart(2, '0')}-${String(termDate.getDate()).padStart(2, '0')}`;
                setPanelDayKey(key);
                setPanelOpen(true);
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error('❌ [CalendarWidget] Chyba při načítání události z URL:', error);
      }
    };

    loadEventAndOpenPanel();
  }, [urlEventId, urlOpenPanel]); // Spustit když se změní URL parametry

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay  = new Date(viewYear, viewMonth + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const blanks = Array.from({ length: startPad });
  const days   = Array.from({ length: lastDay.getDate() }, (_, i) => i + 1);

  const eventsByDate = useMemo(() => {
    const map = {};
    const toKey = (date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    (calendarEvents || []).forEach(event => {
      const terms = Array.isArray(event.terminy) ? event.terminy : [];
      if (terms.length === 0) {
        return;
      }

      terms.forEach(term => {
        const start = parseSqlDateTime(term.dt_od || event.dt_od);
        if (!start) return;
        const end = parseSqlDateTime(term.dt_do || event.dt_do) || start;
        const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const dayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        for (let d = new Date(dayStart); d <= dayEnd; d.setDate(d.getDate() + 1)) {
          if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) continue;
          const key = toKey(d);
          if (!map[key]) map[key] = [];
          map[key].push({ event, term });
        }
      });
    });
    return map;
  }, [calendarEvents, viewMonth, viewYear]);

  const panelEvents = useMemo(() => {
    if (!panelDayKey) return [];
    const pairs = eventsByDate[panelDayKey] || [];
    const grouped = {};
    pairs.forEach(({ event, term }) => {
      if (!grouped[event.id]) {
        grouped[event.id] = { event, terms: [] };
      }
      if (term) {
        const exists = grouped[event.id].terms.some(t => t.id === term.id);
        if (!exists) grouped[event.id].terms.push(term);
      }
    });

    const allEvents = Object.values(grouped);

    // Režim cíleného detailu (proklik z Můj přehled / notifikace)
    if (panelTargetEventId) {
      if (panelDirectEvent && Number(panelDirectEvent.id) === Number(panelTargetEventId)) {
        return [{
          event: panelDirectEvent,
          terms: Array.isArray(panelDirectEvent.terminy) ? panelDirectEvent.terminy : []
        }];
      }

      const matched = allEvents.find(({ event }) => Number(event.id) === Number(panelTargetEventId));
      if (matched) return [matched];

      return [];
    }

    return allEvents;
  }, [eventsByDate, panelDayKey, panelTargetEventId, panelDirectEvent]);

  const panelDateLabel = panelDayKey ? formatCzDate(panelDayKey) : '';

  const isToday = (d) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();

  // Předej header tlačítko ven přes callback když se změní state
  const onHeaderButtonRef = React.useRef(onHeaderButton);
  onHeaderButtonRef.current = onHeaderButton;
  
  useEffect(() => {
    if (onHeaderButtonRef.current) {
      const headerButton = (
        <button onClick={goToToday} style={{
          background: isCurrentMonth ? 'transparent' : 'transparent',
          border: 'none', cursor: 'pointer',
          color: '#0891b2', fontSize: '0.75rem', fontWeight: 600,
          padding: '0.3rem 0.75rem', borderRadius: '6px',
          transition: 'background 0.12s, opacity 0.12s',
          opacity: isCurrentMonth ? 0.4 : 0.8
        }}
          onMouseEnter={e => { if (!isCurrentMonth) { e.currentTarget.style.background = '#f0fdfa'; e.currentTarget.style.opacity = '1'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = isCurrentMonth ? '0.4' : '0.8'; }}
          title={isCurrentMonth ? 'Již jste v aktuálním měsíci' : 'Zpět na dnešní měsíc'}
        >Zpět na dnešek</button>
      );
      onHeaderButtonRef.current(headerButton);
    }
  }, [viewMonth, viewYear, isCurrentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: '#fff', borderRadius: '24px',
      padding: '1.4rem 1.5rem',
      userSelect: 'none', height: '100%'
    }}>
      {/* Navigace */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button onClick={prevMonth} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
          padding: '0.4rem', borderRadius: '50%', fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.12s'
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        {/* Měsíc + rok jako selecty */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <select
            value={viewMonth}
            onChange={e => {
              const newMonth = Number(e.target.value);
              setViewMonth(newMonth);
              localStorage.setItem('dashboardCalendarState', JSON.stringify({ year: viewYear, month: newMonth }));
            }}
            style={{
              appearance: 'none', background: 'transparent', border: 'none',
              fontWeight: 700, fontSize: '1.05rem', color: '#0f172a',
              cursor: 'pointer', outline: 'none', padding: '0.1rem 0.2rem'
            }}
          >
            {CAL_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={viewYear}
            onChange={e => {
              const newYear = Number(e.target.value);
              setViewYear(newYear);
              localStorage.setItem('dashboardCalendarState', JSON.stringify({ year: newYear, month: viewMonth }));
            }}
            style={{
              appearance: 'none', background: 'transparent', border: 'none',
              fontWeight: 700, fontSize: '1.05rem', color: '#3b82f6',
              cursor: 'pointer', outline: 'none', padding: '0.1rem 0.2rem'
            }}
          >
            {CAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button onClick={nextMonth} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
          padding: '0.4rem', borderRadius: '50%', fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.12s'
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {(calendarLoading || calendarError) && (
        <div style={{
          fontSize: '0.7rem',
          color: calendarError ? '#dc2626' : '#64748b',
          background: calendarError ? '#fee2e2' : '#f1f5f9',
          padding: '0.25rem 0.5rem',
          borderRadius: '999px',
          alignSelf: 'center',
          marginBottom: '0.55rem'
        }}>
          {calendarError ? 'Kalendářní události se nepodařilo načíst' : 'Načítám události…'}
        </div>
      )}

      {/* Záhlaví dnů */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem' }}>
        {CAL_DAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '0.72rem', fontWeight: 700,
            color: '#94a3b8', paddingBottom: '0.25rem'
          }}>{d}</div>
        ))}
      </div>

      {/* Mřížka dnů */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '0.3rem', flex: 1 }}>
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(d => {
          const today_ = isToday(d);
          const { asZastupovany, asZastupce } = checkDay(viewYear, viewMonth, d);
          const hasZastupovany = asZastupovany.length > 0;
          const hasZastupce = asZastupce.length > 0;
          const dayKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayEvents = eventsByDate[dayKey] || [];
          const hasEvents = dayEvents.length > 0;
          const MAX_TERMS_IN_TOOLTIP = 10;
          const visibleDayEvents = dayEvents.slice(0, MAX_TERMS_IN_TOOLTIP);
          const hiddenDayEventsCount = Math.max(0, dayEvents.length - visibleDayEvents.length);

          // Sestavení tooltip textu
          let tooltipLines = [];
          asZastupovany.forEach(s => {
            const jmeno = s.zastupce?.jmeno
              ? `${s.zastupce.jmeno} ${s.zastupce.prijmeni || ''}`.trim()
              : `id#${s.zastupce?.id || s.zastupce_id || '?'}`;
            const email = s.zastupce?.email || '';
            const telefon = s.zastupce?.telefon || '';
            let line = `Zástupce: ${jmeno}\nOd: ${formatCzDate(s.dt_od)} Do: ${formatCzDate(s.dt_do)}`;
            if (email) line += `\nEmail: ${email}`;
            if (telefon) line += `\nTelefon: ${telefon}`;
            tooltipLines.push(line);
          });
          asZastupce.forEach(s => {
            const jmeno = s.zastupovany_jmeno
              ? `${s.zastupovany_jmeno} ${s.zastupovany_prijmeni || ''}`.trim()
              : `id#${s.zastupovany_id || '?'}`;
            const email = s.zastupovany_email || '';
            const telefon = s.zastupovany_telefon || '';
            let line = `Zastupuji: ${jmeno}\nOd: ${formatCzDate(s.dt_od)} Do: ${formatCzDate(s.dt_do)}`;
            if (email) line += `\nEmail: ${email}`;
            if (telefon) line += `\nTelefon: ${telefon}`;
            tooltipLines.push(line);
          });
          if (hasEvents) {
            if (tooltipLines.length > 0) tooltipLines.push('──────────────────────────────');
            visibleDayEvents.forEach(({ event, term }, idx) => {
              const resp = term?.moje_odpoved?.typ_odpovedi;
              const isFull = term?.is_full === true;
              const isUserAccepted = resp === 'accepted';
              const isBlocked = isFull && !isUserAccepted;
              
              const organizator = event.autor_jmeno && event.autor_prijmeni 
                ? `${event.autor_jmeno} ${event.autor_prijmeni}` 
                : '—';
              const telefon = event.autor_telefon || '—';
              const email = event.autor_email || '—';
              
              let line = `📅 ${event.nazev}`;
              if (isBlocked) line += `\n🔴 Obsazeno`;
              if (term?.dt_od) line += `\n${getTermLabel(term)}`;
              if (resp) line += ` • ${formatResponseLabel(resp)}`;
              line += `\n👤 ${organizator}`;
              line += `\n📞 ${telefon}`;
              line += `\n📧 ${email}`;
              
              tooltipLines.push(line);
              // Oddělovač mezi událostmi (ne po poslední)
              if (idx < visibleDayEvents.length - 1) {
                tooltipLines.push('─────────────────────────────────────────────────────');
              }
            });
            if (hiddenDayEventsCount > 0) {
              tooltipLines.push(`… a zbývá dalších ${hiddenDayEventsCount} termínů`);
            }
          }
          
          // ✅ Vytvoř JSX tooltip místo prostého textu
          let tooltipJSX = null;
          if (hasEvents || asZastupovany.length > 0 || asZastupce.length > 0) {
            const elements = [];
            
            // Zastupování info
            asZastupovany.forEach((s, i) => {
              const jmeno = s.zastupce?.jmeno
                ? `${s.zastupce.jmeno} ${s.zastupce.prijmeni || ''}`.trim()
                : `id#${s.zastupce?.id || s.zastupce_id || '?'}`;
              const email = s.zastupce?.email || '';
              const telefon = s.zastupce?.telefon || '';
              elements.push(
                <div key={`zastupovany-${i}`} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ color: '#e0f2fe', fontSize: '0.75rem', fontWeight: 600 }}>Zástupce: {jmeno}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Od: {formatCzDate(s.dt_od)} Do: {formatCzDate(s.dt_do)}</div>
                  {email && <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Email: {email}</div>}
                  {telefon && <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Telefon: {telefon}</div>}
                </div>
              );
            });
            
            asZastupce.forEach((s, i) => {
              const jmeno = s.zastupovany_jmeno
                ? `${s.zastupovany_jmeno} ${s.zastupovany_prijmeni || ''}`.trim()
                : `id#${s.zastupovany_id || '?'}`;
              const email = s.zastupovany_email || '';
              const telefon = s.zastupovany_telefon || '';
              elements.push(
                <div key={`zastupce-${i}`} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ color: '#f3e8ff', fontSize: '0.75rem', fontWeight: 600 }}>Zastupuji: {jmeno}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Od: {formatCzDate(s.dt_od)} Do: {formatCzDate(s.dt_do)}</div>
                  {email && <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Email: {email}</div>}
                  {telefon && <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Telefon: {telefon}</div>}
                </div>
              );
            });
            
            if ((asZastupovany.length > 0 || asZastupce.length > 0) && hasEvents) {
              elements.push(<div key="sep" style={{ borderTop: '1px solid rgba(255,255,255,0.2)', margin: '0.5rem 0' }} />);
            }
            
            // Události
            visibleDayEvents.forEach(({ event, term }, idx) => {
              const resp = term?.moje_odpoved?.typ_odpovedi;
              const isFull = term?.is_full === true;
              const isUserAccepted = resp === 'accepted';
              const isBlocked = isFull && !isUserAccepted;
              
              const organizator = event.autor_jmeno && event.autor_prijmeni 
                ? `${event.autor_jmeno} ${event.autor_prijmeni}` 
                : '—';
              const telefon = event.autor_telefon || '—';
              const email = event.autor_email || '—';
              
              elements.push(
                <div key={`event-${event.id || idx}`} style={{ marginBottom: idx < visibleDayEvents.length - 1 ? '0.75rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                    <span>📅</span>
                    <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600 }}>{event.nazev}</span>
                    {isBlocked && (
                      <span style={{ 
                        marginLeft: 'auto',
                        background: '#fef9c3',
                        color: '#991b1b',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 700
                      }}>
                        🔴 Obsazeno
                      </span>
                    )}
                  </div>
                  {term?.dt_od && (
                    <div style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                      {getTermLabel(term)}{resp && ` • ${formatResponseLabel(resp)}`}
                    </div>
                  )}
                  <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                    👤 {organizator}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                    📞 {telefon}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                    📧 {email}
                  </div>
                  {idx < visibleDayEvents.length - 1 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem' }} />
                  )}
                </div>
              );
            });

            if (hiddenDayEventsCount > 0) {
              elements.push(
                <div key="events-more" style={{ marginTop: '0.35rem' }}>
                  <div style={{
                    color: '#cbd5e1',
                    fontSize: '0.72rem',
                    fontStyle: 'italic',
                    borderTop: '1px solid rgba(255,255,255,0.18)',
                    paddingTop: '0.45rem'
                  }}>
                    … a zbývá dalších {hiddenDayEventsCount} termínů
                  </div>
                </div>
              );
            }
            
            tooltipJSX = <div>{elements}</div>;
          }
          const hasTooltip = tooltipJSX !== null;

          // Barvy - dnes má přednost (modrá), pak zastupovany (tyrkys), pak zastupce (fialová)
          let bg = 'transparent';
          let color = '#374151';
          let boxShadow = 'none';
          let outline = 'none';

          if (today_) {
            bg = '#3b82f6'; color = '#fff';
            boxShadow = '0 4px 12px rgba(59,130,246,0.35)';
          } else if (hasZastupovany && hasZastupce) {
            bg = 'linear-gradient(135deg, #0891b2 50%, #7c3aed 50%)'; color = '#fff';
            boxShadow = '0 2px 8px rgba(8,145,178,0.3)';
          } else if (hasZastupovany) {
            bg = '#0891b2'; color = '#fff';
            boxShadow = '0 2px 8px rgba(8,145,178,0.3)';
          } else if (hasZastupce) {
            bg = '#7c3aed'; color = '#fff';
            boxShadow = '0 2px 8px rgba(124,58,237,0.3)';
          }
          // Agregovana barva podle odpovedi termin u na danem dni:
          // vsechny accepted -> zelena, vsechny declined -> cervena, jinak oranzova
          let dotColor = '#f97316'; // oranzova = bez stavu / smisene
          let outlineColor = '#f97316';
          if (hasEvents) {
            const responses = dayEvents.map(({ term }) => term?.moje_odpoved?.typ_odpovedi).filter(Boolean);
            if (responses.length === dayEvents.length && responses.length > 0) {
              if (responses.every(r => r === 'accepted')) {
                dotColor = '#16a34a';
                outlineColor = '#16a34a';
              } else if (responses.every(r => r === 'declined')) {
                dotColor = '#dc2626';
                outlineColor = '#dc2626';
              }
            }
          }

          // Obrys podle barvy odpovědí - i když je today_ (modrý den)
          if (hasEvents) {
            outline = `2px solid ${outlineColor}`;
          }

          const dayButton = (
            <button
              style={{
                width: '2rem', height: '2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', border: 'none',
                cursor: hasEvents ? 'pointer' : (hasZastupovany || hasZastupce) ? 'help' : 'default',
                fontSize: '0.82rem', fontWeight: (today_ || hasZastupovany || hasZastupce || hasEvents) ? 700 : 500,
                background: bg, color, boxShadow, outline,
                transition: 'background 0.12s, color 0.12s',
                position: 'relative'
              }}
              onClick={() => {
                if (hasEvents) {
                  const allTermsFull = dayEvents.every(({ term }) => {
                    const isFull = term?.is_full === true;
                    const isUserAccepted = term?.moje_odpoved?.typ_odpovedi === 'accepted';
                    return isFull && !isUserAccepted;
                  });

                  if (allTermsFull && dayEvents.length > 0) {
                    const firstEvent = dayEvents[0].event;
                    const organizator = firstEvent.autor_jmeno && firstEvent.autor_prijmeni 
                      ? `${firstEvent.autor_jmeno} ${firstEvent.autor_prijmeni}` 
                      : 'Organizátor';
                    const telefon = firstEvent.autor_telefon || '—';
                    const email = firstEvent.autor_email || '—';
                    
                    setCalendarDialog({ 
                      isOpen: true, 
                      data: { organizator, telefon, email }
                    });
                    return;
                  }

                  // Běžný klik v kalendáři = denní režim (bez fixace na konkrétní událost)
                  setPanelTargetEventId(null);
                  setPanelDirectEvent(null);
                  setPanelDayKey(dayKey);
                  setPanelOpen(true);
                }
              }}
              onMouseEnter={e => { if (!today_ && !hasZastupovany && !hasZastupce && !hasEvents) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#3b82f6'; } }}
              onMouseLeave={e => { if (!today_ && !hasZastupovany && !hasZastupce && !hasEvents) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; } }}
            >
              {d}
              {hasEvents && (
                <span style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(5px, 5px)',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: '0 0 0 2px ' + (today_ ? '#3b82f6' : '#fff'),
                  pointerEvents: 'none'
                }} />
              )}
            </button>
          );

          return (
            <div key={d} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {hasTooltip ? (
                <SmartTooltip 
                  text={tooltipJSX} 
                  icon="none" 
                  multiline 
                  preferredPosition="right"
                  maxWidth="380px"
                  interactive={true}
                >
                  {dayButton}
                </SmartTooltip>
              ) : dayButton}
            </div>
          );
        })}
      </div>

      {/* Legenda zastupování */}
      {(mySubstitutions.some(s => s.aktivni) || substituting.some(s => s.aktivni)) && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#64748b' }}>
          {mySubstitutions.some(s => s.aktivni) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0891b2', display: 'inline-block', flexShrink: 0 }} />
              Můj zástupce
            </span>
          )}
          {substituting.some(s => s.aktivni) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed', display: 'inline-block', flexShrink: 0 }} />
              Zastupuji
            </span>
          )}
        </div>
      )}

      {panelOpen && (
        <SlideInDetailPanel
          isOpen={panelOpen}
          onClose={() => {
            setPanelOpen(false);
            setPanelTargetEventId(null);
            setPanelDirectEvent(null);
            setFlashState({});
          }}
          entityType="planning_event"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Události {panelDateLabel}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{panelEvents.length} položek</div>
            </div>

            {panelEvents.length === 0 && (
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Žádné události v tento den.</div>
            )}

            {panelEvents.map(({ event }) => {
              const displayTerms = Array.isArray(event.terminy) ? [...event.terminy] : [];
              if (displayTerms.length === 0) return null;

              // Seřadit termíny - vybrané nahoře
              displayTerms.sort((a, b) => {
                const aSelected = isTermOnSelectedDay(a, event) ? 0 : 1;
                const bSelected = isTermOnSelectedDay(b, event) ? 0 : 1;
                if (aSelected !== bSelected) return aSelected - bSelected;
                return (a?.poradi ?? 0) - (b?.poradi ?? 0);
              });

              return (
                <PlanningEventDetailPanel
                  key={event.id}
                  event={{ ...event, terminy: displayTerms }}
                  onRespond={handleRespond}
                  flashState={flashState}
                  termNotes={termNotes}
                  onTermNoteChange={(id, note) => setTermNotes(prev => ({ ...prev, [id]: note }))}
                  isTermSelected={isTermOnSelectedDay}
                  showResponseStatus={false}
                />
              );
            })}
          </div>
        </SlideInDetailPanel>
      )}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 10000010,
          background: toast.type === 'accepted' ? '#16a34a' : toast.type === 'declined' ? '#dc2626' : '#334155',
          color: '#fff',
          padding: '0.7rem 1.1rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          fontSize: '0.85rem',
          fontWeight: 600,
          animation: 'slideInRight 0.25s ease-out'
        }}>
          {toast.message}
        </div>
      )}
      {/* ConfirmDialog - UŽ MÁ VLASTNÍ createPortal uvnitř! */}
      <ConfirmDialog
        isOpen={calendarDialog.isOpen}
        onConfirm={() => setCalendarDialog({ isOpen: false, data: null })}
        onClose={() => setCalendarDialog({ isOpen: false, data: null })}
        confirmText="OK"
        showCancel={false}
        variant="warning"
      >
        {calendarDialog.data && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              marginBottom: '1rem',
              color: '#1f2937'
            }}>
              ⚠️ Všechny termíny v tento den jsou plně obsazeny
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#4b5563',
              marginBottom: '1.25rem',
              lineHeight: 1.6
            }}>
              Zkuste jiný termín nebo kontaktujte organizátora:
            </div>
            <div style={{ 
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>👤</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Organizátor</div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 700 }}>{calendarDialog.data.organizator}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📞</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Telefon</div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 600 }}>{calendarDialog.data.telefon}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📧</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Email</div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 600 }}>{calendarDialog.data.email}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

// ── Vítejte ──────────────────────────────────────────────────────────────────
function WelcomeWidget({ user, userDetail, rolesDetected, nameday, newsSinceLogin, myStats, navigate, substituting, mySubstitutions, myPlanningEvents, onOpenPlanningEvent }) {
  // Helper - formátování data do CZ formátu
  const formatCzDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  const [planningMessages, setPlanningMessages] = useState([]);
  const [tickerVisible, setTickerVisible] = useState(false);
  const [tickerAnimating, setTickerAnimating] = useState(false);
  const [tickerKey, setTickerKey] = useState(0);
  const [tickerFullscreen, setTickerFullscreen] = useState(false);
  const tickerTimerRef = useRef(null);
  const activeMessagesRef = useRef([]);

  useEffect(() => {
    let isMounted = true;

    const loadPlanningMessages = async () => {
      try {
        const response = await planningApi.getMessagesList({ page: 1, per_page: 200 });
        if (!isMounted) return;
        setPlanningMessages(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        if (!isMounted) return;
        console.error('❌ [Dashboard] Chyba načítání plánovaných zpráv:', error);
        setPlanningMessages([]);
      }
    };

    loadPlanningMessages();
    const refreshTimer = setInterval(loadPlanningMessages, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (tickerTimerRef.current) {
        clearTimeout(tickerTimerRef.current);
      }
    };
  }, []);
  
  // Detekce capability-based rolí (jen pokud je admin nebo má speciální oprávnění)
  const roleLabels = [];
  if (rolesDetected?.is_admin) roleLabels.push('Administrátor');
  if (rolesDetected?.has_order_approve) roleLabels.push('Příkazce');
  if (rolesDetected?.has_spending) roleLabels.push('Správce rozpočtu');
  if (rolesDetected?.has_invoice_manage) roleLabels.push('Účetní');

  // ✅ Pokud nemá žádné capability-based role, zobraz skutečné role z DB
  let userRolesDisplay = null;
  if (roleLabels.length === 0 && user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    userRolesDisplay = user.roles.map(r => r.nazev_role).join(' · ');
  }

  // ✅ Aktivní zastupování DNES - kde já zastupuji někoho (fialová)
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const activeSubstitutions = (substituting || []).filter(s => 
    s.aktivni && todayStr >= s.dt_od && todayStr <= s.dt_do
  );
  const hasActiveSubstitution = activeSubstitutions.length > 0;

  // ✅ Aktivní zastupování DNES - kde mne někdo zastupuje (tyrkysová)
  const activeBeingSubstituted = (mySubstitutions || []).filter(s => 
    s.aktivni && todayStr >= s.dt_od && todayStr <= s.dt_do
  );
  const hasBeingSubstituted = activeBeingSubstituted.length > 0;

  // ✅ Tooltip pro zastupování (fialová) - koho já zastupuji
  const substitutionTooltip = activeSubstitutions.map(s => {
    const jmeno = s.zastupovany_jmeno
      ? `${s.zastupovany_jmeno} ${s.zastupovany_prijmeni || ''}`.trim()
      : `id#${s.zastupovany_id || '?'}`;
    const email = s.zastupovany_email || '';
    const telefon = s.zastupovany_telefon || '';
    let line = `Zastupuji: ${jmeno}\nOd: ${formatCzDate(s.dt_od)} Do: ${formatCzDate(s.dt_do)}`;
    if (email) line += `\nEmail: ${email}`;
    if (telefon) line += `\nTelefon: ${telefon}`;
    return line;
  }).join('\n\n');

  // ✅ Tooltip pro zastupovaného (tyrkysová) - kdo mne zastupuje
  const beingSubstitutedTooltip = activeBeingSubstituted.map(s => {
    const jmeno = s.zastupce?.jmeno
      ? `${s.zastupce.jmeno} ${s.zastupce.prijmeni || ''}`.trim()
      : `id#${s.zastupce?.id || s.zastupce_id || '?'}`;
    const email = s.zastupce?.email || '';
    const telefon = s.zastupce?.telefon || '';
    let line = `Zástupce: ${jmeno}\nOd: ${formatCzDate(s.dt_od)} Do: ${formatCzDate(s.dt_do)}`;
    if (email) line += `\nEmail: ${email}`;
    if (telefon) line += `\nTelefon: ${telefon}`;
    return line;
  }).join('\n\n');

  const today = new Date();
  const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];

  const parseSqlDateTime = (value) => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return value;
    const raw = String(value).trim();
    if (!raw) return null;

    if (raw.includes('T')) {
      const parsed = new Date(raw);
      return isNaN(parsed) ? null : parsed;
    }

    const parts = raw.split(' ');
    if (parts.length >= 2) {
      const parsed = new Date(`${parts[0]}T${parts[1]}`);
      return isNaN(parsed) ? null : parsed;
    }

    const parsed = new Date(`${raw}T00:00:00`);
    return isNaN(parsed) ? null : parsed;
  };

  const planningOverviewItems = useMemo(() => {
    const now = new Date();

    return (Array.isArray(myPlanningEvents) ? myPlanningEvents : [])
      .map(event => {
        const validTerms = (Array.isArray(event.terminy) ? event.terminy : [])
          .filter(term => {
            const dt = parseSqlDateTime(term.dt_do || term.dt_od);
            return dt && dt > now;
          })
          .sort((a, b) => {
            const aTime = (parseSqlDateTime(a.dt_od || a.dt_do)?.getTime()) || Number.MAX_SAFE_INTEGER;
            const bTime = (parseSqlDateTime(b.dt_od || b.dt_do)?.getTime()) || Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
          });

        if (validTerms.length === 0) return null;

        const nearestTerm = validTerms[0];
        const nearestTime = (parseSqlDateTime(nearestTerm.dt_od || nearestTerm.dt_do)?.getTime()) || Number.MAX_SAFE_INTEGER;

        return {
          event,
          eventTitle: event.nadpis || event.nazev || 'Událost',
          validTermsCount: validTerms.length,
          validTerms,
          nearestTime,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.nearestTime - b.nearestTime);
  }, [myPlanningEvents]);

  const formatOverviewDateTime = (value) => {
    const d = parseSqlDateTime(value);
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  };

  const formatOverviewResponseLabel = (value) => {
    if (value === 'accepted') return 'Akceptováno';
    if (value === 'declined') return 'Odmítnuto';
    return value || '—';
  };

  const getOverviewTermLabel = (term) => {
    if (!term?.dt_od) return 'Termín';
    const start = formatOverviewDateTime(term.dt_od);
    const end = term?.dt_do ? formatOverviewDateTime(term.dt_do) : '';
    return end ? `${start} – ${end}` : start;
  };

  const renderPlanningOverviewTooltip = (item) => {
    if (!item?.event) return null;

    const event = item.event;
    const terms = Array.isArray(item.validTerms) ? item.validTerms : [];
    const primaryTerm = terms[0] || null;
    const primaryResp = primaryTerm?.moje_odpoved?.typ_odpovedi;
    const primaryIsFull = primaryTerm?.is_full === true;
    const primaryIsUserAccepted = primaryResp === 'accepted';
    const primaryIsBlocked = primaryIsFull && !primaryIsUserAccepted;
    const organizator = event.autor_jmeno && event.autor_prijmeni
      ? `${event.autor_jmeno} ${event.autor_prijmeni}`
      : '—';
    const telefon = event.autor_telefon || '—';
    const email = event.autor_email || '—';

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
          <span>📅</span>
          <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600 }}>{item.eventTitle}</span>
          {primaryIsBlocked && (
            <span style={{
              marginLeft: 'auto',
              background: '#fef9c3',
              color: '#991b1b',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              fontSize: '0.65rem',
              fontWeight: 700
            }}>
              🔴 Obsazeno
            </span>
          )}
        </div>

        <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.2rem' }}>
          👤 {organizator}
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
          📞 {telefon}
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
          📧 {email}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.55rem', paddingTop: '0.4rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '0.35rem' }}>
            Platné termíny ({terms.length})
          </div>

          {terms.map((term, idx) => {
            const resp = term?.moje_odpoved?.typ_odpovedi;
            const isFull = term?.is_full === true;
            const isUserAccepted = resp === 'accepted';
            const isBlocked = isFull && !isUserAccepted;

            return (
              <div key={term.id || `${event.id}-${idx}`} style={{ marginBottom: idx < terms.length - 1 ? '0.55rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>🕒</span>
                  <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                    {getOverviewTermLabel(term)}{resp && ` • ${formatOverviewResponseLabel(resp)}`}
                  </span>
                  {isBlocked && (
                    <span style={{
                      marginLeft: 'auto',
                      background: '#fef9c3',
                      color: '#991b1b',
                      padding: '0.08rem 0.35rem',
                      borderRadius: '4px',
                      fontSize: '0.64rem',
                      fontWeight: 700
                    }}>
                      🔴 Obsazeno
                    </span>
                  )}
                </div>
                {idx < terms.length - 1 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.35rem' }} />
                )}
              </div>
            );
          })}

          {terms.length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
              Bez platných termínů
            </div>
          )}
        </div>
      </div>
    );
  };

  const activePlanningMessages = useMemo(() => {
    const now = new Date();
    const userId = user?.id || user?.user_id || userDetail?.id;
    const userRolesSource = Array.isArray(user?.roles) && user.roles.length > 0
      ? user.roles
      : (Array.isArray(userDetail?.roles) ? userDetail.roles : []);
    const userRoleCodes = userRolesSource.map(r => r.kod_role).filter(Boolean);

    return (planningMessages || [])
      .filter(msg => {
        const dtOd = parseSqlDateTime(msg.dt_od);
        const dtDo = parseSqlDateTime(msg.dt_do);
        const inTime = (!dtOd || dtOd <= now) && (!dtDo || dtDo >= now);
        if (!inTime) return false;

        const roleCodes = msg.prijemci_role_kody || msg.prijemci_role_codes || [];
        const userIds = msg.prijemci_user_ids || [];

        if (!roleCodes.length && !userIds.length) return true;

        const matchRole = userRoleCodes.some(code => roleCodes.includes(code));
        const matchUser = userId && userIds.some(id => Number(id) === Number(userId));

        return matchRole || matchUser;
      })
      .sort((a, b) => {
        const aTime = parseSqlDateTime(a.dt_od)?.getTime() || 0;
        const bTime = parseSqlDateTime(b.dt_od)?.getTime() || 0;
        return aTime - bTime;
      });
  }, [planningMessages, user, userDetail]);

  useEffect(() => {
    activeMessagesRef.current = activePlanningMessages;
  }, [activePlanningMessages]);

  // Výpočet doby scrollování podle počtu a délky zpráv (pomalejší pro více/delší zprávy)
  const tickerDuration = useMemo(() => {
    if (activePlanningMessages.length === 0) return 20;
    
    // Počet zpráv krát 15 sekund na zprávu (minimum 20s)
    const baseDuration = activePlanningMessages.length * 15;
    
    // Bonus za dlouhé zprávy - přidáme 0.05s za každý znak nad 100 znaků
    const lengthBonus = activePlanningMessages.reduce((sum, msg) => {
      const contentText = (msg.obsah || '').replace(/<[^>]*>/g, '').trim();
      const extraChars = Math.max(0, contentText.length - 100);
      return sum + (extraChars * 0.05);
    }, 0);
    
    const totalDuration = baseDuration + lengthBonus;
    
    // Minimum 20s, maximum 150s
    return Math.min(150, Math.max(20, totalDuration));
  }, [activePlanningMessages]);

  const beginAnimation = useCallback((delayMs) => {
    if (tickerTimerRef.current) {
      clearTimeout(tickerTimerRef.current);
    }

    setTickerAnimating(false);
    tickerTimerRef.current = setTimeout(() => {
      if (activeMessagesRef.current.length === 0) {
        setTickerVisible(false);
        return;
      }

      setTickerAnimating(true);
      setTickerKey(prev => prev + 1);
    }, delayMs);
  }, []);

  const startTickerCycle = useCallback((delayMs = 300) => {
    setTickerVisible(true);
    beginAnimation(delayMs);
  }, [beginAnimation]);

  useEffect(() => {
    if (activePlanningMessages.length === 0) {
      setTickerVisible(false);
      if (tickerTimerRef.current) {
        clearTimeout(tickerTimerRef.current);
      }
      setTickerAnimating(false);
      return;
    }

    if (!tickerVisible) {
      startTickerCycle();
    }
  }, [activePlanningMessages, startTickerCycle, tickerVisible]);

  const handleTickerEnd = () => {
    setTickerAnimating(false);
    if (tickerTimerRef.current) {
      clearTimeout(tickerTimerRef.current);
    }
    tickerTimerRef.current = setTimeout(() => {
      if (activeMessagesRef.current.length > 0) {
        startTickerCycle(300);
      }
    }, 5 * 60 * 1000);
  };

  const restartTickerNow = () => {
    if (tickerTimerRef.current) {
      clearTimeout(tickerTimerRef.current);
    }
    if (activeMessagesRef.current.length === 0) {
      setTickerVisible(false);
      setTickerAnimating(false);
      return;
    }
    setTickerVisible(true);
    beginAnimation(150);
  };

  const openTickerFullscreen = () => {
    restartTickerNow();
    setTickerFullscreen(true);
  };

  const NEWS_ICON_MAP = {
    'shopping-cart': { icon: faShoppingCart, color: '#2563eb', bg: '#dbeafe' },
    'gavel': { icon: faGavel, color: '#dc2626', bg: '#fef2f2' },
    'check-circle': { icon: faCheckCircle, color: '#059669', bg: '#ecfdf5' },
    'check-double': { icon: faCheckCircle, color: '#10b981', bg: '#d1fae5' },
    'file-invoice': { icon: faFileInvoice, color: '#0284c7', bg: '#e0f2fe' },
    'exclamation-triangle': { icon: faExclamationTriangle, color: '#f59e0b', bg: '#fffbeb' },
  };

  // Nový formát: {action_items: [...], changes: [...], since_formatted: '6.4. 14:30'}
  const actionItems = newsSinceLogin?.action_items || [];
  const changeItems = newsSinceLogin?.changes || [];
  // Zpětná kompatibilita se starým formátem (items pole)
  const legacyItems = newsSinceLogin?.items || (Array.isArray(newsSinceLogin) ? newsSinceLogin : []);
  const sinceFormatted = newsSinceLogin?.since_formatted || '';

  return (
    <>
    <WidgetBody>
      <WelcomeRow>
        <AvatarCircle>
          {getInitials(user?.jmeno, user?.prijmeni)}
        </AvatarCircle>
        <WelcomeInfo>
          <WelcomeName>
            Dobrý den, {user?.jmeno} {user?.prijmeni}
            {hasActiveSubstitution && (
              <FontAwesomeIcon 
                icon={faUserFriends} 
                title={substitutionTooltip}
                style={{ 
                  marginLeft: '0.5rem', 
                  color: '#a855f7', 
                  fontSize: '0.9em',
                  verticalAlign: 'middle',
                  cursor: 'help'
                }} 
              />
            )}
            {hasBeingSubstituted && (
              <FontAwesomeIcon 
                icon={faUserFriends} 
                title={beingSubstitutedTooltip}
                style={{ 
                  marginLeft: '0.5rem', 
                  color: '#0891b2', 
                  fontSize: '0.9em',
                  verticalAlign: 'middle',
                  cursor: 'help'
                }} 
              />
            )}
          </WelcomeName>
          <WelcomeRole>
            {roleLabels.length > 0 
              ? roleLabels.join(' · ') 
              : (userRolesDisplay || user?.pozice || 'Uživatel')
            }
            {user?.oddeleni ? ` — ${user.oddeleni}` : ''}
          </WelcomeRole>
          <WelcomeDate>
            {dayNames[today.getDay()]}, {today.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </WelcomeDate>
          {nameday && (
            <WelcomeNameday>
              <FontAwesomeIcon icon={faGift} />
              Svátek má <strong>{nameday}</strong>
            </WelcomeNameday>
          )}
        </WelcomeInfo>
      </WelcomeRow>

      {tickerVisible && activePlanningMessages.length > 0 && (
        <WelcomeTickerRow>
          <PlanningTicker>
            <PlanningTickerTitle>
              <FontAwesomeIcon icon={faInfoCircle} />
              Informační zprávy
              <PlanningTickerActions>
                <PlanningTickerRestart type="button" onClick={restartTickerNow} title="Znovu spustit rolování">
                  <FontAwesomeIcon icon={faSync} />
                </PlanningTickerRestart>
                <PlanningTickerRestart type="button" onClick={openTickerFullscreen} title="Zobrazit na celou obrazovku">
                  <FontAwesomeIcon icon={faExpand} />
                </PlanningTickerRestart>
              </PlanningTickerActions>
            </PlanningTickerTitle>
            <PlanningTickerViewport>
              <PlanningTickerContent
                key={tickerKey}
                style={{
                  '--ticker-duration': `${tickerDuration}s`,
                  '--ticker-start': 'calc(100% + 2em)',
                  ...(tickerAnimating
                    ? {}
                    : { opacity: 0, animation: 'none', transform: 'translateY(var(--ticker-start))' })
                }}
                onAnimationEnd={tickerAnimating ? handleTickerEnd : undefined}
              >
                {activePlanningMessages.map((msg, idx) => (
                  <PlanningTickerItem key={msg.id || idx}>
                    {msg.nazev && <PlanningTickerItemTitle>{msg.nazev}</PlanningTickerItemTitle>}
                    <PlanningTickerHtml dangerouslySetInnerHTML={{ __html: msg.obsah || '' }} />
                  </PlanningTickerItem>
                ))}
              </PlanningTickerContent>
            </PlanningTickerViewport>
          </PlanningTicker>
        </WelcomeTickerRow>
      )}

      {/* Moje přehled – statistiky */}
      {myStats && !myStats.error && (
        <>
          <WelcomeDivider />
          <NewsSection>
            <NewsSectionTitle>
              <FontAwesomeIcon icon={faUser} style={{ marginRight: '0.3rem' }} />
              Můj přehled
            </NewsSectionTitle>
            {/* 0. Planning události k reakci - vždy jako první */}
            {planningOverviewItems.map(item => {
              const planningItem = (
                <NewsItem
                  $bg="#e0f2fe"
                  onClick={() => {
                    if (onOpenPlanningEvent) {
                      onOpenPlanningEvent(item.event.id);
                    }
                  }}
                >
                  <NewsIcon $color="#0284c7"><FontAwesomeIcon icon={faCalendarAlt} /></NewsIcon>
                  <NewsText>{item.eventTitle}</NewsText>
                  <NewsCount $color="#0284c7">{item.validTermsCount}</NewsCount>
                </NewsItem>
              );

              return (
                <SmartTooltip
                  key={`event-${item.event.id}`}
                  text={renderPlanningOverviewTooltip(item)}
                  icon="none"
                  multiline
                  preferredPosition="right"
                  maxWidth="430px"
                  interactive
                  stretch
                >
                  {planningItem}
                </SmartTooltip>
              );
            })}
            {/* 1. Ke schválení / rozpracované */}
            {myStats.objednavky_k_vyrizeni > 0 && (
              <NewsItem $bg="#fef3c7" onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: 'ke_schvaleni', clearFilters: true } })}>
                <NewsIcon $color="#b45309"><FontAwesomeIcon icon={faShoppingCart} /></NewsIcon>
                <NewsText>Ke schválení / rozpracované</NewsText>
                <NewsCount $color="#b45309">{myStats.objednavky_k_vyrizeni}</NewsCount>
              </NewsItem>
            )}
            {/* 2. Schválené, ke zpracování */}
            {myStats.schvalene_k_odeslani?.count > 0 && (
              <NewsItem $bg="#eff6ff" onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: 'schvalena', clearFilters: true } })}>
                <NewsIcon $color="#2563eb"><FontAwesomeIcon icon={faCheckCircle} /></NewsIcon>
                <NewsText>
                  Schválené, ke zpracování
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af', marginTop: 1 }}>
                    {myStats.schvalene_k_odeslani.castka?.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Kč
                  </span>
                </NewsText>
                <NewsCount $color="#2563eb">{myStats.schvalene_k_odeslani.count}</NewsCount>
              </NewsItem>
            )}
            {/* 3. U dodavatele, čeká faktura */}
            {myStats.odeslane_bez_faktury?.count > 0 && (
              <NewsItem $bg="#fff7ed" onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: 'odeslana', clearFilters: true } })}>
                <NewsIcon $color="#c2410c"><FontAwesomeIcon icon={faCoins} /></NewsIcon>
                <NewsText>
                  U dodavatele, čeká faktura
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af', marginTop: 1 }}>
                    {myStats.odeslane_bez_faktury.castka?.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Kč
                  </span>
                </NewsText>
                <NewsCount $color="#c2410c">{myStats.odeslane_bez_faktury.count}</NewsCount>
              </NewsItem>
            )}
            {/* 4. Ke zveřejnění do registru */}
            {myStats.ke_zverejneni > 0 && (
              <NewsItem $bg="#ede9fe" onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: 'k_uverejneni', clearFilters: true } })}>
                <NewsIcon $color="#7c3aed"><FontAwesomeIcon icon={faGlobe} /></NewsIcon>
                <NewsText>Ke zveřejnění do registru</NewsText>
                <NewsCount $color="#7c3aed">{myStats.ke_zverejneni}</NewsCount>
              </NewsItem>
            )}
            {/* 5. Faktury k potvrzení věcné správnosti */}
            {myStats.faktury_k_potvrzeni > 0 && (
              <NewsItem $bg="#e0f2fe" onClick={() => navigate('/invoices25-list', { state: { dashboardFilter: 'my_unchecked_invoices', clearFilters: true } })}>
                <NewsIcon $color="#0284c7"><FontAwesomeIcon icon={faFileInvoice} /></NewsIcon>
                <NewsText>Faktury k potvrzení věcné správnosti</NewsText>
                <NewsCount $color="#0284c7">{myStats.faktury_k_potvrzeni}</NewsCount>
              </NewsItem>
            )}
            {/* 6. Vyfakturované, nedokončené */}
            {myStats.vyfakturovane_nedokoncene?.count > 0 && (
              <NewsItem $bg="#ecfdf5" onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: 'fakturace', clearFilters: true } })}>
                <NewsIcon $color="#059669"><FontAwesomeIcon icon={faMoneyBillWave} /></NewsIcon>
                <NewsText>
                  Vyfakturované, nedokončené
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af', marginTop: 1 }}>
                    {myStats.vyfakturovane_nedokoncene.castka?.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Kč
                  </span>
                </NewsText>
                <NewsCount $color="#059669">{myStats.vyfakturovane_nedokoncene.count}</NewsCount>
              </NewsItem>
            )}
            {myStats.objednavky_k_vyrizeni === 0 && myStats.faktury_k_potvrzeni === 0 && myStats.ke_zverejneni === 0 && myStats.odeslane_bez_faktury?.count === 0 && myStats.schvalene_k_odeslani?.count === 0 && myStats.vyfakturovane_nedokoncene?.count === 0 && planningOverviewItems.length === 0 && (
              <NewsEmpty>Vše vyřízeno ✓</NewsEmpty>
            )}
          </NewsSection>
        </>
      )}

      {/* Vyžaduje vaši akci – bez časového filtru */}
      {actionItems.length > 0 && (
        <>
          <WelcomeDivider />
          <NewsSection>
            <NewsSectionTitle>
              <FontAwesomeIcon icon={faExclamationCircle} style={{ marginRight: '0.3rem' }} />
              Vyžaduje vaši akci
            </NewsSectionTitle>
            {actionItems.map((item, i) => {
              const cfg = NEWS_ICON_MAP[item.icon] || { icon: faInfoCircle, color: '#6b7280', bg: '#f3f4f6' };
              return (
                <NewsItem key={`a${i}`} $bg={cfg.bg} onClick={() => {
                  if (item.link) {
                    navigate(item.link, item.filter ? { state: { dashboardFilter: item.filter, clearFilters: true } } : undefined);
                  }
                }}>
                  <NewsIcon $color={cfg.color}>
                    <FontAwesomeIcon icon={cfg.icon} />
                  </NewsIcon>
                  <NewsText>{item.text}</NewsText>
                  <NewsCount $color={cfg.color}>{item.count}</NewsCount>
                </NewsItem>
              );
            })}
          </NewsSection>
        </>
      )}

      {/* Změny od přihlášení – s časovým filtrem */}
      <WelcomeDivider />
      <NewsSection>
        <NewsSectionTitle>
          <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem' }} />
          Změny od přihlášení {sinceFormatted ? `(${sinceFormatted})` : ''}
        </NewsSectionTitle>
        {(changeItems.length > 0 || legacyItems.length > 0) ? (
          [...changeItems, ...legacyItems].map((item, i) => {
            const cfg = NEWS_ICON_MAP[item.icon] || { icon: faInfoCircle, color: '#6b7280', bg: '#f3f4f6' };
            return (
              <NewsItem key={`c${i}`} $bg={cfg.bg} onClick={() => {
                if (item.link) {
                  navigate(item.link, item.filter ? { state: { dashboardFilter: item.filter, clearFilters: true } } : undefined);
                }
              }}>
                <NewsIcon $color={cfg.color}>
                  <FontAwesomeIcon icon={cfg.icon} />
                </NewsIcon>
                <NewsText>{item.text}</NewsText>
                <NewsCount $color={cfg.color}>{item.count}</NewsCount>
              </NewsItem>
            );
          })
        ) : (
          <NewsEmpty>Žádné změny od přihlášení</NewsEmpty>
        )}
      </NewsSection>
    </WidgetBody>

    {tickerFullscreen && ReactDOM.createPortal(
      <ChartOverlay onClick={(e) => { if (e.target === e.currentTarget) setTickerFullscreen(false); }}>
        <ChartFullscreenBox>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FontAwesomeIcon icon={faInfoCircle} style={{ color: '#3b82f6' }} />
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>Informační zprávy</span>
            </div>
            <button onClick={() => setTickerFullscreen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b', padding: '0.25rem 0.5rem', borderRadius: '4px' }} title="Zavřít (ESC)">
              <FontAwesomeIcon icon={faCompress} />
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', padding: '2rem 3rem', background: '#f8fafc' }}>
            {activePlanningMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Žádné aktivní zprávy</div>
            ) : (
              <PlanningFullscreenScroll
                key={tickerKey}
                style={{
                  '--ticker-duration': `${tickerDuration * 0.5}s`,
                  '--ticker-start': 'calc(100% - 3rem)',
                  ...(tickerAnimating
                    ? {}
                    : { opacity: 0, animation: 'none', transform: 'translateY(var(--ticker-start))' })
                }}
              >
                {activePlanningMessages.map((msg, idx) => (
                  <div key={msg.id || idx} style={{ background: '#ffffff', borderRadius: '12px', padding: '1.5rem 2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    {msg.nazev && (
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', borderBottom: '2px solid #3b82f6', paddingBottom: '0.5rem' }}>
                        {msg.nazev}
                      </h3>
                    )}
                    <div 
                      style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#475569' }}
                      dangerouslySetInnerHTML={{ __html: msg.obsah || '' }}
                    />
                  </div>
                ))}
              </PlanningFullscreenScroll>
            )}
          </div>
        </ChartFullscreenBox>
      </ChartOverlay>,
      document.body
    )}
    </>
  );
}

function OrderStatsWidget({ stats, navigate }) {
  if (!stats) return <EmptyState>Žádná data</EmptyState>;

  const items = [
    { key: 'total', label: 'Celkem', value: stats.total, color: '#1d4ed8', bg: '#dbeafe', filter: null },
    { key: 'ke_schvaleni', label: 'Ke schválení', value: stats.ke_schvaleni, color: '#dc2626', bg: '#fee2e2', filter: 'ke_schvaleni' },
    { key: 'schvalena', label: 'Schváleno', value: stats.schvalena, color: '#166534', bg: '#dcfce7', filter: 'schvalena' },
    { key: 'rozpracovana', label: 'Rozpracované', value: stats.rozpracovana, color: '#b45309', bg: '#fef3c7', filter: 'rozpracovana' },
    { key: 'odeslana', label: 'Odeslané', value: stats.odeslana, color: '#0284c7', bg: '#e0f2fe', filter: 'odeslana' },
    { key: 'potvrzena', label: 'Potvrzené', value: stats.potvrzena, color: '#7c3aed', bg: '#ede9fe', filter: 'potvrzena' },
    { key: 'fakturace', label: 'Fakturace', value: stats.fakturace, color: '#06b6d4', bg: '#cffafe', filter: 'fakturace' },
    { key: 'vecna_spravnost', label: 'Věcná spr.', value: stats.vecna_spravnost, color: '#be185d', bg: '#fce7f3', filter: 'vecna_spravnost' },
    { key: 'zkontrolovana', label: 'Zkontrolováno', value: stats.zkontrolovana, color: '#16a34a', bg: '#dcfce7', filter: 'zkontrolovana' },
    { key: 'k_uverejneni_do_registru', label: 'Ke zveřejnění', value: stats.k_uverejneni_do_registru, color: '#ea580c', bg: '#fff7ed', filter: 'k_uverejneni_do_registru' },
    { key: 'uverejnena', label: 'Zveřejněné', value: stats.uverejnena, color: '#059669', bg: '#ecfdf5', filter: 'uverejnena' },
    { key: 'dokoncena', label: 'Dokončené', value: stats.dokoncena, color: '#059669', bg: '#d1fae5', filter: 'dokoncena' }
  ];

  return (
    <WidgetBody $noScroll>
      <StatRow>
        {items.map(it => (
          <StatBox key={it.key} $bg={it.bg} $clickable onClick={() => navigate('/orders25-list-v3', it.filter ? { state: { dashboardFilter: it.filter } } : undefined)}>
            <StatValue $color={it.color}>{it.value || 0}</StatValue>
            <StatLabel>{it.label}</StatLabel>
          </StatBox>
        ))}
      </StatRow>
      {stats.celkova_castka > 0 && (
        <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.8rem', color: theme.colors.gray500 }}>
          Celková hodnota: <strong style={{ color: theme.colors.primary }}>{formatCurrency(stats.celkova_castka)}</strong>
        </div>
      )}
    </WidgetBody>
  );
}

function MyOrdersWidget({ myOrdersData, navigate }) {
  const objednatel = myOrdersData?.objednatel || [];
  const garant     = myOrdersData?.garant     || [];
  const prikazce   = myOrdersData?.prikazce   || [];
  const usek       = myOrdersData?.usek       || [];
  const hasPrikazce = myOrdersData?.has_prikazce_role || false;
  const isAdmin    = myOrdersData?.is_admin   || false;

  const total = objednatel.length + garant.length + prikazce.length + usek.length;
  if (total === 0) {
    return <WidgetBody><EmptyState>Žádné objednávky</EmptyState></WidgetBody>;
  }

  const renderOrder = (o) => {
    const stav = o.aktualni_stav || '';
    const sb = getStatusBadge(stav);
    const objednavatel = o.objednavatel_jmeno ? `${o.objednavatel_jmeno} ${o.objednavatel_prijmeni || ''}`.trim() : '';
    const garantJmeno = o.garant_jmeno ? `${o.garant_jmeno} ${o.garant_prijmeni || ''}`.trim() : '';
    const prikazceJmeno = o.prikazce_jmeno ? `${o.prikazce_jmeno} ${o.prikazce_prijmeni || ''}`.trim() : '';
    const metaInfo = [objednavatel && `Obj: ${objednavatel}`, garantJmeno && `Gar: ${garantJmeno}`, prikazceJmeno && `Přík: ${prikazceJmeno}`].filter(Boolean).join(' · ');
    return (
      <ListItem key={o.id} onClick={() => navigate(`/order-form-25?edit=${o.id}`, { state: { returnTo: '/dashboard' } })}>
        <ListItemLeft>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ListItemTitle>{o.cislo_objednavky || `#${o.id}`}</ListItemTitle>
            {o.dni_od_vytvoreni !== undefined && (
              <Badge
                $bg={o.dni_od_vytvoreni > 7 ? '#fee2e2' : (o.dni_od_vytvoreni > 2 ? '#dbeafe' : '#dcfce7')}
                $color={o.dni_od_vytvoreni > 7 ? '#dc2626' : (o.dni_od_vytvoreni > 2 ? '#1d4ed8' : '#16a34a')}
              >
                {o.dni_od_vytvoreni === 0 ? 'dnes' : (o.dni_od_vytvoreni === 1 ? 'včera' : `před ${o.dni_od_vytvoreni} d`)}
              </Badge>
            )}
          </div>
          <ListItemSub>{o.predmet}</ListItemSub>
          {metaInfo && <ListItemMeta>{metaInfo}</ListItemMeta>}
        </ListItemLeft>
        <ListItemRight>
          <Amount>{formatCurrency(o.celkova_cena_s_dph)}</Amount>
          <Badge $bg={sb.bg} $color={sb.color}>{getStatusLabel(stav)}</Badge>
        </ListItemRight>
      </ListItem>
    );
  };

  const SectionDivider = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0 0.25rem', opacity: 0.7 }}>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
    </div>
  );

  return (
    <WidgetBody>
      {objednatel.length > 0 && (
        <>
          <SectionDivider label="Objednatel" />
          {objednatel.map(renderOrder)}
        </>
      )}
      {garant.length > 0 && (
        <>
          <SectionDivider label="Garant" />
          {garant.map(renderOrder)}
        </>
      )}
      {hasPrikazce && prikazce.length > 0 && (
        <>
          <SectionDivider label="Příkazce / Schvalovatel" />
          {prikazce.map(renderOrder)}
        </>
      )}
      {isAdmin && usek.length > 0 && (
        <>
          <SectionDivider label="Úsek" />
          {usek.map(renderOrder)}
        </>
      )}
      <ViewAllLink>
        <button onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: 'moje_objednavky' } })}>
          Zobrazit vše <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </ViewAllLink>
    </WidgetBody>
  );
}

function OrderListWidget({ orders, title, navigate, filterPreset }) {
  if (!orders || orders.length === 0) {
    return <WidgetBody><EmptyState>Žádné objednávky</EmptyState></WidgetBody>;
  }

  return (
    <WidgetBody>
      {orders.map(o => {
        const stav = o.aktualni_stav || '';
        const sb = getStatusBadge(stav);
        const objednavatel = o.objednavatel_jmeno ? `${o.objednavatel_jmeno} ${o.objednavatel_prijmeni || ''}`.trim() : '';
        const prikazce = o.prikazce_jmeno ? `${o.prikazce_jmeno} ${o.prikazce_prijmeni || ''}`.trim() : '';
        const metaInfo = [objednavatel && `Obj: ${objednavatel}`, prikazce && `Přík: ${prikazce}`].filter(Boolean).join(' · ');
        return (
          <ListItem key={o.id} onClick={() => navigate(`/order-form-25?edit=${o.id}`, { state: { returnTo: '/dashboard' } })}>
            <ListItemLeft>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListItemTitle>{o.cislo_objednavky || `#${o.id}`}</ListItemTitle>
                {o.dni_od_vytvoreni !== undefined && (
                  <Badge
                    $bg={o.dni_od_vytvoreni > 7 ? '#fee2e2' : (o.dni_od_vytvoreni > 2 ? '#dbeafe' : '#dcfce7')}
                    $color={o.dni_od_vytvoreni > 7 ? '#dc2626' : (o.dni_od_vytvoreni > 2 ? '#1d4ed8' : '#16a34a')}
                  >
                    {o.dni_od_vytvoreni === 0 ? 'dnes' : (o.dni_od_vytvoreni === 1 ? 'včera' : `před ${o.dni_od_vytvoreni} d`)}
                  </Badge>
                )}
              </div>
              <ListItemSub>{o.predmet}</ListItemSub>
              {metaInfo && <ListItemMeta>{metaInfo}</ListItemMeta>}
            </ListItemLeft>
            <ListItemRight>
              <Amount>{formatCurrency(o.celkova_cena_s_dph)}</Amount>
              <Badge $bg={sb.bg} $color={sb.color}>{getStatusLabel(stav)}</Badge>
            </ListItemRight>
          </ListItem>
        );
      })}
      <ViewAllLink>
        <button onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: filterPreset || null } })}>
          Zobrazit vše <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </ViewAllLink>
    </WidgetBody>
  );
}

function InvoiceListWidget({ invoices, navigate, filterPreset }) {
  if (!invoices || invoices.length === 0) {
    return <WidgetBody><EmptyState>Žádné faktury</EmptyState></WidgetBody>;
  }

  return (
    <WidgetBody>
      {invoices.map(f => {
        const vytvoril = f.vytvoril_jmeno ? `${f.vytvoril_jmeno} ${f.vytvoril_prijmeni || ''}`.trim() : '';
        const predano = f.fa_predana_zam_jmeno ? `${f.fa_predana_zam_jmeno} ${f.fa_predana_zam_prijmeni || ''}`.trim() : '';
        const metaInfo = [vytvoril && `Evid: ${vytvoril}`, predano && `Předáno: ${predano}`].filter(Boolean).join(' · ');
        const vazba = f.cislo_objednavky ? ` — ${f.cislo_objednavky}` : (f.cislo_smlouvy ? ` — SML: ${f.cislo_smlouvy}` : (!f.objednavka_id && !f.smlouva_id ? ' — nepřiřazena' : ''));
        return (
          <ListItem key={f.id} onClick={() => navigate('/invoice-evidence', { state: { editInvoiceId: f.id, orderIdForLoad: f.objednavka_id || null, returnTo: '/dashboard' } })}>
            <ListItemLeft>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListItemTitle><span style={{ color: '#6b7280', fontWeight: 400 }}>FA VS:</span> {f.fa_cislo || `#${f.id}`}</ListItemTitle>
                <Badge
                  $bg={f.dni_do_splatnosti < 0 ? '#fee2e2' : (f.dni_do_splatnosti < 3 ? '#fef3c7' : '#dbeafe')}
                  $color={f.dni_do_splatnosti < 0 ? '#dc2626' : (f.dni_do_splatnosti < 3 ? '#b45309' : '#1d4ed8')}
                >
                  {f.dni_do_splatnosti < 0
                    ? `${Math.abs(f.dni_do_splatnosti)} d po spl.`
                    : (f.dni_do_splatnosti !== undefined ? `za ${f.dni_do_splatnosti} d` : '')}
                </Badge>
              </div>
              <ListItemSub>{f.fa_dodavatel_nazev}{vazba}</ListItemSub>
              {metaInfo && <ListItemMeta>{metaInfo}</ListItemMeta>}
            </ListItemLeft>
            <ListItemRight>
              <Amount $color={f.dni_do_splatnosti < 0 ? '#dc2626' : (f.dni_do_splatnosti < 3 ? '#f97316' : theme.colors.primary)}>
                {formatCurrency(f.fa_castka)}
              </Amount>
              {(() => { const fs = getFaStatusBadge(f.stav); return <Badge $bg={fs.bg} $color={fs.color}>{getFaStatusLabel(f.stav)}</Badge>; })()}
            </ListItemRight>
          </ListItem>
        );
      })}
      <ViewAllLink>
        <button onClick={() => navigate('/invoices25-list', { state: { dashboardFilter: filterPreset || null } })}>
          Zobrazit vše <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </ViewAllLink>
    </WidgetBody>
  );
}

function InvoiceOverdueWidget({ invoices, navigate, filterPreset }) {
  if (!invoices || invoices.length === 0) {
    return <WidgetBody><EmptyState>Žádné faktury po splatnosti</EmptyState></WidgetBody>;
  }

  return (
    <WidgetBody>
      {invoices.map(f => {
        const vytvoril = f.vytvoril_jmeno ? `${f.vytvoril_jmeno} ${f.vytvoril_prijmeni || ''}`.trim() : '';
        const predano = f.fa_predana_zam_jmeno ? `${f.fa_predana_zam_jmeno} ${f.fa_predana_zam_prijmeni || ''}`.trim() : '';
        const vazbaInfo = f.cislo_objednavky || (f.cislo_smlouvy ? `SML: ${f.cislo_smlouvy}` : (!f.objednavka_id && !f.smlouva_id ? 'nepřiřazena' : ''));
        const metaParts = [vazbaInfo, vytvoril && `Evid: ${vytvoril}`, predano && `Předáno: ${predano}`].filter(Boolean);
        const metaInfo = metaParts.join(' · ');
        return (
          <ListItem key={f.id} onClick={() => navigate('/invoice-evidence', { state: { editInvoiceId: f.id, orderIdForLoad: f.objednavka_id || null, returnTo: '/dashboard' } })}>
            <ListItemLeft>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListItemTitle><span style={{ color: '#6b7280', fontWeight: 400 }}>FA VS:</span> {f.fa_cislo || `#${f.id}`}</ListItemTitle>
                <Badge $bg="#fee2e2" $color="#dc2626">{f.dni_po_splatnosti} d po spl.</Badge>
              </div>
              <ListItemSub>{f.fa_dodavatel_nazev} — spl. {formatDate(f.fa_datum_splatnosti)}</ListItemSub>
              {metaInfo && <ListItemMeta>{metaInfo}</ListItemMeta>}
            </ListItemLeft>
            <ListItemRight>
              <Amount $color="#dc2626">{formatCurrency(f.fa_castka)}</Amount>
              {(() => { const fs = getFaStatusBadge(f.stav); return <Badge $bg={fs.bg} $color={fs.color}>{getFaStatusLabel(f.stav)}</Badge>; })()}
            </ListItemRight>
          </ListItem>
        );
      })}
    </WidgetBody>
  );
}

function AlertsWidget({ alerts, navigate }) {
  const [tip, setTip] = useState({ text: '', x: 0, y: 0, show: false });

  if (!alerts || alerts.length === 0) {
    return <WidgetBody><EmptyState>Žádná upozornění — vše v pořádku!</EmptyState></WidgetBody>;
  }

  const alertIconMap = {
    'clock': faClock,
    'exclamation-triangle': faExclamationTriangle,
    'exclamation-circle': faExclamationCircle,
    'globe': faGlobe,
    'calendar-alt': faCalendarAlt
  };

  const alertInfoMap = {
    'Objednávky v prodlení': 'Objednávky, u kterých nedošlo\nk žádné akci déle než 7 dní.\nZkontrolujte stav a posuňte\nje v procesu dál.',
    'Ke zveřejnění – prodlení': 'Objednávky čekající na zveřejnění\nv registru smluv déle než 2 dny.\nZveřejnění je ze zákona povinné\ndo stanoveného termínu.',
    'Nepotvrzené faktury': 'Faktury čekající na potvrzení\nvěcné správnosti déle než 7 dní.\nBez potvrzení nelze fakturu\nzpracovat k proplacení.',
    'Faktury po splatnosti': 'Faktury, u kterých již uplynulo\ndatum splatnosti. Hrozí penále\na sankce za pozdní úhradu.'
  };

  const handleTipEnter = (e, text) => {
    if (!text) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ text, x: r.left + 12, y: r.top - 8, show: true });
  };
  const handleTipLeave = () => setTip(t => ({ ...t, show: false }));

  return (
    <WidgetBody>
      {alerts.map((a, i) => (
        <AlertItem
          key={i}
          $bg={getAlertBg(a.type)}
          onClick={() => {
            if (!a.link) return;
            const filterMap = {
              'Objednávky v prodlení':    { link: '/orders25-list-v3',  state: { dashboardFilter: 'fakturace_prodleni',       clearFilters: true } },
              'Ke zveřejnění – prodlení': { link: '/orders25-list-v3',  state: { dashboardFilter: 'k_uverejneni_do_registru', clearFilters: true } },
              'Nepotvrzené faktury':      { link: '/invoices25-list',   state: { dashboardFilter: 'unpaid',                   clearFilters: true } },
              'Faktury po splatnosti':    { link: '/invoices25-list',   state: { dashboardFilter: 'overdue',                  clearFilters: true } },
            };
            const preset = filterMap[a.title];
            if (preset) navigate(preset.link, { state: preset.state });
            else navigate(a.link);
          }}
          onMouseEnter={e => handleTipEnter(e, alertInfoMap[a.title])}
          onMouseLeave={handleTipLeave}
        >
          <AlertIcon $color={getAlertColor(a.type)}>
            <FontAwesomeIcon icon={alertIconMap[a.icon] || faExclamationTriangle} />
          </AlertIcon>
          <AlertText>
            <AlertTitle>{a.title}</AlertTitle>
            <AlertMsg>{a.message}</AlertMsg>
            {a.meta && <AlertMeta>{a.meta}</AlertMeta>}
          </AlertText>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <WidgetBadge $bg={getAlertBg(a.type)} $color={getAlertColor(a.type)}>
              {a.count}
            </WidgetBadge>
            <span className="alert-arrow" style={{ opacity: 0, transition: 'all 0.2s', color: getAlertColor(a.type), fontSize: '0.8rem' }}>→</span>
          </div>
        </AlertItem>
      ))}
      {tip.show && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', left: tip.x, top: tip.y, transform: 'translateY(-100%)',
          background: '#1e293b', color: '#f1f5f9', padding: '0.6rem 0.75rem',
          borderRadius: '8px', fontSize: '0.72rem', lineHeight: '1.5',
          whiteSpace: 'pre-line', maxWidth: '340px', zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)', pointerEvents: 'none',
        }}>{tip.text}</div>,
        document.body
      )}
    </WidgetBody>
  );
}

function NotificationsWidget({ notifications, navigate }) {
  if (!notifications || notifications.length === 0) {
    return <WidgetBody><EmptyState>Žádné notifikace za posledních 7 dní</EmptyState></WidgetBody>;
  }

  const unreadCount = notifications.filter(n => !n.precteno || n.precteno === '0' || n.precteno === 0).length;

  const getDaysAge = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // ✅ Relativní čas "Před X"
  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = Date.now();
    const created = new Date(dateStr).getTime();
    const diff = Math.floor((now - created) / 1000); // sekundy

    if (diff < 60) return 'Před ' + diff + 's';
    if (diff < 3600) return 'Před ' + Math.floor(diff / 60) + 'm';
    if (diff < 86400) return 'Před ' + Math.floor(diff / 3600) + 'h';
    return 'Před ' + Math.floor(diff / 86400) + 'd';
  };

  const isPlanningNotification = (n) => {
    const objTyp = (n?.objekt_typ || '').toLowerCase();
    const typ = (n?.typ || '').toUpperCase();
    return (
      objTyp === 'planning_event' ||
      objTyp === 'planning_message' ||
      objTyp === 'planning_event_response' ||
      objTyp === 'planning_message_response' ||
      typ.startsWith('PLANNING_')
    );
  };

  // ✅ SPRÁVNÁ NAVIGACE - stejně jako NotificationsPage - používá data a objekt_id
  const handleNotificationClick = (n) => {
    const data = n.data || {};
    const orderId = data.order_id || n.objekt_id;
    
    // ✅ PLANNING EVENT - navigovat na stránku notifikací, kde se otevře detail
    // (nemůžeme otevřít planning panel z dashboardu, protože by se překrýval s widgety)
    if (isPlanningNotification(n)) {
      navigate('/notifications');
      return;
    }
    
    // ✅ Notifikace objednávek - proklik na detail
    // Backend vrací: "orders" (množné číslo!)
    if (n.objekt_typ && (n.objekt_typ === 'orders' || n.objekt_typ === 'order' || n.objekt_typ === 'objednavka') && orderId) {
      navigate(`/order-form-25?edit=${orderId}`, { state: { returnTo: '/dashboard' } });
      return;
    }
    
    // ✅ Notifikace faktur - proklik na evidenci
    // Backend vrací: "invoices" (množné číslo!)
    if (n.objekt_typ && (n.objekt_typ === 'invoices' || n.objekt_typ === 'invoice' || n.objekt_typ === 'faktura') && n.objekt_id) {
      navigate('/invoice-evidence', { state: { editInvoiceId: n.objekt_id, returnTo: '/dashboard' } });
      return;
    }
    
    // ✅ Notifikace zastupování - proklik na profil (záložka Zastupování)
    if (n.objekt_typ === 'zastupovani') {
      navigate('/profile?tab=substitution');
      return;
    }
    
    // Ostatní - na seznam notifikací
    navigate('/notifications');
  };

  // ✅ Extrahuj strukturované informace pro 3-řádkový formát (jako tabulka objednávek)
  const getNotificationDetails = (n) => {
    const data = n.data || {};
    const placeholders = data.placeholders || {};
    
    // ✅ ADMIN_MESSAGE - zprávy od administrátorů
    if (n.typ === 'ADMIN_MESSAGE') {
      const sender = (() => {
        try {
          const ph = typeof n.placeholder_data === 'string' ? JSON.parse(n.placeholder_data) : (n.placeholder_data || {});
          return ph.sender_name || placeholders.sender_name || n.from_user_name || null;
        } catch (e) {
          return placeholders.sender_name || n.from_user_name || null;
        }
      })();
      
      const createdDate = n.dt_created || n.vytvoren_kdy;
      const timeFormatted = createdDate ? new Date(createdDate).toLocaleString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
      
      return {
        type: 'MSG',
        nadpis: n.nadpis || n.titulek || 'Zpráva od správce',
        zprava: n.zprava || '',
        sender: sender,
        timeFormatted: timeFormatted,
        number: null, objekt_id: null, subject: null, usersLine: null,
        amount: null, statusText: null, statusColor: null, timeText: null,
        actionType: null, actionColor: null
      };
    }

    // ✅ PLANNING EVENT / MESSAGE - události a zprávy
    if (isPlanningNotification(n)) {
      const planningData = (() => {
        try {
          return typeof n.data_json === 'string' ? JSON.parse(n.data_json) : (n.data_json || data || {});
        } catch (e) {
          return data || {};
        }
      })();
      
      const organizator = planningData.organizator || {};
      const sender = organizator.full_name || n.from_user_name || null;
      
      const createdDate = n.dt_created || n.vytvoren_kdy;
      const timeFormatted = createdDate ? new Date(createdDate).toLocaleString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
      
      // Formátování termínu události
      let eventTimeStr = '';
      if (planningData.dt_od) {
        const dtOd = new Date(planningData.dt_od);
        const dtDo = planningData.dt_do ? new Date(planningData.dt_do) : null;
        
        const dateStr = dtOd.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeOdStr = dtOd.toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        
        if (dtDo) {
          const timeDoStr = dtDo.toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
          eventTimeStr = `${dateStr} ${timeOdStr} - ${timeDoStr}`;
        } else {
          eventTimeStr = `${dateStr} ${timeOdStr}`;
        }
      }
      
      const daysAge = getDaysAge(n.dt_created);
      let timeText = '';
      if (daysAge === 0) timeText = 'dnes';
      else if (daysAge === 1) timeText = 'včera';
      else if (daysAge !== null) timeText = `před ${daysAge} d`;

      const typUpper = (n.typ || '').toUpperCase();
      const objTypLower = (n.objekt_typ || '').toLowerCase();
      const isResponse = typUpper.includes('_RESPONSE') || objTypLower.includes('_response');
      const isMessage = objTypLower.includes('message') || typUpper.includes('MESSAGE');
      
      return {
        type: 'PLANNING',
        nadpis: n.nadpis || planningData.nazev || 'Událost',
        zprava: n.zprava || planningData.popis || '',
        sender: sender,
        timeFormatted: timeFormatted,
        eventTime: eventTimeStr,
        timeText,
        actionType: isResponse ? 'Odpověď' : (isMessage ? 'Zpráva' : 'Událost'),
        actionColor: isResponse ? '#8b5cf6' : (isMessage ? '#0891b2' : '#8b5cf6'),
        number: null, objekt_id: n.objekt_id, subject: null, usersLine: null,
        amount: null, statusText: null, statusColor: null
      };
    }
    
    // ✅ ZASTUPOVÁNÍ - notifikace o nastavení/ukončení zástupce
    if (n.objekt_typ === 'zastupovani' || n.typ === 'SUBSTITUTION_SET' || n.typ === 'SUBSTITUTION_CREATED' || n.typ === 'SUBSTITUTION_ENDED') {
      const daysAge = getDaysAge(n.dt_created);
      let timeText = '';
      if (daysAge === 0) timeText = 'dnes';
      else if (daysAge === 1) timeText = 'včera';
      else if (daysAge !== null) timeText = `před ${daysAge} d`;
      const zastupCreatedDate = n.dt_created || n.vytvoren_kdy;
      const zastupTimeFormatted = zastupCreatedDate ? new Date(zastupCreatedDate).toLocaleString('cs-CZ', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '';
      return {
        type: 'ZASTUP',
        nadpis: n.nadpis || 'Zastupování',
        zprava: n.zprava || '',
        timeText,
        sender: n.from_user_name || null,
        timeFormatted: zastupTimeFormatted,
        number: null, objekt_id: null, subject: null, usersLine: null,
        amount: null, statusText: null, statusColor: null,
        actionType: n.typ === 'SUBSTITUTION_ENDED' ? 'Ukončeno' : 'Zastupování',
        actionColor: n.typ === 'SUBSTITUTION_ENDED' ? '#64748b' : '#0891b2'
      };
    }
    
    // ✅ KOMENTÁŘE - detekce (ORDER_COMMENT_ADDED, COMMENT_REPLY, …COMMENT…)
    const isComment = n.typ === 'ORDER_COMMENT_ADDED' || n.typ === 'COMMENT_REPLY'
      || (n.typ && n.typ.toUpperCase().includes('COMMENT'));
    if (isComment) {
      const nadpis = n.nadpis || '';
      const zprava = n.zprava || '';
      // Číslo objednávky
      const numMatch = (placeholders.order_number) || (() => {
        const m = nadpis.match(/(O-[^\s,]+)/); return m ? m[1] : null;
      })();
      // Autor komentáře
      const authorMatch = placeholders.action_performed_by || placeholders.comment_author || (() => {
        const m = zprava.match(/^(.+?)\s+(přidal|odpověděl|reagoval|napsal|okomentoval)/i);
        return m ? m[1] : null;
      })();
      // Text v uvozovkách
      const quoteMatch = (() => {
        const m = zprava.match(/["\u201e\u201c]([^"\u201d\u201c]{1,200})["\u201d\u201c]/);
        return m ? m[1] : null;
      })();
      // Předmět / název objednávky v závorce
      const subjectMatch = placeholders.order_subject || placeholders.predmet || (() => {
        const m = zprava.match(/\(([^)]{2,80})\)/);
        return m ? m[1] : null;
      })();
      // Typ akce česky
      const actionLabel = n.typ === 'COMMENT_REPLY' ? 'Odpověď' : 'Nový komentář';
      // Čas
      const daysAge = getDaysAge(n.dt_created);
      let timeText = '';
      if (daysAge === 0) timeText = 'dnes';
      else if (daysAge === 1) timeText = 'včera';
      else if (daysAge !== null) timeText = `před ${daysAge} d`;
      // ✅ Formátovaný čas pro Řádek 3
      const komCreatedDate = n.dt_created || n.vytvoren_kdy;
      const komTimeFormatted = komCreatedDate ? new Date(komCreatedDate).toLocaleString('cs-CZ', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '';
      return {
        type: 'KOM', number: numMatch, objekt_id: n.objekt_id,
        commentAuthor: authorMatch, commentQuote: quoteMatch, commentSubject: subjectMatch,
        actionType: actionLabel, actionColor: '#6366f1',
        timeText, subject: null, usersLine: null, amount: null, statusText: null, statusColor: null,
        sender: authorMatch || n.from_user_name || null,
        timeFormatted: komTimeFormatted
      };
    }

    // ✅ PRIMÁRNÍ: objekt_typ z notifikace (ne placeholders!)
    let number = null;
    let type = null;
    
    if (n.objekt_typ === 'invoices') {
      type = 'FA';
      number = placeholders.invoice_number || placeholders.cislo_faktury;
    } else if (n.objekt_typ === 'orders') {
      type = 'Obj';
      number = placeholders.order_number;
    }
    // Fallback pokud objekt_typ chybí
    else if (placeholders.invoice_number || placeholders.cislo_faktury) {
      type = 'FA';
      number = placeholders.invoice_number || placeholders.cislo_faktury;
    } else if (placeholders.order_number) {
      type = 'Obj';
      number = placeholders.order_number;
    }
    
    // ✅ Typ akce - co se po uživateli chce
    let actionType = null;
    let actionColor = '#f59e0b'; // default oranžová
    
    if (n.typ) {
      if (n.typ.includes('APPROVAL')) {
        actionType = 'Ke schválení';
        actionColor = '#ef4444'; // červená
      } else if (n.typ.includes('MATERIAL_CHECK')) {
        actionType = 'Věcná správnost';
        actionColor = '#f59e0b'; // oranžová
      } else if (n.typ.includes('FORMAL_CHECK')) {
        actionType = 'Formální kontrola';
        actionColor = '#f59e0b';
      } else if (n.typ.includes('PAYMENT')) {
        actionType = 'K zaplacení';
        actionColor = '#10b981'; // zelená
      } else if (n.typ.includes('OVERDUE')) {
        actionType = 'Po splatnosti';
        actionColor = '#dc2626'; // tmavě červená
      } else if (n.typ.includes('CREATED')) {
        actionType = 'Nová';
        actionColor = '#3b82f6'; // modrá
      } else if (n.typ.includes('REJECTED')) {
        actionType = 'Zamítnuto';
        actionColor = '#ef4444';
      }
    }
    
    // Fallback z nadpisu
    if (!actionType && n.nadpis) {
      if (n.nadpis.includes('schválení')) actionType = 'Ke schválení';
      else if (n.nadpis.includes('Kontrola')) actionType = 'Kontrola';
      else if (n.nadpis.includes('věcné správnosti')) actionType = 'Věcná správnost';
    }
    
    // Řádek 2: Předmět/popis
    let subject = placeholders.order_subject || placeholders.predmet || n.nadpis || n.zprava;
    
    // Řádek 3: Uživatelé (formát: "Obj: Jméno · Gar: Jméno")
    const parts = [];
    if (type === 'Obj') {
      if (placeholders.objednatel_name || placeholders.creator_name) {
        parts.push(`Obj: ${placeholders.objednatel_name || placeholders.creator_name}`);
      }
      if (placeholders.prikazce_name) {
        parts.push(`Příl: ${placeholders.prikazce_name}`);
      }
      if (placeholders.schvalovatel_name || placeholders.approver_name) {
        parts.push(`Schv: ${placeholders.schvalovatel_name || placeholders.approver_name}`);
      }
    } else if (type === 'FA') {
      if (placeholders.vytvoril_fa_name || placeholders.creator_name) {
        parts.push(`Vytv: ${placeholders.vytvoril_fa_name || placeholders.creator_name}`);
      }
      if (placeholders.predano_komu_name) {
        parts.push(`Předáno: ${placeholders.predano_komu_name}`);
      }
    }
    const usersLine = parts.length > 0 ? parts.join(' · ') : null;
    
    // ✅ Částka z DB (platí pro Obj i FA)
    let amount = null;
    if (type === 'Obj' && placeholders.order_amount_raw) {
      amount = Number(placeholders.order_amount_raw).toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' Kč';
    } else if (type === 'FA' && placeholders.invoice_amount_raw) {
      amount = Number(placeholders.invoice_amount_raw).toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' Kč';
    }
    
    // ✅ Stav objednávky nebo faktury
    let statusText = null;
    let statusColor = '#ca8a04'; // žlutá default
    
    if (type === 'Obj' && placeholders.order_status) {
      statusText = placeholders.order_status; // už je česky z DB
      
      // ✅ Barvy podle orderStatusColors.js (jako v Moje obj)
      const statusNorm = statusText.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (statusNorm.includes('SCHVALEN')) statusColor = '#ea580c'; // oranžová
      else if (statusNorm.includes('KE SCHVALEN') || statusNorm.includes('ODESLAN') && statusNorm.includes('SCHVALEN')) statusColor = '#dc2626'; // červená
      else if (statusNorm.includes('ROZPRAC')) statusColor = '#ca8a04'; // žlutá
      else if (statusNorm.includes('ODESLAN')) statusColor = '#1d4ed8'; // modrá
      else if (statusNorm.includes('POTVRZEN')) statusColor = '#0891b2'; // cyan
      else if (statusNorm.includes('FAKTURAC')) statusColor = '#06b6d4'; // tyrkysová
      else if (statusNorm.includes('DOKONCEN')) statusColor = '#16a34a'; // zelená
      else if (statusNorm.includes('ZAMITNU') || statusNorm.includes('ZRUSEN')) statusColor = '#7c2d12'; // hnědá
      else if (statusNorm.includes('VECN') && statusNorm.includes('SPRAVNOST')) statusColor = '#10b981'; // zelená
      else if (statusNorm.includes('NOVA')) statusColor = '#475569'; // šedá
      
    } else if (type === 'FA') {
      // Priorita: "Po splatnosti" > běžný stav
      if (placeholders.invoice_is_overdue && placeholders.invoice_is_overdue == 1) {
        statusText = 'Po splatnosti';
        statusColor = '#dc2626'; // červená
      } else if (placeholders.invoice_status) {
        const statusMap = {
          'ZAEVIDOVANA': { text: 'Zaevidována', color: '#475569' }, // šedá
          'VECNA_SPRAVNOST': { text: 'Věcná správnost', color: '#10b981' }, // zelená
          'V_RESENI': { text: 'V řešení', color: '#ca8a04' }, // žlutá
          'PREDANA_PO': { text: 'Předána PO', color: '#1d4ed8' }, // modrá
          'K_ZAPLACENI': { text: 'K zaplacení', color: '#ea580c' }, // oranžová
          'ZAPLACENO': { text: 'Zaplaceno', color: '#16a34a' }, // zelená
          'DOKONCENA': { text: 'Dokončena', color: '#16a34a' }, // zelená
          'STORNO': { text: 'Storno', color: '#dc2626' } // červená
        };
        const mapped = statusMap[placeholders.invoice_status];
        if (mapped) {
          statusText = mapped.text;
          statusColor = mapped.color;
        } else {
          statusText = placeholders.invoice_status;
        }
      }
    }
    
    // Čas
    const daysAge = getDaysAge(n.dt_created);
    let timeText = '';
    if (daysAge === 0) timeText = 'dnes';
    else if (daysAge === 1) timeText = 'včera';
    else if (daysAge !== null) timeText = `před ${daysAge} d`;
    
    return { number, type, subject, usersLine, amount, statusText, statusColor, timeText, actionType, actionColor };
  };

  return (
    <WidgetBody>
      {unreadCount > 0 && (
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${theme.colors.gray100}` }}>
          <strong style={{ color: '#1d4ed8' }}>{unreadCount}</strong> nepřečten{unreadCount === 1 ? 'á' : unreadCount < 5 ? 'é' : 'ých'}
        </div>
      )}
      {notifications.map(n => {
        const isRead = n.precteno && n.precteno !== '0' && n.precteno !== 0;
        const details = getNotificationDetails(n);
        const daysAge = getDaysAge(n.dt_created);
        
        // Badge barva podle stáří (stejně jako v tabulce obj)
        let dateBadgeBg = '#dcfce7'; // zelená - dnes/včera
        let dateBadgeColor = '#16a34a';
        if (daysAge > 7) {
          dateBadgeBg = '#fee2e2'; // červená
          dateBadgeColor = '#dc2626';
        } else if (daysAge > 2) {
          dateBadgeBg = '#dbeafe'; // modrá
          dateBadgeColor = '#1d4ed8';
        }
        
        return (
          <ListItem 
            key={n.id}
            onClick={() => handleNotificationClick(n)}
            onMouseEnter={e => { e.currentTarget.style.background = '#edf2f7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isRead ? 'transparent' : 'rgba(99,102,241,0.04)'; }}
            style={{ 
              padding: '0.6rem 0.75rem',
              borderBottom: `1px solid ${theme.colors.gray100}`,
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              background: isRead ? 'transparent' : 'rgba(99,102,241,0.04)',
              position: 'relative'
            }}
          >
            {/* ── ADMIN MESSAGE ── */}
            {details.type === 'MSG' ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Řádek 1: Ikona + Nadpis + relativní čas | vpravo badge "Zpráva od správce" */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.3rem' }}>
                  <FontAwesomeIcon 
                    icon={n.priorita === 'high' || n.priorita === 'urgent' ? faExclamationTriangle : faEnvelope} 
                    style={{ 
                      color: isRead ? '#94a3b8' : (n.priorita === 'high' || n.priorita === 'urgent' ? '#dc2626' : '#f59e0b'), 
                      fontSize: '0.75rem', 
                      flexShrink: 0 
                    }} 
                  />
                  <span style={{ color: isRead ? '#64748b' : '#1e293b', fontWeight: isRead ? 500 : 700, fontSize: '0.82rem' }}>
                    {details.nadpis}
                  </span>
                  <Badge $bg={dateBadgeBg} $color={dateBadgeColor} style={{ fontSize: '0.65rem' }}>
                    {getTimeAgo(n.dt_created || n.created_at)}
                  </Badge>
                  <span style={{ marginLeft: 'auto' }}>
                    <Badge $bg={isRead ? '#f1f5f9' : '#fef3c7'} $color={isRead ? '#94a3b8' : '#d97706'} style={{ fontWeight: 600 }}>
                      Zpráva od správce
                    </Badge>
                  </span>
                </div>
                {/* Řádek 2: Obsah zprávy (zkrácená na 2 řádky) */}
                {details.zprava && (
                  <div style={{ 
                    fontSize: '0.81rem', 
                    color: isRead ? '#64748b' : '#475569', 
                    lineHeight: 1.45,
                    marginBottom: '0.3rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {details.zprava}
                  </div>
                )}
                {/* Řádek 3: Od: celé jméno + datum+čas */}
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {details.sender && `Od: ${details.sender} • `}{details.timeFormatted}
                </div>
              </div>
            ) : details.type === 'KOM' ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Řádek 1: 💬 číslo obj · [dnes] badge · label badge vpravo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                  <FontAwesomeIcon icon={faComments} style={{ color: isRead ? '#94a3b8' : '#6366f1', fontSize: '0.75rem', flexShrink: 0 }} />
                  {details.number && details.objekt_id ? (
                    <a
                      href={`/order-form-25?edit=${details.objekt_id}`}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); handleNotificationClick(n); }}
                      style={{ color: isRead ? '#64748b' : '#6366f1', textDecoration: 'none', fontWeight: isRead ? 500 : 700, fontSize: '0.82rem' }}
                      title="Otevřít objednávku"
                    >
                      {details.number}
                    </a>
                  ) : details.number ? (
                    <span style={{ color: isRead ? '#64748b' : '#6366f1', fontWeight: isRead ? 500 : 700, fontSize: '0.82rem' }}>{details.number}</span>
                  ) : null}
                  {details.timeText && (
                    <Badge $bg={dateBadgeBg} $color={dateBadgeColor}>{details.timeText}</Badge>
                  )}
                  <span style={{ marginLeft: 'auto' }}>
                    <Badge $bg={isRead ? '#f1f5f9' : '#ede9fe'} $color={isRead ? '#94a3b8' : '#6d28d9'} style={{ fontWeight: 600 }}>{details.actionType}</Badge>
                  </span>
                </div>
                {/* Řádek 2: zprava přímo — autor tučně, citace kurzívou */}
                {n.zprava && (
                  <div style={{ fontSize: '0.81rem', color: isRead ? '#64748b' : '#1e293b', lineHeight: 1.45, marginBottom: details.commentSubject ? '0.15rem' : 0 }}>
                    {(() => {
                      const text = n.zprava;
                      // Ztučni jméno autora na začátku (před slovesem)
                      const nameMatch = text.match(/^(.+?)\s+(přidal|odpověděl|reagoval|napsal|okomentoval)/i);
                      const authorPart = nameMatch ? nameMatch[1] : null;
                      const rest = authorPart ? text.substring(authorPart.length) : text;
                      // Kurzíva pro text v uvozovkách
                      const parts = rest.split(/("[^"]*"|\u201e[^\u201c]*\u201c|\u201c[^\u201d]*\u201d|\u201e[^\u201d]*\u201d)/g);
                      return (
                        <>
                          {authorPart && <strong>{authorPart}</strong>}
                          {parts.map((p, i) =>
                            /^["\u201e\u201c]/.test(p)
                              ? <em key={i} style={{ fontStyle: 'italic', color: isRead ? '#94a3b8' : '#475569' }}>{p}</em>
                              : <span key={i} style={{ color: isRead ? '#94a3b8' : '#64748b' }}>{p}</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                {/* Řádek 3: Od: jméno autora • datum+čas */}
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  {details.sender && `Od: ${details.sender} • `}{details.timeFormatted}
                </div>
              </div>
            ) : details.type === 'ZASTUP' ? (
            /* ── ZASTUPOVÁNÍ ────────────────────────────────────────── */
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Řádek 1: Ikona + Nadpis + čas | vpravo badge ZASTUP */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: isRead ? '#94a3b8' : '#0891b2', flexShrink: 0 }}>👥</span>
                <span style={{ color: isRead ? '#64748b' : '#1e293b', fontWeight: isRead ? 500 : 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                  {details.nadpis}
                </span>
                {details.timeText && (
                  <Badge $bg={dateBadgeBg} $color={dateBadgeColor}>{details.timeText}</Badge>
                )}
                <span style={{ marginLeft: 'auto' }}>
                  <Badge $bg={isRead ? '#f1f5f9' : '#e0f2fe'} $color={isRead ? '#94a3b8' : '#0369a1'} style={{ fontWeight: 700, letterSpacing: '0.03em' }}>{details.actionType}</Badge>
                </span>
              </div>
              {/* Řádek 2: Zpráva */}
              {details.zprava && (
                <div style={{ fontSize: '0.78rem', color: isRead ? '#94a3b8' : '#475569', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {details.zprava}
                </div>
              )}
              {/* Řádek 3: Od + datum+čas */}
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                {details.sender && `Od: ${details.sender} • `}{details.timeFormatted}
              </div>
            </div>
            ) : details.type === 'PLANNING' ? (
            /* ── PLANNING UDÁLOSTI A ZPRÁVY ─────────────────────────── */
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Řádek 1: Ikona + Nadpis + čas | vpravo badge typu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                <FontAwesomeIcon 
                  icon={details.actionType === 'Zpráva' ? faEnvelope : faCalendarAlt} 
                  style={{ 
                    color: isRead ? '#94a3b8' : details.actionColor, 
                    fontSize: '0.75rem', 
                    flexShrink: 0 
                  }} 
                />
                <span style={{ color: isRead ? '#64748b' : '#1e293b', fontWeight: isRead ? 500 : 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                  {details.nadpis}
                </span>
                {details.timeText && (
                  <Badge $bg={dateBadgeBg} $color={dateBadgeColor}>{details.timeText}</Badge>
                )}
                <span style={{ marginLeft: 'auto' }}>
                  <Badge 
                    $bg={isRead ? '#f1f5f9' : (details.actionType === 'Zpráva' ? '#cffafe' : '#ede9fe')} 
                    $color={isRead ? '#94a3b8' : details.actionColor} 
                    style={{ fontWeight: 600 }}
                  >
                    {details.actionType}
                  </Badge>
                </span>
              </div>
              {/* Řádek 2: Termín události + Zpráva/popis */}
              {details.eventTime && (
                <div style={{ fontSize: '0.78rem', color: isRead ? '#94a3b8' : '#475569', marginBottom: '0.2rem', fontWeight: 500 }}>
                  📅 {details.eventTime}
                </div>
              )}
              {details.zprava && (
                <div style={{ 
                  fontSize: '0.78rem', 
                  color: isRead ? '#94a3b8' : '#475569', 
                  lineHeight: 1.4, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical',
                  marginBottom: '0.15rem'
                }}>
                  {details.zprava}
                </div>
              )}
              {/* Řádek 3: Od + datum+čas vytvoření notifikace */}
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {details.sender && `Organizátor: ${details.sender} • `}{details.timeFormatted}
              </div>
            </div>
            ) : (
            /* ── OBJEDNÁVKY / FAKTURY – původní layout ────────────────── */
            <div style={{ flex: 1 }}>
              {/* Řádek 1: Číslo + datum badge + typ akce */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: isRead ? 400 : 600,
                  color: isRead ? '#64748b' : (details.type === 'Obj' ? '#1d4ed8' : '#ca8a04')
                }}>
                  {details.type} {details.number}
                </span>
                
                {details.timeText && (
                  <Badge $bg={dateBadgeBg} $color={dateBadgeColor}>
                    {details.timeText}
                  </Badge>
                )}
              </div>
              
              {/* Řádek 2: Předmět */}
              <div style={{ 
                fontSize: '0.82rem',
                color: isRead ? '#64748b' : '#1e293b',
                marginBottom: '0.25rem',
                fontWeight: isRead ? 400 : 500
              }}>
                {details.subject}
              </div>
              
              {/* Řádek 2.5: Celé znění zprávy - skryto, je redundantní s předmětem */}
              {false && n.zprava && (
                <div style={{ 
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginBottom: '0.25rem',
                  lineHeight: 1.4
                }}>
                  {n.zprava}
                </div>
              )}
              
              {/* Řádek 3: Uživatelé */}
              {details.usersLine && (
                <div style={{ 
                  fontSize: '0.72rem',
                  color: '#64748b'
                }}>
                  {details.usersLine}
                </div>
              )}
            </div>
            )}
            
            {/* Částka a stav vpravo - pouze pro Obj/FA */}
            {details.type !== 'KOM' && details.amount && (
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '4px',
                alignSelf: 'flex-start'
              }}>
                <div style={{ 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  whiteSpace: 'nowrap'
                }}>
                  {details.amount}
                </div>
                
                {details.statusText && (
                  <Badge $bg={details.statusColor + '20'} $color={details.statusColor} style={{ whiteSpace: 'nowrap' }}>
                    {details.statusText}
                  </Badge>
                )}
              </div>
            )}
          </ListItem>
        );
      })}
      <ViewAllLink>
        <button onClick={() => navigate('/notifications')}>
          Všechny notifikace <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </ViewAllLink>
    </WidgetBody>
  );
}

function ChartTimelineWidget({ data, loading, groupBy = 'day', days = 30 }) {
  if (loading) {
    return (
      <WidgetBody style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 160, gap: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
          <span style={{ display: 'inline-block', width: 18, height: 18, border: '3px solid #e2e8f0', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'dashSpin 0.8s linear infinite' }} />
          Načítám graf…
        </div>
      </WidgetBody>
    );
  }
  if (!data || data.length === 0) {
    return <WidgetBody><EmptyState>Nedostatek dat pro graf</EmptyState></WidgetBody>;
  }

  const totalCastka = data.reduce((acc, d) => acc + (parseFloat(d.castka) || 0), 0);
  const totalPocet = data.reduce((acc, d) => acc + (parseInt(d.pocet) || 0), 0);

  const formatLabel = (denStr) => {
    const dt = new Date(denStr + 'T00:00:00');
    if (groupBy === 'month') {
      return dt.toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' });
    }
    return dt.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
  };

  const chartData = {
    labels: data.map(d => formatLabel(d.den)),
    datasets: [
      {
        label: 'Počet objednávek',
        data: data.map(d => d.pocet),
        backgroundColor: 'rgba(29, 78, 216, 0.7)',
        borderRadius: 6,
        barPercentage: 0.7
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex;
            const denStr = data[idx]?.den;
            if (!denStr) return '';
            const dt = new Date(denStr + 'T00:00:00');
            if (groupBy === 'month') {
              return dt.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
            }
            if (groupBy === 'week') {
              const end = new Date(dt);
              end.setDate(end.getDate() + 6);
              return `${dt.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} – ${end.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}`;
            }
            return dt.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
          },
          label: (ctx) => {
            const idx = ctx.dataIndex;
            const castka = parseFloat(data[idx]?.castka) || 0;
            return [
              `${ctx.raw} obj.`,
              formatCurrency(castka)
            ];
          }
        }
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false }, ticks: { maxRotation: groupBy === 'month' ? 0 : 45, font: { size: 10 } } }
    }
  };

  return (
    <WidgetBody $noScroll style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, minHeight: 160 }}>
        <Bar data={chartData} options={options} />
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
        <span>Celkem: <strong style={{ color: '#1d4ed8' }}>{totalPocet} obj.</strong></span>
        <span>Hodnota: <strong style={{ color: '#1d4ed8' }}>{formatCurrency(totalCastka)}</strong></span>
      </div>
    </WidgetBody>
  );
}

function TopSuppliersWidget({ suppliers }) {
  if (!suppliers || suppliers.length === 0) {
    return <WidgetBody><EmptyState>Žádní dodavatelé</EmptyState></WidgetBody>;
  }

  const chartData = {
    labels: suppliers.map(s => s.dodavatel_nazev?.substring(0, 25) || '?'),
    datasets: [{
      data: suppliers.map(s => parseFloat(s.celkova_castka) || 0),
      backgroundColor: CHART_COLORS.slice(0, suppliers.length),
      borderWidth: 0
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx) => `${formatCurrency(ctx.raw)} (${ctx.label})` } },
      datalabels: { display: false }
    }
  };

  return (
    <WidgetBody $noScroll style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, minHeight: 180 }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </WidgetBody>
  );
}

// ── Graf: Majetek podle druhu ────────────────────────────────────────────────
function MajetekByDruhWidget({ data }) {
  if (!data || data.length === 0) {
    return <WidgetBody><EmptyState>Žádná data majetku</EmptyState></WidgetBody>;
  }

  const totalCastka = data.reduce((s, d) => s + (parseFloat(d.castka_celkem) || 0), 0);
  const totalPocet  = data.reduce((s, d) => s + (parseInt(d.pocet) || 0), 0);

  const chartData = {
    labels: data.map(d => d.druh_nazev || d.druh_kod || '?'),
    datasets: [{
      data: data.map(d => parseFloat(d.castka_celkem) || 0),
      backgroundColor: CHART_COLORS.slice(0, data.length),
      borderWidth: 0,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const row = data[ctx.dataIndex];
            return [`${formatCurrency(ctx.raw)}`, `${row.pocet} obj.`];
          }
        }
      },
      datalabels: { display: false }
    }
  };

  return (
    <WidgetBody $noScroll style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, minHeight: 170 }}>
        <Doughnut data={chartData} options={options} />
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
        <span>Obj. s fakturou: <strong style={{ color: '#0f766e' }}>{totalPocet}</strong></span>
        <span>Fakturováno: <strong style={{ color: '#0f766e' }}>{formatCurrency(totalCastka)}</strong></span>
      </div>
    </WidgetBody>
  );
}

// ── Graf: Roční poplatky podle druhu a platby ────────────────────────────────
function FeesByDruhWidget({ data, navigate }) {
  if (!data || !data.rows || data.rows.length === 0) {
    return <WidgetBody><EmptyState>Žádné poplatky pro rok {new Date().getFullYear()}</EmptyState></WidgetBody>;
  }

  const { rok, rows, total } = data;

  // Unikátní druhy a typy platby
  const druhy  = [...new Set(rows.map(r => r.druh))];
  const platby = [...new Set(rows.map(r => r.platba))];

  const PLATBA_COLORS = { MESICNI: '#1d4ed8', KVARTALNI: '#7c3aed', ROCNI: '#06b6d4', JINA: '#f97316' };
  const PLATBA_LABELS = { MESICNI: 'Měsíční', KVARTALNI: 'Kvartální', ROCNI: 'Roční', JINA: 'Jiná' };

  const datasets = platby.map((platba, i) => ({
    label: PLATBA_LABELS[platba] || platba,
    data: druhy.map(druh => {
      const row = rows.find(r => r.druh === druh && r.platba === platba);
      return row ? parseFloat(row.castka_celkem) || 0 : 0;
    }),
    backgroundColor: PLATBA_COLORS[platba] || CHART_COLORS[i],
    borderRadius: 4,
    borderWidth: 0,
  }));

  // Labely druhů - zkrátit
  const druhLabels = druhy.map(d => {
    const row = rows.find(r => r.druh === d);
    const name = row?.druh_nazev || d;
    return name.length > 12 ? name.substring(0, 12) + '…' : name;
  });

  const chartData = { labels: druhLabels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
        }
      },
      datalabels: { display: false }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' },
           ticks: { callback: v => v >= 1000000 ? `${(v/1000000).toFixed(1)} M` : v >= 1000 ? `${(v/1000).toFixed(0)} k` : v } }
    }
  };

  return (
    <WidgetBody $noScroll style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, minHeight: 160 }}>
        <Bar data={chartData} options={options} />
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
        <span>Rok: <strong style={{ color: '#7c3aed' }}>{rok}</strong></span>
        <span>Celkem: <strong style={{ color: '#7c3aed' }}>{formatCurrency(parseFloat(total) || 0)}</strong></span>
        <span
          onClick={() => navigate('/annual-fees')}
          style={{ marginLeft: 'auto', color: '#7c3aed', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
        >
          Detail →
        </span>
      </div>
    </WidgetBody>
  );
}

function RegistryWidget({ ordersForRegistry, navigate }) {
  if (!ordersForRegistry || ordersForRegistry.length === 0) {
    return (
      <WidgetBody>
        <EmptyState>Žádné objednávky ke zveřejnění</EmptyState>
      </WidgetBody>
    );
  }
  return (
    <WidgetBody>
      {ordersForRegistry.map(o => {
        const dni = parseInt(o.dni_cekani) || 0;
        const isLate = dni > 3;
        const objednavatel = o.objednavatel_jmeno ? `${o.objednavatel_jmeno} ${o.objednavatel_prijmeni || ''}`.trim() : '';
        return (
          <ListItem
            key={o.id}
            style={isLate ? { background: '#fff7ed' } : {}}
            onClick={() => navigate(`/order-form-25?edit=${o.id}`, { state: { returnTo: '/dashboard' } })}
          >
            <ListItemLeft>
              <ListItemTitle style={isLate ? { color: '#c2410c' } : {}}>
                {isLate && (
                  <span style={{ marginRight: '0.3rem', fontSize: '0.8rem', color: '#f97316' }}>⚠</span>
                )}
                {o.cislo_objednavky || `#${o.id}`}
              </ListItemTitle>
              <ListItemSub>{o.predmet}</ListItemSub>
              {objednavatel && <ListItemMeta>Obj: {objednavatel}</ListItemMeta>}
            </ListItemLeft>
            <ListItemRight>
              <Amount>{formatCurrency(o.celkova_cena_s_dph)}</Amount>
              <Badge $bg={isLate ? '#fee2e2' : '#ecfdf5'} $color={isLate ? '#dc2626' : '#059669'}>
                {isLate ? `${dni} d` : (dni === 0 ? 'dnes' : `${dni} d`)}
              </Badge>
            </ListItemRight>
          </ListItem>
        );
      })}
      <ViewAllLink>
        <button onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: 'k_uverejneni_do_registru' } })}>
          Přejít na objednávky <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </ViewAllLink>
    </WidgetBody>
  );
}

function OrdersPublishedWidget({ publishedData, navigate }) {
  const items = publishedData?.items || [];
  const isFallback = publishedData?.is_fallback || false;
  if (!items || items.length === 0) {
    return (
      <WidgetBody>
        <EmptyState>Žádné zveřejněné objednávky</EmptyState>
      </WidgetBody>
    );
  }
  return (
    <WidgetBody>
      {isFallback && (
        <div style={{ fontSize: '0.72rem', color: '#92400e', background: '#fef3c7', padding: '0.35rem 0.6rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
          Za posledních 7 dní žádné záznamy — zobrazeny poslední záznamy roku
        </div>
      )}
      {items.map(o => {
        const objednavatel = o.objednavatel_jmeno ? `${o.objednavatel_jmeno} ${o.objednavatel_prijmeni || ''}`.trim() : '';
        const zverejnil = o.zverejnil_jmeno ? `${o.zverejnil_jmeno} ${o.zverejnil_prijmeni || ''}`.trim() : '';
        return (
          <ListItem key={o.id} onClick={() => navigate(`/order-form-25?edit=${o.id}`, { state: { returnTo: '/dashboard' } })}>
            <ListItemLeft>
              <ListItemTitle>{o.cislo_objednavky || `#${o.id}`}</ListItemTitle>
              <ListItemSub>{o.predmet}</ListItemSub>
              {objednavatel && <ListItemMeta>Obj: {objednavatel} · {formatDate(o.dt_vytvoreni)}</ListItemMeta>}
              <ListItemMeta>
                Zveřejnil: {zverejnil || 'neuvedeno'} · {formatDate(o.dt_zverejneni)}
              </ListItemMeta>
            </ListItemLeft>
            <ListItemRight>
              <Amount>{formatCurrency(o.celkova_cena_s_dph)}</Amount>
              <Badge $bg="#dcfce7" $color="#16a34a">zveřejněno</Badge>
            </ListItemRight>
          </ListItem>
        );
      })}
      <ViewAllLink>
        <button onClick={() => navigate('/orders25-list-v3', { state: { dashboardFilter: 'uverejnena' } })}>
          Zobrazit vše <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </ViewAllLink>
    </WidgetBody>
  );
}

// ============================================================================
// CASHBOOK SUMMARY WIDGET
// ============================================================================

const CbGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const CbStatBox = styled.div`
  background: ${p => p.$bg || '#f8fafc'};
  border: 1px solid ${p => p.$border || '#e2e8f0'};
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  text-align: center;
`;

const CbStatVal = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${p => p.$color || '#1e293b'};
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CbStatLabel = styled.div`
  font-size: 0.62rem;
  color: #64748b;
  margin-top: 0.15rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const CbPokladnaCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.5rem;
  background: #fff;
  &:last-child { margin-bottom: 0; }
`;

const CbPokladnaHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
`;

const CbPokladnaName = styled.div`
  font-size: 0.78rem;
  font-weight: 600;
  color: #1e293b;
`;

const CbStavBadge = styled.span`
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  text-transform: uppercase;
  ${p => p.$stav === 'aktivni'
    ? 'background: #dcfce7; color: #16a34a;'
    : p.$stav === 'uzavrena_uzivatelem'
    ? 'background: #fef3c7; color: #b45309;'
    : 'background: #fee2e2; color: #dc2626;'}
`;

const CbPokladnaMeta = styled.div`
  font-size: 0.68rem;
  color: #64748b;
  margin-bottom: 0.35rem;
`;

const CbPokladnaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.3rem;
`;

const CbMiniStat = styled.div`
  background: ${p => p.$bg || '#f8fafc'};
  border-radius: 6px;
  padding: 0.3rem 0.4rem;
  text-align: center;
`;

const CbMiniVal = styled.div`
  font-size: 0.78rem;
  font-weight: 700;
  color: ${p => p.$color || '#1e293b'};
`;

const CbMiniLabel = styled.div`
  font-size: 0.6rem;
  color: #94a3b8;
`;

function CashbookSummaryWidget({ cbData, navigate, loading }) {
  const d = cbData || {};
  const pokladny = d.pokladny || [];
  const souhrn = d.souhrn || null;
  const isAdminView = d.is_admin_view || false;
  const mesicNazev = d.mesic_nazev || '';
  const rok = d.rok || '';

  const fmt = (val) => {
    const n = parseFloat(val) || 0;
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 2 }).format(n);
  };

  const stavLabel = (s) => {
    if (s === 'aktivni') return 'Aktivní';
    if (s === 'uzavrena_uzivatelem') return 'Uzavřená';
    if (s === 'zamknuta_spravcem') return 'Zamčená';
    return s || '—';
  };

  if (loading) {
    return (
      <WidgetBody $noScroll>
        <CbLoadGate>
          <CbLoadRing />
          <CbLoadLabel>Načítám data pokladny…</CbLoadLabel>
        </CbLoadGate>
      </WidgetBody>
    );
  }

  if (pokladny.length === 0) {
    return (
      <WidgetBody>
        <EmptyState>Žádná pokladní kniha pro {mesicNazev} {rok}</EmptyState>
      </WidgetBody>
    );
  }

  return (
    <WidgetBody>
      {/* Souhrn – admin nebo více pokladen */}
      {souhrn && (
        <>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
            {mesicNazev} {rok} – celkový přehled ({souhrn.pocet_pokladen} {souhrn.pocet_pokladen === 1 ? 'pokladna' : souhrn.pocet_pokladen < 5 ? 'pokladny' : 'pokladen'})
          </div>
          <CbGrid>
            <CbStatBox $bg="#f0fdf4" $border="#bbf7d0">
              <CbStatVal $color="#16a34a">{fmt(souhrn.celkovy_stav)}</CbStatVal>
              <CbStatLabel>Celkový stav</CbStatLabel>
            </CbStatBox>
            <CbStatBox $bg="#eff6ff" $border="#bfdbfe">
              <CbStatVal $color="#2563eb">{fmt(souhrn.prijmy_mesic)}</CbStatVal>
              <CbStatLabel>Příjmy ({mesicNazev})</CbStatLabel>
            </CbStatBox>
            <CbStatBox $bg="#fff7ed" $border="#fed7aa">
              <CbStatVal $color="#ea580c">{fmt(souhrn.vydaje_mesic)}</CbStatVal>
              <CbStatLabel>Výdaje ({mesicNazev})</CbStatLabel>
            </CbStatBox>
            {isAdminView && (
              <CbStatBox>
                <CbStatVal>{souhrn.pocet_polozek ?? 0}</CbStatVal>
                <CbStatLabel>Položek celkem</CbStatLabel>
              </CbStatBox>
            )}
            {isAdminView && souhrn.aktivnich_knih !== undefined && (
              <CbStatBox>
                <CbStatVal $color="#16a34a">{souhrn.aktivnich_knih}</CbStatVal>
                <CbStatLabel>Aktivních knih</CbStatLabel>
              </CbStatBox>
            )}
            {isAdminView && souhrn.uzavrenych_knih > 0 && (
              <CbStatBox $bg="#fef9c3" $border="#fde68a">
                <CbStatVal $color="#b45309">{souhrn.uzavrenych_knih}</CbStatVal>
                <CbStatLabel>Uzavřených/zam.</CbStatLabel>
              </CbStatBox>
            )}
          </CbGrid>
        </>
      )}

      {/* Jednotlivé pokladny */}
      {pokladny.map((pk) => (
        <CbPokladnaCard key={pk.kniha_id || pk.pokladna_id}>
          <CbPokladnaHeader>
            <CbPokladnaName>
              {pk.cislo_pokladny ? `#${pk.cislo_pokladny} ` : ''}{pk.pokladna_nazev || `Pokladna ${pk.pokladna_id}`}
            </CbPokladnaName>
            <CbStavBadge $stav={pk.stav_knihy}>{stavLabel(pk.stav_knihy)}</CbStavBadge>
          </CbPokladnaHeader>
          {pk.nazev_pracoviste && (
            <CbPokladnaMeta>{pk.nazev_pracoviste}</CbPokladnaMeta>
          )}
          <CbPokladnaGrid>
            <CbMiniStat $bg="#f0fdf4">
              <CbMiniVal $color="#16a34a">{fmt(pk.koncovy_stav)}</CbMiniVal>
              <CbMiniLabel>Aktuální stav</CbMiniLabel>
            </CbMiniStat>
            <CbMiniStat $bg="#eff6ff">
              <CbMiniVal $color="#2563eb">{fmt(pk.prijmy)}</CbMiniVal>
              <CbMiniLabel>Příjmy ({mesicNazev})</CbMiniLabel>
            </CbMiniStat>
            <CbMiniStat $bg="#fff7ed">
              <CbMiniVal $color="#ea580c">{fmt(pk.vydaje)}</CbMiniVal>
              <CbMiniLabel>Výdaje ({mesicNazev})</CbMiniLabel>
            </CbMiniStat>
          </CbPokladnaGrid>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '0.35rem', textAlign: 'right' }}>
            {pk.pocet_polozek ?? 0} položek | Počáteční stav: {fmt(pk.pocatecni_stav)}
          </div>
        </CbPokladnaCard>
      ))}

      <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
        <button
          onClick={() => navigate('/cash-book')}
          style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, padding: 0 }}
        >
          Přejít do pokladny →
        </button>
      </div>
    </WidgetBody>
  );
}

// ============================================================================
// SMLOUVY CRITICAL WIDGET
// ============================================================================

const CriticalTag = styled.span`
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  ${p => p.$type === 'UKONCENA' && `background: #fee2e2; color: #dc2626;`}
  ${p => p.$type === 'BRZY_KONCI' && `background: #fff7ed; color: #ea580c;`}
  ${p => p.$type === 'CERPANI' && `background: #fef3c7; color: #b45309;`}
`;

const ProgressBarMini = styled.div`
  width: 100%;
  height: 4px;
  background: ${theme.colors.gray100};
  border-radius: 2px;
  margin-top: 0.3rem;
  overflow: hidden;
  > div {
    height: 100%;
    border-radius: 2px;
    background: ${p => p.$pct >= 90 ? '#dc2626' : p.$pct >= 75 ? '#f97316' : '#10b981'};
    width: ${p => Math.min(p.$pct || 0, 100)}%;
    transition: width 0.4s;
  }
`;

const SmlouvyStatsRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const SmlouvyStatChip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${p => p.$bg || '#f1f5f9'};
  color: ${p => p.$color || '#475569'};
`;

function SmlouvyCriticalWidget({ smlouvy, navigate }) {
  const data = smlouvy || {};
  const items = data.items || [];
  const stats = data.stats || {};

  if (items.length === 0 && !stats.celkem_aktivnich) {
    return <WidgetBody><EmptyState>Žádné smlouvy v kritickém stavu</EmptyState></WidgetBody>;
  }

  return (
    <WidgetBody>
      {stats.celkem_aktivnich > 0 && (
        <SmlouvyStatsRow>
          <SmlouvyStatChip $bg="#dbeafe" $color="#1d4ed8">
            Aktivních: {stats.celkem_aktivnich}
          </SmlouvyStatChip>
          {parseInt(stats.blizi_se_vycerpani) > 0 && (
            <SmlouvyStatChip $bg="#fef3c7" $color="#b45309">
              Vyčerpání ≥75%: {stats.blizi_se_vycerpani}
            </SmlouvyStatChip>
          )}
          {parseInt(stats.blizi_se_konec) > 0 && (
            <SmlouvyStatChip $bg="#fee2e2" $color="#dc2626">
              Končí do 30d: {stats.blizi_se_konec}
            </SmlouvyStatChip>
          )}
        </SmlouvyStatsRow>
      )}
      {items.length === 0 ? (
        <EmptyState>Žádné smlouvy v kritickém stavu</EmptyState>
      ) : items.map(s => {
        const pct = parseFloat(s.procento_cerpani) || 0;
        const dnu = parseInt(s.dnu_do_konce, 10);
        const tags = [];
        if (s.typ_kriticky === 'CERPANI_KRITICKE') {
          tags.push(<CriticalTag key="c" $type="UKONCENA">{pct}% čerpáno</CriticalTag>);
        } else if (s.typ_kriticky === 'CERPANI_VYSOKE') {
          tags.push(<CriticalTag key="c" $type="CERPANI">{pct}% čerpáno</CriticalTag>);
        }
        if (s.typ_kriticky === 'KONCI_BRZY') {
          tags.push(<CriticalTag key="t" $type="UKONCENA">{dnu > 0 ? `zbývá ${dnu} dní` : 'Dnes končí'}</CriticalTag>);
        } else if (s.typ_kriticky === 'KONCI_DO_MESICE') {
          tags.push(<CriticalTag key="t" $type="BRZY_KONCI">zbývá {dnu} dní</CriticalTag>);
        }

        return (
          <ListItem key={s.id} onClick={() => navigate('/cerpani', { state: { returnTo: '/dashboard', tab: 'contracts', filterText: s.cislo_smlouvy || '' } })}>
            <ListItemLeft>
              <ListItemTitle>{s.cislo_smlouvy || `SML #${s.id}`}</ListItemTitle>
              <ListItemSub>{s.nazev_smlouvy}</ListItemSub>
              <ListItemMeta>
                {s.usek_zkr || s.usek_nazev || ''}
                {s.platnost_do ? ` | do ${new Date(s.platnost_do).toLocaleDateString('cs-CZ')}` : ''}
                {s.hodnota_s_dph > 0 ? ` | ${formatCurrency(s.cerpano_celkem || 0)} / ${formatCurrency(s.hodnota_s_dph)}` : ''}
              </ListItemMeta>
              {s.hodnota_s_dph > 0 && (
                <ProgressBarMini $pct={pct}><div /></ProgressBarMini>
              )}
            </ListItemLeft>
            <ListItemRight style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end' }}>
              {tags}
            </ListItemRight>
          </ListItem>
        );
      })}
    </WidgetBody>
  );
}

// ============================================================================
// LP CRITICAL WIDGET
// ============================================================================

function LPCriticalWidget({ lpData, navigate }) {
  const data = lpData || {};
  const items = data.items || [];
  const stats = data.stats || {};

  if (items.length === 0 && !stats.celkem_aktivnich) {
    return <WidgetBody><EmptyState>Žádné limitované příslíby v kritickém stavu</EmptyState></WidgetBody>;
  }

  return (
    <WidgetBody>
      {stats.celkem_aktivnich > 0 && (
        <SmlouvyStatsRow>
          <SmlouvyStatChip $bg="#dbeafe" $color="#1d4ed8">
            Aktivních: {stats.celkem_aktivnich}
          </SmlouvyStatChip>
          {parseInt(stats.stredni) > 0 && (
            <SmlouvyStatChip $bg="#dbeafe" $color="#17a2b8">
              Střední (50-74%): {stats.stredni}
            </SmlouvyStatChip>
          )}
          {parseInt(stats.vysoke) > 0 && (
            <SmlouvyStatChip $bg="#fef3c7" $color="#ffc107">
              Vysoké (75-89%): {stats.vysoke}
            </SmlouvyStatChip>
          )}
          {parseInt(stats.kriticke) > 0 && (
            <SmlouvyStatChip $bg="#fed7aa" $color="#fd7e14">
              Kritické (90-99%): {stats.kriticke}
            </SmlouvyStatChip>
          )}
          {parseInt(stats.prekrocene) > 0 && (
            <SmlouvyStatChip $bg="#fee2e2" $color="#dc2626">
              Překročeno (≥100%): {stats.prekrocene}
            </SmlouvyStatChip>
          )}
        </SmlouvyStatsRow>
      )}
      {items.length === 0 ? (
        <EmptyState>Žádné limitované příslíby k zobrazení</EmptyState>
      ) : items.map(lp => {
        const pct = parseFloat(lp.procento_cerpani) || 0;
        const tags = [];
        
        if (lp.typ_kriticky === 'PREKROCENO') {
          tags.push(<CriticalTag key="p" $type="UKONCENA" style={{ textAlign: 'right', lineHeight: 1.3 }}>⚠️ {pct}%<br/><span style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>překročeno!</span></CriticalTag>);
        } else if (lp.typ_kriticky === 'CERPANI_KRITICKE') {
          tags.push(<CriticalTag key="k" $type="UKONCENA" style={{ textAlign: 'right', lineHeight: 1.3 }}>🔴 {pct}%<br/><span style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>kritické</span></CriticalTag>);
        } else if (lp.typ_kriticky === 'CERPANI_VYSOKE') {
          tags.push(<CriticalTag key="v" $type="CERPANI" style={{ textAlign: 'right', lineHeight: 1.3 }}>🟡 {pct}%<br/><span style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>vysoké</span></CriticalTag>);
        } else if (lp.typ_kriticky === 'CERPANI_STREDNI') {
          tags.push(<CriticalTag key="s" $type="BRZY_KONCI" style={{ textAlign: 'right', lineHeight: 1.3 }}>🔵 {pct}%<br/><span style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>střední</span></CriticalTag>);
        }

        return (
          <ListItem key={lp.id} onClick={() => navigate('/cerpani', { state: { returnTo: '/dashboard', tab: 'lp', filterText: lp.cislo_lp || '' } })}>
            <ListItemLeft>
              <ListItemTitle>{lp.cislo_lp || `LP příslib #${lp.id}`}</ListItemTitle>
              <ListItemSub>{lp.usek_nazev || ''}</ListItemSub>
              <ListItemMeta>
                {lp.spravce_jmeno ? `Správce: ${lp.spravce_jmeno.trim()}` : ''}
                {lp.spravce_jmeno && lp.celkovy_limit > 0 ? ' | ' : ''}
                {lp.celkovy_limit > 0 ? `${formatCurrency(lp.skutecne_cerpano || 0)} / ${formatCurrency(lp.celkovy_limit)}` : ''}
              </ListItemMeta>
              {lp.celkovy_limit > 0 && (
                <ProgressBarMini $pct={pct}><div /></ProgressBarMini>
              )}
            </ListItemLeft>
            <ListItemRight style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end' }}>
              {tags}
            </ListItemRight>
          </ListItem>
        );
      })}
    </WidgetBody>
  );
}

// ============================================================================
// ORDER COMMENTS WIDGET
// ============================================================================

const CommentText = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.gray600};
  line-height: 1.4;
  margin-top: 0.15rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CommentMeta = styled.div`
  font-size: 0.65rem;
  color: ${theme.colors.gray400};
  margin-top: 0.1rem;
`;

function OrderCommentsWidget({ comments, navigate }) {
  if (!comments || comments.length === 0) {
    return <WidgetBody><EmptyState>Žádné nové komentáře</EmptyState></WidgetBody>;
  }

  const handleOrderClick = (cisloObjednavky) => {
    navigate('/orders25-list-v3', {
      state: {
        clearFilters: true,
        dashboardFilter: null,
        columnFilterCisloObj: cisloObjednavky,
      }
    });
  };

  const handleShowAll = () => {
    navigate('/orders25-list-v3', {
      state: {
        clearFilters: true,
        dashboardFilter: 's_mymi_komentari',
      }
    });
  };

  return (
    <WidgetBody>
      {comments.map(c => {
        const dni = c.dni_od_vytvoreni != null ? parseInt(c.dni_od_vytvoreni, 10) : null;
        const dniBg = dni === null ? '#f1f5f9' : dni > 30 ? '#fee2e2' : dni > 14 ? '#fef3c7' : '#dbeafe';
        const dniColor = dni === null ? '#64748b' : dni > 30 ? '#dc2626' : dni > 14 ? '#b45309' : '#1d4ed8';
        const dniLabel = dni === null ? '' : dni === 0 ? 'dnes' : (dni === 1 ? 'včera' : `před ${dni} d`);

        const metaParts = [
          c.objednatel_jmeno && c.objednatel_jmeno.trim() ? `Obj: ${c.objednatel_jmeno.trim()}` : null,
          c.schvalovatel_jmeno && c.schvalovatel_jmeno.trim() ? `Sch: ${c.schvalovatel_jmeno.trim()}` : null,
          c.prikazce_jmeno && c.prikazce_jmeno.trim() ? `Přík: ${c.prikazce_jmeno.trim()}` : null,
        ].filter(Boolean).join(' · ');

        return (
          <ListItem
            key={c.objednavka_id}
            onClick={() => handleOrderClick(c.cislo_objednavky || `#${c.objednavka_id}`)}
            style={{ cursor: 'pointer' }}
          >
            <ListItemLeft style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListItemTitle style={{ fontWeight: 700 }}>
                  {c.cislo_objednavky || `#${c.objednavka_id}`}
                </ListItemTitle>
                <Badge $bg={dniBg} $color={dniColor}>{dniLabel}</Badge>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: '10px', padding: '1px 7px',
                  fontSize: '0.65rem', fontWeight: 700, color: '#2563eb',
                  whiteSpace: 'nowrap', marginLeft: 'auto',
                }}>
                  <FontAwesomeIcon icon={faComment} style={{ fontSize: '0.62rem' }} /> {c.komentaru_celkem}
                </span>
              </div>
              {c.predmet && (
                <ListItemSub style={{ marginTop: '1px', color: '#1e293b', fontWeight: 400 }}>{c.predmet}</ListItemSub>
              )}
              {metaParts && (
                <ListItemMeta style={{ marginTop: '2px', fontStyle: 'normal' }}>{metaParts}</ListItemMeta>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
                <CommentMeta>
                  {c.posledni_autor} · {c.posledni_komentar_dt ? new Date(c.posledni_komentar_dt).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                </CommentMeta>
                {c.max_cena_s_dph != null && parseFloat(c.max_cena_s_dph) > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parseFloat(c.max_cena_s_dph))} Kč
                  </span>
                )}
              </div>
            </ListItemLeft>
          </ListItem>
        );
      })}
      <div style={{ padding: '8px 16px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
        <span
          onClick={handleShowAll}
          style={{ fontSize: '0.78rem', color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
          onMouseEnter={e => e.target.style.textDecoration = 'underline'}
          onMouseLeave={e => e.target.style.textDecoration = 'none'}
        >
          Zobrazit všechny objednávky s mými komentáři →
        </span>
      </div>
    </WidgetBody>
  );
}

// ============================================================================
// INVOICE STATS WIDGET
// ============================================================================

function InvoiceStatsWidget({ stats, navigate }) {
  if (!stats) return <EmptyState>Žádná data</EmptyState>;

  const items = [
    { key: 'total', label: 'Celkem', sub: `Faktury (${new Date().getFullYear()})`, value: stats.total, color: '#1d4ed8', bg: '#dbeafe', filter: null },
    { key: 'vecna_spravnost', label: 'Věcná spr.', sub: 'Ve věcné kontrole', value: stats.vecna_spravnost, color: '#7c3aed', bg: '#ede9fe', filter: 'vecna_spravnost' },
    { key: 'zaplaceno', label: 'Zaplaceno', sub: 'Uhrazené faktury', value: stats.zaplaceno, color: '#059669', bg: '#dcfce7', filter: 'paid' },
    { key: 'nezaplaceno', label: 'Nezaplaceno', sub: 'Čekající na platbu', value: stats.nezaplaceno, color: '#b45309', bg: '#fef3c7', filter: 'unpaid' },
    { key: 've_splatnosti', label: 'Ve splatnosti', sub: 'Nezaplacené ve lhůtě', value: stats.ve_splatnosti, color: '#0891b2', bg: '#e0f2fe', filter: 'within_due' },
    { key: 'po_splatnosti', label: 'Po splatnosti', sub: 'Překročená splatnost', value: stats.po_splatnosti, color: '#dc2626', bg: '#fee2e2', filter: 'overdue' },
    { key: 'storno', label: 'Storno', sub: 'Stornované faktury', value: stats.storno, color: '#64748b', bg: '#f1f5f9', filter: null },
    { key: 'bez_prirazeni', label: 'Bez přiřazení', sub: 'Nepřiřazené faktury', value: stats.bez_prirazeni, color: '#94a3b8', bg: '#f8fafc', filter: 'without_order' },
    { key: 's_objednavkou', label: 'Přiřazené OBJ', sub: 'S objednávkou', value: stats.s_objednavkou, color: '#1d4ed8', bg: '#dbeafe', filter: null },
    { key: 'se_smlouvou', label: 'Přiřazené SML', sub: 'Se smlouvou', value: stats.se_smlouvou, color: '#059669', bg: '#ecfdf5', filter: null },
    { key: 'zkontrolovano', label: 'Kontrola', sub: 'Zkontrolováno', value: stats.zkontrolovano, color: '#0891b2', bg: '#e0f2fe', filter: null },
    { key: 's_poznamkou', label: 'S poznámkou', sub: 'Faktury s poznámkou', value: stats.s_poznamkou, color: '#ea580c', bg: '#fff7ed', filter: 'with_note' },
    { key: 'moje_faktury', label: 'Moje faktury k potvrzení věcné', sub: 'Předané na mně', value: stats.moje_faktury, color: '#6366f1', bg: '#eef2ff', filter: 'my_unchecked_invoices' },
    { key: 'moje_nezkontrolovane', label: 'Mé nezkontrolované', sub: 'Předané na mě / Věcná', value: stats.moje_nezkontrolovane, color: '#f59e0b', bg: '#fef3c7', filter: 'my_unchecked_invoices' }
  ];

  return (
    <WidgetBody $noScroll>
      <StatRow>
        {items.map(it => (
          <StatBox
            key={it.key}
            $bg={it.bg}
            $clickable
            onClick={() => navigate('/invoices25-list', it.filter ? { state: { dashboardFilter: it.filter } } : undefined)}
            title={it.sub}
          >
            <StatValue $color={it.color}>{it.value || 0}</StatValue>
            <StatLabel>{it.label}</StatLabel>
          </StatBox>
        ))}
      </StatRow>
      {parseFloat(stats.celkova_castka) > 0 && (
        <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.8rem', color: theme.colors.gray500 }}>
          Celkem: <strong style={{ color: theme.colors.primary }}>{formatCurrency(stats.celkova_castka)}</strong>
          {parseFloat(stats.castka_po_splatnosti) > 0 && (
            <span style={{ color: '#dc2626', marginLeft: '0.75rem' }}>
              Z toho po splatnosti: <strong>{formatCurrency(stats.castka_po_splatnosti)}</strong>
            </span>
          )}
        </div>
      )}
    </WidgetBody>
  );
}

// ============================================================================
// ANNUAL FEES DUE WIDGET
// ============================================================================

function AnnualFeesDueWidget({ feesData, navigate }) {
  const data = feesData || {};
  const items = data.items || [];
  const stats = data.stats || {};

  if (items.length === 0 && !parseInt(stats.celkem)) {
    return <WidgetBody><EmptyState>Žádné roční poplatky</EmptyState></WidgetBody>;
  }

  return (
    <WidgetBody>
      <SmlouvyStatsRow>
        {parseInt(stats.celkem) > 0 && (
          <SmlouvyStatChip $bg="#dbeafe" $color="#1d4ed8">
            Celkem: {stats.celkem}
          </SmlouvyStatChip>
        )}
        {parseInt(stats.po_splatnosti) > 0 && (
          <SmlouvyStatChip $bg="#fee2e2" $color="#dc2626" onClick={() => navigate('/annual-fees', { state: { filterStav: '_PO_SPLATNOSTI' } })} style={{ cursor: 'pointer' }}>
            Po splatnosti: {stats.po_splatnosti}
          </SmlouvyStatChip>
        )}
        {parseInt(stats.blizi_se) > 0 && (
          <SmlouvyStatChip $bg="#fef3c7" $color="#b45309" onClick={() => navigate('/annual-fees', { state: { filterStav: '_BLIZI_SE_SPLATNOST' } })} style={{ cursor: 'pointer' }}>
            Blíží se spl. (30d): {stats.blizi_se}
          </SmlouvyStatChip>
        )}
      </SmlouvyStatsRow>

      {(parseFloat(stats.castka_po_splatnosti) > 0 || parseFloat(stats.castka_blizi_se) > 0) && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
          {parseFloat(stats.castka_po_splatnosti) > 0 && (
            <span style={{ color: '#dc2626' }}>
              Dluh: <strong>{formatCurrency(stats.castka_po_splatnosti)}</strong>
            </span>
          )}
          {parseFloat(stats.castka_blizi_se) > 0 && (
            <span style={{ color: '#b45309' }}>
              K úhradě (30d): <strong>{formatCurrency(stats.castka_blizi_se)}</strong>
            </span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState>Žádné poplatky k řešení</EmptyState>
      ) : items.map(item => {
        const dniDo = parseInt(item.dni_do_splatnosti, 10);
        const isOverdue = item.typ === 'PO_SPLATNOSTI';
        const splatnostDate = item.datum_splatnosti ? new Date(item.datum_splatnosti).toLocaleDateString('cs-CZ') : '';

        return (
          <ListItem key={`${item.id}-${item.polozka_id}`} onClick={() => navigate('/annual-fees', { state: { returnTo: '/dashboard', highlightId: item.id, filterStav: isOverdue ? '_PO_SPLATNOSTI' : '_BLIZI_SE_SPLATNOST' } })}>
            <ListItemLeft>
              <ListItemTitle>{item.nazev || item.druh || `Poplatek #${item.id}`}</ListItemTitle>
              <ListItemSub>
                {item.dodavatel_nazev || ''}{item.dodavatel_nazev ? ' · ' : ''}
                Rok {item.rok} · Spl. {splatnostDate}
              </ListItemSub>
            </ListItemLeft>
            <ListItemRight style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end' }}>
              <Amount $color={isOverdue ? '#dc2626' : '#b45309'}>{formatCurrency(item.polozka_castka)}</Amount>
              <CriticalTag $type={isOverdue ? 'UKONCENA' : 'BRZY_KONCI'}>
                {isOverdue ? `${Math.abs(dniDo)} dní po spl.` : (dniDo === 0 ? 'Dnes' : `za ${dniDo} dní`)}
              </CriticalTag>
            </ListItemRight>
          </ListItem>
        );
      })}
    </WidgetBody>
  );
}

// ============================================================================
// CONFIG MODAL
// ============================================================================

function DashboardConfigModal({ tiles, visibleTiles, onToggle, onReorder, onClose, availableWidgets, quickTilesConfig, onQuickTilesChange }) {
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);

  const filteredTiles = tiles.filter(t => WIDGET_REGISTRY[t] && availableWidgets.includes(t));

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    // Reorder: move item from dragIdx to dropIdx
    const newOrder = [...filteredTiles];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    onReorder(newOrder);
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <ConfigOverlay>
      <ConfigPanel onClick={e => e.stopPropagation()}>
        <ConfigHeader>
          <ConfigTitle>
            <FontAwesomeIcon icon={faCog} /> Konfigurace domovské stránky
          </ConfigTitle>
          <ConfigCloseBtn onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </ConfigCloseBtn>
        </ConfigHeader>
        <ConfigBody>
          {/* Toggle posuvníky v řádku */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', padding: '0.25rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ToggleSwitch>
                <input type="checkbox" checked={quickTilesConfig?.showStatusTiles !== false} onChange={() => onQuickTilesChange('showStatusTiles')} />
                <span />
              </ToggleSwitch>
              <span style={{ fontSize: '0.8rem', color: '#334155', whiteSpace: 'nowrap' }}>Stavy objednávek</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ToggleSwitch>
                <input type="checkbox" checked={quickTilesConfig?.showModuleShortcuts !== false} onChange={() => onQuickTilesChange('showModuleShortcuts')} />
                <span />
              </ToggleSwitch>
              <span style={{ fontSize: '0.8rem', color: '#334155', whiteSpace: 'nowrap' }}>Moduly</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ToggleSwitch>
                <input type="checkbox" checked={quickTilesConfig?.showNotifications !== false} onChange={() => onQuickTilesChange('showNotifications')} />
                <span />
              </ToggleSwitch>
              <span style={{ fontSize: '0.8rem', color: '#334155', whiteSpace: 'nowrap' }}>Notifikace</span>
            </div>
          </div>
          {/* Dělicí linka přes celou šířku */}
          <div style={{ gridColumn: '1 / -1', height: '1px', background: '#cbd5e1', margin: '0.25rem 0 0.5rem' }} />
          {/* Přehled karet */}
          {filteredTiles.map((tileId, idx) => {
            const w = WIDGET_REGISTRY[tileId];
            const isVisible = visibleTiles.includes(tileId);
            const isDragging = dragIdx === idx;
            const isOver = overIdx === idx && dragIdx !== idx;
            return (
              <ConfigItem
                key={tileId}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  opacity: isDragging ? 0.4 : 1,
                  borderTop: isOver ? '2px solid #3b82f6' : undefined,
                  background: isOver ? '#eff6ff' : undefined
                }}
              >
                <ConfigItemIcon>
                  <FontAwesomeIcon icon={faGripVertical} />
                </ConfigItemIcon>
                <ConfigItemInfo>
                  <FontAwesomeIcon icon={w.icon} style={{ color: w.color, fontSize: '0.85rem' }} />
                  <ConfigItemTitle>{w.title}</ConfigItemTitle>
                </ConfigItemInfo>
                <ToggleSwitch>
                  <input type="checkbox" checked={isVisible} onChange={() => onToggle(tileId)} />
                  <span />
                </ToggleSwitch>
              </ConfigItem>
            );
          })}
        </ConfigBody>
      </ConfigPanel>
    </ConfigOverlay>
  );
}

// ============================================================================
// FOCUS ALERTS BANNER
// ============================================================================

const FOCUS_ICON_MAP = {
  'hourglass-half': faHourglassHalf,
  'gavel': faGavel,
  'file-invoice': faFileInvoice,
  'exclamation-triangle': faExclamationTriangle,
  'chart-line': faChartLine,
  'coins': faCoins,
  'calendar-check': faCalendarCheck,
};

function FocusAlertsBanner({ items, navigate: nav, lastRefreshed, isFlashing }) {
  const scrollRef = React.useRef(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  const checkScrollable = React.useCallback(() => {
    if (scrollRef.current) {
      setIsScrollable(scrollRef.current.scrollWidth > scrollRef.current.clientWidth + 5);
    }
  }, []);

  React.useEffect(() => {
    checkScrollable();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(checkScrollable);
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkScrollable, items]);

  const hasItems = items && items.length > 0;
  if (!hasItems && !lastRefreshed) return null;

  const scrollBy = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
    }
  };

  if (!hasItems) {
    // Žádné alerty - zobrazit pozitivní zprávu
    return (
      <FocusBannerWrap>
        <FocusBannerHeader>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
            <FontAwesomeIcon icon={faBullhorn} />
            Na co se zaměřit
          </span>
          {lastRefreshed && (
            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#92400e', opacity: 0.75, whiteSpace: 'nowrap',
              animation: isFlashing ? `${refreshFlashAnim.name} 1.5s ease-out` : 'none' }}
              title="Datum a čas posledního načtení dat dashboardu">
              Aktualizováno: {lastRefreshed.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </FocusBannerHeader>
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#16a34a', fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '1.3rem' }} />
          <span>Vše je v pořádku, žádné nevyřízené úkoly nevyžadují vaši pozornost.</span>
        </div>
      </FocusBannerWrap>
    );
  }

  return (
    <FocusBannerWrap>
      <FocusBannerHeader>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
          <FontAwesomeIcon icon={faBullhorn} />
          Na co se zaměřit
        </span>
        {lastRefreshed && (
          <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#92400e', opacity: 0.75, whiteSpace: 'nowrap',
            animation: isFlashing ? `${refreshFlashAnim.name} 1.5s ease-out` : 'none' }}
            title="Datum a čas posledního načtení dat dashboardu">
            Aktualizováno: {lastRefreshed.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </FocusBannerHeader>
      <FocusBannerBodyWrap>
        <FocusBannerScrollBtnLeft $scrollable={isScrollable} onClick={() => scrollBy('left')} title="Posunout vlevo">
          <span>&#8249;</span>
        </FocusBannerScrollBtnLeft>
        <FocusBannerBody ref={scrollRef}>
          {items.map((item, idx) => (
            <FocusCard
              key={idx}
              $severity={item.severity}
              onClick={() => {
                if (!item.link) return;
                const state = {};
                if (item.linkTab) state.tab = item.linkTab;
                if (item.linkFilterStav) state.filterStav = item.linkFilterStav;
                nav(item.link, Object.keys(state).length > 0 ? { state } : undefined);
              }}
            >
              <FocusIcon $severity={item.severity}>
                <FontAwesomeIcon icon={FOCUS_ICON_MAP[item.icon] || faExclamationCircle} />
              </FocusIcon>
              <FocusText>{item.text}</FocusText>
              <FocusCount $severity={item.severity}>{item.count}</FocusCount>
            </FocusCard>
          ))}
        </FocusBannerBody>
        <FocusBannerScrollBtnRight $scrollable={isScrollable} onClick={() => scrollBy('right')} title="Posunout vpravo">
          <span>&#8250;</span>
        </FocusBannerScrollBtnRight>
      </FocusBannerBodyWrap>
    </FocusBannerWrap>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { token, user, userDetail, hasPermission, hasAdminRole, userPermissions, loading: authLoading } = useContext(AuthContext);
  const bgTasksContext = useBackgroundTasks();
  const navigate = useNavigate();


  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [quickMessageUser, setQuickMessageUser] = useState(null);
  const [visibleTiles, setVisibleTiles] = useState(DEFAULT_TILES);
  const [allTiles, setAllTiles] = useState(DEFAULT_TILES);
  const [quickTilesConfig, setQuickTilesConfig] = useState({
    showStatusTiles: true,
    showModuleShortcuts: true,
    showNotifications: true,
  });
  const [cashbookMonth, setCashbookMonth] = useState(new Date().getMonth() + 1);
  const [cashbookData, setCashbookData] = useState(null);
  const [cashbookLoading, setCashbookLoading] = useState(false);
  const [activeUsersData, setActiveUsersData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    try { return localStorage.getItem('dashboard_active_users_period') || '5min'; } catch { return '5min'; }
  });
  const activeUsersRef = useRef(null);
  const widgetRefs = useRef({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_auto_refresh');
      return saved === 'true';
    } catch { return false; }
  });
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshFlash, setRefreshFlash] = useState(false);
  const [chartTimelineDays, setChartTimelineDays] = useState(() => {
    try { return parseInt(localStorage.getItem('dashboard_chart_days') || '30', 10); } catch { return 30; }
  });
  const [chartTimelineData, setChartTimelineData] = useState(null);
  const [chartTimelineGroupBy, setChartTimelineGroupBy] = useState('day');
  const [chartTimelineLoading, setChartTimelineLoading] = useState(false);

  // RSS Feed state
  const [rssItems, setRssItems] = useState([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssError, setRssError] = useState(false);
  const [rssEnabled, setRssEnabled] = useState(false);
  const [rssFeedStatuses, setRssFeedStatuses] = useState([]);
  const [rssMaxItems, setRssMaxItems] = useState(15);

  // Počasí state
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const weatherRefreshRef = useRef(null);
  const weatherCancelledRef = useRef(false);

  // Planning events state (přijímá data z CalendarWidget)
  const [myPlanningEvents, setMyPlanningEvents] = useState([]);
  
  // URL parametry pro automatické otevření události
  const [urlEventId, setUrlEventId] = useState(null);
  const [urlOpenPanel, setUrlOpenPanel] = useState(false);
  const [calendarWidgetApi, setCalendarWidgetApi] = useState(null);

  // Finanční trhy state
  const [financeData, setFinanceData] = useState(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState(false);
  const financeRefreshRef = useRef(null);
  const financeCancelledRef = useRef(false);

  // Zastupování state (pro Calendar + Welcome widget)
  const [mySubstitutions, setMySubstitutions] = useState([]); // kde jsem zastupovaný
  const [substituting, setSubstituting] = useState([]); // koho zastupuji já

  // Widget header extras (pro předávání tlačítek z widgetů do headerů)
  const [widgetHeaderExtras, setWidgetHeaderExtras] = useState({});

  // Fullscreen graf
  const [fullscreenChart, setFullscreenChart] = useState(null);
  useEffect(() => {
    if (!fullscreenChart) return;
    const onKey = (e) => { if (e.key === 'Escape') setFullscreenChart(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreenChart]);

  // External always-on-top windows pro statistiky - používají globální store
  const [externalOrderStatsWindow, setExternalOrderStatsWindow] = useState(null);
  const [externalInvoiceStatsWindow, setExternalInvoiceStatsWindow] = useState(null);
  const [externalWeatherWindow, setExternalWeatherWindow] = useState(null);
  const [externalFinanceWindow, setExternalFinanceWindow] = useState(null);

  // Automatická aktualizace dat v externích oknech při změnách
  useEffect(() => {
    if (externalWindowsStore.orders.window && !externalWindowsStore.orders.window.closed && data?.orders_stats) {
      renderExternalStatsContent('orders', data.orders_stats);
    }
  }, [data?.orders_stats]);

  useEffect(() => {
    if (externalWindowsStore.invoices.window && !externalWindowsStore.invoices.window.closed && data?.invoices_stats) {
      renderExternalStatsContent('invoices', data.invoices_stats);
    }
  }, [data?.invoices_stats]);
  
  useEffect(() => {
    if (externalWindowsStore.weather.window && !externalWindowsStore.weather.window.closed && weatherData) {
      renderExternalStatsContent('weather', weatherData);
    }
  }, [weatherData]);
  
  useEffect(() => {
    if (externalWindowsStore.finance.window && !externalWindowsStore.finance.window.closed && financeData) {
      renderExternalStatsContent('finance', financeData);
    }
  }, [financeData]);

  const openExternalWindow = async (type) => {
    const store = externalWindowsStore[type];
    
    // Pokud už okno existuje, jen ho zaměříme
    if (store.window && !store.window.closed) {
      store.window.focus();
      console.log(`✨ Externí okno ${type} je již otevřené - zaměřuji`);
      return;
    }

    // Vytvoř nové okno
    let initialData;
    if (type === 'orders') {
      initialData = data?.orders_stats;
    } else if (type === 'invoices') {
      initialData = data?.invoices_stats;
    } else if (type === 'weather') {
      initialData = weatherData;
    } else if (type === 'finance') {
      initialData = financeData;
    }
    
    const win = await createExternalStatsWindow(type, initialData, () => {
      if (type === 'orders') {
        setExternalOrderStatsWindow(null);
      } else if (type === 'invoices') {
        setExternalInvoiceStatsWindow(null);
      } else if (type === 'weather') {
        setExternalWeatherWindow(null);
      } else if (type === 'finance') {
        setExternalFinanceWindow(null);
      }
    });

    if (win) {
      if (type === 'orders') {
        setExternalOrderStatsWindow(win);
      } else if (type === 'invoices') {
        setExternalInvoiceStatsWindow(win);
      } else if (type === 'weather') {
        setExternalWeatherWindow(win);
      } else if (type === 'finance') {
        setExternalFinanceWindow(win);
      }
    }
  };

  const closeExternalWindow = (type) => {
    const store = externalWindowsStore[type];
    if (store.window && !store.window.closed) {
      store.window.close();
    }
    if (type === 'orders') {
      setExternalOrderStatsWindow(null);
    } else if (type === 'invoices') {
      setExternalInvoiceStatsWindow(null);
    } else if (type === 'weather') {
      setExternalWeatherWindow(null);
    } else if (type === 'finance') {
      setExternalFinanceWindow(null);
    }
  };

  const username = user?.username;
  
  // 🆕 Zpracování URL parametrů pro automatické otevření události z emailu
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    const openPanel = params.get('openPanel');

    if (eventId && openPanel === 'true') {
      setUrlEventId(parseInt(eventId));
      setUrlOpenPanel(true);
      
      // Vyčistit URL parametry po 2s (aby měl CalendarWidget čas je zpracovat)
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 2000);
    }
  }, []); // Pouze při mount

  // SUPERADMIN check
  const isSuperAdmin = useMemo(() => {
    return (userDetail?.roles || []).some(r => r.kod_role === 'SUPERADMIN');
  }, [userDetail]);

  // Auto-refresh aktivních uživatelů každých 30s (SUPERADMIN nebo DASHBOARD_ACTIVE_USERS) – jen pro quick-tile badge count
  useEffect(() => {
    const hasAccess = isSuperAdmin || (hasPermission && hasPermission('DASHBOARD_ACTIVE_USERS'));
    if (!hasAccess || !token || !username) return;
    const fetchActive = async () => {
      const d = await getActiveUsersAdmin({ token, username, period: '5min' });
      if (d) setActiveUsersData(d);
    };
    fetchActive();
    const iv = setInterval(fetchActive, 30000);
    return () => clearInterval(iv);
  }, [isSuperAdmin, hasPermission, token, username]);

  // Fetch zastupování dat pro Calendar + Welcome widget + planning události pro Můj přehled
  useEffect(() => {
    if (!token || !username) return;
    let cancelled = false;
    Promise.all([
      fetchMySubstitutions({ token, username }).catch(() => []),
      fetchCurrentlySubstituting({ token, username }).catch(() => []),
      planningApi.getCalendarEvents({ 
        year: new Date().getFullYear(), 
        month: new Date().getMonth() + 1 
      }).catch(() => ({ data: [] })),
    ]).then(([my, cur, eventsResponse]) => {
      if (!cancelled) {
        setMySubstitutions(my || []);
        setSubstituting(cur || []);
        
        // Filtrovat planning události pro "Můj přehled"
        const events = eventsResponse?.data || [];
        const now = new Date();
        
        const myEvents = events.filter(event => {
          // Pouze aktivní události
          if (!event.aktivni || event.aktivni === 0) {
            return false;
          }
          
          // Má alespoň jeden termín v budoucnosti
          const hasFutureTerm = event.terminy?.some(term => {
            const termDate = term.dt_do ? new Date(term.dt_do) : (term.dt_od ? new Date(term.dt_od) : null);
            return termDate && termDate > now;
          });
          if (!hasFutureTerm) {
            return false;
          }
          
          // Uživatel je v příjemcích
          const isPrijemce = event.prijemci?.some(p => p.username === username);
          if (!isPrijemce) {
            return false;
          }
          
          // Ještě nemá odpověď nebo má odpověď 'null'
          const hasResponse = event.terminy?.some(term => {
            const response = term.responses?.find(r => r.username === username);
            return response && response.odpoved && response.odpoved !== 'null';
          });
          
          if (hasResponse) {
            return false;
          }

          return true;
        });
        
        setMyPlanningEvents(myEvents);
      }
    });
    return () => { cancelled = true; };
  }, [token, username]);

  const alertsWithPlanning = useMemo(() => {
    const baseAlerts = Array.isArray(data?.alerts) ? data.alerts : [];

    const unreadSource = Array.isArray(data?.notifications_unread)
      ? data.notifications_unread
      : (Array.isArray(data?.notifications_recent) ? data.notifications_recent.filter(n => !n.precteno || n.precteno === '0' || n.precteno === 0) : []);

    const planningUnread = unreadSource.filter(n =>
      n?.kategorie === 'planning'
      || n?.objekt_typ === 'planning_event'
      || n?.objekt_typ === 'planning_message'
      || n?.objekt_typ === 'planning_event_response'
      || n?.objekt_typ === 'planning_message_response'
      || n?.typ === 'PLANNING_EVENT_CREATED'
      || n?.typ === 'PLANNING_MESSAGE_CREATED'
      || n?.typ === 'PLANNING_EVENT_RESPONSE'
      || n?.typ === 'PLANNING_MESSAGE_RESPONSE'
    );

    if (planningUnread.length === 0) return baseAlerts;

    const sortedPlanning = [...planningUnread].sort((a, b) => {
      const aTime = a?.dt_created ? new Date(a.dt_created).getTime() : 0;
      const bTime = b?.dt_created ? new Date(b.dt_created).getTime() : 0;
      return bTime - aTime;
    });

    const parsePlanningPayload = (notification) => {
      if (notification?.data && typeof notification.data === 'object') {
        return notification.data;
      }
      if (typeof notification?.data === 'string') {
        try { return JSON.parse(notification.data); } catch (_) {}
      }
      if (notification?.data_json && typeof notification.data_json === 'object') {
        return notification.data_json;
      }
      if (typeof notification?.data_json === 'string') {
        try { return JSON.parse(notification.data_json); } catch (_) {}
      }
      if (notification?.placeholder_data && typeof notification.placeholder_data === 'object') {
        return notification.placeholder_data;
      }
      if (typeof notification?.placeholder_data === 'string') {
        try { return JSON.parse(notification.placeholder_data); } catch (_) {}
      }
      return {};
    };

    const now = new Date();

    const planningAlerts = sortedPlanning.map(notification => {
      const payload = parsePlanningPayload(notification);
      const eventId = Number(
        notification?.objekt_id
        || payload?.objekt_id
        || payload?.event_id
        || payload?.id
        || 0
      ) || null;

      const matchedPlanningEvent = eventId && Array.isArray(myPlanningEvents)
        ? myPlanningEvents.find(ev => Number(ev.id) === eventId)
        : null;

      const validTermsFromEvent = matchedPlanningEvent
        ? (Array.isArray(matchedPlanningEvent.terminy)
          ? matchedPlanningEvent.terminy.filter(term => {
              const termDate = term?.dt_do ? new Date(term.dt_do) : (term?.dt_od ? new Date(term.dt_od) : null);
              return termDate && termDate > now;
            }).length
          : 0)
        : 0;

      const termsFromNotificationData = Array.isArray(payload?.terminy)
        ? payload.terminy.length
        : Number(payload?.terminy_count || payload?.terms_count || 0);

      const validTermsCount = Math.max(1, validTermsFromEvent || termsFromNotificationData || 1);

      const title =
        notification?.nadpis
        || payload?.nazev
        || payload?.event_name
        || payload?.title
        || 'Událost';

      const organizer =
        notification?.from_user_name
        || payload?.organizator?.full_name
        || payload?.placeholders?.organizer_name
        || payload?.organizer_name
        || 'Neuveden';

      const sentAt = notification?.dt_created
        ? new Date(notification.dt_created).toLocaleString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : null;

      return {
        title: `Plánovaná událost: ${title}`,
        message: `Platné termíny: ${validTermsCount}`,
        meta: `Organizátor: ${organizer}${sentAt ? ` • Notifikace odeslána: ${sentAt}` : ''}`,
        type: 'planning',
        icon: 'calendar-alt',
        count: validTermsCount,
        link: '/notifications'
      };
    });

    return [...planningAlerts, ...baseAlerts];
  }, [data?.alerts, data?.notifications_unread, data?.notifications_recent, myPlanningEvents]);

  const openPlanningEventFromOverview = useCallback((eventId) => {
    if (!eventId) return;

    // Pokud uživatel otevře událost z "Můj přehled", označíme navázané
    // planning notifikace pro tuto událost jako přečtené.
    (async () => {
      try {
        const unreadSource = Array.isArray(data?.notifications_unread)
          ? data.notifications_unread
          : (Array.isArray(data?.notifications_recent)
            ? data.notifications_recent.filter(n => !n.precteno || n.precteno === '0' || n.precteno === 0)
            : []);

        const relatedIds = Array.from(new Set(
          unreadSource
            .filter(n => (
              (n?.kategorie === 'planning'
                || n?.objekt_typ === 'planning_event'
                || n?.objekt_typ === 'planning_message'
                || n?.objekt_typ === 'planning_event_response'
                || n?.objekt_typ === 'planning_message_response'
                || n?.typ === 'PLANNING_EVENT_CREATED'
                || n?.typ === 'PLANNING_MESSAGE_CREATED'
                || n?.typ === 'PLANNING_EVENT_RESPONSE'
                || n?.typ === 'PLANNING_MESSAGE_RESPONSE')
              && Number(n?.objekt_id) === Number(eventId)
            ))
            .map(n => Number(n?.id))
            .filter(Boolean)
        ));

        if (relatedIds.length === 0) {
          return;
        }

        await Promise.all(relatedIds.map(id => markNotificationAsRead(id).catch(() => null)));

        // Optimistická synchronizace lokálního dashboard stavu.
        setData(prev => {
          if (!prev) return prev;

          const markList = (list) => Array.isArray(list)
            ? list.map(n => relatedIds.includes(Number(n?.id)) ? { ...n, precteno: 1 } : n)
            : list;

          const unread = Array.isArray(prev.notifications_unread)
            ? prev.notifications_unread.filter(n => !relatedIds.includes(Number(n?.id)))
            : prev.notifications_unread;

          return {
            ...prev,
            notifications_recent: markList(prev.notifications_recent),
            notifications_unread: unread
          };
        });

        // Do-refreshovat z backendu, aby byl dashboard konzistentní se zvonečkem.
        if (token && username) {
          const refreshed = await getDashboardData({ token, username, days: 7 });
          if (refreshed?.status === 'success' && refreshed?.data) {
            setData(refreshed.data);
          }
        }
      } catch (err) {
        console.warn('[Dashboard] Nepodařilo se označit planning notifikaci jako přečtenou:', err);
      }
    })();

    // Vynutí re-open i při opakovaném kliku na stejnou událost.
    setUrlOpenPanel(false);
    setUrlEventId(null);

    setTimeout(() => {
      setUrlEventId(Number(eventId));
      setUrlOpenPanel(true);
    }, 0);
  }, [data, token, username]);

  // RSS Feed: načtení po přihlášení + auto-refresh dle intervalu z app settings
  const rssRefreshRef = useRef(null);
  const rssCancelledRef = useRef(false);

  const fetchRss = useCallback(async (isBackgroundRefresh = false) => {
    if (!token || !username) return;
    
    const RSS_CACHE_KEY = `rss_feed_${user?.id || 'default'}`;
    const RSS_CACHE_EXPIRY = 15 * 60 * 1000; // 15 minut
    
    // Načíst z cache při prvním načtení (ne při background refresh)
    if (!isBackgroundRefresh) {
      try {
        const cachedStr = localStorage.getItem(RSS_CACHE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && cached.data && Date.now() - (cached.timestamp || 0) < RSS_CACHE_EXPIRY) {
            setRssItems(cached.data || []);
            setRssFeedStatuses(cached.feed_statuses || []);
            setRssEnabled(cached.rss_enabled !== false);
            if (cached.max_items) setRssMaxItems(cached.max_items);
            setRssError(false);
            // Načteno z cache, refresh na pozadí
            setTimeout(() => fetchRss(true), 100);
            return;
          }
        }
      } catch (e) {
        console.warn('RSS cache read error:', e);
      }
    }
    
    if (!isBackgroundRefresh) setRssLoading(true);
    try {
      const result = await getRssFeed({ token, username, max_items: rssMaxItems });
      if (rssCancelledRef.current) return;
      if (result.status === 'success') {
        const items = result.data || [];
        const feedStatuses = result.feed_statuses || [];
        const enabled = result.rss_enabled !== false;
        const maxItems = result.max_items || rssMaxItems;
        
        setRssItems(items);
        setRssEnabled(enabled);
        setRssError(false);
        setRssFeedStatuses(feedStatuses);
        setRssMaxItems(maxItems);
        
        // Uložit do cache (localStorage per-user)
        try {
          localStorage.setItem(RSS_CACHE_KEY, JSON.stringify({
            data: items,
            feed_statuses: feedStatuses,
            rss_enabled: enabled,
            max_items: maxItems,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('RSS cache write error:', e);
        }

        // Nastavit auto-refresh interval z backendu (minuty → ms)
        const intervalMin = result.refresh_interval || 15;
        if (rssRefreshRef.current) clearInterval(rssRefreshRef.current);
        rssRefreshRef.current = setInterval(() => {
          if (!rssCancelledRef.current) fetchRss(true);
        }, intervalMin * 60 * 1000);
      } else {
        setRssEnabled(result.rss_enabled === true);
        setRssItems([]);
      }
    } catch (err) {
      console.error('RSS fetch error:', err);
      if (!rssCancelledRef.current) { setRssError(true); setRssItems([]); }
    } finally {
      if (!rssCancelledRef.current) setRssLoading(false);
    }
  }, [token, username, user?.id, rssMaxItems]);

  useEffect(() => {
    rssCancelledRef.current = false;
    fetchRss();
    return () => {
      rssCancelledRef.current = true;
      if (rssRefreshRef.current) clearInterval(rssRefreshRef.current);
    };
  }, [fetchRss]);

  // ─── Počasí: fetch + 60min auto-refresh ───────────────────────────────────
  const fetchWeather = useCallback(async (isBackground = false) => {
    const WEATHER_CACHE_KEY = `weather_data_${user?.id || 'default'}`;
    const WEATHER_EXPIRY = 60 * 60 * 1000; // 60 minut

    // Zkus cache při prvním načtení
    if (!isBackground) {
      try {
        const cached = localStorage.getItem(WEATHER_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.data && Date.now() - (parsed.timestamp || 0) < WEATHER_EXPIRY) {
            setWeatherData(parsed.data);
            setWeatherError(false);
            // Refresh na pozadí
            setTimeout(() => { if (!weatherCancelledRef.current) fetchWeather(true); }, 200);
            return;
          }
        }
      } catch (e) { /* ignore */ }
    }

    if (!isBackground) setWeatherLoading(true);
    try {
      // Pevné koordináty – Středočeský kraj (Kladno)
      const LAT = 50.1479;
      const LON = 14.1095;

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,is_day,wind_gusts_10m,surface_pressure,precipitation` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
        `&timezone=Europe%2FPrague&wind_speed_unit=kmh`
      ).then(r => r.json());

      if (weatherCancelledRef.current) return;

      const cur = weatherRes?.current;
      if (!cur) throw new Error('Žádná data z open-meteo');

      // 7-denní předpověď
      const daily = weatherRes?.daily;
      const forecast = [];
      if (daily?.time) {
        for (let i = 0; i < daily.time.length && i < 7; i++) {
          forecast.push({
            date: daily.time[i],
            temp_max: Math.round(daily.temperature_2m_max[i]),
            temp_min: Math.round(daily.temperature_2m_min[i]),
            weather_code: daily.weather_code[i],
          });
        }
      }

      const result = {
        temp: cur.temperature_2m,
        apparent_temp: cur.apparent_temperature,
        humidity: cur.relative_humidity_2m,
        wind_speed: Math.round(cur.wind_speed_10m * 10) / 10,
        wind_gusts: cur.wind_gusts_10m != null ? Math.round(cur.wind_gusts_10m * 10) / 10 : null,
        pressure: cur.surface_pressure != null ? Math.round(cur.surface_pressure) : null,
        precipitation: cur.precipitation != null ? cur.precipitation : null,
        weather_code: cur.weather_code,
        is_day: cur.is_day,
        city: 'Středočeský kraj',
        country: 'CZ',
        updated_at: new Date().toISOString(),
        forecast,
      };

      setWeatherData(result);
      setWeatherError(false);

      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
      } catch (e) { /* ignore */ }

      // Nastavit 60min auto-refresh
      if (weatherRefreshRef.current) clearInterval(weatherRefreshRef.current);
      weatherRefreshRef.current = setInterval(() => {
        if (!weatherCancelledRef.current) fetchWeather(true);
      }, WEATHER_EXPIRY);

    } catch (err) {
      if (!weatherCancelledRef.current) setWeatherError(true);
    } finally {
      if (!weatherCancelledRef.current) setWeatherLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    weatherCancelledRef.current = false;
    fetchWeather();
    return () => {
      weatherCancelledRef.current = true;
      if (weatherRefreshRef.current) clearInterval(weatherRefreshRef.current);
    };
  }, [fetchWeather]);

  // ─── Finanční trhy: fetch přes backend proxy + 30min auto-refresh ───────
  const fetchFinance = useCallback(async (isBackground = false) => {
    if (!token || !username) return;

    // Načíst uživatelský config z localStorage
    const cfgKey = `finance_config_${user?.id || 'default'}`;
    let userConfig = {};
    try { userConfig = JSON.parse(localStorage.getItem(cfgKey)) || {}; } catch (e) { /* ignore */ }

    const FINANCE_CACHE_KEY = `finance_data_${user?.id || 'default'}_${JSON.stringify(userConfig)}`;
    const FINANCE_EXPIRY = 15 * 60 * 1000; // 15 minut

    // Cache při prvním načtení
    if (!isBackground) {
      try {
        const cached = localStorage.getItem(FINANCE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.data && Date.now() - (parsed.timestamp || 0) < FINANCE_EXPIRY) {
            setFinanceData(parsed.data);
            setFinanceError(false);
            setTimeout(() => { if (!financeCancelledRef.current) fetchFinance(true); }, 300);
            return;
          }
        }
      } catch (e) { /* ignore */ }
    }

    if (!isBackground) setFinanceLoading(true);
    try {
      const res = await getFinanceMarkets({
        token, username,
        stock_tickers: userConfig.stock_tickers,
        crypto_ids: userConfig.crypto_ids,
        fx_pairs: userConfig.fx_pairs
      });
      if (financeCancelledRef.current) return;

      if (res.status === 'success' && res.data) {
        setFinanceData(res.data);
        setFinanceError(false);

        try {
          localStorage.setItem(FINANCE_CACHE_KEY, JSON.stringify({ data: res.data, timestamp: Date.now() }));
        } catch (e) { /* ignore */ }

        // Auto-refresh 15 minut
        if (financeRefreshRef.current) clearInterval(financeRefreshRef.current);
        financeRefreshRef.current = setInterval(() => {
          if (!financeCancelledRef.current) fetchFinance(true);
        }, FINANCE_EXPIRY);
      } else {
        throw new Error('Backend vrátil chybu');
      }
    } catch (err) {
      console.warn('Finance fetch error:', err);
      if (!financeCancelledRef.current) setFinanceError(true);
    } finally {
      if (!financeCancelledRef.current) setFinanceLoading(false);
    }
  }, [token, username, user?.id]);

  useEffect(() => {
    financeCancelledRef.current = false;
    fetchFinance();
    return () => {
      financeCancelledRef.current = true;
      if (financeRefreshRef.current) clearInterval(financeRefreshRef.current);
    };
  }, [fetchFinance]);

  // Determine available widgets based on DASHBOARD_* capabilities from API
  const availableWidgets = useMemo(() => {
    const isAdmin = hasAdminRole();
    const caps = data?.dashboard_capabilities || [];
    const superAdmin = (userDetail?.roles || []).some(r => r.kod_role === 'SUPERADMIN');

    return Object.entries(WIDGET_REGISTRY)
      .filter(([id, cfg]) => {
        // Widget pouze pro SUPERADMIN
        if (cfg.requiresSuperAdmin) return superAdmin;
        // Widgety bez 'requires' → viditelné vždy (welcome)
        if (!cfg.requires) return true;
        // RSS widget: kontrola permission + rss_enabled flag
        if (id === 'rss_news') return rssEnabled && (isAdmin || caps.includes(cfg.requires));
        // Admin vidí vše ostatní
        if (isAdmin) return true;
        // Kontrola DASHBOARD_* capability
        return caps.includes(cfg.requires);
      })
      .map(([id]) => id);
  }, [data?.dashboard_capabilities, hasAdminRole, userDetail, rssEnabled]);

  // Pomocná funkce: aplikuje uložený dashboard config (tiles + visible) s merge nových widgetů
  const applyDashboardConfig = useCallback((savedTiles, savedVisible) => {
    const newWidgets = DEFAULT_TILES.filter(t => !savedTiles.includes(t));
    if (newWidgets.length > 0) {
      const merged = [...savedTiles, ...newWidgets];
      const mergedVisible = [...savedVisible, ...newWidgets];
      setAllTiles(merged);
      setVisibleTiles(mergedVisible);
      return { tiles: merged, visible: mergedVisible };
    } else {
      setAllTiles(savedTiles);
      setVisibleTiles(savedVisible);
      return { tiles: savedTiles, visible: savedVisible };
    }
  }, []);

  // Load dashboard config: 1) rychlá cache z localStorage, 2) pak načti z DB a aktualizuj
  useEffect(() => {
    if (!user?.id || !token || !username) return;

    const lsKey = `dashboard_config_${user.id}`;

    // Krok 1: Okamžitě aplikuj localStorage cache (bez čekání na API)
    try {
      const savedConfig = localStorage.getItem(lsKey);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        applyDashboardConfig(parsed.tiles || [], parsed.visible || []);
        if (parsed.quickTilesConfig) {
          setQuickTilesConfig(prev => ({ ...prev, ...parsed.quickTilesConfig }));
        }
      }
    } catch (e) { /* ignore */ }

    // Krok 2: Načti z DB (server-side) a aktualizuj pokud se liší
    fetchUserSettings({ token, username, userId: user.id })
      .then(settings => {
        const dbConfig = settings?.dashboard_layout;
        if (dbConfig && dbConfig.tiles && dbConfig.visible) {
          const result = applyDashboardConfig(dbConfig.tiles, dbConfig.visible);
          // Aktualizuj localStorage cache z DB
          try {
            localStorage.setItem(lsKey, JSON.stringify({ ...result, quickTilesConfig: dbConfig.quickTilesConfig }));
          } catch (e) { /* ignore */ }
        }
        if (dbConfig?.quickTilesConfig) {
          setQuickTilesConfig(prev => ({ ...prev, ...dbConfig.quickTilesConfig }));
        }
      })
      .catch(() => { /* fallback na localStorage – ok */ });
  }, [user?.id, token, username, applyDashboardConfig]);

  // Save config: okamžitě do localStorage + async do DB
  const saveConfig = useCallback((tiles, visible, qtConfig) => {
    const lsKey = `dashboard_config_${user?.id || 'default'}`;
    const quickTilesCfg = qtConfig || quickTilesConfig;
    try {
      localStorage.setItem(lsKey, JSON.stringify({ tiles, visible, quickTilesConfig: quickTilesCfg }));
    } catch (e) { /* ignore */ }

    // Uložit do DB přes userSettings – načteme aktuální settings a patchneme dashboard_layout
    if (!token || !username || !user?.id) return;
    fetchUserSettings({ token, username, userId: user.id })
      .then(currentSettings => {
        const merged = { ...currentSettings, dashboard_layout: { tiles, visible, quickTilesConfig: quickTilesCfg } };
        return saveUserSettings({ token, username, userId: user.id, nastaveni: merged });
      })
      .catch(err => {
        console.error('[Dashboard] Chyba při ukládání layoutu do DB:', err);
      });
  }, [token, username, user?.id, quickTilesConfig]);

  // Fetch data (silent = tichý refresh bez loading spinneru / blikání)
  const fetchData = useCallback(async (silent = false) => {
    // 🔐 Wait for AuthContext to finish loading before fetching dashboard data
    if (authLoading) {
      console.log('🔐 DashboardPage: Waiting for AuthContext to finish loading...');
      return;
    }
    
    if (!token || !username) {
      console.warn('🔐 DashboardPage: Missing token or username', { token: !!token, username });
      return;
    }
    
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await getDashboardData({ token, username, days: 7 });
      
      if (result.status === 'success') {
        setData(result.data);
        setCashbookData(result.data?.cashbook_summary ?? null);
        setLastRefreshed(new Date());
        if (silent) {
          setRefreshFlash(true);
          setTimeout(() => setRefreshFlash(false), 1600);
        }
      } else {
        setError(result.message || 'Chyba při načítání dat');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Chyba při načítání dashboardu');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, username, authLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ Registrace dashboard refresh callbacku pro automatické obnovení při nových notifikacích
  useEffect(() => {
    if (bgTasksContext && fetchData) {
      bgTasksContext.registerDashboardRefreshCallback(() => {
        fetchData(true);  // Silent refresh (bez blikání)
      });
    }
    return () => {
      if (bgTasksContext) {
        bgTasksContext.registerDashboardRefreshCallback(null);
      }
    };
  }, [bgTasksContext, fetchData]);

  // Fetch only cashbook data (bez reloadu celého dashboardu)
  const fetchCashbook = useCallback(async () => {
    if (!token || !username) return;
    setCashbookLoading(true);
    try {
      const result = await getCashbookSummary({ token, username, cashbook_month: cashbookMonth });
      if (result.status === 'success') {
        setCashbookData(result.data ?? null);
      }
    } catch (err) {
      console.error('Chyba při načítání pokladny:', err);
    } finally {
      setCashbookLoading(false);
    }
  }, [token, username, cashbookMonth]);

  useEffect(() => {
    if (cashbookMonth && token && username) fetchCashbook();
  }, [cashbookMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh každých 5 minut (pokud je zapnutý) – tichý, bez blikání
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000); // 5 minut

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchData]);

  // 🔄 Listener pro refresh dashboard po změnách v objednávkách/fakturách (schválení, zrušení, editace)
  useEffect(() => {
    const handleStorageRefresh = (e) => {
      // Kontrola, jestli je to náš event
      if (e.key === 'dashboardRefreshTrigger') {
        console.log('🔄 Dashboard: Detekován refresh trigger z jiného modulu');
        fetchData(true); // Silent refresh
        // Vyčistit trigger po použití
        try {
          localStorage.removeItem('dashboardRefreshTrigger');
        } catch (err) {
          console.error('Chyba při odstranění trigger:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageRefresh);

    return () => {
      window.removeEventListener('storage', handleStorageRefresh);
    };
  }, [fetchData]);

  // 🪟 Vystavit fetchData pro externí okna (pokud potřebují manuální refresh)
  useEffect(() => {
    if (window.dashboardAPI) {
      window.dashboardAPI.refreshData = () => fetchData(true);
    } else {
      window.dashboardAPI = { refreshData: () => fetchData(true) };
    }
  }, [fetchData]);

  // Uložit stav auto-refresh do localStorage
  const handleToggleAutoRefresh = useCallback((e) => {
    const enabled = e.target.checked;
    setAutoRefreshEnabled(enabled);
    try {
      localStorage.setItem('dashboard_auto_refresh', enabled.toString());
    } catch { /* ignore */ }
  }, []);

  // Fetch chart timeline (separátní endpoint, tichý reload)
  const fetchChartTimeline = useCallback(async (days) => {
    if (!token || !username) return;
    setChartTimelineLoading(true);
    try {
      const result = await getDashboardChartTimeline({ token, username, chart_days: days });
      if (result.status === 'success') {
        setChartTimelineData(result.data);
        setChartTimelineGroupBy(result.group_by || 'day');
      }
    } catch (err) {
      console.error('Chyba při načítání grafu timeline:', err);
    } finally {
      setChartTimelineLoading(false);
    }
  }, [token, username]);

  // Reaguj na změnu periody grafu
  useEffect(() => {
    if (!token || !username) return;
    fetchChartTimeline(chartTimelineDays);
  }, [chartTimelineDays, fetchChartTimeline]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChartDaysChange = useCallback((days) => {
    setChartTimelineDays(days);
    try { localStorage.setItem('dashboard_chart_days', String(days)); } catch { /* ignore */ }
  }, []);

  const handleToggleTile = (tileId) => {
    setVisibleTiles(prev => {
      const next = prev.includes(tileId) ? prev.filter(t => t !== tileId) : [...prev, tileId];
      saveConfig(allTiles, next);
      return next;
    });
  };

  const handleQuickTilesChange = (key) => {
    setQuickTilesConfig(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveConfig(allTiles, visibleTiles, next);
      return next;
    });
  };

  const handleReorder = (newOrder) => {
    // Zachovat tiles, které nejsou v availableWidgets (neviditelné) na konci
    const remaining = allTiles.filter(t => !newOrder.includes(t));
    const merged = [...newOrder, ...remaining];
    setAllTiles(merged);
    saveConfig(merged, visibleTiles);
  };

  // 🎯 Get quick tiles based on user roles
  const getQuickTiles = useMemo(() => {
    if (!data?.orders_stats) return [];

    const roles = (userDetail?.roles || []).map(r => r?.kod_role).filter(Boolean);
    const stats = data.orders_stats;
    const isAdmin = hasAdminRole();
    const tiles = [];

    // Emoji ikony pro stavy
    const icons = {
      'rozpracovana': '📝',
      'ke_schvaleni': '📋',
      'schvalena': '✅',
      'vecna_spravnost': '🔍',
      'zkontrolovana': '✔️',
      'dokoncena': '🏁',
      'fakturace': '💰',
      'k_uverejneni_do_registru': '🌐',
      'odeslana': '📤'
    };

    // Helper: role check (podporuje THP_PES, PRIKAZCE_OPERACE atd.)
    const hasRole = (r) => roles.some(k => k && (k === r || k.startsWith(r + '_') || k.startsWith(r)));
    const hasAnyRole = (...rs) => rs.some(r => hasRole(r));

    // Admin vidí všechny
    if (isAdmin) {
      tiles.push(
        { label: 'Ke schválení', count: stats.ke_schvaleni || 0, filter: 'ke_schvaleni', icon: icons.ke_schvaleni },
        { label: 'Schválené', count: stats.schvalena || 0, filter: 'schvalena', icon: icons.schvalena },
        { label: 'Rozpracované', count: stats.rozpracovana || 0, filter: 'rozpracovana', icon: icons.rozpracovana },
        { label: 'Věcná správnost', count: stats.vecna_spravnost || 0, filter: 'vecna_spravnost', icon: icons.vecna_spravnost },
        { label: 'Zkontrolováno', count: stats.zkontrolovana || 0, filter: 'zkontrolovana', icon: icons.zkontrolovana },
        { label: 'Dokončeno', count: stats.dokoncena || 0, filter: 'dokoncena', icon: icons.dokoncena },
        { label: 'Fakturace', count: stats.fakturace || 0, filter: 'fakturace', icon: icons.fakturace },
        { label: 'Ke zveřejnění', count: stats.k_uverejneni_do_registru || 0, filter: 'k_uverejneni_do_registru', icon: icons.k_uverejneni_do_registru }
      );
      return tiles;
    }

    // == Běžný uživatel (THP, PES, VRCHNI, PRIMAR, VEDOUCI, REFERENT, ...) ==
    // Každý uživatel vidí minimálně: Ke schválení, Schválené, Rozpracované
    tiles.push(
      { label: 'Ke schválení', count: stats.ke_schvaleni || 0, filter: 'ke_schvaleni', icon: icons.ke_schvaleni },
      { label: 'Schválené', count: stats.schvalena || 0, filter: 'schvalena', icon: icons.schvalena },
      { label: 'Rozpracované', count: stats.rozpracovana || 0, filter: 'rozpracovana', icon: icons.rozpracovana }
    );

    // Příkazce/Náměstek/Primář/Ředitel/Vedoucí: + Zkontrolováno
    if (hasAnyRole('PRIKAZCE', 'NAMESTEK', 'PRIMAR', 'REDITEL', 'VEDOUCI')) {
      tiles.push(
        { label: 'Zkontrolováno', count: stats.zkontrolovana || 0, filter: 'zkontrolovana', icon: icons.zkontrolovana }
      );
    }

    // Vrchní/THP/PES: + Věcná správnost  
    if (hasAnyRole('THP', 'PES', 'VRCHNI', 'REFERENT')) {
      tiles.push(
        { label: 'Věcná správnost', count: stats.vecna_spravnost || 0, filter: 'vecna_spravnost', icon: icons.vecna_spravnost }
      );
    }

    // Správce rozpočtu/Rozpočtář: + Zkontrolováno, Dokončeno
    if (hasAnyRole('SPRAVCE_ROZPOCTU', 'ROZPOCTAR')) {
      tiles.push(
        { label: 'Zkontrolováno', count: stats.zkontrolovana || 0, filter: 'zkontrolovana', icon: icons.zkontrolovana },
        { label: 'Dokončeno', count: stats.dokoncena || 0, filter: 'dokoncena', icon: icons.dokoncena }
      );
    }

    // Hlavní účetní, účetní: + Fakturace, Ke zveřejnění
    if (hasAnyRole('HLAVNI_UCETNI', 'UCETNI')) {
      tiles.push(
        { label: 'Fakturace', count: stats.fakturace || 0, filter: 'fakturace', icon: icons.fakturace },
        { label: 'Ke zveřejnění', count: stats.k_uverejneni_do_registru || 0, filter: 'k_uverejneni_do_registru', icon: icons.k_uverejneni_do_registru }
      );
    }

    // Veřejné zakázky: + Ke zveřejnění
    if (hasAnyRole('VEREJNE_ZAKAZKY')) {
      tiles.push(
        { label: 'Ke zveřejnění', count: stats.k_uverejneni_do_registru || 0, filter: 'k_uverejneni_do_registru', icon: icons.k_uverejneni_do_registru }
      );
    }

    // Remove duplicates (pokud má uživatel více rolí)
    const seen = new Set();
    return tiles.filter(t => {
      if (seen.has(t.filter)) return false;
      seen.add(t.filter);
      return true;
    });
  }, [userDetail, data?.orders_stats, hasAdminRole]);

  // 🎯 MODULE SHORTCUT TILES — ikony odkazů na moduly (dle oprávnění)
  const getModuleShortcuts = useMemo(() => {
    if (!data) return [];
    const caps = data.dashboard_capabilities || [];
    const hasCap = (c) => caps.includes(c);
    const isAdmin = hasAdminRole();
    const shortcuts = [];

    // 1. Objednávky V3
    if (isAdmin || hasCap('DASHBOARD_ORDERS_STATS') || hasCap('DASHBOARD_MY_ORDERS')) {
      shortcuts.push({
        label: 'Objednávky V3',
        icon: faClipboardList,
        bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        route: '/orders25-list-v3',
        count: data.orders_stats?.total || 0,
        badgeColor: '#1e40af',
      });
    }

    // 2. Faktury
    if (isAdmin || hasCap('DASHBOARD_INVOICES_STATS') || hasCap('DASHBOARD_INVOICES_CONFIRM')) {
      shortcuts.push({
        label: 'Faktury',
        icon: faFileInvoiceDollar,
        bg: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        route: '/invoices25-list',
        count: data.invoices_stats?.total || 0,
        badgeColor: '#6d28d9',
      });
    }

    // 3. Roční poplatky
    if (isAdmin || hasCap('DASHBOARD_ANNUAL_FEES')) {
      shortcuts.push({
        label: 'Roční poplatky',
        icon: faReceipt,
        bg: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
        route: '/annual-fees',
        count: data.annual_fees_due?.stats?.celkem || 0,
        badgeColor: '#047857',
      });
    }

    // 4. Majetek
    if (isAdmin || hasCap('DASHBOARD_CHART_MAJETEK')) {
      const majetekTotal = (data.chart_majetek_by_druh || []).reduce((sum, d) => sum + (parseInt(d.pocet) || 0), 0);
      shortcuts.push({
        label: 'Majetek',
        icon: faCubes,
        bg: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)',
        route: '/majetek-overview',
        count: majetekTotal,
        badgeColor: '#4338ca',
      });
    }

    // 5. Objednávky před 2026
    shortcuts.push({
      label: 'Objednávky (< 2026)',
      icon: faHistory,
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      route: '/orders',
      count: '∞',
      badgeColor: '#b45309',
    });

    return shortcuts;
  }, [data, hasAdminRole]);

  // Render individual widget
  const renderWidget = (tileId, index) => {
    const cfg = WIDGET_REGISTRY[tileId];
    if (!cfg) return null;
    if (!availableWidgets.includes(tileId)) return null;
    // alwaysOn widgety (např. active_users_admin) ignorují visibleTiles
    if (!cfg.alwaysOn && !visibleTiles.includes(tileId)) {
      const isCalendarDeepLink = tileId === 'calendar' && Boolean(urlEventId && urlOpenPanel);
      if (!isCalendarDeepLink) return null;
    }

    const isSpan2 = tileId === 'orders_stats' || tileId === 'invoices_stats' || tileId === 'chart_timeline' || tileId === 'top_suppliers' || tileId === 'cashbook_summary' || tileId === 'rss_news' || tileId === 'chart_majetek' || tileId === 'chart_fees' || tileId === 'finance_markets';
    const isSpanFull = tileId === 'active_users_admin';

    let content = null;
    let badgeCount = null;
    let headerExtra = null;
    let titleOverride = null;

    switch (tileId) {
      case 'welcome':
        content = <WelcomeWidget user={data?.user} userDetail={userDetail} rolesDetected={data?.roles_detected} nameday={data?.nameday} newsSinceLogin={data?.news_since_login} myStats={data?.my_stats} navigate={navigate} substituting={substituting} mySubstitutions={mySubstitutions} myPlanningEvents={myPlanningEvents} onOpenPlanningEvent={openPlanningEventFromOverview} />;
        break;
      case 'orders_stats':
        content = <OrderStatsWidget stats={data?.orders_stats} navigate={navigate} />;
        headerExtra = (
          <button
            onClick={() => externalOrderStatsWindow ? closeExternalWindow('orders') : openExternalWindow('orders')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: externalOrderStatsWindow ? '#1d4ed8' : '#94a3b8',
              fontSize: '0.85rem',
              padding: '0.15rem 0.3rem',
              borderRadius: '4px',
              lineHeight: 1,
              transition: 'all 0.15s'
            }}
            title={externalOrderStatsWindow ? 'Zavřít externí okno' : 'Otevřít v externím okně (Always-on-Top)'}
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} />
          </button>
        );
        break;
      case 'my_orders':
        content = <MyOrdersWidget myOrdersData={data?.my_orders_pending} navigate={navigate} />;
        badgeCount = (data?.my_orders_pending?.objednatel?.length || 0)
                   + (data?.my_orders_pending?.garant?.length || 0)
                   + (data?.my_orders_pending?.prikazce?.length || 0)
                   + (data?.my_orders_pending?.usek?.length || 0);
        if (data?.my_orders_pending?.is_admin && (data?.my_orders_pending?.usek?.length || 0) > 0) {
          titleOverride = 'Moje objednávky / mého úseku';
        }
        break;
      case 'my_invoices':
        content = <InvoiceListWidget invoices={data?.my_invoices_pending} navigate={navigate} filterPreset="vecna_spravnost" />;
        badgeCount = data?.my_invoices_pending?.length;
        break;
      case 'orders_approval':
        content = <OrderListWidget orders={data?.orders_for_approval} navigate={navigate} filterPreset="ke_schvaleni" />;
        badgeCount = data?.orders_for_approval?.length;
        break;
      case 'invoices_overdue':
        content = <InvoiceOverdueWidget invoices={data?.invoices_overdue} navigate={navigate} filterPreset="overdue" />;
        badgeCount = data?.invoices_overdue?.length;
        break;
      case 'invoices_due_soon':
        content = <InvoiceListWidget invoices={data?.invoices_due_soon} navigate={navigate} filterPreset="within_due" />;
        badgeCount = data?.invoices_due_soon?.length;
        break;
      case 'orders_registry':
        content = <RegistryWidget ordersForRegistry={data?.orders_for_registry} navigate={navigate} />;
        badgeCount = data?.orders_for_registry?.length;
        break;
      case 'orders_published':
        content = <OrdersPublishedWidget publishedData={data?.orders_published_recent} navigate={navigate} />;
        badgeCount = data?.orders_published_recent?.items?.length;
        break;
      case 'alerts':
        content = <AlertsWidget alerts={alertsWithPlanning} navigate={navigate} />;
        badgeCount = alertsWithPlanning.length;
        break;
      case 'notifications':
        content = <NotificationsWidget notifications={data?.notifications_recent || data?.notifications_unread} navigate={navigate} />;
        badgeCount = data?.notifications_unread?.length;
        break;
      case 'chart_timeline':
        content = <ChartTimelineWidget data={chartTimelineData ?? data?.chart_orders_timeline} loading={chartTimelineLoading} groupBy={chartTimelineGroupBy} days={chartTimelineDays} />;
        headerExtra = (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {[7, 14, 30, 90, 365].map(d => {
              const LABELS = { 7: 'Týden', 14: '14 dní', 30: 'Měsíc', 90: 'Kvartal', 365: 'Rok' };
              return (
                <button
                  key={d}
                  onClick={() => handleChartDaysChange(d)}
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid',
                    cursor: 'pointer',
                    fontWeight: chartTimelineDays === d ? 700 : 400,
                    background: chartTimelineDays === d ? '#1d4ed8' : 'transparent',
                    color: chartTimelineDays === d ? '#fff' : '#1d4ed8',
                    borderColor: '#1d4ed8',
                    transition: 'all 0.15s'
                  }}
                >
                  {LABELS[d]}
                </button>
              );
            })}
            <button onClick={() => {
              const td = chartTimelineData ?? data?.chart_orders_timeline;
              if (!td || td.length === 0) return;
              const labels = td.map(x => { const dt = new Date(x.den + 'T00:00:00'); return chartTimelineGroupBy === 'month' ? dt.toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' }) : dt.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }); });
              const cd = { labels, datasets: [{ label: 'Počet objednávek', data: td.map(x => x.pocet), backgroundColor: 'rgba(29, 78, 216, 0.7)', borderRadius: 6, barPercentage: 0.7 }] };
              const o = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => { const c = parseFloat(td[ctx.dataIndex]?.castka) || 0; return [`${ctx.raw} obj.`, formatCurrency(c)]; } } }, datalabels: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { size: 14 } }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false }, ticks: { font: { size: 12 } } } } };
              setFullscreenChart({ title: `Objednávky v čase (${chartTimelineDays} dní)`, el: <Bar data={cd} options={o} /> });
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', padding: '0.15rem 0.3rem', borderRadius: '4px', lineHeight: 1, marginLeft: '0.25rem' }} title="Celá obrazovka (ESC = zavřít)">
              <FontAwesomeIcon icon={faExpand} />
            </button>
          </div>
        );
        break;
      case 'top_suppliers':
        content = <TopSuppliersWidget suppliers={data?.top_suppliers} />;
        headerExtra = (
          <button onClick={() => {
            const s = data?.top_suppliers;
            if (!s || s.length === 0) return;
            const cd = { labels: s.map(x => x.dodavatel_nazev?.substring(0, 25) || '?'), datasets: [{ data: s.map(x => parseFloat(x.celkova_castka) || 0), backgroundColor: CHART_COLORS.slice(0, s.length), borderWidth: 0 }] };
            const o = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 14, font: { size: 14 } } }, tooltip: { callbacks: { label: (ctx) => `${formatCurrency(ctx.raw)} (${ctx.label})` } }, datalabels: { display: false } } };
            setFullscreenChart({ title: 'Top dodavatelé', el: <Doughnut data={cd} options={o} /> });
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', padding: '0.15rem 0.3rem', borderRadius: '4px', lineHeight: 1 }} title="Celá obrazovka (ESC = zavřít)">
            <FontAwesomeIcon icon={faExpand} />
          </button>
        );
        break;
      case 'smlouvy_critical':
        content = <SmlouvyCriticalWidget smlouvy={data?.smlouvy_critical} navigate={navigate} />;
        badgeCount = data?.smlouvy_critical?.items?.length;
        break;
      case 'lp_critical':
        content = <LPCriticalWidget lpData={data?.lp_critical} navigate={navigate} />;
        badgeCount = data?.lp_critical?.items?.length;
        break;
      case 'order_comments':
        content = <OrderCommentsWidget comments={data?.order_comments_recent} navigate={navigate} />;
        badgeCount = data?.order_comments_recent?.length;
        break;
      case 'invoices_stats':
        content = <InvoiceStatsWidget stats={data?.invoices_stats} navigate={navigate} />;
        headerExtra = (
          <button
            onClick={() => externalInvoiceStatsWindow ? closeExternalWindow('invoices') : openExternalWindow('invoices')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: externalInvoiceStatsWindow ? '#7c3aed' : '#94a3b8',
              fontSize: '0.85rem',
              padding: '0.15rem 0.3rem',
              borderRadius: '4px',
              lineHeight: 1,
              transition: 'all 0.15s'
            }}
            title={externalInvoiceStatsWindow ? 'Zavřít externí okno' : 'Otevřít v externím okně (Always-on-Top)'}
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} />
          </button>
        );
        break;
      case 'annual_fees_due':
        content = <AnnualFeesDueWidget feesData={data?.annual_fees_due} navigate={navigate} />;
        badgeCount = (data?.annual_fees_due?.stats?.po_splatnosti || 0) + (data?.annual_fees_due?.stats?.blizi_se || 0);
        break;
      case 'chart_majetek':
        content = <MajetekByDruhWidget data={data?.chart_majetek_by_druh} />;
        headerExtra = (
          <button onClick={() => {
            const d = data?.chart_majetek_by_druh;
            if (!d || d.length === 0) return;
            const cd = { labels: d.map(x => x.druh_nazev || x.druh_kod || '?'), datasets: [{ data: d.map(x => parseFloat(x.castka_celkem) || 0), backgroundColor: CHART_COLORS.slice(0, d.length), borderWidth: 0 }] };
            const o = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 14, font: { size: 14 } } }, tooltip: { callbacks: { label: (ctx) => { const row = d[ctx.dataIndex]; return [`${formatCurrency(ctx.raw)}`, `${row.pocet} obj.`]; } } }, datalabels: { display: false } } };
            setFullscreenChart({ title: 'Majetek podle druhu', el: <Doughnut data={cd} options={o} /> });
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', padding: '0.15rem 0.3rem', borderRadius: '4px', lineHeight: 1 }} title="Celá obrazovka (ESC = zavřít)">
            <FontAwesomeIcon icon={faExpand} />
          </button>
        );
        break;
      case 'chart_fees':
        content = <FeesByDruhWidget data={data?.chart_fees_by_druh} navigate={navigate} />;
        headerExtra = (
          <button onClick={() => {
            const fd = data?.chart_fees_by_druh;
            if (!fd || !fd.rows || fd.rows.length === 0) return;
            const druhy = [...new Set(fd.rows.map(r => r.druh))];
            const platby = [...new Set(fd.rows.map(r => r.platba))];
            const PC = { MESICNI: '#1d4ed8', KVARTALNI: '#7c3aed', ROCNI: '#06b6d4', JINA: '#f97316' };
            const PL = { MESICNI: 'Měsíční', KVARTALNI: 'Kvartální', ROCNI: 'Roční', JINA: 'Jiná' };
            const ds = platby.map((p, i) => ({ label: PL[p] || p, data: druhy.map(dr => { const r = fd.rows.find(x => x.druh === dr && x.platba === p); return r ? parseFloat(r.castka_celkem) || 0 : 0; }), backgroundColor: PC[p] || CHART_COLORS[i], borderRadius: 4, borderWidth: 0 }));
            const dl = druhy.map(dr => { const r = fd.rows.find(x => x.druh === dr); const n = r?.druh_nazev || dr; return n.length > 15 ? n.substring(0, 15) + '…' : n; });
            const o = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 14, font: { size: 14 } } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }, datalabels: { display: false } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { size: 13 } } }, y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 13 }, callback: v => v >= 1000000 ? `${(v/1000000).toFixed(1)} M` : v >= 1000 ? `${(v/1000).toFixed(0)} k` : v } } } };
            setFullscreenChart({ title: 'Roční poplatky podle druhu', el: <Bar data={{ labels: dl, datasets: ds }} options={o} /> });
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', padding: '0.15rem 0.3rem', borderRadius: '4px', lineHeight: 1 }} title="Celá obrazovka (ESC = zavřít)">
            <FontAwesomeIcon icon={faExpand} />
          </button>
        );
        break;
      case 'cashbook_summary': {
        // ✅ KONTROLA VIDITELNOSTI (pouze CASH_BOOK_* práva, CASHBOOK_REPORTS_* patří jen do Stats & Reports):
        // 1. Má CASH_BOOK_MANAGE nebo CASH_BOOK_*_ALL → vidí všechny pokladny (i bez přiřazení)
        // 2. Má jen CASH_BOOK_*_OWN → vidí JEN své přiřazené pokladny (pokud má alespoň 1)
        
        const hasCashbookAllAccess = hasPermission('CASH_BOOK_MANAGE') || 
                                     hasPermission('CASH_BOOK_READ_ALL') || 
                                     hasPermission('CASH_BOOK_EDIT_ALL');
        
        // Pokud má *_ALL práva → zobrazit vždy (backend vrací data podle práv)
        // Pokud má jen *_OWN práva → zobrazit jen pokud má přiřazené pokladny
        if (!hasCashbookAllAccess) {
          // Má jen _OWN práva → kontrolovat přiřazení
          if (!cashbookData?.pokladny || cashbookData.pokladny.length === 0) {
            return null; // Nemá přiřazenou pokladnu → NEZOBRAZIT widget
          }
        }
        
        const cbMonthNames = ['Leden','\u00danor','B\u0159ezen','Duben','Kv\u011bten','\u010cerven','\u010cervenec','Srpen','Z\u00e1\u0159\u00ed','\u0158\u00edjen','Listopad','Prosinec'];
        const cbCurrentYear = new Date().getFullYear();
        content = <CashbookSummaryWidget cbData={cashbookData} navigate={navigate} loading={cashbookLoading} />;
        headerExtra = (
          <select
            value={cashbookMonth}
            onChange={e => setCashbookMonth(Number(e.target.value))}
            style={{
              fontSize: '0.72rem', fontWeight: 600, border: '1px solid #d1fae5',
              borderRadius: '6px', padding: '0.2rem 0.45rem', color: '#059669',
              background: '#f0fdf4', cursor: 'pointer', outline: 'none'
            }}
          >
            {cbMonthNames.map((nm, i) => (
              <option key={i + 1} value={i + 1}>{nm} {cbCurrentYear}</option>
            ))}
          </select>
        );
        break;
      }
      case 'rss_news':
        content = <RssNewsWidget items={rssItems} loading={rssLoading} error={rssError} feedStatuses={rssFeedStatuses} maxItems={rssMaxItems} />;
        badgeCount = rssItems?.length || 0;
        headerExtra = (
          <button
            onClick={() => fetchRss()}
            disabled={rssLoading}
            title="Obnovit zprávy"
            style={{
              background: 'none', border: 'none', cursor: rssLoading ? 'default' : 'pointer',
              color: '#f97316', fontSize: '0.85rem', padding: '4px 6px', borderRadius: '6px',
              opacity: rssLoading ? 0.5 : 0.7, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center'
            }}
            onMouseEnter={e => { if (!rssLoading) e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = rssLoading ? '0.5' : '0.7'; }}
          >
            <FontAwesomeIcon icon={faSync} spin={rssLoading} />
          </button>
        );
        break;
      case 'active_users_admin':
        content = <ActiveUsersAdminWidget data={activeUsersData} navigate={navigate} token={token} username={username} setQuickMessageUser={setQuickMessageUser} onPeriodChange={setSelectedPeriod} />;
        badgeCount = activeUsersData?.counts?.['5min'] ?? activeUsersData?.count ?? 0;
        break;
      case 'weather':
        // Weather: renderuje celou kartu sám, bez WidgetHeader
        return (
          <WidgetCard key={tileId} $accent={cfg.color} $index={index} style={{ padding: 0, overflow: 'hidden', borderLeft: 'none' }}
            ref={el => { widgetRefs.current[tileId] = el; }}
          >
            <WeatherWidget 
              weatherData={weatherData} 
              weatherLoading={weatherLoading} 
              weatherError={weatherError} 
              onRefresh={() => fetchWeather(false)} 
              showExternalButton={true}
              externalWindow={externalWeatherWindow}
              onOpenExternal={() => openExternalWindow('weather')}
              onCloseExternal={() => closeExternalWindow('weather')}
            />
          </WidgetCard>
        );
      case 'finance_markets':
        // Finance: renderuje celou kartu sám (span2)
        return (
          <WidgetCard key={tileId} $accent={cfg.color} $index={index} $span2={true} style={{ padding: 0, overflow: 'hidden', borderLeft: 'none' }}
            ref={el => { widgetRefs.current[tileId] = el; }}
          >
            <FinanceWidget 
              financeData={financeData} 
              financeLoading={financeLoading} 
              financeError={financeError} 
              onRefresh={() => fetchFinance(false)} 
              userId={user?.id} 
              token={token} 
              username={username} 
              showExternalButton={true}
              externalWindow={externalFinanceWindow}
              onOpenExternal={() => openExternalWindow('finance')}
              onCloseExternal={() => closeExternalWindow('finance')}
            />
          </WidgetCard>
        );
      case 'calendar':
        content = <CalendarWidget 
          token={token} 
          username={username} 
          mySubstitutions={mySubstitutions} 
          substituting={substituting}
          onHeaderButton={(btn) => {
            setWidgetHeaderExtras(prev => ({ ...prev, calendar: btn }));
          }}
          onPlanningEventsUpdate={setMyPlanningEvents}
          urlEventId={urlEventId}
          urlOpenPanel={urlOpenPanel}
        />;
        headerExtra = widgetHeaderExtras.calendar;
        break;
      default:
        return null;
    }

    return (
      <WidgetCard key={tileId} $accent={cfg.color} $index={index} $span2={isSpan2} $spanFull={isSpanFull}
        ref={el => {
          widgetRefs.current[tileId] = el;
          if (tileId === 'active_users_admin') activeUsersRef.current = el;
        }}
      >
        <WidgetHeader>
          <WidgetTitle>
            <WidgetIcon $bg={cfg.color + '18'} $color={cfg.color}>
              <FontAwesomeIcon icon={cfg.icon} />
            </WidgetIcon>
            {titleOverride || cfg.title}
          </WidgetTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {headerExtra}
            {/* Speciální badge pro active_users_admin: formát "online teď (5min) / celkem v vybrané periodě" */}
            {tileId === 'active_users_admin' && activeUsersData?.counts && (() => {
              const onlineNow = activeUsersData.counts['5min'] ?? 0;
              const totalInPeriod = activeUsersData.counts[selectedPeriod] ?? 0;
              return (
                <WidgetBadge $bg={cfg.color + '18'} $color={cfg.color}>
                  {onlineNow} / {totalInPeriod}
                </WidgetBadge>
              );
            })()}
            {/* Standardní badge pro ostatní widgety */}
            {tileId !== 'active_users_admin' && badgeCount > 0 && (
              <WidgetBadge $bg={cfg.color + '18'} $color={cfg.color}>
                {badgeCount}
              </WidgetBadge>
            )}
          </div>
        </WidgetHeader>
        {content}
      </WidgetCard>
    );
  };

  // Order tiles: active_users_admin vždy poslední (alwaysLast), ostatní dle uložené konfigurace
  const orderedTiles = useMemo(() => {
    const base = allTiles.filter(t => availableWidgets.includes(t) && t !== 'active_users_admin');
    // active_users_admin se přidá automaticky pokud je v availableWidgets (kontroluje právo DASHBOARD_ACTIVE_USERS)
    if (availableWidgets.includes('active_users_admin')) return [...base, 'active_users_admin'];
    return base;
  }, [allTiles, availableWidgets]);

  // Dispatch dashNavItems pro floating navigator v Layout.js
  useEffect(() => {
    const items = orderedTiles.map(id => ({
      key: id,
      label: WIDGET_REGISTRY[id]?.title || id,
    }));
    window.dispatchEvent(new CustomEvent('dashNavItems', { detail: { items } }));
    return () => window.dispatchEvent(new CustomEvent('dashNavItems', { detail: { items: [] } }));
  }, [orderedTiles]);

  // Scroll na widget + flash efekt (triggernuto z Layout.js)
  useEffect(() => {
    const doFlash = (el) => {
      // box-shadow pulsuje vně elementu – neoříznuto overflow, nezávislé na Reactu
      let step = 0;
      const frames = [
        '0 0 0 5px rgba(250,204,21,0.8)',
        '0 0 0 2px rgba(250,204,21,0.2)',
        '0 0 0 5px rgba(250,204,21,0.8)',
        '0 0 0 2px rgba(250,204,21,0.2)',
        '0 0 0 5px rgba(250,204,21,0.7)',
        '0 0 0 0px rgba(250,204,21,0)',
      ];
      const origShadow = el.style.boxShadow;
      const origTransition = el.style.transition;
      el.style.transition = 'box-shadow 0.18s ease-in-out';
      const tick = () => {
        if (step >= frames.length) {
          el.style.boxShadow = origShadow;
          el.style.transition = origTransition;
          return;
        }
        el.style.boxShadow = frames[step++];
        setTimeout(tick, 200);
      };
      tick();
    };

    const handler = (e) => {
      const el = widgetRefs.current[e.detail?.key];
      if (!el) return;
      const mainEl = document.querySelector('main');
      if (!mainEl) return;

      // Zjisti zda je widget viditelný v main
      const rect = el.getBoundingClientRect();
      const mainRect = mainEl.getBoundingClientRect();
      const isVisible = rect.top >= mainRect.top + 20 && rect.bottom <= mainRect.bottom - 20;

      if (isVisible) {
        // Viditelný – pouze flash, bez scrollu
        doFlash(el);
      } else {
        // Scrolluj a pak flashni po dokončení animace
        const fixedBar = document.querySelector('header');
        const headerH = fixedBar ? fixedBar.getBoundingClientRect().height : 96;
        mainEl.scrollTo({ top: Math.max(0, el.offsetTop - headerH - 12), behavior: 'smooth' });
        setTimeout(() => doFlash(el), 680);
      }
    };

    window.addEventListener('dashScrollToWidget', handler);
    return () => window.removeEventListener('dashScrollToWidget', handler);
  }, []);

  // Render
  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>
            <FontAwesomeIcon icon={faHome} /> Domovská stránka <BetaBadge>BETA</BetaBadge>
          </PageTitle>
        </PageHeader>
        <DashGrid>
          {[1,2,3,4,5,6].map(i => <LoadingSkeleton key={i} $h="180px" />)}
        </DashGrid>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle><FontAwesomeIcon icon={faHome} /> Domovská stránka <BetaBadge>BETA</BetaBadge></PageTitle>
        </PageHeader>
        <WidgetCard $accent="#dc2626">
          <WidgetHeader>
            <WidgetTitle>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#dc2626' }} /> Chyba
            </WidgetTitle>
          </WidgetHeader>
          <WidgetBody>
            <div style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</div>
            <RefreshBtn onClick={fetchData}>
              <FontAwesomeIcon icon={faSync} /> Zkusit znovu
            </RefreshBtn>
          </WidgetBody>
        </WidgetCard>
      </PageWrapper>
    );
  }

  return (
    <>
    <PageWrapper>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={faHome} /> Domovská stránka <BetaBadge>BETA</BetaBadge>
        </PageTitle>
        
        {/* 🎯 RYCHLÉ ROLE-BASED DLAZDICE + MODULE SHORTCUTS */}
        {(isSuperAdmin || getQuickTiles.length > 0 || getModuleShortcuts.length > 0) && (
          <QuickTiles>
            {quickTilesConfig.showStatusTiles && getQuickTiles.map((tile, idx) => (
              <SmartTooltip
                key={idx}
                text={`${tile.label}${tile.count > 0 ? ` (${tile.count})` : ''}`}
                icon="none"
                preferredPosition="bottom"
              >
                <QuickTile
                  onClick={() => {
                    navigate('/orders25-list-v3', {
                      state: { dashboardFilter: tile.filter, clearFilters: true }
                    });
                  }}
                >
                  <QuickTileIcon>{tile.icon}</QuickTileIcon>
                  {tile.count > 0 && <QuickTileCount>{tile.count}</QuickTileCount>}
                </QuickTile>
              </SmartTooltip>
            ))}

            {/* Oddělovač + Superadmin uživatelé + Module shortcuts */}
            {quickTilesConfig.showModuleShortcuts && (getModuleShortcuts.length > 0 || isSuperAdmin || (hasPermission && hasPermission('DASHBOARD_ACTIVE_USERS'))) && quickTilesConfig.showStatusTiles && getQuickTiles.length > 0 && (
              <QuickTileSeparator />
            )}
            {/* Superadmin nebo DASHBOARD_ACTIVE_USERS: aktivní uživatelé - vedle module shortcuts */}
            {quickTilesConfig.showModuleShortcuts && (isSuperAdmin || (hasPermission && hasPermission('DASHBOARD_ACTIVE_USERS'))) && (
              <SmartTooltip
                text={`Přehled aktivit uživatelů${activeUsersData?.count > 0 ? ` (${activeUsersData.count})` : ''}`}
                icon="none"
                preferredPosition="bottom"
              >
                <QuickTile
                  onClick={() => activeUsersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                    borderColor: 'rgba(255,255,255,0.5)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <QuickTileIcon><FontAwesomeIcon icon={faUsers} /></QuickTileIcon>
                  {activeUsersData?.count > 0 && <QuickTileCount style={{ background: '#1e3a8a', borderColor: 'white' }}>{activeUsersData.count}</QuickTileCount>}
                </QuickTile>
              </SmartTooltip>
            )}
            {/* Kontakty - zaměstnanci + dodavatelé */}
            {quickTilesConfig.showModuleShortcuts && (hasAdminRole() || (hasPermission && hasPermission('PHONEBOOK_VIEW'))) && (
              <SmartTooltip
                text={`Kontakty${data?.contacts_count?.total > 0 ? ` (${data.contacts_count.employees} zam. + ${data.contacts_count.suppliers} dod.)` : ''}`}
                icon="none"
                preferredPosition="bottom"
              >
                <QuickTile
                  onClick={() => navigate('/contacts')}
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
                    borderColor: 'rgba(255,255,255,0.5)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <QuickTileIcon><FontAwesomeIcon icon={faAddressBook} /></QuickTileIcon>
                  {data?.contacts_count?.total > 0 && <QuickTileCount style={{ background: '#155e75', borderColor: 'white' }}>{data.contacts_count.total}</QuickTileCount>}
                </QuickTile>
              </SmartTooltip>
            )}
            {quickTilesConfig.showModuleShortcuts && getModuleShortcuts.map((mod, idx) => (
              <SmartTooltip
                key={`mod-${idx}`}
                text={`${mod.label}${mod.count ? ` (${mod.count})` : ''}`}
                icon="none"
                preferredPosition="bottom"
              >
                <QuickTile
                  onClick={() => navigate(mod.route)}
                  style={{
                    background: mod.bg,
                    borderColor: 'rgba(255,255,255,0.5)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <QuickTileIcon><FontAwesomeIcon icon={mod.icon} /></QuickTileIcon>
                  {mod.count != null && (
                    <QuickTileCount style={{ background: mod.badgeColor, borderColor: 'white' }}>
                      {mod.count}
                    </QuickTileCount>
                  )}
                </QuickTile>
              </SmartTooltip>
            ))}

            {/* Oddělovač + Zvoneček notifikací */}
            {quickTilesConfig.showNotifications && (
              <>
                <QuickTileSeparator />
                {/* Nezkontrolované faktury - zobrazit PŘED zvonečkem */}
                {(data?.invoices_stats?.moje_nezkontrolovane || 0) > 0 && (
                  <SmartTooltip
                    text={`Máte ${data.invoices_stats.moje_nezkontrolovane} ${data.invoices_stats.moje_nezkontrolovane === 1 ? 'nezkontrolovanou fakturu' : data.invoices_stats.moje_nezkontrolovane < 5 ? 'nezkontrolované faktury' : 'nezkontrolovaných faktur'} k věcné kontrole`}
                    icon="none"
                    preferredPosition="bottom"
                  >
                    <QuickTile
                      onClick={() => navigate('/invoices25-list', { state: { dashboardFilter: 'my_unchecked_invoices' } })}
                      style={{
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        borderColor: 'rgba(255,255,255,0.5)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      }}
                    >
                      <QuickTileIcon><FontAwesomeIcon icon={faFileInvoiceDollar} /></QuickTileIcon>
                      <QuickTileCount style={{ background: '#c2410c', borderColor: 'white' }}>
                        {data.invoices_stats.moje_nezkontrolovane}
                      </QuickTileCount>
                    </QuickTile>
                  </SmartTooltip>
                )}
                <SmartTooltip
                  text={`Oznámení${(bgTasksContext?.unreadNotificationsCount || 0) > 0 ? ` (${bgTasksContext.unreadNotificationsCount} nepřečtených)` : ''}`}
                  icon="none"
                  preferredPosition="bottom"
                >
                  <QuickTile
                    onClick={() => navigate('/notifications')}
                    style={{
                      background: (bgTasksContext?.unreadNotificationsCount || 0) > 0
                        ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)'
                        : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                      borderColor: 'rgba(255,255,255,0.5)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    }}
                  >
                    <QuickTileIcon><FontAwesomeIcon icon={faBell} /></QuickTileIcon>
                    {(bgTasksContext?.unreadNotificationsCount || 0) > 0 && (
                      <QuickTileCount style={{ background: '#9f1239', borderColor: 'white' }}>
                        {bgTasksContext.unreadNotificationsCount}
                      </QuickTileCount>
                    )}
                  </QuickTile>
                </SmartTooltip>
              </>
            )}
          </QuickTiles>
        )}
        
        <HeaderActions>
          <SmartTooltip 
            text={autoRefreshEnabled ? "Automatické obnovení každých 5 minut (zapnuto)" : "Automatické obnovení vypnuto"}
            icon="none" 
            preferredPosition="bottom"
          >
            <AutoRefreshToggle>
              <input 
                type="checkbox" 
                checked={autoRefreshEnabled} 
                onChange={handleToggleAutoRefresh}
              />
              <span></span>
            </AutoRefreshToggle>
          </SmartTooltip>
          <SmartTooltip text="Obnovit dashboard" icon="none" preferredPosition="bottom">
            <RefreshBtn onClick={fetchData} disabled={loading} $spinning={loading}>
              <FontAwesomeIcon icon={faSync} />
            </RefreshBtn>
          </SmartTooltip>
          <SmartTooltip text="Přizpůsobit" icon="none" preferredPosition="bottom">
            <ConfigBtn onClick={() => setConfigOpen(true)}>
              <FontAwesomeIcon icon={faCog} />
            </ConfigBtn>
          </SmartTooltip>
          {isSuperAdmin && (
            <SmartTooltip text="Správa oprávnění widgetů" icon="none" preferredPosition="bottom">
              <ConfigBtn onClick={() => setPermissionsOpen(true)} style={{ color: '#7c3aed' }}>
                <FontAwesomeIcon icon={faUserShield} />
              </ConfigBtn>
            </SmartTooltip>
          )}
        </HeaderActions>
      </PageHeader>

      <FocusAlertsBanner items={data?.focus_alerts} navigate={navigate} lastRefreshed={lastRefreshed} isFlashing={refreshFlash} />

      <DashGrid>
        {orderedTiles.map((tileId, idx) => renderWidget(tileId, idx))}
      </DashGrid>

      {configOpen && (
        <DashboardConfigModal
          tiles={allTiles}
          visibleTiles={visibleTiles}
          availableWidgets={availableWidgets}
          onToggle={handleToggleTile}
          onReorder={handleReorder}
          onClose={() => setConfigOpen(false)}
          quickTilesConfig={quickTilesConfig}
          onQuickTilesChange={handleQuickTilesChange}
        />
      )}
      {permissionsOpen && (
        <DashboardPermissionsModal
          token={token}
          username={username}
          onClose={() => setPermissionsOpen(false)}
          onSaved={() => { setPermissionsOpen(false); fetchData(); }}
        />
      )}
      {quickMessageUser && (
        <SendQuickMessageModal
          user={quickMessageUser}
          onClose={() => setQuickMessageUser(null)}
          onSuccess={() => {
          }}
        />
      )}
      <div style={{ height: '2rem' }} />
    </PageWrapper>
    
    {fullscreenChart && ReactDOM.createPortal(
      <ChartOverlay onClick={(e) => { if (e.target === e.currentTarget) setFullscreenChart(null); }}>
        <ChartFullscreenBox>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>{fullscreenChart.title}</span>
            <button onClick={() => setFullscreenChart(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b', padding: '0.25rem 0.5rem', borderRadius: '4px' }} title="Zavřít (ESC)">
              <FontAwesomeIcon icon={faCompress} />
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
            {fullscreenChart.el}
          </div>
        </ChartFullscreenBox>
      </ChartOverlay>,
      document.body
    )}

    {/* Externí okna se spravují přes globální store - není potřeba React Portal */}
    </>
  );
}
