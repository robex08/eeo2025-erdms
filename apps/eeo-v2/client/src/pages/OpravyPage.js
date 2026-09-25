import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faScrewdriverWrench, faBolt, faPlus, faMinus, faSyncAlt, faSearch, faTimes,
  faEraser, faFileInvoice, faFileContract, faShoppingCart, faExclamationTriangle,
  faPlusSquare, faMinusSquare, faExternalLinkAlt, faSpinner, faCheck, faClone, faFileAlt, faCheckCircle,
  faMoneyBill, faCalendar, faBuilding, faUser, faStickyNote, faLayerGroup, faLink, faUndo, faSave, faHistory
} from '@fortawesome/free-solid-svg-icons';
import AuthContext from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import DatePicker from '../components/DatePicker';
import {
  getOpravyObjSmlFaktury, createOpravyNavrhy, revertOpravyNavrhy, commitOpravyNavrhy,
  getOpravyHistorie, undoOpravyNavrh
} from '../services/apiOpravy';
import ConfirmDialog from '../components/ConfirmDialog';
import { TooltipWrapper } from '../styles/GlobalTooltip';
import SlideInDetailPanel from '../components/UniversalSearch/SlideInDetailPanel';
import OrderFormReadOnly from '../components/OrderFormReadOnly';
import SmlouvaPreview from '../components/SmlouvaPreview';
import { getOrderV2 } from '../services/apiOrderV2';
import { getSmlouvyList, getSmlouvaDetail } from '../services/apiSmlouvy';

// ============================================================================
// Konstanty a pomocné funkce
// ============================================================================

const FA_STAV_LABELS = {
  ZAEVIDOVANA: 'Zaevidovaná',
  VECNA_SPRAVNOST: 'Věcná správnost',
  V_RESENI: 'V řešení',
  PREDANA_PO: 'Předaná PO',
  K_ZAPLACENI: 'K zaplacení',
  ZAPLACENO: 'Zaplaceno',
  DOKONCENA: 'Dokončená',
  STORNO: 'Storno'
};

const FA_TYP_LABELS = {
  BEZNA: 'Běžná',
  ZALOHOVA: 'Zálohová',
  VYUCTOVACI: 'Vyúčtovací',
  DOBROPIS: 'Dobropis',
  JINA: 'Jiná',
  INERNI: 'Interní'
};

const EMPTY_FILTERS = {
  fa_cislo_vema: '',
  fa_datum_vystaveni: '',
  fa_datum_splatnosti: '',
  fa_castka: '',
  fa_typ: '',
  stav: '',
  fa_zaplacena: '',
  fa_poznamka: ''
};

const PAGE_SIZES = [10, 25, 50, 100];

// Pohled tabulky: OBJ → SML → FA (výchozí) nebo SML → OBJ → FA
const VIEW_MODE_LS_KEY = 'opravy_view_mode';
const readViewMode = () => {
  try {
    return localStorage.getItem(VIEW_MODE_LS_KEY) === 'sml' ? 'sml' : 'obj';
  } catch {
    return 'obj';
  }
};

// Písmeno OBJ v rámci smlouvy (A, B, C… AA) pro kompaktní odkazy v řádcích FA
const objLetter = (idx) => {
  let n = idx;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};
const COLUMN_COUNT = 10;
const APP_FIXED_HEADER_HEIGHT = 144; // app header (96px) + menu bar (48px)

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('cs-CZ');
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `${num.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
};

const parseStrediska = (raw) => {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
  } catch {
    return String(raw);
  }
};

// Fáze workflow za FAKTURACÍ - OBJ v nich už MUSÍ mít fakturu (jinak anomálie)
const WORKFLOW_FAZE_LABELS = {
  FAKTURACE: 'Fakturace',
  VECNA_SPRAVNOST: 'Věcná správnost',
  ZKONTROLOVANA: 'Zkontrolovaná',
  DOKONCENA: 'Dokončená'
};

const normalizeText = (v) => String(v ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

// Shoda částky FA se součtem položek OBJ v toleranci ±250 Kč
const POLOZKY_TOLERANCE_KC = 250;

// Rozdíl FA − součet položek OBJ, nebo null (bez položek / bez částky)
const polozkyDiff = (obj, fa) => {
  if (!obj.pocet_polozek || obj.polozky_cena_s_dph === null || obj.polozky_cena_s_dph === undefined || fa.fa_castka === null) return null;
  return Number(fa.fa_castka) - Number(obj.polozky_cena_s_dph);
};

const matchesPolozky = (obj, fa) => {
  const diff = polozkyDiff(obj, fa);
  return diff !== null && Math.abs(diff) <= POLOZKY_TOLERANCE_KC;
};

const matchesMaxCena = (obj, fa) => obj.max_cena_s_dph !== null && fa.fa_castka !== null
  && Math.abs(Number(obj.max_cena_s_dph) - Number(fa.fa_castka)) < 0.01;

// ============================================================================
// Kombinace faktur: součet více FA (typicky stejné datum vystavení/zaevidování)
// porovnaný se součtem položek OBJ (±POLOZKY_TOLERANCE_KC). Jen nápověda -
// jednotlivá shoda (matchesPolozky) funguje dál beze změny.
// ============================================================================

const COMBO_MAX_SIZE = 4;          // obecné hledání: max. počet FA v kombinaci
const COMBO_MAX_ITERATIONS = 200000;
const COMBO_MAX_GENERIC = 3;       // obecných (nedatumových) kombinací max. na OBJ
const COMBO_MAX_TOTAL = 6;

const COMBO_TYP_LABELS = {
  datum_vystaveni: 'stejné datum vystavení',
  datum_zaevidovani: 'stejné datum zaevidování',
  kombinace: 'kombinace částek napříč daty (méně jisté)'
};

const findFakturaCombos = (obj) => {
  const target = obj.pocet_polozek ? Number(obj.polozky_cena_s_dph) : null;
  if (target === null || !Number.isFinite(target)) return [];

  // Kandidáti: FA s částkou, ne storno, a ne ty, které už samy sedí (jednotlivá shoda)
  const faktury = obj.smlouvy.flatMap(sml => sml.faktury.map(fa => ({ fa, smlId: sml.id })))
    .filter(({ fa }) => fa.stav !== 'STORNO' && fa.fa_castka !== null && !matchesPolozky(obj, fa));

  const combos = [];
  const seen = new Set();
  const addCombo = (items, typ, datum = null) => {
    const faIds = items.map(i => i.fa.id).sort((a, b) => a - b);
    const key = faIds.join(',');
    if (seen.has(key)) return;
    const sum = items.reduce((acc, i) => acc + Number(i.fa.fa_castka), 0);
    const diff = sum - target;
    if (Math.abs(diff) > POLOZKY_TOLERANCE_KC) return;
    seen.add(key);
    combos.push({ faIds, smlIds: [...new Set(items.map(i => i.smlId))], sum, diff, typ, datum });
  };

  // Subset-sum 2..COMBO_MAX_SIZE kladných částek s ořezem (nad zadanou množinou FA)
  const upper = target + POLOZKY_TOLERANCE_KC;
  const searchSubsets = (pool, typ, datum, maxFound) => {
    const positive = pool.filter(({ fa }) => Number(fa.fa_castka) > 0)
      .sort((x, y) => Number(y.fa.fa_castka) - Number(x.fa.fa_castka));
    let iterations = 0;
    let found = 0;
    const dfs = (start, chosen, sum) => {
      if (found >= maxFound || iterations > COMBO_MAX_ITERATIONS) return;
      for (let i = start; i < positive.length; i++) {
        iterations++;
        const next = sum + Number(positive[i].fa.fa_castka);
        if (next > upper) continue;
        const nextChosen = [...chosen, positive[i]];
        if (nextChosen.length >= 2 && Math.abs(next - target) <= POLOZKY_TOLERANCE_KC) {
          const before = combos.length;
          addCombo(nextChosen, typ, datum);
          if (combos.length > before) found++;
          if (found >= maxFound) return;
        }
        if (nextChosen.length < COMBO_MAX_SIZE) dfs(i + 1, nextChosen, next);
      }
    };
    dfs(0, [], 0);
  };

  // 1) Skupiny podle stejného data vystavení / zaevidování:
  //    a) celá skupina sečtená, b) kombinace uvnitř skupiny
  [['datum_vystaveni', ({ fa }) => (fa.fa_datum_vystaveni || '').slice(0, 10)],
   ['datum_zaevidovani', ({ fa }) => (fa.dt_vytvoreni || '').slice(0, 10)]].forEach(([typ, getKey]) => {
    const groups = new Map();
    faktury.forEach(item => {
      const k = getKey(item);
      if (!k) return;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(item);
    });
    groups.forEach((items, datum) => {
      if (items.length < 2) return;
      addCombo(items, typ, datum);
      searchSubsets(items, typ, datum, 2);
    });
  });

  // 2) Obecná kombinace napříč daty (méně věrohodná - jen pár nejlepších)
  searchSubsets(faktury, 'kombinace', null, COMBO_MAX_GENERIC);

  // Datumové skupiny mají přednost, pak nejmenší odchylka, pak méně faktur
  const typOrder = { datum_vystaveni: 0, datum_zaevidovani: 1, kombinace: 2 };
  return combos
    .sort((a, b) => (typOrder[a.typ] - typOrder[b.typ]) || (Math.abs(a.diff) - Math.abs(b.diff)) || (a.faIds.length - b.faIds.length))
    .slice(0, COMBO_MAX_TOTAL)
    .map((c, idx) => ({ ...c, label: `Σ${idx + 1}` }));
};

const normalizeAmount = (v) => String(v ?? '').replace(/\s/g, '').replace(',', '.');

const invoiceMatchesFilters = (fa, f) => {
  if (f.fa_cislo_vema && !normalizeText(fa.fa_cislo_vema).includes(normalizeText(f.fa_cislo_vema))) return false;
  if (f.fa_datum_vystaveni && (fa.fa_datum_vystaveni || '').slice(0, 10) !== f.fa_datum_vystaveni) return false;
  if (f.fa_datum_splatnosti && (fa.fa_datum_splatnosti || '').slice(0, 10) !== f.fa_datum_splatnosti) return false;
  if (f.fa_castka) {
    const needle = normalizeAmount(f.fa_castka);
    const amount = fa.fa_castka === null ? '' : Number(fa.fa_castka).toFixed(2);
    if (!amount.includes(needle) && !normalizeAmount(formatCurrency(fa.fa_castka)).includes(needle)) return false;
  }
  if (f.fa_typ && fa.fa_typ !== f.fa_typ) return false;
  if (f.stav && fa.stav !== f.stav) return false;
  if (f.fa_zaplacena === 'ano' && !fa.fa_zaplacena) return false;
  if (f.fa_zaplacena === 'ne' && fa.fa_zaplacena) return false;
  if (f.fa_poznamka && !normalizeText(fa.fa_poznamka).includes(normalizeText(f.fa_poznamka))) return false;
  return true;
};

const objMatchesSearch = (obj, search) => {
  if (!search) return true;
  const needle = normalizeText(search);
  const haystack = [
    obj.cislo_objednavky, obj.predmet, obj.dodavatel_nazev, obj.dodavatel_ico, obj.stav_objednavky,
    obj.objednatel, obj.cislo_smlouvy,
    ...obj.smlouvy.flatMap(s => [s.cislo_smlouvy, s.nazev_smlouvy, s.nazev_firmy, s.ico])
  ];
  return haystack.some(v => normalizeText(v).includes(needle));
};

// ============================================================================
// Styled components
// ============================================================================

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  padding: 2rem 1rem;
  box-sizing: border-box;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  flex-wrap: wrap;
  gap: 1rem;
  color: white;
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const PageTitle = styled.h1`
  font-size: 2.1rem;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BetaBadge = styled.span`
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  letter-spacing: 0.05em;
`;

const PageSubtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.98rem;
  max-width: 900px;
`;

// Obnovit v hlavičce - jen ikona (stejné jako Invoices25List / Objednávky V3), popis v tooltipu
const RefreshIconButton = styled.button`
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

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.7; cursor: wait; }
`;

const TabsContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 0.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  min-width: 260px;
  padding: 0.9rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#6b7280'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
`;

// Karty souhrnu - stejný vzhled jako OrdersDashboardV3Full (Objednávky V3)
const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 200px);
  gap: 1.5em;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
`;

const StatCard = styled.div`
  background: ${props => props.$isActive
    ? `linear-gradient(145deg, ${props.$color || '#3b82f6'}20, ${props.$color || '#3b82f6'}10)`
    : 'linear-gradient(145deg, #ffffff, #f9fafb)'};
  border-radius: 12px;
  padding: 0.6rem 1rem;
  height: 95px;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-left: ${props => props.$isActive ? '6px' : '4px'} solid ${props => props.$color || '#3b82f6'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  ${props => props.$clickable && `
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.06);
      border-left-width: 5px;
    }
  `}
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  min-height: 42px;
  display: flex;
  align-items: center;
`;

const StatIcon = styled.div`
  font-size: 1.5rem;
  color: ${props => props.$color || '#64748b'};
  opacity: 0.8;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  line-height: 1.3;
  margin-bottom: 0.4rem;
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1 1 320px;
  max-width: 520px;

  > svg:first-of-type {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  height: 42px;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const InputClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;

  &:hover { color: #4b5563; }
`;

const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
`;

const ToolbarSpacer = styled.div`
  flex: 1;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  height: 38px;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background: ${props => props.$primary ? '#3b82f6' : 'white'};
  color: ${props => props.$primary ? 'white' : '#3b82f6'};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${props => props.$primary ? '#2563eb' : '#eff6ff'};
    border-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.9rem;
  letter-spacing: -0.01em;
  table-layout: fixed;
`;

const TableHead = styled.thead`
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
`;

const TableHeader = styled.th`
  padding: 0.85rem 0.375rem;
  height: 48px;
  vertical-align: middle;
  font-size: 0.92rem;
  text-align: ${props => props.$align || 'center'};
  font-weight: 600;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FilterHeader = styled.th`
  padding: 0.55rem 0.375rem;
  vertical-align: middle;
  background: #f1f5f9;
  border-bottom: 2px solid #cbd5e1;
  font-weight: normal;
`;

const ColumnFilterWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const ColumnFilterInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 1.75rem 0.45rem 0.5rem;
  border: 1px solid ${props => props.$active ? '#3b82f6' : '#d1d5db'};
  border-radius: 4px;
  font-size: 0.75rem;
  background: ${props => props.$active ? '#eff6ff' : '#f9fafb'};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  &::placeholder { color: #9ca3af; font-size: 0.75rem; }
`;

const ColumnFilterSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 0.4rem 0.35rem;
  border: 1px solid ${props => props.$active ? '#3b82f6' : '#d1d5db'};
  border-radius: 4px;
  font-size: 0.75rem;
  background: ${props => props.$active ? '#eff6ff' : '#f9fafb'};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const ColumnClearButton = styled.button`
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.15rem;
  display: flex;
  font-size: 0.7rem;

  &:hover { color: #4b5563; }
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.$light ? 'rgba(255,255,255,0.9)' : '#9ca3af'};
  cursor: pointer;
  padding: 0.3rem 0.4rem;
  border-radius: 4px;
  transition: all 0.15s ease;
  font-size: 0.85rem;

  &:hover:not(:disabled) {
    color: ${props => props.$light ? 'white' : '#4b5563'};
    background: ${props => props.$light ? 'rgba(255,255,255,0.15)' : '#f3f4f6'};
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2563eb;
  margin: 0;
`;

// Wrapper pro přesné vycentrování checkboxu v buňce (vodorovně i svisle)
const CheckboxCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

const ObjRow = styled.tr`
  background: ${props => props.$anomalie
    ? 'linear-gradient(90deg, #fecaca 0%, #fee2e2 60%, #fef2f2 100%)'
    : 'linear-gradient(90deg, #dbeafe 0%, #eff6ff 60%, #f8fafc 100%)'};
  border-top: 2px solid ${props => props.$anomalie ? '#f87171' : '#93c5fd'};
  box-shadow: ${props => props.$anomalie ? 'inset 4px 0 0 #dc2626' : 'none'};
`;

const SmlRow = styled.tr`
  background: #f5f3ff;
  border-top: 1px solid #ddd6fe;
`;

const FaRow = styled.tr`
  background: ${props => props.$paired ? '#ccfbf1' : props.$selected ? '#ecfdf5' : props.$match ? '#fefce8' : 'white'};
  box-shadow: ${props => props.$paired ? 'inset 4px 0 0 #0d9488' : props.$match ? 'inset 4px 0 0 #eab308' : 'none'};
  opacity: ${props => props.$pairedElsewhere ? 0.55 : 1};
  transition: background 0.15s ease;

  &:hover {
    background: ${props => props.$selected ? '#d1fae5' : '#f8fafc'};
  }
`;

const GroupCell = styled.td`
  padding: 0.55rem 0.5rem;
  padding-left: ${props => props.$indent || '0.5rem'};
`;

const GroupContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  min-width: 0;
`;

const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: white;
  background: ${props => props.$color};
  flex-shrink: 0;
`;

const GroupTitle = styled.span`
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
`;

const GroupText = styled.span`
  color: #475569;
  font-size: 0.85rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: ${props => props.$max || 'none'};
`;

const GroupMeta = styled.span`
  color: #64748b;
  font-size: 0.8rem;
  white-space: nowrap;

  strong { color: #1e293b; font-weight: 600; }
`;

const StatusPill = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  background: ${props => props.$bg || '#e5e7eb'};
  color: ${props => props.$color || '#374151'};
`;

// Stejné tlačítko rozbalení jako podřádky v Objednávkách V3 (OrdersTableV3)
const ExpandButton = styled.button`
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  padding: 0.3rem 0.45rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #475569;
  }

  &:active {
    transform: scale(0.95);
  }
`;

// Stromová "větev" pro odsazení podřádků (SML pod OBJ, FA pod SML)
const TreeBranch = styled.span`
  display: inline-block;
  width: 14px;
  height: 12px;
  margin-right: 0.45rem;
  margin-bottom: 4px;
  border-left: 2px solid ${props => props.$color || '#cbd5e1'};
  border-bottom: 2px solid ${props => props.$color || '#cbd5e1'};
  border-bottom-left-radius: 4px;
  vertical-align: middle;
  flex-shrink: 0;
`;

const AmountMatch = styled.span`
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: ${props => props.$exact ? '#16a34a' : '#fde047'};
  color: ${props => props.$exact ? 'white' : '#422006'};
  font-weight: 800;
`;

const ComboRowCell = styled.td`
  padding: 0.5rem 0.75rem 0.6rem 4rem;
  background: #f0fdf4;
  border-bottom: 1px solid #bbf7d0;
  font-size: 0.83rem;
`;

const ComboLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  flex-wrap: wrap;
  text-align: right;
  padding: 0.2rem 0;
  color: #14532d;

  & + & { border-top: 1px dashed #bbf7d0; }
`;

const ComboSelectButton = styled.button`
  min-width: 96px;
  border: 1px solid ${props => props.$active ? '#dc2626' : '#16a34a'};
  background: white;
  color: ${props => props.$active ? '#b91c1c' : '#15803d'};
  border-radius: 4px;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;

  &:hover { background: ${props => props.$active ? '#fee2e2' : '#dcfce7'}; }
`;

const ViewSwitch = styled.div`
  display: inline-flex;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
`;

const ViewSwitchButton = styled.button`
  border: none;
  padding: 0.45rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  color: ${props => props.$active ? 'white' : '#3b82f6'};
  transition: all 0.15s ease;

  &:hover { background: ${props => props.$active ? '#2563eb' : '#eff6ff'}; }
`;

const ObjSubRow = styled.tr`
  background: ${props => props.$anomalie ? '#fef2f2' : '#eff6ff'};
  border-top: 1px solid ${props => props.$anomalie ? '#fecaca' : '#bfdbfe'};
`;

const LetterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  background: ${props => props.$bg || '#1e40af'};
  color: white;
  flex-shrink: 0;
`;

const TargetSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 0.3rem 0.35rem;
  border: 1px solid ${props => props.$hasTarget ? '#3b82f6' : '#d1d5db'};
  border-radius: 4px;
  font-size: 0.75rem;
  background: ${props => props.$hasTarget ? '#eff6ff' : '#f9fafb'};
  cursor: pointer;

  &:disabled { cursor: not-allowed; opacity: 0.7; }
  &:focus { outline: none; border-color: #3b82f6; }
`;

const PolozkyPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  white-space: nowrap;
  background: ${props => props.$empty ? '#f1f5f9' : '#fef9c3'};
  border: 1px solid ${props => props.$empty ? '#cbd5e1' : '#eab308'};
  color: ${props => props.$empty ? '#94a3b8' : '#713f12'};

  strong { font-size: 0.9rem; font-weight: 800; color: #422006; }
`;

const CountPill = styled.span`
  margin-left: auto;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: ${props => props.$zero ? '#f1f5f9' : '#1e40af'};
  color: ${props => props.$zero ? '#94a3b8' : 'white'};
  white-space: nowrap;
`;

const TableCell = styled.td`
  padding: 0.4rem 0.375rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  text-align: ${props => props.$align || 'left'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1f2937;
`;

const HintBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.4rem;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
  background: ${props => props.$bg || '#dcfce7'};
  color: ${props => props.$color || '#166534'};
`;

const EmptyRowCell = styled.td`
  padding: 0.6rem 0.5rem 0.6rem 7rem;
  color: #94a3b8;
  font-style: italic;
  font-size: 0.85rem;
  border-bottom: 1px solid #f1f5f9;
`;

const WarningRowCell = styled.td`
  padding: 0.55rem 0.5rem 0.55rem 2.5rem;
  background: #fffbeb;
  color: #92400e;
  font-size: 0.85rem;
  border-bottom: 1px solid #fde68a;

  svg { margin-right: 0.4rem; color: #f59e0b; }
`;

const StateBox = styled.div`
  padding: 3rem 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;

  svg { margin-right: 0.5rem; }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 0.75rem;
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
`;

const PageSizeSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
`;

// Ikona "otevřít ve formuláři" hned za číslem OBJ/SML/FA - stejná jako ve VEMA vs EEO
const OpenInFormButton = styled.button`
  border: none;
  background: transparent;
  padding: 0.15rem;
  margin-left: -0.45rem;
  cursor: pointer;
  color: #3b82f6;
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover { color: #1d4ed8; background: #eff6ff; }
`;

// Klikací číslo -> slide-in náhled (tečkované podtržení jako ve VEMA vs EEO)
const PreviewLink = styled.span`
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;

  &:hover { color: #1d4ed8; }
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin: 1rem 0;
`;

// FA náhled - stejný vizuální jazyk jako InvoiceQuickView ve VEMA vs EEO
const QVSection = styled.div`
  margin-bottom: 1.5rem;
  &:last-child { margin-bottom: 0; }
`;

const QVSectionTitle = styled.h3`
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
`;

const QVGrid = styled.div`
  display: grid;
  gap: 1rem;
  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const QVRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const QVIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 6px;
  color: #3b82f6;
  flex-shrink: 0;
  font-size: 0.875rem;
`;

const QVLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.25rem;
`;

const QVValue = styled.div`
  font-size: 0.95rem;
  color: #0f172a;
  font-weight: 500;
  line-height: 1.35;
  word-break: break-word;
`;

const QVBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.7rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
`;

const QVItem = ({ icon, label, children }) => (
  <QVRow>
    <QVIcon><FontAwesomeIcon icon={icon} /></QVIcon>
    <div>
      <QVLabel>{label}</QVLabel>
      <QVValue>{children}</QVValue>
    </div>
  </QVRow>
);

const FakturaQuickView = ({ faktura, obj, sml }) => (
  <div>
    <QVSection>
      <QVSectionTitle>Základní informace</QVSectionTitle>
      <QVGrid>
        <QVItem icon={faFileInvoice} label="Číslo faktury / VS">{faktura.fa_cislo_vema || '—'}</QVItem>
        <QVItem icon={faFileAlt} label="Typ faktury">
          <QVBadge style={{ background: '#fef3c7', color: '#92400e' }}>{FA_TYP_LABELS[faktura.fa_typ] || faktura.fa_typ || '—'}</QVBadge>
        </QVItem>
        <QVItem icon={faCalendar} label="Stav v EEO">
          <QVBadge style={{ background: '#dbeafe', color: '#1e40af' }}>{FA_STAV_LABELS[faktura.stav] || faktura.stav}</QVBadge>
        </QVItem>
        <QVItem icon={faUser} label="Zaevidoval">
          {faktura.vytvoril || '—'}{faktura.dt_vytvoreni ? ` · ${formatDate(faktura.dt_vytvoreni)}` : ''}
        </QVItem>
        {faktura.fa_strediska_kod && <QVItem icon={faBuilding} label="Střediska">{parseStrediska(faktura.fa_strediska_kod)}</QVItem>}
      </QVGrid>
    </QVSection>

    <QVSection>
      <QVSectionTitle>Finanční údaje</QVSectionTitle>
      <QVGrid>
        <QVItem icon={faMoneyBill} label="Částka s DPH">
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e40af' }}>{formatCurrency(faktura.fa_castka)}</span>
        </QVItem>
        <QVItem icon={faCheckCircle} label="Zaplaceno">
          {faktura.fa_zaplacena ? `Ano${faktura.fa_datum_zaplaceni ? ` · ${formatDate(faktura.fa_datum_zaplaceni)}` : ''}` : 'Ne'}
        </QVItem>
        <QVItem icon={faCalendar} label="Datum vystavení">{formatDate(faktura.fa_datum_vystaveni)}</QVItem>
        <QVItem icon={faCalendar} label="Datum splatnosti">{formatDate(faktura.fa_datum_splatnosti)}</QVItem>
        <QVItem icon={faCalendar} label="Datum doručení">{formatDate(faktura.fa_datum_doruceni)}</QVItem>
      </QVGrid>
    </QVSection>

    <QVSection>
      <QVSectionTitle>Vazby</QVSectionTitle>
      <QVGrid>
        <QVItem icon={faFileContract} label="Smlouva (aktuální vazba)">
          {sml ? `${sml.cislo_smlouvy} · ${sml.nazev_firmy || ''}` : '—'}
        </QVItem>
        <QVItem icon={faShoppingCart} label="Objednávka">
          <span style={{ color: '#b45309' }}>bez objednávky</span>
          {obj && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>kandidát: {obj.cislo_objednavky}</div>}
        </QVItem>
      </QVGrid>
    </QVSection>

    {faktura.fa_poznamka && (
      <QVSection>
        <QVSectionTitle>Poznámka</QVSectionTitle>
        <QVItem icon={faStickyNote} label="Poznámka">{faktura.fa_poznamka}</QVItem>
      </QVSection>
    )}
  </div>
);

const FloatingHeaderPanel = styled.div`
  position: fixed;
  top: ${APP_FIXED_HEADER_HEIGHT}px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  overflow: hidden;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  border-bottom: 3px solid #3b82f6;
  opacity: ${props => props.$visible ? 1 : 0};
  transform: translateY(${props => props.$visible ? '0' : '-10px'});
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

// ============================================================================
// Komponenta
// ============================================================================

const apiErrorMessage = (err) => err.response?.data?.message || err.message || 'Neznámá chyba';

// ============================================================================
// Historie oprav - uložené/vrácené opravy s Undo
// ============================================================================

const HISTORIE_EMPTY_FILTERS = { obj: '', sml: '', fa: '', ulozil: '', stav: '' };

const OpravyHistorie = ({ token, username, showToast, onChanged }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(HISTORIE_EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [undoTarget, setUndoTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOpravyHistorie(token, username);
      setRows(result.historie || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const filtered = useMemo(() => rows.filter(r => {
    if (filters.obj && !normalizeText(`${r.cislo_objednavky} ${r.predmet}`).includes(normalizeText(filters.obj))) return false;
    if (filters.sml && !normalizeText(`${r.cislo_smlouvy} ${r.nazev_firmy}`).includes(normalizeText(filters.sml))) return false;
    if (filters.fa && !normalizeText(r.fa_cislo_vema).includes(normalizeText(filters.fa))) return false;
    if (filters.ulozil && !normalizeText(`${r.ulozil} ${r.vratil}`).includes(normalizeText(filters.ulozil))) return false;
    if (filters.stav && r.stav !== filters.stav) return false;
    return true;
  }), [rows, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleUndo = async () => {
    if (!undoTarget) return;
    setBusy(true);
    try {
      await undoOpravyNavrh(token, username, undoTarget.id);
      showToast?.(`Oprava FA ${undoTarget.fa_cislo_vema} vrácena – faktura je zpět na smlouvě.`, { type: 'success' });
      setUndoTarget(null);
      await load();
      onChanged?.();
    } catch (err) {
      showToast?.(`Vrácení se nepodařilo: ${apiErrorMessage(err)}`, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const textFilter = (key, placeholder = 'Hledat...') => (
    <ColumnFilterWrapper>
      <ColumnFilterInput value={filters[key]} onChange={e => setFilter(key, e.target.value)} placeholder={placeholder} $active={!!filters[key]} />
      {filters[key] && <ColumnClearButton onClick={() => setFilter(key, '')}><FontAwesomeIcon icon={faTimes} /></ColumnClearButton>}
    </ColumnFilterWrapper>
  );

  return (
    <ContentCard>
      <Toolbar>
        <GroupMeta>
          Uložené opravy OBJ-SML-FA. <strong>Vrátit</strong> jde jen dokud je faktura stále na objednávce, kam ji oprava přepojila.
        </GroupMeta>
        <ToolbarSpacer />
        <TooltipWrapper text="Obnovit historii" preferredPosition="bottom">
          <ActionButton onClick={load} disabled={loading}>
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
          </ActionButton>
        </TooltipWrapper>
      </Toolbar>

      {error ? (
        <StateBox style={{ color: '#b91c1c' }}><FontAwesomeIcon icon={faExclamationTriangle} />{error}</StateBox>
      ) : (
        <TableWrapper>
          <Table>
            <colgroup>
              <col style={{ width: '140px' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '130px' }} />
              <col />
              <col style={{ width: '110px' }} />
              <col style={{ width: '56px' }} />
            </colgroup>
            <TableHead>
              <tr>
                <TableHeader>Uloženo / vráceno</TableHeader>
                <TableHeader $align="left">Objednávka</TableHeader>
                <TableHeader $align="left">Smlouva (původní)</TableHeader>
                <TableHeader $align="left">Faktura</TableHeader>
                <TableHeader $align="right">Částka</TableHeader>
                <TableHeader $align="left">Uložil / vrátil</TableHeader>
                <TableHeader>Stav</TableHeader>
                <TableHeader title="Akce"><FontAwesomeIcon icon={faBolt} /></TableHeader>
              </tr>
              <tr>
                <FilterHeader />
                <FilterHeader>{textFilter('obj')}</FilterHeader>
                <FilterHeader>{textFilter('sml')}</FilterHeader>
                <FilterHeader>{textFilter('fa')}</FilterHeader>
                <FilterHeader />
                <FilterHeader>{textFilter('ulozil')}</FilterHeader>
                <FilterHeader>
                  <ColumnFilterSelect value={filters.stav} onChange={e => setFilter('stav', e.target.value)} $active={!!filters.stav}>
                    <option value="">Vše</option>
                    <option value="ULOZENO">Uloženo</option>
                    <option value="VRACENO">Vráceno</option>
                  </ColumnFilterSelect>
                </FilterHeader>
                <FilterHeader style={{ textAlign: 'center' }}>
                  <IconButton title="Vymazat filtry" onClick={() => setFilters(HISTORIE_EMPTY_FILTERS)} disabled={!Object.values(filters).some(Boolean)}>
                    <FontAwesomeIcon icon={faEraser} />
                  </IconButton>
                </FilterHeader>
              </tr>
            </TableHead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><StateBox><FontAwesomeIcon icon={faSpinner} spin />Načítám historii…</StateBox></td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8}><StateBox>Zatím žádné uložené opravy.</StateBox></td></tr>
              ) : paged.map(r => (
                <FaRow key={r.id}>
                  <TableCell $align="center">
                    {r.stav === 'VRACENO' ? formatDate(r.dt_vraceni) : formatDate(r.dt_ulozeni)}
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {String((r.stav === 'VRACENO' ? r.dt_vraceni : r.dt_ulozeni) || '').slice(11, 16)}
                    </div>
                  </TableCell>
                  <TableCell title={r.predmet}>
                    <strong>{r.cislo_objednavky || `#${r.objednavka_id}`}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.predmet}</div>
                  </TableCell>
                  <TableCell title={r.nazev_firmy}>
                    <strong>{r.cislo_smlouvy || '—'}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nazev_firmy}</div>
                  </TableCell>
                  <TableCell>
                    <FontAwesomeIcon icon={faFileInvoice} style={{ color: '#10b981', marginRight: '0.4rem' }} />
                    <strong>{r.fa_cislo_vema || `#${r.faktura_id}`}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>vyst. {formatDate(r.fa_datum_vystaveni)}</div>
                  </TableCell>
                  <TableCell $align="right" style={{ fontWeight: 600 }}>{formatCurrency(r.fa_castka)}</TableCell>
                  <TableCell>
                    {r.ulozil || '—'}
                    {r.stav === 'VRACENO' && <div style={{ fontSize: '0.78rem', color: '#b91c1c' }}>vrátil: {r.vratil || '—'}</div>}
                  </TableCell>
                  <TableCell $align="center">
                    {r.stav === 'ULOZENO'
                      ? <StatusPill $bg="#ccfbf1" $color="#115e59">Uloženo</StatusPill>
                      : <StatusPill $bg="#f1f5f9" $color="#64748b">Vráceno</StatusPill>}
                  </TableCell>
                  <TableCell $align="center">
                    {r.stav === 'ULOZENO' && (
                      <IconButton
                        title={r.lze_vratit ? 'Vrátit opravu (FA zpět na SML)' : 'Faktura se od uložení změnila – vrácení není možné'}
                        disabled={!r.lze_vratit}
                        onClick={() => setUndoTarget(r)}
                      >
                        <FontAwesomeIcon icon={faUndo} />
                      </IconButton>
                    )}
                  </TableCell>
                </FaRow>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      <PaginationContainer>
        <PaginationInfo>Zobrazeno {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} z {filtered.length} záznamů</PaginationInfo>
        <PaginationControls>
          <PageSizeSelect value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZES.map(sz => <option key={sz} value={sz}>{sz} / stránka</option>)}
          </PageSizeSelect>
          <PageButton onClick={() => setPage(1)} disabled={currentPage <= 1}>«</PageButton>
          <PageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>‹</PageButton>
          <PaginationInfo>Stránka {currentPage} / {pageCount}</PaginationInfo>
          <PageButton onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}>›</PageButton>
          <PageButton onClick={() => setPage(pageCount)} disabled={currentPage >= pageCount}>»</PageButton>
        </PaginationControls>
      </PaginationContainer>

      <ConfirmDialog
        isOpen={!!undoTarget}
        onClose={() => !busy && setUndoTarget(null)}
        onConfirm={handleUndo}
        title="Vrátit uloženou opravu"
        icon={faUndo}
        variant="warning"
        confirmText={busy ? 'Vracím…' : 'Vrátit'}
        message={undoTarget && (
          <div>
            <p>Faktura <strong>{undoTarget.fa_cislo_vema}</strong> ({formatCurrency(undoTarget.fa_castka)}) se odpojí od objednávky
              {' '}<strong>{undoTarget.cislo_objednavky}</strong> a vrátí se přímo na smlouvu <strong>{undoTarget.cislo_smlouvy}</strong>.</p>
            <p style={{ marginTop: '8px', color: '#64748b' }}>Mění se jen vazba (objednavka_id / smlouva_id), nic jiného.</p>
          </div>
        )}
      />
    </ContentCard>
  );
};

const OpravyPage = () => {
  const { token, username } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();
  const location = useLocation();

  // ---- Slide-in náhledy OBJ / SML / FA (stejně jako VEMA vs EEO - každý svůj panel) ----
  const [orderPreview, setOrderPreview] = useState({ open: false, orderId: null, data: null, loading: false, error: null });
  const [smlouvaPreview, setSmlouvaPreview] = useState({ open: false, smlouvaId: null, cislo: null, data: null, loading: false, error: null });
  const [invoicePreview, setInvoicePreview] = useState({ open: false, faktura: null, obj: null, sml: null });

  const openOrderPreview = async (orderId) => {
    setOrderPreview({ open: true, orderId, data: null, loading: true, error: null });
    try {
      const orderData = await getOrderV2(orderId, token, username, true);
      setOrderPreview(prev => (prev.open && prev.orderId === orderId ? { ...prev, data: orderData, loading: false } : prev));
    } catch (e) {
      setOrderPreview(prev => (prev.open && prev.orderId === orderId ? { ...prev, loading: false, error: e.message || 'Chyba při načítání objednávky' } : prev));
    }
  };

  const openSmlouvaPreview = async (sml) => {
    setSmlouvaPreview({ open: true, smlouvaId: sml.id, cislo: sml.cislo_smlouvy, data: null, loading: true, error: null });
    try {
      const detail = await getSmlouvaDetail({ token, username, id: sml.id });
      setSmlouvaPreview(prev => (prev.open && prev.smlouvaId === sml.id ? { ...prev, data: detail?.smlouva || null, loading: false } : prev));
    } catch (e) {
      setSmlouvaPreview(prev => (prev.open && prev.smlouvaId === sml.id ? { ...prev, loading: false, error: e.message || 'Chyba při načítání smlouvy' } : prev));
    }
  };

  const openInvoicePreview = (faktura, obj, sml) => {
    setInvoicePreview({ open: true, faktura, obj, sml });
  };

  // ---- Otevření v plném formuláři (stejná navigace jako VEMA vs EEO) ----
  const openOrderInFullForm = (orderId) => {
    navigate(`/order-form-25?edit=${orderId}`, { state: { returnTo: location.pathname } });
  };

  // FA-SML nemá objednávku -> orderIdForLoad null, formulář zaevidování si ji nedotahuje
  const openInvoiceInEvidenceForm = (invoiceId) => {
    navigate('/invoice-evidence', { state: { editInvoiceId: invoiceId, orderIdForLoad: null, returnTo: location.pathname } });
  };

  // Modul je jen pro SUPERADMIN/ADMINISTRATOR -> vždy editační formulář smlouvy
  const openSmlouvaInEditForm = async (sml) => {
    try {
      const listResponse = await getSmlouvyList({ token, username, search: sml.cislo_smlouvy, limit: 20 });
      const list = Array.isArray(listResponse) ? listResponse : (listResponse?.data || []);
      const match = list.find(s => Number(s.id) === sml.id)
        || list.find(s => String(s.cislo_smlouvy).trim() === String(sml.cislo_smlouvy).trim());
      if (!match) {
        showToast?.(`Smlouva ${sml.cislo_smlouvy} nebyla v číselníku nalezena.`, { type: 'error' });
        return;
      }
      navigate('/dictionaries', { state: { activeTab: 'smlouvy', editSmlouva: match, returnTo: location.pathname } });
    } catch (e) {
      showToast?.(`Chyba při otevírání smlouvy: ${e.message}`, { type: 'error' });
    }
  };

  const [data, setData] = useState({ objednavky: [], souhrn: null, koncepty: [] });
  const [activeTab, setActiveTab] = useState('opravy');
  const [viewMode, setViewModeState] = useState(readViewMode);
  // SML pohled: ručně zvolená cílová OBJ pro FA (faId -> objId)
  const [faTarget, setFaTarget] = useState(() => new Map());
  const [targetFilter, setTargetFilter] = useState('');
  const [showPaired, setShowPaired] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState(EMPTY_FILTERS);
  const [onlyAnomalie, setOnlyAnomalie] = useState(false);
  const [onlyShoda, setOnlyShoda] = useState(false);
  const [onlyWithFaktury, setOnlyWithFaktury] = useState(true);
  const [collapsed, setCollapsed] = useState(() => new Set());

  // Výběr faktur: faId -> objId (faktura může být přiřazena jen k jedné objednávce)
  const [selection, setSelection] = useState(() => new Map());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const tableRef = useRef(null);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const [floatingLayout, setFloatingLayout] = useState({ left: 0, width: 0, colWidths: [] });

  // ---- Načtení dat ----
  const loadData = useCallback(async () => {
    if (!token || !username) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getOpravyObjSmlFaktury(token, username);
      setData(result);
      // Odstranit z výběru faktury, které už v datech nejsou
      setSelection(prev => {
        const valid = new Set(result.objednavky.flatMap(o => o.smlouvy.flatMap(s => s.faktury.map(f => `${o.id}:${f.id}`))));
        const next = new Map();
        const paired = new Set((result.koncepty || []).map(k => k.faktura_id));
        prev.forEach((objId, faId) => {
          if (valid.has(`${objId}:${faId}`) && !paired.has(faId)) next.set(faId, objId);
        });
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Chyba při načítání dat');
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- Index: ve kolika objednávkách se faktura nabízí + čísla OBJ ----
  // Kombinace FA sedící na součet položek OBJ: objId -> [{label, faIds, sum, diff, typ, datum}]
  const combosByObj = useMemo(() => {
    const map = new Map();
    data.objednavky.forEach(o => map.set(o.id, findFakturaCombos(o)));
    return map;
  }, [data.objednavky]);

  // OBJ má shodu částky: jednotlivá FA nebo kombinace
  const objHasShoda = useCallback((o) => (combosByObj.get(o.id) || []).length > 0
    || o.smlouvy.some(s => s.faktury.some(fa => matchesPolozky(o, fa))), [combosByObj]);

  const pocetObjSeShodou = useMemo(
    () => data.objednavky.filter(objHasShoda).length,
    [data.objednavky, objHasShoda]
  );

  const fakturaObjIndex = useMemo(() => {
    const index = new Map();
    data.objednavky.forEach(o => {
      o.smlouvy.forEach(s => s.faktury.forEach(f => {
        if (!index.has(f.id)) index.set(f.id, []);
        index.get(f.id).push(o);
      }));
    });
    return index;
  }, [data.objednavky]);

  const objById = useMemo(() => new Map(data.objednavky.map(o => [o.id, o])), [data.objednavky]);

  // ---- Filtrování ----
  const invoiceFiltersActive = useMemo(
    () => Object.values(columnFilters).some(v => v !== ''),
    [columnFilters]
  );

  // Sdílené koncepty spárování: faId -> koncept {id, objednavka_id, vytvoril...}
  const konceptByFa = useMemo(
    () => new Map((data.koncepty || []).map(k => [k.faktura_id, k])),
    [data.koncepty]
  );

  const filteredGroups = useMemo(() => {
    return data.objednavky
      .filter(o => !onlyAnomalie || o.anomalie)
      .filter(o => !onlyShoda || objHasShoda(o))
      .filter(o => objMatchesSearch(o, search))
      .map(o => {
        const smlouvy = o.smlouvy.map(s => ({
          ...s,
          visibleFaktury: s.faktury
            .filter(f => showPaired || !konceptByFa.has(f.id))
            .filter(f => invoiceMatchesFilters(f, columnFilters))
            // FA se shodou částky na součet položek OBJ primárně nahoru
            .sort((a, b) => Number(matchesPolozky(o, b)) - Number(matchesPolozky(o, a)))
        }));
        const visibleCount = smlouvy.reduce((sum, s) => sum + s.visibleFaktury.length, 0);
        return { ...o, smlouvy, visibleCount };
      })
      .filter(o => {
        if (o.visibleCount > 0) return true;
        if (invoiceFiltersActive) return false;
        return o.anomalie || !onlyWithFaktury;
      })
      // Anomálie vždy nahoře
      .sort((a, b) => Number(b.anomalie) - Number(a.anomalie));
  }, [data.objednavky, onlyAnomalie, onlyShoda, objHasShoda, search, columnFilters, onlyWithFaktury, invoiceFiltersActive, showPaired, konceptByFa]);

  const allVisiblePairs = useMemo(
    () => filteredGroups.flatMap(o => o.smlouvy.flatMap(s => s.visibleFaktury.map(f => [f.id, o.id]))),
    [filteredGroups]
  );

  // ---- SML pohled: SML -> OBJ (všechny na ni vázané) -> FA bez OBJ ----
  const setViewMode = (mode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_LS_KEY, mode);
    } catch {
      // localStorage nedostupný - pohled jen pro tuto relaci
    }
  };

  // Doporučená cílová OBJ pro FA: shoda částky s položkami (nejmenší rozdíl),
  // pak kombinace, pak jediná OBJ na smlouvě. Jinak nic (uživatel vybere).
  const suggestTarget = useCallback((fa, objs) => {
    const matching = objs
      .filter(o => matchesPolozky(o, fa))
      .sort((a, b) => Math.abs(polozkyDiff(a, fa)) - Math.abs(polozkyDiff(b, fa)));
    if (matching.length) return matching[0].id;
    const inCombo = objs.find(o => (combosByObj.get(o.id) || []).some(c => c.faIds.includes(fa.id)));
    if (inCombo) return inCombo.id;
    return objs.length === 1 ? objs[0].id : null;
  }, [combosByObj]);

  const getFaTarget = (fa, objs) => {
    const koncept = konceptByFa.get(fa.id);
    if (koncept) return koncept.objednavka_id;
    if (selection.has(fa.id)) return selection.get(fa.id);
    if (faTarget.has(fa.id)) return faTarget.get(fa.id);
    return suggestTarget(fa, objs);
  };

  const smlGroups = useMemo(() => {
    const byKey = new Map();
    data.objednavky
      .filter(o => !onlyAnomalie || o.anomalie)
      .filter(o => !onlyShoda || objHasShoda(o))
      .filter(o => objMatchesSearch(o, search))
      .forEach(o => {
        const smlouvy = o.smlouvy.length ? o.smlouvy : [null];
        smlouvy.forEach(sml => {
          const key = sml ? `sml-${sml.id}` : `sml-missing-${o.cislo_smlouvy || ''}`;
          if (!byKey.has(key)) byKey.set(key, { key, sml, cisloSmlouvy: sml?.cislo_smlouvy || o.cislo_smlouvy, objs: [] });
          byKey.get(key).objs.push(o);
        });
      });

    return Array.from(byKey.values())
      .map(g => {
        const objs = g.objs.map((o, idx) => ({ ...o, letter: objLetter(idx) }));
        const faktury = g.sml?.faktury || [];
        const visibleFaktury = faktury
          .filter(f => showPaired || !konceptByFa.has(f.id))
          .filter(f => invoiceMatchesFilters(f, columnFilters))
          .filter(f => {
            if (!targetFilter) return true;
            const shoda = objs.some(o => matchesPolozky(o, f)
              || (combosByObj.get(o.id) || []).some(c => c.faIds.includes(f.id)));
            if (targetFilter === 'shoda') return shoda;
            const hasTarget = !!(konceptByFa.get(f.id) || selection.get(f.id) || faTarget.get(f.id) || suggestTarget(f, objs));
            return targetFilter === 'cil' ? hasTarget : !hasTarget;
          })
          .sort((a, b) => Number(objs.some(o => matchesPolozky(o, b))) - Number(objs.some(o => matchesPolozky(o, a))));
        return { ...g, objs, faktury, visibleFaktury, anomalie: objs.some(o => o.anomalie) };
      })
      .filter(g => {
        if (g.visibleFaktury.length > 0) return true;
        if (invoiceFiltersActive || targetFilter) return false;
        return g.anomalie || !onlyWithFaktury;
      })
      .sort((a, b) => Number(b.anomalie) - Number(a.anomalie));
  }, [data.objednavky, onlyAnomalie, onlyShoda, objHasShoda, search, showPaired, konceptByFa, columnFilters,
    targetFilter, combosByObj, selection, faTarget, suggestTarget, invoiceFiltersActive, onlyWithFaktury]);

  // Páry [faId, cílová objId] pro hromadný výběr v SML pohledu (FA bez cíle se přeskočí)
  const smlGroupPairs = (group) => group.visibleFaktury
    .map(f => [f.id, getFaTarget(f, group.objs)])
    .filter(([, objId]) => objId);

  const allVisiblePairsActive = viewMode === 'sml'
    ? smlGroups.flatMap(smlGroupPairs)
    : allVisiblePairs;

  // ---- Paginace (skupiny podle pohledu) ----
  const activeGroups = viewMode === 'sml' ? smlGroups : filteredGroups;
  const pageCount = Math.max(1, Math.ceil(activeGroups.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedGroups = useMemo(
    () => activeGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [activeGroups, currentPage, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [search, columnFilters, onlyAnomalie, onlyShoda, onlyWithFaktury, pageSize, viewMode, targetFilter]);

  // ---- Výběr ----
  const toggleInvoice = (faId, objId) => {
    if (konceptByFa.has(faId)) return;
    setSelection(prev => {
      const next = new Map(prev);
      if (next.get(faId) === objId) next.delete(faId);
      else next.set(faId, objId);
      return next;
    });
  };

  // Hromadný výběr: při zaškrtnutí nepřepisuje fakturu, která už je vybraná u jiné OBJ
  const setPairsSelected = (pairs, checked) => {
    setSelection(prev => {
      const next = new Map(prev);
      pairs.forEach(([faId, objId]) => {
        if (konceptByFa.has(faId)) return;
        if (checked) {
          if (!next.has(faId)) next.set(faId, objId);
        } else if (next.get(faId) === objId) {
          next.delete(faId);
        }
      });
      return next;
    });
  };

  const getPairsState = (allPairs) => {
    const pairs = allPairs.filter(([faId]) => !konceptByFa.has(faId));
    if (pairs.length === 0) return { checked: false, indeterminate: false, disabled: true };
    const selectedCount = pairs.filter(([faId, objId]) => selection.get(faId) === objId).length;
    return {
      checked: selectedCount === pairs.length,
      indeterminate: selectedCount > 0 && selectedCount < pairs.length
    };
  };

  const allState = getPairsState(allVisiblePairsActive);
  const selectedCount = selection.size;

  // ---- Rozbalení ----
  const toggleCollapsed = (objId) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(objId)) next.delete(objId);
      else next.add(objId);
      return next;
    });
  };

  const setAllCollapsed = (value) => {
    setCollapsed(value ? new Set(activeGroups.map(g => (viewMode === 'sml' ? g.key : g.id))) : new Set());
  };

  // ---- Filtry ----
  const setFilter = (key, value) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setColumnFilters(EMPTY_FILTERS);
    setTargetFilter('');
    setSearch('');
  };

  // ---- Akce (bude upřesněna) ----
  // ---- Akce: koncept spárování -> Undo -> Uložit natrvalo ----
  const applyKoncepty = (koncepty) => {
    setData(prev => ({ ...prev, koncepty: koncepty || [] }));
  };

  const handlePair = async () => {
    const pairs = Array.from(selection.entries()).map(([faId, objId]) => ({ faktura_id: faId, objednavka_id: objId }));
    if (!pairs.length) return;
    setActionBusy(true);
    try {
      const result = await createOpravyNavrhy(token, username, pairs);
      applyKoncepty(result.koncepty);
      setSelection(new Map());
      if (result.errors?.length) {
        showToast?.(`Spárováno ${result.created}, přeskočeno ${result.errors.length}: ${result.errors.map(e => e.message).join('; ')}`, { type: 'warning' });
      } else {
        showToast?.(`Spárováno ${result.created} FA (koncept – zatím neuloženo).`, { type: 'success' });
      }
    } catch (err) {
      showToast?.(`Spárování se nepodařilo: ${apiErrorMessage(err)}`, { type: 'error' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleRevert = async ({ ids, all = false }) => {
    setActionBusy(true);
    try {
      const result = await revertOpravyNavrhy(token, username, { ids, all });
      applyKoncepty(result.koncepty);
      showToast?.(`Vráceno ${result.reverted} spárování.`, { type: 'info' });
    } catch (err) {
      showToast?.(`Vrácení se nepodařilo: ${apiErrorMessage(err)}`, { type: 'error' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleCommit = async () => {
    setActionBusy(true);
    try {
      const result = await commitOpravyNavrhy(token, username);
      setCommitDialogOpen(false);
      if (result.conflicts?.length) {
        showToast?.(`Uloženo ${result.saved}, ${result.conflicts.length} FA se mezitím změnilo a zůstalo v konceptu.`, { type: 'warning' });
      } else {
        showToast?.(`Uloženo natrvalo ${result.saved} oprav.`, { type: 'success' });
      }
      await loadData();
    } catch (err) {
      showToast?.(`Uložení se nepodařilo: ${apiErrorMessage(err)}`, { type: 'error' });
    } finally {
      setActionBusy(false);
    }
  };

  const koncepty = data.koncepty || [];

  // ---- Floating header ----
  useEffect(() => {
    if (loading || pagedGroups.length === 0 || !tableRef.current) {
      setShowFloatingHeader(false);
      return undefined;
    }
    const thead = tableRef.current.querySelector('thead');
    if (!thead) return undefined;

    let previousShowState = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldShow = entry.boundingClientRect.bottom < APP_FIXED_HEADER_HEIGHT;
        if (shouldShow !== previousShowState) {
          window.dispatchEvent(new Event('closeAllDatePickers'));
          previousShowState = shouldShow;
        }
        setShowFloatingHeader(shouldShow);
      },
      { threshold: 0, rootMargin: `-${APP_FIXED_HEADER_HEIGHT}px 0px 0px 0px` }
    );
    observer.observe(thead);
    return () => observer.disconnect();
  }, [loading, pagedGroups.length]);

  useEffect(() => {
    if (!showFloatingHeader || !tableRef.current) return undefined;
    const measure = () => {
      const table = tableRef.current;
      if (!table) return;
      const headerCells = Array.from(table.querySelectorAll('thead tr:first-of-type th'));
      const rect = table.parentElement.getBoundingClientRect();
      setFloatingLayout({
        left: rect.left,
        width: rect.width,
        colWidths: headerCells.map(cell => cell.offsetWidth)
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [showFloatingHeader]);

  // ---- Render hlavičky (sdílí hlavní i plovoucí tabulka) ----
  const renderHeaderRows = () => (
    <>
      <tr>
        <TableHeader>
          <CheckboxCenter>
            <Checkbox
              type="checkbox"
              title="Vybrat / zrušit výběr všech zobrazených faktur"
              checked={allState.checked}
              ref={el => { if (el) el.indeterminate = allState.indeterminate; }}
              onChange={e => setPairsSelected(allVisiblePairsActive, e.target.checked)}
              disabled={allState.disabled}
            />
          </CheckboxCenter>
        </TableHeader>
        <TableHeader $align="left">Číslo FA</TableHeader>
        <TableHeader>Vystavena</TableHeader>
        <TableHeader>Splatnost</TableHeader>
        <TableHeader $align="right">Částka s DPH</TableHeader>
        <TableHeader>Typ</TableHeader>
        <TableHeader>Stav FA</TableHeader>
        <TableHeader>Zaplaceno</TableHeader>
        <TableHeader $align="left">{viewMode === 'sml' ? 'Přiřadit k OBJ' : 'Poznámka'}</TableHeader>
        <TableHeader title="Akce"><FontAwesomeIcon icon={faBolt} /></TableHeader>
      </tr>
      <tr>
        <FilterHeader />
        <FilterHeader>
          <ColumnFilterWrapper>
            <ColumnFilterInput
              value={columnFilters.fa_cislo_vema}
              onChange={e => setFilter('fa_cislo_vema', e.target.value)}
              placeholder="Hledat..."
              $active={!!columnFilters.fa_cislo_vema}
            />
            {columnFilters.fa_cislo_vema && (
              <ColumnClearButton onClick={() => setFilter('fa_cislo_vema', '')}><FontAwesomeIcon icon={faTimes} /></ColumnClearButton>
            )}
          </ColumnFilterWrapper>
        </FilterHeader>
        <FilterHeader>
          <DatePicker
            fieldName="opravy_fa_datum_vystaveni_filter"
            value={columnFilters.fa_datum_vystaveni}
            onChange={value => setFilter('fa_datum_vystaveni', value || '')}
            placeholder="Datum"
            variant="compact"
            highlight={!!columnFilters.fa_datum_vystaveni}
          />
        </FilterHeader>
        <FilterHeader>
          <DatePicker
            fieldName="opravy_fa_datum_splatnosti_filter"
            value={columnFilters.fa_datum_splatnosti}
            onChange={value => setFilter('fa_datum_splatnosti', value || '')}
            placeholder="Datum"
            variant="compact"
            highlight={!!columnFilters.fa_datum_splatnosti}
          />
        </FilterHeader>
        <FilterHeader>
          <ColumnFilterWrapper>
            <ColumnFilterInput
              value={columnFilters.fa_castka}
              onChange={e => setFilter('fa_castka', e.target.value)}
              placeholder="Částka"
              style={{ textAlign: 'right' }}
              $active={!!columnFilters.fa_castka}
            />
            {columnFilters.fa_castka && (
              <ColumnClearButton onClick={() => setFilter('fa_castka', '')}><FontAwesomeIcon icon={faTimes} /></ColumnClearButton>
            )}
          </ColumnFilterWrapper>
        </FilterHeader>
        <FilterHeader>
          <ColumnFilterSelect
            value={columnFilters.fa_typ}
            onChange={e => setFilter('fa_typ', e.target.value)}
            $active={!!columnFilters.fa_typ}
          >
            <option value="">Vše</option>
            {Object.entries(FA_TYP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </ColumnFilterSelect>
        </FilterHeader>
        <FilterHeader>
          <ColumnFilterSelect
            value={columnFilters.stav}
            onChange={e => setFilter('stav', e.target.value)}
            $active={!!columnFilters.stav}
          >
            <option value="">Vše</option>
            {Object.entries(FA_STAV_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </ColumnFilterSelect>
        </FilterHeader>
        <FilterHeader>
          <ColumnFilterSelect
            value={columnFilters.fa_zaplacena}
            onChange={e => setFilter('fa_zaplacena', e.target.value)}
            $active={!!columnFilters.fa_zaplacena}
          >
            <option value="">Vše</option>
            <option value="ano">Ano</option>
            <option value="ne">Ne</option>
          </ColumnFilterSelect>
        </FilterHeader>
        <FilterHeader>
          {viewMode === 'sml' ? (
            <ColumnFilterSelect value={targetFilter} onChange={e => setTargetFilter(e.target.value)} $active={!!targetFilter}>
              <option value="">Vše</option>
              <option value="shoda">Se shodou částky</option>
              <option value="cil">S cílovou OBJ</option>
              <option value="bezcile">Bez cílové OBJ</option>
            </ColumnFilterSelect>
          ) : (
          <ColumnFilterWrapper>
            <ColumnFilterInput
              value={columnFilters.fa_poznamka}
              onChange={e => setFilter('fa_poznamka', e.target.value)}
              placeholder="Hledat..."
              $active={!!columnFilters.fa_poznamka}
            />
            {columnFilters.fa_poznamka && (
              <ColumnClearButton onClick={() => setFilter('fa_poznamka', '')}><FontAwesomeIcon icon={faTimes} /></ColumnClearButton>
            )}
          </ColumnFilterWrapper>
          )}
        </FilterHeader>
        <FilterHeader style={{ textAlign: 'center' }}>
          <IconButton
            title="Vymazat všechny filtry"
            onClick={clearAllFilters}
            disabled={!invoiceFiltersActive && !search && !targetFilter}
          >
            <FontAwesomeIcon icon={faEraser} />
          </IconButton>
        </FilterHeader>
      </tr>
    </>
  );

  const colGroup = (widths) => (
    <colgroup>
      {widths
        ? widths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)
        : (
          <>
            <col style={{ width: '44px' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '95px' }} />
            <col />
            <col style={{ width: '56px' }} />
          </>
        )}
    </colgroup>
  );

  // ---- Render řádků ----
  const renderFakturaRow = (obj, sml, fa) => {
    const selectedFor = selection.get(fa.id);
    const selectedHere = selectedFor === obj.id;
    const selectedElsewhere = selectedFor !== undefined && !selectedHere;
    const otherObjs = (fakturaObjIndex.get(fa.id) || []).filter(o => o.id !== obj.id);
    const diffPolozky = polozkyDiff(obj, fa);
    const shodaPolozky = matchesPolozky(obj, fa);
    const shodaPresna = shodaPolozky && Math.abs(diffPolozky) < 1;
    const diffText = diffPolozky === null ? '' : `${diffPolozky > 0 ? '+' : ''}${Math.round(diffPolozky).toLocaleString('cs-CZ')} Kč`;
    const shodaMax = !shodaPolozky && matchesMaxCena(obj, fa);
    const stavStorno = fa.stav === 'STORNO';
    const koncept = konceptByFa.get(fa.id);
    const pairedHere = koncept?.objednavka_id === obj.id;
    const pairedElsewhere = !!koncept && !pairedHere;

    return (
      <FaRow
        key={`${obj.id}-${fa.id}`}
        $selected={selectedHere}
        $match={shodaPolozky}
        $paired={pairedHere}
        $pairedElsewhere={pairedElsewhere}
        title={shodaPolozky ? `Částka faktury odpovídá součtu položek objednávky (rozdíl ${diffText}, tolerance ±${POLOZKY_TOLERANCE_KC} Kč)` : undefined}
      >
        <TableCell $align="center">
          <CheckboxCenter>
            {koncept ? (
              <FontAwesomeIcon
                icon={faLink}
                style={{ color: pairedHere ? '#0d9488' : '#94a3b8' }}
                title={pairedHere ? 'Spárováno s touto OBJ (koncept)' : `Spárováno s ${objById.get(koncept.objednavka_id)?.cislo_objednavky || 'jinou OBJ'} (koncept)`}
              />
            ) : (
              <Checkbox
                type="checkbox"
                checked={selectedHere}
                onChange={() => toggleInvoice(fa.id, obj.id)}
                title={selectedElsewhere ? `Faktura je vybraná u ${objById.get(selectedFor)?.cislo_objednavky || 'jiné OBJ'} – zaškrtnutím ji přesunete sem` : 'Vybrat fakturu'}
              />
            )}
          </CheckboxCenter>
        </TableCell>
        <TableCell style={{ paddingLeft: '4rem' }} title={fa.fa_cislo_vema}>
          <TreeBranch $color="#c4b5fd" />
          <FontAwesomeIcon icon={faFileInvoice} style={{ color: '#10b981', marginRight: '0.4rem' }} />
          <strong>
            <PreviewLink role="button" title="Zobrazit náhled faktury" onClick={() => openInvoicePreview(fa, obj, sml)}>
              {fa.fa_cislo_vema || '—'}
            </PreviewLink>
          </strong>
          <OpenInFormButton type="button" style={{ marginLeft: '0.2rem' }} onClick={() => openInvoiceInEvidenceForm(fa.id)} title="Otevřít fakturu ve formuláři zaevidování">
            <FontAwesomeIcon icon={faExternalLinkAlt} />
          </OpenInFormButton>
          {otherObjs.length > 0 && (
            <HintBadge
              $bg="#fef3c7"
              $color="#92400e"
              title={`Faktura se nabízí i u: ${otherObjs.map(o => o.cislo_objednavky).join(', ')}`}
            >
              <FontAwesomeIcon icon={faClone} /> +{otherObjs.length} OBJ
            </HintBadge>
          )}
          {(combosByObj.get(obj.id) || []).filter(c => c.faIds.includes(fa.id)).map(c => (
            <HintBadge
              key={c.label}
              $bg="#dcfce7"
              $color="#166534"
              title={`${c.label}: součet ${c.faIds.length} FA ${formatCurrency(c.sum)} ≈ položky OBJ (${COMBO_TYP_LABELS[c.typ]})`}
            >
              <FontAwesomeIcon icon={faLayerGroup} /> {c.label}
            </HintBadge>
          ))}
          {pairedHere && (
            <HintBadge $bg="#0d9488" $color="white" title={`Koncept: ${koncept.vytvoril || ''} ${formatDate(koncept.dt_vytvoreni)} – zatím neuloženo`}>
              <FontAwesomeIcon icon={faLink} /> Spárováno – neuloženo
            </HintBadge>
          )}
          {pairedElsewhere && (
            <HintBadge $bg="#e2e8f0" $color="#475569" title="Faktura je v konceptu spárovaná s jinou objednávkou">
              <FontAwesomeIcon icon={faLink} /> {objById.get(koncept.objednavka_id)?.cislo_objednavky || 'jiná OBJ'}
            </HintBadge>
          )}
          {selectedElsewhere && (
            <HintBadge $bg="#e0e7ff" $color="#3730a3" title="Vybráno u jiné objednávky">
              <FontAwesomeIcon icon={faCheck} /> {objById.get(selectedFor)?.cislo_objednavky}
            </HintBadge>
          )}
        </TableCell>
        <TableCell $align="center">{formatDate(fa.fa_datum_vystaveni)}</TableCell>
        <TableCell $align="center">{formatDate(fa.fa_datum_splatnosti)}</TableCell>
        <TableCell $align="right" style={{ fontWeight: 600 }}>
          {shodaPolozky
            ? <AmountMatch $exact={shodaPresna}>{formatCurrency(fa.fa_castka)}</AmountMatch>
            : formatCurrency(fa.fa_castka)}
          {shodaPolozky && (
            <HintBadge
              $bg={shodaPresna ? '#16a34a' : '#fef9c3'}
              $color={shodaPresna ? 'white' : '#713f12'}
              title={`Součet položek OBJ ${formatCurrency(obj.polozky_cena_s_dph)}, rozdíl ${diffText} (tolerance ±${POLOZKY_TOLERANCE_KC} Kč)`}
            >
              <FontAwesomeIcon icon={faCheck} /> {shodaPresna ? '= položky' : `≈ položky ${diffText}`}
            </HintBadge>
          )}
          {shodaMax && <HintBadge $bg="#f1f5f9" $color="#475569" title="Částka faktury odpovídá max. ceně objednávky">= max</HintBadge>}
        </TableCell>
        <TableCell $align="center">{FA_TYP_LABELS[fa.fa_typ] || fa.fa_typ || '—'}</TableCell>
        <TableCell $align="center">
          <StatusPill
            $bg={stavStorno ? '#fee2e2' : fa.stav === 'DOKONCENA' || fa.stav === 'ZAPLACENO' ? '#dcfce7' : '#e0f2fe'}
            $color={stavStorno ? '#991b1b' : fa.stav === 'DOKONCENA' || fa.stav === 'ZAPLACENO' ? '#166534' : '#075985'}
          >
            {FA_STAV_LABELS[fa.stav] || fa.stav}
          </StatusPill>
        </TableCell>
        <TableCell $align="center">
          {fa.fa_zaplacena ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Ano</span> : <span style={{ color: '#9ca3af' }}>Ne</span>}
        </TableCell>
        <TableCell title={fa.fa_poznamka || ''} style={{ color: '#4b5563' }}>{fa.fa_poznamka || '—'}</TableCell>
        <TableCell $align="center">
          {pairedHere && (
            <IconButton title="Vrátit spárování (koncept)" disabled={actionBusy} onClick={() => handleRevert({ ids: [koncept.id] })}>
              <FontAwesomeIcon icon={faUndo} />
            </IconButton>
          )}
        </TableCell>
      </FaRow>
    );
  };

  // Finanční krytí / čerpání / zůstatek smlouvy (stejná pole jako SmlouvyCerpaniView)
  const renderSmlCerpani = (sml) => {
    const limit = Number(sml.hodnota_s_dph) || 0;
    const cerpano = Number(sml.cerpano_celkem) || 0;
    const zbyva = sml.zbyva !== null && sml.zbyva !== undefined ? Number(sml.zbyva) : limit - cerpano;
    const procento = sml.procento_cerpani !== null && sml.procento_cerpani !== undefined
      ? Number(sml.procento_cerpani)
      : (limit > 0 ? (cerpano / limit) * 100 : null);

    return (
      <>
        <GroupMeta title="Finanční krytí smlouvy s DPH">
          krytí <strong>{limit > 0 ? formatCurrency(limit) : 'bez limitu'}</strong>
        </GroupMeta>
        <GroupMeta title="Čerpáno s DPH">
          čerpáno <strong>{formatCurrency(cerpano)}</strong>
          {limit > 0 && procento !== null && ` (${procento.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} %)`}
        </GroupMeta>
        {limit > 0 && (
          <GroupMeta title="Zůstatek s DPH">
            zbývá <strong style={{ color: zbyva < 0 ? '#dc2626' : '#059669' }}>{formatCurrency(zbyva)}</strong>
          </GroupMeta>
        )}
      </>
    );
  };

  // Řádek s kombinacemi FA sedícími na položky OBJ (sdílí oba pohledy)
  const renderComboRow = (obj, sml, key, { prefix = '', indent } = {}) => {
    const smlCombos = (combosByObj.get(obj.id) || []).filter(c => c.smlIds.includes(sml.id));
    if (smlCombos.length === 0) return null;
    const faById = new Map(sml.faktury.map(f => [f.id, f]));
    return (
      <tr key={key}>
        <ComboRowCell colSpan={COLUMN_COUNT} style={indent ? { paddingLeft: indent } : undefined}>
          {smlCombos.map(c => {
            const diffText = `${c.diff > 0 ? '+' : ''}${Math.round(c.diff).toLocaleString('cs-CZ')} Kč`;
            const comboPairs = c.faIds.map(id => [id, obj.id]);
            const comboSelected = getPairsState(comboPairs).checked;
            return (
              <ComboLine key={c.label}>
                {/* pořadí zprava: čísla FA + částky → popis → Σ → vybrat/zrušit */}
                <span>
                  {c.faIds.map((id, i) => {
                    const f = faById.get(id);
                    return (
                      <React.Fragment key={id}>
                        {i > 0 && ' + '}
                        <strong>{f?.fa_cislo_vema || id}</strong>
                        <span style={{ color: '#4d7c0f' }}> ({formatCurrency(f?.fa_castka)})</span>
                      </React.Fragment>
                    );
                  })}
                  {' = '}<strong>{formatCurrency(c.sum)}</strong>
                  {' '}({Math.abs(c.diff) < 1 ? 'přesně' : diffText} vůči položkám OBJ)
                </span>
                <GroupMeta>
                  {COMBO_TYP_LABELS[c.typ]}{c.datum ? ` ${formatDate(c.datum)}` : ''}
                </GroupMeta>
                <TypeBadge $color="#16a34a"><FontAwesomeIcon icon={faLayerGroup} /> {prefix}{c.label}</TypeBadge>
                <ComboSelectButton
                  type="button"
                  $active={comboSelected}
                  onClick={() => setPairsSelected(comboPairs, !comboSelected)}
                  title={comboSelected ? 'Zrušit výběr faktur této kombinace' : 'Vybrat faktury této kombinace pro tuto objednávku'}
                >
                  {comboSelected ? 'Zrušit výběr' : `Vybrat ${c.faIds.length} FA`}
                </ComboSelectButton>
              </ComboLine>
            );
          })}
        </ComboRowCell>
      </tr>
    );
  };

  // ======================= SML pohled: render =======================
  const changeFaTarget = (faId, objId) => {
    setFaTarget(prev => {
      const next = new Map(prev);
      if (objId) next.set(faId, objId);
      else next.delete(faId);
      return next;
    });
    // Vybraná FA se přesune na novou cílovou OBJ (bez cíle = zrušit výběr)
    setSelection(prev => {
      if (!prev.has(faId)) return prev;
      const next = new Map(prev);
      if (objId) next.set(faId, objId);
      else next.delete(faId);
      return next;
    });
  };

  const renderSmlViewFakturaRow = (group, fa) => {
    const { objs } = group;
    const koncept = konceptByFa.get(fa.id);
    const target = getFaTarget(fa, objs);
    const targetObj = objs.find(o => o.id === target);
    const pairedHere = !!koncept && !!targetObj;
    const selectedHere = !koncept && selection.has(fa.id);
    const matchObjs = objs.filter(o => matchesPolozky(o, fa));
    const comboRefs = objs.flatMap(o => (combosByObj.get(o.id) || [])
      .filter(c => c.faIds.includes(fa.id))
      .map(c => ({ obj: o, combo: c })));
    const shoda = matchObjs.length > 0;
    const shodaPresna = matchObjs.some(o => Math.abs(polozkyDiff(o, fa)) < 1);
    const stavStorno = fa.stav === 'STORNO';

    return (
      <FaRow
        key={`${group.key}-fa-${fa.id}`}
        $selected={selectedHere}
        $match={shoda}
        $paired={pairedHere}
        $pairedElsewhere={!!koncept && !targetObj}
      >
        <TableCell $align="center">
          <CheckboxCenter>
            {koncept ? (
              <FontAwesomeIcon icon={faLink} style={{ color: '#0d9488' }}
                title={`Spárováno s ${objById.get(koncept.objednavka_id)?.cislo_objednavky || 'OBJ'} (koncept)`} />
            ) : (
              <Checkbox
                type="checkbox"
                checked={selectedHere}
                disabled={!target}
                onChange={() => toggleInvoice(fa.id, target)}
                title={target ? `Vybrat fakturu pro ${targetObj?.cislo_objednavky}` : 'Nejdřív vyberte cílovou OBJ (sloupec Přiřadit k OBJ)'}
              />
            )}
          </CheckboxCenter>
        </TableCell>
        <TableCell style={{ paddingLeft: '2.25rem' }} title={fa.fa_cislo_vema}>
          <TreeBranch $color="#c4b5fd" />
          <FontAwesomeIcon icon={faFileInvoice} style={{ color: '#10b981', marginRight: '0.4rem' }} />
          <strong>
            <PreviewLink role="button" title="Zobrazit náhled faktury" onClick={() => openInvoicePreview(fa, targetObj || null, group.sml)}>
              {fa.fa_cislo_vema || '—'}
            </PreviewLink>
          </strong>
          <OpenInFormButton type="button" style={{ marginLeft: '0.2rem' }} onClick={() => openInvoiceInEvidenceForm(fa.id)} title="Otevřít fakturu ve formuláři zaevidování">
            <FontAwesomeIcon icon={faExternalLinkAlt} />
          </OpenInFormButton>
          {comboRefs.map(({ obj, combo }) => (
            <HintBadge key={`${obj.id}-${combo.label}`} $bg="#dcfce7" $color="#166534"
              title={`${combo.label} u ${obj.cislo_objednavky}: součet ${combo.faIds.length} FA ${formatCurrency(combo.sum)} (${COMBO_TYP_LABELS[combo.typ]})`}>
              <FontAwesomeIcon icon={faLayerGroup} /> {obj.letter}·{combo.label}
            </HintBadge>
          ))}
          {pairedHere && (
            <HintBadge $bg="#0d9488" $color="white" title={`Koncept: ${koncept.vytvoril || ''} ${formatDate(koncept.dt_vytvoreni)} – zatím neuloženo`}>
              <FontAwesomeIcon icon={faLink} /> {targetObj.letter} – neuloženo
            </HintBadge>
          )}
        </TableCell>
        <TableCell $align="center">{formatDate(fa.fa_datum_vystaveni)}</TableCell>
        <TableCell $align="center">{formatDate(fa.fa_datum_splatnosti)}</TableCell>
        <TableCell $align="right" style={{ fontWeight: 600 }}>
          {shoda ? <AmountMatch $exact={shodaPresna}>{formatCurrency(fa.fa_castka)}</AmountMatch> : formatCurrency(fa.fa_castka)}
          {matchObjs.map(o => {
            const d = polozkyDiff(o, fa);
            const exact = Math.abs(d) < 1;
            const dText = `${d > 0 ? '+' : ''}${Math.round(d).toLocaleString('cs-CZ')} Kč`;
            return (
              <HintBadge key={o.id} $bg={exact ? '#16a34a' : '#fef9c3'} $color={exact ? 'white' : '#713f12'}
                title={`${o.cislo_objednavky}: součet položek ${formatCurrency(o.polozky_cena_s_dph)}, rozdíl ${dText}`}>
                {exact ? '=' : '≈'} {o.letter}
              </HintBadge>
            );
          })}
        </TableCell>
        <TableCell $align="center">{FA_TYP_LABELS[fa.fa_typ] || fa.fa_typ || '—'}</TableCell>
        <TableCell $align="center">
          <StatusPill
            $bg={stavStorno ? '#fee2e2' : fa.stav === 'DOKONCENA' || fa.stav === 'ZAPLACENO' ? '#dcfce7' : '#e0f2fe'}
            $color={stavStorno ? '#991b1b' : fa.stav === 'DOKONCENA' || fa.stav === 'ZAPLACENO' ? '#166534' : '#075985'}
          >
            {FA_STAV_LABELS[fa.stav] || fa.stav}
          </StatusPill>
        </TableCell>
        <TableCell $align="center">
          {fa.fa_zaplacena ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Ano</span> : <span style={{ color: '#9ca3af' }}>Ne</span>}
        </TableCell>
        <TableCell>
          <TargetSelect
            value={target || ''}
            $hasTarget={!!target}
            disabled={!!koncept}
            onChange={e => changeFaTarget(fa.id, e.target.value ? Number(e.target.value) : null)}
            title={targetObj ? `${targetObj.cislo_objednavky} – ${targetObj.predmet || ''}` : 'Vyberte objednávku'}
          >
            <option value="">— vyberte OBJ —</option>
            {objs.map(o => (
              <option key={o.id} value={o.id}>
                {matchesPolozky(o, fa) ? '✓ ' : ''}{o.letter} · {o.cislo_objednavky} ({o.pocet_polozek ? formatCurrency(o.polozky_cena_s_dph) : 'bez položek'})
              </option>
            ))}
          </TargetSelect>
        </TableCell>
        <TableCell $align="center">
          {koncept && (
            <IconButton title="Vrátit spárování (koncept)" disabled={actionBusy} onClick={() => handleRevert({ ids: [koncept.id] })}>
              <FontAwesomeIcon icon={faUndo} />
            </IconButton>
          )}
        </TableCell>
      </FaRow>
    );
  };

  const renderSmlViewObjRow = (group, obj) => {
    const paired = koncepty.filter(k => k.objednavka_id === obj.id).length;
    const combos = (combosByObj.get(obj.id) || []).filter(c => !group.sml || c.smlIds.includes(group.sml.id));
    const shodyFa = group.faktury.filter(f => matchesPolozky(obj, f)).length;
    return (
      <ObjSubRow key={`${group.key}-obj-${obj.id}`} $anomalie={obj.anomalie}
        title={obj.anomalie ? 'Anomálie: objednávka je za fází Fakturace, ale nemá žádnou fakturu' : undefined}>
        <TableCell style={{ borderBottom: 'none' }} />
        <GroupCell colSpan={COLUMN_COUNT - 1} $indent="2rem">
          <GroupContent>
            <TreeBranch $color="#93c5fd" style={{ marginRight: 0 }} />
            <LetterBadge $bg={obj.anomalie ? '#dc2626' : '#1e40af'} title="Označení OBJ v rámci smlouvy">{obj.letter}</LetterBadge>
            <TypeBadge $color="#1e40af"><FontAwesomeIcon icon={faShoppingCart} /> OBJ</TypeBadge>
            <GroupTitle>
              <PreviewLink role="button" title="Zobrazit náhled objednávky" onClick={() => openOrderPreview(obj.id)}>
                {obj.cislo_objednavky}
              </PreviewLink>
            </GroupTitle>
            <OpenInFormButton type="button" onClick={() => openOrderInFullForm(obj.id)} title="Otevřít objednávku ve formuláři">
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </OpenInFormButton>
            <GroupText $max="340px" title={obj.predmet}>{obj.predmet}</GroupText>
            <PolozkyPill
              $empty={!obj.pocet_polozek}
              title={obj.pocet_polozek
                ? `Součet ${obj.pocet_polozek} položek objednávky s DPH (bez DPH ${formatCurrency(obj.polozky_cena_bez_dph)})`
                : 'Objednávka nemá žádné položky'}
            >
              položky {obj.pocet_polozek ? <strong>{formatCurrency(obj.polozky_cena_s_dph)}</strong> : '—'}
            </PolozkyPill>
            <GroupMeta title="Maximální cena objednávky s DPH">max. {formatCurrency(obj.max_cena_s_dph)}</GroupMeta>
            <GroupMeta>{formatDate(obj.dt_objednavky)}</GroupMeta>
            {obj.objednatel && <GroupMeta>{obj.objednatel}</GroupMeta>}
            <StatusPill $bg={obj.anomalie ? '#dc2626' : '#ede9fe'} $color={obj.anomalie ? 'white' : '#6d28d9'} title={`Stav: ${obj.stav_objednavky || '—'}`}>
              {WORKFLOW_FAZE_LABELS[obj.workflow_faze] || obj.stav_objednavky || '—'}
            </StatusPill>
            {obj.anomalie && (
              <HintBadge $bg="#fee2e2" $color="#991b1b" style={{ marginLeft: 0 }}>
                <FontAwesomeIcon icon={faExclamationTriangle} /> Bez faktury za fází Fakturace
              </HintBadge>
            )}
            {shodyFa > 0 && (
              <HintBadge $bg="#fef9c3" $color="#713f12" style={{ marginLeft: 0 }} title="Počet FA, jejichž částka sedí na součet položek (±250 Kč)">
                <FontAwesomeIcon icon={faCheck} /> {shodyFa} FA sedí
              </HintBadge>
            )}
            {combos.length > 0 && (
              <HintBadge $bg="#dcfce7" $color="#166534" style={{ marginLeft: 0 }}>
                <FontAwesomeIcon icon={faLayerGroup} /> Kombinace FA sedí ({combos.length})
              </HintBadge>
            )}
            {paired > 0 && (
              <HintBadge $bg="#0d9488" $color="white" style={{ marginLeft: 'auto' }}>
                <FontAwesomeIcon icon={faLink} /> {paired} spárováno
              </HintBadge>
            )}
          </GroupContent>
        </GroupCell>
      </ObjSubRow>
    );
  };

  const renderSmlGroup = (group) => {
    const { sml, objs } = group;
    const isCollapsed = collapsed.has(group.key);
    const groupPairs = smlGroupPairs(group);
    const groupState = getPairsState(groupPairs);

    const rows = [
      <ObjRow key={group.key} $anomalie={group.anomalie} style={{ background: group.anomalie ? undefined : 'linear-gradient(90deg, #ede9fe 0%, #f5f3ff 60%, #f8fafc 100%)', borderTopColor: group.anomalie ? undefined : '#c4b5fd' }}>
        <TableCell $align="center" style={{ borderBottom: 'none' }}>
          <CheckboxCenter>
            <Checkbox
              type="checkbox"
              title="Vybrat všechny faktury této smlouvy (s cílovou OBJ)"
              checked={groupState.checked}
              ref={el => { if (el) el.indeterminate = groupState.indeterminate; }}
              onChange={e => setPairsSelected(groupPairs, e.target.checked)}
              disabled={groupState.disabled}
            />
          </CheckboxCenter>
        </TableCell>
        <GroupCell colSpan={COLUMN_COUNT - 1}>
          <GroupContent>
            <ExpandButton onClick={() => toggleCollapsed(group.key)} title={isCollapsed ? 'Rozbalit' : 'Sbalit'}>
              <FontAwesomeIcon icon={isCollapsed ? faPlus : faMinus} fixedWidth />
            </ExpandButton>
            <TypeBadge $color="#7c3aed"><FontAwesomeIcon icon={faFileContract} /> SML</TypeBadge>
            {sml ? (
              <>
                <GroupTitle>
                  <PreviewLink role="button" title="Zobrazit náhled smlouvy" onClick={() => openSmlouvaPreview(sml)}>
                    {sml.cislo_smlouvy}
                  </PreviewLink>
                </GroupTitle>
                <OpenInFormButton type="button" onClick={() => openSmlouvaInEditForm(sml)} title="Otevřít smlouvu ve formuláři">
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                </OpenInFormButton>
                <GroupText $max="340px" title={sml.nazev_smlouvy}>{sml.nazev_smlouvy}</GroupText>
                <GroupMeta title={sml.ico ? `IČO ${sml.ico}` : ''}>{sml.nazev_firmy}</GroupMeta>
                <GroupMeta>{formatDate(sml.platnost_od)} – {formatDate(sml.platnost_do)}</GroupMeta>
                {renderSmlCerpani(sml)}
                {sml.stav && sml.stav !== 'AKTIVNI' && <StatusPill $bg="#fef3c7" $color="#92400e">{sml.stav}</StatusPill>}
              </>
            ) : (
              <>
                <GroupTitle>{group.cisloSmlouvy || '(nevyplněno)'}</GroupTitle>
                <HintBadge $bg="#fef3c7" $color="#92400e" style={{ marginLeft: 0 }}>
                  <FontAwesomeIcon icon={faExclamationTriangle} /> Smlouva nebyla v evidenci nalezena
                </HintBadge>
              </>
            )}
            <CountPill $zero={false} style={{ background: '#1e40af' }}>{objs.length} OBJ</CountPill>
            <CountPill $zero={group.visibleFaktury.length === 0} style={{ marginLeft: 0, background: group.visibleFaktury.length ? '#7c3aed' : undefined }}>
              {group.visibleFaktury.length}{group.visibleFaktury.length !== group.faktury.length ? ` / ${group.faktury.length}` : ''} FA bez OBJ
            </CountPill>
          </GroupContent>
        </GroupCell>
      </ObjRow>
    ];

    if (isCollapsed) return rows;

    objs.forEach(obj => {
      rows.push(renderSmlViewObjRow(group, obj));
      if (sml) {
        const comboRow = renderComboRow(obj, sml, `${group.key}-obj-${obj.id}-combos`, { prefix: `${obj.letter}·`, indent: '5rem' });
        if (comboRow) rows.push(comboRow);
      }
    });

    if (group.visibleFaktury.length === 0) {
      rows.push(
        <tr key={`${group.key}-empty`}>
          <EmptyRowCell colSpan={COLUMN_COUNT} style={{ paddingLeft: '5rem' }}>
            {group.faktury.length === 0 ? 'Ke smlouvě nejsou žádné faktury bez objednávky.' : 'Žádná faktura neodpovídá filtrům.'}
          </EmptyRowCell>
        </tr>
      );
    } else {
      group.visibleFaktury.forEach(fa => rows.push(renderSmlViewFakturaRow(group, fa)));
    }

    return rows;
  };

  const renderGroup = (obj) => {
    const isCollapsed = collapsed.has(obj.id);
    const groupPairs = obj.smlouvy.flatMap(s => s.visibleFaktury.map(f => [f.id, obj.id]));
    const groupState = getPairsState(groupPairs);
    const strediska = parseStrediska(obj.strediska_kod);

    const rows = [
      <ObjRow
        key={`obj-${obj.id}`}
        $anomalie={obj.anomalie}
        title={obj.anomalie ? 'Anomálie: objednávka je za fází Fakturace, ale nemá žádnou fakturu' : undefined}
      >
        <TableCell $align="center" style={{ borderBottom: 'none' }}>
          <CheckboxCenter>
            <Checkbox
              type="checkbox"
              title="Vybrat všechny faktury této objednávky"
              checked={groupState.checked}
              ref={el => { if (el) el.indeterminate = groupState.indeterminate; }}
              onChange={e => setPairsSelected(groupPairs, e.target.checked)}
              disabled={groupState.disabled}
            />
          </CheckboxCenter>
        </TableCell>
        <GroupCell colSpan={COLUMN_COUNT - 1}>
          <GroupContent>
            <ExpandButton onClick={() => toggleCollapsed(obj.id)} title={isCollapsed ? 'Rozbalit' : 'Sbalit'}>
              <FontAwesomeIcon icon={isCollapsed ? faPlus : faMinus} fixedWidth />
            </ExpandButton>
            <TypeBadge $color="#1e40af"><FontAwesomeIcon icon={faShoppingCart} /> OBJ</TypeBadge>
            <GroupTitle>
              <PreviewLink role="button" title="Zobrazit náhled objednávky" onClick={() => openOrderPreview(obj.id)}>
                {obj.cislo_objednavky}
              </PreviewLink>
            </GroupTitle>
            <OpenInFormButton type="button" onClick={() => openOrderInFullForm(obj.id)} title="Otevřít objednávku ve formuláři">
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </OpenInFormButton>
            <GroupText $max="420px" title={obj.predmet}>{obj.predmet}</GroupText>
            <GroupMeta title={obj.dodavatel_ico ? `IČO ${obj.dodavatel_ico}` : ''}>{obj.dodavatel_nazev || '—'}</GroupMeta>
            <PolozkyPill
              $empty={!obj.pocet_polozek}
              title={obj.pocet_polozek
                ? `Součet ${obj.pocet_polozek} položek objednávky s DPH (bez DPH ${formatCurrency(obj.polozky_cena_bez_dph)})`
                : 'Objednávka nemá žádné položky'}
            >
              položky {obj.pocet_polozek ? <strong>{formatCurrency(obj.polozky_cena_s_dph)}</strong> : '—'}
            </PolozkyPill>
            <GroupMeta title="Maximální cena objednávky s DPH">max. {formatCurrency(obj.max_cena_s_dph)}</GroupMeta>
            <GroupMeta>{formatDate(obj.dt_objednavky)}</GroupMeta>
            {obj.objednatel && <GroupMeta>{obj.objednatel}</GroupMeta>}
            {strediska && <GroupMeta title="Střediska">{strediska}</GroupMeta>}
            <StatusPill
              $bg={obj.anomalie ? '#dc2626' : '#ede9fe'}
              $color={obj.anomalie ? 'white' : '#6d28d9'}
              title={`Stav: ${obj.stav_objednavky || '—'}`}
            >
              {WORKFLOW_FAZE_LABELS[obj.workflow_faze] || obj.stav_objednavky || '—'}
            </StatusPill>
            {(combosByObj.get(obj.id) || []).length > 0 && (
              <HintBadge $bg="#dcfce7" $color="#166534" style={{ marginLeft: 0 }} title="Součet více faktur odpovídá součtu položek objednávky">
                <FontAwesomeIcon icon={faLayerGroup} /> Kombinace FA sedí ({combosByObj.get(obj.id).length})
              </HintBadge>
            )}
            {obj.anomalie && (
              <HintBadge $bg="#fee2e2" $color="#991b1b" style={{ marginLeft: 0 }}>
                <FontAwesomeIcon icon={faExclamationTriangle} /> Bez faktury za fází Fakturace
              </HintBadge>
            )}
            {koncepty.some(k => k.objednavka_id === obj.id) && (
              <HintBadge $bg="#0d9488" $color="white" style={{ marginLeft: 'auto' }}>
                <FontAwesomeIcon icon={faLink} /> {koncepty.filter(k => k.objednavka_id === obj.id).length} spárováno
              </HintBadge>
            )}
            <CountPill $zero={obj.visibleCount === 0} style={koncepty.some(k => k.objednavka_id === obj.id) ? { marginLeft: 0 } : undefined}>{obj.visibleCount} FA</CountPill>
          </GroupContent>
        </GroupCell>
      </ObjRow>
    ];

    if (isCollapsed) return rows;

    if (obj.smlouvy.length === 0) {
      rows.push(
        <tr key={`obj-${obj.id}-nosml`}>
          <WarningRowCell colSpan={COLUMN_COUNT}>
            <FontAwesomeIcon icon={faExclamationTriangle} />
            Smlouva <strong>{obj.cislo_smlouvy || '(nevyplněno)'}</strong> z financování objednávky nebyla v evidenci smluv nalezena.
          </WarningRowCell>
        </tr>
      );
      return rows;
    }

    obj.smlouvy.forEach(sml => {
      const smlPairs = sml.visibleFaktury.map(f => [f.id, obj.id]);
      const smlState = getPairsState(smlPairs);
      rows.push(
        <SmlRow key={`obj-${obj.id}-sml-${sml.id}`}>
          <TableCell $align="center" style={{ borderBottom: 'none' }}>
            <CheckboxCenter>
              <Checkbox
                type="checkbox"
                title="Vybrat všechny faktury této smlouvy"
                checked={smlState.checked}
                ref={el => { if (el) el.indeterminate = smlState.indeterminate; }}
                onChange={e => setPairsSelected(smlPairs, e.target.checked)}
                disabled={smlState.disabled}
              />
            </CheckboxCenter>
          </TableCell>
          <GroupCell colSpan={COLUMN_COUNT - 1} $indent="2rem">
            <GroupContent>
              <TreeBranch $color="#93c5fd" style={{ marginRight: 0 }} />
              <TypeBadge $color="#7c3aed"><FontAwesomeIcon icon={faFileContract} /> SML</TypeBadge>
              <GroupTitle>
                <PreviewLink role="button" title="Zobrazit náhled smlouvy" onClick={() => openSmlouvaPreview(sml)}>
                  {sml.cislo_smlouvy}
                </PreviewLink>
              </GroupTitle>
              <OpenInFormButton type="button" onClick={() => openSmlouvaInEditForm(sml)} title="Otevřít smlouvu ve formuláři">
                <FontAwesomeIcon icon={faExternalLinkAlt} />
              </OpenInFormButton>
              <GroupText $max="380px" title={sml.nazev_smlouvy}>{sml.nazev_smlouvy}</GroupText>
              <GroupMeta title={sml.ico ? `IČO ${sml.ico}` : ''}>{sml.nazev_firmy}</GroupMeta>
              <GroupMeta>{formatDate(sml.platnost_od)} – {formatDate(sml.platnost_do)}</GroupMeta>
              {renderSmlCerpani(sml)}
              {sml.usek_zkr && <GroupMeta>úsek {sml.usek_zkr}</GroupMeta>}
              {sml.stav && sml.stav !== 'AKTIVNI' && <StatusPill $bg="#fef3c7" $color="#92400e">{sml.stav}</StatusPill>}
              <CountPill $zero={sml.visibleFaktury.length === 0} style={{ background: sml.visibleFaktury.length ? '#7c3aed' : undefined }}>
                {sml.visibleFaktury.length}{sml.visibleFaktury.length !== sml.faktury.length ? ` / ${sml.faktury.length}` : ''} FA bez OBJ
              </CountPill>
            </GroupContent>
          </GroupCell>
        </SmlRow>
      );

      const comboRow = renderComboRow(obj, sml, `obj-${obj.id}-sml-${sml.id}-combos`);
      if (comboRow) rows.push(comboRow);

      if (sml.visibleFaktury.length === 0) {
        rows.push(
          <tr key={`obj-${obj.id}-sml-${sml.id}-empty`}>
            <EmptyRowCell colSpan={COLUMN_COUNT}>
              {sml.faktury.length === 0 ? 'Ke smlouvě nejsou žádné faktury bez objednávky.' : 'Žádná faktura neodpovídá filtrům.'}
            </EmptyRowCell>
          </tr>
        );
      } else {
        sml.visibleFaktury.forEach(fa => rows.push(renderFakturaRow(obj, sml, fa)));
      }
    });

    return rows;
  };

  const souhrn = data.souhrn;
  const from = activeGroups.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, activeGroups.length);

  return (
    <PageWrapper>
      <PageHeader>
        <TitleGroup>
          <PageTitle>
            <FontAwesomeIcon icon={faScrewdriverWrench} /> Opravy <BetaBadge>BETA</BetaBadge>
          </PageTitle>
          <PageSubtitle>
            Ruční opravy vazeb v datech. Objednávky financované ze smlouvy ve fázi Fakturace a vyšší bez faktury, jejich smlouvy
            a faktury napojené přímo na smlouvu bez objednávky (SML-FA) – kandidáti na přeřazení na OBJ-SML-FA.
          </PageSubtitle>
        </TitleGroup>
        <TooltipWrapper text="Obnovit data" preferredPosition="bottom">
          <RefreshIconButton onClick={loadData} disabled={loading}>
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
          </RefreshIconButton>
        </TooltipWrapper>
      </PageHeader>

      <TabsContainer>
        <TabButton $active={activeTab === 'opravy'} onClick={() => setActiveTab('opravy')}>
          <FontAwesomeIcon icon={faShoppingCart} /> OBJ ze smlouvy → SML → FA bez OBJ
        </TabButton>
        <TabButton $active={activeTab === 'historie'} onClick={() => setActiveTab('historie')}>
          <FontAwesomeIcon icon={faHistory} /> Historie oprav
        </TabButton>
      </TabsContainer>

      {activeTab === 'historie' && (
        <OpravyHistorie token={token} username={username} showToast={showToast} onChanged={loadData} />
      )}

      {activeTab === 'opravy' && souhrn && (
        <StatsRow>
          <StatCard $color="#2196f3">
            <StatHeader>
              <StatValue>{souhrn.pocet_objednavek}</StatValue>
              <StatIcon $color="#2196f3"><FontAwesomeIcon icon={faFileAlt} /></StatIcon>
            </StatHeader>
            <StatLabel>OBJ ve fakturaci bez FA</StatLabel>
          </StatCard>
          <StatCard
            $color="#dc2626"
            $clickable
            $isActive={onlyAnomalie}
            onClick={() => setOnlyAnomalie(prev => !prev)}
            title="Filtr: jen objednávky za fází Fakturace bez faktury"
          >
            <StatHeader>
              <StatValue style={{ color: souhrn.pocet_anomalii > 0 ? '#dc2626' : undefined }}>{souhrn.pocet_anomalii || 0}</StatValue>
              <StatIcon $color="#dc2626">⚠️</StatIcon>
            </StatHeader>
            <StatLabel>Anomálie – zkontrolované bez FA</StatLabel>
          </StatCard>
          <StatCard $color="#059669">
            <StatHeader>
              <StatValue>{souhrn.pocet_smluv}</StatValue>
              <StatIcon $color="#059669"><FontAwesomeIcon icon={faFileContract} /></StatIcon>
            </StatHeader>
            <StatLabel>Dotčené smlouvy</StatLabel>
          </StatCard>
          <StatCard $color="#6366f1">
            <StatHeader>
              <StatValue>{souhrn.pocet_faktur}</StatValue>
              <StatIcon $color="#6366f1"><FontAwesomeIcon icon={faFileInvoice} /></StatIcon>
            </StatHeader>
            <StatLabel>FA na SML bez OBJ</StatLabel>
          </StatCard>
          <StatCard
            $color="#16a34a"
            $clickable
            $isActive={onlyShoda}
            onClick={() => setOnlyShoda(prev => !prev)}
            title="Filtr: jen OBJ, kde částka FA nebo kombinace FA sedí na součet položek (±250 Kč)"
          >
            <StatHeader>
              <StatValue>{pocetObjSeShodou}</StatValue>
              <StatIcon $color="#16a34a"><FontAwesomeIcon icon={faLayerGroup} /></StatIcon>
            </StatHeader>
            <StatLabel>OBJ se shodou částky</StatLabel>
          </StatCard>
          <StatCard $color="#0d9488">
            <StatHeader>
              <StatValue>{koncepty.length}</StatValue>
              <StatIcon $color="#0d9488"><FontAwesomeIcon icon={faLink} /></StatIcon>
            </StatHeader>
            <StatLabel>Spárováno – neuloženo</StatLabel>
          </StatCard>
          <StatCard $color="#10b981">
            <StatHeader>
              <StatValue>{selectedCount}</StatValue>
              <StatIcon $color="#10b981"><FontAwesomeIcon icon={faCheckCircle} /></StatIcon>
            </StatHeader>
            <StatLabel>Vybrané faktury</StatLabel>
          </StatCard>
        </StatsRow>
      )}

      {activeTab === 'opravy' && (
      <ContentCard>
        <Toolbar>
          <ViewSwitch title="Přepnout pohled tabulky">
            <ViewSwitchButton type="button" $active={viewMode === 'obj'} onClick={() => setViewMode('obj')}>
              OBJ → SML → FA
            </ViewSwitchButton>
            <ViewSwitchButton type="button" $active={viewMode === 'sml'} onClick={() => setViewMode('sml')}>
              SML → OBJ → FA
            </ViewSwitchButton>
          </ViewSwitch>
          <SearchWrapper>
            <FontAwesomeIcon icon={faSearch} />
            <SearchInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Hledat OBJ / SML – číslo, předmět, dodavatel, IČO…"
            />
            {search && (
              <InputClearButton onClick={() => setSearch('')} title="Vymazat"><FontAwesomeIcon icon={faTimes} /></InputClearButton>
            )}
          </SearchWrapper>
          <ToggleLabel>
            <Checkbox type="checkbox" checked={onlyAnomalie} onChange={e => setOnlyAnomalie(e.target.checked)} />
            <span style={{ color: '#b91c1c', fontWeight: 600 }}>Jen anomálie (za fází Fakturace bez FA)</span>
          </ToggleLabel>
          <ToggleLabel>
            <Checkbox type="checkbox" checked={onlyWithFaktury} onChange={e => setOnlyWithFaktury(e.target.checked)} />
            Jen OBJ s kandidátními FA
          </ToggleLabel>
          <ToggleLabel>
            <Checkbox type="checkbox" checked={onlyShoda} onChange={e => setOnlyShoda(e.target.checked)} />
            <span style={{ color: '#15803d', fontWeight: 600 }}>Jen OBJ se shodou částky</span>
          </ToggleLabel>
          <ToggleLabel>
            <Checkbox type="checkbox" checked={showPaired} onChange={e => setShowPaired(e.target.checked)} />
            <span style={{ color: '#0f766e', fontWeight: 600 }}>Zobrazit spárované</span>
          </ToggleLabel>
          <ToolbarSpacer />
          <ActionButton onClick={() => setAllCollapsed(false)} title="Rozbalit vše">
            <FontAwesomeIcon icon={faPlusSquare} />
          </ActionButton>
          <ActionButton onClick={() => setAllCollapsed(true)} title="Sbalit vše">
            <FontAwesomeIcon icon={faMinusSquare} />
          </ActionButton>
          {selectedCount > 0 && (
            <ActionButton onClick={() => setSelection(new Map())} title="Zrušit výběr">
              <FontAwesomeIcon icon={faTimes} /> Zrušit výběr
            </ActionButton>
          )}
          <ActionButton $primary disabled={selectedCount === 0 || actionBusy} onClick={handlePair} title="Spárovat vybrané FA s objednávkou (koncept, lze vrátit)">
            <FontAwesomeIcon icon={faLink} /> Spárovat s OBJ{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </ActionButton>
          {koncepty.length > 0 && (
            <>
              <ActionButton disabled={actionBusy} onClick={() => handleRevert({ all: true })} title="Vrátit všechna neuložená spárování" style={{ borderColor: '#dc2626', color: '#b91c1c' }}>
                <FontAwesomeIcon icon={faUndo} /> Vrátit vše
              </ActionButton>
              <ActionButton
                $primary
                disabled={actionBusy}
                onClick={() => setCommitDialogOpen(true)}
                style={{ background: '#0d9488', borderColor: '#0d9488' }}
                title="Zapsat spárování do faktur (SML → OBJ)"
              >
                <FontAwesomeIcon icon={faSave} /> Uložit změny natrvalo ({koncepty.length})
              </ActionButton>
            </>
          )}
        </Toolbar>

        {error ? (
          <StateBox style={{ color: '#b91c1c' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} />{error}
          </StateBox>
        ) : (
          <TableWrapper>
            <Table ref={tableRef}>
              {colGroup()}
              <TableHead>{renderHeaderRows()}</TableHead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={COLUMN_COUNT}><StateBox><FontAwesomeIcon icon={faSpinner} spin />Načítám data…</StateBox></td></tr>
                ) : pagedGroups.length === 0 ? (
                  <tr><td colSpan={COLUMN_COUNT}><StateBox>{viewMode === 'sml' ? 'Žádné smlouvy' : 'Žádné objednávky'} neodpovídají zadaným filtrům.</StateBox></td></tr>
                ) : (
                  pagedGroups.flatMap(viewMode === 'sml' ? renderSmlGroup : renderGroup)
                )}
              </tbody>
            </Table>
          </TableWrapper>
        )}

        <PaginationContainer>
          <PaginationInfo>
            Zobrazeno {from}–{to} z {activeGroups.length} {viewMode === 'sml' ? 'smluv' : 'objednávek'}
            {viewMode === 'obj' && ` (${allVisiblePairs.length} faktur po filtraci)`}
          </PaginationInfo>
          <PaginationControls>
            <PageSizeSelect value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / stránka</option>)}
            </PageSizeSelect>
            <PageButton onClick={() => setPage(1)} disabled={currentPage <= 1}>«</PageButton>
            <PageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>‹</PageButton>
            <PaginationInfo>Stránka {currentPage} / {pageCount}</PaginationInfo>
            <PageButton onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}>›</PageButton>
            <PageButton onClick={() => setPage(pageCount)} disabled={currentPage >= pageCount}>»</PageButton>
          </PaginationControls>
        </PaginationContainer>
      </ContentCard>
      )}

      <ConfirmDialog
        isOpen={commitDialogOpen}
        onClose={() => !actionBusy && setCommitDialogOpen(false)}
        onConfirm={handleCommit}
        title="Uložit změny natrvalo"
        icon={faSave}
        variant="success"
        confirmText={actionBusy ? 'Ukládám…' : `Uložit ${koncepty.length}`}
        message={(
          <div>
            <p>Faktury se přepojí ze smlouvy na objednávku (SML-FA → OBJ-SML-FA). Mění se jen vazba, nic jiného:</p>
            <ul style={{ margin: '8px 0', paddingLeft: '1.2rem', maxHeight: '240px', overflowY: 'auto' }}>
              {koncepty.slice(0, 30).map(k => {
                const o = objById.get(k.objednavka_id);
                const fa = o?.smlouvy.flatMap(sm => sm.faktury).find(f => f.id === k.faktura_id);
                return (
                  <li key={k.id}>
                    <strong>{o?.cislo_objednavky || `OBJ #${k.objednavka_id}`}</strong> ← FA {fa?.fa_cislo_vema || `#${k.faktura_id}`}
                    {fa ? ` (${formatCurrency(fa.fa_castka)})` : ''}
                  </li>
                );
              })}
              {koncepty.length > 30 && <li>… a dalších {koncepty.length - 30}</li>}
            </ul>
            <p style={{ color: '#64748b' }}>Uložené opravy lze později vrátit v záložce Historie oprav.</p>
          </div>
        )}
      />

      <SlideInDetailPanel
        isOpen={orderPreview.open}
        onClose={() => setOrderPreview(prev => ({ ...prev, open: false }))}
        entityType="orders_2025"
        entityId={orderPreview.orderId}
        loading={orderPreview.loading}
        numberLabel={orderPreview.data?.cislo_objednavky}
      >
        {orderPreview.error && <ErrorMessage>{orderPreview.error}</ErrorMessage>}
        {!orderPreview.error && orderPreview.data && (
          <OrderFormReadOnly orderData={orderPreview.data} isReadOnlyMode token={token} username={username} />
        )}
      </SlideInDetailPanel>

      <SlideInDetailPanel
        isOpen={invoicePreview.open}
        onClose={() => setInvoicePreview(prev => ({ ...prev, open: false }))}
        entityType="invoices"
        entityId={invoicePreview.faktura?.id}
        loading={false}
        numberLabel={invoicePreview.faktura?.fa_cislo_vema}
      >
        {invoicePreview.faktura && (
          <FakturaQuickView faktura={invoicePreview.faktura} obj={invoicePreview.obj} sml={invoicePreview.sml} />
        )}
      </SlideInDetailPanel>

      <SlideInDetailPanel
        isOpen={smlouvaPreview.open}
        onClose={() => setSmlouvaPreview(prev => ({ ...prev, open: false }))}
        entityType="contracts"
        entityId={smlouvaPreview.smlouvaId}
        loading={smlouvaPreview.loading}
        numberLabel={smlouvaPreview.data?.cislo_smlouvy || smlouvaPreview.cislo}
      >
        {smlouvaPreview.error && <ErrorMessage>{smlouvaPreview.error}</ErrorMessage>}
        {!smlouvaPreview.error && smlouvaPreview.data && <SmlouvaPreview smlouvaData={smlouvaPreview.data} />}
      </SlideInDetailPanel>

      {showFloatingHeader && ReactDOM.createPortal(
        <FloatingHeaderPanel
          $visible={showFloatingHeader}
          style={{ left: `${floatingLayout.left}px`, width: `${floatingLayout.width}px` }}
        >
          <Table style={{ width: `${floatingLayout.colWidths.reduce((a, b) => a + b, 0)}px` }}>
            {colGroup(floatingLayout.colWidths)}
            <TableHead>{renderHeaderRows()}</TableHead>
          </Table>
        </FloatingHeaderPanel>,
        document.body
      )}
    </PageWrapper>
  );
};

export default OpravyPage;
