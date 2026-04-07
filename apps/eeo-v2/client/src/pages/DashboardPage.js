/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { AuthContext } from '../context/AuthContext';
import { getDashboardData } from '../services/apiDashboard';
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
  faFileContract, faComments
} from '@fortawesome/free-solid-svg-icons';
import { SmartTooltip } from '../styles/SmartTooltip';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// ============================================================================
// CONSTANTS
// ============================================================================

const WIDGET_REGISTRY = {
  welcome:             { title: 'Přehled',                 icon: faHome,               color: '#1d4ed8', roles: ['all'] },
  orders_stats:        { title: 'Statistiky objednávek',   icon: faChartBar,           color: '#1d4ed8', roles: ['all'] },
  my_orders:           { title: 'Moje objednávky',         icon: faShoppingCart,        color: '#2563eb', roles: ['all'] },
  my_invoices:         { title: 'Faktury k potvrzení',     icon: faFileInvoiceDollar,  color: '#7c3aed', roles: ['invoice'] },
  orders_approval:     { title: 'Ke schválení',            icon: faGavel,              color: '#dc2626', roles: ['approver'] },
  invoices_overdue:    { title: 'Faktury po splatnosti',   icon: faExclamationCircle,  color: '#dc2626', roles: ['approver', 'invoice'] },
  invoices_due_soon:   { title: 'Faktury blížící se spl.', icon: faCalendarAlt,        color: '#f97316', roles: ['approver', 'invoice'] },
  orders_registry:     { title: 'Ke zveřejnění (VZ)',      icon: faGlobe,              color: '#059669', roles: ['registry'] },
  orders_published:    { title: 'Zveřejněné objednávky',   icon: faCheckCircle,        color: '#10b981', roles: ['registry'] },
  alerts:              { title: 'Upozornění',              icon: faExclamationTriangle,color: '#f59e0b', roles: ['all'] },
  notifications:       { title: 'Notifikace',              icon: faBell,               color: '#6366f1', roles: ['all'] },
  chart_timeline:      { title: 'Objednávky v čase',       icon: faChartBar,           color: '#0891b2', roles: ['all'] },
  top_suppliers:       { title: 'Top dodavatelé',           icon: faTruck,              color: '#b45309', roles: ['all'] },
  smlouvy_critical:    { title: 'Smlouvy - kritický stav',  icon: faFileContract,       color: '#dc2626', roles: ['all'] },
  lp_critical:         { title: 'LP - kritický stav',       icon: faMoneyBillWave,      color: '#dc2626', roles: ['all'] },
  order_comments:      { title: 'Komentáře k objednávkám',  icon: faComments,           color: '#6366f1', roles: ['all'] },
  invoices_stats:      { title: 'Statistiky faktur',         icon: faFileInvoiceDollar,  color: '#7c3aed', roles: ['invoice', 'approver'] }
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
  margin-top: 1.5rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
  @media (min-width: 768px) and (max-width: 1199px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1200px) and (max-width: 1599px) { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 1600px) { grid-template-columns: repeat(4, 1fr); }
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

const WidgetBody = styled.div`
  padding: 0.5rem 1.25rem 1.25rem;
  max-height: ${p => p.$noScroll ? 'none' : '280px'};
  overflow-y: ${p => p.$noScroll ? 'visible' : 'auto'};
  
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
  width: 520px;
  max-width: 95vw;
  max-height: 80vh;
  overflow: auto;
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
  padding: 1rem 1.5rem 1.5rem;
`;

const ConfigItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.5rem;
  border-radius: 8px;
  border-bottom: 1px solid ${theme.colors.gray100};
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
  SCHVALENA: { bg: '#dcfce7', color: '#166534' },
  ZAMITNUTA: { bg: '#e5e7eb', color: '#6b7280' },
  ROZPRACOVANA: { bg: '#fef3c7', color: '#b45309' },
  ODESLANA: { bg: '#e0f2fe', color: '#0284c7' },
  VECNA_SPRAVNOST: { bg: '#fce7f3', color: '#be185d' },
  DOKONCENA: { bg: '#d1fae5', color: '#059669' },
  ZRUSENA: { bg: '#f3f4f6', color: '#9ca3af' }
};

const getStatusBadge = (stav) => {
  const s = STATUS_COLORS[stav] || { bg: '#f3f4f6', color: '#6b7280' };
  return s;
};

// ============================================================================
// WIDGET COMPONENTS
// ============================================================================

function WelcomeWidget({ user, rolesDetected }) {
  const roleLabels = [];
  if (rolesDetected?.is_admin) roleLabels.push('Administrátor');
  if (rolesDetected?.has_order_approve) roleLabels.push('Příkazce');
  if (rolesDetected?.has_spending) roleLabels.push('Správce rozpočtu');
  if (rolesDetected?.has_invoice_manage) roleLabels.push('Účetní');
  if (rolesDetected?.has_registry) roleLabels.push('Veřejné zakázky');

  const today = new Date();
  const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];

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
        </WelcomeInfo>
      </WelcomeRow>
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
              <Badge $bg={sb.bg} $color={sb.color}>{stav}</Badge>
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
    'exclamation-circle': faExclamationCircle
  };

  const alertInfoMap = {
    'Objednávky v prodlení': 'Objednávky, u kterých nedošlo\nk žádné akci déle než 7 dní.\nZkontrolujte stav a posuňte\nje v procesu dál.',
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
              'Objednávky v prodlení':  { link: '/orders25-list-v3',  state: { dashboardFilter: 'fakturace_prodleni', clearFilters: true } },
              'Nepotvrzené faktury':    { link: '/invoices25-list',   state: { dashboardFilter: 'unpaid',              clearFilters: true } },
              'Faktury po splatnosti':  { link: '/invoices25-list',   state: { dashboardFilter: 'overdue',             clearFilters: true } },
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

function ChartTimelineWidget({ data }) {
  if (!data || data.length === 0) {
    return <WidgetBody><EmptyState>Nedostatek dat pro graf</EmptyState></WidgetBody>;
  }

  const chartData = {
    labels: data.map(d => {
      const dt = new Date(d.den);
      return dt.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
    }),
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
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} obj.` } } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <WidgetBody $noScroll>
      <div style={{ height: 200 }}>
        <Bar data={chartData} options={options} />
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

function RegistryWidget({ ordersForRegistry, ordersPublished, navigate, filterPreset }) {
  return (
    <WidgetBody>
      {(!ordersForRegistry || ordersForRegistry.length === 0) ? (
        <EmptyState>Žádné objednávky ke zveřejnění</EmptyState>
      ) : (
        <>
          {ordersForRegistry.map(o => {
            const objednavatel = o.objednavatel_jmeno ? `${o.objednavatel_jmeno} ${o.objednavatel_prijmeni || ''}`.trim() : '';
            return (
              <ListItem key={o.id} onClick={() => navigate(`/order-form-25?edit=${o.id}`, { state: { returnTo: '/dashboard' } })}>
                <ListItemLeft>
                  <ListItemTitle>{o.cislo_objednavky || `#${o.id}`}</ListItemTitle>
                  <ListItemSub>{o.predmet}</ListItemSub>
                  {objednavatel && <ListItemMeta>Obj: {objednavatel}</ListItemMeta>}
                </ListItemLeft>
                <ListItemRight>
                  <Amount>{formatCurrency(o.celkova_cena_s_dph)}</Amount>
                </ListItemRight>
              </ListItem>
            );
          })}
        </>
      )}
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
          tags.push(<CriticalTag key="t" $type="UKONCENA">{dnu > 0 ? `${dnu} dní` : 'Dnes končí'}</CriticalTag>);
        } else if (s.typ_kriticky === 'KONCI_DO_MESICE') {
          tags.push(<CriticalTag key="t" $type="BRZY_KONCI">{dnu} dní</CriticalTag>);
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
    return <WidgetBody><EmptyState>Žádné LP v kritickém stavu</EmptyState></WidgetBody>;
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
        <EmptyState>Žádné LP k zobrazení</EmptyState>
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
              <ListItemTitle>{lp.cislo_lp || `LP #${lp.id}`}</ListItemTitle>
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
              Po splatnosti: <strong>{formatCurrency(stats.castka_po_splatnosti)}</strong>
            </span>
          )}
        </div>
      )}
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
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { token, user, userDetail, hasPermission, hasAdminRole, userPermissions } = useContext(AuthContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [visibleTiles, setVisibleTiles] = useState(DEFAULT_TILES);
  const [allTiles, setAllTiles] = useState(DEFAULT_TILES);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_auto_refresh');
      return saved === 'true';
    } catch { return false; }
  });

  const username = user?.username;

  // Determine available widgets based on roles
  const availableWidgets = useMemo(() => {
    const isAdmin = hasAdminRole();
    const perms = userPermissions || [];
    const hasInvoice = perms.includes('INVOICE_MANAGE') || perms.includes('INVOICE_MATERIAL_CHECK') || perms.includes('FIN_CONTROL_MANAGE') || isAdmin;
    const hasApprover = perms.includes('ORDER_APPROVE') || perms.includes('ORDER_APPROVE_ALL') || isAdmin;
    const hasRegistry = perms.includes('ORDER_REGISTRY_MANAGE') || isAdmin;

    return Object.entries(WIDGET_REGISTRY)
      .filter(([, cfg]) => {
        if (cfg.roles.includes('all')) return true;
        if (cfg.roles.includes('invoice') && hasInvoice) return true;
        if (cfg.roles.includes('approver') && hasApprover) return true;
        if (cfg.roles.includes('registry') && hasRegistry) return true;
        return false;
      })
      .map(([id]) => id);
  }, [userPermissions, hasAdminRole]);

  // Load dashboard config from user settings + merge new widgets
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(`dashboard_config_${user?.id || 'default'}`);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        const savedTiles = parsed.tiles || [];
        const savedVisible = parsed.visible || [];
        // Merge new widgets that don't exist in saved config
        const newWidgets = DEFAULT_TILES.filter(t => !savedTiles.includes(t));
        if (newWidgets.length > 0) {
          const merged = [...savedTiles, ...newWidgets];
          const mergedVisible = [...savedVisible, ...newWidgets];
          setAllTiles(merged);
          setVisibleTiles(mergedVisible);
          localStorage.setItem(`dashboard_config_${user?.id || 'default'}`, JSON.stringify({ tiles: merged, visible: mergedVisible }));
        } else {
          setAllTiles(savedTiles);
          setVisibleTiles(savedVisible);
        }
      }
    } catch (e) { /* ignore */ }
  }, [user?.id]);

  // Save config
  const saveConfig = useCallback((tiles, visible) => {
    try {
      localStorage.setItem(`dashboard_config_${user?.id || 'default'}`, JSON.stringify({ tiles, visible }));
    } catch (e) { /* ignore */ }
  }, [user?.id]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!token || !username) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardData({ token, username, days: 7 });
      if (result.status === 'success') {
        setData(result.data);
      } else {
        setError(result.message || 'Chyba při načítání dat');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Chyba při načítání dashboardu');
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh každých 5 minut (pokud je zapnutý)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      console.log('🔄 Dashboard auto-refresh (5 min)');
      fetchData();
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
    if (!userDetail?.roles || !data?.orders_stats) return [];

    const roles = userDetail.roles.map(r => r.kod_role);
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
      'k_uverejneni_do_registru': '🌐'
    };

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

    // THP/PES/VRCHNI/PRIMAR role: rozpracovana, schvalena, vecna_spravnost
    if (roles.includes('THP') || roles.includes('PES') || roles.includes('VRCHNI') || roles.includes('PRIMAR')) {
      tiles.push(
        { label: 'Schválené', count: stats.schvalena || 0, filter: 'schvalena', icon: icons.schvalena },
        { label: 'Rozpracované', count: stats.rozpracovana || 0, filter: 'rozpracovana', icon: icons.rozpracovana },
        { label: 'Věcná správnost', count: stats.vecna_spravnost || 0, filter: 'vecna_spravnost', icon: icons.vecna_spravnost }
      );
    }

    // Příkazce: ke_schvaleni, zkontrolovana
    if (roles.includes('PRIKAZCE')) {
      tiles.push(
        { label: 'Ke schválení', count: stats.ke_schvaleni || 0, filter: 'ke_schvaleni', icon: icons.ke_schvaleni },
        { label: 'Zkontrolováno', count: stats.zkontrolovana || 0, filter: 'zkontrolovana', icon: icons.zkontrolovana }
      );
    }

    // Správce rozpočtu: ke_schvaleni, zkontrolovana, dokoncena
    if (roles.includes('SPRAVCE_ROZPOCTU')) {
      tiles.push(
        { label: 'Ke schválení', count: stats.ke_schvaleni || 0, filter: 'ke_schvaleni', icon: icons.ke_schvaleni },
        { label: 'Zkontrolováno', count: stats.zkontrolovana || 0, filter: 'zkontrolovana', icon: icons.zkontrolovana },
        { label: 'Dokončeno', count: stats.dokoncena || 0, filter: 'dokoncena', icon: icons.dokoncena }
      );
    }

    // Hlavní účetní, účetní: fakturace, k_uverejneni_do_registru
    if (roles.includes('HLAVNI_UCETNI') || roles.includes('UCETNI')) {
      tiles.push(
        { label: 'Fakturace', count: stats.fakturace || 0, filter: 'fakturace', icon: icons.fakturace },
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
    if (!visibleTiles.includes(tileId)) return null;
    if (!availableWidgets.includes(tileId)) return null;
    const cfg = WIDGET_REGISTRY[tileId];
    if (!cfg) return null;

    const isSpan2 = tileId === 'orders_stats' || tileId === 'invoices_stats' || tileId === 'chart_timeline' || tileId === 'top_suppliers';

    let content = null;
    let badgeCount = null;

    switch (tileId) {
      case 'welcome':
        content = <WelcomeWidget user={data?.user} rolesDetected={data?.roles_detected} />;
        break;
      case 'orders_stats':
        content = <OrderStatsWidget stats={data?.orders_stats} navigate={navigate} />;
        break;
      case 'my_orders':
        content = <OrderListWidget orders={data?.my_orders_pending} navigate={navigate} filterPreset="moje_objednavky" />;
        badgeCount = data?.my_orders_pending?.length;
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
        content = <RegistryWidget ordersForRegistry={data?.orders_for_registry} ordersPublished={data?.orders_published_recent} navigate={navigate} filterPreset="k_uverejneni_do_registru" />;
        badgeCount = data?.orders_for_registry?.length;
        break;
      case 'orders_published':
        content = <OrderListWidget orders={data?.orders_published_recent} navigate={navigate} filterPreset="uverejnena" />;
        badgeCount = data?.orders_published_recent?.length;
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
        content = <ChartTimelineWidget data={data?.chart_orders_timeline} />;
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
      default:
        return null;
    }

    return (
      <WidgetCard key={tileId} $accent={cfg.color} $index={index} $span2={isSpan2}>
        <WidgetHeader>
          <WidgetTitle>
            <WidgetIcon $bg={cfg.color + '18'} $color={cfg.color}>
              <FontAwesomeIcon icon={cfg.icon} />
            </WidgetIcon>
            {cfg.title}
          </WidgetTitle>
          {badgeCount > 0 && (
            <WidgetBadge $bg={cfg.color + '18'} $color={cfg.color}>
              {badgeCount}
            </WidgetBadge>
          )}
        </WidgetHeader>
        {content}
      </WidgetCard>
    );
  };

  // Render
  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>
            <FontAwesomeIcon icon={faHome} /> Dashboard
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
          <PageTitle><FontAwesomeIcon icon={faHome} /> Dashboard</PageTitle>
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

  // Order tiles: priority sections first (Správce rozpočtu → Příkazce → Účetní → VZ → Běžný)
  const orderedTiles = allTiles.filter(t => availableWidgets.includes(t));

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>
          <FontAwesomeIcon icon={faHome} /> Dashboard
        </PageTitle>
        
        {/* 🎯 RYCHLÉ ROLE-BASED DLAZDICE */}
        {getQuickTiles.length > 0 && (
          <QuickTiles>
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
        </HeaderActions>
      </PageHeader>

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
      <div style={{ height: '2rem' }} />
    </PageWrapper>
  );
}
