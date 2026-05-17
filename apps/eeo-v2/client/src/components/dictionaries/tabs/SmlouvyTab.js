/**
 * SmlouvyTab - Správa smluv v číselníkách
 * 
 * Funkce:
 * - Seznam smluv s filtry (úsek, druh, stav, platnost, fulltext)
 * - Vytvoření/editace smlouvy
 * - Hromadný import z Excel/CSV
 * - Detail smlouvy se statistikami a objednávkami
 * - Manuální přepočet čerpání
 * - Soft delete (deaktivace)
 * 
 * @author Frontend Team
 * @date 2025-11-23
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faTrash, faEye, faFileImport, faSyncAlt,
  faSearch, faFilter, faDownload, faCheckCircle, faTimesCircle, faBolt, faTimes,
  faChevronDown, faChevronUp, faToggleOn, faToggleOff, faExclamationTriangle, faBoltLightning
} from '@fortawesome/free-solid-svg-icons';
import { FileText, Coins, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

// TanStack Table
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';

// Dialogs
import ConfirmDialog from '../../ConfirmDialog';

// API Services
import {
  getSmlouvyList,
  getSmlouvaDetail,
  createSmlouva,
  updateSmlouva,
  deleteSmlouva,
  prepocetCerpaniSmluv,
  DRUH_SMLOUVY_OPTIONS,
  STAV_SMLOUVY_OPTIONS,
  getStavSmlouvyColor,
  getStavSmlouvyLabel
} from '../../../services/apiSmlouvy';

import { getUsekyList } from '../../../services/apiv2Dictionaries';

// Context
import AuthContext from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';

// Common Components
import { SmartTooltip } from '../../../styles/SmartTooltip';
import DatePicker from '../../DatePicker';
import { CustomSelect } from '../../CustomSelect';

// Local Components
import SmlouvyFormModal from './SmlouvyFormModal';
import SmlouvyDetailModal from './SmlouvyDetailModal';
import SmlouvyImportModal from './SmlouvyImportModal';

// =============================================================================
// INVOICE STATE LABELS (české názvy stavů faktur)
// =============================================================================

const INVOICE_STATE_LABELS = {
  ZAEVIDOVANA: 'Zaevidovaná',
  VECNA_SPRAVNOST: 'Věcná správnost',
  V_RESENI: 'V řešení',
  PREDANA_PO: 'Předaná PO',
  K_ZAPLACENI: 'K zaplacení',
  ZAPLACENO: 'Zaplaceno',
  DOKONCENA: 'Dokončená',
  STORNO: 'Storno'
};

// Helper funkce pro převod kódu stavu faktury na český název
const getInvoiceStateLabel = (code) => {
  return INVOICE_STATE_LABELS[code] || code;
};

// Helper pro styl badge objednávky dle stavu
// Barvy jsou identické s barvou textu čísla objednávky (link), jen s pozadím
const getOrdStavBadge = (stav) => {
  // ZELENÁ – dokončené/uveřejněné stavy
  if (['Dokončená', 'DOKONCENA', 'Uveřejněná', 'UVEREJNENA'].includes(stav))
    return { bg: '#d1fae5', color: '#059669', border: '#6ee7b7' };
  // ORANŽOVÁ – zkontrolováno/schváleno
  if (['Zkontrolovaná', 'ZKONTROLOVANA', 'Schválená', 'SCHVALENA'].includes(stav))
    return { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' };
  // ČERVENÁ – zrušeno
  if (['Zrušená', 'ZRUSENA'].includes(stav))
    return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' };
  // MODRÁ – vše ostatní (Nová, Ke schválení, Odeslaná, Fakturace, Ke zveřejnění…)
  return { bg: '#dbeafe', color: '#3b82f6', border: '#93c5fd' };
};

// Helper pro styl badge faktury dle stavu
const getFaStavBadge = (stav) => {
  switch (stav) {
    case 'DOKONCENA':       return { bg: '#dcfce7', color: '#16a34a', border: '#86efac' };
    case 'ZAPLACENO':       return { bg: '#d1fae5', color: '#059669', border: '#6ee7b7' };
    case 'K_ZAPLACENI':     return { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' };
    case 'PREDANA_PO':      return { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' };
    case 'VECNA_SPRAVNOST': return { bg: '#eff6ff', color: '#3b82f6', border: '#93c5fd' };
    case 'V_RESENI':        return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
    case 'ZAEVIDOVANA':     return { bg: '#f1f5f9', color: '#64748b', border: '#d1d5db' };
    case 'STORNO':          return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' };
    default:                return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
  }
};

const isMimoradnaObjednavka = (obj) => {
  const value = obj?.mimoradna_udalost;
  return value === 1 || value === '1' || value === true || value === 'true';
};

const formatInvoiceReference = (invoice) => {
  const cislo = (invoice?.fa_cislo_vema || '').toString().trim();
  const vemaKod = (invoice?.fa_vema_kod || '').toString().trim();

  if (cislo && vemaKod) {
    return `${cislo} / ${vemaKod}`;
  }

  return cislo || vemaKod || '—';
};

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

// Stats Dashboard Components

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: ${props => props.$gradient || 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'};
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const StatIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$bg || '#ffffff'};
  color: ${props => props.$color || '#1e293b'};
  box-shadow: 0 6px 14px ${props => props.$shadow || 'rgba(0, 0, 0, 0.15)'};
  flex-shrink: 0;
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${props => props.$light ? 'rgba(255, 255, 255, 0.85)' : '#64748b'};
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: 800;
  color: ${props => props.$light ? '#ffffff' : '#0f172a'};
`;

const Container = styled.div`
  padding: 1rem;
`;

const FiltersContainer = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid #e5e7eb;
`;

const ToolbarContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid ${props => 
    props.$variant === 'primary' ? '#3b82f6' :
    props.$variant === 'success' ? '#10b981' :
    props.$variant === 'warning' ? '#f59e0b' :
    props.$variant === 'danger' ? '#ef4444' : '#3b82f6'};
  border-radius: 8px;
  background: ${props => 
    props.$variant === 'primary' ? '#3b82f6' :
    props.$variant === 'success' ? '#10b981' :
    props.$variant === 'warning' ? '#f59e0b' :
    props.$variant === 'danger' ? '#ef4444' : 'white'};
  color: ${props => 
    props.$variant === 'primary' || props.$variant === 'success' || props.$variant === 'warning' || props.$variant === 'danger' ? 'white' : '#3b82f6'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => 
      props.$variant === 'primary' ? '#2563eb' :
      props.$variant === 'success' ? '#059669' :
      props.$variant === 'warning' ? '#d97706' :
      props.$variant === 'danger' ? '#dc2626' : '#eff6ff'};
    border-color: ${props => 
      props.$variant === 'primary' ? '#2563eb' :
      props.$variant === 'success' ? '#059669' :
      props.$variant === 'warning' ? '#d97706' :
      props.$variant === 'danger' ? '#dc2626' : '#2563eb'};
    transform: translateY(-1px);
    box-shadow: ${props => props.$variant === 'danger' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(59, 130, 246, 0.25)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const FilterSection = styled.div`
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

const FilterGrid = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  align-items: flex-end;
  overflow-x: auto;
  padding-bottom: 4px;

  & > * {
    flex: 1 1 170px;
    min-width: 140px;
  }
`;

const FilterField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const FilterLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 1.25rem;
`;

const FilterLabelClear = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #ef4444;
  display: flex;
  align-items: center;
  transition: transform 0.15s, opacity 0.15s;
  &:hover { opacity: 0.7; transform: scale(1.2); }
`;

const FilterSelectWithIcon = styled.div`
  position: relative;
  width: 100%;

  > svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 16px !important;
    height: 16px !important;
  }
`;

const FilterSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  padding: ${props => props.hasIcon ? '0 2.25rem 0 2rem' : '0 2.25rem 0 0.75rem'};
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 0.85rem;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #ffffff;
  cursor: pointer;
  color: ${props => props.$isEmpty ? '#9ca3af' : '#1f2937'};
  font-weight: ${props => props.$isEmpty ? '400' : '500'};
  line-height: 1.2;
  transition: all 0.2s ease;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: none;
  }

  &:hover {
    border-color: #94a3b8;
  }

  /* Custom dropdown arrow */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 16px;

  /* Styling pro placeholder option */
  option[value=""] {
    color: #9ca3af;
    font-weight: 400;
  }

  option {
    color: #1f2937;
    font-weight: 400;
    padding: 0.5rem;
  }
`;

const FilterInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;



const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 100%;

  svg.search-icon {
    position: absolute;
    left: 0.75rem;
    color: #6b7280;
    pointer-events: none;
    font-size: 1rem;
  }

  input {
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 2.5rem;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: #9ca3af;
    }
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    color: #dc2626;
    transform: translateY(-50%) scale(1.2);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  overflow-x: auto;
  overflow-y: visible;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.88rem;
  letter-spacing: -0.01em;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableHeaderCell = styled.th`
  padding: 0.5rem 0.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.8rem;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  user-select: none;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  text-transform: uppercase;
  letter-spacing: 0.025em;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;

  &:first-of-type {
    text-align: left;
  }

  &:hover {
    background: ${props => props.$sortable ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  user-select: none;
`;

const TableHeaderFilterRow = styled.tr`
  background: #f8f9fa;
  border-top: 1px solid #e5e7eb;
`;

const TableHeaderFilterCell = styled.th`
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  > svg {
    position: absolute;
    left: 0.75rem;
    color: #9ca3af;
    z-index: 1;
    pointer-events: none;
    width: 14px !important;
    height: 14px !important;
  }
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const ColumnFilterSelect = styled.select`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const Tbody = styled.tbody``;

const TableRow = styled.tr`
  background: ${props => props.$isEven ? '#f8fafc' : 'white'};
  transition: all 0.2s ease;
  ${props => props.$hasUserDrawn && `
    border-left: 3px solid #22c55e;
    background: linear-gradient(90deg, #f0fdf4 0%, ${props.$isEven ? '#f8fafc' : 'white'} 60%) !important;
  `}

  &:hover {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
  }
`;

const TableCell = styled.td`
  padding: 0.5rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 0.85rem;
  text-align: center;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow: visible;

  &:first-of-type {
    text-align: left;
    white-space: nowrap;
  }

  &:nth-of-type(2),
  &:nth-of-type(3),
  &:nth-of-type(4),
  &:nth-of-type(5) {
    text-align: left;
  }

  &:nth-of-type(3) {
    max-width: 200px;
    word-wrap: break-word;
    white-space: normal;
  }

  &:nth-of-type(4) {
    max-width: 300px;
    word-wrap: break-word;
    white-space: normal;
  }

  &:nth-of-type(7) {
    white-space: nowrap;
    min-width: 150px;
  }
`;

const Badge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$color || '#e2e8f0'};
  color: white;
  display: inline-block;
`;

const StatusBadge = Badge;

const FirmaName = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  line-height: 1.2;
`;

const ProgressBar = styled.div`
  width: 100%;
  max-width: 160px;
  min-width: 140px;
  height: 24px;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  border: 1px solid #e5e7eb;
`;

const ProgressFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: ${props => {
    const percent = parseFloat(props.$percent) || 0;
    if (percent >= 100) return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    if (percent >= 80) return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
  }};
  width: ${props => Math.min(parseFloat(props.$percent) || 0, 100)}%;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${props => (parseFloat(props.$percent) || 0) > 50 ? 'white' : '#374151'};
  text-shadow: ${props => (parseFloat(props.$percent) || 0) > 50 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'};
  z-index: 10;
  pointer-events: none;
`;

/* ─── Jezevčík bar – čerpání smlouvy ─────────────────────────────────────── */
const JezBarOuter = styled.div`
  position: relative;
  width: 100%;
  min-width: 200px;
  height: 22px;
  background: #f1f5f9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.5);
  &:hover .jez-month-num {
    color: rgba(148, 163, 184, 0.8) !important;
  }
`;
const JezBarFill = styled.div`
  position: absolute;
  top: 0; left: 0; height: 100%;
  z-index: 10;
  transition: width 0.7s ease;
  background: ${props => props.$color || '#10b981'};
  width: ${props => Math.min(props.$pct || 0, 100)}%;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const JezBarPlanned = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  z-index: 5;
  transition: width 0.7s ease, left 0.7s ease;
  opacity: 0.5;
  background-color: ${props => props.$color || '#86efac'};
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.3) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255,255,255,0.3) 50%,
    rgba(255,255,255,0.3) 75%,
    transparent 75%,
    transparent
  );
  background-size: 8px 8px;
  left: ${props => props.$left || 0}%;
  width: ${props => {
    const maxW = 100 - (props.$left || 0);
    return Math.min(props.$percent || 0, maxW);
  }}%;
`;

const JezTargetLine = styled.div`
  position: absolute;
  top: 0; bottom: 0; width: 2px;
  background: rgba(100, 116, 139, 0.6);
  z-index: 30;
  left: ${props => props.$pct || 0}%;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
`;
const JezStatusBadge = styled.div`
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.2rem 0.45rem; border-radius: 5px;
  font-weight: 800; font-size: 0.65rem; letter-spacing: 0.02em;
  white-space: nowrap; border: 1px solid;
  ${props => {
    if (props.$level === 'critical') return 'background:#fef2f2;color:#dc2626;border-color:#fecaca;';
    if (props.$level === 'warning')  return 'background:#fff7ed;color:#ea580c;border-color:#fed7aa;';
    return 'background:#f0fdf4;color:#16a34a;border-color:#bbf7d0;';
  }}
`;

/* Tooltip Portal - vykresluje tooltip mimo DOM hierarchii */
const TooltipPortal = ({ children, targetRef, isVisible }) => {
  const [position, setPosition] = React.useState({ top: 0, left: 0, adjustX: 0, adjustY: 0 });
  const tooltipRef = React.useRef(null);

  React.useEffect(() => {
    if (!targetRef.current || !isVisible) return;

    const updatePosition = () => {
      const rect = targetRef.current.getBoundingClientRect();
      // Fixed position - relativní k viewportu, ne k dokumentu (bez scrollY/scrollX)
      const baseLeft = rect.left + rect.width / 2;
      const baseTop = rect.top;
      
      let adjustX = 0;
      let adjustY = 0;
      
      // Detekce viewport boundaries po renderování
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Kontrola horizontální hranice
        if (tooltipRect.right > viewportWidth - 10) {
          adjustX = -(tooltipRect.right - viewportWidth + 20);
        } else if (tooltipRect.left < 10) {
          adjustX = 10 - tooltipRect.left + 20;
        }
        
        // Kontrola vertikální hranice - pokud by zmizel nahoře, zobraz pod prvkem
        if (tooltipRect.top < 10) {
          adjustY = rect.height + tooltipRect.height + 24;
        }
      }
      
      setPosition({
        top: baseTop,
        left: baseLeft,
        adjustX,
        adjustY,
      });
    };

    updatePosition();
    // Další update pro adjustování po renderování
    const timer = setTimeout(updatePosition, 0);
    
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetRef, isVisible]);

  if (!isVisible) return null;

  return ReactDOM.createPortal(
    <div 
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999,
        pointerEvents: 'none',
      }}>
      <div style={{ transform: `translate(${position.adjustX}px, ${position.adjustY}px)` }}>
        {children}
      </div>
    </div>,
    document.body
  );
};

/* Tooltip komponenty pro progress bar (stejné jako u LP) */
const TooltipContainer = styled.div`
  position: relative;
  display: block;
  width: 100%;
`;

const TooltipContent = styled.div`
  position: relative;
  transform: translate(-50%, calc(-100% - 16px));
  padding: 1rem;
  background: #1f2937;
  color: white;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  min-width: 280px;
  max-width: 400px;
  opacity: ${props => props.$isVisible ? 1 : 0};
  visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  pointer-events: none;
  white-space: normal;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 8px solid transparent;
    border-top-color: #1f2937;
  }
`;

const TooltipTitle = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.2);
`;

const TooltipTable = styled.table`
  width: 100%;
  font-size: 0.875rem;
  
  tr {
    &:not(:last-child) td {
      padding-bottom: 0.375rem;
    }
    
    &.divider td {
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
  }
  
  td {
    padding: 0.25rem 0;
    
    &:first-child {
      color: rgba(255,255,255,0.7);
      padding-right: 1rem;
    }
    
    &:last-child {
      text-align: right;
      font-weight: 600;
    }
  }
`;

/* Hatched overlay – celá šíře baru, diagonální pruhy pro „bez stropu / nekonečné" */
const JezBarHatch = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  opacity: 0.18;
  background-image: repeating-linear-gradient(
    45deg,
    #64748b 0px,
    #64748b 3px,
    transparent 3px,
    transparent 10px
  );
`;

/* Target line – svislá čárka pro časový progress u „bez stropu" smluv */
const JezBarTargetLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #1e293b;
  z-index: 20;
  left: ${props => Math.min(props.$pct || 0, 100)}%;
  transform: translateX(-50%);
  box-shadow: 0 0 4px rgba(30, 41, 59, 0.4);
  &::before {
    content: '';
    position: absolute;
    top: -3px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid #1e293b;
  }
  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 4px solid #1e293b;
  }
`;

/* ─── Split skupiny: smlouvy se stropem / bez stropu ─────────────────────── */
const SkupinyRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
`;

const SkupinaCard = styled.div`
  background: ${props => props.$bg || 'white'};
  border: 1px solid ${props => props.$border || '#e2e8f0'};
  border-radius: 10px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SkupinaHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid ${props => props.$border || '#f1f5f9'};
`;

const SkupinaTitle = styled.span`
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${props => props.$color || '#475569'};
`;

const SkupinaBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 20px;
  background: ${props => props.$bg || '#f1f5f9'};
  color: ${props => props.$color || '#64748b'};
`;

const SkupinaMini = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
`;

const SkupinaMiniItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const SkupinaMiniLabel = styled.span`
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
`;

const SkupinaMiniValue = styled.span`
  font-size: 0.88rem;
  font-weight: 800;
  color: ${props => props.$color || '#1e293b'};
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.02em;
`;

const SkupinaBarWrap = styled.div`
  position: relative;
  height: 10px;
  background: #f1f5f9;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(226,232,240,0.5);
`;

const SkupinaBarFill = styled.div`
  position: absolute;
  top: 0; left: 0; height: 100%;
  border-radius: 5px;
  background: ${props => props.$color || '#10b981'};
  width: ${props => Math.min(props.$pct || 0, 100)}%;
  transition: width 0.6s ease;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.15);
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PaginationButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #1f2937;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ActionCell = styled.div`
  display: flex;
  gap: 0.12rem;
  justify-content: center;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #1e293b;
    background: #f1f5f9;
  }

  &.view {
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  }

  &.edit {
    &:hover {
      color: #3b82f6;
      background: #eff6ff;
    }
  }

  &.delete {
    &:hover {
      color: #dc2626;
      background: #fef2f2;
    }
  }

  &.toggle-active {
    &:hover {
      color: #10b981;
      background: #f0fdf4;
    }
  }

  &.toggle-inactive {
    &:hover {
      color: #6b7280;
      background: #f9fafb;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #64748b;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.3;
`;

const EmptyText = styled.div`
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
`;

const EmptyHint = styled.div`
  font-size: 0.9rem;
  color: #94a3b8;
`;

// Loading Overlay Components
const LoadingOverlay = styled.div`
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
`;

const LoadingSpinner = styled.div`
  width: 64px;
  height: 64px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingMessage = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
`;

const LoadingSubtext = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out 0.1s;
`;

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const FILTERS_STORAGE_KEY = 'smlouvy_filters';
const SHOW_FILTERS_STORAGE_KEY = 'smlouvy_showFilters';
const SKUPINA_FILTER_STORAGE_KEY = 'smlouvy_skupinaFilter';

// Práh pro rozlišení smluv "bez stropu" - částky menší než toto se považují za symbolické (bez reálného limitu)
const MIN_CAP_THRESHOLD = 100; // Kč - smlouvy s limitem < 100 Kč (např. 1 Kč) = bez stropu
const DEFAULT_STAV_FILTER = 'AKTIVNI_NEARCHIVNI';
const ARCHIVE_STAV_FILTER = 'ARCHIVNI';
const DEFAULT_STAV_OPTION = { value: DEFAULT_STAV_FILTER, label: 'Aktivní a ukončené (nearchivní)' };
const ARCHIVE_STAV_OPTION = { value: ARCHIVE_STAV_FILTER, label: 'Archivní' };

// Helper funkce pro načtení filtrů z localStorage
const loadFiltersFromStorage = () => {
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('⚠️ Chyba při načítání filtrů smluv z localStorage:', error);
  }
  return null;
};

// Helper funkce pro uložení filtrů do localStorage
const saveFiltersToStorage = (filters) => {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.warn('⚠️ Chyba při ukládání filtrů smluv do localStorage:', error);
  }
};

// Helper funkce pro načtení stavu showFilters z localStorage
const loadShowFiltersFromStorage = () => {
  try {
    const saved = localStorage.getItem(SHOW_FILTERS_STORAGE_KEY);
    return saved === 'true';
  } catch (error) {
    return false;
  }
};

// Helper funkce pro uložení stavu showFilters do localStorage
const saveShowFiltersToStorage = (show) => {
  try {
    localStorage.setItem(SHOW_FILTERS_STORAGE_KEY, show.toString());
  } catch (error) {
    console.warn('⚠️ Chyba při ukládání stavu filtrů do localStorage:', error);
  }
};

// Helper funkce pro načtení skupinaFilter z localStorage
const loadSkupinaFilterFromStorage = () => {
  try {
    const saved = localStorage.getItem(SKUPINA_FILTER_STORAGE_KEY);
    return saved ? (saved === 'null' ? null : saved) : null;
  } catch (error) {
    return null;
  }
};

// Helper funkce pro uložení skupinaFilter do localStorage
const saveSkupinaFilterToStorage = (value) => {
  try {
    localStorage.setItem(SKUPINA_FILTER_STORAGE_KEY, value === null ? 'null' : value);
  } catch (error) {
    console.warn('⚠️ Chyba při ukládání skupinaFilter do localStorage:', error);
  }
};

// =============================================================================
// KOMPONENTA
// =============================================================================

const SmlouvyTab = ({ readOnly = false, forceUnrestrictedReadOnly = false, initialFilter = '' }) => {
  const { user, token, userDetail, hasAdminRole } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  // Režim omezení pouze pro menubar "Čerpání smluv" (readOnly varianta)
  // forceUnrestrictedReadOnly = contractsUnrestricted z App.js (tam se již správně
  // kontrolují SPENDING/CONTRACT/LP _MANAGE a _VIEW_ALL práva)
  const userUsekId = user?.usek_id || userDetail?.usek_id || null;
  const userUsekZkr = String(user?.usek_zkr || userDetail?.usek_zkr || '').trim().toUpperCase();
  const userId = user?.id ? parseInt(user.id, 10) : (userDetail?.id ? parseInt(userDetail.id, 10) : null);
  const isAdminUser = typeof hasAdminRole === 'function' ? hasAdminRole() : false;
  const isRestrictedCerpaniUser = readOnly && !forceUnrestrictedReadOnly && !isAdminUser;

  // State
  const [smlouvy, setSmlouvy] = useState([]);
  const [useky, setUseky] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters - načíst z localStorage při inicializaci
  const [showFilters, setShowFilters] = useState(() => loadShowFiltersFromStorage());
  const [filters, setFilters] = useState(() => {
    const savedFilters = loadFiltersFromStorage();
    const base = savedFilters || {};
    const hasSavedStav = Object.prototype.hasOwnProperty.call(base, 'stav');
    return {
      search: base.search || '',
      usek_id: Array.isArray(base.usek_id) ? base.usek_id : [],
      druh_smlouvy: Array.isArray(base.druh_smlouvy) ? base.druh_smlouvy : [],
      stav: hasSavedStav ? base.stav : DEFAULT_STAV_FILTER,
      platnost_od: base.platnost_od || '',
      platnost_do: base.platnost_do || ''
    };
  });

  // State pro CustomSelect (multi-select filtry)
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const toggleSelect = useCallback((fieldName) => {
    setSelectStates(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  }, []);

  // TanStack Table state
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState({
    cislo_smlouvy: initialFilter || '',
    nazev_firmy: '',
    ico: '',
    nazev_smlouvy: '',
    usek_zkr: '',
    druh_smlouvy: '',
    stav: '',
    pouzit_v_obj_formu: ''
  });

  // Filtr skupiny (klik na dlaždici): null = vše, 'se_stropem', 'bez_stropu'
  const [skupinaFilter, setSkupinaFilter] = useState(() => loadSkupinaFilterFromStorage());

  // Pagination
  const [pageSize, setPageSize] = useState(() => {
    try {
      const saved = localStorage.getItem('smlouvy_pageSize');
      return saved ? parseInt(saved, 10) : 25;
    } catch {
      return 25;
    }
  });
  const [pageIndex, setPageIndex] = useState(0);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingSmlouva, setEditingSmlouva] = useState(null);
  const [viewingSmlouva, setViewingSmlouva] = useState(null);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: null
  });

  // State pro expand řádků smluv (lazy-load objednávek)
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedContracts, setExpandedContracts] = useState(() => {
    try {
      const saved = localStorage.getItem(`smlouvy_expanded_${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [contractExpandOrders, setContractExpandOrders] = useState({});
  const [contractExpandLoading, setContractExpandLoading] = useState({});
  // Sort state pro expand sub-tabulky: { [key]: { col: string, dir: 'asc'|'desc'|null } }
  const [contractExpandSort, setContractExpandSort] = useState(() => {
    try {
      const saved = localStorage.getItem(`smlouvy_expand_sort_${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  // Paging state pro expand sub-tabulky: { [key]: { page: number, pageSize: number } }
  const [contractExpandPage, setContractExpandPage] = useState(() => {
    try {
      const saved = localStorage.getItem(`smlouvy_expand_page_${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Persist expand/sort/paging do LS
  useEffect(() => {
    try { localStorage.setItem(`smlouvy_expanded_${user?.id || 'default'}`, JSON.stringify(expandedContracts)); } catch {}
  }, [expandedContracts, user?.id]);
  useEffect(() => {
    try { localStorage.setItem(`smlouvy_expand_sort_${user?.id || 'default'}`, JSON.stringify(contractExpandSort)); } catch {}
  }, [contractExpandSort, user?.id]);
  useEffect(() => {
    try { localStorage.setItem(`smlouvy_expand_page_${user?.id || 'default'}`, JSON.stringify(contractExpandPage)); } catch {}
  }, [contractExpandPage, user?.id]);

  const isRowInUserUsek = useCallback((smlouva) => {
    const smlouvaUsekId = smlouva?.usek_id ? parseInt(smlouva.usek_id, 10) : null;
    const smlouvaUsekZkr = String(smlouva?.usek_zkr || '').trim().toUpperCase();
    const matchByZkr = Boolean(userUsekZkr && smlouvaUsekZkr && userUsekZkr === smlouvaUsekZkr);
    const matchById = Boolean(userUsekId && smlouvaUsekId && Number(userUsekId) === Number(smlouvaUsekId));
    return matchByZkr || matchById;
  }, [userUsekId, userUsekZkr]);

  const resolveCerpani = useCallback((smlouva) => {
    const isMujUsek = isRowInUserUsek(smlouva);
    const usePersonal = isRestrictedCerpaniUser && !isMujUsek;
    const dokonceno = usePersonal
      ? (parseFloat(smlouva?.cerpano_faktury_dokoncene_uzivatel) || 0)
      : (parseFloat(smlouva?.cerpano_faktury_dokoncene) || 0);
    const vProcesu = usePersonal
      ? (parseFloat(smlouva?.cerpano_v_procesu_uzivatel) || 0)
      : (parseFloat(smlouva?.cerpano_v_procesu) || 0);
    const celkem = usePersonal
      ? (dokonceno + vProcesu)
      : (parseFloat(smlouva?.cerpano_celkem) || 0);
    return { isMujUsek, usePersonal, celkem, dokonceno, vProcesu };
  }, [isRestrictedCerpaniUser, isRowInUserUsek]);

  const toggleContractExpand = useCallback(async (smlouvaId, filterByUser = false) => {
    const isExpanding = !expandedContracts[smlouvaId];
    setExpandedContracts(prev => ({ ...prev, [smlouvaId]: isExpanding }));
    if (isExpanding && !contractExpandOrders[smlouvaId]) {
      setContractExpandLoading(prev => ({ ...prev, [smlouvaId]: true }));
      try {
        const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
        const payload = {
          token,
          username: user.username,
          smlouva_id: smlouvaId
        };
        if (filterByUser && userId) {
          payload.requesting_user_id = userId;
        }
        const resp = await fetch(`${API_BASE_URL}order-v3/smlouva-expand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await resp.json();
        // Endpoint vrací { objednavky: [...], prime_faktury: [...] }
        setContractExpandOrders(prev => ({ ...prev, [smlouvaId]: json.data || { objednavky: [], prime_faktury: [] } }));
      } catch {
        setContractExpandOrders(prev => ({ ...prev, [smlouvaId]: { objednavky: [], prime_faktury: [] } }));
      }
      setContractExpandLoading(prev => ({ ...prev, [smlouvaId]: false }));
    }
  }, [expandedContracts, contractExpandOrders, token, user, userId]);

  // Auto-načtení dat pro rozbalené řádky z LS (po mount)
  useEffect(() => {
    if (!token || !user?.username || smlouvy.length === 0) return;
    const expandedKeys = Object.keys(expandedContracts).filter(k => expandedContracts[k]);
    if (expandedKeys.length === 0) return;
    expandedKeys.forEach(async (smlouvaId) => {
      if (contractExpandOrders[smlouvaId]) return;
      const smlouva = smlouvy.find(item => String(item.id) === String(smlouvaId));
      if (!smlouva) return;
      const filterByUser = isRestrictedCerpaniUser && !isRowInUserUsek(smlouva);
      setContractExpandLoading(prev => ({ ...prev, [smlouvaId]: true }));
      try {
        const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
        const payload = { token, username: user.username, smlouva_id: smlouvaId };
        if (filterByUser && userId) {
          payload.requesting_user_id = userId;
        }
        const resp = await fetch(`${API_BASE_URL}order-v3/smlouva-expand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await resp.json();
        setContractExpandOrders(prev => ({ ...prev, [smlouvaId]: json.data || { objednavky: [], prime_faktury: [] } }));
      } catch {
        setContractExpandOrders(prev => ({ ...prev, [smlouvaId]: { objednavky: [], prime_faktury: [] } }));
      }
      setContractExpandLoading(prev => ({ ...prev, [smlouvaId]: false }));
    });
  }, [token, user?.username, smlouvy, expandedContracts, contractExpandOrders, isRestrictedCerpaniUser, isRowInUserUsek, userId]);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ⚠️ usek_id a druh_smlouvy jsou multi-select (pole) → filtrují se client-side
      // Do API posílat POUZE skalární hodnoty (string/bool), nikdy pole!
      // Stav filtrujeme client-side, aby se nezmensila nabidka stavu v selectu.
      // show_inactive=true kdyz je zvoleno "Vsechny stavy" nebo stav NEAKTIVNI
      const apiFilters = {
        token: token,
        username: user.username,
        search: filters.search || '',
        stav: '',
        platnost_od: filters.platnost_od || '',
        platnost_do: filters.platnost_do || '',
        show_inactive: !filters.stav || filters.stav === 'NEAKTIVNI',
        restrict_view: isRestrictedCerpaniUser,
        include_stats: true  // ⚡ SmlouvyTab potřebuje statistiky pro zobrazení v tabulce
      };

      const [smlouvyResult, usekyResult] = await Promise.all([
        getSmlouvyList(apiFilters),
        getUsekyList({
          token: token,
          username: user.username,
          show_inactive: false
        })
      ]);

      setSmlouvy(smlouvyResult.data);
      setUseky(usekyResult);
    } catch (err) {
      console.error('[SMLOUVY] ❌ Error loading data:', err);
      console.error('[SMLOUVY] ❌ Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =============================================================================
  // PERSISTENCE - Ukládání filtrů do localStorage
  // =============================================================================

  useEffect(() => {
    saveFiltersToStorage(filters);
  }, [filters]);

  useEffect(() => {
    saveShowFiltersToStorage(showFilters);
  }, [showFilters]);

  // =============================================================================
  // LOCAL FILTERING
  // =============================================================================

  const archiveCutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isArchivedByDate = useCallback((smlouva) => {
    if (!smlouva?.platnost_do) return false;
    const d = new Date(smlouva.platnost_do);
    if (Number.isNaN(d.getTime())) return false;
    return d < archiveCutoff;
  }, [archiveCutoff]);

  const includeInactive = useMemo(() => !filters.stav || filters.stav === 'NEAKTIVNI', [filters.stav]);
  const isDefaultActiveFilter = filters.stav === DEFAULT_STAV_FILTER;
  const isAllStavFilter = !filters.stav;
  const isArchiveOnlyFilter = filters.stav === ARCHIVE_STAV_FILTER;
  const isInactiveOnlyFilter = filters.stav === 'NEAKTIVNI';

  const passesArchiveVisibility = useCallback((smlouva) => {
    const isInactive = !(smlouva?.aktivni === 1 || smlouva?.aktivni === true);
    const isArchived = !isInactive && isArchivedByDate(smlouva);
    if (isAllStavFilter) return true;
    if (isArchiveOnlyFilter) return isArchived;
    if (isInactiveOnlyFilter) return isInactive;
    if (isInactive) return false;
    if (isArchived) return false;
    return true;
  }, [isAllStavFilter, isArchiveOnlyFilter, isInactiveOnlyFilter, isArchivedByDate]);

  // Základ pro options: smlouvy po aplikaci restriction + archiv viditelnosti (bez druh/stav/search filtrů)
  // Tím zajistíme, že options nabízí pouze hodnoty které uživatel skutečně může vidět
  const baseSmlouvy = useMemo(() => {
    return smlouvy.filter(smlouva => {
      if (isRestrictedCerpaniUser) {
        const jeMujUsek = isRowInUserUsek(smlouva);
        const pouzitVObjFormu = Number(smlouva.pouzit_v_obj_formu || 0);
        const cerpalUzivatel = pouzitVObjFormu === 1
          ? Number(smlouva.pocet_objednavek_uzivatel || 0) > 0
          : Number(smlouva.pocet_faktur_uzivatel || 0) > 0;
        if (!jeMujUsek && !cerpalUzivatel) return false;
      }
      if (!passesArchiveVisibility(smlouva)) return false;
      return true;
    });
  }, [smlouvy, isRestrictedCerpaniUser, passesArchiveVisibility, isRowInUserUsek]);

  // Stav filter ma vzdy nabizet vsechny stavy, aby se po volbe NEAKTIVNI neskrivaly
  const availableStavOptions = useMemo(() => {
    const opts = [DEFAULT_STAV_OPTION, ARCHIVE_STAV_OPTION, ...STAV_SMLOUVY_OPTIONS];
    if (!opts.some(opt => opt.value === 'NEAKTIVNI')) {
      opts.push({ value: 'NEAKTIVNI', label: 'Neaktivní' });
    }
    return opts;
  }, []);

  const availableDruhOptions = useMemo(() => {
    const druhSet = new Set(baseSmlouvy.map(s => s.druh_smlouvy).filter(Boolean));
    return DRUH_SMLOUVY_OPTIONS.filter(opt => druhSet.has(opt.value));
  }, [baseSmlouvy]);

  const filteredSmlouvyBase = useMemo(() => {
    const result = smlouvy.filter(smlouva => {
      // 🎯 OMEZENÍ POUZE PRO MENUBAR "ČERPÁNÍ":
      // Běžný uživatel (VIEW_OWN) vidí:
      // 1) VŠECHNY smlouvy svého úseku
      // 2) Smlouvy z jiných úseků pouze pokud z nich osobně čerpal
      if (isRestrictedCerpaniUser) {
        const jeMujUsek = isRowInUserUsek(smlouva);
        // Symbol +/- pro rozbalení a viditelnost řádku:
        // - pouzit_v_obj_formu=1 → objednávky uživatele
        // - pouzit_v_obj_formu=0 → faktury uživatele (vytvořil nebo potvrdil)
        const pouzitVObjFormu = Number(smlouva.pouzit_v_obj_formu || 0);
        const cerpalUzivatel = pouzitVObjFormu === 1 
          ? Number(smlouva.pocet_objednavek_uzivatel || 0) > 0
          : Number(smlouva.pocet_faktur_uzivatel || 0) > 0;
        if (!jeMujUsek && !cerpalUzivatel) {
          return false;
        }
      }

      // Aktivní/neaktivní
      if (!passesArchiveVisibility(smlouva)) return false;

      // Fulltext search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = (
          (smlouva.cislo_smlouvy || '').toLowerCase().includes(searchLower) ||
          (smlouva.nazev_smlouvy || '').toLowerCase().includes(searchLower) ||
          (smlouva.nazev_firmy || '').toLowerCase().includes(searchLower) ||
          (smlouva.popis_smlouvy || '').toLowerCase().includes(searchLower)
        );
        if (!matches) return false;
      }

      // Úsek (multi-select - pole hodnot)
      if (filters.usek_id.length > 0 && !filters.usek_id.map(String).includes(String(smlouva.usek_id))) {
        return false;
      }

      // Druh smlouvy (multi-select - pole hodnot)
      if (filters.druh_smlouvy.length > 0 && !filters.druh_smlouvy.includes(smlouva.druh_smlouvy)) {
        return false;
      }

      // Stav
      if (filters.stav === 'NEAKTIVNI') {
        if (smlouva.aktivni === 1 || smlouva.aktivni === true) return false;
      } else if (filters.stav && !isDefaultActiveFilter && !isArchiveOnlyFilter && smlouva.stav !== filters.stav) {
        return false;
      }

      // Datumový rozsah - smlouva musí pokrývat (obsahovat) zadané datum
      if (filters.platnost_od) {
        const filterOd = new Date(filters.platnost_od);
        const smlouvaOd = new Date(smlouva.platnost_od);
        const smlouvaDo = new Date(smlouva.platnost_do);
        
        // Smlouva musí pokrývat datum "od" (může začínat dříve nebo ve stejný den a končit později nebo ve stejný den)
        if (filterOd < smlouvaOd || filterOd > smlouvaDo) {
          return false;
        }
      }

      if (filters.platnost_do) {
        const filterDo = new Date(filters.platnost_do);
        const smlouvaOd = new Date(smlouva.platnost_od);
        const smlouvaDo = new Date(smlouva.platnost_do);
        
        // Smlouva musí pokrývat datum "do" (může začínat dříve nebo ve stejný den a končit později nebo ve stejný den)
        if (filterDo < smlouvaOd || filterDo > smlouvaDo) {
          return false;
        }
      }

      // Column filters (druhý řádek)
      if (columnFilters.cislo_smlouvy && !(smlouva.cislo_smlouvy || '').toLowerCase().includes(columnFilters.cislo_smlouvy.toLowerCase())) {
        return false;
      }
      if (columnFilters.nazev_firmy && !(smlouva.nazev_firmy || '').toLowerCase().includes(columnFilters.nazev_firmy.toLowerCase())) {
        return false;
      }
      if (columnFilters.ico && !(smlouva.ico || '').toLowerCase().includes(columnFilters.ico.toLowerCase())) {
        return false;
      }
      if (columnFilters.nazev_smlouvy && !(smlouva.nazev_smlouvy || '').toLowerCase().includes(columnFilters.nazev_smlouvy.toLowerCase())) {
        return false;
      }
      if (columnFilters.usek_zkr && !(smlouva.usek_zkr || '').toLowerCase().includes(columnFilters.usek_zkr.toLowerCase())) {
        return false;
      }
      if (columnFilters.druh_smlouvy && smlouva.druh_smlouvy !== columnFilters.druh_smlouvy) {
        return false;
      }
      if (columnFilters.stav && smlouva.stav !== columnFilters.stav) {
        return false;
      }
      if (columnFilters.pouzit_v_obj_formu !== '' && smlouva.pouzit_v_obj_formu !== parseInt(columnFilters.pouzit_v_obj_formu)) {
        return false;
      }

      return true;
    });

    if (!isRestrictedCerpaniUser) {
      return result;
    }

    // Pořadí pro menubar Čerpání smluv:
    // 1) Smlouvy vlastního úseku první, 2) ostatní (osobně čerpané z cizích úseků)
    return [...result].sort((a, b) => {
      const getPriority = (smlouva) => {
        return isRowInUserUsek(smlouva) ? 1 : 2;
      };
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pa - pb;
      return String(a.cislo_smlouvy || '').localeCompare(String(b.cislo_smlouvy || ''), 'cs', {
        numeric: true,
        sensitivity: 'base'
      });
    });
  }, [smlouvy, filters, columnFilters, isRestrictedCerpaniUser, isRowInUserUsek, passesArchiveVisibility]);

  const filteredSmlouvyBaseAll = useMemo(() => {
    const result = smlouvy.filter(smlouva => {
      if (isRestrictedCerpaniUser) {
        const jeMujUsek = isRowInUserUsek(smlouva);
        const pouzitVObjFormu = Number(smlouva.pouzit_v_obj_formu || 0);
        const cerpalUzivatel = pouzitVObjFormu === 1
          ? Number(smlouva.pocet_objednavek_uzivatel || 0) > 0
          : Number(smlouva.pocet_faktur_uzivatel || 0) > 0;
        if (!jeMujUsek && !cerpalUzivatel) {
          return false;
        }
      }

      const isInactive = !(smlouva.aktivni === 1 || smlouva.aktivni === true);
      if (isInactive && !includeInactive && filters.stav !== 'NEAKTIVNI') {
        return false;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = (
          (smlouva.cislo_smlouvy || '').toLowerCase().includes(searchLower) ||
          (smlouva.nazev_smlouvy || '').toLowerCase().includes(searchLower) ||
          (smlouva.nazev_firmy || '').toLowerCase().includes(searchLower) ||
          (smlouva.popis_smlouvy || '').toLowerCase().includes(searchLower)
        );
        if (!matches) return false;
      }

      if (filters.usek_id.length > 0 && !filters.usek_id.map(String).includes(String(smlouva.usek_id))) {
        return false;
      }

      if (filters.druh_smlouvy.length > 0 && !filters.druh_smlouvy.includes(smlouva.druh_smlouvy)) {
        return false;
      }

      if (filters.stav === 'NEAKTIVNI') {
        if (!isInactive) return false;
      } else if (filters.stav && !isDefaultActiveFilter && !isArchiveOnlyFilter && smlouva.stav !== filters.stav) {
        return false;
      }

      if (filters.platnost_od) {
        const filterOd = new Date(filters.platnost_od);
        const smlouvaOd = new Date(smlouva.platnost_od);
        const smlouvaDo = new Date(smlouva.platnost_do);
        if (filterOd < smlouvaOd || filterOd > smlouvaDo) {
          return false;
        }
      }

      if (filters.platnost_do) {
        const filterDo = new Date(filters.platnost_do);
        const smlouvaOd = new Date(smlouva.platnost_od);
        const smlouvaDo = new Date(smlouva.platnost_do);
        if (filterDo < smlouvaOd || filterDo > smlouvaDo) {
          return false;
        }
      }

      if (columnFilters.cislo_smlouvy && !(smlouva.cislo_smlouvy || '').toLowerCase().includes(columnFilters.cislo_smlouvy.toLowerCase())) {
        return false;
      }
      if (columnFilters.nazev_firmy && !(smlouva.nazev_firmy || '').toLowerCase().includes(columnFilters.nazev_firmy.toLowerCase())) {
        return false;
      }
      if (columnFilters.ico && !(smlouva.ico || '').toLowerCase().includes(columnFilters.ico.toLowerCase())) {
        return false;
      }
      if (columnFilters.nazev_smlouvy && !(smlouva.nazev_smlouvy || '').toLowerCase().includes(columnFilters.nazev_smlouvy.toLowerCase())) {
        return false;
      }
      if (columnFilters.usek_zkr && !(smlouva.usek_zkr || '').toLowerCase().includes(columnFilters.usek_zkr.toLowerCase())) {
        return false;
      }
      if (columnFilters.druh_smlouvy && smlouva.druh_smlouvy !== columnFilters.druh_smlouvy) {
        return false;
      }
      if (columnFilters.stav && smlouva.stav !== columnFilters.stav) {
        return false;
      }
      if (columnFilters.pouzit_v_obj_formu !== '' && smlouva.pouzit_v_obj_formu !== parseInt(columnFilters.pouzit_v_obj_formu)) {
        return false;
      }

      return true;
    });

    if (!isRestrictedCerpaniUser) {
      return result;
    }

    return [...result].sort((a, b) => {
      const getPriority = (smlouva) => {
        return isRowInUserUsek(smlouva) ? 1 : 2;
      };
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pa - pb;
      return String(a.cislo_smlouvy || '').localeCompare(String(b.cislo_smlouvy || ''), 'cs', {
        numeric: true,
        sensitivity: 'base'
      });
    });
  }, [smlouvy, filters, columnFilters, includeInactive, isRestrictedCerpaniUser, isRowInUserUsek]);

  const filteredSmlouvy = useMemo(() => {
    if (!skupinaFilter) {
      return filteredSmlouvyBase;
    }
    return filteredSmlouvyBase.filter(smlouva => {
      const limit = parseFloat(smlouva.hodnota_s_dph) || 0;
      if (skupinaFilter === 'se_stropem') return limit >= MIN_CAP_THRESHOLD;
      if (skupinaFilter === 'bez_stropu') return limit < MIN_CAP_THRESHOLD;
      return true;
    });
  }, [filteredSmlouvyBase, skupinaFilter]);

  // =============================================================================
  // PAGINATION - useEffects (před table)
  // =============================================================================

  // Save pageSize to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('smlouvy_pageSize', pageSize.toString());
    } catch (error) {
      console.warn('⚠️ Chyba při ukládání pageSize:', error);
    }
  }, [pageSize]);

  // Save skupinaFilter to localStorage
  useEffect(() => {
    saveSkupinaFilterToStorage(skupinaFilter);
  }, [skupinaFilter]);

  // Reset pageIndex when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [filters]);

  // =============================================================================
  // STATISTICS
  // =============================================================================

  const statistics = useMemo(() => {
    // ✅ AKTIVNÍ = kde aktivni != 0 (nebo aktivni === true / aktivni === 1)
    const aktivniSmlouvy = filteredSmlouvyBaseAll.filter(s => s.aktivni == 1 || s.aktivni === true);
    
    // ✅ PLATNÉ = aktivní a platnost_do >= dnes (nebo platnost_do IS NULL)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const platneSmlouvy = aktivniSmlouvy.filter(s => {
      if (!s.platnost_do) return true; // Pokud není platnost_do, je neomezená
      const platnostDo = new Date(s.platnost_do);
      return platnostDo >= today;
    });
    const vyprselychSmluv = aktivniSmlouvy.length - platneSmlouvy.length;
    
    // ✅ PRAVIDLO: Kdyz se neukazuji neaktivni, pocitat jen aktivni smlouvy
    const smlouvyProStatistiku = includeInactive
      ? filteredSmlouvyBaseAll      // Zobrazují se i neaktivní → sečíst všechny zobrazené
      : aktivniSmlouvy;       // Nezobrazují se neaktivní → sečíst jen kde aktivni!=0
    
    // ✅ CELKEM ČERPÁNO: Podle pravidla výše
    const celkemCerpano = smlouvyProStatistiku.reduce((sum, s) => sum + resolveCerpani(s).celkem, 0);
    
    // ✅ CELKOVÝ LIMIT: sečíst jen smlouvy se stropem (hodnota_s_dph >= MIN_CAP_THRESHOLD)
    // Smlouvy s limitem < 100 Kč (symbolické 1 Kč apod.) se považují za bez stropu
    const smlouvySeStropem = smlouvyProStatistiku.filter(s => (parseFloat(s.hodnota_s_dph) || 0) >= MIN_CAP_THRESHOLD);
    const celkemLimit = smlouvySeStropem.reduce((sum, s) => sum + (parseFloat(s.hodnota_s_dph) || 0), 0);
    // ✅ ZBÝVÁ: jen pro smlouvy se stropem; pro smlouvy bez stropu je to nedefinované
    const celkemZbyva = smlouvySeStropem.length > 0
      ? smlouvySeStropem.reduce((sum, s) => {
          const limit = parseFloat(s.hodnota_s_dph) || 0;
          const cerpano = resolveCerpani(s).celkem;
          return sum + (limit - cerpano);
        }, 0)
      : null;
    
    // ℹ️ CELKOVÉ PLNĚNÍ VŠECH aktivních smluv (včetně vypršených)
    const celkemPlneniVsech = aktivniSmlouvy.reduce((sum, s) => sum + (parseFloat(s.hodnota_plneni_s_dph) || 0), 0);
    
    // ℹ️ PLNĚNÍ JEN PLATNÝCH smluv (bez vypršených)
    const plneniPlatnychSmluv = platneSmlouvy.reduce((sum, s) => sum + (parseFloat(s.hodnota_plneni_s_dph) || 0), 0);
    
    // ✅ PRŮMĚRNÉ ČERPÁNÍ: celkové čerpání / celkový limit se stropem (v %)
    // Jen pro smlouvy s reálným limitem (>= 100 Kč)
    const prumerneCerpani = celkemLimit > 0
      ? (celkemCerpano / celkemLimit) * 100
      : null;

    return {
      pocet_celkem: filteredSmlouvyBaseAll.length,
      pocet_aktivnich: aktivniSmlouvy.length,
      pocet_platnych: platneSmlouvy.length,
      pocet_vyprsenych: vyprselychSmluv,
      celkem_cerpano: celkemCerpano,
      celkem_limit: celkemLimit,
      celkem_zbyva: celkemZbyva,
      celkem_plneni_vsech: celkemPlneniVsech,
      plneni_platnich: plneniPlatnychSmluv,
      prumerne_cerpani: prumerneCerpani,
      // Mini-skupiny pro split blok
      skupina_se_stropem: (() => {
        const arr = smlouvyProStatistiku.filter(s => (parseFloat(s.hodnota_s_dph) || 0) >= MIN_CAP_THRESHOLD);
        const limit = arr.reduce((s, x) => s + (parseFloat(x.hodnota_s_dph) || 0), 0);
        const cerpano = arr.reduce((s, x) => s + resolveCerpani(x).celkem, 0);
        const zbyva = arr.reduce((s, x) => {
          const limitValue = parseFloat(x.hodnota_s_dph) || 0;
          const cerpanoValue = resolveCerpani(x).celkem;
          return s + (limitValue - cerpanoValue);
        }, 0);
        return { pocet: arr.length, limit, cerpano, zbyva, pct: limit > 0 ? (cerpano / limit) * 100 : 0 };
      })(),
      skupina_bez_stropu: (() => {
        const arr = smlouvyProStatistiku.filter(s => (parseFloat(s.hodnota_s_dph) || 0) < MIN_CAP_THRESHOLD);
        const cerpano = arr.reduce((s, x) => s + resolveCerpani(x).celkem, 0);
        return { pocet: arr.length, cerpano };
      })(),
    };
  }, [filteredSmlouvyBaseAll, includeInactive, resolveCerpani]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleCreate = () => {
    if (readOnly) return;
    setEditingSmlouva(null);
    setFormModalOpen(true);
  };

  const handleEdit = (smlouva) => {
    if (readOnly) return;
    setEditingSmlouva(smlouva);
    setFormModalOpen(true);
  };

  const handleView = async (smlouva) => {
    try {
      const detail = await getSmlouvaDetail({
        token: token,
        username: user.username,
        id: smlouva.id
      });
      setViewingSmlouva(detail);
      setDetailModalOpen(true);
    } catch (err) {
      console.error('Chyba při načítání detailu:', err);
      setError('Chyba při načítání detailu: ' + err.message);
    }
  };

  const handleToggleStatus = async (smlouva) => {
    if (readOnly) return;
    const isActive = smlouva.aktivni == 1 || smlouva.aktivni === true;
    const action = isActive ? 'deaktivovat' : 'aktivovat';

    setConfirmDialog({
      isOpen: true,
      title: isActive ? 'Deaktivace smlouvy' : 'Aktivace smlouvy',
      message: isActive ? (
        <>
          <p>Opravdu chcete deaktivovat smlouvu <strong>{smlouva.cislo_smlouvy}</strong>?</p>
          <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 600 }}>
            ⚠️ Smlouva se nebude nabízet v objednávkách a nebude se počítat do statistik čerpání.
          </p>
        </>
      ) : (
        <>
          <p>Opravdu chcete aktivovat smlouvu <strong>{smlouva.cislo_smlouvy}</strong>?</p>
          <p style={{ marginTop: '1rem', color: '#10b981', fontWeight: 600 }}>
            ✅ Smlouva se bude nabízet v objednávkách a bude se počítat do statistik čerpání.
          </p>
        </>
      ),
      variant: isActive ? 'warning' : 'success',
      onConfirm: async () => {
        try {
          await updateSmlouva({
            token: token,
            username: user.username,
            id: smlouva.id,
            smlouvaData: {
              aktivni: isActive ? 0 : 1
            }
          });
          loadData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err) {
          console.error(`Chyba při ${action}:`, err);
          setError(`Chyba při ${action}: ` + err.message);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  const handleDelete = async (smlouva) => {
    if (readOnly) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Smazání smlouvy',
      message: (
        <>
          <p>Opravdu chcete trvale smazat smlouvu <strong>{smlouva.cislo_smlouvy}</strong>?</p>
          <p style={{ marginTop: '1rem', color: '#dc2626', fontWeight: 600 }}>
            ⚠️ Tato akce je <strong>NEVRATNÁ</strong>!
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
            Tip: Pokud chcete smlouvu jen dočasně skrýt, použijte raději deaktivaci.
          </p>
        </>
      ),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteSmlouva({
            token: token,
            username: user.username,
            id: smlouva.id
          });
          loadData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err) {
          console.error('Chyba při mazání:', err);
          setError('Chyba při mazání: ' + err.message);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  const handlePrepocetCerpani = async () => {
    if (readOnly) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Přepočet čerpání smluv',
      message: (
        <>
          <p>Opravdu chcete přepočítat čerpání <strong>všech smluv</strong>?</p>
          <p style={{ marginTop: '1rem', color: '#f59e0b', fontWeight: 600 }}>
            ⏱️ Tato operace může trvat několik sekund.
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
            Systém projde všechny objednávky a aktualizuje částky na jednotlivých smlouvách.
          </p>
        </>
      ),
      variant: 'warning',
      onConfirm: async () => {
        try {
          const result = await prepocetCerpaniSmluv({
            token: token,
            username: user.username,
            cislo_smlouvy: null,
            usek_id: null
          });
          
          const pocet = result?.prepocitano_smluv || 'všechny';
          
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          
          await loadData();
          
          // Toast notifikace
          showToast(`Přepočet čerpání úspěšně dokončen! Zpracováno smluv: ${pocet}`, 'success');
        } catch (err) {
          console.error('Chyba při přepočtu:', err);
          setError('Chyba při přepočtu: ' + err.message);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // =============================================================================
  // HELPER KOMPONENTA PRO PROGRESS BAR S TOOLTIP
  // =============================================================================
  
  const ProgressBarWithTooltipWrapper = ({ barContent, tooltipContent }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const containerRef = React.useRef(null);
    
    return (
      <div 
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width: '100%' }}
      >
        {barContent}
        <TooltipPortal targetRef={containerRef} isVisible={isHovered}>
          <TooltipContent $isVisible={isHovered}>
            {tooltipContent}
          </TooltipContent>
        </TooltipPortal>
      </div>
    );
  };

  // =============================================================================
  // TANSTACK TABLE - COLUMNS & INSTANCE
  // =============================================================================

  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.accessor('cislo_smlouvy', {
      header: 'Číslo smlouvy',
      cell: info => {
        const row = info.row.original;
        const pouzitVObjFormu = Number(row?.pouzit_v_obj_formu || 0);
        
        // ✅ OPRAVA: Smlouva může mít OBOJÍ - objednávky I přímé faktury!
        // Symbol +/- zobrazit pokud má JAKÉKOLIV čerpání
        const totalOrders = Number(row?.pocet_objednavek || 0);
        const userOrders = Number(row?.pocet_objednavek_uzivatel || 0);
        const totalInvoices = Number(row?.pocet_faktur_celkem || 0);
        const userInvoices = Number(row?.pocet_faktur_uzivatel || 0);
        
        // Smlouva vlastního úseku? → uživatel vidí VŠECHNA čerpání (expand vrací vše)
        const isMujUsek = isRestrictedCerpaniUser && isRowInUserUsek(row);
        // Pro admin, smlouvu vlastního úseku nebo uživatele s neomezeným přístupem
        // (forceUnrestrictedReadOnly=true, CONTRACT_VIEW_ALL) zobrazit celkové počty.
        // Jinak jen uživatelovy vlastní.
        const useTotal = isAdminUser || isMujUsek || forceUnrestrictedReadOnly;
        
        // Logika symbolu +/– podle typu smlouvy a uživatelské role
        let canExpand, expandCount, expandTitle;
        
        if (pouzitVObjFormu === 1) {
          // Smlouva S objednávkovým formulářem → PRIMÁRNĚ objednávky, ale i faktury
          const hasOrders = useTotal ? (totalOrders > 0) : (userOrders > 0);
          const hasInvoices = useTotal ? (totalInvoices > 0) : (userInvoices > 0);
          expandCount = useTotal ? (totalOrders + totalInvoices) : (userOrders + userInvoices);
          canExpand = expandCount > 0;
          expandTitle = isAdminUser 
            ? (canExpand ? 'Zobrazit objednávky a faktury' : 'Žádné čerpání')
            : (canExpand ? 'Zobrazit čerpání smlouvy' : 'Žádné čerpání');
        } else {
          // Smlouva BEZ obj. formuláře → PRIMÁRNĚ faktury, ale může mít i objednávky
          const hasOrders = useTotal ? (totalOrders > 0) : (userOrders > 0);
          const hasInvoices = useTotal ? (totalInvoices > 0) : (userInvoices > 0);
          expandCount = useTotal ? (totalInvoices + totalOrders) : (userInvoices + userOrders);
          canExpand = expandCount > 0;
          expandTitle = isAdminUser 
            ? (canExpand ? 'Zobrazit faktury a objednávky' : 'Žádné čerpání')
            : (canExpand ? 'Zobrazit čerpání smlouvy' : 'Žádné čerpání');
        }
        
        const isExpanded = expandedContracts[row.id];
        const isInactive = !(row?.aktivni === 1 || row?.aktivni === true);
        const isArchived = !isInactive && isArchivedByDate(row);
        
        const filterByUser = isRestrictedCerpaniUser && !isMujUsek;

        const expandBtn = canExpand ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleContractExpand(row.id, filterByUser); }}
            title={isExpanded ? `Skrýt ${pouzitVObjFormu === 1 ? 'objednávky' : 'faktury'}` : expandTitle}
            style={{
              background: isExpanded ? '#fee2e2' : '#eff6ff',
              border: `1px solid ${isExpanded ? '#fca5a5' : '#93c5fd'}`,
              borderRadius: '4px',
              width: '22px',
              cursor: 'pointer',
              display: 'inline-flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: isExpanded ? '#dc2626' : '#3b82f6',
              flexShrink: 0, padding: '1px 0', gap: 0,
              lineHeight: 1, verticalAlign: 'middle', marginRight: '0.4rem'
            }}
          >
            <span style={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1, color: isExpanded ? '#dc2626' : '#1e40af', opacity: 0.85 }}>
              {expandCount}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>
              {isExpanded ? '−' : '+'}
            </span>
          </button>
        ) : (
          <button
            disabled
            title={expandTitle}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              width: '22px',
              cursor: 'not-allowed',
              display: 'inline-flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: '#9ca3af',
              flexShrink: 0, padding: '1px 0', gap: 0,
              lineHeight: 1, verticalAlign: 'middle', marginRight: '0.4rem',
              opacity: 0.5
            }}
          >
            <span style={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>0</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>+</span>
          </button>
        );
        
        return (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {expandBtn}
            <strong>{info.getValue()}</strong>
            {isArchived && (
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                color: '#92400e',
                marginLeft: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                padding: '1px 6px',
                borderRadius: '999px',
                transform: 'translateY(-0.4rem)',
                display: 'inline-block',
                lineHeight: 1
              }}>
                Archiv
              </span>
            )}
          </span>
        );
      },
      enableSorting: true
    }),
    columnHelper.accessor('nazev_firmy', {
      header: 'Firma',
      cell: info => <FirmaName>{info.getValue() || '---'}</FirmaName>,
      enableSorting: true
    }),
    columnHelper.accessor('ico', {
      header: 'IČO',
      cell: info => info.getValue() || '---',
      enableSorting: true
    }),
    columnHelper.accessor('nazev_smlouvy', {
      header: 'Název smlouvy',
      cell: info => info.getValue(),
      enableSorting: true
    }),
    columnHelper.accessor('usek_zkr', {
      header: 'Úsek',
      cell: info => info.getValue(),
      enableSorting: true
    }),
    columnHelper.accessor('platnost_od', {
      header: 'Platnost',
      cell: info => {
        const row = info.row.original;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
            {row.platnost_od && <div><strong>Od:</strong> {formatDate(row.platnost_od)}</div>}
            <div><strong>Do:</strong> {formatDate(row.platnost_do)}</div>
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.platnost_od ? new Date(rowA.original.platnost_od).getTime() : 0;
        const b = rowB.original.platnost_od ? new Date(rowB.original.platnost_od).getTime() : 0;
        return a - b;
      }
    }),
    columnHelper.accessor('hodnota_s_dph', {
      header: 'Finanční limit s DPH',
      cell: info => (
        <span style={{ color: '#1e40af', fontWeight: '600' }}>
          {formatCurrency(info.getValue())}
        </span>
      ),
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = parseFloat(rowA.original.hodnota_s_dph) || 0;
        const b = parseFloat(rowB.original.hodnota_s_dph) || 0;
        return a - b;
      }
    }),
    columnHelper.accessor('cerpano_celkem', {
      header: 'Čerpání s DPH',
      cell: info => {
        const row = info.row.original;
        const { usePersonal, celkem, dokonceno, vProcesu } = resolveCerpani(row);
        const pocatecniStav = parseFloat(row.hodnota_s_dph) || 0;
        // Smlouva má reálný strop (>= 100 Kč) - symbolické částky jako 1 Kč = bez stropu
        const hasCap = pocatecniStav >= MIN_CAP_THRESHOLD;
        const cerpano = celkem;
        const backendPercent = usePersonal || row.procento_cerpani === null || row.procento_cerpani === undefined
          ? null
          : Number(row.procento_cerpani);

        const computedPercent = hasCap ? (cerpano / pocatecniStav) * 100 : null;

        const percentForBar = hasCap
          ? (Number.isFinite(backendPercent)
              ? backendPercent
              : (Number.isFinite(computedPercent) ? computedPercent : 0))
          : 0;

        const percentText = hasCap
          ? (Number.isFinite(backendPercent)
              ? `${backendPercent.toFixed(1)}%`
              : (Number.isFinite(computedPercent) ? `${computedPercent.toFixed(1)}%` : '—'))
          : '—';

        // Detekce nekonečné platnosti (rok >= 2100 → 2199, 9999 apod.)
        const isInfinite = (() => {
          if (!row.platnost_do) return false;
          return new Date(row.platnost_do).getFullYear() >= 2100;
        })();

        // Cíl k datu = uplynulá část doby trvání smlouvy (null pokud nekonečná nebo bez dat)
        // Platí pro VŠECHNY smlouvy (s i bez stropu), pokud mají validní platnost
        const calcTargetPct = () => {
          if (isInfinite) return null;
          const platnostDo = row.platnost_do;
          const platnostOd = row.platnost_od || row.dt_vytvoreni;
          // Musí mít OBA datumy, jinak nemůžeme spočítat
          if (!platnostDo || !platnostOd) return null;
          
          const now = new Date();
          const end = new Date(platnostDo);
          const start = new Date(platnostOd);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
          
          // Smlouva ještě nezačala → cíl je 0%
          if (now < start) return 0;
          // Smlouva už skončila → cíl je 100%
          if (now >= end) return 100;
          
          const total = end - start;
          if (total <= 0) return 100;
          
          return Math.max(0, Math.min(100, Math.round(((now - start) / total) * 100)));
        };
        // targetPct: number (0-100) nebo null (nekonečná / neznámá platnost)
        // Počítá se pro VŠECHNY smlouvy s validní platností (ne jen s finančním stropem)
        const targetPct = calcTargetPct();

        // Status barevného baru:
        // - KRITICKÉ (červená): čerpání >= 100% limitu A smlouva není ukončená
        // - DOKONČENO (zelená): čerpání >= 100% A smlouva je ukončená (normální stav)
        // - POZOR (oranžová): čerpání > 130% cíle k datu (čerpáš rychleji než bys měl)
        //   POUZE pokud absolutní čerpání >= 15% (ignorujeme malé odchylky na začátku)
        //   Např.: Smlouva na rok, začala před měsícem → cíl k datu ~8.3%, měl bys mít 8.3%,
        //   ale máš 10% → 10% > 8.3% × 1.3 = 10.8%? NE → OK. Ale 12% > 10.8% → POZOR!
        // - OK (zelená): vše v normě
        const barLevel = percentForBar >= 100
          ? (row.stav === 'UKONCENA' ? 'completed' : 'critical')
          : (targetPct !== null && percentForBar > targetPct * 1.3 && percentForBar >= 15)
            ? 'warning'
            : 'ok';
        const barColor = barLevel === 'critical' ? '#ef4444' : (barLevel === 'warning' ? '#f59e0b' : '#10b981');
        const barColorLight = barColor === '#ef4444' ? '#fca5a5' : (barColor === '#f59e0b' ? '#fcd34d' : '#86efac');

        // Pro smlouvy bez stropu: používáme stejný targetPct (časový průběh platnosti)
        const timePct = targetPct;

        // 12 pravidelných svislých čárek (stejný rastr jako LP)
        const monthGrid = (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 20, pointerEvents: 'none' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ flex: 1, borderRight: '1px solid rgba(203,213,225,0.28)' }} />
            ))}
          </div>
        );

        // 🆕 Textové zobrazení čerpání (jako u LP)
        const volne = hasCap ? Math.max(0, pocatecniStav - (dokonceno + vProcesu)) : 0;
        const showVolne = !usePersonal && volne > 0;
        const personalBadge = usePersonal ? (
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Moje čerpání
          </div>
        ) : null;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '220px' }}>
            {hasCap ? (
              <>
                {personalBadge}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: barColor, letterSpacing: '-0.02em' }}>
                      {percentText}
                    </span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                      Čerpání
                    </span>
                  </div>
                  {targetPct !== null ? (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b' }}>
                      cíl&nbsp;{targetPct}%
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                      ∞&nbsp;nekonečná
                    </span>
                  )}
                </div>
                <ProgressBarWithTooltipWrapper
                  barContent={
                    <JezBarOuter>
                      {monthGrid}
                      {targetPct !== null && <JezTargetLine $pct={targetPct} />}
                      {/* Solid bar - Dokončeno (faktury DOKONCENA, ZAPLACENO) */}
                      <JezBarFill 
                        $pct={hasCap ? (dokonceno / pocatecniStav * 100) : 0} 
                        $color={barColor} 
                      />
                      {/* Šrafovaný bar - V procesu (ostatní faktury) */}
                      {vProcesu > 0 && hasCap && (
                        <JezBarPlanned
                          $left={Math.min((dokonceno / pocatecniStav * 100), 100)}
                          $percent={vProcesu / pocatecniStav * 100}
                          $color={barColorLight}
                        />
                      )}
                    </JezBarOuter>
                  }
                  tooltipContent={
                    <>
                      <TooltipTitle style={{ color: barColor }}>Čerpání smlouvy: {row.cislo_smlouvy}</TooltipTitle>
                      <TooltipTable>
                        <tbody>
                          <tr>
                            <td>Hodnota smlouvy:</td>
                            <td>{formatCurrency(pocatecniStav)}</td>
                          </tr>
                          {dokonceno > 0 && (
                            <tr>
                              <td>Dokončeno:</td>
                              <td style={{ color: '#86efac' }}>{formatCurrency(dokonceno)}</td>
                            </tr>
                          )}
                          {vProcesu > 0 && (
                            <tr>
                              <td>V procesu:</td>
                              <td style={{ color: '#fcd34d' }}>{formatCurrency(vProcesu)}</td>
                            </tr>
                          )}
                          <tr className="divider">
                            <td>Celkem čerpáno:</td>
                            <td style={{ color: barColor }}>{formatCurrency(cerpano)} ({percentText})</td>
                          </tr>
                          {showVolne && (
                            <tr>
                              <td>Volné:</td>
                              <td style={{ color: '#93c5fd' }}>{formatCurrency(volne)}</td>
                            </tr>
                          )}
                          {targetPct !== null && (
                            <tr className="divider">
                              <td>Cíl k datu:</td>
                              <td>{targetPct}% platnosti uplynulo</td>
                            </tr>
                          )}
                          {row.platnost_od && row.platnost_do && (
                            <>
                              <tr>
                                <td>Platnost od:</td>
                                <td>{new Date(row.platnost_od).toLocaleDateString('cs-CZ')}</td>
                              </tr>
                              <tr>
                                <td>Platnost do:</td>
                                <td>{new Date(row.platnost_do).toLocaleDateString('cs-CZ')}</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </TooltipTable>
                    </>
                  }
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: barColor }} />
                      Dokončeno&nbsp;{formatCurrency(dokonceno)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: barColorLight, opacity: 0.6 }} />
                      V&nbsp;procesu&nbsp;{formatCurrency(vProcesu)}
                    </span>
                  </div>
                  <JezStatusBadge $level={barLevel}>
                    {barLevel === 'critical' ? '⛔ Kritické' : barLevel === 'warning' ? '⚠ Pozor' : barLevel === 'completed' ? '✓ Dokončeno' : '✓ V normě'}
                  </JezStatusBadge>
                </div>
              </>
            ) : (
              /* Smlouva bez finančního stropu - zobrazit jen tři řádky s částkami */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '200px', padding: '0.5rem 0' }}>
                {personalBadge}
                {/* Horní řádek: label bez stropu */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {isInfinite ? '∞ bez stropu' : 'bez stropu'}
                  </span>
                </div>
                {/* Tři řádky s částkami */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.15rem 0' }}>
                    <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      Čerpáno:
                    </span>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.85rem' }}>
                      {formatCurrency(dokonceno)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.15rem 0' }}>
                    <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      V procesu:
                    </span>
                    <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.85rem' }}>
                      {formatCurrency(vProcesu)}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.25rem 0 0.15rem 0', 
                    borderTop: '1px solid #e2e8f0',
                    marginTop: '0.2rem'
                  }}>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      Celkem:
                    </span>
                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>
                      {formatCurrency(cerpano)}
                    </span>
                  </div>
                </div>
                {/* Volitelně: dodatečné info (např. roční čerpání) */}
                {isInfinite && (
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'right', marginTop: '0.1rem' }}>
                    Nekonečná platnost
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = resolveCerpani(rowA.original).celkem;
        const b = resolveCerpani(rowB.original).celkem;
        return a - b;
      }
    }),
    columnHelper.accessor('zbyva', {
        id: 'zbyva',
        header: 'Zbývá s DPH',
        cell: info => {
          const row = info.row.original;
          const pocatecniStav = parseFloat(row.hodnota_s_dph) || 0;
          if (pocatecniStav <= 0) {
            return (
              <span style={{ color: '#6b7280', fontWeight: '600' }}>
                —
              </span>
            );
          }

          const raw = info.getValue();
          if (raw === null || raw === undefined || raw === '') {
            return (
              <span style={{ color: '#6b7280', fontWeight: '600' }}>
                —
              </span>
            );
          }

          const zbyva = Number(raw);
          if (!Number.isFinite(zbyva)) {
            return (
              <span style={{ color: '#6b7280', fontWeight: '600' }}>
                —
              </span>
            );
          }
          return (
            <span style={{ 
              color: zbyva >= 0 ? '#10b981' : '#dc2626',
              fontWeight: '600'
            }}>
              {formatCurrency(zbyva)}
            </span>
          );
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const aCap = (parseFloat(rowA.original.hodnota_s_dph) || 0) > 0;
          const bCap = (parseFloat(rowB.original.hodnota_s_dph) || 0) > 0;
          if (!aCap && !bCap) return 0;
          if (!aCap) return 1;
          if (!bCap) return -1;

          const aRaw = rowA.original.zbyva;
          const bRaw = rowB.original.zbyva;

          const aNull = aRaw === null || aRaw === undefined || aRaw === '';
          const bNull = bRaw === null || bRaw === undefined || bRaw === '';
          if (aNull && bNull) return 0;
          if (aNull) return 1;
          if (bNull) return -1;

          const a = Number(aRaw);
          const b = Number(bRaw);
          if (!Number.isFinite(a) && !Number.isFinite(b)) return 0;
          if (!Number.isFinite(a)) return 1;
          if (!Number.isFinite(b)) return -1;
          return a - b;
        }
      }
    ),
    columnHelper.accessor('pouzit_v_obj_formu', {
      header: 'Použití',
      cell: info => {
        const value = info.getValue();
        return (
          <SmartTooltip content={value === 1 ? 'Použít v objednávkovém formuláři při vytváření objednávek' : 'Pouze v modulu faktur'}>
            <span style={{ 
              fontSize: '0.875rem',
              display: 'inline-block',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: value === 1 ? '#dbeafe' : '#fef3c7',
              color: value === 1 ? '#1e40af' : '#92400e',
              fontWeight: '500'
            }}>
              {value === 1 ? '📋 Objednávky' : '🔒 Faktury'}
            </span>
          </SmartTooltip>
        );
      },
      enableSorting: true
    }),
    columnHelper.accessor('stav', {
      header: 'Stav',
      cell: info => (
        <StatusBadge $color={getStavSmlouvyColor(info.getValue())}>
          {getStavSmlouvyLabel(info.getValue())}
        </StatusBadge>
      ),
      enableSorting: true
    }),
    columnHelper.display({
      id: 'actions',
      header: () => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <FontAwesomeIcon icon={faBolt} style={{ color: '#eab308', fontSize: '16px' }} />
        </div>
      ),
      cell: props => (
        <ActionCell>
          <SmartTooltip content="Detail smlouvy">
            <IconButton onClick={() => handleView(props.row.original)} className="view">
              <FontAwesomeIcon icon={faEye} />
            </IconButton>
          </SmartTooltip>
          {!readOnly && (
            <>
              <SmartTooltip content="Upravit smlouvu">
                <IconButton onClick={() => handleEdit(props.row.original)} className="edit">
                  <FontAwesomeIcon icon={faEdit} />
                </IconButton>
              </SmartTooltip>
              <SmartTooltip content={props.row.original.aktivni ? "Deaktivovat" : "Aktivovat"}>
                <IconButton 
                  onClick={() => handleToggleStatus(props.row.original)} 
                  className={props.row.original.aktivni ? "toggle-active" : "toggle-inactive"}
                >
                  <FontAwesomeIcon icon={props.row.original.aktivni ? faToggleOn : faToggleOff} />
                </IconButton>
              </SmartTooltip>
              <SmartTooltip content="Smazat smlouvu">
                <IconButton onClick={() => handleDelete(props.row.original)} className="delete">
                  <FontAwesomeIcon icon={faTrash} />
                </IconButton>
              </SmartTooltip>
            </>
          )}
        </ActionCell>
      )
    })
  ], [handleView, handleEdit, handleToggleStatus, handleDelete, readOnly, forceUnrestrictedReadOnly, expandedContracts, toggleContractExpand, isAdminUser, isRestrictedCerpaniUser, isRowInUserUsek, resolveCerpani, isArchivedByDate]);

  const table = useReactTable({
    data: filteredSmlouvy,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  // =============================================================================
  // PAGINATION - data a handlers (po table)
  // =============================================================================

  // Get sorted rows
  const sortedRows = table.getSortedRowModel().rows;

  // Paginated data - použít seřazené rows z TanStack Table
  const paginatedRows = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, pageIndex, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);

  // Pagination handlers
  const goToFirstPage = () => setPageIndex(0);
  const goToPreviousPage = () => setPageIndex(prev => Math.max(0, prev - 1));
  const goToNextPage = () => setPageIndex(prev => Math.min(totalPages - 1, prev + 1));
  const goToLastPage = () => setPageIndex(totalPages - 1);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      usek_id: [],
      druh_smlouvy: [],
      stav: DEFAULT_STAV_FILTER,
      platnost_od: '',
      platnost_do: ''
    });
    setColumnFilters({
      cislo_smlouvy: '',
      nazev_firmy: '',
      ico: '',
      nazev_smlouvy: '',
      usek_zkr: '',
      druh_smlouvy: '',
      stav: '',
      pouzit_v_obj_formu: ''
    });
  };

  const handleFormClose = (reload) => {
    setFormModalOpen(false);
    setEditingSmlouva(null);
    if (reload) {
      loadData();
    }
  };

  const handleDetailClose = () => {
    setDetailModalOpen(false);
    setViewingSmlouva(null);
  };

  const handleImportClose = (reload) => {
    setImportModalOpen(false);
    if (reload) {
      loadData();
    }
  };

  // =============================================================================
  // FORMAT HELPERS
  // =============================================================================

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
  };



  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <>
      {/* Loading Overlay - při prvním načítání */}
      <LoadingOverlay $visible={loading && smlouvy.length === 0}>
        <LoadingSpinner $visible={loading} />
        <LoadingMessage $visible={loading}>Zpracovávám čerpání smluv...</LoadingMessage>
        <LoadingSubtext $visible={loading}>Probíhá načítání a výpočet čerpání smluv z databáze...</LoadingSubtext>
      </LoadingOverlay>

      <Container>
      <FiltersContainer>
        {/* Toolbar */}
        <ToolbarContainer>
          <SearchBox>
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Hledat podle čísla, názvu, firmy..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            {filters.search && (
              <ClearButton onClick={() => handleFilterChange('search', '')} title="Vymazat">
                <FontAwesomeIcon icon={faTimes} />
              </ClearButton>
            )}
          </SearchBox>

          <ActionButton onClick={() => setShowFilters(!showFilters)}>
            <FontAwesomeIcon icon={showFilters ? faChevronUp : faChevronDown} />
            {showFilters ? 'Skrýt filtry' : 'Rozšířený filtr'}
          </ActionButton>

          <ActionButton $variant="danger" onClick={handleResetFilters}>
            <FontAwesomeIcon icon={faTimes} />
            Vymazat filtry
          </ActionButton>

          {!readOnly && (
            <>
              <ActionButton $variant="primary" onClick={handleCreate}>
                <FontAwesomeIcon icon={faPlus} />
                Přidat smlouvu
              </ActionButton>
              <ActionButton $variant="success" onClick={() => setImportModalOpen(true)}>
                <FontAwesomeIcon icon={faFileImport} />
                Import z Excel
              </ActionButton>
              <ActionButton $variant="warning" onClick={handlePrepocetCerpani}>
                <FontAwesomeIcon icon={faSyncAlt} />
                Přepočítat čerpání
              </ActionButton>
            </>
          )}
        </ToolbarContainer>

        {/* Filters */}
        <FilterSection $visible={showFilters}>
          <FilterGrid>
            <FilterField>
              <FilterLabel>
                <span>Úsek</span>
                {filters.usek_id.length > 0 && (
                  <FilterLabelClear onClick={() => handleFilterChange('usek_id', [])} title="Zrušit filtr úseku">
                    <FontAwesomeIcon icon={faTimes} size="xs" />
                  </FilterLabelClear>
                )}
              </FilterLabel>
              <CustomSelect
                value={filters.usek_id}
                onChange={(val) => handleFilterChange('usek_id', val)}
                options={useky.map(u => ({ id: String(u.id), value: String(u.id), label: `${u.usek_zkr} - ${u.usek_nazev}` }))}
                placeholder="Všechny úseky"
                field="filter_usek_id"
                multiple={true}
                isClearable={false}
                enableSearch={true}
                selectStates={selectStates}
                setSelectStates={setSelectStates}
                searchStates={searchStates}
                setSearchStates={setSearchStates}
                toggleSelect={toggleSelect}
                getOptionLabel={(opt) => opt?.label || String(opt?.id || opt?.value || opt)}
              />
            </FilterField>

            <FilterField>
              <FilterLabel>
                <span>Druh smlouvy</span>
                {filters.druh_smlouvy.length > 0 && (
                  <FilterLabelClear onClick={() => handleFilterChange('druh_smlouvy', [])} title="Zrušit filtr druhu">
                    <FontAwesomeIcon icon={faTimes} size="xs" />
                  </FilterLabelClear>
                )}
              </FilterLabel>
              <CustomSelect
                value={filters.druh_smlouvy}
                onChange={(val) => handleFilterChange('druh_smlouvy', val)}
                options={availableDruhOptions.map(o => ({ id: o.value, value: o.value, label: o.label }))}
                placeholder="Všechny druhy"
                field="filter_druh_smlouvy"
                multiple={true}
                isClearable={false}
                enableSearch={false}
                selectStates={selectStates}
                setSelectStates={setSelectStates}
                searchStates={searchStates}
                setSearchStates={setSearchStates}
                toggleSelect={toggleSelect}
                getOptionLabel={(opt) => opt?.label || String(opt?.id || opt?.value || opt)}
              />
            </FilterField>

            <FilterField>
              <FilterLabel>Stav</FilterLabel>
              <FilterSelect
                value={filters.stav}
                onChange={(e) => handleFilterChange('stav', e.target.value)}
                $isEmpty={!filters.stav}
              >
                <option value="">Všechny stavy</option>
                {availableStavOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </FilterSelect>
            </FilterField>

            <FilterField>
              <FilterLabel>Platnost od</FilterLabel>
              <DatePicker
                value={filters.platnost_od}
                onChange={(value) => handleFilterChange('platnost_od', value)}
                placeholder="Vyberte datum od"
              />
            </FilterField>

            <FilterField>
              <FilterLabel>Platnost do</FilterLabel>
              <DatePicker
                value={filters.platnost_do}
                onChange={(value) => handleFilterChange('platnost_do', value)}
                placeholder="Vyberte datum do"
              />
            </FilterField>

          </FilterGrid>
        </FilterSection>
      </FiltersContainer>

      {/* Statistické dlaždice */}
      <StatsGrid>
        <StatCard $gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)">
          <StatIcon $bg="white" $color="#3b82f6" $shadow="rgba(59, 130, 246, 0.3)">
            <Coins size={28} />
          </StatIcon>
          <StatContent>
            <StatLabel $light>Celkový limit</StatLabel>
            <StatValue $light>{statistics.celkem_limit.toLocaleString('cs-CZ')} Kč</StatValue>
          </StatContent>
        </StatCard>

        <StatCard $gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)">
          <StatIcon $bg="white" $color="#10b981" $shadow="rgba(16, 185, 129, 0.3)">
            <TrendingUp size={28} />
          </StatIcon>
          <StatContent>
            <StatLabel $light>Dokončeno</StatLabel>
            <StatValue $light style={{ marginBottom: '0.5rem' }}>{statistics.celkem_cerpano.toLocaleString('cs-CZ')} Kč</StatValue>
          </StatContent>
        </StatCard>

        <StatCard $gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)">
          <StatIcon $bg="white" $color="#f59e0b" $shadow="rgba(245, 158, 11, 0.3)">
            <CheckCircle size={28} />
          </StatIcon>
          <StatContent>
            <StatLabel $light>Zbývá</StatLabel>
            <StatValue $light>{statistics.celkem_zbyva !== null ? statistics.celkem_zbyva.toLocaleString('cs-CZ') + ' Kč' : 'bez stropu'}</StatValue>
          </StatContent>
        </StatCard>

        <StatCard $gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)">
          <StatIcon $bg="white" $color="#8b5cf6" $shadow="rgba(139, 92, 246, 0.3)">
            <AlertTriangle size={28} />
          </StatIcon>
          <StatContent>
            <StatLabel $light>Průměrné čerpání</StatLabel>
            <StatValue $light>{statistics.prumerne_cerpani !== null ? statistics.prumerne_cerpani.toFixed(1) + '%' : 'bez stropu'}</StatValue>
          </StatContent>
        </StatCard>
      </StatsGrid>

      {/* Přehled smluv: CELKEM / Se stropem / Bez stropu */}
      {(statistics.skupina_se_stropem.pocet > 0 || statistics.skupina_bez_stropu.pocet > 0) && (
        <SkupinyRow>
          {/* ── CELKEM - Všechny smlouvy ── */}
          <SkupinaCard
            $bg={skupinaFilter === null ? '#dbeafe' : '#eff6ff'}
            $border={skupinaFilter === null ? '#2563eb' : '#3b82f6'}
            onClick={() => setSkupinaFilter(null)}
            style={{ cursor: 'pointer', transition: 'all 0.15s', boxShadow: skupinaFilter === null ? '0 0 0 2px #2563eb' : 'none' }}
            title="Kliknutím zobrazit všechny smlouvy (zrušit filtr)"
          >
            <SkupinaHeader $border="#dbeafe">
              <SkupinaTitle $color="#1e40af" style={{ fontSize: '0.95rem', fontWeight: 700 }}>CELKEM</SkupinaTitle>
              <SkupinaBadge $bg="#dbeafe" $color="#1e40af">
                {statistics.skupina_se_stropem.pocet + statistics.skupina_bez_stropu.pocet}
              </SkupinaBadge>
              {skupinaFilter === null && (
                <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 800, color: '#2563eb', background: '#bfdbfe', borderRadius: '4px', padding: '0.15rem 0.4rem' }}>
                  ✓ vše zobrazeno
                </span>
              )}
            </SkupinaHeader>
            <SkupinaMini>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Limit</SkupinaMiniLabel>
                <SkupinaMiniValue $color="#1e40af">{formatCurrency(statistics.celkem_limit)}</SkupinaMiniValue>
              </SkupinaMiniItem>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Vyčerpáno</SkupinaMiniLabel>
                <SkupinaMiniValue $color="#10b981">{formatCurrency(statistics.celkem_cerpano)}</SkupinaMiniValue>
              </SkupinaMiniItem>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Zbývá</SkupinaMiniLabel>
                <SkupinaMiniValue $color={statistics.celkem_zbyva === null ? '#94a3b8' : (statistics.celkem_zbyva < 0 ? '#dc2626' : '#0f766e')}>
                  {statistics.celkem_zbyva !== null ? formatCurrency(statistics.celkem_zbyva) : 'bez stropu'}
                </SkupinaMiniValue>
              </SkupinaMiniItem>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Čerpání</SkupinaMiniLabel>
                <SkupinaMiniValue $color={
                  statistics.prumerne_cerpani === null ? '#94a3b8' :
                  statistics.prumerne_cerpani >= 100 ? '#dc2626' :
                  statistics.prumerne_cerpani >= 80  ? '#ea580c' : '#10b981'
                }>
                  {statistics.prumerne_cerpani !== null ? statistics.prumerne_cerpani.toFixed(1) + '%' : 'bez stropu'}
                </SkupinaMiniValue>
              </SkupinaMiniItem>
            </SkupinaMini>
            <SkupinaBarWrap>
              <SkupinaBarFill
                $pct={statistics.prumerne_cerpani || 0}
                $color={
                  statistics.prumerne_cerpani >= 100 ? '#ef4444' :
                  statistics.prumerne_cerpani >= 80  ? '#f59e0b' : '#10b981'
                }
              />
            </SkupinaBarWrap>
          </SkupinaCard>

          {/* ── Smlouvy SE stropem ── */}
          <SkupinaCard
            $bg={skupinaFilter === 'se_stropem' ? '#dcfce7' : '#f0fdf4'}
            $border={skupinaFilter === 'se_stropem' ? '#16a34a' : '#bbf7d0'}
            onClick={() => setSkupinaFilter(f => f === 'se_stropem' ? null : 'se_stropem')}
            style={{ cursor: 'pointer', transition: 'all 0.15s', boxShadow: skupinaFilter === 'se_stropem' ? '0 0 0 2px #16a34a' : 'none' }}
            title="Kliknutím filtrovat seznam na smlouvy s finančním stropem"
          >
            <SkupinaHeader $border="#dcfce7">
              <SkupinaTitle $color="#15803d">Smlouvy s finančním stropem</SkupinaTitle>
              <SkupinaBadge $bg="#dcfce7" $color="#15803d">{statistics.skupina_se_stropem.pocet}</SkupinaBadge>
              {skupinaFilter === 'se_stropem' && (
                <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 800, color: '#16a34a', background: '#bbf7d0', borderRadius: '4px', padding: '0.15rem 0.4rem' }}>
                  ✓ filtrováno
                </span>
              )}
            </SkupinaHeader>
            <SkupinaMini>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Limit</SkupinaMiniLabel>
                <SkupinaMiniValue $color="#1e40af">{formatCurrency(statistics.skupina_se_stropem.limit)}</SkupinaMiniValue>
              </SkupinaMiniItem>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Vyčerpáno</SkupinaMiniLabel>
                <SkupinaMiniValue $color="#10b981">{formatCurrency(statistics.skupina_se_stropem.cerpano)}</SkupinaMiniValue>
              </SkupinaMiniItem>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Zbývá</SkupinaMiniLabel>
                <SkupinaMiniValue $color={statistics.skupina_se_stropem.zbyva < 0 ? '#dc2626' : '#0f766e'}>
                  {formatCurrency(statistics.skupina_se_stropem.zbyva)}
                </SkupinaMiniValue>
              </SkupinaMiniItem>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Čerpání</SkupinaMiniLabel>
                <SkupinaMiniValue $color={
                  statistics.skupina_se_stropem.pct >= 100 ? '#dc2626' :
                  statistics.skupina_se_stropem.pct >= 80  ? '#ea580c' : '#10b981'
                }>
                  {statistics.skupina_se_stropem.pct.toFixed(1)}%
                </SkupinaMiniValue>
              </SkupinaMiniItem>
            </SkupinaMini>
            <SkupinaBarWrap>
              <SkupinaBarFill
                $pct={statistics.skupina_se_stropem.pct}
                $color={
                  statistics.skupina_se_stropem.pct >= 100 ? '#ef4444' :
                  statistics.skupina_se_stropem.pct >= 80  ? '#f59e0b' : '#10b981'
                }
              />
            </SkupinaBarWrap>
          </SkupinaCard>

          {/* ── Smlouvy BEZ stropu ── */}
          <SkupinaCard
            $bg={skupinaFilter === 'bez_stropu' ? '#e2e8f0' : '#f8fafc'}
            $border={skupinaFilter === 'bez_stropu' ? '#475569' : '#cbd5e1'}
            onClick={() => setSkupinaFilter(f => f === 'bez_stropu' ? null : 'bez_stropu')}
            style={{ cursor: 'pointer', transition: 'all 0.15s', boxShadow: skupinaFilter === 'bez_stropu' ? '0 0 0 2px #475569' : 'none' }}
            title="Kliknutím filtrovat seznam na smlouvy bez finančního stropu"
          >
            <SkupinaHeader $border="#e2e8f0">
              <SkupinaTitle $color="#475569">Smlouvy bez finančního stropu</SkupinaTitle>
              <SkupinaBadge $bg="#e2e8f0" $color="#475569">{statistics.skupina_bez_stropu.pocet}</SkupinaBadge>
              {skupinaFilter === 'bez_stropu' && (
                <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 800, color: '#475569', background: '#cbd5e1', borderRadius: '4px', padding: '0.15rem 0.4rem' }}>
                  ✓ filtrováno
                </span>
              )}
            </SkupinaHeader>
            <SkupinaMini>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Čerpáno celkem</SkupinaMiniLabel>
                <SkupinaMiniValue $color="#475569">{formatCurrency(statistics.skupina_bez_stropu.cerpano)}</SkupinaMiniValue>
              </SkupinaMiniItem>
              <SkupinaMiniItem>
                <SkupinaMiniLabel>Limit</SkupinaMiniLabel>
                <SkupinaMiniValue $color="#94a3b8">— bez stropu</SkupinaMiniValue>
              </SkupinaMiniItem>
            </SkupinaMini>
            <SkupinaBarWrap>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, #94a3b8 0px, #94a3b8 2px, transparent 2px, transparent 8px)',
                opacity: skupinaFilter === 'bez_stropu' ? 0.4 : 0.2,
                transition: 'opacity 0.15s',
              }} />
            </SkupinaBarWrap>
          </SkupinaCard>
        </SkupinyRow>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <TableContainer>
        <Table>
          <Thead>
            {/* První řádek - názvy sloupců s řazením */}
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHeaderCell
                    key={header.id}
                    $sortable={header.column.getCanSort()}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : (
                      <HeaderContent>
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getIsSorted() && (
                          <FontAwesomeIcon
                            icon={header.column.getIsSorted() === 'asc' ? faChevronUp : faChevronDown}
                            style={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </HeaderContent>
                    )}
                  </TableHeaderCell>
                ))}
              </tr>
            ))}

              {/* Druhý řádek - sloupcové filtry */}
              <TableHeaderFilterRow>
                {/* Číslo smlouvy */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat číslo..."
                      value={columnFilters.cislo_smlouvy}
                      onChange={(e) => setColumnFilters(prev => ({...prev, cislo_smlouvy: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* Firma */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat firmu..."
                      value={columnFilters.nazev_firmy}
                      onChange={(e) => setColumnFilters(prev => ({...prev, nazev_firmy: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* IČO */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat IČO..."
                      value={columnFilters.ico}
                      onChange={(e) => setColumnFilters(prev => ({...prev, ico: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* Název smlouvy */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat název..."
                      value={columnFilters.nazev_smlouvy}
                      onChange={(e) => setColumnFilters(prev => ({...prev, nazev_smlouvy: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* Úsek */}
                <TableHeaderFilterCell>
                  <ColumnFilterWrapper>
                    <FontAwesomeIcon icon={faSearch} />
                    <ColumnFilterInput
                      type="text"
                      placeholder="Hledat úsek..."
                      value={columnFilters.usek_zkr}
                      onChange={(e) => setColumnFilters(prev => ({...prev, usek_zkr: e.target.value}))}
                    />
                  </ColumnFilterWrapper>
                </TableHeaderFilterCell>
                {/* Platnost - prázdná buňka */}
                <TableHeaderFilterCell />
                {/* Počáteční stav - prázdná buňka */}
                <TableHeaderFilterCell />
                {/* Čerpání - prázdná buňka */}
                <TableHeaderFilterCell />
                {/* Zbývá - prázdná buňka */}
                <TableHeaderFilterCell />
                {/* Použití */}
                <TableHeaderFilterCell>
                  <ColumnFilterSelect
                    value={columnFilters.pouzit_v_obj_formu}
                    onChange={(e) => setColumnFilters(prev => ({...prev, pouzit_v_obj_formu: e.target.value}))}
                  >
                    <option value="">Vše</option>
                    <option value="1">📋 Objednávky</option>
                    <option value="0">🔒 Faktury</option>
                  </ColumnFilterSelect>
                </TableHeaderFilterCell>
                {/* Stav */}
                <TableHeaderFilterCell>
                  <ColumnFilterSelect
                    value={columnFilters.stav}
                    onChange={(e) => setColumnFilters(prev => ({...prev, stav: e.target.value}))}
                  >
                    <option value="">Všechny</option>
                    {availableStavOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </ColumnFilterSelect>
                </TableHeaderFilterCell>
                {/* Akce - prázdná buňka */}
                <TableHeaderFilterCell />
              </TableHeaderFilterRow>
            </Thead>
            <Tbody>
              {loading ? (
                <tr>
                  <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                    Načítám smlouvy...
                  </TableCell>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                    <EmptyState>
                      <EmptyIcon><FileText size={48} /></EmptyIcon>
                      <EmptyText>{smlouvy.length === 0 ? 'Žádné smlouvy' : 'Nenalezeny žádné smlouvy'}</EmptyText>
                      <EmptyHint>{smlouvy.length === 0 ? 'Vytvořte novou smlouvu pomocí tlačítka "Přidat smlouvu"' : 'Zkuste změnit vyhledávání nebo filtry'}</EmptyHint>
                    </EmptyState>
                  </TableCell>
                </tr>
              ) : (
                paginatedRows.map((row, index) => (
                  <React.Fragment key={row.id}>
                  <TableRow
                    $isEven={index % 2 === 0}
                    $hasUserDrawn={(() => {
                      const pouzitVObjFormu = Number(row.original?.pouzit_v_obj_formu || 0);
                      return pouzitVObjFormu === 1 
                        ? Number(row.original?.pocet_objednavek_uzivatel || 0) > 0
                        : Number(row.original?.pocet_faktur_uzivatel || 0) > 0;
                    })()}
                    title={(() => {
                      const pouzitVObjFormu = Number(row.original?.pouzit_v_obj_formu || 0);
                      const hasDrawn = pouzitVObjFormu === 1 
                        ? Number(row.original?.pocet_objednavek_uzivatel || 0) > 0
                        : Number(row.original?.pocet_faktur_uzivatel || 0) > 0;
                      if (!hasDrawn) return undefined;
                      
                      if (pouzitVObjFormu === 1) {
                        return `Vaše čerpání: ${row.original.pocet_objednavek_uzivatel} objednávek`;
                      } else {
                        return `Vaše čerpání: ${row.original.pocet_faktur_uzivatel} faktur`;
                      }
                    })()}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedContracts[row.original.id] && (
                    <tr style={{ background: '#f8fafc' }}>
                      <TableCell colSpan={columns.length} style={{ padding: '0.5rem 1rem 0.75rem 2rem', borderBottom: '2px solid #cbd5e1' }}>
                        {contractExpandLoading[row.original.id] ? (
                          <div style={{ color: '#64748b', fontSize: '0.82rem', padding: '0.5rem 0', fontFamily: "'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif" }}>Načítám objednávky…</div>
                        ) : (() => {
                          const expandData = contractExpandOrders[row.original.id] || {};
                          const objednavky = Array.isArray(expandData.objednavky) ? expandData.objednavky : [];
                          const primeFaktury = Array.isArray(expandData.prime_faktury) ? expandData.prime_faktury : [];
                          if (objednavky.length === 0 && primeFaktury.length === 0) {
                            return <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.5rem 0', fontFamily: "'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif" }}>Žádné objednávky ani faktury k této smlouvě</div>;
                          }
                          const rowKey = row.original.id;
                          const sortState = contractExpandSort[rowKey] || { col: null, dir: null };
                          const pageState = contractExpandPage[rowKey] || { page: 1, pageSize: 25 };
                          const PAGE_SIZES = [5, 10, 25, 50, 100];
                          const toggleSort = (col) => {
                            setContractExpandSort(prev => {
                              const cur = prev[rowKey] || { col: null, dir: null };
                              let newDir = null;
                              if (cur.col !== col) newDir = 'asc';
                              else if (cur.dir === 'asc') newDir = 'desc';
                              else if (cur.dir === 'desc') newDir = null;
                              return { ...prev, [rowKey]: { col: newDir ? col : null, dir: newDir } };
                            });
                            setContractExpandPage(prev => ({ ...prev, [rowKey]: { ...pageState, page: 1 } }));
                          };
                          const sortIcon = (col) => (
                            <span style={{ marginLeft: '0.2rem', fontSize: '0.65rem', opacity: sortState.col === col ? 1 : 0.3, color: sortState.col === col ? '#2563eb' : 'inherit' }}>
                              {sortState.col !== col ? '⇅' : sortState.dir === 'asc' ? '↑' : '↓'}
                            </span>
                          );
                          const sortRows = (arr) => [...arr].sort((a, b) => {
                            if (!sortState.col || !sortState.dir) return 0;
                            const m = sortState.dir === 'asc' ? 1 : -1;
                            switch (sortState.col) {
                              case 'cislo': return m * (a.cislo_objednavky || a.fa_cislo_vema || a.fa_vema_kod || '').localeCompare(b.cislo_objednavky || b.fa_cislo_vema || b.fa_vema_kod || '', 'cs');
                              case 'predmet': return m * (a.predmet || a.fa_poznamka || '').localeCompare(b.predmet || b.fa_poznamka || '', 'cs');
                              case 'datum': return m * (a.dt_vytvoreni || a.fa_datum_vystaveni || '').localeCompare(b.dt_vytvoreni || b.fa_datum_vystaveni || '');
                              case 'stav': return m * (a.stav || '').localeCompare(b.stav || '', 'cs');
                              case 'dodavatel': return m * (a.dodavatel_nazev || '').localeCompare(b.dodavatel_nazev || '', 'cs');
                              case 'cena': return m * ((a.max_cena_s_dph || a.fa_castka || 0) - (b.max_cena_s_dph || b.fa_castka || 0));
                              case 'faktury': return m * ((a.pocet_faktur || 0) - (b.pocet_faktur || 0));
                              case 'splatnost': return m * (a.fa_datum_splatnosti || '').localeCompare(b.fa_datum_splatnosti || '');
                              default: return 0;
                            }
                          });
                          const thBase = { padding: '0.35rem 0.5rem', fontWeight: 600, fontSize: '0.75rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.025em', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };
                          const czFormat = (v) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
                          const czDate = (d) => { if (!d) return '—'; const s = d.substring(0,10); const p = s.split('-'); return p.length === 3 ? `${parseInt(p[2])}.${parseInt(p[1])}.${p[0]}` : s; };
                          const allRows = [...objednavky, ...primeFaktury];
                          const totalRows = allRows.length;
                          const totalPages = Math.ceil(totalRows / pageState.pageSize);
                          const startIdx = (pageState.page - 1) * pageState.pageSize;
                          const setPage = (p) => setContractExpandPage(prev => ({ ...prev, [rowKey]: { ...pageState, page: p } }));
                          const setPageSize = (ps) => setContractExpandPage(prev => ({ ...prev, [rowKey]: { page: 1, pageSize: ps } }));
                          // Paging applied per-section
                          const sortedObj = sortRows(objednavky);
                          const sortedPf = sortRows(primeFaktury);
                          return (
                            <>
                              {sortedObj.length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '0.82rem', letterSpacing: '-0.01em', marginBottom: sortedPf.length > 0 ? '0.75rem' : 0 }}>
                                  <thead>
                                    <tr style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                                      <th style={{ ...thBase, textAlign: 'left' }} onClick={() => toggleSort('cislo')}>Č. obj.{sortIcon('cislo')}</th>
                                      <th style={{ ...thBase, textAlign: 'left' }} onClick={() => toggleSort('predmet')}>Předmět obj.{sortIcon('predmet')}</th>
                                      <th style={{ ...thBase, textAlign: 'left' }} onClick={() => toggleSort('datum')}>Datum{sortIcon('datum')}</th>
                                      <th style={{ ...thBase, textAlign: 'left' }} onClick={() => toggleSort('stav')}>Stav{sortIcon('stav')}</th>
                                      <th style={{ ...thBase, textAlign: 'left' }} onClick={() => toggleSort('dodavatel')}>Dodavatel{sortIcon('dodavatel')}</th>
                                      <th style={{ ...thBase, textAlign: 'right' }} onClick={() => toggleSort('cena')}>Cena s DPH{sortIcon('cena')}</th>
                                      <th style={{ ...thBase, textAlign: 'right' }} onClick={() => toggleSort('faktury')}>Faktury{sortIcon('faktury')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedObj.map((ord, oi) => (
                                      <React.Fragment key={ord.id || oi}>
                                      <tr style={{ borderBottom: ord.faktury?.length ? 'none' : '1px solid #f1f5f9', background: oi % 2 === 0 ? 'white' : '#f8fafc', transition: 'background-color 0.15s ease' }}>
                                        <td style={{ padding: '0.25rem 0.5rem', fontWeight: 600 }}>
                                          <button
                                            onClick={() => navigate(`/order-form-25?edit=${ord.id}`, { state: { returnTo: location.pathname } })}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: (ord.stav === 'Dokončená' || ord.stav === 'DOKONCENA' || ord.stav === 'Uvejřejněná' || ord.stav === 'UVEREJNENA') ? '#059669' : (ord.stav === 'Zkontrolovaná' || ord.stav === 'ZKONTROLOVANA' || ord.stav === 'Schválená' || ord.stav === 'SCHVALENA') ? '#ea580c' : (ord.stav === 'Zrušená' || ord.stav === 'ZRUSENA') ? '#dc2626' : '#3b82f6',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              padding: 0,
                                              fontSize: 'inherit',
                                              fontFamily: 'inherit',
                                              borderBottom: `1px dashed ${ (ord.stav === 'Dokončená' || ord.stav === 'DOKONCENA' || ord.stav === 'Uvejřejněná' || ord.stav === 'UVEREJNENA') ? '#86efac' : (ord.stav === 'Zkontrolovaná' || ord.stav === 'ZKONTROLOVANA' || ord.stav === 'Schválená' || ord.stav === 'SCHVALENA') ? '#fdba74' : (ord.stav === 'Zrušená' || ord.stav === 'ZRUSENA') ? '#fca5a5' : '#93c5fd'}`
                                            }}
                                            title="Otevřít objednávku"
                                          >
                                            {isMimoradnaObjednavka(ord) && (
                                              <FontAwesomeIcon icon={faBoltLightning} style={{ color: '#dc2626', marginRight: '4px' }} />
                                            )}
                                            {ord.cislo_objednavky || '—'}
                                          </button>
                                        </td>
                                        <td style={{ padding: '0.25rem 0.5rem', color: '#334155', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ord.predmet || ''}>
                                          {ord.predmet || '—'}
                                        </td>
                                        <td style={{ padding: '0.25rem 0.5rem', color: '#475569' }}>{czDate(ord.dt_vytvoreni)}</td>
                                        <td style={{ padding: '0.25rem 0.5rem' }}>
                                          {(() => { const s = getOrdStavBadge(ord.stav); return (
                                            <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.02em', display: 'inline-block' }}>
                                              {ord.stav || '?'}
                                            </span>
                                          ); })()}
                                        </td>
                                        <td style={{ padding: '0.25rem 0.5rem', color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ord.dodavatel_nazev || '—'}</td>
                                        <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{czFormat(ord.max_cena_s_dph)}</td>
                                        <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right', fontSize: '0.75rem', color: '#6b7280' }}>
                                          {ord.pocet_faktur > 0 ? `${ord.pocet_faktur}× / ${czFormat(ord.suma_faktur)}` : '—'}
                                        </td>
                                      </tr>
                                      {ord.faktury?.length > 0 && ord.faktury.map((fa, fi) => (
                                        <tr key={`fa-${fa.id}`} style={{ background: '#fffbeb', borderBottom: fi === ord.faktury.length - 1 ? '1px solid #f1f5f9' : '1px dashed #fde68a' }}>
                                          <td style={{ padding: '0.2rem 0.5rem 0.2rem 1.75rem', fontSize: '0.75rem', color: '#92400e' }}>
                                            ↳{' '}
                                            <button
                                              onClick={() => navigate('/invoice-evidence', { state: { editInvoiceId: fa.id, orderIdForLoad: ord.id, returnTo: location.pathname } })}
                                              style={{
                                                background: 'none',
                                                border: 'none',
                                                color: (fa.stav === 'DOKONCENA' || fa.stav === 'ZAPLACENO') ? '#059669' : fa.stav === 'STORNO' ? '#dc2626' : '#7c3aed',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                padding: 0,
                                                fontSize: 'inherit',
                                                fontFamily: 'inherit',
                                                borderBottom: `1px dashed ${(fa.stav === 'DOKONCENA' || fa.stav === 'ZAPLACENO') ? '#86efac' : fa.stav === 'STORNO' ? '#fca5a5' : '#c4b5fd'}`
                                              }}
                                              title="Otevřít fakturu"
                                            >
                                                {formatInvoiceReference(fa)}
                                            </button>
                                          </td>
                                            <td style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#78716c', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fa.fa_poznamka || ''}>
                                              {fa.fa_poznamka || '—'}
                                            </td>
                                            <td style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#78716c' }}>{czDate(fa.fa_datum_vystaveni)}</td>
                                          <td style={{ padding: '0.2rem 0.5rem' }}>
                                            {(() => { const s = getFaStavBadge(fa.stav); return (
                                              <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.02em', display: 'inline-block' }}>
                                                {getInvoiceStateLabel(fa.stav)}
                                              </span>
                                            ); })()}
                                          </td>
                                            <td style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#78716c' }}>—</td>
                                            <td style={{ padding: '0.2rem 0.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', color: '#92400e' }}>
                                            {czFormat(fa.fa_castka)}
                                          </td>
                                          <td style={{ padding: '0.2rem 0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#78716c' }}>
                                            {fa.fa_datum_splatnosti ? `Splat: ${czDate(fa.fa_datum_splatnosti)}` : ''}
                                          </td>
                                        </tr>
                                      ))}
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                              {sortedPf.length > 0 && (
                                <>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed', marginBottom: '0.3rem', borderTop: sortedObj.length > 0 ? '1px dashed #c4b5fd' : 'none', paddingTop: sortedObj.length > 0 ? '0.5rem' : 0, fontFamily: "'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                    Přímé faktury (bez objednávky): {sortedPf.length}
                                  </div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '0.82rem', letterSpacing: '-0.01em' }}>
                                    <thead>
                                      <tr style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)' }}>
                                        <th style={{ ...thBase, textAlign: 'left', borderBottomColor: '#c4b5fd' }} onClick={() => toggleSort('cislo')}>Č. faktury{sortIcon('cislo')}</th>
                                        <th style={{ ...thBase, textAlign: 'left', borderBottomColor: '#c4b5fd' }} onClick={() => toggleSort('predmet')}>Poznámka FA{sortIcon('predmet')}</th>
                                        <th style={{ ...thBase, textAlign: 'left', borderBottomColor: '#c4b5fd' }} onClick={() => toggleSort('datum')}>Datum vystavení{sortIcon('datum')}</th>
                                        <th style={{ ...thBase, textAlign: 'left', borderBottomColor: '#c4b5fd' }} onClick={() => toggleSort('stav')}>Stav{sortIcon('stav')}</th>
                                        <th style={{ ...thBase, textAlign: 'right', borderBottomColor: '#c4b5fd' }} onClick={() => toggleSort('cena')}>Částka{sortIcon('cena')}</th>
                                        <th style={{ ...thBase, textAlign: 'right', borderBottomColor: '#c4b5fd' }} onClick={() => toggleSort('splatnost')}>Splatnost{sortIcon('splatnost')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sortedPf.map((fa, fi) => (
                                        <tr key={fa.id || fi} style={{ borderBottom: '1px solid #f1f5f9', background: fi % 2 === 0 ? 'white' : '#faf5ff', transition: 'background-color 0.15s ease' }}>
                                          <td style={{ padding: '0.25rem 0.5rem', fontWeight: 600 }}>
                                            <button
                                              onClick={() => navigate('/invoice-evidence', { state: { editInvoiceId: fa.id, returnTo: location.pathname } })}
                                              style={{
                                                background: 'none',
                                                border: 'none',
                                                color: (fa.stav === 'DOKONCENA' || fa.stav === 'ZAPLACENO') ? '#059669' : fa.stav === 'STORNO' ? '#dc2626' : '#7c3aed',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                padding: 0,
                                                fontSize: 'inherit',
                                                fontFamily: 'inherit',
                                                borderBottom: `1px dashed ${(fa.stav === 'DOKONCENA' || fa.stav === 'ZAPLACENO') ? '#86efac' : fa.stav === 'STORNO' ? '#fca5a5' : '#c4b5fd'}`
                                              }}
                                              title="Otevřít fakturu"
                                            >
                                              {formatInvoiceReference(fa)}
                                            </button>
                                          </td>
                                          <td style={{ padding: '0.25rem 0.5rem', color: '#475569', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fa.fa_poznamka || ''}>
                                            {fa.fa_poznamka || '—'}
                                          </td>
                                          <td style={{ padding: '0.25rem 0.5rem', color: '#475569' }}>{czDate(fa.fa_datum_vystaveni)}</td>
                                          <td style={{ padding: '0.25rem 0.5rem' }}>
                                            {(() => { const s = getFaStavBadge(fa.stav); return (
                                              <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.02em', display: 'inline-block' }}>
                                                {getInvoiceStateLabel(fa.stav)}
                                              </span>
                                            ); })()}
                                          </td>
                                          <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{czFormat(fa.fa_castka)}</td>
                                          <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right', fontSize: '0.8rem', color: '#78716c' }}>{czDate(fa.fa_datum_splatnosti)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </>
                              )}
                              {totalRows > PAGE_SIZES[0] && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.25rem 0', fontFamily: "'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '0.75rem', color: '#64748b' }}>
                                  <span>Celkem {objednavky.length} obj. + {primeFaktury.length} přímých FA</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <select value={pageState.pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'inherit', cursor: 'pointer', background: 'white' }}>
                                      {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </TableCell>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </Tbody>
          </Table>

          {/* Pagination */}
          <Pagination>
            <PageInfo>
              Zobrazeno {Math.min(pageIndex * pageSize + 1, sortedRows.length)} - {Math.min((pageIndex + 1) * pageSize, sortedRows.length)} z {sortedRows.length} smluv
            </PageInfo>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>
                Zobrazit:
              </span>
              <PageSizeSelect
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  setPageIndex(0);
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </PageSizeSelect>

              <PaginationButton
                onClick={goToFirstPage}
                disabled={pageIndex === 0}
              >
                ««
              </PaginationButton>
              <PaginationButton
                onClick={goToPreviousPage}
                disabled={pageIndex === 0}
              >
                ‹
              </PaginationButton>

              <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 1rem' }}>
                Stránka {pageIndex + 1} z {Math.max(1, totalPages)}
              </span>

              <PaginationButton
                onClick={goToNextPage}
                disabled={pageIndex >= totalPages - 1}
              >
                ›
              </PaginationButton>
              <PaginationButton
                onClick={goToLastPage}
                disabled={pageIndex >= totalPages - 1}
              >
                »»
              </PaginationButton>
            </div>
          </Pagination>
        </TableContainer>

      {/* Modals */}
      {!readOnly && formModalOpen && (
        <SmlouvyFormModal
          smlouva={editingSmlouva}
          useky={useky}
          onClose={handleFormClose}
        />
      )}

      {detailModalOpen && viewingSmlouva && (
        <SmlouvyDetailModal
          smlouva={viewingSmlouva}
          onClose={handleDetailClose}
          onEdit={
            readOnly
              ? undefined
              : () => {
                  handleDetailClose();
                  handleEdit(viewingSmlouva.smlouva);
                }
          }
        />
      )}

      {!readOnly && importModalOpen && (
        <SmlouvyImportModal
          useky={useky}
          onClose={handleImportClose}
        />
      )}

      {/* Confirm Dialog */}
      {!readOnly && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          icon={faExclamationTriangle}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        >
          {confirmDialog.message}
        </ConfirmDialog>
      )}
    </Container>
    </>
  );
};

export default SmlouvyTab;
