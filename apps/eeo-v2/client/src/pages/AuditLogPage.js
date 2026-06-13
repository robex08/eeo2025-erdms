import React, { useState, useCallback, useContext, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import {
  faClipboardList, faSearch, faArrowsRotate,
  faUserShield, faClock, faTag, faTable, faStream, faChartBar, faFileCsv
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
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
  { value: 'APPROVE', label: 'Schválení' },
  { value: 'REJECT', label: 'Zamítnutí' },
];

const AKCE_BADGE_LABELS = {
  CREATE: 'VYTVOŘENÍ',
  UPDATE: 'ÚPRAVA',
  DELETE: 'SMAZÁNÍ',
  UNLOCK: 'ODEMČENÍ',
  APPROVE: 'SCHVÁLENÍ',
  REJECT: 'ZAMÍTNUTÍ',
  LOCK: 'UZAMČENÍ',
  RESET: 'RESET',
};

const LIMIT_OPTIONS = [10, 25, 50, 100];
const DEFAULT_LIMIT = 10;
const PIVOT_LIMIT = 1000;
const AUDIT_UI_STATE_KEY = 'eeo.auditLog.uiState.v1';

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
  dt_dokonceni: 'Datum dokončení',
  dokoncil_id: 'Dokončil (uživatel ID)',
  max_cena_s_dph: 'Max. cena s DPH',
  cislo_objednavky: 'Číslo objednávky',
  ev_cislo: 'Evidenční číslo',
  fa_vema_kod: 'VS faktury',
  fa_cislo_vema: 'Číslo faktury',
  vecna_spravnost_potvrzeno: 'Věcná správnost',
  fakturant_id: 'Fakturant',
};

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

function getActionBadgeLabel(actionType, row = null) {
  const key = String(actionType || '').toUpperCase();

  if (key === 'UNLOCK') {
    const endpoint = String(row?.endpoint || '').toLowerCase();
    if (endpoint.includes('/unlock')) {
      return 'ODEMČENÍ OBJEDNÁVKY';
    }
    if (endpoint === 'order-v2/update') {
      return 'ODEMČENÍ BLOKU';
    }
  }

  return AKCE_BADGE_LABELS[key] || key || '—';
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

// ─── Komponenta ───────────────────────────────────────────────────────────────

const AuditLogPage = () => {
  const navigate = useNavigate();
  const { user, token, userDetail } = useContext(AuthContext);
  const persistedState = getPersistedAuditUiState();

  const [filters, setFilters] = useState(() => ({
    objekt_typ: persistedState?.filters?.objekt_typ || '',
    q: persistedState?.filters?.q || '',
    akce_typ: persistedState?.filters?.akce_typ || '',
    od: persistedState?.filters?.od || '',
    do: persistedState?.filters?.do || '',
  }));
  const [rows, setRows] = useState([]);
  const [viewMode, setViewMode] = useState(() => {
    const saved = persistedState?.viewMode;
    return VIEW_MODES.some((m) => m.value === saved) ? saved : 'objekt';
  });
  const [limit, setLimit] = useState(() => {
    const saved = Number(persistedState?.limit || DEFAULT_LIMIT);
    return LIMIT_OPTIONS.includes(saved) ? saved : DEFAULT_LIMIT;
  });
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(() => {
    const saved = Number(persistedState?.offset || 0);
    return Number.isFinite(saved) && saved >= 0 ? saved : 0;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

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

  const username = user?.username || userDetail?.username || '';

  // ── Načtení seznamu ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const body = {
        token,
        username,
        limit,
        offset: newOffset,
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
        setRows(json.data || []);
        setTotal(json.meta?.total || 0);
        setOffset(newOffset);
        setSearched(true);
      } else {
        setError(json.message || 'Chyba při načítání audit logu');
      }
    } catch (e) {
      setError('Síťová chyba: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, token, username]);

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
    fetchHistory(0);
    if (viewMode === 'pivot') {
      fetchPivotData();
    }
  };

  useEffect(() => {
    fetchHistory(offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewMode === 'pivot' && pivotRows.length === 0 && !pivotLoading) {
      fetchPivotData();
    }
  }, [viewMode, pivotRows.length, pivotLoading, fetchPivotData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const data = {
      filters,
      viewMode,
      pivotConfig,
      offset,
      limit,
    };
    try {
      window.localStorage.setItem(AUDIT_UI_STATE_KEY, JSON.stringify(data));
    } catch {
      // non-fatal
    }
  }, [filters, viewMode, pivotConfig, offset, limit]);

  const handleRefreshCurrentView = useCallback(() => {
    setOpenObjectKey(null);
    setOpenTimelineBatchId(null);
    if (viewMode === 'pivot') {
      fetchPivotData();
    } else {
      fetchHistory(offset);
    }
  }, [viewMode, fetchPivotData, fetchHistory, offset]);

  const handleObjectValueClick = useCallback((event, row) => {
    event.stopPropagation();
    const target = getObjectEditTarget(row);
    if (!target) return;
    navigate(target.path, { state: target.state });
  }, [navigate]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const displayTotalPages = viewMode === 'objekt' ? 1 : Math.max(1, totalPages);
  const displayCurrentPage = viewMode === 'objekt' ? 1 : currentPage;

  const groupedRows = useMemo(() => {
    const groups = new Map();

    rows.forEach((row) => {
      const objectKey = `${row.objekt_typ || 'NEZNAMY'}:${row.objekt_id || '0'}`;
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
      const representative = group.representative;
      return {
        ...representative,
        zmen_count: group.count,
        pole: representative?.pole || '',
        _grouped: true,
        _objectKey: group.objectKey,
        _objectValueLabel: buildObjectValueLabel(group.rowsForObject, representative),
      };
    });
  }, [rows]);

  const displayRows = useMemo(() => (
    viewMode === 'objekt' ? groupedRows : rows
  ), [viewMode, groupedRows, rows]);

  const pivotMatrix = useMemo(() => {
    if (!pivotRows.length) {
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
          return row.akce_typ || 'neznamy-typ';
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

    pivotRows.forEach((row) => {
      const rKey = getDimValue(row, pivotConfig.rowDim);
      const cKey = getDimValue(row, pivotConfig.colDim);
      rowSet.add(rKey);
      colSet.add(cKey);

      const cell = ensureCell(matrix, rKey, cKey);
      cell.count += 1;
      cell.objects.add(`${row.objekt_typ || ''}:${row.objekt_id || ''}`);
      cell.batches.add(row.batch_id || `id-${row.id}`);
      if (row.akce_typ === 'UNLOCK') cell.unlock += 1;
      if (row.pole) cell.fieldChanges += 1;
    });

    const rowKeys = Array.from(rowSet).sort();
    const colKeys = Array.from(colSet).sort();

    return { rowKeys, colKeys, matrix };
  }, [pivotRows, pivotConfig]);

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
            placeholder="Uživatel, objekt, endpoint, pole, poznámka..."
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

        <SearchBtn onClick={handleSearch} disabled={loading}>
          <FontAwesomeIcon icon={faSearch} />
          {loading ? 'Načítám...' : 'Vyhledat'}
        </SearchBtn>
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

      {(error || (viewMode === 'pivot' && pivotError)) && <ErrorMsg>{error || pivotError}</ErrorMsg>}

      {!error && (
        <>
          {searched && (
            <ResultInfo>
              {viewMode === 'objekt'
                ? `Nalezeno ${groupedRows.length} objektů (ze ${total} audit záznamů)${total >= limit ? ' · načteno prvních ' + limit + ' záznamů, pro úplný přehled použijte filtry' : ''}`
                : `Nalezeno ${total} záznamů · strana ${currentPage} z ${Math.max(1, totalPages)}`}
            </ResultInfo>
          )}

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
                    <React.Fragment key={row.id}>
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
                            <td><AkceBadge $typ={row.akce_typ}>{getActionBadgeLabel(row.akce_typ, row)}</AkceBadge></td>
                            <td style={{ color: '#1e293b' }}>
                              {row.zmen_count} záznamů pro objekt
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
                                  {row.objekt_hodnota || '—'}
                                  {getObjectValueAppearance(row).suffix ? (
                                    <NumberTypeTag $variant={getObjectValueAppearance(row).suffixVariant}>
                                      {getObjectValueAppearance(row).suffix}
                                    </NumberTypeTag>
                                  ) : null}
                                </ObjectValueLink>
                              ) : (row.objekt_hodnota || '—')}
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
                            <td><AkceBadge $typ={row.akce_typ}>{getActionBadgeLabel(row.akce_typ, row)}</AkceBadge></td>
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
                                      {(objectDetail[row._objectKey] || []).map((zm, i) => (
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
                                          <td><AkceBadge $typ={zm.akce_typ}>{getActionBadgeLabel(zm.akce_typ, zm)}</AkceBadge></td>
                                          <td>{formatAuditFieldName(zm.pole)}</td>
                                          <td style={{ color: '#b91c1c' }}>{formatAuditValue(zm.stara_hodnota)}</td>
                                          <td style={{ color: '#166534' }}>{formatAuditValue(zm.nova_hodnota)}</td>
                                          <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{zm.endpoint || '—'}</td>
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
                                          <td style={{ fontWeight: 600 }}>{formatAuditFieldName(zm.pole)}</td>
                                          <td style={{ color: '#dc2626' }}>{formatAuditValue(zm.stara_hodnota)}</td>
                                          <td style={{ color: '#16a34a' }}>{formatAuditValue(zm.nova_hodnota)}</td>
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
                          : (!searched
                            ? 'Načítám poslední auditní záznamy...'
                            : (loading ? 'Načítám data audit logu...' : 'Žádné záznamy nenalezeny pro zadané filtry.'))}
                      </EmptyTableCell>
                    </tr>
                  )}
              </tbody>
            </Table>
          </TableContainer>

          {viewMode !== 'pivot' && searched && (
            <PaginationContainer>
              <PaginationInfo>
                {viewMode === 'objekt'
                  ? (groupedRows.length > 0
                    ? `Zobrazeno ${groupedRows.length} objektů · načteno ${total} audit záznamů`
                    : 'Žádné objekty')
                  : (total > 0
                    ? `Zobrazeno ${offset + 1}–${Math.min(offset + limit, total)} z ${total} záznamů`
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
                      fetchHistory(0);
                    }}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.82rem', background: '#fff', color: '#334155', cursor: 'pointer' }}
                  >
                    {LIMIT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <PaginationControls>
                  <button
                    onClick={() => fetchHistory(0)}
                    disabled={viewMode === 'objekt' || offset === 0}
                  >
                    « První
                  </button>
                  <button
                    onClick={() => fetchHistory(offset - limit)}
                    disabled={viewMode === 'objekt' || offset === 0}
                  >
                    ‹ Předchozí
                  </button>
                    <span>Stránka {displayCurrentPage} z {displayTotalPages}</span>
                  <button
                    onClick={() => fetchHistory(offset + limit)}
                    disabled={viewMode === 'objekt' || offset + limit >= total}
                  >
                    Další ›
                  </button>
                  <button
                    onClick={() => fetchHistory((displayTotalPages - 1) * limit)}
                    disabled={viewMode === 'objekt' || offset + limit >= total}
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
