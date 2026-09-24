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
import { useNavigate, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding, faFileInvoice, faFileContract, faSearch, faTimes,
  faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
  faChevronDown, faChevronUp, faUpload, faCheckCircle, faPlus, faMinus, faBoltLightning, faFilterCircleXmark,
  faMoneyBill, faCalendar, faIdCard, faFileAlt, faExternalLinkAlt
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
import { loadVemaFirmy, loadVemaFaktury, loadVemaSmlouvy, loadEeoFakturyBezVema, formatExcelDate, excelSerialToDate, uploadVemaFiles, truncateVemaData } from '../services/apiVema';
import VemaKontrolaCell from '../components/VemaKontrolaCell';
import { getVemaFakturaPropojeni, getVemaObjednavkyFaktury, getVemaSmlouvyFaktury, getVemaBetaGroupedList, getVemaSmlGroupedList, getVemaPrehledVazeb } from '../services/apiVemaPropojeni';
import { fetchLimitovanePrisliby } from '../services/api2auth';
import { KONTROLA_STATUS, KONTROLA_STATUS_LABELS, KONTROLA_STATUS_COLORS, normalizeKontrolaStatus, saveVemaRucniVazba, batchGetVemaKontrola, vemaKontrolaBatchKey } from '../services/apiVemaKontrola';
import { getStatusColor } from '../constants/orderStatusColors';
import { getOrderSystemStatus } from '../utils/orderStatsUtils';
import SlideInDetailPanel from '../components/UniversalSearch/SlideInDetailPanel';
import OrderFormReadOnly from '../components/OrderFormReadOnly';
import SmlouvaPreview from '../components/SmlouvaPreview';
import { getOrderV2 } from '../services/apiOrderV2';
import { getSmlouvyList, getSmlouvaDetail } from '../services/apiSmlouvy';

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

// ============================================================================
// KONTROLA OBJ BETA - Seskupený pohled (vazební skupiny)
// ============================================================================

// Barvy verdiktu shody kandidátů - pojmově oddělené od KONTROLA_STATUS_COLORS
// (shoda faktura/objednávka není totéž jako stav ruční kontroly), i když sdílí paletu appky.
const VERDICT_COLORS = {
  good: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  warn: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  bad: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
};

const TICK_COLORS = {
  ok: '#22c55e',
  no: '#ef4444',
  unk: '#94a3b8',
};

// Překlad stavů EEO faktury (25a_faktury.stav) do češtiny.
const FAKTURA_STAV_LABELS = {
  'ZAEVIDOVANA': 'Zaevidována',
  'VECNA_SPRAVNOST': 'Věcná správnost',
  'V_RESENI': 'V řešení',
  'PREDANA_PO': 'Předána PO',
  'K_ZAPLACENI': 'K zaplacení',
  'ZAPLACENO': 'Zaplaceno',
  'DOKONCENA': 'Dokončena',
  'STORNO': 'Storno'
};

// Typ EEO faktury (25a_objednavky_faktury.fa_typ) - stejný číselník jako
// jinde v EEO (viz např. StatsReportsPage.js), doplněno o 'INERNI' (skutečná
// hodnota v DB, pravděpodobně překlep za "interní", ponecháno beze změny).
const FAKTURA_TYP_LABELS = {
  'BEZNA': 'Běžná',
  'ZALOHOVA': 'Zálohová',
  'OPRAVNA': 'Opravná',
  'PROFORMA': 'Proforma',
  'DOBROPIS': 'Dobropis',
  'VYUCTOVACI': 'Vyúčtovací',
  'INERNI': 'Interní',
  'JINA': 'Jiná'
};

// Typ dokladu VEMA (25v_fpazahl.typdok, sloupec J v exportu) - číselník podle VEMA.
const VEMA_TYPDOK_LABELS = {
  1: 'Běžná FA',
  2: 'Dobropis',
  4: 'Zálohová faktura',
  5: 'Zúčtovací faktura',
  9: 'Vrácení peněz',
};
const VEMA_TYPDOK_ZALOHOVA = 4;

// Volby řazení VEMA dokladů uvnitř fan/matrix karet (Kontrola OBJ BETA) -
// getValue vrací číselnou hodnotu k porovnání, nebo null když doklad danou
// hodnotu nemá (takové doklady vždy propadnou na konec, viz
// compareInvoiceRowsByField). defaultDir je směr, který se nastaví při
// prvním kliku na dané pole (a používá se i jako dorovnávací kritérium,
// když je pole jen "vedlejší", ne to podle kterého se právě řadí).
const DOKLADY_SORT_FIELDS = {
  castka: {
    label: 'Částka',
    defaultDir: 'desc', // nejvyšší částka první
    getValue: (row) => {
      const v = Number(row.original?.celkem);
      return Number.isFinite(v) ? v : null;
    },
  },
  datum: {
    label: 'Datum vystavení',
    defaultDir: 'asc', // chronologicky, nejstarší první
    getValue: (row) => {
      const d = parseFlexibleDate(row.original?.dof) || parseFlexibleDate(row.original?.datpri);
      return d ? d.getTime() : null;
    },
  },
  typ: {
    label: 'Typ dokladu',
    defaultDir: 'asc', // zálohová (4) před zúčtovací (5) - odpovídá chronologii
    getValue: (row) => {
      const t = Number(row.original?.typdok);
      return Number.isFinite(t) ? t : null;
    },
  },
};
const DOKLADY_SORT_FIELD_ORDER = ['castka', 'datum', 'typ'];

const ViewModeToggleBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  padding: 3px;
  margin-bottom: 1rem;
`;

const ViewModeButton = styled.button`
  border: 0;
  background: ${props => props.$active ? '#ffffff' : 'transparent'};
  color: ${props => props.$active ? '#202d65' : '#64748b'};
  box-shadow: ${props => props.$active ? '0 1px 2px rgba(27,36,48,0.1)' : 'none'};
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.5rem 0.875rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: #202d65;
  }
`;

const VazebniSkupinaCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  container-type: inline-size;
`;

const GroupsSectionLabel = styled.h4`
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #94a3b8;
  margin: 0 0 0.5rem 0;
`;

const MatrixGroupsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

// Jednoznačné 1:1/1:N páry nepotřebují celou šířku obrazovky - dlaždice
// vedle sebe se lépe čtou a nenechávají zbytečně prázdné místo. Minimální
// šířka sloupce musí stačit i na to, aby se VEMA a EEO strana uvnitř karty
// (SimplePairCard) vešly na jeden řádek vedle sebe - jinak SimplePairCard
// zalomí a VEMA/EEO skončí pod sebou místo vedle sebe.
//
// DŮLEŽITÉ: auto-fit, ne auto-fill! Rozdíl je jemný, ale právě opačný než
// bychom chtěli: auto-fill si i pro jedinou dlaždici v řádku podrží
// prázdné "neviditelné" sloupce o šířce minmax() navíc, takže se ten jeden
// skutečný sloupec nikdy nenatáhne přes 1fr a zbytek řádku zůstane prázdný
// (přesně tenhle efekt viděl uživatel na širokém monitoru). auto-fit
// prázdné sloupce zruší, takže existující dlaždice se 1fr skutečně
// roztáhnou a vyplní celou dostupnou šířku - a teprve když se jich vejde
// víc vedle sebe, zalomí se do dalšího řádku.
const SimpleTileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(760px, 1fr));
  gap: 0.75rem;
`;

const VazebniSkupinaStripe = styled.div`
  height: 4px;
  width: 100%;
  background: ${props => {
    if (props.$verdict === 'good') return VERDICT_COLORS.good.border;
    if (props.$verdict === 'bad') return VERDICT_COLORS.bad.border;
    if (props.$verdict === 'warn') return VERDICT_COLORS.warn.border;
    return `repeating-linear-gradient(90deg, ${VERDICT_COLORS.good.border} 0 24px, ${VERDICT_COLORS.warn.border} 24px 48px, ${VERDICT_COLORS.bad.border} 48px 72px)`;
  }};
`;

const VazebniSkupinaBody = styled.div`
  padding: 1rem 1.25rem 1.25rem;
`;

const VazebniSkupinaHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.875rem;
`;

const VazebniSkupinaTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.2rem 0;
`;

const VazebniSkupinaSub = styled.p`
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
  max-width: 60ch;
  line-height: 1.5;
`;

// Souhrn objednávky v záhlaví fan-karty (vytvořeno/objednáno/schváleno,
// objednatel, schvalovatel...) - jako dvousloupcová mřížka, aby na širší
// obrazovce nevznikal jeden dlouhý řádek textu odděleného tečkami.
const ObjInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 320px));
  column-gap: 1.5rem;
  row-gap: 2px;
  margin-top: 5px;
  width: fit-content;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }

  .item {
    display: flex;
    gap: 5px;
    font-size: 0.72rem;
    line-height: 1.4;
  }
  .item .label { color: #94a3b8; flex-shrink: 0; }
  .item .value { color: #334155; font-weight: 600; }
`;

const SkupinaPill = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  white-space: nowrap;
  background: ${props => VERDICT_COLORS[props.$tone]?.bg || '#e5e7eb'};
  color: ${props => VERDICT_COLORS[props.$tone]?.text || '#374151'};
  border: 1px solid ${props => VERDICT_COLORS[props.$tone]?.border || '#cbd5e1'};
`;

// Přepínač směru řazení VEMA dokladů podle částky - stejná velikost/vzhled
// jako SkupinaPill (aby v řadě badgí nevyčníval), ale jako <button>, protože
// je klikatelný. Aktivní pole (podle kterého se zrovna řadí) je jemně
// zvýrazněné, neaktivní zůstávají v klidovém šedém tónu, ať tři tlačítka
// vedle sebe nepůsobí jako "pěst na oko".
const SortTogglePill = styled.button`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  white-space: nowrap;
  cursor: pointer;
  background: ${props => (props.$active ? '#e0e7ff' : '#f1f5f9')};
  color: ${props => (props.$active ? '#3730a3' : '#94a3b8')};
  border: 1px solid ${props => (props.$active ? '#a5b4fc' : '#e2e8f0')};
  transition: filter 0.15s ease;

  &:hover { filter: brightness(0.95); }
`;

// Filtr podle automatického vyhodnocení páru (ne podle manuální Kontroly) -
// kategorie se vykreslí jen ty, které se v aktuálních datech skutečně
// vyskytují (viz počty v GroupedKontrolaObjView), takže se lišta sama
// přizpůsobí tomu, co se nad daty objeví.
const VERDICT_CATEGORY_META = {
  no_candidate: { label: 'Bez kandidáta', bg: '#f1f5f9', border: '#94a3b8', text: '#475569' },
  bad: { label: 'Nesedí', bg: VERDICT_COLORS.bad.bg, border: VERDICT_COLORS.bad.border, text: VERDICT_COLORS.bad.text },
  warn: { label: 'Odhad, ověřit', bg: VERDICT_COLORS.warn.bg, border: VERDICT_COLORS.warn.border, text: VERDICT_COLORS.warn.text },
  fan: { label: 'Víc faktur na 1 objednávku', bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  matrix: { label: 'Nejednoznačné (víc kandidátů)', bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
  good: { label: 'Potvrzeno v EEO', bg: VERDICT_COLORS.good.bg, border: VERDICT_COLORS.good.border, text: VERDICT_COLORS.good.text },
};

const VerdictFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
`;

// $active vykresluje fajfku (✓) na začátek popisku - u pilulkových filtrů
// (verdikt i financování) samotná změna barvy na aktivní stav nebyla dost
// znatelná (zpětná vazba), fajfka dělá aktivní filtr jednoznačný na první pohled.
const VerdictFilterChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
  background: ${props => (props.$active ? props.$border : props.$bg)};
  color: ${props => (props.$active ? '#ffffff' : props.$text)};
  border: 1px solid ${props => props.$border};
  transition: all 0.15s ease;

  &:hover {
    filter: brightness(0.96);
  }
`;

const MatchMatrixWrap = styled.div`
  overflow-x: auto;
`;

const MatchMatrixGrid = styled.div`
  display: grid;
  gap: 8px;
  min-width: 560px;
`;

const MatrixCorner = styled.div`
  font-size: 0.68rem;
  color: #94a3b8;
  align-self: end;
  padding-bottom: 6px;
`;

const MatrixColHead = styled.div`
  font-family: 'source-code-pro', Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  color: #334155;
  text-align: center;
  padding: 6px 4px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid #cbd5e1;
  border-radius: 4px 4px 0 0;

  .n { display: block; font-weight: 700; font-size: 0.76rem; }
  .m {
    display: block;
    color: #94a3b8;
    font-size: 0.62rem;
    margin-top: 2px;
    font-family: 'Roboto', sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const MatrixRowHead = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 0.72rem;
  padding-right: 8px;
  border-right: 1px solid #e2e8f0;
  max-width: 220px;

  .n { font-family: 'source-code-pro', Menlo, Monaco, Consolas, monospace; font-weight: 700; color: #1e293b; font-size: 0.76rem; }
  .m {
    color: #94a3b8;
    font-size: 0.62rem;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const MatrixCell = styled.div`
  border-radius: 6px;
  border: 1px solid ${props => VERDICT_COLORS[props.$verdict]?.border || '#cbd5e1'};
  background: ${props => VERDICT_COLORS[props.$verdict]?.bg || '#f8fafc'};
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 190px;
`;

const MatrixCellVerdict = styled.span`
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${props => VERDICT_COLORS[props.$verdict]?.text || '#64748b'};
`;

const CondRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const Cond = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 0.64rem;
  line-height: 1.35;
  color: #475569;

  .label {
    flex-shrink: 0;
    font-weight: 700;
    color: #64748b;
  }
  .detail {
    font-family: 'source-code-pro', Menlo, Monaco, Consolas, monospace;
    color: #334155;
    word-break: break-word;
  }

  &::before {
    content: '';
    margin-top: 3px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => TICK_COLORS[props.$tick] || TICK_COLORS.unk};
    flex-shrink: 0;
  }
`;

const SimplePairCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: nowrap;

  /* Když je box (VazebniSkupinaCard) dost široký, drž VEMA/EEO stranu vedle
     sebe v jednom řádku - jinak (užší okno / víc sloupců v dlaždicích) se
     zalomí pod sebe, aby nic nepřetékalo. */
  @container (max-width: 720px) {
    flex-wrap: wrap;
  }
`;

const SkupinaNode = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 190px;

  .n { font-family: 'source-code-pro', Menlo, Monaco, Consolas, monospace; font-weight: 700; font-size: 0.78rem; color: #1e293b; }
  .m { font-size: 0.7rem; color: #64748b; }
`;

const SkupinaWire = styled.div`
  flex: 1;
  align-self: flex-start;
  margin-top: 15px;
  min-width: 24px;
  height: 1px;
  background: ${props => VERDICT_COLORS[props.$verdict]?.border || VERDICT_COLORS.good.border};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${props => VERDICT_COLORS[props.$verdict]?.border || VERDICT_COLORS.good.border};
    box-shadow: 0 0 0 3px ${props => VERDICT_COLORS[props.$verdict]?.bg || VERDICT_COLORS.good.bg};
  }
`;

const SkupinaLoadingCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.78rem;
  margin-bottom: 1rem;
`;

// Panel "syrových" identifikačních čísel VEMA vs. EEO - i když backend pár
// uzná, VS/doklad/částka se mohly na jedné straně přepsat špatně. Barva
// rámečku napovídá, jestli je něco k prověření (žlutá/červená), nebo je
// vše čisté (zelená).
const IdentPanel = styled.div`
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid ${props => (props.$hasMismatch ? VERDICT_COLORS.bad.border : VERDICT_COLORS.good.border)};
  background: ${props => (props.$hasMismatch ? VERDICT_COLORS.bad.bg : VERDICT_COLORS.good.bg)};
`;

const IdentPanelTitle = styled.div`
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #64748b;
  margin-bottom: 3px;
`;

const IdentRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 0.66rem;
  line-height: 1.4;

  .label { flex-shrink: 0; font-weight: 700; color: #64748b; min-width: 46px; }
  .vals { font-family: 'source-code-pro', Menlo, Monaco, Consolas, monospace; color: #334155; word-break: break-word; }
  .vals b { color: inherit; }

  &::before {
    content: '';
    margin-top: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${props => TICK_COLORS[props.$tick] || TICK_COLORS.unk};
    flex-shrink: 0;
  }
`;

// Panel se skutečnými EEO fakturami dané objednávky (z nového, čistě
// přídavného endpointu vema-objednavky/faktury-list - bez fuzzy hledání).
// Vždy ukazuje reálná čísla, i když fuzzy hledání použité pro "vazba EEO"
// tik danou fakturu nedohledá.
const EeoFakturyBox = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 0.6rem 0.75rem;
  flex: 1 1 200px;
  min-width: 180px;
`;

const EeoFakturyBoxTitle = styled.div`
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #64748b;
  margin-bottom: 6px;
`;

// Ruční výběr "tohle je ten správný doklad" má záměrně jinou barvu (indigo)
// než automatický odhad (zelená) - i kdyby se obě kdy zobrazily vedle sebe
// (nestává se, ruční výběr auto-odhad překrývá), musí jít na první pohled
// rozeznat, že jde o rozhodnutí člověka, ne odhad systému.
const MANUAL_VAZBA_COLORS = { bg: '#eef2ff', border: '#6366f1', text: '#3730a3' };

const EeoFakturaRow = styled.div`
  padding: 5px 7px;
  border-radius: 5px;
  background: ${props => (props.$manual ? MANUAL_VAZBA_COLORS.bg : props.$highlight ? VERDICT_COLORS.good.bg : '#ffffff')};
  border: 1px solid ${props => (props.$manual ? MANUAL_VAZBA_COLORS.border : props.$highlight ? VERDICT_COLORS.good.border : '#e2e8f0')};
  margin-bottom: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &:last-child { margin-bottom: 0; }
`;

const EeoFakturaHighlightTag = styled.div`
  font-size: 0.6rem;
  font-weight: 700;
  color: ${props => (props.$manual ? MANUAL_VAZBA_COLORS.text : VERDICT_COLORS.good.text)};
  margin-bottom: 1px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

// Odlišná barva (jantarová) pro položky pocházející z modulu Roční poplatky
// (ne skutečná EEO faktura z 25a_objednavky_faktury) - viz zadání uživatele:
// smlouvy s pravidelnou platbou (nájem/služby) často mají v EEO jen JEDNU
// souhrnnou fakturu a zbytek období vedou v Ročních poplatcích. Uživatel
// musí na první pohled vidět, že jde o jiný typ dokladu, ne o klasickou
// fakturu.
const RpZdrojTag = styled.div`
  font-size: 0.6rem;
  font-weight: 700;
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  padding: 1px 5px;
  margin-bottom: 3px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
`;

// Nenápadný odkaz pro označení/zrušení ručního výběru - vlastní styl je
// vidět jen na hover, aby to v klidovém stavu tabulku nezaneřádilo.
const RucniVazbaLink = styled.button`
  border: none;
  background: none;
  padding: 0;
  margin-top: 2px;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  color: ${props => (props.$active ? MANUAL_VAZBA_COLORS.text : '#94a3b8')};
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
  opacity: ${props => (props.$active ? 1 : 0.7)};
  align-self: flex-start;

  &:hover { opacity: 1; color: ${MANUAL_VAZBA_COLORS.text}; }
  &:disabled { opacity: 0.4; cursor: default; }
`;

// Malá ikonka "otevřít v plném formuláři" vedle klikatelných čísel OBJ/FA/SML
// (ty samotné otevírají rychlý náhled v postranním panelu) - stejná ikona
// (faExternalLinkAlt) jako jinde v appce pro "otevřít jinde" akce.
const OpenInFormButton = styled.button`
  border: none;
  background: transparent;
  padding: 0.1rem;
  margin-left: 0.2rem;
  cursor: pointer;
  color: #3b82f6;
  display: inline-flex;
  align-items: center;
  font-size: 0.68rem;
  line-height: 1;
  vertical-align: -1px;
  border-radius: 4px;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover { color: #1d4ed8; background: #eff6ff; }
`;

const FAKTURY_SUB_SECTIONS = [
  { id: 'tabulka', label: 'Veškeré doklady' },
  // Skryto - nahrazeno záložkou "Kontrola objednávek". Kód záložky zůstává.
  { id: 'kontrola-obj', label: 'Kontrola OBJ', hidden: true },
  { id: 'kontrola-obj-beta', label: 'Kontrola objednávek', isBeta: true, requiredRoles: ['SUPERADMIN', 'ADMINISTRATOR', 'ROZPOCTAR'] },
  { id: 'kontrola-sml', label: 'Kontrola smluv', isBeta: true },
  // Skryto - roční poplatky se párují v Kontrole smluv. Kód záložky zůstává.
  { id: 'kontrola-rp', label: 'Kontrola ročních poplatků', hidden: true },
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
const VEMA_BETA_VIEW_MODE_LS_KEY = 'eeo_vs_vema_beta_view_mode';
const VEMA_BADGE_FILTER_LS_KEY = 'eeo_vs_vema_badge_filter';
const VEMA_WARNING_FILTER_LS_KEY = 'eeo_vs_vema_warning_filter';
const VEMA_KONTROLA_FILTER_LS_KEY = 'eeo_vs_vema_kontrola_filter';
const VEMA_BETA_VERDICT_FILTER_LS_KEY = 'eeo_vs_vema_beta_verdict_filter';
const VEMA_BETA_FINANCOVANI_FILTER_LS_KEY = 'eeo_vs_vema_beta_financovani_filter';

// Chipy pro filtr "financování EEO objednávky" (TYP z pole `financovani`,
// viz sloupec "Financování" v matici) - stejné hodnoty TYP jako v EEO, ale
// zobrazujeme jen 2 nejčastější (LP/SMLOUVA); ostatní typy do filtru nejdou.
const FINANCOVANI_FILTER_META = {
  LP: { label: 'Limitovaný příslib', bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  SMLOUVA: { label: 'Smlouva', bg: '#f0f9ff', border: '#38bdf8', text: '#0369a1' },
};

// Počet záznamů na stránku - sjednocené možnosti napříč celým modulem
// (plochý pohled, Kontrola OBJ BETA flat i seskupený pohled).
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];
const VEMA_PAGE_SIZE_LS_KEY = 'eeo_vs_vema_page_size';
const VEMA_BETA_PAGE_SIZE_LS_KEY = 'eeo_vs_vema_beta_page_size';
const VEMA_BETA_GROUPED_PAGE_SIZE_LS_KEY = 'eeo_vs_vema_beta_grouped_page_size';
const VEMA_SML_GROUPED_PAGE_SIZE_LS_KEY = 'eeo_vs_vema_sml_grouped_page_size';
const VEMA_SML_VIEW_MODE_LS_KEY = 'eeo_vs_vema_sml_view_mode';
const VEMA_SML_VERDICT_FILTER_LS_KEY = 'eeo_vs_vema_sml_verdict_filter';

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

// Počet záznamů na stránku, persistovaný per-uživatel (aby jeden uživatel na
// sdíleném PC neovlivnil preferenci druhého - stejný vzor jako u
// cashbook_selector_cashbox v CashBookPage.js). Dokud není znám userDetail.id,
// hook běží jen s výchozí hodnotou v paměti a nic nečte/nezapisuje do LS.
const useUserScopedPageSize = (baseKey, userDetail, defaultSize = 50) => {
  const [size, setSize] = useState(defaultSize);
  const storageKey = userDetail?.id ? `${baseKey}_${userDetail.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const stored = getStoredJSON(storageKey, null);
    if (PAGE_SIZE_OPTIONS.includes(stored)) setSize(stored);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    setStoredJSON(storageKey, size);
  }, [storageKey, size]);

  return [size, setSize];
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
  const allowed = FAKTURY_SUB_SECTIONS.filter(section => !section.hidden).map(section => section.id);
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

// Multiselect filtr stavu kontroly, vedle vyhledávacího řádku - stejná
// hodnota (kontrolaFilter) sdílená s dlaždicemi dashboardu výše.
const KontrolaFilterWrap = styled.div`
  position: relative;
  flex: 0 0 auto;
`;

const KontrolaFilterButton = styled.button`
  height: 40px;
  padding: 0 0.6rem;
  border-radius: 6px;
  border: 1px solid ${props => (props.$active ? '#3b82f6' : '#cbd5e1')};
  background: ${props => (props.$active ? '#eff6ff' : '#ffffff')};
  color: ${props => (props.$active ? '#1d4ed8' : '#475569')};
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
`;

const KontrolaFilterOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40;
`;

const KontrolaFilterPanel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 41;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  padding: 0.4rem;
  min-width: 200px;
`;

const KontrolaFilterOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.4rem;
  border-radius: 6px;
  font-size: 0.78rem;
  color: #334155;
  cursor: pointer;
  white-space: nowrap;

  &:hover { background: #f1f5f9; }

  input { cursor: pointer; }
`;

const KontrolaFilterDivider = styled.div`
  border-top: 1px solid #e2e8f0;
  margin: 0.3rem 0;
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
// KONTROLA OBJ BETA - Seskupený pohled: čisté utility funkce (bez state)
// ============================================================================
// Poznámka: groupování faktur (union-find), matchování na EEO a výpočet
// verdiktu páru se od teď počítá na BE (viz vema-faktury/kontrola-obj-beta/
// grouped-list, PHP handle_vema_beta_grouped_list) - tady zůstávají jen
// funkce, které pořád používá vykreslení karet (parseFlexibleDate, formatKc,
// compareVemaEeoIdentifikace).

// Nejstarší rozumný rok pro datum v EEO/VEMA datech - cokoli starší je skoro
// jistě chybný/sentinelový záznam (typicky Excel serial 0/prázdná buňka
// naparsovaná jako new Date(0) => 1.1.1970), ne skutečné datum k porovnání.
const DATE_SANITY_MIN_YEAR = 2000;

// VEMA import (25v_fpazahl.dof/datpri) ukládá datum jako Excel sériové číslo,
// stejně jako všechny ostatní datumové sloupce v této appce (viz stejný
// number-check vzor u sloupců dof/datpri/spl výše, cell: info => ...).
// EEO vlastní data (např. objednavka.dt_objednavky) jsou normální DB datum/string.
// Tahle funkce zvládne oba tvary a zahodí zjevně chybné/sentinelové hodnoty.
function parseFlexibleDate(val) {
  if (val === null || val === undefined || val === '') return null;
  let date = null;
  if (typeof val === 'number') {
    date = excelSerialToDate(val);
  } else {
    const parsed = new Date(val);
    date = Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (!date || Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() < DATE_SANITY_MIN_YEAR) return null;
  return date;
}

const formatKc = (n) => `${Number(n).toLocaleString('cs-CZ')} Kč`;
const formatDateShort = (date) => date.toLocaleDateString('cs-CZ');

// Backend hledá EEO fakturu podle VS NEBO podle dokladu (fa_vema_kod) -
// stačí, aby sedělo jedno z nich (viz priority v propojeni-eeo), takže i
// "nalezená a přijatá" EEO faktura může mít VS nebo doklad jinak, než má
// VEMA. To je záměrně tolerantní párovací pravidlo (nemáme ho měnit), ale
// takový rozdíl skoro vždy znamená překlep na jedné nebo druhé straně -
// proto se surová čísla porovnávají zvlášť a zobrazují se transparentně,
// nezávisle na tom, jestli backend pár nakonec uznal nebo ne.
// Vytáhne číselné jádro čísla objednávky ("O-0274/75030926/2026/RE" -> "0274"),
// ať jde porovnat, jestli VEMA cobj a EEO cislo_objednavky nejsou jen
// přesmyčka stejných číslic (typický překlep při ručním přepisu ve VEMA).
function extractObjCore(cislo) {
  if (!cislo) return null;
  const m = String(cislo).match(/O-\s*(\d+)/i);
  return m ? m[1] : null;
}

// true, pokud a i b mají stejnou délku, stejnou multimnožinu číslic, ale
// jsou to jiné řetězce - tj. "0274" vs "0724" (přehozené 2. a 3. číslice).
function isDigitTransposition(a, b) {
  if (!a || !b || a === b || a.length !== b.length) return false;
  return a.split('').sort().join('') === b.split('').sort().join('');
}

// Analogie extractObjCore pro evidenční číslo smlouvy - to má ve VEMA i EEO
// tvar "XXX/IČO/RR" (např. "007/75030926/17"), ne "O-XXXX/..." jako
// objednávka. Jádro pro porovnání přesmyčky číslic je první číselná skupina
// před lomítkem (typicky pořadové číslo smlouvy v roce, kde vzniká překlep).
function extractSmlCore(cislo) {
  if (!cislo) return null;
  const m = String(cislo).trim().match(/^(\d+)/);
  return m ? m[1] : null;
}

function compareVemaEeoIdentifikace(invoiceRow, matchedFaktura) {
  const norm = (v) => String(v ?? '').trim();

  const vsVema = norm(invoiceRow?.vsymb);
  const vsEeo = norm(matchedFaktura?.cislo_faktury);
  const vs = (vsVema && vsEeo) ? (vsVema === vsEeo ? 'ok' : 'no') : 'unk';

  const dokladVema = norm(invoiceRow?.cdok);
  const dokladEeo = norm(matchedFaktura?.fa_vema_kod);
  const doklad = (dokladVema && dokladEeo) ? (dokladVema === dokladEeo ? 'ok' : 'no') : 'unk';

  const castkaVema = Number(invoiceRow?.celkem);
  const castkaEeo = Number(matchedFaktura?.castka);
  const castka = (Number.isFinite(castkaVema) && Number.isFinite(castkaEeo))
    ? (Math.abs(castkaVema - castkaEeo) < 0.01 ? 'ok' : 'no')
    : 'unk';

  return {
    objednavka: matchedFaktura?.cislo_objednavky || null,
    vs, vsVema, vsEeo,
    doklad, dokladVema, dokladEeo,
    castka, castkaVema, castkaEeo,
  };
}

// ============================================================================
// FA - obsah slide-in náhledu jedné EEO faktury (samostatný panel, ne
// kombinovaný s objednávkou - viz zpětná vazba). Vizuálně stejný jazyk jako
// EntityDetailViews (UniversalSearch) - sekce/ikona/label/hodnota.
// ============================================================================

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

const InvoiceQuickView = ({ faktura, candidate, invoiceRow }) => {
  if (!faktura) return null;
  const datumVystaveni = parseFlexibleDate(faktura.datum_vystaveni);
  const datumSplatnosti = parseFlexibleDate(faktura.datum_splatnosti);
  const cmp = invoiceRow ? compareVemaEeoIdentifikace(invoiceRow, faktura) : null;

  return (
    <div>
      <QVSection>
        <QVSectionTitle>Základní informace</QVSectionTitle>
        <QVGrid>
          <QVRow>
            <QVIcon><FontAwesomeIcon icon={faFileInvoice} /></QVIcon>
            <div>
              <QVLabel>Variabilní symbol</QVLabel>
              <QVValue>{faktura.cislo_faktury || '—'}</QVValue>
            </div>
          </QVRow>
          {faktura.fa_vema_kod && (
            <QVRow>
              <QVIcon><FontAwesomeIcon icon={faFileAlt} /></QVIcon>
              <div>
                <QVLabel>Doklad (fa_vema_kod)</QVLabel>
                <QVValue>{faktura.fa_vema_kod}</QVValue>
              </div>
            </QVRow>
          )}
          {faktura.fa_typ && (
            <QVRow>
              <QVIcon><FontAwesomeIcon icon={faFileAlt} /></QVIcon>
              <div>
                <QVLabel>Typ faktury</QVLabel>
                <QVValue><QVBadge style={{ background: '#fef3c7', color: '#92400e' }}>{FAKTURA_TYP_LABELS[faktura.fa_typ] || faktura.fa_typ}</QVBadge></QVValue>
              </div>
            </QVRow>
          )}
          {faktura.stav && (
            <QVRow>
              <QVIcon><FontAwesomeIcon icon={faCalendar} /></QVIcon>
              <div>
                <QVLabel>Stav v EEO</QVLabel>
                <QVValue><QVBadge style={{ background: '#dbeafe', color: '#1e40af' }}>{FAKTURA_STAV_LABELS[faktura.stav] || faktura.stav}</QVBadge></QVValue>
              </div>
            </QVRow>
          )}
        </QVGrid>
      </QVSection>

      {candidate && (
        <QVSection>
          <QVSectionTitle>Objednávka</QVSectionTitle>
          <QVGrid>
            <QVRow>
              <QVIcon><FontAwesomeIcon icon={faBuilding} /></QVIcon>
              <div>
                <QVLabel>Číslo objednávky</QVLabel>
                <QVValue>{candidate.cislo_objednavky}</QVValue>
              </div>
            </QVRow>
            {candidate.dodavatel && (
              <QVRow>
                <QVIcon><FontAwesomeIcon icon={faBuilding} /></QVIcon>
                <div>
                  <QVLabel>Dodavatel</QVLabel>
                  <QVValue>{candidate.dodavatel}{candidate.dodavatel_ico ? ` · IČO: ${candidate.dodavatel_ico}` : ''}</QVValue>
                </div>
              </QVRow>
            )}
          </QVGrid>
        </QVSection>
      )}

      <QVSection>
        <QVSectionTitle>Finanční údaje</QVSectionTitle>
        <QVGrid>
          <QVRow>
            <QVIcon><FontAwesomeIcon icon={faMoneyBill} /></QVIcon>
            <div>
              <QVLabel>Částka</QVLabel>
              <QVValue style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e40af' }}>
                {Number.isFinite(faktura.castka) ? formatKc(faktura.castka) : '—'}
              </QVValue>
            </div>
          </QVRow>
          {datumVystaveni && (
            <QVRow>
              <QVIcon><FontAwesomeIcon icon={faCalendar} /></QVIcon>
              <div>
                <QVLabel>Datum vystavení</QVLabel>
                <QVValue>{formatDateShort(datumVystaveni)}</QVValue>
              </div>
            </QVRow>
          )}
          {datumSplatnosti && (
            <QVRow>
              <QVIcon><FontAwesomeIcon icon={faCalendar} /></QVIcon>
              <div>
                <QVLabel>Datum splatnosti</QVLabel>
                <QVValue>{formatDateShort(datumSplatnosti)}</QVValue>
              </div>
            </QVRow>
          )}
        </QVGrid>
      </QVSection>

      {cmp && (
        <QVSection>
          <QVSectionTitle>Shoda s VEMA dokladem</QVSectionTitle>
          <QVGrid>
            <QVRow>
              <QVIcon style={{ color: TICK_COLORS[cmp.vs] }}><FontAwesomeIcon icon={faIdCard} /></QVIcon>
              <div>
                <QVLabel>VS</QVLabel>
                <QVValue>{cmp.vsVema || '—'} / {cmp.vsEeo || '—'}</QVValue>
              </div>
            </QVRow>
            <QVRow>
              <QVIcon style={{ color: TICK_COLORS[cmp.doklad] }}><FontAwesomeIcon icon={faIdCard} /></QVIcon>
              <div>
                <QVLabel>Doklad</QVLabel>
                <QVValue>{cmp.dokladVema || '—'} / {cmp.dokladEeo || '—'}</QVValue>
              </div>
            </QVRow>
            <QVRow>
              <QVIcon style={{ color: TICK_COLORS[cmp.castka] }}><FontAwesomeIcon icon={faMoneyBill} /></QVIcon>
              <div>
                <QVLabel>Částka</QVLabel>
                <QVValue>
                  {Number.isFinite(cmp.castkaVema) ? formatKc(cmp.castkaVema) : '—'} / {Number.isFinite(cmp.castkaEeo) ? formatKc(cmp.castkaEeo) : '—'}
                </QVValue>
              </div>
            </QVRow>
          </QVGrid>
        </QVSection>
      )}
    </div>
  );
};

// ============================================================================
// KONTROLA OBJ BETA - Seskupený pohled: render komponenta
// ============================================================================

// Kontrola OBJ BETA - seskupený pohled je od teď plně BE-řízený: groupování
// duplicitních VEMA řádků, fuzzy matchování na EEO, výpočet verdiktu páru i
// počty pro filtrovací chipy počítá server pro CELÝ přefiltrovaný dataset
// (viz vema-faktury/kontrola-obj-beta/grouped-list, PHP
// handle_vema_beta_grouped_list) - komponenta si data i stránkování řídí
// sama, nezávisle na plochém (flat) pohledu stejné záložky.
const GroupedKontrolaObjView = ({ token, username, userDetail, search, badgeFilter, warningOnlyFilter, kontrolaFilter, verdictFilter, setVerdictFilter, financovaniFilter, setFinancovaniFilter, lpSeznam = [] }) => {
  const navigate = useNavigate();
  const { hasPermission, hasAdminRole } = useContext(AuthContext);
  const isAdminUser = typeof hasAdminRole === 'function' && hasAdminRole();
  const canEditContract = isAdminUser || (typeof hasPermission === 'function' && hasPermission('CONTRACT_EDIT'));
  // Zrcadlí canViewTab('CONTRACT') z DictionariesNew.js - jestli tohle je
  // false, záložka Smlouvy se v číselnících vůbec nezobrazí, takže tam nemá
  // smysl navigovat (uživatel by přistál na jiné/prázdné záložce).
  const canAccessContractModule = isAdminUser || (typeof hasPermission === 'function' && (
    hasPermission('CONTRACT_VIEW') || hasPermission('CONTRACT_CREATE') || hasPermission('CONTRACT_EDIT') || hasPermission('CONTRACT_DELETE')
  ));
  // returnTo MUSÍ jít z react-router useLocation(), NE z window.location.pathname!
  // Router běží s basename={process.env.PUBLIC_URL} (/dev/eeo-v2 na DEV, jiné na
  // PROD) - navigate() basename automaticky přidává, takže syrové
  // window.location.pathname (které basename už obsahuje) by se sem započítalo
  // dvakrát (přesně tenhle bug: /dev/eeo-v2/dev/eeo-v2/vema-denik). Location
  // z react-routeru je už basename-relative, stejně jako to dělá SmlouvyTab.js.
  const location = useLocation();
  // Otevření PŘÍMO v plném formuláři (ne v náhledovém panelu) - stejná
  // navigace jako na jiných místech appky (viz SmlouvyTab.js "otevřít
  // objednávku/fakturu z rozbaleného řádku smlouvy").
  const openOrderInFullForm = (orderId) => {
    if (!orderId) return;
    navigate(`/order-form-25?edit=${orderId}`, { state: { returnTo: location.pathname } });
  };
  const openInvoiceInEvidenceForm = (orderId, invoiceId) => {
    if (!invoiceId) return;
    navigate('/invoice-evidence', { state: { editInvoiceId: invoiceId, orderIdForLoad: orderId, returnTo: location.pathname } });
  };
  // Ikona "otevřít smlouvu v plném formuláři" - právo editovat se ověřuje TADY,
  // podle práva se rozhodne, co se vlastně otevře (viz zpětná vazba - proklik
  // z VEMA vs EEO nesmí nikomu otevřít editaci smlouvy, na kterou nemá právo):
  //  - CONTRACT_EDIT (nebo admin) → plný editační formulář (beze změny).
  //  - jen CONTRACT_VIEW/CREATE/DELETE (přístup do modulu, bez editace) →
  //    stejná záložka Smlouvy, ale jen read-only detail (SmlouvyTab to
  //    ověří ještě jednou sám, tohle je jen aby se rovnou otevřelo správně).
  //  - žádné právo na modul Smlouvy → tam vůbec nenavigovat (záložka by se
  //    ani nezobrazila), místo toho otevřít stávající read-only náhled
  //    přímo tady ve VEMA vs EEO (funguje bez práv na modul Smlouvy).
  const openSmlouvaInEditForm = async (cisloSmlouvy) => {
    if (!cisloSmlouvy) return;
    if (!canAccessContractModule) {
      openSmlouvaPreview(cisloSmlouvy);
      return;
    }
    const stateKey = canEditContract ? 'editSmlouva' : 'viewSmlouva';
    if (smlouvaPreview.listRow && smlouvaPreview.cisloSmlouvy === cisloSmlouvy) {
      navigate('/dictionaries', { state: { activeTab: 'smlouvy', [stateKey]: smlouvaPreview.listRow } });
      return;
    }
    try {
      const match = await findSmlouvaByCislo(cisloSmlouvy);
      if (!match) return;
      navigate('/dictionaries', { state: { activeTab: 'smlouvy', [stateKey]: match } });
    } catch (e) {
      console.error('Chyba při otevírání smlouvy k editaci:', e);
    }
  };

  // verdictFilter/financovaniFilter jsou zvednuté do rodiče (VemaDenik), aby
  // je viděl i společný "Zrušit filtry" a indikátor aktivního filtru v
  // toolbaru (viz zpětná vazba - dřív se resetovaly jen badgeFilter/
  // warningOnlyFilter/kontrolaFilter/search, tyhle dva ne).
  // Řazení VEMA dokladů uvnitř fan/matrix karet - vlastní volba u KAŽDÉ karty
  // zvlášť (vedle badge s počtem faktur), ne jedno globální pro celou
  // stránku - různé skupiny chce uživatel prohlížet nezávisle na sobě.
  // Klíč = groupId, hodnota {field, dir}; skupina bez vlastní volby bere
  // výchozí pole 'castka' se svým výchozím směrem (viz DOKLADY_SORT_FIELDS).
  const [dokladySortByGroup, setDokladySortByGroup] = useState({});
  const getGroupSort = (groupId) => dokladySortByGroup[groupId] || { field: 'castka', dir: DOKLADY_SORT_FIELDS.castka.defaultDir };
  // Klik na už aktivní pole otočí směr, klik na jiné pole ho udělá primárním
  // (s jeho výchozím směrem - u částky nejvyšší první, u data/typu vzestupně).
  const setGroupSortField = (groupId, field) => {
    setDokladySortByGroup((prev) => {
      const current = prev[groupId] || { field: 'castka', dir: DOKLADY_SORT_FIELDS.castka.defaultDir };
      const next = current.field === field
        ? { field, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: DOKLADY_SORT_FIELDS[field].defaultDir };
      return { ...prev, [groupId]: next };
    });
  };
  const [page, setPage] = useState(1);
  const [groupedPageSize, setGroupedPageSize] = useUserScopedPageSize(VEMA_BETA_GROUPED_PAGE_SIZE_LS_KEY, userDetail);
  const [groupsResult, setGroupsResult] = useState({ groups: [], verdictCounts: {}, financovaniCounts: {}, pagination: { page: 1, per_page: 50, total: 0, total_pages: 1 } });
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState(null);
  // Reálné EEO faktury pro kandidátní objednávky viditelné na aktuální
  // stránce - přímo podle objednavka_id, bez fuzzy VS/doklad hledání (viz
  // vema-objednavky/faktury-list). Doplňuje identifikacePanely i tam, kde
  // fuzzy hledání reálně existující fakturu mine.
  const [objednavkaFakturyData, setObjednavkaFakturyData] = useState({});
  const [objednavkaFakturyLoading, setObjednavkaFakturyLoading] = useState(false);
  // Klíč (invoiceRow.id) právě ukládaného ručního výběru "tohle je ten
  // správný doklad" - jen pro disable tlačítka během requestu, nic víc.
  const [rucniVazbaSavingKey, setRucniVazbaSavingKey] = useState(null);

  // Tři samostatné slide-in náhledy - OBJ / FA / SML mají KAŽDÝ svůj vlastní
  // panel se svým obsahem, žádný "všechno v jednom" (viz zpětná vazba - dřívější
  // verze míchala objednávku a fakturu do jednoho panelu, což bylo matoucí).
  // Stejný sdílený SlideInDetailPanel jako jinde v appce (modul faktur).

  // OBJ - číslo objednávky -> detail objednávky (OrderFormReadOnly, stejné
  // jako v InvoiceEvidencePage).
  const [orderPreview, setOrderPreview] = useState({ open: false, orderId: null, data: null, loading: false, error: null });
  const openOrderPreview = (orderId) => {
    if (!orderId) return;
    setOrderPreview({ open: true, orderId, data: null, loading: true, error: null });
    getOrderV2(orderId, token, username, true)
      .then((data) => {
        setOrderPreview((prev) => (prev.open && String(prev.orderId) === String(orderId) ? { ...prev, data, loading: false } : prev));
      })
      .catch((e) => {
        console.error('Chyba při načítání náhledu objednávky:', e);
        setOrderPreview((prev) => (prev.open && String(prev.orderId) === String(orderId) ? { ...prev, loading: false, error: e.message || 'Chyba při načítání objednávky' } : prev));
      });
  };
  const closeOrderPreview = () => setOrderPreview((prev) => ({ ...prev, open: false }));

  // FA - číslo/VS EEO faktury -> detail té konkrétní faktury. Data (f) už
  // máme načtená z endpointu vema-objednavky/faktury-list (objednavkaFakturyData),
  // není potřeba žádný další request - jen je zabalit i s kontextem objednávky
  // a případně porovnávacím VEMA řádkem pro zobrazení VS/doklad/částka.
  const [invoicePreview, setInvoicePreview] = useState({ open: false, faktura: null, candidate: null, invoiceRow: null });
  const openInvoicePreview = (faktura, candidate, invoiceRow = null) => {
    if (!faktura) return;
    setInvoicePreview({ open: true, faktura, candidate, invoiceRow });
  };
  const closeInvoicePreview = () => setInvoicePreview((prev) => ({ ...prev, open: false }));

  // SML - číslo smlouvy (z financování objednávky) -> detail smlouvy. Máme
  // jen textové číslo smlouvy (financovani.cislo_smlouvy), ne ID - nejdřív
  // dohledáme smlouvu podle čísla (getSmlouvyList search), pak stáhneme plný
  // detail (getSmlouvaDetail) pro SmlouvaPreview (stejná komponenta jako v
  // InvoiceEvidencePage).
  const [smlouvaPreview, setSmlouvaPreview] = useState({ open: false, cisloSmlouvy: null, data: null, listRow: null, loading: false, error: null });
  // Sdílené s openSmlouvaInEditForm (ikona "otevřít v plném formuláři") -
  // obojí potřebuje ze stejného textového čísla smlouvy dohledat její ID.
  const findSmlouvaByCislo = async (cisloSmlouvy) => {
    const listResponse = await getSmlouvyList({ token, username, search: cisloSmlouvy, limit: 20 });
    const list = Array.isArray(listResponse) ? listResponse : (listResponse?.data || []);
    return list.find((s) => String(s.cislo_smlouvy).trim() === String(cisloSmlouvy).trim()) || list[0] || null;
  };
  const openSmlouvaPreview = async (cisloSmlouvy) => {
    if (!cisloSmlouvy) return;
    setSmlouvaPreview({ open: true, cisloSmlouvy, data: null, listRow: null, loading: true, error: null });
    try {
      const match = await findSmlouvaByCislo(cisloSmlouvy);
      if (!match) {
        setSmlouvaPreview((prev) => (prev.cisloSmlouvy === cisloSmlouvy ? { ...prev, loading: false, error: `Smlouva ${cisloSmlouvy} nebyla v číselníku nalezena.` } : prev));
        return;
      }
      const detail = await getSmlouvaDetail({ token, username, id: match.id });
      // getSmlouvaDetail vrací { smlouva, objednavky, statistiky } - SmlouvaPreview
      // očekává ploché pole smlouvy (cislo_smlouvy, nazev_firmy, cerpano_skutecne...)
      setSmlouvaPreview((prev) => (prev.cisloSmlouvy === cisloSmlouvy ? { ...prev, data: detail?.smlouva || null, listRow: match, loading: false } : prev));
    } catch (e) {
      console.error('Chyba při načítání náhledu smlouvy:', e);
      setSmlouvaPreview((prev) => (prev.cisloSmlouvy === cisloSmlouvy ? { ...prev, loading: false, error: e.message || 'Chyba při načítání smlouvy' } : prev));
    }
  };
  const closeSmlouvaPreview = () => setSmlouvaPreview((prev) => ({ ...prev, open: false }));

  // Klikací číslo objednávky/faktury - sjednocený vzhled napříč kartami
  // (fan/matrix), stejná dotted-underline konvence jako RucniVazbaLink.
  const clickableProps = (onClick, title) => ({
    role: 'button',
    tabIndex: 0,
    onClick,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } },
    title,
    style: { cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' },
  });

  // Změna filtru (kromě stránky samotné) - vrátit se na stránku 1.
  useEffect(() => {
    setPage(1);
  }, [search, badgeFilter, warningOnlyFilter, kontrolaFilter, verdictFilter, financovaniFilter, groupedPageSize]);

  useEffect(() => {
    if (!token || !username) return;
    let cancelled = false;
    setGroupsLoading(true);
    setGroupsError(null);

    getVemaBetaGroupedList({ token, username, search, badgeFilter, warningOnlyFilter, kontrolaFilter, verdictFilter, financovaniFilter, page, perPage: groupedPageSize })
      .then((data) => {
        if (cancelled) return;
        setGroupsResult(data);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Chyba při načítání seskupeného pohledu Kontrola OBJ BETA:', e);
        setGroupsError(e.message || 'Chyba při načítání seskupeného pohledu');
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false);
      });

    return () => { cancelled = true; };
  }, [token, username, search, badgeFilter, warningOnlyFilter, kontrolaFilter, verdictFilter, financovaniFilter, page, groupedPageSize]);

  const groups = useMemo(
    () => (groupsResult.groups || []).map((g) => ({
      ...g,
      invoiceRows: g.invoiceRows.map((r) => ({ id: r.id, original: r })),
    })),
    [groupsResult.groups]
  );
  const verdictCounts = groupsResult.verdictCounts || {};
  const financovaniCounts = groupsResult.financovaniCounts || {};
  const toggleFinancovaniFilter = (key) => {
    setFinancovaniFilter((prev) => (prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]));
  };
  const pagination = groupsResult.pagination || { page: 1, per_page: 50, total: 0, total_pages: 1 };

  // Reálné EEO faktury na kandidátních objednávkách aktuální stránky.
  useEffect(() => {
    if (!token || !username) return;
    if (objednavkaFakturyLoading) return;

    const allIds = new Set();
    groups.forEach((group) => {
      group.candidates.forEach((cand) => {
        if (cand?.id !== undefined && cand?.id !== null) allIds.add(cand.id);
      });
    });
    const missingIds = Array.from(allIds).filter((id) => !(String(id) in objednavkaFakturyData));
    if (missingIds.length === 0) return;

    setObjednavkaFakturyLoading(true);
    getVemaObjednavkyFaktury(missingIds, token, username)
      .then((data) => {
        const byObj = data?.faktury_by_objednavka || {};
        setObjednavkaFakturyData((prev) => {
          const next = { ...prev };
          missingIds.forEach((id) => { next[String(id)] = byObj[String(id)] || []; });
          return next;
        });
      })
      .catch((e) => {
        console.warn('Nepodařilo se načíst EEO faktury objednávek:', e);
        setObjednavkaFakturyData((prev) => {
          const next = { ...prev };
          missingIds.forEach((id) => { next[String(id)] = []; });
          return next;
        });
      })
      .finally(() => setObjednavkaFakturyLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, objednavkaFakturyData, objednavkaFakturyLoading, token, username]);

  // Batch natažení VEMA kontrol pro všechny VEMA faktury viditelné na
  // aktuální stránce - JEDNÍM requestem, místo aby si každá vykreslená
  // instance VemaKontrolaCell dělala vlastní fetch (viz její initialKontrola
  // prop). Bez tohohle by seskupený pohled vykreslil stovky buněk najednou
  // a každá vystřelila vlastní HTTP request (naměřeno ~533 sekvenčních
  // requestů = 25-30s waterfall na stránku) - analogie efektu výše pro
  // objednavkaFakturyData, jen zdroj je vema-kontrola/batch-get.
  const [kontrolaBatchData, setKontrolaBatchData] = useState({});
  const [kontrolaBatchLoading, setKontrolaBatchLoading] = useState(false);
  useEffect(() => {
    if (!token || !username) return;
    if (kontrolaBatchLoading) return;

    const items = [];
    const seenKeys = new Set();
    groups.forEach((group) => {
      group.invoiceRows.forEach((row) => {
        const vemaId = row.original._masterCfak || row.original.cfak;
        if (!vemaId) return;
        const vemaIdSecondary = row.original.firma;
        const key = vemaKontrolaBatchKey(vemaId, vemaIdSecondary);
        if (seenKeys.has(key) || key in kontrolaBatchData) return;
        seenKeys.add(key);
        items.push({ vemaId, vemaIdSecondary });
      });
    });
    if (items.length === 0) return;

    setKontrolaBatchLoading(true);
    batchGetVemaKontrola('faktura', items, token, username)
      .then((result) => {
        setKontrolaBatchData((prev) => ({ ...prev, ...result }));
      })
      .catch((e) => {
        console.warn('Nepodařilo se natáhnout VEMA kontroly dávkou:', e);
        setKontrolaBatchData((prev) => {
          const next = { ...prev };
          items.forEach((it) => { next[vemaKontrolaBatchKey(it.vemaId, it.vemaIdSecondary)] = null; });
          return next;
        });
      })
      .finally(() => setKontrolaBatchLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, kontrolaBatchData, kontrolaBatchLoading, token, username]);

  const kontrolaCellFor = (row) => {
    const vemaId = row.original._masterCfak || row.original.cfak;
    if (!vemaId) return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>;
    const vemaIdSecondary = row.original.firma;
    const batchKey = vemaKontrolaBatchKey(vemaId, vemaIdSecondary);
    // Dokud dávkový fetch pro tenhle klíč ještě neproběhl, radši nevykreslovat
    // buňku vůbec (ta by jinak spustila vlastní self-fetch fallback), než
    // znovu dostat waterfall stovek jednotlivých requestů.
    if (!(batchKey in kontrolaBatchData)) {
      return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>…</span>;
    }
    return (
      <VemaKontrolaCell
        typZaznamu="faktura"
        vemaId={vemaId}
        vemaIdSecondary={vemaIdSecondary}
        initialKontrola={kontrolaBatchData[batchKey]}
        token={token}
        username={username}
      />
    );
  };

  // Optimistická aktualizace jednoho invoiceRow napříč groupsResult po
  // úspěšném uložení/zrušení ručního výběru - bez plného refetch/reloadu
  // stránky (ten by mj. mohl skočit stránkováním/filtrem pod rukama).
  // invoiceRow.id (= server-side "_group_key") je v rámci datasetu unikátní,
  // takže stačí najít shodu bez ohledu na groupId.
  const updateInvoiceRowRucniVazba = (rowId, newVazba) => {
    setGroupsResult((prev) => ({
      ...prev,
      groups: (prev.groups || []).map((g) => ({
        ...g,
        invoiceRows: g.invoiceRows.map((r) => (r.id === rowId ? { ...r, rucni_vazba: newVazba } : r)),
      })),
    }));
  };

  // Přepínač ručního výběru "tohle je ten správný doklad" - druhý klik na
  // už vybraný doklad výběr zruší (návrat k automatickému odhadu).
  const handleRucniVazbaToggle = async (rowId, invoiceRow, target) => {
    const currentVazba = invoiceRow?.rucni_vazba;
    const isSameTarget = currentVazba && String(currentVazba.eeo_id) === String(target.eeoId);
    const action = isSameTarget ? 'clear' : 'set';

    setRucniVazbaSavingKey(rowId);
    try {
      const result = await saveVemaRucniVazba(
        {
          vemaId: invoiceRow.cfak,
          vemaIdSecondary: invoiceRow.firma,
          action,
          eeoTyp: 'eeo_faktura',
          eeoId: target.eeoId,
          eeoCislo: target.eeoCislo,
          cisloObjednavky: target.cisloObjednavky,
        },
        token,
        username
      );
      updateInvoiceRowRucniVazba(rowId, result.rucni_vazba);
    } catch (e) {
      console.error('Chyba při ukládání ručního výběru správného dokladu:', e);
      alert(e.message || 'Nepodařilo se uložit ruční výběr správného dokladu');
    } finally {
      setRucniVazbaSavingKey(null);
    }
  };

  // Zobrazí syrové porovnání VS/doklad/částka pro každou EEO fakturu, kterou
  // backend k této VEMA faktuře našel - nezávisle na tom, jestli pár nakonec
  // uznal jako "eeoVazba ok" nebo ne. I přijatý pár může mít VS nebo doklad
  // jinak (párovací pravidlo je záměrně tolerantní - stačí shoda jednoho),
  // a to skoro vždy znamená překlep na jedné nebo druhé straně.
  const identifikacePanelyFor = (invoiceRow, matchedFaktury) => {
    if (!Array.isArray(matchedFaktury) || matchedFaktury.length === 0) return null;
    return matchedFaktury.map((mf, idx) => {
      const cmp = compareVemaEeoIdentifikace(invoiceRow, mf);
      const hasMismatch = cmp.vs === 'no' || cmp.doklad === 'no' || cmp.castka === 'no';
      return (
        <IdentPanel key={mf?.id ?? idx} $hasMismatch={hasMismatch}>
          <IdentPanelTitle>EEO faktura {cmp.objednavka ? `→ ${cmp.objednavka}` : '(bez vazby na objednávku)'}</IdentPanelTitle>
          <IdentRow $tick={cmp.vs}>
            <span className="label">VS</span>
            <span className="vals">{cmp.vsVema || '—'} <b>{cmp.vs === 'ok' ? '=' : '≠'}</b> {cmp.vsEeo || '—'}</span>
          </IdentRow>
          <IdentRow $tick={cmp.doklad}>
            <span className="label">Doklad</span>
            <span className="vals"><b>{cmp.dokladVema || '—'}</b> {cmp.doklad === 'ok' ? '=' : '≠'} <b>{cmp.dokladEeo || '—'}</b></span>
          </IdentRow>
          <IdentRow $tick={cmp.castka}>
            <span className="label">Částka</span>
            <span className="vals">
              <b>{Number.isFinite(cmp.castkaVema) ? formatKc(cmp.castkaVema) : '—'}</b> {cmp.castka === 'ok' ? '=' : '≠'} <b>{Number.isFinite(cmp.castkaEeo) ? formatKc(cmp.castkaEeo) : '—'}</b>
            </span>
          </IdentRow>
        </IdentPanel>
      );
    });
  };

  // Panel se všemi skutečnými EEO fakturami na kandidátní objednávce (zdroj:
  // nový endpoint podle objednavka_id, ne fuzzy hledání) - ukazuje se v
  // prázdném prostoru u kandidáta, aby šlo VEMA/EEO čísla porovnat vizuálně,
  // i když je fuzzy hledání ("vazba EEO" tik) k dané faktuře nedohledá.
  // Porovná KAŽDOU skutečnou EEO fakturu na kandidátní objednávce (zdroj:
  // nový endpoint podle objednavka_id, ne fuzzy hledání) proti VEMA faktuře,
  // pole po poli - "VS: vema hodnota / eeo hodnota" na řádek, ne jen výpis
  // EEO čísel bez kontextu.
  const eeoFakturyPanelFor = (candidate, invoiceRow, invoiceRowId) => {
    if (!candidate) return null;
    const list = objednavkaFakturyData[String(candidate.id)];
    // Ruční výběr uživatele (viz handleRucniVazbaToggle) - pokud existuje,
    // úplně přebíjí automatický odhad "nejspíš tahle faktura" (viz odpověď
    // uživateli - jednoznačnost je tu důležitější než transparentnost obojího
    // najednou). Tlačítko pro výběr má smysl jen když víme, ke které
    // konkrétní VEMA faktuře (invoiceRowId) se má uložit.
    const rucniVazba = invoiceRow?.rucni_vazba || null;
    const canPick = Boolean(invoiceRowId && invoiceRow?.cfak);
    const isSaving = rucniVazbaSavingKey === invoiceRowId;
    // Bez konkrétní VEMA faktury (invoiceRow===null - matrix hlavička sloupce,
    // sdílená pro všechny řádky matice) nejde nic srovnávat "VEMA / EEO" - je
    // to jen prostý výpis skutečných EEO faktur na objednávce. Zobrazovat tam
    // "— / hodnota" matlo, že VEMA stranu nemáme (i když ji jinde reálně máme),
    // proto se tu ukazuje jen samotná EEO hodnota bez "VEMA / " prefixu.
    const hasInvoiceRow = Boolean(invoiceRow);

    if (list === undefined) {
      return (
        <EeoFakturyBox>
          <EeoFakturyBoxTitle>EEO faktury na objednávce</EeoFakturyBoxTitle>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Načítám…</span>
        </EeoFakturyBox>
      );
    }
    if (list.length === 0) {
      return (
        <EeoFakturyBox>
          <EeoFakturyBoxTitle>EEO faktury na objednávce</EeoFakturyBoxTitle>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Objednávka zatím v EEO nemá žádnou fakturu.</span>
        </EeoFakturyBox>
      );
    }

    return (
      <EeoFakturyBox>
        <EeoFakturyBoxTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span>VEMA / EEO — faktury na objednávce ({list.length})</span>
            {candidate.cislo_objednavky && (
              <div style={{ display: 'flex', alignItems: 'center', textTransform: 'none', letterSpacing: 'normal', fontWeight: 600 }}>
                <span {...clickableProps(() => openOrderPreview(candidate.id), 'Zobrazit náhled objednávky')}>{candidate.cislo_objednavky}</span>
                <OpenInFormButton type="button" onClick={() => openOrderInFullForm(candidate.id)} title="Otevřít objednávku ve formuláři">
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                </OpenInFormButton>
              </div>
            )}
          </div>
        </EeoFakturyBoxTitle>
        {list.map((f) => {
          const cmp = compareVemaEeoIdentifikace(invoiceRow, f);
          const isManualPick = rucniVazba ? String(rucniVazba.eeo_id) === String(f.id) : false;
          // Auto-odhad se zobrazí, jen pokud u této VEMA faktury není žádný
          // ruční výběr - jakmile člověk jednou vybere, systémový odhad se
          // dál nenabízí (viz odpověď v konverzaci: jednoznačné přebití).
          // Číslo dokladu (cmp.doklad) MÁ PŘEDNOST před VS/částkou - u
          // pravidelných měsíčních plateb (nájem, roční poplatky) je částka
          // identická u všech období a VS bývá jen firma/IČO, ne konkrétní
          // doklad, takže by jinak "nejspíš tahle faktura" svítilo na VŠECH
          // kandidátech současně (viz zpětná vazba uživatele). Na VS/částku
          // se spoléháme jen když doklad nejde porovnat (cmp.doklad==='unk').
          const autoHighlight = !rucniVazba && (
            cmp.doklad === 'ok' || (cmp.doklad === 'unk' && (cmp.vs === 'ok' || cmp.castka === 'ok'))
          );
          const highlight = isManualPick || autoHighlight;
          const datum = parseFlexibleDate(f?.datum_vystaveni);

          return (
            <EeoFakturaRow key={f.id} $highlight={highlight} $manual={isManualPick}>
              {isManualPick && (
                <EeoFakturaHighlightTag $manual>
                  ↳ ručně potvrzeno jako správné
                </EeoFakturaHighlightTag>
              )}
              {autoHighlight && <EeoFakturaHighlightTag>↳ nejspíš tahle faktura</EeoFakturaHighlightTag>}
              <IdentRow $tick={hasInvoiceRow ? cmp.vs : 'unk'}>
                <span className="label">VS</span>
                <span className="vals">{hasInvoiceRow ? <>{cmp.vsVema || '—'} / {cmp.vsEeo || '—'}</> : (cmp.vsEeo || '—')}</span>
              </IdentRow>
              <IdentRow $tick={hasInvoiceRow ? cmp.doklad : 'unk'}>
                <span className="label">Doklad</span>
                <span className="vals">
                  {hasInvoiceRow && <><b>{cmp.dokladVema || '—'}</b> / </>}
                  <b {...clickableProps(() => openInvoicePreview(f, candidate, invoiceRow), 'Zobrazit detail faktury')}>{cmp.dokladEeo || '—'}</b>
                  <OpenInFormButton
                    type="button"
                    onClick={() => openInvoiceInEvidenceForm(candidate?.id, f.id)}
                    title="Otevřít fakturu ve formuláři zaevidování"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                  </OpenInFormButton>
                </span>
              </IdentRow>
              <IdentRow $tick={hasInvoiceRow ? cmp.castka : 'unk'}>
                <span className="label">Částka</span>
                <span className="vals">
                  {hasInvoiceRow && <><b>{Number.isFinite(cmp.castkaVema) ? formatKc(cmp.castkaVema) : '—'}</b> / </>}
                  <b>{Number.isFinite(cmp.castkaEeo) ? formatKc(cmp.castkaEeo) : '—'}</b>
                </span>
              </IdentRow>
              {(() => {
                const datumVema = parseFlexibleDate(invoiceRow?.dof) || parseFlexibleDate(invoiceRow?.datpri);
                if (!hasInvoiceRow && !datum) return null;
                if (hasInvoiceRow && !datumVema && !datum) return null;
                return (
                  <IdentRow $tick="unk">
                    <span className="label">Vystaveno</span>
                    <span className="vals">
                      {hasInvoiceRow && <><b>{datumVema ? formatDateShort(datumVema) : '—'}</b> / </>}
                      <b>{datum ? formatDateShort(datum) : '—'}</b>
                    </span>
                  </IdentRow>
                );
              })()}
              {(() => {
                const typdok = invoiceRow?.typdok;
                const vemaTypLabel = (typdok !== null && typdok !== undefined && typdok !== '')
                  ? (VEMA_TYPDOK_LABELS[Number(typdok)] || `kód ${typdok}`)
                  : null;
                const eeoTypLabel = f.fa_typ ? (FAKTURA_TYP_LABELS[f.fa_typ] || f.fa_typ) : null;
                if (hasInvoiceRow && !vemaTypLabel && !eeoTypLabel) return null;
                if (!hasInvoiceRow && !eeoTypLabel) return null;
                return (
                  <IdentRow $tick="unk">
                    <span className="label">Typ faktury</span>
                    <span className="vals">{hasInvoiceRow ? <>{vemaTypLabel || '—'} / {eeoTypLabel || '—'}</> : (eeoTypLabel || '—')}</span>
                  </IdentRow>
                );
              })()}
              {f.stav && (
                <IdentRow $tick="unk">
                  <span className="label">Stav v EEO</span>
                  <span className="vals">{FAKTURA_STAV_LABELS[f.stav] || f.stav}</span>
                </IdentRow>
              )}
              {canPick && (
                <RucniVazbaLink
                  type="button"
                  $active={isManualPick}
                  disabled={isSaving}
                  onClick={() => handleRucniVazbaToggle(invoiceRowId, invoiceRow, {
                    eeoId: f.id,
                    eeoCislo: f.cislo_faktury,
                    cisloObjednavky: candidate.cislo_objednavky,
                  })}
                >
                  {isSaving ? 'Ukládám…' : isManualPick ? '✕ zrušit ruční výběr' : '✓ označit jako správnou'}
                </RucniVazbaLink>
              )}
            </EeoFakturaRow>
          );
        })}
      </EeoFakturyBox>
    );
  };

  // Rozparsuje `financovani` JSON objednávky (stejná pole jako sloupec
  // Financování v tabulce objednávek na kandidátní objednávce níže) do
  // {label, detail, bg, color} pro badge v záhlaví fan-karty.
  const parseFinancovaniBadge = (financovani) => {
    if (!financovani) return null;
    try {
      const data = typeof financovani === 'string' ? JSON.parse(financovani) : financovani;
      const typ = data.TYP || data.typ;

      if (typ === 'LP') {
        const lpKody = data.LP_KODY || data.lp_kody || [];
        let detail = '';
        if (lpKody.length > 0 && lpSeznam.length > 0) {
          detail = lpKody.map((lpId) => {
            const lp = lpSeznam.find((l) => l.id === parseInt(lpId, 10));
            if (!lp) return `LP ID ${lpId}`;
            const cisloLp = lp.cislo_lp || `LP-${lpId}`;
            return cisloLp.split('/')[0];
          }).join(', ');
        } else if (lpKody.length > 0) {
          detail = lpKody.map((k) => `LP ID ${k}`).join(', ');
        }
        return { label: 'LP', detail, bg: '#fef3c7', color: '#92400e' };
      }
      if (typ === 'SMLOUVA') {
        return { label: 'Smlouva', detail: data.cislo_smlouvy || data.CISLO_SMLOUVY || '', bg: '#f0f9ff', color: '#0369a1' };
      }
      if (typ === 'INDIVIDUALNI' || typ === 'INDIVIDUALNI_SCHVALENI') {
        return { label: 'Individuální schválení', detail: data.individualni_schvaleni || '', bg: '#fce7f3', color: '#9f1239' };
      }
      if (typ === 'POJISTNA_UDALOST') {
        return { label: 'Pojistná událost', detail: data.pojistna_udalost_cislo || '', bg: '#fef3c7', color: '#ea580c' };
      }
      return { label: typ || 'Jiné', detail: '', bg: '#f3f4f6', color: '#6b7280' };
    } catch (e) {
      return { label: String(financovani), detail: '', bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  // Jeden řádek "faktura <-> kandidátní objednávka" - sdílené mezi jednoduchou
  // 1:1 kartou a "fan" kartou (víc faktur, jedna sdílená objednávka), aby
  // obě vypadaly stejně a používaly stejný CSS.
  const renderPairRow = (row, candidate, pv, matchedFaktury, hideCandidateNode = false) => {
    const tone = candidate ? (pv ? pv.verdict : 'warn') : 'warn';
    const fakturaDatumVystaveni = parseFlexibleDate(row.original.dof);
    const fakturaDatumPrijeti = parseFlexibleDate(row.original.datpri);
    const fakturaSplatnost = parseFlexibleDate(row.original.spl);

    return (
      <SimplePairCard key={row.id}>
        <SkupinaNode>
          <span className="n">VS: {row.original.cfak}</span>
          <span className="m">{row.original.firma_nazev}{row.original.firma_ico ? ` · IČO: ${row.original.firma_ico}` : ''}</span>
          {row.original.nazevfak && <span className="m" title={row.original.nazevfak}>{row.original.nazevfak}</span>}
          <span className="m">
            {fakturaDatumVystaveni && <>vystavení <b>{formatDateShort(fakturaDatumVystaveni)}</b></>}
            {!fakturaDatumVystaveni && fakturaDatumPrijeti && <>přijetí <b>{formatDateShort(fakturaDatumPrijeti)}</b></>}
            {fakturaSplatnost && <> · splatnost <b>{formatDateShort(fakturaSplatnost)}</b></>}
          </span>
          <span className="m">Číslo dokladu: <b>{row.original.cdok || '—'}</b></span>
          <span className="m">Číslo objednávky (VEMA): <b>{row.original.cobj_formatovane || row.original.cobj || '—'}</b></span>
          <span className="m">Částka: <b>{formatKc(row.original.celkem || 0)}</b></span>
          <span className="m">Datum vystavení: <b>{fakturaDatumVystaveni ? formatDateShort(fakturaDatumVystaveni) : '—'}</b></span>
          {(row.original.typdok !== null && row.original.typdok !== undefined && row.original.typdok !== '') && (
            <span
              className="m"
              style={Number(row.original.typdok) === VEMA_TYPDOK_ZALOHOVA ? { color: '#b45309', fontWeight: 700 } : undefined}
            >
              Typ dokladu: <b>{VEMA_TYPDOK_LABELS[Number(row.original.typdok)] || `kód ${row.original.typdok}`}</b>
            </span>
          )}
          {/* Bez kandidáta nemáme objednávku, ke které natáhnout skutečné EEO
              faktury - jediné, co nabídnout, je stará fuzzy shoda. */}
          {!candidate && identifikacePanelyFor(row.original, matchedFaktury)}
          <div style={{ marginTop: 6 }}>
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 6px 0' }} />
                  {kontrolaCellFor(row)}
                </div>
        </SkupinaNode>
        {!candidate && (
          <>
            <SkupinaWire $verdict="bad" />
            <EeoFakturyBox style={{ borderColor: VERDICT_COLORS.bad.border, background: VERDICT_COLORS.bad.bg }}>
              <EeoFakturyBoxTitle style={{ color: VERDICT_COLORS.bad.text }}>EEO — objednávka</EeoFakturyBoxTitle>
              <span style={{ fontSize: '0.7rem', color: VERDICT_COLORS.bad.text }}>
                Kandidát nenalezen. Oprava patří do VEMA / EEO u zdrojových dokladů, ne sem - poznámku k řešení zapište do dialogu Kontrola.
              </span>
            </EeoFakturyBox>
          </>
        )}
        {candidate && (
          <>
            <SkupinaWire $verdict={tone} />
            {/* Ve "fan" kartě (víc faktur na jedné sdílené objednávce) je
                objednávka už jednou vypsaná v záhlaví karty - opakovat ji
                u každého řádku je zbytečná duplicita. */}
            {!hideCandidateNode && (
              <SkupinaNode>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="n" {...clickableProps(() => openOrderPreview(candidate.id), 'Zobrazit náhled objednávky')}>{candidate.cislo_objednavky}</span>
                  <OpenInFormButton type="button" onClick={() => openOrderInFullForm(candidate.id)} title="Otevřít objednávku ve formuláři">
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                  </OpenInFormButton>
                </div>
                <span className="m">{candidate.dodavatel}</span>
                {candidate.nazev && <span className="m" title={candidate.nazev}>{candidate.nazev}</span>}
                {(() => {
                  const d = parseFlexibleDate(candidate.dt_objednavky);
                  return d ? <span className="m">objednáno {formatDateShort(d)}</span> : null;
                })()}
                {pv && (
                  <CondRow style={{ marginTop: 4 }}>
                    <Cond $tick={pv.eeoVazba} title={pv.eeoVazbaDetail}>
                      <span className="label">vazba EEO</span>
                      <span className="detail">{pv.eeoVazbaDetail}</span>
                    </Cond>
                    <Cond $tick={pv.castka} title={pv.castkaDetail}>
                      <span className="label">částka</span>
                      <span className="detail">{pv.castkaDetail}</span>
                    </Cond>
                    <Cond $tick={pv.datum} title={pv.datumDetail}>
                      <span className="label">datum</span>
                      <span className="detail">{pv.datumDetail}</span>
                    </Cond>
                  </CondRow>
                )}
              </SkupinaNode>
            )}
            {eeoFakturyPanelFor(candidate, row.original, row.id)}
          </>
        )}
      </SimplePairCard>
    );
  };

  // Porovnání dvou invoiceRows podle jednoho pole DOKLADY_SORT_FIELDS -
  // chybějící hodnota (null) vždy propadne na konec bez ohledu na směr,
  // aby "neznámé" doklady neskákaly nahoru jen proto, že asc řazení chybějící
  // hodnotu (Infinity/-Infinity) čte jako extrém.
  const compareInvoiceRowsByField = (a, b, field, dir) => {
    const getValue = DOKLADY_SORT_FIELDS[field].getValue;
    const va = getValue(a);
    const vb = getValue(b);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    const diff = va - vb;
    return dir === 'asc' ? diff : -diff;
  };

  // Doklady uvnitř jedné vazební skupiny (fan/matrix karta) se ze serveru
  // vrací v pořadí podle data přijetí (datpri DESC) - pro čtení je ale
  // přirozenější mít je seřazené podle částky/data/typu, dle volby uživatele
  // u konkrétní karty (viz DOKLADY_SORT_FIELDS + přepínač v hlavičce karty).
  // Řadí se jen kopie pole těsně před vykreslením, nemění to žádnou jinou
  // logiku (verdikty, kontrola stav...).
  //
  // Zálohová a zúčtovací faktura ke stejné objednávce mívají STEJNOU částku
  // (zúčtovací "vynuluje" zálohu) - zvolené primární pole tak může být
  // nerozhodné. Pro takový případ se zbylá dvě pole použijí jako dorovnávací
  // kritéria (ve svém výchozím směru), aby výsledné pořadí bylo vždy
  // stabilní a smysluplné, ne jen náhoda z pořadí, v jakém dorazila data ze
  // serveru.
  const sortInvoiceRowsBy = (rows, sort) => {
    const { field, dir } = sort;
    const fallbackFields = DOKLADY_SORT_FIELD_ORDER.filter((f) => f !== field);
    return [...rows].sort((a, b) => {
      const primary = compareInvoiceRowsByField(a, b, field, dir);
      if (primary !== 0) return primary;
      for (const f of fallbackFields) {
        const c = compareInvoiceRowsByField(a, b, f, DOKLADY_SORT_FIELDS[f].defaultDir);
        if (c !== 0) return c;
      }
      return String(a.original?.cfak || '').localeCompare(String(b.original?.cfak || ''));
    });
  };

  // Trojice tlačítek pro volbu řazení dokladů dané karty (částka/datum/typ) -
  // sdílené mezi fan (renderObjGroupCard) a matrix (renderMatrixCard) kartou,
  // ať se vzhled i chování nerozjedou na dvou místech zvlášť.
  const renderDokladySortControl = (groupId) => {
    const activeSort = getGroupSort(groupId);
    return DOKLADY_SORT_FIELD_ORDER.map((field) => {
      const isActive = activeSort.field === field;
      return (
        <SortTogglePill
          key={field}
          type="button"
          $active={isActive}
          onClick={() => setGroupSortField(groupId, field)}
          title={`Řadit doklady v této skupině podle: ${DOKLADY_SORT_FIELDS[field].label}`}
        >
          {DOKLADY_SORT_FIELDS[field].label}{isActive ? (activeSort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
        </SortTogglePill>
      );
    });
  };

  // Čeština má tři tvary počítaného podstatného jména - 1/2-4/5+.
  const pluralKandidatnichFaktur = (n) => {
    if (n === 1) return 'kandidátní faktura';
    if (n >= 2 && n <= 4) return 'kandidátní faktury';
    return 'kandidátních faktur';
  };

  // Sjednocená karta pro 1:1 pár i "fan" (víc faktur sdílejících jednu
  // kandidátní objednávku - typicky sourozenecké podpoložky přes stejný
  // prefix čísla objednávky). Obojí má STEJNOU strukturu: OBJ v záhlaví
  // (číslo, stav, financování, data/objednatel/schvalovatel) a pod ní jeden
  // řádek "faktura <-> OBJ + EEO faktury" na fakturu - u 1:1 páru je ten
  // řádek jen jeden. Bez kandidáta OBJ header nedává smysl (není co ukázat),
  // proto je to samostatná, jednodušší větev.
  const renderObjGroupCard = (group) => {
    const { groupId, invoiceRows, candidates, pairVerdicts, matchedFakturyByRowId } = group;
    const candidate = candidates[0];

    if (!candidate) {
      const row = invoiceRows[0];
      return (
        <VazebniSkupinaCard key={groupId}>
          <VazebniSkupinaStripe $verdict="warn" />
          <VazebniSkupinaBody>
            <VazebniSkupinaHead>
              <div>
                <VazebniSkupinaTitle>{row.original.cfak ? `VS: ${row.original.cfak}` : '—'}</VazebniSkupinaTitle>
                <VazebniSkupinaSub>{row.original.firma_nazev} · {formatKc(row.original.celkem || 0)}</VazebniSkupinaSub>
              </div>
              <SkupinaPill $tone="warn">bez kandidáta</SkupinaPill>
            </VazebniSkupinaHead>
            {renderPairRow(row, null, null, matchedFakturyByRowId[row.id])}
          </VazebniSkupinaBody>
        </VazebniSkupinaCard>
      );
    }

    const isSingle = invoiceRows.length === 1;
    const rowVerdicts = invoiceRows.map((row) => pairVerdicts[`${row.id}__${candidate.id}`]).filter(Boolean);
    const toReviewCount = rowVerdicts.filter((pv) => pv.verdict === 'warn').length;
    // U 1:1 páru je "tone" verdikt toho jednoho páru (chybějící verdikt = 'warn',
    // ne tichá zelená); u fan skupiny je to souhrn napříč všemi páry.
    const groupTone = isSingle
      ? (rowVerdicts[0] ? rowVerdicts[0].verdict : 'warn')
      : (rowVerdicts.length > 0 && rowVerdicts.every((pv) => pv.verdict === 'good') ? 'good' : 'mixed');

    return (
      <VazebniSkupinaCard key={groupId}>
        <VazebniSkupinaStripe $verdict={groupTone} />
        <VazebniSkupinaBody>
          <VazebniSkupinaHead style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '1.5rem', flex: '1 1 auto', minWidth: 0 }}>
              <div style={{ flex: '0 1 auto', minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <VazebniSkupinaTitle
                      style={{ margin: 0 }}
                      {...clickableProps(() => openOrderPreview(candidate.id), 'Zobrazit náhled objednávky')}
                    >
                      {candidate.cislo_objednavky}
                    </VazebniSkupinaTitle>
                    <OpenInFormButton type="button" onClick={() => openOrderInFullForm(candidate.id)} title="Otevřít objednávku ve formuláři" style={{ marginLeft: '0.15rem' }}>
                      <FontAwesomeIcon icon={faExternalLinkAlt} />
                    </OpenInFormButton>
                  </span>
                  {candidate.stav && (() => {
                    const statusColor = getStatusColor(getOrderSystemStatus({ stav_objednavky: candidate.stav }));
                    return (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: 4,
                          whiteSpace: 'nowrap',
                          background: statusColor.light,
                          color: statusColor.dark,
                        }}
                      >
                        {candidate.stav}
                      </span>
                    );
                  })()}
                  {(() => {
                    const fin = parseFinancovaniBadge(candidate.financovani);
                    if (!fin) return null;
                    const isClickableSmlouva = fin.label === 'Smlouva' && fin.detail;
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span
                          {...(isClickableSmlouva
                            ? clickableProps(() => openSmlouvaPreview(fin.detail), 'Zobrazit náhled smlouvy')
                            : {})}
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: isClickableSmlouva ? '0.2rem 0.35rem 0.2rem 0.55rem' : '0.2rem 0.55rem',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            background: fin.bg,
                            color: fin.color,
                            ...(isClickableSmlouva ? { cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' } : {}),
                          }}
                          title={isClickableSmlouva ? 'Zobrazit náhled smlouvy' : (fin.detail || undefined)}
                        >
                          {fin.label}{fin.detail ? `: ${fin.detail}` : ''}
                        </span>
                        {isClickableSmlouva && (
                          <OpenInFormButton
                            type="button"
                            onClick={() => openSmlouvaInEditForm(fin.detail)}
                            title={canEditContract ? 'Otevřít smlouvu k editaci' : 'Zobrazit smlouvu (nemáte právo editace)'}
                            style={{ marginLeft: '0.05rem' }}
                          >
                            <FontAwesomeIcon icon={faExternalLinkAlt} />
                          </OpenInFormButton>
                        )}
                      </span>
                    );
                  })()}
                </div>
                <VazebniSkupinaSub>
                  {candidate.dodavatel}{candidate.dodavatel_ico ? ` · IČO: ${candidate.dodavatel_ico}` : ''}{candidate.nazev ? ` · ${candidate.nazev}` : ''}
                </VazebniSkupinaSub>
                <VazebniSkupinaSub style={{ color: '#94a3b8' }}>
                  {invoiceRows.length} {pluralKandidatnichFaktur(invoiceRows.length)} ke stejné objednávce
                </VazebniSkupinaSub>
              </div>
              {/* Souhrn objednávky - vedle popisu objednávky (ne pod ním),
                  v hlavičce je dost volného vodorovného prostoru. */}
              {(() => {
                const dVytvoreno = parseFlexibleDate(candidate.dt_vytvoreni);
                const dObjednano = parseFlexibleDate(candidate.dt_objednavky);
                const dSchvaleno = parseFlexibleDate(candidate.dt_schvaleni);
                const objJmeno = candidate.objednatel_jmeno || candidate.zadavatel_jmeno;
                const objPrijmeni = candidate.objednatel_prijmeni || candidate.zadavatel_prijmeni;
                const objednatel = objJmeno ? `${objJmeno} ${objPrijmeni || ''}`.trim() : null;
                const schvalovatel = candidate.schvalovatel_jmeno
                  ? `${candidate.schvalovatel_jmeno} ${candidate.schvalovatel_prijmeni || ''}`.trim()
                  : null;
                const substInfo = candidate.substitution_info && candidate.substitution_info.schvalovatel;

                const items = [];
                if (dVytvoreno) items.push(['Vytvořeno', formatDateShort(dVytvoreno)]);
                if (dObjednano) items.push(['Objednáno', formatDateShort(dObjednano)]);
                if (objednatel) items.push(['Objednatel', objednatel]);
                if (schvalovatel) {
                  const schvalenoSuffix = dSchvaleno ? ` (${formatDateShort(dSchvaleno)})` : '';
                  const substSuffix = substInfo ? ` — v zastoupení za ${substInfo.zastupovany_jmeno}` : '';
                  items.push(['Schválil', `${schvalovatel}${schvalenoSuffix}${substSuffix}`]);
                } else if (dSchvaleno) {
                  items.push(['Schváleno', formatDateShort(dSchvaleno)]);
                }
                // Součet položek objednávky (skutečná cena z detailu), NE
                // max_cena_s_dph (odhad/cena pro schválení) - viz zpětná
                // vazba. Vykresluje se jako poslední, výrazněji (větší/tučnější
                // písmo) a natvrdo přiřazená do 2. sloupce mřížky, ať vždy
                // vyjde jako poslední řádek pravého sloupce (pod "Objednatel").
                const hasCena = candidate.castka_detail !== null && candidate.castka_detail !== undefined;
                if (items.length === 0 && !hasCena) return null;

                return (
                  <ObjInfoGrid>
                    {items.map(([label, value]) => (
                      <div className="item" key={label}>
                        <span className="label">{label}:</span>
                        <span className="value">{value}</span>
                      </div>
                    ))}
                    {hasCena && (
                      <div className="item" style={{ gridColumn: 2, alignItems: 'baseline' }}>
                        <span className="label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af' }}>Cena objednávky:</span>
                        <span className="value" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e40af' }}>
                          {formatKc(candidate.castka_detail)}
                        </span>
                      </div>
                    )}
                  </ObjInfoGrid>
                );
              })()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                {isSingle ? (
                  <SkupinaPill $tone={groupTone}>
                    {groupTone === 'good' ? 'potvrzeno v EEO' : groupTone === 'bad' ? 'nesedí' : 'odhad, ověřit'}
                  </SkupinaPill>
                ) : (
                  <>
                    {renderDokladySortControl(groupId)}
                    <SkupinaPill $tone="warn">{invoiceRows.length} faktur</SkupinaPill>
                    {toReviewCount > 0 && <SkupinaPill $tone="warn">{toReviewCount} ke kontrole</SkupinaPill>}
                  </>
                )}
              </div>
              {/* Proč "nesedí"/"odhad, ověřit" - jen u 1:1 páru (u fan/matrix
                  karty se tón lišší mezi řádky, vysvětlení patří k jednotlivému
                  páru, ne do záhlaví celého bloku). Priorita shodná s tím, co
                  na serveru určuje celkový verdikt (vema_beta_derive_group_verdicts). */}
              {isSingle && rowVerdicts[0] && groupTone !== 'good' && (() => {
                const pv = rowVerdicts[0];
                const reason = pv.eeoVazba === 'no' ? pv.eeoVazbaDetail
                  : pv.datum === 'no' ? pv.datumDetail
                  : pv.castka === 'no' ? pv.castkaDetail
                  : pv.eeoVazba === 'unk' ? pv.eeoVazbaDetail
                  : null;
                if (!reason) return null;
                const reasonColor = VERDICT_COLORS[groupTone]?.text || VERDICT_COLORS.bad.text;
                return (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: reasonColor, textAlign: 'right', maxWidth: 280, lineHeight: 1.3 }}>
                    {reason}
                  </span>
                );
              })()}
            </div>
          </VazebniSkupinaHead>
          {renderCobjTypoWarning(invoiceRows, pairVerdicts)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Řazeno podle volby uživatele u této karty (viz sort control výše)
                - stejné doklady na stejné objednávce se tak čtou v logickém
                pořadí, obdobně jako pořadí dokladů podle typu na detailu
                objednávky. */}
            {sortInvoiceRowsBy(invoiceRows, getGroupSort(groupId)).map((row, idx) => {
              const pv = pairVerdicts[`${row.id}__${candidate.id}`];
              return (
                <div key={row.id} style={idx > 0 ? { paddingTop: '0.6rem', borderTop: '1px solid #e2e8f0' } : undefined}>
                  {renderPairRow(row, candidate, pv, [], true)}
                </div>
              );
            })}
          </div>
        </VazebniSkupinaBody>
      </VazebniSkupinaCard>
    );
  };

  // Zvýrazní podezření, že VEMA cobj a EEO číslo objednávky, kterou EEO
  // fakturu reálně eviduje, se liší jen přehozenými číslicemi (typický ruční
  // překlep ve VEMA, např. 0274 vs 0724) - konkrétní a snadno opravitelný
  // nález, který si zaslouží vlastní výrazný banner v záhlaví karty, ne jen
  // tichý červený "nesedí" u jednotlivého páru.
  const renderCobjTypoWarning = (invoiceRows, pairVerdicts) => {
    const findings = [];
    const seen = new Set();
    Object.entries(pairVerdicts || {}).forEach(([key, pv]) => {
      if (pv.eeoVazba !== 'no') return;
      const m = pv.eeoVazbaDetail && pv.eeoVazbaDetail.match(/jinou objednávkou \(([^)]+)\)/);
      if (!m) return;
      const targetCislo = m[1];
      const rowId = key.split('__')[0];
      const row = invoiceRows.find((r) => r.id === rowId);
      if (!row) return;
      const vemaCobj = row.original.cobj_formatovane || row.original.cobj;
      const coreVema = extractObjCore(vemaCobj);
      const coreTarget = extractObjCore(targetCislo);
      if (!coreVema || !coreTarget || !isDigitTransposition(coreVema, coreTarget)) return;
      const dedupKey = `${row.original.cfak}__${targetCislo}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      findings.push({ vs: row.original.cfak, vemaCobj, targetCislo });
    });
    if (findings.length === 0) return null;
    return (
      <div
        style={{
          margin: '0.5rem 0 0.75rem',
          padding: '0.5rem 0.75rem',
          borderRadius: 8,
          border: `1px solid ${VERDICT_COLORS.bad.border}`,
          background: VERDICT_COLORS.bad.bg,
          color: VERDICT_COLORS.bad.text,
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        ⚠ Nesedí číslo objednávky - podezření na přehozené číslice ve VEMA:
        {findings.map((f) => (
          <div key={`${f.vs}_${f.targetCislo}`} style={{ fontWeight: 500, marginTop: 2 }}>
            VS {f.vs}: VEMA uvádí <b>{f.vemaCobj}</b>, ale EEO má tuto fakturu spárovanou s <b>{f.targetCislo}</b>.
          </div>
        ))}
      </div>
    );
  };

  const renderMatrixCard = (group) => {
    const { groupId, invoiceRows, candidates, pairVerdicts, matchedFakturyByRowId } = group;
    const verdictsInGroup = Object.values(pairVerdicts).map((pv) => pv.verdict);
    const toReviewCount = verdictsInGroup.filter((v) => v === 'warn').length;
    const groupTone = verdictsInGroup.length > 0 && verdictsInGroup.every((v) => v === 'good') ? 'good' : 'mixed';

    return (
      <VazebniSkupinaCard key={groupId}>
        <VazebniSkupinaStripe $verdict={groupTone} />
        <VazebniSkupinaBody>
          <VazebniSkupinaHead>
            <div>
              <VazebniSkupinaTitle>Vazební skupina ({invoiceRows.length} faktur × {candidates.length} objednávek)</VazebniSkupinaTitle>
              <VazebniSkupinaSub>
                Faktury sdílejí prefix čísla objednávky, takže vzniká víc kandidátních párů. Zeleně je pár, který už má EEO samo spárovanou fakturu s touto objednávkou; jinak se barva odvozuje jen odhadem z částky a data.
              </VazebniSkupinaSub>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {invoiceRows.length > 1 && renderDokladySortControl(groupId)}
              <SkupinaPill $tone="warn">{invoiceRows.length} faktur</SkupinaPill>
              <SkupinaPill $tone="warn">{candidates.length} objednávek</SkupinaPill>
              {toReviewCount > 0 && <SkupinaPill $tone="warn">{toReviewCount} párů ke kontrole</SkupinaPill>}
            </div>
          </VazebniSkupinaHead>
          {renderCobjTypoWarning(invoiceRows, pairVerdicts)}

          <MatchMatrixWrap>
            <MatchMatrixGrid style={{ gridTemplateColumns: `230px repeat(${candidates.length}, minmax(190px, 1fr))` }}>
              <MatrixCorner>faktura ↓ / objednávka →</MatrixCorner>
              {candidates.map((cand) => {
                const objDatum = parseFlexibleDate(cand.dt_objednavky);
                return (
                  <MatrixColHead key={cand.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="n" {...clickableProps(() => openOrderPreview(cand.id), 'Zobrazit náhled objednávky')}>{cand.cislo_objednavky}</span>
                      <OpenInFormButton type="button" onClick={() => openOrderInFullForm(cand.id)} title="Otevřít objednávku ve formuláři">
                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                      </OpenInFormButton>
                    </div>
                    <span className="m">{cand.dodavatel}</span>
                    {cand.nazev && <span className="m" title={cand.nazev}>{cand.nazev}</span>}
                    {objDatum && <span className="m">objednáno {formatDateShort(objDatum)}</span>}
                    <div style={{ marginTop: 4, textAlign: 'left' }}>{eeoFakturyPanelFor(cand, null)}</div>
                  </MatrixColHead>
                );
              })}

              {sortInvoiceRowsBy(invoiceRows, getGroupSort(groupId)).map((row) => (
                <React.Fragment key={row.id}>
                  <MatrixRowHead>
                    <span className="n">VS: {row.original.cfak}</span>
                    <span className="m">{row.original.firma_nazev}{row.original.firma_ico ? ` · IČO: ${row.original.firma_ico}` : ''}</span>
                    {row.original.nazevfak && <span className="m" title={row.original.nazevfak}>{row.original.nazevfak}</span>}
                    <span className="m">
                      {(() => {
                        const dV = parseFlexibleDate(row.original.dof);
                        const dP = parseFlexibleDate(row.original.datpri);
                        const dSpl = parseFlexibleDate(row.original.spl);
                        return (
                          <>
                            {dV && <>vystavení <b>{formatDateShort(dV)}</b></>}
                            {!dV && dP && <>přijetí <b>{formatDateShort(dP)}</b></>}
                            {dSpl && <> · splatnost <b>{formatDateShort(dSpl)}</b></>}
                          </>
                        );
                      })()}
                    </span>
                    <span className="m">Číslo dokladu: <b>{row.original.cdok || '—'}</b></span>
                    <span className="m">Číslo objednávky (VEMA): <b>{row.original.cobj_formatovane || row.original.cobj || '—'}</b></span>
                    <span className="m">Částka: <b>{formatKc(row.original.celkem || 0)}</b></span>
                    <span className="m">Datum vystavení: <b>{(() => {
                      const dV = parseFlexibleDate(row.original.dof);
                      return dV ? formatDateShort(dV) : '—';
                    })()}</b></span>
                    {(row.original.typdok !== null && row.original.typdok !== undefined && row.original.typdok !== '') && (
                      <span
                        className="m"
                        style={Number(row.original.typdok) === VEMA_TYPDOK_ZALOHOVA ? { color: '#b45309', fontWeight: 700 } : undefined}
                      >
                        Typ dokladu: <b>{VEMA_TYPDOK_LABELS[Number(row.original.typdok)] || `kód ${row.original.typdok}`}</b>
                      </span>
                    )}
                    {identifikacePanelyFor(row.original, matchedFakturyByRowId[row.id])}
                    <div style={{ marginTop: 6 }}>
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 6px 0' }} />
                  {kontrolaCellFor(row)}
                </div>
                  </MatrixRowHead>
                  {candidates.map((cand) => {
                    const pv = pairVerdicts[`${row.id}__${cand.id}`];
                    if (!pv) {
                      return (
                        <MatrixCell key={cand.id} $verdict="bad">
                          <MatrixCellVerdict $verdict="bad">Nesedí</MatrixCellVerdict>
                        </MatrixCell>
                      );
                    }
                    const verdictLabel = pv.verdict === 'good' ? 'Potvrzeno v EEO' : pv.verdict === 'bad' ? 'Nesedí' : 'Odhad, ověřit';
                    return (
                      <MatrixCell key={cand.id} $verdict={pv.verdict}>
                        <MatrixCellVerdict $verdict={pv.verdict}>{verdictLabel}</MatrixCellVerdict>
                        <CondRow>
                          <Cond $tick={pv.eeoVazba} title={pv.eeoVazbaDetail}>
                            <span className="label">vazba EEO</span>
                            <span className="detail">{pv.eeoVazbaDetail}</span>
                          </Cond>
                          <Cond $tick={pv.castka} title={pv.castkaDetail}>
                            <span className="label">částka</span>
                            <span className="detail">{pv.castkaDetail}</span>
                          </Cond>
                          <Cond $tick={pv.datum} title={pv.datumDetail}>
                            <span className="label">datum</span>
                            <span className="detail">{pv.datumDetail}</span>
                          </Cond>
                        </CondRow>
                      </MatrixCell>
                    );
                  })}
                </React.Fragment>
              ))}
            </MatchMatrixGrid>
          </MatchMatrixWrap>
        </VazebniSkupinaBody>
      </VazebniSkupinaCard>
    );
  };

  // Skupiny rozdělíme na 2 sady, aby jednoznačné (malé) páry nemusely
  // zbytečně zabírat celou šířku obrazovky jako plnohodnotný řádek - jdou
  // vedle sebe jako dlaždice. Do dlaždicové sekce (potvrzeno) patří JEN 1:1
  // páry, kde verdikt vyšel 'good' (server je označí jako verdictCategory
  // 'good') - vše ostatní (fan/matrix/no_candidate/bad/warn) vyžaduje
  // pozornost. Klasifikaci i počty (verdictCounts) už dodává server.
  const attentionItems = []; // { groupId, node } - matice i 1:1 páry co nesedí/nejde ověřit
  const confirmedGroups = [];

  groups.forEach((group) => {
    if (group.verdictCategory === 'matrix') {
      attentionItems.push({ groupId: group.groupId, node: renderMatrixCard(group) });
    } else if (group.verdictCategory === 'good') {
      confirmedGroups.push(group);
    } else {
      // 'fan' i 1:1 páry (no_candidate/bad/warn) používají stejnou sjednocenou kartu.
      attentionItems.push({ groupId: group.groupId, node: renderObjGroupCard(group) });
    }
  });

  const hasAnyVerdictCounts = Object.values(verdictCounts).some((n) => n > 0);
  const hasAnyFinancovaniCounts = Object.values(financovaniCounts).some((n) => n > 0);

  return (
    <>
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {hasAnyVerdictCounts && (
        <VerdictFilterBar style={{ opacity: groupsLoading ? 0.55 : 1, pointerEvents: groupsLoading ? 'none' : 'auto', transition: 'opacity 0.15s ease' }}>
          {Object.entries(VERDICT_CATEGORY_META).map(([key, meta]) => {
            const count = verdictCounts[key] || 0;
            if (count === 0) return null;
            return (
              <VerdictFilterChip
                key={key}
                type="button"
                disabled={groupsLoading}
                $active={verdictFilter === key}
                $bg={meta.bg}
                $border={meta.border}
                $text={meta.text}
                onClick={() => setVerdictFilter((prev) => (prev === key ? null : key))}
                title={`Filtrovat podle vyhodnocení: ${meta.label}`}
              >
                {verdictFilter === key ? '✓ ' : ''}{meta.label} ({count})
              </VerdictFilterChip>
            );
          })}
          {hasAnyFinancovaniCounts && (
            <>
              <span style={{ width: 1, alignSelf: 'stretch', background: '#e2e8f0', margin: '0 0.15rem' }} />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, alignSelf: 'center' }}>Financování:</span>
              {Object.entries(FINANCOVANI_FILTER_META).map(([key, meta]) => {
                const count = financovaniCounts[key] || 0;
                if (count === 0) return null;
                return (
                  <VerdictFilterChip
                    key={key}
                    type="button"
                    disabled={groupsLoading}
                    $active={financovaniFilter.includes(key)}
                    $bg={meta.bg}
                    $border={meta.border}
                    $text={meta.text}
                    onClick={() => toggleFinancovaniFilter(key)}
                    title={`Filtrovat podle financování: ${meta.label}`}
                  >
                    {financovaniFilter.includes(key) ? '✓ ' : ''}{meta.label} ({count})
                  </VerdictFilterChip>
                );
              })}
            </>
          )}
          {groupsLoading && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
              <LoadingSpinner style={{ width: 13, height: 13, borderWidth: 2 }} />
              Načítám…
            </span>
          )}
        </VerdictFilterBar>
      )}

      {groupsError && <ErrorMessage>{groupsError}</ErrorMessage>}

      {groupsLoading ? (
        <LoadingInline>
          <LoadingSpinner />
          <span>Načítám seskupený pohled…</span>
        </LoadingInline>
      ) : (
        <>
          {attentionItems.length === 0 && confirmedGroups.length === 0 && (
            <SkupinaLoadingCard>
              <span>Žádné položky neodpovídají aktuálním filtrům.</span>
            </SkupinaLoadingCard>
          )}

          {attentionItems.length > 0 && (
            <div>
              {confirmedGroups.length > 0 && (
                <GroupsSectionLabel>Vyžaduje pozornost ({attentionItems.length})</GroupsSectionLabel>
              )}
              <MatrixGroupsStack>
                {attentionItems.map((item) => (
                  <React.Fragment key={item.groupId}>{item.node}</React.Fragment>
                ))}
              </MatrixGroupsStack>
            </div>
          )}

          {confirmedGroups.length > 0 && (
            <div>
              {attentionItems.length > 0 && (
                <GroupsSectionLabel>Potvrzená shoda ({confirmedGroups.length})</GroupsSectionLabel>
              )}
              <SimpleTileGrid>
                {confirmedGroups.map((group) => renderObjGroupCard(group))}
              </SimpleTileGrid>
            </div>
          )}

          {pagination.total > 0 && (
            <PaginationContainer>
              <PaginationInfo>
                Celkem {pagination.total} skupin
              </PaginationInfo>
              <PaginationControls>
                {pagination.total_pages > 1 && (
                  <>
                    <PageButton onClick={() => setPage(1)} disabled={pagination.page <= 1}>
                      <FontAwesomeIcon icon={faAnglesLeft} />
                    </PageButton>
                    <PageButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1}>
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </PageButton>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0.5rem' }}>
                      Stránka {pagination.page} z {pagination.total_pages}
                    </span>
                    <PageButton onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={pagination.page >= pagination.total_pages}>
                      <FontAwesomeIcon icon={faChevronRight} />
                    </PageButton>
                    <PageButton onClick={() => setPage(pagination.total_pages)} disabled={pagination.page >= pagination.total_pages}>
                      <FontAwesomeIcon icon={faAnglesRight} />
                    </PageButton>
                  </>
                )}
                <PageSizeSelector value={groupedPageSize} onChange={(e) => setGroupedPageSize(Number(e.target.value))}>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size} / stránku</option>
                  ))}
                </PageSizeSelector>
              </PaginationControls>
            </PaginationContainer>
          )}
        </>
      )}
    </div>

    <SlideInDetailPanel
      isOpen={orderPreview.open}
      onClose={closeOrderPreview}
      entityType="orders_2025"
      entityId={orderPreview.orderId}
      loading={orderPreview.loading}
      numberLabel={orderPreview.data?.cislo_objednavky}
    >
      {orderPreview.error && (
        <ErrorMessage>{orderPreview.error}</ErrorMessage>
      )}
      {!orderPreview.error && orderPreview.data && (
        <OrderFormReadOnly
          orderData={orderPreview.data}
          isReadOnlyMode
          token={token}
          username={username}
        />
      )}
    </SlideInDetailPanel>

    <SlideInDetailPanel
      isOpen={invoicePreview.open}
      onClose={closeInvoicePreview}
      entityType="invoices"
      entityId={invoicePreview.faktura?.id}
      loading={false}
      numberLabel={invoicePreview.faktura ? `${invoicePreview.faktura.cislo_faktury || ''}${invoicePreview.faktura.fa_vema_kod ? ` / ${invoicePreview.faktura.fa_vema_kod}` : ''}`.trim() : null}
    >
      {invoicePreview.faktura && (
        <InvoiceQuickView
          faktura={invoicePreview.faktura}
          candidate={invoicePreview.candidate}
          invoiceRow={invoicePreview.invoiceRow}
        />
      )}
    </SlideInDetailPanel>

    <SlideInDetailPanel
      isOpen={smlouvaPreview.open}
      onClose={closeSmlouvaPreview}
      entityType="contracts"
      entityId={smlouvaPreview.data?.id}
      loading={smlouvaPreview.loading}
      numberLabel={smlouvaPreview.data?.cislo_smlouvy || smlouvaPreview.cisloSmlouvy}
    >
      {smlouvaPreview.error && (
        <ErrorMessage>{smlouvaPreview.error}</ErrorMessage>
      )}
      {!smlouvaPreview.error && smlouvaPreview.data && (
        <SmlouvaPreview smlouvaData={smlouvaPreview.data} />
      )}
    </SlideInDetailPanel>
    </>
  );
};

// ============================================================================
// KONTROLA SML - Seskupený pohled: render komponenta
// ============================================================================
//
// Analogie GroupedKontrolaObjView, ale kandidát vazební skupiny je EEO
// SMLOUVA (ne objednávka) - viz backend handle_vema_sml_grouped_list
// (vemaSmlGroupedHandlers.php) pro přesný párovací predikát ("EEO SML má
// PŘÍMO fakturu, BEZ EEO objednávky"). Vůči OBJ variantě je zjednodušená
// o dvě věci, obě záměrně (menší rozsah, jde je doplnit později):
//  - žádný filtr "financování" (to pole existuje jen na objednávce, ne na
//    faktuře napojené přímo na smlouvu),
//  - žádný panel "všechny skutečné EEO faktury na kandidátovi" ani ruční
//    výběr "tohle je ten správný doklad" (to by vyžadovalo obdobu endpointu
//    vema-objednavky/faktury-list pro smlouvy) - místo toho se u každého
//    VEMA řádku ukazuje jen fuzzy-matchované srovnání VS/doklad/částka
//    (identifikacePanelyFor), které backend už vrací v matchedFakturyByRowId.
const GroupedKontrolaSmlView = ({ token, username, userDetail, search, badgeFilter, warningOnlyFilter, kontrolaFilter, verdictFilter, setVerdictFilter, smlouvaWarningFilter, setSmlouvaWarningFilter }) => {
  const navigate = useNavigate();
  const { hasPermission, hasAdminRole } = useContext(AuthContext);
  const isAdminUser = typeof hasAdminRole === 'function' && hasAdminRole();
  const canEditContract = isAdminUser || (typeof hasPermission === 'function' && hasPermission('CONTRACT_EDIT'));
  const canAccessContractModule = isAdminUser || (typeof hasPermission === 'function' && (
    hasPermission('CONTRACT_VIEW') || hasPermission('CONTRACT_CREATE') || hasPermission('CONTRACT_EDIT') || hasPermission('CONTRACT_DELETE')
  ));

  const [dokladySortByGroup, setDokladySortByGroup] = useState({});
  const getGroupSort = (groupId) => dokladySortByGroup[groupId] || { field: 'castka', dir: DOKLADY_SORT_FIELDS.castka.defaultDir };
  const setGroupSortField = (groupId, field) => {
    setDokladySortByGroup((prev) => {
      const current = prev[groupId] || { field: 'castka', dir: DOKLADY_SORT_FIELDS.castka.defaultDir };
      const next = current.field === field
        ? { field, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: DOKLADY_SORT_FIELDS[field].defaultDir };
      return { ...prev, [groupId]: next };
    });
  };

  const [page, setPage] = useState(1);
  const [groupedPageSize, setGroupedPageSize] = useUserScopedPageSize(VEMA_SML_GROUPED_PAGE_SIZE_LS_KEY, userDetail);
  const [groupsResult, setGroupsResult] = useState({ groups: [], verdictCounts: {}, pagination: { page: 1, per_page: 50, total: 0, total_pages: 1 } });
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState(null);
  // Reálné EEO faktury (bez objednávky) pro kandidátní smlouvy viditelné na
  // aktuální stránce - přímo podle smlouva_id, bez fuzzy VS/doklad hledání
  // (viz vema-smlouvy/faktury-list). Analogie objednavkaFakturyData v
  // GroupedKontrolaObjView.
  const [smlouvaFakturyData, setSmlouvaFakturyData] = useState({});
  const [smlShowOkRows, setSmlShowOkRows] = useState({});
  const [smlouvaFakturyLoading, setSmlouvaFakturyLoading] = useState(false);
  // Klíč (invoiceRow.id) právě ukládaného ručního výběru "tohle je ten
  // správný doklad" - jen pro disable tlačítka během requestu.
  const [rucniVazbaSavingKey, setRucniVazbaSavingKey] = useState(null);

  // SML - náhled smlouvy (SmlouvaPreview) + otevření v plném formuláři/detailu
  // číselníku - stejný vzor jako v GroupedKontrolaObjView (openSmlouvaPreview/
  // openSmlouvaInEditForm), jen bez mezikroku "najdi smlouvu podle textového
  // čísla z JSON financování" - kandidát TADY už je přímo smlouva (má id).
  const [smlouvaPreview, setSmlouvaPreview] = useState({ open: false, cisloSmlouvy: null, data: null, loading: false, error: null });
  const openSmlouvaPreview = async (candidate) => {
    if (!candidate?.id) return;
    setSmlouvaPreview({ open: true, cisloSmlouvy: candidate.cislo_smlouvy, data: null, loading: true, error: null });
    try {
      const detail = await getSmlouvaDetail({ token, username, id: candidate.id });
      setSmlouvaPreview((prev) => (prev.cisloSmlouvy === candidate.cislo_smlouvy ? { ...prev, data: detail?.smlouva || null, loading: false } : prev));
    } catch (e) {
      console.error('Chyba při načítání náhledu smlouvy:', e);
      setSmlouvaPreview((prev) => (prev.cisloSmlouvy === candidate.cislo_smlouvy ? { ...prev, loading: false, error: e.message || 'Chyba při načítání smlouvy' } : prev));
    }
  };
  const closeSmlouvaPreview = () => setSmlouvaPreview((prev) => ({ ...prev, open: false }));

  const location = useLocation();
  const openSmlouvaInEditForm = async (candidate) => {
    if (!candidate?.cislo_smlouvy) return;
    if (!canAccessContractModule) {
      openSmlouvaPreview(candidate);
      return;
    }
    const stateKey = canEditContract ? 'editSmlouva' : 'viewSmlouva';
    try {
      const listResponse = await getSmlouvyList({ token, username, search: candidate.cislo_smlouvy, limit: 20 });
      const list = Array.isArray(listResponse) ? listResponse : (listResponse?.data || []);
      const match = list.find((s) => String(s.cislo_smlouvy).trim() === String(candidate.cislo_smlouvy).trim()) || list[0] || null;
      if (!match) return;
      navigate('/dictionaries', { state: { activeTab: 'smlouvy', [stateKey]: match, returnTo: location.pathname } });
    } catch (e) {
      console.error('Chyba při otevírání smlouvy k editaci:', e);
    }
  };

  const clickableProps = (onClick, title) => ({
    role: 'button',
    tabIndex: 0,
    onClick,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } },
    title,
    style: { cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' },
  });

  // Filtr "jen skupiny s varováním čerpání smlouvy" (mimo datumový rozsah /
  // přečerpáno) - analogie warningOnlyFilter, ale nad novým backendovým
  // příznakem smlouvaWarning (viz vema_sml_compute_smlouva_financni_kontrola),
  // ne nad has_chyba_sml.
  // smlouvaWarningFilter je zvednutý do rodiče (VemaDenik), aby ho viděl
  // společný "Zrušit filtry" v toolbaru.

  useEffect(() => {
    setPage(1);
  }, [search, badgeFilter, warningOnlyFilter, kontrolaFilter, verdictFilter, smlouvaWarningFilter, groupedPageSize]);

  useEffect(() => {
    if (!token || !username) return;
    let cancelled = false;
    setGroupsLoading(true);
    setGroupsError(null);

    getVemaSmlGroupedList({ token, username, search, badgeFilter, warningOnlyFilter, kontrolaFilter, verdictFilter, smlouvaWarningFilter, page, perPage: groupedPageSize })
      .then((data) => {
        if (cancelled) return;
        setGroupsResult(data);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Chyba při načítání seskupeného pohledu Kontrola SML:', e);
        setGroupsError(e.message || 'Chyba při načítání seskupeného pohledu');
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false);
      });

    return () => { cancelled = true; };
  }, [token, username, search, badgeFilter, warningOnlyFilter, kontrolaFilter, verdictFilter, smlouvaWarningFilter, page, groupedPageSize]);

  const groups = useMemo(
    () => (groupsResult.groups || []).map((g) => ({
      ...g,
      invoiceRows: g.invoiceRows.map((r) => ({ id: r.id, original: r })),
    })),
    [groupsResult.groups]
  );
  const verdictCounts = groupsResult.verdictCounts || {};
  const smlouvaWarningCount = groupsResult.smlouvaWarningCount || 0;
  const pagination = groupsResult.pagination || { page: 1, per_page: 50, total: 0, total_pages: 1 };

  // Reálné EEO faktury na kandidátních smlouvách aktuální stránky - analogie
  // stejného efektu v GroupedKontrolaObjView (jen smlouva_id místo objednavka_id).
  useEffect(() => {
    if (!token || !username) return;
    if (smlouvaFakturyLoading) return;

    const allIds = new Set();
    groups.forEach((group) => {
      group.candidates.forEach((cand) => {
        if (cand?.id !== undefined && cand?.id !== null) allIds.add(cand.id);
      });
    });
    const missingIds = Array.from(allIds).filter((id) => !(String(id) in smlouvaFakturyData));
    if (missingIds.length === 0) return;

    setSmlouvaFakturyLoading(true);
    getVemaSmlouvyFaktury(missingIds, token, username)
      .then((data) => {
        const bySml = data?.faktury_by_smlouva || {};
        setSmlouvaFakturyData((prev) => {
          const next = { ...prev };
          missingIds.forEach((id) => { next[String(id)] = bySml[String(id)] || []; });
          return next;
        });
      })
      .catch((e) => {
        console.warn('Nepodařilo se načíst EEO faktury smluv:', e);
        setSmlouvaFakturyData((prev) => {
          const next = { ...prev };
          missingIds.forEach((id) => { next[String(id)] = []; });
          return next;
        });
      })
      .finally(() => setSmlouvaFakturyLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, smlouvaFakturyData, smlouvaFakturyLoading, token, username]);

  // Optimistická aktualizace jednoho invoiceRow napříč groupsResult po
  // úspěšném uložení/zrušení ručního výběru - stejný vzor jako u objednávek
  // (updateInvoiceRowRucniVazba v GroupedKontrolaObjView).
  const updateInvoiceRowRucniVazba = (rowId, newVazba, zamitnuteVazby) => {
    setGroupsResult((prev) => ({
      ...prev,
      groups: (prev.groups || []).map((g) => ({
        ...g,
        invoiceRows: g.invoiceRows.map((r) => (r.id === rowId
          ? { ...r, rucni_vazba: newVazba, ...(zamitnuteVazby !== undefined ? { zamitnute_vazby: zamitnuteVazby } : {}) }
          : r)),
      })),
    }));
  };

  // Zamítnutí "tenhle EEO doklad k VEMA faktuře nepatří" - trvale v
  // metadata_json.zamitnute_vazby (handle_vema_kontrola_rucni_vazba_save,
  // action reject/unreject); backend zamítnutý doklad nepočítá jako shodu.
  const handleZamitnutiToggle = async (rowId, invoiceRow, target, isRejected) => {
    setRucniVazbaSavingKey(rowId);
    try {
      const result = await saveVemaRucniVazba(
        {
          vemaId: invoiceRow.cfak,
          vemaIdSecondary: invoiceRow.firma,
          action: isRejected ? 'unreject' : 'reject',
          eeoTyp: target.eeoTyp,
          eeoId: target.eeoId,
          eeoCislo: target.eeoCislo,
        },
        token,
        username
      );
      updateInvoiceRowRucniVazba(rowId, result.rucni_vazba, result.zamitnute_vazby || []);
    } catch (e) {
      console.error('Chyba při ukládání zamítnutí dokladu:', e);
      alert(e.message || 'Nepodařilo se uložit zamítnutí dokladu');
    } finally {
      setRucniVazbaSavingKey(null);
    }
  };

  // Přepínač ručního výběru "tohle je ten správný doklad" - ruční vazba se
  // ukládá per VEMA doklad (vema_id+firma) do 25v_kontrola_metadata, ne per
  // typ kandidáta (objednávka/smlouva) - handle_vema_kontrola_rucni_vazba_save
  // je proto beze změny použitelný i tady, jen eeoTyp zůstává 'eeo_faktura'
  // (to je typ CÍLE vazby - EEO faktura - ne typ kandidáta, u kterého se
  // vazba zobrazuje).
  const handleRucniVazbaToggle = async (rowId, invoiceRow, target) => {
    const currentVazba = invoiceRow?.rucni_vazba;
    const isSameTarget = currentVazba && String(currentVazba.eeo_id) === String(target.eeoId);
    const action = isSameTarget ? 'clear' : 'set';

    setRucniVazbaSavingKey(rowId);
    try {
      const result = await saveVemaRucniVazba(
        {
          vemaId: invoiceRow.cfak,
          vemaIdSecondary: invoiceRow.firma,
          action,
          eeoTyp: 'eeo_faktura',
          eeoId: target.eeoId,
          eeoCislo: target.eeoCislo,
          cisloObjednavky: target.cisloSmlouvy,
        },
        token,
        username
      );
      updateInvoiceRowRucniVazba(rowId, result.rucni_vazba, result.zamitnute_vazby);
    } catch (e) {
      console.error('Chyba při ukládání ručního výběru správného dokladu:', e);
      alert(e.message || 'Nepodařilo se uložit ruční výběr správného dokladu');
    } finally {
      setRucniVazbaSavingKey(null);
    }
  };

  // Batch natažení VEMA kontrol pro všechny VEMA faktury viditelné na
  // aktuální stránce - stejný důvod a stejný vzor jako v GroupedKontrolaObjView
  // (viz její komentář u kontrolaBatchData) - bez tohohle by tenhle seskupený
  // pohled taky vykreslil stovky buněk, každou s vlastním HTTP requestem.
  const [kontrolaBatchData, setKontrolaBatchData] = useState({});
  const [kontrolaBatchLoading, setKontrolaBatchLoading] = useState(false);
  useEffect(() => {
    if (!token || !username) return;
    if (kontrolaBatchLoading) return;

    const items = [];
    const seenKeys = new Set();
    groups.forEach((group) => {
      group.invoiceRows.forEach((row) => {
        const vemaId = row.original._masterCfak || row.original.cfak;
        if (!vemaId) return;
        const vemaIdSecondary = row.original.firma;
        const key = vemaKontrolaBatchKey(vemaId, vemaIdSecondary);
        if (seenKeys.has(key) || key in kontrolaBatchData) return;
        seenKeys.add(key);
        items.push({ vemaId, vemaIdSecondary });
      });
    });
    if (items.length === 0) return;

    setKontrolaBatchLoading(true);
    batchGetVemaKontrola('faktura', items, token, username)
      .then((result) => {
        setKontrolaBatchData((prev) => ({ ...prev, ...result }));
      })
      .catch((e) => {
        console.warn('Nepodařilo se natáhnout VEMA kontroly dávkou:', e);
        setKontrolaBatchData((prev) => {
          const next = { ...prev };
          items.forEach((it) => { next[vemaKontrolaBatchKey(it.vemaId, it.vemaIdSecondary)] = null; });
          return next;
        });
      })
      .finally(() => setKontrolaBatchLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, kontrolaBatchData, kontrolaBatchLoading, token, username]);

  const kontrolaCellFor = (row) => {
    const vemaId = row.original._masterCfak || row.original.cfak;
    if (!vemaId) return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>;
    const vemaIdSecondary = row.original.firma;
    const batchKey = vemaKontrolaBatchKey(vemaId, vemaIdSecondary);
    if (!(batchKey in kontrolaBatchData)) {
      return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>…</span>;
    }
    return (
      <VemaKontrolaCell
        typZaznamu="faktura"
        vemaId={vemaId}
        vemaIdSecondary={vemaIdSecondary}
        initialKontrola={kontrolaBatchData[batchKey]}
        token={token}
        username={username}
      />
    );
  };

  // Panel se všemi skutečnými EEO fakturami (bez objednávky) na kandidátní
  // smlouvě (zdroj: vema-smlouvy/faktury-list podle smlouva_id, ne fuzzy
  // hledání) - analogie eeoFakturyPanelFor v GroupedKontrolaObjView. Porovná
  // KAŽDOU skutečnou EEO fakturu proti VEMA faktuře, pole po poli, a nabízí
  // ruční výběr "tohle je ten správný doklad" (handleRucniVazbaToggle výše).
  const eeoFakturyPanelFor = (candidate, invoiceRow, invoiceRowId, groupRows = null, matchedFaktury = null) => {
    if (!candidate) return null;
    const list = smlouvaFakturyData[String(candidate.id)];
    const rucniVazba = invoiceRow?.rucni_vazba || null;
    const canPick = Boolean(invoiceRowId && invoiceRow?.cfak);
    const isSaving = rucniVazbaSavingKey === invoiceRowId;
    // Bez konkrétní VEMA faktury (invoiceRow===null - matrix hlavička sloupce,
    // sdílená pro všechny řádky matice) nejde nic srovnávat "VEMA / EEO".
    const hasInvoiceRow = Boolean(invoiceRow);

    if (list === undefined) {
      return (
        <EeoFakturyBox>
          <EeoFakturyBoxTitle>EEO faktury na smlouvě (bez objednávky)</EeoFakturyBoxTitle>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Načítám…</span>
        </EeoFakturyBox>
      );
    }
    if (list.length === 0) {
      return (
        <EeoFakturyBox>
          <EeoFakturyBoxTitle>EEO faktury na smlouvě (bez objednávky)</EeoFakturyBoxTitle>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Smlouva zatím v EEO nemá žádnou fakturu bez objednávky.</span>
        </EeoFakturyBox>
      );
    }

    // Pro konkrétní VEMA fakturu ukazujeme jen doklady, které k ní opravdu
    // patří - smlouva s měsíční platbou má 12+ položek se stejnou částkou a
    // VS, takže celý seznam u každé VEMA faktury působil jako 13 duplicit.
    //  - RP položka: jen při shodě čísla dokladu (VEMA cdok = cislo_dokladu).
    //  - EEO faktura: shoda čísla dokladu, jinak (doklad v EEO chybí) VS +
    //    částka + datum vystavení v toleranci 10 dní. Bez data se nepáruje.
    const isRelevantFor = (row, f) => {
      const cmp = compareVemaEeoIdentifikace(row, f);
      if (cmp.doklad === 'ok') return true;
      if (cmp.doklad === 'no' || f.zdroj === 'rocni_poplatek') return false;
      if (cmp.vs !== 'ok' || cmp.castka !== 'ok') return false;
      const dVema = parseFlexibleDate(row?.dof) || parseFlexibleDate(row?.datpri);
      const dEeo = parseFlexibleDate(f?.datum_vystaveni);
      if (!dVema || !dEeo) return false;
      return Math.abs(dVema.getTime() - dEeo.getTime()) <= 10 * 24 * 60 * 60 * 1000;
    };
    const isRelevant = (f) => isRelevantFor(invoiceRow, f);
    // Hlavička sloupce matice (bez konkrétní VEMA faktury): jen doklady, které
    // odpovídají některé VEMA faktuře ve skupině, s uvedením které.
    const isGroupHead = !hasInvoiceRow && Array.isArray(groupRows);
    const vemaMatchesFor = (f) => (isGroupHead
      ? groupRows.filter((r) => isRelevantFor(r.original, f)).map((r) => r.original.cfak)
      : []);
    const relevantList = hasInvoiceRow
      ? list.filter((f) => isRelevant(f) || (rucniVazba && String(rucniVazba.eeo_id) === String(f.id)))
      : isGroupHead ? list.filter((f) => vemaMatchesFor(f).length > 0) : list;
    const visibleList = relevantList;
    const zamitnuteIds = new Set((invoiceRow?.zamitnute_vazby || []).map((z) => String(z.eeo_id)));

    return (
      <EeoFakturyBox>
        <EeoFakturyBoxTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span>
              VEMA / EEO — {hasInvoiceRow
                ? `shodné doklady na smlouvě (${relevantList.length})`
                : isGroupHead
                  ? `doklady odpovídající VEMA fakturám ve skupině (${relevantList.length} z ${list.length})`
                  : `doklady na smlouvě (${list.length})`}
            </span>
            {candidate.cislo_smlouvy && (
              <div style={{ display: 'flex', alignItems: 'center', textTransform: 'none', letterSpacing: 'normal', fontWeight: 600 }}>
                <span {...clickableProps(() => openSmlouvaPreview(candidate), 'Zobrazit náhled smlouvy')}>{candidate.cislo_smlouvy}</span>
                <OpenInFormButton type="button" onClick={() => openSmlouvaInEditForm(candidate)} title={canEditContract ? 'Otevřít smlouvu k editaci' : 'Zobrazit smlouvu (nemáte právo editace)'}>
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                </OpenInFormButton>
              </div>
            )}
          </div>
        </EeoFakturyBoxTitle>
        {hasInvoiceRow && visibleList.length === 0 && (
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            K této VEMA faktuře se na smlouvě nenašel doklad se stejným číslem dokladu.
          </span>
        )}
        {hasInvoiceRow && (matchedFaktury || [])
          .filter((f) => f.cislo_smlouvy && f.cislo_smlouvy !== candidate.cislo_smlouvy)
          .map((f) => (
            <EeoFakturaRow key={`cizi-${f.id}`} style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <EeoFakturaHighlightTag style={{ color: VERDICT_COLORS.bad.text }}>
                ⚠ tento doklad má EEO zaevidovaný na jiné smlouvě: {f.cislo_smlouvy}
              </EeoFakturaHighlightTag>
              <IdentRow $tick="unk">
                <span className="label">VS</span>
                <span className="vals">{invoiceRow.vsymb || '—'} / {f.cislo_faktury || '—'}</span>
              </IdentRow>
              <IdentRow $tick="unk">
                <span className="label">Doklad</span>
                <span className="vals"><b>{invoiceRow.cdok || '—'}</b> / <b>{f.fa_vema_kod || '—'}</b></span>
              </IdentRow>
              <IdentRow $tick="unk">
                <span className="label">Částka</span>
                <span className="vals"><b>{formatKc(invoiceRow.celkem || 0)}</b> / <b>{f.castka != null ? formatKc(f.castka) : '—'}</b></span>
              </IdentRow>
              <IdentRow $tick="unk">
                <span className="label">Vystaveno</span>
                <span className="vals">
                  <b>{(() => { const d = parseFlexibleDate(invoiceRow.dof) || parseFlexibleDate(invoiceRow.datpri); return d ? formatDateShort(d) : '—'; })()}</b>
                  {' / '}
                  <b>{(() => { const d = parseFlexibleDate(f.datum_vystaveni); return d ? formatDateShort(d) : '—'; })()}</b>
                </span>
              </IdentRow>
            </EeoFakturaRow>
          ))}
        {isGroupHead && visibleList.length === 0 && (
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            Žádný z {list.length} dokladů na smlouvě neodpovídá VEMA fakturám v této skupině.
          </span>
        )}
        {visibleList.map((f) => {
          const cmp = compareVemaEeoIdentifikace(invoiceRow, f);
          const isManualPick = rucniVazba ? String(rucniVazba.eeo_id) === String(f.id) : false;
          const isRejected = zamitnuteIds.has(String(f.id));
          const autoHighlight = !rucniVazba && !isRejected && hasInvoiceRow && isRelevant(f);
          const highlight = !isRejected && (isManualPick || autoHighlight);
          const datum = parseFlexibleDate(f?.datum_vystaveni);
          // Položka ročního poplatku (25a_rocni_poplatky_polozky), ne skutečná
          // EEO faktura - viz backend vema_sml_attach_rp_polozky. Ruční výběr
          // "tohle je ten správný doklad" cílí jen na eeo_faktura id
          // (handle_vema_kontrola_rucni_vazba_save), takže se u RP položek
          // nenabízí - nešlo by ho korektně uložit/rozpoznat zpět. Zamítnout
          // jde naopak obojí (klíč 'rp_<id>' je stabilní).
          const isRpZdroj = f.zdroj === 'rocni_poplatek';
          const rowCanPick = canPick && !isRpZdroj && !isRejected;

          return (
            <EeoFakturaRow
              key={f.id}
              $highlight={highlight}
              $manual={isManualPick}
              style={isRejected ? { background: '#fef2f2', borderColor: '#fecaca', opacity: 0.85 } : undefined}
            >
              {isRejected && (
                <EeoFakturaHighlightTag style={{ color: VERDICT_COLORS.bad.text }}>
                  ✕ zamítnuto – tento doklad k VEMA faktuře nepatří
                </EeoFakturaHighlightTag>
              )}
              {isRpZdroj && (
                <RpZdrojTag title="Platba evidovaná v modulu Roční poplatky, ne jako samostatná EEO faktura">
                  ⓘ Položka ročního poplatku{f.rp_nazev ? ` · ${f.rp_nazev}` : ''}{f.rp_rok ? ` (${f.rp_rok})` : ''}
                </RpZdrojTag>
              )}
              {isGroupHead && (
                <EeoFakturaHighlightTag>↔ odpovídá VEMA {vemaMatchesFor(f).join(', ')}</EeoFakturaHighlightTag>
              )}
              {isManualPick && (
                <EeoFakturaHighlightTag $manual>
                  ↳ ručně potvrzeno jako správné
                </EeoFakturaHighlightTag>
              )}
              {autoHighlight && <EeoFakturaHighlightTag>↳ nejspíš tahle faktura</EeoFakturaHighlightTag>}
              <IdentRow $tick={hasInvoiceRow ? cmp.vs : 'unk'}>
                <span className="label">VS</span>
                <span className="vals">{hasInvoiceRow ? <>{cmp.vsVema || '—'} / {cmp.vsEeo || '—'}</> : (cmp.vsEeo || '—')}</span>
              </IdentRow>
              <IdentRow $tick={hasInvoiceRow ? cmp.doklad : 'unk'}>
                <span className="label">Doklad</span>
                <span className="vals">
                  {hasInvoiceRow && <><b>{cmp.dokladVema || '—'}</b> / </>}
                  <b>{cmp.dokladEeo || '—'}</b>
                </span>
              </IdentRow>
              <IdentRow $tick={hasInvoiceRow ? cmp.castka : 'unk'}>
                <span className="label">Částka</span>
                <span className="vals">
                  {hasInvoiceRow && <><b>{Number.isFinite(cmp.castkaVema) ? formatKc(cmp.castkaVema) : '—'}</b> / </>}
                  <b>{Number.isFinite(cmp.castkaEeo) ? formatKc(cmp.castkaEeo) : '—'}</b>
                </span>
              </IdentRow>
              {(() => {
                const datumVema = parseFlexibleDate(invoiceRow?.dof) || parseFlexibleDate(invoiceRow?.datpri);
                if (!hasInvoiceRow && !datum) return null;
                if (hasInvoiceRow && !datumVema && !datum) return null;
                return (
                  <IdentRow $tick="unk">
                    <span className="label">Vystaveno</span>
                    <span className="vals">
                      {hasInvoiceRow && <><b>{datumVema ? formatDateShort(datumVema) : '—'}</b> / </>}
                      <b>{datum ? formatDateShort(datum) : '—'}</b>
                    </span>
                  </IdentRow>
                );
              })()}
              {(() => {
                const typdok = invoiceRow?.typdok;
                const vemaTypLabel = (typdok !== null && typdok !== undefined && typdok !== '')
                  ? (VEMA_TYPDOK_LABELS[Number(typdok)] || `kód ${typdok}`)
                  : null;
                const eeoTypLabel = f.fa_typ ? (FAKTURA_TYP_LABELS[f.fa_typ] || f.fa_typ) : null;
                if (hasInvoiceRow && !vemaTypLabel && !eeoTypLabel) return null;
                if (!hasInvoiceRow && !eeoTypLabel) return null;
                return (
                  <IdentRow $tick="unk">
                    <span className="label">Typ faktury</span>
                    <span className="vals">{hasInvoiceRow ? <>{vemaTypLabel || '—'} / {eeoTypLabel || '—'}</> : (eeoTypLabel || '—')}</span>
                  </IdentRow>
                );
              })()}
              {f.stav && (
                <IdentRow $tick="unk">
                  <span className="label">{isRpZdroj ? 'Stav platby' : 'Stav v EEO'}</span>
                  <span className="vals">{isRpZdroj ? f.stav : (FAKTURA_STAV_LABELS[f.stav] || f.stav)}</span>
                </IdentRow>
              )}
              {rowCanPick && (
                <RucniVazbaLink
                  type="button"
                  $active={isManualPick}
                  disabled={isSaving}
                  onClick={() => handleRucniVazbaToggle(invoiceRowId, invoiceRow, {
                    eeoId: f.id,
                    eeoCislo: f.cislo_faktury,
                    cisloSmlouvy: candidate.cislo_smlouvy,
                  })}
                >
                  {isSaving ? 'Ukládám…' : isManualPick ? '✕ zrušit ruční výběr' : '✓ označit jako správnou'}
                </RucniVazbaLink>
              )}
              {canPick && (
                <RucniVazbaLink
                  type="button"
                  disabled={isSaving}
                  style={{ color: isRejected ? undefined : VERDICT_COLORS.bad.text }}
                  onClick={() => handleZamitnutiToggle(invoiceRowId, invoiceRow, {
                    eeoTyp: isRpZdroj ? 'rocni_poplatek' : 'eeo_faktura',
                    eeoId: f.id,
                    eeoCislo: isRpZdroj ? f.fa_vema_kod : f.cislo_faktury,
                  }, isRejected)}
                >
                  {isSaving ? 'Ukládám…' : isRejected ? '↺ zrušit zamítnutí' : '✕ zamítnout tento doklad'}
                </RucniVazbaLink>
              )}
            </EeoFakturaRow>
          );
        })}
      </EeoFakturyBox>
    );
  };

  // Srovnání VS/doklad/částka pro každou fuzzy-matchovanou EEO fakturu (bez
  // objednávky - backend je už tak vrací, viz vema_sml_backfill_missing_smlouvy),
  // nezávisle na tom, jestli pár nakonec vyšel jako eeoVazba 'ok'.
  const identifikacePanelyFor = (invoiceRow, matchedFaktury) => {
    if (!Array.isArray(matchedFaktury) || matchedFaktury.length === 0) return null;
    return matchedFaktury.map((mf, idx) => {
      const cmp = compareVemaEeoIdentifikace(invoiceRow, mf);
      const hasMismatch = cmp.vs === 'no' || cmp.doklad === 'no' || cmp.castka === 'no';
      return (
        <IdentPanel key={mf?.id ?? idx} $hasMismatch={hasMismatch}>
          <IdentPanelTitle>EEO faktura {mf?.cislo_smlouvy ? `→ ${mf.cislo_smlouvy}` : '(bez vazby na smlouvu)'}</IdentPanelTitle>
          <IdentRow $tick={cmp.vs}>
            <span className="label">VS</span>
            <span className="vals">{cmp.vsVema || '—'} <b>{cmp.vs === 'ok' ? '=' : '≠'}</b> {cmp.vsEeo || '—'}</span>
          </IdentRow>
          <IdentRow $tick={cmp.doklad}>
            <span className="label">Doklad</span>
            <span className="vals"><b>{cmp.dokladVema || '—'}</b> {cmp.doklad === 'ok' ? '=' : '≠'} <b>{cmp.dokladEeo || '—'}</b></span>
          </IdentRow>
          <IdentRow $tick={cmp.castka}>
            <span className="label">Částka</span>
            <span className="vals">
              <b>{Number.isFinite(cmp.castkaVema) ? formatKc(cmp.castkaVema) : '—'}</b> {cmp.castka === 'ok' ? '=' : '≠'} <b>{Number.isFinite(cmp.castkaEeo) ? formatKc(cmp.castkaEeo) : '—'}</b>
            </span>
          </IdentRow>
        </IdentPanel>
      );
    });
  };

  const pluralKandidatnichFaktur = (n) => {
    if (n === 1) return 'kandidátní faktura';
    if (n >= 2 && n <= 4) return 'kandidátní faktury';
    return 'kandidátních faktur';
  };

  // Zvýrazní podezření na přehozené číslice mezi VEMA ecsml a evidenčním
  // číslem smlouvy, kterou reálně eviduje EEO faktura spárovaná s "jinou
  // smlouvou" - analogie renderCobjTypoWarning, jen nad evidenčním číslem
  // smlouvy (extractSmlCore), ne číslem objednávky.
  const renderSmlTypoWarning = (invoiceRows, pairVerdicts) => {
    const findings = [];
    const seen = new Set();
    Object.entries(pairVerdicts || {}).forEach(([key, pv]) => {
      if (pv.eeoVazba !== 'no') return;
      const m = pv.eeoVazbaDetail && pv.eeoVazbaDetail.match(/jinou smlouvou \(([^)]+)\)/);
      if (!m) return;
      const targetCislo = m[1];
      const rowId = key.split('__')[0];
      const row = invoiceRows.find((r) => r.id === rowId);
      if (!row) return;
      const vemaEcsml = row.original.smlouva_ecsml;
      const coreVema = extractSmlCore(vemaEcsml);
      const coreTarget = extractSmlCore(targetCislo);
      if (!coreVema || !coreTarget || !isDigitTransposition(coreVema, coreTarget)) return;
      const dedupKey = `${row.original.cfak}__${targetCislo}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      findings.push({ vs: row.original.cfak, vemaEcsml, targetCislo });
    });
    if (findings.length === 0) return null;
    return (
      <div
        style={{
          margin: '0.5rem 0 0.75rem',
          padding: '0.5rem 0.75rem',
          borderRadius: 8,
          border: `1px solid ${VERDICT_COLORS.bad.border}`,
          background: VERDICT_COLORS.bad.bg,
          color: VERDICT_COLORS.bad.text,
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        ⚠ Nesedí evidenční číslo smlouvy - podezření na přehozené číslice ve VEMA:
        {findings.map((f) => (
          <div key={`${f.vs}_${f.targetCislo}`} style={{ fontWeight: 500, marginTop: 2 }}>
            VS {f.vs}: VEMA uvádí <b>{f.vemaEcsml}</b>, ale EEO má tuto fakturu spárovanou se smlouvou <b>{f.targetCislo}</b>.
          </div>
        ))}
      </div>
    );
  };

  // Banner "kontrola čerpání smlouvy" - zvýrazní, když backend vyhodnotil
  // smlouva_precerpano (součet EEO faktur > hodnota smlouvy) nebo
  // mimo_datumovy_rozsah u některé z faktur (viz
  // vema_sml_compute_smlouva_financni_kontrola ve vemaSmlGroupedHandlers.php).
  // Analogie renderCobjTypoWarning/renderSmlTypoWarning, jen nad jiným zdrojem
  // varování (group.smlouvaWarning/smlouvaWarningReasons z BE, ne odvozené na FE).
  const renderSmlouvaFinancniWarning = (group) => {
    if (!group || !group.smlouvaWarning) return null;
    const reasons = Array.isArray(group.smlouvaWarningReasons) ? group.smlouvaWarningReasons : [];
    return (
      <div
        style={{
          margin: '0.5rem 0 0.75rem',
          padding: '0.5rem 0.75rem',
          borderRadius: 8,
          border: `1px solid ${VERDICT_COLORS.bad.border}`,
          background: VERDICT_COLORS.bad.bg,
          color: VERDICT_COLORS.bad.text,
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        ⚠ Kontrola čerpání smlouvy: pravděpodobně čerpáno mimo datumový rozsah smlouvy a/nebo je smlouva přečerpána.
        {reasons.map((r) => (
          <div key={r} style={{ fontWeight: 500, marginTop: 2, textTransform: 'none' }}>
            {r}
          </div>
        ))}
      </div>
    );
  };

  // Jeden řádek "faktura <-> kandidátní smlouva" - sdílené mezi 1:1 kartou a
  // "fan" kartou. Analogie renderPairRow z GroupedKontrolaObjView.
  const renderPairRow = (row, candidate, pv, matchedFaktury, hideCandidateNode = false) => {
    const tone = candidate ? (pv ? pv.verdict : 'warn') : 'warn';
    const fakturaDatumVystaveni = parseFlexibleDate(row.original.dof);
    const fakturaDatumPrijeti = parseFlexibleDate(row.original.datpri);
    const fakturaSplatnost = parseFlexibleDate(row.original.spl);

    return (
      <SimplePairCard key={row.id}>
        <SkupinaNode>
          <span className="n">VS: {row.original.cfak}</span>
          <span className="m">{row.original.firma_nazev}{row.original.firma_ico ? ` · IČO: ${row.original.firma_ico}` : ''}</span>
          {row.original.nazevfak && <span className="m" title={row.original.nazevfak}>{row.original.nazevfak}</span>}
          <span className="m">
            {fakturaDatumVystaveni && <>vystavení <b>{formatDateShort(fakturaDatumVystaveni)}</b></>}
            {!fakturaDatumVystaveni && fakturaDatumPrijeti && <>přijetí <b>{formatDateShort(fakturaDatumPrijeti)}</b></>}
            {fakturaSplatnost && <> · splatnost <b>{formatDateShort(fakturaSplatnost)}</b></>}
          </span>
          <span className="m">Číslo dokladu: <b>{row.original.cdok || '—'}</b></span>
          <span className="m">Evidenční číslo smlouvy (VEMA): <b>{row.original.smlouva_ecsml || '—'}</b></span>
          <span className="m">Číslo objednávky (VEMA): <b>{row.original.cobj_formatovane || row.original.cobj || '—'}</b></span>
          <span className="m">Částka: <b>{formatKc(row.original.celkem || 0)}</b></span>
          {row.original.mimo_datumovy_rozsah === true && (
            <span className="m" style={{ color: VERDICT_COLORS.bad.text, fontWeight: 700 }}>
              ⚠ mimo datumový rozsah smlouvy
            </span>
          )}
          {(row.original.typdok !== null && row.original.typdok !== undefined && row.original.typdok !== '') && (
            <span
              className="m"
              style={Number(row.original.typdok) === VEMA_TYPDOK_ZALOHOVA ? { color: '#b45309', fontWeight: 700 } : undefined}
            >
              Typ dokladu: <b>{VEMA_TYPDOK_LABELS[Number(row.original.typdok)] || `kód ${row.original.typdok}`}</b>
            </span>
          )}
          {/* Bez kandidáta nemáme smlouvu, ke které natáhnout skutečné EEO
              faktury - jediné, co nabídnout, je stará fuzzy shoda. */}
          {!candidate && identifikacePanelyFor(row.original, matchedFaktury)}
          <div style={{ marginTop: 6 }}>
            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 6px 0' }} />
            {kontrolaCellFor(row)}
          </div>
        </SkupinaNode>
        {!candidate && (
          <>
            <SkupinaWire $verdict="bad" />
            <EeoFakturyBox style={{ borderColor: VERDICT_COLORS.bad.border, background: VERDICT_COLORS.bad.bg }}>
              <EeoFakturyBoxTitle style={{ color: VERDICT_COLORS.bad.text }}>EEO — smlouva</EeoFakturyBoxTitle>
              <span style={{ fontSize: '0.7rem', color: VERDICT_COLORS.bad.text }}>
                Kandidát nenalezen. Oprava patří do VEMA / EEO u zdrojových dokladů, ne sem - poznámku k řešení zapište do dialogu Kontrola.
              </span>
            </EeoFakturyBox>
          </>
        )}
        {candidate && (
          <>
            <SkupinaWire $verdict={tone} />
            {!hideCandidateNode && (
              <SkupinaNode>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="n" {...clickableProps(() => openSmlouvaPreview(candidate), 'Zobrazit náhled smlouvy')}>{candidate.cislo_smlouvy}</span>
                  <OpenInFormButton type="button" onClick={() => openSmlouvaInEditForm(candidate)} title={canEditContract ? 'Otevřít smlouvu k editaci' : 'Zobrazit smlouvu (nemáte právo editace)'}>
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                  </OpenInFormButton>
                </div>
                <span className="m">{candidate.dodavatel}{candidate.dodavatel_ico ? ` · IČO: ${candidate.dodavatel_ico}` : ''}</span>
                {candidate.nazev_smlouvy && <span className="m" title={candidate.nazev_smlouvy}>{candidate.nazev_smlouvy}</span>}
                {(() => {
                  const d = parseFlexibleDate(candidate.platnost_od);
                  return d ? <span className="m">platná od {formatDateShort(d)}</span> : null;
                })()}
                {pv && (
                  <CondRow style={{ marginTop: 4 }}>
                    <Cond $tick={pv.eeoVazba} title={pv.eeoVazbaDetail}>
                      <span className="label">vazba EEO</span>
                      <span className="detail">{pv.eeoVazbaDetail}</span>
                    </Cond>
                    <Cond $tick={pv.castka} title={pv.castkaDetail}>
                      <span className="label">částka</span>
                      <span className="detail">{pv.castkaDetail}</span>
                    </Cond>
                    <Cond $tick={pv.datum} title={pv.datumDetail}>
                      <span className="label">datum</span>
                      <span className="detail">{pv.datumDetail}</span>
                    </Cond>
                  </CondRow>
                )}
              </SkupinaNode>
            )}
            {eeoFakturyPanelFor(candidate, row.original, row.id, null, matchedFaktury)}
          </>
        )}
      </SimplePairCard>
    );
  };

  const compareInvoiceRowsByField = (a, b, field, dir) => {
    const getValue = DOKLADY_SORT_FIELDS[field].getValue;
    const va = getValue(a);
    const vb = getValue(b);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    const diff = va - vb;
    return dir === 'asc' ? diff : -diff;
  };

  const sortInvoiceRowsBy = (rows, sort) => {
    const { field, dir } = sort;
    const fallbackFields = DOKLADY_SORT_FIELD_ORDER.filter((f) => f !== field);
    return [...rows].sort((a, b) => {
      const primary = compareInvoiceRowsByField(a, b, field, dir);
      if (primary !== 0) return primary;
      for (const f of fallbackFields) {
        const c = compareInvoiceRowsByField(a, b, f, DOKLADY_SORT_FIELDS[f].defaultDir);
        if (c !== 0) return c;
      }
      return String(a.original?.cfak || '').localeCompare(String(b.original?.cfak || ''));
    });
  };

  const renderDokladySortControl = (groupId) => {
    const activeSort = getGroupSort(groupId);
    return DOKLADY_SORT_FIELD_ORDER.map((field) => {
      const isActive = activeSort.field === field;
      return (
        <SortTogglePill
          key={field}
          type="button"
          $active={isActive}
          onClick={() => setGroupSortField(groupId, field)}
          title={`Řadit doklady v této skupině podle: ${DOKLADY_SORT_FIELDS[field].label}`}
        >
          {DOKLADY_SORT_FIELDS[field].label}{isActive ? (activeSort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
        </SortTogglePill>
      );
    });
  };

  // Sjednocená karta pro 1:1 pár i "fan" (víc faktur sdílejících jednu
  // kandidátní smlouvu) - analogie renderObjGroupCard.
  const renderSmlGroupCard = (group) => {
    const { groupId, invoiceRows, candidates, pairVerdicts, matchedFakturyByRowId } = group;
    const candidate = candidates[0];

    if (!candidate) {
      const row = invoiceRows[0];
      return (
        <VazebniSkupinaCard key={groupId}>
          <VazebniSkupinaStripe $verdict="warn" />
          <VazebniSkupinaBody>
            <VazebniSkupinaHead>
              <div>
                <VazebniSkupinaTitle>{row.original.cfak ? `VS: ${row.original.cfak}` : '—'}</VazebniSkupinaTitle>
                <VazebniSkupinaSub>{row.original.firma_nazev} · {formatKc(row.original.celkem || 0)}</VazebniSkupinaSub>
              </div>
              <SkupinaPill $tone="warn">bez kandidáta</SkupinaPill>
            </VazebniSkupinaHead>
            {renderPairRow(row, null, null, matchedFakturyByRowId[row.id])}
          </VazebniSkupinaBody>
        </VazebniSkupinaCard>
      );
    }

    const isSingle = invoiceRows.length === 1;
    const rowVerdicts = invoiceRows.map((row) => pairVerdicts[`${row.id}__${candidate.id}`]).filter(Boolean);
    const toReviewCount = rowVerdicts.filter((pv) => pv.verdict === 'warn').length;
    const groupTone = isSingle
      ? (rowVerdicts[0] ? rowVerdicts[0].verdict : 'warn')
      : (rowVerdicts.length > 0 && rowVerdicts.every((pv) => pv.verdict === 'good') ? 'good' : 'mixed');

    return (
      <VazebniSkupinaCard key={groupId}>
        <VazebniSkupinaStripe $verdict={groupTone} />
        <VazebniSkupinaBody>
          <VazebniSkupinaHead style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '1.5rem', flex: '1 1 auto', minWidth: 0 }}>
              <div style={{ flex: '0 1 auto', minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <VazebniSkupinaTitle
                      style={{ margin: 0 }}
                      {...clickableProps(() => openSmlouvaPreview(candidate), 'Zobrazit náhled smlouvy')}
                    >
                      {candidate.cislo_smlouvy}
                    </VazebniSkupinaTitle>
                    <OpenInFormButton type="button" onClick={() => openSmlouvaInEditForm(candidate)} title={canEditContract ? 'Otevřít smlouvu k editaci' : 'Zobrazit smlouvu (nemáte právo editace)'} style={{ marginLeft: '0.15rem' }}>
                      <FontAwesomeIcon icon={faExternalLinkAlt} />
                    </OpenInFormButton>
                  </span>
                  {candidate.stav && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        background: candidate.stav === 'AKTIVNI' ? '#dcfce7' : '#f1f5f9',
                        color: candidate.stav === 'AKTIVNI' ? '#166534' : '#475569',
                      }}
                    >
                      {candidate.stav}
                    </span>
                  )}
                </div>
                <VazebniSkupinaSub>
                  {candidate.dodavatel}{candidate.dodavatel_ico ? ` · IČO: ${candidate.dodavatel_ico}` : ''}{candidate.nazev_smlouvy ? ` · ${candidate.nazev_smlouvy}` : ''}
                </VazebniSkupinaSub>
                <VazebniSkupinaSub style={{ color: '#94a3b8' }}>
                  {invoiceRows.length} {pluralKandidatnichFaktur(invoiceRows.length)} ke stejné smlouvě
                </VazebniSkupinaSub>
              </div>
              {(() => {
                const dOd = parseFlexibleDate(candidate.platnost_od);
                const dDo = parseFlexibleDate(candidate.platnost_do);
                const items = [];
                if (dOd) items.push(['Platnost od', formatDateShort(dOd)]);
                if (candidate.typ_smlouvy) items.push(['Druh smlouvy', candidate.typ_smlouvy]);
                const hasCena = candidate.castka !== null && candidate.castka !== undefined && Number(candidate.castka) > 0;
                // Čerpáno (soucet EEO faktur na smlouvě bez objednávky) + příznak
                // přečerpání - viz vema_sml_compute_smlouva_financni_kontrola (BE).
                const hasCerpano = candidate.smlouva_soucet_faktur !== null && candidate.smlouva_soucet_faktur !== undefined;
                const jePrecerpano = !!candidate.smlouva_precerpano;
                // Součet VEMA (informativní) - vysvětluje uživateli, proč "Čerpáno
                // (EEO faktury)" může být nižší než počet kandidátních faktur VEMA
                // by napovídal: VEMA má víc dokladů evidenčně navázaných na tuto
                // smlouvu, než kolik jich EEO skutečně eviduje jako fakturu na
                // smlouvě (zbytek se nepodařilo/nedošlo k jejich zaúčtování v EEO).
                const hasVemaSoucet = candidate.smlouva_soucet_faktur_vema !== null && candidate.smlouva_soucet_faktur_vema !== undefined && Number(candidate.smlouva_soucet_faktur_vema) > 0;
                // Platnost do - zvýrazněná jako Čerpáno/Hodnota smlouvy (ne jen šedý
                // řádek v gridu), protože jde o klíčový údaj pro posouzení, zda
                // faktury nejsou čerpány mimo rozsah smlouvy.
                const jeMimoRozsah = (group.smlouvaFinancniKontrola?.reasons || []).some((r) => r.includes('mimo datumový rozsah'));
                if (items.length === 0 && !dDo && !hasCena && !hasCerpano) return null;
                return (
                  <ObjInfoGrid>
                    {items.map(([label, value]) => (
                      <div className="item" key={label}>
                        <span className="label">{label}:</span>
                        <span className="value">{value}</span>
                      </div>
                    ))}
                    {dDo && (
                      <div className="item" style={{ gridColumn: 2, alignItems: 'baseline' }}>
                        <span className="label" style={{ fontSize: '0.8rem', fontWeight: 700, color: jeMimoRozsah ? VERDICT_COLORS.bad.text : '#1e40af' }}>Platnost do:</span>
                        <span className="value" style={{ fontSize: '0.95rem', fontWeight: 800, color: jeMimoRozsah ? VERDICT_COLORS.bad.text : '#1e40af' }}>
                          {formatDateShort(dDo)}{jeMimoRozsah ? ' ⚠ faktura mimo rozsah' : ''}
                        </span>
                      </div>
                    )}
                    {hasCena && (
                      <div className="item" style={{ gridColumn: 2, alignItems: 'baseline' }}>
                        <span className="label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af' }}>Hodnota smlouvy:</span>
                        <span className="value" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e40af' }}>
                          {formatKc(candidate.castka)}
                        </span>
                      </div>
                    )}
                    {hasCerpano && (
                      <div className="item" style={{ gridColumn: 2, alignItems: 'baseline' }}>
                        <span className="label" style={{ fontSize: '0.8rem', fontWeight: 700, color: jePrecerpano ? VERDICT_COLORS.bad.text : '#1e40af' }}>Čerpáno (EEO faktury):</span>
                        <span className="value" style={{ fontSize: '0.95rem', fontWeight: 800, color: jePrecerpano ? VERDICT_COLORS.bad.text : '#1e40af' }}>
                          {formatKc(candidate.smlouva_soucet_faktur)}{jePrecerpano ? ' ⚠ přečerpáno' : ''}
                        </span>
                      </div>
                    )}
                    {hasVemaSoucet && (
                      <div className="item" style={{ gridColumn: 2, alignItems: 'baseline' }}>
                        <span className="label" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>z toho VEMA celkem (info):</span>
                        <span className="value" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {formatKc(candidate.smlouva_soucet_faktur_vema)}
                        </span>
                      </div>
                    )}
                  </ObjInfoGrid>
                );
              })()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                {isSingle ? (
                  <SkupinaPill $tone={groupTone}>
                    {groupTone === 'good' ? 'potvrzeno v EEO' : groupTone === 'bad' ? 'nesedí' : 'odhad, ověřit'}
                  </SkupinaPill>
                ) : (
                  <>
                    {renderDokladySortControl(groupId)}
                    <SkupinaPill $tone="warn">{invoiceRows.length} faktur</SkupinaPill>
                    {rowVerdicts.some((pv) => pv.verdict === 'bad') && (
                      <SkupinaPill $tone="bad">{rowVerdicts.filter((pv) => pv.verdict === 'bad').length} nesedí</SkupinaPill>
                    )}
                    {toReviewCount > 0 && <SkupinaPill $tone="warn">{toReviewCount} ke kontrole</SkupinaPill>}
                  </>
                )}
              </div>
              {!isSingle && invoiceRows.map((row) => {
                // U skupiny s víc fakturami vypsat, KTERÁ faktura nesedí / je
                // k ověření a proč - jinak pruhovaný okraj nic neříká.
                const pv = pairVerdicts[`${row.id}__${candidate.id}`];
                if (!pv || pv.verdict === 'good') return null;
                const reason = pv.eeoVazba === 'no' ? pv.eeoVazbaDetail
                  : pv.datum === 'no' ? pv.datumDetail
                  : pv.castka === 'no' ? pv.castkaDetail
                  : pv.eeoVazbaDetail;
                return (
                  <span key={row.id} style={{ fontSize: '0.7rem', fontWeight: 700, color: VERDICT_COLORS[pv.verdict]?.text || VERDICT_COLORS.warn.text, textAlign: 'right', maxWidth: 420, lineHeight: 1.3 }}>
                    VS {row.original.cfak}: {reason}
                  </span>
                );
              })}
              {isSingle && rowVerdicts[0] && groupTone !== 'good' && (() => {
                const pv = rowVerdicts[0];
                const reason = pv.eeoVazba === 'no' ? pv.eeoVazbaDetail
                  : pv.datum === 'no' ? pv.datumDetail
                  : pv.castka === 'no' ? pv.castkaDetail
                  : pv.eeoVazba === 'unk' ? pv.eeoVazbaDetail
                  : null;
                if (!reason) return null;
                const reasonColor = VERDICT_COLORS[groupTone]?.text || VERDICT_COLORS.bad.text;
                return (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: reasonColor, textAlign: 'right', maxWidth: 280, lineHeight: 1.3 }}>
                    {reason}
                  </span>
                );
              })()}
            </div>
          </VazebniSkupinaHead>
          {renderSmlTypoWarning(invoiceRows, pairVerdicts)}
          {renderSmlouvaFinancniWarning(group)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(() => {
              // Nesedící a neověřené faktury vždy nahoru (v rámci zvoleného
              // řazení), ať je problém vidět bez scrollování přes celou skupinu.
              const rank = { bad: 0, warn: 1, good: 2 };
              const sorted = sortInvoiceRowsBy(invoiceRows, getGroupSort(groupId));
              const ranked = sorted
                .map((row, pos) => ({ row, pos, v: pairVerdicts[`${row.id}__${candidate.id}`]?.verdict || 'warn' }))
                .sort((a, b) => (rank[a.v] ?? 1) - (rank[b.v] ?? 1) || a.pos - b.pos);
              // Při filtru Nesedí / Ověřit ukázat jen faktury, kterých se filtr
              // týká - ostatní faktury téže smlouvy schovat pod odkaz.
              const filterRows = !isSingle && (verdictFilter === 'bad' || verdictFilter === 'warn') && !smlShowOkRows[groupId];
              const shown = filterRows ? ranked.filter((x) => x.v === verdictFilter) : ranked;
              const hiddenCount = ranked.length - shown.length;
              const toggle = (!isSingle && (verdictFilter === 'bad' || verdictFilter === 'warn') && (hiddenCount > 0 || smlShowOkRows[groupId])) ? (
                <RucniVazbaLink
                  key="toggle"
                  type="button"
                  onClick={() => setSmlShowOkRows((prev) => ({ ...prev, [groupId]: !prev[groupId] }))}
                >
                  {smlShowOkRows[groupId]
                    ? 'skrýt ostatní faktury na smlouvě'
                    : `+ ${hiddenCount} ${hiddenCount === 1 ? 'další faktura' : hiddenCount < 5 ? 'další faktury' : 'dalších faktur'} na smlouvě (skryto filtrem) – zobrazit`}
                </RucniVazbaLink>
              ) : null;
              return [...shown
                .map(({ row, v }, idx) => {
                  const pv = pairVerdicts[`${row.id}__${candidate.id}`];
                  const problem = !isSingle && v !== 'good';
                  const style = {
                    ...(idx > 0 ? { paddingTop: '0.6rem', borderTop: '1px solid #e2e8f0' } : {}),
                    ...(problem ? {
                      background: VERDICT_COLORS[v]?.bg,
                      borderLeft: `4px solid ${VERDICT_COLORS[v]?.border}`,
                      borderRadius: 6,
                      padding: '0.5rem 0.5rem 0.5rem 0.6rem',
                    } : {}),
                  };
                  return (
                    <div key={row.id} style={style}>
                      {problem && (
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: VERDICT_COLORS[v]?.text, marginBottom: '0.35rem' }}>
                          {v === 'bad' ? '✕ Nesedí' : '? Ověřit'}: {pv?.eeoVazba === 'no' ? pv.eeoVazbaDetail
                            : pv?.datum === 'no' ? pv.datumDetail
                            : pv?.castka === 'no' ? pv.castkaDetail
                            : pv?.eeoVazbaDetail}
                        </div>
                      )}
                      {renderPairRow(row, candidate, pv, matchedFakturyByRowId[row.id], true)}
                    </div>
                  );
                }), toggle];
            })()}
          </div>
        </VazebniSkupinaBody>
      </VazebniSkupinaCard>
    );
  };

  const renderMatrixCard = (group) => {
    const { groupId, invoiceRows, candidates, pairVerdicts, matchedFakturyByRowId } = group;
    const verdictsInGroup = Object.values(pairVerdicts).map((pv) => pv.verdict);
    const toReviewCount = verdictsInGroup.filter((v) => v === 'warn').length;
    const groupTone = verdictsInGroup.length > 0 && verdictsInGroup.every((v) => v === 'good') ? 'good' : 'mixed';

    return (
      <VazebniSkupinaCard key={groupId}>
        <VazebniSkupinaStripe $verdict={groupTone} />
        <VazebniSkupinaBody>
          <VazebniSkupinaHead>
            <div>
              <VazebniSkupinaTitle>Vazební skupina ({invoiceRows.length} faktur × {candidates.length} smluv)</VazebniSkupinaTitle>
              <VazebniSkupinaSub>
                VEMA a EEO se neshodnou, ke které smlouvě faktura patří: ve VEMA je vedena na jedné smlouvě, v EEO je stejný doklad zaevidovaný na jiné.
              </VazebniSkupinaSub>
              {invoiceRows.flatMap((row) => (matchedFakturyByRowId[row.id] || [])
                .filter((f) => f.cislo_smlouvy && f.cislo_smlouvy !== row.original.smlouva_ecsml)
                .map((f) => (
                  <VazebniSkupinaSub key={`${row.id}-${f.id}`} style={{ color: VERDICT_COLORS.bad.text, fontWeight: 600 }}>
                    VEMA {row.original.cfak} (doklad {row.original.cdok || '—'}): VEMA smlouva {row.original.smlouva_ecsml || '—'} × EEO smlouva {f.cislo_smlouvy}
                  </VazebniSkupinaSub>
                )))}
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {invoiceRows.length > 1 && renderDokladySortControl(groupId)}
              <SkupinaPill $tone="warn">{invoiceRows.length} faktur</SkupinaPill>
              <SkupinaPill $tone="warn">{candidates.length} smluv</SkupinaPill>
              {toReviewCount > 0 && <SkupinaPill $tone="warn">{toReviewCount} párů ke kontrole</SkupinaPill>}
            </div>
          </VazebniSkupinaHead>
          {renderSmlTypoWarning(invoiceRows, pairVerdicts)}
          {renderSmlouvaFinancniWarning(group)}

          <MatchMatrixWrap>
            <MatchMatrixGrid style={{ gridTemplateColumns: `230px repeat(${candidates.length}, minmax(190px, 1fr))` }}>
              <MatrixCorner>faktura ↓ / smlouva →</MatrixCorner>
              {candidates.map((cand) => {
                const dOd = parseFlexibleDate(cand.platnost_od);
                return (
                  <MatrixColHead key={cand.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="n" {...clickableProps(() => openSmlouvaPreview(cand), 'Zobrazit náhled smlouvy')}>{cand.cislo_smlouvy}</span>
                      <OpenInFormButton type="button" onClick={() => openSmlouvaInEditForm(cand)} title={canEditContract ? 'Otevřít smlouvu k editaci' : 'Zobrazit smlouvu (nemáte právo editace)'}>
                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                      </OpenInFormButton>
                    </div>
                    <span className="m">{cand.dodavatel}</span>
                    {cand.nazev_smlouvy && <span className="m" title={cand.nazev_smlouvy}>{cand.nazev_smlouvy}</span>}
                    {dOd && <span className="m">platná od {formatDateShort(dOd)}</span>}
                    <div style={{ marginTop: 4, textAlign: 'left' }}>{eeoFakturyPanelFor(cand, null, null, invoiceRows)}</div>
                  </MatrixColHead>
                );
              })}

              {sortInvoiceRowsBy(invoiceRows, getGroupSort(groupId)).map((row) => (
                <React.Fragment key={row.id}>
                  <MatrixRowHead>
                    <span className="n">VS: {row.original.cfak}</span>
                    <span className="m">{row.original.firma_nazev}{row.original.firma_ico ? ` · IČO: ${row.original.firma_ico}` : ''}</span>
                    {row.original.nazevfak && <span className="m" title={row.original.nazevfak}>{row.original.nazevfak}</span>}
                    <span className="m">
                      {(() => {
                        const dV = parseFlexibleDate(row.original.dof);
                        const dP = parseFlexibleDate(row.original.datpri);
                        const dSpl = parseFlexibleDate(row.original.spl);
                        return (
                          <>
                            {dV && <>vystavení <b>{formatDateShort(dV)}</b></>}
                            {!dV && dP && <>přijetí <b>{formatDateShort(dP)}</b></>}
                            {dSpl && <> · splatnost <b>{formatDateShort(dSpl)}</b></>}
                          </>
                        );
                      })()}
                    </span>
                    <span className="m">Číslo dokladu: <b>{row.original.cdok || '—'}</b></span>
                    <span className="m">Evidenční číslo smlouvy (VEMA): <b>{row.original.smlouva_ecsml || '—'}</b></span>
                    <span className="m">Číslo objednávky (VEMA): <b>{row.original.cobj_formatovane || row.original.cobj || '—'}</b></span>
                    <span className="m">Částka: <b>{formatKc(row.original.celkem || 0)}</b></span>
                    {row.original.mimo_datumovy_rozsah === true && (
                      <span className="m" style={{ color: VERDICT_COLORS.bad.text, fontWeight: 700 }}>
                        ⚠ mimo datumový rozsah smlouvy
                      </span>
                    )}
                    {(row.original.typdok !== null && row.original.typdok !== undefined && row.original.typdok !== '') && (
                      <span
                        className="m"
                        style={Number(row.original.typdok) === VEMA_TYPDOK_ZALOHOVA ? { color: '#b45309', fontWeight: 700 } : undefined}
                      >
                        Typ dokladu: <b>{VEMA_TYPDOK_LABELS[Number(row.original.typdok)] || `kód ${row.original.typdok}`}</b>
                      </span>
                    )}
                    {identifikacePanelyFor(row.original, matchedFakturyByRowId[row.id])}
                    <div style={{ marginTop: 6 }}>
                      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 6px 0' }} />
                      {kontrolaCellFor(row)}
                    </div>
                  </MatrixRowHead>
                  {candidates.map((cand) => {
                    const pv = pairVerdicts[`${row.id}__${cand.id}`];
                    if (!pv) {
                      return (
                        <MatrixCell key={cand.id} $verdict="bad">
                          <MatrixCellVerdict $verdict="bad">Nesedí</MatrixCellVerdict>
                        </MatrixCell>
                      );
                    }
                    const verdictLabel = pv.verdict === 'good' ? 'Potvrzeno v EEO' : pv.verdict === 'bad' ? 'Nesedí' : 'Odhad, ověřit';
                    return (
                      <MatrixCell key={cand.id} $verdict={pv.verdict}>
                        <MatrixCellVerdict $verdict={pv.verdict}>{verdictLabel}</MatrixCellVerdict>
                        <CondRow>
                          <Cond $tick={pv.eeoVazba} title={pv.eeoVazbaDetail}>
                            <span className="label">vazba EEO</span>
                            <span className="detail">{pv.eeoVazbaDetail}</span>
                          </Cond>
                          <Cond $tick={pv.castka} title={pv.castkaDetail}>
                            <span className="label">částka</span>
                            <span className="detail">{pv.castkaDetail}</span>
                          </Cond>
                          <Cond $tick={pv.datum} title={pv.datumDetail}>
                            <span className="label">datum</span>
                            <span className="detail">{pv.datumDetail}</span>
                          </Cond>
                        </CondRow>
                      </MatrixCell>
                    );
                  })}
                </React.Fragment>
              ))}
            </MatchMatrixGrid>
          </MatchMatrixWrap>
        </VazebniSkupinaBody>
      </VazebniSkupinaCard>
    );
  };

  const attentionItems = [];
  const confirmedGroups = [];

  groups.forEach((group) => {
    if (group.verdictCategory === 'matrix') {
      attentionItems.push({ groupId: group.groupId, node: renderMatrixCard(group) });
    } else if (group.verdictCategory === 'good') {
      confirmedGroups.push(group);
    } else {
      attentionItems.push({ groupId: group.groupId, node: renderSmlGroupCard(group) });
    }
  });

  const hasAnyVerdictCounts = Object.values(verdictCounts).some((n) => n > 0) || smlouvaWarningCount > 0 || verdictFilter || smlouvaWarningFilter;

  return (
    <>
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {hasAnyVerdictCounts && (
        <VerdictFilterBar style={{ opacity: groupsLoading ? 0.55 : 1, pointerEvents: groupsLoading ? 'none' : 'auto', transition: 'opacity 0.15s ease' }}>
          {Object.entries(VERDICT_CATEGORY_META).map(([key, meta]) => {
            const count = verdictCounts[key] || 0;
            // Při jiném aktivním filtru se chip s nulou nezobrazí zmizelý, ale
            // zašedlý (jinak to vypadá, že kategorie přestala existovat).
            // Aktivní chip zůstává vidět vždy, jinak by nešel vypnout.
            const jinyFiltr = smlouvaWarningFilter || (verdictFilter && verdictFilter !== key);
            const dimZero = count === 0 && jinyFiltr && ['bad', 'warn', 'good'].includes(key);
            if (count === 0 && verdictFilter !== key && !dimZero) return null;
            return (
              <VerdictFilterChip
                key={key}
                type="button"
                disabled={groupsLoading}
                $active={verdictFilter === key}
                $bg={meta.bg}
                $border={meta.border}
                $text={meta.text}
                onClick={() => setVerdictFilter((prev) => (prev === key ? null : key))}
                title={dimZero ? `${meta.label}: v kombinaci s ostatními filtry nic` : `Filtrovat podle vyhodnocení: ${meta.label}`}
                style={dimZero ? { opacity: 0.45 } : undefined}
              >
                {verdictFilter === key ? '✓ ' : ''}{meta.label} ({count})
              </VerdictFilterChip>
            );
          })}
          {(smlouvaWarningCount > 0 || smlouvaWarningFilter) && (
            <VerdictFilterChip
              type="button"
              disabled={groupsLoading}
              $active={smlouvaWarningFilter}
              $bg={VERDICT_COLORS.bad.bg}
              $border={VERDICT_COLORS.bad.border}
              $text={VERDICT_COLORS.bad.text}
              onClick={() => setSmlouvaWarningFilter((prev) => !prev)}
              title="Filtrovat jen smlouvy s varováním čerpání (mimo datumový rozsah / přečerpáno)"
            >
              {smlouvaWarningFilter ? '✓ ' : ''}⚠ Čerpání smlouvy ({smlouvaWarningCount})
            </VerdictFilterChip>
          )}
          {groupsLoading && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
              <LoadingSpinner style={{ width: 13, height: 13, borderWidth: 2 }} />
              Načítám…
            </span>
          )}
        </VerdictFilterBar>
      )}

      {groupsError && <ErrorMessage>{groupsError}</ErrorMessage>}

      {groupsLoading ? (
        <LoadingInline>
          <LoadingSpinner />
          <span>Načítám seskupený pohled…</span>
        </LoadingInline>
      ) : (
        <>
          {attentionItems.length === 0 && confirmedGroups.length === 0 && (
            <SkupinaLoadingCard>
              <span>Žádné položky neodpovídají aktuálním filtrům.</span>
            </SkupinaLoadingCard>
          )}

          {attentionItems.length > 0 && (
            <div>
              {confirmedGroups.length > 0 && (
                <GroupsSectionLabel>Vyžaduje pozornost ({attentionItems.length})</GroupsSectionLabel>
              )}
              <MatrixGroupsStack>
                {attentionItems.map((item) => (
                  <React.Fragment key={item.groupId}>{item.node}</React.Fragment>
                ))}
              </MatrixGroupsStack>
            </div>
          )}

          {confirmedGroups.length > 0 && (
            <div>
              {attentionItems.length > 0 && (
                <GroupsSectionLabel>Potvrzená shoda ({confirmedGroups.length})</GroupsSectionLabel>
              )}
              <SimpleTileGrid>
                {confirmedGroups.map((group) => renderSmlGroupCard(group))}
              </SimpleTileGrid>
            </div>
          )}

          {pagination.total > 0 && (
            <PaginationContainer>
              <PaginationInfo>
                Celkem {pagination.total} skupin
              </PaginationInfo>
              <PaginationControls>
                {pagination.total_pages > 1 && (
                  <>
                    <PageButton onClick={() => setPage(1)} disabled={pagination.page <= 1}>
                      <FontAwesomeIcon icon={faAnglesLeft} />
                    </PageButton>
                    <PageButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1}>
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </PageButton>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0.5rem' }}>
                      Stránka {pagination.page} z {pagination.total_pages}
                    </span>
                    <PageButton onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={pagination.page >= pagination.total_pages}>
                      <FontAwesomeIcon icon={faChevronRight} />
                    </PageButton>
                    <PageButton onClick={() => setPage(pagination.total_pages)} disabled={pagination.page >= pagination.total_pages}>
                      <FontAwesomeIcon icon={faAnglesRight} />
                    </PageButton>
                  </>
                )}
                <PageSizeSelector value={groupedPageSize} onChange={(e) => setGroupedPageSize(Number(e.target.value))}>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size} / stránku</option>
                  ))}
                </PageSizeSelector>
              </PaginationControls>
            </PaginationContainer>
          )}
        </>
      )}
    </div>

    <SlideInDetailPanel
      isOpen={smlouvaPreview.open}
      onClose={closeSmlouvaPreview}
      entityType="contracts"
      entityId={smlouvaPreview.data?.id}
      loading={smlouvaPreview.loading}
      numberLabel={smlouvaPreview.data?.cislo_smlouvy || smlouvaPreview.cisloSmlouvy}
    >
      {smlouvaPreview.error && (
        <ErrorMessage>{smlouvaPreview.error}</ErrorMessage>
      )}
      {!smlouvaPreview.error && smlouvaPreview.data && (
        <SmlouvaPreview smlouvaData={smlouvaPreview.data} />
      )}
    </SlideInDetailPanel>
    </>
  );
};

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
  // Filtr podle kontroly (dlaždice OBJ i multiselect u vyhledávání) - pole hodnot
  // z KONTROLA_STATUS + 'varovani', OR logika. Prázdné pole = bez filtru.
  const [kontrolaFilter, setKontrolaFilter] = useState(() => {
    const stored = getStoredJSON(VEMA_KONTROLA_FILTER_LS_KEY, []);
    return Array.isArray(stored) ? stored : [];
  });
  const [kontrolaMultiOpen, setKontrolaMultiOpen] = useState(false);
  // Filtr podle automatického vyhodnocení páru (BETA seskupený pohled) a
  // podle financování EEO objednávky (limitovaný příslib vs. smlouva) -
  // zvednuté sem z GroupedKontrolaObjView, aby je viděl i společný "Zrušit
  // filtry" a indikátor aktivního filtru v toolbaru.
  const [verdictFilter, setVerdictFilter] = useState(() => getStoredString(VEMA_BETA_VERDICT_FILTER_LS_KEY, null));
  const [financovaniFilter, setFinancovaniFilter] = useState(() => getStoredJSON(VEMA_BETA_FINANCOVANI_FILTER_LS_KEY, []));

  // BETA Kontrola OBJ - nezávislá je POUZE stránkování a třídění, filtry jsou sdílené s OBJ
  const [betaPageIndex, setBetaPageIndex] = useState(0);
  const [betaPageSize, setBetaPageSize] = useUserScopedPageSize(VEMA_BETA_PAGE_SIZE_LS_KEY, userDetail);
  const [betaSorting, setBetaSorting] = useState(() => getStoredJSON(VEMA_BETA_SORTING_LS_KEY, []));
  // Seskupený pohled BETA - 'flat' (dnešní tabulka) | 'grouped' (vazební
  // skupiny - od teď plně BE-řízené, viz GroupedKontrolaObjView).
  const [betaViewMode, setBetaViewMode] = useState(() => getStoredString(VEMA_BETA_VIEW_MODE_LS_KEY, 'flat'));

  // Kontrola SML - stejný "flat"/"grouped" přepínač jako u Kontroly OBJ BETA,
  // ale nezávislý stav/localStorage klíč (jiná záložka, jiná logika párování -
  // viz GroupedKontrolaSmlView) a vlastní verdictFilter (financování se tu
  // nefiltruje, proto žádný smlFinancovaniFilter).
  const [smlViewMode, setSmlViewMode] = useState(() => getStoredString(VEMA_SML_VIEW_MODE_LS_KEY, 'flat'));
  // Kontrola SML kategorii 'fan' nemá (víc faktur na smlouvu je normální
  // čerpání) - dřív uložený filtr by vedl k prázdnému seznamu bez chipu.
  const [smlWarningFilter, setSmlWarningFilter] = useState(false);
  const [smlVerdictFilter, setSmlVerdictFilter] = useState(() => {
    const stored = getStoredString(VEMA_SML_VERDICT_FILTER_LS_KEY, null);
    return stored === 'fan' ? null : stored;
  });

  // Data
  const [firmyData, setFirmyData] = useState([]);
  const [fakturyData, setFakturyData] = useState([]);
  const [smlouvyData, setSmlouvyData] = useState([]);
  const [eeoBezVemaData, setEeoBezVemaData] = useState([]);
  // Které VEMA doklady pokrývá Kontrola objednávek / Kontrola smluv (stejná
  // logika jako jejich seskupené pohledy) - z toho se filtrují ploché pohledy
  // i "VEMA doklady bez EEO dokladů", aby se záložky nepřekrývaly.
  const [prehledVazeb, setPrehledVazeb] = useState(null);
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
  const [pageSize, setPageSize] = useUserScopedPageSize(VEMA_PAGE_SIZE_LS_KEY, userDetail);
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
  useEffect(() => { setStoredString(VEMA_BETA_VIEW_MODE_LS_KEY, betaViewMode); }, [betaViewMode]);
  useEffect(() => { setStoredString(VEMA_BADGE_FILTER_LS_KEY, badgeFilter); }, [badgeFilter]);
  useEffect(() => { setStoredJSON(VEMA_WARNING_FILTER_LS_KEY, warningOnlyFilter); }, [warningOnlyFilter]);
  useEffect(() => { setStoredJSON(VEMA_KONTROLA_FILTER_LS_KEY, kontrolaFilter); }, [kontrolaFilter]);
  useEffect(() => {
    if (verdictFilter === null) {
      try { localStorage.removeItem(VEMA_BETA_VERDICT_FILTER_LS_KEY); } catch (e) {}
    } else {
      setStoredString(VEMA_BETA_VERDICT_FILTER_LS_KEY, verdictFilter);
    }
  }, [verdictFilter]);
  useEffect(() => { setStoredJSON(VEMA_BETA_FINANCOVANI_FILTER_LS_KEY, financovaniFilter); }, [financovaniFilter]);
  useEffect(() => { setStoredString(VEMA_SML_VIEW_MODE_LS_KEY, smlViewMode); }, [smlViewMode]);
  useEffect(() => {
    if (smlVerdictFilter === null) {
      try { localStorage.removeItem(VEMA_SML_VERDICT_FILTER_LS_KEY); } catch (e) {}
    } else {
      setStoredString(VEMA_SML_VERDICT_FILTER_LS_KEY, smlVerdictFilter);
    }
  }, [smlVerdictFilter]);

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

  const PREHLED_VAZEB_SUBTABS = ['kontrola-obj', 'kontrola-obj-beta', 'kontrola-sml', 'vema-bez-eeo'];
  useEffect(() => {
    if (!token || !username) return;
    if (activeTab !== 'faktury' || !PREHLED_VAZEB_SUBTABS.includes(fakturySubTab)) return;
    let cancelled = false;
    const loadPrehled = async () => {
      try {
        const data = await getVemaPrehledVazeb(token, username);
        if (cancelled) return;
        setPrehledVazeb({
          obj: new Set((data.vemaIdsObj || []).map(String)),
          sml: new Set((data.vemaIdsSml || []).map(String)),
          pokryte: new Set((data.vemaIdsPokryte || []).map(String)),
        });
      } catch (err) {
        console.error('Chyba načítání přehledu vazeb VEMA-EEO:', err);
      }
    };
    loadPrehled();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fakturySubTab, token, username, fakturyData]);

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
      if (!kontrolaFilter || kontrolaFilter.length === 0) return items;

      return items.filter((item) => kontrolaFilter.some((f) => (
        f === 'varovani' ? hasWarningIssue(item) : normalizeKontrolaStatus(item.kontrola) === f
      )));
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
        if (prehledVazeb) {
          result = groupFakturyForKontrola(fakturyData.filter(item => prehledVazeb.obj.has(String(item.id))));
          break;
        }
        result = groupFakturyForKontrola(fakturyData.filter(item => {
          const hasObj = item.cobj && String(item.cobj).trim() !== '';
          const hasEvidencniSmlouva = item.smlouva_ecsml && String(item.smlouva_ecsml).trim() !== '';
          if (!hasObj || hasEvidencniSmlouva) return false;
          // VEMA doklad, ke kterému EEO nemá vůbec žádnou napárovanou
          // objednávku ani fakturu (fuzzy match beze shody), patří jen do
          // "VEMA doklady bez EEO dokladů" - v Kontrole objednávek by byl jen
          // šum "bez kandidáta", který se nemá proti čemu párovat.
          const pocetObj = Number(item?.pocet_objednavek || 0);
          const pocetFa = Number(item?.pocet_faktur || 0);
          return pocetObj > 0 || pocetFa > 0;
        }));
        break;
      case 'kontrola-sml':
        if (prehledVazeb) {
          result = groupFakturyForKontrola(fakturyData.filter(item => prehledVazeb.sml.has(String(item.id))));
          break;
        }
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
        // VEMA doklady, které nepokrývá Kontrola objednávek ani smluv (ani
        // shoda čísla dokladu mimo ně) - viz vemaPrehledVazebHandlers.php.
        // Dokud se přehled nenačte, platí původní odhad podle počtů vazeb.
        result = prehledVazeb
          ? fakturyData.filter(item => !prehledVazeb.pokryte.has(String(item.id)))
          : fakturyData.filter(item => !hasAnyEeoLink(item));
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
  }, [fakturyData, fakturySubTab, eeoBezVemaData, badgeFilter, warningOnlyFilter, kontrolaFilter, prehledVazeb]);

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
    if (currentSection && (currentSection.hidden || !canAccessSection(currentSection, userDetail))) {
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

  // Poznámka: Kontrola OBJ BETA seskupený pohled (betaViewMode === 'grouped')
  // si groupování, matchování na EEO i stránkování řídí sám na straně BE -
  // viz GroupedKontrolaObjView a vema-faktury/kontrola-obj-beta/grouped-list.
  // paginatedData/propojenData tady dál slouží jen plochému (flat) pohledu.

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

            // Toggle filtru: klik na dlaždici přidá/odebere hodnotu z multiselectu
            // (sdíleného s dropdownem u vyhledávání). Filtr je sdílený mezi OBJ
            // a OBJ BETA - pouze sorting je oddělené.
            const toggleFilter = (value) => {
              setKontrolaFilter(prev => (
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
              ));
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
                      $active={kontrolaFilter.includes(status)}
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
                  $active={kontrolaFilter.includes('varovani')}
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
            {FAKTURY_SUB_SECTIONS.filter(section => !section.hidden && canAccessSection(section, userDetail)).map(section => (
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

          {fakturySubTab === 'kontrola-obj-beta' && (
            <ViewModeToggleBar>
              <ViewModeButton
                type="button"
                $active={betaViewMode === 'flat'}
                onClick={() => setBetaViewMode('flat')}
              >
                Plochý pohled (dnes)
              </ViewModeButton>
              <ViewModeButton
                type="button"
                $active={betaViewMode === 'grouped'}
                onClick={() => {
                  setBetaViewMode('grouped');
                  setBetaPageIndex(0);
                }}
              >
                Seskupený pohled (BETA)
              </ViewModeButton>
            </ViewModeToggleBar>
          )}

          {fakturySubTab === 'kontrola-sml' && (
            <ViewModeToggleBar>
              <ViewModeButton
                type="button"
                $active={smlViewMode === 'flat'}
                onClick={() => setSmlViewMode('flat')}
              >
                Plochý pohled
              </ViewModeButton>
              <ViewModeButton
                type="button"
                $active={smlViewMode === 'grouped'}
                onClick={() => {
                  setSmlViewMode('grouped');
                  setPageIndex(0);
                }}
              >
                Seskupený pohled (BETA)
              </ViewModeButton>
            </ViewModeToggleBar>
          )}
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
            <KontrolaFilterWrap>
              <KontrolaFilterButton
                type="button"
                $active={kontrolaFilter.length > 0}
                onClick={() => setKontrolaMultiOpen((o) => !o)}
                title="Filtrovat podle stavu kontroly (lze vybrat víc)"
              >
                {kontrolaFilter.length > 0 ? '✓ ' : ''}Kontrola{kontrolaFilter.length > 0 ? ` (${kontrolaFilter.length})` : ''}
                <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: '0.65rem' }} />
              </KontrolaFilterButton>

              {kontrolaMultiOpen && (
                <>
                  <KontrolaFilterOverlay onClick={() => setKontrolaMultiOpen(false)} />
                  <KontrolaFilterPanel>
                    {[
                      KONTROLA_STATUS.NEZKONTROLOVANO,
                      KONTROLA_STATUS.V_PORADKU,
                      KONTROLA_STATUS.NELZE_VYRESIT,
                      KONTROLA_STATUS.V_RESENI,
                    ].map((status) => {
                      const colors = KONTROLA_STATUS_COLORS[status];
                      const checked = kontrolaFilter.includes(status);
                      return (
                        <KontrolaFilterOption key={status}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setKontrolaFilter((prev) => (
                                checked ? prev.filter((v) => v !== status) : [...prev, status]
                              ));
                              setPageIndex(0);
                              setBetaPageIndex(0);
                            }}
                          />
                          <span>{colors.icon}</span> {KONTROLA_STATUS_LABELS[status]}
                        </KontrolaFilterOption>
                      );
                    })}
                    <KontrolaFilterDivider />
                    <KontrolaFilterOption>
                      <input
                        type="checkbox"
                        checked={kontrolaFilter.includes('varovani')}
                        onChange={() => {
                          const checked = kontrolaFilter.includes('varovani');
                          setKontrolaFilter((prev) => (
                            checked ? prev.filter((v) => v !== 'varovani') : [...prev, 'varovani']
                          ));
                          setPageIndex(0);
                          setBetaPageIndex(0);
                        }}
                      />
                      <span>⚠️</span> S varováním
                    </KontrolaFilterOption>
                  </KontrolaFilterPanel>
                </>
              )}
            </KontrolaFilterWrap>

            <select
              value={badgeFilter}
              onChange={(e) => {
                setBadgeFilter(e.target.value);
                setPageIndex(0);
                setBetaPageIndex(0);
              }}
              style={{
                border: `1px solid ${badgeFilter !== 'all' ? '#ef4444' : '#cbd5e1'}`,
                borderRadius: '6px',
                height: '40px',
                padding: '0 0.5rem',
                fontSize: '0.78rem',
                fontWeight: badgeFilter !== 'all' ? 700 : 400,
                color: badgeFilter !== 'all' ? '#dc2626' : '#1e293b',
                background: badgeFilter !== 'all' ? '#fee2e2' : '#fff',
                width: '190px',
                minWidth: '190px'
              }}
              title="Filtruje podle počtu nalezených propojení k VEMA dokladu (objednávky/faktury/roční poplatky v EEO)"
            >
              <option value="all">Vazby na EEO: všechny</option>
              <option value="0">Bez vazby na EEO</option>
              <option value="1">Přesně 1 vazba</option>
              <option value="2">Přesně 2 vazby</option>
              <option value="3plus">3 a víc vazeb</option>
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

            {(() => {
              const hasActiveFilter = badgeFilter !== 'all' || warningOnlyFilter || kontrolaFilter.length > 0 || !!searchInput.trim() || !!verdictFilter || financovaniFilter.length > 0 || !!smlVerdictFilter || smlWarningFilter;
              return (
                <button
                  onClick={() => {
                    if (!hasActiveFilter) return;
                    setBadgeFilter('all');
                    setWarningOnlyFilter(false);
                    setKontrolaFilter([]);
                    setVerdictFilter(null);
                    setFinancovaniFilter([]);
                    setSmlVerdictFilter(null);
                    setSmlWarningFilter(false);
                    handleClearSearch();
                    setPageIndex(0);
                    setBetaPageIndex(0);
                  }}
                  disabled={!hasActiveFilter}
                  title={hasActiveFilter ? 'Zrušit filtry' : 'Žádný filtr není aktivní'}
                  style={{
                    height: '40px',
                    width: '40px',
                    borderRadius: '6px',
                    border: `1px solid ${hasActiveFilter ? '#ef4444' : '#cbd5e1'}`,
                    background: hasActiveFilter ? '#fee2e2' : '#ffffff',
                    color: hasActiveFilter ? '#dc2626' : '#94a3b8',
                    cursor: hasActiveFilter ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem'
                  }}
                >
                  <FontAwesomeIcon icon={faFilterCircleXmark} />
                </button>
              );
            })()}
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

            // V Kontrola OBJ/SML nezahrnujeme roční poplatky do badge (stejně jako badge na kartě a dropdown filtr).
            const includeRocniPoplatky = !(fakturySubTab === 'kontrola-obj' || fakturySubTab === 'kontrola-sml');

            data.forEach(fa => {
              let pocetObj;
              let pocetFa;
              let pocetRp;

              if (fa._groupedKontrola && Array.isArray(fa._groupInvoices) && fa._groupInvoices.length > 0) {
                // Seskupená ("fan") karta - agregovat přes celou skupinu, ne jen přes jeden reprezentativní řádek.
                pocetObj = fa._groupInvoices.reduce((max, row) => Math.max(max, Number(row?.pocet_objednavek || 0)), 0);
                pocetFa = fa._groupInvoices.reduce((max, row) => Math.max(max, Number(row?.pocet_faktur || 0)), 0);
                pocetRp = fa._groupInvoices.reduce((max, row) => Math.max(max, Number(row?.pocet_rocnich_poplatku || 0)), 0);
              } else {
                pocetObj = Number(fa.pocet_objednavek || 0);
                pocetFa = Number(fa.pocet_faktur || 0);
                pocetRp = Number(fa.pocet_rocnich_poplatku || 0);
              }

              if (!includeRocniPoplatky) pocetRp = 0;

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
        ) : fakturySubTab === 'kontrola-obj-beta' && betaViewMode === 'grouped' ? (
          // Seskupený pohled si groupování, matchování i stránkování řídí
          // sám na straně BE (viz komponenta) - žádné externí stránkování tu
          // není potřeba, "stránka raw řádků" by tu ani nedávala smysl.
          <GroupedKontrolaObjView
            token={token}
            username={username}
            userDetail={userDetail}
            search={search}
            badgeFilter={badgeFilter}
            warningOnlyFilter={warningOnlyFilter}
            kontrolaFilter={kontrolaFilter}
            verdictFilter={verdictFilter}
            setVerdictFilter={setVerdictFilter}
            financovaniFilter={financovaniFilter}
            setFinancovaniFilter={setFinancovaniFilter}
            lpSeznam={lpSeznam}
          />
        ) : fakturySubTab === 'kontrola-sml' && smlViewMode === 'grouped' ? (
          // Analogie Kontroly OBJ BETA výše, ale kandidát je EEO smlouva (viz
          // GroupedKontrolaSmlView a vema-faktury/kontrola-sml/grouped-list).
          <GroupedKontrolaSmlView
            token={token}
            username={username}
            userDetail={userDetail}
            search={search}
            badgeFilter={badgeFilter}
            warningOnlyFilter={warningOnlyFilter}
            kontrolaFilter={kontrolaFilter}
            verdictFilter={smlVerdictFilter}
            setVerdictFilter={setSmlVerdictFilter}
            smlouvaWarningFilter={smlWarningFilter}
            setSmlouvaWarningFilter={setSmlWarningFilter}
          />
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
                <PageButton onClick={goToFirstPage} disabled={getCurrentPageIndex() === 0}>
                  <FontAwesomeIcon icon={faAnglesLeft} />
                </PageButton>
                <PageButton onClick={goToPreviousPage} disabled={getCurrentPageIndex() === 0}>
                  <FontAwesomeIcon icon={faChevronLeft} />
                </PageButton>

                <span style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0.5rem' }}>
                  Stránka {getCurrentPageIndex() + 1} z {totalPages}
                </span>

                <PageButton onClick={goToNextPage} disabled={getCurrentPageIndex() >= totalPages - 1}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </PageButton>
                <PageButton onClick={goToLastPage} disabled={getCurrentPageIndex() >= totalPages - 1}>
                  <FontAwesomeIcon icon={faAnglesRight} />
                </PageButton>

                <PageSizeSelector value={getCurrentPageSize()} onChange={(e) => { setCurrentPageSize(Number(e.target.value)); setCurrentPageIndex(0); }}>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size} / stránku</option>
                  ))}
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
