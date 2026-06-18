import React, { useState, useCallback, useContext, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import {
  faClipboardList, faSearch, faArrowsRotate,
  faUserShield, faClock, faTag, faTable, faStream, faChartBar, faFileCsv
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import { fetchAllUsers } from '../services/api2auth';
import { getStavyWorkflow25, getStrediska25, getInvoiceTypes25, getTypyFaktur25 } from '../services/api25orders';
import DatePicker from '../components/DatePicker';

const API_BASE = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

// ─── Styled components ────────────────────────────────────────────────────────

const PageWrapper = styled.div`
  width: 100%;
  padding: 16px;
  margin: 0;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const ModuleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  margin-bottom: 1rem;
  color: #fff;
`;

const ModuleTitle = styled.h1`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);

  svg {
    color: #fff;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RefreshBtn = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border-radius: 6px;
  padding: 0.42rem 0.72rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.65);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const FiltersBar = styled.div`
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  align-items: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  select, input {
    border: 1px solid #dbe3ef;
    border-radius: 6px;
    padding: 0.5rem 0.65rem;
    height: 38px;
    font-size: 0.875rem;
    background: #fff;
    color: #1e293b;
    min-width: 140px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
    }
  }

  /* DatePicker sjednocení výšky + odsazení textu od ikony */
  [data-field] {
    min-width: 140px;
  }

  [data-field] svg {
    left: 0.72rem;
  }

  input[data-datepicker] {
    height: 38px;
    padding-left: 2.35rem;
    padding-right: 0.65rem;
    font-size: 0.875rem;
  }
`;

const SearchBtn = styled.button`
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  border: 1px solid #2563eb;
  border-radius: 6px;
  padding: 0.55rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  align-self: flex-end;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(59, 130, 246, 0.28);
  }

  &:disabled {
    background: #94a3b8;
    border-color: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ResetFiltersBtn = styled(SearchBtn)`
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: #dc2626;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 14px rgba(220, 38, 38, 0.28);
  }

  &:disabled {
    background: #94a3b8;
    border-color: #94a3b8;
  }
`;

const ResultInfo = styled.div`
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 0.85rem;
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;

  th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
    color: #334155;
    font-weight: 600;
    border-bottom: 1px solid #dbe3ef;
    white-space: nowrap;
  }

  td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #eef2f7;
    vertical-align: top;
    transition: background-color 0.16s ease, box-shadow 0.16s ease;
  }

  tr:hover td {
    background: #f8fbff;
    box-shadow: inset 0 1px 0 #e7eefb, inset 0 -1px 0 #e7eefb;
    cursor: pointer;
  }
`;

const ExpandButton = styled.button`
  width: 24px;
  height: 24px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #1d4ed8;
  font-weight: 700;
  line-height: 1;
  font-size: 0.92rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #eef2ff;
    border-color: #93c5fd;
  }
`;

const AkceBadge = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $typ }) => {
    switch ($typ) {
      case 'CREATE': return '#dcfce7';
      case 'UPDATE': return '#dbeafe';
      case 'DELETE': return '#fee2e2';
      case 'UNLOCK': return '#fef3c7';
      case 'APPROVE': return '#d1fae5';
      case 'REJECT':  return '#fce7f3';
      case 'POSTPONE': return '#ffedd5';
      case 'STORNO': return '#fee2e2';
      case 'SUBMIT': return '#e0e7ff';
      case 'RESET':   return '#fef3c7';
      default: return '#f1f5f9';
    }
  }};
  color: ${({ $typ }) => {
    switch ($typ) {
      case 'CREATE': return '#166534';
      case 'UPDATE': return '#1d4ed8';
      case 'DELETE': return '#991b1b';
      case 'UNLOCK': return '#92400e';
      case 'APPROVE': return '#065f46';
      case 'REJECT':  return '#9d174d';
      case 'POSTPONE': return '#9a3412';
      case 'STORNO': return '#991b1b';
      case 'SUBMIT': return '#3730a3';
      case 'RESET':   return '#92400e';
      default: return '#475569';
    }
  }};
`;

const DetailPanel = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-top: 0.5rem;
`;

const DetailTable = styled.table`
  width: 100%;
  font-size: 0.82rem;
  border-collapse: collapse;
  th {
    text-align: left;
    color: #64748b;
    font-weight: 600;
    padding: 0.3rem 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }
  td {
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid #f1f5f9;
    word-break: break-word;
    max-width: 350px;
    transition: background-color 0.16s ease;
  }
  tr:hover td {
    background: #f1f5f9;
  }
  tr:last-child td { border-bottom: none; }
`;

const ZastupovaniTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
`;

const ObjectValueLink = styled.button`
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  color: ${({ $color }) => $color || '#1d4ed8'};
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.83rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 6px;
  padding: 0.12rem 0.28rem;

  &:hover {
    filter: brightness(0.92);
    background: rgba(15, 23, 42, 0.05);
  }
`;

const NumberTypeTag = styled.sup`
  margin-left: 2px;
  padding: 0 4px;
  border-radius: 6px;
  font-size: calc(0.54em + 2px);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1;
  vertical-align: super;
  position: relative;
  top: -2px;
  background: ${({ $variant }) => {
    if ($variant === 'sml') return '#dbeafe';
    if ($variant === 'fa') return '#e0f2fe';
    if ($variant === 'obj') return '#dcfce7';
    return '#e2e8f0';
  }};
  color: ${({ $variant }) => {
    if ($variant === 'sml') return '#1e40af';
    if ($variant === 'fa') return '#0369a1';
    if ($variant === 'obj') return '#047857';
    return '#64748b';
  }};
`;

const RelatedInfoText = styled.div`
  margin-top: 2px;
  font-size: 0.72rem;
  color: #64748b;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PaginationInfo = styled.div`
  font-size: 0.82rem;
  color: #64748b;
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span {
    font-size: 0.82rem;
    color: #475569;
    font-weight: 600;
  }

  button {
    border: 1px solid #e2e8f0;
    background: #fff;
    border-radius: 6px;
    padding: 0.38rem 0.72rem;
    color: #334155;
    font-weight: 500;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    &:disabled {
      color: #94a3b8;
      cursor: not-allowed;
    }
  }
`;

const EmptyTableCell = styled.td`
  text-align: center;
  color: #64748b;
  padding: 2rem 1rem;
  background: #fbfdff;
  font-size: 0.9rem;
`;

const ErrorMsg = styled.div`
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
`;

const ViewSwitchBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 0.85rem 0;
`;

const ViewModeButton = styled.button`
  border: 1px solid ${({ $active }) => ($active ? '#1d4ed8' : '#cbd5e1')};
  background: ${({ $active }) => ($active ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#334155')};
  border-radius: 6px;
  padding: 0.4rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    border-color: ${({ $active }) => ($active ? '#1d4ed8' : '#94a3b8')};
    background: ${({ $active }) => ($active ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#f8fafc')};
  }
`;

const PivotPanel = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.8rem;
  margin-bottom: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
`;

const PivotGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  select {
    border: 1px solid #dbe3ef;
    border-radius: 6px;
    padding: 0.5rem 0.65rem;
    height: 38px;
    font-size: 0.875rem;
    background: #fff;
    color: #1e293b;
    min-width: 180px;
    box-sizing: border-box;
  }
`;

const PivotMeta = styled.div`
  margin: 0 0 0.85rem 0;
  color: #64748b;
  font-size: 0.82rem;
`;

const VizGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.85rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const VizCard = styled.div`
  background: linear-gradient(145deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 0.8rem 0.9rem;
  box-shadow: 0 2px 10px rgba(29, 78, 216, 0.08);
`;

const VizLabel = styled.div`
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  font-weight: 700;
`;

const VizValue = styled.div`
  margin-top: 0.25rem;
  font-size: 1.45rem;
  font-weight: 800;
  color: #1d4ed8;
`;

const VizPanels = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const VizPanel = styled.div`
  background: #fff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 0.8rem;
`;

const VizPanelTitle = styled.h3`
  margin: 0 0 0.65rem 0;
  font-size: 0.9rem;
  font-weight: 800;
  color: #1e3a8a;
`;

const VizBarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
`;

const VizBarRow = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr 54px;
  gap: 0.55rem;
  align-items: center;

  @media (max-width: 700px) {
    grid-template-columns: 110px 1fr 44px;
  }
`;

const VizBarLabel = styled.div`
  font-size: 0.78rem;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const VizBarTrack = styled.div`
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
`;

const VizBarFill = styled.div`
  height: 100%;
  width: ${({ $width }) => `${$width}%`};
  background: ${({ $tone }) => {
    switch ($tone) {
      case 'critical':
        return 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)';
      case 'high':
        return 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)';
      case 'medium':
        return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
      case 'low':
        return 'linear-gradient(90deg, #facc15 0%, #eab308 100%)';
      default:
        return 'linear-gradient(90deg, #60a5fa 0%, #1d4ed8 100%)';
    }
  }};
`;

const VizBarValue = styled.div`
  font-size: 0.76rem;
  color: #1e3a8a;
  font-weight: 700;
  text-align: right;
`;

const VizRiskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

const VizRiskItem = styled.div`
  border: 1px solid ${({ $tone }) => {
    switch ($tone) {
      case 'critical': return '#fecaca';
      case 'high': return '#fed7aa';
      case 'medium': return '#fde68a';
      default: return '#fef08a';
    }
  }};
  border-left: 4px solid ${({ $tone }) => {
    switch ($tone) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      default: return '#ca8a04';
    }
  }};
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  background: ${({ $tone }) => {
    switch ($tone) {
      case 'critical': return '#fef2f2';
      case 'high': return '#fff7ed';
      case 'medium': return '#fffbeb';
      default: return '#fefce8';
    }
  }};
`;

const VizRiskMeta = styled.div`
  margin-top: 2px;
  font-size: 0.74rem;
  color: #64748b;
`;

// ─── Pomocné funkce ───────────────────────────────────────────────────────────

const OBJEKT_TYPY = [
  { value: '', label: 'Vše' },
  { value: 'OBJEDNAVKA', label: 'Objednávka' },
  { value: 'FAKTURA', label: 'Faktura' },
  { value: 'ROCNI_POPLATEK', label: 'Roční poplatek' },
  { value: 'ROCNI_POPLATEK_POLOZKA', label: 'Položka RP' },
  { value: 'DODAVATEL', label: 'Dodavatel' },
];

const AKCE_TYPY = [
  { value: '', label: 'Vše' },
  { value: 'CREATE', label: 'Vytvoření' },
  { value: 'UPDATE', label: 'Úprava' },
  { value: 'DELETE', label: 'Smazání' },
  { value: 'UNLOCK', label: 'Odemčení' },
  { value: 'SUBMIT', label: 'Předáno ke schválení' },
  { value: 'APPROVE', label: 'Schválení' },
  { value: 'REJECT', label: 'Zamítnutí' },
  { value: 'POSTPONE', label: 'Odložení / čeká se' },
  { value: 'STORNO', label: 'Storno objednávky' },
  { value: 'RESET', label: 'Reset / vrácení' },
];

const AKCE_BADGE_LABELS = {
  CREATE: 'VYTVOŘENÍ',
  UPDATE: 'ÚPRAVA',
  DELETE: 'SMAZÁNÍ',
  UNLOCK: 'ODEMČENÍ',
  SUBMIT: 'KE SCHVÁLENÍ',
  APPROVE: 'SCHVÁLENÍ',
  REJECT: 'ZAMÍTNUTÍ',
  POSTPONE: 'ODLOŽENO',
  STORNO: 'STORNO',
  LOCK: 'UZAMČENÍ',
  RESET: 'RESET / VRÁCENÍ',
};

const LIMIT_OPTIONS = [10, 25, 50, 100];
const DEFAULT_LIMIT = 10;
const OBJECT_VIEW_FETCH_LIMIT = 500;
const PIVOT_LIMIT = 1000;
const AUDIT_UI_STATE_KEY = 'eeo.auditLog.uiState.v1';
const DEFAULT_FILTERS = {
  objekt_typ: '',
  q: '',
  akce_typ: '',
  od: '',
  do: '',
};

function getPersistedAuditUiState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUDIT_UI_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const VIEW_MODES = [
  { value: 'objekt', label: 'Objektový', icon: faTable },
  { value: 'timeline', label: 'Surová timeline', icon: faStream },
  { value: 'pivot', label: 'Kontingenční tabulka', icon: faChartBar },
  { value: 'vizual', label: 'Audit vizualizace', icon: faChartBar },
];

const PIVOT_ROW_DIMENSIONS = [
  { value: 'uzivatel', label: 'Uživatel' },
  { value: 'role', label: 'Role' },
  { value: 'objekt_typ', label: 'Typ objektu' },
  { value: 'endpoint', label: 'Endpoint' },
];

const PIVOT_COL_DIMENSIONS = [
  { value: 'akce_typ', label: 'Typ akce' },
  { value: 'objekt_typ', label: 'Typ objektu' },
  { value: 'den', label: 'Den' },
  { value: 'tyden', label: 'Týden (ISO)' },
  { value: 'mesic', label: 'Měsíc' },
];

const PIVOT_METRICS = [
  { value: 'pocet_akci', label: 'Počet akcí' },
  { value: 'pocet_objektu', label: 'Počet objektů (distinct)' },
  { value: 'pocet_batchu', label: 'Počet batchů (distinct)' },
  { value: 'pocet_unlocku', label: 'Počet UNLOCK akcí' },
  { value: 'pocet_zmen_poli', label: 'Počet změn polí' },
];

function normalizeDateString(value) {
  if (!value) return '';
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function monthKey(value) {
  const d = normalizeDateString(value);
  return d.length >= 7 ? d.slice(0, 7) : d;
}

function isoWeekKey(value) {
  const dateOnly = normalizeDateString(value);
  const dt = new Date(dateOnly);
  if (Number.isNaN(dt.getTime())) return 'nezname';
  const utcDate = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const AUDIT_FIELD_LABELS = {
  stav_workflow_kod: 'Workflow stav',
  stav_objednavky: 'Stav objednávky',
  dt_dokonceni: 'Datum dokončení',
  dokoncil_id: 'Dokončil (uživatel ID)',
  max_cena_s_dph: 'Max. cena s DPH',
  cislo_objednavky: 'Číslo objednávky',
  druh_objednavky_kod: 'Druh objednávky',
  strediska_kod: 'Střediska',
  dt_predpokladany_termin_dodani: 'Předpokládaný termín dodání',
  misto_dodani: 'Místo dodání',
  zaruka: 'Záruka',
  dt_odeslani: 'Datum odeslání',
  dodavatel_zpusob_potvrzeni: 'Způsob potvrzení dodavatele',
  dt_akceptace: 'Datum akceptace',
  polozky_objednavky: 'Položky objednávky',
  ev_cislo: 'Evidenční číslo',
  fa_vema_kod: 'VS faktury',
  fa_cislo_vema: 'Číslo faktury',
  fa_datum_zaplaceni: 'Datum zaplacení faktury',
  zaplaceno_celkem: 'Zaplaceno celkem',
  zbyva_zaplatit: 'Zbývá zaplatit',
  vecna_spravnost_potvrzeno: 'Věcná správnost',
  fakturant_id: 'Fakturant',
};

const USER_ID_AUDIT_FIELDS = new Set([
  'uzivatel_id',
  'uzivatel_akt_id',
  'objednatel_id',
  'garant_uzivatel_id',
  'schvalovatel_id',
  'prikazce_id',
  'odesilatel_id',
  'dodavatel_potvrdil_id',
  'zverejnil_id',
  'dokoncil_id',
  'fakturant_id',
  'potvrdil_vecnou_spravnost_id',
]);

const VECNA_SPRAVNOST_FIELDS = new Set([
  'vecna_spravnost_potvrzeno',
  'potvrzeni_vecne_spravnosti',
]);

const VECNA_SPRAVNOST_LABELS = {
  0: 'Nepotvrzena',
  1: 'Potvrzena',
  2: 'Zamitnuto',
};

const WORKFLOW_FIELDS = new Set(['stav_workflow_kod']);
const STREDISKA_FIELDS = new Set(['strediska_kod', 'fa_strediska_kod']);
const INVOICE_TYPE_FIELDS = new Set(['fa_typ']);
const FAKTURA_TYP_FIELDS = new Set(['typ_prilohy', 'faktura_typ']);
const CURRENCY_FIELDS = new Set([
  'max_cena_s_dph',
  'fa_castka',
  'castka_s_dph',
  'castka_bez_dph',
]);

function isAuditCurrencyField(fieldName) {
  const key = String(fieldName || '').trim().toLowerCase();
  if (!key) return false;
  if (CURRENCY_FIELDS.has(key)) return true;
  if (key.includes('cena') || key.includes('castka') || key.includes('_dph')) return true;
  return false;
}

function parseNumericScalar(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  // odstranění mezer včetně NBSP
  let normalized = raw.replace(/[\s\u00A0]/g, '');

  // český formát 1.234,56 nebo 1234,56
  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return num;
}

function formatCzkValue(value) {
  const num = parseNumericScalar(value);
  if (num === null) return null;

  const isInteger = Number.isInteger(num);
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatAuditFieldName(fieldName) {
  const raw = String(fieldName || '').trim();
  if (!raw) return <em style={{ color: '#94a3b8' }}>—</em>;

  const label = AUDIT_FIELD_LABELS[raw] || raw;
  if (label === raw) return raw;

  return (
    <>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: '0.75rem' }}>({raw})</span>
    </>
  );
}

function formatAuditValue(val) {
  if (val === null || val === undefined) return <em style={{ color: '#94a3b8' }}>—</em>;

  const raw = typeof val === 'string' ? val.trim() : val;
  if (raw === '') return <em style={{ color: '#94a3b8' }}>—</em>;

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (parsed === null || parsed === undefined || parsed === '') {
      return <em style={{ color: '#94a3b8' }}>—</em>;
    }

    if (typeof parsed === 'object') {
      return (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.76rem', lineHeight: 1.35 }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    }

    return String(parsed);
  } catch {
    return String(raw);
  }
}

function formatCzDateTime(value) {
  if (!value) return '—';
  const raw = String(value).trim();
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const dt = new Date(normalized);

  if (Number.isNaN(dt.getTime())) return raw;

  const formatted = new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(dt);

  return formatted.replace(',', '');
}

function formatCzDate(value) {
  if (!value) return '—';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;

  const dt = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return raw;

  return new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dt);
}

function isAuditDateField(fieldName) {
  const key = String(fieldName || '').trim().toLowerCase();
  if (!key) return false;
  return key.startsWith('dt_') || key.startsWith('datum_') || key.endsWith('_datum') || key.includes('_datum_');
}

function formatAuditDateScalar(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return formatCzDate(raw);
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(raw)) {
    return formatCzDateTime(raw);
  }

  return raw;
}

function getActionBadgeLabel(actionType, row = null) {
  const key = normalizeAuditActionType(actionType, row);
  const objectType = String(row?.objekt_typ || '').toUpperCase();

  if (objectType === 'FAKTURA') {
    if (key === 'CREATE') return 'PŘIDÁNÍ FAKTURY';
    if (key === 'DELETE') return 'SMAZÁNÍ FAKTURY';
    if (key === 'APPROVE') return 'POTVRZENÍ VĚCNÉ SPRÁVNOSTI';
    if (key === 'REJECT') return 'ZAMÍTNUTÍ VĚCNÉ SPRÁVNOSTI';
    if (key === 'RESET') return 'RESET VĚCNÉ SPRÁVNOSTI';
  }

  if (key === 'UNLOCK') {
    const endpoint = String(row?.endpoint || '').toLowerCase();
    if (endpoint.includes('/unlock')) {
      return 'ODEMČENÍ OBJEDNÁVKY';
    }
    if (endpoint === 'order-v2/update') {
      return 'ODEMČENÍ BLOKU';
    }
  }

  if (key === 'DELETE') {
    const note = String(row?.poznamka || '').toLowerCase();
    if (note.includes('hard delete')) return 'TVRDÉ SMAZÁNÍ';
    if (note.includes('soft delete')) return 'SMAZÁNÍ (soft)';
  }

  return AKCE_BADGE_LABELS[key] || key || '—';
}

function normalizeAuditActionType(actionType, row = null) {
  const key = String(actionType || '').trim().toUpperCase();
  if (key !== 'RESET') {
    return key;
  }

  const endpoint = String(row?.endpoint || '').trim().toLowerCase();
  if (endpoint !== 'orders-v3/update' && endpoint !== 'order-v2/update') {
    return key;
  }

  const note = String(row?.poznamka || '').toUpperCase();
  if (note.includes('ODLOZ') || note.includes('ODLOŽ') || note.includes('CEKA_SE') || note.includes('ČEKÁ')) {
    return 'POSTPONE';
  }
  if (note.includes('ZAMIT') || note.includes('ZAMÍT')) {
    return 'REJECT';
  }
  if (note.includes('STORNO') || note.includes('ZRUS') || note.includes('ZRUŠ')) {
    return 'STORNO';
  }
  if (note.includes('ODESLANA_KE_SCHVALENI') || note.includes('KE SCHVALENI') || note.includes('KE SCHVÁLENÍ')) {
    return 'SUBMIT';
  }

  return key;
}

function extractUnlockBlockName(noteText) {
  const raw = String(noteText || '').trim();
  if (!raw) return '';

  const match = raw.match(/odem\w*\s+bloku\s*:?[\s-]*(.+)$/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  if (/odem\w*\s+bloku/i.test(raw)) {
    return 'Neupřesněný blok';
  }

  return '';
}

function parseAuditScalarValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value);

  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || parsed === undefined) return '';
    if (typeof parsed === 'object') return '';
    return String(parsed).trim();
  } catch {
    return trimmed;
  }
}

function getObjectTypeShortLabel(objektTyp) {
  switch ((objektTyp || '').toUpperCase()) {
    case 'OBJEDNAVKA':
      return 'OBJ';
    case 'FAKTURA':
      return 'FA';
    case 'ROCNI_POPLATEK':
      return 'RP';
    case 'ROCNI_POPLATEK_POLOZKA':
      return 'RP-P';
    case 'DODAVATEL':
      return 'DOD';
    default:
      return objektTyp || 'OBJ';
  }
}

function getAuditObjectDisplayLabel(row) {
  const rawValue = row?.objekt_hodnota;

  if (typeof rawValue === 'string') {
    const t = rawValue.trim();
    if (t && t !== '[object Object]') return t;
  } else if (typeof rawValue === 'number') {
    return String(rawValue);
  }

  const shortType = getObjectTypeShortLabel(row?.objekt_typ || 'OBJ');
  const objectId = String(row?.objekt_id || '').trim();
  if (objectId) return `${shortType} #${objectId}`;
  return shortType || 'Objekt';
}

function pickLastNonEmptyValue(rowsForObject, fieldNames) {
  const normalizedFields = new Set(fieldNames.map((f) => f.toLowerCase()));

  for (const row of rowsForObject) {
    const field = String(row?.pole || '').toLowerCase();
    if (!normalizedFields.has(field)) continue;

    const newVal = parseAuditScalarValue(row?.nova_hodnota);
    if (newVal) return newVal;

    const oldVal = parseAuditScalarValue(row?.stara_hodnota);
    if (oldVal) return oldVal;
  }

  return '';
}

function buildObjectValueLabel(rowsForObject, representativeRow) {
  const backendValue = String(representativeRow?.objekt_hodnota || '').trim();
  if (backendValue) return backendValue;

  const objektTyp = (representativeRow?.objekt_typ || '').toUpperCase();

  if (objektTyp === 'OBJEDNAVKA') {
    const evCislo = pickLastNonEmptyValue(rowsForObject, [
      'cislo_objednavky',
      'ev_cislo',
      'evidencni_cislo',
    ]);
    return evCislo ? `EV ${evCislo}` : '—';
  }

  if (objektTyp === 'FAKTURA') {
    const vemaKod = pickLastNonEmptyValue(rowsForObject, [
      'fa_vema_kod',
      'vema_kod',
      'vs',
    ]);
    const faCislo = pickLastNonEmptyValue(rowsForObject, [
      'fa_cislo_vema',
      'cislo_faktury',
      'fa_cislo',
    ]);

    if (vemaKod && faCislo) return `FA VS ${vemaKod} / ${faCislo}`;
    if (vemaKod) return `FA VS ${vemaKod}`;
    if (faCislo) return `FA ${faCislo}`;
    return '—';
  }

  return '—';
}

function getObjectEditTarget(row) {
  const objektTyp = String(row?.objekt_typ || '').toUpperCase();
  const objektId = Number(row?.objekt_id || 0);
  if (!Number.isFinite(objektId) || objektId <= 0) return null;

  if (objektTyp === 'OBJEDNAVKA') {
    return {
      path: `/order-form-25?edit=${objektId}`,
      state: { returnTo: '/admin/audit-log' },
    };
  }

  if (objektTyp === 'FAKTURA') {
    const orderIdForLoad = Number(row?.faktura_objednavka_id || 0);
    return {
      path: '/invoice-evidence',
      state: {
        editInvoiceId: objektId,
        ...(orderIdForLoad > 0 ? { orderIdForLoad } : {}),
        returnTo: '/admin/audit-log',
      },
    };
  }

  return null;
}

function normalizeStatus(stav) {
  return String(stav || '').trim().toUpperCase();
}

function getObjectValueAppearance(row) {
  const objektTyp = String(row?.objekt_typ || '').toUpperCase();

  if (objektTyp === 'OBJEDNAVKA') {
    const stav = normalizeStatus(row?.objednavka_stav);
    if (stav.includes('DOKONC')) return { color: '#059669', suffix: 'OBJ', suffixVariant: 'obj' };
    if (stav.includes('KONTROL') || stav.includes('SCHVAL') || stav.includes('FAKTUR')) {
      return { color: '#ea580c', suffix: 'OBJ', suffixVariant: 'obj' };
    }
    if (stav.includes('STORNO') || stav.includes('ZRUS')) return { color: '#dc2626', suffix: 'OBJ', suffixVariant: 'obj' };
    return { color: '#3b82f6', suffix: 'OBJ', suffixVariant: 'obj' };
  }

  if (objektTyp === 'FAKTURA') {
    const stav = normalizeStatus(row?.faktura_stav);
    const isSml = Number(row?.faktura_smlouva_id || 0) > 0;
    if (stav === 'ZAPLACENO' || stav === 'DOKONCENA') {
      return { color: '#059669', suffix: isSml ? 'SML' : 'FA', suffixVariant: isSml ? 'sml' : 'fa' };
    }
    if (stav === 'K_ZAPLACENI') {
      return { color: '#ea580c', suffix: isSml ? 'SML' : 'FA', suffixVariant: isSml ? 'sml' : 'fa' };
    }
    if (stav === 'STORNO') {
      return { color: '#dc2626', suffix: isSml ? 'SML' : 'FA', suffixVariant: isSml ? 'sml' : 'fa' };
    }
    return { color: '#3b82f6', suffix: isSml ? 'SML' : 'FA', suffixVariant: isSml ? 'sml' : 'fa' };
  }

  return { color: '#334155', suffix: '', suffixVariant: 'none' };
}

function isRowNewerThan(candidate, current) {
  const candidateTime = String(candidate?.dt_akce || '');
  const currentTime = String(current?.dt_akce || '');
  if (candidateTime > currentTime) return true;
  if (candidateTime < currentTime) return false;

  const candidateId = Number(candidate?.id || 0);
  const currentId = Number(current?.id || 0);
  return candidateId > currentId;
}

function getAuditObjectGroupKey(row) {
  const objectType = row?.objekt_typ || 'NEZNAMY';
  const objectId = row?.objekt_id ?? row?.faktura_id ?? row?.objednavka_id ?? row?.id ?? '0';
  return `${objectType}:${objectId}`;
}

function isAuditActionWithoutValueChanges(row) {
  const actionType = normalizeAuditActionType(row?.akce_typ, row);
  const endpoint = String(row?.endpoint || '').trim().toLowerCase();

  const isUpdate = actionType === 'UPDATE';
  const isOrderUnlock = actionType === 'UNLOCK' && endpoint === 'order-v2/{id}/unlock';
  if (!isUpdate && !isOrderUnlock) return false;

  const pole = String(row?.pole || '').trim();
  const oldValue = parseAuditScalarValue(row?.stara_hodnota);
  const newValue = parseAuditScalarValue(row?.nova_hodnota);

  // Poznámka se u běžného UNLOCK používá systémově ("Odemčení vlastního zámku"),
  // proto ji zde nebereme jako business změnu hodnot.
  return !pole && !oldValue && !newValue;
}

// ─── Komponenta ───────────────────────────────────────────────────────────────

const AuditLogPage = () => {
  const navigate = useNavigate();
  const { user, token, userDetail } = useContext(AuthContext);
  const persistedState = getPersistedAuditUiState();

  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    ...(persistedState?.filters || {}),
  }));
  const [showNoChangeActions, setShowNoChangeActions] = useState(() => Boolean(persistedState?.showNoChangeActions));
  const [timelineRows, setTimelineRows] = useState([]);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [timelineOffset, setTimelineOffset] = useState(() => {
    const saved = Number(persistedState?.timelineOffset ?? persistedState?.offset ?? 0);
    return Number.isFinite(saved) && saved >= 0 ? saved : 0;
  });
  const [timelineSearched, setTimelineSearched] = useState(false);

  const [objectRows, setObjectRows] = useState([]);
  const [objectTotal, setObjectTotal] = useState(0);
  const [objectOffset, setObjectOffset] = useState(() => {
    const saved = Number(persistedState?.objectOffset ?? 0);
    return Number.isFinite(saved) && saved >= 0 ? saved : 0;
  });
  const [objectSearched, setObjectSearched] = useState(false);

  const [viewMode, setViewMode] = useState(() => {
    const saved = persistedState?.viewMode;
    return VIEW_MODES.some((m) => m.value === saved) ? saved : 'objekt';
  });
  const [limit, setLimit] = useState(() => {
    const saved = Number(persistedState?.limit || DEFAULT_LIMIT);
    return LIMIT_OPTIONS.includes(saved) ? saved : DEFAULT_LIMIT;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [pivotConfig, setPivotConfig] = useState(() => ({
    rowDim: persistedState?.pivotConfig?.rowDim || 'uzivatel',
    colDim: persistedState?.pivotConfig?.colDim || 'akce_typ',
    metric: persistedState?.pivotConfig?.metric || 'pocet_akci',
  }));
  const [pivotRows, setPivotRows] = useState([]);
  const [pivotTotal, setPivotTotal] = useState(0);
  const [pivotLoading, setPivotLoading] = useState(false);
  const [pivotError, setPivotError] = useState(null);

  // Rozbalený detail objektu (objekt_typ + objekt_id)
  const [openObjectKey, setOpenObjectKey] = useState(null);
  const [objectDetail, setObjectDetail] = useState({});
  const [loadingObjectKey, setLoadingObjectKey] = useState(null);

  // Rozbalený detail batche pro timeline režim
  const [openTimelineBatchId, setOpenTimelineBatchId] = useState(null);
  const [timelineBatchDetail, setTimelineBatchDetail] = useState({});
  const [loadingTimelineBatchId, setLoadingTimelineBatchId] = useState(null);
  const [auditUsersMap, setAuditUsersMap] = useState({});
  const [workflowMap, setWorkflowMap] = useState({});
  const [strediskaMap, setStrediskaMap] = useState({});
  const [invoiceTypesMap, setInvoiceTypesMap] = useState({});
  const [fakturaTypMap, setFakturaTypMap] = useState({});

  const username = user?.username || userDetail?.username || '';

  useEffect(() => {
    let isMounted = true;

    const loadAuditUsers = async () => {
      if (!token || !username) return;
      try {
        const users = await fetchAllUsers({ token, username, show_inactive: true });
        if (!isMounted || !Array.isArray(users)) return;

        const map = {};
        users.forEach((u) => {
          const id = u?.id ?? u?.user_id ?? u?.uzivatel_id;
          if (id === null || id === undefined) return;
          const idKey = String(id).trim();
          if (!idKey) return;

          const titulPred = String(u?.titul_pred || '').trim();
          const jmeno = String(u?.jmeno || '').trim();
          const prijmeni = String(u?.prijmeni || '').trim();
          const titulZa = String(u?.titul_za || '').trim();
          const usernameValue = String(u?.username || u?.uzivatelske_jmeno || '').trim();

          const fullNameParts = [
            titulPred,
            jmeno,
            prijmeni,
          ].filter(Boolean);

          let displayName = fullNameParts.join(' ').replace(/\s+/g, ' ').trim();
          if (titulZa) {
            displayName = displayName ? `${displayName}, ${titulZa}` : titulZa;
          }
          if (!displayName) {
            displayName = usernameValue || `Uživatel ${idKey}`;
          }

          map[idKey] = {
            id: idKey,
            displayName,
            username: usernameValue,
          };
        });

        map['0'] = map['0'] || { id: '0', displayName: 'SYSTEM', username: 'system' };
        setAuditUsersMap(map);
      } catch {
        // non-fatal, fallback je zobrazení čisté hodnoty
      }
    };

    loadAuditUsers();

    return () => {
      isMounted = false;
    };
  }, [token, username]);

  useEffect(() => {
    let isMounted = true;

    const loadAuditDictionaries = async () => {
      if (!token || !username) return;

      const [workflowResult, strediskaResult, invoiceTypesResult, fakturaTypResult] = await Promise.allSettled([
        getStavyWorkflow25({ token, username }),
        getStrediska25({ token, username, aktivni: 1 }),
        getInvoiceTypes25({ token, username, aktivni: 1 }),
        getTypyFaktur25({ token, username, aktivni: 1 }),
      ]);

      if (!isMounted) return;

      if (workflowResult.status === 'fulfilled' && workflowResult.value && typeof workflowResult.value === 'object') {
        setWorkflowMap(workflowResult.value);
      }

      if (strediskaResult.status === 'fulfilled' && Array.isArray(strediskaResult.value)) {
        const map = {};
        strediskaResult.value.forEach((item) => {
          const code = String(item?.value || item?.kod_stavu || '').trim();
          const label = String(item?.label || item?.nazev_stavu || item?.nazev || '').trim();
          if (code && label) map[code] = label;
        });
        setStrediskaMap(map);
      }

      if (invoiceTypesResult.status === 'fulfilled' && Array.isArray(invoiceTypesResult.value)) {
        const map = {};
        invoiceTypesResult.value.forEach((item) => {
          const code = String(item?.id || item?.kod_stavu || '').trim();
          const label = String(item?.nazev || item?.nazev_stavu || '').trim();
          if (code && label) map[code] = label;
        });
        setInvoiceTypesMap(map);
      }

      if (fakturaTypResult.status === 'fulfilled' && Array.isArray(fakturaTypResult.value)) {
        const map = {};
        fakturaTypResult.value.forEach((item) => {
          const code = String(item?.value || item?.kod || '').trim();
          const label = String(item?.label || item?.nazev || '').trim();
          if (code && label) map[code] = label;
        });
        setFakturaTypMap(map);
      }
    };

    loadAuditDictionaries();

    return () => {
      isMounted = false;
    };
  }, [token, username]);

  // ── Načtení seznamu ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (newOffset = 0, targetMode = 'timeline') => {
    setLoading(true);
    setError(null);
    try {
      const requestLimit = targetMode === 'objekt' ? OBJECT_VIEW_FETCH_LIMIT : limit;
      const requestOffset = targetMode === 'objekt' ? 0 : newOffset;
      const body = {
        token,
        username,
        limit: requestLimit,
        offset: requestOffset,
        ...(filters.objekt_typ && { objekt_typ: filters.objekt_typ }),
        ...(filters.q && { q: filters.q.trim() }),
        ...(filters.akce_typ && { akce_typ: filters.akce_typ }),
        ...(filters.od && { od: filters.od }),
        ...(filters.do && { do: filters.do }),
      };
      const res = await fetch(`${API_BASE}/audit/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.status === 'success') {
        if (targetMode === 'objekt') {
          setObjectRows(json.data || []);
          setObjectTotal(json.meta?.total || 0);
          setObjectOffset(0);
          setObjectSearched(true);
        } else {
          setTimelineRows(json.data || []);
          setTimelineTotal(json.meta?.total || 0);
          setTimelineOffset(newOffset);
          setTimelineSearched(true);
        }
      } else {
        setError(json.message || 'Chyba při načítání audit logu');
      }
    } catch (e) {
      setError('Síťová chyba: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, token, username, limit]);

  const fetchPivotData = useCallback(async () => {
    setPivotLoading(true);
    setPivotError(null);
    try {
      const body = {
        token,
        username,
        limit: PIVOT_LIMIT,
        offset: 0,
        ...(filters.objekt_typ && { objekt_typ: filters.objekt_typ }),
        ...(filters.q && { q: filters.q.trim() }),
        ...(filters.akce_typ && { akce_typ: filters.akce_typ }),
        ...(filters.od && { od: filters.od }),
        ...(filters.do && { do: filters.do }),
      };
      const res = await fetch(`${API_BASE}/audit/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setPivotRows(json.data || []);
        setPivotTotal(json.meta?.total || 0);
      } else {
        setPivotRows([]);
        setPivotTotal(0);
        setPivotError(json.message || 'Chyba při načítání kontingenčních dat');
      }
    } catch (e) {
      setPivotRows([]);
      setPivotTotal(0);
      setPivotError('Sitova chyba: ' + e.message);
    } finally {
      setPivotLoading(false);
    }
  }, [filters, token, username]);

  // ── Načtení detailu objektu ──────────────────────────────────────────────────
  const fetchObjectDetail = useCallback(async (objektTyp, objektId) => {
    const objectKey = `${objektTyp}:${objektId}`;
    if (objectDetail[objectKey]) return; // Už načteno
    setLoadingObjectKey(objectKey);
    try {
      const res = await fetch(`${API_BASE}/audit/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          objekt_typ: objektTyp,
          objekt_id: objektId,
          limit: 50,
          offset: 0,
          ...(filters.od && { od: filters.od }),
          ...(filters.do && { do: filters.do }),
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setObjectDetail(prev => ({ ...prev, [objectKey]: json.data || [] }));
      }
    } catch (e) {
      // non-fatal
    } finally {
      setLoadingObjectKey(null);
    }
  }, [objectDetail, token, username, filters.od, filters.do]);

  const handleObjectRowClick = (row) => {
    const objectKey = row._objectKey;
    if (!objectKey) return;

    if (openObjectKey === objectKey) {
      setOpenObjectKey(null);
    } else {
      setOpenObjectKey(objectKey);
      fetchObjectDetail(row.objekt_typ, row.objekt_id);
    }
  };

  const fetchTimelineBatchDetail = useCallback(async (batchId) => {
    if (!batchId) return;
    if (timelineBatchDetail[batchId]) return;

    setLoadingTimelineBatchId(batchId);
    try {
      const res = await fetch(`${API_BASE}/audit/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, batch_id: batchId }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setTimelineBatchDetail(prev => ({ ...prev, [batchId]: json.data || {} }));
      }
    } catch (e) {
      // non-fatal
    } finally {
      setLoadingTimelineBatchId(null);
    }
  }, [timelineBatchDetail, token, username]);

  const handleTimelineRowClick = useCallback((row) => {
    if (!row?.batch_id) return;
    if (openTimelineBatchId === row.batch_id) {
      setOpenTimelineBatchId(null);
    } else {
      setOpenTimelineBatchId(row.batch_id);
      fetchTimelineBatchDetail(row.batch_id);
    }
  }, [openTimelineBatchId, fetchTimelineBatchDetail]);

  const handleSearch = () => {
    setOpenObjectKey(null);
    setOpenTimelineBatchId(null);
    if (viewMode === 'objekt') {
      fetchHistory(0, 'objekt');
    } else if (viewMode === 'timeline') {
      fetchHistory(0, 'timeline');
    } else if (viewMode === 'pivot' || viewMode === 'vizual') {
      fetchPivotData();
    }
  };

  const handleResetFilters = useCallback(() => {
    setOpenObjectKey(null);
    setOpenTimelineBatchId(null);
    setFilters(DEFAULT_FILTERS);
    setShowNoChangeActions(false);
    setTimelineOffset(0);
    setObjectOffset(0);
    setTimelineSearched(false);
    setObjectSearched(false);
    setPivotRows([]);
    setPivotTotal(0);
    setError(null);
    setPivotError(null);
  }, []);

  useEffect(() => {
    if (viewMode === 'objekt' && !objectSearched && !loading) {
      fetchHistory(objectOffset, 'objekt');
    }
    if (viewMode === 'timeline' && !timelineSearched && !loading) {
      fetchHistory(timelineOffset, 'timeline');
    }
  }, [
    viewMode,
    objectSearched,
    timelineSearched,
    loading,
    fetchHistory,
    objectOffset,
    timelineOffset,
  ]);

  useEffect(() => {
    if ((viewMode === 'pivot' || viewMode === 'vizual') && pivotRows.length === 0 && !pivotLoading) {
      fetchPivotData();
    }
  }, [viewMode, pivotRows.length, pivotLoading, fetchPivotData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const data = {
      filters,
      viewMode,
      pivotConfig,
      showNoChangeActions,
      timelineOffset,
      objectOffset,
      offset: timelineOffset,
      limit,
    };
    try {
      window.localStorage.setItem(AUDIT_UI_STATE_KEY, JSON.stringify(data));
    } catch {
      // non-fatal
    }
  }, [filters, viewMode, pivotConfig, showNoChangeActions, timelineOffset, objectOffset, limit]);

  const handleRefreshCurrentView = useCallback(() => {
    setOpenObjectKey(null);
    setOpenTimelineBatchId(null);
    if (viewMode === 'pivot' || viewMode === 'vizual') {
      fetchPivotData();
    } else if (viewMode === 'objekt') {
      fetchHistory(objectOffset, 'objekt');
    } else {
      fetchHistory(timelineOffset, 'timeline');
    }
  }, [viewMode, fetchPivotData, fetchHistory, objectOffset, timelineOffset]);

  const handleObjectValueClick = useCallback((event, row) => {
    event.stopPropagation();
    const target = getObjectEditTarget(row);
    if (!target) return;
    navigate(target.path, { state: target.state });
  }, [navigate]);

  const formatAuditValueResolved = useCallback((fieldName, value) => {
    const fieldKey = String(fieldName || '').trim().toLowerCase();

    const renderMappedCodes = (rawValue, dictionary) => {
      if (rawValue === null || rawValue === undefined) return null;
      const raw = String(rawValue).trim();
      if (!raw) return null;

      let codes = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          codes = parsed.map((x) => String(x).trim()).filter(Boolean);
        } else if (parsed !== null && parsed !== undefined) {
          codes = [String(parsed).trim()].filter(Boolean);
        }
      } catch {
        const scalar = parseAuditScalarValue(raw);
        codes = String(scalar || raw).split(',').map((x) => x.trim()).filter(Boolean);
      }

      if (!codes.length) return null;

      const labels = codes.map((code) => {
        const label = dictionary?.[code];
        return label ? `${label} (${code})` : code;
      });

      return <span>{labels.join(', ')}</span>;
    };

    if (WORKFLOW_FIELDS.has(fieldKey)) {
      const rendered = renderMappedCodes(value, Object.fromEntries(
        Object.entries(workflowMap || {}).map(([code, item]) => [code, item?.nazev || code])
      ));
      if (rendered) return rendered;
      return formatAuditValue(value);
    }

    if (STREDISKA_FIELDS.has(fieldKey)) {
      const rendered = renderMappedCodes(value, strediskaMap);
      if (rendered) return rendered;
      return formatAuditValue(value);
    }

    if (INVOICE_TYPE_FIELDS.has(fieldKey)) {
      const rendered = renderMappedCodes(value, invoiceTypesMap);
      if (rendered) return rendered;
      return formatAuditValue(value);
    }

    if (FAKTURA_TYP_FIELDS.has(fieldKey)) {
      const rendered = renderMappedCodes(value, fakturaTypMap);
      if (rendered) return rendered;
      return formatAuditValue(value);
    }

    if (VECNA_SPRAVNOST_FIELDS.has(fieldKey)) {
      const scalar = parseAuditScalarValue(value);
      if (!scalar) {
        return formatAuditValue(value);
      }

      const numeric = Number(String(scalar).trim());
      if (Number.isInteger(numeric) && Object.prototype.hasOwnProperty.call(VECNA_SPRAVNOST_LABELS, numeric)) {
        return (
          <span>
            <strong>{VECNA_SPRAVNOST_LABELS[numeric]}</strong>
            {' '}
            <span style={{ color: '#64748b' }}>({numeric})</span>
          </span>
        );
      }

      return formatAuditValue(value);
    }

    if (isAuditCurrencyField(fieldKey)) {
      const scalar = parseAuditScalarValue(value);
      if (!scalar) {
        return formatAuditValue(value);
      }

      const formatted = formatCzkValue(scalar);
      if (formatted) {
        return <span>{formatted}</span>;
      }

      return formatAuditValue(value);
    }

    if (!USER_ID_AUDIT_FIELDS.has(fieldKey)) {
      if (isAuditDateField(fieldKey)) {
        const dateScalar = parseAuditScalarValue(value);
        if (dateScalar) {
          return <span>{formatAuditDateScalar(dateScalar)}</span>;
        }
      }
      return formatAuditValue(value);
    }

    const scalar = parseAuditScalarValue(value);
    if (!scalar) {
      return formatAuditValue(value);
    }

    const idText = String(scalar).trim();
    if (!/^\d+$/.test(idText)) {
      return formatAuditValue(value);
    }

    const userInfo = auditUsersMap[idText];
    if (!userInfo) {
      return <span>{idText}</span>;
    }

    return (
      <span>
        <strong>{userInfo.displayName}</strong>
        {' '}
        <span style={{ color: '#64748b' }}>({idText})</span>
      </span>
    );
  }, [auditUsersMap, workflowMap, strediskaMap, invoiceTypesMap, fakturaTypMap]);

  const activeTotal = viewMode === 'objekt' ? objectTotal : timelineTotal;
  const activeOffset = viewMode === 'objekt' ? objectOffset : timelineOffset;
  const activeSearched = viewMode === 'objekt' ? objectSearched : timelineSearched;

  const auditRelationRows = useMemo(() => ([...objectRows, ...timelineRows, ...pivotRows]), [objectRows, timelineRows, pivotRows]);

  const orderLabelById = useMemo(() => {
    const map = {};
    auditRelationRows.forEach((row) => {
      if (String(row?.objekt_typ || '').toUpperCase() !== 'OBJEDNAVKA') return;
      const objectId = String(row?.objekt_id || '').trim();
      if (!objectId) return;
      if (!map[objectId]) {
        map[objectId] = getAuditObjectDisplayLabel(row);
      }
    });
    return map;
  }, [auditRelationRows]);

  const invoiceLabelsByOrderId = useMemo(() => {
    const map = new Map();
    auditRelationRows.forEach((row) => {
      if (String(row?.objekt_typ || '').toUpperCase() !== 'FAKTURA') return;
      const orderId = String(row?.faktura_objednavka_id || '').trim();
      if (!orderId) return;
      const current = map.get(orderId) || [];
      const label = `${getAuditObjectDisplayLabel(row)} (#${row?.objekt_id || '—'})`;
      if (!current.includes(label)) {
        current.push(label);
      }
      map.set(orderId, current);
    });
    return map;
  }, [auditRelationRows]);

  const getRelatedEntityText = useCallback((row) => {
    const type = String(row?.objekt_typ || '').toUpperCase();
    if (type === 'FAKTURA') {
      const orderId = String(row?.faktura_objednavka_id || '').trim();
      if (!orderId) return '';
      const orderLabel = orderLabelById[orderId] || `OBJ #${orderId}`;
      return `Navázáno na ${orderLabel}`;
    }

    if (type === 'OBJEDNAVKA') {
      const orderId = String(row?.objekt_id || '').trim();
      if (!orderId) return '';
      const invoices = invoiceLabelsByOrderId.get(orderId) || [];
      if (!invoices.length) return '';
      const preview = invoices.slice(0, 2).join(', ');
      const suffix = invoices.length > 2 ? ` +${invoices.length - 2}` : '';
      return `Související FA: ${preview}${suffix}`;
    }

    return '';
  }, [orderLabelById, invoiceLabelsByOrderId]);

  const visibleObjectRows = useMemo(() => (
    objectRows.filter((row) => showNoChangeActions || !isAuditActionWithoutValueChanges(row))
  ), [objectRows, showNoChangeActions]);

  const visibleTimelineRows = useMemo(() => (
    timelineRows.filter((row) => showNoChangeActions || !isAuditActionWithoutValueChanges(row))
  ), [timelineRows, showNoChangeActions]);

  const filteredPivotRows = useMemo(() => (
    pivotRows.filter((row) => showNoChangeActions || !isAuditActionWithoutValueChanges(row))
  ), [pivotRows, showNoChangeActions]);

  const totalPages = Math.ceil(activeTotal / limit);
  const currentPage = Math.floor(activeOffset / limit) + 1;
  const displayTotalPages = viewMode === 'objekt' ? 1 : Math.max(1, totalPages);
  const displayCurrentPage = viewMode === 'objekt' ? 1 : currentPage;

  const groupedRows = useMemo(() => {
    const groups = new Map();

    objectRows.forEach((row) => {
      const objectKey = getAuditObjectGroupKey(row);
      if (!groups.has(objectKey)) {
        groups.set(objectKey, {
          objectKey,
          rowsForObject: [row],
          representative: row,
          count: 1,
        });
        return;
      }

      const group = groups.get(objectKey);
      group.rowsForObject.push(row);
      group.count += 1;
      if (isRowNewerThan(row, group.representative)) {
        group.representative = row;
      }
    });

    return Array.from(groups.values()).map((group) => {
      const visibleRows = showNoChangeActions
        ? group.rowsForObject
        : group.rowsForObject.filter((r) => !isAuditActionWithoutValueChanges(r));

      const representative = visibleRows[0] || group.representative;
      const visibleCount = visibleRows.length;
      const totalCount = group.count;
      const hiddenOnly = !showNoChangeActions && visibleCount === 0;

      return {
        ...representative,
        zmen_count: visibleCount,
        zmen_count_total: totalCount,
        _hiddenOnly: hiddenOnly,
        pole: representative?.pole || '',
        _grouped: true,
        _objectKey: group.objectKey,
        _objectValueLabel: buildObjectValueLabel(group.rowsForObject, representative),
      };
    });
  }, [objectRows, showNoChangeActions]);

  const hiddenOnlyObjectCount = useMemo(() => (
    groupedRows.filter((r) => r._hiddenOnly).length
  ), [groupedRows]);

  const displayRows = useMemo(() => (
    viewMode === 'objekt' ? groupedRows : visibleTimelineRows
  ), [viewMode, groupedRows, visibleTimelineRows]);

  const pivotMatrix = useMemo(() => {
    if (!filteredPivotRows.length) {
      return { rowKeys: [], colKeys: [], matrix: {} };
    }

    const getDimValue = (row, dim) => {
      switch (dim) {
        case 'uzivatel':
          return row.username || row.uzivatel || 'nezname';
        case 'role':
          return row.role_snapshot || 'bez-role';
        case 'objekt_typ':
          return row.objekt_typ || 'neznamy-objekt';
        case 'endpoint':
          return row.endpoint || 'neznamy-endpoint';
        case 'akce_typ':
          return normalizeAuditActionType(row.akce_typ, row) || 'NEZNAMY';
        case 'den':
          return normalizeDateString(row.dt_akce) || 'nezname-datum';
        case 'tyden':
          return isoWeekKey(row.dt_akce);
        case 'mesic':
          return monthKey(row.dt_akce) || 'neznamy-mesic';
        default:
          return 'n/a';
      }
    };

    const ensureCell = (matrix, rKey, cKey) => {
      if (!matrix[rKey]) matrix[rKey] = {};
      if (!matrix[rKey][cKey]) {
        matrix[rKey][cKey] = {
          count: 0,
          objects: new Set(),
          batches: new Set(),
          unlock: 0,
          fieldChanges: 0,
        };
      }
      return matrix[rKey][cKey];
    };

    const matrix = {};
    const rowSet = new Set();
    const colSet = new Set();

    filteredPivotRows.forEach((row) => {
      const rKey = getDimValue(row, pivotConfig.rowDim);
      const cKey = getDimValue(row, pivotConfig.colDim);
      rowSet.add(rKey);
      colSet.add(cKey);

      const cell = ensureCell(matrix, rKey, cKey);
      cell.count += 1;
      cell.objects.add(`${row.objekt_typ || ''}:${row.objekt_id || ''}`);
      cell.batches.add(row.batch_id || `id-${row.id}`);
      if (normalizeAuditActionType(row.akce_typ, row) === 'UNLOCK') cell.unlock += 1;
      if (row.pole) cell.fieldChanges += 1;
    });

    const rowKeys = Array.from(rowSet).sort();
    const colKeys = Array.from(colSet).sort();

    return { rowKeys, colKeys, matrix };
  }, [filteredPivotRows, pivotConfig]);

  const vizStats = useMemo(() => {
    const rows = filteredPivotRows || [];
    if (!rows.length) {
      return {
        totalActions: 0,
        uniqueUsers: 0,
        uniqueObjects: 0,
        riskyActions: 0,
        actionBars: [],
        topUsers: [],
        topObjects: [],
        trend: [],
        riskItems: [],
      };
    }

    const byAction = new Map();
    const byUser = new Map();
    const byObject = new Map();
    const byDay = new Map();
    const rowsByBatch = new Map();
    const uniqueUsers = new Set();
    const uniqueObjects = new Set();
    const riskItems = [];
    let riskyActions = 0;

    rows.forEach((row) => {
      const batchId = String(row?.batch_id || '').trim();
      if (!batchId) return;
      if (!rowsByBatch.has(batchId)) rowsByBatch.set(batchId, []);
      rowsByBatch.get(batchId).push(row);
    });

    rows.forEach((r) => {
      const action = normalizeAuditActionType(r?.akce_typ, r) || 'NEZNAMY';

      const user = String(r?.username || r?.uzivatel || 'neznamy');
      uniqueUsers.add(user);
      byUser.set(user, (byUser.get(user) || 0) + 1);

      const objectKey = `${r?.objekt_typ || 'OBJ'}:${r?.objekt_id || '0'}`;
      uniqueObjects.add(objectKey);
      const relatedText = getRelatedEntityText(r);
      const objectDisplay = getAuditObjectDisplayLabel(r);
      byObject.set(objectKey, {
        count: (byObject.get(objectKey)?.count || 0) + 1,
        label: relatedText ? `${objectDisplay} · ${relatedText}` : objectDisplay,
      });

      const day = normalizeDateString(r?.dt_akce) || 'nezname';
      byDay.set(day, (byDay.get(day) || 0) + 1);

      const endpoint = String(r?.endpoint || '').toLowerCase();
      const note = String(r?.poznamka || '').toLowerCase();
      const isBlockUnlock = action === 'UNLOCK'
        && (endpoint === 'order-v2/update' || note.includes('odemčení bloku'));
      const unlockBlockName = isBlockUnlock ? extractUnlockBlockName(r?.poznamka) : '';

      const fieldKey = String(r?.pole || '').trim().toLowerCase();
      const oldScalar = parseAuditScalarValue(r?.stara_hodnota);
      const newScalar = parseAuditScalarValue(r?.nova_hodnota);
      const hasOldValue = oldScalar !== '';
      const hasNewValue = newScalar !== '';
      const valuesDiffer = oldScalar !== newScalar;
      const isUpdateWithValueChange = action === 'UPDATE' && hasOldValue && hasNewValue && valuesDiffer;
      const isUpdateValueAddition = action === 'UPDATE' && !hasOldValue && hasNewValue;
      const isUpdateValueRemoval = action === 'UPDATE' && hasOldValue && !hasNewValue;

      const actionLabel = action === 'UPDATE'
        ? (isUpdateWithValueChange ? 'ÚPRAVA (se změnou)' : 'ÚPRAVA (beze změny)')
        : (action === 'UNLOCK'
          ? getActionBadgeLabel(action, { endpoint: r?.endpoint })
          : getActionBadgeLabel(action, r));
      const actionIsRiskType = isBlockUnlock || isUpdateWithValueChange || action === 'DELETE' || action === 'STORNO' || action === 'CREATE' || action === 'REJECT' || action === 'POSTPONE';
      const actionMeta = byAction.get(actionLabel) || { count: 0, risky: false, maxSeverity: 0 };
      actionMeta.count += 1;
      actionMeta.risky = actionMeta.risky || actionIsRiskType;
      byAction.set(actionLabel, actionMeta);

      const oldAmount = parseNumericScalar(oldScalar);
      const newAmount = parseNumericScalar(newScalar);
      const isAmountField = isAuditCurrencyField(fieldKey);
      const amountChanged = isAmountField
        && oldAmount !== null
        && newAmount !== null
        && Math.abs(oldAmount - newAmount) > 0.000001;

      const isVecnaField = fieldKey === 'vecna_spravnost_potvrzeno' || fieldKey === 'potvrzeni_vecne_spravnosti';
      const oldVecna = Number(String(oldScalar || '').trim());
      const newVecna = Number(String(newScalar || '').trim());
      const isVecnaCanceled = isVecnaField && oldVecna === 1 && newVecna === 0;
      const isVecnaRejected = isVecnaField && oldVecna === 1 && newVecna === 2;

      const isVecnaUserUnset = fieldKey === 'potvrdil_vecnou_spravnost_id'
        && String(oldScalar || '').trim() !== ''
        && String(newScalar || '').trim() === '';

      let severity = 0;
      const reasons = [];

      if (action === 'CREATE') { severity += 1; reasons.push('Vytvoření záznamu'); }

      if (action === 'DELETE') {
        const deleteNote = String(r?.poznamka || '').toLowerCase();
        severity += deleteNote.includes('hard delete') ? 4 : 3;
        reasons.push(deleteNote.includes('hard delete') ? 'Tvrdé smazání záznamu' : 'Smazání záznamu');
      }

      if (action === 'STORNO') {
        severity += 2;
        reasons.push('Storno objednávky');
      }

      if (action === 'REJECT') severity += 2;
      if (action === 'REJECT') reasons.push('Zamítnutí');

      if (action === 'POSTPONE') severity += 1;
      if (action === 'POSTPONE') reasons.push('Odložení / čeká se');

      if (isUpdateWithValueChange) severity += 1;
      if (isUpdateWithValueChange) reasons.push('Úprava se změnou hodnoty');

      if (isUpdateValueRemoval) severity += 1;
      if (isUpdateValueRemoval) reasons.push('Odstranění původní hodnoty');

      if (isBlockUnlock) severity += 4;
      if (isBlockUnlock) reasons.push('Odemčení bloku');

      if (amountChanged) {
        severity += 3;
        const fromText = oldAmount !== null ? formatCzkValue(oldAmount) : '—';
        const toText = newAmount !== null ? formatCzkValue(newAmount) : '—';
        reasons.push(`Změna částky: ${fromText} -> ${toText}`);
      }

      if (isVecnaCanceled) {
        severity += 3;
        reasons.push('Zrušení věcné správnosti (1 -> 0)');
      }

      if (isVecnaRejected) {
        severity += 3;
        reasons.push('Zamítnutí věcné správnosti (1 -> 2)');
      }

      if (isVecnaUserUnset) {
        severity += 2;
        reasons.push('Odstraněn potvrzující uživatel věcné správnosti');
      }

      const pole = String(r?.pole || '').toLowerCase();
      const shouldApplySensitiveFieldWeight = isUpdateWithValueChange
        || isUpdateValueRemoval
        || isBlockUnlock
        || action === 'DELETE'
        || action === 'STORNO'
        || action === 'REJECT'
        || action === 'POSTPONE'
        || amountChanged
        || isVecnaCanceled
        || isVecnaRejected
        || isVecnaUserUnset;
      if (shouldApplySensitiveFieldWeight && (pole.includes('max_cena') || pole.includes('vecna_spravnost') || pole.includes('fakturant'))) {
        severity += 1;
        reasons.push('Citlivé pole');
      }

      const dtText = String(r?.dt_akce || '');
      const dt = new Date(dtText.includes('T') ? dtText : dtText.replace(' ', 'T'));
      if (severity > 0 && !Number.isNaN(dt.getTime())) {
        const h = dt.getHours();
        if (h < 6 || h >= 20) severity += 1;
      }

      if (actionMeta) {
        actionMeta.maxSeverity = Math.max(actionMeta.maxSeverity || 0, severity);
      }

      if (severity > 0) {
        riskyActions += 1;

        let unlockImpact = null;
        if (isBlockUnlock) {
          const batchId = String(r?.batch_id || '').trim();
          const sourceRows = batchId ? (rowsByBatch.get(batchId) || []) : [];
          const relatedUpdates = sourceRows.filter((x) => (
            String(x?.akce_typ || '').toUpperCase() === 'UPDATE'
            && String(x?.id || '') !== String(r?.id || '')
          ));

          const changedFields = Array.from(new Set(
            relatedUpdates
              .map((x) => String(x?.pole || '').trim())
              .filter(Boolean)
          ));

          const workflowChanges = relatedUpdates
            .filter((x) => WORKFLOW_FIELDS.has(String(x?.pole || '').trim().toLowerCase()))
            .map((x) => ({
              field: String(x?.pole || '').trim(),
              oldValueRaw: x?.stara_hodnota,
              newValueRaw: x?.nova_hodnota,
            }));

          unlockImpact = {
            blockName: unlockBlockName,
            relatedCount: relatedUpdates.length,
            changedFields,
            workflowChanges,
          };
        }

        const tone = severity >= 6
          ? 'critical'
          : severity >= 4
            ? 'high'
            : severity >= 2
              ? 'medium'
              : 'low';
        riskItems.push({
          severity,
          tone,
          action,
          endpoint: r?.endpoint || '',
          user,
          objectLabel: relatedText ? `${objectDisplay} · ${relatedText}` : objectDisplay,
          dt: r?.dt_akce,
          pole: r?.pole || '',
          oldValueRaw: isUpdateWithValueChange || isUpdateValueRemoval ? r?.stara_hodnota : '',
          newValueRaw: isUpdateWithValueChange || isUpdateValueRemoval ? r?.nova_hodnota : '',
          unlockImpact,
          note: String(r?.poznamka || ''),
          reason: reasons.filter(Boolean).join(' · '),
        });
      }
    });

    const toSortedBars = (map, mapper) => Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(mapper);

    const actionBars = Array.from(byAction.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([label, meta]) => {
        let tone = 'normal';
        if (meta.risky) {
          if ((meta.maxSeverity || 0) >= 6) tone = 'critical';
          else if ((meta.maxSeverity || 0) >= 4) tone = 'high';
          else if ((meta.maxSeverity || 0) >= 2) tone = 'medium';
          else tone = 'low';
        }
        return { label, value: meta.count, risky: meta.risky, tone };
      });
    const topUsers = toSortedBars(byUser, ([label, value]) => ({ label, value }));
    const topObjects = Array.from(byObject.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([key, info]) => ({ label: info.label || key, value: info.count }));

    const trend = Array.from(byDay.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .slice(-14)
      .map(([day, value]) => ({ day, value }));

    const riskTop = riskItems
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 10);

    return {
      totalActions: rows.length,
      uniqueUsers: uniqueUsers.size,
      uniqueObjects: uniqueObjects.size,
      riskyActions,
      actionBars,
      topUsers,
      topObjects,
      trend,
      riskItems: riskTop,
    };
  }, [filteredPivotRows, getRelatedEntityText]);

  const getPivotCellMetric = useCallback((cell) => {
    if (!cell) return 0;
    switch (pivotConfig.metric) {
      case 'pocet_objektu':
        return cell.objects.size;
      case 'pocet_batchu':
        return cell.batches.size;
      case 'pocet_unlocku':
        return cell.unlock;
      case 'pocet_zmen_poli':
        return cell.fieldChanges;
      case 'pocet_akci':
      default:
        return cell.count;
    }
  }, [pivotConfig.metric]);

  const exportPivotCsv = useCallback(() => {
    if (!pivotMatrix.rowKeys.length || !pivotMatrix.colKeys.length) return;

    const header = [
      PIVOT_ROW_DIMENSIONS.find(d => d.value === pivotConfig.rowDim)?.label || 'Řádky',
      ...pivotMatrix.colKeys,
      'Celkem',
    ];

    const lines = [header.map(csvEscape).join(';')];

    pivotMatrix.rowKeys.forEach((rKey) => {
      let rowTotal = 0;
      const values = pivotMatrix.colKeys.map((cKey) => {
        const metric = getPivotCellMetric(pivotMatrix.matrix[rKey]?.[cKey]);
        rowTotal += metric;
        return metric;
      });
      lines.push([rKey, ...values, rowTotal].map(csvEscape).join(';'));
    });

    const colTotals = pivotMatrix.colKeys.map((cKey) => (
      pivotMatrix.rowKeys.reduce((acc, rKey) => acc + getPivotCellMetric(pivotMatrix.matrix[rKey]?.[cKey]), 0)
    ));
    const grandTotal = colTotals.reduce((a, b) => a + b, 0);
    lines.push(['Celkem', ...colTotals, grandTotal].map(csvEscape).join(';'));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-kontingenční-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [pivotMatrix, pivotConfig, getPivotCellMetric]);

  return (
    <PageWrapper>
      <ModuleHeader>
        <ModuleTitle>
          <FontAwesomeIcon icon={faClipboardList} />
          Audit log systému
        </ModuleTitle>
        <HeaderActions>
          <RefreshBtn
            type="button"
            onClick={handleRefreshCurrentView}
            disabled={loading || pivotLoading}
            title="Znovu načíst aktuální pohled"
          >
            <FontAwesomeIcon icon={faArrowsRotate} spin={loading || pivotLoading} />
            Aktualizovat
          </RefreshBtn>
        </HeaderActions>
      </ModuleHeader>

      <FiltersBar>
        <FilterGroup>
          <label>Typ objektu</label>
          <select value={filters.objekt_typ} onChange={e => setFilters(f => ({ ...f, objekt_typ: e.target.value }))}>
            {OBJEKT_TYPY.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FilterGroup>

        <FilterGroup style={{ minWidth: 280 }}>
          <label>Fulltext</label>
          <input
            type="text"
            placeholder="Uživatel, č. objednávky/faktury, akce, endpoint, pole, hodnota..."
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
          />
        </FilterGroup>

        <FilterGroup>
          <label>Typ akce</label>
          <select value={filters.akce_typ} onChange={e => setFilters(f => ({ ...f, akce_typ: e.target.value }))}>
            {AKCE_TYPY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </FilterGroup>

        <FilterGroup style={{ minWidth: 160 }}>
          <label>Od</label>
          <DatePicker
            fieldName="audit_od"
            value={filters.od}
            onChange={(value) => setFilters(f => ({ ...f, od: value || '' }))}
            placeholder="Vyberte datum"
          />
        </FilterGroup>

        <FilterGroup style={{ minWidth: 160 }}>
          <label>Do</label>
          <DatePicker
            fieldName="audit_do"
            value={filters.do}
            onChange={(value) => setFilters(f => ({ ...f, do: value || '' }))}
            placeholder="Vyberte datum"
          />
        </FilterGroup>

        <FilterGroup style={{ minWidth: 210 }}>
          <label>Akce beze změn</label>
          <select
            value={showNoChangeActions ? 'yes' : 'no'}
            onChange={(e) => setShowNoChangeActions(e.target.value === 'yes')}
          >
            <option value="no">Ne (skrýt)</option>
            <option value="yes">Ano (zobrazit)</option>
          </select>
        </FilterGroup>

        <SearchBtn onClick={handleSearch} disabled={loading}>
          <FontAwesomeIcon icon={faSearch} />
          {loading ? 'Načítám...' : 'Vyhledat'}
        </SearchBtn>

        <ResetFiltersBtn
          type="button"
          onClick={handleResetFilters}
          disabled={loading || pivotLoading}
          title="Vymazat všechny filtry"
        >
          Zrušit filtr
        </ResetFiltersBtn>
      </FiltersBar>

      <ViewSwitchBar>
        {VIEW_MODES.map((mode) => (
          <ViewModeButton
            key={mode.value}
            $active={viewMode === mode.value}
            onClick={() => {
              setOpenObjectKey(null);
              setOpenTimelineBatchId(null);
              setViewMode(mode.value);
            }}
          >
            <FontAwesomeIcon icon={mode.icon} />
            {mode.label}
          </ViewModeButton>
        ))}
      </ViewSwitchBar>

      {viewMode === 'pivot' && (
        <>
          <PivotPanel>
            <PivotGroup>
              <label>Řádky</label>
              <select
                value={pivotConfig.rowDim}
                onChange={(e) => setPivotConfig((prev) => ({ ...prev, rowDim: e.target.value }))}
              >
                {PIVOT_ROW_DIMENSIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </PivotGroup>

            <PivotGroup>
              <label>Sloupce</label>
              <select
                value={pivotConfig.colDim}
                onChange={(e) => setPivotConfig((prev) => ({ ...prev, colDim: e.target.value }))}
              >
                {PIVOT_COL_DIMENSIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </PivotGroup>

            <PivotGroup>
              <label>Metrika</label>
              <select
                value={pivotConfig.metric}
                onChange={(e) => setPivotConfig((prev) => ({ ...prev, metric: e.target.value }))}
              >
                {PIVOT_METRICS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </PivotGroup>

            <SearchBtn onClick={fetchPivotData} disabled={pivotLoading}>
              <FontAwesomeIcon icon={faSearch} />
              {pivotLoading ? 'Načítám...' : 'Obnovit kontingenci'}
            </SearchBtn>

            <SearchBtn onClick={exportPivotCsv} disabled={pivotLoading || !pivotMatrix.rowKeys.length}>
              <FontAwesomeIcon icon={faFileCsv} />
              Export CSV
            </SearchBtn>
          </PivotPanel>

          <PivotMeta>
            Kontingenční pohled pracuje s max. {PIVOT_LIMIT} záznamy podle aktuálních filtrů.
            Načteno: {pivotRows.length} z celkem {pivotTotal}.
            {pivotTotal > PIVOT_LIMIT ? ' Zúžte filtry pro přesnější agregaci.' : ''}
          </PivotMeta>
        </>
      )}

      {(error || ((viewMode === 'pivot' || viewMode === 'vizual') && pivotError)) && <ErrorMsg>{error || pivotError}</ErrorMsg>}

      {!error && (
        <>
          {activeSearched && (
            <ResultInfo>
              {viewMode === 'objekt'
                ? `Nalezeno ${groupedRows.length} objektů (ze ${objectTotal} audit záznamů)${hiddenOnlyObjectCount > 0 ? ` · ${hiddenOnlyObjectCount} objektů má jen skryté akce beze změn` : ''}${objectTotal > OBJECT_VIEW_FETCH_LIMIT ? ' · načteno prvních ' + OBJECT_VIEW_FETCH_LIMIT + ' záznamů, pro úplný přehled zúžte filtry' : ''}`
                : viewMode === 'vizual'
                  ? `Audit vizualizace pracuje s max. ${PIVOT_LIMIT} záznamy · načteno ${pivotRows.length} z ${pivotTotal}`
                  : `Nalezeno ${timelineTotal} záznamů · strana ${currentPage} z ${Math.max(1, totalPages)}`}
            </ResultInfo>
          )}

          {viewMode === 'vizual' && (
            <>
              <VizGrid>
                <VizCard>
                  <VizLabel>Celkem akcí</VizLabel>
                  <VizValue>{vizStats.totalActions}</VizValue>
                </VizCard>
                <VizCard>
                  <VizLabel>Aktivní uživatelé</VizLabel>
                  <VizValue>{vizStats.uniqueUsers}</VizValue>
                </VizCard>
                <VizCard>
                  <VizLabel>Zasažené objekty</VizLabel>
                  <VizValue>{vizStats.uniqueObjects}</VizValue>
                </VizCard>
                <VizCard>
                  <VizLabel>Rizikové akce</VizLabel>
                  <VizValue style={{ color: vizStats.riskyActions > 0 ? '#dc2626' : '#16a34a' }}>{vizStats.riskyActions}</VizValue>
                </VizCard>
              </VizGrid>

              <VizPanels>
                <VizPanel>
                  <VizPanelTitle>Aktivita v čase (posledních 14 dní)</VizPanelTitle>
                  <VizBarList>
                    {vizStats.trend.length ? vizStats.trend.map((d) => {
                      const max = Math.max(...vizStats.trend.map((x) => x.value), 1);
                      return (
                        <VizBarRow key={`trend-${d.day}`}>
                          <VizBarLabel>{formatCzDate(d.day)}</VizBarLabel>
                          <VizBarTrack>
                            <VizBarFill $width={(d.value / max) * 100} />
                          </VizBarTrack>
                          <VizBarValue>{d.value}</VizBarValue>
                        </VizBarRow>
                      );
                    }) : (
                      <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Žádná data pro trend.</div>
                    )}
                  </VizBarList>
                </VizPanel>

                <VizPanel>
                  <VizPanelTitle>Akce podle typu</VizPanelTitle>
                  <VizBarList>
                    {vizStats.actionBars.length ? vizStats.actionBars.map((b) => {
                      const max = Math.max(...vizStats.actionBars.map((x) => x.value), 1);
                      return (
                        <VizBarRow key={`act-${b.label}`}>
                          <VizBarLabel>{b.label}</VizBarLabel>
                          <VizBarTrack>
                            <VizBarFill $width={(b.value / max) * 100} $tone={b.tone || 'normal'} />
                          </VizBarTrack>
                          <VizBarValue>{b.value}</VizBarValue>
                        </VizBarRow>
                      );
                    }) : (
                      <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Žádná data.</div>
                    )}
                  </VizBarList>
                </VizPanel>
              </VizPanels>

              <VizPanels>
                <VizPanel>
                  <VizPanelTitle>Top uživatelé</VizPanelTitle>
                  <VizBarList>
                    {vizStats.topUsers.length ? vizStats.topUsers.map((b) => {
                      const max = Math.max(...vizStats.topUsers.map((x) => x.value), 1);
                      return (
                        <VizBarRow key={`usr-${b.label}`}>
                          <VizBarLabel>{b.label}</VizBarLabel>
                          <VizBarTrack>
                            <VizBarFill $width={(b.value / max) * 100} />
                          </VizBarTrack>
                          <VizBarValue>{b.value}</VizBarValue>
                        </VizBarRow>
                      );
                    }) : (
                      <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Žádná data.</div>
                    )}
                  </VizBarList>
                </VizPanel>

                <VizPanel>
                  <VizPanelTitle>Top objekty</VizPanelTitle>
                  <VizBarList>
                    {vizStats.topObjects.length ? vizStats.topObjects.map((b) => {
                      const max = Math.max(...vizStats.topObjects.map((x) => x.value), 1);
                      return (
                        <VizBarRow key={`obj-${b.label}`}>
                          <VizBarLabel>{b.label}</VizBarLabel>
                          <VizBarTrack>
                            <VizBarFill $width={(b.value / max) * 100} />
                          </VizBarTrack>
                          <VizBarValue>{b.value}</VizBarValue>
                        </VizBarRow>
                      );
                    }) : (
                      <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Žádná data.</div>
                    )}
                  </VizBarList>
                </VizPanel>
              </VizPanels>

              <VizPanel style={{ marginBottom: '0.8rem' }}>
                <VizPanelTitle>Rizikové události (Top 10)</VizPanelTitle>
                <VizRiskList>
                  {vizStats.riskItems.length ? vizStats.riskItems.map((r, idx) => (
                    <VizRiskItem key={`risk-${idx}`} $tone={r.tone || 'low'}>
                      <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 700 }}>
                        {getActionBadgeLabel(r.action, { endpoint: r.endpoint })} · {r.objectLabel}
                      </div>
                      {(r.oldValueRaw || r.newValueRaw) ? (
                        <div style={{ marginTop: 2, fontSize: '0.78rem' }}>
                          <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                            {formatAuditValueResolved(r.pole, r.oldValueRaw) || '—'}
                          </span>
                          <span style={{ color: '#64748b', margin: '0 6px' }}>→</span>
                          <span style={{ color: '#166534', fontWeight: 700 }}>
                            {formatAuditValueResolved(r.pole, r.newValueRaw) || '—'}
                          </span>
                        </div>
                      ) : (!r.oldValueRaw && !r.newValueRaw && r.note) ? (
                        <div style={{ marginTop: 2, fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                          {r.note}
                        </div>
                      ) : null}
                      {r.unlockImpact ? (
                        <div style={{ marginTop: 4, fontSize: '0.77rem', color: '#334155' }}>
                          {r.unlockImpact.blockName ? (
                            <div>
                              <strong>Odemčený blok:</strong> {r.unlockImpact.blockName}
                            </div>
                          ) : null}
                          {r.unlockImpact.changedFields?.length ? (
                            <div>
                              <strong>Změněná část objednávky:</strong>{' '}
                              {r.unlockImpact.changedFields.slice(0, 3).map((f, fi) => (
                                <React.Fragment key={`${f}-${fi}`}>
                                  {fi > 0 ? ', ' : ''}
                                  {formatAuditFieldName(f)}
                                </React.Fragment>
                              ))}
                              {r.unlockImpact.changedFields.length > 3 ? ` +${r.unlockImpact.changedFields.length - 3} další` : ''}
                            </div>
                          ) : (
                            <div style={{ color: '#64748b' }}>Nenalezeny navazující UPDATE změny ve stejném batchi.</div>
                          )}
                          {r.unlockImpact.workflowChanges?.length ? (
                            <div>
                              <strong>Workflow:</strong>{' '}
                              {r.unlockImpact.workflowChanges.slice(0, 2).map((w, wi) => (
                                <React.Fragment key={`${w.field}-${wi}`}>
                                  {wi > 0 ? ' · ' : ''}
                                  {formatAuditValueResolved(w.field, w.oldValueRaw) || '—'}
                                  {' → '}
                                  {formatAuditValueResolved(w.field, w.newValueRaw) || '—'}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <VizRiskMeta>
                        {r.user} · {formatCzDateTime(r.dt)}{r.pole ? ` · pole: ${r.pole}` : ''}
                        {r.reason ? ` · ${r.reason}` : ''}
                      </VizRiskMeta>
                    </VizRiskItem>
                  )) : (
                    <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Žádné rizikové události pro aktuální filtr.</div>
                  )}
                </VizRiskList>
              </VizPanel>
            </>
          )}

          {viewMode !== 'vizual' && (
          <TableContainer>
            <Table>
              <thead>
                {viewMode !== 'pivot' ? (
                  <tr>
                    <th style={{ width: 36 }}></th>
                    {viewMode === 'objekt' ? (
                      <>
                        <th>Objekt</th>
                        <th>Číslo</th>
                        <th>Uživatel</th>
                        <th>Zástup</th>
                        <th>Akce</th>
                        <th>Pole</th>
                        <th>Endpoint</th>
                        <th>Poslední změna</th>
                      </>
                    ) : (
                      <>
                        <th>Čas</th>
                        <th>Objekt</th>
                        <th>Číslo</th>
                        <th>Uživatel</th>
                        <th>Zástup</th>
                        <th>Akce</th>
                        <th>Pole / Poznámka</th>
                        <th>Endpoint</th>
                      </>
                    )}
                  </tr>
                ) : (
                  <tr>
                    <th>{PIVOT_ROW_DIMENSIONS.find(d => d.value === pivotConfig.rowDim)?.label || 'Řádky'}</th>
                    {pivotMatrix.colKeys.map((cKey) => <th key={`h-${cKey}`}>{cKey}</th>)}
                    <th>Celkem</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {viewMode !== 'pivot' && displayRows.length > 0 ? displayRows.map(row => (
                  <React.Fragment key={viewMode === 'objekt' ? `obj-${row._objectKey}` : `timeline-${row.id}`}>
                      <tr
                        onClick={() => {
                          if (viewMode === 'objekt') {
                            handleObjectRowClick(row);
                          } else if (viewMode === 'timeline' && row.batch_id) {
                            handleTimelineRowClick(row);
                          }
                        }}
                        title={
                          viewMode === 'objekt'
                            ? 'Kliknout pro detail objektu'
                            : (viewMode === 'timeline' && row.batch_id ? 'Kliknout pro detail změn' : undefined)
                        }
                      >
                        <td style={{ width: 36, textAlign: 'center' }}>
                          {viewMode === 'objekt' ? (
                            <ExpandButton
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleObjectRowClick(row);
                              }}
                              title={openObjectKey === row._objectKey ? 'Sbalit detail' : 'Rozbalit detail'}
                            >
                              {openObjectKey === row._objectKey ? '−' : '+'}
                            </ExpandButton>
                          ) : (viewMode === 'timeline' && row.batch_id) ? (
                            <ExpandButton
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTimelineRowClick(row);
                              }}
                              title={openTimelineBatchId === row.batch_id ? 'Sbalit detail změn' : 'Rozbalit detail změn'}
                            >
                              {openTimelineBatchId === row.batch_id ? '−' : '+'}
                            </ExpandButton>
                          ) : null}
                        </td>
                        {viewMode === 'objekt' ? (
                          <>
                            <td>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{getObjectTypeShortLabel(row.objekt_typ)}</span>
                              <span style={{ marginLeft: 4, fontWeight: 700 }}>#{row.objekt_id}</span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', color: '#1e293b', fontWeight: 600 }}>
                              {getObjectEditTarget(row) ? (
                                <ObjectValueLink
                                  type="button"
                                  title="Otevřít editaci záznamu"
                                  $color={getObjectValueAppearance(row).color}
                                  onClick={(e) => handleObjectValueClick(e, row)}
                                >
                                  {row._objectValueLabel || '—'}
                                  {getObjectValueAppearance(row).suffix ? (
                                    <NumberTypeTag $variant={getObjectValueAppearance(row).suffixVariant}>
                                      {getObjectValueAppearance(row).suffix}
                                    </NumberTypeTag>
                                  ) : null}
                                </ObjectValueLink>
                              ) : (row._objectValueLabel || '—')}
                              {getRelatedEntityText(row) ? (
                                <RelatedInfoText>{getRelatedEntityText(row)}</RelatedInfoText>
                              ) : null}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{row.uzivatel || row.username}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.username}</div>
                            </td>
                            <td>
                              {row.zastupovani_kontext ? (
                                <ZastupovaniTag>
                                  <FontAwesomeIcon icon={faUserShield} />
                                  za {row.zastupovani_kontext.zastupovany_jmeno} {row.zastupovani_kontext.zastupovany_prijmeni}
                                </ZastupovaniTag>
                              ) : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td>
                              {row._hiddenOnly ? (
                                <AkceBadge $typ="RESET">SKRYTÉ AKCE</AkceBadge>
                              ) : (
                                <AkceBadge $typ={normalizeAuditActionType(row.akce_typ, row)}>{getActionBadgeLabel(row.akce_typ, row)}</AkceBadge>
                              )}
                            </td>
                            <td style={{ color: '#1e293b' }}>
                              {row._hiddenOnly
                                ? `${row.zmen_count_total} záznamů beze změn (aktuálně skryto)`
                                : `${row.zmen_count} záznamů pro objekt${!showNoChangeActions && row.zmen_count_total > row.zmen_count ? ` (celkem ${row.zmen_count_total})` : ''}`}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.endpoint}</td>
                            <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                              <FontAwesomeIcon icon={faClock} style={{ marginRight: 4, opacity: 0.5 }} />
                              {formatCzDateTime(row.dt_akce)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                              <FontAwesomeIcon icon={faClock} style={{ marginRight: 4, opacity: 0.5 }} />
                              {formatCzDateTime(row.dt_akce)}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{getObjectTypeShortLabel(row.objekt_typ)}</span>
                              <span style={{ marginLeft: 4, fontWeight: 600 }}>#{row.objekt_id}</span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', color: '#1e293b', fontWeight: 600 }}>
                              {getObjectEditTarget(row) ? (
                                <ObjectValueLink
                                  type="button"
                                  title="Otevřít editaci záznamu"
                                  $color={getObjectValueAppearance(row).color}
                                  onClick={(e) => handleObjectValueClick(e, row)}
                                >
                                  {getAuditObjectDisplayLabel(row) || '—'}
                                  {getObjectValueAppearance(row).suffix ? (
                                    <NumberTypeTag $variant={getObjectValueAppearance(row).suffixVariant}>
                                      {getObjectValueAppearance(row).suffix}
                                    </NumberTypeTag>
                                  ) : null}
                                </ObjectValueLink>
                              ) : (getAuditObjectDisplayLabel(row) || '—')}
                              {getRelatedEntityText(row) ? (
                                <RelatedInfoText>{getRelatedEntityText(row)}</RelatedInfoText>
                              ) : null}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{row.uzivatel || row.username}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.username}</div>
                            </td>
                            <td>
                              {row.zastupovani_kontext ? (
                                <ZastupovaniTag>
                                  <FontAwesomeIcon icon={faUserShield} />
                                  za {row.zastupovani_kontext.zastupovany_jmeno} {row.zastupovani_kontext.zastupovany_prijmeni}
                                </ZastupovaniTag>
                              ) : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td><AkceBadge $typ={normalizeAuditActionType(row.akce_typ, row)}>{getActionBadgeLabel(row.akce_typ, row)}</AkceBadge></td>
                            <td style={{ color: row.pole ? '#1e293b' : '#94a3b8' }}>
                              {row.pole ? (
                                <FontAwesomeIcon icon={faTag} style={{ marginRight: 4, opacity: 0.5 }} />
                              ) : null}
                              {row.pole ? formatAuditFieldName(row.pole) : (row.poznamka || <em>—</em>)}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.endpoint}</td>
                          </>
                        )}
                      </tr>

                      {/* Rozbalený detail objektu */}
                      {viewMode === 'objekt' && openObjectKey === row._objectKey && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, background: '#f8fafc' }}>
                            <DetailPanel>
                              {loadingObjectKey === row._objectKey ? (
                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Načítám detail...</div>
                              ) : objectDetail[row._objectKey] ? (
                                <>
                                  <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                    Objekt: <strong>{row.objekt_typ} #{row.objekt_id}</strong>
                                    {' · Číslo: '}
                                    {getObjectEditTarget(row) ? (
                                      <ObjectValueLink
                                        type="button"
                                        title="Otevřít editaci záznamu"
                                        $color={getObjectValueAppearance(row).color}
                                        onClick={(e) => handleObjectValueClick(e, row)}
                                      >
                                        {row._objectValueLabel || '—'}
                                        {getObjectValueAppearance(row).suffix ? (
                                          <NumberTypeTag $variant={getObjectValueAppearance(row).suffixVariant}>
                                            {getObjectValueAppearance(row).suffix}
                                          </NumberTypeTag>
                                        ) : null}
                                      </ObjectValueLink>
                                    ) : (
                                      <strong>{row._objectValueLabel || '—'}</strong>
                                    )}
                                  </div>
                                  <DetailTable>
                                    <thead>
                                      <tr>
                                        <th>Čas</th>
                                        <th>Uživatel</th>
                                        <th>Zástup</th>
                                        <th>Akce</th>
                                        <th>Pole</th>
                                        <th>Původní hodnota</th>
                                        <th>Nová hodnota</th>
                                        <th>Endpoint</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(objectDetail[row._objectKey] || [])
                                        .filter((zm) => showNoChangeActions || !isAuditActionWithoutValueChanges(zm))
                                        .map((zm, i) => (
                                        <tr key={i}>
                                          <td style={{ whiteSpace: 'nowrap' }}>{formatCzDateTime(zm.dt_akce)}</td>
                                          <td>
                                            <div style={{ fontWeight: 600 }}>{zm.uzivatel || zm.username || '—'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{zm.username || '—'}</div>
                                          </td>
                                          <td>
                                            {zm.zastupovani_kontext ? (
                                              <ZastupovaniTag>
                                                <FontAwesomeIcon icon={faUserShield} />
                                                za {zm.zastupovani_kontext.zastupovany_jmeno} {zm.zastupovani_kontext.zastupovany_prijmeni}
                                              </ZastupovaniTag>
                                            ) : <span style={{ color: '#94a3b8' }}>—</span>}
                                          </td>
                                          <td><AkceBadge $typ={normalizeAuditActionType(zm.akce_typ, zm)}>{getActionBadgeLabel(zm.akce_typ, zm)}</AkceBadge></td>
                                          <td>{zm.pole ? formatAuditFieldName(zm.pole) : (zm.poznamka ? <em style={{ color: '#64748b' }}>{zm.poznamka}</em> : <em style={{ color: '#94a3b8' }}>—</em>)}</td>
                                          <td style={{ color: '#b91c1c' }}>{zm.pole ? formatAuditValueResolved(zm.pole, zm.stara_hodnota) : <em style={{ color: '#94a3b8' }}>—</em>}</td>
                                          <td style={{ color: '#166534' }}>{zm.pole ? formatAuditValueResolved(zm.pole, zm.nova_hodnota) : <em style={{ color: '#94a3b8' }}>—</em>}</td>
                                          <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{zm.endpoint || '—'}</td>
                                        </tr>
                                      ))}
                                      {(objectDetail[row._objectKey] || []).filter((zm) => showNoChangeActions || !isAuditActionWithoutValueChanges(zm)).length === 0 ? (
                                        <tr>
                                          <td colSpan={8} style={{ color: '#64748b', fontStyle: 'italic' }}>
                                            Pro tento objekt nejsou při aktuálním filtru viditelné změny (zobrazte Akce beze změn = Ano).
                                          </td>
                                        </tr>
                                      ) : null}
                                    </tbody>
                                  </DetailTable>
                                </>
                              ) : null}
                            </DetailPanel>
                          </td>
                        </tr>
                      )}

                      {/* Rozbalený detail batche v timeline režimu */}
                      {viewMode === 'timeline' && row.batch_id && openTimelineBatchId === row.batch_id && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, background: '#f8fafc' }}>
                            <DetailPanel>
                              {loadingTimelineBatchId === row.batch_id ? (
                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Načítám detail změn...</div>
                              ) : timelineBatchDetail[row.batch_id] ? (
                                <>
                                  <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                    Batch: <code>{row.batch_id}</code>
                                    {timelineBatchDetail[row.batch_id].poznamka && (
                                      <span style={{ marginLeft: 8, color: '#92400e' }}>
                                        ℹ️ {timelineBatchDetail[row.batch_id].poznamka}
                                      </span>
                                    )}
                                  </div>
                                  <DetailTable>
                                    <thead>
                                      <tr>
                                        <th>Pole</th>
                                        <th>Původní hodnota</th>
                                        <th>Nová hodnota</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(timelineBatchDetail[row.batch_id].zmeny || []).map((zm, i) => (
                                        <tr key={i}>
                                          <td style={{ fontWeight: 600 }}>{zm.pole ? formatAuditFieldName(zm.pole) : (zm.poznamka ? <em style={{ color: '#64748b' }}>{zm.poznamka}</em> : <em style={{ color: '#94a3b8' }}>—</em>)}</td>
                                          <td style={{ color: '#dc2626' }}>{zm.pole ? formatAuditValue(zm.stara_hodnota) : <em style={{ color: '#94a3b8' }}>—</em>}</td>
                                          <td style={{ color: '#16a34a' }}>{zm.pole ? formatAuditValue(zm.nova_hodnota) : <em style={{ color: '#94a3b8' }}>—</em>}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </DetailTable>
                                </>
                              ) : null}
                            </DetailPanel>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )) : viewMode === 'pivot' && pivotMatrix.rowKeys.length > 0 ? (
                    <>
                      {pivotMatrix.rowKeys.map((rKey) => {
                        let rowTotal = 0;
                        return (
                          <tr key={`p-${rKey}`}>
                            <td style={{ fontWeight: 600 }}>{rKey}</td>
                            {pivotMatrix.colKeys.map((cKey) => {
                              const metric = getPivotCellMetric(pivotMatrix.matrix[rKey]?.[cKey]);
                              rowTotal += metric;
                              return <td key={`v-${rKey}-${cKey}`}>{metric}</td>;
                            })}
                            <td style={{ fontWeight: 700, color: '#1d4ed8' }}>{rowTotal}</td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td style={{ fontWeight: 700 }}>Celkem</td>
                        {pivotMatrix.colKeys.map((cKey) => {
                          const colTotal = pivotMatrix.rowKeys.reduce((acc, rKey) => (
                            acc + getPivotCellMetric(pivotMatrix.matrix[rKey]?.[cKey])
                          ), 0);
                          return <td key={`t-${cKey}`} style={{ fontWeight: 700 }}>{colTotal}</td>;
                        })}
                        <td style={{ fontWeight: 800, color: '#1d4ed8' }}>
                          {pivotMatrix.colKeys.reduce((acc, cKey) => {
                            const colTotal = pivotMatrix.rowKeys.reduce((sum, rKey) => (
                              sum + getPivotCellMetric(pivotMatrix.matrix[rKey]?.[cKey])
                            ), 0);
                            return acc + colTotal;
                          }, 0)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <EmptyTableCell colSpan={viewMode === 'pivot' ? Math.max(2, pivotMatrix.colKeys.length + 2) : (viewMode === 'objekt' ? 9 : 8)}>
                        {viewMode === 'pivot'
                          ? (pivotLoading ? 'Načítám kontingenční data...' : 'Kontingenční tabulka nemá data pro aktuální filtry.')
                          : (!activeSearched
                            ? 'Načítám poslední auditní záznamy...'
                            : (loading ? 'Načítám data audit logu...' : 'Žádné záznamy nenalezeny pro zadané filtry.'))}
                      </EmptyTableCell>
                    </tr>
                  )}
              </tbody>
            </Table>
          </TableContainer>
          )}

          {viewMode !== 'pivot' && viewMode !== 'vizual' && activeSearched && (
            <PaginationContainer>
              <PaginationInfo>
                {viewMode === 'objekt'
                  ? (groupedRows.length > 0
                    ? `Zobrazeno ${groupedRows.length} objektů · načteno ${objectRows.length} z ${objectTotal} audit záznamů`
                    : 'Žádné objekty')
                  : (timelineTotal > 0
                    ? `Zobrazeno ${timelineOffset + 1}–${Math.min(timelineOffset + limit, timelineTotal)} z ${timelineTotal} záznamů`
                    : 'Žádné záznamy')}
              </PaginationInfo>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Záznamů na stranu:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      const newLimit = Number(e.target.value);
                      setLimit(newLimit);
                      fetchHistory(0, viewMode === 'objekt' ? 'objekt' : 'timeline');
                    }}
                    disabled={viewMode === 'objekt'}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.82rem', background: '#fff', color: '#334155', cursor: 'pointer' }}
                  >
                    {LIMIT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <PaginationControls>
                  <button
                    onClick={() => fetchHistory(0, 'timeline')}
                    disabled={viewMode === 'objekt' || timelineOffset === 0}
                  >
                    « První
                  </button>
                  <button
                    onClick={() => fetchHistory(timelineOffset - limit, 'timeline')}
                    disabled={viewMode === 'objekt' || timelineOffset === 0}
                  >
                    ‹ Předchozí
                  </button>
                    <span>Stránka {displayCurrentPage} z {displayTotalPages}</span>
                  <button
                    onClick={() => fetchHistory(timelineOffset + limit, 'timeline')}
                    disabled={viewMode === 'objekt' || timelineOffset + limit >= timelineTotal}
                  >
                    Další ›
                  </button>
                  <button
                    onClick={() => fetchHistory((displayTotalPages - 1) * limit, 'timeline')}
                    disabled={viewMode === 'objekt' || timelineOffset + limit >= timelineTotal}
                  >
                    Poslední »
                  </button>
                </PaginationControls>
              </div>
            </PaginationContainer>
          )}
        </>
      )}
    </PageWrapper>
  );
};

export default AuditLogPage;
