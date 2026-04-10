/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { AuthContext } from '../context/AuthContext';
import { getDashboardData, getCashbookSummary, getActiveUsersAdmin, getDashboardChartTimeline, getRssFeed } from '../services/apiDashboard';
import { fetchUserSettings, saveUserSettings } from '../services/userSettingsApi';
import { theme } from '../theme/theme';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faShoppingCart, faFileInvoiceDollar, faBell,
  faExclamationTriangle, faCheckCircle, faClock, faChartBar,
  faTruck, faGavel, faGlobe, faUserShield, faCog, faArrowRight,
  faSync, faEye, faEyeSlash, faGripVertical, faTimes,
  faExclamationCircle, faCalendarAlt, faMoneyBillWave,
  faFileContract, faComments, faHourglassHalf, faFileInvoice,
  faCoins, faChartLine, faBullhorn, faGift, faInfoCircle, faCalendarCheck, faUsers
} from '@fortawesome/free-solid-svg-icons';
import { SmartTooltip } from '../styles/SmartTooltip';
import DashboardPermissionsModal from '../components/dashboard/DashboardPermissionsModal';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// ============================================================================
// CONSTANTS
// ============================================================================

const WIDGET_REGISTRY = {
  welcome:             { title: 'Přehled',                 icon: faHome,               color: '#1d4ed8' },
  orders_stats:        { title: 'Statistiky objednávek',   icon: faChartBar,           color: '#1d4ed8', requires: 'DASHBOARD_ORDERS_STATS' },
  my_orders:           { title: 'Moje objednávky',         icon: faShoppingCart,        color: '#2563eb' },
  my_invoices:         { title: 'Faktury k potvrzení',     icon: faFileInvoiceDollar,  color: '#7c3aed', requires: 'DASHBOARD_INVOICES_CONFIRM' },
  orders_approval:     { title: 'Ke schválení',            icon: faGavel,              color: '#dc2626', requires: 'DASHBOARD_ORDERS_APPROVE' },
  invoices_overdue:    { title: 'Faktury po splatnosti',   icon: faExclamationCircle,  color: '#dc2626', requires: 'DASHBOARD_INVOICES_OVERDUE' },
  invoices_due_soon:   { title: 'Faktury blížící se spl.', icon: faCalendarAlt,        color: '#f97316', requires: 'DASHBOARD_INVOICES_DUE_SOON' },
  orders_registry:     { title: 'Registr – ke zveřejnění',            icon: faGlobe,              color: '#059669', requires: 'DASHBOARD_ORDERS_REGISTRY' },
  orders_published:    { title: 'Registr – zveřejněné objednávky',    icon: faCheckCircle,        color: '#10b981', requires: 'DASHBOARD_ORDERS_PUBLISHED' },
  alerts:              { title: 'Upozornění',              icon: faExclamationTriangle,color: '#f59e0b' },
  notifications:       { title: 'Notifikace',              icon: faBell,               color: '#6366f1' },
  chart_timeline:      { title: 'Objednávky v čase',       icon: faChartBar,           color: '#0891b2', requires: 'DASHBOARD_CHART_TIMELINE' },
  top_suppliers:       { title: 'Top dodavatelé',           icon: faTruck,              color: '#b45309', requires: 'DASHBOARD_TOP_SUPPLIERS' },
  smlouvy_critical:    { title: 'Smlouvy - kritický stav',  icon: faFileContract,       color: '#dc2626', requires: 'DASHBOARD_SPENDING_CONTRACTS' },
  lp_critical:         { title: 'Limitované příslíby - stav čerpání', icon: faMoneyBillWave, color: '#dc2626', requires: 'DASHBOARD_SPENDING_LP' },
  order_comments:      { title: 'Komentáře k objednávkám',  icon: faComments,           color: '#6366f1' },
  invoices_stats:      { title: 'Statistiky faktur',         icon: faFileInvoiceDollar,  color: '#7c3aed', requires: 'DASHBOARD_INVOICES_STATS' },
  annual_fees_due:     { title: 'Roční poplatky - splatnost', icon: faCalendarCheck,      color: '#b45309', requires: 'DASHBOARD_ANNUAL_FEES' },
  cashbook_summary:    { title: 'Pokladna - přehled',         icon: faCoins,              color: '#059669', requires: 'DASHBOARD_CASH_BOOK', beta: true },
  rss_news:            { title: 'Zprávy',                      icon: faBullhorn,           color: '#f97316' },
  active_users_admin:  { title: 'Dashboard uživatelů',         icon: faUsers,              color: '#1d4ed8', requiresSuperAdmin: true, alwaysOn: true, alwaysLast: true }
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
  ${FocusBannerWrap}:hover & { opacity: 1; }
  &:hover { opacity: 1 !important; background: rgba(255,255,255,1); }
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
  ${FocusBannerWrap}:hover & { opacity: 1; }
  &:hover { opacity: 1 !important; background: rgba(255,255,255,1); }
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
  border: 1px solid ${p => p.$severity === 'danger' ? '#fca5a5' : '#fde68a'};
  background: ${p => p.$severity === 'danger' ? '#fef2f2' : '#fffbeb'};
  cursor: pointer;
  transition: all 0.15s;
  min-width: 200px; max-width: 360px;
  &:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.08); }
`;

const FocusIcon = styled.div`
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem;
  background: ${p => p.$severity === 'danger' ? '#fee2e2' : '#fef3c7'};
  color: ${p => p.$severity === 'danger' ? '#dc2626' : '#d97706'};
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
  color: ${p => p.$severity === 'danger' ? '#dc2626' : '#d97706'};
  flex-shrink: 0;
`;

const WidgetCard = styled.div`
  background: white;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.07);
  border-left: 5px solid ${p => p.$accent || '#1d4ed8'};
  overflow: hidden;
  animation: ${fadeInUp} 0.4s ease-out both;
  animation-delay: ${p => (p.$index || 0) * 0.06}s;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(15, 23, 42, 0.11); }
  ${p => p.$span2 && `grid-column: span 2; @media (max-width: 900px) { grid-column: span 1; }`}
`;

const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.6rem;
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
  padding: 0.5rem 1.25rem 1.25rem;
  max-height: ${p => p.$noScroll ? 'none' : '280px'};
  overflow-y: ${p => p.$noScroll ? 'visible' : 'auto'};
  font-stretch: condensed;
  letter-spacing: -0.015em;
  
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
  padding: 0.65rem 0;
  border-bottom: 1px solid ${theme.colors.gray100};
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 6px;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  &:hover { background: ${theme.colors.gray100}; }
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
  font-weight: 600;
  color: ${theme.colors.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListItemSub = styled.span`
  font-size: 0.75rem;
  color: ${theme.colors.gray500};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListItemMeta = styled.span`
  font-size: 0.68rem;
  color: ${theme.colors.gray400 || '#9ca3af'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
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
  max-height: 70vh;
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
  return '#f0fdf4';
};

const getAlertColor = (type) => {
  if (type === 'danger') return '#dc2626';
  if (type === 'warning') return '#f59e0b';
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

// ============================================================================
// WIDGET COMPONENTS
// ============================================================================

// ── RSS Zprávy ──────────────────────────────────────────────────────────────
function RssNewsWidget({ items, loading, error, feedStatuses, maxItems = 15 }) {
  const [hiddenFeeds, setHiddenFeeds] = useState([]);

  const okFeeds = (feedStatuses || []).filter(f => f.status === 'ok');

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
    picked.sort((a, b) => {
      const da = a.pub_date_raw ? new Date(a.pub_date_raw).getTime() : 0;
      const db = b.pub_date_raw ? new Date(b.pub_date_raw).getTime() : 0;
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
    <div style={{display: 'flex', flexDirection: 'column'}}>
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
      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto', padding: '0.25rem'}}>
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
          {item.image_url && (
            <img
              src={item.image_url}
              alt=""
              style={{width: '64px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0}}
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}
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
    </div>
    </div>
  );
}

// ── SUPERADMIN: Aktivní uživatelé ──────────────────────────────────────────
function ActiveUsersAdminWidget({ data, navigate }) {
  const items = data?.items || [];

  const formatAgo = (dt) => {
    if (!dt) return '–';
    const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  const MODULE_LABELS = {
    '/orders25-list-v3': 'Objednávky',
    '/invoices': 'Faktury',
    '/invoices25': 'Faktury',
    '/dashboard': 'Dashboard',
    '/users': 'Správa uživatelů',
    '/smlouvy': 'Smlouvy',
    '/lp': 'LP',
    '/reports': 'Reporty',
    '/cashbook': 'Pokladna',
  };

  const getModuleLabel = (modul, cesta) => {
    if (!modul && !cesta) return null;
    const path = cesta || modul || '';
    for (const [key, val] of Object.entries(MODULE_LABELS)) {
      if (path.includes(key)) return val;
    }
    return modul || path.split('/').filter(Boolean).pop() || null;
  };

  const ROLE_BADGES = {
    SUPERADMIN:        { label: 'SA',  title: 'Superadmin – plný přístup k systému',             color: '#dc2626' },
    ADMINISTRATOR:     { label: 'ADM', title: 'Administrátor – správa uživatelů a nastavení',      color: '#7c3aed' },
    UCETNI:            { label: 'ÚČT', title: 'Účetní – správa a zpracování faktur',               color: '#0891b2' },
    HLAVNI_UCETNI:     { label: 'HÚ',  title: 'Hlavní účetní – vedoucí účetního oddělení',         color: '#0891b2' },
    PRIKAZCE_OPERACE:  { label: 'PŘO', title: 'Příkazce operace – schvalování objednávek',         color: '#059669' },
    PRIKAZCE:          { label: 'PŘ',  title: 'Příkazce – schvalování objednávek',                 color: '#059669' },
    SPRAVCE_ROZPOCTU:  { label: 'SR',  title: 'Správce rozpočtu – kontrola a správa rozpočtu',    color: '#b45309' },
    KONTROLOR_FAKTUR:  { label: 'KF',  title: 'Kontrolor faktur – věcná správnost faktur',         color: '#6366f1' },
    ROZPOCTAR:         { label: 'RZP', title: 'Rozpočtář – tvorba a správa rozpočtu',              color: '#b45309' },
    VEDOUCI:           { label: 'VED', title: 'Vedoucí – vedoucí pracovník',                       color: '#0f766e' },
    NAMESTEK:          { label: 'NÁM', title: 'Náměstek – náměstek vedoucího',                     color: '#0f766e' },
    REDITEL:           { label: 'ŘED', title: 'Ředitel – ředitel organizace',                      color: '#0f766e' },
    VEREJNE_ZAKAZKY:   { label: 'VZ',  title: 'Veřejné zakázky – správa veřejných zakázek',       color: '#7c3aed' },
  };

  if (items.length === 0) {
    return (
      <WidgetBody>
        <EmptyState>
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '0.5rem' }} />
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Žádní aktivní uživatelé (posledních 5 min)</div>
        </EmptyState>
      </WidgetBody>
    );
  }

  return (
    <WidgetBody style={{ padding: 0 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Uživatel</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Úsek / Pozice</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Modul</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>IP adresa</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Objednal</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Schválil</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Ke schválení</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Aktivita</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u, i) => {
              const modulLabel = getModuleLabel(u.modul, u.cesta);
              const isPrikazce = (u.role_kody || []).some(r => r.startsWith('PRIKAZCE') || r === 'SPRAVCE_ROZPOCTU');
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{u.cele_jmeno}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({u.username})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      {(u.role_kody || []).filter(r => ROLE_BADGES[r]).map(r => (
                        <span key={r} title={ROLE_BADGES[r].title} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: 4, background: ROLE_BADGES[r].color + '1a', color: ROLE_BADGES[r].color, border: `1px solid ${ROLE_BADGES[r].color}40`, cursor: 'help' }}>
                          {ROLE_BADGES[r].label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                    {u.usek_zkr && <span style={{ fontWeight: 600 }}>{u.usek_zkr}</span>}
                    {u.pozice && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{u.pozice}</div>}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                    {modulLabel
                      ? <span style={{ padding: '0.15rem 0.45rem', borderRadius: 6, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: '0.75rem' }}>{modulLabel}</span>
                      : <span style={{ color: '#cbd5e1' }}>–</span>}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#475569', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {u.ip_adresa || <span style={{ color: '#cbd5e1' }}>–</span>}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, color: u.pocet_objednavek_objednatel > 0 ? '#1d4ed8' : '#94a3b8' }}>
                    {u.pocet_objednavek_objednatel}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: isPrikazce ? 600 : 400, color: isPrikazce && u.pocet_schvalenych > 0 ? '#059669' : '#94a3b8' }}>
                    {isPrikazce ? u.pocet_schvalenych : '–'}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                    {isPrikazce
                      ? <span style={{ fontWeight: 600, color: u.pocet_ke_schvaleni > 0 ? '#dc2626' : '#94a3b8' }}>{u.pocet_ke_schvaleni}</span>
                      : <span style={{ color: '#cbd5e1' }}>–</span>}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.78rem' }}>
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

function WelcomeWidget({ user, rolesDetected, nameday, newsSinceLogin, navigate }) {
  const roleLabels = [];
  if (rolesDetected?.is_admin) roleLabels.push('Administrátor');
  if (rolesDetected?.has_order_approve) roleLabels.push('Příkazce');
  if (rolesDetected?.has_spending) roleLabels.push('Správce rozpočtu');
  if (rolesDetected?.has_invoice_manage) roleLabels.push('Účetní');
  if (rolesDetected?.has_registry) roleLabels.push('Veřejné zakázky');

  const today = new Date();
  const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];

  const NEWS_ICON_MAP = {
    'shopping-cart': { icon: faShoppingCart, color: '#2563eb', bg: '#dbeafe' },
    'gavel': { icon: faGavel, color: '#dc2626', bg: '#fef2f2' },
    'check-circle': { icon: faCheckCircle, color: '#059669', bg: '#ecfdf5' },
    'check-double': { icon: faCheckCircle, color: '#10b981', bg: '#d1fae5' },
    'file-invoice': { icon: faFileInvoice, color: '#0284c7', bg: '#e0f2fe' },
    'exclamation-triangle': { icon: faExclamationTriangle, color: '#f59e0b', bg: '#fffbeb' },
  };

  // Nový formát: {items: [...], since_formatted: '6.4. 14:30'}
  const newsItems = newsSinceLogin?.items || (Array.isArray(newsSinceLogin) ? newsSinceLogin : []);
  const sinceFormatted = newsSinceLogin?.since_formatted || '';

  return (
    <WidgetBody $noScroll>
      <WelcomeRow>
        <AvatarCircle>
          {getInitials(user?.jmeno, user?.prijmeni)}
        </AvatarCircle>
        <WelcomeInfo>
          <WelcomeName>Dobrý den, {user?.jmeno} {user?.prijmeni}</WelcomeName>
          <WelcomeRole>
            {roleLabels.length > 0 ? roleLabels.join(' · ') : (user?.pozice || 'Uživatel')}
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

      {/* Poslední aktivity */}
      <WelcomeDivider />
      <NewsSection>
        <NewsSectionTitle>
          <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem' }} />
          Poslední aktivity {sinceFormatted ? `(od ${sinceFormatted})` : ''}
        </NewsSectionTitle>
        {newsItems.length > 0 ? (
          newsItems.map((item, i) => {
            const cfg = NEWS_ICON_MAP[item.icon] || { icon: faInfoCircle, color: '#6b7280', bg: '#f3f4f6' };
            return (
              <NewsItem key={i} $bg={cfg.bg} onClick={() => {
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
          <NewsEmpty>Žádné nové aktivity</NewsEmpty>
        )}
      </NewsSection>
    </WidgetBody>
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
  const hasPrikazce = myOrdersData?.has_prikazce_role || false;

  const total = objednatel.length + garant.length + prikazce.length;
  if (total === 0) {
    return <WidgetBody><EmptyState>Žádné objednávky</EmptyState></WidgetBody>;
  }

  const renderOrder = (o) => {
    const stav = o.aktualni_stav || '';
    const sb = getStatusBadge(stav);
    const prikazceJmeno = o.prikazce_jmeno ? `${o.prikazce_jmeno} ${o.prikazce_prijmeni || ''}`.trim() : '';
    return (
      <ListItem key={o.id} onClick={() => navigate(`/order-form-25?edit=${o.id}`, { state: { returnTo: '/dashboard' } })}>
        <ListItemLeft>
          <ListItemTitle>{o.cislo_objednavky || `#${o.id}`}</ListItemTitle>
          <ListItemSub>{o.predmet}</ListItemSub>
          {prikazceJmeno && <ListItemMeta>Přík: {prikazceJmeno}</ListItemMeta>}
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
              <ListItemTitle>{o.cislo_objednavky || `#${o.id}`}</ListItemTitle>
              <ListItemSub>{o.predmet}</ListItemSub>
              {metaInfo && <ListItemMeta>{metaInfo}</ListItemMeta>}
            </ListItemLeft>
            <ListItemRight>
              <Amount>{formatCurrency(o.celkova_cena_s_dph)}</Amount>
              <Badge $bg={sb.bg} $color={sb.color}>{getStatusLabel(stav)}</Badge>
              {o.dni_od_vytvoreni !== undefined && (
                <Badge 
                  $bg={o.dni_od_vytvoreni > 7 ? '#fee2e2' : (o.dni_od_vytvoreni > 3 ? '#fef3c7' : '#dbeafe')}
                  $color={o.dni_od_vytvoreni > 7 ? '#dc2626' : (o.dni_od_vytvoreni > 3 ? '#b45309' : '#1d4ed8')}
                >
                  {o.dni_od_vytvoreni === 0 ? 'dnes' : `před ${o.dni_od_vytvoreni} d`}
                </Badge>
              )}
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
              <ListItemTitle><span style={{ color: '#6b7280' }}>FA VS:</span> <strong>{f.fa_cislo || `#${f.id}`}</strong></ListItemTitle>
              <ListItemSub>{f.fa_dodavatel_nazev}{vazba}</ListItemSub>
              {metaInfo && <ListItemMeta>{metaInfo}</ListItemMeta>}
            </ListItemLeft>
            <ListItemRight>
              <Amount $color={f.dni_do_splatnosti < 0 ? '#dc2626' : (f.dni_do_splatnosti < 3 ? '#f97316' : theme.colors.primary)}>
                {formatCurrency(f.fa_castka)}
              </Amount>
              <Badge 
                $bg={f.dni_do_splatnosti < 0 ? '#fee2e2' : (f.dni_do_splatnosti < 3 ? '#fef3c7' : '#dbeafe')}
                $color={f.dni_do_splatnosti < 0 ? '#dc2626' : (f.dni_do_splatnosti < 3 ? '#b45309' : '#1d4ed8')}
              >
                {f.dni_do_splatnosti < 0 
                  ? `${Math.abs(f.dni_do_splatnosti)} d po splatnosti` 
                  : (f.dni_do_splatnosti !== undefined ? `za ${f.dni_do_splatnosti} d` : f.stav)}
              </Badge>
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
              <ListItemTitle><span style={{ color: '#6b7280' }}>FA VS:</span> <strong>{f.fa_cislo || `#${f.id}`}</strong></ListItemTitle>
              <ListItemSub>{f.fa_dodavatel_nazev} — spl. {formatDate(f.fa_datum_splatnosti)}</ListItemSub>
              {metaInfo && <ListItemMeta>{metaInfo}</ListItemMeta>}
            </ListItemLeft>
            <ListItemRight>
              <Amount $color="#dc2626">{formatCurrency(f.fa_castka)}</Amount>
              <Badge $bg="#fee2e2" $color="#dc2626">{f.dni_po_splatnosti} dnů po spl.</Badge>
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
    'globe': faGlobe
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
    return <WidgetBody><EmptyState>Žádné nepřečtené notifikace</EmptyState></WidgetBody>;
  }

  return (
    <WidgetBody>
      {notifications.map(n => (
        <NotifItem key={n.id}>
          <NotifDot $color={getNotifColor(n.priorita)} />
          <div style={{ flex: 1 }}>
            <NotifText>{n.nadpis || n.zprava}</NotifText>
            <NotifTime>{timeAgo(n.dt_created)}</NotifTime>
          </div>
        </NotifItem>
      ))}
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
      <WidgetBody>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
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
    <WidgetBody $noScroll>
      <div style={{ height: 200 }}>
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
      tooltip: { callbacks: { label: (ctx) => `${formatCurrency(ctx.raw)} (${ctx.label})` } }
    }
  };

  return (
    <WidgetBody $noScroll>
      <div style={{ height: 220 }}>
        <Doughnut data={chartData} options={options} />
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
        return (
          <ListItem key={o.id} onClick={() => navigate(`/order-form-25?edit=${o.id}`, { state: { returnTo: '/dashboard' } })}>
            <ListItemLeft>
              <ListItemTitle>{o.cislo_objednavky || `#${o.id}`}</ListItemTitle>
              <ListItemSub>{o.predmet}</ListItemSub>
              {objednavatel && <ListItemMeta>Obj: {objednavatel} · zveř. {formatDate(o.dt_zverejneni)}</ListItemMeta>}
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
          tags.push(<CriticalTag key="p" $type="UKONCENA">⚠️ {pct}% překročeno!</CriticalTag>);
        } else if (lp.typ_kriticky === 'CERPANI_KRITICKE') {
          tags.push(<CriticalTag key="k" $type="UKONCENA">🔴 {pct}% kritické</CriticalTag>);
        } else if (lp.typ_kriticky === 'CERPANI_VYSOKE') {
          tags.push(<CriticalTag key="v" $type="CERPANI">🟡 {pct}% vysoké</CriticalTag>);
        } else if (lp.typ_kriticky === 'CERPANI_STREDNI') {
          tags.push(<CriticalTag key="s" $type="BRZY_KONCI">🔵 {pct}% střední</CriticalTag>);
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

  return (
    <WidgetBody>
      {comments.map(c => (
        <ListItem key={c.id} onClick={() => navigate(`/order-form-25?edit=${c.objednavka_id}`, { state: { returnTo: '/dashboard', openComments: true } })}>
          <ListItemLeft>
            <ListItemTitle>{c.cislo_objednavky || `#${c.objednavka_id}`}</ListItemTitle>
            <CommentText>{c.obsah_plain}</CommentText>
            <CommentMeta>
              {c.autor_jmeno} · {c.dt_vytvoreni ? new Date(c.dt_vytvoreni).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
            </CommentMeta>
          </ListItemLeft>
        </ListItem>
      ))}
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
    { key: 'moje_faktury', label: 'Moje faktury', sub: 'Předané / Věcná', value: stats.moje_faktury, color: '#6366f1', bg: '#eef2ff', filter: 'my_invoices' }
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

function DashboardConfigModal({ tiles, visibleTiles, onToggle, onReorder, onClose, availableWidgets }) {
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
    <ConfigOverlay onClick={onClose}>
      <ConfigPanel onClick={e => e.stopPropagation()}>
        <ConfigHeader>
          <ConfigTitle>
            <FontAwesomeIcon icon={faCog} /> Konfigurace dashboardu
          </ConfigTitle>
          <ConfigCloseBtn onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </ConfigCloseBtn>
        </ConfigHeader>
        <ConfigBody>
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

  const hasItems = items && items.length > 0;
  if (!hasItems && !lastRefreshed) return null;

  const scrollBy = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
    }
  };

  if (!hasItems) {
    // Pouze datum aktualizace, bez alertů
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
        <FocusBannerScrollBtnLeft onClick={() => scrollBy('left')} title="Posunout vlevo">
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
        <FocusBannerScrollBtnRight onClick={() => scrollBy('right')} title="Posunout vpravo">
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
  const { token, user, userDetail, hasPermission, hasAdminRole, userPermissions } = useContext(AuthContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [visibleTiles, setVisibleTiles] = useState(DEFAULT_TILES);
  const [allTiles, setAllTiles] = useState(DEFAULT_TILES);
  const [cashbookMonth, setCashbookMonth] = useState(new Date().getMonth() + 1);
  const [cashbookData, setCashbookData] = useState(null);
  const [cashbookLoading, setCashbookLoading] = useState(false);
  const [activeUsersData, setActiveUsersData] = useState(null);
  const activeUsersRef = useRef(null);
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

  const username = user?.username;

  // SUPERADMIN check
  const isSuperAdmin = useMemo(() => {
    return (userDetail?.roles || []).some(r => r.kod_role === 'SUPERADMIN');
  }, [userDetail]);

  // Auto-refresh aktivních uživatelů každých 30s (pouze SUPERADMIN)
  useEffect(() => {
    if (!isSuperAdmin || !token || !username) return;
    const fetchActive = async () => {
      const d = await getActiveUsersAdmin({ token, username });
      if (d) setActiveUsersData(d);
    };
    fetchActive();
    const iv = setInterval(fetchActive, 30000);
    return () => clearInterval(iv);
  }, [isSuperAdmin, token, username]);

  // RSS Feed: načtení po přihlášení + auto-refresh dle intervalu z app settings
  const rssRefreshRef = useRef(null);
  const rssCancelledRef = useRef(false);

  const fetchRss = useCallback(async () => {
    if (!token || !username) return;
    setRssLoading(true);
    try {
      const result = await getRssFeed({ token, username, max_items: 15 });
      if (rssCancelledRef.current) return;
      if (result.status === 'success') {
        setRssItems(result.data || []);
        setRssEnabled(result.rss_enabled !== false);
        setRssError(false);
        setRssFeedStatuses(result.feed_statuses || []);
        if (result.max_items) setRssMaxItems(result.max_items);

        // Nastavit auto-refresh interval z backendu (minuty → ms)
        const intervalMin = result.refresh_interval || 15;
        if (rssRefreshRef.current) clearInterval(rssRefreshRef.current);
        rssRefreshRef.current = setInterval(() => {
          if (!rssCancelledRef.current) fetchRss();
        }, intervalMin * 60 * 1000);
      } else {
        setRssEnabled(result.rss_enabled === true);
        setRssItems([]);
      }
    } catch {
      if (!rssCancelledRef.current) { setRssError(true); setRssItems([]); }
    } finally {
      if (!rssCancelledRef.current) setRssLoading(false);
    }
  }, [token, username]);

  useEffect(() => {
    rssCancelledRef.current = false;
    fetchRss();
    return () => {
      rssCancelledRef.current = true;
      if (rssRefreshRef.current) clearInterval(rssRefreshRef.current);
    };
  }, [fetchRss]);

  // Determine available widgets based on DASHBOARD_* capabilities from API
  const availableWidgets = useMemo(() => {
    const isAdmin = hasAdminRole();
    const caps = data?.dashboard_capabilities || [];
    const superAdmin = (userDetail?.roles || []).some(r => r.kod_role === 'SUPERADMIN');

    return Object.entries(WIDGET_REGISTRY)
      .filter(([id, cfg]) => {
        // RSS widget: viditelný jen pokud je RSS povoleno v app settings
        if (id === 'rss_news') return rssEnabled;
        // Widget pouze pro SUPERADMIN
        if (cfg.requiresSuperAdmin) return superAdmin;
        // Widgety bez 'requires' → viditelné vždy
        if (!cfg.requires) return true;
        // Admin vidí vše
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
            localStorage.setItem(lsKey, JSON.stringify(result));
          } catch (e) { /* ignore */ }
        }
      })
      .catch(() => { /* fallback na localStorage – ok */ });
  }, [user?.id, token, username, applyDashboardConfig]);

  // Save config: okamžitě do localStorage + async do DB
  const saveConfig = useCallback((tiles, visible) => {
    const lsKey = `dashboard_config_${user?.id || 'default'}`;
    try {
      localStorage.setItem(lsKey, JSON.stringify({ tiles, visible }));
    } catch (e) { /* ignore */ }

    // Uložit do DB přes userSettings – načteme aktuální settings a patchneme dashboard_layout
    if (!token || !username || !user?.id) return;
    fetchUserSettings({ token, username, userId: user.id })
      .then(currentSettings => {
        const merged = { ...currentSettings, dashboard_layout: { tiles, visible } };
        return saveUserSettings({ token, username, userId: user.id, nastaveni: merged });
      })
      .catch(err => {
        console.error('[Dashboard] Chyba při ukládání layoutu do DB:', err);
      });
  }, [token, username, user?.id]);

  // Fetch data (silent = tichý refresh bez loading spinneru / blikání)
  const fetchData = useCallback(async (silent = false) => {
    if (!token || !username) return;
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
  }, [token, username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      console.log('🔄 Dashboard auto-refresh (5 min) - silent');
      fetchData(true);
    }, 5 * 60 * 1000); // 5 minut

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchData]);

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

    const roles = (userDetail?.roles || []).map(r => r.kod_role);
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
    const hasRole = (r) => roles.some(k => k === r || k.startsWith(r + '_') || k.startsWith(r));
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

  // Render individual widget
  const renderWidget = (tileId, index) => {
    const cfg = WIDGET_REGISTRY[tileId];
    if (!cfg) return null;
    if (!availableWidgets.includes(tileId)) return null;
    // alwaysOn widgety (např. active_users_admin) ignorují visibleTiles
    if (!cfg.alwaysOn && !visibleTiles.includes(tileId)) return null;

    const isSpan2 = tileId === 'orders_stats' || tileId === 'invoices_stats' || tileId === 'chart_timeline' || tileId === 'top_suppliers' || tileId === 'cashbook_summary' || tileId === 'active_users_admin' || tileId === 'rss_news';

    let content = null;
    let badgeCount = null;
    let headerExtra = null;

    switch (tileId) {
      case 'welcome':
        content = <WelcomeWidget user={data?.user} rolesDetected={data?.roles_detected} nameday={data?.nameday} newsSinceLogin={data?.news_since_login} navigate={navigate} />;
        break;
      case 'orders_stats':
        content = <OrderStatsWidget stats={data?.orders_stats} navigate={navigate} />;
        break;
      case 'my_orders':
        content = <MyOrdersWidget myOrdersData={data?.my_orders_pending} navigate={navigate} />;
        badgeCount = (data?.my_orders_pending?.objednatel?.length || 0)
                   + (data?.my_orders_pending?.garant?.length || 0)
                   + (data?.my_orders_pending?.prikazce?.length || 0);
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
        content = <AlertsWidget alerts={data?.alerts} navigate={navigate} />;
        badgeCount = data?.alerts?.length;
        break;
      case 'notifications':
        content = <NotificationsWidget notifications={data?.notifications_unread} navigate={navigate} />;
        badgeCount = data?.notifications_unread?.length;
        break;
      case 'chart_timeline':
        content = <ChartTimelineWidget data={chartTimelineData ?? data?.chart_orders_timeline} loading={chartTimelineLoading} groupBy={chartTimelineGroupBy} days={chartTimelineDays} />;
        headerExtra = (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
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
          </div>
        );
        break;
      case 'top_suppliers':
        content = <TopSuppliersWidget suppliers={data?.top_suppliers} />;
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
        break;
      case 'annual_fees_due':
        content = <AnnualFeesDueWidget feesData={data?.annual_fees_due} navigate={navigate} />;
        badgeCount = (data?.annual_fees_due?.stats?.po_splatnosti || 0) + (data?.annual_fees_due?.stats?.blizi_se || 0);
        break;
      case 'cashbook_summary': {
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
        content = <ActiveUsersAdminWidget data={activeUsersData} navigate={navigate} />;
        badgeCount = activeUsersData?.count || 0;
        break;
      default:
        return null;
    }

    return (
      <WidgetCard key={tileId} $accent={cfg.color} $index={index} $span2={isSpan2}
        ref={tileId === 'active_users_admin' ? activeUsersRef : undefined}
      >
        <WidgetHeader>
          <WidgetTitle>
            <WidgetIcon $bg={cfg.color + '18'} $color={cfg.color}>
              <FontAwesomeIcon icon={cfg.icon} />
            </WidgetIcon>
            {cfg.title}
          </WidgetTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {headerExtra}
            {badgeCount > 0 && (
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
    if (isSuperAdmin) return [...base, 'active_users_admin'];
    return base;
  }, [allTiles, availableWidgets, isSuperAdmin]);

  // Render
  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>
            <FontAwesomeIcon icon={faHome} /> Dashboard <BetaBadge>BETA</BetaBadge>
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
          <PageTitle><FontAwesomeIcon icon={faHome} /> Dashboard <BetaBadge>BETA</BetaBadge></PageTitle>
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
    <PageWrapper>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={faHome} /> Dashboard <BetaBadge>BETA</BetaBadge>
        </PageTitle>
        
        {/* 🎯 RYCHLÉ ROLE-BASED DLAZDICE */}
        {(isSuperAdmin || getQuickTiles.length > 0) && (
          <QuickTiles>
            {/* Superadmin: aktivní uživatelé jako první */}
            {isSuperAdmin && (
              <SmartTooltip
                text={`Aktivní uživatelé${activeUsersData?.count > 0 ? ` (${activeUsersData.count})` : ''}`}
                icon="none"
                preferredPosition="bottom"
              >
                <QuickTile
                  onClick={() => activeUsersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  style={{ background: activeUsersData?.count > 0 ? 'rgba(29,78,216,0.15)' : undefined }}
                >
                  <QuickTileIcon><FontAwesomeIcon icon={faUsers} /></QuickTileIcon>
                  {activeUsersData?.count > 0 && <QuickTileCount>{activeUsersData.count}</QuickTileCount>}
                </QuickTile>
              </SmartTooltip>
            )}
            {getQuickTiles.map((tile, idx) => (
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
          {hasAdminRole() && (
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
      <div style={{ height: '2rem' }} />
    </PageWrapper>
  );
}
