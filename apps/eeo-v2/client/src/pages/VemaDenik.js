/**
 * VEMA Deník - Hlavní stránka
 * Zobrazení importovaných dat z VEMA systému
 * 
 * Tabulky: 25v_firmyupl, 25v_fpazahl, 25v_smla
 * Právo: VEMA_VIEW
 * 
 * @author EEO Development Team
 * @date 2026-06-22
 */

import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding, faFileInvoice, faFileContract, faSearch, faTimes, 
  faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
  faChevronDown, faChevronUp, faUpload, faCheckCircle, faPlus, faMinus, faBoltLightning
} from '@fortawesome/free-solid-svg-icons';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import AuthContext from '../context/AuthContext';
import { loadVemaFirmy, loadVemaFaktury, loadVemaSmlouvy, loadEeoFakturyBezVema, formatExcelDate, uploadVemaFiles, truncateVemaData } from '../services/apiVema';
import VemaKontrolaCell from '../components/VemaKontrolaCell';
import { getVemaFakturaPropojeni } from '../services/apiVemaPropojeni';
import { fetchLimitovanePrisliby } from '../services/api2auth';
import { KONTROLA_STATUS, KONTROLA_STATUS_LABELS, KONTROLA_STATUS_COLORS, normalizeKontrolaStatus } from '../services/apiVemaKontrola';

// Priorita stavů kontroly pro třídění sloupce "Kontrola" (problémy první, hotovo poslední)
const KONTROLA_STATUS_SORT_PRIORITY = {
  [KONTROLA_STATUS.NELZE_VYRESIT]: 1,
  [KONTROLA_STATUS.V_RESENI]: 2,
  [KONTROLA_STATUS.NEZKONTROLOVANO]: 3,
  [KONTROLA_STATUS.V_PORADKU]: 4,
};

// Sdílená sortingFn pro sloupec "Kontrola" - třídí podle priority stavu, ne alfabeticky
const kontrolaSortingFn = (rowA, rowB) => {
  const priorityA = KONTROLA_STATUS_SORT_PRIORITY[normalizeKontrolaStatus(rowA.original.kontrola)] || 99;
  const priorityB = KONTROLA_STATUS_SORT_PRIORITY[normalizeKontrolaStatus(rowB.original.kontrola)] || 99;
  return priorityA - priorityB;
};

// ============================================================================
// STYLED COMPONENTS - OrderV3 style
// ============================================================================

const Container = styled.div`
  padding: 1rem;
  background: #f8fafc;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #202d65 0%, #1a2555 100%);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const HeaderButton = styled.button`
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

const SubTitle = styled.p`
  color: rgba(255, 255, 255, 0.8);
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
`;

// Tabs
const TabsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
`;

const MainTab = styled.button`
  flex: 1 1 auto;
  padding: 0.75rem 1.5rem;
  border: none;
  background: ${props => props.$active ? '#202d65' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => props.$active ? '#202d65' : '#f1f5f9'};
  }
`;

const SecondaryTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
`;

const IconTab = styled.button`
  width: 42px;
  min-width: 42px;
  height: 42px;
  border: none;
  border-radius: 6px;
  background: ${props => props.$active ? '#202d65' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;

  &:hover {
    background: ${props => props.$active ? '#202d65' : '#f1f5f9'};
  }
`;

const FakturySubTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const FakturySubTab = styled.button`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.$active ? '#202d65' : '#cbd5e1'};
  background: ${props => props.$active ? '#202d65' : '#ffffff'};
  color: ${props => props.$active ? '#ffffff' : '#475569'};
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    border-color: #202d65;
    color: ${props => props.$active ? '#ffffff' : '#202d65'};
  }
`;

const BetaBadgeSmall = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.35rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.3)' : 'rgba(234, 179, 8, 0.2)'};
  color: ${props => props.$active ? 'rgba(255, 255, 255, 0.95)' : '#b45309'};
  border-radius: 3px;
  border: 1px solid ${props => props.$active ? 'rgba(255, 255, 255, 0.4)' : 'rgba(234, 179, 8, 0.4)'};
  flex-shrink: 0;
`;

const FAKTURY_SUB_SECTIONS = [
  { id: 'tabulka', label: 'Veškeré doklady' },
  { id: 'kontrola-obj', label: 'Kontrola OBJ' },
  { id: 'kontrola-obj-beta', label: 'Kontrola OBJ BETA', isBeta: true, requiredRoles: ['SUPERADMIN', 'administrator'] },
  { id: 'kontrola-sml', label: 'Kontrola SML' },
  { id: 'kontrola-rp', label: 'Kontrola ročních poplatků' },
  { id: 'vema-bez-eeo', label: 'VEMA doklady bez EEO dokladů' },
  { id: 'eeo-bez-vema', label: 'Faktury EEO bez VEMA dokladů' }
];

// Helper: Kontrola, zda má uživatel právo vidět danou sekci
const canAccessSection = (section, userDetail) => {
  if (!section.requiredRoles) return true;
  if (!userDetail?.roles) return false;
  return section.requiredRoles.some(role =>
    userDetail.roles.some(r => r.kod_role === role)
  );
};

const VEMA_ACTIVE_TAB_LS_KEY = 'eeo_vs_vema_active_tab';
const VEMA_FAKTURY_SUBTAB_LS_KEY = 'eeo_vs_vema_faktury_subtab';
const VEMA_MAIN_TABS = ['faktury', 'smlouvy', 'firmy'];

// Persistence sortování a filtrů (per-sekce)
const VEMA_SORTING_LS_KEY = 'eeo_vs_vema_sorting';
const VEMA_OBJ_SORTING_LS_KEY = 'eeo_vs_vema_obj_sorting';
const VEMA_BETA_SORTING_LS_KEY = 'eeo_vs_vema_beta_sorting';
const VEMA_BADGE_FILTER_LS_KEY = 'eeo_vs_vema_badge_filter';
const VEMA_WARNING_FILTER_LS_KEY = 'eeo_vs_vema_warning_filter';
const VEMA_KONTROLA_FILTER_LS_KEY = 'eeo_vs_vema_kontrola_filter';

const getStoredJSON = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored);
  } catch (error) {
    return fallback;
  }
};

const getStoredString = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored;
  } catch (error) {
    return fallback;
  }
};

const setStoredJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // localStorage může být nedostupný, ignorujeme
  }
};

const setStoredString = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // localStorage může být nedostupný, ignorujeme
  }
};

const getStoredMainTab = () => {
  if (typeof window === 'undefined') return 'faktury';
  try {
    const stored = localStorage.getItem(VEMA_ACTIVE_TAB_LS_KEY);
    return VEMA_MAIN_TABS.includes(stored) ? stored : 'faktury';
  } catch (error) {
    return 'faktury';
  }
};

const getStoredFakturySubTab = () => {
  if (typeof window === 'undefined') return 'tabulka';
  const allowed = FAKTURY_SUB_SECTIONS.map(section => section.id);
  try {
    const stored = localStorage.getItem(VEMA_FAKTURY_SUBTAB_LS_KEY);
    return allowed.includes(stored) ? stored : 'tabulka';
  } catch (error) {
    return 'tabulka';
  }
};

// Search
const SearchContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0;
`;

const SearchBox = styled.div`
  flex: 1;
  position: relative;
  
  > svg {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  height: 40px;
  box-sizing: border-box;
  padding: 0 0.75rem 0 2.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #202d65;
    box-shadow: 0 0 0 3px rgba(32, 45, 101, 0.1);
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;

  &:hover {
    color: #64748b;
  }
`;

const FilterToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
  contain: layout style;
`;

const FilterToolsRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
`;

const FilterStats = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
  flex: 0 0 auto;
  overflow-x: auto;
  max-width: 100%;
`;

// Table
const TableWrapper = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  max-width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  padding: 0.875rem;
  text-align: center;
  background: #202d65;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;

  &:hover {
    background: #2d4080;
  }
`;

const TableRow = styled.tr`
  background: ${props => props.$background || 'white'};
  
  &:hover {
    background: #f8fafc;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #1e293b;
`;

const Badge = styled.span`
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    if (props.$type === 'aktivni') return '#dcfce7';
    if (props.$type === 'smazano') return '#fee2e2';
    if (props.$type === 'neaktivni') return '#f3f4f6';
    return '#e5e7eb';
  }};
  color: ${props => {
    if (props.$type === 'aktivni') return '#166534';
    if (props.$type === 'smazano') return '#991b1b';
    if (props.$type === 'neaktivni') return '#6b7280';
    return '#374151';
  }};
`;

// Dashboard Kontroly
const DashboardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  margin-top: 1rem;
`;

const DashboardCard = styled.div`
  background: ${props => props.$active ? '#f0f9ff' : 'white'};
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: ${props => props.$active ? '0 0 0 2px ' + (props.$color || '#cbd5e1') : '0 2px 4px rgba(0, 0, 0, 0.1)'};
  border-left: 4px solid ${props => props.$color || '#cbd5e1'};
  transition: all 0.2s;
  cursor: pointer;
  user-select: none;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
`;

const DashboardValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.$color || '#1e293b'};
  margin-bottom: 0.5rem;
  font-variant-numeric: tabular-nums;
`;

const DashboardLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// Import Modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #202d65 0%, #1a2555 100%);
  border-radius: 12px 12px 0 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ModalClose = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1.25rem;
  transition: color 0.2s;

  &:hover {
    color: white;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const FileUploadSection = styled.div`
  margin-bottom: 1.5rem;
`;

const FileUploadLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const FileInput = styled.input`
  display: block;
  width: 100%;
  padding: 0.625rem;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #6b7280;
  cursor: pointer;
  background: #f9fafb;
  transition: all 0.2s;

  &:hover {
    border-color: #202d65;
    background: #f3f4f6;
  }

  &::file-selector-button {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #374151;
    font-weight: 600;
    cursor: pointer;
    margin-right: 0.75rem;
    transition: all 0.2s;

    &:hover {
      background: #f9fafb;
      border-color: #202d65;
    }
  }
`;

const ImportButton = styled.button`
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ProgressContainer = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const ProgressLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.$percent || 0}%;
`;

const ProgressPercent = styled.div`
  text-align: center;
  font-size: 0.75rem;
  color: #64748b;
`;

const InfoBox = styled.div`
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: #1e40af;
  line-height: 1.5;

  ul {
    margin: 0.5rem 0 0 1.5rem;
    padding: 0;
  }

  li {
    margin: 0.25rem 0;
  }
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
  padding: 0.5rem 0.875rem;
  border: 1px solid #e5e7eb;
  background: ${props => props.disabled ? '#f1f5f9' : 'white'};
  color: ${props => props.disabled ? '#94a3b8' : '#202d65'};
  font-weight: 600;
  border-radius: 6px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  font-size: 0.875rem;

  &:hover:not(:disabled) {
    background: #202d65;
    color: white;
    border-color: #202d65;
  }
`;

const PageSizeSelector = styled.select`
  padding: 0.5rem 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #202d65;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #202d65;
  }
`;

const LoadingOverlay = styled.div`
  text-align: center;
  padding: 3rem;
  color: #64748b;
  font-size: 1rem;
`;

const spinnerRotate = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingInline = styled.div`
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  color: #475569;
  font-size: 0.92rem;
  font-weight: 600;
`;

const LoadingSpinner = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid #cbd5e1;
  border-top-color: #2563eb;
  animation: ${spinnerRotate} 0.8s linear infinite;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin: 1rem 0;
`;

// Results Dialog Styled Components
const ResultsOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-center: center;
  z-index: 10000;
`;

const ResultsDialog = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const ResultsHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
`;

const ResultsBody = styled.div`
  padding: 1.5rem;
`;

const SummaryBox = styled.div`
  background: ${props => props.$success ? '#ecfdf5' : '#fef2f2'};
  border: 2px solid ${props => props.$success ? '#10b981' : '#ef4444'};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const SummaryTitle = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${props => props.$success ? '#065f46' : '#991b1b'};
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${props => {
    if (props.$type === 'success') return '#10b981';
    if (props.$type === 'error') return '#ef4444';
    return '#374151';
  }};
`;

const BatchInfo = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #6b7280;
  
  strong {
    color: #374151;
  }
`;

const ResultsFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
`;

const CloseButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

const VemaDenik = () => {
  const { token, username, userDetail } = useContext(AuthContext);

  // State
  const [activeTab, setActiveTab] = useState(getStoredMainTab); // 'firmy' | 'faktury' | 'smlouvy'
  const [fakturySubTab, setFakturySubTab] = useState(getStoredFakturySubTab);
  const [loading, setLoading] = useState(true); // Initial load = true
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Pro okamžitou aktualizaci inputu
  const [badgeFilter, setBadgeFilter] = useState(() => getStoredString(VEMA_BADGE_FILTER_LS_KEY, 'all')); // all | 0 | 1 | 2 | 3plus
  const [warningOnlyFilter, setWarningOnlyFilter] = useState(() => getStoredJSON(VEMA_WARNING_FILTER_LS_KEY, false));
  // Filtr podle dlaždice kontroly (klik na widget) - null | 'zkontrolovano' | 'v_kontrole' | 'nezkontrolovano' | 'varovani'
  const [kontrolaFilter, setKontrolaFilter] = useState(() => getStoredString(VEMA_KONTROLA_FILTER_LS_KEY, null));

  // BETA Kontrola OBJ - nezávislá je POUZE stránkování a třídění, filtry jsou sdílené s OBJ
  const [betaPageIndex, setBetaPageIndex] = useState(0);
  const [betaPageSize, setBetaPageSize] = useState(50);
  const [betaSorting, setBetaSorting] = useState(() => getStoredJSON(VEMA_BETA_SORTING_LS_KEY, []));

  // Data
  const [firmyData, setFirmyData] = useState([]);
  const [fakturyData, setFakturyData] = useState([]);
  const [smlouvyData, setSmlouvyData] = useState([]);
  const [eeoBezVemaData, setEeoBezVemaData] = useState([]);
  const [eeoBezVemaLoading, setEeoBezVemaLoading] = useState(false);
  
  // Cache markery - true znamená "už načteno, nezatěžovat server"
  const [dataLoaded, setDataLoaded] = useState({ firmy: false, faktury: false, smlouvy: false });
  // Aktuální search pro který jsou data v cache (když se search změní, cache se invaliduje)
  const [cachedSearch, setCachedSearch] = useState('');

  // Expandable rows - propojení VEMA-EEO
  const [expanded, setExpanded] = useState({});
  const [propojenData, setPropojenData] = useState({}); // Ukládá propojené záznamy pro každý řádek
  const [loadingPropojeni, setLoadingPropojeni] = useState({}); // Loading state pro každý řádek

  // LP seznam pro parsing financování
  const [lpSeznam, setLpSeznam] = useState([]);
  const [lpLoaded, setLpLoaded] = useState(false);

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sorting, setSorting] = useState(() => getStoredJSON(VEMA_SORTING_LS_KEY, []));

  // Sorting oddělený pro OBJ (aby zůstalo nezávislé od BETA)
  const [objSorting, setObjSorting] = useState(() => getStoredJSON(VEMA_OBJ_SORTING_LS_KEY, []));

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [firmyuplFile, setFirmyuplFile] = useState(null);
  const [fpazahlFile, setFpazahlFile] = useState(null);
  const [smlaFile, setSmlaFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);

  // Truncate state
  const [showTruncateModal, setShowTruncateModal] = useState(false);
  const [truncating, setTruncating] = useState(false);

  // Load data based on active tab
  // Strategy:
  // 1. Při prvním načtení (a po změně search) → načti VŠECHNY 3 taby paralelně
  //    => okamžitě se zobrazí počty v ouškách + přepínání je instant
  // 2. Při přepnutí na tab který už je v cache → nic se nenačítá (instant)
  // 3. Při změně search → invaliduj cache a načti znovu vše
  
  // Debounced search - spustí se až 500ms po posledním stisku klávesy
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Perzistence aktivního ouška
  useEffect(() => {
    try {
      localStorage.setItem(VEMA_ACTIVE_TAB_LS_KEY, activeTab);
    } catch (error) {
      // localStorage může být nedostupný (privacy mode, SSR), ignorujeme
    }
  }, [activeTab]);

  // Perzistence aktivního pod-ouška faktur
  useEffect(() => {
    try {
      localStorage.setItem(VEMA_FAKTURY_SUBTAB_LS_KEY, fakturySubTab);
    } catch (error) {
      // localStorage může být nedostupný (privacy mode, SSR), ignorujeme
    }
  }, [fakturySubTab]);

  // Perzistence třídění (per-sekce) a filtrů (sdílené mezi OBJ a OBJ BETA), aby přežily reload stránky
  useEffect(() => { setStoredJSON(VEMA_SORTING_LS_KEY, sorting); }, [sorting]);
  useEffect(() => { setStoredJSON(VEMA_OBJ_SORTING_LS_KEY, objSorting); }, [objSorting]);
  useEffect(() => { setStoredJSON(VEMA_BETA_SORTING_LS_KEY, betaSorting); }, [betaSorting]);
  useEffect(() => { setStoredString(VEMA_BADGE_FILTER_LS_KEY, badgeFilter); }, [badgeFilter]);
  useEffect(() => { setStoredJSON(VEMA_WARNING_FILTER_LS_KEY, warningOnlyFilter); }, [warningOnlyFilter]);
  useEffect(() => {
    if (kontrolaFilter === null) { try { localStorage.removeItem(VEMA_KONTROLA_FILTER_LS_KEY); } catch (e) {} }
    else setStoredString(VEMA_KONTROLA_FILTER_LS_KEY, kontrolaFilter);
  }, [kontrolaFilter]);

  // Load LP seznam pro parsing financování
  useEffect(() => {
    if (!token || !username || lpLoaded) return;
    
    const loadLP = async () => {
      try {
        const response = await fetchLimitovanePrisliby({ token, username });
        if (response && Array.isArray(response)) {
          setLpSeznam(response);
          setLpLoaded(true);
        }
      } catch (err) {
        console.error('Chyba načítání LP seznamu:', err);
        // Nefatální chyba - parsování financování bude fallback na kódy
      }
    };
    
    loadLP();
  }, [token, username, lpLoaded]);
  
  useEffect(() => {
    if (!token || !username) return;

    let cancelled = false;

    // Detekce změny searche → musíme vždy znovu načíst data ze serveru
    const searchChanged = search !== cachedSearch;

    // Pokud aktuální tab už má data v cache a search se nezměnil → nic neděláme
    const isCached = dataLoaded[activeTab] && !searchChanged;
    if (isCached) {
      setLoading(false);
      return;
    }

    // Načíst všechny chybějící taby paralelně (typicky první load nebo změna search)
    const loadAllMissing = async () => {
      setLoading(true);
      setError(null);

      try {
        const promises = [];
        const labels = [];

        // Pokud se změnil search → načti VŠECHNY 3 taby (cache je neaktuální)
        // Jinak → načti jen ty, které ještě nejsou v cache
        const shouldLoadAll = searchChanged;

        if (shouldLoadAll || !dataLoaded.firmy) {
          promises.push(loadVemaFirmy({ token, username, limit: 50000, offset: 0, search }));
          labels.push('firmy');
        } else {
          promises.push(null);
          labels.push(null);
        }

        if (shouldLoadAll || !dataLoaded.faktury) {
          promises.push(loadVemaFaktury({ token, username, limit: 50000, offset: 0, search }));
          labels.push('faktury');
        } else {
          promises.push(null);
          labels.push(null);
        }

        if (shouldLoadAll || !dataLoaded.smlouvy) {
          promises.push(loadVemaSmlouvy({ token, username, limit: 50000, offset: 0, search }));
          labels.push('smlouvy');
        } else {
          promises.push(null);
          labels.push(null);
        }

        const results = await Promise.allSettled(promises.map(p => p || Promise.resolve(null)));
        if (cancelled) return;

        // Pokud se search změnil → reset cache flag a uložení nového search
        const newLoaded = shouldLoadAll
          ? { firmy: false, faktury: false, smlouvy: false }
          : { ...dataLoaded };
        const failedTabs = [];

        results.forEach((result, idx) => {
          if (!labels[idx]) return;

          if (result.status === 'fulfilled' && result.value) {
            const data = result.value.data || [];
            if (labels[idx] === 'firmy') setFirmyData(data);
            else if (labels[idx] === 'faktury') setFakturyData(data);
            else if (labels[idx] === 'smlouvy') setSmlouvyData(data);
            newLoaded[labels[idx]] = true;
            return;
          }

          failedTabs.push(labels[idx]);
        });

        setDataLoaded(newLoaded);
        if (searchChanged) setCachedSearch(search);

        if (failedTabs.length > 0) {
          setError(`Nepodařilo se načíst: ${failedTabs.join(', ')}`);
        }
      } catch (err) {
        console.error('Error loading VEMA data:', err);
        if (!cancelled) setError(err.message || 'Chyba při načítání dat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAllMissing();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, username, search]);

  // Načtení EEO faktur bez vazby na VEMA import
  useEffect(() => {
    if (!token || !username) return;
    if (activeTab !== 'faktury' || fakturySubTab !== 'eeo-bez-vema') return;

    let cancelled = false;

    const loadEeoBezVema = async () => {
      setEeoBezVemaLoading(true);

      try {
        const resp = await loadEeoFakturyBezVema({
            token,
            username,
            limit: 50000,
            offset: 0,
            search
        });

        if (!cancelled) {
          setEeoBezVemaData(resp?.data || []);
        }
      } catch (err) {
        console.error('Chyba načítání EEO bez VEMA:', err);
        if (!cancelled) {
          setError(err.message || 'Chyba při načítání EEO faktur bez vazby na VEMA');
          setEeoBezVemaData([]);
        }
      } finally {
        if (!cancelled) setEeoBezVemaLoading(false);
      }
    };

    loadEeoBezVema();

    return () => {
      cancelled = true;
    };
  }, [activeTab, fakturySubTab, token, username, search]);

  // Import handler
  const handleImport = async () => {
    if (!firmyuplFile || !fpazahlFile || !smlaFile) {
      alert('Musíte nahrát všechny 3 soubory!');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const result = await uploadVemaFiles({
        token,
        username,
        firmyuplFile,
        fpazahlFile,
        smlaFile,
        onProgress: (percent) => setImportProgress(percent)
      });

      // Zobrazit results dialog místo alert()
      setImportResults(result.data);
      setShowResultsDialog(true);

      // Reset a refresh dat
      setShowImportModal(false);
      setFirmyuplFile(null);
      setFpazahlFile(null);
      setSmlaFile(null);
      setImportProgress(0);

      // Reload VŠECH dat po importu (ne jen aktivní záložky)
      console.log('🔄 Reload všech VEMA dat po importu...');
      const [firmyResp, fakturyResp, smlouvyResp] = await Promise.allSettled([
        loadVemaFirmy({ token, username, limit: 50000, offset: 0, search: '' }),
        loadVemaFaktury({ token, username, limit: 50000, offset: 0, search: '' }),
        loadVemaSmlouvy({ token, username, limit: 50000, offset: 0, search: '' })
      ]);

      const firmyData = firmyResp.status === 'fulfilled' ? (firmyResp.value?.data || []) : [];
      const fakturyData = fakturyResp.status === 'fulfilled' ? (fakturyResp.value?.data || []) : [];
      const smlouvyData = smlouvyResp.status === 'fulfilled' ? (smlouvyResp.value?.data || []) : [];

      console.log('📊 Firmy:', firmyData.length);
      console.log('📄 Faktury:', fakturyData.length);
      console.log('📋 Smlouvy:', smlouvyData.length);
      setFirmyData(firmyData);
      setFakturyData(fakturyData);
      setSmlouvyData(smlouvyData);

      if (firmyResp.status === 'rejected' || fakturyResp.status === 'rejected' || smlouvyResp.status === 'rejected') {
        setError('Některá data se po importu nepodařilo znovu načíst.');
      }
      // Cache je aktuální = všechny taby naplněné
      setDataLoaded({ firmy: true, faktury: true, smlouvy: true });

    } catch (err) {
      console.error('Import error:', err);
      alert('❌ Chyba při importu:\n' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Truncate handler
  const handleTruncate = async () => {
    if (!window.confirm('⚠️ POZOR!\n\nOpravdu chcete SMAZAT všechna VEMA data?\n\nTato akce je NEVRATNÁ!\n\n- Firmy\n- Faktury\n- Smlouvy\n\nBudou odstraněny VŠECHNY záznamy!')) {
      return;
    }

    setTruncating(true);

    try {
      const result = await truncateVemaData({ token, username });
      
      alert(`✅ VEMA data byla úspěšně smazána!\n\nSmazáno:\n- Firmy: ${result.deleted_counts.firmyupl}\n- Faktury: ${result.deleted_counts.fpazahl}\n- Smlouvy: ${result.deleted_counts.smla}\n\nCelkem: ${result.deleted_counts.total} záznamů`);

      // Reload empty data
      setFirmyData([]);
      setFakturyData([]);
      setSmlouvyData([]);
      setDataLoaded({ firmy: true, faktury: true, smlouvy: true });
      setShowTruncateModal(false);

    } catch (err) {
      console.error('Truncate error:', err);
      alert('❌ Chyba při mazání dat:\n' + err.message);
    } finally {
      setTruncating(false);
    }
  };

  // ============================================================================
  // TABLE DEFINITIONS
  // ============================================================================

  // Firmy columns
  const firmyColumns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
      cell: info => <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{info.getValue()}</span>
    },
    {
      accessorKey: 'nazev',
      header: 'Název firmy',
      size: 250,
      cell: info => info.getValue() || '-'
    },
    {
      accessorKey: 'ico',
      header: 'IČO',
      size: 100,
      cell: info => info.getValue() || '-'
    },
    {
      accessorKey: 'obec',
      header: 'Obec',
      size: 150,
      cell: info => info.getValue() || '-'
    },
    {
      accessorKey: 'email',
      header: 'Email',
      size: 200,
      cell: info => info.getValue() || '-'
    },
    {
      accessorKey: 'stav',
      header: 'Stav',
      size: 80,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        
        // Mapování stavů na ikony (backend vrací bez diakritiky!)
        const stavMap = {
          'aktivni': { icon: '●', color: '#22c55e' },
          'aktivní': { icon: '●', color: '#22c55e' },
          'importovano': { icon: '●', color: '#22c55e' },
          'importováno': { icon: '●', color: '#22c55e' },
          'ok': { icon: '●', color: '#22c55e' },
          'zruseno': { icon: '✖', color: '#ef4444' },
          'zrušeno': { icon: '✖', color: '#ef4444' },
          'chyba': { icon: '✖', color: '#ef4444' },
          'zmena': { icon: '▲', color: '#f59e0b' },
          'změna': { icon: '▲', color: '#f59e0b' },
          'v_procesu': { icon: '◐', color: '#3b82f6' }
        };
        
        const stav = stavMap[val.toLowerCase()] || { icon: '●', color: '#94a3b8' };
        
        return (
          <span 
            title={val}
            style={{ 
              fontSize: '1.8em',
              color: stav.color,
              cursor: 'help',
              display: 'inline-block',
              fontWeight: 'bold',
              lineHeight: '1'
            }}
          >
            {stav.icon}
          </span>
        );
      }
    },
    {
      accessorKey: 'dt_importu',
      header: 'Importováno',
      size: 140,
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('cs-CZ', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
    },
    {
      accessorKey: 'kontrola',
      header: 'Kontrola',
      size: 100,
      minSize: 100,
      maxSize: 100,
      enableSorting: true,
      sortingFn: kontrolaSortingFn,
      cell: info => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VemaKontrolaCell
            typZaznamu="firma"
            vemaId={info.row.original.firma}
            token={token}
            username={username}
          />
        </div>
      )
    }
  ], [token, username]);

  // Načtení propojení VEMA-EEO
  const loadPropojeni = async (row) => {
    const rowId = row.id;
    
    // Pokud už máme data, nebudeme je znovu načítat
    if (propojenData[rowId]) {
      return;
    }

    setLoadingPropojeni(prev => ({ ...prev, [rowId]: true }));

    try {
      if (row.original._groupedKontrola && Array.isArray(row.original._groupInvoices)) {
        const groupInvoices = row.original._groupInvoices;

        const buildVemaPayload = (source) => ({
          cfak: source.cfak,
          cobj: source.cobj,
          csml: source.csml,
          vsymb: source.vsymb,
          cdok: source.cdok,
          smlouva_ecsml: source.smlouva_ecsml,
          cobj_formatovane: source.cobj_formatovane,
          celkem: source.celkem
        });

        const responses = await Promise.all(
          groupInvoices.map(async (inv) => {
            try {
              return await getVemaFakturaPropojeni(buildVemaPayload(inv), token, username);
            } catch (e) {
              console.warn('Nepodařilo se načíst propojení pro fakturu ve skupině:', inv?.cfak, e);
              return null;
            }
          })
        );

        const dedupeBy = (items, keyBuilder) => {
          const map = new Map();
          items.forEach((item, idx) => {
            const key = keyBuilder(item, idx);
            if (!map.has(key)) {
              map.set(key, item);
            }
          });
          return Array.from(map.values());
        };

        const objednavkyRaw = responses.flatMap((r) => r?.objednavky || []);
        const fakturyRaw = responses.flatMap((r) => r?.faktury || []);
        const smlouvyRaw = responses.flatMap((r) => r?.smlouvy || []);
        const rocniRaw = responses.flatMap((r) => r?.rocni_poplatky || []);

        const objednavky = dedupeBy(objednavkyRaw, (item, idx) =>
          item?.id ? `obj:${item.id}` : (item?.id_objednavky ? `obj:${item.id_objednavky}` : `obj-fallback:${item?.cislo_objednavky || idx}`)
        );
        const faktury = dedupeBy(fakturyRaw, (item, idx) =>
          item?.id ? `fa:${item.id}` : (item?.id_faktury ? `fa:${item.id_faktury}` : `fa-fallback:${item?.cislo_faktury || item?.fa_vema_kod || idx}`)
        );
        const smlouvy = dedupeBy(smlouvyRaw, (item, idx) =>
          item?.id ? `sml:${item.id}` : (item?.id_smlouvy ? `sml:${item.id_smlouvy}` : `sml-fallback:${item?.cislo_smlouvy || item?.evidencni_cislo || idx}`)
        );
        const rocni_poplatky = dedupeBy(rocniRaw, (item, idx) =>
          item?.id ? `rp:${item.id}` : (item?.id_rocni_poplatek ? `rp:${item.id_rocni_poplatek}` : `rp-fallback:${item?.cislo_dokladu || item?.faktura_id || idx}`)
        );

        const data = {
          objednavky,
          faktury,
          smlouvy,
          rocni_poplatky,
          // konzistentně s běžným řádkem nepočítáme smlouvy do celkem
          celkem: objednavky.length + faktury.length + rocni_poplatky.length
        };

        setPropojenData(prev => ({
          ...prev,
          [rowId]: data
        }));

        return;
      }

      const vemaFaktura = {
        cfak: row.original.cfak,
        cobj: row.original.cobj,
        csml: row.original.csml,
        vsymb: row.original.vsymb,
        cdok: row.original.cdok,
        smlouva_ecsml: row.original.smlouva_ecsml,
        cobj_formatovane: row.original.cobj_formatovane,
        celkem: row.original.celkem  // ✅ PŘIDAT ČÁSTKU pro matchování
      };

      const data = await getVemaFakturaPropojeni(vemaFaktura, token, username);
      
      setPropojenData(prev => ({
        ...prev,
        [rowId]: data
      }));
    } catch (error) {
      console.error('Chyba při načítání propojení:', error);
      setPropojenData(prev => ({
        ...prev,
        [rowId]: { objednavky: [], faktury: [], smlouvy: [], celkem: 0, error: true }
      }));
    } finally {
      setLoadingPropojeni(prev => ({ ...prev, [rowId]: false }));
    }
  };

  // Faktury columns
  const fakturyColumns = useMemo(() => [
    {
      id: 'expander',
      header: '',
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableSorting: false,
      cell: ({ row }) => {
        const includeRocniPoplatkyInBadge = !(fakturySubTab === 'kontrola-obj' || fakturySubTab === 'kontrola-sml');
        const warningModeObj = fakturySubTab === 'kontrola-obj';
        const warningModeSml = fakturySubTab === 'kontrola-sml';

        if (row.original._groupedKontrola && Array.isArray(row.original._groupInvoices)) {
          const rowId = row.id;
          const isExpanded = row.getIsExpanded();
          const propojeni = propojenData[rowId];
          const isLoading = loadingPropojeni[rowId];
          const hasWarning = warningModeObj
            ? !!row.original._groupHasChybaObj
            : (warningModeSml
                ? !!row.original._groupHasChybaSml
                : (!!row.original._groupHasChybaObj || !!row.original._groupHasChybaSml));
          const precomputedCount = Array.isArray(row.original._groupInvoices)
            ? row.original._groupInvoices.reduce((max, item) => {
                const pocetObj = Number(item?.pocet_objednavek || 0);
                const pocetFa = Number(item?.pocet_faktur || 0);
                const pocetRp = Number(item?.pocet_rocnich_poplatku || 0);
                const rowCount = includeRocniPoplatkyInBadge
                  ? (pocetObj + pocetFa + pocetRp)
                  : (pocetObj + pocetFa);
                return Math.max(max, rowCount);
              }, 0)
            : Number(row.original._groupPrecomputedLinksCount || 0);
          const displayCount = precomputedCount;
          const isEmpty = precomputedCount === 0;

          if (isEmpty) {
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  disabled
                  title="Žádné propojené záznamy"
                  style={{
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    width: '22px',
                    cursor: 'not-allowed',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    flexShrink: 0,
                    padding: '1px 0',
                    gap: 0,
                    lineHeight: 1,
                    opacity: 0.5
                  }}
                >
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>0</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>+</span>
                </button>
              </div>
            );
          }

          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isExpanded && !propojeni) {
                    loadPropojeni(row);
                  }
                  row.toggleExpanded();
                }}
                title={isExpanded ? 'Skrýt propojené záznamy skupiny' : (isLoading ? 'Načítám...' : `Zobrazit propojené záznamy skupiny (${displayCount})`)}
                style={{
                  background: isExpanded ? '#fee2e2' : '#eff6ff',
                  border: `1px solid ${isExpanded ? '#fca5a5' : '#93c5fd'}`,
                  borderRadius: '4px',
                  width: '22px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isExpanded ? '#dc2626' : '#3b82f6',
                  flexShrink: 0,
                  padding: '1px 0',
                  gap: 0,
                  lineHeight: 1
                }}
              >
                <span style={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1, color: isExpanded ? '#dc2626' : '#1e40af', opacity: 0.85 }}>
                  {displayCount}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>
                  {isExpanded ? '−' : '+'}
                </span>
              </button>
              {hasWarning && (
                <span
                  title="Nalezena zřejmá chyba párování v podřádku"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    fontSize: '0.72rem',
                    lineHeight: 1,
                    cursor: 'help'
                  }}
                >
                  <FontAwesomeIcon icon={faBoltLightning} />
                </span>
              )}
            </div>
          );
        }

        if (row.original._isEeoOnly) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                disabled
                title="Žádné propojené záznamy"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '22px',
                  cursor: 'not-allowed',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  flexShrink: 0,
                  padding: '1px 0',
                  gap: 0,
                  lineHeight: 1,
                  opacity: 0.5
                }}
              >
                <span style={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>0</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>+</span>
              </button>
            </div>
          );
        }

        const rowId = row.id;
        const propojeni = propojenData[rowId];
        const isLoading = loadingPropojeni[rowId];
        const isExpanded = row.getIsExpanded();
        const hasWarning = warningModeObj
          ? Number(row.original?.has_chyba_obj || 0) > 0
          : (warningModeSml
              ? Number(row.original?.has_chyba_sml || 0) > 0
              : (Number(row.original?.has_chyba_obj || 0) > 0 || Number(row.original?.has_chyba_sml || 0) > 0));
        
        // Počítat z backendu (pokud existují)
        const pocetObj = row.original.pocet_objednavek || 0;
        const pocetFa = row.original.pocet_faktur || 0;
        const pocetRp = row.original.pocet_rocnich_poplatku || 0;
        // DŮLEŽITÉ: pro Kontrola OBJ/SML nezahrnujeme RP do badge.
        const count = includeRocniPoplatkyInBadge
          ? (pocetObj + pocetFa + pocetRp)
          : (pocetObj + pocetFa);
        const displayCount = count;
        
        // Pokud backend už vrací count=0, tlačítko má být neaktivní hned.
        const hasPrecomputedEmptyData = count === 0;
        const isEmpty = hasPrecomputedEmptyData;

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            {isEmpty ? (
              <button
                disabled
                title="Žádné propojené záznamy"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '22px',
                  cursor: 'not-allowed',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  flexShrink: 0,
                  padding: '1px 0',
                  gap: 0,
                  lineHeight: 1,
                  opacity: 0.5
                }}
              >
                <span style={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>0</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>+</span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isExpanded && !propojeni) {
                    loadPropojeni(row);
                  }
                  row.toggleExpanded();
                }}
                title={isExpanded ? 'Skrýt propojené záznamy' : (isLoading ? 'Načítám...' : (propojeni ? `Zobrazit propojené záznamy (${propojeni.celkem})` : `Načíst propojené záznamy (${count})`))}
                style={{
                  background: isExpanded ? '#fee2e2' : '#eff6ff',
                  border: `1px solid ${isExpanded ? '#fca5a5' : '#93c5fd'}`,
                  borderRadius: '4px',
                  width: '22px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isExpanded ? '#dc2626' : '#3b82f6',
                  flexShrink: 0,
                  padding: '1px 0',
                  gap: 0,
                  lineHeight: 1
                }}
              >
                <span style={{ 
                  fontSize: '0.6rem', 
                  fontWeight: 700, 
                  lineHeight: 1, 
                  color: isExpanded ? '#dc2626' : '#1e40af', 
                  opacity: 0.85 
                }}>
                  {displayCount}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>
                  {isExpanded ? '−' : '+'}
                </span>
              </button>
            )}
            {hasWarning && (
              <span
                title="Nalezena zřejmá chyba párování v podřádku"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  fontSize: '0.72rem',
                  lineHeight: 1,
                  cursor: 'help'
                }}
              >
                <FontAwesomeIcon icon={faBoltLightning} />
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
      cell: info => <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{info.getValue()}</span>
    },
    {
      accessorKey: 'cfak',
      header: 'Č. faktury',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'vsymb',
      header: 'Variabilní symbol',
      size: 130,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'cdok',
      header: 'Číslo dokladu',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'nazevfak',
      header: 'Název',
      size: 250,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'firma_nazev',
      header: 'Firma',
      size: 200,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'firma_ico',
      header: 'IČO',
      size: 100,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'celkem',
      header: 'Částka',
      size: 100,
      cell: info => {
        const val = info.getValue();
        return val ? new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val) : '-';
      }
    },
    {
      accessorKey: 'dof',
      header: 'Datum vystavení',
      size: 120,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        if (typeof val === 'number') return formatExcelDate(val);
        const parsed = new Date(val);
        return Number.isNaN(parsed.getTime()) ? String(val) : parsed.toLocaleDateString('cs-CZ');
      }
    },
    {
      accessorKey: 'datpri',
      header: 'Datum přijetí',
      size: 120,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        if (typeof val === 'number') return formatExcelDate(val);
        const parsed = new Date(val);
        return Number.isNaN(parsed.getTime()) ? String(val) : parsed.toLocaleDateString('cs-CZ');
      }
    },
    {
      accessorKey: 'spl',
      header: 'Splatnost',
      size: 110,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        if (typeof val === 'number') return formatExcelDate(val);
        const parsed = new Date(val);
        return Number.isNaN(parsed.getTime()) ? String(val) : parsed.toLocaleDateString('cs-CZ');
      }
    },
    {
      accessorKey: 'cobj',
      header: 'Č. objednávky',
      size: 230,
      minSize: 210,
      cell: info => {
        // Použít formátované číslo objednávky, fallback na původní
        const formatted = info.row.original.cobj_formatovane;
        const original = info.getValue();
        const val = formatted || original;
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {(val !== null && val !== undefined && val !== '') ? String(val) : '-'}
          </span>
        );
      }
    },
    {
      accessorKey: 'csml',
      header: 'Č. smlouvy',
      size: 190,
      minSize: 170,
      cell: info => {
        // Zobrazit původní číslo smlouvy (např. SM2200179)
        const val = info.getValue();
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {(val !== null && val !== undefined && val !== '') ? String(val) : '-'}
          </span>
        );
      }
    },
    {
      accessorKey: 'smlouva_ecsml',
      header: 'Ev.číslo',
      size: 210,
      minSize: 190,
      cell: info => {
        // Zobrazit evidenční číslo smlouvy (např. 007/75030926/17)
        const val = info.getValue();
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {(val !== null && val !== undefined && val !== '') ? String(val) : '-'}
          </span>
        );
      }
    },
    {
      accessorKey: 'stav_zaznamu',
      header: 'Stav',
      size: 80,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        
        // Mapování stavů na ikony (backend vrací bez diakritiky!)
        const stavMap = {
          'aktivni': { icon: '●', color: '#22c55e' },
          'aktivní': { icon: '●', color: '#22c55e' },
          'importovano': { icon: '●', color: '#22c55e' },
          'importováno': { icon: '●', color: '#22c55e' },
          'ok': { icon: '●', color: '#22c55e' },
          'zruseno': { icon: '✖', color: '#ef4444' },
          'zrušeno': { icon: '✖', color: '#ef4444' },
          'chyba': { icon: '✖', color: '#ef4444' },
          'zmena': { icon: '▲', color: '#f59e0b' },
          'změna': { icon: '▲', color: '#f59e0b' },
          'v_procesu': { icon: '◐', color: '#3b82f6' }
        };
        
        const stav = stavMap[val.toLowerCase()] || { icon: '●', color: '#94a3b8' };
        
        return (
          <span 
            title={val}
            style={{ 
              fontSize: '1.8em',
              color: stav.color,
              cursor: 'help',
              display: 'inline-block',
              fontWeight: 'bold',
              lineHeight: '1'
            }}
          >
            {stav.icon}
          </span>
        );
      }
    },
    {
      accessorKey: 'dt_importu',
      header: 'Importováno',
      size: 140,
      cell: info => {
        if (info.row.original._isEeoOnly) {
          return (
            <span
              style={{
                display: 'inline-block',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                background: '#dbeafe',
                color: '#1e40af',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}
              title="Záznam pochází z EEO"
            >
              EEO
            </span>
          );
        }
        return info.getValue() ? new Date(info.getValue()).toLocaleDateString('cs-CZ', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-';
      }
    },
    {
      accessorKey: 'kontrola',
      header: 'Kontrola',
      size: 100,
      minSize: 100,
      maxSize: 100,
      enableSorting: true,
      sortingFn: kontrolaSortingFn,
      cell: info => {
        if (info.row.original._groupedKontrola) {
          const kontrolaVemaId = info.row.original._masterCfak || null;

          if (!kontrolaVemaId) {
            return <span style={{ color: '#94a3b8' }}>—</span>;
          }

          return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <VemaKontrolaCell
                typZaznamu="faktura"
                vemaId={kontrolaVemaId}
                vemaIdSecondary={info.row.original.firma}
                token={token}
                username={username}
              />
            </div>
          );
        }

        const isEeoOnly = !!info.row.original._isEeoOnly;
        const eeoInternalId = info.row.original.eeo_faktura_id ?? null;
        const kontrolaVemaId = isEeoOnly
          ? (eeoInternalId ? `EEOONLY:${String(eeoInternalId)}` : null)
          : info.row.original.cfak;

        const kontrolaMetadata = isEeoOnly ? {
          source: 'eeo-bez-vema',
          eeo_faktura_id: eeoInternalId,
          eeo_ui_row_id: info.row.original.id || null,
          eeo_objednavka: info.row.original.cobj || null,
          eeo_smlouva: info.row.original.csml || null,
          eeo_vs: info.row.original.vsymb || null,
          eeo_cdok: info.row.original.cdok || null
        } : null;

        if (!kontrolaVemaId) {
          return <span style={{ color: '#94a3b8' }}>—</span>;
        }

        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <VemaKontrolaCell
              typZaznamu="faktura"
              vemaId={kontrolaVemaId}
              vemaIdSecondary={info.row.original.firma}
              metadata={kontrolaMetadata}
              token={token}
              username={username}
            />
          </div>
        );
      }
    }
  ], [token, username, propojenData, loadingPropojeni, fakturySubTab]);

  // Smlouvy columns
  const smlouvyColumns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
      cell: info => <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{info.getValue()}</span>
    },
    {
      accessorKey: 'csml',
      header: 'Č. smlouvy',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'ecsml',
      header: 'Evidenční č.',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'nazsml',
      header: 'Název',
      size: 250,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'firma_nazev',
      header: 'Firma',
      size: 200,
      cell: info => {
        const val = info.getValue();
        return (val !== null && val !== undefined && val !== '') ? String(val) : '-';
      }
    },
    {
      accessorKey: 'hodnota',
      header: 'Hodnota',
      size: 120,
      cell: info => {
        const val = info.getValue();
        return val ? new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val) : '-';
      }
    },
    {
      accessorKey: 'datuzavr',
      header: 'Datum uzavření',
      size: 130,
      cell: info => {
        const val = info.getValue();
        return val ? formatExcelDate(val) : '-';
      }
    },
    {
      accessorKey: 'stav_zaznamu',
      header: 'Stav',
      size: 80,
      cell: info => {
        const val = info.getValue();
        if (!val) return '-';
        
        // Mapování stavů na ikony (backend vrací bez diakritiky!)
        const stavMap = {
          'aktivni': { icon: '●', color: '#22c55e' },
          'aktivní': { icon: '●', color: '#22c55e' },
          'importovano': { icon: '●', color: '#22c55e' },
          'importováno': { icon: '●', color: '#22c55e' },
          'ok': { icon: '●', color: '#22c55e' },
          'zruseno': { icon: '✖', color: '#ef4444' },
          'zrušeno': { icon: '✖', color: '#ef4444' },
          'chyba': { icon: '✖', color: '#ef4444' },
          'zmena': { icon: '▲', color: '#f59e0b' },
          'změna': { icon: '▲', color: '#f59e0b' },
          'v_procesu': { icon: '◐', color: '#3b82f6' }
        };
        
        const stav = stavMap[val.toLowerCase()] || { icon: '●', color: '#94a3b8' };
        
        return (
          <span 
            title={val}
            style={{ 
              fontSize: '1.8em',
              color: stav.color,
              cursor: 'help',
              display: 'inline-block',
              fontWeight: 'bold',
              lineHeight: '1'
            }}
          >
            {stav.icon}
          </span>
        );
      }
    },
    {
      accessorKey: 'dt_importu',
      header: 'Importováno',
      size: 140,
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('cs-CZ', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
    },
    {
      accessorKey: 'kontrola',
      header: 'Kontrola',
      size: 100,
      minSize: 100,
      maxSize: 100,
      enableSorting: true,
      sortingFn: kontrolaSortingFn,
      cell: info => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VemaKontrolaCell
            typZaznamu="smlouva"
            vemaId={info.row.original.csml}
            vemaIdSecondary={info.row.original.firma}
            token={token}
            username={username}
          />
        </div>
      )
    }
  ], [token, username]);

  // Select columns based on active tab
  const columns = useMemo(() => {
    if (activeTab === 'firmy') return firmyColumns;
    if (activeTab === 'faktury') return fakturyColumns;
    if (activeTab === 'smlouvy') return smlouvyColumns;
    return [];
  }, [activeTab, firmyColumns, fakturyColumns, smlouvyColumns]);

  const filteredFakturyData = useMemo(() => {
    const includeRocniPoplatkyInBadge = !(fakturySubTab === 'kontrola-obj' || fakturySubTab === 'kontrola-sml');

    const getBadgeCount = (item) => {
      if (item?._groupedKontrola) {
        if (Array.isArray(item._groupInvoices) && item._groupInvoices.length > 0) {
          return item._groupInvoices.reduce((max, row) => {
            const pocetObj = Number(row?.pocet_objednavek || 0);
            const pocetFa = Number(row?.pocet_faktur || 0);
            const pocetRp = Number(row?.pocet_rocnich_poplatku || 0);
            const rowCount = includeRocniPoplatkyInBadge
              ? (pocetObj + pocetFa + pocetRp)
              : (pocetObj + pocetFa);
            return Math.max(max, rowCount);
          }, 0);
        }

        return Number(item._groupPrecomputedLinksCount || 0);
      }

      const pocetObj = Number(item?.pocet_objednavek || 0);
      const pocetFa = Number(item?.pocet_faktur || 0);
      const pocetRp = Number(item?.pocet_rocnich_poplatku || 0);
      return includeRocniPoplatkyInBadge
        ? (pocetObj + pocetFa + pocetRp)
        : (pocetObj + pocetFa);
    };

    const applyBadgeFilter = (items) => {
      // Filtr je sdílený mezi OBJ a OBJ BETA (jen sorting je oddělené)
      if (badgeFilter === 'all') return items;

      return items.filter((item) => {
        const count = getBadgeCount(item);
        if (badgeFilter === '0') return count === 0;
        if (badgeFilter === '1') return count === 1;
        if (badgeFilter === '2') return count === 2;
        if (badgeFilter === '3plus') return count >= 3;
        return true;
      });
    };

    const hasWarningIssue = (item) => {
      const useObjRules = ['kontrola-obj', 'kontrola-obj-beta'].includes(fakturySubTab);
      const useSmlRules = fakturySubTab === 'kontrola-sml';

      if (item?._groupedKontrola) {
        if (useObjRules) return !!item._groupHasChybaObj;
        if (useSmlRules) return !!item._groupHasChybaSml;
        return !!item._groupHasChybaObj || !!item._groupHasChybaSml;
      }

      const hasObj = Number(item?.has_chyba_obj || 0) > 0;
      const hasSml = Number(item?.has_chyba_sml || 0) > 0;

      if (useObjRules) return hasObj;
      if (useSmlRules) return hasSml;
      return hasObj || hasSml;
    };

    const applyWarningFilter = (items) => {
      // Filtr je sdílený mezi OBJ a OBJ BETA (jen sorting je oddělené)
      if (!warningOnlyFilter) return items;
      return items.filter((item) => hasWarningIssue(item));
    };

    // Filtr podle kliknutí na dlaždici dashboardu (Nezkontrolováno / V pořádku / Nelze vyřešit / V řešení / S varováním)
    // Filtr je sdílený mezi OBJ a OBJ BETA (jen sorting je oddělené)
    const applyKontrolaFilter = (items) => {
      if (!kontrolaFilter) return items;

      return items.filter((item) => {
        if (kontrolaFilter === 'varovani') return hasWarningIssue(item);
        return normalizeKontrolaStatus(item.kontrola) === kontrolaFilter;
      });
    };

    const hasAnyEeoLink = (item) => {
      const pocetObj = Number(item.pocet_objednavek || 0);
      const pocetFa = Number(item.pocet_faktur || 0);
      const pocetSml = Number(item.pocet_smluv || 0);
      const pocetRp = Number(item.pocet_rocnich_poplatku || 0);
      return (pocetObj + pocetFa + pocetSml + pocetRp) > 0;
    };

    const buildKontrolaGroupKey = (item) => {
      const obj = String(item.cobj_formatovane || item.cobj || '').trim();
      const sml = String(item.smlouva_ecsml || item.csml || '').trim();
      const cdok = String(item.cdok || '').trim();

      // Klíč musí respektovat číslo dokladu, aby se neslučovaly různé VEMA doklady.
      if (obj && sml && cdok) return `OBJ+SML:${obj}|${sml}|CDOK:${cdok}`;
      if (obj && cdok) return `OBJ:${obj}|CDOK:${cdok}`;
      if (sml && cdok) return `SML:${sml}|CDOK:${cdok}`;

      // Pokud chybí číslo dokladu, neseskupujeme agresivně - držíme záznam samostatně.
      return `UNSET:${item.id || item.cfak || item.vsymb || Math.random()}`;
    };

    const groupFakturyForKontrola = (items) => {
      const grouped = new Map();
      items.forEach((item) => {
        const key = buildKontrolaGroupKey(item);
        const current = grouped.get(key) || [];
        current.push(item);
        grouped.set(key, current);
      });

      return Array.from(grouped.entries()).map(([key, groupItems]) => {
        const sortedGroup = [...groupItems].sort((a, b) => {
          const aTs = a?.datpri ? new Date(a.datpri).getTime() : 0;
          const bTs = b?.datpri ? new Date(b.datpri).getTime() : 0;
          return bTs - aTs;
        });
        const base = sortedGroup[0] || {};
        const invoicesCount = sortedGroup.length;
        const soucetCastky = sortedGroup.reduce((acc, row) => acc + Number(row.celkem || 0), 0);
        const precomputedLinksCount = sortedGroup.reduce((max, row) => {
          const pocetObj = Number(row.pocet_objednavek || 0);
          const pocetFa = Number(row.pocet_faktur || 0);
          // V Kontrola OBJ/SML nepočítáme roční poplatky do badge.
          const rowCount = pocetObj + pocetFa;
          return Math.max(max, rowCount);
        }, 0);
        const hasChybaObj = sortedGroup.some(row => Number(row?.has_chyba_obj || 0) > 0);
        const hasChybaSml = sortedGroup.some(row => Number(row?.has_chyba_sml || 0) > 0);

        return {
          ...base,
          _groupedKontrola: true,
          _groupRowId: `GROUP_${key}`,
          _groupKey: key,
          _masterCfak: base.cfak || null,
          _groupInvoices: sortedGroup,
          _groupInvoicesCount: invoicesCount,
          _groupSoucetCastky: soucetCastky,
          _groupPrecomputedLinksCount: precomputedLinksCount,
          _groupHasChybaObj: hasChybaObj,
          _groupHasChybaSml: hasChybaSml,
          cfak: invoicesCount > 1 ? `${base.cfak || ''} (+${invoicesCount - 1})` : base.cfak,
        };
      });
    };

    let result = [];

    switch (fakturySubTab) {
      case 'kontrola-obj':
      case 'kontrola-obj-beta':
        result = groupFakturyForKontrola(fakturyData.filter(item => {
          const hasObj = item.cobj && String(item.cobj).trim() !== '';
          const hasEvidencniSmlouva = item.smlouva_ecsml && String(item.smlouva_ecsml).trim() !== '';
          return hasObj && !hasEvidencniSmlouva;
        }));
        break;
      case 'kontrola-sml':
        result = groupFakturyForKontrola(fakturyData.filter(item => {
          const hasEvidencniSmlouva = item.smlouva_ecsml && String(item.smlouva_ecsml).trim() !== '';
          const hasObj = item.cobj && String(item.cobj).trim() !== '';
          // Kontrola SML:
          // 1) existuje ev. číslo smlouvy + existuje číslo objednávky
          // 2) existuje ev. číslo smlouvy + neexistuje číslo objednávky
          // => v praxi: stačí existence ev. čísla smlouvy
          return hasEvidencniSmlouva && (hasObj || !hasObj);
        }));
        break;
      case 'kontrola-rp':
        result = fakturyData.filter(item => (item.pocet_rocnich_poplatku || 0) > 0);
        break;
      case 'vema-bez-eeo':
        // Doklady z VEMA importu bez JAKÉKOLI vazby na EEO (obj/faktura/roční poplatek)
        result = fakturyData.filter(item => !hasAnyEeoLink(item));
        break;
      case 'eeo-bez-vema':
        result = eeoBezVemaData;
        break;
      case 'tabulka':
      default:
        result = fakturyData;
        break;
    }

    const withBadgeFilter = applyBadgeFilter(result);
    const withWarningFilter = applyWarningFilter(withBadgeFilter);
    return applyKontrolaFilter(withWarningFilter);
  }, [fakturyData, fakturySubTab, eeoBezVemaData, badgeFilter, warningOnlyFilter, kontrolaFilter]);

  // Select data based on active tab
  const data = useMemo(() => {
    if (activeTab === 'firmy') return firmyData;
    if (activeTab === 'faktury') return filteredFakturyData;
    if (activeTab === 'smlouvy') return smlouvyData;
    return [];
  }, [activeTab, firmyData, filteredFakturyData, smlouvyData]);

  // Kontrola přístupu k aktuálnímu fakturySubTab - pokud uživatel nemá právo, přepnout na 'tabulka'
  useEffect(() => {
    if (activeTab !== 'faktury') return;
    const currentSection = FAKTURY_SUB_SECTIONS.find(s => s.id === fakturySubTab);
    if (currentSection && !canAccessSection(currentSection, userDetail)) {
      setFakturySubTab('tabulka');
      setPageIndex(0);
      setBetaPageIndex(0);
    }
  }, [userDetail, activeTab, fakturySubTab]);

  // TanStack Table
  const table = useReactTable({
    data,
    columns,
    getRowId: (row, index) => {
      // VEMA data obsahují úplné duplicity! Index garantuje unikátnost
      if (activeTab === 'faktury' && row._groupRowId) {
        return row._groupRowId;
      }
      if (activeTab === 'firmy') {
        return `${row.id || index}_${row.firma || ''}_${index}`;
      } else if (activeTab === 'faktury') {
        return `${row.id || index}_${row.firma || ''}_${row.cfak || ''}_${index}`;
      } else if (activeTab === 'smlouvy') {
        return `${row.id || index}_${row.firma || ''}_${row.csml || ''}_${index}`;
      }
      return String(index); // Fallback
    },
    enableRowSelection: false,
    autoResetPageIndex: false,
    getRowCanExpand: () => activeTab === 'faktury', // Pouze faktury mají expandable rows
    state: {
      sorting: fakturySubTab === 'kontrola-obj-beta' ? betaSorting : (fakturySubTab === 'kontrola-obj' ? objSorting : sorting),
      expanded
    },
    onExpandedChange: setExpanded,
    onSortingChange: (updater) => {
      if (fakturySubTab === 'kontrola-obj-beta') {
        setBetaSorting(typeof updater === 'function' ? updater(betaSorting) : updater);
      } else if (fakturySubTab === 'kontrola-obj') {
        setObjSorting(typeof updater === 'function' ? updater(objSorting) : updater);
      } else {
        setSorting(typeof updater === 'function' ? updater(sorting) : updater);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  });

  // Helper: Vrátí správný state v závislosti na aktivní sekci
  const getCurrentPageIndex = () => fakturySubTab === 'kontrola-obj-beta' ? betaPageIndex : pageIndex;
  const getCurrentPageSize = () => fakturySubTab === 'kontrola-obj-beta' ? betaPageSize : pageSize;
  const setCurrentPageIndex = (value) => {
    if (fakturySubTab === 'kontrola-obj-beta') {
      setBetaPageIndex(typeof value === 'function' ? value(betaPageIndex) : value);
    } else {
      setPageIndex(typeof value === 'function' ? value(pageIndex) : value);
    }
  };
  const setCurrentPageSize = (value) => {
    if (fakturySubTab === 'kontrola-obj-beta') {
      setBetaPageSize(value);
    } else {
      setPageSize(value);
    }
  };

  // Paginated data - počítáno během renderu, ne v useMemo
  // Důvod: table.getSortedRowModel() je interně memoized TanStackem,
  // ale referenční stabilita `table` nezaručuje aktuální data
  const allSortedRows = table.getSortedRowModel().rows;
  const totalRows = allSortedRows.length;
  const currentPageSize = getCurrentPageSize();
  const totalPages = Math.max(1, Math.ceil(totalRows / currentPageSize));
  const currentPageIndex = getCurrentPageIndex();
  const safePageIndex = Math.min(currentPageIndex, totalPages - 1);
  const start = safePageIndex * currentPageSize;
  const end = start + currentPageSize;
  const paginatedData = allSortedRows.slice(start, end);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value); // Okamžitá aktualizace inputu
    setCurrentPageIndex(0); // Reset to first page on search
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setCurrentPageIndex(0);
  };

  const goToFirstPage = () => setCurrentPageIndex(0);
  const goToPreviousPage = () => setCurrentPageIndex(prev => Math.max(0, prev - 1));
  const goToNextPage = () => setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1));
  const goToLastPage = () => setCurrentPageIndex(totalPages - 1);

  // ============================================================================
  // RENDER EXPANDED CONTENT - VEMA-EEO Propojení (TABULKOVÁ STRUKTURA)
  // ============================================================================

  const renderExpandedContent = (row) => {
    const showRocniPoplatkySection = !(fakturySubTab === 'kontrola-obj' || fakturySubTab === 'kontrola-sml');

    const rowId = row.id;
    const propojeni = propojenData[rowId];
    const isLoading = loadingPropojeni[rowId];

    if (isLoading) {
      return (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
          Načítám propojení...
        </div>
      );
    }

    if (!propojeni) {
      return (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
          Data se načítají...
        </div>
      );
    }

    if (propojeni.error) {
      return (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#ef4444' }}>
          Chyba při načítání propojení
        </div>
      );
    }

    const { objednavky = [], faktury = [], smlouvy = [], celkem = 0 } = propojeni;

    if (celkem === 0) {
      return (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
          Nebyly nalezeny žádné propojené záznamy
        </div>
      );
    }

    const tableContainerStyle = {
      marginBottom: '1rem',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
      background: 'white'
    };

    const tableStyle = {
      width: '100%',
      tableLayout: 'fixed',
      borderCollapse: 'collapse',
      fontSize: '0.82rem',
      fontFamily: "'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
      letterSpacing: '-0.01em'
    };

    const thStyle = {
      padding: '0.5rem 0.75rem',
      fontWeight: 600,
      fontSize: '0.75rem',
      color: '#334155',
      textTransform: 'uppercase',
      letterSpacing: '0.025em',
      borderBottom: '2px solid #cbd5e1',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      textAlign: 'left',
      whiteSpace: 'nowrap'
    };

    const tdStyle = {
      padding: '0.5rem 0.75rem',
      borderBottom: '1px solid #f1f5f9',
      color: '#374151',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      wordBreak: 'break-word'
    };

    const sectionHeaderStyle = {
      fontSize: '0.8rem',
      fontWeight: '700',
      color: '#475569',
      marginBottom: '0.5rem',
      marginTop: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    };

    return (
      <div style={{ 
        padding: '0.5rem 1rem 0.75rem 2rem', 
        background: '#f8fafc', 
        borderLeft: '4px solid #3b82f6'
      }}>
        
        {/* OBJEDNÁVKY */}
        {objednavky.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>
              <span style={{ fontSize: '1.1rem' }}>📦</span>
              <span>Objednávky ({objednavky.length})</span>
            </div>
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '6%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thStyle}>Č. obj.</th>
                    <th style={thStyle}>Předmět obj.</th>
                    <th style={thStyle}>Datum</th>
                    <th style={thStyle}>Stav</th>
                    <th style={thStyle}>Dodavatel</th>
                    <th style={thStyle}>Zadavatel</th>
                    <th style={thStyle}>Financování</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>MAX DPH</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Cena detail</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Zaplaceno</th>
                    <th style={thStyle}>Počet FA</th>
                  </tr>
                </thead>
                <tbody>
                  {objednavky.map((obj, idx) => {
                    const zadavatel = obj.zadavatel_jmeno && obj.zadavatel_prijmeni 
                      ? `${obj.zadavatel_jmeno} ${obj.zadavatel_prijmeni}`
                      : '—';
                    
                    return (
                      <tr key={idx} style={{ 
                        background: idx % 2 === 0 ? 'white' : '#f8fafc',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e8f0fe'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#f8fafc'}
                      >
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b', fontSize: '0.75rem' }}>
                          {obj.cislo_objednavky || '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.75rem' }}>
                          {obj.nazev || '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.7rem' }}>
                          {obj.dt_objednavky ? new Date(obj.dt_objednavky).toLocaleDateString('cs-CZ') : '—'}
                        </td>
                        <td style={tdStyle}>
                          {obj.stav && (
                            <span style={{
                              padding: '2px 6px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '3px',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              {obj.stav}
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.7rem' }}>
                          {obj.dodavatel || '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.7rem' }}>
                          {zadavatel}
                        </td>
                        <td style={tdStyle}>
                          {(() => {
                            // Parsovat financování JSON do lidské podoby
                            if (!obj.financovani) return '—';
                            
                            try {
                              let financovaniData;
                              // Pokud je to JSON string, parsuj ho
                              if (typeof obj.financovani === 'string' && obj.financovani.startsWith('{')) {
                                financovaniData = JSON.parse(obj.financovani);
                              } else if (typeof obj.financovani === 'object') {
                                financovaniData = obj.financovani;
                              } else {
                                // Fallback - zobrazit jako text
                                return (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    color: '#6b7280'
                                  }}>
                                    {obj.financovani}
                                  </span>
                                );
                              }
                              
                              const typ = financovaniData.TYP || financovaniData.typ;
                              const lpKody = financovaniData.LP_KODY || financovaniData.lp_kody || [];
                              
                              // Formátovat podle typu
                              let label = '';
                              let bg = '#f3f4f6';
                              let color = '#6b7280';
                              
                              if (typ === 'LP') {
                                // Dohledat názvy LP podle ID (LP_KODY obsahuje ID, ne kódy)
                                if (lpKody.length > 0 && lpSeznam.length > 0) {
                                  const lpNazvy = lpKody.map(lpId => {
                                    // Najdi LP v seznamu podle ID
                                    const lp = lpSeznam.find(l => l.id === parseInt(lpId));
                                    
                                    if (lp) {
                                      // Zkratka LP je v poli cislo_lp (např. "LPIT2/132/2024")
                                      const cisloLp = lp.cislo_lp || `LP-${lpId}`;
                                      const zkratka = cisloLp.split('/')[0]; // První část před lomítkem (např. "LPIT2")
                                      const nazev = lp.vyuziti || lp.nazev || lp.nazev_uctu || '';
                                      
                                      return nazev ? `${zkratka}: ${nazev}` : zkratka;
                                    }
                                    console.warn(`LP ID ${lpId} nenalezen v seznamu (celkem ${lpSeznam.length} LP)`);
                                    return `LP ID ${lpId}`;
                                  });
                                  label = lpNazvy.join(', ');
                                } else if (lpKody.length > 0) {
                                  // LP seznam není načten - zobrazit jen ID
                                  label = lpKody.map(k => `LP ID ${k}`).join(', ');
                                } else {
                                  label = 'Limitovaný příslib';
                                }
                                bg = '#fef3c7';
                                color = '#92400e';
                              } else if (typ === 'SMLOUVA') {
                                label = 'Smlouva';
                                bg = '#f0f9ff';
                                color = '#0369a1';
                              } else if (typ === 'INDIVIDUALNI') {
                                label = 'Individuální schválení';
                                bg = '#fce7f3';
                                color = '#9f1239';
                              } else if (typ === 'POJISTNA_UDALOST') {
                                label = 'Pojistná událost';
                                bg = '#fef3c7';
                                color = '#ea580c';
                              } else {
                                label = typ || 'Jiné';
                              }
                              
                              return (
                                <span style={{
                                  padding: '2px 6px',
                                  background: bg,
                                  color: color,
                                  borderRadius: '3px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  letterSpacing: '0.3px',
                                  display: 'inline-block',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {label}
                                </span>
                              );
                            } catch (e) {
                              // Při chybě parsování zobrazit původní text
                              return (
                                <span style={{
                                  fontSize: '0.7rem',
                                  color: '#6b7280'
                                }}>
                                  {obj.financovani}
                                </span>
                              );
                            }
                          })()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#3b82f6', fontSize: '0.75rem' }}>
                          {obj.castka_max ? `${parseFloat(obj.castka_max).toLocaleString('cs-CZ', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Kč` : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#059669', fontSize: '0.75rem' }}>
                          {obj.castka_detail ? `${parseFloat(obj.castka_detail).toLocaleString('cs-CZ', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Kč` : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#dc2626', fontSize: '0.75rem' }}>
                          {obj.zaplaceno ? `${parseFloat(obj.zaplaceno).toLocaleString('cs-CZ', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Kč` : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.75rem' }}>
                          {obj.pocet_faktur > 0 ? (
                            <span style={{
                              padding: '2px 8px',
                              background: '#fef3c7',
                              color: '#92400e',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}>
                              {obj.pocet_faktur}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* FAKTURY */}
        {faktury.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>
              <span style={{ fontSize: '1.1rem' }}>🧾</span>
              <span>Faktury ({faktury.length})</span>
            </div>
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <colgroup>
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '19%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thStyle}>Č. faktury</th>
                    <th style={thStyle}>Číslo dokladu</th>
                    <th style={thStyle}>Č. obj.</th>
                    <th style={thStyle}>Dodavatel</th>
                    <th style={thStyle}>Vystavení</th>
                    <th style={thStyle}>Splatnost</th>
                    <th style={thStyle}>Stav</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Částka</th>
                  </tr>
                </thead>
                <tbody>
                  {faktury.map((fa, idx) => {
                    const useObjRules = fakturySubTab === 'kontrola-obj';
                    const useSmlRules = fakturySubTab === 'kontrola-sml';
                    const hasObjPairing = !!(fa.cislo_objednavky && String(fa.cislo_objednavky).trim() !== '');
                    const hasSmlPairing =
                      !!(fa.cislo_smlouvy && String(fa.cislo_smlouvy).trim() !== '') ||
                      Number(fa.smlouva_id || 0) > 0;

                    const isObjPairingError = !hasObjPairing;
                    const isSmlPairingError = !hasObjPairing && !hasSmlPairing;

                    const isPairingError = useObjRules
                      ? isObjPairingError
                      : (useSmlRules ? isSmlPairingError : (isObjPairingError || isSmlPairingError));

                    // Překlad stavů faktur do češtiny
                    const stavMap = {
                      'ZAEVIDOVANA': 'Zaevidována',
                      'VECNA_SPRAVNOST': 'Věcná správnost',
                      'V_RESENI': 'V řešení',
                      'PREDANA_PO': 'Předána PO',
                      'K_ZAPLACENI': 'K zaplací',
                      'ZAPLACENO': 'Zaplaceno',
                      'DOKONCENA': 'Dokončena',
                      'STORNO': 'Storno'
                    };
                    const stavCesky = fa.stav ? (stavMap[fa.stav] || fa.stav) : '—';

                    const rowBg = isPairingError
                      ? '#7f1d1d'
                      : (idx % 2 === 0 ? 'white' : '#f8fafc');

                    const rowHoverBg = isPairingError ? '#991b1b' : '#e8f0fe';

                    const baseCellStyle = isPairingError
                      ? {
                          ...tdStyle,
                          color: '#fde68a',
                          borderBottom: '1px solid #b91c1c'
                        }
                      : tdStyle;
                    
                    return (
                      <tr key={idx} style={{ 
                        background: rowBg,
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = rowHoverBg}
                      onMouseLeave={(e) => e.currentTarget.style.background = rowBg}
                      >
                        <td style={{ ...baseCellStyle, fontWeight: 600, color: isPairingError ? '#fde68a' : '#1e293b', fontSize: '0.75rem' }}>
                          {fa.cislo_faktury || '—'}
                        </td>
                        <td style={{ ...baseCellStyle, fontSize: '0.7rem', color: isPairingError ? '#fde68a' : '#64748b', whiteSpace: 'nowrap' }}>
                          {fa.fa_vema_kod || '—'}
                        </td>
                        <td style={{ ...baseCellStyle, fontSize: '0.75rem', fontWeight: isPairingError ? 700 : 400 }}>
                          {hasObjPairing
                            ? fa.cislo_objednavky
                            : ((fakturySubTab === 'kontrola-sml' || fakturySubTab === 'tabulka') && hasSmlPairing
                                ? `PŘÍMÁ SML: ${fa.cislo_smlouvy}`
                                : (isObjPairingError
                                    ? 'CHYBÍ PÁROVÁNÍ NA OBJ'
                                    : (isSmlPairingError ? 'CHYBÍ PÁROVÁNÍ NA OBJ/SML' : '—')))}
                        </td>
                        <td style={{ ...baseCellStyle, fontSize: '0.7rem' }}>
                          {fa.dodavatel || '—'}
                        </td>
                        <td style={{ ...baseCellStyle, fontSize: '0.7rem' }}>
                          {fa.datum_vystaveni ? new Date(fa.datum_vystaveni).toLocaleDateString('cs-CZ') : '—'}
                        </td>
                        <td style={{ ...baseCellStyle, fontSize: '0.7rem' }}>
                          {fa.datum_splatnosti ? new Date(fa.datum_splatnosti).toLocaleDateString('cs-CZ') : '—'}
                        </td>
                        <td style={baseCellStyle}>
                          {fa.stav && (
                            <span style={{
                              padding: '2px 6px',
                              background: isPairingError ? '#991b1b' : '#fef3c7',
                              color: isPairingError ? '#fde68a' : '#92400e',
                              borderRadius: '3px',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              {stavCesky}
                            </span>
                          )}
                        </td>
                        <td style={{ ...baseCellStyle, textAlign: 'right', fontWeight: 600, color: isPairingError ? '#fde68a' : '#dc2626', fontSize: '0.75rem' }}>
                          {fa.castka ? `${parseFloat(fa.castka).toLocaleString('cs-CZ', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Kč` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ROČNÍ POPLATKY */}
        {showRocniPoplatkySection && propojeni.rocni_poplatky && propojeni.rocni_poplatky.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>
              <span style={{ fontSize: '1.1rem' }}>💳</span>
              <span>Roční poplatky ({propojeni.rocni_poplatky.length})</span>
            </div>
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thStyle}>Číslo dokladu</th>
                    <th style={thStyle}>Druh / Platba</th>
                    <th style={thStyle}>Poznámka</th>
                    <th style={thStyle}>Splatnost</th>
                    <th style={thStyle}>Zaplaceno</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Částka</th>
                  </tr>
                </thead>
                <tbody>
                  {propojeni.rocni_poplatky.map((rp, idx) => {
                    return (
                      <tr key={idx} style={{ 
                        background: idx % 2 === 0 ? 'white' : '#f8fafc',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e8f0fe'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#f8fafc'}
                      >
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b', fontSize: '0.75rem' }}>
                          {rp.cislo_dokladu || '—'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.72rem' }}>
                          {(() => {
                            const druh = rp.druh_nazev || rp.druh || '';
                            const platba = rp.platba_nazev || rp.platba || '';

                            if (!druh && !platba) return '—';
                            if (!druh) return platba;
                            if (!platba) return druh;

                            return `${druh} / ${platba}`;
                          })()}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500, fontSize: '0.75rem' }}>
                            {rp.poznamka || '—'}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.7rem' }}>
                          {rp.datum_splatnosti ? new Date(rp.datum_splatnosti).toLocaleDateString('cs-CZ') : '—'}
                        </td>
                        <td style={tdStyle}>
                          {rp.datum_zaplaceno ? (
                            <span style={{
                              padding: '3px 8px',
                              background: '#dcfce7',
                              color: '#166534',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>
                              {new Date(rp.datum_zaplaceno).toLocaleDateString('cs-CZ')}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#3b82f6', fontSize: '0.75rem' }}>
                          {rp.castka ? `${parseFloat(rp.castka).toLocaleString('cs-CZ', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Kč` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <div>
            <Title>
              <FontAwesomeIcon icon={faFileContract} />
              EEO vs Vema
              <BetaBadge>BETA</BetaBadge>
            </Title>
            <SubTitle>Importovaná data z VEMA systému</SubTitle>
          </div>
        </HeaderLeft>
        <HeaderRight>
          <HeaderButton onClick={() => setShowImportModal(true)}>
            <FontAwesomeIcon icon={faUpload} />
            Import dat
          </HeaderButton>
          {userDetail?.roles?.some(r => r.kod_role === 'SUPERADMIN') && (
            <HeaderButton 
              onClick={() => setShowTruncateModal(true)}
              style={{background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'}}
            >
              <FontAwesomeIcon icon={faTimes} />
              Vymazat vše
            </HeaderButton>
          )}
        </HeaderRight>
      </Header>

      {/* Tabs */}
      <TabsContainer>
        <MainTab $active={activeTab === 'faktury'} onClick={() => { setActiveTab('faktury'); setPageIndex(0); }}>
          <FontAwesomeIcon icon={faFileInvoice} />
          Faktury ({dataLoaded.faktury ? fakturyData.length : '…'})
        </MainTab>

        <SecondaryTabs>
          <IconTab
            $active={activeTab === 'smlouvy'}
            onClick={() => { setActiveTab('smlouvy'); setPageIndex(0); }}
            title={`Smlouvy (${dataLoaded.smlouvy ? smlouvyData.length : '…'})`}
            aria-label={`Smlouvy (${dataLoaded.smlouvy ? smlouvyData.length : '…'})`}
          >
            <FontAwesomeIcon icon={faFileContract} />
          </IconTab>

          <IconTab
            $active={activeTab === 'firmy'}
            onClick={() => { setActiveTab('firmy'); setPageIndex(0); }}
            title={`Firmy (${dataLoaded.firmy ? firmyData.length : '…'})`}
            aria-label={`Firmy (${dataLoaded.firmy ? firmyData.length : '…'})`}
          >
            <FontAwesomeIcon icon={faBuilding} />
          </IconTab>
        </SecondaryTabs>
      </TabsContainer>

      {/* Dashboard s statistikami - viditelný pro VŠECHNY sekce Faktury, filtr sdílený mezi OBJ a OBJ BETA */}
      {activeTab === 'faktury' && dataLoaded.faktury && (
        <DashboardContainer>
          {(() => {
            // Počítáme ze všech dat (zobrazovaných + skrytých filtrů badge/warning/kontrola)
            const counts = {
              [KONTROLA_STATUS.NEZKONTROLOVANO]: 0,
              [KONTROLA_STATUS.V_PORADKU]: 0,
              [KONTROLA_STATUS.NELZE_VYRESIT]: 0,
              [KONTROLA_STATUS.V_RESENI]: 0,
            };
            let sVarovanim = 0;

            // Používáme allSortedRows místo `data` abychom měli všechna data bez filtrů
            allSortedRows.forEach(row => {
              const fa = row.original;
              const status = normalizeKontrolaStatus(fa.kontrola);
              counts[status] = (counts[status] || 0) + 1;

              const hasChybaObj = Number(fa?.has_chyba_obj || 0) > 0;
              const hasChybaSml = Number(fa?.has_chyba_sml || 0) > 0;
              if (hasChybaObj || hasChybaSml) sVarovanim++;
            });

            // Toggle filtru: klik na aktivní dlaždici filtr vypne, jinak ho nastaví
            // Filtr je sdílený mezi OBJ a OBJ BETA - pouze sorting je oddělené
            const toggleFilter = (value) => {
              setKontrolaFilter(prev => (prev === value ? null : value));
              setPageIndex(0);
              setBetaPageIndex(0);
            };

            const statusOrder = [
              KONTROLA_STATUS.NEZKONTROLOVANO,
              KONTROLA_STATUS.V_PORADKU,
              KONTROLA_STATUS.NELZE_VYRESIT,
              KONTROLA_STATUS.V_RESENI,
            ];

            return (
              <>
                {statusOrder.map(status => {
                  const colors = KONTROLA_STATUS_COLORS[status];
                  return (
                    <DashboardCard
                      key={status}
                      $color={colors.border}
                      $active={kontrolaFilter === status}
                      onClick={() => toggleFilter(status)}
                      title={`Filtrovat: ${KONTROLA_STATUS_LABELS[status]}`}
                    >
                      <DashboardValue $color={colors.text}>{counts[status]}</DashboardValue>
                      <DashboardLabel>
                        <span>{colors.icon}</span> {KONTROLA_STATUS_LABELS[status]}
                      </DashboardLabel>
                    </DashboardCard>
                  );
                })}

                <DashboardCard
                  $color="#dc2626"
                  $active={kontrolaFilter === 'varovani'}
                  onClick={() => toggleFilter('varovani')}
                  title="Filtrovat: S varováním"
                >
                  <DashboardValue $color="#991b1b">{sVarovanim}</DashboardValue>
                  <DashboardLabel>
                    <span>⚠️</span> S varováním
                  </DashboardLabel>
                </DashboardCard>
              </>
            );
          })()}
        </DashboardContainer>
      )}

      {activeTab === 'faktury' && (
        <>
          <FakturySubTabs>
            {FAKTURY_SUB_SECTIONS.filter(section => canAccessSection(section, userDetail)).map(section => (
              <FakturySubTab
                key={section.id}
                $active={fakturySubTab === section.id}
                onClick={() => {
                  setFakturySubTab(section.id);
                  // Resetuj jen příslušné filtry pro danou sekci
                  if (section.id === 'kontrola-obj-beta') {
                    setBetaPageIndex(0);
                  } else {
                    setPageIndex(0);
                  }
                }}
              >
                {section.label}
                {section.isBeta && <BetaBadgeSmall $active={fakturySubTab === section.id}>Beta</BetaBadgeSmall>}
              </FakturySubTab>
            ))}
          </FakturySubTabs>
        </>
      )}

      {/* Error */}
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Search + Statistický badge v jednom řádku */}
      <FilterToolbar>
        {/* Search - flex-grow pro dynamickou šířku */}
        <SearchContainer style={{ flex: '1 1 300px', margin: 0 }}>
          <SearchBox>
            <FontAwesomeIcon icon={faSearch} />
            <SearchInput
              type="text"
              placeholder="Hledat v dokladech ..."
              value={searchInput}
              onChange={handleSearchChange}
            />
            {searchInput && (
              <ClearButton onClick={handleClearSearch}>
                <FontAwesomeIcon icon={faTimes} />
              </ClearButton>
            )}
          </SearchBox>
        </SearchContainer>

        {activeTab === 'faktury' && (
          <FilterToolsRight>
            {/* Filtry jsou sdílené mezi OBJ a OBJ BETA - jen sorting je oddělené */}
            <select
              value={badgeFilter}
              onChange={(e) => {
                setBadgeFilter(e.target.value);
                setPageIndex(0);
                setBetaPageIndex(0);
              }}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                height: '40px',
                padding: '0 0.5rem',
                fontSize: '0.78rem',
                color: '#1e293b',
                background: '#fff',
                width: '96px',
                minWidth: '96px'
              }}
              title="Filtrovat podle počtu dokladů v badge"
            >
              <option value="all">Vše</option>
              <option value="0">Badge 0</option>
              <option value="1">Badge 1</option>
              <option value="2">Badge 2</option>
              <option value="3plus">Badge 3+</option>
            </select>

            <button
              onClick={() => {
                setWarningOnlyFilter((prev) => !prev);
                setPageIndex(0);
                setBetaPageIndex(0);
              }}
              title={warningOnlyFilter ? 'Filtr varování zapnut (pouze chybové položky)' : 'Zobrazit pouze položky s varováním'}
              style={{
                height: '40px',
                width: '40px',
                borderRadius: '6px',
                border: `1px solid ${warningOnlyFilter ? '#ef4444' : '#cbd5e1'}`,
                background: warningOnlyFilter ? '#fee2e2' : '#ffffff',
                color: warningOnlyFilter ? '#dc2626' : '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem'
              }}
            >
              <FontAwesomeIcon icon={faBoltLightning} />
            </button>
          </FilterToolsRight>
        )}

        {/* Statistický badge - pouze pro faktury */}
        {activeTab === 'faktury' && dataLoaded.faktury && (
          <FilterStats>
          {(() => {
            // Spočítat statistiky
            let bezVazby = 0;
            let pouzeObj = 0;
            let pouzeFa = 0;
            let objAFa = 0;
            let rocniPopl = 0;
            
            data.forEach(fa => {
              const pocetObj = fa.pocet_objednavek || 0;
              const pocetFa = fa.pocet_faktur || 0;
              const pocetRp = fa.pocet_rocnich_poplatku || 0;
              const celkem = pocetObj + pocetFa + pocetRp;
              
              if (celkem === 0) {
                bezVazby++;
              } else if (pocetRp > 0) {
                rocniPopl++;
              } else if (pocetObj > 0 && pocetFa > 0) {
                objAFa++;
              } else if (pocetFa > 0) {
                pouzeFa++;
              } else if (pocetObj > 0) {
                pouzeObj++;
              }
            });

            const statCountStyle = {
              display: 'inline-block',
              minWidth: '4ch',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums'
            };
            
            return (
              <>
                <span style={{
                  padding: '0.4rem 0.75rem',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  minWidth: '128px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>⚪</span>
                  <span>Bez vazby: <span style={statCountStyle}>{bezVazby}</span></span>
                </span>
                <span style={{
                  padding: '0.4rem 0.75rem',
                  background: '#dbeafe',
                  border: '1px solid #93c5fd',
                  borderRadius: '6px',
                  minWidth: '136px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#1e40af',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>🔵</span>
                  <span>Objednávky: <span style={statCountStyle}>{pouzeObj}</span></span>
                </span>
                <span style={{
                  padding: '0.4rem 0.75rem',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  minWidth: '122px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#166534',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>🟢</span>
                  <span>Faktury: <span style={statCountStyle}>{pouzeFa}</span></span>
                </span>
                <span style={{
                  padding: '0.4rem 0.75rem',
                  background: '#fef3c7',
                  border: '1px solid #fde047',
                  borderRadius: '6px',
                  minWidth: '122px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#92400e',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>🟡</span>
                  <span>Obj + Fa: <span style={statCountStyle}>{objAFa}</span></span>
                </span>
                <span style={{
                  padding: '0.4rem 0.75rem',
                  background: '#ffedd5',
                  border: '1px solid #fdba74',
                  borderRadius: '6px',
                  minWidth: '136px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#9a3412',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>🟠</span>
                  <span>Roční popl.: <span style={statCountStyle}>{rocniPopl}</span></span>
                </span>
                <span style={{
                  padding: '0.4rem 0.75rem',
                  background: '#eef2ff',
                  border: '1px solid #a5b4fc',
                  borderRadius: '6px',
                  minWidth: '160px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#3730a3',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>📊</span>
                  <span>Celkem položek: <span style={statCountStyle}>{data.length}</span></span>
                </span>
              </>
            );
          })()}
          </FilterStats>
        )}
      </FilterToolbar>

      {/* Table */}
      <TableWrapper>
        {(loading || (activeTab === 'faktury' && fakturySubTab === 'eeo-bez-vema' && eeoBezVemaLoading)) ? (
          <LoadingInline>
            <LoadingSpinner />
            <span>Načítám data…</span>
          </LoadingInline>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  {table.getHeaderGroups()[0].headers.map(header => (
                    <TableHeader
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() && (
                          <FontAwesomeIcon
                            icon={header.column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
                            style={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </div>
                    </TableHeader>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length}>
                      <LoadingOverlay>Žádná data k zobrazení</LoadingOverlay>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map(row => {
                    // Zjistit barvu řádku podle propojení (pouze pro faktury)
                    let rowBackground = 'white';
                    if (activeTab === 'faktury') {
                      const pocetObj = row.original.pocet_objednavek || 0;
                      const pocetFa = row.original.pocet_faktur || 0;
                      const pocetRp = row.original.pocet_rocnich_poplatku || 0;
                      const celkem = pocetObj + pocetFa + pocetRp;
                      
                      if (celkem === 0) {
                        rowBackground = '#f9fafb'; // Šedá - bez vazby
                      } else if (pocetRp > 0) {
                        rowBackground = '#ffedd5'; // Oranžová - roční poplatky (PRIORITA 1)
                      } else if (pocetObj > 0 && pocetFa > 0) {
                        rowBackground = '#fef3c7'; // Žlutá - objednávky + faktury
                      } else if (pocetFa > 0) {
                        rowBackground = '#dcfce7'; // Zelená - faktury
                      } else if (pocetObj > 0) {
                        rowBackground = '#dbeafe'; // Modrá - objednávky
                      }
                    }
                    
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow $background={rowBackground}>
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                        {/* Expanded row content - pouze pro faktury */}
                        {row.getIsExpanded() && activeTab === 'faktury' && (
                          <tr>
                            <td colSpan={row.getVisibleCells().length} style={{ padding: 0, background: '#f8fafc' }}>
                              {renderExpandedContent(row)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </Table>

            {/* Pagination */}
            <PaginationContainer>
              <PaginationInfo>
                Zobrazeno {totalRows > 0 ? start + 1 : 0}–{Math.min(end, totalRows)} z {totalRows}
              </PaginationInfo>

              <PaginationControls>
                <PageButton onClick={goToFirstPage} disabled={pageIndex === 0}>
                  <FontAwesomeIcon icon={faAnglesLeft} />
                </PageButton>
                <PageButton onClick={goToPreviousPage} disabled={pageIndex === 0}>
                  <FontAwesomeIcon icon={faChevronLeft} />
                </PageButton>

                <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0.5rem' }}>
                  Stránka {pageIndex + 1} z {totalPages}
                </span>

                <PageButton onClick={goToNextPage} disabled={pageIndex >= totalPages - 1}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </PageButton>
                <PageButton onClick={goToLastPage} disabled={pageIndex >= totalPages - 1}>
                  <FontAwesomeIcon icon={faAnglesRight} />
                </PageButton>

                <PageSizeSelector value={getCurrentPageSize()} onChange={(e) => { setCurrentPageSize(Number(e.target.value)); setCurrentPageIndex(0); }}>
                  <option value={25}>25 / stránku</option>
                  <option value={50}>50 / stránku</option>
                  <option value={100}>100 / stránku</option>
                  <option value={200}>200 / stránku</option>
                </PageSizeSelector>
              </PaginationControls>
            </PaginationContainer>
          </>
        )}
      </TableWrapper>

      {/* Import Modal */}
      {showImportModal && (
        <ModalOverlay onClick={() => !importing && setShowImportModal(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                <FontAwesomeIcon icon={faUpload} />
                Import VEMA dat
              </ModalTitle>
              <ModalClose onClick={() => !importing && setShowImportModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </ModalClose>
            </ModalHeader>

            <ModalBody>
              <InfoBox>
                <strong>📋 Požadované soubory:</strong>
                <ul>
                  <li><strong>firmyupl.xlsx</strong> - Seznam firem</li>
                  <li><strong>fpazahl.xlsx / fpprip.xlsx</strong> - Seznam faktur (lze nahrát kterýkoliv formát)</li>
                  <li><strong>smla.xlsx</strong> - Seznam smluv</li>
                </ul>
                <strong>⚠️ Poznámka:</strong> Všechny 3 soubory musí být nahrány současně.
              </InfoBox>

              <FileUploadSection>
                <FileUploadLabel>
                  1️⃣ Firmy (firmyupl.xlsx)
                </FileUploadLabel>
                <FileInput
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFirmyuplFile(e.target.files[0])}
                  disabled={importing}
                />
                {firmyuplFile && <div style={{fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem'}}>✓ {firmyuplFile.name}</div>}
              </FileUploadSection>

              <FileUploadSection>
                <FileUploadLabel>
                  2️⃣ Faktury (fpazahl.xlsx / fpprip.xlsx)
                </FileUploadLabel>
                <FileInput
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFpazahlFile(e.target.files[0])}
                  disabled={importing}
                />
                {fpazahlFile && <div style={{fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem'}}>✓ {fpazahlFile.name}</div>}
              </FileUploadSection>

              <FileUploadSection>
                <FileUploadLabel>
                  3️⃣ Smlouvy (smla.xlsx)
                </FileUploadLabel>
                <FileInput
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setSmlaFile(e.target.files[0])}
                  disabled={importing}
                />
                {smlaFile && <div style={{fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem'}}>✓ {smlaFile.name}</div>}
              </FileUploadSection>

              {importing && (
                <ProgressContainer>
                  <ProgressLabel>Probíhá import...</ProgressLabel>
                  <ProgressBar>
                    <ProgressFill $percent={importProgress} />
                  </ProgressBar>
                  <ProgressPercent>{importProgress}%</ProgressPercent>
                </ProgressContainer>
              )}

              <ImportButton
                onClick={handleImport}
                disabled={importing || !firmyuplFile || !fpazahlFile || !smlaFile}
              >
                {importing ? (
                  <>🔄 Importuji data...</>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUpload} />
                    Spustit import
                  </>
                )}
              </ImportButton>
            </ModalBody>
          </ModalContainer>
        </ModalOverlay>
      )}

      {/* Results Dialog */}
      {showResultsDialog && importResults && (
        <ResultsOverlay onClick={() => setShowResultsDialog(false)}>
          <ResultsDialog onClick={(e) => e.stopPropagation()}>
            <ResultsHeader>
              <h2>
                <FontAwesomeIcon icon={faCheckCircle} />
                Import dokončen úspěšně
              </h2>
            </ResultsHeader>

            <ResultsBody>
              <SummaryBox $success={importResults.imported.smla > 0}>
                <SummaryTitle $success={importResults.imported.smla > 0}>
                  {importResults.imported.smla > 0 ? '✅ Import dokončen' : '⚠️ Import s problémem'}
                </SummaryTitle>

                <SummaryStats>
                  <StatItem>
                    <StatLabel>Firmy</StatLabel>
                    <StatValue $type="success">{importResults.imported.firmyupl}</StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Faktury</StatLabel>
                    <StatValue $type="success">{importResults.imported.fpazahl}</StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Smlouvy</StatLabel>
                    <StatValue $type={importResults.imported.smla > 0 ? 'success' : 'error'}>
                      {importResults.imported.smla}
                    </StatValue>
                  </StatItem>
                  <StatItem>
                    <StatLabel>Celkem</StatLabel>
                    <StatValue>{importResults.imported.total}</StatValue>
                  </StatItem>
                </SummaryStats>

                <BatchInfo>
                  <strong>Batch ID:</strong> {importResults.batch_id}<br/>
                  <strong>Datum importu:</strong> {new Date(importResults.dt_importu).toLocaleString('cs-CZ')}
                </BatchInfo>
              </SummaryBox>
            </ResultsBody>

            <ResultsFooter>
              <CloseButton onClick={() => setShowResultsDialog(false)}>
                Zavřít
              </CloseButton>
            </ResultsFooter>
          </ResultsDialog>
        </ResultsOverlay>
      )}

      {/* Truncate Confirmation Modal */}
      {showTruncateModal && (
        <ModalOverlay onClick={() => !truncating && setShowTruncateModal(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <ModalHeader style={{background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'}}>
              <h2>⚠️ Vymazat všechna VEMA data</h2>
              <button onClick={() => setShowTruncateModal(false)} disabled={truncating}>×</button>
            </ModalHeader>
            <ModalBody>
              <div style={{
                padding: '1.5rem',
                background: '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{color: '#991b1b', marginTop: 0}}>⚠️ POZOR - NEVRATNÁ AKCE!</h3>
                <p style={{color: '#7f1d1d', marginBottom: '1rem'}}>
                  Tato operace <strong>TRVALE SMAŽE</strong> všechna data z těchto tabulek:
                </p>
                <ul style={{color: '#7f1d1d', marginLeft: '1.5rem'}}>
                  <li>📊 <strong>Firmy</strong> ({firmyData.length} záznamů)</li>
                  <li>📄 <strong>Faktury</strong> ({fakturyData.length} záznamů)</li>
                  <li>📋 <strong>Smlouvy</strong> ({smlouvyData.length} záznamů)</li>
                </ul>
                <p style={{color: '#991b1b', fontWeight: 'bold', marginTop: '1rem', marginBottom: 0}}>
                  Celkem: <span style={{fontSize: '1.25rem'}}>{firmyData.length + fakturyData.length + smlouvyData.length}</span> záznamů bude ODSTRANĚNO!
                </p>
              </div>
              
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button
                  onClick={() => setShowTruncateModal(false)}
                  disabled={truncating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: truncating ? 'not-allowed' : 'pointer',
                    opacity: truncating ? 0.5 : 1
                  }}
                >
                  Zrušit
                </button>
                <button
                  onClick={handleTruncate}
                  disabled={truncating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: truncating ? 'not-allowed' : 'pointer',
                    opacity: truncating ? 0.5 : 1
                  }}
                >
                  {truncating ? '⏳ Mažu...' : '🗑️ Ano, SMAZAT VŠE'}
                </button>
              </div>
            </ModalBody>
          </ModalContainer>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default VemaDenik;
